// Shared printed sentences for the last UA42 〈物語〉 identities.
// Every op is locked to the counts, names, and BP numbers on those cards.
// There is no monogatari opcode. A closed look keeps the whole window.
import {SHARED_PRINT_NEXT_OPS} from './shared-print-next.mjs';

export const SHARED_PRINT_LAST_OPS=Object.freeze([
 'searchTakeNames','searchTakeColor','grantBlockFloor','handOutsideReadyTrait',
 'retireFieldThenAp','declareEnergy','scaleHandBp','tuckIfUnder',
 'discardHandPerFacedown','activeIfEnergy','deployOutsideNamed','deployHandTraitRest',
 'originChoice','raidNamedUnder','pairBuffImpact','optionalRetireGrant','snakeChoice',
 'deployRaidOrigin','removedToOutsideEnter','orderWindow','drawIfFieldLeft','attackEndRestStrip','energyLossSwap',
 'allyFacedownStrip','payApRetireFront'
]);

const NAMES=['解呪の儀式','神原駿河','千石撫子','阿良々木暦','戦場ヶ原ひたぎ','羽川翼','忍野忍','八九寺真宵','蛇切縄'];

function namesOk(list,count){
 return Array.isArray(list)&&list.length===count&&new Set(list).size===count&&
  list.every(name=>NAMES.includes(name));
}
function keys(effect,allowed){
 return Object.keys(effect).length===allowed.length&&
  Object.keys(effect).every(key=>allowed.includes(key));
}

export function verifySharedPrintLastOp(effect){
 if(!SHARED_PRINT_LAST_OPS.includes(effect?.op))return false;
 const op=effect.op;
 if(op==='searchTakeNames'&&!(effect.count===5&&effect.take===2&&namesOk(effect.names,3)&&keys(effect,['op','count','take','names'])))
  throw Error('invalid name window');
 if(op==='searchTakeColor'&&!(effect.count===5&&effect.take===1&&effect.color==='red'&&effect.maxEnergy===2&&effect.thenAp===1&&keys(effect,['op','count','take','color','maxEnergy','thenAp'])))
  throw Error('invalid color window');
 if(op==='grantBlockFloor'&&!(namesOk(effect.names,3)&&effect.relation==='atLeast'&&effect.bp===4000&&keys(effect,['op','names','relation','bp'])))
  throw Error('invalid block floor grant');
 if(op==='handOutsideReadyTrait'&&!(effect.trait==='ファイヤーシスターズ'&&effect.once===true&&keys(effect,['op','trait','once'])))
  throw Error('invalid attack hand ready');
 if(op==='retireFieldThenAp'&&!(effect.name==='千石撫子'&&effect.ap===1&&keys(effect,['op','name','ap'])))
  throw Error('invalid field retirement AP cut');
 if(op==='declareEnergy'&&!(typeof effect.thenDraw==='boolean'&&keys(effect,['op','thenDraw'])))
  throw Error('invalid energy reveal');
 if(op==='scaleHandBp'&&!(effect.first===2000&&effect.each===1500&&keys(effect,['op','first','each'])))
  throw Error('invalid scaled hand penalty');
 if(op==='tuckIfUnder'&&!(effect.max===2&&['draw','buffDamage'].includes(effect.follow)&&keys(effect,['op','max','follow'])))
  throw Error('invalid optional tuck');
 if(op==='discardHandPerFacedown'&&!keys(effect,['op']))throw Error('invalid facedown discard');
 if(op==='activeIfEnergy'&&!keys(effect,['op']))throw Error('invalid energy-line active');
 if(op==='deployOutsideNamed'&&!(effect.color==='purple'&&effect.name==='阿良々木暦'&&effect.maxEnergy===2&&keys(effect,['op','color','name','maxEnergy'])))
  throw Error('invalid outside rest entry');
 if(op==='deployHandTraitRest'&&!(effect.trait==='ファイヤーシスターズ'&&effect.maxEnergy===3&&effect.ap===1&&keys(effect,['op','trait','maxEnergy','ap'])))
  throw Error('invalid trait rest entry');
 if(op==='originChoice'){
  const retire=effect.mode==='retireOrActive'&&effect.bp===3000&&effect.color==='red'&&
   effect.maxEnergy===3&&effect.ap===1&&keys(effect,['op','mode','bp','color','maxEnergy','ap']);
  const draw=effect.mode==='drawOrDouble'&&keys(effect,['op','mode']);
  if(!retire&&!draw)throw Error('invalid raid-origin choice');
 }
 if(op==='raidNamedUnder'&&!(effect.name==='神原駿河'&&keys(effect,['op','name'])))
  throw Error('invalid outside raid');
 if(op==='pairBuffImpact'&&!(effect.first==='戦場ヶ原ひたぎ'&&effect.second==='阿良々木暦'&&effect.minSum===4&&keys(effect,['op','first','second','minSum'])))
  throw Error('invalid paired buff');
 if(op==='optionalRetireGrant'&&!(effect.bp===5000&&effect.name==='神原駿河'&&effect.maxFacedown===2&&keys(effect,['op','bp','name','maxFacedown'])))
  throw Error('invalid retirement replacement grant');
 if(op==='snakeChoice'&&!(effect.name==='蛇切縄'&&effect.look===7&&keys(effect,['op','name','look'])))
  throw Error('invalid energy entry choice');
 if(op==='deployRaidOrigin'&&!(effect.name==='キスショット・アセロラオリオン・ハートアンダーブレード'&&keys(effect,['op','name'])))
  throw Error('invalid raid-origin entry');
 if(op==='removedToOutsideEnter'&&!keys(effect,['op']))throw Error('invalid removed return');
 if(['orderWindow','drawIfFieldLeft','attackEndRestStrip','energyLossSwap','allyFacedownStrip','payApRetireFront'].includes(op))
  throw Error('runtime job is not a printed effect');
 return true;
}

export function assertSharedPrintLastPlacement(card,name,program){
 const has=op=>program.some(effect=>effect.op===op);
 const character=name==='onPlay'&&card.type==='character';
 const event=name==='onPlay'&&card.type==='event';
 if(has('searchTakeNames')||has('searchTakeColor')||has('grantBlockFloor')||has('declareEnergy')||
  has('scaleHandBp')||has('activeIfEnergy')||has('deployOutsideNamed')||has('deployHandTraitRest')||
  has('originChoice')||has('snakeChoice')){
  if(!character)throw Error(card.id+' last onPlay sentence is a character effect');
 }
 if(has('handOutsideReadyTrait')||has('tuckIfUnder')){
  if(name!=='onAttack'||card.type!=='character')throw Error(card.id+' last attack sentence is a character onAttack effect');
 }
 if(has('discardHandPerFacedown')||has('deployRaidOrigin')||has('removedToOutsideEnter')){
  if(name!=='onRetire'||card.type!=='character')throw Error(card.id+' last retire sentence is a character onRetire effect');
 }
 if(has('retireFieldThenAp')||has('raidNamedUnder')||has('pairBuffImpact')||has('optionalRetireGrant')){
  if(!event)throw Error(card.id+' last event sentence is an event onPlay effect');
 }
}

const MAINS={
 wakeIfNameLeft:['op','name','oncePerTurn'],
 restReplayIfNameLeft:['op','name'],
 bounceNameRetire:['op','name','bp','frontOnly','oncePerTurn'],
 restNamedImpact:['op','name','frontOnly','oncePerTurn'],
 declareEnergyMain:['op','nameOnce'],
 frontBpDown:['op','minBp','bp','frontOnly','oncePerTurn'],
 handNameImpact:['op','name','oncePerTurn'],
 handRemoveBuff:['op','bp','oncePerTurn'],
 handRemoveDrawBoth:['op','bp','frontOnly','oncePerTurn'],
 restTuckGrant:['op','name','max','nameOnce']
};

export function sharedPrintLastMain(card,ability){
 if(!ability||!Object.hasOwn(MAINS,ability.op))return false;
 const allowed=MAINS[ability.op];
 if(card?.type!=='character'||!keys(ability,allowed))return false;
 if(ability.op==='wakeIfNameLeft'&&!(ability.name==='蛇切縄'&&ability.oncePerTurn===true))return false;
 if(ability.op==='restReplayIfNameLeft'&&ability.name!=='蛇切縄')return false;
 if(ability.op==='bounceNameRetire'&&!(ability.name==='阿良々木暦'&&ability.bp===1000&&ability.frontOnly===true&&ability.oncePerTurn===true))return false;
 if(ability.op==='restNamedImpact'&&!(ability.name==='阿良々木暦'&&ability.frontOnly===true&&ability.oncePerTurn===true))return false;
 if(ability.op==='declareEnergyMain'&&ability.nameOnce!=='羽川翼')return false;
 if(ability.op==='frontBpDown'&&!(ability.minBp===1500&&ability.bp===1000&&ability.frontOnly===true&&ability.oncePerTurn===true))return false;
 if(ability.op==='handNameImpact'&&!(ability.name==='羽川翼'&&ability.oncePerTurn===true))return false;
 if(ability.op==='handRemoveBuff'&&!(ability.bp===1000&&ability.oncePerTurn===true))return false;
 if(ability.op==='handRemoveDrawBoth'&&!(ability.bp===1000&&ability.frontOnly===true&&ability.oncePerTurn===true))return false;
 if(ability.op==='restTuckGrant'&&!(ability.name==='神原駿河'&&ability.max===2&&ability.nameOnce==='神原駿河'))return false;
 return true;
}

function fieldOk(card,field,check){
 return card[field]===undefined||check(card[field]);
}

export function validateSharedPrintLastCard(card){
 if(!fieldOk(card,'pairedMain',value=>sharedPrintLastMain(card,value)))
  throw Error(card.id+' invalid paired main');
 if(!fieldOk(card,'blockFloorIfNameLeft',value=>value?.name==='蛇切縄'&&value.relation==='atMost'&&value.bp===3000&&keys(value,['name','relation','bp'])))
  throw Error(card.id+' invalid printed block floor');
 if(!fieldOk(card,'energyLossSwap',value=>value?.trait==='ファイヤーシスターズ'&&keys(value,['trait'])))
  throw Error(card.id+' invalid energy swap');
 if(!fieldOk(card,'attackEndRestStrip',value=>value?.name==='神原駿河'&&keys(value,['name'])))
  throw Error(card.id+' invalid attack-end strip');
 if(!fieldOk(card,'allyBattleWin',value=>value?.name==='阿良々木暦'&&keys(value,['name'])))
  throw Error(card.id+' invalid ally battle win');
 if(!fieldOk(card,'handApWhileName',value=>value?.name==='神原駿河'&&value.amount===1&&keys(value,['name','amount'])))
  throw Error(card.id+' invalid hand AP while named');
 if(!fieldOk(card,'removedPayRetire',value=>value?.color==='red'&&value.min===3&&value.ap===1&&value.bp===4000&&keys(value,['color','min','ap','bp'])))
  throw Error(card.id+' invalid removed AP retirement');
 if(!fieldOk(card,'attackWinDiscardIfEnergy',value=>namesOk(value?.names,2)&&keys(value,['names'])))
  throw Error(card.id+' invalid attack-win discard');
 const used=new Set();
 for(const program of Object.values(card.effects||{}))
  for(const effect of program||[])if(SHARED_PRINT_LAST_OPS.includes(effect?.op))used.add(effect.op);
 if(card.effects)for(const effect of Object.values(card.effects).flat())
  if(SHARED_PRINT_NEXT_OPS.includes(effect?.op)&&SHARED_PRINT_LAST_OPS.includes(effect?.op))
   throw Error(card.id+' shared op collided');
}

function open(s,body){s.pending={kind:'effect-last',...body};}
function finish(s,pack){s.pending=null;apiContinue(pack,s);}
let apiContinue=null;
let apiPack=null;
function deckIndex(pl,uid){return pl.deck.findIndex(card=>card.uid===uid);}
function lookWindow(pl,count){
 const cards=pl.deck.slice(0,Math.min(count,pl.deck.length));
 return {cards,uids:cards.map(card=>card.uid)};
}
function emptyCells(api,pl,lines){
 return lines.flatMap(line=>api.legalDestinations(pl,line)
  .filter(dest=>!dest.replaceUid).map(dest=>({line,slot:dest.slot})));
}
function nameLeft(api,pack,s,owner,name){
 return (s.zoneMoveEvents||[]).some(event=>event.turn===s.turn&&event.owner===owner&&
  event.reason==='retirement'&&(event.to==='outside'||event.to==='removed')&&
  api.cardHasName(api.card(pack,{uid:event.uid,cardId:event.cardId}),name,false));
}
function live(api,pack,s,card,feature){
 return !api.originalEffectsDisabled(s,card)&&api.raidBoxTextLive(pack,card,feature);
}
function rest(api,s,player,card){
 api.noteOwnEffectRest(s,player,card);
 card.ready=false;
}
function named(api,pack,s,card,name){
 return api.cardHasName(api.card(pack,card),name,api.originalEffectsDisabled(s,card));
}
function raided(card){return card.faceDown!==true&&(card.stack||[]).length>0;}

export function runSharedPrintLastJob(api,pack,s,job){
 apiContinue=api.continueQueue;
 apiPack=pack;
 const owner=job.owner,pl=s.players[owner];
 if(job.op==='searchTakeNames'||job.op==='searchTakeColor'){
  if(job.op==='searchTakeColor')pl.nextColorEnergyApCut={turn:s.turn,color:job.color,
   maxEnergy:job.maxEnergy,amount:job.thenAp,sourceUid:job.sourceUid};
  const window=lookWindow(pl,job.count);
  if(!window.uids.length)return true;
  const choices=window.cards.filter(card=>{
   const printed=api.card(pack,card);
   return job.op==='searchTakeNames'?job.names.some(name=>api.cardHasName(printed,name,false)):
    printed.color===job.color&&printed.energy<=job.maxEnergy;
  }).map(card=>card.uid);
  open(s,{kind:'effect-next',mode:'look',player:owner,sourceUid:job.sourceUid,
   uids:window.uids,choices,take:job.take,selected:[]});
  return true;
 }
 if(job.op==='grantBlockFloor'){
  const choices=api.field(pl).filter(card=>job.names.some(name=>named(api,pack,s,card,name)))
   .map(card=>card.uid);
  if(choices.length)open(s,{mode:'floor',player:owner,sourceUid:job.sourceUid,choices,
   relation:job.relation,bp:job.bp});
  return true;
 }
 if(job.op==='handOutsideReadyTrait'){
  const loc=api.location(s,owner,job.sourceUid);
  const key=job.sourceUid+'|handReady';
  if(!loc||s.onceEffectUses[owner].includes(key)||!pl.hand.length)return true;
  open(s,{mode:'handReady',player:owner,sourceUid:job.sourceUid,trait:job.trait,key,
   choices:pl.hand.map(card=>card.uid)});
  return true;
 }
 if(job.op==='retireFieldThenAp'){
  const choices=api.field(pl).filter(card=>api.card(pack,card).type==='field').map(card=>card.uid);
  if(!choices.length)return true;
  open(s,{mode:'retireField',player:owner,sourceUid:job.sourceUid,choices,name:job.name,ap:job.ap});
  return true;
 }
 if(job.op==='declareEnergy'){
  open(s,{mode:'number',player:owner,sourceUid:job.sourceUid,thenDraw:job.thenDraw===true,
   numbers:[0,1,2,3,4,5,6,7,8]});
  return true;
 }
 if(job.op==='scaleHandBp'){
  const choices=s.players[1-owner].front.filter(card=>card&&api.card(pack,card).type==='character')
   .map(card=>card.uid);
  open(s,{mode:'scale',player:owner,sourceUid:job.sourceUid,choices,first:job.first,each:job.each,
   optional:true});
  return true;
 }
 if(job.op==='tuckIfUnder'){
  const loc=api.location(s,owner,job.sourceUid);
  if(!loc||api.directFacedowns(loc.c).length>job.max||!pl.deck.length)return true;
  open(s,{mode:'tuck',player:owner,sourceUid:job.sourceUid,follow:job.follow});
  return true;
 }
 if(job.op==='discardHandPerFacedown'){
  const count=job.facedownCount||0;
  if(!count||!pl.hand.length)return true;
  const need=Math.min(count,pl.hand.length);
  if(pl.hand.length===need){
   for(const card of [...pl.hand])moveHandOutside(api,pack,s,owner,card.uid,job.sourceUid);
   return true;
  }
  open(s,{mode:'discardCount',player:owner,sourceUid:job.sourceUid,need,picked:[]});
  return true;
 }
 if(job.op==='activeIfEnergy'){
  const loc=api.location(s,owner,job.sourceUid);
  if(loc?.line==='energy')api.attemptFieldActive(s,owner,loc.c);
  return true;
 }
 if(job.op==='deployOutsideNamed'||job.op==='deployHandTraitRest'){
  const zone=job.op==='deployOutsideNamed'?pl.outside:pl.hand;
  const choices=zone.filter(card=>{
   const printed=api.card(pack,card);
   if(job.op==='deployOutsideNamed')
    return printed.type==='character'&&printed.color===job.color&&printed.energy<=job.maxEnergy&&
     named(api,pack,s,card,job.name);
   return printed.type==='character'&&printed.energy<=job.maxEnergy&&printed.ap===job.ap&&
    api.cardHasTrait(printed,job.trait);
  }).map(card=>card.uid);
  const cells=emptyCells(api,pl,job.op==='deployOutsideNamed'?['front','energy']:['front','energy']);
  if(choices.length&&cells.length)open(s,{mode:'entry',player:owner,sourceUid:job.sourceUid,
   choices,from:job.op==='deployOutsideNamed'?'outside':'hand',ready:false,optional:true});
  return true;
 }
 if(job.op==='originChoice'){
  const loc=api.location(s,owner,job.sourceUid);
  const origin=loc?.c.stack?.[0];
  const openBranch=!!origin&&api.effectiveRequiredEnergy(pack,s,origin)>=1;
  open(s,{mode:'origin',player:owner,sourceUid:job.sourceUid,kindMode:job.mode,
   bp:job.bp,color:job.color,maxEnergy:job.maxEnergy,ap:job.ap,openBranch});
  return true;
 }
 if(job.op==='raidNamedUnder'){
  const raiders=pl.outside.filter(card=>named(api,pack,s,card,job.name)&&api.card(pack,card).raidName);
  const bases=[];
  for(const raider of raiders)for(const line of ['front','energy'])
   pl[line].forEach((card,slot)=>{
    if(card&&api.validRaidBase(pack,s,owner,card,api.card(pack,raider)))
     bases.push({raider:raider.uid,base:card.uid,line,slot});
   });
  if(bases.length)open(s,{mode:'raidUnder',player:owner,sourceUid:job.sourceUid,bases});
  return true;
 }
 if(job.op==='pairBuffImpact'){
  api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  if(s.pending)return true;
  const first=api.field(pl).filter(card=>named(api,pack,s,card,job.first)).map(card=>card.uid);
  open(s,{mode:'pair',player:owner,sourceUid:job.sourceUid,step:'first',firstName:job.first,
   secondName:job.second,minSum:job.minSum,firstChoices:first,picked:[]});
  return true;
 }
 if(job.op==='optionalRetireGrant'){
  const choices=s.players[1-owner].front.filter(card=>card&&api.bp(pack,s,card)<=job.bp)
   .map(card=>card.uid);
  open(s,{mode:'retireGrant',player:owner,sourceUid:job.sourceUid,choices,bp:job.bp,
   name:job.name,maxFacedown:job.maxFacedown,step:'retire'});
  return true;
 }
 if(job.op==='snakeChoice'){
  open(s,{mode:'snake',player:owner,sourceUid:job.sourceUid,name:job.name,look:job.look});
  return true;
 }
 if(job.op==='removedToOutsideEnter'){
  open(s,{mode:'removedOut',player:owner,sourceUid:job.sourceUid,moved:[]});
  return true;
 }
 if(job.op==='deployRaidOrigin'){
  const origin=pl.outside.find(card=>card.uid===job.baseUid);
  const kiss=api.field(pl).some(card=>named(api,pack,s,card,job.name));
  const cells=emptyCells(api,pl,['front','energy']);
  if(origin&&kiss&&cells.length)open(s,{mode:'cell',player:owner,sourceUid:job.sourceUid,
   uid:origin.uid,from:'outside',ready:false,cells,optional:true});
  return true;
 }
 if(job.op==='orderWindow'){
  orderBottom(api,pack,s,owner,job.uids||[],job.sourceUid,false);
  return true;
 }
 if(job.op==='drawIfFieldLeft'){
  const left=(s.zoneMoveEvents||[]).some(event=>event.turn===s.turn&&event.uid===job.uid&&
   event.reason==='retirement'&&(event.to==='outside'||event.to==='removed'));
  if(!left)return true;
  if(pl.deck.length)api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:job.sourceUid});
  pl.nextNamedHandApCut={turn:s.turn,name:job.name,amount:job.ap,sourceUid:job.sourceUid};
  return true;
 }
 if(job.op==='attackEndRestStrip'){
  const loc=api.location(s,owner,job.sourceUid);
  if(!loc?.c.ready)return true;
  const targets=api.field(pl).filter(card=>raided(card)&&named(api,pack,s,card,job.name))
   .map(card=>card.uid);
  open(s,{mode:'endStrip',player:owner,sourceUid:job.sourceUid,targets});
  return true;
 }
 if(job.op==='energyLossSwap'){
  const loc=api.location(s,owner,job.sourceUid);
  const fronts=pl.front.map((card,slot)=>card&&api.cardHasTrait(api.card(pack,card),job.trait)?slot:null)
   .filter(slot=>slot!==null);
  if(loc?.line==='energy'&&fronts.length)open(s,{mode:'swap',player:owner,sourceUid:job.sourceUid,
   energySlot:loc.slot,fronts});
  return true;
 }
 if(job.op==='allyFacedownStrip'){
  const loc=api.location(s,owner,job.sourceUid);
  const layers=loc?api.directFacedowns(loc.c):[];
  if(layers.length)open(s,{mode:'strip',player:owner,sourceUid:job.sourceUid,
   choices:layers.map(card=>card.uid)});
  return true;
 }
 if(job.op==='payApRetireFront'){
  const rule=job;
  if(s.active!==owner||api.generatedColor(pack,s,owner,rule.color)<rule.min||pl.apActive<rule.ap)
   return true;
  const choices=s.players[1-owner].front.filter(card=>card&&api.bp(pack,s,card)<=rule.bp)
   .map(card=>card.uid);
  if(choices.length)open(s,{mode:'payRetire',player:owner,sourceUid:job.sourceUid,
   choices,ap:rule.ap});
  return true;
 }
 return false;
}

function moveHandOutside(api,pack,s,owner,uid,sourceUid){
 const pl=s.players[owner];
 const index=pl.hand.findIndex(card=>card.uid===uid);
 if(index<0)throw Error('Hand card left');
 const physical=pl.hand.splice(index,1)[0];
 pl.outside.push(physical);
 api.recordMove(pack,s,{physical,owner,from:'hand',to:'outside',reason:'own-effect',sourceUid});
 return physical;
}
function orderBottom(api,pack,s,owner,uids,sourceUid,resume){
 const pl=s.players[owner];
 const left=uids.filter(uid=>deckIndex(pl,uid)>=0);
 if(left.length<=1){
  if(left.length===1){
   const physical=pl.deck.splice(deckIndex(pl,left[0]),1)[0];
   pl.deck.push(physical);
  }
  if(resume&&!s.pending)api.continueQueue(pack,s);
  return;
 }
 open(s,{mode:'order',player:owner,sourceUid,uids:left});
}

export function legalSharedPrintLastPending(api,pack,s){
 const q=s.pending;
 if(q?.kind!=='effect-last')return null;
 const pl=s.players[q.player];
 if(q.mode==='floor'||q.mode==='strip')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='handReady')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.filter(uid=>pl.hand.some(card=>card.uid===uid))
   .map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='retireField')return q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}));
 if(q.mode==='number')return q.numbers.map(number=>({type:'lastPrint',mode:'number',number}));
 if(q.mode==='mayDraw')return [
  {type:'lastPrint',mode:'skip'},
  ...(pl.deck.length?[{type:'lastPrint',mode:'draw'}]:[])
 ];
 if(q.mode==='scale'){
  const skip=q.optional?[{type:'lastPrint',mode:'skip'}]:[];
  return [...skip,...(q.choices||[]).map(uid=>({type:'lastPrint',mode:'pick',uid}))];
 }
 if(q.mode==='scaleHand')return [
  {type:'lastPrint',mode:'done'},
  ...pl.hand.filter(card=>!q.moved.includes(card.uid)).map(card=>({type:'lastPrint',mode:'pick',uid:card.uid}))
 ];
 if(q.mode==='tuck'||q.mode==='endStrip'||q.mode==='swap'||q.mode==='payRetire'||
  q.mode==='tuckInstead')
  return q.mode==='endStrip'||q.mode==='swap'||q.mode==='tuck'||q.mode==='payRetire'||q.mode==='tuckInstead'
   ?legalSimple(q,pl):null;
 if(q.mode==='discardCount')return pl.hand.filter(card=>!q.picked.includes(card.uid))
  .map(card=>({type:'lastPrint',mode:'pick',uid:card.uid}));
 if(q.mode==='entry')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='cell')return [
  ...(q.optional?[{type:'lastPrint',mode:'skip'}]:[]),
  ...q.cells.map(cell=>({type:'lastPrint',mode:'cell',line:cell.line,slot:cell.slot}))
 ];
 if(q.mode==='origin')return [
  {type:'lastPrint',mode:'first'},
  {type:'lastPrint',mode:'second'}
 ];
 if(q.mode==='raidUnder')return [
  {type:'lastPrint',mode:'skip'},
  ...q.bases.map(base=>({type:'lastPrint',mode:'raid',uid:base.raider,base:base.base,line:base.line,slot:base.slot}))
 ];
 if(q.mode==='pair'){
  const choices=q.step==='first'?q.firstChoices:q.secondChoices;
  return [{type:'lastPrint',mode:'skip'},...choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))];
 }
 if(q.mode==='retireGrant'){
  if(q.step==='retire')return [{type:'lastPrint',mode:'skip'},...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))];
  return [{type:'lastPrint',mode:'skip'},...q.raiders.map(uid=>({type:'lastPrint',mode:'pick',uid}))];
 }
 if(q.mode==='snake')return [
  {type:'lastPrint',mode:'look'},
  {type:'lastPrint',mode:'zone'}
 ];
 if(q.mode==='snakeLook')return [
  {type:'lastPrint',mode:'done'},
  ...q.choices.filter(uid=>!q.selected&&deckIndex(pl,uid)>=0).map(uid=>({type:'lastPrint',mode:'take',uid}))
 ];
 if(q.mode==='snakeZone')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
  if(q.mode==='removedOut')return [
  {type:'lastPrint',mode:'done'},
  ...pl.removed.filter(card=>!q.moved.includes(card.uid)).map(card=>({type:'lastPrint',mode:'pick',uid:card.uid}))
 ];
 if(q.mode==='order')return q.uids.map(uid=>({type:'lastPrint',mode:'bottom',uid}));
 if(q.mode==='bounceRetire'||q.mode==='tuckGrant'||q.mode==='handImpact'||q.mode==='removeBuff'||
  q.mode==='restImpact')
  return q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}));
 if(q.mode==='down'||q.mode==='removeBoth')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='buffOne')return [
  ...(q.optional?[{type:'lastPrint',mode:'skip'}]:[]),
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='readyTrait')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 return null;
}
function legalSimple(q,pl){
 if(q.mode==='tuck')return [{type:'lastPrint',mode:'skip'},{type:'lastPrint',mode:'tuck'}];
 if(q.mode==='endStrip')return [
  {type:'lastPrint',mode:'skip'},
  ...q.targets.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='swap')return [
  {type:'lastPrint',mode:'skip'},
  ...q.fronts.map(slot=>({type:'lastPrint',mode:'slot',slot}))
 ];
 if(q.mode==='payRetire'||q.mode==='frontRetire')return [
  {type:'lastPrint',mode:'skip'},
  ...q.choices.map(uid=>({type:'lastPrint',mode:'pick',uid}))
 ];
 if(q.mode==='tuckInstead')return [
  {type:'lastPrint',mode:'decline'},
  {type:'lastPrint',mode:'tuck'}
 ];
 return null;
}

export function resolveSharedPrintLastPending(api,pack,s,action){
 apiContinue=api.continueQueue;
 const q=s.pending;
 if(q?.kind!=='effect-last')return false;
 if(action.type!=='lastPrint')throw Error('Illegal shared choice');
 const owner=q.player,pl=s.players[owner];
 if(q.mode==='floor'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal block floor');
  loc.c.blockFloorGrant={turn:s.turn,relation:q.relation,bp:q.bp,stamp:loc.c.fieldEntryStamp};
  finish(s,pack);
  return true;
 }
 if(q.mode==='handReady'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  if(action.mode!=='pick'||!q.choices.includes(action.uid))throw Error('Illegal hand card');
  s.onceEffectUses[owner].push(q.key);
  moveHandOutside(api,pack,s,owner,action.uid,q.sourceUid);
  const choices=api.field(pl).filter(card=>card.uid!==q.sourceUid&&
   api.cardHasTrait(api.card(pack,card),q.trait)).map(card=>card.uid);
  if(!choices.length){finish(s,pack);return true;}
  open(s,{mode:'readyTrait',player:owner,sourceUid:q.sourceUid,choices});
  return true;
 }
 if(q.mode==='readyTrait'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal ready target');
  api.attemptFieldActive(s,owner,loc.c);
  finish(s,pack);
  return true;
 }
 if(q.mode==='retireField'){
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal field');
  s.pending=null;
  api.retire(pack,s,owner,loc.line,loc.slot,{by:'effect',controller:owner,sourceUid:q.sourceUid});
  s.effectQueue.push({op:'drawIfFieldLeft',owner,sourceUid:q.sourceUid,uid:action.uid,name:q.name,ap:q.ap});
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='number'){
  if(!q.numbers.includes(action.number))throw Error('Illegal energy number');
  if(!pl.deck.length){finish(s,pack);return true;}
  const top=pl.deck[0];
  api.publishWindow(pack,s,owner,[top]);
  if(api.card(pack,top).energy!==action.number){finish(s,pack);return true;}
  api.moveOwnedLinear(pack,s,{owner,from:'deck',to:'hand',index:0,reason:'own-effect',sourceUid:q.sourceUid});
  if(q.thenDraw&&pl.deck.length)open(s,{mode:'mayDraw',player:owner,sourceUid:q.sourceUid});
  else finish(s,pack);
  return true;
 }
 if(q.mode==='mayDraw'){
  if(action.mode==='draw'){
   if(!pl.deck.length)throw Error('Optional draw has no card');
   api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
  }else if(action.mode!=='skip')throw Error('Illegal draw');
  finish(s,pack);
  return true;
 }
 if(q.mode==='scale'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,1-owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal front penalty');
  loc.c.buffs??=[];
  loc.c.buffs.push({bp:-q.first,untilTurn:s.turn});
  if(!pl.hand.length){finish(s,pack);return true;}
  open(s,{mode:'scaleHand',player:owner,sourceUid:q.sourceUid,target:action.uid,each:q.each,moved:[]});
  return true;
 }
 if(q.mode==='scaleHand'){
  if(action.mode==='done'){finish(s,pack);return true;}
  if(action.mode!=='pick'||q.moved.includes(action.uid))throw Error('Illegal hand penalty');
  moveHandOutside(api,pack,s,owner,action.uid,q.sourceUid);
  const loc=api.location(s,1-owner,q.target);
  if(loc){loc.c.buffs??=[];loc.c.buffs.push({bp:-q.each,untilTurn:s.turn});}
  const moved=[...q.moved,action.uid];
  if(!pl.hand.length){finish(s,pack);return true;}
  open(s,{mode:'scaleHand',player:owner,sourceUid:q.sourceUid,target:q.target,each:q.each,moved});
  return true;
 }
 if(q.mode==='tuck'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  if(action.mode!=='tuck'||!pl.deck.length)throw Error('Illegal tuck');
  const loc=api.location(s,owner,q.sourceUid);
  if(!loc)throw Error('Tuck host left');
  const physical=pl.deck.shift();
  api.buryFacedown(pack,s,owner,loc.c,physical,'deck',q.sourceUid);
  if(q.follow==='draw'&&pl.deck.length)api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
  if(q.follow==='buffDamage'){
   loc.c.buffs??=[];
   loc.c.buffs.push({bp:1000,untilTurn:s.turn});
   loc.c.attackDamageGranted={turn:s.turn,stamp:loc.c.fieldEntryStamp,amount:2};
  }
  finish(s,pack);
  return true;
 }
 if(q.mode==='discardCount'){
  if(action.mode!=='pick'||q.picked.includes(action.uid))throw Error('Illegal discard');
  moveHandOutside(api,pack,s,owner,action.uid,q.sourceUid);
  const picked=[...q.picked,action.uid];
  if(picked.length>=q.need){finish(s,pack);return true;}
  open(s,{mode:'discardCount',player:owner,sourceUid:q.sourceUid,need:q.need,picked});
  return true;
 }
 if(q.mode==='entry'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const zone=pl[q.from];
  if(action.mode!=='pick'||!zone.some(card=>card.uid===action.uid))throw Error('Illegal entry card');
  const cells=emptyCells(api,pl,['front','energy']);
  if(!cells.length){finish(s,pack);return true;}
  open(s,{mode:'cell',player:owner,sourceUid:q.sourceUid,uid:action.uid,from:q.from,
   ready:q.ready,cells});
  return true;
 }
 if(q.mode==='cell'){
  if(action.mode==='skip'){
   if(!q.optional)throw Error('Illegal entry cell');
   finish(s,pack);return true;
  }
  const cell=q.cells.find(item=>item.line===action.line&&item.slot===action.slot);
  if(action.mode!=='cell'||!cell)throw Error('Illegal entry cell');
  s.pending=null;
  api.effectEnter(pack,s,{owner,from:q.from,uid:q.uid,line:cell.line,slot:cell.slot,
   ready:q.ready,sourceUid:q.sourceUid});
  let resumed=false;
  if(q.afterUids){
   if(s.pending)s.effectQueue.push({op:'orderWindow',owner,sourceUid:q.sourceUid,uids:q.afterUids});
   else{orderBottom(api,pack,s,owner,q.afterUids,q.sourceUid,true);resumed=true;}
  }
  if(!s.pending&&!resumed)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='origin'){
  if(action.mode==='first'&&q.kindMode==='retireOrActive'){
   const choices=s.players[1-owner].front.filter(card=>card&&api.bp(pack,s,card)<=q.bp).map(card=>card.uid);
   if(!choices.length){finish(s,pack);return true;}
   open(s,{mode:'frontRetire',player:owner,sourceUid:q.sourceUid,choices});
   return true;
  }
  if(action.mode==='first'&&q.kindMode==='drawOrDouble'){
   if(!pl.deck.length){finish(s,pack);return true;}
   open(s,{mode:'mayDraw',player:owner,sourceUid:q.sourceUid});
   return true;
  }
  if(action.mode!=='second'||!q.openBranch){finish(s,pack);return true;}
  if(q.kindMode==='drawOrDouble'){
   const loc=api.location(s,owner,q.sourceUid);
   if(loc)loc.c.grantedDoubleAttack=s.turn;
   finish(s,pack);
   return true;
  }
  if(pl.deck.length)api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
  const choices=pl.hand.filter(card=>{
   const printed=api.card(pack,card);
   return printed.type==='character'&&printed.color===q.color&&printed.energy<=q.maxEnergy&&printed.ap===q.ap;
  }).map(card=>card.uid);
  const cells=emptyCells(api,pl,['front','energy']);
  if(choices.length&&cells.length)open(s,{mode:'entry',player:owner,sourceUid:q.sourceUid,
   choices,from:'hand',ready:true});
  else if(!s.pending)finish(s,pack);
  return true;
 }
 if(q.mode==='raidUnder'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const found=q.bases.find(base=>base.raider===action.uid&&base.base===action.base&&
   base.line===action.line&&base.slot===action.slot);
  const raider=pl.outside.find(card=>card.uid===action.uid);
  const event=pl.outside.find(card=>card.uid===q.sourceUid);
  if(action.mode!=='raid'||!found||!raider||!event)throw Error('Illegal outside raid');
  pl.outside.splice(pl.outside.findIndex(card=>card.uid===raider.uid),1);
  s.pending=null;
  api.performRaid(pack,s,owner,raider,action.base,action.line,action.slot,undefined,
   {entryReady:true,entryCause:'effectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
  const host=api.location(s,owner,raider.uid);
  const eventIndex=pl.outside.findIndex(card=>card.uid===event.uid);
  if(host&&eventIndex>=0){
   const physical=pl.outside.splice(eventIndex,1)[0];
   api.buryFacedown(pack,s,owner,host.c,physical,'outside',q.sourceUid);
  }
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='pair'){
  if(action.mode==='pick'){
   const choices=q.step==='first'?q.firstChoices:q.secondChoices;
   if(!choices.includes(action.uid))throw Error('Illegal paired character');
   q.picked.push(action.uid);
  }else if(action.mode!=='skip')throw Error('Illegal paired character');
  if(q.step==='first'){
   const second=api.field(pl).filter(card=>named(api,pack,s,card,q.secondName)&&!q.picked.includes(card.uid))
    .map(card=>card.uid);
   open(s,{...q,step:'second',secondChoices:second});
   return true;
  }
  const chosen=q.picked.map(uid=>api.location(s,owner,uid)?.c).filter(Boolean);
  for(const card of chosen){card.buffs??=[];card.buffs.push({bp:1000,untilTurn:s.turn});}
  const sum=chosen.reduce((total,card)=>total+api.effectiveRequiredEnergy(pack,s,card),0);
  const hitagi=chosen.find(card=>named(api,pack,s,card,q.firstName));
  if(hitagi&&sum>=q.minSum)hitagi.impactGranted={turn:s.turn,stamp:hitagi.fieldEntryStamp,amount:1};
  finish(s,pack);
  return true;
 }
 if(q.mode==='retireGrant'){
  if(q.step==='retire'){
   if(action.mode==='pick'){
    const loc=api.location(s,1-owner,action.uid);
    if(!loc||!q.choices.includes(action.uid))throw Error('Illegal front retirement');
    s.pending=null;
    api.retire(pack,s,1-owner,loc.line,loc.slot,{by:'opponent',controller:owner,sourceUid:q.sourceUid});
   }else if(action.mode!=='skip')throw Error('Illegal front retirement');
   const raiders=api.field(pl).filter(card=>raided(card)&&named(api,pack,s,card,q.name)).map(card=>card.uid);
   if(!raiders.length){if(!s.pending)finish(s,pack);return true;}
   if(s.pending){
    s.effectQueue.push({op:'optionalRetireGrant',owner,sourceUid:q.sourceUid,bp:q.bp,name:q.name,maxFacedown:q.maxFacedown,step:'grant'});
    return true;
   }
   open(s,{mode:'retireGrant',player:owner,sourceUid:q.sourceUid,step:'grant',raiders,name:q.name,maxFacedown:q.maxFacedown});
   return true;
  }
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.raiders.includes(action.uid))throw Error('Illegal replacement host');
  loc.c.retireTuckInstead={turn:s.turn,stamp:loc.c.fieldEntryStamp,max:q.maxFacedown};
  finish(s,pack);
  return true;
 }
 if(q.mode==='snake'){
  if(action.mode==='look'){
   const window=lookWindow(pl,q.look);
   if(!window.uids.length){finish(s,pack);return true;}
   const choices=window.cards.filter(card=>api.cardHasName(api.card(pack,card),q.name,false)).map(card=>card.uid);
   const cells=emptyCells(api,pl,['energy']);
   open(s,{mode:'snakeLook',player:owner,sourceUid:q.sourceUid,uids:window.uids,
    choices:cells.length?choices:[],name:q.name,selected:null});
   return true;
  }
  if(action.mode!=='zone')throw Error('Illegal energy entry');
  const choices=[...pl.hand,...pl.outside].filter(card=>api.cardHasName(api.card(pack,card),q.name,false))
   .map(card=>card.uid);
  const cells=emptyCells(api,pl,['energy']);
  if(!choices.length||!cells.length){finish(s,pack);return true;}
  open(s,{mode:'snakeZone',player:owner,sourceUid:q.sourceUid,choices});
  return true;
 }
 if(q.mode==='snakeLook'){
  if(action.mode==='take'){
   if(q.selected||!q.choices.includes(action.uid))throw Error('Illegal looked card');
   const cells=emptyCells(api,pl,['energy']);
   open(s,{mode:'cell',player:owner,sourceUid:q.sourceUid,uid:action.uid,from:'deck',ready:false,
    cells,afterUids:q.uids.filter(uid=>uid!==action.uid)});
   return true;
  }
  if(action.mode!=='done')throw Error('Illegal looked card');
  orderBottom(api,pack,s,owner,q.uids,q.sourceUid,true);
  return true;
 }
 if(q.mode==='snakeZone'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const from=pl.hand.some(card=>card.uid===action.uid)?'hand':pl.outside.some(card=>card.uid===action.uid)?'outside':null;
  if(action.mode!=='pick'||!from)throw Error('Illegal energy entry');
  const cells=emptyCells(api,pl,['energy']);
  if(!cells.length){finish(s,pack);return true;}
  open(s,{mode:'cell',player:owner,sourceUid:q.sourceUid,uid:action.uid,from,ready:false,cells});
  return true;
 }
 if(q.mode==='removedOut'){
  if(action.mode==='pick'){
   const index=pl.removed.findIndex(card=>card.uid===action.uid);
   if(index<0||q.moved.includes(action.uid))throw Error('Illegal removed card');
   const physical=pl.removed.splice(index,1)[0];
   pl.outside.push(physical);
   api.recordMove(pack,s,{physical,owner,from:'removed',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
   open(s,{mode:'removedOut',player:owner,sourceUid:q.sourceUid,moved:[...q.moved,action.uid]});
   return true;
  }
  if(action.mode!=='done')throw Error('Illegal removed card');
  if(q.moved.length>=3){
   const cells=emptyCells(api,pl,['front','energy']);
   const source=pl.outside.find(card=>card.uid===q.sourceUid);
   if(source&&cells.length){
    open(s,{mode:'cell',player:owner,sourceUid:q.sourceUid,uid:source.uid,from:'outside',
     ready:false,cells});
    return true;
   }
  }
  finish(s,pack);
  return true;
 }
 if(q.mode==='order'){
  if(action.mode!=='bottom'||!q.uids.includes(action.uid))throw Error('Illegal bottom order');
  const index=deckIndex(pl,action.uid);
  if(index<0)throw Error('Ordered card left the window');
  pl.deck.push(pl.deck.splice(index,1)[0]);
  const uids=q.uids.filter(uid=>uid!==action.uid);
  if(uids.length<=1){
   if(uids.length===1){
    const left=deckIndex(pl,uids[0]);
    if(left>=0)pl.deck.push(pl.deck.splice(left,1)[0]);
   }
   finish(s,pack);
   return true;
  }
  open(s,{mode:'order',player:owner,sourceUid:q.sourceUid,uids});
  return true;
 }
 if(q.mode==='endStrip'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const host=api.location(s,owner,action.uid);
  const self=api.location(s,owner,q.sourceUid);
  if(action.mode!=='pick'||!host||!self?.c.ready||!q.targets.includes(action.uid))
   throw Error('Illegal attack-end strip');
  rest(api,s,owner,self.c);
  api.emptyUnder(pack,s,owner,host.c,q.sourceUid);
  finish(s,pack);
  return true;
 }
 if(q.mode==='swap'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  if(action.mode!=='slot'||!q.fronts.includes(action.slot)||!pl.front[action.slot]||!pl.energy[q.energySlot])
   throw Error('Illegal energy swap');
  const front=pl.front[action.slot],energy=pl.energy[q.energySlot];
  pl.front[action.slot]=null;pl.energy[q.energySlot]=null;
  pl.front[action.slot]=energy;pl.energy[q.energySlot]=front;
  api.recordMove(pack,s,{physical:energy,owner,from:'energy',to:'front',reason:'own-effect',sourceUid:q.sourceUid});
  api.recordMove(pack,s,{physical:front,owner,from:'front',to:'energy',reason:'own-effect',sourceUid:q.sourceUid});
  finish(s,pack);
  return true;
 }
 if(q.mode==='strip'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const host=api.location(s,owner,q.sourceUid);
  if(action.mode!=='pick'||!host||!q.choices.includes(action.uid))throw Error('Illegal facedown strip');
  api.putFacedownOutside(pack,s,owner,host.c,action.uid);
  finish(s,pack);
  return true;
 }
 if(q.mode==='payRetire'||q.mode==='frontRetire'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,1-owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal front retirement');
  if(q.mode==='payRetire'){
   if(pl.apActive<q.ap)throw Error('Illegal AP payment');
   api.spendAp(pl,q.ap);
  }
  s.pending=null;
  api.retire(pack,s,1-owner,loc.line,loc.slot,{by:'opponent',controller:owner,sourceUid:q.sourceUid});
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='tuckInstead'){
  const loc=api.location(s,owner,q.uid);
  if(action.mode==='tuck'){
   if(!loc||!pl.deck.length)throw Error('Illegal retirement replacement');
   const physical=pl.deck.shift();
   api.buryFacedown(pack,s,owner,loc.c,physical,'deck',q.uid);
   finish(s,pack);
   return true;
  }
  if(action.mode!=='decline'||!loc)throw Error('Illegal retirement replacement');
  s.pending=null;
  api.retire(pack,s,owner,q.line,q.slot,{skipReplacement:true,by:q.by,controller:q.retireCause?.controller,
   sourceUid:q.retireCause?.sourceUid,postImpact:q.postImpact});
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='bounceRetire'){
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal bounce');
  const jobs=api.printedJobs(pack,s,loc.c,'onRetire',owner).filter(item=>item.op!=='returnRetiredToHand');
  s.pending=null;
  api.bounceToHand(pack,s,owner,action.uid,q.sourceUid);
  const self=api.location(s,owner,q.sourceUid);
  if(self&&pl.hand.some(card=>card.uid===action.uid)){
   self.c.buffs??=[];
   self.c.buffs.push({bp:q.bp,untilTurn:s.turn});
   if(jobs.length)s.effectQueue.unshift(...jobs);
  }
  if(!s.pending)api.continueQueue(pack,s);
  return true;
 }
 if(q.mode==='tuckGrant'){
  const host=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!host||!q.choices.includes(action.uid)||!pl.deck.length)
   throw Error('Illegal tuck grant');
  const physical=pl.deck.shift();
  api.buryFacedown(pack,s,owner,host.c,physical,'deck',q.sourceUid);
  host.c.attackDrawGranted={turn:s.turn,stamp:host.c.fieldEntryStamp,upTo:1};
  finish(s,pack);
  return true;
 }
 if(q.mode==='down'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  const loc=api.location(s,1-owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal front penalty');
  loc.c.buffs??=[];
  loc.c.buffs.push({bp:-q.bp,untilTurn:s.turn});
  finish(s,pack);
  return true;
 }
 if(q.mode==='handImpact'){
  if(action.mode!=='pick'||!pl.hand.some(card=>card.uid===action.uid))throw Error('Illegal hand impact');
  moveHandOutside(api,pack,s,owner,action.uid,q.sourceUid);
  const self=api.location(s,owner,q.sourceUid);
  if(self)self.c.impactGranted={turn:s.turn,stamp:self.c.fieldEntryStamp,amount:1};
  finish(s,pack);
  return true;
 }
 if(q.mode==='removeBuff'){
  if(action.mode!=='pick'||!pl.hand.some(card=>card.uid===action.uid))throw Error('Illegal remove');
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  const physical=pl.hand.splice(index,1)[0];
  pl.removed.push(physical);
  api.recordMove(pack,s,{physical,owner,from:'hand',to:'removed',reason:'own-effect',sourceUid:q.sourceUid});
  const choices=api.field(pl).filter(card=>api.card(pack,card).type==='character').map(card=>card.uid);
  if(!choices.length){finish(s,pack);return true;}
  open(s,{mode:'buffOne',player:owner,sourceUid:q.sourceUid,choices,bp:q.bp});
  return true;
 }
 if(q.mode==='buffOne'){
  if(action.mode==='skip'&&q.optional){finish(s,pack);return true;}
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc||!q.choices.includes(action.uid))throw Error('Illegal character buff');
  loc.c.buffs??=[];
  loc.c.buffs.push({bp:q.bp,untilTurn:s.turn});
  finish(s,pack);
  return true;
 }
 if(q.mode==='removeBoth'){
  if(action.mode==='skip'){finish(s,pack);return true;}
  if(action.mode!=='pick'||!pl.hand.some(card=>card.uid===action.uid))throw Error('Illegal remove');
  const index=pl.hand.findIndex(card=>card.uid===action.uid);
  const physical=pl.hand.splice(index,1)[0];
  pl.removed.push(physical);
  api.recordMove(pack,s,{physical,owner,from:'hand',to:'removed',reason:'own-effect',sourceUid:q.sourceUid});
  if(pl.deck.length)api.draw(pack,s,owner,1,{reason:'own-effect',sourceUid:q.sourceUid});
  const self=api.location(s,owner,q.sourceUid);
  if(self){self.c.buffs??=[];self.c.buffs.push({bp:q.bp,untilTurn:s.turn});}
  const choices=api.field(pl).filter(card=>card.uid!==q.sourceUid&&api.card(pack,card).type==='character')
   .map(card=>card.uid);
  if(!choices.length||s.pending){if(!s.pending)finish(s,pack);return true;}
  open(s,{mode:'buffOne',player:owner,sourceUid:q.sourceUid,choices,bp:q.bp,optional:true});
  return true;
 }
 if(q.mode==='restImpact'){
  const loc=api.location(s,owner,action.uid);
  if(action.mode!=='pick'||!loc?.c.ready||!q.choices.includes(action.uid))throw Error('Illegal named rest');
  rest(api,s,owner,loc.c);
  const self=api.location(s,owner,q.sourceUid);
  if(self)self.c.impactGranted={turn:s.turn,stamp:self.c.fieldEntryStamp,amount:1};
  finish(s,pack);
  return true;
 }
 throw Error('Illegal shared choice');
}

function onField(api,pack,s,player,card){
 return live(api,pack,s,card,'main');
}
export function legalSharedPrintLastActivations(api,pack,s,player){
 if(s.phase!=='main')return [];
 const out=[];
 const once=s.mainReadyOnceByName[player];
 for(const card of api.field(s.players[player])){
  const ability=api.card(pack,card).mainAbility;
  const paired=api.card(pack,card).pairedMain;
  if(ability&&onField(api,pack,s,player,card))out.push(...mainActions(api,pack,s,player,card,ability,false,once));
  if(paired&&onField(api,pack,s,player,card))out.push(...mainActions(api,pack,s,player,card,paired,true,once));
 }
 return out;
}
function mainActions(api,pack,s,player,card,ability,paired,once){
 const used=paired?s.altMainAbilityUsedUids.includes(card.uid):s.mainAbilityUsedUids.includes(card.uid);
 const front=api.location(s,player,card.uid)?.line==='front';
 const mode=paired?'paired':'main';
 if(ability.op==='wakeIfNameLeft'&&!used&&nameLeft(api,pack,s,player,ability.name))
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='restReplayIfNameLeft'&&card.ready&&nameLeft(api,pack,s,player,ability.name))
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='bounceNameRetire'&&!used&&front&&
  api.field(s.players[player]).some(other=>named(api,pack,s,other,ability.name)))
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='restNamedImpact'&&!used&&front&&card.ready&&
  s.players[player].front.some(other=>other?.ready&&named(api,pack,s,other,ability.name)))
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='declareEnergyMain'&&card.ready&&!once.includes(ability.nameOnce+'|declareEnergy')&&
  s.players[player].deck.length)
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='frontBpDown'&&!used&&front)
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='handNameImpact'&&!s.altMainAbilityUsedUids.includes(card.uid)&&
  s.players[player].hand.some(other=>named(api,pack,s,other,ability.name)))
  return [{type:'activate',uid:card.uid,mode:'paired'}];
 if(ability.op==='handRemoveBuff'&&!used&&s.players[player].hand.length&&
  api.field(s.players[player]).some(other=>api.card(pack,other).type==='character'))
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='handRemoveDrawBoth'&&!used&&front&&s.players[player].hand.length)
  return [{type:'activate',uid:card.uid,mode}];
 if(ability.op==='restTuckGrant'&&card.ready&&!once.includes(ability.nameOnce+'|tuckGrant')&&
  s.players[player].deck.length&&api.field(s.players[player]).some(other=>raided(other)&&
   named(api,pack,s,other,ability.name)&&api.directFacedowns(other).length<=ability.max))
  return [{type:'activate',uid:card.uid,mode}];
 return [];
}

export function activateSharedPrintLast(api,pack,s,action){
 if(action.type!=='activate')return false;
 const player=s.active,pl=s.players[player];
 const loc=api.location(s,player,action.uid);
 if(!loc)return false;
 const printed=api.card(pack,loc.c);
 const paired=action.mode==='paired';
 const ability=paired?printed.pairedMain:printed.mainAbility;
 if(!ability||!sharedPrintLastMain({type:'character'},ability)||!onField(api,pack,s,player,loc.c))
  return false;
 const mark=()=>{
  const list=paired?s.altMainAbilityUsedUids:s.mainAbilityUsedUids;
  if(!list.includes(loc.c.uid))list.push(loc.c.uid);
 };
 if(ability.op==='wakeIfNameLeft'){
  if(s.mainAbilityUsedUids.includes(loc.c.uid)||!nameLeft(api,pack,s,player,ability.name))
   throw Error('Wake is not legal');
  mark();
  api.attemptFieldActive(s,player,loc.c);
  return true;
 }
 if(ability.op==='restReplayIfNameLeft'){
  if(!loc.c.ready||!nameLeft(api,pack,s,player,ability.name))throw Error('Replay is not legal');
  rest(api,s,player,loc.c);
  s.effectQueue.unshift({op:'replayOnPlay',owner:player,sourceUid:loc.c.uid});
  api.continueQueue(pack,s);
  return true;
 }
 if(ability.op==='bounceNameRetire'){
  const choices=api.field(pl).filter(card=>named(api,pack,s,card,ability.name)).map(card=>card.uid);
  if(s.mainAbilityUsedUids.includes(loc.c.uid)||loc.line!=='front'||!choices.length)
   throw Error('Bounce is not legal');
  mark();
  open(s,{mode:'bounceRetire',player,sourceUid:loc.c.uid,choices,bp:ability.bp});
  return true;
 }
 if(ability.op==='declareEnergyMain'){
  const key=ability.nameOnce+'|declareEnergy';
  if(!loc.c.ready||s.mainReadyOnceByName[player].includes(key))throw Error('Reveal is not legal');
  rest(api,s,player,loc.c);
  s.mainReadyOnceByName[player].push(key);
  s.effectQueue.unshift({op:'declareEnergy',owner:player,sourceUid:loc.c.uid,thenDraw:false});
  api.continueQueue(pack,s);
  return true;
 }
 if(ability.op==='restTuckGrant'){
  const key=ability.nameOnce+'|tuckGrant';
  if(!loc.c.ready||s.mainReadyOnceByName[player].includes(key))throw Error('Tuck grant is not legal');
  const choices=api.field(pl).filter(card=>raided(card)&&named(api,pack,s,card,ability.name)&&
   api.directFacedowns(card).length<=ability.max).map(card=>card.uid);
  if(!choices.length||!pl.deck.length)throw Error('Tuck grant is not legal');
  rest(api,s,player,loc.c);
  s.mainReadyOnceByName[player].push(key);
  open(s,{mode:'tuckGrant',player,sourceUid:loc.c.uid,choices});
  return true;
 }
 if(ability.op==='frontBpDown'){
  if(s.mainAbilityUsedUids.includes(loc.c.uid)||loc.line!=='front')throw Error('Front penalty is not legal');
  mark();
  const choices=s.players[1-player].front.filter(card=>card&&api.bp(pack,s,card)>=ability.minBp)
   .map(card=>card.uid);
  if(!choices.length)return true;
  open(s,{mode:'down',player,sourceUid:loc.c.uid,choices,bp:ability.bp});
  return true;
 }
 if(ability.op==='handNameImpact'){
  if(s.altMainAbilityUsedUids.includes(loc.c.uid))throw Error('Hand impact is not legal');
  const choices=pl.hand.filter(card=>named(api,pack,s,card,ability.name)).map(card=>card.uid);
  if(!choices.length)throw Error('Hand impact is not legal');
  s.altMainAbilityUsedUids.push(loc.c.uid);
  open(s,{mode:'handImpact',player,sourceUid:loc.c.uid,choices});
  return true;
 }
 if(ability.op==='handRemoveBuff'){
  if(s.mainAbilityUsedUids.includes(loc.c.uid)||!pl.hand.length)throw Error('Remove buff is not legal');
  mark();
  open(s,{mode:'removeBuff',player,sourceUid:loc.c.uid,bp:ability.bp,
   choices:pl.hand.map(card=>card.uid)});
  return true;
 }
 if(ability.op==='handRemoveDrawBoth'){
  if(s.mainAbilityUsedUids.includes(loc.c.uid)||loc.line!=='front'||!pl.hand.length)
   throw Error('Paired buff is not legal');
  mark();
  open(s,{mode:'removeBoth',player,sourceUid:loc.c.uid,bp:ability.bp,
   choices:pl.hand.map(card=>card.uid)});
  return true;
 }
 if(ability.op==='restNamedImpact'){
  if(s.mainAbilityUsedUids.includes(loc.c.uid)||loc.line!=='front')throw Error('Named rest is not legal');
  const choices=pl.front.filter(card=>card?.ready&&named(api,pack,s,card,ability.name)).map(card=>card.uid);
  if(!choices.length)throw Error('Named rest is not legal');
  mark();
  open(s,{mode:'restImpact',player,sourceUid:loc.c.uid,choices});
  return true;
 }
 return false;
}
