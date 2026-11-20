import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TORIKO_CARDS} from '../dist/toriko-cards.mjs';
import {TORIKO_PR_CARDS} from '../dist/toriko-pr-cards.mjs';
import {createTrkV2Pack,TORIKO_ENGINE_IDS} from '../dist/universal-v2/trk-pack.mjs';
import {trkEngineKind} from '../dist/universal-v2/trk-classify.mjs';
import {parseGen,parseNeed} from '../scripts/fetch-trk-ua17.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {officialV2Pack,torikoPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {matchesPrintedRequiredEnergyAtLeast,matchesPrintedRequiredEnergyAtMost} from '../dist/universal-v2/ap-discounts.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,universalAttackDamage,universalBp,universalCardEnergy,universalImpact,universalPrivateChoices,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';

const pack=createTrkV2Pack();
const packs=[pack,pack];
const byId=new Map(TORIKO_CARDS.map(card=>[card.id,card]));
const BLUE=['TRK-1-037','TRK-1-038','TRK-1-040','TRK-1-041','TRK-1-043','TRK-1-044','TRK-1-050','TRK-1-052','TRK-1-055','TRK-1-058','TRK-1-061','TRK-1-101'];

function blueDeck(){
 const counts=Object.fromEntries(BLUE.map(id=>[id,4]));
 counts['TRK-1-102']=2;
 return counts;
}

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(card=>card.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
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

function fresh(deck,seed=17017){
 return newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
}

function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}

function playFront(s,uid){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='play'&&item.uid===uid&&item.line==='front');
 if(!action)throw Error('No front play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}

function raidOnto(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='raid'&&item.uid===uid&&item.baseUid===baseUid&&item.line!=='energy');
 if(!action)throw Error('No raid for '+uid+' onto '+baseUid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}

function layUnder(top,base){
 base.faceDown=false;
 top.stack=[base];
 return top;
}

function playEnergy(s,uid){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='play'&&item.uid===uid&&item.line==='energy');
 if(!action)throw Error('No energy play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}

function playEvent(s,uid){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='event'&&item.uid===uid);
 if(!action)throw Error('No event for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}

function nextOwnMain(s,player=0){
 const turn=s.turn;
 let guard=0;
 while(!(s.active===player&&s.phase==='main'&&s.turn!==turn)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the next own main');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach the next own main');
 }
 return s;
}

function choose(s,pred){
 const actor=s.pending?s.pending.player:0;
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice for '+(s.pending&&s.pending.kind));
 return dispatchUniversalAction(packs,s,action,{actor});
}

function fillDeck(required){
 const counts={...required};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 for(const id of TORIKO_ENGINE_IDS){
  if(total>=50)break;
  const have=counts[id]||0;
  const add=Math.min(4-have,50-total);
  if(add>0){counts[id]=have+add;total+=add;}
 }
 if(total!==50)throw Error('Deck filled to '+total);
 return counts;
}

test('UA17 Toriko catalogue is one identity per number and keeps the printed energy',()=>{
 assert.equal(TORIKO_CARDS.length,109);
 assert.equal(new Set(TORIKO_CARDS.map(card=>card.id)).size,109);
 assert.equal(TORIKO_CARDS.some(card=>/AP/i.test(card.id)||card.type==='ap'),false);
 assert.equal(TORIKO_CARDS.some(card=>/_p/.test(card.id)),false);
 const starter=['TRK-1-101','TRK-1-102','TRK-1-103','TRK-1-104','TRK-1-105','TRK-1-106','TRK-1-107','TRK-1-108','TRK-1-109'];
 for(const id of starter)assert.deepEqual(byId.get(id).sets,['UA17ST']);
 const reprint=byId.get('TRK-1-041');
 assert.deepEqual(reprint.sets,['UA17BT','UA17ST']);
 assert.deepEqual(reprint.printings.map(row=>row.number),['UA17BT/TRK-1-041','UA17ST/TRK-1-041']);
 const iron=byId.get('TRK-1-005');
 assert.equal(iron.gen,1);
 assert.equal(iron.genMark,'+');
 assert.equal(iron.energy,0);
 assert.equal(iron.color,'yellow');
 assert.deepEqual(iron.traits,['再生屋']);
 assert.equal(iron.engineKind,'printedEnergyRetire');
 assert.equal(iron.auto,false);
 assert.match(iron.effectJa,/このターン中、このキャラの発生エナジー\+【黄】。メインフェイズ終了時、このキャラを退場させる。/);
 assert.doesNotMatch(iron.effectJa,/を得る/);
 const parsed=parseGen('<img src="/images/cardlist/ico_resource_energy_yellow2.png" alt="黄+">');
 assert.equal(parsed.gen,1);
 assert.equal(parsed.genMark,'+');
 assert.equal(parsed.filenameNumber,2);
 assert.equal(parsed.filenameDisagrees,true);
 const need=parseNeed('<img src="/images/cardlist/ico_character_energy_yellow0.png" alt="黄-">');
 assert.equal(need.energy,0);
 assert.equal(need.color,'yellow');
 const slash=['美食會／副料理長','美食會／ボス','美食會／料理長','美食會／料理人'];
 const seen=new Set(TORIKO_CARDS.flatMap(card=>card.traits));
 for(const trait of slash)assert.equal(seen.has(trait),true);
 assert.equal(seen.has('副料理長')||seen.has('料理長')||seen.has('ボス'),false);
 assert.equal(TORIKO_CARDS.every(card=>card.auto===false&&!card.traitComponents),true);
 const sunny=byId.get('TRK-1-002');
 assert.equal(sunny.faq.some(entry=>entry.id==='Q796'),true);
 assert.equal(sunny.engineKind,'queenTax');
});

test('only a whole Japanese print joins the shared pack',()=>{
 for(const card of [...TORIKO_CARDS,...TORIKO_PR_CARDS])assert.equal(card.engineKind,trkEngineKind(card));
 assert.deepEqual(TORIKO_ENGINE_IDS,[...TORIKO_CARDS,...TORIKO_PR_CARDS].filter(card=>card.engineKind).map(card=>card.id));
 assert.equal(TORIKO_ENGINE_IDS.length,112);
 assert.deepEqual(TORIKO_PR_CARDS.map(card=>card.number),['UAPR/TRK-P-001','UAPR/TRK-P-002','UAPR/TRK-P-003']);
 assert.deepEqual(TORIKO_PR_CARDS.find(card=>card.id==='TRK-P-003').traits,['美食會／ボス']);
 assert.equal(pack.cards['TRK-P-001'].effects.onPlay[0].activeIfFrontHasAllNames.join(','),'トリコ,サニー,ゼブラ');
 assert.equal(pack.cards['TRK-P-002'].effects.onPlay[0].then[0].op,'inspectTopDistinctTraitAndName');
 assert.equal(pack.cards['TRK-P-003'].passiveBonuses[0].impact,1);
 assert.deepEqual(Object.keys(pack.cards).sort(),[...TORIKO_ENGINE_IDS].sort());
 assert.equal(pack.cards['TRK-1-013'].frontMustAttackIfName.name,'クイン');
 assert.equal(pack.cards['TRK-1-017'].attackWinHandRest.minBp,5000);
 assert.equal(pack.cards['TRK-1-054'].effects.onAttack[0].op,'bounceOppFrontHalfSelfBp');
 assert.equal(pack.cards['TRK-1-072'].raidTrait,'美食會');
 assert.equal(pack.cards['TRK-1-091'].oppEffectRetireInstead.trait,'寄生昆虫');
 assert.equal(byId.get('TRK-1-048').engineKind,'alsoTopKeep');
 assert.equal(pack.cards['TRK-1-005'].mainAbility.op,'restSelfGeneratedEnergyRetireEndMain');
 assert.equal(pack.cards['TRK-1-047'].mainAbility.op,'restSelfGeneratedEnergyRetireEndMain');
 assert.equal(pack.cards['TRK-1-082'].mainAbility.op,'restSelfGeneratedEnergyRetireEndMain');
 const source=readFileSync(new URL('../dist/universal-v2/trk-pack.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/op:\s*['"]trk['"]/);
 assert.doesNotMatch(source,/restSelfGainEnergyRetireEndMain/);
 assert.equal(JSON.stringify(pack).includes('"op":"trk"'),false);
 assert.equal(pack.cards['TRK-1-041'].printedImpact,1);
 assert.deepEqual(pack.cards['TRK-1-041'].effects,{});
 assert.deepEqual(pack.cards['TRK-1-075'].effects,{onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]});
 assert.deepEqual(pack.cards['TRK-1-003'].opponentFieldColorsHandEnergyDiscount,{colors:['blue','purple'],amount:1});
 assert.equal(V2_TITLE_IDS.includes('toriko'),false);
 const title=TITLES.find(row=>row.id==='toriko');
 assert.equal(title.label,'美食獵人');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,112);
 const practice=torikoPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((sum,n)=>sum+n,0),50);
 assert.equal(Object.keys(practice.counts).every(id=>pack.cards[id].color==='blue'),true);
 assert.deepEqual(Object.keys(officialV2Pack('toriko').cards).sort(),Object.keys(pack.cards).sort());
 const ready=editorV2Status('toriko',practice.counts,pack);
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.equal(ready.registered,112);
 const mixed={...practice.counts};
 const donor=Object.keys(mixed).find(id=>mixed[id]>=1);
 mixed[donor]-=1;
 mixed['TRK-1-013']=1;
 assert.equal(editorV2Status('toriko',mixed,pack).ready,true);
 const crowded={...practice.counts};
 const extra=Object.keys(crowded)[0];
 crowded[extra]=5;
 assert.equal(editorV2Status('toriko',crowded,pack).ready,false);
});

test('a vanilla character, a draw-and-discard, a hand discount and a full top window resolve on the shared engine',()=>{
 const deck=blueDeck();
 let vanilla=toPhase(fresh(deck,17040),'main');
 readyAp(vanilla);
 const plain=take(vanilla,0,'TRK-1-052');
 vanilla.players[0].hand.push(plain);
 vanilla=playFront(vanilla,plain.uid);
 assert.equal(vanilla.pending,null);
 assert.equal(vanilla.players[0].front.some(card=>card&&card.uid===plain.uid),true);

 let draw=toPhase(fresh(deck,17044),'main');
 readyAp(draw);
 const discarder=take(draw,0,'TRK-1-044');
 draw.players[0].hand.push(discarder);
 const before=draw.players[0].deck.length;
 draw=playFront(draw,discarder.uid);
 assert.equal(draw.players[0].deck.length,before-1);
 assert.equal(draw.pending.kind,'effect-discard');
 assert.equal(draw.pending.player,0);
 assert.equal(draw.players[0].hand.length>0,true);

 const mixed={...deck,'TRK-1-102':0,'TRK-1-003':1,'TRK-1-075':1};
 delete mixed['TRK-1-102'];
 const lookDeck={
  'TRK-1-037':4,'TRK-1-038':4,'TRK-1-040':4,'TRK-1-041':4,'TRK-1-043':4,
  'TRK-1-044':4,'TRK-1-050':4,'TRK-1-052':4,'TRK-1-055':2,'TRK-1-058':4,
  'TRK-1-061':2,'TRK-1-075':2,'TRK-1-078':4,'TRK-1-092':4
 };
 let discount=toPhase(fresh(mixed,17003),'main');
 const yellow=pack.cards['TRK-1-003'];
 assert.equal(zoneRequiredEnergy(pack,discount,0,yellow,'hand'),3);
 put(discount,1,'TRK-1-040','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,discount,0,yellow,'hand'),2);

 let look=toPhase(fresh(lookDeck,17075),'main');
 readyAp(look);
 for(let copy=0;copy<2;copy++){
  const energy=take(look,0,'TRK-1-078');
  look.players[0].hand.push(energy);
  const action=legalUniversalActions(packs,look).find(item=>item.type==='play'&&item.uid===energy.uid&&item.line==='energy');
  if(!action)throw Error('Purple energy was not playable');
  look=dispatchUniversalAction(packs,look,action,{actor:0});
  if(look.pending)throw Error('Energy play opened '+look.pending.kind);
 }
 const event=take(look,0,'TRK-1-061');
 const other=take(look,0,'TRK-1-052');
 look.players[0].deck.unshift(other,event);
 const keeper=take(look,0,'TRK-1-075');
 look.players[0].hand.push(keeper);
 look=playFront(look,keeper.uid);
 assert.equal(look.pending.kind,'effect-top-inspect-many');
 assert.deepEqual(look.pending.uids,[other.uid,event.uid]);
 const shown=look.pending.uids.map(uid=>{
  const physical=[...look.players[0].deck,...look.players[0].hand,...look.players[0].life].find(card=>card.uid===uid);
  return physical.cardId;
 });
 assert.deepEqual(shown,['TRK-1-052','TRK-1-061']);
});

test('new Toriko sentences resolve as shared state changes',()=>{
 const revealDeck=fillDeck({'TRK-1-008':2,'TRK-1-014':4,'TRK-1-035':1});
 let miss=toPhase(fresh(revealDeck,18008),'main');
 readyAp(miss);
 for(let slot=0;slot<3;slot++)put(miss,0,'TRK-1-014','energy',slot,true);
 const hidden=take(miss,0,'TRK-1-035');
 miss.players[0].deck.unshift(hidden);
 const revealer=take(miss,0,'TRK-1-008');
 miss.players[0].hand.push(revealer);
 miss=playFront(miss,revealer.uid);
 assert.equal(miss.pending,null);
 assert.equal(miss.players[0].deck[0].uid,hidden.uid);
 assert.equal(miss.publicReveals.some(entry=>entry.uid===hidden.uid),true);
 assert.equal(miss.players[0].hand.some(card=>card.uid===hidden.uid),false);

 let hit=toPhase(fresh(revealDeck,18009),'main');
 readyAp(hit);
 for(let slot=0;slot<3;slot++)put(hit,0,'TRK-1-014','energy',slot,true);
 const kings=take(hit,0,'TRK-1-014');
 hit.players[0].deck.unshift(kings);
 const revealer2=take(hit,0,'TRK-1-008');
 hit.players[0].hand.push(revealer2);
 hit=playFront(hit,revealer2.uid);
 assert.equal(hit.pending,null);
 assert.equal(hit.players[0].hand.some(card=>card.uid===kings.uid),true);
 assert.equal(hit.players[0].deck[0]?.uid===kings.uid,false);

 const restDeck=fillDeck({'TRK-1-049':2,'TRK-1-043':1,'TRK-1-052':1,'TRK-1-040':1});
 let absent=toPhase(fresh(restDeck,18049),'main');
 readyAp(absent);
 put(absent,0,'TRK-1-043','energy',0,true);
 put(absent,1,'TRK-1-040','front',0,true);
 const coco=take(absent,0,'TRK-1-049');
 absent.players[0].hand.push(coco);
 absent=playFront(absent,coco.uid);
 assert.equal(absent.pending,null);
 assert.equal(absent.players[1].front[0].ready,true);

 let present=toPhase(fresh(restDeck,18050),'main');
 readyAp(present);
 put(present,0,'TRK-1-052','energy',0,true);
 const victim=put(present,1,'TRK-1-040','front',0,true);
 const coco2=take(present,0,'TRK-1-049');
 present.players[0].hand.push(coco2);
 present=playFront(present,coco2.uid);
 assert.equal(present.pending.kind,'effect-rest-bp');
 assert.equal(present.pending.choices.includes(victim.uid),true);
 assert.equal(present.pending.optional,true);
 present=choose(present,action=>action.uid===null);
 assert.equal(present.pending,null);
 assert.equal(present.players[1].front[0].ready,true);

 const outsideDeck=fillDeck({'TRK-1-089':1});
 let outside=toPhase(fresh(outsideDeck,18089),'main');
 readyAp(outside);
 const parasite=take(outside,0,'TRK-1-089');
 outside.players[0].hand.push(parasite);
 const window=outside.players[0].deck.slice(0,5).map(card=>card.uid);
 outside=playFront(outside,parasite.uid);
 assert.equal(outside.pending.kind,'effect-top-order');
 assert.equal(outside.pending.rest,'bottom');
 assert.deepEqual(outside.pending.uids,window);

 const drawDeck=fillDeck({'TRK-1-109':1,'TRK-1-052':4});
 let drawn=toPhase(fresh(drawDeck,18109),'main');
 readyAp(drawn);
 for(let slot=0;slot<3;slot++)put(drawn,0,'TRK-1-052','energy',slot,true);
 const event=take(drawn,0,'TRK-1-109');
 drawn.players[0].hand.push(event);
 const before=drawn.players[0].deck.length;
 drawn=playEvent(drawn,event.uid);
 assert.equal(drawn.players[0].deck.length,before-4);
 assert.equal(drawn.pending.kind,'effect-discard');
 assert.equal(drawn.pending.player,0);

 const peek=pack.cards['TRK-1-035'];
 const kept=pack.cards['TRK-1-048'];
 let paying=toPhase(fresh(fillDeck({'TRK-1-035':1,'TRK-1-048':1,'TRK-1-052':4}),18035),'main');
 assert.equal(zoneRequiredEnergy(pack,paying,0,peek,'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,paying,0,kept,'hand'),3);
 assert.equal(matchesPrintedRequiredEnergyAtLeast(peek,5),true);
 assert.equal(matchesPrintedRequiredEnergyAtMost(peek,2),true);
 assert.equal(matchesPrintedRequiredEnergyAtLeast(kept,5),true);
 assert.equal(matchesPrintedRequiredEnergyExactOrPrinted(kept),true);
 readyAp(paying);
 const peeker=take(paying,0,'TRK-1-035');
 paying.players[0].hand.push(peeker);
 paying=playFront(paying,peeker.uid);
 assert.equal(paying.pending.kind,'private-top-place');

 const selfDeck=fillDeck({'TRK-1-085':1,'TRK-1-078':1});
 let buffed=toPhase(fresh(selfDeck,18085),'main');
 readyAp(buffed);
 const payer=take(buffed,0,'TRK-1-078');
 const self=take(buffed,0,'TRK-1-085');
 buffed.players[0].hand.push(payer,self);
 buffed=playFront(buffed,self.uid);
 buffed=choose(buffed,action=>action.type==='activate'&&action.uid===self.uid&&action.mode==='discardSelfBuff');
 assert.equal(buffed.pending.kind,'main-discard-buff');
 buffed=choose(buffed,action=>action.type==='chooseMainDiscard'&&action.uid===payer.uid);
 assert.equal(buffed.players[0].outside.some(card=>card.uid===payer.uid),true);
 assert.equal(buffed.players[0].front.find(card=>card.uid===self.uid).buffs.some(row=>row.bp===1000),true);

 let returned=toPhase(fresh(fillDeck({'TRK-1-074':1}),18074),'main');
 readyAp(returned);
 const home=take(returned,0,'TRK-1-074');
 returned.players[0].hand.push(home);
 returned=playFront(returned,home.uid);
 returned=nextOwnMain(returned);
 returned=choose(returned,action=>action.type==='activate'&&action.mode==='restBuffReturn'&&action.uid===home.uid);
 assert.equal(returned.pending,null);
 assert.equal(returned.players[0].hand.some(card=>card.uid===home.uid),true);
 assert.equal(returned.players[0].front.some(card=>card&&card.uid===home.uid),false);

 const gateDeck=fillDeck({'TRK-1-096':2,'TRK-1-078':4});
 let declined=toPhase(fresh(gateDeck,18096),'main');
 readyAp(declined);
 for(let slot=0;slot<3;slot++)put(declined,0,'TRK-1-078','energy',slot,true);
 const spare=take(declined,0,'TRK-1-078');
 declined.players[0].hand.push(spare);
 const foeHand=declined.players[1].hand.length;
 const gate=take(declined,0,'TRK-1-096');
 declined.players[0].hand.push(gate);
 declined=playFront(declined,gate.uid);
 assert.equal(declined.pending.kind,'effect-discard-gate');
 declined=choose(declined,action=>action.uid===null);
 assert.equal(declined.pending,null);
 assert.equal(declined.players[1].hand.length,foeHand);
 assert.equal(declined.players[0].hand.some(card=>card.uid===spare.uid),true);

 const foodDeck=fillDeck({'TRK-1-104':1,'TRK-1-066':1,'TRK-1-052':4,'TRK-1-040':1});
 let food=toPhase(fresh(foodDeck,18104),'main');
 readyAp(food);
 for(let slot=0;slot<4;slot++)put(food,0,'TRK-1-052','energy',slot,true);
 const ingredient=take(food,0,'TRK-1-066');
 const other=take(food,0,'TRK-1-040');
 food.players[0].outside.push(ingredient,other);
 const chef=take(food,0,'TRK-1-104');
 food.players[0].hand.push(chef);
 food=playFront(food,chef.uid);
 assert.equal(food.pending.kind,'effect-recover-outside');
 assert.equal(food.pending.choices.includes(ingredient.uid),true);
 assert.equal(food.pending.choices.includes(other.uid),false);
 food=choose(food,action=>action.uid===ingredient.uid);
 assert.equal(food.players[0].hand.some(card=>card.uid===ingredient.uid),true);

 const lockDeck=fillDeck({'TRK-1-070':1,'TRK-1-078':4,'TRK-1-040':1});
 let locked=toPhase(fresh(lockDeck,18070),'main');
 readyAp(locked);
 for(let slot=0;slot<4;slot++)put(locked,0,'TRK-1-078','energy',slot,true);
 const moving=put(locked,1,'TRK-1-040','front',0,true);
 const lock=take(locked,0,'TRK-1-070');
 locked.players[0].hand.push(lock);
 locked=playFront(locked,lock.uid);
 assert.equal(locked.pending.kind,'effect-lock-move');
 assert.equal(locked.pending.choices.includes(moving.uid),true);
 locked=choose(locked,action=>action.uid===moving.uid);
 assert.equal(locked.continuousStates.some(row=>row.kind==='cannotMove'&&row.targetUid===moving.uid&&!row.consumed),true);

 const searchDeck=fillDeck({'TRK-1-105':1,'TRK-1-066':1,'TRK-1-052':4});
 let searched=toPhase(fresh(searchDeck,18105),'main');
 readyAp(searched);
 for(let slot=0;slot<2;slot++)put(searched,0,'TRK-1-052','energy',slot,true);
 const seeker=take(searched,0,'TRK-1-105');
 const eligible=take(searched,0,'TRK-1-066');
 const ineligible=searched.players[0].deck.filter(card=>!pack.cards[card.cardId].traits.includes('食材')).slice(0,4);
 searched.players[0].deck=searched.players[0].deck.filter(card=>!ineligible.includes(card));
 searched.players[0].deck.unshift(eligible,...ineligible);
 searched.players[0].hand.push(seeker);
 searched=playFront(searched,seeker.uid);
 assert.equal(searched.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(searched.pending.uids,[eligible,...ineligible].map(card=>card.uid));
 assert.equal(searched.pending.choices.includes(eligible.uid),true);
 assert.equal(ineligible.some(card=>searched.pending.choices.includes(card.uid)),false);

 const quietDeck=fillDeck({'TRK-1-066':1,'TRK-1-044':4});
 let quiet=toPhase(fresh(quietDeck,18066),'main');
 readyAp(quiet);
 for(let slot=0;slot<3;slot++)put(quiet,0,'TRK-1-044','energy',slot,true);
 quiet.players[0].apCards[0].ready=false;
 const quietEvent=take(quiet,0,'TRK-1-066');
 quiet.players[0].hand.push(quietEvent);
 quiet=playEvent(quiet,quietEvent.uid);
 assert.equal(quiet.pending.kind,'effect-buff-own');
 quiet=choose(quiet,action=>action.uid===null);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].apCards[0].ready,false);

 const namedDeck=fillDeck({'TRK-1-066':1,'TRK-1-044':4,'TRK-1-043':1});
 let named=toPhase(fresh(namedDeck,18067),'main');
 readyAp(named);
 for(let slot=0;slot<3;slot++)put(named,0,'TRK-1-044','energy',slot,true);
 put(named,0,'TRK-1-043','front',0,true);
 named.players[0].apCards[0].ready=false;
 const namedEvent=take(named,0,'TRK-1-066');
 named.players[0].hand.push(namedEvent);
 named=playEvent(named,namedEvent.uid);
 assert.equal(named.pending.kind,'effect-buff-own');
 named=choose(named,action=>action.uid===null);
 assert.equal(named.pending.kind,'effect-recover-ap');
 named=choose(named,action=>action.uid===named.players[0].apCards[0].uid);
 assert.equal(named.players[0].apCards[0].ready,true);

 let attacker=toPhase(fresh(fillDeck({'TRK-1-014':1,'TRK-1-055':1}),18014),'main');
 readyAp(attacker);
 const striker=take(attacker,0,'TRK-1-014');
 attacker.players[0].hand.push(striker);
 const ally=take(attacker,0,'TRK-1-055');
 ally.ready=true;
 attacker.players[0].energy[0]=ally;
 attacker=playFront(attacker,striker.uid);
 attacker=nextOwnMain(attacker);
 attacker=toPhase(attacker,'attack');
 attacker=choose(attacker,action=>action.type==='attack'&&action.uid===striker.uid);
 assert.equal(attacker.pending.kind,'effect-buff-own');
 assert.equal(attacker.pending.bp,500);
 assert.equal(attacker.pending.choices.includes(ally.uid),true);
 assert.equal(attacker.pending.choices.includes(striker.uid),false);
});

function seat(s,p,id,line,slot,ready=true){
 const card=put(s,p,id,line,slot,ready);
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 return card;
}

function pass(s,player,phase){
 const started=s.turn+':'+s.active+':'+s.phase;
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&s.turn+':'+s.active+':'+s.phase!==started)){
  if(s.pending?.kind==='end-hand-limit')s=choose(s,action=>action.type==='chooseHandLimit');
  else if(s.pending)throw Error('Pass blocked by '+s.pending.kind);
  else s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>40)throw Error('Did not reach player '+player+' '+phase);
 }
 return s;
}

function live(s,card){
 const uid=card.uid;
 for(const side of s.players)for(const zone of ['front','energy','hand','deck','outside','removed','life']){
  const found=(side[zone]||[]).find(entry=>entry&&entry.uid===uid);
  if(found)return found;
 }
 throw Error('Lost '+uid);
}

function frontPlays(s,uid){
 return legalUniversalActions(packs,s).filter(action=>action.type==='play'&&action.uid===uid&&action.line==='front');
}

test('twenty more Toriko prints resolve as shared state changes',()=>{
 const yellow=fillDeck({'TRK-1-004':2,'TRK-1-006':4,'TRK-1-010':4,'TRK-1-012':2,'TRK-1-014':4,'TRK-1-016':2,'TRK-1-018':4,'TRK-1-020':2,'TRK-1-027':2,'TRK-1-029':2,'TRK-1-030':2,'TRK-1-031':2,'TRK-1-032':2,'TRK-1-033':2,'TRK-1-053':1});
 let discount=toPhase(fresh(yellow,19004),'main');
 readyAp(discount,0,1);
 for(const [id,slot] of [['TRK-1-010',1],['TRK-1-014',2],['TRK-1-018',3]])
  put(discount,0,id,'energy',slot,true);
 const terry=take(discount,0,'TRK-1-004');
 discount.players[0].hand.push(terry);
 const torikoEnergy=put(discount,0,'TRK-1-020','energy',0,true);
 assert.equal(frontPlays(discount,terry.uid).length,0);
 discount.players[0].energy[0]=null;
 discount.players[0].front[0]=torikoEnergy;
 torikoEnergy.fieldEntryStamp=discount.nextFieldEntryStamp++;
 put(discount,0,'TRK-1-006','energy',0,true);
 assert.equal(discount.players[0].energy.some(card=>card&&card.uid===torikoEnergy.uid),false);
 assert.equal(frontPlays(discount,terry.uid).length>0,true);
 discount=playFront(discount,terry.uid);
 const playedTerry=discount.players[0].front.find(card=>card&&card.uid===terry.uid);
 assert.equal(universalImpact(pack,discount,playedTerry),1);

 let aura=toPhase(fresh(yellow,19012),'main');
 const sunny=seat(aura,0,'TRK-1-012','front',0,true);
 assert.equal(universalBp(pack,aura,sunny),3500);
 seat(aura,0,'TRK-1-018','front',1,true);
 seat(aura,0,'TRK-1-006','front',2,true);
 seat(aura,0,'TRK-1-014','energy',0,true);
 assert.equal(universalBp(pack,aura,sunny),4000);
 seat(aura,0,'TRK-1-014','front',3,true);
 const foe=seat(aura,1,'TRK-1-010','front',0,true);
 aura=pass(aura,1,'attack');
 aura=dispatchUniversalAction(packs,aura,{type:'attack',uid:foe.uid},{actor:1});
 assert.equal(aura.pending.kind,'block');
 aura=choose(aura,action=>action.type==='chooseBlock'&&action.uid===sunny.uid);
 assert.equal(live(aura,sunny).ready,true);

 let zebra=toPhase(fresh(yellow,19016),'main');
 const zebraCard=seat(zebra,0,'TRK-1-016','front',0,true);
 seat(zebra,0,'TRK-1-018','energy',0,true);
 seat(zebra,0,'TRK-1-006','energy',1,true);
 seat(zebra,0,'TRK-1-010','energy',2,true);
 assert.equal(universalBp(pack,zebra,zebraCard),4000);
 assert.equal(universalAttackDamage(pack,zebra,zebraCard),1);
 seat(zebra,0,'TRK-1-018','front',1,true);
 seat(zebra,0,'TRK-1-006','front',2,true);
 seat(zebra,0,'TRK-1-010','front',3,true);
 assert.equal(universalAttackDamage(pack,zebra,zebraCard),2);
 zebra=pass(zebra,1,'main');
 assert.equal(universalBp(pack,zebra,live(zebra,zebraCard)),3000);
 assert.equal(universalAttackDamage(pack,zebra,live(zebra,zebraCard)),1);

 let step=toPhase(fresh(yellow,19020),'main');
 const stepped=seat(step,0,'TRK-1-020','front',0,true);
 assert.equal(pack.cards['TRK-1-020'].step,true);
 assert.equal(universalBp(pack,step,stepped),3000);
 seat(step,0,'TRK-1-004','front',1,true);
 assert.equal(universalBp(pack,step,stepped),4000);

 let rest=toPhase(fresh(yellow,19027),'main');
 readyAp(rest,0,1);
 for(let slot=0;slot<3;slot++)put(rest,0,'TRK-1-006','energy',slot,true);
 const rested=seat(rest,1,'TRK-1-014','front',0,true);
 const shot=take(rest,0,'TRK-1-027');
 rest.players[0].hand.push(shot);
 const beforeRest=rest.players[0].deck.length;
 rest=playEvent(rest,shot.uid);
 assert.equal(rest.pending.kind,'effect-rest-bp');
 assert.equal(rest.pending.optional,false);
 assert.equal(rest.pending.skipNextActive,false);
 assert.equal(legalUniversalActions(packs,rest).some(action=>action.uid===null),false);
 rest=choose(rest,action=>action.uid===rested.uid);
 assert.equal(live(rest,rested).ready,false);
 assert.equal(rest.continuousStates.some(entry=>entry.kind==='skipNextActive'&&entry.targetUid===rested.uid),false);
 assert.equal(rest.players[0].deck.length,beforeRest);

 let sunnyRest=toPhase(fresh(yellow,19028),'main');
 readyAp(sunnyRest,0,1);
 for(let slot=0;slot<3;slot++)put(sunnyRest,0,'TRK-1-006','energy',slot,true);
 seat(sunnyRest,0,'TRK-1-010','front',0,true);
 const rested2=seat(sunnyRest,1,'TRK-1-014','front',0,true);
 const shot2=take(sunnyRest,0,'TRK-1-027');
 sunnyRest.players[0].hand.push(shot2);
 const beforeSunny=sunnyRest.players[0].deck.length;
 sunnyRest=playEvent(sunnyRest,shot2.uid);
 assert.equal(sunnyRest.pending.skipNextActive,true);
 sunnyRest=choose(sunnyRest,action=>action.uid===rested2.uid);
 assert.equal(sunnyRest.continuousStates.some(entry=>entry.kind==='skipNextActive'&&entry.targetUid===rested2.uid),true);
 assert.equal(sunnyRest.players[0].deck.length,beforeSunny-1);

 let retire=toPhase(fresh(yellow,19029),'main');
 readyAp(retire,0,1);
 for(let slot=0;slot<3;slot++)put(retire,0,'TRK-1-010','energy',slot,true);
 const low=seat(retire,1,'TRK-1-014','front',0,true);
 const spear=take(retire,0,'TRK-1-029');
 retire.players[0].hand.push(spear);
 retire=playEvent(retire,spear.uid);
 retire=choose(retire,action=>action.type==='chooseRetireBp'&&action.uid===low.uid);
 assert.equal(retire.pending,null);
 assert.equal(retire.players[1].front[0],null);

 let cocoRetire=toPhase(fresh(yellow,19030),'main');
 readyAp(cocoRetire,0,1);
 for(let slot=0;slot<3;slot++)put(cocoRetire,0,'TRK-1-010','energy',slot,true);
 seat(cocoRetire,0,'TRK-1-006','front',0,true);
 const low2=seat(cocoRetire,1,'TRK-1-014','front',0,true);
 const spear2=take(cocoRetire,0,'TRK-1-029');
 cocoRetire.players[0].hand.push(spear2);
 cocoRetire=playEvent(cocoRetire,spear2.uid);
 cocoRetire=choose(cocoRetire,action=>action.uid===low2.uid);
 assert.equal(cocoRetire.players[0].apCards[0].ready,false);
 assert.equal(cocoRetire.pending.kind,'effect-recover-ap');
 cocoRetire=choose(cocoRetire,action=>action.uid===cocoRetire.players[0].apCards[0].uid||action.index===0);
 assert.equal(cocoRetire.players[0].apCards[0].ready,true);

 let duration=toPhase(fresh(yellow,19031),'main');
 readyAp(duration,0,1);
 for(let slot=0;slot<3;slot++)put(duration,0,'TRK-1-018','energy',slot,true);
 const named=seat(duration,0,'TRK-1-010','front',0,true);
 const other=seat(duration,0,'TRK-1-014','front',1,true);
 const meat=take(duration,0,'TRK-1-030');
 duration.players[0].hand.push(meat);
 const beforeMeat=duration.players[0].deck.length;
 duration=playEvent(duration,meat.uid);
 duration=choose(duration,action=>action.uid===named.uid);
 assert.equal(live(duration,named).buffs.some(buff=>buff.bp===1000&&buff.untilOwnTurnStart===duration.players[0].ownTurns+1),true);
 assert.equal(duration.players[0].deck.length,beforeMeat-1);
 const meat2=take(duration,0,'TRK-1-030');
 duration.players[0].hand.push(meat2);
 readyAp(duration,0,1);
 duration=playEvent(duration,meat2.uid);
 duration=choose(duration,action=>action.uid===other.uid);
 assert.equal(live(duration,other).buffs.some(buff=>buff.bp===1000&&buff.untilTurn===duration.turn),true);
 assert.equal(live(duration,other).buffs.some(buff=>buff.untilOwnTurnStart),false);

 let garlic=toPhase(fresh(yellow,19032),'main');
 readyAp(garlic,0,1);
 for(let slot=0;slot<3;slot++)put(garlic,0,'TRK-1-018','energy',slot,true);
 const cocoBody=seat(garlic,0,'TRK-1-006','front',0,true);
 const plainBody=seat(garlic,0,'TRK-1-014','front',1,true);
 const clove=take(garlic,0,'TRK-1-031');
 garlic.players[0].hand.push(clove);
 const beforeClove=garlic.players[0].deck.length;
 garlic=playEvent(garlic,clove.uid);
 garlic=choose(garlic,action=>action.uid===cocoBody.uid);
 assert.equal(live(garlic,cocoBody).attackDamagePlus.amount,1);
 assert.equal(garlic.players[0].deck.length,beforeClove-1);
 const clove2=take(garlic,0,'TRK-1-031');
 garlic.players[0].hand.push(clove2);
 readyAp(garlic,0,1);
 const beforePlain=garlic.players[0].deck.length;
 garlic=playEvent(garlic,clove2.uid);
 garlic=choose(garlic,action=>action.uid===plainBody.uid);
 assert.equal(live(garlic,plainBody).attackDamagePlus,undefined);
 assert.equal(garlic.players[0].deck.length,beforePlain-1);

 let cola=toPhase(fresh(yellow,19033),'main');
 readyAp(cola,0,1);
 for(let slot=0;slot<3;slot++)put(cola,0,'TRK-1-018','energy',slot,true);
 const zebraBody=seat(cola,0,'TRK-1-014','front',0,true);
 const colaCard=take(cola,0,'TRK-1-032');
 cola.players[0].hand.push(colaCard);
 const beforeCola=cola.players[0].deck.length;
 cola=playEvent(cola,colaCard.uid);
 cola=choose(cola,action=>action.uid===zebraBody.uid);
 assert.equal(cola.players[0].deck.length,beforeCola-2);
 const cola2=take(cola,0,'TRK-1-032');
 cola.players[0].hand.push(cola2);
 readyAp(cola,0,1);
 const otherBody=seat(cola,0,'TRK-1-006','front',1,true);
 const beforeOther=cola.players[0].deck.length;
 cola=playEvent(cola,cola2.uid);
 cola=choose(cola,action=>action.uid===otherBody.uid);
 assert.equal(cola.players[0].deck.length,beforeOther-1);

 let medicine=toPhase(fresh(yellow,19034),'main');
 readyAp(medicine,0,1);
 put(medicine,0,'TRK-1-006','energy',0,true);
 put(medicine,0,'TRK-1-010','energy',1,true);
 const guarded=seat(medicine,0,'TRK-1-014','front',0,true);
 const cake=take(medicine,0,'TRK-1-033');
 medicine.players[0].hand.push(cake);
 const beforeCake=medicine.players[0].deck.length;
 medicine=playEvent(medicine,cake.uid);
 assert.equal(medicine.players[0].deck.length,beforeCake-1);
 assert.equal(live(medicine,guarded).bpDownImmuneUntil.untilOwnTurnStart,medicine.players[0].ownTurns+1);
 live(medicine,guarded).buffs=[{bp:-1000,untilTurn:medicine.turn}];
 assert.equal(universalBp(pack,medicine,live(medicine,guarded)),2000);
 medicine=pass(medicine,0,'main');
 live(medicine,guarded).buffs=[{bp:-1000,untilTurn:medicine.turn}];
 assert.equal(universalBp(pack,medicine,live(medicine,guarded)),1000);

 const blue=fillDeck({'TRK-1-035':4,'TRK-1-039':2,'TRK-1-043':4,'TRK-1-045':2,'TRK-1-046':2,'TRK-1-048':4,'TRK-1-052':4,'TRK-1-053':2,'TRK-1-055':2,'TRK-1-062':2,'TRK-1-065':2});
 let summed=toPhase(fresh(blue,19039),'main');
 const mer=seat(summed,0,'TRK-1-039','front',0,true);
 seat(summed,0,'TRK-1-035','energy',0,true);
 assert.equal(universalBp(pack,summed,mer),3000);
 seat(summed,0,'TRK-1-048','energy',1,true);
 assert.equal(universalBp(pack,summed,mer),4000);
 summed=pass(summed,1,'main');
 assert.equal(universalBp(pack,summed,live(summed,mer)),3000);

 let komatsu=toPhase(fresh(blue,19045),'main');
 readyAp(komatsu,0,1);
 put(komatsu,0,'TRK-1-052','energy',0,true);
 put(komatsu,0,'TRK-1-052','energy',1,true);
 const ally=seat(komatsu,0,'TRK-1-052','front',0,true);
 const chef=take(komatsu,0,'TRK-1-045');
 komatsu.players[0].hand.push(chef);
 komatsu=playFront(komatsu,chef.uid);
 komatsu=choose(komatsu,action=>action.uid===ally.uid);
 assert.equal(live(komatsu,ally).buffs.some(buff=>buff.bp===1000&&buff.untilTurn===komatsu.turn),true);
 let withKomatsu=toPhase(fresh(blue,19046),'main');
 readyAp(withKomatsu,0,1);
 put(withKomatsu,0,'TRK-1-052','energy',0,true);
 put(withKomatsu,0,'TRK-1-052','energy',1,true);
 seat(withKomatsu,0,'TRK-1-055','front',1,true);
 const ally2=seat(withKomatsu,0,'TRK-1-052','front',0,true);
 const chef2=take(withKomatsu,0,'TRK-1-045');
 withKomatsu.players[0].hand.push(chef2);
 withKomatsu=playFront(withKomatsu,chef2.uid);
 withKomatsu=choose(withKomatsu,action=>action.uid===ally2.uid);
 assert.equal(live(withKomatsu,ally2).buffs.some(buff=>buff.bp===2000&&buff.untilTurn===withKomatsu.turn),true);

 let attacker=toPhase(fresh(blue,19047),'main');
 const mansam=seat(attacker,0,'TRK-1-046','front',0,true);
 seat(attacker,0,'TRK-1-035','energy',0,true);
 seat(attacker,0,'TRK-1-039','energy',1,true);
 attacker=pass(attacker,0,'attack');
 const beforeShort=attacker.players[0].deck.length;
 attacker=dispatchUniversalAction(packs,attacker,{type:'attack',uid:mansam.uid});
 assert.equal(attacker.players[0].deck.length,beforeShort);
 let enough=toPhase(fresh(blue,19048),'main');
 const mansam2=seat(enough,0,'TRK-1-046','front',0,true);
 seat(enough,0,'TRK-1-035','energy',0,true);
 seat(enough,0,'TRK-1-039','energy',1,true);
 seat(enough,0,'TRK-1-048','energy',2,true);
 seat(enough,0,'TRK-1-035','front',1,true);
 enough=pass(enough,0,'attack');
 const beforeLong=enough.players[0].deck.length;
 enough=dispatchUniversalAction(packs,enough,{type:'attack',uid:mansam2.uid});
 assert.equal(enough.players[0].deck.length,beforeLong-1);

 let impact=toPhase(fresh(yellow,19053),'main');
 readyAp(impact,0,1);
 for(let slot=0;slot<3;slot++)put(impact,0,'TRK-1-018','energy',slot,true);
 const king=seat(impact,0,'TRK-1-053','front',0,true);
 seat(impact,0,'TRK-1-014','front',1,true);
 assert.equal(universalImpact(pack,impact,king),0);
 const ingredient=take(impact,0,'TRK-1-030');
 impact.players[0].hand.push(ingredient);
 impact=playEvent(impact,ingredient.uid);
 assert.equal(universalImpact(pack,impact,live(impact,king)),1);
 impact=choose(impact,action=>action.uid===king.uid);
 impact=pass(impact,1,'main');
 assert.equal(universalImpact(pack,impact,live(impact,king)),0);

 let nail=toPhase(fresh(blue,19062),'main');
 readyAp(nail,0,1);
 for(let slot=0;slot<4;slot++)put(nail,0,'TRK-1-043','energy',slot,true);
 const bounced=seat(nail,1,'TRK-1-055','front',0,true);
 const punch=take(nail,0,'TRK-1-062');
 nail.players[0].hand.push(punch);
 nail=playEvent(nail,punch.uid);
 assert.equal(nail.pending.kind,'effect-bounce-bp');
 assert.equal(nail.pending.optional,false);
 assert.equal(legalUniversalActions(packs,nail).some(action=>action.uid===null),false);
 nail=choose(nail,action=>action.uid===bounced.uid);
 assert.equal(nail.players[1].hand.some(card=>card.uid===bounced.uid),true);
 let nailed=toPhase(fresh(blue,19063),'main');
 readyAp(nailed,0,1);
 for(let slot=0;slot<4;slot++)put(nailed,0,'TRK-1-043','energy',slot,true);
 seat(nailed,0,'TRK-1-052','front',0,true);
 const retired=seat(nailed,1,'TRK-1-055','front',0,true);
 const punch2=take(nailed,0,'TRK-1-062');
 nailed.players[0].hand.push(punch2);
 nailed=playEvent(nailed,punch2.uid);
 assert.equal(nailed.pending.kind,'effect-retire-bp');
 nailed=choose(nailed,action=>action.uid===retired.uid);
 assert.equal(nailed.players[1].outside.some(card=>card.uid===retired.uid),true);

 let fruit=toPhase(fresh(blue,19065),'main');
 readyAp(fruit,0,1);
 for(let slot=0;slot<3;slot++)put(fruit,0,'TRK-1-052','energy',slot,true);
 const front=seat(fruit,0,'TRK-1-052','front',0,true);
 const fruitCard=take(fruit,0,'TRK-1-065');
 fruit.players[0].hand.push(fruitCard);
 const beforeFruit=fruit.players[0].deck.length;
 fruit=playEvent(fruit,fruitCard.uid);
 fruit=choose(fruit,action=>action.uid===front.uid);
 assert.equal(live(fruit,front).buffs.some(buff=>buff.bp===1000&&buff.untilTurn===fruit.turn),true);
 assert.equal(live(fruit,front).impactPlus.amount,1);
 assert.equal(fruit.players[0].deck.length,beforeFruit);
 let fruited=toPhase(fresh(blue,19066),'main');
 readyAp(fruited,0,1);
 for(let slot=0;slot<3;slot++)put(fruited,0,'TRK-1-052','energy',slot,true);
 const front2=seat(fruited,0,'TRK-1-052','front',0,true);
 seat(fruited,0,'TRK-1-055','energy',3,true);
 const fruit2=take(fruited,0,'TRK-1-065');
 fruited.players[0].hand.push(fruit2);
 const beforeFruit2=fruited.players[0].deck.length;
 fruited=playEvent(fruited,fruit2.uid);
 fruited=choose(fruited,action=>action.uid===front2.uid);
 assert.equal(fruited.players[0].deck.length,beforeFruit2-1);

 const purple=fillDeck({'TRK-1-071':2,'TRK-1-078':4,'TRK-1-085':2,'TRK-1-089':1,'TRK-1-090':2,'TRK-1-099':2,'TRK-1-100':2,'TRK-1-014':4,'TRK-1-004':2});
 let alpha=toPhase(fresh(purple,19071),'main');
 const host=seat(alpha,0,'TRK-1-071','energy',0,true);
 seat(alpha,1,'TRK-1-014','front',0,true);
 const payment=take(alpha,0,'TRK-1-078');
 alpha.players[0].deck.push(...alpha.players[0].hand);
 alpha.players[0].hand=[payment];
 assert.equal(legalUniversalActions(packs,alpha).some(action=>action.type==='activate'&&action.uid===host.uid),false);
 alpha.players[0].energy[0]=null;
 alpha.players[0].front[0]=host;
 host.fieldEntryStamp=alpha.nextFieldEntryStamp++;
 alpha.players[0].deck.push(payment);
 alpha.players[0].hand=[];
 assert.equal(legalUniversalActions(packs,alpha).some(action=>action.type==='activate'&&action.uid===host.uid),false);
 alpha.players[0].deck.splice(alpha.players[0].deck.findIndex(card=>card.uid===payment.uid),1);
 alpha.players[0].hand=[payment];
 const victim=alpha.players[1].front[0];
 const beforeDown=universalBp(pack,alpha,live(alpha,victim));
 alpha=dispatchUniversalAction(packs,alpha,legalUniversalActions(packs,alpha).find(action=>action.type==='activate'&&action.uid===host.uid));
 assert.equal(alpha.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(packs,alpha).some(action=>action.uid===null),false);
 alpha=choose(alpha,action=>action.uid===payment.uid);
 assert.equal(alpha.pending.kind,'effect-target');
 alpha=choose(alpha,action=>action.uid===victim.uid);
 assert.equal(universalBp(pack,alpha,live(alpha,victim)),beforeDown-1000);

 let rod=toPhase(fresh(purple,19090),'main');
 readyAp(rod,0,1);
 for(let slot=0;slot<3;slot++)put(rod,0,'TRK-1-078','energy',slot,true);
 const bystander=seat(rod,0,'TRK-1-078','front',0,true);
 const tommy=take(rod,0,'TRK-1-090');
 rod.players[0].hand.push(tommy);
 rod=playFront(rod,tommy.uid);
 assert.equal(rod.pending.kind,'effect-grant-impact');
 assert.equal(rod.pending.choices.includes(tommy.uid),true);
 assert.equal(rod.pending.choices.includes(bystander.uid),false);
 rod=choose(rod,action=>action.uid===tommy.uid);
 assert.equal(live(rod,tommy).impactGranted.plus,true);
 assert.equal(universalImpact(pack,rod,live(rod,tommy)),1);

 let knife=toPhase(fresh(purple,19099),'main');
 readyAp(knife,0,1);
 for(let slot=0;slot<4;slot++)put(knife,0,'TRK-1-078','energy',slot,true);
 const high=seat(knife,1,'TRK-1-004','front',0,true);
 const knifeCard=take(knife,0,'TRK-1-099');
 knife.players[0].hand.push(knifeCard);
 knife=playEvent(knife,knifeCard.uid);
 assert.equal(knife.pending===null||knife.pending.choices.includes(high.uid)===false,true);
 let starred=toPhase(fresh(purple,19100),'main');
 readyAp(starred,0,1);
 for(let slot=0;slot<4;slot++)put(starred,0,'TRK-1-078','energy',slot,true);
 seat(starred,0,'TRK-1-085','front',0,true);
 const high2=seat(starred,1,'TRK-1-004','front',0,true);
 const knife2=take(starred,0,'TRK-1-099');
 starred.players[0].hand.push(knife2);
 starred=playEvent(starred,knife2.uid);
 assert.equal(starred.pending.kind,'effect-retire-bp');
 assert.equal(starred.pending.limit>=5000,true);
 assert.equal(starred.pending.choices.includes(high2.uid),true);

 let guild=toPhase(fresh(purple,19101),'main');
 readyAp(guild,0,1);
 for(let slot=0;slot<4;slot++)put(guild,0,'TRK-1-078','energy',slot,true);
 const high3=seat(guild,1,'TRK-1-004','front',0,true);
 const extras=[0,1,2,3].map(()=>take(guild,0,'TRK-1-014'));
 const guildCard=take(guild,0,'TRK-1-100');
 guild.players[0].deck.push(...guild.players[0].hand);
 guild.players[0].hand=[guildCard,...extras];
 guild=playEvent(guild,guildCard.uid);
 assert.equal(guild.pending===null||guild.pending.choices.includes(high3.uid)===false,true);
 let small=toPhase(fresh(purple,19102),'main');
 readyAp(small,0,1);
 for(let slot=0;slot<4;slot++)put(small,0,'TRK-1-078','energy',slot,true);
 const high4=seat(small,1,'TRK-1-004','front',0,true);
 const few=[0,1,2].map(()=>take(small,0,'TRK-1-014'));
 const guild2=take(small,0,'TRK-1-100');
 small.players[0].deck.push(...small.players[0].hand);
 small.players[0].hand=[guild2,...few];
 small=playEvent(small,guild2.uid);
 assert.equal(small.pending.choices.includes(high4.uid),true);
});

function act(s,uid,mode){
 return choose(s,item=>item.type==='activate'&&item.uid===uid&&(mode===undefined||item.mode===mode));
}

test('the next thirty Toriko prints change shared state',()=>{
 assert.equal(pack.cards['TRK-1-057'].triggerEffect.op,'bounceOppFrontUnderBp');
 assert.equal(pack.cards['TRK-1-059'].triggerEffect.bp,3500);
 assert.equal(pack.cards['TRK-1-009'].staticBp,500);
 assert.equal(pack.cards['TRK-1-009'].raidName,'ココ');
 assert.equal(pack.cards['TRK-1-009'].bpDownImmune,true);
 assert.equal(pack.cards['TRK-1-080'].printedAttackDamage,2);
 assert.equal(pack.cards['TRK-1-094'].printedAttackDamage,2);
 assert.equal(pack.cards['TRK-1-051'].alsoRequiredEnergy,5);
 assert.equal(pack.cards['TRK-1-067'].retireToRemoved,true);
 assert.equal(pack.cards['TRK-1-064'].effects.onPlay.filter(e=>e.op==='deployOwnHandRestOrRaid').length,2);
 assert.deepEqual(pack.cards['TRK-1-026'].effects.onPlay[0].bonusNames,['トリコ','ココ','サニー','ゼブラ']);
 assert.equal(pack.cards['TRK-1-026'].effects.onPlay[0].bonusAll,true);

 let energy=toPhase(fresh(fillDeck({'TRK-1-005':1,'TRK-1-047':1,'TRK-1-082':1}),30005),'main');
 const iron=put(energy,0,'TRK-1-005','energy',0,true);
 const before=universalCardEnergy(pack,energy,0,iron);
 energy=act(energy,iron.uid,'selfRestEnergyRetire');
 const rested=energy.players[0].energy.find(c=>c?.uid===iron.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalCardEnergy(pack,energy,0,rested),before+1);
 assert.equal(energy.delayedEffects.some(e=>e.op==='retireAtMainEnd'&&e.sourceUid===iron.uid),true);
 energy=dispatchUniversalAction(packs,energy,{type:'next'});
 assert.equal(energy.players[0].energy[0],null);
 assert.equal(energy.players[0].outside.some(c=>c.uid===iron.uid),true);

 let kiss=toPhase(fresh(fillDeck({'TRK-1-001':1,'TRK-1-006':1,'TRK-1-004':1}),30001),'main');
 const kissCard=put(kiss,0,'TRK-1-001','front',0,true);
 put(kiss,0,'TRK-1-006','front',1,true);
 const victim=put(kiss,1,'TRK-1-004','front',0,true);
 const victimBp=universalBp(pack,kiss,victim);
 kiss=act(kiss,kissCard.uid,'frontOnce');
 kiss=choose(kiss,item=>item.uid===victim.uid);
 const cut=kiss.players[1].front.find(c=>c?.uid===victim.uid);
 assert.equal(universalBp(pack,kiss,cut),victimBp-1000);
 kiss=toPhase(fresh(fillDeck({'TRK-1-001':1}),30011),'main');
 const bare=put(kiss,0,'TRK-1-001','front',0,true);
 assert.equal(legalUniversalActions(packs,kiss).some(item=>item.type==='activate'&&item.uid===bare.uid),false);

 let tax=toPhase(fresh(fillDeck({'TRK-1-002':2,'TRK-1-010':1,'TRK-1-005':4}),30002),'main');
 readyAp(tax,0,6);
 for(let slot=0;slot<4;slot++)put(tax,0,'TRK-1-005','energy',slot,true);
 const sunny=put(tax,0,'TRK-1-010','front',0,true);
 const queen=take(tax,0,'TRK-1-002');
 tax.players[0].hand.push(queen);
 tax=playFront(tax,queen.uid);
 tax=choose(tax,item=>item.uid===sunny.uid);
 const taxed=tax.players[0].front.find(c=>c?.uid===sunny.uid);
 assert.equal(taxed.selectHandTaxUntil.count,1);
 const queen2=take(tax,0,'TRK-1-002');
 tax.players[0].hand.push(queen2);
 tax=playFront(tax,queen2.uid);
 tax=choose(tax,item=>item.uid===sunny.uid);
 assert.equal(tax.players[0].front.find(c=>c?.uid===sunny.uid).selectHandTaxUntil.count,2);

 let coco=toPhase(fresh(fillDeck({'TRK-1-009':1,'TRK-1-010':1}),30009),'main');
 const cocoCard=put(coco,0,'TRK-1-009','front',0,true);
 assert.equal(universalBp(pack,coco,cocoCard),pack.cards['TRK-1-009'].bp);
 cocoCard.buffs=[{bp:-1000,untilTurn:coco.turn}];
 assert.equal(universalBp(pack,coco,cocoCard),pack.cards['TRK-1-009'].bp);
 layUnder(cocoCard,take(coco,0,'TRK-1-010'));
 assert.equal(universalBp(pack,coco,cocoCard),pack.cards['TRK-1-009'].bp+500);

 let kings=toPhase(fresh(fillDeck({'TRK-1-021':1,'TRK-1-006':1,'TRK-1-010':1,'TRK-1-014':1}),30021),'main');
 put(kings,0,'TRK-1-006','front',0,true);
 put(kings,0,'TRK-1-010','front',1,true);
 put(kings,0,'TRK-1-014','front',2,true);
 put(kings,0,'TRK-1-021','front',3,true);
 assert.equal(universalImpact(pack,kings,kings.players[0].front[3]),1);

 let wake=toPhase(fresh(fillDeck({'TRK-1-036':1,'TRK-1-042':1,'TRK-1-080':1,'TRK-1-009':1,'TRK-1-021':1,'TRK-1-059':1}),30036),'main');
 put(wake,0,'TRK-1-042','front',0,true);
 put(wake,0,'TRK-1-080','energy',0,true);
 put(wake,0,'TRK-1-009','energy',1,true);
 put(wake,0,'TRK-1-021','energy',2,true);
 const ichiryu=take(wake,0,'TRK-1-036');
 wake.players[0].hand.push(ichiryu);
 assert.equal(zoneRequiredEnergy(pack,wake,0,pack.cards['TRK-1-036'],'hand'),5);
 const setsuno=take(wake,0,'TRK-1-059');
 wake.players[0].hand.push(setsuno);
 assert.equal(zoneRequiredEnergy(pack,wake,0,pack.cards['TRK-1-059'],'hand'),5);
 const dragon=put(wake,0,'TRK-1-036','front',1,true);
 assert.equal(dragon.ready,true);
 assert.equal(pack.cards['TRK-1-036'].enterAlwaysActive,true);

 let sole=toPhase(fresh(fillDeck({'TRK-1-094':1}),30094),'main');
 const mitora=take(sole,0,'TRK-1-094');
 sole.players[0].deck.push(...sole.players[0].hand);
 sole.players[0].hand=[mitora];
 assert.equal(zoneRequiredEnergy(pack,sole,0,pack.cards['TRK-1-094'],'hand'),5);
 sole.players[0].hand.push(sole.players[0].deck.pop());
 assert.equal(zoneRequiredEnergy(pack,sole,0,pack.cards['TRK-1-094'],'hand'),12);

 let parasite=toPhase(fresh(fillDeck({'TRK-1-068':2,'TRK-1-067':2}),30068),'main');
 const giant=put(parasite,0,'TRK-1-068','front',0,true);
 assert.equal(universalBp(pack,parasite,parasite.players[0].front[0]),pack.cards['TRK-1-068'].bp);
 parasite.players[0].outside.push(take(parasite,0,'TRK-1-067'),take(parasite,0,'TRK-1-067'));
 parasite.players[0].removed.push(take(parasite,0,'TRK-1-068'));
 assert.equal(universalBp(pack,parasite,parasite.players[0].front[0]),pack.cards['TRK-1-068'].bp+500);

 let removed=toPhase(fresh(fillDeck({'TRK-1-067':1,'TRK-1-026':1,'TRK-1-005':4}),30067),'main');
 readyAp(removed,0,3);
 for(let slot=0;slot<4;slot++)put(removed,0,'TRK-1-005','energy',slot,true);
 const mite=put(removed,1,'TRK-1-067','front',0,true);
 const feast=take(removed,0,'TRK-1-026');
 removed.players[0].hand.push(feast);
 removed=playEvent(removed,feast.uid);
 assert.equal(removed.pending.kind,'effect-retire-bp');
 assert.equal(removed.pending.choices.includes(mite.uid),true);
 removed=choose(removed,item=>item.uid===mite.uid);
 assert.equal(removed.players[1].removed.some(c=>c.uid===mite.uid),true);
 assert.equal(removed.players[1].outside.some(c=>c.uid===mite.uid),false);

 let punch=toPhase(fresh(fillDeck({'TRK-1-028':1,'TRK-1-014':1,'TRK-1-004':1,'TRK-1-005':4}),30028),'main');
 readyAp(punch,0,3);
 for(let slot=0;slot<4;slot++)put(punch,0,'TRK-1-005','energy',slot,true);
 const zebra=put(punch,0,'TRK-1-014','front',0,true);
 put(punch,1,'TRK-1-004','front',0,true);
 const zebraBp=universalBp(pack,punch,zebra);
 const beat=take(punch,0,'TRK-1-028');
 punch.players[0].hand.push(beat);
 const handBefore=punch.players[0].hand.length;
 punch=playEvent(punch,beat.uid);
 punch=choose(punch,item=>item.uid===zebra.uid);
 assert.equal(universalBp(pack,punch,punch.players[0].front.find(c=>c?.uid===zebra.uid)),zebraBp+2000);
 assert.equal(punch.pending.kind,'effect-must-block-grant');
 punch=choose(punch,item=>item.uid===null);
 assert.equal(punch.players[1].front[0].forcedBlockThisTurn,undefined);
 assert.equal(punch.players[0].hand.length,handBefore);

 let look=toPhase(fresh(fillDeck({'TRK-1-106':2,'TRK-1-037':4,'TRK-1-109':1,'TRK-1-052':4}),30106),'main');
 readyAp(look,0,2);
 for(let slot=0;slot<4;slot++)put(look,0,'TRK-1-037','energy',slot,true);
 const torikoBase=put(look,0,'TRK-1-052','front',0,true);
 const ingredient=take(look,0,'TRK-1-109');
 const filler=[];
 const zones=['deck','hand','life','outside'];
 while(filler.length<6){
  let found=null;
  for(const zone of zones){
   const pile=look.players[0][zone];
   const index=pile.findIndex(c=>pack.cards[c.cardId]&&c.cardId!=='TRK-1-109'&&c.cardId!=='TRK-1-106'&&!(pack.cards[c.cardId].traits||[]).includes('食材'));
   if(index>=0){found=pile.splice(index,1)[0];break;}
  }
  if(!found)throw Error('Need six non-ingredient cards for the look window');
  filler.push(found);
 }
 const window=[filler[0],ingredient,...filler.slice(1)];
 look.players[0].deck.unshift(...window);
 const plain=take(look,0,'TRK-1-106');
 look.players[0].hand.push(plain);
 look=playFront(look,plain.uid);
 assert.equal(look.pending,null);
 const starter=take(look,0,'TRK-1-106');
 look.players[0].hand.push(starter);
 look=raidOnto(look,starter.uid,torikoBase.uid);
 assert.equal(look.pending.kind,'effect-top-trait-outside');
 assert.equal(look.pending.uids.length,7);
 assert.equal(look.pending.choices.length,1);
 assert.equal(look.pending.to,'hand');
 look=choose(look,item=>item.uid===ingredient.uid);
 assert.equal(look.players[0].hand.some(c=>c.uid===ingredient.uid),true);
 assert.equal(look.pending.kind,'effect-top-order');
 assert.equal(look.pending.uids.length,6);
});

test('the remaining Toriko prints pay, ban, recover, wake and look',()=>{
 for(const id of ['TRK-1-005','TRK-1-047','TRK-1-082'])
  assert.equal(pack.cards[id].mainAbility.op,'restSelfGeneratedEnergyRetireEndMain');

 let tax=toPhase(fresh(fillDeck({'TRK-1-034':1,'TRK-1-037':2,'TRK-1-052':1}),30234),'main');
 readyAp(tax,0,2);
 put(tax,0,'TRK-1-037','energy',0,true);
 const ally=put(tax,0,'TRK-1-052','front',0,false);
 const aimaru=take(tax,0,'TRK-1-034');
 tax.players[0].hand.push(aimaru);
 tax=playFront(tax,aimaru.uid);
 assert.equal(tax.pending.kind,'effect-other-ap-tax');
 assert.equal(tax.pending.choices.some(c=>c.uid===aimaru.uid),false);
 tax=choose(tax,item=>item.uid===ally.uid);
 assert.equal(tax.continuousStates.some(e=>e.kind==='selectionApTax'&&e.targetUid===ally.uid),true);

 let ban=toPhase(fresh(fillDeck({'TRK-1-042':1,'TRK-1-036':1,'TRK-1-080':1,'TRK-1-037':4,'TRK-1-014':1,'TRK-1-052':1}),30242),'main');
 readyAp(ban,0,2);
 for(let slot=0;slot<4;slot++)put(ban,0,'TRK-1-037','energy',slot,true);
 put(ban,0,'TRK-1-036','front',0,true);
 put(ban,0,'TRK-1-080','front',1,true);
 const victim=put(ban,1,'TRK-1-014','front',0,true);
 const spare=take(ban,0,'TRK-1-052');
 const jiro=take(ban,0,'TRK-1-042');
 ban.players[0].hand.push(spare,jiro);
 assert.equal(zoneRequiredEnergy(pack,ban,0,pack.cards['TRK-1-042'],'hand'),5);
 ban=playFront(ban,jiro.uid);
 assert.equal(ban.pending.kind,'effect-discard-gate');
 ban=choose(ban,item=>item.uid===spare.uid);
 assert.equal(ban.pending.kind,'effect-front-ban');
 ban=choose(ban,item=>item.uid===victim.uid);
 assert.equal(ban.continuousStates.some(e=>e.kind==='cannotAttack'&&e.targetUid===victim.uid),true);
 assert.equal(ban.continuousStates.some(e=>e.kind==='cannotBlock'&&e.targetUid===victim.uid),true);

 let recover=toPhase(fresh(fillDeck({'TRK-1-051':1,'TRK-1-036':1,'TRK-1-037':4,'TRK-1-080':1,'TRK-1-052':1}),30251),'main');
 readyAp(recover,0,2);
 for(let slot=0;slot<4;slot++)put(recover,0,'TRK-1-037','energy',slot,true);
 put(recover,0,'TRK-1-036','front',0,true);
 const buried=take(recover,0,'TRK-1-080');
 recover.players[0].outside.push(buried);
 const payment=take(recover,0,'TRK-1-052');
 const yosaku=take(recover,0,'TRK-1-051');
 recover.players[0].hand.push(payment,yosaku);
 recover=playFront(recover,yosaku.uid);
 assert.equal(recover.pending.kind,'effect-sum-recover');
 recover=choose(recover,item=>item.uid===payment.uid);
 assert.equal(recover.pending.step,'recover');
 recover=choose(recover,item=>item.uid===buried.uid);
 assert.equal(recover.players[0].hand.some(c=>c.uid===buried.uid),true);

 let wake=toPhase(fresh(fillDeck({'TRK-1-057':1,'TRK-1-005':2,'TRK-1-033':1}),30257),'main');
 readyAp(wake,0,2);
 const cook=put(wake,0,'TRK-1-057','energy',0,true);
 put(wake,0,'TRK-1-005','energy',1,true);
 put(wake,0,'TRK-1-005','energy',2,true);
 assert.equal(legalUniversalActions(packs,wake).some(a=>a.mode==='energyWake'),false);
 const meat=take(wake,0,'TRK-1-033');
 wake.players[0].hand.push(meat);
 wake=playEvent(wake,meat.uid);
 if(wake.pending)wake=choose(wake,item=>item.uid===null);
 assert.equal(wake.pending,null);
 wake=act(wake,cook.uid,'energyWake');
 const woke=wake.players[0].energy.find(c=>c?.uid===cook.uid);
 assert.equal(woke.ready,true);
 assert.equal(wake.mainAbilityUsedUids.includes(cook.uid+'|energyWake'),true);

 let spice=toPhase(fresh(fillDeck({'TRK-1-060':1,'TRK-1-037':2,'TRK-1-052':1}),30260),'main');
 readyAp(spice,0,2);
 put(spice,0,'TRK-1-037','energy',0,true);
 const spicePay=take(spice,0,'TRK-1-052');
 const spices=take(spice,0,'TRK-1-060');
 spice.players[0].hand.push(spicePay,spices);
 spice=playEnergy(spice,spices.uid);
 assert.equal(spice.players[0].energy.some(c=>c?.uid===spices.uid&&c.ready),true);
 spice=act(spice,spices.uid,'restTraitAp');
 assert.equal(spice.pending.kind,'effect-discard-gate');
 spice=choose(spice,item=>item.uid===spicePay.uid);
 assert.equal(spice.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&e.filter.trait==='食材'),true);
 assert.equal(legalUniversalActions(packs,spice).some(a=>a.mode==='restTraitAp'),false);

 let knock=toPhase(fresh(fillDeck({'TRK-1-063':1,'TRK-1-037':4,'TRK-1-041':1,'TRK-1-014':1}),30263),'main');
 readyAp(knock,0,2);
 for(let slot=0;slot<4;slot++)put(knock,0,'TRK-1-037','energy',slot,true);
 put(knock,0,'TRK-1-041','front',0,true);
 const blocked=put(knock,1,'TRK-1-014','front',0,true);
 const knocking=take(knock,0,'TRK-1-063');
 knock.players[0].hand.push(knocking);
 const knockHand=knock.players[0].hand.length;
 knock=playEvent(knock,knocking.uid);
 assert.equal(knock.pending.kind,'effect-front-ban');
 knock=choose(knock,item=>item.uid===blocked.uid);
 assert.equal(knock.continuousStates.some(e=>e.kind==='cannotAttack'&&e.targetUid===blocked.uid),true);
 assert.equal(knock.players[0].hand.length,knockHand);

 let ozone=toPhase(fresh(fillDeck({'TRK-1-064':1,'TRK-1-037':4,'TRK-1-052':1,'TRK-1-055':1}),30264),'main');
 readyAp(ozone,0,3);
 for(let slot=0;slot<4;slot++)put(ozone,0,'TRK-1-037','energy',slot,true);
 const toriko=take(ozone,0,'TRK-1-052');
 const komatsu=take(ozone,0,'TRK-1-055');
 const grass=take(ozone,0,'TRK-1-064');
 ozone.players[0].hand.push(toriko,komatsu,grass);
 const deckBefore=ozone.players[0].deck.length;
 ozone=playEvent(ozone,grass.uid);
 assert.equal(ozone.players[0].deck.length,deckBefore-2);
 assert.equal(ozone.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(ozone.pending.choices.includes(toriko.uid),true);
 ozone=choose(ozone,item=>item.uid===null);
 assert.equal(ozone.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(ozone.pending.choices.includes(komatsu.uid),true);

 let emperor=toPhase(fresh(fillDeck({'TRK-1-069':1,'TRK-1-067':2,'TRK-1-068':1,'TRK-1-078':2,'TRK-1-014':1}),30269),'main');
 readyAp(emperor,0,2);
 put(emperor,0,'TRK-1-078','energy',0,true);
 put(emperor,0,'TRK-1-078','energy',1,true);
 put(emperor,1,'TRK-1-014','front',0,true);
 emperor.players[0].removed.push(take(emperor,0,'TRK-1-067'),take(emperor,0,'TRK-1-067'),take(emperor,0,'TRK-1-068'));
 const bug=take(emperor,0,'TRK-1-069');
 emperor.players[0].hand.push(bug);
 emperor=playFront(emperor,bug.uid);
 assert.equal(emperor.pending,null);
 assert.equal(emperor.players[0].front.some(c=>c?.uid===bug.uid),true);

 let purple=toPhase(fresh(fillDeck({'TRK-1-080':1,'TRK-1-085':1,'TRK-1-094':1,'TRK-1-093':4}),30280),'main');
 readyAp(purple,0,2);
 for(let slot=0;slot<4;slot++)put(purple,0,'TRK-1-093','energy',slot,true);
 const retiring=put(purple,1,'TRK-1-080','front',0,true);
 const recruit=take(purple,1,'TRK-1-085');
 purple.players[1].outside.push(recruit);
 const mitora=take(purple,0,'TRK-1-094');
 purple.players[0].deck.push(...purple.players[0].hand);
 purple.players[0].hand=[mitora];
 assert.equal(zoneRequiredEnergy(pack,purple,0,pack.cards['TRK-1-094'],'hand'),5);
 purple=playFront(purple,mitora.uid);
 assert.equal(purple.pending.kind,'effect-retire-bp');
 purple=choose(purple,item=>item.uid===retiring.uid);
 assert.equal(purple.players[1].outside.some(c=>c.uid===retiring.uid),true);
 assert.equal(purple.pending.kind,'effect-deploy-active-front');
 assert.equal(purple.pending.player,1);
 purple=choose(purple,item=>item.uid===recruit.uid&&item.slot===1);
 assert.equal(purple.players[1].front[1]?.uid,recruit.uid);
 assert.equal(purple.players[1].front[1].ready,true);

 let raid=toPhase(fresh(fillDeck({'TRK-1-081':2,'TRK-1-078':1,'TRK-1-093':4}),30281),'main');
 readyAp(raid,0,2);
 for(let slot=0;slot<3;slot++)put(raid,0,'TRK-1-093','energy',slot,true);
 const raidAlly=put(raid,0,'TRK-1-093','front',1,false);
 const sleeper=put(raid,0,'TRK-1-078','front',0,false);
 const plainRaider=take(raid,0,'TRK-1-081');
 raid.players[0].hand.push(plainRaider);
 raid=playFront(raid,plainRaider.uid);
 assert.equal(raid.pending,null);
 const raider=take(raid,0,'TRK-1-081');
 raid.players[0].hand.push(raider);
 raid=raidOnto(raid,raider.uid,sleeper.uid);
 assert.equal(raid.pending.kind,'effect-active-character');
 assert.equal(raid.pending.choices.includes(raider.uid),false);
 raid=choose(raid,item=>item.uid===raidAlly.uid);
 assert.equal(raid.players[0].front.find(c=>c?.uid===raidAlly.uid).ready,true);

 let grin=toPhase(fresh(fillDeck({'TRK-1-084':1,'TRK-1-078':1,'TRK-1-093':4,'TRK-1-052':4}),30284),'main');
 readyAp(grin,0,2);
 for(let slot=0;slot<4;slot++)put(grin,0,'TRK-1-093','energy',slot,true);
 const low=put(grin,1,'TRK-1-078','energy',0,true);
 for(let slot=1;slot<4;slot++)put(grin,1,'TRK-1-052','front',slot,true);
 const grinPay=take(grin,0,'TRK-1-052');
 const grinCard=take(grin,0,'TRK-1-084');
 grin.players[0].hand.push(grinPay,grinCard);
 grin=playFront(grin,grinCard.uid);
 assert.equal(grin.pending.kind,'effect-low-gen-front');
 grin=choose(grin,item=>item.uid===grinPay.uid);
 if(grin.pending?.step==='pick')grin=choose(grin,item=>item.uid===low.uid);
 assert.equal(grin.players[1].front[0]?.uid,low.uid);
 assert.equal(grin.players[1].energy[0],null);

 let star=toPhase(fresh(fillDeck({'TRK-1-088':2,'TRK-1-085':1,'TRK-1-093':4,'TRK-1-014':1,'TRK-1-052':1}),30288),'main');
 readyAp(star,0,2);
 for(let slot=0;slot<4;slot++)put(star,0,'TRK-1-093','energy',slot,true);
 const starBase=put(star,0,'TRK-1-085','front',0,true);
 const small=put(star,1,'TRK-1-014','front',0,true);
 const starPay=take(star,0,'TRK-1-052');
 const plainStar=take(star,0,'TRK-1-088');
 star.players[0].hand.push(starPay,plainStar);
 star=playFront(star,plainStar.uid);
 assert.equal(star.pending,null);
 const starjun=take(star,0,'TRK-1-088');
 star.players[0].hand.push(starjun);
 star=raidOnto(star,starjun.uid,starBase.uid);
 assert.equal(star.pending.kind,'effect-discard-gate');
 star=choose(star,item=>item.uid===starPay.uid);
 assert.equal(star.pending.kind,'effect-retire-bp');
 star=choose(star,item=>item.uid===small.uid);
 assert.equal(star.players[1].outside.some(c=>c.uid===small.uid),true);

 let hq=toPhase(fresh(fillDeck({'TRK-1-097':1,'TRK-1-074':1,'TRK-1-078':2,'TRK-1-052':2}),30297),'main');
 readyAp(hq,0,2);
 put(hq,0,'TRK-1-078','energy',0,true);
 put(hq,0,'TRK-1-078','energy',1,true);
 const guild=put(hq,0,'TRK-1-074','front',0,true);
 const payA=take(hq,0,'TRK-1-052');
 const payB=take(hq,0,'TRK-1-052');
 const hall=take(hq,0,'TRK-1-097');
 hq.players[0].hand.push(payA,payB,hall);
 hq=playEnergy(hq,hall.uid);
 hq=act(hq,hall.uid,'restAttackDraw');
 hq=choose(hq,item=>item.uid===payA.uid);
 hq=choose(hq,item=>item.uid===guild.uid);
 assert.equal(hq.players[0].front[0].attackDrawStack.count,1);
 hq.players[0].energy.find(c=>c?.uid===hall.uid).ready=true;
 hq=act(hq,hall.uid,'restAttackDraw');
 hq=choose(hq,item=>item.uid===payB.uid);
 hq=choose(hq,item=>item.uid===guild.uid);
 assert.equal(hq.players[0].front[0].attackDrawStack.count,2);

 let starter=toPhase(fresh(fillDeck({'TRK-1-107':1,'TRK-1-052':1,'TRK-1-037':2,'TRK-1-065':1}),30307),'main');
 readyAp(starter,0,2);
 put(starter,0,'TRK-1-037','energy',0,true);
 put(starter,0,'TRK-1-037','energy',1,true);
 put(starter,0,'TRK-1-052','front',0,true);
 const starterCook=take(starter,0,'TRK-1-107');
 const fruit=take(starter,0,'TRK-1-065');
 starter.players[0].hand.push(starterCook,fruit);
 starter=playFront(starter,starterCook.uid);
 assert.equal(starter.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&e.filter.trait==='食材'),true);
 readyAp(starter,0,0);
 assert.equal(legalUniversalActions(packs,starter).some(a=>a.type==='event'&&a.uid===fruit.uid),true);
 starter=playEvent(starter,fruit.uid);
 if(starter.pending)starter=choose(starter,item=>item.uid===null);
 assert.equal(starter.pending,null);
 starter.players[0].front.find(c=>c?.uid===starterCook.uid).ready=true;
 starter=act(starter,starterCook.uid,'restTraitDraw');
 assert.equal(starter.players[0].front.find(c=>c?.uid===starterCook.uid).ready,false);
 assert.equal(starter.pending.kind,'effect-discard');

 let window=toPhase(fresh(fillDeck({'TRK-1-108':1,'TRK-1-037':2,'TRK-1-109':1,'TRK-1-052':4}),30308),'main');
 readyAp(window,0,2);
 put(window,0,'TRK-1-037','energy',0,true);
 put(window,0,'TRK-1-037','energy',1,true);
 const soup=take(window,0,'TRK-1-109');
 const filler=[];
 while(filler.length<6){
  let found=null;
  for(const zone of ['deck','hand','life','outside']){
   const pile=window.players[0][zone];
   const index=pile.findIndex(c=>pack.cards[c.cardId]&&c.cardId!=='TRK-1-109'&&c.cardId!=='TRK-1-108'&&c.cardId!=='TRK-1-037');
   if(index>=0){found=pile.splice(index,1)[0];break;}
  }
  if(!found)throw Error('Need six filler cards for the showcase window');
  filler.push(found);
 }
 window.players[0].deck.unshift(filler[0],soup,...filler.slice(1));
 const showcase=take(window,0,'TRK-1-108');
 window.players[0].hand.push(showcase);
 window=playEnergy(window,showcase.uid);
 assert.equal(window.pending.kind,'effect-top-trait-outside');
 assert.equal(window.pending.uids.length,7);
 assert.equal(window.pending.choices.length,1);
 assert.equal(window.pending.to==='hand',false);
 window=choose(window,item=>item.uid===soup.uid);
 assert.equal(window.players[0].outside.some(c=>c.uid===soup.uid),true);
 assert.equal(window.pending.kind,'effect-top-order');
 assert.equal(window.pending.uids.length,6);
});

test('the last five Toriko prints change shared state',()=>{
 const deck=fillDeck({'TRK-1-002':1,'TRK-1-006':1,'TRK-1-013':1,'TRK-1-014':2,'TRK-1-017':1,
  'TRK-1-020':1,'TRK-1-033':1,'TRK-1-054':1,'TRK-1-068':1,'TRK-1-072':1,'TRK-1-090':4,'TRK-1-091':1,'TRK-1-094':1});
 let sunny=toPhase(fresh(deck,19013),'main');
 const sunnyCard=seat(sunny,0,'TRK-1-013','front',0,true);
 layUnder(sunnyCard,take(sunny,0,'TRK-1-006'));
 seat(sunny,0,'TRK-1-002','front',1,true);
 const small=seat(sunny,1,'TRK-1-014','front',0,true);
 sunny=toPhase(sunny,'attack');
 const beforeDraw=sunny.players[0].hand.length;
 sunny=dispatchUniversalAction(packs,sunny,{type:'attack',uid:sunnyCard.uid},{actor:0});
 assert.equal(sunny.pending.kind,'block');
 sunny=choose(sunny,action=>action.type==='chooseBlock'&&action.uid===small.uid);
 assert.equal(sunny.players[0].hand.length,beforeDraw+1);
 assert.equal(sunny.players[1].front.some(card=>card&&card.uid===small.uid),false);
 sunny=pass(sunny,1,'attack');
 const hunter=seat(sunny,1,'TRK-1-014','front',0,true);
 assert.equal(legalUniversalActions(packs,sunny).some(action=>action.type==='next'),false);
 hunter.ready=false;
 assert.equal(legalUniversalActions(packs,sunny).some(action=>action.type==='next'),true);

 let zebra=toPhase(fresh(deck,19017),'main');
 const zebraCard=seat(zebra,0,'TRK-1-017','front',0,true);
 assert.equal(universalAttackDamage(pack,zebra,zebraCard),1);
 layUnder(zebraCard,take(zebra,0,'TRK-1-090'));
 assert.equal(universalAttackDamage(pack,zebra,zebraCard),2);
 zebra=act(zebra,zebraCard.uid,'onceBuffField');
 assert.equal(zebra.pending.kind,'effect-buff-own');
 assert.equal(zebra.pending.choices.includes(zebraCard.uid),true);
 zebra=choose(zebra,action=>action.uid===zebraCard.uid);
 assert.equal(universalBp(pack,zebra,live(zebra,zebraCard)),5000);
 const blocker=seat(zebra,1,'TRK-1-014','front',0,true);
 const restTarget=seat(zebra,1,'TRK-1-014','front',1,true);
 const spare=take(zebra,0,'TRK-1-006');
 zebra.players[0].hand.push(spare);
 zebra=toPhase(zebra,'attack');
 zebra=dispatchUniversalAction(packs,zebra,{type:'attack',uid:zebraCard.uid},{actor:0});
 zebra=choose(zebra,action=>action.type==='chooseBlock'&&action.uid===blocker.uid);
 assert.equal(zebra.pending.kind,'effect-attack-win-pay');
 zebra=choose(zebra,action=>action.uid===spare.uid);
 assert.equal(zebra.players[0].outside.some(card=>card.uid===spare.uid),true);
 assert.equal(zebra.pending.kind,'effect-attack-win-rest');
 zebra=choose(zebra,action=>action.uid===restTarget.uid);
 assert.equal(live(zebra,restTarget).ready,false);

 let half=toPhase(fresh(deck,19054),'main');
 readyAp(half);
 seat(half,0,'TRK-1-020','energy',0,true);
 const ingredient=take(half,0,'TRK-1-033');
 half.players[0].hand.push(ingredient);
 half=playEvent(half,ingredient.uid);
 const toriko=seat(half,0,'TRK-1-054','front',0,true);
 toriko.buffs=[{bp:4000,untilTurn:half.turn}];
 assert.equal(universalAttackDamage(pack,half,toriko),1);
 layUnder(toriko,take(half,0,'TRK-1-006'));
 assert.equal(universalAttackDamage(pack,half,toriko),2);
 toriko.buffs=[];
 assert.equal(universalAttackDamage(pack,half,toriko),1);
 toriko.buffs=[{bp:4000,untilTurn:half.turn}];
 const low=seat(half,1,'TRK-1-014','front',0,true);
 const high=seat(half,1,'TRK-1-094','front',1,true);
 half=toPhase(half,'attack');
 half=dispatchUniversalAction(packs,half,{type:'attack',uid:toriko.uid},{actor:0});
 assert.equal(half.pending.kind,'effect-bounce-bp');
 assert.equal(half.pending.choices.includes(low.uid),true);
 assert.equal(half.pending.choices.includes(high.uid),false);
 half=choose(half,action=>action.uid===null);

 let robot=toPhase(fresh(deck,19072),'main');
 readyAp(robot);
 seat(robot,0,'TRK-1-090','energy',0,true);
 seat(robot,0,'TRK-1-090','energy',1,true);
 const opener=take(robot,0,'TRK-1-006');
 robot.players[0].hand.push(opener);
 robot=playFront(robot,opener.uid);
 assert.equal(robot.pending.kind,'effect-discard');
 const paid=robot.players[0].hand.find(card=>card.uid!==opener.uid);
 robot=choose(robot,action=>action.uid===paid.uid);
 assert.equal(robot.zoneMoveEvents.some(event=>event.turn===robot.turn&&event.reason==='own-effect'&&
  event.from==='hand'&&event.to==='outside'&&event.uid===paid.uid),true);
 const body=take(robot,0,'TRK-1-072');
 robot.players[0].hand.push(body);
 const beforeRobot=robot.players[0].hand.length;
 robot=playFront(robot,body.uid);
 const entered=robot.players[0].front.find(card=>card&&card.uid===body.uid);
 assert.equal(robot.players[0].hand.length,beforeRobot-1);
 assert.equal(universalBp(pack,robot,entered),3500);
 const buried=take(robot,0,'TRK-1-091');
 entered.stack=[buried];
 assert.equal(universalBp(pack,robot,entered),4000);
 entered.ready=true;
 robot=pass(robot,1,'main');
 assert.equal(universalBp(pack,robot,live(robot,entered)),3500);
 const striker=seat(robot,1,'TRK-1-017','front',0,true);
 robot=toPhase(robot,'attack');
 robot=dispatchUniversalAction(packs,robot,{type:'attack',uid:striker.uid},{actor:1});
 robot=choose(robot,action=>action.type==='chooseBlock'&&action.uid===entered.uid);
 assert.equal(robot.players[0].hand.some(card=>card.uid===buried.uid),true);
 assert.equal(robot.players[0].front.every(card=>!card||card.uid!==entered.uid),true);

 let rod=toPhase(fresh(deck,19091),'main');
 const tommy=seat(rod,0,'TRK-1-091','front',0,true);
 layUnder(tommy,take(rod,0,'TRK-1-006'));
 const bug=seat(rod,0,'TRK-1-068','front',1,true);
 rod=pass(rod,1,'main');
 readyAp(rod,1,2);
 for(let slot=0;slot<3;slot++)seat(rod,1,'TRK-1-090','energy',slot,true);
 const mitora=take(rod,1,'TRK-1-094');
 rod.players[1].deck.push(...rod.players[1].hand);
 rod.players[1].hand=[mitora];
 const mitoraPlay=legalUniversalActions(packs,rod).find(action=>action.type==='play'&&
  action.uid===mitora.uid&&action.line==='front');
 if(!mitoraPlay)throw Error('No front play for '+mitora.uid);
 rod=dispatchUniversalAction(packs,rod,mitoraPlay,{actor:1});
 assert.equal(rod.pending.choices.includes(tommy.uid),true);
 rod=choose(rod,action=>action.uid===tommy.uid);
 assert.equal(rod.pending.kind,'effect-opp-retire-instead');
 rod=choose(rod,action=>action.uid===bug.uid);
 assert.equal(live(rod,tommy).uid,tommy.uid);
 assert.equal(rod.players[0].front.some(card=>card&&card.uid===bug.uid),false);
 let battle=toPhase(fresh(deck,19092),'main');
 const victim=seat(battle,0,'TRK-1-091','front',0,true);
 seat(battle,0,'TRK-1-068','front',1,true);
 const attacker=seat(battle,1,'TRK-1-017','front',0,true);
 battle=pass(battle,1,'attack');
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:attacker.uid},{actor:1});
 battle=choose(battle,action=>action.type==='chooseBlock'&&action.uid===victim.uid);
 assert.equal(battle.pending===null||battle.pending.kind!=='effect-opp-retire-instead',true);
 assert.equal(battle.players[0].front.some(card=>card&&card.uid===victim.uid),false);
});

test('the three Toriko point-exchange promos change shared state',()=>{
 const deck=fillDeck({'TRK-P-001':1,'TRK-P-002':1,'TRK-P-003':1,'TRK-1-010':1,'TRK-1-014':2,
  'TRK-1-018':1,'TRK-1-020':1,'TRK-1-022':1,'TRK-1-040':2,'TRK-1-052':2,'TRK-1-064':2,
  'TRK-1-066':1,'TRK-1-090':4,'TRK-1-094':1,'TRK-1-103':2,'TRK-1-109':1});
 let coco=toPhase(fresh(deck,19001),'main');
 readyAp(coco,0,1);
 seat(coco,0,'TRK-1-020','energy',0,true);
 const alone=take(coco,0,'TRK-P-001');
 coco.players[0].hand.push(alone);
 coco=playFront(coco,alone.uid);
 assert.equal(coco.pending.kind,'effect-buff-own');
 coco=choose(coco,action=>action.uid===alone.uid);
 assert.equal(universalBp(pack,coco,live(coco,alone)),4000);
 assert.equal(live(coco,alone).ready,false);

 let kings=toPhase(fresh(deck,19002),'main');
 readyAp(kings,0,1);
 seat(kings,0,'TRK-1-020','energy',0,true);
 seat(kings,0,'TRK-1-018','front',0,false);
 seat(kings,0,'TRK-1-010','front',1,false);
 const zebra=seat(kings,0,'TRK-1-014','front',2,false);
 const cocoCard=take(kings,0,'TRK-P-001');
 kings.players[0].hand.push(cocoCard);
 kings=playFront(kings,cocoCard.uid);
 kings=choose(kings,action=>action.uid===zebra.uid);
 assert.equal(live(kings,zebra).ready,true);
 assert.equal(universalBp(pack,kings,live(kings,zebra)),3000);

 let look=toPhase(fresh(deck,19003),'main');
 readyAp(look,0,2);
 seat(look,0,'TRK-1-103','energy',0,true);
 seat(look,0,'TRK-1-103','energy',1,true);
 const first=take(look,0,'TRK-1-064');
 const second=take(look,0,'TRK-1-064');
 const soup=take(look,0,'TRK-1-109');
 const komatsu=take(look,0,'TRK-1-022');
 const plain=take(look,0,'TRK-1-052');
 const filler=[take(look,0,'TRK-1-040'),take(look,0,'TRK-1-040')];
 const promo=take(look,0,'TRK-P-002');
 const spare=look.players[0].hand.splice(0);
 look.players[0].deck.push(...spare);
 look.players[0].hand.push(promo);
 look.players[0].deck.unshift(first,second,soup,komatsu,plain,...filler);
 look=playFront(look,promo.uid);
 assert.equal(look.pending.kind,'effect-optional-pay-ap');
 look=choose(look,action=>action.mode==='skip');
 assert.equal(look.pending,null);
 assert.equal(look.players[0].deck[0].uid,first.uid);

 look=toPhase(fresh(deck,19004),'main');
 readyAp(look,0,2);
 seat(look,0,'TRK-1-103','energy',0,true);
 seat(look,0,'TRK-1-103','energy',1,true);
 const a=take(look,0,'TRK-1-064');
 const b=take(look,0,'TRK-1-064');
 const other=take(look,0,'TRK-1-109');
 const named=take(look,0,'TRK-1-022');
 const missed=take(look,0,'TRK-1-052');
 const rest=[take(look,0,'TRK-1-040'),take(look,0,'TRK-1-040')];
 const hunter=take(look,0,'TRK-P-002');
 look.players[0].deck.push(...look.players[0].hand.splice(0));
 look.players[0].hand.push(hunter);
 look.players[0].deck.unshift(a,b,other,named,missed,...rest);
 look=playFront(look,hunter.uid);
 look=choose(look,action=>action.mode==='pay');
 assert.equal(look.pending.kind,'effect-top-distinct-take');
 assert.equal(look.pending.uids.length,7);
 const seen=universalPrivateChoices(pack,look,0);
 assert.equal(seen.inspected.length,7);
 assert.equal(seen.inspected.some(card=>card.uid===missed.uid),true);
 assert.equal(look.pending.uids.includes(b.uid),true);
 look=choose(look,action=>action.uid===a.uid);
 assert.equal(legalUniversalActions(packs,look).some(action=>action.uid===b.uid),false);
 look=choose(look,action=>action.uid===other.uid);
 look=choose(look,action=>action.uid===named.uid);
 assert.equal(legalUniversalActions(packs,look).some(action=>action.uid===named.uid),false);
 look=choose(look,action=>action.uid===null);
 assert.equal(look.pending.kind,'effect-top-order');
 assert.equal(look.pending.uids.length,4);
 while(look.pending?.kind==='effect-top-order')
  look=choose(look,action=>action.type==='chooseTopOrder');
 assert.equal(look.players[0].hand.some(card=>card.uid===a.uid),true);
 assert.equal(look.players[0].hand.some(card=>card.uid===other.uid),true);
 assert.equal(look.players[0].hand.some(card=>card.uid===named.uid),true);
 assert.equal(look.players[0].deck.slice(-4).some(card=>card.uid===b.uid),true);
 assert.equal(look.players[0].deck.slice(-4).some(card=>card.uid===missed.uid),true);

 let attack=toPhase(fresh(deck,19005),'main');
 readyAp(attack,0,1);
 seat(attack,0,'TRK-1-103','energy',0,true);
 seat(attack,0,'TRK-1-103','energy',1,true);
 const toriko=seat(attack,0,'TRK-P-002','front',0,true);
 const blocker=seat(attack,1,'TRK-1-014','front',0,true);
 attack=toPhase(attack,'attack');
 attack=dispatchUniversalAction(packs,attack,{type:'attack',uid:toriko.uid});
 assert.equal(attack.pending.kind,'block');
 attack=choose(attack,action=>action.uid===null);
 let fed=toPhase(fresh(deck,19006),'main');
 readyAp(fed,0,1);
 seat(fed,0,'TRK-1-103','energy',0,true);
 seat(fed,0,'TRK-1-103','energy',1,true);
 const fruit=take(fed,0,'TRK-1-066');
 fed.players[0].hand.push(fruit);
 fed=playEvent(fed,fruit.uid);
 while(fed.pending)fed=choose(fed,action=>action.uid===null||action.mode==='skip');
 const fedToriko=seat(fed,0,'TRK-P-002','front',0,true);
 fed=toPhase(fed,'attack');
 fed=dispatchUniversalAction(packs,fed,{type:'attack',uid:fedToriko.uid});
 assert.equal(fed.pending.kind,'effect-buff-own');
 assert.equal(fed.pending.bp,2000);
 assert.equal(fed.pending.choices.includes(fedToriko.uid),true);
 fed=choose(fed,action=>action.uid===fedToriko.uid);
 assert.equal(universalBp(pack,fed,live(fed,fedToriko)),5000);

 let midora=toPhase(fresh(deck,19007),'main');
 readyAp(midora,0,1);
 seat(midora,0,'TRK-1-090','energy',0,true);
 seat(midora,0,'TRK-1-090','energy',1,true);
 seat(midora,0,'TRK-1-090','energy',2,true);
 const boss=take(midora,0,'TRK-P-003');
 midora.players[0].deck.push(...midora.players[0].hand.splice(0));
 midora.players[0].hand.push(boss);
 const buried=midora.players[0].deck[0];
 midora=playFront(midora,boss.uid);
 const hosted=live(midora,boss);
 assert.equal(hosted.under.some(card=>card&&card.uid===buried.uid&&card.faceDown===true),true);
 assert.equal(midora.players[0].hand.length,0);
 assert.equal(universalImpact(pack,midora,hosted),1);
 const held=take(midora,0,'TRK-1-052');
 midora.players[0].hand.push(held);
 assert.equal(universalImpact(pack,midora,live(midora,boss)),0);
 midora.players[0].deck.push(midora.players[0].hand.pop());
 assert.equal(universalImpact(pack,midora,live(midora,boss)),1);
 const small=seat(midora,1,'TRK-1-014','front',0,true);
 const lifeBefore=midora.players[1].life.length;
 live(midora,boss).ready=true;
 midora=toPhase(midora,'attack');
 midora=dispatchUniversalAction(packs,midora,{type:'attack',uid:boss.uid});
 midora=choose(midora,action=>action.type==='chooseBlock'&&action.uid===small.uid);
 assert.equal(midora.players[1].life.length,lifeBefore-1);

 let pile=toPhase(fresh(deck,19008),'main');
 readyAp(pile,0,1);
 seat(pile,0,'TRK-1-090','energy',0,true);
 seat(pile,0,'TRK-1-090','energy',1,true);
 seat(pile,0,'TRK-1-090','energy',2,true);
 const tiger=take(pile,0,'TRK-P-003');
 pile.players[0].deck.push(...pile.players[0].hand.splice(0));
 pile.players[0].hand.push(tiger);
 pile=playFront(pile,tiger.uid);
 const extra=take(pile,0,'TRK-1-052');
 const kept=take(pile,0,'TRK-1-040');
 pile.players[0].hand.push(extra,kept);
 pile=act(pile,tiger.uid,'onceTuckHand');
 pile=choose(pile,action=>action.uid===extra.uid);
 assert.equal(pile.pending.kind,'effect-tuck-facedown');
 pile=choose(pile,action=>action.uid===null);
 assert.equal(pile.players[0].hand.some(card=>card.uid===kept.uid),true);
 assert.equal(live(pile,tiger).under.filter(card=>card&&card.faceDown).length,2);
 assert.equal(legalUniversalActions(packs,pile).some(action=>action.mode==='onceTuckHand'),false);
 live(pile,tiger).ready=true;
 const heavy=seat(pile,1,'TRK-1-094','front',0,true);
 pile=pass(pile,1,'attack');
 const handBefore=pile.players[0].hand.length;
 pile=dispatchUniversalAction(packs,pile,{type:'attack',uid:heavy.uid},{actor:1});
 pile=choose(pile,action=>action.type==='chooseBlock'&&action.uid===tiger.uid);
 assert.equal(pile.pending.kind,'effect-draw-counted');
 assert.equal(pile.pending.remaining,2);
 pile=choose(pile,action=>action.mode==='draw');
 assert.equal(pile.pending.kind,'effect-draw-counted');
 assert.equal(pile.pending.remaining,1);
 pile=choose(pile,action=>action.mode==='skip');
 assert.equal(pile.players[0].hand.length,handBefore+1);
 assert.equal(pile.players[0].front.some(card=>card&&card.uid===tiger.uid),false);
});

function matchesPrintedRequiredEnergyExactOrPrinted(card){
 return matchesPrintedRequiredEnergyAtLeast(card,card.energy)&&
  matchesPrintedRequiredEnergyAtMost(card,card.alsoRequiredEnergy);
}
