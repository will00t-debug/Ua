import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const cards=Array.from({length:13},(_,i)=>({
 id:'M'+i,name:'M'+i,type:'character',color:'blue',energy:0,ap:1,
 bp:i===4?1500: i===3?2000:3000,gen:1,implementation:i===0?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[{op:'enemyBpDown',bp:1500,minBp:2000,maxTargets:2,optional:true},{op:'draw',count:1}]}}:{})
}));
const a=createUniversalPack({id:'r25-a',cards}),b=createUniversalPack({id:'r25-b',cards}),packs=[a,b];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }throw Error('missing '+id);
}
function setup(owner){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:2519,first:owner});
 const source=take(s,owner,'M0');
 const foe=1-owner,eligible=[take(s,foe,'M2'),take(s,foe,'M3')],invalid=take(s,foe,'M4');
 s.players[foe].front.splice(0,3,...eligible,invalid);
 s.players[owner].hand.push(source);
 s.phase='main';
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play,{actor:owner});
 return {s,source,foe,eligible,invalid};
}
for(const owner of [0,1])for(const n of [0,1,2])test('same shared multi BP grammar, controller '+owner+', targets '+n,()=>{
 let {s,source,foe,eligible,invalid}=setup(owner);
 assert.equal(s.pending?.kind,'effect-target-many');
 const initial=s.players[owner].deck.length;
 const choices=legalUniversalActions(packs,s);
 assert.equal(choices.filter(a=>a.uid!==null).length,2);
 assert.ok(!choices.some(a=>a.uid===invalid.uid));
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const frozen=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid:invalid.uid},{actor:owner}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,choices[0],{actor:foe}),/Wrong player turn/);
 assert.deepEqual(s,frozen);
 for(let i=0;i<n;i++){
  s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid:eligible[i].uid},{actor:owner});
  if(i===0&&n===2){
   assert.equal(s.pending.kind,'effect-target-many');
   assert.equal(universalBp(packs,s,s.players[foe].front[0]),3000,'do not apply mid-selection');
   assert.ok(!legalUniversalActions(packs,s).some(x=>x.uid===eligible[0].uid),'cannot repeat physical UID');
   s=JSON.parse(JSON.stringify(s));
   assert.equal(assertUniversalMatch(packs,s),true);
  }
 }
 if(n<2)s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid:null},{actor:owner});
 assert.equal(s.pending,null);assert.equal(s.effectQueue.length,0);
 assert.equal(s.players[owner].deck.length,initial-1,'source continuation draw runs after selecting');
 assert.equal(universalBp(packs,s,s.players[foe].front[0]),n>=1?1500:3000);
 assert.equal(universalBp(packs,s,s.players[foe].front[1]),n>=2?500:2000);
 assert.equal(universalBp(packs,s,s.players[foe].front[2]),1500);
 assert.equal(universalPublicView(packs,s,foe).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('unknown, unbounded and non-optional dual-target profiles reject at pack boundary',()=>{
 const base=cards[0];for(const e of [
  {op:'enemyBpDown',bp:1500,maxTargets:3,optional:true},
  {op:'enemyBpDown',bp:1500,maxTargets:2,optional:false},
  {op:'enemyBpDown',bp:1500,maxTargets:2,optional:true,zone:'field'},
  {op:'enemyBpDown',bp:1500,maxTargets:2,optional:true,minBp:'2000'}
 ])assert.throws(()=>createUniversalPack({id:'invalid-many',cards:[{...base,effects:{onPlay:[e]}}]}),/invalid/i);
});
