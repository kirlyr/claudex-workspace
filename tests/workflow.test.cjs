const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('both agent instruction files share the takeover/checkpoint contract and documentation links resolve',()=>{
  const codex=read('global/AGENTS.md'),claude=read('global/CLAUDE.md');
  const contract=codex.split('\n').filter(s=>s.startsWith('- On takeover')||s.startsWith('- Update that same')||s.startsWith('- Create a missing'));
  assert.equal(contract.length,3);for(const line of contract)assert.ok(claude.includes(line));
  assert.ok(contract[0].includes('fresh or resumed'));assert.ok(contract[0].includes('.local/workflow/HANDOFF.md'));
  for(const name of ['docs/WORKFLOW.md','docs/WORKFLOW-HANDOFF.md','docs/WORKFLOW-HANDOFF-EXAMPLE.md']){
    const text=read(name);assert.ok(!text.includes('../knowledge/'));assert.ok(!text.includes('.local/workflow/sessions/HANDOFF.md')||text.includes('lama'));
    for(const [,link] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g))if(!/^https?:/.test(link))assert.ok(fs.existsSync(path.resolve(root,path.dirname(name),link)),link);
  }
});
test('synthetic shared checkpoint updates in place, preserves legacy, and remains untracked/ignored',()=>{
  fs.mkdirSync(path.join(root,'.local/tests'),{recursive:true});
  const dir=fs.mkdtempSync(path.join(root,'.local/tests/handoff-'));
  function git(args){const r=spawnSync('git',args,{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
  git(['init']);fs.writeFileSync(path.join(dir,'.gitignore'),'/.local/workflow/\n');
  const active=path.join(dir,'.local/workflow/HANDOFF.md'),legacy=path.join(dir,'.local/workflow/sessions/HANDOFF.md');
  fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.writeFileSync(legacy,'Synthetic legacy: decision D1 approved\n');
  const template=read('docs/WORKFLOW-HANDOFF.md');
  // Protocol/file-I/O simulation only, not a claim of real Claude or Codex inference.
  for(const agent of ['Claude (simulated)','Codex (simulated)','Claude resumed (simulated)','Codex resumed (simulated)']){
    fs.writeFileSync(active,template.replace('<nama>',agent)+'\nDecision D1 remains approved; completed M1; pending review.\n');
    assert.ok(fs.readFileSync(active,'utf8').includes(agent));assert.ok(fs.readFileSync(active,'utf8').includes('D1'));
    assert.equal(git(['check-ignore','.local/workflow/HANDOFF.md']),'.local/workflow/HANDOFF.md');
    assert.equal(git(['ls-files','--','.local/workflow']),'');
  }
  assert.equal(fs.readFileSync(legacy,'utf8'),'Synthetic legacy: decision D1 approved\n');
  assert.equal(fs.readdirSync(path.dirname(active)).filter(p=>p==='HANDOFF.md').length,1);
});
