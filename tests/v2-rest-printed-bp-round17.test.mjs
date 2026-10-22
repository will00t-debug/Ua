import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalCardEnergy,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {ownRestPrintedBpCount} from '../dist/universal-v2/field-conditions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. UA51BT/SLG-1-027.
// Q2030: 元々のBP is the printed number. Q2070: a field has no BP, so it is
// not counted. Generated energy alt is 紫, gen 1. Printed BP is 3000+.
// No 他の. This card's own 3000 does not reach the 2500 ceiling.

const slg=registeredV2TitlePack('solo-leveling');
const packs=[slg,slg];
const each={kind:'ownRestPrintedBpAtMost',turn:'own',zone:'field',excludeSelf:false,
 trait:'影の軍団',maxPrintedBp:2500};

function deck(){
 const required=['SLG-1-027','SLG-1-007','SLG-1-002'];
 const rest=Object.values(slg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(slg,counts),[]);
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
function toMain(seed,pack=packs,used=counts){
 let s=newUniversalMatch(pack,{decks:[used,used],seed,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++){
  const next=legalUniversalActions(pack,s).find(a=>a.type==='next');
  s=dispatchUniversalAction(pack,s,next);
 }
 assert.equal(s.phase,'main');
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
const body={color:'purple',type:'character',energy:0,ap:1,gen:1,implementation:'vanilla',effects:{}};
const iron={...body,id:'IRON',name:'アイアン',bp:3000,traits:['影の軍団'],implementation:'dsl',
 passiveBonuses:[{condition:each,bpEach:500}]};
const labCards=[
 iron,
 {...body,id:'LOW',name:'低',bp:2500,traits:['影の軍団']},
 {...body,id:'LOW2',name:'低二',bp:2500,traits:['影の軍団']},
 {...body,id:'HIGH',name:'高',bp:3000,traits:['影の軍団']},
 {...body,id:'FIELD',name:'場',bp:0,gen:1,type:'field',traits:['影の軍団']},
 {...body,id:'WRONG',name:'譯',bp:1500,traits:['影之軍團']},
 ...Array.from({length:7},(_,i)=>({...body,id:'F'+i,name:'余'+i,bp:1000,traits:[]}))
];
const lab=createUniversalPack({id:'lab-rest-bp',cards:labCards});
const labPacks=[lab,lab];
const labCounts=Object.fromEntries(labCards.map((c,i)=>[c.id,i===labCards.length-1?2:4]));

test('SLG-1-027 keeps the official trait and counts printed REST BP',()=>{
 const card=slg.cards['SLG-1-027'];
 assert.equal(card.name,'アイアン');
 assert.equal(card.energy,2);
 assert.equal(card.bp,3000);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.deepEqual(card.traits,['影の軍団']);
 assert.equal(card.printedImpact,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition:each,bpEach:500}]);
 assert.ok(EXPECTED_V2_IDS['solo-leveling'].includes('SLG-1-027'));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const base={id:'LAB',name:'Lab',color:'purple',type:'character',energy:0,ap:1,
  bp:3000,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-flat',cards:[{...base,
  passiveBonuses:[{condition:each,bp:500}]}]}),/per-card printed BP|invalid passive/);
 assert.throws(()=>createUniversalPack({id:'bad-each',cards:[{...base,
  passiveBonuses:[{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bpEach:500}]}]}),
  /per-card printed BP|invalid passive/);
});

test('two printed-3000 copies do not add BP, and the energy line still generates 1',()=>{
 let s=toMain(1027);
 const self=place(s,0,'SLG-1-027','front',0,false);
 const other=place(s,0,'SLG-1-027','energy',0,false);
 place(s,0,'SLG-1-007','front',1,false);
 assert.equal(universalBp(packs,s,self),3000);
 assert.equal(universalCardEnergy(packs,s,0,self),0);
 const moved=structuredClone(s);
 const card=moved.players[0].front[0];
 moved.players[0].front[0]=null;
 moved.players[0].energy[1]=card;
 assert.equal(universalBp(packs,moved,card),3000);
 assert.equal(universalCardEnergy(packs,moved,0,card),1);
 assert.equal(ownRestPrintedBpCount(s,0,self.uid,each,c=>slg.cards[c.cardId]),0);
 assert.equal(other.ready,false);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'attack',uid:'0-missing'}),/not currently legal/);
});

test('each qualifying REST character adds 500, including the energy line',()=>{
 let s=toMain(1028,labPacks,labCounts);
 function pull(p,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 const self=pull(0,'IRON');self.ready=false;s.players[0].front[0]=self;
 assert.equal(universalBp(labPacks,s,self),3000);
 const low=pull(0,'LOW');low.ready=false;s.players[0].front[1]=low;
 assert.equal(universalBp(labPacks,s,self),3500);
 const low2=pull(0,'LOW2');low2.ready=false;s.players[0].energy[0]=low2;
 assert.equal(universalBp(labPacks,s,self),4000);
 low2.ready=true;
 assert.equal(universalBp(labPacks,s,self),3500);
 low2.ready=false;
 const high=pull(0,'HIGH');high.ready=false;high.buffs=[{bp:-1000,untilTurn:s.turn}];
 s.players[0].energy[1]=high;
 assert.equal(universalBp(labPacks,s,high),2000);
 assert.equal(universalBp(labPacks,s,self),4000);
 const field=pull(0,'FIELD');field.ready=false;s.players[0].energy[2]=field;
 const wrong=pull(0,'WRONG');wrong.ready=false;s.players[0].front[2]=wrong;
 assert.equal(universalBp(labPacks,s,self),4000);
 const foe=pull(1,'LOW');foe.ready=false;s.players[1].front[0]=foe;
 assert.equal(universalBp(labPacks,s,self),4000);
 const opp=structuredClone(s);opp.active=1;
 assert.equal(universalBp(labPacks,opp,opp.players[0].front[0]),3000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(labPacks,s,s.players[0].front[0]),3000);
 const legal=legalUniversalActions(labPacks,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(labPacks,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(labPacks,s),true);
});
