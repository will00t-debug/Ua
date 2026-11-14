// Round 12 group B. IMC and UA10ST already have per-card programs.
// This file checks those programs against each other: attack, block, BP,
// raid, life triggers, energy and AP. It does not add a second runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createMhaV2Pack,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_UA10ST_PROGRAMS} from '../dist/universal-v2/mha/programs.mjs';
import {imcCatalog} from '../dist/imc/catalog.mjs';
import {loadImcOfficialStarter} from '../dist/imc/starter-deck.mjs';
import {mhaCatalog} from '../dist/mha/catalog.mjs';
import {UA10ST_PRODUCT,UA10ST_CARDS} from '../dist/mha/ua10st-cards.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const IMC=createImcV2Pack();
const MHA=createMhaV2Pack();
const IMC_CAT=imcCatalog();
const MHA_CAT=mhaCatalog();
const ST=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065','MHA-1-101','MHA-1-102',
 'MHA-1-103','MHA-1-104','MHA-1-105','MHA-1-106','MHA-1-107','MHA-1-108',
 'MHA-1-109'];

function fill(pack,required){
 const counts={...required};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const limited=new Set(['special','final','color']);
 for(const card of Object.values(pack.cards)){
  if(total>=50)break;
  if(counts[card.id]||limited.has(card.trigger)||card.type==='action-point')continue;
  const n=Math.min(4,50-total);
  counts[card.id]=n;
  total+=n;
 }
 assert.equal(total,50);
 return counts;
}
const IMC_DECK=fill(IMC,{
 'IMC-1-001':4,'IMC-1-007':4,'IMC-1-040':4,
 'IMC-1-014':1,'IMC-1-029':1,'IMC-1-100':1,'IMC-1-102':1,'IMC-1-109':1
});
const MHA_DECK=fill(MHA,{
 'MHA-1-034':2,'MHA-1-036':4,'MHA-1-041':4,'MHA-1-044':4,'MHA-1-052':2,
 'MHA-1-057':1,'MHA-1-061':2,'MHA-1-063':1,'MHA-1-065':1,'MHA-1-101':2,
 'MHA-1-102':1,'MHA-1-103':4,'MHA-1-104':2,'MHA-1-105':1,'MHA-1-106':2,
 'MHA-1-107':1,'MHA-1-108':1,'MHA-1-109':1
});

function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function reach(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=act(pack,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach '+phase);
 }
 return s;
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const cards=s.players[p][zone];
  const index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id+' for player '+p);
}
function seat(s,p,id,line,slot,ready=true){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function blankLife(pack,s,p){
 const life=s.players[p].life;
 const printed=pack[p].cards;
 for(let i=0;i<life.length;i++){
  if(!printed[life[i].cardId].trigger)continue;
  const index=s.players[p].deck.findIndex(c=>printed[c.cardId].type==='character'&&!printed[c.cardId].trigger);
  assert.ok(index>=0,'quiet life card');
  const swap=s.players[p].deck.splice(index,1)[0];
  s.players[p].deck.push(life[i]);
  life[i]=swap;
 }
}
function pay(s,p,energySlots,ap){
 for(let i=0;i<energySlots.length;i++)seat(s,p,energySlots[i],'energy',i,true);
 s.players[p].apCards.forEach((card,index)=>{
  card.inPlay=index<ap;
  card.ready=index<ap;
 });
}
function open(seed,mhaActive){
 assert.deepEqual(validateUniversalDeck(IMC,IMC_DECK),[]);
 assert.deepEqual(validateUniversalDeck(MHA,MHA_DECK),[]);
 const packs=mhaActive?[MHA,IMC]:[IMC,MHA];
 const decks=mhaActive?[MHA_DECK,IMC_DECK]:[IMC_DECK,MHA_DECK];
 let s=newUniversalMatch(packs,{decks,seed,first:0,openingMulligan:false});
 assert.equal(s.title,'cross-title');
 s=reach(packs,s,0,'main');
 return {packs,s,mha:mhaActive?0:1,imc:mhaActive?1:0};
}
function reveal(opened,defender,id){
 blankLife(opened.packs,opened.s,defender);
 opened.s.players[defender].life.unshift(pull(opened.s,defender,id));
}
function swing(opened,attacker,blockUid){
 let s=act(opened.packs,opened.s,{type:'attack',uid:attacker});
 if(s.pending?.kind==='block')s=act(opened.packs,s,a=>a.type==='chooseBlock'&&a.uid===blockUid);
 return s;
}

test('IMC 113 and UA10ST 18 keep catalog stats, and both starter ratios stay null',()=>{
 assert.equal(Object.keys(IMC.cards).length,113);
 assert.equal(IMC_CAT.deck.length,113);
 for(const card of IMC_CAT.deck){
  const battle=IMC.cards[card.id];
  assert.ok(battle,card.id);
  for(const key of ['energy','ap','bp','gen','type','trigger','color'])
   assert.equal(battle[key]??null,card[key]??null,card.id+' '+key);
  const printed=typeof card.effectJa==='string'&&card.effectJa!=='-'&&card.effectJa!=='';
  assert.equal(battle.implementation,printed?'dsl':'vanilla',card.id);
  if(battle.raidName)assert.equal(card.effectJa.includes(battle.raidName),true,card.id);
 }
 assert.equal(getTitle('imc').playable,true);
 assert.equal(getTitle('mha').playable,true);
 const starter=loadImcOfficialStarter();
 assert.equal(starter.counts,null);
 assert.equal(starter.deckCards,50);
 assert.equal(starter.kinds.length,18);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.equal(UA10ST_PRODUCT.deckCards,50);
 assert.match(UA10ST_PRODUCT.recipeStatus,/待查/);
 assert.equal(UA10ST_CARDS.length,18);
 const booster=new Map(MHA_CAT.deck.map(card=>[card.id,card]));
 for(const id of ST){
  const battle=MHA.cards[id];
  const row=UA10ST_CARDS.find(card=>card.id===id);
  assert.equal(battle.energy,row.energy,id);
  assert.equal(battle.ap,row.ap,id);
  assert.equal(battle.bp??0,row.bp??0,id);
  assert.equal(battle.type,row.type,id);
  assert.equal(battle.trigger??null,row.trigger??null,id);
  assert.equal(row.nameJa==='爆豪 勝己'&&id==='MHA-1-102',false);
  assert.equal(row.image.startsWith('https://www.unionarena-tcg.com/jp/images/cardlist/card/UA10ST_'),true,id);
  const other=booster.get(id);
  if(!other||other===row)continue;
  assert.equal(other.nameJa,row.nameJa,id);
  assert.equal(other.energy,row.energy,id);
  assert.equal(other.trigger??null,row.trigger??null,id);
 }
 assert.equal(MHA.cards['MHA-1-102'].name,'オールマイト');
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-063'],undefined);
 assert.equal(mhaProgramFor('MHA-1-063'),MHA_UA10ST_PROGRAMS['MHA-1-063']);
 assert.equal(MHA.cards['MHA-1-063'].triggerEffect.op,'retireOppFront');
});

test('the attacker wins equal BP, and a strictly higher blocker keeps both characters',()=>{
 const mhaHit=open(1201,true);
 const striker=seat(mhaHit.s,mhaHit.mha,'MHA-1-103','front',0,true);
 const tied=seat(mhaHit.s,mhaHit.imc,'IMC-1-007','front',0,true);
 blankLife(mhaHit.packs,mhaHit.s,mhaHit.imc);
 const life=mhaHit.s.players[mhaHit.imc].life.length;
 mhaHit.s=reach(mhaHit.packs,mhaHit.s,mhaHit.mha,'attack');
 let s=swing(mhaHit,striker.uid,tied.uid);
 assert.equal(s.players[mhaHit.imc].life.length,life);
 assert.equal(s.players[mhaHit.mha].front[0].cardId,'MHA-1-103');
 assert.equal(s.players[mhaHit.mha].front[0].ready,false);
 assert.equal(s.players[mhaHit.imc].front[0],null);
 assert.equal(s.players[mhaHit.imc].outside.some(c=>c.uid===tied.uid),true);

 const mhaWin=open(1202,true);
 const winner=seat(mhaWin.s,mhaWin.mha,'MHA-1-103','front',0,true);
 const low=seat(mhaWin.s,mhaWin.imc,'IMC-1-001','front',0,true);
 blankLife(mhaWin.packs,mhaWin.s,mhaWin.imc);
 const before=mhaWin.s.players[mhaWin.imc].life.length;
 mhaWin.s=reach(mhaWin.packs,mhaWin.s,mhaWin.mha,'attack');
 s=swing(mhaWin,winner.uid,low.uid);
 assert.equal(s.players[mhaWin.imc].front[0],null);
 assert.equal(s.players[mhaWin.imc].life.length,before);
 assert.equal(s.players[mhaWin.mha].front[0].cardId,'MHA-1-103');

 const imcWin=open(1203,false);
 const idol=seat(imcWin.s,imcWin.imc,'IMC-1-007','front',0,true);
 const small=seat(imcWin.s,imcWin.mha,'MHA-1-044','front',0,true);
 blankLife(imcWin.packs,imcWin.s,imcWin.mha);
 imcWin.s=reach(imcWin.packs,imcWin.s,imcWin.imc,'attack');
 s=swing(imcWin,idol.uid,small.uid);
 assert.equal(s.players[imcWin.mha].front[0],null);
 assert.equal(s.players[imcWin.imc].front[0].cardId,'IMC-1-007');

 const held=open(1218,true);
 const lowHit=seat(held.s,held.mha,'MHA-1-103','front',0,true);
 const wall=seat(held.s,held.imc,'IMC-1-102','front',0,true);
 blankLife(held.packs,held.s,held.imc);
 const heldLife=held.s.players[held.imc].life.length;
 held.s=reach(held.packs,held.s,held.mha,'attack');
 s=swing(held,lowHit.uid,wall.uid);
 assert.equal(s.players[held.imc].life.length,heldLife);
 assert.equal(s.players[held.mha].front[0].cardId,'MHA-1-103');
 assert.equal(s.players[held.mha].front[0].ready,false);
 assert.equal(s.players[held.imc].front[0].cardId,'IMC-1-102');
 assert.equal(s.players[held.imc].front[0].ready,false);
});

test('UA10ST damage, impact and a BP ceiling use the IMC board',()=>{
 const damage=open(1204,true);
 pay(damage.s,damage.mha,['MHA-1-041','MHA-1-041'],2);
 const mighty=seat(damage.s,damage.mha,'MHA-1-102','front',0,true);
 blankLife(damage.packs,damage.s,damage.imc);
 const before=damage.s.players[damage.imc].life.length;
 damage.s=reach(damage.packs,damage.s,damage.mha,'attack');
 let s=swing(damage,mighty.uid,null);
 assert.equal(s.players[damage.imc].life.length,before-2);
 assert.equal(s.players[damage.imc].lifeRevealed.length,2);
 assert.equal(s.players[damage.mha].hand.some(c=>String(c.cardId).startsWith('IMC-')),false);

 const impact=open(1205,true);
 const raider=seat(impact.s,impact.mha,'MHA-1-107','front',0,true);
 const blocker=seat(impact.s,impact.imc,'IMC-1-001','front',0,true);
 blankLife(impact.packs,impact.s,impact.imc);
 const sum=impact.s.players[impact.imc].life.length;
 impact.s=reach(impact.packs,impact.s,impact.mha,'attack');
 s=swing(impact,raider.uid,blocker.uid);
 assert.equal(s.players[impact.imc].front[0],null);
 assert.equal(s.players[impact.imc].life.length+s.players[impact.imc].lifeRevealed.length,sum-1);

 const retire=open(1206,true);
 const bakugo=seat(retire.s,retire.mha,'MHA-1-105','front',0,true);
 const legalLow=seat(retire.s,retire.imc,'IMC-1-040','front',0,true);
 const tooHigh=seat(retire.s,retire.imc,'IMC-1-102','front',1,true);
 const energy=seat(retire.s,retire.imc,'IMC-1-007','energy',0,true);
 retire.s=reach(retire.packs,retire.s,retire.mha,'attack');
 s=act(retire.packs,retire.s,{type:'attack',uid:bakugo.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[legalLow.uid]);
 assert.equal(s.pending.choices.includes(tooHigh.uid),false);
 assert.equal(s.pending.choices.includes(energy.uid),false);
 const skipped=act(retire.packs,s,a=>a.type==='chooseRetireBp'&&a.uid===null);
 assert.equal(skipped.pending.kind,'block');
 s=act(retire.packs,s,a=>a.type==='chooseRetireBp'&&a.uid===legalLow.uid);
 assert.equal(s.players[retire.imc].front[0],null);
 assert.equal(s.players[retire.imc].front[1].cardId,'IMC-1-102');
});

test('MHA-1-106 and MHA-1-107 read IMC front characters, not IMC energy or their names',()=>{
 const bp=open(1207,true);
 const watcher=seat(bp.s,bp.mha,'MHA-1-106','front',0,true);
 assert.equal(universalBp(bp.packs,bp.s,watcher),3000);
 seat(bp.s,bp.imc,'IMC-1-001','front',0,true);
 seat(bp.s,bp.imc,'IMC-1-007','front',1,true);
 assert.equal(universalBp(bp.packs,bp.s,watcher),3000);
 const third=seat(bp.s,bp.imc,'IMC-1-040','front',2,true);
 assert.equal(universalBp(bp.packs,bp.s,watcher),4000);
 third.faceDown=true;
 assert.equal(universalBp(bp.packs,bp.s,watcher),3000);
 third.faceDown=false;
 seat(bp.s,bp.imc,'IMC-1-001','energy',0,true);
 assert.equal(universalBp(bp.packs,bp.s,watcher),4000);

 const raid=open(1208,true);
 pay(raid.s,raid.mha,['MHA-1-041','MHA-1-041'],1);
 const base=seat(raid.s,raid.mha,'MHA-1-106','energy',2,false);
 const stranger=seat(raid.s,raid.imc,'IMC-1-102','energy',0,false);
 const card=pull(raid.s,raid.mha,'MHA-1-107');
 raid.s.players[raid.mha].hand.push(card);
 const offered=legal(raid.packs,raid.s).filter(a=>a.type==='raid'&&a.uid===card.uid);
 assert.ok(offered.some(a=>a.baseUid===base.uid&&a.line!=='energy'));
 assert.equal(offered.some(a=>a.baseUid===stranger.uid),false);
 for(let slot=0;slot<3;slot++)seat(raid.s,raid.imc,'IMC-1-001','front',slot,true);
 const hand=raid.s.players[raid.mha].hand.length;
 const deck=raid.s.players[raid.mha].deck.length;
 let s=act(raid.packs,raid.s,a=>a.type==='raid'&&a.uid===card.uid&&a.line!=='energy'&&a.baseUid===base.uid);
 const top=s.players[raid.mha].front.find(c=>c?.cardId==='MHA-1-107');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-106');
 assert.equal(s.players[raid.mha].hand.length,hand);
 assert.equal(s.players[raid.mha].deck.length,deck-1);
});

test('MHA-1-108 adds green only for its own front, and IMC energy cannot pay a UA10ST card',()=>{
 const field=open(1209,true);
 const stage=seat(field.s,field.mha,'MHA-1-108','energy',0,true);
 assert.equal(universalEnergyByColor(field.packs,field.s,field.mha).green,1);
 seat(field.s,field.imc,'IMC-1-001','front',0,true);
 seat(field.s,field.imc,'IMC-1-007','front',1,true);
 seat(field.s,field.imc,'IMC-1-040','front',2,true);
 assert.equal(universalEnergyByColor(field.packs,field.s,field.mha).green,1);
 seat(field.s,field.mha,'MHA-1-036','front',0,true);
 assert.equal(universalEnergyByColor(field.packs,field.s,field.mha).green,1);
 seat(field.s,field.mha,'MHA-1-044','front',1,true);
 assert.equal(universalEnergyByColor(field.packs,field.s,field.mha).green,2);
 assert.equal(stage.cardId,'MHA-1-108');

 const cost=open(1210,true);
 const setAp=(ap)=>cost.s.players[cost.mha].apCards.forEach((card,index)=>{
  card.inPlay=index<ap;
  card.ready=index<ap;
 });
 setAp(2);
 seat(cost.s,cost.imc,'IMC-1-001','energy',0,true);
 seat(cost.s,cost.imc,'IMC-1-007','energy',1,true);
 const hero=pull(cost.s,cost.mha,'MHA-1-102');
 cost.s.players[cost.mha].hand.push(hero);
 assert.equal(legal(cost.packs,cost.s).some(a=>a.type==='play'&&a.uid===hero.uid),false);
 pay(cost.s,cost.mha,['MHA-1-041','MHA-1-041'],1);
 assert.equal(legal(cost.packs,cost.s).some(a=>a.type==='play'&&a.uid===hero.uid),false);
 setAp(2);
 assert.equal(legal(cost.packs,cost.s).some(a=>a.type==='play'&&a.uid===hero.uid&&a.line==='front'),true);
});

test('life triggers stay with the life owner and only offer the other title as a legal target',()=>{
 const active=open(1211,false);
 const idol=seat(active.s,active.imc,'IMC-1-007','front',0,true);
 const own=seat(active.s,active.mha,'MHA-1-103','front',0,true);
 const already=seat(active.s,active.mha,'MHA-1-036','energy',0,true);
 already.ready=true;
 reveal(active,active.mha,'MHA-1-101');
 active.s=reach(active.packs,active.s,active.imc,'attack');
 let s=swing(active,idol.uid,null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 assert.equal(s.pending.player,active.mha);
 const modes=legal(active.packs,s).filter(a=>a.type==='chooseTrigger');
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===own.uid));
 assert.ok(modes.some(a=>a.mode==='active'&&a.uid===already.uid));
 assert.equal(modes.some(a=>a.uid===idol.uid),false);
 s=act(active.packs,s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===already.uid);
 assert.equal(s.players[active.mha].energy[0].ready,true);
 assert.equal(universalBp(active.packs,s,s.players[active.mha].energy[0]),2000+3000);

 const special=open(1212,false);
 const attacker=seat(special.s,special.imc,'IMC-1-007','front',0,true);
 const front=seat(special.s,special.mha,'MHA-1-103','front',0,true);
 const back=seat(special.s,special.mha,'MHA-1-036','energy',0,true);
 reveal(special,special.mha,'MHA-1-063');
 special.s=reach(special.packs,special.s,special.imc,'attack');
 s=swing(special,attacker.uid,null);
 assert.equal(s.pending.trigger,'special');
 assert.equal(s.pending.player,special.mha);
 const shots=legal(special.packs,s).filter(a=>a.type==='chooseTrigger'&&a.mode==='special');
 assert.deepEqual(shots.map(a=>a.uid),[attacker.uid]);
 assert.equal(shots.some(a=>a.uid===front.uid||a.uid===back.uid),false);
 const kept=act(special.packs,structuredClone(s),a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(kept.players[special.imc].front[0].cardId,'IMC-1-007');
 s=act(special.packs,s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===attacker.uid);
 assert.equal(s.players[special.imc].front[0],null);
 assert.equal(s.players[special.mha].front[0].cardId,'MHA-1-103');

 const inbound=open(1213,true);
 const hero=seat(inbound.s,inbound.mha,'MHA-1-103','front',0,true);
 const idolFront=seat(inbound.s,inbound.imc,'IMC-1-007','front',0,true);
 const idolEnergy=seat(inbound.s,inbound.imc,'IMC-1-001','energy',0,true);
 reveal(inbound,inbound.imc,'IMC-1-109');
 inbound.s=reach(inbound.packs,inbound.s,inbound.mha,'attack');
 s=swing(inbound,hero.uid,null);
 assert.equal(s.pending.trigger,'special');
 assert.equal(s.pending.player,inbound.imc);
 const idolShots=legal(inbound.packs,s).filter(a=>a.mode==='special');
 assert.deepEqual(idolShots.map(a=>a.uid),[hero.uid]);
 assert.equal(idolShots.some(a=>a.uid===idolFront.uid||a.uid===idolEnergy.uid),false);
 s=act(inbound.packs,s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===hero.uid);
 assert.equal(s.players[inbound.mha].front[0],null);
 assert.equal(s.players[inbound.imc].front[0].cardId,'IMC-1-007');

 const color=open(1214,true);
 const hitter=seat(color.s,color.mha,'MHA-1-103','front',0,true);
 const other=seat(color.s,color.mha,'MHA-1-044','front',1,true);
 const hidden=seat(color.s,color.mha,'MHA-1-036','energy',0,true);
 reveal(color,color.imc,'IMC-1-014');
 color.s=reach(color.packs,color.s,color.mha,'attack');
 s=swing(color,hitter.uid,null);
 assert.equal(s.pending.trigger,'color');
 const rests=legal(color.packs,s).filter(a=>a.mode==='colorRestSkip');
 assert.ok(rests.some(a=>a.uid===hitter.uid));
 assert.ok(rests.some(a=>a.uid===other.uid));
 assert.equal(rests.some(a=>a.uid===hidden.uid),false);
 const declined=act(color.packs,structuredClone(s),a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(declined.players[color.mha].front[1].ready,true);
 s=act(color.packs,s,a=>a.type==='chooseTrigger'&&a.mode==='colorRestSkip'&&a.uid===other.uid);
 assert.equal(s.players[color.mha].front[1].ready,false);

 const got=open(1215,true);
 const hand=(()=>{
  const hitter=seat(got.s,got.mha,'MHA-1-103','front',0,true);
  reveal(got,got.imc,'IMC-1-040');
  got.s=reach(got.packs,got.s,got.mha,'attack');
  const before=got.s.players[got.imc].hand.length;
  const next=swing(got,hitter.uid,null);
  assert.equal(next.pending.trigger,'get');
  const taken=act(got.packs,next,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(taken.players[got.imc].hand.filter(c=>c.cardId==='IMC-1-040').length>=1,true);
  assert.equal(taken.players[got.imc].hand.length,before+1);
  assert.equal(taken.players[got.mha].hand.some(c=>c.cardId==='IMC-1-040'),false);
  return taken;
 })();
 assert.equal(hand.players[got.imc].outside.some(c=>c.cardId==='IMC-1-040'),false);

 const drawn=open(1216,false);
 const idolHitter=seat(drawn.s,drawn.imc,'IMC-1-007','front',0,true);
 reveal(drawn,drawn.mha,'MHA-1-109');
 drawn.s=reach(drawn.packs,drawn.s,drawn.imc,'attack');
 const before=drawn.s.players[drawn.mha].hand.length;
 s=swing(drawn,idolHitter.uid,null);
 assert.equal(s.pending.trigger,'draw');
 const drew=act(drawn.packs,s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(drew.players[drawn.mha].hand.length,before+1);
 const early=open(1217,false);
 seat(early.s,early.imc,'IMC-1-007','front',0,true);
 reveal(early,early.mha,'MHA-1-065');
 early.s=reach(early.packs,early.s,early.imc,'attack');
 s=swing(early,early.s.players[early.imc].front[0].uid,null);
 assert.equal(s.players[early.mha].life.length>0,true);
 assert.equal(legal(early.packs,s).some(a=>a.mode==='final'),false);
});
