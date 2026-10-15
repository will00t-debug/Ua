#!/usr/bin/env node
// [V2-E] Third-round independent audit, ALWAYS checkout exact A/B/C/D SHAs.
// Runs newly authored branch/official counterexamples and real browser UI;
// deliberately does NOT re-run the historical 60-seed matrix.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'audit','v2-e-round3');
fs.mkdirSync(out,{recursive:true});
const pins=Object.freeze({
 A:'75468867b7ec4f5cdd78661e5b98f400494fb94d',
 B:'2a502f01ec1e29a98c44e45e12f4aaa5a9753222',
 C:'979eed8530721fae53c63201e033a5297464c853',
 D:'a22aae190df206c5bd4f0d39ade190e1d8a71b42'
});
const report={name:'V2-E third-round 181-current pin',pins,
 auditCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 node:process.version,mode:'exact detached worktrees; no PR70 modification, no 60-game repetition',
 priorCurrentCI:{npmTest:'38694133956',matrix:'38694131961',
  bothAt:pins.A,npmTests:1143,matrixFinished:60},
 tests:{},blockers:[],uncertainties:[]};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'v2e3-'));
const dirs={};
function run(key,cwd,args,timeout=100000){
 const task=spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout,maxBuffer:20*1024*1024});
 const contents=(task.stdout||'')+'\n'+(task.stderr||'');
 fs.writeFileSync(path.join(out,key+'.log'),contents);
 const count=k=>Number(contents.match(new RegExp('^# '+k+' (\\d+)','m'))?.[1]||0);
 const r={argv:['node',...args],exitCode:task.status,signal:task.signal,
  pass:count('pass'),fail:count('fail'),tests:count('tests'),
  failures:contents.split('\n').filter(line=>/^not ok \d+/.test(line)).slice(0,20),
  log:'audit/v2-e-round3/'+key+'.log'};
 report.tests[key]=r;return r;
}
function probe(key,cwd,code){
 const r=run(key,cwd,['--input-type=module','--eval',code]);
 try{r.data=JSON.parse(fs.readFileSync(path.join(out,key+'.log'),'utf8').trim())}
 catch{report.blockers.push({id:key,reason:'Cannot parse exact pinned probe result'});}
 if(r.exitCode)report.blockers.push({id:key,reason:'Probe failed exit '+r.exitCode});
}
function err(id,why){report.blockers.push({id,reason:why});}
try{
 for(const [key,sha] of Object.entries(pins)){
  const dst=path.join(temp,key);
  execFileSync('git',['worktree','add','--detach',dst,sha],{
   cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  dirs[key]=dst;
  const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:dst,encoding:'utf8'}).trim();
  if(actual!==sha)throw Error('Git SHA drift '+key+' '+actual);
 }
 probe('a-manifest',dirs.A,
 "import {listRegisteredV2Titles} from './dist/universal-v2/title-packs/registry.mjs';import {v2AllTitleInventory} from './dist/universal-v2/title-packs/inventory.mjs';import {createAllV2PreviewRealDecks} from './dist/universal-v2/preview-real-decks.mjs';import {EXPECTED_V2_ADDED_CARD_IDS} from './tests/fixtures/v2-integrated-id-manifest.mjs';import {registeredV2TitlePack} from './dist/universal-v2/title-packs/registry.mjs';const p=listRegisteredV2Titles();console.log(JSON.stringify({registry:p,inventory:v2AllTitleInventory(),presets:Object.keys(createAllV2PreviewRealDecks()),ids:Object.fromEntries(p.map(x=>[x.title,Object.keys(registeredV2TitlePack(x.title).cards).sort()])),addedManifest:EXPECTED_V2_ADDED_CARD_IDS}))");
 const manifest=report.tests['a-manifest'].data;
 if(manifest){
  const vals=manifest.registry.map(x=>x.totalV2Cards);
  if(JSON.stringify(vals)!==JSON.stringify([78,23,18,39,23]))
   err('P0-A-REGISTRY','Actual registry counts did not match fixed 181 exact SHA: '+JSON.stringify(vals));
  if(manifest.inventory.totals.blocked!==519)err('P0-A-INVENTORY','Unported identity total not 519');
  const add=['BLC-1-059','BLC-1-077','BLC-2-055','BLC-3-006','BLC-3-009','BLC-4-013'];
  for(const id of add)if(!manifest.ids.bleach.includes(id))
   err('P0-A-NEW-ID','New printed BLC identity missing '+id);
 }
 const f=path.join(root,'audit-tests/v2-e-round3-branches.test.mjs');
 fs.copyFileSync(f,path.join(dirs.A,'tests/v2-e-round3-branches.test.mjs'));
 const targeted=run('a-third-round-new-tests',dirs.A,['--test','tests/v2-e-round3-branches.test.mjs'],100000);
 if(targeted.exitCode)err('P0-ROUND3-CASES',targeted.fail+' independent new counterexamples failed at exact A SHA');
 // Current non-integrated B/C contributions are NOT counted as PR70 registry.
 probe('b-candidate',dirs.B,
 "import {createBleachV2Pack} from './dist/universal-v2/bleach-pack.mjs';const p=createBleachV2Pack();console.log(JSON.stringify({title:p.id,ids:Object.keys(p.cards).sort()}))");
 probe('c-candidate',dirs.C,
 "import {createTtgV2Pack} from './dist/universal-v2/ttg-pack.mjs';import {createSlgV2Pack} from './dist/universal-v2/slg-pack.mjs';const t=createTtgV2Pack(),s=createSlgV2Pack();console.log(JSON.stringify({titles:[t.id,s.id],ids:[Object.keys(t.cards).sort(),Object.keys(s.cards).sort()]}))");
 probe('d-candidate',dirs.D,
 "import {saoV2Pack} from './dist/universal-v2/sao-pack.mjs';import {mstV2Pack} from './dist/universal-v2/mst-pack.mjs';const t=saoV2Pack(),s=mstV2Pack();console.log(JSON.stringify({titles:[t.id,s.id],ids:[Object.keys(t.cards).sort(),Object.keys(s.cards).sort()]}))");
 // Browser probes: actual desktop Chromium with 390px touch emulation.
 // Captures screenshot & report. Explicitly NOT a physical mobile device.
 fs.copyFileSync(path.join(root,'audit-tests/v2-e-round3-browser.mjs'),
  path.join(dirs.A,'tests/v2-e-round3-browser.mjs'));
 const browser=run('a-chromium-five-title',dirs.A,['tests/v2-e-round3-browser.mjs'],145000);
 const browserOut=path.join(dirs.A,'audit/v2-e-browser');
 if(fs.existsSync(browserOut)){
  fs.cpSync(browserOut,path.join(out,'browser'),{recursive:true});
  browser.data=JSON.parse(fs.readFileSync(path.join(browserOut,'browser-report.json'),'utf8'));
  if(browser.data.status!=='pass_browser_smoke')
   report.uncertainties.push('Browser not fully green: '+browser.data.status);
  if(!browser.data.cases.some(c=>c.name==='browser interaction and finish state'&&c.result.finished))
   report.uncertainties.push('No completed UI match on exact A in this run');
 }else report.uncertainties.push('Chromium browser report not produced');
 if(browser.exitCode)err('P0-CHROMIUM-UI','Real browser smoke process exited '+browser.exitCode);
 // Mark all unexercised full printed card branches plainly, do not conflate
 // passes in 1143 tests with proof for 181 cards or 700 official FAQ.
 report.uncertainties.push('Full official printed effects and FAQ across all 181 registered cards NOT independently certified');
 report.uncertainties.push('Real Android/iPhone touch, browser permissions and hosting access NOT tested');
 report.uncertainties.push('Six preset decks available; custom 50-card deck-builder UI not independently verified');
}catch(e){err('P0-HARNESS',String(e?.stack||e))}
finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 for(const [key,dir]of Object.entries(dirs))try{
  execFileSync('git',['worktree','remove','--force',dir],{cwd:root,stdio:'ignore'});
 }catch(e){report.uncertainties.push('Worktree cleanup '+key+': '+e.message)}
 fs.rmSync(temp,{recursive:true,force:true});
 console.log(JSON.stringify({pins:report.pins,node:report.node,auditCommit:report.auditCommit,
  newTests:report.tests['a-third-round-new-tests'],
  registry:report.tests['a-manifest']?.data?.registry?.map(x=>({title:x.title,count:x.totalV2Cards})),
  b:report.tests['b-candidate']?.data?.ids?.length,
  c:report.tests['c-candidate']?.data?.ids?.map(x=>x.length),
  d:report.tests['d-candidate']?.data?.ids?.map(x=>x.length),
  browser:report.tests['a-chromium-five-title']?.data?.status,
  blockers:report.blockers,uncertainties:report.uncertainties},null,2));
 if(report.blockers.some(x=>x.id.startsWith('P0')))process.exitCode=1;
}
