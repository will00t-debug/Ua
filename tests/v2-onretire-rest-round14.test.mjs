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

// EX07BT/BLC-2-010 checked 2026-10-22:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-010
// 黄- / AP1 / キャラ / BP2000 / 星十字騎士団／バンビーズ / 発生黄 / トリガーなし
// Alt 退場時. Effect text:
// BP2000以下の相手のフロントLのキャラを1枚まで選び、レストにする。
// The card page has no FAQ. 「1枚まで」 is optional (Q83). Q91 allows choosing
// a character that is already REST. The catalogue Chinese sentence is only a
// fingerprint. The trait slash stays one catalogue token.

const bleach=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei');
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
const packs=[mst,bleach];
const foreign=deck(mst,['MST-1-010','MST-1-012','MST-1-002','MST-1-001'],'blue');
const home=deck(bleach,['BLC-2-010'],'yellow');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,{ready=true}={}){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;s.players[p][line][index]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,phase);
 return s;
}
function bpOf(s,uid){
 for(const p of s.players)for(const c of [...p.front,...p.energy])
  if(c?.uid===uid)return c;
 return null;
}

test('BLC-2-010 reuses optional opponent-front REST at or under BP 2000 on true retirement',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-010'));
 const card=bleach.cards['BLC-2-010'];
 const printed=CARDS.find(c=>c.identity==='BLC-2-010');
 assert.equal(printed.nameJa,'ミニーニャ・マカロン');
 assert.equal(printed.effect,'退場：可將最多 1 個敵方前線 BP 2000 以下角色轉為 REST。');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits],
  ['yellow',0,1,2000,1,null,['星十字騎士團／邦比愛塔親衛隊']]);
 assert.deepEqual(card.effects.onRetire,[{op:'restOppFrontUnderBp',bp:2000,optional:true}]);
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-2-010');
 assert.deepEqual(checkedBleachAddonDefinition(profile).templateEffects.onRetire,
  [{template:'restEnemyUnderBp',bp:2000,optional:true}]);
});

test('a lost battle retires BLC-2-010 and offers only legal front targets, including one that is already REST',()=>{
 let s=newUniversalMatch(packs,{decks:[foreign,home],seed:2010,first:0});
 const attacker=put(s,0,'MST-1-010','front',0);
 const low=put(s,0,'MST-1-012','front',1);
 const exact=put(s,0,'MST-1-002','front',2,{ready:false});
 const energy=put(s,0,'MST-1-001','energy',0);
 const blocker=put(s,1,'BLC-2-010','front',0);
 s=toPhase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(s.turnRetireEvents.some(e=>e.uid===blocker.uid),true);
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.equal(s.pending.player,1);
 assert.equal(s.pending.optional,true);
 assert.ok(s.pending.choices.includes(low.uid));
 assert.ok(s.pending.choices.includes(exact.uid));
 assert.equal(s.pending.choices.includes(attacker.uid),false);
 assert.equal(s.pending.choices.includes(energy.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:'0-nope'},{actor:1}),
  /not currently legal/);
 const ai=chooseUniversalAiAction(packs,s,'normal');
 assert.equal(ai.type,'chooseRestBp');
 assert.ok(ai.uid===null||s.pending.choices.includes(ai.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:exact.uid},{actor:1});
 assert.equal(bpOf(s,exact.uid).ready,false);
 assert.equal(bpOf(s,low.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-010 may decline, finds nothing when every front card is over 2000, and silence prints no REST',()=>{
 let s=newUniversalMatch(packs,{decks:[foreign,home],seed:2011,first:0});
 const attacker=put(s,0,'MST-1-010','front',0);
 const low=put(s,0,'MST-1-012','front',1);
 const blocker=put(s,1,'BLC-2-010','front',0);
 s=toPhase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.pending.kind,'effect-rest-bp');
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(bpOf(s,low.uid).ready,true);
 assert.equal(s.pending,null);

 let quiet=newUniversalMatch(packs,{decks:[foreign,home],seed:2012,first:0});
 const big=put(quiet,0,'MST-1-010','front',0);
 const other=put(quiet,0,'MST-1-010','front',1);
 const alone=put(quiet,1,'BLC-2-010','front',0);
 quiet=toPhase(quiet,'attack');
 quiet=dispatchUniversalAction(packs,quiet,{type:'attack',uid:big.uid});
 quiet=dispatchUniversalAction(packs,quiet,{type:'chooseBlock',uid:alone.uid},{actor:1});
 assert.equal(quiet.pending,null,'no front card at or under 2000 opens no REST choice');
 assert.equal(bpOf(quiet,other.uid).ready,true);

 let silenced=newUniversalMatch(packs,{decks:[foreign,home],seed:2013,first:0});
 const foe=put(silenced,0,'MST-1-010','front',0);
 put(silenced,0,'MST-1-012','front',1);
 const muted=put(silenced,1,'BLC-2-010','front',0);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:foe.uid,targetUid:muted.uid,until:{player:1,phase:'attack',edge:'end'}});
 silenced=toPhase(silenced,'attack');
 silenced=dispatchUniversalAction(packs,silenced,{type:'attack',uid:foe.uid});
 silenced=dispatchUniversalAction(packs,silenced,{type:'chooseBlock',uid:muted.uid},{actor:1});
 assert.equal(silenced.pending,null);
 assert.ok(silenced.players[1].outside.some(c=>c.uid===muted.uid));
});

function unit(id,extra){
 return {id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{},...extra};
}
const lab=createUniversalPack({id:'retire-rest-lab',cards:[
 unit('SWEEP',{effects:{onPlay:[{op:'retireOppFrontAllUnderBp',bp:9000}]}}),
 unit('STRIP',{effects:{onPlay:[{op:'stripOppRaidTop',optional:true}]}}),
 unit('BOUNCE',{effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',energy:5}]}}),
 unit('PLAY',{implementation:'vanilla'}),
 unit('LOW',{implementation:'vanilla',bp:1000}),
 unit('HIGH',{implementation:'vanilla',bp:3000}),
 unit('RESTY',{bp:1500,effects:{onRetire:[{op:'restOppFrontUnderBp',bp:2000,optional:true}]}}),
 unit('NARROW',{bp:1500,effects:{onRetire:[{op:'restOppFrontUnderBp',bp:1000,optional:true}]}}),
 unit('WIDE',{bp:1500,effects:{onRetire:[{op:'restOppFrontUnderBp',bp:5000,optional:true}]}}),
 unit('LEAVE',{name:'Leave',bp:2000,raidName:'Base',
  conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:500},
  effects:{onRetire:[{op:'restOppFrontUnderBp',bp:2000,optional:true}]}}),
 unit('TOP',{name:'Top',bp:1500,raidName:'Base',
  effects:{onRetire:[{op:'restOppFrontUnderBp',bp:2000,optional:true}]}}),
 unit('BASE',{name:'Base',implementation:'vanilla',bp:1000}),
 unit('FILL',{implementation:'vanilla'})
]});
const labIds=['SWEEP','STRIP','BOUNCE','PLAY','LOW','HIGH','RESTY','NARROW','WIDE','LEAVE','TOP','BASE','FILL'];
const labDeck=Object.fromEntries(labIds.map(id=>[id,id==='BASE'?2:4]));
function labTake(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing lab '+id);
}
function labPut(s,p,id,line,index){
 const c=labTake(s,p,id);c.ready=true;s.players[p][line][index]=c;return c;
}
function labMain(seed){
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed,first:0});
 s=dispatchUniversalAction(lab,s,{type:'next'});
 s=dispatchUniversalAction(lab,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function play(s,id){
 const card=s.players[0].hand.find(c=>c.cardId===id)||labTake(s,0,id);
 if(!s.players[0].hand.includes(card))s.players[0].hand.push(card);
 const action=legalUniversalActions(lab,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy');
 assert.ok(action,id);
 return dispatchUniversalAction(lab,s,action);
}

test('raid strip, bounce and removal are not retirement, so onRetire REST never starts',()=>{
 let s=labMain(14);
 const base=labTake(s,1,'BASE'),top=labPut(s,1,'TOP','front',0);
 top.stack=[base];
 const low=labPut(s,0,'LOW','front',0);
 s=play(s,'STRIP');
 assert.equal(s.pending.kind,'effect-strip-raid-top');
 s=dispatchUniversalAction(lab,s,{type:'chooseRaidTopStrip',uid:top.uid});
 assert.equal(s.players[1].front[0].uid,base.uid);
 assert.ok(s.players[1].outside.some(c=>c.uid===top.uid));
 assert.equal(s.turnRetireEvents.some(e=>e.uid===top.uid),false);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c?.uid===low.uid).ready,true);

 let bounced=labMain(15);
 const victim=labPut(bounced,0,'RESTY','front',0);
 bounced=play(bounced,'BOUNCE');
 assert.equal(bounced.pending.kind,'effect-bounce-own');
 bounced=dispatchUniversalAction(lab,bounced,{type:'chooseOwnBounce',uid:victim.uid});
 assert.ok(bounced.players[0].hand.some(c=>c.uid===victim.uid));
 assert.equal(bounced.turnRetireEvents.some(e=>e.uid===victim.uid),false);
 assert.equal(bounced.pending,null);

 let removed=labMain(16);
 const occupied=[];
 for(let i=0;i<4;i++)occupied.push(labPut(removed,0,i===0?'RESTY':'FILL','front',i));
 const incoming=labTake(removed,0,'PLAY');
 removed.players[0].hand.push(incoming);
 const replace=legalUniversalActions(lab,removed).find(a=>a.type==='play'&&a.uid===incoming.uid&&
  a.line==='front'&&a.replaceUid===occupied[0].uid);
 assert.ok(replace);
 removed=dispatchUniversalAction(lab,removed,replace);
 assert.ok(removed.players[0].removed.some(c=>c.uid===occupied[0].uid));
 assert.equal(removed.players[0].outside.some(c=>c.uid===occupied[0].uid),false);
 assert.equal(removed.turnRetireEvents.some(e=>e.uid===occupied[0].uid),false);
 assert.equal(removed.pending,null);
 assert.equal(assertUniversalMatch(lab,removed),true);
});

test('leave-replacement can keep the card, and leaving then opens the same REST choice',()=>{
 let kept=labMain(17);
 const low=labPut(kept,0,'LOW','front',0);
 const leave=labPut(kept,1,'LEAVE','front',0);
 const under=labTake(kept,1,'FILL');under.faceDown=true;leave.under=[under];
 kept=play(kept,'SWEEP');
 assert.equal(kept.pending.kind,'leave-replacement');
 kept=dispatchUniversalAction(lab,kept,{type:'chooseLeaveReplacement',mode:'protect'},{actor:1});
 assert.equal(kept.players[1].front[0].uid,leave.uid);
 assert.equal(kept.turnRetireEvents.some(e=>e.uid===leave.uid),false);
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].front.find(c=>c?.uid===low.uid).ready,true);

 let gone=labMain(18);
 const target=labPut(gone,0,'LOW','front',0);
 const leaving=labPut(gone,1,'LEAVE','front',0);
 const hidden=labTake(gone,1,'FILL');hidden.faceDown=true;leaving.under=[hidden];
 gone=play(gone,'SWEEP');
 assert.equal(gone.pending.kind,'leave-replacement');
 gone=dispatchUniversalAction(lab,gone,{type:'chooseLeaveReplacement',mode:'leave'},{actor:1});
 assert.ok(gone.players[1].outside.some(c=>c.uid===leaving.uid));
 assert.equal(gone.pending.kind,'effect-rest-bp');
 assert.ok(gone.pending.choices.includes(target.uid));
 gone=dispatchUniversalAction(lab,gone,{type:'chooseRestBp',uid:target.uid},{actor:1});
 assert.equal(gone.players[0].front.find(c=>c?.uid===target.uid).ready,false);
});

test('two true retirements keep controller order before either REST choice resolves',()=>{
 let s=labMain(19);
 const mid=labPut(s,0,'LOW','front',0);
 mid.buffs=[{bp:500,untilTurn:s.turn}];
 const narrow=labPut(s,1,'NARROW','front',0);
 const wide=labPut(s,1,'WIDE','front',1);
 s=play(s,'SWEEP');
 assert.equal(s.pending.kind,'retirement-order');
 assert.equal(s.pending.player,1);
 const wideFirst=s.pending.entries.find(e=>e.sourceUid===wide.uid);
 s=dispatchUniversalAction(lab,s,{type:'chooseRetirementOrder',key:wideFirst.key},{actor:1});
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.ok(s.pending.choices.includes(mid.uid),'the wider cap is the program chosen first');
 s=dispatchUniversalAction(lab,s,{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(s.pending,null,'the 1500 card is outside the narrower cap, so that program opens nothing');
 assert.equal(s.players[0].front.find(c=>c?.uid===mid.uid).ready,true);
 assert.equal(assertUniversalMatch(lab,s),true);
 assert.ok(s.players[1].outside.some(c=>c.uid===narrow.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===wide.uid));
});
