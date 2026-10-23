import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {selectionApSurcharge} from '../dist/universal-v2/continuous-states.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Unlike R34 synthetic multi-status checks, both grants here are caused by
// actual registered onPlay cards in the SAME legal 50-vs-50 match.
const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const packs=[mst,slg];
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','050','059','063','070'].map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-057']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','070','072'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing real physical UID '+id);
}
function put(s,p,id,line,slot){
 const card=take(s,p,id);
 card.fieldEntryStamp=s.nextFieldEntryStamp++;card.ready=true;
 s.players[p][line][slot]=card;return card;
}
function advanceToMain(s,owner){
 for(let i=0;i<9&&(s.active!==owner||s.phase!=='main');i++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,owner);assert.equal(s.phase,'main');
 return s;
}
function legalChoice(s,type,condition){
 const a=legalUniversalActions(packs,s).find(x=>x.type===type&&condition(x));
 assert.ok(a,type+' must be legal');return a;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const a=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(b=>JSON.stringify(a)===JSON.stringify(b)),difficulty);
 }
}
function jointScene(){
 let s=newUniversalMatch(packs,{decks:[mstDeck,slgDeck],first:1,seed:35035});
 const slgSource=take(s,1,'SLG-1-070'),shield=put(s,1,'SLG-1-072','front',0);
 s.players[1].hand.push(slgSource);
 const mstSource=take(s,0,'MST-1-059'),producer=put(s,0,'MST-1-063','front',0);
 s.players[0].hand.push(mstSource);
 for(let i=0;i<3;i++)put(s,0,'MST-1-050','energy',i);
 s=advanceToMain(s,1);
 // Official Q90: even an ENERGY-line entry may trigger this onPlay.
 s=dispatchUniversalAction(packs,s,legalChoice(s,'play',a=>a.uid===slgSource.uid&&a.line==='energy'));
 assert.equal(s.pending?.kind,'effect-grant-ap-tax');
 aiLegal(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseApTaxGrant',uid:shield.uid});
 assert.equal(s.continuousStates.filter(x=>x.kind==='selectionApTax').length,1);
 s=advanceToMain(s,0);
 assert.equal(selectionApSurcharge(s,0,shield.uid),1);
 const baseEnergy=universalEnergyByColor(packs,s,0).green;
 s=dispatchUniversalAction(packs,s,legalChoice(s,'play',a=>a.uid===mstSource.uid&&a.line==='front'));
 assert.equal(s.pending?.kind,'effect-choice-mode');
 aiLegal(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'energy'});
 assert.equal(s.pending?.kind,'effect-grant-front-energy');
 aiLegal(s);
 return {s,shield,producer,slgSource,mstSource,baseEnergy};
}
test('R35 B: two different registered real onPlay cards in one 50-card match, stamped AP tax + FRONT permission',()=>{
 const {s:pending,shield,producer,mstSource,baseEnergy}=jointScene();
 const legal=legalUniversalActions(packs,pending);
 assert.deepEqual(legal.map(a=>a.uid),[null,producer.uid]);
 const untouched=structuredClone(pending);
 for(const uid of [shield.uid,mstSource.uid,'made-up-physical-uid']){
  assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseFrontEnergyGrant',uid}),
   /not currently legal/);
  assert.deepEqual(pending,untouched);
 }
 let s=dispatchUniversalAction(packs,JSON.parse(JSON.stringify(pending)),
  {type:'chooseFrontEnergyGrant',uid:producer.uid});
 assert.equal(s.continuousStates.length,2);
 assert.deepEqual(new Set(s.continuousStates.map(x=>x.kind)),
  new Set(['selectionApTax','frontEnergyPermission']));
 assert.equal(universalEnergyByColor(packs,s,0).green,baseEnergy+mst.cards[producer.cardId].gen);
 assert.equal(selectionApSurcharge(s,0,shield.uid),1);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 aiLegal(s);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(selectionApSurcharge(s,0,shield.uid),1);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.continuousStates.some(x=>x.kind==='frontEnergyPermission'),false);
 assert.equal(s.continuousStates.some(x=>x.kind==='selectionApTax'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R35 B: serialized pending UID/stamp tamper is rejected, not reattached to different physical instance',()=>{
 const {s,producer}=jointScene();
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 const bad=structuredClone(s);
 bad.pending.choices.find(x=>x.uid===producer.uid).stamp=0;
 assert.throws(()=>assertUniversalMatch(packs,bad));
 assert.equal(assertUniversalMatch(packs,s),true);
});
