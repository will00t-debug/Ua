import test from 'node:test';
import assert from 'node:assert/strict';
import {CSM_CARDS} from '../dist/csm-cards.mjs';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {appendCompletedMove} from '../dist/universal-v2/zone-move-events.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {dispatchRoom} from '../server/domain.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalCardEnergy,universalImpactNull,
 universalPrivateChoices,zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify((s.pending?.actions||[]).map(a=>a.mode)));
 return use(s,action);
}
function fuel(s){
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}

test('CSM-1-001 impact null stops the winner impact, and its draw trigger draws one',()=>{
 const counts=countsFor(['CSM-1-001','CSM-1-003','CSM-1-005']);
 let s=toPhase(fresh(counts,1001),'attack');
 const attacker=put(s,0,'CSM-1-005','front',0,true);
 attacker.impactGranted={turn:s.turn,stamp:attacker.fieldEntryStamp,amount:1};
 const kobeni=put(s,1,'CSM-1-001','front',0,true);
 const life=s.players[1].life.length;
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 s=use(s,{type:'chooseBlock',uid:kobeni.uid});
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.pending?.kind==='life-trigger',false);
 assert.equal(s.players[1].outside.some(c=>c.uid===kobeni.uid),true);
 assert.equal(universalImpactNull(packs,s,kobeni),true);

 let open=toPhase(fresh(counts,1002),'attack');
 const striker=put(open,0,'CSM-1-005','front',0,true);
 striker.impactGranted={turn:open.turn,stamp:striker.fieldEntryStamp,amount:1};
 const plain=put(open,1,'CSM-1-003','front',0,true);
 const before=open.players[1].life.length;
 open=use(open,{type:'attack',uid:striker.uid});
 open=use(open,{type:'chooseBlock',uid:plain.uid});
 assert.equal(open.players[1].life.length,before-1);
 assert.equal(open.players[1].outside.some(c=>c.uid===plain.uid),true);

 let draw=toPhase(fresh(counts,1003),'attack');
 const poke=put(draw,0,'CSM-1-005','front',0,true);
 const trigger=take(draw,1,'CSM-1-001');
 const buried=draw.players[1].life[0];
 draw.players[1].life[0]=trigger;
 draw.players[1].deck.push(buried);
 const hand=draw.players[1].hand.length;
 draw=use(draw,{type:'attack',uid:poke.uid});
 draw=use(draw,{type:'chooseBlock',uid:null});
 assert.equal(draw.pending?.kind,'life-trigger');
 assert.equal(draw.pending.trigger,'draw');
 draw=use(draw,{type:'chooseTrigger',mode:'draw'});
 assert.equal(draw.players[1].hand.length,hand+1);
 assertUniversalMatch(packs,draw);
});

test('CSM-1-002 checks Reze on its own line, not the slot across from it',()=>{
 const counts=countsFor(['CSM-1-002','CSM-1-025']);
 const s=toPhase(fresh(counts,1004),'main');
 const storm=put(s,0,'CSM-1-002','front',0);
 const reze=put(s,0,'CSM-1-025','front',1);
 assert.equal(universalBp(packs,s,storm),2000);
 assert.equal(universalImpactNull(packs,s,storm),true);
 const across=structuredClone(s);
 const moved=across.players[0].front[1];
 across.players[0].front[1]=null;
 across.players[0].energy[0]=moved;
 const stormNow=across.players[0].front[0];
 assert.equal(universalBp(packs,across,stormNow),1000);
 assert.equal(universalImpactNull(packs,across,stormNow),false);
 const energy=structuredClone(s);
 energy.players[0].front[0]=null;
 energy.players[0].front[1]=null;
 energy.players[0].energy[0]=storm;
 energy.players[0].energy[1]=reze;
 assert.equal(universalBp(packs,energy,energy.players[0].energy[0]),2000);
 assert.equal(universalImpactNull(packs,energy,energy.players[0].energy[0]),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-003 rests for one purple energy and leaves at the end of main',()=>{
 const counts=countsFor(['CSM-1-003']);
 let s=toPhase(fresh(counts,1005),'main');
 const denji=put(s,0,'CSM-1-003','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,denji),1);
 s=use(s,{type:'activate',uid:denji.uid,mode:'selfRestEnergyRetire'});
 const rested=live(s,0,denji.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalCardEnergy(packs,s,0,rested),2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===denji.uid),false);
 s=use(s,{type:'next'});
 assert.equal(s.players[0].energy.some(c=>c?.uid===denji.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===denji.uid),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-004 cuts two energy only from an empty field, then draws and puts one hand card outside',()=>{
 const counts=countsFor(['CSM-1-004','CSM-1-001']);
 let s=toPhase(fresh(counts,1006),'main');
 readyAp(s);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['CSM-1-004'],'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['CSM-1-004'],'life'),2);
 const occupied=structuredClone(s);
 put(occupied,0,'CSM-1-001','energy',0);
 assert.equal(zoneRequiredEnergy(pack,occupied,0,pack.cards['CSM-1-004'],'hand'),2);
 const card=toHand(s,0,'CSM-1-004');
 const hand=s.players[0].hand.length;
 const deck=s.players[0].deck.length;
 s=play(s,card.uid);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).length,s.players[0].hand.length);
 s=use(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(s.players[0].hand.length,hand-1);
 assertUniversalMatch(packs,s);
});

test('CSM-1-005 adds one purple energy only while active on the energy line',()=>{
 const counts=countsFor(['CSM-1-005']);
 const s=toPhase(fresh(counts,1007),'main');
 const ready=put(s,0,'CSM-1-005','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,ready),2);
 ready.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,ready),1);
 const front=put(s,0,'CSM-1-005','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
 assertUniversalMatch(packs,s);
});

test('CSM-1-006 may look at four only when its own effect retires it',()=>{
 const counts=countsFor(['CSM-1-006','CSM-1-016','CSM-1-005','CSM-1-001','CSM-1-003','CSM-1-009','CSM-1-025']);
 let rule=toPhase(fresh(counts,1008),'main');
 const ruled=put(rule,0,'CSM-1-006','front',0,true);
 const before=rule.players[0].hand.length;
 ruled.buffs=[{bp:-3000,untilTurn:rule.turn}];
 rule=use(rule,{type:'next'});
 assert.equal(rule.players[0].front.some(c=>c?.uid===ruled.uid),false);
 assert.equal(rule.players[0].hand.length,before+1);
 assert.notEqual(rule.pending?.id,'CSM-1-006');
 assertUniversalMatch(packs,rule);

 let battle=toPhase(fresh(counts,1009),'attack');
 const striker=put(battle,0,'CSM-1-005','front',0,true);
 const blocker=put(battle,1,'CSM-1-006','front',0,true);
 const foeHand=battle.players[1].hand.length;
 battle=use(battle,{type:'attack',uid:striker.uid});
 battle=use(battle,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(battle.players[1].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(battle.players[1].hand.length,foeHand+1);
 assert.notEqual(battle.pending?.id,'CSM-1-006');
 assertUniversalMatch(packs,battle);

 let own=toPhase(fresh(counts,1010),'main');
 readyAp(own);
 fuel(own);
 const denji=put(own,0,'CSM-1-006','front',0,true);
 top(own,0,['CSM-1-001','CSM-1-025','CSM-1-003','CSM-1-009']);
 const bomb=toHand(own,0,'CSM-1-016');
 own=play(own,bomb.uid);
 assert.equal(own.pending?.step,'retireThenKit');
 own=choose(own,a=>a.mode==='pick'&&a.uid===denji.uid);
 if(own.pending?.step==='ap')own=choose(own,a=>a.mode==='ap');
 assert.equal(own.pending?.id,'CSM-1-006');
 assert.equal(own.pending.step,'choose');
 assert.deepEqual(own.pending.actions.map(a=>a.mode).sort(),['draw','look']);
 own=choose(own,a=>a.mode==='look');
 assert.equal(own.pending.step,'lookPick');
 assert.deepEqual(own.pending.data.window.length,4);
 const selectable=own.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid);
 assert.equal(selectable.length,2);
 const inspected=universalPrivateChoices(packs,own,0)?.inspected||[];
 assert.equal(inspected.length,4);
 assert.equal(universalPrivateChoices(packs,own,1),null);
 const ai=chooseUniversalAiAction(packs,structuredClone(own));
 assert.equal(legalUniversalActions(packs,own).some(a=>JSON.stringify(a)===JSON.stringify(ai)),true);
 own=use(own,ai);
 assert.equal(own.pending?.step==='lookPick',false);
 assertUniversalMatch(packs,own);
});

test('CSM-1-007 activates once the event and Makima conditions are live, and its color trigger deploys',()=>{
 const counts=countsFor(['CSM-1-007','CSM-1-022','CSM-1-036','CSM-1-038','CSM-1-001','CSM-1-005']);
 let s=toPhase(fresh(counts,1011),'main');
 const denji=put(s,0,'CSM-1-007','front',0,false);
 assert.equal(universalImpactNull(packs,s,denji),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===denji.uid&&a.mode==='csm:0'),false);
 put(s,0,'CSM-1-022','front',1);
 for(const id of ['CSM-1-036','CSM-1-038']){
  const event=take(s,0,id);
  s.players[0].outside.push(event);
  appendCompletedMove(s,{uid:event.uid,cardId:event.cardId,owner:0,controller:0,
   from:'hand',to:'outside',reason:'rule'});
 }
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===denji.uid&&a.mode==='csm:0'),true);
 s=use(s,{type:'activate',uid:denji.uid,mode:'csm:0'});
 assert.equal(live(s,0,denji.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===denji.uid&&a.mode==='csm:0'),false);
 assertUniversalMatch(packs,s);

 let color=toPhase(fresh(counts,1012),'attack');
 const poke=put(color,0,'CSM-1-005','front',0,true);
 const trigger=take(color,1,'CSM-1-007');
 const buried=color.players[1].life[0];
 color.players[1].life[0]=trigger;
 color.players[1].deck.push(buried);
 const recruit=take(color,1,'CSM-1-001');
 color.players[1].outside.push(recruit);
 color=use(color,{type:'attack',uid:poke.uid});
 color=use(color,{type:'chooseBlock',uid:null});
 assert.equal(color.pending?.trigger,'color');
 const deploy=legalUniversalActions(packs,color).find(a=>a.mode==='colorOutside'&&a.uid===recruit.uid);
 assert.ok(deploy);
 color=use(color,deploy);
 assert.equal(color.players[1].front.some(c=>c?.uid===recruit.uid&&c.ready),true);
 assertUniversalMatch(packs,color);
});

test('CSM-1-008 orders the rest, then may put the added card outside, then follows Makima or Reze',()=>{
 const counts=countsFor(['CSM-1-008','CSM-1-022','CSM-1-036','CSM-1-038','CSM-1-001','CSM-1-025','CSM-1-003']);
 let s=toPhase(fresh(counts,1013),'main');
 readyAp(s);
 fuel(s);
 const ally=put(s,0,'CSM-1-001','front',0);
 const [event,makima]=top(s,0,['CSM-1-036','CSM-1-022','CSM-1-038']);
 const looker=toHand(s,0,'CSM-1-008');
 s=play(s,looker.uid);
 assert.equal(s.pending?.step,'lookPick');
 assert.deepEqual(s.pending.data.window.length,3);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').length,1);
 assert.equal((universalPrivateChoices(packs,s,0)?.inspected||[]).length,3);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const aiState=structuredClone(s);
 const ai=chooseUniversalAiAction(packs,aiState);
 aiState.pending=null;
 const played=use(structuredClone(s),ai);
 assert.notEqual(played.pending?.step,'lookPick');
 assertUniversalMatch(packs,played);
 s=choose(s,a=>a.mode==='take'&&a.uid===makima.uid);
 assert.equal(s.pending?.step,'lookOrder');
 s=choose(s,a=>a.mode==='next');
 assert.equal(s.pending?.step,'discard');
 assert.equal(s.pending.actions.some(a=>a.uid===makima.uid),true);
 s=choose(s,a=>a.mode==='discard'&&a.uid===makima.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===makima.uid),true);
 assert.equal(s.pending?.step,'buffOther');
 s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,s,live(s,0,ally.uid)),3000);
 assert.equal(s.players[0].deck.slice(-2).some(c=>c.uid===event.uid),true);
 assertUniversalMatch(packs,s);

 let reze=toPhase(fresh(counts,1014),'main');
 readyAp(reze);
 fuel(reze);
 const low=put(reze,1,'CSM-1-003','front',0);
 const high=put(reze,1,'CSM-1-001','front',1);
 const [found]=top(reze,0,['CSM-1-025','CSM-1-036','CSM-1-038']);
 const second=toHand(reze,0,'CSM-1-008');
 reze=play(reze,second.uid);
 reze=choose(reze,a=>a.mode==='take'&&a.uid===found.uid);
 reze=choose(reze,a=>a.mode==='next');
 assert.equal(reze.pending?.step,'discard');
 reze=choose(reze,a=>a.mode==='discard');
 assert.equal(reze.pending?.step,'debuff');
 assert.equal(reze.pending.actions.some(a=>a.uid===low.uid),false);
 assert.equal(reze.pending.actions.some(a=>a.uid===high.uid),true);
 reze=choose(reze,a=>a.mode==='pick'&&a.uid===high.uid);
 assert.equal(universalBp(packs,reze,live(reze,1,high.uid)),1000);
 assert.equal(live(reze,1,low.uid).uid,low.uid);
 assertUniversalMatch(packs,reze);
});

test('CSM-1-009 returns another energy-1 character, or itself when none exists',()=>{
 const counts=countsFor(['CSM-1-009','CSM-1-025','CSM-1-007']);
 let s=toPhase(fresh(counts,1015),'main');
 readyAp(s);
 const reze=put(s,0,'CSM-1-025','energy',0);
 const angel=toHand(s,0,'CSM-1-009');
 s=play(s,angel.uid);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.deepEqual(s.pending.choices,[reze.uid]);
 s=use(s,{type:'chooseOwnBounce',uid:reze.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===reze.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='CSM-1-009'),true);
 assertUniversalMatch(packs,s);

 let back=toPhase(fresh(counts,1016),'main');
 readyAp(back);
 put(back,0,'CSM-1-007','energy',0);
 const self=toHand(back,0,'CSM-1-009');
 back=play(back,self.uid);
 assert.equal(back.pending,null);
 assert.equal(back.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(back.players[0].front.concat(back.players[0].energy).some(c=>c?.uid===self.uid),false);
 assertUniversalMatch(packs,back);
});

test('CSM-1-010 blocks characters of BP 4000 or more only on its own turn after two events and Makima',()=>{
 const counts=countsFor(['CSM-1-010','CSM-1-022','CSM-1-036','CSM-1-038','CSM-1-007','CSM-1-001','CSM-1-005']);
 let quiet=toPhase(fresh(counts,1017),'attack');
 const early=put(quiet,0,'CSM-1-010','front',0,true);
 put(quiet,0,'CSM-1-022','front',1);
 const big=put(quiet,1,'CSM-1-007','front',0,true);
 const small=put(quiet,1,'CSM-1-001','front',1,true);
 quiet=use(quiet,{type:'attack',uid:early.uid});
 const open=legalUniversalActions(packs,quiet).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(open.includes(big.uid),true);
 assert.equal(open.includes(small.uid),true);

 let live=toPhase(fresh(counts,1018),'main');
 const angel=put(live,0,'CSM-1-010','front',0,true);
 put(live,0,'CSM-1-022','energy',0);
 for(const id of ['CSM-1-036','CSM-1-038']){
  const event=take(live,0,id);
  live.players[0].outside.push(event);
  appendCompletedMove(live,{uid:event.uid,cardId:event.cardId,owner:0,controller:0,
   from:'hand',to:'outside',reason:'rule'});
 }
 const away=structuredClone(live);
 away.active=1;
 assert.equal(universalBp(packs,away,away.players[0].front[0]),pack.cards['CSM-1-010'].bp);
 live=toPhase(live,'attack');
 const wall=put(live,1,'CSM-1-007','front',0,true);
 const little=put(live,1,'CSM-1-001','front',1,true);
 assert.equal(universalBp(packs,live,live.players[0].front.find(c=>c?.uid===angel.uid)),4000);
 live=use(live,{type:'attack',uid:angel.uid});
 const blocked=legalUniversalActions(packs,live).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocked.includes(wall.uid),false);
 assert.equal(blocked.includes(little.uid),true);
 assert.equal(CSM_CARDS.find(c=>c.id==='CSM-1-010').source.includes('UA53BT'),true);
 assertUniversalMatch(packs,live);

 let draw=toPhase(fresh(counts,1019),'attack');
 const poke=put(draw,0,'CSM-1-005','front',0,true);
 const trigger=take(draw,1,'CSM-1-010');
 const buried=draw.players[1].life[0];
 draw.players[1].life[0]=trigger;
 draw.players[1].deck.push(buried);
 const hand=draw.players[1].hand.length;
 draw=use(draw,{type:'attack',uid:poke.uid});
 draw=use(draw,{type:'chooseBlock',uid:null});
 assert.equal(draw.pending?.trigger,'draw');
 draw=use(draw,{type:'chooseTrigger',mode:'draw'});
 assert.equal(draw.players[1].hand.length,hand+1);
 assertUniversalMatch(packs,draw);
});

test('CSM-1-002 and CSM-1-004 ACTIVE triggers ready a character and add 3000 BP',()=>{
 for(const [id,seed] of [['CSM-1-002',1020],['CSM-1-004',1021]]){
  const counts=countsFor([id,'CSM-1-003','CSM-1-005']);
  let s=toPhase(fresh(counts,seed),'attack');
  const poke=put(s,0,'CSM-1-005','front',0,true);
  const ally=put(s,1,'CSM-1-003','front',0,false);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;
  s.players[1].deck.push(buried);
  s=use(s,{type:'attack',uid:poke.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'active');
  s=use(s,{type:'chooseTrigger',mode:'active',uid:ally.uid});
  const woken=live(s,1,ally.uid);
  assert.equal(woken.ready,true);
  assert.equal(universalBp(packs,s,woken),pack.cards['CSM-1-003'].bp+3000);
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-008 GET trigger adds the revealed life card to hand',()=>{
 const counts=countsFor(['CSM-1-008','CSM-1-005']);
 let s=toPhase(fresh(counts,1022),'attack');
 const poke=put(s,0,'CSM-1-005','front',0,true);
 const trigger=take(s,1,'CSM-1-008');
 const buried=s.players[1].life[0];
 s.players[1].life[0]=trigger;
 s.players[1].deck.push(buried);
 s=use(s,{type:'attack',uid:poke.uid});
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.trigger,'get');
 s=use(s,{type:'chooseTrigger',mode:'get'});
 assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assert.equal(s.players[1].life.some(c=>c.uid===trigger.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q2074 lets CSM-1-008 add a character that is neither Makima nor Reze',()=>{
 const counts=countsFor(['CSM-1-008','CSM-1-001','CSM-1-036','CSM-1-038']);
 let s=toPhase(fresh(counts,1023),'main');
 readyAp(s);
 fuel(s);
 const [kobeni]=top(s,0,['CSM-1-001','CSM-1-036','CSM-1-038']);
 const looker=toHand(s,0,'CSM-1-008');
 s=play(s,looker.uid);
 assert.equal(s.pending?.step,'lookPick');
 assert.equal(s.pending.data.window.length,3);
 assert.equal(s.pending.actions.some(a=>a.mode==='take'&&a.uid===kobeni.uid),true);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').length,1);
 s=choose(s,a=>a.mode==='take'&&a.uid===kobeni.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===kobeni.uid),true);
 assertUniversalMatch(packs,s);
});

test('both seats submit CSM-1-008 through the room, and the guest never receives the looked cards',()=>{
 const counts=countsFor(['CSM-1-008','CSM-1-001','CSM-1-036','CSM-1-038']);
 let match=toPhase(fresh(counts,1025),'main');
 readyAp(match);
 fuel(match);
 const [kobeni,event]=top(match,0,['CSM-1-001','CSM-1-036','CSM-1-038']);
 const looker=toHand(match,0,'CSM-1-008');
 match=play(match,looker.uid);
 assert.equal(match.pending?.step,'lookPick');
 assert.equal(assertUniversalMatch(packs,match),true);
 let room={code:'CSM10081',status:'playing',revision:1,first:0,match,log:[],updatedAt:1,
  seats:[0,1].map(side=>({userId:'user'+side,username:'玩家'+side,title:'csm',battleCounts:counts}))};
 const repos={pruneRooms(){},loadRoom:()=>structuredClone(room),saveRoom:r=>{room=structuredClone(r);}};
 const host=dispatchRoom(repos,{op:'view',code:room.code,userId:'user0'},2).public;
 const guest=dispatchRoom(repos,{op:'view',code:room.code,userId:'user1'},3).public;
 assert.equal(host.inspection?.cards?.length,3);
 assert.equal(host.inspection.cards.some(card=>card.uid===kobeni.uid&&card.actions.length>0),true);
 assert.equal(host.inspection.cards.some(card=>card.uid===event.uid&&card.actions.length===0),true);
 assert.equal(guest.inspection,null);
 assert.equal(guest.choices.length,0);
 assert.equal(JSON.stringify(guest).includes(kobeni.uid),false);
 assert.equal(JSON.stringify(guest).includes(event.uid),false);
 assert.throws(()=>dispatchRoom(repos,{op:'act',code:room.code,userId:'user1',index:0},4));
 const index=legalUniversalActions(packs,room.match).findIndex(a=>a.mode==='take'&&a.uid===kobeni.uid);
 assert.equal(host.choices.some(choice=>choice.index===index),true);
 dispatchRoom(repos,{op:'act',code:room.code,userId:'user0',index},5);
 assert.equal(room.match.players[0].hand.some(c=>c.uid===kobeni.uid),true);
 assert.equal(room.match.pending?.step,'lookOrder');
 const after=dispatchRoom(repos,{op:'view',code:room.code,userId:'user1'},6).public;
 assert.equal(JSON.stringify(after).includes(event.uid),false);
 assert.equal(after.inspection,null);
});

test('Q1898 does not retire BP 0 until CSM-1-008 finishes, and a restored character stays',()=>{
 const counts=countsFor(['CSM-1-008','CSM-1-001','CSM-1-003','CSM-1-036','CSM-1-038']);
 function open(){
  let s=toPhase(fresh(counts,1024),'main');
  readyAp(s);
  fuel(s);
  top(s,0,['CSM-1-001','CSM-1-036','CSM-1-038']);
  const victim=put(s,1,'CSM-1-003','front',0,true);
  const looker=toHand(s,0,'CSM-1-008');
  s=play(s,looker.uid);
  assert.equal(s.pending?.step,'lookPick');
  const board=live(s,1,victim.uid);
  board.buffs=[{bp:-10000,untilTurn:s.turn}];
  assert.equal(universalBp(packs,s,board)<=0,true);
  assert.equal(s.players[1].front.some(c=>c?.uid===victim.uid),true);
  return {s,victim};
 }
 const restored=open();
 let s=choose(restored.s,a=>a.mode==='skip');
 assert.equal(s.players[1].front.some(c=>c?.uid===restored.victim.uid),true);
 live(s,1,restored.victim.uid).buffs=[];
 let guard=0;
 while(s.pending){
  s=choose(s,a=>a.mode==='next'||a.mode==='skip'||a.mode==='discard');
  if(++guard>6)throw Error('008 did not finish');
 }
 assert.equal(s.players[1].front.some(c=>c?.uid===restored.victim.uid),true);
 assertUniversalMatch(packs,s);

 const lost=open();
 let gone=lost.s;
 guard=0;
 while(gone.pending){
  assert.equal(gone.players[1].front.some(c=>c?.uid===lost.victim.uid),true);
  gone=choose(gone,a=>a.mode==='next'||a.mode==='skip'||a.mode==='discard');
  if(++guard>6)throw Error('008 did not finish');
 }
 assert.equal(gone.players[1].outside.some(c=>c.uid===lost.victim.uid),true);
 assert.equal(gone.players[1].front.some(c=>c?.uid===lost.victim.uid),false);
 assertUniversalMatch(packs,gone);
});
