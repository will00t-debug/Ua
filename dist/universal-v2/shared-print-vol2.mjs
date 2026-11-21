// Shared sentences for the remaining EX18BT prints. No title opcode.
// A deck look keeps every inspected card on the pending window. 見る stays
// private. Cards placed outside or into the removed area are public.
// Raid-frame text is listed in raid-box.mjs and stays quiet on an ordinary play.
export const SHARED_PRINT_VOL2_OPS=Object.freeze([
 'raidTopOutsideThen','drawYellowField','reenterSelfRest','retireHighNadekoChoice',
 'raidedEnergyReveal','drawLockApReady','raidEntryDraw','lookTwoOutsideOrigin',
 'optionalOriginDraw','lookTwoHandRemovedAp','drawHandFinalPair','optionalKoyomiReenter',
 'yotsugiOrMove','retireMayoiPair','raidedFacedownDraw','lookSurugaOutside',
 'drawHandOrFlower','facedownAttackChoice','lookThreeCharacter','attackEndTakeFacedowns',
 'fieldLeaveRestNamed','blockWinRetireRecover','mayHandRaidTop'
]);
const OPS=new Set(SHARED_PRINT_VOL2_OPS);
const keys=(effect,...names)=>Object.keys(effect).length===names.length&&
 names.every(name=>Object.hasOwn(effect,name));
const text=value=>typeof value==='string'&&!!value.trim()&&value.length<=80;

export function verifySharedPrintVol2Op(effect){
 if(!effect||!OPS.has(effect.op))return false;
 if(!keys(effect,'op'))throw Error('Invalid vol2 print');
 return true;
}

const MAINS={
 frontFieldImpact:['op','frontOnly','oncePerTurn'],
 entryFrontMenu:['op','oncePerTurn'],
 bottomNameGrant:['op','oncePerTurn'],
 raidRestGen:['op'],
 activeHandWindow:['op','frontOnly','oncePerTurn']
};
export function sharedPrintVol2Main(card,ability){
 if(!ability||!Object.hasOwn(MAINS,ability.op))return false;
 if(!['character','field'].includes(card?.type)||!keys(ability,...MAINS[ability.op]))return false;
 if(ability.op==='frontFieldImpact'&&!(ability.frontOnly===true&&ability.oncePerTurn===true))return false;
 if(ability.op==='entryFrontMenu'&&ability.oncePerTurn!==true)return false;
 if(ability.op==='bottomNameGrant'&&ability.oncePerTurn!==true)return false;
 if(ability.op==='activeHandWindow'&&!(ability.frontOnly===true&&ability.oncePerTurn===true))return false;
 return true;
}
export function validateSharedPrintVol2Card(card){
 const leave=card.fieldLeaveRestNamed;
 if(leave!==undefined&&!(card.type==='character'&&leave.color==='yellow'&&leave.name==='千石撫子'&&
  leave.maxEnergy===2&&keys(leave,'color','name','maxEnergy')))
  throw Error(card.id+' invalid field-leave rest');
 const block=card.blockWinRetireRecover;
 if(block!==undefined&&!(card.type==='character'&&block.name==='忍野忍'&&block.maxEnergy===1&&
  keys(block,'name','maxEnergy')))
  throw Error(card.id+' invalid block-win recovery');
 const outside=card.outsideMain;
 if(outside!==undefined&&!(outside.op==='outsideRetireEnter'&&text(outside.name)&&
  Number.isInteger(outside.minBp)&&keys(outside,'op','name','minBp')||
  outside.op==='outsideBlackHand'&&keys(outside,'op')))
  throw Error(card.id+' invalid outside main');
 const plain=card.unraidedMain;
 if(plain!==undefined&&!(card.type==='character'&&plain.op==='unraidedFaceUpUnder'&&
  plain.oncePerTurn===true&&plain.name==='阿良々木暦'&&keys(plain,'op','oncePerTurn','name')))
  throw Error(card.id+' invalid unraided main');
}

let apiContinue=null;
let apiPack=null;
function done(s,pack){s.pending=null;apiContinue(pack,s);}
function ask(s,body){
 s.pending={kind:body.look===true?'effect-vol2-look':'effect-vol2',...body};
}
function named(api,pack,s,card,name){
 return api.cardHasName(api.card(pack,card),name,api.originalEffectsDisabled(s,card));
}
function printedEnergy(api,pack,card){return api.card(pack,card).energy||0;}
function raiding(card){return !!(card?.stack||[]).some(layer=>layer.faceDown!==true);}
function findOwned(pl,uid){
 return [...(pl.front||[]),...(pl.energy||[]),...pl.hand,...pl.deck,...pl.outside,...pl.removed,
  ...(pl.resolvingEvents||[])].find(card=>card?.uid===uid)||null;
}
function cells(api,pl,line){
 return api.legalDestinations(pl,line).filter(dest=>!dest.replaceUid)
  .map(dest=>({line,slot:dest.slot}));
}
function moveLinear(api,pack,s,owner,from,index,to,sourceUid,revealed){
 api.moveOwnedLinear(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid,
  ...(to==='deck'?{deckPosition:'top'}:{}),...(revealed?{revealed:true}:{})});
}
function takeOrigin(api,pack,s,owner,host,to,sourceUid){
 const origin=host.stack?.[0];
 if(!origin||origin.faceDown===true)return null;
 host.stack=host.stack.slice(1);
 origin.ready=false;origin.faceDown=false;origin.stack=[];origin.under=[];origin.buffs=[];
 delete origin.raidBaseUid;
 s.players[owner][to].push(origin);
 api.recordMove(pack,s,{physical:origin,owner,from:'raid-under',to,reason:'own-effect',sourceUid});
 return origin;
}
function bury(api,pack,s,owner,host,physical,faceDown,sourceUid,from){
 physical.ready=false;physical.faceDown=faceDown;physical.stack=[];physical.buffs=[];
 host.under??=[];host.under.push(physical);
 api.recordMove(pack,s,{physical,owner,from,to:'raid-under',reason:'own-effect',sourceUid});
}
function mark(s,paired,uid){
 const list=paired?s.altMainAbilityUsedUids:s.mainAbilityUsedUids;
 if(!list.includes(uid))list.push(uid);
}
function used(s,paired,uid){
 return (paired?s.altMainAbilityUsedUids:s.mainAbilityUsedUids).includes(uid);
}
function apBanned(s,player){return s.players[player].apEffectReadyBanTurn===s.turn;}
function readyAp(s,player){
 if(apBanned(s,player))return false;
 const ap=s.players[player].apCards.find(card=>card.inPlay&&!card.ready);
 if(!ap)return false;
 ap.ready=true;
 return true;
}
function look(pl,count){
 const cards=pl.deck.slice(0,Math.min(count,pl.deck.length));
 return {cards,uids:cards.map(card=>card.uid)};
}
function pull(pl,uids){
 const taken=[];
 for(const uid of uids){
  const index=pl.deck.findIndex(card=>card.uid===uid);
  if(index<0)throw Error('Looked card left the deck');
  taken.push(pl.deck.splice(index,1)[0]);
 }
 return taken;
}
function frontOnly(api,pack,s,player,names){
 return s.players[player].front.filter(Boolean).every(card=>
  names.some(name=>named(api,pack,s,card,name)));
}

export function runSharedPrintVol2Job(api,pack,s,job){
 apiContinue=api.continueQueue;
 apiPack=pack;
 if(!OPS.has(job.op))return false;
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='raidTopOutsideThen'){
  const choices=api.field(pl).filter(card=>raiding(card)&&named(api,pack,s,card,'千石撫子'))
   .map(card=>card.uid);
  if(choices.length)ask(s,{mode:'raidTop',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='drawYellowField'){
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  const choices=pl.outside.filter(card=>api.card(pack,card).type==='field'&&
   api.card(pack,card).color==='yellow').map(card=>card.uid);
  const slots=cells(api,pl,'energy');
  if(choices.length&&slots.length)ask(s,{mode:'fieldRest',player:owner,sourceUid:job.sourceUid,
   choices,slots,optional:true});
  return true;
 }
 if(job.op==='fieldLeaveRestNamed'){
  const choices=pl.outside.filter(card=>api.card(pack,card).color==='yellow'&&
   printedEnergy(api,pack,card)<=2&&named(api,pack,s,card,'千石撫子')).map(card=>card.uid);
  const slots=['front','energy'].flatMap(line=>cells(api,pl,line));
  if(choices.length&&slots.length)ask(s,{mode:'leaveRest',player:owner,sourceUid:job.sourceUid,
   choices,slots,optional:true});
  return true;
 }
 if(job.op==='reenterSelfRest'){
  const card=pl.outside.find(item=>item.uid===job.sourceUid);
  const slots=['front','energy'].flatMap(line=>cells(api,pl,line));
  if(card&&slots.length)ask(s,{mode:'reenter',player:owner,sourceUid:job.sourceUid,
   uid:card.uid,slots,optional:false});
  return true;
 }
 if(job.op==='retireHighNadekoChoice'){
  if(s.active!==owner)return true;
  const choices=api.field(pl).filter(card=>named(api,pack,s,card,'千石撫子')&&
   printedEnergy(api,pack,card)>=8).map(card=>card.uid);
  ask(s,{mode:'nadekoChoice',player:owner,sourceUid:job.sourceUid,choices});
  return true;
 }
 if(job.op==='raidedEnergyReveal'){
  if(!pl.deck.length)return true;
  ask(s,{mode:'energyNumber',player:owner,sourceUid:job.sourceUid,raidUid:job.raidUid});
  return true;
 }
 if(job.op==='drawLockApReady'){
  api.draw(pack,s,owner,3,{reason:'own-effect',sourceUid:job.sourceUid});
  pl.apEffectReadyBanTurn=s.turn;
  return true;
 }
 if(job.op==='raidEntryDraw'){
  const loc=api.location(s,owner,job.sourceUid);
  if(loc&&raiding(loc.c)&&loc.c.entryTurn===s.turn)
   api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  return true;
 }
 if(job.op==='lookTwoOutsideOrigin'||job.op==='lookTwoHandRemovedAp'||
  job.op==='lookSurugaOutside'||job.op==='lookThreeCharacter'){
  const count=job.op==='lookThreeCharacter'?3:2;
  const window=look(pl,count);
  if(!window.uids.length)return true;
  ask(s,{look:true,mode:job.op,player:owner,sourceUid:job.sourceUid,
   uids:window.uids,choices:job.op==='lookSurugaOutside'?window.cards.filter(card=>
    named(api,pack,s,card,'神原駿河')).map(card=>card.uid):
    job.op==='lookThreeCharacter'?window.cards.filter(card=>
     api.card(pack,card).type==='character').map(card=>card.uid):window.uids,
   selected:[],optional:true});
  return true;
 }
 if(job.op==='optionalOriginDraw'){
  const hand=pl.hand.map(card=>card.uid);
  const hosts=api.field(pl).filter(card=>card.uid!==job.sourceUid&&raiding(card)).map(card=>card.uid);
  if(hand.length&&hosts.length)ask(s,{mode:'originHand',player:owner,sourceUid:job.sourceUid,
   hand,hosts,optional:true});
  return true;
 }
 if(job.op==='drawHandFinalPair'){
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  if(pl.hand.length)ask(s,{mode:'handFinal',player:owner,sourceUid:job.sourceUid,
   hand:pl.hand.map(card=>card.uid),optional:true});
  return true;
 }
 if(job.op==='optionalKoyomiReenter'){
  const choices=api.field(pl).filter(card=>named(api,pack,s,card,'阿良々木暦')).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'koyomiReenter',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='yotsugiOrMove'){
  const choices=api.field(pl).filter(card=>named(api,pack,s,card,'斧乃木余接')).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'yotsugiBranch',player:owner,sourceUid:job.sourceUid,choices});
  return true;
 }
 if(job.op==='retireMayoiPair'){
  const choices=api.field(pl).filter(card=>named(api,pack,s,card,'八九寺真宵')&&
   printedEnergy(api,pack,card)===3).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'mayoiRetire',player:owner,sourceUid:job.sourceUid,choices});
  return true;
 }
 if(job.op==='raidedFacedownDraw'){
  const host=api.location(s,owner,job.raidUid);
  if(host&&pl.deck.length)ask(s,{mode:'facedownRaider',player:owner,sourceUid:job.sourceUid,
   raidUid:job.raidUid,optional:true});
  return true;
 }
 if(job.op==='drawHandOrFlower'){
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  const flowers=api.field(pl).filter(card=>named(api,pack,s,card,'沼地蠟花')).map(card=>card.uid);
  if(pl.hand.length)ask(s,{mode:'handFlower',player:owner,sourceUid:job.sourceUid,
   hand:pl.hand.map(card=>card.uid),flowers,optional:false});
  return true;
 }
 if(job.op==='facedownAttackChoice'){
  const key=job.sourceUid+'|facedownAttack';
  if(s.onceEffectUses[owner].includes(key))return true;
  const total=api.field(pl).reduce((n,card)=>n+api.directFacedowns(card).length,0);
  const usedIds=s.onceEffectUses[owner];
  const options=[];
  if(total>=1&&!usedIds.includes('神原駿河|draw'))options.push('draw');
  if(total>=3&&!usedIds.includes('神原駿河|move'))options.push('move');
  if(!options.length)return true;
  s.onceEffectUses[owner].push(key);
  ask(s,{mode:'facedownMenu',player:owner,sourceUid:job.sourceUid,options,optional:true});
  return true;
 }
 if(job.op==='attackEndTakeFacedowns'){
  const choices=api.field(pl).filter(card=>card.uid!==job.sourceUid&&raiding(card)&&
   named(api,pack,s,card,'神原駿河')).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'takeFacedowns',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='blockWinRetireRecover'){
  const loc=api.location(s,owner,job.sourceUid);
  if(!loc)return true;
  const opened=api.retire(pack,s,owner,loc.line,loc.slot,{by:'effect',sourceUid:job.sourceUid});
  if(opened)return true;
  const choices=pl.outside.filter(card=>card.uid!==job.sourceUid&&
   named(api,pack,s,card,'忍野忍')&&printedEnergy(api,pack,card)<=1).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'recoverShinobu',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='mayHandRaidTop'){
  const key='ブラック羽川|attackEndRaid';
  const loc=api.location(s,owner,job.sourceUid);
  if(!loc||!raiding(loc.c)||s.onceEffectUses[owner].includes(key)||!pl.hand.length)return true;
  ask(s,{mode:'handRaid',player:owner,sourceUid:job.sourceUid,
   hand:pl.hand.map(card=>card.uid),optional:true});
  return true;
 }
 return true;
}

function finishLook(api,pack,s,q,action){
 const owner=q.player,pl=s.players[owner];
 const selected=action.mode==='take'?[...q.selected,action.uid]:q.selected;
 if(action.mode==='take'){
  if(!q.choices.includes(action.uid)||q.selected.includes(action.uid))throw Error('Illegal look');
  const limit=q.mode==='lookTwoHandRemovedAp'?2:1;
  if(q.mode!=='lookTwoOutsideOrigin'&&selected.length>limit)throw Error('Too many looked cards');
  if(q.mode==='lookTwoOutsideOrigin'){
   q.selected=selected;
   return;
  }
  if(selected.length<limit&&q.choices.some(uid=>!selected.includes(uid))){q.selected=selected;return;}
 }
 const taken=pull(pl,selected);
 const rest=pull(pl,q.uids.filter(uid=>!selected.includes(uid)));
 if(q.mode==='lookTwoOutsideOrigin'){
  pl.deck.unshift(...taken.reverse());
  for(const card of rest){
   pl.outside.push(card);
   api.recordMove(pack,s,{physical:card,owner,from:'deck',to:'outside',reason:'own-effect',
    sourceUid:q.sourceUid,revealed:true});
   api.publishWindow(pack,s,owner,[card]);
  }
  const hosts=api.field(pl).filter(card=>raiding(card));
  if(hosts.length){
   ask(s,{mode:'removeOrigin',player:owner,sourceUid:q.sourceUid,
    hosts:hosts.map(card=>card.uid),optional:true});
   return;
  }
 }
 if(q.mode==='lookTwoHandRemovedAp'){
  for(const card of taken){
   pl.hand.push(card);
   api.recordMove(pack,s,{physical:card,owner,from:'deck',to:'hand',reason:'own-effect',
    sourceUid:q.sourceUid,revealed:true});
   api.publishAdded(pack,s,owner,card);
  }
  for(const card of rest){
   pl.removed.push(card);
   api.recordMove(pack,s,{physical:card,owner,from:'deck',to:'removed',reason:'own-effect',
    sourceUid:q.sourceUid,revealed:true});
  }
  if(rest.length>=1)readyAp(s,owner);
  if(rest.length>=2){
   const finals=pl.removed.filter(card=>api.card(pack,card).trigger==='final'&&
    !rest.some(item=>item.uid===card.uid)).map(card=>card.uid);
   if(finals.length){ask(s,{mode:'recoverFinal',player:owner,sourceUid:q.sourceUid,choices:finals,optional:true,extra:null});return;}
  }
 }
 if(q.mode==='lookSurugaOutside'){
  for(const card of taken){
   pl.outside.push(card);
   api.recordMove(pack,s,{physical:card,owner,from:'deck',to:'outside',reason:'own-effect',
    sourceUid:q.sourceUid,revealed:true});
   api.publishWindow(pack,s,owner,[card]);
  }
  pl.deck.unshift(...rest.reverse());
 }
 if(q.mode==='lookThreeCharacter'){
  for(const card of taken){
   pl.hand.push(card);
   api.recordMove(pack,s,{physical:card,owner,from:'deck',to:'hand',reason:'own-effect',
    sourceUid:q.sourceUid,revealed:true});
   api.publishAdded(pack,s,owner,card);
  }
  pl.deck.push(...rest);
  if(taken.length){
   ask(s,{mode:'handAfterLook',player:owner,sourceUid:q.sourceUid,
    hand:pl.hand.map(card=>card.uid),optional:false});
   return;
  }
  offerEnergyChoice(api,pack,s,owner,q.sourceUid);
  return;
 }
 done(s,pack);
}
function offerEnergyChoice(api,pack,s,owner,sourceUid){
 const loc=api.location(s,owner,sourceUid);
 const live=loc&&api.effectiveRequiredEnergy(pack,s,loc.c)>=1;
 const characters=api.field(s.players[owner]).filter(card=>api.card(pack,card).type==='character');
 if(!live||!characters.length){done(s,pack);return;}
 ask(s,{mode:'energyMenu',player:owner,sourceUid,optional:true,
  buff:characters.map(card=>card.uid),
  ward:characters.filter(card=>!named(api,pack,s,card,'戦場ヶ原ひたぎ')).map(card=>card.uid)});
}

export function legalSharedPrintVol2Pending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-vol2'&&q?.kind!=='effect-vol2-look')return null;
 const choose=(mode,uid,extra)=>({type:'chooseVol2',mode,uid,...(extra||{})});
 if(q.mode==='energyNumber')return Array.from({length:9},(_,energy)=>({type:'chooseVol2',mode:'energy',energy}));
 if(q.mode==='nadekoChoice')return [
  {type:'chooseVol2',mode:'discount',uid:null},
  {type:'chooseVol2',mode:'sniper',uid:null}];
 if(q.mode==='yotsugiBranch')return [
  {type:'chooseVol2',mode:'buff',uid:null},
  {type:'chooseVol2',mode:'move',uid:null}];
 if(q.mode==='facedownMenu')return q.options.map(option=>({type:'chooseVol2',mode:option,uid:null}))
  .concat(q.optional?[{type:'chooseVol2',mode:'skip',uid:null}]:[]);
 if(q.mode==='energyMenu')return [
  ...(q.buff.length?[{type:'chooseVol2',mode:'buff',uid:null}]:[]),
  ...(q.ward.length?[{type:'chooseVol2',mode:'ward',uid:null}]:[]),
  {type:'chooseVol2',mode:'skip',uid:null}];
 if(q.mode==='entryMenu')return q.options.map(option=>({type:'chooseVol2',mode:option,uid:null}))
  .concat([{type:'chooseVol2',mode:'skip',uid:null}]);
 if(q.look===true||q.kind==='effect-vol2-look'){
  const out=q.choices.filter(uid=>!q.selected.includes(uid)).map(uid=>choose('take',uid));
  out.push(choose('done',null));
  return out;
 }
 if(q.mode==='fieldRest'||q.mode==='leaveRest'||q.mode==='reenter'||q.mode==='koyomiActive'||q.mode==='mayoiEnter'){
  const out=[];
  for(const uid of q.choices||[q.uid||q.pick])for(const dest of q.slots)
   out.push({type:'chooseVol2',mode:'enter',uid,line:dest.line,slot:dest.slot});
  if(q.optional!==false)out.push(choose('skip',null));
  return out;
 }
 if(q.mode==='mayoiDeploy'){
  const pool=q.step==='one'?q.one:q.two;
  return [...pool.map(uid=>choose('pick',uid)),choose('skip',null)];
 }
 if(q.mode==='handFlower'){
  const out=q.hand.map(uid=>choose('outside',uid));
  for(const uid of q.hand)for(const host of q.flowers)out.push({type:'chooseVol2',mode:'under',uid,host});
  return out;
 }
 if(q.mode==='windowMenu')return ['draw','buff','window'].map(mode=>({type:'chooseVol2',mode,uid:null}));
 if(q.mode==='bottomNames')return [
  ...q.choices.filter(uid=>!q.selected.includes(uid)).map(uid=>choose('pick',uid)),
  ...(q.selected.length?[{type:'chooseVol2',mode:'done',uid:null}]:[])];
 if(q.mode==='menuDiscard')return q.hand.filter(uid=>!q.selected.includes(uid)).map(uid=>choose('pick',uid));
 if(q.mode==='movePick'){
  const out=q.targets.map(target=>choose(target.kind,target.uid,{line:target.line,slot:target.slot}));
  if(q.optional)out.push(choose('skip',null));
  return out;
 }
 const skip=q.optional!==false?[choose('skip',null)]:[];
 return [...(q.choices||q.hand||q.hosts||[]).map(uid=>choose('pick',uid)),...skip];
}

export function resolveSharedPrintVol2Pending(api,pack,s,action){
 apiContinue=api.continueQueue;
 apiPack=pack;
 const q=s.pending;
 if(q?.kind!=='effect-vol2'&&q?.kind!=='effect-vol2-look')return false;
 if(action?.type!=='chooseVol2')throw Error('Illegal vol2 choice');
 if(['retireField','faceUpUnder','outsideRetire','blackRemove'].includes(q.mode))
  return resolveSharedPrintVol2Activation(api,pack,s,action);
 const owner=q.player,pl=s.players[owner];
 if((q.kind==='effect-vol2-look')&&(action.mode==='take'||action.mode==='done')){
  finishLook(api,pack,s,q,action);
  return true;
 }
 if(action.mode==='skip'){
  if(q.optional===false)throw Error('This choice cannot be skipped');
  if(q.mode==='restFront'){
   const nadeko=api.field(pl).filter(card=>named(api,pack,s,card,'千石撫子')&&
    !api.card(pack,card).raidName&&!api.card(pack,card).raidTrait).map(card=>card.uid);
   if(nadeko.length)ask(s,{mode:'replayNadeko',player:owner,sourceUid:q.sourceUid,choices:nadeko,optional:true});
   else done(s,pack);
   return true;
  }
  if(q.mode==='handAfterLook'){offerEnergyChoice(api,pack,s,owner,q.sourceUid);return true;}
  if(q.mode==='entryPay'){
   ask(s,{mode:'entryMenu',player:owner,sourceUid:q.sourceUid,options:q.options,left:1,picked:[]});
   return true;
  }
  if(q.mode==='companion'){readyAp(s,owner);done(s,pack);return true;}
  done(s,pack);return true;
 }
 if(q.mode==='raidTop'){
  const host=api.location(s,owner,action.uid);
  if(!host||!q.choices.includes(action.uid))throw Error('Illegal raid top');
  const origin=host.c.stack[0];
  host.c.stack=[];
  pl[host.line][host.slot]=origin;
  host.c.ready=false;host.c.stack=[];host.c.buffs=[];
  pl.outside.push(host.c);
  api.recordMove(pack,s,{physical:host.c,owner,from:host.line,to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
  const fronts=s.players[1-owner].front.filter(Boolean).map(card=>card.uid);
  ask(s,{mode:'restFront',player:owner,sourceUid:q.sourceUid,choices:fronts,optional:true});
  return true;
 }
 if(q.mode==='restFront'){
  const foe=s.players[1-owner];
  const loc=[...foe.front.map((card,slot)=>card&&{card,line:'front',slot}),
   ...foe.energy.map((card,slot)=>card&&{card,line:'energy',slot})].find(item=>item?.card.uid===action.uid);
  if(!q.choices.includes(action.uid)||!loc)throw Error('Illegal rest');
  api.noteOwnEffectRest(s,1-owner,loc.card);loc.card.ready=false;
  const nadeko=api.field(pl).filter(card=>named(api,pack,s,card,'千石撫子')&&
   !api.card(pack,card).raidName&&!api.card(pack,card).raidTrait).map(card=>card.uid);
  if(nadeko.length)ask(s,{mode:'replayNadeko',player:owner,sourceUid:q.sourceUid,choices:nadeko,optional:true});
  else done(s,pack);
  return true;
 }
 if(q.mode==='replayNadeko'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal replay');
  const jobs=api.printedJobs(pack,s,loc.c,'onPlay',owner).filter(item=>item.op!=='raidTopOutsideThen');
  s.effectQueue.unshift(...jobs);
  done(s,pack);return true;
 }
 if(q.mode==='fieldRest'||q.mode==='leaveRest'){
  if(!q.choices.includes(action.uid)||!q.slots.some(dest=>dest.line===action.line&&dest.slot===action.slot))
   throw Error('Illegal rest entry');
  s.pending=null;
  api.effectEnter(pack,s,{owner,from:'outside',uid:action.uid,line:action.line,slot:action.slot,
   ready:false,sourceUid:q.sourceUid});
  return true;
 }
 if(q.mode==='reenter'){
  if(action.uid!==q.uid||!q.slots.some(dest=>dest.line===action.line&&dest.slot===action.slot))
   throw Error('Illegal reentry');
  s.pending=null;
  api.effectEnter(pack,s,{owner,from:'outside',uid:q.uid,line:action.line,slot:action.slot,
   ready:false,sourceUid:q.sourceUid,skipOnPlay:true});
  return true;
 }
 if(q.mode==='nadekoChoice'&&action.mode==='discount'){
  pl.nextNamedHandEnergy.push({name:'千石撫子',color:'yellow',amount:3,minEnergy:8,turn:s.turn,
   sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='nadekoChoice'&&action.mode==='sniper'){
  if(q.choices.length)ask(s,{mode:'grantSniper',player:owner,sourceUid:q.sourceUid,choices:q.choices,optional:true});
  else done(s,pack);
  return true;
 }
 if(q.mode==='grantSniper'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal sniper');
  loc.c.sniperGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp};
  done(s,pack);return true;
 }
 if(q.mode==='energyNumber'){
  if(!Number.isInteger(action.energy)||action.energy<0||action.energy>8)throw Error('Illegal energy');
  const top=pl.deck[0];
  if(!top)throw Error('Deck is empty');
  api.publishWindow(pack,s,owner,[top]);
  if(printedEnergy(api,pack,top)===action.energy)
   moveLinear(api,pack,s,owner,'deck',0,'hand',q.sourceUid);
  done(s,pack);return true;
 }
 if(q.mode==='originHand'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0||!q.hand.includes(action.uid))throw Error('Illegal hand payment');
  const paid=pl.hand.splice(index,1)[0];
  pl.outside.push(paid);
  api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  ask(s,{mode:'originHost',player:owner,sourceUid:q.sourceUid,choices:q.hosts,optional:false});
  return true;
 }
 if(q.mode==='removeOrigin'||q.mode==='originHost'){
  const host=api.field(pl).find(card=>card.uid===action.uid);
  if(!host||!(q.choices||q.hosts||[]).includes(action.uid))throw Error('Illegal raid origin');
  const origin=takeOrigin(api,pack,s,owner,host,'removed',q.sourceUid);
  if(!origin)throw Error('Raid origin left');
  const gen=api.card(pack,origin).gen||0;
  if(q.mode==='originHost'){
   api.draw(pack,s,owner,gen+1,{reason:'own-effect',sourceUid:q.sourceUid});
   const self=api.location(s,owner,q.sourceUid);
   if(self&&gen===0){
    self.c.buffs??=[];self.c.buffs.push({bp:1000,untilTurn:s.turn});
    self.c.sniperGranted={turn:s.turn,stamp:self.c.fieldEntryStamp};
   }
  }else s.effectQueue.unshift({op:'drawDiscard',owner,count:1,sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='recoverFinal'||q.mode==='finalPair'){
  const index=pl.removed.findIndex(card=>card.uid===action.uid);
  if(index<0||!(q.choices||[]).includes(action.uid))throw Error('Illegal final');
  const card=pl.removed.splice(index,1)[0];
  pl.hand.push(card);
  api.recordMove(pack,s,{physical:card,owner,from:'removed',to:'hand',reason:'own-effect',sourceUid:q.sourceUid});
  if(q.mode==='finalPair'&&q.extraName){
   const more=pl.removed.filter(item=>named(api,pack,s,item,q.extraName)).map(item=>item.uid);
   if(more.length){ask(s,{mode:'recoverFinal',player:owner,sourceUid:q.sourceUid,choices:more,optional:true});return true;}
  }
  done(s,pack);return true;
 }
 if(q.mode==='handFinal'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0||!q.hand.includes(action.uid))throw Error('Illegal hand removal');
  const paid=pl.hand.splice(index,1)[0];
  pl.removed.push(paid);
  api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'removed',reason:'own-effect',sourceUid:q.sourceUid});
  const name=api.card(pack,paid).name.replace(/\s+/g,'');
  const extra=name==='忍野扇'?'阿良々木暦':name==='阿良々木暦'?'忍野扇':null;
  const finals=pl.removed.filter(card=>api.card(pack,card).trigger==='final').map(card=>card.uid);
  if(finals.length)ask(s,{mode:'finalPair',player:owner,sourceUid:q.sourceUid,choices:finals,optional:true,extraName:extra});
  else done(s,pack);
  return true;
 }
 if(q.mode==='koyomiReenter'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal koyomi');
  const origins=(loc.c.stack||[]).filter(card=>card.faceDown!==true);
  loc.c.stack=[];
  const opened=api.retire(pack,s,owner,loc.line,loc.slot,{by:'effect',sourceUid:q.sourceUid});
  if(opened)return true;
  const slots=['front','energy'].flatMap(line=>cells(api,pl,line));
  if(!pl.outside.some(card=>card.uid===action.uid)||!slots.length){done(s,pack);return true;}
  ask(s,{mode:'koyomiActive',player:owner,sourceUid:q.sourceUid,uid:action.uid,slots,
   origins:origins.map(card=>card.uid),optional:false});
  for(const origin of origins)if(!pl.outside.includes(origin)&&!pl.removed.includes(origin)&&
   !pl.hand.includes(origin))pl.outside.push(origin);
  return true;
 }
 if(q.mode==='koyomiActive'){
  s.pending=null;
  api.effectEnter(pack,s,{owner,from:'outside',uid:q.uid,line:action.line,slot:action.slot,
   ready:true,sourceUid:q.sourceUid,skipOnPlay:true});
  const origins=(q.origins||[]).filter(uid=>pl.outside.some(card=>card.uid===uid));
  if(origins.length)ask(s,{mode:'originHand',player:owner,sourceUid:q.sourceUid,choices:origins,optional:true});
  else done(s,pack);
  return true;
 }
 if(q.mode==='originHand'||q.mode==='recoverShinobu'){
  const zone=q.mode==='recoverShinobu'?'outside':'outside';
  const index=pl[zone].findIndex(card=>card.uid===action.uid);
  if(index<0||!(q.choices||[]).includes(action.uid))throw Error('Illegal recovery');
  const card=pl[zone].splice(index,1)[0];
  pl.hand.push(card);
  api.recordMove(pack,s,{physical:card,owner,from:zone,to:'hand',reason:'own-effect',sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='yotsugiBranch'){
  ask(s,{mode:action.mode==='buff'?'yotsugiBuff':'yotsugiMove',player:owner,sourceUid:q.sourceUid,
   choices:q.choices,optional:false});
  return true;
 }
 if(q.mode==='yotsugiBuff'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal yotsugi');
  loc.c.buffs??=[];loc.c.buffs.push({bp:2000,untilTurn:s.turn});
  loc.c.impactGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,amount:1};
  done(s,pack);return true;
 }
 if(q.mode==='yotsugiMove'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal yotsugi');
  const other=loc.line==='front'?'energy':'front';
  const targets=[...cells(api,pl,other).map(dest=>({kind:'empty',uid:null,line:other,slot:dest.slot})),
   ...pl[other].filter(Boolean).map(card=>({kind:'swap',uid:card.uid,line:other,
    slot:pl[other].findIndex(item=>item?.uid===card.uid)}))];
  const same=pl[loc.line].filter(card=>card&&card.uid!==loc.c.uid&&api.card(pack,card).type==='character')
   .map(card=>card.uid);
  ask(s,{mode:'movePick',player:owner,sourceUid:q.sourceUid,mover:loc.c.uid,from:loc.line,
   targets,companion:same,optional:false});
  return true;
 }
 if(q.mode==='movePick'){
  const loc=api.location(s,owner,q.mover);
  if(!loc)throw Error('Mover left');
  const dest=action.mode==='empty'?{line:action.line,slot:action.slot,card:null}:
   {line:action.line,slot:action.slot,card:pl[action.line][action.slot]};
  if(action.mode==='swap'&&dest.card?.uid!==action.uid)throw Error('Illegal swap');
  const companion=q.companion.length&&q.step!=='companion'?q.companion:null;
  applyShift(pl,loc,dest);
  if(companion){
   ask(s,{mode:'companion',player:owner,sourceUid:q.sourceUid,choices:companion,optional:true,
    used:{line:dest.line,slot:dest.slot,uid:dest.card?.uid||null}});
   return true;
  }
  readyAp(s,owner);done(s,pack);return true;
 }
 if(q.mode==='companion'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal companion');
  const other=loc.line==='front'?'energy':'front';
  const targets=cells(api,pl,other).filter(dest=>!(dest.line===q.used.line&&dest.slot===q.used.slot))
   .map(dest=>({kind:'empty',uid:null,...dest}))
   .concat(pl[other].filter(card=>card&&card.uid!==q.used.uid).map(card=>({kind:'swap',uid:card.uid,
    line:other,slot:pl[other].findIndex(item=>item?.uid===card.uid)})));
  ask(s,{mode:'movePick',player:owner,sourceUid:q.sourceUid,mover:loc.c.uid,from:loc.line,
   targets,companion:[],optional:true,step:'companion'});
  return true;
 }
 if(q.mode==='mayoiRetire'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal mayoi');
  const opened=api.retire(pack,s,owner,loc.line,loc.slot,{by:'effect',sourceUid:q.sourceUid});
  if(opened)return true;
  const one=pl.outside.filter(card=>api.card(pack,card).type==='character'&&
   api.card(pack,card).color==='green'&&api.card(pack,card).ap===1&&printedEnergy(api,pack,card)===1);
  const two=pl.outside.filter(card=>api.card(pack,card).type==='character'&&
   api.card(pack,card).color==='green'&&printedEnergy(api,pack,card)===2);
  ask(s,{mode:'mayoiDeploy',player:owner,sourceUid:q.sourceUid,retired:action.uid,
   one:one.map(card=>card.uid),two:two.map(card=>card.uid),step:'one',optional:true});
  return true;
 }
 if(q.mode==='mayoiDeploy'){
  const pool=q.step==='one'?q.one:q.two;
  if(action.mode==='pick'){
   if(!pool.includes(action.uid))throw Error('Illegal deploy');
   const slots=['front','energy'].flatMap(line=>cells(api,pl,line));
   if(!slots.length){done(s,pack);return true;}
   q.pick=action.uid;q.slots=slots;q.mode='mayoiEnter';
   return true;
  }
  done(s,pack);return true;
 }
 if(q.mode==='mayoiEnter'){
  const entering=pl.outside.find(card=>card.uid===q.pick);
  const before=api.card(pack,entering);
  s.pending=null;
  api.effectEnter(pack,s,{owner,from:'outside',uid:q.pick,line:action.line,slot:action.slot,
   ready:false,sourceUid:q.sourceUid});
  const koyomi=before.name.replace(/\s+/g,'').includes('阿良々木暦');
  if(s.pending)return true;
  if(q.step==='one'){
   ask(s,{mode:'mayoiDeploy',player:owner,sourceUid:q.sourceUid,retired:q.retired,
    one:q.one,two:q.two,step:'two',optional:true,koyomi:koyomi||q.koyomi});
   return true;
  }
  if(q.koyomi||koyomi){
   const slots=['front','energy'].flatMap(line=>cells(api,pl,line));
   if(pl.outside.some(card=>card.uid===q.retired)&&slots.length){
    ask(s,{mode:'reenter',player:owner,sourceUid:q.sourceUid,uid:q.retired,slots,optional:true});
    return true;
   }
  }
  done(s,pack);return true;
 }
 if(q.mode==='facedownRaider'){
  const host=api.location(s,owner,q.raidUid);
  if(!host||!pl.deck.length)throw Error('Raider left');
  const buriedCard=pl.deck.shift();
  bury(api,pack,s,owner,host.c,buriedCard,true,q.sourceUid,'deck');
  s.effectQueue.unshift({op:'drawDiscard',owner,count:1,sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='handFlower'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0||!q.hand.includes(action.uid))throw Error('Illegal hand card');
  const paid=pl.hand.splice(index,1)[0];
  if(action.mode==='under'){
   const host=api.location(s,owner,action.host);
   if(!host||!q.flowers.includes(action.host))throw Error('Illegal flower');
   bury(api,pack,s,owner,host.c,paid,true,q.sourceUid,'hand');
  }else{
   pl.outside.push(paid);
   api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  }
  done(s,pack);return true;
 }
 if(q.mode==='facedownMenu'){
  if(action.mode==='draw'){
   s.onceEffectUses[owner].push('神原駿河|draw');
   api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
   done(s,pack);return true;
  }
  if(action.mode==='move'){
   s.onceEffectUses[owner].push('神原駿河|move');
   const cards=[];
   for(const host of pl.front.filter(Boolean))
    for(const layer of api.directFacedowns(host))cards.push({host:host.uid,uid:layer.uid});
   if(cards.length)ask(s,{mode:'moveFacedown',player:owner,sourceUid:q.sourceUid,
    choices:cards.map(card=>card.uid),hosts:cards,optional:true});
   else done(s,pack);
   return true;
  }
 }
 if(q.mode==='moveFacedown'){
  const item=q.hosts.find(card=>card.uid===action.uid);
  const host=pl.front.find(card=>card?.uid===item?.host);
  const self=api.location(s,owner,q.sourceUid);
  if(!item||!host||!self)throw Error('Facedown left');
  const index=host.under.findIndex(card=>card.uid===item.uid);
  const layer=host.under.splice(index,1)[0];
  self.c.under??=[];self.c.under.push(layer);
  api.attemptFieldActive(s,owner,self.c);
  done(s,pack);return true;
 }
 if(q.mode==='handAfterLook'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0)throw Error('Illegal hand card');
  const paid=pl.hand.splice(index,1)[0];
  pl.outside.push(paid);
  api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  offerEnergyChoice(api,pack,s,owner,q.sourceUid);
  return true;
 }
 if(q.mode==='energyMenu'){
  if(action.mode==='buff'){
   ask(s,{mode:'grantBuff',player:owner,sourceUid:q.sourceUid,choices:q.buff,optional:false});
   return true;
  }
  ask(s,{mode:'grantWard',player:owner,sourceUid:q.sourceUid,choices:q.ward,optional:false});
  return true;
 }
 if(q.mode==='grantBuff'||q.mode==='grantWard'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal grant');
  if(q.mode==='grantBuff'){loc.c.buffs??=[];loc.c.buffs.push({bp:1000,untilTurn:s.turn});}
  else loc.c.stayWard={untilOwnTurnStart:pl.ownTurns+1,stamp:loc.c.fieldEntryStamp};
  done(s,pack);return true;
 }
 if(q.mode==='takeFacedowns'){
  const host=api.field(pl).find(card=>card.uid===action.uid);
  const self=api.location(s,owner,q.sourceUid);
  if(!host||!self||!q.choices.includes(action.uid))throw Error('Illegal suruga');
  const layers=api.directFacedowns(host);
  host.under=(host.under||[]).filter(card=>card.faceDown!==true);
  self.c.under??=[];self.c.under.push(...layers);
  takeOrigin(api,pack,s,owner,host,'outside',q.sourceUid);
  done(s,pack);return true;
 }
 if(q.mode==='handRaid'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0||!q.hand.includes(action.uid))throw Error('Illegal hand card');
  const paid=pl.hand.splice(index,1)[0];
  pl.outside.push(paid);
  api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  s.onceEffectUses[owner].push('ブラック羽川|attackEndRaid');
  const targets=pl.front.filter(card=>card&&named(api,pack,s,card,'羽川翼')&&
   !api.card(pack,card).raidName&&!api.card(pack,card).raidTrait&&!(s.attacksByUid[card.uid]>0))
   .map(card=>card.uid);
  if(targets.length)ask(s,{mode:'raidOnto',player:owner,sourceUid:q.sourceUid,choices:targets,optional:true});
  else done(s,pack);
  return true;
 }
 if(q.mode==='raidOnto'){
  const self=api.location(s,owner,q.sourceUid);
  const base=api.location(s,owner,action.uid);
  if(!self||!base||!raiding(self.c)||!q.choices.includes(action.uid))throw Error('Illegal raid');
  const top=self.c,origin=top.stack[0];
  top.stack=[];
  pl[self.line][self.slot]=origin;
  s.pending=null;
  api.performRaid(pack,s,owner,top,base.c.uid,base.line,base.slot,null,
   {entryCause:'effectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
  return true;
 }
 if(q.mode==='entryPay'){
  const index=action.uid==null?-1:pl.hand.findIndex(card=>card.uid===action.uid);
  if(action.uid!=null){
   if(index<0)throw Error('Illegal hand card');
   const paid=pl.hand.splice(index,1)[0];
   pl.outside.push(paid);
   api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
   q.limit=2;
  }
  ask(s,{mode:'entryMenu',player:owner,sourceUid:q.sourceUid,options:q.options,left:q.limit||1,picked:[]});
  return true;
 }
 if(q.mode==='entryMenu'){
  if(q.picked.includes(action.mode))throw Error('Repeated menu choice');
  q.picked.push(action.mode);
  q.left--;
  if(action.mode==='recover'){
   const choices=pl.outside.filter(card=>named(api,pack,s,card,'阿良々木暦')).map(card=>card.uid);
   ask(s,{mode:'menuRecover',player:owner,sourceUid:q.sourceUid,choices,returnTo:q,optional:false});
   return true;
  }
  if(action.mode==='floor'){
   const choices=api.field(pl).filter(card=>named(api,pack,s,card,'阿良々木暦')).map(card=>card.uid);
   ask(s,{mode:'menuFloor',player:owner,sourceUid:q.sourceUid,choices,returnTo:q,optional:false});
   return true;
  }
  const choices=s.players[1-owner].front.filter(card=>card&&api.bp(pack,s,card)>=1500).map(card=>card.uid);
  ask(s,{mode:'menuDown',player:owner,sourceUid:q.sourceUid,choices,returnTo:q,optional:false});
  return true;
 }
 if(q.mode==='menuRecover'){
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  if(index<0)throw Error('Illegal koyomi');
  const card=pl.outside.splice(index,1)[0];
  pl.hand.push(card);
  api.recordMove(pack,s,{physical:card,owner,from:'outside',to:'hand',reason:'own-effect',sourceUid:q.sourceUid});
  const hand=pl.hand.map(item=>item.uid);
  ask(s,{mode:'menuDiscard',player:owner,sourceUid:q.sourceUid,hand,need:2,selected:[],returnTo:q.returnTo});
  return true;
 }
 if(q.mode==='menuDiscard'){
  if(!q.hand.includes(action.uid)||q.selected.includes(action.uid))throw Error('Illegal discard');
  q.selected.push(action.uid);
  if(q.selected.length<Math.min(q.need,q.hand.length))return true;
  for(const uid of q.selected){
   const index=pl.hand.findIndex(card=>card.uid===uid);
   const paid=pl.hand.splice(index,1)[0];
   pl.outside.push(paid);
   api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  }
  resumeMenu(s,q.returnTo);return true;
 }
 if(q.mode==='menuFloor'){
  const loc=api.location(s,owner,action.uid);
  if(!loc)throw Error('Illegal floor');
  loc.c.blockFloorGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,bp:3000};
  resumeMenu(s,q.returnTo);return true;
 }
 if(q.mode==='menuDown'){
  const loc=s.players[1-owner].front.map((card,slot)=>card&&{card,slot}).find(item=>item?.card.uid===action.uid);
  if(!loc)throw Error('Illegal front');
  loc.card.buffs??=[];loc.card.buffs.push({bp:-1000,untilTurn:s.turn});
  resumeMenu(s,q.returnTo);return true;
 }
 if(q.mode==='bottomNames'){
  if(!q.choices.includes(action.uid)||q.selected.includes(action.uid))throw Error('Illegal removed card');
  q.selected.push(action.uid);
  if(q.selected.length<2&&q.choices.some(uid=>!q.selected.includes(uid))&&action.mode!=='done')return true;
  const names=[];
  for(const uid of [...q.selected].reverse()){
   const index=pl.removed.findIndex(card=>card.uid===uid);
   const card=pl.removed.splice(index,1)[0];
   pl.deck.push(card);
   names.push(api.card(pack,card).name.replace(/\s+/g,''));
   api.recordMove(pack,s,{physical:card,owner,from:'removed',to:'deck',reason:'own-effect',
    sourceUid:q.sourceUid,deckPosition:'bottom'});
  }
  const self=api.location(s,owner,q.sourceUid);
  if(self){
   if(names.includes('老倉育'))
    self.c.impactNullGranted={untilOwnTurnStart:pl.ownTurns+1,stamp:self.c.fieldEntryStamp};
   if(names.includes('忍野扇'))
    self.c.readyGrantUntil={untilOwnTurnStart:pl.ownTurns+1,stamp:self.c.fieldEntryStamp};
  }
  done(s,pack);return true;
 }
 if(q.mode==='handWindow'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0)throw Error('Illegal hand card');
  const paid=pl.hand.splice(index,1)[0];
  pl.removed.push(paid);
  api.recordMove(pack,s,{physical:paid,owner,from:'hand',to:'removed',reason:'own-effect',sourceUid:q.sourceUid});
  ask(s,{mode:'windowMenu',player:owner,sourceUid:q.sourceUid});
  return true;
 }
 if(q.mode==='windowMenu'){
  const self=api.location(s,owner,q.sourceUid);
  if(action.mode==='draw')api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
  if(action.mode==='buff'&&self){self.c.buffs??=[];self.c.buffs.push({bp:1000,untilTurn:s.turn});}
  if(action.mode==='window')s.effectQueue.unshift({op:'grantNextBpWindow',owner,sourceUid:q.sourceUid,
   amount:1000,vol2:true});
  done(s,pack);return true;
 }
 throw Error('Illegal vol2 choice');
}
function resumeMenu(s,menu){
 if(menu.left>0){s.pending={kind:'effect-vol2',...menu,mode:'entryMenu'};return;}
 s.pending=null;apiContinue(apiPack,s);
}
function applyShift(pl,loc,dest){
 const mover=loc.c;
 pl[loc.line][loc.slot]=dest.card||null;
 pl[dest.line][dest.slot]=mover;
 if(dest.card){
  const back=pl[loc.line][loc.slot];
  if(back!==dest.card)pl[loc.line][loc.slot]=dest.card;
 }
}

export function legalSharedPrintVol2Activations(api,pack,s,player){
 if(s.phase!=='main')return [];
 const out=[],pl=s.players[player];
 for(const card of api.field(pl)){
  const printed=api.card(pack,card);
  const main=printed.mainAbility;
  const live=!api.originalEffectsDisabled(s,card);
  if(live&&main?.op==='frontFieldImpact'&&api.raidBoxTextLive(pack,card,'main')&&
   !used(s,false,card.uid)&&api.location(s,player,card.uid)?.line==='front'&&
   api.field(pl).some(other=>api.card(pack,other).type==='field'))
   out.push({type:'activate',uid:card.uid,mode:'vol2:fieldImpact'});
  if(live&&main?.op==='raidRestGen'&&card.ready&&api.raidBoxTextLive(pack,card,'main'))
   out.push({type:'activate',uid:card.uid,mode:'vol2:restGen'});
  if(live&&main?.op==='bottomNameGrant'&&!used(s,false,card.uid)&&
   pl.removed.some(item=>api.card(pack,item).type==='character'))
   out.push({type:'activate',uid:card.uid,mode:'vol2:bottom'});
  if(live&&main?.op==='activeHandWindow'&&!used(s,false,card.uid)&&card.ready&&
   api.location(s,player,card.uid)?.line==='front'&&pl.hand.length)
   out.push({type:'activate',uid:card.uid,mode:'vol2:window'});
  if(live&&main?.op==='entryFrontMenu'&&!used(s,false,card.uid)&&card.entryTurn===s.turn&&
   frontOnly(api,pack,s,player,['キスショット・アセロラオリオン・ハートアンダーブレード','忍野忍','阿良々木暦']))
   out.push({type:'activate',uid:card.uid,mode:'vol2:menu'});
  const plain=printed.unraidedMain;
  if(live&&plain&&!raiding(card)&&!used(s,true,card.uid)&&pl.hand.length&&
   pl.outside.some(item=>api.card(pack,item).color==='green'&&!api.card(pack,item).raidName&&
    named(api,pack,s,item,plain.name)))
   out.push({type:'activate',uid:card.uid,mode:'vol2:tuck'});
  const grant=card.readyGrantUntil;
  if(live&&grant&&grant.stamp===card.fieldEntryStamp&&pl.ownTurns<grant.untilOwnTurnStart&&
   !card.ready&&!s.onceEffectUses[player].includes(card.uid+'|readyGrant'))
   out.push({type:'activate',uid:card.uid,mode:'vol2:readyGrant'});
 }
 for(const card of pl.outside){
  const act=api.card(pack,card).outsideMain;
  if(!act)continue;
  if(act.op==='outsideRetireEnter'&&api.field(pl).some(other=>named(api,pack,s,other,act.name)&&
   api.bp(pack,s,other)>=act.minBp))
   out.push({type:'activate',uid:card.uid,mode:'vol2:outsideEnter'});
  if(act.op==='outsideBlackHand'&&frontOnly(api,pack,s,player,['羽川翼'])&&
   !pl.removed.some(item=>named(api,pack,s,item,'ブラック羽川'))&&
   pl.outside.some(item=>item.uid!==card.uid&&named(api,pack,s,item,'ブラック羽川')))
   out.push({type:'activate',uid:card.uid,mode:'vol2:blackHand'});
 }
 return out;
}

export function activateSharedPrintVol2(api,pack,s,action){
 if(action.type!=='activate'||typeof action.mode!=='string'||!action.mode.startsWith('vol2:'))return false;
 apiContinue=api.continueQueue;
 const player=s.active,pl=s.players[player];
 const fieldCard=api.location(s,player,action.uid);
 const outside=pl.outside.find(card=>card.uid===action.uid);
 const card=fieldCard?.c||outside;
 if(!card)throw Error('Vol2 source left');
 const printed=api.card(pack,card);
 if(action.mode==='vol2:fieldImpact'){
  mark(s,false,card.uid);
  const choices=api.field(pl).filter(other=>api.card(pack,other).type==='field').map(other=>other.uid);
  ask(s,{mode:'retireField',player,sourceUid:card.uid,choices,optional:false});
  return true;
 }
 if(action.mode==='vol2:restGen'){
  api.noteOwnEffectRest(s,player,card);card.ready=false;
  card.buffs??=[];card.buffs.push({energy:1,color:printed.color,untilTurn:s.turn});
  return true;
 }
 if(action.mode==='vol2:bottom'){
  mark(s,false,card.uid);
  const choices=pl.removed.filter(item=>api.card(pack,item).type==='character').map(item=>item.uid);
  ask(s,{mode:'bottomNames',player,sourceUid:card.uid,choices,selected:[],optional:false});
  return true;
 }
 if(action.mode==='vol2:window'){
  mark(s,false,card.uid);
  ask(s,{mode:'handWindow',player,sourceUid:card.uid,hand:pl.hand.map(item=>item.uid),optional:false});
  return true;
 }
 if(action.mode==='vol2:menu'){
  mark(s,false,card.uid);
  const options=[];
  if(pl.outside.some(item=>named(api,pack,s,item,'阿良々木暦'))&&pl.hand.length>=2)options.push('recover');
  if(api.field(pl).some(item=>named(api,pack,s,item,'阿良々木暦')))options.push('floor');
  if(s.players[1-player].front.some(item=>item&&api.bp(pack,s,item)>=1500))options.push('down');
  if(!options.length)return true;
  ask(s,{mode:'entryPay',player,sourceUid:card.uid,options,hand:pl.hand.map(item=>item.uid),optional:true});
  return true;
 }
 if(action.mode==='vol2:tuck'){
  mark(s,true,card.uid);
  const hand=pl.hand[0];
  pl.hand.splice(0,1);pl.outside.push(hand);
  api.recordMove(pack,s,{physical:hand,owner:player,from:'hand',to:'outside',reason:'payment',sourceUid:card.uid});
  const choices=pl.outside.filter(item=>api.card(pack,item).color==='green'&&
   !api.card(pack,item).raidName&&named(api,pack,s,item,'阿良々木暦')).map(item=>item.uid);
  ask(s,{mode:'faceUpUnder',player,sourceUid:card.uid,choices,optional:false});
  return true;
 }
 if(action.mode==='vol2:readyGrant'){
  s.onceEffectUses[player].push(card.uid+'|readyGrant');
  api.attemptFieldActive(s,player,card);
  return true;
 }
 if(action.mode==='vol2:outsideEnter'){
  const rule=printed.outsideMain;
  const choices=api.field(pl).filter(other=>named(api,pack,s,other,rule.name)&&
   api.bp(pack,s,other)>=rule.minBp).map(other=>other.uid);
  ask(s,{mode:'outsideRetire',player,sourceUid:card.uid,choices,optional:false});
  return true;
 }
 if(action.mode==='vol2:blackHand'){
  const choices=pl.outside.filter(item=>item.uid!==card.uid&&named(api,pack,s,item,'ブラック羽川'))
   .map(item=>item.uid);
  ask(s,{mode:'blackRemove',player,sourceUid:card.uid,choices,optional:false});
  return true;
 }
 return false;
}

function continueAfter(s,pack){if(!s.pending)apiContinue(pack,s);}

export function resolveSharedPrintVol2Activation(api,pack,s,action){
 if(s.pending?.kind!=='effect-vol2')return false;
 if(action?.type!=='chooseVol2')return false;
 const q=s.pending,owner=q.player,pl=s.players[owner];
 if(q.mode==='retireField'){
  const loc=api.location(s,owner,action.uid);
  if(!loc||!q.choices.includes(action.uid))throw Error('Illegal field');
  const opened=api.retire(pack,s,owner,loc.line,loc.slot,{by:'effect',sourceUid:q.sourceUid});
  const self=api.location(s,owner,q.sourceUid);
  if(self)self.c.impactGranted={turn:s.turn,stamp:self.c.fieldEntryStamp,amount:1};
  if(!opened)done(s,pack);
  return true;
 }
 if(q.mode==='faceUpUnder'){
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  const host=api.location(s,owner,q.sourceUid);
  if(index<0||!host)throw Error('Illegal under card');
  const buriedCard=pl.outside.splice(index,1)[0];
  bury(api,pack,s,owner,host.c,buriedCard,false,q.sourceUid,'outside');
  done(s,pack);return true;
 }
 if(q.mode==='outsideRetire'){
  const loc=api.location(s,owner,action.uid);
  if(!loc)throw Error('Illegal retirement');
  const opened=api.retire(pack,s,owner,loc.line,loc.slot,{by:'effect',sourceUid:q.sourceUid});
  if(opened)return true;
  const slots=['front','energy'].flatMap(line=>cells(api,pl,line));
  if(slots.length&&pl.outside.some(card=>card.uid===q.sourceUid))
   ask(s,{mode:'reenter',player:owner,sourceUid:q.sourceUid,uid:q.sourceUid,slots,optional:false});
  else done(s,pack);
  return true;
 }
 if(q.mode==='blackRemove'){
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  if(index<0)throw Error('Illegal black hanekawa');
  const removed=pl.outside.splice(index,1)[0];
  pl.removed.push(removed);
  api.recordMove(pack,s,{physical:removed,owner,from:'outside',to:'removed',reason:'own-effect',sourceUid:q.sourceUid});
  const self=pl.outside.findIndex(card=>card.uid===q.sourceUid);
  if(self>=0){
   const event=pl.outside.splice(self,1)[0];
   pl.hand.push(event);
   api.recordMove(pack,s,{physical:event,owner,from:'outside',to:'hand',reason:'own-effect',sourceUid:q.sourceUid});
  }
  done(s,pack);return true;
 }
 return false;
}
