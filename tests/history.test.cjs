const test=require('node:test');const assert=require('node:assert/strict');
const {analyzeText}=require('../scripts/audit-history.cjs');
test('history audit detects credentials without returning matched values',()=>{
  const fake='ghp_'+'Q'.repeat(36);
  const findings=analyzeText(fake,{home:'C:/Users/test-person',workspaceParent:'D:/projects'});
  assert.ok(findings.some(f=>f.category==='credential_pattern'));
  assert.ok(!JSON.stringify(findings).includes(fake));
});
test('history audit detects identifying local paths and project trust metadata',()=>{
  const findings=analyzeText('"C:\\\\Users\\\\test-person\\\\.codex"\n[projects.\'D:\\projects\\private-app\']\ntrust_level = "trusted"',{home:'C:/Users/test-person',workspaceParent:'D:/projects'});
  assert.ok(findings.some(f=>f.category==='local_profile_metadata'));
  assert.ok(findings.some(f=>f.category==='local_workspace_metadata'));
  assert.ok(findings.some(f=>f.category==='project_trust_metadata'));
  assert.ok(!JSON.stringify(findings).includes('test-person'));
});
test('history audit does not treat empty provider defaults or public GitHub links as credentials',()=>{
  assert.deepEqual(analyzeText('API_KEY: ""\nhttps://github.com/owner/repository\n',{home:'C:/Users/test-person',workspaceParent:'D:/projects'}),[]);
});
