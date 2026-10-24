import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['SLG-1-046','SLG-1-041','SLG-1-043','SLG-1-045','SLG-1-052','SLG-1-055','SLG-1-066','SLG-1-068','SLG-1-070','SLG-1-072','SLG-1-078','SLG-1-032','SLG-1-015'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){for(const zone of ['hand','deck','life','outside']){const arr=s.players[0][zone],i=arr.findIndex(c=>c.cardId===id);if(i>=0)return arr.splice(i,1)[0];}throw Error('Missing '+id);}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function scene(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:38046});
 const c=take(s,'SLG-1-046');s.players[0].hand.push(c);
 const e=take(s,'SLG-1-041');e.ready=true;e.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=e;
 const window=['SLG-1-045','SLG-1-078','SLG-1-015','SLG-1-070'].map(id=>take(s,id));s.players[0].deck.unshift(...window);
 s=act(s,{type:'next'});s=act(s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front');
 assert.ok(play,'legal '+JSON.stringify({phase:s.phase,active:s.active,ap:s.players[0].apCards,hand:s.players[0].hand.map(c=>c.cardId),play:legalUniversalActions(packs,s).filter(a=>a.type==='play')}));return {s,play,window};
}
test('R38 SLG 046 full official printed stats, no trigger and exact name-OR TOP4 contingent discard',()=>{
 const source=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-046'),d=pack.cards['SLG-1-046'];
 assert.deepEqual([source.number,d.name,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger],['UA51BT/SLG-1-046','水篠 旬','green',1,1,2000,1,null]);
 assert.deepEqual(d.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:4,
  filters:[{field:'name',value:'水篠 旬'},{field:'name',value:'デイリークエスト'}],logic:'any'}]);
});
for(const selected of [false,true])test('R38 SLG-046 TOP4 choose '+(selected?'1':'0')+' valid physical card, bottom order and optional discard',()=>{
 let {s,play,window}=scene(),oldDeck=s.players[0].deck.map(c=>c.uid);
 s=act(s,play);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');assert.equal(universalPrivateChoices(packs,s,1),null);
 const legal=legalUniversalActions(packs,s),uid=selected?window[0].uid:null;
 assert.ok(legal.some(a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid));
 assert.ok(legal.some(a=>a.type==='chooseTopFiltered'&&a.uid===window[2].uid));
 for(const bad of [window[1].uid,window[3].uid,'0-999']){
  assert.ok(!legal.some(a=>a.uid===bad));
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'chooseTopFiltered',uid:bad}));assert.deepEqual(s,before);
 }
 for(const difficulty of ['normal','hard'])assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 s=act(s,{type:'chooseTopFiltered',uid});
 assert.equal(s.pending?.kind,'effect-top-order');
 const rest=window.map(c=>c.uid).filter(x=>x!==uid).reverse();
 for(const x of rest)s=act(s,{type:'chooseTopOrder',uid:x});
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...oldDeck.slice(4),...rest]);
 if(selected){assert.equal(s.pending?.kind,'effect-discard');s=act(s,{type:'chooseDiscard',uid});}
 else assert.equal(s.pending,null);
 assert.equal(s.pending,null);
 const v=universalPublicView(packs,s,1);
 assert.deepEqual(v.publicReveals.filter(x=>x.kind==='searched-to-hand').map(x=>x.uid),selected?[uid]:[]);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
