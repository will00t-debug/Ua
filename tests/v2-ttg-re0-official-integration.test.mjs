// Official shared-engine entry for Tengen Toppa 81 and Re:Zero set 1.
// A finished AI match is required. Registration alone is not acceptance.
// Q1569–Q1582 and the named UA56BT checks live in their own files.
// Everything outside those files stays unchecked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createRezeroV2Pack,REZERO_ENGINE_IDS} from '../dist/universal-v2/rezero-pack.mjs';
import {createRezV2Pack,REZ_V2_IMPLEMENTED_IDS} from '../dist/universal-v2/rez-pack.mjs';
import {officialV2Pack,rezeroSet1PracticeDeck,practiceDeck,v2DeckReport,createRezeroBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {emptyRezDeck} from '../dist/rezero-builder.mjs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

test('TTG 81 and Re:Zero set 1 113 register on the shared V2 packs',()=>{
 const ttg=createTtgV2Pack();
 const expect=Array.from({length:81},(_,i)=>'TTG-1-'+String(i+1).padStart(3,'0'));
 assert.deepEqual(Object.keys(ttg.cards).sort(),expect);
 assert.equal(Object.values(ttg.cards).some(c=>c.auto===true),false);
 const set1=createRezeroV2Pack();
 assert.equal(REZERO_ENGINE_IDS.length,113);
 assert.equal(Object.keys(set1.cards).length,113);
 assert.deepEqual([...REZERO_ENGINE_IDS].sort(),Object.keys(set1.cards).sort());
 const vol2=createRezV2Pack();
 assert.equal(Object.keys(vol2.cards).length,28);
 assert.equal(REZ_V2_IMPLEMENTED_IDS.length,28);
 const battle=createRezeroBattlePack();
 assert.equal(Object.keys(battle.cards).length,141);
 assert.equal(officialV2Pack('gurren-lagann').cards['TTG-1-081'].id,'TTG-1-081');
});

test('a legal 50-card TTG or set-1 deck can enter V2, and an unsupported Vol.2 card cannot hide',()=>{
 const ttg=officialV2Pack('gurren-lagann');
 const red=practiceDeck(ttg,{color:'red'});
 assert.equal(v2DeckReport('gurren-lagann',red).ok,true);
 const set1=rezeroSet1PracticeDeck();
 assert.equal(v2DeckReport('rezero',set1.counts).ok,true);
 assert.equal(Object.keys(set1.counts).some(id=>id.startsWith('REZ-2-')),false);
 const drafted=emptyRezDeck();
 for(const [id,n] of Object.entries(set1.counts))drafted[id]=n;
 const draftedReport=v2DeckReport('rezero',drafted);
 assert.equal(draftedReport.ok,true,draftedReport.issues.join('; '));
 const blocked={'REZ-1-001':4,'REZ-2-001':4};
 const report=v2DeckReport('rezero',blocked);
 assert.equal(report.ok,false);
 assert.ok(report.warnings.some(w=>w.includes('REZ-2-001')));
 assert.equal(report.counts['REZ-2-001'],undefined);
});

function play(name,mine,foe,seed){
 const packs=[mine.pack,foe.pack];
 let s=newUniversalMatch(packs,{decks:[mine.counts,foe.counts],seed,first:0});
 assert.equal(assertUniversalMatch(packs,s),true,name+' opening');
 let steps=0;
 while(s.status==='playing'&&steps++<3500){
  const legal=legalUniversalActions(packs,s);
  const action=chooseUniversalAiAction(packs,s,{difficulty:steps%2?'hard':'normal'});
  assert.ok(action,name+' AI stalled at step '+steps+' '+s.phase+' '+(s.pending?.kind||''));
  assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(action)),name+' illegal AI action');
  s=dispatchUniversalAction(packs,s,action);
  if(steps%40===0){
   assert.equal(assertUniversalMatch(packs,s),true,name+' state');
   const view=universalPublicView(packs,s,0);
   const hidden=JSON.stringify(view);
   for(const card of s.players[1].front.concat(s.players[1].energy).filter(Boolean)){
    for(const under of card.under||[]){
     if(under.faceDown===true)assert.equal(hidden.includes(under.uid),false,name+' leaked facedown');
    }
   }
  }
 }
 assert.equal(s.status,'finished',name+' did not finish in '+steps);
 assert.ok(s.winner===0||s.winner===1,name+' winner');
 assert.equal(assertUniversalMatch(packs,s),true,name+' final');
 return steps;
}

test('TTG and Re:Zero set 1 finish legal AI matches on the shared engine',()=>{
 const presets=createAllV2PreviewRealDecks();
 const ttgPack=officialV2Pack('gurren-lagann');
 const ttg={pack:ttgPack,counts:practiceDeck(ttgPack,{color:'red'})};
 const bleach=presets['bleach-green'];
 const rezero=rezeroSet1PracticeDeck();
 const games=[
  ['TTG vs TTG',ttg,ttg,8101],
  ['TTG vs BLEACH',ttg,bleach,8102],
  ['TTG vs Re:Zero set 1',ttg,rezero,8103],
  ['Re:Zero set 1 vs set 1',rezero,rezero,8104],
  ['Re:Zero set 1 vs BLEACH',rezero,bleach,8105]
 ];
 for(const [name,mine,foe,seed] of games){
  const steps=play(name,mine,foe,seed);
  assert.ok(steps>8,name+' ended before a real match');
 }
});
