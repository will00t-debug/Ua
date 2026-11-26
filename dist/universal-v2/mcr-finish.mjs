// Shared sentences for the remaining Macross Vol.2 prints. No card-id opcode.
// A deck look stays private. A face-up life card is public and keeps its trigger.
// Raid-frame text is listed in raid-box.mjs and stays quiet on an ordinary play.
export const MCR_FINISH_OPS=Object.freeze([
 'deckTopFaceUpLife','frontNameOnceActive','attackPhaseEndShift','recoverOutsideByName',
 'deployBuriedBaseActive','outsideTraitThenDraw','selfUntilNextIfNames','bottomDeckFork',
 'searchNotNameIncludesTrait','damageNullUntilNext','retireCapThenBottomName',
 'handRestOrRaidPrinted','lifeSongOptions','walkureAttackOptions', 'mayRetireIfNoActiveFront','raidLeaveWatch','bottomSelfAfter'
]);
const OPS=new Set(MCR_FINISH_OPS);
const keys=(effect,...names)=>Object.keys(effect).length===names.length&&
 names.every(name=>Object.hasOwn(effect,name));
const text=value=>typeof value==='string'&&!!value.trim()&&value.length<=80&&value===value.trim();

export function verifyMcrFinishOp(effect){
 if(!effect||!OPS.has(effect.op))return false;
 if(effect.op==='frontNameOnceActive'&&text(effect.name)&&keys(effect,'op','name'))return true;
 if(effect.op==='attackPhaseEndShift'&&text(effect.excludeNameIncludes)&&
  keys(effect,'op','excludeNameIncludes'))return true;
 if(effect.op==='recoverOutsideByName'&&effect.optional===true&&text(effect.name)&&
  keys(effect,'op','name','optional'))return true;
 if(effect.op==='deployBuriedBaseActive'&&effect.bp===3000&&effect.relation==='atMost'&&
  effect.ownTurn===true&&keys(effect,'op','bp','relation','ownTurn'))return true;
 if(effect.op==='outsideTraitThenDraw'&&effect.optional===true&&text(effect.trait)&&
  keys(effect,'op','trait','optional'))return true;
 if(effect.op==='selfUntilNextIfNames'&&text(effect.trait)&&effect.min===5&&effect.bp===1000&&
  keys(effect,'op','trait','min','bp'))return true;
 if(effect.op==='searchNotNameIncludesTrait'&&effect.count===7&&text(effect.excludeName)&&
  text(effect.nameIncludes)&&text(effect.trait)&&
  keys(effect,'op','count','excludeName','nameIncludes','trait'))return true;
 if(effect.op==='damageNullUntilNext'&&effect.damage===2&&keys(effect,'op','damage'))return true;
 if(effect.op==='retireCapThenBottomName'&&effect.maxBp===5000&&effect.optional===true&&
  text(effect.name)&&keys(effect,'op','maxBp','optional','name'))return true;
 if(effect.op==='handRestOrRaidPrinted'&&effect.color==='red'&&effect.ap===1&&
  effect.maxPrintedBp===3500&&effect.optional===true&&
  keys(effect,'op','color','ap','maxPrintedBp','optional'))return true;
 if(['deckTopFaceUpLife','bottomDeckFork','lifeSongOptions','walkureAttackOptions',
  'mayRetireIfNoActiveFront','raidLeaveWatch','bottomSelfAfter'].includes(effect.op)&&keys(effect,'op'))
  return true;
 throw Error('Invalid Macross finish op');
}

const MAINS={
 frontHandLifeMenu:['op','oncePerTurn','frontOnly','payHand','nameLock'],
 restNamedOption:['op','nameLock','requiresName'],
 frontChooseImpact:['op','oncePerTurn','frontOnly','includes'],
 frontUidChoice:['op','frontOnly'],
 readyBpChoice:['op','oncePerTurn','frontOnly','minBp'],
 restPrintedGrantBottom:['op','maxPrintedBp'],
 sniperIfImpact:['op','oncePerTurn']
};
export function mcrFinishMain(card,ability){
 if(!ability||!Object.hasOwn(MAINS,ability.op))return false;
 if(card?.type!=='character'||!keys(ability,...MAINS[ability.op]))return false;
 if(ability.op==='frontHandLifeMenu'&&!(ability.oncePerTurn===true&&ability.frontOnly===true&&
  ability.payHand===1&&text(ability.nameLock)))return false;
 if(ability.op==='restNamedOption'&&!(text(ability.nameLock)&&text(ability.requiresName)))return false;
 if(ability.op==='frontChooseImpact'&&!(ability.oncePerTurn===true&&ability.frontOnly===true&&
  text(ability.includes)))return false;
 if(ability.op==='frontUidChoice'&&ability.frontOnly!==true)return false;
 if(ability.op==='readyBpChoice'&&!(ability.oncePerTurn===true&&ability.frontOnly===true&&
  ability.minBp===5000))return false;
 if(ability.op==='restPrintedGrantBottom'&&ability.maxPrintedBp!==3500)return false;
 if(ability.op==='sniperIfImpact'&&ability.oncePerTurn!==true)return false;
 return true;
}
export function validateMcrFinishCard(card){
 if(card.attackEndMayRetire!==undefined&&!(card.type==='character'&&card.attackEndMayRetire===true))
  throw Error(card.id+' invalid attack-end retirement');
 if(card.raidImpactNull!==undefined&&card.raidImpactNull!==true)
  throw Error(card.id+' invalid raid impact null');
 const watch=card.raidLeaveWatch;
 if(watch!==undefined&&!(card.type==='character'&&
  ((text(watch.name)&&watch.includes===undefined)||(text(watch.includes)&&watch.name===undefined))&&
  (watch.mode==='deployActive'||watch.mode==='restHand')&&
  keys(watch,...(watch.name!==undefined?['name','mode']:['includes','mode']))))
  throw Error(card.id+' invalid raid-leave watch');
 if(card.oppCharacterChooseImmune!==undefined&&card.oppCharacterChooseImmune!==true)
  throw Error(card.id+' invalid character-choice immunity');
 if(card.mayReduceDamageToOne!==undefined&&card.mayReduceDamageToOne!==true)
  throw Error(card.id+' invalid damage reduction');
 if(card.battleLoseToOppDeckBottom!==undefined&&card.battleLoseToOppDeckBottom!==true)
  throw Error(card.id+' invalid battle deck-bottom loss');
 if(card.rewriteBasaraHandLoss!==undefined&&card.rewriteBasaraHandLoss!==true)
  throw Error(card.id+' invalid battle-loss rewrite');
 const gate=card.playMinLiveBp;
 if(gate!==undefined&&!(card.type==='event'&&gate.min===4000&&gate.count===2&&
  keys(gate,'min','count')))
  throw Error(card.id+' invalid live-BP play gate');
}

let apiContinue=null;
function done(s,pack){s.pending=null;apiContinue(pack,s);}
function ask(s,body){s.pending={kind:'effect-mcr-finish',...body};}
function lifeAdded(api,pack,s,owner){
 return api.matches(s,owner,null,{kind:'ownLifeToHandThisTurn',turn:'own'},
  c=>api.card(pack,c),()=>0,()=>0);
}
function namesAtLeast(api,pack,s,owner,trait,min){
 return api.matches(s,owner,null,{kind:'ownDistinctTraitNames',turn:'any',min,zone:'field',
  excludeSelf:false,trait},c=>api.card(pack,c),()=>0,()=>0);
}
function impactLive(api,pack,s,card){
 return api.impact(pack,s,card)>0;
}
function slotFor(api,pl,line){
 return api.legalDestinations(pl,line).filter(dest=>!dest.replaceUid)
  .map(dest=>({line,slot:dest.slot}));
}
function enterRest(api,pack,s,owner,from,uid,line,slot,ready){
 const pl=s.players[owner];
 const index=pl[from].findIndex(card=>card.uid===uid);
 if(index<0)throw Error('Entry card left '+from);
 api.effectEnter(pack,s,owner,from,index,line,slot,ready,uid,false);
}
function faceUpLife(api,pack,s,owner,sourceUid){
 const pl=s.players[owner];
 if(!pl.deck.length)return false;
 const physical=pl.deck.shift();
 physical.faceUp=true;
 pl.life.unshift(physical);
 api.recordMove(pack,s,{physical,owner,from:'deck',to:'life',reason:'own-effect',sourceUid});
 s.publicReveals.push({kind:'face-up-life',owner,cardId:physical.cardId,uid:physical.uid,
  trigger:api.card(pack,physical).trigger||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
 return true;
}
function sendSelfRemoved(api,pack,s,owner,sourceUid){
 const pl=s.players[owner];
 const queued=s.effectQueue.find(job=>job.op==='completeResolvingEvent'&&job.sourceUid===sourceUid);
 if(queued){queued.destination='removed';return;}
 const index=pl.outside.findIndex(card=>card.uid===sourceUid);
 if(index<0)return;
 const physical=pl.outside.splice(index,1)[0];
 pl.removed.push(physical);
 api.recordMove(pack,s,{physical,owner,from:'outside',to:'removed',reason:'own-effect',sourceUid});
}
function bottomSelf(api,pack,s,owner,uid){
 const loc=api.location(s,owner,uid);
 if(!loc)return;
 api.fieldToDeckBottom(pack,s,owner,uid,uid);
}
function grantFloor(card,turn,relation,bp){
 card.blockFloorGrant={turn,stamp:card.fieldEntryStamp,relation,bp};
}
function untilStart(s,owner){return s.players[owner].ownTurns+1;}

export function legalMcrFinishActivations(api,pack,s,player){
 const out=[],pl=s.players[player];
 for(const card of [...pl.front,...pl.energy].filter(Boolean)){
  const ability=api.card(pack,card).mainAbility;
  if(!ability||!mcrFinishMain(api.card(pack,card),ability))continue;
  if(api.originalEffectsDisabled(s,card)||!api.raidBoxTextLive(pack,card,'main'))continue;
  const front=pl.front.some(item=>item?.uid===card.uid);
  if(ability.op==='frontHandLifeMenu'&&front&&!s.mainAbilityUsedUids.includes(card.uid)&&
   pl.hand.length&&lifeAdded(api,pack,s,player)&&(pl.deck.length||
    s.players[1-player].front.some(Boolean)))
   out.push({type:'activate',uid:card.uid,mode:'frontHandLife'});
  if(ability.op==='restNamedOption'&&card.ready)
   out.push({type:'activate',uid:card.uid,mode:'restNamedOption'});
  if(ability.op==='frontChooseImpact'&&front&&!s.mainAbilityUsedUids.includes(card.uid)&&
   [...pl.front,...pl.energy].some(item=>item&&api.card(pack,item).name.includes(ability.includes)))
   out.push({type:'activate',uid:card.uid,mode:'frontChooseImpact'});
  if(ability.op==='frontUidChoice'&&front&&card.ready){
   const used=id=>(s.chooseOnceByUid||[]).includes(card.uid+'|'+id);
   if(['hand','own','down'].some(id=>!used(id)&&optionLegal(api,pack,s,player,card.uid,id)))
    out.push({type:'activate',uid:card.uid,mode:'frontUidChoice'});
  }
  if(ability.op==='readyBpChoice'&&front&&!s.mainAbilityUsedUids.includes(card.uid)&&
   api.bp(pack,s,card)>=ability.minBp)
   out.push({type:'activate',uid:card.uid,mode:'readyBpChoice'});
  if(ability.op==='restPrintedGrantBottom'&&card.ready)
   out.push({type:'activate',uid:card.uid,mode:'restPrintedGrant'});
  if(ability.op==='sniperIfImpact'&&!s.mainAbilityUsedUids.includes(card.uid)&&impactLive(api,pack,s,card))
   out.push({type:'activate',uid:card.uid,mode:'sniperIfImpact'});
 }
 return out;
}
export function activateMcrFinish(api,pack,s,action){
 apiContinue=api.continueQueue;
 if(action.type!=='activate')return false;
 const pl=s.players[s.active];
 const selected=[...pl.front,...pl.energy].find(card=>card?.uid===action.uid);
 const ability=selected&&api.card(pack,selected).mainAbility;
 if(!selected||!mcrFinishMain(api.card(pack,selected),ability))return false;
 if(api.originalEffectsDisabled(s,selected)||!api.raidBoxTextLive(pack,selected,'main'))
  throw Error('Framed main is not live');
 const front=pl.front.some(card=>card?.uid===selected.uid);
 if(ability.op==='frontHandLifeMenu'){
  if(action.mode!=='frontHandLife'||!front||s.mainAbilityUsedUids.includes(selected.uid)||
   !pl.hand.length||!lifeAdded(api,pack,s,s.active))
   throw Error('Life follow-up is not legal');
  s.mainAbilityUsedUids.push(selected.uid);
  s.effectQueue.unshift({op:'lifeSongOptions',owner:s.active,sourceUid:selected.uid,
   sourceName:ability.nameLock,menu:'ranka'});
  s.pending={kind:'effect-discard',player:s.active,sourceUid:selected.uid};
  return true;
 }
 if(ability.op==='restNamedOption'){
  if(action.mode!=='restNamedOption'||!selected.ready)
   throw Error('Named option is not legal');
  api.noteOwnEffectRest(s,s.active,selected);
  selected.ready=false;
  ask(s,{mode:'reina',player:s.active,sourceUid:selected.uid,nameLock:ability.nameLock,
   requiresName:ability.requiresName});
  return true;
 }
 if(ability.op==='frontChooseImpact'){
  if(action.mode!=='frontChooseImpact'||!front||s.mainAbilityUsedUids.includes(selected.uid))
   throw Error('Impact grant is not legal');
  const choices=[...pl.front,...pl.energy].filter(card=>card&&
   api.card(pack,card).name.includes(ability.includes)).map(card=>card.uid);
  if(!choices.length)throw Error('Impact grant has no target');
  s.mainAbilityUsedUids.push(selected.uid);
  ask(s,{mode:'grantImpact',player:s.active,sourceUid:selected.uid,choices,optional:false});
  return true;
 }
 if(ability.op==='frontUidChoice'){
  if(action.mode!=='frontUidChoice'||!front||!selected.ready)
   throw Error('Card choice is not legal');
  const used=id=>(s.chooseOnceByUid||[]).includes(selected.uid+'|'+id);
  if(!['hand','own','down'].some(id=>!used(id)&&optionLegal(api,pack,s,s.active,selected.uid,id)))
   throw Error('Card choice has no unused effect');
  api.noteOwnEffectRest(s,s.active,selected);
  selected.ready=false;
  ask(s,{mode:'uidMenu',player:s.active,sourceUid:selected.uid});
  return true;
 }
 if(ability.op==='readyBpChoice'){
  if(action.mode!=='readyBpChoice'||!front||s.mainAbilityUsedUids.includes(selected.uid)||
   api.bp(pack,s,selected)<ability.minBp)
   throw Error('Ready choice is not legal');
  s.mainAbilityUsedUids.push(selected.uid);
  api.attemptFieldActive(s,s.active,selected);
  ask(s,{mode:'readyMenu',player:s.active,sourceUid:selected.uid});
  return true;
 }
 if(ability.op==='restPrintedGrantBottom'){
  if(action.mode!=='restPrintedGrant'||!selected.ready)
   throw Error('Printed grant is not legal');
  api.noteOwnEffectRest(s,s.active,selected);
  selected.ready=false;
  const choices=[...pl.front,...pl.energy].filter(card=>card&&card.uid!==selected.uid&&
   api.card(pack,card).type==='character'&&api.card(pack,card).bp<=ability.maxPrintedBp)
   .map(card=>card.uid);
  s.effectQueue.push({op:'bottomSelfAfter',owner:s.active,sourceUid:selected.uid});
  if(choices.length)ask(s,{mode:'printedGrant',player:s.active,sourceUid:selected.uid,choices,optional:true});
  else done(s,pack);
  return true;
 }
 if(ability.op==='sniperIfImpact'){
  if(action.mode!=='sniperIfImpact'||s.mainAbilityUsedUids.includes(selected.uid)||
   !impactLive(api,pack,s,selected))
   throw Error('Sniper grant is not legal');
  s.mainAbilityUsedUids.push(selected.uid);
  selected.sniperGranted={turn:s.turn,stamp:selected.fieldEntryStamp};
  done(s,pack);
  return true;
 }
 return false;
}

function optionLegal(api,pack,s,owner,sourceUid,id){
 const pl=s.players[owner];
 if(id==='life')return pl.deck.length>0;
 if(id==='ban')return s.players[1-owner].front.some(Boolean);
 if(id==='draw'||id==='draw2')return true;
 if(id==='buff')return [...pl.front,...pl.energy].some(card=>card&&api.card(pack,card).type==='character');
 if(id==='obelisk')return pl.life.length===1&&!pl.removed.some(card=>
  api.cardHasName(api.card(pack,card),'オベリスク',false));
 if(id==='song')return pl.outside.some(card=>api.cardHasTrait(api.card(pack,card),'歌（ワルキューレ）'));
 if(id==='five')return namesAtLeast(api,pack,s,owner,'ワルキューレ',5);
 if(id==='hand')return pl.hand.some(card=>{
  const printed=api.card(pack,card);
  return printed.type==='character'&&printed.color==='purple'&&printed.energy<=1;
 });
 if(id==='own')return [...pl.front,...pl.energy].some(card=>card&&api.card(pack,card).type==='character');
 if(id==='down')return s.players[1-owner].front.some(Boolean);
 return false;
}
function queueOption(api,pack,s,owner,sourceUid,id){
 const pl=s.players[owner];
 if(id==='life')faceUpLife(api,pack,s,owner,sourceUid);
 else if(id==='ban')s.effectQueue.unshift({op:'forbidAttackOppFrontOne',owner,sourceUid,
  optional:true,ownTurnOnly:true,until:'nextOwnTurnStart'});
 else if(id==='draw2')api.draw(pack,s,owner,2,{reason:'own-effect',sourceUid});
 else if(id==='draw')api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid});
 else if(id==='buff'){
  const choices=[...pl.front,...pl.energy].filter(card=>card&&api.card(pack,card).type==='character')
   .map(card=>card.uid);
  if(choices.length)ask(s,{mode:'buffOne',player:owner,sourceUid,choices,bp:3000,optional:false});
 }
 else if(id==='ally'||id==='buffOther'){
  const choices=[...pl.front,...pl.energy].filter(card=>card&&card.uid!==sourceUid&&
   api.card(pack,card).type==='character').map(card=>card.uid);
  if(choices.length)ask(s,{mode:'buffOne',player:owner,sourceUid,choices,bp:1000,optional:false});
 }
 else if(id==='buff2000'){
  const choices=[...pl.front,...pl.energy].filter(card=>card&&api.card(pack,card).type==='character')
   .map(card=>card.uid);
  if(choices.length)ask(s,{mode:'buffOne',player:owner,sourceUid,choices,bp:2000,optional:false});
 }
 else if(id==='obelisk'){
  faceUpLife(api,pack,s,owner,sourceUid);
  sendSelfRemoved(api,pack,s,owner,sourceUid);
 }
 else if(id==='song'){
  const choices=pl.outside.filter(card=>api.cardHasTrait(api.card(pack,card),'歌（ワルキューレ）'))
   .map(card=>card.uid);
  if(choices.length)ask(s,{mode:'removeDraw',player:owner,sourceUid,choices,optional:true});
 }
 else if(id==='five'){
  const loc=api.location(s,owner,sourceUid);
  if(loc){
   loc.c.buffs??=[];
   loc.c.buffs.push({bp:1000,untilOwnTurnStart:untilStart(s,owner)});
  }
 }
 else if(id==='hand'){
  const choices=pl.hand.filter(card=>{
   const printed=api.card(pack,card);
   return printed.type==='character'&&printed.color==='purple'&&printed.energy<=1;
  }).map(card=>card.uid);
  const slots=['front','energy'].flatMap(line=>slotFor(api,pl,line));
  if(choices.length&&slots.length)ask(s,{mode:'restHand',player:owner,sourceUid,choices,slots,optional:true});
 }
 else if(id==='down')s.effectQueue.unshift({op:'enemyBpDown',owner,sourceUid,bp:1500,optional:false,zone:'front'});
 else if(id==='block'){
  const choices=[...pl.front,...pl.energy].filter(card=>card&&card.uid!==sourceUid&&
   api.card(pack,card).type==='character').map(card=>card.uid);
  if(choices.length)ask(s,{mode:'blockCeiling',player:owner,sourceUid,choices,bp:4000,optional:false});
 }
}

export function runMcrFinishJob(api,pack,s,job){
 apiContinue=api.continueQueue;
 if(!OPS.has(job.op)&&job.op!=='bottomSelfAfter')return false;
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='deckTopFaceUpLife'){faceUpLife(api,pack,s,owner,job.sourceUid);return true;}
 if(job.op==='frontNameOnceActive'){
  const loc=api.location(s,owner,job.sourceUid);
  const key=job.name+'|frontActive';
  if(loc&&loc.line==='front'&&!api.originalEffectsDisabled(s,loc.c)&&
   !s.mainReadyOnceByName[owner].includes(key)){
   s.mainReadyOnceByName[owner].push(key);
   api.attemptFieldActive(s,owner,loc.c);
  }
  return true;
 }
 if(job.op==='attackPhaseEndShift'){
  const loc=api.location(s,owner,job.sourceUid);
  if(!loc||loc.line!=='front'||api.originalEffectsDisabled(s,loc.c))return true;
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  bottomSelf(api,pack,s,owner,job.sourceUid);
  const choices=pl.energy.filter(card=>card&&api.card(pack,card).type==='character'&&
   !api.card(pack,card).name.includes(job.excludeNameIncludes)&&
   !api.card(pack,card).frontForbidden).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'shiftFront',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='recoverOutsideByName'){
  const choices=pl.outside.filter(card=>api.cardHasName(api.card(pack,card),job.name,false))
   .map(card=>card.uid);
  if(choices.length)ask(s,{mode:'toHand',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='deployBuriedBaseActive'){
  if(job.ownTurn===true&&s.active!==owner)return true;
  const base=job.baseUid&&pl.outside.find(card=>card.uid===job.baseUid);
  const slots=['front','energy'].flatMap(line=>slotFor(api,pl,line));
  if(base&&api.card(pack,base).type==='character'&&slots.length)
   ask(s,{mode:'baseActive',player:owner,sourceUid:job.sourceUid,baseUid:base.uid,slots,
    bp:job.bp,relation:job.relation,optional:true});
  return true;
 }
 if(job.op==='outsideTraitThenDraw'){
  const choices=pl.outside.filter(card=>api.cardHasTrait(api.card(pack,card),job.trait))
   .map(card=>card.uid);
  if(choices.length)ask(s,{mode:'removeDraw',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='selfUntilNextIfNames'){
  const loc=api.location(s,owner,job.sourceUid);
  if(loc&&namesAtLeast(api,pack,s,owner,job.trait,job.min)){
   loc.c.buffs??=[];
   loc.c.buffs.push({bp:job.bp,untilOwnTurnStart:untilStart(s,owner)});
  }
  return true;
 }
 if(job.op==='bottomDeckFork'){
  const key=job.sourceUid+'|bottomDeck';
  const loc=api.location(s,owner,job.sourceUid);
  if(!loc||!pl.deck.length||s.mainAbilityUsedUids.includes(key)||api.originalEffectsDisabled(s,loc.c))
   return true;
  s.mainAbilityUsedUids.push(key);
  const physical=pl.deck[pl.deck.length-1];
  pl.deck.pop();
  pl.outside.push(physical);
  api.recordMove(pack,s,{physical,owner,from:'deck',to:'outside',reason:'own-effect',
   sourceUid:job.sourceUid,deckPosition:'bottom',revealed:true});
  api.publishAdded(pack,s,owner,physical);
  const printed=api.card(pack,physical);
  const named=printed.color==='red'&&(api.cardHasName(printed,'サラ・ノーム',false)||
   api.cardHasName(printed,'マオ・ノーム',false));
  const bare=(printed.traits||[]).length===0;
  const slots=named?['front','energy'].flatMap(line=>slotFor(api,pl,line)):[];
  if(named||bare)ask(s,{mode:'bottomFork',player:owner,sourceUid:job.sourceUid,uid:physical.uid,
   named:named&&slots.length>0,bare,slots,optional:true});
  return true;
 }
 if(job.op==='searchNotNameIncludesTrait'){
  const window=pl.deck.slice(0,Math.min(job.count,pl.deck.length));
  if(!window.length)return true;
  const choices=window.filter(card=>{
   const printed=api.card(pack,card);
   return !printed.name.includes(job.excludeName)&&printed.name.includes(job.nameIncludes)&&
    api.cardHasTrait(printed,job.trait);
  }).map(card=>card.uid);
  ask(s,{mode:'searchBottom',player:owner,sourceUid:job.sourceUid,uids:window.map(card=>card.uid),
   choices,optional:true,look:true});
  return true;
 }
 if(job.op==='damageNullUntilNext'){
  const loc=api.location(s,owner,job.sourceUid);
  if(loc&&api.bp(pack,s,loc.c)>=6000){
   const until=untilStart(s,owner);
   loc.c.attackDamageGranted={amount:2,stamp:loc.c.fieldEntryStamp,untilOwnTurnStart:until};
   loc.c.impactNullGranted={stamp:loc.c.fieldEntryStamp,untilOwnTurnStart:until,sourceUid:loc.c.uid};
  }
  return true;
 }
 if(job.op==='retireCapThenBottomName'){
  const foes=s.players[1-owner].front.filter(card=>card&&api.bp(pack,s,card)<=job.maxBp)
   .map(card=>card.uid);
  ask(s,{mode:'retireThenSara',player:owner,sourceUid:job.sourceUid,choices:foes,
   name:job.name,step:foes.length?'retire':'sara',optional:true});
  return true;
 }
 if(job.op==='handRestOrRaidPrinted'){
  const choices=pl.hand.filter(card=>{
   const printed=api.card(pack,card);
   return printed.type==='character'&&printed.color===job.color&&printed.ap===job.ap&&
    printed.bp<=job.maxPrintedBp;
  }).map(card=>card.uid);
  if(choices.length)ask(s,{mode:'restOrRaid',player:owner,sourceUid:job.sourceUid,choices,optional:true});
  return true;
 }
 if(job.op==='lifeSongOptions'){
  if(job.menu==='ranka'){
   const live=['life','ban'].filter(id=>optionLegal(api,pack,s,owner,job.sourceUid,id));
   if(live.length)ask(s,{mode:'pickOne',player:owner,sourceUid:job.sourceUid,options:live,
    nameLock:job.sourceName,order:['life','ban']});
   return true;
  }
  const max=lifeAdded(api,pack,s,owner)?2:1;
  const live=['draw2','buff','obelisk'].filter(id=>optionLegal(api,pack,s,owner,job.sourceUid,id));
  if(live.length)ask(s,{mode:'pickMany',player:owner,sourceUid:job.sourceUid,options:live,
   selected:[],max,order:['draw2','buff','obelisk']});
  return true;
 }
 if(job.op==='walkureAttackOptions'){
  const live=['song','five'].filter(id=>optionLegal(api,pack,s,owner,job.sourceUid,id));
  if(live.length)ask(s,{mode:'pickMany',player:owner,sourceUid:job.sourceUid,options:live,
   selected:[],max:2,order:['song','five']});
  return true;
 }
 if(job.op==='mayRetireIfNoActiveFront'){
  const loc=api.location(s,owner,job.sourceUid);
  const active=pl.front.some(card=>card?.ready);
  if(loc&&loc.line==='front'&&!active&&!api.originalEffectsDisabled(s,loc.c))
   ask(s,{mode:'retireSelf',player:owner,sourceUid:job.sourceUid,optional:true});
  return true;
 }
 if(job.op==='raidLeaveWatch'){
  const slots=['front','energy'].flatMap(line=>slotFor(api,pl,line));
  const base=pl.outside.find(card=>card.uid===job.baseUid);
  if(job.watch==='deployActive'&&base&&slots.length)
   ask(s,{mode:'baseActive',player:owner,sourceUid:job.sourceUid,baseUid:base.uid,slots,
    bp:0,relation:'atLeast',optional:true});
  else if(job.watch==='restHand'){
   const watcher=api.location(s,owner,job.sourceUid);
   if(watcher&&watcher.line==='front'&&watcher.c.ready&&base)
    ask(s,{mode:'restHandLeave',player:owner,sourceUid:job.sourceUid,baseUid:base.uid,optional:true});
  }
  return true;
 }
 if(job.op==='bottomSelfAfter'){bottomSelf(api,pack,s,owner,job.sourceUid);return true;}
 return false;
}

export function legalMcrFinishPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-mcr-finish')return null;
 const pl=s.players[q.player];
 if(q.mode==='pickOne'){
  const locked=id=>q.nameLock&&s.mainReadyOnceByName[q.player].includes(q.nameLock+'|'+id);
  return q.options.filter(id=>!locked(id)).map(id=>({type:'chooseMcrFinish',mode:id}));
 }
 if(q.mode==='pickMany')return [
  {type:'chooseMcrFinish',mode:'confirm'},
  ...q.options.filter(id=>!q.selected.includes(id)).map(id=>({type:'chooseMcrFinish',mode:id}))
 ];
 if(q.mode==='reina'){
  const locked=s.mainReadyOnceByName[q.player].includes(q.nameLock+'|block');
  const named=[...pl.front,...pl.energy].some(card=>card&&
   api.cardHasName(api.card(pack,card),q.requiresName,api.originalEffectsDisabled(s,card)));
  const out=[{type:'chooseMcrFinish',mode:'ally'}];
  if(!locked&&named)out.push({type:'chooseMcrFinish',mode:'block'});
  return out;
 }
 if(q.mode==='uidMenu'){
  const used=id=> (s.chooseOnceByUid||[]).includes(q.sourceUid+'|'+id);
  return ['hand','own','down'].filter(id=>!used(id)&&optionLegal(api,pack,s,q.player,q.sourceUid,id))
   .map(id=>({type:'chooseMcrFinish',mode:id}));
 }
 if(q.mode==='readyMenu')return ['draw','buffOther'].map(id=>({type:'chooseMcrFinish',mode:id}));
 if(q.mode==='buffOne'||q.mode==='grantImpact'||q.mode==='blockCeiling'||q.mode==='printedGrant')
  return [...(q.optional?[ {type:'chooseMcrFinish',mode:'skip'}]:[]),
   ...q.choices.map(uid=>({type:'chooseMcrFinish',mode:'pick',uid}))];
 if(q.mode==='shiftFront'||q.mode==='toHand'||q.mode==='removeDraw'||q.mode==='restOrRaid')
  return [{type:'chooseMcrFinish',mode:'skip'},
   ...q.choices.map(uid=>({type:'chooseMcrFinish',mode:'pick',uid}))];
 if(q.mode==='searchBottom')return [{type:'chooseMcrFinish',mode:'skip'},
  ...q.choices.map(uid=>({type:'chooseMcrFinish',mode:'take',uid}))];
 if(q.mode==='baseActive')return [{type:'chooseMcrFinish',mode:'skip'},
  ...q.slots.map(slot=>({type:'chooseMcrFinish',mode:'enter',line:slot.line,slot:slot.slot}))];
 if(q.mode==='restHand')return [{type:'chooseMcrFinish',mode:'skip'},
  ...q.choices.flatMap(uid=>q.slots.map(slot=>({type:'chooseMcrFinish',mode:'enter',uid,
   line:slot.line,slot:slot.slot})))];
 if(q.mode==='bottomFork'){
  const out=[{type:'chooseMcrFinish',mode:'skip'}];
  if(q.named)for(const slot of q.slots)out.push({type:'chooseMcrFinish',mode:'deploy',line:slot.line,slot:slot.slot});
  if(q.bare)out.push({type:'chooseMcrFinish',mode:'hand'});
  return out;
 }
 if(q.mode==='retireThenSara'){
  if(q.step==='retire')return [{type:'chooseMcrFinish',mode:'skip'},
   ...q.choices.map(uid=>({type:'chooseMcrFinish',mode:'retire',uid}))];
  const sara=pl.field?[]:[...pl.front,...pl.energy].filter(card=>card&&
   api.cardHasName(api.card(pack,card),q.name,false)).map(card=>card.uid);
  return [{type:'chooseMcrFinish',mode:'skip'},
   ...sara.map(uid=>({type:'chooseMcrFinish',mode:'bottom',uid}))];
 }
 if(q.mode==='retireSelf')return [{type:'chooseMcrFinish',mode:'skip'},{type:'chooseMcrFinish',mode:'retire'}];
 if(q.mode==='restHandLeave')return [{type:'chooseMcrFinish',mode:'skip'},{type:'chooseMcrFinish',mode:'rest'}];
 if(q.mode==='keyword')return [{type:'chooseMcrFinish',mode:'impact'},{type:'chooseMcrFinish',mode:'ceiling'}];
 if(q.mode==='howEnter')return [
  ...q.slots.map(slot=>({type:'chooseMcrFinish',mode:'rest',line:slot.line,slot:slot.slot})),
  ...q.bases.map(uid=>({type:'chooseMcrFinish',mode:'raid',baseUid:uid}))
 ];
 if(q.mode==='orderBottom')return q.uids.filter(uid=>!q.order.includes(uid))
  .map(uid=>({type:'chooseMcrFinish',mode:'order',uid}));
 if(q.mode==='damageCap')return [{type:'chooseMcrFinish',mode:'reduce'},{type:'chooseMcrFinish',mode:'skip'}];
 return [];
}

function resolvePick(api,pack,s,q,ids){
 const order=q.order.filter(id=>ids.includes(id));
 s.pending=null;
 for(const id of [...order].reverse())queueOption(api,pack,s,q.player,q.sourceUid,id);
 if(!s.pending)apiContinue(pack,s);
}

export function resolveMcrFinishPending(api,pack,s,action){
 apiContinue=api.continueQueue;
 const q=s.pending;
 if(q?.kind!=='effect-mcr-finish'||action.type!=='chooseMcrFinish')return false;
 const pl=s.players[q.player];
 if(q.mode==='pickOne'){
  if(!q.options.includes(action.mode))throw Error('Illegal printed option');
  if(q.nameLock){
   const key=q.nameLock+'|'+action.mode;
   if(s.mainReadyOnceByName[q.player].includes(key))
    throw Error('This named effect was already chosen this turn');
   s.mainReadyOnceByName[q.player].push(key);
  }
  resolvePick(api,pack,s,q,[action.mode]);
  return true;
 }
 if(q.mode==='pickMany'){
  if(action.mode==='confirm'){
   resolvePick(api,pack,s,{...q},q.selected);
   return true;
  }
  if(!q.options.includes(action.mode)||q.selected.includes(action.mode)||q.selected.length>=q.max)
   throw Error('Illegal printed option');
  q.selected.push(action.mode);
  if(q.selected.length===q.max)resolvePick(api,pack,s,q,q.selected);
  return true;
 }
 if(q.mode==='reina'){
  if(action.mode==='block'){
   const key=q.nameLock+'|block';
   if(s.mainReadyOnceByName[q.player].includes(key))
    throw Error('This named effect was already chosen this turn');
   s.mainReadyOnceByName[q.player].push(key);
  }
  s.pending=null;
  queueOption(api,pack,s,q.player,q.sourceUid,action.mode);
  if(!s.pending)apiContinue(pack,s);
  return true;
 }
 if(q.mode==='uidMenu'||q.mode==='readyMenu'){
  s.chooseOnceByUid??=[];
  if(q.mode==='uidMenu'){
   const key=q.sourceUid+'|'+action.mode;
   if(s.chooseOnceByUid.includes(key))throw Error('This card already chose that effect');
   s.chooseOnceByUid.push(key);
  }
  s.pending=null;
  queueOption(api,pack,s,q.player,q.sourceUid,action.mode);
  if(!s.pending)apiContinue(pack,s);
  return true;
 }
 if(action.mode==='skip'){done(s,pack);return true;}
 if(q.mode==='buffOne'||q.mode==='blockCeiling'){
  const target=[...pl.front,...pl.energy].find(card=>card?.uid===action.uid);
  if(!target||!q.choices.includes(action.uid))throw Error('Illegal buff target');
  if(q.mode==='buffOne'){
   target.buffs??=[];
   target.buffs.push({bp:q.bp,untilTurn:s.turn});
  }else target.blockAtLeastGranted={turn:s.turn,stamp:target.fieldEntryStamp,bp:q.bp};
  done(s,pack);return true;
 }
 if(q.mode==='grantImpact'){
  const target=[...pl.front,...pl.energy].find(card=>card?.uid===action.uid);
  if(!target||!q.choices.includes(action.uid))throw Error('Illegal impact target');
  target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
  api.draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='printedGrant'){
  const target=[...pl.front,...pl.energy].find(card=>card?.uid===action.uid);
  if(!target||!q.choices.includes(action.uid))throw Error('Illegal printed grant');
  ask(s,{mode:'keyword',player:q.player,sourceUid:q.sourceUid,target:target.uid});
  return true;
 }
 if(q.mode==='keyword'){
  const target=[...pl.front,...pl.energy].find(card=>card?.uid===q.target);
  if(!target)throw Error('Grant target left');
  if(action.mode==='impact')target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
  else if(action.mode==='ceiling')target.blockAtLeastGranted={turn:s.turn,stamp:target.fieldEntryStamp,bp:4000};
  else throw Error('Illegal keyword');
  done(s,pack);return true;
 }
 if(q.mode==='shiftFront'){
  const from=pl.energy.findIndex(card=>card?.uid===action.uid);
  if(from<0||!q.choices.includes(action.uid))throw Error('Illegal energy move');
  const open=pl.front.findIndex(card=>!card);
  if(open<0){
   const vacate=pl.front.filter(card=>card).map(card=>card.uid);
   ask(s,{mode:'vacate',player:q.player,sourceUid:q.sourceUid,mover:action.uid,choices:vacate});
   return true;
  }
  const moving=pl.energy[from];
  pl.energy[from]=null;pl.front[open]=moving;
  api.recordMove(pack,s,{physical:moving,owner:q.player,from:'energy',to:'front',
   reason:'own-effect',sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='vacate'){
  const slot=pl.front.findIndex(card=>card?.uid===action.uid);
  if(slot<0||!q.choices.includes(action.uid))throw Error('Illegal line removal');
  api.removeOwnToRemoved(pack,s,q.player,'front',slot,q.sourceUid);
  const from=pl.energy.findIndex(card=>card?.uid===q.mover);
  const moving=from>=0?pl.energy[from]:null;
  if(!moving)throw Error('Mover left the energy line');
  pl.energy[from]=null;pl.front[slot]=moving;
  api.recordMove(pack,s,{physical:moving,owner:q.player,from:'energy',to:'front',
   reason:'own-effect',sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='toHand'){
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  if(index<0||!q.choices.includes(action.uid))throw Error('Illegal outside recovery');
  const physical=pl.outside.splice(index,1)[0];
  pl.hand.push(physical);
  api.recordMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',reason:'own-effect',
   sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='removeDraw'){
  const index=pl.outside.findIndex(card=>card.uid===action.uid);
  if(index<0||!q.choices.includes(action.uid))throw Error('Illegal outside removal');
  const physical=pl.outside.splice(index,1)[0];
  pl.removed.push(physical);
  api.recordMove(pack,s,{physical,owner:q.player,from:'outside',to:'removed',reason:'own-effect',
   sourceUid:q.sourceUid});
  api.draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  done(s,pack);return true;
 }
 if(q.mode==='baseActive'&&action.mode==='enter'){
  const slot=q.slots.find(item=>item.line===action.line&&item.slot===action.slot);
  if(!slot||pl[action.line][action.slot])throw Error('Illegal base entry');
  enterRest(api,pack,s,q.player,'outside',q.baseUid,action.line,action.slot,true);
  const entered=pl[action.line][action.slot];
  if(entered&&q.bp>0)grantFloor(entered,s.turn,q.relation,q.bp);
  done(s,pack);return true;
 }
 if(q.mode==='restHand'&&action.mode==='enter'){
  if(!q.choices.includes(action.uid))throw Error('Illegal hand entry');
  enterRest(api,pack,s,q.player,'hand',action.uid,action.line,action.slot,false);
  done(s,pack);return true;
 }
 if(q.mode==='restOrRaid'){
  const card=pl.hand.find(item=>item.uid===action.uid);
  if(!card||!q.choices.includes(action.uid))throw Error('Illegal hand card');
  const slots=['front','energy'].flatMap(line=>slotFor(api,pl,line));
  const bases=[...pl.front,...pl.energy].filter(host=>host&&api.validRaidBase(pack,s,q.player,card,host))
   .map(host=>host.uid);
  ask(s,{mode:'howEnter',player:q.player,sourceUid:q.sourceUid,uid:card.uid,slots,bases});
  return true;
 }
 if(q.mode==='howEnter'){
  if(action.mode==='rest'){
   const slot=q.slots.find(item=>item.line===action.line&&item.slot===action.slot);
   if(!slot)throw Error('Illegal rest entry');
   enterRest(api,pack,s,q.player,'hand',q.uid,action.line,action.slot,false);
  }else if(action.mode==='raid'){
   const host=[...pl.front,...pl.energy].find(item=>item?.uid===action.baseUid);
   const card=pl.hand.find(item=>item.uid===q.uid);
   if(!host||!card||!q.bases.includes(action.baseUid))throw Error('Illegal effect raid');
   const index=pl.hand.findIndex(item=>item.uid===q.uid);
   pl.hand.splice(index,1);
   api.performRaid(pack,s,q.player,card,host,false);
  }else throw Error('Illegal entry mode');
  done(s,pack);return true;
 }
 if(q.mode==='bottomFork'){
  const index=pl.outside.findIndex(card=>card.uid===q.uid);
  if(index<0)throw Error('Bottom card left outside');
  if(action.mode==='hand'){
   const physical=pl.outside.splice(index,1)[0];
   pl.hand.push(physical);
   api.recordMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',reason:'own-effect',
    sourceUid:q.sourceUid});
  }else if(action.mode==='deploy'){
   enterRest(api,pack,s,q.player,'outside',q.uid,action.line,action.slot,false);
  }else throw Error('Illegal bottom follow-up');
  done(s,pack);return true;
 }
 if(q.mode==='searchBottom'){
  if(q.uids.some(uid=>!pl.deck.some(card=>card.uid===uid)))throw Error('Looked card left the deck');
  if(action.mode==='take'){
   if(!q.choices.includes(action.uid))throw Error('Illegal search take');
   const index=pl.deck.findIndex(card=>card.uid===action.uid);
   const taken=pl.deck.splice(index,1)[0];
   pl.hand.push(taken);
   api.recordMove(pack,s,{physical:taken,owner:q.player,from:'deck',to:'hand',reason:'own-effect',
    sourceUid:q.sourceUid,revealed:true});
   api.publishAdded(pack,s,q.player,taken);
  }else if(action.mode!=='skip')throw Error('Illegal search choice');
  const rest=q.uids.filter(uid=>uid!==action.uid&&pl.deck.some(card=>card.uid===uid));
  if(rest.length)ask(s,{mode:'orderBottom',player:q.player,sourceUid:q.sourceUid,uids:rest,order:[]});
  else done(s,pack);
  return true;
 }
 if(q.mode==='orderBottom'){
  if(!q.uids.includes(action.uid)||q.order.includes(action.uid))throw Error('Illegal deck order');
  q.order.push(action.uid);
  if(q.order.length===q.uids.length){
   for(const uid of q.order){
    const index=pl.deck.findIndex(card=>card.uid===uid);
    if(index<0)throw Error('Ordered card left the deck');
    pl.deck.push(pl.deck.splice(index,1)[0]);
   }
   done(s,pack);
  }
  return true;
 }
 if(q.mode==='retireThenSara'&&q.step==='retire'){
  if(action.mode==='retire'){
   const loc=api.location(s,1-q.player,action.uid);
   if(!loc||!q.choices.includes(action.uid))throw Error('Illegal retirement');
   api.retire(pack,s,1-q.player,loc.line,loc.slot,{by:'opponent',sourceUid:q.sourceUid});
  }else if(action.mode!=='skip')throw Error('Illegal retirement');
  const sara=[...s.players[q.player].front,...s.players[q.player].energy].filter(card=>card&&
   api.cardHasName(api.card(pack,card),q.name,false)).map(card=>card.uid);
  ask(s,{mode:'retireThenSara',player:q.player,sourceUid:q.sourceUid,name:q.name,step:'sara',choices:sara});
  return true;
 }
 if(q.mode==='retireThenSara'&&q.step==='sara'){
  if(action.mode==='bottom'){
   const loc=api.location(s,q.player,action.uid);
   if(!loc||!q.choices.includes(action.uid))throw Error('Illegal deck-bottom character');
   api.fieldToDeckBottom(pack,s,q.player,action.uid,q.sourceUid);
   api.draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  }else if(action.mode!=='skip')throw Error('Illegal deck-bottom choice');
  done(s,pack);return true;
 }
 if(q.mode==='retireSelf'&&action.mode==='retire'){
  const loc=api.location(s,q.player,q.sourceUid);
  s.pending=null;
  if(loc)api.retire(pack,s,q.player,loc.line,loc.slot,{sourceUid:q.sourceUid});
  if(!s.pending)apiContinue(pack,s);
  return true;
 }
 if(q.mode==='damageCap'){
  const resume={...q.resume,capChecked:true};
  if(action.mode==='reduce'){
   const key=q.sourceUid+'|damageCap';
   if(!s.mainAbilityUsedUids.includes(key))s.mainAbilityUsedUids.push(key);
   resume.capCount=1;
  }
  s.pending=null;
  s.effectQueue.unshift(resume);
  apiContinue(pack,s);
  return true;
 }
 if(q.mode==='restHandLeave'&&action.mode==='rest'){
  const watcher=api.location(s,q.player,q.sourceUid);
  if(!watcher||!watcher.c.ready||watcher.line!=='front')throw Error('Watcher cannot rest');
  api.noteOwnEffectRest(s,q.player,watcher.c);
  watcher.c.ready=false;
  const base=pl.outside.find(card=>card.uid===q.baseUid)||pl.hand.find(card=>card.uid===q.baseUid);
  const outside=pl.outside.findIndex(card=>card.uid===q.baseUid);
  if(outside>=0){
   const physical=pl.outside.splice(outside,1)[0];
   pl.hand.push(physical);
   api.recordMove(pack,s,{physical,owner:q.player,from:'outside',to:'hand',reason:'own-effect',
    sourceUid:q.sourceUid});
  }
  if(!base&&outside<0)throw Error('Raid base left');
  done(s,pack);return true;
 }
 return false;
}

export function queueMcrFinishLeave(api,pack,s,owner,physical){
 const base=physical?.stack?.[0];
 const faceUp=(physical?.stack||[]).some(layer=>layer&&layer.faceDown!==true);
 if(!base||!faceUp)return;
 const printed=api.card(pack,physical);
 for(const watcher of s.players[owner].front.filter(Boolean)){
  const rule=api.card(pack,watcher).raidLeaveWatch;
  if(!rule||api.originalEffectsDisabled(s,watcher)||!api.raidBoxTextLive(pack,watcher,'raidLeave'))continue;
  const hit=rule.name?api.cardHasName(printed,rule.name,false):
   typeof printed.name==='string'&&printed.name.includes(rule.includes);
  if(!hit)continue;
  s.effectQueue.unshift({op:'raidLeaveWatch',owner,sourceUid:watcher.uid,baseUid:base.uid,
   watch:rule.mode});
 }
}
