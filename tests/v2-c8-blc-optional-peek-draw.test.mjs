import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPrivateChoices,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {c8BlcOptionalPeekDraw} from '../scripts/v2-c8-blc-optional-peek-draw.mjs';

// EX15BT/BLC-4-030 and EX15BT/BLC-4-066 official pages, 2026-10-24. No FAQ.
// Both: 【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、
// 自分の山札の上から1枚見て、山札の上か下に置き、カードを1枚引く。
// 030 is blue energy 0, DRAW. 066 is green energy 0, Gotei, ACTIVE.

const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
const PROGRAM={onPlay:[{op:'discardGate',optional:true,then:[
 {op:'peekTopOrBottom'},{op:'draw',count:1}]}]};
function deck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck(['BLC-4-030','BLC-4-066','BLC-1-001','BLC-1-008']);
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

test('C8 registers both whole-print optional peek draws',()=>{
 const x=c8BlcOptionalPeekDraw();
 assert.deepEqual([...x.registered].sort(),['BLC-4-030','BLC-4-066']);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.mst,57);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.readyFromKeywords,0);
 for(const id of ['BLC-4-030','BLC-4-066'])
  assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
});

test('both prints match the catalogue and the same shared program',()=>{
 const yoru=CARDS.find(c=>c.identity==='BLC-4-030');
 const uno=CARDS.find(c=>c.identity==='BLC-4-066');
 assert.equal(yoru.effect,'登場時：可將1張手牌送至場外；如此則查看牌庫頂1張，將其放回牌庫頂或底，再抽1張牌。');
 assert.equal(uno.effect,'登場時：可將1張手牌送至場外；如此則查看牌庫頂1張，放回牌庫頂或底，再抽1張牌。');
 const a=bleach.cards['BLC-4-030'],b=bleach.cards['BLC-4-066'];
 assert.deepEqual([a.color,a.energy,a.ap,a.bp,a.gen,a.trigger],['blue',0,1,1500,1,'draw']);
 assert.deepEqual([b.color,b.energy,b.ap,b.bp,b.gen,b.trigger],['green',0,1,1500,1,'active']);
 assert.deepEqual(b.traits,['護廷十三隊']);
 assert.deepEqual(a.effects,PROGRAM);
 assert.deepEqual(b.effects,PROGRAM);
});

test('BLC-4-030 peeks only after the optional discard, and can draw that card',()=>{
 let skipped=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4030,first:0}),'main');
 const lone=take(skipped,0,'BLC-4-030');
 skipped.players[0].outside.push(...skipped.players[0].hand.splice(0));
 skipped.players[0].hand.push(lone);
 const deckBefore=skipped.players[0].deck.length;
 skipped=dispatchUniversalAction(packs,skipped,legalUniversalActions(packs,skipped).find(a=>a.type==='play'&&a.uid===lone.uid));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,deckBefore);

 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4031,first:0}),'main');
 const actor=take(s,0,'BLC-4-030');
 const pay=take(s,0,'BLC-1-001');
 s.players[0].outside.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(actor,pay);
 const seen=take(s,0,'BLC-1-008');
 s.players[0].deck.unshift(seen);
 s=dispatchUniversalAction(packs,s,{type:'play',uid:actor.uid,line:'energy',slot:0});
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.pending.optional,true);
 aiOk(s);
 const declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseDiscardGate',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===pay.uid),true);
 assert.equal(declined.players[0].deck[0].uid,seen.uid);

 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(s.pending.kind,'private-top-place');
 const mine=universalPrivateChoices(packs,s,0);
 assert.equal(mine.options[0].card.cardId,'BLC-1-008');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(seen.uid),false);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.players[0].hand.some(c=>c.uid===seen.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);

 let bottom=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4032,first:0}),'main');
 const again=take(bottom,0,'BLC-4-030');
 const cost=take(bottom,0,'BLC-1-001');
 bottom.players[0].outside.push(...bottom.players[0].hand.splice(0));
 bottom.players[0].hand.push(again,cost);
 const buried=take(bottom,0,'BLC-1-008');
 bottom.players[0].deck.unshift(buried);
 bottom=dispatchUniversalAction(packs,bottom,{type:'play',uid:again.uid,line:'front',slot:0});
 bottom=dispatchUniversalAction(packs,bottom,{type:'chooseDiscardGate',uid:cost.uid});
 bottom=dispatchUniversalAction(packs,bottom,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(bottom.players[0].deck.at(-1).uid,buried.uid);
 assert.equal(bottom.players[0].hand.some(c=>c.uid===buried.uid),false);
 assert.equal(countCards(bottom.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(bottom)),true);
});

test('BLC-4-066 ACTIVE life readies one own character and adds 3000 BP this turn',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4066,first:0}),'main');
 const actor=place(s,0,'BLC-1-008','front',0,true);
 const ally=place(s,1,'BLC-1-001','front',0,false);
 const revealed=take(s,1,'BLC-4-066');
 const buried=s.players[1].life.shift();
 s.players[1].deck.push(buried);
 s.players[1].life.unshift(revealed);
 s=toPhase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'active');
 const action=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===ally.uid);
 assert.ok(action);
 const before=universalBp(packs,s,ally);
 s=dispatchUniversalAction(packs,s,action);
 const live=s.players[1].front.find(c=>c?.uid===ally.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(packs,s,live),before+3000);
 assert.equal(countCards(s.players[1]),50);
});
