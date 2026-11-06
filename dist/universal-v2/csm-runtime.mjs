// UA53BT チェンソーマン scripts. The engine passes zone helpers; this file
// does not import it. Printed 「まで」 includes zero. A name-once lock is
// spent only when that branch is chosen. Registration is not an official
// FAQ certification.
import {cardHasName,cardCountsAsEvent,usedOwnEventThisTurn} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';
import {raidBoxListed} from './raid-box.mjs';
import {csmDenjiRetiredThisTurn,csmEventUseCount,csmOnlyRezeHighBp,
 csmFacedowns,csmAlsoEventAuraLive,csmCardCountsAsEvent} from './csm-continuous.mjs';

const DENJI='デンジ';
const MAKIMA='マキマ';
const REZE='レゼ';
const POWER='パワー';
const AKI='早川アキ';
const AKI_NAME='早川 アキ';
const HIMENO='姫野';
const POCHITA='ポチタ';
const DATE='デート';
const CAFE='カフェ「二道」';
const HOUSE='早川家';
const DREAM='かわりに・・・デンジの夢を私に見せてくれ';

let A=null;
export function bindCsm(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return !originalEffectsDisabled(s,c);}
function named(pack,c,name,s){return cardHasName(def(pack,c),name,s?originalEffectsDisabled(s,c):false);}
function faceUpRaidCard(c,d){
 return !!(d?.raidName||d?.raidTrait)&&(c.stack||[]).some(x=>x&&x.faceDown!==true);
}
function raidLive(c,d,feature){
 return !raidBoxListed(d.id,feature)||faceUpRaidCard(c,d);
}
function isEvent(s,owner,physical){
 return csmCardCountsAsEvent(s,owner,def(A.pack,physical),x=>def(A.pack,x));
}
function hold(s,spec,actions){
 s.pending={kind:'csm',player:spec.player,sourceUid:spec.sourceUid,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function lock(s,owner,key){
 if(!s.mainReadyOnceByName[owner].includes(key))s.mainReadyOnceByName[owner].push(key);
}
function locked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function impact(s,c){if(c)c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function sniper(s,c){if(c)c.sniperGranted={turn:s.turn,stamp:c.fieldEntryStamp};}
function mustBlock(s,c){if(c)c.mustBlockGranted={turn:s.turn,stamp:c.fieldEntryStamp};}
function unblocked(s,c,bp){
 if(c)c.blockAtLeastGranted={turn:s.turn,stamp:c.fieldEntryStamp,bp};
}
function chars(s,owner,pred){
 return A.field(plOf(s,owner)).filter(c=>def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function fronts(s,owner,pred){
 return plOf(s,owner).front.filter(c=>c&&def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function locOf(s,owner,uid){return A.location(s,owner,uid);}
function selfOf(s,owner,uid){return locOf(s,owner,uid)?.c||null;}
function frontLine(s,owner,c){return !!c&&plOf(s,owner).front.some(x=>x?.uid===c.uid);}
function arm(pack){A.pack=pack;}
function go(pack,s){if(!s.pending)A.go(pack,s);}
function sig(a){
 return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,
  a?.replaceUid??null,a?.index??null,a?.hostUid??null]);
}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Chainsaw Man choice is not legal');
 return hit;
}
function moveUid(pack,s,owner,from,uid,to,sourceUid,reason='own-effect'){
 const index=plOf(s,owner)[from].findIndex(c=>c.uid===uid);
 if(index<0)throw Error('Chainsaw Man card left '+from);
 return A.move(pack,s,{owner,from,to,index,reason,sourceUid});
}
function ownCause(owner,sourceUid){
 return {by:'own',controller:owner,sourceUid};
}
function foeCause(controller,sourceUid){
 return {by:'opponent',controller,sourceUid};
}
function retireUid(pack,s,owner,uid,cause){
 const loc=locOf(s,owner,uid);
 if(!loc)return false;
 const spec=cause&&typeof cause==='object'?cause:{};
 return A.retire(pack,s,owner,loc.line,loc.slot,{
  ...(typeof spec.by==='string'?{by:spec.by}:{}),
  ...(Number.isInteger(spec.controller)?{controller:spec.controller}:{}),
  ...(typeof spec.sourceUid==='string'?{sourceUid:spec.sourceUid}:{})
 })===true;
}
// The leave trigger is queued in front of this follow-up. A pause keeps the
// follow-up on the pending until the chosen card actually leaves.
function retireThen(pack,s,owner,uid,cause,follow){
 const paused=retireUid(pack,s,owner,uid,cause);
 if(follow){
  if(Number.isInteger(s.openEffectScope)&&s.openEffectScope>0)
   follow.effectScope=s.openEffectScope;
  if(paused){if(s.pending)s.pending.csmFollow=follow;}
  else s.effectQueue.push(follow);
 }
 return paused;
}
// Q1898 / Q1899 (2026-01-09): BP that reaches 0 during an effect does not
// leave until that effect has finished, and only if it is still 0 then.
// The queue checkpoint applies Q94 and Q1139 with by:'rule'. Leaving here
// would drop the same effect's later sentences.
function debuffFront(pack,s,owner,uid,amount){
 const loc=locOf(s,owner,uid);
 if(!loc||loc.line!=='front')return false;
 buff(s,loc.c,amount);
 return false;
}
function restOwn(s,owner,c){
 if(!c?.ready)return false;
 A.noteRest(s,owner,c);
 c.ready=false;
 return true;
}
function publish(pack,s,owner,physical){
 const d=def(pack,physical);
 s.publicReveals.push({kind:'revealed-window',owner,title:A.title(pack,owner),
  cardId:physical.cardId,uid:physical.uid,trigger:d.trigger||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
 A.reveal(pack,s,owner,physical);
}
function lay(pl,uids,rest){
 const present=uids.filter(uid=>pl.deck.some(c=>c.uid===uid));
 if(!present.length)return;
 const set=new Set(present);
 const ordered=present.map(uid=>pl.deck.find(c=>c.uid===uid));
 const kept=pl.deck.filter(c=>!set.has(c.uid));
 pl.deck=rest==='bottom'?[...kept,...ordered.slice().reverse()]:[...ordered,...kept];
}
function offerOrder(s,spec,uids,rest){
 const left=uids.filter(Boolean);
 if(left.length<=1){lay(plOf(s,spec.player),left,rest);return false;}
 hold(s,{...spec,step:'lookOrder',data:{...(spec.data||{}),left,built:[],rest}},
  left.map(uid=>({type:'csm',mode:'next',uid})));
 return true;
}
function windowCards(s,owner,n){
 return plOf(s,owner).deck.slice(0,Math.min(n,plOf(s,owner).deck.length));
}
function beginLook(pack,s,job,spec){
 const window=windowCards(s,job.owner,spec.count);
 if(!window.length)return;
 const matches=window.filter(c=>spec.pred(def(pack,c)));
 const data={window:window.map(c=>c.uid),rest:spec.rest,dest:spec.dest,
  public:spec.public===true,discard:spec.discard===true,follow:spec.follow||null};
 if(!matches.length&&job.id!=='CSM-1-055'){offerOrder(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,data},
  data.window,spec.rest);return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'lookPick',data},[
  {type:'csm',mode:'skip'},...matches.map(c=>({type:'csm',mode:'take',uid:c.uid}))]);
}
function finishLookTake(pack,s,q,a){
 const data=q.data;
 const rest=data.window.filter(uid=>uid!==(a.mode==='take'?a.uid:null));
 let taken=null;
 if(a.mode==='take'){
  moveUid(pack,s,q.player,'deck',a.uid,data.dest,q.sourceUid);
  taken=plOf(s,q.player).hand.find(c=>c.uid===a.uid)||
   plOf(s,q.player).outside.find(c=>c.uid===a.uid)||null;
  if(data.public&&taken)publish(pack,s,q.player,taken);
 }
 if(q.id==='CSM-1-008'){
  if(a.mode==='take'&&taken){
   q.data.takenUid=taken.uid;
   q.data.takenCardId=taken.cardId;
  }
  if(!offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:q.data},rest,data.rest)&&
   q.data.takenUid)continue008(pack,s,q);
  return;
 }
 if(data.discard&&a.mode==='take'){
  const hand=plOf(s,q.player).hand.filter(c=>c.uid!==a.uid);
  if(hand.length){
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'discard',
    data:{...data,left:rest,takenUid:a.uid,takenName:taken?def(pack,taken).name:null}},
    hand.map(c=>({type:'csm',mode:'discard',uid:c.uid})));
   return;
  }
 }
 if(q.id==='CSM-1-055'&&a.mode==='skip'){
  const drawData={...data,drawIfSkipped:true};
  if(!offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:drawData},rest,data.rest))
   A.draw(pack,s,q.player,1,q.sourceUid);
  return;
 }
 if(data.follow&&a.mode==='take'&&taken)
  afterLookFollow(pack,s,q,taken,rest);
 else offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data},rest,data.rest);
}
function afterLookFollow(pack,s,q,taken,rest){
 const name=def(pack,taken).name;
 const aliases=def(pack,taken).nameAliases||[];
 const is=(n)=>name===n||aliases.includes(n)||cardHasName(def(pack,taken),n,false);
 if(q.id==='CSM-1-008'){
  if(is(MAKIMA)){
   const pool=chars(s,q.player,c=>c.uid!==q.sourceUid);
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'buffOther',
    data:{...q.data,left:rest}},[
    {type:'csm',mode:'skip'},...pool.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
   return;
  }
  if(is(REZE)){
   const foe=fronts(s,1-q.player,c=>A.bp(pack,s,c)>=1500);
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'debuff',
    data:{...q.data,left:rest}},[
    {type:'csm',mode:'skip'},...foe.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
   return;
  }
 }
 // Printed order is reveal to hand, arrange the rest, then the follow-up.
 // 033 may put the card just added outside. 035's outside add is optional.
 if(q.id==='CSM-1-035'&&(is(MAKIMA)||is(REZE))){
  q.data.takenUid=taken.uid;
  scheduleOrderThen(s,q,rest,'follow035');
  return;
 }
 if(q.id==='CSM-1-033'&&!is(REZE)){
  q.data.takenUid=taken.uid;
  scheduleOrderThen(s,q,rest,'discard033');
  return;
 }
 offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:q.data},rest,q.data.rest);
}
function scheduleOrderThen(s,q,rest,kind){
 q.data={...q.data,afterOrder:kind};
 const opened=offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:q.data},
  rest,q.data.rest);
 if(!opened)runAfterOrder(s,q);
}
function runAfterOrder(s,q){
 if(q.data?.afterOrder==='discard033'){
  const hand=plOf(s,q.player).hand;
  if(!hand.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'discard'},
   hand.map(c=>({type:'csm',mode:'discard',uid:c.uid})));
  return;
 }
 if(q.data?.afterOrder==='follow035')offer035Follow(s,q);
}
function offer035Follow(s,q){
 const taken=plOf(s,q.player).hand.find(c=>c.uid===q.data?.takenUid);
 if(!taken)return;
 let pool=[];
 if(named(A.pack,taken,MAKIMA,s))
  pool=plOf(s,q.player).outside.filter(c=>named(A.pack,c,DATE,s));
 else if(named(A.pack,taken,REZE,s))
  pool=plOf(s,q.player).outside.filter(c=>named(A.pack,c,DENJI,s)&&
   def(A.pack,c).energy<=1);
 if(!pool.length)return;
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'recover'},[
  {type:'csm',mode:'skip'},...pool.map(c=>({type:'csm',mode:'take',uid:c.uid}))]);
}
function finishOrder(s,q,a){
 const left=q.data.left.filter(uid=>uid!==a.uid);
 const built=[...q.data.built,a.uid];
 if(left.length<=1){
  lay(plOf(s,q.player),[...built,...left],q.data.rest);
  if(q.data.drawIfSkipped)A.draw(A.pack,s,q.player,1,q.sourceUid);
  if(q.id==='CSM-1-008'&&q.data.takenUid)continue008(A.pack,s,q);
  else if(q.data.afterOrder)runAfterOrder(s,q);
  return;
 }
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'lookOrder',
  data:{...q.data,left,built}},left.map(uid=>({type:'csm',mode:'next',uid})));
}
function destinations(s,owner,c,lines){
 const d=def(A.pack,c),pl=plOf(s,owner),actions=[];
 for(const line of lines||['front','energy']){
  // Fields and frontForbidden prints never list a front cell (Q2082 / Q2098).
  if(line==='front'&&(d.frontForbidden||d.type==='field'))continue;
  for(const dest of A.destinations(pl,line)){
   const action={type:'csm',mode:'deploy',uid:c.uid,line,slot:dest.slot};
   if(dest.replaceUid)action.replaceUid=dest.replaceUid;
   actions.push(action);
  }
 }
 return actions;
}
function energyCharsToFront(pack,s,owner){
 return plOf(s,owner).energy.filter(c=>c&&def(pack,c).type==='character'&&
  !def(pack,c).frontForbidden);
}
function offerDeploy(s,spec,cards,opts){
 const lines=opts?.lines||['front','energy'];
 const actions=cards.flatMap(c=>destinations(s,spec.player,c,lines));
 if(!actions.length)return false;
 hold(s,{...spec,step:'deploy',data:{...(spec.data||{}),from:opts?.from||'hand',
  ready:opts?.ready===true,skipOnPlay:opts?.skipOnPlay===true}},
  [...(opts?.optional===false?[]:[{type:'csm',mode:'skip'}]),...actions]);
 return true;
}
function offerHand(s,spec,optional){
 const hand=plOf(s,spec.player).hand;
 if(!hand.length)return false;
 hold(s,{...spec,step:'discard'},[
  ...(optional?[{type:'csm',mode:'skip'}]:[]),
  ...hand.map(c=>({type:'csm',mode:'discard',uid:c.uid}))]);
 return true;
}
function offerFront(s,spec,owner,pred,optional,step){
 const pool=fronts(s,owner,pred);
 if(!pool.length)return false;
 hold(s,{...spec,step},[
  ...(optional?[{type:'csm',mode:'skip'}]:[]),
  ...pool.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
 return true;
}
function offerChars(s,spec,pred,optional,step){
 const pool=chars(s,spec.player,pred);
 if(!pool.length)return false;
 hold(s,{...spec,step},[
  ...(optional?[{type:'csm',mode:'skip'}]:[]),
  ...pool.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
 return true;
}
function apChoices(s,owner){
 const actions=[];
 plOf(s,owner).apCards.forEach((c,index)=>{
  if(c.inPlay&&!c.ready)actions.push({type:'csm',mode:'ap',index});
 });
 return actions;
}
function readyIndex(s,owner,index){
 const c=plOf(s,owner).apCards[index];
 if(c?.inPlay)c.ready=true;
}
function offerAp(s,spec,optional){
 const actions=apChoices(s,spec.player);
 if(!actions.length)return false;
 if(actions.length===1&&!optional){readyIndex(s,spec.player,actions[0].index);return false;}
 hold(s,{...spec,step:'ap'},[
  ...(optional?[{type:'csm',mode:'skip'}]:[]),...actions]);
 return true;
}
function tuck(pack,s,owner,from,uid,host,sourceUid){
 const pl=plOf(s,owner);
 const index=pl[from].findIndex(c=>c.uid===uid);
 if(index<0||!host)throw Error('Chainsaw Man tuck lost a card');
 const physical=pl[from].splice(index,1)[0];
 physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
 host.under??=[];host.under.push(physical);
 A.record(pack,s,{physical,owner,from,to:'raid-under',reason:'own-effect',sourceUid:host.uid});
}
function facedownContainer(host,uid){
 if(!host)return null;
 if((host.under||[]).some(c=>c?.uid===uid&&c.faceDown===true))return host;
 for(const base of host.stack||[]){
  const found=facedownContainer(base,uid);
  if(found)return found;
 }
 return null;
}
function peelFacedownUid(pack,s,owner,host,uid,to,sourceUid){
 // A facedown directly under a Raid base is also under the face-up Raid top.
 // Detach the real physical card from its owning under[] container.
 const container=facedownContainer(host,uid);
 if(!container)return null;
 const physical=container.under.find(c=>c.uid===uid);
 container.under=container.under.filter(c=>c.uid!==physical.uid);
 physical.faceDown=false;
 if(to==='hand')plOf(s,owner).hand.push(physical);
 else if(to==='outside')plOf(s,owner).outside.push(physical);
 A.record(pack,s,{physical,owner,from:'raid-under',to,reason:'own-effect',
  sourceUid,attachedToUid:host.uid,wasFaceDown:true});
 return physical;
}
function peelFacedown(pack,s,owner,host,to,sourceUid){
 const under=csmFacedowns(host);
 if(!under.length)return null;
 return peelFacedownUid(pack,s,owner,host,under[under.length-1].uid,to,sourceUid);
}
function offerPeelUnder(s,spec,host,to,follow){
 const unders=csmFacedowns(host);
 if(!unders.length)return false;
 if(unders.length===1)return false;
 hold(s,{...spec,step:'peelUnder',data:{...(spec.data||{}),hostUid:host.uid,to,follow}},
  unders.map(c=>({type:'csm',mode:'peel',uid:c.uid,hostUid:host.uid})));
 return true;
}
function nameOn(s,owner,name){return chars(s,owner,c=>named(A.pack,c,name,s)).length>0;}
function eventsUsed(s,owner){
 return csmEventUseCount(s,owner,c=>def(A.pack,c));
}
function otherEventsUsed(s,owner,exceptUid){
 // Q2080: count event identity when used, including purple characters
 // played under Makima's live aura, never retroactively.
 return csmEventUseCount(s,owner,c=>def(A.pack,c),exceptUid);
}

function runPlay(pack,s,job){
 const id=job.id,owner=job.owner,spec={player:owner,sourceUid:job.sourceUid,id};
 if(id==='CSM-1-008')return beginLook(pack,s,job,{count:3,rest:'bottom',dest:'hand',
  public:true,discard:true,follow:true,pred:d=>d.type==='character'});
 if(id==='CSM-1-016'){
  if(!csmOnlyRezeHighBp(pack,s,owner,A.card,c=>A.bp(pack,s,c)))return;
  offerChars(s,spec,c=>c.uid!==job.sourceUid,true,'retireThenKit');
  return;
 }
 if(id==='CSM-1-017'){
  hold(s,{...spec,step:'choose'},[
   {type:'csm',mode:'debuff'},
   ...(s.active===owner&&csmOnlyRezeHighBp(pack,s,owner,A.card,c=>A.bp(pack,s,c))?
    [{type:'csm',mode:'reze'}]:[])]);
  return;
 }
 if(id==='CSM-1-021'||id==='CSM-1-057'){
  const n=id==='CSM-1-021'?3:2;
  const window=windowCards(s,owner,n);
  if(!window.length)return;
  const data={window:window.map(c=>c.uid)};
  hold(s,{...spec,step:'millOne',data},[
   {type:'csm',mode:'skip'},...window.map(c=>({type:'csm',mode:'outside',uid:c.uid}))]);
  return;
 }
 if(id==='CSM-1-024'){
  hold(s,{...spec,step:'choose'},[
   {type:'csm',mode:'draw'},{type:'csm',mode:'buff'}]);
  return;
 }
 if(id==='CSM-1-028'){
  // Q2082: Café「二道」 is a field — energy line only; never front.
  const cards=plOf(s,owner).hand.filter(c=>{
   const d=def(pack,c);
   if(d.energy>2||d.ap!==1||d.color!=='purple')return false;
   if(d.type==='field')return d.name===CAFE;
   return d.type==='character'&&(named(pack,c,REZE,s)||named(pack,c,DENJI,s));
  });
  const actions=cards.flatMap(c=>{
   const lines=def(pack,c).type==='field'?['energy']:['front','energy'];
   return destinations(s,owner,c,lines);
  });
  if(!actions.length)return;
  hold(s,{...spec,step:'deploy',data:{from:'hand',ready:false}},[
   {type:'csm',mode:'skip'},...actions]);
  return;
 }
 if(id==='CSM-1-030'){
  offerChars(s,spec,c=>c.uid!==job.sourceUid,true,'retireThenChoose');
  return;
 }
 if(id==='CSM-1-031'){
  hold(s,{...spec,step:'choose'},[
   {type:'csm',mode:'debuff'},
   ...(s.active===owner&&csmDenjiRetiredThisTurn(s,owner,c=>def(pack,c))&&
    !locked(s,owner,'rezeAp')?[{type:'csm',mode:'ap'}]:[])]);
  return;
 }
 if(id==='CSM-1-032'){
  if(!nameOn(s,owner,MAKIMA))return;
  const cards=plOf(s,owner).outside.filter(c=>{
   const d=def(pack,c);
   return d.energy<=3&&(named(pack,c,DENJI,s)||named(pack,c,DATE,s));
  });
  if(!cards.length)return;
  hold(s,{...spec,step:'recover'},[
   {type:'csm',mode:'skip'},...cards.map(c=>({type:'csm',mode:'take',uid:c.uid}))]);
  return;
 }
 if(id==='CSM-1-033')return beginLook(pack,s,job,{count:3,rest:'bottom',dest:'hand',
  public:true,discard:false,follow:true,pred:d=>d.type==='character'});
 if(id==='CSM-1-035')return beginLook(pack,s,job,{count:6,rest:'bottom',dest:'hand',
  public:true,discard:false,follow:true,pred:d=>d.type==='character'});
 if(id==='CSM-1-037'){
  // The BP line must choose a character. The draw line is the name-once branch.
  const actions=[
   ...(chars(s,owner).length?[{type:'csm',mode:'aura'}]:[]),
   ...(!locked(s,owner,'dateDraw')?[{type:'csm',mode:'draw'}]:[])];
  if(actions.length)hold(s,{...spec,step:'choose'},actions);
  return;
 }
 if(id==='CSM-1-038'){
  const pool=chars(s,owner);
  if(!pool.length)return;
  hold(s,{...spec,step:'retireOwn'},pool.map(c=>({type:'csm',mode:'pick',uid:c.uid})));
  return;
 }
 if(id==='CSM-1-040'){
  const cap=5000;
  const foe=fronts(s,1-owner,c=>A.bp(pack,s,c)<=cap);
  // The BP+1000 sentence is not 「そうした場合」. A missing retire target
  // still opens it when another event was used this turn. Leave replacement
  // stays needsLeave:false on the retire path.
  const thenBuff=otherEventsUsed(s,owner,job.sourceUid)>0;
  if(!foe.length){
   if(thenBuff)offerChars(s,spec,null,true,'buffOther');
   return;
  }
  hold(s,{...spec,step:'retireFoe',data:{thenBuff}},
   foe.map(c=>({type:'csm',mode:'pick',uid:c.uid})));
  return;
 }
 if(id==='CSM-1-051'){
  const window=windowCards(s,owner,2);
  if(!window.length){offerTuckUnderDenji(pack,s,spec);return;}
  const data={window:window.map(c=>c.uid),kept:[],rest:'top'};
  hold(s,{...spec,step:'arrange',data},[
   {type:'csm',mode:'done'},
   ...window.map(c=>({type:'csm',mode:'keep',uid:c.uid})),
   ...window.map(c=>({type:'csm',mode:'outside',uid:c.uid}))]);
  return;
 }
 if(id==='CSM-1-054'){
  if(!nameOn(s,owner,HIMENO))return;
  A.draw(pack,s,owner,1,job.sourceUid);
  const hand=plOf(s,owner).hand;
  const self=selfOf(s,owner,job.sourceUid);
  if(!hand.length||!self)return;
  hold(s,{...spec,step:'tuckHand'},hand.map(c=>({type:'csm',mode:'card',uid:c.uid})));
  return;
 }
 if(id==='CSM-1-056'){
  const self=selfOf(s,owner,job.sourceUid);
  if(self)buff(s,self,1000);
  const top=plOf(s,owner).deck.splice(0,Math.min(3,plOf(s,owner).deck.length));
  if(self)for(const c of top){
   c.faceDown=true;c.ready=false;c.fieldEntryStamp=null;
   self.under??=[];self.under.push(c);
   A.record(pack,s,{physical:c,owner,from:'deck',to:'raid-under',reason:'own-effect',
    sourceUid:self.uid});
  }
  return;
 }
 if(id==='CSM-1-061'){
  if(!nameOn(s,owner,DENJI))return;
  const self=selfOf(s,owner,job.sourceUid);
  if(self){buff(s,self,1000);mustBlock(s,self);}
  return;
 }
 if(id==='CSM-1-066')return; // draw already queued by shared op
 if(id==='CSM-1-075'){
  const pool=chars(s,owner);
  if(!pool.length)return;
  hold(s,{...spec,step:'buffThenPeel'},pool.map(c=>({type:'csm',mode:'pick',uid:c.uid})));
  return;
 }
 if(id==='CSM-1-076'){
  hold(s,{...spec,step:'choose'},[
   {type:'csm',mode:'look'},{type:'csm',mode:'tuck'}]);
  return;
 }
 if(id==='CSM-1-077'){
  const foe=fronts(s,1-owner,c=>A.bp(pack,s,c)<=5000);
  if(!foe.length)return;
  hold(s,{...spec,step:'retireFoe',data:{peelAki:true}},
   foe.map(c=>({type:'csm',mode:'pick',uid:c.uid})));
  return;
 }
 if(id==='CSM-1-078'){
  const extra=nameOn(s,owner,HOUSE)||chars(s,owner,c=>named(pack,c,DENJI,s)&&
   csmFacedowns(c).length>0).length>0;
  A.draw(pack,s,owner,extra?3:2,job.sourceUid);
 }
}
function continue008(pack,s,q){
 if(q.data?.handDone){offer008Follow(pack,s,q);return;}
 const hand=plOf(s,q.player).hand;
 if(!hand.length){offer008Follow(pack,s,q);return;}
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'discard',
  data:{...q.data,left:null,handThenFollow:true}},
  hand.map(c=>({type:'csm',mode:'discard',uid:c.uid})));
}
function offer008Follow(pack,s,q){
 const id=q.data?.takenCardId;
 if(!id)return;
 afterLookFollow(pack,s,{...q,data:{...q.data,left:null,handDone:true}},
  {uid:q.data.takenUid,cardId:id},null);
}
function offerTuckUnderDenji(pack,s,spec){
 const hosts=chars(s,spec.player,c=>{
  const d=def(pack,c);
  return named(pack,c,DENJI,s)&&!((c.stack||[]).some(x=>x&&x.faceDown!==true))&&
   !csmFacedowns(c).length;
 });
 const outs=plOf(s,spec.player).outside.filter(c=>named(pack,c,POCHITA,s)||
  def(pack,c).name===DREAM||def(pack,c).id==='CSM-1-076');
 if(!hosts.length||!outs.length)return false;
 hold(s,{...spec,step:'tuckCard',data:{hosts:hosts.map(c=>c.uid)}},[
  {type:'csm',mode:'skip'},...outs.map(c=>({type:'csm',mode:'card',uid:c.uid}))]);
 return true;
}

function runRetire(pack,s,job){
 const id=job.id,owner=job.owner,spec={player:owner,sourceUid:job.sourceUid,id};
 if(id==='CSM-1-006'){
  // Printed: the look replaces the draw only when this character left by
  // its controller's own effect. A missing cause is not that evidence.
  // Q1139: BP 0 is a rule leave. Battle and an opponent effect draw 1.
  const byOwn=job.by==='own'&&job.retireController===owner&&
   typeof job.retireSourceUid==='string';
  if(byOwn){
   hold(s,{...spec,step:'choose'},[
    {type:'csm',mode:'draw'},{type:'csm',mode:'look'}]);
   return;
  }
  A.draw(pack,s,owner,1,job.sourceUid);
  return;
 }
 if(id==='CSM-1-047'){
  hold(s,{...spec,step:'choose',data:{hadFacedown:job.hadFacedown===true||
   (job.facedownCount||0)>0}},[
   {type:'csm',mode:'draw'},
   ...((job.hadFacedown||(job.facedownCount||0)>0)?[{type:'csm',mode:'reenter'}]:[])]);
  return;
 }
 if(id==='CSM-1-066'){
  const high=[...chars(s,owner),...plOf(s,owner).outside].some(c=>
   def(pack,c).type==='character'&&Number.isInteger(def(pack,c).bp)&&def(pack,c).bp>=4500);
  if(high)return;
  // Q2098: Pochita frontForbidden must not be offered for energy→front.
  const energy=energyCharsToFront(pack,s,owner);
  if(!energy.length)return;
  hold(s,{...spec,step:'buffMoveFront'},[
   {type:'csm',mode:'skip'},...energy.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
  return;
 }
 if(id==='CSM-1-068'){
  const chars2=plOf(s,owner).hand.filter(c=>def(pack,c).type==='character');
  // Purple characters also count as events while the 4/1 Makima aura is live.
   const events=plOf(s,owner).hand.filter(c=>isEvent(s,owner,c));
  const actions=[{type:'csm',mode:'skip'}];
  if(events.length)actions.push(...events.map(c=>({type:'csm',mode:'event',uid:c.uid})));
  if(chars2.length>=2)actions.push(...chars2.map(c=>({type:'csm',mode:'char',uid:c.uid})));
  if(actions.length===1)return;
  hold(s,{...spec,step:'payReturn',data:{picked:[]}},actions);
 }
}

function runAttack(pack,s,job){
 const id=job.id,owner=job.owner,self=selfOf(s,owner,job.sourceUid);
 if(id==='CSM-1-013'){
  if(nameOn(s,owner,DENJI)&&self)buff(s,self,500);
  return;
 }
 if(id==='CSM-1-054'){
  const hosts=fronts(s,owner,c=>named(pack,c,AKI,s)&&csmFacedowns(c).length);
  if(!hosts.length)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'peelBuff'},[
   {type:'csm',mode:'skip'},...hosts.flatMap(h=>csmFacedowns(h).map(c=>({
    type:'csm',mode:'peel',uid:c.uid,hostUid:h.uid})))]);
  return;
 }
 if(id==='CSM-1-070'){
  const pool=chars(s,owner,c=>!named(pack,c,MAKIMA,s));
  if(!pool.length)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'retireOwn'},
   pool.map(c=>({type:'csm',mode:'pick',uid:c.uid})));
  return;
 }
 if(id==='CSM-1-072'){
  const moved=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===job.sourceUid&&
   e.owner===owner&&((e.from==='front'&&e.to==='energy')||(e.from==='energy'&&e.to==='front'))&&
   e.reason!=='move-phase');
  // Move-phase moves are tagged; approximate: any front<->energy this turn
  // outside the move phase stamp stored on the physical card.
  const movedAny=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===job.sourceUid&&
   e.owner===owner&&((e.from==='front'&&e.to==='energy')||(e.from==='energy'&&e.to==='front')));
  if(!(moved||(movedAny&&self?.csmMovedOutsideMove===s.turn)))return;
  const cards=plOf(s,owner).outside.filter(c=>named(pack,c,AKI,s)&&def(pack,c).energy<=2);
  if(!cards.length)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'recover'},[
   {type:'csm',mode:'skip'},...cards.map(c=>({type:'csm',mode:'take',uid:c.uid}))]);
 }
}

function runAfterOwnRetire(pack,s,job){
 const owner=job.owner,spec={player:owner,sourceUid:job.sourceUid,id:job.id};
 if(job.kind==='kit016'){
  const self=selfOf(s,owner,job.sourceUid);
  if(self){A.active(s,owner,self);buff(s,self,1000);impact(s,self);}
  offerAp(s,spec,false);
 }else if(job.kind==='denjiImpact'){
  const pool=chars(s,owner,x=>named(pack,x,DENJI,s));
  hold(s,{...spec,step:'buffImpact'},[
   {type:'csm',mode:'skip'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
 }else if(job.kind==='grantAttackDraw'){
  const pool=chars(s,owner,x=>named(pack,x,DENJI,s));
  hold(s,{...spec,step:'grantAttackDraw'},[
   {type:'csm',mode:'skip'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
 }else if(job.kind==='denjiEnergy'){
  const outs=plOf(s,owner).outside.filter(x=>named(pack,x,DENJI,s)&&
   def(pack,x).color==='red'&&def(pack,x).energy<=1);
  if(!outs.length)return;
  hold(s,{...spec,step:'denjiEnergy',data:{pochitaUid:job.pochitaUid||null}},[
   {type:'csm',mode:'skip'},...outs.map(x=>({type:'csm',mode:'deploy',uid:x.uid}))]);
 }else if(job.kind==='debuff5k'){
  offerFront(s,spec,1-owner,null,true,'debuff5k');
 }else if(job.kind==='choose12'){
  hold(s,{...spec,step:'afterRetireChoose'},[
   {type:'csm',mode:'one'},{type:'csm',mode:'two'}]);
 }else if(job.kind==='ap038'){
  // Activating an AP does not gate the draw. Zero or one rested AP resolves
  // immediately; two or more wait for the choice, which then draws.
  if(!offerAp(s,{...spec,data:{next:'draw2'}},false))
   A.draw(pack,s,owner,2,job.sourceUid);
 }
}
function runAfterFoeRetire(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id,data:{}};
 if(job.thenBuff)offerChars(s,spec,null,true,'buffOther');
 if(job.peelAki)offerPeelAki(pack,s,spec);
}
export function runCsmJob(pack,s,job){
 arm(pack);
 if(job.slot==='onPlay'||job.slot==='after')runPlay(pack,s,job);
 else if(job.slot==='onRetire')runRetire(pack,s,job);
 else if(job.slot==='afterOwnRetire')runAfterOwnRetire(pack,s,job);
 else if(job.slot==='afterFoeRetire')runAfterFoeRetire(pack,s,job);
 else if(job.slot==='onAttack')runAttack(pack,s,job);
 else if(job.slot==='unblocked'){
  if(csmDenjiRetiredThisTurn(s,job.owner,c=>def(pack,c)))
   A.draw(pack,s,job.owner,1,job.sourceUid);
 }else if(job.slot==='win'){
  offerHand(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},false);
 }else if(job.slot==='attackEnd'){
  runAttackEnd(pack,s,job);
 }else if(job.slot==='endStart'){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(job.id==='CSM-1-066'&&self&&frontLine(s,job.owner,self)){
   const frontsPool=fronts(s,job.owner,c=>c.uid!==self.uid&&!named(pack,c,HIMENO,s));
   // Q2098: exclude frontForbidden (Pochita) from energy↔front swap pool.
   const energyPool=energyCharsToFront(pack,s,job.owner);
   if(frontsPool.length&&energyPool.length){
    hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'himenoSwap',
     data:{fronts:frontsPool.map(c=>c.uid),energies:energyPool.map(c=>c.uid)}},[
     {type:'csm',mode:'skip'},
     ...frontsPool.map(c=>({type:'csm',mode:'front',uid:c.uid}))]);
   }
  }
 }else if(job.slot==='moved'){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(self){unblocked(s,self,4000);self.csmUnblockedDraw=s.turn;self.csmMovedOutsideMove=s.turn;}
 }else if(job.slot==='mayDraw'){
  if(plOf(s,job.owner).deck.length)hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,
   step:'mayDraw'},[{type:'csm',mode:'skip'},{type:'csm',mode:'draw'}]);
 }
 go(pack,s);
}

function runAttackEnd(pack,s,job){
 const owner=job.owner,self=selfOf(s,owner,job.sourceUid);
 if(job.id==='CSM-1-048'&&self&&csmFacedowns(self).length){
  A.active(s,owner,self);
  impact(s,self);
  // Q2088/Q2089: controller chooses which facedown under to peel.
  if(offerPeelUnder(s,{player:owner,sourceUid:job.sourceUid,id:job.id},self,'outside','pochita'))
   return;
  const peeled=peelFacedown(pack,s,owner,self,'outside',job.sourceUid);
  if(peeled&&named(pack,peeled,POCHITA,s)){
   hold(s,{player:owner,sourceUid:job.sourceUid,id:job.id,step:'pochita',
    data:{uid:peeled.uid}},[
    {type:'csm',mode:'skip'},{type:'csm',mode:'deploy',uid:peeled.uid}]);
  }
  return;
 }
 if(job.id==='CSM-1-066'&&self){
  hold(s,{player:owner,sourceUid:job.sourceUid,id:job.id,step:'mayRetire'},[
   {type:'csm',mode:'skip'},{type:'csm',mode:'retire'}]);
 }
}

export function legalCsmActivations(pack,s,owner,c){
 arm(pack);
 if(s.phase!=='main'||s.active!==owner||!live(s,c))return [];
 const d=def(pack,c);
 if(d.mainAbility?.op!=='csmMain')return [];
 const id=d.id,push=mode=>({type:'activate',uid:c.uid,mode}),out=[];
 const once=key=>!used(s,key);
 // Q2073: 〈デンジ〉 name-once across copies (mainReadyOnceByName).
 if(id==='CSM-1-007'&&!locked(s,owner,'denjiActive')&&eventsUsed(s,owner)>=2&&
  nameOn(s,owner,MAKIMA)&&!c.ready)
  out.push(push('csm:0'));
 if(id==='CSM-1-014'&&c.ready)out.push(push('csm:0'));
 if(id==='CSM-1-017'&&once(c.uid+'|main')&&raidLive(c,d,'main')&&
  (c.stack||[]).some(x=>x&&x.faceDown!==true))
  out.push(push('csm:0'));
 if(id==='CSM-1-022'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&
  (usedOwnEventThisTurn(s,owner,x=>def(pack,x))||csmEventUseCount(s,owner,x=>def(pack,x))>0)&&
  chars(s,owner,x=>x.uid!==c.uid).length)out.push(push('csm:0'));
 if(id==='CSM-1-023'&&frontLine(s,owner,c)&&raidLive(c,d,'main')){
  if(once(c.uid+'|0')&&plOf(s,owner).outside.some(x=>{
   const p=def(pack,x);return isEvent(s,owner,x)&&p.trigger!=='special'&&p.trigger!=='final';
  }))out.push(push('csm:0'));
  if(once(c.uid+'|1')&&csmEventUseCount(s,owner,x=>def(pack,x))>0&&
   chars(s,owner,x=>x.uid!==c.uid).length)out.push(push('csm:1'));
 }
 if(id==='CSM-1-042'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&
  chars(s,owner,x=>x.uid!==c.uid).length)out.push(push('csm:0'));
 if(id==='CSM-1-055'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&plOf(s,owner).hand.length){
  const open=akiOpen(s,owner);
  if(open.block||open.search)out.push(push('csm:0'));
 }
 if(id==='CSM-1-059'&&once(c.uid+'|main')&&plOf(s,owner).hand.length)out.push(push('csm:0'));
 if(id==='CSM-1-062'&&c.ready)out.push(push('csm:0'));
 if(id==='CSM-1-065'&&c.ready&&once(c.uid+'|main')&&
  plOf(s,owner).energy.some(x=>x&&!x.ready))out.push(push('csm:0'));
 if(id==='CSM-1-067'&&c.ready)out.push(push('csm:0'));
 if(id==='CSM-1-070'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&
  plOf(s,owner).energy.some(x=>x&&def(pack,x).type==='character'))out.push(push('csm:0'));
 if(id==='CSM-1-071'&&c.ready&&plOf(s,owner).deck.length)out.push(push('csm:0'));
 return out;
}

export function activateCsm(pack,s,action){
 arm(pack);
 const owner=s.active,c=selfOf(s,owner,action.uid);
 if(!c)throw Error('Chainsaw Man activator left');
 const legal=legalCsmActivations(pack,s,owner,c).some(a=>a.uid===action.uid&&a.mode===action.mode);
 if(!legal)throw Error('Chainsaw Man activation is not legal');
 const id=def(pack,c).id,spec={player:owner,sourceUid:c.uid,id};
 if(id==='CSM-1-007'){lock(s,owner,'denjiActive');A.active(s,owner,c);go(pack,s);return;}
 if(id==='CSM-1-014'){
  restOwn(s,owner,c);
  retireThen(pack,s,owner,c.uid,ownCause(owner,c.uid),
   {op:'csm',id,slot:'afterOwnRetire',owner,sourceUid:c.uid,kind:'denjiImpact',needsLeave:true});
  return go(pack,s);
 }
 if(id==='CSM-1-017'){
  use(s,c.uid+'|main');impact(s,c);
  const base=(c.stack||[]).find(x=>x&&x.faceDown!==true);
  if(base){
   c.stack=c.stack.filter(x=>x.uid!==base.uid);
   plOf(s,owner).outside.push(base);
   A.record(pack,s,{physical:base,owner,from:'raid-under',to:'outside',
    reason:'own-effect',sourceUid:c.uid,attachedToUid:c.uid,wasFaceDown:false});
  }
  go(pack,s);return;
 }
 if(id==='CSM-1-022'){
  use(s,c.uid+'|main');
  offerChars(s,spec,x=>x.uid!==c.uid,false,'grantImpact');
  go(pack,s);return;
 }
 if(id==='CSM-1-023'&&action.mode==='csm:0'){
  use(s,c.uid+'|0');
  const events=plOf(s,owner).outside.filter(x=>{
   const p=def(pack,x);return isEvent(s,owner,x)&&p.trigger!=='special'&&p.trigger!=='final';
  });
  hold(s,{...spec,step:'recover'},events.map(x=>({type:'csm',mode:'take',uid:x.uid})));
  go(pack,s);return;
 }
 if(id==='CSM-1-023'&&action.mode==='csm:1'){
  use(s,c.uid+'|1');
  offerChars(s,spec,x=>x.uid!==c.uid,false,'buffOther');
  go(pack,s);return;
 }
 if(id==='CSM-1-042'){
  use(s,c.uid+'|main');
  const pool=chars(s,owner,x=>x.uid!==c.uid);
  hold(s,{...spec,step:'buffTwo',data:{picked:[]}},[
   {type:'csm',mode:'done'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
  go(pack,s);return;
 }
 if(id==='CSM-1-055'){
  use(s,c.uid+'|main');
  hold(s,{...spec,step:'discardThenChoose'},
   plOf(s,owner).hand.map(x=>({type:'csm',mode:'discard',uid:x.uid})));
  go(pack,s);return;
 }
 if(id==='CSM-1-059'){
  use(s,c.uid+'|main');
  hold(s,{...spec,step:'discardEnergy'},
   plOf(s,owner).hand.map(x=>({type:'csm',mode:'discard',uid:x.uid})));
  go(pack,s);return;
 }
 if(id==='CSM-1-062'){
  restOwn(s,owner,c);
  retireThen(pack,s,owner,c.uid,ownCause(owner,c.uid),
   {op:'csm',id,slot:'afterOwnRetire',owner,sourceUid:c.uid,kind:'grantAttackDraw',needsLeave:true});
  go(pack,s);return;
 }
 if(id==='CSM-1-065'){
  use(s,c.uid+'|main');restOwn(s,owner,c);
  const pool=plOf(s,owner).energy.filter(x=>x&&!x.ready);
  hold(s,{...spec,step:'activeEnergy'},pool.map(x=>({type:'csm',mode:'pick',uid:x.uid})));
  go(pack,s);return;
 }
 if(id==='CSM-1-067'){
  restOwn(s,owner,c);
  retireThen(pack,s,owner,c.uid,ownCause(owner,c.uid),
   {op:'csm',id,slot:'afterOwnRetire',owner,sourceUid:c.uid,kind:'denjiEnergy',
    pochitaUid:c.uid,needsLeave:false});
  go(pack,s);return;
 }
 if(id==='CSM-1-070'){
  use(s,c.uid+'|main');
  // Q2098: frontForbidden energy cards cannot swap onto front.
  const pool=energyCharsToFront(pack,s,owner);
  hold(s,{...spec,step:'swap'},pool.map(x=>({type:'csm',mode:'pick',uid:x.uid})));
  go(pack,s);return;
 }
 if(id==='CSM-1-071'){
  restOwn(s,owner,c);
  const top=plOf(s,owner).deck[0];
  if(!top)return go(pack,s);
  hold(s,{...spec,step:'topPlace',data:{uid:top.uid,window:[top.uid]}},[
   {type:'csm',mode:'top'},{type:'csm',mode:'bottom'}]);
  go(pack,s);return;
 }
 go(pack,s);
}
export function legalCsmPending(pack,s){arm(pack);return s.pending?.actions||[];}

export function resolveCsmPending(pack,s,action){
 arm(pack);
 const q=s.pending;
 const a=takeAction(q,action);
 s.pending=null;
 const step=q.step,owner=q.player;
 if(step==='lookPick')finishLookTake(pack,s,q,a);
 else if(step==='lookOrder')finishOrder(s,q,a);
 else if((step==='discard'||step==='discardEnergy')&&a.mode==='discard'){
  moveUid(pack,s,owner,'hand',a.uid,'outside',q.sourceUid);
  if(q.id==='CSM-1-008'&&q.data?.handThenFollow)offer008Follow(pack,s,q);
  else if(q.data?.left)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},
   q.data.left,q.data.rest);
  else if(q.id==='CSM-1-055')afterAkiDiscard(pack,s,q);
  else if(q.id==='CSM-1-059'){
   const self=selfOf(s,owner,q.sourceUid);
   if(self){self.buffs??=[];self.buffs.push({energy:1,untilTurn:s.turn});}
  }else if(q.id==='CSM-1-037'&&q.data?.nextAp){
   // Date option 2: after draw-two/discard-one, ready an AP if an
   // earlier qualifying event (including a Makima-converted card) was used.
   offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id},false);
  }
 }else if(step==='leaveReplace'){
  // Q2093/Q2094: accept retires the chosen substitute; skip resumes the original leave.
  // A printed 「そうした場合」 stays with the original card. A later sentence
  // that does not depend on that card leaving still resolves, once.
  const cause=q.data?.retireCause||null;
  if(a.mode==='pick'){
   use(s,q.sourceUid+'|leave');
   retireUid(pack,s,owner,a.uid,cause);
   A.releaseRetirement(s,q,false);
   return go(pack,s);
  }else if(a.mode==='skip'&&q.data?.line!=null&&q.data?.slot!=null&&A.retireSkip){
   A.retireSkip(pack,s,owner,q.data.line,q.data.slot,cause?{
    by:cause.by||undefined,controller:cause.controller,sourceUid:cause.sourceUid
   }:{});
   A.releaseRetirement(s,q,true);
  }
 }else if(step==='retireThenDebuff5k'){
  if(a.mode==='pick'){
   retireThen(pack,s,owner,a.uid,ownCause(owner,q.sourceUid),
    {op:'csm',id:q.id,slot:'afterOwnRetire',owner,sourceUid:q.sourceUid,kind:'debuff5k',needsLeave:true});
   return go(pack,s);
  }
 }else if(step==='debuff5k'&&a.mode==='pick'){
  const paused=debuffFront(pack,s,1-owner,a.uid,-5000);
  if(paused)return go(pack,s);
 }else if(step==='peelUnder'&&a.mode==='peel'){
  const host=selfOf(s,owner,a.hostUid||q.data?.hostUid);
  if(host){
   const peeled=peelFacedownUid(pack,s,owner,host,a.uid,q.data?.to||'outside',q.sourceUid);
   if(q.data?.follow==='pochita'&&peeled&&named(pack,peeled,POCHITA,s)){
    hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'pochita',
     data:{uid:peeled.uid}},[
     {type:'csm',mode:'skip'},{type:'csm',mode:'deploy',uid:peeled.uid}]);
   }else if(q.data?.follow==='himeno'){
    const self=selfOf(s,owner,q.sourceUid);
    if(self&&nameOn(s,owner,HIMENO)&&!csmFacedowns(self).length){
     sniper(s,self);impact(s,self);
    }
   }
  }
 }else if(step==='buffOther'&&a.mode==='pick'){
  buff(s,selfOf(s,owner,a.uid),q.data?.bp||1000);
  if(q.data?.left)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},
   q.data.left,q.data.rest);
 }else if(step==='debuff'&&a.mode==='pick'){
  const paused=debuffFront(pack,s,1-owner,a.uid,q.data?.bp||-1000);
  if(paused)return go(pack,s);
  if(q.data?.left)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},
   q.data.left,q.data.rest);
 }else if(step==='buffOther'&&a.mode==='skip'&&q.data?.left)
  offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},q.data.left,q.data.rest);
 else if(step==='debuff'&&a.mode==='skip'&&q.data?.left)
  offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},q.data.left,q.data.rest);
 else if(step==='recover'&&a.mode==='take'){
  moveUid(pack,s,owner,'outside',a.uid,'hand',q.sourceUid);
  if(q.data?.left)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},
   q.data.left,q.data.rest);
 }else if(step==='recover'&&a.mode==='skip'&&q.data?.left)
  offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},q.data.left,q.data.rest);
 else if(step==='deploy'){
  if(a.mode!=='skip'){
   A.enter(pack,s,{owner,from:q.data?.from||'hand',uid:a.uid,line:a.line,slot:a.slot,
    ...(a.replaceUid?{replaceUid:a.replaceUid}:{}),ready:q.data?.ready===true,
    sourceUid:q.sourceUid,...(q.data?.skipOnPlay?{skipOnPlay:true}:{})});
   // CSM-1-067 / CSM-1-076: attach the source only after Denji enters.
   const underUid=q.data?.underUid;
   if(underUid){
    const entered=selfOf(s,owner,a.uid);
    const under=plOf(s,owner).outside.find(c=>c.uid===underUid);
    if(entered&&under)tuck(pack,s,owner,'outside',under.uid,entered,q.sourceUid);
   }
  }
 }else if(step==='choose')resolveChoose(pack,s,q,a);
 else if(step==='retireThenKit'&&a.mode==='pick'){
  retireThen(pack,s,owner,a.uid,ownCause(owner,q.sourceUid),
   {op:'csm',id:q.id,slot:'afterOwnRetire',owner,sourceUid:q.sourceUid,kind:'kit016',needsLeave:true});
 }else if(step==='retireThenChoose'){
  if(a.mode==='pick'){
   retireThen(pack,s,owner,a.uid,ownCause(owner,q.sourceUid),
    {op:'csm',id:q.id,slot:'afterOwnRetire',owner,sourceUid:q.sourceUid,kind:'choose12',needsLeave:true});
  }
 }else if(step==='afterRetireChoose'){
  if(a.mode==='one'){
   A.draw(pack,s,owner,1,q.sourceUid);
   offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},c=>c.uid!==q.sourceUid,true,'buffOther2k');
  }else A.draw(pack,s,owner,2,q.sourceUid);
 }else if(step==='buffOther2k'&&a.mode==='pick')buff(s,selfOf(s,owner,a.uid),2000);
 else if(step==='retireOwn'&&a.mode==='pick'){
  retireThen(pack,s,owner,a.uid,ownCause(owner,q.sourceUid),
   q.id==='CSM-1-038'?{op:'csm',id:q.id,slot:'afterOwnRetire',owner,sourceUid:q.sourceUid,kind:'ap038',needsLeave:true}:null);
 }else if(step==='retireFoe'&&a.mode==='pick'){
  const follow=q.data?.thenBuff||q.data?.peelAki?{op:'csm',id:q.id,slot:'afterFoeRetire',
   owner,sourceUid:q.sourceUid,thenBuff:q.data?.thenBuff===true,peelAki:q.data?.peelAki===true,
   needsLeave:false}:null;
  retireThen(pack,s,1-owner,a.uid,foeCause(owner,q.sourceUid),follow);
 }else if(step==='ap'){
  if(a.mode==='ap')readyIndex(s,owner,a.index);
  if(q.data?.next==='draw2')A.draw(pack,s,owner,2,q.sourceUid);
  if(q.id==='CSM-1-031')lock(s,owner,'rezeAp');
 }else if(step==='millOne'){
  const left=a.mode==='outside'?q.data.window.filter(uid=>uid!==a.uid):q.data.window;
  if(a.mode==='outside'){
   const index=plOf(s,owner).deck.findIndex(c=>c.uid===a.uid);
   if(index>=0)A.move(pack,s,{owner,from:'deck',to:'outside',index,reason:'own-effect',
    sourceUid:q.sourceUid});
  }
  offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:{rest:'top'}},left,'top');
 }else if(step==='arrange')resolveArrange(pack,s,q,a);
 else if(step==='tuckHand'&&a.mode==='card'){
  const self=selfOf(s,owner,q.sourceUid);
  if(self)tuck(pack,s,owner,'hand',a.uid,self,q.sourceUid);
 }else if(step==='tuckCard'&&a.mode==='card'){
  const hosts=(q.data.hosts||[]).map(uid=>selfOf(s,owner,uid)).filter(Boolean);
  if(hosts.length===1)tuck(pack,s,owner,'outside',a.uid,hosts[0],q.sourceUid);
  else hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'tuckHost',data:{uid:a.uid}},
   hosts.map(c=>({type:'csm',mode:'host',uid:c.uid})));
 }else if(step==='tuckHost')tuck(pack,s,owner,'outside',q.data.uid,selfOf(s,owner,a.uid),q.sourceUid);
 else if(step==='buffThenPeel'&&a.mode==='pick'){
  buff(s,selfOf(s,owner,a.uid),2000);
  offerPeelAki(pack,s,{...q,data:{...q.data,afterPeel:'impactAp'}});
 }else if(step==='peelAki'){
  if(a.mode==='peel'){
   const host=selfOf(s,owner,a.hostUid);
   if(host)peelFacedown(pack,s,owner,host,'outside',q.sourceUid);
   if(q.data?.afterPeel==='impactAp'){
    offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id},false);
    const akis=chars(s,owner,c=>named(pack,c,AKI,s));
    if(akis.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'grantImpact'},[
     {type:'csm',mode:'skip'},...akis.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
   }
  }
 }else if(step==='peelBuff'&&a.mode==='peel'){
  const host=selfOf(s,owner,a.hostUid);
  if(host)peelFacedown(pack,s,owner,host,'outside',q.sourceUid);
  const self=selfOf(s,owner,q.sourceUid);
  if(self)buff(s,self,1500);
 }else if(step==='grantImpact'&&a.mode==='pick')impact(s,selfOf(s,owner,a.uid));
 else if(step==='buffImpact'&&a.mode==='pick'){
  const t=selfOf(s,owner,a.uid);if(t){buff(s,t,1000);impact(s,t);}
 }else if(step==='grantAttackDraw'&&a.mode==='pick'){
  const t=selfOf(s,owner,a.uid);
  if(t)t.attackDrawGranted={turn:s.turn,stamp:t.fieldEntryStamp};
 }else if(step==='buffTwo'){
  if(a.mode==='pick'){
   buff(s,selfOf(s,owner,a.uid),1000);
   const picked=[...(q.data.picked||[]),a.uid];
   if(picked.length<2){
    const pool=chars(s,owner,c=>c.uid!==q.sourceUid&&!picked.includes(c.uid));
    hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'buffTwo',data:{picked}},[
     {type:'csm',mode:'done'},...pool.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
   }
  }
 }else if(step==='discardThenChoose'&&a.mode==='discard'){
  moveUid(pack,s,owner,'hand',a.uid,'outside',q.sourceUid);
  afterAkiDiscard(pack,s,q);
 }else if(step==='akiChoose'){
  if(a.mode==='block'){
   lock(s,owner,'akiBlock');
   offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},null,false,'grantBlock3k');
  }else if(a.mode==='search')startAkiSearch(pack,s,q);
 }else if(step==='grantBlock3k'&&a.mode==='pick'){
  unblocked(s,selfOf(s,owner,a.uid),3000);
 }else if(step==='mayDraw'&&a.mode==='draw'){
  A.draw(pack,s,owner,1,q.sourceUid);
 }else if(step==='activeEnergy'&&a.mode==='pick'){
  const t=selfOf(s,owner,a.uid);if(t)A.active(s,owner,t);
 }else if(step==='himenoSwap'){
  if(a.mode==='front'){
   const energies=(q.data?.energies||[])
    .map(uid=>plOf(s,owner).energy.find(c=>c?.uid===uid)).filter(Boolean);
   hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'himenoSwapEnergy',
    data:{frontUid:a.uid}},[
    {type:'csm',mode:'skip'},
    ...energies.map(c=>({type:'csm',mode:'energy',uid:c.uid}))]);
  }
 }else if(step==='himenoSwapEnergy'&&a.mode==='energy'){
  swapFrontEnergy(pack,s,owner,q.data.frontUid,a.uid);
 }else if(step==='swap'&&a.mode==='pick'){
  swapFrontEnergy(pack,s,owner,q.sourceUid,a.uid);
 }else if(step==='topPlace'){
  const uid=q.data.uid;
  if(a.mode==='bottom')lay(plOf(s,owner),[uid],'bottom');
 } else if(step==='mayRetire'&&a.mode==='retire')retireUid(pack,s,owner,q.sourceUid,ownCause(owner,q.sourceUid));
 else if(step==='buffMoveFront'&&a.mode==='pick'){
  const t=selfOf(s,owner,a.uid);
  if(t){buff(s,t,2000);offerMoveToFront(pack,s,{player:owner,sourceUid:q.sourceUid,id:q.id},t);}
 }else if(step==='moveFront'&&a.mode==='move'){
  A.moveLine(pack,s,owner,a.uid||q.data?.uid,'front',a.slot,a.replaceUid,q.sourceUid);
 }else if(step==='payReturn')resolvePayReturn(pack,s,q,a);
 else if(step==='pochita'&&a.mode==='deploy'){
  const card=plOf(s,owner).outside.find(c=>c.uid===q.data.uid);
  if(card)offerDeploy(s,{player:owner,sourceUid:q.sourceUid,id:q.id},[card],
   {from:'outside',ready:false,lines:['energy'],optional:false});
 }else if(step==='denjiEnergy'&&a.mode==='deploy'){
  // Choose an energy-line cell after choosing Denji. Its on-play effect is live.
  const denji=plOf(s,owner).outside.find(c=>c.uid===a.uid);
  if(denji)offerDeploy(s,{player:owner,sourceUid:q.sourceUid,id:q.id,
   data:{underUid:q.data?.pochitaUid}},[denji],
   {from:'outside',ready:true,lines:['energy'],optional:false});
 }else if(step==='auraBuff'&&a.mode==='pick'){
  buff(s,selfOf(s,owner,a.uid),1000);
  s.csmAlsoEventGrant={...(s.csmAlsoEventGrant||{}),[owner]:s.turn};
  s.csmAlsoEventGrantOrder={...(s.csmAlsoEventGrantOrder||{}),[owner]:s.nextZoneMoveOrder};
  offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id},false);
 }
 go(pack,s);
}

function resolveChoose(pack,s,q,a){
 const owner=q.player;
 if(q.id==='CSM-1-006'){
  if(a.mode==='draw')A.draw(pack,s,owner,1,q.sourceUid);
  else beginLook(pack,s,{owner,sourceUid:q.sourceUid,id:q.id},{count:4,rest:'bottom',
   dest:'hand',public:true,discard:false,pred:d=>cardHasName(d,REZE)||cardHasName(d,DENJI)});
  return;
 }
 if(q.id==='CSM-1-017'){
  if(a.mode==='debuff')offerFront(s,{player:owner,sourceUid:q.sourceUid,id:q.id},
   1-owner,null,true,'debuff');
  else {
   offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},c=>c.uid!==q.sourceUid,true,
    'retireThenDebuff5k');
  }
  return;
 }
 if(q.id==='CSM-1-024'){
  if(a.mode==='draw')A.draw(pack,s,owner,1,q.sourceUid);
  else offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},c=>c.uid!==q.sourceUid,true,
   'buffOther2k');
  return;
 }
 if(q.id==='CSM-1-031'){
  if(a.mode==='debuff')offerFront(s,{player:owner,sourceUid:q.sourceUid,id:q.id},
   1-owner,null,true,'debuff');
  else {lock(s,owner,'rezeAp');offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id},false);}
  return;
 }
 if(q.id==='CSM-1-037'){
  if(a.mode==='aura'){
   offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},null,false,'auraBuff');
  }else{
   lock(s,owner,'dateDraw');
   A.draw(pack,s,owner,2,q.sourceUid);
   const nextAp=otherEventsUsed(s,owner,q.sourceUid)>0;
   if(!offerHand(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:{nextAp}},false)&&nextAp)
    offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id},false);
  }
  return;
 }
 if(q.id==='CSM-1-047'){
  if(a.mode==='draw')A.draw(pack,s,owner,2,q.sourceUid);
  else {
   const card=plOf(s,owner).outside.find(c=>c.uid===q.sourceUid);
   if(card)offerDeploy(s,{player:owner,sourceUid:q.sourceUid,id:q.id},[card],
    {from:'outside',ready:true,lines:['front'],optional:false,skipOnPlay:true});
  }
  return;
 }
 if(q.id==='CSM-1-076'){
  if(a.mode==='look'){
   const window=windowCards(s,owner,2);
   if(!window.length){offerDreamDenji(pack,s,q);return;}
   hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'arrange',
    data:{window:window.map(c=>c.uid),kept:[],rest:'top',follow:'dream'}},[
    {type:'csm',mode:'done'},
    ...window.map(c=>({type:'csm',mode:'keep',uid:c.uid})),
    ...window.map(c=>({type:'csm',mode:'outside',uid:c.uid}))]);
  }else offerDreamTuck(pack,s,q);
 }
}
function offerDreamDenji(pack,s,q){
 const outs=plOf(s,q.player).outside.filter(c=>named(pack,c,DENJI,s)&&
  def(pack,c).color==='red'&&def(pack,c).energy<=1);
 if(!outs.length)return;
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'denjiEnergy',
  data:{pochitaUid:q.sourceUid}},[
  {type:'csm',mode:'skip'},...outs.map(c=>({type:'csm',mode:'deploy',uid:c.uid}))]);
}
function offerDreamTuck(pack,s,q){
 const hosts=chars(s,q.player,c=>named(pack,c,DENJI,s)&&!csmFacedowns(c).length);
 const event=plOf(s,q.player).outside.find(c=>c.uid===q.sourceUid);
 if(!hosts.length||!event)return;
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'dreamTuck'},
  hosts.map(c=>({type:'csm',mode:'host',uid:c.uid})));
}
function finishArrange(pack,s,q,kept){
 const owner=q.player;
 lay(plOf(s,owner),kept,q.data.rest||'top');
 if(q.data.follow==='dream')offerDreamDenji(pack,s,q);
 else if(q.id==='CSM-1-051')offerTuckUnderDenji(pack,s,{player:owner,
  sourceUid:q.sourceUid,id:q.id});
}
function holdArrange(s,q,window,kept){
 const left=window.filter(uid=>!kept.includes(uid));
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'arrange',
  data:{...q.data,window,kept}},[
  {type:'csm',mode:'done'},
  ...left.map(uid=>({type:'csm',mode:'keep',uid})),
  ...window.map(uid=>({type:'csm',mode:'outside',uid}))]);
}
function resolveArrange(pack,s,q,a){
 const owner=q.player;
 const window=q.data.window||[];
 const kept=q.data.kept||[];
 if(a.mode==='keep'){
  const next=[...kept,a.uid];
  if(window.every(uid=>next.includes(uid)))finishArrange(pack,s,q,next);
  else holdArrange(s,q,window,next);
  return;
 }
 if(a.mode==='outside'){
  const index=plOf(s,owner).deck.findIndex(c=>c.uid===a.uid);
  if(index>=0)A.move(pack,s,{owner,from:'deck',to:'outside',index,reason:'own-effect',
   sourceUid:q.sourceUid});
  const leftWindow=window.filter(uid=>uid!==a.uid);
  const leftKept=kept.filter(uid=>uid!==a.uid);
  if(!leftWindow.length||leftWindow.every(uid=>leftKept.includes(uid)))
   finishArrange(pack,s,q,leftKept);
  else holdArrange(s,q,leftWindow,leftKept);
  return;
 }
 if(a.mode==='done'){
  const rest=window.filter(uid=>!kept.includes(uid));
  finishArrange(pack,s,q,[...kept,...rest]);
 }
}
function offerPeelAki(pack,s,q){
 const hosts=chars(s,q.player,c=>named(pack,c,AKI,s)&&csmFacedowns(c).length);
 if(!hosts.length)return;
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'peelAki',data:q.data},[
  {type:'csm',mode:'skip'},
  ...hosts.flatMap(h=>csmFacedowns(h).slice(-1).map(c=>({
   type:'csm',mode:'peel',uid:c.uid,hostUid:h.uid})))]);
}
function akiOpen(s,owner){
 return {
  block:!locked(s,owner,'akiBlock')&&chars(s,owner).length>0,
  search:!locked(s,owner,'akiSearch')
 };
}
function afterAkiDiscard(pack,s,q){
 const open=akiOpen(s,q.player);
 const actions=[];
 if(open.block)actions.push({type:'csm',mode:'block'});
 if(open.search)actions.push({type:'csm',mode:'search'});
 if(!actions.length)return;
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'akiChoose'},actions);
}
function startAkiSearch(pack,s,q){
 lock(s,q.player,'akiSearch');
 beginLook(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id},{count:3,rest:'bottom',
  dest:'hand',public:true,discard:false,pred:d=>cardHasName(d,AKI)||cardHasName(d,DENJI)||
   cardHasName(d,POWER)});
 // If nothing taken, draw 1 — handled when look finishes with skip.
}
function resolvePayReturn(pack,s,q,a){
 const owner=q.player;
 if(a.mode==='skip')return;
 if(a.mode==='event'){
  moveUid(pack,s,owner,'hand',a.uid,'outside',q.sourceUid);
  const card=plOf(s,owner).outside.find(c=>c.uid===q.sourceUid);
  if(card)moveUid(pack,s,owner,'outside',card.uid,'hand',q.sourceUid);
  return;
 }
 if(a.mode==='char'){
  const picked=[...(q.data.picked||[]),a.uid];
  if(picked.length<2){
   const left=plOf(s,owner).hand.filter(c=>def(pack,c).type==='character'&&!picked.includes(c.uid));
   hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'payReturn',data:{picked}},
    left.map(c=>({type:'csm',mode:'char',uid:c.uid})));
   return;
  }
  for(const uid of picked)moveUid(pack,s,owner,'hand',uid,'outside',q.sourceUid);
  const card=plOf(s,owner).outside.find(c=>c.uid===q.sourceUid);
  if(card)moveUid(pack,s,owner,'outside',card.uid,'hand',q.sourceUid);
 }
}
function swapFrontEnergy(pack,s,owner,frontUid,energyUid){
 const pl=plOf(s,owner);
 const fi=pl.front.findIndex(c=>c?.uid===frontUid);
 const ei=pl.energy.findIndex(c=>c?.uid===energyUid);
 if(fi<0||ei<0)return;
 // Q2098: never swap a frontForbidden energy card onto front.
 if(def(pack,pl.energy[ei]).frontForbidden)return;
 const tmp=pl.front[fi];
 pl.front[fi]=pl.energy[ei];
 pl.energy[ei]=tmp;
 A.record(pack,s,{physical:pl.front[fi],owner,from:'energy',to:'front',reason:'own-effect',
  sourceUid:frontUid});
 A.record(pack,s,{physical:pl.energy[ei],owner,from:'front',to:'energy',reason:'own-effect',
  sourceUid:frontUid});
 csmOnMovedOutsideMove(pack,s,owner,pl.front[fi]);
 csmOnMovedOutsideMove(pack,s,owner,pl.energy[ei]);
}
// Q2095: full front requires an explicit replace choice; no silent auto-remove.
function offerMoveToFront(pack,s,spec,c){
 const loc=locOf(s,spec.player,c.uid);
 if(!loc||loc.line==='front')return false;
 if(def(pack,c).frontForbidden)return false;
 const dests=A.destinations(plOf(s,spec.player),'front');
 if(!dests.length)return false;
 if(dests.length===1&&!dests[0].replaceUid){
  A.moveLine(pack,s,spec.player,c.uid,'front',dests[0].slot,undefined,spec.sourceUid);
  return true;
 }
 hold(s,{...spec,step:'moveFront',data:{...(spec.data||{}),uid:c.uid}},
  dests.map(d=>({type:'csm',mode:'move',uid:c.uid,line:'front',slot:d.slot,
   ...(d.replaceUid?{replaceUid:d.replaceUid}:{})})));
 return true;
}

// Hooks the engine calls for continuous / timing edges.
export function csmOnAttackWin(pack,s,attacker){
 const d=def(pack,attacker);
 if(!d?.csmHook||originalEffectsDisabled(s,attacker))return;
 if(d.id==='CSM-1-012')
  s.effectQueue.unshift({op:'csm',id:d.id,slot:'win',owner:s.active,sourceUid:attacker.uid});
 if(d.id==='CSM-1-061'&&raidLive(attacker,d,'attackWin'))
  A.draw(pack,s,s.active,1,attacker.uid);
}
export function csmOnUnblocked(pack,s,attacker){
 const d=def(pack,attacker);
 if(!d?.csmHook)return;
 if(d.id==='CSM-1-029'&&!originalEffectsDisabled(s,attacker))
  s.effectQueue.unshift({op:'csm',id:d.id,slot:'unblocked',owner:s.active,sourceUid:attacker.uid});
 if(d.id==='CSM-1-046'&&attacker.csmUnblockedDraw===s.turn)
  s.effectQueue.unshift({op:'csm',id:d.id,slot:'mayDraw',owner:s.active,sourceUid:attacker.uid});
}
export function csmOnAttackEnd(pack,s,attacker){
 const d=def(pack,attacker);
 if(!d?.csmHook||originalEffectsDisabled(s,attacker))return;
 if((d.id==='CSM-1-048'||d.id==='CSM-1-066')&&raidLive(attacker,d,'attackEnd'))
  s.effectQueue.unshift({op:'csm',id:d.id,slot:'attackEnd',owner:Number(String(attacker.uid).split('-')[0]),
   sourceUid:attacker.uid});
}
export function csmOnMovedOutsideMove(pack,s,owner,c){
 const d=def(pack,c);
 if(!d?.csmHook||d.id!=='CSM-1-046'||originalEffectsDisabled(s,c))return;
 // Printed 「移動フェイズ以外」. Player STEP and energy-to-front are move phase.
 if(s.phase==='move')return;
 s.effectQueue.unshift({op:'csm',id:d.id,slot:'moved',owner,sourceUid:c.uid});
}
export function csmOnTurnStart(pack,s,owner){
 for(const c of plOf(s,owner).front.concat(plOf(s,owner).energy)){
  if(!c||originalEffectsDisabled(s,c))continue;
  const d=def(pack,c);
  if(d.id==='CSM-1-056'&&raidLive(c,d,'phase')&&!csmFacedowns(c).length)
   retireUid(pack,s,owner,c.uid,ownCause(owner,c.uid));
 }
}
export function csmOnAttackDeclare(pack,s,attacker){
 const d=def(pack,attacker);
 if(!d?.csmHook||d.id!=='CSM-1-056'||originalEffectsDisabled(s,attacker))return;
 if(!raidLive(attacker,d,'onAttack'))return;
 const owner=Number(String(attacker.uid).split('-')[0]);
 const unders=csmFacedowns(attacker);
 if(!unders.length)return;
 // Multi-under: controller chooses which facedown goes to hand.
 if(offerPeelUnder(s,{player:owner,sourceUid:attacker.uid,id:d.id},attacker,'hand','himeno'))
  return;
 peelFacedown(pack,s,owner,attacker,'hand',attacker.uid);
 if(nameOn(s,owner,HIMENO)&&!csmFacedowns(attacker).length){
  sniper(s,attacker);impact(s,attacker);
 }
}
export function csmLeaveReplace(pack,s,owner,c){
 const d=def(pack,c);
 if(!d?.csmHook||d.id!=='CSM-1-061'||originalEffectsDisabled(s,c))return false;
 if(!raidLive(c,d,'leaveReplace'))return false;
 if(A.bp(pack,s,c)<500||used(s,c.uid+'|leave'))return false;
 const pool=fronts(s,owner,x=>x.uid!==c.uid&&A.bp(pack,s,x)>=4000);
 if(!pool.length)return false;
 const loc=locOf(s,owner,c.uid);
 hold(s,{player:owner,sourceUid:c.uid,id:d.id,step:'leaveReplace',
  data:{line:loc?.line,slot:loc?.slot,retireCause:s.csmRetireCause||null}},[
  {type:'csm',mode:'skip'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
 // Spend |leave only when the substitute branch is accepted (resolveCsmPending).
 return true;
}
