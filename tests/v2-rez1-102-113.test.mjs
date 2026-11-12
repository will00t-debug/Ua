// UA40ST/REZ-1-102–113. Official pages and the 106 raid panel checked 2026-11-11.
// The printed product is the starter UA40ST. These cases play the catalogue cards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRezeroV2Pack} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact
} from '../dist/universal-v2/engine.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const FILL=['REZ-1-007','REZ-1-043','REZ-1-055','REZ-1-068','REZ-1-072','REZ-1-048',
 'REZ-1-037','REZ-1-014','REZ-1-036','REZ-1-038','REZ-1-012','REZ-1-073','REZ-1-056',
 'REZ-1-094','REZ-1-045','REZ-1-076'];
const FILL_NO_COLOR=FILL.filter(id=>id!=='REZ-1-076');
function counts(extra,fill=FILL){
 const c={...extra};
 let n=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of fill){
  const add=Math.min(4-(c[id]||0),50-n);
  if(add>0){c[id]=(c[id]||0)+add;n+=add;}
  if(n===50)break;
 }
 assert.equal(n,50);
 assert.deepEqual(validateUniversalDeck(pack,c),[]);
 return c;
}
const fresh=(seed,extra,fill)=>newUniversalMatch(packs,{
 decks:[counts(extra,fill),counts(extra,fill)],first:0,seed
});
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function fuel(s,ids,p=0){
 ids.forEach((id,i)=>{
  const card=pull(s,p,id);
  card.ready=false;
  s.players[p].energy[i]=card;
 });
}
function seat(s,p,id,line,slot,ready=true){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function legal(s){return legalUniversalActions(packs,s);}
function act(s,action){return dispatchUniversalAction(packs,s,action);}
function reach(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++){
  const next=legal(s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase+' '+(s.pending?.kind||s.phase));
  s=act(s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function walk(s,done){
 for(let guard=0;guard<80&&!done(s);guard++){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
  }else if(s.pending?.kind==='block'){
   s=act(s,{type:'chooseBlock',uid:null});
  }else{
   const next=legal(s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=act(s,next);
  }
 }
 assert.ok(done(s),'walk missed '+(s.pending?.kind||s.phase));
 return s;
}
function play(s,id,line='front'){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [act(s,action),card];
}
function cast(s,id,p=0){
 const card=pull(s,p,id);
 s.players[p].hand.push(card);
 const action=legal(s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id);
 return [act(s,action),card];
}
function setTop(s,p,ids){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function live(s,uid){
 for(const pl of s.players){
  for(const zone of ['front','energy','hand','deck','outside','life','removed']){
   const found=(pl[zone]||[]).find(c=>c?.uid===uid);
   if(found)return found;
  }
 }
 throw Error('Missing physical '+uid);
}
function readyAp(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function order(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=act(s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function keepLook(s){
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 const uids=[...s.pending.uids];
 s=act(s,{type:'chooseInspectedOutside',uid:null});
 return order(s,uids);
}
function nullLife(s,p,id,n=1){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life=Array.from({length:n},()=>pull(s,p,id));
}

test('every life symbol on 102-113 resolves on that card',()=>{
 const rows=[
  ['REZ-1-102','active'],['REZ-1-103','active'],['REZ-1-104','active'],
  ['REZ-1-105',null],['REZ-1-107','get'],['REZ-1-108','get'],
  ['REZ-1-109',null],['REZ-1-110',null],['REZ-1-111',null],
  ['REZ-1-112',null],['REZ-1-113','draw']
 ];
 rows.forEach(([id,symbol],index)=>{
  let s=fresh(10200+index,{[id]:1,'REZ-1-036':1});
  const attacker=seat(s,0,'REZ-1-036','front',0,true);
  s.players[1].deck.push(...s.players[1].life.splice(0));
  s.players[1].life=[pull(s,1,id)];
  s=walk(s,x=>x.phase==='attack'&&!x.pending&&x.active===0);
  s=act(s,{type:'attack',uid:attacker.uid});
  if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
  if(!symbol){
   assert.equal(s.pending,null,id);
   assert.equal(s.players[1].outside.some(c=>c.cardId===id),true,id);
  }else{
   assert.equal(s.pending.kind,'life-trigger',id);
   assert.equal(s.pending.trigger,symbol,id);
   if(symbol==='active'){
    const rested=seat(s,1,'REZ-1-007','front',0,false);
    s=act(s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
    assert.equal(live(s,rested.uid).ready,true,id);
    assert.equal(universalBp(packs,s,live(s,rested.uid)),5000,id);
    assert.equal(s.players[1].outside.some(c=>c.cardId===id),true,id);
   }else if(symbol==='get'){
    s=act(s,{type:'chooseTrigger',mode:'get'});
    assert.equal(s.players[1].hand.some(c=>c.cardId===id),true,id);
    assert.equal(s.players[1].outside.some(c=>c.cardId===id),false,id);
   }else if(symbol==='draw'){
    const hand=s.players[1].hand.length;
    s=act(s,{type:'chooseTrigger',mode:'draw'});
    assert.equal(s.players[1].hand.length,hand+1,id);
    assert.equal(s.players[1].outside.some(c=>c.cardId===id),true,id);
   }
  }
  assert.equal(assertUniversalMatch(packs,s),true,id);
 });
});

test('106 life trigger raids onto Emilia when energy is paid and can still be taken to hand',()=>{
 let raid=fresh(10610,{'REZ-1-106':1,'REZ-1-022':1,'REZ-1-036':1});
 const attacker=seat(raid,0,'REZ-1-036','front',0,true);
 fuel(raid,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007'],1);
 const base=seat(raid,1,'REZ-1-022','front',0,true);
 raid.players[1].deck.push(...raid.players[1].life.splice(0));
 raid.players[1].life=[pull(raid,1,'REZ-1-106')];
 assert.equal(universalEnergyByColor(packs,raid,1).yellow,4);
 raid=walk(raid,x=>x.phase==='attack'&&!x.pending&&x.active===0);
 raid=act(raid,{type:'attack',uid:attacker.uid});
 if(raid.pending?.kind==='block')raid=act(raid,{type:'chooseBlock',uid:null});
 assert.equal(raid.pending.trigger,'raid');
 const onto=legal(raid).find(a=>a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(onto);
 raid=act(raid,onto);
 const top=raid.players[1].front.find(c=>c?.cardId==='REZ-1-106');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'REZ-1-022');
 assert.equal(raid.zoneMoveEvents.some(e=>e.uid===top.uid&&
  (e.from==='outside'||e.from==='lifeRevealed')&&e.to==='front'&&
  e.reason==='life-trigger'),true);
 assert.equal(assertUniversalMatch(packs,raid),true);

 let hand=fresh(10611,{'REZ-1-106':1,'REZ-1-036':1});
 const swing=seat(hand,0,'REZ-1-036','front',0,true);
 hand.players[1].deck.push(...hand.players[1].life.splice(0));
 hand.players[1].life=[pull(hand,1,'REZ-1-106')];
 hand=walk(hand,x=>x.phase==='attack'&&!x.pending&&x.active===0);
 hand=act(hand,{type:'attack',uid:swing.uid});
 if(hand.pending?.kind==='block')hand=act(hand,{type:'chooseBlock',uid:null});
 assert.equal(hand.pending.trigger,'raid');
 assert.equal(legal(hand).some(a=>a.mode==='raid'),false);
 hand=act(hand,{type:'chooseTrigger',mode:'get'});
 assert.equal(hand.players[1].hand.some(c=>c.cardId==='REZ-1-106'),true);
 assert.equal(assertUniversalMatch(packs,hand),true);
});

test('Reinhard gains 1000 only while his own Felt is on the field',()=>{
 let s=fresh(10201,{'REZ-1-102':1,'REZ-1-028':1});
 const reinhard=seat(s,0,'REZ-1-102','front',0,true);
 assert.equal(universalBp(packs,s,reinhard),3000);
 const foe=seat(s,1,'REZ-1-028','front',0,true);
 assert.equal(universalBp(packs,s,reinhard),3000);
 s.players[1].outside.push(s.players[1].front[0]);
 s.players[1].front[0]=null;
 assert.equal(universalBp(packs,s,reinhard),3000);
 const own=seat(s,0,'REZ-1-028','front',1,true);
 assert.equal(universalBp(packs,s,reinhard),4000);
 s.players[0].outside.push(own);
 s.players[0].front[1]=null;
 assert.equal(universalBp(packs,s,live(s,reinhard.uid)),3000);
 assert.equal(foe.cardId,'REZ-1-028');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Rem 104 lowers a front only until this turn ends',()=>{
 let s=fresh(10401,{'REZ-1-104':1});
 fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 readyAp(s,2);
 s=reach(s,'main');
 const mid=seat(s,1,'REZ-1-012','front',0,true);
 assert.equal(universalBp(packs,s,mid),1500);
 let rem;
 [s,rem]=play(s,'REZ-1-104');
 assert.equal(live(s,rem.uid).ready,true);
 assert.equal(s.pending.kind,'effect-target-many');
 assert.equal(s.pending.maxTargets,2);
 s=act(s,{type:'chooseTargetMany',uid:mid.uid});
 s=act(s,{type:'chooseTargetMany',uid:null});
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,live(s,mid.uid)),500);
 const turn=s.turn;
 s=walk(s,x=>x.turn===turn+1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,s,live(s,mid.uid)),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Emilia 105 loses the event bonus on her next turn',()=>{
 let s=fresh(10501,{'REZ-1-105':1,'REZ-1-029':1,'REZ-1-024':1});
 const emilia=seat(s,0,'REZ-1-105','front',0,true);
 fuel(s,['REZ-1-024','REZ-1-007']);
 readyAp(s,1);
 s=reach(s,'main');
 assert.equal(universalBp(packs,s,live(s,emilia.uid)),3000);
 [s]=cast(s,'REZ-1-029');
 if(s.pending?.kind==='effect-recover-ap')
  s=act(s,{type:'chooseApRecovery',uid:null});
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,live(s,emilia.uid)),4000);
 const turn=s.turn;
 s=walk(s,x=>x.active===0&&x.phase==='main'&&x.turn>turn&&!x.pending);
 assert.equal(s.players[0].ownTurns,2);
 assert.equal(universalBp(packs,s,live(s,emilia.uid)),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Emilia 106 does not gain impact or the attack look without a raid stack',()=>{
 assert.equal(raidBoxListed('REZ-1-106','onAttack'),true);
 assert.equal(raidBoxListed('REZ-1-106','passive'),true);
 let s=fresh(10601,{'REZ-1-106':1,'REZ-1-109':4,'REZ-1-029':2});
 fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const events=['REZ-1-109','REZ-1-109','REZ-1-109','REZ-1-109','REZ-1-029','REZ-1-029']
  .map(id=>pull(s,0,id));
 s.players[0].outside.push(...events);
 if(!s.players[0].life.length)s.players[0].life.push(s.players[0].deck.pop());
 nullLife(s,1,'REZ-1-014',1);
 readyAp(s,1);
 s=reach(s,'main');
 let emilia;
 [s,emilia]=play(s,'REZ-1-106');
 assert.equal(s.pending,null);
 assert.equal(live(s,emilia.uid).ready,false);
 assert.equal(live(s,emilia.uid).stack?.length||0,0);
 assert.equal(universalImpact(packs,s,live(s,emilia.uid)),0);
 const turn=s.turn;
 s=walk(s,x=>x.active===0&&x.phase==='attack'&&x.turn>turn&&!x.pending);
 const body=s.players[0].front.find(c=>c.uid===emilia.uid);
 assert.equal(universalImpact(packs,s,body),0);
 const deck=s.players[0].deck.length;
 s=act(s,{type:'attack',uid:body.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].deck.length,deck);
 s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Felt block protection ends at the next turn',()=>{
 let s=fresh(10701,{'REZ-1-107':1,'REZ-1-053':1});
 fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007']);
 readyAp(s,1);
 s=reach(s,'main');
 let felt;
 [s,felt]=play(s,'REZ-1-107');
 if(s.pending?.kind==='effect-optional-pay-ap')
  s=act(s,{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(s.pending,null);
 assert.equal(live(s,felt.uid).ready,false);
 const played=s.turn;
 s=walk(s,x=>x.active===0&&x.phase==='main'&&x.turn>played&&!x.pending);
 assert.equal(live(s,felt.uid).ready,true);
 const payment=s.players[0].hand[0];
 assert.ok(payment);
 const activate=legal(s).find(a=>a.type==='activate'&&a.mode==='handBlock'&&a.uid===felt.uid);
 assert.ok(activate);
 s=act(s,activate);
 assert.equal(s.pending.kind,'effect-hand-block');
 s=act(s,{type:'chooseHandBlock',uid:payment.uid});
 assert.equal(live(s,felt.uid).blockAtLeastGranted.bp,4000);
 const wall=seat(s,1,'REZ-1-053','front',0,true);
 nullLife(s,1,'REZ-1-014',2);
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:felt.uid});
 assert.equal(legal(s).some(a=>a.type==='chooseBlock'&&a.uid===wall.uid),false);
 const granted=s.turn;
 s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending,null);
 s=walk(s,x=>x.active===0&&x.phase==='attack'&&x.turn>granted&&!x.pending);
 assert.equal(live(s,felt.uid).blockAtLeastGranted,undefined);
 s=act(s,{type:'attack',uid:felt.uid});
 assert.equal(legal(s).some(a=>a.type==='chooseBlock'&&a.uid===wall.uid),true);
 s=act(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.players[0].front.some(c=>c?.uid===felt.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===wall.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Rem 110 generates blue only for her own front-line Subaru',()=>{
 let s=fresh(11001,{'REZ-1-110':1});
 const rem=seat(s,0,'REZ-1-110','energy',0,false);
 assert.equal(universalEnergyByColor(packs,s,0).blue,1);
 const foe=seat(s,1,'REZ-1-068','front',0,true);
 assert.equal(universalEnergyByColor(packs,s,0).blue,1);
 const own=seat(s,0,'REZ-1-068','front',0,true);
 assert.equal(universalEnergyByColor(packs,s,0).blue,2);
 s.players[0].energy[1]=own;
 s.players[0].front[0]=null;
 assert.equal(universalEnergyByColor(packs,s,0).blue,1);
 assert.equal(foe.cardId,'REZ-1-068');
 assert.equal(rem.cardId,'REZ-1-110');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Crusch and Ferris sends one looked card outside and is accepted as Crusch',()=>{
 let s=fresh(11101,{'REZ-1-111':1,'REZ-1-066':1});
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 readyAp(s,2);
 const top=setTop(s,0,['REZ-1-012','REZ-1-068']);
 s=reach(s,'main');
 const slash=pull(s,0,'REZ-1-066');
 s.players[0].hand.push(slash);
 assert.equal(legal(s).some(a=>a.type==='event'&&a.uid===slash.uid),false);
 let alias;
 [s,alias]=play(s,'REZ-1-111');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 assert.deepEqual(s.pending.uids.slice().sort(),top.map(c=>c.uid).sort());
 s=act(s,{type:'chooseInspectedOutside',uid:top[0].uid});
 s=act(s,{type:'chooseInspectedOutside',uid:null});
 s=order(s,[top[1].uid]);
 assert.equal(s.players[0].outside.some(c=>c.uid===top[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,top[1].uid);
 assert.equal(live(s,alias.uid).cardId,'REZ-1-111');
 const victim=seat(s,1,'REZ-1-012','front',0,true);
 assert.equal(legal(s).some(a=>a.type==='event'&&a.uid===slash.uid),true);
 [s]=cast(s,'REZ-1-066');
 assert.equal(s.pending.kind,'effect-retire-at-most');
 assert.equal(s.pending.choices.includes(victim.uid),true);
 s=act(s,legal(s).find(a=>a.uid===victim.uid));
 assert.equal(s.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(s.players[0].handCharacterBpMay.amount,1000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Beatrice gains 500 after a character raids from the deck',()=>{
 let s=fresh(11201,{'REZ-1-112':1,'REZ-1-077':1,'REZ-1-097':1,'REZ-1-086':3});
 fuel(s,['REZ-1-086','REZ-1-086','REZ-1-086']);
 readyAp(s,3);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).purple,3);
 let base,beatrice;
 [s,base]=play(s,'REZ-1-072');
 [s,beatrice]=play(s,'REZ-1-112');
 assert.equal(s.pending,null);
 assert.equal(live(s,beatrice.uid).ready,false);
 assert.equal(universalBp(packs,s,live(s,beatrice.uid)),3500);
 setTop(s,0,['REZ-1-077','REZ-1-007','REZ-1-014']);
 [s]=cast(s,'REZ-1-097');
 s=keepLook(s);
 assert.equal(s.pending.kind,'effect-deck-named-play');
 assert.equal(s.players[0].deck[0].cardId,'REZ-1-077');
 const raid=legal(s).find(a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
 assert.ok(raid);
 s=act(s,raid);
 assert.equal(universalBp(packs,s,live(s,beatrice.uid)),4000);
 const raider=s.players[0].front.find(c=>c?.cardId==='REZ-1-077');
 assert.equal(raider.ready,true);
 assert.equal(raider.stack[0].uid,base.uid);
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===raider.uid&&e.from==='deck'&&
  e.to==='front'&&e.reason==='own-effect'),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Echidna adds the real sanctuary trial only after a hand or rest payment',()=>{
 const extra={'REZ-1-113':1,'REZ-1-098':2,'REZ-1-109':1};
 function open(){
  let s=fresh(11300+open.n++,extra,FILL_NO_COLOR);
  fuel(s,['REZ-1-068','REZ-1-068','REZ-1-068']);
  readyAp(s,2);
  s.players[0].outside.push(...s.players[0].hand.splice(0));
  return reach(s,'main');
 }
 open.n=1;

 let unpaid=open();
 const trial=pull(unpaid,0,'REZ-1-098');
 unpaid.players[0].outside.push(trial);
 let body;
 [unpaid,body]=play(unpaid,'REZ-1-113');
 assert.equal(unpaid.pending,null);
 assert.equal(live(unpaid,body.uid).ready,false);
 assert.equal(unpaid.players[0].outside.some(c=>c.uid===trial.uid),true);

 let skipped=open();
 const kept=pull(skipped,0,'REZ-1-098');
 const spare=pull(skipped,0,'REZ-1-012');
 skipped.players[0].outside.push(kept);
 skipped.players[0].hand.push(spare);
 [skipped]=play(skipped,'REZ-1-113');
 assert.equal(skipped.pending.kind,'effect-pay-named');
 skipped=act(skipped,{type:'choosePayNamed',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===kept.uid),true);

 let discarded=open();
 const taken=pull(discarded,0,'REZ-1-098');
 const other=pull(discarded,0,'REZ-1-109');
 const payment=pull(discarded,0,'REZ-1-012');
 discarded.players[0].outside.push(taken,other);
 discarded.players[0].hand.push(payment);
 [discarded]=play(discarded,'REZ-1-113');
 discarded=act(discarded,{type:'choosePayNamed',mode:'hand',uid:payment.uid});
 assert.equal(discarded.pending,null);
 assert.equal(discarded.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(discarded.players[0].hand.some(c=>c.uid===taken.uid),true);
 assert.equal(discarded.players[0].outside.some(c=>c.uid===other.uid),true);

 let rested=open();
 const front=seat(rested,0,'REZ-1-007','front',0,true);
 const recovered=pull(rested,0,'REZ-1-098');
 rested.players[0].outside.push(recovered);
 [rested]=play(rested,'REZ-1-113');
 const rest=legal(rested).find(a=>a.type==='choosePayNamed'&&a.mode==='rest'&&a.uid===front.uid);
 assert.ok(rest);
 rested=act(rested,rest);
 assert.equal(live(rested,front.uid).ready,false);
 assert.equal(rested.players[0].hand.some(c=>c.uid===recovered.uid),true);

 let many=open();
 const first=pull(many,0,'REZ-1-098');
 const second=pull(many,0,'REZ-1-098');
 const decoy=pull(many,0,'REZ-1-109');
 const cost=pull(many,0,'REZ-1-012');
 many.players[0].outside.push(first,second,decoy);
 many.players[0].hand.push(cost);
 [many]=play(many,'REZ-1-113');
 many=act(many,{type:'choosePayNamed',mode:'hand',uid:cost.uid});
 assert.equal(many.pending.kind,'effect-add-named');
 assert.deepEqual(many.pending.choices.slice().sort(),[first.uid,second.uid].sort());
 assert.equal(many.pending.choices.includes(decoy.uid),false);
 assert.equal(legal(many).some(a=>a.uid===null),false);
 many=act(many,{type:'chooseAddNamed',uid:first.uid});
 assert.equal(many.players[0].hand.some(c=>c.uid===first.uid),true);
 assert.equal(many.players[0].outside.some(c=>c.uid===second.uid),true);
 assert.equal(many.players[0].outside.some(c=>c.uid===decoy.uid),true);

 let foreign=open();
 const theirs=pull(foreign,1,'REZ-1-098');
 foreign.players[1].outside.push(theirs);
 foreign.players[0].hand.push(pull(foreign,0,'REZ-1-012'));
 [foreign]=play(foreign,'REZ-1-113');
 assert.equal(foreign.pending,null);
 assert.equal(foreign.players[1].outside.some(c=>c.uid===theirs.uid),true);

 for(const state of [unpaid,skipped,discarded,rested,many,foreign])
  assert.equal(assertUniversalMatch(packs,state),true);
});
