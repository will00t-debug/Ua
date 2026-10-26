import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';

// UA51BT/SLG-1-020. Official page was not re-read this batch.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-020','SLG-1-015','SLG-1-028','SLG-1-005','SLG-1-030','SLG-1-021',
 'SLG-1-002','SLG-1-007','SLG-1-013','SLG-1-009','SLG-1-001','SLG-1-024'];
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
function stamp(s,p){
 for(const c of [...s.players[p].front,...s.players[p].energy].filter(Boolean))
  if(!Number.isInteger(c.fieldEntryStamp))c.fieldEntryStamp=s.nextFieldEntryStamp++;
}
function fuel(s){
 for(let i=0;i<4;i++){
  const c=take(s,0,'SLG-1-030');c.ready=true;s.players[0].energy[i]=c;
 }
}
test('020 may discard to recover one low printed-BP character that is not 旬',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8020,first:0});
 const jin=take(s,0,'SLG-1-020');s.players[0].hand.push(jin);
 fuel(s);
 const named=take(s,0,'SLG-1-015');s.players[0].outside.push(named);
 const high=take(s,0,'SLG-1-028');s.players[0].outside.push(high);
 const low=take(s,0,'SLG-1-005');s.players[0].outside.push(low);
 s=phase(s,'main');stamp(s,0);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===jin.uid);
 assert.ok(play);
 let next=dispatchUniversalAction(packs,s,play);
 assert.equal(next.pending.kind,'effect-discard-gate');
 const pay=legalUniversalActions(packs,next).find(a=>a.uid);
 next=dispatchUniversalAction(packs,next,pay);
 assert.equal(next.pending.kind,'effect-recover-outside');
 const choices=legalUniversalActions(packs,next);
 assert.equal(choices.some(a=>a.uid===named.uid),false);
 assert.equal(choices.some(a=>a.uid===high.uid),false);
 assert.ok(choices.some(a=>a.uid===low.uid));
 next=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===low.uid));
 assert.ok(next.players[0].hand.some(c=>c.uid===low.uid));
 assert.ok(next.players[0].outside.some(c=>c.uid===named.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('020 does not recover when the hand discard is declined',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8021,first:0});
 const jin=take(s,0,'SLG-1-020');s.players[0].hand.push(jin);
 fuel(s);
 const low=take(s,0,'SLG-1-005');s.players[0].outside.push(low);
 s=phase(s,'main');stamp(s,0);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===jin.uid);
 let next=dispatchUniversalAction(packs,s,play);
 next=dispatchUniversalAction(packs,next,{type:'chooseDiscardGate',uid:null});
 assert.equal(next.pending,null);
 assert.ok(next.players[0].outside.some(c=>c.uid===low.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('020 attack discards and adds 500 BP for each five outside cards',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8022,first:0});
 const jin=take(s,0,'SLG-1-020');jin.ready=true;s.players[0].front[0]=jin;
 park(s,0,4);
 s=phase(s,'attack');stamp(s,0);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:jin.uid});
 assert.equal(next.pending.kind,'effect-discard');
 const discard=legalUniversalActions(packs,next).find(a=>a.uid);
 next=dispatchUniversalAction(packs,next,discard);
 const lived=next.players[0].front.find(c=>c?.uid===jin.uid);
 assert.equal(next.players[0].outside.length,5);
 assert.equal(universalBp(packs,next,lived),4000+500);
 assert.equal(next.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,next),true);
});
