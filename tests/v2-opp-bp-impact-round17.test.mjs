import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. UA15BT/SAO-1-017.
// Q749 (2024-01-19): a character whose BP was raised to 4000 or more by an
// effect still grants Impact 1. Generated energy alt is 黄, so gen is 1.
// 相手の場 is the opponent front and energy lines. No turn restriction.

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
const opp={kind:'oppCharacterBpAtLeast',turn:'any',zone:'field',minBp:4000};

function deck(){
 const required=['SAO-1-017','SAO-2-065','SAO-2-008','SAO-1-008'];
 const rest=Object.values(sao.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,9)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
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

test('SAO-1-017 keeps gen 1 and impact only from an opponent character at BP 4000',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-017');
 assert.equal(source.effectJa,'相手の場にBP4000以上のキャラがある場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。');
 assert.equal(source.gen,1);
 assert.equal(source.energy,5);
 assert.equal(source.bp,4000);
 assert.equal(source.trigger,'active');
 assert.deepEqual(source.traits,['整合騎士']);
 const card=sao.cards['SAO-1-017'];
 assert.equal(card.name,'ベルクーリ・シンセシス・ワン');
 assert.equal(card.printedImpact,0);
 assert.equal(card.gen,1);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition:opp,impact:1}]);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-017'));
 const base={id:'LAB',name:'Lab',color:'yellow',type:'character',energy:0,ap:1,
  bp:4000,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-min',cards:[{...base,
  passiveBonuses:[{condition:{...opp,minBp:0},impact:1}]}]}),/invalid or cyclic|invalid passive/);
});

test('current opponent BP of 4000 grants impact; own field, 3500, and silence do not',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1017,first:0});
 s=toPhase(s,'main');
 const self=place(s,0,'SAO-1-017','front',0,true);
 const ownBig=place(s,0,'SAO-1-017','energy',0,true);
 assert.equal(universalBp(packs,s,ownBig),4000);
 assert.equal(universalImpact(packs,s,self),0);
 const short=place(s,1,'SAO-2-065','front',0,true);
 assert.equal(universalBp(packs,s,short),3000);
 assert.equal(universalImpact(packs,s,self),0);
 short.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,short),4000);
 assert.equal(universalImpact(packs,s,self),1);
 short.buffs=[];
 const energyFoe=place(s,1,'SAO-1-017','energy',0,false);
 assert.equal(universalImpact(packs,s,self),1);
 energyFoe.ready=false;
 s.players[1].energy[0]=null;
 s.players[1].hand.push(energyFoe);
 assert.equal(universalImpact(packs,s,self),0);
 energyFoe.ready=false;
 s.players[1].hand=s.players[1].hand.filter(c=>c.uid!==energyFoe.uid);
 s.players[1].front[1]=energyFoe;
 assert.equal(universalImpact(packs,s,self),1);
 const later=structuredClone(s);later.active=1;
 assert.equal(universalImpact(packs,later,later.players[0].front[0]),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),0);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 aiLegal(s);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('a blocked win deals one life only while the opponent character is at BP 4000',()=>{
 let hit=newUniversalMatch(packs,{decks:[counts,counts],seed:1018,first:0});
 hit=toPhase(hit,'attack');
 const striker=place(hit,0,'SAO-1-017','front',0,true);
 striker.buffs=[{bp:500,untilTurn:hit.turn}];
 const wall=place(hit,1,'SAO-1-017','front',0,true);
 const revealed=take(hit,1,'SAO-2-008');
 hit.players[1].deck.push(hit.players[1].life.shift());
 hit.players[1].life.unshift(revealed);
 const lives=hit.players[1].life.length;
 assert.equal(universalImpact(packs,hit,striker),1);
 hit=dispatchUniversalAction(packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.ok(hit.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(hit.players[1].life.length,lives-1);
 assert.equal(hit.pending?.kind,'life-trigger');
 hit=dispatchUniversalAction(packs,hit,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(countCards(hit.players[0]),50);
 assert.equal(countCards(hit.players[1]),50);
 assert.equal(assertUniversalMatch(packs,hit),true);

 let miss=newUniversalMatch(packs,{decks:[counts,counts],seed:1019,first:0});
 miss=toPhase(miss,'attack');
 const quiet=place(miss,0,'SAO-1-017','front',0,true);
 const weak=place(miss,1,'SAO-2-065','front',0,true);
 const before=miss.players[1].life.length;
 assert.equal(universalImpact(packs,miss,quiet),0);
 miss=dispatchUniversalAction(packs,miss,{type:'attack',uid:quiet.uid});
 miss=dispatchUniversalAction(packs,miss,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.ok(miss.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(miss.players[1].life.length,before);
 assert.equal(miss.pending,null);
 assert.equal(countCards(miss.players[0]),50);
 assert.equal(countCards(miss.players[1]),50);
 assert.equal(assertUniversalMatch(packs,miss),true);
});
