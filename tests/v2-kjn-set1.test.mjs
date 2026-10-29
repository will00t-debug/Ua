import test from 'node:test';
import assert from 'node:assert/strict';
import {KJN_CARDS} from '../dist/kjn-cards.mjs';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {kjnEngineKind} from '../dist/universal-v2/kjn-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {kjnPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalPublicView,
 zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';

const pack=createKjnV2Pack();
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
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
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
function use(s,action){
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||''));
 return use(s,action);
}
function spill(s,p,n){
 for(let i=0;i<n;i++)s.players[p].outside.push(s.players[p].deck.pop());
}
function silence(s,card,controller){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}

test('UA52BT registers all 80 playable identities outside the five-title census',()=>{
 assert.equal(KJN_CARDS.length,80);
 assert.deepEqual(KJN_CARDS.map(c=>c.id),Array.from({length:80},(_,i)=>'KJN-1-'+String(i+1).padStart(3,'0')));
 assert.equal(KJN_CARDS.some(c=>c.rarity==='AP'||/_p\d/.test(c.number)),false);
 assert.equal(Object.keys(pack.cards).length,80);
 assert.equal(pack.version,'kjn-ua52-full-20261029');
 assert.equal(pack.id,'kjn');
 assert.equal(V2_TITLE_IDS.includes('kjn'),false);
 const colors={yellow:0,purple:0};
 for(const card of KJN_CARDS){
  assert.equal(kjnEngineKind(card.effectJa),card.engineKind);
  assert.equal(pack.cards[card.id].name,card.nameJa);
  colors[card.color]++;
 }
 assert.equal(colors.yellow,39);
 assert.equal(colors.purple,41);
 const plusGen=KJN_CARDS.filter(c=>c.genMark==='+');
 assert.deepEqual(plusGen.map(c=>c.id),['KJN-1-018','KJN-1-021','KJN-1-042','KJN-1-051','KJN-1-060','KJN-1-063','KJN-1-070','KJN-1-073']);
 for(const card of plusGen)assert.equal(card.gen,1);
 assert.equal(pack.cards['KJN-1-021'].gen,1);
 assert.equal(pack.cards['KJN-1-021'].activeExtraEnergy,1);
 assert.equal(KJN_CARDS.filter(c=>c.traitComponents).length,23);
 assert.equal(KJN_CARDS.filter(c=>c.nameAliases).length,8);
 assert.equal(pack.cards['KJN-1-001'].name,'アイリス・ミドガル');
 assert.equal(KJN_CARDS.find(c=>c.id==='KJN-1-001').name,'愛麗絲·米德加');
 assert.equal(pack.cards['KJN-1-001'].forceHigherBpBlock,true);
 assert.equal(pack.cards['KJN-1-001'].attackLoseReadyTurn.bp,1000);
 assert.equal(pack.cards['KJN-1-004'].mayOutsideToDeckTop,true);
 assert.equal(pack.cards['KJN-1-004'].triggerEffect.op,'restOppFrontSkipNextActive');
 assert.deepEqual(Object.keys(pack.cards['KJN-1-004'].triggerEffect),['op']);
 assert.equal(pack.cards['KJN-1-009'].raidName,'アレクシア・ミドガル');
 assert.equal(pack.cards['KJN-1-016'].raidName,'クレア・カゲノー');
 assert.equal(pack.cards['KJN-1-034'].raidName,'ローズ・オリアナ');
 assert.equal(pack.cards['KJN-1-048'].raidName,'シド・カゲノー');
 assert.equal(pack.cards['KJN-1-056'].raidName,'アルファ');
 assert.equal(pack.cards['KJN-1-074'].raidName,'ベータ');
 assert.equal(pack.cards['KJN-1-069'].triggerEffect.op,'deployOutsideCharacter');
 assert.equal(pack.cards['KJN-1-076'].triggerEffect.op,'retireOppFront');
 assert.deepEqual(pack.cards['KJN-1-053'].traitComponents,['シャドウガーデン','七陰']);
 assert.equal(pack.cards['KJN-1-047'].nameAliases.includes('シド・カゲノー'),true);
 const practice=kjnPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(Object.keys(practice.counts).every(id=>practice.pack.cards[id].color==='purple'),true);
 const status=editorV2Status('kjn',practice.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,80);
});

test('Q2104 forces a strictly higher BP block, and a lost attack readies Iris once',()=>{
 const counts=countsFor(['KJN-1-001','KJN-1-049','KJN-1-012']);
 let s=toPhase(fresh(counts,2104),'attack');
 const iris=put(s,0,'KJN-1-001','front',0,true);
 const wall=put(s,1,'KJN-1-049','front',0,true);
 wall.buffs=[{bp:2000,untilTurn:s.turn}];
 const low=put(s,1,'KJN-1-012','front',1,true);
 assert.ok(universalBp(packs,s,wall)>universalBp(packs,s,iris));
 s=use(s,{type:'attack',uid:iris.uid});
 assert.equal(s.pending.kind,'block');
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===null),false);
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===wall.uid),true);
 s=choose(s,a=>a.uid===wall.uid);
 const won=s.players[0].front.find(c=>c?.uid===iris.uid);
 assert.equal(won.ready,true);
 assert.equal(universalBp(packs,s,won),5000);
 assert.equal((won.buffs||[]).filter(b=>b.bp===1000).length,1);
 assertUniversalMatch(packs,s);
 s.players[1].front.find(c=>c?.uid===wall.uid).ready=true;
 s=use(s,{type:'attack',uid:iris.uid});
 s=choose(s,a=>a.uid===wall.uid);
 const stayed=s.players[0].front.find(c=>c?.uid===iris.uid);
 assert.equal(stayed.ready,false);
 assert.equal(universalBp(packs,s,stayed),5000);
 assert.equal((stayed.buffs||[]).filter(b=>b.bp===1000).length,1);
 assertUniversalMatch(packs,s);
});

test('Q2434 may put Aurora on the deck top, and Q2435 a silenced copy stays outside',()=>{
 const counts=countsFor(['KJN-1-014','KJN-1-004','KJN-1-008','KJN-1-001']);
 let s=toPhase(fresh(counts,2434),'main');
 readyAp(s);
 put(s,0,'KJN-1-008','energy',0);
 put(s,0,'KJN-1-001','energy',1);
 const aurora=toHand(s,0,'KJN-1-004');
 const claire=toHand(s,0,'KJN-1-014');
 s=play(s,claire.uid);
 assert.equal(s.pending.kind,'kjn');
 assert.equal(s.pending.step,'pay');
 s=choose(s,a=>a.uid===aurora.uid);
 assert.equal(s.pending.step,'deckTop');
 s=choose(s,a=>a.mode==='top');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,aurora.uid);
 assertUniversalMatch(packs,s);

 let stay=toPhase(fresh(counts,24341),'main');
 readyAp(stay);
 put(stay,0,'KJN-1-008','energy',0);
 put(stay,0,'KJN-1-001','energy',1);
 const held=toHand(stay,0,'KJN-1-004');
 const source=toHand(stay,0,'KJN-1-014');
 stay=play(stay,source.uid);
 stay=choose(stay,a=>a.uid===held.uid);
 assert.equal(stay.pending.step,'deckTop');
 stay=choose(stay,a=>a.mode==='stay');
 assert.equal(stay.pending.step,'tuckAurora');
 stay=choose(stay,a=>a.mode==='skip');
 assert.equal(stay.pending,null);
 assert.equal(stay.players[0].outside.some(c=>c.uid===held.uid),true);
 assertUniversalMatch(packs,stay);

 let quiet=toPhase(fresh(counts,2435),'attack');
 const attacker=put(quiet,0,'KJN-1-001','front',0,true);
 const victim=put(quiet,1,'KJN-1-004','front',0,true);
 silence(quiet,victim,1);
 quiet=use(quiet,{type:'attack',uid:attacker.uid});
 quiet=choose(quiet,a=>a.uid===victim.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(quiet.players[1].deck.some(c=>c.uid===victim.uid),false);
 assertUniversalMatch(packs,quiet);
});

test('Elizabeth cannot move to the front while a facedown remains, then her effect can',()=>{
 const counts=countsFor(['KJN-1-011','KJN-1-001','KJN-1-008','KJN-1-012','KJN-1-013']);
 let s=toPhase(fresh(counts,2111),'move');
 const liz=put(s,0,'KJN-1-011','energy',0,true);
 const hidden=take(s,0,'KJN-1-001');
 hidden.faceDown=true;
 hidden.ready=false;
 liz.under=[hidden];
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='move'&&a.uid===liz.uid&&a.line==='front'),false);
 s=toPhase(s,'main');
 readyAp(s);
 for(const id of ['KJN-1-008','KJN-1-012','KJN-1-013','KJN-1-001'])put(s,0,id,'front',['KJN-1-008','KJN-1-012','KJN-1-013','KJN-1-001'].indexOf(id));
 s=use(s,{type:'activate',uid:liz.uid,mode:'kjn:0'});
 assert.equal(s.pending.step,'dropDown');
 s=choose(s,a=>a.uid===hidden.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===hidden.uid),true);
 assert.equal(s.pending.step,'moveFront');
 const victim=s.players[0].front[0];
 assert.equal(legalUniversalActions(packs,s).some(a=>a.replaceUid===victim.uid),true);
 s=choose(s,a=>a.replaceUid===victim.uid);
 assert.equal(s.players[0].front[0].uid,liz.uid);
 assert.equal(s.players[0].front[0].ownEffectFront,true);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].removed.some(c=>c.uid===victim.uid),true);
 assertUniversalMatch(packs,s);

 let tucked=toPhase(fresh(counts,2110),'main');
 readyAp(tucked);
 put(tucked,0,'KJN-1-008','energy',0);
 put(tucked,0,'KJN-1-008','energy',1);
 const body=toHand(tucked,0,'KJN-1-011');
 tucked=play(tucked,body.uid,'play','energy');
 const entered=tucked.players[0].energy.find(c=>c?.uid===body.uid);
 assert.equal(entered.under.length,3);
 assert.equal(entered.under.every(c=>c.faceDown===true),true);
 const ownerView=universalPublicView(packs,tucked,0);
 const foeView=universalPublicView(packs,tucked,1);
 const ownLayer=ownerView.players[0].energy.find(c=>c?.uid===body.uid).underLayers[0];
 const foeLayer=foeView.players[0].energy.find(c=>c?.uid===body.uid).underLayers[0];
 assert.equal(ownLayer.cardId,entered.under[0].cardId);
 assert.deepEqual(foeLayer,{faceDown:true});
 assertUniversalMatch(packs,tucked);
});

test('the next removed-area use loses 1 AP and a hand play leaves that cut',()=>{
 const counts=countsFor(['KJN-1-008','KJN-1-009','KJN-1-014','KJN-1-001','KJN-1-024','KJN-1-012','KJN-1-013']);
 let s=toPhase(fresh(counts,2109),'main');
 const miller=put(s,0,'KJN-1-009','front',0,true);
 const milled=take(s,0,'KJN-1-024');
 s.players[0].deck.unshift(milled);
 s=use(s,{type:'activate',uid:miller.uid,mode:'kjn:0'});
 const removed=s.players[0].removed.find(c=>c.uid===milled.uid);
 assert.equal(removed.kjnRemovedPlay,s.turn);
 readyAp(s,0,0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===milled.uid&&a.from==='removed'),false);
 readyAp(s);
 put(s,0,'KJN-1-014','energy',0);
 put(s,0,'KJN-1-001','energy',1);
 const alexia=toHand(s,0,'KJN-1-008');
 const payment=toHand(s,0,'KJN-1-013');
 const ordinary=toHand(s,0,'KJN-1-012');
 s=play(s,alexia.uid);
 s=use(s,{type:'activate',uid:alexia.uid,mode:'kjn:0'});
 s=choose(s,a=>a.uid===payment.uid);
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 s=play(s,ordinary.uid,'play','energy');
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 readyAp(s,0,0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===milled.uid&&a.from==='removed'),true);
 s=play(s,milled.uid,'play','energy');
 assert.equal(s.players[0].nextRemovedApCut,null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===milled.uid),true);
 assertUniversalMatch(packs,s);
});

test('five distinct Seven Shadows raise Beta, and ten outside cards generate energy',()=>{
 const counts=countsFor(['KJN-1-072','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-065','KJN-1-051','KJN-1-053','KJN-1-047']);
 let s=toPhase(fresh(counts,72),'main');
 const beta=put(s,0,'KJN-1-072','front',0);
 put(s,0,'KJN-1-052','front',1);
 put(s,0,'KJN-1-057','energy',0);
 put(s,0,'KJN-1-059','energy',1);
 assert.equal(universalBp(packs,s,beta),1500);
 put(s,0,'KJN-1-065','energy',2);
 assert.equal(universalBp(packs,s,beta),3000);
 assertUniversalMatch(packs,s);

 const nu=put(s,0,'KJN-1-051','energy',3);
 assert.equal(universalCardEnergy(packs,s,0,nu),1);
 spill(s,0,9);
 assert.equal(universalCardEnergy(packs,s,0,nu),1);
 spill(s,0,1);
 assert.equal(universalCardEnergy(packs,s,0,nu),2);
 spill(s,0,10);
 assert.equal(universalCardEnergy(packs,s,0,nu),3);
 const alpha=put(s,0,'KJN-1-053','front',2);
 assert.equal(universalCardEnergy(packs,s,0,alpha),0);
 const sid=put(s,0,'KJN-1-047','front',3);
 assert.equal(universalCardEnergy(packs,s,0,alpha),1);
 for(let i=0;i<11;i++)s.players[0].deck.push(s.players[0].outside.pop());
 assert.equal(s.players[0].outside.length,9);
 assert.equal(universalCardEnergy(packs,s,0,alpha),0);
 spill(s,0,1);
 assert.equal(universalCardEnergy(packs,s,0,alpha),1);
 silence(s,alpha,0);
 assert.equal(universalCardEnergy(packs,s,0,alpha),0);
 assert.equal(sid.cardId,'KJN-1-047');
 assertUniversalMatch(packs,s);
});

test('Claire makes the first attack mandatory to block when Sid is on the field',()=>{
 const counts=countsFor(['KJN-1-016','KJN-1-008','KJN-1-014','KJN-1-001','KJN-1-047','KJN-1-012']);
 let s=toPhase(fresh(counts,16),'main');
 readyAp(s);
 put(s,0,'KJN-1-008','energy',0);
 put(s,0,'KJN-1-014','energy',1);
 put(s,0,'KJN-1-001','energy',2);
 put(s,0,'KJN-1-001','energy',3);
 put(s,0,'KJN-1-047','front',0);
 const claire=toHand(s,0,'KJN-1-016');
 s=play(s,claire.uid);
 const live=s.players[0].front.find(c=>c?.uid===claire.uid);
 assert.equal(live.kjnFirstMustBlock.turn,s.turn);
 live.ready=true;
 s=toPhase(s,'attack');
 const wall=put(s,1,'KJN-1-012','front',0,true);
 s=use(s,{type:'attack',uid:claire.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseBlock'&&a.uid===null),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===wall.uid),true);
 assertUniversalMatch(packs,s);
});

test('Delta snipes at seven Seven Shadow names and does not lock below five',()=>{
 const counts=countsFor(['KJN-1-069','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-071','KJN-1-043']);
 let s=toPhase(fresh(counts,69),'main');
 readyAp(s);
 put(s,0,'KJN-1-052','energy',0);
 put(s,0,'KJN-1-057','energy',1);
 put(s,0,'KJN-1-059','energy',2);
 put(s,0,'KJN-1-065','energy',3);
 put(s,0,'KJN-1-062','front',0);
 put(s,0,'KJN-1-071','front',1);
 const delta=toHand(s,0,'KJN-1-069');
 s=play(s,delta.uid);
 const sniper=s.players[0].front.find(c=>c?.uid===delta.uid);
 assert.equal(sniper.ready,true);
 assert.equal(sniper.sniperGranted.turn,s.turn);
 assert.equal(s.mainReadyOnceByName[0].includes('KJN-1-069'),true);
 assertUniversalMatch(packs,s);

 let quiet=toPhase(fresh(counts,695),'main');
 readyAp(quiet);
 put(quiet,0,'KJN-1-043','energy',0);
 put(quiet,0,'KJN-1-043','energy',1);
 put(quiet,0,'KJN-1-043','energy',2);
 put(quiet,0,'KJN-1-043','energy',3);
 put(quiet,0,'KJN-1-052','front',0);
 put(quiet,0,'KJN-1-057','front',1);
 const other=toHand(quiet,0,'KJN-1-069');
 quiet=play(quiet,other.uid);
 const rested=quiet.players[0].front.find(c=>c?.uid===other.uid);
 assert.equal(rested.ready,false);
 assert.equal(rested.sniperGranted,undefined);
 assert.equal(quiet.mainReadyOnceByName[0].includes('KJN-1-069'),false);
 assertUniversalMatch(packs,quiet);
});

test('a compound Seven Shadows trait is searchable, and Sid discounts the event',()=>{
 const counts=countsFor(['KJN-1-054','KJN-1-053','KJN-1-051','KJN-1-001','KJN-1-076','KJN-1-047','KJN-1-052']);
 let s=toPhase(fresh(counts,54),'main');
 readyAp(s);
 put(s,0,'KJN-1-052','energy',0);
 const compound=take(s,0,'KJN-1-053');
 const garden=take(s,0,'KJN-1-051');
 const plain=take(s,0,'KJN-1-001');
 s.players[0].deck.unshift(compound,garden,plain);
 const seeker=toHand(s,0,'KJN-1-054');
 s=play(s,seeker.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.choices.includes(compound.uid),true);
 assert.equal(s.pending.choices.includes(garden.uid),false);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 s=choose(s,a=>a.uid===compound.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===compound.uid),true);
 assertUniversalMatch(packs,s);

 const event=pack.cards['KJN-1-076'];
 assert.equal(zoneRequiredEnergy(packs,s,0,event,'hand'),6);
 put(s,0,'KJN-1-047','front',1);
 assert.equal(zoneRequiredEnergy(packs,s,0,event,'hand'),4);
 assertUniversalMatch(packs,s);
});

test('Beta puts another card on the deck bottom only after the optional deploy',()=>{
 const counts=countsFor(['KJN-1-074','KJN-1-052','KJN-1-065']);
 let s=toPhase(fresh(counts,2128),'main');
 readyAp(s);
 put(s,0,'KJN-1-052','energy',0);
 put(s,0,'KJN-1-052','energy',1);
 put(s,0,'KJN-1-052','energy',2);
 put(s,0,'KJN-1-052','energy',3);
 const recruit=toHand(s,0,'KJN-1-065');
 const beta=toHand(s,0,'KJN-1-074');
 s=play(s,beta.uid);
 assert.equal(s.pending.step,'betaDeploy');
 s=choose(s,a=>a.mode==='dest'&&a.uid===recruit.uid);
 assert.equal(s.pending.step,'bottom');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===recruit.uid),false);
 const buried=s.players[0].energy.find(c=>c&&c.cardId==='KJN-1-052');
 s=choose(s,a=>a.uid===buried.uid);
 assert.equal(s.players[0].deck.at(-1).uid,buried.uid);
 assert.equal(s.players[0].energy.some(c=>c?.uid===recruit.uid&&c.ready===false)||
  s.players[0].front.some(c=>c?.uid===recruit.uid&&c.ready===false),true);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(counts,21281),'main');
 readyAp(skipped);
 put(skipped,0,'KJN-1-052','energy',0);
 put(skipped,0,'KJN-1-052','energy',1);
 put(skipped,0,'KJN-1-052','energy',2);
 put(skipped,0,'KJN-1-052','energy',3);
 toHand(skipped,0,'KJN-1-065');
 const other=toHand(skipped,0,'KJN-1-074');
 const before=skipped.players[0].deck.length;
 skipped=play(skipped,other.uid);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,before);
 assert.equal(skipped.players[0].hand.some(c=>c.cardId==='KJN-1-065'),true);
 assertUniversalMatch(packs,skipped);
});

test('the Seven Shadows event can rest-deploy or add the card to hand',()=>{
 const counts=countsFor(['KJN-1-077','KJN-1-072','KJN-1-052','KJN-1-070']);
 let s=toPhase(fresh(counts,77),'main');
 readyAp(s);
 put(s,0,'KJN-1-052','energy',0);
 put(s,0,'KJN-1-052','energy',1);
 const body=take(s,0,'KJN-1-072');
 s.players[0].outside.push(body);
 const event=toHand(s,0,'KJN-1-077');
 s=play(s,event.uid,'event');
 assert.equal(s.pending.step,'sevenPick');
 s=choose(s,a=>a.uid===body.uid);
 assert.equal(s.pending.step,'handOrDeploy');
 s=choose(s,a=>a.mode==='dest'&&a.uid===body.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===body.uid&&c.ready===false)||
  s.players[0].energy.some(c=>c?.uid===body.uid&&c.ready===false),true);
 assertUniversalMatch(packs,s);

 let named=toPhase(fresh(counts,771),'main');
 readyAp(named);
 put(named,0,'KJN-1-052','energy',0);
 put(named,0,'KJN-1-052','energy',1);
 put(named,0,'KJN-1-070','front',0);
 const twin=take(named,0,'KJN-1-072');
 named.players[0].outside.push(twin);
 const spell=toHand(named,0,'KJN-1-077');
 named=play(named,spell.uid,'event');
 named=choose(named,a=>a.uid===twin.uid);
 assert.equal(named.pending,null);
 assert.equal(named.players[0].hand.some(c=>c.uid===twin.uid),true);
 assertUniversalMatch(packs,named);
});

test('a color pip before plus stays, and the plus is only the live bonus',()=>{
 const counts=countsFor(['KJN-1-021','KJN-1-018','KJN-1-073','KJN-1-047']);
 let s=toPhase(fresh(counts,21),'main');
 const active=put(s,0,'KJN-1-021','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,active),2);
 active.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,active),1);
 const before=put(s,0,'KJN-1-018','energy',1,true);
 assert.equal(universalCardEnergy(packs,s,0,before),1);
 put(s,0,'KJN-1-047','front',0);
 const withSid=put(s,0,'KJN-1-073','energy',2,true);
 assert.equal(universalCardEnergy(packs,s,0,withSid),2);
 silence(s,withSid,0);
 assert.equal(universalCardEnergy(packs,s,0,withSid),1);
 assertUniversalMatch(packs,s);
});

test('a this-turn energy buff on Gamma is counted by the live energy total',()=>{
 const counts=countsFor(['KJN-1-063','KJN-1-012']);
 let s=toPhase(fresh(counts,63),'main');
 const gamma=put(s,0,'KJN-1-063','energy',0,true);
 spill(s,0,10);
 const payment=toHand(s,0,'KJN-1-012');
 assert.equal(universalCardEnergy(packs,s,0,gamma),1);
 s=use(s,{type:'activate',uid:gamma.uid,mode:'kjn:0'});
 s=choose(s,a=>a.uid===payment.uid);
 assert.equal(s.pending.step,'millMaybe');
 s=choose(s,a=>a.mode==='skip');
 const live=s.players[0].energy.find(c=>c?.uid===gamma.uid);
 assert.equal(universalCardEnergy(packs,s,0,live),2);
 assert.equal((live.buffs||[]).some(b=>b.energy===1&&b.untilTurn===s.turn),true);
 assertUniversalMatch(packs,s);
});
