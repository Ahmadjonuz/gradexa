import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,ws:false}});
after(()=>vite.close());
const {sendStudentInvitation,invitationRedirect}=await vite.ssrLoadModule('/features/invitations/service.ts');
const {saveAccountPassword}=await vite.ssrLoadModule('/features/invitations/password.ts');
const id='4ed4bf44-2af3-4216-ab5c-efcd6dc844ae';
const actor={id,role:'admin',status:'active'};
const draft={id,name:'Test Student',email:'student@example.test',bio:'',status:'invited',courseIds:['course-a']};
const dispatch={id,claim:'8c8c7a70-5a43-4d86-af73-d5817b834cdc',token:'c91a9ab1-a50e-45ba-a8d3-6320c56e63f8',email:draft.email,name:draft.name};
function fake(overrides={}) {
  const calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args}); return name==='gradexa_prepare_invitation' ? (overrides.prepare??{data:dispatch,error:null}):(overrides.finish??{data:{ok:true},error:null});},
    auth:{admin:{inviteUserByEmail:async(email,options)=>{calls.push({name:'send',email,options}); if(overrides.throwSend) throw new Error('network failed'); return overrides.send??{data:{user:{id}},error:null};}}}};
  return {calls,run:(a=actor,input=draft,url='https://gradexa.example')=>sendStudentInvitation(a,input,url,()=>client)};
}
test('invitation permissions, invalid fields and bad URL never create a secret client',async()=>{
  let made=0;
  const factory=()=>{made++;throw new Error('must not instantiate');};
  for(const a of [null,{...actor,role:'student'},{...actor,status:'paused'},{...actor,role:'unknown'}]) assert.equal((await sendStudentInvitation(a,draft,'https://gradexa.example',factory)).ok,false);
  for(const input of [{...draft,courseIds:[]},{...draft,email:'bad'},{...draft,status:'active'}]) assert.equal((await sendStudentInvitation(actor,input,'https://gradexa.example',factory)).ok,false);
  assert.equal((await sendStudentInvitation(actor,draft,'javascript:evil()',factory)).ok,false);
  assert.equal(made,0);
});
test('invite reserves before Auth, sends server-selected data and finalizes without exposing token',async()=>{
  const f=fake(); const r=await f.run(); assert.equal(r.ok,true);
  assert.deepEqual(f.calls.map(x=>x.name),['gradexa_prepare_invitation','send','gradexa_finish_invitation']);
  assert.equal(f.calls[1].options.data.full_name,draft.name);
  assert.equal(f.calls[1].options.data.role,undefined);
  assert.equal(f.calls[1].options.redirectTo,'https://gradexa.example/auth/callback?next=%2Faccept-invitation');
  assert.equal(f.calls[2].args.p_sent,true);
  assert.ok(!JSON.stringify(r).includes(dispatch.token));
});
test('existing account, stale edit, and missing migration never send email',async()=>{
  for(const error of [{code:'42501',message:'GRADEXA: Hisob mavjud.'},{code:'PGRST202',message:'missing'},{message:'GRADEXA: Qoralama o‘zgargan.'}]) {
    const f=fake({prepare:{data:null,error}}); assert.equal((await f.run()).ok,false); assert.equal(f.calls.length,1);
  }
});
test('SMTP failure and network ambiguity are recorded as failed, never reported as sent',async()=>{
  for(const overrides of [{send:{data:{user:null},error:{code:'email_address_not_authorized'}}},{throwSend:true}]) {
    const f=fake(overrides); const r=await f.run(); assert.equal(r.ok,false); assert.equal(f.calls.at(-1).args.p_sent,false);
  }
});
test('partial success reports the delivery/database distinction; no deletion or password reset',async()=>{
  const f=fake({finish:{data:null,error:{code:'connection'}}}); const r=await f.run(); assert.equal(r.ok,false); assert.match(r.message,/Email.*bazadagi/);
  assert.deepEqual(f.calls.map(x=>x.name),['gradexa_prepare_invitation','send','gradexa_finish_invitation']);
});
test('trusted site URL rejects credentials, query, hash and path redirects',()=>{
  for(const url of ['https://user:password@site.test','https://site.test/?next=evil','https://site.test/#evil','https://site.test/path','//site.test']) assert.equal(invitationRedirect(url),null);
  assert.ok(invitationRedirect('http://localhost:3000'));
});
function passwordFake({managed=false,passwordError=null,activationError=null,signOutThrows=false}={}) {
  const calls=[];
  const user={id,user_metadata:managed?{gradexa_invitation_id:id}:{}};
  return {calls,client:{auth:{getUser:async()=>({data:{user},error:null}),updateUser:async()=>{calls.push('password');return{error:passwordError};},signOut:async()=>{calls.push('logout');if(signOutThrows)throw Error('offline');}},rpc:async()=>{calls.push('activate');return{error:activationError};}}};
}
const form=()=>{const f=new FormData();f.set('password','StrongPassword123');f.set('confirmation','StrongPassword123');return f;};
test('ordinary reset keeps existing behavior and does not depend on invitation SQL',async()=>{
  const f=passwordFake({signOutThrows:true}); assert.ok((await saveAccountPassword(async()=>f.client,form())).success); assert.deepEqual(f.calls,['password','logout']);
  const same=passwordFake({passwordError:{code:'same_password'}}); assert.equal((await saveAccountPassword(async()=>same.client,form())).issue,'same_password');
});
test('invitation activation happens only after password save and is retryable on same password',async()=>{
  const f=passwordFake({managed:true,passwordError:{code:'same_password'}}); assert.ok((await saveAccountPassword(async()=>f.client,form())).success); assert.deepEqual(f.calls,['password','activate','logout']);
  const failed=passwordFake({managed:true,activationError:{code:'42501'}}); assert.equal((await saveAccountPassword(async()=>failed.client,form())).success,null); assert.deepEqual(failed.calls,['password','activate']);
  const weak=passwordFake({managed:true,passwordError:{code:'weak_password'}}); assert.equal((await saveAccountPassword(async()=>weak.client,form())).issue,'weak_password'); assert.deepEqual(weak.calls,['password']);
});
