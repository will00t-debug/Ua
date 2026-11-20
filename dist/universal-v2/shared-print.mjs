// Shared printed sentences used by more than one title. The ops describe the
// Japanese sentence. They are not a title opcode and they do not read a
// private card id. A looked-at window keeps every inspected card, including
// cards that cannot be chosen. Only a card the print says to publish is
// published. Effect entry is the card, then the shared board cell.
export const SHARED_PRINT_OPS=Object.freeze([
 'lookTopAddOneOutside','lookTopNamesFilteredDiscard','optionalDiscardRecoverMode',
 'outsideNamedHandOrRaid','bounceFrontCapDrawIfOwn','distinctFrontChoice',
 'handDeployOrActiveSelf','unionAttackScale','discardOwnHand',
 'discardMayRetireNamedDraw','grantNamedMustBlock','retireOwnOther',
 'deployHandNamesRestSkip'
]);
const UNION_WHEN=['kind','turn','zone','excludeSelf','trait','name','min'];
function text(value,max=80){
 return typeof value==='string'&&!!value.trim()&&value.length<=max&&value===value.trim();
}
function unionWhen(when){
 return !!when&&when.kind==='ownDistinctUnionNames'&&when.turn==='any'&&
  when.zone==='field'&&when.excludeSelf===false&&text(when.trait)&&text(when.name)&&
  Number.isInteger(when.min)&&when.min>=1&&when.min<=8&&
  Object.keys(when).length===UNION_WHEN.length&&
  Object.keys(when).every(key=>UNION_WHEN.includes(key));
}
function keys(effect,allowed){
 return Object.keys(effect).every(key=>allowed.includes(key))&&
  allowed.every(key=>key in effect);
}

export function verifySharedPrintOp(effect,path,index){
 if(!SHARED_PRINT_OPS.includes(effect?.op))return false;
 const fail=()=>{throw Error(path+'['+index+'] invalid '+effect.op);};
 if(effect.op==='lookTopAddOneOutside'&&!(effect.count===2&&keys(effect,['op','count'])))fail();
 if(effect.op==='lookTopNamesFilteredDiscard'&&!(
  effect.count===7&&Array.isArray(effect.names)&&effect.names.length===2&&
  new Set(effect.names).size===2&&effect.names.every(name=>text(name))&&
  effect.energyAtMost===1&&keys(effect,['op','count','names','energyAtMost'])))fail();
 if(effect.op==='optionalDiscardRecoverMode'){
  const options=effect.modes;
  const option=item=>item&&text(item.name)&&Number.isInteger(item.max)&&item.max>=1&&item.max<=2&&
   (item.energy===undefined||item.energy===0)&&
   Object.keys(item).every(key=>['name','max','energy'].includes(key));
  if(!Array.isArray(options)||options.length!==2||!options.every(option)||
   !keys(effect,['op','modes']))fail();
 }
 if(effect.op==='outsideNamedHandOrRaid'&&!(
  text(effect.name)&&text(effect.raidName)&&effect.raidMin===6&&
  keys(effect,['op','name','raidName','raidMin'])))fail();
 if(effect.op==='bounceFrontCapDrawIfOwn'&&!(
  effect.bp===3000&&keys(effect,['op','bp'])))fail();
 if(effect.op==='distinctFrontChoice'&&!(
  text(effect.trait)&&effect.min===4&&effect.down?.minBp===4000&&effect.down?.bp===500&&
  Object.keys(effect.down).length===2&&effect.retire?.ap===1&&effect.retire?.maxBp===2500&&
  Object.keys(effect.retire).length===2&&
  keys(effect,['op','trait','min','down','retire'])))fail();
 if(effect.op==='handDeployOrActiveSelf'&&!(
  effect.color==='blue'&&text(effect.trait)&&effect.maxEnergy===2&&effect.ap===1&&
  keys(effect,['op','color','trait','maxEnergy','ap'])))fail();
 if(effect.op==='unionAttackScale'&&!(
  text(effect.trait)&&text(effect.name)&&effect.at===4&&effect.bp===500&&effect.high===6&&
  keys(effect,['op','trait','name','at','bp','high'])))fail();
 if(effect.op==='discardOwnHand'&&!keys(effect,['op']))fail();
 if(effect.op==='discardMayRetireNamedDraw'&&!(
  text(effect.name)&&effect.draw===2&&keys(effect,['op','name','draw'])))fail();
 if(effect.op==='grantNamedMustBlock'&&!(
  text(effect.name)&&effect.bp===2500&&keys(effect,['op','name','bp'])))fail();
 if(effect.op==='retireOwnOther'&&!keys(effect,['op']))fail();
 if(effect.op==='deployHandNamesRestSkip'&&!(
  effect.color==='purple'&&Array.isArray(effect.names)&&effect.names.length===2&&
  new Set(effect.names).size===2&&effect.names.every(name=>text(name))&&
  keys(effect,['op','color','names'])))fail();
 return true;
}

export function assertSharedPrintPlacement(card,name,program){
 const found=(program||[]).filter(effect=>SHARED_PRINT_OPS.includes(effect.op));
 if(!found.length)return;
 const onPlay=new Set(['lookTopAddOneOutside','lookTopNamesFilteredDiscard',
  'optionalDiscardRecoverMode','distinctFrontChoice','handDeployOrActiveSelf',
  'discardOwnHand','discardMayRetireNamedDraw','retireOwnOther']);
 for(const effect of found){
  if(onPlay.has(effect.op)&&(name!=='onPlay'||card.type!=='character'||
   program.filter(item=>item.op===effect.op).length!==1))
   throw Error(card.id+' '+effect.op+' is a character onPlay effect');
  if(effect.op==='unionAttackScale'&&(name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' union attack scale is a character onAttack effect');
  if(effect.op==='deployHandNamesRestSkip'&&(name!=='onRetire'||card.type!=='character'))
   throw Error(card.id+' rested skip entry is a character onRetire effect');
  if((effect.op==='outsideNamedHandOrRaid'||effect.op==='bounceFrontCapDrawIfOwn')&&
   (name!=='onPlay'||card.type!=='event'||program.length!==1))
   throw Error(card.id+' '+effect.op+' is a lone event onPlay effect');
  if(effect.op==='grantNamedMustBlock'&&(name!=='onPlay'||card.type!=='event'))
   throw Error(card.id+' named must-block grant is an event onPlay effect');
 }
}

export function sharedPrintMain(card,ability){
 if(!ability||card?.type!=='character')return false;
 if(ability.op==='lookTopReturn')
  return ability.frontOnly===true&&ability.oncePerTurn===true&&ability.count===1&&
   keys(ability,['op','frontOnly','oncePerTurn','count']);
 if(ability.op==='moveNamedFrontToEnergy')
  return ability.frontOnly===true&&ability.oncePerTurn===true&&text(ability.name)&&
   keys(ability,['op','frontOnly','oncePerTurn','name']);
 if(ability.op==='discardThenEnemyDown')
  return ability.oncePerTurn===true&&ability.minBp===1500&&ability.bp===1000&&
   keys(ability,['op','oncePerTurn','minBp','bp']);
 if(ability.op==='restRetireDeploy'){
  const named=text(ability.name),except=text(ability.exceptName);
  return ability.ready===false&&ability.optional===true&&ability.color==='purple'&&
   ability.energy===0&&(ability.to==='energy'||ability.to==='field')&&
   (ability.line==='energy'||ability.line==='field')&&named!==except&&
   (ability.when===undefined||unionWhen(ability.when))&&
   Object.keys(ability).every(key=>['op','line','ready','optional','color','energy','name','exceptName','to','when'].includes(key))&&
   (named||except);
 }
 if(ability.op==='restUnionPeek')return unionWhen(ability.when)&&keys(ability,['op','when']);
 return false;
}

function live(api,pack,s,owner,uid,condition){
 return api.matches(s,owner,uid,condition,card=>api.card(pack,card),()=>0,card=>api.bp(pack,s,card));
}
function open(s,pending){s.pending=pending;}
function finish(api,pack,s){s.pending=null;api.continueQueue(pack,s);}
function windowOf(pl,uids){
 const window=pl.deck.slice(0,uids.length);
 if(window.length!==uids.length||window.some((card,index)=>card.uid!==uids[index]))
  throw Error('Inspected window changed');
 return window;
}
function handFilter(api,pack,physical,filter){
 if(!filter)return true;
 const printed=api.card(pack,physical);
 const named=Array.isArray(filter.names)&&filter.names.some(name=>api.cardHasName(printed,name,false));
 const cheap=Number.isInteger(filter.energyAtMost)&&printed.energy<=filter.energyAtMost;
 return named||cheap;
}
function matchingHand(api,pack,pl,filter){
 return pl.hand.filter(card=>handFilter(api,pack,card,filter)).map(card=>card.uid);
}
function entryMatches(api,pack,s,physical,filter){
 const printed=api.card(pack,physical);
 if(physical.faceDown===true)return false;
 if(filter.type&&printed.type!==filter.type)return false;
 if(filter.color&&printed.color!==filter.color)return false;
 if(Number.isInteger(filter.energy)&&printed.energy!==filter.energy)return false;
 if(Number.isInteger(filter.maxEnergy)&&printed.energy>filter.maxEnergy)return false;
 if(Number.isInteger(filter.ap)&&printed.ap!==filter.ap)return false;
 if(filter.trait&&!api.cardHasTrait(printed,filter.trait))return false;
 if(filter.name&&!api.cardHasName(printed,filter.name,api.originalEffectsDisabled(s,physical)))return false;
 if(filter.exceptName&&api.cardHasName(printed,filter.exceptName,false))return false;
 if(Array.isArray(filter.names)&&!filter.names.some(name=>api.cardHasName(printed,name,false)))return false;
 return true;
}
function entryChoices(api,pack,s,owner,from,filter){
 return s.players[owner][from].filter(card=>entryMatches(api,pack,s,card,filter)).map(card=>card.uid);
}
function offerEntry(api,pack,s,owner,sourceUid,spec){
 const choices=entryChoices(api,pack,s,owner,spec.from,spec.filter);
 if(!choices.length){
  if(spec.activeSelf){
   const self=api.field(s.players[owner]).find(card=>card.uid===spec.activeSelf);
   if(self)api.attemptFieldActive(s,owner,self);
  }
  return false;
 }
 open(s,{kind:'effect-print',player:owner,sourceUid,step:'card',from:spec.from,
  choices,lines:spec.lines,ready:spec.ready===true,skipNext:spec.skipNext===true,
  optional:spec.optional!==false,activeSelf:spec.activeSelf||null,filter:spec.filter});
 return true;
}
function frontBp(api,pack,s,owner,test){
 return s.players[owner].front.filter(card=>card&&api.card(pack,card).type==='character'&&
  test(api.bp(pack,s,card))).map(card=>card.uid);
}

export function runSharedPrintJob(api,pack,s,job){
 if(job.op!=='restRetireDeployFollow'&&!SHARED_PRINT_OPS.includes(job.op))return false;
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='lookTopAddOneOutside'||job.op==='lookTopNamesFilteredDiscard'){
  const uids=pl.deck.slice(0,job.count).map(card=>card.uid);
  if(!uids.length)return true;
  const choices=job.op==='lookTopAddOneOutside'?uids:uids.filter(uid=>{
   const printed=api.card(pack,pl.deck.find(card=>card.uid===uid));
   return job.names.some(name=>api.cardHasName(printed,name,false));
  });
  open(s,{kind:'effect-print-look',player:owner,sourceUid:job.sourceUid,uids,choices,
   optional:true,rest:job.op==='lookTopAddOneOutside'?'outside':'bottom',
   handFilter:job.op==='lookTopNamesFilteredDiscard'?{names:[...job.names],energyAtMost:job.energyAtMost}:null});
  return true;
 }
 if(job.op==='discardOwnHand'||job.op==='discardMayRetireNamedDraw'){
  if(pl.hand.length)open(s,{kind:'effect-discard',player:owner,sourceUid:job.sourceUid,
   ...(job.op==='discardMayRetireNamedDraw'?{thenRetire:{name:job.name,draw:job.draw}}:{})});
  return true;
 }
 if(job.op==='optionalDiscardRecoverMode'){
  if(pl.hand.length)open(s,{kind:'effect-print',player:owner,sourceUid:job.sourceUid,
   step:'pay',modes:job.modes.map(option=>({...option}))});
  return true;
 }
 if(job.op==='retireOwnOther'){
  const choices=api.field(pl).filter(card=>card.uid!==job.sourceUid&&
   api.printedFieldCard(card)&&api.card(pack,card).type==='character').map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-print',player:owner,sourceUid:job.sourceUid,
   step:'retire-other',choices,optional:false});
  return true;
 }
 if(job.op==='deployHandNamesRestSkip'){
  offerEntry(api,pack,s,owner,job.sourceUid,{from:'hand',optional:true,ready:false,skipNext:true,
   lines:['front','energy'],filter:{type:'character',color:job.color,names:[...job.names]}});
  return true;
 }
 if(job.op==='handDeployOrActiveSelf'){
  offerEntry(api,pack,s,owner,job.sourceUid,{from:'hand',optional:true,ready:true,
   activeSelf:job.sourceUid,lines:['front','energy'],
   filter:{type:'character',color:job.color,trait:job.trait,maxEnergy:job.maxEnergy,ap:job.ap}});
  return true;
 }
 if(job.op==='grantNamedMustBlock'){
  const choices=api.field(pl).filter(card=>api.printedFieldCard(card)&&
   api.card(pack,card).type==='character'&&
   api.cardHasName(api.card(pack,card),job.name,api.originalEffectsDisabled(s,card))).map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-print',player:owner,sourceUid:job.sourceUid,
   step:'grant',name:job.name,bp:job.bp,choices,optional:true});
  return true;
 }
 if(job.op==='unionAttackScale'){
  const gate={kind:'ownDistinctUnionNames',turn:'any',zone:'field',excludeSelf:false,
   trait:job.trait,name:job.name,min:job.at};
  if(!live(api,pack,s,owner,job.sourceUid,gate))return true;
  const source=api.field(pl).find(card=>card.uid===job.sourceUid);
  if(source){source.buffs??=[];source.buffs.push({bp:job.bp,untilTurn:s.turn});}
  if(live(api,pack,s,owner,job.sourceUid,{...gate,min:job.high})){
   api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
   if(pl.hand.length)open(s,{kind:'effect-discard',player:owner,sourceUid:job.sourceUid});
  }
  return true;
 }
 if(job.op==='distinctFrontChoice'){
  const gate={kind:'ownDistinctTraitNames',turn:'any',min:job.min,zone:'field',
   excludeSelf:false,trait:job.trait};
  if(!live(api,pack,s,owner,job.sourceUid,gate))return true;
  const foe=1-owner;
  const down=frontBp(api,pack,s,foe,bp=>bp>=job.down.minBp);
  const retire=pl.apCards.some(card=>card.ready)&&
   frontBp(api,pack,s,foe,bp=>bp<=job.retire.maxBp);
  if(down.length||retire.length)open(s,{kind:'effect-print',player:owner,sourceUid:job.sourceUid,
   step:'fork',optional:true,down:down.length?{minBp:job.down.minBp,bp:job.down.bp,choices:down}:null,
   retire:retire?{ap:job.retire.ap,maxBp:job.retire.maxBp}:null});
  return true;
 }
 if(job.op==='bounceFrontCapDrawIfOwn'){
  const choices=[];
  for(const who of [owner,1-owner])for(const card of s.players[who].front){
   if(!card||api.card(pack,card).type!=='character')continue;
   if(api.bp(pack,s,card)<=job.bp)choices.push({uid:card.uid,owner:who});
  }
  if(choices.length)open(s,{kind:'effect-print',player:owner,sourceUid:job.sourceUid,
   step:'bounce',bp:job.bp,choices,optional:true});
  return true;
 }
 if(job.op==='outsideNamedHandOrRaid'){
  const choices=pl.outside.filter(card=>api.cardHasName(api.card(pack,card),job.name,false)).map(card=>card.uid);
  if(!choices.length)return true;
  const allen=pl.outside.filter(card=>api.cardHasName(api.card(pack,card),job.raidName,false)).length;
  open(s,{kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'nea',
   choices,name:job.name,raidMin:job.raidMin,allen,optional:false});
  return true;
 }
 if(job.op==='restRetireDeployFollow'){
  offerEntry(api,pack,s,owner,job.sourceUid,{from:'outside',optional:true,ready:false,
   lines:job.to==='energy'?['energy']:['front','energy'],filter:job.filter});
  return true;
 }
 return false;
}

function still(api,pack,s,owner,uids,from){
 return uids.filter(uid=>s.players[owner][from].some(card=>card.uid===uid));
}

export function legalSharedPrintPending(api,pack,s){
 const q=s.pending;
 if(!q||(q.kind!=='effect-print'&&q.kind!=='effect-print-look'))return null;
 const pl=s.players[q.player];
 if(q.kind==='effect-print-look'){
  windowOf(pl,q.uids);
  return [
   ...(q.optional?[{type:'choosePrintLook',uid:null}]:[]),
   ...q.choices.filter(uid=>q.uids.includes(uid)&&pl.deck.slice(0,q.uids.length).some(card=>card.uid===uid))
    .map(uid=>({type:'choosePrintLook',uid}))
  ];
 }
 if(q.step==='pay')return [
  {type:'choosePrintPay',uid:null},
  ...pl.hand.map(card=>({type:'choosePrintPay',uid:card.uid}))
 ];
 if(q.step==='mode')return q.live.map(id=>({type:'choosePrintMode',id}));
 if(q.step==='take')return [
  {type:'choosePrintTake',uid:null},
  ...still(api,pack,s,q.player,q.choices,'outside').map(uid=>({type:'choosePrintTake',uid}))
 ];
 if(q.step==='card')return [
  ...(q.optional?[{type:'choosePrintCard',uid:null}]:[]),
  ...still(api,pack,s,q.player,q.choices,q.from).filter(uid=>
   entryMatches(api,pack,s,pl[q.from].find(card=>card.uid===uid),q.filter))
   .map(uid=>({type:'choosePrintCard',uid}))
 ];
 if(q.step==='cell'){
  const printed=api.card(pack,pl[q.from].find(card=>card.uid===q.uid));
  return q.lines.filter(line=>!(line==='front'&&printed.frontForbidden)&&
   !(line==='energy'&&(printed.energyForbidden||printed.energyLineForbidden)))
   .flatMap(line=>api.legalDestinations(pl,line).map(dest=>({type:'choosePrintCell',line,...dest})));
 }
 if(q.step==='move-card')return q.choices.filter(uid=>pl.front.some(card=>card?.uid===uid&&
  api.cardHasName(api.card(pack,card),q.name,api.originalEffectsDisabled(s,card))&&
  !api.card(pack,card).energyForbidden&&!api.card(pack,card).energyLineForbidden))
  .map(uid=>({type:'choosePrintMove',uid}));
 if(q.step==='move-cell')return api.legalDestinations(pl,'energy').map(dest=>({
  type:'choosePrintMoveCell',...dest}));
 if(q.step==='grant')return [
  {type:'choosePrintGrant',uid:null},
  ...q.choices.filter(uid=>api.field(pl).some(card=>card.uid===uid&&api.printedFieldCard(card)&&
   api.cardHasName(api.card(pack,card),q.name,api.originalEffectsDisabled(s,card))))
   .map(uid=>({type:'choosePrintGrant',uid}))
 ];
 if(q.step==='bounce')return [
  {type:'choosePrintBounce',uid:null},
  ...q.choices.filter(choice=>{
   const card=s.players[choice.owner].front.find(item=>item?.uid===choice.uid);
   return card&&api.bp(pack,s,card)<=q.bp;
  }).map(choice=>({type:'choosePrintBounce',uid:choice.uid}))
 ];
 if(q.step==='draw')return [
  {type:'choosePrintDraw',mode:'skip'},
  ...(pl.deck.length?[{type:'choosePrintDraw',mode:'draw'}]:[])
 ];
 if(q.step==='fork')return [
  {type:'choosePrintFork',mode:'skip'},
  ...(q.down?[{type:'choosePrintFork',mode:'down'}]:[]),
  ...(q.retire?[{type:'choosePrintFork',mode:'retire'}]:[])
 ];
 if(q.step==='retire-named'||q.step==='retire-other'){
  const decline=q.optional?[{type:'choosePrintRetireOwn',uid:null}]:[];
  return [...decline,...q.choices.filter(uid=>{
   const card=api.field(pl).find(item=>item.uid===uid);
   return card&&api.printedFieldCard(card)&&api.card(pack,card).type==='character'&&
    (q.step==='retire-other'?uid!==q.sourceUid:api.cardHasName(api.card(pack,card),q.name,api.originalEffectsDisabled(s,card)));
  }).map(uid=>({type:'choosePrintRetireOwn',uid}))];
 }
 if(q.step==='nea'){
  const out=[];
  for(const uid of still(api,pack,s,q.player,q.choices,'outside')){
   out.push({type:'choosePrintNea',uid,mode:'hand'});
   const printed=api.card(pack,pl.outside.find(card=>card.uid===uid));
   const base=q.allen>=q.raidMin&&api.energyReady(pack,s,q.player,printed)&&
    api.field(pl).some(card=>api.validRaidBase(pack,s,q.player,card,printed));
   if(base)out.push({type:'choosePrintNea',uid,mode:'raid'});
  }
  return out;
 }
 if(q.step==='raid'){
  const printed=api.card(pack,pl.outside.find(card=>card.uid===q.uid));
  return api.field(pl).flatMap(card=>{
   if(!api.validRaidBase(pack,s,q.player,card,printed))return [];
   const pos=api.location(s,q.player,card.uid);
   return pos?[{type:'choosePrintRaid',baseUid:card.uid,line:pos.line,slot:pos.slot}]:[];
  });
 }
  return null;
}

function placeOutside(api,pack,s,owner,uids,sourceUid){
 const pl=s.players[owner];
 const prefix=pl.deck.slice(0,uids.length);
 if(prefix.length!==uids.length||prefix.some((card,index)=>card.uid!==uids[index]))
  throw Error('Outside remainder left the inspected window');
 for(let i=0;i<uids.length;i++)api.moveOwnedLinear(pack,s,{owner,from:'deck',to:'outside',
  index:0,reason:'own-effect',sourceUid});
}
function afterLook(api,pack,s,q,added){
 const pl=s.players[q.player];
 const remaining=q.uids.filter(uid=>uid!==added);
 if(q.rest==='outside'){
  placeOutside(api,pack,s,q.player,remaining,q.sourceUid);
  if(added&&pl.hand.length)open(s,{kind:'effect-discard',player:q.player,sourceUid:q.sourceUid});
  else finish(api,pack,s);
  return;
 }
 const discard=added?{discardAfter:true,...(q.handFilter?{handFilter:q.handFilter}:{})}:{};
 if(remaining.length)open(s,{kind:'effect-top-order',player:q.player,sourceUid:q.sourceUid,
  uids:remaining,order:[],rest:'bottom',...discard});
 else if(added){
  const choices=matchingHand(api,pack,pl,q.handFilter);
  if(!choices.length)throw Error('Printed hand discard has no matching card');
  open(s,{kind:'effect-discard',player:q.player,sourceUid:q.sourceUid,
   ...(q.handFilter?{handFilter:q.handFilter}:{})});
 }else finish(api,pack,s);
}

export function resolveSharedPrintPending(api,pack,s,action){
 const q=s.pending;
 if(!q||(q.kind!=='effect-print'&&q.kind!=='effect-print-look'))return false;
 const pl=s.players[q.player];
 if(q.kind==='effect-print-look'){
  if(action.type!=='choosePrintLook')throw Error('Illegal inspected look');
  if(action.uid!==null&&!q.choices.includes(action.uid))throw Error('That inspected card cannot be added');
  windowOf(pl,q.uids);
  if(action.uid!==null){
   const index=pl.deck.findIndex(card=>card.uid===action.uid);
   if(index<0||index>=q.uids.length)throw Error('Selected card left the inspected window');
   const physical=api.moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   api.publishAdded(pack,s,q.player,physical);
  }
  afterLook(api,pack,s,q,action.uid);
  return true;
 }
 if(q.step==='pay'){
  if(action.type!=='choosePrintPay')throw Error('Illegal optional discard');
  if(action.uid===null){finish(api,pack,s);return true;}
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(index<0)throw Error('Discard requires an owned hand card');
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   reason:'payment',sourceUid:q.sourceUid});
  const live=q.modes.filter(option=>pl.outside.some(card=>{
   const printed=api.card(pack,card);
   return api.cardHasName(printed,option.name,false)&&
    (option.energy===undefined||printed.energy===option.energy);
  })).map(option=>option.name);
  if(!live.length){finish(api,pack,s);return true;}
  open(s,{kind:'effect-print',player:q.player,sourceUid:q.sourceUid,step:'mode',
   modes:q.modes,live});
  return true;
 }
 if(q.step==='mode'){
  const option=q.modes.find(item=>item.name===action.id);
  if(action.type!=='choosePrintMode'||!option||!q.live.includes(action.id))
   throw Error('Illegal recovery mode');
  const choices=pl.outside.filter(card=>{
   const printed=api.card(pack,card);
   return api.cardHasName(printed,option.name,false)&&
    (option.energy===undefined||printed.energy===option.energy);
  }).map(card=>card.uid);
  open(s,{kind:'effect-print',player:q.player,sourceUid:q.sourceUid,step:'take',
   choices,max:option.max,selected:[]});
  return true;
 }
 if(q.step==='take'){
  if(action.type!=='choosePrintTake')throw Error('Illegal outside recovery');
  if(action.uid!==null){
   if(q.selected.length>=q.max||!q.choices.includes(action.uid))throw Error('Illegal outside recovery');
   const index=pl.outside.findIndex(card=>card.uid===action.uid);
   if(index<0)throw Error('Recovered card left outside');
   api.moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   q.selected.push(action.uid);
  }
  const left=still(api,pack,s,q.player,q.choices,'outside').filter(uid=>!q.selected.includes(uid));
  if(action.uid===null||q.selected.length>=q.max||!left.length)finish(api,pack,s);
  return true;
 }
 if(q.step==='card'){
  if(action.type!=='choosePrintCard')throw Error('Illegal effect entry card');
  if(action.uid===null){
   if(!q.optional)throw Error('This entry cannot be skipped');
   if(q.activeSelf){
    const self=api.field(pl).find(card=>card.uid===q.activeSelf);
    if(self)api.attemptFieldActive(s,q.player,self);
   }
   finish(api,pack,s);return true;
  }
  const physical=pl[q.from].find(card=>card.uid===action.uid);
  if(!physical||!q.choices.includes(action.uid)||!entryMatches(api,pack,s,physical,q.filter))
   throw Error('Effect entry card does not match the print');
  q.step='cell';q.uid=action.uid;return true;
 }
 if(q.step==='cell'){
  if(action.type!=='choosePrintCell'||!q.lines.includes(action.line))
   throw Error('Effect entry needs a shared board cell');
  const physical=pl[q.from].find(card=>card.uid===q.uid);
  if(!physical)throw Error('Effect entry card left its zone');
  s.pending=null;
  api.effectEnter(pack,s,{owner:q.player,from:q.from,uid:q.uid,line:action.line,
   slot:action.slot,replaceUid:action.replaceUid,ready:q.ready,sourceUid:q.sourceUid,
   skipOnPlay:true});
  const entered=api.location(s,q.player,q.uid);
  if(q.skipNext&&entered)api.grantContinuousState(s,{kind:'skipNextActive',controller:q.player,
   sourceUid:q.sourceUid,targetUid:entered.c.uid});
  if(entered&&q.skipOnPlay!==true)api.applyEffects(pack,s,entered.c,'onPlay',q.player,
   q.from==='hand'?'handEffect':'outsideEffect',q.sourceUid);
  else api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='move-card'){
  if(action.type!=='choosePrintMove'||!q.choices.includes(action.uid))
   throw Error('Illegal energy-line move');
  const card=pl.front.find(item=>item?.uid===action.uid);
  if(!card||!api.cardHasName(api.card(pack,card),q.name,api.originalEffectsDisabled(s,card)))
   throw Error('Illegal energy-line move');
  q.step='move-cell';q.uid=action.uid;return true;
 }
 if(q.step==='move-cell'){
  if(action.type!=='choosePrintMoveCell')throw Error('Energy move needs a shared cell');
  s.pending=null;
  const paused=api.effectMoveTo(pack,s,q.player,q.uid,'energy',action.slot,action.replaceUid,q.sourceUid);
  if(!paused)api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='grant'){
  if(action.type!=='choosePrintGrant')throw Error('Illegal must-block grant');
  if(action.uid!==null){
   const target=api.field(pl).find(card=>card.uid===action.uid);
   if(!target||!q.choices.includes(action.uid)||!Number.isInteger(target.fieldEntryStamp)||
    !api.cardHasName(api.card(pack,target),q.name,api.originalEffectsDisabled(s,target)))
    throw Error('Must-block grant needs the named character');
   target.mustBlockGranted={turn:s.turn,stamp:target.fieldEntryStamp,sourceUid:q.sourceUid};
   target.buffs??=[];target.buffs.push({bp:q.bp,untilTurn:s.turn});
  }
  finish(api,pack,s);return true;
 }
 if(q.step==='bounce'){
  if(action.type!=='choosePrintBounce')throw Error('Illegal front return');
  if(action.uid===null){finish(api,pack,s);return true;}
  const choice=q.choices.find(item=>item.uid===action.uid);
  const host=choice&&s.players[choice.owner].front.find(card=>card?.uid===action.uid);
  if(!choice||!host||api.bp(pack,s,host)>q.bp)throw Error('Illegal front return');
  const own=choice.owner===q.player;
  s.pending=null;
  const paused=api.bounceToHand(pack,s,choice.owner,action.uid,q.sourceUid,
   own?{reason:'own-effect',controller:q.player}:{reason:'opponent-effect',controller:q.player,by:'opponent'});
  if(paused)return true;
  if(own&&pl.deck.length)open(s,{kind:'effect-print',player:q.player,sourceUid:q.sourceUid,step:'draw'});
  else api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='draw'){
  if(action.type!=='choosePrintDraw')throw Error('Illegal optional draw');
  if(action.mode==='draw')api.draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  else if(action.mode!=='skip')throw Error('Illegal optional draw');
  finish(api,pack,s);return true;
 }
 if(q.step==='fork'){
  if(action.type!=='choosePrintFork')throw Error('Illegal printed choice');
  if(action.mode==='skip'){finish(api,pack,s);return true;}
  if(action.mode==='down'&&q.down){
   s.pending=null;
   s.effectQueue.unshift({op:'enemyBpDown',owner:q.player,sourceUid:q.sourceUid,
    bp:q.down.bp,optional:false,minBp:q.down.minBp,zone:'front'});
   api.continueQueue(pack,s);return true;
  }
  if(action.mode==='retire'&&q.retire&&pl.apCards.some(card=>card.ready)){
   api.spendAp(pl,q.retire.ap);
   s.pending=null;
   s.effectQueue.unshift({op:'retireOppFrontOneUnderBp',owner:q.player,sourceUid:q.sourceUid,
    bp:q.retire.maxBp,optional:true});
   api.continueQueue(pack,s);return true;
  }
  throw Error('Illegal printed choice');
 }
 if(q.step==='retire-named'||q.step==='retire-other'){
  if(action.uid===null){
   if(!q.optional)throw Error('This retirement cannot be skipped');
   finish(api,pack,s);return true;
  }
  const found=api.location(s,q.player,action.uid);
  if(action.type!=='choosePrintRetireOwn'||!found||!q.choices.includes(action.uid)||
   !api.printedFieldCard(found.c)||api.card(pack,found.c).type!=='character')
   throw Error('Illegal own retirement');
  s.pending=null;
  const paused=api.retire(pack,s,q.player,found.line,found.slot,{by:'effect',controller:q.player,sourceUid:q.sourceUid});
  if(!paused&&q.draw)api.draw(pack,s,q.player,q.draw,{reason:'own-effect',sourceUid:q.sourceUid});
  if(!paused)api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='nea'){
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  if(action.type!=='choosePrintNea'||index<0||!q.choices.includes(action.uid))
   throw Error('Illegal outside name');
  if(action.mode==='hand'){
   api.moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'hand',index,
    reason:'own-effect',sourceUid:q.sourceUid});
   finish(api,pack,s);return true;
  }
  if(action.mode!=='raid'||q.allen<q.raidMin)throw Error('Raid replacement is not open');
  const printed=api.card(pack,pl.outside[index]);
  if(!api.energyReady(pack,s,q.player,printed))throw Error('Raid replacement is not open');
  q.step='raid';q.uid=action.uid;return true;
 }
 if(q.step==='raid'){
  const index=pl.outside.findIndex(card=>card.uid===q.uid);
  const physical=pl.outside[index];
  const base=api.location(s,q.player,action.baseUid);
  if(action.type!=='choosePrintRaid'||!physical||!base||action.line!==base.line||action.slot!==base.slot||
   !api.validRaidBase(pack,s,q.player,base.c,api.card(pack,physical)))
   throw Error('Illegal effect raid cell');
  pl.outside.splice(index,1);
  s.pending=null;
  api.performRaid(pack,s,q.player,physical,action.baseUid,action.line,action.slot,undefined,
   {entryReady:true,entryCause:'outsideEffectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
  return true;
 }
 return false;
}

function readySource(api,pack,s,player,card){
 return card&&!api.originalEffectsDisabled(s,card)&&api.raidBoxTextLive(pack,card,'main');
}

export function legalSharedPrintActivations(api,pack,s,player){
 if(s.phase!=='main'||s.pending)return [];
 const pl=s.players[player],out=[];
 for(const card of [...pl.front,...pl.energy].filter(Boolean)){
  if(!readySource(api,pack,s,player,card))continue;
  const ability=api.card(pack,card).mainAbility;
  if(!ability)continue;
  const used=s.mainAbilityUsedUids.includes(card.uid);
  const onFront=pl.front.some(item=>item?.uid===card.uid);
  const onEnergy=pl.energy.some(item=>item?.uid===card.uid);
  if(ability.op==='lookTopReturn'&&onFront&&!used&&pl.deck.length)
   out.push({type:'activate',uid:card.uid,mode:'printLookTop'});
  if(ability.op==='moveNamedFrontToEnergy'&&onFront&&!used&&
   pl.front.some(item=>item&&api.cardHasName(api.card(pack,item),ability.name,api.originalEffectsDisabled(s,item))&&
    !api.card(pack,item).energyForbidden&&!api.card(pack,item).energyLineForbidden))
   out.push({type:'activate',uid:card.uid,mode:'printMoveEnergy'});
  if(ability.op==='discardThenEnemyDown'&&!used&&pl.hand.length)
   out.push({type:'activate',uid:card.uid,mode:'printDiscardDown'});
  if(ability.op==='restRetireDeploy'&&card.ready&&
   (ability.line==='field'?onFront||onEnergy:onEnergy)&&
   (!ability.when||live(api,pack,s,player,card.uid,ability.when)))
   out.push({type:'activate',uid:card.uid,mode:'printRestRetire'});
  if(ability.op==='restUnionPeek'&&card.ready&&(onFront||onEnergy)&&
   live(api,pack,s,player,card.uid,ability.when))
   out.push({type:'activate',uid:card.uid,mode:'printUnionPeek'});
 }
 return out;
}

export function activateSharedPrint(api,pack,s,action){
 const modes=['printLookTop','printMoveEnergy','printDiscardDown','printRestRetire','printUnionPeek'];
 if(!modes.includes(action.mode))return false;
 const player=s.active,pl=s.players[player];
 const selected=[...pl.front,...pl.energy].find(card=>card?.uid===action.uid);
 const ability=selected&&api.card(pack,selected).mainAbility;
 if(!selected||!readySource(api,pack,s,player,selected)||!ability)
  throw Error('Shared print activation is not on a live card');
 const used=()=>s.mainAbilityUsedUids.includes(selected.uid);
 if(action.mode==='printLookTop'){
  if(ability.op!=='lookTopReturn'||!pl.front.some(card=>card?.uid===selected.uid)||used()||!pl.deck.length)
   throw Error('Top look is once per front card');
  s.mainAbilityUsedUids.push(selected.uid);
  const uid=pl.deck[0].uid;
  open(s,{kind:'effect-top-order',player,sourceUid:selected.uid,uids:[uid],order:[],rest:'top'});
  return true;
 }
 if(action.mode==='printMoveEnergy'){
  const choices=pl.front.filter(card=>card&&api.cardHasName(api.card(pack,card),ability.name,
   api.originalEffectsDisabled(s,card))&&!api.card(pack,card).energyForbidden&&
   !api.card(pack,card).energyLineForbidden).map(card=>card.uid);
  if(ability.op!=='moveNamedFrontToEnergy'||!pl.front.some(card=>card?.uid===selected.uid)||used()||!choices.length)
   throw Error('Named energy move is not legal');
  s.mainAbilityUsedUids.push(selected.uid);
  open(s,{kind:'effect-print',player,sourceUid:selected.uid,step:'move-card',name:ability.name,choices});
  return true;
 }
 if(action.mode==='printDiscardDown'){
  if(ability.op!=='discardThenEnemyDown'||used()||!pl.hand.length)
   throw Error('Discard BP reduction needs one hand card');
  s.mainAbilityUsedUids.push(selected.uid);
  open(s,{kind:'effect-discard',player,sourceUid:selected.uid,
   thenEnemyDown:{bp:ability.bp,minBp:ability.minBp}});
  return true;
 }
 if(action.mode==='printRestRetire'){
  const onEnergy=pl.energy.some(card=>card?.uid===selected.uid);
  const placed=onEnergy||pl.front.some(card=>card?.uid===selected.uid);
  if(ability.op!=='restRetireDeploy'||!selected.ready||
   !(ability.line==='field'?placed:onEnergy)||
   (ability.when&&!live(api,pack,s,player,selected.uid,ability.when)))
   throw Error('Rest and retire deploy is not legal');
  api.noteOwnEffectRest(s,player,selected);
  selected.ready=false;
  const filter={type:'character',color:ability.color,energy:ability.energy,
   ...(ability.name?{name:ability.name}:{}),...(ability.exceptName?{exceptName:ability.exceptName}:{})};
  s.effectQueue.unshift({op:'restRetireDeployFollow',owner:player,sourceUid:selected.uid,
   to:ability.to,filter});
  const pos=api.location(s,player,selected.uid);
  const paused=api.retire(pack,s,player,pos.line,pos.slot,{by:'effect',controller:player,sourceUid:selected.uid});
  if(!paused){
   const stayed=api.location(s,player,selected.uid);
   if(stayed&&s.effectQueue[0]?.op==='restRetireDeployFollow')s.effectQueue.shift();
   else api.continueQueue(pack,s);
  }
  return true;
 }
 if(action.mode==='printUnionPeek'){
  if(ability.op!=='restUnionPeek'||!selected.ready||
   !live(api,pack,s,player,selected.uid,ability.when))
   throw Error('Union peek is not legal');
  api.noteOwnEffectRest(s,player,selected);
  selected.ready=false;
  if(pl.deck.length)s.effectQueue.unshift({op:'peekTopOrOutside',owner:player,sourceUid:selected.uid});
  api.continueQueue(pack,s);
  return true;
 }
 return false;
}

export function sharedPrintLookView(api,pack,s,viewer){
 const q=s.pending;
 if(q?.kind!=='effect-print-look'||q.player!==viewer)return null;
 const deck=s.players[viewer].deck;
 const window=deck.slice(0,q.uids.length);
 const intact=window.length===q.uids.length&&window.every((card,index)=>card.uid===q.uids[index]);
 const inspected=intact?window.map(card=>{
  const printed=api.card(pack,card);
  return {uid:card.uid,cardId:card.cardId,name:printed.name,color:printed.color||''};
 }):null;
 return {kind:q.kind,player:viewer,...(inspected?{inspected}:{})};
}
