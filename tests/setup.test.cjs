const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {install,verify,rollback}=require('../scripts/setup.cjs');
const base=path.resolve(__dirname,'../.local/tests');fs.mkdirSync(base,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
  const root=fs.mkdtempSync(path.join(base,'setup-'));
  const home=path.join(root,'home'),repo=path.join(root,'repo'),sourceRoot=path.join(root,'source');
  for(const d of [home,path.join(repo,'global'),path.join(repo,'skills'),path.join(sourceRoot,'sample/skills/demo')])fs.mkdirSync(d,{recursive:true});
  fs.writeFileSync(path.join(repo,'global/AGENTS.md'),'Universal instructions\n');
  fs.writeFileSync(path.join(home,'AGENTS.md'),'Previous user instructions\n');
  fs.writeFileSync(path.join(home,'config.toml'),'keep_config = true\n');
  fs.writeFileSync(path.join(sourceRoot,'sample/skills/demo/SKILL.md'),'---\nname: demo\ndescription: Synthetic fixture\n---\n');
  fs.writeFileSync(path.join(sourceRoot,'sample/LICENSE'),'Synthetic license\n');
  const files=[['SKILL.md','skills/demo/SKILL.md'],['LICENSE','LICENSE']].map(([destination,source])=>({destination,source,sha256:hash(fs.readFileSync(path.join(sourceRoot,'sample',source)))}));
  fs.writeFileSync(path.join(repo,'skills/manifest.json'),JSON.stringify({schemaVersion:1,skills:[{name:'demo',repository:'synthetic/sample',commit:'a'.repeat(40),license:'MIT',files}]}));
  return{home,packageRoot:repo,sourceRoot};
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
