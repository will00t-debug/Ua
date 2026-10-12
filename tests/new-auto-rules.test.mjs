import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,PRESETS,pendingCards} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,assertState,bp,energy,botAction} from '../dist/engine.mjs';
function game(ids=[]){
 const counts={...PRESETS[0].counts};for(const id of [...ids,...Array(4).fill('BLC-1-075')]){let donor=Object.keys(counts).find(k=>counts[k]>1&&![...ids,'BLC-1-075'].includes(k));counts[donor]--;counts[id]=(counts[id]||0)+1;}
 let s=newGame({decks:[counts,counts],seed:222});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){pl.deck=[...pl.deck,...pl.hand,...pl.life];pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;}
 s.active=0;s.phase='main';s.turn=10;s.queue=[];s.pending=null;return s;
}
function get(s,id,p=0){const deck=s.players[p].deck,i=deck.findIndex(c=>c.cardId===id);assert.ok(i>=0,id);return deck.splice(i,1)[0];}
function put(s,id,p,line,slot,ready=true){const c=get(s,id,p);c.ready=ready;s.players[p][line][slot]=c;return c;}
function play(s,id,line='front',slot=0){const c=get(s,id);s.players[0].hand.push(c);return dispatch(s,CARDS.find(d=>d.id===id).type==='event'?{type:'play',uid:c.uid}:{type:'play',uid:c.uid,line,slot});}
function choose(s,...ids){return dispatch(s,{type:'choose',ids});}
function power(s,p=0){for(let i=0;i<4;i++)put(s,'BLC-1-075',p,'energy',i);}
test('supported status derives from complete explicit profiles only',()=>{
 assert.ok(CARDS.filter(c=>c.auto).length>=190);
 assert.equal(pendingCards({'BLC-4-004':1}).length,0);
 for(const id of ['BLC-1-003','BLC-1-095','BLC-2-051','BLC-4-064'])assert.equal(pendingCards({[id]:1}).length,0);
});
test('enemy resting cards update yellow passive BP and COLOR target may be frozen',()=>{
 let s=game(['BLC-1-003','BLC-1-002','BLC-1-002']);const d=put(s,'BLC-1-003',0,'front',0);
 assert.equal(bp(s,d),2000);put(s,'BLC-1-002',1,'front',0,false);put(s,'BLC-1-002',1,'front',1,false);
 assert.equal(bp(s,d),4000);assertState(s);
});
test('deck look cards stay conserved during multi-stage hand selection and reorder',()=>{
 let s=game(['BLC-1-095','BLC-1-072']);power(s);
 const chosen=put(s,'BLC-1-072',1,'front',0);
 const evt=get(s,'BLC-1-095');s.players[0].hand.push(evt);
 s=dispatch(s,{type:'play',uid:evt.uid});
 assert.ok(s.pending?.effect.kind==='lookTake');assertState(s);
 const take=s.pending.choices.slice(0,1).map(c=>c.id);
 s=choose(s,...take);assertState(s);
 let attempts=0;while(s.pending&&attempts++<5){assert.equal(s.pending.effect.kind,'lookOrder');s=choose(s,s.pending.choices[0].id);assertState(s);}
 assert.equal(s.inspecting?.length||0,0);assert.ok(s.players[0].hand.some(c=>take.includes(c.uid)));assertState(s);
});
test('optional outside removal draws only after selecting required cards',()=>{
 let s=game(['BLC-1-098']);power(s);
 const removed=get(s,'039');s.players[0].outside.push(removed);
 s=play(s,'BLC-1-098');assert.equal(s.pending.effect.kind,'removeOutside');
 s=choose(s,removed.uid);assert.equal(s.players[0].removed.length,1);assert.equal(s.players[0].hand.length,2);assertState(s);
});
test('enemy special event target upper limit adjusts for conditions',()=>{
 let s=game(['BLC-1-099']);power(s);
 put(s,'039',1,'front',0);const c=get(s,'BLC-1-099');s.players[0].hand.push(c);
 assert.ok(legalActions(s).some(a=>a.uid===c.uid));s=dispatch(s,{type:'play',uid:c.uid});assertState(s);
 assert.equal(s.pending.effect.rule.op,'destroy');
 s=choose(s,s.pending.choices[0].id);assert.equal(s.players[1].front[0],null);assertState(s);
});
test('several newly enabled profiles survive seeded complete bot games and card conservation',()=>{
 const picked=['BLC-1-003','BLC-1-031','BLC-1-095','BLC-2-015','BLC-2-033','BLC-2-051','BLC-2-063','BLC-3-005','BLC-4-009','BLC-4-011','BLC-4-064'];
 const counts={...PRESETS[0].counts};for(const id of picked){counts[id]=1;const old=Object.keys(counts).find(k=>!picked.includes(k)&&counts[k]>1);counts[old]--;}
 for(let seed=1;seed<=8;seed++){
  let s=newGame({decks:[counts,counts],seed,first:seed%2});let steps=0;
  while(s.status!=='finished'&&steps++<1300){const action=botAction(s);assert.ok(action,'bot must act');s=dispatch(s,action);assertState(s);}
  assert.equal(s.status,'finished',`seed ${seed}, steps ${steps}`);
 }
});
test('self-sacrifice can revive a matching card from outside in REST position',()=>{
 let s=game(['BLC-4-047']);const sac=put(s,'BLC-4-047',0,'front',0);
 const target=get(s,'039');s.players[0].outside.push(target);
 const action=legalActions(s).find(a=>a.type==='ability'&&a.uid===sac.uid);assert.ok(action);
 s=dispatch(s,action);assert.equal(s.players[0].front[0],null);
 assert.equal(s.pending?.effect.kind,'deployCard');assertState(s);
 s=choose(s,target.uid);assert.equal(s.pending.effect.kind,'deploySlot');assertState(s);
 s=choose(s,'front-2');assert.equal(s.players[0].front[2].uid,target.uid);assert.equal(s.players[0].front[2].ready,false);
 assert.ok(s.players[0].outside.some(c=>c.uid===sac.uid));assertState(s);
});
test('entry free-deployment of a no-trait blue character preserves rested state',()=>{
 let s=game(['BLC-2-024','BLC-2-020',...Array(4).fill('BLC-2-025')]);for(let i=0;i<4;i++)put(s,'BLC-2-025',0,'energy',i);
 const target=get(s,'BLC-2-020');s.players[0].hand.push(target);
 s.players[0].discardTurn=s.turn;
 s=play(s,'BLC-2-024','front',0);assert.equal(s.pending?.effect.kind,'deployCard');assertState(s);
 s=choose(s,target.uid);s=choose(s,'energy-0');assert.equal(s.players[0].energy[0].uid,target.uid);assert.equal(s.players[0].energy[0].ready,false);assertState(s);
});
test('mandatory and optional costs never put cards into limbo',()=>{
 let s=game(['BLC-1-028']);const c=put(s,'BLC-1-028',0,'energy',0);
 put(s,'039',0,'front',0);assertState(s);
 s=dispatch(s,{type:'ability',uid:c.uid});assert.equal(s.pending?.effect.kind,'ruleChoice');assertState(s);
 const victim=s.pending.choices[0].id;s=choose(s,victim);assert.ok(s.players[0].outside.some(c=>c.uid===victim));assertState(s);
 while(s.pending){s=choose(s,...(s.pending.effect.kind==='lookTake'?[]:[s.pending.choices[0].id]));assertState(s);}
});
test('six other Squad 13 cards enable discard-then-recover entry effect',()=>{
 let s=game(['BLC-2-069','BLC-1-080','BLC-1-081','BLC-1-083']);
 power(s);put(s,'BLC-1-080',0,'front',0);put(s,'BLC-1-081',0,'front',1);
 const outside=get(s,'BLC-1-083'),discard=get(s,'039');s.players[0].outside.push(outside);s.players[0].hand.push(discard);
 s=play(s,'BLC-2-069','front',2);assert.equal(s.pending?.effect.kind,'ruleChoice');assertState(s);
 s=choose(s,discard.uid);assert.equal(s.pending?.effect.kind,'recoverOutside');assertState(s);
 s=choose(s,outside.uid);assert.ok(s.players[0].hand.some(c=>c.uid===outside.uid));assertState(s);
});
