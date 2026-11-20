// Shared sentences for the rest of UA58BT. No title opcode. A facedown card
// supplies no name or trait. A look keeps every inspected card. Effect entry
// chooses the card, then the cell. Raid-frame text is gated by the raid box.
const KANDA='神田 ユウ';
export const SHARED_PRINT_MORE_OPS=Object.freeze([
 'raidedOptionalBpDown','optionalDrawThenDiscard','millThenDeployNamed','attackPutScale',
 'sixPlay','millSelfTop','tuckOutsideBlue','lookTopNameBottom','replayFrontLookIfMoved',
 'grantSniperIfName','grantOppAttackEndLeave','retireOppByUnion','raidPlayBuffImpact',
 'drawThenBlockChoice','optionalDiscardBlockChoice','deployOutsideSkipPlay',
 'lockBlockerUntilLeaveFront','attackEndDrawBase','attackEndLockBase','attackEndRestWake',
 'optionalRetireDeploySkip','modeBottomOrDeploy','moveFrontEnergyCap','retireRaiseGrant',
 'chainRaidOffer','printMoreRetire','optionalBottomDraw'
]);
const MORE_OPS=new Set(SHARED_PRINT_MORE_OPS);
const MORE_MAINS=new Set([
 'printReadyGate','crowdFrontDown','bottomPairOnce','underCardMain','entryTurnWard',
 'unchosenEntryMain','printNameActive','bouncePairDeploy','fieldOutsideEnter'
]);
const keys=(effect,...names)=>Object.keys(effect).length===names.length&&
 names.every(name=>Object.hasOwn(effect,name));
const text=(value,max=40)=>typeof value==='string'&&!!value.trim()&&value.length<=max;

export function verifySharedPrintMoreOp(effect,path,index){
 if(!effect||!MORE_OPS.has(effect.op))return false;
 const e=effect,bad=()=>{throw Error(path+'['+index+'] invalid shared print');};
 if(e.op==='raidedOptionalBpDown'&&!(keys(e,'op','trait','minNames','minBp','amount')&&
  text(e.trait)&&e.minNames===4&&e.minBp===4000&&e.amount===500))bad();
 if(e.op==='optionalDrawThenDiscard'&&!keys(e,'op'))bad();
 if(e.op==='millThenDeployNamed'&&!(keys(e,'op','trait','exceptName','mill','color','name','maxEnergy')&&
  text(e.trait)&&text(e.exceptName)&&text(e.name)&&e.mill===2&&e.color==='blue'&&e.maxEnergy===2))bad();
 if(e.op==='attackPutScale'&&!(keys(e,'op','trait','minNames','usedTrait','bp')&&
  text(e.trait)&&text(e.usedTrait)&&e.minNames===4&&e.bp===1000))bad();
 if(e.op==='sixPlay'&&!(keys(e,'op','trait','exceptName','usedTrait')&&
  text(e.trait)&&text(e.exceptName)&&text(e.usedTrait)))bad();
 if(e.op==='millSelfTop'&&!(keys(e,'op','mill')&&e.mill===5))bad();
 if(e.op==='tuckOutsideBlue'&&!(keys(e,'op','max','maxEnergy','color','names','min')&&
  e.max===3&&e.maxEnergy===1&&e.color==='blue'&&e.min===2&&
  Array.isArray(e.names)&&e.names.length===2&&e.names.every(name=>text(name))))bad();
 if(e.op==='lookTopNameBottom'&&!(keys(e,'op','count','name','frontOnly')&&
  e.count===5&&text(e.name)&&e.frontOnly===true))bad();
 if(e.op==='replayFrontLookIfMoved'&&!keys(e,'op'))bad();
 if(e.op==='grantSniperIfName'&&!(keys(e,'op','name')&&text(e.name)))bad();
 if(e.op==='grantOppAttackEndLeave'&&!keys(e,'op'))bad();
 if(e.op==='retireOppByUnion'&&!keys(e,'op'))bad();
 if(e.op==='raidPlayBuffImpact'&&!(keys(e,'op','bp','impact')&&e.bp===1000&&e.impact===1))bad();
 if((e.op==='drawThenBlockChoice'||e.op==='optionalDiscardBlockChoice')&&!(
  keys(e,'op','floors','ceilings','minNames','bothNames')&&e.minNames===4&&
  (e.bothNames===6||e.bothNames===0)&&Array.isArray(e.floors)&&Array.isArray(e.ceilings)&&
  e.floors.length===1&&e.ceilings.length===1&&e.floors[0]===3000&&e.ceilings[0]===4000))bad();
 if(e.op==='deployOutsideSkipPlay'&&!(keys(e,'op','color','trait','ap','maxEnergy','raised')&&
  e.color==='purple'&&text(e.trait)&&e.ap===1&&e.maxEnergy===2&&e.raised===3))bad();
 if(e.op==='lockBlockerUntilLeaveFront'&&!keys(e,'op'))bad();
 if(e.op==='attackEndDrawBase'&&!(keys(e,'op','draw')&&e.draw===2))bad();
 if(e.op==='attackEndLockBase'&&!keys(e,'op'))bad();
 if(e.op==='attackEndRestWake'&&!(keys(e,'op','trait','minNames','ceiling')&&
  text(e.trait)&&e.minNames===4&&e.ceiling===4000))bad();
 if(e.op==='optionalRetireDeploySkip'&&!(keys(e,'op','color','maxEnergy','ap')&&
  e.color==='purple'&&e.maxEnergy===3&&e.ap===1))bad();
 if(e.op==='modeBottomOrDeploy'&&!(keys(e,'op','name','maxBp','color','maxEnergy','ap')&&
  text(e.name)&&e.maxBp===5000&&e.color==='blue'&&e.maxEnergy===4&&e.ap===1))bad();
 if(e.op==='moveFrontEnergyCap'&&!(keys(e,'op','maxBp','grantName')&&e.maxBp===4000&&text(e.grantName)))bad();
 if(e.op==='retireRaiseGrant'&&!(keys(e,'op','bp','raised','raiseName','grantName')&&
  e.bp===3000&&e.raised===5000&&text(e.raiseName)&&text(e.grantName)))bad();
 if(e.op==='chainRaidOffer'&&!(keys(e,'op','name','min','watchName')&&
  text(e.name)&&e.min===6&&text(e.watchName)))bad();
 if(e.op==='optionalBottomDraw'&&!(keys(e,'op','trait','minNames','maxBp')&&
  text(e.trait)&&e.minNames===4&&e.maxBp===3500))bad();
 if(e.op==='printMoreRetire'&&!keys(e,'op'))bad();
 return true;
}

export function sharedPrintMoreMain(card,ability){
 if(!ability||!MORE_MAINS.has(ability.op))return false;
 const host=card.type==='character'||(card.type==='field'&&ability.op==='fieldOutsideEnter');
 if(!host)throw Error(card.id+' shared main is on the wrong card');
 const e=ability;
 if(e.op==='printReadyGate'&&!(keys(e,'op','name','deckAtMost')&&text(e.name)&&e.deckAtMost===20))
  throw Error(card.id+' invalid ready gate');
 if(e.op==='crowdFrontDown'&&!(keys(e,'op','trait','minNames','minBp','amount')&&
  text(e.trait)&&e.minNames===4&&e.minBp===4000&&e.amount===500))
  throw Error(card.id+' invalid crowd shift');
 if(e.op==='bottomPairOnce'&&!(keys(e,'op','name','energy')&&text(e.name)&&e.energy===0))
  throw Error(card.id+' invalid outside bottom pair');
 if(e.op==='underCardMain'&&!keys(e,'op'))throw Error(card.id+' invalid under-card main');
 if(e.op==='entryTurnWard'&&!keys(e,'op'))throw Error(card.id+' invalid entry ward');
 if(e.op==='unchosenEntryMain'&&!keys(e,'op'))throw Error(card.id+' invalid entry protection');
 if(e.op==='printNameActive'&&!(keys(e,'op','name','minNames')&&text(e.name)&&e.minNames===6))
  throw Error(card.id+' invalid name active');
 if(e.op==='bouncePairDeploy'&&!(keys(e,'op','bounceName','deployName','color')&&
  text(e.bounceName)&&text(e.deployName)&&e.color==='purple'))
  throw Error(card.id+' invalid pair return');
 if(e.op==='fieldOutsideEnter'&&!(keys(e,'op','names','color','energy')&&e.color==='purple'&&
  e.energy===3&&Array.isArray(e.names)&&e.names.length===4&&e.names.every(name=>text(name))))
  throw Error(card.id+' invalid outside field entry');
 return true;
}

export function validateSharedPrintMoreCard(card){
 const ward=card.frontPrintedWard??null;
 if(ward&&(card.type!=='character'||!text(ward.exceptName)||ward.maxPrintedBp!==3500||
  Object.keys(ward).some(k=>!['exceptName','maxPrintedBp'].includes(k))))
  throw Error(card.id+' invalid front ward');
 const leave=card.frontNamedLeaveInstead??null;
 if(leave&&(card.type!=='character'||!text(leave.name)||leave.minSelfBp!==500||
  leave.minTargetBp!==4000||Object.keys(leave).some(k=>!['name','minSelfBp','minTargetBp'].includes(k))))
  throw Error(card.id+' invalid named leave replacement');
 const outside=card.outsideUnionPlay??null;
 if(outside&&(card.type!=='character'||outside.minNames!==6||outside.energyCut!==2||
  outside.apCut!==1||Object.keys(outside).some(k=>!['minNames','energyCut','apCut'].includes(k))))
  throw Error(card.id+' invalid outside union play');
 if(card.unraidedReadyOnBlock!=null&&card.unraidedReadyOnBlock!==1)
  throw Error(card.id+' invalid unraided double block');
 if(card.unraidedAttackDamage!=null&&card.unraidedAttackDamage!==2)
  throw Error(card.id+' invalid unraided damage');
 if((card.unraidedReadyOnBlock||card.unraidedAttackDamage)&&!card.raidName)
  throw Error(card.id+' unraided keyword needs a raid print');
 const ban=card.raidBanOtherTrait??null;
 if(ban&&(!card.raidName||!text(ban.trait)||!text(ban.exceptName)||
  Object.keys(ban).some(k=>!['trait','exceptName'].includes(k))))
  throw Error(card.id+' invalid raid trait ban');
 const end=card.attackEndProgram??null;
 if(end&&(!Array.isArray(end)||end.some(op=>op?.op!=='attackEndRestWake')))
  throw Error(card.id+' invalid attack-end program');
 const chain=card.outsideChainRaid??null;
 if(chain&&(card.type!=='character'||!text(chain.name)||chain.min!==6||!text(chain.watchName)||
  Object.keys(chain).some(k=>!['name','min','watchName'].includes(k))))
  throw Error(card.id+' invalid outside chain raid');
 const sniper=card.unblockedIfName??null;
 if(sniper&&(!text(sniper)||card.type!=='character'))
  throw Error(card.id+' invalid named unblocked draw');
}

function traitNames(api,pack,s,owner,trait){
 const names=new Set();
 for(const c of api.field(s.players[owner])){
  if(!api.printedFieldCard(c))continue;
  const printed=api.card(pack,c);
  if(api.cardHasTrait(printed,trait)&&printed.name)names.add(printed.name);
 }
 return names.size;
}
function unionNames(api,pack,s,owner){
 const names=new Set();
 for(const c of api.field(s.players[owner])){
  if(!api.printedFieldCard(c))continue;
  const printed=api.card(pack,c);
  if((api.cardHasTrait(printed,'ノアの一族')||api.cardHasName(printed,'ノアの方舟',false))&&printed.name)
   names.add(printed.name);
 }
 return names.size;
}
function named(api,pack,s,c,name){
 return !!c&&api.printedFieldCard(c)&&api.cardHasName(api.card(pack,c),name,api.originalEffectsDisabled(s,c));
}
function onFront(s,owner,uid){return s.players[owner].front.some(c=>c?.uid===uid);}
function finish(api,pack,s){s.pending=null;api.continueQueue(pack,s);}
function nameKey(s,owner,key){return (s.mainReadyOnceByName[owner]||[]).includes(key);}
function markName(s,owner,key){if(!nameKey(s,owner,key))s.mainReadyOnceByName[owner].push(key);}
function markCard(s,uid){if(!s.mainAbilityUsedUids.includes(uid))s.mainAbilityUsedUids.push(uid);}
function buff(c,s,amount){c.buffs??=[];c.buffs.push({bp:amount,untilTurn:s.turn});}
function frontHits(api,pack,s,owner,test){
 return s.players[owner].front.filter(c=>c&&api.card(pack,c).type==='character'&&test(c)).map(c=>c.uid);
}
function otherTrait(api,pack,s,owner,trait,exceptName){
 return s.players[owner].front.some(c=>c&&api.printedFieldCard(c)&&
  api.cardHasTrait(api.card(pack,c),trait)&&!named(api,pack,s,c,exceptName));
}
function movedThisTurn(s,uid){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===uid&&
  ((e.from==='front'&&e.to==='energy')||(e.from==='energy'&&e.to==='front')));
}
function usedTrait(api,pack,s,owner,trait){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.from==='hand'&&
  (e.to==='outside'||e.to==='resolvingEvents'||e.to==='removed')&&
  api.cardHasTrait(api.card(pack,{uid:e.uid,cardId:e.cardId}),trait));
}
function offerLook(api,pack,s,owner,sourceUid,count,name){
 const deck=s.players[owner].deck;
 const uids=deck.slice(0,count).map(c=>c.uid);
 if(!uids.length)return false;
 const choices=uids.filter(uid=>api.cardHasName(api.card(pack,deck.find(c=>c.uid===uid)),name,false));
 s.pending={kind:'effect-print-look',player:owner,sourceUid,uids,choices,optional:true,rest:'bottom'};
 return true;
}
function offerEntry(s,owner,sourceUid,spec){
 const choices=s.players[owner][spec.from].filter(c=>{
  if(c.faceDown===true)return false;
  const printed=spec.card(c);
  if(spec.filter.color&&printed.color!==spec.filter.color)return false;
  if(spec.filter.type&&printed.type!==spec.filter.type)return false;
  if(Number.isInteger(spec.filter.ap)&&printed.ap!==spec.filter.ap)return false;
  if(Number.isInteger(spec.filter.maxEnergy)&&printed.energy>spec.filter.maxEnergy)return false;
  if(spec.filter.trait&&!spec.hasTrait(printed,spec.filter.trait))return false;
  if(spec.filter.name&&printed.name!==spec.filter.name&&!(printed.nameAliases||[]).includes(spec.filter.name))return false;
  return true;
 }).map(c=>c.uid);
 if(!choices.length)return false;
 s.pending={kind:'effect-print',player:owner,sourceUid,step:'card',from:spec.from,choices,
  lines:spec.lines,ready:spec.ready===true,skipOnPlay:spec.skipOnPlay===true,optional:spec.optional!==false,
  activeSelf:null,filter:spec.filter};
 return true;
}

export function offerNamedFrontLeave(api,pack,s,owner,c,line,slot,opts){
 const rule=api.card(pack,c).frontNamedLeaveInstead;
 if(!rule||opts.skipReplacement||opts.declinedNamedLeave||api.originalEffectsDisabled(s,c))return false;
 const key=c.uid+'|namedLeave';
 if((s.onceEffectUses[owner]||[]).includes(key))return false;
 if(api.bp(pack,s,c)<rule.minSelfBp)return false;
 const choices=s.players[owner].front.filter(x=>x&&x.uid!==c.uid&&named(api,pack,s,x,rule.name)&&
  api.bp(pack,s,x)>=rule.minTargetBp).map(x=>x.uid);
 if(!choices.length)return false;
 s.pending={kind:'effect-print',player:owner,sourceUid:c.uid,step:'named-leave',choices,optional:true,
  line,slot,by:opts.by??null,postImpact:opts.postImpact===true,retireCause:opts.cause||null};
 return true;
}

export function frontWardBlocks(api,pack,s,selector,uid,sourceType){
 if(selector!==0&&selector!==1)return false;
 if(sourceType!=='character'&&sourceType!=='event'&&sourceType!=='unknown')return false;
 const owner=Number(String(uid).split('-')[0]);
 if(owner!==0&&owner!==1||selector===owner)return false;
 const target=s.players[owner].front.find(c=>c?.uid===uid);
 if(!target||!api.printedFieldCard(target)||api.card(pack,target).type!=='character')return false;
 const printed=api.card(pack,target);
 return s.players[owner].front.some(ally=>{
  if(!ally||ally.uid===target.uid)return false;
  const rule=api.card(pack,ally).frontPrintedWard;
  if(!rule||api.originalEffectsDisabled(s,ally)||!api.raidBoxTextLive(pack,ally,'frontWard'))return false;
  if(named(api,pack,s,target,rule.exceptName))return false;
  return (printed.bp||0)<=rule.maxPrintedBp;
 });
}

export function unionOutsideCut(api,pack,s,owner,printed){
 const rule=printed?.outsideUnionPlay;
 if(!rule||unionNames(api,pack,s,owner)<rule.minNames)return null;
 return rule;
}
export function raidTraitBanned(api,pack,s,owner,printed){
 const rule=printed?.raidBanOtherTrait;
 if(!rule)return false;
 return [...s.players[owner].front,...s.players[owner].energy].some(c=>c&&api.printedFieldCard(c)&&
  api.cardHasTrait(api.card(pack,c),rule.trait)&&!named(api,pack,s,c,rule.exceptName));
}
export function printMoreSniperProved(card,pack,s,owner,physical){
 const effect=(card(pack,physical).effects?.onPlay||[]).find(e=>e.op==='grantSniperIfName');
 if(!effect)return false;
 const live=[...s.players[owner].front,...s.players[owner].energy].some(c=>named({
  printedFieldCard:c2=>!!c2&&c2.faceDown!==true,
  card,cardHasName:(d,name)=>d?.name===name||(d?.nameAliases||[]).includes(name),
  originalEffectsDisabled:()=>false
 },pack,s,c,effect.name));
 const entered=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===physical.uid&&
  (e.to==='front'||e.to==='energy'));
 return live&&entered;
}
export function printMoreLowProved(card,pack,s,physical,low){
 const printed=card(pack,physical);
 const effect=(printed.effects?.onAttack||[]).find(e=>
  (e.op==='optionalDiscardBlockChoice'||e.op==='drawThenBlockChoice')&&(e.floors||[]).includes(low.bp));
 if(!effect)return false;
 if(effect.op==='optionalDiscardBlockChoice')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.sourceUid===physical.uid&&
   e.from==='hand'&&e.to==='outside');
 return (s.attacksByUid?.[physical.uid]||0)>=1;
}
export function printMoreCeilingProved(card,pack,s,physical,ceiling){
 const printed=card(pack,physical);
 const listed=[...(printed.effects?.onAttack||[]),...(printed.attackEndProgram||[])];
 const effect=listed.find(e=>(e.ceilings||[]).includes(ceiling.bp)||e.ceiling===ceiling.bp);
 if(!effect)return false;
 if(effect.op==='attackEndRestWake')return s.mainAbilityUsedUids.includes(physical.uid+'|attackEndCeiling');
 if(effect.op==='optionalDiscardBlockChoice')
  return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.sourceUid===physical.uid&&
   e.from==='hand'&&e.to==='outside');
 return (s.attacksByUid?.[physical.uid]||0)>=1;
}

function playedBy(s,eventUid){
 return (s.printMorePlayedBy||[]).find(e=>e.turn===s.turn&&e.eventUid===eventUid&&e.byName==='神田ユウ');
}
function rememberPlay(s,eventUid,sourceUid){
 s.printMorePlayedBy??=[];
 s.printMorePlayedBy.push({turn:s.turn,eventUid,byName:'神田ユウ',sourceUid});
}

export function queuePrintMoreAttackEnd(api,pack,s,attacker){
 const owner=s.active,printed=api.card(pack,attacker);
 const live=!api.originalEffectsDisabled(s,attacker)&&
  (s.players[owner].front.some(c=>c?.uid===attacker.uid)||s.players[owner].energy.some(c=>c?.uid===attacker.uid));
 if(live&&api.raidBoxTextLive(pack,attacker,'attackEnd')){
  for(const effect of printed.attackEndProgram||[])
   s.effectQueue.push({...effect,owner,sourceUid:attacker.uid});
 }
 const raided=!!(printed.raidName||printed.raidTrait)&&(attacker.stack||[]).some(x=>x.faceDown!==true);
 if(!raided)return;
 for(const card of s.players[owner].outside){
  const rule=api.card(pack,card).outsideChainRaid;
  if(!rule||!named(api,pack,s,attacker,rule.name))continue;
  if(nameKey(s,owner,rule.watchName+'|chain'))continue;
  const count=s.players[owner].outside.filter(c=>api.card(pack,c).name===rule.watchName).length;
  if(count<rule.min)continue;
  s.effectQueue.push({op:'chainRaidOffer',owner,sourceUid:card.uid,attackerUid:attacker.uid,
   name:rule.name,min:rule.min,watchName:rule.watchName});
  break;
 }
}
export function queuePrintMorePhaseEnd(api,pack,s,turnPlayer){
 const jobs=[];
 for(const c of [...s.players[turnPlayer].front,...s.players[turnPlayer].energy].filter(Boolean)){
  const g=c.grantedAttackEndRetire;
  if(g&&g.turn===s.turn&&g.stamp===c.fieldEntryStamp)
   jobs.push({op:'printMoreRetire',owner:turnPlayer,sourceUid:c.uid});
 }
 const foe=1-turnPlayer;
 for(const c of [...s.players[foe].front,...s.players[foe].energy].filter(Boolean)){
  const g=c.grantedOppAttackEndRetire;
  if(g&&g.stamp===c.fieldEntryStamp&&Number.isInteger(g.untilOwnTurnStart)&&
   g.untilOwnTurnStart>s.players[foe].ownTurns)
   jobs.push({op:'printMoreRetire',owner:foe,sourceUid:c.uid});
 }
 if(jobs.length)s.effectQueue.push(...jobs);
}

export function runSharedPrintMoreJob(api,pack,s,job){
 if(job.op==='printMoreRetire'){
  const found=api.location(s,job.owner,job.sourceUid);
  if(found)api.retire(pack,s,job.owner,found.line,found.slot,{by:'effect',controller:job.owner,sourceUid:job.sourceUid});
  return true;
 }
 if(!MORE_OPS.has(job.op))return false;
 const owner=job.owner,pl=s.players[owner],self=api.location(s,owner,job.sourceUid);
 if(job.op==='raidedOptionalBpDown'){
  if(traitNames(api,pack,s,owner,job.trait)<job.minNames)return true;
  const choices=frontHits(api,pack,s,1-owner,c=>api.bp(pack,s,c)>=job.minBp);
  if(choices.length)s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'bp-down',
   choices,optional:true,amount:-job.amount,self:null};
  return true;
 }
 if(job.op==='optionalDrawThenDiscard'){
  if(!namedField(api,pack,s,owner,'アルマ・カルマ')||!pl.deck.length)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'draw-discard',optional:true};
  return true;
 }
 if(job.op==='millThenDeployNamed'){
  if(otherTrait(api,pack,s,owner,job.trait,job.exceptName)||pl.deck.length<job.mill)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'mill-deploy',optional:true,
   mill:job.mill,filter:{type:'character',color:job.color,name:job.name,maxEnergy:job.maxEnergy}};
  return true;
 }
 if(job.op==='attackPutScale'){
  const cheap=usedTrait(api,pack,s,owner,job.usedTrait)||traitNames(api,pack,s,owner,job.trait)>=job.minNames;
  const hand=cheap?1:2,deck=cheap?1:2;
  if(pl.hand.length<hand||pl.deck.length<deck)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'put-hand',
   need:hand,deck,selected:[],bp:job.bp,optional:false};
  return true;
 }
 if(job.op==='sixPlay'){
  if(s.active!==owner||otherTrait(api,pack,s,owner,job.trait,job.exceptName)||!pl.hand.length)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'six-discard',
   usedTrait:job.usedTrait,optional:true};
  return true;
 }
 if(job.op==='millSelfTop'){
  const count=Math.min(job.mill,pl.deck.length);
  for(let i=0;i<count;i++)api.moveOwnedLinear(pack,s,{owner,from:'deck',to:'outside',index:0,
   reason:'own-effect',sourceUid:job.sourceUid});
  const index=pl.outside.findIndex(c=>c.uid===job.sourceUid);
  if(index>=0)api.moveOwnedLinear(pack,s,{owner,from:'outside',to:'deck',index,deckPosition:'top',
   reason:'own-effect',sourceUid:job.sourceUid});
  return true;
 }
 if(job.op==='tuckOutsideBlue'){
  const choices=pl.outside.filter(c=>c.faceDown!==true&&api.card(pack,c).type==='character'&&
   api.card(pack,c).color===job.color&&api.card(pack,c).energy<=job.maxEnergy).map(c=>c.uid);
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'tuck',choices,
   max:job.max,selected:[],names:job.names,min:job.min,optional:true};
  return true;
 }
 if(job.op==='lookTopNameBottom'){
  if(job.frontOnly&&!onFront(s,owner,job.sourceUid))return true;
  offerLook(api,pack,s,owner,job.sourceUid,job.count,job.name);
  return true;
 }
 if(job.op==='replayFrontLookIfMoved'){
  if(!movedThisTurn(s,job.sourceUid))return true;
  const look=(api.card(pack,self?.c||{cardId:''}).effects?.onPlay||[]).find(e=>e.op==='lookTopNameBottom');
  if(look)offerLook(api,pack,s,owner,job.sourceUid,look.count,look.name);
  return true;
 }
 if(job.op==='grantSniperIfName'){
  if(self&&namedField(api,pack,s,owner,job.name))
   self.c.sniperGranted={turn:s.turn,stamp:self.c.fieldEntryStamp};
  return true;
 }
 if(job.op==='grantOppAttackEndLeave'){
  if(self)self.c.grantedOppAttackEndRetire={stamp:self.c.fieldEntryStamp,
   untilOwnTurnStart:pl.ownTurns+1};
  return true;
 }
 if(job.op==='retireOppByUnion'){
  const cap=unionNames(api,pack,s,owner)*1000;
  const choices=frontHits(api,pack,s,1-owner,c=>api.bp(pack,s,c)<=cap);
  if(choices.length)s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'retire-opp',
   choices,optional:true};
  return true;
 }
 if(job.op==='raidPlayBuffImpact'){
  if(self){buff(self.c,s,job.bp);self.c.impactGranted={turn:s.turn,stamp:self.c.fieldEntryStamp,amount:job.impact};}
  return true;
 }
 if(job.op==='drawThenBlockChoice'||job.op==='optionalDiscardBlockChoice'){
  if(job.op==='drawThenBlockChoice')api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  const count=unionNames(api,pack,s,owner);
  if(count<job.minNames)return true;
  const both=job.bothNames>0&&count>=job.bothNames;
  if(job.op==='optionalDiscardBlockChoice'){
   if(!pl.hand.length)return true;
   s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'block-discard',
    floors:job.floors,ceilings:job.ceilings,both,optional:true};
   return true;
  }
  openBlock(s,owner,job.sourceUid,job.floors,job.ceilings,both);
  return true;
 }
 if(job.op==='deployOutsideSkipPlay'){
  const cap=unionNames(api,pack,s,owner)>=4?job.raised:job.maxEnergy;
  offerEntry(s,owner,job.sourceUid,{from:'outside',lines:['front','energy'],ready:false,skipOnPlay:true,
   optional:true,filter:{type:'character',color:job.color,trait:job.trait,ap:job.ap,maxEnergy:cap},
   card:c=>api.card(pack,c),hasTrait:(d,trait)=>api.cardHasTrait(d,trait)});
  return true;
 }
 if(job.op==='optionalBottomDraw'){
  if(traitNames(api,pack,s,owner,job.trait)<job.minNames)return true;
  const choices=frontHits(api,pack,s,1-owner,c=>api.bp(pack,s,c)<=job.maxBp);
  if(choices.length)s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'bottom-37',
   choices,optional:true,bottomDraw:true};
  return true;
 }
 if(job.op==='lockBlockerUntilLeaveFront')return true;
 if(job.op==='chainRaidOffer'){
  if(nameKey(s,owner,job.watchName+'|chain'))return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'chain',
   attackerUid:job.attackerUid,watchName:job.watchName,optional:true};
  return true;
 }
 if(job.op==='attackEndDrawBase'){
  if(!self)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'end-draw',draw:job.draw,
   optional:true,after:'base'};
  return true;
 }
 if(job.op==='attackEndLockBase'){
  const choices=frontHits(api,pack,s,1-owner,()=>true);
  if(choices.length)s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'end-lock',
   choices,optional:true};
  return true;
 }
 if(job.op==='attackEndRestWake'){
  if(!self||traitNames(api,pack,s,owner,job.trait)<job.minNames)return true;
  const key=self.c.uid+'|attackEnd';
  if(s.mainAbilityUsedUids.includes(key))return true;
  const choices=s.players[owner].front.filter(c=>c?.ready&&c.uid!==self.c.uid).map(c=>c.uid);
  if(!choices.length)return true;
  markCard(s,key);
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'end-rest',choices,
   ceiling:job.ceiling,optional:true};
  return true;
 }
 if(job.op==='optionalRetireDeploySkip'){
  const choices=api.field(pl).filter(c=>api.card(pack,c).type==='character').map(c=>c.uid);
  if(choices.length)s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'retire-deploy',
   choices,optional:true,filter:{type:'character',color:job.color,ap:job.ap,maxEnergy:job.maxEnergy}};
  return true;
 }
 if(job.op==='modeBottomOrDeploy'){
  const bottom=namedField(api,pack,s,owner,job.name)?
   frontHits(api,pack,s,1-owner,c=>api.bp(pack,s,c)<=job.maxBp):[];
  const deploy=pl.outside.filter(c=>{
   const printed=api.card(pack,c);
   return printed.color===job.color&&printed.energy<=job.maxEnergy&&printed.ap===job.ap&&
    printed.name===job.name;
  }).map(c=>c.uid);
  if(!bottom.length&&!deploy.length)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'mode-37',
   bottom,deploy,name:job.name,optional:false};
  return true;
 }
 if(job.op==='moveFrontEnergyCap'){
  const choices=frontHits(api,pack,s,1-owner,c=>api.bp(pack,s,c)<=job.maxBp);
  const witness=playedBy(s,job.sourceUid);
  if(!choices.length&&!witness)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'move-energy',
   choices,optional:true,witness:witness?.sourceUid||null,grant:'unchosen'};
  return true;
 }
 if(job.op==='retireRaiseGrant'){
  const cap=namedField(api,pack,s,owner,job.raiseName)?job.raised:job.bp;
  const choices=frontHits(api,pack,s,1-owner,c=>api.bp(pack,s,c)<=cap);
  const witness=playedBy(s,job.sourceUid);
  if(!choices.length&&!witness)return true;
  s.pending={kind:'effect-print',player:owner,sourceUid:job.sourceUid,step:'retire-grant',
   choices,optional:true,witness:witness?.sourceUid||null};
  return true;
 }
 return false;
}

function namedField(api,pack,s,owner,name){
 return api.field(s.players[owner]).some(c=>named(api,pack,s,c,name));
}
function openBlock(s,owner,sourceUid,floors,ceilings,both){
 s.pending={kind:'effect-print',player:owner,sourceUid,step:'block-pick',floors,ceilings,
  both,selected:[],optional:!both};
}

export function legalSharedPrintMorePending(api,pack,s){
 const q=s.pending;
 if(!q||q.kind!=='effect-print'||!q.step||!String(q.step).includes('-')&&q.step!=='tuck'&&q.step!=='put-hand'){
  if(!q||q.kind!=='effect-print')return null;
  if(!['named-leave','bp-down','draw-discard','mill-deploy','put-hand','six-discard','six-card',
   'tuck','under-card','under-mode','ward','unchosen','block-discard','block-pick','end-draw','end-lock',
   'end-rest','retire-deploy','mode-37','bottom-37','deploy-37','raid-37','move-energy','move-cell',
   'retire-grant','retire-opp','order-pair','field-discard','chain'].includes(q.step))return null;
 }
 const pl=s.players[q.player];
 if(q.step==='named-leave'||q.step==='bp-down'||q.step==='end-rest'||q.step==='end-lock'||
  q.step==='retire-opp'||q.step==='retire-deploy'||q.step==='ward'||q.step==='unchosen'||q.step==='under-card'){
  const decline=q.optional?[{type:'choosePrintMore',uid:null}]:[];
  return [...decline,...(q.choices||[]).map(uid=>({type:'choosePrintMore',uid}))];
 }
 if(q.step==='draw-discard'||q.step==='mill-deploy'||q.step==='end-draw'||q.step==='chain')
  return [{type:'choosePrintMore',mode:'skip'},{type:'choosePrintMore',mode:'yes'}];
 if(q.step==='put-hand'||q.step==='six-discard'||q.step==='block-discard'||q.step==='field-discard')
  return [...(q.optional?[{type:'choosePrintMore',uid:null}]:[]),
   ...pl.hand.filter(c=>!(q.selected||[]).includes(c.uid)).map(c=>({type:'choosePrintMore',uid:c.uid}))];
 if(q.step==='six-card')
  return [{type:'choosePrintMore',uid:null},...q.choices.map(uid=>({type:'choosePrintMore',uid}))];
 if(q.step==='tuck')
  return [{type:'choosePrintMore',uid:null},...q.choices.filter(uid=>!q.selected.includes(uid)&&
   pl.outside.some(c=>c.uid===uid)).map(uid=>({type:'choosePrintMore',uid}))];
 if(q.step==='under-mode')
  return [{type:'choosePrintMore',mode:'hand'},...(q.deploy?[{type:'choosePrintMore',mode:'deploy'}]:[])];
 if(q.step==='block-pick'){
  const left=[];
  if(!q.selected.includes('floor'))left.push({type:'choosePrintMore',mode:'floor'});
  if(!q.selected.includes('ceiling'))left.push({type:'choosePrintMore',mode:'ceiling'});
  if(!q.both)left.unshift({type:'choosePrintMore',mode:'skip'});
  return left;
 }
 if(q.step==='mode-37'){
  const out=[];
  if(q.bottom.length)out.push({type:'choosePrintMore',mode:'bottom'});
  if(q.deploy.length)out.push({type:'choosePrintMore',mode:'deploy'});
  return out;
 }
 if(q.step==='bottom-37')return [...(q.optional?[{type:'choosePrintMore',uid:null}]:[]),
  ...q.choices.map(uid=>({type:'choosePrintMore',uid}))];
 if(q.step==='deploy-37')return q.choices.map(uid=>({type:'choosePrintMore',uid}));
 if(q.step==='raid-37')return [{type:'choosePrintMore',mode:'rest'},...(q.bases.length?[{type:'choosePrintMore',mode:'raid'}]:[])];
 if(q.step==='raid-cell')return q.bases.map(uid=>{
  const pos=api.location(s,q.player,uid);
  return {type:'choosePrintMoreCell',line:pos.line,slot:pos.slot};
 });
 if(q.step==='move-energy')
  return [...(q.optional?[{type:'choosePrintMore',uid:null}]:[]),...q.choices.map(uid=>({type:'choosePrintMore',uid}))];
 if(q.step==='move-cell')return api.legalDestinations(s.players[1-q.player],'energy')
  .map(dest=>({type:'choosePrintMoreCell',...dest}));
 if(q.step==='retire-grant')
  return [...(q.optional?[{type:'choosePrintMore',uid:null}]:[]),...q.choices.map(uid=>({type:'choosePrintMore',uid}))];
 if(q.step==='order-pair')return q.choices.map(uid=>({type:'choosePrintMore',uid}));
 return null;
}

function grantUnchosen(api,s,owner,sourceUid,targetUid){
 api.grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:owner,sourceUid,
  targetUid,sourceLinked:false,selectionScope:'any',
  until:{player:owner,phase:'start',edge:'start'}});
}
function maybeGrant(api,pack,s,q){
 if(!q.witness)return finish(api,pack,s);
 const target=api.field(s.players[q.player]).find(c=>c.uid===q.witness);
 if(!target)return finish(api,pack,s);
 if(q.grant==='unchosen')grantUnchosen(api,s,q.player,target.uid,target.uid);
 else target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
 finish(api,pack,s);
}
function peelOneBase(api,pack,s,owner,sourceUid){
 const self=api.location(s,owner,sourceUid);
 const base=self?.c?.stack?.[0];
 if(!base)return;
 api.peelRaidBase(pack,s,owner,sourceUid,sourceUid);
}

export function resolveSharedPrintMorePending(api,pack,s,action){
 const q=s.pending;
 if(!q||q.kind!=='effect-print')return false;
 const pl=s.players[q.player];
 if(q.step==='named-leave'){
  if(action.type!=='choosePrintMore')throw Error('Illegal named leave');
  if(action.uid===null){
   if(!q.optional)throw Error('Named leave cannot be skipped');
   s.pending=null;
   api.retire(pack,s,q.player,q.line,q.slot,{by:q.by||'effect',controller:q.player,
    sourceUid:q.sourceUid,postImpact:q.postImpact,declinedNamedLeave:true,skipReplacement:false});
   return true;
  }
  const sub=pl.front.find(c=>c?.uid===action.uid);
  if(!sub||!q.choices.includes(action.uid))throw Error('Illegal named leave');
  s.onceEffectUses[q.player].push(q.sourceUid+'|namedLeave');
  s.pending=null;
  const pos=api.location(s,q.player,sub.uid);
  api.retire(pack,s,q.player,pos.line,pos.slot,{by:'effect',controller:q.player,sourceUid:q.sourceUid});
  return true;
 }
 if(q.step==='bp-down'){
  if(action.uid===null){if(!q.optional)throw Error('Cannot skip');finish(api,pack,s);return true;}
  const foe=s.players[1-q.player].front.find(c=>c?.uid===action.uid);
  if(!foe||!q.choices.includes(action.uid))throw Error('Illegal BP shift');
  buff(foe,s,q.amount);
  if(q.self){const self=api.location(s,q.player,q.self);if(self)buff(self.c,s,-q.amount);}
  if(q.wake){const wake=api.location(s,q.player,q.wake);if(wake)api.attemptFieldActive(s,q.player,wake.c);}
  finish(api,pack,s);return true;
 }
 if(q.step==='draw-discard'){
  if(action.mode==='skip'){finish(api,pack,s);return true;}
  if(action.mode!=='yes'||!pl.deck.length)throw Error('Illegal draw');
  api.draw(pack,s,q.player,1,{reason:'own-effect',sourceUid:q.sourceUid});
  if(!pl.hand.length){finish(api,pack,s);return true;}
  q.step='six-discard';q.optional=false;q.after='finish';return true;
 }
 if(q.step==='mill-deploy'){
  if(action.mode==='skip'){finish(api,pack,s);return true;}
  if(action.mode!=='yes'||pl.deck.length<q.mill)throw Error('Illegal mill');
  for(let i=0;i<q.mill;i++)api.moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
   reason:'own-effect',sourceUid:q.sourceUid});
  s.pending=null;
  const opened=offerEntry(s,q.player,q.sourceUid,{from:'outside',lines:['front','energy'],ready:false,
   optional:true,filter:q.filter,card:c=>api.card(pack,c),hasTrait:(d,t)=>api.cardHasTrait(d,t)});
  if(!opened)api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='put-hand'){
  if(!action.uid||!pl.hand.some(c=>c.uid===action.uid)||q.selected.includes(action.uid))
   throw Error('Illegal hand payment');
  q.selected.push(action.uid);
  if(q.selected.length<q.need)return true;
  for(const uid of q.selected){
   const index=pl.hand.findIndex(c=>c.uid===uid);
   api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,reason:'own-effect',sourceUid:q.sourceUid});
  }
  for(let i=0;i<q.deck;i++)api.moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
   reason:'own-effect',sourceUid:q.sourceUid});
  const self=api.location(s,q.player,q.sourceUid);
  if(self)buff(self.c,s,q.bp);
  if(q.wake){const wake=api.location(s,q.player,q.wake);if(wake)api.attemptFieldActive(s,q.player,wake.c);}
  finish(api,pack,s);return true;
 }
 if(q.step==='six-discard'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const index=pl.hand.findIndex(c=>c.uid===action.uid);
  if(index<0)throw Error('Illegal discard');
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,
   reason:q.after?'own-effect':'payment',sourceUid:q.sourceUid});
  if(q.after==='finish'||q.after==='base'){
   if(q.after==='base')peelOneBase(api,pack,s,q.player,q.sourceUid);
   finish(api,pack,s);return true;
  }
  const choices=pl.outside.filter(c=>api.cardHasTrait(api.card(pack,c),q.usedTrait)&&
   pl.deck.length>=api.card(pack,c).energy).map(c=>c.uid);
  if(!choices.length){finish(api,pack,s);return true;}
  q.step='six-card';q.choices=choices;return true;
 }
 if(q.step==='six-card'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const index=pl.outside.findIndex(c=>c.uid===action.uid);
  const physical=index>=0?pl.outside[index]:null;
  if(!physical||!q.choices.includes(action.uid))throw Error('Illegal six play');
  const energy=api.card(pack,physical).energy;
  if(pl.deck.length<energy)throw Error('Illegal six play');
  for(let i=0;i<energy;i++)api.moveOwnedLinear(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
   reason:'own-effect',sourceUid:q.sourceUid});
  const at=pl.outside.findIndex(c=>c.uid===action.uid);
  const event=pl.outside.splice(at,1)[0];
  pl.resolvingEvents.push(event);
  rememberPlay(s,event.uid,q.sourceUid);
  s.pending=null;
  s.effectQueue.unshift(...(api.card(pack,event).effects?.onPlay||[]).map(op=>({
   ...op,owner:q.player,sourceUid:event.uid})),
   {op:'completeResolvingEvent',owner:q.player,sourceUid:event.uid,destination:'removed',from:'outside',causeUid:q.sourceUid});
  api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='tuck'){
  if(action.uid===null||q.selected.length>=q.max){
   const self=api.location(s,q.player,q.sourceUid);
   const total=q.names.reduce((n,name)=>n+api.field(pl).filter(c=>named(api,pack,s,c,name)).length,0);
   if(self&&total>=q.min)api.attemptFieldActive(s,q.player,self.c);
   finish(api,pack,s);return true;
  }
  const index=pl.outside.findIndex(c=>c.uid===action.uid);
  const host=api.location(s,q.player,q.sourceUid);
  if(index<0||!host||!q.choices.includes(action.uid))throw Error('Illegal tuck');
  const physical=pl.outside.splice(index,1)[0];
  physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
  physical.stack=[];physical.under=[];physical.buffs=[];
  host.c.under??=[];host.c.under.push(physical);
  api.recordMove(pack,s,{physical,owner:q.player,from:'outside',to:'raid-under',
   reason:'own-effect',sourceUid:host.c.uid,wasFaceDown:false});
  q.selected.push(action.uid);
  return true;
 }
 if(q.step==='under-card'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const host=api.location(s,q.player,q.sourceUid);
  const under=(host?.c.under||[]).find(c=>c.uid===action.uid&&c.faceDown===true);
  if(!under)throw Error('Illegal under card');
  q.step='under-mode';q.uid=action.uid;
  q.deploy=host.c.entryTurn===s.turn&&pl.hand.length>0;
  return true;
 }
 if(q.step==='under-mode'){
  const host=api.location(s,q.player,q.sourceUid);
  const index=(host?.c.under||[]).findIndex(c=>c.uid===q.uid);
  if(!host||index<0)throw Error('Under card left');
  const physical=host.c.under.splice(index,1)[0];
  physical.faceDown=false;
  if(action.mode==='hand'){
   pl.hand.push(physical);
   api.recordMove(pack,s,{physical,owner:q.player,from:'raid-under',to:'hand',
    reason:'own-effect',sourceUid:host.c.uid});
   finish(api,pack,s);return true;
  }
  if(action.mode!=='deploy'||!q.deploy)throw Error('Illegal under entry');
  const hand=pl.hand[0];
  if(!hand)throw Error('Deploy replacement needs a hand card');
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index:0,
   reason:'payment',sourceUid:q.sourceUid});
  pl.outside.push(physical);
  api.recordMove(pack,s,{physical,owner:q.player,from:'raid-under',to:'outside',
   reason:'own-effect',sourceUid:host.c.uid});
  s.pending={kind:'effect-print',player:q.player,sourceUid:q.sourceUid,step:'card',from:'outside',
   choices:[physical.uid],lines:['front','energy'],ready:false,skipOnPlay:false,optional:false,
   activeSelf:null,filter:{}};
  return true;
 }
 if(q.step==='ward'||q.step==='unchosen'){
  if(!action.uid||!q.choices.includes(action.uid))throw Error('Illegal ward target');
  const target=api.field(pl).find(c=>c.uid===action.uid);
  if(!target)throw Error('Ward target left');
  if(q.step==='ward')target.printWard={turn:s.turn,stamp:target.fieldEntryStamp,noRest:true,noBounce:true,leaveInstead:true};
  else grantUnchosen(api,s,q.player,q.sourceUid,target.uid);
  finish(api,pack,s);return true;
 }
 if(q.step==='block-discard'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const index=pl.hand.findIndex(c=>c.uid===action.uid);
  if(index<0)throw Error('Illegal block discard');
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,reason:'payment',sourceUid:q.sourceUid});
  openBlock(s,q.player,q.sourceUid,q.floors,q.ceilings,q.both);
  return true;
 }
 if(q.step==='block-pick'){
  if(action.mode==='skip'){finish(api,pack,s);return true;}
  const self=api.location(s,q.player,q.sourceUid);
  if(!self||(action.mode!=='floor'&&action.mode!=='ceiling')||q.selected.includes(action.mode))
   throw Error('Illegal block immunity');
  if(action.mode==='floor')self.c.lowBpUnblockable={turn:s.turn,stamp:self.c.fieldEntryStamp,bp:q.floors[0]};
  else self.c.blockAtLeastGranted={turn:s.turn,stamp:self.c.fieldEntryStamp,bp:q.ceilings[0]};
  q.selected.push(action.mode);
  const need=q.both?2:1;
  if(q.selected.length>=need)finish(api,pack,s);
  return true;
 }
 if(q.step==='end-draw'){
  if(action.mode==='skip'){finish(api,pack,s);return true;}
  if(action.mode!=='yes')throw Error('Illegal attack-end draw');
  api.draw(pack,s,q.player,q.draw,{reason:'own-effect',sourceUid:q.sourceUid});
  if(q.opp||q.after!=='base'){finish(api,pack,s);return true;}
  if(!pl.hand.length){peelOneBase(api,pack,s,q.player,q.sourceUid);finish(api,pack,s);return true;}
  q.step='six-discard';q.optional=false;q.after='base';return true;
 }
 if(q.step==='end-lock'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const foe=s.players[1-q.player].front.find(c=>c?.uid===action.uid);
  if(!foe)throw Error('Illegal attack lock');
  api.grantContinuousState(s,{kind:'cannotAttack',controller:q.player,sourceUid:q.sourceUid,
   targetUid:foe.uid,sourceLinked:false,until:{player:q.player,phase:'start',edge:'start'}});
  peelOneBase(api,pack,s,q.player,q.sourceUid);
  finish(api,pack,s);return true;
 }
 if(q.step==='end-rest'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const ally=pl.front.find(c=>c?.uid===action.uid&&c.ready);
  const self=api.location(s,q.player,q.sourceUid);
  if(!ally||!self)throw Error('Illegal attack-end rest');
  ally.ready=false;
  api.noteOwnEffectRest(s,q.player,ally);
  api.attemptFieldActive(s,q.player,self.c);
  self.c.blockAtLeastGranted={turn:s.turn,stamp:self.c.fieldEntryStamp,bp:q.ceiling};
  markCard(s,self.c.uid+'|attackEndCeiling');
  finish(api,pack,s);return true;
 }
 if(q.step==='retire-deploy'){
  if(action.uid===null){finish(api,pack,s);return true;}
  const found=api.location(s,q.player,action.uid);
  if(!found)throw Error('Illegal own retirement');
  s.pending=null;
  const paused=api.retire(pack,s,q.player,found.line,found.slot,{by:'effect',controller:q.player,sourceUid:q.sourceUid});
  const opened=offerEntry(s,q.player,q.sourceUid,{from:'outside',lines:['front','energy'],ready:false,
   skipOnPlay:true,optional:true,filter:q.filter,card:c=>api.card(pack,c),hasTrait:(d,t)=>api.cardHasTrait(d,t)});
  if(!opened&&!paused)api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='mode-37'){
  if(action.mode==='bottom'&&q.bottom.length){q.step='bottom-37';q.choices=q.bottom;return true;}
  if(action.mode==='deploy'&&q.deploy.length){q.step='deploy-37';q.choices=q.deploy;return true;}
  throw Error('Illegal event mode');
 }
 if(q.step==='bottom-37'){
  if(action.uid===null){if(!q.optional)throw Error('This bottom cannot be skipped');finish(api,pack,s);return true;}
  const foeOwner=1-q.player;
  const foe=s.players[foeOwner].front.find(c=>c?.uid===action.uid);
  if(!foe||!q.choices.includes(action.uid))throw Error('Illegal bottom');
  s.pending=null;
  api.fieldToDeckBottom(pack,s,foeOwner,action.uid,q.sourceUid);
  if(s.players[foeOwner].deck.length)
   s.pending={kind:'effect-print',player:foeOwner,sourceUid:q.sourceUid,step:'end-draw',draw:1,optional:true,opp:true};
  else api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='deploy-37'){
  if(!q.choices.includes(action.uid)||!pl.outside.some(c=>c.uid===action.uid))throw Error('Illegal Allen');
  const printed=api.card(pack,pl.outside.find(c=>c.uid===action.uid));
  const bases=api.field(pl).filter(c=>api.validRaidBase(pack,s,q.player,c,printed));
  q.step='raid-37';q.uid=action.uid;q.bases=bases.map(c=>c.uid);
  return true;
 }
 if(q.step==='raid-37'){
  if(action.mode==='raid'){
   if(!q.bases.length)throw Error('Raid mode is not open');
   q.step='raid-cell';return true;
  }
  if(action.mode!=='rest')throw Error('Illegal Allen entry');
  s.pending={kind:'effect-print',player:q.player,sourceUid:q.sourceUid,step:'card',from:'outside',
   choices:[q.uid],lines:['front','energy'],ready:false,skipOnPlay:false,optional:false,activeSelf:null,
   filter:{name:q.name}};
  return true;
 }
 if(q.step==='raid-cell'){
  const base=pl[action.line]?.[action.slot];
  const card=pl.outside.find(c=>c.uid===q.uid);
  if(!base||!q.bases.includes(base.uid)||!card)throw Error('Illegal raid cell');
  pl.outside.splice(pl.outside.findIndex(c=>c.uid===card.uid),1);
  s.pending=null;
  api.performRaid(pack,s,q.player,card,base.uid,action.line,action.slot,undefined,
   {entryReady:true,entryCause:'outsideEffectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
  return true;
 }
 if(q.step==='move-energy'){
  if(action.uid===null){maybeGrant(api,pack,s,q);return true;}
  const foe=s.players[1-q.player].front.find(c=>c?.uid===action.uid);
  if(!foe||api.bp(pack,s,foe)>4000)throw Error('Illegal energy move');
  q.step='move-cell';q.uid=action.uid;return true;
 }
 if(q.step==='move-cell'){
  s.pending=null;
  const paused=api.effectMoveTo(pack,s,1-q.player,q.uid,'energy',action.slot,action.replaceUid,q.sourceUid);
  if(paused)return true;
  if(q.witness){
   s.pending={kind:'effect-print',player:q.player,sourceUid:q.sourceUid,step:'ward',choices:[],
    witness:q.witness,grant:'unchosen'};
   const target=api.field(pl).find(c=>c.uid===q.witness);
   if(target){q.step='unchosen';q.choices=[target.uid];return true;}
  }
  api.continueQueue(pack,s);return true;
 }
 if(q.step==='retire-grant'||q.step==='retire-opp'){
  if(action.uid===null){maybeGrant(api,pack,s,q);return true;}
  const foeOwner=1-q.player;
  const found=api.location(s,foeOwner,action.uid);
  if(!found||!q.choices.includes(action.uid))throw Error('Illegal retirement');
  s.pending=null;
  const paused=api.retire(pack,s,foeOwner,found.line,found.slot,{by:'opponent',controller:q.player,sourceUid:q.sourceUid});
  if(q.witness&&!paused){
   const target=api.field(pl).find(c=>c.uid===q.witness);
   if(target)target.impactGranted={turn:s.turn,stamp:target.fieldEntryStamp,amount:1};
  }
  if(!paused)api.continueQueue(pack,s);
  return true;
 }
 if(q.step==='order-pair'){
  if(!q.choices.includes(action.uid))throw Error('Illegal deck order');
  const first=pl.outside.findIndex(c=>c.uid===action.uid);
  const second=pl.outside.findIndex(c=>q.choices.includes(c.uid)&&c.uid!==action.uid);
  if(first<0||second<0)throw Error('Pair left outside');
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'deck',index:first,reason:'own-effect',sourceUid:q.sourceUid});
  const next=pl.outside.findIndex(c=>q.choices.includes(c.uid)&&c.uid!==action.uid);
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'outside',to:'deck',index:next,reason:'own-effect',sourceUid:q.sourceUid});
  finish(api,pack,s);return true;
 }
 if(q.step==='field-discard'){
  const index=pl.hand.findIndex(c=>c.uid===action.uid);
  if(index<0)throw Error('Field entry needs a discarded card');
  api.moveOwnedLinear(pack,s,{owner:q.player,from:'hand',to:'outside',index,reason:'payment',sourceUid:q.sourceUid});
  api.spendAp(pl,1);
  const at=pl.outside.findIndex(c=>c.uid===q.sourceUid);
  if(at<0)throw Error('Field left outside');
  s.pending=null;
  api.effectEnter(pack,s,{owner:q.player,from:'outside',uid:q.sourceUid,line:'energy',slot:q.slot,
   replaceUid:null,ready:false,sourceUid:q.sourceUid});
  return true;
 }
 if(q.step==='chain'){
  if(action.mode==='skip'){markName(s,q.player,q.watchName+'|chain');finish(api,pack,s);return true;}
  if(action.mode!=='yes')throw Error('Illegal chain raid');
  markName(s,q.player,q.watchName+'|chain');
  const attacker=api.location(s,q.player,q.attackerUid);
  if(!attacker)throw Error('Raider left');
  const origin=api.stripRaidTop(pack,s,q.player,attacker.c);
  const card=pl.outside.find(c=>c.uid===q.sourceUid);
  const pos=origin&&api.location(s,q.player,origin.uid);
  if(!card||!pos)throw Error('Chain raid lost its base');
  const index=pl.outside.findIndex(c=>c.uid===card.uid);
  pl.outside.splice(index,1);
  s.pending=null;
  api.performRaid(pack,s,q.player,card,origin.uid,pos.line,pos.slot,undefined,
   {entryReady:true,entryCause:'outsideEffectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
  return true;
 }
 return false;
}

export function legalSharedPrintMoreActivations(api,pack,s,player){
 if(s.phase!=='main'||s.pending)return [];
 const pl=s.players[player],out=[];
 const scan=[...pl.front,...pl.energy,...pl.outside];
 for(const card of scan){
  if(!card)continue;
  const ability=api.card(pack,card).mainAbility;
  if(!ability||!MORE_MAINS.has(ability.op))continue;
  if(api.originalEffectsDisabled(s,card)&&ability.op!=='bottomPairOnce'&&ability.op!=='fieldOutsideEnter')continue;
  const onField=api.field(pl).some(c=>c.uid===card.uid);
  const outside=pl.outside.some(c=>c.uid===card.uid);
  if(ability.op==='printReadyGate'&&onField&&!nameKey(s,player,ability.name+'|ready')&&
   pl.deck.length<=ability.deckAtMost&&namedField(api,pack,s,player,KANDA))
   out.push({type:'activate',uid:card.uid,mode:'printReadyGate'});
  if(ability.op==='crowdFrontDown'&&onFront(s,player,card.uid)&&!s.mainAbilityUsedUids.includes(card.uid)&&
   traitNames(api,pack,s,player,ability.trait)>=ability.minNames&&
   s.players[1-player].front.some(c=>c&&api.bp(pack,s,c)>=ability.minBp))
   out.push({type:'activate',uid:card.uid,mode:'printCrowd'});
  if(ability.op==='bottomPairOnce'&&outside&&!nameKey(s,player,'神田ユウ|bottom')&&pl.deck.length<=1&&
   pl.outside.some(c=>c.uid!==card.uid&&api.card(pack,c).energy===0&&api.card(pack,c).name===ability.name))
   out.push({type:'activate',uid:card.uid,mode:'printBottom'});
  if(ability.op==='underCardMain'&&card.ready&&onField&&(card.under||[]).some(c=>c.faceDown===true))
   out.push({type:'activate',uid:card.uid,mode:'printUnder'});
  if(ability.op==='entryTurnWard'&&onField&&card.entryTurn===s.turn&&!s.mainAbilityUsedUids.includes(card.uid)&&
   api.field(pl).some(c=>api.card(pack,c).type==='character'))
   out.push({type:'activate',uid:card.uid,mode:'printWard'});
  if(ability.op==='unchosenEntryMain'&&onField&&card.entryTurn===s.turn&&!s.mainAbilityUsedUids.includes(card.uid))
   out.push({type:'activate',uid:card.uid,mode:'printUnchosen'});
  if(ability.op==='printNameActive'&&onField&&!nameKey(s,player,ability.name+'|active')&&
   unionNames(api,pack,s,player)>=ability.minNames)
   out.push({type:'activate',uid:card.uid,mode:'printNameActive'});
  if(ability.op==='bouncePairDeploy'&&card.ready&&onField&&
   api.field(pl).some(c=>c.uid!==card.uid&&c.ready&&named(api,pack,s,c,ability.bounceName)))
   out.push({type:'activate',uid:card.uid,mode:'printPair'});
  if(ability.op==='fieldOutsideEnter'&&outside&&pl.hand.length&&pl.apCards?.some?.(c=>c.ready)&&
   ability.names.some(name=>namedField(api,pack,s,player,name))&&
   (s.players[player].energy.filter(c=>c&&api.card(pack,c).color==='purple').length>=ability.energy||
    api.energyReady(pack,s,player,{color:'purple',energy:ability.energy}))){
   const slot=api.legalDestinations(pl,'energy')[0];
   if(slot)out.push({type:'activate',uid:card.uid,mode:'printField',slot:slot.slot,replaceUid:slot.replaceUid||null});
  }
 }
 return out;
}

export function activateSharedPrintMore(api,pack,s,action){
 const pl=s.players[s.active];
 const selected=[...api.field(pl),...pl.outside].find(c=>c.uid===action.uid);
 if(!selected)return false;
 const ability=api.card(pack,selected).mainAbility;
 if(!ability)return false;
 if(action.mode==='printReadyGate'&&ability.op==='printReadyGate'){
  markName(s,s.active,ability.name+'|ready');
  api.attemptFieldActive(s,s.active,selected);
  return true;
 }
 if(action.mode==='printCrowd'&&ability.op==='crowdFrontDown'){
  markCard(s,selected.uid);
  const choices=frontHits(api,pack,s,1-s.active,c=>api.bp(pack,s,c)>=ability.minBp);
  s.pending={kind:'effect-print',player:s.active,sourceUid:selected.uid,step:'bp-down',choices,
   optional:false,amount:-ability.amount,self:selected.uid};
  const fresh=!nameKey(s,s.active,api.card(pack,selected).name+'|crowd');
  if(fresh)markName(s,s.active,api.card(pack,selected).name+'|crowd');
  s.pending.wake=fresh?selected.uid:null;
  return true;
 }
 if(action.mode==='printBottom'&&ability.op==='bottomPairOnce'){
  markName(s,s.active,'神田ユウ|bottom');
  const alma=pl.outside.find(c=>c.uid!==selected.uid&&api.card(pack,c).energy===0&&api.card(pack,c).name===ability.name);
  s.pending={kind:'effect-print',player:s.active,sourceUid:selected.uid,step:'order-pair',
   choices:[selected.uid,alma.uid]};
  return true;
 }
 if(action.mode==='printUnder'&&ability.op==='underCardMain'){
  api.noteOwnEffectRest(s,s.active,selected);
  selected.ready=false;
  const choices=(selected.under||[]).filter(c=>c.faceDown===true).map(c=>c.uid);
  s.pending={kind:'effect-print',player:s.active,sourceUid:selected.uid,pile:'under',uids:choices,
   choices,optional:false,step:'under-card'};
  return true;
 }
 if(action.mode==='printWard'&&ability.op==='entryTurnWard'){
  markCard(s,selected.uid);
  const choices=api.field(pl).filter(c=>api.card(pack,c).type==='character').map(c=>c.uid);
  s.pending={kind:'effect-print',player:s.active,sourceUid:selected.uid,step:'ward',choices,optional:false};
  return true;
 }
 if(action.mode==='printUnchosen'&&ability.op==='unchosenEntryMain'){
  markCard(s,selected.uid);
  const choices=api.field(pl).filter(c=>api.card(pack,c).type==='character').map(c=>c.uid);
  s.pending={kind:'effect-print',player:s.active,sourceUid:selected.uid,step:'unchosen',choices,optional:false};
  return true;
 }
 if(action.mode==='printNameActive'&&ability.op==='printNameActive'){
  markName(s,s.active,ability.name+'|active');
  api.attemptFieldActive(s,s.active,selected);
  return true;
 }
 if(action.mode==='printPair'&&ability.op==='bouncePairDeploy'){
  const other=api.field(pl).find(c=>c.uid!==selected.uid&&c.ready&&named(api,pack,s,c,ability.bounceName));
  if(!other)return false;
  api.bounceToHand(pack,s,s.active,other.uid,selected.uid,{reason:'own-effect',controller:s.active});
  api.bounceToHand(pack,s,s.active,selected.uid,selected.uid,{reason:'own-effect',controller:s.active});
  offerEntry(s,s.active,selected.uid,{from:'outside',lines:['front','energy'],ready:true,skipOnPlay:true,
   optional:true,filter:{name:ability.deployName,color:ability.color},
   card:c=>api.card(pack,c),hasTrait:()=>true});
  return true;
 }
 if(action.mode==='printField'&&ability.op==='fieldOutsideEnter'){
  s.pending={kind:'effect-print',player:s.active,sourceUid:selected.uid,step:'field-discard',
   slot:action.slot,optional:false};
  return true;
 }
 return false;
}

export function printMoreLookCards(api,pack,s,viewer){
 const q=s.pending;
 if(q?.kind!=='effect-print-look'||q.player!==viewer||q.pile!=='under')return null;
 const host=api.location(s,viewer,q.sourceUid);
 const cards=(host?.c.under||[]).filter(c=>q.uids.includes(c.uid));
 return cards.map(c=>{
  const printed=api.card(pack,c);
  return {uid:c.uid,cardId:c.cardId,name:printed.name,color:printed.color||''};
 });
}
