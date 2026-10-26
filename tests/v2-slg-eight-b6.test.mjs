import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA51BT/SLG-1-049 and SLG-1-067. Official pages were not re-read this batch.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-049','SLG-1-067','SLG-1-041','SLG-1-046','SLG-1-070','SLG-1-005',
 'SLG-1-065','SLG-1-015','SLG-1-002','SLG-1-007','SLG-1-013','SLG-1-009'];
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
function ownMain(s){
 for(let i=0;i<16&&!(s.active===0&&s.phase==='main');i++){
  if(s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid});
   continue;
  }
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 assert.equal(s.active,0);
 assert.equal(s.phase,'main');
 return s;
}
function fuel(s,id,n=4){
 for(let i=0;i<n;i++){
  const c=take(s,0,id);c.ready=true;s.players[0].energy[i]=c;
 }
}
test('049 paid play does not retire, and BP+500 applies on both turns',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8049,first:0});
 const jin=take(s,0,'SLG-1-049');s.players[0].hand.push(jin);
 fuel(s,'SLG-1-041');
 const foe=take(s,1,'SLG-1-005');s.players[1].front[0]=foe;
 s=phase(s,'main');stamp(s,0);stamp(s,1);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===jin.uid&&a.line==='front');
 assert.ok(play);
 let next=dispatchUniversalAction(packs,s,play);
 assert.equal(next.pending,null);
 assert.ok(next.players[1].front.some(c=>c?.uid===foe.uid));
 const lived=next.players[0].front.find(c=>c?.uid===jin.uid);
 assert.equal(lived.ready,false);
 assert.equal(universalBp(packs,next,lived),4500);
 assert.equal(universalImpact(packs,next,lived),1);
 while(!(next.active===1&&next.phase==='main'))
  next=dispatchUniversalAction(packs,next,{type:'next'});
 const later=next.players[0].front.find(c=>c?.uid===jin.uid);
 assert.equal(universalBp(packs,next,later),4500);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('049 attack draws, then tucks one hand card facedown under itself',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8050,first:0});
 const jin=take(s,0,'SLG-1-049');jin.ready=true;s.players[0].front[0]=jin;
 s=phase(s,'attack');stamp(s,0);
 const handBefore=s.players[0].hand.length;
 let next=dispatchUniversalAction(packs,s,{type:'attack',uid:jin.uid});
 assert.equal(next.pending.kind,'effect-tuck-hand');
 assert.equal(next.players[0].hand.length,handBefore+1);
 const tuck=legalUniversalActions(packs,next).find(a=>a.type==='chooseTuckHand');
 assert.equal(uiActionLabel(tuck,{pack:packs,state:next}).includes('裏向'),true);
 const tucked=tuck.uid;
 next=dispatchUniversalAction(packs,next,tuck);
 const lived=next.players[0].front.find(c=>c?.uid===jin.uid);
 assert.equal(lived.under.length,1);
 assert.equal(lived.under[0].uid,tucked);
 assert.equal(lived.under[0].faceDown,true);
 assert.ok(next.zoneMoveEvents.some(e=>e.uid===tucked&&e.from==='hand'&&
  e.to==='raid-under'&&e.reason==='own-effect'&&e.sourceUid===jin.uid));
 assert.equal(next.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('067 draws, activates and gains 1000 when three DFN are on the field',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8067,first:0});
 const kana=take(s,0,'SLG-1-067');s.players[0].hand.push(kana);
 fuel(s,'SLG-1-046');
 const a=take(s,0,'SLG-1-070'),b=take(s,0,'SLG-1-070');
 s.players[0].front[0]=a;s.players[0].front[1]=b;
 s=phase(s,'main');stamp(s,0);
 const before=s.players[0].hand.length;
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===kana.uid&&x.line==='front');
 let next=dispatchUniversalAction(packs,s,play);
 const lived=next.players[0].front.find(c=>c?.uid===kana.uid);
 assert.equal(next.players[0].hand.length,before);
 assert.equal(lived.ready,true);
 assert.equal(universalBp(packs,next,lived),4000);
 assert.ok(next.onceEffectUses[0].includes('name:カナ'));
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('067 does not spend the shared name when fewer than three DFN are present',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8068,first:1});
 const first=take(s,0,'SLG-1-067'),second=take(s,0,'SLG-1-067');
 s.players[0].hand.push(first,second);
 fuel(s,'SLG-1-041');
 const only=take(s,0,'SLG-1-070');s.players[0].front[0]=only;
 s=ownMain(s);stamp(s,0);
 const before=s.players[0].hand.length;
 let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===first.uid&&a.type==='play'&&a.line==='front'));
 const missed=next.players[0].front.find(c=>c?.uid===first.uid);
 assert.equal(next.players[0].hand.length,before-1);
 assert.equal(missed.ready,false);
 assert.equal(universalBp(packs,next,missed),3000);
 assert.equal(next.onceEffectUses[0].includes('name:カナ'),false);
 const extra=take(next,0,'SLG-1-070');next.players[0].front[2]=extra;
 stamp(next,0);
 const mid=next.players[0].hand.length;
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.uid===second.uid&&a.type==='play'&&a.line==='front'));
 const hit=next.players[0].front.find(c=>c?.uid===second.uid);
 assert.equal(next.players[0].hand.length,mid);
 assert.equal(hit.ready,true);
 assert.equal(universalBp(packs,next,hit),4000);
 assert.ok(next.onceEffectUses[0].includes('name:カナ'));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('067 a later copy does not repeat the shared name entry',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8070,first:1});
 const first=take(s,0,'SLG-1-067'),second=take(s,0,'SLG-1-067');
 s.players[0].hand.push(first,second);
 fuel(s,'SLG-1-041');
 const a=take(s,0,'SLG-1-070'),b=take(s,0,'SLG-1-070');
 s.players[0].front[0]=a;s.players[0].front[1]=b;
 s=ownMain(s);stamp(s,0);
 let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(x=>x.uid===first.uid&&x.type==='play'&&x.line==='front'));
 assert.equal(next.players[0].front.find(c=>c?.uid===first.uid).ready,true);
 const before=next.players[0].hand.length;
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(x=>x.uid===second.uid&&x.type==='play'&&x.line==='front'));
 const blocked=next.players[0].front.find(c=>c?.uid===second.uid);
 assert.equal(next.players[0].hand.length,before-1);
 assert.equal(blocked.ready,false);
 assert.equal(universalBp(packs,next,blocked),3000);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('067 COLOR life deploys one green AP1 energy-2-or-less character from hand',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:1,seed:8069});
 const revealed=take(s,0,'SLG-1-067'),legal=take(s,0,'SLG-1-046'),
  costly=take(s,0,'SLG-1-065'),purple=take(s,0,'SLG-1-005'),
  attacker=take(s,1,'SLG-1-015');
 s.players[0].deck.push(s.players[0].life.shift());s.players[0].life.unshift(revealed);
 s.players[0].hand.push(legal,costly,purple);
 attacker.ready=true;s.players[1].front[0]=attacker;
 s=phase(s,'attack');stamp(s,1);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 if(s.pending?.kind==='block')
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'color');
 const opts=legalUniversalActions(packs,s);
 assert.ok(opts.some(a=>a.mode==='color'&&a.uid===legal.uid&&a.line==='front'));
 assert.ok(!opts.some(a=>a.uid===costly.uid||a.uid===purple.uid));
 const chosen=opts.find(a=>a.mode==='color'&&a.uid===legal.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction(packs,s,chosen,{actor:0});
 assert.equal(s.players[0].front[0].uid,legal.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===revealed.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
