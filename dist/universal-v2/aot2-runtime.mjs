// EX10BT scripts. The engine passes zone helpers; this file does not import it.
// Printed 「まで」 includes zero. A name-once lock is spent only when the
// printed condition applies. Registration is not an official FAQ certification.
import {cardHasName,cardHasTrait} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';
import {aot2StandingBp,aot2YellowNames} from './aot2-continuous.mjs';

const RUMBLE='地鳴らし';
const HEIR='巨人継承者';
const PURE='無垢の巨人';
const WARRIOR='マーレの戦士';
const CORPS='104期兵';
const FOOD='食材';
const NINE='歴代の九つの巨人';
const YMIR='始祖ユミル';
const ZIKE='ジーク・イェーガー';
const PIECK='ピーク・フィンガー';
const FINAL_EREN='エレン・イェーガー（終尾の巨人）';
const SLOTS=new Set([
 'AOT-2-002|onPlay','AOT-2-003|onPlay','AOT-2-007|onPlay','AOT-2-008|onPlay',
 'AOT-2-009|main','AOT-2-012|onPlay','AOT-2-013|onPlay','AOT-2-014|onPlay',
 'AOT-2-016|onPlay','AOT-2-017|onPlay','AOT-2-017|main','AOT-2-019|onPlay',
 'AOT-2-022|onPlay','AOT-2-022|main','AOT-2-024|onPlay','AOT-2-025|onPlay',
 'AOT-2-030|onPlay','AOT-2-030|onRetire','AOT-2-031|main','AOT-2-032|onPlay',
 'AOT-2-034|onPlay','AOT-2-036|onPlay','AOT-2-037|onPlay','AOT-2-040|main',
 'AOT-2-041|onAttack','AOT-2-042|onPlay','AOT-2-042|onAttack','AOT-2-044|main',
 'AOT-2-045|onPlay','AOT-2-047|onPlay','AOT-2-048|onPlay','AOT-2-049|onPlay',
 'AOT-2-050|onAttack','AOT-2-051|onPlay','AOT-2-051|main','AOT-2-053|onPlay',
 'AOT-2-055|onPlay','AOT-2-056|onPlay','AOT-2-056|onRetire','AOT-2-058|onAttack',
 'AOT-2-060|onPlay','AOT-2-060|onAttack','AOT-2-061|onPlay','AOT-2-062|onPlay',
 'AOT-2-065|onPlay','AOT-2-066|endStart','AOT-2-067|onPlay','AOT-2-069|onPlay',
 'AOT-2-071|main','AOT-2-071|onAttack','AOT-2-072|onPlay','AOT-2-073|onPlay'
]);
let A=null;
export function bindAot2(api){A=api;}
export function aot2Implements(id,slot){return SLOTS.has(id+'|'+slot);}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function selfOf(s,owner,uid){return A.location(s,owner,uid)?.c||null;}
function lineOf(s,owner,c){return c?A.location(s,owner,c.uid)?.line:null;}
function fieldCards(s,owner){return A.field(plOf(s,owner));}
function go(pack,s){if(!s.pending)A.go(pack,s);}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function lock(s,owner,key){
 if(!s.mainReadyOnceByName[owner].includes(key))s.mainReadyOnceByName[owner].push(key);
}
function locked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function onceKey(name,id,slot){return name+'|'+id+'|'+slot;}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function impact(s,c){
 if(c&&Number.isInteger(c.fieldEntryStamp))
  c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};
}
function sniper(s,c){
 if(c)c.aot2Sniper={turn:s.turn,stamp:c.fieldEntryStamp};
}
function names(pack,s,owner){return aot2YellowNames(pack,s,owner);}
function extra(pack,s,owner){return aot2StandingBp(pack,s,owner);}
function trait(pack,c,name){return cardHasTrait(def(pack,c),name);}
function exact(pack,c,name,s){return cardHasName(def(pack,c),name,originalEffectsDisabled(s,c));}
function contains(pack,c,token,s){
 const d=def(pack,c);
 const list=[d.name,...(originalEffectsDisabled(s,c)?[]:(d.nameAliases||[]))];
 return list.some(n=>typeof n==='string'&&n.includes(token));
}
function hasRaid(d){return !!(d.raidName||d.trigger==='raid');}
function events(pack,s,owner){
 return plOf(s,owner).outside.filter(c=>def(pack,c).type==='event').length;
}
// 「このキャラが場外から登場」 is this onPlay's entryCause. An earlier outside
// move of the same UID does not qualify a later hand play. COLOR life uses
// lifeColorOutside. A line change does not create an onPlay.
const OUTSIDE_ENTRY=new Set(['outsideEffect','outsideEffectRaid','lifeColorOutside']);
function thisEntryFromOutside(job){
 return OUTSIDE_ENTRY.has(job.entryCause);
}
function enteredThisTurn(s,owner,c){
 return !!(c&&(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===c.uid&&e.owner===owner&&
  ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from)));
}
function foodUsed(pack,s,owner){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.controller===owner&&
  e.from==='hand'&&e.reason==='rule'&&trait(pack,{uid:e.uid,cardId:e.cardId},FOOD));
}
function ymirAnywhere(pack,s,owner){
 return [...fieldCards(s,owner),...plOf(s,owner).outside].some(c=>exact(pack,c,YMIR,s));
}
function founders(pack,s,owner){
 return fieldCards(s,owner).some(c=>contains(pack,c,'エレン',s))&&
  fieldCards(s,owner).some(c=>contains(pack,c,'ジーク',s));
}
function hold(s,spec,actions){
 s.pending={kind:'aot2',player:spec.player,sourceUid:spec.sourceUid||null,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
}
function sig(a){
 return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,
  a?.replaceUid??null,a?.key??null]);
}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Attack on Titan vol.2 choice is not legal');
 return hit;
}
function act(mode,extra={}){return {type:'aot2',mode,...extra};}
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
function windowCards(s,owner,n){return plOf(s,owner).deck.slice(0,Math.min(n,plOf(s,owner).deck.length));}
function moveUid(pack,s,owner,from,uid,to,sourceUid){
 const index=plOf(s,owner)[from].findIndex(c=>c.uid===uid);
 if(index<0)throw Error('Attack on Titan vol.2 card left '+from);
 return A.move(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid});
}
function destinations(s,owner,line,definition){
 if(line==='energy'&&(definition.energyLineForbidden||definition.energyForbidden))return [];
 if(line==='front'&&definition.frontForbidden)return [];
 return A.destinations(plOf(s,owner),line).map(d=>({line,...d}));
}
function enterChoices(s,owner,from,cards,ready){
 const out=[];
 for(const c of cards){
  const d=def(A.pack,c);
  for(const line of ['front','energy'])for(const dest of destinations(s,owner,line,d))
   out.push(act('enter',{uid:c.uid,zone:from,ready,line:dest.line,slot:dest.slot,
    replaceUid:dest.replaceUid}));
 }
 return out;
}
function nameOnField(pack,s,owner,card){
 const d=def(pack,card);
 return fieldCards(s,owner).some(c=>exact(pack,c,d.name,s)||exact(pack,card,def(pack,c).name,s));
}
function oppFront(s,owner,pred){return plOf(s,1-owner).front.filter(c=>c&&pred(c));}
function cap(pack,s,owner,printed){return printed+extra(pack,s,owner);}
function pay(pack,s,owner,n,sourceUid){
 if(plOf(s,owner).apCards.filter(c=>c.ready).length<n)return false;
 A.spend(plOf(s,owner),n);
 if(sourceUid)A.noteEffect(pack,s,owner,sourceUid);
 return true;
}
function offerOrder(s,spec,uids,rest,after){
 const left=uids.filter(Boolean);
 if(left.length<=1){lay(plOf(s,spec.player),left,rest);return after||null;}
 hold(s,{...spec,step:'lookOrder',data:{left,built:[],rest,after,uids:left}},
  left.map(uid=>act('next',{uid,zone:'deck'})));
 return 'pending';
}
function beginLook(s,spec,count,match,opts){
 const window=windowCards(s,spec.player,count);
 if(!window.length)return false;
 const matches=window.filter(match);
 const data={uids:window.map(c=>c.uid),taken:[],names:[],max:opts.max,min:opts.min||0,
  rest:opts.rest,discard:opts.discard===true,reveal:opts.reveal!==false,
  to:opts.to||'hand',distinct:opts.distinct===true,after:opts.after||null};
 const actions=[
  ...(opts.min===0?[act('done')]:[]),
  ...matches.map(c=>act('take',{uid:c.uid,zone:'deck'}))
 ];
 if(!matches.length&&opts.min===0){
  const next=offerOrder(s,spec,data.uids,opts.rest,opts.after);
  return next==='pending';
 }
 if(!actions.length)return false;
 hold(s,{...spec,step:'lookPick',data},actions);
 return true;
}
function finishLook(pack,s,spec,data){
 const pl=plOf(s,spec.player);
 for(const uid of data.taken){
  const index=pl.deck.findIndex(c=>c.uid===uid);
  if(index<0)throw Error('Attack on Titan vol.2 look lost a card');
  const physical=pl.deck[index];
  if(data.reveal)publish(pack,s,spec.player,physical);
  A.move(pack,s,{owner:spec.player,from:'deck',to:data.to,index,reason:'own-effect',sourceUid:spec.sourceUid});
 }
 if(data.discard&&data.taken.length&&pl.hand.length){
  hold(s,{...spec,step:'discard',data:{need:1,after:data.after}},
   pl.hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
  return;
 }
 const left=data.uids.filter(uid=>!data.taken.includes(uid)&&pl.deck.some(c=>c.uid===uid));
 if(data.to==='outside'&&data.rest==='outside'){
  const next=offerOrder(s,spec,left,'bottom',data.after);
  if(next==='pending')return;
 }
 else{
  const next=offerOrder(s,spec,left,data.rest,data.after);
  if(next==='pending')return;
 }
 if(data.after)follow(pack,s,spec,data.after);
}
function follow(pack,s,spec,code){
 if(!code)return;
 if(code==='048'){deployBlue(pack,s,spec);return;}
 if(code==='053'){pureEnter(pack,s,spec);return;}
 if(code==='032b'){rumbleFollow(pack,s,spec);return;}
 if(code==='061'){pieckHand(pack,s,spec);return;}
 if(code==='072b'){lifeThenRetire(pack,s,spec,5000);return;}
 if(code==='leviBoth'){
  const c=selfOf(s,spec.player,spec.sourceUid);
  if(c){
   A.active(s,spec.player,c);
   c.readyOnAttackGranted={turn:s.turn,stamp:c.fieldEntryStamp};
  }
  return;
 }
 if(code==='mikasaRetire'){
  const loc=A.location(s,1-spec.player,spec.target);
  if(loc&&A.bp(pack,s,loc.c)>=5000)A.retire(pack,s,1-spec.player,loc.line,loc.slot);
 }
}
function deployBlue(pack,s,spec){
 const cards=plOf(s,spec.player).hand.filter(c=>{
  const d=def(pack,c);
  return d.type==='character'&&d.color==='blue'&&d.energy<=3&&d.ap===1;
 });
 const actions=[act('done'),...enterChoices(s,spec.player,'hand',cards,false)];
 if(actions.length===1)return;
 hold(s,{...spec,step:'enter',data:null},actions);
}
function pureEnter(pack,s,spec){
 const cards=plOf(s,spec.player).outside.filter(c=>trait(pack,c,PURE));
 const actions=[act('skip'),...enterChoices(s,spec.player,'outside',cards,false)];
 if(!plOf(s,spec.player).apCards.some(c=>c.ready))return;
 hold(s,{...spec,step:'payEnter',data:{ap:1}},actions);
}
function rumbleFollow(pack,s,spec){
 const owner=spec.player;
 const look=act('look');
 const deploy=ymirAnywhere(pack,s,owner)?act('deploy'):null;
 const actions=[act('done'),look,...(deploy?[deploy]:[])];
 hold(s,{...spec,step:'mode',data:null},actions);
}
function pieckHand(pack,s,spec){
 const cards=plOf(s,spec.player).outside.filter(c=>def(pack,c).type==='character'&&
  contains(pack,c,PIECK,s));
 if(!cards.length)return;
 hold(s,{...spec,step:'pick',data:{to:'hand',from:'outside'}},
  [act('done'),...cards.map(c=>act('take',{uid:c.uid,zone:'outside'}))]);
}
function lifeThenRetire(pack,s,spec,printed){
 const life=plOf(s,spec.player).life;
 if(!life.length)return;
 hold(s,{...spec,step:'life',data:{then:'retire',printed}},
  life.map(c=>act('life',{uid:c.uid,zone:'life'})));
}
function yellowZeke(pack,s,owner){
 return fieldCards(s,owner).filter(c=>{
  const d=def(pack,c);
  return d.type==='character'&&d.color==='yellow'&&contains(pack,c,'ジーク',s);
 });
}
function retiredOut(s,owner,uid){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.uid===uid&&
  e.to==='outside'&&e.reason==='retirement');
}
const RETIRE_FOLLOW=new Set(['leave-replacement','effect-raid-leave','effect-field-leave-remove','effect-substitute-retire']);
function retirePause(pending){
 if(!pending)return false;
 if(RETIRE_FOLLOW.has(pending.kind))return true;
 if(pending.kind==='csm'&&pending.step==='leaveReplace')return true;
 if(pending.kind==='kmr'&&(pending.step==='sub25'||pending.step==='spend51'))return true;
 if(pending.kind==='iys'&&pending.step==='leave')return true;
 return false;
}
// onRetire is queued by the retirement itself. The printed follow-up waits
// until that pause closes. opts.always is a sentence that does not require
// the chosen card to leave. The default follow is 「そうした場合」.
function retireThen(s,who,line,slot,follow,opts={}){
 const tail=s.effectQueue.splice(0);
 const paused=A.retire(A.pack,s,who,line,slot,opts.by?{by:opts.by}:undefined);
 if(paused&&retirePause(s.pending)){
  if(opts.always){
   s.pending.retirementAfter=[];
   s.pending.retirementTail=[...follow,...(s.pending.retirementTail||[]),...tail];
  }else{
   s.pending.retirementAfter=[...(s.pending.retirementAfter||[]),...follow];
   s.pending.retirementTail=[...(s.pending.retirementTail||[]),...tail];
  }
 }else if(paused)s.effectQueue.push(...tail);
 else s.effectQueue.push(...follow,...tail);
}
function retireOffer(s,spec,cards,optional,data,zone='opp'){
 const src=spec.sourceUid?selfOf(s,spec.player,spec.sourceUid):null;
 const type=src?def(A.pack,src).type:'event';
 const legal=cards.filter(c=>!A.blocked||!A.blocked(A.pack,s,spec.player,c.uid,type));
 if(!legal.length)return false;
 hold(s,{...spec,step:'retire',data:data||null},[
  ...(optional?[act('done')]:[]),
  ...legal.map(c=>act('retire',{uid:c.uid,zone}))
 ]);
 return true;
}
function doEnter(pack,s,owner,hit,sourceUid){
 const from=hit.zone;
 A.enter(pack,s,{owner,from,uid:hit.uid,line:hit.line,slot:hit.slot,
  replaceUid:hit.replaceUid,ready:hit.ready===true,sourceUid});
}

export function runAot2Job(pack,s,job){
 A.pack=pack;
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const owner=job.owner;
 const self=()=>selfOf(s,owner,job.sourceUid);
 const id=job.id;
 if(id==='AOT-2-002'){
  const cards=plOf(s,owner).hand.filter(c=>{
   const d=def(pack,c);
   return d.color==='yellow'&&d.type==='character'&&d.energy<=3&&d.ap===1&&
    !trait(pack,c,RUMBLE)&&!nameOnField(pack,s,owner,c);
  });
  const actions=[act('done'),...enterChoices(s,owner,'hand',cards,false)];
  if(actions.length>1)hold(s,{...spec,step:'enter'},actions);
  return;
 }
 if(id==='AOT-2-003'){
  if(names(pack,s,owner)<4)return;
  const cards=fieldCards(s,owner).filter(c=>c.uid!==job.sourceUid&&def(pack,c).type==='character');
  if(!cards.length)return;
  hold(s,{...spec,step:'buff',data:{bp:1500}},[act('done'),...cards.map(c=>act('buff',{uid:c.uid,zone:'field'}))]);
  return;
 }
 if(id==='AOT-2-007'){
  const c=self();
  if(!c||names(pack,s,owner)<4)return;
  buff(s,c,2000);sniper(s,c);return;
 }
 if(id==='AOT-2-008'){
  const c=self();
  const key=onceKey(def(pack,{cardId:id,uid:job.sourceUid}).name,id,'onPlay');
  if(!c||names(pack,s,owner)<4||plOf(s,1-owner).life.length>5||locked(s,owner,key))return;
  A.active(s,owner,c);lock(s,owner,key);return;
 }
 if(id==='AOT-2-012'){
  A.draw(pack,s,owner,1,job.sourceUid);
  if(names(pack,s,owner)<4&&plOf(s,owner).hand.length)
   hold(s,{...spec,step:'discard',data:{need:1}},plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
  return;
 }
 if(id==='AOT-2-013'){
  const c=self();
  if(lineOf(s,owner,c)!=='front')return;
  retireOffer(s,spec,oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,6000)),true);
  return;
 }
 if(id==='AOT-2-014'){
  const c=self();
  if(lineOf(s,owner,c)==='energy'&&names(pack,s,owner)>=4)A.active(s,owner,c);
  return;
 }
 if(id==='AOT-2-016'){
  beginLook(s,spec,3,c=>def(pack,c).type==='character'&&!trait(pack,c,RUMBLE),
   {max:1,min:0,rest:'bottom',discard:true});
  return;
 }
 if(id==='AOT-2-017'&&job.slot==='onPlay'){
  const pool=[...fieldCards(s,owner).filter(c=>c.uid!==job.sourceUid&&def(pack,c).type==='character'),
   ...plOf(s,owner).outside.filter(c=>def(pack,c).type==='character')]
   .filter(c=>def(pack,c).energy<=3&&!trait(pack,c,RUMBLE));
  hold(s,{...spec,step:'tuck',data:{taken:[],names:[]}},
   [act('done'),...pool.map(c=>act('tuck',{uid:c.uid,zone:plOf(s,owner).outside.includes(c)?'outside':'field'}))]);
  return;
 }
 if(id==='AOT-2-019'){
  const c=self();
  if(!c||names(pack,s,owner)<4)return;
  const until=plOf(s,owner).ownTurns+1;
  c.buffs??=[];c.buffs.push({bp:1000,untilOwnTurnStart:until});
  c.impactGranted={stamp:c.fieldEntryStamp,amount:1,untilOwnTurnStart:until,sourceUid:c.uid};
  c.aot2SelectTax={stamp:c.fieldEntryStamp,untilOwnTurnStart:until};
  return;
 }
 if(id==='AOT-2-022'&&job.slot==='onPlay'){
  const cards=[...plOf(s,owner).hand,...plOf(s,owner).outside].filter(c=>trait(pack,c,NINE));
  const actions=[act('done')];
  for(const c of cards){
   const zone=plOf(s,owner).hand.includes(c)?'hand':'outside';
   for(const dest of destinations(s,owner,'front',def(pack,c)))
    actions.push(act('enter',{uid:c.uid,zone,ready:true,...dest}));
   for(const dest of destinations(s,owner,'energy',def(pack,c)))
    actions.push(act('enter',{uid:c.uid,zone,ready:true,...dest}));
  }
  if(actions.length>1)hold(s,{...spec,step:'enter'},actions);
  return;
 }
 if(id==='AOT-2-024'){
  const c=self();
  const modes=[act('look')];
  if(thisEntryFromOutside(job))modes.push(act('draw'));
  if(modes.length===1){
   beginLook(s,spec,3,()=>true,{max:1,min:0,rest:'bottom',to:'outside',reveal:false});
   return;
  }
  hold(s,{...spec,step:'mode'},modes);
  return;
 }
 if(id==='AOT-2-025'){
  const c=self();
  if(c)impact(s,c);
  const high=fieldCards(s,owner).some(x=>contains(pack,x,'エレン',s))&&ymirAnywhere(pack,s,owner);
  retireOffer(s,spec,oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,high?4000:3000)),true);
  return;
 }
 if(id==='AOT-2-030'){
  const window=windowCards(s,owner,2);
  for(const c of window)publish(pack,s,owner,c);
  const matches=window.filter(c=>contains(pack,c,'ジーク',s));
  hold(s,{...spec,step:'revealOut',data:{uids:window.map(c=>c.uid),taken:[]}},[
   act('done'),...matches.map(c=>act('take',{uid:c.uid,zone:'deck'}))]);
  return;
 }
 if(id==='AOT-2-032'&&job.slot==='afterOwn'){
  if(!retiredOut(s,owner,job.sacrificedUid))return;
  const cards=oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,5000));
  if(!retireOffer(s,spec,cards,true,{then:'032b'}))rumbleFollow(pack,s,spec);
  return;
 }
 if(id==='AOT-2-032'&&job.slot==='afterOpp'){
  rumbleFollow(pack,s,spec);
  return;
 }
 if(id==='AOT-2-032'){
  retireOffer(s,spec,yellowZeke(pack,s,owner),false,{then:'032'},'field');
  return;
 }
 if(id==='AOT-2-034'){
  const pl=plOf(s,owner);
  while(pl.hand.length)moveUid(pack,s,owner,'hand',pl.hand[0].uid,'outside',job.sourceUid);
  for(const c of oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,5000))){
   const loc=A.location(s,1-owner,c.uid);
   if(loc)A.retire(pack,s,1-owner,loc.line,loc.slot);
   if(s.pending)return;
  }
  pl.aot2AttackOnly={turn:s.turn,name:FINAL_EREN};
  return;
 }
 if(id==='AOT-2-036'){
  beginLook(s,spec,5,c=>def(pack,c).type==='character'&&!trait(pack,c,RUMBLE),
   {max:3,min:0,rest:'bottom',distinct:true,discard:false});
  return;
 }
 if(id==='AOT-2-037'){
  const mikasa=fieldCards(s,owner).some(c=>exact(pack,c,'ミカサ・アッカーマン',s));
  retireOffer(s,spec,oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,mikasa?8000:5000)),false);
  return;
 }
 if(id==='AOT-2-041'){
  if(!plOf(s,owner).apCards.some(c=>c.ready))return;
  const cards=fieldCards(s,owner).filter(c=>def(pack,c).type==='character');
  hold(s,{...spec,step:'payBuff',data:{ap:1,bp:1500,max:2,taken:[]}},
   [act('skip'),...cards.map(c=>act('buff',{uid:c.uid,zone:'field'}))]);
  return;
 }
 if(id==='AOT-2-042'&&job.slot==='onPlay'){
  A.draw(pack,s,owner,1,job.sourceUid);
  if(plOf(s,owner).hand.length)
   hold(s,{...spec,step:'discardAp',data:null},[act('done'),...plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'}))]);
  return;
 }
 if(id==='AOT-2-042'&&job.slot==='onAttack'){
  if(!plOf(s,owner).apCards.some(c=>c.ready))return;
  hold(s,{...spec,step:'mode',data:{pay:1}},[act('skip'),act('draw'),act('impact')]);
  return;
 }
 if(id==='AOT-2-045'){
  const n=events(pack,s,owner);
  const modes=[act('d1')];
  if(n>=2)modes.push(act('d2'));
  if(n>=6)modes.push(act('d6'));
  hold(s,{...spec,step:'mode'},modes);
  return;
 }
 if(id==='AOT-2-047'){
  beginLook(s,spec,2,c=>def(pack,c).type==='event',{max:1,min:0,rest:'top',to:'outside',reveal:false});
  return;
 }
 if(id==='AOT-2-048'){deployBlue(pack,s,spec);return;}
 if(id==='AOT-2-049'){
  const cards=oppFront(s,owner,t=>{
   const n=A.bp(pack,s,t);
   return n<=cap(pack,s,owner,2500)||n>=4500;
  });
  retireOffer(s,spec,cards,false);
  return;
 }
 if(id==='AOT-2-050'||id==='AOT-2-055'){
  const cards=fieldCards(s,owner).filter(c=>c.uid!==job.sourceUid&&trait(pack,c,WARRIOR));
  if(!cards.length)return;
  hold(s,{...spec,step:'raidBuff',data:{self:id==='AOT-2-050'}},
   [act('done'),...cards.map(c=>act('buff',{uid:c.uid,zone:'field'}))]);
  return;
 }
 if(id==='AOT-2-051'&&job.slot==='onPlay'){
  const c=self();
  if(lineOf(s,owner,c)==='energy')A.active(s,owner,c);
  return;
 }
 if(id==='AOT-2-053'){
  const cards=oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,3000));
  if(!retireOffer(s,spec,cards,true,{then:'053'}))return;
  return;
 }
 if(id==='AOT-2-056'&&job.slot==='onPlay'){
  const c=self();
  if(!c)return;
  hold(s,{...spec,step:'mode'},[act('skip'),act('down')]);
  return;
 }
 if(id==='AOT-2-056'&&job.slot==='onRetire'){
  const base=job.baseUid&&plOf(s,owner).outside.find(c=>c.uid===job.baseUid);
  if(!base)return;
  hold(s,{...spec,step:'pick',data:{to:'hand',from:'outside'}},[act('done'),act('take',{uid:base.uid,zone:'outside'})]);
  return;
 }
 if(id==='AOT-2-058'){
  const c=self();
  if(c&&A.bp(pack,s,c)>=6000)A.draw(pack,s,owner,1,job.sourceUid);
  return;
 }
 if(id==='AOT-2-060'&&job.slot==='onPlay'){
  const c=self();
  if(!c||!plOf(s,owner).hand.length)return;
  hold(s,{...spec,step:'discardBuff',data:{bp:2000}},[act('done'),...plOf(s,owner).hand.map(x=>act('discard',{uid:x.uid,zone:'hand'}))]);
  return;
 }
 if(id==='AOT-2-060'&&job.slot==='onAttack'){
  const c=self();
  if(!c||A.bp(pack,s,c)<6000)return;
  A.draw(pack,s,owner,1,job.sourceUid);impact(s,c);return;
 }
 if(id==='AOT-2-061'){
  const own=fieldCards(s,owner).filter(c=>def(pack,c).type==='character'&&contains(pack,c,PIECK,s));
  const raised=plOf(s,owner).outside.some(c=>def(pack,c).type==='character'&&contains(pack,c,PIECK,s));
  hold(s,{...spec,step:'ownRetire',data:{raised}},[
   act('done'),...own.map(c=>act('retireOwn',{uid:c.uid,zone:'field'}))]);
  return;
 }
 if(id==='AOT-2-062'){
  const pl=plOf(s,owner);
  const prev=pl.aot2FoodAp&&pl.aot2FoodAp.turn===s.turn?pl.aot2FoodAp.amount:0;
  pl.aot2FoodAp={turn:s.turn,amount:prev+1};
  return;
 }
 if(id==='AOT-2-065'){
  const c=self();
  const key=onceKey('サシャ・ブラウス',id,'onPlay');
  if(!c||!foodUsed(pack,s,owner)||locked(s,owner,key))return;
  A.active(s,owner,c);lock(s,owner,key);return;
 }
 if(id==='AOT-2-066'){
  if(s.aot2CorpsReturned?.[owner]!==s.turn)return;
  const key=onceKey('ミカサ・アッカーマン',id,'end');
  if(locked(s,owner,key))return;
  const cards=plOf(s,owner).hand.filter(c=>c.cardId==='AOT-2-066');
  if(!cards.length)return;
  const actions=[act('done')];
  for(const c of cards)for(const dest of destinations(s,owner,'front',def(pack,c)))
   actions.push(act('enter',{uid:c.uid,zone:'hand',ready:false,...dest}));
  if(actions.length>1)hold(s,{...spec,step:'enter',data:{lock:key}},actions);
  return;
 }
 if(id==='AOT-2-067'){
  const outs=plOf(s,owner).outside.filter(c=>{
   const d=def(pack,c);
   return d.energy<=3&&!hasRaid(d)&&trait(pack,c,CORPS);
  });
  const foes=plOf(s,1-owner).front.filter(Boolean);
  hold(s,{...spec,step:'mode'},[
   ...(outs.length?[act('hand')]:[]),
   ...(foes.length?[act('battle')]:[]),
   act('done')]);
  return;
 }
 if(id==='AOT-2-069'){
  const c=self();
  if(lineOf(s,owner,c)==='front')A.draw(pack,s,owner,3,job.sourceUid);
  return;
 }
 if(id==='AOT-2-071'&&job.slot==='onAttack'){
  if(plOf(s,owner).life.length<=3){A.draw(pack,s,owner,1,job.sourceUid);return;}
  const top=plOf(s,owner).deck[0];
  if(!top)return;
  const d=def(pack,top);
  const can=d.energy<=3&&trait(pack,top,CORPS);
  hold(s,{...spec,step:'top',data:{uid:top.uid,can}},[
   act('top'),act('bottom'),...(can?[act('hand')]:[])]);
  return;
 }
 if(id==='AOT-2-072'){
  const c=self();
  if(c){c.buffs??=[];c.buffs.push({bp:1000,untilOwnTurnStart:plOf(s,owner).ownTurns+1});}
  const modes=[act('low')];
  if(plOf(s,owner).life.length)modes.push(act('life'));
  if(plOf(s,owner).life.length<=3)modes.push(act('bare'));
  hold(s,{...spec,step:'mode'},modes);
  return;
 }
 if(id==='AOT-2-073'){
  hold(s,{...spec,step:'mode'},[act('one'),act('two'),act('three')]);
  return;
 }
}

export function legalAot2Activations(pack,s,owner,c){
 if(!A||s.phase!=='main'||s.active!==owner||originalEffectsDisabled(s,c))return [];
 const d=def(pack,c),id=d.id;
 const out=[];
 const ready=!!c.ready;
 if(id==='AOT-2-009'&&names(pack,s,owner)>=4&&!locked(s,owner,onceKey(d.name,id,'main'))&&
  plOf(s,owner).apCards.some(x=>x.ready))
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 if(id==='AOT-2-017'&&ready){
  const under=(c.under||[]).filter(x=>x?.faceDown);
  if(under.length)out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
  for(let i=0;i<under.length-1;i++)
   out.push({type:'activate',uid:c.uid,mode:'aot2:'+id+':swap:'+i});
 }
 if(id==='AOT-2-022'&&!enteredThisTurn(s,owner,c)&&!used(s,c.uid+'|AOT-2-022')&&
  plOf(s,owner).apCards.some(x=>x.ready))
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 if(id==='AOT-2-031'&&ready&&plOf(s,owner).hand.length>=2&&plOf(s,owner).apCards.some(x=>x.ready)&&
  plOf(s,owner).outside.some(x=>{
   const p=def(pack,x);
   return p.color==='yellow'&&p.type==='character'&&p.energy<=2&&contains(pack,x,'イェーガー',s);
  }))
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 if(id==='AOT-2-040'&&ready&&!used(s,c.uid+'|AOT-2-040'))
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 if(id==='AOT-2-044'&&ready&&events(pack,s,owner)>=6&&
  fieldCards(s,owner).some(x=>x.uid!==c.uid&&trait(pack,x,CORPS)))
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 if(id==='AOT-2-051'&&ready&&plOf(s,owner).hand.length&&
  fieldCards(s,owner).some(x=>x.uid!==c.uid&&trait(pack,x,WARRIOR)))
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 if(id==='AOT-2-071'&&!used(s,c.uid+'|AOT-2-071')&&plOf(s,owner).life.length)
  out.push({type:'activate',uid:c.uid,mode:'aot2:'+id});
 return out;
}
export function activateAot2(pack,s,action){
 A.pack=pack;
 const owner=s.active,c=selfOf(s,owner,action.uid);
 if(!c)throw Error('Attack on Titan vol.2 activator left');
 const mode=String(action.mode||'');
 if(mode.includes(':swap:')){
  const index=+mode.slice(mode.lastIndexOf(':')+1);
  const under=(c.under||[]).filter(x=>x?.faceDown);
  if(!under[index]||!under[index+1])throw Error('Attack on Titan vol.2 under order left');
  const a=c.under.indexOf(under[index]),b=c.under.indexOf(under[index+1]);
  const tmp=c.under[a];c.under[a]=c.under[b];c.under[b]=tmp;
  return;
 }
 const id=def(pack,c).id;
 const spec={player:owner,sourceUid:c.uid,id};
 if(id==='AOT-2-009'){
  const key=onceKey(def(pack,c).name,id,'main');
  if(names(pack,s,owner)<4||locked(s,owner,key)||!pay(pack,s,owner,1,c.uid))
   throw Error('Levi main is not legal');
  lock(s,owner,key);
  const two=plOf(s,owner).hand.length? [act('two')]:[];
  hold(s,{...spec,step:'levi'},[act('one'),...two]);
  return;
 }
 if(id==='AOT-2-017'){
  A.noteRest(s,owner,c);c.ready=false;
  const under=(c.under||[]).filter(x=>x.faceDown);
  hold(s,{...spec,step:'under'},[act('done'),...under.map(x=>act('hand',{uid:x.uid,zone:'under'}))]);
  return;
 }
 if(id==='AOT-2-022'){
  if(enteredThisTurn(s,owner,c)||used(s,c.uid+'|AOT-2-022')||!pay(pack,s,owner,1,c.uid))
   throw Error('Founding Titan replay is not legal');
  use(s,c.uid+'|AOT-2-022');
  runAot2Job(pack,s,{op:'aot2',id,slot:'onPlay',owner,sourceUid:c.uid});
  return;
 }
 if(id==='AOT-2-031'){
  if(!c.ready||plOf(s,owner).hand.length<2||!pay(pack,s,owner,1,c.uid))
   throw Error('Ymir main is not legal');
  A.noteRest(s,owner,c);c.ready=false;
  hold(s,{...spec,step:'discard',data:{need:2,after:'031'}},
   plOf(s,owner).hand.map(x=>act('discard',{uid:x.uid,zone:'hand'})));
  return;
 }
 if(id==='AOT-2-040'){
  if(!c.ready||used(s,c.uid+'|AOT-2-040'))throw Error('Levi energy main is not legal');
  A.noteRest(s,owner,c);c.ready=false;use(s,c.uid+'|AOT-2-040');
  const fronts=plOf(s,owner).front.filter(x=>x?.ready);
  if(!fronts.length)return;
  hold(s,{...spec,step:'restFront'},fronts.map(x=>act('rest',{uid:x.uid,zone:'front'})));
  return;
 }
 if(id==='AOT-2-044'){
  if(!c.ready||events(pack,s,owner)<6)throw Error('Historia main is not legal');
  A.noteRest(s,owner,c);c.ready=false;
  const cards=fieldCards(s,owner).filter(x=>x.uid!==c.uid&&trait(pack,x,CORPS));
  hold(s,{...spec,step:'buff',data:{bp:1000}},cards.map(x=>act('buff',{uid:x.uid,zone:'field'})));
  return;
 }
 if(id==='AOT-2-051'){
  if(!c.ready||!plOf(s,owner).hand.length)throw Error('Falco main is not legal');
  A.noteRest(s,owner,c);c.ready=false;
  const cards=fieldCards(s,owner).filter(x=>x.uid!==c.uid&&trait(pack,x,WARRIOR));
  hold(s,{...spec,step:'discardRaid',data:null},[
   ...plOf(s,owner).hand.map(x=>act('discard',{uid:x.uid,zone:'hand'}))]);
  s.pending.data={warriors:cards.map(x=>x.uid)};
  return;
 }
 if(id==='AOT-2-071'){
  if(used(s,c.uid+'|AOT-2-071')||!plOf(s,owner).life.length)throw Error('Eren life main is not legal');
  use(s,c.uid+'|AOT-2-071');
  hold(s,{...spec,step:'life',data:{then:'impact'}},
   plOf(s,owner).life.map(x=>act('life',{uid:x.uid,zone:'life'})));
  return;
 }
 throw Error('Attack on Titan vol.2 activation is not legal');
}

function discardSome(pack,s,q,a){
 const hit=takeAction(q,a);
 const data=q.data||{};
 data.gone??=[];
 if(hit.mode==='done')throw Error('Discard is required');
 moveUid(pack,s,q.player,'hand',hit.uid,'outside',q.sourceUid);
 data.gone.push(hit.uid);
 data.need-=1;
 if(data.need>0&&plOf(s,q.player).hand.length){
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'discard',data},
   plOf(s,q.player).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
  return;
 }
 const after=data.after;
 if(after==='031'){
  const cards=plOf(s,q.player).outside.filter(c=>{
   const d=def(pack,c);
   return d.color==='yellow'&&d.type==='character'&&d.energy<=2&&contains(pack,c,'イェーガー',s);
  });
  const actions=enterChoices(s,q.player,'outside',cards,false);
  if(actions.length)hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'enter'},actions);
  return;
 }
 if(after)follow(pack,s,{player:q.player,sourceUid:q.sourceUid,id:q.id,target:data.target},after);
}
export function resolveAot2Pending(pack,s,a){
 A.pack=pack;
 const q=s.pending;
 const hit=takeAction(q,a);
 const owner=q.player;
 const spec={player:owner,sourceUid:q.sourceUid,id:q.id};
 if(q.step==='lookPick'){
  const data=q.data;
  if(hit.mode==='done'||data.taken.length>=data.max){
   s.pending=null;finishLook(pack,s,spec,data);go(pack,s);return;
  }
  if(!data.uids.includes(hit.uid)||data.taken.includes(hit.uid))throw Error('Look take left the window');
  const card=plOf(s,owner).deck.find(c=>c.uid===hit.uid);
  data.taken.push(hit.uid);
  if(data.distinct)data.names.push(def(pack,card).name);
  if(data.taken.length>=data.max){s.pending=null;finishLook(pack,s,spec,data);go(pack,s);return;}
  const left=data.uids.filter(uid=>!data.taken.includes(uid));
  const actions=[act('done'),...left.filter(uid=>{
   const c=plOf(s,owner).deck.find(x=>x.uid===uid);
   if(!c)return false;
   if(data.distinct&&data.names.includes(def(pack,c).name))return false;
   if(q.id==='AOT-2-016')return def(pack,c).type==='character'&&!trait(pack,c,RUMBLE);
   if(q.id==='AOT-2-036')return def(pack,c).type==='character'&&!trait(pack,c,RUMBLE);
   if(q.id==='AOT-2-047')return def(pack,c).type==='event';
   if(q.id==='AOT-2-032')return exact(pack,c,YMIR,s);
   return true;
  }).map(uid=>act('take',{uid,zone:'deck'}))];
  hold(s,{...spec,step:'lookPick',data},actions);
  return;
 }
 if(q.step==='lookOrder'){
  const data=q.data;
  data.built.push(hit.uid);
  data.left=data.left.filter(uid=>uid!==hit.uid);
  if(data.left.length){
   hold(s,{...spec,step:'lookOrder',data},data.left.map(uid=>act('next',{uid,zone:'deck'})));
   return;
  }
  lay(plOf(s,owner),data.built,data.rest);
  s.pending=null;
  if(data.after)follow(pack,s,spec,data.after);
  go(pack,s);return;
 }
 if(q.step==='discard'){
  s.pending=null;discardSome(pack,s,q,hit);go(pack,s);return;
 }
 if(q.step==='enter'){
  s.pending=null;
  if(hit.mode==='done'){go(pack,s);return;}
  if(q.data?.lock)lock(s,owner,q.data.lock);
  doEnter(pack,s,owner,hit,q.sourceUid);
  go(pack,s);return;
 }
 if(q.step==='buff'){
  s.pending=null;
  if(hit.mode!=='done'){
   const c=fieldCards(s,owner).find(x=>x.uid===hit.uid);
   buff(s,c,q.data?.bp||1000);
  }
  go(pack,s);return;
 }
 if(q.step==='retire'){
  s.pending=null;
  if(hit.mode==='done'){
   if(q.data?.then==='032b')rumbleFollow(pack,s,spec);
   go(pack,s);return;
  }
  const own=hit.zone==='field';
  const who=own?owner:1-owner;
  const loc=A.location(s,who,hit.uid);
  if(!loc)throw Error('Retirement target left');
  if(q.data?.then==='032'){
   retireThen(s,who,loc.line,loc.slot,[{op:'aot2',id:'AOT-2-032',slot:'afterOwn',
    owner,sourceUid:q.sourceUid,sacrificedUid:hit.uid}]);
   go(pack,s);return;
  }
  if(q.data?.then==='032b'){
   retireThen(s,who,loc.line,loc.slot,[{op:'aot2',id:'AOT-2-032',slot:'afterOpp',
    owner,sourceUid:q.sourceUid}],{by:'opponent',always:true});
   go(pack,s);return;
  }
  const paused=A.retire(pack,s,who,loc.line,loc.slot);
  if(paused===true)return;
  if(q.data?.then==='053')pureEnter(pack,s,spec);
  go(pack,s);return;
 }
 if(q.step==='mode'){
  s.pending=null;
  resolveMode(pack,s,spec,q,hit);
  go(pack,s);return;
 }
 if(q.step==='revealOut'){
  const data=q.data;
  if(hit.mode==='take'){
   publish(pack,s,owner,plOf(s,owner).deck.find(c=>c.uid===hit.uid));
   moveUid(pack,s,owner,'deck',hit.uid,'hand',q.sourceUid);
   data.taken.push(hit.uid);
  }
  s.pending=null;
  for(const uid of data.uids){
   if(data.taken.includes(uid))continue;
   if(plOf(s,owner).deck.some(c=>c.uid===uid))moveUid(pack,s,owner,'deck',uid,'outside',q.sourceUid);
  }
  if(data.taken.length&&plOf(s,owner).hand.length)
   hold(s,{...spec,step:'discard',data:{need:1}},plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
  go(pack,s);return;
 }
 if(q.step==='tuck'){
  const data=q.data;
  if(hit.mode==='done'||data.taken.length>=3){s.pending=null;go(pack,s);return;}
  const host=selfOf(s,owner,q.sourceUid);
  const from=hit.zone;
  const card=from==='outside'?plOf(s,owner).outside.find(c=>c.uid===hit.uid):
   fieldCards(s,owner).find(c=>c.uid===hit.uid);
  if(!host||!card||data.names.includes(def(pack,card).name))throw Error('Tuck target left');
  let physical,fromLine;
  if(from==='outside'){
   const index=plOf(s,owner).outside.findIndex(c=>c.uid===card.uid);
   physical=plOf(s,owner).outside.splice(index,1)[0];
   fromLine='outside';
  }else{
   const detached=A.detach(pack,s,owner,card.uid,q.sourceUid);
   physical=detached.physical;
   fromLine=detached.from;
  }
  physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
  host.under??=[];host.under.push(physical);
  A.record(pack,s,{physical,owner,from:fromLine,to:'raid-under',reason:'own-effect',sourceUid:host.uid});
  data.taken.push(physical.uid);data.names.push(def(pack,physical).name);
  if(data.taken.length>=3){s.pending=null;go(pack,s);return;}
  const pool=[...fieldCards(s,owner).filter(c=>c.uid!==host.uid&&def(pack,c).type==='character'),
   ...plOf(s,owner).outside.filter(c=>def(pack,c).type==='character')]
   .filter(c=>def(pack,c).energy<=3&&!trait(pack,c,RUMBLE)&&!data.names.includes(def(pack,c).name));
  hold(s,{...spec,step:'tuck',data},[act('done'),...pool.map(c=>act('tuck',{uid:c.uid,
   zone:plOf(s,owner).outside.includes(c)?'outside':'field'}))]);
  return;
 }
 if(q.step==='under'){
  s.pending=null;
  if(hit.mode==='done'){go(pack,s);return;}
  const host=selfOf(s,owner,q.sourceUid);
  const index=(host?.under||[]).findIndex(c=>c.uid===hit.uid);
  if(!host||index<0)throw Error('Facedown under-card left');
  const physical=host.under.splice(index,1)[0];
  physical.faceDown=false;
  plOf(s,owner).hand.push(physical);
  A.record(pack,s,{physical,owner,from:'raid-under',to:'hand',reason:'own-effect',
   sourceUid:host.uid,attachedToUid:host.uid,wasFaceDown:true});
  go(pack,s);return;
 }
 if(q.step==='life'){
  s.pending=null;
  moveUid(pack,s,owner,'life',hit.uid,'hand',q.sourceUid);
  if(q.data?.then==='impact')impact(s,selfOf(s,owner,q.sourceUid));
  if(q.data?.then==='retire')
   retireOffer(s,spec,oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,q.data.printed)),true);
  go(pack,s);return;
 }
 if(q.step==='payBuff'){
  if(hit.mode==='skip'&&!q.data.paid){s.pending=null;go(pack,s);return;}
  if(!q.data.paid){
   if(!pay(pack,s,owner,q.data.ap,q.sourceUid))throw Error('Not enough AP');
   q.data.paid=true;
  }
  const c=fieldCards(s,owner).find(x=>x.uid===hit.uid);
  if(!c||q.data.taken.includes(c.uid))throw Error('Buff target left');
  buff(s,c,q.data.bp);q.data.taken.push(c.uid);
  if(q.data.taken.length>=q.data.max){s.pending=null;go(pack,s);return;}
  const left=fieldCards(s,owner).filter(x=>def(pack,x).type==='character'&&!q.data.taken.includes(x.uid));
  hold(s,{...spec,step:'payBuff',data:q.data},[act('done'),...left.map(x=>act('buff',{uid:x.uid,zone:'field'}))]);
  return;
 }
 if(q.step==='discardAp'){
  s.pending=null;
  if(hit.mode!=='done'){
   moveUid(pack,s,owner,'hand',hit.uid,'outside',q.sourceUid);
   const ap=plOf(s,owner).apCards.find(c=>!c.ready&&c.inPlay);
   if(ap)A.readyAp(s,owner,ap);
  }
  go(pack,s);return;
 }
 if(q.step==='discardBuff'){
  s.pending=null;
  if(hit.mode!=='done'){
   moveUid(pack,s,owner,'hand',hit.uid,'outside',q.sourceUid);
   buff(s,selfOf(s,owner,q.sourceUid),q.data.bp);
  }
  go(pack,s);return;
 }
 if(q.step==='raidBuff'){
  s.pending=null;
  if(hit.mode!=='done'){
   const c=fieldCards(s,owner).find(x=>x.uid===hit.uid);
   const raided=A.raided(pack,c);
   buff(s,c,raided?2000:1000);
   if(raided&&q.data?.self)buff(s,selfOf(s,owner,q.sourceUid),2000);
  }
  go(pack,s);return;
 }
 if(q.step==='payEnter'){
  s.pending=null;
  if(hit.mode==='skip'){go(pack,s);return;}
  if(!pay(pack,s,owner,1,q.sourceUid))throw Error('Not enough AP');
  doEnter(pack,s,owner,{...hit,ready:false},q.sourceUid);
  go(pack,s);return;
 }
 if(q.step==='ownRetire'){
  s.pending=null;
  let retired=false;
  if(hit.mode==='retireOwn'){
   const loc=A.location(s,owner,hit.uid);
   if(loc){A.retire(pack,s,owner,loc.line,loc.slot);retired=true;}
  }
  const printed=q.data?.raised?5000:3000;
  const cards=oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,printed));
  hold(s,{...spec,step:'retire',data:{then:retired?'061':null}},
   [act('done'),...cards.map(c=>act('retire',{uid:c.uid,zone:'opp'}))]);
  return;
 }
 if(q.step==='restFront'){
  s.pending=null;
  const c=plOf(s,owner).front.find(x=>x?.uid===hit.uid&&x.ready);
  if(!c)throw Error('Active front character left');
  A.noteRest(s,owner,c);c.ready=false;
  const self=selfOf(s,owner,q.sourceUid);
  if(self){self.buffs??=[];self.buffs.push({energy:1,color:'blue',untilTurn:s.turn});}
  go(pack,s);return;
 }
 if(q.step==='discardRaid'){
  s.pending=null;
  moveUid(pack,s,owner,'hand',hit.uid,'outside',q.sourceUid);
  const cards=fieldCards(s,owner).filter(x=>q.data.warriors.includes(x.uid));
  hold(s,{...spec,step:'raidBuff'},cards.map(x=>act('buff',{uid:x.uid,zone:'field'})));
  go(pack,s);return;
 }
 if(q.step==='pick'){
  s.pending=null;
  if(hit.mode==='take')moveUid(pack,s,owner,q.data.from,hit.uid,q.data.to,q.sourceUid);
  go(pack,s);return;
 }
 if(q.step==='top'){
  s.pending=null;
  const top=plOf(s,owner).deck[0];
  if(!top||top.uid!==q.data.uid)throw Error('Top card changed');
  if(hit.mode==='hand'){
   publish(pack,s,owner,top);
   moveUid(pack,s,owner,'deck',top.uid,'hand',q.sourceUid);
  }else if(hit.mode==='bottom'){
   plOf(s,owner).deck.shift();plOf(s,owner).deck.push(top);
  }
  go(pack,s);return;
 }
 if(q.step==='mikasa'){
  s.pending=null;
  if(hit.mode==='done'){go(pack,s);return;}
  const foe=plOf(s,1-owner).front.find(c=>c?.uid===hit.uid);
  if(!foe)throw Error('Mikasa target left');
  if(A.bp(pack,s,foe)>=5000&&plOf(s,owner).hand.length>=2)
   hold(s,{...spec,step:'discard',data:{need:2,after:'mikasaRetire',target:foe.uid}},
    plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
  go(pack,s);return;
 }
 if(q.step==='levi'){
  s.pending=null;
  if(hit.mode==='two'){
   hold(s,{...spec,step:'discard',data:{need:1,after:'leviBoth'}},
    plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
   go(pack,s);return;
  }
  hold(s,{...spec,step:'mode'},[act('active'),act('double')]);
  go(pack,s);return;
 }
 if(q.step==='foodBuff'){
  s.pending=null;
  const data=q.data;
  if(hit.mode==='buff'){
   const c=fieldCards(s,owner).find(x=>x.uid===hit.uid);
   if(!c||data.taken.includes(c.uid))throw Error('Food target left');
   buff(s,c,1000);data.taken.push(c.uid);
  }
  if(hit.mode==='done'||data.taken.length>=data.max){
   if(data.draw)A.draw(pack,s,owner,data.draw,q.sourceUid);
   go(pack,s);return;
  }
  const left=fieldCards(s,owner).filter(x=>def(pack,x).type==='character'&&!data.taken.includes(x.uid));
  hold(s,{...spec,step:'foodBuff',data},[act('done'),...left.map(x=>act('buff',{uid:x.uid,zone:'field'}))]);
  return;
 }
 throw Error('Attack on Titan vol.2 step is not resolved: '+q.step);
}
function resolveMode(pack,s,spec,q,hit){
 const owner=spec.player;
 const self=selfOf(s,owner,q.sourceUid);
 if(q.id==='AOT-2-024'){
  if(hit.mode==='draw'){A.draw(pack,s,owner,1,q.sourceUid);return;}
  beginLook(s,spec,3,()=>true,{max:1,min:0,rest:'bottom',to:'outside',reveal:false});
  return;
 }
 if(q.id==='AOT-2-042'){
  if(hit.mode==='skip')return;
  if(!pay(pack,s,owner,1,q.sourceUid))throw Error('Not enough AP');
  if(hit.mode==='draw'){A.draw(pack,s,owner,1,q.sourceUid);buff(s,self,1000);return;}
  buff(s,self,1000);impact(s,self);return;
 }
 if(q.id==='AOT-2-045'){
  if(hit.mode==='d1'){
   A.draw(pack,s,owner,1,q.sourceUid);
   if(plOf(s,owner).hand.length)hold(s,{...spec,step:'discard',data:{need:1}},
    plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
   return;
  }
  if(hit.mode==='d2'){A.draw(pack,s,owner,1,q.sourceUid);return;}
  A.draw(pack,s,owner,2,q.sourceUid);
  if(plOf(s,owner).hand.length)hold(s,{...spec,step:'discard',data:{need:1}},
   plOf(s,owner).hand.map(c=>act('discard',{uid:c.uid,zone:'hand'})));
  return;
 }
 if(q.id==='AOT-2-056'){
  if(hit.mode==='skip'||!self)return;
  buff(s,self,-2000);
  self.aot2EnergyAttack={turn:s.turn,stamp:self.fieldEntryStamp};
  sniper(s,self);
  return;
 }
 if(q.id==='AOT-2-032'){
  if(hit.mode==='done')return;
  if(hit.mode==='look'){
   beginLook(s,spec,7,c=>exact(pack,c,YMIR,s),{max:1,min:0,rest:'bottom',discard:false});
   return;
  }
  const cards=plOf(s,owner).outside.filter(c=>def(pack,c).color==='yellow'&&exact(pack,c,ZIKE,s)&&!hasRaid(def(pack,c)));
  const actions=[act('done'),...enterChoices(s,owner,'outside',cards,false)];
  if(actions.length>1)hold(s,{...spec,step:'enter'},actions);
  return;
 }
 if(q.id==='AOT-2-067'){
  if(hit.mode==='done')return;
  if(hit.mode==='hand'){
   const cards=plOf(s,owner).outside.filter(c=>{
    const d=def(pack,c);return d.energy<=3&&!hasRaid(d)&&trait(pack,c,CORPS);
   });
   hold(s,{...spec,step:'pick',data:{to:'hand',from:'outside'}},
    [act('done'),...cards.map(c=>act('take',{uid:c.uid,zone:'outside'}))]);
   return;
  }
  const foes=plOf(s,1-owner).front.filter(Boolean);
  hold(s,{...spec,step:'mikasa'},[act('done'),...foes.map(c=>act('mark',{uid:c.uid,zone:'opp'}))]);
  return;
 }
 if(q.id==='AOT-2-072'){
  if(hit.mode==='low'){
   retireOffer(s,spec,oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,3000)),true);return;
  }
  if(hit.mode==='life'){lifeThenRetire(pack,s,spec,5000);return;}
  retireOffer(s,spec,oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,5000)),true);
  return;
 }
 if(q.id==='AOT-2-073'){
  const max=hit.mode==='one'?1:hit.mode==='two'?2:3;
  const draw=hit.mode==='one'?2:hit.mode==='two'?1:0;
  const cards=fieldCards(s,owner).filter(c=>def(pack,c).type==='character');
  hold(s,{...spec,step:'foodBuff',data:{max,draw,taken:[]}},
   [act('done'),...cards.map(c=>act('buff',{uid:c.uid,zone:'field'}))]);
  return;
 }
 if(q.id==='AOT-2-009'){
  const c=selfOf(s,owner,q.sourceUid);
  if(hit.mode==='active'&&c)A.active(s,owner,c);
  if(hit.mode==='double'&&c)c.readyOnAttackGranted={turn:s.turn,stamp:c.fieldEntryStamp};
  if(hit.mode==='both'&&c){
   A.active(s,owner,c);
   c.readyOnAttackGranted={turn:s.turn,stamp:c.fieldEntryStamp};
  }
 }
}
export function legalAot2Pending(pack,s){
 const q=s.pending;
 if(q.step==='mikasa'){
  return (q.actions||[]).filter(a=>a.mode==='done'||plOf(s,1-q.player).front.some(c=>c?.uid===a.uid));
 }
 return q.actions||[];
}
export function aot2MandatoryTargets(pack,s,owner,job){
 A.pack=pack;
 if(job.id==='AOT-2-032')
  return yellowZeke(pack,s,owner).length>0;
 if(job.id==='AOT-2-037'){
  const mikasa=fieldCards(s,owner).some(c=>exact(pack,c,'ミカサ・アッカーマン',s));
  return oppFront(s,owner,t=>A.bp(pack,s,t)<=cap(pack,s,owner,mikasa?8000:5000)).length>0;
 }
 if(job.id==='AOT-2-049')
  return oppFront(s,owner,t=>{
   const n=A.bp(pack,s,t);return n<=cap(pack,s,owner,2500)||n>=4500;
  }).length>0;
 return true;
}
