import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {matchesPrintedPlayFilter} from '../dist/universal-v2/ap-discounts.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const emiliaDeck=(()=>{
 const ids=['REZ-2-011','REZ-2-004','REZ-2-005','REZ-2-049','REZ-2-055',
  'REZ-2-014','REZ-2-033','REZ-2-035','REZ-2-041','REZ-2-009'];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts['REZ-2-068']=4;
 counts['REZ-2-067']=2;
 counts['REZ-2-071']=2;
 counts['REZ-2-070']=2;
 return counts;
})();
const remDeck=rezDeck([
 'REZ-2-010','REZ-2-007','REZ-2-008','REZ-2-009','REZ-2-004','REZ-2-005',
 'REZ-2-014','REZ-2-033','REZ-2-035','REZ-2-041','REZ-2-055','REZ-2-049','REZ-2-056'
],'REZ-2-014');

function discounts(s){
 return s.continuousStates.filter(e=>e.kind==='nextEligibleHandPlayApDiscount');
}
function play(s,uid,line='front'){
 return legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line);
}
function eventPlay(s,uid){
 return legalUniversalActions(rezPacks,s).find(a=>a.type==='event'&&a.uid===uid);
}

test('REZ-2-011 scales the next event AP discount and can step',()=>{
 const printed=REZERO_VOL2_BY_ID['REZ-2-011'];
 assert.match(printed.effectJa,/\[ステップ\]/);
 assert.match(printed.effectJa,/必要エナジーが『1』以下のイベントカードの消費APを-1/);
 assert.match(printed.effectJa,/イベントカード2枚につき/);
 assert.equal(rez.cards['REZ-2-011'].step,true);
 assert.deepEqual(rez.cards['REZ-2-011'].effects.onPlay,[{
  op:'nextScaledEventApDiscount',once:'name',cardType:'event',baseEnergy:1,perOutsideEvents:2
 }]);
 assert.deepEqual(validateUniversalDeck(rez,emiliaDeck),[]);
 let s=fresh(emiliaDeck,2011);
 const ram=take(s,0,'REZ-2-005');ram.ready=true;s.players[0].energy[0]=ram;
 const small=take(s,0,'REZ-2-004');small.ready=true;s.players[0].energy[1]=small;
 const emilia=take(s,0,'REZ-2-011');s.players[0].hand.push(emilia);
 s=toPhase(rezPacks,s,'main');
 s=dispatchUniversalAction(rezPacks,s,play(s,emilia.uid),{actor:0});
 assert.equal(s.pending,null);
 assert.equal(discounts(s).length,1);
 assert.equal(discounts(s)[0].filter.printedRequiredEnergyAtMost,1);
 assert.equal(discounts(s)[0].filter.cardType,'event');
 for(const id of ['REZ-2-068','REZ-2-068','REZ-2-068','REZ-2-068']){
  const gone=take(s,0,id);s.players[0].outside.push(gone);
 }
 const trust=take(s,0,'REZ-2-067');s.players[0].hand.push(trust);
 const green=take(s,0,'REZ-2-049');green.ready=true;s.players[0].energy[2]=green;
 const pip=take(s,0,'REZ-2-055');pip.ready=true;s.players[0].energy[3]=pip;
 for(const ap of s.players[0].apCards)ap.ready=false;
 assert.equal(eventPlay(s,trust.uid),undefined);
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 s=dispatchUniversalAction(rezPacks,s,eventPlay(s,trust.uid),{actor:0});
 assert.equal(discounts(s).length,1);
 assert.equal(s.players[0].outside.some(c=>c.uid===trust.uid),true);

 let later=fresh(emiliaDeck,2012);
 const big=take(later,0,'REZ-2-005');big.ready=true;later.players[0].energy[0]=big;
 const one=take(later,0,'REZ-2-004');one.ready=true;later.players[0].energy[1]=one;
 for(let n=0;n<4;n++)later.players[0].outside.push(take(later,0,'REZ-2-068'));
 const first=take(later,0,'REZ-2-011');later.players[0].hand.push(first);
 later=toPhase(rezPacks,later,'main');
 later=dispatchUniversalAction(rezPacks,later,play(later,first.uid),{actor:0});
 assert.equal(discounts(later)[0].filter.printedRequiredEnergyAtMost,3);
 const second=take(later,0,'REZ-2-011');later.players[0].hand.push(second);
 later.players[0].apCards[1].inPlay=true;later.players[0].apCards[1].ready=true;
 later=dispatchUniversalAction(rezPacks,later,play(later,second.uid),{actor:0});
 assert.equal(discounts(later).length,1);
 const spell=take(later,0,'REZ-2-067');later.players[0].hand.push(spell);
 const g2=take(later,0,'REZ-2-049');g2.ready=true;later.players[0].energy[2]=g2;
 const g1=take(later,0,'REZ-2-055');g1.ready=true;later.players[0].energy[3]=g1;
 for(const ap of later.players[0].apCards)ap.ready=false;
 assert.ok(eventPlay(later,spell.uid));
 later=dispatchUniversalAction(rezPacks,later,eventPlay(later,spell.uid),{actor:0});
 assert.equal(discounts(later).length,0);

 let step=fresh(emiliaDeck,2013);
 step=toPhase(rezPacks,step,'move');
 const walker=take(step,0,'REZ-2-011');walker.ready=true;step.players[0].front[0]=walker;
 const plain=take(step,0,'REZ-2-055');plain.ready=true;step.players[0].front[1]=plain;
 assert.ok(legalUniversalActions(rezPacks,step).some(a=>a.type==='step'&&a.uid===walker.uid));
 assert.equal(legalUniversalActions(rezPacks,step).some(a=>a.type==='step'&&a.uid===plain.uid),false);
 const chosen=legalUniversalActions(rezPacks,step).find(a=>a.type==='step'&&a.uid===walker.uid);
 step=dispatchUniversalAction(rezPacks,step,chosen,{actor:0});
 assert.equal(step.players[0].energy.some(c=>c?.uid===walker.uid),true);
 assert.equal(step.players[0].front[0],null);
 assert.equal(universalPublicView(rezPacks,step,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(rezPacks,step),true);
});

test('REZ-2-010 bounces one low-energy Rem only while every character is Rem',()=>{
 const printed=REZERO_VOL2_BY_ID['REZ-2-010'];
 assert.match(printed.effectJa,/自分の場にあるキャラが全て〈レム〉/);
 assert.match(printed.effectJa,/必要エナジーが3以下/);
 assert.match(printed.effectJa,/\[レイド\]を持たない〈レム〉の消費APを-1/);
 assert.match(printed.note,/Q2403/);
 assert.deepEqual(rez.cards['REZ-2-010'].effects.onPlay,[{
  op:'allNamedEnergyBounce',name:'レム',maxEnergy:3,once:'name',
  discountName:'レム',discountNoRaid:true
 }]);
 assert.deepEqual(validateUniversalDeck(rez,remDeck),[]);
 let blocked=fresh(remDeck,2010);
 const ram=take(blocked,0,'REZ-2-004');ram.ready=true;blocked.players[0].front[0]=ram;
 for(const id of ['REZ-2-007','REZ-2-008','REZ-2-009']){
  const gen=take(blocked,0,id);gen.ready=true;
  blocked.players[0].energy[['REZ-2-007','REZ-2-008','REZ-2-009'].indexOf(id)]=gen;
 }
 const early=take(blocked,0,'REZ-2-010');blocked.players[0].hand.push(early);
 blocked=toPhase(rezPacks,blocked,'main');
 blocked=dispatchUniversalAction(rezPacks,blocked,play(blocked,early.uid),{actor:0});
 assert.equal(blocked.pending,null);
 assert.equal(blocked.onceEffectUses[0].length,0);

 let s=fresh(remDeck,2014);
 const ids=['REZ-2-007','REZ-2-008','REZ-2-009'];
 for(let i=0;i<3;i++){
  const gen=take(s,0,ids[i]);gen.ready=true;s.players[0].energy[i]=gen;
 }
 const rem=take(s,0,'REZ-2-010');s.players[0].hand.push(rem);
 s=toPhase(rezPacks,s,'main');
 s=dispatchUniversalAction(rezPacks,s,play(s,rem.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-named-energy-bounce');
 const low=s.players[0].energy.find(c=>c?.cardId==='REZ-2-007');
 assert.ok(s.pending.choices.includes(rem.uid));
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(universalPublicView(rezPacks,s,1).pending.kind,'effect-named-energy-bounce');
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseNamedEnergyBounce',uid:'0-nope'},{actor:0}),
  /not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseNamedEnergyBounce',uid:null},{actor:0});
 assert.equal(discounts(s).length,0);
 const again=take(s,0,'REZ-2-010');s.players[0].hand.push(again);
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 s=dispatchUniversalAction(rezPacks,s,play(s,again.uid,'energy'),{actor:0});
 assert.equal(s.pending,null);

 let armed=fresh(remDeck,2015);
 for(let i=0;i<3;i++){
  const gen=take(armed,0,ids[i]);gen.ready=true;armed.players[0].energy[i]=gen;
 }
 const body=take(armed,0,'REZ-2-010');armed.players[0].hand.push(body);
 armed=toPhase(rezPacks,armed,'main');
 armed=dispatchUniversalAction(rezPacks,armed,play(armed,body.uid),{actor:0});
 const target=armed.players[0].energy.find(c=>c?.cardId==='REZ-2-007');
 armed=dispatchUniversalAction(rezPacks,armed,{type:'chooseNamedEnergyBounce',uid:target.uid},{actor:0});
 assert.equal(armed.players[0].hand.some(c=>c.uid===target.uid),true);
 assert.deepEqual(discounts(armed)[0].filter,{name:'レム',noRaid:true});
 const other=take(armed,0,'REZ-2-004');armed.players[0].hand.push(other);
 for(const ap of armed.players[0].apCards)ap.ready=false;
 assert.equal(play(armed,other.uid),undefined);
 armed.players[0].apCards[1].inPlay=true;armed.players[0].apCards[1].ready=true;
 armed=dispatchUniversalAction(rezPacks,armed,play(armed,other.uid),{actor:0});
 assert.equal(discounts(armed).length,1);
 for(const ap of armed.players[0].apCards)ap.ready=false;
 assert.ok(play(armed,target.uid,'energy'));
 armed=dispatchUniversalAction(rezPacks,armed,play(armed,target.uid,'energy'),{actor:0});
 assert.equal(discounts(armed).length,0);
 assert.equal(assertUniversalMatch(rezPacks,armed),true);
});

test('a Raid Rem does not take the discount and energy above 3 is not a bounce',()=>{
 const filler=id=>({id,name:'余',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const pack=createUniversalPack({id:'rez-010-fixture',version:'1',cards:[
  {id:'SRC',name:'レム',color:'yellow',type:'character',energy:0,ap:1,bp:3000,gen:1,
   trigger:'get',implementation:'dsl',effects:{onPlay:[
    {op:'allNamedEnergyBounce',name:'レム',maxEnergy:3,once:'name',
     discountName:'レム',discountNoRaid:true}]}},
  {id:'LOW',name:'レム',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'HIGH',name:'レム',color:'yellow',type:'character',energy:4,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'RAID',name:'レム',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:'raid',raidName:'レム',implementation:'vanilla',effects:{}},
  ...Array.from({length:9},(_,i)=>filler('Y'+i))
 ]});
 const ids=['SRC','LOW','HIGH','RAID',...Array.from({length:9},(_,i)=>'Y'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.Y8=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2016,first:0});
 const takeId=(id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error('Missing '+id);
 };
 const high=takeId('HIGH');high.ready=true;s.players[0].front[0]=high;
 const low=takeId('LOW');low.ready=true;s.players[0].energy[0]=low;
 const src=takeId('SRC');s.players[0].hand.push(src);
 s=toPhase(packs,s,'main');
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'),{actor:0});
 assert.deepEqual(s.pending.choices.sort(),[src.uid,low.uid].sort());
 assert.equal(s.pending.choices.includes(high.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseNamedEnergyBounce',uid:low.uid},{actor:0});
 const raid=takeId('RAID');s.players[0].hand.push(raid);
 for(const ap of s.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===raid.uid),false);
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===raid.uid&&a.line==='energy'),{actor:0});
 assert.equal(s.continuousStates.filter(e=>e.kind==='nextEligibleHandPlayApDiscount').length,1);
 for(const ap of s.players[0].apCards)ap.ready=false;
 const returned=s.players[0].hand.find(c=>c.uid===low.uid);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===returned.uid));
 assert.equal(matchesPrintedPlayFilter(pack.cards.RAID,{name:'レム',noRaid:true}),false);
 assert.equal(matchesPrintedPlayFilter(pack.cards.LOW,{name:'レム',noRaid:true}),true);
 assert.throws(()=>createUniversalPack({id:'bad-scale',cards:[
  {id:'Z',name:'エミリア',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'dsl',effects:{onPlay:[
    {op:'nextScaledEventApDiscount',once:'card',cardType:'event',baseEnergy:1,perOutsideEvents:2}]}}
 ]}),/invalid scaled event AP discount/);
});
