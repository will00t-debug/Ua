import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {MST_V2_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {requireRegisteredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {validateUniversalDeck,createUniversalPack,V2_EFFECT_TIMINGS} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';

const pack=requireRegisteredV2TitlePack('sword-art-online');
function physical(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[p][zone],at=cards.findIndex(x=>x.cardId===id);
  if(at!==-1)return cards.splice(at,1)[0];
 }
 throw Error('No physically registered '+id);
}
function fixture(id,{energyId,ap=1}={}){
 const counts={...SAO_V2_REAL_DECK_COUNTS};
 counts['SAO-1-035']-=2;counts[id]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:208107,first:0});
 const source=physical(s,0,id),producer=physical(s,0,energyId);
 s.players[0].hand.push(source);s.players[0].energy[0]=producer;
 for(let i=0;i<ap;i++){s.players[0].apCards[i].ready=true;s.players[0].apCards[i].inPlay=true;}
 for(let i=0;i<2;i++)s=dispatchUniversalAction([pack,pack],s,{type:'next'});
 assert.equal(s.phase,'main');
 const a=legalUniversalActions([pack,pack],s)
  .find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a,id+' cost '+ap+' is not legally payable');
 return {s,a,source,counts};
}
const same=(s)=>assert.equal(assertUniversalMatch([pack,pack],s),true);
test('SAO-1-107 exact official AP2 blue 3 draw three, discard exactly ONE; no hidden loss',()=>{
 const id='SAO-1-107',print=SAO_OFFICIAL_CARDS.find(x=>x.id===id);
 assert.equal(print.effectJa,'【登場時】カードを3枚引き、自分の手札を1枚場外に置く。');
 assert.equal(print.ap,2);assert.equal(print.trigger,'draw');
 assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'draw',count:2},{op:'drawDiscard',count:1}]);
 const {s,a}=fixture(id,{energyId:'SAO-1-102',ap:2});
 const before=s.players[0].deck.length,prevHand=s.players[0].hand.length;
 const q=dispatchUniversalAction([pack,pack],s,a);
 assert.equal(q.pending?.kind,'effect-discard');
 assert.equal(q.players[0].deck.length,before-3);
 assert.equal(q.players[0].hand.length,prevHand-1+3);
 assert.equal(q.players[0].apCards.filter(c=>c.ready).length,0);
 const legal=legalUniversalActions([pack,pack],q);
 assert.ok(legal.every(x=>x.type==='chooseDiscard'));
 assert.throws(()=>dispatchUniversalAction([pack,pack],q,
  {type:'chooseDiscard',uid:'forged'}),/not currently legal/);
 const done=dispatchUniversalAction([pack,pack],q,legal[0]);
 assert.equal(done.players[0].hand.length,prevHand+1);
 assert.equal(done.pending,null);same(done);same(q);
});
test('SAO-2-072 peek top or BOTTOM is private, never discards the top',()=>{
 const id='SAO-2-072',print=SAO_OFFICIAL_CARDS.find(x=>x.id===id);
 assert.equal(print.effectJa,'【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。');
 assert.equal(print.trigger,'draw');
 assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'peekTopOrBottom'}]);
 const {s,a}=fixture(id,{energyId:id});
 const q=dispatchUniversalAction([pack,pack],s,a);
 assert.equal(q.pending?.kind,'private-top-place');
 const before=q.players[0].deck.map(c=>c.uid),outside=q.players[0].outside.length;
 assert.ok(before.length>=2);
 assert.equal(universalPrivateChoices([pack,pack],q,1),null);
 assert.equal(universalPrivateChoices([pack,pack],q,0).options[0].card.cardId,
  q.players[0].deck[0].cardId);
 assert.ok(!JSON.stringify(universalPublicView([pack,pack],q,1)).includes(before[0]));
 assert.throws(()=>dispatchUniversalAction([pack,pack],q,
  {type:'chooseTopCard',mode:'outside'}),/not currently legal/);
 const top=dispatchUniversalAction([pack,pack],q,{type:'chooseTopCard',mode:'top'});
 const bottom=dispatchUniversalAction([pack,pack],q,{type:'chooseTopCard',mode:'bottom'});
 assert.deepEqual(top.players[0].deck.map(c=>c.uid),before);
 assert.deepEqual(bottom.players[0].deck.map(c=>c.uid),[...before.slice(1),before[0]]);
 assert.equal(bottom.players[0].outside.length,outside);
 same(bottom);same(top);
});

test('SAO-2-017 and 2-030 top-2 discard ANY 0/1/2, reorder survivors, preserve secrecy and printed triggers',()=>{
 for(const id of ['SAO-2-017','SAO-2-030']){
  const printed=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  assert.equal(printed.effectJa,
   '【登場時】自分の山札の上から2枚見る。その中から望む枚数を望む順で自分の山札の上に置き、残りを場外に置く。');
  assert.equal(printed.trigger,id==='SAO-2-017'?'active':null);
  assert.deepEqual(pack.cards[id].effects.onPlay,
   [{op:'inspectTopAnyOutside',count:2,rest:'top'}]);
  const counts={...SAO_V2_REAL_DECK_COUNTS};
  counts['SAO-1-035']-=3;counts[id]=1;counts['SAO-2-035']=2;
  assert.deepEqual(validateUniversalDeck(pack,counts),[]);
  let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:240100,first:0});
  const source=physical(s,0,id);
  s.players[0].hand.push(source);
  for(const [i,c] of (id==='SAO-2-030'?
    [physical(s,0,'SAO-2-035'),physical(s,0,'SAO-2-035')]:
    [physical(s,0,'SAO-1-035')]).entries())
   s.players[0].energy[i]=c;
  s=dispatchUniversalAction([pack,pack],s,{type:'next'});
  s=dispatchUniversalAction([pack,pack],s,{type:'next'});
  const play=legalUniversalActions([pack,pack],s).find(a=>
   a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
  assert.ok(play,id+' legally payable');
  const start=dispatchUniversalAction([pack,pack],s,play);
  assert.equal(start.pending?.kind,'effect-top-inspect-many');
  const before=start.players[0].deck.map(c=>c.uid),window=before.slice(0,2),
   outside=start.players[0].outside.length;
  assert.equal(window.length,2);
  assert.equal(universalPrivateChoices([pack,pack],start,1),null);
  assert.ok(!JSON.stringify(universalPublicView([pack,pack],start,1)).includes(window[0]));
  assert.throws(()=>dispatchUniversalAction([pack,pack],start,
   {type:'chooseInspectedOutside',uid:'forged'}),/not currently legal/);
  // 0 cards outside: deliberately reverse BOTH cards.
  let q=dispatchUniversalAction([pack,pack],start,{type:'chooseInspectedOutside',uid:null});
  assert.equal(q.pending?.kind,'effect-top-order');
  assert.equal(legalUniversalActions([pack,pack],q).length,2);
  q=dispatchUniversalAction([pack,pack],q,{type:'chooseTopOrder',uid:window[1]});
  assert.equal(q.pending?.kind,'effect-top-order');
  assert.throws(()=>dispatchUniversalAction([pack,pack],q,
   {type:'chooseTopOrder',uid:window[1]}),/not currently legal/);
  q=dispatchUniversalAction([pack,pack],q,{type:'chooseTopOrder',uid:window[0]});
  assert.deepEqual(q.players[0].deck.map(c=>c.uid),[window[1],window[0],...before.slice(2)]);
  assert.equal(q.players[0].outside.length,outside);same(q);
  // 1 card outside, one survivor; only a remaining legal UID may be ordered.
  let one=dispatchUniversalAction([pack,pack],start,{type:'chooseInspectedOutside',uid:window[0]});
  assert.equal(one.pending?.kind,'effect-top-inspect-many');
  one=dispatchUniversalAction([pack,pack],one,{type:'chooseInspectedOutside',uid:null});
  assert.equal(one.pending?.kind,'effect-top-order');
  one=dispatchUniversalAction([pack,pack],one,{type:'chooseTopOrder',uid:window[1]});
  assert.deepEqual(one.players[0].deck.map(c=>c.uid),before.slice(1));
  assert.ok(one.players[0].outside.some(c=>c.uid===window[0]));same(one);
  // 2 cards outside: no ordered survivors, no duplication.
  let two=dispatchUniversalAction([pack,pack],start,{type:'chooseInspectedOutside',uid:window[0]});
  two=dispatchUniversalAction([pack,pack],two,{type:'chooseInspectedOutside',uid:window[1]});
  assert.equal(two.pending,null);
  assert.deepEqual(two.players[0].deck.map(c=>c.uid),before.slice(2));
  assert.equal(two.players[0].outside.length,outside+2);same(two);
 }
});
test('MST-1-010 blue 3 energy: inspect 3, reorder all on TOP, never optional outside',()=>{
 const id='MST-1-010',official=UA54BT_OFFICIAL_PRINT[id];
 assert.equal(official.effectJa,'〖登場時〗 自分の山札の上から3枚見て、望む順で山札の上に置く。');
 assert.equal(official.energy,3);assert.equal(official.trigger,'draw');
 const mst=requireRegisteredV2TitlePack('mushoku-tensei'),packs=[mst,mst];
 assert.deepEqual(mst.cards[id].effects.onPlay,
  [{op:'inspectTopArrange',count:3,toOutside:false,rest:'top'}]);
 const counts={...MST_V2_REAL_DECK_COUNTS};
 counts['MST-1-050']--;counts[id]=1;
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:10010,first:0});
 const unit=physical(s,0,id),blue2=physical(s,0,'MST-1-019'),
  blue1=physical(s,0,'MST-1-001');
 s.players[0].hand.push(unit);s.players[0].energy[0]=blue2;s.players[0].energy[1]=blue1;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===unit.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'paid MST-1-010 must have three original blue energy');
 let q=dispatchUniversalAction(packs,s,play);
 assert.equal(q.pending?.kind,'effect-top-order');
 const before=q.players[0].deck.map(c=>c.uid),uids=before.slice(0,3),outside=q.players[0].outside.length;
 assert.equal(uids.length,3);
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.deepEqual(legalUniversalActions(packs,q).map(x=>x.uid).sort(),uids.slice().sort());
 assert.ok(!legalUniversalActions(packs,q).some(x=>x.type==='chooseInspectedOutside'));
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseTopOrder',uid:'other-uid'}),/not currently legal/);
 for(const uid of uids.slice().reverse())q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid});
 assert.deepEqual(q.players[0].deck.map(c=>c.uid),[...uids].reverse().concat(before.slice(3)));
 assert.equal(q.players[0].outside.length,outside);
 assert.equal(q.pending,null);assert.equal(assertUniversalMatch(packs,q),true);
});

test('SAO four colors FINAL event recover up to two AP: printed AP payment, decline, UID and legal trigger profile',()=>{
 for(const [id,generator] of [
  ['SAO-1-032','SAO-1-019'], // yellow
  ['SAO-1-063','SAO-1-035'], // blue
  ['SAO-1-098','SAO-1-068'], // green
  ['SAO-2-057','SAO-2-035'] // purple
 ]){
  const official=SAO_OFFICIAL_CARDS.find(x=>x.id===id),def=pack.cards[id];
  assert.equal(official.effectJa,'自分のAPカードを2枚まで選び、アクティブにする。');
  assert.equal(official.type,'event');assert.equal(official.trigger,'final');
  assert.equal(official.energy,3);assert.equal(official.ap,1);
  assert.deepEqual(def.effects.onPlay,[{op:'recoverAp',count:2}]);
  const counts={...SAO_V2_REAL_DECK_COUNTS};
  if(counts[generator]){
   counts['SAO-1-054']--;counts[id]=1;
  }else{
   counts['SAO-1-054']-=2;counts['SAO-1-035']-=2;
   counts[generator]=3;counts[id]=1;
  }
  assert.deepEqual(validateUniversalDeck(pack,counts),[],id);
  let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:208057,first:0});
  const ev=physical(s,0,id);s.players[0].hand.push(ev);
  for(let n=0;n<3;n++)s.players[0].energy[n]=physical(s,0,generator);
  for(let n=0;n<2;n++)s=dispatchUniversalAction([pack,pack],s,{type:'next'});
  const beforeOutside=s.players[0].outside.length;
  const action=legalUniversalActions([pack,pack],s).find(a=>a.type==='event'&&a.uid===ev.uid);
  assert.ok(action,'printed '+id+' must have legally payable correct-color generator');
  const pending=dispatchUniversalAction([pack,pack],s,action);
  assert.equal(pending.pending?.kind,'effect-recover-ap');
  assert.ok(pending.players[0].outside.some(x=>x.uid===ev.uid));
  assert.equal(pending.players[0].outside.length,beforeOutside+1);
  assert.equal(pending.players[0].apCards.filter(x=>x.ready).length,0);
  const options=legalUniversalActions([pack,pack],pending);
  assert.ok(options.some(x=>x.type==='chooseApRecovery'&&x.uid===null));
  assert.ok(options.some(x=>x.type==='chooseApRecovery'&&x.uid!==null));
  assert.throws(()=>dispatchUniversalAction([pack,pack],pending,
   {type:'chooseApRecovery',uid:'fake-AP'}),/not currently legal/);
  const declined=dispatchUniversalAction([pack,pack],pending,{type:'chooseApRecovery',uid:null});
  assert.equal(declined.pending,null);
  assert.equal(declined.players[0].apCards.filter(x=>x.ready).length,0);
  const recover=options.find(x=>x.type==='chooseApRecovery'&&x.uid!==null);
  const accepted=dispatchUniversalAction([pack,pack],pending,recover);
  assert.equal(accepted.players[0].apCards.filter(x=>x.ready).length,1);
  assert.equal(accepted.pending,null,'cannot recover unused AP objects');
  same(accepted);same(declined);
 }
});

test('SAO-1-075 and SAO-1-089 retain BOTH STEP movement and exact top-deck onPlay behavior',()=>{
 for(const id of ['SAO-1-075','SAO-1-089']){
  const source=SAO_OFFICIAL_CARDS.find(x=>x.id===id),definition=pack.cards[id];
  assert.equal(source.effectJa.startsWith('【ステップ】'),true);
  assert.equal(source.effectJa.includes('【登場時】'),true);
  assert.equal(source.trigger,null);
  assert.equal(definition.implementation,'dsl','STEP alone cannot suppress onPlay');
  assert.equal(definition.step,true);
  assert.deepEqual(definition.effects.onPlay,id==='SAO-1-075'?
   [{op:'inspectTopAnyOutside',count:2,rest:'top'}]:[{op:'peekTopOrBottom'}]);
  const counts={...SAO_V2_REAL_DECK_COUNTS};
  counts['SAO-1-035']-=2;counts[id]=1;counts['SAO-1-095']=1;
  assert.deepEqual(validateUniversalDeck(pack,counts),[]);
  const packs=[pack,pack];
  let s=newUniversalMatch(packs,{decks:[counts,counts],seed:75089,first:0});
  const character=physical(s,0,id),generator=physical(s,0,'SAO-1-095');
  s.players[0].energy[0]=generator;s.players[0].hand.push(character);
  for(let n=0;n<2;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
  const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&
   x.uid===character.uid&&x.line==='front'&&x.slot===0);
  assert.ok(play,'green 3 generator should fund full printed card');
  let q=dispatchUniversalAction(packs,s,play);
  const deckBefore=q.players[0].deck.map(x=>x.uid),outside=q.players[0].outside.length;
  if(id==='SAO-1-075'){
   assert.equal(q.pending?.kind,'effect-top-inspect-many');
   q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:null});
   assert.equal(q.pending?.kind,'effect-top-order');
   q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid:deckBefore[1]});
   q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid:deckBefore[0]});
   assert.deepEqual(q.players[0].deck.map(x=>x.uid),
    [deckBefore[1],deckBefore[0],...deckBefore.slice(2)]);
  }else{
   assert.equal(q.pending?.kind,'private-top-place');
   q=dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'bottom'});
   assert.deepEqual(q.players[0].deck.map(x=>x.uid),[...deckBefore.slice(1),deckBefore[0]]);
  }
  assert.equal(q.players[0].outside.length,outside);
  assert.equal(q.players[0].front[0].uid,character.uid);
  assert.equal(assertUniversalMatch(packs,q),true);
  // STEP is a separate movement-phase ability; test independently of onPlay.
  let move=newUniversalMatch(packs,{decks:[counts,counts],seed:75090,first:0});
  const moving=physical(move,0,id);
  move.players[0].front[0]=moving;
  move=dispatchUniversalAction(packs,move,{type:'next'});
  const step=legalUniversalActions(packs,move).find(x=>x.type==='step'&&x.uid===moving.uid);
  assert.ok(step,'STEP must remain live with a separate onPlay program');
  move=dispatchUniversalAction(packs,move,step);
  assert.ok(move.players[0].energy.some(x=>x?.uid===moving.uid));
  assert.equal(move.players[0].front[0],null);
  assert.equal(assertUniversalMatch(packs,move),true);
 }
});

test('blocked next-wave cards are source-locked, NOT wrongly registered with partial search or unsupported leave/Raid',()=>{
 const mst=requireRegisteredV2TitlePack('mushoku-tensei');
 // SAO-1-031 graduated only after R37 exact full-print test and separate manifest pin.
 assert.deepEqual(pack.cards['SAO-1-031'].effects.onPlay,[{op:'searchTopUpToTwoBottom',count:5,max:2,rest:'bottom',
  filters:[{field:'name',value:'キリト'},{field:'name',value:'アリス'},{field:'name',value:'ユージオ'}],logic:'any'}]);
 const pending=[
  ['SAO-2-066',/上から2枚見る.*緑の.*1枚まで場外/,pack],
  ['SAO-2-062',/2枚引き.*2枚場外/,pack],
  ['SAO-2-018',/【退場時】.*上から5枚見る/,pack],
  ['SAO-1-081',/自分のターン開始時.*退場/,pack],
  ['MST-1-028',/山札の上から2枚.*残りを場外/,mst],
  ['MST-1-068',/〖レイド〗.*〈シルフィエット〉/,mst]
 ];
 for(const [id,text,targetPack] of pending){
  const record=id.startsWith('SAO')?
   SAO_OFFICIAL_CARDS.find(c=>c.id===id):UA54BT_OFFICIAL_PRINT[id];
  assert.ok(record?.effectJa,id+' needs an actual official source');
  assert.match(record.effectJa,text,id+' checked Japanese condition or timing changed');
  assert.equal(targetPack.cards[id],undefined,
   id+' has not passed full profile+legal choice verification; never treat as playable');
 }
 assert.ok(!V2_EFFECT_TIMINGS.includes('onLeave'),
  'leave-time source must not be falsely translated to onPlay');
 assert.throws(()=>createUniversalPack({id:'TEST-ONLY-strict',cards:[{
  id:'TEST-ONLY-X',name:'Synthetic',color:'blue',type:'character',
  energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',
  effects:{onPlay:[{op:'drawDiscard',count:2}]}
 }]}),/invalid mandatory draw\/discard profile/);
});

test('four official SAO ACTIVE generators contribute +1 energy only while ACTIVE in own energy line',()=>{
 const examples=[
  ['SAO-1-003','yellow','黄'],
  ['SAO-1-052','blue','青'],
  ['SAO-1-073','green','緑'],
  ['SAO-2-048','purple','紫']
 ];
 for(const [id,color,ja] of examples){
  const printed=SAO_OFFICIAL_CARDS.find(c=>c.id===id),def=pack.cards[id];
  assert.equal(printed.effectJa,
   'このキャラがアクティブの場合、このキャラの発生エナジー+【'+ja+'】。');
  assert.equal(printed.color,color);
  assert.equal(printed.trigger,null);
  assert.equal(printed.energy,2);assert.equal(printed.ap,1);
  assert.equal(printed.gen,2);assert.equal(def.activeExtraEnergy,1);
  assert.deepEqual(def.effects,{},'pure continuous energy has no fake onPlay');
  const counts={...SAO_V2_REAL_DECK_COUNTS};
  counts['SAO-1-035']--;counts[id]=1;
  assert.deepEqual(validateUniversalDeck(pack,counts),[]);
  let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:125503,first:0});
  const generator=physical(s,0,id);
  generator.ready=true;s.players[0].energy[0]=generator;
  const ready=universalEnergyByColor([pack,pack],s,0);
  assert.equal(ready[color],3,id+' active produces 2+1');
  assert.equal((universalEnergyByColor([pack,pack],s,1)[color]||0),0,
   'enemy cannot borrow active card energy');
  assert.equal(assertUniversalMatch([pack,pack],s),true);
  generator.ready=false;
  const rested=universalEnergyByColor([pack,pack],s,0);
  assert.equal(rested[color],2,id+' resting loses bonus only');
  assert.equal(assertUniversalMatch([pack,pack],s),true);
  generator.ready=true;
  s.players[0].energy[0]=null;s.players[0].front[0]=generator;
  assert.equal(universalEnergyByColor([pack,pack],s,0)[color]||0,0,
   id+' front-line unit cannot generate energy');
  assert.equal(assertUniversalMatch([pack,pack],s),true);
 }
});
