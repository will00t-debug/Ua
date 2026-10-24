import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
// Q2062: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-070
const source=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-070');
assert.equal(source.nameJa,'シーマ');
const pilot={id:'SLG-1-070',name:'シーマ',color:'green',energy:0,ap:1,bp:1000,
 gen:1,trigger:'active',type:'character',
 traits:['DFN／第四次架南島レイド'],traitComponents:['DFN','第四次架南島レイド'],
 implementation:'dsl',effects:{onPlay:[
 {op:'grantSelectionApTaxOwnOtherTrait',trait:'DFN',optional:true,until:'nextOpponentTurn'}]}};
const pack=registeredV2TitlePack('solo-leveling');
assert.deepEqual(pack.cards['SLG-1-070'].effects.onPlay,pilot.effects.onPlay);
const foe=registeredV2TitlePack('sword-art-online'),packs=[pack,foe];
const slgIds=['SLG-1-070','SLG-1-072','SLG-1-069','SLG-1-062','SLG-1-065','SLG-1-053',
 'SLG-1-042','SLG-1-004','SLG-1-007','SLG-1-008','SLG-1-014','SLG-1-013','SLG-1-025'];
const saoIds=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004','SAO-1-019','SAO-1-020',
 'SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const decks=[slgIds,saoIds].map(ids=>{const deck=Object.fromEntries(ids.map(id=>[id,4]));deck[ids.at(-1)]=2;return deck;});
for(let p=0;p<2;p++)assert.deepEqual(validateUniversalDeck(packs[p],decks[p]),[]);
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const list=s.players[p][z],i=list.findIndex(c=>c.cardId===id);
 if(i>=0)return list.splice(i,1)[0];
}throw Error(id);}
function setup(targetId='SLG-1-072'){
 let s=newUniversalMatch(packs,{decks,first:0,seed:33070});
 const source=take(s,0,'SLG-1-070'),target=take(s,0,targetId);
 s.players[0].hand.push(source);
 target.fieldEntryStamp=s.nextFieldEntryStamp++;target.ready=true;s.players[0].energy[0]=target;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action);return {s,source,target,action};
}
test('R33 officially registered 50-card シーマ onPlay grants only other own DFN, no AP payment, controller/UID stamped',()=>{
 let {s,source,target,action}=setup();
 const sourceProof=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-070');
 assert.equal(sourceProof.energy,0);assert.equal(sourceProof.ap,1);
 assert.equal(sourceProof.trigger,'active');assert.equal(sourceProof.bp,1000);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending?.kind,'effect-grant-ap-tax');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseApTaxGrant',uid:null},{type:'chooseApTaxGrant',uid:target.uid}]);
 assert.equal(V2_PENDING_LABELS['effect-grant-ap-tax'].includes('AP'),true);
 assert.match(uiActionLabel({type:'chooseApTaxGrant',uid:target.uid},{pack:packs,state:s}),/額外支付 1 AP/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.deepEqual(ai,{type:'chooseApTaxGrant',uid:target.uid});
 }
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseApTaxGrant',uid:source.uid}),/not currently legal/);
 assert.deepEqual(s,before);
 s=dispatchUniversalAction(packs,JSON.parse(JSON.stringify(s)),{type:'chooseApTaxGrant',uid:target.uid});
 assert.equal(s.pending,null);assert.equal(s.continuousStates.length,1);
 assert.equal(s.continuousStates[0].targetUid,target.uid);
 assert.equal(s.continuousStates[0].targetStamp,target.fieldEntryStamp);
 assert.equal(s.continuousStates[0].until.player,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R33 optional 0 legal and wrong trait cannot receive selection tax, schema extra fields fail closed',()=>{
 let {s,source,target,action}=setup('SLG-1-053');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates.length,0);
 const sourceNoOptions=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-070');
 assert.match(sourceNoOptions.effect,/最多1張/);
 for(const effect of [
  {op:'grantSelectionApTaxOwnOtherTrait',trait:'DFN',optional:false,until:'nextOpponentTurn'},
  {op:'grantSelectionApTaxOwnOtherTrait',trait:'DFN',optional:true,until:'endOfTurn'},
  {op:'grantSelectionApTaxOwnOtherTrait',trait:'DFN',optional:true,until:'nextOpponentTurn',tax:2}
 ])assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...pilot,effects:{onPlay:[effect]}}]}),/invalid shared targeting AP tax grant/);
});

test('R33 strict formal SLG-070 manifest and original-source exact traits/trigger',async()=>{
 const {EXPECTED_V2_IDS}=await import('./fixtures/v2-integrated-id-manifest.mjs');
 assert.equal(EXPECTED_V2_IDS['solo-leveling'].includes('SLG-1-070'),true);
 assert.equal(source.identity,'SLG-1-070');
 assert.deepEqual([source.nameJa,source.color,source.energy,source.ap,
  source.bp,source.gen,source.trigger],['シーマ','green',0,1,1000,1,'active']);
 assert.deepEqual(pack.cards['SLG-1-070'].traits,['DFN／第四次架南島レイド']);
 assert.deepEqual(pack.cards['SLG-1-070'].traitComponents,['DFN','第四次架南島レイド']);
 assert.equal(pack.cards['SLG-1-070'].effects.onPlay[0].until,'nextOpponentTurn');
});
