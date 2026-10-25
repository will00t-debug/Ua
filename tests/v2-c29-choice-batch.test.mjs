import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalPublicView,universalPrivateChoices,
 universalBp,universalImpact,universalAttackDamage}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Official images checked 2026-10-25. Catalogue Chinese is the fingerprint.
// fullyAccepted stays 0.
// EX15BT/BLC-4-043 眠七號
//   このカードは〈涅 ネム〉としても扱う。登場時 自分の山札の上から2枚見て、
//   青の〈涅 マユリ〉か〈涅 ネム〉か[特徴:涅骸部隊]を1枚まで場外に置く。
//   残りを望む順で山札の上に置く。
//   青の modifies only 〈涅 マユリ〉. 〈涅 ネム〉 and 涅骸部隊 are not color-locked.
// EX15BT/BLC-4-081 花天狂骨枯松心中
//   自分の場に〈京楽 春水〉がある場合のみ。BP5000以下の相手フロントを1枚退場。
//   自分のエナジーの〈花天〉か〈狂骨〉を1枚までアクティブ。
// EX15BT/BLC-4-021 バーニング・フル・フィンガーズ
//   〈バズビー〉がいる場合のみ。BP5000以下を退場。必要エナジー5以上の〈バズビー〉が
//   いるとき、自分の場の〈バズビー〉1枚までこのターンBP+1000。
// EX15BT/BLC-4-068 京楽 春水
//   インパクト無効。起動メイン：フロント、このキャラがレストのとき、1APで
//   アクティブにし、相手フロント1枚までレスト。すべての〈京楽 春水〉で1ターン1回。
// EX07BT/BLC-2-064 草鹿 やちる
//   起動メイン：レストにして退場。自分の場の〈更木 剣八〉1枚まで、
//   このターン、インパクト+1 か ダメージ+1。

const bleach=registeredV2TitlePack('bleach');
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const blue=realDeck(['BLC-4-043','BLC-2-036','BLC-4-040','BLC-2-044','BLC-2-016','BLC-2-025'],'blue');
const green=realDeck(['BLC-4-081','BLC-4-068','BLC-2-064','BLC-3-007','BLC-4-076','BLC-1-076','BLC-4-070','BLC-2-067','BLC-1-079','BLC-1-080'],'green');
const yellow=realDeck(['BLC-4-021','BLC-1-011','BLC-2-003','BLC-4-001','BLC-1-002','BLC-1-001','BLC-1-009','BLC-1-016'],'yellow');
function takeFrom(s,p,id,zones){
 for(const zone of zones){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function take(s,p,id){
 return takeFrom(s,p,id,['hand','deck','life','outside','removed']);
}
function put(s,p,id,line,index,ready=true){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function stack(s,ids){
 for(const id of [...ids].reverse())
  s.players[0].deck.unshift(takeFrom(s,0,id,['deck','life','outside','removed','hand']));
}
function main(deck,seed,first=0){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first});
 for(let n=0;n<8&&!(s.phase==='main'&&s.active===first);n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(s.active,first);
 return {packs,s};
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy,...s.players[p].outside,
  ...s.players[p].hand,...s.players[p].deck].find(c=>c?.uid===uid);
}
function shell(extra){
 return {id:'BAD',name:'BAD',color:'blue',energy:0,ap:1,bp:1500,gen:1,traits:[],
  trigger:'draw',implementation:'dsl',type:'character',effects:{},...extra};
}
const orMatch={op:'inspectTopOrMatchOutside',count:2,rest:'top',max:1,matches:[
 {color:'blue',name:'涅 マユリ'},{name:'涅 ネム'},{trait:'涅骸部隊'}]};

test('BLC-4-043 looks at two cards and may put one blue Mayuri, Nem, or trait card outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-043');
 assert.equal(printed.nameJa,'眠七號');
 assert.equal(printed.effect,'此卡也視為《涅音夢》。登場時：查看牌庫頂2張，可將最多1張藍色《涅繭利》、《涅音夢》或具有「涅骸部隊」特徵的卡送至場外，其餘依任意順序放回牌庫頂。');
 const card=bleach.cards['BLC-4-043'];
 assert.equal(card.gen,1);
 assert.equal(card.step,false);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.nameAliases,['涅 ネム']);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[orMatch]);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({effects:{onPlay:[
  {...orMatch,count:3}]}})]}),/invalid top or-match outside/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',bp:0,gen:0,effects:{onPlay:[orMatch]}})]}),
  /top or-match outside is only a character onPlay effect/);

 const openedMatch=main(blue,291043);
 const event=hold(openedMatch.s,0,'BLC-4-043');
 stack(openedMatch.s,['BLC-2-036','BLC-2-016']);
 const [mayuri,ichigo]=openedMatch.s.players[0].deck.slice(0,2);
 const play=legalUniversalActions(openedMatch.packs,openedMatch.s).find(a=>a.type==='play'&&a.uid===event.uid&&a.line==='front');
 let opened=dispatchUniversalAction(openedMatch.packs,openedMatch.s,play);
 assert.equal(opened.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(opened.pending.choices,[mayuri.uid]);
 assert.equal(universalPrivateChoices(openedMatch.packs,opened,0)?.options.length,2);
 assert.equal(universalPrivateChoices(openedMatch.packs,opened,1),null);
 assert.equal(universalPublicView(openedMatch.packs,opened,1).pending.kind,'effect-top-trait-outside');
 aiOk(openedMatch.packs,opened);
 assert.throws(()=>dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseTopTraitOutside',uid:ichigo.uid}),
  /not currently legal/);
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseTopTraitOutside',uid:mayuri.uid});
 assert.equal(opened.players[0].outside.some(c=>c.uid===mayuri.uid),true);
 assert.equal(opened.pending.kind,'effect-top-order');
 assert.equal(opened.pending.rest,'top');
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseTopOrder',uid:ichigo.uid});
 assert.equal(opened.pending,null);
 assert.equal(opened.players[0].deck[0].uid,ichigo.uid);
 assertUniversalMatch(openedMatch.packs,opened);

 const alias=main(blue,291044);
 const self=hold(alias.s,0,'BLC-4-043');
 stack(alias.s,['BLC-4-043','BLC-2-016']);
 const copy=alias.s.players[0].deck[0];
 let aliased=dispatchUniversalAction(alias.packs,alias.s,
  legalUniversalActions(alias.packs,alias.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.deepEqual(aliased.pending.choices,[copy.uid]);
 aliased.pending.orMatches=[{color:'purple',name:'涅 マユリ'},{name:'涅 ネム'},{trait:'涅骸部隊'}];
 assert.throws(()=>assertUniversalMatch(alias.packs,aliased),/Unproven top or-match outside/);

 const trait=main(blue,291045);
 const body=hold(trait.s,0,'BLC-4-043');
 stack(trait.s,['BLC-2-044','BLC-4-040']);
 const [corps,nem]=trait.s.players[0].deck;
 let looked=dispatchUniversalAction(trait.packs,trait.s,
  legalUniversalActions(trait.packs,trait.s).find(a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'));
 assert.deepEqual(looked.pending.choices.sort(),[corps.uid,nem.uid].sort());
 looked=dispatchUniversalAction(trait.packs,looked,{type:'chooseTopTraitOutside',uid:null});
 assert.equal(looked.pending.kind,'effect-top-order');
 looked=dispatchUniversalAction(trait.packs,looked,{type:'chooseTopOrder',uid:nem.uid});
 looked=dispatchUniversalAction(trait.packs,looked,{type:'chooseTopOrder',uid:corps.uid});
 assert.equal(looked.players[0].deck[0].uid,nem.uid);
 assert.equal(looked.players[0].deck[1].uid,corps.uid);

 const none=main(blue,291046);
 const plain=hold(none.s,0,'BLC-4-043');
 stack(none.s,['BLC-2-016','BLC-2-025']);
 const ordered=none.s.players[0].deck.slice(0,2).map(c=>c.uid);
 let missed=dispatchUniversalAction(none.packs,none.s,
  legalUniversalActions(none.packs,none.s).find(a=>a.type==='play'&&a.uid===plain.uid&&a.line==='front'));
 assert.equal(missed.pending.kind,'effect-top-order');
 assert.equal(missed.pending.choices,undefined);
 missed=dispatchUniversalAction(none.packs,missed,{type:'chooseTopOrder',uid:ordered[1]});
 missed=dispatchUniversalAction(none.packs,missed,{type:'chooseTopOrder',uid:ordered[0]});
 assert.equal(missed.players[0].deck[0].uid,ordered[1]);

 const actor={...shell({id:'ACT',name:'眠',effects:{onPlay:[orMatch]}})};
 const purple={id:'PMAY',name:'涅 マユリ',color:'purple',energy:0,ap:1,bp:1500,gen:1,type:'character',traits:[],trigger:null,implementation:'vanilla'};
 const blueMayuri={id:'BMAY',name:'涅 マユリ',color:'blue',energy:0,ap:1,bp:1500,gen:1,type:'character',traits:[],trigger:null,implementation:'vanilla'};
 const yellowNem={id:'YNEM',name:'涅 ネム',color:'yellow',energy:0,ap:1,bp:1500,gen:1,type:'character',traits:[],trigger:null,implementation:'vanilla'};
 const greenTrait={id:'CORPS',name:'部隊',color:'green',energy:0,ap:1,bp:1000,gen:1,type:'character',traits:['涅骸部隊'],trigger:null,implementation:'vanilla'};
 const other={id:'OTHER',name:'別',color:'blue',energy:0,ap:1,bp:1000,gen:1,type:'character',traits:[],trigger:null,implementation:'vanilla'};
 const fillers=Array.from({length:7},(_,i)=>({id:'F'+i,name:'F'+i,color:'blue',energy:0,ap:1,bp:1000,gen:1,type:'character',traits:[],trigger:null,implementation:'vanilla'}));
 const cards=[actor,purple,blueMayuri,yellowNem,greenTrait,other,...fillers];
 const pack=createUniversalPack({id:'or-match',cards});
 const ids=cards.map(c=>c.id);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 const packs=[pack,pack];
 let mixed=newUniversalMatch(packs,{decks:[counts,counts],seed:291047,first:0});
 for(let n=0;n<8&&mixed.phase!=='main';n++)mixed=dispatchUniversalAction(packs,mixed,{type:'next'});
 const played=hold(mixed,0,'ACT');
 stackOn(mixed,['PMAY','BMAY','YNEM','CORPS','OTHER']);
 mixed=dispatchUniversalAction(packs,mixed,legalUniversalActions(packs,mixed).find(a=>a.type==='play'&&a.uid===played.uid));
 const window=mixed.players[0].deck.slice(0,2);
 assert.deepEqual(mixed.pending.choices,[window[1].uid]);
 assert.equal(window[0].cardId,'PMAY');
 assert.equal(window[1].cardId,'BMAY');
});

function stackOn(s,ids){
 for(const id of [...ids].reverse())
  s.players[0].deck.unshift(takeFrom(s,0,id,['deck','life','outside','removed','hand']));
}

test('BLC-4-081 retires one front at BP 5000 and may activate energy-line Katen or Kyokotsu',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-081');
 assert.equal(printed.nameJa,'花天狂骨枯松心中');
 const card=bleach.cards['BLC-4-081'];
 assert.equal(card.playRequiresOwnName,'京楽 春水');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,['花天狂骨']);
 assert.equal(card.effects.onPlay.length,2);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',bp:0,gen:0,energy:4,color:'green',trigger:'special',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'retireOppFrontOneMandatory',bp:5000,optional:true}]}})]}),
  /invalid mandatory BP-limited opponent retirement/);

 const openedMatch=main(green,291081);
 put(openedMatch.s,0,'BLC-3-007','energy',0,true);
 const katen=put(openedMatch.s,0,'BLC-4-076','energy',1,false);
 put(openedMatch.s,0,'BLC-1-076','energy',2,true);
 put(openedMatch.s,0,'BLC-1-079','energy',3,true);
 const front=put(openedMatch.s,0,'BLC-4-070','front',0,false);
 const foe=put(openedMatch.s,1,'BLC-1-076','front',0,true);
 assert.ok((universalEnergyByColor(openedMatch.packs,openedMatch.s,0).green||0)>=4);
 const event=hold(openedMatch.s,0,'BLC-4-081');
 assert.ok(legalUniversalActions(openedMatch.packs,openedMatch.s).some(a=>a.type==='event'&&a.uid===event.uid));
 let opened=dispatchUniversalAction(openedMatch.packs,openedMatch.s,{type:'event',uid:event.uid});
 assert.equal(opened.pending.kind,'effect-retire-bp');
 assert.equal(opened.pending.optional,false);
 assert.equal(opened.pending.limit,5000);
 assert.throws(()=>dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseRetireBp',uid:null}),
  /not currently legal/);
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseRetireBp',uid:foe.uid});
 assert.equal(live(opened,1,foe.uid).uid,foe.uid);
 assert.equal(opened.players[1].outside.some(c=>c.uid===foe.uid),true);
 assert.equal(opened.pending.kind,'effect-active-energy-names');
 assert.deepEqual(opened.pending.names,['花天','狂骨']);
 assert.deepEqual(opened.pending.choices,[katen.uid]);
 assert.equal(opened.pending.choices.includes(front.uid),false);
 aiOk(openedMatch.packs,opened);
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseActiveEnergyNames',uid:katen.uid});
 assert.equal(live(opened,0,katen.uid).ready,true);
 assert.equal(opened.pending,null);
 assertUniversalMatch(openedMatch.packs,opened);

 const skipped=main(green,291082);
 put(skipped.s,0,'BLC-3-007','energy',0,true);
 const rested=put(skipped.s,0,'BLC-4-076','energy',1,false);
 put(skipped.s,0,'BLC-1-076','energy',2,true);
 put(skipped.s,0,'BLC-1-079','energy',3,true);
 const low=put(skipped.s,1,'BLC-1-076','front',0,true);
 const skipEvent=hold(skipped.s,0,'BLC-4-081');
 let declined=dispatchUniversalAction(skipped.packs,skipped.s,{type:'event',uid:skipEvent.uid});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseRetireBp',uid:low.uid});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseActiveEnergyNames',uid:null});
 assert.equal(live(declined,0,rested.uid).ready,false);
 assert.equal(declined.players[1].outside.some(c=>c.uid===low.uid),true);

 const bare=main(green,291083);
 put(bare.s,0,'BLC-1-076','energy',0,true);
 put(bare.s,0,'BLC-1-079','energy',1,true);
 put(bare.s,0,'BLC-4-076','energy',2,true);
 put(bare.s,0,'BLC-4-070','energy',3,true);
 put(bare.s,1,'BLC-1-076','front',0,true);
 const held=hold(bare.s,0,'BLC-4-081');
 const handKyoraku=hold(bare.s,0,'BLC-3-007');
 assert.equal(legalUniversalActions(bare.packs,bare.s).some(a=>a.type==='event'&&a.uid===held.uid),false);
 put(bare.s,1,'BLC-3-007','front',1,true);
 assert.equal(legalUniversalActions(bare.packs,bare.s).some(a=>a.type==='event'&&a.uid===held.uid),false);
 bare.s.players[0].hand.splice(bare.s.players[0].hand.findIndex(c=>c.uid===handKyoraku.uid),1);
 bare.s.players[0].front[0]=handKyoraku;
 handKyoraku.ready=true;handKyoraku.fieldEntryStamp=bare.s.nextFieldEntryStamp++;
 assert.ok(legalUniversalActions(bare.packs,bare.s).some(a=>a.type==='event'&&a.uid===held.uid));

 const high=main(green,291084);
 put(high.s,0,'BLC-3-007','energy',0,true);
 put(high.s,0,'BLC-4-076','energy',1,true);
 put(high.s,0,'BLC-1-076','energy',2,true);
 put(high.s,0,'BLC-1-079','energy',3,true);
 const big=put(high.s,1,'BLC-4-070','front',0,true);
 big.buffs=[{bp:2000,untilTurn:high.s.turn}];
 assert.ok(universalBp(high.packs,high.s,big)>5000);
 const blocked=hold(high.s,0,'BLC-4-081');
 assert.equal(legalUniversalActions(high.packs,high.s).some(a=>a.type==='event'&&a.uid===blocked.uid),false);
 big.buffs=[{bp:1000,untilTurn:high.s.turn}];
 assert.equal(universalBp(high.packs,high.s,big),5000);
 assert.ok(legalUniversalActions(high.packs,high.s).some(a=>a.type==='event'&&a.uid===blocked.uid));
});

test('BLC-4-021 retires one front at BP 5000 and may buff a Bazz when a 5-energy Bazz is on the field',()=>{
 const card=bleach.cards['BLC-4-021'];
 assert.equal(card.playRequiresOwnName,'バズビー');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.effects.onPlay[1],{op:'buffOwnNameIfEnergyAtLeast',name:'バズビー',minPrintedEnergy:5,bp:1000,optional:true});
 const openedMatch=main(yellow,291021);
 const tall=put(openedMatch.s,0,'BLC-1-011','energy',0,true);
 const short=put(openedMatch.s,0,'BLC-2-003','energy',1,true);
 const alias=put(openedMatch.s,0,'BLC-4-001','energy',2,true);
 const other=put(openedMatch.s,0,'BLC-1-002','energy',3,true);
 const foe=put(openedMatch.s,1,'BLC-1-002','front',0,true);
 assert.ok((universalEnergyByColor(openedMatch.packs,openedMatch.s,0).yellow||0)>=4);
 const event=hold(openedMatch.s,0,'BLC-4-021');
 let opened=dispatchUniversalAction(openedMatch.packs,openedMatch.s,{type:'event',uid:event.uid});
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseRetireBp',uid:foe.uid});
 assert.equal(opened.pending.kind,'effect-buff-own');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.bp,1000);
 assert.deepEqual(opened.pending.choices.sort(),[tall.uid,short.uid,alias.uid].sort());
 assert.equal(opened.pending.choices.includes(other.uid),false);
 aiOk(openedMatch.packs,opened);
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseOwnBuff',uid:short.uid});
 assert.equal(universalBp(openedMatch.packs,opened,live(opened,0,short.uid)),
  bleach.cards['BLC-2-003'].bp+1000);
 assert.equal(universalBp(openedMatch.packs,opened,live(opened,0,tall.uid)),bleach.cards['BLC-1-011'].bp);
 assertUniversalMatch(openedMatch.packs,opened);

 const low=main(yellow,291022);
 put(low.s,0,'BLC-2-003','energy',0,true);
 put(low.s,0,'BLC-4-001','energy',1,true);
 put(low.s,0,'BLC-1-002','energy',2,true);
 put(low.s,0,'BLC-1-001','energy',3,true);
 const victim=put(low.s,1,'BLC-1-002','front',0,true);
 const onlyLow=hold(low.s,0,'BLC-4-021');
 assert.ok(legalUniversalActions(low.packs,low.s).some(a=>a.type==='event'&&a.uid===onlyLow.uid));
 let finished=dispatchUniversalAction(low.packs,low.s,{type:'event',uid:onlyLow.uid});
 finished=dispatchUniversalAction(low.packs,finished,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(finished.pending,null);
 assert.equal(finished.players[1].outside.some(c=>c.uid===victim.uid),true);

 const missing=main(yellow,291023);
 put(missing.s,0,'BLC-1-002','energy',0,true);
 put(missing.s,0,'BLC-1-001','energy',1,true);
 put(missing.s,0,'BLC-1-009','energy',2,true);
 put(missing.s,0,'BLC-1-016','energy',3,true);
 put(missing.s,1,'BLC-1-002','front',0,true);
 const absent=hold(missing.s,0,'BLC-4-021');
 assert.equal(legalUniversalActions(missing.packs,missing.s).some(a=>a.type==='event'&&a.uid===absent.uid),false);
});

test('BLC-4-068 pays 1 AP while rested on the front, becomes ACTIVE, and may rest one opponent',()=>{
 const card=bleach.cards['BLC-4-068'];
 assert.equal(card.impactNull,true);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'restPayNameActiveRest');
 const openedMatch=main(green,291068);
 const self=put(openedMatch.s,0,'BLC-4-068','front',0,false);
 const copy=put(openedMatch.s,0,'BLC-4-068','front',1,false);
 const energyCopy=put(openedMatch.s,0,'BLC-4-068','energy',0,false);
 const active=put(openedMatch.s,0,'BLC-4-068','front',2,true);
 const foe=put(openedMatch.s,1,'BLC-1-076','front',0,true);
 const before=openedMatch.s.players[0].apCards.filter(c=>c.ready).length;
 assert.ok(legalUniversalActions(openedMatch.packs,openedMatch.s).some(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='restPayNameActiveRest'));
 assert.equal(legalUniversalActions(openedMatch.packs,openedMatch.s).some(a=>a.uid===energyCopy.uid&&a.mode==='restPayNameActiveRest'),false);
 assert.equal(legalUniversalActions(openedMatch.packs,openedMatch.s).some(a=>a.uid===active.uid&&a.mode==='restPayNameActiveRest'),false);
 let opened=dispatchUniversalAction(openedMatch.packs,openedMatch.s,{type:'activate',uid:self.uid,mode:'restPayNameActiveRest'});
 assert.equal(live(opened,0,self.uid).ready,true);
 assert.equal(opened.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.equal(opened.pending.kind,'effect-rest-bp');
 assert.equal(opened.pending.optional,true);
 assert.ok(opened.mainReadyOnceByName[0].includes('京楽 春水|restPayNameActiveRest'));
 const spent=opened.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 spent.ready=true;
 assert.equal(legalUniversalActions(openedMatch.packs,opened).some(a=>a.uid===copy.uid&&a.mode==='restPayNameActiveRest'),false);
 opened=dispatchUniversalAction(openedMatch.packs,opened,{type:'chooseRestBp',uid:null});
 assert.equal(live(opened,1,foe.uid).ready,true);
 assert.equal(live(opened,0,self.uid).ready,true);
 assertUniversalMatch(openedMatch.packs,opened);

 const accepted=main(green,291069);
 const body=put(accepted.s,0,'BLC-4-068','front',0,false);
 const target=put(accepted.s,1,'BLC-1-076','front',0,true);
 let rested=dispatchUniversalAction(accepted.packs,accepted.s,{type:'activate',uid:body.uid,mode:'restPayNameActiveRest'});
 rested=dispatchUniversalAction(accepted.packs,rested,{type:'chooseRestBp',uid:target.uid});
 assert.equal(live(rested,1,target.uid).ready,false);
 assert.equal(rested.pending,null);

 const broke=main(green,291070);
 const quiet=put(broke.s,0,'BLC-4-068','front',0,false);
 for(const ap of broke.s.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(broke.packs,broke.s).some(a=>a.uid===quiet.uid&&a.mode==='restPayNameActiveRest'),false);
});

test('BLC-2-064 rests, retires, and may grant Kenpachi Impact +1 or Damage +1',()=>{
 const card=bleach.cards['BLC-2-064'];
 assert.equal(card.mainAbility.op,'restRetireNamedMode');
 assert.equal(card.mainAbility.name,'更木 剣八');
 assert.deepEqual(card.traits,['護廷十三隊']);
 const impact=main(green,291064);
 const self=put(impact.s,0,'BLC-2-064','front',0,true);
 const ken=put(impact.s,0,'BLC-4-070','front',1,true);
 const other=put(impact.s,0,'BLC-1-076','front',2,true);
 const handKen=hold(impact.s,0,'BLC-1-080');
 const oppKen=put(impact.s,1,'BLC-4-070','front',0,true);
 assert.equal(universalImpact(impact.packs,impact.s,ken),0);
 let granted=dispatchUniversalAction(impact.packs,impact.s,{type:'activate',uid:self.uid,mode:'restRetireNamedMode'});
 assert.equal(granted.players[0].outside.some(c=>c.uid===self.uid),true);
 assert.equal(granted.pending.kind,'effect-named-grant-mode');
 assert.deepEqual(granted.pending.choices,[ken.uid]);
 assert.equal(granted.pending.choices.includes(other.uid),false);
 assert.equal(granted.pending.choices.includes(handKen.uid),false);
 assert.equal(granted.pending.choices.includes(oppKen.uid),false);
 aiOk(impact.packs,granted);
 granted=dispatchUniversalAction(impact.packs,granted,{type:'chooseNamedGrant',uid:ken.uid,mode:'impact'});
 const kenAfter=live(granted,0,ken.uid);
 assert.equal(universalImpact(impact.packs,granted,kenAfter),1);
 assert.equal(universalAttackDamage(impact.packs,granted,kenAfter),1);
 assert.equal(granted.pending,null);
 assertUniversalMatch(impact.packs,granted);

 const damage=main(green,291065);
 const yachiru=put(damage.s,0,'BLC-2-064','energy',0,true);
 const printed=put(damage.s,0,'BLC-2-067','front',0,true);
 assert.equal(universalImpact(damage.packs,damage.s,printed),1);
 let boosted=dispatchUniversalAction(damage.packs,damage.s,{type:'activate',uid:yachiru.uid,mode:'restRetireNamedMode'});
 assert.ok(boosted.pending.choices.includes(printed.uid));
 boosted=dispatchUniversalAction(damage.packs,boosted,{type:'chooseNamedGrant',uid:printed.uid,mode:'damage'});
 const after=live(boosted,0,printed.uid);
 assert.equal(universalAttackDamage(damage.packs,boosted,after),2);
 assert.equal(universalImpact(damage.packs,boosted,after),1);
 const plus=main(green,291066);
 const source=put(plus.s,0,'BLC-2-064','front',0,true);
 const veteran=put(plus.s,0,'BLC-2-067','energy',0,true);
 let raised=dispatchUniversalAction(plus.packs,plus.s,{type:'activate',uid:source.uid,mode:'restRetireNamedMode'});
 raised=dispatchUniversalAction(plus.packs,raised,{type:'chooseNamedGrant',uid:veteran.uid,mode:'impact'});
 assert.equal(universalImpact(plus.packs,raised,live(raised,0,veteran.uid)),2);

 const skipped=main(green,291067);
 const resting=put(skipped.s,0,'BLC-2-064','front',0,false);
 const untouched=put(skipped.s,0,'BLC-4-070','front',1,true);
 assert.equal(legalUniversalActions(skipped.packs,skipped.s).some(a=>a.uid===resting.uid&&a.mode==='restRetireNamedMode'),false);
 resting.ready=true;
 const twin=put(skipped.s,0,'BLC-2-064','energy',1,true);
 let left=dispatchUniversalAction(skipped.packs,skipped.s,{type:'activate',uid:resting.uid,mode:'restRetireNamedMode'});
 left=dispatchUniversalAction(skipped.packs,left,{type:'chooseNamedGrant',uid:null});
 assert.equal(universalImpact(skipped.packs,left,live(left,0,untouched.uid)),0);
 assert.equal(universalAttackDamage(skipped.packs,left,live(left,0,untouched.uid)),1);
 assert.ok(legalUniversalActions(skipped.packs,left).some(a=>a.uid===twin.uid&&a.mode==='restRetireNamedMode'));

 const empty=main(green,291071);
 const solo=put(empty.s,0,'BLC-2-064','front',0,true);
 let gone=dispatchUniversalAction(empty.packs,empty.s,{type:'activate',uid:solo.uid,mode:'restRetireNamedMode'});
 assert.equal(gone.pending,null);
 assert.equal(gone.players[0].outside.some(c=>c.uid===solo.uid),true);
 assertUniversalMatch(empty.packs,gone);
});
