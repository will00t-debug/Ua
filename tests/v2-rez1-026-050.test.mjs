// UA40BT/REZ-1-026–050. Official pages and card images checked 2026-11-11.
// Each case plays that card. A shared sentence on another number is not evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRezeroV2Pack} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 effectiveHandRequiredEnergy,universalPrivateChoices
} from '../dist/universal-v2/engine.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const FILL=['REZ-1-007','REZ-1-036','REZ-1-043','REZ-1-028','REZ-1-042','REZ-1-039',
 'REZ-1-038','REZ-1-035','REZ-1-046','REZ-1-048','REZ-1-037','REZ-1-041','REZ-1-045',
 'REZ-1-049','REZ-1-001'];
function counts(extra){
 const c={...extra};
 let n=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of FILL){
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
function fuel(s,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,0,id);
  card.ready=false;
  s.players[0].energy[i]=card;
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
function cast(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
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
  for(const zone of ['front','energy','hand','deck','outside','life','removed','lifeRevealed']){
   const found=(pl[zone]||[]).find(c=>c?.uid===uid);
   if(found)return found;
  }
 }
 throw Error('Missing physical '+uid);
}
function readyAp(s,n=2){
 s.players[0].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function skipOn(s,uid){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===uid&&!e.consumed);
}
function discount(s){
 return s.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount');
}
function yellow5(s){
 fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 s=reach(s,'main');
 s.players[0].energy[0].buffs=[{energy:1,untilTurn:s.turn}];
 assert.equal(universalEnergyByColor(packs,s,0).yellow,5);
 return s;
}

test('026 to 044 on-play text is outside the raid bar',()=>{
 for(const id of ['REZ-1-027','REZ-1-040','REZ-1-044']){
  assert.equal(raidBoxListed(id,'onPlay'),false);
  assert.equal(raidBoxListed(id,'onRetire'),false);
 }
});

test('REZ-1-026 draws only after an event, and the color trigger skips one active',()=>{
 let quiet=fresh(2601,{'REZ-1-026':2,'REZ-1-029':1});
 quiet=yellow5(quiet);
 [quiet]=play(quiet,'REZ-1-026');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.zoneMoveEvents.some(e=>e.cardId!=='REZ-1-026'&&e.to==='hand'&&e.reason==='own-effect'),false);
 let used=fresh(2602,{'REZ-1-026':1,'REZ-1-029':1});
 used=yellow5(used);
 readyAp(used,2);
 [used]=cast(used,'REZ-1-029');
 if(used.pending?.kind==='effect-recover-ap')
  used=act(used,{type:'chooseApRecovery',uid:null});
 const hand=used.players[0].hand.length;
 [used]=play(used,'REZ-1-026');
 assert.equal(used.players[0].hand.length,hand);
 assert.equal(used.zoneMoveEvents.some(e=>e.to==='hand'&&e.from==='deck'&&e.reason==='own-effect'),true);

 let s=fresh(2603,{'REZ-1-026':1});
 const attacker=seat(s,1,'REZ-1-036', 'front',0,true);
 const bystander=seat(s,1,'REZ-1-007','front',1,true);
 s.players[0].deck.push(s.players[0].life[0]);
 s.players[0].life[0]=pull(s,0,'REZ-1-026');
 s=walk(s,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 s=act(s,{type:'attack',uid:attacker.uid});
 s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'color');
 s=act(s,{type:'chooseTrigger',mode:'colorRestSkip',uid:bystander.uid});
 assert.equal(s.players[1].front[1].ready,false);
 assert.equal(skipOn(s,bystander.uid),true);
 s=walk(s,x=>x.active===0&&x.players[0].ownTurns>=2&&x.phase==='start'&&!x.pending);
 assert.equal(s.players[1].front[1].ready,false);
 assert.equal(skipOn(s,bystander.uid),false);
 s=walk(s,x=>x.active===1&&x.players[1].ownTurns>=2&&x.phase==='start'&&!x.pending);
 assert.equal(s.players[1].front[1].ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-027 on-play runs from an ordinary play and from a raid',()=>{
 let plain=fresh(2701,{'REZ-1-027':1,'REZ-1-029':1,'REZ-1-031':1});
 plain=yellow5(plain);
 const deck=plain.players[0].deck.length;
 let emilia;
 [plain,emilia]=play(plain,'REZ-1-027');
 assert.equal(emilia.ready,false);
 assert.equal((emilia.stack||[]).length,0);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(plain.pending,null);
 assert.equal(discount(plain).filter.printedRequiredEnergyAtMost,3);
 for(const ap of plain.players[0].apCards)ap.ready=false;
 const cheap=pull(plain,0,'REZ-1-029');
 const pricey=pull(plain,0,'REZ-1-031');
 plain.players[0].hand.push(cheap,pricey);
 assert.equal(legal(plain).some(a=>a.type==='event'&&a.uid===cheap.uid),true);
 assert.equal(legal(plain).some(a=>a.type==='event'&&a.uid===pricey.uid),false);
 plain=act(plain,{type:'event',uid:cheap.uid});
 if(plain.pending?.kind==='effect-recover-ap')
  plain=act(plain,{type:'chooseApRecovery',uid:null});
 assert.equal(discount(plain),undefined);
 plain.players[0].apCards.forEach(c=>{c.inPlay=true;c.ready=true;});
 seat(plain,1,'REZ-1-036','front',0,true);
 assert.equal(legal(plain).some(a=>a.type==='event'&&a.uid===pricey.uid),true);

 let mid=fresh(2702,{'REZ-1-027':1,'REZ-1-029':2,'REZ-1-030':2});
 mid=yellow5(mid);
 for(const id of ['REZ-1-029','REZ-1-029','REZ-1-030','REZ-1-030'])
  mid.players[0].outside.push(pull(mid,0,id));
 const victim=seat(mid,1,'REZ-1-036','front',0,true);
 [mid]=play(mid,'REZ-1-027');
 assert.equal(mid.pending.kind,'effect-rest-outside-events');
 assert.equal(mid.pending.skipMin,8);
 let skipped=act(structuredClone(mid),{type:'chooseRestOutsideEvents',uid:null});
 assert.equal(skipped.players[1].front[0].ready,true);
 assert.equal(skipOn(skipped,victim.uid),false);
 mid=act(mid,{type:'chooseRestOutsideEvents',uid:victim.uid});
 assert.equal(mid.players[1].front[0].ready,false);
 assert.equal(skipOn(mid,victim.uid),false);

 let high=fresh(2703,{'REZ-1-027':1,'REZ-1-026':1,'REZ-1-029':2,'REZ-1-030':2,'REZ-1-031':2,'REZ-1-033':2});
 high=yellow5(high);
 const base=seat(high,0,'REZ-1-026','front',0,false);
 for(const id of ['REZ-1-029','REZ-1-029','REZ-1-030','REZ-1-030','REZ-1-031','REZ-1-031','REZ-1-033','REZ-1-033'])
  high.players[0].outside.push(pull(high,0,id));
 const marked=seat(high,1,'REZ-1-036','front',0,true);
 const top=pull(high,0,'REZ-1-027');
 high.players[0].hand.push(top);
 const raid=legal(high).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 high=act(high,raid);
 assert.equal(high.players[0].front.find(c=>c?.uid===top.uid).ready,true);
 assert.equal(high.pending.kind,'effect-rest-outside-events');
 high=act(high,{type:'chooseRestOutsideEvents',uid:marked.uid});
 assert.equal(high.players[1].front[0].ready,false);
 assert.equal(skipOn(high,marked.uid),true);
 assert.equal(assertUniversalMatch(packs,high),true);
});

test('REZ-1-028 costs 0 only on an empty field and steps once during move',()=>{
 let s=fresh(2801,{'REZ-1-028':2});
 s=reach(s,'main');
 const card=pull(s,0,'REZ-1-028');
 s.players[0].hand.push(card);
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['REZ-1-028'],card),0);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===card.uid),true);
 s.players[0].front[0]=seat(s,0,'REZ-1-036','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['REZ-1-028'],card),2);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===card.uid),false);
 let move=fresh(2802,{'REZ-1-028':1});
 const felt=seat(move,0,'REZ-1-028','front',0,true);
 move=reach(move,'move');
 const step=legal(move).find(a=>a.type==='step'&&a.uid===felt.uid);
 assert.ok(step);
 move=act(move,step);
 assert.equal(move.players[0].energy.some(c=>c?.uid===felt.uid),true);
 assert.equal(legal(move).some(a=>a.type==='step'&&a.uid===felt.uid),false);
 move=reach(move,'main');
 assert.equal(legal(move).some(a=>a.type==='step'),false);
 assert.equal(assertUniversalMatch(packs,move),true);
});

test('REZ-1-029 and REZ-1-030 each ready up to two AP cards',()=>{
 function recover(seed,id,stopEarly){
  let s=fresh(seed,{[id]:1});
  fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007']);
  s=reach(s,'main');
  s.players[0].apCards.forEach(c=>{c.inPlay=true;c.ready=true;});
  s.players[0].apCards[1].ready=false;
  [s]=cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
  assert.equal(rested.length,2);
  s=act(s,{type:'chooseApRecovery',uid:rested[0].uid});
  if(stopEarly){
   s=act(s,{type:'chooseApRecovery',uid:null});
   assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,2);
  }else{
   const left=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
   s=act(s,{type:'chooseApRecovery',uid:left.uid});
   assert.equal(s.pending,null);
   assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,3);
  }
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 recover(2901,'REZ-1-029',false);
 recover(3001,'REZ-1-030',true);
});

test('REZ-1-031 cannot be used without a legal front character',()=>{
 let none=fresh(3101,{'REZ-1-031':1,'REZ-1-034':1});
 fuel(none,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 none=reach(none,'main');
 seat(none,1,'REZ-1-034','front',0,true);
 const event=pull(none,0,'REZ-1-031');
 none.players[0].hand.push(event);
 assert.equal(legal(none).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const ap=none.players[0].apCards.filter(c=>c.ready).length;
 assert.throws(()=>act(none,{type:'event',uid:event.uid}));
 assert.equal(none.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,ap);

 let low=fresh(3102,{'REZ-1-031':1,'REZ-1-034':1});
 fuel(low,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 low=reach(low,'main');
 const small=seat(low,1,'REZ-1-036','front',0,true);
 const tall=seat(low,1,'REZ-1-034','front',1,true);
 seat(low,1,'REZ-1-043','energy',0,true);
 [low]=cast(low,'REZ-1-031');
 assert.equal(low.pending.kind,'effect-retire-bp');
 assert.equal(low.pending.limit,3000);
 assert.deepEqual(low.pending.choices,[small.uid]);
 assert.equal(legal(low).some(a=>a.uid===null||a.uid===tall.uid),false);
 low=act(low,{type:'chooseRetireBp',uid:small.uid});
 assert.equal(low.players[1].outside.some(c=>c.uid===small.uid),true);
 assert.equal(low.players[1].front[1].uid,tall.uid);

 let rem=fresh(3103,{'REZ-1-031':1,'REZ-1-048':1,'REZ-1-034':1});
 fuel(rem,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 rem=reach(rem,'main');
 const parked=rem.players[0].energy[3];
 rem.players[0].deck.push(parked);
 rem.players[0].energy[3]=null;
 seat(rem,0,'REZ-1-048','energy',3,true);
 rem.players[0].energy[0].buffs=[{energy:1,untilTurn:rem.turn}];
 const wide=seat(rem,1,'REZ-1-034','front',0,true);
 [rem]=cast(rem,'REZ-1-031');
 assert.equal(rem.pending.limit,5000);
 assert.deepEqual(rem.pending.choices,[wide.uid]);
 rem=act(rem,{type:'chooseRetireBp',uid:wide.uid});
 assert.equal(rem.players[1].outside.some(c=>c.uid===wide.uid),true);
 assert.equal(assertUniversalMatch(packs,rem),true);
});

test('REZ-1-032 lasts past this turn only with six other outside events',()=>{
 function setup(seed,others){
  let s=fresh(seed,{'REZ-1-032':1,'REZ-1-001':1,'REZ-1-029':4,'REZ-1-031':2});
  fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007']);
  s=reach(s,'main');
  const puck=seat(s,0,'REZ-1-001','front',0,true);
  for(let i=0;i<others;i++)s.players[0].outside.push(pull(s,0,i<4?'REZ-1-029':'REZ-1-031'));
  return [s,puck];
 }
 let [brief,puck]=setup(3201,5);
 [brief]=cast(brief,'REZ-1-032');
 assert.equal(brief.pending.longer,false);
 brief=act(brief,{type:'chooseNamedDuration',uid:null});
 assert.equal(universalBp(packs,brief,live(brief,puck.uid)),2000);
 [brief,puck]=setup(3202,5);
 [brief]=cast(brief,'REZ-1-032');
 brief=act(brief,{type:'chooseNamedDuration',uid:puck.uid});
 assert.equal(universalBp(packs,brief,live(brief,puck.uid)),4000);
 assert.equal(universalImpact(packs,brief,live(brief,puck.uid)),1);
 brief=walk(brief,x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,brief,live(brief,puck.uid)),2000);
 assert.equal(universalImpact(packs,brief,live(brief,puck.uid)),0);

 let [lasting,body]=setup(3203,6);
 [lasting]=cast(lasting,'REZ-1-032');
 assert.equal(lasting.pending.longer,true);
 lasting=act(lasting,{type:'chooseNamedDuration',uid:body.uid});
 lasting=walk(lasting,x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,lasting,live(lasting,body.uid)),4000);
 assert.equal(universalImpact(packs,lasting,live(lasting,body.uid)),1);
 lasting=walk(lasting,x=>x.active===0&&x.players[0].ownTurns>=2&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,lasting,live(lasting,body.uid)),2000);
 assert.equal(assertUniversalMatch(packs,lasting),true);
});

test('REZ-1-033 rests or retires first, then peeks only with Emilia and Puck',()=>{
 let none=fresh(3301,{'REZ-1-033':1});
 fuel(none,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 none=reach(none,'main');
 const blocked=pull(none,0,'REZ-1-033');
 none.players[0].hand.push(blocked);
 assert.equal(legal(none).some(a=>a.type==='event'&&a.uid===blocked.uid),false);

 let rest=fresh(3302,{'REZ-1-033':1});
 fuel(rest,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 rest=reach(rest,'main');
 const small=seat(rest,1,'REZ-1-036','front',0,true);
 [rest]=cast(rest,'REZ-1-033');
 assert.equal(rest.pending.mode,'rest');
 assert.equal(legal(rest).some(a=>a.uid===null),false);
 rest=act(rest,{type:'chooseRestOrRetire',uid:small.uid});
 assert.equal(rest.pending,null);
 assert.equal(rest.players[1].front[0].ready,false);
 assert.equal(rest.players[1].front[0].uid,small.uid);

 let cut=fresh(3303,{'REZ-1-033':1,'REZ-1-026':1,'REZ-1-034':1});
 fuel(cut,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 cut=reach(cut,'main');
 seat(cut,0,'REZ-1-026','front',0,true);
 const gone=seat(cut,1,'REZ-1-034','front',0,true);
 [cut]=cast(cut,'REZ-1-033');
 assert.equal(cut.pending.mode,'retire');
 cut=act(cut,{type:'chooseRestOrRetire',uid:gone.uid});
 assert.equal(cut.pending,null);
 assert.equal(cut.players[1].outside.some(c=>c.uid===gone.uid),true);

 let look=fresh(3304,{'REZ-1-033':1,'REZ-1-026':1,'REZ-1-001':1});
 fuel(look,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 look=reach(look,'main');
 seat(look,0,'REZ-1-026','front',0,true);
 seat(look,0,'REZ-1-001','front',1,true);
 const retired=seat(look,1,'REZ-1-036','front',0,true);
 const top=look.players[0].deck[0];
 [look]=cast(look,'REZ-1-033');
 look=act(look,{type:'chooseRestOrRetire',uid:retired.uid});
 assert.equal(look.players[1].outside.some(c=>c.uid===retired.uid),true);
 assert.equal(look.pending.kind,'private-top-choice');
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assert.equal(universalPrivateChoices(packs,look,0).options[0].card.cardId,top.cardId);
 assert.equal(look.publicReveals.some(r=>r.uid===top.uid),false);
 look=act(look,{type:'chooseTopCard',mode:'outside'});
 assert.equal(look.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(assertUniversalMatch(packs,look),true);
});

test('REZ-1-034 pays AP only for a 4500 retirement, and the main reveal is public',()=>{
 let s=fresh(3401,{'REZ-1-034':1,'REZ-1-040':1,'REZ-1-036':1});
 fuel(s,['REZ-1-041','REZ-1-043','REZ-1-043']);
 s=reach(s,'main');
 readyAp(s,2);
 const low=seat(s,1,'REZ-1-040','front',0,true);
 [s]=play(s,'REZ-1-034');
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 let skipped=act(structuredClone(s),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0].uid,low.uid);
 s=act(s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending,null);
 const raised=seat(s,1,'REZ-1-036','front',1,true);
 raised.buffs=[{bp:2500,untilTurn:s.turn}];
 let again=fresh(3402,{'REZ-1-034':1,'REZ-1-036':1});
 fuel(again,['REZ-1-041','REZ-1-043','REZ-1-043']);
 again=reach(again,'main');
 readyAp(again,2);
 const target=seat(again,1,'REZ-1-036','front',0,true);
 target.buffs=[{bp:2500,untilTurn:again.turn}];
 assert.equal(universalBp(packs,again,target),4500);
 [again]=play(again,'REZ-1-034');
 again=act(again,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(again.pending.kind,'effect-retire-at-least');
 assert.equal(again.pending.floor,4500);
 assert.equal(legal(again).some(a=>a.uid===null),true);
 again=act(again,{type:'chooseRetireAtLeast',uid:target.uid});
 assert.equal(again.players[1].outside.some(c=>c.uid===target.uid),true);

 let main=fresh(3403,{'REZ-1-034':2,'REZ-1-040':1,'REZ-1-036':1});
 fuel(main,['REZ-1-043','REZ-1-043','REZ-1-041']);
 main=reach(main,'main');
 const wilhelm=seat(main,0,'REZ-1-034','front',0,true);
 const second=seat(main,0,'REZ-1-034','front',1,true);
 const shown=pull(main,0,'REZ-1-036');
 const big=pull(main,0,'REZ-1-040');
 main.players[0].hand.push(shown,big);
 main=act(main,legal(main).find(a=>a.mode==='revealBottomImpact'&&a.uid===wilhelm.uid));
 main=act(main,{type:'chooseRevealBottom',uid:shown.uid});
 assert.equal(main.publicReveals.at(-1).cardId,'REZ-1-036');
 assert.equal(universalImpact(packs,main,live(main,wilhelm.uid)),0);
 assert.equal(main.players[0].deck.at(-1).uid,shown.uid);
 main=act(main,legal(main).find(a=>a.mode==='revealBottomImpact'&&a.uid===second.uid));
 main=act(main,{type:'chooseRevealBottom',uid:big.uid});
 assert.equal(universalImpact(packs,main,live(main,second.uid)),1);
 assert.equal(legal(main).some(a=>a.mode==='revealBottomImpact'&&a.uid===wilhelm.uid),false);
 assert.equal(assertUniversalMatch(packs,main),true);
});

test('REZ-1-035 and REZ-1-038 each draw and then must put one hand card outside',()=>{
 function draw(seed,id){
  let s=fresh(seed,{[id]:1});
  fuel(s,['REZ-1-043']);
  s=reach(s,'main');
  const top=s.players[0].deck[0];
  const hand=s.players[0].hand.length;
  [s]=play(s,id);
  assert.equal(s.pending.kind,'effect-discard');
  assert.equal(legal(s).some(a=>a.uid===null),false);
  s=act(s,{type:'chooseDiscard',uid:top.uid});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].outside.some(c=>c.uid===top.uid),true);
  assert.equal(s.players[0].hand.length,hand);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 draw(3501,'REZ-1-035');
 draw(3801,'REZ-1-038');
});

test('REZ-1-036 and REZ-1-048 have no printed effect',()=>{
 for(const [seed,id] of [[3601,'REZ-1-036'],[4801,'REZ-1-048']]){
  let s=fresh(seed,{[id]:1});
  s=reach(s,'main');
  const deck=s.players[0].deck.length;
  [s]=play(s,id);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[0].deck.length,deck-1,id);
  assert.equal(assertUniversalMatch(packs,s),true,id);
 }
});

test('REZ-1-037 adds blue energy only while generating, then retires at the end of main',()=>{
 let line=fresh(3701,{'REZ-1-037':1,'REZ-1-043':1});
 fuel(line,['REZ-1-043']);
 line=reach(line,'main');
 const subaru=seat(line,0,'REZ-1-037','energy',1,true);
 const before=universalEnergyByColor(packs,line,0).blue;
 const use=legal(line).find(a=>a.mode==='selfRestEnergyRetire'&&a.uid===subaru.uid);
 assert.ok(use);
 line=act(line,use);
 assert.equal(live(line,subaru.uid).ready,false);
 assert.equal(universalEnergyByColor(packs,line,0).blue,before+1);
 assert.equal(legal(line).some(a=>a.uid===subaru.uid&&a.mode==='selfRestEnergyRetire'),false);
 line=reach(line,'attack');
 assert.equal(line.players[0].outside.some(c=>c.uid===subaru.uid),true);
 assert.equal(line.players[0].removed.some(c=>c.uid===subaru.uid),false);

 let front=fresh(3702,{'REZ-1-037':1,'REZ-1-043':1});
 fuel(front,['REZ-1-043']);
 front=reach(front,'main');
 const stood=seat(front,0,'REZ-1-037','front',0,true);
 const pool=universalEnergyByColor(packs,front,0).blue;
 front=act(front,legal(front).find(a=>a.mode==='selfRestEnergyRetire'&&a.uid===stood.uid));
 assert.equal(universalEnergyByColor(packs,front,0).blue,pool);
 front=reach(front,'attack');
 assert.equal(front.players[0].outside.some(c=>c.uid===stood.uid),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});

test('REZ-1-039 removes impact for that battle only',()=>{
 function battle(seed,blockerId){
  let s=fresh(seed,{'REZ-1-039':1,'REZ-1-038':1,'REZ-1-001':1,'REZ-1-032':1,'REZ-1-029':1});
  fuel(s,['REZ-1-007','REZ-1-007','REZ-1-007']);
  s=reach(s,'main');
  const puck=seat(s,0,'REZ-1-001','front',0,true);
  [s]=cast(s,'REZ-1-032');
  s=act(s,{type:'chooseNamedDuration',uid:puck.uid});
  const blocker=seat(s,1,blockerId,'front',0,true);
  s.players[1].life.push(pull(s,1,'REZ-1-029'));
  const life=s.players[1].life.length;
  s=reach(s,'attack');
  s=act(s,{type:'attack',uid:puck.uid});
  s=act(s,{type:'chooseBlock',uid:blocker.uid});
  return {s,life,blocker};
 }
 const open=battle(3901,'REZ-1-038');
 assert.equal(open.s.players[1].life.length,open.life-1);
 assert.equal(open.s.players[1].outside.some(c=>c.uid===open.blocker.uid),true);
 const shut=battle(3902,'REZ-1-039');
 assert.equal(shut.s.players[1].life.length,shut.life);
 assert.equal(shut.s.players[1].outside.some(c=>c.uid===shut.blocker.uid),true);
 assert.equal(assertUniversalMatch(packs,shut.s),true);
});

test('REZ-1-040 draws on an ordinary play, and returns the raid base only after a raid',()=>{
 let plain=fresh(4001,{'REZ-1-040':1,'REZ-1-034':1});
 fuel(plain,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 plain=reach(plain,'main');
 const rival=seat(plain,1,'REZ-1-034','front',0,true);
 const deck=plain.players[0].deck.length;
 let played;
 [plain,played]=play(plain,'REZ-1-040');
 assert.equal(plain.players[0].deck.length,deck-2);
 assert.equal(played.ready,false);
 played.ready=true;
 plain=reach(plain,'attack');
 plain.players[1].front[0].ready=true;
 // The seated rival attacks on the following turn. Swap sides by walking.
 plain=walk(plain,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 plain=act(plain,{type:'attack',uid:rival.uid});
 plain=act(plain,{type:'chooseBlock',uid:played.uid});
 assert.notEqual(plain.pending?.kind,'effect-raid-source-rest');
 assert.equal(plain.players[0].outside.some(c=>c.uid===played.uid),true);

 let live=fresh(4002,{'REZ-1-040':1,'REZ-1-037':1,'REZ-1-034':1});
 fuel(live,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 live=reach(live,'main');
 const base=seat(live,0,'REZ-1-037','front',0,false);
 const attacker=seat(live,1,'REZ-1-034','front',0,true);
 const waiting=pull(live,0,'REZ-1-040');
 live.players[0].hand.push(waiting);
 const before=live.players[0].deck.length;
 live=act(live,legal(live).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid));
 assert.equal(live.players[0].deck.length,before-1);
 assert.equal(live.players[0].front.find(c=>c?.uid===waiting.uid).ready,true);
 live=walk(live,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 live=act(live,{type:'attack',uid:attacker.uid});
 live=act(live,{type:'chooseBlock',uid:waiting.uid});
 assert.equal(live.pending.kind,'effect-raid-source-rest');
 assert.equal(live.pending.baseUid,base.uid);
 live=act(live,legal(live).find(a=>a.type==='chooseRaidBaseRest'&&a.uid===base.uid&&a.line==='front'));
 assert.equal(live.pending,null);
 assert.equal(live.players[0].front.some(c=>c?.uid===base.uid&&c.ready===false),true);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('REZ-1-041 gains 1000 only on its turn while an energy-0 blue Subaru is on the front',()=>{
 let s=fresh(4101,{'REZ-1-041':1,'REZ-1-037':1,'REZ-1-034':1});
 s=reach(s,'main');
 const patrasche=seat(s,0,'REZ-1-041','front',0,true);
 assert.equal(universalBp(packs,s,patrasche),3000);
 const subaru=seat(s,0,'REZ-1-037','front',1,true);
 assert.equal(universalBp(packs,s,patrasche),4000);
 s.players[0].front[1]=null;
 s.players[0].energy[0]=subaru;
 assert.equal(universalBp(packs,s,patrasche),3000);
 s.players[0].energy[0]=null;
 const costly=seat(s,0,'REZ-1-034','front',1,true);
 assert.equal(universalBp(packs,s,patrasche),3000);
 s.players[0].deck.push(costly);
 s.players[0].front[1]=subaru;
 s=walk(s,x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,s,patrasche),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-042 can buff one other character on either side this turn',()=>{
 let s=fresh(4201,{'REZ-1-042':1});
 s=reach(s,'main');
 const other=seat(s,0,'REZ-1-036','front',1,true);
 const foe=seat(s,1,'REZ-1-036','front',0,true);
 let felix;
 [s,felix]=play(s,'REZ-1-042');
 assert.equal(s.pending.kind,'effect-buff-either');
 assert.equal(s.pending.choices.includes(felix.uid),false);
 assert.equal(s.pending.choices.includes(foe.uid),true);
 let skipped=act(structuredClone(s),{type:'chooseEitherBuff',uid:null});
 assert.equal(universalBp(packs,skipped,other),2000);
 s=act(s,{type:'chooseEitherBuff',uid:foe.uid});
 assert.equal(universalBp(packs,s,live(s,foe.uid)),3000);
 assert.equal(universalBp(packs,s,live(s,felix.uid)),500);
 s=walk(s,x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,s,live(s,foe.uid)),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-043 adds blue energy only while active on the energy line',()=>{
 let s=fresh(4301,{'REZ-1-043':1});
 seat(s,0,'REZ-1-043','energy',0,true);
 s=reach(s,'main');
 const felix=s.players[0].energy.find(c=>c&&c.cardId==='REZ-1-043');
 const active=universalEnergyByColor(packs,s,0).blue;
 felix.ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).blue,active-1);
 felix.ready=true;
 s.players[0].energy[0]=null;
 s.players[0].front[0]=felix;
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-044 reveals in public from an ordinary play, then takes a blue AP1 non-Ferris',()=>{
 let s=fresh(4401,{'REZ-1-044':1,'REZ-1-034':1,'REZ-1-035':1,'REZ-1-042':1});
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 s=reach(s,'main');
 const shown=pull(s,0,'REZ-1-034');
 const otto=pull(s,0,'REZ-1-035');
 const felix=pull(s,0,'REZ-1-042');
 s.players[0].hand.push(shown);
 s.players[0].outside.push(otto,felix);
 let played;
 [s,played]=play(s,'REZ-1-044');
 assert.equal(played.ready,false);
 assert.equal(s.pending.kind,'effect-reveal-optional');
 let passed=act(structuredClone(s),{type:'chooseRevealOptional',uid:null});
 assert.equal(passed.pending,null);
 s=act(s,{type:'chooseRevealOptional',uid:shown.uid});
 assert.equal(s.publicReveals.at(-1).kind,'hand-to-bottom');
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-034');
 assert.equal(s.players[0].deck.at(-1).uid,shown.uid);
 assert.equal(s.pending.kind,'effect-outside-referenced');
 assert.equal(s.pending.ceiling,4000);
 assert.deepEqual(s.pending.choices,[otto.uid]);
 s=act(s,{type:'chooseOutsideReferenced',mode:'rest',uid:otto.uid,line:'front',slot:1});
 assert.equal(s.players[0].front[1].uid,otto.uid);
 assert.equal(s.players[0].front[1].ready,false);

 let raid=fresh(4402,{'REZ-1-044':1,'REZ-1-042':1});
 fuel(raid,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 raid=reach(raid,'main');
 const base=seat(raid,0,'REZ-1-042','front',0,false);
 const waiting=pull(raid,0,'REZ-1-044');
 raid.players[0].hand.push(waiting);
 raid=act(raid,legal(raid).find(a=>a.type==='raid'&&a.uid===waiting.uid&&a.baseUid===base.uid));
 assert.equal(raid.players[0].front.find(c=>c?.uid===waiting.uid).ready,true);
 assert.equal((raid.players[0].front.find(c=>c?.uid===waiting.uid).stack||[]).some(c=>c.uid===base.uid),true);
 assert.equal(raid.pending.kind,'effect-reveal-optional');
 assert.equal(assertUniversalMatch(packs,raid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-045 publishes the bottomed card and gains 2500 only at BP 4000',()=>{
 let s=fresh(4501,{'REZ-1-045':2,'REZ-1-040':1,'REZ-1-036':1});
 s=reach(s,'main');
 const mimi=seat(s,0,'REZ-1-045','front',0,true);
 const other=seat(s,0,'REZ-1-045','front',1,true);
 const small=pull(s,0,'REZ-1-036');
 const big=pull(s,0,'REZ-1-040');
 s.players[0].hand.push(small,big);
 s=act(s,legal(s).find(a=>a.mode==='revealBottomBuff'&&a.uid===mimi.uid));
 s=act(s,{type:'chooseRevealBottom',uid:small.uid});
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-036');
 assert.equal(universalBp(packs,s,mimi),1500);
 s=act(s,legal(s).find(a=>a.mode==='revealBottomBuff'&&a.uid===other.uid));
 s=act(s,{type:'chooseRevealBottom',uid:big.uid});
 assert.equal(universalBp(packs,s,live(s,other.uid)),4000);
 assert.equal(legal(s).some(a=>a.mode==='revealBottomBuff'&&a.uid===mimi.uid),false);
 s=walk(s,x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,s,live(s,other.uid)),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-046 actives and gains 1000 only after returning an energy-0 blue Subaru',()=>{
 let s=fresh(4601,{'REZ-1-046':1,'REZ-1-037':1,'REZ-1-034':1});
 fuel(s,['REZ-1-043','REZ-1-043']);
 s=reach(s,'main');
 const subaru=seat(s,0,'REZ-1-037','front',1,true);
 const other=seat(s,0,'REZ-1-034','energy',2,false);
 let julius;
 [s,julius]=play(s,'REZ-1-046');
 assert.equal(s.pending.kind,'effect-return-printed');
 assert.deepEqual(s.pending.choices,[subaru.uid]);
 let skipped=act(structuredClone(s),{type:'chooseReturnPrinted',uid:null});
 assert.equal(skipped.players[0].front.find(c=>c?.uid===julius.uid).ready,false);
 assert.equal(universalBp(packs,skipped,live(skipped,julius.uid)),3000);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===subaru.uid),true);
 s=act(s,{type:'chooseReturnPrinted',uid:subaru.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===subaru.uid),true);
 assert.equal(s.players[0].front.find(c=>c?.uid===julius.uid).ready,true);
 assert.equal(universalBp(packs,s,live(s,julius.uid)),4000);
 assert.equal(s.players[0].energy[2].uid,other.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-047 pays one AP and stays in hand at printed BP 3000',()=>{
 let s=fresh(4701,{'REZ-1-047':1,'REZ-1-043':1});
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043']);
 s=reach(s,'main');
 const card=pull(s,0,'REZ-1-047');
 s.players[0].hand.push(card);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(s,legal(s).find(a=>a.type==='handActivate'&&a.uid===card.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===card.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===card.uid),false);
 assert.equal(s.publicReveals.at(-1).kind,'hand-activate');
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-047');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);

 let may=fresh(4702,{'REZ-1-047':1,'REZ-1-058':1,'REZ-1-036':1});
 fuel(may,['REZ-1-043','REZ-1-043','REZ-1-043']);
 may=reach(may,'main');
 const crusch=pull(may,0,'REZ-1-058');
 const under=may.players[0].deck.pop();
 under.faceDown=false;
 crusch.stack=[under];
 crusch.ready=true;
 crusch.fieldEntryStamp=may.nextFieldEntryStamp++;
 may.players[0].front[0]=crusch;
 const rested=seat(may,0,'REZ-1-036','front',1,false);
 const rick=pull(may,0,'REZ-1-047');
 may.players[0].hand.push(rick);
 may=act(may,legal(may).find(a=>a.type==='handActivate'&&a.uid===rick.uid));
 assert.equal(may.pending.kind,'effect-hand-deploy-may');
 let declined=act(structuredClone(may),{type:'chooseHandDeployMay',mode:'decline'});
 assert.equal(declined.players[0].hand.some(c=>c.uid===rick.uid),true);
 may=act(may,{type:'chooseHandDeployMay',mode:'accept'});
 assert.equal(may.pending.kind,'effect-hand-rest-entry');
 may=act(may,{type:'chooseHandRestEntry',uid:rick.uid,line:'energy',slot:3});
 assert.equal(may.players[0].energy[3].uid,rick.uid);
 assert.equal(may.players[0].energy[3].ready,false);
 assert.equal(may.pending.kind,'effect-active-other');
 may=act(may,{type:'chooseActiveOther',uid:rested.uid});
 assert.equal(may.players[0].front[1].ready,true);
 assert.equal(assertUniversalMatch(packs,may),true);
});

test('REZ-1-049 looks at three cards privately and discards only after adding one',()=>{
 let s=fresh(4901,{'REZ-1-049':1,'REZ-1-037':1,'REZ-1-007':1,'REZ-1-036':1});
 fuel(s,['REZ-1-043']);
 s=reach(s,'main');
 const spare=pull(s,0,'REZ-1-036');
 const [miss,subaru,rem]=setTop(s,0,['REZ-1-007','REZ-1-037','REZ-1-048']);
 s.players[0].hand.push(spare);
 [s]=play(s,'REZ-1-049');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[miss.uid,subaru.uid,rem.uid]);
 assert.equal(s.pending.choices.includes(miss.uid),false);
 assert.equal(s.pending.choices.includes(subaru.uid),true);
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),[miss.uid,subaru.uid,rem.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(r=>r.uid===miss.uid||r.uid===subaru.uid),false);
 let none=act(structuredClone(s),{type:'chooseTopFiltered',uid:null});
 none=act(none,{type:'chooseTopOrder',uid:rem.uid});
 none=act(none,{type:'chooseTopOrder',uid:subaru.uid});
 none=act(none,{type:'chooseTopOrder',uid:miss.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].deck.at(-1).uid,miss.uid);
 assert.equal(none.players[0].hand.some(c=>c.uid===spare.uid),true);
 s=act(s,{type:'chooseTopFiltered',uid:subaru.uid});
 assert.equal(s.publicReveals.at(-1).kind,'searched-to-hand');
 assert.equal(s.publicReveals.at(-1).uid,subaru.uid);
 assert.equal(s.publicReveals.filter(r=>r.uid===miss.uid||r.uid===rem.uid).length,0);
 s=act(s,{type:'chooseTopOrder',uid:rem.uid});
 s=act(s,{type:'chooseTopOrder',uid:miss.uid});
 assert.equal(s.pending.kind,'effect-discard');
 s=act(s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===subaru.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(s.players[0].deck.at(-1).uid,miss.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-050 looks privately and the color trigger bounces only BP 3500 or less',()=>{
 let s=fresh(5001,{'REZ-1-050':1,'REZ-1-036':1,'REZ-1-037':1});
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043']);
 s=reach(s,'main');
 const [keep,drop]=setTop(s,0,['REZ-1-036','REZ-1-037']);
 [s]=play(s,'REZ-1-050');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 assert.deepEqual(universalPrivateChoices(packs,s,0).options.filter(o=>o.card).map(o=>o.card.cardId).sort(),
  ['REZ-1-036','REZ-1-037']);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=act(s,{type:'chooseInspectedOutside',uid:drop.uid});
 s=act(s,{type:'chooseInspectedOutside',uid:null});
 assert.equal(s.pending.kind,'effect-top-order');
 s=act(s,{type:'chooseTopOrder',uid:keep.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,keep.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===drop.uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===keep.uid||r.uid===drop.uid),false);

 let life=fresh(5002,{'REZ-1-050':1,'REZ-1-041':1,'REZ-1-040':1});
 const small=seat(life,1,'REZ-1-041','front',0,true);
 const big=seat(life,1,'REZ-1-040','front',1,true);
 life.players[0].deck.push(life.players[0].life[0]);
 life.players[0].life[0]=pull(life,0,'REZ-1-050');
 life=walk(life,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 life=act(life,{type:'attack',uid:small.uid});
 life=act(life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'color');
 assert.equal(legal(life).some(a=>a.mode==='colorBounce'&&a.uid===small.uid),true);
 assert.equal(legal(life).some(a=>a.uid===big.uid),false);
 life=act(life,{type:'chooseTrigger',mode:'colorBounce',uid:small.uid});
 assert.equal(life.players[1].hand.some(c=>c.uid===small.uid),true);
 assert.equal(life.players[1].front[1].uid,big.uid);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('life symbols on 027 through 049 resolve on that card',()=>{
 function hit(seed,id,extra={}){
  let s=fresh(seed,{[id]:1,...extra});
  const attacker=seat(s,0,'REZ-1-036','front',0,true);
  s.players[1].deck.push(...s.players[1].life);
  s.players[1].life=[pull(s,1,id)];
  s=walk(s,x=>x.phase==='attack'&&!x.pending);
  s=act(s,{type:'attack',uid:attacker.uid});
  if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
  return {s,attacker};
 }
 const draw=hit(3511,'REZ-1-035');
 assert.equal(draw.s.pending.trigger,'draw');
 const hand=draw.s.players[1].hand.length;
 draw.s=act(draw.s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(draw.s.players[1].hand.length,hand+1);
 assert.equal(draw.s.players[1].outside.some(c=>c.cardId==='REZ-1-035'),true);

 const got=hit(4811,'REZ-1-048');
 assert.equal(got.s.pending.trigger,'get');
 got.s=act(got.s,{type:'chooseTrigger',mode:'get'});
 assert.equal(got.s.players[1].hand.some(c=>c.cardId==='REZ-1-048'),true);

 const active=hit(3611,'REZ-1-036');
 const rested=seat(active.s,1,'REZ-1-007','front',0,false);
 assert.equal(active.s.pending.trigger,'active');
 active.s=act(active.s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(active.s.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,active.s,live(active.s,rested.uid)),5000);

 const final=hit(2911,'REZ-1-029');
 const top=final.s.players[1].deck[0];
 assert.equal(final.s.pending.trigger,'final');
 assert.equal(final.s.players[1].life.length,0);
 final.s=act(final.s,{type:'chooseTrigger',mode:'final'});
 assert.equal(final.s.players[1].life.length,1);
 assert.equal(final.s.players[1].life[0].uid,top.uid);

 const raid=hit(2711,'REZ-1-027');
 assert.equal(raid.s.pending.trigger,'raid');
 assert.equal(legal(raid.s).some(a=>a.mode==='get'),true);
 assert.equal(legal(raid.s).some(a=>a.mode==='raid'),false);
 raid.s=act(raid.s,{type:'chooseTrigger',mode:'get'});
 assert.equal(raid.s.players[1].hand.some(c=>c.cardId==='REZ-1-027'),true);

 const special=hit(3111,'REZ-1-031');
 assert.equal(special.s.pending.trigger,'special');
 special.s=act(special.s,{type:'chooseTrigger',mode:'special',uid:special.attacker.uid});
 assert.equal(special.s.players[0].outside.some(c=>c.uid===special.attacker.uid),true);

 const quiet=hit(2811,'REZ-1-028');
 assert.equal(quiet.s.pending,null);
 assert.equal(quiet.s.players[1].outside.some(c=>c.cardId==='REZ-1-028'),true);
 assert.equal(assertUniversalMatch(packs,quiet.s),true);
 assert.equal(assertUniversalMatch(packs,draw.s),true);
});

test('every life symbol in 026-050 resolves on that card',()=>{
 const rows=[
  ['REZ-1-030','final'],['REZ-1-032','active'],['REZ-1-033','special'],
  ['REZ-1-034','active'],['REZ-1-037',null],['REZ-1-038','draw'],
  ['REZ-1-039','active'],['REZ-1-040','raid'],['REZ-1-041','active'],
  ['REZ-1-042','active'],['REZ-1-043',null],['REZ-1-044','get'],
  ['REZ-1-045','active'],['REZ-1-046',null],['REZ-1-047','active'],
  ['REZ-1-049','active']
 ];
 rows.forEach(([id,symbol],index)=>{
  const hit=(()=>{
   let s=fresh(9000+index,{[id]:1});
   const attacker=seat(s,0,'REZ-1-036','front',0,true);
   s.players[1].deck.push(...s.players[1].life);
   s.players[1].life=[pull(s,1,id)];
   s=walk(s,x=>x.phase==='attack'&&!x.pending);
   s=act(s,{type:'attack',uid:attacker.uid});
   if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
   return {s,attacker};
  })();
  if(!symbol){
   assert.equal(hit.s.pending,null,id);
   assert.equal(hit.s.players[1].outside.some(c=>c.cardId===id),true,id);
   return;
  }
  assert.equal(hit.s.pending.trigger,symbol,id);
  if(symbol==='draw'){
   const hand=hit.s.players[1].hand.length;
   hit.s=act(hit.s,{type:'chooseTrigger',mode:'draw'});
   assert.equal(hit.s.players[1].hand.length,hand+1,id);
   assert.equal(hit.s.players[1].outside.some(c=>c.cardId===id),true,id);
  }else if(symbol==='get'){
   hit.s=act(hit.s,{type:'chooseTrigger',mode:'get'});
   assert.equal(hit.s.players[1].hand.some(c=>c.cardId===id),true,id);
  }else if(symbol==='active'){
   const rested=seat(hit.s,1,'REZ-1-007','front',0,false);
   hit.s=act(hit.s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
   assert.equal(live(hit.s,rested.uid).ready,true,id);
   assert.equal(universalBp(packs,hit.s,live(hit.s,rested.uid)),5000,id);
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
  }
  assert.equal(assertUniversalMatch(packs,hit.s),true,id);
 });
});
