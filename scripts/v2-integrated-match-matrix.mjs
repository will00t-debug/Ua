#!/usr/bin/env node
import {assertIndependentV2Inventory} from '../tests/fixtures/v2-integrated-id-manifest.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
// 2026-10-15 integrated V2 candidate verification: 5 independent real titles,
// 10 title pairs x 2 first-player orientations x 3 fixed shuffle seeds.
// This exercises the EXACT current registry and one reducer in one commit.
// Never substitutes standalone reducers or assumes a passing unit count means
// 700 individual printed official card effects are complete.
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {csmPracticeDeck,practiceDeck} from '../dist/universal-v2/official-entry.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {createKmr2V2Pack} from '../dist/universal-v2/kmr2-pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {listRegisteredV2Titles} from '../dist/universal-v2/title-packs/registry.mjs';

const out=process.env.V2_MATRIX_OUTPUT||
 resolve(dirname(fileURLToPath(import.meta.url)),'../audit/v2-integrated-match-matrix.json');
const presets=createAllV2PreviewRealDecks();
const roster=['bleach-green','gurren-lagann-red','solo-leveling',
 'sword-art-online','mushoku-tensei'];
const seeds=[747,20261015,20261016];
const results=[],errors=[];
const coverage=listRegisteredV2Titles();
assertIndependentV2Inventory(v2AllTitleInventory());
for(const key of roster){
 const {pack,counts}=presets[key];
 if(validateUniversalDeck(pack,counts).length||
  Object.values(counts).reduce((a,b)=>a+b,0)!==50)
  throw Error(key+' not a legal exact 50-card all-real deck');
}
for(let i=0;i<roster.length;i++)for(let j=i+1;j<roster.length;j++){
 for(const first of [0,1])for(const seed of seeds){
  const left=presets[roster[i]],right=presets[roster[j]];
  const packs=[left.pack,right.pack],input=[left.counts,right.counts];
  const entry={titles:[packs[0].id,packs[1].id],presetIds:[roster[i],roster[j]],
   first,seed,steps:0,finished:false,endReason:null,winner:null,pass:false};
  try{
   let s=newUniversalMatch(packs,{decks:input,seed,first});
   assertUniversalMatch(packs,s);
   for(let step=0;step<5500&&s.status==='playing';step++){
    const actor=s.pending?.player??s.active;
    const legal=legalUniversalActions(packs,s);
    const action=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
    if(!action||!legal.some(a=>JSON.stringify(a)===JSON.stringify(action)))
     throw Error('AI illegal/no action on step '+step+' actor '+actor);
    s=dispatchUniversalAction(packs,s,action,{actor});
    entry.steps++;
    if(entry.steps%60===0)assertUniversalMatch(packs,s);
   }
   assertUniversalMatch(packs,s);
   entry.finished=s.status==='finished';
   entry.endReason=s.endReason||null;
   entry.winner=s.winner;
   entry.pass=entry.finished&&
    ['life-zero','unblocked-attack','required-draw-empty'].includes(s.endReason);
   if(!entry.pass)throw Error('No supported win after '+entry.steps+' steps: '+s.endReason);
  }catch(e){
   entry.error=String(e?.stack||e);
   errors.push(entry.presetIds.join(' vs ')+' '+seed+'/'+first+': '+String(e?.message||e));
  }
  results.push(entry);
 }
}
function cardCensus(s){
 const ids=[];
 const hidden=[];
 const walk=(c,owner,under)=>{
  if(!c)return;
  ids.push(c.uid);
  if(under&&c.faceDown)hidden.push({owner,uid:c.uid,cardId:c.cardId});
  for(const layer of c.stack||[])walk(layer,owner,true);
  for(const layer of c.under||[])walk(layer,owner,true);
 };
 for(let p=0;p<2;p++){
  const pl=s.players[p];
  for(const zone of ['deck','hand','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const c of pl[zone]||[])walk(c,p,false);
  for(const line of ['front','energy'])
   for(const c of pl[line]||[])walk(c,p,false);
 }
 return {ids,hidden};
}
function facedownViewProblem(packs,s,hidden){
 if(!hidden.length)return '';
 for(const card of hidden){
  const token=JSON.stringify(card.uid);
  const foe=JSON.stringify(universalPublicView(packs,s,1-card.owner));
  const self=JSON.stringify(universalPublicView(packs,s,card.owner));
  if(foe.includes(token))return 'opponent view shows facedown '+card.uid;
  if(!self.includes(token))return 'controller view hides facedown '+card.uid;
 }
 return '';
}
function playChecked(packs,decks,seed,first){
 let s=newUniversalMatch(packs,{decks,seed,first});
 assertUniversalMatch(packs,s);
 const opening=cardCensus(s);
 const uidSet=opening.ids.slice().sort().join(',');
 if(new Set(opening.ids).size!==opening.ids.length)throw Error('Opening UID duplicated');
 let stuck=0,previous='',optionalEntries=0,facedownChecks=0,steps=0;
 const notes=[];
 for(;steps<1500&&s.status==='playing';steps++){
  const actor=s.pending?.player??s.active;
  const legal=legalUniversalActions(packs,s);
  if(!legal.length)throw Error('No legal action on step '+steps);
  if(s.pending?.step==='enter'&&legal.some(a=>a.mode==='skip'))optionalEntries++;
  const action=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
  if(!action||!legal.some(a=>JSON.stringify(a)===JSON.stringify(action)))
   throw Error('AI illegal/no action on step '+steps+' actor '+actor);
  s=dispatchUniversalAction(packs,s,action,{actor});
  const stamp=[s.status,s.phase,s.turn,s.active,s.pending?.kind||'',s.pending?.id||'',s.pending?.step||''].join('/');
  stuck=stamp===previous?stuck+1:0;
  previous=stamp;
  if(stuck>40)throw Error('Pending choice did not complete: '+stamp);
  if(steps%40===0){
   const now=cardCensus(s);
   if(new Set(now.ids).size!==now.ids.length)throw Error('Duplicated UID on step '+steps);
   if(now.ids.slice().sort().join(',')!==uidSet)throw Error('UID set changed on step '+steps);
   const leak=facedownViewProblem(packs,s,now.hidden);
   if(leak)throw Error(leak+' on step '+steps);
   if(now.hidden.length)facedownChecks++;
   assertUniversalMatch(packs,s);
  }
 }
 assertUniversalMatch(packs,s);
 const end=cardCensus(s);
 if(new Set(end.ids).size!==end.ids.length)throw Error('Duplicated UID at the end');
 if(end.ids.slice().sort().join(',')!==uidSet)throw Error('UID set changed at the end');
 const leak=facedownViewProblem(packs,s,end.hidden);
 if(leak)throw Error(leak);
 if(end.hidden.length)facedownChecks++;
 if(s.status!=='finished')notes.push('strategy: still playing after '+steps+' steps');
 else if(!['life-zero','unblocked-attack','required-draw-empty'].includes(s.endReason))
  throw Error('Finished for an unsupported reason: '+s.endReason);
 return {steps,status:s.status,endReason:s.endReason||null,
  winner:s.winner,optionalEntries,facedownChecks,notes};
}
const kmr1Pack=createKmrV2Pack(),kmr2Pack=createKmr2V2Pack();
const closedDecks={
 csm:csmPracticeDeck(),
 'kmr-vol1':{pack:kmr1Pack,counts:practiceDeck(kmr1Pack,{color:'yellow'})},
 'kmr-vol2':{pack:kmr2Pack,counts:practiceDeck(kmr2Pack,{color:'blue'})},
 'bleach-green':presets['bleach-green']
};
for(const [key,{pack,counts}] of Object.entries(closedDecks)){
 if(validateUniversalDeck(pack,counts).length||
  Object.values(counts).reduce((a,b)=>a+b,0)!==50)
  throw Error(key+' is not a legal exact 50-card deck');
}
const closedPairs=[['csm','kmr-vol1'],['csm','kmr-vol2'],['kmr-vol1','kmr-vol2'],
 ['csm','bleach-green'],['kmr-vol1','bleach-green'],['kmr-vol2','bleach-green']];
const closedSeeds=[747,20261106];
const closedRecords=[],closedRuleErrors=[],closedStrategy=[];
for(const [leftKey,rightKey] of closedPairs){
 for(const first of [0,1])for(const seed of closedSeeds){
  const left=closedDecks[leftKey],right=closedDecks[rightKey];
  const packs=[left.pack,right.pack];
  const entry={presetIds:[leftKey,rightKey],first,seed,pass:false,steps:0,
   optionalEntries:0,facedownChecks:0,strategy:[],ruleError:null};
  try{
   const played=playChecked(packs,[left.counts,right.counts],seed,first);
   entry.steps=played.steps??0;
   entry.endReason=played.endReason;
   entry.winner=played.winner;
   entry.optionalEntries=played.optionalEntries;
   entry.facedownChecks=played.facedownChecks;
   entry.strategy=played.notes;
   entry.pass=played.status==='finished'&&!played.notes.length;
   if(played.notes.length)closedStrategy.push(leftKey+' vs '+rightKey+' '+seed+'/'+first+': '+played.notes.join('; '));
  }catch(e){
   entry.ruleError=String(e?.message||e);
   closedRuleErrors.push(leftKey+' vs '+rightKey+' '+seed+'/'+first+': '+entry.ruleError);
  }
  closedRecords.push(entry);
 }
}
const closed={
 candidate:'CSM purple, KMR vol.1 yellow, KMR vol.2 blue, plus Bleach green cross-title',
 seeds:closedSeeds,matchCount:closedRecords.length,
 finished:closedRecords.filter(x=>x.pass).length,
 ruleErrors:closedRuleErrors.length,strategyNotes:closedStrategy.length,
 optionalEntrySightings:closedRecords.reduce((n,x)=>n+x.optionalEntries,0),
 facedownChecks:closedRecords.reduce((n,x)=>n+x.facedownChecks,0),
 disclaimer:'Existing AI only. An unfinished game is a strategy note. An illegal action, a stuck choice, a UID change or a facedown leak is a rule error.',
 records:closedRecords
};
const summary={candidate:'V2 five-title 250-card source-pinned integrated matrix',
 seedValues:seeds,matchCount:results.length,passed:results.filter(x=>x.pass).length,
 failed:errors.length,titles:coverage.map(x=>({title:x.title,ported:x.totalV2Cards})),
 disclaimer:'Only selected real 50-card decks, NOT full printed-FAQ acceptance',
 records:results,closedTitle:closed};
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify(summary,null,2)+'\n');
for(const e of errors.slice(0,12))process.stderr.write(e+'\n');
for(const e of closedRuleErrors.slice(0,12))process.stderr.write(e+'\n');
for(const e of closedStrategy.slice(0,8))process.stderr.write(e+'\n');
process.stdout.write('V2 integrated 5-title matrix: '+summary.passed+'/'+results.length+
 ' finished (failures '+errors.length+'); closed titles '+closed.finished+'/'+closed.matchCount+
 ' finished, rule errors '+closed.ruleErrors+', strategy notes '+closed.strategyNotes+
 '; evidence '+out+'\n');
if(summary.matchCount!==60||errors.length||closedRuleErrors.length||closed.matchCount!==24)process.exitCode=1;
