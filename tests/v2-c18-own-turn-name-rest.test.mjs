import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX07BT/BLC-2-039, fetched 2026-10-24:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-039
// 退場時：自分のターン中の場合、相手のフロントLのキャラを1枚まで選び、レストにする。
// 〈シャルロッテ・クールホーン〉のこの効果は1ターンに1回のみ発動できる。
// Q1041: 「この効果」 is only that retire sentence.
// Q1042: two copies cannot each activate it in the same turn.
// ACTIVE life is the generic one. The catalogue slash trait stays one token.

const gate={op:'oncePerTurnGate',scope:'name',optional:false,ownTurnOnly:true,
 then:[{op:'restOppFrontOne',optional:true}]};
const cardGate={...gate,scope:'card'};
function unit(id,extra){
 return {id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'dsl',effects:{},...extra};
}
function accept(cards){
 return createUniversalPack({id:'c18-schema',cards});
}
test('own-turn name gate accepts a nested front REST and rejects a false flag',()=>{
 const ok=unit('OK',{name:'Shared',effects:{onRetire:[gate]}});
 assert.equal(accept([ok,unit('FILL',{implementation:'vanilla'})]).cards.OK
  .effects.onRetire[0].ownTurnOnly,true);
 assert.throws(()=>accept([unit('BAD',{effects:{onRetire:[{...gate,ownTurnOnly:false}]}})]),
  /invalid once-per-turn gate/);
 assert.throws(()=>accept([unit('BAD',{effects:{onRetire:[{...gate,extra:1}]}})]),
  /invalid once-per-turn gate/);
 assert.throws(()=>accept([unit('BAD',{effects:{onRetire:[{...gate,then:[{op:'activeOwnNamed',
  name:'X',max:1,optional:true}]}]}})]),/invalid once-per-turn gate/);
 assert.doesNotThrow(()=>accept([unit('ANY',{effects:{onRetire:[{op:'oncePerTurnGate',
  scope:'name',optional:false,then:[{op:'draw',count:1}]}]}})]));
});

const ids=['GATE','OTHER','CARD','BIG','SMALL','RESTED','WALL','ENERGY','FILL','A','B','C','D'];
const labDeck=Object.fromEntries(ids.map(id=>[id,id==='D'?2:4]));
const wallTax={scope:'self',sourceLine:'field',period:'opponentTurn',
 sourceTypes:['character'],count:1,stackPolicy:'nonstackSameGroup',
 stackGroup:'c18-wall',name:null};
const lab=createUniversalPack({id:'c18-lab',cards:[
 unit('GATE',{name:'Shared',effects:{onRetire:[gate]}}),
 unit('OTHER',{name:'Other',effects:{onRetire:[gate]}}),
 unit('CARD',{name:'Shared',effects:{onRetire:[cardGate]}}),
 unit('BIG',{implementation:'vanilla',bp:5000}),
 unit('SMALL',{implementation:'vanilla',bp:1000}),
 unit('RESTED',{implementation:'vanilla',bp:1000}),
 unit('WALL',{bp:5000,selectionHandDiscardTax:wallTax}),
 unit('ENERGY',{implementation:'vanilla',bp:1000}),
 unit('FILL',{implementation:'vanilla'}),
 unit('A',{implementation:'vanilla'}),
 unit('B',{implementation:'vanilla'}),
 unit('C',{implementation:'vanilla'}),
 unit('D',{implementation:'vanilla'})
]});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,{ready=true,stamp=null}={}){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;
 if(stamp!==null)c.fieldEntryStamp=stamp;
 s.players[p][line][index]=c;return c;
}
function fresh(seed,first=0){
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed,first});
 for(let n=0;n<8&&s.phase!=='attack';n++)
  s=dispatchUniversalAction(lab,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.active,first);
 return s;
}
function loseBattle(s,attacker,blocker,blockerActor){
 s=dispatchUniversalAction(lab,s,{type:'attack',uid:attacker});
 assert.equal(s.pending.kind,'block');
 return dispatchUniversalAction(lab,s,{type:'chooseBlock',uid:blocker},{actor:blockerActor});
}
function at(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}

test('a shared printed name rests one opposing front once, and a different name does not share it',()=>{
 let s=fresh(1801);
 const big=put(s,1,'BIG','front',0);
 const small=put(s,1,'SMALL','front',1);
 const next=put(s,1,'BIG','front',2);
 const last=put(s,1,'BIG','front',3);
 const energy=put(s,1,'ENERGY','energy',0);
 const hand=s.players[1].hand[0];
 const first=put(s,0,'GATE','front',0);
 const second=put(s,0,'GATE','front',1);
 const other=put(s,0,'OTHER','front',2);
 s=loseBattle(s,first.uid,big.uid,1);
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.player,0);
 assert.equal(s.pending.optional,true);
 assert.deepEqual(legalUniversalActions(lab,s)[0],{type:'chooseRestBp',uid:null});
 assert.ok(s.pending.choices.includes(big.uid));
 assert.equal(at(s,1,big.uid).ready,false);
 assert.ok(s.pending.choices.includes(small.uid));
 assert.equal(s.pending.choices.includes(energy.uid),false);
 assert.equal(s.pending.choices.includes(hand.uid),false);
 assert.equal(s.pending.choices.includes(second.uid),false);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseRestBp',uid:'0-nope'}),
  /not currently legal/);
 const ai=chooseUniversalAiAction(lab,s,{difficulty:'normal'});
 assert.equal(ai.type,'chooseRestBp');
 assert.equal(ai.uid,small.uid);
 s=dispatchUniversalAction(lab,s,{type:'chooseRestBp',uid:small.uid});
 assert.equal(at(s,1,small.uid).ready,false);
 assert.deepEqual(s.onceEffectUses[0],['name:Shared']);
 assert.equal(s.pending,null);
 s=loseBattle(s,second.uid,next.uid,1);
 assert.notEqual(s.pending?.kind,'effect-rest-bp');
 assert.deepEqual(s.onceEffectUses[0],['name:Shared']);
 while(s.pending)s=dispatchUniversalAction(lab,s,legalUniversalActions(lab,s)[0],
  {actor:s.pending.player});
 assert.equal(s.phase,'attack');
 s=loseBattle(s,other.uid,last.uid,1);
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.deepEqual(s.onceEffectUses[0],['name:Shared','name:Other']);
 s=dispatchUniversalAction(lab,s,{type:'chooseRestBp',uid:null});
 assert.equal(assertUniversalMatch(lab,s),true);
});

test('declining the REST still spends the shared name, and the opponent turn does not',()=>{
 let s=fresh(1802);
 const big=put(s,1,'BIG','front',0);
 const next=put(s,1,'BIG','front',1);
 const first=put(s,0,'GATE','front',0);
 const second=put(s,0,'GATE','front',1);
 s=loseBattle(s,first.uid,big.uid,1);
 s=dispatchUniversalAction(lab,s,{type:'chooseRestBp',uid:null});
 assert.deepEqual(s.onceEffectUses[0],['name:Shared']);
 s=loseBattle(s,second.uid,next.uid,1);
 assert.notEqual(s.pending?.kind,'effect-rest-bp');

 let opp=fresh(1803);
 const foe=put(opp,0,'BIG','front',0);
 const blocked=put(opp,1,'GATE','front',0);
 opp=loseBattle(opp,foe.uid,blocked.uid,1);
 assert.notEqual(opp.pending?.kind,'effect-rest-bp');
 assert.deepEqual(opp.onceEffectUses[1],[]);
 assert.ok(opp.players[1].outside.some(c=>c.uid===blocked.uid));
});

test('a card-scoped gate does not block another copy, silence spends nothing, and no legal front opens nothing',()=>{
 let s=fresh(1804);
 const big=put(s,1,'BIG','front',0);
 const next=put(s,1,'BIG','front',1);
 const first=put(s,0,'CARD','front',0);
 const second=put(s,0,'CARD','front',1);
 s=loseBattle(s,first.uid,big.uid,1);
 assert.equal(s.pending.kind,'effect-rest-bp');
 s=dispatchUniversalAction(lab,s,{type:'chooseRestBp',uid:null});
 assert.deepEqual(s.onceEffectUses[0],[`uid:${first.uid}`]);
 s=loseBattle(s,second.uid,next.uid,1);
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.player,0);

 let muted=fresh(1805);
 const blocker=put(muted,1,'BIG','front',0);
 const laterBlock=put(muted,1,'BIG','front',1);
 const quiet=put(muted,0,'GATE','front',0);
 const later=put(muted,0,'GATE','front',1);
 grantContinuousState(muted,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:blocker.uid,targetUid:quiet.uid,
  until:{player:0,phase:'attack',edge:'end'}});
 muted=loseBattle(muted,quiet.uid,blocker.uid,1);
 assert.notEqual(muted.pending?.kind,'effect-rest-bp');
 assert.deepEqual(muted.onceEffectUses[0],[]);
 while(muted.pending)muted=dispatchUniversalAction(lab,muted,
  legalUniversalActions(lab,muted)[0],{actor:muted.pending.player});
 muted=loseBattle(muted,later.uid,laterBlock.uid,1);
 assert.equal(muted.pending.kind,'effect-rest-bp');

 let empty=fresh(1806);
 const wall=put(empty,1,'WALL','front',0,{stamp:1});
 const lonely=put(empty,0,'GATE','front',0);
 empty.players[0].deck.push(...empty.players[0].hand.splice(0));
 empty=loseBattle(empty,lonely.uid,wall.uid,1);
 assert.equal(empty.pending,null);
 assert.deepEqual(empty.onceEffectUses[0],['name:Shared']);
 assert.equal(at(empty,1,wall.uid).ready,false);
 assert.equal(assertUniversalMatch(lab,empty),true);
});

const bleach=registeredV2TitlePack('bleach');
const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[bleach,mst];
function realDeck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13,required.join(','));
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const home=realDeck(bleach,['BLC-2-039'],'blue');
const foreign=realDeck(mst,['MST-1-018','MST-1-012','MST-1-001'],'blue');
function realTake(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function realPut(s,p,id,line,index,{ready=true}={}){
 assert.equal(s.players[p][line][index],null);
 const c=realTake(s,p,id);c.ready=ready;s.players[p][line][index]=c;return c;
}

test('BLC-2-039 matches the printed retire sentence and the shared name gate',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-039'));
 const printed=CARDS.find(c=>c.identity==='BLC-2-039');
 const card=bleach.cards['BLC-2-039'];
 assert.equal(printed.nameJa,'シャルロッテ・クールホーン');
 assert.equal(printed.effect,'退場：若現在是己方回合，可將最多 1 個敵方前線角色轉為 REST。所有〈夏洛特・庫爾霍恩〉的此效果，合計每回合只能發動 1 次。');
 assert.equal(printed.trigger,'active');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits],
  ['blue',2,1,3000,1,'active',['破面／涅骸部隊']]);
 assert.equal(card.triggerEffect??null,null);
 assert.deepEqual(card.effects.onRetire,[{op:'oncePerTurnGate',scope:'name',optional:false,
  ownTurnOnly:true,then:[{op:'restOppFrontOne',optional:true}]}]);
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-2-039');
 assert.equal(checkedBleachAddonDefinition(profile).name,'シャルロッテ・クールホーン');
 let s=newUniversalMatch(packs,{decks:[home,foreign],seed:2039,first:0});
 const first=realPut(s,0,'BLC-2-039','front',0);
 const second=realPut(s,0,'BLC-2-039','front',1);
 const big=realPut(s,1,'MST-1-018','front',0);
 const next=realPut(s,1,'MST-1-018','front',1);
 const energy=realPut(s,1,'MST-1-001','energy',0);
 for(let n=0;n<8&&s.phase!=='attack';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:big.uid},{actor:1});
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.player,0);
 assert.ok(s.pending.choices.includes(big.uid));
 assert.equal(s.pending.choices.includes(energy.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:energy.uid}),
  /not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null});
 assert.deepEqual(s.onceEffectUses[0],['name:シャルロッテ・クールホーン']);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:second.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:next.uid},{actor:1});
 assert.notEqual(s.pending?.kind,'effect-rest-bp');
 assert.equal(assertUniversalMatch(packs,s),true);
});
