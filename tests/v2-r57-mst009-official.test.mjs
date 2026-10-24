import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {mstV2Pack} from '../dist/universal-v2/mst-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const official=mstV2Pack(),m=official.cards['MST-1-009'];
const basic=(id,name=id,bp=2000)=>({id,name,type:'character',color:'blue',
 energy:0,ap:1,bp,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{}});
const provider={id:'provider',name:'provider',type:'event',color:'blue',energy:0,
 ap:1,bp:0,gen:0,traits:[],trigger:null,implementation:'dsl',
 effects:{onPlay:[{op:'deployNamedFromZones',name:'エリス',
 zones:['outside'],line:'front',ready:true,optional:true}]}};
const mstRaw={id:'MST-1-009',name:'エリス',color:'blue',type:'character',
 energy:3,ap:1,bp:3500,gen:1,traits:[],trigger:'raid',implementation:'dsl',
 raidName:'エリス',printedImpact:1,ownTurnBp:500,effects:m.effects};
const cards=[mstRaw,basic('eris-base','エリス'),basic('blocker','阻擋者',2500),provider,
 ...Array.from({length:9},(_,i)=>basic('filler'+i))];
const pack=createUniversalPack({id:'r57-mst009-physical',cards}),both=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const step=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing owned physical '+id);
}
function scene(){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:57009});
 const target=take(s,0,'MST-1-009');s.players[0].outside.push(target);
 const event=take(s,0,'provider');s.players[0].hand.push(event);
 const other=take(s,0,'eris-base');other.ready=true;
 other.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=other;
 const defender=take(s,1,'blocker');defender.ready=true;
 defender.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=defender;
 s=step(s,{type:'next'});s=step(s,{type:'next'});
 const play=legalUniversalActions(both,s).find(x=>x.type==='event'&&x.uid===event.uid);
 assert.ok(play,'paid event itself must be legal');
 s=step(s,play);
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 const entry=legalUniversalActions(both,s).find(a=>
  a.type==='chooseNamedZoneDeploy'&&a.uid===target.uid&&a.zone==='outside'&&a.line==='front');
 assert.ok(entry,'genuine own-effect named OUTSIDE deployment');
 s=step(s,entry);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 assert.deepEqual(legalUniversalActions(both,s).map(a=>a.mode).sort(),['bp','swap']);
 return {s,target,other,defender};
}
test('R57 MST-1-009 Japanese official full print and Q2147 no omitted RAID/LIFE branch',()=>{
 const o=MST_V2_OFFICIAL_BY_ID['MST-1-009'];
 assert.ok(o.verified&&o.source.includes('UA54BT%2FMST-1-009'));
 assert.deepEqual([o.nameJa,o.energy,o.ap,o.bp,o.gen,o.trigger],
  ['エリス',3,1,3500,1,'raid']);
 for(const print of ['〖レイド〗','〖インパクト（1）〗','BP+500','次の自分のターン開始時まで',
  'アタック終了時','自分の効果で登場'])assert.ok(o.effectJa.includes(print));
 assert.equal(m.raidName,'エリス');
 assert.equal(m.printedImpact,1);assert.equal(m.ownTurnBp,500);
 assert.equal(m.effects.onPlay[0].entry,'ownEffect');
 assert.deepEqual(m.effects.onPlay[0].options.map(o=>o.id),['bp','swap']);
});
test('R57 genuine free own-effect entry picks mandatory BP mode; survives opponent turn, not next own start',()=>{
 let {s,target}=scene();s=step(s,{type:'chooseEffectMode',mode:'bp'});
 const physical=s.players[0].front.find(c=>c?.uid===target.uid);
 assert.equal(universalBp(both,s,physical),5000);
 assert.equal(universalImpact(both,s,physical),1);
 assert.equal(physical.attackEndSwapGranted,undefined);
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
 // One whole turn ends; the opponent's turn does NOT expire the effect.
 for(let i=0;i<2;i++)s=step(s,{type:'next'}); // attack and end (from main)
 assert.equal(s.active,1);assert.equal(universalBp(both,s,physical),4500);
 for(let i=0;i<4;i++)s=step(s,{type:'next'}); // opponent phases through end
 assert.equal(s.active,0);
 assert.equal(universalBp(both,s,s.players[0].front.find(c=>c?.uid===target.uid)),4000);
 assert.ok(!(s.players[0].front.find(c=>c?.uid===target.uid).buffs||[])
  .some(b=>b.untilOwnTurnStart!==undefined));
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
});
test('R57 genuine own-effect swap mode waits until normal blocking battle finishes',()=>{
 let {s,target,other,defender}=scene();
 s=step(s,{type:'chooseEffectMode',mode:'swap'});
 let p=s.players[0].front.find(c=>c?.uid===target.uid);
 assert.deepEqual(p.attackEndSwapGranted,{turn:s.turn,stamp:p.fieldEntryStamp});
 s=step(s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=step(s,{type:'attack',uid:target.uid});
 assert.equal(s.pending?.kind,'block');
 s=step(s,{type:'chooseBlock',uid:defender.uid});
 // The real combat and its retirement/IMPACT must finish before Q2147 swap.
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.pending?.kind,'attack-end-swap');
 assert.equal(s.players[1].life.length,6);
 const choices=legalUniversalActions(both,s);
 assert.ok(choices.some(a=>a.type==='chooseAttackEndSwap'&&a.uid===null));
 assert.ok(choices.some(a=>a.type==='chooseAttackEndSwap'&&a.uid===other.uid));
 assert.throws(()=>step(s,{type:'chooseAttackEndSwap',uid:'1-1234'}));
 s=step(s,{type:'chooseAttackEndSwap',uid:other.uid});
 assert.equal(s.players[0].energy[0].uid,target.uid);
 assert.ok(s.players[0].front.some(c=>c?.uid===other.uid));
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
 assert.equal(universalPublicView(both,s,1).players[0].hand,null);
});
test('R57 direct LIFE attack waits for completed trigger check before optional swap',()=>{
 let {s,target,other}=scene();
 s=step(s,{type:'chooseEffectMode',mode:'swap'});
 s.players[1].front[0].ready=false;
 s=step(s,{type:'next'});
 s=step(s,{type:'attack',uid:target.uid});
 s=step(s,{type:'chooseBlock',uid:null});
 // If the revealed LIFE has a trigger, finish its legal choice first.
 while(s.pending&&s.pending.kind!=='attack-end-swap'){
  const actions=legalUniversalActions(both,s);
  if(!actions.length)throw Error('No legal LIFE resolution');
  const chosen=actions.find(a=>a.uid===null)||actions[0];
  s=step(s,chosen);
 }
 assert.equal(s.pending?.kind,'attack-end-swap');
 assert.equal(s.players[1].life.length,6);
 s=step(s,{type:'chooseAttackEndSwap',uid:null});
 assert.ok(s.players[0].front.some(c=>c?.uid===target.uid));
 assert.ok(s.players[0].energy.some(c=>c?.uid===other.uid));
});
test('R57 normal paid play is not own-effect; no bonus or swap is earned',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:57010});
 const target=take(s,0,'MST-1-009');
 s.players[0].hand.push(target);
 for(let i=0;i<3;i++){
  const e=take(s,0,'filler'+i);e.ready=true;
  e.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=e;
 }
 s=step(s,{type:'next'});s=step(s,{type:'next'});
 const a=legalUniversalActions(both,s).find(x=>x.type==='play'&&x.uid===target.uid&&x.line==='front');
 assert.ok(a);s=step(s,a);
 assert.equal(s.pending,null);
 const current=s.players[0].front.find(c=>c?.uid===target.uid);
 assert.equal(current.attackEndSwapGranted,undefined);
 assert.equal(universalBp(both,s,current),4000);
 assert.equal(universalImpact(both,s,current),1);
});
test('R57 genuine official 50-card MST paid RAID preserves exact physical base and ignores own-effect-only branch',()=>{
 const real=mstV2Pack(),realPack=[real,real];
 const ids=['MST-1-009','MST-1-001','MST-1-002','MST-1-010','MST-1-012',
  'MST-1-017','MST-1-018','MST-1-019','MST-1-020',
  'MST-1-022','MST-1-027','MST-1-029','MST-1-047'];
 const actualDeck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(real,actualDeck),[]);
 let s=newUniversalMatch(realPack,{decks:[actualDeck,actualDeck],first:0,seed:571009});
 const boss=take(s,0,'MST-1-009'),base=take(s,0,'MST-1-002');
 base.ready=true;base.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=base;
 const energyIds=['MST-1-001','MST-1-002','MST-1-010'];
 energyIds.forEach((id,i)=>{
  const energy=take(s,0,id);energy.ready=true;
  energy.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=energy;
 });
 s.players[0].hand.push(boss);
 s=dispatchUniversalAction(realPack,s,{type:'next'});
 s=dispatchUniversalAction(realPack,s,{type:'next'});
 const a=legalUniversalActions(realPack,s).find(x=>
  x.type==='raid'&&x.uid===boss.uid&&x.baseUid===base.uid);
 assert.ok(a,'valid printed Raid must be payable with three blue energy');
 s=dispatchUniversalAction(realPack,s,a);
 assert.ok(!s.pending);
 const top=s.players[0].front.find(c=>c?.uid===boss.uid);
 assert.ok(top&&top.ready);
 assert.equal(top.stack.length,1);assert.equal(top.stack[0].uid,base.uid);
 assert.equal(top.attackEndSwapGranted,undefined);
 assert.equal(universalBp(realPack,s,top),4000);
 assert.equal(universalImpact(realPack,s,top),1);
 assert.equal(assertUniversalMatch(realPack,structuredClone(s)),true);
});
test('R57 reject malformed free own-effect branch and forged stamped grant',()=>{
 let {s,target}=scene();
 s=step(s,{type:'chooseEffectMode',mode:'swap'});
 const forged=structuredClone(s);
 forged.players[0].front.find(c=>c?.uid===target.uid).attackEndSwapGranted.stamp=999999;
 assert.throws(()=>assertUniversalMatch(both,forged));
 for(const wrong of [
  {...mstRaw,effects:{onPlay:[{...m.effects.onPlay[0],entry:'paidRaid'}]}},
  {...mstRaw,effects:{onPlay:[{...m.effects.onPlay[0],options:[
   {...m.effects.onPlay[0].options[0],then:[{op:'buffSelfUntilNextOwnStart',bp:-1}]},
   m.effects.onPlay[0].options[1]]}]}},
  {...mstRaw,effects:{onPlay:[{op:'grantSelfAttackEndSwapThisTurn'}]}}
 ])assert.throws(()=>createUniversalPack({id:'invalid',cards:[wrong]}));
});
