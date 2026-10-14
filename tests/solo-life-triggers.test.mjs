import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingDispatch,soloTrainingLegalActions,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
const base=()=>{const s=newSoloTrainingMatch({decks:[SOLO_TRAINING_PRESET,SOLO_TRAINING_PRESET],seed:2345,first:0});s.phase='attack';return s;};
const take=(p,id)=>{for(const zone of ['hand','deck','life']){const i=p[zone].findIndex(c=>c.cardId===id);if(i>=0)return p[zone].splice(i,1)[0];}throw Error('missing '+id);};
function setupTrigger(triggerCardId){
 const s=base(),attacker=take(s.players[0],'SLG-1-045');
 Object.assign(attacker,{owner:0,line:'front',slot:0,ready:true});s.players[0].front[0]=attacker;
 const defender=s.players[1],special=take(defender,triggerCardId);
 const old=defender.life[0];defender.life[0]=special;defender.deck.push(old);
 assertSoloTrainingMatch(s);return {s,attacker,defender,triggerUid:special.uid};
}
test('COLOR trigger from life allows defender own legal hand/slot; AP cost not charged',()=>{
 let {s,attacker}=setupTrigger('SLG-1-067');
 const p=s.players[1],c=take(p,'SLG-1-045');p.hand.push(c);
 const ap=p.ap;s=soloTrainingDispatch(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'colorTrigger');assert.equal(s.pending.p,1);
 const actions=soloTrainingLegalActions(s);assert.ok(actions.some(a=>a.uid===c.uid&&a.line==='front'));
 const selected=actions.find(a=>a.uid===c.uid&&a.line==='front');
 assert.throws(()=>soloTrainingDispatch(s,{type:'choose',uid:'forged',line:'front',slot:0}),/illegal/);
 s=soloTrainingDispatch(s,selected);assert.equal(s.players[1].front[selected.slot].uid,c.uid);
 assert.equal(s.players[1].front[selected.slot].ready,true);
 assert.equal(s.players[1].ap,ap);assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('SPECIAL trigger retires chosen attacker; extra AP target protections cannot be bypassed',()=>{
 let {s,attacker}=setupTrigger('SLG-1-067');
 // Replace trigger card identity in an isolated trigger fixture; 076 is not yet legal to include in a match deck.
 s.players[1].life[0].cardId='SLG-1-076';
 s=soloTrainingDispatch(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'specialTrigger');
 const chosen=soloTrainingLegalActions(s).find(a=>a.uid===attacker.uid);assert.ok(chosen);
 s=soloTrainingDispatch(s,chosen);
 assert.ok(s.players[0].outside.some(c=>c.uid===attacker.uid));assert.equal(s.pending,null);
 assertSoloTrainingMatch(s);
 let second=setupTrigger('SLG-1-067');second.s.players[1].life[0].cardId='SLG-1-076';
 second.s.players[0].front[0].extraTargetAp=1;
 second.s.players[1].ap=0;second.s.players[1].maxAp=0;
 let protectedState=soloTrainingDispatch(second.s,{type:'attack',uid:second.attacker.uid});
 assert.equal(protectedState.pending,null);
 assert.ok(protectedState.players[0].front[0]);
 assertSoloTrainingMatch(protectedState);
});
test('FINAL trigger replenishes empty life from top deck, and never creates a new card',()=>{
 let {s,attacker}=setupTrigger('SLG-1-067');
 const p=s.players[1];p.life[0].cardId='SLG-1-079';
 for(const old of p.life.slice(1))p.outside.push(old);
 p.life=p.life.slice(0,1);
 const previousDeck=p.deck.length;
 s=soloTrainingDispatch(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'soloOptionalLife');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.mode==='final'));
 s=soloTrainingDispatch(s,{type:'choose',mode:'final'});
 assert.equal(s.players[1].life.length,1);assert.equal(s.players[1].deck.length,previousDeck-1);
 assertSoloTrainingMatch(s);
});
