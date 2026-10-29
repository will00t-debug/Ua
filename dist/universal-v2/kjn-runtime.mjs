// UA52BT scripts. The engine passes zone helpers; this file does not import it.
// Printed 「まで」 includes zero. A name-once lock is spent only when the
// printed condition applies. Registration is not an official FAQ certification.
import {cardHasName,cardHasTrait} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';

const SID='シド・カゲノー';
const CLAIRE='クレア・カゲノー';
const AURORA='アウロラ';
const ROSE='ローズ・オリアナ';
const SEVEN='七陰';
const GARDEN='シャドウガーデン';
const IAM='アイ・アム……';
const TRIO=['アレクシア・ミドガル','ローズ・オリアナ','ナツメ・カフカ'];
let A=null;
export function bindKjn(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return !originalEffectsDisabled(s,c);}
function named(pack,c,name,s){return cardHasName(def(pack,c),name,s?originalEffectsDisabled(s,c):false);}
function hold(s,spec,actions){
 s.pending={kind:'kjn',player:spec.player,sourceUid:spec.sourceUid,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function lock(s,owner,key){
 if(!s.mainReadyOnceByName[owner].includes(key))s.mainReadyOnceByName[owner].push(key);
}
function locked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function energyBuff(s,c){if(!c)return;c.buffs??=[];c.buffs.push({energy:1,untilTurn:s.turn});}
function grantImpact(s,c){if(c)c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function grantDamage(s,c){if(c)c.attackDamageGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:2};}
function grantSniper(s,c){if(c)c.sniperGranted={turn:s.turn,stamp:c.fieldEntryStamp};}
function chars(s,owner,pred){
 return A.field(plOf(s,owner)).filter(c=>def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function fronts(s,owner,pred){
 return plOf(s,owner).front.filter(c=>c&&def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function locOf(s,owner,uid){return A.location(s,owner,uid);}
function selfOf(s,owner,uid){return locOf(s,owner,uid)?.c||null;}
function lineOf(s,owner,c){return c?locOf(s,owner,c.uid)?.line:null;}
function arm(pack){A.pack=pack;}
function go(pack,s){if(!s.pending)A.go(pack,s);}
function sig(a){
 return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,a?.replaceUid??null]);
}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Eminence in Shadow choice is not legal');
 return hit;
}
function bpOf(pack,s,c){return A.bp(pack,s,c);}
function facedowns(c){return (c?.under||[]).filter(v=>v&&v.faceDown);}
function sidOn(s,owner){
 return A.field(plOf(s,owner)).some(c=>named(A.pack,c,SID,s));
}
function roseOn(s,owner){
 return A.field(plOf(s,owner)).some(c=>named(A.pack,c,ROSE,s));
}
function claireOn(s,owner){
 return A.field(plOf(s,owner)).some(c=>named(A.pack,c,CLAIRE,s));
}
function sevenKinds(s,owner){
 const names=new Set();
 for(const c of A.field(plOf(s,owner))){
  const d=def(A.pack,c);
  if(cardHasTrait(d,SEVEN)&&d.name)names.add(d.name);
 }
 return names.size;
}
function removedUse(s,owner){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.controller===owner&&
  e.from==='removed'&&['front','energy','outside'].includes(e.to)&&e.reason==='rule');
}
function enteredThisTurn(s,owner,c){
 if(!c)return false;
 if(c.entryTurn===s.turn)return true;
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===c.uid&&e.owner===owner&&
  ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from));
}
function selfFromRemoved(s,owner,uid){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===uid&&e.owner===owner&&
  e.from==='removed'&&['front','energy'].includes(e.to)&&e.reason==='rule');
}
function moveUid(pack,s,owner,from,uid,to,sourceUid,reason='own-effect',extra){
 const index=plOf(s,owner)[from].findIndex(c=>c.uid===uid);
 if(index<0)throw Error('Eminence in Shadow card left '+from);
 return A.move(pack,s,{owner,from,to,index,reason,sourceUid,...extra});
}
function discard(pack,s,owner,uid,sourceUid,reason){
 return moveUid(pack,s,owner,'hand',uid,'outside',sourceUid,reason);
}
function millRemoved(pack,s,owner,sourceUid){
 const pl=plOf(s,owner);
 if(!pl.deck.length)return null;
 const physical=A.move(pack,s,{owner,from:'deck',to:'removed',index:0,reason:'own-effect',sourceUid});
 physical.kjnRemovedPlay=s.turn;
 return physical;
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
  left.map(uid=>({type:'kjn',mode:'next',uid})));
 return true;
}
function windowCards(s,owner,n){return plOf(s,owner).deck.slice(0,Math.min(n,plOf(s,owner).deck.length));}
function ruleHit(pack,c,rule,s,owner){
 const d=def(pack,c);
 if(rule==='any')return true;
 if(rule==='character')return d.type==='character';
 if(rule==='seven')return cardHasTrait(d,SEVEN);
 if(rule==='trio')return TRIO.includes(d.name);
 if(rule==='claireSid')return cardHasName(d,CLAIRE)||cardHasName(d,SID);
 if(rule==='sidChar')return sidOn(s,owner)?d.type==='character':cardHasName(d,CLAIRE)||cardHasName(d,SID);
 return false;
}
function beginLook(s,spec,count,rule,opts){
 const window=windowCards(s,spec.player,count);
 if(!window.length)return false;
 if(opts.reveal)for(const c of window)publish(A.pack,s,spec.player,c);
 const matches=window.filter(c=>ruleHit(A.pack,c,rule,s,spec.player));
 const data={window:window.map(c=>c.uid),taken:[],names:[],rule,max:opts.max,min:opts.min||0,
  rest:opts.rest,dest:opts.dest,discard:opts.discard===true,distinct:opts.distinct===true};
 if(!matches.length&&opts.min===0){
  if(!offerOrder(s,spec,data.window,opts.rest))finishRest(s,spec,data);
  return true;
 }
 const actions=[
  ...(opts.min===0?[{type:'kjn',mode:'done'}]:[]),
  ...matches.map(c=>({type:'kjn',mode:'take',uid:c.uid}))
 ];
 hold(s,{...spec,step:'lookPick',data},actions);
 return true;
}
function finishRest(s,spec,data){
 const left=data.window.filter(uid=>!data.taken.includes(uid));
 if(data.rest==='outside'){
  for(const uid of left){
   const index=plOf(s,spec.player).deck.findIndex(c=>c.uid===uid);
   if(index>=0)A.move(A.pack,s,{owner:spec.player,from:'deck',to:'outside',index,
    reason:'own-effect',sourceUid:spec.sourceUid});
  }
  return;
 }
 offerOrder(s,spec,left,data.rest);
}
function noteCut(s,owner,sourceUid){
 const pl=plOf(s,owner);
 const cur=pl.nextRemovedApCut;
 if(cur&&cur.turn===s.turn){cur.amount+=1;cur.sources.push(sourceUid);}
 else pl.nextRemovedApCut={turn:s.turn,amount:1,sources:[sourceUid]};
}
function destActions(pl,lines){
 const out=[];
 for(const line of lines)for(const dest of A.destinations(pl,line))
  out.push({type:'kjn',mode:'dest',line,slot:dest.slot,...(dest.replaceUid?{replaceUid:dest.replaceUid}:{})});
 return out;
}
function offerDeploy(s,spec,from,cards,ready,skipOnPlay){
 const actions=[];
 for(const c of cards)for(const dest of destActions(plOf(s,spec.player),['front','energy']))
  actions.push({...dest,uid:c.uid,from,ready:ready===true,skip:skipOnPlay===true});
 if(!actions.length)return false;
 if(spec.optional!==false)actions.unshift({type:'kjn',mode:'skip'});
 hold(s,{...spec,step:'deploy',data:{...(spec.data||{}),from}},actions);
 return true;
}
function doEnter(pack,s,owner,a,sourceUid){
 const skip=a.skip===true;
 A.enter(pack,s,{owner,from:a.from,uid:a.uid,line:a.line,slot:a.slot,
  ...(a.replaceUid?{replaceUid:a.replaceUid}:{}),ready:a.ready===true,sourceUid,
  ...(skip?{skipOnPlay:true}:{})});
 return a.uid;
}
function tuckZone(pack,s,owner,from,uid,host,sourceUid){
 const pl=plOf(s,owner);
 const index=pl[from].findIndex(c=>c.uid===uid);
 if(index<0||!host)throw Error('Eminence in Shadow tuck lost a card');
 const physical=pl[from].splice(index,1)[0];
 physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
 host.under??=[];host.under.push(physical);
 A.record(pack,s,{physical,owner,from,to:'raid-under',reason:'own-effect',sourceUid:host.uid});
}
function tuckField(pack,s,owner,uid,host,sourceUid){
 const detached=A.detach(pack,s,owner,uid,sourceUid);
 const physical=detached.physical;
 physical.faceDown=true;physical.ready=false;
 host.under??=[];host.under.push(physical);
 A.record(pack,s,{physical,owner,from:detached.from,to:'raid-under',reason:'own-effect',sourceUid:host.uid});
}
function hosts(s,owner){
 return chars(s,owner,c=>named(A.pack,c,CLAIRE,s)&&facedowns(c).length===0);
}
function offerPay(s,spec,reason,next){
 const hand=plOf(s,spec.player).hand;
 hold(s,{...spec,step:'pay',data:{...(spec.data||{}),reason,next}},
  hand.map(c=>({type:'kjn',mode:'discard',uid:c.uid})));
}
function oppFront(s,owner,cap){
 return fronts(s,1-owner,c=>bpOf(A.pack,s,c)<=cap);
}
function capRose(s,owner,low,high){return roseOn(s,owner)?high:low;}
function capClaire(s,owner,low,high){return claireOn(s,owner)?high:low;}

function runDeckTop(pack,s,job){
 const pl=plOf(s,job.owner);
 if(!pl.outside.some(c=>c.uid===job.sourceUid))return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'deckTop'},[
  {type:'kjn',mode:'stay'},{type:'kjn',mode:'top'}]);
}
function runAfter(pack,s,job){
 if(job.id==='KJN-1-014'){
  const card=plOf(s,job.owner).outside.find(c=>c.uid===job.discardedUid);
  if(!card||def(pack,card).name!==AURORA)return;
  const pool=hosts(s,job.owner);
  if(!pool.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'tuckAurora',
   data:{uid:card.uid}},[{type:'kjn',mode:'skip'},...pool.map(c=>({type:'kjn',mode:'host',uid:c.uid}))]);
  return;
 }
 if(job.id==='KJN-1-074'){
  if(sevenKinds(s,job.owner)>4)return;
  const others=A.field(plOf(s,job.owner)).filter(c=>c.uid!==job.deployedUid);
  if(!others.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'bottom',
   data:{exclude:job.deployedUid}},others.map(c=>({type:'kjn',mode:'bottom',uid:c.uid})));
 }
}
function runPlay(pack,s,job){
 const owner=job.owner,id=job.id;
 const spec={player:owner,sourceUid:job.sourceUid,id};
 if(id==='KJN-1-009'){beginLook(s,spec,2,'any',{max:1,min:0,rest:'top',dest:'hand'});return;}
 if(id==='KJN-1-011'){
  const self=selfOf(s,owner,job.sourceUid);
  if(!self)return;
  const pl=plOf(s,owner);
  const n=Math.min(3,pl.deck.length);
  self.under??=[];
  for(let i=0;i<n;i++){
   const physical=pl.deck.shift();
   physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
   self.under.push(physical);
   A.record(pack,s,{physical,owner,from:'deck',to:'raid-under',reason:'own-effect',sourceUid:self.uid});
  }
  return;
 }
 if(id==='KJN-1-013'){
  beginLook(s,spec,3,'sidChar',{max:1,min:0,rest:'bottom',dest:'hand',discard:true,reveal:true});
  return;
 }
 if(id==='KJN-1-014'){
  A.draw(pack,s,owner,1,job.sourceUid);
  if(!plOf(s,owner).hand.length)return;
  offerPay(s,spec,'own-effect','014');
  return;
 }
 if(id==='KJN-1-015'){
  const pool=plOf(s,owner).outside.filter(c=>{
   const d=def(pack,c);
   return d.type==='character'&&d.color==='yellow'&&d.energy<=2&&d.ap===1&&cardHasName(d,SID);
  });
  offerDeploy(s,{...spec,optional:true},'outside',pool,false,false);
  return;
 }
 if(id==='KJN-1-016'){
  if(!sidOn(s,owner))return;
  const self=selfOf(s,owner,job.sourceUid);
  if(self)self.kjnFirstMustBlock={turn:s.turn};
  return;
 }
 if(id==='KJN-1-023'){
  const actions=[{type:'kjn',mode:'draw'}];
  if(plOf(s,owner).hand.length)actions.push({type:'kjn',mode:'mill'});
  hold(s,{...spec,step:'fork'},actions);
  return;
 }
 if(id==='KJN-1-028'){
  const foes=fronts(s,1-owner,c=>bpOf(pack,s,c)>=4500);
  if(!foes.length||locked(s,owner,'KJN-1-028'))return;
  lock(s,owner,'KJN-1-028');
  const self=selfOf(s,owner,job.sourceUid);
  if(self)A.active(s,owner,self);
  hold(s,{...spec,step:'restFoe'},[{type:'kjn',mode:'skip'},
   ...foes.map(c=>({type:'kjn',mode:'rest',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-030'){beginLook(s,spec,2,'trio',{max:1,min:0,rest:'top',dest:'outside'});return;}
 if(id==='KJN-1-031'){
  const actions=[{type:'kjn',mode:'look'}];
  if(plOf(s,owner).hand.length&&plOf(s,owner).deck.length)actions.push({type:'kjn',mode:'mill'});
  hold(s,{...spec,step:'fork'},actions);
  return;
 }
 if(id==='KJN-1-034'){
  if(!selfFromRemoved(s,owner,job.sourceUid))return;
  const pool=oppFront(s,owner,4000);
  if(!pool.length)return;
  hold(s,{...spec,step:'retire'},[{type:'kjn',mode:'skip'},
   ...pool.map(c=>({type:'kjn',mode:'retire',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-037'){
  const cap=capRose(s,owner,2000,5000);
  const pool=oppFront(s,owner,cap);
  if(!pool.length)return;
  hold(s,{...spec,step:'retire',data:{fromRemoved:job.entryCause==='removedUse',cap}},
   pool.map(c=>({type:'kjn',mode:'retire',uid:c.uid})));
  return;
 }
 if(id==='KJN-1-038'){
  const cap=capClaire(s,owner,3000,5000);
  const pool=oppFront(s,owner,cap);
  const actions=[{type:'kjn',mode:'skip'},...pool.map(c=>({type:'kjn',mode:'retire',uid:c.uid}))];
  hold(s,{...spec,step:'retireTax',data:{then:'tax'}},actions);
  return;
 }
 if(id==='KJN-1-040'){
  if(!sidOn(s,owner))return;
  const window=windowCards(s,owner,2);
  if(!window.length)return;
  hold(s,{...spec,step:'keepTop',data:{window:window.map(c=>c.uid),kept:[]}},[
   {type:'kjn',mode:'done'},...window.map(c=>({type:'kjn',mode:'keep',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-047'){
  const self=selfOf(s,owner,job.sourceUid);
  if(!self||lineOf(s,owner,self)!=='front'||plOf(s,owner).outside.length<10)return;
  if(locked(s,owner,'KJN-1-047'))return;
  lock(s,owner,'KJN-1-047');
  hold(s,{...spec,step:'mayActive'},[{type:'kjn',mode:'skip'},{type:'kjn',mode:'active'}]);
  return;
 }
 if(id==='KJN-1-048'&&job.slot==='onPlay'){
  const window=windowCards(s,owner,2);
  if(!window.length)return;
  hold(s,{...spec,step:'takeOne',data:{window:window.map(c=>c.uid)}},
   window.map(c=>({type:'kjn',mode:'take',uid:c.uid})));
  return;
 }
 if(id==='KJN-1-048'&&job.slot==='onRetire'){
  if(!plOf(s,owner).hand.length)return;
  hold(s,{...spec,step:'pay',data:{reason:'own-effect',next:'048base',baseUid:job.baseUid}},[
   {type:'kjn',mode:'skip'},...plOf(s,owner).hand.map(c=>({type:'kjn',mode:'discard',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-049'){
  const outside=plOf(s,owner).outside;
  const max=1+Math.floor(outside.length/10);
  const pool=outside.filter(c=>{
   const d=def(pack,c);
   return d.name===IAM||(cardHasTrait(d,GARDEN)&&!d.raidName&&d.trigger!=='raid');
  });
  if(!pool.length)return;
  hold(s,{...spec,step:'recoverEnergy',data:{max,taken:[],energies:[]}},[
   {type:'kjn',mode:'done'},...pool.map(c=>({type:'kjn',mode:'take',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-055'){
  if(!sidOn(s,owner)||!plOf(s,owner).hand.length)return;
  hold(s,{...spec,step:'handOut',data:{taken:[],max:2}},[
   {type:'kjn',mode:'done'},...plOf(s,owner).hand.map(c=>({type:'kjn',mode:'out',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-056'){
  const window=windowCards(s,owner,2);
  if(!window.length)return;
  for(const c of window)publish(pack,s,owner,c);
  const matches=window.filter(c=>cardHasTrait(def(pack,c),SEVEN));
  hold(s,{...spec,step:'distinctHand',data:{window:window.map(c=>c.uid),taken:[],names:[]}},[
   {type:'kjn',mode:'done'},...matches.map(c=>({type:'kjn',mode:'take',uid:c.uid}))]);
  return;
 }
 if(id==='KJN-1-066'){
  if(s.active!==owner||sevenKinds(s,owner)<5)return;
  const pool=chars(s,owner);
  if(!pool.length)return;
  hold(s,{...spec,step:'buff'},[{type:'kjn',mode:'skip'},
   ...pool.map(c=>({type:'kjn',mode:'buff',uid:c.uid,bp:1000}))]);
  return;
 }
 if(id==='KJN-1-069'){
  const kinds=sevenKinds(s,owner);
  if(kinds<5||locked(s,owner,'KJN-1-069'))return;
  lock(s,owner,'KJN-1-069');
  const self=selfOf(s,owner,job.sourceUid);
  if(self)A.active(s,owner,self);
  if(kinds>=7&&self)grantSniper(s,self);
  return;
 }
 if(id==='KJN-1-074'){
  const pool=[...plOf(s,owner).hand,...plOf(s,owner).outside].filter(c=>{
   const d=def(pack,c);
   return d.type==='character'&&d.color==='purple'&&d.energy<=2&&d.ap===1&&cardHasTrait(d,SEVEN);
  });
  const actions=[{type:'kjn',mode:'skip'}];
  for(const c of pool){
   const from=plOf(s,owner).hand.some(x=>x.uid===c.uid)?'hand':'outside';
   for(const dest of destActions(plOf(s,owner),['front','energy']))
    actions.push({...dest,uid:c.uid,from,ready:false,skip:false});
  }
  hold(s,{...spec,step:'betaDeploy'},actions);
  return;
 }
 if(id==='KJN-1-077'){
  const pool=plOf(s,owner).outside.filter(c=>def(pack,c).ap===1&&cardHasTrait(def(pack,c),SEVEN));
  if(!pool.length)return;
  hold(s,{...spec,step:'sevenPick'},pool.map(c=>({type:'kjn',mode:'pick',uid:c.uid})));
  return;
 }
 if(id==='KJN-1-080'){
  const pool=chars(s,owner,c=>named(pack,c,SID,s));
  if(!pool.length)return;
  hold(s,{...spec,step:'energySid'},[{type:'kjn',mode:'skip'},
   ...pool.map(c=>({type:'kjn',mode:'energy',uid:c.uid}))]);
 }
}
function runRetire(pack,s,job){
 if(job.id==='KJN-1-016'){
  if(!job.hadFacedown)return;
  const pool=plOf(s,job.owner).outside.filter(c=>def(pack,c).energy<=1&&cardHasName(def(pack,c),CLAIRE));
  if(!pool.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'recoverClaire'},[
   {type:'kjn',mode:'skip'},...pool.map(c=>({type:'kjn',mode:'hand',uid:c.uid}))]);
 }
}
function runAttack(pack,s,job){
 if(job.id!=='KJN-1-040')return;
 const n=Math.floor(plOf(s,job.owner).outside.length/10);
 if(n)A.draw(pack,s,job.owner,n,job.sourceUid);
}
function runRaided(pack,s,job){
 if(job.id!=='KJN-1-046'||!job.raidUid)return;
 const owner=Number(String(job.raidUid).split('-')[0]);
 const raider=selfOf(s,owner,job.raidUid);
 if(!raider)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'raidGrant',data:{raidUid:job.raidUid}},[
  {type:'kjn',mode:'impact'},{type:'kjn',mode:'damage'}]);
}

export function runKjnJob(pack,s,job){
 arm(pack);
 if(job.slot==='deckTop'){runDeckTop(pack,s,job);return;}
 if(job.slot==='after'){runAfter(pack,s,job);return;}
 if(job.slot==='onRetire'){runRetire(pack,s,job);return;}
 if(job.slot==='onAttack'){runAttack(pack,s,job);return;}
 if(job.slot==='onRaided'){runRaided(pack,s,job);return;}
 if(job.slot==='onPlay')runPlay(pack,s,job);
}

function once(s,c,key){return !used(s,c.uid+'|'+key);}
function frontOnly(s,owner,c){return lineOf(s,owner,c)==='front';}
function energyOnly(s,owner,c){return lineOf(s,owner,c)==='energy';}

export function legalKjnActivations(pack,s,owner,c){
 arm(pack);
 if(s.phase!=='main'||s.active!==owner||!live(s,c))return [];
 const d=def(pack,c);
 if(d.mainAbility?.op!=='kjnMain')return [];
 const id=d.id,pl=plOf(s,owner);
 const push=mode=>({type:'activate',uid:c.uid,mode});
 const out=[];
 if((id==='KJN-1-002'||id==='KJN-1-003'||id==='KJN-1-004')&&hosts(s,owner).length)out.push(push('kjn:0'));
 if(id==='KJN-1-006'&&frontOnly(s,owner,c)&&once(s,c,'main')&&pl.hand.length)out.push(push('kjn:0'));
 if(id==='KJN-1-008'&&once(s,c,'main')&&!locked(s,owner,'KJN-1-008')&&enteredThisTurn(s,owner,c)&&pl.hand.length)
  out.push(push('kjn:0'));
 if(id==='KJN-1-009'&&frontOnly(s,owner,c)&&once(s,c,'main'))out.push(push('kjn:0'));
 if(id==='KJN-1-011'&&energyOnly(s,owner,c)&&c.ready&&facedowns(c).length)out.push(push('kjn:0'));
 if(id==='KJN-1-025'&&frontOnly(s,owner,c)){
  if(once(s,c,'0')&&pl.hand.length)out.push(push('kjn:0'));
  if(once(s,c,'1')&&removedUse(s,owner)&&chars(s,owner).length)out.push(push('kjn:1'));
 }
 if(id==='KJN-1-027'&&once(s,c,'main')&&fronts(s,1-owner,x=>bpOf(pack,s,x)>=4500).length)out.push(push('kjn:0'));
 if(id==='KJN-1-029'&&frontOnly(s,owner,c)&&once(s,c,'main')&&
  fronts(s,owner,x=>named(pack,x,CLAIRE,s)&&bpOf(pack,s,x)>=1500).length)out.push(push('kjn:0'));
 if(id==='KJN-1-032'&&once(s,c,'main')&&enteredThisTurn(s,owner,c)&&pl.deck.length)out.push(push('kjn:0'));
 if(id==='KJN-1-033'&&c.ready&&(pl.hand.length||removedUse(s,owner)&&chars(s,owner,x=>x.uid!==c.uid).length))
  out.push(push('kjn:0'));
 if(id==='KJN-1-034'&&removedUse(s,owner)&&(c.stack||[]).length)out.push(push('kjn:0'));
 if(id==='KJN-1-035'&&c.ready&&fronts(s,owner).length&&
  fronts(s,1-owner,x=>x.ready&&bpOf(pack,s,x)>=3500).length)out.push(push('kjn:0'));
 if(id==='KJN-1-056'&&frontOnly(s,owner,c)&&once(s,c,'main')&&!locked(s,owner,'KJN-1-056'))out.push(push('kjn:0'));
 if(id==='KJN-1-058'&&c.ready&&chars(s,owner,x=>x.uid!==c.uid).length)out.push(push('kjn:0'));
 if(id==='KJN-1-061'&&frontOnly(s,owner,c)&&once(s,c,'main')&&
  A.field(pl).some(x=>x.uid!==c.uid&&cardHasTrait(def(pack,x),SEVEN)))out.push(push('kjn:0'));
 if(id==='KJN-1-062'&&c.ready&&once(s,c,'main'))out.push(push('kjn:0'));
 if(id==='KJN-1-063'&&c.ready&&once(s,c,'main')&&pl.hand.length)out.push(push('kjn:0'));
 if(id==='KJN-1-064'&&c.ready&&once(s,c,'main')&&sevenKinds(s,owner)>=7&&
  fronts(s,owner,x=>x.uid!==c.uid&&cardHasTrait(def(pack,x),SEVEN)).length)out.push(push('kjn:0'));
 if(id==='KJN-1-068'&&once(s,c,'main')&&pl.hand.length&&sevenKinds(s,owner)>=5)out.push(push('kjn:0'));
 if(id==='KJN-1-070'&&c.ready&&once(s,c,'main')&&fronts(s,owner,x=>x.uid!==c.uid&&x.ready).length)
  out.push(push('kjn:0'));
 if(id==='KJN-1-074'&&frontOnly(s,owner,c)&&once(s,c,'main')&&sevenKinds(s,owner)>=7)out.push(push('kjn:0'));
 if(id==='KJN-1-075'&&c.ready&&pl.deck.length)out.push(push('kjn:0'));
 return out;
}

function restSelf(s,owner,c){
 if(!c?.ready)return;
 A.noteRest(s,owner,c);
 c.ready=false;
}
function startMain(pack,s,c,mode){
 const owner=s.active,id=def(pack,c).id;
 const spec={player:owner,sourceUid:c.uid,id};
 const pl=plOf(s,owner);
 if(id==='KJN-1-002'||id==='KJN-1-003'||id==='KJN-1-004'){
  const pool=hosts(s,owner);
  hold(s,{...spec,step:'tuckSelf',data:{draw:id==='KJN-1-004'?2:2,discard:id!=='KJN-1-004'}},
   pool.map(x=>({type:'kjn',mode:'host',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-006'){use(s,c.uid+'|main');offerPay(s,spec,'payment','006');return;}
 if(id==='KJN-1-008'){use(s,c.uid+'|main');lock(s,owner,'KJN-1-008');offerPay(s,spec,'payment','008');return;}
 if(id==='KJN-1-009'){use(s,c.uid+'|main');millRemoved(pack,s,owner,c.uid);return;}
 if(id==='KJN-1-011'){
  use(s,c.uid+'|main');
  restSelf(s,owner,c);
  const downs=facedowns(c);
  hold(s,{...spec,step:'dropDown'},downs.map(x=>({type:'kjn',mode:'out',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-025'&&mode==='kjn:0'){
  use(s,c.uid+'|0');
  A.draw(pack,s,owner,1,c.uid);
  offerPay(s,{...spec,data:{place:'top'}},'own-effect','handTop');
  return;
 }
 if(id==='KJN-1-025'&&mode==='kjn:1'){
  use(s,c.uid+'|1');
  hold(s,{...spec,step:'buff'},chars(s,owner).map(x=>({type:'kjn',mode:'buff',uid:x.uid,bp:1000})));
  return;
 }
 if(id==='KJN-1-027'){use(s,c.uid+'|main');buff(s,c,2000);return;}
 if(id==='KJN-1-029'){
  use(s,c.uid+'|main');
  const pool=fronts(s,owner,x=>named(pack,x,CLAIRE,s)&&bpOf(pack,s,x)>=1500);
  hold(s,{...spec,step:'claireDown'},pool.map(x=>({type:'kjn',mode:'down',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-032'){use(s,c.uid+'|main');millRemoved(pack,s,owner,c.uid);return;}
 if(id==='KJN-1-033'){
  restSelf(s,owner,c);
  const actions=[];
  if(pl.hand.length)actions.push({type:'kjn',mode:'hand'});
  if(removedUse(s,owner)&&chars(s,owner,x=>x.uid!==c.uid).length)actions.push({type:'kjn',mode:'removed'});
  hold(s,{...spec,step:'fork'},actions);
  return;
 }
 if(id==='KJN-1-034'){
  const base=A.peel(pack,s,owner,c.uid,c.uid);
  if(base)grantImpact(s,c);
  return;
 }
 if(id==='KJN-1-035'){
  restSelf(s,owner,c);
  const mine=fronts(s,owner);
  hold(s,{...spec,step:'pairMine'},mine.map(x=>({type:'kjn',mode:'pick',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-056'){
  use(s,c.uid+'|main');
  lock(s,owner,'KJN-1-056');
  if(sevenKinds(s,owner)>=7){
   const pool=chars(s,owner,x=>cardHasTrait(def(pack,x),SEVEN));
   hold(s,{...spec,step:'buffImpact'},pool.map(x=>({type:'kjn',mode:'buff',uid:x.uid})));
  }else grantImpact(s,c);
  return;
 }
 if(id==='KJN-1-058'){
  restSelf(s,owner,c);
  const pool=chars(s,owner,x=>x.uid!==c.uid);
  const max=sevenKinds(s,owner)>=7?2:1;
  hold(s,{...spec,step:'buffMany',data:{taken:[],max}},pool.map(x=>({type:'kjn',mode:'buff',uid:x.uid,bp:1000})));
  return;
 }
 if(id==='KJN-1-061'){
  use(s,c.uid+'|main');
  const pool=A.field(pl).filter(x=>x.uid!==c.uid&&cardHasTrait(def(pack,x),SEVEN));
  hold(s,{...spec,step:'bottomThen'},pool.map(x=>({type:'kjn',mode:'bottom',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-062'){restSelf(s,owner,c);use(s,c.uid+'|main');A.draw(pack,s,owner,1,c.uid);
  if(pl.hand.length)offerPay(s,spec,'own-effect','none');return;}
 if(id==='KJN-1-063'){restSelf(s,owner,c);use(s,c.uid+'|main');offerPay(s,spec,'payment','063');return;}
 if(id==='KJN-1-064'){
  restSelf(s,owner,c);use(s,c.uid+'|main');
  const pool=fronts(s,owner,x=>x.uid!==c.uid&&cardHasTrait(def(pack,x),SEVEN));
  hold(s,{...spec,step:'activeOther'},pool.map(x=>({type:'kjn',mode:'active',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-068'){use(s,c.uid+'|main');offerPay(s,spec,'payment','068');return;}
 if(id==='KJN-1-070'){
  restSelf(s,owner,c);use(s,c.uid+'|main');
  const pool=fronts(s,owner,x=>x.uid!==c.uid&&x.ready);
  hold(s,{...spec,step:'restEnergy'},pool.map(x=>({type:'kjn',mode:'rest',uid:x.uid})));
  return;
 }
 if(id==='KJN-1-074'){use(s,c.uid+'|main');A.draw(pack,s,owner,1,c.uid);return;}
 if(id==='KJN-1-075'){
  restSelf(s,owner,c);
  const top=pl.deck[0];
  if(!top)return;
  hold(s,{...spec,step:'peekPlace',data:{uid:top.uid}},[
   {type:'kjn',mode:'top'},{type:'kjn',mode:'outside'}]);
 }
}

export function activateKjn(pack,s,action){
 arm(pack);
 const owner=s.active,c=selfOf(s,owner,action.uid);
 if(!c)throw Error('Eminence in Shadow activator left');
 const legal=legalKjnActivations(pack,s,owner,c).some(a=>a.uid===action.uid&&a.mode===action.mode);
 if(!legal)throw Error('Eminence in Shadow activation is not legal');
 startMain(pack,s,c,action.mode);
 go(pack,s);
}
export function legalKjnPending(pack,s){arm(pack);return s.pending?.actions||[];}

function afterPay(pack,s,q,discarded){
 const owner=q.player,next=q.data?.next;
 if(next==='006'||next==='009mill'){millRemoved(pack,s,owner,q.sourceUid);return;}
 if(next==='008'){noteCut(s,owner,q.sourceUid);return;}
 if(next==='014'){
  s.effectQueue.push({op:'kjn',id:'KJN-1-014',slot:'after',owner,sourceUid:q.sourceUid,discardedUid:discarded.uid});
  return;
 }
 if(next==='handTop'){
  hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'handPlace',data:{where:q.data.place||'top'}},
   plOf(s,owner).hand.map(c=>({type:'kjn',mode:'place',uid:c.uid})));
  return;
 }
 if(next==='048base'){
  const base=q.data.baseUid&&plOf(s,owner).outside.find(c=>c.uid===q.data.baseUid);
  if(base)offerDeploy(s,{player:owner,sourceUid:q.sourceUid,id:q.id,optional:true},'outside',[base],false,false);
  return;
 }
 if(next==='063'){
  const pl=plOf(s,owner);
  if(pl.deck.length){
   hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'millMaybe'},[
    {type:'kjn',mode:'skip'},{type:'kjn',mode:'mill'}]);
  }else if(pl.outside.length>=10){
   const self=selfOf(s,owner,q.sourceUid);if(self)energyBuff(s,self);
  }
  return;
 }
 if(next==='068'){
  const self=selfOf(s,owner,q.sourceUid);
  if(self){A.active(s,owner,self);buff(s,self,1000);}
 }
}
function handOrDeploy(pack,s,q,uid){
 const owner=q.player,card=plOf(s,owner).outside.find(c=>c.uid===uid);
 if(!card)return;
 const d=def(pack,card);
 const same=A.field(plOf(s,owner)).some(c=>def(pack,c).name===d.name);
 const need=A.required(pack,s,owner,d,'outside');
 const have=(A.energy(pack,s,owner)[d.color]||0);
 const can=d.type==='character'&&!same&&need<=have;
 if(!can){moveUid(pack,s,owner,'outside',uid,'hand',q.sourceUid);return;}
 const actions=[{type:'kjn',mode:'hand',uid}];
 for(const dest of destActions(plOf(s,owner),['front','energy']))
  actions.push({...dest,uid,from:'outside',ready:false,skip:false});
 hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'handOrDeploy'},actions);
}

export function resolveKjnPending(pack,s,action){
 arm(pack);
 const q=s.pending;
 const a=takeAction(q,action);
 s.pending=null;
 const owner=q.player,step=q.step;
 if(step==='deckTop'){
  if(a.mode==='top'&&plOf(s,owner).outside.some(c=>c.uid===q.sourceUid))
   moveUid(pack,s,owner,'outside',q.sourceUid,'deck',q.sourceUid,'own-effect',
    {deckPosition:'top',revealed:false});
 }else if(step==='pay'&&a.mode==='discard'){
  const discarded=discard(pack,s,owner,a.uid,q.sourceUid,q.data.reason||'own-effect');
  afterPay(pack,s,q,discarded);
 }else if(step==='lookPick'){
  const data=q.data;
  if(a.mode==='take'){
   data.taken.push(a.uid);
   const card=plOf(s,owner).deck.find(c=>c.uid===a.uid);
   if(data.distinct&&card)data.names.push(def(pack,card).name);
   if(data.dest==='hand')moveUid(pack,s,owner,'deck',a.uid,'hand',q.sourceUid);
   else if(data.dest==='outside')moveUid(pack,s,owner,'deck',a.uid,'outside',q.sourceUid);
   if(data.discard){
    offerPay(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:{...data,next:'none'}},'own-effect','none');
   }
  }
  if(a.mode==='done'||data.taken.length>=data.max){
   if(!s.pending)finishRest(s,{player:owner,sourceUid:q.sourceUid,id:q.id},data);
  }else if(a.mode==='take'&&!s.pending){
   const left=windowCards(s,owner,data.window.length).filter(c=>data.window.includes(c.uid)&&!data.taken.includes(c.uid));
   const matches=left.filter(c=>ruleHit(pack,c,data.rule,s,owner)&&
    (!data.distinct||!data.names.includes(def(pack,c).name)));
   if(data.taken.length>=data.min&&!matches.length)finishRest(s,{player:owner,sourceUid:q.sourceUid,id:q.id},data);
   else hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'lookPick',data},[
    ...(data.taken.length>=data.min?[{type:'kjn',mode:'done'}]:[]),
    ...matches.map(c=>({type:'kjn',mode:'take',uid:c.uid}))]);
  }
 }else if(step==='lookOrder'){
  q.data.built.push(a.uid);
  q.data.left=q.data.left.filter(uid=>uid!==a.uid);
  if(q.data.left.length<=1){
   lay(plOf(s,owner),[...q.data.built,...q.data.left],q.data.rest);
  }else hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'lookOrder',data:q.data},
   q.data.left.map(uid=>({type:'kjn',mode:'next',uid})));
 }else if(step==='fork'){
  if(a.mode==='draw'){
   A.draw(pack,s,owner,1,q.sourceUid);
   const actions=[];
   for(const c of plOf(s,owner).hand){
    actions.push({type:'kjn',mode:'top',uid:c.uid});
    actions.push({type:'kjn',mode:'bottom',uid:c.uid});
   }
   if(actions.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'handEither'},actions);
  }else if(a.mode==='mill'){
   offerPay(s,{player:owner,sourceUid:q.sourceUid,id:q.id},'own-effect','006');
  }else if(a.mode==='look'){
   const window=windowCards(s,owner,3).map(c=>c.uid);
   if(window.length>1)offerOrder(s,{player:owner,sourceUid:q.sourceUid,id:q.id},window,'top');
   else if(window.length)lay(plOf(s,owner),window,'top');
  }else if(a.mode==='hand'){
   offerPay(s,{player:owner,sourceUid:q.sourceUid,id:q.id,data:{place:'top'}},'own-effect','handTop');
  }else if(a.mode==='removed'){
   const pool=chars(s,owner,x=>x.uid!==q.sourceUid);
   if(pool.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'buff'},[
    {type:'kjn',mode:'skip'},...pool.map(x=>({type:'kjn',mode:'buff',uid:x.uid,bp:1000}))]);
  }
 }else if(step==='handEither'){
  moveUid(pack,s,owner,'hand',a.uid,'deck',q.sourceUid,'own-effect',
   {deckPosition:a.mode==='bottom'?'bottom':'top',revealed:false});
 }else if(step==='handPlace'){
  moveUid(pack,s,owner,'hand',a.uid,'deck',q.sourceUid,'own-effect',
   {deckPosition:q.data.where==='bottom'?'bottom':'top',revealed:false});
 }else if(step==='tuckSelf'||step==='tuckAurora'){
  if(a.mode==='host'){
   const host=selfOf(s,owner,a.uid);
   if(step==='tuckSelf')tuckField(pack,s,owner,q.sourceUid,host,q.sourceUid);
   else tuckZone(pack,s,owner,'outside',q.data.uid,host,q.sourceUid);
   if(step==='tuckSelf'){
    A.draw(pack,s,owner,q.data.draw,q.sourceUid);
    if(q.data.discard&&plOf(s,owner).hand.length)
     offerPay(s,{player:owner,sourceUid:q.sourceUid,id:q.id},'own-effect','none');
   }
  }
 }else if(step==='dropDown'){
  const self=selfOf(s,owner,q.sourceUid);
  const card=facedowns(self).find(v=>v.uid===a.uid);
  if(self&&card){
   self.under=self.under.filter(v=>v.uid!==card.uid);
   card.faceDown=false;card.ready=false;card.fieldEntryStamp=null;
   plOf(s,owner).outside.push(card);
   A.record(pack,s,{physical:card,owner,from:'raid-under',to:'outside',reason:'own-effect',
    sourceUid:q.sourceUid,wasFaceDown:true});
  }
  if(self&&!facedowns(self).length){
   A.active(s,owner,self);
   const actions=destActions(plOf(s,owner),'front' in plOf(s,owner)?['front']:['front']);
   const dests=destActions(plOf(s,owner),['front']);
   if(dests.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'moveFront'},dests);
  }
 }else if(step==='moveFront'){
  A.moveLine(pack,s,owner,q.sourceUid,a.line,a.slot,a.replaceUid,q.sourceUid);
 }else if(step==='deploy'||step==='handOrDeploy'||step==='betaDeploy'){
  if(a.mode!=='skip'&&a.uid){
   const from=a.from;
   doEnter(pack,s,owner,{...a,from},q.sourceUid);
   if(q.id==='KJN-1-074'&&step==='betaDeploy')
    s.effectQueue.push({op:'kjn',id:'KJN-1-074',slot:'after',owner,sourceUid:q.sourceUid,deployedUid:a.uid});
  }
 }else if(step==='retire'&&a.mode==='retire'){
  A.retire(pack,s,1-owner,locOf(s,1-owner,a.uid).line,locOf(s,1-owner,a.uid).slot);
  if(q.data?.fromRemoved){
   const pool=chars(s,owner);
   if(pool.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'buff'},[
    {type:'kjn',mode:'skip'},...pool.map(x=>({type:'kjn',mode:'buff',uid:x.uid,bp:1000}))]);
  }
 }else if(step==='retireTax'){
  if(a.mode==='retire'){
   const loc=locOf(s,1-owner,a.uid);
   if(loc)A.retire(pack,s,1-owner,loc.line,loc.slot);
  }
  const pool=chars(s,owner,c=>named(pack,c,CLAIRE,s)&&def(pack,c).raidName&&
   (c.stack||[]).some(x=>x.faceDown!==true)&&facedowns(c).length);
  if(pool.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'tax'},[
   {type:'kjn',mode:'skip'},...pool.map(c=>({type:'kjn',mode:'tax',uid:c.uid}))]);
 }else if(step==='tax'&&a.mode==='tax'){
  const target=selfOf(s,owner,a.uid);
  if(target)target.kjnSelectTax={turn:s.turn};
 }else if(step==='keepTop'){
  if(a.mode==='keep')q.data.kept.push(a.uid);
  const left=q.data.window.filter(uid=>!q.data.kept.includes(uid)&&plOf(s,owner).deck.some(c=>c.uid===uid));
  if(a.mode==='done'||!left.length){
   lay(plOf(s,owner),q.data.kept,'top');
   for(const uid of q.data.window.filter(uid=>!q.data.kept.includes(uid))){
    const index=plOf(s,owner).deck.findIndex(c=>c.uid===uid);
    if(index>=0)A.move(pack,s,{owner,from:'deck',to:'outside',index,reason:'own-effect',sourceUid:q.sourceUid});
   }
  }else hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'keepTop',data:q.data},[
   {type:'kjn',mode:'done'},...left.map(uid=>({type:'kjn',mode:'keep',uid}))]);
 }else if(step==='takeOne'){
  moveUid(pack,s,owner,'deck',a.uid,'hand',q.sourceUid);
  for(const uid of q.data.window.filter(uid=>uid!==a.uid)){
   const index=plOf(s,owner).deck.findIndex(c=>c.uid===uid);
   if(index>=0)A.move(pack,s,{owner,from:'deck',to:'outside',index,reason:'own-effect',sourceUid:q.sourceUid});
  }
 }else if(step==='recoverEnergy'){
  if(a.mode==='take'){
   const card=plOf(s,owner).outside.find(c=>c.uid===a.uid);
   q.data.taken.push(a.uid);
   q.data.energies.push(def(pack,card).energy);
   moveUid(pack,s,owner,'outside',a.uid,'hand',q.sourceUid);
  }
  if(a.mode==='done'||q.data.taken.length>=q.data.max){}
  else{
   const pool=plOf(s,owner).outside.filter(c=>{
    const d=def(pack,c);
    if(q.data.energies.includes(d.energy))return false;
    return d.name===IAM||(cardHasTrait(d,GARDEN)&&!d.raidName&&d.trigger!=='raid');
   });
   if(pool.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'recoverEnergy',data:q.data},[
    {type:'kjn',mode:'done'},...pool.map(c=>({type:'kjn',mode:'take',uid:c.uid}))]);
  }
 }else if(step==='handOut'){
  if(a.mode==='out'){
   discard(pack,s,owner,a.uid,q.sourceUid,'own-effect');
   q.data.taken.push(a.uid);
  }
  if(a.mode==='done'||q.data.taken.length>=q.data.max){
   if(q.data.taken.length)A.draw(pack,s,owner,q.data.taken.length,q.sourceUid);
  }else{
   const left=plOf(s,owner).hand.filter(c=>!q.data.taken.includes(c.uid));
   hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'handOut',data:q.data},[
    {type:'kjn',mode:'done'},...left.map(c=>({type:'kjn',mode:'out',uid:c.uid}))]);
  }
 }else if(step==='distinctHand'){
  if(a.mode==='take'){
   const card=plOf(s,owner).deck.find(c=>c.uid===a.uid);
   q.data.taken.push(a.uid);
   q.data.names.push(def(pack,card).name);
   moveUid(pack,s,owner,'deck',a.uid,'hand',q.sourceUid);
  }
  const left=q.data.window.filter(uid=>!q.data.taken.includes(uid)&&plOf(s,owner).deck.some(c=>c.uid===uid));
  const matches=left.map(uid=>plOf(s,owner).deck.find(c=>c.uid===uid)).filter(c=>c&&
   cardHasTrait(def(pack,c),SEVEN)&&!q.data.names.includes(def(pack,c).name));
  if(a.mode==='done'||!matches.length){
   for(const uid of left){
    const index=plOf(s,owner).deck.findIndex(c=>c.uid===uid);
    if(index>=0)A.move(pack,s,{owner,from:'deck',to:'outside',index,reason:'own-effect',sourceUid:q.sourceUid});
   }
  }else hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'distinctHand',data:q.data},[
   {type:'kjn',mode:'done'},...matches.map(c=>({type:'kjn',mode:'take',uid:c.uid}))]);
 }else if(step==='buff'&&a.mode==='buff')buff(s,selfOf(s,owner,a.uid),a.bp||1000);
 else if(step==='buffMany'){
  if(a.mode==='buff'&&a.uid&&!q.data.taken.includes(a.uid)){
   buff(s,selfOf(s,owner,a.uid),1000);q.data.taken.push(a.uid);
  }
  if(a.mode!=='done'&&q.data.taken.length<q.data.max){
   const left=chars(s,owner,x=>x.uid!==q.sourceUid&&!q.data.taken.includes(x.uid));
   if(left.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'buffMany',data:q.data},[
    {type:'kjn',mode:'done'},...left.map(x=>({type:'kjn',mode:'buff',uid:x.uid,bp:1000}))]);
  }
 }else if(step==='restFoe'&&a.mode==='rest'){
  const foe=selfOf(s,1-owner,a.uid);if(foe)foe.ready=false;
 }else if(step==='mayActive'&&a.mode==='active'){
  const self=selfOf(s,owner,q.sourceUid);if(self)A.active(s,owner,self);
 }else if(step==='raidGrant'){
  const who=Number(String(q.data.raidUid).split('-')[0]);
  const raider=selfOf(s,who,q.data.raidUid);
  if(a.mode==='impact')grantImpact(s,raider);
  if(a.mode==='damage')grantDamage(s,raider);
 }else if(step==='recoverClaire'&&a.mode==='hand')moveUid(pack,s,owner,'outside',a.uid,'hand',q.sourceUid);
 else if(step==='claireDown'){
  buff(s,selfOf(s,owner,a.uid),-1000);
  A.draw(pack,s,owner,1,q.sourceUid);
  buff(s,selfOf(s,owner,q.sourceUid),1000);
  if(plOf(s,owner).hand.length)offerPay(s,{player:owner,sourceUid:q.sourceUid,id:q.id},'own-effect','none');
 }else if(step==='pairMine'){
  const foes=fronts(s,1-owner,x=>x.ready&&bpOf(pack,s,x)>=3500);
  hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'pairFoe',data:{mine:a.uid}},
   foes.map(x=>({type:'kjn',mode:'pick',uid:x.uid})));
 }else if(step==='pairFoe'){
  buff(s,selfOf(s,owner,q.data.mine),1000);
  buff(s,selfOf(s,1-owner,a.uid),1000);
 }else if(step==='bottom'||step==='bottomThen'){
  A.bottom(pack,s,owner,a.uid,q.sourceUid);
  if(step==='bottomThen'){
   const pool=plOf(s,owner).outside.filter(c=>{
    const d=def(pack,c);
    return d.type==='character'&&d.color==='purple'&&d.energy<=3&&d.ap===1&&
     cardHasTrait(d,SEVEN)&&!cardHasName(d,'イプシロン');
   });
   offerDeploy(s,{player:owner,sourceUid:q.sourceUid,id:q.id,optional:true},'outside',pool,false,true);
  }
 }else if(step==='restEnergy'){
  const foe=selfOf(s,owner,a.uid);
  if(foe){A.noteRest(s,owner,foe);foe.ready=false;}
  const self=selfOf(s,owner,q.sourceUid);
  if(self)energyBuff(s,self);
 }else if(step==='activeOther'){
  const target=selfOf(s,owner,a.uid);if(target)A.active(s,owner,target);
 }else if(step==='buffImpact'){
  const target=selfOf(s,owner,a.uid);
  if(target){buff(s,target,1000);grantImpact(s,target);}
 }else if(step==='millMaybe'){
  if(a.mode==='mill'&&plOf(s,owner).deck.length)
   A.move(pack,s,{owner,from:'deck',to:'outside',index:0,reason:'own-effect',sourceUid:q.sourceUid});
  if(plOf(s,owner).outside.length>=10){
   const self=selfOf(s,owner,q.sourceUid);if(self)energyBuff(s,self);
  }
 }else if(step==='peekPlace'){
  if(a.mode==='outside')
   A.move(pack,s,{owner,from:'deck',to:'outside',index:0,reason:'own-effect',sourceUid:q.sourceUid});
  if(plOf(s,owner).outside.length>=10){
   const pool=chars(s,owner);
   if(pool.length)hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'buff'},[
    {type:'kjn',mode:'skip'},...pool.map(x=>({type:'kjn',mode:'buff',uid:x.uid,bp:1000}))]);
  }
 }else if(step==='sevenPick')handOrDeploy(pack,s,q,a.uid);
 else if(step==='energySid')energyBuff(s,selfOf(s,owner,a.uid));
 if(!s.pending)go(pack,s);
}
