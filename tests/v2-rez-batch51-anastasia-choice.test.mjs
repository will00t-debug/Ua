import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-054','REZ-2-043','REZ-2-049','REZ-2-041','REZ-2-055','REZ-2-056',
 'REZ-2-066','REZ-2-014','REZ-2-040','REZ-2-012','REZ-2-033','REZ-2-035','REZ-2-046'
],'REZ-2-055');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function order(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=dispatchUniversalAction(rezPacks,s,{type:'chooseTopOrder',uid},{actor:0});
 }
 return s;
}
function playAna(s){
 const ana=take(s,0,'REZ-2-054');s.players[0].hand.push(ana);
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===ana.uid&&a.line==='front');
 assert.ok(play);
 return dispatchUniversalAction(rezPacks,s,play,{actor:0});
}

test('REZ-2-054 looks at one card per green printed name and can buff two others',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-054'].effectJa,/異なるカード名の緑のキャラの種類数分/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-054'].effectJa,/必要エナジーが5以下のキャラカードを1枚まで/);
 assert.equal(rez.cards['REZ-2-054'].effects.onPlay[0].op,'chooseOne');
 let s=fresh(deck,2054);
 const mimi=sit(s,0,'REZ-2-043','front',0);
 const alias=sit(s,0,'REZ-2-041','front',1);
 const twin=sit(s,0,'REZ-2-041','energy',0);
 const blue=sit(s,0,'REZ-2-014','energy',1);
 const pay=sit(s,0,'REZ-2-049','energy',2);
 const high=take(s,0,'REZ-2-040');
 const event=take(s,0,'REZ-2-012');
 const fieldCard=take(s,0,'REZ-2-066');
 const low=take(s,0,'REZ-2-056');
 s.players[0].deck.unshift(fieldCard,event,high,low);
 s=playAna(s);
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'kinds'},{actor:0});
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.uids.length,4);
 assert.deepEqual([...s.pending.choices].sort(),[low.uid,high.uid].sort());
 assert.equal(s.pending.choices.includes(event.uid),false);
 assert.equal(s.pending.choices.includes(fieldCard.uid),false);
 const window=[...s.pending.uids];
 const declined=order(dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseTopFiltered',uid:null},{actor:0}));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===low.uid),false);
 assert.deepEqual(declined.players[0].deck.slice(-4).map(c=>c.uid),window);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTopFiltered',uid:low.uid},{actor:0});
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-2-056');
 s=order(s);
 assert.equal(s.pending.kind,'effect-discard');
 const discarded=s.players[0].hand.find(c=>c.uid!==low.uid);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscard',uid:discarded.uid},{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===low.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(alias.cardId,'REZ-2-041');
 assert.equal(twin.cardId,'REZ-2-041');
 assert.equal(blue.cardId,'REZ-2-014');
 assert.equal(pay.cardId,'REZ-2-049');
 assert.equal(mimi.cardId,'REZ-2-043');
 let buff=fresh(deck,3054);
 const self=take(buff,0,'REZ-2-054');
 const ally=sit(buff,0,'REZ-2-043','front',1);
 const second=sit(buff,0,'REZ-2-056','front',2);
 const foe=sit(buff,1,'REZ-2-043','front',0);
 sit(buff,0,'REZ-2-049','energy',0);
 sit(buff,0,'REZ-2-055','energy',1);
 buff.players[0].hand.push(self);
 buff=toPhase(rezPacks,buff,'main');
 buff=dispatchUniversalAction(rezPacks,buff,legalUniversalActions(rezPacks,buff)
  .find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'),{actor:0});
 buff=dispatchUniversalAction(rezPacks,buff,{type:'chooseEffectMode',mode:'buff'},{actor:0});
 assert.equal(buff.pending.kind,'effect-buff-own');
 assert.equal(buff.pending.remaining,2);
 assert.equal(buff.pending.choices.includes(self.uid),false);
 assert.equal(buff.pending.choices.includes(foe.uid),false);
 assert.ok(buff.pending.choices.includes(ally.uid));
 const skip=dispatchUniversalAction(rezPacks,structuredClone(buff),{type:'chooseOwnBuff',uid:null},{actor:0});
 const skipAlly=skip.players[0].front.find(c=>c?.uid===ally.uid);
 assert.equal(universalBp(rez,skip,skipAlly),3500);
 buff=dispatchUniversalAction(rezPacks,buff,{type:'chooseOwnBuff',uid:ally.uid},{actor:0});
 assert.equal(buff.pending.remaining,1);
 buff=dispatchUniversalAction(rezPacks,buff,{type:'chooseOwnBuff',uid:second.uid},{actor:0});
 assert.equal(buff.pending,null);
 const liveAlly=buff.players[0].front.find(c=>c?.uid===ally.uid);
 const liveSecond=buff.players[0].front.find(c=>c?.uid===second.uid);
 assert.equal(universalBp(rez,buff,liveAlly),4000);
 assert.equal(universalBp(rez,buff,liveSecond),3000);
 assert.equal(universalBp(rez,buff,buff.players[0].front[0]),2000);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,buff),true);
 assert.equal(assertUniversalMatch(rezPacks,skip),true);
});

test('energy above 5 is not a legal Anastasia add, and the profile rejects stray fields',()=>{
 const unit={color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,trigger:null,implementation:'vanilla',effects:{}};
 const pack=createUniversalPack({id:'rez-054-energy',cards:[
  {id:'A',name:'アナスタシア・ホーシン',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,
   implementation:'dsl',effects:{onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'kinds',label:'top green kinds',turn:'any',then:[
     {op:'searchTopDistinctBottomDiscard',color:'green',maxEnergy:5}]},
    {id:'buff',label:'two others bp 500',turn:'any',then:[
     {op:'buffOwnOthersFixed',bp:500,count:2}]}]}]}},
  {id:'SIX',name:'六',color:'green',...unit,energy:6},
  {id:'FIVE',name:'五',...unit,energy:5},
  ...Array.from({length:10},(_,n)=>({id:'P'+n,name:'P'+n,...unit}))
 ]});
 assert.throws(()=>createUniversalPack({id:'bad-054',cards:[
  {id:'A',name:'A',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   implementation:'dsl',effects:{onPlay:[{op:'searchTopDistinctBottomDiscard',color:'green',maxEnergy:5,extra:true}]}}
 ]}),/invalid distinct-name top search/);
 assert.throws(()=>createUniversalPack({id:'bad-054b',cards:[
  {id:'A',name:'A',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   implementation:'dsl',effects:{onAttack:[{op:'buffOwnOthersFixed',bp:500,count:2}]}}
 ]}),/character onPlay/);
 assert.equal(pack.cards.A.name,'アナスタシア・ホーシン');
 assert.equal(pack.cards.SIX.energy,6);
 assert.equal(pack.cards.FIVE.energy,5);
});
