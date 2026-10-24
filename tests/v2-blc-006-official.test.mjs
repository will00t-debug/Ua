import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-006
// Official Q536: the next ACTIVE attempt leaves the REST card REST once.
const packs=[registeredV2TitlePack('bleach'),registeredV2TitlePack('sword-art-online')];
const bleed=['BLC-1-006','BLC-1-002','BLC-1-005','BLC-1-012',
 'BLC-1-018','BLC-1-021','BLC-1-071','BLC-1-083','BLC-1-086',
 'BLC-1-035','BLC-1-068','BLC-1-010','BLC-1-075'];
const sword=['SAO-1-020','SAO-1-014','SAO-1-001','SAO-1-016',
 'SAO-1-019','SAO-1-023','SAO-1-035','SAO-1-039','SAO-1-042',
 'SAO-1-046','SAO-1-054','SAO-1-055','SAO-1-058'];
const deck=ids=>{const counts=Object.fromEntries(ids.map(id=>[id,4]));counts[ids.at(-1)]=2;return counts;};
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('missing official physical card '+id);
}
function readyToPlay(opponentRest){
 let s=newUniversalMatch(packs,{decks:[deck(bleed),deck(sword)],first:0,seed:1337});
 // Reach the natural second P0 turn: the printed card costs 2 AP.
 for(let i=0;i<10&&s.players[0].ownTurns<2;i++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);assert.equal(s.phase,'start');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 const source=take(s,0,'BLC-1-006');s.players[0].hand.push(source);
 for(let i=0;i<4;i++){const c=take(s,0,'BLC-1-002');c.ready=false;s.players[0].energy[i]=c;}
 const target=take(s,1,'SAO-1-020');target.ready=!opponentRest;
 s.players[1].energy[0]=target;
 const blocker=take(s,1,'SAO-1-014');blocker.ready=true;s.players[1].front[0]=blocker;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const plays=legalUniversalActions(packs,s).filter(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(plays.length);
 s=dispatchUniversalAction(packs,s,plays.find(a=>a.slot===0));
 return {s,source,target,blocker};
}
test('BLC-1-006 exact official source, full ACTIVE-on-entry + optional attack ability + GET',()=>{
 const c=CARDS.find(x=>x.identity==='BLC-1-006');
 const d=packs[0].cards['BLC-1-006'];
 assert.match(c.source,/unionarena-tcg.com\/jp\/cardlist/);
 assert.equal(d.name,c.nameJa);
 assert.equal(d.energy,4);assert.equal(d.ap,2);assert.equal(d.bp,4000);
 assert.deepEqual(d.traits,[c.traits]);
 assert.equal(d.enterActiveIfOpponentRest,true);
 assert.equal(d.trigger,'get');
 assert.deepEqual(d.effects.onAttack,[{op:'skipNextActiveOppRest',optional:true}]);
 for(const oppRest of [false,true]){
  const {s,source}=readyToPlay(oppRest);
  assert.equal(s.players[0].front[0].ready,oppRest);
  assert.equal(s.players[0].front[0].uid,source.uid);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('BLC-1-006 official opponent ENERGY REST target: paid play, attack, mandatory legal choices and next refresh',()=>{
 let {s,source,target,blocker}=readyToPlay(true);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:source.uid});
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:target.uid}
 ]);
 for(const diff of ['normal','hard'])
  assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:diff}),
   {type:'chooseRestBp',uid:target.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:target.uid});
 assert.equal(s.continuousStates.length,1);
 assert.equal(s.pending.kind,'block');
 assert.deepEqual(universalPublicView(packs,s,0).players[1].energy[0].restrictions,
  [{kind:'skipNextActive',until:null}]);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.pending,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(s.players[1].energy[0].uid,target.uid);
 assert.equal(s.players[1].energy[0].ready,false);
 assert.equal(s.continuousStates.length,0);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
