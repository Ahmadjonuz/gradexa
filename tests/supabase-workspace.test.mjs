import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,ws:false}});
after(()=>vite.close());
const {createSupabaseWorkspaceRepository}=await vite.ssrLoadModule('/features/workspace/supabase-repository.ts');
const {makeWorkspaceBackup,readLegacyWorkspace}=await vite.ssrLoadModule('/features/workspace/legacy-import.ts');
const {seedWorkspace}=await vite.ssrLoadModule('/features/workspace/model.ts');
const {WORKSPACE_KEY}=await vite.ssrLoadModule('/features/workspace/repository.ts');
const owner={id:'e6e467f5-0cc6-42ad-af80-bbe1e08e47db',role:'owner',status:'active'};
const student={...owner,role:'student'};
const prefs={weeklyGoal:5,compact:false,ownerBio:'',showNotifications:true,updatedAt:'2026-10-02T00:00:00.123456+00:00'};
function setup(actor,handler) {
  const calls=[];
  const client=createClient('https://workspace-test.invalid','public-test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,options)=>{
    const req={path:new URL(url).pathname,body:JSON.parse(options.body)}; calls.push(req);
    const response=await handler(req);
    return new Response(JSON.stringify(response.data),{status:response.status??200,headers:{'content-type':'application/json'}});
  }}});
  return {repo:createSupabaseWorkspaceRepository(client,actor),calls};
}
const empty=req=>({data:req.body.p_kind==='preferences'?[prefs]:[]});
test('empty backend stays empty and never falls back to demo workspace',async()=>{
  const {repo}=setup(owner,empty); const r=await repo.read();
  assert.equal(r.ok,true); assert.deepEqual(r.data.students,[]); assert.deepEqual(r.data.quizzes,[]);
});
test('workspace pagination includes page beyond the first hundred records',async()=>{
  const {repo,calls}=setup(owner,req=>req.body.p_kind==='tasks'?{data:Array.from({length:req.body.p_offset===0?100:req.body.p_offset===100?1:0},(_,i)=>({id:`00000000-0000-4000-8000-${String(i+req.body.p_offset).padStart(12,'0')}`,title:'Saved task',completed:false}))}:empty(req));
  const r=await repo.read(); assert.equal(r.ok,true); assert.equal(r.data.tasks.length,101); assert.ok(calls.some(c=>c.body.p_offset===100));
});
test('student snapshot strips answer keys and never includes local profiles',async()=>{
  const {repo}=setup(student,req=>req.body.p_kind==='quizzes'?{data:[seedWorkspace.quizzes[0]]}:empty(req));
  const r=await repo.read(); assert.equal(r.ok,true); assert.equal(r.data.quizzes[0].questions[0].correct,undefined); assert.equal(r.data.quizzes[0].questions[0].explanation,undefined);
});
test('inactive actors and invalid staff payloads make no write requests',async()=>{
  for(const actor of [null,{...owner,status:'paused'},{...owner,role:'unknown'},student]){
    const {repo,calls}=setup(actor,empty); assert.equal((await repo.write('quiz',seedWorkspace.quizzes[0])).ok,false); assert.equal(calls.length,0);
  }
  const {repo,calls}=setup(owner,empty); assert.equal((await repo.write('quiz',{title:'bad'})).ok,false); assert.equal(calls.length,0);
});
test('quiz submit sends no student identity, score, snapshots or answer keys',async()=>{
  const {repo,calls}=setup(student,()=>({data:{id:owner.id}}));
  const result=await repo.write('submit',{quizId:'quiz-a',revision:owner.id,requestId:owner.id,answers:[0],studentId:'someone-else',score:100,questions:seedWorkspace.quizzes[0].questions});
  assert.equal(result.ok,true); assert.deepEqual(Object.keys(calls[0].body.p_data).sort(),['answers','quizId','requestId','revision']);
});
test('schema errors and denied writes return actionable messages, never success',async()=>{
  const missing=setup(owner,()=>({status:404,data:{code:'PGRST202',message:'missing'}}));
  assert.match((await missing.repo.read()).message,/GRADEXA-DATA-UPDATE.sql/);
  const denied=setup(owner,()=>({status:403,data:{code:'42501',message:'GRADEXA: Faol akkaunt bilan qayta kiring.'}}));
  const r=await denied.repo.read(); assert.equal(r.ok,false); assert.equal(r.denied,true);
  assert.equal((await denied.repo.write('quiz',seedWorkspace.quizzes[0])).ok,false);
});
test('malformed snapshots do not silently discard saved backend records',async()=>{
  const {repo}=setup(owner,req=>req.body.p_kind==='attempts'?{data:[{score:'bad'}]}:empty(req));
  const r=await repo.read(); assert.equal(r.ok,false); assert.match(r.message,/ma’lumot shakli/);
});
test('legacy backup reads only Gradexa key, preserves raw data and excludes auth tokens',()=>{
  const raw=JSON.stringify(seedWorkspace), values=new Map([[WORKSPACE_KEY,raw],['sb-secret-auth-token','PRIVATE']]);
  const store={getItem:key=>values.get(key)??null,setItem(){throw Error('never mutate');}};
  assert.equal(readLegacyWorkspace(store).quizzes.length,3);
  const backup=makeWorkspaceBackup(store); assert.equal(backup.includes('PRIVATE'),false);
  assert.equal(JSON.parse(backup).entries[WORKSPACE_KEY],raw); assert.equal(values.get(WORKSPACE_KEY),raw);
  assert.equal(readLegacyWorkspace({getItem:()=>null}),null);
});
