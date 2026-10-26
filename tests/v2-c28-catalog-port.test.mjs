import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices,universalBp,
 universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
function deckOf(required){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies!==1&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.filter(id=>!required.includes(id))].slice(0,13);
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const card=take(s,p,id);
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toMain(s){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function fuel(s){
 for(let i=0;i<3;i++)place(s,0,'SAO-1-001','energy',i);
}
function play(s,uid){
 return dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===uid&&a.line==='front'&&a.slot===0));
}

test('SAO-1-021 may add one own life card to hand and draws only after that take',()=>{
 const card=sao.cards['SAO-1-021'];
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-021');
 assert.equal(source.number,'UA15BT/SAO-1-021');
 assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
 assert.equal(source.energy,3);
 assert.equal(source.gen,2);
 assert.equal(source.trigger,'color');
 assert.match(source.effectJa,/ライフエリアにあるカードを1枚手札に加えてもよい。そうした場合、カードを1枚引く/);
 assert.equal(card.name,'アスナ（創世神ステイシア）');
 assert.equal(card.gen,2);
 assert.deepEqual(card.effects.onPlay,[{op:'optionalOwnLifeToHandThenDraw',then:[{op:'draw',count:1}]}]);
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.equal(EXPECTED_V2_TOTAL,477);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-021'),true);

 const counts=deckOf(['SAO-1-021','SAO-1-001','SAO-1-004']);
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:21021}));
 fuel(s);
 const kept=take(s,0,'SAO-1-001'),other=take(s,0,'SAO-1-004');
 s.players[0].life.unshift(other,kept);
 const played=hold(s,0,'SAO-1-021');
 const deckBefore=s.players[0].deck.length;
 s=play(s,played.uid);
 assert.equal(s.pending.kind,'effect-life-to-hand');
 assert.ok(s.pending.choices.includes(kept.uid));
 assert.ok(s.pending.choices.includes(other.uid));
 assert.equal(s.pending.choices.includes(s.players[1].life[0].uid),false);
 assert.deepEqual(universalPublicView(packs,s).pending,{kind:'effect-life-to-hand',player:0});
 const priv=universalPrivateChoices(packs,s,0);
 assert.ok(priv.options.length>=2);
 assert.ok(priv.options.every(o=>o.card===null));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseLifeToHand',uid:s.players[1].life[0].uid}),
  /not currently legal/);
 aiOk(s);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseLifeToHand',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,deckBefore);
 assert.ok(skipped.players[0].life.some(c=>c.uid===kept.uid));
 assert.equal(skipped.status,'playing');
 assert.equal(assertUniversalMatch(packs,skipped),true);

 let taken=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:21022}));
 fuel(taken);
 const chosen=take(taken,0,'SAO-1-004'),stay=take(taken,0,'SAO-1-001');
 taken.players[0].life.unshift(stay,chosen);
 const again=hold(taken,0,'SAO-1-021');
 const before=taken.players[0].deck.length;
 taken=play(taken,again.uid);
 taken=dispatchUniversalAction(packs,taken,{type:'chooseLifeToHand',uid:chosen.uid});
 assert.ok(taken.players[0].hand.some(c=>c.uid===chosen.uid));
 assert.equal(taken.players[0].life.some(c=>c.uid===chosen.uid),false);
 assert.ok(taken.players[0].life.some(c=>c.uid===stay.uid));
 assert.equal(taken.players[0].deck.length,before-1);
 assert.equal(taken.pending,null);
 assert.equal(taken.status,'playing');
 assert.equal(assertUniversalMatch(packs,taken),true);

 let empty=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:21023}));
 fuel(empty);
 while(empty.players[0].life.length)empty.players[0].deck.push(empty.players[0].life.pop());
 const bare=hold(empty,0,'SAO-1-021');
 const emptyDeck=empty.players[0].deck.length;
 empty=play(empty,bare.uid);
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length,emptyDeck);
 assert.equal(empty.players[0].hand.some(c=>c.uid===bare.uid),false);
 assert.equal(empty.status,'finished');
 assert.equal(empty.endReason,'life-zero');
 assert.equal(assertUniversalMatch(packs,empty),true);

 let last=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:21024}));
 fuel(last);
 while(last.players[0].life.length>1)last.players[0].deck.push(last.players[0].life.pop());
 const finalLife=last.players[0].life[0];
 const closer=hold(last,0,'SAO-1-021');
 const lastDeck=last.players[0].deck.length;
 last=play(last,closer.uid);
 last=dispatchUniversalAction(packs,last,{type:'chooseLifeToHand',uid:finalLife.uid});
 assert.equal(last.players[0].life.length,0);
 assert.ok(last.players[0].hand.some(c=>c.uid===finalLife.uid));
 assert.equal(last.players[0].deck.length,lastDeck-1);
 assert.equal(last.status,'finished');
 assert.equal(last.endReason,'life-zero');
 assert.equal(last.winner,1);
 assert.equal(assertUniversalMatch(packs,last),true);
});

test('SAO-2-013 retires one opposing front at 1000 current BP per own field Integrity Knight',()=>{
 const card=sao.cards['SAO-2-013'];
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-013');
 assert.equal(source.number,'EX08BT/SAO-2-013');
 assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
 assert.equal(source.energy,4);
 assert.equal(source.ap,1);
 assert.equal(source.bp,0);
 assert.equal(source.gen,0);
 assert.equal(source.trigger,'special');
 assert.deepEqual(source.traits,[]);
 assert.equal(source.effectJa,'自分の場の［特徴：整合騎士］の枚数×1000以下のBPの相手のフロントLのキャラを1枚選び、退場させる。');
 assert.equal(card.name,'記憶解放術');
 assert.equal(card.type,'event');
 assert.deepEqual(card.effects.onPlay,[{op:'retireOppFrontUnderBp',traitPerBp:{trait:'整合騎士',per:1000}}]);
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-013'),true);

 const counts=deckOf(['SAO-2-013','SAO-1-001','SAO-1-010','SAO-2-008','SAO-1-008','SAO-1-082','SAO-1-011']);
 function fueled(seed,knights){
  let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
  for(let i=0;i<4-knights.length;i++)place(s,0,'SAO-1-001','energy',i);
  knights.forEach((id,i)=>place(s,0,id,'energy',4-knights.length+i));
  return s;
 }
 function cast(s){
  const event=hold(s,0,'SAO-2-013');
  s=toMain(s);
  const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
  assert.ok(action);
  return dispatchUniversalAction(packs,s,action);
 }

 let none=fueled(20130,[]);
 const idleKnight=hold(none,0,'SAO-1-010');
 none.players[0].outside.push(take(none,0,'SAO-2-008'));
 const low=place(none,1,'SAO-1-008','front',0);
 const theirKnight=place(none,1,'SAO-1-010','front',1);
 none=cast(none);
 assert.equal(none.pending,null);
 assert.equal(none.players[1].front[0].uid,low.uid);
 assert.equal(none.players[1].front[1].uid,theirKnight.uid);
 assert.ok(none.players[0].hand.some(c=>c.uid===idleKnight.uid));
 assert.ok(none.players[0].outside.some(c=>c.cardId==='SAO-2-013'));
 assert.equal(none.status,'playing');
 assert.equal(assertUniversalMatch(packs,none),true);

 let one=fueled(20131,['SAO-1-010']);
 hold(one,0,'SAO-2-008');
 const exact=place(one,1,'SAO-1-008','front',0);
 const over=place(one,1,'SAO-1-082','front',1);
 one=cast(one);
 assert.equal(one.pending.kind,'effect-retire-bp');
 assert.equal(one.pending.limit,1000);
 assert.deepEqual(one.pending.choices,[exact.uid]);
 assert.deepEqual(universalPublicView(packs,one).pending,{kind:'effect-retire-bp',player:0});
 assert.throws(()=>dispatchUniversalAction(packs,one,{type:'chooseRetireBp',uid:null}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,one,{type:'chooseRetireBp',uid:over.uid}),/not currently legal/);
 aiOk(one);
 one=dispatchUniversalAction(packs,one,{type:'chooseRetireBp',uid:exact.uid});
 assert.equal(one.players[1].front[0],null);
 assert.equal(one.players[1].front[1].uid,over.uid);
 assert.ok(one.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(one.pending,null);
 assert.equal(assertUniversalMatch(packs,one),true);

 let two=fueled(20132,['SAO-1-010']);
 place(two,0,'SAO-2-008','front',0);
 place(two,1,'SAO-1-082','front',0);
 place(two,1,'SAO-1-011','front',1);
 const event=hold(two,0,'SAO-2-013');
 two=toMain(two);
 const printedHigh=two.players[1].front[0],printedLow=two.players[1].front[1];
 printedHigh.buffs=[{bp:1000,untilTurn:two.turn}];
 printedLow.buffs=[{bp:-500,untilTurn:two.turn}];
 two=dispatchUniversalAction(packs,two,legalUniversalActions(packs,two)
  .find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(universalBp(packs,two,two.players[1].front[0]),3000);
 assert.equal(universalBp(packs,two,two.players[1].front[1]),2000);
 assert.equal(two.pending.limit,2000);
 assert.deepEqual(two.pending.choices,[printedLow.uid]);
 two=dispatchUniversalAction(packs,two,{type:'chooseRetireBp',uid:printedLow.uid});
 assert.equal(two.players[1].front[1],null);
 assert.equal(two.players[1].front[0].uid,printedHigh.uid);
 assert.ok(two.players[0].energy.some(c=>c&&c.cardId==='SAO-1-010'));
 assert.ok(two.players[0].front.some(c=>c&&c.cardId==='SAO-2-008'));
 assert.equal(assertUniversalMatch(packs,two),true);
});

test('SAO-1-044 returns itself to hand when retired and deals 2 direct damage',()=>{
 const card=sao.cards['SAO-1-044'];
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-044');
 assert.equal(source.number,'UA15BT/SAO-1-044');
 assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
 assert.equal(source.energy,4);
 assert.equal(source.ap,2);
 assert.equal(source.bp,4000);
 assert.equal(source.gen,1);
 assert.equal(source.trigger,'get');
 assert.equal(source.effectJa,'【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）\n【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【退場時】このカードを手札に加える。');
 assert.equal(card.name,'ヒースクリフ');
 assert.equal(card.printedAttackDamage,2);
 assert.equal(card.impactNull,true);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onRetire,[{op:'returnRetiredToHand',optional:false}]);
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-044'),true);

 const counts=deckOf(['SAO-1-044','SAO-1-030','SAO-1-001','SAO-1-010']);
 let back=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:20144});
 for(let i=0;i<3;i++)place(back,0,'SAO-1-001','energy',i);
 place(back,0,'SAO-1-010','energy',3);
 const heath=place(back,1,'SAO-1-044','front',0);
 assert.equal(universalAttackDamage(packs,back,heath),2);
 const event=hold(back,0,'SAO-1-030');
 back=toMain(back);
 back=dispatchUniversalAction(packs,back,legalUniversalActions(packs,back)
  .find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(back.pending.limit,5000);
 assert.deepEqual(back.pending.choices,[heath.uid]);
 back=dispatchUniversalAction(packs,back,{type:'chooseRetireBp',uid:heath.uid});
 assert.equal(back.pending,null);
 assert.equal(back.players[1].front[0],null);
 assert.ok(back.players[1].hand.some(c=>c.uid===heath.uid));
 assert.equal(back.players[1].outside.some(c=>c.uid===heath.uid),false);
 assert.equal(back.status,'playing');
 assert.equal(assertUniversalMatch(packs,back),true);

 let stay=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:20145});
 for(let i=0;i<4;i++)place(stay,0,'SAO-1-001','energy',i);
 const plain=place(stay,1,'SAO-1-001','front',0);
 const spell=hold(stay,0,'SAO-1-030');
 stay=toMain(stay);
 stay=dispatchUniversalAction(packs,stay,legalUniversalActions(packs,stay)
  .find(a=>a.type==='event'&&a.uid===spell.uid));
 stay=dispatchUniversalAction(packs,stay,{type:'chooseRetireBp',uid:plain.uid});
 assert.equal(stay.pending,null);
 assert.ok(stay.players[1].outside.some(c=>c.uid===plain.uid));
 assert.equal(stay.players[1].hand.some(c=>c.uid===plain.uid),false);
 assert.equal(assertUniversalMatch(packs,stay),true);
});
