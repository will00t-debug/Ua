import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {fresh,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-032','REZ-2-063','REZ-2-043','REZ-2-049','REZ-2-047','REZ-2-056',
 'REZ-2-055','REZ-2-058','REZ-2-014','REZ-2-020','REZ-2-041','REZ-2-026','REZ-2-033'
],'REZ-2-033');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function green(s){
 sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-049','energy',1);
 sit(s,0,'REZ-2-063','energy',2);
}
function playAl(s){
 const card=take(s,0,'REZ-2-032');
 s.players[0].hand.push(card);
 const play=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.ok(play);
 return dispatchUniversalAction(rezPacks,s,play);
}
function passUntil(s,ready){
 let guard=0;
 while(!ready(s)){
  if(s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandLimit',uid});
  }else if(s.pending?.kind==='life-trigger'){
   const skip=legalUniversalActions(rezPacks,s).find(a=>a.type==='chooseTrigger'&&a.mode==='skip');
   s=dispatchUniversalAction(rezPacks,s,skip||{type:'chooseTrigger',mode:'skip'});
  }else if(s.pending)throw Error('Pending '+s.pending.kind);
  else s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>48)throw Error('Did not reach the requested state');
 }
 return s;
}
function quietLife(s,p){
 const quiet=take(s,p,'REZ-2-056');
 s.players[p].deck.push(s.players[p].life.shift());
 s.players[p].life.unshift(quiet);
}

test('REZ-2-032 tucks one other character under Al when Priscilla is present',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-032'].effectJa,/裏向きのカードがある場合/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-032'].note,/Q2411/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-032'].note,/Q2412/);
 let s=fresh(deck,3032);
 green(s);
 const victim=sit(s,0,'REZ-2-043','front',0);
 const otherAl=sit(s,0,'REZ-2-032','front',1);
 const crusch=sit(s,0,'REZ-2-020','energy',3);
 s=toPhase(rezPacks,s,'main');
 let absent=fresh(deck,3033);
 sit(absent,0,'REZ-2-049','energy',0);
 sit(absent,0,'REZ-2-049','energy',1);
 sit(absent,0,'REZ-2-043','front',0);
 absent=toPhase(rezPacks,absent,'main');
 absent=playAl(absent);
 assert.equal(absent.pending,null);
 const rested=absent.players[0].front.find(c=>c?.cardId==='REZ-2-032');
 assert.equal(rested.ready,false);
 assert.equal(universalBp(rezPacks,absent,rested),3500);
 assert.equal((rested.under||[]).length,0);
 s=playAl(s);
 assert.equal(s.pending.kind,'effect-retire-tuck-active');
 assert.ok(s.pending.choices.includes(victim.uid));
 assert.ok(s.pending.choices.includes(crusch.uid));
 assert.equal(s.pending.choices.includes(otherAl.uid),false);
 const priscilla=s.players[0].energy.find(c=>c?.cardId==='REZ-2-063');
 const al=s.players[0].front.find(c=>c?.cardId==='REZ-2-032'&&c.uid!==otherAl.uid);
 assert.equal(s.pending.choices.includes(priscilla.uid),false);
 assert.equal(s.pending.choices.includes(al.uid),false);
 const declined=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseRetireTuck',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front.find(c=>c?.uid===al.uid).ready,false);
 assert.equal((declined.players[0].front.find(c=>c?.uid===al.uid).under||[]).length,0);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseRetireTuck',uid:victim.uid});
 const tucked=s.players[0].front.find(c=>c?.uid===al.uid);
 assert.equal(tucked.ready,true);
 assert.equal(tucked.under.length,1);
 assert.equal(tucked.under[0].uid,victim.uid);
 assert.equal(tucked.under[0].faceDown,true);
 assert.equal(s.players[0].outside.some(c=>c.uid===victim.uid),false);
 assert.equal(universalBp(rezPacks,s,tucked),4000);
 const own=universalPublicView(rezPacks,s,0);
 const opp=universalPublicView(rezPacks,s,1);
 const ownLayer=own.players[0].front.find(c=>c?.uid===al.uid).underLayers[0];
 const oppLayer=opp.players[0].front.find(c=>c?.uid===al.uid).underLayers[0];
 assert.equal(ownLayer.cardId,'REZ-2-043');
 assert.equal(ownLayer.uid,victim.uid);
 assert.deepEqual(oppLayer,{faceDown:true});
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,absent),true);
});

test('REZ-2-032 nulls Impact and replaces a BP 500 leave while a facedown remains',()=>{
 let s=fresh(deck,3034);
 green(s);
 const victim=sit(s,0,'REZ-2-043','front',0);
 s=toPhase(rezPacks,s,'main');
 s=playAl(s);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseRetireTuck',uid:victim.uid});
 const al=s.players[0].front.find(c=>c?.cardId==='REZ-2-032');
 assert.equal(al.ready,true);
 quietLife(s,0);
 const attacker=sit(s,1,'REZ-2-047','front',0);
 s=passUntil(s,state=>state.active===1&&state.phase==='attack');
 const life=s.players[0].life.length;
 const live=s.players[0].front.find(c=>c?.uid===al.uid);
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:1});
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='chooseBlock'&&a.uid===live.uid));
 const left=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseBlock',uid:live.uid},{actor:0});
 assert.equal(left.pending.kind,'leave-replacement');
 const departed=dispatchUniversalAction(rezPacks,structuredClone(left),
  {type:'chooseLeaveReplacement',mode:'leave'},{actor:0});
 assert.equal(departed.players[0].life.length,life);
 assert.equal(departed.players[0].front.some(c=>c?.uid===al.uid),false);
 assert.ok(departed.players[0].outside.some(c=>c.uid===al.uid));
 assert.ok(departed.players[0].outside.some(c=>c.uid===victim.uid));
 s=dispatchUniversalAction(rezPacks,left,{type:'chooseLeaveReplacement',mode:'protect'},{actor:0});
 const stayed=s.players[0].front.find(c=>c?.uid===al.uid);
 assert.ok(stayed);
 assert.equal((stayed.under||[]).length,0);
 assert.equal(universalBp(rezPacks,s,stayed),3500);
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(s.players[0].life.length,life);
 assert.equal(s.pending,null);
 let bare=fresh(deck,3035);
 green(bare);
 sit(bare,0,'REZ-2-043','front',0);
 bare=toPhase(rezPacks,bare,'main');
 bare=playAl(bare);
 bare=dispatchUniversalAction(rezPacks,bare,{type:'chooseRetireTuck',uid:null});
 quietLife(bare,0);
 const hitter=sit(bare,1,'REZ-2-047','front',0);
 bare=passUntil(bare,state=>state.active===1&&state.phase==='attack');
 const before=bare.players[0].life.length;
 const open=bare.players[0].front.find(c=>c?.cardId==='REZ-2-032');
 assert.equal(open.ready,true);
 assert.equal(universalBp(rezPacks,bare,open),3500);
 bare=dispatchUniversalAction(rezPacks,bare,{type:'attack',uid:hitter.uid},{actor:1});
 bare=dispatchUniversalAction(rezPacks,bare,{type:'chooseBlock',uid:open.uid},{actor:0});
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].front.some(c=>c?.uid===open.uid),false);
 assert.equal(bare.players[0].life.length,before-1);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,departed),true);
 assert.equal(assertUniversalMatch(rezPacks,bare),true);
});

test('REZ-2-032 retires a Raid top without burying its base, and rejects a partial profile',()=>{
 let s=fresh(deck,3036);
 sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-049','energy',1);
 sit(s,0,'REZ-2-043','energy',2);
 sit(s,0,'REZ-2-063','energy',3);
 const base=sit(s,0,'REZ-2-055','front',0);
 const held=take(s,0,'REZ-2-058');
 s.players[0].outside.push(held);
 s=passUntil(s,state=>state.active===0&&state.players[0].ownTurns===2&&state.phase==='main');
 const top=take(s,0,'REZ-2-058');
 s.players[0].hand.push(top);
 const raid=legalUniversalActions(rezPacks,s).find(a=>
  a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(rezPacks,s,raid);
 assert.equal(s.pending,null);
 const raided=s.players[0].front.find(c=>c?.cardId==='REZ-2-058');
 assert.equal(raided.stack[0].uid,base.uid);
 s=playAl(s);
 assert.equal(s.pending.kind,'effect-retire-tuck-active');
 assert.ok(s.pending.choices.includes(raided.uid));
 assert.equal(s.pending.choices.includes(base.uid),false);
 const pris=s.players[0].energy.find(c=>c?.cardId==='REZ-2-063');
 assert.equal(s.pending.choices.includes(pris.uid),false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseRetireTuck',uid:raided.uid});
 const al=s.players[0].front.find(c=>c?.cardId==='REZ-2-032');
 assert.equal(al.ready,true);
 assert.equal(al.under.length,1);
 assert.equal(al.under[0].uid,raided.uid);
 assert.equal(al.under[0].faceDown,true);
 assert.equal((al.under[0].stack||[]).length,0);
 assert.equal(al.under.some(c=>c.uid===base.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===base.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===raided.uid),false);
 assert.equal(universalBp(rezPacks,s,al),4000);
 const forged=structuredClone(s);
 forged.pending={kind:'effect-retire-tuck-active',player:0,sourceUid:al.uid,
  sourceStamp:al.fieldEntryStamp,choices:[pris.uid],
  requiresName:'プリシラ・バーリエル',exceptNames:['プリシラ・バーリエル','アル'],optional:true};
 assert.throws(()=>assertUniversalMatch(rezPacks,forged),/named retirement tuck/);
 assert.throws(()=>createUniversalPack({id:'bad-032',cards:[{
  id:'X',name:'アル',color:'green',type:'character',energy:4,ap:1,bp:3500,gen:1,
  trigger:'get',implementation:'dsl',facedownUnderStanding:{bp:500,impactNull:true,leaveReplacementMinBp:500},
  effects:{onPlay:[{op:'optionalRetireExceptNamesTuckActive',optional:true,
   requiresName:'プリシラ・バーリエル',exceptNames:['プリシラ・バーリエル','アル'],extra:1}]}
 }]}),/named retirement tuck/);
 assert.throws(()=>createUniversalPack({id:'bad-032b',cards:[{
  id:'X',name:'アル',color:'green',type:'character',energy:4,ap:1,bp:3500,gen:1,
  trigger:'get',raidName:'アル',implementation:'dsl',
  facedownUnderStanding:{bp:500,impactNull:true,leaveReplacementMinBp:500},
  effects:{onPlay:[{op:'draw',count:1}]}
 }]}),/facedown standing/);
 assert.throws(()=>createUniversalPack({id:'bad-032c',cards:[{
  id:'X',name:'アル',color:'green',type:'character',energy:4,ap:1,bp:3500,gen:1,
  trigger:'get',implementation:'dsl',
  facedownUnderStanding:{bp:500,impactNull:true,leaveReplacementMinBp:500},
  effects:{onAttack:[{op:'optionalRetireExceptNamesTuckActive',optional:true,
   requiresName:'プリシラ・バーリエル',exceptNames:['プリシラ・バーリエル','アル']}]}
 }]}),/named retirement tuck/);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
