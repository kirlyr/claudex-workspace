// Native Codex protocol test. A local mock returns fixed text; no model inference.
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const readline=require('node:readline');const {spawn}=require('node:child_process');
const {verify}=require('./setup.cjs');
const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2),flags={};
for(let i=0;i<args.length;i+=2){if(!['--home','--codex'].includes(args[i])||!args[i+1])throw new Error('Use --home PATH [--codex PATH]');flags[args[i]]=args[i+1];}
if(!flags['--home'])throw new Error('An explicit Codex home is required for this test');
const home=path.resolve(flags['--home']);
if(!verify({home}).filesMatch)throw new Error('Install matching file hashes before runtime verification');
const cwd=path.join(root,'.local/runtime-project');fs.mkdirSync(cwd,{recursive:true});
fs.writeFileSync(path.join(cwd,'AGENTS.override.md'),'SYNTHETIC_PROJECT_OVERRIDE: use the local fixture only.\n');
const expected=['systematic-debugging','test-driven-development','verification-before-completion','database-migration','frontend-design'];
const result={mode:'native Codex with localhost mock; no inference',discovery:false,instructionLoading:false,explicitInvocation:false,modelBehaviorTested:false};
const markers=['NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST','NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST','NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE','Master database schema and data migrations across ORMs','Approach this as the design lead at a design studio'];
const server=http.createServer((req,res)=>{
  let body='';req.on('data',b=>body+=b);req.on('end',()=>{
    if(req.url!=='/v1/responses'){res.writeHead(404).end();return;}
    result.skillOccurrences=Object.fromEntries(expected.map((n,i)=>[n,body.split(markers[i]).length-1]));
    result.instructionLoading=body.includes('Global working agreements')&&body.includes('SYNTHETIC_PROJECT_OVERRIDE');
    result.explicitInvocation=Object.values(result.skillOccurrences).every(n=>n===1)&&!req.headers.authorization;
    result.requestBytes=Buffer.byteLength(body);
    const item={id:'fixture_message',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'SYNTHETIC_OK',annotations:[]}]};
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    const emit=(type,data)=>res.write('event: '+type+'\ndata: '+JSON.stringify({type,...data})+'\n\n');
    emit('response.created',{response:{id:'fixture_response',status:'in_progress',output:[]}});
    emit('response.output_item.added',{output_index:0,item:{...item,status:'in_progress',content:[]}});
    emit('response.output_text.delta',{item_id:item.id,output_index:0,content_index:0,delta:'SYNTHETIC_OK'});
    emit('response.output_item.done',{output_index:0,item});
    emit('response.completed',{response:{id:'fixture_response',status:'completed',output:[item]}});res.end();
  });
});
let child,rl,timer,next=0;const pending=new Map();let complete,rejectCompletion;
const done=new Promise((resolve,reject)=>{complete=resolve;rejectCompletion=reject});done.catch(()=>{});
function call(method,params){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n');});}
(async()=>{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port;
  const config=['model="synthetic-fixture"','model_provider="local_fixture"','web_search="disabled"','sandbox_mode="read-only"','approval_policy="on-request"',`model_providers.local_fixture={name="Local synthetic fixture",base_url="http://127.0.0.1:${port}/v1",wire_api="responses",requires_openai_auth=false}`];
  const env=Object.fromEntries(['SystemRoot','WINDIR','PATH','PATHEXT','COMSPEC'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  Object.assign(env,{CODEX_HOME:home,TEMP:path.join(root,'.local/tmp'),TMP:path.join(root,'.local/tmp')});fs.mkdirSync(env.TEMP,{recursive:true});
  child=spawn(flags['--codex']||(process.platform==='win32'?'codex.exe':'codex'),[...config.flatMap(c=>['-c',c]),'app-server','--listen','stdio://'],{cwd,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  child.stderr.on('data',()=>{}); // Do not publish arbitrary runtime diagnostics or local paths.
  timer=setTimeout(()=>{const e=new Error('Runtime protocol timeout');for(const p of pending.values())p.reject(e);rejectCompletion(e);child.kill();},20000);
  child.on('error',e=>{for(const p of pending.values())p.reject(e);rejectCompletion(e);});
  child.on('exit',code=>{const e=new Error('Codex exited '+code);for(const p of pending.values())p.reject(e);rejectCompletion(e);});
  rl=readline.createInterface({input:child.stdout});
  rl.on('line',line=>{let j;try{j=JSON.parse(line);}catch{return;}
    if(pending.has(j.id)){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(new Error(j.error.message)):p.resolve(j.result);}
    if(j.method==='turn/completed')complete(j.params.turn);
  });
  await call('initialize',{clientInfo:{name:'codex_workspace_verifier',version:'1.0.0'},capabilities:{experimentalApi:true}});
  child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  const skills=await call('skills/list',{cwds:[cwd],forceReload:true});
  const found=(skills.data||[]).flatMap(x=>x.skills||[]);const errors=(skills.data||[]).flatMap(x=>x.errors||[]);
  result.discovery=!errors.length&&expected.every(n=>found.filter(s=>s.name===n&&s.enabled).length===1);
  const hooks=await call('hooks/list',{cwds:[cwd]});result.hookWarnings=(hooks.data||[]).flatMap(x=>[...(x.errors||[]),...(x.warnings||[])]).length;
  const thread=await call('thread/start',{cwd,ephemeral:true,model:'synthetic-fixture',modelProvider:'local_fixture',approvalPolicy:'on-request',sandbox:'read-only'});
  await call('turn/start',{threadId:thread.thread.id,input:[{type:'text',text:'Synthetic invocation test. Do not call tools. Reply SYNTHETIC_OK.'},...expected.map(name=>({type:'skill',name,path:path.join(home,'skills',name,'SKILL.md')}))]});
  const turn=await done;result.turnCompleted=turn.status==='completed';
  result.passed=result.discovery&&result.instructionLoading&&result.explicitInvocation&&result.turnCompleted&&result.hookWarnings===0;
  if(!result.passed)process.exitCode=1;
})().catch(e=>{result.error=e.message;result.passed=false;process.exitCode=1;}).finally(async()=>{
  clearTimeout(timer);if(child){
    const waitExit=ms=>new Promise(resolve=>{
      if(child.exitCode!==null||child.signalCode!==null){resolve(true);return;}
      const finish=()=>{clearTimeout(limit);resolve(true);};
      const limit=setTimeout(()=>{child.off('exit',finish);resolve(false);},ms);child.once('exit',finish);
    });
    child.stdin.end();
    result.appServerExited=await waitExit(1000);
    if(!result.appServerExited){child.kill();result.appServerExited=await waitExit(2000);}
    child.stdout.destroy();child.stderr.destroy();child.unref();
  }if(rl)rl.close();server.closeAllConnections();server.close();
  if(!result.appServerExited){result.passed=false;process.exitCode=1;}
  console.log(JSON.stringify(result,null,2));
});
