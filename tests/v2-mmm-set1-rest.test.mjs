import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalBp, universalEnergyByColor,
 universalImpact} from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' at '+s.phase+' '+(s.pending?.kind||''));
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action,actor){
 return dispatchUniversalAction(packs,s,action,actor===undefined?undefined:{actor});
}
function play(s,uid,kind){
 const action=legalUniversalActions(packs,s).find(a=>a.type===kind&&a.uid===uid&&
  !a.from&&(kind!=='play'||a.line==='front'));
 if(!action)throw Error('No '+kind+' for '+uid);
 return use(s,action);
}
function apReady(s,p=0){
 return s.players[p].apCards.filter(c=>c.ready).length;
}
function orderTop(s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  s=use(s,legalUniversalActions(packs,s)[0]);
  if(++guard>8)throw Error('Top order stuck');
 }
 return s;
}

test('MMM-1-001 enters active, removes outside characters, then retires into a rested pair',()=>{
 const counts=countsFor(['MMM-1-001','MMM-1-025','MMM-1-009','MMM-1-014','MMM-1-008','MMM-1-006']);
 let s=toPhase(fresh(counts,41001),'main');
 put(s,0,'MMM-1-025','energy',0);
 put(s,0,'MMM-1-025','energy',1);
 put(s,0,'MMM-1-025','energy',2);
 const kyoko=take(s,0,'MMM-1-009');
 const mami=take(s,0,'MMM-1-014');
 const madoka=take(s,0,'MMM-1-008');
 s.players[0].outside.push(kyoko,mami);
 s.players[0].removed.push(madoka);
 const ultimate=take(s,0,'MMM-1-001');
 s.players[0].hand.push(ultimate);
 readyAp(s);
 s=play(s,ultimate.uid,'play');
 assert.equal(s.players[0].front.find(c=>c?.uid===ultimate.uid).ready,true);
 assert.equal(s.pending.kind,'effect-remove-outside-up-to');
 assert.equal(s.pending.choices.includes(madoka.uid),false);
 s=use(s,{type:'chooseRemoveOutsideUpTo',mode:'pick',uid:kyoko.uid});
 s=use(s,{type:'chooseRemoveOutsideUpTo',mode:'pick',uid:mami.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].removed.some(c=>c.uid===kyoko.uid));
 assert.ok(s.players[0].removed.some(c=>c.uid===mami.uid));
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=use(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-removed-rest-pair');
 assert.equal(s.players[0].front.some(c=>c?.uid===ultimate.uid),false);
 assert.ok(s.players[0].removed.some(c=>c.uid===ultimate.uid));
 assert.equal(s.pending.choices.includes(madoka.uid),false);
 assert.ok(s.pending.choices.includes(kyoko.uid));
 assert.ok(s.pending.choices.includes(mami.uid));
 s=use(s,{type:'chooseRemovedRestPair',mode:'pick',uid:kyoko.uid});
 s=use(s,{type:'chooseRemovedRestPair',mode:'pick',uid:mami.uid});
 assert.equal(s.pending.placing,kyoko.uid);
 s=use(s,{type:'chooseRemovedRestPair',mode:'place',uid:kyoko.uid,line:'front',slot:0});
 assert.equal(s.pending.kind,'effect-removed-rest-pair');
 assert.equal(s.players[0].front[0].uid,kyoko.uid);
 assert.equal(s.players[0].front[0].ready,false);
 s=use(s,{type:'chooseRemovedRestPair',mode:'place',uid:mami.uid,line:'energy',slot:3});
 assert.equal(s.players[0].front[0].uid,kyoko.uid);
 assert.equal(s.players[0].energy[3].uid,mami.uid);
 assert.equal(s.phase,'start');
 assert.equal(s.active,1);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].energy[3].ready,true);
 assert.equal(s.players[0].removed.some(c=>c.uid===madoka.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-002 lets the front line use a removed girl or Law of Cycles, and Q1253 keeps the AP cut',()=>{
 const counts=countsFor(['MMM-1-002','MMM-1-006','MMM-1-009','MMM-1-025','MMM-1-003','MMM-1-028','MMM-1-004']);
 let s=toPhase(fresh(counts,41002),'main');
 put(s,0,'MMM-1-025','energy',0);
 put(s,0,'MMM-1-025','energy',1);
 put(s,0,'MMM-1-025','energy',2);
 put(s,0,'MMM-1-003','energy',3);
 const base=put(s,0,'MMM-1-006','front',0);
 const raid=take(s,0,'MMM-1-002');
 const handGirl=take(s,0,'MMM-1-009');
 const removedGirl=take(s,0,'MMM-1-009');
 s.players[0].hand.push(raid,handGirl);
 s.players[0].removed.push(removedGirl);
 readyAp(s);
 const raidAction=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===base.uid);
 s=use(s,raidAction);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 const before=apReady(s);
 s=play(s,handGirl.uid,'play');
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 assert.equal(apReady(s),before-1);
 const removedAction=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.from==='removed'&&
  a.uid===removedGirl.uid&&a.line==='energy');
 assert.ok(removedAction);
 const readyBeforeRemoved=apReady(s);
 s=use(s,removedAction);
 assert.equal(s.players[0].nextRemovedApCut,null);
 assert.equal(apReady(s),readyBeforeRemoved);
 assert.ok(s.players[0].energy.some(c=>c?.uid===removedGirl.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-008 looks at four cards and can rest to peek the top',()=>{
 const counts=countsFor(['MMM-1-008','MMM-1-025','MMM-1-006','MMM-1-009']);
 let s=toPhase(fresh(counts,41008),'main');
 put(s,0,'MMM-1-025','energy',0);
 put(s,0,'MMM-1-025','energy',1);
 const look=take(s,0,'MMM-1-008');
 const character=take(s,0,'MMM-1-009');
 const other=take(s,0,'MMM-1-006');
 s.players[0].hand.push(look);
 s.players[0].deck.unshift(other,character);
 readyAp(s);
 s=play(s,look.uid,'play');
 assert.equal(s.pending.kind,'effect-top-character-outside');
 s=use(s,{type:'chooseTopCharacterOutside',uid:character.uid});
 s=orderTop(s);
 assert.ok(s.players[0].outside.some(c=>c.uid===character.uid));
 assert.equal(s.players[0].deck[0].uid,other.uid);
 const peeked=s.players[0].deck[0];
 s.players[0].front.find(c=>c?.uid===look.uid).ready=true;
 s=use(s,{type:'activate',uid:look.uid,mode:'restPeek'});
 assert.equal(s.players[0].front.find(c=>c?.uid===look.uid).ready,false);
 assert.equal(s.pending.kind,'effect-peek-top-place');
 s=use(s,{type:'choosePeekTop',mode:'outside'});
 assert.ok(s.players[0].outside.some(c=>c.uid===peeked.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-027 discounts every Mami in hand for the turn',()=>{
 const counts=countsFor(['MMM-1-027','MMM-1-025','MMM-1-018','MMM-1-030','MMM-1-014']);
 let s=toPhase(fresh(counts,41027),'main');
 const house=put(s,0,'MMM-1-027','energy',0);
 put(s,0,'MMM-1-025','energy',1);
 const event=take(s,0,'MMM-1-030');
 const mami=take(s,0,'MMM-1-018');
 const other=take(s,0,'MMM-1-014');
 s.players[0].hand.push(event,mami,other);
 readyAp(s);
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['MMM-1-018'],mami),2);
 s=use(s,{type:'activate',uid:house.uid,mode:'discardEventEnergy'});
 assert.equal(s.pending.kind,'effect-discard-named-energy');
 s=use(s,{type:'chooseDiscardNamedEnergy',uid:event.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['MMM-1-018'],mami),1);
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['MMM-1-014'],other),0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='discardEventEnergy'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-044 buffs Nagisa and quintet, then adds a matching attack reveal',()=>{
 const counts=countsFor(['MMM-1-044','MMM-1-058','MMM-1-045','MMM-1-006','MMM-1-038']);
 let s=toPhase(fresh(counts,41044),'main');
 put(s,0,'MMM-1-058','energy',0);
 put(s,0,'MMM-1-058','energy',1);
 const nagisa=put(s,0,'MMM-1-044','front',0,true);
 const quintet=put(s,0,'MMM-1-045','front',1,true);
 const madoka=put(s,0,'MMM-1-006','energy',2,true);
 put(s,1,'MMM-1-038','front',0,true);
 const discarded=take(s,0,'MMM-1-038');
 s.players[0].hand.push(discarded);
 const beforeNagisa=universalBp(packs,s,nagisa);
 const beforeQuintet=universalBp(packs,s,quintet);
 const beforeMadoka=universalBp(packs,s,madoka);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.mode==='frontDiscardBuff'&&a.discardUid===discarded.uid));
 assert.equal(universalBp(packs,s,s.players[0].front[0]),beforeNagisa+1000);
 assert.equal(universalBp(packs,s,s.players[0].front[1]),beforeQuintet+1000);
 assert.equal(universalBp(packs,s,s.players[0].energy[2]),beforeMadoka);
 const reveal=take(s,0,'MMM-1-045');
 s.players[0].deck.unshift(reveal);
 s=toPhase(s,'attack');
 const hand=s.players[0].hand.length;
 s=use(s,{type:'attack',uid:nagisa.uid});
 assert.equal(s.players[0].hand.filter(c=>c.uid===reveal.uid).length,1);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-083 attacks twice after a life card reaches hand, and MMM-1-090 keeps that life private',()=>{
 const counts=countsFor(['MMM-1-083','MMM-1-090','MMM-1-085','MMM-1-076','MMM-1-001']);
 let s=toPhase(fresh(counts,41090),'main');
 const sayaka=put(s,0,'MMM-1-090','front',0,true);
 const kyoko=put(s,0,'MMM-1-083','front',1,true);
 const wall=put(s,1,'MMM-1-001','front',0,true);
 wall.buffs=[{bp:2000,untilTurn:s.turn}];
 put(s,1,'MMM-1-076','front',1,true);
 const life=s.players[0].life[0];
 const reveals=s.publicReveals.length;
 readyAp(s);
 s=use(s,{type:'activate',uid:sayaka.uid,mode:'lifeReenter'});
 s=use(s,{type:'chooseLifeReenter',uid:life.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===life.uid));
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(s.publicReveals.some(r=>r.uid===life.uid),false);
 const granted=s.players[0].front.find(c=>c?.uid===sayaka.uid);
 assert.equal(granted.reenterOrRaidUntil.untilOwnTurnStart,s.players[0].ownTurns+1);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:kyoko.uid});
 assert.equal(s.players[0].front.find(c=>c?.uid===kyoko.uid).ready,true);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=use(s,{type:'chooseOwnBuff',uid:kyoko.uid});
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c?.uid===kyoko.uid)),5000);
 assert.equal(s.pending.kind,'block');
 s=use(s,{type:'chooseBlock',uid:s.players[1].front.find(c=>c?.uid!==wall.uid).uid},1);
 let guard=0;
 while(s.phase!=='attack'||s.active!==1){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the counterattack');
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach the counterattack');
 }
 s=use(s,{type:'attack',uid:wall.uid});
 assert.equal(s.pending.kind,'block');
 s=use(s,{type:'chooseBlock',uid:sayaka.uid});
 assert.equal(s.pending.kind,'effect-sayaka-reenter');
 s=use(s,{type:'chooseSayakaReenter',mode:'enter',line:'energy',slot:0});
 assert.equal(s.players[0].energy[0].uid,sayaka.uid);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-102 may tuck Madoka, draw, and rest a red magical girl',()=>{
 const counts=countsFor(['MMM-1-102','MMM-1-085','MMM-1-076','MMM-1-072']);
 let s=toPhase(fresh(counts,41102),'main');
 put(s,0,'MMM-1-085','energy',0);
 put(s,0,'MMM-1-085','energy',1);
 const madoka=put(s,0,'MMM-1-076','front',0);
 const homura=take(s,0,'MMM-1-102');
 const girl=take(s,0,'MMM-1-072');
 s.players[0].hand.push(homura,girl);
 readyAp(s);
 const deck=s.players[0].deck.length;
 s=play(s,homura.uid,'play');
 assert.equal(s.pending.kind,'effect-tuck-named');
 s=use(s,{type:'chooseTuckNamed',uid:madoka.uid});
 assert.equal(s.players[0].deck.at(-1).uid,madoka.uid);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.pending.kind,'effect-hand-girl-rest');
 s=use(s,{type:'chooseHandGirlRest',uid:girl.uid,line:'energy',slot:2});
 assert.equal(s.players[0].energy[2].uid,girl.uid);
 assert.equal(s.players[0].energy[2].ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-104 draws after an unblocked attack at two names, and gains BP plus impact at four',()=>{
 const counts=countsFor(['MMM-1-104','MMM-1-072','MMM-1-085','MMM-1-105','MMM-1-076']);
 let few=fresh(counts,41104);
 const self=put(few,0,'MMM-1-104','front',0,true);
 put(few,1,'MMM-1-072','front',0,true);
 assert.equal(universalBp(packs,few,self),4000);
 assert.equal(universalImpact(packs,few,self),0);
 put(few,0,'MMM-1-072','energy',0);
 put(few,0,'MMM-1-085','energy',1);
 let battle=toPhase(few,'attack');
 const before=battle.players[0].deck.length;
 battle=use(battle,{type:'attack',uid:self.uid});
 assert.equal(battle.pending.kind,'block');
 assert.equal(battle.players[0].deck.length,before);
 battle=use(battle,{type:'chooseBlock',uid:null},1);
 assert.equal(battle.players[0].deck.length,before-1);
 let full=fresh(counts,41105);
 const source=put(full,0,'MMM-1-104','energy',0);
 put(full,0,'MMM-1-072','energy',1);
 put(full,0,'MMM-1-085','energy',2);
 put(full,0,'MMM-1-105','front',0);
 put(full,0,'MMM-1-076','front',1);
 assert.equal(universalBp(packs,full,source),5000);
 assert.equal(universalImpact(packs,full,source),1);
 assert.equal(assertUniversalMatch(packs,full),true);
});

test('MMM-1-110 cuts only the next qualifying hand event, and Q1269 checks outside events first',()=>{
 const counts=countsFor(['MMM-1-110','MMM-1-025','MMM-1-009','MMM-1-029','MMM-1-034','MMM-1-030','MMM-1-006']);
 let s=toPhase(fresh(counts,41110),'main');
 put(s,0,'MMM-1-025','energy',0);
 put(s,0,'MMM-1-025','energy',1);
 const mami=take(s,0,'MMM-1-110');
 const girl=take(s,0,'MMM-1-009');
 const expensive=take(s,0,'MMM-1-029');
 const cheap=take(s,0,'MMM-1-034');
 s.players[0].hand.push(mami,girl,expensive,cheap);
 readyAp(s,0,3);
 s=play(s,mami.uid,'play');
 assert.equal(s.players[0].nextHandEventApCut.amount,1);
 assert.equal(s.players[0].nextHandEventApCut.maxEnergy,3);
 s=play(s,girl.uid,'play');
 assert.equal(s.players[0].nextHandEventApCut.amount,1);
 const beforeExpensive=apReady(s);
 s=play(s,expensive.uid,'event');
 assert.equal(apReady(s),beforeExpensive-1);
 assert.equal(s.players[0].nextHandEventApCut.amount,1);
 const cheapAction=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===cheap.uid);
 assert.ok(cheapAction);
 const beforeCheap=apReady(s);
 s=use(s,cheapAction);
 assert.equal(beforeCheap,apReady(s));
 assert.equal(s.players[0].nextHandEventApCut,null);
 if(s.pending?.kind==='effect-discard')s=use(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(s.pending,null);

 let gated=toPhase(fresh(counts,41111),'main');
 const source=put(gated,0,'MMM-1-110','front',0,true);
 const ally=put(gated,0,'MMM-1-006','front',1,false);
 for(let i=0;i<4;i++)gated.players[0].outside.push(take(gated,0,'MMM-1-030'));
 const early=take(gated,0,'MMM-1-034');
 const sixth=take(gated,0,'MMM-1-034');
 const extra=take(gated,0,'MMM-1-034');
 gated.players[0].outside.push(early);
 gated.players[0].hand.push(sixth);
 gated.players[0].deck.push(extra);
 assert.equal(legalUniversalActions(packs,gated).some(a=>a.mode==='outsideActive'),false);
 gated.players[0].deck.pop();
 gated.players[0].outside.push(extra);
 const action=legalUniversalActions(packs,gated).find(a=>a.mode==='outsideActive'&&a.discardUid===sixth.uid);
 gated=use(gated,action);
 assert.ok(gated.players[0].outside.some(c=>c.uid===sixth.uid));
 assert.equal(gated.pending.kind,'effect-mami-active');
 gated=use(gated,{type:'chooseMamiActive',uid:ally.uid});
 assert.equal(gated.players[0].front.find(c=>c?.uid===ally.uid).ready,true);
 assert.equal(legalUniversalActions(packs,gated).some(a=>a.uid===source.uid&&a.mode==='outsideActive'),false);
 assert.equal(assertUniversalMatch(packs,gated),true);
});
