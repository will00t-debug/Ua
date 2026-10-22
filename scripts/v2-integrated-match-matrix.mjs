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
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
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
const summary={candidate:'V2 five-title 250-card source-pinned integrated matrix',
 seedValues:seeds,matchCount:results.length,passed:results.filter(x=>x.pass).length,
 failed:errors.length,titles:coverage.map(x=>({title:x.title,ported:x.totalV2Cards})),
 disclaimer:'Only selected real 50-card decks, NOT full printed-FAQ acceptance',
 records:results};
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify(summary,null,2)+'\n');
for(const e of errors.slice(0,12))process.stderr.write(e+'\n');
process.stdout.write('V2 integrated 5-title matrix: '+summary.passed+'/'+results.length+
 ' finished (failures '+errors.length+'); evidence '+out+'\n');
if(summary.matchCount!==60||errors.length)process.exitCode=1;
