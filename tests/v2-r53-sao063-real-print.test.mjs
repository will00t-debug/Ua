import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalCardEnergy,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const pack=registeredV2TitlePack('sword-art-online'),both=[pack,pack];
const ids=['SAO-2-063','SAO-1-100','SAO-2-068','SAO-1-068',
 'SAO-1-069','SAO-1-070','SAO-1-079','SAO-1-078','SAO-1-005',
 'SAO-1-057','SAO-1-051','SAO-1-019','SAO-1-004'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const z of ['hand','deck','life']){
  const pool=s.players[p][z],i=pool.findIndex(c=>c.cardId===id);
  if(i>=0)return pool.splice(i,1)[0];
 }
 throw Error('Missing real physical '+id);
}
function setup(n){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:53063+n});
 const actor=take(s,0,'SAO-2-063');s.players[0].hand.push(actor);
 const events=Array.from({length:n},()=>take(s,0,'SAO-1-100'));
 s.players[0].hand.push(...events);
 for(let i=0;i<4;i++){
  const energy=take(s,0,'SAO-1-068');energy.ready=true;
  energy.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=energy;
 }
 const enemies=Array.from({length:n},()=>take(s,1,'SAO-1-068'));
 for(let i=0;i<n;i++){
  enemies[i].ready=true;enemies[i].fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[i]=enemies[i];
 }
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 // State fixture is a legal late-game three-AP availability (not a fake cost).
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(both,s),true);
 return {s,actor,events,enemies};
}
test('R53 EX08BT/SAO-2-063 full official exact 3 energy, gen 3, STEP, live OUTSIDE draw',()=>{
 const original=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-063');
 assert.equal(original.number,'EX08BT/SAO-2-063');
 assert.deepEqual([original.nameJa,original.color,original.energy,original.ap,
  original.bp,original.gen,original.trigger],['アスナ','green',3,1,3000,3,null]);
 assert.deepEqual(original.traits,['ALO']);
 assert.equal(original.effectJa, "【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）\n【登場時】自分の場外に〈ユウキ〉と〈マザーズ・ロザリオ〉が合計2枚以上ある場合、カードを1枚引く。");
 const d=pack.cards[original.id];assert.equal(d.step,true);
 assert.deepEqual(d.effects.onPlay,[{op:'drawIfOwnOutsideNamedCountAtLeast',
  min:2,names:['ユウキ','マザーズ・ロザリオ'],count:1}]);
 assert.equal(d.gen,3);
});
test('R53 real paid SAO EVENT twice then normal SAO-2-063 play draws exactly 1',()=>{
 for(const n of [0,1,2]){
  let {s,actor,events,enemies}=setup(n);
  for(let i=0;i<n;i++){
   const ap=s.players[0].apCards.filter(x=>x.ready).length;
   const event=legalUniversalActions(both,s).find(x=>
    x.type==='event'&&x.uid===events[i].uid);
   assert.ok(event);s=use(s,event);
   assert.equal(ap-s.players[0].apCards.filter(x=>x.ready).length,1);
   assert.ok(!s.players[0].outside.some(x=>x.uid===events[i].uid));
   const choice=legalUniversalActions(both,s).find(x=>
    x.type==='chooseNamedOutsideBounceRetire'&&x.uid===enemies[i].uid);
   assert.ok(choice);s=use(s,choice);
   assert.ok(s.players[0].outside.some(x=>x.uid===events[i].uid));
  }
  const deckBefore=s.players[0].deck.length;
  const handBefore=s.players[0].hand.length;
  const apBefore=s.players[0].apCards.filter(x=>x.ready).length;
  const play=legalUniversalActions(both,s).find(a=>a.type==='play'&&
   a.uid===actor.uid&&a.line==='front');
  assert.ok(play);s=use(s,play);
  assert.equal(apBefore-s.players[0].apCards.filter(x=>x.ready).length,1);
  assert.equal(s.players[0].deck.length,deckBefore-(n>=2?1:0));
  assert.equal(s.players[0].hand.length,handBefore-1+(n>=2?1:0));
  assert.ok(s.players[0].front.some(c=>c?.uid===actor.uid));
  assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
  assert.equal(universalPublicView(both,s,1).players[0].hand,null);
  for(const difficulty of ['easy','normal','hard']){
   const action=chooseUniversalAiAction(both,s,{difficulty});
   assert.ok(legalUniversalActions(both,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
  }
 }
});
test('R53 real STEP is a FRONT to ENERGY physical move without another paid play',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],seed:53064,first:0});
 const c=take(s,0,'SAO-2-063');
 c.ready=false;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=c;
 s=use(s,{type:'next'});assert.equal(s.phase,'move');
 const available=legalUniversalActions(both,s);
 const step=available.find(a=>a.type==='step'&&a.uid===c.uid&&a.slot===0);
 assert.ok(step,'printed STEP is a move, not an energy/AP payment');
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 s=use(s,step);
 assert.ok(!s.players[0].front.some(x=>x?.uid===c.uid));
 assert.equal(s.players[0].energy[0].uid,c.uid);
 assert.equal(universalCardEnergy(both,s,0,s.players[0].energy[0]),3);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap);
 assert.equal(assertUniversalMatch(both,s),true);
});
test('R53 strict conditional draw rejects forged thresholds/names and unknown labels',()=>{
 const raw={id:'test',name:'print',color:'green',energy:3,ap:1,
  bp:3000,gen:3,type:'character',traits:['ALO'],trigger:null,
  implementation:'dsl',step:true,effects:{onPlay:[
   {op:'drawIfOwnOutsideNamedCountAtLeast',min:2,count:1,names:['ユウキ','マザーズ・ロザリオ']}
  ]}};
 for(const mod of [
  {min:0},{min:201},{count:0},{names:[]},
  {names:['ユウキ','ユウキ']},{optional:true},{names:['ユウキ',null]}
 ]){
  const bad={...raw,effects:{onPlay:[{...raw.effects.onPlay[0],...mod}]}};
  assert.throws(()=>createUniversalPack({id:'r53-fail-closed',cards:[bad]}));
 }
});
