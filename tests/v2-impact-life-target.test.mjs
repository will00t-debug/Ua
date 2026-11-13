import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalActor} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {makeUniversalPreviewReplay,replayUniversalPreview}
 from '../dist/universal-v2/preview-replay.mjs';

// Fixed cards and seed. IMPACT 1 is one life check after a won block.
// It must not add a second life check to an unblocked attack.
const cards=Array.from({length:13},(_,i)=>({
 id:'IMP-'+i,name:'IMP '+i,color:'red',type:'character',energy:0,ap:1,
 bp:i===8?5000:i===1||i===2?2500:i<=5?4000:1000,gen:1,
 implementation:[0,2,3,4].includes(i)?'dsl':'vanilla',
 ...([0,2,3,4].includes(i)?{effects:{}}:{}),
 ...(i===0?{printedImpact:1}:{}),
 ...(i===2?{impactNull:true}:{}),
 ...(i===3?{printedAttackDamage:2}:{}),
 ...(i===4?{passiveBonuses:[{
  condition:{kind:'ownHandCountAtLeast',turn:'own',min:1},impact:1}]}:{}),
 ...(i===6?{trigger:'draw'}:{})
}));
const pack=createUniversalPack({id:'impact-life-target',cards});
const packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));

function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function setLife(s,ids){
 const player=s.players[1];
 const picked=ids.map(id=>take(s,1,id));
 player.deck.push(...player.life.splice(0));
 player.life.push(...picked);
 return picked;
}
function open(seed,attackerId,blockerId,{targeting=true,lifeIds=null,grant=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0,attackerChoosesLife:targeting});
 const attacker=take(s,0,attackerId);
 attacker.ready=true;
 attacker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=attacker;
 if(grant)attacker.impactGranted={turn:s.turn,stamp:attacker.fieldEntryStamp,amount:1};
 if(!s.players[0].hand.length)s.players[0].hand.push(s.players[0].deck.pop());
 const blocker=take(s,1,blockerId);
 blocker.ready=true;
 blocker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=blocker;
 const life=lifeIds?setLife(s,lifeIds):[...s.players[1].life];
 s.phase='attack';
 assertUniversalMatch(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(s.pending.kind,'block');
 return {s,attacker,blocker,life};
}
function hidden(s,life){
 const text=JSON.stringify(universalPublicView(packs,s,0))+
  JSON.stringify(universalPublicView(packs,s,1));
 for(const card of life)assert.equal(text.includes(card.uid),false,card.uid);
}

test('impact 1 after beating a blocker waits for the attacker to choose one life card',()=>{
 let {s,life}=open(4001,'IMP-0','IMP-1',{lifeIds:['IMP-7','IMP-9','IMP-6']});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:s.players[1].front[0].uid},{actor:1});
 assert.equal(s.pending.kind,'attack-life-target');
 assert.equal(s.pending.player,0);
 assert.equal(s.pending.defender,1);
 assert.equal(s.pending.count,1);
 assert.equal(universalActor(s),0);
 assert.equal(s.players[1].life.length,3,'life is unchanged before the choice');
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 const waiting=s.effectQueue.map(e=>e.op);
 hidden(s,life);
 const view=universalPublicView(packs,s,0);
 assert.deepEqual(view.pending,{kind:'attack-life-target',player:0,defender:1,count:1});
 assert.equal(view.players[1].life,undefined);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[2]},{actor:1}),
  /Wrong player turn/);
 assert.equal(s.players[1].life.length,3);
 const third=life[2];
 s=dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[2]},{actor:0});
 assert.equal(s.players[1].life.length,2);
 assert.deepEqual(s.players[1].life.map(c=>c.uid),[life[0].uid,life[1].uid]);
 assert.equal(s.publicReveals.at(-1).uid,third.uid);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.player,1);
 assert.equal(s.pending.uid,third.uid);
 assert.equal(s.pending.trigger,'draw');
 assert.deepEqual(s.effectQueue.map(e=>e.op),waiting,'later jobs wait for the life trigger');
 const hand=s.players[1].hand.length,deckCount=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.players[1].deck.length,deckCount-1);
 assert.ok(s.players[1].outside.some(c=>c.uid===third.uid));
 assert.notEqual(s.pending?.kind,'attack-life-target');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('impact null and a lost battle do not open a life choice or remove life',()=>{
 let blocked=open(4002,'IMP-0','IMP-2',{lifeIds:['IMP-7','IMP-9','IMP-10']});
 const before=blocked.s.players[1].life.length;
 blocked.s=dispatchUniversalAction(packs,blocked.s,{type:'chooseBlock',uid:blocked.blocker.uid},{actor:1});
 assert.notEqual(blocked.s.pending?.kind,'attack-life-target');
 assert.equal(blocked.s.players[1].life.length,before);
 assert.equal(blocked.s.publicReveals.length,0);
 assert.ok(blocked.s.players[1].outside.some(c=>c.uid===blocked.blocker.uid));
 let lost=open(4003,'IMP-0','IMP-8',{lifeIds:['IMP-7','IMP-9','IMP-10']});
 const stayed=lost.s.players[1].life.length;
 lost.s=dispatchUniversalAction(packs,lost.s,{type:'chooseBlock',uid:lost.blocker.uid},{actor:1});
 assert.notEqual(lost.s.pending?.kind,'attack-life-target');
 assert.equal(lost.s.players[1].life.length,stayed);
 assert.equal(lost.s.publicReveals.length,0);
 assert.equal(assertUniversalMatch(packs,lost.s),true);
});

test('an unblocked impact character deals one life check, not two',()=>{
 let {s,life}=open(4004,'IMP-0','IMP-1',{lifeIds:['IMP-7','IMP-9','IMP-10']});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'attack-life-target');
 assert.equal(s.pending.count,1);
 assert.equal(s.players[1].life.length,life.length);
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[0]},{actor:0});
 assert.equal(s.players[1].life.length,life.length-1);
 assert.equal(s.publicReveals.at(-1).uid,life[0].uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('damage 2 still requires two distinct life cards before either is removed',()=>{
 let {s,life}=open(4005,'IMP-3','IMP-1',{lifeIds:['IMP-7','IMP-9','IMP-10']});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'attack-life-target');
 assert.equal(s.pending.count,2);
 assert.equal(s.players[1].life.length,3);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[1,1]},{actor:0}));
 assert.equal(s.players[1].life.length,3);
 s=dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[0,2]},{actor:0});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].life[0].uid,life[1].uid);
 assert.deepEqual(s.publicReveals.map(r=>r.uid),[life[0].uid,life[2].uid]);
 assert.equal(s.pending.kind,'life-batch-order');
 assert.equal(s.pending.player,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('granted impact and conditional impact use the same attacker life choice',()=>{
 for(const [seed,id,grant] of [[4006,'IMP-5',true],[4007,'IMP-4',false]]){
  let {s,life}=open(seed,id,'IMP-1',{lifeIds:['IMP-7','IMP-9','IMP-10'],grant});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:s.players[1].front[0].uid},{actor:1});
  assert.equal(s.pending.kind,'attack-life-target',id);
  assert.equal(s.pending.count,1);
  assert.equal(s.players[1].life.length,life.length);
  s=dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[1]},{actor:0});
  assert.equal(s.publicReveals.at(-1).uid,life[1].uid);
  assert.equal(s.players[1].life.length,life.length-1);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});

test('legacy matches still remove the top life without a choice',()=>{
 let {s,life}=open(4008,'IMP-0','IMP-1',{targeting:false,lifeIds:['IMP-6','IMP-9','IMP-7']});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:s.players[1].front[0].uid},{actor:1});
 assert.notEqual(s.pending?.kind,'attack-life-target');
 assert.equal(s.players[1].life.length,2);
 assert.equal(s.publicReveals.at(-1).uid,life[0].uid);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.uid,life[0].uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('the AI resolves impact through a legal life action and does not stall',()=>{
 let {s,life}=open(4009,'IMP-0','IMP-1',{lifeIds:['IMP-7','IMP-9','IMP-10']});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:s.players[1].front[0].uid},{actor:1});
 assert.equal(s.pending.player,0);
 const legal=legalUniversalActions(packs,s);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.type,'chooseAttackLife');
 assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 s=dispatchUniversalAction(packs,s,ai,{actor:0});
 assert.notEqual(s.pending?.kind,'attack-life-target');
 assert.equal(s.players[1].life.length,life.length-1);
 assert.equal(s.publicReveals.at(-1).uid,life[ai.indices[0]].uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('online seats and replay follow the same attacker-only life action',()=>{
 const server=readFileSync(new URL('../server/domain.mjs',import.meta.url),'utf8');
 const desktop=readFileSync(new URL('../dist/universal-v2/desktop-battle-ui.mjs',import.meta.url),'utf8');
 const picker=readFileSync(new URL('../dist/universal-v2/attack-life-picker.mjs',import.meta.url),'utf8');
 assert.match(server,/universalActor\(live\.match\)!==seat/);
 assert.match(server,/dispatchUniversalAction\(live\.packs,live\.match,action,\{actor:seat\}\)/);
 assert.match(server,/pending\?\.kind==='attack-life-target'/);
 assert.match(desktop,/請選擇要攻擊的生命卡/);
 assert.match(picker,/請選擇要攻擊的生命卡/);
 let {s,life}=open(4010,'IMP-0','IMP-1',{lifeIds:['IMP-7','IMP-9','IMP-10']});
 assert.equal(universalActor(s),1,'the defender still owns the block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:s.players[1].front[0].uid},{actor:1});
 assert.equal(universalActor(s),0,'only the attacker may choose the life card');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseAttackLife',indices:[2]},{actor:1}),
  /Wrong player turn/);
 hidden(s,life);
 const targeted=makeUniversalPreviewReplay(packs,{decks:[deck,deck],seed:4010,first:0,
  attackerChoosesLife:true});
 assert.equal(targeted.attackerChoosesLife,true);
 assert.equal(replayUniversalPreview(packs,targeted).attackerChoosesLife,true);
 const legacy=makeUniversalPreviewReplay(packs,{decks:[deck,deck],seed:4010,first:0});
 assert.equal(legacy.attackerChoosesLife,undefined);
 assert.equal(replayUniversalPreview(packs,legacy).attackerChoosesLife,false);
 assert.equal(s.players[1].life.length,life.length);
});
