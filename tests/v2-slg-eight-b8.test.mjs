import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA51BT/SLG-1-077, SLG-1-080 and SLG-1-039. Official pages were not re-read.
const slg=createSlgV2Pack(),packs=[slg,slg];
const fours=['SLG-1-080','SLG-1-046','SLG-1-006','SLG-1-028','SLG-1-029','SLG-1-031',
 'SLG-1-056','SLG-1-070','SLG-1-054','SLG-1-069','SLG-1-062'];
const filler=Object.values(slg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
 !fours.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort()[0];
const counts={...Object.fromEntries(fours.map(id=>[id,4])),'SLG-1-077':2,'SLG-1-039':2,[filler]:2};
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
function readyEnergy(s,ids){
 ids.forEach((id,i)=>{
  const c=take(s,0,id);c.ready=true;s.players[0].energy[i]=c;
 });
}
function playEvent(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 assert.ok(action);
 return dispatchUniversalAction(packs,s,action);
}
test('077 retires BP 2000 and leaves BP 4000 when fewer than five raid cards are on the field',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8077,first:0});
 const event=take(s,0,'SLG-1-077');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-046','SLG-1-046','SLG-1-046','SLG-1-046']);
 const low=take(s,1,'SLG-1-046'),high=take(s,1,'SLG-1-028');
 s.players[1].front[0]=low;s.players[1].front[1]=high;
 s=phase(s,'main');stamp(s,0);stamp(s,1);
 let next=playEvent(s,event.uid);
 assert.equal(next.pending.kind,'effect-retire-bp');
 assert.equal(next.pending.limit,2000);
 const legal=legalUniversalActions(packs,next);
 assert.ok(legal.some(a=>a.type==='chooseRetireBp'&&a.uid===low.uid));
 assert.ok(!legal.some(a=>a.uid===high.uid||a.uid===null));
 next=dispatchUniversalAction(packs,next,legal.find(a=>a.uid===low.uid));
 assert.equal(next.pending,null);
 assert.ok(next.players[1].outside.some(c=>c.uid===low.uid));
 assert.ok(next.players[1].front.some(c=>c?.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('077 raises the ceiling to 5000 at five raid cards without opening the distinct-name buff',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8078,first:0});
 const event=take(s,0,'SLG-1-077');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-054','SLG-1-046','SLG-1-046','SLG-1-046']);
 for(let i=0;i<4;i++)s.players[0].front[i]=take(s,0,'SLG-1-070');
 const high=take(s,1,'SLG-1-028');s.players[1].front[0]=high;
 s=phase(s,'main');stamp(s,0);stamp(s,1);
 let next=playEvent(s,event.uid);
 assert.equal(next.pending.limit,5000);
 const choice=legalUniversalActions(packs,next).find(a=>a.uid===high.uid);
 assert.ok(choice);
 next=dispatchUniversalAction(packs,next,choice);
 assert.equal(next.pending,null);
 assert.ok(next.players[1].outside.some(c=>c.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('077 gives one own character 1000 BP after five distinct raid names',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8079,first:0});
 const event=take(s,0,'SLG-1-077');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-070','SLG-1-054','SLG-1-062','SLG-1-069']);
 const shizuku=take(s,0,'SLG-1-056'),other=take(s,0,'SLG-1-046');
 s.players[0].front[0]=shizuku;s.players[0].front[1]=other;
 const low=take(s,1,'SLG-1-046');s.players[1].front[0]=low;
 s=phase(s,'main');stamp(s,0);stamp(s,1);
 let next=playEvent(s,event.uid);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.uid===low.uid));
 assert.equal(next.pending.kind,'effect-buff-own');
 assert.equal(next.pending.bp,1000);
 const buffs=legalUniversalActions(packs,next);
 assert.ok(buffs.some(a=>a.uid===other.uid));
 assert.ok(buffs.some(a=>a.uid===null));
 next=dispatchUniversalAction(packs,next,buffs.find(a=>a.uid===other.uid));
 assert.equal(universalBp(packs,next,next.players[0].front.find(c=>c?.uid===other.uid)),3000);
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('077 can be played when no front character is under the ceiling',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8080,first:0});
 const event=take(s,0,'SLG-1-077');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-046','SLG-1-046','SLG-1-046','SLG-1-046']);
 const high=take(s,1,'SLG-1-028');s.players[1].front[0]=high;
 s=phase(s,'main');stamp(s,0);stamp(s,1);
 const next=playEvent(s,event.uid);
 assert.equal(next.pending,null);
 assert.ok(next.players[0].outside.some(c=>c.uid===event.uid));
 assert.ok(next.players[1].front.some(c=>c?.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('077 SPECIAL life retires a front character above the printed event ceiling',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:1,seed:8081});
 const revealed=take(s,0,'SLG-1-077'),spare=take(s,1,'SLG-1-028'),
  attacker=take(s,1,'SLG-1-046');
 s.players[0].deck.push(s.players[0].life.shift());s.players[0].life.unshift(revealed);
 attacker.ready=true;s.players[1].front[0]=attacker;
 s.players[1].front[1]=spare;
 s=phase(s,'attack');stamp(s,1);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 if(s.pending?.kind==='block')
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'special');
 const chosen=legalUniversalActions(packs,s).find(a=>a.mode==='special'&&a.uid===spare.uid);
 assert.ok(chosen);
 s=dispatchUniversalAction(packs,s,chosen,{actor:0});
 assert.ok(!s.players[1].front.some(c=>c?.uid===spare.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===spare.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('080 draws and grants only 向坂 雫 an attack draw from outside',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8082,first:0});
 const event=take(s,0,'SLG-1-080');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-046','SLG-1-046']);
 const shizuku=take(s,0,'SLG-1-056');shizuku.ready=true;s.players[0].front[0]=shizuku;
 const other=take(s,0,'SLG-1-070');s.players[0].front[1]=other;
 s=phase(s,'main');stamp(s,0);
 const deckBefore=s.players[0].deck.length;
 let next=playEvent(s,event.uid);
 assert.equal(next.players[0].deck.length,deckBefore-1);
 assert.ok(next.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(next.pending.kind,'effect-grant-attack');
 assert.equal(next.pending.name,'向坂 雫');
 const grants=legalUniversalActions(packs,next);
 assert.deepEqual(grants.map(a=>a.uid).filter(Boolean),[shizuku.uid]);
 assert.ok(grants.some(a=>a.uid===null));
 assert.equal(uiActionLabel(grants.find(a=>a.uid===shizuku.uid),{pack:packs,state:next}).includes('向坂'),true);
 next=dispatchUniversalAction(packs,next,grants.find(a=>a.uid===shizuku.uid));
 assert.equal(next.continuousStates.filter(e=>e.kind==='grantedOnAttack'&&e.targetUid===shizuku.uid).length,1);
 next=phase(next,'attack');
 const handBefore=next.players[0].hand.length,deckAtAttack=next.players[0].deck.length;
 next=dispatchUniversalAction(packs,next,{type:'attack',uid:shizuku.uid});
 assert.equal(next.pending.kind,'granted-attack-draw');
 assert.equal(next.players[0].deck.length,deckAtAttack);
 next=dispatchUniversalAction(packs,next,{type:'chooseGrantedDraw',mode:'draw'});
 assert.equal(next.players[0].hand.length,handBefore+1);
 assert.equal(next.players[0].deck.length,deckAtAttack-1);
 assert.equal(next.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('080 may decline the named attack grant',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8083,first:0});
 const event=take(s,0,'SLG-1-080');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-046','SLG-1-046']);
 const shizuku=take(s,0,'SLG-1-056');shizuku.ready=true;s.players[0].front[0]=shizuku;
 s=phase(s,'main');stamp(s,0);
 let next=playEvent(s,event.uid);
 next=dispatchUniversalAction(packs,next,{type:'chooseGrantAttack',uid:null});
 assert.equal(next.continuousStates.some(e=>e.kind==='grantedOnAttack'),false);
 next=phase(next,'attack');
 next=dispatchUniversalAction(packs,next,{type:'attack',uid:shizuku.uid});
 assert.equal(next.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('080 DRAW life draws one card',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:1,seed:8084});
 const revealed=take(s,0,'SLG-1-080'),attacker=take(s,1,'SLG-1-046');
 s.players[0].deck.push(s.players[0].life.shift());s.players[0].life.unshift(revealed);
 attacker.ready=true;s.players[1].front[0]=attacker;
 s=phase(s,'attack');stamp(s,1);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 if(s.pending?.kind==='block')
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.trigger,'draw');
 const deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:0});
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.ok(s.players[0].outside.some(c=>c.uid===revealed.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('039 ACTIVE mode enters one shadow character and excludes a non-shadow card',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8039,first:0});
 const event=take(s,0,'SLG-1-039');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-006','SLG-1-006','SLG-1-006']);
 const igrit=take(s,0,'SLG-1-028'),kaiser=take(s,0,'SLG-1-029'),other=take(s,0,'SLG-1-046');
 s.players[0].outside.push(igrit,kaiser,other);
 s=phase(s,'main');stamp(s,0);
 let next=playEvent(s,event.uid);
 assert.equal(next.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(packs,next);
 assert.ok(modes.some(a=>a.mode==='active')&&modes.some(a=>a.mode==='rest'));
 assert.ok(!modes.some(a=>a.mode==='skip'));
 next=dispatchUniversalAction(packs,next,modes.find(a=>a.mode==='active'));
 assert.equal(next.pending.kind,'effect-outside-trait-entry');
 assert.equal(next.pending.ready,true);
 const entries=legalUniversalActions(packs,next);
 assert.ok(entries.some(a=>a.uid===igrit.uid));
 assert.ok(entries.some(a=>a.uid===kaiser.uid));
 assert.ok(!entries.some(a=>a.uid===other.uid));
 assert.equal(uiActionLabel(entries.find(a=>a.uid===igrit.uid),{pack:packs,state:next}).includes('ACTIVE'),true);
 const place=entries.find(a=>a.uid===igrit.uid&&a.line==='front'&&a.slot===0&&!a.replaceUid);
 next=dispatchUniversalAction(packs,next,place);
 const lived=next.players[0].front.find(c=>c?.uid===igrit.uid);
 assert.equal(lived.ready,true);
 assert.ok(next.players[0].outside.some(c=>c.uid===kaiser.uid));
 assert.ok(next.zoneMoveEvents.some(e=>e.uid===igrit.uid&&e.from==='outside'&&
  e.to==='front'&&e.reason==='own-effect'&&e.sourceUid===event.uid));
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('039 REST mode excludes energy 4 and can stop after one',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8040,first:0});
 const event=take(s,0,'SLG-1-039');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-006','SLG-1-006','SLG-1-006']);
 const igrit=take(s,0,'SLG-1-028'),kaiser=take(s,0,'SLG-1-029'),kiba=take(s,0,'SLG-1-031');
 s.players[0].outside.push(igrit,kaiser,kiba);
 s=phase(s,'main');stamp(s,0);
 let next=playEvent(s,event.uid);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.mode==='rest'));
 assert.equal(next.pending.ready,false);
 assert.equal(next.pending.remaining,2);
 let entries=legalUniversalActions(packs,next);
 assert.ok(!entries.some(a=>a.uid===igrit.uid));
 assert.equal(uiActionLabel(entries.find(a=>a.uid===kaiser.uid),{pack:packs,state:next}).includes('REST'),true);
 next=dispatchUniversalAction(packs,next,entries.find(a=>a.uid===kaiser.uid&&a.line==='front'&&a.slot===0&&!a.replaceUid));
 assert.equal(next.players[0].front.find(c=>c?.uid===kaiser.uid).ready,false);
 assert.equal(next.pending.kind,'effect-outside-trait-entry');
 entries=legalUniversalActions(packs,next);
 assert.ok(entries.some(a=>a.uid===kiba.uid));
 assert.ok(!entries.some(a=>a.uid===kaiser.uid||a.uid===igrit.uid));
 next=dispatchUniversalAction(packs,next,{type:'chooseOutsideTrait',uid:null});
 assert.equal(next.pending,null);
 assert.ok(next.players[0].outside.some(c=>c.uid===kiba.uid));
 assert.ok(next.players[0].front.some(c=>c?.uid===kaiser.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('039 REST mode can enter both energy-3 shadow characters',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8042,first:0});
 const event=take(s,0,'SLG-1-039');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-006','SLG-1-006','SLG-1-006']);
 const kaiser=take(s,0,'SLG-1-029'),kiba=take(s,0,'SLG-1-031');
 s.players[0].outside.push(kaiser,kiba);
 s=phase(s,'main');stamp(s,0);
 let next=playEvent(s,event.uid);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.mode==='rest'));
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>
  a.uid===kaiser.uid&&a.line==='front'&&a.slot===0&&!a.replaceUid));
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>
  a.uid===kiba.uid&&a.line==='front'&&a.slot===1&&!a.replaceUid));
 assert.equal(next.players[0].front.find(c=>c?.uid===kaiser.uid).ready,false);
 assert.equal(next.players[0].front.find(c=>c?.uid===kiba.uid).ready,false);
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('039 still offers both modes when no outside shadow character exists',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8041,first:0});
 const event=take(s,0,'SLG-1-039');s.players[0].hand.push(event);
 readyEnergy(s,['SLG-1-006','SLG-1-006','SLG-1-006']);
 s=phase(s,'main');stamp(s,0);
 let next=playEvent(s,event.uid);
 assert.equal(next.pending.kind,'effect-choice-mode');
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next).find(a=>a.mode==='active'));
 assert.equal(next.pending,null);
 assert.ok(next.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
