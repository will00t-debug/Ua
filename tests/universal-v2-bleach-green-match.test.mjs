import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor
} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
// Twelve real GREEN non-FINAL official IDs x 4 + two GREEN FINAL = 50.
// No cross-color cards, TEST-ONLY placeholders, AP cards or variant identities.
export const GREEN_V2_BLEACH_COUNTS=Object.freeze({
 'BLC-1-067':4,'BLC-1-068':4,'BLC-1-071':4,'BLC-1-072':4,
 'BLC-1-075':4,'BLC-1-082':4,'BLC-1-086':4,'BLC-1-089':4,
 'BLC-1-090':4,'BLC-1-094':4,'BLC-1-097':4,'BLC-4-061':4,
 'BLC-1-100':2
});
const fresh=(seed=1994)=>newUniversalMatch(packs,{decks:[{...GREEN_V2_BLEACH_COUNTS},{...GREEN_V2_BLEACH_COUNTS}],seed,first:0});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing genuine card '+id);
}
function reachMain(s){
 for(let j=0;j<3&&s.phase!=='main';j++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}

test('all-green BLEACH V2 is a second 50-card real-only legal deck with all original printing stats',()=>{
 assert.deepEqual(validateUniversalDeck(pack,GREEN_V2_BLEACH_COUNTS),[]);
 assert.equal(Object.values(GREEN_V2_BLEACH_COUNTS).reduce((n,x)=>n+x,0),50);
 assert.equal(Object.keys(GREEN_V2_BLEACH_COUNTS).length,13);
 assert.ok(Object.entries(GREEN_V2_BLEACH_COUNTS).every(([id,n])=>
  n<=4&&n>0&&pack.cards[id]&&pack.cards[id].color==='green'&&!id.startsWith('TEST-ONLY')));
 assert.equal(GREEN_V2_BLEACH_COUNTS['BLC-1-100'],2);
 assert.equal(assertUniversalMatch(packs,fresh()),true);
});

test('real BLC-1-097 buffs own Gotei trait only, then draws one without losing physical cards',()=>{
 let s=fresh(1896),p=s.players[0];
 const generator=take(s,0,'BLC-1-075'),field=take(s,0,'BLC-1-094');
 const target=take(s,0,'BLC-1-071'),nonTarget=take(s,0,'BLC-4-061');
 const event=take(s,0,'BLC-1-097');
 p.energy[0]=generator;generator.ready=true;p.energy[1]=field;field.ready=true;
 p.front[0]=target;p.front[1]=nonTarget;p.hand.push(event);
 assert.equal(universalEnergyByColor(packs,s,0).green,4);
 s=reachMain(s);
 const option=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(option);
 const n=s.players[0].deck.length;
 const after=dispatchUniversalAction(packs,s,option,{actor:0});
 assert.equal(after.players[0].deck.length,n-1);
 assert.ok(after.players[0].outside.some(x=>x.uid===event.uid));
 assert.equal(after.players[0].front[0].buffs.at(-1).bp,1000);
 assert.ok(!(after.players[0].front[1].buffs||[]).some(x=>x.bp===1000));
 assert.equal(after.pending,null);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('50 real green cards complete an AI mirror game in isolated BLEACH pack with physical UID conservation',()=>{
 let s=fresh(2722),steps=0;
 for(;steps<2500&&s.status==='playing';steps++){
  const action=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
  assert.ok(action,'AI must not stall at step '+steps);
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(action)));
  s=dispatchUniversalAction(packs,s,action);
  if(steps%40===0)assert.equal(assertUniversalMatch(packs,s),true);
 }
 assert.ok(steps>25);
 assert.equal(s.status,'finished','both genuine decks must finish within the legal action cap');
 assert.ok(['life-zero','unblocked-attack','required-draw-empty'].includes(s.endReason));
 assert.equal(assertUniversalMatch(packs,s),true);
});
