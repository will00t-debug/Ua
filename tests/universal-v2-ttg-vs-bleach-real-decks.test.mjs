import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck,TTG_RED_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

const red=verifiedTtgRedPilotDeck(),bleach=verifiedBleachPurplePilotDeck();
const packs=[red.pack,bleach.pack];
const counts=[red.counts,bleach.counts];
const fresh=(seed=404,first=0)=>newUniversalMatch(packs,{decks:counts,seed,first});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const items=s.players[p][zone],at=items.findIndex(c=>c.cardId===id);
  if(at!==-1)return items.splice(at,1)[0];
 }
 throw Error('Cannot find official physical card '+p+' '+id);
}
function toPhase(s,phase){
 for(let i=0;s.phase!==phase&&i<6;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);return s;
}
const legal=s=>legalUniversalActions(packs,s);

test('first ALL-REAL 50-card TTG RED deck is correctly source-validated, 13 real IDs and zero fake fillers',()=>{
 assert.equal(Object.keys(TTG_RED_V2_PILOT_COUNTS).length,13);
 assert.equal(Object.values(red.counts).reduce((a,b)=>a+b,0),50);
 assert.deepEqual(validateUniversalDeck(red.pack,red.counts),[]);
 assert.ok(Object.keys(red.counts).every(id=>id.startsWith('TTG-1-')&&
  !id.includes('TEST')&&red.pack.cards[id]?.color==='red'));
 assert.equal(red.counts['TTG-1-073'],2);
 assert.equal(red.counts['TTG-1-045'],4);
 assert.equal(Object.entries(red.counts).filter(([id])=>
  ['special','color','final'].includes(red.pack.cards[id].trigger))
  .reduce((sum,[,n])=>sum+n,0),4);
 assert.equal(assertUniversalMatch(packs,fresh()),true);
});

test('TTG-1-047 gets BP+1500 only when it is the FIRST own character attack of that turn',()=>{
 let s=fresh(47);
 const first=take(s,0,'TTG-1-047'),second=take(s,0,'TTG-1-047');
 first.ready=true;second.ready=true;
 s.players[0].front[0]=first;s.players[0].front[1]=second;
 s=toPhase(s,'attack');
 assert.equal(s.attacksThisTurn,0);
 const q=dispatchUniversalAction(packs,s,{type:'attack',uid:first.uid},{actor:0});
 assert.equal(q.attacksThisTurn,1);
 assert.equal(universalBp(packs,q,q.players[0].front[0]),3000);
 assert.equal(q.pending.kind,'block');
 let d=dispatchUniversalAction(packs,q,{type:'chooseBlock',uid:null},{actor:1});
 // The defending BLEACH life flip can open a trigger choice.
 while(d.pending?.kind==='life-trigger'){
  const skip=legal(d).find(a=>a.mode==='skip');assert.ok(skip);
  d=dispatchUniversalAction(packs,d,skip,{actor:1});
 }
 assert.equal(d.status,'playing');
 const again=dispatchUniversalAction(packs,d,{type:'attack',uid:second.uid},{actor:0});
 assert.equal(again.attacksThisTurn,2);
 assert.equal(universalBp(packs,again,again.players[0].front[1]),1500,
  'second character attack cannot receive first-attack boost');
 assert.equal(assertUniversalMatch(packs,again),true);
});

test('TTG-1-049 mandatory return of another own energy<=1 character, ignoring enemy or own expensive units',()=>{
 let s=fresh(490);
 const generator=take(s,0,'TTG-1-042'),other=take(s,0,'TTG-1-045');
 const high=take(s,0,'TTG-1-046'),source=take(s,0,'TTG-1-049');
 generator.ready=true;s.players[0].energy[0]=generator;
 other.ready=false;s.players[0].front[1]=other;
 high.ready=false;s.players[0].front[2]=high;
 s.players[0].hand.push(source);
 s=toPhase(s,'main');
 const a=legal(s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);const q=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(q.pending.kind,'effect-bounce-own');
 assert.equal(q.pending.player,0);
 assert.ok(legal(q).every(x=>x.type==='chooseOwnBounce'));
 assert.ok(legal(q).some(x=>x.uid===generator.uid));
 assert.ok(legal(q).some(x=>x.uid===other.uid));
 assert.ok(!legal(q).some(x=>x.uid===high.uid||x.uid===source.uid));
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.ok(universalPrivateChoices(packs,q,0)?.options.some(x=>x.card?.name));
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseOwnBounce',uid:s.players[1].deck[0].uid},{actor:0}),/not currently legal/);
 const back=dispatchUniversalAction(packs,q,{type:'chooseOwnBounce',uid:other.uid},{actor:0});
 assert.equal(back.pending,null);
 assert.ok(back.players[0].hand.some(c=>c.uid===other.uid));
 assert.equal(back.players[0].front[1],null);
 assert.equal(back.players[0].front[0]?.uid,source.uid);
 assert.equal(assertUniversalMatch(packs,back),true);
});

test('TTG-1-049 must return ITSELF when no eligible other low-energy character exists',()=>{
 let s=fresh(491);
 const generator=take(s,0,'TTG-1-046'),source=take(s,0,'TTG-1-049');
 generator.ready=true;s.players[0].energy[0]=generator;s.players[0].hand.push(source);
 s=toPhase(s,'main');
 const a=legal(s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);
 const done=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(done.pending,null);
 assert.equal(done.players[0].front[0],null);
 assert.ok(done.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('TTG-1-052 discard then optional red energy<=2 recovery; payment card itself can return',()=>{
 let s=fresh(520);
 const generator=take(s,0,'TTG-1-049'),source=take(s,0,'TTG-1-052');
 s.players[0].energy[0]=generator;generator.ready=true;s.players[0].hand.push(source);
 const payment=take(s,0,'TTG-1-042'),blue=take(s,1,'BLC-1-034'),
 high=take(s,0,'TTG-1-073');
 s.players[0].hand.push(payment,high);
 s.players[1].outside.push(blue);
 s=toPhase(s,'main');
 const a=legal(s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);const q=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(q.pending.kind,'effect-discard-gate');
 assert.equal(q.pending.player,0);
 const skipped=dispatchUniversalAction(packs,q,
  {type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===payment.uid));
 const paid=dispatchUniversalAction(packs,q,
  {type:'chooseDiscardGate',uid:payment.uid},{actor:0});
 assert.equal(paid.pending.kind,'effect-recover-outside');
 assert.ok(legal(paid).some(x=>x.uid===payment.uid));
 assert.ok(!legal(paid).some(x=>x.uid===blue.uid||x.uid===high.uid));
 assert.equal(universalPrivateChoices(packs,paid,1),null);
 assert.deepEqual(universalPublicView(packs,paid,1).pending,
  {kind:'effect-recover-outside',player:0});
 // The discarded payment is ALREADY face up in public outside. Its UID
 // may be visible: only private hand/deck candidate UIDs must stay hidden.
 const recovered=dispatchUniversalAction(packs,paid,
  {type:'chooseOutsideRecovery',uid:payment.uid},{actor:0});
 assert.equal(recovered.pending,null);
 assert.ok(recovered.players[0].hand.some(c=>c.uid===payment.uid));
 assert.equal(assertUniversalMatch(packs,recovered),true);
});

test('Raid return-to-hand obeys Japanese official Q62: top only returns and base goes OUTSIDE',()=>{
 // Synthetic 50-card fixture is isolated from the official TTG deck.
 // This validates generic return-to-hand behavior with a legal LOW-energy
 // raid top, which the all-red test deck currently does not contain.
 const extras=Array.from({length:13},(_,i)=>({
  id:'R'+i,name:i===2?'Raided':'Body '+i,energy:i===0?0:i===2?1:2,
  ap:1,bp:2000,gen:i===0?2:1,color:'red',type:'character',
  implementation:i===1?'dsl':'vanilla',
  ...(i===1?{templateEffects:{onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]}}:{})
 }));
 const pack=createUniversalPack({id:'raid-bounce-q62',cards:extras});
 const ownCounts=Object.fromEntries(extras.slice(0,12).map(c=>[c.id,4]));
 ownCounts.R12=2;
 const two=[pack,pack];
 let s=newUniversalMatch(two,{decks:[ownCounts,ownCounts],seed:622,first:0});
 function pull(id){for(const zone of ['hand','deck','life']){
  const at=s.players[0][zone].findIndex(c=>c.cardId===id);
  if(at>=0)return s.players[0][zone].splice(at,1)[0];
 }throw Error(id);}
 const energy=pull('R0'),source=pull('R1'),top=pull('R2'),base=pull('R0');
 energy.ready=true;s.players[0].energy[0]=energy;
 top.stack=[base];s.players[0].front[1]=top;
 s.players[0].hand.push(source);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(two,s,{type:'next'});
 const a=legalUniversalActions(two,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);
 const q=dispatchUniversalAction(two,s,a);
 assert.equal(q.pending.kind,'effect-bounce-own');
 const back=dispatchUniversalAction(two,q,{type:'chooseOwnBounce',uid:top.uid},{actor:0});
 assert.ok(back.players[0].hand.some(c=>c.uid===top.uid));
 assert.ok(back.players[0].outside.some(c=>c.uid===base.uid));
 assert.ok(!back.players[0].hand.some(c=>c.uid===base.uid));
 assert.equal(assertUniversalMatch(two,back),true);
});

test('ALL-REAL cross-title TTG RED vs BLEACH PURPLE can finish a deterministic complete AI game',()=>{
 let s=fresh(747),n=0;
 for(;n<3500&&s.status==='playing';n++){
  const ai=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
  assert.ok(ai,'AI must always have a legal action at step '+n+' with '+JSON.stringify(s.pending));
  assert.ok(legal(s).some(x=>JSON.stringify(x)===JSON.stringify(ai)));
  s=dispatchUniversalAction(packs,s,ai);
  if(n%40===0)assert.equal(assertUniversalMatch(packs,s),true);
 }
 assert.ok(n>20,'must play through opening');
 assert.equal(s.status,'finished','real-card cross-title game did not finish before safety cap');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.ok(['life-zero','required-draw-empty','unblocked-attack'].includes(s.endReason));
});

test('both real titles finish cross-title games for alternate first player and mixed normal/hard AI without losing physical cards',()=>{
 const scenarios=[
  {seed:205,first:1,p0:'hard',p1:'normal'},
  {seed:911,first:0,p0:'normal',p1:'hard'}
 ];
 for(const scenario of scenarios){
  let state=fresh(scenario.seed,scenario.first),step=0;
  for(;step<3500&&state.status==='playing';step++){
   const player=state.pending?.player??state.active;
   const difficulty=player===0?scenario.p0:scenario.p1;
   const action=chooseUniversalAiAction(packs,state,{difficulty});
   assert.ok(action,'No move: '+JSON.stringify({scenario,step,pending:state.pending}));
   state=dispatchUniversalAction(packs,state,action);
   if(step%30===0)assert.equal(assertUniversalMatch(packs,state),true);
  }
  assert.equal(state.status,'finished',JSON.stringify({scenario,step}));
  assert.ok(step>20,'a game must progress past early setup');
  assert.equal(assertUniversalMatch(packs,state),true);
 }
});
