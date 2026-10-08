// Gradexa Vercel preparation. Adds deployment config only; never reads .env or contacts Vercel.
const payload={"vercel.json":"ewogICIkc2NoZW1hIjogImh0dHBzOi8vb3BlbmFwaS52ZXJjZWwuc2gvdmVyY2VsLmpzb24iLAogICJmcmFtZXdvcmsiOiAibmV4dGpzIiwKICAiaW5zdGFsbENvbW1hbmQiOiAibnBtIGNpIiwKICAiYnVpbGRDb21tYW5kIjogIm5wbSBydW4gYnVpbGQ6bmV4dCIKfQo=",".vercelignore":"LmVudgouZW52LioKLm5leHQKbm9kZV9tb2R1bGVzCmdyYWRleGEtYmFja3VwcwoudmVyY2VsCi53cmFuZ2xlcgouc2l0ZXMtcnVudGltZQpvdXRwdXRzCndvcmsKY292ZXJhZ2UKKi56aXAKKi5sb2cKVVBEQVRFLSouY2pzCklOU1RBTEwtKi5jbWQKU1RBUlQtKi5jbWQKQ0hFQ0stVVouY21kCnRlc3RzCnN1cGFiYXNlCkdSQURFWEEtKi5zcWwKMDEtU1VQQUJBU0UtS1VSU0xBUi5zcWwKR1JBREVYQS0qLnR4dApCT1NITEFTSC1VWi50eHQKUEFLRVQtSE9MQVRJLnR4dApQQUtFVC1NQU5JRkVTVC5qc29uCg==","VERCEL-GRADEXA-BANK.cmd":"QGVjaG8gb2ZmCnNldGxvY2FsCmNkIC9kICIlfmRwMCIKdGl0bGUgR3JhZGV4YSBWMiAtIFZlcmNlbCBiYW5rIHByb2tzaSB0ZXJtaW5hbGkKCndoZXJlIG5vZGUuZXhlID5udWwgMj4mMQppZiBlcnJvcmxldmVsIDEgZ290byBub2RlX21pc3NpbmcKbm9kZSBzY3JpcHRzXHdpbmRvd3Mtc2V0dXAuY2pzIC0tYmFuay1ub2RlCmlmIGVycm9ybGV2ZWwgMSBnb3RvIG5vZGVfb2xkCgpzZXQgIkhUVFBfUFJPWFk9aHR0cDovLzE3Mi4yMy4xMS4xMDE6MjAwMiIKc2V0ICJIVFRQU19QUk9YWT1odHRwOi8vMTcyLjIzLjExLjEwMToyMDAyIgpzZXQgIk5PX1BST1hZPWxvY2FsaG9zdCwxMjcuMC4wLjEiCnNldCAiTk9ERV9VU0VfRU5WX1BST1hZPTEiCnNldCAiTk9ERV9PUFRJT05TPS0tdXNlLXN5c3RlbS1jYSAtLXVzZS1lbnYtcHJveHkiCgplY2hvLgplY2hvIEdyYWRleGEgcGFwa2FzaWRhIFZlcmNlbCB1Y2h1biBiYW5rIHByb2tzaSB0ZXJtaW5hbGkgb2NoaWxkaS4KZWNobyBQcm9rc2kgZmFxYXQgc2h1IG95bmFkYSBpc2hsYXlkaTogMTcyLjIzLjExLjEwMToyMDAyCmVjaG8gTWF4Zml5IGthbGl0bGFybmkgYnV5cnVxcWEgeW96bWFuZzsgVmVyY2VsIERhc2hib2FyZCBvcnFhbGkga2lyaXRpbmcuCmVjaG8uCmVjaG8gQmlyaW5jaGkgdWxhc2g6CmVjaG8gICBucHguY21kIC0teWVzIHZlcmNlbEBsYXRlc3QgbG9naW4KZWNobyAgIG5weC5jbWQgLS15ZXMgdmVyY2VsQGxhdGVzdCBsaW5rCmVjaG8uCmVjaG8gUHJvZHVjdGlvbiBqb3lsYXNoOgplY2hvICAgbnB4LmNtZCAtLXllcyB2ZXJjZWxAbGF0ZXN0IGRlcGxveSAtLXByb2QgLS1sb2dzCmVjaG8uCmNtZCAvawpleGl0IC9iIDAKCjpub2RlX21pc3NpbmcKZWNobyBOb2RlLmpzIHRvcGlsbWFkaS4gT2xkaW4gR3JhZGV4YSBpc2hsYWdhbiBOb2RlLmpzIExUUyBrZXJhay4KcGF1c2UKZXhpdCAvYiAxCgo6bm9kZV9vbGQKZWNobyBOb2RlLmpzIHZlcnNpeWFzaSBiYW5rIHByb2tzaSByZWppbWkgdWNodW4gZXNraS4KZWNobyBOb2RlLmpzIDIyLjIxKyB5b2tpIDI0LjUrIExUUyBrZXJhay4KcGF1c2UKZXhpdCAvYiAxCg==","VERCEL-UZ.txt":"R1JBREVYQSBWMiDigJQgVkVSQ0VMIFBST0RVQ1RJT04gSk9ZTEFTSFRJUklTSAoyMDI2LTEwLTA4CgpUQVlZT1JMSUsKQnUga29uZmlndXJhdHNpeWEgVmVyY2Vs4oCZZGEgRnJhbWV3b3JrPU5leHQuanMsIEluc3RhbGw9bnBtIGNpIHZhCkJ1aWxkPW5wbSBydW4gYnVpbGQ6bmV4dCBuaSBtYWpidXJpeSBpc2hsYXRhZGkuIHBhY2thZ2UuanNvbiBpY2hpZGFnaSBlc2tpCkNsb3VkZmxhcmUgYnVpbGQgYnV5cnVn4oCYaSBWZXJjZWwgdG9tb25pZGFuIGlzaGxhdGlsbWF5ZGkuCgoudmVyY2VsaWdub3JlIHF1eWlkYWdpbGFybmkgc2VydmVyZ2EgeXVib3JtYXlkaTogLmVudiBmYXlsbGFyaSwgbm9kZV9tb2R1bGVzLAoubmV4dCwgemF4aXJhbGFyLCB1cGRhdGVybGFyLCBXaW5kb3dzIENNRCBv4oCYcm5hdGdpY2hsYXJpLCB0ZXN0bGFyIHZhIFNRTGxhci4KU3VwYWJhc2UgYmF6YXNpIG/igJh6Z2FybWF5ZGkuIE1heGZpeSBxaXltYXRsYXJuaSBjaGF0Z2EgeW9raSBidXlydXEgc2F0cmlnYQp5b3ptYW5nLgoKMS4gVkVSQ0VMIEhJU09CSUdBIEtJUklTSCBWQSBMT1lJSEEgWUFSQVRJU0gKSXNobGF5b3RnYW4gR3JhZGV4YSBzZXJ2ZXJpbmkgQ3RybCtDIGJpbGFuIHRv4oCYeHRhdGluZy4KVkVSQ0VMLUdSQURFWEEtQkFOSy5jbWQgZmF5bGluaSBpa2tpIG1hcnRhIGJvc2luZy4gT2NoaWxnYW4gb3luYWRhOgoKICBucHguY21kIC0teWVzIHZlcmNlbEBsYXRlc3QgbG9naW4KCkJyYXV6ZXJkYSBWZXJjZWwgaGlzb2JpZ2Ega2lyaWIgdGVybWluYWxkYWdpIHRhc2RpcW5pIGt1dGluZy4gS2V5aW46CgogIG5weC5jbWQgLS15ZXMgdmVyY2VsQGxhdGVzdCBsaW5rCgpTYXZvbGxhcmRhOgotIFNldCB1cCAuLi4/IOKAlCBZCi0gU2NvcGUg4oCUIG/igJh6aW5naXpuaW5nIFZlcmNlbCBoaXNvYmluZ2l6Ci0gTGluayB0byBleGlzdGluZyBwcm9qZWN0PyDigJQgTiAob2xkaW4gR3JhZGV4YSBsb3lpaGFzaSB5YXJhdG1hZ2FuIGJv4oCYbHNhbmdpeikKLSBQcm9qZWN0IG5hbWUg4oCUIGdyYWRleGEtdjIgeW9raSBib+KAmHNoIGJv4oCYbG1hZ2FuIGJvc2hxYSBub20KLSBTb3VyY2UgZGlyZWN0b3J5IOKAlCBqb3JpeSBncmFkZXhhIHBhcGthc2ksIG9kYXRkYSAuCgpCdSBmYXFhdCBsb3lpaGEgeW96dXZpbmkgeWFyYXRhZGkgdmEgLnZlcmNlbCBwYXBrYXNpbmkgYm9n4oCYbGF5ZGkuCgoyLiBQUk9EVUNUSU9OIERPTUFJTk5JIE9MSVNIClZlcmNlbCBEYXNoYm9hcmQg4oaSIHlhbmdpIEdyYWRleGEgcHJvamVjdCDihpIgU2V0dGluZ3Mg4oaSIERvbWFpbnMgYm/igJhsaW1pbmkgb2NoaW5nLgpVIHllcmRhIGtv4oCYcnNhdGlsZ2FuIGFzb3NpeSBtYW56aWxuaSB5b3ppYiBvbGluZywgbWFzYWxhbjoKCiAgaHR0cHM6Ly9ncmFkZXhhLXYyLXVzZXJuYW1lLnZlcmNlbC5hcHAKCkZhcWF0IG/igJh6aW5naXpkYSBjaGlxcWFuIGFuaXEgbWFuemlsbmkgaXNobGF0aW5nLiBPeGlyaWdhIHNhaGlmYSB5b+KAmGxpLApxdWVyeSB5b2tpICMgcW/igJhzaG1hbmcuCgozLiBWRVJDRUwgRU5WSVJPTk1FTlQgVkFSSUFCTEVTClZlcmNlbCBwcm9qZWN0IOKGkiBTZXR0aW5ncyDihpIgRW52aXJvbm1lbnQgVmFyaWFibGVzIGljaGlnYSBxdXlpZGFnaSA0IHRhIG5vbW5pCnFv4oCYc2hpbmcuIEVudmlyb25tZW50IHNpZmF0aWRhIGhvemlyY2hhIFByb2R1Y3Rpb25uaSBiZWxnaWxhbmc6CgogIE5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTAogIE5FWFRfUFVCTElDX1NVUEFCQVNFX1BVQkxJU0hBQkxFX0tFWQogIFNVUEFCQVNFX1NFQ1JFVF9LRVkKICBORVhUX1BVQkxJQ19TSVRFX1VSTAoKQmlyaW5jaGkgdWNodGEgcWl5bWF0IGF5bmFuIGlzaGxhYiB0dXJnYW4gbWFoYWxsaXkgLmVudi5sb2NhbCBkYWdpIG1hdmp1ZApHcmFkZXhhL1N1cGFiYXNlIHFpeW1hdGxhcmkuIE5FWFRfUFVCTElDX1NJVEVfVVJMIHFpeW1hdGkgMi1xYWRhbWRhZ2kgSFRUUFMKcHJvZHVjdGlvbiBkb21haW4gYm/igJhsYWRpLiBTVVBBQkFTRV9TRUNSRVRfS0VZIGdhIE5FWFRfUFVCTElDXyBxb+KAmHNobWFuZy4KLmVudi5sb2NhbCBmYXlsaW5pIFZlcmNlbOKAmWdhIHl1a2xhbWFuZyB2YSBxaXltYXRsYXJuaSBjaGF0Z2EgeXVib3JtYW5nLgoKNC4gUFJPRFVDVElPTiBERVBMT1kKSGFsaSBoYW0gVkVSQ0VMLUdSQURFWEEtQkFOSy5jbWQgb2NoZ2FuIHRlcm1pbmFsZGE6CgogIG5weC5jbWQgLS15ZXMgdmVyY2VsQGxhdGVzdCBkZXBsb3kgLS1wcm9kIC0tbG9ncwoKQnVpbGQgY29tbWFuZCBzYXRyaWRhIG5wbSBydW4gYnVpbGQ6bmV4dCBpc2hsYXNoaSBrZXJhay4gWWFrdW5kYSBIVFRQUyBtYW56aWwKY2hpcWFkaS4gQnVpbGQgeGF0byBib+KAmGxzYSwgdGVybWluYWxkYWdpIGJpcmluY2hpIHhhdG9uaSB5dWJvcmluZzsgbWF4Zml5CnFpeW1hdGxhcm5pIHl1Ym9ybWFuZy4KCjUuIFNVUEFCQVNFIEFVVEggVVJMClN1cGFiYXNlIERhc2hib2FyZCDihpIgQXV0aGVudGljYXRpb24g4oaSIFVSTCBDb25maWd1cmF0aW9uOgoKU2l0ZSBVUkw6CiAgaHR0cHM6Ly9TSVpOSU5HLUFOSVEtVkVSQ0VMLURPTUFJTklOR0laCgpSZWRpcmVjdCBVUkxzIHJv4oCYeXhhdGlkYSBxdXlpZGFnaWxhciBib+KAmGxzaW46CiAgaHR0cHM6Ly9TSVpOSU5HLUFOSVEtVkVSQ0VMLURPTUFJTklOR0laL2F1dGgvY2FsbGJhY2sKICBodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9jYWxsYmFjawoKU2F2ZSBib3NpbmcuIFByb2R1Y3Rpb24gdWNodW4gYW5pcSBjYWxsYmFjayBpc2hsYXRpbGFkaS4gS2V5aW4gcHJldmlldwpkZXBsb3ltZW50bGFyIGhhbSBrZXJhayBib+KAmGxzYSwgU3VwYWJhc2UgcmFzbWl5IHFvaWRhc2kgYm/igJh5aWNoYSBqYW1vYS9hY2NvdW50CnNsdWdpZ2EgbW9zIGFsb2hpZGEgVmVyY2VsIHdpbGRjYXJkIHFv4oCYc2hpbGFkaTsgdW11bWl5IG9jaGlxIHdpbGRjYXJkIHFv4oCYeW1hbmcuCgpNYXZqdWQgSW52aXRlIHVzZXIgZW1haWwgSFRNTCBmYXlsaSB7eyAuU2l0ZVVSTCB9fSBvcnFhbGkgaXNobGF5ZGkuIFNpdGUgVVJMCnByb2R1Y3Rpb24gbWFuemlsZ2Egb+KAmHpnYXJnYW5pIHVjaHVuIEhUTUxuaSBxYXl0YSB5dWtsYXNoIHNoYXJ0IGVtYXMuCktleWluY2hhbGlrIGN1c3RvbSBkb21haW4gdWxhbnNhLCBWZXJjZWwgTkVYVF9QVUJMSUNfU0lURV9VUkwsIFN1cGFiYXNlIFNpdGUgVVJMCnZhIFJlZGlyZWN0IFVSTG5pIHlhbmdpIGRvbWFpbiBiaWxhbiBiaXJnYSB5YW5naWxhbmcgdmEgcWF5dGEgZGVwbG95IHFpbGluZy4KCjYuIFBST0RVQ1RJT04gUUFCVUwgU0lOT1ZJCkJyYXV6ZXJkYSBmYXFhdCB5YW5naSBIVFRQUyBtYW56aWwgb3JxYWxpOgoxKSBvd25lci9hZG1pbiBsb2dpbiB2YSBsb2dvdXQ7CjIpIGt1cnMgdmEgZGFyc25pIG9jaGlzaC9zYXFsYXNoOwozKSBzaW5vdiB0YWxhYmFzaWdhIHRha2xpZiB5dWJvcmlzaCwgZW1haWwgaGF2b2xhc2luaW5nIHlhbmdpIGRvbWFpbm5pIG9jaGlzaGk7CjQpIHRhbGFiYSBwYXJvbCBiZWxnaWxhc2hpLCBrdXJzL2RhcnMga2/igJhyaXNoaSB2YSB0ZXN0IHRvcHNoaXJpc2hpOwo1KSBmb3Jnb3QtcGFzc3dvcmQgeGF0aWRhZ2kgaGF2b2xhIHlhbmdpIGRvbWFpbm5pIG9jaGlzaGk7CjYpIGFkbWluIG5hdGlqYWxhciwgdmF6aWZhIHRhaHJpcmkgdmEgc2lub3YgeW96dXZpbmkgb+KAmGNoaXJpc2guCgpQcm9kdWN0aW9uIHhhdG9sYXJpbmkga2/igJhyaXNoOgogIG5weC5jbWQgLS15ZXMgdmVyY2VsQGxhdGVzdCBsb2dzIC0tZW52aXJvbm1lbnQgcHJvZHVjdGlvbiAtLWxldmVsIGVycm9yIC0tc2luY2UgMTBtCgpNYWhhbGxpeSBsb3lpaGEgaXNobGFzaGRhIGRhdm9tIGV0YWRpLiBMb2NhbGhvc3QgdWNodW4gLmVudi5sb2NhbCBpY2hpZGFnaQpORVhUX1BVQkxJQ19TSVRFX1VSTD1odHRwOi8vbG9jYWxob3N0OjMwMDAgcWl5bWF0aW5pIG/igJh6Z2FydGlybWFuZzsgVmVyY2VsClByb2R1Y3Rpb24gcWl5bWF0aSBEYXNoYm9hcmTigJlkYSBhbG9oaWRhIHNhcWxhbmFkaS4K"};
const expected={"vercel.json":"2e91fe5f400371c4b313a8e0c0325be654e4a174aeadcedf00dd001fc1136c3b",".vercelignore":"095f155b284a6959aabe61af31fe7a12b165b98bed15d9eb2b470be4c6461d05","VERCEL-GRADEXA-BANK.cmd":"b61c037c9fb2d4dcdb7a0709a5a52bd565d0df4c458416e25981fd49533bb2f8","VERCEL-UZ.txt":"eaa37ca1b2188d93894467eb6e4d87255890759499ee66145fb7568b47c3f8e9"};
const originals={"vercel.json":[],".vercelignore":[],"VERCEL-GRADEXA-BANK.cmd":[],"VERCEL-UZ.txt":[]};
const required=[];
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root=process.cwd();
const args=process.argv.slice(2);
const sha=bytes=>crypto.createHash('sha256').update(bytes.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n')).digest('hex');
function target(relative) {
  if(typeof relative!=='string'||relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..')||path.isAbsolute(relative)) throw Error('Noto‘g‘ri fayl yo‘li.');
  const pieces=relative.split('/'); let current=root;
  for(const part of pieces) { current=path.join(current,part); if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink()) throw Error('Havola orqali yozilmadi: '+relative); }
  return current;
}
function hashFile(file) { return fs.existsSync(file)?sha(fs.readFileSync(file)):null; }
function replace(file,bytes,tempSuffix) {
  const temp=file+tempSuffix;
  fs.writeFileSync(temp,bytes,{flag:'wx'});
  try { fs.renameSync(temp,file); } finally { if(fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function restore(relative) {
  if(!relative.startsWith('gradexa-backups/vercel-prepare-')) throw Error('gradexa-backups/vercel-prepare-... zaxira yo‘lini kiriting.');
  const backup=target(relative), journal=JSON.parse(fs.readFileSync(path.join(backup,'manifest.json'),'utf8'));
  if(journal.format!=='gradexa-vercel-prepare-backup-v1'||!Array.isArray(journal.files)) throw Error('Zaxira shakli noto‘g‘ri.');
  for(const entry of journal.files) {
    const current=hashFile(target(entry.file));
    if(current!==entry.after&&current!==entry.before) throw Error('Keyinroq tahrirlangan faylni qaytarmadim: '+entry.file);
    if(entry.before!==null&&hashFile(target(relative+'/'+entry.file+'.bak'))!==entry.before) throw Error('Zaxira mos emas: '+entry.file);
  }
  const restored=[];
  try {
    for(const entry of [...journal.files].reverse()) {
      const file=target(entry.file);
      if(hashFile(file)===entry.before) continue;
      const bytes=fs.readFileSync(file); restored.push({file,bytes});
      if(entry.before===null) fs.unlinkSync(file);
      else replace(file,fs.readFileSync(target(relative+'/'+entry.file+'.bak')),'.gradexa-restore-tmp');
    }
  } catch(error) {
    const failed=[];
    for(const entry of restored.reverse()) try { replace(entry.file,entry.bytes,'.gradexa-restore-retry'); } catch { failed.push(entry.file); }
    throw Error(String(error.message)+(failed.length?' Qaytarib bo‘lmadi: '+failed.join(', '):' Qaytarish bekor qilindi; yangilangan nusxa saqlandi.'));
  }
  console.log('Loyiha fayllari zaxiradan qaytarildi. Supabase ma’lumotlari o‘zgartirilmadi.');
}
let lock;
try {
  const pkg=JSON.parse(fs.readFileSync(target('package.json'),'utf8'));
  if(pkg.name!=='gradexa-v2'||!fs.existsSync(target('app'))||!fs.existsSync(target('features'))) throw Error('Faylni package.json turgan gradexa papkasida ishga tushiring.');
  if(args.length&&args[0]!=='--check'&&args[0]!=='--restore') throw Error('Ruxsat etilgan parametrlar: --check yoki --restore ZAXIRA_YOLI');
  if(args[0]==='--restore') {
    if(args.length!==2) throw Error('Aniq zaxira yo‘lini kiriting.');
    const lockPath=target('gradexa-data-update.lock'); fs.writeFileSync(lockPath,String(process.pid),{flag:'wx'}); lock=lockPath;
    restore(args[1].replaceAll('\\','/'));
  } else {
    const conflicts=[], changes=[];
    for(const [relative,encoded] of Object.entries(payload)) {
      const file=target(relative), after=expected[relative], bytes=Buffer.from(encoded,'base64');
      if(sha(bytes)!==after) throw Error('Yangilagich fayli buzilgan: '+relative);
      const before=hashFile(file);
      if(before===after) continue;
      if((before===null&&required.includes(relative))||(before!==null&&!originals[relative].includes(before))) conflicts.push(relative);
      else changes.push({file:relative,before,after});
    }
    if(conflicts.length) throw Error('Fayllar kutilgan nusxadan farq qiladi yoki yetishmaydi. Hech biri almashtirilmadi:\n'+conflicts.join('\n'));
    if(!changes.length) console.log('Barcha yangilanishlar allaqachon o‘rnatilgan.');
    else if(args[0]==='--check') console.log('Tekshiruv o‘tdi. '+changes.length+' ta fayl yangilanadi. Hozir hech biri o‘zgartirilmadi.');
    else {
      const lockPath=target('gradexa-data-update.lock'); fs.writeFileSync(lockPath,String(process.pid),{flag:'wx'}); lock=lockPath;
      const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
      const backupRelative='gradexa-backups/vercel-prepare-'+stamp, backup=target(backupRelative);
      const suffix='.gradexa-update-'+stamp;
      const staged=[], written=[];
      try {
        fs.mkdirSync(backup,{recursive:true});
        // All backups and staged files are ready before the first source replacement.
        for(const entry of changes) {
          const file=target(entry.file);
          if(entry.before!==null) {
            const dest=path.join(backup,...entry.file.split('/'))+'.bak';
            fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.copyFileSync(file,dest,fs.constants.COPYFILE_EXCL);
            if(hashFile(dest)!==entry.before) throw Error('Zaxira paytida fayl o‘zgargan: '+entry.file);
          }
          fs.mkdirSync(path.dirname(file),{recursive:true});
          const temp=file+suffix; fs.writeFileSync(temp,Buffer.from(payload[entry.file],'base64'),{flag:'wx'}); staged.push(temp);
        }
        fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({format:'gradexa-vercel-prepare-backup-v1',createdAt:new Date().toISOString(),files:changes},null,2),{flag:'wx'});
        for(const entry of changes) if(hashFile(target(entry.file))!==entry.before) throw Error('Yangilash vaqtida fayl tahrirlandi: '+entry.file);
        for(const entry of changes) {
          const file=target(entry.file);
          if(hashFile(file)!==entry.before) throw Error('Almashtirishdan oldin fayl tahrirlandi: '+entry.file);
          fs.renameSync(file+suffix,file); written.push(entry);
        }
        for(const entry of changes) if(hashFile(target(entry.file))!==entry.after) throw Error('Yozilgan fayl tekshiruvdan o‘tmadi: '+entry.file);
      } catch(error) {
        const failed=[];
        for(const entry of written.reverse()) {
          try {
            const file=target(entry.file);
            if(entry.before===null) fs.unlinkSync(file);
            else replace(file,fs.readFileSync(path.join(backup,...entry.file.split('/'))+'.bak'),'.gradexa-rollback-'+stamp);
          } catch { failed.push(entry.file); }
        }
        throw Error(String(error.message)+(failed.length?' AVTOMATIK QAYTARISH TUGAMADI: '+failed.join(', ')+'. Zaxira: '+backupRelative:' Asl loyiha fayllari saqlandi/qaytarildi.'));
      } finally { for(const temp of staged) if(fs.existsSync(temp)) fs.unlinkSync(temp); }
      console.log('\nGRADEXA YANGILANISHI O‘RNATILDI. Fayllar: '+changes.length);
      console.log('Zaxira: '+backupRelative);
      console.log('Keyingi qadam: VERCEL-GRADEXA-BANK.cmd ni oching va VERCEL-UZ.txt bo‘yicha davom eting. SQL kerak emas.');
      console.log('Yo‘riqnoma: VERCEL-UZ.txt');
    }
  }
} catch(error) { console.error('\nYANGILANISH TO‘XTADI: '+error.message); process.exitCode=1; }
finally { if(lock&&fs.existsSync(lock)) fs.unlinkSync(lock); }
