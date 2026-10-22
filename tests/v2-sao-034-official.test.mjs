import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const packs=[registeredV2TitlePack('sword-art-online'),registeredV2TitlePack('bleach')];
const saoIds=['SAO-1-020','SAO-1-034','SAO-1-001','SAO-1-016',
 'SAO-1-019','SAO-1-023','SAO-1-035','SAO-1-039','SAO-1-042',
 'SAO-1-046','SAO-1-054','SAO-1-055','SAO-1-058'];
const bleachIds=['BLC-1-005','BLC-1-002','BLC-1-012','BLC-1-018',
 'BLC-1-021','BLC-1-071','BLC-1-083','BLC-1-086',
 'BLC-1-035','BLC-1-068','BLC-1-010','BLC-1-075','BLC-1-089'];
function deck(ids){const x=Object.fromEntries(ids.map(id=>[id,4]));x[ids.at(-1)]=2;return x;}
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Physical '+id+' missing');
}
function beforeEvent(life){
 let s=newUniversalMatch(packs,{decks:[deck(saoIds),deck(bleachIds)],first:0,seed:843});
 const evt=take(s,0,'SAO-1-034');s.players[0].hand.push(evt);
 for(let slot=0;slot<3;slot++){
  const e=take(s,0,'SAO-1-020');e.ready=false;s.players[0].energy[slot]=e;
 }
 const victim=take(s,1,'BLC-1-005');victim.ready=true;s.players[1].front[0]=victim;
 s.players[0].outside.push(...s.players[0].life.splice(life));
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===evt.uid);
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 return {s,evt,victim};
}
test('SAO-1-034 official pinned print, SPECIAL trigger and 5/4 life branches in real cross-title packs',()=>{
 const source=SAO_OFFICIAL_CARDS.find(x=>x.id==='SAO-1-034');
 const printed=packs[0].cards['SAO-1-034'];
 assert.match(source.source,/unionarena-tcg.com\/jp\/cardlist/);
 assert.equal(printed.name,source.nameJa);
 assert.equal(printed.energy,3);assert.equal(printed.ap,1);
 assert.equal(printed.trigger,'special');
 assert.deepEqual(printed.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(printed.effects.onPlay,[{op:'restOrRetireOppFrontByLife',
  bp:5000,lifeAtMost:4,optional:false}]);
 for(const life of [5,4]){
  let {s,evt,victim}=beforeEvent(life);
  const retirement=life===4;
  assert.equal(s.pending.kind,retirement?'effect-retire-bp':'effect-rest-bp');
  const action=legalUniversalActions(packs,s)[0];
  assert.equal(action.type,retirement?'chooseRetireBp':'chooseRestBp');
  assert.equal(action.uid,victim.uid);
  for(const difficulty of ['normal','hard'])
   assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty}),action);
  s=dispatchUniversalAction(packs,s,action);
  assert.equal(s.players[1].front[0]===null,retirement);
  assert.equal(s.continuousStates.length,retirement?0:1);
  assert.ok(s.players[0].outside.some(c=>c.uid===evt.uid));
  assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
