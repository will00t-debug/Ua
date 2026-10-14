import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {portVerifiedPilotCard,REAL_V2_PILOT_IDS,verifiedPilotCards,verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalEnergyByColor,assertUniversalMatch,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// These real-card pilots remain incomplete; test-only filler is never an official 50-card V2 deck.
// real deck. Filler is strictly TEST-ONLY, never exported from the pilot.
function withSyntheticFiller(title,{color}={}){
 const real=verifiedPilotCards(title).filter(c=>!color||c.color===color);
 const actualColor=color||real[0].color;
 const synthetic=Array.from({length:16-real.length},(_,i)=>({
  id:'TEST-ONLY-'+title+'-'+actualColor+'-'+i,
  name:'Test fixture '+i,color:actualColor,type:'character',
  energy:i%3,ap:1,bp:1500+(i%4)*500,gen:1,implementation:'vanilla'
 }));
 const cards=[...real,...synthetic];
 const deck=Object.fromEntries(cards.map(c=>[c.id,0]));
 // No more than four FINAL triggers across all distinct card IDs (official Q7).
 for(const c of cards.filter(c=>c.trigger==='final'))deck[c.id]=1;
 let remaining=50-Object.values(deck).reduce((a,b)=>a+b,0);
 for(const c of cards.filter(c=>c.trigger!=='final')){
  const copies=Math.min(4,remaining);deck[c.id]=copies;remaining-=copies;
 }
 assert.equal(remaining,0,'test fixture has enough non-FINAL filler');
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
 assert.deepEqual(REAL_V2_PILOT_IDS.bleach,['BLC-1-034','BLC-1-039','BLC-1-066','BLC-1-102','BLC-1-103','BLC-1-107']);
 assert.deepEqual(REAL_V2_PILOT_IDS['gurren-lagann'],['TTG-1-001','TTG-1-009','TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-051','TTG-1-042','TTG-1-064','TTG-1-065','TTG-1-078','TTG-1-079']);
 const b=verifiedPilotPack('bleach'),t=verifiedPilotPack('gurren-lagann');
 assert.equal(Object.keys(b.cards).length,6);
 assert.equal(Object.keys(t.cards).length,11);
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

test('real red TTG Kamina 042 ACTIVE trigger may be declined or target an already REST own character',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,229);
 const attacker=take(s,0,'BLC-1-039');attacker.ready=true;s.players[0].front[0]=attacker;
 const defender=take(s,1,'TTG-1-065');defender.ready=false;s.players[1].front[0]=defender;
 const flip=take(s,1,'TTG-1-042'),previous=s.players[1].life.shift();
 s.players[1].deck.push(previous);s.players[1].life.unshift(flip);
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending.trigger,'active');
 assert.equal(s.publicReveals.at(-1).title,'gurren-lagann');
 const available=legalUniversalActions(packs,s);
 assert.ok(available.some(a=>a.mode==='skip'));
 assert.ok(available.some(a=>a.mode==='active'&&a.uid===defender.uid));
 assert.ok(!available.some(a=>a.uid===attacker.uid));
 const rejected=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(rejected.players[1].front[0].ready,false);
 const resolved=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:defender.uid},{actor:1});
 assert.equal(resolved.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,resolved,resolved.players[1].front[0]),5500);
 assert.equal(assertUniversalMatch(packs,resolved),true);
});
test('real red TTG Yoko 064 DRAW trigger uses separate optional draw path',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,239);
 const attacker=take(s,0,'BLC-1-039');attacker.ready=true;s.players[0].front[0]=attacker;
 const flip=take(s,1,'TTG-1-064'),previous=s.players[1].life.shift();
 s.players[1].deck.push(previous);s.players[1].life.unshift(flip);
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.trigger,'draw');
 const before=s.players[1].hand.length;
 const yes=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 const no=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(yes.players[1].hand.length,before+1);
 assert.equal(no.players[1].hand.length,before);
 assert.equal(assertUniversalMatch(packs,yes),true);
 assert.equal(assertUniversalMatch(packs,no),true);
});
test('real BLEACH Urahara 102 generates two PURPLE, never funds RED cards; its ACTIVE trigger targets own BLEACH',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,241);
 const resource=take(s,0,'BLC-1-102');s.players[0].energy[0]=resource;
 const target=take(s,0,'BLC-1-039');target.ready=false;s.players[0].front[0]=target;
 const flip=take(s,0,'BLC-1-102'),old=s.players[0].life.shift();
 s.players[0].deck.push(old);s.players[0].life.unshift(flip);
 const attacker=take(s,1,'TTG-1-051');attacker.ready=true;s.players[1].front[0]=attacker;
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 assert.equal(universalEnergyByColor(packs,s,0).red,undefined);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.trigger,'active');
 const result=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:target.uid},{actor:0});
 assert.equal(universalBp(packs,result,result.players[0].front[0]),4500);
 assert.equal(result.players[0].front[0].ready,true);
 assert.equal(assertUniversalMatch(packs,result),true);
});
test('real TTG Yoko 065 STEP moves from front to energy in own movement phase only',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,256);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const stepper=take(s,1,'TTG-1-065');s.players[1].front[0]=stepper;
 assert.equal(verifiedPilotPack('gurren-lagann').cards['TTG-1-065'].step,true);
 assert.equal(s.phase,'start');
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'move');
 const action=legalUniversalActions(packs,s).find(x=>x.type==='step'&&x.uid===stepper.uid&&x.slot===0);
 assert.ok(action);
 const next=dispatchUniversalAction(packs,s,action,{actor:1});
 assert.equal(next.players[1].front[0],null);
 assert.equal(next.players[1].energy[0].uid,stepper.uid);
 assert.ok(!legalUniversalActions(packs,next).some(x=>x.type==='move'&&x.uid===stepper.uid),
  'movement is simultaneous, this STEP card cannot move twice');
 assert.equal(assertUniversalMatch(packs,next),true);
});

function playApEvent(other,owner,eventId,seed){
 const packs=[bleach.pack,other.pack];let s=fresh(other,seed);
 if(owner===1){
  for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
  // Real second-player first-turn EXTRA DRAW consumes one of two available APs.
  s=dispatchUniversalAction(packs,s,{type:'extraDraw'});
 }
 const p=s.players[owner],color=owner===0?'purple':other===green?'green':'red';
 const generatorIds=owner===0?['BLC-1-102','BLC-1-039']:color==='green'?
  ['TTG-1-009','TTG-1-009','TTG-1-009']:
  ['TTG-1-042','TTG-1-064','TTG-1-065'];
 generatorIds.forEach((id,index)=>{p.energy[index]=take(s,owner,id);});
 const event=take(s,owner,eventId);p.hand.push(event);
 s=advanceToMain(packs,s);
 const actions=legalUniversalActions(packs,s);
 const use=actions.find(x=>x.type==='event'&&x.uid===event.uid);
 assert.ok(use,eventId+' should be payable with correct title-color energy');
 const before=structuredClone(s),effect=dispatchUniversalAction(packs,s,use,{actor:owner});
 assert.equal(effect.pending?.kind,'effect-recover-ap');
 assert.equal(effect.pending.player,owner);
 assert.ok(effect.players[owner].outside.some(c=>c.uid===event.uid));
 assert.deepEqual(before.players[owner].hand, s.players[owner].hand);
 return {packs,owner,before,event,effect};
}
test('real BLEACH Bankai 066 spends its only first-turn AP, cannot recover AP not yet in play',()=>{
 const {packs,owner,effect}=playApEvent(green,0,'BLC-1-066',250);
 assert.equal(effect.players[0].apCards.filter(a=>a.inPlay).length,1);
 const legal=legalUniversalActions(packs,effect);
 assert.equal(legal.length,2,'skip or restore the one AP actually in play');
 const inactiveFuture=effect.players[0].apCards.filter(a=>!a.inPlay).map(a=>a.uid);
 assert.ok(!legal.some(a=>inactiveFuture.includes(a.uid)));
 const skip=dispatchUniversalAction(packs,effect,{type:'chooseApRecovery',uid:null},{actor:owner});
 assert.equal(skip.players[0].apCards.filter(a=>a.ready).length,0);
 const recover=dispatchUniversalAction(packs,effect,legal.find(a=>a.uid!==null),{actor:owner});
 assert.equal(recover.players[0].apCards.filter(a=>a.ready).length,1);
 assert.equal(recover.pending,null);
 assert.equal(assertUniversalMatch(packs,recover),true);
 assert.equal(assertUniversalMatch(packs,skip),true);
});
test('official green/red TTG FINAL events all use one shared 0-to-2 AP selection resolver',()=>{
 for(const [other,id,seed] of [
  [green,'TTG-1-036',262],[green,'TTG-1-037',263],[green,'TTG-1-038',264],
  [red,'TTG-1-078',265],[red,'TTG-1-079',266]
 ]){
  const {packs,effect}=playApEvent(other,1,id,seed);
  const ready=effect.players[1].apCards.filter(a=>a.ready);
  assert.equal(ready.length,0,'extra draw plus event used both AP');
  let legal=legalUniversalActions(packs,effect);
  assert.equal(legal.length,3,'skip or restore either of two APs');
  const first=legal.find(a=>a.uid!==null);
  let state=dispatchUniversalAction(packs,effect,first,{actor:1});
  assert.equal(state.pending.kind,'effect-recover-ap');
  assert.equal(state.players[1].apCards.filter(a=>a.ready).length,1);
  legal=legalUniversalActions(packs,state);
  assert.ok(!legal.some(a=>a.uid===first.uid),'the same AP cannot be recovered twice');
  const choose=legal.find(a=>a.uid!==null);
  state=dispatchUniversalAction(packs,state,choose,{actor:1});
  assert.equal(state.players[1].apCards.filter(a=>a.ready).length,2);
  assert.equal(state.pending,null);
  assert.equal(assertUniversalMatch(packs,state),true);
  const declined=dispatchUniversalAction(packs,effect,{type:'chooseApRecovery',uid:null},{actor:1});
  assert.equal(declined.players[1].apCards.filter(a=>a.ready).length,0,id);
  assert.equal(assertUniversalMatch(packs,declined),true);
 }
});
test('FINAL on an actual red TTG event restores last life even when its main effect is AP recovery',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,300);
 const attacker=take(s,0,'BLC-1-039');
 attacker.ready=true;s.players[0].front[0]=attacker;
 const last=take(s,1,'TTG-1-078'),p=s.players[1];
 p.outside.push(...p.life.splice(0));p.life.unshift(last);
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.trigger,'final');
 assert.equal(s.status,'playing');
 assert.equal(s.publicReveals.at(-1).cardId,'TTG-1-078');
 const activated=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 assert.equal(activated.status,'playing');
 assert.equal(activated.players[1].life.length,1);
 assert.equal(activated.players[1].outside.some(c=>c.uid===last.uid),true);
 const declined=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(declined.status,'finished');
 assert.equal(declined.winner,0);
 assert.equal(assertUniversalMatch(packs,activated),true);
});

test('real TTG Viral 001 peeks only own top card: keep top or move to outside, no opponent leak',()=>{
 const packs=[bleach.pack,green.pack];let s=fresh(green,355);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 const viral=take(s,1,'TTG-1-001');s.players[1].hand.push(viral);
 const top=s.players[1].deck[0].uid;
 const original=structuredClone(s);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===viral.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);
 const pending=dispatchUniversalAction(packs,s,action,{actor:1});
 assert.equal(pending.pending?.kind,'private-top-choice');
 assert.equal(pending.pending.player,1);
 assert.equal(pending.players[1].deck[0].uid,top);
 const visibleToOpponent=universalPublicView(packs,pending,0);
 assert.equal(visibleToOpponent.pending.kind,'private-top-choice');
 assert.ok(!JSON.stringify(visibleToOpponent).includes(top),'private top card UID hidden from opponent');
 const choices=legalUniversalActions(packs,pending);
 assert.deepEqual(choices.map(a=>a.mode),['top','outside']);
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseTopCard',mode:'hand'},{actor:1}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,pending,choices[0],{actor:0}),/Wrong player/);
 const kept=dispatchUniversalAction(packs,pending,choices[0],{actor:1});
 assert.equal(kept.players[1].deck[0].uid,top);
 assert.equal(kept.pending,null);
 const sidelined=dispatchUniversalAction(packs,pending,choices[1],{actor:1});
 assert.ok(sidelined.players[1].outside.some(c=>c.uid===top));
 assert.equal(sidelined.players[1].deck.length,kept.players[1].deck.length-1);
 assert.equal(sidelined.publicReveals.length,0,'deck look is not a public life reveal');
 assert.deepEqual(s,original,'normal play must not mutate source before dispatch');
 assert.equal(assertUniversalMatch(packs,kept),true);
 assert.equal(assertUniversalMatch(packs,sidelined),true);
});
