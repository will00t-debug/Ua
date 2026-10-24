import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('sword-art-online'),packs=[pack,pack];
const ids=['SAO-1-100','SAO-1-070','SAO-1-078','SAO-1-079','SAO-2-068',
 'SAO-2-069','SAO-1-068','SAO-1-069','SAO-1-005','SAO-1-057',
 'SAO-1-051','SAO-1-019','SAO-1-004'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-100');
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing real card '+id);
}
function scene(n,{bpAbove=false,withoutTarget=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:52100+n});
 const evt=take(s,0,'SAO-1-100');s.players[0].hand.push(evt);
 for(let i=0;i<n;i++)s.players[0].outside.push(take(s,0,'SAO-2-068'));
 for(let i=0;i<3;i++){
  const x=take(s,0,'SAO-1-068');x.ready=true;
  x.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=x;
 }
 const y=take(s,0,'SAO-1-069');y.ready=true;
 y.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[3]=y;
 let target=null;
 if(!withoutTarget){
  target=take(s,1,'SAO-1-068');target.ready=true;
  target.fieldEntryStamp=s.nextFieldEntryStamp++;
  if(bpAbove)target.buffs=[{bp:6000,untilTurn:s.turn}];
  s.players[1].front[0]=target;
 }
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 assert.equal(s.phase,'main');
 return {s,evt,target};
}
test('R52 SAO-1-100 official full print pinned and registered, no invented alias',()=>{
 assert.equal(source.number,'UA15BT/SAO-1-100');
 assert.deepEqual([source.color,source.type,source.energy,source.ap,source.bp,
  source.gen,source.trigger],['green','event',4,1,0,0,'special']);
 assert.match(source.effectJa,/BP5000以下/);
 assert.match(source.effectJa,/マザーズ・ロザリオ/);
 const d=pack.cards['SAO-1-100'];assert.ok(d);
 assert.deepEqual(d.effects.onPlay,[{op:'conditionalBounceOrRetireByOwnOutsideNames',
  bp:5000,min:3,names:['ユウキ','マザーズ・ロザリオ']}]);
 assert.deepEqual(d.triggerEffect,{op:'retireOppFront'});
 for(const id of ['SAO-1-078','SAO-1-079','SAO-2-068','SAO-2-069'])
  assert.equal(pack.cards[id].name,'ユウキ');
});
test('R52 real card playable 50-deck uses Q767 2 -> bounce vs 3 -> true retirement',()=>{
 for(const n of [0,2,3,4]){
  let {s,evt,target}=scene(n);
  assert.equal(assertUniversalMatch(packs,s),true);
  const initialAP=s.players[0].apCards.filter(x=>x.ready).length;
  const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===evt.uid);
  assert.ok(play,'green 4 mandatory target event');
  s=use(s,play);
  assert.equal(initialAP-s.players[0].apCards.filter(x=>x.ready).length,1);
  assert.equal(s.pending?.kind,'effect-named-outside-bounce-retire');
  assert.ok(!s.players[0].outside.some(c=>c.uid===evt.uid));
  assert.ok(s.players[0].resolvingEvents.some(c=>c.uid===evt.uid));
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
  const selection=legalUniversalActions(packs,s).find(a=>
   a.type==='chooseNamedOutsideBounceRetire'&&a.uid===target.uid);
  assert.ok(selection);
  s=use(s,selection);
  assert.ok(s.players[0].outside.some(c=>c.uid===evt.uid));
  assert.equal(s.pending,null);
  assert.equal(s.players[1].outside.some(c=>c.uid===target.uid),n>=3);
  assert.equal(s.players[1].hand.some(c=>c.uid===target.uid),n<3);
  const own=s.zoneMoveEvents.find(e=>e.uid===evt.uid&&e.to==='outside');
  const enemy=s.zoneMoveEvents.find(e=>e.uid===target.uid&&
   (e.to==='outside'||e.to==='hand'));
  assert.ok(own.order>enemy.order,'Q767 EVENT settlement after printed effect');
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
  assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 }
});
test('R52 SAO-1-100 cannot pay AP with no legal mandatory BP<=5000 FRONT target',()=>{
 for(const options of [{withoutTarget:true},{bpAbove:true}]){
  const {s,evt}=scene(2,options);
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===evt.uid));
  const ap=s.players[0].apCards.filter(x=>x.ready).length;
  assert.throws(()=>use(s,{type:'event',uid:evt.uid}));
  assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap);
 }
});
test('R52 SAO-1-100 SPECIAL LIFE is separate unconditional true retirement',()=>{
 let {s,evt}=scene(2,{withoutTarget:true});
 const foe=take(s,1,'SAO-1-057');
 foe.ready=true;foe.fieldEntryStamp=s.nextFieldEntryStamp++;
 foe.buffs=[{bp:6000,untilTurn:s.turn}];
 s.players[1].front[0]=foe;
 const handIndex=s.players[0].hand.findIndex(c=>c.uid===evt.uid);
 s.players[0].outside.push(s.players[0].hand.splice(handIndex,1)[0]);
 s.pending={kind:'life-trigger',player:0,uid:evt.uid,trigger:'special'};
 assert.equal(assertUniversalMatch(packs,s),true);
 const choice=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&
  a.mode==='special'&&a.uid===foe.uid);
 assert.ok(choice,'SPECIAL has no normal BP5000 cap');
 s=use(s,choice);
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});


test('R52 Q62 real SAO RAID: bounce returns top alone, retirement discards both layers',()=>{
 for(const threshold of [2,3]){
  let {s,evt,target}=scene(threshold);
  const old=s.players[1].front[0];
  assert.equal(old.uid,target.uid);
  s.players[1].front[0]=null;
  s.players[1].hand.push(old);
  const base=take(s,1,'SAO-1-078'),top=take(s,1,'SAO-2-069');
  top.ready=true;top.fieldEntryStamp=s.nextFieldEntryStamp++;
  top.stack=[base];s.players[1].front[0]=top;
  assert.equal(assertUniversalMatch(packs,s),true);
  const event=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===evt.uid);
  assert.ok(event);
  s=use(s,event);
  const choice=legalUniversalActions(packs,s).find(a=>
   a.type==='chooseNamedOutsideBounceRetire'&&a.uid===top.uid);
  assert.ok(choice);s=use(s,choice);
  assert.ok(s.players[1].outside.some(c=>c.uid===base.uid),
   'real RAID base always outside by Q62');
  if(threshold===2){
   assert.ok(s.players[1].hand.some(c=>c.uid===top.uid));
   assert.ok(!s.players[1].outside.some(c=>c.uid===top.uid));
  }else{
   assert.ok(s.players[1].outside.some(c=>c.uid===top.uid));
   assert.ok(!s.players[1].hand.some(c=>c.uid===top.uid));
  }
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 }
});
