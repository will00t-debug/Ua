import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';

// UA01DC/BLC-4-083, when raided, can make one 朽木 ルキア unable to be blocked
// by BP 4000+ for the rest of the turn. Seed 100423 of the v4-A round-1
// champion challenge (white-sword seat 1, first player, versus Hard Search 2
// 戀露) retired that Raid with a life SPECIAL. The ceiling stayed on the other
// Rukia and the match check called it forged. This seed is a regression of
// that finished experiment. It is already in the round-1 ledger and is not a
// new blind validation set.

const pack=createBleachV2Pack();
const packs=[pack,pack];
const counts=designatedPlayableCounts(summarizeDesignatedDecks(id=>!!pack.cards[id]).find(row=>row.key==='renruki'));

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone];
  const index=list.findIndex(card=>card.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function actorOf(s){return s.pending?.player??s.active;}
function play(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,'missing legal action; pending '+(s.pending?.kind||s.phase));
 const next=dispatchUniversalAction(packs,s,action,{actor:actorOf(s)});
 assert.equal(assertUniversalMatch(packs,next),true);
 return next;
}
function phase(s,target){
 for(let i=0;i<8&&s.phase!==target;i++)s=play(s,action=>action.type==='next');
 assert.equal(s.phase,target);
 return s;
}
function sit(s,card,ready=true){
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 return card;
}
function place(s,p,id,line,slot,ready=true){
 const card=sit(s,take(s,p,id),ready);
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function readyAp(s,p,n){
 for(let i=0;i<3;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function fuel(s){
 for(let i=0;i<4;i++)place(s,0,'BLC-1-039','energy',i);
}

test('BLC-4-083 ceiling survives SPECIAL retirement of the raided stack',()=>{
 let s=phase(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:4083}),'main');
 fuel(s);
 readyAp(s,0,1);
 const base=place(s,0,'BLC-4-083','front',0);
 const granted=place(s,0,'BLC-4-054','front',1);
 const top=hold(s,0,'BLC-1-053');
 s=play(s,action=>action.type==='raid'&&action.uid===top.uid&&action.baseUid===base.uid);
 assert.equal(s.pending.kind,'raid-effect-order');
 s=play(s,action=>action.type==='chooseRaidOrder'&&action.mode==='baseFirst');
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=play(s,action=>action.type==='chooseEffectMode'&&action.mode==='block');
 s=play(s,action=>action.type==='chooseGrantBlockAtLeast'&&action.uid===granted.uid);
 const liveGrant=()=>[...s.players[0].front,...s.players[0].energy].find(card=>card?.uid===granted.uid);
 assert.equal(liveGrant().blockAtLeastGranted.bp,4000);
 assert.equal(s.pending.kind,'effect-discard');
 s=play(s,action=>action.type==='chooseDiscard'&&action.uid===s.players[0].hand[0].uid);
 s=play(s,action=>action.type==='chooseDiscard'&&action.uid===s.players[0].hand[0].uid);
 assert.equal(s.pending,null);
 const special=take(s,1,'BLC-4-058');
 s.players[1].life.unshift(special);
 const wall=place(s,1,'BLC-4-050','front',0);
 const small=place(s,1,'BLC-4-048','front',1);
 s=phase(s,'attack');
 const raidTop=s.players[0].front[0];
 s=play(s,action=>action.type==='attack'&&action.uid===raidTop.uid);
 s=play(s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(s.pending?.kind==='attack-life-target')s=play(s,action=>action.type==='chooseAttackLife');
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 s=play(s,action=>action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===raidTop.uid);
 assert.equal(s.players[0].front.some(card=>card?.uid===raidTop.uid),false);
 assert.ok(s.players[0].outside.some(card=>card.uid===base.uid));
 assert.equal(liveGrant().blockAtLeastGranted.bp,4000);
 assert.equal(liveGrant().blockAtLeastGranted.turn,s.turn);
 assert.equal(assertUniversalMatch(packs,s),true);
 liveGrant().ready=true;
 s=play(s,action=>action.type==='attack'&&action.uid===granted.uid);
 const blocks=legalUniversalActions(packs,s).filter(action=>action.type==='chooseBlock').map(action=>action.uid);
 assert.equal(blocks.includes(wall.uid),false);
 assert.equal(blocks.includes(small.uid),true);
 assert.equal(blocks.includes(null),true);
});

test('a Rukia ceiling is forged when BLC-4-083 was not raided this turn',()=>{
 let s=phase(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:4084}),'main');
 const rukia=place(s,0,'BLC-4-054','front',0);
 const base=take(s,0,'BLC-4-083');
 s.players[0].outside.push(base);
 rukia.blockAtLeastGranted={turn:s.turn,stamp:rukia.fieldEntryStamp,bp:4000};
 assert.throws(()=>assertUniversalMatch(packs,s),/Forged blocker ceiling/);
});

test('seed 100423 white-sword seat 1 going first no longer stops on the ceiling',()=>{
 const model=loadModel(new URL('../training/white-sword-ai/weights/v2-capped.json',import.meta.url));
 const seats=[null,null];
 seats[1]={deckId:'white-sword',policy:'white-sword',model,mode:'blend',scale:6,hardCap:7,explore:0};
 seats[0]={deckId:'renruki',policy:'hard-search-2',model:null,mode:'policy',explore:0,scale:0};
 const game=playGame({
  seed:100423,first:1,specialistSeat:1,opponentDeck:'renruki',label:'regression-100423',
  seats,keepActions:false
 });
 assert.equal(game.anomalies.engineError,0);
 assert.equal(game.error,null);
 assert.equal(game.status,'finished');
 assert.equal(game.anomalies.illegal,0);
 assert.equal(game.anomalies.leak,0);
});
