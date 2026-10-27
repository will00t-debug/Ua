import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040','REZ-2-046'].includes(id)),
 'REZ-2-026','REZ-2-031','REZ-2-029'
],'REZ-2-055');

function prepared(seed,allyId){
 let s=fresh(deck,seed);
 s=toPhase(rezPacks,s,'main');
 if(allyId){
  const ally=take(s,0,allyId);ally.ready=true;ally.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[1]=ally;
 }
 const ryuzu=take(s,0,'REZ-2-026');s.players[0].hand.push(ryuzu);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===ryuzu.uid&&a.line==='front'),{actor:0});
 s.players[0].front.find(c=>c.uid===ryuzu.uid).ready=true;
 return {s,ryuzu};
}

test('REZ-2-026 rests and retires to recover one plain purple event',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-026'].effectJa,/必要エナジーが3以下の紫のイベントカードを1枚まで/);
 assert.equal(rez.cards['REZ-2-026'].mainAbility.op,'restRetireRecoverPlainEvent');
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let {s,ryuzu}=prepared(2026,'REZ-2-042');
 const spell=take(s,0,'REZ-2-031'),other=take(s,0,'REZ-2-014');
 s.players[0].outside.push(spell,other);
 const act={type:'activate',uid:ryuzu.uid,mode:'restRetireEvent'};
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===ryuzu.uid&&a.mode==='restRetireEvent'));
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===ryuzu.uid));
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.deepEqual(s.pending.choices,[spell.uid]);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseOutsideRecovery',uid:other.uid},{actor:0}),
  /not currently legal/);
 const declined=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseOutsideRecovery',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].outside.some(c=>c.uid===spell.uid));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseOutsideRecovery',uid:spell.uid},{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===spell.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===spell.uid),false);
 const {s:echidna,ryuzu:named}=prepared(2027,'REZ-2-029');
 const echo=take(echidna,0,'REZ-2-031');echidna.players[0].outside.push(echo);
 assert.ok(legalUniversalActions(rezPacks,echidna).some(a=>a.type==='activate'&&a.uid===named.uid));
 const {s:empty}=prepared(2028,null);
 assert.equal(legalUniversalActions(rezPacks,empty).some(a=>a.type==='activate'),false);
 let {s:none,ryuzu:solo}=prepared(2029,'REZ-2-042');
 none=dispatchUniversalAction(rezPacks,none,{type:'activate',uid:solo.uid,mode:'restRetireEvent'},{actor:0});
 assert.equal(none.pending,null);
 assert.ok(none.players[0].outside.some(c=>c.uid===solo.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,echidna),true);
 assert.equal(assertUniversalMatch(rezPacks,empty),true);
 assert.equal(assertUniversalMatch(rezPacks,none),true);
});

test('plain-event recovery rejects special, final, costly, and character cards',()=>{
 const main={op:'restRetireRecoverPlainEvent',names:['エキドナ','ベアトリス'],color:'purple',maxEnergy:3};
 const unit=(id,name,extra)=>({id,name,color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const event=(id,energy,trigger,extra)=>({...unit(id,id),type:'event',bp:0,gen:0,energy,trigger,...extra});
 const fixture=createUniversalPack({id:'rez-026-fixture',cards:[
  unit('RYU','リューズ・メイエル',{implementation:'dsl',mainAbility:main}),
  unit('BEA','ベアトリス',{color:'green'}),
  event('DRAW',3,'draw'),
  event('COST',4,'draw'),
  event('SPEC',3,'special',{triggerEffect:{op:'retireOppFront'}}),
  event('FIN',3,'final'),
  unit('HERO','エミリア',{energy:1,trigger:'draw'}),
  ...Array.from({length:6},(_,i)=>unit('G'+i,'紫'+i))
 ]});
 const counts=Object.fromEntries(Object.keys(fixture.cards).map(id=>[id,4]));
 counts.G5=2;
 const packs=[fixture,fixture];
 let match=newUniversalMatch(packs,{decks:[counts,counts],seed:2030,first:0});
 const pull=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=match.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 const bea=pull('BEA');bea.ready=true;bea.fieldEntryStamp=match.nextFieldEntryStamp++;
 match.players[0].front[0]=bea;
 const ryu=pull('RYU');ryu.ready=true;ryu.fieldEntryStamp=match.nextFieldEntryStamp++;
 match.players[0].front[1]=ryu;
 const draw=pull('DRAW'),cost=pull('COST'),spec=pull('SPEC'),fin=pull('FIN'),hero=pull('HERO');
 match.players[0].outside.push(draw,cost,spec,fin,hero);
 match=toPhase(packs,match,'main');
 match=dispatchUniversalAction(packs,match,{type:'activate',uid:ryu.uid,mode:'restRetireEvent'},{actor:0});
 assert.equal(match.pending.kind,'effect-recover-outside');
 assert.deepEqual(match.pending.choices,[draw.uid]);
 match=dispatchUniversalAction(packs,match,{type:'chooseOutsideRecovery',uid:draw.uid},{actor:0});
 assert.ok(match.players[0].hand.some(c=>c.uid===draw.uid));
 for(const left of [cost,spec,fin,hero])assert.ok(match.players[0].outside.some(c=>c.uid===left.uid));
 assert.equal(assertUniversalMatch(packs,match),true);
});
