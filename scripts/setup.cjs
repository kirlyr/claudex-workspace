const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const packageRoot=path.resolve(__dirname,'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const digest=p=>fs.existsSync(p)?sha(fs.readFileSync(p)):null;
function atomic(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,file);}
function save(file,value){atomic(file,JSON.stringify(value,null,2)+'\n');}
function relative(value){
  if(typeof value!=='string'||!value||path.isAbsolute(value)||value.includes('\\')||value.includes(':')||value.split('/').some(p=>!p||p==='.'||p==='..')||/[\0-\x1f]/.test(value))throw new Error('Unsafe relative path: '+value);
  return value;
}
function target(home,rel){
  relative(rel);const file=path.resolve(home,rel);
  if(!file.startsWith(home+path.sep))throw new Error('Destination escaped home');
  // Check each existing component; never follow a junction/symlink into another location.
  let current=home;
  for(const part of ['',...rel.split('/')]){if(part)current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error('Symlink/junction target rejected: '+current);}
  return file;
}
function options(input={}){
  const agent=input.agent||'codex';if(!['codex','claude'].includes(agent))throw new Error('Unsupported agent');
  const home=path.resolve(input.home||(agent==='codex'?process.env.CODEX_HOME:null)||path.join(os.homedir(),agent==='codex'?'.codex':'.claude'));
  if(home===path.parse(home).root)throw new Error('A filesystem root cannot be Codex home');
  return{...input,agent,home,packageRoot:path.resolve(input.packageRoot||packageRoot)};
}
function layout(input){
  const o=options(input);
  if(o.agent==='claude'){
    const bytes=fs.readFileSync(path.join(o.packageRoot,'global/CLAUDE.md'));
    target(o.home,'CLAUDE.md');return{...o,desired:[{rel:'CLAUDE.md',hash:sha(bytes),bytes}]};
  }
  const manifest=readJson(path.join(o.packageRoot,'skills/manifest.json'));
  if(manifest.schemaVersion!==1||!Array.isArray(manifest.skills))throw new Error('Unsupported manifest');
  const bytes=fs.readFileSync(path.join(o.packageRoot,'global/AGENTS.md'));
  const desired=[{rel:'AGENTS.md',hash:sha(bytes),bytes}];const names=new Set();
  for(const skill of manifest.skills){
    if(!/^[a-z0-9-]+$/.test(skill.name)||names.has(skill.name))throw new Error('Invalid or duplicate skill name');names.add(skill.name);
    if(!/^[\w.-]+\/[\w.-]+$/.test(skill.repository)||!/^[a-f0-9]{40}$/.test(skill.commit))throw new Error('Unpinned upstream');
    const destinations=new Set();
    for(const f of skill.files){
      relative(f.source);relative(f.destination);
      if(destinations.has(f.destination)||!/^[a-f0-9]{64}$/.test(f.sha256))throw new Error('Duplicate destination or invalid hash');destinations.add(f.destination);
      desired.push({rel:'skills/'+skill.name+'/'+f.destination,hash:f.sha256,skill,file:f});
    }
    if(!destinations.has('SKILL.md')||!destinations.has('LICENSE'))throw new Error('Skill bundle requires SKILL.md and LICENSE');
    const info=Buffer.from(JSON.stringify({repository:skill.repository,commit:skill.commit,license:skill.license},null,2)+'\n');
    if(destinations.has('UPSTREAM.json'))throw new Error('Reserved provenance destination');
    desired.push({rel:'skills/'+skill.name+'/UPSTREAM.json',hash:sha(info),bytes:info});
  }
  for(const d of desired)target(o.home,d.rel);
  return{...o,manifest,desired};
}
async function materialize(o,item){
  if(item.bytes)return item.bytes;
  const {skill,file}=item;let bytes;
  if(o.sourceRoot){
    const base=path.resolve(o.sourceRoot,skill.repository.split('/')[1]);
    bytes=fs.readFileSync(target(base,file.source));
  }else{
    const cache=path.join(o.packageRoot,'.local/cache',item.hash);
    if(fs.existsSync(cache))bytes=fs.readFileSync(cache);
    else{
      const url=`https://raw.githubusercontent.com/${skill.repository}/${skill.commit}/${file.source.split('/').map(encodeURIComponent).join('/')}`;
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
      if(!response.ok||new URL(response.url).hostname!=='raw.githubusercontent.com')throw new Error('Pinned upstream download failed: '+file.source);
      bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length>2*1024*1024||sha(bytes)!==item.hash)throw new Error('Upstream hash mismatch: '+file.source);
      atomic(cache,bytes);
    }
  }
  if(sha(bytes)!==item.hash)throw new Error('Source hash mismatch: '+file.source);
  return bytes;
}
function statePaths(home){return{dir:target(home,'.codex-workspace'),state:target(home,'.codex-workspace/state.json')};}
async function install(input={}){
  const o=layout(input),paths=statePaths(o.home);
  if(!fs.existsSync(o.home)||!fs.statSync(o.home).isDirectory())throw new Error('Codex home must exist');
  const override=target(o.home,'AGENTS.override.md');
  if(fs.existsSync(override)&&fs.readFileSync(override,'utf8').trim())throw new Error('Global AGENTS.override.md requires review');
  const previous=fs.existsSync(paths.state)?readJson(paths.state):null;
  if(previous&&(previous.agent||'codex')!==o.agent)throw new Error('Home already managed for a different agent');
  const oldDesired=new Map((previous?.desired||[]).map(d=>[d.rel,d.hash]));
  const changes=[];
  for(const item of o.desired){
    const file=target(o.home,item.rel),before=digest(file);
    if(before!==item.hash){
      if(before&&item.rel!=='AGENTS.md'&&before!==oldDesired.get(item.rel))throw new Error('User-modified file or unmanaged skill conflict: '+item.rel);
      if(before&&oldDesired.has(item.rel)&&before!==oldDesired.get(item.rel))throw new Error('User-modified managed file: '+item.rel);
      changes.push({rel:item.rel,beforeHash:before,afterHash:item.hash,bytes:await materialize(o,item)});
    }
  }
  const desiredKeys=new Set(o.desired.map(d=>d.rel));
  for(const [rel,oldHash] of oldDesired){
    if(desiredKeys.has(rel))continue;
    if(!['AGENTS.md','CLAUDE.md'].includes(rel)&&!/^skills\/[a-z0-9-]+\//.test(rel))throw new Error('Unsafe previous managed destination');
    const before=digest(target(o.home,rel));if(before&&before!==oldHash)throw new Error('User-modified obsolete file: '+rel);
    if(before)changes.push({rel,beforeHash:before,afterHash:null,bytes:null});
  }
  if(!changes.length&&previous)return{status:'INSTALLED_NEEDS_VERIFICATION',unchanged:true,journal:previous.journal};
  const id=crypto.randomUUID(),backupDir=target(o.home,'.codex-workspace/backups/'+id);
  fs.mkdirSync(backupDir,{recursive:true});
  const journal=path.join(backupDir,'journal.json');
  const record={schemaVersion:1,agent:o.agent,home:o.home,status:'INSTALLING',journal,previousState:previous,desired:o.desired.map(d=>({rel:d.rel,hash:d.hash})),changes:[]};
  // Backup only the managed files we actually change. Never copy auth/config/session data.
  for(const [index,c] of changes.entries()){
    if(digest(target(o.home,c.rel))!==c.beforeHash)throw new Error('File modified during install preflight: '+c.rel);
    let backup=null;if(c.beforeHash){backup='file-'+index;fs.copyFileSync(target(o.home,c.rel),path.join(backupDir,backup));}
    record.changes.push({rel:c.rel,beforeHash:c.beforeHash,afterHash:c.afterHash,backup});
  }
  save(journal,record);
  try{
    for(const c of changes){const file=target(o.home,c.rel);if(digest(file)!==c.beforeHash)throw new Error('File modified during install: '+c.rel);if(c.bytes===null)fs.unlinkSync(file);else atomic(file,c.bytes);}
    record.status='INSTALLED_NEEDS_VERIFICATION';save(journal,record);save(paths.state,record);
  }catch(error){record.status='FAILED';save(journal,record);error.message+='; rollback journal: '+journal;throw error;}
  return{status:record.status,unchanged:false,journal,changedFiles:changes.length};
}
function verify(input={}){
  const o=layout(input),files=o.desired.map(d=>({path:d.rel,matches:digest(target(o.home,d.rel))===d.hash}));
  const filesMatch=files.every(f=>f.matches);
  return{status:filesMatch?'INSTALLED_NEEDS_VERIFICATION':'NOT_INSTALLED',home:o.home,filesMatch,files,runtimeVerified:false,note:'File hashes alone do not prove discovery, invocation, or active hook execution.'};
}
function rollback(input={}){
  const o=options(input),paths=statePaths(o.home);
  const journal=input.journal?path.resolve(input.journal):fs.existsSync(paths.state)?readJson(paths.state).journal:null;
  if(!journal)throw new Error('No installation journal');
  if(!journal.startsWith(target(o.home,'.codex-workspace/backups')+path.sep)||fs.lstatSync(journal).isSymbolicLink())throw new Error('Journal must be inside the local backup root');
  target(o.home,path.relative(o.home,journal).split(path.sep).join('/'));
  const record=readJson(journal);
  if(record.home!==o.home||record.schemaVersion!==1)throw new Error('Journal home mismatch');
  if((record.agent||'codex')!==o.agent)throw new Error('Journal agent mismatch');
  if(record.status==='ROLLED_BACK')return{status:'ROLLED_BACK',unchanged:true};
  if(fs.existsSync(paths.state)&&readJson(paths.state).journal!==journal&&record.status!=='FAILED')throw new Error('Rollback journal superseded by a later installation');
  const backupDir=path.dirname(journal);
  for(const c of record.changes){
    if(!['AGENTS.md','CLAUDE.md'].includes(c.rel)&&!/^skills\/[a-z0-9-]+\//.test(c.rel))throw new Error('Unsafe rollback path');
    const current=digest(target(o.home,c.rel));
    if(current!==c.afterHash&&current!==c.beforeHash)throw new Error('User-modified rollback conflict: '+c.rel);
    if(c.beforeHash){relative(c.backup);if(digest(target(backupDir,c.backup))!==c.beforeHash)throw new Error('Backup hash mismatch');}
  }
  // All hashes are checked before any rollback mutation; no recursive deletes.
  for(const c of [...record.changes].reverse()){
    const file=target(o.home,c.rel);if(digest(file)===c.beforeHash)continue;
    if(c.beforeHash)atomic(file,fs.readFileSync(target(backupDir,c.backup)));else if(fs.existsSync(file))fs.unlinkSync(file);
  }
  if(record.previousState)save(paths.state,record.previousState);else if(fs.existsSync(paths.state))fs.unlinkSync(paths.state);
  record.status='ROLLED_BACK';save(journal,record);
  return{status:'ROLLED_BACK',unchanged:false};
}
module.exports={install,verify,rollback};
if(require.main===module){
  const [command,...args]=process.argv.slice(2);const opts={};
  const flags={'--home':'home','--source-root':'sourceRoot','--journal':'journal','--agent':'agent'};
  for(let i=0;i<args.length;i+=2){if(!flags[args[i]]||!args[i+1])throw new Error('Usage: setup.cjs install|verify|rollback [--agent codex|claude] [--home PATH] [--source-root PATH] [--journal PATH]');opts[flags[args[i]]]=args[i+1];}
  const fn={install,verify,rollback}[command];
  if(!fn){console.error('Expected install, verify, or rollback');process.exitCode=1;}
  else Promise.resolve().then(()=>fn(opts)).then(result=>{console.log(JSON.stringify(result,null,2));if(command==='verify'&&!result.filesMatch)process.exitCode=2;}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
