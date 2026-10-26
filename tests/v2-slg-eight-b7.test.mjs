import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA51BT/SLG-1-035 and SLG-1-075. Official pages were not re-read this batch.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-035','SLG-1-075','SLG-1-030','SLG-1-005','SLG-1-015','SLG-1-046',
 'SLG-1-002','SLG-1-041','SLG-1-007','SLG-1-013','SLG-1-009','SLG-1-001'];
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
test('035 enters ACTIVE and gives shadow soldiers 500 BP below five',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8035,first:0});
 const field=take(s,0,'SLG-1-035');s.players[0].hand.push(field);
 for(let i=0;i<3;i++){
  const c=take(s,0,'SLG-1-030');c.ready=true;s.players[0].energy[i]=c;
 }
 s=phase(s,'main');stamp(s,0);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 let next=dispatchUniversalAction(packs,s,play);
 const lived=next.players[0].energy.find(c=>c?.uid===field.uid);
 assert.equal(lived.ready,true);
 const act=legalUniversalActions(packs,next).find(a=>a.type==='activate'&&a.uid===field.uid&&a.mode==='scale');
 assert.equal(uiActionLabel(act,{pack:packs,state:next}).includes('影之軍團'),true);
 next=dispatchUniversalAction(packs,next,act);
 assert.equal(next.players[0].energy.find(c=>c?.uid===field.uid).ready,false);
 for(const c of next.players[0].energy.filter(c=>c&&c.cardId==='SLG-1-030'))
  assert.equal(universalBp(packs,next,c),2000);
 assert.equal(legalUniversalActions(packs,next).some(a=>a.type==='activate'&&a.uid===field.uid),false);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('035 gives 1000 BP when five shadow-army cards are on the field',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8036,first:0});
 const field=take(s,0,'SLG-1-035');s.players[0].hand.push(field);
 for(let i=0;i<3;i++){
  const c=take(s,0,'SLG-1-005');c.ready=true;s.players[0].energy[i]=c;
 }
 for(let i=0;i<4;i++)s.players[0].front[i]=take(s,0,'SLG-1-030');
 s=phase(s,'main');stamp(s,0);
 let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===field.uid&&a.line==='energy'));
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>
  a.type==='activate'&&a.uid===field.uid&&a.mode==='scale'));
 for(const c of next.players[0].front.filter(c=>c&&c.cardId==='SLG-1-030'))
  assert.equal(universalBp(packs,next,c),2500);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('075 stays REST on entry and tucks the top card only while 旬 is on the field',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8075,first:0});
 const quest=take(s,0,'SLG-1-075');s.players[0].hand.push(quest);
 const fuel=take(s,0,'SLG-1-046');fuel.ready=true;s.players[0].energy[0]=fuel;
 s=phase(s,'main');stamp(s,0);
 let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===quest.uid&&a.line==='energy'));
 assert.equal(next.players[0].energy.find(c=>c?.uid===quest.uid).ready,false);
 assert.equal(legalUniversalActions(packs,next).some(a=>a.uid===quest.uid&&a.type==='activate'),false);
 const jin=take(next,0,'SLG-1-015');next.players[0].front[0]=jin;
 next.players[0].energy.find(c=>c?.uid===quest.uid).ready=true;
 stamp(next,0);
 assert.equal(legalUniversalActions(packs,next).some(a=>a.mode==='tuck'&&a.uid===quest.uid),true);
 const top=next.players[0].deck[0].uid;
 next=dispatchUniversalAction(packs,next,{type:'activate',uid:quest.uid,mode:'tuck'});
 const lived=next.players[0].energy.find(c=>c?.uid===quest.uid);
 assert.equal(lived.ready,false);
 assert.equal(lived.under[0].uid,top);
 assert.equal(lived.under[0].faceDown,true);
 assert.equal(next.players[0].deck.some(c=>c.uid===top),false);
 assert.ok(next.zoneMoveEvents.some(e=>e.uid===top&&e.from==='deck'&&e.to==='raid-under'&&
  e.reason==='own-effect'&&e.sourceUid===quest.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('075 may send one facedown card outside and then recover an energy-0 旬',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8076,first:0});
 const quest=take(s,0,'SLG-1-075');quest.ready=true;s.players[0].energy[0]=quest;
 const host=take(s,0,'SLG-1-005');s.players[0].front[0]=host;
 const buried=take(s,0,'SLG-1-002');
 buried.faceDown=true;buried.ready=false;buried.fieldEntryStamp=null;
 host.under=[buried];
 const low=take(s,0,'SLG-1-015'),high=take(s,0,'SLG-1-046');
 s.players[0].outside.push(low,high);
 s=phase(s,'main');stamp(s,0);
 let next=dispatchUniversalAction(packs,s,{type:'activate',uid:quest.uid,mode:'recover'});
 assert.equal(next.pending.kind,'effect-field-discard-facedown');
 const pay=legalUniversalActions(packs,next).find(a=>a.type==='chooseFieldDiscard');
 next=dispatchUniversalAction(packs,next,pay);
 assert.equal(next.pending.kind,'effect-send-facedown');
 assert.ok(legalUniversalActions(packs,next).some(a=>a.uid===buried.uid));
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.uid===buried.uid));
 assert.equal(next.pending.kind,'effect-recover-outside');
 const choices=legalUniversalActions(packs,next);
 assert.ok(choices.some(a=>a.uid===low.uid));
 assert.equal(choices.some(a=>a.uid===high.uid),false);
 next=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===low.uid));
 assert.ok(next.players[0].hand.some(c=>c.uid===low.uid));
 assert.ok(next.players[0].outside.some(c=>c.uid===buried.uid&&c.faceDown!==true));
 assert.equal(next.players[0].energy.find(c=>c?.uid===quest.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('075 does not recover when the facedown send is declined',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8077,first:0});
 const quest=take(s,0,'SLG-1-075');quest.ready=true;s.players[0].energy[0]=quest;
 const host=take(s,0,'SLG-1-005');s.players[0].front[0]=host;
 const buried=take(s,0,'SLG-1-002');
 buried.faceDown=true;buried.ready=false;buried.fieldEntryStamp=null;
 host.under=[buried];
 const low=take(s,0,'SLG-1-015');s.players[0].outside.push(low);
 s=phase(s,'main');stamp(s,0);
 let next=dispatchUniversalAction(packs,s,{type:'activate',uid:quest.uid,mode:'recover'});
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.type==='chooseFieldDiscard'));
 next=dispatchUniversalAction(packs,next,{type:'chooseSendFacedown',uid:null});
 assert.equal(next.pending,null);
 assert.ok(next.players[0].outside.some(c=>c.uid===low.uid));
 assert.equal(next.players[0].front[0].under[0].uid,buried.uid);
 assert.equal(assertUniversalMatch(packs,next),true);
});
