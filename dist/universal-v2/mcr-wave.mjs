// Shared sentences printed on several Macross cards. Nothing here is a title
// opcode: each step is the printed choice, and a raid frame still has to be
// listed before the engine will run it.
const TEXT=v=>typeof v==='string'&&!!v.trim()&&v.length<=80;

export function mcrEventReady(api,pack,s,owner,job,payable){
 if(job.op==='chooseRetireCapOrPeek')
  return retireModes(api,pack,s,owner,job,payable).length>0;
 if(job.op==='placeOppFrontDeckSide'&&job.mandatory===true)
  return deckTargets(api,pack,s,owner,job.bp,payable).length>0;
 return null;
}

export function restNameLockReady(api,pack,s,owner,source,choice){
 if(!choice||choice.op!=='chooseOne'||choice.optional!==false)return false;
 return choice.options.some(o=>optionOpen(api,pack,s,owner,source,choice,o));
}

export function queueMcrAttackEnd(api,pack,s,attacker){
 const owner=s.active,pl=s.players[owner];
 const printed=api.card(pack,attacker);
 if(printed.attackEndRetireSelfThen&&!api.disabled(s,attacker)&&
  api.raidLive(pack,attacker,'attackEnd')&&pl.front.some(c=>c?.uid===attacker.uid))
  s.effectQueue.push({op:'mcrSelfRetireThen',owner,sourceUid:attacker.uid,
   sourceStamp:attacker.fieldEntryStamp});
 for(const ally of [...pl.front,...pl.energy].filter(Boolean)){
  const rule=api.card(pack,ally).allyRaidAttackEnd;
  if(!rule||api.disabled(s,ally)||!ally.ready)continue;
  if(s.mainAbilityUsedUids.includes(ally.uid+'|allyRaidEnd'))continue;
  if(!api.faceUpRaid(pack,attacker)||attacker.uid===ally.uid)continue;
  const name=api.card(pack,attacker).name||'';
  if(!rule.includes.some(part=>name.includes(part)))continue;
  if(!api.raidTopOk(pack,attacker))continue;
  s.effectQueue.push({op:'mcrAllyRaidStrip',owner,sourceUid:ally.uid,
   sourceStamp:ally.fieldEntryStamp,attackerUid:attacker.uid,rule});
 }
}

export function noteMcrFieldLeave(api,pack,s,owner,physical){
 if(!physical||physical.faceDown)return;
 const leaving=api.card(pack,physical);
 if(leaving.type!=='character')return;
 for(const rifle of s.players[owner].outside){
  const rule=api.card(pack,rifle).outsideNameLeaveToHand;
  if(!rule||!leaving.name?.includes(rule.includes))continue;
  const key=rule.name+'|outsideLeave';
  if(s.onceEffectUses[owner].includes(key))continue;
  s.effectQueue.unshift({op:'mcrOutsideToHand',owner,sourceUid:rifle.uid,
   onceName:rule.name,includes:rule.includes});
 }
}

export function applyMcrJob(api,pack,s,job){
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='stripOwnRaidThenReraid')return openStrip(api,pack,s,owner,job);
 if(job.op==='mcrAllyRaidStrip')return openAlly(api,pack,s,job);
 if(job.op==='mcrSelfRetireThen')return openSelfRetire(api,pack,s,job);
 if(job.op==='bounceOrRetireDuringAttack')return openBounceOrRetire(api,pack,s,owner,job);
 if(job.op==='handIncludesRestOrRaid')return openHandRaid(api,pack,s,owner,job);
 if(job.op==='buffSelfIfAttackerRaid')return buffIfRaidAttacker(api,pack,s,owner,job);
 if(job.op==='chooseUpToPayTwo')return openPaid(api,pack,s,owner,job);
 if(job.op==='chooseRetireCapOrPeek')return openRetireCap(api,pack,s,owner,job);
 if(job.op==='searchTopDeployInstead')return openSearch(api,pack,s,owner,job);
 if(job.op==='grantFieldNameIncludesMustBlock')return openMustBlock(api,pack,s,owner,job);
 if(job.op==='placeOppFrontOnTheirDeck')return openDeckBottom(api,pack,s,owner,job);
 if(job.op==='placeOppFrontDeckSide')return openDeckSide(api,pack,s,owner,job);
 if(job.op==='activeSelfIfNameIncludes')return activeIfIncludes(api,pack,s,owner,job);
 if(job.op==='grantFrontIncludesWinDraw')return openWinDraw(api,pack,s,owner,job);
 if(job.op==='mcrOutsideToHand')return openOutsideHand(api,pack,s,job);
 if(job.op==='mcrRestRetireImpact')return openImpact(api,pack,s,job);
 if(job.op==='mcrPeekTop')return openPeek(api,pack,s,owner,job);
 return false;
}

export function legalMcrPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-mcr')return null;
 if(q.step==='strip'||q.step==='reraid'||q.step==='mustBlock'||q.step==='handCard'||
  q.step==='impact'||q.step==='winDraw'||q.step==='outsideHand'||q.step==='deckTarget')
  return [...(q.optional?[blank()]:[]),...q.choices.map(uid=>({type:'chooseMcr',uid}))];
 if(q.step==='selfRetire'||q.step==='allyStrip')
  return [{type:'chooseMcr',mode:'skip'},{type:'chooseMcr',mode:'accept'}];
 if(q.step==='bounceOrRetire'){
  const out=q.choices.map(uid=>({type:'chooseMcr',uid,mode:'bounce'}));
  if(q.mayRetire)for(const uid of q.choices)out.push({type:'chooseMcr',uid,mode:'retire'});
  if(q.optional)out.push({type:'chooseMcr',mode:'skip'});
  return out;
 }
 if(q.step==='paid'){
  const out=q.left.map(id=>({type:'chooseMcr',mode:id}));
  if(!q.paid&&q.canPay)out.push({type:'chooseMcr',mode:'pay'});
  out.push({type:'chooseMcr',mode:'skip'});
  return out;
 }
 if(q.step==='retireMode')return q.modes.map(id=>({type:'chooseMcr',mode:id}));
 if(q.step==='searchTake')
  return [...q.choices.map(uid=>({type:'chooseMcr',uid})),{type:'chooseMcr',uid:null}];
 if(q.step==='searchInstead')
  return [{type:'chooseMcr',mode:'hand'},{type:'chooseMcr',mode:'deploy'}];
 if(q.step==='searchOrder')return q.left.map(uid=>({type:'chooseMcr',uid}));
 if(q.step==='deckSide')
  return [{type:'chooseMcr',place:'top'},{type:'chooseMcr',place:'bottom'}];
 if(q.step==='peek')
  return [{type:'chooseMcr',place:'top'},{type:'chooseMcr',place:'bottom'}];
 if(q.step==='handDest'){
  const out=[];
  for(const dest of q.rests)out.push({type:'chooseMcr',mode:'rest',...dest});
  for(const raid of q.raids||[])out.push({type:'chooseMcr',mode:'raid',...raid});
  return out;
 }
 return [];
}

export function resolveMcrPending(api,pack,s,action){
 const q=s.pending;
 if(q?.kind!=='effect-mcr')return false;
 if(action?.type!=='chooseMcr')throw Error('Illegal shared Macross choice');
 if(q.step==='strip')return finishStrip(api,pack,s,q,action);
 if(q.step==='allyStrip')return finishAlly(api,pack,s,q,action);
 if(q.step==='reraid')return finishReraid(api,pack,s,q,action);
 if(q.step==='selfRetire')return finishSelfRetire(api,pack,s,q,action);
 if(q.step==='bounceOrRetire')return finishBounce(api,pack,s,q,action);
 if(q.step==='handCard')return finishHandCard(api,pack,s,q,action);
 if(q.step==='handDest')return finishHandDest(api,pack,s,q,action);
 if(q.step==='paid')return finishPaid(api,pack,s,q,action);
 if(q.step==='retireMode')return finishRetireMode(api,pack,s,q,action);
 if(q.step==='searchTake')return finishSearchTake(api,pack,s,q,action);
 if(q.step==='searchInstead')return finishSearchInstead(api,pack,s,q,action);
 if(q.step==='searchOrder')return finishSearchOrder(api,pack,s,q,action);
 if(q.step==='mustBlock')return finishMustBlock(api,pack,s,q,action);
 if(q.step==='deckTarget')return finishDeckTarget(api,pack,s,q,action);
 if(q.step==='deckSide')return finishDeckSide(api,pack,s,q,action);
 if(q.step==='winDraw')return finishWinDraw(api,pack,s,q,action);
 if(q.step==='outsideHand')return finishOutsideHand(api,pack,s,q,action);
 if(q.step==='impact')return finishImpact(api,pack,s,q,action);
 if(q.step==='peek')return finishPeek(api,pack,s,q,action);
 throw Error('Unknown shared Macross choice');
}

export function assertMcrPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-mcr')return;
 if(!q.step||typeof q.sourceUid!=='string')throw Error('Forged shared Macross choice');
 const owner=q.sourceOwner??q.player;
 const src=findOwned(s,owner,q.sourceUid);
 const printed=src&&api.card(pack,src);
 if(!printed)throw Error('Forged shared Macross choice');
 const text=JSON.stringify(printed);
 if(q.step==='strip'&&!text.includes('stripOwnRaidThenReraid'))throw Error('Forged raid-top strip');
 if(q.step==='reraid'&&!text.includes(q.different==='number'?'stripOwnRaidThenReraid':'allyRaidAttackEnd'))
  throw Error('Forged raid replacement');
 if(q.step==='allyStrip'&&!printed.allyRaidAttackEnd)throw Error('Forged ally raid strip');
 if(q.step==='selfRetire'&&!printed.attackEndRetireSelfThen)throw Error('Forged attack-end retirement');
 if(q.step==='bounceOrRetire'&&!text.includes('bounceOrRetireDuringAttack'))throw Error('Forged bounce or retire');
 if((q.step==='handCard'||q.step==='handDest')&&!text.includes('handIncludesRestOrRaid'))
  throw Error('Forged hand raid entry');
 if(q.step==='paid'&&!text.includes('chooseUpToPayTwo'))throw Error('Forged paid choice');
 if(q.step==='retireMode'&&!text.includes('chooseRetireCapOrPeek'))throw Error('Forged retire cap');
 if(q.step.startsWith('search')&&!text.includes('searchTopDeployInstead'))throw Error('Forged search window');
 if(q.step==='mustBlock'&&!text.includes('grantFieldNameIncludesMustBlock'))throw Error('Forged must-block grant');
 if((q.step==='deckTarget'||q.step==='deckSide')&&
  !text.includes('placeOppFrontOnTheirDeck')&&!text.includes('placeOppFrontDeckSide'))
  throw Error('Forged deck placement');
 if(q.step==='winDraw'&&!text.includes('grantFrontIncludesWinDraw'))throw Error('Forged battle-win draw');
 if(q.step==='outsideHand'&&!printed.outsideNameLeaveToHand)throw Error('Forged outside recovery');
 if(q.step==='impact'&&printed.mainAbility?.op!=='restRetireGrantImpact')throw Error('Forged impact grant');
 if(q.step==='peek'&&!text.includes('chooseRetireCapOrPeek'))throw Error('Forged top peek');
}

function blank(){return {type:'chooseMcr',uid:null};}
function findOwned(s,owner,uid){
 const pl=s.players[owner];
 const piles=[...(pl.front||[]),...(pl.energy||[]),...(pl.hand||[]),...(pl.deck||[]),
  ...(pl.outside||[]),...(pl.life||[]),...(pl.removed||[]),...(pl.resolvingEvents||[])];
 return piles.find(c=>c?.uid===uid)||null;
}
function hosts(api,pack,s,owner,name){
 const out=[];
 for(const line of ['front','energy']){
  s.players[owner][line].forEach((c,slot)=>{
   if(c&&api.raidTopOk(pack,c)&&api.hasName(api.card(pack,c),name))
    out.push({uid:c.uid,line,slot});
  });
 }
 return out;
}
function openStrip(api,pack,s,owner,job){
 const choices=hosts(api,pack,s,owner,job.hostName).map(h=>h.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'strip',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,hostName:job.hostName,replacementName:job.replacementName,
  different:'number',draw:job.draw,choices,optional:true};
 return true;
}
function finishStrip(api,pack,s,q,action){
 if(action.uid==null){s.pending=null;api.go(pack,s);return true;}
 const host=hosts(api,pack,s,q.player,q.hostName).find(h=>h.uid===action.uid);
 if(!host||!q.choices.includes(action.uid))throw Error('Illegal raid host');
 const top=s.players[q.player][host.line][host.slot];
 const stripped=api.card(pack,top);
 const base=top.stack[0];
 api.strip(pack,s,q.player,host.line,host.slot,q.sourceUid);
 api.draw(pack,s,q.player,q.draw,{reason:'own-effect',sourceUid:q.sourceUid});
 openReraid(api,pack,s,q,base,stripped);
 return true;
}
function openAlly(api,pack,s,job){
 const pos=api.location(s,job.owner,job.sourceUid);
 const atk=api.location(s,job.owner,job.attackerUid);
 if(!pos||pos.c.fieldEntryStamp!==job.sourceStamp||!pos.c.ready)return true;
 if(!atk||!api.raidTopOk(pack,atk.c))return true;
 s.pending={kind:'effect-mcr',step:'allyStrip',player:job.owner,sourceOwner:job.owner,
  sourceUid:job.sourceUid,attackerUid:job.attackerUid,sourceStamp:job.sourceStamp};
 return true;
}
function finishAlly(api,pack,s,q,action){
 if(action.mode==='skip'){s.pending=null;api.go(pack,s);return true;}
 if(action.mode!=='accept')throw Error('Illegal ally raid strip');
 const pos=api.location(s,q.player,q.sourceUid);
 const atk=api.location(s,q.player,q.attackerUid);
 if(!pos||pos.c.fieldEntryStamp!==q.sourceStamp||!pos.c.ready||!atk||!api.raidTopOk(pack,atk.c))
  throw Error('Ally raid strip is no longer legal');
 const stripped=api.card(pack,atk.c),base=atk.c.stack[0];
 api.strip(pack,s,q.player,atk.line,atk.slot,q.sourceUid);
 api.rest(s,q.player,pos.c);
 pos.c.ready=false;
 s.mainAbilityUsedUids.push(pos.c.uid+'|allyRaidEnd');
 api.draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
 openReraid(api,pack,s,{player:q.player,sourceUid:q.sourceUid,different:'energy'},base,stripped);
 return true;
}
function openReraid(api,pack,s,q,base,stripped){
 const choices=raidHand(api,pack,s,q.player,base,q,stripped).map(c=>c.uid);
 s.pending={kind:'effect-mcr',step:'reraid',player:q.player,sourceOwner:q.player,
  sourceUid:q.sourceUid,baseUid:base.uid,different:q.different,
  replacementName:q.replacementName||null,strippedId:stripped.id,
  strippedEnergy:stripped.energy,choices,optional:true};
}
function raidHand(api,pack,s,owner,base,q,stripped){
 const energy=api.energy(pack,s,owner);
 return s.players[owner].hand.filter(c=>{
  const d=api.card(pack,c);
  if(d.type!=='character'||!d.raidName)return false;
  if(q.replacementName&&!api.hasName(d,q.replacementName))return false;
  if(q.different==='number'&&d.id===(stripped?.id||q.strippedId))return false;
  if(q.different==='energy'&&d.energy===(stripped?.energy??q.strippedEnergy))return false;
  if(api.need(pack,s,owner,d,c)>(energy[d.color]||0))return false;
  return api.validRaid(pack,s,owner,base,d);
 });
}
function finishReraid(api,pack,s,q,action){
 if(action.uid==null){s.pending=null;api.go(pack,s);return true;}
 const pl=s.players[q.player];
 const base=api.location(s,q.player,q.baseUid);
 const index=pl.hand.findIndex(c=>c.uid===action.uid);
 const physical=index>=0?pl.hand[index]:null;
 const printed=physical&&api.card(pack,physical);
 if(!base||!physical||!q.choices.includes(action.uid)||
  !raidHand(api,pack,s,q.player,base.c,q,null).some(c=>c.uid===action.uid))
  throw Error('Illegal raid replacement');
 pl.hand.splice(index,1);
 s.pending=null;
 api.raid(pack,s,q.player,physical,q.baseUid,base.line,base.slot,undefined,{
  entryReady:true,entryCause:'effectRaid',entryFrom:'hand',effectSourceUid:q.sourceUid});
 return true;
}
function openSelfRetire(api,pack,s,job){
 const pos=api.location(s,job.owner,job.sourceUid);
 if(!pos||pos.c.fieldEntryStamp!==job.sourceStamp)return true;
 s.pending={kind:'effect-mcr',step:'selfRetire',player:job.owner,sourceOwner:job.owner,
  sourceUid:job.sourceUid,sourceStamp:job.sourceStamp};
 return true;
}
function finishSelfRetire(api,pack,s,q,action){
 if(action.mode==='skip'){s.pending=null;api.go(pack,s);return true;}
 if(action.mode!=='accept')throw Error('Illegal self retirement');
 const pos=api.location(s,q.player,q.sourceUid);
 if(!pos||pos.c.fieldEntryStamp!==q.sourceStamp)throw Error('Attack-end source left');
 s.pending=null;
 s.effectQueue.unshift({op:'retireOppFrontOne',owner:q.player,sourceUid:q.sourceUid,optional:true});
 const paused=api.retire(pack,s,q.player,pos.line,pos.slot,{by:'self',controller:q.player,sourceUid:q.sourceUid});
 if(!paused)api.go(pack,s);
 return true;
}
function openBounceOrRetire(api,pack,s,owner,job){
 if(job.when&&!api.live(s,owner,job.sourceUid,job.when))return true;
 const choices=s.players[1-owner].front.filter(c=>c&&api.bp(pack,s,c)<=job.bp).map(c=>c.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'bounceOrRetire',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,bp:job.bp,choices,optional:job.optional===true,
  mayRetire:s.active===owner&&s.phase==='attack'};
 return true;
}
function finishBounce(api,pack,s,q,action){
 if(action.mode==='skip'){s.pending=null;api.go(pack,s);return true;}
 if(!q.choices.includes(action.uid))throw Error('Illegal bounce or retire target');
 if(action.mode==='retire'&&!q.mayRetire)throw Error('Retire is only during your attack');
 if(action.mode!=='bounce'&&action.mode!=='retire')throw Error('Illegal bounce or retire mode');
 const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===action.uid);
 if(slot<0||api.bp(pack,s,s.players[foe].front[slot])>q.bp)throw Error('Target left the cap');
 s.pending=null;
 if(action.mode==='retire'){
  const paused=api.retire(pack,s,foe,'front',slot,{by:'opponent',controller:q.player,sourceUid:q.sourceUid});
  if(!paused)api.go(pack,s);
 }else{
  api.bounce(pack,s,foe,action.uid,q.sourceUid);
  api.go(pack,s);
 }
 return true;
}
function openHandRaid(api,pack,s,owner,job){
 const energy=api.energy(pack,s,owner);
 const choices=s.players[owner].hand.filter(c=>{
  const d=api.card(pack,c);
  if(!['character','field'].includes(d.type)||!d.name?.includes(job.includes))return false;
  return api.need(pack,s,owner,d,c)<=(energy[d.color]||0);
 }).map(c=>c.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'handCard',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,includes:job.includes,choices,optional:true,
  ownTurn:s.active===owner};
 return true;
}
function finishHandCard(api,pack,s,q,action){
 if(action.uid==null){s.pending=null;api.go(pack,s);return true;}
 const pl=s.players[q.player];
 const physical=pl.hand.find(c=>c.uid===action.uid);
 const d=physical&&api.card(pack,physical);
 if(!physical||!q.choices.includes(action.uid)||!d.name?.includes(q.includes))
  throw Error('Illegal hand entry');
 const rests=api.destinations(pl);
 const raids=[];
 if(q.ownTurn&&d.raidName){
  for(const line of ['front','energy'])pl[line].forEach((base,slot)=>{
   if(base&&api.validRaid(pack,s,q.player,base,d))
    raids.push({baseUid:base.uid,line,slot});
  });
 }
 if(!rests.length&&!raids.length)throw Error('No legal entry destination');
 s.pending={...q,step:'handDest',cardUid:action.uid,rests,raids};
 return true;
}
function finishHandDest(api,pack,s,q,action){
 const pl=s.players[q.player];
 const index=pl.hand.findIndex(c=>c.uid===q.cardUid);
 if(index<0)throw Error('Hand card left');
 if(action.mode==='raid'){
  const hit=(q.raids||[]).find(r=>r.baseUid===action.baseUid&&r.line===action.line&&r.slot===action.slot);
  if(!hit||!q.ownTurn)throw Error('Illegal effect raid');
  const physical=pl.hand.splice(index,1)[0];
  s.pending=null;
  api.raid(pack,s,q.player,physical,hit.baseUid,hit.line,hit.slot,undefined,{
   entryReady:true,entryCause:'effectRaid',entryFrom:'hand',effectSourceUid:q.sourceUid});
  return true;
 }
 if(action.mode!=='rest'||!q.rests.some(r=>r.line===action.line&&r.slot===action.slot))
  throw Error('Illegal rested entry');
 const physical=pl.hand[index];
 s.pending=null;
 api.enter(pack,s,{owner:q.player,from:'hand',uid:physical.uid,line:action.line,
  slot:action.slot,replaceUid:action.replaceUid,ready:false,sourceUid:q.sourceUid});
 api.go(pack,s);
 return true;
}
function buffIfRaidAttacker(api,pack,s,owner,job){
 const pos=api.location(s,owner,job.sourceUid);
 const battle=s.kmr2LastBattle;
 const attacker=battle&&api.location(s,1-owner,battle.attackerUid);
 if(!pos||!attacker||!api.faceUpRaid(pack,attacker.c))return true;
 pos.c.buffs??=[];
 pos.c.buffs.push({bp:job.bp,untilTurn:s.turn});
 return true;
}
function paidOptions(api,pack,s,owner,job){
 return (job.options||[]).filter(o=>!o.when||api.live(s,owner,job.sourceUid,o.when));
}
function openPaid(api,pack,s,owner,job){
 const open=paidOptions(api,pack,s,owner,job);
 if(!open.length)return true;
 const ap=s.players[owner].apCards.filter(c=>c.ready).length;
 s.pending={kind:'effect-mcr',step:'paid',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,left:open.map(o=>o.id),picked:[],paid:false,
  canPay:ap>=job.payAp&&open.length>=2,payAp:job.payAp,max:1};
 return true;
}
function finishPaid(api,pack,s,q,action){
 const pl=s.players[q.player];
 if(action.mode==='skip'){
  queuePicked(api,pack,s,q);
  return true;
 }
 if(action.mode==='pay'){
  if(q.paid||!q.canPay)throw Error('AP payment is not legal');
  api.spendAp(pl,q.payAp);
  q.paid=true;q.max=2;q.canPay=false;
  return true;
 }
 if(!q.left.includes(action.mode)||q.picked.includes(action.mode))throw Error('Illegal paid option');
 if(q.picked.length>=q.max)throw Error('Paid choice is full');
 q.picked.push(action.mode);
 q.left=q.left.filter(id=>id!==action.mode);
 if(q.picked.length>=q.max||!q.left.length)queuePicked(api,pack,s,q);
 return true;
}
function queuePicked(api,pack,s,q){
 const printed=api.card(pack,findOwned(s,q.player,q.sourceUid));
 const options=printed.effects.onPlay.find(e=>e.op==='chooseUpToPayTwo').options;
 s.pending=null;
 const jobs=[];
 for(const id of q.picked){
  const option=options.find(o=>o.id===id);
  for(const step of option.then)jobs.push({...step,owner:q.player,sourceUid:q.sourceUid});
 }
 if(jobs.length)s.effectQueue.unshift(...jobs);
 api.go(pack,s);
}
function retireModes(api,pack,s,owner,job,payable){
 const out=[];
 for(const mode of job.options){
  if(!s.players[owner].front.concat(s.players[owner].energy).some(c=>c&&
   api.hasName(api.card(pack,c),mode.name)))continue;
  const legal=s.players[1-owner].front.filter(c=>c&&api.bp(pack,s,c)<=mode.bp&&
   (!payable||payable(c)));
  if(legal.length)out.push(mode.id);
 }
 return out;
}
function openRetireCap(api,pack,s,owner,job){
 const modes=retireModes(api,pack,s,owner,job,c=>api.payable(pack,s,owner,c.uid,0,job.sourceUid));
 if(!modes.length)return true;
 s.pending={kind:'effect-mcr',step:'retireMode',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,modes};
 return true;
}
function finishRetireMode(api,pack,s,q,action){
 if(!q.modes.includes(action.mode))throw Error('Illegal retire cap');
 const printed=api.card(pack,findOwned(s,q.player,q.sourceUid));
 const job=printed.effects.onPlay.find(e=>e.op==='chooseRetireCapOrPeek');
 const mode=job.options.find(o=>o.id===action.mode);
 const choices=s.players[1-q.player].front.filter(c=>c&&api.bp(pack,s,c)<=mode.bp&&
  api.payable(pack,s,q.player,c.uid,0,q.sourceUid)).map(c=>c.uid);
 if(!choices.length)throw Error('Retire cap has no target');
 s.pending=null;
 if(mode.peek)s.effectQueue.unshift({op:'mcrPeekTop',owner:q.player,sourceUid:q.sourceUid});
 s.pending={kind:'effect-retire-bp',player:q.player,sourceUid:q.sourceUid,
  choices,limit:mode.bp,optional:false};
 return true;
}
function openPeek(api,pack,s,owner,job){
 if(!s.players[owner].deck.length)return true;
 s.pending={kind:'effect-mcr',step:'peek',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,uid:s.players[owner].deck[0].uid,
  data:{uids:[s.players[owner].deck[0].uid],zone:'deck'}};
 return true;
}
function finishPeek(api,pack,s,q,action){
 const pl=s.players[q.player];
 if(!pl.deck[0]||pl.deck[0].uid!==q.uid)throw Error('Peeked card left the top');
 if(action.place==='bottom')pl.deck.push(pl.deck.shift());
 else if(action.place!=='top')throw Error('Peek must place the card on top or bottom');
 s.pending=null;api.go(pack,s);return true;
}
function openSearch(api,pack,s,owner,job){
 const window=s.players[owner].deck.slice(0,job.count);
 if(!window.length)return true;
 const choices=window.filter(c=>searchHit(api,pack,c,job.filter)).map(c=>c.uid);
 s.pending={kind:'effect-mcr',step:'searchTake',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,uids:window.map(c=>c.uid),choices,optional:true,
  instead:job.instead,data:{uids:window.map(c=>c.uid),zone:'deck'},
  actions:choices.map(uid=>({type:'chooseMcr',uid})).concat([{type:'chooseMcr',uid:null}])};
 return true;
}
function searchHit(api,pack,physical,filter){
 const d=api.card(pack,physical);
 return d.color===filter.color&&d.type===filter.type&&d.name?.includes(filter.nameIncludes);
}
function finishSearchTake(api,pack,s,q,action){
 const pl=s.players[q.player];
 const window=pl.deck.slice(0,q.uids.length);
 if(window.some((c,i)=>c.uid!==q.uids[i]))throw Error('Search window changed');
 if(action.uid==null){
  s.pending={...q,step:'searchOrder',left:[...q.uids],order:[]};
  return true;
 }
 if(!q.choices.includes(action.uid))throw Error('Ineligible searched card');
 const physical=window.find(c=>c.uid===action.uid);
 reveal(api,pack,s,q.player,physical);
 const d=api.card(pack,physical);
 const witness=fieldNames(api,pack,s,q.player).some(name=>name.includes(q.instead.includes));
 if(witness&&d.energy<=q.instead.energyAtMost){
  s.pending={...q,step:'searchInstead',taken:action.uid};
  return true;
 }
 takeSearch(api,pack,s,q,action.uid,'hand');
 return true;
}
function finishSearchInstead(api,pack,s,q,action){
 if(action.mode!=='hand'&&action.mode!=='deploy')throw Error('Illegal search destination');
 takeSearch(api,pack,s,q,q.taken,action.mode);
 return true;
}
function takeSearch(api,pack,s,q,uid,mode){
 const pl=s.players[q.player];
 const index=pl.deck.findIndex(c=>c.uid===uid);
 if(index<0||index>=q.uids.length)throw Error('Searched card left the window');
 const rest=q.uids.filter(id=>id!==uid);
 if(mode==='hand'){
  const physical=pl.deck[index];
  api.moveLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index,reason:'own-effect',sourceUid:q.sourceUid});
  reveal(api,pack,s,q.player,physical);
 }else{
  const dest=api.destinations(pl).find(d=>d.line==='front')||api.destinations(pl)[0];
  if(!dest)throw Error('No rested destination');
  api.enter(pack,s,{owner:q.player,from:'deck',uid,line:dest.line,slot:dest.slot,
   replaceUid:dest.replaceUid,ready:false,sourceUid:q.sourceUid});
 }
 s.pending=rest.length?{kind:'effect-mcr',step:'searchOrder',player:q.player,sourceOwner:q.player,
  sourceUid:q.sourceUid,left:rest,order:[],uids:rest}:null;
 if(!s.pending)api.go(pack,s);
}
function finishSearchOrder(api,pack,s,q,action){
 if(!q.left.includes(action.uid)||q.order.includes(action.uid))throw Error('Illegal search order');
 q.order.push(action.uid);
 if(q.order.length<q.left.length)return true;
 const pl=s.players[q.player];
 const window=pl.deck.splice(0,q.left.length);
 if(window.some(c=>!q.left.includes(c.uid)))throw Error('Search remainder changed');
 const by=new Map(window.map(c=>[c.uid,c]));
 pl.deck.push(...q.order.map(uid=>by.get(uid)));
 s.pending=null;api.go(pack,s);return true;
}
function openMustBlock(api,pack,s,owner,job){
 const choices=[...s.players[owner].front,...s.players[owner].energy].filter(c=>c&&
  api.card(pack,c).type==='character'&&api.card(pack,c).name?.includes(job.includes)&&
  Number.isInteger(c.fieldEntryStamp)).map(c=>c.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'mustBlock',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,includes:job.includes,choices,optional:true};
 return true;
}
function finishMustBlock(api,pack,s,q,action){
 if(action.uid==null){s.pending=null;api.go(pack,s);return true;}
 const target=[...s.players[q.player].front,...s.players[q.player].energy].find(c=>c?.uid===action.uid);
 if(!target||!q.choices.includes(action.uid)||!api.card(pack,target).name?.includes(q.includes))
  throw Error('Illegal must-block target');
 target.mustBlockGranted={turn:s.turn,stamp:target.fieldEntryStamp,sourceUid:q.sourceUid};
 s.pending=null;api.go(pack,s);return true;
}
function deckCap(api,pack,s,owner,job){
 if(job.bonusWhen&&api.live(s,owner,job.sourceUid,job.bonusWhen))return job.bonusBp;
 return job.bp;
}
function deckTargets(api,pack,s,owner,bp,payable){
 return s.players[1-owner].front.filter(c=>c&&api.bp(pack,s,c)<=bp&&(!payable||payable(c)));
}
function openDeckBottom(api,pack,s,owner,job){
 const cap=deckCap(api,pack,s,owner,job);
 const choices=deckTargets(api,pack,s,owner,cap,c=>api.payable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'deckTarget',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,bp:cap,choices,optional:true,place:'bottom',chooser:'self'};
 return true;
}
function openDeckSide(api,pack,s,owner,job){
 const choices=deckTargets(api,pack,s,owner,job.bp,c=>api.payable(pack,s,owner,c.uid,0,job.sourceUid)).map(c=>c.uid);
 if(!choices.length)return true;
 const self=fieldNames(api,pack,s,owner).some(name=>name.includes(job.witness));
 s.pending={kind:'effect-mcr',step:'deckTarget',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,bp:job.bp,choices,optional:false,chooser:self?'self':'opponent'};
 return true;
}
function finishDeckTarget(api,pack,s,q,action){
 if(action.uid==null){
  if(!q.optional)throw Error('Deck target is mandatory');
  s.pending=null;api.go(pack,s);return true;
 }
 if(!q.choices.includes(action.uid))throw Error('Illegal deck target');
 if(q.place==='bottom'&&q.chooser==='self'){
  s.pending=null;
  api.toDeck(pack,s,1-q.player,action.uid,q.sourceUid,'bottom');
  api.go(pack,s);return true;
 }
 const chooser=q.chooser==='self'?q.player:1-q.player;
 s.pending={kind:'effect-mcr',step:'deckSide',player:chooser,sourceOwner:q.player,
  sourceUid:q.sourceUid,targetUid:action.uid,targetOwner:1-q.player};
 return true;
}
function finishDeckSide(api,pack,s,q,action){
 if(action.place!=='top'&&action.place!=='bottom')throw Error('Illegal deck side');
 s.pending=null;
 api.toDeck(pack,s,q.targetOwner,q.targetUid,q.sourceUid,action.place);
 api.go(pack,s);return true;
}
function activeIfIncludes(api,pack,s,owner,job){
 const pos=api.location(s,owner,job.sourceUid);
 if(!pos)return true;
 if(fieldNames(api,pack,s,owner).some(name=>name.includes(job.includes)))
  api.wake(s,owner,pos.c);
 return true;
}
function openWinDraw(api,pack,s,owner,job){
 const choices=s.players[owner].front.filter(c=>c&&api.card(pack,c).type==='character'&&
  api.card(pack,c).name?.includes(job.includes)&&Number.isInteger(c.fieldEntryStamp)).map(c=>c.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'winDraw',player:owner,sourceOwner:owner,
  sourceUid:job.sourceUid,includes:job.includes,choices,optional:false};
 return true;
}
function finishWinDraw(api,pack,s,q,action){
 const target=s.players[q.player].front.find(c=>c?.uid===action.uid);
 if(!target||!q.choices.includes(action.uid)||!api.card(pack,target).name?.includes(q.includes))
  throw Error('Illegal battle-win draw target');
 target.attackWinDrawGranted={turn:s.turn,stamp:target.fieldEntryStamp,sourceUid:q.sourceUid,upTo:1};
 s.pending=null;api.go(pack,s);return true;
}
function openOutsideHand(api,pack,s,job){
 const rifle=s.players[job.owner].outside.find(c=>c.uid===job.sourceUid);
 if(!rifle)return true;
 const key=job.onceName+'|outsideLeave';
 if(s.onceEffectUses[job.owner].includes(key))return true;
 s.pending={kind:'effect-mcr',step:'outsideHand',player:job.owner,sourceOwner:job.owner,
  sourceUid:job.sourceUid,onceName:job.onceName,optional:true,choices:[job.sourceUid]};
 return true;
}
function finishOutsideHand(api,pack,s,q,action){
 if(action.uid==null){s.pending=null;api.go(pack,s);return true;}
 const pl=s.players[q.player];
 const index=pl.outside.findIndex(c=>c.uid===q.sourceUid);
 if(action.uid!==q.sourceUid||index<0)throw Error('Outside card left');
 const key=q.onceName+'|outsideLeave';
 if(s.onceEffectUses[q.player].includes(key))throw Error('Named outside effect already used');
 s.onceEffectUses[q.player].push(key);
 api.moveLinear(pack,s,{owner:q.player,from:'outside',to:'hand',index,reason:'own-effect',sourceUid:q.sourceUid});
 s.pending=null;api.go(pack,s);return true;
}
function openImpact(api,pack,s,job){
 const choices=api.field(s.players[job.owner]).filter(c=>api.hasTrait(api.card(pack,c),job.trait)&&
  Number.isInteger(c.fieldEntryStamp)).map(c=>c.uid);
 if(!choices.length)return true;
 s.pending={kind:'effect-mcr',step:'impact',player:job.owner,sourceOwner:job.owner,
  sourceUid:job.sourceUid,trait:job.trait,choices,optional:true};
 return true;
}
function finishImpact(api,pack,s,q,action){
 if(action.uid==null){s.pending=null;api.go(pack,s);return true;}
 const target=api.field(s.players[q.player]).find(c=>c.uid===action.uid);
 if(!target||!q.choices.includes(action.uid)||!api.hasTrait(api.card(pack,target),q.trait))
  throw Error('Illegal impact grant');
 target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1,plus:true};
 s.pending=null;api.go(pack,s);return true;
}
function fieldNames(api,pack,s,owner){
 return api.field(s.players[owner]).map(c=>api.card(pack,c).name||'');
}
function reveal(api,pack,s,owner,physical){
 s.publicReveals??=[];
 s.publicReveals.push({kind:'searched-to-hand',owner,title:api.title(pack,owner),
  cardId:physical.cardId,uid:physical.uid,trigger:null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
}
function optionOpen(api,pack,s,owner,source,choice,option){
 if(choice.nameLock&&s.mainReadyOnceByName[owner].includes(choice.nameLock+'|'+option.id))return false;
 if(option.when&&!api.live(s,owner,source.uid,option.when))return false;
 return option.then.every(child=>{
  if(child.op==='buffOwnField'&&child.optional===false){
   const pool=child.zone==='front'?s.players[owner].front.filter(Boolean):api.field(s.players[owner]);
   return pool.some(c=>api.card(pack,c).type==='character'&&api.matchFilter(pack,s,c,child.filter));
  }
  if(child.op==='grantNamedUnblockedOptionalDraw'&&child.optional===false){
   const pool=child.line==='front'?s.players[owner].front.filter(Boolean):api.field(s.players[owner]);
   return pool.some(c=>api.card(pack,c).name?.includes(child.nameIncludes));
  }
  if(child.op==='grantFrontIncludesWinDraw')
   return s.players[owner].front.some(c=>c&&api.card(pack,c).name?.includes(child.includes));
  if(child.op==='enemyBpDown')return true;
  return true;
 });
}
