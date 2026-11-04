const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {install,verify,rollback}=require('../scripts/setup.cjs');
const base=path.resolve(__dirname,'../.local/tests');fs.mkdirSync(base,{recursive:true});
const roots=[];
// Remove only the temp fixtures created by this file (plain files, no Git metadata).
after(()=>{for(const r of roots)fs.rmSync(r,{recursive:true,force:true});});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
  const root=fs.mkdtempSync(path.join(base,'setup-'));roots.push(root);
  const home=path.join(root,'home'),repo=path.join(root,'repo'),sourceRoot=path.join(root,'source');
  for(const d of [home,path.join(repo,'global'),path.join(repo,'skills'),path.join(sourceRoot,'sample/skills/demo')])fs.mkdirSync(d,{recursive:true});
  fs.writeFileSync(path.join(repo,'global/AGENTS.md'),'Universal instructions\n');
  fs.writeFileSync(path.join(home,'AGENTS.md'),'Previous user instructions\n');
  fs.writeFileSync(path.join(home,'config.toml'),'keep_config = true\n');
  fs.writeFileSync(path.join(sourceRoot,'sample/skills/demo/SKILL.md'),'---\nname: demo\ndescription: Synthetic fixture\n---\n');
  fs.writeFileSync(path.join(sourceRoot,'sample/LICENSE'),'Synthetic license\n');
  const files=[['SKILL.md','skills/demo/SKILL.md'],['LICENSE','LICENSE']].map(([destination,source])=>({destination,source,sha256:hash(fs.readFileSync(path.join(sourceRoot,'sample',source)))}));
  fs.writeFileSync(path.join(repo,'skills/manifest.json'),JSON.stringify({schemaVersion:1,skills:[{name:'demo',repository:'synthetic/sample',commit:'a'.repeat(40),license:'MIT',files}]}));
  // adopt: the fixture home has a pre-existing AGENTS.md; tests of the refusal path pass adopt:false.
  return{home,packageRoot:repo,sourceRoot,adopt:true};
}
test('installs verified full bundles, preserves config, and repeat installation is a no-op',async()=>{
  const f=fixture();const first=await install(f);assert.equal(first.status,'INSTALLED_NEEDS_VERIFICATION');
  assert.equal(fs.readFileSync(path.join(f.home,'config.toml'),'utf8'),'keep_config = true\n');
  assert.equal(verify(f).filesMatch,true);
  const second=await install(f);assert.equal(second.unchanged,true);assert.equal(second.journal,first.journal);
});
test('rollback restores existing AGENTS and removes only files created by installation',async()=>{
  const f=fixture();const done=await install(f);
  fs.writeFileSync(path.join(f.home,'unrelated.txt'),'user file');
  const result=rollback({...f,journal:done.journal});assert.equal(result.status,'ROLLED_BACK');
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
  assert.equal(fs.existsSync(path.join(f.home,'skills/demo/SKILL.md')),false);
  assert.equal(fs.readFileSync(path.join(f.home,'unrelated.txt'),'utf8'),'user file');
  assert.equal(rollback({...f,journal:done.journal}).unchanged,true);
});
test('refuses to overwrite a user-modified installed skill and preserves files on rollback conflict',async()=>{
  const f=fixture();const done=await install(f);fs.writeFileSync(path.join(f.home,'skills/demo/SKILL.md'),'user change');
  await assert.rejects(install(f),/modified|conflict/i);
  assert.throws(()=>rollback({...f,journal:done.journal}),/modified|conflict/i);
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Universal instructions\n');
});
test('rejects source hash mismatch before modifying the target',async()=>{
  const f=fixture();fs.appendFileSync(path.join(f.sourceRoot,'sample/skills/demo/SKILL.md'),'tamper');
  await assert.rejects(install(f),/hash/i);
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
});
test('rejects path traversal and duplicate names before changing files',async()=>{
  const f=fixture();const file=path.join(f.packageRoot,'skills/manifest.json');const j=JSON.parse(fs.readFileSync(file));
  j.skills[0].files[0].destination='../escape';fs.writeFileSync(file,JSON.stringify(j));
  await assert.rejects(install(f),/path|destination/i);
  j.skills[0].files[0].destination='SKILL.md';j.skills.push(j.skills[0]);fs.writeFileSync(file,JSON.stringify(j));
  await assert.rejects(install(f),/duplicate/i);
});
test('refuses global instruction override without deleting it',async()=>{
  const f=fixture();fs.writeFileSync(path.join(f.home,'AGENTS.override.md'),'User override');
  await assert.rejects(install(f),/override/i);
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.override.md'),'utf8'),'User override');
});
test('updates managed upstream content and rejects rollback through a superseded journal',async()=>{
  const f=fixture();const first=await install(f);
  const changed=path.join(f.sourceRoot,'sample/skills/demo/SKILL.md');const before=fs.readFileSync(changed);
  fs.appendFileSync(changed,'Updated upstream content\n');
  const manifestFile=path.join(f.packageRoot,'skills/manifest.json');const manifest=JSON.parse(fs.readFileSync(manifestFile));
  manifest.skills[0].files[0].sha256=hash(fs.readFileSync(changed));fs.writeFileSync(manifestFile,JSON.stringify(manifest));
  const updated=await install(f);assert.notEqual(updated.journal,first.journal);assert.equal(verify(f).filesMatch,true);
  assert.throws(()=>rollback({...f,journal:first.journal}),/superseded/i);
  rollback({...f,journal:updated.journal});assert.deepEqual(fs.readFileSync(path.join(f.home,'skills/demo/SKILL.md')),before);
});

test('Claude instructions use opt-in isolated home, conflict checks, backup and rollback',async()=>{
  const f=fixture();fs.writeFileSync(path.join(f.packageRoot,'global/CLAUDE.md'),'Shared handoff rules\n');
  fs.writeFileSync(path.join(f.home,'CLAUDE.md'),'Existing Claude rules\n');
  const opts={...f,agent:'claude',adopt:false};
  await assert.rejects(install(opts),/unmanaged|conflict/i);
  assert.equal(fs.readFileSync(path.join(f.home,'CLAUDE.md'),'utf8'),'Existing Claude rules\n');
  fs.unlinkSync(path.join(f.home,'CLAUDE.md')); // Synthetic fixture only.
  const first=await install(opts);assert.equal(verify(opts).filesMatch,true);
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
  assert.equal(fs.existsSync(path.join(f.home,'skills')),false);
  assert.equal((await install(opts)).unchanged,true);
  fs.writeFileSync(path.join(f.packageRoot,'global/CLAUDE.md'),'Updated shared rules\n');
  const second=await install(opts);assert.notEqual(first.journal,second.journal);
  rollback({...opts,journal:second.journal});assert.equal(fs.readFileSync(path.join(f.home,'CLAUDE.md'),'utf8'),'Shared handoff rules\n');
  fs.writeFileSync(path.join(f.home,'CLAUDE.md'),'User change\n');
  await assert.rejects(install(opts),/modified/i);
});

test('refuses an unmanaged differing AGENTS.md unless --adopt is explicit, and rollback restores it',async()=>{
  const f=fixture();
  await assert.rejects(install({...f,adopt:false}),/unmanaged|conflict/i);
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
  assert.equal(fs.existsSync(path.join(f.home,'.codex-workspace')),false);
  const done=await install(f);assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Universal instructions\n');
  rollback({...f,journal:done.journal});
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
});
test('--adopt never bypasses user modifications of already managed files',async()=>{
  const f=fixture();await install(f);
  fs.writeFileSync(path.join(f.home,'AGENTS.md'),'User edit after install\n');
  await assert.rejects(install(f),/modified|conflict/i);
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'User edit after install\n');
});
test('rejects invalid upstream repository, unpinned commit and invalid hash before changing files',async()=>{
  const f=fixture();const file=path.join(f.packageRoot,'skills/manifest.json');const original=fs.readFileSync(file,'utf8');
  const cases=[[m=>{m.skills[0].repository='../..';},/repository|upstream/i],[m=>{m.skills[0].repository='owner/..';},/repository|upstream/i],
    [m=>{m.skills[0].repository='owner/repo/extra';},/repository|upstream/i],[m=>{m.skills[0].commit='main';},/repository|upstream|pinned/i],
    [m=>{m.skills[0].files[0].sha256='not-a-hash';},/hash/i],[m=>{m.schemaVersion=2;},/manifest/i]];
  for(const [mutate,pattern] of cases){
    const manifest=JSON.parse(original);mutate(manifest);fs.writeFileSync(file,JSON.stringify(manifest));
    await assert.rejects(install(f),pattern);
    assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
    assert.equal(fs.existsSync(path.join(f.home,'skills')),false);
  }
});
test('rolls back an installation that fails after partial writes',async()=>{
  const f=fixture();
  fs.writeFileSync(path.join(f.home,'skills'),'a user file where the skills directory should be'); // forces the second write to fail
  let message='';
  await install(f).catch(e=>{message=e.message;});
  const journal=message.match(/rollback journal: (.+)$/)?.[1];assert.ok(journal,message);
  assert.equal(JSON.parse(fs.readFileSync(journal,'utf8')).status,'FAILED');
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Universal instructions\n'); // first write already happened
  assert.equal(fs.existsSync(path.join(f.home,'.codex-workspace/state.json')),false);
  assert.equal(rollback({...f,journal}).status,'ROLLED_BACK');
  assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n');
  assert.equal(fs.readFileSync(path.join(f.home,'skills'),'utf8'),'a user file where the skills directory should be');
});
test('removes obsolete managed files, restores them on rollback, and refuses modified obsolete files',async()=>{
  const f=fixture();const first=await install(f);
  const skill=path.join(f.home,'skills/demo');const manifestFile=path.join(f.packageRoot,'skills/manifest.json');
  const original=fs.readFileSync(manifestFile,'utf8');const content=fs.readFileSync(path.join(skill,'SKILL.md'));
  const emptied=JSON.parse(original);emptied.skills=[];fs.writeFileSync(manifestFile,JSON.stringify(emptied));
  fs.writeFileSync(path.join(f.home,'unrelated.txt'),'user file');
  const removed=await install(f);assert.notEqual(removed.journal,first.journal);
  for(const name of ['SKILL.md','LICENSE','UPSTREAM.json'])assert.equal(fs.existsSync(path.join(skill,name)),false,name);
  assert.equal(fs.readFileSync(path.join(f.home,'unrelated.txt'),'utf8'),'user file');
  rollback({...f,journal:removed.journal});assert.deepEqual(fs.readFileSync(path.join(skill,'SKILL.md')),content);
  fs.writeFileSync(path.join(skill,'SKILL.md'),'user change to an obsolete file');
  await assert.rejects(install(f),/modified|conflict/i);
  assert.equal(fs.readFileSync(path.join(skill,'SKILL.md'),'utf8'),'user change to an obsolete file');
});

// Network path with a stubbed global fetch: no real network access.
function stubFetch(f,handler){
  const original=globalThis.fetch;const calls=[];
  globalThis.fetch=async url=>{calls.push(String(url));return handler(String(url));};
  return{calls,restore(){globalThis.fetch=original;}};
}
const remote=f=>({home:f.home,packageRoot:f.packageRoot,adopt:true}); // no sourceRoot => download + cache
const sourceOf=(f,url)=>fs.readFileSync(path.join(f.sourceRoot,'sample',decodeURI(url.split('a'.repeat(40)+'/')[1])));
const respond=(url,bytes,extra={})=>({ok:true,url,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),...extra});
test('downloads pinned files from raw.githubusercontent.com only, verifies hashes, and reuses the cache',async()=>{
  const f=fixture();const stub=stubFetch(f,url=>respond(url,sourceOf(f,url)));
  try{
    const first=await install(remote(f));assert.equal(verify(remote(f)).filesMatch,true);
    assert.deepEqual(stub.calls.sort(),['LICENSE','skills/demo/SKILL.md'].map(p=>'https://raw.githubusercontent.com/synthetic/sample/'+'a'.repeat(40)+'/'+p).sort());
    assert.equal(fs.readdirSync(path.join(f.packageRoot,'.local/cache')).length,2);
    rollback({...remote(f),journal:first.journal});stub.calls.length=0;
    await install(remote(f));assert.equal(stub.calls.length,0); // second install is served from the hash-named cache
    assert.equal(verify(remote(f)).filesMatch,true);
  }finally{stub.restore();}
});
test('rejects failed, redirected, tampered and oversized downloads without changing the home or cache',async()=>{
  const cases=[
    ['non-OK status',(f,url)=>respond(url,sourceOf(f,url),{ok:false})],
    ['redirect to another host',(f,url)=>respond('https://example.invalid/'+url.split('/').pop(),sourceOf(f,url))],
    ['tampered body',(f,url)=>respond(url,Buffer.concat([sourceOf(f,url),Buffer.from('tamper')]))],
  ];
  for(const [label,handler] of cases){
    const f=fixture();const stub=stubFetch(f,url=>handler(f,url));
    try{
      await assert.rejects(install(remote(f)),/download failed|hash/i,label);
      assert.equal(fs.readFileSync(path.join(f.home,'AGENTS.md'),'utf8'),'Previous user instructions\n',label);
      assert.equal(fs.existsSync(path.join(f.home,'skills')),false,label);
      assert.equal(fs.existsSync(path.join(f.packageRoot,'.local/cache')),false,label);
    }finally{stub.restore();}
  }
  // Oversized: the manifest hash matches the big body, so only the size limit can reject it.
  const f=fixture();const big=Buffer.alloc(2*1024*1024+1,97);
  const file=path.join(f.packageRoot,'skills/manifest.json');const m=JSON.parse(fs.readFileSync(file));
  m.skills[0].files[0].sha256=hash(big);fs.writeFileSync(file,JSON.stringify(m));
  const stub=stubFetch(f,url=>respond(url,big));
  try{
    await assert.rejects(install(remote(f)),/hash|size/i);
    assert.equal(fs.existsSync(path.join(f.packageRoot,'.local/cache')),false);
  }finally{stub.restore();}
});
