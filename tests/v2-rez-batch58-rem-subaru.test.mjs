import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {fresh,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-018','REZ-2-017','REZ-2-014','REZ-2-020','REZ-2-056','REZ-2-022',
 'REZ-2-055','REZ-2-049','REZ-2-043','REZ-2-041','REZ-2-060','REZ-2-035','REZ-2-033'
],'REZ-2-033');
const kept=new Set(['REZ-2-018','REZ-2-017','REZ-2-014','REZ-2-020','REZ-2-056']);

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function blue(s){
 sit(s,0,'REZ-2-017','energy',0);
 sit(s,0,'REZ-2-017','energy',1);
 sit(s,0,'REZ-2-017','energy',2);
}
function playRem(s){
 const rem=take(s,0,'REZ-2-018');
 s.players[0].hand.push(rem);
 const play=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='play'&&a.uid===rem.uid&&a.line==='front');
 assert.ok(play);
 return dispatchUniversalAction(rezPacks,s,play);
}
function modes(s){
 assert.equal(s.pending.kind,'effect-choice-mode');
 return s.pending.options.map(o=>o.id);
}

test('REZ-2-018 rests a zero-energy blue Subaru and retires that entry at main end',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-018'].effectJa,/メインフェイズ終了時/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-018'].effectJa,/バトルに敗北した時/);
 let s=fresh(deck,3018);
 blue(s);
 const subaru=take(s,0,'REZ-2-014');
 const crusch=take(s,0,'REZ-2-020');
 const purple=take(s,0,'REZ-2-022');
 s.players[0].outside.push(subaru,crusch,purple);
 s=toPhase(rezPacks,s,'main');
 s=playRem(s);
 assert.deepEqual(modes(s),['enter','lose']);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'enter'});
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.ok(s.mainReadyOnceByName[0].includes('レム|enter'));
 const offered=legalUniversalActions(rezPacks,s);
 assert.equal(offered.some(a=>a.uid===crusch.uid||a.uid===purple.uid),false);
 assert.ok(offered.some(a=>a.uid===subaru.uid&&a.line==='front'));
 assert.ok(offered.some(a=>a.uid===subaru.uid&&a.line==='energy'));
 assert.ok(offered.some(a=>a.uid===null));
 const declined=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseOutsideNameRest',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.delayedEffects.length,0);
 assert.ok(declined.players[0].outside.some(c=>c.uid===subaru.uid));
 assert.ok(declined.mainReadyOnceByName[0].includes('レム|enter'));
 const onto=offered.find(a=>a.uid===subaru.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,onto);
 const seated=s.players[0].front.find(c=>c?.uid===subaru.uid);
 assert.equal(seated.ready,false);
 assert.equal(s.pending,null);
 assert.equal(s.delayedEffects.some(e=>e.op==='retireAtMainEnd'&&
  e.sourceUid===subaru.uid&&e.fieldEntryStamp===seated.fieldEntryStamp),true);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(rezPacks,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.uid===subaru.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===subaru.uid));
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-018 shares the Rem lock and a lost battle readies Subaru in place',()=>{
 let s=newUniversalMatch(rezPacks,{decks:[deck,deck],seed:3020,first:0});
 let guard=0;
 while(!(s.active===0&&s.players[0].ownTurns===3&&s.phase==='main')){
  if(s.status!=='playing')throw Error(s.endReason||'finished');
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand;
   const victim=hand.find(c=>!kept.has(c.cardId));
   assert.ok(victim);
   s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandLimit',uid:victim.uid});
  }else if(s.pending)throw Error('Pending '+s.pending.kind);
  else s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>40)throw Error('Did not reach the third main');
 }
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,3);
 blue(s);
 s=playRem(s);
 assert.deepEqual(modes(s),['enter','lose']);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'enter'});
 assert.equal(s.pending,null);
 assert.deepEqual(s.mainReadyOnceByName[0],['レム|enter']);
 s=playRem(s);
 assert.deepEqual(modes(s),['lose']);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'lose'});
 assert.equal(s.pending,null);
 assert.ok(s.mainReadyOnceByName[0].includes('レム|lose'));
 s=playRem(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.filter(c=>c?.cardId==='REZ-2-018').length,3);

 let lost=fresh(deck,3021);
 blue(lost);
 const subaru=sit(lost,0,'REZ-2-014','front',0);
 const purple=sit(lost,0,'REZ-2-022','front',1);
 const wall=sit(lost,1,'REZ-2-056','front',0);
 lost=toPhase(rezPacks,lost,'main');
 lost=playRem(lost);
 lost=dispatchUniversalAction(rezPacks,lost,{type:'chooseEffectMode',mode:'lose'});
 assert.equal(lost.pending.kind,'effect-grant-lose-ready');
 const choices=legalUniversalActions(rezPacks,lost);
 assert.equal(choices.some(a=>a.uid===purple.uid),false);
 assert.ok(choices.some(a=>a.uid===null));
 lost=dispatchUniversalAction(rezPacks,lost,choices.find(a=>a.uid===subaru.uid));
 const granted=lost.players[0].front.find(c=>c?.uid===subaru.uid);
 assert.equal(granted.loseBattleReady.turn,lost.turn);
 assert.equal(granted.loseBattleReady.stamp,granted.fieldEntryStamp);
 assert.equal(granted.loseBattleReady.used,undefined);
 const forged=structuredClone(lost);
 const other=forged.players[0].energy.find(c=>c?.cardId==='REZ-2-017');
 other.loseBattleReady={turn:forged.turn,stamp:other.fieldEntryStamp,
  sourceUid:granted.loseBattleReady.sourceUid};
 assert.throws(()=>assertUniversalMatch(rezPacks,forged),/Forged lose-battle ready/);
 lost=toPhase(rezPacks,lost,'attack');
 const life=lost.players[1].life.length;
 lost=dispatchUniversalAction(rezPacks,lost,{type:'attack',uid:subaru.uid});
 lost=dispatchUniversalAction(rezPacks,lost,{type:'chooseBlock',uid:wall.uid});
 assert.equal(lost.pending,null);
 const stayed=lost.players[0].front.find(c=>c?.uid===subaru.uid);
 assert.ok(stayed);
 assert.equal(stayed.ready,true);
 assert.equal(stayed.loseBattleReady.used,true);
 assert.equal(lost.players[0].outside.some(c=>c.uid===subaru.uid),false);
 assert.equal(lost.players[1].front[0].uid,wall.uid);
 assert.equal(lost.players[1].front[0].ready,false);
 assert.equal(lost.players[1].life.length,life);
 assert.equal(assertUniversalMatch(rezPacks,lost),true);
 assert.throws(()=>createUniversalPack({id:'bad-018',cards:[{
  id:'X',name:'レム',color:'blue',type:'character',energy:3,ap:1,bp:3000,gen:2,
  trigger:null,implementation:'dsl',effects:{onPlay:[
   {op:'chooseOne',optional:false,nameLock:'レム',options:[
    {id:'enter',label:'enter',turn:'any',then:[
     {op:'deployOutsideNamedRestRetireEnd',name:'ナツキ・スバル',color:'blue',
      maxEnergy:0,optional:true}]},
    {id:'lose',label:'lose',turn:'any',then:[
     {op:'grantNamedLoseBattleReady',name:'ナツキ・スバル',color:'blue',
      maxEnergy:1,optional:true}]}]}]}
 }]}),/Subaru|zero-energy/);
});
