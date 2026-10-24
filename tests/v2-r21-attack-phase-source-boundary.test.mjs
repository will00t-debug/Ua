import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const ids=Array.from({length:13},(_,i)=>'Q'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({
 id,name:id==='Q00'?'SourceRole':id==='Q02'?'PeerRole':id,
 type:id==='Q01'?'event':'character',color:'blue',energy:0,ap:1,
 bp:1000,gen:1,implementation:['Q00','Q01','Q02'].includes(id)?'dsl':'vanilla',
 ...(id==='Q00'?{effects:{onAttack:[{op:'drawDiscard',count:1,discardCount:1}]},
  phaseEffects:[{phase:'main',edge:'end',turn:'own',
   then:[{op:'drawDiscard',count:1,discardCount:1}]}]}:{}),
 ...(id==='Q02'?{phaseEffects:[{phase:'main',edge:'end',turn:'own',
  then:[{op:'draw',count:1}]}]}:{}),
 ...(id==='Q01'?{moveTriggers:[{when:{from:'hand',to:'outside',
  reasons:['payment','own-effect'],sourceName:'SourceRole',
  sourceColor:'blue',sourceOnField:true},then:[{op:'draw',count:1}]}]}:{})
}));
const pack=createUniversalPack({id:'r21-attack-phase-boundary',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[0][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }throw Error('Physical UID not found '+id);
}
function prepared(phase){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:21022,first:0});
 const source=take(s,'Q00'),trigger=take(s,'Q01');
 source.ready=true;s.players[0].front[0]=source;s.players[0].hand.push(trigger);
 let peer=null;
 if(phase==='main'){peer=take(s,'Q02');peer.ready=true;s.players[0].front[1]=peer;}
 s.phase=phase;
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,source,trigger,peer};
}
test('onAttack own move trigger resolves after discard choice and before blocker decision',()=>{
 let {s,source,trigger}=prepared('attack');
 const action=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===source.uid);
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(s.effectQueue.some(x=>x.op==='sourceResolutionBoundary'&&x.sourceUid===source.uid));
 assert.ok(s.effectQueue.some(x=>x.op==='openBlock'));
 const prior=s.zoneMoveEvents.length;
 assert.ok(legalUniversalActions(packs,s).some(x=>x.uid===trigger.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:trigger.uid});
 assert.equal(s.pending?.kind,'block','blocker decision stays after source and triggered draw');
 const moves=s.zoneMoveEvents.slice(prior);
 const paid=moves.find(x=>x.uid===trigger.uid&&x.to==='outside');
 const auto=moves.find(x=>x.sourceUid===trigger.uid&&x.from==='deck');
 assert.ok(paid&&auto&&paid.order<auto.order);
 assert.equal(paid.sourceUid,source.uid);
 assert.equal(universalPublicView(packs,s,1).zoneMoveEvents,undefined);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('phaseOrder selected source fully resolves before remaining source; no double trigger',()=>{
 let {s,source,trigger,peer}=prepared('main');
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.pending?.kind,'phase-order');
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.length,2);
 for(const difficulty of ['normal','hard'])
  assert.ok(legal.some(a=>a.key===chooseUniversalAiAction(packs,s,{difficulty}).key));
 s=dispatchUniversalAction(packs,s,legal.find(a=>a.key.startsWith(source.uid+':')));
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(s.effectQueue.some(x=>x.op==='sourceResolutionBoundary'&&x.sourceUid===source.uid));
 assert.ok(!s.zoneMoveEvents.some(x=>x.sourceUid===trigger.uid&&x.from==='deck'));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:trigger.uid});
 const draws=s.zoneMoveEvents.filter(x=>x.from==='deck'&&x.to==='hand'&&x.reason==='own-effect');
 assert.deepEqual(draws.map(x=>x.sourceUid),[source.uid,trigger.uid,peer.uid]);
 assert.equal(s.zoneMoveEvents.filter(x=>x.sourceUid===trigger.uid&&x.from==='deck').length,1);
 assert.equal(s.pending,null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
