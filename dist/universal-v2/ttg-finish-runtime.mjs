// Shared-engine helpers for the last TTG registrations.
// Card programs stay in the pack. This file does not import the engine.
import {originalEffectsDisabled,grantContinuousState} from './continuous-states.mjs';

const api={};
export function bindFinishApi(fns){Object.assign(api,fns);}
const card=(pack,c)=>api.card(pack,c);

function facedownCount(c){
 let n=0;
 const walk=x=>{
  for(const v of [...(x.under||[]),...(x.stack||[])]){
   if(v.faceDown)n++;
   walk(v);
  }
 };
 if(c)walk(c);
 return n;
}
function facedownUids(c){
 const out=[];
 const walk=x=>{
  for(const v of [...(x.under||[]),...(x.stack||[])]){
   if(v.faceDown)out.push(v.uid);
   walk(v);
  }
 };
 if(c)walk(c);
 return out;
}
function detachFacedown(root,uid){
 const walk=node=>{
  for(const key of ['under','stack']){
   const arr=node[key]||[];
   const index=arr.findIndex(x=>x?.uid===uid);
   if(index>=0)return arr.splice(index,1)[0];
   for(const child of arr){
    const found=walk(child);
    if(found)return found;
   }
  }
  return null;
 };
 return root?walk(root):null;
}
function dumpFacedown(pack,s,owner,physical,sourceUid){
 const layers=[];
 const take=c=>{
  layers.push(c);
  for(const x of c.stack||[])take(x);
  for(const x of c.under||[])take(x);
  c.stack=[];c.under=[];c.faceDown=false;c.ready=false;c.buffs=[];
  c.fieldEntryStamp=null;
  delete c.raidedTurn;
 };
 take(physical);
 for(const layer of layers){
  s.players[owner].outside.push(layer);
  api.recordCompletedMove(pack,s,{physical:layer,owner,from:'raid-under',to:'outside',
   reason:'own-effect',sourceUid});
 }
}
function tuckUnder(pack,s,owner,raider,physical,from,sourceUid){
 physical.faceDown=true;physical.ready=false;
 delete physical.raidedTurn;
 raider.under??=[];
 raider.under.push(physical);
 api.recordCompletedMove(pack,s,{physical,owner,from,to:'raid-under',
  reason:'own-effect',sourceUid,wasFaceDown:false});
}
function readyOneAp(pl){
 const rested=pl.apCards.find(c=>c.inPlay&&!c.ready);
 if(rested)rested.ready=true;
}
function subsets(ids){
 const out=[[]];
 for(const id of ids){
  const n=out.length;
  for(let i=0;i<n;i++)out.push(out[i].concat(id));
 }
 return out;
}
function pairs(ids){
 const out=[];
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)out.push([ids[i],ids[j]]);
 return out;
}
export function collectRaidWitnesses(pack,s,owner,raider,baseCard){
 const rd=card(pack,raider),baseName=card(pack,baseCard).name,out=[];
 for(const c of api.field(s.players[owner])){
  if(c.uid===raider.uid||originalEffectsDisabled(s,c))continue;
  const d=card(pack,c);
  if(d.raidAttach){
   const spec=d.raidAttach;
   const loc=api.location(s,owner,c.uid);
   const onceKey=d.name+'|raidAttach';
   if(loc?.line===spec.line&&rd.name.includes(spec.nameContains)&&
    spec.baseNames.includes(baseName)&&!s.onceEffectUses[owner].includes(onceKey)){
    const want=baseName==='シモン'?'ヴィラル':baseName==='ヴィラル'?'シモン':null;
    const zones=[...s.players[owner].hand,...s.players[owner].outside];
    if(want&&zones.some(x=>card(pack,x).name===want))
     out.push({kind:'attach',uid:c.uid,onceKey,want,drawIfHand:spec.drawIfHand||0});
   }
  }
  if(d.raidWitness&&rd.name===d.raidWitness.name){
   const onceKey=d.raidWitness.once==='name'?d.name+'|raidWitness':null;
   if(!onceKey||!s.onceEffectUses[owner].includes(onceKey))
    out.push({kind:'moveSelf',uid:c.uid,onceKey,draw:d.raidWitness.draw||0,
     returnUnder:d.raidWitness.returnUnderToHand===true});
  }
 }
 return out;
}
function queueRaidFollowup(s,owner,pending,nowJobs,laterJobs){
 s.effectQueue.unshift(...laterJobs);
 if(pending.baseJobs.length&&pending.entryJobs.length)
  s.effectQueue.unshift({op:'openRaidOrder',owner,baseUid:pending.baseUid,
   raidUid:pending.raidUid,baseJobs:pending.baseJobs,entryJobs:pending.entryJobs,
   raidJobs:pending.raidJobs});
 else s.effectQueue.unshift(...pending.baseJobs,...pending.entryJobs,...pending.raidJobs);
 s.effectQueue.unshift(...nowJobs);
}
function openWitness(pack,s,owner,witness,raidUid){
 const pl=s.players[owner];
 const watcher=api.location(s,owner,witness.uid)?.c;
 const raider=api.location(s,owner,raidUid)?.c;
 if(!watcher||!raider||originalEffectsDisabled(s,watcher)){
  api.continueEffectQueue(pack,s);return;
 }
 if(witness.kind==='attach'){
  const choices=[...pl.hand,...pl.outside].filter(c=>card(pack,c).name===witness.want).map(c=>c.uid);
  s.pending={kind:'effect-raid-attach',player:owner,sourceUid:witness.uid,
   witness,choices,raidUid};
  return;
 }
 s.pending={kind:'effect-raid-witness-move',player:owner,sourceUid:witness.uid,witness,raidUid};
}
export function finishJob(pack,s,job){
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='openRaidOrder'){
  s.pending={kind:'raid-effect-order',player:owner,baseUid:job.baseUid,
   raidUid:job.raidUid,baseJobs:job.baseJobs,entryJobs:job.entryJobs,raidJobs:job.raidJobs};
  return true;
 }
 if(job.op==='openRaidWitness'){openWitness(pack,s,owner,job.witness,job.raidUid);return true;}
 if(job.op==='resumeSimonLow'){
  s.pending={kind:'effect-simon-low',player:owner,sourceUid:job.sourceUid,
   remaining:job.remaining,used:job.used,name:job.name,maxEnergy:job.maxEnergy,
   color:job.color};
  return true;
 }
 if(job.op==='mayCaptureRetired'){
  const live=(job.choices||[]).filter(uid=>api.location(s,owner,uid)?.c);
  if(pl.outside.some(c=>c.uid===job.retiredUid)&&live.length)
   s.pending={kind:'effect-retire-capture',player:owner,sourceUid:live[0],
    retiredUid:job.retiredUid,choices:live};
  return true;
 }
 if(job.op==='lookTakeOrdered'){
  const count=Math.min(job.count,pl.deck.length);
  const uids=pl.deck.slice(0,count).map(c=>c.uid);
  if(!uids.length){
   if(pl.hand.length)s.pending={kind:'effect-discard-mode',player:owner,sourceUid:job.sourceUid,
    discarded:[],sum:0,min:job.discardMin,retireEnergySum:job.retireEnergySum};
   return true;
  }
  s.pending={kind:'effect-look-take',player:owner,sourceUid:job.sourceUid,
   uids,taken:null,order:[],phase:'take',discardMin:job.discardMin,
   retireEnergySum:job.retireEnergySum,takeName:job.takeName,takeEnergy:job.takeEnergy};
  return true;
 }
 if(job.op==='facedownEntryScale'){
  const source=api.location(s,owner,job.sourceUid)?.c;
  const count=source?facedownCount(source):0;
  if(!source||count<job.retireAt)return true;
  const choices=s.players[1-owner].front.filter(c=>c&&api.bp(pack,s,c)<=job.retireBp&&
   !api.choiceBlocked(pack,s,owner,c.uid,'character')).map(c=>c.uid);
  s.pending={kind:'effect-facedown-scale',player:owner,sourceUid:job.sourceUid,
   choices,activeAp:count>=job.activeApAt,retireBp:job.retireBp};
  return true;
 }
 if(job.op==='maySpendFacedown'||job.op==='maySpendFacedownRetire'){
  const source=api.location(s,owner,job.sourceUid)?.c;
  const ids=source?facedownUids(source):[];
  if(!source||ids.length<job.count)return true;
  s.pending={kind:'effect-spend-facedown',player:owner,sourceUid:job.sourceUid,
   pairs:pairs(ids),damage:job.damage||0,retire:job.op==='maySpendFacedownRetire'||job.retire===true};
  return true;
 }
 if(job.op==='galaxyBurstEntry'){
  const onceKey=(job.sourceName||'')+'|galaxy';
  const source=api.location(s,owner,job.sourceUid)?.c;
  if(!source||s.onceEffectUses[owner].includes(onceKey))return true;
  s.onceEffectUses[owner].push(onceKey);
  if(!Number.isInteger(source.fieldEntryStamp))source.fieldEntryStamp=s.nextFieldEntryStamp++;
  source.buffs??=[];
  source.buffs.push({bp:job.bp,untilOwnTurnStart:pl.ownTurns+1});
  grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:owner,
   sourceUid:source.uid,targetUid:source.uid,sourceLinked:false,selectionScope:'any',
   until:{player:owner,phase:'start',edge:'start'}});
  if(api.calcEnergy(pack,s,owner)>=job.apEnergy)readyOneAp(pl);
  if(api.calcEnergy(pack,s,owner)>=job.drawEnergy)
   api.draw(pack,s,owner,job.draw,{reason:'own-effect',sourceUid:source.uid});
  return true;
 }
 if(job.op==='mayAbsorbFront'){
  const source=api.location(s,owner,job.sourceUid)?.c;
  const ids=pl.front.filter(c=>c&&c.uid!==job.sourceUid).map(c=>c.uid);
  if(!source||!ids.length)return true;
  s.pending={kind:'effect-absorb-front',player:owner,sourceUid:job.sourceUid,
   sets:subsets(ids)};
  return true;
 }
 if(job.op==='simonLowEntry'){
  s.pending={kind:'effect-simon-low',player:owner,sourceUid:job.sourceUid,
   remaining:pl.deck.length<=job.deckAtMost?2:1,used:[],name:job.name,
   maxEnergy:job.maxEnergy,color:job.color};
  return true;
 }
 if(job.op==='replayNamedEntry'){
  const choices=api.field(pl).filter(c=>{
   const d=card(pack,c);
   return d.name===job.name&&d.energy<=job.maxEnergy&&(d.effects?.onPlay||[]).length;
  }).map(c=>c.uid);
  s.pending={kind:'effect-replay-entry',player:owner,sourceUid:job.sourceUid,
   choices,name:job.name,maxEnergy:job.maxEnergy};
  return true;
 }
 if(job.op==='mayRaidOntoSelf'){
  const source=api.location(s,owner,job.sourceUid)?.c;
  if(!source||originalEffectsDisabled(s,source))return true;
  s.pending={kind:'effect-attack-end-raid',player:owner,sourceUid:source.uid,
   sourceStamp:source.fieldEntryStamp,names:job.names,color:job.color,bp:job.bp};
  return true;
 }
 if(job.op==='lagannEntryLadder'){
  const source=api.location(s,owner,job.sourceUid)?.c;
  if(!source)return true;
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:source.uid});
  if(facedownCount(source)>0)
   api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:source.uid});
  if(pl.deck.length<=20){
   source.buffs??=[];
   source.buffs.push({bp:1000,untilTurn:s.turn});
   if(pl.deck.length<=5)source.buffs.push({bp:3000,untilTurn:s.turn});
   source.attackDamageGranted={amount:2,turn:s.turn,stamp:source.fieldEntryStamp};
  }
  return true;
 }
 return false;
}
function lookMatches(pack,c,q){
 const d=card(pack,c);
 return d.name===q.takeName||d.energy>=q.takeEnergy;
}
function finishLook(pack,s,q){
 const p=s.players[q.player];
 const window=p.deck.splice(0,q.uids.length);
 if(window.some(c=>!q.uids.includes(c.uid))||new Set(window.map(c=>c.uid)).size!==q.uids.length)
  throw Error('Inspected deck window was changed');
 const by=new Map(window.map(c=>[c.uid,c]));
 if(q.taken){
  const physical=by.get(q.taken);
  p.hand.push(physical);
  api.recordCompletedMove(pack,s,{physical,owner:q.player,from:'deck',to:'hand',
   reason:'own-effect',sourceUid:q.sourceUid});
 }
 p.deck.push(...q.order.map(uid=>by.get(uid)));
 if(!p.hand.length){s.pending=null;api.continueEffectQueue(pack,s);return;}
 s.pending={kind:'effect-discard-mode',player:q.player,sourceUid:q.sourceUid,
  discarded:[],sum:0,min:q.discardMin,retireEnergySum:q.retireEnergySum};
}
export function legalFinishPending(pack,s){
 const q=s.pending,p=s.players[q.player];
 if(q.kind==='effect-raid-witness-order'){
  const w=q.witnesses[0];
  if(!w)return [];
  return ['now','later','skip'].map(when=>({type:'chooseRaidWitness',uid:w.uid,when}));
 }
 if(q.kind==='effect-raid-attach')return [
  {type:'chooseRaidAttach',uid:null},
  ...q.choices.filter(uid=>p.hand.some(c=>c.uid===uid)||p.outside.some(c=>c.uid===uid))
   .map(uid=>({type:'chooseRaidAttach',uid}))
 ];
 if(q.kind==='effect-raid-witness-move')return [
  {type:'chooseRaidWitnessMove',mode:'skip'},
  {type:'chooseRaidWitnessMove',mode:'move'}
 ];
 if(q.kind==='effect-look-take'){
  if(q.phase==='take'){
   const window=p.deck.slice(0,q.uids.length);
   return [
    {type:'chooseLookTake',uid:null},
    ...window.filter(c=>q.uids.includes(c.uid)&&lookMatches(pack,c,q))
     .map(c=>({type:'chooseLookTake',uid:c.uid}))
   ];
  }
  return q.uids.filter(uid=>uid!==q.taken&&!q.order.includes(uid))
   .map(uid=>({type:'chooseLookOrder',uid}));
 }
 if(q.kind==='effect-discard-mode'){
  const out=p.hand.map(c=>({type:'chooseDiscardPay',uid:c.uid}));
  if(q.discarded.length>=q.min){
   out.push({type:'chooseDiscardPay',uid:null,mode:'skip'});
   out.push({type:'chooseDiscardPay',uid:null,mode:'activeAp'});
   if(q.sum>=q.retireEnergySum)out.push({type:'chooseDiscardPay',uid:null,mode:'retire'});
  }
  return out;
 }
 if(q.kind==='effect-facedown-scale'){
  const retires=[null,...q.choices.filter(uid=>s.players[1-q.player].front.some(c=>c?.uid===uid))];
  const flags=q.activeAp?[false,true]:[false];
  return flags.flatMap(activeAp=>retires.map(retireUid=>({
   type:'chooseFacedownScale',retireUid,activeAp})));
 }
 if(q.kind==='effect-spend-facedown'){
  const source=api.location(s,q.player,q.sourceUid)?.c;
  const live=new Set(source?facedownUids(source):[]);
  const targets=q.retire?[null,...s.players[1-q.player].front.filter(c=>c&&
   !api.choiceBlocked(pack,s,q.player,c.uid,'character')).map(c=>c.uid)]:[null];
  const out=[{type:'chooseSpendFacedown',uids:[],targetUid:null}];
  for(const uids of q.pairs)if(uids.every(uid=>live.has(uid)))
   for(const targetUid of targets)out.push({type:'chooseSpendFacedown',uids,targetUid});
  return out;
 }
 if(q.kind==='effect-absorb-front'){
  const live=new Set(p.front.filter(c=>c&&c.uid!==q.sourceUid).map(c=>c.uid));
  return q.sets.filter(set=>set.every(uid=>live.has(uid)))
   .map(uids=>({type:'chooseAbsorbFront',uids}));
 }
 if(q.kind==='effect-simon-low'){
  const out=[];
  const simon=c=>card(pack,c).name===q.name&&card(pack,c).type==='character'&&
   card(pack,c).energy<=q.maxEnergy;
  if(!q.used.includes('recover')){
   out.push({type:'chooseSimonLow',mode:'recover',uid:null});
   for(const c of p.outside.filter(simon))out.push({type:'chooseSimonLow',mode:'recover',uid:c.uid});
  }
  if(!q.used.includes('deploy')){
   out.push({type:'chooseSimonLow',mode:'deploy',uid:null});
   for(const c of p.hand.filter(x=>simon(x)&&card(pack,x).color===q.color))
    for(const line of ['front','energy'])for(let slot=0;slot<4;slot++)if(!p[line][slot])
     out.push({type:'chooseSimonLow',mode:'deploy',uid:c.uid,line,slot});
  }
  return out;
 }
 if(q.kind==='effect-replay-entry')return [
  {type:'chooseReplayEntry',uid:null},
  ...q.choices.filter(uid=>api.field(p).some(c=>c.uid===uid)).map(uid=>({type:'chooseReplayEntry',uid}))
 ];
 if(q.kind==='effect-attack-end-raid'){
  const loc=api.location(s,q.player,q.sourceUid);
  const source=loc?.c;
  if(!source||source.fieldEntryStamp!==q.sourceStamp)return [{type:'chooseAttackEndRaid',uid:null}];
  const dests=loc.line==='front'?[{line:'front',slot:loc.slot}]:[
   {line:'energy',slot:loc.slot},
   ...api.legalDestinations(p,'front').filter(c=>!c.replaceUid).map(c=>({line:'front',slot:c.slot}))
  ];
  const out=[{type:'chooseAttackEndRaid',uid:null}];
  for(const c of p.hand){
   const d=card(pack,c);
   if(d.color!==q.color||!q.names.some(n=>n===d.name))continue;
   if(!api.validRaidBase(pack,s,q.player,source,d))continue;
   for(const dest of dests)out.push({type:'chooseAttackEndRaid',uid:c.uid,...dest});
  }
  return out;
 }
 if(q.kind==='effect-retire-capture')return [
  {type:'chooseRetireCapture',uid:null},
  ...q.choices.filter(uid=>api.location(s,q.player,uid)).map(uid=>({type:'chooseRetireCapture',uid}))
 ];
 return null;
}
export function resolveFinishChoice(pack,s,a){
 const q=s.pending;
 if(!q||!legalFinishPending(pack,s)?.some(x=>JSON.stringify(x)===JSON.stringify(a))){
  if(!q)return false;
  const known=['effect-raid-witness-order','effect-raid-attach','effect-raid-witness-move','effect-look-take','effect-discard-mode','effect-facedown-scale','effect-spend-facedown','effect-absorb-front','effect-simon-low','effect-replay-entry','effect-attack-end-raid','effect-retire-capture'];
  if(!known.includes(q.kind))return false;
  throw Error('Finish choice is no longer legal');
 }
 const p=s.players[q.player];
 if(q.kind==='effect-raid-witness-order'){
  const [current,...rest]=q.witnesses;
  const decided=a.when==='skip'?q.decided:q.decided.concat({...current,when:a.when});
  if(rest.length){s.pending={...q,witnesses:rest,decided};return true;}
  const jobs=when=>decided.filter(w=>w.when===when).map(w=>({
   op:'openRaidWitness',owner:q.player,witness:w,sourceUid:w.uid,raidUid:q.raidUid}));
  s.pending=null;
  queueRaidFollowup(s,q.player,q,jobs('now'),jobs('later'));
  api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-raid-attach'){
  s.pending=null;
  if(a.uid){
   const hand=p.hand.findIndex(c=>c.uid===a.uid);
   const outside=hand<0?p.outside.findIndex(c=>c.uid===a.uid):-1;
   const from=hand>=0?'hand':'outside';
   const index=hand>=0?hand:outside;
   const raider=api.location(s,q.player,q.raidUid)?.c;
   if(index<0||!raider||card(pack,from==='hand'?p.hand[index]:p.outside[index]).name!==q.witness.want)
    throw Error('Raid attach target changed');
   const physical=(from==='hand'?p.hand:p.outside).splice(index,1)[0];
   tuckUnder(pack,s,q.player,raider,physical,from,q.sourceUid);
   if(!s.onceEffectUses[q.player].includes(q.witness.onceKey))
    s.onceEffectUses[q.player].push(q.witness.onceKey);
   if(from==='hand'&&q.witness.drawIfHand)
    api.draw(pack,s,q.player,q.witness.drawIfHand,{reason:'own-effect',sourceUid:q.sourceUid});
  }
  api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-raid-witness-move'){
  s.pending=null;
  if(a.mode==='move'){
   const loc=api.location(s,q.player,q.witness.uid);
   const host=api.location(s,q.player,q.raidUid)?.c;
   if(!loc||!host||host.uid===loc.c.uid)throw Error('Raid witness source left the field');
   if(q.witness.returnUnder){
    const buried=[];
    const take=c=>{for(const x of [...(c.under||[]),...(c.stack||[])]){buried.push(x);take(x);}};
    take(loc.c);
    loc.c.under=[];loc.c.stack=[];
    for(const layer of buried){
     layer.faceDown=false;layer.ready=false;layer.stack=[];layer.under=[];
     layer.fieldEntryStamp=null;delete layer.raidedTurn;
     p.hand.push(layer);
     api.recordCompletedMove(pack,s,{physical:layer,owner:q.player,from:'raid-under',to:'hand',
      reason:'own-effect',sourceUid:q.sourceUid});
    }
   }
   p[loc.line][loc.slot]=null;
   tuckUnder(pack,s,q.player,host,loc.c,loc.line,q.sourceUid);
   if(q.witness.onceKey&&!s.onceEffectUses[q.player].includes(q.witness.onceKey))
    s.onceEffectUses[q.player].push(q.witness.onceKey);
   if(q.witness.draw)api.draw(pack,s,q.player,q.witness.draw,{reason:'own-effect',sourceUid:q.sourceUid});
  }
  api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-look-take'){
  if(q.phase==='take'){
   q.taken=a.uid;
   q.phase='order';
   const rest=q.uids.filter(uid=>uid!==q.taken);
   if(!rest.length)finishLook(pack,s,q);
   return true;
  }
  q.order.push(a.uid);
  if(q.order.length===q.uids.filter(uid=>uid!==q.taken).length)finishLook(pack,s,q);
  return true;
 }
 if(q.kind==='effect-discard-mode'){
  if(a.uid){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Discard card left the hand');
   q.sum+=card(pack,p.hand[index]).energy;
   q.discarded.push(a.uid);
   api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   return true;
  }
  s.pending=null;
  if(a.mode==='activeAp')readyOneAp(p);
  else if(a.mode==='retire'){
   const choices=s.players[1-q.player].front.filter(c=>c&&
    !api.choiceBlocked(pack,s,q.player,c.uid,'character')).map(c=>c.uid);
   if(choices.length){
    s.pending={kind:'effect-retire-bp',player:q.player,sourceUid:q.sourceUid,
     choices,limit:50000,optional:true};
    return true;
   }
  }
  api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-facedown-scale'){
  if(a.activeAp)readyOneAp(p);
  if(a.retireUid){
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.retireUid);
   s.pending=null;
   if(slot<0)throw Error('Facedown-scale target left');
   const paused=api.retire(pack,s,foe,'front',slot,{by:'opponent'});
   if(!paused)api.continueEffectQueue(pack,s);
   return true;
  }
  s.pending=null;api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-spend-facedown'){
  const source=api.location(s,q.player,q.sourceUid)?.c;
  s.pending=null;
  if(!a.uids.length){api.continueEffectQueue(pack,s);return true;}
  if(!source)throw Error('Facedown cost source left');
  for(const uid of a.uids){
   const layer=detachFacedown(source,uid);
   if(!layer)throw Error('Facedown cost disappeared');
   dumpFacedown(pack,s,q.player,layer,source.uid);
  }
  if(q.damage===2)source.attackDamageGranted={amount:2,turn:s.turn,stamp:source.fieldEntryStamp};
  if(q.retire&&a.targetUid){
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.targetUid);
   if(slot<0)throw Error('Attack retire target left');
   const paused=api.retire(pack,s,foe,'front',slot,{by:'opponent'});
   if(paused)return true;
  }
  api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-absorb-front'){
  const source=api.location(s,q.player,q.sourceUid)?.c;
  s.pending=null;
  if(!source)throw Error('Absorb source left the field');
  for(const uid of a.uids){
   const slot=p.front.findIndex(c=>c?.uid===uid);
   if(slot<0||uid===source.uid)throw Error('Absorb target left the front');
   const pile=p.front[slot];
   p.front[slot]=null;
   pile.faceDown=true;
   source.under??=[];
   source.under.push(pile);
   api.recordCompletedMove(pack,s,{physical:pile,owner:q.player,from:'front',to:'raid-under',
    reason:'own-effect',sourceUid:source.uid});
  }
  api.continueEffectQueue(pack,s);return true;
 }
 if(q.kind==='effect-simon-low'){
  const remaining=q.remaining-1,used=q.used.concat(a.mode);
  s.pending=null;
  let entered=null;
  if(a.mode==='recover'&&a.uid){
   const index=p.outside.findIndex(c=>c.uid===a.uid);
   if(index<0)throw Error('Simon recovery left outside');
   const physical=p.outside.splice(index,1)[0];
   p.hand.push(physical);
   api.recordCompletedMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',
    reason:'own-effect',sourceUid:q.sourceUid});
  }
  if(a.mode==='deploy'&&a.uid){
   const index=p.hand.findIndex(c=>c.uid===a.uid);
   if(index<0||p[a.line][a.slot])throw Error('Simon deploy is no longer legal');
   entered=p.hand.splice(index,1)[0];
   entered.ready=true;entered.fieldEntryStamp=s.nextFieldEntryStamp++;
   p[a.line][a.slot]=entered;
   api.recordCompletedMove(pack,s,{physical:entered,owner:q.player,from:'hand',to:a.line,
    reason:'own-effect',sourceUid:q.sourceUid});
  }
  if(remaining>0)s.effectQueue.unshift({op:'resumeSimonLow',owner:q.player,
   sourceUid:q.sourceUid,remaining,used,name:q.name,maxEnergy:q.maxEnergy,color:q.color});
  if(entered)api.applyEffects(pack,s,entered,'onPlay',q.player,'outsideEffect');
  else api.continueEffectQueue(pack,s);
  return true;
 }
 if(q.kind==='effect-replay-entry'){
  s.pending=null;
  if(a.uid){
   const target=api.field(p).find(c=>c.uid===a.uid);
   const before=target?.entryTurn;
   if(!target)throw Error('Replay target left the field');
   api.applyEffects(pack,s,target,'onPlay',q.player,'paidPlay');
   if(target.entryTurn!==before)target.entryTurn=before;
  }else api.continueEffectQueue(pack,s);
  return true;
 }
 if(q.kind==='effect-attack-end-raid'){
  s.pending=null;
  if(!a.uid){api.continueEffectQueue(pack,s);return true;}
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  const loc=api.location(s,q.player,q.sourceUid);
  if(index<0||!loc)throw Error('Attack-end raid is no longer legal');
  const physical=p.hand.splice(index,1)[0];
  physical.buffs??=[];
  physical.buffs.push({bp:q.bp,untilTurn:s.turn});
  api.performRaid(pack,s,q.player,physical,q.sourceUid,a.line,a.slot,undefined,
   {entryCause:'paidRaid',entryFrom:'hand',effectSourceUid:q.sourceUid});
  return true;
 }
 if(q.kind==='effect-retire-capture'){
  s.pending=null;
  if(a.uid){
   const loc=api.location(s,q.player,a.uid);
   const index=p.outside.findIndex(c=>c.uid===q.retiredUid);
   const onceKey=a.uid+'|retireCapture';
   if(!loc||index<0||s.onceEffectUses[q.player].includes(onceKey)||
    card(pack,p.outside[index]).type!=='character')
    throw Error('Retirement capture is no longer legal');
   const physical=p.outside.splice(index,1)[0];
   if(physical.stack?.length||physical.under?.length)throw Error('Capture requires one character');
   tuckUnder(pack,s,q.player,loc.c,physical,'outside',loc.c.uid);
   s.onceEffectUses[q.player].push(onceKey);
  }
  api.continueEffectQueue(pack,s);return true;
 }
 return false;
}
