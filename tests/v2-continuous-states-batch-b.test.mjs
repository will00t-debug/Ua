import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const cards=Array.from({length:13},(_,i)=>({id:'T'+String(i).padStart(2,'0'),
 name:'Unit '+i,color:'yellow',energy:0,ap:1,type:'character',
 bp:i===4?4000:2000,gen:i===0?4:1,implementation:'vanilla'}));
cards[1]={...cards[1],type:'event',bp:0,gen:0,implementation:'dsl',
 templateEffects:{onPlay:[{template:'restEnemyFrontSkipNextActive',optional:false}]}};
cards[2]={...cards[2],type:'event',bp:0,gen:0,implementation:'dsl',
 templateEffects:{onPlay:[{template:'skipNextActiveOppRest',optional:true}]}};
cards[3]={...cards[3],type:'event',bp:0,gen:0,implementation:'dsl',
 templateEffects:{onPlay:[{template:'restEnemyUnderBpSkipNextActive',bp:3000,optional:false}]}};
const packs=['BLEACH-example','SAO-example'].map(id=>createUniversalPack({id,cards}));
const deck=Object.fromEntries(cards.slice(0,12).map(c=>[c.id,4]));deck.T12=2;
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const list=s.players[p][z],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('No UID for '+id);
}
function setup(id,targetId='T05',line='front',ready=true,requirePayable=true){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:324,first:0});
 s.players[0].energy[0]=take(s,0,'T00');
 const evt=take(s,0,id);s.players[0].hand.push(evt);
 const target=take(s,1,targetId);target.ready=ready;s.players[1][line][0]=target;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===evt.uid);
 if(!requirePayable)return {evt,target,s,play};
 assert.ok(play,'event is payable with physical AP/energy');
 return {evt,target,s:dispatchUniversalAction(packs,s,play)};
}
test('Batch B: mandatory cross-title REST+skip has only legal target and persists to next refresh',()=>{
 let {s,target}=setup('T01');
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRestBp',uid:target.uid}]);
 for(const difficulty of ['normal','hard'])
  assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty}),
   {type:'chooseRestBp',uid:target.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:target.uid});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.continuousStates.length,1);
 assert.equal(universalPublicView(packs,s,1).players[1].front[0].restrictions[0].kind,'skipNextActive');
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch B: already REST on either field line; optional skip never invents payment',()=>{
 let {s,target}=setup('T02','T05','energy',false);
 assert.deepEqual(legalUniversalActions(packs,s),
  [{type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:target.uid}]);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:target.uid});
 assert.equal(s.continuousStates[0].targetUid,target.uid);
 assert.equal(s.continuousStates[0].targetOwner,1);
 assert.equal(assertUniversalMatch(packs,s),true);
 const before=setup('T02','T05','energy',false).s;
 const after=dispatchUniversalAction(packs,before,{type:'chooseRestBp',uid:null});
 assert.equal(after.continuousStates.length,0);
});
test('Batch B: printed-BP limit rejects ineligible high BP',()=>{
 const {s,target,evt,play}=setup('T03','T04','front',true,false);
 assert.equal(target.cardId,'T04');
 assert.equal(play,undefined,'mandatory event with no eligible target must be illegal to play');
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===evt.uid));
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates.length,0);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'event',uid:evt.uid}),
  /not currently legal/);
});
test('Batch B: malformed new DSL fails closed rather than gaining automatic support',()=>{
 const malformed=cards.map(c=>({...c}));
 malformed[1]={...malformed[1],templateEffects:undefined,
  effects:{onPlay:[{op:'skipNextActiveOppRest',optional:'yes'}]}};
 assert.throws(()=>createUniversalPack({id:'bad-rest-lock',cards:malformed}),
  /invalid existing-REST ACTIVE skip/);
});
