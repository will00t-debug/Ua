import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Existing DSL composition acceptance; no new operator or real card port.
// Source onPlay: optional two modes -> optional physical payment -> optional
// once-per-name follow-up; interrupted choices retain existing queue order.
const ids=Array.from({length:13},(_,i)=>'X'+String(i).padStart(2,'0'));
const profile=[
 {op:'chooseOne',optional:true,options:[
  {id:'pay',label:'Pay one then draw',turn:'own',then:[
   {op:'discardGate',optional:true,then:[{op:'draw',count:1}]}]},
  {id:'simple',label:'Draw',turn:'any',then:[{op:'draw',count:1}]}
 ]},
 {op:'oncePerTurnGate',scope:'name',optional:true,then:[{op:'draw',count:1}]}
];
const specs=ids.map(id=>({
 id,name:id,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
 implementation:id==='X00'?'dsl':'vanilla',
 ...(id==='X00'?{effects:{onPlay:profile}}:{})
}));
const pack=createUniversalPack({id:'r19-dsl-chain-qa',cards:specs}),packs=[pack,pack];
const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
function take(s,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function open(){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:1905});
 const source=take(s,'X00');s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const act=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,source};
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const chosen=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chosen)),difficulty);
 }
}
test('existing choice, paid discard, once-name optional and queued draw compose without phantom cost',()=>{
 let {s,source}=open();
 aiLegal(s);
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseEffectMode',mode:'skip'},
  {type:'chooseEffectMode',mode:'pay'},
  {type:'chooseEffectMode',mode:'simple'}
 ]);
 const pristine=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'unknown'}),/not currently legal/);
 assert.deepEqual(s,pristine);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'pay'});
 assert.equal(s.pending?.kind,'effect-discard-gate');
 aiLegal(s);
 const beforeSkip=s.zoneMoveEvents.length;
 const empty=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null});
 assert.equal(empty.zoneMoveEvents.length,beforeSkip,
  'skipping cost must never add an event beyond the already recorded legal play');
 assert.equal(empty.pending?.kind,'effect-once-choice');
 const paidUID=legalUniversalActions(packs,s).find(a=>a.uid!==null).uid;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:paidUID});
 const payments=s.zoneMoveEvents.filter(e=>e.reason==='payment'&&
  e.from==='hand'&&e.to==='outside');
 assert.equal(payments.length,1);
 const move=payments[0];
 assert.deepEqual([move.uid,move.from,move.to,move.reason,move.sourceUid,move.sourceCardId],
  [paidUID,'hand','outside','payment',source.uid,'X00']);
 assert.equal(s.pending?.kind,'effect-once-choice');
 aiLegal(s);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'activate'});
 assert.equal(s.players[0].hand.length,hand+1,'queued once-per-name draw resolves after payment');
 assert.equal(s.pending,null);
 assert.deepEqual(s.onceEffectUses[0],['name:X00']);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('declining first mode or paid gate never skips required once-choice priority',()=>{
 let {s}=open();
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'skip'});
 assert.equal(s.pending.kind,'effect-once-choice');
 assert.equal(s.zoneMoveEvents.some(e=>e.reason==='payment'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'skip'});
 assert.equal(s.pending,null);
 assert.deepEqual(s.onceEffectUses[0],[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('nested DSL trust boundary rejects unknown ops and impossible gates',()=>{
 const source=specs[0];
 for(const options of [
  [{...profile[0].options[0],then:[{op:'unreviewedMagic'}]},profile[0].options[1]],
  [{...profile[0].options[0],then:[{op:'discardGate',optional:true,then:[
   {op:'unknownEffect',count:1}]}]},profile[0].options[1]],
  [{...profile[0].options[0],id:'same'}, {...profile[0].options[1],id:'same'}]
 ]){
  assert.throws(()=>createUniversalPack({id:'bad-r19',cards:[{...source,
   effects:{onPlay:[{op:'chooseOne',optional:true,options}]}}]}),/invalid|unsupported|unknown/);
 }
});
