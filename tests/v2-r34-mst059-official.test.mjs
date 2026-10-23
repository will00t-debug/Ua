import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {V2_PENDING_LABELS,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

const mst=registeredV2TitlePack('mushoku-tensei'),slg=registeredV2TitlePack('solo-leveling');
const packs=[mst,slg];
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','050','059','063','070'].map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-057']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
const physical=(s,p,id)=>{for(const zone of ['hand','deck','life','outside']){
 const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
 }throw Error('No physical '+id);
};
function setup({targetId='MST-1-063',targetZone='front',includeTarget=true}={}){
 let s=newUniversalMatch(packs,{decks:[mstDeck,slgDeck],first:0,seed:34059});
 const source=physical(s,0,'MST-1-059');s.players[0].hand.push(source);
 let target=null;
 if(includeTarget){target=physical(s,0,targetId);target.ready=false;
  target.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0][targetZone][0]=target;}
 for(let i=1;i<4;i++){
  const c=physical(s,0,'MST-1-050');
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;
 }
 // Three ordinary ENERGY producers are enough for the official green 2.
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play,'MST059 paid FRONT entry must be legal');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,target,play};
}
function choose(s,source,play,mode){
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(legalUniversalActions(packs,s).map(x=>x.mode),['draw','energy']);
 assert.equal(s.pending.sourceUid,source.uid);
 return dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode});
}
test('R34 genuine official print, no phantom trigger and independent MST registry/manifest',()=>{
 const original=MST_V2_OFFICIAL_BY_ID['MST-1-059'],d=mst.cards['MST-1-059'];
 assert.equal(original.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-059');
 assert.deepEqual([original.energy,original.ap,original.bp,original.gen,original.trigger,
  original.traits],[2,1,3000,1,null,['ラノア魔法大学']]);
 assert.deepEqual([d.name,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger,d.traits],
  ['シルフィエット','green',2,1,3000,1,null,['ラノア魔法大学']]);
 assert.equal(d.implementation,'dsl');assert.equal(d.effects.onPlay.length,1);
 assert.equal(d.effects.onPlay[0].op,'chooseOne');
 assert.equal(d.effects.onPlay[0].options[1].then[0].op,'grantFrontEnergyOwnOtherFrontTrait');
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-059'));
 assert.match(original.effectJa,/以下から1つ選ぶ/);
 assert.match(original.effectJa,/このターン中/);
});
test('R34 mode 1 draws exactly one physical card then discards an OWN hand UID, with private log',()=>{
 const {s:before,source,play}=setup();
 let s=choose(before,source,play,'draw');
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,before.players[0].deck.length-1);
 assert.equal(s.players[0].hand.length,before.players[0].hand.length);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 assert.ok(act);assert.ok(s.players[0].hand.some(c=>c.uid===act.uid));
 const other=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'1-1'}),/not currently legal/);
 assert.deepEqual(s,other);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before.players[0].hand.length-1);
 assert.equal(s.players[0].outside.some(c=>c.uid===act.uid),true);
 assert.equal(s.zoneMoveEvents.some(e=>e.from==='deck'&&e.to==='hand'&&e.owner===0&&e.reason==='own-effect'&&e.sourceUid===source.uid),true);
 assert.equal(s.zoneMoveEvents.some(e=>e.from==='hand'&&e.to==='outside'&&e.uid===act.uid&&e.owner===0&&e.reason==='own-effect'&&e.sourceUid===source.uid),true);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R34 mode 2 grants one other own matching FRONT physical instance, not +1 and not permanent',()=>{
 const {s:before,source,target,play}=setup();
 const original=universalEnergyByColor(packs,before,0).green;
 let s=choose(before,source,play,'energy');
 assert.equal(s.pending?.kind,'effect-grant-front-energy');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseFrontEnergyGrant',uid:null},
  {type:'chooseFrontEnergyGrant',uid:target.uid}]);
 assert.equal(V2_PENDING_LABELS['effect-grant-front-energy'].includes('前線'),true);
 assert.match(uiActionLabel({type:'chooseFrontEnergyGrant',uid:target.uid},{pack:packs,state:s}),/前線也能產生能源/);
 for(const difficulty of ['normal','hard']){
  const action=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
  assert.equal(action.uid,target.uid);
 }
 const safe=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseFrontEnergyGrant',uid:source.uid}),/not currently legal/);
 assert.deepEqual(s,safe);
 s=dispatchUniversalAction(packs,JSON.parse(JSON.stringify(s)),
  {type:'chooseFrontEnergyGrant',uid:target.uid});
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates[0].targetUid,target.uid);
 assert.equal(s.continuousStates[0].targetStamp,target.fieldEntryStamp);
 assert.equal(s.continuousStates[0].until.player,0);
 assert.equal(universalEnergyByColor(packs,s,0).green,original+mst.cards[target.cardId].gen);
 // REST still generates; action must not change target ready state.
 assert.equal(s.players[0].front[0].ready,false);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(universalEnergyByColor(packs,s,0).green,original+1);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.continuousStates.some(x=>x.kind==='frontEnergyPermission'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R34 optional zero is legal, target ENERGY / wrong trait / source self are never eligible',()=>{
 for(const options of [
  {includeTarget:false},
  {targetZone:'energy'},
  {targetId:'MST-1-001'}
 ]){
  const {s:before,source,play}=setup(options);
  let s=choose(before,source,play,'energy');
  assert.equal(s.pending,null);
  assert.equal(s.continuousStates.length,0);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 const {s:before,source,play,target}=setup();
 let s=choose(before,source,play,'energy');
 s=dispatchUniversalAction(packs,s,{type:'chooseFrontEnergyGrant',uid:null});
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R34 mode 1 empty-deck physical conservation and mandatory hand discard, AI must remain legal',()=>{
 const {s:before,source,play}=setup();
 before.players[0].outside.push(...before.players[0].deck.splice(0));
 assert.equal(assertUniversalMatch(packs,before),true);
 let s=choose(before,source,play,'draw');
 assert.equal(s.players[0].deck.length,0);
 assert.equal(s.pending?.kind,'effect-discard');
 const a=legalUniversalActions(packs,s)[0];
 s=dispatchUniversalAction(packs,s,a);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 for(const difficulty of ['normal','hard']){
  const {s:start,play:entry}=setup();
  let current=dispatchUniversalAction(packs,start,entry);
  const ai=chooseUniversalAiAction(packs,current,{difficulty});
  assert.ok(legalUniversalActions(packs,current).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
});
