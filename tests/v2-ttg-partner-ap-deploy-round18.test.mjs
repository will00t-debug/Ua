import test from 'node:test';
import assert from 'node:assert/strict';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official pages checked 2026-10-22. Neither card has a FAQ block.
// Cost alt 緑- is energy 0. Generated alt 緑 is gen 1. BP print is 1500+.
// Two sentences: a partner on the own field gives BP+1000, and a hand entry
// may pay 1 AP to REST-play one outside partner whose color energy is met.

const ttg=registeredV2TitlePack('gurren-lagann');
const packs=[ttg,ttg];

function deck(){
 const required=['TTG-1-007','TTG-1-013','TTG-1-005'];
 const rest=Object.values(ttg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(ttg,counts),[]);
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
function pressNext(s,guard=40){
 for(let n=0;n<guard;n++){
  if(s.pending){
   const legal=legalUniversalActions(packs,s);
   const choice=legal.find(a=>a.uid===null||a.mode==='skip')||legal[0];
   s=dispatchUniversalAction(packs,s,choice);
  }else s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
  if(s.active===0&&s.phase==='main'&&s.players[0].ownTurns===2)return s;
 }
 throw Error('Did not reach the second main');
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('TTG-1-007 and TTG-1-013 keep both printed sentences',()=>{
 for(const [id,partner,trigger] of [['TTG-1-007','ダリー','active'],['TTG-1-013','ギミー','draw']]){
  const source=UA56BT_VERIFIED.find(c=>c.identity===id);
  assert.equal(source.energy,0);
  assert.equal(source.gen,1);
  assert.equal(source.bp,1500);
  assert.equal(source.trigger,trigger);
  const card=ttg.cards[id];
  assert.equal(card.gen,1);
  assert.equal(card.frontGeneratesEnergy,false);
  assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownNameExists',turn:'any',
   zone:'field',excludeSelf:false,name:partner},bp:1000}]);
  assert.deepEqual(card.effects.onPlay,[{op:'payApDeployNamedRest',entry:'hand',name:partner}]);
  assert.ok(EXPECTED_V2_IDS['gurren-lagann'].includes(id));
 }
 const base={id:'LAB',name:'Lab',color:'green',type:'character',energy:0,ap:1,
  bp:1500,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-entry',cards:[{...base,
  effects:{onPlay:[{op:'payApDeployNamedRest',entry:'ownEffect',name:'ダリー'}]}}]}),
  /hand-entry AP/);
});

test('the partner bonus is live on either line, and the first AP is the play cost',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1007,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 const gimmy=take(s,0,'TTG-1-007');gimmy.ready=true;s.players[0].front[0]=gimmy;
 assert.equal(universalBp(packs,s,gimmy),1500);
 const held=take(s,0,'TTG-1-013');s.players[0].hand.push(held);
 assert.equal(universalBp(packs,s,gimmy),1500);
 const foe=take(s,1,'TTG-1-013');foe.ready=true;s.players[1].energy[0]=foe;
 assert.equal(universalBp(packs,s,gimmy),1500);
 const partner=take(s,0,'TTG-1-013');partner.ready=false;s.players[0].energy[0]=partner;
 assert.equal(universalBp(packs,s,gimmy),2500);
 const enemyTurn=structuredClone(s);enemyTurn.active=1;
 assert.equal(universalBp(packs,enemyTurn,enemyTurn.players[0].front[0]),2500);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:gimmy.uid,
  targetUid:gimmy.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),1500);
 s.continuousStates=[];
 const fresh=take(s,0,'TTG-1-007');
 s.players[0].hand.push(fresh);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===fresh.uid&&
  a.line==='front'&&!a.replaceUid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('a later turn can pay 1 AP and REST-play the partner, or decline',()=>{
 let s=pressNext(newUniversalMatch(packs,{decks:[counts,counts],seed:1013,first:0}));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 const partner=take(s,0,'TTG-1-013');
 s.players[0].outside.push(partner);
 const gimmy=take(s,0,'TTG-1-007');
 s.players[0].hand.push(gimmy);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===gimmy.uid&&
  a.line==='front'&&!a.replaceUid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-pay-ap-deploy');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,1);
 aiLegal(s);
 const declined=dispatchUniversalAction(packs,s,{type:'choosePayApDeploy',mode:'skip'});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].apCards.filter(c=>c.ready).length,1);
 assert.ok(declined.players[0].outside.some(c=>c.uid===partner.uid));
 s=dispatchUniversalAction(packs,s,{type:'choosePayApDeploy',mode:'pay'});
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.deepEqual(s.pending.choices,[partner.uid]);
 const enter=legalUniversalActions(packs,s).find(a=>a.type==='chooseOutsideNameRest'&&
  a.uid===partner.uid&&a.line==='energy'&&!a.replaceUid);
 s=dispatchUniversalAction(packs,s,enter);
 assert.equal(s.pending,null);
 const arrived=s.players[0].energy.find(c=>c?.uid===partner.uid);
 assert.equal(arrived.ready,false);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2500);
 assert.equal(universalEnergyByColor(packs,s,0).green>=1,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('required energy is the partner color, and an effect entry does not pay AP',()=>{
 const vanilla={color:'green',type:'character',energy:0,ap:1,bp:1500,gen:1,
  implementation:'vanilla',effects:{}};
 const cards=[
  {...vanilla,id:'GIMMY',name:'ギミー',implementation:'dsl',
   effects:{onPlay:[{op:'payApDeployNamedRest',entry:'hand',name:'ダリー'}]},
   passiveBonuses:[{condition:{kind:'ownNameExists',turn:'any',zone:'field',
    excludeSelf:false,name:'ダリー'},bp:1000}]},
  {...vanilla,id:'CHEAP',name:'ダリー'},
  {...vanilla,id:'COST',name:'ダリー',energy:2},
  {...vanilla,id:'BLUE',name:'ダリー',color:'blue',energy:1},
  {...vanilla,id:'ALIAS',name:'別名義',nameAliases:['ダリー'],implementation:'dsl'},
  {...vanilla,id:'GEN',name:'產能'},
  ...Array.from({length:7},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}))
 ];
 const lab=createUniversalPack({id:'lab-partner',cards});
 const labPacks=[lab,lab];
 const ids=cards.map(c=>c.id);
 const labCounts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 let s=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:1014,first:0});
 for(let n=0;n<40&&!(s.active===0&&s.phase==='main'&&s.players[0].ownTurns===2);n++){
  const legal=legalUniversalActions(labPacks,s);
  const choice=s.pending?(legal.find(a=>a.uid===null||a.mode==='skip')||legal[0]):
   legal.find(a=>a.type==='next');
  s=dispatchUniversalAction(labPacks,s,choice);
 }
 assert.equal(s.players[0].ownTurns,2);
 function pull(id){
  for(const zone of ['hand','deck','life','outside']){
   const i=s.players[0][zone].findIndex(c=>c.cardId===id);
   if(i>=0)return s.players[0][zone].splice(i,1)[0];
  }
  throw Error(id);
 }
 const gen=pull('GEN');gen.ready=true;s.players[0].energy[0]=gen;
 const cheap=pull('CHEAP'),cost=pull('COST'),blue=pull('BLUE'),alias=pull('ALIAS');
 s.players[0].outside.push(cheap,cost,blue,alias);
 const gimmy=pull('GIMMY');
 s.players[0].hand.push(gimmy);
 s=dispatchUniversalAction(labPacks,s,legalUniversalActions(labPacks,s).find(a=>
  a.type==='play'&&a.uid===gimmy.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(s.pending.kind,'effect-pay-ap-deploy');
 s=dispatchUniversalAction(labPacks,s,{type:'choosePayApDeploy',mode:'pay'});
 const choices=new Set(s.pending.choices);
 assert.equal(choices.has(cheap.uid),true);
 assert.equal(choices.has(blue.uid),false);
 assert.equal(choices.has(cost.uid),false);
 assert.equal(choices.has(alias.uid),true);
 const entered=dispatchUniversalAction(labPacks,s,legalUniversalActions(labPacks,s).find(a=>
  a.type==='chooseOutsideNameRest'&&a.uid===cheap.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].front[1].ready,false);
 assert.equal(assertUniversalMatch(labPacks,entered),true);
});
