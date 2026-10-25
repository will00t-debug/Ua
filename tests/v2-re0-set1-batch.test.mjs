import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_CARDS,REZERO_BY_ID} from '../dist/rezero-cards.mjs';
import {createRezeroV2Pack,REZERO_ENGINE_IDS,rezeroEngineKind} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,effectiveHandRequiredEnergy
} from '../dist/universal-v2/engine.mjs';

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

test('forty-four whole prints enter the V2 pack and the other sixty-nine stay out',()=>{
 assert.equal(REZERO_ENGINE_IDS.length,44);
 assert.equal(Object.keys(pack.cards).length,44);
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
