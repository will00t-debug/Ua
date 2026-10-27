import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions}
 from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-025','REZ-2-026','REZ-2-014','REZ-2-021','REZ-2-056','REZ-2-055',
 'REZ-2-066','REZ-2-049','REZ-2-043','REZ-2-041','REZ-2-060','REZ-2-035','REZ-2-033'
],'REZ-2-055');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function playBeatrice(s){
 const beatrice=take(s,0,'REZ-2-025');
 s.players[0].hand.push(beatrice);
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='play'&&a.uid===beatrice.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.equal(s.players[0].subaruHandTaxAura.name,'ナツキ・スバル');
 assert.equal(s.players[0].subaruHandTaxAura.untilTurn,s.turn);
 return {s,beatrice};
}

test('REZ-2-025 taxes an effect that chooses field Subaru after she leaves',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-025'].effectJa,/ナツキ・スバル/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-025'].note,/Q2409/);
 let s=fresh(deck,3025);
 sit(s,0,'REZ-2-026','energy',0);
 sit(s,0,'REZ-2-026','energy',1);
 sit(s,0,'REZ-2-026','energy',2);
 const subaru=sit(s,0,'REZ-2-014','front',0);
 const other=sit(s,0,'REZ-2-056','front',1);
 ({s}=playBeatrice(s));
 const before=s.players[0].hand.length;
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'draw'},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before+1);
 const beatrice=s.players[0].front.find(c=>c?.cardId==='REZ-2-025');
 const slot=s.players[0].front.findIndex(c=>c?.uid===beatrice.uid);
 s.players[0].front[slot]=null;
 s.players[0].outside.push(beatrice);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 const special=take(s,1,'REZ-2-021');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(special);
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:subaru.uid},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 const unpaid=structuredClone(s);
 unpaid.players[1].deck.push(...unpaid.players[1].hand.splice(0));
 const denied=legalUniversalActions(rezPacks,unpaid).filter(a=>a.mode==='special');
 assert.equal(denied.some(a=>a.uid===subaru.uid),false);
 assert.ok(denied.some(a=>a.uid===other.uid));
 assert.ok(legalUniversalActions(rezPacks,unpaid).some(a=>a.mode==='skip'));
 const alternate=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseTrigger',mode:'special',uid:other.uid},{actor:1});
 assert.equal(alternate.pending,null);
 assert.equal(alternate.players[0].front[1],null);
 const aimed=legalUniversalActions(rezPacks,s).find(a=>a.mode==='special'&&a.uid===subaru.uid);
 s=dispatchUniversalAction(rezPacks,s,aimed,{actor:1});
 assert.equal(s.pending.kind,'effect-selection-hand-payment');
 const payment=s.players[1].hand[0].uid;
 const outside=s.players[1].outside.length;
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseSelectionTaxDiscard',uid:payment},{actor:1});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===payment),true);
 assert.equal(s.players[1].outside.length,outside+1);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-025 draws nothing without Subaru and readies one AP at attack start',()=>{
 let quiet=fresh(deck,3026);
 sit(quiet,0,'REZ-2-026','energy',0);
 sit(quiet,0,'REZ-2-026','energy',1);
 sit(quiet,0,'REZ-2-026','energy',2);
 ({s:quiet}=playBeatrice(quiet));
 const before=quiet.players[0].hand.length;
 quiet=dispatchUniversalAction(rezPacks,quiet,{type:'chooseEffectMode',mode:'draw'},{actor:0});
 assert.equal(quiet.players[0].hand.length,before);
 assert.equal(assertUniversalMatch(rezPacks,quiet),true);
 let s=fresh(deck,3027);
 sit(s,0,'REZ-2-026','energy',0);
 sit(s,0,'REZ-2-026','energy',1);
 sit(s,0,'REZ-2-026','energy',2);
 ({s}=playBeatrice(s));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'ap'},{actor:0});
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 s=dispatchUniversalAction(rezPacks,s,{type:'next'},{actor:0});
 assert.equal(s.phase,'attack');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.optional,false);
 const recovery=legalUniversalActions(rezPacks,s);
 assert.equal(recovery.some(a=>a.uid===null),false);
 s=dispatchUniversalAction(rezPacks,s,recovery[0],{actor:0});
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,1);
 assert.throws(()=>createUniversalPack({id:'bad-025',cards:[{
  id:'X',name:'ベアトリス',color:'purple',type:'character',energy:3,ap:1,bp:2500,gen:2,
  trigger:null,implementation:'dsl',effects:{onPlay:[
   {op:'grantSubaruHandTaxThisTurn',name:'extra'}]}
 }]}),/hand-tax|Subaru/);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
