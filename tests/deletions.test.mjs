import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,ws:false}});
after(()=>vite.close());
const {deleteRecord,previewDeletion,deletionError}=await vite.ssrLoadModule('/features/deletions/service.ts');
const actor={id:'80edc9d8-07ef-4a57-a2cc-8e2d0753d764',role:'admin',status:'active'};
const uid='b8c0f58d-8a3f-4c13-b9f7-d4141ccfb88a',request='3198e44c-c4e3-4431-93d9-6f4066b6a7c6';
const info={kind:'student',id:uid,name:'Test Student',fingerprint:'a'.repeat(32),counts:{results:2,enrollments:1},blocked:null,pending:false,authAccount:true};
const input={kind:info.kind,id:info.id,fingerprint:info.fingerprint,confirmation:info.name};
function fixture(options={}) {
  const calls=[]; let factories=0;
  const client={rpc:async(name,args)=>{calls.push({name,args});return name==='gradexa_deletion_preview'?{data:options.preview??info,error:options.previewError??null}:{data:{ok:true},error:options.writeError??null};}};
  const admin={rpc:async(name,args)=>{calls.push({name,args});return name==='gradexa_prepare_student_delete'?{data:{userId:options.target??uid,requestId:request,canRestore:options.canRestore??true},error:options.prepareError??null}:{data:{restored:true},error:options.abortError??null};},auth:{admin:{deleteUser:async(id,soft)=>{calls.push({name:'deleteUser',id,soft});if(options.network)throw Error('secret network detail');return{data:{user:null},error:options.authError??null};},getUserById:async id=>{calls.push({name:'getUserById',id});return{data:{user:{id}},error:options.checkError??null};}}}};
  return {calls,client,get factories(){return factories;},run:(a=actor,value=input)=>deleteRecord(a,value,client,()=>{factories++;return admin;})};
}
test('student/paused/anonymous callers and invalid input never create a privileged client',async()=>{
  for(const a of [null,{...actor,role:'student'},{...actor,status:'paused'},{...actor,role:'unknown'}]) {const f=fixture();assert.equal((await f.run(a)).ok,false);assert.equal(f.factories,0);assert.equal(f.calls.length,0);}
  const f=fixture();assert.equal((await f.run(actor,{...input,id:'../attack'})).ok,false);assert.equal(f.factories,0);
});
test('stale confirmation, blocked dependencies and wrong typed name perform no delete',async()=>{
  for(const opts of [{preview:{...info,fingerprint:'b'.repeat(32)}},{preview:{...info,blocked:'Results exist'}},{preview:{...info,name:'Changed Name'}}]){const f=fixture(opts);assert.equal((await f.run()).ok,false);assert.equal(f.factories,0);assert.deepEqual(f.calls.map(c=>c.name),['gradexa_deletion_preview']);}
});
test('Auth deletion is prepared with server actor and uses only the server-selected user id',async()=>{
  const f=fixture();const result=await f.run(actor,{...input,userId:actor.id,role:'owner'});
  assert.equal(result.ok,true);assert.deepEqual(f.calls.map(c=>c.name),['gradexa_deletion_preview','gradexa_prepare_student_delete','deleteUser']);
  assert.equal(f.calls[1].args.p_actor,actor.id);assert.equal(f.calls[2].id,uid);assert.equal(f.calls[2].soft,false);assert.ok(!JSON.stringify(result).includes(request));
});
test('missing migration or SQL authorization failure never reaches Auth deletion',async()=>{
  for(const opts of [{previewError:{code:'PGRST202'}},{prepareError:{code:'42501'}}]){const f=fixture(opts);assert.equal((await f.run()).ok,false);assert.ok(!f.calls.some(c=>c.name==='deleteUser'));}
});
test('ordinary lesson/quiz/course/task deletion reuses the session RPC, no secret client',async()=>{
  for(const kind of ['lesson','quiz','course','task','invitation']){const preview={...info,kind,authAccount:false};const f=fixture({preview});assert.equal((await f.run(actor,{...input,kind})).ok,true);assert.equal(f.factories,0);assert.deepEqual(f.calls.map(c=>c.name),['gradexa_deletion_preview','gradexa_delete_record']);}
});
test('a definite Auth rejection restores status only after the database confirms rollback',async()=>{
  const f=fixture({authError:{status:403,code:'not_allowed'}});const result=await f.run();assert.equal(result.ok,false);assert.match(result.message,/holati tiklandi/);assert.equal(f.calls.at(-1).name,'gradexa_abort_student_delete');
  const failed=fixture({authError:{status:403},abortError:{code:'offline'}});assert.match((await failed.run()).message,/vaqtincha to‘xtatildi/);
});
test('ambiguous timeout keeps the student paused and never reports false success',async()=>{
  const f=fixture({network:true});const result=await f.run();assert.equal(result.ok,false);assert.equal(result.refresh,true);assert.ok(!f.calls.some(c=>c.name==='gradexa_abort_student_delete'));assert.ok(!result.message.includes('secret'));
});
test('a retry after an earlier ambiguous operation never reactivates that student on rejection',async()=>{
  const f=fixture({canRestore:false,authError:{status:403}});const result=await f.run();assert.equal(result.ok,false);assert.ok(!f.calls.some(c=>c.name==='gradexa_abort_student_delete'));
});
test('a timeout after Auth committed is reconciled as successful deletion',async()=>{
  const f=fixture({network:true,checkError:{code:'user_not_found'}});assert.equal((await f.run()).ok,true);
});
test('malformed preview and raw provider errors never disclose implementation secrets',async()=>{
  const f=fixture({preview:{...info,counts:{results:-1}}});assert.equal((await previewDeletion(actor,input,f.client)).ok,false);
  assert.ok(!deletionError({message:'secret_key=do-not-print'}).includes('secret_key'));
  assert.match(deletionError({code:'PGRST202'}),/GRADEXA-DELETE-UPDATE.sql/);
});
