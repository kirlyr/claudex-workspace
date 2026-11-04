const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const normalized=s=>s.replace(/[\\/]+/g,'/').toLowerCase();
// True when `needle` occurs as a whole absolute-path prefix: neither neighbouring character may continue
// a name (so a home of "/root" matches neither "skills/x/root-cause.md" nor "nama/root relatif").
function hasPath(plain,needle){
  for(let i=plain.indexOf(needle);i!==-1;i=plain.indexOf(needle,i+1)){const prev=plain[i-1],next=plain[i+needle.length];if((!prev||!/[a-z0-9_.-]/.test(prev))&&(!next||!/[a-z0-9_.-]/.test(next)))return true;}
  return false;
}
function analyzeText(text,{home=os.homedir(),workspaceParent=path.dirname(root)}={}){
  const found=new Map();
  function add(category,line,severity='sensitive_metadata'){
    if(!found.has(category))found.set(category,{category,severity,lines:[]});
    const lines=found.get(category).lines;if(!lines.includes(line))lines.push(line);
  }
  const tokenPatterns=[/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}\b/,/\bAKIA[0-9A-Z]{16}\b/,/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/];
  text.split(/\r?\n/).forEach((line,index)=>{
    const n=index+1,plain=normalized(line);
    if(tokenPatterns.some(re=>re.test(line)))add('credential_pattern',n,'candidate_credential');
    const assignment=/\b(?:[\w]*_)?(?:password|passwd|client_secret|api_key|access_token|refresh_token)\b\s*[:=]\s*["']([^"'\r\n]{8,})["']/ig;
    for(const match of line.matchAll(assignment))if(!/^(?:\$\{|process\.env|<|redacted|fake_|synthetic|example|test[-_])/i.test(match[1]))add('credential_assignment',n,'candidate_credential');
    if(/\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|https?):\/\/[^\s/:<>$]+:[^\s/@<>${}]+@/i.test(line))add('credential_in_uri',n,'candidate_credential');
    if(home&&hasPath(plain,normalized(home)))add('local_profile_metadata',n);
    if(workspaceParent&&plain.includes(normalized(workspaceParent)+'/'))add('local_workspace_metadata',n);
    if(/^\s*\[projects\./i.test(line))add('project_trust_metadata',n);
  });
  return [...found.values()];
}
function git(args,input){
  const r=spawnSync('git',args,{cwd:root,input,maxBuffer:32*1024*1024});
  if(r.status!==0)throw new Error('Read-only Git history operation failed: '+args[0]);return r.stdout;
}
function audit(ref){
  if(ref!=='HEAD'&&!/^[a-f0-9]{7,40}$/i.test(ref))throw new Error('Specify HEAD or an explicit commit SHA');
  const commit=git(['rev-parse','--verify',ref+'^{commit}']).toString().trim();
  const rows=git(['ls-tree','-rz','--full-tree',commit]).toString('utf8').split('\0').filter(Boolean).map(row=>{
    const tab=row.indexOf('\t');const [mode,type,blob]=row.slice(0,tab).split(' ');
    if(type!=='blob'||mode==='120000')throw new Error('Unsupported tree entry requires manual review');return{path:row.slice(tab+1),blob};
  });
  const ids=[...new Set(rows.map(r=>r.blob))];const output=git(['cat-file','--batch'],ids.join('\n')+'\n');
  let cursor=0;const blobs=new Map();
  for(const id of ids){
    const end=output.indexOf(10,cursor),header=output.subarray(cursor,end).toString('ascii').split(' '),size=Number(header[2]);
    if(header[0]!==id||header[1]!=='blob'||!Number.isSafeInteger(size))throw new Error('Invalid Git blob framing');
    cursor=end+1;blobs.set(id,output.subarray(cursor,cursor+size));cursor+=size+1;
  }
  const findings=[];let bytesScanned=0;
  for(const row of rows){
    const bytes=blobs.get(row.blob);bytesScanned+=bytes.length;
    const categories=bytes.includes(0)?[{category:'binary_requires_manual_review',severity:'unverified',lines:[]}]:analyzeText(bytes.toString('utf8'));
    if(/(?:^|\/)(?:auth\.json|\.env(?:\.[^/]*)?|[^/]*credentials[^/]*\.json|[^/]+\.(?:pem|p12|pfx|key))$/i.test(row.path))categories.push({category:'sensitive_filename',severity:'requires_review',lines:[]});
    if(categories.length)findings.push({path:row.path,blob:row.blob,findings:categories});
  }
  const provenance=rows.find(r=>r.path==='codex-global-setup/provenance.json');let upstream=null;
  if(provenance){
    const recorded=JSON.parse(blobs.get(provenance.blob).toString('utf8'));let matched=0;const mismatched=[],missing=[];
    for(const file of recorded.files){
      const name='codex-global-setup/upstream/'+file.repo.split('/')[1]+'/'+file.path;
      const row=rows.find(r=>r.path===name);if(!row)missing.push(name);else if(row.blob!==file.blob)mismatched.push(name);else matched++;
    }
    upstream={recordedFiles:recorded.files.length,matched,mismatched,missing,note:'Matches the previously recorded upstream Git blobs; this is provenance checking, not proof that third-party code contains no embedded secrets.'};
  }
  const credentialCandidates=findings.filter(f=>f.findings.some(x=>x.severity==='candidate_credential'));
  const metadataFiles=findings.filter(f=>f.findings.some(x=>x.severity==='sensitive_metadata'));
  const report={commit,filesScanned:rows.length,uniqueBlobs:ids.length,bytesScanned,skippedFiles:0,credentialCandidateFiles:credentialCandidates.length,sensitiveMetadataFiles:metadataFiles.length,safeToPush:findings.length===0,findings,upstream,limits:'Pattern scanning cannot establish absence of every secret or semantic confidential data. Public upstream author attribution and synthetic fixture labels are not automatically classified as private credentials. Matched values and snippets are never emitted.'};
  fs.mkdirSync(path.join(root,'.local'),{recursive:true});fs.writeFileSync(path.join(root,'.local/history-security-report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
module.exports={analyzeText,audit};
if(require.main===module){
  const r=audit(process.argv[2]||'HEAD');
  console.log(JSON.stringify({commit:r.commit,filesScanned:r.filesScanned,uniqueBlobs:r.uniqueBlobs,bytesScanned:r.bytesScanned,skippedFiles:r.skippedFiles,credentialCandidateFiles:r.credentialCandidateFiles,sensitiveMetadataFiles:r.sensitiveMetadataFiles,safeToPush:r.safeToPush,upstream:r.upstream,report:'.local/history-security-report.json'},null,2));
  if(!r.safeToPush)process.exitCode=2;
}
