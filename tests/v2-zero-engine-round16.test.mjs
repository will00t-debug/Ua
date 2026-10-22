import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalCardEnergy,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Zero engine edits. Official page checked 2026-10-22 and had no FAQ block.
// Printed BP is 4000+. Generated energy alt is 緑, so gen is 1. Own turn and
// own hand of at least 5 give both BP+1000 and impact 1. The official trait
// stays the single token DFN／第四次架南島レイド.

const slg=registeredV2TitlePack('solo-leveling');
const packs=[slg,slg];
const hand={kind:'ownHandCountAtLeast',turn:'own',min:5};

function deck(){
 const required=['SLG-1-065','SLG-1-042','SLG-1-062'];
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
function shrinkHand(s,p,keep){
 while(s.players[p].hand.length>keep)
  s.players[p].outside.push(s.players[p].hand.pop());
}

test('SLG-1-065 keeps the official print, one trait token, and both bonuses on one condition',()=>{
 const card=slg.cards['SLG-1-065'];
 assert.equal(card.name,'アーシー');
 assert.equal(card.energy,4);
 assert.equal(card.bp,4000);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.printedImpact,0);
 assert.equal(card.activeExtraEnergy,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.traits,['DFN／第四次架南島レイド']);
 assert.deepEqual(card.passiveBonuses,[{condition:hand,bp:1000,impact:1}]);
 assert.deepEqual(SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-065').traits,['DFN','第四次架南島Raid']);
 assert.ok(EXPECTED_V2_IDS['solo-leveling'].includes('SLG-1-065'));
});

test('five or more own-hand cards grant BP and impact on the own turn only',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1065,first:0});
 s=toPhase(s,'main');
 const self=place(s,0,'SLG-1-065','front',0,true);
 assert.ok(s.players[0].hand.length>=5);
 assert.equal(universalBp(packs,s,self),5000);
 assert.equal(universalImpact(packs,s,self),1);
 assert.equal(universalCardEnergy(packs,s,0,self),0);
 const enemy=structuredClone(s);enemy.active=1;
 assert.equal(universalBp(packs,enemy,enemy.players[0].front[0]),4000);
 assert.equal(universalImpact(packs,enemy,enemy.players[0].front[0]),0);
 const line=structuredClone(s);
 const moved=line.players[0].front[0];
 line.players[0].front[0]=null;
 line.players[0].energy[0]=moved;
 assert.equal(universalBp(packs,line,moved),5000);
 assert.equal(universalImpact(packs,line,moved),1);
 assert.equal(universalCardEnergy(packs,line,0,moved),1);
 shrinkHand(s,0,4);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),0);
 s.players[0].hand.push(s.players[0].outside.pop());
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),0);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(s);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('the impact deals one life only while the hand condition is live, and DRAW stays a life trigger',()=>{
 let hit=newUniversalMatch(packs,{decks:[counts,counts],seed:1066,first:0});
 hit=toPhase(hit,'attack');
 const striker=place(hit,0,'SLG-1-065','front',0,true);
 const wall=place(hit,1,'SLG-1-042','front',0,true);
 const revealed=take(hit,1,'SLG-1-062');
 hit.players[1].deck.push(hit.players[1].life.shift());
 hit.players[1].life.unshift(revealed);
 assert.equal(universalImpact(packs,hit,striker),1);
 const lives=hit.players[1].life.length;
 hit=dispatchUniversalAction(packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(hit.players[1].life.length,lives-1);
 assert.equal(hit.pending?.kind,'life-trigger');
 aiLegal(hit);
 hit=dispatchUniversalAction(packs,hit,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(countCards(hit.players[0]),50);
 assert.equal(assertUniversalMatch(packs,hit),true);

 let miss=newUniversalMatch(packs,{decks:[counts,counts],seed:1067,first:0});
 miss=toPhase(miss,'attack');
 const quiet=place(miss,0,'SLG-1-065','front',0,true);
 const weak=place(miss,1,'SLG-1-042','front',0,true);
 shrinkHand(miss,0,4);
 assert.equal(universalImpact(packs,miss,quiet),0);
 const before=miss.players[1].life.length;
 miss=dispatchUniversalAction(packs,miss,{type:'attack',uid:quiet.uid});
 miss=dispatchUniversalAction(packs,miss,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.equal(miss.players[1].life.length,before);
 assert.equal(miss.pending,null);
 assert.equal(assertUniversalMatch(packs,miss),true);

 let flip=newUniversalMatch(packs,{decks:[counts,counts],seed:1068,first:0});
 flip=toPhase(flip,'attack');
 const attacker=place(flip,0,'SLG-1-042','front',0,true);
 const drawn=take(flip,1,'SLG-1-065');
 flip.players[1].deck.push(flip.players[1].life.shift());
 flip.players[1].life.unshift(drawn);
 const handSize=flip.players[1].hand.length;
 flip=dispatchUniversalAction(packs,flip,{type:'attack',uid:attacker.uid});
 flip=dispatchUniversalAction(packs,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'draw');
 flip=dispatchUniversalAction(packs,flip,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(flip.players[1].hand.length,handSize+1);
 assert.equal(universalPublicView(packs,flip,0).players[1].hand,null);
 assert.equal(countCards(flip.players[1]),50);
 assert.equal(assertUniversalMatch(packs,flip),true);
});
