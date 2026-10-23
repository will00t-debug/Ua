import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const special={op:'deployOwnHandSpecial',type:'character',color:'blue',ap:1,
 trait:'Survivor',maxEnergy:null,ready:true,max:1,protectionScope:'character'};
const make=(n,other={})=>({id:'QA-'+String(n).padStart(3,'0'),name:'QA'+n,
 type:'character',color:'blue',energy:0,ap:1,bp:1000,gen:1,
 traits:['Survivor'],implementation:'vanilla',...other});
const cards=[
 make(1,{implementation:'dsl',effects:{onPlay:[
  {op:'recoverOutsideOne',filter:{field:'type',value:'character'},optional:true},
  special]}}),
 make(2,{implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}}),
 ...Array.from({length:11},(_,i)=>make(i+3,
  i===0?{type:'event',traits:[]}:
  i===1?{color:'purple'}:
  i===2?{traits:['wrong']}:
  i===3?{ap:2}:{}))
];
const pack=createUniversalPack({id:'r41-demo',version:'v1',cards});
const packs=[pack,pack],deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
function scene(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:4106});
 const take=id=>{for(const zone of ['hand','deck','life','outside']){
  const i=s.players[0][zone].findIndex(c=>c.cardId===id);
  if(i>=0)return s.players[0][zone].splice(i,1)[0];
 }throw Error('missing '+id)};
 const source=take('QA-001'),recovered=take('QA-002'),other=take('QA-007');
 s.players[0].hand.push(source,other);s.players[0].outside.push(recovered);
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);s=use(s,play);
 assert.equal(s.pending?.kind,'effect-recover-outside');
 return {s,source,recovered,other};
}
test('R41 0/1 outside recovery and 0/1 ACTIVE hand deployment are separate',()=>{
 let {s,recovered}=scene();
 s=use(s,{type:'chooseOutsideRecovery',uid:recovered.uid});
 assert.equal(s.pending?.kind,'effect-hand-rest');
 const action=legalUniversalActions(packs,s).find(a=>a.uid===recovered.uid&&a.line==='front');
 assert.ok(action);
 const paid=s.players[0].apCards.filter(c=>c.ready).length;
 s=use(s,action);
 assert.equal(s.players[0].front[action.slot].uid,recovered.uid);
 assert.equal(s.players[0].front[action.slot].ready,true);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,paid);
 assert.ok(s.continuousStates.some(c=>c.kind==='cannotBeChosenByOppEffect'&&
  c.targetUid===recovered.uid&&c.selectionScope==='character'));
 assert.equal(assertUniversalMatch(packs,s),true);
 let t=scene().s;t=use(t,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(t.pending?.kind,'effect-hand-rest');
 t=use(t,{type:'chooseHandRest',uid:null});
 assert.equal(t.pending,null);
 assert.equal(t.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,t),true);
});
test('R41 recovered A stays in hand while original B deploys; both UID moves recorded',()=>{
 let {s,source,recovered,other}=scene();
 s=use(s,{type:'chooseOutsideRecovery',uid:recovered.uid});
 const act=legalUniversalActions(packs,s).find(a=>a.uid===other.uid&&a.line==='front');
 assert.ok(act);
 const paid=s.players[0].apCards.filter(c=>c.ready).length;
 s=use(s,act);
 assert.ok(s.players[0].hand.some(c=>c.uid===recovered.uid));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,paid);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===recovered.uid&&e.from==='outside'&&e.to==='hand'&&e.sourceUid===source.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===other.uid&&e.from==='hand'&&e.to==='front'&&e.sourceUid===source.uid));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R41 malformed UID atomic; AI and private hand use same legal choices',()=>{
 let {s,recovered}=scene();s=use(s,{type:'chooseOutsideRecovery',uid:recovered.uid});
 const before=structuredClone(s);
 assert.throws(()=>use(s,{type:'chooseHandRest',uid:'0-forged',line:'front',slot:0}),/not currently legal/);
 assert.deepEqual(s,before);
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(b=>JSON.stringify(a)===JSON.stringify(b)));
 }
 assert.ok(universalPrivateChoices(packs,s,0).options.some(o=>o.action.uid===recovered.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
});
test('R41 strict data profile rejects counterfeit payment/scope/type/energy cap',()=>{
 for(const wrong of [{...special,ap:0},{...special,payAp:1},
  {...special,protectionScope:'event'},{...special,type:'event'},
  {...special,maxEnergy:-1}]){
  assert.throws(()=>createUniversalPack({id:'r41-invalid',
   cards:[{...cards[0],effects:{onPlay:[wrong]}},...cards.slice(1)]}),/invalid/);
 }
});

test('R41 saved special entry cannot forge typed filter, ready or target protection scope',()=>{
 let {s,recovered}=scene();s=use(s,{type:'chooseOutsideRecovery',uid:recovered.uid});
 assert.equal(assertUniversalMatch(packs,s),true);
 for(const mutate of [
  q=>{q.protectionScope='any';},q=>{q.trait=null;},q=>{q.ready=false;},
  q=>{q.sourceUid='0-forged';},q=>{q.choices=[];},q=>{q.extra=true;}
 ]){
  const forged=structuredClone(s);mutate(forged.pending);
  assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid special hand entry/);
 }
});
