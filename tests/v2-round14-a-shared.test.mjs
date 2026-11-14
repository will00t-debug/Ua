// Round 14 A. The new shared operations are generic. The MHA cards that
// need them stay pending until their group writes the whole program.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalImpact,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

function card(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'green',
  type:extra.type||'character',energy:extra.energy??0,ap:extra.ap??1,
  bp:extra.bp??2000,gen:extra.gen??1,traits:extra.traits||[],
  trigger:extra.trigger??null,implementation:extra.implementation||'dsl',
  effects:extra.effects||{},...extra
 };
}
function shell(cards){
 const bodies=[...cards];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'),name:'填'+n,
   implementation:'vanilla',bp:1000,effects:{}}));
  n++;
 }
 return createUniversalPack({id:'r14',version:'r14',cards:bodies});
}
function reject(body,pattern){
 const fillers=Array.from({length:12},(_,i)=>card({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000,effects:{}
 }));
 assert.throws(()=>createUniversalPack({id:'r14',version:'bad',cards:[card(body),...fillers]}),pattern);
}
function open(cards,{seed=14,phase='main'}={}){
 const pack=shell(cards);
 const deck={};
 let remain=50;
 const order=[...new Set([...cards.map(c=>c.id),...Object.keys(pack.cards)])];
 for(const id of order){
  if(remain<=0)break;
  const n=Math.min(4,remain);
  deck[id]=n;
  remain-=n;
 }
 assert.equal(remain,0);
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed,first:0,openingMulligan:false});
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase '+phase);
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
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
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function play(pack,s,id,line='front',slot=0){
 const body=hold(s,id);
 const action=legal(pack,s).find(a=>a.type==='play'&&a.uid===body.uid&&a.line===line&&a.slot===slot);
 assert.ok(action,id+' play '+line+' '+slot);
 return act(pack,s,action);
}
function keepHand(s,ids,p=0){
 const kept=ids.map(id=>hold(s,id,p));
 s.players[p].deck.push(...s.players[p].hand.filter(c=>!kept.includes(c)));
 s.players[p].hand=kept;
 return kept;
}

const handOut={id:'HAND-OUT',effects:{onPlay:[{op:'placeHandOutside',count:1,optional:false}]}};
const lifeOrder={id:'LIFE-ORDER',effects:{onPlay:[{op:'reorderOwnLife',optional:true}]}};
const frontMove={id:'FRONT-MOVE',effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,
 max:1,whenSelf:'front',optional:true}]}};
const namedMove={id:'NAMED-MOVE',effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:'測試'}]}};
const payer={id:'PAY-IMPACT',mainAbility:{op:'payHandGrantImpact',oncePerTurn:true,pay:1,amount:1}};
const remover={id:'FRONT-REMOVE',mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
 then:[{op:'removeOppFrontUnderBp',bp:2000}]}};
const raider={id:'RAID-TOP',name:'上層',raidName:'底板',effects:{onPlay:[
 {op:'deployRaidBottomActive',optional:true}]}};
const base={id:'RAID-BASE',name:'底板',implementation:'vanilla',effects:{}};
const fuel={id:'FUEL',name:'能源角色',traits:['測試'],implementation:'vanilla',effects:{}};
const low={id:'LOW',name:'低BP',bp:2000,implementation:'vanilla',effects:{}};
const high={id:'HIGH',name:'高BP',bp:4000,implementation:'vanilla',effects:{}};

test('the round 14 cards stay ready and 076 now uses the full-front move',()=>{
 const pack=createMhaV2Pack();
 assert.equal(Object.keys(pack.cards).length,91);
 for(const id of ['MHA-1-006','MHA-1-007','MHA-1-009','MHA-1-010','MHA-1-017','MHA-1-048',
  'MHA-1-056','MHA-1-059','MHA-1-071','MHA-1-074','MHA-1-076','MHA-1-087','MHA-1-089','MHA-1-093'])
  assert.equal(pack.cards[id].id,id);
 assert.equal(pack.cards['MHA-1-076'].effects.onPlay[0].op,'moveEnergyTraitToFront');
});

test('placeHandOutside puts one hand card outside and does not draw',()=>{
 reject({...handOut,effects:{onPlay:[{op:'placeHandOutside',count:0,optional:false}]}},
  /invalid hand outside placement/);
 reject({...handOut,effects:{onRetire:[{op:'placeHandOutside',count:1,optional:false}]}},
  /unsupported onRetire ability program/);
 let opened=open([card(handOut),card(fuel)]);
 keepHand(opened.s,['HAND-OUT','FUEL']);
 const deck=opened.s.players[0].deck.length;
 opened.s=play(opened.pack,opened.s,'HAND-OUT');
 assert.equal(opened.s.pending.kind,'effect-place-hand-outside');
 assert.equal(opened.s.players[0].deck.length,deck);
 const fuelCard=opened.s.players[0].hand.find(c=>c.cardId==='FUEL');
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'choosePlaceHandOutside',uid:'missing'}),/not currently legal/);
 opened.s.players[0].hand=opened.s.players[0].hand.filter(c=>c.uid!==fuelCard.uid);
 opened.s.players[0].deck.push(fuelCard);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'choosePlaceHandOutside',uid:fuelCard.uid}),/not currently legal|Hand outside/);
 opened=open([card(handOut),card(fuel)],{seed:141});
 keepHand(opened.s,['HAND-OUT','FUEL']);
 const keptDeck=opened.s.players[0].deck.length;
 opened.s=play(opened.pack,opened.s,'HAND-OUT');
 const paid=opened.s.players[0].hand.find(c=>c.cardId==='FUEL');
 opened.s=act(opened.pack,opened.s,a=>a.type==='choosePlaceHandOutside'&&a.uid===paid.uid);
 assert.equal(opened.s.pending,null);
 assert.ok(opened.s.players[0].outside.some(c=>c.uid===paid.uid));
 assert.equal(opened.s.players[0].deck.length,keptDeck);
 const empty=open([card(handOut)],{seed:142});
 keepHand(empty.s,['HAND-OUT']);
 const before=empty.s.players[0].deck.length;
 empty.s=play(empty.pack,empty.s,'HAND-OUT');
 assert.equal(empty.s.pending,null);
 assert.equal(empty.s.players[0].hand.length,0);
 assert.equal(empty.s.players[0].deck.length,before);
});

test('reorderOwnLife shows every life card and can be skipped',()=>{
 reject({...lifeOrder,effects:{onPlay:[{op:'reorderOwnLife'}]}},/invalid life reorder/);
 reject({...lifeOrder,effects:{onRetire:[{op:'reorderOwnLife',optional:true}]}},
  /unsupported onRetire ability program/);
 let opened=open([card(lifeOrder),card(fuel),card(low),card(high)]);
 const [first,second,third]=['FUEL','LOW','HIGH'].map(id=>pull(opened.s,0,id));
 opened.s.players[0].deck.push(...opened.s.players[0].life.splice(0));
 opened.s.players[0].life=[first,second,third];
 opened.s=play(opened.pack,opened.s,'LIFE-ORDER');
 assert.equal(opened.s.pending.kind,'effect-life-order');
 assert.deepEqual(opened.s.pending.uids,[first.uid,second.uid,third.uid]);
 const mine=universalPrivateChoices(opened.pack,opened.s,0);
 assert.deepEqual(mine.inspected.map(c=>c.uid),[first.uid,second.uid,third.uid]);
 assert.equal(universalPrivateChoices(opened.pack,opened.s,1),null);
 assert.equal(uiActionLabel({type:'chooseReorderOwnLife',uid:null},
  {pack:opened.pack,state:opened.s}),'不改變生命的順序');
 assert.equal(uiActionLabel({type:'chooseLifeOrder',uid:first.uid},
  {pack:opened.pack,state:opened.s}).startsWith('先處理此公開 LIFE'),true);
 let skipped=act(opened.pack,structuredClone(opened.s),a=>a.type==='chooseReorderOwnLife'&&a.uid===null);
 assert.deepEqual(skipped.players[0].life.map(c=>c.uid),[first.uid,second.uid,third.uid]);
 third.faceDown=false;
 opened.s.players[0].life=opened.s.players[0].life.filter(c=>c.uid!==third.uid);
 opened.s.players[0].outside.push(third);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===third.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'chooseReorderOwnLife',uid:third.uid}),/not currently legal|Life card left/);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseReorderOwnLife'&&a.uid===second.uid);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseReorderOwnLife'&&a.uid===first.uid);
 assert.deepEqual(opened.s.players[0].life.map(c=>c.uid),[second.uid,first.uid]);
 assert.equal(opened.s.pending,null);
 const one=open([card(lifeOrder)],{seed:143});
 one.s.players[0].deck.push(...one.s.players[0].life.slice(1));
 one.s.players[0].life=one.s.players[0].life.slice(0,1);
 one.s=play(one.pack,one.s,'LIFE-ORDER');
 assert.equal(one.s.pending,null);
});

test('a traitless front gate moves at most one energy character',()=>{
 reject({...frontMove,effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,max:1,whenSelf:'front'}]}},
  /invalid energy-line trait move/);
 reject({...frontMove,effects:{onAttack:[{op:'moveEnergyTraitToFront',trait:null,max:1,
  whenSelf:'front',optional:true}]}},/front-gated energy move is a character onPlay effect/);
 let opened=open([card(frontMove),card(fuel)]);
 const back=seat(opened.s,0,'FUEL','energy',0,true);
 opened.s=play(opened.pack,opened.s,'FRONT-MOVE', 'energy', 1);
 assert.equal(opened.s.pending,null);
 assert.equal(opened.s.players[0].energy[0].uid,back.uid);
 opened=open([card(frontMove),card(fuel)],{seed:144});
 const mover=seat(opened.s,0,'FUEL','energy',0,true);
 opened.s=play(opened.pack,opened.s,'FRONT-MOVE');
 assert.equal(opened.s.pending.kind,'effect-energy-trait-front');
 assert.equal(Object.keys(opened.s.pending).length,9);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===null),true);
 mover.ready=false;
 opened.s.players[0].energy[0]=null;
 opened.s.players[0].outside.push(mover);
 assert.equal(legal(opened.pack,opened.s).every(a=>a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'chooseEnergyTraitFront',uid:mover.uid,slot:1}),/not currently legal/);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseEnergyTraitFront'&&a.uid===null);
 assert.equal(opened.s.pending,null);
 opened=open([card(frontMove),card(fuel),card(low)],{seed:145});
 const moving=seat(opened.s,0,'FUEL','energy',0,true);
 seat(opened.s,0,'LOW','energy',1,true);
 opened.s=play(opened.pack,opened.s,'FRONT-MOVE');
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseEnergyTraitFront'&&a.uid===moving.uid&&a.slot===1);
 assert.equal(opened.s.pending,null);
 assert.equal(opened.s.players[0].front[1].uid,moving.uid);
 assert.equal(opened.s.players[0].energy[0],null);
 const named=open([card(namedMove),card(fuel)],{seed:146});
 seat(named.s,0,'FUEL','energy',0,true);
 named.s=play(named.pack,named.s,'NAMED-MOVE');
 assert.equal(named.s.pending.trait,'測試');
 assert.equal(Object.keys(named.s.pending).length,7);
});

test('paying one hand card grants impact only while the source remains',()=>{
 reject({...payer,mainAbility:{op:'payHandGrantImpact',oncePerTurn:true,pay:2,amount:1}},
  /unsupported main action ability/);
 let opened=open([card(payer),card(fuel)]);
 const self=seat(opened.s,0,'PAY-IMPACT','front',0,true);
 keepHand(opened.s,['FUEL']);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='activate'&&a.uid===self.uid),true);
 opened.s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='payHandImpact');
 assert.equal(opened.s.pending.kind,'effect-pay-hand-impact');
 const paid=opened.s.players[0].hand[0];
 opened.s.players[0].front[0]=null;
 opened.s.players[0].outside.push(self);
 opened.s=act(opened.pack,opened.s,a=>a.type==='choosePayHandImpact'&&a.uid===paid.uid);
 assert.equal(self.impactGranted,undefined);
 assert.ok(opened.s.players[0].outside.some(c=>c.uid===paid.uid));
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 opened=open([card(payer),card(fuel)],{seed:147});
 const live=seat(opened.s,0,'PAY-IMPACT','energy',0,false);
 keepHand(opened.s,['FUEL']);
 opened.s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===live.uid);
 const cost=opened.s.players[0].hand[0];
 opened.s=act(opened.pack,opened.s,a=>a.type==='choosePayHandImpact'&&a.uid===cost.uid);
 const granted=opened.s.players[0].energy.find(c=>c?.uid===live.uid);
 assert.equal(granted.impactGranted.amount,1);
 assert.equal(universalImpact(opened.pack,opened.s,granted),1);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='activate'&&a.uid===live.uid),false);
 const dry=open([card(payer)],{seed:148});
 const quiet=seat(dry.s,0,'PAY-IMPACT','front',0,true);
 dry.s.players[0].deck.push(...dry.s.players[0].hand.splice(0));
 assert.equal(legal(dry.pack,dry.s).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assert.throws(()=>dispatchUniversalAction(dry.pack,dry.s,
  {type:'activate',uid:quiet.uid,mode:'payHandImpact'}),/not currently legal/);
 assert.equal(dry.s.mainAbilityUsedUids.includes(quiet.uid),false);
});

test('a front activate removes one opposing front at or under the printed BP',()=>{
 reject({...remover,mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'removeOppFrontUnderBp',bp:2000,optional:false}]}},
  /unsupported main action ability/);
 let opened=open([card(remover),card(low),card(high)]);
 const self=seat(opened.s,0,'FRONT-REMOVE','front',0,true);
 const victim=seat(opened.s,1,'LOW','front',0,true);
 const tall=seat(opened.s,1,'HIGH','front',1,true);
 opened.s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===self.uid);
 assert.equal(opened.s.pending.kind,'effect-retire-bp');
 assert.equal(opened.s.pending.destination,'removed');
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===victim.uid),true);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===tall.uid),false);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===null),false);
 opened.s.players[1].front[0]=null;
 opened.s.players[1].outside.push(victim);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'chooseRetireBp',uid:victim.uid}),/Illegal BP-threshold retirement target/);
 opened=open([card(remover),card(low)],{seed:149});
 const source=seat(opened.s,0,'FRONT-REMOVE','front',0,true);
 const gone=seat(opened.s,1,'LOW','front',0,true);
 opened.s.players[1].front[0]=null;
 opened.s.players[1].outside.push(gone);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'activate',uid:source.uid,mode:'frontOnce'}),/not currently legal/);
 assert.equal(opened.s.mainAbilityUsedUids.includes(source.uid),false);
 opened=open([card(remover),card(low),card(high)],{seed:150});
 const actor=seat(opened.s,0,'FRONT-REMOVE','front',0,true);
 const marked=seat(opened.s,1,'LOW','front',0,true);
 seat(opened.s,1,'HIGH','front',1,true);
 opened.s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===actor.uid);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseRetireBp'&&a.uid===marked.uid);
 assert.ok(opened.s.players[1].removed.some(c=>c.uid===marked.uid));
 assert.equal(opened.s.players[1].outside.some(c=>c.uid===marked.uid),false);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
});

test('an on-play raid bottom enters active from the stack, and the retire gate stays',()=>{
 reject({...raider,effects:{onPlay:[{op:'deployRaidBottomActive',optional:true,when:{}}]}},
  /invalid raid-bottom active entry/);
 reject({id:'RETIRE-BARE',raidName:'底板',effects:{onRetire:[
  {op:'deployRaidBottomActive',optional:true}]}},
  /raid-bottom active entry without a gate/);
 let opened=open([card(raider),card(base)]);
 const buried=seat(opened.s,0,'RAID-BASE','energy',0,false);
 const top=hold(opened.s,'RAID-TOP');
 opened.s=act(opened.pack,opened.s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===buried.uid);
 assert.equal(opened.s.pending.kind,'effect-raid-bottom-active');
 assert.equal(opened.s.pending.origin,'stack');
 assert.equal(opened.s.pending.baseUid,buried.uid);
 const host=opened.s.players[0].front.find(c=>c?.cardId==='RAID-TOP');
 const left=host.stack.shift();
 opened.s.players[0].outside.push(left);
 assert.equal(legal(opened.pack,opened.s).every(a=>a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'chooseRaidBottomActive',uid:buried.uid,line:'front',slot:1}),/not currently legal/);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseRaidBottomActive'&&a.uid===null);
 assert.equal(opened.s.pending,null);
 assert.equal(host.stack.length,0);
 opened=open([card(raider),card(base)],{seed:151});
 const under=seat(opened.s,0,'RAID-BASE','energy',0,false);
 const incoming=hold(opened.s,'RAID-TOP');
 opened.s=act(opened.pack,opened.s,a=>a.type==='raid'&&a.uid===incoming.uid&&a.baseUid===under.uid);
 let pile=opened.s.players[0].front.find(c=>c?.cardId==='RAID-TOP');
 assert.equal(pile.stack[0].uid,under.uid);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseRaidBottomActive'&&a.uid===under.uid&&a.line==='front');
 pile=opened.s.players[0].front.find(c=>c?.cardId==='RAID-TOP');
 const entered=opened.s.players[0].front.find(c=>c?.uid===under.uid);
 assert.equal(entered.ready,true);
 assert.equal(pile.stack.length,0);
 assert.equal(opened.s.pending,null);
});
