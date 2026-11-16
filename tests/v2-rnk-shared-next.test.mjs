import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_SHARED_NEXT} from '../dist/rnk/jp-evidence-shared-next.mjs';
import {RNK_PROGRAMS_SHARED_NEXT} from '../dist/universal-v2/rnk/programs-shared-next.mjs';
import {RNK_PROGRAMS_036_042} from '../dist/universal-v2/rnk/programs-036-042.mjs';
import {rnkSharedCard} from '../dist/universal-v2/rnk-shared-adapter.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {createUniversalPack,V2_EFFECT_OPS,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPrivateChoices,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const IDS=['RNK-1-037','RNK-1-095','RNK-1-112','RNK-1-113'];
const NAMES=['緋村 剣心','斎藤 一','相楽 左之助'];
const source=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
const pack=createRnkBcdBatchStagingPack();
const packs=[pack,pack];

function deck(){
 const counts={
  'RNK-1-035':4,'RNK-1-073':4,'RNK-1-006':4,'RNK-1-002':4,
  'RNK-1-037':4,'RNK-1-095':4,'RNK-1-112':4,'RNK-1-113':4,
  'RNK-1-014':4,'RNK-1-053':4,'RNK-1-055':4,'RNK-1-074':4,'RNK-1-091':2
 };
 assert.equal(Object.values(counts).reduce((s,n)=>s+n,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function seat(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toMain(s){
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');
 return s;
}
function fresh(){
 return toMain(newUniversalMatch(pack,{decks:[counts,counts],seed:41116,first:0,openingMulligan:false}));
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1+(c.stack?.length||0)+(c.under?.length||0);
 return n;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty+' '+JSON.stringify(ai));
 }
}

test('037, 095, 112 and 113 keep Japanese evidence distinct from Traditional Chinese display',()=>{
 assert.equal(RNK_BATCH_STAGING_IDS.length,95);
 assert.equal(Object.keys(pack.cards).length,95);
 for(const id of IDS){
  const jp=RNK_JP_EVIDENCE_SHARED_NEXT[id],tc=source[id],v2=pack.cards[id];
  assert.equal(jp.print,tc.number);
  assert.equal(v2.name,jp.nameJa);
  assert.equal(v2.energy,tc.energy);
  assert.equal(v2.ap,tc.ap);
  assert.equal(v2.bp,tc.bp);
  assert.equal(v2.gen,tc.gen);
  assert.equal(v2.trigger,tc.trigger);
  assert.equal(v2.color,tc.color);
  assert.equal(v2.type,tc.type);
  assert.equal(tc.battleReady,false);
  assert.equal(tc.cardDataVerified,false);
  assert.equal(RNK_IDENTITY_INVENTORY.find(c=>c.id===id).effectImplemented,false);
  assert.ok(jp.sourceJa.startsWith('https://www.merucarduniari.jp/'));
  assert.ok(jp.officialEnglish.includes('/en/cardlist/'));
  assert.notEqual(tc.nameZhTw,jp.nameJa);
 }
 assert.equal(source['RNK-1-112'].set,'UA41ST');
 assert.equal(source['RNK-1-113'].set,'UA41ST');
 assert.equal(source['RNK-1-112'].needsManualReview,true);
 assert.equal(source['RNK-1-113'].needsManualReview,true);
 assert.equal(RNK_PROGRAMS_036_042['RNK-1-037'].ready,false);
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});

test('shared programs use only existing V2 ops and reject approximate shapes',()=>{
 const shift=pack.cards['RNK-1-037'].effects.onPlay[0];
 assert.deepEqual(shift,{op:'mayShiftOwnCharacter',optional:true,names:NAMES});
 assert.deepEqual(pack.cards['RNK-1-095'].effects.onPlay,[
  {op:'buffNamedImpact',name:'相楽 左之助',bp:1500,impact:1,duration:'turn',upTo:1},
  {op:'draw',count:1}
 ]);
 assert.deepEqual(pack.cards['RNK-1-112'].effects.onPlay,[{op:'placeHandOnDeckTop'}]);
 assert.deepEqual(pack.cards['RNK-1-113'].effects.onAttack,[{op:'optionalDrawSkipNextActive'}]);
 for(const id of IDS)for(const list of Object.values(pack.cards[id].effects))
  for(const step of list)assert.ok(V2_EFFECT_OPS.includes(step.op));
 const ja=id=>RNK_JP_EVIDENCE_SHARED_NEXT[id];
 const unrestricted=rnkSharedCard(source['RNK-1-037'],{
  ready:true,implementation:'dsl',effects:{onPlay:[{op:'mayShiftOwnCharacter'}]}
 },ja('RNK-1-037'));
 assert.throws(()=>createUniversalPack({id:'rnk',cards:[unrestricted]}),/own line shift/);
 const halfStep=rnkSharedCard(source['RNK-1-095'],{
  ready:true,implementation:'dsl',effects:{onPlay:[
   {op:'buffNamedImpact',name:'相楽 左之助',bp:750,impact:1,duration:'turn',upTo:1},
   {op:'draw',count:1}
  ]}
 },ja('RNK-1-095'));
 assert.throws(()=>createUniversalPack({id:'rnk',cards:[halfStep]}),/invalid named impact buff/);
 const drawnTop=rnkSharedCard(source['RNK-1-112'],{
  ready:true,implementation:'dsl',effects:{onPlay:[{op:'drawHandTop'}]}
 },ja('RNK-1-112'));
 assert.throws(()=>createUniversalPack({id:'rnk',cards:[drawnTop]}),/draw then hand-to-top/);
});

test('037 moves only Kenshin, Saito or Sanosuke, including a printed alias, and can be declined',()=>{
 let s=fresh();
 for(let slot=0;slot<3;slot++)seat(s,0,'RNK-1-035','energy',slot);
 const hiko=seat(s,0,'RNK-1-006','front',0);
 const alias=seat(s,0,'RNK-1-002','front',1);
 const actor=take(s,0,'RNK-1-037');
 s.players[0].hand.push(actor);
 const before=countCards(s.players[0]);
 s=dispatchUniversalAction(packs,s,{type:'play',uid:actor.uid,line:'front',slot:2});
 assert.equal(s.pending.kind,'effect-line-move');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.names,NAMES);
 const choices=new Set(s.pending.choices);
 assert.equal(choices.has(hiko.uid),false);
 assert.equal(choices.has(alias.uid),true);
 assert.equal(choices.has(actor.uid),true);
 assert.ok([...choices].every(uid=>{
  const card=s.players[0].front.find(c=>c?.uid===uid)||s.players[0].energy.find(c=>c?.uid===uid);
  return NAMES.includes(pack.cards[card.cardId].name)||pack.cards[card.cardId].nameAliases?.includes('緋村 剣心');
 }));
 aiOk(s);
 const skipped=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseLineMove',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front[1].uid,alias.uid);
 assert.throws(()=>dispatchUniversalAction(packs,structuredClone(s),{type:'chooseLineMove',uid:hiko.uid}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseLineMove',uid:alias.uid});
 assert.equal(s.pending.kind,'effect-line-slot');
 aiOk(s);
 const slot=legalUniversalActions(packs,s).find(a=>a.slot===3);
 s=dispatchUniversalAction(packs,s,slot);
 assert.equal(s.players[0].energy.some(c=>c?.uid===alias.uid),true);
 assert.equal(s.players[0].front[1],null);
 assert.equal(countCards(s.players[0]),before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('095 gives 1500 BP and Impact only to Sanosuke, then still draws if declined',()=>{
 let s=fresh();
 seat(s,0,'RNK-1-091','energy',0);
 seat(s,0,'RNK-1-091','energy',1);
 const sano=seat(s,0,'RNK-1-073','front',0);
 const other=seat(s,0,'RNK-1-006','front',1);
 const event=take(s,0,'RNK-1-095');
 const top=s.players[0].deck[0];
 s.players[0].hand.push(event);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(s.pending.kind,'effect-named-impact');
 assert.equal(s.pending.bp,1500);
 assert.deepEqual(s.pending.choices,[sano.uid]);
 assert.equal(s.players[0].hand.length,hand-1);
 aiOk(s);
 const open=structuredClone(s);
 const declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseNamedImpact',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===top.uid),true);
 assert.equal(universalBp(pack,declined,declined.players[0].front.find(c=>c.uid===sano.uid)),1500);
 assert.equal(declined.players[0].front.find(c=>c.uid===sano.uid).impactGranted,undefined);
 assert.throws(()=>dispatchUniversalAction(packs,structuredClone(open),{type:'chooseNamedImpact',uid:other.uid}));
 s=dispatchUniversalAction(packs,s,{type:'chooseNamedImpact',uid:sano.uid});
 const buffed=s.players[0].front.find(c=>c.uid===sano.uid);
 assert.equal(universalBp(pack,s,buffed),3000);
 assert.equal(buffed.impactGranted.amount,1);
 assert.equal(buffed.impactGranted.turn,s.turn);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c.uid===other.uid)),1500);
 assert.equal(s.players[0].hand.some(c=>c.uid===top.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('112 puts one hand card on top without drawing, from either line, and shows the whole hand privately',()=>{
 let s=fresh();
 seat(s,0,'RNK-1-035','energy',0);
 seat(s,0,'RNK-1-035','energy',1);
 const actor=take(s,0,'RNK-1-112');
 const kept=take(s,0,'RNK-1-006');
 s.players[0].outside.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(actor,kept);
 const deckTop=s.players[0].deck[0].uid;
 const before=countCards(s.players[0]);
 s=dispatchUniversalAction(packs,s,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(s.pending.kind,'effect-place-hand-top');
 assert.deepEqual(s.pending.choices,[kept.uid]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.equal(s.players[0].deck[0].uid,deckTop);
 const mine=universalPrivateChoices(packs,s,0);
 assert.equal(mine.options.some(o=>o.card?.cardId==='RNK-1-006'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseHandTop',uid:kept.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,kept.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===kept.uid),false);
 assert.equal(countCards(s.players[0]),before);

 let empty=fresh();
 seat(empty,0,'RNK-1-035','energy',0);
 seat(empty,0,'RNK-1-035','energy',1);
 const lone=take(empty,0,'RNK-1-112');
 empty.players[0].outside.push(...empty.players[0].hand.splice(0));
 empty.players[0].hand.push(lone);
 const untouched=empty.players[0].deck[0].uid;
 empty=dispatchUniversalAction(packs,empty,{type:'play',uid:lone.uid,line:'energy',slot:2});
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck[0].uid,untouched);
 assert.equal(empty.players[0].energy[2].uid,lone.uid);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

test('113 draws only when chosen, and only that draw skips the next ACTIVE attempt',()=>{
 let skipped=fresh();
 const quiet=seat(skipped,0,'RNK-1-113','front',0,true);
 const quietHand=skipped.players[0].hand.length;
 skipped=dispatchUniversalAction(packs,skipped,legalUniversalActions(packs,skipped).find(a=>a.type==='next'));
 assert.equal(skipped.phase,'attack');
 skipped=dispatchUniversalAction(packs,skipped,{type:'attack',uid:quiet.uid});
 assert.equal(skipped.pending.kind,'effect-may-draw');
 assert.equal(skipped.pending.thenSkip,true);
 aiOk(skipped);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseMayDraw',mode:'skip'});
 assert.equal(skipped.players[0].hand.length,quietHand);
 assert.equal(skipped.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed),false);

 let s=fresh();
 const actor=seat(s,0,'RNK-1-113','front',0,true);
 const top=s.players[0].deck[0];
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseMayDraw',mode:'draw'});
 assert.equal(s.players[0].hand.some(c=>c.uid===top.uid),true);
 assert.equal(s.players[0].hand.length,hand+1);
 const skip=s.continuousStates.find(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===actor.uid);
 assert.ok(skip);
 assert.equal(skip.targetStamp,s.players[0].front.find(c=>c?.uid===actor.uid).fieldEntryStamp);
 assert.equal(assertUniversalMatch(packs,s),true);

 let dry=fresh();
 const thirsty=seat(dry,0,'RNK-1-113','front',0,true);
 dry.players[0].outside.push(...dry.players[0].deck.splice(0));
 dry=dispatchUniversalAction(packs,dry,legalUniversalActions(packs,dry).find(a=>a.type==='next'));
 dry=dispatchUniversalAction(packs,dry,{type:'attack',uid:thirsty.uid});
 assert.notEqual(dry.pending?.kind,'effect-may-draw');
 assert.equal(dry.continuousStates.some(e=>e.kind==='skipNextActive'),false);
});
