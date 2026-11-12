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
 universalImpactNull,universalPrivateChoices,universalCardEnergy,zoneRequiredEnergy
} from '../dist/universal-v2/engine.mjs';

const pack=createImcV2Pack();
const byId=Object.fromEntries(IMC_CARDS_001_050.map(c=>[c.id,c]));
const READY=['IMC-1-001','IMC-1-002','IMC-1-005','IMC-1-007','IMC-1-010','IMC-1-013','IMC-1-014',
 'IMC-1-018','IMC-1-019','IMC-1-021','IMC-1-022','IMC-1-025','IMC-1-026','IMC-1-027',
 'IMC-1-030','IMC-1-031','IMC-1-034','IMC-1-035','IMC-1-038','IMC-1-040','IMC-1-041',
 'IMC-1-042','IMC-1-044','IMC-1-045','IMC-1-047','IMC-1-048','IMC-1-050'];
const OPEN=['IMC-1-003','IMC-1-004','IMC-1-006','IMC-1-008','IMC-1-009',
 'IMC-1-011','IMC-1-012','IMC-1-015','IMC-1-016','IMC-1-017','IMC-1-020','IMC-1-023',
 'IMC-1-024','IMC-1-028','IMC-1-029','IMC-1-032','IMC-1-033',
 'IMC-1-036','IMC-1-037','IMC-1-039','IMC-1-043','IMC-1-046','IMC-1-049'];
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
 for(const key of ['effects','mainAbility','triggerEffect','impactNull','printedImpact',
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
