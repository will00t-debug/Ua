import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,BY_ID} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,assertState} from '../dist/engine.mjs';

// Q51 baseline: every printed Raid character can be played without a Raid base
// (its Raid box stays inactive), and can be actually Raided over an eligible base.
// These are physical gameplay tests; they do NOT replace individual official
// card text/FAQ timing acceptance.
const raidCards=CARDS.filter(c=>c.type==='character'&&c.raid);
const norm=s=>String(s||'').replaceAll(/\s/g,'');
const matchingBase=raid=>CARDS.find(c=>c.type==='character'&&!c.raid&&(
 norm(raid.raid)===norm(c.key)||
 norm(raid.raid)===norm(c.nameJa)||
 norm(raid.raid)===norm(c.name)||
 norm(raid.raid)===norm(c.rules?.alsoName)
));
function fixture(id){
 let s=newGame({seed:40151,mode:'hotseat',first:0});
 s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){
  pl.deck.push(...pl.hand,...pl.life);pl.hand=[];pl.life=[];
  pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;
 }
 s.active=0;s.phase='main';s.turn=10;s.pending=null;s.queue=[];
 // Preserve every physical UID/card while changing print IDs for an isolated
 // board. Rules see real original energy costs, not a fake value.
 function take(cardId){const c=s.players[0].deck.shift();assert.ok(c,'fixture deck empty');c.cardId=cardId;return c;}
 const d=BY_ID[id];
 const energySource=CARDS.find(c=>c.type==='character'&&!c.raid&&c.color===d.color);
 assert.ok(energySource,'missing colour energy source: '+id);
 const source=take(energySource.id);source.ready=true;source.energyBoostTurn=s.turn;source.energyBoostAmount=30;
 s.players[0].energy[0]=source;
 return {s,take};
}
test('Raid physical inventory includes all 24 BLEACH printed Raid cards',()=>assert.equal(raidCards.length,24));
for(const raid of raidCards){
 test('Q51 normal + physical Raid: '+raid.id,()=>{
  const base=matchingBase(raid);
  assert.ok(base,'no same-name unraided base identified for '+raid.id+' / '+raid.raid);
  let {s,take}=fixture(raid.id);
  let card=take(raid.id);s.players[0].hand.push(card);
  const normal=legalActions(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===(raid.rules?.energyOnly?'energy':'front')&&a.slot===1);
  assert.ok(normal,'no normal play option: '+raid.id);
  let normalState=dispatch(s,normal);
  let deployed=normalState.players[0][normal.line][normal.slot];
  assert.equal(deployed.uid,card.uid);
  assert.equal(deployed.stack.length,0,'normal play must not create Raid pile');
  assert.equal(deployed.ready,false,'normal play cannot gain automatic Raid ACTIVE');
  assertState(normalState);
  // Use a fresh legal state for actual Raid on the printed matching base.
  ({s,take}=fixture(raid.id));
  const bottom=take(base.id);bottom.ready=false;
  const baseLine=raid.rules?.energyOnly?'energy':'front';
  const baseSlot=1;
  s.players[0][baseLine][baseSlot]=bottom;
  card=take(raid.id);s.players[0].hand.push(card);
  const action=legalActions(s).find(a=>a.type==='raid'&&a.uid===card.uid&&a.target===bottom.uid&&a.line===baseLine&&a.slot===baseSlot);
  assert.ok(action,'no matching real Raid option for '+raid.id+' on '+base.id);
  const next=dispatch(s,action);
  const top=next.players[0][baseLine][baseSlot];
  assert.equal(top.uid,card.uid);
  assert.ok(top.stack.some(x=>x.uid===bottom.uid),'real Raid must attach bottom card');
  assert.equal(top.ready,true,'real Raid must start ACTIVE');
  assertState(next);
 });
}
