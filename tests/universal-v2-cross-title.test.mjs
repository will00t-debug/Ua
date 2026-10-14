import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {UNIVERSAL_AI_LEVELS,chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalActor,
 universalBp,universalEnergy,assertUniversalMatch,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// Both fictional packs reuse the exact local card IDs; this proves lookups
// are scoped to a physical player's title rather than a global card-ID map.
function makeCards(title){
 const fighter=title==='bleach-v2-fixture'?'Ichigo':'Simon';
 return Array.from({length:13},(_,i)=>({
  id:'X'+String(i).padStart(2,'0'),
  name:i===0?fighter:i===1?fighter+' Raid':title+' card '+i,
  type:'character',color:'green',energy:i===0?0:i===1?3:2,
  ap:1,bp:i===0?1500:title==='bleach-v2-fixture'?2500:3900,
  gen:i===0?4:1,implementation:'vanilla'
 }));
}
const a=makeCards('bleach-v2-fixture');
a[1]={...a[1],raidName:'Ichigo',implementation:'dsl',effects:{onRaid:[{op:'draw',count:1}]}};
a[2]={...a[2],implementation:'dsl',effects:{onPlay:[
 {op:'enemyBpDown',bp:1000},{op:'draw',count:1}
]}};
a[4]={...a[4],trigger:'get'};
a[6]={...a[6],trigger:'final'};
const b=makeCards('gurren-v2-fixture');
b[1]={...b[1],raidName:'Simon',implementation:'dsl',effects:{onRaid:[{op:'draw',count:1}]}};
b[2]={...b[2],implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
b[4]={...b[4],trigger:'draw'};
b[5]={...b[5],trigger:'get'};
b[6]={...b[6],trigger:'final'};
const alpha=createUniversalPack({id:'bleach-v2-fixture',cards:a,version:'1.0.0'});
const beta=createUniversalPack({id:'gurren-v2-fixture',cards:b,version:'2.1.0'});
const packs=[alpha,beta];
const counts=Object.fromEntries(Array.from({length:12},(_,i)=>['X'+String(i).padStart(2,'0'),4]));
counts.X12=2;
const fresh=(seed=37,first=0)=>newUniversalMatch(packs,{decks:[counts,counts],seed,first});
const take=(s,p,id)=>{
 const pl=s.players[p];
 for(const zone of ['hand','deck','life','outside']){
  const idx=pl[zone].findIndex(c=>c.cardId===id);
  if(idx>=0)return pl[zone].splice(idx,1)[0];
 }
 throw Error('fixture card missing '+p+'/'+id);
};
const toHand=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
const steps=(s,...types)=>{
 for(const type of types){
  const action=legalUniversalActions(packs,s).find(a=>a.type===type);
  assert.ok(action,'Missing '+type+' in '+s.phase);
  s=dispatchUniversalAction(packs,s,action);
 }
 return s;
};
function forcedLife(s,p,id,last=false){
 const life=s.players[p].life,card=take(s,p,id);
 s.players[p].deck.push(life.shift());life.unshift(card);
 if(last)s.players[p].outside.push(...life.splice(1));
}
function prepareAttack(first=0,lifeId='X05',last=false){
 let s=fresh(124,first),attacker=take(s,first,'X03');
 s.players[first].front[0]=attacker;attacker.ready=true;
 forcedLife(s,1-first,lifeId,last);
 s=steps(s,'next','next','next');
 assert.equal(s.phase,'attack');
 return {s,attacker};
}
const hit=(s,uid)=>{
 s=dispatchUniversalAction(packs,s,{type:'attack',uid},{actor:s.active});
 assert.equal(s.pending.kind,'block');
 const defender=s.pending.player;
 return dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:defender});
};

test('different title packs and identical local IDs are a valid match, without merging deck inventories',()=>{
 assert.deepEqual(validateUniversalDeck(alpha,counts),[]);
 assert.deepEqual(validateUniversalDeck(beta,counts),[]);
 const s=fresh();
 assert.equal(s.title,'cross-title');
 assert.deepEqual(s.packIds,['bleach-v2-fixture','gurren-v2-fixture']);
 assert.deepEqual(s.packVersions,['1.0.0','2.1.0']);
 assert.equal(s.players[0].hand.length,7);
 assert.equal(s.players[1].hand.length,7);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(universalBp(packs,s,s.players[0].hand.find(c=>c.cardId==='X00')||
  s.players[0].deck.find(c=>c.cardId==='X00')),1500);
 assert.equal(universalBp(packs,s,s.players[1].hand.find(c=>c.cardId==='X02')||
  s.players[1].deck.find(c=>c.cardId==='X02')),3900);
 assert.deepEqual(s,fresh(),'mixed packs still produce deterministic fixture state');
 assert.throws(()=>newUniversalMatch([alpha],{decks:[counts,counts]}),/pair/);
 assert.throws(()=>assertUniversalMatch([beta,alpha],s),/Incorrect pack/);
 assert.throws(()=>assertUniversalMatch(alpha,s),/Incorrect pack/);
 assert.throws(()=>newUniversalMatch(packs,{decks:[counts,{...counts,X00:5}]}),/Player 1/);
});

test('physical card ownership cannot be spoofed across title packs, even when IDs collide',()=>{
 const s=fresh();
 const item=s.players[0].deck[0],original=structuredClone(s);
 const hacked=structuredClone(s);hacked.players[1].hand.push(hacked.players[0].deck.shift());
 assert.throws(()=>assertUniversalMatch(packs,hacked),/duplicated UID|wrong title|conservation/);
 assert.deepEqual(s,original);
 const malicious=structuredClone(s);malicious.players[1].hand[0].cardId='NOT_IN_BETA';
 assert.throws(()=>assertUniversalMatch(packs,malicious),/wrong title/);
});

test('cross-title attacks and blocking operate on opposing title card BP and never reveal hidden zones',()=>{
 const {s,attacker}=prepareAttack(0,'X05');
 const blocker=take(s,1,'X03');s.players[1].front[0]=blocker;blocker.ready=true;
 const attack=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(universalActor(attack),1);
 const actions=legalUniversalActions(packs,attack);
 assert.ok(actions.some(a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 const blocked=dispatchUniversalAction(packs,attack,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(blocked.players[1].life.length,7,'opponent blocks successfully');
 assert.equal(blocked.players[1].front[0].uid,blocker.uid,'higher BP opponent survives');
 assert.equal(assertUniversalMatch(packs,blocked),true);
 const open=dispatchUniversalAction(packs,attack,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(open.players[1].life.length,6);
 assert.equal(open.pending?.kind,'life-trigger');
 assert.equal(open.pending.trigger,'get','trigger derived from beta owner X05');
 const view=universalPublicView(packs,open,0);
 assert.deepEqual(view.playerTitles,s.packIds);
 assert.equal(view.players[1].title,'gurren-v2-fixture');
 assert.equal(view.players[1].hand,null);
 assert.ok(!JSON.stringify(view).includes(open.players[1].hand[0].uid));
 assert.ok(!JSON.stringify(view).includes(open.players[1].life[0].uid));
 assert.equal(view.publicReveals.at(-1).title,'gurren-v2-fixture');
});

test('opposite direction selects defender-local FINAL and can activate or decline',()=>{
 const {s,attacker}=prepareAttack(1,'X06',true);
 const last=hit(s,attacker.uid);
 assert.equal(last.pending.kind,'life-trigger');
 assert.equal(last.pending.trigger,'final');
 assert.equal(last.pending.player,0);
 assert.equal(last.players[0].life.length,0);
 assert.equal(last.publicReveals.at(-1).title,'bleach-v2-fixture');
 const restored=dispatchUniversalAction(packs,last,{type:'chooseTrigger',mode:'final'},{actor:0});
 assert.equal(restored.status,'playing');assert.equal(restored.players[0].life.length,1);
 const skip=dispatchUniversalAction(packs,last,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skip.status,'finished');assert.equal(skip.winner,1);
 assert.equal(assertUniversalMatch(packs,restored),true);
 assert.equal(assertUniversalMatch(packs,skip),true);
});

test('self Raid bases cannot come from opposing titles; Raid-specific abilities use owner pack',()=>{
 let s=fresh(),own=take(s,0,'X00'),foe=take(s,1,'X00'),source=take(s,0,'X00');
 s.players[0].front[0]=own;s.players[1].front[0]=foe;
 s.players[0].energy[0]=source;
 const raid=toHand(s,0,'X01');
 assert.equal(universalEnergy(packs,s,0),4);
 s=steps(s,'next','next');
 const options=legalUniversalActions(packs,s);
 const real=options.find(x=>x.type==='raid'&&x.uid===raid.uid&&x.baseUid===own.uid);
 assert.ok(real,'own base Raid is legal');
 assert.ok(!options.some(x=>x.type==='raid'&&x.baseUid===foe.uid),'cannot Raid using enemy card');
 assert.throws(()=>dispatchUniversalAction(packs,s,{...real,baseUid:foe.uid}),/not currently legal/);
 const before=s.players[0].deck.length;
 const raided=dispatchUniversalAction(packs,s,real);
 assert.equal(raided.players[0].deck.length,before-1,'owner Raid-specific draw');
 assert.equal(raided.players[0].front[real.slot].stack[0].uid,own.uid);
 assert.equal(assertUniversalMatch(packs,raided),true);
});

test('opposing card targeting from DSL is real, controller chooses the other title character',()=>{
 let s=fresh(),producer=take(s,0,'X00'),enemy1=take(s,1,'X03'),enemy2=take(s,1,'X02');
 s.players[0].energy[0]=producer;
 s.players[1].front[0]=enemy1;s.players[1].front[1]=enemy2;
 const spell=toHand(s,0,'X02');
 s=steps(s,'next','next');
 const entry=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===spell.uid&&a.line==='front'&&a.slot===0);
 assert.ok(entry);
 const prior=s.players[0].deck.length;
 const after=dispatchUniversalAction(packs,s,entry,{actor:0});
 assert.equal(after.pending?.kind,'effect-target');
 assert.equal(after.pending?.player,0);
 assert.deepEqual(legalUniversalActions(packs,after).map(a=>a.uid),[enemy1.uid,enemy2.uid]);
 assert.equal(after.players[0].deck.length,prior,'draw later in printed queue');
 assert.throws(()=>dispatchUniversalAction(packs,after,{type:'chooseTarget',uid:spell.uid},{actor:0}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,after,{type:'chooseTarget',uid:enemy1.uid},{actor:1}),/Wrong player/);
 const resolved=dispatchUniversalAction(packs,after,{type:'chooseTarget',uid:enemy2.uid},{actor:0});
 assert.equal(resolved.pending,null);
 assert.equal(universalBp(packs,resolved,resolved.players[1].front[1]),2900);
 assert.equal(universalBp(packs,resolved,resolved.players[1].front[0]),3900);
 assert.equal(resolved.players[0].deck.length,prior-1,'queued draw follows target decision');
 assert.equal(assertUniversalMatch(packs,resolved),true);
 assert.equal(after.players[1].front[1].buffs.length,0,'transition pure');
});

test('opponent effect without eligible targets fizzles safely, then finishes following queue',()=>{
 let s=fresh(),energy=take(s,0,'X00'),effect=toHand(s,0,'X02');
 s.players[0].energy[0]=energy;
 s=steps(s,'next','next');
 const prev=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===effect.uid&&a.line==='front'&&a.slot===0);
 const after=dispatchUniversalAction(packs,s,action);
 assert.equal(after.pending,null);
 assert.equal(after.players[0].deck.length,prev-1);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('cross-title public snapshots never leak opponent life, hidden card text, or card identity',()=>{
 const s=fresh(),viewA=universalPublicView(packs,s,0),viewB=universalPublicView(packs,s,1);
 assert.equal(viewA.players[1].hand,null);
 assert.equal(viewB.players[0].hand,null);
 assert.equal(viewA.players[0].hand.length,7);
 assert.equal(viewB.players[1].hand.length,7);
 assert.equal(viewA.playerTitles[0],alpha.id);
 assert.equal(viewA.playerTitles[1],beta.id);
 for(const id of [s.players[1].hand[0].uid,s.players[1].deck[0].uid,s.players[1].life[0].uid])
  assert.ok(!JSON.stringify(viewA).includes(id),'hidden physical card '+id);
});

test('seeded cross-title complete-turn simulations preserve 50 physical cards on both sides',()=>{
 let visitedTurns=0,publicReveals=0;
 for(let seed=1;seed<=14;seed++){
  let s=fresh(seed,seed%2),lastTurn=0;
  for(let step=0;step<150&&s.status==='playing';step++){
   const available=legalUniversalActions(packs,s);
   assert.ok(available.length,'legal action required on every live cross-title state');
   const pl=s.players[s.active],energy=universalEnergy(packs,s,s.active);
   const chooseType=(type)=>available.find(a=>a.type===type);
   let a;
   if(s.pending){
    if(s.pending.kind==='block')a=available.find(x=>x.uid===null);
    else if(s.pending.kind==='life-trigger')a=available.find(x=>x.mode==='final'||x.mode==='draw'||x.mode==='get')||available[0];
    else a=available[0];
   }else if(s.phase==='main'){
    const energyPlay=available.find(x=>x.type==='play'&&x.line==='energy');
    const frontPlay=available.find(x=>x.type==='play'&&x.line==='front');
    a=(energy<3?energyPlay:frontPlay||energyPlay)||
      chooseType('raid')||chooseType('event')||chooseType('next');
   }else if(s.phase==='attack')a=chooseType('attack')||chooseType('next');
   else a=chooseType('next');
   assert.ok(a,'AI must always select native legal action');
   const original=s,snapshot=structuredClone(s);
   const previousActor=universalActor(s);
   s=dispatchUniversalAction(packs,s,a,{actor:previousActor});
   assert.equal(assertUniversalMatch(packs,s),true);
   assert.deepEqual(original,snapshot,'reducer must not mutate its input');
   assert.deepEqual(s.packIds,[alpha.id,beta.id]);
   assert.equal(s.players[0].apCards.length,3);
   assert.equal(s.players[1].apCards.length,3);
   assert.ok(s.turn>=lastTurn);
   lastTurn=s.turn;
  }
  assert.ok(s.turn>=3,'simulated both titles through multiple shared turns');
  visitedTurns+=s.turn;
  publicReveals+=s.publicReveals.length;
 }
 assert.ok(visitedTurns>35);
 assert.ok(publicReveals>0,'combat should reveal life cards');
});

test('cross-title shared AI chooses native legal actions at all difficulty levels without mutating state',()=>{
 assert.deepEqual(UNIVERSAL_AI_LEVELS,['easy','normal','hard']);
 let total=0,controllers=new Set(),attacks=0;
 for(const difficulty of UNIVERSAL_AI_LEVELS)for(let seed=1;seed<=10;seed++){
  let s=fresh(seed*9,seed%2);
  for(let i=0;i<120&&s.status==='playing';i++){
   const actor=universalActor(s);
   controllers.add(actor);
   const previous=structuredClone(s),choices=legalUniversalActions(packs,s);
   const action=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(action,'AI may not stall in a playable state');
   assert.ok(choices.some(x=>JSON.stringify(x)===JSON.stringify(action)),
    'AI cannot manufacture an illegal action');
   if(action.type==='attack')attacks++;
   const next=dispatchUniversalAction(packs,s,action,{actor});
   assert.equal(assertUniversalMatch(packs,next),true);
   assert.deepEqual(s,previous,'AI/dispatch preserve original state');
   s=next;total++;
  }
  assert.ok(s.turn>=2,'AI must advance through shared turn phases');
 }
 assert.deepEqual([...controllers].sort(),[0,1]);
 assert.ok(total>1000,'run substantial seeded simulation on two owner-scoped title packs');
 assert.ok(attacks>0,'opposing title AI cards actually attack each other');
 assert.throws(()=>chooseUniversalAiAction(packs,fresh(),{difficulty:'ultra'}),/Unknown universal AI difficulty/);
});

test('hard universal AI prioritizes an owner-local energy producer over premature front deployment',()=>{
 for(const first of [0,1]){
  let s=fresh(891+first,first);
  const energyCard=toHand(s,first,'X00');
  s=steps(s,'next','next');
  const hard=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
  assert.equal(hard.type,'play');
  assert.equal(hard.line,'energy');
  assert.equal(hard.uid,energyCard.uid);
  assert.equal(universalEnergy(packs,s,first),0);
  const next=dispatchUniversalAction(packs,s,hard,{actor:first});
  assert.equal(universalEnergy(packs,next,first),4);
  assert.equal(assertUniversalMatch(packs,next),true);
 }
});
