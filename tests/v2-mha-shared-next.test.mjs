// Shared MHA operations. The cards that need them stay pending.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalBp,
 universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {UA10ST_PRODUCT} from '../dist/mha/ua10st-cards.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const tuck={op:'onceTuckFacedown',oncePerTurn:true,from:'deckTop',host:'self',count:1};
const pay={op:'payHandGrantImpact',oncePerTurn:true,pay:1,amount:1};
const damage={op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,
 then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]};
const mustBlock={op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,
 then:[{op:'grantSelfMustBlockThisTurn'}]};
const activateCount={kind:'ownActivateMainAtLeast',turn:'any',zone:'field',min:3};
const mill={op:'millUpToThenRecover',count:3,optional:true,recover:{
 zone:'outside',max:1,optional:true,excludeName:'オーバーホール',anyOf:[
  {field:'trait',value:'死穢八斎會'},{field:'name',value:'エリ'}]}};

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
 return createUniversalPack({id:'mha-next',version:'mha-next',cards:bodies});
}
function reject(body,pattern){
 const fillers=Array.from({length:12},(_,i)=>card({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000,effects:{}
 }));
 assert.throws(()=>createUniversalPack({id:'mha-next',version:'bad',cards:[card(body),...fillers]}),pattern);
}
function open(cards,{seed=16,phase='main'}={}){
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
 while(s.phase!==phase||s.active!==0){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase '+phase);
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function reach(pack,s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  assert.equal(assertUniversalMatch(pack,s),true);
  if(++guard>12)throw Error('stuck '+s.active+' '+s.phase);
 }
 return s;
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
function bury(s,host,id,p=0){
 const layer=pull(s,p,id);
 layer.faceDown=true;layer.ready=false;layer.stack=[];
 host.under??=[];
 host.under.push(layer);
 return layer;
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
function keepHand(s,ids,p=0){
 const kept=ids.map(id=>hold(s,id,p));
 s.players[p].deck.push(...s.players[p].hand.filter(c=>!kept.includes(c)));
 s.players[p].hand=kept;
 return kept;
}
function top(s,id,p=0){
 const body=pull(s,p,id);
 s.players[p].deck.unshift(body);
 return body;
}
function find(s,uid){
 const walk=c=>{
  if(!c)return null;
  if(c.uid===uid)return c;
  for(const child of [...(c.stack||[]),...(c.under||[])]){
   const hit=walk(child);if(hit)return hit;
  }
  return null;
 };
 for(const p of [0,1])for(const zone of ['front','energy','hand','deck','outside','removed','life'])
  for(const c of s.players[p][zone]||[]){const hit=walk(c);if(hit)return hit;}
 return null;
}
function silence(s,source,target){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:source.uid,targetUid:target.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
}

test('the shared shapes stay expressible and the MHA cards stay pending',()=>{
 assert.equal(getTitle('imc').playable,true);
 assert.equal(Object.keys(createImcV2Pack().cards).length,113);
 assert.equal(getTitle('mha').playable,false);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 const mha=createMhaV2Pack();
 assert.equal(Object.keys(mha.cards).length,94);
 for(const id of ['MHA-1-003','MHA-1-005','MHA-1-011','MHA-1-026','MHA-1-038','MHA-1-099','MHA-1-100'])
  assert.equal(mha.cards[id].id,id);
 for(const id of ['MHA-1-002','MHA-1-004','MHA-1-085','MHA-1-090'])
  assert.notEqual(mhaProgramFor(id)?.ready,true);
 shell([
  card({id:'M2',effects:{onPlay:[mill]},mainAbility:{op:'restRetireSequence',then:[
   {op:'recoverOutsideAny',zone:'outside',max:1,optional:true,anyOf:[
    {field:'trait',value:'死穢八斎會'},{field:'name',value:'エリ'}]}]}}),
  card({id:'M3',passiveBonuses:[{bp:1000,condition:activateCount}]}),
  card({id:'M5',ownTurnBp:2000,battleRequiresAnyName:['オール・フォー・ワン','死柄木 弔'],
   mainAbility:damage}),
  card({id:'M11',blockSkipsNextActive:true,mainAbility:mustBlock}),
  card({id:'M26',raidName:'オーバーホール',printedImpact:1,effects:{onPlay:[mill]}})
 ]);
});

test('a character copies same-line mains and keeps their payment, limit, and resolution',()=>{
 const copier=card({id:'COPY',mainAbility:{op:'gainSameLineMains',oncePerTurn:true,
  excludeNames:['オール・フォー・ワン']}});
 const source=card({id:'TUCK',mainAbility:tuck});
 const payer=card({id:'PAY',mainAbility:pay});
 const hitter=card({id:'HIT',mainAbility:damage});
 const excluded=card({id:'AFO',name:'オール・フォー・ワン',mainAbility:tuck});
 const side=card({id:'SIDE',mainAbility:tuck});
 const boxed=card({id:'BLC-1-004',raidName:'底',mainAbility:tuck});
 reject({id:'BAD-COPY',mainAbility:{op:'gainSameLineMains',oncePerTurn:false,
  excludeNames:['オール・フォー・ワン']}},/unsupported main action ability/);
 reject({id:'BAD-NAMES',mainAbility:{op:'gainSameLineMains',oncePerTurn:true,
  excludeNames:['オール・フォー・ワン','オール・フォー・ワン']}},/unsupported main action ability/);
 let opened=open([copier,source,payer,hitter,excluded,side,boxed]);
 const host=seat(opened.s,0,'COPY','front',0,true);
 const tucked=seat(opened.s,0,'TUCK','front',1,true);
 const paid=seat(opened.s,0,'PAY','front',2,true);
 const struck=seat(opened.s,0,'HIT','front',3,true);
 const named=seat(opened.s,0,'AFO','energy',0,true);
 const otherLine=seat(opened.s,0,'SIDE','energy',1,true);
 const hidden=seat(opened.s,0,'BLC-1-004','energy',2,true);
 opened.s=act(opened.pack,opened.s,{type:'activate',uid:host.uid,mode:'gainLineMains'});
 const copied=find(opened.s,host.uid);
 const items=copied.gainedMains.items.map(item=>item.sourceUid);
 assert.deepEqual(items.sort(),[tucked.uid,paid.uid,struck.uid].sort());
 assert.equal(items.includes(named.uid),false);
 assert.equal(items.includes(otherLine.uid),false);
 assert.equal(items.includes(hidden.uid),false);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.mode==='gainLineMains'),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'activate',uid:host.uid,mode:'gainLineMains'}),/not currently legal/);
 const marker=top(opened.s,'FILL-01');
 opened.s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===host.uid&&
  a.mode==='onceTuck'&&a.gained===tucked.uid);
 assert.equal(find(opened.s,host.uid).under.some(c=>c.uid===marker.uid&&c.faceDown===true),true);
 assert.equal(find(opened.s,tucked.uid).under?.some(c=>c.uid===marker.uid),false);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===host.uid&&a.gained===tucked.uid),false);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===tucked.uid&&a.mode==='onceTuck'),true);
 const handCard=opened.s.players[0].hand[0];
 opened.s=act(opened.pack,opened.s,a=>a.uid===host.uid&&a.mode==='payHandImpact'&&
  a.gained===paid.uid);
 opened.s=act(opened.pack,opened.s,{type:'choosePayHandImpact',uid:handCard.uid});
 assert.equal(find(opened.s,host.uid).impactGranted?.amount,1);
 assert.equal(find(opened.s,paid.uid).impactGranted,undefined);
 assert.equal(opened.s.players[0].outside.some(c=>c.uid===handCard.uid),true);
 opened.s=act(opened.pack,opened.s,a=>a.uid===host.uid&&a.mode==='frontOnce'&&
  a.gained===struck.uid);
 assert.equal(universalAttackDamage(opened.pack,opened.s,find(opened.s,host.uid)),2);
 assert.equal(opened.s.mainAbilityUsedUids.includes(struck.uid),false);
 seat(opened.s,1,'FILL-02','front',0,true);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.uid===struck.uid&&a.mode==='frontOnce'),true);
 const forged=open([copier,source]);
 const fake=seat(forged.s,0,'COPY','front',0,true);
 fake.gainedMains={turn:forged.s.turn,stamp:fake.fieldEntryStamp,items:[]};
 assert.throws(()=>assertUniversalMatch(forged.pack,forged.s),/Forged copied main/);
});

test('a copied main survives the source leaving, and an unpaid copy is not offered',()=>{
 const copier=card({id:'COPY',mainAbility:{op:'gainSameLineMains',oncePerTurn:true,
  excludeNames:['オール・フォー・ワン']}});
 const source=card({id:'TUCK',mainAbility:tuck});
 const payer=card({id:'PAY',mainAbility:pay});
 let left=open([copier,source]);
 const host=seat(left.s,0,'COPY','front',0,true);
 const tucked=seat(left.s,0,'TUCK','front',1,true);
 left.s=act(left.pack,left.s,{type:'activate',uid:host.uid,mode:'gainLineMains'});
 left.s.players[0].outside.push(left.s.players[0].front[1]);
 left.s.players[0].front[1]=null;
 const marker=top(left.s,'FILL-01');
 left.s=act(left.pack,left.s,a=>a.uid===host.uid&&a.gained===tucked.uid);
 assert.equal(find(left.s,host.uid).under.some(c=>c.uid===marker.uid),true);
 let unpaid=open([copier,payer]);
 const buyer=seat(unpaid.s,0,'COPY','front',0,true);
 const seller=seat(unpaid.s,0,'PAY','front',1,true);
 unpaid.s.players[0].deck.push(...unpaid.s.players[0].hand);
 unpaid.s.players[0].hand=[];
 unpaid.s=act(unpaid.pack,unpaid.s,{type:'activate',uid:buyer.uid,mode:'gainLineMains'});
 assert.equal(legal(unpaid.pack,unpaid.s).some(a=>a.mode==='payHandImpact'),false);
 assert.throws(()=>dispatchUniversalAction(unpaid.pack,unpaid.s,
  {type:'activate',uid:buyer.uid,mode:'payHandImpact',gained:seller.uid}),
  /not currently legal/);
 assert.equal(unpaid.s.mainAbilityUsedUids.includes(buyer.uid+'|gained|'+seller.uid),false);
 let gone=open([copier,payer]);
 const again=seat(gone.s,0,'COPY','front',0,true);
 const vendor=seat(gone.s,0,'PAY','front',1,true);
 const spent=gone.s.players[0].hand[0];
 gone.s=act(gone.pack,gone.s,{type:'activate',uid:again.uid,mode:'gainLineMains'});
 gone.s=act(gone.pack,gone.s,a=>a.uid===again.uid&&a.gained===vendor.uid);
 const away=gone.s.players[0].hand.findIndex(c=>c.uid===spent.uid);
 gone.s.players[0].deck.push(gone.s.players[0].hand.splice(away,1)[0]);
 assert.throws(()=>dispatchUniversalAction(gone.pack,gone.s,
  {type:'choosePayHandImpact',uid:spent.uid}),/not currently legal|Hand payment/);
 let quiet=open([copier,source]);
 const mutedHost=seat(quiet.s,0,'COPY','front',0,true);
 const muted=seat(quiet.s,0,'TUCK','front',1,true);
 silence(quiet.s,mutedHost,muted);
 quiet.s=act(quiet.pack,quiet.s,{type:'activate',uid:mutedHost.uid,mode:'gainLineMains'});
 assert.equal(find(quiet.s,mutedHost.uid).gainedMains.items.length,0);
 let raided=open([copier,boxedCard()]);
 const rider=seat(raided.s,0,'COPY','front',0,true);
 const raid=seat(raided.s,0,'BLC-1-004','front',1,true);
 const base=pull(raided.s,0,'FILL-01');
 base.faceDown=false;
 raid.stack=[base];
 raided.s=act(raided.pack,raided.s,{type:'activate',uid:rider.uid,mode:'gainLineMains'});
 assert.equal(find(raided.s,rider.uid).gainedMains.items.some(item=>item.sourceUid===raid.uid),true);
 function boxedCard(){return card({id:'BLC-1-004',raidName:'底',mainAbility:tuck});}
});

test('facedown counts grant an extra block at two and an extra attack at four',()=>{
 const wall=card({id:'WALL',bp:6000,facedownKeywordThresholds:[
  {atLeast:2,keyword:'doubleBlock'},{atLeast:4,keyword:'doubleAttack'}],mainAbility:tuck});
 const foe=card({id:'FOE',bp:1000,implementation:'vanilla',effects:{}});
 const layer=card({id:'LAYER',implementation:'vanilla',bp:500,effects:{}});
 reject({id:'BAD-WORD',facedownKeywordThresholds:[{atLeast:2,keyword:'haste'}]},
  /invalid facedown keyword threshold/);
 reject({id:'BAD-COUNT',facedownKeywordThresholds:[
  {atLeast:0,keyword:'doubleBlock'}]},/invalid facedown keyword threshold/);
 reject({id:'BAD-DUP',facedownKeywordThresholds:[
  {atLeast:2,keyword:'doubleBlock'},{atLeast:3,keyword:'doubleBlock'}]},
  /invalid facedown keyword threshold/);
 function attackReady(seed,layers){
  let opened=open([wall,foe,layer],{seed});
  const unit=seat(opened.s,0,'WALL','front',0,true);
  seat(opened.s,1,'FOE','front',0,true);
  for(let i=0;i<layers;i++)bury(opened.s,unit,'LAYER');
  opened.s=reach(opened.pack,opened.s,0,'attack');
  opened.s=act(opened.pack,opened.s,{type:'attack',uid:unit.uid});
  assert.equal(opened.s.pending.kind,'block');
  return find(opened.s,unit.uid).ready;
 }
 assert.equal(attackReady(21,4),true);
 assert.equal(attackReady(22,2),false);
 assert.equal(attackReady(23,1),false);
 let dropped=open([wall,foe,layer],{seed:24});
 const thinner=seat(dropped.s,0,'WALL','front',0,true);
 seat(dropped.s,1,'FOE','front',0,true);
 const layers=[];
 for(let i=0;i<4;i++)layers.push(bury(dropped.s,thinner,'LAYER'));
 dropped.s.players[0].outside.push(thinner.under.pop());
 dropped.s=reach(dropped.pack,dropped.s,0,'attack');
 dropped.s=act(dropped.pack,dropped.s,{type:'attack',uid:thinner.uid});
 assert.equal(find(dropped.s,thinner.uid).ready,false);
 let quiet=open([wall,foe,layer],{seed:25});
 const muted=seat(quiet.s,0,'WALL','front',0,true);
 seat(quiet.s,1,'FOE','front',0,true);
 for(let i=0;i<4;i++)bury(quiet.s,muted,'LAYER');
 silence(quiet.s,muted,muted);
 quiet.s=reach(quiet.pack,quiet.s,0,'attack');
 quiet.s=act(quiet.pack,quiet.s,{type:'attack',uid:muted.uid});
 assert.equal(find(quiet.s,muted.uid).ready,false);
 function blockedReady(seed,layers){
  let opened=open([wall,foe,layer],{seed});
  const unit=seat(opened.s,0,'WALL','front',0,true);
  const attacker=seat(opened.s,1,'FOE','front',0,true);
  for(let i=0;i<layers;i++)bury(opened.s,unit,'LAYER');
  opened.s=reach(opened.pack,opened.s,1,'attack');
  opened.s=act(opened.pack,opened.s,{type:'attack',uid:attacker.uid});
  opened.s=act(opened.pack,opened.s,{type:'chooseBlock',uid:unit.uid});
  const live=opened.s.players[0].front.find(c=>c?.uid===unit.uid);
  assert.ok(live);
  return live.ready;
 }
 assert.equal(blockedReady(26,2),true);
 assert.equal(blockedReady(27,4),true);
 assert.equal(blockedReady(28,1),false);
 let empty=open([wall],{seed:29});
 const dry=seat(empty.s,0,'WALL','front',0,true);
 empty.s.players[0].outside.push(...empty.s.players[0].deck);
 empty.s.players[0].deck=[];
 assert.equal(legal(empty.pack,empty.s).some(a=>a.uid===dry.uid&&a.mode==='onceTuck'),false);
 assert.throws(()=>dispatchUniversalAction(empty.pack,empty.s,
  {type:'activate',uid:dry.uid,mode:'onceTuck'}),/not currently legal/);
});

test('BP follows the number of facedown cards directly underneath',()=>{
 const unitCard=card({id:'SCALE',bp:2000,bpPerDirectFacedown:{amount:1000,turn:'own'}});
 const layer=card({id:'LAYER',implementation:'vanilla',bp:500,effects:{}});
 reject({id:'BAD-BP',bpPerDirectFacedown:{amount:1600,turn:'own'}},/invalid facedown BP/);
 reject({id:'BAD-TURN',bpPerDirectFacedown:{amount:1000,turn:'both'}},/invalid facedown BP/);
 let opened=open([unitCard,layer]);
 const host=seat(opened.s,0,'SCALE','front',0,true);
 assert.equal(universalBp(opened.pack,opened.s,host),2000);
 bury(opened.s,host,'LAYER');
 bury(opened.s,host,'LAYER');
 assert.equal(universalBp(opened.pack,opened.s,host),4000);
 const away=structuredClone(opened.s);
 away.active=1;
 assert.equal(universalBp(opened.pack,away,host),2000);
 const buried=pull(opened.s,0,'LAYER');
 buried.faceDown=true;
 host.stack=[buried];
 assert.equal(universalBp(opened.pack,opened.s,host),4000);
 const removed=host.under.pop();
 opened.s.players[0].outside.push(removed);
 assert.equal(universalBp(opened.pack,opened.s,host),3000);
 silence(opened.s,host,host);
 assert.equal(universalBp(opened.pack,opened.s,host),2000);
});

test('an attack can look at facedown cards, add one to hand, then activate someone else',()=>{
 const looker=card({id:'LOOK',effects:{onAttack:[{op:'lookUnderToHandThenActive',
  max:1,optional:true,excludeName:'ホークス'}]}});
 const hawk=card({id:'HAWK',name:'ホークス',implementation:'vanilla',effects:{}});
 const friend=card({id:'FRIEND',name:'其他',implementation:'vanilla',effects:{}});
 const layer=card({id:'LAYER',name:'底板',implementation:'vanilla',bp:500,effects:{}});
 const foe=card({id:'FOE',bp:3000,implementation:'vanilla',effects:{}});
 reject({id:'BAD-LOOK',effects:{onAttack:[{op:'lookUnderToHandThenActive',
  max:2,optional:true,excludeName:'ホークス'}]}},/invalid facedown look/);
 reject({id:'BAD-WHEN',effects:{onPlay:[{op:'lookUnderToHandThenActive',
  max:1,optional:true}]}},/facedown look is a character onAttack effect/);
 let opened=open([looker,hawk,friend,layer,foe],{seed:31});
 const host=seat(opened.s,0,'LOOK','front',0,true);
 const bird=seat(opened.s,0,'HAWK','front',1,false);
 const ally=seat(opened.s,0,'FRIEND','energy',0,false);
 const first=bury(opened.s,host,'LAYER');
 const second=bury(opened.s,host,'LAYER');
 seat(opened.s,1,'FOE','front',0,true);
 opened.s=reach(opened.pack,opened.s,0,'attack');
 opened.s=act(opened.pack,opened.s,{type:'attack',uid:host.uid});
 assert.equal(opened.s.pending.kind,'effect-look-under-hand');
 const mine=universalPrivateChoices(opened.pack,opened.s,0);
 assert.equal(mine.options.some(o=>o.card?.name==='底板'),true);
 assert.equal(universalPrivateChoices(opened.pack,opened.s,1),null);
 assert.equal(uiActionLabel({type:'chooseLookUnderHand',uid:null},
  {pack:opened.pack,state:opened.s}),'不加入手牌');
 const skipped=open([looker,layer,foe],{seed:32});
 const quiet=seat(skipped.s,0,'LOOK','front',0,true);
 bury(skipped.s,quiet,'LAYER');
 seat(skipped.s,1,'FOE','front',0,true);
 skipped.s=reach(skipped.pack,skipped.s,0,'attack');
 skipped.s=act(skipped.pack,skipped.s,{type:'attack',uid:quiet.uid});
 skipped.s=act(skipped.pack,skipped.s,{type:'chooseLookUnderHand',uid:null});
 assert.equal(find(skipped.s,quiet.uid).under.length,1);
 assert.equal(skipped.s.pending.kind,'block');
 opened.s=act(opened.pack,opened.s,{type:'chooseLookUnderHand',uid:first.uid});
 assert.equal(opened.s.players[0].hand.some(c=>c.uid===first.uid&&c.faceDown===false),true);
 assert.equal(find(opened.s,host.uid).under.some(c=>c.uid===second.uid),true);
 assert.equal(opened.s.pending.kind,'effect-active-character');
 assert.equal(opened.s.pending.choices.includes(ally.uid),true);
 assert.equal(opened.s.pending.choices.includes(bird.uid),false);
 assert.equal(opened.s.pending.choices.includes(host.uid),false);
 opened.s=act(opened.pack,opened.s,{type:'chooseActiveCharacter',uid:ally.uid});
 assert.equal(find(opened.s,ally.uid).ready,true);
 assert.equal(find(opened.s,bird.uid).ready,false);
 assert.equal(opened.s.pending.kind,'block');
 let alone=open([looker,layer,foe],{seed:33});
 const solo=seat(alone.s,0,'LOOK','front',0,true);
 const only=bury(alone.s,solo,'LAYER');
 seat(alone.s,1,'FOE','front',0,true);
 alone.s=reach(alone.pack,alone.s,0,'attack');
 alone.s=act(alone.pack,alone.s,{type:'attack',uid:solo.uid});
 alone.s=act(alone.pack,alone.s,{type:'chooseLookUnderHand',uid:only.uid});
 assert.equal(alone.s.players[0].hand.some(c=>c.uid===only.uid),true);
 assert.equal(alone.s.pending.kind,'block');
 let missing=open([looker,layer,foe],{seed:34});
 const loser=seat(missing.s,0,'LOOK','front',0,true);
 const gone=bury(missing.s,loser,'LAYER');
 seat(missing.s,1,'FOE','front',0,true);
 missing.s=reach(missing.pack,missing.s,0,'attack');
 missing.s=act(missing.pack,missing.s,{type:'attack',uid:loser.uid});
 const liveHost=find(missing.s,loser.uid);
 missing.s.players[0].deck.push(liveHost.under.pop());
 assert.throws(()=>dispatchUniversalAction(missing.pack,missing.s,
  {type:'chooseLookUnderHand',uid:gone.uid}),/not currently legal|Facedown layer left/);
 let bare=open([looker,foe],{seed:35});
 const empty=seat(bare.s,0,'LOOK','front',0,true);
 seat(bare.s,1,'FOE','front',0,true);
 bare.s=reach(bare.pack,bare.s,0,'attack');
 bare.s=act(bare.pack,bare.s,{type:'attack',uid:empty.uid});
 assert.equal(bare.s.pending.kind,'block');
});

test('the retirement ceiling follows the other cards still in hand',()=>{
 const event=card({id:'WIDE',type:'event',effects:{onPlay:[{op:'retireOppFrontUnderBp',
  bp:3000,handAtMost:{atMost:3,bp:5000,other:true}}]}});
 const low=card({id:'LOW',bp:2000,implementation:'vanilla',effects:{}});
 const mid=card({id:'MID',bp:4000,implementation:'vanilla',effects:{}});
 const high=card({id:'HIGH',bp:6000,implementation:'vanilla',effects:{}});
 const extra=card({id:'EXTRA',implementation:'vanilla',effects:{}});
 reject({id:'BAD-HAND',type:'event',effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,
  handAtMost:{atMost:8,bp:1600,other:true}}]}},/unsupported hand-count BP retirement/);
 reject({id:'BAD-OTHER',type:'event',effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,
  handAtMost:{atMost:3,bp:5000,other:false}}]}},/unsupported hand-count BP retirement/);
 let tight=open([event,low,mid,high,extra],{seed:41});
 const small=seat(tight.s,1,'LOW','front',0);
 const middle=seat(tight.s,1,'MID','front',1);
 const tall=seat(tight.s,1,'HIGH','front',2);
 keepHand(tight.s,['WIDE','FILL-01','FILL-02','FILL-03','FILL-04']);
 tight.s=act(tight.pack,tight.s,{type:'event',uid:tight.s.players[0].hand.find(c=>c.cardId==='WIDE').uid});
 assert.equal(tight.s.players[0].hand.length,4);
 assert.equal(tight.s.pending.kind,'effect-retire-bp');
 assert.equal(legal(tight.pack,tight.s).some(a=>a.uid===small.uid),true);
 assert.equal(legal(tight.pack,tight.s).some(a=>a.uid===middle.uid),false);
 assert.equal(legal(tight.pack,tight.s).some(a=>a.uid===tall.uid),false);
 const shed=tight.s.players[0].hand.pop();
 tight.s.players[0].deck.push(shed);
 assert.equal(assertUniversalMatch(tight.pack,tight.s),true);
 assert.equal(legal(tight.pack,tight.s).some(a=>a.uid===middle.uid),true);
 assert.equal(legal(tight.pack,tight.s).some(a=>a.uid===tall.uid),false);
 tight.s.players[0].hand.push(tight.s.players[0].deck.pop(),tight.s.players[0].deck.pop());
 assert.equal(legal(tight.pack,tight.s).some(a=>a.uid===middle.uid),false);
 let wide=open([event,low,mid,high,extra],{seed:42});
 const cheap=seat(wide.s,1,'LOW','front',0);
 const fair=seat(wide.s,1,'MID','front',1);
 const over=seat(wide.s,1,'HIGH','front',2);
 keepHand(wide.s,['WIDE','FILL-01','FILL-02','FILL-03']);
 wide.s=act(wide.pack,wide.s,{type:'event',uid:wide.s.players[0].hand.find(c=>c.cardId==='WIDE').uid});
 assert.equal(wide.s.players[0].hand.length,3);
 assert.equal(legal(wide.pack,wide.s).some(a=>a.uid===fair.uid),true);
 assert.equal(legal(wide.pack,wide.s).some(a=>a.uid===over.uid),false);
 wide.s.players[1].deck.push(wide.s.players[1].front[0]);
 wide.s.players[1].front[0]=null;
 assert.equal(legal(wide.pack,wide.s).some(a=>a.uid===cheap.uid),false);
 assert.throws(()=>dispatchUniversalAction(wide.pack,wide.s,
  {type:'chooseRetireBp',uid:cheap.uid}),/not currently legal|Illegal BP-threshold/);
 wide.s=act(wide.pack,wide.s,{type:'chooseRetireBp',uid:fair.uid});
 assert.equal(wide.s.players[1].front.some(c=>c?.uid===fair.uid),false);
});

test('milling can recover a trait or a named card and skip the excluded name',()=>{
 const miller=card({id:'MILL',effects:{onPlay:[mill]}});
 const trait=card({id:'TRAIT',traits:['死穢八斎會'],implementation:'vanilla',effects:{}});
 const named=card({id:'ERI',name:'エリ',implementation:'vanilla',effects:{}});
 const banned=card({id:'OVER',name:'オーバーホール',traits:['死穢八斎會'],
  implementation:'vanilla',effects:{}});
 let opened=open([miller,trait,named,banned]);
 const wanted=top(opened.s,'TRAIT');
 const person=opened.s.players[0].outside.length;
 opened.s.players[0].outside.push(pull(opened.s,0,'ERI'),pull(opened.s,0,'OVER'));
 const eri=opened.s.players[0].outside.at(-2);
 const over=opened.s.players[0].outside.at(-1);
 keepHand(opened.s,['MILL']);
 opened.s=act(opened.pack,opened.s,a=>a.type==='play'&&a.uid&&
  opened.s.players[0].hand.some(c=>c.uid===a.uid));
 assert.equal(opened.s.pending.kind,'effect-mill-optional');
 opened.s=act(opened.pack,opened.s,{type:'chooseMillOptional',mode:'mill'});
 opened.s=act(opened.pack,opened.s,{type:'chooseMillOptional',mode:'stop'});
 assert.equal(opened.s.pending.kind,'effect-recover-any');
 assert.equal(opened.s.pending.choices.includes(wanted.uid),true);
 assert.equal(opened.s.pending.choices.includes(eri.uid),true);
 assert.equal(opened.s.pending.choices.includes(over.uid),false);
 assert.equal(universalPrivateChoices(opened.pack,opened.s,1),null);
 assert.equal(person>=0,true);
 const slot=opened.s.players[0].outside.findIndex(c=>c.uid===eri.uid);
 opened.s.players[0].deck.push(opened.s.players[0].outside.splice(slot,1)[0]);
 assert.throws(()=>dispatchUniversalAction(opened.pack,opened.s,
  {type:'chooseRecoverAny',uid:eri.uid}),/not currently legal|Illegal/);
});
