import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-023','REZ-2-026'
],'REZ-2-055');

function laterAttack(s){
 let guard=0;
 while(!(s.active===0&&s.phase==='attack'&&s.turn>1)){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>16)throw Error('Did not return to a later attack');
 }
 return s;
}

test('REZ-2-023 enters ACTIVE and cannot attack until the next own turn',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-023'].effectJa,/このキャラはアタックできない/);
 assert.deepEqual(rez.cards['REZ-2-023'].effects.onPlay,[
  {op:'activeSelf'},{op:'banSelfAttackThisTurn'}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,2023);
 for(let slot=0;slot<4;slot++){
  const gen=take(s,0,'REZ-2-026');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 s=toPhase(rezPacks,s,'main');
 const fortuna=take(s,0,'REZ-2-023');s.players[0].hand.push(fortuna);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===fortuna.uid&&a.line==='front'),{actor:0});
 const entered=s.players[0].front.find(c=>c.uid===fortuna.uid);
 assert.equal(entered.ready,true);
 assert.equal(entered.attackBanned.turn,s.turn);
 s=toPhase(rezPacks,s,'attack');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='attack'&&a.uid===fortuna.uid),false);
 const before=s.players[0].deck.length;
 s=laterAttack(s);
 assert.ok(s.players[0].deck.length>0);
 assert.ok(s.players[0].deck.length<before);
 assert.equal(s.players[0].front.find(c=>c.uid===fortuna.uid).attackBanned,undefined);
 assert.equal(s.players[0].front.find(c=>c.uid===fortuna.uid).ready,true);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='attack'&&a.uid===fortuna.uid));
 assert.equal(s.status,'playing');
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('Q2408: retiring the fixture deploys a discarded energy-0 purple Emilia',()=>{
 const program={
  onPlay:[{op:'activeSelf'},{op:'banSelfAttackThisTurn'}],
  onRetire:[{op:'discardGate',optional:true,then:[
   {op:'deployOutsideNameColorEnergy',name:'エミリア',color:'purple',
    maxEnergy:0,line:'energy',optional:true}]}]
 };
 const unit=(id,name,color,extra)=>({id,name,color,type:'character',energy:0,ap:1,bp:4000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const fixture=createUniversalPack({id:'rez-023-fixture',cards:[
  unit('FORT','フォルトナ','purple',{energy:4,implementation:'dsl',effects:program}),
  unit('EMI','エミリア','purple'),
  unit('HIGH','エミリア','purple',{energy:2}),
  unit('YEL','エミリア','yellow'),
  unit('HIT','打手','yellow'),
  ...Array.from({length:8},(_,i)=>unit('G'+i,'紫'+i,'purple',{bp:1000}))
 ]});
 const counts=Object.fromEntries(Object.keys(fixture.cards).map(id=>[id,4]));
 counts.G7=2;
 const packs=[fixture,fixture];
 let match=newUniversalMatch(packs,{decks:[counts,counts],seed:2024,first:1});
 const pull=(p,id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=match.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 const hit=pull(1,'HIT');hit.ready=true;hit.fieldEntryStamp=match.nextFieldEntryStamp++;
 match.players[1].front[0]=hit;
 const fort=pull(0,'FORT');fort.ready=true;fort.fieldEntryStamp=match.nextFieldEntryStamp++;
 match.players[0].front[0]=fort;
 const emilias=[];
 for(const zone of ['hand','deck','life','outside']){
  const pile=match.players[0][zone];
  for(let i=pile.length-1;i>=0;i--)if(pile[i].cardId==='EMI')emilias.push(pile.splice(i,1)[0]);
 }
 const [emi,fromHand,...extraEmilia]=emilias;
 const high=pull(0,'HIGH'),yel=pull(0,'YEL');
 match.players[0].deck.push(...match.players[0].hand,...extraEmilia);
 match.players[0].hand=[fromHand];
 match.players[0].outside.push(emi,high,yel);
 match=toPhase(packs,match,'attack');
 match=dispatchUniversalAction(packs,match,{type:'attack',uid:hit.uid},{actor:1});
 assert.equal(match.pending.kind,'block');
 match=dispatchUniversalAction(packs,match,{type:'chooseBlock',uid:fort.uid},{actor:0});
 assert.equal(match.pending.kind,'effect-discard-gate');
 assert.ok(match.players[0].outside.some(c=>c.uid===fort.uid));
 const declined=dispatchUniversalAction(packs,structuredClone(match),{type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].outside.some(c=>c.uid===emi.uid));
 assert.ok(declined.players[0].hand.some(c=>c.uid===fromHand.uid));
 match=dispatchUniversalAction(packs,match,{type:'chooseDiscardGate',uid:fromHand.uid},{actor:0});
 assert.equal(match.pending.kind,'effect-outside-name-rest');
 const choices=legalUniversalActions(packs,match).filter(a=>a.type==='chooseOutsideNameRest'&&a.uid);
 assert.deepEqual([...new Set(choices.map(a=>a.uid))].sort(),[emi.uid,fromHand.uid].sort());
 assert.equal(choices.every(a=>a.line==='energy'),true);
 assert.throws(()=>dispatchUniversalAction(packs,match,
  {type:'chooseOutsideNameRest',uid:fromHand.uid,line:'front',slot:0},{actor:0}),/not currently legal/);
 const energy=choices.find(a=>a.uid===fromHand.uid);
 match=dispatchUniversalAction(packs,match,energy,{actor:0});
 const entered=match.players[0].energy.find(c=>c?.uid===fromHand.uid);
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.ok(match.players[0].outside.some(c=>c.uid===high.uid));
 assert.ok(match.players[0].outside.some(c=>c.uid===yel.uid));
 assert.equal(match.pending,null);
 assert.equal(assertUniversalMatch(packs,match),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
});
