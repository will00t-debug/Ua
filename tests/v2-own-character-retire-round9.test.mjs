import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// MST074 official onPlay: optional retire one own CHARACTER, on success DRAW 2.
// These are synthetic generic component cards; not official registry identities.
const cards=Array.from({length:13},(_,i)=>({
 id:'CRT-'+i,name:'Card'+i,color:'green',type:i===0?'field':'character',
 energy:0,ap:1,bp:i===0?0:2000,gen:1,implementation:i<2?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[{op:'retireOwnCharacterOne',
  optional:true,after:[{op:'draw',count:2}]}]}}:{}),
 ...(i===1?{effects:{onRetire:[{op:'draw',count:1}]}}:{})
}));
const pack=createUniversalPack({id:'own-character-retire-r9',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,id){for(const zone of ['hand','deck','life','outside']){
 const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function scenario(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:9121});
 const source=take(s,'CRT-0'),target=take(s,'CRT-1');
 s.players[0].hand.push(source);
 target.ready=true;s.players[0].front[0]=target;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 return {s,target};
}
test('own character retirement selects owned field UID, resolves true onRetire DRAW1 before follow-up DRAW2',()=>{
 let {s,target}=scenario();const hand=s.players[0].hand.length;
 assert.equal(s.pending.kind,'effect-retire-own-character');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOwnCharacterRetire',uid:null},{type:'chooseOwnCharacterRetire',uid:target.uid}]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnCharacterRetire',uid:'0-fake'}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnCharacterRetire',uid:target.uid});
 assert.equal(s.players[0].hand.length,hand+3);
 assert.equal(countRetirementsThisTurn(s,0,'character'),1);
 assert.ok(s.players[0].outside.some(c=>c.uid===target.uid));
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('optional declined cost does not retire or draw',()=>{
 let {s,target}=scenario();const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnCharacterRetire',uid:null});
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].front[0].uid,target.uid);
 assert.equal(countRetirementsThisTurn(s,0,'character'),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('unsupported and malformed followup DSL is rejected before play',()=>{
 for(const op of [{op:'retireOwnCharacterOne',optional:false,after:[{op:'draw',count:2}]},
  {op:'retireOwnCharacterOne',optional:true,after:[{op:'millTop',count:2}]},
  {op:'retireOwnCharacterOne',optional:true,after:[{op:'draw',count:2}],zone:'outside'}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],
   effects:{onPlay:[op]}}]}),/invalid own character retirement and follow-up/);
 }
});
