import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// Synthetic cross-title fixtures, not official ported card text.
// Attack window: BP -2500, a second threshold retirement, draw, then opponent blocking.
// Protected Raid's facedown under-card is also the source of +1000 BP.
const base=Array.from({length:13},(_,i)=>({
 id:'R'+String(i).padStart(2,'0'),name:'Unit '+i,color:'green',
 type:'character',energy:i===0?0:2,ap:1,bp:2000,
 gen:i===0?4:1,implementation:'vanilla'
}));
const attackerCards=base.map(c=>c.id==='R10'?{
 ...c,implementation:'dsl',effects:{onAttack:[
  {op:'enemyBpDown',bp:2500},
  {op:'retireOppFrontUnderBp',bp:5000,bonusName:'Not Present',bonusBp:5000},
  {op:'draw',count:1}
 ]}
}:c);
const defenderCards=base.map(c=>c.id==='R08'?{
 ...c,raidName:'Unit 0',implementation:'dsl',effects:{onPlay:[]},
 conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:500}
}:c);
const packs=[
 createUniversalPack({id:'attack-window-raid-fixture',cards:attackerCards}),
 createUniversalPack({id:'protected-raid-fixture',cards:defenderCards})
];
const deck=Object.fromEntries(base.map(c=>[c.id,4]));
deck.R12=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],n=arr.findIndex(x=>x.cardId===id);
  if(n!==-1)return arr.splice(n,1)[0];
 }
 throw Error('Fixture missing '+id+' for '+p);
}
function arrange({layers=1}={}){
 assert.deepEqual(validateUniversalDeck(packs[0],deck),[]);
 assert.deepEqual(validateUniversalDeck(packs[1],deck),[]);
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:530,first:0});
 const attacker=take(s,0,'R10');
 attacker.ready=true;s.players[0].front[0]=attacker;
 const defender=take(s,1,'R08'),originalBase=take(s,1,'R00');
 const hidden=[take(s,1,'R04')];
 if(layers>1)hidden.push(take(s,1,'R05'));
 for(const bottom of hidden){bottom.faceDown=true;originalBase.under.push(bottom);}
 defender.stack=[originalBase];defender.ready=true;s.players[1].front[0]=defender;
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-target');
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:defender.uid},{actor:0});
 assert.equal(universalBp(packs,s,s.players[1].front[0]),500);
 assert.equal(s.pending.kind,'effect-retire-bp',
  'follow-up threshold retirement must run before blocking');
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:defender.uid},{actor:0});
 assert.equal(s.pending.kind,'leave-replacement');
 assert.equal(s.pending.player,1);
 assert.ok(s.players[0].hand.length+s.players[0].deck.length>0);
 return {s,defender,originalBase,hidden};
}

test('last facedown protection that removes the +1000 BP must recheck lethal BP before blocking',()=>{
 const {s,defender,originalBase,hidden}=arrange();
 const previouslyQueued=s.effectQueue.map(x=>x.op);
 assert.ok(previouslyQueued.includes('draw'));
 assert.ok(previouslyQueued.includes('openBlock'));
 const snapshot=structuredClone(s);
 const beforeDeck=s.players[0].deck.length;
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseLeaveReplacement',mode:'protect'},
  {type:'chooseLeaveReplacement',mode:'leave'}
 ]);
 const protectedResult=dispatchUniversalAction(packs,s,
  {type:'chooseLeaveReplacement',mode:'protect'},{actor:1});
 assert.equal(protectedResult.players[1].front[0],null,
  'after last facedown is consumed, printed BP 2000 - 2500 = -500: immediately retire');
 assert.ok(protectedResult.players[1].outside.some(x=>x.uid===defender.uid));
 assert.ok(protectedResult.players[1].outside.some(x=>x.uid===originalBase.uid));
 assert.ok(protectedResult.players[1].outside.some(x=>x.uid===hidden[0].uid));
 assert.equal(protectedResult.players[0].deck.length,beforeDeck-1,
  'attack onAttack draw runs only after leave replacement resolves');
 assert.equal(protectedResult.pending.kind,'block');
 assert.equal(protectedResult.pending.player,1);
 assert.deepEqual(legalUniversalActions(packs,protectedResult),[{type:'chooseBlock',uid:null}],
  'retired character cannot be offered as a blocker');
 assert.equal(assertUniversalMatch(packs,protectedResult),true);
 assert.deepEqual(s,snapshot,'failed/paused actions never mutate prior snapshots');
 const left=dispatchUniversalAction(packs,s,
  {type:'chooseLeaveReplacement',mode:'leave'},{actor:1});
 assert.equal(left.players[1].front[0],null);
 assert.ok(left.players[1].outside.some(x=>x.uid===defender.uid));
 assert.equal(assertUniversalMatch(packs,left),true);
});

test('multi-layer Raid protection selects exact hidden UID and retains a positive-BP legal blocker',()=>{
 const {s,defender,hidden}=arrange({layers:2});
 const view=universalPublicView(packs,s,0);
 const displayed=JSON.stringify(view.players[1]);
 for(const c of hidden){
  assert.ok(!displayed.includes(c.uid));
  assert.ok(!displayed.includes(c.cardId));
 }
 const actions=legalUniversalActions(packs,s);
 assert.equal(actions.filter(x=>x.mode==='protect').length,2);
 assert.deepEqual(new Set(actions.filter(x=>x.mode==='protect').map(x=>x.uid)),
  new Set(hidden.map(x=>x.uid)));
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseLeaveReplacement',mode:'protect',uid:'0-999'},{actor:1}),/not currently legal/);
 const selected=actions.find(a=>a.uid===hidden[0].uid);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 const preserved=dispatchUniversalAction(packs,s,selected,{actor:1});
 assert.equal(preserved.players[1].front[0].uid,defender.uid);
 assert.equal(universalBp(packs,preserved,preserved.players[1].front[0]),500,
  'other hidden layer keeps conditional BP +1000 online');
 assert.ok(preserved.players[1].outside.some(x=>x.uid===hidden[0].uid));
 assert.ok(!preserved.players[1].outside.some(x=>x.uid===hidden[1].uid));
 assert.equal(preserved.pending.kind,'block');
 assert.ok(legalUniversalActions(packs,preserved).some(a=>
  a.type==='chooseBlock'&&a.uid===defender.uid));
 assert.equal(assertUniversalMatch(packs,preserved),true);
});
