import test from 'node:test';
import assert from 'node:assert/strict';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS,EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// C27: three BLEACH prints whose whole text is covered by a tested program.
// Official pages checked 2026-10-25.
// BLC-4-052: 相手のフロントLに元々のBPよりBPが低いキャラがある場合、BP+1500.
//   Q2325: 元々のBP is the printed number. No own-turn icon. Energy line is not front.
// BLC-1-004: Raid エス・ノト, Impact 1, front once, optional REST of BP 3000 or lower.
//   The Raid sentence is the game rule. Skip-next-ACTIVE is not printed.
// BLC-2-041: official page says このターン中, not 自分のターン中. The catalogue
//   己方回合中 conflicts, so the bonus is turn:'any' and clears when the turn ends.
//   他のキャラ excludes this physical card. A field retirement does not count.
// BLC-2-027 stays unregistered: catalogue 己方回合中 conflicts with the official
//   per-count sentence, and the site's 2500+ is not an own-turn icon.
// This is not per-card FAQ acceptance.

const IDS=['BLC-4-052','BLC-1-004','BLC-2-041'];
const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
function deck(){
 const fours=['BLC-1-004','BLC-2-041','BLC-1-080','BLC-1-001','BLC-1-002',
  'BLC-2-029','BLC-2-004','BLC-1-008','BLC-1-010'];
 const twos=['BLC-4-052','BLC-1-032','BLC-4-076','BLC-4-042','BLC-1-091','BLC-3-007','BLC-2-010'];
 const counts=Object.fromEntries([...fours.map(id=>[id,4]),...twos.map(id=>[id,2])]);
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','outside','removed']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 const i=pl.life.findIndex(c=>c.cardId===id);
 if(i<0)throw Error('Missing '+id);
 const card=pl.life[i];
 const replacement=pl.deck.pop();
 if(!replacement)throw Error('No deck card to keep life full');
 pl.life[i]=replacement;
 return card;
}
function occupy(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function toMain(s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function fresh(seed=2701){
 return toMain(newUniversalMatch(packs,{decks:[counts,counts],seed,first:0}));
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1+(c.stack||[]).length+(c.under||[]).length;
 return n;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function play(s,uid,line){
 const action=legalUniversalActions(packs,s).find(a=>
  (a.type==='play'||a.type==='event'||a.type==='raid')&&a.uid===uid&&
  (line===undefined||a.line===line)&&a.replaceUid===undefined);
 assert.ok(action,'legal play '+uid);
 return dispatchUniversalAction(packs,s,action);
}
function at(s,p,uid){
 return s.players[p].front.find(c=>c?.uid===uid)||
  s.players[p].energy.find(c=>c?.uid===uid)||
  s.players[p].outside.find(c=>c.uid===uid);
}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,until:{player:0,phase:'attack',edge:'end'},sourceLinked:false});
}
function go(s,player,phase){
 for(let i=0;i<16&&!(s.active===player&&s.phase===phase);i++){
  assert.equal(s.pending,null);
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 assert.equal(s.active,player);
 assert.equal(s.phase,phase);
 return s;
}
function battle(s,attackerUid,blockerUid){
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attackerUid});
 assert.equal(s.pending?.kind,'block');
 return dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blockerUid});
}

test('C27 registers three whole prints and leaves the conflicting per-count card out',()=>{
 assert.equal(EXPECTED_V2_COUNTS.bleach,177);
 assert.equal(EXPECTED_V2_TOTAL,429);
 assert.equal(Object.keys(bleach.cards).length,177);
 for(const id of IDS){
  const entry=contribution.entries.find(x=>x.id===id);
  assert.ok(entry,id);
  assert.equal(entry.definition.id,id);
  assert.equal(entry.evidence.printedTextFragments[0],entry.sourceRecord.effect);
  assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
  assert.equal(bleach.cards[id].name,entry.sourceRecord.nameJa);
 }
 const byakuya=bleach.cards['BLC-4-052'];
 assert.equal(byakuya.passiveBonuses[0].condition.kind,'oppFrontCurrentBpBelowPrinted');
 assert.equal(byakuya.passiveBonuses[0].condition.turn,'any');
 assert.equal(byakuya.passiveBonuses[0].bp,1500);
 assert.equal(byakuya.bp,1500);
 const note=bleach.cards['BLC-1-004'];
 assert.equal(note.raidName,'エス・ノト');
 assert.equal(note.printedImpact,1);
 assert.equal(note.trigger,'raid');
 assert.equal(note.triggerEffect,null);
 assert.equal(note.mainAbility.then[0].op,'restOppFrontUnderBp');
 assert.equal(note.mainAbility.then[0].bp,3000);
 assert.equal(note.mainAbility.then[0].optional,true);
 assert.equal(note.mainAbility.frontOnly,true);
 assert.deepEqual(note.traits,['星十字騎士團']);
 const dordoni=bleach.cards['BLC-2-041'];
 assert.equal(dordoni.passiveBonuses[0].condition.kind,'otherOwnCharacterRetiredThisTurn');
 assert.equal(dordoni.passiveBonuses[0].condition.turn,'any');
 assert.deepEqual(dordoni.traits,['破面／涅骸部隊']);
 assert.equal(bleach.cards['BLC-2-027'],undefined);
 assert.equal(EXPECTED_V2_IDS.bleach.includes('BLC-2-027'),false);
});

test('BLC-4-052 gains 1500 only while an opposing front character is below its printed BP',()=>{
 let s=fresh();
 const self=occupy(s,0,'BLC-4-052','front',0);
 const foe=occupy(s,1,'BLC-1-001','front',0);
 assert.equal(universalBp(packs,s,self),1500);
 assert.equal(universalBp(packs,s,foe),2000);
 foe.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),1500);
 foe.buffs=[];
 const own=occupy(s,0,'BLC-1-001','front',1);
 own.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,at(s,0,own.uid)),1000);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),1500);
 own.buffs=[];
 const hidden=occupy(s,1,'BLC-1-002','energy',0);
 hidden.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),1500);
 hidden.buffs=[];
 const ken=occupy(s,1,'BLC-1-080','front',1);
 ken.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,at(s,1,ken.uid)),4000);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),1500);
 ken.buffs=[];
 foe.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,at(s,1,foe.uid)),1000);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),3000);
 s.active=1;
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),3000);
 silence(s,self.uid);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),1500);
 let mirror=fresh(2702);
 const left=occupy(mirror,0,'BLC-4-052','front',0);
 const right=occupy(mirror,1,'BLC-4-052','front',0);
 right.buffs=[{bp:-1000,untilTurn:mirror.turn}];
 assert.equal(universalBp(packs,mirror,at(mirror,1,right.uid)),500);
 assert.equal(universalBp(packs,mirror,at(mirror,0,left.uid)),3000);
 let paid=fresh(2703);
 occupy(paid,0,'BLC-4-052','energy',0);
 occupy(paid,0,'BLC-1-001','energy',1);
 const victim=occupy(paid,1,'BLC-1-001','front',0);
 const event=toHand(paid,0,'BLC-1-032');
 paid=play(paid,event.uid);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseEffectMode',mode:'down'});
 paid=dispatchUniversalAction(packs,paid,{type:'chooseTarget',uid:victim.uid});
 const watcher=paid.players[0].energy[0];
 assert.equal(universalBp(packs,paid,at(paid,1,victim.uid)),1000);
 assert.equal(universalBp(packs,paid,watcher),3000);
 assert.equal(countCards(paid.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-1-004 raids onto エス・ノト, deals Impact 1, and rests only BP 3000 or lower from the front',()=>{
 let s=fresh(2704);
 const base=occupy(s,0,'BLC-1-002','front',0);
 occupy(s,0,'BLC-1-001','energy',0);
 occupy(s,0,'BLC-1-001','energy',1);
 occupy(s,0,'BLC-1-002','energy',2);
 occupy(s,0,'BLC-1-004','energy',3);
 const top=toHand(s,0,'BLC-1-004');
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(packs,s,raid);
 const raider=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.ok(raider);
 assert.equal(raider.ready,true);
 assert.equal(raider.stack.length,1);
 assert.equal(universalImpact(packs,s,raider),1);
 const blocker=occupy(s,1,'BLC-1-001','front',0);
 const life=s.players[1].life.length;
 s=go(s,0,'attack');
 s=battle(s,raider.uid,blocker.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(s.players[1].life.length,life-1);

 let rest=fresh(2705);
 const actor=occupy(rest,0,'BLC-1-004','front',0);
 const exact=occupy(rest,1,'BLC-3-007','front',0);
 assert.equal(universalBp(packs,rest,exact),3000);
 const frontKen=occupy(rest,1,'BLC-1-080','front',1);
 assert.equal(universalBp(packs,rest,frontKen),4000);
 assert.equal(legalUniversalActions(packs,rest).some(a=>a.type==='activate'&&a.uid===actor.uid),true);
 rest=dispatchUniversalAction(packs,rest,{type:'activate',uid:actor.uid,mode:'frontOnce'});
 assert.equal(rest.pending.kind,'effect-rest-bp');
 assert.deepEqual(rest.pending.choices,[exact.uid]);
 assert.equal(rest.pending.optional,true);
 aiOk(rest);
 assert.throws(()=>dispatchUniversalAction(packs,rest,{type:'chooseRestBp',uid:frontKen.uid}));
 rest=dispatchUniversalAction(packs,rest,{type:'chooseRestBp',uid:exact.uid});
 assert.equal(at(rest,1,exact.uid).ready,false);
 assert.equal(rest.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===exact.uid),false);
 assert.equal(legalUniversalActions(packs,rest).some(a=>a.type==='activate'&&a.uid===actor.uid),false);

 let skipped=fresh(2706);
 const source=occupy(skipped,0,'BLC-1-004','front',0);
 const target=occupy(skipped,1,'BLC-1-001','front',0);
 skipped=dispatchUniversalAction(packs,skipped,{type:'activate',uid:source.uid,mode:'frontOnce'});
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseRestBp',uid:null});
 assert.equal(at(skipped,1,target.uid).ready,true);
 assert.equal(skipped.mainAbilityUsedUids.includes(source.uid),true);
 assert.equal(legalUniversalActions(packs,skipped).some(a=>a.type==='activate'&&a.uid===source.uid),false);

 let energy=fresh(2707);
 const parked=occupy(energy,0,'BLC-1-004','energy',0);
 occupy(energy,1,'BLC-1-001','front',0);
 assert.equal(legalUniversalActions(packs,energy).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 let tall=fresh(2708);
 const waiting=occupy(tall,0,'BLC-1-004','front',0);
 occupy(tall,1,'BLC-1-080','front',0);
 assert.equal(legalUniversalActions(packs,tall).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 assert.equal(countCards(s.players[0]),50);
});

test('BLC-2-041 gains 1000 this turn when another own character retires, including on the opponent turn',()=>{
 let enemy=fresh(2709);
 const quiet=occupy(enemy,0,'BLC-2-041','front',0);
 const striker=occupy(enemy,0,'BLC-1-080','front',1);
 const victim=occupy(enemy,1,'BLC-1-001','front',0);
 assert.equal(universalBp(packs,enemy,quiet),2000);
 enemy=go(enemy,0,'attack');
 enemy=battle(enemy,striker.uid,victim.uid);
 assert.equal(enemy.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(universalBp(packs,enemy,at(enemy,0,quiet.uid)),2000);

 let s=fresh(2710);
 const self=occupy(s,0,'BLC-2-041','front',0);
 const loser=occupy(s,0,'BLC-1-001','front',1);
 const later=occupy(s,0,'BLC-1-001','front',2);
 const wall=occupy(s,1,'BLC-1-080','front',0);
 const other=occupy(s,1,'BLC-1-001','front',1);
 s=go(s,0,'attack');
 s=battle(s,loser.uid,wall.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===loser.uid),true);
 assert.equal(s.active,0);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),3000);
 s=go(s,1,'main');
 assert.equal(universalBp(packs,s,at(s,1,wall.uid))>2000,true);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),2000);
 s=go(s,1,'attack');
 s=battle(s,wall.uid,later.uid);
 assert.equal(s.active,1);
 assert.equal(s.players[0].outside.some(c=>c.uid===later.uid),true);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),3000);
 silence(s,self.uid);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),2000);
 assert.equal(other.cardId,'BLC-1-001');

 let line=fresh(2711);
 const observer=occupy(line,0,'BLC-2-041','front',0);
 const gens=[0,1,2].map(slot=>occupy(line,0,'BLC-2-041','energy',slot));
 const field=occupy(line,0,'BLC-4-076','energy',3);
 assert.equal(universalBp(packs,line,observer),2000);
 line=dispatchUniversalAction(packs,line,{type:'activate',uid:field.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.equal(line.players[0].outside.some(c=>c.uid===field.uid),true);
 assert.equal(line.turnRetireEvents.some(e=>e.uid===field.uid&&e.cardType==='field'),true);
 assert.equal(universalBp(packs,line,at(line,0,observer.uid)),2000);
 const mayuri=toHand(line,0,'BLC-4-042');
 line=play(line,mayuri.uid,'energy');
 assert.equal(line.pending.kind,'effect-choice-mode');
 line=dispatchUniversalAction(packs,line,{type:'chooseEffectMode',mode:'field'});
 assert.equal(line.pending.kind,'effect-retire-own-character');
 assert.equal(line.pending.choices.includes(observer.uid),true);
 assert.equal(line.pending.choices.includes(gens[0].uid),true);
 line=dispatchUniversalAction(packs,line,{type:'chooseOwnCharacterRetire',uid:gens[0].uid});
 assert.equal(universalBp(packs,line,at(line,0,observer.uid)),3000);
 assert.equal(universalBp(packs,line,at(line,0,gens[1].uid)),3000);
 assert.equal(universalBp(packs,line,at(line,0,gens[0].uid)),2000);
 assert.equal(line.turnRetireEvents.some(e=>e.uid===observer.uid),false);
 assert.equal(countCards(line.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(line)),true);
});
