// Shared sentences for 学園アイドルマスター that no existing op prints.
// No card-id opcode. A listed raid-frame feature stays closed until that
// physical card is a face-up Raid. Look windows keep every inspected card.
import {cardCountsAsEvent,cardHasName} from './field-conditions.mjs';

const OPS=new Set([
 'gimActiveBuffBoth','gimOutsideEntry','gimBounceFront','gimRetireEvents',
 'gimLookTop','gimBuffAllImpact','gimBuffDamageName','gimBuffDuration',
 'gimRetireScale','gimRetireNames','gimRetireXor','gimLookTake','gimLookNames'
]);
export const GIM_FINISH_OPS=Object.freeze([...OPS]);

function keys(e,...allowed){
 const found=Object.keys(e);
 return found.length===allowed.length&&found.every(k=>allowed.includes(k));
}
function text(v){return typeof v==='string'&&!!v.trim()&&v.length<=80&&v===v.trim();}
function names(v,n){
 return Array.isArray(v)&&v.length===n&&new Set(v).size===n&&v.every(text);
}
function bpStep(v){return Number.isInteger(v)&&v>=500&&v<=50000&&v%500===0;}

export function verifyGimFinishOp(e){
 if(!e||!OPS.has(e.op))return false;
 if(e.op==='gimActiveBuffBoth'&&!(e.optional===true&&e.maxPrintedBp===2500&&e.bp===1500&&
  keys(e,'op','optional','maxPrintedBp','bp')))throw Error('Invalid paired active buff');
 if(e.op==='gimOutsideEntry'&&!(typeof e.optional==='boolean'&&e.color==='blue'&&
  e.ap===1&&e.maxEnergy===3&&keys(e,'op','optional','color','ap','maxEnergy')))
  throw Error('Invalid outside color entry');
 if(e.op==='gimBounceFront'&&!(e.optional===true&&keys(e,'op','optional')))
  throw Error('Invalid front return');
 if(e.op==='gimRetireEvents'&&!(e.optional===true&&e.base===3000&&e.step===500&&
  text(e.name)&&keys(e,'op','optional','base','step','name')))
  throw Error('Invalid event-scaled retirement');
 if(e.op==='gimLookTop'&&!(e.count===3&&keys(e,'op','count')))
  throw Error('Invalid top arrangement');
 if(e.op==='gimBuffAllImpact'&&!(e.maxPrintedBp===2500&&e.bp===1500&&
  keys(e,'op','maxPrintedBp','bp')))throw Error('Invalid printed buff and impact');
 if(e.op==='gimBuffDamageName'&&!(e.bp===2500&&e.plus===1&&text(e.name)&&
  keys(e,'op','bp','plus','name')))throw Error('Invalid named damage buff');
 if(e.op==='gimBuffDuration'&&!(e.bp===2000&&names(e.names,2)&&
  keys(e,'op','bp','names')))throw Error('Invalid duration buff');
 if(e.op==='gimRetireScale'&&!(e.optional===false&&e.per===1000&&e.maxPrintedBp===2500&&
  keys(e,'op','optional','per','maxPrintedBp')))throw Error('Invalid printed-count retirement');
 if(e.op==='gimRetireNames'&&!(e.optional===false&&e.base===3000&&e.raised===5000&&
  e.min===3&&names(e.names,3)&&keys(e,'op','optional','base','raised','min','names')))
  throw Error('Invalid name-total retirement');
 if(e.op==='gimRetireXor'&&!(e.optional===false&&e.base===3000&&e.one===4000&&
  e.both===5000&&names(e.names,2)&&keys(e,'op','optional','base','one','both','names')))
  throw Error('Invalid exclusive-name retirement');
 if(e.op==='gimLookTake'&&!(e.count===3&&e.take===2&&keys(e,'op','count','take')))
  throw Error('Invalid exact take');
 if(e.op==='gimLookNames'&&!(e.count===6&&names(e.names,3)&&keys(e,'op','count','names')))
  throw Error('Invalid named take');
 return true;
}

const MAINS=new Set([
 'gimPayReplay','gimNamedDamage','gimFrontPeek','gimBpFork','gimFieldDraw',
 'gimActiveMain','gimRestBuff'
]);
export function gimFinishMain(card,ability){
 if(!ability||!MAINS.has(ability.op))return false;
 if(ability.op==='gimPayReplay'&&!(card?.type==='character'&&ability.oncePerTurn===true&&
  ability.frontOnly===true&&ability.discard===1&&keys(ability,'op','oncePerTurn','frontOnly','discard')))
  throw Error(card?.id+' invalid replay main');
 if(ability.op==='gimNamedDamage'&&!(card?.type==='character'&&ability.oncePerTurn===true&&
  ability.frontOnly===true&&ability.discard===1&&ability.minBp===5000&&names(ability.names,3)&&
  keys(ability,'op','oncePerTurn','frontOnly','discard','minBp','names')))
  throw Error(card?.id+' invalid damage main');
 if(ability.op==='gimFrontPeek'&&!(card?.type==='character'&&ability.oncePerTurn===true&&
  ability.frontOnly===true&&keys(ability,'op','oncePerTurn','frontOnly')))
  throw Error(card?.id+' invalid peek main');
 if(ability.op==='gimBpFork'&&!(card?.type==='character'&&ability.oncePerTurn===true&&
  ability.minBp===5000&&keys(ability,'op','oncePerTurn','minBp')))
  throw Error(card?.id+' invalid fork main');
 if(ability.op==='gimFieldDraw'&&!(card?.type==='field'&&ability.oncePerTurn===true&&
  ability.minBp===5000&&keys(ability,'op','oncePerTurn','minBp')))
  throw Error(card?.id+' invalid field draw main');
 if(ability.op==='gimActiveMain'&&!(card?.type==='character'&&ability.oncePerTurn===true&&
  ability.frontOnly===true&&keys(ability,'op','oncePerTurn','frontOnly')))
  throw Error(card?.id+' invalid activate-main');
 if(ability.op==='gimRestBuff'&&!(card?.type==='character'&&keys(ability,'op')))
  throw Error(card?.id+' invalid rest buff main');
 return true;
}

function programs(printed){
 return [...(printed?.effects?.onPlay||[]),...(printed?.effects?.onAttack||[])];
}
function hasOp(printed,op){
 return programs(printed).some(e=>e.op===op)||printed?.mainAbility?.op===op;
}
export function validateGimFinishCard(card){
 const effects=card.effects||{};
 for(const [timing,program] of Object.entries(effects)){
  for(const e of program||[]){
   if(!OPS.has(e?.op))continue;
   const character=card.type==='character'&&timing==='onPlay';
   const event=card.type==='event'&&timing==='onPlay';
   const characterOp=e.op==='gimActiveBuffBoth'||e.op==='gimBounceFront'||
    e.op==='gimRetireEvents'||e.op==='gimLookTop'||
    (e.op==='gimOutsideEntry'&&e.optional===true);
   const eventOp=e.op==='gimBuffAllImpact'||e.op==='gimBuffDamageName'||
    e.op==='gimBuffDuration'||e.op==='gimRetireScale'||e.op==='gimRetireNames'||
    e.op==='gimRetireXor'||e.op==='gimLookTake'||e.op==='gimLookNames'||
    (e.op==='gimOutsideEntry'&&e.optional===false);
   if(characterOp!==character||eventOp!==event)
    throw Error(card.id+' Gakuen Idolmaster sentence is on the wrong card');
  }
 }
}

function fieldCards(pl){return [...pl.front,...pl.energy].filter(Boolean);}
function sourceOf(pl,uid){
 return fieldCards(pl).find(c=>c.uid===uid)||
  pl.outside.find(c=>c.uid===uid)||
  (pl.resolvingEvents||[]).find(c=>c.uid===uid)||null;
}
function eventsUsed(s,owner,printed){
 return (s.zoneMoveEvents||[]).filter(e=>{
  if(e.turn!==s.turn||e.owner!==owner||e.controller!==owner||
   e.from!=='hand'||e.reason!=='rule')return false;
  const d=printed({uid:e.uid,cardId:e.cardId});
  if(!cardCountsAsEvent(d))return false;
  if(e.to==='outside')return true;
  return d.alsoEvent===true&&(e.to==='front'||e.to==='energy');
 }).length;
}
function liveNamed(api,pack,s,pl,name){
 return fieldCards(pl).some(c=>!c.faceDown&&
  cardHasName(api.card(pack,c),name,api.originalEffectsDisabled(s,c)));
}
function countNamed(api,pack,s,pl,names){
 return fieldCards(pl).filter(c=>!c.faceDown&&names.some(name=>
  cardHasName(api.card(pack,c),name,api.originalEffectsDisabled(s,c)))).length;
}
function printedLow(api,pack,pl,max){
 return fieldCards(pl).filter(c=>!c.faceDown&&api.card(pack,c).type==='character'&&
  api.card(pack,c).bp<=max).length;
}
function retireLimit(api,pack,s,owner,job){
 const pl=s.players[owner];
 if(job.op==='gimRetireScale')return printedLow(api,pack,pl,job.maxPrintedBp)*job.per;
 if(job.op==='gimRetireNames')
  return countNamed(api,pack,s,pl,job.names)>=job.min?job.raised:job.base;
 if(job.op==='gimRetireXor'){
  const hits=job.names.filter(name=>liveNamed(api,pack,s,pl,name)).length;
  return hits>=2?job.both:hits===1?job.one:job.base;
 }
 if(job.op==='gimRetireEvents'){
  const extra=liveNamed(api,pack,s,pl,job.name)?
   eventsUsed(s,owner,c=>api.card(pack,c))*job.step:0;
  return job.base+extra;
 }
 return 0;
}
function frontTargets(api,pack,s,owner,limit){
 return s.players[1-owner].front.filter(c=>c&&api.card(pack,c).type==='character'&&
  api.bp(pack,s,c)<=limit).map(c=>c.uid);
}
function matchingOutside(api,pack,pl,job){
 return pl.outside.filter(c=>{
  const d=api.card(pack,c);
  return d.type==='character'&&d.color===job.color&&d.ap===job.ap&&d.energy<=job.maxEnergy;
 });
}
function ask(s,data){s.pending={kind:'effect-gim-finish',...data};}
function hasMain(api,pack,s,c){
 if(!c||c.faceDown||api.originalEffectsDisabled(s,c))return false;
 const d=api.card(pack,c);
 if(!d.mainAbility&&!(d.printedMains||[]).length)return false;
 return api.raidBoxTextLive(pack,c,'main');
}

function openLook(s,owner,job,deck){
 const uids=deck.slice(0,Math.min(job.count,deck.length)).map(c=>c.uid);
 if(!uids.length)return;
 const take=job.op==='gimLookTake';
 const named=job.op==='gimLookNames';
 ask(s,{player:owner,sourceUid:job.sourceUid,op:job.op,
  mode:take?'take':named?'names':'top',uids,taken:[],takenNames:[],bottom:[],
  ...(take?{need:job.take}:{}),...(named?{names:[...job.names]}:{})});
}
function remaining(q){
 return q.uids.filter(uid=>!q.taken.includes(uid)&&uid!==q.topUid&&!q.bottom.includes(uid));
}
function selectable(api,pack,pl,q){
 return remaining(q).filter(uid=>{
  if(q.mode!=='names')return true;
  const card=pl.deck.find(c=>c.uid===uid);
  const name=card&&api.card(pack,card).name;
  return q.names.includes(name)&&!q.takenNames.includes(name);
 });
}

export function gimEventReady(api,pack,s,owner,job){
 if(!OPS.has(job?.op))return null;
 const pl=s.players[owner];
 if(job.op==='gimOutsideEntry'){
  if(job.optional===true)return null;
  return matchingOutside(api,pack,pl,job).length>0;
 }
 if(job.op==='gimBuffAllImpact')
  return pl.front.some(c=>c&&api.card(pack,c).type==='character');
 if(job.op==='gimBuffDamageName'||job.op==='gimBuffDuration')
  return fieldCards(pl).some(c=>api.card(pack,c).type==='character');
 if(job.op==='gimRetireScale'||job.op==='gimRetireNames'||job.op==='gimRetireXor'){
  const limit=retireLimit(api,pack,s,owner,job);
  return frontTargets(api,pack,s,owner,limit).length>0;
 }
 if(job.op==='gimLookTake')return pl.deck.length>=job.count;
 return null;
}

export function runGimFinishJob(api,pack,s,job){
 if(!OPS.has(job?.op))return false;
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='gimActiveBuffBoth'){
  const loc=api.location(s,owner,job.sourceUid);
  const choices=loc?fieldCards(pl).filter(c=>c.uid!==job.sourceUid&&!c.faceDown&&
   api.card(pack,c).type==='character'&&api.card(pack,c).bp<=job.maxPrintedBp)
   .map(c=>c.uid):[];
  if(loc&&choices.length)ask(s,{player:owner,sourceUid:job.sourceUid,
   sourceStamp:loc.c.fieldEntryStamp,op:job.op,mode:'activeBuff',choices,
   bp:job.bp,optional:true});
  return true;
 }
 if(job.op==='gimOutsideEntry'){
  const choices=matchingOutside(api,pack,pl,job).map(c=>c.uid);
  if(!choices.length)return true;
  s.pending={kind:'effect-printed-rest-raid',player:owner,sourceUid:job.sourceUid,
   choices,zones:['outside'],optional:job.optional===true,entryReady:false,
   impactFromRemove:0,name:null,color:job.color,ap:job.ap,maxEnergy:job.maxEnergy,
   meetEnergy:false,then:[]};
  return true;
 }
 if(job.op==='gimBounceFront'){
  const choices=s.players[1-owner].front.filter(c=>c&&api.card(pack,c).type==='character')
   .map(c=>c.uid);
  if(choices.length)ask(s,{player:owner,sourceUid:job.sourceUid,op:job.op,
   mode:'bounce',choices,optional:true});
  return true;
 }
 if(job.op==='gimRetireEvents'||job.op==='gimRetireScale'||
  job.op==='gimRetireNames'||job.op==='gimRetireXor'){
  const limit=retireLimit(api,pack,s,owner,job);
  const choices=frontTargets(api,pack,s,owner,limit);
  if(choices.length)ask(s,{player:owner,sourceUid:job.sourceUid,op:job.op,
   mode:'retire',choices,limit,optional:job.optional===true});
  return true;
 }
 if(job.op==='gimLookTop'||job.op==='gimLookTake'||job.op==='gimLookNames'){
  openLook(s,owner,job,pl.deck);
  return true;
 }
 if(job.op==='gimBuffAllImpact'){
  for(const c of fieldCards(pl)){
   if(c.faceDown||api.card(pack,c).type!=='character'||api.card(pack,c).bp>job.maxPrintedBp)continue;
   c.buffs??=[];
   c.buffs.push({bp:job.bp,untilTurn:s.turn});
  }
  const choices=pl.front.filter(c=>c&&api.card(pack,c).type==='character').map(c=>c.uid);
  if(choices.length)ask(s,{player:owner,sourceUid:job.sourceUid,op:job.op,
   mode:'impact',choices,optional:false});
  return true;
 }
 if(job.op==='gimBuffDamageName'||job.op==='gimBuffDuration'){
  const choices=fieldCards(pl).filter(c=>api.card(pack,c).type==='character').map(c=>c.uid);
  if(choices.length)ask(s,{player:owner,sourceUid:job.sourceUid,op:job.op,
   mode:job.op==='gimBuffDamageName'?'damageBuff':'duration',choices,optional:false,
   bp:job.bp,...(job.name?{name:job.name,plus:job.plus}:{}),
   ...(job.names?{names:[...job.names]}:{})});
  return true;
 }
 return true;
}

function usedKey(uid,op){return uid+'|'+op;}
function liveMain(api,pack,s,c){
 return !!c&&!api.originalEffectsDisabled(s,c)&&api.raidBoxTextLive(pack,c,'main');
}
export function legalGimFinishActivations(api,pack,s,player){
 const pl=s.players[player],out=[];
 for(const c of fieldCards(pl)){
  const ability=liveMain(api,pack,s,c)?api.card(pack,c).mainAbility:null;
  if(!ability||!MAINS.has(ability.op))continue;
  const key=usedKey(c.uid,ability.op);
  if(ability.oncePerTurn===true&&s.mainAbilityUsedUids.includes(key))continue;
  const onFront=pl.front.some(x=>x?.uid===c.uid);
  if(ability.frontOnly===true&&!onFront)continue;
  if(ability.op==='gimPayReplay'&&pl.hand.length)
   for(const hand of pl.hand)out.push({type:'activate',uid:c.uid,mode:ability.op,discardUid:hand.uid});
  if(ability.op==='gimNamedDamage'&&pl.hand.length&&fieldCards(pl).some(target=>
   api.card(pack,target).type==='character'&&api.bp(pack,s,target)>=ability.minBp&&
   ability.names.some(name=>cardHasName(api.card(pack,target),name,api.originalEffectsDisabled(s,target)))))
   for(const hand of pl.hand)out.push({type:'activate',uid:c.uid,mode:ability.op,discardUid:hand.uid});
  if(ability.op==='gimFrontPeek'&&pl.deck.length)
   out.push({type:'activate',uid:c.uid,mode:ability.op});
  if(ability.op==='gimBpFork'&&api.bp(pack,s,c)>=ability.minBp)
   out.push({type:'activate',uid:c.uid,mode:ability.op});
  if(ability.op==='gimFieldDraw'&&c.ready&&pl.front.some(target=>target&&
   api.card(pack,target).type==='character'&&api.bp(pack,s,target)>=ability.minBp))
   out.push({type:'activate',uid:c.uid,mode:ability.op});
  if(ability.op==='gimActiveMain'&&fieldCards(pl).some(target=>hasMain(api,pack,s,target)))
   out.push({type:'activate',uid:c.uid,mode:ability.op});
  if(ability.op==='gimRestBuff'&&c.ready&&fieldCards(pl).some(target=>
   target.uid!==c.uid&&api.card(pack,target).type==='character'))
   out.push({type:'activate',uid:c.uid,mode:ability.op});
 }
 return out;
}
function payHand(api,pack,s,owner,sourceUid,discardUid){
 const pl=s.players[owner];
 const index=pl.hand.findIndex(c=>c.uid===discardUid);
 if(index<0)throw Error('Hand payment changed');
 api.moveOwnedLinear(pack,s,{owner,from:'hand',to:'outside',index,
  reason:'payment',sourceUid});
}
export function activateGimFinish(api,pack,s,action){
 if(action?.type!=='activate'||!MAINS.has(action.mode))return false;
 const owner=s.active,pl=s.players[owner];
 const selected=fieldCards(pl).find(c=>c.uid===action.uid);
 const ability=selected&&api.card(pack,selected).mainAbility;
 if(!selected||ability?.op!==action.mode||!liveMain(api,pack,s,selected))
  throw Error('Gakuen Idolmaster main is not live');
 const key=usedKey(selected.uid,ability.op);
 if(ability.oncePerTurn===true&&s.mainAbilityUsedUids.includes(key))
  throw Error('Gakuen Idolmaster main was already used');
 const onFront=pl.front.some(c=>c?.uid===selected.uid);
 if(ability.frontOnly===true&&!onFront)throw Error('Front main left the front');
 if(ability.op==='gimPayReplay'||ability.op==='gimNamedDamage'){
  const choices=ability.op==='gimNamedDamage'?fieldCards(pl).filter(c=>
   api.card(pack,c).type==='character'&&api.bp(pack,s,c)>=ability.minBp&&
   ability.names.some(name=>cardHasName(api.card(pack,c),name,
    api.originalEffectsDisabled(s,c)))).map(c=>c.uid):null;
  if(choices&&!choices.length)throw Error('Damage target left before payment');
  payHand(api,pack,s,owner,selected.uid,action.discardUid);
  s.mainAbilityUsedUids.push(key);
  if(ability.op==='gimPayReplay'){
   s.effectQueue.unshift({op:'replayOnPlay',owner,sourceUid:selected.uid});
   api.continueQueue(pack,s);
  }else ask(s,{player:owner,sourceUid:selected.uid,sourceStamp:selected.fieldEntryStamp,
   op:ability.op,mode:'damage',choices,optional:false});
  return true;
 }
 if(ability.op==='gimFrontPeek'){
  if(!pl.deck.length)throw Error('Peek needs a deck card');
  s.mainAbilityUsedUids.push(key);
  s.effectQueue.unshift({op:'peekTopOrOutside',owner,sourceUid:selected.uid});
  api.continueQueue(pack,s);
  return true;
 }
 if(ability.op==='gimBpFork'){
  if(api.bp(pack,s,selected)<ability.minBp)throw Error('Fork needs the printed BP');
  s.mainAbilityUsedUids.push(key);
  ask(s,{player:owner,sourceUid:selected.uid,sourceStamp:selected.fieldEntryStamp,
   op:ability.op,mode:'fork',optional:false});
  return true;
 }
 if(ability.op==='gimFieldDraw'){
  if(!selected.ready)throw Error('Field main needs a ready card');
  if(!pl.front.some(c=>c&&api.card(pack,c).type==='character'&&api.bp(pack,s,c)>=ability.minBp))
   throw Error('Field main needs a high-BP front character');
  s.mainAbilityUsedUids.push(key);
  api.noteOwnEffectRest(s,owner,selected);
  selected.ready=false;
  s.effectQueue.unshift({op:'drawDiscard',count:1,owner,sourceUid:selected.uid});
  api.continueQueue(pack,s);
  return true;
 }
 if(ability.op==='gimActiveMain'){
  const choices=fieldCards(pl).filter(c=>hasMain(api,pack,s,c)).map(c=>c.uid);
  if(!choices.length)throw Error('No character with an activate main');
  s.mainAbilityUsedUids.push(key);
  ask(s,{player:owner,sourceUid:selected.uid,op:ability.op,mode:'active',choices,optional:false});
  return true;
 }
 if(ability.op==='gimRestBuff'){
  const choices=fieldCards(pl).filter(c=>c.uid!==selected.uid&&
   api.card(pack,c).type==='character').map(c=>c.uid);
  if(!selected.ready||!choices.length)throw Error('Rest buff needs another character');
  api.noteOwnEffectRest(s,owner,selected);
  selected.ready=false;
  ask(s,{player:owner,sourceUid:selected.uid,op:ability.op,mode:'buff',choices,
   bp:1000,optional:false});
  return true;
 }
 return true;
}

function commitLook(api,pack,s,q){
 const pl=s.players[q.player];
 const window=pl.deck.splice(0,q.uids.length);
 if(window.length!==q.uids.length||window.some((c,i)=>c.uid!==q.uids[i]))
  throw Error('Inspected deck window was changed');
 const by=new Map(window.map(c=>[c.uid,c]));
 const placed=new Set();
 for(const uid of q.taken){
  const physical=by.get(uid);
  if(!physical)throw Error('Taken card left the window');
  pl.hand.push(physical);
  placed.add(uid);
  api.recordMove(pack,s,{physical,owner:q.player,from:'deck',to:'hand',
   reason:'own-effect',sourceUid:q.sourceUid,revealed:true});
  api.publishAdded(pack,s,q.player,physical);
 }
 if(q.topUid){
  const physical=by.get(q.topUid);
  if(!physical)throw Error('Top card left the window');
  pl.deck.unshift(physical);
  placed.add(q.topUid);
 }
 for(const uid of q.bottom){
  const physical=by.get(uid);
  if(!physical||placed.has(uid))throw Error('Bottom card left the window');
  pl.deck.push(physical);
  placed.add(uid);
 }
 if(placed.size!==q.uids.length)throw Error('Inspected card was not placed');
 s.pending=null;
 api.continueQueue(pack,s);
}
function finishBottom(q){
 const left=remaining(q);
 if(left.length===1)q.bottom.push(left[0]);
 return remaining(q).length===0;
}
export function legalGimFinishPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-gim-finish')return null;
 const pl=s.players[q.player];
 if(q.mode==='fork')return [
  {type:'chooseGim',mode:'draw'},
  {type:'chooseGim',mode:'unblock'}
 ];
 if(q.mode==='top'||q.mode==='take'||q.mode==='names'||q.mode==='order'){
  const pool=q.mode==='order'?remaining(q):selectable(api,pack,pl,q);
  const mode=q.mode==='order'?'bottom':q.mode==='top'?'top':'take';
  const out=pool.map(uid=>({type:'chooseGim',mode,uid}));
  if(q.mode==='names')out.unshift({type:'chooseGim',mode:'skip',uid:null});
  return out;
 }
 const out=q.choices.map(uid=>({type:'chooseGim',mode:q.mode,uid}));
 if(q.optional===true)out.unshift({type:'chooseGim',mode:'skip',uid:null});
 return out;
}
function buff(card,bp,until){card.buffs??=[];card.buffs.push({bp,...until});}
export function resolveGimFinishPending(api,pack,s,action){
 const q=s.pending;
 if(q?.kind!=='effect-gim-finish')return false;
 if(action?.type!=='chooseGim')throw Error('Gakuen Idolmaster choice required');
 const pl=s.players[q.player];
 if(q.mode==='fork'){
  const loc=api.location(s,q.player,q.sourceUid);
  if(!loc||loc.c.fieldEntryStamp!==q.sourceStamp)throw Error('Fork source left');
  if(action.mode==='draw'){
   s.effectQueue.unshift({op:'grantOnAttack',owner:q.player,sourceUid:q.sourceUid,
    target:'self',optional:true,until:'endOfTurn',then:[{op:'draw',count:1}]});
  }else if(action.mode==='unblock'){
   loc.c.lowBpUnblockable={turn:s.turn,stamp:loc.c.fieldEntryStamp,bp:3000};
  }else throw Error('Fork needs one printed result');
  s.pending=null;api.continueQueue(pack,s);return true;
 }
 if(q.mode==='top'||q.mode==='take'||q.mode==='names'||q.mode==='order'){
  if(action.mode==='skip'&&q.mode==='names'){
   q.mode='order';
   if(finishBottom(q))commitLook(api,pack,s,q);
   return true;
  }
  const pool=q.mode==='order'?remaining(q):selectable(api,pack,pl,q);
  if(!pool.includes(action.uid))throw Error('That inspected card cannot be chosen');
  if(q.mode==='top')q.topUid=action.uid;
  else if(q.mode==='order')q.bottom.push(action.uid);
  else{
   q.taken.push(action.uid);
   const card=pl.deck.find(c=>c.uid===action.uid);
   const name=api.card(pack,card).name;
   if(q.names)q.takenNames.push(name);
  }
  const done=q.mode==='take'&&q.taken.length>=q.need;
  if(q.mode==='top'||q.mode==='order'||done)q.mode='order';
  if((q.mode==='order'&&finishBottom(q))||(q.mode!=='order'&&remaining(q).length===0&&
   (q.mode!=='take'||q.taken.length>=q.need)))
   commitLook(api,pack,s,q);
  return true;
 }
 if(action.mode==='skip'){
  if(q.optional!==true)throw Error('This choice cannot be declined');
  s.pending=null;api.continueQueue(pack,s);return true;
 }
 if(action.mode!==q.mode||!q.choices.includes(action.uid))
  throw Error('Illegal Gakuen Idolmaster choice');
 if(q.mode==='bounce'){
  api.bounceToHand(pack,s,1-q.player,action.uid,q.sourceUid,{
   controller:q.player,reason:'opponent-effect'});
 }else if(q.mode==='retire'){
  const slot=s.players[1-q.player].front.findIndex(c=>c?.uid===action.uid);
  const target=slot>=0?s.players[1-q.player].front[slot]:null;
  if(!target||api.bp(pack,s,target)>q.limit)throw Error('Retirement target changed');
  api.retire(pack,s,1-q.player,'front',slot,{by:'opponent',controller:q.player,sourceUid:q.sourceUid});
 }else if(q.mode==='activeBuff'){
  const loc=api.location(s,q.player,q.sourceUid);
  const target=fieldCards(pl).find(c=>c.uid===action.uid);
  if(!loc||loc.c.fieldEntryStamp!==q.sourceStamp||!target||target.faceDown||
   api.card(pack,target).bp>2500)throw Error('Paired buff target changed');
  api.attemptFieldActive(s,q.player,target);
  buff(target,q.bp,{untilTurn:s.turn});
  buff(loc.c,q.bp,{untilTurn:s.turn});
 }else if(q.mode==='impact'){
  const target=pl.front.find(c=>c?.uid===action.uid);
  if(!target||!Number.isInteger(target.fieldEntryStamp))throw Error('Impact target left the front');
  target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
 }else if(q.mode==='damageBuff'||q.mode==='duration'||q.mode==='buff'){
  const target=fieldCards(pl).find(c=>c.uid===action.uid);
  if(!target||api.card(pack,target).type!=='character')throw Error('Buff target left');
  if(q.mode==='duration'){
   const longer=q.names.every(name=>liveNamed(api,pack,s,pl,name));
   buff(target,q.bp,longer?{untilOwnTurnStart:pl.ownTurns+1}:{untilTurn:s.turn});
  }else{
   buff(target,q.bp,{untilTurn:s.turn});
   if(q.mode==='damageBuff'&&cardHasName(api.card(pack,target),q.name,false))
    target.attackDamagePlus={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
  }
 }else if(q.mode==='damage'){
  const target=fieldCards(pl).find(c=>c.uid===action.uid);
  if(!target||!Number.isInteger(target.fieldEntryStamp))throw Error('Damage target left');
  target.attackDamageGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:2};
 }else if(q.mode==='active'){
  const target=fieldCards(pl).find(c=>c.uid===action.uid);
  if(!target||!hasMain(api,pack,s,target))throw Error('Activate target lost its main');
  api.attemptFieldActive(s,q.player,target);
 }else throw Error('Unknown Gakuen Idolmaster choice');
 s.pending=null;api.continueQueue(pack,s);return true;
}

export function assertGimPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-gim-finish')return;
 const pl=s.players[q.player];
 const source=sourceOf(pl,q.sourceUid);
 const printed=source&&api.card(pack,source);
 if(!printed||!hasOp(printed,q.op))throw Error('Forged Gakuen Idolmaster window');
 if(q.mode==='top'||q.mode==='take'||q.mode==='names'||q.mode==='order'){
  const top=pl.deck.slice(0,q.uids.length).map(c=>c.uid);
  if(top.length!==q.uids.length||top.some((uid,i)=>uid!==q.uids[i]))
   throw Error('Forged Gakuen Idolmaster window');
 }
}

export function gimFinishLook(q){
 if(q?.kind!=='effect-gim-finish')return null;
 if(!['top','take','names','order'].includes(q.mode)||!Array.isArray(q.uids))return null;
 return q.uids;
}
