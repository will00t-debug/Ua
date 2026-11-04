// EX12BT scripts. The engine passes zone helpers; this file does not import it.
// Printed choices include zero when the sentence says まで.
// KMR-2-067 and KMR-2-068 copy another card's turn text by that card's id.
// Registration is not an official FAQ certification.
import {cardHasName,cardHasTrait} from './field-conditions.mjs';
import {originalEffectsDisabled,grantContinuousState} from './continuous-states.mjs';
import {kmr2CopiedIds} from './kmr2-continuous.mjs';
import {raidBoxListed} from './raid-box.mjs';

const SCHOOL='天ノ川学園高校';
const RE='リ・イマジネーション';
const ADVENT='アドベントカード';
const MIRROR='ミラーモンスター';
const DOCTOR='ドクター';
const IMAGIN='イマジン';
const GO='ゴチゾウ';
const MEM='メモリチェンジ';
const VENT='ファイナルベント';
const MASTER='仮面ライダーガヴ マスターモード';
const OVER='仮面ライダーガヴ オーバーモード';
const HOPPER='仮面ライダーゼロワン リアライジングホッパー';
const PLATFORM='仮面ライダー電王 プラットフォーム';
const PARADOX='仮面ライダーパラドクス パーフェクトノックアウトゲーマー レベル99';
const LUNA='仮面ライダーＷ ルナジョーカー';
let A=null;
export function bindKmr2(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return c&&!originalEffectsDisabled(s,c);}
function selfOf(s,owner,uid){return A.location(s,owner,uid)?.c||null;}
function arm(pack){A.pack=pack;}
function hold(s,spec,actions){
 if(!actions.length)return false;
 s.pending={kind:'kmr2',player:spec.player,sourceUid:spec.sourceUid||null,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
 return true;
}
function sig(a){
 return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,
  a?.replaceUid??null,a?.key??null,a?.ready??null,a?.from??null,a?.skip??null]);
}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Kamen Rider vol.2 choice is not legal');
 return hit;
}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function nameLocked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function nameLock(s,owner,key){if(!nameLocked(s,owner,key))s.mainReadyOnceByName[owner].push(key);}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function grantImpact(s,c){if(c)c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function energyBuff(s,c,untilOwn){
 if(!c)return;
 c.buffs??=[];
 const color=A.card(A.pack,c).color;
 if(untilOwn)c.buffs.push({energy:1,color,untilOwnTurnStart:s.players[Number(String(c.uid).split('-')[0])].ownTurns+1});
 else c.buffs.push({energy:1,color,untilTurn:s.turn});
}
function token(pack,c,name,s){
 const d=def(pack,c);
 if(d.name?.includes(name))return true;
 if(s&&!live(s,c))return false;
 return (d.nameAliases||[]).some(n=>typeof n==='string'&&n.includes(name));
}
function exact(pack,c,name,s){return cardHasName(def(pack,c),name,s?originalEffectsDisabled(s,c):false);}
function trait(pack,c,name){return cardHasTrait(def(pack,c),name);}
function fieldCards(s,owner){return A.field(plOf(s,owner));}
function frontOf(s,owner,c){return A.location(s,owner,c.uid)?.line==='front';}
function energyPrinted(pack,c){return c?.kmr2AsEnergy??def(pack,c).energy;}
function windowCards(s,owner,n){return plOf(s,owner).deck.slice(0,Math.min(n,plOf(s,owner).deck.length));}
function moveUid(pack,s,owner,from,uid,to,sourceUid,deckPosition){
 const index=plOf(s,owner)[from].findIndex(c=>c.uid===uid);
 if(index<0)return null;
 return A.move(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid,
  ...(to==='deck'?{deckPosition:deckPosition||'bottom',revealed:false}:{})});
}
function discard(pack,s,owner,uid,sourceUid){return moveUid(pack,s,owner,'hand',uid,'outside',sourceUid);}
function lay(pl,uids,where){
 const picked=[];
 for(const uid of uids){
  const index=pl.deck.findIndex(c=>c.uid===uid);
  if(index<0)throw Error('Kamen Rider vol.2 order lost a card');
  picked.push(pl.deck.splice(index,1)[0]);
 }
 if(where==='top')pl.deck.unshift(...picked);
 else pl.deck.push(...picked);
}
function offerOrder(s,spec,uids,where,after){
 const left=uids.filter(Boolean);
 if(left.length<=1){lay(plOf(s,spec.player),left,where);return false;}
 return hold(s,{...spec,step:'lookOrder',data:{left,built:[],where,after:after||null}},
  left.map(uid=>({type:'kmr2',mode:'next',uid})));
}
function beginLook(s,spec,count,match,opts={}){
 const window=windowCards(s,spec.player,count);
 const after=opts.after||null;
 if(!window.length)return after;
 const matches=window.filter(c=>match(c));
 const takeMode=opts.takeMode||'take';
 const data={uids:window.map(c=>c.uid),taken:[],max:opts.max??1,min:opts.min||0,
  where:opts.where||'bottom',dest:opts.dest||'hand',reveal:opts.reveal!==false,
  discard:opts.discard===true,after,takeMode};
 const actions=[
  ...(data.min===0?[{type:'kmr2',mode:'done'}]:[]),
  ...matches.map(c=>({type:'kmr2',mode:takeMode,uid:c.uid}))
 ];
 if(!matches.length&&data.min===0){
  if(offerOrder(s,spec,data.uids,data.where,data.after))return 'held';
  return data.after;
 }
 if(!actions.length)return after;
 return hold(s,{...spec,step:'lookPick',data},actions)?'held':after;
}
function finishLook(pack,s,spec,data){
 const pl=plOf(s,spec.player);
 if(data.after==='schoolDiscard'){
  const punish=data.taken.some(uid=>{
   const c=pl.deck.find(x=>x.uid===uid);
   return c&&!String(def(pack,c).name||'').includes('フォーゼ');
  });
  data.after=punish?'discard1':null;
 }
 for(const uid of data.taken){
  const index=pl.deck.findIndex(c=>c.uid===uid);
  if(index<0)throw Error('Kamen Rider vol.2 look lost a card');
  const physical=pl.deck[index];
  if(data.dest==='hand'&&data.reveal!==false)A.reveal(pack,s,spec.player,physical);
  A.move(pack,s,{owner:spec.player,from:'deck',to:data.dest==='outside'?'outside':'hand',
   index,reason:'own-effect',sourceUid:spec.sourceUid});
 }
 if(data.discard&&data.taken.length&&pl.hand.length){
  offerDiscard(s,spec,1,false,data.after||null);
  return 'held';
 }
 const left=data.uids.filter(uid=>!data.taken.includes(uid));
 if(offerOrder(s,spec,left,data.where,data.after))return 'held';
 return data.after||null;
}
function offerDiscard(s,spec,count,optional,next,extra){
 const hand=plOf(s,spec.player).hand;
 if(hand.length<count)return false;
 return hold(s,{...spec,step:'discard',data:{need:count,got:[],optional,next:next||null,...(extra||{})}},[
  ...(optional?[{type:'kmr2',mode:'skip'}]:[]),
  ...hand.map(c=>({type:'kmr2',mode:'discard',uid:c.uid}))
 ]);
}
function offerList(s,spec,step,cards,optional,next,mode){
 if(!cards.length){if(optional)return false;return false;}
 return hold(s,{...spec,step,data:{next:next||null,optional}},[
  ...(optional?[{type:'kmr2',mode:'skip'}]:[]),
  ...cards.map(c=>({type:'kmr2',mode,uid:c.uid}))
 ]);
}
function oppFront(s,owner,pred){return plOf(s,1-owner).front.filter(c=>c&&(!pred||pred(c)));}
function offerRetire(pack,s,spec,limit,optional,next){
 const targets=oppFront(s,spec.player,c=>limit==null||A.bp(pack,s,c)<=limit);
 if(!targets.length)return false;
 return offerList(s,spec,'retire',targets,optional,next,'retire');
}
function ownWhere(s,owner,pred){return fieldCards(s,owner).filter(pred);}
function handWhere(s,owner,pred){return plOf(s,owner).hand.filter(pred);}
function zoneWhere(s,owner,zone,pred){return plOf(s,owner)[zone].filter(pred);}
function apReady(s,owner){return plOf(s,owner).apCards.filter(c=>c.ready).length;}
function pay(s,owner,n,sourceUid){
 if(apReady(s,owner)<n)return false;
 A.spend(plOf(s,owner),n);
 A.noteEffect(A.pack,s,owner,sourceUid);
 return true;
}
function specOf(q){return {player:q.player??q.owner,sourceUid:q.sourceUid,id:q.id};}
function gochizo(pack,s,owner){
 const piles=[...fieldCards(s,owner),...plOf(s,owner).outside];
 return piles.filter(c=>exact(pack,c,GO,s));
}
function school(pack,s,owner,exclude){
 return fieldCards(s,owner).filter(c=>trait(pack,c,SCHOOL)&&!(exclude&&token(pack,c,exclude,s)));
}
function hasName(pack,s,owner,tokenName){
 return fieldCards(s,owner).some(c=>token(pack,c,tokenName,s));
}
function memoryEntry(c,s){
 const mark=c?.kmr2EnteredBy;
 return !!mark&&mark.turn===s.turn&&(mark.name===MEM||mark.id==='KMR-2-059');
}
function askEnter(s,spec,uid,ready,from,skip,next,lines){
 const pl=plOf(s,spec.player);
 const allowed=Array.isArray(lines)&&lines.length?lines:['front','energy'];
 const actions=[];
 for(const line of allowed)
  for(const choice of A.destinations(pl,line))
   actions.push({type:'kmr2',mode:'enter',uid,line,slot:choice.slot,
    replaceUid:choice.replaceUid??null,ready,from,skip:skip===true});
 if(!actions.length)return false;
 const carried=spec.data&&typeof spec.data==='object'?{...spec.data}:{};
 return hold(s,{...spec,step:'enter',data:{...carried,uid,ready,from,skip:skip===true,next:next||null}},actions);
}
// Up to N matching cards. The player picks which card, including none when the
// print says まで. The first card is not taken automatically.
function offerEnter(s,spec,pool,opts={}){
 const cards=(pool||[]).filter(Boolean);
 if(!cards.length)return false;
 const lines=opts.lines||null;
 const allowed=Array.isArray(lines)&&lines.length?lines:['front','energy'];
 if(!allowed.some(line=>A.destinations(plOf(s,spec.player),line).length))return false;
 const optional=opts.optional!==false;
 return hold(s,{...spec,step:'deployPick',data:{
  left:cards.map(c=>c.uid),got:0,max:opts.max||1,ready:opts.ready===true,
  from:opts.from||'hand',lines,skipOnPlay:opts.skipOnPlay===true,
  next:opts.next||null,lock:opts.lock||null,stop:optional
 }},[
  ...(optional?[{type:'kmr2',mode:'done'}]:[]),
  ...cards.map(c=>({type:'kmr2',mode:'deploy',uid:c.uid}))
 ]);
}
function doEnter(pack,s,owner,a,sourceUid){
 A.enter(pack,s,{owner,from:a.from,uid:a.uid,line:a.line,slot:a.slot,
  replaceUid:a.replaceUid||undefined,ready:a.ready===true,sourceUid,skipOnPlay:a.skip===true});
}
function restCard(s,owner,c,sourceUid){
 if(!c)return;
 c.ready=false;
 A.noteRest(A.pack,s,owner,sourceUid||c.uid);
}
function retireUid(pack,s,owner,uid,by){
 const loc=A.location(s,owner,uid);
 if(!loc)return false;
 return A.retire(pack,s,owner,loc.line,loc.slot,by?{by}:{})===true;
}
function silenceUntil(s,controller,sourceUid,targetUid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid,targetUid,
  sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function banAttack(s,controller,sourceUid,targetUid){
 grantContinuousState(s,{kind:'cannotAttack',controller,sourceUid,targetUid,sourceLinked:false,
  until:{player:controller,phase:'start',edge:'start'}});
}
function raidFromHand(pack,s,owner,uid,baseUid,sourceUid){
 const pl=plOf(s,owner);
 const index=pl.hand.findIndex(c=>c.uid===uid);
 const base=A.location(s,owner,baseUid);
 if(index<0||!base)return false;
 const physical=pl.hand[index];
 if(!A.raidBase(pack,s,owner,base.c,def(pack,physical)))return false;
 pl.hand.splice(index,1);
 A.raid(pack,s,owner,physical,baseUid,base.line,base.slot,undefined,
  {entryCause:'effectRaid',entryFrom:'hand',effectSourceUid:sourceUid});
 return true;
}
function copyTurn(s,host,ids){
 if(!host||!ids.length)return;
 const owner=Number(String(host.uid).split('-')[0]);
 host.kmr2Copied={untilOwnTurn:plOf(s,owner).ownTurns+1,ids:[...ids]};
}
function gavFilter(pack,c){
 const d=def(pack,c);
 if(exact(pack,c,GO,null))return true;
 return d.type==='character'&&(token(pack,c,'ガヴ',null)||token(pack,c,'ヴァレン',null)||token(pack,c,'ヴラム',null));
}
function riderFilter(pack,c){
 const d=def(pack,c);
 return trait(pack,c,MIRROR)||(d.type==='character'&&(token(pack,c,'龍騎',null)||token(pack,c,'ナイト',null)));
}
function nonYellowRaid(pack,c){
 const d=def(pack,c);
 return d.type==='character'&&d.color!=='yellow'&&!!d.raidName&&d.bp<=4000;
}
function finishPr003(s,spec){
 const chain=s.kmrPrChain;
 s.kmrPrChain=null;
 if(chain?.discard&&plOf(s,spec.player).hand.length)
  return offerDiscard(s,spec,1,false,null);
 return false;
}
function follow(pack,s,spec,next){
 if(!next)return false;
 if(next==='pr003Discard')return finishPr003(s,spec);
 if(next==='draw1'){A.draw(pack,s,spec.player,1,spec.sourceUid);return false;}
 if(next==='draw2'){A.draw(pack,s,spec.player,2,spec.sourceUid);return false;}
 if(next==='activeSelf'){
  const c=selfOf(s,spec.player,spec.sourceUid);if(c)A.active(s,spec.player,c);return false;
 }
 if(next==='discard1')return offerDiscard(s,spec,1,false,null);
 if(next==='readyAp'){A.readyAp(plOf(s,spec.player));return false;}
 if(next==='buff2000'){const c=selfOf(s,spec.player,spec.sourceUid);buff(s,c,2000);return false;}
 if(next==='buff1000self'){const c=selfOf(s,spec.player,spec.sourceUid);buff(s,c,1000);return false;}
 if(next==='energyTurn'){energyBuff(s,selfOf(s,spec.player,spec.sourceUid),false);return false;}
 if(next==='energyNext'){energyBuff(s,selfOf(s,spec.player,spec.sourceUid),true);return false;}
 if(next==='frontEnergy'){
  const c=selfOf(s,spec.player,spec.sourceUid);
  if(c)c.kmr2FrontEnergy={untilOwnTurn:plOf(s,spec.player).ownTurns+1};
  return false;
 }
 if(next==='removeSelf'){
  const c=selfOf(s,spec.player,spec.sourceUid);
  if(c)A.remove(pack,s,spec.player,c.uid,spec.sourceUid);
  return false;
 }
 if(next==='deployRe'){
  const pool=handWhere(s,spec.player,c=>def(pack,c).energy<=2&&def(pack,c).ap===1&&
   def(pack,c).color==='green'&&trait(pack,c,RE));
  return offerEnter(s,spec,pool,{ready:false,from:'hand',optional:true,max:2});
 }
 if(next==='mirror'){
  const pool=zoneWhere(s,spec.player,'outside',c=>trait(pack,c,MIRROR)&&def(pack,c).type==='character');
  return offerEnter(s,spec,pool,{ready:false,from:'outside',optional:true});
 }
 if(next==='ankhHand'){
  const pool=zoneWhere(s,spec.player,'outside',c=>exact(pack,c,'アンク',s)&&energyPrinted(pack,c)===0);
  return offerList(s,spec,'hand',pool,true,null,'hand');
 }
 return false;
}

function onLook(pack,s,job,count,pred,opts){
 // Named filters take (pack, card). Inline filters already close over pack
 // and take the card. Passing the pack into those made the look throw.
 const match=c=>pred.length>=2?pred(pack,c):pred(c);
 const next=beginLook(s,specOf(job),count,match,opts||{});
 if(next&&next!=='held')follow(pack,s,specOf(job),next);
}
function on001(pack,s,job){onLook(pack,s,job,2,gavFilter,{dest:'outside',where:'top',reveal:false,takeMode:'outside'});}
function on004(pack,s,job){
 const spec=specOf(job);
 const targets=ownWhere(s,job.owner,c=>c.ready&&exact(pack,c,GO,s));
 offerList(s,spec,'rest',targets,true,'draw1','rest');
}
function recoverGochizo(pack,s,job){
 const spec=specOf(job);
 const pool=zoneWhere(s,job.owner,'outside',c=>exact(pack,c,GO,s));
 offerList(s,spec,'hand',pool,true,null,'hand');
}
function deployGochizo(pack,s,job,ready){
 offerEnter(s,specOf(job),handWhere(s,job.owner,c=>exact(pack,c,GO,s)),
  {ready,from:'hand',optional:true,lines:['energy']});
}
function attackEndSwap(pack,s,job,partner){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!(self.stack||[]).length)return;
 if(s.raidedThisTurn?.[job.owner])return;
 const spec=specOf(job);
 const hand=handWhere(s,job.owner,c=>exact(pack,c,partner,null));
 const food=ownWhere(s,job.owner,c=>exact(pack,c,GO,s));
 if(!hand.length||!food.length)return;
 hold(s,{...spec,step:'swapPartner',data:{partner,base:self.stack[0].uid}},[
  {type:'kmr2',mode:'skip'},
  ...hand.map(c=>({type:'kmr2',mode:'reveal',uid:c.uid}))
 ]);
}
function on013(pack,s,job){
 const chars=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&def(pack,c).type==='character');
 if(chars.length)return;
 A.draw(pack,s,job.owner,1,job.sourceUid);
 offerDiscard(s,specOf(job),1,false,null);
}
function on015(pack,s,job){
 const spec=specOf(job);
 const targets=oppFront(s,job.owner,c=>A.bp(pack,s,c)<=5000);
 if(!targets.length)return;
 const chooser=hasName(pack,s,job.owner,'ガヴ')?job.owner:1-job.owner;
 hold(s,{...spec,player:chooser,step:'pickFront',data:{next:'oppDeck',chooser,actor:job.owner}},[
  ...targets.map(c=>({type:'kmr2',mode:'place',uid:c.uid}))
 ]);
}
function on018(pack,s,job){
 hold(s,{...specOf(job),step:'mode',data:{}},[
  {type:'kmr2',mode:'one',key:'draw'},
  {type:'kmr2',mode:'two',key:'raid'}
 ]);
}
function on021(pack,s,job){
 const spec=specOf(job);
 if(!plOf(s,job.owner).hand.length||!plOf(s,job.owner).life.length)return;
 hold(s,{...spec,step:'payLife',data:{}},[
  {type:'kmr2',mode:'skip'},
  ...plOf(s,job.owner).hand.map(c=>({type:'kmr2',mode:'discard',uid:c.uid,key:'life'}))
 ]);
}
function on024(pack,s,job){
 const spec=specOf(job);
 if(job.slot==='onRetire'){
  const pool=zoneWhere(s,job.owner,'outside',c=>!exact(pack,c,'アンク',s)&&token(pack,c,'オーズ',s)&&def(pack,c).type==='character');
  offerList(s,spec,'removed',pool,true,'ankhHand','removed');
  return;
 }
 const pool=zoneWhere(s,job.owner,'removed',c=>exact(pack,c,'アンク',s));
 offerList(s,spec,'outside',pool,true,'readyAp','outside');
}
function on025(pack,s,job){
 const pool=zoneWhere(s,job.owner,'outside',c=>{
  const d=def(pack,c);
  if(energyPrinted(pack,c)!==0)return false;
  return d.type==='field'||d.type==='event'||(d.type==='character'&&token(pack,c,'オーズ',s));
 });
 offerList(s,specOf(job),'takeTwo',pool,true,null,'hand');
}
function on026(pack,s,job){
 const spec=specOf(job);
 if(!plOf(s,job.owner).energy.some(c=>c&&token(pack,c,'オーズ',s))){
  moveUid(pack,s,job.owner,'outside',job.sourceUid,'removed',job.sourceUid);
  return;
 }
 const pool=handWhere(s,job.owner,c=>def(pack,c).type==='character'&&def(pack,c).energy<=3&&
  def(pack,c).ap===1&&def(pack,c).color==='blue'&&token(pack,c,'オーズ',s));
 if(!offerEnter(s,spec,pool,{ready:false,from:'hand',optional:true,next:'removeSelf'}))
  moveUid(pack,s,job.owner,'outside',job.sourceUid,'removed',job.sourceUid);
}
function on034(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self)self.kmr2ShieldUntil=plOf(s,job.owner).ownTurns+1;
 const pool=fieldCards(s,job.owner).filter(c=>energyPrinted(pack,c)<=3);
 offerList(s,specOf(job),'energyPick',pool,true,null,'own');
}
function on042(pack,s,job){
 A.draw(pack,s,job.owner,2,job.sourceUid);
 const pool=ownWhere(s,job.owner,c=>token(pack,c,'フォーゼ',s));
 offerList(s,specOf(job),'remove',pool,true,'draw1','remove');
}
function on046(pack,s,job){
 const others=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&def(pack,c).energy>=4);
 if(!others.length){const c=selfOf(s,job.owner,job.sourceUid);if(c)A.active(s,job.owner,c);}
}
function on048(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 const actions=[{type:'kmr2',mode:'done'}];
 if(plOf(s,job.owner).deck.length)actions.push({type:'kmr2',mode:'one',key:'look'});
 if(self&&memoryEntry(self,s)&&apReady(s,job.owner)>=1)actions.push({type:'kmr2',mode:'two',key:'pay'});
 if(actions.length>1)hold(s,{...specOf(job),step:'mode',data:{}},actions);
}
function wKinds(pack,s,owner){
 const set=new Set();
 for(const c of fieldCards(s,owner)){
  if(def(pack,c).type!=='character'||!token(pack,c,'Ｗ',s))continue;
  set.add(def(pack,c).energy);
 }
 return set.size;
}
function on049(pack,s,job){
 if(wKinds(pack,s,job.owner)<4)return;
 const targets=oppFront(s,job.owner);
 offerList(s,specOf(job),'toEnergy',targets,true,null,'place');
}
function on052(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>def(pack,c).energy<=2&&token(pack,c,'Ｗ',s));
 offerList(s,specOf(job),'buff',pool,true,null,'own');
}
function on055(pack,s,job){
 if(job.slot==='onAttack'){
  if(used(s,job.sourceUid+'|KMR-2-055'))return;
  const pool=plOf(s,job.owner).front.filter(c=>c?.ready&&token(pack,c,'Ｗ',s));
  offerList(s,specOf(job),'rest',pool,true,'fang','rest');
  return;
 }
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.stack?.[0])return;
 const peeled=A.peel(pack,s,job.owner,self.uid,job.sourceUid);
 if(peeled){
  const outside=plOf(s,job.owner).outside.findIndex(c=>c.uid===peeled.uid);
  if(outside>=0)A.move(pack,s,{owner:job.owner,from:'outside',to:'hand',index:outside,
   reason:'own-effect',sourceUid:job.sourceUid});
 }
 offerDiscard(s,specOf(job),1,false,null);
}
function on056(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self))return;
 if(nameLocked(s,job.owner,LUNA))return;
 const pool=handWhere(s,job.owner,c=>def(pack,c).type==='character'&&def(pack,c).bp<=1500&&
  def(pack,c).color==='green'&&token(pack,c,'Ｗ',s));
 offerEnter(s,specOf(job),pool,{ready:false,from:'hand',optional:true,lock:LUNA});
}
function on057(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self&&memoryEntry(self,s)&&plOf(s,job.owner).deck.length)
  hold(s,{...specOf(job),step:'mode',data:{}},[
   {type:'kmr2',mode:'one',key:'draw'},{type:'kmr2',mode:'two',key:'look'}]);
 else A.draw(pack,s,job.owner,1,job.sourceUid);
}
function on058(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>def(pack,c).energy<=2&&token(pack,c,'Ｗ',s));
 offerList(s,specOf(job),'block',pool,true,null,'own');
}
function on060(pack,s,job){
 A.draw(pack,s,job.owner,1,job.sourceUid);
 const pool=handWhere(s,job.owner,c=>def(pack,c).type==='character'&&def(pack,c).color==='green'&&
  def(pack,c).energy<=1&&def(pack,c).ap===1);
 offerEnter(s,specOf(job),pool,{ready:false,from:'hand',optional:true,skipOnPlay:true});
}
function on061(pack,s,job){
 const names=fieldCards(s,job.owner).filter(c=>token(pack,c,'Ｗ',s)||exact(pack,c,MEM,null)).length;
 offerRetire(pack,s,specOf(job),names*1000,true,null);
}
function on063(pack,s,job){
 onLook(pack,s,job,5,c=>trait(pack,c,RE),{where:'bottom',after:'deployRe'});
}
function on065(pack,s,job){
 onLook(pack,s,job,3,c=>def(pack,c).type==='character'&&token(pack,c,'ディケイド',null)||trait(pack,c,RE),
  {where:'bottom',discard:true});
}
// EX12BT/KMR-2-068: 2枚まで includes zero, one, and two. Placing one card
// still retires by that card's printed BP and copies that card's turn text.
function offer068(pack,s,spec,got,closed){
 const pool=handWhere(s,spec.player,c=>trait(pack,c,RE));
 if(closed||!pool.length||got.length>=2){
  s.pending=null;
  finish068(pack,s,spec,got);
  return;
 }
 hold(s,{...spec,step:'removeTwo',data:{got}},[
  ...pool.map(c=>({type:'kmr2',mode:'remove',uid:c.uid})),
  {type:'kmr2',mode:'done'}
 ]);
}
function finish068(pack,s,spec,uids){
 const removed=plOf(s,spec.player).removed;
 const cards=uids.map(uid=>removed.find(c=>c.uid===uid)).filter(Boolean);
 if(!cards.length)return;
 const ids=cards.map(c=>def(pack,c).id);
 const limit=cards.reduce((n,c)=>n+(Number(def(pack,c).bp)||0),0);
 if(!offerRetire(pack,s,spec,limit,true,null)){
  copyTurn(s,selfOf(s,spec.player,spec.sourceUid),ids);
  return;
 }
 if(s.pending?.step==='retire')
  s.pending.data={...(s.pending.data||{}),copyIds:ids};
}
function on068(pack,s,job){
 A.draw(pack,s,job.owner,1,job.sourceUid);
 offer068(pack,s,specOf(job),[],false);
}
function on069(pack,s,job){
 if(job.slot==='onAttack'){
  const pool=plOf(s,job.owner).front.filter(c=>c?.ready&&trait(pack,c,RE));
  offerList(s,specOf(job),'rest',pool,true,'decadeBuff','rest');
  return;
 }
 A.draw(pack,s,job.owner,1,job.sourceUid);
 const pool=handWhere(s,job.owner,c=>def(pack,c).ap===1&&def(pack,c).color==='green'&&trait(pack,c,RE));
 offerEnter(s,specOf(job),pool,{ready:true,from:'hand',optional:true,next:'banEntered'});
}
function on076(pack,s,job){
 onLook(pack,s,job,6,c=>def(pack,c).type==='character'&&def(pack,c).color==='green'&&token(pack,c,'ディケイド',null),
  {where:'bottom',after:'draw1'});
}
function on077(pack,s,job){
 const limit=hasName(pack,s,job.owner,'ディケイド')?5000:3000;
 offerRetire(pack,s,specOf(job),limit,false,null);
}
function on080(pack,s,job){
 if(job.slot==='phase'){
  const self=selfOf(s,job.owner,job.sourceUid);
  if(self)A.retire(pack,s,job.owner,A.location(s,job.owner,self.uid).line,
   A.location(s,job.owner,self.uid).slot,{});
  const pool=zoneWhere(s,job.owner,'outside',c=>{
   const d=def(pack,c);
   if(exact(pack,c,'ジーク',null))return false;
   if(exact(pack,c,PLATFORM,null))return true;
   return d.energy<=1&&d.color==='red'&&trait(pack,c,IMAGIN);
  });
  offerEnter(s,specOf(job),pool,{ready:false,from:'outside',optional:true});
  return;
 }
 onLook(pack,s,job,3,()=>true,{dest:'outside',where:'bottom',reveal:false,takeMode:'outside',max:1});
}
function on082(pack,s,job){
 const pool=handWhere(s,job.owner,c=>def(pack,c).type==='character'&&token(pack,c,'ファイズ',s));
 offerList(s,specOf(job),'discard',pool,true,'lookFaiz','discard');
}
function on084(pack,s,job){
 if(apReady(s,job.owner)<1)return;
 const vent=handWhere(s,job.owner,c=>exact(pack,c,VENT,null));
 if(!vent.length)return;
 hold(s,{...specOf(job),step:'ventPay',data:{}},[
  {type:'kmr2',mode:'skip'},
  ...vent.map(c=>({type:'kmr2',mode:'discard',uid:c.uid}))
 ]);
}
function on088(pack,s,job){
 const vent=handWhere(s,job.owner,c=>exact(pack,c,VENT,null));
 offerList(s,specOf(job),'discard',vent,true,'knightHit','discard');
}
function on093(pack,s,job){
 if(hasName(pack,s,job.owner,'ナイト'))A.draw(pack,s,job.owner,1,job.sourceUid);
}
function on094(pack,s,job){
 if(job.slot==='onRetire'){
  if(!hasName(pack,s,job.owner,'ナイト'))return;
  const targets=oppFront(s,job.owner);
  offerList(s,specOf(job),'rest',targets,true,null,'rest');
  return;
 }
 A.draw(pack,s,job.owner,1,job.sourceUid);
 offerDiscard(s,specOf(job),1,true,'adventCut');
}
function on095(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>token(pack,c,'ナイト',s));
 offerList(s,specOf(job),'triggerSafe',pool,true,null,'own');
}
function on096(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>token(pack,c,'龍騎',s));
 offerList(s,specOf(job),'impact',pool,true,null,'own');
}
function on099(pack,s,job){
 hold(s,{...specOf(job),step:'mode',data:{}},[
  {type:'kmr2',mode:'one',key:'deploy'},
  {type:'kmr2',mode:'two',key:'replay'}
 ]);
}
function on100(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>def(pack,c).type==='character');
 offerList(s,specOf(job),'kit',pool,false,null,'own');
}
function on044(pack,s,job){
 const limit=hasName(pack,s,job.owner,'フォーゼ')?5000:3000;
 offerRetire(pack,s,specOf(job),limit,false,null);
}
function main002(pack,s,job){
 const spec=specOf(job),self=selfOf(s,job.owner,job.sourceUid);
 if(!self)return;
 if(job.mode==='a'){
  if(self.ready||used(s,self.uid+'|002a'))return;
  const food=ownWhere(s,job.owner,c=>exact(pack,c,GO,s));
  if(!food.length)return;
  use(s,self.uid+'|002a');
  offerList(s,spec,'retireOwn',food,false,'activeSelf','retireOwn');
  return;
 }
 if(!frontOf(s,job.owner,self)||used(s,self.uid+'|002b'))return;
 use(s,self.uid+'|002b');
 restCard(s,job.owner,self,self.uid);
 offerList(s,spec,'rest',oppFront(s,job.owner,c=>A.bp(pack,s,c)<=3000),false,null,'rest');
}
function main003(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self)||used(s,self.uid+'|003'))return;
 const food=ownWhere(s,job.owner,c=>c.ready&&exact(pack,c,GO,s));
 if(!food.length)return;
 use(s,self.uid+'|003');
 offerList(s,specOf(job),'rest',food,false,'frontEnergy','rest');
}
function main006(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self)return;
 const spec=specOf(job);
 if(job.mode==='a'){
  if(used(s,self.uid+'|006a')||gochizo(pack,s,job.owner).length<3)return;
  use(s,self.uid+'|006a');
  energyBuff(s,self,true);
  return;
 }
 if(!self.ready)return;
 restCard(s,job.owner,self,self.uid);
 const food=ownWhere(s,job.owner,c=>exact(pack,c,GO,s));
 offerList(s,spec,'retireOwn',food,false,'deployPlain','retireOwn');
}
function main007(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self)||used(s,self.uid+'|007'))return;
 const food=ownWhere(s,job.owner,c=>exact(pack,c,GO,s));
 if(!food.length)return;
 use(s,self.uid+'|007');
 offerList(s,specOf(job),'retireOwn',food,false,'buff2000','retireOwn');
}
function main014(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.ready||!plOf(s,job.owner).hand.length||apReady(s,job.owner)<1)return;
 restCard(s,job.owner,self,self.uid);
 offerDiscard(s,specOf(job),1,false,'payGochizo');
}
function main017(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.ready||used(s,self.uid+'|017'))return;
 const pool=plOf(s,job.owner).front.filter(c=>c?.ready&&def(pack,c).type==='character');
 if(!pool.length)return;
 use(s,self.uid+'|017');
 restCard(s,job.owner,self,self.uid);
 offerList(s,specOf(job),'rest',pool,false,'energyTurn','rest');
}
function main019(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self)||used(s,self.uid+'|019'))return;
 const pool=handWhere(s,job.owner,c=>nonYellowRaid(pack,c));
 if(!pool.length)return;
 use(s,self.uid+'|019');
 offerEnter(s,specOf(job),pool,{ready:true,from:'hand',optional:false,lines:['front']});
}
function main022(pack,s,job){
 if(nameLocked(s,job.owner,PARADOX))return;
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self))return;
 hold(s,{...specOf(job),step:'mode',data:{lock:PARADOX}},[
  {type:'kmr2',mode:'one',key:'tuck'},
  {type:'kmr2',mode:'two',key:'release'}
 ]);
}
function main025(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||used(s,self.uid+'|025'))return;
 const groups=new Map();
 for(const c of plOf(s,job.owner).hand){
  const energy=def(pack,c).energy;
  if(!groups.has(energy))groups.set(energy,[]);
  groups.get(energy).push(c);
 }
 const cards=[...groups.values()].filter(list=>list.length>=3).flat();
 if(!cards.length)return;
 use(s,self.uid+'|025');
 hold(s,{...specOf(job),step:'same',data:{got:[],energy:null,next:'buffDraw'}},
  cards.map(c=>({type:'kmr2',mode:'same',uid:c.uid})));
}
function main040(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.ready)return;
 const pool=ownWhere(s,job.owner,c=>token(pack,c,'フォーゼ',s));
 if(!pool.length)return;
 restCard(s,job.owner,self,self.uid);
 offerList(s,specOf(job),'loseRemove',pool,false,null,'own');
}
function phase040(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 const loc=self&&A.location(s,job.owner,self.uid);
 if(!self||loc?.line!=='energy')return;
 if(!plOf(s,job.owner).front.some(x=>!x))return;
 hold(s,{...specOf(job),step:'shift',data:{line:'front'}},[
  {type:'kmr2',mode:'skip'},{type:'kmr2',mode:'deploy',uid:self.uid}
 ]);
}
function main059(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.ready)return;
 const pool=ownWhere(s,job.owner,c=>c.ready&&def(pack,c).energy<=2&&token(pack,c,'Ｗ',s)&&def(pack,c).type==='character');
 if(!pool.length)return;
 restCard(s,job.owner,self,self.uid);
 offerList(s,specOf(job),'retireOwn',pool,false,'memoryDeploy','retireOwn');
}
function main067(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self)||used(s,self.uid+'|067'))return;
 const pool=zoneWhere(s,job.owner,'outside',c=>trait(pack,c,RE));
 if(!pool.length)return;
 use(s,self.uid+'|067');
 offerList(s,specOf(job),'copy',pool,false,null,'remove');
}
function main085(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||used(s,self.uid+'|085'))return;
 const vent=handWhere(s,job.owner,c=>exact(pack,c,VENT,null));
 if(!vent.length)return;
 use(s,self.uid+'|085');
 offerList(s,specOf(job),'discard',vent,false,'energyAttack','discard');
}
function main089(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self)||used(s,self.uid+'|089'))return;
 if(s.kmr2AdventUsed?.[job.owner]!==s.turn)return;
 const pool=ownWhere(s,job.owner,c=>token(pack,c,'龍騎',s)||trait(pack,c,ADVENT));
 if(!pool.length)return;
 use(s,self.uid+'|089');
 offerList(s,specOf(job),'ready',pool,false,null,'ready');
}
function main097(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.ready)return;
 const pool=ownWhere(s,job.owner,c=>def(pack,c).type==='character');
 if(!pool.length)return;
 restCard(s,job.owner,self,self.uid);
 offerList(s,specOf(job),'buff',pool,false,null,'own');
}
function on019(pack,s,job){
 const pool=zoneWhere(s,job.owner,'outside',c=>nonYellowRaid(pack,c));
 if(!pool.length)return;
 hold(s,{...specOf(job),step:'takeMany',data:{left:pool.map(c=>c.uid),got:[]}},[
  {type:'kmr2',mode:'done'},
  ...pool.map(c=>({type:'kmr2',mode:'hand',uid:c.uid}))
 ]);
}
function on023(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>c.uid!==job.sourceUid&&def(pack,c).energy<=2&&token(pack,c,'エグゼイド',s));
 offerList(s,specOf(job),'tuck',pool,true,'doctor','tuck');
}
function entered028(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.ready)return;
 hold(s,{...specOf(job),step:'payDiscard',data:{entered:job.enteredUid}},[
  {type:'kmr2',mode:'skip'},{type:'kmr2',mode:'pay',key:'do'}
 ]);
}
function removedReact(pack,s,job){
 const pile=plOf(s,job.owner).removed;
 const card=pile.find(c=>c.uid===job.sourceUid);
 if(!card||s.active!==job.owner)return;
 const id=def(pack,card).id;
 const copied=kmr2CopiedIds(card);
 const source=job.causeId||'';
 const as035=id==='KMR-2-035'||copied.includes('KMR-2-035');
 const as030=id==='KMR-2-030'||copied.includes('KMR-2-030');
 const as032=id==='KMR-2-032'||copied.includes('KMR-2-032');
 const selfEffect=source===id||source==='KMR-2-035'&&as035;
 if(as035&&selfEffect){
  askEnter(s,specOf(job),card.uid,false,'removed',false,null);
  return;
 }
 if(as030){askEnter(s,specOf(job),card.uid,false,'removed',false,null);return;}
 if(as032||as035){
  hold(s,{...specOf(job),step:'toHand',data:{uid:card.uid}},[
   {type:'kmr2',mode:'skip'},{type:'kmr2',mode:'hand',uid:card.uid}
  ]);
 }
}
function lost035(pack,s,job){
 if(school(pack,s,job.owner,'フォーゼ').length<3)return;
 const self=selfOf(s,job.owner,job.sourceUid)||plOf(s,job.owner).outside.find(c=>c.uid===job.sourceUid);
 if(self&&A.location(s,job.owner,self.uid))A.remove(pack,s,job.owner,self.uid,job.sourceUid);
 else if(self)moveUid(pack,s,job.owner,'outside',self.uid,'removed',job.sourceUid);
 const other=job.otherUid;
 if(!other)return;
 const preferred=String(other).startsWith('1-')?1:0;
 const who=A.location(s,preferred,other)?preferred:1-preferred;
 if(A.location(s,who,other))A.remove(pack,s,who,other,job.sourceUid);
}
function blocked033(pack,s,job){
 hold(s,{...specOf(job),step:'mayDraw',data:{next:'discard1'}},[
  {type:'kmr2',mode:'skip'},{type:'kmr2',mode:'draw',key:'draw'}
 ]);
}
function blocked039(pack,s,job){
 if(job.slot==='unblocked'){
  if(used(s,job.sourceUid+'|039'))return;
  use(s,job.sourceUid+'|039');
  hold(s,{...specOf(job),step:'mayDraw',data:{}},[
   {type:'kmr2',mode:'skip'},{type:'kmr2',mode:'draw',key:'draw'}
  ]);
  return;
 }
 if(used(s,job.sourceUid+'|039')||school(pack,s,job.owner,'メテオ').length<3)return;
 if(!plOf(s,job.owner).hand.length)return;
 use(s,job.sourceUid+'|039');
 offerDiscard(s,specOf(job),1,true,'meteor');
}
function blocked048(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self?.kmr2BlockActive||self.kmr2BlockActive.turn!==s.turn)return;
 if(used(s,job.sourceUid+'|048b'))return;
 use(s,job.sourceUid+'|048b');
 A.active(s,job.owner,self);
}
function blocked054(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self&&memoryEntry(self,s)){
  hold(s,{...specOf(job),step:'mode',data:{}},[
   {type:'kmr2',mode:'one',key:'top'},{type:'kmr2',mode:'two',key:'draw'}
  ]);
  return;
 }
 const top=plOf(s,job.owner).deck[0];
 if(!top)return;
 hold(s,{...specOf(job),step:'topPlace',data:{uid:top.uid}},[
  {type:'kmr2',mode:'top',uid:top.uid},{type:'kmr2',mode:'bottom',uid:top.uid}
 ]);
}
function blocked079(pack,s,job){
 if(used(s,job.sourceUid+'|079'))return;
 const others=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&
  (trait(pack,c,IMAGIN)||token(pack,c,'電王',s)));
 if(others.length<2)return;
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self)return;
 use(s,job.sourceUid+'|079');
 A.active(s,job.owner,self);
}
function on079(pack,s,job){
 const base=job.baseUid&&plOf(s,job.owner).outside.find(c=>c.uid===job.baseUid);
 if(!base)return;
 askEnter(s,specOf(job),base.uid,false,'outside',true,null);
}
function attackEnd021(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self)return;
 const pool=handWhere(s,job.owner,c=>exact(pack,c,HOPPER,null));
 if(!pool.length)return;
 if(!pool.some(c=>A.raidBase(pack,s,job.owner,self,def(pack,c))))return;
 hold(s,{...specOf(job),step:'raidSelf',data:{base:self.uid}},[
  {type:'kmr2',mode:'skip'},
  ...pool.map(c=>({type:'kmr2',mode:'raid',uid:c.uid}))
 ]);
}
function attackEnd083(pack,s,job){
 const battle=s.kmr2LastBattle;
 if(!battle||battle.turn!==s.turn||battle.attackerUid!==job.sourceUid||!battle.blockerUid)return;
 const blocker=A.location(s,1-job.owner,battle.blockerUid)?.c;
 if(!blocker||A.bp(pack,s,blocker)>3000)return;
 hold(s,{...specOf(job),step:'retire',data:{next:null}},[
  {type:'kmr2',mode:'skip'},
  {type:'kmr2',mode:'retire',uid:blocker.uid}
 ]);
}
function ally008(pack,s,job){
 if(s.kmr2GochizoLeft?.[job.owner]!==s.turn)return;
 if(!plOf(s,job.owner).front.some(x=>!x))return;
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||A.location(s,job.owner,self.uid)?.line!=='energy')return;
 if(!plOf(s,job.owner).hand.length)return;
 offerDiscard(s,specOf(job),1,true,'shiftFront');
}
function faceUpRaidCard(c){
 return (c?.stack||[]).some(layer=>layer&&layer.faceDown!==true);
}
function win019(pack,s,job){
 const unit=selfOf(s,job.owner,job.sourceUid);
 if(!unit||def(pack,unit).color==='yellow')return;
 if(!fieldCards(s,job.owner).some(c=>c&&def(pack,c).id==='KMR-2-019'&&live(s,c)&&
  (!raidBoxListed('KMR-2-019','phase')||faceUpRaidCard(c))))return;
 hold(s,{...specOf(job),step:'mayDraw',data:{}},[
  {type:'kmr2',mode:'skip'},{type:'kmr2',mode:'draw',key:'draw'}
 ]);
}
function on030(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self)return;
 const targets=oppFront(s,job.owner);
 offerList(s,specOf(job),'removeTrio',targets,true,null,'remove');
}
function on012(pack,s,job){deployGochizo(pack,s,job,false);}
function on011(pack,s,job){onLook(pack,s,job,3,gavFilter,{where:'bottom',discard:true});}
function on041(pack,s,job){
 onLook(pack,s,job,3,c=>trait(pack,c,SCHOOL),{where:'bottom',after:'schoolDiscard'});
}
function settleP003(pack,s,spec,uids,takenUid){
 const pl=plOf(s,spec.player);
 let discard=false;
 if(takenUid){
  if(!uids.includes(takenUid))throw Error('Kamen Rider promo look lost a card');
  const index=pl.deck.findIndex(c=>c.uid===takenUid);
  if(index<0)throw Error('Kamen Rider promo look lost a card');
  const physical=pl.deck[index];
  discard=exact(pack,physical,GO,null);
  A.reveal(pack,s,spec.player,physical);
  A.move(pack,s,{owner:spec.player,from:'deck',to:'hand',index,reason:'own-effect',sourceUid:spec.sourceUid});
 }
 s.kmrPrChain={discard};
 const left=uids.filter(uid=>uid!==takenUid);
 if(offerOrder(s,spec,left,'bottom','pr003Discard'))return;
 finishPr003(s,spec);
}
function openP003Pick(pack,s,spec,uids,yellow){
 const pl=plOf(s,spec.player);
 const window=uids.map(uid=>pl.deck.find(c=>c.uid===uid)).filter(Boolean);
 const matches=window.filter(c=>yellow?def(pack,c).type==='character'&&def(pack,c).color==='yellow':exact(pack,c,GO,null));
 const foods=yellow?[]:ownWhere(s,spec.player,c=>exact(pack,c,GO,s));
 hold(s,{...spec,step:'pr003Pick',data:{uids:window.map(c=>c.uid),yellow:yellow===true}},[
  {type:'kmr2',mode:'done'},
  ...matches.map(c=>({type:'kmr2',mode:'take',uid:c.uid})),
  ...(foods.length?[{type:'kmr2',mode:'switch'}]:[])
 ]);
}
function onP003(pack,s,job){
 const window=windowCards(s,job.owner,5);
 if(!window.length)return;
 openP003Pick(pack,s,specOf(job),window.map(c=>c.uid),false);
}
function onP004(pack,s,job){
 const pool=ownWhere(s,job.owner,c=>trait(pack,c,RE));
 if(!pool.length)return;
 offerList(s,specOf(job),'pr004Bounce',pool,true,null,'bounce');
}
function onP005(pack,s,job){
 const outside=plOf(s,job.owner).outside;
 if(!outside.length)return;
 const matches=outside.filter(c=>String(def(pack,c).name||'').includes('サバイブ'));
 hold(s,{...specOf(job),step:'outsideTop',data:{uids:outside.map(c=>c.uid),zone:'outside'}},[
  {type:'kmr2',mode:'done'},
  ...matches.map(c=>({type:'kmr2',mode:'deckTop',uid:c.uid}))
 ]);
}
function mainP005(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||!frontOf(s,job.owner,self)||used(s,self.uid+'|P005'))return;
 use(s,self.uid+'|P005');
 if(ownWhere(s,job.owner,c=>def(pack,c).type==='character'&&token(pack,c,'ナイト',s)).length)
  A.draw(pack,s,job.owner,1,job.sourceUid);
 if(!ownWhere(s,job.owner,c=>exact(pack,c,'仮面ライダーナイトサバイブ',s)&&faceUpRaidCard(c)).length)return;
 const pool=handWhere(s,job.owner,c=>exact(pack,c,'仮面ライダー龍騎サバイブ',null))
  .filter(c=>A.raidBase(pack,s,job.owner,self,def(pack,c)));
 if(!pool.length)return;
 hold(s,{...specOf(job),step:'raidSelf',data:{base:self.uid}},[
  {type:'kmr2',mode:'skip'},
  ...pool.map(c=>({type:'kmr2',mode:'raid',uid:c.uid}))
 ]);
}
function on086(pack,s,job){onLook(pack,s,job,2,riderFilter,{dest:'outside',where:'top',reveal:false,takeMode:'outside'});}
function on087(pack,s,job){onLook(pack,s,job,3,riderFilter,{where:'bottom',discard:true});}
function on089(pack,s,job){onLook(pack,s,job,6,c=>trait(pack,c,ADVENT),{where:'bottom'});}

const HANDLERS={
 'KMR-2-001|onPlay':on001,'KMR-2-002|main':main002,'KMR-2-003|main':main003,
 'KMR-2-004|onPlay':on004,'KMR-2-005|onPlay':recoverGochizo,'KMR-2-005|onAttack':recoverGochizo,
 'KMR-2-005|attackEnd':(p,s,j)=>attackEndSwap(p,s,j,MASTER),'KMR-2-006|main':main006,
 'KMR-2-007|main':main007,'KMR-2-008|allyAttackEnd':ally008,'KMR-2-011|onPlay':on011,
 'KMR-2-012|onPlay':on012,'KMR-2-012|onAttack':on012,
 'KMR-2-012|attackEnd':(p,s,j)=>attackEndSwap(p,s,j,OVER),
 'KMR-2-013|onPlay':on013,'KMR-2-013|onRetire':(p,s,j)=>A.draw(p,s,j.owner,1,j.sourceUid),
 'KMR-2-014|main':main014,'KMR-2-015|onPlay':on015,'KMR-2-017|main':main017,
 'KMR-2-018|onPlay':on018,'KMR-2-019|onPlay':on019,'KMR-2-019|main':main019,'KMR-2-019|win':win019,
 'KMR-2-021|onPlay':on021,'KMR-2-021|attackEnd':attackEnd021,'KMR-2-022|main':main022,
 'KMR-2-023|onPlay':on023,'KMR-2-024|onPlay':on024,'KMR-2-024|onRetire':on024,
 'KMR-2-025|onPlay':on025,'KMR-2-025|main':main025,'KMR-2-026|onPlay':on026,
 'KMR-2-028|entered':entered028,'KMR-2-030|onAttack':on030,'KMR-2-030|removed':removedReact,
 'KMR-2-032|removed':removedReact,'KMR-2-033|blocked':blocked033,'KMR-2-034|onPlay':on034,
 'KMR-2-035|removed':removedReact,'KMR-2-035|lost':lost035,'KMR-2-039|blocked':blocked039,
 'KMR-2-039|unblocked':blocked039,'KMR-2-040|main':main040,'KMR-2-040|phase':phase040,
 'KMR-2-041|onPlay':on041,'KMR-2-042|onPlay':on042,'KMR-2-044|onPlay':on044,
 'KMR-2-046|onPlay':on046,'KMR-2-048|onPlay':on048,'KMR-2-048|blocked':blocked048,
 'KMR-2-049|onPlay':on049,'KMR-2-052|onPlay':on052,'KMR-2-054|blocked':blocked054,
 'KMR-2-055|onPlay':on055,'KMR-2-055|onAttack':on055,'KMR-2-056|onPlay':on056,
 'KMR-2-057|onPlay':on057,'KMR-2-058|onPlay':on058,'KMR-2-059|main':main059,
 'KMR-2-060|onPlay':on060,'KMR-2-061|onPlay':on061,'KMR-2-063|onPlay':on063,
 'KMR-2-065|onPlay':on065,'KMR-2-067|main':main067,'KMR-2-067|removed':removedReact,
 'KMR-2-068|onPlay':on068,'KMR-2-068|removed':removedReact,'KMR-2-069|onPlay':on069,
 'KMR-2-069|onAttack':on069,'KMR-2-076|onPlay':on076,'KMR-2-077|onPlay':on077,
 'KMR-2-079|onRetire':on079,'KMR-2-079|blocked':blocked079,'KMR-2-080|onPlay':on080,
 'KMR-2-080|phase':on080,'KMR-2-082|onPlay':on082,'KMR-2-083|attackEnd':attackEnd083,
 'KMR-2-084|onPlay':on084,'KMR-2-085|main':main085,'KMR-2-086|onPlay':on086,
 'KMR-2-087|onPlay':on087,'KMR-2-088|onAttack':on088,'KMR-2-089|onPlay':on089,
 'KMR-2-089|main':main089,'KMR-2-093|onPlay':on093,'KMR-2-094|onPlay':on094,
 'KMR-2-094|onRetire':on094,'KMR-2-095|onPlay':on095,'KMR-2-096|onPlay':on096,
 'KMR-2-097|main':main097,'KMR-2-099|onPlay':on099,'KMR-2-100|onPlay':on100,
 'KMR-P-003|onPlay':onP003,'KMR-P-004|onPlay':onP004,
 'KMR-P-005|onPlay':onP005,'KMR-P-005|main':mainP005
};

function resolveStep(pack,s,q,a){
 const spec=specOf(q);
 const hit=takeAction(q,a);
 if(q.step==='lookPick'){
  const data=q.data;
  if(hit.mode===data.takeMode||hit.mode==='take'||hit.mode==='outside'){
   if(data.taken.includes(hit.uid)||data.taken.length>=data.max)throw Error('Illegal look take');
   data.taken.push(hit.uid);
   if(data.taken.length<data.max){
    const window=data.uids.map(uid=>plOf(s,q.player).deck.find(c=>c.uid===uid)).filter(Boolean);
    hold(s,{...spec,step:'lookPick',data},[
     {type:'kmr2',mode:'done'},
     ...window.filter(c=>!data.taken.includes(c.uid)&&
      (data.takeMode==='outside'?true:true)).map(c=>({type:'kmr2',mode:data.takeMode,uid:c.uid}))
    ]);
    return;
   }
  }
  s.pending=null;
  const next=finishLook(pack,s,spec,data);
  if(next==='held')return;
  follow(pack,s,spec,next);
  return;
 }
 if(q.step==='lookOrder'){
  const data=q.data;
  data.built.push(hit.uid);
  data.left=data.left.filter(uid=>uid!==hit.uid);
  if(data.left.length){
   hold(s,{...spec,step:'lookOrder',data},data.left.map(uid=>({type:'kmr2',mode:'next',uid})));
   return;
  }
  lay(plOf(s,q.player),data.built,data.where);
  s.pending=null;
  follow(pack,s,spec,data.after);
  return;
 }
 if(q.step==='discard'){
  if(hit.mode==='skip'){s.pending=null;return;}
  discard(pack,s,q.player,hit.uid,q.sourceUid);
  q.data.got.push(hit.uid);
  if(q.data.got.length<q.data.need){
   hold(s,{...spec,step:'discard',data:q.data},plOf(s,q.player).hand.map(c=>({type:'kmr2',mode:'discard',uid:c.uid})));
   return;
  }
  s.pending=null;
  const next=q.data.next;
  if(next==='lookFaiz')onLook(pack,s,{...q,owner:q.player},4,c=>def(pack,c).type==='character',{where:'bottom'});
  else if(next==='payGochizo'){
   if(pay(s,q.player,1,q.sourceUid)){
    const pool=zoneWhere(s,q.player,'outside',c=>exact(pack,c,GO,s));
    offerEnter(s,spec,pool,{ready:true,from:'outside',optional:true,lines:['energy']});
   }
  }else if(next==='adventCut'){
   s.kmr2NextAdventAp??={};
   s.kmr2NextAdventAp[q.player]=s.turn;
  }else if(next==='activeEntered'){
   const entered=q.data?.entered&&selfOf(s,q.player,q.data.entered);
   if(entered)A.active(s,q.player,entered);
   const watcher=selfOf(s,q.player,q.sourceUid);
   if(watcher)retireUid(pack,s,q.player,watcher.uid);
  }
  else if(next==='knightHit'){A.draw(pack,s,q.player,1,q.sourceUid);buff(s,selfOf(s,q.player,q.sourceUid),1500);}
  else if(next==='energyAttack'){
   const c=selfOf(s,q.player,q.sourceUid);
   if(c){buff(s,c,1000);c.kmr2EnergyAttack={turn:s.turn,stamp:c.fieldEntryStamp};}
  }else if(next==='meteor'){
   const c=selfOf(s,q.player,q.sourceUid);
   if(c){A.active(s,q.player,c);c.attackDamageGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:2};}
  }else if(next==='shiftFront')A.shift(pack,s,q.player,q.sourceUid,'front','own-effect',q.sourceUid);
  else follow(pack,s,spec,next);
  return;
 }
 if(q.step==='rest'||q.step==='retireOwn'||q.step==='ready'||q.step==='own'||
  q.step==='buff'||q.step==='block'||q.step==='impact'||q.step==='triggerSafe'||
  q.step==='kit'||q.step==='loseRemove'||q.step==='energyPick'||q.step==='tuck'||
  q.step==='remove'||q.step==='copy'||q.step==='toEnergy'||q.step==='removeTrio'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const owner=hit.uid&&hit.uid[0]==='1'&&q.player===0?1:q.player;
  const foe=hit.uid&&String(hit.uid).startsWith((1-q.player)+'-')?1-q.player:q.player;
  const who=q.step==='toEnergy'||q.step==='removeTrio'?foe:q.player;
  const c=fieldCards(s,who).find(x=>x.uid===hit.uid)||plOf(s,who).hand.find(x=>x.uid===hit.uid)||
   plOf(s,who).outside.find(x=>x.uid===hit.uid);
  if(q.step==='rest'&&c)restCard(s,who,c,q.sourceUid);
  if(q.step==='retireOwn'&&c)retireUid(pack,s,q.player,c.uid);
  if(q.step==='ready'&&c)A.active(s,q.player,c);
  if(q.step==='buff'&&c)buff(s,c,q.data?.bp||1000);
  if(q.step==='block'&&c)c.kmr2Block={turn:s.turn,stamp:c.fieldEntryStamp,relation:'atLeast',bp:4000,sourceUid:q.sourceUid};
  if(q.step==='impact'&&c)grantImpact(s,c);
  if(q.step==='triggerSafe'&&c)c.kmr2TriggerImmune={turn:s.turn,stamp:c.fieldEntryStamp,sourceUid:q.sourceUid};
  if(q.step==='kit'&&c){
   buff(s,c,2500);
   c.kmr2WinDraw={turn:s.turn,stamp:c.fieldEntryStamp,sourceUid:q.sourceUid};
   if(token(pack,c,'龍騎',s))c.kmr2Sniper={turn:s.turn,stamp:c.fieldEntryStamp,sourceUid:q.sourceUid};
  }
  if(q.step==='loseRemove'&&c)c.kmr2LoseRemove={turn:s.turn,stamp:c.fieldEntryStamp,sourceUid:q.sourceUid};
  if(q.step==='energyPick'&&c){
   const energy=def(pack,c).energy;
   const pool=handWhere(s,q.player,x=>def(pack,x).energy===energy&&def(pack,x).ap===1&&trait(pack,x,SCHOOL));
   offerEnter(s,spec,pool,{ready:false,from:'hand',optional:true});
   }
  if(q.step==='tuck'&&c){
   A.tuck(pack,s,q.player,q.sourceUid,c.uid,q.sourceUid);
   for(const layer of [...(c.under||[])].filter(x=>x?.faceDown))A.tuck(pack,s,q.player,q.sourceUid,layer.uid,q.sourceUid);
   A.draw(pack,s,q.player,1,q.sourceUid);
   const doctor=handWhere(s,q.player,x=>def(pack,x).energy<=2&&def(pack,x).ap===1&&trait(pack,x,DOCTOR));
   offerEnter(s,spec,doctor,{ready:false,from:'hand',optional:true});
  }
  if(q.step==='remove'&&c){
   const loc=A.location(s,q.player,c.uid);
   if(loc)A.remove(pack,s,q.player,c.uid,q.sourceUid);
   else moveUid(pack,s,q.player,'outside',c.uid,'removed',q.sourceUid);
  }
  if(q.step==='copy'&&c){
   moveUid(pack,s,q.player,'outside',c.uid,'removed',q.sourceUid);
   const host=selfOf(s,q.player,q.sourceUid);
   copyTurn(s,host,[def(pack,c).id]);
  }
  if(q.step==='toEnergy'&&c){
   A.shift(pack,s,who,c.uid,'energy','opponent-effect',q.sourceUid);
   silenceUntil(s,q.player,q.sourceUid,c.uid);
  }
  if(q.step==='removeTrio'){
   const self=selfOf(s,q.player,q.sourceUid);
   const base=self?.stack?.[0];
   if(c)A.remove(pack,s,who,c.uid,q.sourceUid);
   if(self)A.remove(pack,s,q.player,self.uid,q.sourceUid);
   if(base){
    const loc=A.location(s,q.player,base.uid);
    if(loc)A.remove(pack,s,q.player,base.uid,q.sourceUid);
   }
   s.kmr2EndAttack=q.sourceUid;
  }
  const next=q.data?.next;
  if(next==='activeSelf')follow(pack,s,spec,'activeSelf');
  else if(next==='frontEnergy')follow(pack,s,spec,'frontEnergy');
  else if(next==='buff2000')follow(pack,s,spec,'buff2000');
  else if(next==='energyTurn')follow(pack,s,spec,'energyTurn');
  else if(next==='draw1')follow(pack,s,spec,'draw1');
  else if(next==='fang'){const self=selfOf(s,q.player,q.sourceUid);if(self){A.active(s,q.player,self);buff(s,self,500);}}
  else if(next==='decadeBuff'){
   const self=selfOf(s,q.player,q.sourceUid);
   if(self){buff(s,self,3000);self.kmr2UnblockedDraw={turn:s.turn,stamp:self.fieldEntryStamp};}
  }else if(next==='deployPlain'){
   const pool=handWhere(s,q.player,x=>def(pack,x).type==='character'&&def(pack,x).color==='yellow'&&
    def(pack,x).energy<=1&&(def(pack,x).traits||[]).length===0);
   offerEnter(s,spec,pool,{ready:false,from:'hand',optional:true});
  }else if(next==='memoryDeploy'){
   const retiredName=c?def(pack,c).name:'';
   A.draw(pack,s,q.player,1,q.sourceUid);
   const pool=handWhere(s,q.player,x=>def(pack,x).name!==retiredName&&def(pack,x).energy<=2&&
    def(pack,x).color==='green'&&token(pack,x,'Ｗ',s)&&def(pack,x).type==='character');
   offerEnter(s,spec,pool,{ready:true,from:'hand',optional:true});
  }else if(next==='ankhHand'){
   const pool=zoneWhere(s,q.player,'outside',x=>exact(pack,x,'アンク',s)&&energyPrinted(pack,x)===0);
   offerList(s,spec,'hand',pool,true,null,'hand');
  }else if(next==='readyAp')follow(pack,s,spec,'readyAp');
  void owner;
  return;
 }
 if(q.step==='retire'){
  s.pending=null;
  if(hit.mode!=='skip'){
   const foe=1-q.player;
   const slot=plOf(s,foe).front.findIndex(c=>c?.uid===hit.uid);
   if(slot>=0)A.retire(pack,s,foe,'front',slot,{by:'opponent'});
   if(q.data?.next==='recoverBp'){
    const retired=plOf(s,foe).outside.find(c=>c.uid===hit.uid);
    const bp=retired?def(pack,retired).bp:null;
    const pool=bp==null?[]:zoneWhere(s,q.player,'outside',c=>def(pack,c).type==='character'&&def(pack,c).bp===bp);
    offerList(s,spec,'hand',pool,true,null,'hand');
   }
  }
  if(Array.isArray(q.data?.copyIds)&&q.data.copyIds.length)
   copyTurn(s,selfOf(s,q.player,q.sourceUid),q.data.copyIds);
  return;
 }
 if(q.step==='removeTwo'){
  const got=[...(q.data?.got||[])];
  if(hit.mode==='done'||hit.mode==='skip'){
   offer068(pack,s,spec,got,true);
   return;
  }
  if(!plOf(s,q.player).hand.some(c=>c.uid===hit.uid&&trait(pack,c,RE)))
   throw Error('Kamen Rider vol.2 remove lost a card');
  moveUid(pack,s,q.player,'hand',hit.uid,'removed',q.sourceUid);
  got.push(hit.uid);
  offer068(pack,s,spec,got,false);
  return;
 }
 if(q.step==='hand'||q.step==='toHand'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const from=q.step==='toHand'?'removed':'outside';
  moveUid(pack,s,q.player,from,hit.uid,'hand',q.sourceUid);
  if(q.data?.next==='ankhHand')follow(pack,s,{...spec},null);
  return;
 }
 if(q.step==='takeTwo'){
  if(hit.mode==='skip'||hit.mode==='done'){s.pending=null;return;}
  q.data??={got:[]};
  q.data.got.push(hit.uid);
  moveUid(pack,s,q.player,'outside',hit.uid,'hand',q.sourceUid);
  if(q.data.got.length<2){
   const rest=zoneWhere(s,q.player,'outside',c=>energyPrinted(pack,c)===0&&(def(pack,c).type==='field'||
    def(pack,c).type==='event'||(def(pack,c).type==='character'&&token(pack,c,'オーズ',s))));
   if(!rest.length){s.pending=null;return;}
   hold(s,{...spec,step:'takeTwo',data:q.data},[
    {type:'kmr2',mode:'done'},...rest.map(c=>({type:'kmr2',mode:'hand',uid:c.uid}))
   ]);
   return;
  }
  s.pending=null;
  offerDiscard(s,spec,1,false,null);
  return;
 }
 if(q.step==='takeMany'){
  if(hit.mode==='done'||hit.mode==='skip'){s.pending=null;return;}
  moveUid(pack,s,q.player,'outside',hit.uid,'hand',q.sourceUid);
  const rest=(q.data.left||[]).filter(uid=>uid!==hit.uid&&plOf(s,q.player).outside.some(c=>c.uid===uid));
  if(!rest.length){s.pending=null;return;}
  hold(s,{...spec,step:'takeMany',data:{left:rest,got:[...(q.data.got||[]),hit.uid]}},[
   {type:'kmr2',mode:'done'},...rest.map(uid=>({type:'kmr2',mode:'hand',uid}))
  ]);
  return;
 }
 if(q.step==='outside'||q.step==='removed'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const from=q.step==='removed'?'removed':'outside';
  const to=q.step==='removed'?'removed':'outside';
  const src=q.step==='removed'?'outside':'removed';
  moveUid(pack,s,q.player,src,hit.uid,to,q.sourceUid);
  follow(pack,s,spec,q.data?.next);
  return;
 }
 if(q.step==='enter'){
  s.pending=null;
  doEnter(pack,s,q.player,hit,q.sourceUid);
  if(q.data?.next==='banEntered'){
   const entered=selfOf(s,q.player,hit.uid);
   if(entered)banAttack(s,q.player,q.sourceUid,entered.uid);
  }
  if(q.data?.next==='secondEnter'&&q.data.also)askEnter(s,spec,q.data.also,false,'hand',false,null);
  if(q.data?.next==='removeSelf')moveUid(pack,s,q.player,'outside',q.sourceUid,'removed',q.sourceUid);
  if(q.data?.next==='deployMore'){
   const from=q.data.deployFrom||'hand';
   const left=(q.data.deployLeft||[]).filter(uid=>plOf(s,q.player)[from].some(c=>c.uid===uid));
   if(q.data.deployGot<q.data.deployMax&&left.length){
    const stop=q.data.deployStop!==false;
    hold(s,{...spec,step:'deployPick',data:{
     left,got:q.data.deployGot,max:q.data.deployMax,ready:q.data.deployReady,
     from,lines:q.data.deployLines||null,skipOnPlay:q.data.deploySkip===true,
     next:q.data.deployNext||null,lock:null,stop
    }},[...(stop?[{type:'kmr2',mode:'done'}]:[]),...left.map(uid=>({type:'kmr2',mode:'deploy',uid}))]);
   }
   else if(q.data.deployNext==='removeSelf')
    moveUid(pack,s,q.player,'outside',q.sourceUid,'removed',q.sourceUid);
  }
  return;
 }
 if(q.step==='deployPick'){
  if(hit.mode==='done'||hit.mode==='skip'){
   s.pending=null;
   if(q.data?.next==='removeSelf')
    moveUid(pack,s,q.player,'outside',q.sourceUid,'removed',q.sourceUid);
   return;
  }
  if(q.data?.lock)nameLock(s,q.player,q.data.lock);
  const left=(q.data.left||[]).filter(uid=>uid!==hit.uid);
  const got=(q.data.got||0)+1;
  const chain=got<(q.data.max||1);
  const carried=chain?{
   deployLeft:left,deployGot:got,deployMax:q.data.max,deployReady:q.data.ready,
   deployFrom:q.data.from,deployLines:q.data.lines,deploySkip:q.data.skipOnPlay,
   deployNext:q.data.next,deployStop:q.data.stop!==false
  }:{};
  const next=chain?'deployMore':(q.data.next||null);
  const placed=askEnter(s,{...spec,data:carried},hit.uid,q.data.ready===true,q.data.from||'hand',
   q.data.skipOnPlay===true,next,q.data.lines);
  if(!placed){
   s.pending=null;
   if(q.data?.next==='removeSelf')
    moveUid(pack,s,q.player,'outside',q.sourceUid,'removed',q.sourceUid);
  }
  return;
 }
 if(q.step==='mode'){
  s.pending=null;
  if(hit.mode==='done'||hit.mode==='skip')return;
  if(hit.key==='draw'){
   A.draw(pack,s,q.player,1,q.sourceUid);
   if(q.id==='KMR-2-018')offerDiscard(s,spec,1,false,null);
  }else if(hit.key==='raid'){
   const pool=handWhere(s,q.player,c=>def(pack,c).type==='character'&&def(pack,c).bp<=4000&&
    def(pack,c).raidName&&def(pack,c).color!=='yellow');
   offerList(s,spec,'revealHand',pool,true,'draw2discard','reveal');
  }else if(hit.key==='look'&&q.id==='KMR-2-048'){
   onLook(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id},5,c=>exact(pack,c,MEM,null),{where:'bottom',discard:true});
  }else if(hit.key==='pay'&&q.id==='KMR-2-048'){
   if(pay(s,q.player,1,q.sourceUid)){
    const c=selfOf(s,q.player,q.sourceUid);
    if(c)c.kmr2BlockActive={turn:s.turn,stamp:c.fieldEntryStamp};
   }
  }else if(hit.key==='look'&&q.id==='KMR-2-057'){
   onLook(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id},3,()=>true,{where:'top',max:1});
  }else if(hit.key==='tuck'){
   nameLock(s,q.player,q.data?.lock||PARADOX);
   A.draw(pack,s,q.player,1,q.sourceUid);
   offerList(s,spec,'tuck022Hand',plOf(s,q.player).hand,false,null,'tuck');
  }else if(hit.key==='release'){
   nameLock(s,q.player,q.data?.lock||PARADOX);
   const layers=fieldCards(s,q.player).flatMap(c=>(c.under||[]).filter(x=>x?.faceDown).map(x=>({host:c,layer:x})));
   if(layers.length<3)return;
   hold(s,{...spec,step:'release3',data:{got:[],need:3}},layers.map(x=>({type:'kmr2',mode:'outside',uid:x.layer.uid})));
  }else if(hit.key==='top')blocked054(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id,slot:'plain'});
  else if(hit.key==='deploy'){
   A.draw(pack,s,q.player,1,q.sourceUid);
   offerDiscard(s,spec,1,false,'mirror');
  }else if(hit.key==='replay'){
   const pool=ownWhere(s,q.player,c=>trait(pack,c,MIRROR));
   offerList(s,spec,'replay',pool,true,'readyAp','own');
  }
  return;
 }
 if(q.step==='mayDraw'){
  s.pending=null;
  if(hit.mode==='skip')return;
  A.draw(pack,s,q.player,1,q.sourceUid);
  follow(pack,s,spec,q.data?.next);
  return;
 }
 if(q.step==='topPlace'){
  s.pending=null;
  const top=plOf(s,q.player).deck[0];
  if(top&&top.uid===hit.uid&&hit.mode==='bottom'){
   plOf(s,q.player).deck.shift();
   plOf(s,q.player).deck.push(top);
  }
  return;
 }
 if(q.step==='pickFront'){
  s.pending=null;
  const chooser=q.data.chooser;
  hold(s,{...spec,player:chooser,step:'oppDeck',data:{uid:hit.uid,actor:q.data.actor}},[
   {type:'kmr2',mode:'top',uid:hit.uid},{type:'kmr2',mode:'bottom',uid:hit.uid}
  ]);
  return;
 }
 if(q.step==='oppDeck'){
  s.pending=null;
  const owner=Number(String(hit.uid).split('-')[0]);
  A.toDeck(pack,s,owner,hit.uid,q.sourceUid,hit.mode==='top'?'top':'bottom');
  return;
 }
 if(q.step==='swapPartner'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const food=ownWhere(s,q.player,c=>exact(pack,c,GO,s));
  if(!food.length)return;
  A.reveal(pack,s,q.player,plOf(s,q.player).hand.find(c=>c.uid===hit.uid));
  hold(s,{...spec,step:'swapFood',data:{reveal:hit.uid,base:q.data.base}},
   food.map(c=>({type:'kmr2',mode:'retireOwn',uid:c.uid})));
  return;
 }
 if(q.step==='swapFood'){
  s.pending=null;
  retireUid(pack,s,q.player,hit.uid);
  const self=selfOf(s,q.player,q.sourceUid);
  const baseUid=q.data.base;
  if(self){
   const stripped=A.strip(pack,s,q.player,self.uid);
   if(stripped){
    const index=plOf(s,q.player).outside.findIndex(c=>c.uid===stripped.uid);
    if(index>=0)A.move(pack,s,{owner:q.player,from:'outside',to:'hand',index,reason:'own-effect',sourceUid:q.sourceUid});
   }
  }
  raidFromHand(pack,s,q.player,q.data.reveal,baseUid,q.sourceUid);
  return;
 }
 if(q.step==='payLife'){
  s.pending=null;
  if(hit.mode==='skip')return;
  discard(pack,s,q.player,hit.uid,q.sourceUid);
  const life=plOf(s,q.player).life;
  if(!life.length)return;
  hold(s,{...spec,step:'lifeOut',data:{}},life.map(c=>({type:'kmr2',mode:'life',uid:c.uid})));
  return;
 }
 if(q.step==='lifeOut'){
  s.pending=null;
  moveUid(pack,s,q.player,'life',hit.uid,'outside',q.sourceUid);
  A.draw(pack,s,q.player,2,q.sourceUid);
  const c=selfOf(s,q.player,q.sourceUid);if(c)A.active(s,q.player,c);
  return;
 }
 if(q.step==='ventPay'){
  s.pending=null;
  if(hit.mode==='skip')return;
  if(!pay(s,q.player,1,q.sourceUid))return;
  discard(pack,s,q.player,hit.uid,q.sourceUid);
  offerRetire(pack,s,spec,5000,true,'recoverBp');
  return;
 }
 if(q.step==='revealHand'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const card=plOf(s,q.player).hand.find(c=>c.uid===hit.uid);
  if(card)A.reveal(pack,s,q.player,card);
  A.draw(pack,s,q.player,2,q.sourceUid);
  offerDiscard(s,spec,1,false,null);
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
   hold(s,{...spec,step:'same',data:q.data},rest.map(c=>({type:'kmr2',mode:'same',uid:c.uid})));
   return;
  }
  s.pending=null;
  const pool=ownWhere(s,q.player,c=>def(pack,c).type==='character');
  s.kmrMainEndDraw={owner:q.player,turn:s.turn,count:3,sourceUid:q.sourceUid};
  offerList(s,spec,'buff',pool,true,null,'own');
  return;
 }
 if(q.step==='release3'){
  const host=fieldCards(s,q.player).find(c=>(c.under||[]).some(x=>x.uid===hit.uid));
  const layer=host&&host.under.find(x=>x.uid===hit.uid);
  if(host&&layer){
   host.under=host.under.filter(x=>x!==layer);
   layer.faceDown=false;
   plOf(s,q.player).outside.push(layer);
   A.record(pack,s,{physical:layer,owner:q.player,from:'raid-under',to:'outside',reason:'own-effect',sourceUid:q.sourceUid});
  }
  q.data.got.push(hit.uid);
  if(q.data.got.length<3){
   const layers=fieldCards(s,q.player).flatMap(c=>(c.under||[]).filter(x=>x?.faceDown&&!q.data.got.includes(x.uid)));
   if(layers.length+q.data.got.length<3){s.pending=null;return;}
   hold(s,{...spec,step:'release3',data:q.data},layers.map(x=>({type:'kmr2',mode:'outside',uid:x.uid})));
   return;
  }
  s.pending=null;
  const pool=[selfOf(s,q.player,q.sourceUid),...ownWhere(s,q.player,c=>token(pack,c,'エグゼイド',s))].filter(Boolean);
  offerList(s,spec,'impact',pool,true,null,'own');
  return;
 }
 if(q.step==='raidSelf'){
  s.pending=null;
  if(hit.mode==='skip')return;
  raidFromHand(pack,s,q.player,hit.uid,q.data.base,q.sourceUid);
  return;
 }
 if(q.step==='shift'){
  s.pending=null;
  if(hit.mode==='skip')return;
  A.shift(pack,s,q.player,hit.uid,q.data.line,'own-effect',q.sourceUid);
  return;
 }
 if(q.step==='payDiscard'){
  s.pending=null;
  if(hit.mode==='skip')return;
  const self=selfOf(s,q.player,q.sourceUid);
  if(!self?.ready||!plOf(s,q.player).hand.length)return;
  offerDiscard(s,spec,1,false,'activeEntered',{entered:q.data?.entered||null});
  return;
 }
 if(q.step==='tuck022Hand'){
  if(!plOf(s,q.player).hand.some(c=>c.uid===hit.uid))throw Error('KMR-2-022 hand card missing');
  const hosts=fieldCards(s,q.player).filter(c=>c.uid===q.sourceUid||
   (def(pack,c).type==='character'&&token(pack,c,'エグゼイド',s)));
  hold(s,{...spec,step:'tuck022Host',data:{handUid:hit.uid}},
   hosts.map(c=>({type:'kmr2',mode:'under',uid:c.uid})));
  return;
 }
 if(q.step==='tuck022Host'){
  s.pending=null;
  const host=fieldCards(s,q.player).find(c=>c.uid===hit.uid);
  const index=plOf(s,q.player).hand.findIndex(c=>c.uid===q.data.handUid);
  if(!host||index<0)throw Error('KMR-2-022 tuck host or card missing');
  const physical=plOf(s,q.player).hand.splice(index,1)[0];
  physical.faceDown=true;physical.ready=false;physical.fieldEntryStamp=null;
  host.under??=[];host.under.push(physical);
  A.record(pack,s,{physical,owner:q.player,from:'hand',to:'raid-under',
   reason:'own-effect',sourceUid:q.sourceUid});
  return;
 }
 if(q.step==='replay'){
  s.pending=null;
  if(hit.mode==='skip'){A.readyAp(plOf(s,q.player));return;}
  const c=fieldCards(s,q.player).find(x=>x.uid===hit.uid);
  if(c){
   const jobs=A.programs(pack,s,c,'onPlay',q.player,'handEffect',q.sourceUid)||[];
   if(jobs.length)s.effectQueue.unshift(...jobs);
  }
  A.readyAp(plOf(s,q.player));
  return;
 }
 if(q.step==='pr003Pick'){
  if(hit.mode==='switch'){
   const foods=ownWhere(s,q.player,c=>exact(pack,c,GO,s));
   if(!foods.length){openP003Pick(pack,s,spec,q.data.uids,false);return;}
   hold(s,{...spec,step:'pr003Retire',data:{uids:q.data.uids}},[
    {type:'kmr2',mode:'skip'},
    ...foods.map(c=>({type:'kmr2',mode:'retireFood',uid:c.uid}))
   ]);
   return;
  }
  s.pending=null;
  settleP003(pack,s,spec,q.data.uids,hit.mode==='take'?hit.uid:null);
  return;
 }
 if(q.step==='pr003Retire'){
  s.pending=null;
  let yellow=false;
  if(hit.mode==='retireFood'){
   const loc=A.location(s,q.player,hit.uid);
   if(loc)A.retire(pack,s,q.player,loc.line,loc.slot);
   yellow=!A.location(s,q.player,hit.uid);
  }
  if(s.pending&&s.pending.kind!=='kmr2')return;
  openP003Pick(pack,s,spec,q.data.uids,yellow);
  return;
 }
 if(q.step==='pr004Bounce'){
  s.pending=null;
  if(hit.mode==='skip'||hit.mode==='done')return;
  if(!A.location(s,q.player,hit.uid))return;
  const result=A.bounce(pack,s,q.player,hit.uid,q.sourceUid);
  if(result===false)return;
  if(s.pending&&s.pending.kind!=='kmr2')return;
  if(A.location(s,q.player,hit.uid))return;
  s.kmrPrNextDecadeAp??={};
  s.kmrPrNextDecadeAp[q.player]=s.turn;
  return;
 }
 if(q.step==='outsideTop'){
  s.pending=null;
  if(hit.mode==='done'||hit.mode==='skip')return;
  moveUid(pack,s,q.player,'outside',hit.uid,'deck',q.sourceUid,'top');
  return;
 }
 if(hit.mode==='skip'||hit.mode==='done'){s.pending=null;return;}
 throw Error('Kamen Rider vol.2 choice is not legal');
}

export function runKmr2Job(pack,s,job){
 arm(pack);
 const fn=HANDLERS[job.id+'|'+job.slot];
 if(!fn)throw Error('Kamen Rider vol.2 job is not implemented');
 fn(pack,s,job);
}
export function kmr2Implements(id,slot){return typeof HANDLERS[id+'|'+slot]==='function';}
export function legalKmr2Pending(pack,s){arm(pack);return s.pending?.actions||[];}
export function resolveKmr2Pending(pack,s,a){
 arm(pack);
 const q=s.pending;
 if(!q||q.kind!=='kmr2')throw Error('Kamen Rider vol.2 choice is not pending');
 resolveStep(pack,s,q,a);
 if(!s.pending)A.go(pack,s);
}
export function legalKmr2Activations(pack,s,owner,c){
 arm(pack);
 const d=def(pack,c);
 if(d.mainAbility?.op!=='kmr2Main'||!live(s,c))return [];
 const id=d.id,out=[];
 const push=(tail='')=>{out.push({type:'activate',uid:c.uid,mode:tail?'kmr2:'+id+':'+tail:'kmr2:'+id});};
 if(id==='KMR-2-002'){
  if(!c.ready&&!used(s,c.uid+'|002a')&&ownWhere(s,owner,x=>exact(pack,x,GO,s)).length)push('a');
  if(frontOf(s,owner,c)&&!used(s,c.uid+'|002b'))push('b');
 }
 if(id==='KMR-2-003'&&frontOf(s,owner,c)&&!used(s,c.uid+'|003')&&
  ownWhere(s,owner,x=>x.ready&&exact(pack,x,GO,s)).length)push();
 if(id==='KMR-2-006'){
  if(!used(s,c.uid+'|006a')&&gochizo(pack,s,owner).length>=3)push('a');
  if(c.ready&&ownWhere(s,owner,x=>exact(pack,x,GO,s)).length)push('b');
 }
 if(id==='KMR-2-007'&&frontOf(s,owner,c)&&!used(s,c.uid+'|007')&&
  ownWhere(s,owner,x=>exact(pack,x,GO,s)).length)push();
 if(id==='KMR-2-014'&&c.ready&&plOf(s,owner).hand.length&&apReady(s,owner)>=1)push();
 if(id==='KMR-2-017'&&c.ready&&!used(s,c.uid+'|017')&&
  plOf(s,owner).front.some(x=>x?.ready&&def(pack,x).type==='character'))push();
 if(id==='KMR-2-019'&&frontOf(s,owner,c)&&!used(s,c.uid+'|019')&&
  handWhere(s,owner,x=>nonYellowRaid(pack,x)).length)push();
 if(id==='KMR-2-022'&&frontOf(s,owner,c)&&!nameLocked(s,owner,PARADOX))push();
 if(id==='KMR-2-025'&&!used(s,c.uid+'|025'))push();
 if(id==='KMR-2-040'&&c.ready&&ownWhere(s,owner,x=>token(pack,x,'フォーゼ',s)).length)push();
 if(id==='KMR-2-059'&&c.ready&&ownWhere(s,owner,x=>x.ready&&def(pack,x).energy<=2&&token(pack,x,'Ｗ',s)).length)push();
 if(id==='KMR-2-067'&&frontOf(s,owner,c)&&!used(s,c.uid+'|067')&&
  zoneWhere(s,owner,'outside',x=>trait(pack,x,RE)).length)push();
 if(id==='KMR-2-085'&&!used(s,c.uid+'|085')&&handWhere(s,owner,x=>exact(pack,x,VENT,null)).length)push();
 if(id==='KMR-2-089'&&frontOf(s,owner,c)&&!used(s,c.uid+'|089')&&s.kmr2AdventUsed?.[owner]===s.turn)push();
 if(id==='KMR-2-097'&&c.ready&&ownWhere(s,owner,x=>def(pack,x).type==='character').length)push();
 if(id==='KMR-P-005'&&frontOf(s,owner,c)&&!used(s,c.uid+'|P005'))push();
 return out;
}
export function activateKmr2(pack,s,action){
 arm(pack);
 const owner=s.active;
 const mode=String(action.mode||'');
 const id=mode.split(':')[1];
 const tail=mode.split(':')[2]||'';
 const c=[...A.field(plOf(s,owner)),...plOf(s,owner).outside].find(x=>x.uid===action.uid);
 if(!c||def(pack,c).id!==id)throw Error('Kamen Rider vol.2 activation is not legal');
 s.effectQueue.unshift({op:'kmr2',id,slot:'main',owner,sourceUid:c.uid,mode:tail});
 A.go(pack,s);
}
export function noteKmr2Zone(pack,s,move,card){
 const {physical,owner,from,to,reason,sourceUid}=move;
 if(!physical||!s.players?.[owner])return;
 const zone=s.players[owner][to];
 const live=Array.isArray(zone)?zone.find(c=>c?.uid===physical.uid)||physical:physical;
 const d=card(pack,live);
 const fieldFrom=['front','energy'].includes(from);
 const fieldTo=['front','energy'].includes(to);
 if(d?.name==='ゴチゾウ'&&fieldFrom&&to==='outside'&&reason==='retirement'){
  s.kmr2GochizoLeft??={};s.kmr2GochizoLeft[owner]=s.turn;
 }
 if(d?.id==='KMR-2-026'&&to==='outside'&&reason==='own-effect')live.kmr2AsEnergy=3;
 if(from==='hand'&&(to==='outside'||fieldTo)&&reason==='rule'&&cardHasTrait(d,ADVENT)){
  s.kmr2AdventUsed??={};s.kmr2AdventUsed[owner]=s.turn;
 }
 if(reason==='own-effect'&&fieldTo&&!fieldFrom){
  let source=null;
  if(sourceUid){
   for(const p of s.players){
    source=[...p.front,...p.energy,...p.hand,...p.outside,...p.removed,...(p.resolvingEvents||[])]
     .find(c=>c?.uid===sourceUid)||source;
   }
  }
  if(source)live.kmr2EnteredBy={id:card(pack,source).id,name:card(pack,source).name,turn:s.turn};
 }
 if(reason==='own-effect'&&from==='removed'&&fieldTo&&s.active===owner&&String(d?.name||'').includes('フォーゼ')){
  for(const watcher of [...s.players[owner].front,...s.players[owner].energy].filter(Boolean)){
   if(card(pack,watcher).id!=='KMR-2-028'||originalEffectsDisabled(s,watcher))continue;
   s.effectQueue.push({op:'kmr2',id:'KMR-2-028',slot:'entered',owner,sourceUid:watcher.uid,enteredUid:physical.uid});
  }
 }
 if(to==='removed'&&reason==='own-effect'&&s.active===owner){
  const id=d?.id;
  const copied=kmr2CopiedIds(physical);
  const reacts=['KMR-2-030','KMR-2-032','KMR-2-035'];
  if(reacts.includes(id)||copied.some(x=>reacts.includes(x))||id==='KMR-2-067'||id==='KMR-2-068'){
   const slotId=HANDLERS[id+'|removed']?id:(copied.includes('KMR-2-035')||copied.includes('KMR-2-030')||copied.includes('KMR-2-032')?(id==='KMR-2-068'?'KMR-2-068':'KMR-2-067'):null);
   const sourceCard=findSource(s,sourceUid);
   const causeId=sourceCard?card(pack,sourceCard).id:'';
   if(slotId)s.effectQueue.push({op:'kmr2',id:slotId,slot:'removed',owner,sourceUid:live.uid,causeId});
  }
 }
 if(fieldFrom&&!fieldTo){
  delete live.kmr2EnergyAttack;delete live.kmr2Sniper;delete live.kmr2WinDraw;
  delete live.kmr2Block;delete live.kmr2UnblockedDraw;delete live.kmr2TriggerImmune;
  delete live.kmr2LoseRemove;delete live.kmr2BlockActive;
 }
}
function findSource(s,uid){
 if(!uid)return null;
 for(const p of s.players||[]){
  const hit=[...p.front,...p.energy,...p.hand,...p.outside,...p.removed,...(p.resolvingEvents||[])].find(c=>c?.uid===uid);
  if(hit)return hit;
 }
 return null;
}
