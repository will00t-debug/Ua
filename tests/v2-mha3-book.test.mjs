import test from 'node:test';
import assert from 'node:assert/strict';
import {UA05NC_MHA3_CARDS} from '../dist/mha/ua05nc-cards.mjs';
import {UA05NC_MHA3_PROGRAMS} from '../dist/universal-v2/mha/programs-ua05nc.mjs';
import {createMha3Pack} from '../dist/universal-v2/mha3-pack.mjs';
import {mhaBattleCard} from '../dist/universal-v2/mha-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalImpact} from '../dist/universal-v2/engine.mjs';

const book=createMha3Pack();
const shigaraki=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-002');

function filler(id, extra={}){
 return {id, name:id, color:'purple', type:'character', energy:0, ap:1, bp:1000,
  gen:1, trigger:null, traits:[], implementation:'vanilla', ...extra};
}
function labPack(card){
 const cards=[card];
 cards.push(filler('LAB-BASE',{name:'死柄木 弔', bp:2000}));
 cards.push(filler('LAB-1500',{bp:1500}));
 cards.push(filler('LAB-2000',{bp:2000}));
 cards.push(filler('LAB-1000',{bp:1000}));
 cards.push(filler('LAB-GEN',{gen:1}));
 cards.push(filler('LAB-Y',{color:'yellow', gen:1}));
 cards.push(filler('LAB-OTHER',{name:'敵', bp:2500}));
 for(let i=0;i<5;i++)cards.push(filler('LAB-F'+i));
 return createUniversalPack({id:'mha3-lab', version:'lab', cards});
}
function deck(extraId){
 const counts={'LAB-BASE':4,'LAB-1500':4,'LAB-2000':4,'LAB-1000':4,
  'LAB-GEN':4,'LAB-Y':4,'LAB-OTHER':4};
 for(let i=0;i<5;i++)counts['LAB-F'+i]=4;
 counts[extraId]=2;
 return counts;
}
function match(pack, id, seed){
 const counts=deck(id);
 return newUniversalMatch([pack,pack],{decks:[counts,counts], seed, first:0, openingMulligan:false});
}
function act(pack, s, action){
 const next=dispatchUniversalAction([pack,pack], s, action);
 assert.equal(assertUniversalMatch([pack,pack], next), true);
 return next;
}
function legal(pack, s){return legalUniversalActions([pack,pack], s);}
function take(s, p, id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s, p, id, line, slot, ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toPhase(pack, s, phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=act(pack, s, {type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function untilActive(pack, s, player, phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=act(pack, s, {type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function live(s, p, uid){
 return [...s.players[p].front, ...s.players[p].energy].find(c=>c?.uid===uid)||null;
}

test('the book pack is only the finished Shigaraki card', ()=>{
 assert.deepEqual(UA05NC_MHA3_CARDS.map(card=>card.number),[
  'UA05NC/MHA-3-001','UA05NC/MHA-3-002','UA05NC/MHA-3-003',
  'UA05NC/MHA-3-004','UA05NC/MHA-3-006','UA05NC/MHA-3-009'
 ]);
 assert.equal(shigaraki.color,'purple');
 assert.equal(shigaraki.energy,4);
 assert.equal(shigaraki.ap,1);
 assert.equal(shigaraki.bp,4000);
 assert.equal(shigaraki.gen,1);
 assert.equal(shigaraki.trigger,'raid');
 assert.equal(UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-009').energyDiscount,null);
 assert.equal(book.version,'mha3-ua05nc-ready-1');
 assert.deepEqual(Object.keys(book.cards),['MHA-3-002']);
 assert.equal(book.cards['MHA-3-002'].battleRemoveInstead,true);
 assert.equal(book.cards['MHA-3-002'].printedImpact,1);
 assert.equal(book.cards['MHA-3-002'].raidName,'死柄木 弔');
 assert.equal(createMhaV2Pack().cards['MHA-3-002'],undefined);
 assert.equal(createMha2Pack().cards['MHA-3-002'],undefined);
 for(const id of Object.keys(UA05NC_MHA3_PROGRAMS)){
  if(id!=='MHA-3-002')assert.equal(UA05NC_MHA3_PROGRAMS[id].ready,false);
 }
});

test('002 lowers up to two fronts of BP 1500 or more, once, and only from the front', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',2);
 const actor=put(s,0,'MHA-3-002','front',0,true);
 const low=put(s,1,'LAB-1000','front',0,true);
 const mid=put(s,1,'LAB-1500','front',1,true);
 const high=put(s,1,'LAB-2000','front',2,true);
 const rear=put(s,1,'LAB-2000','energy',0,true);
 s=toPhase(pack,s,'main');
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid),true);
 let energy=match(pack,'MHA-3-002',3);
 const back=put(energy,0,'MHA-3-002','energy',0,true);
 put(energy,1,'LAB-2000','front',0,true);
 energy=toPhase(pack,energy,'main');
 assert.equal(legal(pack,energy).some(a=>a.type==='activate'&&a.uid===back.uid),false);

 let none=match(pack,'MHA-3-002',4);
 const waiting=put(none,0,'MHA-3-002','front',0,true);
 put(none,1,'LAB-1000','front',0,true);
 none=toPhase(pack,none,'main');
 assert.equal(legal(pack,none).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);

 s=act(pack,s,legal(pack,s).find(a=>a.type==='activate'&&a.uid===actor.uid));
 assert.equal(s.pending.kind,'effect-target-many');
 assert.equal(s.pending.maxTargets,2);
 const choices=legal(pack,s).filter(a=>a.type==='chooseTargetMany');
 assert.equal(choices.some(a=>a.uid===low.uid),false);
 assert.equal(choices.some(a=>a.uid===rear.uid),false);
 assert.equal(choices.some(a=>a.uid===mid.uid),true);
 assert.equal(choices.some(a=>a.uid===high.uid),true);
 assert.equal(choices.some(a=>a.uid===null),true);
 assert.throws(()=>act(pack,s,{type:'chooseTargetMany',uid:low.uid}),/not currently legal|Illegal/);
 s=act(pack,s,{type:'chooseTargetMany',uid:mid.uid});
 s=act(pack,s,{type:'chooseTargetMany',uid:null});
 assert.equal(universalBp(pack,s,live(s,1,mid.uid)),500);
 assert.equal(universalBp(pack,s,live(s,1,high.uid)),2000);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
});

test('002 sends an opponent who loses on its turn to removed and still hits with impact', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',5);
 const winner=put(s,0,'MHA-3-002','front',0,true);
 const blocker=put(s,1,'LAB-1500','front',0,true);
 const life=s.players[1].life.length;
 s=toPhase(pack,s,'attack');
 s=act(pack,s,legal(pack,s).find(a=>a.type==='attack'&&a.uid===winner.uid));
 s=act(pack,s,legal(pack,s).find(a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 assert.equal(s.players[1].removed.some(c=>c.uid===blocker.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===blocker.uid),false);
 assert.equal(universalImpact(pack,s,winner),1);
 if(s.pending){
  assert.equal(s.players[1].life.length<life||s.pending.kind==='life-trigger'||s.pending.kind==='attack-life-target',true);
 }else{
  assert.equal(s.players[1].life.length,life-1);
 }
});

test('002 does not remove a character who loses on the opponent turn', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',6);
 const body=put(s,0,'MHA-3-002','front',0,true);
 s=untilActive(pack,s,1,'main');
 const attacker=put(s,1,'LAB-1000','front',0,true);
 attacker.ready=true;
 s=toPhase(pack,s,'attack');
 s=act(pack,s,legal(pack,s).find(a=>a.type==='attack'&&a.uid===attacker.uid));
 s=act(pack,s,legal(pack,s).find(a=>a.type==='chooseBlock'&&a.uid===body.uid));
 assert.equal(live(s,1,attacker.uid)?.cardId,'LAB-1000');
 assert.equal(s.players[1].removed.some(c=>c.uid===attacker.uid),false);
 assert.equal(s.players[1].outside.some(c=>c.uid===attacker.uid),false);
 assert.equal(live(s,0,body.uid)?.cardId,'MHA-3-002');
});

test('002 raids only a Shigaraki', ()=>{
 const pack=labPack(mhaBattleCard(shigaraki, UA05NC_MHA3_PROGRAMS['MHA-3-002']));
 let s=match(pack,'MHA-3-002',7);
 for(let slot=0;slot<4;slot++)put(s,0,'LAB-GEN','energy',slot,true);
 const base=put(s,0,'LAB-BASE','front',0,false);
 const wrong=put(s,0,'LAB-OTHER','front',1,false);
 const raider=take(s,0,'MHA-3-002');
 s.players[0].hand.push(raider);
 s=toPhase(pack,s,'main');
 const raids=legal(pack,s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid),true);
 assert.equal(raids.some(a=>a.baseUid===wrong.uid),false);
 s=act(pack,s,raids.find(a=>a.baseUid===base.uid));
 const top=s.players[0].front.find(c=>c?.cardId==='MHA-3-002');
 assert.equal(top.stack[0].cardId,'LAB-BASE');
});

test('001 draws two on play and stays out of the book pack', ()=>{
 const printed=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-001');
 const card={
  id:printed.id, name:printed.nameJa, color:printed.color, type:'character',
  energy:printed.energy, ap:printed.ap, bp:printed.bp, gen:printed.gen,
  trigger:printed.trigger, traits:[...printed.traits], implementation:'dsl',
  effects:UA05NC_MHA3_PROGRAMS['MHA-3-001'].effects
 };
 const pack=labPack(card);
 let s=match(pack,'MHA-3-001',8);
 for(let slot=0;slot<3;slot++)put(s,0,'LAB-Y','energy',slot,true);
 const hand=take(s,0,'MHA-3-001');
 s.players[0].hand.push(hand);
 s.players[0].apCards.forEach((card,index)=>{
  if(index<2){card.inPlay=true;card.ready=true;}
 });
 const before=s.players[0].hand.length;
 const deckBefore=s.players[0].deck.length;
 s=toPhase(pack,s,'main');
 s=act(pack,s,legal(pack,s).find(a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front'));
 assert.equal(s.players[0].hand.length,before-1+2);
 assert.equal(s.players[0].deck.length,deckBefore-2);
 assert.equal(book.cards['MHA-3-001'],undefined);
});

test('009 gains 500 BP on its own turn only', ()=>{
 const printed=UA05NC_MHA3_CARDS.find(card=>card.id==='MHA-3-009');
 const card={
  id:printed.id, name:printed.nameJa, color:printed.color, type:'character',
  energy:printed.energy, ap:printed.ap, bp:printed.bp, gen:printed.gen,
  trigger:printed.trigger, traits:[], implementation:'dsl',
  ownTurnBp:UA05NC_MHA3_PROGRAMS['MHA-3-009'].ownTurnBp
 };
 const pack=labPack(card);
 let s=match(pack,'MHA-3-009',9);
 const body=put(s,0,'MHA-3-009','front',0,true);
 s=toPhase(pack,s,'main');
 assert.equal(universalBp(pack,s,live(s,0,body.uid)),3500);
 s=untilActive(pack,s,1,'main');
 assert.equal(universalBp(pack,s,live(s,0,body.uid)),3000);
 assert.equal(book.cards['MHA-3-009'],undefined);
});
