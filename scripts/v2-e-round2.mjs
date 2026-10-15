#!/usr/bin/env node
// V2-E second-round exact-SHA audit runner. Never writes other branch or engine.
// Requires GitHub checkout fetch-depth:0 / git worktree support / Node 22.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'audit','v2-e-round2');fs.mkdirSync(output,{recursive:true});
const PINS=Object.freeze({
 A:'25eeac5084917534193fd9feaeae31672f902e78',
 E:'',B:'dfdf1996706b61ef5f8c307bd786f7b8260abd8c',
 C:'bfb79970effd6095862dd837333da9cb58a8e977',
 D:'3a119bf73bbfb103e850d779923212c9dcdcf162'
});
const ownHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const source={snapshot:'2026-10-15-second-round',audit_commit:ownHead,
 pins:{...PINS,E:ownHead},node:process.version,
 note:'Separate exact-SHA worktrees. B/C/D scratch copies are NOT merged into PR70.',
 results:{},blockers:[]};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'v2-e-round2-'));
const dirs={},CAP=32*1024*1024;
function recordFailure(id,why){source.blockers.push({id,reason:why});}
function call(cwd,args,tag,timeout=180000){
 const t=spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout,maxBuffer:CAP});
 const out=(t.stdout||'')+'\n'+(t.stderr||'');
 fs.writeFileSync(path.join(output,tag+'.log'),out);
 const pick=k=>Number(out.match(new RegExp('^# '+k+' (\\d+)','m'))?.[1]||0);
 return {command:'node '+args.join(' '),exitCode:t.status,signal:t.signal||null,
  tests:pick('tests'),pass:pick('pass'),fail:pick('fail'),
  failureNames:out.split('\n').filter(x=>/^not ok \d+/.test(x)).slice(0,25),
  outputLog:'audit/v2-e-round2/'+tag+'.log'};
}
function probe(cwd,code,tag){
 const r=call(cwd,['--input-type=module','-e',code],tag,60000);
 let data=null;
 try{data=JSON.parse(fs.readFileSync(path.join(output,tag+'.log'),'utf8').trim())}catch{}
 return {...r,data};
}
try{
 for(const key of ['A','B','C','D']){
  const folder=path.join(temp,'source-'+key),sha=PINS[key];
  execFileSync('git',['worktree','add','--detach',folder,sha],{cwd:root,encoding:'utf8',
   stdio:['ignore','pipe','pipe']});
  dirs[key]=folder;
  const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:folder,encoding:'utf8'}).trim();
  if(actual!==sha)throw Error(key+' checkout drift '+actual);
 }
 source.results.A_base={
  ...probe(dirs.A,
   "import {listRegisteredV2Titles} from './dist/universal-v2/title-packs/registry.mjs';import {v2AllTitleInventory} from './dist/universal-v2/title-packs/inventory.mjs';console.log(JSON.stringify({registry:listRegisteredV2Titles(),inventory:v2AllTitleInventory()}))",
   'a-registry')};
 if(!source.results.A_base.data)recordFailure('E-BASE-PROBE','Pinned core registry failed to load');
 const expected=[15,20,0,0,0],counts=source.results.A_base.data?.registry?.map(x=>x.totalV2Cards);
 if(JSON.stringify(counts)!==JSON.stringify(expected))
  recordFailure('E-BASE-DRIFT','Registry changed from pinned manifest '+JSON.stringify(counts));
 // OLD shared tests are retained verbatim: preserve exactly what failed.
 source.results.A_original=call(dirs.A,['--test','tests/universal-v2-once-per-turn-gate.test.mjs'],
  'a-original-once');
 source.results.A_full=call(dirs.A,['--test','tests'], 'a-full-regression',300000);
 // Independent fixed-fixture tests copy from audit source into A's detached worktree.
 for(const name of ['v2-e-once-fixture-independent.test.mjs','v2-e-contract-regression.test.mjs'])
  fs.copyFileSync(path.join(root,'audit-tests',name),path.join(dirs.A,'tests',name));
 source.results.A_independent=call(dirs.A,['--test',
  'tests/v2-e-once-fixture-independent.test.mjs',
  'tests/v2-e-contract-regression.test.mjs'],'a-independent',90000);
 source.results.A_D_MST_base=probe(dirs.A,
  "import {UA54BT_VERIFIED} from './dist/mushoku-tensei.mjs';console.log(JSON.stringify({count:UA54BT_VERIFIED.length,incomplete:UA54BT_VERIFIED.filter(c=>!c.verified).map(c=>c.id)}))",
  'a-mst-legacy');
 source.results.D_MST_source=probe(dirs.D,
  "import {UA54BT_VERIFIED} from './dist/universal-v2/sources/mst-catalog.mjs';import {UA54BT_OFFICIAL_PRINT} from './dist/universal-v2/sources/mst-official-print.mjs';const missing=UA54BT_VERIFIED.filter(c=>!c.verified||!c.effectJa||!Number.isInteger(c.energy)||!Number.isInteger(c.ap)||!Number.isInteger(c.gen)||!Number.isInteger(c.bp));console.log(JSON.stringify({catalogue:UA54BT_VERIFIED.length,official:Object.keys(UA54BT_OFFICIAL_PRINT).length,incomplete:missing.map(c=>c.id),ids:UA54BT_VERIFIED.map(c=>c.id)}))",
  'd-mst-official-source');
 const other=[
  ['B',["tests/universal-v2-bleach-port.test.mjs","tests/universal-v2-bleach-core-gaps.test.mjs"]],
  ['C',["tests/universal-v2-ttg-port.test.mjs","tests/universal-v2-slg-port.test.mjs"]],
  ['D',["tests/universal-v2-sao-port.test.mjs","tests/universal-v2-mst-port.test.mjs","tests/universal-v2-sao-mst-cross-title.test.mjs"]]
 ];
 for(const [key,list] of other){
  const existing=list.filter(p=>fs.existsSync(path.join(dirs[key],p)));
  source.results[key+'_tests']=existing.length?call(dirs[key],['--test',...existing],
   key.toLowerCase()+'-isolated',120000):{status:'not_present'};
 }
 // Candidate pack probe is by actual module construction, never trust handoff numbers.
 const probes={
  B:"import {createBleachV2Pack} from './dist/universal-v2/bleach-pack.mjs';const x=createBleachV2Pack();console.log(JSON.stringify({titles:[x.id],cards:[Object.keys(x.cards)]}))",
  C:"import {createTtgV2Pack} from './dist/universal-v2/ttg-pack.mjs';import {createSlgV2Pack} from './dist/universal-v2/slg-pack.mjs';const a=createTtgV2Pack(),b=createSlgV2Pack();console.log(JSON.stringify({titles:[a.id,b.id],cards:[Object.keys(a.cards),Object.keys(b.cards)]}))",
  D:"import {saoV2Pack} from './dist/universal-v2/sao-pack.mjs';import {mstV2Pack} from './dist/universal-v2/mst-pack.mjs';const a=saoV2Pack(),b=mstV2Pack();console.log(JSON.stringify({titles:[a.id,b.id],cards:[Object.keys(a.cards),Object.keys(b.cards)]}))"
 };
 for(const key of ['B','C','D'])source.results[key+'_pack']=probe(dirs[key],probes[key],key.toLowerCase()+'-pack');
 const manifest=[];
 for(const key of ['B','C','D']){
  const p=source.results[key+'_pack'].data;
  if(!p){recordFailure('E-'+key+'-PACK','Candidate pack construction did not emit parseable JSON');continue;}
  p.titles.forEach((t,i)=>{
   const seen=new Set();
   for(const id of p.cards[i]){
    if(seen.has(id))recordFailure('E-'+key+'-DUP','Duplicate actual ID '+t+'/'+id);
    seen.add(id);
    manifest.push({title:t,id,source:key,commit:PINS[key],in_pr70:false});
   }
  });
 }
 const unique=new Set(manifest.map(r=>r.title+'/'+r.id));
 if(unique.size!==manifest.length)recordFailure('E-CROSS-BRANCH-DUP','Duplicate title-qualified candidate IDs');
 const csv=['title,id,workstream,source_commit,registered_PR70']
  .concat(manifest.map(x=>[x.title,x.id,x.source,x.commit,x.in_pr70].join(','))).join('\n')+'\n';
 fs.writeFileSync(path.join(output,'candidates.csv'),csv);
 source.results.candidateManifest={records:manifest.length,unique:unique.size,
  byTitle:Object.fromEntries([...new Set(manifest.map(x=>x.title))].map(t=>
   [t,manifest.filter(x=>x.title===t).length]))};
 // Scratched combined worktree. NO tracked engine/card-pool file is changed or pushed.
 const map=[
  [dirs.B,'dist/universal-v2/bleach-pack.mjs'],
  [dirs.C,'dist/universal-v2/ttg-pack.mjs'],
  [dirs.C,'dist/universal-v2/slg-pack.mjs'],
  [dirs.D,'dist/universal-v2/sao-pack.mjs'],
  [dirs.D,'dist/universal-v2/mst-pack.mjs'],
  [dirs.D,'dist/universal-v2/sources/mst-catalog.mjs'],
  [dirs.D,'dist/universal-v2/sources/mst-official-print.mjs']
 ];
 for(const [dir,relative] of map){
  const target=path.join(dirs.A,relative);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(dir,relative),target);
 }
 fs.copyFileSync(path.join(root,'audit-tests/v2-e-pairwise-runner.mjs'),
  path.join(dirs.A,'tests/v2-e-pairwise-runner.mjs'));
 source.results.scratch=call(dirs.A,['tests/v2-e-pairwise-runner.mjs'],
  'scratch-pairwise-console',270000);
 // Scratch runner writes inside this worktree, copy into audit artifacts BEFORE removing.
 const scratchSrc=path.join(dirs.A,'audit/v2-e-round2-scratch-matches');
 if(fs.existsSync(scratchSrc)){
  const dest=path.join(output,'scratch-matches');
  fs.cpSync(scratchSrc,dest,{recursive:true});
  source.results.scratchSummary=JSON.parse(fs.readFileSync(path.join(dest,'summary.json'),'utf8'));
 }else recordFailure('E-SCRATCH','Scratch match runner did not output replay files');
 if(source.results.A_original.fail)
  recordFailure('E-ONCE-OLD','Baseline original tests fail '+source.results.A_original.fail+
   ' cases; compare independent prepared-hand tests before attributing root cause');
 if(source.results.A_full.fail)
  recordFailure('E-BASE-REGRESSION','Pinned A npm test had '+source.results.A_full.fail+' failing tests');
 if(source.results.A_independent.fail)
  recordFailure('E-ONCE-INDEPENDENT','Independent fixed-fixture/contract tests failed: '+source.results.A_independent.fail);
 if(source.results.scratchSummary?.failed)
  recordFailure('E-SCRATCH-NONTERMINAL',source.results.scratchSummary.failed+
   ' candidate scratch matches did not finish; see seed/action JSON');
} catch(e){recordFailure('E-RUNNER',String(e?.stack||e));}
finally{
 source.completed_at_utc=new Date().toISOString();
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(source,null,2)+'\n');
 for(const key of ['A','B','C','D'])if(dirs[key])try{
  execFileSync('git',['worktree','remove','--force',dirs[key]],{cwd:root,stdio:'ignore'});
 }catch(e){console.error('Clean worktree '+key,e.message)}
 fs.rmSync(temp,{recursive:true,force:true});
 const s=source.results;
 console.log(JSON.stringify({pins:source.pins,node:source.node,
  originalOnce:s.A_original?.fail,
  independent:s.A_independent?.pass+'/'+s.A_independent?.tests,
  regression:s.A_full?.pass+'/'+s.A_full?.tests,
  candidates:s.candidateManifest,scratch:s.scratchSummary?{
   finished:s.scratchSummary.finished,total:s.scratchSummary.total}:null,
  blockers:source.blockers},null,2));
}
