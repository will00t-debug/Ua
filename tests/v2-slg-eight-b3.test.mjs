import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp} from '../dist/universal-v2/engine.mjs';

// UA51BT/SLG-1-003 and SLG-1-024. Official pages were not re-read this batch.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-003','SLG-1-024','SLG-1-037','SLG-1-030','SLG-1-021','SLG-1-005',
 'SLG-1-015','SLG-1-002','SLG-1-007','SLG-1-013','SLG-1-009','SLG-1-001'];
const filler=Object.values(slg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
 !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
const ids=[...required,filler[0]];
const counts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
assert.deepEqual(validateUniversalDeck(slg,counts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card: '+id);
}
function phase(s,name){
 for(let i=0;i<8&&s.phase!==name;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,name);
 return s;
}
function stamp(s,p){
 for(const c of [...s.players[p].front,...s.players[p].energy].filter(Boolean))
  if(!Number.isInteger(c.fieldEntryStamp))c.fieldEntryStamp=s.nextFieldEntryStamp++;
}
function park(s,p,n){
 const zones=['hand','deck','life','removed'];
 for(let i=0;i<n;i++){
  let found=null;
  for(const zone of zones){
   const pile=s.players[p][zone];
   if(pile.length){found=pile.shift();break;}
  }
  if(!found)throw Error('Not enough cards to park outside');
  s.players[p].outside.push(found);
 }
}
test('003 adds one purple energy at ten outside cards and peeks when it attacks',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8003,first:0});
 const rin=take(s,0,'SLG-1-003');rin.ready=true;s.players[0].energy[0]=rin;
 park(s,0,9);
 s=phase(s,'main');
 assert.equal(s.players[0].outside.length,9);
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 park(s,0,1);
 assert.equal(s.players[0].outside.length,10);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 s.players[0].energy[0]=null;
 rin.ready=true;
 s.players[0].front[0]=rin;
 s=phase(s,'attack');
 stamp(s,0);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:rin.uid});
 assert.equal(next.pending.kind,'private-top-choice');
 next=dispatchUniversalAction(packs,next,{type:'chooseTopCard',mode:'top'});
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('003 recovered by an own effect may buff one own character',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8004,first:0});
 const event=take(s,0,'SLG-1-037');s.players[0].hand.push(event);
 const rin=take(s,0,'SLG-1-003');s.players[0].outside.push(rin);
 for(let i=0;i<4;i++){
  const fuel=take(s,0,'SLG-1-030');fuel.ready=true;s.players[0].energy[i]=fuel;
 }
 s=phase(s,'main');
 stamp(s,0);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 let next=dispatchUniversalAction(packs,s,play);
 assert.equal(next.pending.kind,'effect-recover-outside');
 next=dispatchUniversalAction(packs,next,{type:'chooseOutsideRecovery',uid:rin.uid});
 assert.equal(next.pending.kind,'effect-buff-own');
 const ally=next.players[0].energy[0];
 next=dispatchUniversalAction(packs,next,{type:'chooseOwnBuff',uid:ally.uid});
 const lived=next.players[0].energy.find(c=>c?.uid===ally.uid);
 assert.equal(universalBp(packs,next,lived),slg.cards['SLG-1-030'].bp+1000);
 assert.ok(next.players[0].hand.some(c=>c.uid===rin.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('024 cannot be blocked by BP 4000 or higher',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8024,first:0});
 const gate=take(s,0,'SLG-1-024');gate.ready=true;s.players[0].front[0]=gate;
 const big=take(s,1,'SLG-1-021');big.ready=true;s.players[1].front[0]=big;
 const small=take(s,1,'SLG-1-005');small.ready=true;s.players[1].front[1]=small;
 s=phase(s,'attack');
 stamp(s,0);stamp(s,1);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:gate.uid});
 assert.equal(next.pending.kind,'block');
 const blocks=legalUniversalActions(packs,next);
 assert.equal(blocks.some(a=>a.uid===big.uid),false);
 assert.ok(blocks.some(a=>a.uid===small.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('024 retirement lets the opponent grant the same ceiling',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8025,first:0});
 const hunter=take(s,0,'SLG-1-021');hunter.ready=true;s.players[0].front[0]=hunter;
 const spare=take(s,0,'SLG-1-005');spare.ready=true;s.players[0].front[1]=spare;
 const gate=take(s,1,'SLG-1-024');gate.ready=true;s.players[1].front[0]=gate;
 s=phase(s,'attack');
 stamp(s,0);stamp(s,1);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:hunter.uid});
 assert.equal(next.pending.kind,'block');
 next=dispatchUniversalAction(packs,next,{type:'chooseBlock',uid:gate.uid});
 assert.equal(next.pending?.kind,'effect-grant-opp-block');
 assert.equal(next.pending.player,0);
 const choices=legalUniversalActions(packs,next);
 assert.ok(choices.some(a=>a.uid===hunter.uid));
 assert.ok(choices.some(a=>a.uid===spare.uid));
 next=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===spare.uid));
 const lived=next.players[0].front.find(c=>c?.uid===spare.uid);
 assert.equal(lived.blockAtLeastGranted.bp,4000);
 assert.equal(lived.blockAtLeastGranted.sourceUid,gate.uid);
 assert.ok(next.players[1].outside.some(c=>c.uid===gate.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
