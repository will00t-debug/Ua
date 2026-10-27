import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,effectiveHandRequiredEnergy,
 legalUniversalActions,newUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-012','REZ-2-027','REZ-2-005','REZ-2-004','REZ-2-009','REZ-2-014',
 'REZ-2-068','REZ-2-011','REZ-2-055','REZ-2-033','REZ-2-035','REZ-2-041','REZ-2-049'
],'REZ-2-014');

function eventOf(s,uid){
 return legalUniversalActions(rezPacks,s).find(a=>a.type==='event'&&a.uid===uid);
}

test('REZ-2-012 needs Emilia, discounts for four outside events, then buffs Subaru',()=>{
 const printed=REZERO_VOL2_BY_ID['REZ-2-012'];
 assert.match(printed.effectJa,/自分の場に〈エミリア〉がある場合のみ使用できる/);
 assert.match(printed.effectJa,/イベントカードが4枚以上ある場合/);
 assert.match(printed.effectJa,/カードを2枚引く/);
 assert.match(printed.effectJa,/黄の〈ナツキ・スバル〉を1枚まで自分の場にアクティブで登場/);
 assert.equal(rez.cards['REZ-2-012'].playRequiresOwnName,'エミリア');
 assert.deepEqual(rez.cards['REZ-2-012'].outsideEventHandEnergyDiscount,{min:4,amount:1});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,3012);
 const gens=['REZ-2-005','REZ-2-004','REZ-2-009'];
 for(let i=0;i<3;i++){
  const gen=take(s,0,gens[i]);gen.ready=true;s.players[0].energy[i]=gen;
 }
 const spell=take(s,0,'REZ-2-012');s.players[0].hand.push(spell);
 const fieldSubaru=take(s,0,'REZ-2-014');fieldSubaru.ready=true;s.players[0].front[1]=fieldSubaru;
 const blue=take(s,0,'REZ-2-014');s.players[0].hand.push(blue);
 s=toPhase(rezPacks,s,'main');
 assert.equal(eventOf(s,spell.uid),undefined);
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-012']),4);
 const emilia=take(s,0,'REZ-2-027');emilia.ready=true;s.players[0].front[0]=emilia;
 assert.ok(eventOf(s,spell.uid));
 s.players[0].outside.push(s.players[0].energy[2]);s.players[0].energy[2]=null;
 assert.equal(eventOf(s,spell.uid),undefined);
 for(let n=0;n<4;n++)s.players[0].outside.push(take(s,0,'REZ-2-068'));
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-012']),3);
 const tops=[s.players[0].deck[0].uid,s.players[0].deck[1].uid];
 s=dispatchUniversalAction(rezPacks,s,eventOf(s,spell.uid),{actor:0});
 assert.ok(tops.every(uid=>s.players[0].hand.some(c=>c.uid===uid)));
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[fieldSubaru.uid]);
 assert.equal(s.pending.choices.includes(blue.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:emilia.uid},{actor:0}),
  /not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:fieldSubaru.uid},{actor:0});
 assert.equal(universalBp(rezPacks,s,s.players[0].front.find(c=>c.uid===fieldSubaru.uid)),3000);
 assert.equal(s.players[0].outside.some(c=>c.uid===spell.uid),true);
 assert.equal(universalPublicView(rezPacks,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('a yellow energy-3 Subaru from hand enters active and a blue Subaru does not',()=>{
 const body=rez.cards['REZ-2-012'].effects.onPlay;
 const pack=createUniversalPack({id:'rez-012-fixture',cards:[
  {id:'SPELL',name:'私の名前はエミリア。ただのエミリアよ',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:'get',implementation:'dsl',playRequiresOwnName:'エミリア',effects:{onPlay:body}},
  {id:'EMI',name:'エミリア',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'YSUB',name:'ナツキ・スバル',color:'yellow',type:'character',energy:3,ap:1,bp:2000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'YHIGH',name:'ナツキ・スバル',color:'yellow',type:'character',energy:4,ap:1,bp:2000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'BLUE',name:'ナツキ・スバル',color:'blue',type:'character',energy:0,ap:1,bp:1500,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  ...Array.from({length:8},(_,i)=>({id:'F'+i,name:'余',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}}))
 ]});
 const ids=['SPELL','EMI','YSUB','YHIGH','BLUE',...Array.from({length:8},(_,i)=>'F'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.F7=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:3013,first:0});
 const takeId=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 const emilia=takeId('EMI');emilia.ready=true;s.players[0].front[0]=emilia;
 const yellow=takeId('YSUB');s.players[0].hand.push(yellow);
 const high=takeId('YHIGH');s.players[0].hand.push(high);
 const blue=takeId('BLUE');s.players[0].hand.push(blue);
 const spell=takeId('SPELL');s.players[0].hand.push(spell);
 s=toPhase(packs,s,'main');
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='event'&&a.uid===spell.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.deepEqual(s.pending.choices,[yellow.uid]);
 const entry=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandRest'&&a.uid===yellow.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,entry,{actor:0});
 const entered=s.players[0].front.find(c=>c?.uid===yellow.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.ok(s.pending.choices.includes(yellow.uid));
 assert.equal(s.pending.choices.includes(blue.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(packs,s,entered),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
