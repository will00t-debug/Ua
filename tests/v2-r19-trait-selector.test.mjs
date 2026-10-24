import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {cardHasTrait} from '../dist/universal-v2/field-conditions.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';

const slg=registeredV2TitlePack('solo-leveling');
const sao=registeredV2TitlePack('sword-art-online');
test('real official SLG composite checked as audited; SAO single trait unchanged',()=>{
 for(const id of ['SLG-1-065','SLG-1-069','SLG-1-072']){
  assert.equal(cardHasTrait(slg.cards[id],'DFN'),true,id);
  assert.equal(cardHasTrait(slg.cards[id],'第四次架南島レイド'),true,id);
  assert.deepEqual(slg.cards[id].traits,['DFN／第四次架南島レイド']);
 }
 assert.equal(cardHasTrait(slg.cards['SLG-1-056'],'第四次架南島レイド'),true);
 assert.equal(cardHasTrait(sao.cards['SAO-1-009'],'女神'),false);
});
const ids=Array.from({length:13},(_,i)=>'T'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({
 id,name:id,type:'character',color:'green',energy:0,ap:1,bp:1000,gen:1,
 ...(id==='T00'?{implementation:'dsl',effects:{onPlay:[{op:'searchTopOneBottomDiscard',
  count:3,filter:{field:'trait',value:'DFN'}}]}}:{implementation:'vanilla'}),
 ...(id==='T01'?{traits:['DFN／FourthRaid'],traitComponents:['DFN','FourthRaid']}:{}),
 ...(id==='T02'?{traits:['DFN／Unreviewed']}:{}),
 ...(id==='T03'?{traits:['DFN']}:{}),
}));
const pack=createUniversalPack({id:'trait-selector-consistency-gpt',cards});
const packs=[pack,pack],counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
function take(s,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[0][zone],at=list.findIndex(x=>x.cardId===id);
  if(at>=0)return list.splice(at,1)[0];
 }throw Error('Missing '+id);
}
test('private top-N search shares exact audited semantics; unreviewed slash never grants option',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:19001,first:0});
 const source=take(s,'T00');s.players[0].hand.push(source);
 const top=['T01','T02','T03'].map(id=>take(s,id));
 s.players[0].deck.unshift(...top);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front');
 assert.ok(action);
 const next=dispatchUniversalAction(packs,s,action);
 assert.equal(next.pending?.kind,'effect-top-filter-choice');
 assert.deepEqual(next.pending.choices,[top[0].uid,top[2].uid]);
 assert.deepEqual(legalUniversalActions(packs,next),[
  {type:'chooseTopFiltered',uid:null},
  {type:'chooseTopFiltered',uid:top[0].uid},
  {type:'chooseTopFiltered',uid:top[2].uid}
 ]);
 assert.throws(()=>dispatchUniversalAction(packs,next,{type:'chooseTopFiltered',uid:top[1].uid}),
  /not currently legal/);
 assert.equal(universalPrivateChoices(packs,next,1),null);
 assert.equal(universalPublicView(packs,next,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
