import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const deck=verifiedBleachPurplePilotDeck(),packs=[deck.pack,deck.pack];
const testCounts={...deck.counts,'BLC-1-034':3,'BLC-1-105':1};
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('missing '+id);
}
function attacked({withStrong=false,oneLife=false}={}){
 let s=newUniversalMatch(packs,{decks:[testCounts,testCounts],first:0,seed:8971});
 const attack=take(s,0,'BLC-1-052'),equal=take(s,1,'BLC-1-052');
 attack.ready=true;equal.ready=true;
 s.players[0].front[0]=attack;s.players[1].front[0]=equal;
 let strong;
 if(withStrong){
  strong=take(s,1,'BLC-1-105');strong.ready=true;s.players[1].front[1]=strong;
 }
 if(oneLife){
  while(s.players[1].life.length>1)s.players[1].outside.push(s.players[1].life.pop());
 }
 for(let n=0;n<3;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attack.uid},{actor:0});
 // 052 has onAttack draw-and-discard; defender must not act until it resolves.
 assert.equal(s.pending?.kind,'effect-discard');
 const discard=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 s=dispatchUniversalAction(packs,s,discard,{actor:0});
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,attack,equal,strong};
}

test('normal/hard block AI declines an equal-BP blocker when it would be retired',()=>{
 const {s,equal}=attacked();
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.uid===equal.uid));
 for(const difficulty of ['normal','hard']){
  assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty}),
   {type:'chooseBlock',uid:null},
   difficulty+' must not mistake BP equality for survival');
 }
});

test('AI chooses a stronger blocker that actually survives ahead of equal-BP martyr',()=>{
 const {s,strong}=attacked({withStrong:true});
 for(const difficulty of ['normal','hard']){
  assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty}),
   {type:'chooseBlock',uid:strong.uid});
 }
});

test('hard AI still blocks at one LIFE to avert fatal unblocked damage',()=>{
 const {s,equal}=attacked({oneLife:true});
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'normal'}),
  {type:'chooseBlock',uid:null});
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'hard'}),
  {type:'chooseBlock',uid:equal.uid});
});
