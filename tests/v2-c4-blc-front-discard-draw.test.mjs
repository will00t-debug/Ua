import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {c4BlcFrontDiscardDraw} from '../scripts/v2-c4-blc-front-discard-draw.mjs';

// EX15BT/BLC-4-025 official page, 2026-10-24. No FAQ.
// 青4 / AP1 / BP4000 / no trait / 発生青 / no trigger.
// 【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】カードを1枚引く。

const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
function deck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck(['BLC-4-025','BLC-4-023','BLC-1-001']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toMain(s){
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('C4 registers only the whole-print front discard draw',()=>{
 const x=c4BlcFrontDiscardDraw();
 assert.deepEqual(x.registered,['BLC-4-025']);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.mst,57);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.readyFromKeywords,0);
 assert.equal(EXPECTED_V2_IDS.bleach.includes('BLC-4-025'),true);
});

test('BLC-4-025 matches the catalogue and the shared front payment',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-025');
 assert.equal(printed.effect,'啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：抽1張牌。');
 const card=bleach.cards['BLC-4-025'];
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger],
  ['blue',4,1,4000,1,null]);
 assert.deepEqual(card.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'discardGate',optional:false,then:[{op:'draw',count:1}]}]});
 assert.deepEqual(card.effects,{});
});

test('BLC-4-025 discards one hand card then draws, only from the front and once',()=>{
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],seed:4025,first:0}));
 const actor=place(s,0,'BLC-4-025','front',0,false);
 const energyCopy=place(s,0,'BLC-4-025','energy',0,true);
 const pay=take(s,0,'BLC-1-001');
 s.players[0].outside.push(...s.players[0].hand.splice(0),pay);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 s.players[0].hand.push(s.players[0].outside.splice(s.players[0].outside.findIndex(c=>c.uid===pay.uid),1)[0]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='frontOnce');
 assert.ok(act);
 aiOk(s);
 const deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.pending.optional,false);
 aiOk(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null}));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===pay.uid),false);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:energyCopy.uid,
  targetUid:actor.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});
