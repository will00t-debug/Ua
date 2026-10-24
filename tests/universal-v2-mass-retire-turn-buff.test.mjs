import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// Synthetic test fixtures: NONE of these cards represents completed
// official BLEACH/TTG rulings.
const ids=Array.from({length:13},(_,i)=>'S'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));
counts.S12=2;
function pack(id,defender=false){
 const cards=ids.map((cardId,i)=>({
  id:cardId,name:'Unit '+i,type:'character',color:'green',
  energy:i===0?0:2,ap:1,bp:i===11?4000:2000,
  gen:i===0?4:1,implementation:'vanilla',
  traits:[1,9].includes(i)?['Ally']:[]
 }));
 if(!defender){
  cards[6]={...cards[6],implementation:'dsl',templateEffects:{onPlay:[
   {template:'enemyFrontAllBpDown',bp:2500},{template:'draw',count:1}
  ]}};
  cards[7]={...cards[7],implementation:'dsl',templateEffects:{onPlay:[
   {template:'retireEnemyFrontAllUnderBp',bp:3500},{template:'draw',count:1}
  ]}};
  cards[10]={...cards[10],implementation:'dsl',templateEffects:{onPlay:[
   {template:'buffOwnTraitAllTurn',trait:'Ally',bp:1000}
  ]}};
  cards[12]={...cards[12],implementation:'dsl',templateEffects:{onPlay:[
   {template:'payDiscardThen',optional:true,then:[
    {template:'retireEnemyFrontAllUnderBp',bp:3500},{template:'draw',count:1}
   ]},
   {template:'draw',count:1}
  ]}};
 }else{
  cards[8]={...cards[8],raidName:'Unit 0',implementation:'dsl',effects:{onPlay:[]},
   conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:500}};
 }
 return createUniversalPack({id,version:'batch-retire-1',cards});
}
const packs=[pack('batch-effects'),pack('layered-raid',true)];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],index=list.findIndex(c=>c.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Fixture card unavailable '+id);
}
function prepare(sourceId){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:814,first:0});
 const owner=s.players[0],generator=take(s,0,'S00'),source=take(s,0,sourceId);
 owner.energy[0]=generator;owner.hand.push(source);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);
 return {s,source,action};
}
function raid(s,slot,layers){
 const pl=s.players[1],top=take(s,1,'S08'),base=take(s,1,'S00');
 for(let i=0;i<layers;i++){
  const hidden=take(s,1,i?'S05':'S04');
  hidden.faceDown=true;base.under.push(hidden);
 }
 top.stack=[base];top.ready=true;pl.front[slot]=top;
 return top;
}
const play=f=>dispatchUniversalAction(packs,f.s,f.action,{actor:0});

test('mass BP reduction applies to every opponent first, retires all lethal fronts, preserves surviving Raid and draws only once',()=>{
 const f=prepare('S06');
 const defender=f.s.players[1];
 const normalA=take(f.s,1,'S02'),normalB=take(f.s,1,'S03');
 defender.front[0]=normalA;defender.front[1]=normalB;
 const protectedTop=raid(f.s,2,1);
 const strong=take(f.s,1,'S11');defender.front[3]=strong;
 const beforeDeck=f.s.players[0].deck.length,snapshot=structuredClone(f.s);
 const result=play(f);
 assert.equal(result.pending,null);
 assert.equal(result.players[1].front[0],null);
 assert.equal(result.players[1].front[1],null);
 assert.ok(result.players[1].outside.some(c=>c.uid===normalA.uid));
 assert.ok(result.players[1].outside.some(c=>c.uid===normalB.uid));
 assert.equal(result.players[1].front[2]?.uid,protectedTop.uid);
 assert.equal(universalBp(packs,result,result.players[1].front[2]),500);
 assert.equal(result.players[1].front[3]?.uid,strong.uid);
 assert.equal(universalBp(packs,result,result.players[1].front[3]),1500);
 assert.equal(result.players[0].deck.length,beforeDeck-1);
 assert.equal(assertUniversalMatch(packs,result),true);
 assert.deepEqual(f.s,snapshot);
});

test('simultaneous threshold retirement freezes three victims, lets two Raid owners choose replacements in slot order, then draws',()=>{
 const f=prepare('S07');
 const originalRaidA=raid(f.s,0,2);
 const originalRaidB=raid(f.s,1,1);
 const normal=take(f.s,1,'S03');f.s.players[1].front[2]=normal;
 const survivor=take(f.s,1,'S11');f.s.players[1].front[3]=survivor;
 const handBefore=f.s.players[0].hand.length,deckBefore=f.s.players[0].deck.length;
 const original=structuredClone(f.s);
 let s=play(f);
 assert.equal(s.pending.kind,'leave-replacement');
 assert.equal(s.pending.uid,originalRaidA.uid);
 assert.equal(s.pending.player,1);
 assert.equal(s.players[1].front[1]?.uid,originalRaidB.uid);
 assert.equal(s.players[1].front[2]?.uid,normal.uid);
 assert.equal(s.players[0].deck.length,deckBefore,'draw must wait for the full retirement batch');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'protect');
 assert.ok(!JSON.stringify(universalPublicView(packs,s,0)).includes(
  s.players[1].front[0].stack[0].under[0].uid));
 const choice=legalUniversalActions(packs,s).find(a=>a.mode==='protect');
 assert.ok(choice);
 s=dispatchUniversalAction(packs,s,choice,{actor:1});
 assert.equal(s.pending.kind,'leave-replacement');
 assert.equal(s.pending.uid,originalRaidB.uid,'next replacement must be on the second snapshotted Raid');
 assert.equal(s.players[1].front[0]?.uid,originalRaidA.uid);
 assert.equal(s.players[0].deck.length,deckBefore);
 s=dispatchUniversalAction(packs,s,{type:'chooseLeaveReplacement',mode:'leave'},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0]?.uid,originalRaidA.uid);
 assert.equal(s.players[1].front[1],null);
 assert.equal(s.players[1].front[2],null);
 assert.equal(s.players[1].front[3]?.uid,survivor.uid,
  'BP 4000 was never an eligible original victim');
 assert.ok(s.players[1].outside.some(c=>c.uid===originalRaidB.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===normal.uid));
 assert.equal(s.players[0].deck.length,deckBefore-1,
  'unrelated queued draw executes only after all replacement decisions');
 assert.equal(s.players[0].hand.length,handBefore-1+1);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.deepEqual(f.s,original,'match reducer must not mutate old snapshot');
});

test('temporary all-trait buff affects only current own-field matching units and expires on opponent turn',()=>{
 const f=prepare('S10');
 const allyFront=take(f.s,0,'S01'),neutral=take(f.s,0,'S02');
 const allyEnergy=take(f.s,0,'S09');
 f.s.players[0].front[1]=allyFront;f.s.players[0].front[2]=neutral;
 f.s.players[0].energy[1]=allyEnergy;
 const result=play(f);
 assert.equal(universalBp(packs,result,result.players[0].front[1]),3000);
 assert.equal(universalBp(packs,result,result.players[0].front[2]),2000);
 assert.equal(universalBp(packs,result,result.players[0].energy[1]),3000);
 assert.equal(result.players[0].front[0]?.uid,f.source.uid);
 const later=take(result,0,'S01');
 result.players[0].front[3]=later;
 assert.equal(universalBp(packs,result,later),2000,'not a continuous aura for future entrants');
 assert.equal(assertUniversalMatch(packs,result),true);
 let s=dispatchUniversalAction(packs,result,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(universalBp(packs,s,s.players[0].front[1]),2000);
 assert.equal(universalBp(packs,s,s.players[0].energy[1]),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('nonlethal mass threshold skips without pending and still resolves downstream operations',()=>{
 const f=prepare('S07');
 const strong=take(f.s,1,'S11');f.s.players[1].front[0]=strong;
 const deckBefore=f.s.players[0].deck.length;
 const after=play(f);
 assert.equal(after.pending,null);
 assert.equal(after.players[1].front[0]?.uid,strong.uid);
 assert.equal(after.players[0].deck.length,deckBefore-1);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('mass effect authoring is bounded and rejects invalid parameters or hidden extra fields',()=>{
 const basic={id:'BAD',name:'Bad',type:'character',energy:1,ap:1,bp:2000,
  gen:1,color:'green',implementation:'dsl'};
 const invalid=[
  {template:'enemyFrontAllBpDown',bp:0},
  {template:'enemyFrontAllBpDown',bp:5001},
  {template:'enemyFrontAllBpDown',bp:2500,extra:'cheat'},
  {template:'retireEnemyFrontAllUnderBp',bp:0},
  {template:'retireEnemyFrontAllUnderBp',bp:50001},
  {template:'buffOwnTraitAllTurn',trait:'',bp:1000},
  {template:'buffOwnTraitAllTurn',trait:'Ally',bp:-1}
 ];
 for(const effect of invalid){
  assert.throws(()=>createUniversalPack({id:'invalid-mass',cards:[
   {...basic,templateEffects:{onPlay:[effect]}}
  ]}),/invalid|incompatible/,JSON.stringify(effect));
 }
 assert.throws(()=>createUniversalPack({id:'invalid-raid-base',cards:[
  {...basic,templateEffects:{onRaided:[{template:'enemyFrontAllBpDown',bp:1000}]}}
 ]}),/unsupported Raid-base timing effect/);
});

test('paid retire-all gate does not execute on declined payment; on payment it pauses for Raid replacement before both draws',()=>{
 const f=prepare('S12'),protectedTop=raid(f.s,0,2);
 const target=take(f.s,1,'S03');f.s.players[1].front[1]=target;
 const beforeDeck=f.s.players[0].deck.length,match=structuredClone(f.s);
 const q=play(f);
 assert.equal(q.pending.kind,'effect-discard-gate');
 assert.equal(q.pending.player,0);
 const skipped=dispatchUniversalAction(packs,q,
  {type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0]?.uid,protectedTop.uid);
 assert.equal(skipped.players[1].front[1]?.uid,target.uid);
 assert.equal(skipped.players[0].deck.length,beforeDeck-1,
  'unconditional draw still runs, paid retirement and paid draw never run');
 assert.equal(assertUniversalMatch(packs,skipped),true);
 const paidAction=legalUniversalActions(packs,q).find(a=>a.uid!==null);
 assert.ok(paidAction);
 let s=dispatchUniversalAction(packs,q,paidAction,{actor:0});
 assert.equal(s.pending.kind,'leave-replacement');
 assert.equal(s.pending.player,1);
 assert.equal(s.players[0].deck.length,beforeDeck,
  'both paid and unconditional draws await the protected leave decision');
 const protection=legalUniversalActions(packs,s).find(a=>a.mode==='protect');
 s=dispatchUniversalAction(packs,s,protection,{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0]?.uid,protectedTop.uid);
 assert.equal(s.players[1].front[1],null);
 assert.equal(s.players[0].deck.length,beforeDeck-2);
 assert.ok(s.players[0].outside.some(c=>c.uid===paidAction.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.deepEqual(f.s,match);
});
