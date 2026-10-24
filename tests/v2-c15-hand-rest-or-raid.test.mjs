import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {mstV2Pack} from '../dist/universal-v2/mst-pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

// UA54BT/MST-1-006 official page. No card FAQ on that page.
// 青3 / AP1 / BP2500 / 発生青青 / COLOR.
// 【登場時】APを1支払ってもよい。そうした場合、カードを1枚引き、自分の手札から
// 必要エナジーが3以下で消費APが1の青の〔〈ルーデウス〉か〈エリス〉か〈ルイジェルド〉〕
// を1枚まで自分の場にレストで登場させるかレイドさせる。
// COLOR: BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。

const namedDeploy={op:'deployOwnHandRestOrRaid',type:'character',color:'blue',
 maxEnergy:3,ap:1,max:1,optional:true,names:['エリス']};
const payThen={op:'optionalPayApThen',ap:1,optional:true,
 then:[{op:'draw',count:1},namedDeploy]};
function card(id,extra={}){
 return {id,name:extra.name||id,color:extra.color||'blue',energy:extra.energy??0,
  ap:extra.ap??1,bp:extra.bp??1500,gen:extra.gen??1,type:'character',traits:[],
  trigger:null,implementation:extra.effects||extra.raidName?'dsl':'vanilla',
  ...(extra.effects?{effects:extra.effects}:{}),
  ...(extra.raidName?{raidName:extra.raidName}:{}),
  ...(extra.nameAliases?{nameAliases:extra.nameAliases}:{})};
}
const fixtureCards=[
 card('SRC',{name:'源',effects:{onPlay:[payThen]}}),
 card('GOOD',{name:'エリス',energy:3}),
 card('RAID',{name:'エリス',energy:2,raidName:'エリス',effects:{onPlay:[{op:'draw',count:1,entry:'ownEffect'}]}}),
 card('BASE',{name:'エリス',energy:0}),
 card('BADCOLOR',{name:'エリス',color:'green',energy:1}),
 card('BADENERGY',{name:'エリス',energy:4}),
 card('BADAP',{name:'エリス',energy:1,ap:2}),
 card('BADNAME',{name:'ロキシー',energy:1}),
 card('ALIAS',{name:'別字',energy:1,nameAliases:['エリス'],effects:{onPlay:[{op:'draw',count:1}]}}),
 card('FILL0',{name:'補0',color:'green'}),
 card('FILL1',{name:'補1',color:'green'}),
 card('FILL2',{name:'補2',color:'green'}),
 card('FILL3',{name:'補3',color:'green'})
];
const fixturePack=createUniversalPack({id:'hand-rest-raid',cards:fixtureCards});
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
 return withAp(toMain(newUniversalMatch(packs,{decks:fixtureDecks,seed:1506,first:0})),2);
}
function aiOk(s,use=packs){
 const legal=legalUniversalActions(use,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(use,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
 return legal;
}
function playSource(s){
 const src=take(s,0,'SRC');s.players[0].hand.push(src);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'&&!a.replaceUid);
 assert.ok(action);
 return {s:dispatchUniversalAction(packs,s,action),src};
}

test('hand REST or Raid schema rejects a condition the print does not state',()=>{
 const base=card('BAD',{name:'源',effects:{onPlay:[namedDeploy]}});
 for(const effect of [
  {...namedDeploy,color:'orange'},
  {...namedDeploy,maxEnergy:31},
  {...namedDeploy,ap:0},
  {...namedDeploy,optional:false},
  {...namedDeploy,names:[]},
  {...namedDeploy,names:['エリス','エリス']},
  {...namedDeploy,extra:true},
  {op:'optionalPayApThen',ap:2,optional:true,then:[{op:'draw',count:1}]},
  {op:'optionalPayApThen',ap:1,optional:true,then:[{op:'millTop',count:1}]}
 ]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[
   {...base,effects:{onPlay:[effect]}}]}));
 }
 assert.equal(createUniversalPack({id:'ok',cards:[card('ANY',{name:'源',effects:{onPlay:[
  {...namedDeploy,names:null}]}})]}).cards.ANY.effects.onPlay[0].names,null);
});

test('optional AP payment draws, then accepts only the printed hand set',()=>{
 let s=boot();
 const good=take(s,0,'GOOD'),raid=take(s,0,'RAID'),alias=take(s,0,'ALIAS');
 const badColor=take(s,0,'BADCOLOR'),badEnergy=take(s,0,'BADENERGY');
 const badAp=take(s,0,'BADAP'),badName=take(s,0,'BADNAME');
 const foe=take(s,1,'GOOD');
 s.players[0].hand.push(good,raid,alias,badColor,badEnergy,badAp,badName);
 s.players[1].hand.push(foe);
 s.players[0].deck.unshift(take(s,0,'FILL0'));
 ({s}=playSource(s));
 const before=s.players[0].deck.length;
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 assert.equal(universalPublicView(packs,s,1).pending.choices,undefined);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 const choices=new Set(s.pending.choices);
 for(const uid of [good.uid,raid.uid,alias.uid])assert.equal(choices.has(uid),true,uid);
 for(const uid of [badColor.uid,badEnergy.uid,badAp.uid,badName.uid,foe.uid])
  assert.equal(choices.has(uid),false,uid);
 const legal=aiOk(s);
 assert.equal(legal.some(a=>a.uid===raid.uid&&a.mode==='raid'),false);
 assert.ok(legal.some(a=>a.uid===good.uid&&a.mode==='enter'&&!a.replaceUid));
 const label=uiActionLabel(legal.find(a=>a.uid===good.uid),{pack:packs,state:s});
 assert.match(label,/REST/);
 assert.match(V2_PENDING_LABELS[s.pending.kind],/Raid/);
 const viewed=universalPrivateChoices(packs,s,0);
 assert.ok(viewed.options.some(o=>o.card?.cardId==='GOOD'));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=dispatchUniversalAction(packs,s,legal.find(a=>a.uid===good.uid&&a.mode==='enter'&&a.line==='front'&&!a.replaceUid));
 assert.equal(s.players[0].front.some(c=>c?.uid===good.uid&&c.ready===false),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===good.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('declining AP spends nothing further and draws no card',()=>{
 let s=boot();
 ({s}=playSource(s));
 const deck=s.players[0].deck.length;
 const ready=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ready);
});

test('no ready AP after the play cost does not open the payment or the deploy',()=>{
 let s=withAp(toMain(newUniversalMatch(packs,{decks:fixtureDecks,seed:1507,first:0})),1);
 ({s}=playSource(s));
 const deck=s.players[0].deck.length;
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
});

test('a printed alias is a legal name, and a wrong-name Raid base is not selectable',()=>{
 let s=boot();
 const alias=take(s,0,'ALIAS'),raid=take(s,0,'RAID'),illegal=take(s,0,'BADNAME');
 const base=take(s,0,'BASE');
 s.players[0].hand.push(alias,raid);
 s.players[0].front[1]=illegal;illegal.ready=true;illegal.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=base;base.ready=true;base.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].deck.unshift(take(s,0,'FILL1'));
 ({s}=playSource(s));
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending.choices.includes(alias.uid),true);
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.uid===raid.uid&&a.mode==='raid'&&a.baseUid===base.uid));
 assert.equal(legal.some(a=>a.baseUid===illegal.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseHandRestOrRaid',mode:'raid',
  uid:raid.uid,baseUid:illegal.uid,line:'front',slot:0}));
 const raidAction=legal.find(a=>a.uid===raid.uid&&a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
 const deck=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,raidAction);
 assert.equal(s.players[0].front[raidAction.slot].uid,raid.uid);
 assert.equal(s.players[0].front[raidAction.slot].ready,false);
 assert.equal(s.players[0].front[raidAction.slot].stack[0].uid,base.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('a full line can be entered only by replacing the named occupant',()=>{
 let s=boot();
 const good=take(s,0,'GOOD');
 s.players[0].hand.push(good);
 const occupants=[];
 for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  if(line==='front'&&slot===0)continue;
  const filler=take(s,0,'FILL'+(occupants.length%3));
  filler.ready=false;filler.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0][line][slot]=filler;occupants.push(filler);
 }
 s.players[0].deck.unshift(take(s,0,'FILL3'));
 ({s}=playSource(s));
 assert.equal(s.players[0].front.every(Boolean)&&s.players[0].energy.every(Boolean),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 const legal=legalUniversalActions(packs,s).filter(a=>a.uid===good.uid);
 assert.ok(legal.length);
 assert.equal(legal.every(a=>a.replaceUid),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseHandRestOrRaid',mode:'enter',
  uid:good.uid,line:'energy',slot:0}));
 const replace=legal.find(a=>a.mode==='enter'&&a.line==='energy');
 const removed=replace.replaceUid;
 s=dispatchUniversalAction(packs,s,replace);
 assert.equal(s.players[0].energy[replace.slot].uid,good.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===removed),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('paying with no legal hand or deck card draws and then offers nothing',()=>{
 let s=boot();
 for(const id of ['GOOD','RAID','BASE','ALIAS']){
  const c=take(s,0,id);s.players[0].outside.push(c);
 }
 s.players[0].hand.push(take(s,0,'BADNAME'),take(s,0,'BADCOLOR'));
 s.players[0].deck.unshift(take(s,0,'BADENERGY'));
 ({s}=playSource(s));
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.cardId==='BADENERGY'),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('declining the deploy leaves the matching physical card in hand',()=>{
 let s=boot();
 const good=take(s,0,'GOOD');
 s.players[0].hand.push(good);
 s.players[0].deck.unshift(take(s,0,'FILL0'));
 ({s}=playSource(s));
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 s=dispatchUniversalAction(packs,s,{type:'chooseHandRestOrRaid',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===good.uid),true);
});

const mst=mstV2Pack();
const mstPacks=[mst,mst];
function mstDeck(){
 const required=['MST-1-006','MST-1-009','MST-1-002','MST-1-004','MST-1-016','MST-1-049'];
 const rest=Object.values(mst.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 return counts;
}
const mstCounts=mstDeck();
function mstTake(s,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[0][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function mstMain(){
 let s=toMain(newUniversalMatch(mstPacks,{decks:[mstCounts,mstCounts],seed:6006,first:0}),mstPacks);
 for(let slot=0;slot<3;slot++){
  const gen=mstTake(s,'MST-1-002');
  gen.ready=true;gen.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[slot]=gen;
 }
 return withAp(s,2);
}
test('MST-1-006 is the whole printed card and opens MST-1-004 only after an own-effect entry',()=>{
 assert.equal(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-006'),true);
 const printed=mst.cards['MST-1-006'];
 assert.equal(printed.name,'エリス');
 assert.equal(printed.energy,3);assert.equal(printed.ap,1);
 assert.equal(printed.bp,2500);assert.equal(printed.gen,2);
 assert.deepEqual(printed.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(printed.effects.onPlay[0].then[1].names,['ルーデウス','エリス','ルイジェルド']);
 let s=mstMain();
 const actor=mstTake(s,'MST-1-006'),eris=mstTake(s,'MST-1-004');
 const wrongName=mstTake(s,'MST-1-016'),wrongPrint=mstTake(s,'MST-1-049');
 s.players[0].hand.push(actor,eris,wrongName,wrongPrint);
 s.players[0].deck.unshift(mstTake(s,'MST-1-016'));
 const play=legalUniversalActions(mstPacks,s).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'&&!a.replaceUid);
 assert.ok(play,'blue energy 3 must pay MST-1-006');
 s=dispatchUniversalAction(mstPacks,s,play);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=dispatchUniversalAction(mstPacks,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(s.pending.choices.includes(eris.uid),true);
 assert.equal(s.pending.choices.includes(wrongName.uid),false);
 assert.equal(s.pending.choices.includes(wrongPrint.uid),false);
 const enter=legalUniversalActions(mstPacks,s).find(a=>a.uid===eris.uid&&a.mode==='enter'&&a.line==='front'&&!a.replaceUid);
 s=dispatchUniversalAction(mstPacks,s,enter);
 const entered=s.players[0].front.find(c=>c?.uid===eris.uid);
 assert.ok(entered);
 assert.equal(entered.ready,true);
 assert.equal(entered.cardId,'MST-1-004');
 assert.equal(assertUniversalMatch(mstPacks,s),true);
});

test('MST-1-009 raided by MST-1-006 enters rested and opens its own-effect choice',()=>{
 let s=mstMain();
 const actor=mstTake(s,'MST-1-006'),raid=mstTake(s,'MST-1-009');
 s.players[0].hand.push(actor,raid);
 s.players[0].deck.unshift(mstTake(s,'MST-1-016'));
 const base=s.players[0].energy.find(c=>c?.cardId==='MST-1-002');
 s=dispatchUniversalAction(mstPacks,s,legalUniversalActions(mstPacks,s)
  .find(a=>a.type==='play'&&a.uid===actor.uid&&!a.replaceUid));
 s=dispatchUniversalAction(mstPacks,s,{type:'chooseOptionalPayAp',mode:'pay'});
 const raidAction=legalUniversalActions(mstPacks,s).find(a=>a.uid===raid.uid&&
  a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
 assert.ok(raidAction);
 s=dispatchUniversalAction(mstPacks,s,raidAction);
 const top=s.players[0].front[raidAction.slot];
 assert.equal(top.uid,raid.uid);
 assert.equal(top.ready,false);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=dispatchUniversalAction(mstPacks,s,{type:'chooseEffectMode',mode:'bp'});
 const buffed=s.players[0].front.find(c=>c?.uid===raid.uid);
 assert.equal(buffed.buffs.some(b=>b.bp===1000),true);
 assert.equal(assertUniversalMatch(mstPacks,s),true);
});
