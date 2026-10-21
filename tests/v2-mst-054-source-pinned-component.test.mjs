import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
// Source-pinned COMPONENT ONLY: MST-1-054 remains unregistered in official V2.
const official=MST_V2_OFFICIAL_BY_ID['MST-1-054'];
const candidate={id:official.id,name:official.nameJa,color:official.color,
 type:official.type,energy:official.energy,ap:official.ap,bp:official.bp,
 gen:official.gen,traits:[...official.traits],trigger:official.trigger,
 raidName:'ロキシー',implementation:'dsl',templateEffects:{onPlay:[
  {template:'restSilenceOppFrontIfOwnOutsideField',optional:true}]}};
const syntheticField={id:'MST-COMPONENT-FIELD',name:'Fixture only field',
 color:'green',type:'field',energy:0,ap:1,bp:0,gen:1,implementation:'vanilla'};
const packs=[createUniversalPack({id:'source-pinned-mst-component',cards:[
 ...verifiedMstV2Cards(),candidate,syntheticField]}),
 registeredV2TitlePack('sword-art-online')];
const mstIds=['MST-1-050','MST-1-055','MST-1-057','MST-1-070',
 'MST-1-061','MST-1-063','MST-1-072','MST-1-054','MST-1-069',
 'MST-1-047','MST-1-010','MST-1-077','MST-COMPONENT-FIELD'];
const saoIds=['SAO-1-014','SAO-1-020','SAO-1-001','SAO-1-016','SAO-1-019',
 'SAO-1-023','SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046',
 'SAO-1-054','SAO-1-055','SAO-1-058'];
function deck(ids){const c=Object.fromEntries(ids.map(id=>[id,4]));c[ids.at(-1)]=2;return c;}
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Not found '+id);
}
function place(s,p,id,line,slot,ready){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function raidWithField(hasOutsideField,decline){
 let s=newUniversalMatch(packs,{decks:[deck(mstIds),deck(saoIds)],first:0,seed:154});
 const base=place(s,0,'MST-1-050','front',0,false);
 for(const [i,id] of ['MST-1-050','MST-1-055','MST-1-070','MST-1-061'].entries())
  place(s,0,id,'energy',i,false);
 const victim=place(s,1,'SAO-1-014','front',0,true);
 const roxy=take(s,0,'MST-1-054');s.players[0].hand.push(roxy);
 if(hasOutsideField)s.players[0].outside.push(take(s,0,'MST-COMPONENT-FIELD'));
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===roxy.uid&&a.baseUid===base.uid);
 assert.ok(raid,'printed raid play should be legal after exactly four green energy');
 s=dispatchUniversalAction(packs,s,raid);
 assert.equal(s.players[0].front[0].uid,roxy.uid);
 assert.equal(s.players[0].front[0].ready,true,'Raid top enters ACTIVE');
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid,'Raid stays intact');
 if(hasOutsideField){
  assert.equal(s.pending?.kind,'effect-rest-bp');
  assert.deepEqual(legalUniversalActions(packs,s),[
   {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:victim.uid}
  ]);
  s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:decline?null:victim.uid});
 }
 return {s,roxy,base,victim};
}
test('official MST-1-054 Japanese source pin compiles exact Raid, print and optional outside-FIELD condition',()=>{
 assert.ok(official.verified);
 assert.equal(official.number,'UA54BT/MST-1-054');
 assert.equal(official.nameJa,'ロキシー');
 assert.equal(official.energy,4);
 assert.equal(official.ap,1);
 assert.equal(official.bp,4000);
 assert.equal(official.gen,1);
 assert.equal(official.trigger,'raid');
 assert.ok(official.effectJa.includes('元々の効果を全て失い'));
 assert.match(official.source,/unionarena-tcg.com\/jp\/cardlist\/detail_iframe/);
 assert.equal(packs[0].cards['MST-1-054'].raidName,official.nameJa);
 assert.deepEqual(packs[0].cards['MST-1-054'].effects.onPlay,[
  {op:'restSilenceOppFrontIfOwnOutsideField',optional:true}
 ]);
 assert.deepEqual(validateUniversalDeck(packs[0],deck(mstIds)),[]);
 assert.deepEqual(validateUniversalDeck(packs[1],deck(saoIds)),[]);
 assert.equal(registeredV2TitlePack('mushoku-tensei').cards['MST-1-054'],undefined,
  'component QA cannot silently add official registration');
});
test('printed MST-1-054 Raid against real SAO-1-014: restores printed BP after temporary loss, preserves base',()=>{
 for(const [hasField,decline] of [[false,false],[true,true],[true,false]]){
  const {s,victim}=raidWithField(hasField,decline);
  const enabled=hasField&&!decline;
  assert.equal(s.continuousStates.length,enabled?2:0);
  assert.equal(universalBp(packs,s,s.players[1].front[0]),enabled?2500:3500);
  assert.equal(s.players[1].front[0].ready,!enabled);
  const publicSnap=universalPublicView(packs,s,1);
  assert.equal(publicSnap.players[0].hand,null,'do not leak other controller hidden hand');
  assert.deepEqual(publicSnap.players[1].front[0].restrictions.map(x=>x.kind),
   enabled?['cannotActive','originalEffectsDisabled']:[]);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
