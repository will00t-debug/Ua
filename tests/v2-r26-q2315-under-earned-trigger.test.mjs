import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Official 2026-09-04 Q2315/2316, 2024-07-19 Q1033/Q1046.
// Synthetic physical deck: all rules are declared, NOT officially registered.
const name='黒崎 一護',eventName='その名は斬月';
const when={from:'hand',to:'outside',sourceOnField:true,
 sourceName:name,sourceColor:'blue',reasons:['payment','own-effect']};
const cards=Array.from({length:13},(_,i)=>({
 id:'RQ'+i,name:i===0?name:i===1?eventName:i===2?'毒ヶ峰 リルカ':'Other '+i,
 color:'blue',type:i===1?'event':'character',energy:0,ap:1,bp:i===1?0:4000,gen:i===1?0:1,
 implementation:i<=2?'dsl':'vanilla',
 ...(i===0?{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment:{zone:'hand',field:'name',
    match:'containsAny',values:['斬月','月牙']},then:[
    {op:'draw',count:1},{op:'buffSelf',bp:1000},
    {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',
     then:[{op:'draw',count:1}]}
   ]}]}}:{}),
 ...(i===1?{moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{}),
 ...(i===2?{moveObserver:{op:'restSelfTuckMovedFaceDown',when}}:{})
}));
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const packs=[createUniversalPack({id:'q2315-test-title-a',cards}),
 createUniversalPack({id:'q2315-test-title-b',cards})];
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function game(owner){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:owner,seed:2615});
 const source=take(s,owner,'RQ0'),moved=take(s,owner,'RQ1'),observer=take(s,owner,'RQ2');
 source.ready=true;source.fieldEntryStamp=s.nextFieldEntryStamp++;
 observer.ready=true;observer.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner].front[0]=source;s.players[owner].energy[0]=observer;
 s.players[owner].hand.push(moved);
 s.phase='main';
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,moved,observer};
}
for(const owner of [0,1])for(const first of ['observer','moved'])
 test('Q2315 physical 047 earned draw survives optional facedown under after complete Ichigo MAIN '+owner+'/'+first,()=>{
  let {s,source,moved,observer}=game(owner);
  const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='frontOnce');
  assert.ok(activate);
  s=dispatchUniversalAction(packs,s,activate,{actor:owner});
  assert.equal(s.pending.kind,'effect-discard-gate');
  const before=s.players[owner].deck.length;
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:owner});
  assert.equal(s.pending.kind,'effect-move-order');
  assert.equal(s.players[owner].deck.length,before-1,'MAIN draw must complete before earned order');
  assert.equal(universalBp(packs,s,s.players[owner].front[0]),5000);
  assert.equal(s.continuousStates.some(x=>x.kind==='grantedOnAttack'&&x.targetUid===source.uid),true);
  assert.equal(s.players[owner].outside.some(x=>x.uid===moved.uid),true);
  const actions=legalUniversalActions(packs,s);
  assert.equal(actions.length,2);
  for(const difficulty of ['normal','hard']){
   const choice=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(choice)));
  }
  const firstChoice=actions.find(a=>a.key.startsWith(first==='observer'?'observer-':'moved-'));
  assert.ok(firstChoice);
  const beforeInvalid=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseMoveEffectOrder',key:'invalid'},{actor:owner}),/not currently legal/);
  assert.deepEqual(s,beforeInvalid);
  s=dispatchUniversalAction(packs,s,firstChoice,{actor:owner});
  if(first==='moved')assert.equal(s.players[owner].deck.length,before-2);
  else assert.equal(s.pending.kind,'effect-rest-tuck');
  if(first==='moved'){
   assert.equal(s.pending.kind,'effect-rest-tuck');
  }
  s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
  s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:owner});
  assert.equal(s.pending.kind,'effect-tuck-moved');
  assert.equal(s.players[owner].energy[0].ready,false,'actual READY to REST paid');
  s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:moved.uid},{actor:owner});
  assert.equal(s.pending,null);
  assert.equal(s.players[owner].deck.length,before-2,'Q2315 earned draw exactly once after full MAIN');
  assert.equal(s.players[owner].outside.some(x=>x.uid===moved.uid),false);
  assert.equal(s.players[owner].energy[0].under.length,1);
  assert.equal(s.players[owner].energy[0].under[0].uid,moved.uid);
  assert.equal(s.players[owner].energy[0].under[0].faceDown,true);
  const own=universalPublicView(packs,s,owner),foe=universalPublicView(packs,s,1-owner);
  assert.equal(own.players[owner].energy[0].underLayers[0].uid,moved.uid);
  assert.deepEqual(foe.players[owner].energy[0].underLayers,[{faceDown:true}]);
  assert.equal(JSON.stringify(foe.players[owner].energy[0].underLayers).includes(moved.cardId),false);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
for(const owner of [0,1])test('Q2315 optional REST decline still releases already-earned move draw '+owner,()=>{
 let {s,source,moved}=game(owner);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:owner});
 const start=s.players[owner].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:owner});
 const a=legalUniversalActions(packs,s).find(a=>a.key.startsWith('observer-'));
 s=dispatchUniversalAction(packs,s,a,{actor:owner});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'skip'},{actor:owner});
 assert.equal(s.pending,null);
 assert.equal(s.players[owner].deck.length,start-2);
 assert.equal(s.players[owner].outside.some(x=>x.uid===moved.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Q2315 generic watcher fails closed without printed source identity or correct origin',()=>{
 for(const broken of [{...when,sourceName:'別人'}, {...when,sourceOnField:false},
  {...when,from:'deck'}, {...when,reasons:['rule']}]){
  const changed=cards.map(c=>c.id==='RQ2'?{...c,moveObserver:{op:'restSelfTuckMovedFaceDown',when:broken}}:c);
  if(broken.sourceName==='別人'){
   const registered=createUniversalPack({id:'missing-source-match',cards:changed});
   assert.ok(registered.cards.RQ2.moveObserver);
  }else assert.throws(()=>createUniversalPack({id:'invalid-watcher',cards:changed}),/invalid moved-card watcher provenance/);
 }
});

test('Q2315 two distinct watcher UIDs, one physical 047 cannot be tucked twice',()=>{
 let {s,source,moved,observer}=game(0);
 const second=take(s,0,'RQ2');
 second.ready=true;second.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[1]=second;
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 const deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-move-order');
 assert.equal(s.pending.entries.length,3,'both field watcher UIDs earned distinct reactions');
 const first=legalUniversalActions(packs,s).find(a=>a.key.includes(observer.uid));
 assert.ok(first);
 s=dispatchUniversalAction(packs,s,first,{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:moved.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-move-order');
 const secondChoice=legalUniversalActions(packs,s).find(a=>a.key.includes(second.uid));
 assert.ok(secondChoice);
 s=dispatchUniversalAction(packs,s,secondChoice,{actor:0});
 // The second observer can decline the REST: the event already resides
 // physically under the first and can never be selected twice.
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'skip'},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deckBefore-2);
 assert.equal(s.players[0].energy[0].under[0].uid,moved.uid);
 assert.deepEqual(s.players[0].energy[1].under,[]);
 assert.equal(s.players[0].energy[1].ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
for(const kind of ['wrongName','wrongColor'])test('Q2315 strict source '+kind+' prevents watcher and 047 bonus',()=>{
 const different=cards.map(c=>c.id==='RQ0'?{...c,
  ...(kind==='wrongName'?{name:'他の一護'}:{color:'red'})}:c);
 const badPacks=[createUniversalPack({id:'different-a',cards:different}),
  createUniversalPack({id:'different-b',cards:different})];
 let s=newUniversalMatch(badPacks,{decks:[deck,deck],first:0,seed:26156});
 const source=take(s,0,'RQ0'),moved=take(s,0,'RQ1'),observer=take(s,0,'RQ2');
 source.ready=true;source.fieldEntryStamp=s.nextFieldEntryStamp++;
 observer.ready=true;observer.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=source;s.players[0].energy[0]=observer;
 s.players[0].hand.push(moved);s.phase='main';
 s=dispatchUniversalAction(badPacks,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(badPacks,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 assert.equal(s.pending,null,'no source-qualified observer/order effect');
 assert.equal(s.players[0].deck.length,before-1,'MAIN draw only');
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(s.players[0].energy[0].under.length,0);
 assert.ok(s.players[0].outside.some(x=>x.uid===moved.uid));
 assert.equal(assertUniversalMatch(badPacks,s),true);
});
test('a physical move watched by the opponent does not grant its character an action',()=>{
 let {s,source,moved}=game(0);
 const enemy=take(s,1,'RQ2');
 enemy.ready=true;enemy.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].energy[0]=enemy;
 // Remove own observer from the field, preserving all 50 physical cards.
 const own=s.players[0].energy[0];
 s.players[0].energy[0]=null;s.players[0].outside.push(own);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(s.players[1].energy[0].ready,true);
 assert.deepEqual(s.players[1].energy[0].under,[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('R27 earned REST observer loses legal REST when exact target leaves during pending, card moves conserved',()=>{
 let {s,source,moved,observer}=game(0);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 const first=legalUniversalActions(packs,s).find(a=>a.key.includes('observer-'));
 s=dispatchUniversalAction(packs,s,first,{actor:0});
 assert.equal(s.pending.kind,'effect-rest-tuck');
 const o=s.players[0].energy[0];
 s.players[0].energy[0]=null;s.players[0].outside.push(o);
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRestTuck',mode:'skip'}]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:0}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'skip'},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.some(c=>c.uid===moved.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===moved.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R27 target leaves after earned REST but before tuck: exact UID cannot be attached to another incarnation',()=>{
 let {s,source,moved}=game(0);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.key.includes('observer-')),{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:0});
 assert.equal(s.pending.kind,'effect-tuck-moved');
 const o=s.players[0].energy[0];
 s.players[0].energy[0]=null;s.players[0].outside.push(o);
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseTuckMoved',uid:null}]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:moved.uid},{actor:0}),/not currently legal/);
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:null},{actor:0});
 assert.equal(s.players[0].outside.some(c=>c.uid===moved.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('R27 adversarial saved move choices reject forged owner, move UID, watcher stamp and injected draw',()=>{
 let {s,source,moved}=game(0);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-move-order');
 const edits=[
  x=>x.pending.entries[0].jobs[0].sourceStamp+=100,
  x=>x.pending.entries[0].jobs[0].movedUid=x.players[0].hand[0].uid,
  x=>x.pending.entries[0].jobs[0].owner=1,
  x=>x.pending.entries[0].jobs[0].op='draw',
  x=>x.pending.entries[1].jobs[0].sourceUid=x.players[0].hand[0].uid,
  x=>x.pending.entries[1].jobs[0].count=12,
  x=>x.pending.entries[1].key='moved-1-9-0',
  x=>x.pending.entries.push(structuredClone(x.pending.entries[0])),
  x=>x.pending.entries[0].jobs[0].unknown=true
 ];
 for(const corrupt of edits){
  const bad=structuredClone(s);corrupt(bad);
  assert.throws(()=>assertUniversalMatch(packs,bad),'forged move-order save must fail');
 }
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R27 paused REST/tuck rejects forged provenance with same-looking UID',()=>{
 let {s,source,moved}=game(0);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'frontOnce'},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.key.startsWith('observer-')),{actor:0});
 const noStamp=structuredClone(s);noStamp.pending.sourceStamp++;
 assert.throws(()=>assertUniversalMatch(packs,noStamp),/Missing earned/);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:0});
 const noEvent=structuredClone(s);
 noEvent.zoneMoveEvents.find(x=>x.uid===moved.uid&&x.from==='hand'&&x.to==='outside').earnedFieldObservers=[];
 assert.throws(()=>assertUniversalMatch(packs,noEvent),/Invalid private movement history|Missing earned/);
 assert.equal(assertUniversalMatch(packs,s),true);
});


// R29 official MST Q2220/Q2228 and BLEACH Q2315/Q2316 distinction:
// sealing the ORIGINAL source/watcher AFTER the physical hand→outside event
// was earned must not retroactively erase the already-earned 047 draw or
// the eligible exact stamped field observer's independent REST choice.
for(const owner of [0,1])for(const movedFirst of [false,true])
 test('R29 seal AFTER earned Q2315 move preserves both independent earned choices, '+owner+'/'+movedFirst,async()=>{
  const {grantContinuousState,originalEffectsDisabled}=
   await import('../dist/universal-v2/continuous-states.mjs');
  let {s,source,moved,observer}=game(owner);
  const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid);
  assert.ok(activate);
  s=dispatchUniversalAction(packs,s,activate,{actor:owner});
  const before=s.players[owner].deck.length;
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:moved.uid},{actor:owner});
  assert.equal(s.pending?.kind,'effect-move-order');
  assert.equal(s.players[owner].deck.length,before-1,'source MAIN completed, moved-event bonus deferred');
  const entries=legalUniversalActions(packs,s);
  assert.equal(entries.length,2);
  assert.ok(entries.some(x=>x.key.startsWith('observer-')));
  assert.ok(entries.some(x=>x.key.startsWith('moved-')));
  for(const target of [source,observer])
   grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1-owner,
    sourceUid:target.uid,targetUid:target.uid,sourceLinked:false,
    until:{player:owner,phase:'attack',edge:'end'}});
  assert.equal(originalEffectsDisabled(s,s.players[owner].front[0]),true);
  assert.equal(originalEffectsDisabled(s,s.players[owner].energy[0]),true);
  s=JSON.parse(JSON.stringify(s));
  assert.equal(assertUniversalMatch(packs,s),true);
  const first=legalUniversalActions(packs,s).find(x=>
   x.key.startsWith(movedFirst?'moved-':'observer-'));
  assert.ok(first);
  for(const difficulty of ['normal','hard'])
   assert.ok(legalUniversalActions(packs,s).some(x=>
    JSON.stringify(x)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
  s=dispatchUniversalAction(packs,s,first,{actor:owner});
  assert.equal(s.pending?.kind,'effect-rest-tuck');
  const rests=legalUniversalActions(packs,s);
  assert.ok(rests.some(x=>x.type==='chooseRestTuck'&&x.mode==='rest'),
   'already earned field observer can still pay actual REST despite later original silence');
  const snapshot=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},
   {actor:1-owner}),/Wrong player/);
  assert.deepEqual(s,snapshot);
  s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:owner});
  assert.equal(s.pending?.kind,'effect-tuck-moved');
  s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:moved.uid},{actor:owner});
  assert.equal(s.pending,null);
  assert.equal(s.players[owner].deck.length,before-2,
   'earned event draw survives original-text silence and later facedown placement');
  assert.equal(s.players[owner].energy[0].ready,false);
  assert.equal(s.players[owner].energy[0].under[0].uid,moved.uid);
  const own=universalPublicView(packs,s,owner),opp=universalPublicView(packs,s,1-owner);
  assert.equal(own.players[owner].energy[0].underLayers[0].uid,moved.uid);
  assert.deepEqual(opp.players[owner].energy[0].underLayers,[{faceDown:true}]);
  assert.equal(opp.players[owner].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
