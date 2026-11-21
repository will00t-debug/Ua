// Shared sentences used by the later UA42 prints. No title opcode.
// A deck look keeps every inspected card on the pending window. 見る stays
// private. A mill to the outside publishes every moved card. A required-energy
// cut that names the field and the raid origin never changes the hand cost.
export const SHARED_PRINT_NEXT_OPS=Object.freeze([
 'mayDrawUpTo','millShown','millShownThenRecover','optionalRetireOtherDraw',
 'recoverOutsideClause','moveOwnTraitLine','handNameOutsideMayDraw','chooseDrawOrField',
 'searchEnergyHandRemove','searchTakeNamed','retireOrRaise','retireLadder',
 'grantAttackDrawUpTo','deployHandActive','drawIfLeft'
]);
const NEXT_OPS=new Set(SHARED_PRINT_NEXT_OPS);
const NEXT_MAINS=new Set([
 'restDrawDiscard','placeHandTopBuff','restBuffAll','frontPeekOnce',
 'restReplayOnPlay','onceSelfBpImpact','restMillShown'
]);
const keys=(effect,...names)=>Object.keys(effect).length===names.length&&
 names.every(name=>Object.hasOwn(effect,name));
const text=value=>typeof value==='string'&&!!value.trim()&&value.length<=80;
const clause=item=>item&&typeof item==='object'&&!Array.isArray(item)&&(
 keys(item,'name')&&text(item.name)||
 keys(item,'name','maxEnergy')&&text(item.name)&&Number.isInteger(item.maxEnergy)&&
  item.maxEnergy>=0&&item.maxEnergy<=30||
 keys(item,'names','maxEnergy')&&Array.isArray(item.names)&&item.names.length>=2&&
  item.names.length<=3&&item.names.every(text)&&new Set(item.names).size===item.names.length&&
  Number.isInteger(item.maxEnergy)&&item.maxEnergy>=0&&item.maxEnergy<=30);

export function verifySharedPrintNextOp(effect,path,index){
 if(!effect||!NEXT_OPS.has(effect.op))return false;
 const e=effect,bad=()=>{throw Error(path+'['+index+'] invalid shared print');};
 if(e.op==='mayDrawUpTo'&&!(keys(e,'op','count')&&e.count===1))bad();
 if(e.op==='millShown'&&!(keys(e,'op','count')&&e.count===3))bad();
 if(e.op==='millShownThenRecover'&&!(keys(e,'op','count','name')&&e.count===2&&text(e.name)))bad();
 if(e.op==='optionalRetireOtherDraw'&&!(keys(e,'op','draw')&&e.draw===2))bad();
 if(e.op==='recoverOutsideClause'&&!(e.optional===true&&e.max===1&&
  Array.isArray(e.anyOf)&&e.anyOf.length>=1&&e.anyOf.length<=2&&e.anyOf.every(clause)&&
  (e.discardIfAdded===undefined||e.discardIfAdded===true)&&
  keys(e,'op','optional','max','anyOf',...(e.discardIfAdded===true?['discardIfAdded']:[]))))bad();
 if(e.op==='moveOwnTraitLine'&&!(keys(e,'op','trait')&&text(e.trait)&&!/[\/／]/.test(e.trait)))bad();
 if(e.op==='handNameOutsideMayDraw'&&!(keys(e,'op','name')&&text(e.name)))bad();
 if(e.op==='chooseDrawOrField'&&!keys(e,'op'))bad();
 if(e.op==='searchEnergyHandRemove'&&!(keys(e,'op','count','maxEnergy','color','type')&&
  e.count===4&&e.maxEnergy===3&&e.color==='red'&&e.type==='character'))bad();
 if(e.op==='searchTakeNamed'&&!(keys(e,'op','count','take','name')&&
  e.count===7&&e.take===3&&text(e.name)))bad();
 if(e.op==='retireOrRaise'&&!(keys(e,'op','bp','raised','names')&&
  e.bp===3000&&e.raised===5000&&Array.isArray(e.names)&&e.names.length===2&&
  e.names.every(text)&&new Set(e.names).size===2))bad();
 if(e.op==='retireLadder'&&!(keys(e,'op','bp','one','both','names')&&
  e.bp===2000&&e.one===4000&&e.both===5000&&Array.isArray(e.names)&&
  e.names.length===2&&e.names.every(text)&&new Set(e.names).size===2))bad();
 if(e.op==='grantAttackDrawUpTo'&&!(keys(e,'op','count')&&e.count===3))bad();
 if(e.op==='deployHandActive'&&!(keys(e,'op','type','color','energy','ap','trait','max')&&
  e.type==='character'&&e.color==='yellow'&&e.energy===3&&e.ap===1&&e.max===1&&
  text(e.trait)&&!/[\/／]/.test(e.trait)))bad();
 if(e.op==='drawIfLeft')bad();
 return true;
}

export function assertSharedPrintNextPlacement(card,name,program){
 const hit=op=>program.some(e=>e.op===op);
 const lone=op=>program.length===1&&program[0]?.op===op;
 if(hit('mayDrawUpTo')&&!(card.type==='character'&&name==='onAttack'&&lone('mayDrawUpTo')))
  throw Error(card.id+' optional attack draw is a lone character onAttack effect');
 if(hit('millShown')&&!(card.type==='field'&&name==='onPlay'&&lone('millShown')))
  throw Error(card.id+' shown mill is a lone field onPlay effect');
 if(hit('millShownThenRecover')&&!(card.type==='event'&&name==='onPlay'&&lone('millShownThenRecover')))
  throw Error(card.id+' shown mill then recovery is a lone event onPlay effect');
 if(hit('optionalRetireOtherDraw')&&!(card.type==='character'&&name==='onPlay'&&lone('optionalRetireOtherDraw')))
  throw Error(card.id+' optional retirement draw is a lone character onPlay effect');
 if(hit('recoverOutsideClause')&&!(['character','field'].includes(card.type)&&
  (name==='onPlay'||name==='onRetire')&&lone('recoverOutsideClause')))
  throw Error(card.id+' outside recovery clause is a lone play or retirement effect');
 if(hit('moveOwnTraitLine')&&!(card.type==='character'&&name==='onPlay'&&lone('moveOwnTraitLine')))
  throw Error(card.id+' trait line move is a lone character onPlay effect');
 if(hit('handNameOutsideMayDraw')&&!(card.type==='field'&&name==='onPlay'&&lone('handNameOutsideMayDraw')))
  throw Error(card.id+' named hand outside is a lone field onPlay effect');
 if(hit('chooseDrawOrField')&&!(card.type==='character'&&name==='onPlay'&&lone('chooseDrawOrField')))
  throw Error(card.id+' printed fork is a lone character onPlay effect');
 if(hit('searchEnergyHandRemove')&&!(card.type==='character'&&name==='onPlay'&&lone('searchEnergyHandRemove')))
  throw Error(card.id+' energy search is a lone character onPlay effect');
 if(hit('searchTakeNamed')&&!(card.type==='event'&&name==='onPlay'&&lone('searchTakeNamed')))
  throw Error(card.id+' named take is a lone event onPlay effect');
 if(hit('retireOrRaise')&&!(card.type==='event'&&name==='onPlay'&&lone('retireOrRaise')))
  throw Error(card.id+' raised retirement is a lone event onPlay effect');
 if(hit('retireLadder')&&!(card.type==='event'&&name==='onPlay'&&lone('retireLadder')))
  throw Error(card.id+' retirement ladder is a lone event onPlay effect');
 if(hit('grantAttackDrawUpTo')&&!(card.type==='event'&&name==='onPlay'&&lone('grantAttackDrawUpTo')))
  throw Error(card.id+' attack-draw grant is a lone event onPlay effect');
 if(hit('deployHandActive')&&!(card.type==='event'&&name==='onPlay'&&lone('deployHandActive')))
  throw Error(card.id+' active hand entry is a lone event onPlay effect');
}

export function sharedPrintNextMain(card,ability){
 if(!ability||!NEXT_MAINS.has(ability.op))return false;
 const e=ability;
 if(e.op==='restDrawDiscard'&&!(card.type==='character'&&keys(e,'op')))
  throw Error(card.id+' invalid rest draw');
 if(e.op==='placeHandTopBuff'&&!(card.type==='character'&&
  keys(e,'op','bp','oncePerTurn')&&e.bp===1000&&e.oncePerTurn===true))
  throw Error(card.id+' invalid hand-top buff');
 if(e.op==='restBuffAll'&&!(card.type==='field'&&keys(e,'op','bp')&&e.bp===500))
  throw Error(card.id+' invalid all-character buff');
 if(e.op==='frontPeekOnce'&&!(card.type==='character'&&
  keys(e,'op','oncePerTurn','frontOnly')&&e.oncePerTurn===true&&e.frontOnly===true))
  throw Error(card.id+' invalid front peek');
 if(e.op==='restReplayOnPlay'&&!(card.type==='character'&&keys(e,'op')))
  throw Error(card.id+' invalid replay main');
 if(e.op==='onceSelfBpImpact'&&!(card.type==='character'&&
  keys(e,'op','bp','impact','oncePerTurn')&&e.bp===-500&&e.impact===1&&e.oncePerTurn===true))
  throw Error(card.id+' invalid self impact main');
 if(e.op==='restMillShown'&&!(card.type==='field'&&keys(e,'op','count')&&e.count===1))
  throw Error(card.id+' invalid shown mill main');
 return true;
}

export function validateSharedPrintNextCard(card){
 const rule=card.outsideAtMost??null;
 if(rule!==null&&(card.type!=='character'||card.implementation!=='dsl'||
  rule.max!==9||!Number.isInteger(rule.energy)||rule.energy<1||rule.energy>card.energy||
  (rule.bp!==undefined&&(!Number.isInteger(rule.bp)||rule.bp>=0||rule.bp<-5000||rule.bp%500!==0))||
  Object.keys(rule).some(k=>!['max','energy','bp'].includes(k))||
  Object.keys(rule).length!==(rule.bp===undefined?2:3)))
  throw Error(card.id+' invalid field energy cut');
 const per=card.handEnergyPerFrontName??null;
 if(per!==null&&(card.type!=='event'||card.implementation!=='dsl'||
  !text(per.name)||per.amount!==1||Object.keys(per).length!==2))
  throw Error(card.id+' invalid front-name hand energy');
 const removed=card.removedByOwnEffect??null;
 if(removed!==null){
  const mill=removed.length===1&&removed[0]?.op==='millRemovedUpTo'&&removed[0].count===1&&
   Object.keys(removed[0]).length===2;
  const buff=removed.length===1&&removed[0]?.op==='buffAnyUpTo'&&removed[0].bp===1000&&
   Object.keys(removed[0]).length===2;
  const draw=removed.length===1&&removed[0]?.op==='mayDrawUpTo'&&removed[0].count===1&&
   Object.keys(removed[0]).length===2;
  const recover=removed.length===1&&removed[0]?.op==='recoverOutsideNamedEnergy'&&
   removed[0].optional===true&&typeof removed[0].name==='string'&&!!removed[0].name.trim()&&
   Number.isInteger(removed[0].maxEnergy)&&removed[0].maxEnergy>=0&&removed[0].maxEnergy<=30&&
   Object.keys(removed[0]).length===4;
  if(card.implementation!=='dsl'||!(mill||buff||draw||recover))
   throw Error(card.id+' invalid removed-area trigger');
 }
}

function open(s,pending){s.pending=pending;}
function deckIndex(pl,uid){return pl.deck.findIndex(card=>card.uid===uid);}
function matchesClause(api,pack,card,item){
 const printed=api.card(pack,card);
 if(item.names)return item.names.some(name=>api.cardHasName(printed,name,false))&&
  printed.energy<=item.maxEnergy;
 if(item.maxEnergy!==undefined&&printed.energy>item.maxEnergy)return false;
 return api.cardHasName(printed,item.name,false);
}
function recoverChoices(api,pack,pl,anyOf){
 return pl.outside.filter(card=>anyOf.some(item=>matchesClause(api,pack,card,item))).map(card=>card.uid);
}
function showMill(api,pack,s,owner,count,sourceUid){
 const moved=[];
 const pl=s.players[owner];
 for(let n=0;n<count&&pl.deck.length;n++){
  const physical=api.moveOwnedLinear(pack,s,{owner,from:'deck',to:'outside',index:0,
   reason:'own-effect',sourceUid});
  moved.push(physical);
 }
 if(moved.length)api.publishWindow(pack,s,owner,moved);
 return moved;
}
function lookWindow(pl,count){
 const cards=pl.deck.slice(0,count);
 return {cards,uids:cards.map(card=>card.uid)};
}
function nameOnField(api,pack,s,owner,name){
 return api.field(s.players[owner]).some(card=>api.printedFieldCard(card)&&
  api.cardHasName(api.card(pack,card),name,api.originalEffectsDisabled(s,card)));
}
function frontTargets(api,pack,s,owner,limit){
 return s.players[1-owner].front.filter(card=>card&&api.card(pack,card).type==='character'&&
  api.bp(pack,s,card)<=limit).map(card=>card.uid);
}

export function runSharedPrintNextJob(api,pack,s,job){
 if(job.op==='drawIfLeft'){
  const left=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===job.leftUid&&
   e.reason==='retirement'&&(e.to==='outside'||e.to==='removed'));
  if(left)api.draw(pack,s,job.owner,job.count,{reason:'own-effect',sourceUid:job.sourceUid});
  return true;
 }
 if(!NEXT_OPS.has(job.op)&&job.op!=='millRemovedUpTo'&&job.op!=='buffAnyUpTo')return false;
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='mayDrawUpTo'){
  if(job.grant===true){
   const loc=api.location(s,owner,job.sourceUid);
   if(loc?.c?.attackDrawUpTo)loc.c.attackDrawUpTo.used=true;
  }
  if(pl.deck.length)open(s,{kind:'effect-next',mode:'draw',player:owner,
   sourceUid:job.sourceUid,count:job.count,drawn:0});
  return true;
 }
 if(job.op==='millShown'){showMill(api,pack,s,owner,job.count,job.sourceUid);return true;}
 if(job.op==='millShownThenRecover'){
  showMill(api,pack,s,owner,job.count,job.sourceUid);
  const choices=recoverChoices(api,pack,pl,[{name:job.name}]);
  if(choices.length)open(s,{kind:'effect-next',mode:'recover',player:owner,
   sourceUid:job.sourceUid,choices,optional:true,discardIfAdded:false});
  return true;
 }
 if(job.op==='optionalRetireOtherDraw'){
  const choices=api.field(pl).filter(card=>card.uid!==job.sourceUid&&
   api.card(pack,card).type==='character').map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-next',mode:'retireOther',player:owner,
   sourceUid:job.sourceUid,choices,draw:job.draw});
  return true;
 }
 if(job.op==='recoverOutsideClause'){
  const choices=recoverChoices(api,pack,pl,job.anyOf);
  if(choices.length)open(s,{kind:'effect-next',mode:'recover',player:owner,
   sourceUid:job.sourceUid,choices,optional:true,discardIfAdded:job.discardIfAdded===true});
  return true;
 }
 if(job.op==='moveOwnTraitLine'){
  const choices=api.field(pl).filter(card=>api.card(pack,card).type==='character'&&
   api.cardHasTrait(api.card(pack,card),job.trait)).map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-next',mode:'moveTrait',player:owner,
   sourceUid:job.sourceUid,choices,trait:job.trait,optional:true});
  return true;
 }
 if(job.op==='handNameOutsideMayDraw'){
  const choices=pl.hand.filter(card=>api.cardHasName(api.card(pack,card),job.name,false))
   .map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-next',mode:'handOutside',player:owner,
   sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='chooseDrawOrField'){
  open(s,{kind:'effect-next',mode:'fork',player:owner,sourceUid:job.sourceUid});
  return true;
 }
 if(job.op==='searchEnergyHandRemove'||job.op==='searchTakeNamed'){
  const window=lookWindow(pl,job.count);
  if(!window.uids.length)return true;
  const choices=window.cards.filter(card=>{
   const printed=api.card(pack,card);
   if(job.op==='searchTakeNamed')return api.cardHasName(printed,job.name,false);
   return printed.type===job.type&&printed.color===job.color&&printed.energy<=job.maxEnergy;
  }).map(card=>card.uid);
  open(s,{kind:'effect-next',mode:'look',player:owner,sourceUid:job.sourceUid,
   uids:window.uids,choices,take:job.op==='searchTakeNamed'?job.take:1,
   selected:[],thenRemove:job.op==='searchEnergyHandRemove'});
  return true;
 }
 if(job.op==='retireOrRaise'||job.op==='retireLadder'){
  const present=job.names.filter(name=>nameOnField(api,pack,s,owner,name)).length;
  const limit=job.op==='retireOrRaise'?(present?job.raised:job.bp):
   present>=2?job.both:present===1?job.one:job.bp;
  const choices=frontTargets(api,pack,s,owner,limit);
  if(choices.length)open(s,{kind:'effect-next',mode:'retireFront',player:owner,
   sourceUid:job.sourceUid,choices,optional:false,limit});
  return true;
 }
 if(job.op==='grantAttackDrawUpTo'){
  const choices=api.field(pl).filter(card=>api.card(pack,card).type==='character')
   .map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-next',mode:'grantDraw',player:owner,
   sourceUid:job.sourceUid,choices,count:job.count});
  return true;
 }
 if(job.op==='deployHandActive'){
  const choices=pl.hand.filter(card=>{
   const printed=api.card(pack,card);
   return printed.type===job.type&&printed.color===job.color&&printed.energy<=job.energy&&
    printed.ap===job.ap&&api.cardHasTrait(printed,job.trait);
  }).map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-next',mode:'handActive',player:owner,
   sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='millRemovedUpTo'){
  if(pl.deck.length)open(s,{kind:'effect-next',mode:'millRemoved',player:owner,
   sourceUid:job.sourceUid,optional:true});
  return true;
 }
 if(job.op==='buffAnyUpTo'){
  const choices=api.field(pl).filter(card=>api.card(pack,card).type==='character')
   .map(card=>card.uid);
  if(choices.length)open(s,{kind:'effect-next',mode:'buffAny',player:owner,
   sourceUid:job.sourceUid,choices,bp:job.bp,optional:true});
  return true;
 }
 return false;
}

function finish(s,pack){s.pending=null;apiContinue(pack,s);}
let apiContinue=null;
function takeHand(api,pack,s,owner,uid,sourceUid){
 const pl=s.players[owner];
 const index=deckIndex(pl,uid);
 if(index<0)throw Error('Looked card left the window');
 const physical=api.moveOwnedLinear(pack,s,{owner,from:'deck',to:'hand',index,
  reason:'own-effect',sourceUid});
 api.publishAdded(pack,s,owner,physical);
 return physical;
}
function orderRest(api,pack,s,q){
 if(!q.taken){
  for(const uid of q.selected)takeHand(api,pack,s,q.player,uid,q.sourceUid);
  q={...q,taken:true};
 }
 const left=q.uids.filter(uid=>!q.selected.includes(uid)&&deckIndex(s.players[q.player],uid)>=0);
 if(left.length<=1){
  if(left.length===1){
   const pl=s.players[q.player];
   const index=deckIndex(pl,left[0]);
   const physical=pl.deck.splice(index,1)[0];
   pl.deck.push(physical);
  }
  if(q.thenRemove&&q.selected.length&&s.players[q.player].hand.length){
   s.pending={kind:'effect-next',mode:'removeHand',player:q.player,
    sourceUid:q.sourceUid,choices:s.players[q.player].hand.map(card=>card.uid)};
   return;
  }
  finish(s,pack);
  return;
 }
 s.pending={kind:'effect-next',mode:'order',player:q.player,sourceUid:q.sourceUid,
  uids:left,selected:q.selected,thenRemove:q.thenRemove,taken:true};
}
function emptyCells(api,pl){
 return ['front','energy'].flatMap(line=>api.legalDestinations(pl,line)
  .filter(dest=>!dest.replaceUid).map(dest=>({line,slot:dest.slot})));
}

export function legalSharedPrintNextPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-next')return null;
 const pl=s.players[q.player];
 if(q.mode==='draw')return [
  {type:'nextPrint',mode:'done'},
  ...(pl.deck.length&&q.drawn<q.count?[{type:'nextPrint',mode:'draw'}]:[])
 ];
 if(q.mode==='millRemoved')return [
  {type:'nextPrint',mode:'skip'},
  ...(pl.deck.length?[{type:'nextPrint',mode:'mill'}]:[])
 ];
 if(q.mode==='topBuff')return q.choices.map(uid=>({type:'nextPrint',mode:'top',uid}));
 if(q.mode==='recover'||q.mode==='retireOther'||q.mode==='moveTrait'||
  q.mode==='handOutside'||q.mode==='handActive'||q.mode==='buffAny'){
  const skip=q.optional===true?[{type:'nextPrint',mode:'skip'}]:[];
  return [...skip,...(q.choices||[]).map(uid=>({type:'nextPrint',mode:'pick',uid}))];
 }
 if(q.mode==='fork')return [
  {type:'nextPrint',mode:'drawDiscard'},
  {type:'nextPrint',mode:'field'}
 ];
 if(q.mode==='retireField')return [
  {type:'nextPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'nextPrint',mode:'pick',uid}))
 ];
 if(q.mode==='look')return [
  {type:'nextPrint',mode:'done'},
  ...q.choices.filter(uid=>!q.selected.includes(uid)&&deckIndex(pl,uid)>=0)
   .map(uid=>({type:'nextPrint',mode:'take',uid}))
 ];
 if(q.mode==='order')return q.uids.map(uid=>({type:'nextPrint',mode:'bottom',uid}));
 if(q.mode==='removeHand')return q.choices.map(uid=>({type:'nextPrint',mode:'remove',uid}));
 if(q.mode==='retireFront'||q.mode==='grantDraw')
  return q.choices.map(uid=>({type:'nextPrint',mode:'pick',uid}));
 if(q.mode==='cell'||q.mode==='enter')return q.cells.map(cell=>({type:'nextPrint',mode:'cell',...cell}));
 if(q.mode==='clear')return [
  ...(q.optional?[{type:'nextPrint',mode:'skip'}]:[]),
  ...q.choices.map(uid=>({type:'nextPrint',mode:'clear',uid}))
 ];
 return null;
}

export function resolveSharedPrintNextPending(api,pack,s,action){
 apiContinue=api.continueQueue;
 const q=s.pending;
 if(q?.kind!=='effect-next')return false;
 if(action.type!=='nextPrint')throw Error('Illegal shared choice');
 const owner=q.player,pl=s.players[owner];
 if(q.mode==='draw'){
  if(action.mode==='draw'){
   if(!pl.deck.length||q.drawn>=q.count)throw Error('Optional draw has no card');
   api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
   const drawn=q.drawn+1;
   if(drawn>=q.count||!pl.deck.length)finish(s,pack);
   else s.pending={...q,drawn};
  }else if(action.mode==='done')finish(s,pack);
  else throw Error('Illegal optional draw');
  return true;
 }
 if(q.mode==='recover'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  if(action.mode!=='pick'||index<0||!q.choices.includes(action.uid))
   throw Error('Illegal outside recovery');
  api.moveOwnedLinear(pack,s,{owner,from:'outside',to:'hand',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  if(q.discardIfAdded&&pl.hand.length)
   s.pending={kind:'effect-discard',player:owner,sourceUid:q.sourceUid};
  else finish(s,pack);
  return true;
 }
 if(q.mode==='retireOther'||q.mode==='retireField'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))
   throw Error('Illegal retirement');
  s.pending=null;
  api.retire(pack,s,owner,loc.line,loc.slot,{by:'self',controller:owner,sourceUid:q.sourceUid});
  s.effectQueue.unshift({op:'drawIfLeft',owner,sourceUid:q.sourceUid,
   leftUid:action.uid,count:q.draw||1});
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='moveTrait'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))
   throw Error('Illegal line move');
  const line=loc.line==='front'?'energy':'front';
  const openSlots=api.legalDestinations(pl,line).filter(dest=>!dest.replaceUid);
  if(openSlots.length){
   s.pending={kind:'effect-next',mode:'cell',player:owner,sourceUid:q.sourceUid,
    moveUid:action.uid,cells:openSlots.map(slot=>({line,slot:slot.slot}))};
   return true;
  }
  const blocking=pl[line].filter(Boolean).map(card=>card.uid);
  s.pending={kind:'effect-next',mode:'clear',player:owner,sourceUid:q.sourceUid,
   moveUid:action.uid,line,choices:blocking};
  return true;
 }
 if(q.mode==='cell'){
  const cell=q.cells.find(item=>item.line===action.line&&item.slot===action.slot);
  const loc=api.location(s,owner,q.moveUid);
  if(action.mode!=='cell'||!cell||!loc||pl[cell.line][cell.slot])
   throw Error('Illegal destination');
  s.pending=null;
  api.moveBetweenLines(pack,s,owner,loc.line,loc.slot,cell.line,cell.slot,q.sourceUid);
  api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='clear'){
  if(action.mode==='skip'&&q.optional){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  const mover=api.location(s,owner,q.moveUid);
  if(action.mode!=='clear'||!loc||loc.line!==q.line||!q.choices.includes(action.uid)||!mover)
   throw Error('Illegal full-line removal');
  const slot=loc.slot;
  s.pending=null;
  api.removeOwnToRemoved(pack,s,owner,loc.line,slot,q.sourceUid);
  const after=api.location(s,owner,q.moveUid);
  if(after&&!pl[q.line][slot])
   api.moveBetweenLines(pack,s,owner,after.line,after.slot,q.line,slot,q.sourceUid);
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='handOutside'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(action.mode!=='pick'||index<0||!q.choices.includes(action.uid))
   throw Error('Illegal hand card');
  api.moveOwnedLinear(pack,s,{owner,from:'hand',to:'outside',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  if(pl.deck.length)s.pending={kind:'effect-next',mode:'draw',player:owner,
   sourceUid:q.sourceUid,count:1,drawn:0};
  else finish(s,pack);
  return true;
 }
 if(q.mode==='fork'){
  if(action.mode==='drawDiscard'){
   s.pending=null;
   s.effectQueue.unshift({op:'drawDiscard',owner,sourceUid:q.sourceUid,count:1});
   api.continueQueue(pack,s);
   return true;
  }
  if(action.mode!=='field')throw Error('Illegal printed fork');
  const choices=pl.energy.filter(card=>card&&api.card(pack,card).type==='field').map(card=>card.uid);
  if(!choices.length){finish(s,pack);return true;}
  s.pending={kind:'effect-next',mode:'retireField',player:owner,sourceUid:q.sourceUid,
   choices,draw:1};
  return true;
 }
 if(q.mode==='look'){
  if(action.mode==='take'){
   if(q.selected.length>=q.take||!q.choices.includes(action.uid)||deckIndex(pl,action.uid)<0)
    throw Error('Illegal looked card');
   const selected=[...q.selected,action.uid];
   const next={...q,selected};
   if(selected.length>=q.take){s.pending=next;orderRest(api,pack,s,next);}
   else s.pending=next;
   return true;
  }
  if(action.mode!=='done')throw Error('Illegal looked card');
  orderRest(api,pack,s,q);
  return true;
 }
 if(q.mode==='order'){
  if(action.mode!=='bottom'||!q.uids.includes(action.uid))throw Error('Illegal bottom order');
  const index=deckIndex(pl,action.uid);
  if(index<0)throw Error('Ordered card left the window');
  const physical=pl.deck.splice(index,1)[0];
  pl.deck.push(physical);
  const uids=q.uids.filter(uid=>uid!==action.uid);
  orderRest(api,pack,s,{...q,uids});
  return true;
 }
 if(q.mode==='removeHand'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  if(action.mode!=='remove'||index<0||!q.choices.includes(action.uid))
   throw Error('Illegal hand removal');
  api.moveOwnedLinear(pack,s,{owner,from:'hand',to:'removed',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  finish(s,pack);
  return true;
 }
 if(q.mode==='retireFront'){
  const foe=1-owner;
  const slot=s.players[foe].front.findIndex(card=>card?.uid===action.uid);
  if(action.mode!=='pick'||slot<0||!q.choices.includes(action.uid))
   throw Error('Illegal front retirement');
  s.pending=null;
  api.retire(pack,s,foe,'front',slot,{by:'opponent',controller:owner,sourceUid:q.sourceUid});
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='grantDraw'){
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid)||
   !Number.isInteger(loc.c.fieldEntryStamp))
   throw Error('Illegal attack-draw grant');
  loc.c.attackDrawUpTo={turn:s.turn,stamp:loc.c.fieldEntryStamp,count:q.count,used:false};
  finish(s,pack);
  return true;
 }
 if(q.mode==='handActive'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  if(action.mode!=='pick'||!q.choices.includes(action.uid)||
   !pl.hand.some(card=>card.uid===action.uid))
   throw Error('Illegal active entry');
  const cells=emptyCells(api,pl);
  if(!cells.length){finish(s,pack);return true;}
  s.pending={kind:'effect-next',mode:'enter',player:owner,sourceUid:q.sourceUid,
   uid:action.uid,cells};
  return true;
 }
 if(q.mode==='enter'){
  const cell=q.cells.find(item=>item.line===action.line&&item.slot===action.slot);
  if(action.mode!=='cell'||!cell||!pl.hand.some(card=>card.uid===q.uid)||pl[cell.line][cell.slot])
   throw Error('Illegal active entry');
  s.pending=null;
  api.effectEnter(pack,s,{owner,from:'hand',uid:q.uid,line:cell.line,slot:cell.slot,
   ready:true,sourceUid:q.sourceUid});
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='millRemoved'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  if(action.mode!=='mill'||!pl.deck.length)throw Error('Illegal removed mill');
  const physical=api.moveOwnedLinear(pack,s,{owner,from:'deck',to:'removed',index:0,
   reason:'own-effect',sourceUid:q.sourceUid});
  api.publishWindow(pack,s,owner,[physical]);
  finish(s,pack);
  return true;
 }
 if(q.mode==='topBuff'){
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  const loc=api.location(s,owner,q.sourceUid);
  if(action.mode!=='top'||index<0||!q.choices.includes(action.uid)||!loc)
   throw Error('Illegal deck-top card');
  const physical=pl.hand.splice(index,1)[0];
  pl.deck.unshift(physical);
  loc.c.buffs??=[];
  loc.c.buffs.push({bp:q.bp,untilTurn:s.turn});
  finish(s,pack);
  return true;
 }
 if(q.mode==='buffAny'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))
   throw Error('Illegal character buff');
  loc.c.buffs??=[];
  loc.c.buffs.push({bp:q.bp,untilTurn:s.turn});
  finish(s,pack);
  return true;
 }
 throw Error('Illegal shared choice');
}

function liveMain(api,pack,s,card){
 return !api.originalEffectsDisabled(s,card)&&api.raidBoxTextLive(pack,card,'main');
}
function rest(api,s,player,card){
 api.noteOwnEffectRest(s,player,card);
 card.ready=false;
}

export function legalSharedPrintNextActivations(api,pack,s,player){
 if(s.phase!=='main')return [];
 const out=[];
 for(const card of api.field(s.players[player])){
  if(!liveMain(api,pack,s,card))continue;
  const ability=api.card(pack,card).mainAbility;
  if(!ability||!NEXT_MAINS.has(ability.op))continue;
  const used=s.mainAbilityUsedUids.includes(card.uid);
  if(ability.op==='restDrawDiscard'&&card.ready)
   out.push({type:'activate',uid:card.uid,mode:'restDrawDiscard'});
  if(ability.op==='placeHandTopBuff'&&!used&&s.players[player].hand.length)
   out.push({type:'activate',uid:card.uid,mode:'placeHandTopBuff'});
  if(ability.op==='restBuffAll'&&card.ready)
   out.push({type:'activate',uid:card.uid,mode:'restBuffAll'});
  if(ability.op==='frontPeekOnce'&&!used&&api.location(s,player,card.uid)?.line==='front'&&
   s.players[player].deck.length)
   out.push({type:'activate',uid:card.uid,mode:'frontPeekOnce'});
  if(ability.op==='restReplayOnPlay'&&card.ready&&
   api.effectiveRequiredEnergy(pack,s,card)>=1)
   out.push({type:'activate',uid:card.uid,mode:'restReplayOnPlay'});
  if(ability.op==='onceSelfBpImpact'&&!used)
   out.push({type:'activate',uid:card.uid,mode:'onceSelfBpImpact'});
  if(ability.op==='restMillShown'&&card.ready)
   out.push({type:'activate',uid:card.uid,mode:'restMillShown'});
 }
 return out;
}

export function activateSharedPrintNext(api,pack,s,action){
 if(action.type!=='activate'||typeof action.mode!=='string'||!NEXT_MAINS.has(action.mode))
  return false;
 const loc=api.location(s,s.active,action.uid);
 const ability=loc&&api.card(pack,loc.c).mainAbility;
 if(!loc||!liveMain(api,pack,s,loc.c)||ability?.op!==action.mode)
  throw Error('Shared main is not legal');
 const card=loc.c,player=s.active,pl=s.players[player];
 if(action.mode==='restDrawDiscard'){
  if(!card.ready)throw Error('Rest draw needs a ready card');
  rest(api,s,player,card);
  s.effectQueue.unshift({op:'drawDiscard',owner:player,sourceUid:card.uid,count:1});
  api.continueQueue(pack,s);
  return true;
 }
 if(action.mode==='placeHandTopBuff'){
  if(s.mainAbilityUsedUids.includes(card.uid)||!pl.hand.length)
   throw Error('Hand-top buff is not legal');
  s.mainAbilityUsedUids.push(card.uid);
  s.pending={kind:'effect-next',mode:'topBuff',player,sourceUid:card.uid,
   choices:pl.hand.map(item=>item.uid),bp:ability.bp};
  return true;
 }
 if(action.mode==='restBuffAll'){
  if(!card.ready)throw Error('Field buff needs a ready field');
  rest(api,s,player,card);
  for(const ally of api.field(pl))if(api.card(pack,ally).type==='character'){
   ally.buffs??=[];
   ally.buffs.push({bp:ability.bp,untilTurn:s.turn});
  }
  return true;
 }
 if(action.mode==='frontPeekOnce'){
  if(s.mainAbilityUsedUids.includes(card.uid)||loc.line!=='front'||!pl.deck.length)
   throw Error('Front peek is not legal');
  s.mainAbilityUsedUids.push(card.uid);
  s.effectQueue.unshift({op:'peekTopOrBottom',owner:player,sourceUid:card.uid});
  api.continueQueue(pack,s);
  return true;
 }
 if(action.mode==='restReplayOnPlay'){
  if(!card.ready||api.effectiveRequiredEnergy(pack,s,card)<1)
   throw Error('Replay needs required energy of at least 1');
  rest(api,s,player,card);
  s.effectQueue.unshift({op:'replayOnPlay',owner:player,sourceUid:card.uid});
  api.continueQueue(pack,s);
  return true;
 }
 if(action.mode==='onceSelfBpImpact'){
  if(s.mainAbilityUsedUids.includes(card.uid)||!Number.isInteger(card.fieldEntryStamp))
   throw Error('Self impact is not legal');
  s.mainAbilityUsedUids.push(card.uid);
  card.buffs??=[];
  card.buffs.push({bp:ability.bp,untilTurn:s.turn});
  card.impactGranted={turn:s.turn,stamp:card.fieldEntryStamp,amount:ability.impact};
  return true;
 }
 if(action.mode==='restMillShown'){
  if(!card.ready)throw Error('Shown mill needs a ready field');
  rest(api,s,player,card);
  showMill(api,pack,s,player,ability.count,card.uid);
  return true;
 }
 return false;
}
