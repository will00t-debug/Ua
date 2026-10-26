import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-003','REZ-2-004'
],'REZ-2-004');

function yellow(seed){
 let s=fresh(deck,seed);
 for(let slot=0;slot<2;slot++){
  const gen=take(s,0,'REZ-2-004');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 return toPhase(rezPacks,s,'main');
}

test('REZ-2-003 chooses draw-discard or a yellow Subaru from outside',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-003'].effectJa,
  '[登場時]以下から1つ選ぶ。\n・カードを1枚引き、自分の手札を1枚場外に置く。\n・自分の場外から黄の〈ナツキ・スバル〉を1枚まで自分の手札に加える。');
 assert.equal(rez.cards['REZ-2-003'].effects.onPlay[0].op,'chooseOne');
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=yellow(2003);
 const petra=take(s,0,'REZ-2-003');s.players[0].hand.push(petra);
 const blue=take(s,0,'REZ-2-014');s.players[0].outside.push(blue);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===petra.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['drawDiscard','subaru']);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'subaru'},{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===blue.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-003 draw-discard is mandatory, and a yellow Subaru can be added',()=>{
 let s=yellow(2004);
 const petra=take(s,0,'REZ-2-003');s.players[0].hand.push(petra);
 const top=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===petra.uid&&a.line==='front'),{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'drawDiscard'},{actor:0});
 assert.equal(s.pending.kind,'effect-discard');
 assert.ok(s.players[0].hand.some(c=>c.uid===top));
 const discard=s.players[0].hand.find(c=>c.uid!==top);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscard',uid:discard.uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.pending,null);
 const unit=(id,name,color)=>({id,name,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:id==='PETRA'?'dsl':'vanilla',
  effects:id==='PETRA'?{onPlay:[{op:'chooseOne',optional:false,options:[
   {id:'drawDiscard',label:'draw and put one hand card outside',turn:'any',
    then:[{op:'drawDiscard',count:1}]},
   {id:'subaru',label:'yellow Subaru from outside',turn:'any',then:[
    {op:'recoverOutsideNameColor',name:'ナツキ・スバル',color:'yellow',optional:true}]}]}]}:{}});
 const fixture=createUniversalPack({id:'rez-003-fixture',cards:[
  unit('PETRA','ペトラ・レイテ','yellow'),unit('YEL','ナツキ・スバル','yellow'),
  unit('BLUE','ナツキ・スバル','blue'),
  ...Array.from({length:10},(_,i)=>unit('G'+i,'黄'+i,'yellow'))
 ]});
 const counts=Object.fromEntries(Object.keys(fixture.cards).map(id=>[id,4]));
 counts.G9=2;
 const packs=[fixture,fixture];
 let match=newUniversalMatch(packs,{decks:[counts,counts],seed:2005,first:0});
 const pull=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=match.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 for(let i=0;i<2;i++){const g=pull('G'+i);g.ready=true;match.players[0].energy[i]=g;}
 const yel=pull('YEL'),other=pull('BLUE'),actor=pull('PETRA');
 match.players[0].outside.push(yel,other);match.players[0].hand.push(actor);
 match=toPhase(packs,match,'main');
 match=dispatchUniversalAction(packs,match,legalUniversalActions(packs,match)
  .find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'),{actor:0});
 match=dispatchUniversalAction(packs,match,{type:'chooseEffectMode',mode:'subaru'},{actor:0});
 assert.equal(match.pending.kind,'effect-recover-outside');
 assert.deepEqual(match.pending.choices,[yel.uid]);
 assert.throws(()=>dispatchUniversalAction(packs,match,{type:'chooseOutsideRecovery',uid:other.uid},{actor:0}),
  /not currently legal/);
 match=dispatchUniversalAction(packs,match,{type:'chooseOutsideRecovery',uid:yel.uid},{actor:0});
 assert.ok(match.players[0].hand.some(c=>c.uid===yel.uid));
 assert.ok(match.players[0].outside.some(c=>c.uid===other.uid));
 assert.equal(assertUniversalMatch(packs,match),true);
 assert.throws(()=>createUniversalPack({id:'bad-003',cards:[{
  id:'X',name:'x',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],
  trigger:null,implementation:'dsl',effects:{onAttack:[
   {op:'recoverOutsideNameColor',name:'ナツキ・スバル',color:'yellow',optional:true}]}
 }]}),/onPlay/);
});
