import test from 'node:test';
import assert from 'node:assert/strict';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalEnergyByColor,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. No FAQ block.
// Header icon alt is 緑+ (one green pip), so gen is 1. The activate text
// pays 1 AP, once per turn, draws 1, and gives this character +1 generated
// energy this turn. It does not rest the source. A front character still
// produces nothing.

const ttg=registeredV2TitlePack('gurren-lagann');
const packs=[ttg,ttg];
const base={id:'LAB',name:'Lab',color:'green',type:'character',energy:0,ap:1,
 bp:500,gen:1,implementation:'dsl',effects:{}};

function deck(){
 const required=['TTG-1-015','TTG-1-018'];
 const rest=Object.values(ttg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,11)];
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
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<6&&s.phase!==phase;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('TTG-1-015 pays one AP once per turn and keeps generated energy at one pip',()=>{
 const source=UA56BT_VERIFIED.find(c=>c.id==='TTG-1-015');
 assert.equal(source.effect,'主要階段每回合一次，支付1 AP：抽1張；本回合產生能源+1。');
 assert.equal(source.gen,1);
 assert.equal(source.energy,0);
 assert.equal(source.trigger,'draw');
 const card=ttg.cards['TTG-1-015'];
 assert.equal(card.name,'ニア');
 assert.equal(card.gen,1);
 assert.equal(card.activeExtraEnergy,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.traits,['大グレン団']);
 assert.deepEqual(card.mainAbility,{op:'payApDrawGainEnergy',oncePerTurn:true,draw:1,extraEnergy:1});
 assert.ok(EXPECTED_V2_IDS['gurren-lagann'].includes('TTG-1-015'));
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...base,
  mainAbility:{op:'payApDrawGainEnergy',oncePerTurn:false,draw:1,extraEnergy:1}}]}),/unsupported main action/);
 assert.throws(()=>createUniversalPack({id:'bad-draw',cards:[{...base,
  mainAbility:{op:'payApDrawGainEnergy',oncePerTurn:true,draw:2,extraEnergy:1}}]}),/unsupported main action/);
});

test('a REST front TTG-1-015 can pay AP, draws one, and still generates nothing',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1015,first:0});
 s=toPhase(s,'main');
 const source=place(s,0,'TTG-1-015','front',0,false);
 const hand=s.players[0].hand.length,deckBefore=s.players[0].deck.length;
 const readyAp=s.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(readyAp,1);
 s.players[0].apCards.forEach(c=>{c.ready=false;});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s.players[0].apCards[0].ready=true;
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='payApDrawEnergy'));
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:source.uid,
  targetUid:source.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s.continuousStates=[];
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'payApDrawEnergy'});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].front[0]),0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s.players[0].apCards[1].inPlay=true;
 s.players[0].apCards[1].ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(s);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-missing',mode:'payApDrawEnergy'}),/not currently legal/);
});

test('energy-line TTG-1-015 generates two green after paying, and an empty deck still gains the pip',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1016,first:0});
 s=toPhase(s,'main');
 const source=place(s,0,'TTG-1-015','energy',0,true);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'payApDrawEnergy'});
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);

 let empty=newUniversalMatch(packs,{decks:[counts,counts],seed:1017,first:0});
 empty=toPhase(empty,'main');
 const rested=place(empty,0,'TTG-1-015','energy',1,false);
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 const hand=empty.players[0].hand.length;
 empty=dispatchUniversalAction(packs,empty,{type:'activate',uid:rested.uid,mode:'payApDrawEnergy'});
 assert.equal(empty.players[0].hand.length,hand);
 assert.equal(universalCardEnergy(packs,empty,0,empty.players[0].energy[1]),2);
 assert.equal(empty.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(countCards(empty.players[0]),50);
 assert.equal(assertUniversalMatch(packs,empty),true);

 let flip=newUniversalMatch(packs,{decks:[counts,counts],seed:1018,first:0});
 flip=toPhase(flip,'attack');
 const striker=place(flip,0,'TTG-1-018','front',0,true);
 const revealed=take(flip,1,'TTG-1-015');
 flip.players[1].deck.push(flip.players[1].life.shift());
 flip.players[1].life.unshift(revealed);
 const before=flip.players[1].hand.length;
 flip=dispatchUniversalAction(packs,flip,{type:'attack',uid:striker.uid});
 flip=dispatchUniversalAction(packs,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'draw');
 aiLegal(flip);
 const skipped=dispatchUniversalAction(packs,flip,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[1].hand.length,before);
 flip=dispatchUniversalAction(packs,flip,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(flip.players[1].hand.length,before+1);
 assert.equal(universalPublicView(packs,flip,0).players[1].hand,null);
 assert.equal(countCards(flip.players[1]),50);
 assert.equal(assertUniversalMatch(packs,flip),true);
});
