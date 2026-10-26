import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {c5BlcFrontDiscardDown} from '../scripts/v2-c5-blc-front-discard-down.mjs';

// EX07BT/BLC-2-003 official page, 2026-10-24. No FAQ.
// 黄2 / AP1 / BP3000 / 星十字騎士団 / 発生黄 / ACTIVE.
// 【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】
// BP1500以上の相手の場のキャラを1枚選び、このターン中、BP-1000。

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
const pool=Object.values(bleach.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
 !['special','color','final'].includes(c.trigger));
const lowId=pool.find(c=>c.bp<1500).id;
const highId=pool.find(c=>c.bp>=1500&&c.id!=='BLC-2-003'&&c.id!==lowId).id;
const counts=deck([...new Set(['BLC-2-003','BLC-1-001','BLC-1-008',lowId,highId])]);
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
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,phase);return s;
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

test('C5 registers only the whole-print front discard BP reduction',()=>{
 const x=c5BlcFrontDiscardDown();
 assert.deepEqual(x.registered,['BLC-2-003']);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.mst,57);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.readyFromKeywords,0);
 assert.equal(EXPECTED_V2_IDS.bleach.includes('BLC-2-003'),true);
});

test('BLC-2-003 matches the catalogue and the shared field reduction',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-003');
 assert.equal(printed.effect,'主要階段・位於前線・每回合 1 次：將 1 張手牌送至場外，使 1 個敵方場上 BP 1500 以上角色本回合 BP −1000。');
 const card=bleach.cards['BLC-2-003'];
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger],
  ['yellow',2,1,3000,1,'active']);
 assert.deepEqual(card.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'discardGate',optional:false,then:[{op:'enemyBpDown',bp:1000,optional:false,
   minBp:1500,zone:'field'}]}]});
 assert.deepEqual(card.effects,{});
});

test('BLC-2-003 reduces one opposing field character at BP 1500 or more',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:2003,first:0}),'main');
 const actor=place(s,0,'BLC-2-003','front',0,false);
 const energyCopy=place(s,0,'BLC-2-003','energy',0,true);
 const pay=take(s,0,'BLC-1-001');
 s.players[0].hand.push(pay);
 const low=place(s,1,lowId,'front',0,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 const high=place(s,1,highId,'energy',0,true);
 const before=universalBp(packs,s,high);
 s.players[0].outside.push(...s.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 s.players[0].hand.push(s.players[0].outside.splice(s.players[0].outside.findIndex(c=>c.uid===pay.uid),1)[0]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='frontOnce');
 assert.ok(act);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null}));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,false);
 const choices=legalUniversalActions(packs,s);
 assert.equal(choices.some(a=>a.type==='chooseTarget'&&a.uid===low.uid),false);
 assert.ok(choices.some(a=>a.type==='chooseTarget'&&a.uid===high.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:null}));
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(packs,s,s.players[1].energy.find(c=>c?.uid===high.uid)),before-1000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:energyCopy.uid,
  targetUid:actor.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-2-003 ACTIVE life readies one own character and adds 3000 BP this turn',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:20031,first:0}),'main');
 const actor=place(s,0,'BLC-1-008','front',0,true);
 const ally=place(s,1,'BLC-1-001','front',0,false);
 const revealed=take(s,1,'BLC-2-003');
 const buried=s.players[1].life.shift();
 s.players[1].deck.push(buried);
 s.players[1].life.unshift(revealed);
 s=toPhase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'active');
 const action=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===ally.uid);
 assert.ok(action);
 aiOk(s);
 const before=universalBp(packs,s,ally);
 s=dispatchUniversalAction(packs,s,action);
 const live=s.players[1].front.find(c=>c?.uid===ally.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(packs,s,live),before+3000);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});
