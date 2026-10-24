import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';

// Source: EX15BT/BLC-4-034 official PRINT + Q2315/Q2316. This is deliberately
// an UNREGISTERED single-clause pilot, NOT a full Riruka port: her onPlay
// energy ACTIVE and REST+retire+facdown recovery MAIN need separate support.
const actual=CARDS.find(c=>c.identity==='BLC-4-034');
assert.ok(actual,'official BLEACH print source must be present');
const entries=Array.from({length:13},(_,i)=>({
 id:i===0?'BLC-4-034':i===1?'LOW':i===2?'HIGH':i===3?'BASE':'X'+i,
 name:i===0?actual.nameJa:'Printed '+i,
 type:'character',color:'blue',energy:i===0?actual.energy:0,ap:1,
 bp:i===0?actual.bp:i===2?4000:3000,gen:1,
 implementation:i===0||i===7?'dsl':'vanilla',
 ...(i===7?{printedAttackDamage:2}:{}),
 ...(i===8?{trigger:'final'}:{}),
 ...(i===0?{trigger:'color',
  effects:{onPlay:[{op:'activeSelfIf',line:'energy'}]},
  triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500},
  moveObserver:{op:'restSelfTuckMovedFaceDown',when:{
   from:'hand',to:'outside',reasons:['payment','own-effect'],
   sourceName:'黒崎 一護',sourceColor:'blue',sourceOnField:true
  }}}:{})
}));
const deck=Object.fromEntries(entries.map((c,i)=>[c.id,i===12?2:4]));
const packs=[createUniversalPack({id:'r30-color-bounce-0',cards:entries}),
 createUniversalPack({id:'r30-color-bounce-1',cards:entries})];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const i=s.players[p][zone].findIndex(c=>c.cardId===id);
  if(i>=0)return s.players[p][zone].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function open({withRaid=false,buffTo3500=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:30034});
 const low=take(s,0,'LOW'),high=take(s,0,'HIGH');
 low.ready=true;low.fieldEntryStamp=s.nextFieldEntryStamp++;
 high.ready=true;high.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=low;s.players[0].front[1]=high;
 let base=null,under=null;
 if(withRaid){
  base=take(s,0,'BASE');low.stack=[base];
  under=take(s,0,'X5');under.faceDown=true;low.under=[under];
 }
 if(buffTo3500)low.buffs.push({bp:500,untilTurn:s.turn});
 const p=s.players[1];
 p.deck.push(...p.life.splice(0));
 const color=take(s,1,'BLC-4-034'),plain=take(s,1,'X6');
 p.life.push(color,plain);
 assert.equal(assertUniversalMatch(packs,s),true);
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:low.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,color.uid);
 return {s,low,high,color,base,under};
}
test('R30 official 034 print oracle and unsupported whole-card gate are explicit',()=>{
 assert.deepEqual([actual.nameJa,actual.color,actual.energy,actual.ap,
  actual.bp,actual.gen,actual.type,actual.trigger],
  ['毒ヶ峰 リルカ','blue',0,1,1000,1,'character','color']);
 for(const text of ['アクティブ','レスト','退場','裏向き'])
  assert.ok(actual.effect.includes(text)||actual.effect.includes(
   ({'アクティブ':'Active','レスト':'Rest','退場':'退場','裏向き':'裏向'})[text]));
 assert.deepEqual(validateUniversalDeck(packs[0],deck),[]);
 const registered=registeredV2TitlePack('bleach').cards['BLC-4-034'];
 assert.equal(registered.moveObserver.op,'restSelfTuckMovedFaceDown');
 assert.equal(registered.effects.onPlay[0].op,'activeSelfIf');
 assert.equal(registered.mainAbility.op,'restRetireRecoverUnder');
 assert.equal(registered.triggerEffect.op,'bounceOppFrontUnderBp');
});
for(const withRaid of [false,true])for(const buffTo3500 of [false,true])
 test('R30 034 COLOR 3500 inclusive, opponent choice, return top only, layers to own outside '+withRaid+'/'+buffTo3500,()=>{
  let {s,low,high,base,under}=open({withRaid,buffTo3500});
  assert.equal(universalBp(packs,s,s.players[0].front[0]),buffTo3500?3500:3000);
  assert.equal(universalBp(packs,s,s.players[0].front[1]),4000);
  const legal=legalUniversalActions(packs,s);
  assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='skip'));
  assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='colorBounce'&&a.uid===low.uid));
  assert.ok(!legal.some(a=>a.uid===high.uid),'printed current BP above 3500 cannot return');
  for(const difficulty of ['normal','hard'])
   assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(
    chooseUniversalAiAction(packs,s,{difficulty}))));
  const snap=structuredClone(s),foe=universalPublicView(packs,s,1);
  assert.throws(()=>dispatchUniversalAction(packs,s,
   {type:'chooseTrigger',mode:'colorBounce',uid:high.uid},{actor:1}),/not currently legal/);
  assert.throws(()=>dispatchUniversalAction(packs,s,
   {type:'chooseTrigger',mode:'colorBounce',uid:low.uid},{actor:0}),/Wrong player/);
  assert.deepEqual(s,snap);
  assert.deepEqual(universalPublicView(packs,s,1),foe);
  s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
  const before=s.zoneMoveEvents.length;
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorBounce',uid:low.uid},{actor:1});
  assert.equal(s.players[0].hand.filter(c=>c.uid===low.uid).length,1);
  assert.equal(s.players[0].front[0],null);
  assert.equal(s.players[0].front[1].uid,high.uid);
  assert.equal(s.players[0].outside.some(c=>c.uid===low.uid),false);
  assert.equal(s.players[0].outside.some(c=>c.uid===base?.uid),!!base);
  assert.equal(s.players[0].outside.some(c=>c.uid===under?.uid),!!under);
  assert.equal(s.turnRetireEvents.some(x=>x.uid===low.uid),false,'return is not true retirement');
  const bounced=s.zoneMoveEvents.slice(before).find(x=>x.uid===low.uid&&x.to==='hand');
  assert.equal(bounced.from,'front');
  assert.equal(bounced.reason,'opponent-effect');
  assert.equal(bounced.owner,0);
  assert.equal(bounced.controller,1);
  assert.equal(bounced.sourceUid,snap.pending.uid);
  assert.equal(s.players[1].life.length,1);
  assert.equal(s.pending,null);
  assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
test('R30 strict COLOR return template rejects wrong type, unknown fields and invalid BP',()=>{
 const printed=entries[0];
 for(const bad of [{op:'bounceOppFrontUnderBp',bp:0},
  {op:'bounceOppFrontUnderBp',bp:3500,all:true},
  {op:'bounceOppFrontUnderBp',bp:3500.5},
  {op:'bounceOppFrontUnderBp',bp:50001}]){
  assert.throws(()=>createUniversalPack({id:'r30-invalid',cards:[{...printed,triggerEffect:bad}]}),
   /COLOR requires/);
 }
});


// R30 / Q12, Q38 and Q73: real 034 COLOR card and a simultaneous FINAL
// both resolve in the defender's trigger check. The opponent's independent
// LOW card is returned without interrupting the DAMAGE2 attacking source.
for(const finalFirst of [false,true])
 test('R30 opponent COLOR BP return interleaves with outstanding FINAL, FINAL first '+finalFirst,()=>{
  let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:3038});
  const attacking=take(s,0,'X7'),victim=take(s,0,'LOW'),high=take(s,0,'HIGH');
  for(const [slot,c] of [attacking,victim,high].entries()){
   c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[slot]=c;
  }
  const p=s.players[1];p.deck.push(...p.life.splice(0));
  const color=take(s,1,'BLC-4-034'),final=take(s,1,'X8');
  p.life.push(color,final);
  s.phase='attack';
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacking.uid},{actor:0});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
  assert.equal(s.pending?.kind,'life-batch-order');
  assert.deepEqual(s.lifeRevealBatch.remaining,[color.uid,final.uid]);
  assert.equal(s.players[1].life.length,0);
  assert.equal(s.status,'playing','zero LIFE before FINAL cannot end the match');
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='chooseTrigger'));
  const ordered=finalFirst?[final,color]:[color,final];
  for(const [index,card] of ordered.entries()){
   if(s.pending?.kind==='life-batch-order'){
    s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:card.uid},{actor:1});
   }
   assert.equal(s.pending?.kind,'life-trigger');
   assert.equal(s.pending.uid,card.uid);
   const opts=legalUniversalActions(packs,s);
   for(const difficulty of ['normal','hard'])
    assert.ok(opts.some(a=>JSON.stringify(a)===JSON.stringify(
     chooseUniversalAiAction(packs,s,{difficulty}))));
   const intended=card.uid===color.uid?
    {type:'chooseTrigger',mode:'colorBounce',uid:victim.uid}:
    {type:'chooseTrigger',mode:'final'};
   assert.ok(opts.some(x=>JSON.stringify(x)===JSON.stringify(intended)));
   const snap=structuredClone(s);
   assert.throws(()=>dispatchUniversalAction(packs,s,intended,{actor:0}),/Wrong player/);
   assert.deepEqual(s,snap);
   s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
   s=dispatchUniversalAction(packs,s,intended,{actor:1});
   assert.equal(s.status,'playing','do not declare winner during triggered chain');
   if(index===0)assert.equal(s.pending?.uid,ordered[1].uid);
  }
  assert.equal(s.players[0].hand.some(c=>c.uid===victim.uid),true);
  assert.equal(s.players[0].front[0].uid,attacking.uid);
  assert.equal(s.players[0].front[1],null);
  assert.equal(s.players[0].front[2].uid,high.uid);
  assert.equal(s.players[1].life.length,1,'FINAL restored LIFE regardless of chosen order');
  assert.equal(s.pending,null);assert.equal(s.lifeRevealBatch,null);
  assert.equal(s.effectQueue.length,0);
  assert.equal(s.status,'playing');
  assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });


// R30 official EX15BT/BLC-4-034: onPlay ACTIVE applies ONLY if she was
// entered into ENERGY. No unconditional front activation, no invented MAIN.
for(const owner of [0,1])for(const line of ['energy','front'])
 test('R30 authentic 034 energy-line-specific onPlay ACTIVE owner '+owner+' line '+line,()=>{
  let s=newUniversalMatch(packs,{decks:[deck,deck],first:owner,seed:30340});
  const liruka=take(s,owner,'BLC-4-034');
  s.players[owner].hand.push(liruka);
  for(let i=0;i<4&&s.phase!=='main';i++){
   const action=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(action,'main must be reached using legal turn transitions');
   s=dispatchUniversalAction(packs,s,action,{actor:owner});
  }
  assert.equal(s.phase,'main');
  const legal=legalUniversalActions(packs,s);
  const play=legal.find(a=>a.type==='play'&&a.uid===liruka.uid&&a.line===line);
  assert.ok(play,'zero-energy printed character must be AP-paid legal on chosen line');
  const beforeAP=s.players[owner].apCards.filter(x=>x.ready).length;
  s=dispatchUniversalAction(packs,s,play,{actor:owner});
  assert.equal(s.players[owner].apCards.filter(x=>x.ready).length,beforeAP-1);
  const active=s.players[owner][line].find(c=>c?.uid===liruka.uid);
  assert.ok(active);
  assert.ok(Number.isInteger(active.fieldEntryStamp)&&active.fieldEntryStamp>=1);
  assert.equal(active.ready,line==='energy','only ENERGY-line onPlay makes this card ACTIVE');
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
test('R30 typed ACTIVE entry rejects unknown line, missing condition and forged key',()=>{
 const source=entries[0];
 for(const bad of [{op:'activeSelfIf',line:'outside'},
  {op:'activeSelfIf',line:'raid-under'},
  {op:'activeSelfIf',line:'energy',unlockAll:true},
  {op:'activeSelfIf'}]){
  assert.throws(()=>createUniversalPack({id:'r30-invalid-active',cards:[
   {...source,effects:{onPlay:[bad]}}
  ]}),/invalid conditional ACTIVE entry/i);
 }
});
