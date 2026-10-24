import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalCardEnergy,universalEnergyByColor,
 legalUniversalActions,assertUniversalMatch,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState,selectionApSurcharge,hasFrontEnergyPermission,
 expireContinuousStates,fieldRestrictions} from '../dist/universal-v2/continuous-states.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const ttg=registeredV2TitlePack('gurren-lagann');
const sao=registeredV2TitlePack('sword-art-online');
const slg=registeredV2TitlePack('solo-leveling');
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','050','059','063','055'].map(n=>['MST-1-'+n,4]));mstDeck['MST-1-057']=2;
const ttgDeck=Object.fromEntries(['002','005','006','009','014','019','042','043','047','051','064','065'].map(n=>['TTG-1-'+n,4]));ttgDeck['TTG-1-036']=2;
const saoIds=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004','SAO-1-019','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));saoDeck[saoIds.at(-1)]=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','070','072'].map(n=>['SLG-1-'+n,4]));slgDeck['SLG-1-041']=2;
const decks=new Map([[mst,mstDeck],[ttg,ttgDeck],[sao,saoDeck],[slg,slgDeck]]);
for(const [p,d] of decks)assert.deepEqual(validateUniversalDeck(p,d),[]);
function scene(foe){
 const packs=[mst,foe],s=newUniversalMatch(packs,{
  decks:[mstDeck,decks.get(foe)],first:0,seed:34034});
 assert.equal(assertUniversalMatch(packs,s),true);
 return {packs,s};
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],at=arr.findIndex(c=>c.cardId===id);
  if(at>=0)return arr.splice(at,1)[0];
 }throw Error('Missing physical '+id);
}
function put(s,p,id,line,slot){
 const c=take(s,p,id);
 c.ready=false;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function grant(s,source,target){
 grantContinuousState(s,{kind:'frontEnergyPermission',controller:0,
  sourceUid:source.uid,targetUid:target.uid,sourceLinked:false,
  until:{player:s.active,phase:'attack',edge:'end'}});
}
const countByColor=(p,s,owner,color='green')=>universalEnergyByColor(p,s,owner)[color]||0;
const verifyAi=(packs,s)=>{
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const act=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(act)),difficulty+' must select a legal public action');
 }
};
test('R34 MST vs TTG: independent stamped FRONT permission, permanent FRONT producer and +energy buffs cannot double count',()=>{
 const {packs,s}=scene(ttg);
 const source=put(s,0,'MST-1-059','front',0);
 const temporary=put(s,0,'MST-1-055','front',1);
 const permanent=put(s,0,'MST-1-057','front',2);
 put(s,0,'MST-1-050','energy',0);
 const ttgProducer=put(s,1,'TTG-1-002','energy',0);
 assert.equal(universalCardEnergy(packs,s,0,temporary),0);
 assert.equal(universalCardEnergy(packs,s,0,permanent),permanent&&mst.cards[permanent.cardId].gen);
 assert.ok(universalCardEnergy(packs,s,1,ttgProducer)>=0);
 const initial=countByColor(packs,s,0);
 grant(s,source,temporary);
 assert.equal(countByColor(packs,s,0),initial+mst.cards[temporary.cardId].gen);
 // FRONT production permission does not switch off ACTIVE-specific bonuses.
 temporary.ready=true;temporary.buffs.push({energy:2,untilTurn:s.turn});
 assert.equal(countByColor(packs,s,0),initial+mst.cards[temporary.cardId].gen+2);
 grant(s,source,temporary);grant(s,source,permanent);
 assert.equal(countByColor(packs,s,0),initial+mst.cards[temporary.cardId].gen+2);
 temporary.ready=false;assert.equal(countByColor(packs,s,0),initial+mst.cards[temporary.cardId].gen+2);
 assert.equal(assertUniversalMatch(packs,s),true);
 verifyAi(packs,s);
 expireContinuousStates(s,{player:0,phase:'attack',edge:'end'});
 assert.equal(hasFrontEnergyPermission(s,0,temporary),false);
 assert.equal(universalCardEnergy(packs,s,0,temporary),0);
 assert.equal(universalCardEnergy(packs,s,0,permanent),1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R34 MST vs SAO: own temporary producer changes only own green legal costs, not opponent SAO paid play',()=>{
 const {packs,s}=scene(sao);
 const source=put(s,0,'MST-1-059','front',0);
 const target=put(s,0,'MST-1-063','front',1);
 const foe=put(s,1,'SAO-1-001','energy',0);
 const saohand=take(s,1,'SAO-1-005');s.players[1].hand.push(saohand);
 const before=countByColor(packs,s,0),saoEnergy=universalEnergyByColor(packs,s,1);
 grant(s,source,target);
 assert.equal(countByColor(packs,s,0),before+mst.cards[target.cardId].gen);
 assert.deepEqual(universalEnergyByColor(packs,s,1),saoEnergy);
 assert.equal(assertUniversalMatch(packs,s),true);
 verifyAi(packs,s);
 // Opponent card remains owned by player 1; cross-title own FRONT grant may not steal it.
 assert.throws(()=>grantContinuousState(structuredClone(s),{
  kind:'frontEnergyPermission',controller:0,sourceUid:source.uid,targetUid:foe.uid,
  sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}
 }),/FRONT energy permission/);
});
test('R34 MST vs SLG: selection AP tax / attack ban / earned attack ability stay orthogonal to physical energy permissions',()=>{
 const {packs,s}=scene(slg);
 const source=put(s,0,'MST-1-059','front',0),target=put(s,0,'MST-1-063','front',1);
 const shield=put(s,1,'SLG-1-072','front',0),slgGrantor=put(s,1,'SLG-1-070','energy',0);
 grant(s,source,target);
 const initial=countByColor(packs,s,0);
 grantContinuousState(s,{kind:'selectionApTax',controller:1,sourceUid:slgGrantor.uid,
  targetUid:shield.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end',ownTurn:s.players[0].ownTurns+1}});
 grantContinuousState(s,{kind:'cannotAttack',controller:0,sourceUid:source.uid,
  targetUid:shield.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 grantContinuousState(s,{kind:'grantedOnAttack',controller:0,sourceUid:source.uid,
  targetUid:target.uid,sourceLinked:false,optional:true,program:[{op:'draw',count:1}],
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(countByColor(packs,s,0),initial);
 assert.equal(fieldRestrictions(s,1,shield).some(x=>x.kind==='cannotAttack'),true);
 assert.equal(fieldRestrictions(s,0,target).some(x=>x.kind==='grantedOnAttack'),true);
 assert.equal(selectionApSurcharge(s,0,shield.uid),0);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 verifyAi(packs,s);
 s.players[0].ownTurns++;
 assert.equal(selectionApSurcharge(s,0,shield.uid),1);
 assert.equal(countByColor(packs,s,0),initial);
 expireContinuousStates(s,{player:0,phase:'attack',edge:'end'});
 assert.equal(universalCardEnergy(packs,s,0,target),0);
 assert.equal(s.continuousStates.some(x=>x.kind==='cannotAttack'),true);
 expireContinuousStates(s,{player:0,phase:'start',edge:'start'});
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
