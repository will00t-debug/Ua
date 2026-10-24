import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Synthetic identities, not real card registry entries. Both players use the same DSL.
const cards=Array.from({length:14},(_,i)=>({
 id:'R24'+i,name:'R24 '+i,type:'character',color:'blue',energy:0,ap:1,bp:3000,gen:1,
 implementation:[0,3].includes(i)?'dsl':'vanilla',
 ...(i===0?{printedAttackDamage:2}:{}),
 ...(i===1?{trigger:'special',triggerEffect:{op:'retireOppFront'}}:{}),
 ...(i===2?{trigger:'final'}:{}),
 ...(i===3?{effects:{onRetire:[
  {op:'buffOwnField',filter:{field:'name',value:'R24 0'},bp:500,optional:true,excludeSelf:false},{op:'draw',count:1}
 ]}}:{})
}));
const pack=createUniversalPack({id:'r24-opponent-retire-life',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===13||i===1||i===2?2:4]));
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function duel({single=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:240038});
 const attacker=take(s,0,single?'R246':'R240');
 const victim=take(s,0,'R243');
 attacker.ready=true;s.players[0].front[0]=attacker;s.players[0].front[1]=victim;
 const pl=s.players[1];pl.deck.push(...pl.life.splice(0));
 const special=take(s,1,'R241'),final=take(s,1,'R242'),plain=take(s,1,'R247');
 pl.life.push(...(single?[plain]:[special,final]));
 // Every unused fixture stays in a real zone: never fabricate missing UID cards.
 pl.deck.push(...(single?[special,final]:[plain]));
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 return {s,attacker,victim,special,final,plain};
}
for(const finalFirst of [false,true])test('Q38 SPECIAL retirement owner switches to turn player before unresolved defender LIFE, FINAL '+(finalFirst?'first':'last'),()=>{
 let {s,victim,special,final}=duel();
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 assert.deepEqual(s.lifeRevealBatch.remaining,[special.uid,final.uid]);
 if(finalFirst){
  s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:final.uid},{actor:1});
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 }
 if(!finalFirst)s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:special.uid},{actor:1});
 else assert.equal(s.pending?.uid,special.uid,'single remaining LIFE automatically opens its check');
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:victim.uid},{actor:1});
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.equal(s.pending.player,0,'onRetire belongs to active attacking player');
 assert.equal(s.status,'playing');
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 assert.ok(!s.players[0].front.some(c=>c?.uid===victim.uid));
 assert.equal(s.players[1].lifeRevealed.some(c=>c.uid===final.uid),!finalFirst);
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.length>0&&legal.every(x=>x.type==='chooseOwnBuff'));
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const old=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,legal[0],{actor:1}),/Wrong player turn/);
 assert.deepEqual(s,old);
 assert.equal(universalPublicView(packs,s,1).effectQueue,undefined);
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,legal[0],{actor:0});
 if(!finalFirst){
  assert.equal(s.pending?.uid,final.uid);
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 }
 assert.equal(s.pending,null);assert.equal(s.lifeRevealBatch,null);
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.status,'playing');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Q12 queued earned effect drains before single LIFE-zero result',()=>{
 let {s,attacker,plain}=duel({single:true});
 // Synthetic already-earned continuation, separate from the single-damage check.
 s.effectQueue.push({op:'draw',owner:1,count:1,sourceUid:attacker.uid});
 const hand=s.players[1].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.players[1].hand.length,hand+1,'queued effect not lost by premature winner');
 assert.equal(s.players[1].outside.some(c=>c.uid===plain.uid),true);
 assert.equal(s.effectQueue.length,0);
 assert.equal(s.status,'finished');assert.equal(s.winner,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});


// R29 bounded Q35/Q38: two *physical* SPECIAL LIFE cards retire two
// different attacking player's characters. Each actual onRetire pauses the
// defending player's unresolved LIFE check and hands the legal choice to its
// original controller. Not a global all-player event scheduler certification.
for(const reverseOrder of [false,true])
 test('R29 opposing double SPECIAL causes two distinct attacker-owned onRetire choice windows, reverse '+reverseOrder,()=>{
  let {s,attacker,victim,special,final}=duel();
  const otherVictim=take(s,0,'R243');
  const otherSpecial=take(s,1,'R241');
  const plain=take(s,1,'R247');
  s.players[0].front[2]=otherVictim;
  const removedFinal=s.players[1].life.splice(1,1)[0];
  assert.equal(removedFinal.uid,final.uid);
  s.players[1].deck.push(removedFinal);
  s.players[1].life.push(otherSpecial,plain);
  assert.equal(assertUniversalMatch(packs,s),true);
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
  assert.equal(s.pending?.kind,'life-batch-order');
  assert.equal(s.lifeRevealBatch.remaining.length,2);
  const [one,two]=reverseOrder?[otherSpecial,special]:[special,otherSpecial];
  const [firstVictim,secondVictim]=reverseOrder?[otherVictim,victim]:[victim,otherVictim];
  const ownerHandBefore=s.players[0].hand.length;
  const firstChoices=legalUniversalActions(packs,s);
  assert.ok(firstChoices.some(a=>a.type==='chooseLifeOrder'&&a.uid===one.uid));
  assert.ok(firstChoices.some(a=>a.type==='chooseLifeOrder'&&a.uid===two.uid));
  for(const difficulty of ['normal','hard'])
   assert.ok(firstChoices.some(a=>JSON.stringify(a)===JSON.stringify(
    chooseUniversalAiAction(packs,s,{difficulty}))));
  const old=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(packs,s,
   {type:'chooseLifeOrder',uid:one.uid},{actor:0}),/Wrong player/);
  assert.deepEqual(s,old);
  s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:one.uid},{actor:1});
  assert.equal(s.pending?.kind,'life-trigger');
  assert.equal(s.pending?.uid,one.uid);
  for(const [life,victimCard] of [[one,firstVictim],[two,secondVictim]]){
   assert.equal(s.pending?.uid,life.uid);
   const victimOption=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&
    a.mode==='special'&&a.uid===victimCard.uid);
   assert.ok(victimOption);
   const paused=structuredClone(s);
   assert.throws(()=>dispatchUniversalAction(packs,s,
    {type:'chooseTrigger',mode:'special',uid:'nonexistent'},{actor:1}),/not currently legal/);
   assert.deepEqual(s,paused);
   s=dispatchUniversalAction(packs,s,victimOption,{actor:1});
   assert.equal(s.pending?.kind,'effect-buff-own');
   assert.equal(s.pending?.player,0,'attacking player controls the retired character');
   assert.equal(s.players[0].outside.some(c=>c.uid===victimCard.uid),true);
   assert.equal(s.lifeRevealBatch?.remaining.length,life.uid===one.uid?1:0);
   const earned=legalUniversalActions(packs,s);
   assert.ok(earned.length>0&&earned.every(a=>a.type==='chooseOwnBuff'));
   for(const difficulty of ['normal','hard'])
    assert.ok(earned.some(a=>JSON.stringify(a)===JSON.stringify(
     chooseUniversalAiAction(packs,s,{difficulty}))));
   const exact=structuredClone(s),enemyView=universalPublicView(packs,s,1);
   assert.throws(()=>dispatchUniversalAction(packs,s,earned[0],{actor:1}),/Wrong player/);
   assert.deepEqual(s,exact);
   assert.deepEqual(universalPublicView(packs,s,1),enemyView);
   s=JSON.parse(JSON.stringify(s));
   assert.equal(assertUniversalMatch(packs,s),true);
   s=dispatchUniversalAction(packs,s,earned[0],{actor:0});
   if(life.uid===one.uid){
    assert.equal(s.pending?.kind,'life-trigger',
     'second outstanding physical SPECIAL continues after first entire onRetire');
    assert.equal(s.pending?.uid,two.uid);
   }
  }
  assert.equal(s.pending,null);
  assert.equal(s.lifeRevealBatch,null);
  assert.equal(s.players[0].hand.length,ownerHandBefore+2,'two separate retired sources each draw once');
  assert.equal(s.players[1].life.length,1);
  assert.equal(s.players[1].lifeRevealed.length,0);
  assert.equal(s.status,'playing');
  assert.equal(assertUniversalMatch(packs,s),true);
  assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
  assert.equal(s.players[0].front[0].uid,attacker.uid);
 });
