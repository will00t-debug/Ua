import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView,universalPrivateChoices,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

// UA08BT pages read 2026-10-24. None contained a card FAQ.
// BLC-1-015 黄3 / 黄黄 / AP1 / BP3000 / 星十字騎士団.
//   相手の場にレストのキャラがある場合、カードを1枚引く。
// BLC-1-027 黄3 / 黄黄 / AP1 / BP3000 / 星十字騎士団.
//   相手の場にBP4000以上のキャラがある場合、カードを1枚引く。
//   The threshold is current BP (Q749), on front and energy characters.
// BLC-1-076 緑1 / 緑 / AP1 / BP2000 / 護廷十三隊 / ACTIVE.
//   自分の場の〈更木 剣八〉を1枚まで選び、アクティブにする。
// BLC-2-066 is the registered vanilla 更木 剣八 used as the real target.

const restDraw={op:'drawIfOppRestCharacter',count:1};
const bpDraw={op:'drawIfOppCharacterBpAtLeast',minBp:4000,count:1};
const activeNamed={op:'activeOwnNamed',name:'更木 剣八',max:1,optional:true};
function card(id,extra={}){
 return {id,name:extra.name||id,color:extra.color||'yellow',energy:extra.energy??0,
  ap:extra.ap??1,bp:extra.bp??2000,gen:extra.gen??1,type:extra.type||'character',
  traits:[],trigger:null,implementation:extra.implementation||(extra.effects||extra.passiveBonuses?'dsl':'vanilla'),
  ...(extra.effects?{effects:extra.effects}:{}),
  ...(extra.passiveBonuses?{passiveBonuses:extra.passiveBonuses}:{}),
  ...(extra.nameAliases?{nameAliases:extra.nameAliases}:{})};
}
const fixtureCards=[
 card('REST',{name:'休抽',effects:{onPlay:[restDraw]}}),
 card('BP',{name:'值抽',effects:{onPlay:[bpDraw]}}),
 card('ACT',{name:'草鹿 やちる',color:'green',effects:{onPlay:[activeNamed]}}),
 card('KEN',{name:'更木 剣八',color:'green',bp:2000}),
 card('ALIAS',{name:'別字',color:'green',bp:1500,nameAliases:['更木 剣八'],
  effects:{onPlay:[{op:'draw',count:1}]}}),
 card('OTHER',{name:'別的人',color:'green',bp:3000}),
 card('BIG',{name:'高值',bp:4000}),
 card('MID',{name:'中值',bp:3000}),
 card('FIELD',{name:'更木 剣八',type:'field',bp:0,color:'green'}),
 card('PASS',{name:'被動',bp:2000,passiveBonuses:[{condition:{kind:'oppRestCharacter',turn:'any',zone:'field'},bp:1000}]}),
 card('FILL0',{name:'補0',color:'green'}),
 card('FILL1',{name:'補1',color:'green'}),
 card('FILL2',{name:'補2',color:'green'})
];
const fixturePack=createUniversalPack({id:'conditional-board',cards:fixtureCards});
const fixtureDecks=[Object.fromEntries(fixtureCards.map((c,i)=>[c.id,i===12?2:4])),
 Object.fromEntries(fixtureCards.map((c,i)=>[c.id,i===12?2:4]))];
const packs=[fixturePack,fixturePack];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function at(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function place(s,p,physical,line,slot,ready=false){
 physical.ready=ready;
 physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=physical;
 return physical;
}
function toMain(s,use=packs){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(use,s,legalUniversalActions(use,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');
 return s;
}
function withAp(s,n){
 for(let i=0;i<3;i++){
  s.players[0].apCards[i].inPlay=i<n;
  s.players[0].apCards[i].ready=i<n;
 }
 return s;
}
function boot(){
 return withAp(toMain(newUniversalMatch(packs,{decks:fixtureDecks,seed:1615,first:0})),3);
}
function play(s,id,line='front'){
 const src=take(s,0,id);s.players[0].hand.push(src);
 const deckBefore=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line===line&&!a.replaceUid);
 assert.ok(action,id);
 return {s:dispatchUniversalAction(packs,s,action),deckBefore};
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}

test('opponent-board draw and named ACTIVE reject a shape the print does not state',()=>{
 const base=card('BAD',{name:'源',effects:{onPlay:[restDraw]}});
 for(const effect of [
  {...restDraw,count:0},{...restDraw,zone:'front'},
  {...bpDraw,minBp:100},{...bpDraw,minBp:4001},
  {...activeNamed,max:2},{...activeNamed,optional:false},{...activeNamed,name:' '},
  {op:'activeOwnNamed',name:'更木 剣八',max:1}
 ]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base,effects:{onPlay:[effect]}}]}));
 }
 assert.throws(()=>createUniversalPack({id:'bad-timing',cards:[card('LATE',{name:'晚',
  effects:{onAttack:[restDraw]}})]}));
 assert.equal(createUniversalPack({id:'ok',cards:[card('OK',{name:'被動',passiveBonuses:[
  {condition:{kind:'oppRestCharacter',turn:'any',zone:'energy'},bp:500}]})]}).cards.OK
  .passiveBonuses[0].condition.kind,'oppRestCharacter');
});

test('REST-character draw counts only an opposing rested character on the field',()=>{
 let s=boot();
 const rested=place(s,1,take(s,1,'OTHER'),'energy',0,false);
 const active=place(s,1,take(s,1,'KEN'),'front',0,true);
 const ownRest=place(s,0,take(s,0,'MID'),'front',0,false);
 const field=place(s,1,take(s,1,'FIELD'),'energy',1,false);
 const hidden=take(s,1,'BIG');s.players[1].hand.push(hidden);
 let played=play(s,'REST');s=played.s;
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,played.deckBefore-1);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 at(s,1,rested.uid).ready=true;
 at(s,1,active.uid).ready=true;
 played=play(s,'REST');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore);
 const live=place(s,0,take(s,0,'PASS'),'front',3,true);
 at(s,1,rested.uid).ready=false;
 assert.equal(universalBp(packs,s,live),3000);
 at(s,1,rested.uid).ready=true;
 assert.equal(universalBp(packs,s,live),2000);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BP draw uses current BP of an opposing character, including energy',()=>{
 let s=boot();
 const mid=place(s,1,take(s,1,'MID'),'front',0,true);
 mid.buffs.push({bp:1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,mid),4000);
 let played=play(s,'BP');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore-1);
 const printedHigh=place(s,1,take(s,1,'BIG'),'energy',0,false);
 printedHigh.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,printedHigh),3000);
 at(s,1,mid.uid).buffs.length=0;
 played=play(s,'BP');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore);
 at(s,1,printedHigh.uid).buffs.length=0;
 assert.equal(universalBp(packs,s,at(s,1,printedHigh.uid)),4000);
 played=play(s,'BP');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore-1);
 assert.equal(countCards(s.players[0]),50);
});

test('named ACTIVE offers only a live own character with that printed or alias name',()=>{
 let s=boot();
 const front=place(s,0,take(s,0,'KEN'),'front',0,false);
 const energy=place(s,0,take(s,0,'KEN'),'energy',0,false);
 const other=place(s,0,take(s,0,'OTHER'),'front',1,false);
 const alias=place(s,0,take(s,0,'ALIAS'),'energy',1,false);
 const foe=place(s,1,take(s,1,'KEN'),'front',0,false);
 const field=place(s,0,take(s,0,'FIELD'),'energy',2,false);
 const hand=take(s,0,'KEN');s.players[0].hand.push(hand);
 ({s}=play(s,'ACT'));
 assert.equal(s.pending.kind,'effect-active-own-named');
 assert.equal(s.pending.name,'更木 剣八');
 assert.equal(universalPublicView(packs,s,1).pending.choices,undefined);
 assert.equal(V2_PENDING_LABELS[s.pending.kind],'可將最多 1 個己方指定名稱角色轉為 ACTIVE');
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal[0].type,'chooseActiveOwnNamed');
 assert.equal(legal[0].uid,null);
 const offered=legal.filter(a=>a.uid).map(a=>a.uid).sort();
 assert.deepEqual(offered,[front.uid,energy.uid,alias.uid].sort());
 assert.equal(offered.includes(other.uid),false);
 assert.equal(offered.includes(foe.uid),false);
 assert.equal(offered.includes(hand.uid),false);
 assert.equal(offered.includes(field.uid),false);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.uid,null);
 const priv=universalPrivateChoices(packs,s,0);
 assert.ok(priv.options.some(o=>o.card?.cardId==='KEN'));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseActiveOwnNamed',uid:foe.uid}));
 const forged=structuredClone(s);forged.pending.name='別人';
 assert.throws(()=>assertUniversalMatch(packs,forged),/named own ACTIVE/);
 s=dispatchUniversalAction(packs,s,legal.find(a=>a.uid===energy.uid));
 assert.equal(at(s,0,energy.uid).ready,true);
 assert.equal(at(s,0,front.uid).ready,false);
 assert.equal(s.pending,null);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:alias.uid,targetUid:alias.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 ({s}=play(s,'ACT'));
 assert.equal(s.pending.choices.includes(alias.uid),false);
 assert.equal(s.pending.choices.includes(front.uid),true);
 assert.equal(s.pending.choices.includes(energy.uid),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseActiveOwnNamed',uid:energy.uid});
 assert.equal(at(s,0,energy.uid).ready,true);
 assert.equal(at(s,0,front.uid).ready,false);
 grantContinuousState(s,{kind:'cannotActive',controller:0,sourceUid:front.uid,
  targetUid:front.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 ({s}=play(s,'ACT','energy'));
 assert.equal(uiActionLabel({type:'chooseActiveOwnNamed',uid:front.uid},{pack:fixturePack,state:s}).includes('ACTIVE'),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseActiveOwnNamed',uid:front.uid});
 assert.equal(at(s,0,front.uid).ready,false);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('zero named characters and an empty opposing board resolve without a choice',()=>{
 let s=boot();
 let played=play(s,'ACT');s=played.s;
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,played.deckBefore);
 played=play(s,'REST');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore);
 played=play(s,'BP');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore);
 assert.equal(s.pending,null);
});

const bleach=registeredV2TitlePack('bleach');
function realDeck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
function realBoot(){
 const counts=realDeck(['BLC-1-015','BLC-1-027','BLC-1-076','BLC-2-066','BLC-1-001']);
 const use=[bleach,bleach];
 return {use,s:withAp(toMain(newUniversalMatch(use,{decks:[counts,counts],seed:1015,first:0}),use),3)};
}
function realPlay(s,use,id){
 const src=take(s,0,id);s.players[0].hand.push(src);
 const deckBefore=s.players[0].deck.length;
 const action=legalUniversalActions(use,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'&&!a.replaceUid);
 assert.ok(action,id);
 return {s:dispatchUniversalAction(use,s,action),deckBefore};
}

test('BLC-1-015, BLC-1-027 and BLC-1-076 match the catalogue and resolve on the real pack',()=>{
 for(const id of ['BLC-1-015','BLC-1-027','BLC-1-076']){
  const source=CARDS.find(c=>c.identity===id);
  const printed=bleach.cards[id];
  assert.equal(source.effect,printed.id==='BLC-1-015'?'登場：敵方場上有 REST 角色時，抽 1 張。':
   printed.id==='BLC-1-027'?'登場：敵方場上有 BP 4000 以上角色時，抽 1 張。':
   '登場：可將最多 1 個己方場上的〈更木劍八〉轉為 ACTIVE。');
  assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
  assert.equal(printed.energy,source.energy);
  assert.equal(printed.gen,source.gen);
  assert.equal(printed.ap,1);
  assert.equal(printed.bp,source.bp);
 }
 assert.deepEqual(bleach.cards['BLC-1-015'].effects,{onPlay:[restDraw]});
 assert.deepEqual(bleach.cards['BLC-1-027'].effects,{onPlay:[bpDraw]});
 assert.deepEqual(bleach.cards['BLC-1-076'].effects,{onPlay:[activeNamed]});
 assert.equal(bleach.cards['BLC-1-076'].trigger,'active');
 assert.equal(bleach.cards['BLC-1-076'].triggerEffect??null,null);
 assert.equal(bleach.cards['BLC-2-066'].name,'更木 剣八');
 assert.equal(bleach.cards['BLC-2-066'].effects&&Object.keys(bleach.cards['BLC-2-066'].effects).length,0);
 let {use,s}=realBoot();
 for(let i=0;i<3;i++)place(s,0,take(s,0,'BLC-1-001'),'energy',i,true);
 const ken=place(s,1,take(s,1,'BLC-2-066'),'front',0,false);
 const readyAp=()=>{s.players[0].apCards[0].inPlay=true;s.players[0].apCards[0].ready=true;};
 let played=realPlay(s,use,'BLC-1-015');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore-1);
 at(s,1,ken.uid).ready=true;
 readyAp();
 played=realPlay(s,use,'BLC-1-027');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore);
 at(s,1,ken.uid).buffs.push({bp:2000,untilTurn:s.turn});
 assert.equal(universalBp(use,s,at(s,1,ken.uid)),4000);
 readyAp();
 played=realPlay(s,use,'BLC-1-027');s=played.s;
 assert.equal(s.players[0].deck.length,played.deckBefore-1);
 const own=place(s,0,take(s,0,'BLC-2-066'),'energy',3,false);
 readyAp();
 played=realPlay(s,use,'BLC-1-076');s=played.s;
 assert.equal(s.pending.kind,'effect-active-own-named');
 assert.deepEqual(s.pending.choices,[own.uid]);
 s=dispatchUniversalAction(use,s,{type:'chooseActiveOwnNamed',uid:own.uid});
 assert.equal(at(s,0,own.uid).ready,true);
 assert.equal(at(s,1,ken.uid).ready,true);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(assertUniversalMatch(use,structuredClone(s)),true);
});
