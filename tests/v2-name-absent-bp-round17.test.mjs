import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalCardEnergy,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. EX08BT/SAO-2-065 has no FAQ block.
// Printed BP is 3500-. Generated energy alt is 緑, so gen is 1. The penalty
// is live on either turn while no character named フレイヤ is on this
// card's own front or energy line. Hand, outside, and the opponent do not
// remove it. Silence removes the printed penalty.

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
const absent={kind:'ownNameAbsent',turn:'any',zone:'field',excludeSelf:false,name:'フレイヤ'};

function deck(){
 const required=['SAO-2-065','SAO-1-007','SAO-2-008'];
 const rest=Object.values(sao.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
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
const vanilla={color:'green',type:'character',energy:0,ap:1,bp:1500,gen:1,
 implementation:'vanilla',effects:{}};
const klein={...vanilla,id:'KLEIN',name:'クライン',bp:3500,implementation:'dsl',
 passiveBonuses:[{condition:absent,bp:-500}]};
const labCards=[
 klein,
 {...vanilla,id:'FREYA',name:'フレイヤ'},
 {...vanilla,id:'ALIAS',name:'別名義',nameAliases:['フレイヤ'],implementation:'dsl',effects:{}},
 ...Array.from({length:10},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}))
];
const lab=createUniversalPack({id:'lab-absent',cards:labCards});
const labPacks=[lab,lab];
function labDeck(){
 const ids=labCards.map(c=>c.id);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 return counts;
}
const labCounts=labDeck();

test('SAO-2-065 keeps printed BP 3500 and a live absence penalty of 500',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-065');
 assert.equal(source.effectJa,'自分の場に〈フレイヤ〉がない場合、このキャラはBP-500。');
 assert.equal(source.gen,1);
 assert.equal(source.bp,3500);
 assert.equal(source.trigger,'active');
 assert.deepEqual(source.traits,['ALO']);
 const card=sao.cards['SAO-2-065'];
 assert.equal(card.name,'クライン');
 assert.equal(card.bp,3500);
 assert.equal(card.gen,1);
 assert.equal(card.printedImpact,0);
 assert.equal(card.activeExtraEnergy,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition:absent,bp:-500}]);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-065'));
 const base={id:'LAB',name:'Lab',color:'green',type:'character',energy:0,ap:1,
  bp:3500,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-plus',cards:[{...base,
  passiveBonuses:[{condition:absent,bp:500}]}]}),/invalid passive bonus|name-absence/);
 assert.throws(()=>createUniversalPack({id:'bad-other',cards:[{...base,
  passiveBonuses:[{condition:{kind:'ownNameExists',turn:'any',zone:'field',
   excludeSelf:false,name:'フレイヤ'},bp:-500}]}]}),/invalid passive bonus/);
 assert.throws(()=>createUniversalPack({id:'bad-step',cards:[{...base,
  passiveBonuses:[{condition:absent,bp:-400}]}]}),/invalid passive bonus/);
});

test('registered Klein is 3000 without Freya, on either line, and silence restores 3500',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2065,first:0});
 s=toPhase(s,'main');
 const self=place(s,0,'SAO-2-065','front',0,true);
 place(s,0,'SAO-1-007','energy',0,true);
 assert.equal(universalBp(packs,s,self),3000);
 assert.equal(universalCardEnergy(packs,s,0,self),0);
 const enemyTurn=structuredClone(s);enemyTurn.active=1;
 assert.equal(universalBp(packs,enemyTurn,enemyTurn.players[0].front[0]),3000);
 const energyLine=structuredClone(s);
 const moved=energyLine.players[0].front[0];
 energyLine.players[0].front[0]=null;
 energyLine.players[0].energy[1]=moved;
 assert.equal(universalBp(packs,energyLine,moved),3000);
 assert.equal(universalCardEnergy(packs,energyLine,0,moved),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(s);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'attack',uid:'0-missing'}),/not currently legal/);
});

test('a field Freya or her alias removes the penalty; hand, outside, and silence do not',()=>{
 let s=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:2066,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(labPacks,s,legalUniversalActions(labPacks,s).find(a=>a.type==='next'));
 function pull(p,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 const self=pull(0,'KLEIN');self.ready=true;s.players[0].front[0]=self;
 assert.equal(universalBp(labPacks,s,self),3000);
 const held=pull(0,'FREYA');s.players[0].hand.push(held);
 assert.equal(universalBp(labPacks,s,self),3000);
 s.players[0].outside.push(s.players[0].hand.pop());
 assert.equal(universalBp(labPacks,s,self),3000);
 const foe=pull(1,'FREYA');foe.ready=true;s.players[1].front[0]=foe;
 assert.equal(universalBp(labPacks,s,self),3000);
 const own=pull(0,'ALIAS');
 own.ready=true;s.players[0].energy[0]=own;
 assert.equal(universalBp(labPacks,s,s.players[0].front[0]),3500);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:own.uid,
  targetUid:own.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(labPacks,s,s.players[0].front[0]),3000);
 s.continuousStates=[];
 s.players[0].energy[0]=null;s.players[0].hand.push(own);
 const real=s.players[0].outside.find(c=>c.cardId==='FREYA');
 s.players[0].outside=s.players[0].outside.filter(c=>c.uid!==real.uid);
 real.ready=false;s.players[0].front[1]=real;
 assert.equal(universalBp(labPacks,s,s.players[0].front[0]),3500);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:real.uid,
  targetUid:real.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(labPacks,s,s.players[0].front[0]),3500);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(labPacks,s),true);
});
