import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
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
 // No more than four FINAL cards overall (official Q7). Test-only decks
 // must not starve late-ordered actual pilot cards after the allowlist grows.
 // Give every non-FINAL printed fixture at least three real physical copies.
 for(const c of cards)deck[c.id]=c.trigger==='final'?1:3;
 let remaining=50-Object.values(deck).reduce((a,b)=>a+b,0);
 if(remaining<0)throw Error('Test fixture requested too many mandatory copies');
 for(const c of cards.filter(c=>c.trigger!=='final'&&deck[c.id]<4)){
  if(!remaining)break;
  deck[c.id]++;remaining--;
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
 assert.deepEqual(REAL_V2_PILOT_IDS.bleach,[
  'BLC-1-034','BLC-1-036','BLC-1-037','BLC-1-039','BLC-1-040',
  'BLC-1-064','BLC-1-066','BLC-1-045','BLC-1-048',
  'BLC-1-052','BLC-1-057','BLC-1-102','BLC-1-103',
  'BLC-1-105','BLC-1-107'
 ]);
 assert.deepEqual(REAL_V2_PILOT_IDS['gurren-lagann'],['TTG-1-001','TTG-1-009','TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-045','TTG-1-046','TTG-1-047','TTG-1-049','TTG-1-052','TTG-1-051','TTG-1-042','TTG-1-043','TTG-1-066','TTG-1-064','TTG-1-065','TTG-1-072','TTG-1-073','TTG-1-078','TTG-1-079']);
 const b=verifiedPilotPack('bleach'),t=verifiedPilotPack('gurren-lagann');
 assert.equal(Object.keys(b.cards).length,15);
 assert.equal(Object.keys(t.cards).length,20);
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

test('real BLEACH Renji 105 optional -3000 BP can skip or sideline a TTG target at zero BP',()=>{
 const packs=[bleach.pack,green.pack];let s=fresh(green,399);
 // Advance both first turns so BLEACH has a legitimate two AP second turn.
 for(let i=0;i<8;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,2);
 const pl=s.players[0],foe=s.players[1];
 pl.energy[0]=take(s,0,'BLC-1-102');
 pl.energy[1]=take(s,0,'BLC-1-102');
 pl.energy[2]=take(s,0,'BLC-1-039');
 assert.equal(universalEnergyByColor(packs,s,0).purple,5);
 const renji=take(s,0,'BLC-1-105');pl.hand.push(renji);
 const first=take(s,1,'TTG-1-001'),second=take(s,1,'TTG-1-009');
 foe.front[0]=first;foe.front[1]=second;
 s=advanceToMain(packs,s);
 const actions=legalUniversalActions(packs,s);
 const played=actions.find(a=>a.type==='play'&&a.uid===renji.uid&&a.line==='front'&&a.slot===0);
 assert.ok(played);
 const state=dispatchUniversalAction(packs,s,played,{actor:0});
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,0,'real 2 AP cost paid');
 assert.equal(state.pending?.kind,'effect-target');
 assert.equal(state.pending?.optional,true);
 assert.equal(state.pending.player,0);
 const available=legalUniversalActions(packs,state);
 assert.ok(available.some(a=>a.type==='chooseTarget'&&a.uid===null),'optional ability may be declined');
 assert.ok(available.some(a=>a.uid===first.uid));
 assert.ok(available.some(a=>a.uid===second.uid));
 assert.ok(!available.some(a=>a.uid===renji.uid),'cannot choose our own card');
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseTarget',uid:renji.uid},{actor:0}),/not currently legal/);
 const skipped=dispatchUniversalAction(packs,state,{type:'chooseTarget',uid:null},{actor:0});
 assert.equal(skipped.players[1].front[0].uid,first.uid);
 const resolved=dispatchUniversalAction(packs,state,{type:'chooseTarget',uid:first.uid},{actor:0});
 assert.equal(resolved.players[1].front[0],null,'0 or less BP goes to sideline immediately');
 assert.ok(resolved.players[1].outside.some(c=>c.uid===first.uid));
 assert.equal(resolved.players[1].front[1].uid,second.uid);
 assert.equal(resolved.players[0].front[0].uid,renji.uid);
 assert.equal(state.players[1].front[0].uid,first.uid,'input pure');
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,resolved),true);
});

test('real BLEACH Getsugatensho 064 main effect requires BP<=3000 unless own Ichigo, then <=5000',()=>{
 const packs=[bleach.pack,green.pack];
 const prepare=withIchigo=>{
  let s=fresh(green,486);
  for(let i=0;i<8;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.active,0);
  const p=s.players[0],enemy=s.players[1];
  p.energy[0]=take(s,0,'BLC-1-102');p.energy[1]=take(s,0,'BLC-1-102');
  const card=take(s,0,'BLC-1-064');p.hand.push(card);
  const target=take(s,1,'TTG-1-001');enemy.front[0]=target;
  target.buffs=[{bp:2000,untilTurn:s.turn}]; // BP4000
  if(withIchigo)p.front[0]=take(s,0,'BLC-1-103');
  s=advanceToMain(packs,s);
  assert.equal(universalBp(packs,s,s.players[1].front[0]),4000);
  const effect=legalUniversalActions(packs,s).find(x=>x.type==='event'&&x.uid===card.uid);
  assert.ok(effect,'energy-4 purple event playable with 2x purple double-generator');
  return {s,target,effect};
 };
 const notEnough=prepare(false);
 const normal=dispatchUniversalAction(packs,notEnough.s,notEnough.effect,{actor:0});
 assert.equal(normal.pending,null,'BP4000 cannot be selected without Ichigo');
 assert.equal(normal.players[1].front[0].uid,notEnough.target.uid);
 const withBonus=prepare(true);
 const awaiting=dispatchUniversalAction(packs,withBonus.s,withBonus.effect,{actor:0});
 assert.equal(awaiting.pending?.kind,'effect-retire-bp');
 assert.equal(awaiting.pending.player,0);
 assert.equal(awaiting.pending.limit,5000);
 const valid=legalUniversalActions(packs,awaiting);
 assert.deepEqual(valid,[{type:'chooseRetireBp',uid:withBonus.target.uid}]);
 assert.throws(()=>dispatchUniversalAction(packs,awaiting,{type:'chooseRetireBp',uid:awaiting.players[0].front[0].uid},{actor:0}),/not currently legal/);
 const retired=dispatchUniversalAction(packs,awaiting,valid[0],{actor:0});
 assert.equal(retired.players[1].front[0],null);
 assert.ok(retired.players[1].outside.some(c=>c.uid===withBonus.target.uid));
 assert.equal(assertUniversalMatch(packs,retired),true);
});
test('real BLEACH Getsugatensho 064 SPECIAL life trigger ignores main effect BP limit and optional to use',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,499),p=s.players[0];
 const flipped=take(s,0,'BLC-1-064'),old=p.life.shift();
 p.deck.push(old);p.life.unshift(flipped);
 const attacker=take(s,1,'TTG-1-051');attacker.ready=true;
 attacker.buffs=[{bp:6000,untilTurn:5}];
 s.players[1].front[0]=attacker;
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.trigger,'special');
 const available=legalUniversalActions(packs,s);
 assert.ok(available.some(a=>a.mode==='skip'));
 const target=available.find(a=>a.mode==='special'&&a.uid===attacker.uid);
 assert.ok(target,'SPECIAL may target enemy over BP 5000');
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skipped.players[1].front[0].uid,attacker.uid);
 const fired=dispatchUniversalAction(packs,s,target,{actor:0});
 assert.equal(fired.players[1].front[0],null);
 assert.ok(fired.players[1].outside.some(c=>c.uid===attacker.uid));
 assert.equal(assertUniversalMatch(packs,fired),true);
});

test('real TTG Gurren 072: Raid Kamina, onPlay draw then optional REST only BP<=3000, own-turn +500',()=>{
 const packs=[bleach.pack,red.pack];let state=fresh(red,550);
 const takeHere=(owner,id)=>{
  const p=state.players[owner];
  for(const line of ['hand','deck','life','outside']){
   const index=p[line].findIndex(c=>c.cardId===id);
   if(index!==-1)return p[line].splice(index,1)[0];
  }
  throw Error('missing fixture '+owner+' '+id);
 };
 const kamina=takeHere(1,'TTG-1-042'),generator=takeHere(1,'TTG-1-042'),
  second=takeHere(1,'TTG-1-064'),third=takeHere(1,'TTG-1-065');
 state.players[1].front[0]=kamina;
 state.players[1].energy[0]=generator;
 state.players[1].energy[1]=second;
 state.players[1].energy[2]=third;
 const low=takeHere(0,'BLC-1-039'),high=takeHere(0,'BLC-1-105');
 low.ready=true;high.ready=true;
 state.players[0].front[0]=low;state.players[0].front[1]=high;
 const top=takeHere(1,'TTG-1-072');state.players[1].hand.push(top);
 // Player zero passes; the first player whose own turn it is earns the bonus.
 for(let i=0;i<4;i++)state=dispatchUniversalAction(packs,state,{type:'next'});
 assert.equal(state.active,1);
 state=advanceToMain(packs,state);
 assert.equal(universalEnergyByColor(packs,state,1).red,3);
 const raid=legalUniversalActions(packs,state).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===kamina.uid&&a.slot===0);
 assert.ok(raid,'real Kamina can be its Raid base');
 const apBefore=state.players[1].apCards.filter(x=>x.ready).length;
 const deckBefore=state.players[1].deck.length;
 const next=dispatchUniversalAction(packs,state,raid,{actor:1});
 assert.equal(next.players[1].apCards.filter(x=>x.ready).length,apBefore-1);
 assert.equal(next.players[1].front[0].uid,top.uid);
 assert.equal(next.players[1].front[0].stack[0].uid,kamina.uid);
 assert.equal(universalBp(packs,next,next.players[1].front[0]),4000,'active turn gains +500');
 assert.equal(next.players[1].deck.length,deckBefore-1,'onPlay draw happens before choosing REST target');
 assert.equal(next.pending?.kind,'effect-rest-bp');
 assert.deepEqual(legalUniversalActions(packs,next),[
  {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:low.uid}
 ]);
 assert.deepEqual(chooseUniversalAiAction(packs,next,{difficulty:'hard'}),{type:'chooseRestBp',uid:low.uid});
 assert.throws(()=>dispatchUniversalAction(packs,next,{type:'chooseRestBp',uid:high.uid},{actor:1}),/not currently legal/);
 const ignored=dispatchUniversalAction(packs,next,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(ignored.players[0].front[0].ready,true,'optional REST may be skipped');
 const rested=dispatchUniversalAction(packs,next,{type:'chooseRestBp',uid:low.uid},{actor:1});
 assert.equal(rested.players[0].front[0].ready,false);
 assert.equal(rested.players[0].front[1].ready,true);
 assert.equal(rested.pending,null);
 assert.equal(assertUniversalMatch(packs,rested),true);
 let offTurn=rested;
 for(let i=0;i<2;i++)offTurn=dispatchUniversalAction(packs,offTurn,{type:'next'});
 assert.equal(offTurn.active,0);
 assert.equal(universalBp(packs,offTurn,offTurn.players[1].front[0]),3500,
  '500 BP own-turn printed bonus expires when opponent turn starts');
});

test('real TTG Gurren 072 RAID life on opponent turn does not gain own-turn BP, but keeps REST choice',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,551);
 const takeHere=(owner,id)=>{
  for(const line of ['hand','deck','life','outside']){
   const a=s.players[owner][line],i=a.findIndex(c=>c.cardId===id);
   if(i!==-1)return a.splice(i,1)[0];
  }
  throw Error('missing fixture');
 };
 const attacker=takeHere(0,'BLC-1-039');attacker.ready=true;s.players[0].front[0]=attacker;
 const top=takeHere(1,'TTG-1-072'),old=s.players[1].life.shift();
 s.players[1].deck.push(old);s.players[1].life.unshift(top);
 const base=takeHere(1,'TTG-1-042');s.players[1].front[0]=base;
 for(const id of ['TTG-1-042','TTG-1-064','TTG-1-065']){
  const index=s.players[1].energy.findIndex(c=>!c);
  s.players[1].energy[index]=takeHere(1,id);
 }
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 const raid=legalUniversalActions(packs,s).find(a=>a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(raid,'RAID trigger legal with red energy 3 and Kamina base');
 const result=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(result.pending?.kind,'effect-rest-bp');
 assert.equal(universalBp(packs,result,result.players[1].front[0]),3500,'no +500 during opposing turn');
 assert.equal(result.pending.player,1,'rest target belongs to RAID controller');
 const choice=legalUniversalActions(packs,result).find(a=>a.uid===attacker.uid);
 assert.ok(choice);
 const settled=dispatchUniversalAction(packs,result,choice,{actor:1});
 assert.equal(settled.players[0].front[0].ready,false);
 assert.equal(settled.pending,null);
 assert.equal(assertUniversalMatch(packs,settled),true);
});

test('real TTG Kamina 045 COLOR trigger retires only an enemy front character BP<=2500, independently of its Raid-base ability',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,601),attacker=take(s,0,'BLC-1-039');
 attacker.ready=true;s.players[0].front[0]=attacker;
 const low=take(s,0,'BLC-1-107'),high=take(s,0,'BLC-1-103');
 s.players[0].front[1]=low;s.players[0].front[2]=high;
 const flipped=take(s,1,'TTG-1-045'),life=s.players[1].life;
 s.players[1].deck.push(life.shift());life.unshift(flipped);
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'color');
 const opts=legalUniversalActions(packs,s);
 assert.ok(opts.some(a=>a.mode==='skip'));
 assert.deepEqual(opts.filter(a=>a.mode==='colorRetire').map(a=>a.uid),[attacker.uid,low.uid]);
 assert.ok(!opts.some(a=>a.uid===high.uid),'3000 BP character must not be eligible');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorRetire',uid:high.uid},{actor:1}),/not currently legal/);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[0].front[1].uid,low.uid);
 const retired=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorRetire',uid:low.uid},{actor:1});
 assert.equal(retired.players[0].front[1],null);
 assert.ok(retired.players[0].outside.some(c=>c.uid===low.uid));
 assert.ok(retired.players[1].outside.some(c=>c.uid===flipped.uid));
 assert.equal(assertUniversalMatch(packs,retired),true);
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'colorRetire');
});
function raidKaminaFixture(seed=602,{faceDown=false}={}){
 const packs=[bleach.pack,red.pack];let s=fresh(red,seed);
 const base=take(s,1,'TTG-1-045'),redA=take(s,1,'TTG-1-042'),
  redB=take(s,1,'TTG-1-064'),redC=take(s,1,'TTG-1-065');
 s.players[1].front[0]=base;
 s.players[1].energy[0]=redA;s.players[1].energy[1]=redB;s.players[1].energy[2]=redC;
 let hidden=null;
 if(faceDown){
  hidden=s.players[1].deck.shift();hidden.faceDown=true;
  base.under.push(hidden);
 }
 const low=take(s,0,'BLC-1-039'),high=take(s,0,'BLC-1-105');
 low.ready=true;high.ready=true;
 s.players[0].front[0]=low;s.players[0].front[1]=high;
 const top=take(s,1,'TTG-1-072');s.players[1].hand.push(top);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 assert.equal(s.active,1);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(raid,'Kamima 045 is a legal base for TTG Gurren 072');
 const deckBefore=s.players[1].deck.length;
 return {packs,s,raid,top,base,low,high,hidden,deckBefore};
}
test('Kamina 045 as Raid base lets controller choose base-first; only own printed trait characters get BP+1000',()=>{
 const {packs,s,raid,top,base,low,high,deckBefore}=raidKaminaFixture(602);
 const original=structuredClone(s);
 const begun=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(begun.pending?.kind,'raid-effect-order');
 assert.equal(begun.pending.player,1);
 assert.deepEqual(legalUniversalActions(packs,begun),[
  {type:'chooseRaidOrder',mode:'baseFirst'},{type:'chooseRaidOrder',mode:'entryFirst'}
 ]);
 assert.deepEqual(chooseUniversalAiAction(packs,begun,{difficulty:'hard'}),
  {type:'chooseRaidOrder',mode:'entryFirst'});
 const first=dispatchUniversalAction(packs,begun,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:1});
 assert.equal(first.pending?.kind,'effect-buff-trait');
 assert.equal(first.players[1].deck.length,deckBefore,'top entry draw must wait for base effect');
 const choices=legalUniversalActions(packs,first);
 assert.ok(choices.some(a=>a.uid===null),'buff at most one may skip');
 assert.ok(choices.some(a=>a.uid===top.uid),'the new Raid has the 大グレン団 trait');
 assert.ok(!choices.some(a=>a.uid===low.uid||a.uid===high.uid),
  'enemy BLEACH characters cannot be chosen');
 assert.throws(()=>dispatchUniversalAction(packs,first,{type:'chooseTraitBuff',uid:low.uid},{actor:1}),/not currently legal/);
 const boosted=dispatchUniversalAction(packs,first,{type:'chooseTraitBuff',uid:top.uid},{actor:1});
 assert.equal(universalBp(packs,boosted,boosted.players[1].front[0]),5000,
  'Raid 3500 + own turn 500 + base buff 1000');
 assert.equal(boosted.players[1].deck.length,deckBefore-1,'after base ability top onPlay draws one');
 assert.equal(boosted.pending?.kind,'effect-rest-bp');
 const afterRest=dispatchUniversalAction(packs,boosted,{type:'chooseRestBp',uid:low.uid},{actor:1});
 assert.equal(afterRest.players[0].front[0].ready,false);
 assert.equal(afterRest.players[1].front[0].stack[0].uid,base.uid);
 assert.equal(assertUniversalMatch(packs,afterRest),true);
 assert.deepEqual(s,original);
});
test('Kamina 045 as Raid base supports entry-first and optional skip of printed base buff',()=>{
 const {packs,s,raid,top,low,deckBefore}=raidKaminaFixture(605);
 const begun=dispatchUniversalAction(packs,s,raid,{actor:1});
 const entry=dispatchUniversalAction(packs,begun,{type:'chooseRaidOrder',mode:'entryFirst'},{actor:1});
 assert.equal(entry.pending?.kind,'effect-rest-bp','onPlay draw then REST choice must occur before base buff');
 assert.equal(entry.players[1].deck.length,deckBefore-1);
 const skipRest=dispatchUniversalAction(packs,entry,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(skipRest.pending?.kind,'effect-buff-trait');
 const skipBuff=dispatchUniversalAction(packs,skipRest,{type:'chooseTraitBuff',uid:null},{actor:1});
 assert.equal(skipBuff.pending,null);
 assert.equal(universalBp(packs,skipBuff,skipBuff.players[1].front[0]),4000);
 assert.equal(skipBuff.players[0].front[0].uid,low.uid);
 assert.equal(skipBuff.players[0].front[0].ready,true);
 assert.equal(assertUniversalMatch(packs,skipBuff),true);
});
test('Kamina 045 conditional Raid-base draw occurs only when a physical facedown card is under the Raider',()=>{
 const {packs,s,raid,top,hidden,deckBefore}=raidKaminaFixture(609,{faceDown:true});
 const begun=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.ok(hidden.faceDown);
 const first=dispatchUniversalAction(packs,begun,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:1});
 assert.equal(first.pending?.kind,'effect-buff-trait');
 const afterBuff=dispatchUniversalAction(packs,first,{type:'chooseTraitBuff',uid:null},{actor:1});
 assert.equal(afterBuff.pending?.kind,'effect-rest-bp');
 assert.equal(afterBuff.players[1].deck.length,deckBefore-2,
  'face-down under base draws 1, then Gurren onPlay draws 1');
 assert.equal(afterBuff.players[1].front[0].stack[0].under[0].uid,hidden.uid);
 assert.equal(universalPublicView(packs,afterBuff,0).players[1].front[0].raidDepth,1);
 assert.ok(!JSON.stringify(universalPublicView(packs,afterBuff,0)).includes(hidden.uid),
  'opponent public model must hide underlying facedown identity');
 const stopped=dispatchUniversalAction(packs,afterBuff,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(assertUniversalMatch(packs,stopped),true);
});
test('Kamina 045 onRaided effects never trigger from RAID life on the opponent turn',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,620);
 const attacker=take(s,0,'BLC-1-039');attacker.ready=true;s.players[0].front[0]=attacker;
 const base=take(s,1,'TTG-1-045'),g1=take(s,1,'TTG-1-042'),
  g2=take(s,1,'TTG-1-064'),g3=take(s,1,'TTG-1-065');
 s.players[1].front[0]=base;
 s.players[1].energy[0]=g1;s.players[1].energy[1]=g2;s.players[1].energy[2]=g3;
 const top=take(s,1,'TTG-1-072'),life=s.players[1].life;
 s.players[1].deck.push(life.shift());life.unshift(top);
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 const raid=legalUniversalActions(packs,s).find(a=>a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(raid);
 const raided=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(raided.pending?.kind,'effect-rest-bp',
  'defender Raid must skip own-turn-only Kamina base effect');
 const after=dispatchUniversalAction(packs,raided,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(after.pending,null);
 assert.equal(universalBp(packs,after,after.players[1].front[0]),3500);
 assert.equal(assertUniversalMatch(packs,after),true);
});

function kamina046Match(seed=700,{copies=2,raid=true}={}){
 const packs=[bleach.pack,red.pack];let s=fresh(red,seed);
 const p=s.players[1],back=take(s,1,'TTG-1-042');
 p.front[0]=back;
 const kamina=[];
 for(let i=0;i<copies;i++){
  const c=take(s,1,'TTG-1-046');
  p.front[1+i]=c;kamina.push(c);
 }
 for(const [slot,id] of ['TTG-1-042','TTG-1-064','TTG-1-065'].entries())
  p.energy[slot]=take(s,1,id);
 const top=take(s,1,'TTG-1-072');
 p.hand.push(top);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 s=advanceToMain(packs,s);
 // Record real REST state after START refresh; the first option must restore
 // the real field instance rather than arbitrarily giving a second card ACTIVE.
 for(const c of kamina)s.players[1].front.find(x=>x?.uid===c.uid).ready=false;
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'),
  'an unfulfilled own-turn Raid prerequisite blocks all active main effects');
 if(raid){
  const choice=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===back.uid);
  assert.ok(choice,'printed Kamina 042 is a legal Raid base');
  s=dispatchUniversalAction(packs,s,choice,{actor:1});
  assert.equal(s.pending,null);
  assert.equal(s.raidedThisTurn[1],true);
 }
 return {packs,s,kamina,top};
}
test('real TTG Kamina 046: Q2288 two DIFFERENT modes, Q2289 printed READY before target BP+1000',()=>{
 const {packs,s,kamina,top}=kamina046Match(700);
 const before=structuredClone(s),c=kamina[0];
 const legal=legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.uid===c.uid);
 assert.deepEqual(legal.map(a=>a.mode),['ready','readyAndBuff','buff']);
 const readyAndBuff=legal.find(a=>a.mode==='readyAndBuff');
 const choice=dispatchUniversalAction(packs,s,readyAndBuff,{actor:1});
 assert.equal(choice.pending?.kind,'main-two-buff');
 assert.equal(choice.players[1].front[1].ready,true,'first printed READY mode is completed before choosing a BP target');
 assert.deepEqual(choice.mainReadyOnceByName[1],['カミナ']);
 assert.deepEqual(choice.mainAbilityUsedUids,[c.uid]);
 assert.equal(choice.players[1].front[0].uid,top.uid);
 assert.equal(universalBp(packs,choice,choice.players[1].front[0]),4000);
 const targets=legalUniversalActions(packs,choice);
 assert.ok(targets.some(a=>a.uid===top.uid));
 assert.ok(!targets.some(a=>a.uid===s.players[0].hand[0].uid));
 assert.throws(()=>dispatchUniversalAction(packs,choice,{type:'chooseMainBuff',uid:s.players[0].hand[0].uid},{actor:1}),/not currently legal/);
 const applied=dispatchUniversalAction(packs,choice,{type:'chooseMainBuff',uid:top.uid},{actor:1});
 assert.equal(applied.pending,null);
 assert.equal(universalBp(packs,applied,applied.players[1].front[0]),5000);
 assert.ok(!legalUniversalActions(packs,applied).some(a=>a.type==='activate'&&a.uid===c.uid),
  'same physical card cannot activate twice this turn');
 assert.equal(assertUniversalMatch(packs,applied),true);
 assert.deepEqual(s,before);
});
test('Q2290 READY selection is shared by printed NAME across multiple 046 copies, BP option remains usable',()=>{
 const {packs,s,kamina,top}=kamina046Match(706);
 const [first,second]=kamina;
 const restored=dispatchUniversalAction(packs,s,{type:'activate',uid:first.uid,mode:'ready'},{actor:1});
 assert.equal(restored.players[1].front[1].ready,true);
 const allowed=legalUniversalActions(packs,restored).filter(a=>a.type==='activate'&&a.uid===second.uid);
 assert.deepEqual(allowed,[{type:'activate',uid:second.uid,mode:'buff'}]);
 assert.throws(()=>dispatchUniversalAction(packs,restored,
  {type:'activate',uid:second.uid,mode:'readyAndBuff'},{actor:1}),/not currently legal/);
 const secondUsed=dispatchUniversalAction(packs,restored,allowed[0],{actor:1});
 assert.equal(secondUsed.players[1].front[2].ready,false,'buff-only mode does not silently ACTIVE another copy');
 const target=legalUniversalActions(packs,secondUsed).find(a=>a.uid===top.uid);
 assert.ok(target);
 const result=dispatchUniversalAction(packs,secondUsed,target,{actor:1});
 assert.equal(universalBp(packs,result,result.players[1].front[0]),5000);
 assert.equal(result.mainReadyOnceByName[1].length,1);
 assert.equal(result.mainAbilityUsedUids.length,2);
 assert.ok(!legalUniversalActions(packs,result).some(a=>a.type==='activate'&&kamina.some(c=>c.uid===a.uid)));
 assert.equal(assertUniversalMatch(packs,result),true);
});
test('046 BP option has NO per-name restriction, and does not consume the READY option across copies',()=>{
 const {packs,s,kamina,top}=kamina046Match(709);
 const buff=dispatchUniversalAction(packs,s,{type:'activate',uid:kamina[0].uid,mode:'buff'},{actor:1});
 assert.deepEqual(buff.mainReadyOnceByName[1],[]);
 const applied=dispatchUniversalAction(packs,buff,{type:'chooseMainBuff',uid:top.uid},{actor:1});
 assert.equal(universalBp(packs,applied,applied.players[1].front[0]),5000);
 const more=legalUniversalActions(packs,applied);
 assert.ok(more.some(a=>a.type==='activate'&&a.uid===kamina[1].uid&&a.mode==='readyAndBuff'));
 const ready=dispatchUniversalAction(packs,applied,{type:'activate',uid:kamina[1].uid,mode:'readyAndBuff'},{actor:1});
 assert.equal(ready.players[1].front[2].ready,true);
 const result=dispatchUniversalAction(packs,ready,{type:'chooseMainBuff',uid:top.uid},{actor:1});
 assert.equal(universalBp(packs,result,result.players[1].front[0]),6000);
 assert.equal(assertUniversalMatch(packs,result),true);
});
test('046 needs same-controller Raid THIS turn; opponent cannot borrow another title Raid, reset between turns',()=>{
 const {packs,s,kamina,top}=kamina046Match(720,{raid:false});
 assert.equal(s.raidedThisTurn[1],false);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:kamina[0].uid,mode:'buff'},{actor:1}),/not currently legal/);
 let raided=dispatchUniversalAction(packs,s,
  legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid),{actor:1});
 assert.ok(legalUniversalActions(packs,raided).some(a=>a.type==='activate'));
 for(let i=0;i<6;i++)raided=dispatchUniversalAction(packs,raided,{type:'next'});
 assert.equal(raided.active,1);
 assert.equal(raided.phase,'start');
 assert.deepEqual(raided.raidedThisTurn,[false,false]);
 assert.deepEqual(raided.mainReadyOnceByName,[[],[]]);
 assert.deepEqual(raided.mainAbilityUsedUids,[]);
});
test('046 normal GET life trigger puts the revealed card in hand; not an onRaided or main activation',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,728);
 const attacker=take(s,0,'BLC-1-039');attacker.ready=true;s.players[0].front[0]=attacker;
 const flipped=take(s,1,'TTG-1-046');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(flipped);
 s=advanceToMain(packs,s);s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.trigger,'get');
 const taken=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(taken.players[1].hand.some(c=>c.uid===flipped.uid));
 assert.equal(taken.raidedThisTurn[1],false);
 assert.equal(assertUniversalMatch(packs,taken),true);
});

function real073Chain(seed=970,{withSimon=true,performChain=true}={}){
 const packs=[bleach.pack,red.pack];let s=fresh(red,seed);
 const kamina=take(s,1,'TTG-1-042');
 s.players[1].front[0]=kamina;
 const resources=['TTG-1-045','TTG-1-064','TTG-1-065','TTG-1-051'];
 for(const [i,id] of resources.entries())s.players[1].energy[i]=take(s,1,id);
 if(!withSimon){
  const simon=s.players[1].energy[3];
  s.players[1].energy[3]=take(s,1,'TTG-1-045');
  s.players[1].outside.push(simon);
 }
 const first=take(s,1,'TTG-1-072'),second=take(s,1,'TTG-1-073');
 s.players[1].hand.push(first,second);
 const low=take(s,0,'BLC-1-039'),high=take(s,0,'BLC-1-105');
 low.ready=true;high.ready=true;
 s.players[0].front[0]=low;s.players[0].front[1]=high;
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 assert.equal(s.active,1);
 const firstRaid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===first.uid&&a.baseUid===kamina.uid);
 assert.ok(firstRaid);
 s=dispatchUniversalAction(packs,s,firstRaid,{actor:1});
 assert.equal(s.pending?.kind,'effect-rest-bp');
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0].uid,first.uid);
 assert.equal(universalEnergyByColor(packs,s,1).red,4);
 if(performChain){
  const chain=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===first.uid);
  if(withSimon)assert.ok(chain,'TTG073 must chain only if Kamina+Simon are on field or Raid bases');
  else assert.equal(chain,undefined,'TTG073 must fail absent printed Simon prerequisite');
  if(chain)s=dispatchUniversalAction(packs,s,chain,{actor:1});
 }
 return {packs,s,kamina,first,second,low,high};
}
test('real TTG073 cannot Raid without BOTH named Simon and Kamina (even with valid prior Gurren base)',()=>{
 const {packs,s,second,first}=real073Chain(975,{withSimon:false});
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===first.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'raid',uid:second.uid,baseUid:first.uid,slot:0},{actor:1}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('real TTG073 chains on TTG072 preserving Kamina, old Gurren face-down, conditional 5000 BP + optional retirement',()=>{
 const {packs,s,first,second,kamina,low,high}=real073Chain(976);
 assert.equal(s.players[1].front[0].uid,second.uid);
 assert.equal(s.players[1].front[0].stack[0].uid,kamina.uid);
 assert.equal(s.players[1].front[0].stack[0].under[0].uid,first.uid);
 assert.equal(s.players[1].front[0].stack[0].under[0].faceDown,true);
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),[null,low.uid,high.uid]);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),5000,'BP4000+1000 only while facedown under');
 const source=structuredClone(s);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:null},{actor:1});
 assert.equal(skipped.players[0].front[1].uid,high.uid);
 const retired=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:high.uid},{actor:1});
 assert.equal(retired.players[0].front[1],null);
 assert.ok(retired.players[0].outside.some(c=>c.uid===high.uid));
 assert.equal(retired.pending,null);
 assert.ok(!JSON.stringify(universalPublicView(packs,retired,0)).includes(first.uid));
 assert.equal(assertUniversalMatch(packs,retired),true);
 assert.deepEqual(s,source);
});
test('real TTG073 IMPACT(1) deals extra life only after winning a blocked battle, never just for direct attack',()=>{
 const {packs,s,second,low}=real073Chain(977);
 let battle=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:null},{actor:1});
 const defender=battle.players[0],lifeCard=take(battle,0,'BLC-1-107');
 defender.deck.push(defender.life.shift());defender.life.unshift(lifeCard);
 const before=defender.life.length;
 battle=dispatchUniversalAction(packs,battle,{type:'next'});
 assert.equal(battle.phase,'attack');
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:second.uid},{actor:1});
 assert.equal(battle.pending?.kind,'block');
 const won=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:low.uid},{actor:0});
 assert.equal(won.players[0].front[0],null);
 assert.equal(won.players[0].life.length,before-1,'IMPACT must follow defeated blocker and hit life');
 assert.equal(won.publicReveals.at(-1).cardId,'BLC-1-107');
 assert.equal(assertUniversalMatch(packs,won),true);
});
test('real TTG073 BP500+ optional facedown replacement preserves the Raided character, using an actual beneath-card',()=>{
 const {packs,s,second,first}=real073Chain(978);
 let before=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:null},{actor:1});
 // Pass the rest of the current turn and set up a higher BP opposing attacker.
 before=dispatchUniversalAction(packs,before,{type:'next'});
 before=dispatchUniversalAction(packs,before,{type:'next'});
 assert.equal(before.active,0);before=advanceToMain(packs,before);
 const enemy=before.players[0].front[1];
 assert.ok(enemy);
 enemy.buffs.push({bp:3000,untilTurn:before.turn});
 enemy.ready=true;
 before=dispatchUniversalAction(packs,before,{type:'next'});
 before=dispatchUniversalAction(packs,before,{type:'attack',uid:enemy.uid},{actor:0});
 const choice=legalUniversalActions(packs,before).find(a=>a.type==='chooseBlock'&&a.uid===second.uid);
 assert.ok(choice);
 const pending=dispatchUniversalAction(packs,before,choice,{actor:1});
 assert.equal(pending.pending?.kind,'leave-replacement');
 assert.equal(pending.pending.player,1);
 assert.deepEqual(legalUniversalActions(packs,pending),[
  {type:'chooseLeaveReplacement',mode:'protect'},
  {type:'chooseLeaveReplacement',mode:'leave'}
 ]);
 const protectedGame=dispatchUniversalAction(packs,pending,{type:'chooseLeaveReplacement',mode:'protect'},{actor:1});
 assert.equal(protectedGame.players[1].front[0].uid,second.uid);
 assert.ok(protectedGame.players[1].outside.some(c=>c.uid===first.uid));
 assert.equal(protectedGame.players[1].front[0].stack[0].under.length,0);
 assert.equal(universalBp(packs,protectedGame,protectedGame.players[1].front[0]),4000);
 assert.equal(assertUniversalMatch(packs,protectedGame),true);
 const left=dispatchUniversalAction(packs,pending,{type:'chooseLeaveReplacement',mode:'leave'},{actor:1});
 assert.equal(left.players[1].front[0],null);
 assert.ok(left.players[1].outside.some(c=>c.uid===second.uid));
 assert.ok(left.players[1].outside.some(c=>c.uid===first.uid));
 assert.equal(assertUniversalMatch(packs,left),true);
});

test('real TTG073 direct Raid on Simon without facedown underlying gains NO conditional +1000, retirement or IMPACT',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,982);
 const simon=take(s,1,'TTG-1-051'),kamina=take(s,1,'TTG-1-042');
 s.players[1].front[0]=simon;s.players[1].energy[0]=kamina;
 for(const [slot,id] of ['TTG-1-045','TTG-1-064','TTG-1-065'].entries())
  s.players[1].energy[slot+1]=take(s,1,id);
 const second=take(s,1,'TTG-1-073'),blocker=take(s,0,'BLC-1-039');
 blocker.ready=true;s.players[0].front[0]=blocker;s.players[1].hand.push(second);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===simon.uid);
 assert.ok(raid,'Simon is a printed alternative base while Kamina is in energy');
 s=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(s.pending,null,'no facedown under means conditional onPlay retirement does not trigger');
 assert.equal(universalBp(packs,s,s.players[1].front[0]),4000);
 assert.equal(s.players[1].front[0].stack[0].uid,simon.uid);
 assert.equal(s.players[1].front[0].stack[0].under.length,0);
 const lifeBefore=s.players[0].life.length;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:second.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:0});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].life.length,lifeBefore,'without facedown there is no IMPACT');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('official Q2298 underlying facedown card identity is inspectable by owner but hidden from opposing-title viewer',()=>{
 const {packs,s,first,kamina}=real073Chain(983);
 const opponent=universalPublicView(packs,s,0);
 const owner=universalPublicView(packs,s,1);
 assert.equal(opponent.players[1].front[0].raidLayers[0].uid,kamina.uid);
 const protectedPublic=opponent.players[1].front[0].raidLayers[0].under[0];
 assert.deepEqual(protectedPublic,{faceDown:true});
 const ownPrivate=owner.players[1].front[0].raidLayers[0].under[0];
 assert.equal(ownPrivate.uid,first.uid);
 assert.equal(ownPrivate.cardId,'TTG-1-072');
 assert.equal(ownPrivate.faceDown,true);
 assert.ok(!JSON.stringify(opponent).includes(first.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict V2 rejects missing or inconsistent double Raid base and conditional under-card metadata',()=>{
 const known=portVerifiedPilotCard('gurren-lagann','TTG-1-073');
 assert.deepEqual(known.raidBaseNames,['シモン','カミナ']);
 assert.deepEqual(known.raidRequiresNames,['シモン','カミナ']);
 assert.deepEqual(known.raidFromRaid,['ラガン','グレン']);
 assert.deepEqual(known.conditionalUnderFaceDown,{bp:1000,impact:1,leaveReplacementMinBp:500});
 const bad={...known,raidBaseNames:['カミナ','カミナ']};
 assert.throws(()=>createUniversalPack({id:'bad-raid',cards:[bad]}),/invalid alternative Raid bases/);
 const missing={...known,raidRequiresNames:['シモン',null]};
 assert.throws(()=>createUniversalPack({id:'bad-requirement',cards:[missing]}),/invalid named Raid prerequisite/);
 const malformed={...known,conditionalUnderFaceDown:{bp:1000,impact:2,leaveReplacementMinBp:500}};
 assert.throws(()=>createUniversalPack({id:'bad-impact',cards:[malformed]}),/unsupported facedown under-card profile/);
});

test('real TTG073 RAID life on opposing turn chains existing Gurren and preserves its optional onPlay target prompt',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,994);
 const attacker=take(s,0,'BLC-1-039');attacker.ready=true;s.players[0].front[0]=attacker;
 const base=take(s,1,'TTG-1-042');s.players[1].front[0]=base;
 for(const [slot,id] of ['TTG-1-051','TTG-1-045','TTG-1-064','TTG-1-065'].entries())
  s.players[1].energy[slot]=take(s,1,id);
 const gurren=take(s,1,'TTG-1-072');s.players[1].hand.push(gurren);
 const revealed=take(s,1,'TTG-1-073');
 s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(revealed);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===gurren.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(s.pending?.kind,'effect-rest-bp');
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 s=advanceToMain(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.trigger,'raid');
 const possible=legalUniversalActions(packs,s);
 assert.ok(possible.some(a=>a.mode==='skip'));
 assert.ok(possible.some(a=>a.mode==='get'));
 const chain=possible.find(a=>a.mode==='raid'&&a.baseUid===gurren.uid);
 assert.ok(chain);
 const liferaid=dispatchUniversalAction(packs,s,chain,{actor:1});
 assert.equal(liferaid.pending?.kind,'effect-retire-bp','onPlay choice must survive parent life trigger');
 assert.equal(liferaid.pending.player,1);
 assert.equal(liferaid.players[1].front[0].uid,revealed.uid);
 assert.equal(liferaid.players[1].front[0].stack[0].under[0].uid,gurren.uid);
 assert.equal(universalBp(packs,liferaid,liferaid.players[1].front[0]),5000);
 const choice=legalUniversalActions(packs,liferaid).find(a=>a.uid===attacker.uid);
 assert.ok(choice);
 const fired=dispatchUniversalAction(packs,liferaid,choice,{actor:1});
 assert.equal(fired.players[0].front[0],null);
 assert.ok(fired.players[0].outside.some(c=>c.uid===attacker.uid));
 assert.equal(fired.pending,null);
 assert.equal(assertUniversalMatch(packs,fired),true);
});

test('hard V2 AI activates TTG073 optional BP5000 retirement rather than declining while enemy is eligible',()=>{
 const {packs,s,low,high}=real073Chain(1007);
 assert.equal(s.pending?.kind,'effect-retire-bp');
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal[0].uid,null,'the effect remains optional');
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.type,'chooseRetireBp');
 assert.equal(ai.uid,high.uid,'strongest eligible BLEACH defender is preferred');
 const acted=dispatchUniversalAction(packs,s,ai,{actor:1});
 assert.equal(acted.players[0].front[1],null);
 assert.equal(acted.players[0].front[0].uid,low.uid);
 assert.equal(assertUniversalMatch(packs,acted),true);
});
test('TTG073 multi-facedown leave substitute lets owner choose precise UID without disclosing hidden cards',()=>{
 const {packs,s:initial,second,first,high}=real073Chain(1008);
 let s=dispatchUniversalAction(packs,initial,{type:'chooseRetireBp',uid:null},{actor:1});
 const extra=take(s,1,'TTG-1-064');
 extra.faceDown=true;
 s.players[1].front[0].stack[0].under.push(extra);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 s=advanceToMain(packs,s);
 const attacker=s.players[0].front.find(c=>c?.uid===high.uid);
 attacker.buffs.push({bp:3000,untilTurn:s.turn});
 attacker.ready=true;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:second.uid},{actor:1});
 assert.equal(s.pending?.kind,'leave-replacement');
 const options=legalUniversalActions(packs,s);
 assert.deepEqual(options,[
  {type:'chooseLeaveReplacement',mode:'protect',uid:first.uid},
  {type:'chooseLeaveReplacement',mode:'protect',uid:extra.uid},
  {type:'chooseLeaveReplacement',mode:'leave'}
 ]);
 assert.ok(!JSON.stringify(universalPublicView(packs,s,0)).includes(extra.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseLeaveReplacement',mode:'protect'},{actor:1}),/not currently legal/);
 const before=structuredClone(s);
 const chosen=dispatchUniversalAction(packs,s,options[1],{actor:1});
 assert.equal(chosen.players[1].front[0].uid,second.uid);
 assert.equal(chosen.players[1].front[0].stack[0].under.length,1);
 assert.equal(chosen.players[1].front[0].stack[0].under[0].uid,first.uid);
 assert.ok(chosen.players[1].outside.some(c=>c.uid===extra.uid));
 const consumed=chosen.zoneMoveEvents.filter(e=>e.uid===extra.uid&&e.reason==='protection');
 assert.equal(consumed.length,1);
 assert.equal(consumed[0].attachedToUid,s.players[1].front[0].stack[0].uid);
 assert.equal(consumed[0].sourceUid,second.uid);
 assert.equal(consumed[0].wasFaceDown,true);
 assert.deepEqual(consumed[0].identityViewersBefore,[1]);
 assert.equal(chosen.turnRetireEvents.some(e=>e.uid===extra.uid),false);

 assert.equal(universalBp(packs,chosen,chosen.players[1].front[0]),5000);
 assert.equal(assertUniversalMatch(packs,chosen),true);
 assert.deepEqual(s,before,'no mutation of prior pending match');
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.deepEqual(ai,options[0],'hard AI can resolve a multi-choice replacement without a fabricated action');
 const declined=dispatchUniversalAction(packs,s,options[2],{actor:1});
 assert.equal(declined.players[1].front[0],null);
 assert.ok(declined.players[1].outside.some(c=>c.uid===first.uid));
 assert.ok(declined.players[1].outside.some(c=>c.uid===extra.uid));
 assert.equal(assertUniversalMatch(packs,declined),true);
});
test('facdown substitute with an attached nested undercard sidelines all nested UID objects without loss',()=>{
 const {packs,s:initial,second,high}=real073Chain(1010);
 let s=dispatchUniversalAction(packs,initial,{type:'chooseRetireBp',uid:null},{actor:1});
 const nested=take(s,1,'TTG-1-064');
 nested.faceDown=true;
 const child=take(s,1,'TTG-1-065');
 nested.under=[child];
 s.players[1].front[0].stack[0].under.push(nested);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 const attacker=s.players[0].front.find(c=>c?.uid===high.uid);
 attacker.buffs.push({bp:3000,untilTurn:s.turn});
 attacker.ready=true;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:second.uid},{actor:1});
 assert.equal(s.pending.kind,'leave-replacement');
 const chosen=legalUniversalActions(packs,s).find(a=>a.uid===nested.uid);
 assert.ok(chosen);
 const result=dispatchUniversalAction(packs,s,chosen,{actor:1});
 assert.ok(result.players[1].outside.some(c=>c.uid===nested.uid));
 assert.ok(result.players[1].outside.some(c=>c.uid===child.uid));
 assert.equal(assertUniversalMatch(packs,result),true);
});

function real045Chain(seed=2286){
 const packs=[bleach.pack,red.pack];let s=fresh(red,seed);
 const base=take(s,1,'TTG-1-045');
 s.players[1].front[0]=base;
 for(const [i,id] of ['TTG-1-042','TTG-1-051','TTG-1-064','TTG-1-065'].entries())
  s.players[1].energy[i]=take(s,1,id);
 const first=take(s,1,'TTG-1-072'),second=take(s,1,'TTG-1-073');
 s.players[1].hand.push(first,second);
 const low=take(s,0,'BLC-1-039');low.ready=true;s.players[0].front[0]=low;
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 assert.equal(s.active,1);
 assert.equal(universalEnergyByColor(packs,s,1).red,4);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===first.uid&&a.baseUid===base.uid);
 assert.ok(raid,'TTG072 raids the printed Kamina TTG045');
 const deckAtRaid=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(s.pending?.kind,'raid-effect-order');
 assert.equal(s.players[1].deck.length,deckAtRaid,'045 has no facedown yet, so its draw waits');
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:1});
 assert.equal(s.pending?.kind,'effect-buff-trait');
 s=dispatchUniversalAction(packs,s,{type:'chooseTraitBuff',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.equal(s.players[1].deck.length,deckAtRaid-1,'072 on-play draw only');
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(s.pending,null);
 return {packs,s,base,first,second,deckAtChain:s.players[1].deck.length};
}
test('official Q2286 TTG045 onRaided still activates when TTG073 chains over raided TTG072',()=>{
 const {packs,s:ready,base,first,second,deckAtChain}=real045Chain(2286);
 const chain=legalUniversalActions(packs,ready).find(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===first.uid);
 assert.ok(chain);
 let s=dispatchUniversalAction(packs,ready,chain,{actor:1});
 assert.equal(s.pending?.kind,'raid-effect-order','Q2286: 045 when-raided is queued again');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.mode),['baseFirst','entryFirst']);
 assert.equal(s.players[1].front[0].stack[0].uid,base.uid);
 assert.equal(s.players[1].front[0].stack[0].under[0].uid,first.uid);
 assert.equal(s.players[1].front[0].stack[0].under[0].faceDown,true);
 const entryFirst=dispatchUniversalAction(packs,s,{type:'chooseRaidOrder',mode:'entryFirst'},{actor:1});
 assert.equal(entryFirst.pending?.kind,'effect-retire-bp');
 const afterEntry=dispatchUniversalAction(packs,entryFirst,{type:'chooseRetireBp',uid:null},{actor:1});
 assert.equal(afterEntry.pending?.kind,'effect-buff-trait','entry-first still reaches 045');
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:1});
 assert.equal(s.pending?.kind,'effect-buff-trait');
 assert.equal(s.players[1].deck.length,deckAtChain);
 s=dispatchUniversalAction(packs,s,{type:'chooseTraitBuff',uid:null},{actor:1});
 assert.equal(s.players[1].deck.length,deckAtChain-1,'facedown under the original base satisfies 045 draw');
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('official Q2287 owner sees the facedown under TTG045 and the opponent does not',()=>{
 const {packs,s:ready,first,second}=real045Chain(2287);
 let s=dispatchUniversalAction(packs,ready,
  legalUniversalActions(packs,ready).find(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===first.uid),{actor:1});
 const opponent=universalPublicView(packs,s,0);
 const owner=universalPublicView(packs,s,1);
 assert.deepEqual(opponent.players[1].front[0].raidLayers[0].under[0],{faceDown:true});
 assert.equal(owner.players[1].front[0].raidLayers[0].under[0].cardId,'TTG-1-072');
 assert.equal(owner.players[1].front[0].raidLayers[0].under[0].uid,first.uid);
 assert.ok(!JSON.stringify(opponent).includes(first.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('official Q2396 TTG073 chains onto a Gurren whose buried base is Simon, and rejects any other buried name',()=>{
 const packs=[bleach.pack,red.pack];let s=fresh(red,2396);
 const simon=take(s,1,'TTG-1-051'),kamina=take(s,1,'TTG-1-042'),kitten=take(s,1,'TTG-1-047');
 const onSimon=take(s,1,'TTG-1-072'),onKitten=take(s,1,'TTG-1-072'),lagann=take(s,1,'TTG-1-073');
 onSimon.stack=[simon];onSimon.ready=true;
 onKitten.stack=[kitten];onKitten.ready=true;
 s.players[1].front[0]=onSimon;
 s.players[1].front[1]=onKitten;
 s.players[1].energy[0]=kamina;
 for(const [i,id] of ['TTG-1-045','TTG-1-064','TTG-1-065'].entries())
  s.players[1].energy[i+1]=take(s,1,id);
 s.players[1].hand.push(lagann);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=advanceToMain(packs,s);
 const raids=legalUniversalActions(packs,s).filter(a=>a.type==='raid'&&a.uid===lagann.uid);
 assert.ok(raids.some(a=>a.baseUid===onSimon.uid),'Simon buried under Gurren is a Q2396 chain base');
 assert.ok(!raids.some(a=>a.baseUid===onKitten.uid),'another buried name stays illegal while Simon and Kamina exist elsewhere');
 assert.equal(assertUniversalMatch(packs,s),true);
});
