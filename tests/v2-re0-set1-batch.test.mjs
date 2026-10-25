import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_CARDS,REZERO_BY_ID} from '../dist/rezero-cards.mjs';
import {createRezeroV2Pack,REZERO_ENGINE_IDS,rezeroEngineKind,rezeroPackCard} from '../dist/universal-v2/rezero-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,effectiveHandRequiredEnergy
} from '../dist/universal-v2/engine.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const fours=['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-013','REZ-1-014',
 'REZ-1-016','REZ-1-022','REZ-1-023','REZ-1-024','REZ-1-043','REZ-1-056'];
const twos=['REZ-1-003','REZ-1-017','REZ-1-029'];
const counts={
 ...Object.fromEntries(fours.map(id=>[id,4])),
 ...Object.fromEntries(twos.map(id=>[id,2]))
};
const fresh=(seed=4001)=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function reach(s,phase){
 for(let i=0;i<4&&s.phase!==phase;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase);
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function at(s,p,uid){
 const pl=s.players[p];
 for(const zone of ['front','energy','hand','deck','life','outside','removed']){
  const cards=zone==='front'||zone==='energy'?pl[zone].filter(Boolean):pl[zone];
  const card=cards.find(c=>c.uid===uid);
  if(card)return card;
 }
 return null;
}

test('UA40BT and UA40ST share one catalogue and keep parallel art out',()=>{
 assert.equal(REZERO_CARDS.length,113);
 assert.equal(new Set(REZERO_CARDS.map(c=>c.id)).size,113);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.includes('UA40BT')).length,100);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.includes('UA40ST')).length,22);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.length===2).length,9);
 assert.equal(REZERO_CARDS.filter(c=>c.sets.join()==='UA40ST').length,13);
 assert.ok(REZERO_CARDS.every(c=>c.type!=='ap'&&!c.id.includes('AP')));
 assert.equal(REZERO_BY_ID['REZ-1-001'].name,'帕克');
 assert.deepEqual(REZERO_BY_ID['REZ-1-001'].altNames,['卡包']);
 assert.deepEqual(REZERO_BY_ID['REZ-1-001'].sets,['UA40BT','UA40ST']);
 assert.equal(REZERO_BY_ID['REZ-1-103'].sets.join(),'UA40ST');
 assert.equal(REZERO_BY_ID['REZ-1-103'].nameJa,'レム');
 for(const c of REZERO_CARDS){
  assert.equal(c.identity,c.id);
  assert.equal(c.title,'rezero');
  assert.equal(c.auto,false);
  assert.equal(rezeroEngineKind(c.effectJa),c.engineKind,c.id);
  assert.ok(c.source.includes('unionarena-tcg.com/jp/cardlist/'),c.id);
  assert.ok(c.effect.length>0&&c.effectJa.length>0,c.id);
 }
});

test('sixty-five whole prints enter the V2 pack and the other forty-eight stay out',()=>{
 assert.equal(REZERO_ENGINE_IDS.length,65);
 assert.equal(Object.keys(pack.cards).length,65);
 assert.equal(pack.cards['REZ-1-001'],undefined);
 assert.equal(pack.cards['REZ-1-008'].step,true);
 assert.equal(pack.cards['REZ-1-008'].implementation,'vanilla');
 assert.equal(pack.cards['REZ-1-013'].impactNull,true);
 assert.deepEqual(pack.cards['REZ-1-023'].effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-024'].effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 assert.deepEqual(pack.cards['REZ-1-056'].effects.onPlay,[{op:'draw',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-029'].effects.onPlay,[{op:'recoverAp',count:2}]);
 assert.equal(pack.cards['REZ-1-016'].activeExtraEnergy,1);
 assert.equal(pack.cards['REZ-1-016'].gen,0);
 assert.deepEqual(pack.cards['REZ-1-003'].opponentFieldColorsHandEnergyDiscount,
  {amount:1,colors:['blue','purple']});
 assert.equal(pack.cards['REZ-1-028'].step,true);
 assert.equal(pack.cards['REZ-1-028'].emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(pack.cards['REZ-1-006'].mainAbility,{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1});
 assert.equal(pack.cards['REZ-1-037'].color,'blue');
 assert.equal(pack.cards['REZ-1-082'].color,'purple');
 assert.deepEqual(pack.cards['REZ-1-102'].passiveBonuses,[{
  condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'フェルト'},bp:1000}]);
 assert.deepEqual(pack.cards['REZ-1-105'].passiveBonuses,[{
  condition:{kind:'ownEventUsedThisTurn',turn:'own'},bp:1000}]);
 assert.deepEqual(pack.cards['REZ-1-110'].passiveBonuses,[{
  condition:{kind:'ownNameExists',turn:'any',zone:'front',excludeSelf:false,name:'ナツキ・スバル'},
  extraEnergy:1}]);
 assert.deepEqual(pack.cards['REZ-1-005'].effects.onPlay,[{
  op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]);
 assert.deepEqual(pack.cards['REZ-1-018'].effects.onPlay,[{
  op:'enemyBpDown',bp:2000,optional:true,minBp:2500,zone:'front'}]);
 assert.deepEqual(pack.cards['REZ-1-018'].triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.deepEqual(pack.cards['REZ-1-025'].effects.onPlay,[{
  op:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]);
 assert.deepEqual(pack.cards['REZ-1-083'].effects.onPlay,[{
  op:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]);
 assert.deepEqual(pack.cards['REZ-1-050'].effects.onPlay,[{
  op:'inspectTopAnyOutside',count:2,rest:'top'}]);
 assert.deepEqual(pack.cards['REZ-1-050'].triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(pack.cards['REZ-1-111'].nameAliases,['クルシュ・カルステン','フェリス']);
 assert.equal(pack.cards['REZ-1-111'].name,'クルシュ＆フェリス');
 assert.equal(pack.cards['REZ-1-111'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-009'].effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'ラム'},{field:'name',value:'レム'},
   {field:'name',value:'ロズワール・L・メイザース'}]}]);
 assert.equal(pack.cards['REZ-1-049'].effects.onPlay[0].count,3);
 assert.equal(pack.cards['REZ-1-049'].effects.onPlay[0].filters.length,2);
 assert.equal(pack.cards['REZ-1-069'].effects.onPlay[0].filters[2].value,'禁書庫');
 assert.equal(pack.cards['REZ-1-057'].effects.onPlay[0].count,4);
 assert.deepEqual(pack.cards['REZ-1-057'].triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(pack.cards['REZ-1-010'].effects.onPlay,[{op:'drawIfOwnName',count:1,
  names:['レム','ロズワール・L・メイザース']}]);
 assert.deepEqual(pack.cards['REZ-1-026'].effects.onPlay,[{op:'drawIfOwnEventUsed',count:1}]);
 assert.deepEqual(pack.cards['REZ-1-026'].triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.deepEqual(pack.cards['REZ-1-075'].effects.onPlay,[{op:'draw',count:1,entry:'ownEffect'}]);
 assert.deepEqual(pack.cards['REZ-1-004'].effects.onPlay,[
  {op:'draw',count:1},{op:'recoverAp',count:1,require:'ownEventUsed'}]);
 assert.deepEqual(pack.cards['REZ-1-091'].effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:7,
  filter:{field:'name',value:REZERO_BY_ID['REZ-1-098'].nameJa}}]);
 assert.equal(pack.cards['REZ-1-098'],undefined);
 assert.deepEqual(pack.cards['REZ-1-021'].mainAbility,{
  op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,requireAllNames:['ラム','レム'],
  then:[{op:'drawDiscard',count:1}]});
 assert.equal(pack.cards['REZ-1-108'].type,'field');
 assert.deepEqual(pack.cards['REZ-1-108'].mainAbility,{
  op:'restSelfThen',frontOnly:false,oncePerTurn:true,then:[{op:'peekTopOrBottom'}]});
 assert.deepEqual(pack.cards['REZ-1-042'].effects.onPlay,[{
  op:'buffEitherOther',bp:1000,optional:true}]);
 assert.equal(pack.cards['REZ-1-042'].trigger,'active');
 assert.equal(pack.cards['REZ-1-042'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-041'].passiveBonuses,[{
  condition:{kind:'ownPrintedCharacter',turn:'own',zone:'front',excludeSelf:false,
   name:'ナツキ・スバル',color:'blue',energy:0},bp:1000}]);
 assert.equal(pack.cards['REZ-1-041'].trigger,'active');
 assert.deepEqual(pack.cards['REZ-1-045'].mainAbility,{
  op:'revealHandBottomBuff',oncePerTurn:true,minPrintedBp:4000,bp:2500});
 assert.equal(pack.cards['REZ-1-045'].trigger,'active');
 assert.equal(pack.cards['REZ-1-045'].triggerEffect,null);
 assert.deepEqual(pack.cards['REZ-1-046'].effects.onPlay,[{
  op:'returnPrintedActiveBuff',name:'ナツキ・スバル',color:'blue',energy:0,bp:1000}]);
 assert.equal(pack.cards['REZ-1-046'].trigger,null);
 assert.equal(pack.cards['REZ-1-052'],undefined);
 assert.equal(pack.cards['REZ-1-101'],undefined);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const s=fresh();
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('step, draw-discard, bounce, active energy, hand discount and two AP recovery resolve',()=>{
 let s=fresh(4002);
 const stepCard=pull(s,0,'REZ-1-008');
 s.players[0].front[0]=stepCard;
 s=reach(s,'move');
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===stepCard.uid);
 assert.ok(step);
 s=dispatchUniversalAction(packs,s,step);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===stepCard.uid),true);

 s=fresh(4003);
 s=reach(s,'main');
 const emilia=pull(s,0,'REZ-1-023');
 s.players[0].hand.push(emilia);
 const before=s.players[0].hand.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='energy');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-discard');
 const discard=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 s=dispatchUniversalAction(packs,s,discard);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before-1);
 assert.equal(s.players[0].hand.some(c=>c.uid===emilia.uid),false);

 s=fresh(4004);
 const payer=pull(s,0,'REZ-1-024');
 payer.ready=false;
 s.players[0].energy[0]=payer;
 const low=pull(s,0,'REZ-1-013'),heavy=pull(s,0,'REZ-1-003');
 s.players[0].front[0]=low;
 s.players[0].front[1]=heavy;
 s=reach(s,'main');
 const bouncer=pull(s,0,'REZ-1-024');
 s.players[0].hand.push(bouncer);
 const bounce=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===bouncer.uid);
 assert.ok(bounce);
 s=dispatchUniversalAction(packs,s,bounce);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:low.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].front[0],null);

 s=fresh(4005);
 const solo=pull(s,0,'REZ-1-003');
 solo.ready=false;
 s.players[0].energy[0]=solo;
 const wall=pull(s,0,'REZ-1-003');
 s.players[0].front[0]=wall;
 s=reach(s,'main');
 const self=pull(s,0,'REZ-1-024');
 s.players[0].hand.push(self);
 const selfPlay=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid);
 s=dispatchUniversalAction(packs,s,selfPlay);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===self.uid),true);

 s=fresh(4006);
 const rem=pull(s,0,'REZ-1-016'),ram=pull(s,0,'REZ-1-007');
 rem.ready=true;ram.ready=false;
 s.players[0].energy[0]=rem;
 s.players[0].energy[1]=ram;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,2);
 rem.ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,1);

 s=fresh(4007);
 const blue=pull(s,1,'REZ-1-043');
 s.players[1].energy[0]=blue;
 const frederica=pack.cards['REZ-1-003'];
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,frederica),2);
 s.players[1].energy[0]=null;
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,frederica),3);

 s=fresh(4008);
 const yellowA=pull(s,0,'REZ-1-024'),yellowB=pull(s,0,'REZ-1-007');
 yellowA.ready=false;yellowB.ready=false;
 s.players[0].energy[0]=yellowA;
 s.players[0].energy[1]=yellowB;
 const felisA=pull(s,0,'REZ-1-043'),felisB=pull(s,0,'REZ-1-043');
 felisA.ready=true;felisB.ready=true;
 s.players[0].energy[2]=felisA;
 s.players[0].energy[3]=felisB;
 s=reach(s,'main');
 const crusch=pull(s,0,'REZ-1-056');
 s.players[0].hand.push(crusch);
 const draw=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===crusch.uid);
 assert.ok(draw,'blue energy from two active Felix cards pays Crusch');
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,draw);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);

 s=fresh(4009);
 const genA=pull(s,0,'REZ-1-024'),genB=pull(s,0,'REZ-1-007');
 genA.ready=false;genB.ready=false;
 s.players[0].energy[0]=genA;
 s.players[0].energy[1]=genB;
 s=reach(s,'main');
 const event=pull(s,0,'REZ-1-029');
 s.players[0].hand.push(event);
 const cast=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(cast);
 s=dispatchUniversalAction(packs,s,cast);
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 assert.ok(rested);
 s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(s.pending,null);
});

const batchCounts={
 ...Object.fromEntries(['REZ-1-006','REZ-1-028','REZ-1-037','REZ-1-068','REZ-1-082',
  'REZ-1-102','REZ-1-105','REZ-1-110','REZ-1-007','REZ-1-024','REZ-1-012'].map(id=>[id,4])),
 'REZ-1-029':2,'REZ-1-008':2,'REZ-1-013':2
};
const batch=seed=>newUniversalMatch(packs,{decks:[batchCounts,batchCounts],first:0,seed});
test('empty-field Step, rest energy, Felt, events and front Subaru resolve',()=>{
 assert.deepEqual(validateUniversalDeck(pack,batchCounts),[]);
 let s=batch(4101);
 const felt=pull(s,0,'REZ-1-028');
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['REZ-1-028']),0);
 s.players[0].energy[0]=felt;
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['REZ-1-028']),2);
 s.players[0].energy[0]=null;
 s.players[0].front[0]=felt;
 felt.ready=true;
 s=reach(s,'move');
 const step=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===felt.uid);
 assert.ok(step);
 s=dispatchUniversalAction(packs,s,step);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===felt.uid),true);

 for(const id of ['REZ-1-006','REZ-1-037','REZ-1-082']){
  s=batch(4102);
  const battery=pull(s,0,id);
  battery.ready=true;
  s.players[0].energy[0]=battery;
  s=reach(s,'main');
  const color=pack.cards[id].color;
  assert.equal(universalEnergyByColor(packs,s,0)[color]||0,0);
  const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===battery.uid&&a.mode==='selfRestEnergyRetire');
  assert.ok(act,id);
  s=dispatchUniversalAction(packs,s,act);
  assert.equal(s.players[0].energy[0].ready,false);
  assert.equal(universalEnergyByColor(packs,s,0)[color],1);
  s.players[0].energy[0].ready=true;
  assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===battery.uid&&a.type==='activate'),false);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.players[0].energy[0],null);
  assert.equal(s.players[0].outside.some(c=>c.uid===battery.uid),true);
  assert.equal(universalEnergyByColor(packs,s,0)[color]||0,0);
 }

 s=batch(4103);
 const frontRam=pull(s,0,'REZ-1-006');
 frontRam.ready=true;
 s.players[0].front[0]=frontRam;
 s=reach(s,'main');
 const frontAct=legalUniversalActions(packs,s).find(a=>a.uid===frontRam.uid&&a.mode==='selfRestEnergyRetire');
 assert.ok(frontAct);
 s=dispatchUniversalAction(packs,s,frontAct);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(universalEnergyByColor(packs,s,0).yellow||0,0);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===frontRam.uid),true);

 s=batch(4104);
 const reinhard=pull(s,0,'REZ-1-102');
 s.players[0].front[0]=reinhard;
 assert.equal(universalBp(packs,s,reinhard),3000);
 const named=pull(s,0,'REZ-1-028');
 s.players[0].energy[0]=named;
 assert.equal(universalBp(packs,s,reinhard),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,reinhard),3000);
 s.active=0;
 s.players[0].energy[0]=pull(s,0,'REZ-1-007');
 assert.equal(universalBp(packs,s,reinhard),3000);

 s=batch(4105);
 const emilia=pull(s,0,'REZ-1-105');
 s.players[0].front[0]=emilia;
 const payA=pull(s,0,'REZ-1-024'),payB=pull(s,0,'REZ-1-007');
 payA.ready=false;payB.ready=false;
 s.players[0].energy[0]=payA;
 s.players[0].energy[1]=payB;
 assert.equal(universalBp(packs,s,emilia),3000);
 s=reach(s,'main');
 const event=pull(s,0,'REZ-1-029');
 s.players[0].hand.push(event);
 const cast=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(cast);
 s=dispatchUniversalAction(packs,s,cast);
 if(s.pending?.kind==='effect-recover-ap')
  s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:null});
 assert.equal(s.pending,null);
 const live=s.players[0].front.find(c=>c?.uid===emilia.uid);
 assert.equal(universalBp(packs,s,live),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,live),3000);

 s=batch(4106);
 const rem=pull(s,0,'REZ-1-110');
 rem.ready=false;
 s.players[0].energy[0]=rem;
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
 const subaru=pull(s,0,'REZ-1-068');
 s.players[0].front[0]=subaru;
 assert.equal(universalEnergyByColor(packs,s,0).blue,1);
 s.players[0].front[0]=null;
 s.players[0].energy[1]=subaru;
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
});

const thirdCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086'].map(id=>[id,4])),
 ...Object.fromEntries(['REZ-1-005','REZ-1-009','REZ-1-025','REZ-1-083'].map(id=>[id,2])),
 ...Object.fromEntries(['REZ-1-018','REZ-1-049','REZ-1-050','REZ-1-057','REZ-1-069','REZ-1-111'].map(id=>[id,1]))
};
const third=seed=>newUniversalMatch(packs,{decks:[thirdCounts,thirdCounts],first:0,seed});
function fuel(s,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,0,id);
  card.ready=true;
  s.players[0].energy[i]=card;
 });
}
function playHand(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid);
 assert.ok(action,id);
 return [dispatchUniversalAction(packs,s,action),card];
}
function setTop(s,p,ids){
 const pl=s.players[p];
 const cards=ids.map(id=>{
  let index=pl.deck.findIndex(c=>c.cardId===id);
  if(index<0){
   for(const zone of ['hand','life','outside']){
    const atZone=pl[zone].findIndex(c=>c.cardId===id);
    if(atZone<0)continue;
    const swap=pl.deck.findIndex(c=>!ids.includes(c.cardId));
    const moved=pl[zone][atZone];
    pl[zone][atZone]=pl.deck[swap];
    pl.deck[swap]=moved;
    index=swap;
    break;
   }
  }
  if(index<0)throw Error('deck missing '+id);
  return pl.deck.splice(index,1)[0];
 });
 pl.deck.unshift(...cards);
 return cards;
}
function order(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}

test('buffs, top windows, name search and the Crusch alias resolve',()=>{
 assert.deepEqual(validateUniversalDeck(pack,thirdCounts),[]);
 let s=third(4201);
 const ally=pull(s,0,'REZ-1-007');
 s.players[0].front[0]=ally;
 s=reach(s,'main');
 let [buffed,petra]=playHand(s,'REZ-1-005');
 assert.equal(buffed.pending.kind,'effect-buff-own');
 assert.ok(buffed.pending.choices.includes(ally.uid));
 assert.equal(buffed.pending.choices.includes(petra.uid),false);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,buffed,at(buffed,0,ally.uid)),3000);
 let skipped=third(4202);
 const other=pull(skipped,0,'REZ-1-007');
 skipped.players[0].front[0]=other;
 skipped=reach(skipped,'main');
 [skipped]=playHand(skipped,'REZ-1-005');
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,at(skipped,0,other.uid)),2000);
 let alone=third(4203);
 alone=reach(alone,'main');
 [alone,petra]=playHand(alone,'REZ-1-005');
 assert.equal(alone.pending,null);
 assert.equal(universalBp(packs,alone,at(alone,0,petra.uid)),500);

 s=third(4204);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-012']);
 const low=pull(s,1,'REZ-1-007'),high=pull(s,1,'REZ-1-014');
 s.players[1].front[0]=low;
 s.players[1].front[1]=high;
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-018');
 assert.equal(s.pending.kind,'effect-target');
 assert.deepEqual(s.pending.choices,[high.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(packs,s,at(s,1,high.uid)),500);
 assert.equal(universalBp(packs,s,at(s,1,low.uid)),2000);
 let passed=third(4205);
 fuel(passed,['REZ-1-007','REZ-1-008','REZ-1-012']);
 const wall=pull(passed,1,'REZ-1-014');
 passed.players[1].front[0]=wall;
 passed=reach(passed,'main');
 [passed]=playHand(passed,'REZ-1-018');
 passed=dispatchUniversalAction(packs,passed,{type:'chooseTarget',uid:null});
 assert.equal(universalBp(packs,passed,at(passed,1,wall.uid)),2500);

 s=third(4206);
 fuel(s,['REZ-1-007']);
 const window=setTop(s,0,['REZ-1-022','REZ-1-043','REZ-1-068']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-025');
 assert.equal(s.pending.kind,'effect-top-inspect');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:window[0].uid});
 s=order(s,[window[2].uid,window[1].uid]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 let kept=third(4207);
 fuel(kept,['REZ-1-007']);
 const all=setTop(kept,0,['REZ-1-022','REZ-1-068','REZ-1-072']);
 kept=reach(kept,'main');
 [kept]=playHand(kept,'REZ-1-025');
 kept=dispatchUniversalAction(packs,kept,{type:'chooseInspectedOutside',uid:null});
 kept=order(kept,[all[1].uid,all[0].uid,all[2].uid]);
 assert.equal(kept.players[0].outside.some(c=>all.some(card=>card.uid===c.uid)),false);
 assert.deepEqual(kept.players[0].deck.slice(0,3).map(c=>c.uid),[all[1].uid,all[0].uid,all[2].uid]);

 s=third(4208);
 s=reach(s,'main');
 const pair=setTop(s,0,['REZ-1-022','REZ-1-068']);
 [s]=playHand(s,'REZ-1-083');
 assert.equal(s.pending.kind,'effect-top-inspect');
 assert.equal(s.pending.uids.length,2);
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:pair[1].uid});
 s=order(s,[pair[0].uid]);
 assert.equal(s.players[0].deck[0].uid,pair[0].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===pair[1].uid),true);

 s=third(4209);
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const seen=setTop(s,0,['REZ-1-022','REZ-1-068']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-050');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:seen[0].uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 s=order(s,[seen[1].uid]);
 assert.equal(s.players[0].outside.some(c=>c.uid===seen[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,seen[1].uid);
 let both=third(4210);
 fuel(both,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const gone=setTop(both,0,['REZ-1-022','REZ-1-072']);
 both=reach(both,'main');
 [both]=playHand(both,'REZ-1-050');
 both=dispatchUniversalAction(packs,both,{type:'chooseInspectedOutside',uid:gone[0].uid});
 both=dispatchUniversalAction(packs,both,{type:'chooseInspectedOutside',uid:gone[1].uid});
 assert.equal(both.pending,null);
 assert.equal(both.players[0].outside.filter(c=>gone.some(card=>card.uid===c.uid)).length,2);

 s=third(4211);
 fuel(s,['REZ-1-043']);
 const alias=pack.cards['REZ-1-111'];
 assert.equal(cardHasName(alias,'クルシュ・カルステン'),true);
 assert.equal(cardHasName(alias,'フェリス'),true);
 assert.equal(cardHasName(alias,'ラム'),false);
 const top=setTop(s,0,['REZ-1-022','REZ-1-068']);
 s=reach(s,'main');
 let crusch;
 [s,crusch]=playHand(s,'REZ-1-111');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 s=order(s,[top[1].uid,top[0].uid]);
 assert.equal(at(s,0,crusch.uid).cardId,'REZ-1-111');
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[top[1].uid,top[0].uid]);

 s=third(4212);
 fuel(s,['REZ-1-014']);
 const names=setTop(s,0,['REZ-1-007','REZ-1-022','REZ-1-043']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-009');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[names[0].uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 s=order(s,[names[2].uid,names[1].uid,names[0].uid]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===names[0].uid),false);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[names[2].uid,names[1].uid,names[0].uid]);
 let added=third(4213);
 fuel(added,['REZ-1-014']);
 const found=setTop(added,0,['REZ-1-022','REZ-1-007','REZ-1-043']);
 added=reach(added,'main');
 [added]=playHand(added,'REZ-1-009');
 added=dispatchUniversalAction(packs,added,{type:'chooseTopFiltered',uid:found[1].uid});
 added=order(added,[found[0].uid,found[2].uid]);
 assert.equal(added.pending.kind,'effect-discard');
 assert.equal(added.publicReveals.at(-1).cardId,'REZ-1-007');
 const dumped=added.players[0].hand.find(c=>c.uid!==found[1].uid);
 added=dispatchUniversalAction(packs,added,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(added.players[0].hand.some(c=>c.uid===found[1].uid),true);
 assert.equal(added.players[0].outside.some(c=>c.uid===dumped.uid),true);

 s=third(4214);
 fuel(s,['REZ-1-043']);
 const rem=setTop(s,0,['REZ-1-068','REZ-1-022','REZ-1-012']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-049');
 assert.deepEqual(s.pending.choices.slice().sort(),[rem[0].uid,rem[2].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:rem[2].uid});
 s=order(s,[rem[1].uid,rem[0].uid]);
 assert.equal(s.pending.kind,'effect-discard');

 s=third(4215);
 fuel(s,['REZ-1-086']);
 const library=setTop(s,0,['REZ-1-072','REZ-1-022','REZ-1-068']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-069');
 assert.deepEqual(s.pending.choices.slice().sort(),[library[0].uid,library[2].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 s=order(s,[library[1].uid,library[0].uid,library[2].uid]);
 assert.equal(s.pending,null);

 s=third(4216);
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const aliasWindow=setTop(s,0,['REZ-1-111','REZ-1-043','REZ-1-022','REZ-1-007']);
 s=reach(s,'main');
 [s]=playHand(s,'REZ-1-057');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices.slice().sort(),[aliasWindow[0].uid,aliasWindow[1].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:aliasWindow[0].uid});
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-111');
 s=order(s,[aliasWindow[3].uid,aliasWindow[2].uid,aliasWindow[1].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.some(c=>c.uid===aliasWindow[0].uid),true);
});

const gateCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-010','REZ-1-075'].map(id=>[id,4])),
 'REZ-1-026':1,'REZ-1-029':1
};
const gate=seed=>newUniversalMatch(packs,{decks:[gateCounts,gateCounts],first:0,seed});
test('name union, event-used draw and own-effect entry draw resolve',()=>{
 assert.equal(Object.values(gateCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,gateCounts),[]);
 let s=gate(4301);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-022']);
 const rem=pull(s,0,'REZ-1-012');
 s.players[0].front[0]=rem;
 s=reach(s,'main');
 const deck=s.players[0].deck.length;
 [s]=playHand(s,'REZ-1-010');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-2);
 let quiet=gate(4302);
 fuel(quiet,['REZ-1-007','REZ-1-008','REZ-1-022']);
 quiet.players[0].front[0]=pull(quiet,0,'REZ-1-036');
 quiet=reach(quiet,'main');
 const quietDeck=quiet.players[0].deck.length;
 [quiet]=playHand(quiet,'REZ-1-010');
 assert.equal(quiet.players[0].deck.length,quietDeck-1);

 s=gate(4303);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-022']);
 s=reach(s,'main');
 const beforeEvent=s.players[0].deck.length;
 [s]=playHand(s,'REZ-1-026');
 assert.equal(s.players[0].deck.length,beforeEvent-1);
 let used=gate(4304);
 fuel(used,['REZ-1-007','REZ-1-008','REZ-1-022']);
 used=reach(used,'main');
 const event=pull(used,0,'REZ-1-029');
 used.players[0].hand.push(event);
 used=dispatchUniversalAction(packs,used,legalUniversalActions(packs,used).find(a=>a.type==='event'&&a.uid===event.uid));
 if(used.pending?.kind==='effect-recover-ap'){
  const rested=used.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  used=dispatchUniversalAction(packs,used,{type:'chooseApRecovery',uid:rested.uid});
 }
 const afterEvent=used.players[0].deck.length;
 [used]=playHand(used,'REZ-1-026');
 assert.equal(used.pending,null);
 assert.equal(used.players[0].deck.length,afterEvent-2);

 s=gate(4305);
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 s=reach(s,'main');
 const paidDeck=s.players[0].deck.length;
 let beatrice;
 [s,beatrice]=playHand(s,'REZ-1-075');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,paidDeck-1);
 assert.equal(at(s,0,beatrice.uid).ready,false);

 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-entry-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-010']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-075']),
  lab('LAB-YEL','yellow'),lab('LAB-PUR','purple'),
  {id:'LAB-ROS',name:'ロズワール・L・メイザース',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-DEPLOY-BEA',name:'Deploy Beatrice',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',name:'ベアトリス',color:'purple',energy:4,ap:1,optional:true}]}},
  ...['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G'].map(id=>lab(id,'yellow'))
 ]});
 const fixtureCounts={
  'REZ-1-010':4,'REZ-1-075':4,'LAB-YEL':4,'LAB-PUR':4,'LAB-ROS':4,'LAB-DEPLOY-BEA':4,
  'LAB-A':4,'LAB-B':4,'LAB-C':4,'LAB-D':4,'LAB-E':4,'LAB-F':4,'LAB-G':2
 };
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let own=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4306});
 const outside=pull(own,0,'REZ-1-075');
 own.players[0].outside.push(outside);
 own=dispatchUniversalAction(fp,own,{type:'next'});
 own=dispatchUniversalAction(fp,own,{type:'next'});
 assert.equal(own.phase,'main');
 const caster=pull(own,0,'LAB-DEPLOY-BEA');
 own.players[0].hand.push(caster);
 const ownDeck=own.players[0].deck.length;
 own=dispatchUniversalAction(fp,own,{type:'event',uid:caster.uid});
 assert.equal(own.pending.kind,'effect-outside-rest');
 own=dispatchUniversalAction(fp,own,{type:'chooseOutsideRest',uid:outside.uid,line:'energy',slot:0});
 assert.equal(own.players[0].energy.some(c=>c?.uid===outside.uid),true);
 assert.equal(own.players[0].deck.length,ownDeck-1);

 let named=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4307});
 const yellows=['LAB-YEL','LAB-YEL','LAB-A'].map(id=>pull(named,0,id));
 yellows.forEach((card,i)=>{card.ready=true;named.players[0].energy[i]=card;});
 const roswaal=pull(named,0,'LAB-ROS');
 named.players[0].front[0]=roswaal;
 named=dispatchUniversalAction(fp,named,{type:'next'});
 named=dispatchUniversalAction(fp,named,{type:'next'});
 assert.equal(named.phase,'main');
 const namedDeck=named.players[0].deck.length;
 const ram=pull(named,0,'REZ-1-010');
 named.players[0].hand.push(ram);
 const play=legalUniversalActions(fp,named).find(a=>a.type==='play'&&a.uid===ram.uid);
 assert.ok(play);
 named=dispatchUniversalAction(fp,named,play);
 assert.equal(named.players[0].deck.length,namedDeck-2);
});

const apCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-010'].map(id=>[id,4])),
 'REZ-1-004':4,'REZ-1-029':2
};
const apDeck=seed=>newUniversalMatch(packs,{decks:[apCounts,apCounts],first:0,seed});
function ownMain(s,turn){
 let guard=0;
 while(!(s.active===0&&s.players[0].ownTurns>=turn&&s.phase==='main'&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand[0];
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid:hand.uid});
  }else{
   const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=dispatchUniversalAction(packs,s,next);
  }
  assert.ok(++guard<48,'turn did not reach main');
 }
 return s;
}
test('draw plus event-gated AP recovery resolves only after an event',()=>{
 assert.equal(Object.values(apCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,apCounts),[]);
 const shell={id:'AP-GATE',name:'Gate',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...shell,effects:{onPlay:[
  {op:'recoverAp',count:2,require:'ownEventUsed'}]}}]}),/invalid AP recovery/);
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'recoverAp',count:1,require:'ownEventUsed'}]}}]}),/character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-top',cards:[{...shell,effects:{onPlay:[
  {op:'searchTopOneBottomDiscard',count:8,filter:{field:'name',value:'x'}}]}}]}),/invalid top-N/);

 let quiet=apDeck(4401);
 fuel(quiet,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014']);
 quiet=ownMain(quiet,3);
 assert.equal(quiet.players[0].apCards.filter(c=>c.ready).length,3);
 const before=quiet.players[0].deck.length;
 let beatrice;
 [quiet,beatrice]=playHand(quiet,'REZ-1-004');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,before-2);
 assert.equal(at(quiet,0,beatrice.uid).ready,false);

 let used=apDeck(4402);
 fuel(used,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014']);
 used=ownMain(used,3);
 const event=pull(used,0,'REZ-1-029');
 used.players[0].hand.push(event);
 used=dispatchUniversalAction(packs,used,legalUniversalActions(packs,used).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(used.pending.kind,'effect-recover-ap');
 assert.equal(used.pending.remaining,2);
 used=dispatchUniversalAction(packs,used,{type:'chooseApRecovery',uid:null});
 assert.equal(used.players[0].apCards.filter(c=>c.ready).length,2);
 const drawn=used.players[0].deck.length;
 [used]=playHand(used,'REZ-1-004');
 assert.equal(used.pending.kind,'effect-recover-ap');
 assert.equal(used.pending.remaining,1);
 assert.equal(used.players[0].deck.length,drawn-2);
 const rested=used.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 used=dispatchUniversalAction(packs,used,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(used.pending,null);
 assert.equal(used.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
});

const sevenCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086'].map(id=>[id,4])),
 'REZ-1-091':4,'REZ-1-010':4,'REZ-1-075':2
};
const seven=seed=>newUniversalMatch(packs,{decks:[sevenCounts,sevenCounts],first:0,seed});
test('top seven name search orders a miss and takes the printed trial name',()=>{
 assert.equal(Object.values(sevenCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,sevenCounts),[]);
 let s=seven(4411);
 const missed=setTop(s,0,['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072']);
 s=reach(s,'main');
 const top=s.players[0].deck.slice(0,7).map(c=>c.uid);
 [s]=playHand(s,'REZ-1-091');
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,top);
 assert.deepEqual(missed.map(c=>c.uid),top);
 s=order(s,top);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-7).map(c=>c.uid),top);

 const trialName=REZERO_BY_ID['REZ-1-098'].nameJa;
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I','LAB-J','LAB-K'];
 const fixture=createUniversalPack({id:'rezero-trial-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-091']),
  {id:'LAB-TRIAL',name:trialName,color:'purple',type:'event',energy:2,ap:1,bp:0,gen:0,
   traits:[],trigger:'draw',implementation:'vanilla',effects:{}},
  ...labs.map(id=>lab(id,'purple'))
 ]});
 const fixtureCounts={'REZ-1-091':4,'LAB-TRIAL':4,
  ...Object.fromEntries(labs.slice(0,10).map(id=>[id,4])),'LAB-K':2};
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let hit=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4412});
 const found=setTop(hit,0,['LAB-TRIAL','LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F']);
 hit=dispatchUniversalAction(fp,hit,{type:'next'});
 hit=dispatchUniversalAction(fp,hit,{type:'next'});
 assert.equal(hit.phase,'main');
 const echidna=pull(hit,0,'REZ-1-091');
 hit.players[0].hand.push(echidna);
 const play=legalUniversalActions(fp,hit).find(a=>a.type==='play'&&a.uid===echidna.uid);
 assert.ok(play);
 hit=dispatchUniversalAction(fp,hit,play);
 assert.equal(hit.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(hit.pending.choices,[found[0].uid]);
 hit=dispatchUniversalAction(fp,hit,{type:'chooseTopFiltered',uid:found[0].uid});
 assert.equal(hit.publicReveals.at(-1).cardId,'LAB-TRIAL');
 for(const card of found.slice(1)){
  assert.equal(hit.pending.kind,'effect-top-order');
  hit=dispatchUniversalAction(fp,hit,{type:'chooseTopOrder',uid:card.uid});
 }
 assert.equal(hit.pending.kind,'effect-discard');
 const dumped=hit.players[0].hand.find(c=>c.uid!==found[0].uid);
 hit=dispatchUniversalAction(fp,hit,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(hit.players[0].hand.some(c=>c.uid===found[0].uid),true);
 assert.equal(hit.players[0].outside.some(c=>c.uid===dumped.uid),true);
});

const pairCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-021'].map(id=>[id,4])),
 'REZ-1-010':4,'REZ-1-075':2
};
const pair=seed=>newUniversalMatch(packs,{decks:[pairCounts,pairCounts],first:0,seed});
function frontOnce(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.mode==='frontOnce'&&a.uid===uid);
}
function playFront(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.ok(action,id+' front');
 return [dispatchUniversalAction(packs,s,action),card];
}
test('Roswaal draws and discards only while Ram and Rem are both on the field',()=>{
 assert.equal(Object.values(pairCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,pairCounts),[]);
 let onlyRem=pair(4501);
 fuel(onlyRem,['REZ-1-014','REZ-1-022','REZ-1-022','REZ-1-036']);
 onlyRem=reach(onlyRem,'main');
 let roswaal;
 [onlyRem,roswaal]=playFront(onlyRem,'REZ-1-021');
 assert.equal(at(onlyRem,0,roswaal.uid)&&onlyRem.players[0].front.some(c=>c?.uid===roswaal.uid),true);
 assert.equal(frontOnce(onlyRem,roswaal.uid),false);
 const ram=pull(onlyRem,0,'REZ-1-007');
 onlyRem.players[0].front[1]=ram;
 assert.equal(frontOnce(onlyRem,roswaal.uid),true);

 let onlyRam=pair(4502);
 fuel(onlyRam,['REZ-1-007','REZ-1-008','REZ-1-022','REZ-1-022']);
 onlyRam=reach(onlyRam,'main');
 [onlyRam,roswaal]=playFront(onlyRam,'REZ-1-021');
 assert.equal(frontOnce(onlyRam,roswaal.uid),false);

 let both=pair(4503);
 fuel(both,['REZ-1-014','REZ-1-007','REZ-1-022','REZ-1-008']);
 both=reach(both,'main');
 const deck=both.players[0].deck.length;
 [both,roswaal]=playFront(both,'REZ-1-021');
 assert.equal(frontOnce(both,roswaal.uid),true);
 both=dispatchUniversalAction(packs,both,{type:'activate',uid:roswaal.uid,mode:'frontOnce'});
 assert.equal(both.pending.kind,'effect-discard');
 assert.equal(both.players[0].deck.length,deck-2);
 const dumped=both.players[0].hand[0];
 both=dispatchUniversalAction(packs,both,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(both.pending,null);
 assert.equal(both.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(frontOnce(both,roswaal.uid),false);

 let foe=pair(4504);
 fuel(foe,['REZ-1-014','REZ-1-022','REZ-1-022','REZ-1-036']);
 foe.players[1].front[0]=pull(foe,1,'REZ-1-007');
 foe=reach(foe,'main');
 [foe,roswaal]=playFront(foe,'REZ-1-021');
 assert.equal(frontOnce(foe,roswaal.uid),false);
});

const manorCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072','REZ-1-086','REZ-1-108'].map(id=>[id,4])),
 'REZ-1-010':4,'REZ-1-075':2
};
const manor=seed=>newUniversalMatch(packs,{decks:[manorCounts,manorCounts],first:0,seed});
function playEnergy(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy');
 assert.ok(action,id+' energy');
 return [dispatchUniversalAction(packs,s,action),card];
}
test('Roswaal mansion rests once and places the top card on top or bottom',()=>{
 assert.equal(Object.values(manorCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,manorCounts),[]);
 let s=manor(4601);
 fuel(s,['REZ-1-007','REZ-1-008','REZ-1-022']);
 s=reach(s,'main');
 let house;
 [s,house]=playEnergy(s,'REZ-1-108');
 assert.equal(s.players[0].energy.some(c=>c?.uid===house.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===house.uid),false);
 assert.equal(at(s,0,house.uid).ready,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===house.uid),false);
 s=ownMain(s,2);
 assert.equal(at(s,0,house.uid).ready,true);
 const seen=s.players[0].deck[0].uid;
 const next=s.players[0].deck[1].uid;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===house.uid&&a.mode==='selfRestThen');
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(at(s,0,house.uid).ready,false);
 assert.equal(s.pending.kind,'private-top-place');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,seen);
 assert.equal(s.players[0].deck[1].uid,next);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===house.uid),false);
 at(s,0,house.uid).ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===house.uid),false);

 let bottom=manor(4602);
 fuel(bottom,['REZ-1-007','REZ-1-008','REZ-1-022']);
 bottom=reach(bottom,'main');
 [bottom,house]=playEnergy(bottom,'REZ-1-108');
 bottom=ownMain(bottom,2);
 const first=bottom.players[0].deck[0].uid;
 bottom=dispatchUniversalAction(packs,bottom,{type:'activate',uid:house.uid,mode:'selfRestThen'});
 assert.equal(bottom.pending.kind,'private-top-place');
 const before=bottom.players[0].deck.map(c=>c.uid);
 bottom=dispatchUniversalAction(packs,bottom,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(bottom.pending,null);
 assert.equal(bottom.players[0].deck.at(-1).uid,first);
 assert.deepEqual(bottom.players[0].deck.map(c=>c.uid),[...before.slice(1),before[0]]);

 let empty=manor(4603);
 fuel(empty,['REZ-1-007','REZ-1-008','REZ-1-022']);
 empty=reach(empty,'main');
 [empty,house]=playEnergy(empty,'REZ-1-108');
 empty=ownMain(empty,2);
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 empty=dispatchUniversalAction(packs,empty,{type:'activate',uid:house.uid,mode:'selfRestThen'});
 assert.equal(empty.pending,null);
 assert.equal(at(empty,0,house.uid).ready,false);
});

const eitherCounts={
 ...Object.fromEntries(['REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014','REZ-1-022',
  'REZ-1-036','REZ-1-043','REZ-1-037','REZ-1-068','REZ-1-086','REZ-1-042'].map(id=>[id,4])),
 'REZ-1-041':4,'REZ-1-010':2
};
const either=seed=>newUniversalMatch(packs,{decks:[eitherCounts,eitherCounts],first:0,seed});
test('Felix buffs one other character on either field and Patrasche needs a blue zero-cost Subaru',()=>{
 assert.equal(Object.values(eitherCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,eitherCounts),[]);
 const shell={id:'EITHER',name:'Gate',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-either',cards:[{...shell,effects:{onPlay:[
  {op:'buffEitherOther',bp:1000}]}}]}),/invalid either-field/);
 assert.throws(()=>createUniversalPack({id:'bad-either',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'buffEitherOther',bp:1000,optional:true}]}}]}),/character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-print',cards:[{...shell,passiveBonuses:[{
  condition:{kind:'ownPrintedCharacter',turn:'own',zone:'front',excludeSelf:false,
   name:'ナツキ・スバル',color:'blue'},bp:1000}]}]}),/invalid or cyclic passive condition/);

 let alone=either(4701);
 alone=reach(alone,'main');
 let felix;
 [alone,felix]=playHand(alone,'REZ-1-042');
 assert.equal(alone.pending,null);
 assert.equal(universalBp(packs,alone,at(alone,0,felix.uid)),500);

 let sided=either(4702);
 const ally=pull(sided,0,'REZ-1-007');
 const energyAlly=pull(sided,0,'REZ-1-008');
 const enemy=pull(sided,1,'REZ-1-014');
 const enemyEnergy=pull(sided,1,'REZ-1-012');
 sided.players[0].front[0]=ally;
 sided.players[0].energy[0]=energyAlly;
 sided.players[1].front[0]=enemy;
 sided.players[1].energy[0]=enemyEnergy;
 sided=reach(sided,'main');
 [sided,felix]=playHand(sided,'REZ-1-042');
 assert.equal(sided.pending.kind,'effect-buff-either');
 assert.equal(sided.pending.optional,true);
 assert.equal(sided.pending.bp,1000);
 for(const uid of [ally.uid,energyAlly.uid,enemy.uid,enemyEnergy.uid])
  assert.ok(sided.pending.choices.includes(uid),uid);
 assert.equal(sided.pending.choices.includes(felix.uid),false);
 assert.equal(sided.players[0].energy.some(c=>c?.uid===energyAlly.uid),true);
 const allyBp=universalBp(packs,sided,at(sided,0,ally.uid));
 const energyBp=universalBp(packs,sided,at(sided,0,energyAlly.uid));
 const enemyBp=universalBp(packs,sided,at(sided,1,enemy.uid));
 const enemyEnergyBp=universalBp(packs,sided,at(sided,1,enemyEnergy.uid));
 sided=dispatchUniversalAction(packs,sided,{type:'chooseEitherBuff',uid:energyAlly.uid});
 assert.equal(sided.pending,null);
 assert.equal(universalBp(packs,sided,at(sided,0,energyAlly.uid)),energyBp+1000);
 assert.equal(universalBp(packs,sided,at(sided,0,ally.uid)),allyBp);
 assert.equal(universalBp(packs,sided,at(sided,1,enemy.uid)),enemyBp);
 assert.equal(universalBp(packs,sided,at(sided,1,enemyEnergy.uid)),enemyEnergyBp);

 let foe=either(4703);
 const wall=pull(foe,1,'REZ-1-014');
 const friend=pull(foe,0,'REZ-1-007');
 foe.players[1].front[0]=wall;
 foe.players[0].front[0]=friend;
 foe=reach(foe,'main');
 [foe,felix]=playHand(foe,'REZ-1-042');
 const wallBp=universalBp(packs,foe,at(foe,1,wall.uid));
 const friendBp=universalBp(packs,foe,at(foe,0,friend.uid));
 foe=dispatchUniversalAction(packs,foe,{type:'chooseEitherBuff',uid:wall.uid});
 assert.equal(universalBp(packs,foe,at(foe,1,wall.uid)),wallBp+1000);
 assert.equal(universalBp(packs,foe,at(foe,0,friend.uid)),friendBp);

 let skipped=either(4704);
 const kept=pull(skipped,0,'REZ-1-007');
 const keptFoe=pull(skipped,1,'REZ-1-014');
 skipped.players[0].front[0]=kept;
 skipped.players[1].front[0]=keptFoe;
 skipped=reach(skipped,'main');
 [skipped]=playHand(skipped,'REZ-1-042');
 const keptBp=universalBp(packs,skipped,at(skipped,0,kept.uid));
 const keptFoeBp=universalBp(packs,skipped,at(skipped,1,keptFoe.uid));
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseEitherBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,at(skipped,0,kept.uid)),keptBp);
 assert.equal(universalBp(packs,skipped,at(skipped,1,keptFoe.uid)),keptFoeBp);

 let patrasche=either(4705);
 fuel(patrasche,['REZ-1-043','REZ-1-043','REZ-1-043']);
 patrasche=reach(patrasche,'main');
 let horse;
 [patrasche,horse]=playFront(patrasche,'REZ-1-041');
 assert.equal(patrasche.pending,null);
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 const handSubaru=pull(patrasche,0,'REZ-1-037');
 patrasche.players[0].hand.push(handSubaru);
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.players[0].hand.pop();
 patrasche.players[0].front[1]=handSubaru;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),4000);
 patrasche.players[0].front[1]=null;
 patrasche.players[0].energy[3]=handSubaru;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.players[0].energy[3]=null;
 patrasche.players[1].front[0]=handSubaru;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.players[1].front[0]=null;
 patrasche.players[0].front[1]=handSubaru;
 patrasche.active=1;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);
 patrasche.active=0;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),4000);
 const purple=pull(patrasche,0,'REZ-1-068');
 patrasche.players[0].front[2]=purple;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),4000);
 patrasche.players[0].front[1]=null;
 assert.equal(universalBp(packs,patrasche,at(patrasche,0,horse.uid)),3000);

 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I','LAB-J'];
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-printed-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-041']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-043']),
  {id:'LAB-SUBARU',name:'ナツキ・スバル',color:'blue',type:'character',energy:1,ap:1,bp:1000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...labs.map(id=>lab(id,'blue'))
 ]});
 const fixtureCounts={'REZ-1-041':4,'REZ-1-043':4,'LAB-SUBARU':2,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 let mismatch=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed:4706});
 ['REZ-1-043','REZ-1-043','REZ-1-043'].forEach((id,i)=>{
  const card=pull(mismatch,0,id);
  card.ready=true;
  mismatch.players[0].energy[i]=card;
 });
 mismatch=dispatchUniversalAction(fp,mismatch,{type:'next'});
 mismatch=dispatchUniversalAction(fp,mismatch,{type:'next'});
 assert.equal(mismatch.phase,'main');
 const heavy=pull(mismatch,0,'LAB-SUBARU');
 mismatch.players[0].front[0]=heavy;
 const printed=pull(mismatch,0,'REZ-1-041');
 mismatch.players[0].hand.push(printed);
 const play=legalUniversalActions(fp,mismatch).find(a=>a.type==='play'&&a.uid===printed.uid&&a.line==='front');
 assert.ok(play);
 mismatch=dispatchUniversalAction(fp,mismatch,play);
 assert.equal(universalBp(fp,mismatch,at(mismatch,0,printed.uid)),3000);
 assert.equal(mismatch.players[0].front.some(c=>c?.uid===heavy.uid),true);
});

const mimiCounts={
 ...Object.fromEntries(['REZ-1-045','REZ-1-075','REZ-1-014','REZ-1-029','REZ-1-007',
  'REZ-1-022','REZ-1-012','REZ-1-036','REZ-1-043','REZ-1-086','REZ-1-008'].map(id=>[id,4])),
 'REZ-1-010':4,'REZ-1-056':2
};
const mimi=seed=>newUniversalMatch(packs,{decks:[mimiCounts,mimiCounts],first:0,seed});
function revealAct(s,uid){
 return legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='revealBottomBuff'&&a.uid===uid);
}
test('Mimi reveals one hand card to the bottom and buffs only a 4000 character',()=>{
 assert.equal(Object.values(mimiCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,mimiCounts),[]);
 const shell={id:'REVEAL',name:'Gate',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-reveal',cards:[{...shell,mainAbility:{
  op:'revealHandBottomBuff',oncePerTurn:true,bp:2500}}]}),/unsupported main/);

 let high=mimi(4801);
 high=reach(high,'main');
 let actor;
 [high,actor]=playFront(high,'REZ-1-045');
 assert.equal(at(high,0,actor.uid).ready,false);
 const big=pull(high,0,'REZ-1-075');
 high.players[0].hand.push(big);
 const before=high.players[0].deck.map(c=>c.uid);
 const act=revealAct(high,actor.uid);
 assert.ok(act);
 high=dispatchUniversalAction(packs,high,act);
 assert.equal(high.pending.kind,'effect-reveal-bottom');
 assert.ok(high.pending.choices.includes(big.uid));
 assert.equal(revealAct(high,actor.uid),undefined);
 high=dispatchUniversalAction(packs,high,{type:'chooseRevealBottom',uid:big.uid});
 assert.equal(high.pending,null);
 assert.equal(high.players[0].deck.at(-1).uid,big.uid);
 assert.deepEqual(high.players[0].deck.slice(0,-1).map(c=>c.uid),before);
 assert.equal(high.players[0].hand.some(c=>c.uid===big.uid),false);
 assert.equal(high.publicReveals.at(-1).cardId,'REZ-1-075');
 assert.equal(high.publicReveals.at(-1).kind,'hand-to-bottom');
 assert.equal(universalBp(packs,high,at(high,0,actor.uid)),4000);
 assert.equal(revealAct(high,actor.uid),undefined);
 high=ownMain(high,2);
 const again=pull(high,0,'REZ-1-075');
 high.players[0].hand.push(again);
 assert.ok(revealAct(high,actor.uid));

 let low=mimi(4802);
 low=reach(low,'main');
 [low,actor]=playFront(low,'REZ-1-045');
 const small=pull(low,0,'REZ-1-014');
 low.players[0].hand.push(small);
 low=dispatchUniversalAction(packs,low,revealAct(low,actor.uid));
 low=dispatchUniversalAction(packs,low,{type:'chooseRevealBottom',uid:small.uid});
 assert.equal(low.players[0].deck.at(-1).uid,small.uid);
 assert.equal(low.publicReveals.at(-1).cardId,'REZ-1-014');
 assert.equal(universalBp(packs,low,at(low,0,actor.uid)),1500);

 let event=mimi(4803);
 event=reach(event,'main');
 [event,actor]=playEnergy(event,'REZ-1-045');
 assert.equal(event.players[0].energy.some(c=>c?.uid===actor.uid),true);
 const spell=pull(event,0,'REZ-1-029');
 event.players[0].hand.push(spell);
 event=dispatchUniversalAction(packs,event,revealAct(event,actor.uid));
 event=dispatchUniversalAction(packs,event,{type:'chooseRevealBottom',uid:spell.uid});
 assert.equal(event.players[0].deck.at(-1).cardId,'REZ-1-029');
 assert.equal(universalBp(packs,event,at(event,0,actor.uid)),1500);

 let empty=mimi(4804);
 empty=reach(empty,'main');
 [empty,actor]=playFront(empty,'REZ-1-045');
 empty.players[0].outside.push(...empty.players[0].hand.splice(0));
 assert.equal(revealAct(empty,actor.uid),undefined);
});

const juliusCounts={
 ...Object.fromEntries(['REZ-1-046','REZ-1-037','REZ-1-038','REZ-1-039','REZ-1-068',
  'REZ-1-042','REZ-1-043','REZ-1-007','REZ-1-008','REZ-1-012','REZ-1-014'].map(id=>[id,4])),
 'REZ-1-022':2,'REZ-1-108':2,'REZ-1-036':2
};
const julius=seed=>newUniversalMatch(packs,{decks:[juliusCounts,juliusCounts],first:0,seed});
test('Julius may return one blue zero-cost Subaru, then readies and gains 1000 BP',()=>{
 assert.equal(Object.values(juliusCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,juliusCounts),[]);
 const shell={id:'RETURN',name:'Gate',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-return',cards:[{...shell,effects:{onPlay:[
  {op:'returnPrintedActiveBuff',name:'ナツキ・スバル',color:'blue',energy:0}]}}]}),
  /invalid printed return/);
 assert.throws(()=>createUniversalPack({id:'bad-return',cards:[{...shell,type:'event',bp:0,effects:{onPlay:[
  {op:'returnPrintedActiveBuff',name:'ナツキ・スバル',color:'blue',energy:0,bp:1000}]}}]}),
  /character onPlay/);

 let none=julius(4901);
 fuel(none,['REZ-1-043','REZ-1-043','REZ-1-043']);
 none=reach(none,'main');
 let actor;
 [none,actor]=playFront(none,'REZ-1-046');
 assert.equal(none.pending,null);
 assert.equal(at(none,0,actor.uid).ready,false);
 assert.equal(universalBp(packs,none,at(none,0,actor.uid)),3000);
 assert.equal(none.turnRetireEvents.length,0);

 let mixed=julius(4902);
 fuel(mixed,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const frontSubaru=pull(mixed,0,'REZ-1-037');
 const energySubaru=pull(mixed,0,'REZ-1-038');
 const purple=pull(mixed,0,'REZ-1-068');
 const felix=pull(mixed,0,'REZ-1-042');
 const buried=pull(mixed,0,'REZ-1-039');
 const handed=pull(mixed,0,'REZ-1-037');
 const foe=pull(mixed,1,'REZ-1-037');
 const house=pull(mixed,0,'REZ-1-108');
 felix.stack=[buried];
 mixed.players[0].front[0]=frontSubaru;
 mixed.players[0].front[1]=purple;
 mixed.players[0].front[2]=felix;
 mixed.players[0].energy[3]=energySubaru;
 mixed.players[0].hand.push(handed,house);
 mixed.players[1].front[0]=foe;
 mixed=reach(mixed,'main');
 [mixed,actor]=playFront(mixed,'REZ-1-046');
 const deckBefore=mixed.players[0].deck.length;
 assert.equal(mixed.pending.kind,'effect-return-printed');
 assert.equal(mixed.pending.optional,true);
 assert.equal(mixed.pending.energy,0);
 assert.equal(mixed.pending.color,'blue');
 assert.deepEqual(mixed.pending.choices.slice().sort(),[frontSubaru.uid,energySubaru.uid].sort());
 for(const uid of [purple.uid,felix.uid,buried.uid,handed.uid,foe.uid,house.uid,actor.uid])
  assert.equal(mixed.pending.choices.includes(uid),false,uid);
 assert.throws(()=>dispatchUniversalAction(packs,mixed,{type:'chooseReturnPrinted',uid:felix.uid}),
  /not currently legal/);
 at(mixed,0,actor.uid).ready=false;
 const retireBefore=mixed.turnRetireEvents.length;
 mixed=dispatchUniversalAction(packs,mixed,{type:'chooseReturnPrinted',uid:energySubaru.uid});
 assert.equal(mixed.pending,null);
 assert.equal(mixed.players[0].hand.some(c=>c.uid===energySubaru.uid),true);
 assert.equal(mixed.players[0].energy.some(c=>c?.uid===energySubaru.uid),false);
 assert.equal(mixed.players[0].outside.some(c=>c.uid===energySubaru.uid),false);
 assert.equal(mixed.players[0].front.some(c=>c?.uid===frontSubaru.uid),true);
 assert.equal(mixed.players[0].deck.length,deckBefore);
 assert.equal(mixed.turnRetireEvents.length,retireBefore);
 assert.ok(mixed.zoneMoveEvents.some(e=>e.uid===energySubaru.uid&&e.from==='energy'&&
  e.to==='hand'&&e.reason==='own-effect'));
 assert.equal(at(mixed,0,actor.uid).ready,true);
 assert.equal(universalBp(packs,mixed,at(mixed,0,actor.uid)),4000);
 mixed=ownMain(mixed,2);
 assert.equal(universalBp(packs,mixed,at(mixed,0,actor.uid)),3000);

 let skipped=julius(4903);
 fuel(skipped,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const kept=pull(skipped,0,'REZ-1-037');
 skipped.players[0].front[0]=kept;
 skipped=reach(skipped,'main');
 [skipped,actor]=playFront(skipped,'REZ-1-046');
 at(skipped,0,actor.uid).ready=false;
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseReturnPrinted',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===kept.uid),true);
 assert.equal(at(skipped,0,actor.uid).ready,false);
 assert.equal(universalBp(packs,skipped,at(skipped,0,actor.uid)),3000);

 const labs=['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E','LAB-F','LAB-G','LAB-H','LAB-I'];
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rezero-return-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-046']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-043']),
  {id:'LAB-HEAVY',name:'ナツキ・スバル',color:'blue',type:'character',energy:1,ap:1,bp:1000,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'LAB-ALIAS',name:'別スバル',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:0,
   traits:[],trigger:null,implementation:'dsl',effects:{},nameAliases:['ナツキ・スバル']},
  ...labs.map(id=>lab(id,'blue'))
 ]});
 const fixtureCounts={'REZ-1-046':4,'REZ-1-043':4,'LAB-HEAVY':4,'LAB-ALIAS':2,
  ...Object.fromEntries(labs.map(id=>[id,4]))};
 assert.equal(Object.values(fixtureCounts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,fixtureCounts),[]);
 const fp=[fixture,fixture];
 function open(seed){
  let s=newUniversalMatch(fp,{decks:[fixtureCounts,fixtureCounts],first:0,seed});
  ['REZ-1-043','REZ-1-043','REZ-1-043'].forEach((id,i)=>{
   const card=pull(s,0,id);card.ready=true;s.players[0].energy[i]=card;
  });
  s=dispatchUniversalAction(fp,s,{type:'next'});
  s=dispatchUniversalAction(fp,s,{type:'next'});
  assert.equal(s.phase,'main');
  return s;
 }
 let heavy=open(4904);
 const costOne=pull(heavy,0,'LAB-HEAVY');
 heavy.players[0].front[0]=costOne;
 const printed=pull(heavy,0,'REZ-1-046');
 heavy.players[0].hand.push(printed);
 const play=legalUniversalActions(fp,heavy).find(a=>a.type==='play'&&a.uid===printed.uid&&a.line==='front');
 assert.ok(play);
 heavy=dispatchUniversalAction(fp,heavy,play);
 assert.equal(heavy.pending,null);
 assert.equal(universalBp(fp,heavy,at(heavy,0,printed.uid)),3000);

 let alias=open(4905);
 const named=pull(alias,0,'LAB-ALIAS');
 alias.players[0].energy[3]=named;
 const juliusCard=pull(alias,0,'REZ-1-046');
 alias.players[0].hand.push(juliusCard);
 const aliasPlay=legalUniversalActions(fp,alias).find(a=>a.type==='play'&&a.uid===juliusCard.uid&&a.line==='front');
 alias=dispatchUniversalAction(fp,alias,aliasPlay);
 assert.ok(alias.pending.choices.includes(named.uid));
 alias.players[0].front.find(c=>c?.uid===juliusCard.uid).ready=false;
 alias=dispatchUniversalAction(fp,alias,{type:'chooseReturnPrinted',uid:named.uid});
 assert.equal(alias.players[0].hand.some(c=>c.uid===named.uid),true);
 assert.equal(alias.players[0].energy.some(c=>c?.uid===named.uid),false);
 assert.equal(at(alias,0,juliusCard.uid).ready,true);
 assert.equal(universalBp(fp,alias,at(alias,0,juliusCard.uid)),4000);
});
