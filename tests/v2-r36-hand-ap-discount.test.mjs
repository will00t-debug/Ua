import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {DISCOUNT_KIND,handPlayApPlan,validatePrintedPlayFilter} from '../dist/universal-v2/ap-discounts.mjs';
const filter={cardType:'character',printedGenAtLeast:2};
const deck=Object.fromEntries(['001','002','010','012','013','016','017','046','050','059','063','055'].map(n=>['MST-1-'+n,4]));deck['MST-1-057']=2;
const take=(s,id)=>{for(const z of ['hand','deck','life']){const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);};
function scene(f=filter){
 const pack=structuredClone(registeredV2TitlePack('mushoku-tensei'));
 pack.cards['MST-1-059'].effects={onPlay:[{op:DISCOUNT_KIND,filter:f}]};
 let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:36001});
 for(let i=0;i<3;i++){const c=take(s,'MST-1-050');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;}
 const source=take(s,'MST-1-059');s.players[0].hand.push(source);
 s=dispatchUniversalAction(pack,s,{type:'next'});s=dispatchUniversalAction(pack,s,{type:'next'});
 for(const ap of s.players[0].apCards){ap.ready=true;ap.inPlay=true;}
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.uid===source.uid&&a.type==='play'&&a.line==='front'));
 return {pack,s,source};
}
const play=(pack,s,uid)=>legalUniversalActions(pack,s).find(a=>a.uid===uid&&a.type==='play'&&a.line==='front');
test('R36 next eligible hand use uses existing AP payer once and retains discount for ineligible use',()=>{
 let {pack,s}=scene();const other=take(s,'MST-1-050');s.players[0].hand.push(other);
 s=dispatchUniversalAction(pack,s,play(pack,s,other.uid));assert.equal(s.continuousStates.length,1);
 const c=take(s,'MST-1-046');s.players[0].hand.push(c);
 for(const ap of s.players[0].apCards)ap.ready=false;
 const a=play(pack,s,c.uid);assert.ok(a);
 const before=structuredClone(s);s=dispatchUniversalAction(pack,s,a);
 assert.equal(s.continuousStates.length,0);assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(before.continuousStates.length,1);assert.throws(()=>dispatchUniversalAction(pack,s,a));
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R36 forged UID, unpaid energy and wrong actor reject atomically, Human/Normal/Hard share actions',()=>{
 const {pack,s}=scene();const before=structuredClone(s);
 for(const a of [{type:'play',uid:'0-999',line:'front',slot:1},{type:'play',uid:s.players[0].energy[0].uid,line:'front',slot:1}])assert.throws(()=>dispatchUniversalAction(pack,s,a));
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'next'},{actor:1}));assert.deepEqual(s,before);
 for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(pack,s).some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(pack,s,{difficulty}))));
});
test('R36 printed BP/gen filtering ignores physical buffs and never yields negative AP',()=>{
 const {pack,s}=scene({cardType:'character',printedBp:3000});
 const d=pack.cards['MST-1-059'];assert.equal(handPlayApPlan(s,0,d).cost,0);
 assert.equal(handPlayApPlan(s,0,{...d,bp:2500}).cost,1);
 assert.equal(handPlayApPlan(s,0,{...d,ap:0}).cost,0);
 assert.equal(handPlayApPlan(s,1,d).cost,1);
 for(const f of [{printedGenAtLeast:-1},{liveBp:3500},{trait:''},{cardType:'ap'},{}])assert.throws(()=>validatePrintedPlayFilter(f));
});
test('R36 Q670 overlapping next-use discounts all consume on one matching play',()=>{
 let {pack,s}=scene();const second=take(s,'MST-1-059');s.players[0].hand.push(second);
 s=dispatchUniversalAction(pack,s,play(pack,s,second.uid));assert.equal(s.continuousStates.length,2);
 const target=take(s,'MST-1-046');s.players[0].hand.push(target);
 assert.equal(handPlayApPlan(s,0,pack.cards[target.cardId]).cost,0);
 s=dispatchUniversalAction(pack,s,play(pack,s,target.uid));assert.equal(s.continuousStates.length,0);
});
test('R36 save rejects forged source, expiry, consumed state and selectors',()=>{
 const {pack,s}=scene();assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 for(const patch of [{sourceUid:'1-1'},{sourceUid:'0-999'},{sourceCardId:'MST-1-001'},{turn:s.turn+1},{consumed:true},{sourceStamp:0},{filter:{cardType:'event'}},{until:{player:1,phase:'attack',edge:'end'}}]){
  const bad=structuredClone(s);Object.assign(bad.continuousStates[0],patch);assert.throws(()=>assertUniversalMatch(pack,bad),JSON.stringify(patch));
 }
 assert.ok(!JSON.stringify(universalPublicView(pack,s,1)).includes('nextEligibleHandPlayApDiscount'));
});
test('R36 unused discount expires at current turn end',()=>{
 let {pack,s}=scene();s=dispatchUniversalAction(pack,s,{type:'next'});s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.continuousStates.length,0);
});
test('R36 eligible printed card with insufficient required energy does not consume the discount',()=>{
 const {pack,s}=scene();const c=take(s,'MST-1-046');s.players[0].hand.push(c);
 const producer=s.players[0].energy[0];s.players[0].energy[0]=null;s.players[0].deck.push(producer);
 const before=structuredClone(s);assert.ok(!play(pack,s,c.uid));
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'play',uid:c.uid,line:'front',slot:1}));assert.deepEqual(s,before);
});
