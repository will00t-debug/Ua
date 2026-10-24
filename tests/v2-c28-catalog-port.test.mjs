import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
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
 assert.equal(EXPECTED_V2_TOTAL,434);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],123);
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
