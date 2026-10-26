import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-069'],'REZ-2-056');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}

test('REZ-2-069 rests up to two green AP1 BP2500 characters, and the AP2 branch is empty in this pack',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-069'].effectJa,/消費APが2/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-069'].effectJa,/消費APが1/);
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-039'].engineImplemented,true);
 assert.equal(rez.cards['REZ-2-069'].triggerEffect.op,'retireOppFront');
 assert.throws(()=>createUniversalPack({id:'rez-069-bad',cards:[{
  id:'X',name:'選択',color:'green',type:'event',energy:1,ap:1,bp:0,gen:0,trigger:'special',
  triggerEffect:{op:'retireOppFront'},implementation:'dsl',effects:{onPlay:[
   {op:'deployOutsidePrinted',color:'green',printedBp:2500,ap:2,max:1,ready:true}]}}]}),/printed outside/);
 let s=fresh(deck,2069);
 s=toPhase(rezPacks,s,'main');
 for(let i=0;i<4;i++)sit(s,0,'REZ-2-055','energy',i);
 const event=take(s,0,'REZ-2-069');s.players[0].hand.push(event);
 const first=take(s,0,'REZ-2-033');const second=take(s,0,'REZ-2-033');
 s.players[0].outside.push(first,second);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.type==='event'&&a.uid===event.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['oneAp2','twoAp1']);
 const empty=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseEffectMode',mode:'oneAp2'},{actor:0});
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].outside.filter(c=>c.cardId==='REZ-2-033').length,2);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'twoAp1'},{actor:0});
 assert.equal(s.pending.kind,'effect-outside-printed');
 const enter=legalUniversalActions(rezPacks,s).find(a=>a.type==='chooseOutsidePrinted'&&a.uid===first.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,enter,{actor:0});
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,false);
 assert.equal(s.pending.kind,'effect-outside-printed');
 const skip=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseOutsidePrinted',uid:null},{actor:0});
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].outside.some(c=>c.uid===second.uid),true);
 const again=legalUniversalActions(rezPacks,s).find(a=>a.type==='chooseOutsidePrinted'&&a.uid===second.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,again,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c?.uid===second.uid).ready,false);
 assert.equal(assertUniversalMatch(rezPacks,empty),true);
 assert.equal(assertUniversalMatch(rezPacks,skip),true);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
