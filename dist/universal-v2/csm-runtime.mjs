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
  a?.replaceUid??null,a?.index??null]);
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
function retireUid(pack,s,owner,uid){
 const loc=locOf(s,owner,uid);
 if(!loc)return false;
 return A.retire(pack,s,owner,loc.line,loc.slot)===true;
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
 if(!matches.length){offerOrder(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,data},
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
 if(data.discard&&a.mode==='take'){
  const hand=plOf(s,q.player).hand.filter(c=>c.uid!==a.uid);
  if(hand.length){
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'discard',
    data:{...data,left:rest,takenUid:a.uid,takenName:taken?def(pack,taken).name:null}},
    hand.map(c=>({type:'csm',mode:'discard',uid:c.uid})));
   return;
  }
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
 if(q.id==='CSM-1-035'){
  if(is(MAKIMA)){
   const dates=plOf(s,q.player).outside.filter(c=>named(pack,c,DATE,s));
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'recover',
    data:{...q.data,left:rest}},[
    {type:'csm',mode:'skip'},...dates.map(c=>({type:'csm',mode:'take',uid:c.uid}))]);
   return;
  }
  if(is(REZE)){
   const denji=plOf(s,q.player).outside.filter(c=>named(pack,c,DENJI,s)&&def(pack,c).energy<=1);
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'recover',
    data:{...q.data,left:rest}},[
    {type:'csm',mode:'skip'},...denji.map(c=>({type:'csm',mode:'take',uid:c.uid}))]);
   return;
  }
 }
 if(q.id==='CSM-1-033'&&!is(REZE)){
  const hand=plOf(s,q.player).hand.filter(c=>c.uid!==taken.uid);
  if(hand.length){
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'discard',
    data:{...q.data,left:rest}},hand.map(c=>({type:'csm',mode:'discard',uid:c.uid})));
   return;
  }
 }
 offerOrder(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:q.data},rest,q.data.rest);
}
function finishOrder(s,q,a){
 const left=q.data.left.filter(uid=>uid!==a.uid);
 const built=[...q.data.built,a.uid];
 if(left.length<=1){lay(plOf(s,q.player),[...built,...left],q.data.rest);return;}
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'lookOrder',
  data:{...q.data,left,built}},left.map(uid=>({type:'csm',mode:'next',uid})));
}
function destinations(s,owner,c,lines){
 const d=def(A.pack,c),pl=plOf(s,owner),actions=[];
 for(const line of lines||['front','energy']){
  if(line==='front'&&d.frontForbidden)continue;
  for(const dest of A.destinations(pl,line)){
   const action={type:'csm',mode:'deploy',uid:c.uid,line,slot:dest.slot};
   if(dest.replaceUid)action.replaceUid=dest.replaceUid;
   actions.push(action);
  }
 }
 return actions;
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
function peelFacedown(pack,s,owner,host,to,sourceUid){
 const under=csmFacedowns(host);
 if(!under.length)return null;
 const physical=under[under.length-1];
 host.under=host.under.filter(c=>c.uid!==physical.uid);
 physical.faceDown=false;
 if(to==='hand')plOf(s,owner).hand.push(physical);
 else if(to==='outside')plOf(s,owner).outside.push(physical);
 A.record(pack,s,{physical,owner,from:'raid-under',to,reason:'own-effect',
  sourceUid,attachedToUid:host.uid,wasFaceDown:true});
 return physical;
}
function nameOn(s,owner,name){return chars(s,owner,c=>named(A.pack,c,name,s)).length>0;}
function eventsUsed(s,owner){
 return csmEventUseCount(s,owner,c=>def(A.pack,c));
}
function otherEventsUsed(s,owner,exceptUid){
 return (s.zoneMoveEvents||[]).filter(e=>{
  if(e.turn!==s.turn||e.owner!==owner||e.controller!==owner||e.uid===exceptUid||
   e.from!=='hand'||e.reason!=='rule')return false;
  const d=def(A.pack,{uid:e.uid,cardId:e.cardId});
  return d.type==='event'||d.alsoEvent===true;
 }).length;
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
  const cards=plOf(s,owner).hand.filter(c=>{
   const d=def(pack,c);
   if(d.energy>2||d.ap!==1||d.color!=='purple')return false;
   if(d.type==='field')return d.name===CAFE;
   return d.type==='character'&&(named(pack,c,REZE,s)||named(pack,c,DENJI,s));
  });
  offerDeploy(s,spec,cards,{from:'hand',ready:false,optional:true});
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
  hold(s,{...spec,step:'choose'},[
   {type:'csm',mode:'aura'},
   ...(!locked(s,owner,'dateDraw')?[{type:'csm',mode:'draw'}]:[])]);
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
  if(!foe.length)return;
  hold(s,{...spec,step:'retireFoe',data:{thenBuff:otherEventsUsed(s,owner,job.sourceUid)>0}},
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
  const byOwn=job.by===owner||job.reason==='own-effect'||
   (s.zoneMoveEvents||[]).some(e=>e.uid===job.sourceUid&&e.turn===s.turn&&
    e.reason==='retirement'&&e.controller===owner);
  // Default draw; may replace with look when own-effect retirement.
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
  const energy=plOf(s,owner).energy.filter(c=>c&&def(pack,c).type==='character');
  if(!energy.length)return;
  hold(s,{...spec,step:'buffMoveFront'},[
   {type:'csm',mode:'skip'},...energy.map(c=>({type:'csm',mode:'pick',uid:c.uid}))]);
  return;
 }
 if(id==='CSM-1-068'){
  const chars2=plOf(s,owner).hand.filter(c=>def(pack,c).type==='character');
  const events=plOf(s,owner).hand.filter(c=>cardCountsAsEvent(def(pack,c)));
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

export function runCsmJob(pack,s,job){
 arm(pack);
 if(job.slot==='onPlay'||job.slot==='after')runPlay(pack,s,job);
 else if(job.slot==='onRetire')runRetire(pack,s,job);
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
   const energyPool=plOf(s,job.owner).energy.filter(c=>c&&def(pack,c).type==='character');
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
 }
 go(pack,s);
}

function runAttackEnd(pack,s,job){
 const owner=job.owner,self=selfOf(s,owner,job.sourceUid);
 if(job.id==='CSM-1-048'&&self&&csmFacedowns(self).length){
  A.active(s,owner,self);
  impact(s,self);
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
 if(id==='CSM-1-055'&&frontLine(s,owner,c)&&once(c.uid+'|main')&&plOf(s,owner).hand.length)
  out.push(push('csm:0'));
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
  const paused=retireUid(pack,s,owner,c.uid);
  if(paused)return go(pack,s);
  const pool=chars(s,owner,x=>named(pack,x,DENJI,s));
  hold(s,{...spec,step:'buffImpact'},[
   {type:'csm',mode:'skip'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
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
  const paused=retireUid(pack,s,owner,c.uid);
  if(paused)return go(pack,s);
  const pool=chars(s,owner,x=>named(pack,x,DENJI,s));
  hold(s,{...spec,step:'grantAttackDraw'},[
   {type:'csm',mode:'skip'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
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
  const paused=retireUid(pack,s,owner,c.uid);
  if(paused)return go(pack,s);
  const outs=plOf(s,owner).outside.filter(x=>named(pack,x,DENJI,s)&&
   def(pack,x).color==='red'&&def(pack,x).energy<=1);
  if(!outs.length)return go(pack,s);
  hold(s,{...spec,step:'denjiEnergy',data:{pochitaUid:jobSourceOutside(s,owner,c.uid)}},[
   {type:'csm',mode:'skip'},...outs.map(x=>({type:'csm',mode:'deploy',uid:x.uid}))]);
  go(pack,s);return;
 }
 if(id==='CSM-1-070'){
  use(s,c.uid+'|main');
  const pool=plOf(s,owner).energy.filter(x=>x&&def(pack,x).type==='character');
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
function jobSourceOutside(s,owner,uid){
 return plOf(s,owner).outside.find(c=>c.uid===uid)?.uid||null;
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
 else if(step==='discard'&&a.mode==='discard'){
  moveUid(pack,s,owner,'hand',a.uid,'outside',q.sourceUid);
  if(q.data?.left)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},
   q.data.left,q.data.rest);
  else if(q.id==='CSM-1-055')afterAkiDiscard(pack,s,q);
  else if(q.id==='CSM-1-059'){
   const self=selfOf(s,owner,q.sourceUid);
   if(self){self.buffs??=[];self.buffs.push({energy:1,untilTurn:s.turn});}
  }
 }else if(step==='buffOther'&&a.mode==='pick'){
  buff(s,selfOf(s,owner,a.uid),q.data?.bp||1000);
  if(q.data?.left)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:q.data},
   q.data.left,q.data.rest);
 }else if(step==='debuff'&&a.mode==='pick'){
  buff(s,selfOf(s,1-owner,a.uid),q.data?.bp||-1000);
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
  if(a.mode!=='skip')
   A.enter(pack,s,{owner,from:q.data?.from||'hand',uid:a.uid,line:a.line,slot:a.slot,
    ...(a.replaceUid?{replaceUid:a.replaceUid}:{}),ready:q.data?.ready===true,
    sourceUid:q.sourceUid,...(q.data?.skipOnPlay?{skipOnPlay:true}:{})});
 }else if(step==='choose')resolveChoose(pack,s,q,a);
 else if(step==='retireThenKit'&&a.mode==='pick'){
  const paused=retireUid(pack,s,owner,a.uid);
  if(paused)return go(pack,s);
  const self=selfOf(s,owner,q.sourceUid);
  if(self){A.active(s,owner,self);buff(s,self,1000);impact(s,self);}
  offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id},false);
 }else if(step==='retireThenChoose'){
  if(a.mode==='pick'){
   const paused=retireUid(pack,s,owner,a.uid);
   if(paused)return go(pack,s);
   hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'afterRetireChoose'},[
    {type:'csm',mode:'one'},{type:'csm',mode:'two'}]);
  }
 }else if(step==='afterRetireChoose'){
  if(a.mode==='one'){
   A.draw(pack,s,owner,1,q.sourceUid);
   offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},c=>c.uid!==q.sourceUid,true,'buffOther2k');
  }else A.draw(pack,s,owner,2,q.sourceUid);
 }else if(step==='buffOther2k'&&a.mode==='pick')buff(s,selfOf(s,owner,a.uid),2000);
 else if(step==='retireOwn'&&a.mode==='pick'){
  const paused=retireUid(pack,s,owner,a.uid);
  if(paused)return go(pack,s);
  if(q.id==='CSM-1-038'){offerAp(s,{player:owner,sourceUid:q.sourceUid,id:q.id,
   data:{next:'draw2'}},false);}
 }else if(step==='retireFoe'&&a.mode==='pick'){
  retireUid(pack,s,1-owner,a.uid);
  if(q.data?.thenBuff)offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},
   null,true,'buffOther');
  if(q.data?.peelAki)offerPeelAki(pack,s,q);
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
  if(a.mode==='block')offerChars(s,{player:owner,sourceUid:q.sourceUid,id:q.id},null,false,'grantBlock3k');
  else beginLook(pack,s,{owner,sourceUid:q.sourceUid,id:q.id},{count:3,rest:'bottom',
   dest:'hand',public:true,discard:false,pred:d=>named(pack,{uid:d.uid,cardId:d.id}?d:
    {uid:'x',cardId:d.id||''},AKI,s)||false});
  // Fix aki look - use proper pred below via helper
  if(a.mode==='search')startAkiSearch(pack,s,q);
 }else if(step==='grantBlock3k'&&a.mode==='pick'){
  unblocked(s,selfOf(s,owner,a.uid),3000);
  lock(s,owner,'akiBlock');
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
 }else if(step==='mayRetire'&&a.mode==='retire')retireUid(pack,s,owner,q.sourceUid);
 else if(step==='buffMoveFront'&&a.mode==='pick'){
  const t=selfOf(s,owner,a.uid);
  if(t){buff(s,t,2000);moveToFront(pack,s,owner,t,q.sourceUid);}
 }else if(step==='payReturn')resolvePayReturn(pack,s,q,a);
 else if(step==='pochita'&&a.mode==='deploy'){
  const card=plOf(s,owner).outside.find(c=>c.uid===q.data.uid);
  if(card)offerDeploy(s,{player:owner,sourceUid:q.sourceUid,id:q.id},[card],
   {from:'outside',ready:false,lines:['energy'],optional:false});
 }else if(step==='denjiEnergy'&&a.mode==='deploy'){
  A.enter(pack,s,{owner,from:'outside',uid:a.uid,line:'energy',slot:0,ready:true,
   sourceUid:q.sourceUid,skipOnPlay:true});
  // Find free energy slot properly
  const entered=selfOf(s,owner,a.uid);
  const pochita=q.data.pochitaUid&&plOf(s,owner).outside.find(c=>c.uid===q.data.pochitaUid);
  if(entered&&pochita)tuck(pack,s,owner,'outside',pochita.uid,entered,q.sourceUid);
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
   offerHand(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:{nextAp:otherEventsUsed(s,owner,q.sourceUid)>0}},false);
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
function resolveArrange(pack,s,q,a){
 const owner=q.player;
 if(a.mode==='keep'){
  const kept=[...(q.data.kept||[]),a.uid];
  const window=q.data.window.filter(uid=>uid!==a.uid);
  if(!window.length){
   lay(plOf(s,owner),kept,'top');
   if(q.data.follow==='dream')offerDreamDenji(pack,s,q);
   else if(q.id==='CSM-1-051')offerTuckUnderDenji(pack,s,{player:owner,
    sourceUid:q.sourceUid,id:q.id});
   return;
  }
  hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'arrange',
   data:{...q.data,window,kept}},[
   {type:'csm',mode:'done'},
   ...window.map(uid=>({type:'csm',mode:'keep',uid})),
   ...[...kept,...window].map(uid=>({type:'csm',mode:'outside',uid}))]);
  return;
 }
 if(a.mode==='outside'){
  const index=plOf(s,owner).deck.findIndex(c=>c.uid===a.uid);
  if(index>=0)A.move(pack,s,{owner,from:'deck',to:'outside',index,reason:'own-effect',
   sourceUid:q.sourceUid});
  const window=q.data.window.filter(uid=>uid!==a.uid);
  const kept=q.data.kept||[];
  if(!window.length){
   lay(plOf(s,owner),kept,'top');
   if(q.data.follow==='dream')offerDreamDenji(pack,s,q);
   else if(q.id==='CSM-1-051')offerTuckUnderDenji(pack,s,{player:owner,
    sourceUid:q.sourceUid,id:q.id});
   return;
  }
  hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'arrange',
   data:{...q.data,window,kept}},[
   {type:'csm',mode:'done'},
   ...window.map(uid=>({type:'csm',mode:'keep',uid})),
   ...window.map(uid=>({type:'csm',mode:'outside',uid}))]);
  return;
 }
 if(a.mode==='done'){
  lay(plOf(s,owner),[...(q.data.kept||[]),...q.data.window],'top');
  if(q.data.follow==='dream')offerDreamDenji(pack,s,q);
  else if(q.id==='CSM-1-051')offerTuckUnderDenji(pack,s,{player:owner,
   sourceUid:q.sourceUid,id:q.id});
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
function afterAkiDiscard(pack,s,q){
 const blocked=locked(s,q.player,'akiBlock');
 const searched=locked(s,q.player,'akiSearch');
 const actions=[];
 if(!blocked)actions.push({type:'csm',mode:'block'});
 if(!searched)actions.push({type:'csm',mode:'search'});
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
 const tmp=pl.front[fi];
 pl.front[fi]=pl.energy[ei];
 pl.energy[ei]=tmp;
 A.record(pack,s,{physical:pl.front[fi],owner,from:'energy',to:'front',reason:'own-effect',
  sourceUid:frontUid});
 A.record(pack,s,{physical:pl.energy[ei],owner,from:'front',to:'energy',reason:'own-effect',
  sourceUid:frontUid});
}
function moveToFront(pack,s,owner,c,sourceUid){
 const loc=locOf(s,owner,c.uid);
 if(!loc||loc.line==='front')return;
 const dests=A.destinations(plOf(s,owner),'front');
 if(!dests.length)return;
 const d=dests[0];
 // Use enter-style move via destinations API through pending if multiple;
 // single empty / replace path:
 if(typeof A.moveLine==='function'){
  try{A.moveLine(pack,s,owner,c,'front');return;}catch(_){}
 }
 const pl=plOf(s,owner);
 pl[loc.line][loc.slot]=null;
 if(d.replaceUid){
  const victim=pl.front[d.slot];
  if(victim){pl.front[d.slot]=null;pl.removed.push(victim);}
 }
 pl.front[d.slot]=c;
 A.record(pack,s,{physical:c,owner,from:loc.line,to:'front',reason:'own-effect',sourceUid});
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
 if(d.id==='CSM-1-029')
  s.effectQueue.unshift({op:'csm',id:d.id,slot:'unblocked',owner:s.active,sourceUid:attacker.uid});
 if(d.id==='CSM-1-046'&&attacker.csmUnblockedDraw===s.turn)
  A.draw(pack,s,s.active,1,attacker.uid);
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
 s.effectQueue.unshift({op:'csm',id:d.id,slot:'moved',owner,sourceUid:c.uid});
}
export function csmOnTurnStart(pack,s,owner){
 for(const c of plOf(s,owner).front.concat(plOf(s,owner).energy)){
  if(!c||originalEffectsDisabled(s,c))continue;
  const d=def(pack,c);
  if(d.id==='CSM-1-056'&&raidLive(c,d,'phase')&&!csmFacedowns(c).length)
   retireUid(pack,s,owner,c.uid);
 }
}
export function csmOnAttackDeclare(pack,s,attacker){
 const d=def(pack,attacker);
 if(!d?.csmHook||d.id!=='CSM-1-056'||originalEffectsDisabled(s,attacker))return;
 if(!raidLive(attacker,d,'onAttack'))return;
 const owner=Number(String(attacker.uid).split('-')[0]);
 if(csmFacedowns(attacker).length){
  peelFacedown(pack,s,owner,attacker,'hand',attacker.uid);
  if(nameOn(s,owner,HIMENO)&&!csmFacedowns(attacker).length){
   sniper(s,attacker);impact(s,attacker);
  }
 }
}
export function csmLeaveReplace(pack,s,owner,c){
 const d=def(pack,c);
 if(!d?.csmHook||d.id!=='CSM-1-061'||originalEffectsDisabled(s,c))return false;
 if(!raidLive(c,d,'leaveReplace'))return false;
 if(A.bp(pack,s,c)<500||used(s,c.uid+'|leave'))return false;
 const pool=fronts(s,owner,x=>x.uid!==c.uid&&A.bp(pack,s,x)>=4000);
 if(!pool.length)return false;
 hold(s,{player:owner,sourceUid:c.uid,id:d.id,step:'leaveReplace',
  data:{line:locOf(s,owner,c.uid)?.line,slot:locOf(s,owner,c.uid)?.slot}},[
  {type:'csm',mode:'skip'},...pool.map(x=>({type:'csm',mode:'pick',uid:x.uid}))]);
 use(s,c.uid+'|leave');
 return true;
}
