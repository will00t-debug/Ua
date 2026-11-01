// UA29BT / UA29ST scripts. The engine passes zone helpers; this file does not import it.
// Printed choices include zero when the sentence says まで. A name-once lock
// is spent only when the effect actually happens.
// Character entry goes through offerFieldEntry: one action per destination,
// then the shared gesture (select the card, mode only if both are printed, tap the cell).
// Registration is not an official FAQ certification.
import {cardHasName,cardHasTrait} from './field-conditions.mjs';
import {originalEffectsDisabled,grantContinuousState} from './continuous-states.mjs';

const INTEL='飛電インテリジェンス';
const GEAR='ファイズギア';
const DOCTOR='ドクター';
const IMAGIN=['モモタロス','ウラタロス','キンタロス','リュウタロス'];
const ZIO_NAMES=['ジオウ','ゲイツ','ウォズ','ツクヨミ'];
let A=null;
export function bindKmr(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return !originalEffectsDisabled(s,c);}
function selfOf(s,owner,uid){return A.location(s,owner,uid)?.c||null;}
function arm(pack){A.pack=pack;}
function hold(s,spec,actions){
 s.pending={kind:'kmr',player:spec.player,sourceUid:spec.sourceUid||null,id:spec.id,
  step:spec.step,actions,data:spec.data||null,
  ...(Array.isArray(spec.uids)?{uids:spec.uids.slice()}:{})};
}
function sig(a){
 return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,
  a?.replaceUid??null,a?.baseUid??null,a?.key??null,a?.ready??null,a?.from??null]);
}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Kamen Rider choice is not legal');
 return hit;
}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function nameLocked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function nameLock(s,owner,key){if(!nameLocked(s,owner,key))s.mainReadyOnceByName[owner].push(key);}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function grantImpact(s,c){if(c)c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function grantDamage(s,c){if(c)c.attackDamageGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:2};}
function grantImmune(s,c){if(c)c.oppChoiceImmuneGranted={turn:s.turn,stamp:c.fieldEntryStamp};}
function grantSniper(s,c){if(c)c.sniperGranted={turn:s.turn,stamp:c.fieldEntryStamp};}
function grantUnblockedDraw(s,c){if(c)c.unblockedDrawGranted={turn:s.turn,stamp:c.fieldEntryStamp};}
function token(pack,c,name,s){
 const d=def(pack,c);
 if(d.name?.includes(name))return true;
 if(s&&!live(s,c))return false;
 return (d.nameAliases||[]).some(n=>typeof n==='string'&&n.includes(name));
}
function exact(pack,c,name,s){return cardHasName(def(pack,c),name,s?originalEffectsDisabled(s,c):false);}
function trait(pack,c,name){return cardHasTrait(def(pack,c),name);}
function fieldCards(s,owner){return A.field(plOf(s,owner));}
function rememberRaid(pack,s,owner,physical){
 const d=def(pack,physical);
 if(d.raidName&&d.color!=='yellow'){
  s.kmrRaidToHand??={};
  s.kmrRaidToHand[owner]=s.turn;
 }
}
function windowCards(s,owner,n){return plOf(s,owner).deck.slice(0,Math.min(n,plOf(s,owner).deck.length));}
function moveUid(pack,s,owner,from,uid,to,sourceUid,deckPosition){
 const index=plOf(s,owner)[from].findIndex(c=>c.uid===uid);
 if(index<0)throw Error('Kamen Rider card left '+from);
 const physical=A.move(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid,
  ...(to==='deck'?{deckPosition:deckPosition||'bottom',revealed:false}:{})});
 if(to==='hand')rememberRaid(pack,s,owner,physical);
 return physical;
}
function discard(pack,s,owner,uid,sourceUid){return moveUid(pack,s,owner,'hand',uid,'outside',sourceUid);}
function lay(pl,uids,where){
 const picked=[];
 for(const uid of uids){
  const index=pl.deck.findIndex(c=>c.uid===uid);
  if(index<0)throw Error('Kamen Rider order lost a card');
  picked.push(pl.deck.splice(index,1)[0]);
 }
 if(where==='top')pl.deck.unshift(...picked);
 else pl.deck.push(...picked);
}
function offerOrder(s,spec,uids,where,after){
 const left=uids.filter(Boolean);
 if(left.length<=1){lay(plOf(s,spec.player),left,where);return false;}
 hold(s,{...spec,step:'lookOrder',data:{left,built:[],where,after:after||null,uids:left}},
  left.map(uid=>({type:'kmr',mode:'next',uid})));
 return true;
}
function beginLook(s,spec,count,match,opts){
 const window=windowCards(s,spec.player,count);
 if(!window.length)return false;
 const matches=window.filter(c=>match(c));
 // hits 是可以拿的 UID。uids 仍是看過的整段，不能選的也留在視窗裡。
 const data={uids:window.map(c=>c.uid),hits:matches.map(c=>c.uid),taken:[],max:opts.max??1,min:opts.min||0,
  where:opts.where||'bottom',discard:opts.discard===true,after:opts.after||null,
  split:opts.split===true};
 const actions=[
  ...(data.min===0?[{type:'kmr',mode:'done'}]:[]),
  ...matches.map(c=>({type:'kmr',mode:'take',uid:c.uid}))
 ];
 if(!matches.length&&data.min===0){
  if(data.split){
   if(!offerOrder(s,spec,data.uids,'top','splitBottom:'+data.uids.join(',')))return false;
   return true;
  }
  if(!offerOrder(s,spec,data.uids,data.where,data.after))return false;
  return true;
 }
 if(!actions.length)return false;
 hold(s,{...spec,step:'lookPick',data},actions);
 return true;
}
function finishLook(pack,s,spec,data){
 const pl=plOf(s,spec.player);
 for(const uid of data.taken){
  const index=pl.deck.findIndex(c=>c.uid===uid);
  if(index<0)throw Error('Kamen Rider look lost a card');
  const physical=pl.deck[index];
  A.reveal(pack,s,spec.player,physical);
  A.move(pack,s,{owner:spec.player,from:'deck',to:'hand',index,reason:'own-effect',sourceUid:spec.sourceUid});
  rememberRaid(pack,s,spec.player,physical);
 }
 if(data.discard&&data.taken.length&&pl.hand.length)
  return offerDiscard(s,spec,1,false,data.after||'looked')? 'held':data.after;
 const left=data.uids.filter(uid=>!data.taken.includes(uid));
 if(data.split){
  if(offerOrder(s,spec,data.taken,'top','splitRest'))return 'held';
  if(offerOrder(s,spec,left,'bottom',data.after))return 'held';
  return data.after||null;
 }
 if(offerOrder(s,spec,left,data.where,data.after))return 'held';
 return data.after||null;
}
function offerDiscard(s,spec,count,optional,next){
 const hand=plOf(s,spec.player).hand;
 if(hand.length<count)return false;
 hold(s,{...spec,step:'discard',data:{need:count,got:[],optional,next:next||null}},[
  ...(optional?[{type:'kmr',mode:'skip'}]:[]),
  ...hand.map(c=>({type:'kmr',mode:'discard',uid:c.uid}))
 ]);
 return true;
}
function oppFront(s,owner,pred){
 return plOf(s,1-owner).front.filter(c=>c&&(!pred||pred(c)));
}
function offerRetire(pack,s,spec,limit,optional,next){
 const targets=oppFront(s,spec.player,c=>A.bp(pack,s,c)<=limit);
 if(!targets.length)return false;
 hold(s,{...spec,step:'retire',data:{next:next||null,optional}},[
  ...(optional?[{type:'kmr',mode:'skip'}]:[]),
  ...targets.map(c=>({type:'kmr',mode:'retire',uid:c.uid}))
 ]);
 return true;
}
// 必要エナジー is the printed cost, not current BP. UA29BT/KMR-1-075 retires
// one opponent front character whose printed energy is exactly 0.
function offerEnergyRetire(pack,s,spec,energy,optional,next){
 const targets=oppFront(s,spec.player,c=>def(pack,c).type==='character'&&def(pack,c).energy===energy);
 if(!targets.length)return false;
 hold(s,{...spec,step:'retire',data:{next:next||null,optional}},[
  ...(optional?[{type:'kmr',mode:'skip'}]:[]),
  ...targets.map(c=>({type:'kmr',mode:'retire',uid:c.uid}))
 ]);
 return true;
}
function offerOwn(s,spec,cards,optional,next,mode='own'){
 if(!cards.length)return false;
 hold(s,{...spec,step:mode,data:{next:next||null}},[
  ...(optional?[{type:'kmr',mode:'skip'}]:[]),
  ...cards.map(c=>({type:'kmr',mode,uid:c.uid}))
 ]);
 return true;
}
function handWhere(s,owner,pred){return plOf(s,owner).hand.filter(pred);}
function apReady(s,owner){return plOf(s,owner).apCards.filter(c=>c.ready).length;}
function pay(s,owner,n,sourceUid){
 if(apReady(s,owner)<n)return false;
 A.spend(plOf(s,owner),n);
 A.noteEffect(A.pack,s,owner,sourceUid);
 return true;
}
function scheduleDraw(s,owner,sourceUid,count){
 const cur=s.kmrMainEndDraw;
 const base=cur&&cur.owner===owner&&cur.turn===s.turn?cur.count:0;
 s.kmrMainEndDraw={owner,turn:s.turn,count:base+count,sourceUid};
}
function sameEnergy(pack,s,owner){
 const groups=new Map();
 for(const c of plOf(s,owner).hand){
  const energy=def(pack,c).energy;
  if(!groups.has(energy))groups.set(energy,[]);
  groups.get(energy).push(c);
 }
 return [...groups.values()].filter(list=>list.length>=3);
}
function offerSame(pack,s,spec,optional,next){
 const groups=sameEnergy(pack,s,spec.player);
 if(!groups.length)return false;
 const cards=groups.flat();
 hold(s,{...spec,step:'same',data:{got:[],energy:null,next:next||null,optional}},[
  ...(optional?[{type:'kmr',mode:'skip'}]:[]),
  ...cards.map(c=>({type:'kmr',mode:'same',uid:c.uid}))
 ]);
 return true;
}
function intelCount(pack,s,owner){
 return fieldCards(s,owner).filter(c=>trait(pack,c,INTEL)).length;
}
function imaginKinds(pack,s,owner){
 const names=new Set();
 const piles=[...fieldCards(s,owner),...plOf(s,owner).outside];
 for(const c of piles)for(const name of IMAGIN)if(exact(pack,c,name,s))names.add(name);
 return names.size;
}
function continueAfter(pack,s,spec,next){
 if(!next||next==='looked')return;
 if(next==='draw1'){A.draw(pack,s,spec.player,1,spec.sourceUid);return;}
 if(next==='draw2'){A.draw(pack,s,spec.player,2,spec.sourceUid);return;}
 if(next==='activeSelf'){
  const c=selfOf(s,spec.player,spec.sourceUid);
  if(c)A.active(s,spec.player,c);
  return;
 }
 if(next.startsWith('retire:')){
  const limit=Number(next.slice(7));
  offerRetire(pack,s,spec,limit,true,null);
  return;
 }
 if(next==='readyAp'){
  if(plOf(s,1-spec.player).life.length<5)return;
  if(!plOf(s,spec.player).apCards.some(c=>c.inPlay&&!c.ready))return;
  s.pending={kind:'effect-recover-ap',player:spec.player,sourceUid:spec.sourceUid,remaining:1};
  return;
 }
 if(next.startsWith('splitBottom:'))return;
}
function specOf(q){return {player:q.player,sourceUid:q.sourceUid,id:q.id};}

function on001(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const window=windowCards(s,job.owner,10);
 if(!window.length)return;
 hold(s,{...spec,step:'mill',data:{uids:window.map(c=>c.uid)}},[
  {type:'kmr',mode:'skip'},{type:'kmr',mode:'mill'}
 ]);
}
function on004(pack,s,job){
 const c=selfOf(s,job.owner,job.sourceUid);
 if(c)grantImpact(s,c);
}
function phase004(pack,s,job){
 const loc=A.location(s,job.owner,job.sourceUid);
 if(!loc||loc.line!=='front'||!live(s,loc.c))return;
 const names=new Set();
 for(const c of fieldCards(s,job.owner))
  if(token(pack,c,'ライダー',s))names.add(def(pack,c).name);
 if(names.size>=8)A.damage(pack,s,1-job.owner);
}
function reviveEnd(pack,s,job,name){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!plOf(s,job.owner).hand.length)return;
 const outs=plOf(s,job.owner).outside.filter(c=>exact(pack,c,name,null));
 if(!outs.length)return;
 hold(s,{...spec,step:'revive',data:{name}},[
  {type:'kmr',mode:'skip'},
  {type:'kmr',mode:'revive'}
 ]);
}
function onLookSimple(pack,s,job,count,pred,opts={}){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 // pred already closes over the pack and takes the physical card. Passing the
 // pack in as that card makes card() throw on the pack object.
 const held=beginLook(s,spec,count,c=>pred(c),{max:opts.max??1,min:0,discard:opts.discard!==false,
  where:'bottom',after:opts.after||null});
 if(!held)continueAfter(pack,s,spec,opts.after||null);
}
function nonYellowRaid(pack,c){const d=def(pack,c);return !!d.raidName&&d.color!=='yellow';}
function frontRaidPool(pack,s,owner,names,got){
 const used=new Set(names||[]),seen=new Set();
 return handWhere(s,owner,c=>{
  const d=def(pack,c);
  if(d.type!=='character'||d.bp>4000||d.raidOnlyEntry||!nonYellowRaid(pack,c))return false;
  if(used.has(d.name)||(got||[]).includes(c.uid)||seen.has(d.name))return false;
  seen.add(d.name);
  return true;
 });
}

const HANDLERS={
 'KMR-1-001|onPlay':on001,
 'KMR-1-003|main'(pack,s,job){
  if(s.kmrRaidToHand?.[job.owner]!==s.turn)return;
  const key=job.sourceUid+'|KMR-1-003';
  if(used(s,key))return;
  use(s,key);
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  hold(s,{...spec,step:'mode',data:{modes:['draw','buff']}},[
   {type:'kmr',mode:'mode',key:'draw'},{type:'kmr',mode:'mode',key:'buff'}
  ]);
 },
 'KMR-1-004|onPlay':on004,
 'KMR-1-004|phase':phase004,
 'KMR-1-005|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const pool=frontRaidPool(pack,s,job.owner,[],[]);
  if(!offerFieldEntry(s,spec,pool,{lines:['front'],from:'hand',optional:true,skipOnPlay:false,
   then:'more005',names:[],got:[],max:2}))
   offerOwn(s,spec,fieldCards(s,job.owner).filter(c=>!c.ready),true,null,'ready');
 },
 'KMR-1-005|main'(pack,s,job){
  const loc=A.location(s,job.owner,job.sourceUid);
  if(!loc||loc.line!=='front')return;
  const key=job.sourceUid+'|KMR-1-005';
  if(used(s,key)||apReady(s,job.owner)<1)return;
  if(!pay(s,job.owner,1,job.sourceUid))return;
  use(s,key);
  for(const c of fieldCards(s,job.owner))if(def(pack,c).type==='character')buff(s,c,1000);
 },
 'KMR-1-008|phase'(pack,s,job){reviveEnd(pack,s,job,'仮面ライダーゲイツリバイブ疾風');},
 'KMR-1-009|phase'(pack,s,job){reviveEnd(pack,s,job,'仮面ライダーゲイツリバイブ剛烈');},
 'KMR-1-011|onPlay'(pack,s,job){
  beginLook(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},2,()=>true,
   {max:2,min:0,split:true,discard:false});
 },
 'KMR-1-012|onPlay'(pack,s,job){onLookSimple(pack,s,job,7,c=>nonYellowRaid(pack,c),{discard:false});},
 'KMR-1-013|onPlay'(pack,s,job){
  const both=fieldCards(s,job.owner).some(c=>token(pack,c,'ゲイツ',s))&&
   fieldCards(s,job.owner).some(c=>token(pack,c,'ウォズ',s));
  onLookSimple(pack,s,job,5,c=>token(pack,c,'ライダー',s),{max:both?2:1,discard:false});
 },
 'KMR-1-014|onPlay'(pack,s,job){
  const top=plOf(s,job.owner).deck[0];
  if(!top)return;
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  hold(s,{...spec,step:'revealTop',data:{uid:top.uid}},[
   {type:'kmr',mode:'skip'},{type:'kmr',mode:'reveal'}
  ]);
 },
 'KMR-1-019|main'(pack,s,job){
  const key=job.sourceUid+'|KMR-1-019';
  if(used(s,key))return;
  const self=selfOf(s,job.owner,job.sourceUid);
  const fresh=self&&self.entryTurn!==s.turn;
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const modes=['impact','damage','bp'];
  hold(s,{...spec,step:'vulcan',data:{left:fresh?modes:[],paid:false,all:false,canPay:fresh&&apReady(s,job.owner)>=1}},[
   {type:'kmr',mode:'mode',key:'impact'},
   {type:'kmr',mode:'mode',key:'damage'},
   {type:'kmr',mode:'mode',key:'bp'},
   ...(fresh&&apReady(s,job.owner)>=1?[{type:'kmr',mode:'payAll'}]:[])
  ]);
 },
 'KMR-1-021|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const targets=fieldCards(s,job.owner).filter(c=>token(pack,c,'ゼロワン',s));
  offerOwn(s,spec,targets,true,'grant21','own');
 },
 'KMR-1-021|onRaidSeen'(pack,s,job){
  if(nameLocked(s,job.owner,'仮面ライダーゼロツー（イズ）|021'))return;
  if(intelCount(pack,s,job.owner)<3)return;
  const copies=handWhere(s,job.owner,c=>def(pack,c).id==='KMR-1-021');
  if(!copies.length)return;
  offerFieldEntry(s,{player:job.owner,sourceUid:copies[0].uid,id:'KMR-1-021'},copies,{
   from:'hand',optional:true,skipOnPlay:false,lock:'仮面ライダーゼロツー（イズ）|021'});
 },
 'KMR-1-022|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const pred=c=>def(pack,c).type==='character'&&def(pack,c).color==='yellow'&&
   def(pack,c).energy<=1&&def(pack,c).ap===1;
  const pool=[...handWhere(s,job.owner,pred),...plOf(s,job.owner).outside.filter(pred)];
  offerFieldEntry(s,spec,pool,{optional:true,skipOnPlay:false,drawIfHand:true,
   fromOf:c=>plOf(s,job.owner).hand.some(h=>h.uid===c.uid)?'hand':'outside'});
 },
 'KMR-1-024|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  if(plOf(s,job.owner).hand.length<2&&plOf(s,job.owner).deck.length<2)return;
  A.draw(pack,s,job.owner,2,job.sourceUid);
  if(offerDiscard(s,spec,2,false,'scaleRetire'))return;
 },
 'KMR-1-025|onRetire'(pack,s,job){
  A.draw(pack,s,job.owner,1,job.sourceUid);
  const hand=plOf(s,job.owner).hand;
  if(hand.length)discard(pack,s,job.owner,hand[0].uid,job.sourceUid);
 },
 'KMR-1-027|main'(pack,s,job){
  const mode=job.mode;
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self)return;
  if(mode==='a'){
   if(!self.ready||used(s,job.sourceUid+'|027a'))return;
   self.ready=false;A.noteRest(s,job.owner,self);
   use(s,job.sourceUid+'|027a');
   buff(s,self,1000);
  }else if(mode==='b'){
   const loc=A.location(s,job.owner,job.sourceUid);
   if(!loc||loc.line!=='front'||used(s,job.sourceUid+'|027b'))return;
   const top=plOf(s,job.owner).deck[0];
   if(!top)return;
   use(s,job.sourceUid+'|027b');
   hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'topPlace',data:{uid:top.uid}},[
    {type:'kmr',mode:'top'},{type:'kmr',mode:'outside'}
   ]);
  }
 },
 'KMR-1-028|onPlay'(pack,s,job){
  onLookSimple(pack,s,job,4,c=>def(pack,c).type==='character'&&
   ZIO_NAMES.some(n=>token(pack,c,n,null)),{discard:true});
 },
 'KMR-1-028|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  const loc=A.location(s,job.owner,job.sourceUid);
  if(loc)A.retire(pack,s,job.owner,loc.line,loc.slot,{skipReplacement:true});
  const card=plOf(s,job.owner).outside.find(c=>nonYellowRaid(pack,c));
  if(!card)return;
  moveUid(pack,s,job.owner,'outside',card.uid,'deck',job.sourceUid,'top');
 },
 'KMR-1-029|main'(pack,s,job){
  if(job.mode==='out'){
   const card=plOf(s,job.owner).outside.find(c=>c.uid===job.sourceUid);
   if(!card||A.energy(pack,s,job.owner)<3||apReady(s,job.owner)<1)return;
   if(!pay(s,job.owner,1,job.sourceUid))return;
   offerFieldEntry(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},[card],{
    lines:['energy'],from:'outside',optional:false,skipOnPlay:true});
   return;
  }
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  const loc=A.location(s,job.owner,job.sourceUid);
  if(loc)A.retire(pack,s,job.owner,loc.line,loc.slot,{skipReplacement:true});
  onLookSimple(pack,s,job,4,c=>trait(pack,c,'滅亡迅雷.net')||token(pack,c,'アサルト',null)||
   token(pack,c,'アーク',null),{discard:false});
 },
 'KMR-1-030|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  beginLook(s,spec,7,c=>token(pack,c,'ジオウ',null)&&def(pack,c).type==='character'||nonYellowRaid(pack,c),
   {max:2,min:0,discard:false});
 },
 'KMR-1-031|onPlay'(pack,s,job){special031(pack,s,job);},
 'KMR-1-031|trigger'(pack,s,job){special031(pack,s,job);},
 'KMR-1-033|onPlay'(pack,s,job){special033(pack,s,job);},
 'KMR-1-033|trigger'(pack,s,job){special033(pack,s,job);},
 'KMR-1-034|main'(pack,s,job){sameThen(pack,s,job,'ooo');},
 'KMR-1-035|main'(pack,s,job){sameThen(pack,s,job,'rest');},
 'KMR-1-036|main'(pack,s,job){sameThen(pack,s,job,'block');},
 'KMR-1-037|onPlay'(pack,s,job){
  onLookSimple(pack,s,job,3,c=>token(pack,c,'オーズ',null)&&def(pack,c).type==='character'||
   exact(pack,c,'コアメダル',null)||exact(pack,c,'セルメダル',null),{discard:true});
 },
 'KMR-1-039|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const ankh=[...fieldCards(s,job.owner),...plOf(s,job.owner).hand].filter(c=>exact(pack,c,'アンク',s));
  if(!ankh.length)return;
  hold(s,{...spec,step:'removeAnkh',data:{}},[
   {type:'kmr',mode:'skip'},
   ...ankh.map(c=>({type:'kmr',mode:'remove',uid:c.uid,from:plOf(s,job.owner).hand.some(h=>h.uid===c.uid)?'hand':'field'}))
  ]);
 },
 'KMR-1-039|main'(pack,s,job){sameThen(pack,s,job,'drawNow');},
 'KMR-1-040|onPlay'(pack,s,job){
  onLookSimple(pack,s,job,7,c=>exact(pack,c,'アンク',null),{discard:false,after:'ankhDiscard'});
 },
 'KMR-1-041|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const targets=oppFront(s,job.owner,c=>A.bp(pack,s,c)<=4000);
  if(targets.length){
   hold(s,{...spec,step:'deckBottom',data:{thenLife:plOf(s,job.owner).life.length>=2}},[
    {type:'kmr',mode:'skip'},
    ...targets.map(c=>({type:'kmr',mode:'bottom',uid:c.uid}))
   ]);
  }else if(plOf(s,job.owner).life.length>=2)lifeBottom(pack,s,spec);
 },
 'KMR-1-042|main'(pack,s,job){sameThen(pack,s,job,'active');},
 'KMR-1-044|onPlay'(pack,s,job){
  const hand=plOf(s,job.owner).hand;
  if(hand.length)discard(pack,s,job.owner,hand[0].uid,job.sourceUid);
 },
 'KMR-1-044|onRetire'(pack,s,job){
  const cards=fieldCards(s,job.owner);
  if(cards.length&&cards.every(c=>def(pack,c).color==='blue')){
   const self=plOf(s,job.owner).outside.find(c=>c.uid===job.sourceUid);
   if(self)moveUid(pack,s,job.owner,'outside',self.uid,'hand',job.sourceUid);
  }
 },
 'KMR-1-044|main'(pack,s,job){
  const loc=A.location(s,job.owner,job.sourceUid);
  if(!loc||loc.line!=='front'||used(s,job.sourceUid+'|KMR-1-044'))return;
  const zombie=plOf(s,job.owner).outside.find(c=>token(pack,c,'ゾンビゲーマー',null));
  if(!zombie)return;
  use(s,job.sourceUid+'|KMR-1-044');
  moveUid(pack,s,job.owner,'outside',zombie.uid,'removed',job.sourceUid);
  offerRetire(pack,s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},3000,true,null);
 },
 'KMR-1-045|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready||used(s,job.sourceUid+'|KMR-1-045'))return;
  const others=fieldCards(s,job.owner).filter(c=>c.uid!==self.uid&&def(pack,c).type==='character');
  if(!others.length)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  use(s,job.sourceUid+'|KMR-1-045');
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},others,false,'returnSelf','own');
 },
 'KMR-1-047|main'(pack,s,job){
  const key=job.sourceUid+'|KMR-1-047';
  if(used(s,key))return;
  use(s,key);
  s.kmrMedalAp??={};
  s.kmrMedalAp[job.owner]=s.turn;
 },
 'KMR-1-048|onPlay'(pack,s,job){tuckOffer(pack,s,job,c=>token(pack,c,'エグゼイド',s)&&def(pack,c).energy<=1,'draw');},
 'KMR-1-050|onPlay'(pack,s,job){tuckOffer(pack,s,job,c=>token(pack,c,'エグゼイド',s)&&def(pack,c).energy<=3,'deployEx');},
 'KMR-1-051|onPlay'(pack,s,job){tuckOffer(pack,s,job,c=>token(pack,c,'エグゼイド',s)&&def(pack,c).energy<=5,'silence');},
 'KMR-1-052|onPlay'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  const base=self?.stack?.[0];
  if(!self||!base||def(pack,base).energy<5||!plOf(s,job.owner).deck.length)return;
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  hold(s,{...spec,step:'tuckTop',data:{}},[{type:'kmr',mode:'skip'},{type:'kmr',mode:'tuckTop'}]);
 },
 'KMR-1-053|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  beginLook(s,spec,3,()=>true,{max:1,min:1,discard:false,where:'bottom',after:'doctorUnder'});
 },
 'KMR-1-053|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  const under=(self?.under||[]).filter(c=>c.faceDown);
  if(!self||used(s,job.sourceUid+'|KMR-1-053')||!under.length)return;
  use(s,job.sourceUid+'|KMR-1-053');
  const layer=under[0];
  self.under=self.under.filter(c=>c!==layer);
  layer.faceDown=false;layer.ready=false;layer.fieldEntryStamp=null;
  plOf(s,job.owner).outside.push(layer);
  A.record(pack,s,{physical:layer,owner:job.owner,from:'raid-under',to:'outside',reason:'own-effect',sourceUid:job.sourceUid});
  offerRetire(pack,s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},3000,true,'bounceInstead');
 },
 'KMR-1-058|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  hold(s,{...spec,step:'mode',data:{modes:['under','deploy']}},[
   {type:'kmr',mode:'mode',key:'under'},{type:'kmr',mode:'mode',key:'deploy'}
  ]);
 },
 'KMR-1-059|onPlay'(pack,s,job){
  onLookSimple(pack,s,job,5,c=>token(pack,c,'エグゼイド',null)&&def(pack,c).type==='character',{discard:true});
 },
 'KMR-1-060|onPlay'(pack,s,job){
  const others=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&def(pack,c).type==='character');
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},others,true,null,'own');
 },
 'KMR-1-060|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready)return;
  const hosts=fieldCards(s,job.owner).filter(c=>token(pack,c,'エグゼイド',s));
  if(!hosts.length)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},hosts,false,'tuckSelf','own');
 },
 'KMR-1-062|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready||nameLocked(s,job.owner,'アンク|062'))return;
  const n=(s.zoneMoveEvents||[]).filter(e=>e.turn===s.turn&&e.owner===job.owner&&e.controller===job.owner&&
   e.from==='hand'&&e.to==='outside'&&e.reason==='own-effect'&&
   String(e.sourceName||'').includes('オーズ')).length;
  if(n<3)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  nameLock(s,job.owner,'アンク|062');
  A.draw(pack,s,job.owner,1,job.sourceUid);
 },
 'KMR-1-063|onPlay'(pack,s,job){A.draw(pack,s,job.owner,2,job.sourceUid);},
 'KMR-1-063|attackEnd'(pack,s,job){medalReturn(pack,s,job,'コアメダル');},
 'KMR-1-064|onPlay'(pack,s,job){special064(pack,s,job);},
 'KMR-1-064|trigger'(pack,s,job){special064(pack,s,job);},
 'KMR-1-065|onPlay'(pack,s,job){
  A.draw(pack,s,job.owner,1,job.sourceUid);
  const targets=fieldCards(s,job.owner).filter(c=>def(pack,c).type==='character');
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},targets,true,'buff500','own');
 },
 'KMR-1-065|attackEnd'(pack,s,job){medalReturn(pack,s,job,'セルメダル');},
 'KMR-1-067|onPlay'(pack,s,job){special067(pack,s,job);},
 'KMR-1-067|trigger'(pack,s,job){special067(pack,s,job);},
 'KMR-1-068|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready)return;
  const card=plOf(s,job.owner).outside.find(c=>exact(pack,c,'スパークルカット',null));
  if(!card)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  const loc=A.location(s,job.owner,job.sourceUid);
  if(loc)A.retire(pack,s,job.owner,loc.line,loc.slot,{skipReplacement:true});
  const found=plOf(s,job.owner).outside.find(c=>exact(pack,c,'スパークルカット',null));
  if(found)moveUid(pack,s,job.owner,'outside',found.uid,'hand',job.sourceUid);
 },
 'KMR-1-070|onAttack'(pack,s,job){
  const others=fieldCards(s,job.owner).filter(c=>def(pack,c).type==='character');
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},others,true,null,'retireOwn');
 },
 'KMR-1-071|onPlay'(pack,s,job){
  const hand=plOf(s,job.owner).hand;
  if(hand.length)discard(pack,s,job.owner,hand[0].uid,job.sourceUid);
 },
 'KMR-1-071|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  const loc=A.location(s,job.owner,job.sourceUid);
  if(!self||self.entryTurn!==s.turn||!loc||loc.line!=='front'||used(s,job.sourceUid+'|KMR-1-071'))return;
  const deneb=handWhere(s,job.owner,c=>exact(pack,c,'デネブイマジン',null));
  if(!deneb.length)return;
  use(s,job.sourceUid+'|KMR-1-071');
  offerFieldEntry(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},deneb,{
   from:'hand',optional:false,skipOnPlay:false});
 },
 'KMR-1-074|onPlay'(pack,s,job){const c=selfOf(s,job.owner,job.sourceUid);if(c)grantImmune(s,c);},
 'KMR-1-074|onRetire'(pack,s,job){baseRest(pack,s,job);},
 'KMR-1-075|onPlay'(pack,s,job){
  offerEnergyRetire(pack,s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},0,true,null);
 },
 'KMR-1-075|onRetire'(pack,s,job){baseRest(pack,s,job);},
 'KMR-1-076|onPlay'(pack,s,job){
  if(imaginKinds(pack,s,job.owner)<2)return;
  const c=selfOf(s,job.owner,job.sourceUid);
  if(c)A.active(s,job.owner,c);
  A.draw(pack,s,job.owner,1,job.sourceUid);
 },
 'KMR-1-076|onAttack'(pack,s,job){
  if(imaginKinds(pack,s,job.owner)<4)return;
  const hand=handWhere(s,job.owner,c=>def(pack,c).type==='character'&&def(pack,c).energy<=3&&
   def(pack,c).ap===1&&token(pack,c,'電王',null)&&def(pack,c).raidName);
  if(!hand.length)return;
  offerFieldEntry(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},hand,{
   lines:[],raid:true,from:'hand',bp:1000,optional:true,skipOnPlay:false});
 },
 'KMR-1-077|onPlay'(pack,s,job){const c=selfOf(s,job.owner,job.sourceUid);if(c)grantImpact(s,c);},
 'KMR-1-077|onRetire'(pack,s,job){baseRest(pack,s,job);},
 'KMR-1-079|onPlay'(pack,s,job){
  if(IMAGIN.every(name=>fieldCards(s,job.owner).some(c=>exact(pack,c,name,s))||
   plOf(s,job.owner).outside.some(c=>exact(pack,c,name,null)))){
   const c=selfOf(s,job.owner,job.sourceUid);
   if(c)grantSniper(s,c);
  }
 },
 'KMR-1-079|onAttack'(pack,s,job){
  const raided=fieldCards(s,job.owner).filter(c=>token(pack,c,'タロス',s)&&A.raided(pack,c)&&c.uid!==job.sourceUid);
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},raided,true,'replay','own');
 },
 'KMR-1-079|onRetire'(pack,s,job){baseRest(pack,s,job);},
 'KMR-1-080|onPlay'(pack,s,job){const c=selfOf(s,job.owner,job.sourceUid);if(c)grantUnblockedDraw(s,c);},
 'KMR-1-080|onRetire'(pack,s,job){baseRest(pack,s,job);},
 'KMR-1-081|main'(pack,s,job){
  const key=job.sourceUid+'|KMR-1-081';
  if(used(s,key)||!plOf(s,job.owner).hand.length)return;
  use(s,key);
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  if(!offerDiscard(s,spec,1,false,'range'))return;
 },
 'KMR-1-081|onAttack'(pack,s,job){
  const moved=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===job.owner&&e.from==='hand'&&
   e.to==='outside'&&e.reason==='own-effect');
  if(moved)A.draw(pack,s,job.owner,1,job.sourceUid);
 },
 'KMR-1-081|moved'(pack,s,job){
  const gear=plOf(s,job.owner).outside.find(c=>c.uid===job.gearUid);
  const host=selfOf(s,job.owner,job.sourceUid);
  const loc=host&&A.location(s,job.owner,host.uid);
  if(!gear||!host||!loc||loc.line!=='front'||!live(s,host))return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'gearTop',data:{uid:gear.uid}},[
   {type:'kmr',mode:'skip'},{type:'kmr',mode:'top'}
  ]);
 },
 'KMR-1-084|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  if(!plOf(s,job.owner).hand.length)return;
  hold(s,{...spec,step:'optionalDiscardDraw',data:{draw:2}},[
   {type:'kmr',mode:'skip'},
   ...plOf(s,job.owner).hand.map(c=>({type:'kmr',mode:'discard',uid:c.uid}))
  ]);
 },
 'KMR-1-085|phase'(pack,s,job){
  const loc=A.location(s,job.owner,job.sourceUid);
  if(!loc||!A.raided(pack,loc.c))return;
  A.strip(pack,s,job.owner,job.sourceUid);
 },
 'KMR-1-085|onAttack'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self||used(s,job.sourceUid+'|KMR-1-085'))return;
  use(s,job.sourceUid+'|KMR-1-085');
  A.active(s,job.owner,self);
  A.draw(pack,s,job.owner,2,job.sourceUid);
  const gear=handWhere(s,job.owner,c=>trait(pack,c,GEAR));
  if(!gear.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'gearRetire',data:{}},[
   {type:'kmr',mode:'skip'},
   ...gear.map(c=>({type:'kmr',mode:'discard',uid:c.uid}))
  ]);
 },
 'KMR-1-086|win'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self||!A.raided(pack,self)||!live(s,self))return;
  const gear=handWhere(s,job.owner,c=>trait(pack,c,GEAR));
  if(!gear.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'gearRetire3',data:{}},[
   {type:'kmr',mode:'skip'},
   ...gear.map(c=>({type:'kmr',mode:'discard',uid:c.uid}))
  ]);
 },
 'KMR-1-088|onPlay'(pack,s,job){
  const targets=oppFront(s,job.owner,c=>A.bp(pack,s,c)<=4000);
  if(!targets.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'punish',data:{}},[
   {type:'kmr',mode:'skip'},
   ...targets.map(c=>({type:'kmr',mode:'retire',uid:c.uid}))
  ]);
 },
 'KMR-1-092|onPlay'(pack,s,job){
  onLookSimple(pack,s,job,5,c=>exact(pack,c,'仮面ライダー電王 プラットフォーム',null),{discard:false,after:'platformDiscard'});
 },
 'KMR-1-094|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self)return;
  if(job.mode==='a'){
   if(!self.ready)return;
   const targets=fieldCards(s,job.owner).filter(c=>A.raided(pack,c)&&token(pack,c,'電王',s));
   if(!targets.length)return;
   self.ready=false;A.noteRest(s,job.owner,self);
   offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},targets,false,null,'own');
  }else if(job.mode==='b'){
   if(used(s,job.sourceUid+'|094b')||!s.raidedThisTurn?.[job.owner]||!plOf(s,job.owner).hand.length)return;
   use(s,job.sourceUid+'|094b');
   offerDiscard(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},1,false,'activeSelf');
  }
 },
 'KMR-1-095|onPlay'(pack,s,job){
  onLookSimple(pack,s,job,5,c=>(token(pack,c,'電王',null)&&def(pack,c).type==='character')||
   exact(pack,c,'デンライナー',null),{discard:false,after:'readyAp'});
 },
 'KMR-1-096|onPlay'(pack,s,job){special096(pack,s,job);},
 'KMR-1-096|trigger'(pack,s,job){special096(pack,s,job);},
 'KMR-1-099|onPlay'(pack,s,job){special099(pack,s,job);},
 'KMR-1-099|trigger'(pack,s,job){special099(pack,s,job);},
 'KMR-1-100|onPlay'(pack,s,job){
  const own=fieldCards(s,job.owner).filter(c=>def(pack,c).type==='character');
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},own,true,'retire2k','own');
 },
 'KMR-1-104|onAttack'(pack,s,job){
  A.draw(pack,s,job.owner,1,job.sourceUid);
  const hand=plOf(s,job.owner).hand;
  if(!hand.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'placeHand',data:{}},[
   ...hand.map(c=>({type:'kmr',mode:'top',uid:c.uid})),
   ...hand.map(c=>({type:'kmr',mode:'bottom',uid:c.uid}))
  ]);
 },
 'KMR-1-104|onRetire'(pack,s,job){
  const n=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&trait(pack,c,INTEL)).length;
  if(n<3)return;
  const hand=handWhere(s,job.owner,c=>token(pack,c,'ゼロツー',null)&&def(pack,c).type==='character');
  offerFieldEntry(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},hand,{
   from:'hand',optional:true,skipOnPlay:false});
 },
 'KMR-1-107|onPlay'(pack,s,job){
  const c=selfOf(s,job.owner,job.sourceUid);
  if(!c)return;
  buff(s,c,1000);
  grantImmune(s,c);
 },
 'KMR-1-107|attackEnd'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self||!A.raided(pack,self)||!live(s,self))return;
  const hosts=plOf(s,job.owner).front.filter(c=>c&&c.ready&&c.uid!==self.uid&&token(pack,c,'ゼロワン',s));
  if(!hosts.length)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'shiftRaid',data:{}},[
   {type:'kmr',mode:'skip'},
   ...hosts.map(c=>({type:'kmr',mode:'host',uid:c.uid}))
  ]);
 },
 'KMR-1-108|onPlay'(pack,s,job){
  const top=plOf(s,job.owner).deck[0];
  if(!top)return;
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'topPlace',data:{uid:top.uid}},[
   {type:'kmr',mode:'top'},{type:'kmr',mode:'bottom'}
  ]);
 },
 'KMR-1-108|main'(pack,s,job){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(!self?.ready||!plOf(s,job.owner).hand.length||apReady(s,job.owner)<1)return;
  const pool=plOf(s,job.owner).outside.filter(c=>def(pack,c).color==='yellow'&&def(pack,c).energy<=1&&
   def(pack,c).ap===1&&trait(pack,c,INTEL));
  if(!pool.length)return;
  self.ready=false;A.noteRest(s,job.owner,self);
  if(!pay(s,job.owner,1,job.sourceUid))return;
  offerDiscard(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},1,false,'deployIntel');
 },
 'KMR-1-109|onPlay'(pack,s,job){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const window=windowCards(s,job.owner,4);
  if(!window.length)return;
  const eligible=window.filter(c=>def(pack,c).type==='character'&&def(pack,c).color==='yellow'&&
   def(pack,c).energy<=4&&def(pack,c).ap===1&&trait(pack,c,INTEL));
  const uids=window.map(c=>c.uid);
  if(!offerFieldEntry(s,spec,eligible,{raid:true,from:'deck',optional:true,skipOnPlay:false,
   windowUids:uids}))
   offerOrder(s,spec,uids,'bottom',null);
 },
 'KMR-1-110|onPlay'(pack,s,job){
  if(s.phase!=='main'||s.active!==job.owner)return;
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  if(!offerSame(pack,s,spec,true,'retire4'))return;
 },
 'KMR-1-111|main'(pack,s,job){
  const card=plOf(s,job.owner).outside.find(c=>c.uid===job.sourceUid);
  if(!card||A.energy(pack,s,job.owner)<4||apReady(s,job.owner)<1||plOf(s,job.owner).hand.length<2)return;
  if(!pay(s,job.owner,1,job.sourceUid))return;
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  if(!offerDiscard(s,spec,2,false,'enter111'))return;
 },
 'KMR-1-111|onRetire'(pack,s,job){
  if(job.by!=='battle')return;
  const targets=oppFront(s,job.owner,c=>A.bp(pack,s,c)>=1500);
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},targets,true,'debuff','own');
 },
 'KMR-1-112|onPlay'(pack,s,job){
  const hand=plOf(s,job.owner).hand;
  if(hand.length)discard(pack,s,job.owner,hand[0].uid,job.sourceUid);
 },
 'KMR-1-112|onAttack'(pack,s,job){
  const own=fieldCards(s,job.owner).filter(c=>def(pack,c).type==='character');
  offerOwn(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},own,true,null,'own');
 },
 'KMR-1-113|onPlay'(pack,s,job){
  const foe=1-job.owner;
  const top=plOf(s,foe).deck[0];
  if(!top)return;
  A.reveal(pack,s,foe,top);
  hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'oppTop',data:{uid:top.uid,owner:foe}},[
   {type:'kmr',mode:'top'},{type:'kmr',mode:'outside'}
  ]);
 },
 'KMR-1-113|onRetire'(pack,s,job){
  onLookSimple(pack,s,job,4,c=>token(pack,c,'ファイズ',null),{discard:true});
 }
};

function special031(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const wider=fieldCards(s,job.owner).some(c=>token(pack,c,'ジオウ',s));
 const limit=wider?5000:2000;
 const next=s.kmrRaidToHand?.[job.owner]===s.turn?'buffAny':null;
 if(!offerRetire(pack,s,spec,limit,false,next)&&next)
  offerOwn(s,spec,fieldCards(s,job.owner).filter(c=>def(pack,c).type==='character'),true,null,'own');
}
function special033(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const retire=fieldCards(s,job.owner).some(c=>token(pack,c,'ゼロワン',s));
 const targets=plOf(s,1-job.owner).front.filter(Boolean);
 if(!targets.length)return;
 if(retire)offerRetire(pack,s,spec,99999,false,null);
 else hold(s,{...spec,step:'restSkip',data:{}},targets.map(c=>({type:'kmr',mode:'rest',uid:c.uid})));
}
function special064(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 let limit=2000;
 if(fieldCards(s,job.owner).some(c=>token(pack,c,'オーズ',s))){
  limit=plOf(s,job.owner).hand.length>=4?5000:4000;
 }
 offerRetire(pack,s,spec,limit,false,null);
}
function special067(pack,s,job){
 const wider=fieldCards(s,job.owner).some(c=>token(pack,c,'エグゼイド',s)||token(pack,c,'ゲンム',s));
 offerRetire(pack,s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},wider?5000:3000,false,null);
}
function special096(pack,s,job){
 const wider=fieldCards(s,job.owner).some(c=>A.raided(pack,c)&&token(pack,c,'電王',s));
 offerRetire(pack,s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},wider?5000:3000,false,null);
}
function special099(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const wider=fieldCards(s,job.owner).some(c=>token(pack,c,'ファイズ',s));
 if(wider){s.aotBpRange[job.owner]=(s.aotBpRange[job.owner]||0)+1000;}
 offerRetire(pack,s,spec,wider?4000:3000,true,null);
}
function sameThen(pack,s,job,next){
 const loc=A.location(s,job.owner,job.sourceUid);
 if(!loc||loc.line!=='front'||used(s,job.sourceUid+'|'+job.id))return;
 if(!sameEnergy(pack,s,job.owner).length)return;
 use(s,job.sourceUid+'|'+job.id);
 offerSame(pack,s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},false,next);
}
function medalReturn(pack,s,job,name){
 if(nameLocked(s,job.owner,name+'|return'))return;
 const attacked=(s.attackedNames||[]).some(n=>n.owner===job.owner&&
  (String(n.name).includes('オーズ')||String(n.name).includes('バース')||
   (n.aliases||[]).some(a=>String(a).includes('オーズ')||String(a).includes('バース'))));
 if(!attacked)return;
 const card=plOf(s,job.owner).outside.find(c=>c.uid===job.sourceUid);
 if(!card||!plOf(s,job.owner).hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'medalBack',data:{lock:name+'|return'}},[
  {type:'kmr',mode:'skip'},{type:'kmr',mode:'back'}
 ]);
}
function baseRest(pack,s,job){
 const base=job.baseUid&&plOf(s,job.owner).outside.find(c=>c.uid===job.baseUid);
 if(!base)return;
 // FAQ Q1168 / Q1169: the raid base played by this leave effect does trigger 登場時.
 offerFieldEntry(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},[base],{
  from:'outside',optional:true,skipOnPlay:false});
}
function tuckOffer(pack,s,job,pred,next){
 const others=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&pred(c));
 if(!others.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'tuck',data:{next}},[
  {type:'kmr',mode:'skip'},
  ...others.map(c=>({type:'kmr',mode:'tuck',uid:c.uid}))
 ]);
}
function zoneFrom(s,owner,card,fromOf){
 if(typeof fromOf==='function')return fromOf(card);
 if(typeof fromOf==='string')return fromOf;
 const pl=plOf(s,owner);
 if(pl.hand.some(c=>c.uid===card.uid))return 'hand';
 if(pl.outside.some(c=>c.uid===card.uid))return 'outside';
 if(pl.deck.some(c=>c.uid===card.uid))return 'deck';
 if((pl.removed||[]).some(c=>c.uid===card.uid))return 'removed';
 return null;
}
function raidDestinations(pack,s,owner,card){
 const d=def(pack,card);
 if(!d.raidName||d.type!=='character'||d.frontForbidden)return [];
 const pl=plOf(s,owner),out=[];
 for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  const base=pl[line][slot];
  if(!base||!A.raidBase(pack,s,owner,base,d)||def(pack,base).frontForbidden)continue;
  const b=def(pack,base);
  if(line==='front'){out.push({baseUid:base.uid,line:'front',slot,replaceUid:null});continue;}
  if(!d.energyLineForbidden&&!b.energyLineForbidden)
   out.push({baseUid:base.uid,line:'energy',slot,replaceUid:null});
  for(const dest of A.destinations(pl,'front'))
   out.push({baseUid:base.uid,line:'front',slot:dest.slot,replaceUid:dest.replaceUid??null});
 }
 return out;
}
// Character entry from an effect. Emit one legal action per destination.
// UI: select this physical card, then 突襲進場 or 普通進場 only when the
// print allows both, then tap the cell. Do not emit a slot-less deploy
// button, and do not invent a mode the print does not allow.
// Future effects that put a character on the field must go through here.
function fieldEntryActions(pack,s,owner,cards,opts={}){
 const lines=opts.lines??['front','energy'];
 const raid=opts.raid===true;
 const ready=opts.ready===true;
 const skipOnPlay=opts.skipOnPlay===true;
 const actions=[];
 for(const card of cards){
  const from=zoneFrom(s,owner,card,opts.fromOf??opts.from);
  if(!from)continue;
  const d=def(pack,card);
  if(lines.length&&!d.raidOnlyEntry){
   for(const line of lines){
    if(line==='front'&&(d.type!=='character'||d.frontForbidden))continue;
    if(line==='energy'&&(d.energyForbidden||d.energyLineForbidden))continue;
    for(const dest of A.destinations(plOf(s,owner),line))
     actions.push({type:'kmr',mode:'enter',uid:card.uid,line,slot:dest.slot,
      replaceUid:dest.replaceUid??null,ready,from,skip:skipOnPlay});
   }
  }
  if(!raid)continue;
  for(const dest of raidDestinations(pack,s,owner,card))
   actions.push({type:'kmr',mode:'raid',uid:card.uid,baseUid:dest.baseUid,line:dest.line,
    slot:dest.slot,replaceUid:dest.replaceUid??null,from,ready:true,skip:skipOnPlay,
    ...(opts.bp?{bp:opts.bp}:{})});
 }
 return actions;
}
function offerFieldEntry(s,spec,cards,opts={}){
 const actions=fieldEntryActions(A.pack,s,spec.player,cards,opts);
 if(!actions.length)return false;
 if(opts.optional!==false)actions.unshift({type:'kmr',mode:'skip'});
 hold(s,{...spec,step:'enter',
  ...(Array.isArray(opts.windowUids)?{uids:opts.windowUids}:{}),
  data:{then:opts.then||null,names:opts.names||null,got:opts.got||null,max:opts.max??null,
   lock:opts.lock||null,drawIfHand:opts.drawIfHand===true,windowUids:opts.windowUids||null,
   bp:opts.bp||0}},actions);
 return true;
}
function queueEntryFollow(s,q,hit,playedName){
 const data=q.data||{};
 if(Array.isArray(data.windowUids)){
  const rest=data.windowUids.filter(uid=>uid!==hit.uid);
  if(rest.length)s.effectQueue.unshift({op:'kmr',id:q.id,slot:'orderWindow',owner:q.player,
   sourceUid:q.sourceUid,uids:rest,where:'bottom'});
 }
 if(data.then==='more005')s.effectQueue.unshift({op:'kmr',id:q.id,slot:'entryFollow',owner:q.player,
  sourceUid:q.sourceUid,then:'more005',names:[...(data.names||[]),playedName],
  got:[...(data.got||[]),hit.uid],max:data.max??2});
 if(data.drawIfHand&&hit.from==='hand')
  s.effectQueue.unshift({op:'draw',owner:q.player,sourceUid:q.sourceUid,count:1});
}
function finishBoardEntry(pack,s,q,hit){
 const data=q.data||{};
 if(hit.mode==='skip'){
  s.pending=null;
  if(data.then==='more005')
   offerOwn(s,specOf(q),fieldCards(s,q.player).filter(c=>!c.ready),true,null,'ready');
  else if(Array.isArray(data.windowUids)&&data.windowUids.length)
   offerOrder(s,specOf(q),data.windowUids,'bottom',null);
  return;
 }
 const zone=plOf(s,q.player)[hit.from];
 const physical=zone?.find(c=>c.uid===hit.uid);
 if(!physical)throw Error('Kamen Rider entry card left');
 const playedName=def(pack,physical).name;
 queueEntryFollow(s,q,hit,playedName);
 if(data.lock)nameLock(s,q.player,data.lock);
 s.pending=null;
 if(hit.mode==='raid'){
  const index=zone.findIndex(c=>c.uid===hit.uid);
  const card=zone.splice(index,1)[0];
  if(hit.bp||data.bp)buff(s,card,hit.bp||data.bp);
  A.raid(pack,s,q.player,card,hit.baseUid,hit.line,hit.slot,hit.replaceUid||undefined,{
   entryReady:true,entryCause:hit.from+'EffectRaid',entryFrom:hit.from,effectSourceUid:q.sourceUid});
  return;
 }
 doEnter(pack,s,q.player,hit,q.sourceUid);
}
function lifeBottom(pack,s,spec){
 const life=plOf(s,spec.player).life;
 if(!life.length)return;
 hold(s,{...spec,step:'lifeBottom',data:{}},life.map(c=>({type:'kmr',mode:'life',uid:c.uid})));
}
function doEnter(pack,s,owner,a,sourceUid){
 A.enter(pack,s,{owner,from:a.from,uid:a.uid,line:a.line,slot:a.slot,replaceUid:a.replaceUid||undefined,
  ready:a.ready===true,sourceUid,skipOnPlay:a.skip===true});
}

function resolveStep(pack,s,q,a){
 const spec=specOf(q);
 const hit=takeAction(q,a);
 if(q.step==='mill'){
  s.pending=null;
  if(hit.mode==='mill'){
   const n=Math.min(10,plOf(s,q.player).deck.length);
   for(let i=0;i<n;i++)A.move(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,
    reason:'own-effect',sourceUid:q.sourceUid});
   offerRetire(pack,s,spec,4000,true,null);
  }
  return;
 }
 if(q.step==='lookPick'){
  const data=q.data;
  if(hit.mode==='take'){
   if(data.taken.includes(hit.uid)||data.taken.length>=data.max)throw Error('Illegal look take');
   data.taken.push(hit.uid);
   if(data.taken.length>=data.max){
    s.pending=null;
    const next=finishLook(pack,s,spec,data);
    if(next==='held')return;
    continueAfter(pack,s,spec,next);
    return;
   }
   const window=data.uids.map(uid=>plOf(s,q.player).deck.find(c=>c.uid===uid)).filter(Boolean);
   const hits=new Set(Array.isArray(data.hits)?data.hits:data.uids);
   const selectable=window.filter(c=>!data.taken.includes(c.uid)&&hits.has(c.uid));
   if(!selectable.length){
    s.pending=null;
    const next=finishLook(pack,s,spec,data);
    if(next==='held')return;
    continueAfter(pack,s,spec,next);
    return;
   }
   const actions=[
    {type:'kmr',mode:'done'},
    ...selectable.map(c=>({type:'kmr',mode:'take',uid:c.uid}))
   ];
   hold(s,{...spec,step:'lookPick',data},actions);
   return;
  }
  s.pending=null;
  const next=finishLook(pack,s,spec,data);
  if(next!=='held')continueAfter(pack,s,spec,next);
  return;
 }
 if(q.step==='lookOrder'){
  const data=q.data;
  data.built.push(hit.uid);
  data.left=data.left.filter(uid=>uid!==hit.uid);
  if(data.left.length){
   hold(s,{...spec,step:'lookOrder',data},data.left.map(uid=>({type:'kmr',mode:'next',uid})));
   return;
  }
  lay(plOf(s,q.player),data.built,data.where);
  s.pending=null;
  if(data.after&&data.after.startsWith('splitBottom:')){
   const ids=data.after.slice('splitBottom:'.length).split(',').filter(Boolean);
   if(offerOrder(s,spec,ids,'bottom',null))return;
  }
  if(data.after==='splitRest')return;
  continueAfter(pack,s,spec,data.after);
  return;
 }
 if(q.step==='discard'||q.step==='optionalDiscardDraw'){
  if(hit.mode==='skip'){s.pending=null;return;}
  discard(pack,s,q.player,hit.uid,q.sourceUid);
  if(q.step==='optionalDiscardDraw'){
   s.pending=null;
   A.draw(pack,s,q.player,q.data.draw,q.sourceUid);
   return;
  }
  q.data.got.push(hit.uid);
  if(q.data.got.length<q.data.need){
   const hand=plOf(s,q.player).hand;
   hold(s,{...spec,step:'discard',data:q.data},hand.map(c=>({type:'kmr',mode:'discard',uid:c.uid})));
   return;
  }
  s.pending=null;
  const next=q.data.next;
  if(next==='scaleRetire'){
   const dumped=(s.zoneMoveEvents||[]).filter(e=>e.turn===s.turn&&e.sourceUid===q.sourceUid&&
    e.to==='outside'&&e.from==='hand'&&trait(pack,{uid:e.uid,cardId:e.cardId},'滅亡迅雷.net')).length;
   offerRetire(pack,s,spec,2000+dumped*1000,true,null);
  }else if(next==='range'){
   s.aotBpRange[q.player]=(s.aotBpRange[q.player]||0)+1000;
  }else if(next==='activeSelf'){
   const c=selfOf(s,q.player,q.sourceUid);if(c)A.active(s,q.player,c);
  }else if(next==='deployIntel'){
   const pool=plOf(s,q.player).outside.filter(c=>def(pack,c).color==='yellow'&&def(pack,c).energy<=1&&
    def(pack,c).ap===1&&trait(pack,c,INTEL));
   offerFieldEntry(s,spec,pool,{from:'outside',optional:true,skipOnPlay:false});
  }else if(next==='enter111'){
   const card=plOf(s,q.player).outside.find(c=>c.uid===q.sourceUid);
   if(card)offerFieldEntry(s,spec,[card],{from:'outside',optional:false,skipOnPlay:false});
  }else continueAfter(pack,s,spec,next);
  return;
 }
 if(q.step==='same'){
  if(hit.mode==='skip'){s.pending=null;return;}
  const card=plOf(s,q.player).hand.find(c=>c.uid===hit.uid);
  if(!card)throw Error('Same-energy card left the hand');
  const energy=def(pack,card).energy;
  if(q.data.energy==null)q.data.energy=energy;
  if(energy!==q.data.energy)throw Error('Same-energy cards must match');
  discard(pack,s,q.player,hit.uid,q.sourceUid);
  q.data.got.push(hit.uid);
  if(q.data.got.length<3){
   const rest=plOf(s,q.player).hand.filter(c=>def(pack,c).energy===q.data.energy);
   if(rest.length+q.data.got.length<3){s.pending=null;return;}
   hold(s,{...spec,step:'same',data:q.data},rest.map(c=>({type:'kmr',mode:'same',uid:c.uid})));
   return;
  }
  s.pending=null;
  const next=q.data.next;
  if(next==='ooo'){
   const pool=handWhere(s,q.player,c=>token(pack,c,'オーズ',null)&&def(pack,c).type==='character'&&
    def(pack,c).energy<=3&&def(pack,c).ap===1);
   scheduleDraw(s,q.player,q.sourceUid,3);
   offerFieldEntry(s,spec,pool,{from:'hand',optional:true,skipOnPlay:false});
  }else if(next==='rest'){
   scheduleDraw(s,q.player,q.sourceUid,3);
   const targets=plOf(s,1-q.player).front.filter(Boolean);
   if(targets.length)hold(s,{...spec,step:'restSkip',data:{noSkip:true}},
    targets.map(c=>({type:'kmr',mode:'rest',uid:c.uid})));
  }else if(next==='block'){
   const self=selfOf(s,q.player,q.sourceUid);
   if(self)self.blockAtLeastGranted={turn:s.turn,stamp:self.fieldEntryStamp,bp:4000};
   scheduleDraw(s,q.player,q.sourceUid,3);
  }else if(next==='drawNow'){
   A.draw(pack,s,q.player,1,q.sourceUid);
   scheduleDraw(s,q.player,q.sourceUid,3);
  }else if(next==='active'){
   const self=selfOf(s,q.player,q.sourceUid);
   if(self)A.active(s,q.player,self);
   scheduleDraw(s,q.player,q.sourceUid,3);
  }else if(next==='retire4'){
   scheduleDraw(s,q.player,q.sourceUid,3);
   offerRetire(pack,s,spec,4000,true,null);
  }
  return;
 }
 if(q.step==='retire'){
  s.pending=null;
  if(hit.mode!=='skip'){
   const foe=1-q.player;
   const slot=plOf(s,foe).front.findIndex(c=>c?.uid===hit.uid);
   if(slot>=0)A.retire(pack,s,foe,'front',slot,{by:'opponent'});
  }
  if(q.data?.next==='buffAny')
   offerOwn(s,spec,fieldCards(s,q.player).filter(c=>def(pack,c).type==='character'),true,null,'own');
  else if(q.data?.next==='bounceInstead'){
   /* 053 follow-up is a return, handled when the retire target is chosen via mode bounce */
  }
  return;
 }
 if(q.step==='restSkip'){
  s.pending=null;
  const foe=1-q.player;
  const slot=plOf(s,foe).front.findIndex(c=>c?.uid===hit.uid);
  const target=slot>=0?plOf(s,foe).front[slot]:null;
  if(target){
   target.ready=false;
   grantContinuousState(s,{kind:'skipNextActive',controller:q.player,sourceUid:q.sourceUid,
    targetUid:target.uid,sourceLinked:false});
  }
  return;
 }
 if(q.step==='mode'){
  s.pending=null;
  if(hit.key==='draw'){
   A.draw(pack,s,q.player,1,q.sourceUid);
   if(plOf(s,q.player).hand.length)offerDiscard(s,spec,1,false,null);
  }else if(hit.key==='buff'){
   const c=selfOf(s,q.player,q.sourceUid);if(c)buff(s,c,1000);
  }else if(hit.key==='under'){
   const doctors=fieldCards(s,q.player).filter(c=>c.uid!==q.sourceUid&&trait(pack,c,DOCTOR));
   offerOwn(s,spec,doctors,true,'underDoctor','own');
  }else if(hit.key==='deploy'){
   const pool=handWhere(s,q.player,c=>def(pack,c).color==='blue'&&def(pack,c).energy<=1&&
    def(pack,c).ap===1&&trait(pack,c,DOCTOR));
   offerFieldEntry(s,spec,pool,{from:'hand',optional:true,skipOnPlay:false});
  }
  return;
 }
 if(q.step==='vulcan'){
  const self=selfOf(s,q.player,q.sourceUid);
  if(hit.mode==='payAll'){
   if(!pay(s,q.player,1,q.sourceUid))throw Error('AP was not ready');
   if(self){grantImpact(s,self);grantDamage(s,self);buff(s,self,1000);}
   use(s,q.sourceUid+'|KMR-1-019');
   s.pending=null;
   return;
  }
  if(self){
   if(hit.key==='impact')grantImpact(s,self);
   if(hit.key==='damage')grantDamage(s,self);
   if(hit.key==='bp')buff(s,self,1000);
  }
  use(s,q.sourceUid+'|KMR-1-019');
  s.pending=null;
  return;
 }
 if(q.step==='own'||q.step==='ready'||q.step==='retireOwn'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const c=fieldCards(s,q.player).find(x=>x.uid===hit.uid)||selfOf(s,q.player,hit.uid);
  if(q.step==='ready'&&c)A.active(s,q.player,c);
  else if(q.step==='retireOwn'&&c){
   const loc=A.location(s,q.player,c.uid);
   if(loc)A.retire(pack,s,q.player,loc.line,loc.slot,{});
  }else if(c&&q.data?.next==='grant21'){buff(s,c,1000);grantDamage(s,c);}
  else if(c&&q.data?.next==='returnSelf'){
   buff(s,c,1000);
   const self=selfOf(s,q.player,q.sourceUid);
   const loc=self&&A.location(s,q.player,self.uid);
   if(loc)A.bounce(pack,s,q.player,self.uid,q.sourceUid);
  }else if(c&&q.data?.next==='buff500')buff(s,c,500);
  else if(c&&q.data?.next==='retire2k'){
   buff(s,c,2000);
   offerRetire(pack,s,spec,2000,true,null);
  }else if(c&&q.data?.next==='debuff')buff(s,c,-1000);
  else if(c&&q.data?.next==='replay'){
   const jobs=A.programs(pack,s,c,'onPlay',q.player,'ownEffect',q.sourceUid);
   if(jobs?.length)s.effectQueue.unshift(...jobs);
  }else if(c&&q.data?.next==='tuckSelf')A.tuck(pack,s,q.player,c.uid,q.sourceUid,q.sourceUid);
  else if(c&&q.data?.next==='underDoctor'){
   if(plOf(s,q.player).deck.length){
    const physical=plOf(s,q.player).deck.shift();
    physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
    c.under??=[];c.under.push(physical);
    A.record(pack,s,{physical,owner:q.player,from:'deck',to:'raid-under',reason:'own-effect',sourceUid:q.sourceUid});
   }
   buff(s,c,1000);
  }else if(c)buff(s,c,q.id==='KMR-1-112'||q.id==='KMR-1-094'?1000:1000);
  return;
 }
 if(q.step==='revealTop'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const top=plOf(s,q.player).deck[0];
  if(!top||top.uid!==q.data.uid)return;
  A.reveal(pack,s,q.player,top);
  if(nonYellowRaid(pack,top)){
   A.move(pack,s,{owner:q.player,from:'deck',to:'hand',index:0,reason:'own-effect',sourceUid:q.sourceUid});
   rememberRaid(pack,s,q.player,top);
  }else hold(s,{...spec,step:'topPlace',data:{uid:top.uid}},[
   {type:'kmr',mode:'top'},{type:'kmr',mode:'bottom'}]);
  return;
 }
 if(q.step==='topPlace'){
  s.pending=null;
  const top=plOf(s,q.player).deck[0];
  if(!top||top.uid!==q.data.uid)return;
  if(hit.mode==='outside')
   A.move(pack,s,{owner:q.player,from:'deck',to:'outside',index:0,reason:'own-effect',sourceUid:q.sourceUid});
  else if(hit.mode==='bottom')lay(plOf(s,q.player),[top.uid],'bottom');
  return;
 }
 if(q.step==='revive'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const hand=plOf(s,q.player).hand[0];
  if(!hand)return;
  discard(pack,s,q.player,hand.uid,q.sourceUid);
  const self=selfOf(s,q.player,q.sourceUid);
  const loc=self&&A.location(s,q.player,self.uid);
  if(loc)A.retire(pack,s,q.player,loc.line,loc.slot,{skipReplacement:true});
  const cards=plOf(s,q.player).outside.filter(c=>exact(pack,c,q.data.name,null));
  if(cards.length)offerFieldEntry(s,spec,cards,{from:'outside',optional:false,skipOnPlay:false});
  return;
 }
 if(q.step==='enter'){
  finishBoardEntry(pack,s,q,hit);
  return;
 }
 if(q.step==='removeAnkh'){
  s.pending=null;
  if(hit.mode==='skip')return;
  if(hit.from==='hand')discard(pack,s,q.player,hit.uid,q.sourceUid);
  else {
   const loc=A.location(s,q.player,hit.uid);
   if(loc){
    const physical=plOf(s,q.player)[loc.line][loc.slot];
    plOf(s,q.player)[loc.line][loc.slot]=null;
    plOf(s,q.player).removed.push(A.clear(physical));
    A.record(pack,s,{physical,owner:q.player,from:loc.line,to:'removed',reason:'own-effect',sourceUid:q.sourceUid});
   }
  }
  A.draw(pack,s,q.player,1,q.sourceUid);
  const self=selfOf(s,q.player,q.sourceUid);
  if(self){buff(s,self,1000);grantImpact(s,self);}
  return;
 }
 if(q.step==='deckBottom'){
  s.pending=null;
  if(hit.mode!=='skip'){
   const foe=1-q.player;
   const slot=plOf(s,foe).front.findIndex(c=>c?.uid===hit.uid);
   if(slot>=0)A.toDeck(pack,s,foe,plOf(s,foe).front[slot].uid,q.sourceUid);
  }
  if(q.data?.thenLife)lifeBottom(pack,s,spec);
  return;
 }
 if(q.step==='lifeBottom'){
  s.pending=null;
  const index=plOf(s,q.player).life.findIndex(c=>c.uid===hit.uid);
  if(index>=0)A.move(pack,s,{owner:q.player,from:'life',to:'deck',index,reason:'own-effect',
   sourceUid:q.sourceUid,deckPosition:'bottom',revealed:false});
  return;
 }
 if(q.step==='tuck'){
  s.pending=null;
  if(hit.mode==='skip')return;
  A.tuck(pack,s,q.player,q.sourceUid,hit.uid,q.sourceUid);
  A.draw(pack,s,q.player,1,q.sourceUid);
  const next=q.data?.next;
  if(next==='deployEx'){
   const pool=[...handWhere(s,q.player,c=>token(pack,c,'エグゼイド',null)&&def(pack,c).energy<=3&&def(pack,c).type==='character'),
    ...plOf(s,q.player).outside.filter(c=>token(pack,c,'エグゼイド',null)&&def(pack,c).energy<=3&&def(pack,c).type==='character')];
   offerFieldEntry(s,spec,pool,{optional:true,skipOnPlay:true,
    fromOf:c=>plOf(s,q.player).hand.some(h=>h.uid===c.uid)?'hand':'outside'});
  }else if(next==='silence'){
   const foes=plOf(s,1-q.player).front.filter(Boolean);
   if(foes.length)hold(s,{...spec,step:'silence',data:{}},[
    {type:'kmr',mode:'skip'},...foes.map(c=>({type:'kmr',mode:'silence',uid:c.uid}))]);
  }
  return;
 }
 if(q.step==='silence'){
  s.pending=null;
  if(hit.mode==='skip')return;
  grantContinuousState(s,{kind:'originalEffectsDisabled',controller:q.player,sourceUid:q.sourceUid,
   targetUid:hit.uid,sourceLinked:false,until:{player:q.player,phase:'start',edge:'start'}});
  return;
 }
 if(q.step==='tuckTop'){
  s.pending=null;
  if(hit.mode==='skip'||!plOf(s,q.player).deck.length)return;
  const self=selfOf(s,q.player,q.sourceUid);
  if(!self)return;
  const physical=plOf(s,q.player).deck.shift();
  physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
  self.under??=[];self.under.push(physical);
  A.record(pack,s,{physical,owner:q.player,from:'deck',to:'raid-under',reason:'own-effect',sourceUid:q.sourceUid});
  return;
 }
 if(q.step==='gearTop'){
  s.pending=null;
  if(hit.mode==='skip')return;
  moveUid(pack,s,q.player,'outside',q.data.uid,'deck',q.sourceUid,'top');
  return;
 }
 if(q.step==='gearRetire'||q.step==='gearRetire3'){
  s.pending=null;
  if(hit.mode==='skip')return;
  discard(pack,s,q.player,hit.uid,q.sourceUid);
  offerRetire(pack,s,spec,q.step==='gearRetire3'?3000:1500,true,null);
  return;
 }
 if(q.step==='punish'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const foe=1-q.player;
  const slot=plOf(s,foe).front.findIndex(c=>c?.uid===hit.uid);
  const retired=slot>=0?plOf(s,foe).front[slot]:null;
  if(slot>=0)A.retire(pack,s,foe,'front',slot,{by:'opponent'});
  const opp=1-q.player;
  if(plOf(s,opp).hand.length>=2&&retired){
   hold(s,{player:opp,sourceUid:q.sourceUid,id:q.id,step:'punishBack',data:{uid:retired.uid,owner:q.player}},[
    {type:'kmr',mode:'skip'},{type:'kmr',mode:'payback'}
   ]);
  }
  return;
 }
 if(q.step==='punishBack'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const hand=plOf(s,q.player).hand;
  if(hand.length<2)return;
  discard(pack,s,q.player,hand[0].uid,q.sourceUid);
  discard(pack,s,q.player,plOf(s,q.player).hand[0].uid,q.sourceUid);
  const card=plOf(s,q.data.owner).outside.find(c=>c.uid===q.data.uid);
  if(card)moveUid(pack,s,q.data.owner,'outside',card.uid,'hand',q.sourceUid);
  return;
 }
 if(q.step==='medalBack'){
  s.pending=null;
  if(hit.mode==='skip')return;
  nameLock(s,q.player,q.data.lock);
  moveUid(pack,s,q.player,'outside',q.sourceUid,'hand',q.sourceUid);
  const hand=plOf(s,q.player).hand.filter(c=>c.uid!==q.sourceUid);
  if(hand.length)hold(s,{...spec,step:'placeHand',data:{bottomOnly:true}},
   hand.map(c=>({type:'kmr',mode:'bottom',uid:c.uid})));
  return;
 }
 if(q.step==='placeHand'){
  s.pending=null;
  moveUid(pack,s,q.player,'hand',hit.uid,'deck',q.sourceUid,hit.mode==='top'?'top':'bottom');
  return;
 }
 if(q.step==='shiftRaid'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const top=A.strip(pack,s,q.player,q.sourceUid);
  if(!top)return;
  const host=selfOf(s,q.player,hit.uid);
  const loc=host&&A.location(s,q.player,host.uid);
  if(!loc)return;
  const index=plOf(s,q.player).outside.findIndex(c=>c.uid===top.uid);
  if(index>=0)plOf(s,q.player).outside.splice(index,1);
  A.raid(pack,s,q.player,top,host.uid,loc.line,loc.slot,undefined,
   {entryReady:true,entryCause:'outsideEffectRaid',entryFrom:'outside',effectSourceUid:q.sourceUid});
  return;
 }
 if(q.step==='raidHand'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const index=plOf(s,q.player).hand.findIndex(c=>c.uid===hit.uid);
  if(index<0)return;
  const physical=plOf(s,q.player).hand.splice(index,1)[0];
  buff(s,physical,q.data.bp||1000);
  A.raid(pack,s,q.player,physical,hit.baseUid,hit.line,hit.slot,undefined,
   {entryReady:true,entryCause:'handEffectRaid',entryFrom:'hand',effectSourceUid:q.sourceUid});
  return;
 }
 if(q.step==='oppTop'){
  s.pending=null;
  const owner=q.data.owner;
  const top=plOf(s,owner).deck[0];
  if(!top||top.uid!==q.data.uid)return;
  if(hit.mode==='outside')
   A.move(pack,s,{owner,controller:q.player,from:'deck',to:'outside',index:0,reason:'opponent-effect',sourceUid:q.sourceUid});
  return;
 }
 if(q.step==='sub25'){
  s.pending=null;
  if(hit.mode==='skip'){
   A.retire(pack,s,q.data.owner,q.data.line,q.data.slot,{postImpact:q.data.postImpact,by:q.data.by,skipReplacement:true});
   return;
  }
  const loc=A.location(s,q.player,hit.uid);
  if(loc)A.retire(pack,s,q.player,loc.line,loc.slot,{skipReplacement:true});
  return;
 }
 if(q.step==='spend51'){
  s.pending=null;
  if(hit.mode==='skip'){
   A.retire(pack,s,q.data.owner,q.data.line,q.data.slot,{postImpact:q.data.postImpact,by:q.data.by,skipReplacement:true});
   return;
  }
  const host=selfOf(s,q.player,q.sourceUid);
  const layer=(host?.under||[]).find(c=>c.uid===hit.uid&&c.faceDown);
  if(host&&layer){
   host.under=host.under.filter(c=>c!==layer);
   layer.faceDown=false;layer.ready=false;layer.fieldEntryStamp=null;
   plOf(s,q.player).outside.push(layer);
   A.record(pack,s,{physical:layer,owner:q.player,from:'raid-under',to:'outside',reason:'own-effect',sourceUid:host.uid});
  }
  return;
 }
 throw Error('Kamen Rider choice is not legal');
}

export function runKmrJob(pack,s,job){
 arm(pack);
 if(job.slot==='orderWindow'){
  const left=(job.uids||[]).filter(uid=>plOf(s,job.owner).deck.some(c=>c.uid===uid));
  offerOrder(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},left,job.where||'bottom',null);
  return;
 }
 if(job.slot==='entryFollow'&&job.then==='more005'){
  const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
  const rested=()=>fieldCards(s,job.owner).filter(c=>!c.ready);
  if((job.got||[]).length>=(job.max??2)||
   !offerFieldEntry(s,spec,frontRaidPool(pack,s,job.owner,job.names,job.got),{
    lines:['front'],from:'hand',optional:true,skipOnPlay:false,then:'more005',
    names:job.names||[],got:job.got||[],max:job.max??2}))
   offerOwn(s,spec,rested(),true,null,'ready');
  return;
 }
 const fn=HANDLERS[job.id+'|'+job.slot];
 if(!fn)throw Error('Kamen Rider job is not implemented');
 fn(pack,s,job);
}
export function kmrImplements(id,slot){return typeof HANDLERS[id+'|'+slot]==='function';}
export function legalKmrPending(pack,s){arm(pack);return s.pending?.actions||[];}
export function resolveKmrPending(pack,s,a){
 arm(pack);
 const q=s.pending;
 if(!q||q.kind!=='kmr')throw Error('Kamen Rider choice is not pending');
 resolveStep(pack,s,q,a);
 if(!s.pending)A.go(pack,s);
}

function frontOf(s,owner,c){return A.location(s,owner,c.uid)?.line==='front';}

export function legalKmrActivations(pack,s,owner,c){
 arm(pack);
 const d=def(pack,c);
 if(d.mainAbility?.op!=='kmrMain'||!live(s,c))return [];
 const id=d.id,out=[];
 const push=(mode='kmr:'+id)=>{out.push({type:'activate',uid:c.uid,mode});};
 if(id==='KMR-1-003'&&!used(s,c.uid+'|KMR-1-003')&&s.kmrRaidToHand?.[owner]===s.turn)push();
 if(id==='KMR-1-005'&&frontOf(s,owner,c)&&!used(s,c.uid+'|KMR-1-005')&&apReady(s,owner)>=1)push();
 if(id==='KMR-1-019'&&!used(s,c.uid+'|KMR-1-019'))push();
 if(id==='KMR-1-027'){
  if(c.ready&&!used(s,c.uid+'|027a'))push('kmr:KMR-1-027:a');
  if(frontOf(s,owner,c)&&!used(s,c.uid+'|027b')&&plOf(s,owner).deck.length)push('kmr:KMR-1-027:b');
 }
 if(id==='KMR-1-028'&&c.ready)push();
 if(id==='KMR-1-029'&&c.ready)push();
 if(id==='KMR-1-034'&&frontOf(s,owner,c)&&!used(s,c.uid+'|'+id)&&sameEnergy(pack,s,owner).length)push();
 if(id==='KMR-1-035'&&frontOf(s,owner,c)&&!used(s,c.uid+'|'+id)&&sameEnergy(pack,s,owner).length)push();
 if(id==='KMR-1-036'&&frontOf(s,owner,c)&&!used(s,c.uid+'|'+id)&&sameEnergy(pack,s,owner).length)push();
 if(id==='KMR-1-039'&&frontOf(s,owner,c)&&!used(s,c.uid+'|'+id)&&sameEnergy(pack,s,owner).length)push();
 if(id==='KMR-1-042'&&frontOf(s,owner,c)&&!used(s,c.uid+'|'+id)&&sameEnergy(pack,s,owner).length)push();
 if(id==='KMR-1-044'&&frontOf(s,owner,c)&&!used(s,c.uid+'|KMR-1-044')&&
  plOf(s,owner).outside.some(x=>token(pack,x,'ゾンビゲーマー',null)))push();
 if(id==='KMR-1-045'&&c.ready&&!used(s,c.uid+'|KMR-1-045')&&
  fieldCards(s,owner).some(x=>x.uid!==c.uid&&def(pack,x).type==='character'))push();
 if(id==='KMR-1-047'&&!used(s,c.uid+'|KMR-1-047'))push();
 if(id==='KMR-1-053'&&!used(s,c.uid+'|KMR-1-053')&&(c.under||[]).some(x=>x.faceDown))push();
 if(id==='KMR-1-060'&&c.ready&&fieldCards(s,owner).some(x=>token(pack,x,'エグゼイド',s)))push();
 if(id==='KMR-1-062'&&c.ready&&!nameLocked(s,owner,'アンク|062')){
  const n=(s.zoneMoveEvents||[]).filter(e=>e.turn===s.turn&&e.owner===owner&&e.from==='hand'&&
   e.to==='outside'&&e.reason==='own-effect'&&String(e.sourceName||'').includes('オーズ')).length;
  if(n>=3)push();
 }
 if(id==='KMR-1-068'&&c.ready&&plOf(s,owner).outside.some(x=>exact(pack,x,'スパークルカット',null)))push();
 if(id==='KMR-1-071'&&frontOf(s,owner,c)&&c.entryTurn===s.turn&&!used(s,c.uid+'|KMR-1-071')&&
  handWhere(s,owner,x=>exact(pack,x,'デネブイマジン',null)).length)push();
 if(id==='KMR-1-081'&&!used(s,c.uid+'|KMR-1-081')&&plOf(s,owner).hand.length)push();
 if(id==='KMR-1-094'){
  if(c.ready&&fieldCards(s,owner).some(x=>A.raided(pack,x)&&token(pack,x,'電王',s)))push('kmr:KMR-1-094:a');
  if(!used(s,c.uid+'|094b')&&s.raidedThisTurn?.[owner]&&plOf(s,owner).hand.length)push('kmr:KMR-1-094:b');
 }
 if(id==='KMR-1-108'&&c.ready&&plOf(s,owner).hand.length&&apReady(s,owner)>=1&&
  plOf(s,owner).outside.some(x=>def(pack,x).color==='yellow'&&def(pack,x).energy<=1&&def(pack,x).ap===1&&
   trait(pack,x,INTEL)))push();
 return out;
}
export function legalKmrOutside(pack,s,owner){
 arm(pack);
 const out=[];
 for(const c of plOf(s,owner).outside){
  const id=def(pack,c).id;
  if(id==='KMR-1-029'&&A.energy(pack,s,owner)>=3&&apReady(s,owner)>=1)
   out.push({type:'activate',uid:c.uid,mode:'kmr:KMR-1-029:out'});
  if(id==='KMR-1-111'&&A.energy(pack,s,owner)>=4&&apReady(s,owner)>=1&&plOf(s,owner).hand.length>=2)
   out.push({type:'activate',uid:c.uid,mode:'kmr:KMR-1-111'});
 }
 return out;
}
export function activateKmr(pack,s,action){
 arm(pack);
 const owner=s.active;
 const mode=String(action.mode||'');
 const id=mode.split(':')[1];
 const tail=mode.split(':')[2]||'';
 const c=[...A.field(plOf(s,owner)),...plOf(s,owner).outside].find(x=>x.uid===action.uid);
 if(!c||def(pack,c).id!==id)throw Error('Kamen Rider activation is not legal');
 s.effectQueue.unshift({op:'kmr',id,slot:'main',owner,sourceUid:c.uid,
  mode:tail==='out'?'out':tail==='a'?'a':tail==='b'?'b':''});
 A.go(pack,s);
}
