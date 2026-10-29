import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalImpact} from '../dist/universal-v2/engine.mjs';

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
  if(++guard>8)throw Error('Did not reach '+phase);
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
 const action=legalUniversalActions(packs,s).find(a=>a.type===kind&&a.uid===uid&&!a.from);
 if(!action)throw Error('No '+kind+' for '+uid);
 return use(s,action);
}
function onField(s,p,uid){
 return s.players[p].front.find(c=>c?.uid===uid)||s.players[p].energy.find(c=>c?.uid===uid);
}
function limitedCounts(plain,limited){
 const reserved=new Set([...plain,...Object.keys(limited)]);
 const fillers=Object.values(pack.cards).filter(c=>!reserved.has(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const counts={};
 let total=0;
 for(const id of plain){counts[id]=4;total+=4;}
 for(const [id,n] of Object.entries(limited)){counts[id]=n;total+=n;}
 for(const id of fillers){
  if(total>=50)break;
  const n=Math.min(4,50-total);
  counts[id]=n;total+=n;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}

test('Q1256 and removed Law of Cycles do not retire the chosen character',()=>{
 const counts=countsFor(['MMM-1-028','MMM-1-025','MMM-1-006','MMM-1-112','MMM-1-002','MMM-1-004']);
 let blocked=toPhase(fresh(counts,41256),'main');
 put(blocked,0,'MMM-1-025','energy',0);
 put(blocked,0,'MMM-1-025','energy',1);
 put(blocked,0,'MMM-1-025','energy',2);
 const event=take(blocked,0,'MMM-1-028');
 blocked.players[0].hand.push(event);
 readyAp(blocked);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===event.uid),false);

 let hand=toPhase(fresh(counts,41257),'main');
 put(hand,0,'MMM-1-025','energy',0);
 put(hand,0,'MMM-1-025','energy',1);
 put(hand,0,'MMM-1-025','energy',2);
 put(hand,0,'MMM-1-006','energy',3);
 const victim=put(hand,1,'MMM-1-112','front',0);
 const prize=take(hand,1,'MMM-1-006');
 hand.players[1].outside.push(prize);
 const fromHand=take(hand,0,'MMM-1-028');
 hand.players[0].hand.push(fromHand);
 readyAp(hand);
 hand=play(hand,fromHand.uid,'event');
 assert.equal(hand.pending.kind,'effect-remove-front-self');
 hand=use(hand,{type:'chooseRemoveFrontSelf',uid:victim.uid});
 assert.equal(hand.pending,null);
 assert.ok(hand.players[1].removed.some(c=>c.uid===victim.uid));
 assert.equal(hand.players[1].outside.some(c=>c.uid===victim.uid),false);
 assert.ok(hand.players[1].outside.some(c=>c.uid===prize.uid));
 assert.equal(hand.players[1].hand.some(c=>c.uid===prize.uid),false);
 assert.ok(hand.players[0].removed.some(c=>c.uid===fromHand.uid));
 assert.equal(hand.turnRetireEvents.some(e=>e.uid===victim.uid),false);

 let removed=toPhase(fresh(counts,41258),'main');
 put(removed,0,'MMM-1-025','energy',0);
 put(removed,0,'MMM-1-025','energy',1);
 put(removed,0,'MMM-1-025','energy',2);
 put(removed,0,'MMM-1-002','front',0);
 const again=put(removed,1,'MMM-1-112','front',0);
 const kept=take(removed,1,'MMM-1-006');
 removed.players[1].outside.push(kept);
 const fromRemoved=take(removed,0,'MMM-1-028');
 removed.players[0].removed.push(fromRemoved);
 readyAp(removed);
 const bottom=removed.players[0].deck.length;
 removed=use(removed,legalUniversalActions(packs,removed).find(a=>a.type==='event'&&
  a.from==='removed'&&a.uid===fromRemoved.uid));
 removed=use(removed,{type:'chooseRemoveFrontSelf',uid:again.uid});
 assert.equal(removed.players[0].deck.at(-1).uid,fromRemoved.uid);
 assert.equal(removed.players[0].deck.length,bottom+1);
 assert.equal(removed.players[0].removed.some(c=>c.uid===fromRemoved.uid),false);
 assert.ok(removed.players[1].removed.some(c=>c.uid===again.uid));
 assert.ok(removed.players[1].outside.some(c=>c.uid===kept.uid));
 assert.equal(assertUniversalMatch(packs,removed),true);
});

test('Q1259 raises Devil Homura to BP-4000, and her shield blocks effect removal',()=>{
 const counts=countsFor(['MMM-1-036','MMM-1-035','MMM-1-006','MMM-1-049','MMM-1-039','MMM-1-038','MMM-1-028','MMM-1-025']);
 let s=toPhase(fresh(counts,41259),'main');
 put(s,0,'MMM-1-049','energy',0);
 put(s,0,'MMM-1-049','energy',1);
 put(s,0,'MMM-1-039','energy',2);
 const devil=take(s,0,'MMM-1-036');
 const alias=put(s,0,'MMM-1-035','front',1);
 const madoka=put(s,0,'MMM-1-006','front',2);
 const foe=put(s,1,'MMM-1-038','front',0);
 s.players[0].hand.push(devil);
 readyAp(s);
 const before=universalBp(packs,s,foe);
 s=play(s,devil.uid,'play');
 assert.equal(s.pending.kind,'effect-bounce-named-cut');
 s=use(s,{type:'chooseBounceNamedCut',uid:madoka.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===madoka.uid),true);
 assert.equal(s.pending.kind,'effect-front-bp-cut');
 assert.equal(s.pending.bp,4000);
 s=use(s,{type:'chooseFrontBpCut',uid:foe.uid});
 assert.equal(universalBp(packs,s,s.players[1].front[0]),before-4000);
 assert.equal(s.players[0].front.some(c=>c?.uid===alias.uid),true);

 let shield=toPhase(fresh(counts,41260),'main');
 put(shield,0,'MMM-1-025','energy',0);
 put(shield,0,'MMM-1-025','energy',1);
 put(shield,0,'MMM-1-025','energy',2);
 put(shield,0,'MMM-1-006','front',0);
 const protectedDevil=put(shield,1,'MMM-1-036','front',0);
 const open=put(shield,1,'MMM-1-038','front',1);
 const law=take(shield,0,'MMM-1-028');
 shield.players[0].hand.push(law);
 readyAp(shield);
 shield=play(shield,law.uid,'event');
 assert.equal(shield.pending.choices.includes(protectedDevil.uid),false);
 assert.deepEqual(shield.pending.choices,[open.uid]);
 assert.equal(assertUniversalMatch(packs,shield),true);
});

test('Q1254 Q1255 and Q1273 gate only Nagisa removed-entry draw',()=>{
 const counts=countsFor(['MMM-1-022','MMM-1-002','MMM-1-025','MMM-1-003','MMM-1-006']);
 let second=toPhase(fresh(counts,41254),'main');
 put(second,0,'MMM-1-025','energy',0);
 put(second,0,'MMM-1-025','energy',1);
 put(second,0,'MMM-1-003','energy',2);
 put(second,0,'MMM-1-002','front',0);
 const first=take(second,0,'MMM-1-022');
 const later=take(second,0,'MMM-1-022');
 second.players[0].removed.push(first,later);
 readyAp(second);
 const deck=second.players[0].deck.length;
 second=use(second,legalUniversalActions(packs,second).find(a=>a.type==='play'&&
  a.from==='removed'&&a.uid===first.uid&&a.line==='front'));
 assert.equal(second.pending,null);
 assert.equal(second.players[0].deck.length,deck-1);
 assert.equal(universalBp(packs,second,second.players[0].front.find(c=>c.uid===first.uid)),4000);
 second=use(second,legalUniversalActions(packs,second).find(a=>a.type==='play'&&
  a.from==='removed'&&a.uid===later.uid&&a.line==='energy'));
 assert.equal(second.players[0].deck.length,deck-1);
 assert.equal(universalBp(packs,second,second.players[0].energy.find(c=>c.uid===later.uid)),4000);

 let freshCopy=toPhase(fresh(counts,41273),'main');
 put(freshCopy,0,'MMM-1-025','energy',0);
 put(freshCopy,0,'MMM-1-025','energy',1);
 put(freshCopy,0,'MMM-1-002','front',0);
 const fromHand=take(freshCopy,0,'MMM-1-022');
 const fromRemoved=take(freshCopy,0,'MMM-1-022');
 freshCopy.players[0].hand.push(fromHand);
 freshCopy.players[0].removed.push(fromRemoved);
 readyAp(freshCopy);
 const untouched=freshCopy.players[0].deck.length;
 freshCopy=play(freshCopy,fromHand.uid,'play');
 assert.equal(freshCopy.players[0].deck.length,untouched);
 assert.equal(universalBp(packs,freshCopy,onField(freshCopy,0,fromHand.uid)),4000);
 freshCopy=use(freshCopy,legalUniversalActions(packs,freshCopy).find(a=>a.type==='play'&&
  a.from==='removed'&&a.uid===fromRemoved.uid&&a.line==='energy'));
 assert.equal(freshCopy.players[0].deck.length,untouched-1);
 assert.equal(assertUniversalMatch(packs,freshCopy),true);
});

test('Q1260 Q1262 and Q1265 count aliases, other copies, and a private life',()=>{
 const counts=limitedCounts(
  ['MMM-1-042','MMM-1-046','MMM-1-037','MMM-1-058','MMM-1-009','MMM-1-014','MMM-1-049'],
  {'MMM-1-035':1,'MMM-1-077':2,'MMM-1-089':1});
 let named=toPhase(fresh(counts,41260),'main');
 put(named,0,'MMM-1-049','energy',0);
 put(named,0,'MMM-1-049','energy',1);
 put(named,0,'MMM-1-035','front',0);
 const madoka=take(named,0,'MMM-1-042');
 const homura=take(named,0,'MMM-1-046');
 named.players[0].hand.push(madoka,homura);
 readyAp(named);
 named=play(named,madoka.uid,'play');
 assert.equal(named.pending.kind,'effect-hand-rest');
 assert.ok(named.pending.choices.includes(homura.uid));
 named=use(named,{type:'chooseHandRest',uid:null});

 let open=toPhase(fresh(counts,41261),'main');
 put(open,0,'MMM-1-058','energy',0);
 put(open,0,'MMM-1-058','energy',1);
 put(open,0,'MMM-1-037','front',0);
 const wide=take(open,0,'MMM-1-042');
 const blocked=take(open,0,'MMM-1-046');
 open.players[0].hand.push(wide,blocked);
 readyAp(open);
 open=play(open,wide.uid,'play');
 assert.equal(open.pending===null||!open.pending.choices?.includes(blocked.uid),true);

 let copies=fresh(counts,41262);
 const source=put(copies,0,'MMM-1-077','energy',0);
 const twin=put(copies,0,'MMM-1-077','energy',1);
 put(copies,0,'MMM-1-009','front',0);
 put(copies,0,'MMM-1-014','front',1);
 assert.equal(universalCardEnergy(packs,copies,0,source),2);
 assert.equal(universalCardEnergy(packs,copies,0,twin),2);

 let life=toPhase(fresh(counts,41265),'main');
 const sayaka=put(life,0,'MMM-1-089','front',0,false);
 const hidden=life.players[0].life[0];
 const reveals=life.publicReveals.length;
 life=use(life,{type:'activate',uid:sayaka.uid,mode:'lifeActive'});
 assert.equal(life.pending.kind,'effect-life-active-self');
 life=use(life,{type:'chooseLifeActive',uid:hidden.uid});
 assert.equal(life.pending,null);
 assert.ok(life.players[0].hand.some(c=>c.uid===hidden.uid));
 assert.equal(life.publicReveals.length,reveals);
 assert.equal(life.players[0].front.find(c=>c?.uid===sayaka.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('Q1261 counts a Madoka deployed by the same entry effect',()=>{
 const counts=countsFor(['MMM-1-075','MMM-1-085','MMM-1-076','MMM-1-006']);
 let s=toPhase(fresh(counts,41261),'main');
 put(s,0,'MMM-1-085','energy',0);
 put(s,0,'MMM-1-085','energy',1);
 const foe=put(s,1,'MMM-1-006','front',0,true);
 const homura=take(s,0,'MMM-1-075');
 const madoka=take(s,0,'MMM-1-076');
 s.players[0].hand.push(homura,madoka);
 readyAp(s);
 s=play(s,homura.uid,'play');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.ok(s.pending.choices.includes(madoka.uid));
 const place=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandRest'&&a.uid===madoka.uid);
 assert.ok(place);
 s=use(s,place);
 assert.equal(onField(s,0,madoka.uid).ready,false);
 assert.equal(s.pending.kind,'effect-attack-ban');
 assert.ok(s.pending.choices.some(c=>c.uid===foe.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1263 Q1264 and Q1268 count other copies once across colors',()=>{
 const counts=countsFor(['MMM-1-078','MMM-1-068','MMM-1-009','MMM-1-039','MMM-1-006','MMM-1-105','MMM-1-042']);
 let s=toPhase(fresh(counts,41263),'main');
 put(s,0,'MMM-1-068','energy',0);
 put(s,0,'MMM-1-068','energy',1);
 put(s,0,'MMM-1-068','energy',2);
 put(s,0,'MMM-1-078','front',0);
 put(s,0,'MMM-1-006','front',1);
 put(s,0,'MMM-1-009','front',2);
 put(s,0,'MMM-1-039','energy',3);
 const inside=put(s,1,'MMM-1-105','front',0);
 const outside=put(s,1,'MMM-1-042','front',1);
 const played=take(s,0,'MMM-1-078');
 s.players[0].hand.push(played);
 readyAp(s);
 s=play(s,played.uid,'play');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,3000);
 assert.ok(s.pending.choices.includes(inside.uid));
 assert.equal(s.pending.choices.includes(outside.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);

 const kinds=countsFor(['MMM-1-104','MMM-1-072','MMM-1-085','MMM-1-105']);
 const board=fresh(kinds,41268);
 const source=put(board,0,'MMM-1-104','energy',0);
 put(board,0,'MMM-1-104','energy',1);
 put(board,0,'MMM-1-072','energy',2);
 put(board,0,'MMM-1-085','energy',3);
 assert.equal(universalBp(packs,board,source),4000);
 put(board,0,'MMM-1-105','front',0);
 assert.equal(universalBp(packs,board,source),5000);
 assert.equal(universalImpact(packs,board,source),1);
 assert.equal(assertUniversalMatch(packs,board),true);
});

test('Q1274 places a raided Devil Homura in the removed area when battle loss is replaced',()=>{
 const bleach=createBleachV2Pack();
 const bleachIds=['BLC-1-092','BLC-2-040','BLC-4-064','BLC-4-061','BLC-1-083','BLC-1-091','BLC-1-080','BLC-1-078','BLC-4-062','BLC-1-087','BLC-2-067','BLC-4-060','BLC-1-079'];
 const bleachDeck=Object.fromEntries(bleachIds.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,bleachDeck),[]);
 const madokaDeck=countsFor(['MMM-1-036','MMM-1-039','MMM-1-058','MMM-1-006']);
 const both=[bleach,pack];
 let s=newUniversalMatch(both,{decks:[bleachDeck,madokaDeck],seed:41274,first:0});
 const yama=(()=>{
  const card=take(s,0,'BLC-1-092');
  card.ready=true;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  card.buffs=[{bp:1000,untilTurn:s.turn}];
  s.players[0].front[0]=card;
  return card;
 })();
 const devil=(()=>{
  const card=take(s,1,'MMM-1-036');
  card.ready=true;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  const base=take(s,1,'MMM-1-039');
  card.stack=[base];
  s.players[1].front[0]=card;
  return card;
 })();
 const base=devil.stack[0];
 let guard=0;
 while(s.phase!=='attack'){
  s=dispatchUniversalAction(both,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach attack');
 }
 s=dispatchUniversalAction(both,s,{type:'attack',uid:yama.uid});
 assert.equal(s.pending.kind,'block');
 s=dispatchUniversalAction(both,s,{type:'chooseBlock',uid:devil.uid},{actor:1});
 assert.ok(s.players[1].removed.some(c=>c.uid===devil.uid));
 assert.equal(s.players[1].outside.some(c=>c.uid===devil.uid),false);
 assert.ok(s.players[1].outside.some(c=>c.uid===base.uid));
 assert.equal(s.turnRetireEvents.some(e=>e.uid===devil.uid),false);
 assert.equal(assertUniversalMatch(both,s),true);
});

test('Q1257 spends the skip when an ACTIVE life trigger targets the rested front',()=>{
 const counts=countsFor(['MMM-1-032','MMM-1-025','MMM-1-071','MMM-1-009','MMM-1-112']);
 let s=toPhase(fresh(counts,51257),'main');
 put(s,0,'MMM-1-025','energy',0);
 put(s,0,'MMM-1-025','energy',1);
 const marked=put(s,1,'MMM-1-112','front',0,true);
 const witch=put(s,0,'MMM-1-071','front',0,true);
 const event=take(s,0,'MMM-1-032');
 s.players[0].hand.push(event);
 readyAp(s);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-rest-skip-may-retire');
 assert.equal(s.pending.mayRetire,false);
 s=use(s,{type:'chooseRestSkipMayRetire',uid:marked.uid,mode:'rest'});
 assert.equal(s.players[1].front.find(c=>c.uid===marked.uid).ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===marked.uid),true);
 const first=take(s,1,'MMM-1-009');
 const second=take(s,1,'MMM-1-009');
 const life=s.players[1].life;
 s.players[1].deck.push(life.shift(),life.shift());
 life.unshift(first,second);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:witch.uid});
 assert.equal(s.pending.kind,'block');
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-batch-order');
 assert.ok(s.pending.choices.includes(first.uid));
 assert.ok(s.pending.choices.includes(second.uid));
 s=use(s,{type:'chooseLifeOrder',uid:first.uid});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 assert.equal(s.pending.uid,first.uid);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===marked.uid));
 s=use(s,{type:'chooseTrigger',mode:'active',uid:marked.uid});
 const rested=s.players[1].front.find(c=>c.uid===marked.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalBp(packs,s,rested),7000);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===marked.uid),false);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.uid,second.uid);
 s=use(s,{type:'chooseTrigger',mode:'active',uid:marked.uid});
 const freed=s.players[1].front.find(c=>c.uid===marked.uid);
 assert.equal(freed.ready,true);
 assert.equal(universalBp(packs,s,freed),10000);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===marked.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1271 adds a yellow Madoka of energy 2 or less and rejects energy 3',()=>{
 const counts=countsFor(['MMM-1-112','MMM-1-006','MMM-1-008','MMM-1-078','MMM-1-103']);
 assert.equal(pack.cards['MMM-1-006'].color,'yellow');
 assert.equal(pack.cards['MMM-1-006'].energy,0);
 assert.equal(pack.cards['MMM-1-008'].color,'yellow');
 assert.equal(pack.cards['MMM-1-008'].energy,3);
 assert.equal(pack.cards['MMM-1-103'].color,'red');
 assert.equal(pack.cards['MMM-1-103'].energy,1);
 assert.equal(pack.cards['MMM-1-078'].energy,5);
 let s=toPhase(fresh(counts,51271),'attack');
 const wall=put(s,1,'MMM-1-112','front',0,true);
 const yellowLow=take(s,1,'MMM-1-006');
 const yellowHigh=take(s,1,'MMM-1-008');
 const redLow=take(s,1,'MMM-1-103');
 const redHigh=take(s,1,'MMM-1-078');
 s.players[1].outside.push(yellowLow,yellowHigh,redLow,redHigh);
 const striker=put(s,0,'MMM-1-078','front',0,true);
 assert.ok(universalBp(packs,s,striker)>=universalBp(packs,s,wall));
 s=use(s,{type:'attack',uid:striker.uid});
 s=use(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.player,1);
 assert.ok(s.pending.choices.includes(yellowLow.uid));
 assert.ok(s.pending.choices.includes(redLow.uid));
 assert.equal(s.pending.choices.includes(yellowHigh.uid),false);
 assert.equal(s.pending.choices.includes(redHigh.uid),false);
 s=use(s,{type:'chooseOutsideRecovery',uid:yellowLow.uid});
 assert.ok(s.players[1].hand.some(c=>c.uid===yellowLow.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===yellowHigh.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===redLow.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===redHigh.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
