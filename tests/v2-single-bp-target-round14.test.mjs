import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX08BT/SAO-2-052 and EX08BT/SAO-2-043 checked 2026-10-22.
// 052: 紫1 / AP1 / BP1500 / プログレッシブ / 発生紫 / no trigger.
// 【起動メイン】【フロントLにある場合】【ターン1】
// BP1500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。
// 043: 紫2 / AP1 / BP3000 / 発生紫 / DRAW.
// Same sentence, plus 【手札を1枚場外に置く】, and the target is 相手の場のキャラ
// (front or energy characters). 「1枚選び」 cannot be skipped (Q84).
// The BP set is snapshotted when the choice opens.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[sao,mst];
function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const home=deck(sao,['SAO-2-052','SAO-2-043'],'purple');
const foreign=deck(mst,['MST-1-012','MST-1-001','MST-1-002','MST-1-010'],'blue');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index){
 const c=take(s,p,id);c.ready=true;s.players[p][line][index]=c;return c;
}
function toMain(s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function bp(s,uid){
 for(const p of [0,1])for(const c of [...s.players[p].front,...s.players[p].energy])
  if(c?.uid===uid)return universalBp(packs,s,c);
 throw Error(uid);
}

test('SAO-2-052 and SAO-2-043 compile the shared single-target BP window',()=>{
 const specs=[
  ['SAO-2-052','ミト',1,1500,null,'front',
   '【起動メイン】【フロントLにある場合】 【ターン1】BP1500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-1000。'],
  ['SAO-2-043','アルゴ',2,3000,'draw','field',
   '【起動メイン】【フロントLにある場合】 【手札を1枚場外に置く】 【ターン1】BP1500以上の相手の場のキャラを1枚選び、このターン中、BP-1000。']
 ];
 for(const [id,name,energy,printedBp,trigger,zone,effect] of specs){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id&&c.set==='EX08BT');
  assert.equal(source.nameJa,name);
  assert.equal(source.effectJa,effect);
  assert.equal(source.gen,1);
  const card=sao.cards[id];
  assert.equal(card.mainAbility.op,'frontOnceProgram');
  assert.equal(card.mainAbility.frontOnly,true);
  assert.equal(card.mainAbility.oncePerTurn,true);
  const debuff=card.mainAbility.then[0].op==='discardGate'
   ?card.mainAbility.then[0].then[0]:card.mainAbility.then[0];
  assert.deepEqual(debuff,{op:'enemyBpDown',bp:1000,optional:false,minBp:1500,zone});
  assert.deepEqual([card.color,card.energy,card.bp,card.trigger],['purple',energy,printedBp,trigger]);
  assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(id));
 }
});

test('SAO-2-052 chooses one front character at or above 1500 and cannot repeat or leave the front',()=>{
 let s=newUniversalMatch(packs,{decks:[home,foreign],seed:2052,first:0});
 const source=put(s,0,'SAO-2-052','front',0);
 const low=put(s,1,'MST-1-012','front',0);
 const mid=put(s,1,'MST-1-001','front',1);
 const high=put(s,1,'MST-1-010','front',2);
 const energy=put(s,1,'MST-1-002','energy',0);
 s=toMain(s);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid);
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.equal(s.pending.choices.includes(energy.uid),false);
 assert.ok(s.pending.choices.includes(mid.uid));
 assert.ok(s.pending.choices.includes(high.uid));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:low.uid}),/not currently legal/);
 const ai=chooseUniversalAiAction(packs,s,'hard');
 assert.equal(ai.type,'chooseTarget');
 assert.ok(s.pending.choices.includes(ai.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:mid.uid});
 assert.equal(bp(s,mid.uid),500);
 assert.equal(bp(s,high.uid),3000);
 assert.equal(bp(s,low.uid),1000);
 assert.equal(bp(s,energy.uid),2000);
 const later=put(s,1,'MST-1-010','front',3);
 assert.equal(bp(s,later.uid),3000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 const slot=s.players[0].front.findIndex(c=>c?.uid===source.uid);
 s.players[0].energy[0]=s.players[0].front[slot];
 s.players[0].front[slot]=null;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-2-043 pays one hand card and can hit an energy-line character, not a card under 1500',()=>{
 let s=newUniversalMatch(packs,{decks:[home,foreign],seed:2043,first:0});
 const source=put(s,0,'SAO-2-043','front',0);
 const low=put(s,1,'MST-1-012','front',0);
 const energy=put(s,1,'MST-1-002','energy',0);
 const payment=s.players[0].hand[0];
 s=toMain(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),true);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 s.players[0].hand.push(payment);
 const fromDeck=s.players[0].deck.findIndex(c=>c.uid===payment.uid);
 if(fromDeck>=0)s.players[0].deck.splice(fromDeck,1);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'});
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:payment.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===payment.uid));
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.ok(s.pending.choices.includes(energy.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:energy.uid});
 assert.equal(bp(s,energy.uid),1000);
 assert.equal(bp(s,low.uid),1000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:energy.uid,
  targetUid:source.uid,until:{player:0,phase:'main',edge:'end'}});
 s.players[0].front.find(c=>c?.uid===source.uid);
 s.mainAbilityUsedUids=s.mainAbilityUsedUids.filter(uid=>uid!==source.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

function unit(id,extra){
 return {id,name:id,color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'dsl',effects:{},...extra};
}
const lab=createUniversalPack({id:'bp-target-lab',cards:[
 unit('SRC',{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,then:[
  {op:'enemyBpDown',bp:2000,optional:false,minBp:1500,zone:'field'}]}}),
 unit('LOW',{implementation:'vanilla',bp:1000}),
 unit('MID',{implementation:'vanilla',bp:1500}),
 unit('FIELD',{implementation:'vanilla',type:'field',bp:3000,ap:1}),
 ...['A','B','C','D','E','F','G','H','I'].map(id=>unit(id,{implementation:'vanilla'}))
]});
const labIds=['SRC','LOW','MID','FIELD','A','B','C','D','E','F','G','H','I'];
const labDeck=Object.fromEntries(labIds.map((id,i)=>[id,i===12?2:4]));

test('a field-zone window ignores field cards, keeps a snapshotted target, and retires only at 0 BP',()=>{
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed:43,first:0});
 s=dispatchUniversalAction(lab,s,{type:'next'});
 s=dispatchUniversalAction(lab,s,{type:'next'});
 const src=s.players[0].hand.find(c=>c.cardId==='SRC');
 const idx=s.players[0].hand.findIndex(c=>c.uid===src.uid);
 s.players[0].hand.splice(idx,1);src.ready=true;s.players[0].front[0]=src;
 const mid=s.players[1].deck.find(c=>c.cardId==='MID');
 s.players[1].deck.splice(s.players[1].deck.indexOf(mid),1);
 mid.ready=true;s.players[1].energy[0]=mid;
 const field=s.players[1].deck.find(c=>c.cardId==='FIELD');
 s.players[1].deck.splice(s.players[1].deck.indexOf(field),1);
 s.players[1].energy[1]=field;
 s=dispatchUniversalAction(lab,s,{type:'activate',uid:src.uid,mode:'frontOnce'});
 assert.deepEqual(s.pending.choices,[mid.uid]);
 s=dispatchUniversalAction(lab,s,{type:'chooseTarget',uid:mid.uid});
 const retired=s.players[1].outside.find(c=>c.uid===mid.uid);
 assert.ok(retired);
 assert.equal(s.players[1].energy.some(c=>c?.uid===mid.uid),false);
 assert.equal(s.players[1].energy[1].uid,field.uid);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===mid.uid&&e.line==='energy'),true);
 assert.equal(assertUniversalMatch(lab,s),true);
});
