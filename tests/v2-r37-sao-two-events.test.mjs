import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalPrivateChoices,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
const packs=[registeredV2TitlePack('sword-art-online'),registeredV2TitlePack('mushoku-tensei')];
const names=['SAO-1-031','SAO-1-066','SAO-1-005','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-019','SAO-1-068','SAO-1-073','SAO-1-077','SAO-1-079','SAO-1-082','SAO-1-084'];
const others=['MST-1-062','MST-1-046','MST-1-050','MST-1-059','MST-1-063','MST-1-055','MST-1-057','MST-1-052','MST-1-069','MST-1-054','MST-1-075','MST-1-066','MST-1-070'];
const decks=[names,others].map(ids=>Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4])));
for(let i=0;i<2;i++)assert.deepEqual(validateUniversalDeck(packs[i],decks[i]),[]);
function take(s,p,id){for(const z of ['deck','hand','life','outside']){const a=s.players[p][z],
 i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);}
function setEnergy(s,ids){ids.forEach((id,i)=>{const c=take(s,0,id);c.ready=true;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;});}
function scene(id){
 let s=newUniversalMatch(packs,{decks,first:0,seed:id==='SAO-1-031'?37031:37066});
 const event=take(s,0,id);s.players[0].hand.push(event);
 const isNames=id==='SAO-1-031';
 const gen=isNames?['SAO-1-020','SAO-1-020','SAO-1-020']:['SAO-1-051','SAO-1-051'];
 setEnergy(s,gen);
 const seq=isNames?['SAO-1-005','SAO-1-005','SAO-1-020','SAO-1-051','SAO-1-057']:
  ['SAO-1-057','SAO-1-057','SAO-1-020','SAO-1-051'];
 const inspected=seq.map(c=>take(s,0,c));s.players[0].deck.unshift(...inspected);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(action,'official energy+AP must allow paying the EVENT');
 return {s,event,action,inspected};
}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
test('R37 two official source-pinned EVENTs match every printed stat and exact filter',()=>{
 for(const [id,color,energy,count,preds] of [
  ['SAO-1-031','yellow',3,5,[{field:'name',value:'キリト'},{field:'name',value:'アリス'},{field:'name',value:'ユージオ'}]],
  ['SAO-1-066','blue',2,4,[{field:'trait',value:'ALO'}]]]){
  const def=packs[0].cards[id],source=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(id));
  assert.equal(source.number,'UA15BT/'+id);
  assert.deepEqual([def.name,def.type,def.color,def.energy,def.ap,def.bp,def.gen,def.trigger],
   [source.nameJa,'event',color,energy,1,0,0,'draw']);
  assert.deepEqual(def.effects.onPlay,[{op:'searchTopUpToTwoBottom',count,max:2,rest:'bottom',filters:preds,logic:'any'}]);
 }
});
for(const id of ['SAO-1-031','SAO-1-066']){
 for(const n of [0,1,2])test(id+' paid true EVENT private TOP search selects '+n+' cards',()=>{
  let {s,event,action,inspected}=scene(id);
  const before=s.players[0].deck.map(c=>c.uid),ap=s.players[0].apCards.filter(c=>c.ready).length;
  const expected=id==='SAO-1-031'?[inspected[0],inspected[1]]:[inspected[0],inspected[1]];
  const forbidden=inspected[2];
  s=act(s,action);
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
  assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
  assert.equal(s.pending.kind,'effect-top-filter-many-choice');
  assert.equal(universalPrivateChoices(packs,s,1),null);
  const snapshot=structuredClone(s);
  for(const uid of [forbidden.uid,'0-not-in-top']){
   assert.throws(()=>act(s,{type:'chooseTopFilteredMany',uid}),/not currently legal/);
   assert.deepEqual(s,snapshot);
  }
  const picked=[];
  for(let i=0;i<n;i++){
   const uid=expected[i].uid;
   for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,s).some(a=>
    JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
   s=act(s,{type:'chooseTopFilteredMany',uid});picked.push(uid);
   assert.throws(()=>act(s,{type:'chooseTopFilteredMany',uid}),/not currently legal/);
   assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
   const live=universalPublicView(packs,s,1);
   assert.equal(live.players[0].hand,null);
   assert.deepEqual(live.publicReveals.map(x=>x.uid).filter(uid=>picked.includes(uid)),picked);
  }
  if(n<2)s=act(s,{type:'chooseTopFilteredMany',uid:null});
  const remainder=inspected.map(x=>x.uid).filter(uid=>!picked.includes(uid)).reverse();
  assert.equal(s.pending.kind,'effect-top-order');
  for(const uid of remainder)s=act(s,{type:'chooseTopOrder',uid});
  assert.equal(s.pending,null);
  assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...before.slice(inspected.length),...remainder]);
  assert.ok(picked.every(uid=>s.players[0].hand.some(c=>c.uid===uid)));
  const opp=universalPublicView(packs,s,1);
  assert.deepEqual(opp.publicReveals.filter(x=>picked.includes(x.uid)).map(x=>x.uid),picked);
  for(const uid of remainder)assert.ok(!JSON.stringify(opp).includes('"'+uid+'"'));
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('R37 legal PLAY preflight rejects missing event-required energy without consuming AP',()=>{
 for(const id of ['SAO-1-031','SAO-1-066']){
  let {s,event}=scene(id),c=s.players[0].energy[0];s.players[0].energy[0]=null;s.players[0].outside.push(c);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('R37 true DRAW LIFE of both EVENTs draws, without resolving the normal EVENT body',()=>{
 for(const id of ['SAO-1-031','SAO-1-066']){
  const opposite=[packs[1],packs[0]], ds=[decks[1],decks[0]];
  let s=newUniversalMatch(opposite,{decks:ds,first:0,seed:id==='SAO-1-031'?37201:37202});
  function pull(p,cid){for(const z of ['deck','hand','life','outside']){
   const a=s.players[p][z],i=a.findIndex(c=>c.cardId===cid);
   if(i>=0)return a.splice(i,1)[0];}throw Error(cid);}
  const actor=pull(0,'MST-1-046');actor.ready=true;actor.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=actor;
  const life=pull(1,id);s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(life);
  s=dispatchUniversalAction(opposite,s,{type:'next'});
  s=dispatchUniversalAction(opposite,s,{type:'next'});
  s=dispatchUniversalAction(opposite,s,{type:'next'});
  s=dispatchUniversalAction(opposite,s,{type:'attack',uid:actor.uid});
  s=dispatchUniversalAction(opposite,s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending.kind,'life-trigger');
  const deckBefore=s.players[1].deck.length;
  const use=legalUniversalActions(opposite,s).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.ok(use);s=dispatchUniversalAction(opposite,s,use);
  assert.equal(s.players[1].deck.length,deckBefore-1);
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(opposite,s),true);
 }
});
