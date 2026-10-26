import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA51BT/SLG-1-029 and SLG-1-031. Official pages were not re-read this batch.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-029','SLG-1-031','SLG-1-030','SLG-1-028','SLG-1-021','SLG-1-005',
 'SLG-1-040','SLG-1-002','SLG-1-015','SLG-1-007','SLG-1-013','SLG-1-001'];
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
function place(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;return c;
}
test('029 rests to stop a high-BP block for this attack',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8029,first:0});
 const soldier=place(s,0,'SLG-1-030','front',0);
 const kaiser=place(s,0,'SLG-1-029','front',1);
 const big=place(s,1,'SLG-1-021','front',0);
 const small=place(s,1,'SLG-1-005','front',1);
 s=phase(s,'attack');stamp(s,0);stamp(s,1);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:soldier.uid});
 assert.equal(next.pending.kind,'effect-ally-attack-rest');
 const ceiling=legalUniversalActions(packs,next).find(a=>a.mode==='ceiling');
 assert.equal(uiActionLabel(ceiling,{pack:packs,state:next}),'攻擊角色本回合不會被 BP4000 以上角色阻擋');
 next=dispatchUniversalAction(packs,next,ceiling);
 assert.equal(next.players[0].front.find(c=>c?.uid===kaiser.uid).ready,false);
 const lived=next.players[0].front.find(c=>c?.uid===soldier.uid);
 assert.equal(lived.blockAtLeastGranted.bp,4000);
 assert.equal(lived.blockAtLeastGranted.sourceUid,kaiser.uid);
 assert.equal(next.pending.kind,'block');
 const blocks=legalUniversalActions(packs,next);
 assert.equal(blocks.some(a=>a.uid===big.uid),false);
 assert.ok(blocks.some(a=>a.uid===small.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('029 modes are once per printed name and protection blocks an opponent event',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8030,first:0});
 const first=place(s,0,'SLG-1-030','front',0);
 const second=place(s,0,'SLG-1-030','front',1);
 const lead=place(s,0,'SLG-1-029','front',2);
 const follow=place(s,0,'SLG-1-029','front',3);
 const weak=place(s,1,'SLG-1-002','front',0);
 const spare=place(s,1,'SLG-1-005','front',1);
 const event=take(s,1,'SLG-1-040');s.players[1].hand.push(event);
 s=phase(s,'attack');stamp(s,0);stamp(s,1);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:first.uid});
 assert.equal(next.pending.kind,'effect-ally-attack-order');
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackOrder',uid:lead.uid});
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackMode',mode:'ceiling'});
 assert.equal(next.pending.kind,'effect-ally-attack-rest');
 assert.deepEqual(next.pending.modes,['protect']);
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackMode',mode:'skip'});
 next=dispatchUniversalAction(packs,next,{type:'chooseBlock',uid:weak.uid});
 assert.ok(next.players[0].front.some(c=>c?.uid===first.uid));
 assert.ok(next.players[1].outside.some(c=>c.uid===weak.uid));
 next=dispatchUniversalAction(packs,next,{type:'attack',uid:second.uid});
 assert.equal(next.pending.kind,'effect-ally-attack-rest');
 assert.deepEqual(next.pending.modes,['protect']);
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackMode',mode:'protect'});
 const shielded=next.players[0].front.find(c=>c?.uid===second.uid);
 assert.ok(next.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'&&
  e.targetUid===shielded.uid&&e.sourceUid===follow.uid));
 assert.equal(next.pending.kind,'block');
 next=dispatchUniversalAction(packs,next,{type:'chooseBlock',uid:null});
 for(let i=0;i<6&&next.pending;i++){
  const skip=legalUniversalActions(packs,next).find(a=>a.mode==='skip'||a.uid===null);
  next=dispatchUniversalAction(packs,next,skip);
 }
 while(next.players[0].hand.length>8)next.players[0].outside.push(next.players[0].hand.pop());
 next=phase(next,'main');
 assert.equal(next.active,1);
 for(let i=0;i<4;i++){
  const fuel=take(next,1,'SLG-1-030');fuel.ready=true;next.players[1].energy[i]=fuel;
 }
 stamp(next,1);
 const play=legalUniversalActions(packs,next).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 next=dispatchUniversalAction(packs,next,play);
 assert.equal(next.pending.kind,'effect-retire-bp');
 const ally=next.players[0].front.find(c=>c&&c.uid!==second.uid);
 const targets=legalUniversalActions(packs,next);
 assert.equal(targets.some(a=>a.uid===second.uid),false);
 assert.equal(targets.some(a=>a.uid===spare.uid),false);
 assert.ok(targets.some(a=>a.uid===ally.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('a printed BP above 2000 does not open the rest window',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8031,first:0});
 const big=place(s,0,'SLG-1-028','front',0);
 place(s,0,'SLG-1-029','front',1);
 s=phase(s,'attack');stamp(s,0);
 const next=dispatchUniversalAction(packs,s,{type:'attack',uid:big.uid});
 assert.equal(next.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('031 can buff the attacker once per name, then only the draw mode remains',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8032,first:0});
 const first=place(s,0,'SLG-1-030','front',0);
 const second=place(s,0,'SLG-1-030','front',1);
 const lead=place(s,0,'SLG-1-031','front',2);
 const follow=place(s,0,'SLG-1-031','front',3);
 s=phase(s,'attack');stamp(s,0);
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:first.uid});
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackOrder',uid:lead.uid});
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackMode',mode:'buff'});
 const lived=next.players[0].front.find(c=>c?.uid===first.uid);
 assert.equal(universalBp(packs,next,lived),slg.cards['SLG-1-030'].bp+1500);
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackMode',mode:'skip'});
 next=dispatchUniversalAction(packs,next,{type:'chooseBlock',uid:null});
 for(let i=0;i<6&&next.pending;i++){
  const skip=legalUniversalActions(packs,next).find(a=>a.mode==='skip'||a.uid===null);
  next=dispatchUniversalAction(packs,next,skip);
 }
 next=dispatchUniversalAction(packs,next,{type:'attack',uid:second.uid});
 assert.equal(next.pending.sourceUid,follow.uid);
 assert.deepEqual(next.pending.modes,['draw']);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('031 draw mode draws one and discards one',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8033,first:0});
 const soldier=place(s,0,'SLG-1-030','front',0);
 place(s,0,'SLG-1-031','front',1);
 s=phase(s,'attack');stamp(s,0);
 const before=s.players[0].hand.length;
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:soldier.uid});
 next=dispatchUniversalAction(packs,next,{type:'chooseAllyAttackMode',mode:'draw'});
 assert.equal(next.pending.kind,'effect-discard');
 assert.equal(next.players[0].hand.length,before+1);
 const discard=legalUniversalActions(packs,next).find(a=>a.uid);
 next=dispatchUniversalAction(packs,next,discard);
 assert.equal(next.players[0].hand.length,before);
 assert.equal(next.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,next),true);
});
