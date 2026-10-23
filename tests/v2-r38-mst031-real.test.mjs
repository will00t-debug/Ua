import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalImpact,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {handPlayApPlan} from '../dist/universal-v2/ap-discounts.mjs';
const pack=registeredV2TitlePack('mushoku-tensei'),packs=[pack,pack],id='MST-1-031';
const ids=['MST-1-031','MST-1-001','MST-1-002','MST-1-003','MST-1-004','MST-1-013','MST-1-015','MST-1-016','MST-1-017','MST-1-020','MST-1-023','MST-1-034','MST-1-027'];
const deck=Object.fromEntries(ids.map((x,i)=>[x,i===12?2:4]));assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const take=(s,id)=>{for(const z of ['hand','deck','life','outside']){const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);};
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function scene(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:38031});
 const source=take(s,id),event=take(s,'MST-1-034'),ordinary=take(s,'MST-1-003');
 s.players[0].hand.push(source,event,ordinary);
 for(let i=0;i<4;i++){const p=take(s,'MST-1-001');p.ready=true;p.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=p;}
 s=act(s,{type:'next'});s=act(s,{type:'next'});
 const use=legalUniversalActions(packs,s).find(a=>a.uid===source.uid&&a.type==='play'&&a.line==='front');
 assert.ok(use,'four printed blue 1 generators pay necessary 4');
 s=act(s,use);
 assert.equal(s.pending,null);
 const front=s.players[0].front.find(c=>c?.uid===source.uid);assert.ok(front);
 return {s,source,front,event,ordinary};
}
test('R38 MST-031 strict full printed official Raid, Impact-null + own-turn EVENT Impact and hand EVENT AP discount',()=>{
 const d=pack.cards[id];
 assert.deepEqual([d.name,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger,d.raidName,d.impactNull],['ロキシー','blue',4,1,4000,1,'raid','ロキシー',true]);
 assert.deepEqual(d.passiveBonuses,[{condition:{kind:'ownEventUsedThisTurn',turn:'own'},impact:1}]);
 assert.deepEqual(d.effects.onPlay,[{op:'nextEligibleHandPlayApDiscount',filter:{cardType:'event',printedRequiredEnergyAtMost:3}}]);
});
test('R38 MST-031 no phantom Impact, actual successful EVENT changes impact, correct AP & physical provenance',()=>{
 let {s,front,event,ordinary}=scene();
 assert.equal(universalImpact(packs,s,front),0);
 assert.equal(s.continuousStates.filter(x=>x.kind==='nextEligibleHandPlayApDiscount').length,1);
 assert.equal(handPlayApPlan(s,0,pack.cards[event.cardId]).cost,0);
 assert.equal(handPlayApPlan(s,0,pack.cards[ordinary.cardId]).cost,1);
 assert.equal(handPlayApPlan(s,0,{...pack.cards[event.cardId],energy:4}).cost,1);
 const before=structuredClone(s);
 assert.throws(()=>act(s,{type:'event',uid:'0-999'}));assert.deepEqual(s,before);
 assert.equal(universalImpact(packs,s,front),0);
 const allowed=legalUniversalActions(packs,s),use=allowed.find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(use);
 for(const difficulty of ['normal','hard'])assert.ok(allowed.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 s=act(s,use);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===event.uid&&e.owner===0&&e.controller===0&&e.from==='hand'&&e.to==='outside'&&e.reason==='rule'&&e.turn===s.turn));
 assert.equal(universalImpact(packs,s,front),1);
 assert.equal(s.continuousStates.filter(x=>x.kind==='nextEligibleHandPlayApDiscount').length,0);
 const otherTurn=structuredClone(s);otherTurn.active=1;
 assert.equal(universalImpact(packs,otherTurn,front),0);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 assert.ok(!JSON.stringify(universalPublicView(packs,s,1)).includes('nextEligibleHandPlayApDiscount'));
});
test('R38 non EVENT card cannot consume discount or activate Impact; AP is not fabricated',()=>{
 let {s,front,ordinary}=scene();
 assert.equal(handPlayApPlan(s,0,pack.cards[ordinary.cardId]).cost,1);
 assert.equal(universalImpact(packs,s,front),0);
 assert.equal(s.continuousStates.filter(x=>x.kind==='nextEligibleHandPlayApDiscount').length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
