// UA50BT scripts. The engine passes zone helpers; this file does not import it.
// Printed 「まで」 includes zero. A name-once lock is spent only when that
// activate is used. Facedown cards under a character stay private to the
// opponent; the engine's public view already hides them.
import {cardHasName,cardHasTrait,cardCountsAsEvent} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';

const TRAIT='奈落一派';
let A=null;
export function bindIys(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return !originalEffectsDisabled(s,c);}
function named(pack,c,name,s){return cardHasName(def(pack,c),name,s?originalEffectsDisabled(s,c):false);}
function hold(s,spec,actions){
 s.pending={kind:'iys',player:spec.player,sourceUid:spec.sourceUid,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function lock(s,owner,key){if(!s.mainReadyOnceByName[owner].includes(key))s.mainReadyOnceByName[owner].push(key);}
function locked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function impact(s,c){c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function ceiling(s,source,target){
 target.blockAtLeastGranted={turn:s.turn,stamp:target.fieldEntryStamp,bp:4000};
 use(s,source.uid+'|block');
}
function doubleAttack(s,c){
 c.readyOnAttackGranted={turn:s.turn,stamp:c.fieldEntryStamp};
 use(s,c.uid+'|double');
}
function chars(s,owner,pred){
 return A.field(plOf(s,owner)).filter(c=>def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function locOf(s,owner,uid){return A.location(s,owner,uid);}
function selfOf(s,owner,uid){return locOf(s,owner,uid)?.c||null;}
function restedByOwn(s,owner,c){
 return !!c&&(s.ownEffectRests[owner]||[]).some(n=>
  n.uid===c.uid&&n.stamp===c.fieldEntryStamp&&n.turn===s.turn);
}
function enteredThisTurn(s,owner,c){
 if(!c)return false;
 if(c.entryTurn===s.turn)return true;
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===c.uid&&e.owner===owner&&
  ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from));
}
function fromOutsideThisTurn(s,owner){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.from==='outside'&&
  ['front','energy'].includes(e.to)&&def(A.pack,{uid:e.uid,cardId:e.cardId}).type==='character');
}
function traitlessPurple(d){return d.type==='character'&&d.color==='purple'&&!(d.traits||[]).length;}
function redEvent(d){return d.type==='event'&&d.color==='red';}
function hosts(s,owner){
 return chars(s,owner,c=>live(s,c)&&named(A.pack,c,'奈落',s));
}
function tuckable(d){return cardHasTrait(d,TRAIT)||d.name==='四魂のかけら';}
function arm(pack){A.pack=pack;}
function go(pack,s){if(!s.pending)A.go(pack,s);}
function sig(a){return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,a?.replaceUid??null,a?.index??null]);}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Inuyasha choice is not legal');
 return hit;
}
function moveUid(pack,s,owner,from,uid,to,sourceUid){
 const index=plOf(s,owner)[from].findIndex(c=>c.uid===uid);
 if(index<0)throw Error('Inuyasha card left '+from);
 return A.move(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid});
}
function tuck(pack,s,owner,from,uid,host,sourceUid){
 const pl=plOf(s,owner);
 const index=pl[from].findIndex(c=>c.uid===uid);
 if(index<0||!host)throw Error('Inuyasha tuck lost a card');
 const physical=pl[from].splice(index,1)[0];
 physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
 host.under??=[];host.under.push(physical);
 A.record(pack,s,{physical,owner,from,to:'raid-under',reason:'own-effect',sourceUid:host.uid});
}
function publish(pack,s,owner,physical){
 const d=def(pack,physical);
 s.publicReveals.push({kind:'deck-top',owner,title:A.title(pack,owner),cardId:physical.cardId,
  uid:physical.uid,trigger:d.trigger||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
 A.reveal(pack,s,owner,physical);
}
function restOwn(s,owner,c){
 if(!c?.ready)return false;
 A.noteRest(s,owner,c);
 c.ready=false;
 return true;
}
function restAny(c){if(!c)return false;c.ready=false;return true;}
function retireUid(pack,s,owner,uid){
 const loc=locOf(s,owner,uid);
 if(!loc)return false;
 return A.retire(pack,s,owner,loc.line,loc.slot)===true;
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
 hold(s,{...spec,step:'lookOrder',data:{...spec.data,left,built:[],rest}},
  left.map(uid=>({type:'iys',mode:'next',uid})));
 return true;
}
function beginLook(pack,s,job,spec){
 const pl=plOf(s,job.owner);
 const n=Math.min(spec.count,pl.deck.length);
 if(!n)return;
 const window=pl.deck.slice(0,n);
 const matches=window.filter(c=>spec.pred(def(pack,c)));
 const data={uids:window.map(c=>c.uid),rest:spec.rest,dest:spec.dest,public:spec.public===true};
 if(!matches.length){offerOrder(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,data},data.uids,spec.rest);return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'lookPick',data},[
  {type:'iys',mode:'skip'},...matches.map(c=>({type:'iys',mode:'take',uid:c.uid}))]);
}
function destinations(s,owner,c){
 const d=def(A.pack,c),pl=plOf(s,owner),actions=[];
 for(const line of ['front','energy']){
  if(line==='front'&&d.frontForbidden)continue;
  if(line==='energy'&&(d.energyForbidden||d.energyLineForbidden))continue;
  for(const dest of A.destinations(pl,line)){
   const action={type:'iys',mode:'deploy',uid:c.uid,line,slot:dest.slot};
   if(dest.replaceUid)action.replaceUid=dest.replaceUid;
   actions.push(action);
  }
 }
 return actions;
}
function offerDeploy(s,spec,cards,extra){
 const actions=cards.flatMap(c=>destinations(s,spec.player,c));
 if(!actions.length)return false;
 hold(s,{...spec,step:'deploy',data:{...(spec.data||{}),...(extra||{})}},
  [{type:'iys',mode:'skip'},...actions]);
 return true;
}
function purpleRest(d,maxEnergy,ap,traitless){
 return d.type==='character'&&d.color==='purple'&&d.energy<=maxEnergy&&d.ap===ap&&
  (!traitless||!(d.traits||[]).length);
}
function offerPurple(pack,s,job,maxEnergy,ap,traitless,follow){
 const cards=plOf(s,job.owner).outside.filter(c=>purpleRest(def(pack,c),maxEnergy,ap,traitless));
 return offerDeploy(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},cards,{follow:follow||null});
}
function frontChars(s,owner,pred){
 return plOf(s,owner).front.filter(c=>c&&def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function offerFront(s,spec,owner,pred,optional,step){
 const pool=frontChars(s,owner,pred);
 if(!pool.length)return false;
 hold(s,{...spec,step},[
  ...(optional?[{type:'iys',mode:'skip'}]:[]),
  ...pool.map(c=>({type:'iys',mode:'pick',uid:c.uid}))]);
 return true;
}
function offerHand(s,spec,optional){
 const hand=plOf(s,spec.player).hand;
 if(!hand.length)return false;
 hold(s,{...spec,step:'discard'},[
  ...(optional?[{type:'iys',mode:'skip'}]:[]),
  ...hand.map(c=>({type:'iys',mode:'discard',uid:c.uid}))]);
 return true;
}
function apChoices(s,owner){
 const actions=[];
 plOf(s,owner).apCards.forEach((c,index)=>{
  if(c.inPlay&&!c.ready)actions.push({type:'iys',mode:'ap',index});
 });
 return actions;
}
function readyIndex(s,owner,index){
 const c=plOf(s,owner).apCards[index];
 if(c?.inPlay)c.ready=true;
}
function offerAp(s,spec){
 const actions=apChoices(s,spec.player);
 if(!actions.length)return false;
 if(actions.length===1){readyIndex(s,spec.player,actions[0].index);return false;}
 hold(s,{...spec,step:'ap'},actions);
 return true;
}
function narakuCount(s,owner){
 return chars(s,owner,c=>cardHasTrait(def(A.pack,c),TRAIT)).length;
}
function coral(s,owner){return chars(s,owner,c=>named(A.pack,c,'珊瑚',s)).length>0;}
function nameOn(s,owner,name){return chars(s,owner,c=>named(A.pack,c,name,s)).length>0;}

function finishLookTake(pack,s,q,a){
 const data=q.data;
 const rest=data.uids.filter(uid=>uid!==(a.mode==='take'?a.uid:null));
 if(a.mode==='take'){
  moveUid(pack,s,q.player,'deck',a.uid,data.dest,q.sourceUid);
  if(data.public){
   const physical=plOf(s,q.player).hand.find(c=>c.uid===a.uid);
   if(physical)publish(pack,s,q.player,physical);
  }
 }
 offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data},rest,data.rest);
}
function finishOrder(s,q,a){
 const left=q.data.left.filter(uid=>uid!==a.uid);
 const built=[...q.data.built,a.uid];
 if(left.length===1){lay(plOf(s,q.player),[...built,...left],q.data.rest);return;}
 if(!left.length){lay(plOf(s,q.player),built,q.data.rest);return;}
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'lookOrder',
  data:{...q.data,left,built}},left.map(uid=>({type:'iys',mode:'next',uid})));
}
function afterDeploy(pack,s,q,a){
 if(a.mode==='skip')return;
 A.enter(pack,s,{owner:q.player,from:'outside',uid:a.uid,line:a.line,slot:a.slot,
  replaceUid:a.replaceUid,ready:false,sourceUid:q.sourceUid});
 if(q.data?.follow==='mainEnd'){
  const entered=selfOf(s,q.player,a.uid);
  if(entered)s.delayedEffects.push({op:'retireAtMainEnd',owner:q.player,sourceUid:entered.uid,
   fieldEntryStamp:entered.fieldEntryStamp,turn:s.turn});
 }
}
function offerTuck(pack,s,spec){
 const outside=plOf(s,spec.player).outside.filter(c=>tuckable(def(pack,c)));
 const home=hosts(s,spec.player);
 if(!outside.length||!home.length)return false;
 hold(s,{...spec,step:'tuckCard',data:{optional:spec.optional===true}},[
  ...(spec.optional?[{type:'iys',mode:'skip'}]:[]),
  ...outside.map(c=>({type:'iys',mode:'card',uid:c.uid}))]);
 return true;
}
function offerHost(s,spec,uid){
 const home=hosts(s,spec.player);
 if(home.length===1){tuck(A.pack,s,spec.player,'outside',uid,home[0],spec.sourceUid);return false;}
 hold(s,{...spec,step:'tuckHost',data:{uid}},home.map(c=>({type:'iys',mode:'host',uid:c.uid})));
 return true;
}
function offerRemoveEvents(s,spec){
 const events=plOf(s,spec.player).outside.filter(c=>cardCountsAsEvent(def(A.pack,c)));
 hold(s,{...spec,step:'removeEvents',data:{removed:spec.data?.removed||0}},[
  {type:'iys',mode:'done'},
  ...events.map(c=>({type:'iys',mode:'remove',uid:c.uid}))]);
 return true;
}
function capOf(s,owner,removed){
 return coral(s,owner)?2500+500*removed:2500;
}
function offerCapRetire(pack,s,spec,cap){
 const pool=frontChars(s,1-spec.player,c=>A.bp(pack,s,c)<=cap);
 if(!pool.length)return false;
 hold(s,{...spec,step:'retireCap'},[
  {type:'iys',mode:'skip'},...pool.map(c=>({type:'iys',mode:'pick',uid:c.uid}))]);
 return true;
}
function allNaraku(s,owner){
 const mine=chars(s,owner);
 return mine.length>0&&mine.every(c=>cardHasTrait(def(A.pack,c),TRAIT));
}
function placeHand(pack,s,job){
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 const home=hosts(s,job.owner);
 const actions=hand.flatMap(c=>[
  {type:'iys',mode:'outside',uid:c.uid},
  ...(home.length?[{type:'iys',mode:'under',uid:c.uid}]:[])
 ]);
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'handPlace'},actions);
}
function offerOppBottom(s,owner,sourceUid,id){
 const foe=1-owner;
 const events=plOf(s,foe).outside.filter(c=>cardCountsAsEvent(def(A.pack,c)));
 if(!events.length)return;
 if(events.length===1){layBottom(s,foe,[events[0].uid]);return;}
 hold(s,{player:foe,sourceUid,id,step:'oppBottom',data:{need:2,left:events.map(c=>c.uid),built:[]}},
  events.map(c=>({type:'iys',mode:'next',uid:c.uid})));
}
function layBottom(s,owner,uids){lay(plOf(s,owner),uids,'bottom');}
function continueBottom(s,q,a){
 const left=q.data.left.filter(uid=>uid!==a.uid);
 const built=[...q.data.built,a.uid];
 if(built.length>=q.data.need||!left.length){layBottom(s,q.player,built);return;}
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'oppBottom',data:{...q.data,left,built}},
  left.map(uid=>({type:'iys',mode:'next',uid})));
}
function offerOwnRetire(s,spec){
 const pool=chars(s,spec.player);
 if(!pool.length)return false;
 hold(s,{...spec,step:'retireOwn'},pool.map(c=>({type:'iys',mode:'pick',uid:c.uid})));
 return true;
}
function maybeTuckEvent(pack,s,job){
 const home=hosts(s,job.owner);
 const event=plOf(s,job.owner).outside.find(c=>c.uid===job.sourceUid);
 if(!home.length||!event)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'tuckEvent'},[
  {type:'iys',mode:'skip'},...home.map(c=>({type:'iys',mode:'host',uid:c.uid}))]);
}
function kit(s,owner,c){
 A.active(s,owner,c);
 buff(s,c,1000);
 impact(s,c);
}
function offerInuRest(s,spec,next){
 const pool=frontChars(s,spec.player,c=>c.ready&&named(A.pack,c,'犬夜叉',s));
 if(!pool.length)return false;
 hold(s,{...spec,step:'restInu',data:{next}},[
  ...(next==='optional'?[{type:'iys',mode:'skip'}]:[]),
  ...pool.map(c=>({type:'iys',mode:'pick',uid:c.uid}))]);
 return true;
}

function runPlay(pack,s,job){
 const id=job.id,owner=job.owner;
 if(id==='IYS-1-005')return beginLook(pack,s,job,{count:2,rest:'top',dest:'outside',pred:traitlessPurple});
 if(id==='IYS-1-008'||id==='IYS-1-009')return offerPurple(pack,s,job,3,1,true);
 if(id==='IYS-1-010'){
  const cards=plOf(s,owner).outside.filter(c=>traitlessPurple(def(pack,c))&&def(pack,c).energy<=4);
  if(!cards.length)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'recover'},[
   {type:'iys',mode:'skip'},...cards.map(c=>({type:'iys',mode:'take',uid:c.uid}))]);
  return;
 }
 if(id==='IYS-1-013'){
  if(job.entryCause!=='outsideEffect'&&job.entryCause!=='outsideEffectRaid')return;
  const pool=chars(s,owner,c=>!c.ready&&named(pack,c,'殺生丸',s));
  if(!pool.length)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'activeName'},[
   {type:'iys',mode:'skip'},...pool.map(c=>({type:'iys',mode:'pick',uid:c.uid}))]);
  return;
 }
 if(id==='IYS-1-014')return beginLook(pack,s,job,{count:3,rest:'bottom',dest:'hand',public:true,
  pred:d=>cardHasTrait(d,TRAIT)});
 if(id==='IYS-1-019')return offerPurple(pack,s,job,2,1,false,'mainEnd');
 if(id==='IYS-1-022'){A.draw(pack,s,owner,1,job.sourceUid);placeHand(pack,s,job);return;}
 if(id==='IYS-1-030'){
  if(!allNaraku(s,owner)||!plOf(s,owner).deck.length)return;
  const top=plOf(s,owner).deck[0];
  const home=hosts(s,owner);
  if(!home.length)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'topOrUnder',data:{uid:top.uid}},[
   {type:'iys',mode:'top'},...home.map(c=>({type:'iys',mode:'host',uid:c.uid}))]);
  return;
 }
 if(id==='IYS-1-033'){
  A.draw(pack,s,owner,2,job.sourceUid);
  if(nameOn(s,owner,'奈落'))offerOppBottom(s,owner,job.sourceUid,id);
  return;
 }
 if(id==='IYS-1-035'){
  const scale=narakuCount(s,owner);
  offerFront(s,{player:owner,sourceUid:job.sourceUid,id,data:{scale}},1-owner,()=>true,false,'debuff');
  return;
 }
 if(id==='IYS-1-036')return offerPurple(pack,s,job,3,1,true);
 if(id==='IYS-1-039'){
  const spec={player:owner,sourceUid:job.sourceUid,id};
  if(offerAp(s,{...spec,data:{next:'drawRetire'}}))return;
  A.draw(pack,s,owner,2,job.sourceUid);
  if(!offerOwnRetire(s,spec))maybeTuckEvent(pack,s,job);
  return;
 }
 if(id==='IYS-1-054'){
  if(!nameOn(s,owner,'日暮 かごめ'))return;
  const self=selfOf(s,owner,job.sourceUid);
  if(!self)return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'mayActive'},[
   {type:'iys',mode:'skip'},{type:'iys',mode:'active'}]);
  return;
 }
 if(id==='IYS-1-056')return beginLook(pack,s,job,{count:2,rest:'top',dest:'outside',pred:redEvent});
 if(id==='IYS-1-058')return beginLook(pack,s,job,{count:3,rest:'bottom',dest:'outside',pred:redEvent});
 if(id==='IYS-1-059'){
  if(!nameOn(s,owner,'弥勒')){A.draw(pack,s,owner,1,job.sourceUid);offerHand(s,{player:owner,sourceUid:job.sourceUid,id},false);return;}
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'drawCount'},[
   {type:'iys',mode:'one'},{type:'iys',mode:'two'}]);
  return;
 }
 if(id==='IYS-1-071')return offerRemoveEvents(s,{player:owner,sourceUid:job.sourceUid,id,data:{removed:0}});
 if(id==='IYS-1-074'){
  A.draw(pack,s,owner,1,job.sourceUid);
  const pool=chars(s,owner,c=>named(pack,c,'犬夜叉',s));
  const spec={player:owner,sourceUid:job.sourceUid,id};
  if(pool.length)hold(s,{...spec,step:'buffInu'},[
   {type:'iys',mode:'skip'},...pool.map(c=>({type:'iys',mode:'pick',uid:c.uid}))]);
  else offerInuRest(s,spec,'optional');
  return;
 }
 if(id==='IYS-1-075'){
  const pool=chars(s,owner);
  const spec={player:owner,sourceUid:job.sourceUid,id};
  if(pool.length)hold(s,{...spec,step:'buffAny'},[
   {type:'iys',mode:'skip'},...pool.map(c=>({type:'iys',mode:'pick',uid:c.uid}))]);
  else if(nameOn(s,owner,'七宝'))offerAp(s,spec);
  return;
 }
 if(id==='IYS-1-077'){
  offerFront(s,{player:owner,sourceUid:job.sourceUid,id},1-owner,c=>A.bp(pack,s,c)<=5000,true,'retireBp');
  return;
 }
 if(id==='IYS-1-078'){if(nameOn(s,owner,'弥勒'))offerAp(s,{player:owner,sourceUid:job.sourceUid,id});return;}
 if(id==='IYS-1-080')offerFront(s,{player:owner,sourceUid:job.sourceUid,id},1-owner,()=>true,false,'restFoe');
}
function runOther(pack,s,job){
 const id=job.id,owner=job.owner;
 if(id==='IYS-1-007'&&job.slot==='onAttack'){
  if(!fromOutsideThisTurn(s,owner))return;
  hold(s,{player:owner,sourceUid:job.sourceUid,id,step:'mayDraw'},[
   {type:'iys',mode:'skip'},{type:'iys',mode:'draw'}]);
  return;
 }
 if(id==='IYS-1-054'&&job.slot==='attackEnd'){
  const c=selfOf(s,owner,job.sourceUid);
  if(c&&A.bp(pack,s,c)<=4000)A.bounce(pack,s,owner,c.uid,job.sourceUid);
  return;
 }
 if(id==='IYS-1-080'&&job.slot==='moved'){
  if(coral(s,owner))A.draw(pack,s,owner,1,job.sourceUid);
  return;
 }
 if(id==='IYS-1-028'&&job.slot==='reenter'){
  const base=plOf(s,owner).outside.find(c=>c.uid===job.baseUid);
  if(!base||def(pack,base).energy>2)return;
  offerDeploy(s,{player:owner,sourceUid:job.sourceUid,id},[base]);
 }
}

export function runIysJob(pack,s,job){
 arm(pack);
 if(job.slot==='onPlay'||job.slot==='after')runPlay(pack,s,job);
 else runOther(pack,s,job);
}

function others(s,owner,self,trait){
 return chars(s,owner,c=>c.uid!==self.uid&&cardHasTrait(def(A.pack,c),trait));
}
function frontLine(s,owner,c){return locOf(s,owner,c.uid)?.line==='front';}

export function legalIysActivations(pack,s,owner,c){
 arm(pack);
 if(s.phase!=='main'||s.active!==owner||!live(s,c))return [];
 const d=def(pack,c);
 if(d.mainAbility?.op!=='iysMain')return [];
 const id=d.id;
 const push=mode=>({type:'activate',uid:c.uid,mode});
 const once=key=>!used(s,key);
 const out=[];
 if(id==='IYS-1-018'&&once(c.uid+'|main')&&others(s,owner,c,TRAIT).length)out.push(push('iys:0'));
 if(id==='IYS-1-022'&&!locked(s,owner,'神無')&&
  plOf(s,owner).outside.some(x=>tuckable(def(pack,x)))&&hosts(s,owner).length)out.push(push('iys:0'));
 if(id==='IYS-1-027'&&once(c.uid+'|main')&&chars(s,owner,x=>cardHasTrait(def(pack,x),TRAIT)).length)
  out.push(push('iys:0'));
 if(id==='IYS-1-028'&&once(c.uid+'|main')&&
  plOf(s,owner).outside.some(x=>tuckable(def(pack,x)))&&hosts(s,owner).length)out.push(push('iys:0'));
 if(id==='IYS-1-032'&&c.ready&&plOf(s,owner).outside.some(x=>tuckable(def(pack,x)))&&hosts(s,owner).length)
  out.push(push('iys:0'));
 if(id==='IYS-1-043'&&once(c.uid+'|main')&&restedByOwn(s,owner,c))out.push(push('iys:0'));
 if(id==='IYS-1-044'&&frontLine(s,owner,c)){
  if(once(c.uid+'|0')&&!c.ready)out.push(push('iys:0'));
  if(once(c.uid+'|1')&&plOf(s,owner).outside.some(x=>def(pack,x).name==='鉄砕牙'))out.push(push('iys:1'));
 }
 if(id==='IYS-1-045'&&once(c.uid+'|main')&&restedByOwn(s,owner,c))out.push(push('iys:0'));
 if(id==='IYS-1-046'&&once(c.uid+'|main')&&restedByOwn(s,owner,c))out.push(push('iys:0'));
 if(id==='IYS-1-049'&&once(c.uid+'|main')&&enteredThisTurn(s,owner,c)&&
  frontChars(s,owner,x=>x.ready&&named(pack,x,'犬夜叉',s)).length)out.push(push('iys:0'));
 if(id==='IYS-1-061'&&c.ready)out.push(push('iys:0'));
 if(id==='IYS-1-066'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&
  frontChars(s,owner,x=>x.ready&&named(pack,x,'犬夜叉',s)).length)out.push(push('iys:0'));
 if(id==='IYS-1-070'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&coral(s,owner)&&
  plOf(s,owner).outside.some(x=>cardCountsAsEvent(def(pack,x))))out.push(push('iys:0'));
 return out;
}

function startMain(pack,s,c,mode){
 const owner=s.active,id=def(pack,c).id;
 const spec={player:owner,sourceUid:c.uid,id};
 if(id==='IYS-1-018'){
  use(s,c.uid+'|main');
  const pool=others(s,owner,c,TRAIT);
  hold(s,{...spec,step:'grantBlock'},[
   {type:'iys',mode:'skip'},...pool.map(x=>({type:'iys',mode:'pick',uid:x.uid}))]);
  return;
 }
 if(id==='IYS-1-022'){lock(s,owner,'神無');offerTuck(pack,s,spec);return;}
 if(id==='IYS-1-027'){
  use(s,c.uid+'|main');
  const foe=frontChars(s,1-owner);
  if(foe.length)hold(s,{...spec,step:'debuffOptional'},[
   {type:'iys',mode:'skip'},...foe.map(x=>({type:'iys',mode:'pick',uid:x.uid}))]);
  else{A.active(s,owner,c);impact(s,c);offerNarakuRetire(s,spec,false);}
  return;
 }
 if(id==='IYS-1-028'){use(s,c.uid+'|main');offerTuck(pack,s,spec);return;}
 if(id==='IYS-1-032'){restOwn(s,owner,c);offerTuck(pack,s,spec);return;}
 if(id==='IYS-1-043'){use(s,c.uid+'|main');A.active(s,owner,c);buff(s,c,1000);return;}
 if(id==='IYS-1-044'&&mode==='iys:0'){use(s,c.uid+'|0');A.active(s,owner,c);return;}
 if(id==='IYS-1-044'&&mode==='iys:1'){
  use(s,c.uid+'|1');
  const swords=plOf(s,owner).outside.filter(x=>def(pack,x).name==='鉄砕牙');
  if(swords.length===1)tuck(pack,s,owner,'outside',swords[0].uid,c,c.uid);
  else hold(s,{...spec,step:'tuckSelf'},swords.map(x=>({type:'iys',mode:'card',uid:x.uid})));
  return;
 }
 if(id==='IYS-1-045'){use(s,c.uid+'|main');A.active(s,owner,c);return;}
 if(id==='IYS-1-046'){
  use(s,c.uid+'|main');
  if(!enteredThisTurn(s,owner,c)){kit(s,owner,c);return;}
  hold(s,{...spec,step:'replaceKit'},[{type:'iys',mode:'kit'},{type:'iys',mode:'double'}]);
  return;
 }
 if(id==='IYS-1-049'){use(s,c.uid+'|main');offerInuRest(s,spec,'fork');return;}
 if(id==='IYS-1-061'){
  restOwn(s,owner,c);
  const paused=retireUid(pack,s,owner,c.uid);
  if(paused)return;
  const cards=plOf(s,owner).outside.filter(x=>def(pack,x).type==='character'&&
   def(pack,x).color==='red'&&def(pack,x).energy===0&&def(pack,x).name!=='七宝');
  offerDeploy(s,spec,cards);
  return;
 }
 if(id==='IYS-1-066'){use(s,c.uid+'|main');offerInuRest(s,spec,'blockBuff');return;}
 if(id==='IYS-1-070'){
  use(s,c.uid+'|main');
  const events=plOf(s,owner).outside.filter(x=>cardCountsAsEvent(def(pack,x)));
  hold(s,{...spec,step:'removeOne'},events.map(x=>({type:'iys',mode:'remove',uid:x.uid})));
 }
}
function offerNarakuRetire(s,spec,excludeSelf){
 const pool=chars(s,spec.player,c=>(!excludeSelf||c.uid!==spec.sourceUid)&&cardHasTrait(def(A.pack,c),TRAIT));
 if(!pool.length)return false;
 if(pool.length===1)return retireUid(A.pack,s,spec.player,pool[0].uid);
 hold(s,{...spec,step:'retireNaraku'},pool.map(c=>({type:'iys',mode:'pick',uid:c.uid})));
 return true;
}
function afterDebuff(pack,s,q){
 const self=selfOf(s,q.player,q.sourceUid);
 if(self){A.active(s,q.player,self);impact(s,self);}
 offerNarakuRetire(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},false);
}
function afterInuRest(pack,s,q,uid,next){
 const c=selfOf(s,q.player,uid);
 if(!restOwn(s,q.player,c))return;
 if(next==='fork'){
  const foe=frontChars(s,1-q.player);
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'kikyoFork'},[
   {type:'iys',mode:'buff'},
   {type:'iys',mode:'skip'},
   ...foe.map(x=>({type:'iys',mode:'rest',uid:x.uid}))]);
  return;
 }
 if(next==='blockBuff'){
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)ceiling(s,self,self);
  const pool=chars(s,q.player,x=>x.uid!==q.sourceUid);
  if(!pool.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'buffOther'},[
   {type:'iys',mode:'skip'},...pool.map(x=>({type:'iys',mode:'pick',uid:x.uid}))]);
  return;
 }
 if(next==='optional')offerAp(s,{player:q.player,sourceUid:q.sourceUid,id:q.id});
}
function afterBuffInu(s,q){
 offerInuRest(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},'optional');
}
function afterBuffAny(s,q){
 if(nameOn(s,q.player,'七宝'))offerAp(s,{player:q.player,sourceUid:q.sourceUid,id:q.id});
}

export function activateIys(pack,s,action){
 arm(pack);
 const owner=s.active,c=selfOf(s,owner,action.uid);
 if(!c)throw Error('Inuyasha activator left');
 const legal=legalIysActivations(pack,s,owner,c).some(a=>a.uid===action.uid&&a.mode===action.mode);
 if(!legal)throw Error('Inuyasha activation is not legal');
 startMain(pack,s,c,action.mode);
 go(pack,s);
}

export function legalIysPending(pack,s){
 arm(pack);
 return s.pending?.actions||[];
}

export function resolveIysPending(pack,s,action){
 arm(pack);
 const q=s.pending;
 const a=takeAction(q,action);
 s.pending=null;
 const step=q.step;
 if(step==='leave'){
  if(a.mode==='hand')A.bounce(pack,s,q.player,q.sourceUid,q.sourceUid);
  else if(q.data.mode==='remove')A.removeSkip(pack,s,q.player,q.data.line,q.data.slot,q.player);
  else A.retireSkip(pack,s,q.player,q.data.line,q.data.slot);
 }else if(step==='lookPick')finishLookTake(pack,s,q,a);
 else if(step==='lookOrder')finishOrder(s,q,a);
 else if(step==='deploy')afterDeploy(pack,s,q,a);
 else if(step==='recover'&&a.mode==='take')moveUid(pack,s,q.player,'outside',a.uid,'hand',q.sourceUid);
 else if(step==='activeName'&&a.mode==='pick'){
  const c=selfOf(s,q.player,a.uid);if(c)A.active(s,q.player,c);
 }else if(step==='handPlace'){
  if(a.mode==='outside')moveUid(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
  else if(hosts(s,q.player).length===1)tuck(pack,s,q.player,'hand',a.uid,hosts(s,q.player)[0],q.sourceUid);
  else hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'handHost',data:{uid:a.uid}},
   hosts(s,q.player).map(c=>({type:'iys',mode:'host',uid:c.uid})));
 }else if(step==='handHost')tuck(pack,s,q.player,'hand',q.data.uid,selfOf(s,q.player,a.uid),q.sourceUid);
 else if(step==='tuckCard'&&a.mode==='card')offerHost(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},a.uid);
 else if(step==='tuckHost')tuck(pack,s,q.player,'outside',q.data.uid,selfOf(s,q.player,a.uid),q.sourceUid);
 else if(step==='tuckSelf'){
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)tuck(pack,s,q.player,'outside',a.uid,self,q.sourceUid);
 }else if(step==='tuckEvent'&&a.mode==='host'){
  const host=selfOf(s,q.player,a.uid);
  const event=plOf(s,q.player).outside.find(c=>c.uid===q.sourceUid);
  if(host&&event)tuck(pack,s,q.player,'outside',event.uid,host,q.sourceUid);
 }else if(step==='topOrUnder'){
  if(a.mode==='host')tuck(pack,s,q.player,'deck',q.data.uid,selfOf(s,q.player,a.uid),q.sourceUid);
 }else if(step==='oppBottom')continueBottom(s,q,a);
 else if(step==='debuff'&&a.mode==='pick'){
  const c=selfOf(s,1-q.player,a.uid);buff(s,c,-1000*(q.data.scale||0));
 }else if(step==='retireOwn'&&a.mode==='pick'){
  retireUid(pack,s,q.player,a.uid);
  if(!s.pending&&q.id==='IYS-1-039')maybeTuckEvent(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id});
 }else if(step==='mayActive'&&a.mode==='active'){
  const c=selfOf(s,q.player,q.sourceUid);
  if(c){A.active(s,q.player,c);c.iysReturnIfBp={turn:s.turn,max:4000};}
 }else if(step==='mayDraw'&&a.mode==='draw')A.draw(pack,s,q.player,1,q.sourceUid);
 else if(step==='drawCount'){
  A.draw(pack,s,q.player,a.mode==='two'?2:1,q.sourceUid);
  offerHand(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},false);
 }else if(step==='discard'&&a.mode==='discard')moveUid(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
 else if(step==='removeEvents'){
  if(a.mode==='remove'){
   moveUid(pack,s,q.player,'outside',a.uid,'removed',q.sourceUid);
   offerRemoveEvents(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:{removed:(q.data.removed||0)+1}});
  }else offerCapRetire(pack,s,{player:q.player,sourceUid:q.sourceUid,id:q.id},capOf(s,q.player,q.data.removed||0));
 }else if(step==='retireCap'&&a.mode==='pick')retireUid(pack,s,1-q.player,a.uid);
 else if(step==='ap')readyIndex(s,q.player,a.index);
 else if(step==='ap'&&q.data?.next==='drawRetire'){}
 else if(step==='grantBlock'){
  if(a.mode==='pick'){
   const target=selfOf(s,q.player,a.uid);
   const source=selfOf(s,q.player,q.sourceUid);
   if(target&&source)ceiling(s,source,target);
  }
  offerNarakuRetire(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},true);
 }else if(step==='retireNaraku')retireUid(pack,s,q.player,a.uid);
 else if(step==='debuffOptional'){
  if(a.mode==='pick'){const c=selfOf(s,1-q.player,a.uid);buff(s,c,-1000);}
  afterDebuff(pack,s,q);
 }else if(step==='replaceKit'){
  const c=selfOf(s,q.player,q.sourceUid);
  if(c&&a.mode==='double'){A.active(s,q.player,c);doubleAttack(s,c);}
  else if(c)kit(s,q.player,c);
 }else if(step==='restInu'&&a.mode==='pick')afterInuRest(pack,s,q,a.uid,q.data.next);
 else if(step==='kikyoFork'){
  const self=selfOf(s,q.player,q.sourceUid);
  if(a.mode==='buff'&&self){A.active(s,q.player,self);buff(s,self,1000);}
  if(a.mode==='rest')restAny(selfOf(s,1-q.player,a.uid));
 }else if(step==='buffOther'&&a.mode==='pick')buff(s,selfOf(s,q.player,a.uid),1000);
 else if(step==='removeOne'){
  moveUid(pack,s,q.player,'outside',a.uid,'removed',q.sourceUid);
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)ceiling(s,self,self);
 }else if(step==='buffInu'){
  if(a.mode==='pick')buff(s,selfOf(s,q.player,a.uid),1000);
  afterBuffInu(s,q);
 }else if(step==='buffAny'){
  if(a.mode==='pick')buff(s,selfOf(s,q.player,a.uid),2000);
  afterBuffAny(s,q);
 }else if(step==='retireBp'&&a.mode==='pick')retireUid(pack,s,1-q.player,a.uid);
 else if(step==='restFoe'&&a.mode==='pick')restAny(selfOf(s,1-q.player,a.uid));
 if(q.data?.next==='drawRetire'&&step==='ap'&&!s.pending){
  A.draw(pack,s,q.player,2,q.sourceUid);
  if(!offerOwnRetire(s,{player:q.player,sourceUid:q.sourceUid,id:q.id}))
   maybeTuckEvent(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id});
 }
 go(pack,s);
}
