import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const cards=Array.from({length:13},(_,i)=>({id:'Q'+i,name:'Q'+i,type:'character',color:'blue',energy:0,ap:1,bp:3000,gen:1,implementation:[0,3,4].includes(i)?'dsl':'vanilla',
 ...(i===0?{printedAttackDamage:2}:{}),
 ...(i===1?{trigger:'color',triggerEffect:{op:'deployHandCharacter',color:'blue',maxEnergy:2,ap:1}}:{}),
 ...(i===2?{trigger:'final'}:{}),
 ...(i===3?{effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1},{op:'draw',count:1}]}}:{}),
 ...(i===4?{trigger:'raid',raidName:'Q5',effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1}]}}:{})}));
const pack=createUniversalPack({id:'r23-q38',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){for(const z of ['deck','hand','life']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function start(raid=false){let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:38});
 const attacker=take(s,0,'Q0');attacker.ready=true;s.players[0].front[0]=attacker;
 const p=s.players[1];p.deck.push(...p.life.splice(0));
 const first=take(s,1,raid?'Q4':'Q1'),final=take(s,1,'Q2'),entrant=take(s,1,'Q3');
 p.hand.push(entrant);p.life.push(first,final);
 if(raid)p.front[0]=take(s,1,'Q5');
 s.phase='attack';s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:first.uid},{actor:1});
 const action=legalUniversalActions(packs,s).find(a=>raid?a.mode==='raid':a.mode==='color'&&a.uid===entrant.uid);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action,{actor:1});
 return {s,first,final,entrant};}
for(const raid of [false,true])for(const effectFirst of [false,true])test(`Q38 ${raid?'RAID':'COLOR'} ${effectFirst?'entry':'FINAL'} first; whole program and pause/resume`,()=>{
 let {s,first,final,entrant}=start(raid);
 assert.equal(s.pending?.kind,'life-batch-order');assert.equal(s.status,'playing');
 let legal=legalUniversalActions(packs,s);assert.equal(legal.length,2);
 assert.ok(legal.some(a=>a.type==='chooseLifeEffect'));assert.ok(legal.some(a=>a.uid===final.uid));
 for(const difficulty of ['normal','hard'])assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseLifeEffect',key:'forged'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,legal[0],{actor:0}),/Wrong player turn/);assert.deepEqual(s,before);
 assert.equal(universalPublicView(packs,s,0).effectQueue,undefined);
 if(!effectFirst){s=dispatchUniversalAction(packs,s,legal.find(a=>a.uid===final.uid));s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'});}
 else s=dispatchUniversalAction(packs,s,legal.find(a=>a.type==='chooseLifeEffect'));
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='chooseLifeOrder'));
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]);
 if(effectFirst){assert.equal(s.pending?.uid,final.uid);s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'});}
 assert.equal(s.status,'playing');assert.equal(s.players[1].life.length,1);assert.equal(s.lifeRevealBatch,null);
 assert.equal(s.effectQueue.length,0);assert.equal(s.pending,null);assert.equal(assertUniversalMatch(packs,s),true);
 const source=raid?first.uid:entrant.uid;
 assert.equal(s.zoneMoveEvents.filter(e=>e.sourceUid===source&&e.from==='deck'&&e.to==='hand').length,raid?1:2);
});

for(const op of ['battleImpactDamage','additionalBattleDamage'])test('unsupported nested '+op+' rejects atomically with remaining LIFE preserved',()=>{
 let {s}=start();
 // Internal saved-continuation fault injection: no registered card is invented.
 const original=structuredClone(s),a=legalUniversalActions(packs,s).find(a=>a.type==='chooseLifeEffect');
 s=dispatchUniversalAction(packs,s,a);
 assert.equal(s.pending.kind,'effect-discard');
 s.effectQueue.unshift({op,owner:1,defender:1,remaining:1});
 const paused=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]),/Nested LIFE reveal unresolved/);
 assert.deepEqual(s,paused);
 assert.deepEqual(s.lifeRevealBatch.remaining,original.lifeRevealBatch.remaining);
 assert.equal(s.status,'playing');
});
test('deferred entry snapshots reject foreign controller, duplicate key and unknown job',()=>{
 const {s}=start();
 for(const mutate of [x=>x.pending.entries.push(structuredClone(x.pending.entries[0])),
  x=>x.pending.entries[0].jobs[0].owner=0,
  x=>x.pending.entries[0].jobs[0].op='unverifiedDamage']){
  const bad=structuredClone(s);mutate(bad);assert.throws(()=>assertUniversalMatch(packs,bad));
 }
});
