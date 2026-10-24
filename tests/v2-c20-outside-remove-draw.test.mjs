import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// UA08BT/BLC-1-098 and UA08ST/BLC-1-106, fetched 2026-10-24.
// 098: 自分の場外にあるキャラカードを1枚リムーブエリアに置いてもよい。そうした場合、カードを2枚引く。
// 106: 自分の場外にあるカードを3枚リムーブエリアに置いてもよい。そうした場合、カードを2枚引く。
// Q575 (2023-09-25): with only two own outside cards, both may move to remove,
// but the printed count of 3 is not met, so the draw does not happen.
// Moving outside cards is a payment, not a character retirement.

const one={op:'removeOutsideThen',count:1,optional:true,cardType:'character',
 zone:'outside',controller:'own',then:[{op:'draw',count:2}]};
const three={op:'removeOutsideThen',count:3,optional:true,cardType:'any',
 zone:'outside',controller:'own',then:[{op:'draw',count:2}]};
function unit(id,extra){
 return {id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{},...extra};
}
function accept(cards){
 return createUniversalPack({id:'c20-schema',cards});
}
test('outside removal accepts only an own optional payment and a short follow-up',()=>{
 const ok=unit('OK',{effects:{onPlay:[one]}});
 assert.equal(accept([ok,unit('FILL',{implementation:'vanilla'})]).cards.OK
  .effects.onPlay[0].then[0].op,'draw');
 assert.doesNotThrow(()=>accept([unit('MILL',{effects:{onPlay:[{...three,
  then:[{op:'millTop',count:1},{op:'buffSelf',bp:500}]}]}})]));
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,count:0}]}})]),
  /invalid outside removal payment/);
 assert.doesNotThrow(()=>accept([unit('FOUR',{effects:{onPlay:[{...one,count:4}]}})]));
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,count:5}]}})]),
  /invalid outside removal payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,cardType:'event'}]}})]),
  /invalid outside removal payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,optional:false}]}})]),
  /invalid outside removal payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,zone:'hand'}]}})]),
  /invalid outside removal payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,controller:'opponent'}]}})]),
  /invalid outside removal payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,note:true}]}})]),
  /invalid outside removal payment/);
 assert.throws(()=>accept([unit('BAD',{effects:{onPlay:[{...one,
  then:[{op:'activeOwnNamed',name:'X',max:1,optional:true}]}]}})]),
  /invalid outside removal payment/);
});

const ids=['ONE','THREE','RETIRE','FIELD','EVENT','OTHER','F0','F1','F2','F3','F4','F5','F6'];
const labDeck=Object.fromEntries(ids.map(id=>[id,id==='F6'?2:4]));
const lab=createUniversalPack({id:'c20-lab',cards:[
 unit('ONE',{effects:{onPlay:[one]}}),
 unit('THREE',{effects:{onPlay:[three]}}),
 unit('RETIRE',{effects:{onRetire:[{op:'draw',count:1}]}}),
 unit('FIELD',{type:'field',bp:0,implementation:'vanilla'}),
 unit('EVENT',{type:'event',bp:0,gen:0,effects:{onPlay:[one]}}),
 unit('OTHER',{implementation:'vanilla'}),
 ...['F0','F1','F2','F3','F4','F5','F6'].map(id=>unit(id,{implementation:'vanilla'}))
]});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function boot(seed=2001){
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(lab,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function play(s,id,line='front'){
 const src=take(s,0,id);s.players[0].hand.push(src);
 const action=legalUniversalActions(lab,s).find(a=>a.uid===src.uid&&
  (a.type==='play'||a.type==='event')&&(a.type==='event'||a.line===line)&&!a.replaceUid);
 assert.ok(action,id);
 return {s:dispatchUniversalAction(lab,s,action),src};
}
function choose(s,pred){
 const action=legalUniversalActions(lab,s).find(pred);
 assert.ok(action);
 return dispatchUniversalAction(lab,s,action);
}
function count(player){
 let n=player.hand.length+player.deck.length+player.life.length+
  player.outside.length+player.removed.length;
 for(const line of ['front','energy'])n+=player[line].filter(Boolean).length;
 return n;
}
function inZone(player,zone,uid){
 return player[zone].some(c=>c?.uid===uid);
}

test('one character payment draws, and a short or empty set does not',()=>{
 let s=boot();
 const character=take(s,0,'RETIRE'),field=take(s,0,'FIELD'),event=take(s,0,'EVENT');
 const hand=take(s,0,'OTHER'),foe=take(s,1,'OTHER');
 s.players[0].outside.push(character,field,event);
 s.players[0].hand.push(hand);
 s.players[1].outside.push(foe);
 ({s}=play(s,'ONE'));
 const deck=s.players[0].deck.length;
 assert.equal(s.pending.kind,'effect-remove-outside');
 assert.equal(s.pending.short,false);
 assert.equal(s.pending.count,1);
 assert.deepEqual(s.pending.choices,[character.uid]);
 assert.equal(legalUniversalActions(lab,s)[0].mode,'skip');
 assert.equal(V2_PENDING_LABELS[s.pending.kind],'可將己方場外卡移入移除區');
 assert.equal(uiActionLabel(legalUniversalActions(lab,s)[0],{pack:lab,state:s}),
  '不將場外卡移入移除區');
 for(const difficulty of ['easy','normal','hard'])
  assert.equal(chooseUniversalAiAction(lab,s,{difficulty}).mode,'skip');
 assert.equal(universalPublicView(lab,s,1).players[0].hand,null);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRemoveOutside',mode:'pick',uid:field.uid}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRemoveOutside',mode:'pick',uid:foe.uid}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRemoveOutside',mode:'all'}),
  /not currently legal/);
 s=choose(s,a=>a.mode==='pick'&&a.uid===character.uid);
 assert.equal(inZone(s.players[0],'removed',character.uid),true);
 assert.equal(inZone(s.players[0],'outside',field.uid),true);
 assert.equal(inZone(s.players[0],'outside',event.uid),true);
 assert.equal(inZone(s.players[0],'hand',hand.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(s.pending,null);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(lab,s),true);

 let skipped=boot(2002);
 const kept=take(skipped,0,'OTHER');skipped.players[0].outside.push(kept);
 ({s:skipped}=play(skipped,'ONE'));
 const before=skipped.players[0].deck.length;
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(inZone(skipped.players[0],'outside',kept.uid),true);
 assert.equal(skipped.players[0].deck.length,before);

 let empty=boot(2003);
 const pool=empty.players[0].deck.length+empty.players[0].hand.length;
 ({s:empty}=play(empty,'ONE'));
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length+empty.players[0].hand.length,pool-1);
 assert.equal(empty.players[0].removed.length,0);
});

test('an event payment excludes itself and does not retire the paid character',()=>{
 let s=boot(2004);
 const character=take(s,0,'RETIRE');
 s.players[0].outside.push(character);
 const played=play(s,'EVENT');
 s=played.s;
 const src=played.src;
 assert.equal(inZone(s.players[0],'outside',src.uid),true);
 assert.deepEqual(s.pending.choices,[character.uid]);
 const deck=s.players[0].deck.length;
 s=choose(s,a=>a.uid===character.uid);
 assert.equal(inZone(s.players[0],'outside',src.uid),true);
 assert.equal(inZone(s.players[0],'removed',character.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===character.uid&&e.from==='outside'&&
  e.to==='removed'&&e.reason==='payment'),true);
 assert.equal(s.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(count(s.players[0]),50);
});

test('three distinct picks move together and then draw; a repeated UID is illegal',()=>{
 let s=boot(2005);
 const a=take(s,0,'OTHER'),b=take(s,0,'FIELD'),c=take(s,0,'EVENT'),d=take(s,0,'RETIRE');
 const foe=take(s,1,'OTHER');
 s.players[0].outside.push(a,b,c);
 s.players[0].hand.push(d);
 s.players[1].outside.push(foe);
 ({s}=play(s,'THREE'));
 assert.equal(s.pending.short,false);
 assert.deepEqual([...s.pending.choices].sort(),[a.uid,b.uid,c.uid].sort());
 s=choose(s,x=>x.mode==='pick'&&x.uid===a.uid);
 assert.equal(s.pending.selected.length,1);
 assert.equal(legalUniversalActions(lab,s).some(x=>x.mode==='skip'),false);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRemoveOutside',mode:'skip'}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRemoveOutside',mode:'pick',uid:a.uid}),
  /not currently legal/);
 assert.equal(inZone(s.players[0],'outside',a.uid),true);
 s=choose(s,x=>x.uid===b.uid);
 assert.equal(s.pending.selected.length,2);
 assert.equal(inZone(s.players[0],'outside',b.uid),true);
 const deck=s.players[0].deck.length;
 s=choose(s,x=>x.uid===c.uid);
 assert.equal(s.pending,null);
 for(const uid of [a.uid,b.uid,c.uid])assert.equal(inZone(s.players[0],'removed',uid),true);
 assert.equal(inZone(s.players[0],'hand',d.uid),true);
 assert.equal(inZone(s.players[1],'outside',foe.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(lab,s),true);
});

test('Q575 moves both cards when only two exist and does not draw',()=>{
 let s=boot(2006);
 const a=take(s,0,'OTHER'),b=take(s,0,'EVENT');
 s.players[0].outside.push(a,b);
 const deck=s.players[0].deck.length;
 ({s}=play(s,'THREE'));
 assert.equal(s.pending.short,true);
 const legal=legalUniversalActions(lab,s);
 assert.deepEqual(legal.map(x=>x.mode),['skip','all']);
 assert.equal(legal.some(x=>x.mode==='pick'),false);
 assert.equal(uiActionLabel(legal[1],{pack:lab,state:s}),
  '將目前場外的可選卡全部移入移除區，不結算後續');
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRemoveOutside',mode:'pick',uid:a.uid}),
  /not currently legal/);
 s=choose(s,x=>x.mode==='all');
 assert.equal(s.pending,null);
 assert.equal(inZone(s.players[0],'removed',a.uid),true);
 assert.equal(inZone(s.players[0],'removed',b.uid),true);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].outside.length,0);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(lab,s),true);

 let declined=boot(2007);
 const kept=take(declined,0,'OTHER'),other=take(declined,0,'FIELD');
 declined.players[0].outside.push(kept,other);
 ({s:declined}=play(declined,'THREE'));
 declined=choose(declined,x=>x.mode==='skip');
 assert.equal(inZone(declined.players[0],'outside',kept.uid),true);
 assert.equal(inZone(declined.players[0],'outside',other.uid),true);
 assert.equal(declined.players[0].removed.length,0);
});

const bleach=registeredV2TitlePack('bleach');
const mst=registeredV2TitlePack('mushoku-tensei');
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13,required.join(','));
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const green=realDeck(['BLC-1-098'],'green');
const purple=realDeck(['BLC-1-106'],'purple');
const foreign=(()=>{
 const rest=Object.values(mst.cards).filter(c=>c.type==='character'&&c.color==='blue'&&
  c.maxCopies===4&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=rest.slice(0,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 return counts;
})();
function realTake(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function realPut(s,p,id,line,index){
 assert.equal(s.players[p][line][index],null);
 const c=realTake(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function realMain(deck,seed){
 const packs=[bleach,mst];
 let s=newUniversalMatch(packs,{decks:[deck,foreign],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 for(let i=0;i<3;i++){s.players[0].apCards[i].inPlay=true;s.players[0].apCards[i].ready=true;}
 return {packs,s};
}

test('BLC-1-098 removes one own outside character, then draws 2',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-098'));
 const printed=CARDS.find(c=>c.identity==='BLC-1-098');
 const card=bleach.cards['BLC-1-098'];
 assert.equal(printed.nameJa,'隊葬');
 assert.equal(printed.effect,'可將己方場外 1 張角色卡除外；成功時抽 2 張。');
 assert.equal(printed.trigger,'draw');
 assert.equal(printed.triggerEffect,'【DRAW】抽 1 張。');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type,card.traits],
  ['green',1,1,0,0,'draw','event',[]]);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay[0],one);
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-1-098');
 assert.equal(checkedBleachAddonDefinition(profile).id,'BLC-1-098');
 const {packs,s:start}=realMain(green,2098);
 let s=start;
 const gens=Object.keys(green).filter(id=>id!=='BLC-1-098'&&bleach.cards[id].gen>0);
 realPut(s,0,gens[0],'energy',0);
 const pay=realTake(s,0,gens[0]);
 s.players[0].outside.push(pay);
 const src=realTake(s,0,'BLC-1-098');s.players[0].hand.push(src);
 const deck=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===src.uid);
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(inZone(s.players[0],'outside',src.uid),true);
 assert.deepEqual(s.pending.choices,[pay.uid]);
 assert.equal(s.pending.cardType,'character');
 s=dispatchUniversalAction(packs,s,{type:'chooseRemoveOutside',mode:'pick',uid:pay.uid});
 assert.equal(inZone(s.players[0],'removed',pay.uid),true);
 assert.equal(inZone(s.players[0],'outside',src.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending,null);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-1-106 draws only after three cards, and Q575 moves two without drawing',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-106'));
 const printed=CARDS.find(c=>c.identity==='BLC-1-106');
 const card=bleach.cards['BLC-1-106'];
 assert.equal(printed.nameJa,'朽木 ルキア');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.effect,'登場：可將場外 3 張除外；成功時抽 2 張。');
 assert.equal(printed.trigger,'get');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type,card.traits],
  ['purple',4,2,4000,1,'get','character',['護廷十三隊']]);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay[0],three);
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-1-106');
 assert.equal(checkedBleachAddonDefinition(profile).id,'BLC-1-106');
 const {packs,s:start}=realMain(purple,2106);
 let s=start;
 const gens=Object.keys(purple).filter(id=>id!=='BLC-1-106'&&bleach.cards[id].gen>0);
 assert.ok(gens.length>=4);
 for(let i=0;i<4;i++)realPut(s,0,gens[i],'energy',i);
 const paid=[];
 for(let i=0;i<3;i++)paid.push(realTake(s,0,gens[0]));
 s.players[0].outside.push(...paid);
 const src=realTake(s,0,'BLC-1-106');s.players[0].hand.push(src);
 const deck=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&
  a.line==='front'&&!a.replaceUid);
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending.kind,'effect-remove-outside');
 assert.equal(s.pending.short,false);
 assert.equal(s.pending.choices.includes(src.uid),false);
 assert.deepEqual([...s.pending.choices].sort(),paid.map(c=>c.uid).sort());
 for(const cardPaid of paid)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===cardPaid.uid));
 assert.equal(s.pending,null);
 for(const cardPaid of paid)assert.equal(inZone(s.players[0],'removed',cardPaid.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===src.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(count(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);

 const shortMatch=realMain(purple,2107);
 s=shortMatch.s;
 const shortGens=Object.keys(purple).filter(id=>id!=='BLC-1-106'&&bleach.cards[id].gen>0);
 for(let i=0;i<4;i++)realPut(s,0,shortGens[i],'energy',i);
 const pair=[realTake(s,0,shortGens[0]),realTake(s,0,shortGens[0])];
 s.players[0].outside.push(...pair);
 const shortDeck=s.players[0].deck.length;
 const rukia=realTake(s,0,'BLC-1-106');s.players[0].hand.push(rukia);
 s=dispatchUniversalAction(shortMatch.packs,s,legalUniversalActions(shortMatch.packs,s).find(a=>
  a.type==='play'&&a.uid===rukia.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(s.pending.short,true);
 assert.deepEqual(legalUniversalActions(shortMatch.packs,s).map(a=>a.mode),['skip','all']);
 s=dispatchUniversalAction(shortMatch.packs,s,{type:'chooseRemoveOutside',mode:'all'});
 assert.equal(s.pending,null);
 assert.equal(inZone(s.players[0],'removed',pair[0].uid),true);
 assert.equal(inZone(s.players[0],'removed',pair[1].uid),true);
 assert.equal(s.players[0].deck.length,shortDeck);
 assert.equal(s.players[0].front.some(c=>c?.uid===rukia.uid),true);
 assert.equal(assertUniversalMatch(shortMatch.packs,s),true);
});

test('BLC-1-098 DRAW and BLC-1-106 GET stay the printed life triggers',()=>{
 const mirror=[bleach,bleach];
 let draw=newUniversalMatch(mirror,{decks:[green,green],seed:2099,first:0});
 for(let n=0;n<8&&draw.phase!=='attack';n++)
  draw=dispatchUniversalAction(mirror,draw,{type:'next'});
 const attacker=realPut(draw,0,Object.keys(green).find(id=>bleach.cards[id].type==='character'),'front',0);
 const revealed=realTake(draw,1,'BLC-1-098');
 draw.players[1].deck.push(...draw.players[1].life.splice(0));
 draw.players[1].life.push(revealed);
 const before=draw.players[1].hand.length;
 draw=dispatchUniversalAction(mirror,draw,{type:'attack',uid:attacker.uid});
 draw=dispatchUniversalAction(mirror,draw,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(draw.pending.trigger,'draw');
 assert.equal(draw.pending.triggerEffect??null,null);
 draw=dispatchUniversalAction(mirror,draw,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(draw.players[1].hand.length,before+1);
 assert.equal(assertUniversalMatch(mirror,draw),true);

 let got=newUniversalMatch(mirror,{decks:[purple,purple],seed:2108,first:0});
 for(let n=0;n<8&&got.phase!=='attack';n++)
  got=dispatchUniversalAction(mirror,got,{type:'next'});
 const striker=realPut(got,0,Object.keys(purple).find(id=>id!=='BLC-1-106'),'front',0);
 const life=realTake(got,1,'BLC-1-106');
 got.players[1].deck.push(...got.players[1].life.splice(0));
 got.players[1].life.push(life);
 got=dispatchUniversalAction(mirror,got,{type:'attack',uid:striker.uid});
 got=dispatchUniversalAction(mirror,got,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(got.pending.trigger,'get');
 got=dispatchUniversalAction(mirror,got,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.equal(inZone(got.players[1],'hand',life.uid),true);
 assert.equal(assertUniversalMatch(mirror,got),true);
});
