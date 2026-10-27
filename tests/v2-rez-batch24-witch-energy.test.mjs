import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalCardEnergy,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-056'].includes(id)),
 'REZ-2-028','REZ-2-029'
],'REZ-2-028');

test('REZ-2-028 draws for a witch and discards once for one purple this turn',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-028'].effectJa,
  '[登場時]自分の場に［特徴：魔女］がある場合、カードを1枚引く。\n[起動メイン][手札を1枚場外に置く] [ターン1]このキャラはこのターン中、発生エナジー+[紫]。');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-028'].genMark,'+');
 assert.deepEqual(rez.cards['REZ-2-028'].effects.onPlay,[{
  op:'drawIfOwnTraitCount',trait:'魔女',zone:'field',excludeSelf:false,min:1,count:1}]);
 assert.deepEqual(rez.cards['REZ-2-028'].mainAbility,{
  op:'discardHandGainEnergy',oncePerTurn:true,discardCount:1,extraEnergy:1});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 assert.throws(()=>createUniversalPack({id:'energy',cards:[{
  id:'X',name:'エミリア',color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:1,implementation:'dsl',
  effects:{},mainAbility:{op:'discardHandGainEnergy',oncePerTurn:true,discardCount:1,extraEnergy:0}
 }]}),/unsupported main action/);
 let s=fresh(deck,1028);
 for(const slot of [0,1]){
  const witch=take(s,0,'REZ-2-029');witch.ready=true;s.players[0].energy[slot]=witch;
 }
 const emilia=take(s,0,'REZ-2-028');s.players[0].hand.push(emilia);
 s=toPhase(rezPacks,s,'main');
 const before=s.players[0].hand.length,top=s.players[0].deck[0].uid;
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='energy');
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===top));
 assert.equal(s.players[0].hand.length,before);
 const entered=s.players[0].energy.find(c=>c?.uid===emilia.uid);
 assert.equal(universalCardEnergy(rezPacks,s,0,entered),1);
 entered.ready=false;
 const payment=s.players[0].hand[0].uid;
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===emilia.uid&&a.mode==='discardEnergy');
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending.kind,'main-discard-buff');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseMainDiscard',uid:payment},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===payment));
 assert.equal(universalCardEnergy(rezPacks,s,0,s.players[0].energy.find(c=>c?.uid===emilia.uid)),2);
 assert.equal(universalEnergyByColor(rezPacks,s,0).purple,4);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===emilia.uid),false);
 const front=s.players[0].energy.find(c=>c?.uid===emilia.uid);
 s.players[0].energy[s.players[0].energy.indexOf(front)]=null;s.players[0].front[0]=front;
 assert.equal(universalCardEnergy(rezPacks,s,0,front),0);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-028 does not draw when the witch is only in hand or outside',()=>{
 const unit=(id,name,traits)=>({id,name,color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits,trigger:null,implementation:id==='EMI'?'dsl':'vanilla',effects:{},
  ...(id==='EMI'?{templateEffects:{onPlay:[{template:'drawIfOwnTraitCount',trait:'魔女',zone:'field',
   excludeSelf:false,min:1,count:1}]}}: {})});
 const fixture=createUniversalPack({id:'rez-028-fixture',cards:[
  unit('EMI','エミリア',['王選候補者']),
  unit('WITCH','エキドナ',['魔女']),
  ...Array.from({length:11},(_,i)=>unit('P'+i,'紫'+i,[]))
 ]});
 const counts=Object.fromEntries(Object.keys(fixture.cards).map(id=>[id,4]));
 counts.P10=2;
 assert.deepEqual(validateUniversalDeck(fixture,counts),[]);
 const packs=[fixture,fixture];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2028,first:0});
 const pull=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 for(let i=0;i<2;i++){const g=pull('P'+i);g.ready=true;s.players[0].energy[i]=g;}
 const witch=pull('WITCH'),emilia=pull('EMI');
 s.players[0].hand.push(witch,emilia);
 s.players[0].outside.push(pull('WITCH'));
 s=toPhase(packs,s,'main');
 const top=s.players[0].deck[0].uid,before=s.players[0].hand.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(s.players[0].hand.some(c=>c.uid===top),false);
 assert.equal(s.players[0].hand.length,before-1);
 const live=pull('WITCH');live.ready=true;s.players[0].energy[2]=live;
 const again=pull('EMI');s.players[0].hand.push(again);
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 const second=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front');
 const drawn=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(packs,s,second,{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn));
 assert.equal(assertUniversalMatch(packs,s),true);
});
