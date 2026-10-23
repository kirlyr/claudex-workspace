const test=require('node:test');const assert=require('node:assert/strict');
const {allowed,inspect}=require('../scripts/check-public.cjs');
test('public path allowlist excludes backups, private state, cached plugins and application source',()=>{
  for(const file of ['codex-global-setup/backups/config.toml','.local/memory.db','global/.env','scripts/auth.json','applications/app.js','skills/cache/plugin.json'])assert.equal(allowed(file),false,file);
  for(const file of ['global/AGENTS.md','skills/manifest.json','scripts/setup.cjs','docs/ARCHITECTURE.md'])assert.equal(allowed(file),true,file);
});
test('security scanner rejects synthetic credential patterns without printing their values',()=>{
  const synthetic='ghp_'+'A'.repeat(36);const findings=inspect([{name:'README.md',bytes:Buffer.from(synthetic)}]);
  assert.equal(findings.length,1);assert.ok(!JSON.stringify(findings).includes(synthetic));
});
