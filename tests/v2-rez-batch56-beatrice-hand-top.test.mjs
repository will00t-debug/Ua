import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,effectiveHandRequiredEnergy,
 legalUniversalActions,universalBp,universalEnergyByColor,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-024','REZ-2-055','REZ-2-014','REZ-2-066','REZ-2-049','REZ-2-043',
 'REZ-2-041','REZ-2-060','REZ-2-035','REZ-2-033','REZ-2-050','REZ-2-042','REZ-2-056'
],'REZ-2-055');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function readyAp(s,p){return s.players[p].apCards.filter(c=>c.inPlay&&c.ready);}

test('REZ-2-024 reduces purple energy by 2 only while the field is empty',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-024'].effectJa,/必要エナジーを\[紫×2\]減らす/);
 assert.equal(rez.cards['REZ-2-024'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(rez.cards['REZ-2-024'].color,'purple');
 let s=fresh(deck,2024);
 const beatrice=take(s,0,'REZ-2-024');
 s.players[0].hand.push(beatrice);
 s=toPhase(rezPacks,s,'main');
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-024']),0);
 const play=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='play'&&a.uid===beatrice.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(s.players[0].front[0].uid,beatrice.uid);
 assert.equal(readyAp(s,0).length,0);
 const second=take(s,0,'REZ-2-024');
 s.players[0].hand.push(second);
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-024']),2);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='play'&&a.uid===second.uid),false);
 let occupied=fresh(deck,2025);
 const green=sit(occupied,0,'REZ-2-066','energy',0);
 const held=take(occupied,0,'REZ-2-024');
 occupied.players[0].hand.push(held);
 occupied=toPhase(rezPacks,occupied,'main');
 assert.equal(universalEnergyByColor(rezPacks,occupied,0).green,2);
 assert.equal(universalEnergyByColor(rezPacks,occupied,0).purple||0,0);
 assert.equal(effectiveHandRequiredEnergy(rezPacks,occupied,0,rez.cards['REZ-2-024']),2);
 assert.equal(legalUniversalActions(rezPacks,occupied).some(a=>a.type==='play'&&a.uid===held.uid),false);
 assert.equal(green.cardId,'REZ-2-066');
});

test('REZ-2-024 pays 1 AP, tops one hand card, then buffs and readies an AP',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-024'].effectJa,/山札の上に置く/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-024'].effectJa,/アタックフェイズ開始時/);
 let s=fresh(deck,2026);
 const beatrice=sit(s,0,'REZ-2-024','front',0);
 const energyCopy=sit(s,0,'REZ-2-024','energy',1);
 const topped=take(s,0,'REZ-2-055');
 const kept=take(s,0,'REZ-2-056');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(topped,kept);
 s=toPhase(rezPacks,s,'main');
 assert.equal(readyAp(s,0).length,1);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>
  a.type==='activate'&&a.uid===energyCopy.uid&&a.mode==='handTopBuff'));
 const reveals=s.publicReveals.length;
 const previousTop=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'activate',uid:beatrice.uid,mode:'handTopBuff'},{actor:0});
 assert.equal(readyAp(s,0).length,0);
 assert.equal(s.pending.kind,'effect-hand-top');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.uid===null),false);
 const shown=universalPrivateChoices(rezPacks,s,0);
 assert.deepEqual(shown.options.map(o=>o.card.cardId).sort(),['REZ-2-055','REZ-2-056']);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandTop',uid:topped.uid},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,topped.uid);
 assert.equal(s.players[0].deck[1].uid,previousTop);
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(s.players[0].hand.map(c=>c.uid).includes(topped.uid),false);
 assert.equal(universalBp(rezPacks,s,s.players[0].front[0]),4000);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='handTopBuff'),false);
 const opposing=structuredClone(s);opposing.active=1;
 assert.equal(universalBp(rezPacks,opposing,opposing.players[0].front[0]),4000);
 s=dispatchUniversalAction(rezPacks,s,{type:'next'},{actor:0});
 assert.equal(s.phase,'attack');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.optional,false);
 const recovery=legalUniversalActions(rezPacks,s);
 assert.equal(recovery.some(a=>a.uid===null),false);
 assert.equal(recovery.length,1);
 assert.throws(()=>dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseApRecovery',uid:null},{actor:0}),/not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,recovery[0],{actor:0});
 assert.equal(s.pending,null);
 assert.equal(readyAp(s,0).length,1);
 let guard=0;
 while(!(s.active===0&&s.phase==='main'&&s.players[0].ownTurns>=2)){
  if(s.pending?.kind==='end-hand-limit'){
   s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
  }else if(s.pending)throw Error('Unexpected pending '+s.pending.kind);
  else s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>24)throw Error('Did not return to Beatrice');
 }
 assert.equal(universalBp(rezPacks,s,s.players[0].front.find(c=>c?.uid===beatrice.uid)),2000);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.uid===beatrice.uid&&a.mode==='handTopBuff'));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-024 cannot pay the main without a hand card, and the profile is closed',()=>{
 let s=fresh(deck,2027);
 sit(s,0,'REZ-2-024','front',0);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s=toPhase(rezPacks,s,'main');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='handTopBuff'),false);
 assert.throws(()=>createUniversalPack({id:'bad-024',cards:[{
  id:'X',name:'ベアトリス',color:'purple',type:'character',energy:2,ap:1,bp:2000,gen:1,
  trigger:'active',implementation:'dsl',effects:{},
  mainAbility:{op:'payApHandTopBuffAttackAp',oncePerTurn:true,payAp:1,bp:1000,recoverAp:1}
 }]}),/unsupported main/);
});
