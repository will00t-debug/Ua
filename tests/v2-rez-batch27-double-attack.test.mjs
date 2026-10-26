import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-068'
],'REZ-2-049');

test('REZ-2-068 gives one Emilia two attacks this turn',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-068'].effectJa,
  '自分の場の〈エミリア〉を1枚選び、このターン中、[2回アタック]（このキャラがこのターン初めてアタックした時、アクティブにする）を与える。');
 assert.deepEqual(rez.cards['REZ-2-068'].effects.onPlay,[{op:'grantNamedReadyOnAttack',name:'エミリア'}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,2068);
 for(let slot=0;slot<2;slot++){
  const gen=take(s,0,'REZ-2-049');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 s=toPhase(rezPacks,s,'main');
 const event=take(s,0,'REZ-2-068');s.players[0].hand.push(event);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const emilia=take(s,0,'REZ-2-055');s.players[0].hand.push(emilia);
 s.players[0].apCards[0].inPlay=true;s.players[0].apCards[0].ready=true;
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='front'),{actor:0});
 if(s.pending?.kind==='effect-discard'){
  const discard=s.players[0].hand.find(c=>c.uid!==event.uid);
  s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscard',uid:discard.uid},{actor:0});
 }
 s.players[0].front.find(c=>c?.uid===emilia.uid).ready=true;
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 const felis=take(s,0,'REZ-2-046');felis.ready=true;felis.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[s.players[0].front.findIndex(c=>!c)]=felis;
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='event'&&a.uid===event.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-grant-named');
 assert.deepEqual(s.pending.choices,[emilia.uid]);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseGrantNamed',uid:felis.uid},{actor:0}),
  /not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseGrantNamed',uid:emilia.uid},{actor:0});
 const granted=s.players[0].front.find(c=>c.uid===emilia.uid);
 assert.equal(granted.eventReadyOnAttack.turn,s.turn);
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:emilia.uid},{actor:0});
 assert.equal(s.players[0].front.find(c=>c.uid===emilia.uid).ready,true);
 assert.equal(s.pending.kind,'block');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 let guard=0;
 while(s.pending?.kind==='life-trigger'){
  s=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
  if(++guard>4)throw Error('life trigger did not finish');
 }
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].front.find(c=>c.uid===emilia.uid).ready,true);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='attack'&&a.uid===emilia.uid));
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:emilia.uid},{actor:0});
 assert.equal(s.players[0].front.find(c=>c.uid===emilia.uid).ready,false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 guard=0;
 while(s.pending?.kind==='life-trigger'){
  s=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
  if(++guard>4)throw Error('life trigger did not finish');
 }
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='attack'&&a.uid===emilia.uid),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.throws(()=>createUniversalPack({id:'bad-068',cards:[{
  id:'X',name:'x',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],
  trigger:null,implementation:'dsl',effects:{onPlay:[{op:'grantNamedReadyOnAttack',name:'エミリア'}]}
 }]}),/event onPlay/);
});
