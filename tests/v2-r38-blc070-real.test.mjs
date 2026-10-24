import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {CARDS} from '../dist/cards.mjs';
import {handPlayApPlan} from '../dist/universal-v2/ap-discounts.mjs';
const packs=[registeredV2TitlePack('bleach'),registeredV2TitlePack('mushoku-tensei')],blc=packs[0],id='BLC-1-070';
const base=['BLC-1-070','BLC-1-067','BLC-1-068','BLC-1-071','BLC-1-072','BLC-1-075','BLC-1-082','BLC-1-086','BLC-1-089','BLC-1-090','BLC-1-094','BLC-1-097','BLC-4-061'];
const cards=Object.fromEntries(base.map((id,i)=>[id,i===12?2:4]));
const other=['MST-1-060','MST-1-080','MST-1-062','MST-1-059','MST-1-065','MST-1-056','MST-1-041','MST-1-023','MST-1-066','MST-1-004','MST-1-043','MST-1-042','MST-1-046'];
const mst=Object.fromEntries(other.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(blc,cards),[]);
assert.deepEqual(validateUniversalDeck(packs[1],mst),[]);
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error('missing '+id);}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function scene(){
 let s=newUniversalMatch(packs,{decks:[cards,mst],first:0,seed:38070});
 const source=take(s,0,id);s.players[0].hand.push(source);
 for(let i=0;i<4;i++){const p=take(s,0,'BLC-1-068');p.ready=true;p.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=p;}
 const window=['BLC-1-071','BLC-4-061','BLC-1-097','BLC-1-075'].map(cid=>take(s,0,cid));
 s.players[0].deck.unshift(...window);
 s=act(s,{type:'next'});s=act(s,{type:'next'});
 return {s,source,window};
}
test('R38 BLEACH 070 official printed Raid, life, source and exact joint TOP4 predicate',()=>{
 const source=CARDS.find(x=>x.identity===id),d=blc.cards[id];
 assert.equal(source.number,'UA08BT/BLC-1-070');
 assert.deepEqual([d.name,d.type,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger,d.raidName],['卯ノ花 八千流','character','green',6,1,4000,1,'raid','卯ノ花 烈']);
 assert.deepEqual(d.effects.onPlay,[{op:'searchTopUpToTwoBottom',count:4,max:1,rest:'bottom',logic:'all',
  filters:[{field:'type',value:'character'},{field:'trait',value:'護廷十三隊'},{field:'printedRequiredEnergyAtMost',value:4}]},
  {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'character',printedRequiredEnergyAtMost:4}}]);
});
for(const pick of [false,true])test('R38 official BLEACH 070 TOP4 choose '+(pick?'one':'zero')+' / bottom / AP discount',()=>{
 let {s,source,window}=scene();
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play,'printed green necessity 6 paid with four green2 sources');
 s=act(s,play);
 assert.equal(s.pending?.kind,'effect-top-filter-many-choice');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const old=structuredClone(s);
 for(const uid of [window[1].uid,window[2].uid,'0-999']){
  assert.throws(()=>act(s,{type:'chooseTopFilteredMany',uid}));
  assert.deepEqual(s,old);
 }
 for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,s).some(a=>
  JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const uid=pick?window[0].uid:null;
 s=act(s,{type:'chooseTopFilteredMany',uid});
 assert.equal(s.pending?.kind,'effect-top-order');
 const rest=window.map(c=>c.uid).filter(x=>x!==uid).reverse();
 for(const x of rest)s=act(s,{type:'chooseTopOrder',uid:x});
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates.filter(x=>x.kind==='nextEligibleHandPlayApDiscount').length,1);
 const shown=universalPublicView(packs,s,1);
 assert.deepEqual(shown.publicReveals.filter(x=>x.kind==='searched-to-hand').map(x=>x.uid),uid?[uid]:[]);
 assert.equal(handPlayApPlan(s,0,blc.cards[id]).cost,1);
 assert.equal(handPlayApPlan(s,0,blc.cards['BLC-1-071']).cost,0);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
