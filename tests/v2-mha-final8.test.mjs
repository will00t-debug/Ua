// The last eight UA10BT MHA sentences. Official text is effectJa.
// 030 and 042 enter ACTIVE. 042 returns another ACTIVE character.
// Q439–Q441, Q443, Q464–Q466 and Q509 are the printed boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp, universalAttackDamage, universalImpact,
 universalImpactNull, zoneRequiredEnergy
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

function card(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'purple',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1500, gen:extra.gen??1, traits:extra.traits||[],
  trigger:extra.trigger??null, implementation:extra.implementation||'dsl',
  effects:extra.effects||{}, ...extra
 };
}
const twice={op:'deployNamedFromZones', name:'トゥワイス',
 zones:['hand','outside'], line:'any', ready:true, optional:true, any:true,
 color:null, ap:1, maxEnergy:2};
const event30=card({id:'MHA-1-030', name:'トゥワイス量產', type:'event', energy:4, ap:2,
 bp:0, gen:0, playRequiresOwnName:'トゥワイス', effects:{onPlay:[twice]}});
const event31=card({id:'MHA-1-031', name:'死穢八斎會', type:'event', energy:0, ap:1, bp:0, gen:0,
 effects:{onPlay:[
  {op:'recoverOutsideAny', zone:'outside', max:1, optional:true,
   anyOf:[{field:'trait', value:'死穢八斎會'}]},
  {op:'deployOwnHandRestOrRaid', type:'character', color:null, maxEnergy:null,
   ap:1, max:1, optional:true, names:null, requireAffordableEnergy:true,
   trait:'死穢八斎會'}
 ]}});
const aizawa=card({id:'MHA-1-035', name:'相澤 消太', energy:0, bp:4000,
 frontStripsOppAbilities:['step','sniper','doubleAttack','doubleBlock','impact','damage','impactNull'],
 effects:{onPlay:[{op:'restOppFrontOne', optional:true}]}});
const uraraka=card({id:'MHA-1-042', name:'麗日 お茶子', color:'green', energy:0, bp:2000,
 effects:{onPlay:[{op:'returnOtherActiveThenHandActive', excludeName:'麗日 お茶子',
  optional:true, color:'green', maxEnergy:3, ap:1}]}});
const allMight=card({id:'MHA-1-045', name:'オールマイト', color:'green', energy:8, ap:2, bp:5000,
 energyLineForbidden:true, printedImpact:1,
 gatedHandDiscount:{ownFrontAtMost:0, oppFrontAtLeast:3, energy:6, ap:1},
 oppAttackReadyBp:-1000});
const endeavor=card({id:'MHA-1-091', name:'エンデヴァー', color:'red', energy:0, ap:1, bp:2500,
 effects:{
  onAttack:[{op:'payHandOutsideIfFrontOpen', bp:2000}],
  onBlock:[{op:'payHandOutsideIfFrontOpen', bp:2000}]
 }});
const hawks=card({id:'MHA-1-095', name:'ホークス', color:'red', energy:0, bp:3500, step:true,
 doubleAttackIfMovedThisTurn:true,
 mainAbility:{op:'payHandMoveSelf', oncePerTurn:true, pay:1}});
const office=card({id:'MHA-1-096', name:'エンデヴァー事務所', type:'field', color:'red',
 energy:0, ap:1, bp:0, gen:0, moveObserver:{
  op:'restActiveFieldDraw', once:'name', draw:1,
  when:{from:'hand', to:'outside', reasons:['payment','own-effect']}
 }});

function shell(extra=[]){
 const bodies=[event30, event31, aizawa, uraraka, allMight, endeavor, hawks, office,
  card({id:'GATE', name:'トゥワイス', implementation:'vanilla', effects:{}}),
  card({id:'TWICE-OK', name:'トゥワイス', energy:2, ap:1, bp:1000, implementation:'vanilla', effects:{}}),
  card({id:'TWICE-HIGH', name:'トゥワイス', energy:3, ap:1, implementation:'vanilla', effects:{}}),
  card({id:'OTHER', name:'別人', energy:2, ap:1, implementation:'vanilla', effects:{}}),
  card({id:'TRAIT', name:'死穢', traits:['死穢八斎會'], energy:1, ap:1, raidName:'基地',
   implementation:'vanilla', effects:{}}),
  card({id:'COSTLY', name:'付不起', traits:['死穢八斎會'], energy:9, ap:1, color:'red',
   implementation:'vanilla', effects:{}}),
  card({id:'PLAIN', name:'路人', traits:['學生'], energy:1, ap:1, implementation:'vanilla', effects:{}}),
  card({id:'BASE', name:'基地', energy:0, bp:1000, implementation:'vanilla', effects:{}}),
  card({id:'GREEN', name:'綠角', color:'green', energy:3, ap:1, bp:1500, implementation:'vanilla', effects:{}}),
  card({id:'OCHAKO', name:'麗日 お茶子', color:'green', energy:1, ap:1, implementation:'vanilla', effects:{}}),
  card({id:'PURPLE', name:'紫燃料', gen:4, implementation:'vanilla', effects:{}}),
  card({id:'GREEN-GEN', name:'綠燃料', color:'green', gen:2, implementation:'vanilla', effects:{}}),
  card({id:'SNIPER', name:'狙擊', energy:0, bp:2000, readyOnAttackCount:1, printedImpact:1,
   printedAttackDamage:2, impactNull:true, step:true, readyOnBlockCount:1,
   implementation:'dsl', effects:{}}),
  card({id:'GRANT-SNIPER', name:'授予狙擊', energy:0, bp:2000, enterAlwaysActive:true,
   effects:{onPlay:[{op:'grantSelfSniperThisTurn'}]}}),
  card({id:'WALL', name:'牆', color:'red', energy:0, bp:4000, implementation:'vanilla', effects:{}}),
  card({id:'RULE', name:'規則事件', type:'event', energy:0, ap:1, bp:0, gen:0,
   implementation:'vanilla', effects:{}}),
  ...extra
 ];
 for(let n=1;n<=8;n++){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, bp:1000,
   implementation:'vanilla', effects:{}}));
 }
 return createUniversalPack({id:'mha-final8', version:'final8', cards:bodies});
}
function open(seed=30){
 const pack=shell();
 const deck={};
 for(const id of Object.keys(pack.cards))deck[id]=1;
 for(const id of ['TWICE-OK','MHA-1-030','MHA-1-031','MHA-1-096','WALL','PURPLE','GREEN','FILL-01'])
  deck[id]=4;
 let total=Object.values(deck).reduce((a,b)=>a+b,0);
 for(const id of Object.keys(deck)){
  if(total<=50)break;
  if(!id.startsWith('FILL-')||id==='FILL-01')continue;
  const cut=Math.min(deck[id], total-50);
  deck[id]-=cut;
  total-=cut;
  if(deck[id]===0)delete deck[id];
 }
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 for(let i=0;i<8&&(s.phase!=='main'||s.active!==0);i++)
  s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=pl[zone];
  const index=pile.findIndex(c=>c?.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const slot=pl[line].findIndex(c=>c?.cardId===id);
  if(slot>=0){const body=pl[line][slot];pl[line][slot]=null;return body;}
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,pred){
 const choice=legal(pack,s).find(pred);
 if(!choice)throw Error('missing action '+(s.pending?.kind||s.phase));
 return dispatchUniversalAction(pack,s,choice);
}
function toPlayer(pack,s,player){
 let guard=0;
 while(!(s.active===player&&s.phase==='attack'&&!s.pending)){
  if(s.pending?.kind==='block')s=act(pack,s,a=>a.uid===null);
  else if(s.pending)throw Error('pending '+s.pending.kind+' for '+s.active);
  else s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>20)throw Error('player '+player+' '+s.phase+' active '+s.active);
 }
 return s;
}
function readyAp(s){
 s.players[s.active].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=true;});
}
function reach(pack,s,phase){
 let guard=0;
 while(!(s.active===0&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error(phase);
 }
 return s;
}

test('030 deploys any number of matching Twice from hand or outside, active',()=>{
 const {pack,s}=open(30);
 seat(s,0,'PURPLE','energy',0);
 seat(s,0,'PURPLE','energy',1);
 const event=hold(s,'MHA-1-030');
 readyAp(s);
 assert.equal(legal(pack,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const gate=seat(s,0,'GATE','front',0);
 const hand=hold(s,'TWICE-OK');
 const outside=pull(s,0,'TWICE-OK');
 s.players[0].outside.push(outside);
 const high=hold(s,'TWICE-HIGH');
 const other=hold(s,'OTHER');
 const played=act(pack,s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(played.pending.kind,'effect-named-zone-entry');
 assert.equal(played.pending.any,true);
 const choices=[...played.pending.handChoices,...played.pending.outsideChoices];
 assert.equal(choices.includes(hand.uid),true);
 assert.equal(choices.includes(outside.uid),true);
 assert.equal(choices.includes(high.uid),false);
 assert.equal(choices.includes(other.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,played,
  {type:'chooseNamedZoneDeploy', zone:'hand', uid:high.uid, line:'front', slot:1}));
 let next=act(pack,played,a=>a.type==='chooseNamedZoneDeploy'&&a.uid===hand.uid&&a.line==='front');
 assert.equal(next.players[0].front.find(c=>c?.uid===hand.uid).ready,true);
 assert.equal(next.pending.kind,'effect-named-zone-entry');
 next=act(pack,next,a=>a.type==='chooseNamedZoneDeploy'&&a.uid===outside.uid&&a.line==='energy');
 assert.equal(next.players[0].energy.find(c=>c?.uid===outside.uid).ready,true);
 assert.equal(next.pending,null);
 assert.equal(next.players[0].hand.some(c=>c.uid===high.uid),true);
 assert.equal(findReady(next,gate.uid),true);
 assert.equal(assertUniversalMatch(pack,next),true);
});

function findReady(s,uid){
 for(const p of s.players)for(const line of ['front','energy']){
  const hit=p[line].find(c=>c?.uid===uid);
  if(hit)return hit.ready;
 }
 return null;
}

test('030 can pass without deploying, and a vanished target is rejected',()=>{
 const {pack,s}=open(301);
 seat(s,0,'PURPLE','energy',0);
 seat(s,0,'PURPLE','energy',1);
 seat(s,0,'GATE','energy',2);
 const event=hold(s,'MHA-1-030');
 readyAp(s);
 const hand=hold(s,'TWICE-OK');
 const played=act(pack,s,a=>a.type==='event'&&a.uid===event.uid);
 const passed=act(pack,played,a=>a.uid===null);
 assert.equal(passed.pending,null);
 assert.equal(passed.players[0].hand.some(c=>c.uid===hand.uid),true);
 const again=hold(passed,'MHA-1-030');
 readyAp(passed);
 const second=act(pack,passed,a=>a.type==='event'&&a.uid===again.uid);
 const index=second.players[0].hand.findIndex(c=>c.uid===hand.uid);
 second.players[0].hand.splice(index,1);
 second.players[0].removed.push(hand);
 assert.throws(()=>dispatchUniversalAction(pack,second,
  {type:'chooseNamedZoneDeploy', zone:'hand', uid:hand.uid, line:'front', slot:0}));
});

test('031 recovers one trait character, then rests or raids an affordable hand character',()=>{
 const {pack,s}=open(31);
 const outside=pull(s,0,'TRAIT');
 s.players[0].outside.push(outside);
 const plain=pull(s,0,'PLAIN');
 s.players[0].outside.push(plain);
 const costly=hold(s,'COSTLY');
 const event=hold(s,'MHA-1-031');
 readyAp(s);
 seat(s,0,'BASE','front',1);
 seat(s,0,'PURPLE','energy',0);
 const played=act(pack,s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(played.pending.kind,'effect-recover-any');
 assert.equal(played.pending.choices.includes(outside.uid),true);
 assert.equal(played.pending.choices.includes(plain.uid),false);
 const recovered=act(pack,played,a=>a.type==='chooseRecoverAny'&&a.uid===outside.uid);
 assert.equal(recovered.players[0].hand.some(c=>c.uid===outside.uid),true);
 assert.equal(recovered.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(recovered.pending.choices.includes(outside.uid),true);
 assert.equal(recovered.pending.choices.includes(costly.uid),false);
 const raid=legal(pack,recovered).find(a=>a.mode==='raid'&&a.uid===outside.uid);
 assert.ok(raid);
 const rested=act(pack,recovered,a=>a.mode==='enter'&&a.uid===outside.uid&&a.line==='front');
 const entered=rested.players[0].front.find(c=>c?.uid===outside.uid);
 assert.equal(entered.ready,false);
 assert.equal(rested.pending,null);
 assert.equal(assertUniversalMatch(pack,rested),true);
});

test('031 can skip the recovery and still deploy a card already in hand',()=>{
 const {pack,s}=open(311);
 const hand=hold(s,'TRAIT');
 const buried=pull(s,0,'COSTLY');
 s.players[0].outside.push(buried);
 seat(s,0,'PURPLE','energy',0);
 const event=hold(s,'MHA-1-031');
 readyAp(s);
 const played=act(pack,s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(played.pending.kind,'effect-recover-any');
 const skipped=act(pack,played,a=>a.uid===null);
 assert.equal(skipped.pending.kind,'effect-hand-rest-or-raid');
 const declined=act(pack,skipped,a=>a.uid===null);
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===hand.uid),true);
});

test('035 strips seven opposing abilities only while it stays on the front',()=>{
 const {pack,s}=open(35);
 const host=seat(s,1,'MHA-1-035','front',0);
 const foe=seat(s,0,'SNIPER','front',0);
 assert.equal(universalImpact(pack,s,foe),0);
 assert.equal(universalImpactNull(pack,s,foe),false);
 assert.equal(universalAttackDamage(pack,s,foe),1);
 const swinging=reach(pack,s,'attack');
 const swung=act(pack,swinging,a=>a.type==='attack'&&a.uid===foe.uid);
 assert.equal(swung.pending.kind,'block');
 assert.equal(swung.players[0].front.find(c=>c?.uid===foe.uid).ready,false);
 grantContinuousState(s,{kind:'originalEffectsDisabled', controller:1,
  sourceUid:foe.uid, targetUid:host.uid, sourceLinked:false,
  until:{player:0, phase:'start', edge:'start'}});
 assert.equal(universalImpact(pack,s,foe),1);
 assert.equal(universalImpactNull(pack,s,foe),true);
 assert.equal(universalAttackDamage(pack,s,foe),2);
 s.players[1].front[0]=null;
 s.players[1].hand.push(host);
 assert.equal(universalImpact(pack,s,foe),1);
});

test('035 strips sniper, step, and double block only while it stays opposing',()=>{
 const {pack,s}=open(354);
 const host=seat(s,1,'MHA-1-035','front',0);
 const mover=seat(s,0,'SNIPER','front',0,true);
 const occupying=s.players[0].energy[0];
 if(occupying){s.players[0].energy[0]=null;s.players[0].removed.push(occupying);}
 s.phase='move';
 assert.equal(legal(pack,s).some(a=>a.type==='step'&&a.uid===mover.uid),false);
 s.players[1].front[0]=null;
 s.players[1].hand.push(host);
 assert.equal(legal(pack,s).some(a=>a.type==='step'&&a.uid===mover.uid),true);

 const stripped=open(355);
 seat(stripped.s,1,'MHA-1-035','front',0);
 const mark=seat(stripped.s,1,'WALL','front',1,true);
 const body=hold(stripped.s,'GRANT-SNIPER');
 const played=act(stripped.pack,stripped.s,a=>a.type==='play'&&a.uid===body.uid&&a.line==='front');
 const swinging=reach(stripped.pack,played,'attack');
 assert.equal(legal(stripped.pack,swinging).some(a=>a.type==='attack'&&a.uid===body.uid&&a.targetUid===mark.uid),false);
 const clear=open(356);
 const target=seat(clear.s,1,'WALL','front',0,true);
 const free=hold(clear.s,'GRANT-SNIPER');
 const entered=act(clear.pack,clear.s,a=>a.type==='play'&&a.uid===free.uid&&a.line==='front');
 const live=reach(clear.pack,entered,'attack');
 const shot=act(clear.pack,live,a=>a.type==='attack'&&a.uid===free.uid&&a.targetUid===target.uid);
 assert.notEqual(shot.pending?.kind,'block');

 const blocked=open(357);
 const guard=seat(blocked.s,0,'SNIPER','front',0,true);
 seat(blocked.s,1,'MHA-1-035','front',0);
 const weak=seat(blocked.s,1,'PLAIN','front',1,true);
 let turn=toPlayer(blocked.pack,blocked.s,1);
 turn=act(blocked.pack,turn,a=>a.type==='attack'&&a.uid===weak.uid);
 const after=act(blocked.pack,turn,a=>a.type==='chooseBlock'&&a.uid===guard.uid);
 assert.equal(after.players[0].front.find(c=>c?.uid===guard.uid).ready,false);
 const doubled=open(358);
 const guard2=seat(doubled.s,0,'SNIPER','front',0,true);
 const weak2=seat(doubled.s,1,'PLAIN','front',0,true);
 let turn2=toPlayer(doubled.pack,doubled.s,1);
 turn2=act(doubled.pack,turn2,a=>a.type==='attack'&&a.uid===weak2.uid);
 const after2=act(doubled.pack,turn2,a=>a.type==='chooseBlock'&&a.uid===guard2.uid);
 assert.equal(after2.players[0].front.find(c=>c?.uid===guard2.uid).ready,true);
});

test('035 may rest one opposing front character and may decline',()=>{
 const {pack,s}=open(351);
 const event=hold(s,'MHA-1-035');
 const foe=seat(s,1,'WALL','front',0,true);
 const back=seat(s,1,'SNIPER','energy',0,true);
 const played=act(pack,s,a=>a.type==='play'&&a.uid===event.uid&&a.line==='front');
 assert.equal(played.pending.kind,'effect-rest-bp');
 assert.equal(played.pending.choices.includes(foe.uid),true);
 assert.equal(played.pending.choices.includes(back.uid),false);
 const rested=act(pack,played,a=>a.type==='chooseRestBp'&&a.uid===foe.uid);
 assert.equal(rested.players[1].front[0].ready,false);
 const again=open(352);
 const second=hold(again.s,'MHA-1-035');
 const target=seat(again.s,1,'WALL','front',0,true);
 const opened=act(again.pack,again.s,a=>a.type==='play'&&a.uid===second.uid&&a.line==='front');
 const skipped=act(again.pack,opened,a=>a.type==='chooseRestBp'&&a.uid===null);
 assert.equal(skipped.players[1].front.find(c=>c?.uid===target.uid).ready,true);
 const gone=open(353);
 const third=hold(gone.s,'MHA-1-035');
 const victim=seat(gone.s,1,'WALL','front',0,true);
 const pending=act(gone.pack,gone.s,a=>a.type==='play'&&a.uid===third.uid&&a.line==='energy');
 pending.players[1].front[0]=null;
 pending.players[1].removed.push(victim);
 assert.throws(()=>dispatchUniversalAction(gone.pack,pending,
  {type:'chooseRestBp', uid:victim.uid}));
});

test('042 returns another active character before an active hand entry',()=>{
 const {pack,s}=open(42);
 const self=hold(s,'MHA-1-042');
 const ally=seat(s,0,'PURPLE','front',1,true);
 const rested=seat(s,0,'GREEN','front',2,false);
 const ochako=seat(s,0,'OCHAKO','front',3,true);
 const green=hold(s,'GREEN');
 const played=act(pack,s,a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===0);
 assert.equal(played.pending.kind,'effect-return-active');
 assert.equal(played.pending.choices.includes(ally.uid),true);
 assert.equal(played.pending.choices.includes(rested.uid),false);
 assert.equal(played.pending.choices.includes(ochako.uid),false);
 assert.equal(played.pending.choices.includes(self.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,played,
  {type:'chooseReturnActive', uid:ochako.uid}));
 const bounced=act(pack,played,a=>a.type==='chooseReturnActive'&&a.uid===ally.uid);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===ally.uid),true);
 assert.equal(bounced.pending.kind,'effect-hand-active');
 assert.equal(bounced.pending.choices.includes(green.uid),true);
 assert.equal(bounced.pending.choices.includes(ally.uid),false);
 const entered=act(pack,bounced,a=>a.type==='chooseHandActive'&&a.uid===green.uid&&a.line==='front');
 assert.equal(entered.players[0].front.find(c=>c?.uid===green.uid).ready,true);
 const decline=open(421);
 const card042=hold(decline.s,'MHA-1-042');
 seat(decline.s,0,'PURPLE','front',1,true);
 const waiting=hold(decline.s,'GREEN');
 const opened=act(decline.pack,decline.s,a=>a.type==='play'&&a.uid===card042.uid&&a.line==='energy');
 const skipped=act(decline.pack,opened,a=>a.uid===null);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===waiting.uid),true);
});

test('045 discounts energy and AP only for the front-count gate, including life',()=>{
 const {pack,s}=open(45);
 const body=hold(s,'MHA-1-045');
 seat(s,0,'GREEN-GEN','energy',0);
 for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  const occupying=s.players[0][line][slot];
  if(!occupying||occupying.cardId==='GREEN-GEN')continue;
  s.players[0][line][slot]=null;
  s.players[0].removed.push(occupying);
 }
 for(let slot=0;slot<3;slot++)seat(s,1,'WALL','front',slot);
 s.players[0].apCards.forEach((ap,index)=>{ap.inPlay=true;ap.ready=index===0;});
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['MHA-1-045'],'hand'),2);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['MHA-1-045'],'life'),2);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===body.uid&&a.line==='energy'),false);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'),true);
 seat(s,0,'GREEN','front',0);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['MHA-1-045'],'hand'),8);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===body.uid),false);
});

test('045 readies on an opposing attack and drops BP only when the ready succeeds',()=>{
 const {pack,s}=open(451);
 const mine=seat(s,0,'MHA-1-045','front',0,false);
 const foe=seat(s,1,'WALL','front',0,true);
 let state=toPlayer(pack,s,1);
 const mineNow=state.players[0].front.find(c=>c?.uid===mine.uid);
 mineNow.ready=false;
 const attacked=act(pack,state,a=>a.type==='attack'&&a.uid===foe.uid);
 assert.equal(attacked.pending.kind,'effect-opp-attack-ready');
 const readied=act(pack,attacked,a=>a.mode==='ready');
 const live=readied.players[0].front.find(c=>c?.uid===mine.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(pack,readied,live),4000);
 const blocked=open(452);
 const rested=seat(blocked.s,0,'MHA-1-045','front',0,false);
 const enemy=seat(blocked.s,1,'WALL','front',0,true);
 let turn=toPlayer(blocked.pack,blocked.s,1);
 const seated=turn.players[0].front.find(c=>c?.uid===rested.uid);
 seated.ready=false;
 grantContinuousState(turn,{kind:'skipNextActive', controller:1,
  sourceUid:rested.uid, targetUid:rested.uid, sourceLinked:false, until:null});
 const swing=act(blocked.pack,turn,a=>a.type==='attack'&&a.uid===enemy.uid);
 const failed=act(blocked.pack,swing,a=>a.mode==='ready');
 const stayed=failed.players[0].front.find(c=>c?.uid===rested.uid);
 assert.equal(stayed.ready,false);
 assert.equal(universalBp(blocked.pack,failed,stayed),5000);
});

test('091 adds BP only after a hand payment, and only with an open front slot',()=>{
 const {pack,s}=open(91);
 const attacker=seat(s,0,'MHA-1-091','front',0,true);
 const payment=hold(s,'PLAIN');
 const wall=seat(s,1,'WALL','front',0,true);
 let state=reach(pack,s,'attack');
 const swung=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(swung.pending.kind,'effect-front-open-hand');
 const declined=act(pack,swung,a=>a.uid===null);
 assert.equal(universalBp(pack,declined,declined.players[0].front[0]),2500);
 assert.equal(declined.pending.kind,'block');
 const paid=open(911);
 const hitter=seat(paid.s,0,'MHA-1-091','front',0,true);
 const cost=hold(paid.s,'PLAIN');
 seat(paid.s,1,'WALL','front',0,true);
 let battle=reach(paid.pack,paid.s,'attack');
 battle=act(paid.pack,battle,a=>a.type==='attack'&&a.uid===hitter.uid);
 battle=act(paid.pack,battle,a=>a.type==='chooseFrontOpenHand'&&a.uid===cost.uid);
 assert.equal(universalBp(paid.pack,battle,battle.players[0].front[0]),4500);
 assert.equal(battle.players[0].outside.some(c=>c.uid===cost.uid),true);
 battle=act(paid.pack,battle,a=>a.type==='chooseBlock'&&a.uid!==null);
 assert.equal(battle.players[1].front[0],null);
 const full=open(912);
 const crowded=seat(full.s,0,'MHA-1-091','front',0,true);
 for(let slot=1;slot<4;slot++)seat(full.s,0,'FILL-01','front',slot,true);
 hold(full.s,'PLAIN');
 seat(full.s,1,'WALL','front',0,true);
 let closed=reach(full.pack,full.s,'attack');
 closed=act(full.pack,closed,a=>a.type==='attack'&&a.uid===crowded.uid);
 assert.equal(closed.pending.kind,'block');
 assert.equal(universalBp(full.pack,closed,closed.players[0].front[0]),2500);
});

test('091 on block pays before the battle comparison',()=>{
 const {pack,s}=open(913);
 const attacker=seat(s,1,'WALL','front',0,true);
 attacker.bp=4000;
 const blocker=seat(s,0,'MHA-1-091','front',0,true);
 const cost=hold(s,'PLAIN');
 let state=toPlayer(pack,s,1);
 state=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(state.pending.kind,'block');
 state=act(pack,state,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(state.pending.kind,'effect-front-open-hand');
 state=act(pack,state,a=>a.uid===cost.uid);
 assert.equal(state.players[0].front.find(c=>c?.uid===blocker.uid).ready,false);
 assert.equal(universalBp(pack,state,state.players[0].front.find(c=>c?.uid===blocker.uid)),4500);
 assert.equal(state.players[0].front.some(c=>c?.uid===blocker.uid),true);
 assert.equal(state.players[1].front.some(c=>c?.uid===attacker.uid),true);
});

test('095 moves only itself, removes a full-line occupant, then gains double attack',()=>{
 const {pack,s}=open(95);
 const self=seat(s,0,'MHA-1-095','energy',0,true);
 const payment=hold(s,'PLAIN');
 const occupants=[];
 for(let slot=0;slot<4;slot++)occupants.push(seat(s,0,'FILL-01','front',slot,true));
 const activated=act(pack,s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='payHandMoveSelf');
 assert.equal(activated.pending.kind,'effect-pay-hand-move');
 const paid=dispatchUniversalAction(pack,activated,{type:'choosePayHandMove', uid:payment.uid});
 assert.equal(paid.pending.kind,'effect-line-slot');
 assert.equal(paid.pending.line,'front');
 assert.equal(paid.pending.moverUid,self.uid);
 const moved=dispatchUniversalAction(pack,paid,{type:'chooseLineSlot', slot:0, replaceUid:occupants[0].uid});
 assert.equal(moved.players[0].front[0].uid,self.uid);
 assert.equal(moved.players[0].removed.some(c=>c.uid===occupants[0].uid),true);
 assert.equal(moved.players[0].front[0].movedThisTurn,moved.turn);
 let attack=reach(pack,moved,'attack');
 const swung=act(pack,attack,a=>a.type==='attack'&&a.uid===self.uid);
 const after=swung.pending?.kind==='block'?act(pack,swung,a=>a.uid===null):swung;
 const body=after.players[0].energy.find(c=>c?.uid===self.uid)||
  after.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(body.ready,true);
 const still=open(951);
 const quiet=seat(still.s,0,'MHA-1-095','front',0,true);
 let plain=reach(still.pack,still.s,'attack');
 plain=act(still.pack,plain,a=>a.type==='attack'&&a.uid===quiet.uid);
 plain=plain.pending?.kind==='block'?act(still.pack,plain,a=>a.uid===null):plain;
 assert.equal(plain.players[0].front.find(c=>c?.uid===quiet.uid).ready,false);
});

test('096 rests once per name after an own effect puts a hand card outside',()=>{
 const {pack,s}=open(96);
 const first=seat(s,0,'MHA-1-096','energy',0,true);
 const second=seat(s,0,'MHA-1-096','energy',1,true);
 const attacker=seat(s,0,'MHA-1-091','front',0,true);
 const cost=hold(s,'PLAIN');
 const later=hold(s,'OTHER');
 let state=reach(pack,s,'attack');
 state=act(pack,state,a=>a.type==='attack'&&a.uid===attacker.uid);
 state=act(pack,state,a=>a.type==='chooseFrontOpenHand'&&a.uid===cost.uid);
 assert.equal(state.pending.kind,'effect-field-rest-draw');
 const declined=act(pack,state,a=>a.mode==='skip');
 assert.equal(declined.players[0].energy.find(c=>c?.uid===first.uid).ready,true);
 assert.equal(declined.players[0].energy.find(c=>c?.uid===second.uid).ready,true);
 assert.equal(declined.pending.kind,'effect-field-rest-draw');
 const drawn=act(pack,declined,a=>a.mode==='rest');
 const rested=drawn.players[0].energy.filter(c=>c&&!c.ready);
 assert.equal(rested.length,1);
 assert.equal(drawn.pending==null||drawn.pending.kind!=='effect-field-rest-draw',true);
 const beforeRest=declined.players[0].hand.length;
 assert.equal(drawn.players[0].hand.length,beforeRest+1);
 const rule=open(961);
 seat(rule.s,0,'MHA-1-096','energy',0,true);
 const event=hold(rule.s,'RULE');
 const played=act(rule.pack,rule.s,a=>a.type==='event'&&a.uid===event.uid);
 assert.notEqual(played.pending?.kind,'effect-field-rest-draw');
 assert.equal(played.players[0].energy[0].ready,true);
});
