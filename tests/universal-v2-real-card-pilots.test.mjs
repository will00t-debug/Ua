import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {portVerifiedPilotCard,REAL_V2_PILOT_IDS,verifiedPilotCards,verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// The real pilot has 4 BLEACH and 2 TTG profiles, NOT a complete 50-card
// real deck. Filler is strictly TEST-ONLY, never exported from the pilot.
function withSyntheticFiller(title,{color}={}){
 const real=verifiedPilotCards(title).filter(c=>!color||c.color===color);
 const actualColor=color||real[0].color;
 const synthetic=Array.from({length:13-real.length},(_,i)=>({
  id:'TEST-ONLY-'+title+'-'+actualColor+'-'+i,
  name:'Test fixture '+i,color:actualColor,type:'character',
  energy:i%3,ap:1,bp:1500+(i%4)*500,gen:1,implementation:'vanilla'
 }));
 const cards=[...real,...synthetic];
 const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===cards.length-1?2:4]));
 const pack=createUniversalPack({id:title,cards,version:'synthetic-mixed-test-only'});
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 return {pack,deck,realIds:real.map(c=>c.id)};
}
const bleach=withSyntheticFiller('bleach');
const green=withSyntheticFiller('gurren-lagann',{color:'green'});
const red=withSyntheticFiller('gurren-lagann',{color:'red'});
function fresh(other=green,seed=7){
 return newUniversalMatch([bleach.pack,other.pack],{decks:[bleach.deck,other.deck],seed,first:0});
}
function take(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw Error('Missing physical fixture '+id);
}
function advanceToMain(packs,s){
 while(s.phase!=='main'){
  const a=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(a);s=dispatchUniversalAction(packs,s,a);
 }
 return s;
}
function testEntry(other,owner,id){
 const packs=[bleach.pack,other.pack];
 let s=fresh(other,13);
 if(owner===1){
  // Advance the first player's complete turn without using any hidden zones.
  for(let n=0;n<4;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 s=advanceToMain(packs,s);
 const selected=take(s,owner,id);s.players[owner].hand.push(selected);
 const previousDeck=s.players[owner].deck.length;
 const choices=legalUniversalActions(packs,s);
 const play=choices.find(a=>a.type==='play'&&a.uid===selected.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,id+' has an actual legal ordinary hand deployment');
 const after=dispatchUniversalAction(packs,s,play,{actor:owner});
 assert.equal(after.pending?.kind,'effect-discard');
 assert.equal(after.pending.player,owner,'discard belongs to the real-card controller');
 assert.equal(after.players[owner].deck.length,previousDeck-1);
 assert.ok(after.players[owner].front[0]?.uid===selected.uid);
 const possible=legalUniversalActions(packs,after);
 assert.ok(possible.length>0);
 assert.ok(possible.every(a=>a.type==='chooseDiscard'));
 assert.throws(()=>dispatchUniversalAction(packs,after,{type:'chooseDiscard',uid:'enemy-0'}),/not currently legal/);
 const selectedDiscard=possible[0];
 const result=dispatchUniversalAction(packs,after,selectedDiscard,{actor:owner});
 assert.ok(result.players[owner].outside.some(c=>c.uid===selectedDiscard.uid));
 assert.equal(result.pending,null);
 assert.equal(assertUniversalMatch(packs,result),true);
 assert.equal(assertUniversalMatch(packs,after),true,'input unchanged');
 return result;
}
test('official-record pilot cards have explicitly pinned printed energy/AP/BP/trigger and no implicit support',()=>{
 assert.deepEqual(REAL_V2_PILOT_IDS.bleach,['BLC-1-034','BLC-1-039','BLC-1-103','BLC-1-107']);
 assert.deepEqual(REAL_V2_PILOT_IDS['gurren-lagann'],['TTG-1-009','TTG-1-051']);
 const b=verifiedPilotPack('bleach'),t=verifiedPilotPack('gurren-lagann');
 assert.equal(Object.keys(b.cards).length,4);
 assert.equal(Object.keys(t.cards).length,2);
 assert.ok(validateUniversalDeck(b,bleach.deck).length>0,'V2 real-only deck is not ready');
 assert.ok(validateUniversalDeck(t,green.deck).length>0);
 for(const id of REAL_V2_PILOT_IDS.bleach)assert.ok(portVerifiedPilotCard('bleach',id));
 for(const id of REAL_V2_PILOT_IDS['gurren-lagann'])assert.ok(portVerifiedPilotCard('gurren-lagann',id));
 assert.throws(()=>portVerifiedPilotCard('bleach','BLC-1-104'),/not explicitly verified/);
 assert.throws(()=>portVerifiedPilotCard('gurren-lagann','TTG-1-074'),/not explicitly verified/);
 assert.throws(()=>verifiedPilotCards('unknown'),/Unknown pilot/);
});
test('real BLEACH Ishida 034 on-entry draws one then prompts owned discard in cross-title game',()=>{
 testEntry(green,0,'BLC-1-034');
});
test('real green TTG Simon 009 uses same printed draw/discard shared resolver',()=>{
 testEntry(green,1,'TTG-1-009');
});
test('real red TTG Simon 051 uses same effect while preserving RED title-specific deck',()=>{
 testEntry(red,1,'TTG-1-051');
});
test('real BLEACH Ichigo 103 BP +1000 only on attack, even against TTG characters',()=>{
 let s=fresh(green,111),attacker=take(s,0,'BLC-1-103');
 s.players[0].front[0]=attacker;attacker.ready=true;
 const packs=[bleach.pack,green.pack];
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3000);
 const attacked=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(universalBp(packs,attacked,attacked.players[0].front[0]),4000);
 assert.equal(attacked.pending?.kind,'block');
 const blocker=take(attacked,1,'TTG-1-009');
 attacked.players[1].front[0]=blocker;blocker.ready=true;
 const blocked=dispatchUniversalAction(packs,attacked,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(blocked.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,blocked),true);
 const view=universalPublicView(packs,blocked,0);
 assert.equal(view.players[0].front[0].bp,4000);
 assert.equal(view.players[1].title,'gurren-lagann');
});
test('real BLEACH Ichigo 039 GET trigger is resolved through the TTG-opponent shared combat core',()=>{
 let s=fresh(green,117),p=s.players[0],attacker=take(s,1,'TTG-1-009');
 const revealed=take(s,0,'BLC-1-039'),old=p.life.shift();
 p.deck.push(old);p.life.unshift(revealed);
 s.players[1].front[0]=attacker;attacker.ready=true;
 const packs=[bleach.pack,green.pack];
 // Player 0 completes turn to put TTG in charge.
 for(let n=0;n<4;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'}); // attack
 let state=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(state.pending?.kind,'life-trigger');
 assert.equal(state.pending.trigger,'get');
 assert.equal(state.publicReveals.at(-1).title,'bleach');
 const action=legalUniversalActions(packs,state).find(a=>a.mode==='get');
 const resolved=dispatchUniversalAction(packs,state,action,{actor:0});
 assert.ok(resolved.players[0].hand.some(c=>c.uid===revealed.uid));
 assert.equal(assertUniversalMatch(packs,resolved),true);
});
