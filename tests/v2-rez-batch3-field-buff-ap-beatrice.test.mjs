import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalCardEnergy,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezBaseDeck,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

function withCard(id,seed){
 const ids=[...REZ_BASE_IDS.filter(x=>x!=='REZ-2-056'),id];
 const deck=rezDeck(ids,id);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 return {deck,s:fresh(deck,seed)};
}

test('REZ-2-066 field draws one and generates two green',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-066'].nameJa,'水門都市プリステラ');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-066'].type,'field');
 assert.match(REZERO_VOL2_BY_ID['REZ-2-066'].effectJa,/\[登場時\]カードを1枚引く。/);
 assert.deepEqual(rez.cards['REZ-2-066'].effects.onPlay,[{op:'draw',count:1}]);
 assert.equal(rez.cards['REZ-2-066'].gen,2);
 let {s}=withCard('REZ-2-066',1066);
 const big=take(s,0,'REZ-2-049');big.ready=true;s.players[0].energy[0]=big;
 const one=take(s,0,'REZ-2-055');one.ready=true;s.players[0].energy[1]=one;
 const field=take(s,0,'REZ-2-066');s.players[0].hand.push(field);
 s=toPhase(rezPacks,s,'main');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='play'&&a.uid===field.uid&&a.line==='front'),false);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 const top=s.players[0].deck[0].uid,before=s.players[0].hand.length;
 const played=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].hand.at(-1).uid,top);
 assert.equal(played.players[0].hand.length,before);
 assert.equal(universalCardEnergy(rezPacks,played,0,played.players[0].energy.find(c=>c?.uid===field.uid)),2);
 assert.equal(universalPublicView(rezPacks,played,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(rezPacks,played),true);
});

test('REZ-2-050 may buff one other own character and cannot buff itself',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-050'].effectJa,/自分の場の他のキャラを1枚まで/);
 assert.deepEqual(rez.cards['REZ-2-050'].effects.onPlay,[{op:'buffOwnField',
  filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]);
 let s=fresh(rezBaseDeck,1050);
 const fuel=take(s,0,'REZ-2-055');fuel.ready=true;s.players[0].energy[0]=fuel;
 const ally=take(s,0,'REZ-2-056');ally.ready=true;s.players[0].front[1]=ally;
 const foe=take(s,1,'REZ-2-056');foe.ready=true;s.players[1].front[0]=foe;
 const lily=take(s,0,'REZ-2-050');s.players[0].hand.push(lily);
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===lily.uid);
 let waited=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(waited.pending?.kind,'effect-buff-own');
 assert.ok(waited.pending.choices.includes(ally.uid));
 assert.equal(waited.pending.choices.includes(lily.uid),false);
 assert.equal(waited.pending.choices.includes(foe.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,waited,{type:'chooseOwnBuff',uid:lily.uid},{actor:0}),
  /Illegal|invalid|not currently legal|buff/i);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(waited),{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,skipped,skipped.players[0].front[1]),2500);
 const buffed=dispatchUniversalAction(rezPacks,waited,{type:'chooseOwnBuff',uid:ally.uid},{actor:0});
 assert.equal(buffed.pending,null);
 assert.equal(universalBp(rezPacks,buffed,buffed.players[0].front.find(c=>c?.uid===ally.uid)),3500);
 assert.equal(assertUniversalMatch(rezPacks,buffed),true);
});

test('REZ-2-067 activates up to two rested AP cards and can decline',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-067'].effectJa,/自分のAPカードを2枚まで選び、アクティブにする/);
 assert.equal(rez.cards['REZ-2-067'].trigger,'final');
 assert.deepEqual(rez.cards['REZ-2-067'].effects.onPlay,[{op:'recoverAp',count:2}]);
 assert.deepEqual(rez.cards['REZ-2-071'].effects.onPlay,[{op:'recoverAp',count:2}]);
 let {s}=withCard('REZ-2-067',1067);
 const a=take(s,0,'REZ-2-049');a.ready=true;s.players[0].energy[0]=a;
 const b=take(s,0,'REZ-2-055');b.ready=true;s.players[0].energy[1]=b;
 const event=take(s,0,'REZ-2-067');s.players[0].hand.push(event);
 for(const [i,ap] of s.players[0].apCards.entries()){ap.inPlay=true;ap.ready=i===0;}
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(x=>x.type==='event'&&x.uid===event.uid);
 assert.ok(play);
 let paid=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(paid.pending?.kind,'effect-recover-ap');
 assert.equal(paid.pending.remaining,2);
 const rested=paid.players[0].apCards.filter(c=>c.inPlay&&!c.ready).map(c=>c.uid);
 assert.equal(rested.length,3);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(paid),{type:'chooseApRecovery',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,0);
 paid=dispatchUniversalAction(rezPacks,paid,{type:'chooseApRecovery',uid:rested[0]},{actor:0});
 assert.equal(paid.pending?.kind,'effect-recover-ap');
 assert.throws(()=>dispatchUniversalAction(rezPacks,paid,{type:'chooseApRecovery',uid:rested[0]},{actor:0}),
  /not currently legal/);
 paid=dispatchUniversalAction(rezPacks,paid,{type:'chooseApRecovery',uid:rested[1]},{actor:0});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(paid.players[0].apCards.find(c=>c.uid===rested[2]).ready,false);
 assert.ok(paid.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(assertUniversalMatch(rezPacks,paid),true);
});

test('REZ-2-031 draws, then optionally recovers one ベアトリス, and green energy cannot pay it',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-031'].effectJa,/カードを1枚引く。自分の場外から〈ベアトリス〉を1枚まで手札に加える。/);
 assert.deepEqual(rez.cards['REZ-2-031'].effects.onPlay,[
  {op:'draw',count:1},
  {op:'recoverOutsideOne',filter:{field:'name',value:'ベアトリス'},optional:true}
 ]);
 let {s}=withCard('REZ-2-031',1031);
 for(const [slot,id] of ['REZ-2-049','REZ-2-055'].entries()){
  const gen=take(s,0,id);gen.ready=true;s.players[0].energy[slot]=gen;
 }
 const spell=take(s,0,'REZ-2-031');s.players[0].hand.push(spell);
 s=toPhase(rezPacks,s,'main');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='event'&&a.uid===spell.uid),false);
 const unit=(id,name,color='purple')=>({id,name,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const fixture=createUniversalPack({id:'rez-031-fixture',cards:[
  {...unit('SPELL','魔晶石'),type:'event',energy:3,ap:1,bp:0,gen:0,trigger:'draw',implementation:'dsl',
   effects:{onPlay:[{op:'draw',count:1},{op:'recoverOutsideOne',filter:{field:'name',value:'ベアトリス'},optional:true}]}},
  unit('BEA','ベアトリス','green'),unit('EMI','エミリア','green'),
  ...Array.from({length:10},(_,i)=>unit('P'+i,'紫'+i))
 ]});
 const counts=Object.fromEntries(Object.keys(fixture.cards).map(id=>[id,4]));
 counts.P9=2;
 assert.deepEqual(validateUniversalDeck(fixture,counts),[]);
 let q=newUniversalMatch([fixture,fixture],{decks:[counts,counts],seed:2031,first:0});
 const pull=(state,id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=state.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 for(let i=0;i<3;i++){const g=pull(q,'P'+i);g.ready=true;q.players[0].energy[i]=g;}
 const bea=pull(q,'BEA'),emi=pull(q,'EMI'),card=pull(q,'SPELL');
 q.players[0].outside.push(bea,emi);q.players[0].hand.push(card);
 q=toPhase([fixture,fixture],q,'main');
 const play=legalUniversalActions([fixture,fixture],q).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(play);
 const top=q.players[0].deck[0].uid;
 let played=dispatchUniversalAction([fixture,fixture],q,play,{actor:0});
 assert.equal(played.players[0].hand.at(-1).uid,top);
 assert.equal(played.pending?.kind,'effect-recover-outside');
 assert.deepEqual(played.pending.choices,[bea.uid]);
 assert.throws(()=>dispatchUniversalAction([fixture,fixture],played,{type:'chooseOutsideRecovery',uid:emi.uid},{actor:0}),
  /not currently legal/);
 const declined=dispatchUniversalAction([fixture,fixture],structuredClone(played),{type:'chooseOutsideRecovery',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].outside.some(c=>c.uid===bea.uid));
 played=dispatchUniversalAction([fixture,fixture],played,{type:'chooseOutsideRecovery',uid:bea.uid},{actor:0});
 assert.equal(played.pending,null);
 assert.ok(played.players[0].hand.some(c=>c.uid===bea.uid));
 assert.equal(played.players[0].outside.some(c=>c.uid===bea.uid),false);
 assert.ok(played.players[0].outside.some(c=>c.uid===emi.uid));
 assert.equal(universalPublicView([fixture,fixture],played,1).players[0].hand,null);
 assert.equal(assertUniversalMatch([fixture,fixture],played),true);
});
