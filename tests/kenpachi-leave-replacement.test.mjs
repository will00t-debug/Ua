import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,BY_ID,CARDS} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,bp,damageOf,assertState} from '../dist/engine.mjs';

// EX07BT/BLC-2-067: replacement covers leaving by opponent effect, including
// return to hand, not just retirement. Q1054–1057 preserve the base/state only.
// EX15BT/BLC-4-057 Q2330/Q2332: printed continuous effects cease, resolved
// temporary +1000/DAMAGE 2 remain. Both official detail_iframe pages checked.
const needed=['BLC-2-067','BLC-1-080','BLC-2-066','BLC-1-075','BLC-2-018','BLC-4-053','BLC-4-057','BLC-4-078','BLC-1-001'];
function take(s,p,id){const deck=s.players[p].deck,i=deck.findIndex(c=>c.cardId===id);assert.ok(i>=0,id);return deck.splice(i,1)[0];}
function choose(s,uid){return dispatch(s,{type:'choose',ids:[uid]});}
function fixture({baseId='BLC-1-080',normal=false,ready=true,emptyHand=false}={}){
 const deck={...PRESETS[0].counts};
 for(const id of needed){
  if(deck[id])continue;
  const donor=Object.keys(deck).find(k=>deck[k]>0&&!needed.includes(k));deck[donor]--;deck[id]=1;
 }
 let s=newGame({seed:1057,first:0,mode:'hotseat',decks:[deck,deck]});
 s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const p of s.players){p.deck.push(...p.hand,...p.life);p.hand=[];p.life=[];p.ap=3;p.maxAp=3;p.turnCount=3;}
 s.phase='main';s.turn=5;s.active=0;s.queue=[];s.pending=null;
 const energy=take(s,0,'BLC-1-075');energy.energyBoostTurn=s.turn;energy.energyBoostAmount=12;s.players[0].energy[0]=energy;
 const base=normal?null:take(s,0,baseId);if(base)s.players[0].front[0]=base;
 const top=take(s,0,'BLC-2-067');s.players[0].hand.push(top);
 const a=legalActions(s).find(a=>a.type===(normal?'play':'raid')&&a.uid===top.uid&&a.line==='front'&&a.slot===0&&(!base||a.target===base.uid));
 assert.ok(a);s=dispatch(s,a);const entryState=structuredClone(s);
 // Pass through the real turn boundary so entry-only BP/DAMAGE expires.
 s.phase='attack';s=dispatch(s,{type:'next'});assert.equal(s.active,1);s.phase='main';
 s.players[0].front[0].ready=ready;
 const payment=emptyHand?null:take(s,0,'BLC-1-001');if(payment)s.players[0].hand.push(payment);
 assertState(s);return {s,top,base,payment,entryState};
}
function playEnemy(s,id){
 // Controlled color-energy source; keep its UID and don't replace any card.
 let power=s.players[1].energy[0];
 if(!power){power=s.players[1].deck.shift();s.players[1].energy[0]=power;}
 power.cardId=CARDS.find(c=>c.type==='character'&&!c.raid&&c.gen>0&&c.color===BY_ID[id].color).id;
 power.energyBoostTurn=s.turn;power.energyBoostAmount=12;
 const c=take(s,1,id);s.players[1].hand.push(c);
 const a=legalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&(BY_ID[id].type==='event'||a.line==='front'&&a.slot===1));
 assert.ok(a,'legal '+id);return dispatch(s,a);
}
for(const ready of [false,true]){
 test('Kenpachi Q1054–1057: accept bounce replacement; base inherits '+(ready?'ACTIVE':'REST'),()=>{
  let {s,top,base,payment}=fixture({ready});
  s=choose(playEnemy(s,'BLC-2-018'),top.uid);
  assert.equal(s.pending?.effect.kind,'raidShield');assert.equal(s.pending.player,0);
  const snapshot=structuredClone(s);
  assert.throws(()=>choose(s,base.uid));assert.deepEqual(s,snapshot,'invalid payment cannot mutate state');
  s=choose(s,payment.uid);
  const left=s.players[0].front[0];assert.equal(left.uid,base.uid);assert.equal(left.ready,ready);
  assert.equal(left.stack.length,0);assert.equal(left.buffs.length,0);assert.equal(damageOf(s,left),1);
  assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));assert.ok(s.players[0].outside.some(c=>c.uid===payment.uid));
  assert.equal(s.players[0].hand.length,0);assert.equal(s.pending,null);assertState(s);
 });
}
test('Kenpachi: decline bounce returns top to hand and base to outside without paying',()=>{
 let {s,top,base,payment}=fixture();s=choose(playEnemy(s,'BLC-2-018'),top.uid);
 assert.equal(s.pending?.effect.kind,'raidShield');s=choose(s,'decline');
 assert.equal(s.players[0].front[0],null);
 assert.ok(s.players[0].hand.some(c=>c.uid===top.uid));assert.ok(s.players[0].hand.some(c=>c.uid===payment.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===base.uid));assertState(s);
});
for(const options of [{normal:true},{baseId:'BLC-2-066'},{emptyHand:true}]){
 test('Kenpachi: no bounce replacement when '+JSON.stringify(options),()=>{
  let {s,top}=fixture(options);s=choose(playEnemy(s,'BLC-2-018'),top.uid);
  assert.equal(s.pending,null);assert.equal(s.players[0].front[0],null);
  assert.ok(s.players[0].hand.some(c=>c.uid===top.uid));assertState(s);
 });
}
test('Kenpachi Q2330: actual silence event permits subsequent BP reduction',()=>{
 let {s,top}=fixture();s=choose(playEnemy(s,'BLC-4-057'),top.uid);
 assert.equal(s.players[0].front[0].stack.length,1);
 s=choose(playEnemy(s,'BLC-4-053'),top.uid);
 assert.equal(bp(s,s.players[0].front[0]),3000);assertState(s);
});
test('Kenpachi: un-silenced Raid still resists BP reduction',()=>{
 let {s,top}=fixture();s=choose(playEnemy(s,'BLC-4-053'),top.uid);
 assert.equal(bp(s,s.players[0].front[0]),4000);assertState(s);
});
test('Kenpachi Q2330: actual silence disables replacement against destruction',()=>{
 let {s,top,base,payment}=fixture();s=choose(playEnemy(s,'BLC-4-057'),top.uid);
 s=choose(playEnemy(s,'BLC-4-078'),top.uid);
 assert.equal(s.pending,null);assert.equal(s.players[0].front[0],null);
 for(const c of [top,base])assert.ok(s.players[0].outside.some(x=>x.uid===c.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===payment.uid));assertState(s);
});
test('Kenpachi Q2332: already-resolved entry bonus survives text loss',()=>{
 const {entryState:s}=fixture();const c=s.players[0].front[0];
 // Controlled text-loss state applied after actual Raid entry has resolved.
 c.silencedUntilSource={p:1,turnCount:s.players[1].turnCount+1};
 assert.equal(bp(s,c),5000);assert.equal(damageOf(s,c),2);assertState(s);
});
