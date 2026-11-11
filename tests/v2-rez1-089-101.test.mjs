// UA40BT/REZ-1-089–101. Official pages and card images checked 2026-11-11.
// Each case plays that card. A shared sentence on another number is not evidence.
// 101 is the starter printing UA40ST/REZ-1-101.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRezeroV2Pack} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 universalImpactNull,universalPrivateChoices,universalPublicView
} from '../dist/universal-v2/engine.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const CORE=['REZ-1-086','REZ-1-068','REZ-1-006','REZ-1-007','REZ-1-008','REZ-1-014',
 'REZ-1-072','REZ-1-067','REZ-1-081','REZ-1-069','REZ-1-043','REZ-1-036','REZ-1-016',
 'REZ-1-053','REZ-1-098','REZ-1-091','REZ-1-077'];
const FILL=[...CORE,'REZ-1-038','REZ-1-076'];
function counts(extra){
 const c={...extra};
 let n=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of [...CORE,...FILL]){
  const add=Math.min(4-(c[id]||0),50-n);
  if(add>0){c[id]=(c[id]||0)+add;n+=add;}
  if(n===50)break;
 }
 assert.equal(n,50);
 assert.deepEqual(validateUniversalDeck(pack,c),[]);
 return c;
}
const fresh=(seed,extra)=>newUniversalMatch(packs,{decks:[counts(extra),counts(extra)],first:0,seed});
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
  card.ready=true;
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
function purple(s,need,count=4){
 fuel(s,Array.from({length:count},()=>'REZ-1-086'));
 s=reach(s,'main');
 s.players[0].energy.forEach(c=>{if(c)c.ready=true;});
 assert.ok(universalEnergyByColor(packs,s,0).purple>=need);
 return s;
}
function quietLife(s,p){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life.unshift(pull(s,p,'REZ-1-069'));
}
function order(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=act(s,{type:'chooseTopOrder',uid});
 }
 return s;
}

test('089, 090 and 093 print outside the raid panel',()=>{
 for(const feature of ['onPlay','onAttack','main','passive','blockBpRestriction','unblockedRestFront']){
  assert.equal(raidBoxListed('REZ-1-089',feature),false,feature);
  assert.equal(raidBoxListed('REZ-1-090',feature),false,feature);
  assert.equal(raidBoxListed('REZ-1-093',feature),false,feature);
 }
 assert.equal(pack.cards['REZ-1-089'].impactNull,true);
 assert.equal(pack.cards['REZ-1-089'].raidImpactNull,false);
 assert.equal(pack.cards['REZ-1-051'].effects.onPlay.length,1);
 assert.equal(raidBoxListed('REZ-1-051','onPlay'),true);
});

test('REZ-1-089 blocks, rests and swaps without a raid stack',()=>{
 let s=purple(fresh(8901,{'REZ-1-089':2,'REZ-1-053':1,'REZ-1-069':2}),5);
 const low=seat(s,1,'REZ-1-006','front',0,true);
 const even=seat(s,1,'REZ-1-068','front',1,true);
 const tall=seat(s,1,'REZ-1-014','front',2,true);
 quietLife(s,1);
 let emilia;
 [s,emilia]=play(s,'REZ-1-089');
 assert.equal(s.pending,null);
 assert.equal(live(s,emilia.uid).ready,false);
 assert.equal(live(s,emilia.uid).stack?.length||0,0);
 assert.equal(universalImpactNull(packs,s,live(s,emilia.uid)),true);
 assert.equal(legal(s).some(a=>a.mode==='energySwap'&&a.uid===emilia.uid),false);
 live(s,emilia.uid).ready=true;
 s=walk(s,x=>x.phase==='attack'&&!x.pending);
 const life=s.players[1].life.length;
 s=act(s,{type:'attack',uid:emilia.uid});
 assert.equal(s.pending.kind,'block');
 const blocks=legal(s).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===even.uid),false);
 assert.equal(blocks.some(a=>a.uid===tall.uid),true);
 const boosted=structuredClone(s);
 boosted.players[1].front[0].buffs=[{bp:1500,untilTurn:boosted.turn}];
 assert.equal(universalBp(packs,boosted,boosted.players[1].front[0]),2500);
 assert.equal(legal(boosted).some(a=>a.type==='chooseBlock'&&a.uid===low.uid),true);
 let skipped=structuredClone(s);
 skipped=act(skipped,{type:'chooseBlock',uid:null});
 assert.equal(skipped.pending.kind,'effect-unblocked-rest');
 assert.equal(skipped.pending.optional,true);
 assert.equal(skipped.players[1].life.length,life);
 skipped=act(skipped,{type:'chooseUnblockedRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].life.length,life-1);
 assert.equal(live(skipped,low.uid).ready,true);
 s=act(s,{type:'chooseBlock',uid:null});
 s=act(s,{type:'chooseUnblockedRest',uid:low.uid});
 assert.equal(live(s,low.uid).ready,false);
 assert.equal(live(s,even.uid).ready,true);
 assert.equal(s.players[1].life.length,life-1);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);

 let shield=purple(fresh(8902,{'REZ-1-089':1,'REZ-1-053':1,'REZ-1-069':2}),5);
 let body;
 [shield,body]=play(shield,'REZ-1-089');
 const hitter=seat(shield,1,'REZ-1-053','front',0,true);
 quietLife(shield,0);
 shield=walk(shield,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 const ownLife=shield.players[0].life.length;
 shield=act(shield,{type:'attack',uid:hitter.uid});
 assert.equal(shield.pending.kind,'block');
 shield=act(shield,{type:'chooseBlock',uid:body.uid});
 assert.equal(shield.pending,null);
 assert.equal(shield.players[0].life.length,ownLife);
 assert.equal(shield.players[0].outside.some(c=>c.uid===body.uid),true);
 assert.equal(assertUniversalMatch(packs,shield),true);

 let swap=purple(fresh(8903,{'REZ-1-089':1}),5);
 let mover;
 [swap,mover]=play(swap,'REZ-1-089');
 const from=swap.players[0].front.findIndex(c=>c?.uid===mover.uid);
 const held=swap.players[0].front[from];
 const displaced=swap.players[0].energy[0];
 swap.players[0].front[from]=displaced;
 swap.players[0].energy[0]=held;
 assert.equal(legal(swap).some(a=>a.mode==='energySwap'&&a.uid===mover.uid),true);
 const bare=structuredClone(swap);
 bare.players[0].deck.push(...bare.players[0].front.filter(Boolean));
 bare.players[0].front=[null,null,null,null];
 assert.equal(legal(bare).some(a=>a.mode==='energySwap'&&a.uid===mover.uid),false);
 swap=act(swap,{type:'activate',uid:mover.uid,mode:'energySwap'});
 assert.equal(swap.pending.kind,'effect-energy-swap');
 assert.ok(swap.pending.choices.includes(displaced.uid));
 assert.equal(swap.pending.choices.includes(mover.uid),false);
 swap=act(swap,{type:'chooseEnergySwap',uid:displaced.uid});
 assert.equal(swap.players[0].front[from].uid,mover.uid);
 assert.equal(swap.players[0].energy[0].uid,displaced.uid);
 const back=swap.players[0].front[from];
 swap.players[0].front[from]=swap.players[0].energy[0];
 swap.players[0].energy[0]=back;
 assert.equal(legal(swap).some(a=>a.mode==='energySwap'&&a.uid===mover.uid),false);
 assert.equal(assertUniversalMatch(packs,swap),true);
});

test('REZ-1-090 drops BP and readies from an ordinary play',()=>{
 let s=purple(fresh(9001,{'REZ-1-090':1,'REZ-1-067':1,'REZ-1-072':1}),6);
 const tall=seat(s,1,'REZ-1-067','front',0,true);
 const small=seat(s,1,'REZ-1-072','front',1,true);
 let emilia;
 [s,emilia]=play(s,'REZ-1-090');
 assert.equal(live(s,emilia.uid).stack?.length||0,0);
 assert.equal(live(s,emilia.uid).ready,false);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.bp,3500);
 let skipped=act(structuredClone(s),{type:'chooseTarget',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,tall.uid)),4000);
 assert.equal(legal(skipped).some(a=>a.mode==='restedRetireImpact'&&a.uid===emilia.uid),true);
 s=act(s,{type:'chooseTarget',uid:tall.uid});
 assert.equal(universalBp(packs,s,live(s,tall.uid)),500);
 assert.equal(live(s,tall.uid).uid,tall.uid);
 live(s,emilia.uid).ready=true;
 assert.equal(legal(s).some(a=>a.mode==='restedRetireImpact'&&a.uid===emilia.uid),false);
 live(s,emilia.uid).ready=false;
 const parked=structuredClone(s);
 const slot=parked.players[0].front.findIndex(c=>c?.uid===emilia.uid);
 const held=parked.players[0].front[slot];
 const displaced=parked.players[0].energy[3];
 parked.players[0].energy[3]=held;
 parked.players[0].front[slot]=displaced;
 assert.equal(legal(parked).some(a=>a.mode==='restedRetireImpact'&&a.uid===emilia.uid),false);
 let bare=structuredClone(s);
 bare.players[1].deck.push(bare.players[1].front[1]);
 bare.players[1].front[1]=null;
 bare.players[1].front[0].buffs=[{bp:2000,untilTurn:bare.turn}];
 assert.equal(universalBp(packs,bare,bare.players[1].front[0]),6000);
 bare=act(bare,{type:'activate',uid:emilia.uid,mode:'restedRetireImpact'});
 assert.equal(bare.pending,null);
 assert.equal(live(bare,emilia.uid).ready,true);
 assert.equal(universalImpact(packs,bare,live(bare,emilia.uid)),1);
 s=act(s,{type:'activate',uid:emilia.uid,mode:'restedRetireImpact'});
 assert.equal(s.pending.kind,'effect-rested-retire-impact');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.choices.includes(small.uid),true);
 assert.equal(s.pending.choices.includes(tall.uid),true);
 skipped=act(skipped,{type:'activate',uid:emilia.uid,mode:'restedRetireImpact'});
 assert.equal(skipped.pending.choices.includes(small.uid),true);
 assert.equal(skipped.pending.choices.includes(tall.uid),false);
 skipped=act(skipped,{type:'chooseRestedRetire',uid:null});
 let declined=act(structuredClone(s),{type:'chooseRestedRetire',uid:null});
 assert.equal(declined.players[1].front.some(c=>c?.uid===small.uid),true);
 assert.equal(live(declined,emilia.uid).ready,true);
 assert.equal(universalImpact(packs,declined,live(declined,emilia.uid)),1);
 s=act(s,{type:'chooseRestedRetire',uid:small.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===small.uid),true);
 assert.equal(live(s,emilia.uid).ready,true);
 assert.equal(universalImpact(packs,s,live(s,emilia.uid)),1);
 assert.equal(legal(s).some(a=>a.mode==='restedRetireImpact'&&a.uid===emilia.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
});

test('REZ-1-091 shows the whole window and discards only after a take',()=>{
 let miss=fresh(9101,{'REZ-1-091':1,'REZ-1-098':1});
 miss=reach(miss,'main');
 const missed=setTop(miss,0,['REZ-1-006','REZ-1-007','REZ-1-014','REZ-1-036','REZ-1-043','REZ-1-068','REZ-1-072']);
 const hand=miss.players[0].hand.length;
 [miss]=play(miss,'REZ-1-091');
 assert.equal(miss.pending.kind,'effect-top-order');
 assert.deepEqual(miss.pending.uids,missed.map(c=>c.uid));
 assert.equal(miss.pending.choices,undefined);
 assert.equal(universalPrivateChoices(packs,miss,1),null);
 miss=order(miss,missed.map(c=>c.uid));
 assert.equal(miss.pending,null);
 assert.deepEqual(miss.players[0].deck.slice(-7).map(c=>c.uid),missed.map(c=>c.uid));
 assert.equal(miss.players[0].hand.length,hand);
 assert.equal(assertUniversalMatch(packs,miss),true);

 let hit=fresh(9102,{'REZ-1-091':1,'REZ-1-098':1});
 hit=reach(hit,'main');
 const found=setTop(hit,0,['REZ-1-098','REZ-1-006','REZ-1-007','REZ-1-014','REZ-1-036','REZ-1-043','REZ-1-068']);
 [hit]=play(hit,'REZ-1-091');
 assert.equal(hit.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(hit.pending.uids,found.map(c=>c.uid));
 assert.deepEqual(hit.pending.choices,[found[0].uid]);
 assert.equal(legal(hit).some(a=>a.uid===found[1].uid),false);
 assert.equal(universalPrivateChoices(packs,hit,1),null);
 assert.equal(hit.publicReveals.some(r=>r.cardId==='REZ-1-006'),false);
 hit=act(hit,{type:'chooseTopFiltered',uid:found[0].uid});
 assert.equal(hit.publicReveals.at(-1).cardId,'REZ-1-098');
 hit=order(hit,found.slice(1).map(c=>c.uid));
 assert.equal(hit.pending.kind,'effect-discard');
 assert.equal(legal(hit).some(a=>a.type==='chooseDiscard'&&a.uid===null),false);
 const dumped=hit.players[0].hand.find(c=>c.uid!==found[0].uid);
 hit=act(hit,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(hit.players[0].hand.some(c=>c.uid===found[0].uid),true);
 assert.equal(hit.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(assertUniversalMatch(packs,hit),true);
});

test('REZ-1-092 draws and must discard; an empty deck does not invent a discard',()=>{
 let s=fresh(9201,{'REZ-1-092':1});
 fuel(s,['REZ-1-068']);
 s=reach(s,'main');
 const before=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 [s]=play(s,'REZ-1-092');
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.type==='chooseDiscard'&&a.uid===null),false);
 const dumped=s.players[0].hand[0];
 s=act(s,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let dry=fresh(9202,{'REZ-1-092':1});
 fuel(dry,['REZ-1-068']);
 dry=reach(dry,'main');
 dry.players[0].outside.push(...dry.players[0].hand.splice(0),...dry.players[0].deck.splice(0));
 [dry]=play(dry,'REZ-1-092');
 assert.equal(dry.pending,null);
 assert.equal(dry.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(packs,dry),true);
});

test('REZ-1-093 draws on an ordinary play and draws only after the rest',()=>{
 let s=purple(fresh(9301,{'REZ-1-093':1}),4);
 const deck=s.players[0].deck.length;
 let body;
 [s,body]=play(s,'REZ-1-093');
 assert.equal(live(s,body.uid).stack?.length||0,0);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===body.uid),false);
 const ally=seat(s,0,'REZ-1-068','front',1,false);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===body.uid),false);
 live(s,ally.uid).ready=true;
 const parked=structuredClone(s);
 const slot=parked.players[0].front.findIndex(c=>c?.uid===body.uid);
 const held=parked.players[0].front[slot];
 const displaced=parked.players[0].energy[3];
 parked.players[0].energy[3]=held;
 parked.players[0].front[slot]=displaced;
 assert.equal(legal(parked).some(a=>a.mode==='frontOnce'&&a.uid===body.uid),false);
 const drawn=s.players[0].deck.length;
 s=act(s,{type:'activate',uid:body.uid,mode:'frontOnce'});
 assert.equal(s.pending.kind,'effect-rest-own-front-draw');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 assert.ok(s.pending.choices.includes(ally.uid));
 s=act(s,{type:'chooseRestOwnFrontDraw',uid:ally.uid});
 assert.equal(live(s,ally.uid).ready,false);
 assert.equal(s.players[0].deck.length,drawn-1);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===body.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-094 is a field, may enter active, and tops one hand card',()=>{
 let s=purple(fresh(9401,{'REZ-1-094':1,'REZ-1-068':1}),3,3);
 const payment=pull(s,0,'REZ-1-068');
 s.players[0].hand.push(payment);
 const waiting=pull(s,0,'REZ-1-094');
 s.players[0].hand.push(waiting);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===waiting.uid&&a.line==='front'),false);
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===waiting.uid&&a.line==='energy'));
 assert.equal(s.players[0].energy.some(c=>c?.uid===waiting.uid),true);
 assert.equal(live(s,waiting.uid).ready,false);
 assert.equal(s.pending.kind,'effect-discard-active');
 assert.equal(s.pending.optional,true);
 let declined=act(structuredClone(s),{type:'chooseDiscardActive',uid:null});
 assert.equal(live(declined,waiting.uid).ready,false);
 assert.equal(declined.players[0].hand.some(c=>c.uid===payment.uid),true);
 assert.equal(legal(declined).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 s=act(s,{type:'chooseDiscardActive',uid:payment.uid});
 assert.equal(live(s,waiting.uid).ready,true);
 assert.equal(s.players[0].outside.some(c=>c.uid===payment.uid),true);
 const top=s.players[0].deck[0];
 const placed=pull(s,0,'REZ-1-006');
 s.players[0].hand.push(placed);
 s=act(s,{type:'activate',uid:waiting.uid,mode:'selfRestThen'});
 assert.equal(live(s,waiting.uid).ready,false);
 assert.equal(s.pending.kind,'effect-hand-top');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 assert.equal(s.players[0].hand.some(c=>c.uid===top.uid),true);
 s=act(s,{type:'chooseHandTop',uid:placed.uid});
 assert.equal(s.players[0].deck[0].uid,placed.uid);
 assert.equal(s.publicReveals.some(r=>r.uid===placed.uid),false);
 live(s,waiting.uid).ready=true;
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,declined),true);

 let bare=purple(fresh(9402,{'REZ-1-094':1}),3,3);
 bare.players[0].outside.push(...bare.players[0].hand.splice(0));
 let quiet;
 [bare,quiet]=play(bare,'REZ-1-094','energy');
 assert.equal(bare.pending,null);
 assert.equal(live(bare,quiet.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,bare),true);
});

test('REZ-1-095 and REZ-1-099 each ready up to two AP cards',()=>{
 function recover(seed,id,stopEarly){
  let s=purple(fresh(seed,{[id]:1}),3);
  readyAp(s,3);
  s.players[0].apCards.filter(c=>c.inPlay).slice(0,2).forEach(c=>{c.ready=false;});
  [s]=cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
  assert.equal(rested.length,3);
  s=act(s,{type:'chooseApRecovery',uid:rested[0].uid});
  if(stopEarly)s=act(s,{type:'chooseApRecovery',uid:null});
  else s=act(s,{type:'chooseApRecovery',uid:s.players[0].apCards.find(c=>c.inPlay&&!c.ready).uid});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,stopEarly?1:2);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 recover(9501,'REZ-1-095',false);
 recover(9502,'REZ-1-095',true);
 recover(9901,'REZ-1-099',false);
 recover(9902,'REZ-1-099',true);
});

test('REZ-1-096 retires one front on the Beatrice and Subaru ladder',()=>{
 let none=purple(fresh(9601,{'REZ-1-096':2,'REZ-1-067':1}),3);
 const over=seat(none,1,'REZ-1-067','front',0,true);
 readyAp(none,3);
 const card=pull(none,0,'REZ-1-096');
 none.players[0].hand.push(card);
 const readyBefore=none.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legal(none).some(a=>a.type==='event'&&a.uid===card.uid),false);
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,readyBefore);
 over.buffs=[{bp:-1500,untilTurn:none.turn}];
 assert.equal(universalBp(packs,none,over),2500);
 [none]=cast(none,'REZ-1-096');
 assert.equal(none.pending.kind,'effect-retire-bp');
 assert.equal(none.pending.limit,3000);
 assert.deepEqual(none.pending.choices,[over.uid]);
 assert.equal(legal(none).some(a=>a.uid===null),false);
 none=act(none,{type:'chooseRetireBp',uid:over.uid});
 assert.equal(none.players[1].outside.some(c=>c.uid===over.uid),true);
 assert.equal(assertUniversalMatch(packs,none),true);

 let both=purple(fresh(9602,{'REZ-1-096':1,'REZ-1-067':1}),3);
 seat(both,0,'REZ-1-072','front',0,true);
 const victim=seat(both,1,'REZ-1-067','front',0,true);
 const spell=pull(both,0,'REZ-1-096');
 both.players[0].hand.push(spell);
 assert.equal(legal(both).some(a=>a.type==='event'&&a.uid===spell.uid),true);
 victim.buffs=[{bp:1000,untilTurn:both.turn}];
 assert.equal(universalBp(packs,both,victim),5000);
 assert.equal(legal(both).some(a=>a.type==='event'&&a.uid===spell.uid),false);
 seat(both,0,'REZ-1-068','front',1,true);
 assert.equal(legal(both).some(a=>a.type==='event'&&a.uid===spell.uid),true);
 [both]=cast(both,'REZ-1-096');
 assert.equal(both.pending.limit,5000);
 assert.deepEqual(both.pending.choices,[victim.uid]);
 both=act(both,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(both.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(assertUniversalMatch(packs,both),true);
});

test('REZ-1-097 looks privately, then may rest an affordable named top',()=>{
 let s=purple(fresh(9701,{'REZ-1-097':1,'REZ-1-068':1,'REZ-1-077':1}),3);
 const window=setTop(s,0,['REZ-1-068','REZ-1-007','REZ-1-008']);
 [s]=cast(s,'REZ-1-097');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 s=act(s,{type:'chooseInspectedOutside',uid:window[2].uid});
 s=act(s,{type:'chooseInspectedOutside',uid:null});
 assert.equal(s.pending.kind,'effect-top-order');
 s=order(s,[window[0].uid,window[1].uid]);
 assert.equal(s.players[0].outside.some(c=>c.uid===window[2].uid),true);
 assert.equal(s.pending.kind,'effect-deck-named-play');
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-068');
 assert.equal(s.pending.uid,window[0].uid);
 const hand=legal(s).find(a=>a.mode==='hand');
 const rest=legal(s).find(a=>a.mode==='enter'&&a.line==='front');
 assert.ok(hand);
 assert.ok(rest);
 assert.equal(legal(s).some(a=>a.mode==='raid'),false);
 let taken=act(structuredClone(s),hand);
 assert.equal(taken.players[0].hand.some(c=>c.uid===window[0].uid),true);
 s=act(s,rest);
 assert.equal(live(s,window[0].uid).ready,false);
 assert.equal(s.players[0].front.some(c=>c?.uid===window[0].uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,taken),true);

 let empty=purple(fresh(9702,{'REZ-1-097':1}),3);
 const gone=setTop(empty,0,['REZ-1-007','REZ-1-008','REZ-1-016']);
 empty.players[0].outside.push(...empty.players[0].deck.splice(3));
 [empty]=cast(empty,'REZ-1-097');
 for(const card of gone)empty=act(empty,{type:'chooseInspectedOutside',uid:card.uid});
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length,0);
 assert.equal(empty.publicReveals.some(r=>r.kind==='deck-top'),false);
 assert.equal(assertUniversalMatch(packs,empty),true);

 let miss=purple(fresh(9703,{'REZ-1-097':1}),3);
 const other=setTop(miss,0,['REZ-1-081','REZ-1-007','REZ-1-008']);
 [miss]=cast(miss,'REZ-1-097');
 miss=act(miss,{type:'chooseInspectedOutside',uid:null});
 miss=order(miss,other.map(c=>c.uid));
 assert.equal(miss.pending,null);
 assert.equal(miss.players[0].hand.some(c=>c.uid===other[0].uid),true);
 assert.equal(miss.publicReveals.at(-1).cardId,'REZ-1-081');
 assert.equal(assertUniversalMatch(packs,miss),true);
});

test('REZ-1-098 discards one of two draws, then may rest a front for one AP',()=>{
 let s=purple(fresh(9801,{'REZ-1-098':1}),3);
 const ally=seat(s,0,'REZ-1-068','front',0,true);
 readyAp(s,3);
 s.players[0].apCards.filter(c=>c.inPlay).slice(0,2).forEach(c=>{c.ready=false;});
 const deck=s.players[0].deck.length;
 [s]=cast(s,'REZ-1-098');
 assert.equal(s.players[0].deck.length,deck-3);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.remaining,undefined);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const dumped=s.players[0].hand[0];
 s=act(s,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(s.pending.kind,'effect-rest-front-ap');
 assert.equal(s.pending.optional,true);
 assert.ok(s.pending.choices.includes(ally.uid));
 let skipped=act(structuredClone(s),{type:'chooseRestFrontAp',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,ally.uid).ready,true);
 assert.equal(skipped.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 s=act(s,{type:'chooseRestFrontAp',uid:ally.uid});
 assert.equal(live(s,ally.uid).ready,false);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,1);
 s=act(s,{type:'chooseApRecovery',uid:s.players[0].apCards.find(c=>c.inPlay&&!c.ready).uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);

 let quiet=purple(fresh(9802,{'REZ-1-098':1}),3);
 [quiet]=cast(quiet,'REZ-1-098');
 const dumped2=quiet.players[0].hand[0];
 quiet=act(quiet,{type:'chooseDiscard',uid:dumped2.uid});
 assert.equal(quiet.pending,null);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('REZ-1-100 must retire one front, and Emilia raises the ceiling',()=>{
 let none=fresh(10001,{'REZ-1-100':2,'REZ-1-067':1,'REZ-1-081':1});
 fuel(none,['REZ-1-068','REZ-1-068','REZ-1-072','REZ-1-072']);
 none=reach(none,'main');
 assert.equal(universalEnergyByColor(packs,none,0).purple,4);
 const tall=seat(none,1,'REZ-1-067','front',0,true);
 const card=pull(none,0,'REZ-1-100');
 none.players[0].hand.push(card);
 readyAp(none,3);
 const ready=none.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legal(none).some(a=>a.type==='event'&&a.uid===card.uid),false);
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,ready);
 tall.buffs=[{bp:-1500,untilTurn:none.turn}];
 assert.equal(universalBp(packs,none,tall),2500);
 [none]=cast(none,'REZ-1-100');
 assert.equal(none.pending.kind,'effect-retire-bp');
 assert.equal(none.pending.limit,3000);
 assert.equal(legal(none).some(a=>a.uid===null),false);
 none=act(none,{type:'chooseRetireBp',uid:tall.uid});
 assert.equal(none.players[1].outside.some(c=>c.uid===tall.uid),true);
 assert.equal(assertUniversalMatch(packs,none),true);

 let named=fresh(10002,{'REZ-1-100':1,'REZ-1-067':1,'REZ-1-081':1});
 fuel(named,['REZ-1-068','REZ-1-068','REZ-1-072','REZ-1-072']);
 named=reach(named,'main');
 seat(named,0,'REZ-1-081','front',0,true);
 const victim=seat(named,1,'REZ-1-067','front',0,true);
 const spell=pull(named,0,'REZ-1-100');
 named.players[0].hand.push(spell);
 assert.equal(legal(named).some(a=>a.type==='event'&&a.uid===spell.uid),true);
 victim.buffs=[{bp:1500,untilTurn:named.turn}];
 assert.equal(universalBp(packs,named,victim),5500);
 assert.equal(legal(named).some(a=>a.type==='event'&&a.uid===spell.uid),false);
 victim.buffs=[{bp:500,untilTurn:named.turn}];
 assert.equal(universalBp(packs,named,victim),4500);
 [named]=cast(named,'REZ-1-100');
 assert.equal(named.pending.limit,5000);
 named=act(named,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(named.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(assertUniversalMatch(packs,named),true);
});

test('REZ-1-101 gains BP from one facedown and may reenter on retire',()=>{
 let s=fresh(10101,{'REZ-1-101':1,'REZ-1-081':1,'REZ-1-067':1});
 fuel(s,['REZ-1-006','REZ-1-006','REZ-1-006','REZ-1-014']);
 s=reach(s,'main');
 assert.ok(universalEnergyByColor(packs,s,0).yellow>=3);
 const emilia=seat(s,0,'REZ-1-081','front',1,true);
 const blocker=seat(s,1,'REZ-1-067','front',0,true);
 let subaru;
 [s,subaru]=play(s,'REZ-1-101');
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,live(s,subaru.uid)),3000);
 const buried=pull(s,0,'REZ-1-007');
 buried.faceDown=true;
 live(s,subaru.uid).under=[buried];
 assert.equal(universalBp(packs,s,live(s,subaru.uid)),4000);
 const passed=walk(structuredClone(s),x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,passed,live(passed,subaru.uid)),3000);
 live(passed,subaru.uid).ready=true;
 quietLife(passed,0);
 let covered=walk(passed,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 covered=act(covered,{type:'attack',uid:blocker.uid});
 covered=act(covered,{type:'chooseBlock',uid:subaru.uid});
 assert.equal(covered.pending,null);
 assert.equal(covered.players[0].outside.some(c=>c.uid===subaru.uid),true);
 assert.equal(assertUniversalMatch(packs,covered),true);
 live(s,subaru.uid).under=[];
 s.players[0].deck.push(buried);
 live(s,subaru.uid).ready=true;
 quietLife(s,0);
 s=walk(s,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 const handCard=s.players[0].hand[0];
 s=act(s,{type:'attack',uid:blocker.uid});
 s=act(s,{type:'chooseBlock',uid:subaru.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===subaru.uid),true);
 assert.equal(s.pending.kind,'effect-hand-reenter-under');
 assert.equal(s.pending.optional,true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPrivateChoices(packs,s,0).options.some(o=>o.card?.cardId===handCard.cardId),true);
 let declined=act(structuredClone(s),{type:'chooseHandReenterUnder',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===subaru.uid),true);
 assert.equal(declined.players[0].front.some(c=>c?.uid===emilia.uid),true);
 s=act(s,legal(s).find(a=>a.type==='chooseHandReenterUnder'&&a.uid===handCard.uid&&a.line==='front'));
 assert.equal(live(s,subaru.uid).ready,false);
 assert.equal(live(s,subaru.uid).under.length,1);
 assert.equal(live(s,subaru.uid).under[0].faceDown,true);
 assert.equal(live(s,subaru.uid).under[0].cardId,handCard.cardId);
 assert.equal(universalBp(packs,s,live(s,subaru.uid)),3000);
 s=walk(s,x=>x.active===0&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,s,live(s,subaru.uid)),4000);
 const owner=universalPublicView(packs,s,0).players[0].front.find(c=>c?.uid===subaru.uid);
 const foe=universalPublicView(packs,s,1).players[0].front.find(c=>c?.uid===subaru.uid);
 assert.equal(owner.underLayers[0].cardId,handCard.cardId);
 assert.deepEqual(foe.underLayers,[{faceDown:true}]);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,declined),true);

 let bare=fresh(10102,{'REZ-1-101':1,'REZ-1-067':1});
 fuel(bare,['REZ-1-006','REZ-1-006','REZ-1-006','REZ-1-014']);
 bare=reach(bare,'main');
 const wall=seat(bare,1,'REZ-1-067','front',0,true);
 let lonely;
 [bare,lonely]=play(bare,'REZ-1-101');
 live(bare,lonely.uid).ready=true;
 quietLife(bare,0);
 bare=walk(bare,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 bare=act(bare,{type:'attack',uid:wall.uid});
 bare=act(bare,{type:'chooseBlock',uid:lonely.uid});
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].outside.some(c=>c.uid===lonely.uid),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
});

test('every life symbol in 089-101 resolves on that card',()=>{
 const rows=[
  ['REZ-1-089','raid'],['REZ-1-090','raid'],['REZ-1-091',null],['REZ-1-092','draw'],
  ['REZ-1-093','raid'],['REZ-1-094','get'],['REZ-1-095','final'],['REZ-1-096','special'],
  ['REZ-1-097','draw'],['REZ-1-098','color'],['REZ-1-099','final'],['REZ-1-100','special'],
  ['REZ-1-101','get']
 ];
 rows.forEach(([id,symbol],index)=>{
  const hit=(()=>{
   let s=fresh(8900+index,{[id]:1,'REZ-1-036':1,'REZ-1-091':1});
   const attacker=seat(s,0,'REZ-1-036','front',0,true);
   s.players[1].deck.push(...s.players[1].life.splice(0));
   s.players[1].life=[pull(s,1,id)];
   if(id==='REZ-1-098')s.players[1].outside.push(pull(s,1,'REZ-1-072'));
   s=walk(s,x=>x.phase==='attack'&&!x.pending);
   s=act(s,{type:'attack',uid:attacker.uid});
   if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
   return {s,attacker};
  })();
  if(!symbol){
   assert.equal(hit.s.pending,null,id);
   assert.equal(hit.s.players[1].outside.some(c=>c.cardId===id),true,id);
  }else{
   assert.equal(hit.s.pending.trigger,symbol,id);
   if(symbol==='draw'){
    const hand=hit.s.players[1].hand.length;
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'draw'});
    assert.equal(hit.s.players[1].hand.length,hand+1,id);
    assert.equal(hit.s.players[1].outside.some(c=>c.cardId===id),true,id);
    assert.equal(hit.s.pending,null,id);
   }else if(symbol==='get'){
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'get'});
    assert.equal(hit.s.players[1].hand.some(c=>c.cardId===id),true,id);
   }else if(symbol==='special'){
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'special',uid:hit.attacker.uid});
    assert.equal(hit.s.players[0].outside.some(c=>c.uid===hit.attacker.uid),true,id);
   }else if(symbol==='final'){
    const top=hit.s.players[1].deck[0];
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'final'});
    assert.equal(hit.s.players[1].life[0].uid,top.uid,id);
   }else if(symbol==='raid'){
    assert.equal(legal(hit.s).some(a=>a.mode==='raid'),false,id);
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'get'});
    assert.equal(hit.s.players[1].hand.some(c=>c.cardId===id),true,id);
   }else if(symbol==='color'){
    const cheap=hit.s.players[1].outside.find(c=>c.cardId==='REZ-1-072');
    const action=legal(hit.s).find(a=>a.mode==='colorOutside'&&a.uid===cheap.uid&&a.line==='front');
    assert.ok(action,id);
    hit.s=act(hit.s,action);
    assert.equal(live(hit.s,cheap.uid).ready,true,id);
    assert.equal(hit.s.players[1].front.some(c=>c?.uid===cheap.uid),true,id);
   }
  }
  assert.equal(assertUniversalMatch(packs,hit.s),true,id);
 });
});
