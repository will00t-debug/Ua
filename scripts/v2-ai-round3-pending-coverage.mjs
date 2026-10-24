#!/usr/bin/env node
// Every 'observed' kind below comes from reducer-generated pending in complete,
// native V2 matches using registered real 50-card decks; never from DSL scans
// or synthetic pending constructors. Positive/negative examples require
// separately certified counterfactual tests and are NOT inferred here.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
const inventory=JSON.parse(readFileSync(new URL('../tests/fixtures/v2-ai-decision-inventory.json',
 import.meta.url),'utf8'));
const kinds=Object.values(inventory.pendingGroups).flat().sort();
if(kinds.length!==61||new Set(kinds).size!==61)throw Error('Pending inventory no longer 61 unique kinds');
const presets=createAllV2PreviewRealDecks(),seeds=(process.env.AI_R3_COVER_SEEDS||'12031,32063').split(',').map(Number);
const observations={},matches=[];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
for(const [deckName,d] of Object.entries(presets)){
 if(validateUniversalDeck(d.pack,d.counts).length)throw Error('Invalid registered full-print deck: '+deckName);
 for(const seed of seeds)for(const first of [0,1]){
  const packs=[d.pack,d.pack],rec={deckName,seed,first,turns:0,illegal:0,
   finished:false,kinds:[],error:null};
  let s=newUniversalMatch(packs,{decks:[d.counts,d.counts],seed,first});
  const seen=new Set();
  try{
   for(;s.status==='playing'&&rec.turns<1800;rec.turns++){
    const actor=s.pending?.player??s.active,legal=legalUniversalActions(packs,s);
    if(s.pending){
     const kind=s.pending.kind;if(!kinds.includes(kind))throw Error('Unreviewed kind: '+kind);
     const stats=observations[kind]??={occurrences:0,completedSelections:0,
      native: true,registeredFullCards:true,legalSelections:0,decks:new Set()};
     seen.add(kind);stats.occurrences++;stats.decks.add(deckName);
    }
    const difficulty=actor===0?'hard':'normal';
    const a=chooseUniversalAiAction(packs,s,{difficulty});
    if(!a||!legal.some(x=>same(x,a))){rec.illegal++;throw Error('Non-native selection: '+s.pending?.kind);}
    const before=s.pending?.kind;
    s=dispatchUniversalAction(packs,s,a,{actor});
    if(before){
     observations[before].legalSelections++;
     // Count only an observed transition out of this pending step.
     if(s.pending?.kind!==before)observations[before].completedSelections++;
    }
    if(rec.turns%100===0)assertUniversalMatch(packs,s);
   }
   assertUniversalMatch(packs,s);rec.finished=s.status==='finished';
  }catch(e){rec.error=String(e.stack||e);}
  rec.kinds=[...seen].sort();matches.push(rec);
 }
}
const observed=new Set(Object.keys(observations)),uncovered=kinds.filter(k=>!observed.has(k));
const report={
 type:'real reducer pending coverage on registered 50-card native V2 matches',
 decks:Object.keys(presets),seeds,
 verifiedInventorySize:kinds.length,
 realReducerTriggered:observed.size,
 strategiesWithVerifiedPositiveAndNegativeCounterexamples:0,
 strategiesWithoutCertifiedCounterexamples:observed.size,
 uncovered:uncovered.length,
 uncoveredKinds:uncovered,
 missingFullCardBlocked:null,
 missingFullCardBlockedReason:'No official card-specific absence mapping was proven; report unknown rather than labeling uncovered kinds unsupported.',
 selectionCounts:Object.fromEntries(Object.entries(observations).sort(([a],[b])=>a.localeCompare(b))
 .map(([key,v])=>[key,{...v,decks:[...v.decks].sort()}])),
 matches,allFinished:matches.every(m=>m.finished),
 illegalSelections:matches.reduce((n,m)=>n+m.illegal,0),
 note:'Choice inventory and legal branch execution are not proof of strategically positive/negative tests, nor full official FAQ certification.'
};
mkdirSync('audit',{recursive:true});
writeFileSync('audit/v2-ai-round3-pending-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,matches:undefined},null,2));
if(!report.allFinished||report.illegalSelections)process.exitCode=1;
