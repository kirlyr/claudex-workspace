const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function allowed(p){
  return /^(README\.md|\.gitignore|global\/AGENTS\.md|skills\/manifest\.json|hooks\/custom\/[\w.-]+|scripts\/[\w.-]+\.(?:cjs|ps1)|docs\/[\w.-]+\.md|tests\/[\w.-]+\.cjs)$/.test(p)&&!/(?:^|\/)(?:auth\.json|\.env[^/]*|backups|cache|runtime|memory|sessions)(?:\/|$)/i.test(p);
}
function inspect(entries){
  const findings=[];
  const detectors=[/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}\b/,/\bAKIA[0-9A-Z]{16}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
  for(const {name,bytes} of entries){
    if(!allowed(name)){findings.push({path:name,reason:'Path outside public allowlist'});continue;}
    if(bytes.length>1024*1024||bytes.includes(0)){findings.push({path:name,reason:'Binary or oversized file'});continue;}
    if(detectors.some(re=>re.test(bytes.toString('utf8'))))findings.push({path:name,reason:'Potential credential pattern; contents withheld'});
  }
  return findings;
}
module.exports={allowed,inspect};
if(require.main===module){
  const mode=process.argv[2]||'working';let entries=[];
  if(mode==='working'){
    const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
    const files=['README.md','.gitignore',...['global','skills','hooks','scripts','docs','tests'].flatMap(d=>fs.existsSync(path.join(root,d))?walk(path.join(root,d)).map(f=>path.relative(root,f).split(path.sep).join('/')):[])];
    entries=files.filter(p=>fs.existsSync(path.join(root,p))).map(name=>({name,bytes:fs.readFileSync(path.join(root,name))}));
  }else if(mode==='index'){
    const run=spawnSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'});if(run.status!==0)throw new Error('Cannot inspect Git index');
    for(const name of run.stdout.split('\0').filter(Boolean)){
      if(!allowed(name)){entries.push({name,bytes:Buffer.alloc(0)});continue;}
      const blob=spawnSync('git',['show',':'+name],{cwd:root,maxBuffer:2*1024*1024});if(blob.status!==0)throw new Error('Cannot read staged blob');entries.push({name,bytes:blob.stdout});
    }
  }else throw new Error('Use working or index');
  const findings=inspect(entries);console.log(JSON.stringify({scope:mode,checkedFiles:entries.length,passed:!findings.length,findings},null,2));if(findings.length)process.exitCode=1;
}
