// UA55BT/IMC-1-001–050. Official text is the catalog effectJa fetched with the card table.
// Each case plays that card. A shared sentence on another number is not evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_CARDS_001_050} from '../dist/imc/cards-001-050.mjs';
import {IMC_PROGRAMS_001_050} from '../dist/universal-v2/imc/programs-001-050.mjs';
import {IMC_REQUESTS_001_050} from '../dist/universal-v2/imc/requests-001-050.mjs';
import {runImc001} from '../dist/universal-v2/imc/runtime-001-050.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {assertImcSharedRequest} from '../dist/universal-v2/imc-runtime.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 universalImpactNull,universalPrivateChoices,universalPublicView,universalCardEnergy,zoneRequiredEnergy
} from '../dist/universal-v2/engine.mjs';

const pack=createImcV2Pack();
const byId=Object.fromEntries(IMC_CARDS_001_050.map(c=>[c.id,c]));
const READY=['IMC-1-001','IMC-1-002','IMC-1-005','IMC-1-006','IMC-1-007','IMC-1-008','IMC-1-010',
 'IMC-1-013','IMC-1-014','IMC-1-015','IMC-1-017','IMC-1-018','IMC-1-019','IMC-1-021','IMC-1-022',
 'IMC-1-023','IMC-1-025','IMC-1-026','IMC-1-027','IMC-1-030','IMC-1-031','IMC-1-034','IMC-1-035',
 'IMC-1-038','IMC-1-040','IMC-1-041','IMC-1-042','IMC-1-044','IMC-1-045','IMC-1-046','IMC-1-047',
 'IMC-1-048','IMC-1-049','IMC-1-050'];
const OPEN=['IMC-1-003','IMC-1-004','IMC-1-009','IMC-1-011','IMC-1-012','IMC-1-016','IMC-1-020',
 'IMC-1-024','IMC-1-028','IMC-1-029','IMC-1-032','IMC-1-033','IMC-1-036','IMC-1-037','IMC-1-039',
 'IMC-1-043'];
const FILL=['IMC-1-007','IMC-1-025','IMC-1-001','IMC-1-010','IMC-1-013','IMC-1-021',
 'IMC-1-002','IMC-1-035','IMC-1-040','IMC-1-038','IMC-1-034','IMC-1-047','IMC-1-018',
 'IMC-1-022','IMC-1-041','IMC-1-044'];

function counts(extra={}){
 const c={...extra};
 let n=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of FILL)if((c[id]||0)<2&&n<50){c[id]=(c[id]||0)+1;n++;}
 for(const id of FILL){
  const add=Math.min(4-(c[id]||0),50-n);
  if(add>0){c[id]=(c[id]||0)+add;n+=add;}
  if(n===50)break;
 }
 assert.equal(n,50);
 assert.deepEqual(validateUniversalDeck(pack,c),[]);
 return c;
}
const fresh=(seed,extra)=>{
 activePack=pack;
 return newUniversalMatch(pack,{decks:[counts(extra),counts(extra)],first:0,seed});
};
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
let activePack=pack;
function legal(s){return legalUniversalActions(activePack,s);}
function act(s,action){return dispatchUniversalAction(activePack,s,action);}
function strike(s,uid){
 s=act(s,{type:'attack',uid});
 if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
 return s;
}
function reach(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++){
  const next=legal(s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase+' '+(s.pending?.kind||s.phase));
  s=act(s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function hold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function play(s,id,line='front',p=0){
 const card=hold(s,id,p);
 const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [act(s,action),card];
}
function cast(s,id,p=0){
 const card=hold(s,id,p);
 const action=legal(s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id+' event');
 return [act(s,action),card];
}
function setTop(s,p,ids){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function order(s){
 const picked=[];
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  picked.push(uid);
  s=act(s,{type:'chooseTopOrder',uid});
 }
 return [s,picked];
}
function discard(s){
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const uid=s.players[s.pending.player].hand[0].uid;
 return act(s,{type:'chooseDiscard',uid});
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
function energy(s,p=0){return universalEnergyByColor(pack,s,p);}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function yieldTurn(s){
 const who=s.active;
 for(let i=0;i<8&&s.active===who;i++){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
   continue;
  }
  assert.equal(s.pending,null);
  s=act(s,legal(s).find(a=>a.type==='next'));
 }
 assert.notEqual(s.active,who);
 return s;
}
function readyAp(s,n=3,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function skipLife(s){
 if(s.pending?.kind==='life-trigger')return act(s,{type:'chooseTrigger',mode:'skip'});
 return s;
}
function clearStrike(s){
 if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
 return skipLife(s);
}
function armLife(s,owner,id){
 const trigger=pull(s,owner,id);
 while(s.players[owner].life.length>=7)
  s.players[owner].deck.push(s.players[owner].life.shift());
 s.players[owner].life.unshift(trigger);
 return trigger;
}
function sourceCard(id){
 const card=byId[id],program=IMC_PROGRAMS_001_050[id];
 const extra={implementation:program.implementation};
 for(const key of ['effects','mainAbility','triggerEffect','impactNull','printedImpact','raidName',
  'activeExtraEnergy','ownTurnBp','emptyOwnFieldHandEnergyDiscount','readyOnBlockCount','passiveBonuses'])
  if(program[key]!==undefined)extra[key]=program[key];
 return {id:card.id,name:card.nameJa,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,traits:[...card.traits],trigger:card.trigger,...extra};
}
function shell(extra){
 return {id:extra.id,name:extra.name,color:extra.color||'yellow',type:extra.type||'character',
  energy:extra.energy??0,ap:1,bp:extra.bp??0,gen:1,traits:extra.traits||[],trigger:null,
  implementation:extra.implementation||'vanilla',...extra};
}

test('IMC B keeps the closed-job failure and only publishes complete cards',()=>{
 assert.throws(()=>runImc001(null,null,{id:'IMC-1-001'}),/B 組還沒有/);
 assert.deepEqual(Object.keys(IMC_PROGRAMS_001_050).sort(),[...READY].sort());
 assert.deepEqual(IMC_REQUESTS_001_050.map(row=>row.cardId),OPEN);
 for(const id of READY){
  const program=IMC_PROGRAMS_001_050[id];
  assert.equal(program.ready,true);
  assert.ok(program.implementation==='dsl'||program.implementation==='vanilla');
  if(byId[id].effectJa!=='-')assert.equal(program.implementation,'dsl');
  assert.equal(pack.cards[id].id,id);
  const walk=list=>{(list||[]).forEach(op=>{
   assert.notEqual(op.op,'imc');
   walk(op.then);walk(op.after);
  });};
  for(const list of Object.values(program.effects||{}))walk(list);
 }
 for(const id of OPEN){
  assert.equal(IMC_PROGRAMS_001_050[id],undefined);
  assert.equal(pack.cards[id],undefined);
 }
 for(const row of IMC_REQUESTS_001_050)assertImcSharedRequest(row);
 for(const card of IMC_CARDS_001_050)assert.equal(card.battleReady,false);
 assert.equal(assertUniversalMatch(pack,fresh(1)),true);
});

test('IMC-1-001 rests for yellow energy and leaves at the end of main',()=>{
 let s=reach(fresh(1001,{'IMC-1-001':4}),'main');
 const held=hold(s,'IMC-1-001');
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===held.uid),false);
 let front;
 [s,front]=play(s,'IMC-1-001','front');
 assert.equal(live(s,front.uid).ready,false);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===front.uid),false);
 assert.equal(energy(s).yellow||0,0);
 live(s,front.uid).ready=true;
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===front.uid));
 assert.equal(live(s,front.uid).ready,false);
 assert.equal(energy(s).yellow||0,0);
 live(s,front.uid).ready=true;
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===front.uid),false);
 s=act(s,legal(s).find(a=>a.type==='next'));
 assert.equal(s.phase,'attack');
 assert.ok(s.players[0].outside.some(c=>c.uid===front.uid));

 s=reach(fresh(1002,{'IMC-1-001':4}),'main');
 let gen;
 [s,gen]=play(s,'IMC-1-001','energy');
 assert.equal(energy(s).yellow,1);
 assert.equal(energy(s).blue||0,0);
 live(s,gen.uid).ready=true;
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===gen.uid&&a.mode==='selfRestEnergyRetire'));
 assert.equal(energy(s).yellow,2);
 assert.equal(energy(s).blue||0,0);
 live(s,gen.uid).ready=true;
 assert.equal(legal(s).some(a=>a.uid===gen.uid&&a.type==='activate'),false);
 s=act(s,legal(s).find(a=>a.type==='next'));
 assert.ok(s.players[0].outside.some(c=>c.uid===gen.uid));
 assert.equal(energy(s).yellow||0,0);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-002 returns another energy-1 character, or itself when none qualifies',()=>{
 let s=reach(fresh(2001,{'IMC-1-019':1,'IMC-1-007':4}),'main');
 fuel(s,['IMC-1-019']);
 const low=seat(s,0,'IMC-1-007','front',0,true);
 const tall=s.players[0].energy[0];
 let rider;
 [s,rider]=play(s,'IMC-1-002','front');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(tall.uid),false);
 assert.equal(s.pending.choices.includes(rider.uid),false);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const deck=s.players[0].deck.length;
 s=act(s,{type:'chooseOwnBounce',uid:low.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===low.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===rider.uid));
 assert.equal(s.players[0].deck.length,deck);

 s=reach(fresh(2002,{'IMC-1-019':1}),'main');
 fuel(s,['IMC-1-019']);
 const stay=s.players[0].energy.find(Boolean);
 [s,rider]=play(s,'IMC-1-002','energy');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===rider.uid));
 assert.ok(s.players[0].energy.some(c=>c?.uid===stay.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-007 has no printed effect and its active trigger can be declined',()=>{
 let s=reach(fresh(7001),'main');
 const card=hold(s,'IMC-1-007');
 const before=s.players[0].deck.length;
 [s]=play(s,'IMC-1-007');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before);
 assert.equal(card.cardId,'IMC-1-007');
 const rested=seat(s,1,'IMC-1-035','front',0,false);
 const hidden=seat(s,0,'IMC-1-035','energy',0,false);
 const trigger=armLife(s,1,'IMC-1-007');
 s=reach(s,'attack');
 const attacker=seat(s,0,'IMC-1-025','front',1,true);
 s=act(s,{type:'attack',uid:attacker.uid});
 s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'active');
 assert.equal(legal(s).some(a=>a.mode==='active'&&a.uid===rested.uid),true);
 assert.equal(legal(s).some(a=>a.uid===hidden.uid||a.uid===attacker.uid),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(live(skipped,rested.uid).ready,false);
 assert.equal(universalBp(pack,skipped,live(skipped,rested.uid)),2000);
 s=act(s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(live(s,rested.uid).ready,true);
 assert.equal(universalBp(pack,s,live(s,rested.uid)),5000);
 assert.ok(s.players[1].outside.some(c=>c.uid===trigger.uid));
 const empty=reach(fresh(7002),'attack');
 const lone=seat(empty,0,'IMC-1-007','front',0,true);
 armLife(empty,1,'IMC-1-007');
 let bare=strike(empty,lone.uid);
 assert.equal(bare.pending.trigger,'active');
 assert.deepEqual(legal(bare).map(a=>a.mode),['skip']);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-010 shows all seven cards and adds only a yellow field',()=>{
 let s=reach(fresh(10001),'main');
 const window=setTop(s,0,['IMC-1-021','IMC-1-021','IMC-1-025','IMC-1-025','IMC-1-035','IMC-1-038','IMC-1-040']);
 const coming=pull(s,0,'IMC-1-010');
 const hand=s.players[0].hand.length;
 s.players[0].hand.push(coming);
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===coming.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 const seen=universalPrivateChoices(pack,s,0);
 assert.equal(seen.options.length,7);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 [s]=order(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);
 assert.deepEqual(s.players[0].deck.slice(-7).map(c=>c.uid),window.map(c=>c.uid));

 const field=shell({id:'IMC-PROBE-FIELD',name:'テストフィールド',type:'field',energy:1,bp:0});
 const blue=shell({id:'IMC-PROBE-BLUE',name:'青いフィールド',type:'field',color:'blue',energy:1,bp:0});
 const probe=createUniversalPack({id:'imc-010',cards:[...READY.map(sourceCard),field,blue]});
 const deck={...counts(),'IMC-PROBE-FIELD':1,'IMC-PROBE-BLUE':1,'IMC-1-007':2};
 assert.deepEqual(validateUniversalDeck(probe,deck),[]);
 activePack=probe;
 s=newUniversalMatch(probe,{decks:[deck,deck],first:0,seed:10002});
 s=reach(s,'main');
 const top=[];
 for(const id of ['IMC-PROBE-FIELD','IMC-PROBE-BLUE','IMC-1-021'])top.push(pull(s,0,id));
 s.players[0].deck.unshift(...top);
 [s]=(()=>{const card=pull(s,0,'IMC-1-010');s.players[0].hand.push(card);
  return [dispatchUniversalAction(probe,s,legalUniversalActions(probe,s).find(a=>a.type==='play'&&a.uid===card.uid))];})();
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.uids.length,7);
 assert.deepEqual(s.pending.uids.slice(0,3),top.map(c=>c.uid));
 assert.deepEqual(s.pending.choices,[top[0].uid]);
 const look=universalPrivateChoices(probe,s,0);
 assert.equal(look.inspected.length,7);
 assert.deepEqual(look.inspected.slice(0,3).map(c=>c.uid),top.map(c=>c.uid));
 assert.equal(look.options.some(o=>o.action.uid===top[1].uid||o.action.uid===top[2].uid),false);
 assert.equal(universalPrivateChoices(probe,s,1),null);
 const declined=dispatchUniversalAction(probe,structuredClone(s),{type:'chooseTopFiltered',uid:null});
 assert.equal(declined.players[0].hand.some(c=>c.uid===top[0].uid),false);
 assert.equal(declined.pending?.kind==='effect-discard',false);
 s=dispatchUniversalAction(probe,s,{type:'chooseTopFiltered',uid:top[0].uid});
 while(s.pending?.kind==='effect-top-order')
  s=dispatchUniversalAction(probe,s,{type:'chooseTopOrder',uid:s.pending.uids.find(id=>!s.pending.order.includes(id))});
 assert.equal(s.pending.kind,'effect-discard');
 assert.ok(s.players[0].hand.some(c=>c.uid===top[0].uid));
 s=dispatchUniversalAction(probe,s,{type:'chooseDiscard',uid:s.players[0].hand.find(c=>c.uid!==top[0].uid).uid});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('IMC-1-013 may buff another Beyond character and not itself or another trait',()=>{
 let s=reach(fresh(13001),'main');
 const ally=seat(s,0,'IMC-1-007','front',0,true);
 const other=seat(s,0,'IMC-1-021','energy',0,true);
 let self;
 [s,self]=play(s,'IMC-1-013');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[ally.uid]);
 assert.equal(legal(s).some(a=>a.uid===null),true);
 const skipped=act(structuredClone(s),{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(pack,skipped,live(skipped,ally.uid)),2000);
 s=act(s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(pack,s,live(s,ally.uid)),3000);
 assert.equal(universalBp(pack,s,live(s,other.uid)),1500);
 assert.equal(universalBp(pack,s,live(s,self.uid)),1000);
 s=reach(fresh(13002),'main');
 [s,self]=play(s,'IMC-1-013');
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,live(s,self.uid)),1000);
 const trigger=armLife(s,1,'IMC-1-013');
 const attacker=seat(s,0,'IMC-1-007','front',1,true);
 s=reach(s,'attack');
 const deck=s.players[1].deck.length;
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'draw');
 const skippedLife=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(skippedLife.players[1].deck.length,deck);
 s=act(s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(s.players[1].deck.length,deck-1);
 assert.ok(s.players[1].outside.some(c=>c.uid===trigger.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-014 searches Beyond, discards only after adding, and rests on its color trigger',()=>{
 let s=reach(fresh(14001,{'IMC-1-014':1}),'main');
 assert.equal(legal(s).some(a=>a.type==='play'&&a.line==='front'),true);
 const broke=hold(s,'IMC-1-014');
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===broke.uid),false);
 fuel(s,['IMC-1-007']);
 const window=setTop(s,0,['IMC-1-007','IMC-1-021','IMC-1-025']);
 [s]=play(s,'IMC-1-014');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 const look=universalPrivateChoices(pack,s,0);
 assert.equal(look.inspected.length,3);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 const declined=act(structuredClone(s),{type:'chooseTopFiltered',uid:null});
 assert.equal(declined.pending?.kind==='effect-discard',false);
 assert.equal(declined.players[0].hand.some(c=>c.uid===window[0].uid),false);
 s=act(s,{type:'chooseTopFiltered',uid:window[0].uid});
 [s]=order(s);
 s=discard(s);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.equal(s.players[0].outside.length,1);

 s=reach(fresh(14002,{'IMC-1-014':1}),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 const witness=seat(s,0,'IMC-1-025','front',1,true);
 const energyCard=seat(s,0,'IMC-1-021','energy',0,true);
 const trigger= armLife(s,1,'IMC-1-014');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'color');
 assert.equal(legal(s).some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),true);
 assert.equal(legal(s).some(a=>a.mode==='colorRestSkip'&&a.uid===witness.uid),true);
 assert.equal(legal(s).some(a=>a.uid===energyCard.uid),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(live(skipped,witness.uid).ready,true);
 assert.equal(skipped.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 s=act(s,{type:'chooseTrigger',mode:'colorRestSkip',uid:witness.uid});
 assert.equal(live(s,witness.uid).ready,false);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===witness.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===trigger.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-018 adds only Positive Passion and its active trigger is optional',()=>{
 let s=reach(fresh(18001,{'IMC-1-018':1}),'main');
 fuel(s,['IMC-1-007']);
 const window=setTop(s,0,['IMC-1-021','IMC-1-007','IMC-1-010']);
 [s]=play(s,'IMC-1-018');
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,3);
 s=act(s,{type:'chooseTopFiltered',uid:window[0].uid});
 [s]=order(s);
 s=discard(s);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 s=reach(fresh(18002,{'IMC-1-018':1}),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 const mine=seat(s,1,'IMC-1-035','front',0,false);
 armLife(s,1,'IMC-1-018');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'active');
 assert.equal(legal(s).some(a=>a.uid===attacker.uid),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(live(skipped,mine.uid).ready,false);
 s=act(s,{type:'chooseTrigger',mode:'active',uid:mine.uid});
 assert.equal(live(s,mine.uid).ready,true);
 assert.equal(universalBp(pack,s,live(s,mine.uid)),5000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-019 draws on play and rests on its color trigger',()=>{
 let s=reach(fresh(19001,{'IMC-1-019':1}),'main');
 const unpaid=hold(s,'IMC-1-019');
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 fuel(s,['IMC-1-007','IMC-1-025','IMC-1-001']);
 const deck=s.players[0].deck.length;
 [s]=play(s,'IMC-1-019');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 s=reach(fresh(19002,{'IMC-1-019':1}),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 const back=seat(s,0,'IMC-1-021','energy',0,true);
 armLife(s,1,'IMC-1-019');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'color');
 assert.equal(legal(s).some(a=>a.uid===back.uid),false);
 s=act(s,{type:'chooseTrigger',mode:'colorRestSkip',uid:attacker.uid});
 assert.equal(live(s,attacker.uid).ready,false);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===attacker.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-021 draws and must discard, and does not draw on attack',()=>{
 let s=reach(fresh(21001),'main');
 const card=pull(s,0,'IMC-1-021');
 s.players[0].hand.push(card);
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=discard(s);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.players[0].outside.length,1);
 s=reach(s,'attack');
 live(s,card.uid).ready=true;
 const before=s.players[0].deck.length;
 s=act(s,{type:'attack',uid:card.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].deck.length,before);
 let life=reach(fresh(21002),'attack');
 const attacker=seat(life,0,'IMC-1-007','front',0,true);
 const armed=armLife(life,1,'IMC-1-021');
 const lifeDeck=life.players[1].deck.length;
 life=strike(life,attacker.uid);
 assert.equal(life.pending.trigger,'draw');
 const skipped=act(structuredClone(life),{type:'chooseTrigger',mode:'skip'});
 assert.equal(skipped.players[1].deck.length,lifeDeck);
 life=act(life,{type:'chooseTrigger',mode:'draw'});
 assert.equal(life.players[1].deck.length,lifeDeck-1);
 assert.ok(life.players[1].outside.some(c=>c.uid===armed.uid));
 assert.equal(assertUniversalMatch(pack,life),true);
});

test('IMC-1-022 rests another active front character, then gains yellow energy',()=>{
 let s=reach(fresh(22001),'main');
 const self=seat(s,0,'IMC-1-022','energy',0,true);
 const ally=seat(s,0,'IMC-1-007','front',0,true);
 const back=seat(s,0,'IMC-1-021','front',1,false);
 assert.equal(energy(s).yellow,1);
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===self.uid));
 assert.equal(s.pending.kind,'main-rest-front-energy');
 assert.deepEqual(s.pending.choices,[ally.uid]);
 assert.equal(legal(s).some(a=>a.uid===null||a.uid===self.uid||a.uid===back.uid),false);
 s=act(s,{type:'chooseRestFrontEnergy',uid:ally.uid});
 assert.equal(live(s,self.uid).ready,false);
 assert.equal(live(s,ally.uid).ready,false);
 assert.equal(energy(s).yellow,2);
 assert.equal(energy(s).blue||0,0);
 live(s,self.uid).ready=true;
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===self.uid),false);

 s=reach(fresh(22002),'main');
 const alone=seat(s,0,'IMC-1-022','front',0,true);
 const tired=seat(s,0,'IMC-1-007','front',1,false);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===alone.uid),false);
 assert.equal(tired.ready,false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-025 does nothing on play and its draw trigger can be skipped',()=>{
 let s=reach(fresh(25001),'main');
 hold(s,'IMC-1-025');
 const deck=s.players[0].deck.length;
 [s]=play(s,'IMC-1-025');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 s=reach(fresh(25002),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 armLife(s,1,'IMC-1-025');
 const lifeDeck=s.players[1].deck.length;
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'draw');
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(skipped.players[1].deck.length,lifeDeck);
 s=act(s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(s.players[1].deck.length,lifeDeck-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-030 retires by printed BP, scales at three Passion, and its special trigger retires',()=>{
 let s=reach(fresh(30001,{'IMC-1-030':1,'IMC-1-001':4}),'main');
 const poor=hold(s,'IMC-1-030');
 assert.equal(legal(s).some(a=>a.type==='event'&&a.uid===poor.uid),false);
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001','IMC-1-001']);
 const victim=seat(s,1,'IMC-1-007','front',0,true);
 const back=seat(s,1,'IMC-1-021','energy',0,true);
 [s]=cast(s,'IMC-1-030');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.deepEqual(s.pending.choices,[victim.uid]);
 assert.equal(legal(s).some(a=>a.uid===null||a.uid===back.uid),false);
 const deck=s.players[1].deck.length;
 s=act(s,{type:'chooseRetireBp',uid:victim.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===victim.uid));
 assert.equal(s.players[1].deck.length,deck);

 const tall=shell({id:'IMC-PROBE-TALL',name:'テスト',bp:4000,traits:['ポジティブパッション']});
 const probe=createUniversalPack({id:'imc-030',cards:[...READY.map(sourceCard),tall]});
 const deckCounts={...counts({'IMC-1-030':1}),'IMC-PROBE-TALL':1,'IMC-1-007':3};
 assert.deepEqual(validateUniversalDeck(probe,deckCounts),[]);
 const open=seed=>{activePack=probe;return newUniversalMatch(probe,{decks:[deckCounts,deckCounts],first:0,seed});};
 s=reach(open(30002),'main');
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001','IMC-1-001']);
 const high=seat(s,1,'IMC-PROBE-TALL','front',0,true);
 const low=seat(s,1,'IMC-1-007','front',1,true);
 const event=pull(s,0,'IMC-1-030');
 s.players[0].hand.push(event);
 s=dispatchUniversalAction(probe,s,legalUniversalActions(probe,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.deepEqual(s.pending.choices,[low.uid]);
 assert.equal(s.pending.choices.includes(high.uid),false);

 s=reach(open(30003),'main');
 fuel(s,['IMC-1-018','IMC-1-021','IMC-1-022','IMC-1-025']);
 const scaled=seat(s,1,'IMC-PROBE-TALL','front',0,true);
 const small=seat(s,1,'IMC-1-038','front',1,true);
 const paid=pull(s,0,'IMC-1-030');
 s.players[0].hand.push(paid);
 s=dispatchUniversalAction(probe,s,legalUniversalActions(probe,s).find(a=>a.type==='event'&&a.uid===paid.uid));
 assert.ok(s.pending.choices.includes(scaled.uid));
 assert.ok(s.pending.choices.includes(small.uid));
 s=dispatchUniversalAction(probe,s,{type:'chooseRetireBp',uid:scaled.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===scaled.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===small.uid));

 s=reach(fresh(30004,{'IMC-1-030':1}),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 const rear=seat(s,0,'IMC-1-021','energy',0,true);
 armLife(s,1,'IMC-1-030');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'special');
 assert.equal(legal(s).some(a=>a.mode==='special'&&a.uid===attacker.uid),true);
 assert.equal(legal(s).some(a=>a.uid===rear.uid),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.ok(skipped.players[0].front.some(c=>c?.uid===attacker.uid));
 s=act(s,{type:'chooseTrigger',mode:'special',uid:attacker.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===attacker.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-031 recovers up to two AP and its final trigger needs an empty life',()=>{
 let s=reach(fresh(31001,{'IMC-1-031':1}),'main');
 fuel(s,['IMC-1-007','IMC-1-025','IMC-1-001']);
 readyAp(s,3);
 s.players[0].apCards[1].ready=false;
 s.players[0].apCards[2].ready=false;
 [s]=cast(s,'IMC-1-031');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legal(s).filter(a=>a.uid!==null).length,3);
 assert.ok(legal(s).some(a=>a.uid===null));
 const skipped=act(structuredClone(s),{type:'chooseApRecovery',uid:null});
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,0);
 const first=s.players[0].apCards.find(c=>!c.ready).uid;
 s=act(s,{type:'chooseApRecovery',uid:first});
 assert.equal(s.pending.kind,'effect-recover-ap');
 const second=s.players[0].apCards.find(c=>!c.ready).uid;
 s=act(s,{type:'chooseApRecovery',uid:second});
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(s.pending,null);
 const readyUid=s.players[0].apCards.find(c=>c.ready).uid;
 assert.equal(legal(s).some(a=>a.type==='chooseApRecovery'&&a.uid===readyUid),false);

 s=reach(fresh(31003,{'IMC-1-031':1}),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.unshift(pull(s,1,'IMC-1-035'));
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'draw');
 s=reach(fresh(31004,{'IMC-1-031':1}),'attack');
 const hitter=seat(s,0,'IMC-1-007','front',0,true);
 s.players[1].deck.push(...s.players[1].life.splice(0));
 const finalCard=pull(s,1,'IMC-1-031');
 const incoming=s.players[1].deck[0];
 s.players[1].life.unshift(finalCard);
 s=strike(s,hitter.uid);
 assert.equal(s.pending.trigger,'final');
 const declined=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(declined.players[1].life.length,0);
 assert.equal(declined.players[1].deck[0].uid,incoming.uid);
 s=act(s,{type:'chooseTrigger',mode:'final'});
 assert.equal(s.players[1].life[0].uid,incoming.uid);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-034 rests for blue energy and leaves at the end of main',()=>{
 let s=reach(fresh(34001),'main');
 let gen;
 [s,gen]=play(s,'IMC-1-034','energy');
 assert.equal(live(s,gen.uid).ready,false);
 assert.equal(energy(s).blue,1);
 assert.equal(energy(s).yellow||0,0);
 live(s,gen.uid).ready=true;
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===gen.uid));
 assert.equal(energy(s).blue,2);
 assert.equal(energy(s).yellow||0,0);
 s=act(s,legal(s).find(a=>a.type==='next'));
 assert.ok(s.players[0].outside.some(c=>c.uid===gen.uid));
 assert.equal(energy(s).blue||0,0);
 s=reach(fresh(34002),'main');
 [s,gen]=play(s,'IMC-1-034','front');
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===gen.uid),false);
 live(s,gen.uid).ready=true;
 s=act(s,legal(s).find(a=>a.type==='activate'&&a.uid===gen.uid));
 assert.equal(energy(s).blue||0,0);
 live(s,gen.uid).ready=true;
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===gen.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-035 does nothing on play and its draw trigger can be skipped',()=>{
 let s=reach(fresh(35001),'main');
 hold(s,'IMC-1-035');
 const deck=s.players[0].deck.length;
 [s]=play(s,'IMC-1-035');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 s=reach(fresh(35002),'attack');
 const attacker=seat(s,0,'IMC-1-034','front',0,true);
 armLife(s,1,'IMC-1-035');
 const lifeDeck=s.players[1].deck.length;
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'draw');
 assert.equal(act(structuredClone(s),{type:'chooseTrigger',mode:'skip'}).players[1].deck.length,lifeDeck);
 s=act(s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(s.players[1].deck.length,lifeDeck-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-038 draws when it leaves to outside, not when it returns to hand',()=>{
 let s=reach(fresh(38001,{'IMC-1-030':1,'IMC-1-001':4}),'main');
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001','IMC-1-001']);
 const mine=seat(s,1,'IMC-1-038','front',0,true);
 const rear=seat(s,1,'IMC-1-044','energy',0,true);
 const deck=s.players[1].deck.length;
 const hand=s.players[1].hand.length;
 [s]=cast(s,'IMC-1-030');
 assert.ok(s.pending.choices.includes(mine.uid));
 assert.equal(s.pending.choices.includes(rear.uid),false);
 s=act(s,{type:'chooseRetireBp',uid:mine.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===mine.uid));
 assert.equal(s.players[1].deck.length,deck-1);
 assert.equal(s.players[1].hand.length,hand+1);

 s=reach(fresh(38002,{'IMC-1-019':1}),'main');
 fuel(s,['IMC-1-019']);
 const bounced=seat(s,0,'IMC-1-038','front',0,true);
 hold(s,'IMC-1-002');
 const before=s.players[0].deck.length;
 [s]=play(s,'IMC-1-002');
 assert.ok(s.pending.choices.includes(bounced.uid));
 s=act(s,{type:'chooseOwnBounce',uid:bounced.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===bounced.uid));
 assert.equal(s.players[0].deck.length,before);

 s=reach(fresh(38003),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 const rested=seat(s,1,'IMC-1-035','front',0,false);
 armLife(s,1,'IMC-1-038');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'active');
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(universalBp(pack,skipped,live(skipped,rested.uid)),2000);
 s=act(s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(universalBp(pack,s,live(s,rested.uid)),5000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-040 does nothing on play and its get trigger can be declined',()=>{
 let s=reach(fresh(40001),'main');
 [s]=play(s,'IMC-1-040');
 assert.equal(s.pending,null);
 s=reach(fresh(40002),'attack');
 const attacker=seat(s,0,'IMC-1-034','front',0,true);
 const trigger=armLife(s,1,'IMC-1-040');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'get');
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.ok(skipped.players[1].outside.some(c=>c.uid===trigger.uid));
 assert.equal(skipped.players[1].hand.some(c=>c.uid===trigger.uid),false);
 s=act(s,{type:'chooseTrigger',mode:'get'});
 assert.ok(s.players[1].hand.some(c=>c.uid===trigger.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-041 adds only Girls in the Frontier',()=>{
 let s=reach(fresh(41001,{'IMC-1-041':1}),'main');
 fuel(s,['IMC-1-035']);
 const window=setTop(s,0,['IMC-1-035','IMC-1-047','IMC-1-034']);
 [s]=play(s,'IMC-1-041');
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,3);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 const declined=act(structuredClone(s),{type:'chooseTopFiltered',uid:null});
 assert.equal(declined.players[0].hand.some(c=>c.uid===window[0].uid),false);
 s=act(s,{type:'chooseTopFiltered',uid:window[0].uid});
 [s]=order(s);
 s=discard(s);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 s=reach(fresh(41002),'attack');
 const attacker=seat(s,0,'IMC-1-034','front',0,true);
 const mine=seat(s,1,'IMC-1-040','front',0,false);
 armLife(s,1,'IMC-1-041');
 s=strike(s,attacker.uid);
 assert.equal(legal(s).some(a=>a.mode==='active'&&a.uid===mine.uid),true);
 assert.equal(legal(s).some(a=>a.uid===attacker.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-044 nullifies impact only when the battle actually happens',()=>{
 const striker=shell({id:'IMC-PROBE-IMPACT',name:'テスト衝撃',color:'blue',bp:3000,
  implementation:'dsl',printedImpact:1,effects:{}});
 const probe=createUniversalPack({id:'imc-044',cards:[...READY.map(sourceCard),striker]});
 const deck={...counts(),'IMC-PROBE-IMPACT':1,'IMC-1-007':3};
 assert.deepEqual(validateUniversalDeck(probe,deck),[]);
 function match(seed){
  activePack=probe;
  const s=newUniversalMatch(probe,{decks:[deck,deck],first:0,seed});
  return reach(s,'main');
 }
 let s=match(44001);
 fuel(s,['IMC-1-035']);
 const wall=(()=>{const c=pull(s,1,'IMC-1-044');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[0]=c;return c;})();
 const attacker=(()=>{const c=pull(s,0,'IMC-PROBE-IMPACT');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=c;return c;})();
 assert.equal(universalImpact(probe,s,attacker),1);
 assert.equal(universalImpactNull(probe,s,wall),true);
 assert.equal(universalImpactNull(probe,s,attacker),false);
 s=reach(s,'attack');
 const life=s.players[1].life.length;
 s=dispatchUniversalAction(probe,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(probe,s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.players[1].life.length,life);
 assert.ok(s.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(s.pending,null);

 s=match(44002);
 const plain=(()=>{const c=pull(s,1,'IMC-1-035');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[0]=c;return c;})();
 const hitter=(()=>{const c=pull(s,0,'IMC-PROBE-IMPACT');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=c;return c;})();
 assert.equal(universalImpactNull(probe,s,plain),false);
 s=reach(s,'attack');
 const before=s.players[1].life.length;
 s=dispatchUniversalAction(probe,s,{type:'attack',uid:hitter.uid});
 s=dispatchUniversalAction(probe,s,{type:'chooseBlock',uid:plain.uid});
 assert.equal(s.players[1].life.length,before-1);
 assert.ok(s.players[1].outside.some(c=>c.uid===plain.uid));

 s=match(44003);
 fuel(s,['IMC-1-035']);
 const stayed=(()=>{const c=pull(s,1,'IMC-1-044');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[0]=c;return c;})();
 const direct=(()=>{const c=pull(s,0,'IMC-PROBE-IMPACT');c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=c;return c;})();
 s=reach(s,'attack');
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(probe,s,{type:'attack',uid:direct.uid});
 s=dispatchUniversalAction(probe,s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[1].life.length,lives-1);
 assert.ok(s.players[1].front.some(c=>c?.uid===stayed.uid));
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('IMC-1-047 may put one LiPPS outside and orders the rest on top',()=>{
 let s=reach(fresh(47001),'main');
 hold(s,'IMC-1-047');
 const window=setTop(s,0,['IMC-1-047','IMC-1-035']);
 [s]=play(s,'IMC-1-047');
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 const look=universalPrivateChoices(pack,s,0);
 assert.equal(look.inspected.length,2);
 assert.equal(look.options.some(o=>o.action.uid===window[1].uid),false);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 let declined=act(structuredClone(s),{type:'chooseTopTraitOutside',uid:null});
 assert.equal(declined.players[0].outside.some(c=>c.uid===window[0].uid),false);
 while(declined.pending?.kind==='effect-top-order'){
  const uid=declined.pending.uids.find(id=>!declined.pending.order.includes(id));
  declined=act(declined,{type:'chooseTopOrder',uid});
 }
 assert.equal(declined.players[0].deck[0].uid,window[0].uid);
 s=act(s,{type:'chooseTopTraitOutside',uid:window[0].uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===window[0].uid));
 [s]=order(s);
 assert.equal(s.players[0].deck[0].uid,window[1].uid);
 s=reach(fresh(47002),'attack');
 const attacker=seat(s,0,'IMC-1-034','front',0,true);
 const mine=seat(s,1,'IMC-1-040','front',0,false);
 armLife(s,1,'IMC-1-047');
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'active');
 assert.equal(legal(s).some(a=>a.uid===attacker.uid),false);
 assert.equal(legal(s).some(a=>a.mode==='active'&&a.uid===mine.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-005 adds one yellow energy only while that character is active',()=>{
 let s=reach(fresh(5001,{'IMC-1-005':2,'IMC-1-001':4}),'main');
 const unpaid=hold(s,'IMC-1-005');
 assert.equal(byId['IMC-1-005'].trigger,null);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 fuel(s,['IMC-1-001','IMC-1-001']);
 assert.equal(energy(s).yellow,2);
 const before=apReady(s);
 let gen;
 [s,gen]=play(s,'IMC-1-005','energy');
 assert.equal(apReady(s),before-1);
 assert.equal(live(s,gen.uid).ready,false);
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),1);
 assert.equal(energy(s).yellow,3);
 assert.equal(energy(s).blue||0,0);
 live(s,gen.uid).ready=true;
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),2);
 assert.equal(energy(s).yellow,4);
 const neighbor=s.players[0].energy.find(c=>c&&c.uid!==gen.uid);
 assert.equal(universalCardEnergy(pack,s,0,neighbor),1);
 live(s,gen.uid).ready=false;
 assert.equal(energy(s).yellow,3);
 s=yieldTurn(s);
 assert.equal(s.active,1);
 live(s,gen.uid).ready=true;
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),2);
 assert.equal(assertUniversalMatch(pack,s),true);
 s=reach(fresh(5002,{'IMC-1-005':1,'IMC-1-001':2}),'main');
 fuel(s,['IMC-1-001','IMC-1-001']);
 [s,gen]=play(s,'IMC-1-005','front');
 live(s,gen.uid).ready=true;
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),0);
 assert.equal(energy(s).yellow,2);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-026 gains 1000 BP during its controller turn only',()=>{
 let s=reach(fresh(26001,{'IMC-1-026':1,'IMC-1-001':4}),'main');
 const unpaid=hold(s,'IMC-1-026');
 assert.equal(byId['IMC-1-026'].trigger,null);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001']);
 const before=apReady(s);
 let card;
 [s,card]=play(s,'IMC-1-026','front');
 assert.equal(apReady(s),before-1);
 assert.equal(universalBp(pack,s,live(s,card.uid)),4000);
 const other=seat(s,0,'IMC-1-007','front',1,true);
 assert.equal(universalBp(pack,s,other),2000);
 s=yieldTurn(s);
 assert.equal(universalBp(pack,s,live(s,card.uid)),3000);
 s=yieldTurn(s);
 assert.equal(s.active,0);
 assert.equal(universalBp(pack,s,live(s,card.uid)),4000);
 s=reach(fresh(26002,{'IMC-1-026':1,'IMC-1-001':3}),'main');
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001']);
 [s,card]=play(s,'IMC-1-026','energy');
 assert.equal(universalBp(pack,s,live(s,card.uid)),4000);
 s=yieldTurn(s);
 assert.equal(universalBp(pack,s,live(s,card.uid)),3000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-027 adds yellow energy once four Positive Passion cards are on the field',()=>{
 let s=reach(fresh(27001,{'IMC-1-027':1,'IMC-1-021':4}),'main');
 assert.equal(byId['IMC-1-027'].trigger,null);
 const self=seat(s,0,'IMC-1-027','energy',0,false);
 seat(s,0,'IMC-1-021','front',0,true);
 seat(s,0,'IMC-1-021','front',1,true);
 const stranger=seat(s,0,'IMC-1-007','front',2,true);
 seat(s,1,'IMC-1-021','front',0,true);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 assert.equal(energy(s).yellow,1);
 const ally=seat(s,0,'IMC-1-021','energy',1,false);
 assert.equal(universalCardEnergy(pack,s,0,self),2);
 assert.equal(universalCardEnergy(pack,s,0,ally),1);
 assert.equal(energy(s).yellow,3);
 assert.equal(universalBp(pack,s,stranger),2000);
 self.ready=true;
 assert.equal(universalCardEnergy(pack,s,0,self),2);
 s=yieldTurn(s);
 assert.equal(s.active,1);
 assert.equal(universalCardEnergy(pack,s,0,live(s,self.uid)),2);
 assert.equal(assertUniversalMatch(pack,s),true);
 s=reach(fresh(27002,{'IMC-1-027':1,'IMC-1-021':3}),'main');
 const front=seat(s,0,'IMC-1-027','front',0,true);
 seat(s,0,'IMC-1-021','energy',0,true);
 seat(s,0,'IMC-1-021','energy',1,true);
 seat(s,0,'IMC-1-021','energy',2,true);
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 assert.equal(energy(s).yellow,3);
 const passion=shell({id:'IMC-PROBE-PASSION',name:'情熱の場',type:'field',energy:0,bp:0,gen:0,
  traits:['ポジティブパッション']});
 const plain=shell({id:'IMC-PROBE-PLAIN',name:'無特徴',type:'field',energy:0,bp:0,gen:0,traits:[]});
 const probe=createUniversalPack({id:'imc-027',cards:[...READY.map(sourceCard),passion,plain]});
 const base=counts({'IMC-1-027':1,'IMC-1-021':4});
 const deck={...base,'IMC-PROBE-PASSION':1,'IMC-PROBE-PLAIN':1,'IMC-1-007':base['IMC-1-007']-2};
 assert.deepEqual(validateUniversalDeck(probe,deck),[]);
 activePack=probe;
 let looked=newUniversalMatch(probe,{decks:[deck,deck],first:0,seed:27003});
 looked=reach(looked,'main');
 const host=seat(looked,0,'IMC-1-027','energy',0,false);
 seat(looked,0,'IMC-1-021','front',0,true);
 seat(looked,0,'IMC-1-021','front',1,true);
 const blank=pull(looked,0,'IMC-PROBE-PLAIN');
 blank.ready=true;blank.fieldEntryStamp=looked.nextFieldEntryStamp++;
 looked.players[0].energy[1]=blank;
 assert.equal(universalCardEnergy(probe,looked,0,host),1);
 const stage=pull(looked,0,'IMC-PROBE-PASSION');
 stage.ready=true;stage.fieldEntryStamp=looked.nextFieldEntryStamp++;
 looked.players[0].energy[2]=stage;
 assert.equal(universalCardEnergy(probe,looked,0,host),2);
 assert.equal(universalCardEnergy(probe,looked,0,stage),0);
 assert.equal(assertUniversalMatch(probe,looked),true);
});

test('IMC-1-042 rests one affordable blue Girls character and does not raid',()=>{
 let s=reach(fresh(42001,{'IMC-1-042':1,'IMC-1-045':1,'IMC-1-034':4,'IMC-1-050':1}),'main');
 const broke=hold(s,'IMC-1-042');
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===broke.uid),false);
 fuel(s,['IMC-1-034','IMC-1-034','IMC-1-034']);
 const fit=hold(s,'IMC-1-035');
 const cap=hold(s,'IMC-1-045');
 const wrongTrait=hold(s,'IMC-1-047');
 const yellow=hold(s,'IMC-1-021');
 const costly=hold(s,'IMC-1-050');
 const before=apReady(s);
 [s]=play(s,'IMC-1-042','front');
 assert.equal(apReady(s),before-1);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(fit.uid),true);
 assert.equal(s.pending.choices.includes(cap.uid),true);
 assert.equal([wrongTrait,yellow,costly].some(c=>s.pending.choices.includes(c.uid)),false);
 const actions=legal(s).filter(a=>a.uid===fit.uid);
 assert.equal(actions.some(a=>a.line==='front'),true);
 assert.equal(actions.some(a=>a.line==='energy'),true);
 assert.equal(actions.some(a=>a.type==='raid'||a.mode==='raid'),false);
 const skipped=act(structuredClone(s),{type:'chooseHandRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===fit.uid));
 s=act(s,legal(s).find(a=>a.type==='chooseHandRest'&&a.uid===cap.uid&&a.line==='front'));
 assert.equal(live(s,cap.uid).ready,false);
 assert.ok(s.players[0].front.some(c=>c?.uid===cap.uid));
 assert.equal(s.pending,null);
 s=reach(fresh(42002,{'IMC-1-042':1,'IMC-1-034':3,'IMC-1-050':1}),'main');
 fuel(s,['IMC-1-034','IMC-1-034','IMC-1-034']);
 for(const card of [...s.players[0].hand]){
  const printed=pack.cards[card.cardId];
  if(printed.color==='blue'&&printed.energy<=2&&printed.traits.includes('ガールズ・イン・ザ・フロンティア'))
   s.players[0].deck.push(s.players[0].hand.splice(s.players[0].hand.indexOf(card),1)[0]);
 }
 hold(s,'IMC-1-047');
 hold(s,'IMC-1-050');
 [s]=play(s,'IMC-1-042','front');
 assert.equal(s.pending,null);
 s=reach(fresh(42003,{'IMC-1-042':1}),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 armLife(s,1,'IMC-1-042');
 const lifeDeck=s.players[1].deck.length;
 s=strike(s,attacker.uid);
 assert.equal(s.pending.trigger,'draw');
 assert.equal(act(structuredClone(s),{type:'chooseTrigger',mode:'skip'}).players[1].deck.length,lifeDeck);
 s=act(s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(s.players[1].deck.length,lifeDeck-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-045 adds one blue energy only while that character is active',()=>{
 let s=reach(fresh(45001,{'IMC-1-045':1,'IMC-1-034':4}),'main');
 const unpaid=hold(s,'IMC-1-045');
 assert.equal(byId['IMC-1-045'].trigger,null);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 fuel(s,['IMC-1-034','IMC-1-034']);
 assert.equal(energy(s).blue,2);
 const before=apReady(s);
 let gen;
 [s,gen]=play(s,'IMC-1-045','energy');
 assert.equal(apReady(s),before-1);
 assert.equal(live(s,gen.uid).ready,false);
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),1);
 assert.equal(energy(s).blue,3);
 live(s,gen.uid).ready=true;
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),2);
 assert.equal(energy(s).blue,4);
 const neighbor=s.players[0].energy.find(c=>c&&c.uid!==gen.uid);
 assert.equal(universalCardEnergy(pack,s,0,neighbor),1);
 live(s,gen.uid).ready=false;
 assert.equal(energy(s).blue,3);
 s=yieldTurn(s);
 live(s,gen.uid).ready=true;
 assert.equal(s.active,1);
 assert.equal(universalCardEnergy(pack,s,0,live(s,gen.uid)),2);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-048 discounts two blue from hand only on an empty field, then must discard',()=>{
 let s=reach(fresh(48001,{'IMC-1-048':2,'IMC-1-034':4}),'main');
 readyAp(s,3);
 assert.equal(byId['IMC-1-048'].trigger,null);
 const coming=pull(s,0,'IMC-1-048');
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['IMC-1-048'],'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['IMC-1-048'],'life'),2);
 const deck=s.players[0].deck.length;
 s.players[0].hand.push(coming);
 const before=apReady(s);
 [s]=play(s,'IMC-1-048','front');
 assert.equal(apReady(s),before-1);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const second=hold(s,'IMC-1-048');
 const victim=s.players[0].hand.find(c=>c.uid!==second.uid);
 s=act(s,{type:'chooseDiscard',uid:victim.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.length,1);
 assert.ok(s.players[0].front.some(c=>c?.cardId==='IMC-1-048'));
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['IMC-1-048'],'hand'),2);
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===second.uid),false);
 assert.equal(legal(s).some(a=>a.type==='raid'&&a.uid===second.uid),false);
 fuel(s,['IMC-1-034','IMC-1-034']);
 assert.equal(energy(s).blue,2);
 const deck2=s.players[0].deck.length;
 [s]=play(s,'IMC-1-048','energy');
 assert.equal(s.players[0].deck.length,deck2-1);
 s=discard(s);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-050 is active after the first block of the turn and its active trigger is optional',()=>{
 let s=reach(fresh(50001,{'IMC-1-050':1}),'attack');
 const weak=seat(s,0,'IMC-1-013','front',0,true);
 const again=seat(s,0,'IMC-1-007','front',1,true);
 const wall=seat(s,1,'IMC-1-050','front',0,true);
 const tired=seat(s,1,'IMC-1-035','front',1,false);
 const back=seat(s,1,'IMC-1-034','energy',0,true);
 s=act(s,{type:'attack',uid:weak.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(legal(s).some(a=>a.type==='chooseBlock'&&a.uid===wall.uid),true);
 assert.equal(legal(s).some(a=>a.uid===tired.uid||a.uid===back.uid),false);
 s=act(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.pending,null);
 assert.equal(live(s,wall.uid).ready,true);
 assert.equal(live(s,weak.uid).ready,false);
 assert.ok(s.players[0].front.some(c=>c?.uid===weak.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===wall.uid));
 s=act(s,{type:'attack',uid:again.uid});
 s=act(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(live(s,wall.uid).ready,false);
 assert.ok(s.players[0].front.some(c=>c?.uid===again.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===wall.uid));
 s=reach(fresh(50002),'attack');
 const small=seat(s,0,'IMC-1-013','front',0,true);
 const plain=seat(s,1,'IMC-1-035','front',0,true);
 s=act(s,{type:'attack',uid:small.uid});
 s=act(s,{type:'chooseBlock',uid:plain.uid});
 assert.equal(live(s,plain.uid).ready,false);
 s=reach(fresh(50003,{'IMC-1-050':1}),'attack');
 const hitter=seat(s,0,'IMC-1-013','front',0,true);
 const rested=seat(s,1,'IMC-1-035','front',0,false);
 const hidden=seat(s,0,'IMC-1-035','energy',0,false);
 armLife(s,1,'IMC-1-050');
 s=strike(s,hitter.uid);
 assert.equal(s.pending.trigger,'active');
 assert.equal(legal(s).some(a=>a.mode==='active'&&a.uid===rested.uid),true);
 assert.equal(legal(s).some(a=>a.uid===hitter.uid||a.uid===hidden.uid),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(live(skipped,rested.uid).ready,false);
 assert.equal(universalBp(pack,skipped,live(skipped,rested.uid)),2000);
 s=act(s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(live(s,rested.uid).ready,true);
 assert.equal(universalBp(pack,s,live(s,rested.uid)),5000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-017 shows its top card only to its controller, then puts it outside or back',()=>{
 let s=reach(fresh(17001,{'IMC-1-017':1}),'main');
 readyAp(s,1);
 const seen=setTop(s,0,['IMC-1-021'])[0];
 [s]=play(s,'IMC-1-017');
 assert.equal(s.pending.kind,'private-top-choice');
 const mine=universalPrivateChoices(pack,s,0);
 assert.equal(mine.options.every(option=>option.card.cardId==='IMC-1-021'),true);
 assert.deepEqual(mine.options.map(option=>option.action.mode),['top','outside']);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 const shown=universalPublicView(pack,s,1);
 assert.equal(shown.pending.kind,'private-top-choice');
 assert.equal(JSON.stringify(shown).includes(seen.uid),false);
 s=act(s,{type:'chooseTopCard',mode:'outside'});
 assert.ok(s.players[0].outside.some(c=>c.uid===seen.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(17002,{'IMC-1-017':1}),'main');
 readyAp(s,1);
 const stays=setTop(s,0,['IMC-1-025'])[0];
 [s]=play(s,'IMC-1-017');
 s=act(s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.players[0].deck[0].uid,stays.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===stays.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-023 rests a yellow Passion card only when it entered the front',()=>{
 let s=reach(fresh(23001,{'IMC-1-023':1,'IMC-1-001':3,'IMC-1-021':1,'IMC-1-019':1,'IMC-1-007':1}),'main');
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001']);
 readyAp(s,1);
 hold(s,'IMC-1-021');
 hold(s,'IMC-1-019');
 hold(s,'IMC-1-007');
 [s]=play(s,'IMC-1-023','front');
 assert.equal(s.pending.kind,'effect-hand-rest');
 const choices=legal(s).filter(a=>a.type==='chooseHandRest'&&a.uid);
 const ids=new Set(choices.map(a=>s.players[0].hand.find(c=>c.uid===a.uid).cardId));
 assert.equal(ids.has('IMC-1-021'),true);
 assert.equal(ids.has('IMC-1-019'),false);
 assert.equal(ids.has('IMC-1-007'),false);
 for(const id of ids){
  const printed=pack.cards[id];
  assert.equal(printed.color,'yellow',id);
  assert.ok(printed.energy<=2,id);
  assert.equal([...printed.traits,...(printed.traitComponents||[])].includes('ポジティブパッション'),true,id);
 }
 assert.equal(choices.some(a=>a.line==='front'),true);
 assert.equal(choices.some(a=>a.line==='energy'),true);
 const chosen=choices.find(a=>a.line==='energy');
 s=act(s,chosen);
 assert.equal(s.players[0].energy.find(c=>c?.uid===chosen.uid).ready,false);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(23002,{'IMC-1-023':1,'IMC-1-001':3,'IMC-1-021':1}),'main');
 fuel(s,['IMC-1-001','IMC-1-001','IMC-1-001']);
 readyAp(s,1);
 hold(s,'IMC-1-021');
 [s]=play(s,'IMC-1-023','energy');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.cardId==='IMC-1-021'));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-006 discounts only an empty field, buffs once from another current BP, and reveals on its own',()=>{
 let s=reach(fresh(6001,{'IMC-1-006':2,'IMC-1-001':2}),'main');
 readyAp(s,2);
 assert.equal(byId['IMC-1-006'].trigger,null);
 assert.equal(byId['IMC-1-006'].faq.length,0);
 const printed=pack.cards['IMC-1-006'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),2);
 const ap=apReady(s);
 let played;
 [s,played]=play(s,'IMC-1-006','front');
 assert.equal(apReady(s),ap-1);
 assert.equal(live(s,played.uid).ready,false);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 const second=hold(s,'IMC-1-006');
 assert.equal(legal(s).some(a=>a.type==='play'&&a.uid===second.uid),false);
 fuel(s,['IMC-1-001','IMC-1-001']);
 assert.equal(energy(s).yellow,2);
 [s]=play(s,'IMC-1-006','energy');
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(6002,{'IMC-1-006':2,'IMC-1-007':2,'IMC-1-001':2,'IMC-1-021':1}),'main');
 const self=seat(s,0,'IMC-1-006','energy',0,false);
 const ally=seat(s,0,'IMC-1-007','front',0,false);
 const foe=seat(s,1,'IMC-1-007','front',0,true);
 self.buffs=[{bp:4000,untilTurn:s.turn}];
 foe.buffs=[{bp:4000,untilTurn:s.turn}];
 ally.buffs=[{bp:2500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,self),6000);
 assert.equal(universalBp(pack,s,foe),6000);
 assert.equal(universalBp(pack,s,ally),4500);
 assert.equal(legal(s).some(a=>a.mode==='onceBuffSelf'),false);
 self.buffs=[];
 ally.buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,ally),5000);
 s=act(s,legal(s).find(a=>a.mode==='onceBuffSelf'&&a.uid===self.uid));
 assert.equal(live(s,self.uid).ready,false);
 assert.equal(universalBp(pack,s,live(s,self.uid)),3000);
 assert.equal(universalBp(pack,s,live(s,ally.uid)),5000);
 assert.equal(legal(s).some(a=>a.mode==='onceBuffSelf'),false);
 const front=seat(s,0,'IMC-1-006','front',1,true);
 s=act(s,legal(s).find(a=>a.mode==='onceBuffSelf'&&a.uid===front.uid));
 assert.equal(universalBp(pack,s,live(s,front.uid)),3000);
 assert.equal(legal(s).some(a=>a.uid===front.uid&&a.mode==='onceBuffSelf'),false);
 live(s,foe.uid).ready=false;
 s=reach(s,'attack');
 armLife(s,1,'IMC-1-025');
 const quiet=setTop(s,0,['IMC-1-001'])[0];
 const hand=s.players[0].hand.length;
 s=act(s,{type:'attack',uid:front.uid});
 assert.notEqual(s.pending?.kind,'effect-reveal-trait-choice');
 if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].deck[0].uid,quiet.uid);
 assert.equal(s.players[0].hand.length,hand);
 s=skipLife(s);
 assert.equal(s.pending,null);
 live(s,front.uid).buffs.push({bp:2000,untilTurn:s.turn});
 assert.equal(universalBp(pack,s,live(s,front.uid)),5000);
 live(s,front.uid).ready=true;
 const plain=setTop(s,0,['IMC-1-021'])[0];
 s=act(s,{type:'attack',uid:front.uid});
 assert.equal(s.pending.kind,'effect-reveal-trait-choice');
 assert.equal(s.pending.mayHand,false);
 assert.deepEqual(legal(s).map(a=>a.mode),['top','bottom']);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 const shown=universalPublicView(pack,s,1);
 assert.equal(shown.publicReveals.some(row=>row.uid===plain.uid&&row.cardId==='IMC-1-021'),true);
 assert.equal(JSON.stringify(shown.pending).includes(plain.uid),false);
 s=act(s,{type:'chooseRevealTrait',mode:'bottom'});
 s=clearStrike(s);
 assert.equal(s.players[0].deck.at(-1).uid,plain.uid);
 live(s,front.uid).ready=true;
 const star=setTop(s,0,['IMC-1-007'])[0];
 s=act(s,{type:'attack',uid:front.uid});
 assert.equal(s.pending.mayHand,true);
 assert.deepEqual(legal(s).map(a=>a.mode),['hand','top','bottom']);
 const kept=act(structuredClone(s),{type:'chooseRevealTrait',mode:'top'});
 assert.equal(kept.players[0].deck[0].uid,star.uid);
 s=act(s,{type:'chooseRevealTrait',mode:'hand'});
 s=clearStrike(s);
 assert.ok(s.players[0].hand.some(c=>c.uid===star.uid));
 assert.equal(s.publicReveals.some(row=>row.kind==='searched-to-hand'&&row.uid===star.uid),true);
 s=yieldTurn(s);
 s=yieldTurn(s);
 s=reach(s,'main');
 assert.equal(universalBp(pack,s,live(s,self.uid)),2000);
 live(s,ally.uid).buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(legal(s).some(a=>a.mode==='onceBuffSelf'&&a.uid===self.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-008 rests its source and must buff another Beyond character',()=>{
 let s=reach(fresh(8001,{'IMC-1-008':1,'IMC-1-001':2}),'main');
 fuel(s,['IMC-1-001','IMC-1-001']);
 readyAp(s,1);
 const star=seat(s,0,'IMC-1-007','front',0,true);
 const plain=seat(s,0,'IMC-1-021','front',1,true);
 const foe=seat(s,1,'IMC-1-007','front',0,true);
 const plainBp=universalBp(pack,s,plain);
 let played;
 [s,played]=play(s,'IMC-1-008','front');
 assert.equal(live(s,played.uid).ready,false);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===played.uid),false);
 live(s,played.uid).ready=true;
 s=act(s,legal(s).find(a=>a.mode==='selfRestBuff'&&a.uid===played.uid));
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[star.uid]);
 assert.equal(legal(s).some(a=>a.uid===null||a.uid===played.uid||a.uid===plain.uid||a.uid===foe.uid),false);
 s=act(s,{type:'chooseOwnBuff',uid:star.uid});
 assert.equal(live(s,played.uid).ready,false);
 assert.equal(universalBp(pack,s,live(s,played.uid)),2000);
 assert.equal(universalBp(pack,s,live(s,star.uid)),3000);
 assert.equal(universalBp(pack,s,live(s,plain.uid)),plainBp);
 live(s,played.uid).ready=true;
 s=act(s,legal(s).find(a=>a.mode==='selfRestBuff'&&a.uid===played.uid));
 s=act(s,{type:'chooseOwnBuff',uid:star.uid});
 assert.equal(universalBp(pack,s,live(s,star.uid)),4000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(8002,{'IMC-1-008':1}),'main');
 const back=seat(s,0,'IMC-1-008','energy',0,true);
 const match=seat(s,0,'IMC-1-013','front',0,true);
 assert.equal(legal(s).some(a=>a.mode==='selfRestBuff'&&a.uid===back.uid),true);
 s.players[0].front[0]=null;
 s.players[0].hand.push(match);
 assert.equal(legal(s).some(a=>a.mode==='selfRestBuff'&&a.uid===back.uid),false);
 const wrong=seat(s,0,'IMC-1-021','front',0,true);
 assert.equal(legal(s).some(a=>a.mode==='selfRestBuff'&&a.uid===back.uid),false);
 assert.equal(wrong.ready,true);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(8003,{'IMC-1-008':1}),'attack');
 const hitter=seat(s,0,'IMC-1-013','front',0,true);
 const rested=seat(s,1,'IMC-1-035','front',0,false);
 armLife(s,1,'IMC-1-008');
 const lifeDeck=s.players[1].deck.length;
 s=strike(s,hitter.uid);
 assert.equal(s.pending.trigger,'draw');
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(skipped.players[1].deck.length,lifeDeck);
 assert.equal(live(skipped,rested.uid).ready,false);
 s=act(s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(s.players[1].deck.length,lifeDeck-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-015 draws and discards only when another character current BP reaches 5000',()=>{
 let s=reach(fresh(15001,{'IMC-1-015':2,'IMC-1-001':2,'IMC-1-007':2}),'main');
 fuel(s,['IMC-1-001','IMC-1-001']);
 readyAp(s,1);
 assert.equal(energy(s).yellow,2);
 const before=apReady(s);
 let played;
 [s,played]=play(s,'IMC-1-015','front');
 assert.equal(apReady(s),before-1);
 assert.equal(live(s,played.uid).ready,false);
 live(s,played.uid).ready=true;
 const ally=seat(s,0,'IMC-1-007','energy',2,false);
 const foe=seat(s,1,'IMC-1-007','front',0,false);
 ally.buffs=[{bp:2500,untilTurn:s.turn}];
 foe.buffs=[{bp:4000,untilTurn:s.turn}];
 live(s,played.uid).buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,ally),4500);
 assert.equal(universalBp(pack,s,live(s,played.uid)),6000);
 assert.equal(universalBp(pack,s,foe),6000);
 s=reach(s,'attack');
 armLife(s,1,'IMC-1-015');
 const quiet=s.players[0].hand.length;
 s=act(s,{type:'attack',uid:played.uid});
 assert.equal(s.players[0].hand.length,quiet);
 assert.notEqual(s.pending?.kind,'effect-discard');
 if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 const rested=seat(s,1,'IMC-1-035','front',1,false);
 const hidden=seat(s,1,'IMC-1-034','energy',0,false);
 assert.equal(legal(s).some(a=>a.mode==='active'&&a.uid===rested.uid),true);
 assert.equal(legal(s).some(a=>a.mode==='active'&&a.uid===hidden.uid),true);
 assert.equal(legal(s).some(a=>a.uid===played.uid),false);
 const skipped=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.equal(live(skipped,rested.uid).ready,false);
 s=act(s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(live(s,rested.uid).ready,true);
 assert.equal(universalBp(pack,s,live(s,rested.uid)),5000);
 live(s,ally.uid).buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,live(s,ally.uid)),5000);
 live(s,played.uid).ready=true;
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 s=act(s,{type:'attack',uid:played.uid});
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const discarded=s.players[0].hand[0];
 s=act(s,{type:'chooseDiscard',uid:discarded.uid});
 s=skipLife(s);
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 const tall=shell({id:'IMC-PROBE-TALL',name:'印刷五千',bp:5000,implementation:'vanilla'});
 const probe=createUniversalPack({id:'imc-015',cards:[...READY.map(sourceCard),tall]});
 const base=counts({'IMC-1-015':1});
 const deckCounts={...base,'IMC-PROBE-TALL':1,'IMC-1-007':base['IMC-1-007']-1};
 assert.deepEqual(validateUniversalDeck(probe,deckCounts),[]);
 activePack=probe;
 s=reach(newUniversalMatch(probe,{decks:[deckCounts,deckCounts],first:0,seed:15002}),'attack');
 const actor=seat(s,0,'IMC-1-015','front',0,true);
 const printedHigh=seat(s,0,'IMC-PROBE-TALL','energy',0,true);
 printedHigh.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(probe,s,printedHigh),4000);
 const unchanged=s.players[0].hand.length;
 s=act(s,{type:'attack',uid:actor.uid});
 assert.equal(s.players[0].hand.length,unchanged);
 assert.notEqual(s.pending?.kind,'effect-discard');
 activePack=pack;
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('IMC-1-046 discounts an empty field and keeps BP 4000 characters out of the block list',()=>{
 let s=reach(fresh(46001,{'IMC-1-046':1}),'main');
 readyAp(s,1);
 const printed=pack.cards['IMC-1-046'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),2);
 const occupied=seat(s,0,'IMC-1-035','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 s.players[0].front[0]=null;
 s.players[0].hand.push(occupied);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),0);
 let played;
 [s,played]=play(s,'IMC-1-046','front');
 assert.equal(apReady(s),0);
 assert.equal(s.pending.kind,'effect-block-ceiling');
 assert.deepEqual(s.pending.choices,[played.uid]);
 const skipped=act(structuredClone(s),{type:'chooseBlockCeiling',uid:null});
 assert.equal(live(skipped,played.uid).blockAtLeastGranted,undefined);
 s=act(s,{type:'chooseBlockCeiling',uid:played.uid});
 assert.equal(live(s,played.uid).blockAtLeastGranted.bp,4000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(46002,{'IMC-1-046':1,'IMC-1-034':2,'IMC-1-035':1,'IMC-1-049':1,'IMC-1-050':1}),'main');
 fuel(s,['IMC-1-034','IMC-1-034']);
 readyAp(s,1);
 const girls=seat(s,0,'IMC-1-035','front',0,true);
 const wrong=seat(s,0,'IMC-1-047','front',1,true);
 [s,played]=play(s,'IMC-1-046','front');
 assert.equal(s.pending.kind,'effect-block-ceiling');
 assert.equal(s.pending.choices.includes(girls.uid),true);
 assert.equal(s.pending.choices.includes(played.uid),true);
 assert.equal(s.pending.choices.includes(wrong.uid),false);
 assert.equal(legal(s).some(a=>a.uid===null),true);
 s=act(s,{type:'chooseBlockCeiling',uid:girls.uid});
 live(s,girls.uid).ready=true;
 live(s,played.uid).ready=true;
 const low=seat(s,1,'IMC-1-050','front',0,true);
 const high=seat(s,1,'IMC-1-049','front',1,true);
 const back=seat(s,1,'IMC-1-034','energy',2,true);
 high.buffs=[{bp:-500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,low),3500);
 assert.equal(universalBp(pack,s,high),3500);
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:girls.uid});
 let blockers=legal(s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blockers.includes(low.uid),true);
 assert.equal(blockers.includes(high.uid),true);
 assert.equal(blockers.includes(back.uid),false);
 assert.equal(blockers.includes(null),true);
 s=act(s,{type:'chooseBlock',uid:null});
 s=skipLife(s);
 live(s,high.uid).buffs=[];
 assert.equal(universalBp(pack,s,live(s,high.uid)),4000);
 live(s,girls.uid).ready=true;
 s=act(s,{type:'attack',uid:girls.uid});
 blockers=legal(s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blockers.includes(low.uid),true);
 assert.equal(blockers.includes(high.uid),false);
 s=act(s,{type:'chooseBlock',uid:low.uid});
 assert.equal(live(s,girls.uid).ready,false);
 assert.ok(s.players[0].front.some(c=>c?.uid===girls.uid));
 live(s,played.uid).ready=true;
 s=act(s,{type:'attack',uid:played.uid});
 blockers=legal(s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blockers.includes(high.uid),true);
 s=act(s,{type:'chooseBlock',uid:null});
 s=skipLife(s);
 s=yieldTurn(s);
 s=yieldTurn(s);
 s=reach(s,'attack');
 live(s,girls.uid).ready=true;
 live(s,high.uid).ready=true;
 live(s,low.uid).ready=true;
 s=act(s,{type:'attack',uid:girls.uid});
 blockers=legal(s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blockers.includes(high.uid),true);
 s=act(s,{type:'chooseBlock',uid:null});
 s=skipLife(s);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(46003,{'IMC-1-046':1}),'attack');
 const hitter=seat(s,0,'IMC-1-013','front',0,true);
 armLife(s,1,'IMC-1-046');
 const lifeDeck=s.players[1].deck.length;
 s=strike(s,hitter.uid);
 assert.equal(s.pending.trigger,'draw');
 assert.equal(act(structuredClone(s),{type:'chooseTrigger',mode:'skip'}).players[1].deck.length,lifeDeck);
 s=act(s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(s.players[1].deck.length,lifeDeck-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-049 returns a low or high current BP front character and raids onto Shiki',()=>{
 let s=reach(fresh(49001,{'IMC-1-049':2,'IMC-1-034':4,'IMC-1-047':1,'IMC-1-027':1,'IMC-1-050':1}),'main');
 readyAp(s,2);
 for(const [id,slot] of [['IMC-1-034',0],['IMC-1-034',1],['IMC-1-034',2],['IMC-1-034',3]]){
  const card=pull(s,0,id);
  card.ready=false;
  s.players[0].energy[slot]=card;
 }
 assert.equal(energy(s).blue,4);
 const low=seat(s,1,'IMC-1-027','front',0,true);
 const mid=seat(s,1,'IMC-1-050','front',1,true);
 const raised=seat(s,1,'IMC-1-013','front',2,true);
 const lowered=seat(s,1,'IMC-1-049','front',3,false);
 raised.buffs=[{bp:3500,untilTurn:s.turn}];
 low.buffs=[{bp:500,untilTurn:s.turn}];
 lowered.buffs=[{bp:500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,low),3000);
 assert.equal(universalBp(pack,s,mid),3500);
 assert.equal(universalBp(pack,s,raised),4500);
 assert.equal(universalBp(pack,s,lowered),4500);
 let played;
 [s,played]=play(s,'IMC-1-049','front');
 assert.equal(live(s,played.uid).ready,false);
 assert.equal(s.pending.kind,'effect-bounce-bp');
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.equal(s.pending.choices.includes(mid.uid),false);
 assert.equal(s.pending.choices.includes(raised.uid),true);
 assert.equal(s.pending.choices.includes(lowered.uid),true);
 const left=act(structuredClone(s),{type:'chooseBounceBp',uid:null});
 assert.ok(left.players[1].front.some(c=>c?.uid===raised.uid));
 s=act(s,{type:'chooseBounceBp',uid:raised.uid});
 assert.ok(s.players[1].hand.some(c=>c.uid===raised.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===lowered.uid));
 live(s,played.uid).ready=true;
 s=reach(s,'attack');
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 s=act(s,{type:'attack',uid:played.uid});
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=discard(s);
 s=skipLife(s);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(49002,{'IMC-1-049':1,'IMC-1-047':1,'IMC-1-034':4,'IMC-1-027':1}),'main');
 readyAp(s,1);
 const base=seat(s,0,'IMC-1-047','energy',0,false);
 for(const slot of [1,2,3]){
  const card=pull(s,0,'IMC-1-034');
  card.ready=false;
  s.players[0].energy[slot]=card;
 }
 assert.equal(energy(s).blue,4);
 const bound=seat(s,1,'IMC-1-027','front',0,true);
 assert.equal(universalBp(pack,s,bound),2500);
 const stranger=seat(s,0,'IMC-1-013','front',0,true);
 const card=hold(s,'IMC-1-049');
 const raids=legal(s).filter(a=>a.type==='raid'&&a.uid===card.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid&&a.line!=='energy'),true);
 assert.equal(raids.some(a=>a.baseUid===base.uid&&a.line==='energy'),true);
 assert.equal(raids.some(a=>a.baseUid===stranger.uid),false);
 s=act(s,raids.find(a=>a.baseUid===base.uid&&a.line!=='energy'&&a.slot===1));
 const top=s.players[0].front[1];
 assert.equal(top.cardId,'IMC-1-049');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-bounce-bp');
 assert.deepEqual(s.pending.choices,[bound.uid]);
 s=act(s,{type:'chooseBounceBp',uid:bound.uid});
 assert.ok(s.players[1].hand.some(c=>c.uid===bound.uid));
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:top.uid});
 assert.equal(s.pending.kind,'effect-discard');
 s=discard(s);
 s=skipLife(s);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(49003,{'IMC-1-049':1,'IMC-1-047':1,'IMC-1-034':4}),'attack');
 const hitter=seat(s,0,'IMC-1-013','front',0,true);
 const home=seat(s,1,'IMC-1-047','energy',0,false);
 const other=seat(s,1,'IMC-1-034','front',0,true);
 armLife(s,1,'IMC-1-049');
 s=strike(s,hitter.uid);
 assert.equal(s.pending.trigger,'raid');
 assert.equal(legal(s).some(a=>a.mode==='get'),true);
 assert.equal(legal(s).some(a=>a.mode==='raid'),false);
 const declined=act(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.ok(declined.players[1].outside.some(c=>c.cardId==='IMC-1-049'));
 assert.equal(declined.pending,null);
 s=act(s,{type:'chooseTrigger',mode:'get'});
 assert.ok(s.players[1].hand.some(c=>c.cardId==='IMC-1-049'));
 assert.equal(s.pending,null);
 for(const slot of [1,2,3]){
  const generator=pull(s,1,'IMC-1-034');
  generator.ready=false;
  s.players[1].energy[slot]=generator;
 }
 assert.equal(universalEnergyByColor(pack,s,1).blue,4);
 armLife(s,1,'IMC-1-049');
 live(s,hitter.uid).ready=true;
 s=act(s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'raid');
 const offered=legal(s).filter(a=>a.mode==='raid');
 assert.equal(offered.some(a=>a.baseUid===home.uid&&a.line==='front'),true);
 assert.equal(offered.some(a=>a.baseUid===other.uid),false);
 s=act(s,offered.find(a=>a.baseUid===home.uid&&a.line==='front'&&a.slot===1));
 const raided=s.players[1].front[1];
 assert.equal(raided.ready,true);
 assert.equal(raided.stack[0].uid,home.uid);
 assert.equal(s.pending.kind,'effect-bounce-bp');
 assert.equal(s.pending.choices.includes(hitter.uid),true);
 s=act(s,{type:'chooseBounceBp',uid:null});
 assert.ok(s.players[0].front.some(c=>c?.uid===hitter.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

// Q2230–Q2236. selfOwnEffectRaid is observable through ifLiveThen.
// The three cards stay unfinished: skip-next-active, raid-only hand
// activation, earned DAMAGE(2), and 028's two ordered options are not
// shapes the shared program can host.
function probeFace(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'yellow',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length||rest.mainAbility?'dsl':'vanilla'),
  effects
 };
}
function probeOpen(cards,seed){
 const fillers=Array.from({length:12},(_,i)=>probeFace({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const built=createUniversalPack({id:'probe',version:'imc-b4-'+seed,cards:bodies});
 const deck={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  deck[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(built,deck),[]);
 let s=newUniversalMatch(built,{decks:[deck,deck],seed,first:0});
 for(let i=0;i<6&&s.phase!=='main';i++){
  const next=legalUniversalActions(built,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(built,s,next);
 }
 assert.equal(s.phase,'main');
 return {pack:built,s};
}
function probePull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function probeHold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||probePull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function probeSeat(s,p,id,line,slot,ready=false){
 const card=probePull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function probeFuel(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function probePlay(built,s,id,line='front',p=0){
 const card=probeHold(s,id,p);
 const action=legalUniversalActions(built,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [dispatchUniversalAction(built,s,action),card];
}
function probeClearBlock(built,s){
 if(s.pending?.kind==='block')return dispatchUniversalAction(built,s,{type:'chooseBlock',uid:null});
 return s;
}
function probeTo(built,s,phase){
 for(let i=0;i<8&&s.phase!==phase;i++){
  assert.equal(s.pending,null,s.pending?.kind);
  const next=legalUniversalActions(built,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(built,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function probeReject(card,pattern){
 assert.throws(()=>createUniversalPack({
  id:'probe',version:'imc-b4-gap-'+card.id,cards:[probeFace(card)]
 }),pattern);
}
const raidGate={op:'ifLiveThen',when:{kind:'selfOwnEffectRaid',turn:'any'},then:[{op:'draw',count:1}]};
const handRaid={op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',maxEnergy:1,ap:1,
 max:1,optional:true,names:['星'],requireAffordableEnergy:true};

test('Q2230 counts an effect raid and a life raid, not a paid raid or a plain entry',()=>{
 const star=probeFace({
  id:'STAR',name:'星',energy:1,raidName:'星',trigger:'raid',
  effects:{onPlay:[raidGate]}
 });
 const cards=[
  probeFace({id:'GEN',name:'能源',gen:1}),
  star,
  probeFace({id:'BASE',name:'星',bp:1500}),
  probeFace({id:'HOOK',name:'使之',effects:{onPlay:[handRaid]}})
 ];
 const paidPlay=probeOpen(cards,20);
 probeFuel(paidPlay.s);
 probeSeat(paidPlay.s,0,'GEN','energy',0,false);
 const paidTop=paidPlay.s.players[0].deck[0].uid;
 let played=paidPlay.s;
 [played]=probePlay(paidPlay.pack,played,'STAR');
 assert.equal(played.players[0].deck[0].uid,paidTop);
 assert.equal(played.pending,null);
 assert.equal(assertUniversalMatch(paidPlay.pack,played),true);

 const paidRaid=probeOpen(cards,21);
 probeFuel(paidRaid.s);
 probeSeat(paidRaid.s,0,'GEN','energy',0,false);
 const base=probeSeat(paidRaid.s,0,'BASE','front',0,true);
 const fromHand=probeHold(paidRaid.s,'STAR');
 const raidTop=paidRaid.s.players[0].deck[0].uid;
 let raided=paidRaid.s;
 raided=dispatchUniversalAction(paidRaid.pack,raided,legalUniversalActions(paidRaid.pack,raided)
  .find(a=>a.type==='raid'&&a.uid===fromHand.uid&&a.baseUid===base.uid&&a.line!=='energy'));
 assert.equal(raided.players[0].front.find(c=>c?.cardId==='STAR').ready,true);
 assert.equal(raided.players[0].deck[0].uid,raidTop);
 assert.equal(raided.pending,null);
 assert.equal(assertUniversalMatch(paidRaid.pack,raided),true);

 const rested=probeOpen(cards,22);
 probeFuel(rested.s);
 probeSeat(rested.s,0,'GEN','energy',0,false);
 probeHold(rested.s,'STAR');
 const restTop=rested.s.players[0].deck[0].uid;
 let rest=rested.s;
 [rest]=probePlay(rested.pack,rest,'HOOK');
 const handStar=rest.players[0].hand.find(c=>c.cardId==='STAR');
 rest=dispatchUniversalAction(rested.pack,rest,legalUniversalActions(rested.pack,rest)
  .find(a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&a.uid===handStar.uid&&a.line==='front'));
 assert.equal(rest.players[0].front.find(c=>c?.cardId==='STAR').ready,false);
 assert.equal(rest.players[0].deck[0].uid,restTop);
 assert.equal(assertUniversalMatch(rested.pack,rest),true);

 const caused=probeOpen(cards,23);
 probeFuel(caused.s);
 probeSeat(caused.s,0,'GEN','energy',0,false);
 const host=probeSeat(caused.s,0,'BASE','front',0,true);
 probeHold(caused.s,'STAR');
 let cause=caused.s;
 [cause]=probePlay(caused.pack,cause,'HOOK');
 const causedStar=cause.players[0].hand.find(c=>c.cardId==='STAR');
 const drawn=cause.players[0].deck[0].uid;
 cause=dispatchUniversalAction(caused.pack,cause,legalUniversalActions(caused.pack,cause)
  .find(a=>a.type==='chooseHandRestOrRaid'&&a.mode==='raid'&&a.uid===causedStar.uid&&
   a.baseUid===host.uid&&a.line==='front'));
 assert.equal(cause.players[0].hand.some(c=>c.uid===drawn),true);
 assert.equal(cause.players[0].front.find(c=>c?.cardId==='STAR').ready,true);
 assert.equal(assertUniversalMatch(caused.pack,cause),true);

 const life=probeOpen(cards,24);
 probeFuel(life.s,1,1);
 probeSeat(life.s,1,'GEN','energy',0,false);
 const home=probeSeat(life.s,1,'BASE','energy',1,false);
 const hitter=probeSeat(life.s,0,'FILL-01','front',0,true);
 const revealed=probePull(life.s,1,'STAR');
 life.s.players[1].life.unshift(revealed);
 const lifeTop=life.s.players[1].deck[0].uid;
 let hit=probeTo(life.pack,life.s,'attack');
 assert.equal(hit.active,0);
 hit=probeClearBlock(life.pack,dispatchUniversalAction(life.pack,hit,{type:'attack',uid:hitter.uid}));
 assert.equal(hit.pending.trigger,'raid');
 assert.equal(hit.active,0);
 const got=dispatchUniversalAction(life.pack,structuredClone(hit),{type:'chooseTrigger',mode:'get'});
 assert.equal(got.players[1].deck[0].uid,lifeTop);
 assert.ok(got.players[1].hand.some(c=>c.uid===revealed.uid));
 hit=dispatchUniversalAction(life.pack,hit,legalUniversalActions(life.pack,hit)
  .find(a=>a.mode==='raid'&&a.baseUid===home.uid&&a.line==='front'));
 assert.equal(hit.active,0);
 assert.equal(hit.players[1].hand.some(c=>c.uid===lifeTop),true);
 assert.equal(hit.players[1].front.some(c=>c?.cardId==='STAR'&&c.ready),true);
 assert.equal(assertUniversalMatch(life.pack,hit),true);
});

test('IMC-1-020 cannot attach skip-next-active to the raid cause or raid without a rest entry',()=>{
 const row=IMC_REQUESTS_001_050.find(item=>item.cardId==='IMC-1-020');
 assert.match(row.whyNotEnough,/skipWhen/);
 assert.match(row.whyNotEnough,/deployOwnHandRestOrRaid/);
 assert.equal(IMC_PROGRAMS_001_050['IMC-1-020'],undefined);
 assert.equal(pack.cards['IMC-1-020'],undefined);
 probeReject({id:'SKIP',name:'條件',effects:{onPlay:[{op:'restOppFrontOne',optional:true,
  skipWhen:{kind:'selfOwnEffectRaid',turn:'any'}}]}},/invalid uncapped opponent REST target/);
 probeReject({id:'LIVE',name:'條件',effects:{onPlay:[{op:'ifLiveThen',
  when:{kind:'selfOwnEffectRaid',turn:'any'},
  then:[{op:'restOppFrontOne',optional:true,skipNextActive:true}]}]}},/invalid live-condition follow-up/);
 probeReject({id:'MAIN',name:'起動',mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',maxEnergy:5,ap:1,max:1,
   optional:true,names:['本田 未央','日野 茜'],requireAffordableEnergy:true}]}},
  /unsupported main action ability/);

 const forced=probeOpen([
  probeFace({id:'REST',name:'休息',effects:{onPlay:[{op:'restOppFrontOne',optional:true,skipNextActive:true}]}}),
  probeFace({id:'FOE',name:'前線',bp:3000})
 ],25);
 probeFuel(forced.s);
 const foe=probeSeat(forced.s,1,'FOE','front',0,true);
 let s=forced.s;
 [s]=probePlay(forced.pack,s,'REST');
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(s.pending.skipNextActive,true);
 const declined=dispatchUniversalAction(forced.pack,structuredClone(s),{type:'chooseRestBp',uid:null});
 assert.equal(declined.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 s=dispatchUniversalAction(forced.pack,s,{type:'chooseRestBp',uid:foe.uid});
 assert.equal(s.players[1].front[0].ready,false);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===foe.uid));
 assert.equal(assertUniversalMatch(forced.pack,s),true);

 const named=probeOpen([
  probeFace({id:'GEN',name:'能源',gen:1}),
  probeFace({id:'BASE',name:'本田 未央',bp:1500}),
  probeFace({id:'MIO',name:'本田 未央',energy:1,raidName:'本田 未央'}),
  probeFace({id:'AKANE',name:'日野 茜',energy:1,raidName:'日野 茜'}),
  probeFace({id:'AIKO',name:'高森 藍子',energy:1,raidName:'高森 藍子'}),
  probeFace({id:'HOOK',name:'使之',effects:{onPlay:[{op:'deployOwnHandRestOrRaid',type:'character',
   color:'yellow',maxEnergy:5,ap:1,max:1,optional:true,names:['本田 未央','日野 茜'],
   requireAffordableEnergy:true}]}})
 ],26);
 probeFuel(named.s);
 probeSeat(named.s,0,'GEN','energy',0,false);
 const mioBase=probeSeat(named.s,0,'BASE','front',0,true);
 const mio=probeHold(named.s,'MIO');
 const akane=probeHold(named.s,'AKANE');
 const aiko=probeHold(named.s,'AIKO');
 [s]=probePlay(named.pack,named.s,'HOOK');
 const choices=legalUniversalActions(named.pack,s).filter(a=>a.type==='chooseHandRestOrRaid'&&a.uid);
 assert.equal(choices.some(a=>a.uid===mio.uid&&a.mode==='enter'),true);
 assert.equal(choices.some(a=>a.uid===mio.uid&&a.mode==='raid'&&a.baseUid===mioBase.uid),true);
 assert.equal(choices.some(a=>a.uid===akane.uid&&a.mode==='enter'),true);
 assert.equal(choices.some(a=>a.uid===aiko.uid),false);
 assert.equal(assertUniversalMatch(named.pack,s),true);
});

test('IMC-1-024 cannot earn damage 2 from the raid cause, and once per attack is not the first attack',()=>{
 const row=IMC_REQUESTS_001_050.find(item=>item.cardId==='IMC-1-024');
 assert.match(row.whyNotEnough,/grantSelfAttackDamageThisTurn/);
 assert.match(row.whyNotEnough,/oncePerAttackTurn/);
 assert.equal(IMC_PROGRAMS_001_050['IMC-1-024'],undefined);
 assert.equal(pack.cards['IMC-1-024'],undefined);
 probeReject({id:'DMG',name:'傷害',effects:{onPlay:[{op:'ifLiveThen',
  when:{kind:'selfOwnEffectRaid',turn:'any'},
  then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}]}},/invalid live-condition follow-up/);
 const bare=probeOpen([
  probeFace({id:'DMG',name:'傷害',effects:{onPlay:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}})
 ],27);
 probeFuel(bare.s);
 assert.throws(()=>probePlay(bare.pack,bare.s,'DMG'),/Unproven this-turn attack damage/);

 const pay={op:'optionalPayApThen',ap:1,optional:true,oncePerAttackTurn:true,then:[
  {op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',maxEnergy:5,ap:1,max:1,optional:true,
   names:['本田 未央','高森 藍子'],requireAffordableEnergy:true}]};
 const battle=probeOpen([
  probeFace({id:'GEN',name:'能源',gen:1}),
  probeFace({id:'BASE',name:'本田 未央',bp:1500}),
  probeFace({id:'MIO',name:'本田 未央',energy:1,raidName:'本田 未央'}),
  probeFace({id:'AKANE',name:'日野 茜',energy:1,raidName:'日野 茜'}),
  probeFace({id:'A',name:'先攻',effects:{onAttack:[pay]}}),
  probeFace({id:'B',name:'後攻',effects:{onAttack:[pay]}})
 ],28);
 probeFuel(battle.s,2);
 probeSeat(battle.s,0,'GEN','energy',0,false);
 const base=probeSeat(battle.s,0,'BASE','energy',1,false);
 const first=probeSeat(battle.s,0,'A','front',0,true);
 const second=probeSeat(battle.s,0,'B','front',1,true);
 const mio=probeHold(battle.s,'MIO');
 const akane=probeHold(battle.s,'AKANE');
 let s=probeTo(battle.pack,battle.s,'attack');
 s=dispatchUniversalAction(battle.pack,s,{type:'attack',uid:first.uid});
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 const paid=dispatchUniversalAction(battle.pack,structuredClone(s),{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(paid.pending.kind,'effect-hand-rest-or-raid');
 const offered=legalUniversalActions(battle.pack,paid).filter(a=>a.type==='chooseHandRestOrRaid'&&a.uid);
 assert.equal(offered.some(a=>a.uid===mio.uid&&a.mode==='enter'),true);
 assert.equal(offered.some(a=>a.uid===mio.uid&&a.mode==='raid'&&a.baseUid===base.uid),true);
 assert.equal(offered.some(a=>a.uid===akane.uid),false);
 s=probeClearBlock(battle.pack,dispatchUniversalAction(battle.pack,s,{type:'chooseOptionalPayAp',mode:'skip'}));
 assert.equal(s.pending,null);
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(battle.pack,s,{type:'attack',uid:second.uid});
 assert.equal(s.attacksThisTurn,2);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 assert.equal(assertUniversalMatch(battle.pack,s),true);
});

test('IMC-1-028 keeps the ordered choice locked while the raid cause can active a trait',()=>{
 const row=IMC_REQUESTS_001_050.find(item=>item.cardId==='IMC-1-028');
 assert.match(row.whyNotEnough,/chooseUpToDistinctOrdered/);
 assert.match(row.whyNotEnough,/Q2234/);
 assert.match(row.whyNotEnough,/Q2235/);
 assert.equal(IMC_PROGRAMS_001_050['IMC-1-028'],undefined);
 assert.equal(pack.cards['IMC-1-028'],undefined);
 probeReject({
  id:'TWO',name:'二選',
  effects:{onPlay:[{op:'chooseUpToDistinctOrdered',max:2,options:[
   {id:'bounce',label:'回手',then:[{op:'draw',count:1}]},
   {id:'active',label:'活動',then:[{op:'activeOwnTrait',optional:true,max:1,trait:'ポジティブパッション'}]}
  ]}]}
 }, /invalid ordered subset/);

 const trait='ポジティブパッション';
 const activeThen={op:'ifLiveThen',when:{kind:'selfOwnEffectRaid',turn:'any'},
  then:[{op:'activeOwnTrait',optional:true,max:1,trait}]};
 const cards=[
  probeFace({id:'GEN',name:'能源',gen:1}),
  probeFace({id:'STAR',name:'星',energy:1,raidName:'星',trigger:'raid',traits:[trait],
   effects:{onPlay:[activeThen]}}),
  probeFace({id:'BASE',name:'星',bp:1500,traits:[trait]}),
  probeFace({id:'ALLY',name:'同伴',traits:[trait]}),
  probeFace({id:'PLAIN',name:'其他'}),
  probeFace({id:'HOOK',name:'使之',effects:{onPlay:[handRaid]}})
 ];
 const caused=probeOpen(cards,29);
 probeFuel(caused.s);
 probeSeat(caused.s,0,'GEN','energy',0,false);
 const host=probeSeat(caused.s,0,'BASE','front',0,false);
 const ally=probeSeat(caused.s,0,'ALLY','energy',1,false);
 const plain=probeSeat(caused.s,0,'PLAIN','front',1,false);
 probeHold(caused.s,'STAR');
 let s=caused.s;
 [s]=probePlay(caused.pack,s,'HOOK');
 const fromHand=s.players[0].hand.find(c=>c.cardId==='STAR');
 s=dispatchUniversalAction(caused.pack,s,legalUniversalActions(caused.pack,s)
  .find(a=>a.type==='chooseHandRestOrRaid'&&a.mode==='raid'&&a.uid===fromHand.uid&&
   a.baseUid===host.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-active-own-trait');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 const stood=dispatchUniversalAction(caused.pack,s,{type:'chooseActiveOwnTrait',uid:ally.uid});
 assert.equal(stood.players[0].energy.find(c=>c?.uid===ally.uid).ready,true);
 assert.equal(stood.players[0].front.find(c=>c?.uid===plain.uid).ready,false);
 assert.equal(assertUniversalMatch(caused.pack,stood),true);

 const paid=probeOpen(cards,30);
 probeFuel(paid.s);
 probeSeat(paid.s,0,'GEN','energy',0,false);
 const paidBase=probeSeat(paid.s,0,'BASE','front',0,false);
 const paidAlly=probeSeat(paid.s,0,'ALLY','front',1,false);
 const paidStar=probeHold(paid.s,'STAR');
 let quiet=dispatchUniversalAction(paid.pack,paid.s,legalUniversalActions(paid.pack,paid.s)
  .find(a=>a.type==='raid'&&a.uid===paidStar.uid&&a.baseUid===paidBase.uid&&a.line!=='energy'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===paidAlly.uid).ready,false);
 assert.equal(assertUniversalMatch(paid.pack,quiet),true);

 const entered=probeOpen(cards,31);
 probeFuel(entered.s);
 probeSeat(entered.s,0,'GEN','energy',0,false);
 const enteredAlly=probeSeat(entered.s,0,'ALLY','front',0,false);
 probeHold(entered.s,'STAR');
 let plainEntry=entered.s;
 [plainEntry]=probePlay(entered.pack,plainEntry,'HOOK');
 const resting=plainEntry.players[0].hand.find(c=>c.cardId==='STAR');
 plainEntry=dispatchUniversalAction(entered.pack,plainEntry,legalUniversalActions(entered.pack,plainEntry)
  .find(a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&a.uid===resting.uid&&a.line==='energy'));
 assert.equal(plainEntry.pending,null);
 assert.equal(plainEntry.players[0].front.find(c=>c?.uid===enteredAlly.uid).ready,false);
 assert.equal(assertUniversalMatch(entered.pack,plainEntry),true);

 const life=probeOpen(cards,32);
 probeFuel(life.s,1,1);
 probeSeat(life.s,1,'GEN','energy',0,false);
 const home=probeSeat(life.s,1,'BASE','energy',1,false);
 const mate=probeSeat(life.s,1,'ALLY','front',0,false);
 const hitter=probeSeat(life.s,0,'PLAIN','front',0,true);
 const revealed=probePull(life.s,1,'STAR');
 life.s.players[1].life.unshift(revealed);
 let hit=probeTo(life.pack,life.s,'attack');
 hit=probeClearBlock(life.pack,dispatchUniversalAction(life.pack,hit,{type:'attack',uid:hitter.uid}));
 assert.equal(hit.active,0);
 assert.equal(hit.pending.trigger,'raid');
 hit=dispatchUniversalAction(life.pack,hit,legalUniversalActions(life.pack,hit)
  .find(a=>a.mode==='raid'&&a.baseUid===home.uid&&a.line==='front'));
 assert.equal(hit.active,0);
 assert.equal(hit.pending.kind,'effect-active-own-trait');
 assert.equal(hit.pending.choices.includes(mate.uid),true);
 assert.equal(hit.players[1].front.find(c=>c?.uid===mate.uid).ready,false);
 assert.equal(assertUniversalMatch(life.pack,hit),true);
});
