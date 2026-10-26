import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-039','REZ-2-043','REZ-2-057','REZ-2-036','REZ-2-060','REZ-2-053',
 'REZ-2-041','REZ-2-038','REZ-2-014','REZ-2-037','REZ-2-049','REZ-2-034','REZ-2-055'
],'REZ-2-055');

test('REZ-2-039 COLOR is energy 2 or printed BP 2500, still AP 1 green',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-039'].effectJa,/「必要エナジーが2以下」を「元々のBPが2500」に代えてもよい/);
 assert.equal(rez.cards['REZ-2-039'].triggerEffect.alternatePrintedBp,2500);
 assert.equal(rez.cards['REZ-2-039'].impactNull,true);
 assert.throws(()=>createUniversalPack({id:'rez-039-bad-bp',cards:[{
  id:'X',name:'色',color:'green',type:'character',energy:1,ap:1,bp:2500,gen:1,
  trigger:'color',implementation:'dsl',effects:{},
  triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1,alternatePrintedBp:100}
 }]}),/COLOR/);
 let s=fresh(deck,3039);
 const revealed=take(s,1,'REZ-2-039');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(revealed);
 const both=take(s,1,'REZ-2-060');
 const energyOnly=take(s,1,'REZ-2-043');
 const printedOnly=take(s,1,'REZ-2-057');
 const neither=take(s,1,'REZ-2-036');
 const frontBan=take(s,1,'REZ-2-053');
 const wrongAp=take(s,1,'REZ-2-039');
 const wrongColor=take(s,1,'REZ-2-014');
 s.players[1].hand.push(both,energyOnly,printedOnly,neither,frontBan,wrongAp,wrongColor);
 const attacker=take(s,0,'REZ-2-034');attacker.ready=true;s.players[0].front[0]=attacker;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'color');
 const legal=legalUniversalActions(rezPacks,s).filter(a=>a.mode==='color');
 const ids=uid=>legal.filter(a=>a.uid===uid);
 assert.ok(ids(both.uid).length);
 assert.equal(new Set(ids(both.uid).map(a=>a.line+':'+a.slot+':'+(a.replaceUid||''))).size,ids(both.uid).length);
 assert.ok(ids(energyOnly.uid).some(a=>a.line==='front'));
 assert.ok(ids(printedOnly.uid).some(a=>a.line==='energy'));
 assert.equal(ids(neither.uid).length,0);
 assert.equal(ids(wrongAp.uid).length,0);
 assert.equal(ids(wrongColor.uid).length,0);
 assert.equal(ids(frontBan.uid).some(a=>a.line==='front'),false);
 assert.ok(ids(frontBan.uid).some(a=>a.line==='energy'));
 const play=ids(energyOnly.uid).find(a=>a.line==='energy'&&a.replaceUid===undefined);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:1});
 const entered=s.players[1].energy.find(c=>c?.uid===energyOnly.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-039 rests one other green printed-BP 2500 character, then actives either',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-039'].effectJa,/〈ナツキ・スバル〉以外の元々のBPが2500/);
 assert.throws(()=>createUniversalPack({id:'rez-039-bad-except',cards:[{
  id:'X',name:'除外',color:'green',type:'event',energy:1,ap:1,bp:0,gen:0,trigger:'special',
  triggerEffect:{op:'retireOppFront'},implementation:'dsl',effects:{onPlay:[
   {op:'deployOutsidePrintedExcept',color:'green',printedBp:2500,
    excludeName:'ナツキ・スバル',optional:true}]}}]}),/character onPlay/);
 let s=fresh(deck,3040);
 for(let i=0;i<4;i++){
  const gen=take(s,0,'REZ-2-037');gen.ready=true;s.players[0].energy[i]=gen;
 }
 const ally=take(s,0,'REZ-2-041');
 const named=take(s,0,'REZ-2-039');
 const otherSubaru=take(s,0,'REZ-2-038');
 const wrongBp=take(s,0,'REZ-2-049');
 const banned=take(s,0,'REZ-2-053');
 s.players[0].outside.push(ally,named,otherSubaru,wrongBp,banned);
 const subaru=take(s,0,'REZ-2-039');s.players[0].hand.push(subaru);
 s=toPhase(rezPacks,s,'main');
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===subaru.uid&&a.line==='front');
 let declined=dispatchUniversalAction(rezPacks,structuredClone(s),play,{actor:0});
 assert.equal(declined.pending.kind,'effect-outside-except');
 assert.deepEqual(declined.pending.choices.slice().sort(),[ally.uid,banned.uid].sort());
 assert.equal(universalPrivateChoices(rezPacks,declined,0).options.some(o=>o.card?.cardId==='REZ-2-041'),true);
 assert.equal(universalPrivateChoices(rezPacks,declined,1),null);
 assert.equal(universalPublicView(rezPacks,declined,1).pending.kind,'effect-outside-except');
 const frontBan=legalUniversalActions(rezPacks,declined).filter(a=>a.uid===banned.uid);
 assert.equal(frontBan.some(a=>a.line==='front'),false);
 assert.ok(frontBan.some(a=>a.line==='energy'));
 declined=dispatchUniversalAction(rezPacks,declined,{type:'chooseOutsideExcept',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front.find(c=>c?.uid===subaru.uid).ready,false);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 const enter=legalUniversalActions(rezPacks,s).find(a=>a.type==='chooseOutsideExcept'&&a.uid===ally.uid&&a.line==='energy');
 let activeAlly=dispatchUniversalAction(rezPacks,structuredClone(s),enter,{actor:0});
 assert.equal(activeAlly.players[0].energy.find(c=>c?.uid===ally.uid).ready,false);
 assert.equal(activeAlly.pending.kind,'effect-active-either');
 assert.deepEqual(activeAlly.pending.choices.slice().sort(),[ally.uid,subaru.uid].sort());
 assert.equal(legalUniversalActions(rezPacks,activeAlly).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,activeAlly,{type:'chooseActiveEither',uid:named.uid},{actor:0}),/not currently legal/);
 activeAlly=dispatchUniversalAction(rezPacks,activeAlly,{type:'chooseActiveEither',uid:ally.uid},{actor:0});
 assert.equal(activeAlly.players[0].energy.find(c=>c?.uid===ally.uid).ready,true);
 assert.equal(activeAlly.players[0].front.find(c=>c?.uid===subaru.uid).ready,false);
 assert.equal(activeAlly.pending,null);
 let activeSelf=dispatchUniversalAction(rezPacks,s,enter,{actor:0});
 activeSelf=dispatchUniversalAction(rezPacks,activeSelf,{type:'chooseActiveEither',uid:subaru.uid},{actor:0});
 assert.equal(activeSelf.players[0].front.find(c=>c?.uid===subaru.uid).ready,true);
 assert.equal(activeSelf.players[0].energy.find(c=>c?.uid===ally.uid).ready,false);
 assert.equal(assertUniversalMatch(rezPacks,activeSelf),true);
});

test('REZ-2-039 impact null stops the opposing character impact when it loses the block',()=>{
 let s=fresh(deck,3041);
 const attacker=take(s,0,'REZ-2-034');attacker.ready=true;s.players[0].front[0]=attacker;
 const wall=take(s,1,'REZ-2-039');wall.ready=true;s.players[1].front[0]=wall;
 const plain=take(s,1,'REZ-2-049');plain.ready=true;s.players[1].outside.push(plain);
 s=toPhase(rezPacks,s,'attack');
 const live=s.players[0].front[0];
 live.impactGranted={turn:s.turn,stamp:live.fieldEntryStamp,amount:1};
 const life=s.players[1].life.length;
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:live.uid},{actor:0});
 const blocked=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(blocked.players[1].front[0],null);
 assert.equal(blocked.players[1].life.length,life);
 assert.equal(blocked.players[1].outside.some(c=>c.uid===wall.uid),true);
 s.players[1].outside.push(s.players[1].front[0]);
 const parked=s.players[1].outside.findIndex(c=>c.uid===plain.uid);
 s.players[1].front[0]=s.players[1].outside.splice(parked,1)[0];
 const hit=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:plain.uid},{actor:1});
 assert.equal(hit.players[1].life.length,life-1);
 assert.equal(assertUniversalMatch(rezPacks,blocked),true);
});
