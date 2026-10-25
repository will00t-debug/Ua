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

test('fifty-seven whole prints enter the V2 pack and the other fifty-six stay out',()=>{
 assert.equal(REZERO_ENGINE_IDS.length,57);
 assert.equal(Object.keys(pack.cards).length,57);
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
 assert.equal(pack.cards['REZ-1-042'],undefined);
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
