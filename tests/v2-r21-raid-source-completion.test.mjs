import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'Z'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({
 id,name:id==='Z00'?'Base':id==='Z01'?'RaidRole':id,
 type:id==='Z02'?'event':'character',color:'blue',energy:0,ap:1,
 bp:1500,gen:1,implementation:['Z00','Z01','Z02'].includes(id)?'dsl':'vanilla',
 ...(id==='Z00'?{effects:{onRaided:[{op:'drawIfRaidUnderFacedown'}]}}:{}),
 ...(id==='Z01'?{raidName:'Base',effects:{
  onPlay:[{op:'draw',count:1}],
  onRaid:[{op:'drawDiscard',count:1,discardCount:1}]}}:{}),
 ...(id==='Z02'?{moveTriggers:[{when:{from:'hand',to:'outside',
  reasons:['own-effect','payment'],sourceName:'RaidRole',
  sourceColor:'blue',sourceOnField:true},then:[{op:'draw',count:1}]}]}:{})
}));
const pack=createUniversalPack({id:'r21-raid-source-completion',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[0][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function started(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:21024,first:0});
 const base=take(s,'Z00'),raid=take(s,'Z01'),trigger=take(s,'Z02');
 base.ready=true;s.players[0].front[0]=base;
 s.players[0].hand.push(raid,trigger);
 s.phase='main';
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===raid.uid&&a.baseUid===base.uid);
 assert.ok(action,'existing two-layer Raid geometry must be legal');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending?.kind,'raid-effect-order');
 const baseMove=s.zoneMoveEvents.find(e=>e.uid===base.uid&&e.to==='raid-under');
 const raidMove=s.zoneMoveEvents.find(e=>e.uid===raid.uid&&e.from==='hand'&&e.to==='front');
 assert.ok(baseMove&&raidMove,'Raid is two completed UID movements');
 assert.deepEqual([baseMove.from,baseMove.owner,baseMove.sourceUid],
  ['front',0,raid.uid]);
 assert.ok(baseMove.order<raidMove.order);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,base,raid,trigger};
}
for(const mode of ['baseFirst','entryFirst']){
 test('Raid '+mode+' keeps physical two-source order, pauses choice, then drains once',()=>{
  let {s,base,raid,trigger}=started();
  assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.mode),['baseFirst','entryFirst']);
  s=dispatchUniversalAction(packs,s,{type:'chooseRaidOrder',mode});
  assert.equal(s.pending?.kind,'effect-discard');
  assert.ok(s.effectQueue.some(j=>j.op==='sourceResolutionBoundary'&&j.sourceUid===raid.uid));
  assert.equal(s.zoneMoveEvents.filter(e=>e.sourceUid===trigger.uid&&e.from==='deck').length,0);
  const before=s.zoneMoveEvents.length;
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:trigger.uid});
  assert.equal(s.pending,null);
  const moved=s.zoneMoveEvents.slice(before);
  const paid=moved.find(e=>e.uid===trigger.uid&&e.to==='outside');
  const bonus=moved.filter(e=>e.sourceUid===trigger.uid&&e.from==='deck');
  assert.ok(paid);
  assert.equal(paid.sourceUid,raid.uid);
  assert.equal(bonus.length,1);
  assert.ok(bonus[0].order>paid.order);
  const sourceDraws=s.zoneMoveEvents.filter(e=>e.from==='deck'&&
   e.to==='hand'&&e.sourceUid!==null).map(e=>e.sourceUid);
  assert.deepEqual(sourceDraws,[raid.uid,raid.uid,trigger.uid]);
  assert.equal(s.zoneMoveEvents.some(e=>e.sourceUid===base.uid&&e.from==='deck'),false,
   'base conditional draw is not enabled without a facedown undercard');
  assert.equal(s.players[0].front[0].uid,raid.uid);
  assert.equal(universalPublicView(packs,s,1).zoneMoveEvents,undefined);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
