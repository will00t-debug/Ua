import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {fresh,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-030','REZ-2-026','REZ-2-020','REZ-2-014','REZ-2-017','REZ-2-056',
 'REZ-2-055','REZ-2-049','REZ-2-043','REZ-2-041','REZ-2-060','REZ-2-035','REZ-2-033'
],'REZ-2-033');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function purple(s,n=3){
 for(let i=0;i<n;i++)sit(s,0,'REZ-2-026','energy',i);
}
function playEchidna(s){
 const card=take(s,0,'REZ-2-030');
 s.players[0].hand.push(card);
 const play=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.ok(play);
 return dispatchUniversalAction(rezPacks,s,play);
}

test('REZ-2-030 bans a trait character and moves it, removing one card when the line is full',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-030'].effectJa,/アタックできない/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-030'].note,/Q2410/);
 let s=fresh(deck,3030);
 purple(s,3);
 const crusch=sit(s,0,'REZ-2-020','energy',3);
 const plain=sit(s,0,'REZ-2-014','front',0);
 s=toPhase(rezPacks,s,'main');
 s=playEchidna(s);
 assert.equal(s.pending.kind,'effect-trait-ban-move');
 const uids=s.pending.choices;
 const echidna=s.players[0].front.find(c=>c?.cardId==='REZ-2-030');
 assert.deepEqual(uids,[echidna.uid]);
 assert.equal(uids.includes(crusch.uid),false);
 assert.equal(uids.includes(plain.uid),false);
 const declined=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseTraitBanMove',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front.find(c=>c?.uid===echidna.uid).attackBanned,undefined);
 assert.equal(declined.players[0].front.find(c=>c?.uid===echidna.uid).entryTurn,declined.turn);
 const victim=s.players[0].energy[0];
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTraitBanMove',uid:echidna.uid});
 assert.equal(s.pending.kind,'effect-line-slot');
 assert.equal(s.pending.line,'energy');
 const replace=legalUniversalActions(rezPacks,s).find(a=>a.replaceUid===victim.uid);
 assert.ok(replace);
 s=dispatchUniversalAction(rezPacks,s,replace);
 const moved=s.players[0].energy.find(c=>c?.uid===echidna.uid);
 assert.equal(moved.attackBanned.turn,s.turn);
 assert.equal(moved.attackBanned.stamp,moved.fieldEntryStamp);
 assert.ok(s.players[0].removed.some(c=>c.uid===victim.uid));
 const empty=s.players[0].front.findIndex(c=>c===null);
 s.players[0].energy[s.players[0].energy.findIndex(c=>c?.uid===echidna.uid)]=null;
 s.players[0].front[empty]=moved;
 moved.ready=true;
 s=toPhase(rezPacks,s,'attack');
 const attacks=legalUniversalActions(rezPacks,s).filter(a=>a.type==='attack').map(a=>a.uid);
 assert.equal(attacks.includes(echidna.uid),false);
 assert.ok(attacks.includes(plain.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-030 rests one front character only on her entry turn, then buffs or lowers BP',()=>{
 let s=fresh(deck,3032);
 purple(s,3);
 const ally=s.players[0].energy[0];
 const ready=sit(s,0,'REZ-2-014','front',0);
 const big=sit(s,1,'REZ-2-056','front',0);
 const small=sit(s,1,'REZ-2-017','front',1);
 s=toPhase(rezPacks,s,'main');
 s=playEchidna(s);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTraitBanMove',uid:null});
 const echidna=s.players[0].front.find(c=>c?.cardId==='REZ-2-030');
 assert.equal(echidna.entryTurn,s.turn);
 assert.equal(echidna.ready,false);
 const act=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='activate'&&a.mode==='entryRestFront'&&a.uid===echidna.uid);
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act);
 assert.equal(s.pending.kind,'effect-entry-rest-front');
 assert.deepEqual(s.pending.choices,[ready.uid]);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEntryRest',uid:ready.uid});
 assert.equal(s.players[0].front.find(c=>c?.uid===ready.uid).ready,false);
 assert.deepEqual(s.pending.options.map(o=>o.id),['down','up']);
 const up=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseEffectMode',mode:'up'});
 assert.equal(up.pending.kind,'effect-buff-own');
 assert.equal(up.pending.choices.includes(echidna.uid),false);
 assert.ok(up.pending.choices.includes(ally.uid));
 const raised=dispatchUniversalAction(rezPacks,up,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(rezPacks,raised,raised.players[0].energy.find(c=>c?.uid===ally.uid)),3500);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'down'});
 assert.equal(s.pending.kind,'effect-target');
 const aimed=legalUniversalActions(rezPacks,s);
 assert.ok(aimed.some(a=>a.uid===big.uid));
 assert.equal(aimed.some(a=>a.uid===small.uid),false);
 assert.ok(aimed.some(a=>a.uid===null));
 s=dispatchUniversalAction(rezPacks,s,aimed.find(a=>a.uid===big.uid));
 assert.equal(universalBp(rezPacks,s,s.players[1].front.find(c=>c?.uid===big.uid)),1000);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='entryRestFront'),false);
 const forged=structuredClone(s);
 const piles=['hand','deck','life','outside'];
 let traitless=null;
 for(const zone of piles){
  const pile=forged.players[0][zone];
  const index=pile.findIndex(c=>c.cardId==='REZ-2-014');
  if(index>=0){traitless=pile.splice(index,1)[0];break;}
 }
 assert.ok(traitless);
 forged.players[0].front[1]=traitless;
 traitless.ready=true;traitless.fieldEntryStamp=forged.nextFieldEntryStamp++;
 traitless.attackBanned={turn:forged.turn,stamp:traitless.fieldEntryStamp,
  sourceUid:echidna.uid};
 assert.throws(()=>assertUniversalMatch(rezPacks,forged),/Forged this-turn attack ban/);
 let guard=0;
 while(!(s.active===0&&s.players[0].ownTurns===2&&s.phase==='main')){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>12)throw Error('Did not reach the next main');
 }
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='entryRestFront'),false);
 assert.throws(()=>createUniversalPack({id:'bad-030',cards:[{
  id:'X',name:'エキドナ',color:'purple',type:'character',energy:3,ap:1,bp:3000,gen:2,
  traits:['魔女'],trigger:'draw',implementation:'dsl',effects:{onPlay:[
   {op:'banAttackMoveOtherLine',optional:true,extra:1}]}
 }]}),/trait attack-ban|line move/);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
