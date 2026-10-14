import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,BY_ID} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,assertState} from '../dist/engine.mjs';

// Official EX07BT/BLC-2-065 card image: all three protections are inside
// the Raid box (Q51). Q1052: resistance to REST does not prevent a ready lock.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT/BLC-2-065
// Controlled card identities preserve all 50 physical UIDs in both decks.
function take(s,p,id){const c=s.players[p].deck.shift();c.cardId=id;return c;}
function put(s,p,id,slot=0,line='front'){
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;return c;
}
function boost(s,p,id){
 const d=BY_ID[id],provider=CARDS.find(x=>x.type==='character'&&!x.raid&&x.gen&&x.color===d.color);
 const c=put(s,p,provider.id,0,'energy');c.energyBoostTurn=s.turn;c.energyBoostAmount=12;
}
function play(s,p,id,{raid=false,slot=0}={}){
 boost(s,p,id);const top=take(s,p,id);s.players[p].hand.push(top);
 let base;
 if(raid){
  const d=BY_ID[id],profile=CARDS.find(x=>!x.raid&&x.type==='character'&&(x.name===d.name||x.nameJa===d.nameJa));
  assert.ok(profile,'legal same-name base');base=put(s,p,profile.id,slot);
 }
 const a=legalActions(s).find(a=>a.type===(raid?'raid':'play')&&a.uid===top.uid&&(BY_ID[id].type==='event'||a.line==='front'&&a.slot===slot)&&(!raid||a.target===base.uid));
 assert.ok(a,'legal deployment '+id);
 return {s:dispatch(s,a),uid:top.uid,baseUid:base?.uid};
}
function setup(mode){
 let s=newGame({seed:1052,first:0,mode:'hotseat'});
 s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const p of s.players){p.deck.push(...p.hand,...p.life);p.hand=[];p.life=[];p.front.fill(null);p.energy.fill(null);p.ap=3;p.maxAp=3;p.turnCount=3;}
 s.active=1;s.phase='main';s.turn=10;s.queue=[];s.pending=null;
 const result=play(s,1,'BLC-2-065',{raid:mode!=='normal'});s=result.s;
 assert.equal(s.players[1].hand.length,mode==='normal'?0:2,'Raid-only entry draw');
 const target=s.players[1].front[0];target.ready=true;
 if(mode==='silenced')target.silencedUntilSource={p:0,turnCount:5};
 s.active=0;s.players[0].ap=3;assertState(s);
 return {...result,s};
}
const choose=(s,uid)=>dispatch(s,{type:'choose',ids:[uid]});
for(const mode of ['normal','raid','silenced']){
 test('Komamura '+mode+': opponent REST protection follows the active Raid box',()=>{
  let {s,uid}=setup(mode);
  s=play(s,0,'BLC-1-031').s;
  s=choose(s,uid);
  assert.equal(s.players[1].front[0].ready,mode==='raid');assertState(s);
 });
 test('Komamura '+mode+': opponent return-to-hand protection follows the active Raid box',()=>{
  let {s,uid,baseUid}=setup(mode);
  s=play(s,0,'BLC-2-018').s;s=choose(s,uid);
  assert.equal(s.players[1].front[0]?.uid===uid,mode==='raid');
  assert.equal(s.players[1].hand.some(c=>c.uid===uid),mode!=='raid');
  if(mode==='silenced')assert.ok(s.players[1].outside.some(c=>c.uid===baseUid),'base goes outside, not hand');
  assertState(s);
 });
 test('Komamura '+mode+': freeze still applies its next-ACTIVE restriction',()=>{
  let {s,uid}=setup(mode);
  s=play(s,0,'BLC-1-096').s;s=choose(s,uid);
  assert.equal(s.players[1].front[0].ready,mode==='raid');
  assert.equal(s.players[1].front[0].skipActive,1);assertState(s);
 });
}
for(const mode of ['normal','raid']){
 test('Komamura '+mode+': actual blocking only cancels IMPACT while raided',()=>{
  let {s,uid}=setup(mode);
  const attacker=put(s,0,'BLC-1-004');attacker.stack=[take(s,0,'BLC-1-002')];
  attacker.buffs.push({turn:s.turn,bp:5000});s.phase='attack';
  s.players[1].life.push(...Array.from({length:3},()=>take(s,1,'BLC-1-001')));
  s=dispatch(s,{type:'attack',uid:attacker.uid});s=choose(s,uid);
  assert.equal(s.players[1].life.length,mode==='raid'?3:2);
  assert.ok(s.players[1].outside.some(c=>c.uid===uid));assertState(s);
 });
 test('Komamura '+mode+': Toshiro lock survives resistance to REST (Q1052/Q569)',()=>{
  let {s,uid}=setup(mode);
  s=play(s,0,'BLC-1-085',{raid:true}).s;s=choose(s,uid);
  assert.equal(s.players[1].front[0].ready,mode==='raid');
  assert.equal(s.players[1].front[0].freezeUntilAttackOwner,1);assertState(s);
 });
 test('Komamura '+mode+': Rukia lock survives resistance to REST',()=>{
  let {s,uid}=setup(mode);
  const ap2=CARDS.find(c=>c.type==='character'&&!c.raid&&c.ap>=2);
  put(s,0,ap2.id,1);
  const result=play(s,0,'BLC-2-034',{raid:true});s=choose(result.s,uid);
  assert.equal(s.players[1].front[0].ready,mode==='raid');
  assert.equal(s.players[1].front[0].lockedBy,result.uid);assertState(s);
 });
}
test('Komamura: silencing printed effects suppresses next-turn top removal',()=>{
 let {s,uid,baseUid}=setup('silenced');s.phase='attack';
 s=dispatch(s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(s.players[1].front[0].uid,uid);
 assert.equal(s.players[1].front[0].stack[0].uid,baseUid);assertState(s);
});
