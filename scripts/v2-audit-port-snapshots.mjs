#!/usr/bin/env node
// [V2-E] Exact-SHA isolation of V2-B/C/D development work, never aggregate moving refs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const auditCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const base='ad04bef572303e8af1084ae1fb5cb431af9e7a11';
const round2=process.argv.includes('--round2');
const suffix=round2?'-r2':'';
const snapshot=[
 {title:'V2-B BLEACH',branch:'feature/v2-bleach-port-20261015',
  sha:'6f873f1997a71bfeb0eb96c0e2bada2f7be6daac',
  tests:['tests/universal-v2-bleach-port.test.mjs'],
  probe:"import {createBleachV2Pack} from './dist/universal-v2/bleach-pack.mjs';const p=createBleachV2Pack();console.log(JSON.stringify({title:p.id,count:Object.keys(p.cards).length,cardIds:Object.keys(p.cards)}));"},
 {title:'V2-C TTG/SLG',branch:'feature/v2-ttg-slg-port-20261015',
  sha:'d80443365806dae0df89fc2fb03110604e706024',
  tests:[],
  probe:"import {createTtgV2Pack} from './dist/universal-v2/ttg-pack.mjs';import {createSlgV2Pack} from './dist/universal-v2/slg-pack.mjs';const p=createTtgV2Pack(),q=createSlgV2Pack();console.log(JSON.stringify({titles:[p.id,q.id],counts:[Object.keys(p.cards).length,Object.keys(q.cards).length],cardIds:[Object.keys(p.cards),Object.keys(q.cards)]}));"},
 {title:'V2-D SAO/MST',branch:'feature/v2-sao-mst-port-20261015',
  sha:'1b74ba59bff89ae5ddcb4021103fe55a6789ee03',
  tests:['tests/universal-v2-sao-port.test.mjs','tests/universal-v2-mst-port.test.mjs','tests/universal-v2-sao-mst-cross-title.test.mjs'],
  probe:"import {saoV2Pack} from './dist/universal-v2/sao-pack.mjs';import {mstV2Pack} from './dist/universal-v2/mst-pack.mjs';const p=saoV2Pack(),q=mstV2Pack();console.log(JSON.stringify({titles:[p.id,q.id],counts:[Object.keys(p.cards).length,Object.keys(q.cards).length],cardIds:[Object.keys(p.cards),Object.keys(q.cards)]}));"}
];
if(round2){
 snapshot[0].sha='5431cbb6ac422b7356fd688cc7f3a4d4756c4b39';
 snapshot[1].sha='341cd595d0291af5b5363ef9d08d41184ee29b87';
 snapshot[1].tests=['tests/universal-v2-ttg-port.test.mjs','tests/universal-v2-slg-port.test.mjs'];
 snapshot[2].sha='9d88fad89f2942c7c3905bce68c1ca3f92cba140';
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'v2-e-snap-'));
const result={audit_commit:auditCommit,base,command:round2?'node scripts/v2-audit-port-snapshots.mjs --round2':'node scripts/v2-audit-port-snapshots.mjs',
 node:process.version,method:'isolated exact-SHA git worktrees; no merged totals',
 snapshots:[]};
for(const job of snapshot){
 const workspace=path.join(temp,job.branch.split('/')[1]);
 const row={title:job.title,branch:job.branch,commit:job.sha,checkout:'not_run',
  probe:'not_run',tests:'not_run',test_count:null,pass:null,fail:null};
 result.snapshots.push(row);
 try{
  execFileSync('git',['worktree','add','--detach',workspace,job.sha],
   {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  row.checkout='pass';
  const probe=spawnSync(process.execPath,['--input-type=module','--eval',job.probe],
   {cwd:workspace,encoding:'utf8',timeout:60000,maxBuffer:5*1024*1024});
  row.probe=probe.status===0?'pass':'fail';
  row.probe_output=(probe.stdout||'').trim().slice(-18000);
  if(probe.status!==0)row.probe_error=(probe.stderr||'').slice(-8000);
  if(job.tests.length){
   const t=spawnSync(process.execPath,['--test',...job.tests],
    {cwd:workspace,encoding:'utf8',timeout:120000,maxBuffer:12*1024*1024});
   row.tests=t.status===0?'pass':'fail';
   for(const [key,regex] of Object.entries({
    test_count:/^# tests (\d+)$/m,pass:/^# pass (\d+)$/m,fail:/^# fail (\d+)$/m
   }))row[key]=Number(t.stdout?.match(regex)?.[1]||0);
   row.test_output=(t.stdout||'').split('\n').filter(x=>/^not ok |\bError:|^# tests |^# pass |^# fail /.test(x)).slice(-35);
   if(t.status!==0){
    row.test_error=(t.stderr||'').slice(-8000);
    row.failure_context=(t.stdout||'').split('\n').flatMap((line,i,arr)=>
     /^not ok \d+/.test(line)?[arr.slice(i,i+36).join('\n')]:[]).slice(0,12);
    console.error('SNAPSHOT TEST FAILURE '+job.title+' '+job.sha+'\n'+row.failure_context.join('\n---\n'));
   }
  }else row.tests='not_present_on_snapshot';
 }catch(e){row.error=String(e?.message||e);}
 finally{
  if(row.checkout==='pass')try{
   execFileSync('git',['worktree','remove','--force',workspace],{cwd:root,stdio:'ignore'});
  }catch{}
 }
}
fs.rmSync(temp,{recursive:true,force:true});
fs.mkdirSync(path.join(root,'audit'),{recursive:true});
fs.writeFileSync(path.join(root,'audit/v2-port-snapshots'+suffix+'.json'),JSON.stringify(result,null,2)+'\n');
// Snapshot-only candidate rows are NOT merged into V2 foundation coverage.
const candidate=[];
for(const s of result.snapshots){
 if(s.probe!=='pass')continue;
 try{
  const o=JSON.parse(s.probe_output);
  const listed=o.cardIds;
  if(!Array.isArray(listed))continue;
  const batches=Array.isArray(listed[0])?
   o.titles.map((title,i)=>[title,listed[i]]):[[o.title,listed]];
  for(const [title,ids] of batches)for(const id of ids)
   candidate.push({title,id,branch:s.branch,snapshot_commit:s.commit,
    pack_probe_passed:true,snapshot_test_status:s.tests,
    integrated_into_source_v2:false,fully_accepted:false});
 }catch(e){s.candidateParseError=String(e);}
}
const candidateCols=['title','id','branch','snapshot_commit','pack_probe_passed',
 'snapshot_test_status','integrated_into_source_v2','fully_accepted'];
fs.writeFileSync(path.join(root,'audit/v2-branch-proposals'+suffix+'.csv'),
 candidateCols.join(',')+'\n'+candidate.map(r=>candidateCols.map(k=>String(r[k])).join(',')).join('\n')+'\n');
result.candidate_count=candidate.length;
console.log(JSON.stringify(result.snapshots.map(({title,commit,checkout,probe,tests,test_count,pass,fail})=>({
 title,commit,checkout,probe,tests,test_count,pass,fail
})),null,2));
if(result.snapshots.some(s=>s.checkout!=='pass'||s.probe!=='pass'||s.tests==='fail'))
 console.log('Pinned workstream failures require handoff, not a merged coverage claim.');
