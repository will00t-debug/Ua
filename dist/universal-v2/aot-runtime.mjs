// UA23BT / UA23ST scripts. The engine passes zone helpers; this file does not import it.
// Printed 「まで」 includes zero. A name-once lock is spent only when the
// printed condition applies. Registration is not an official FAQ certification.
import {cardHasName,cardHasTrait,usedOwnEventThisTurn} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';
import {aot2StandingBp} from './aot2-continuous.mjs';

const CORPS='104期兵';
const PURE='無垢の巨人';
const HEIR='巨人継承者';
const WARRIOR='マーレの戦士';
const FOOD='食材';
const EREN='エレン・イェーガー';
const YMIR='ユミル';
const HISTORIA='ヒストリア・レイス';
const LEVI='リヴァイ';
const ZIKE='ジーク・イェーガー';
const BERT='ベルトルト・フーバー';
const REINER='ライナー・ブラウン';
const ROD='ロッド・レイス';
const GRISHA='グリシャ・イェーガー';
const ARMIN='アルミン・アルレルト';
const KEY='地下室の鍵';
const BASEMENT='地下室';
const TITAN_EREN='エレン・イェーガー（進撃の巨人）';
let A=null;
export function bindAot(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return !originalEffectsDisabled(s,c);}
function selfOf(s,owner,uid){return A.location(s,owner,uid)?.c||null;}
function lineOf(s,owner,c){return c?A.location(s,owner,c.uid)?.line:null;}
function arm(pack){A.pack=pack;}
function go(pack,s){if(!s.pending)A.go(pack,s);}
function hold(s,spec,actions){
 s.pending={kind:'aot',player:spec.player,sourceUid:spec.sourceUid||null,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
}
function sig(a){
 return JSON.stringify([a?.type,a?.mode,a?.uid??null,a?.line??null,a?.slot??null,
  a?.replaceUid??null,a?.baseUid??null,a?.key??null]);
}
function takeAction(q,a){
 const hit=(q.actions||[]).find(x=>sig(x)===sig(a));
 if(!hit)throw Error('Attack on Titan choice is not legal');
 return hit;
}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function lock(s,owner,key){
 if(!s.mainReadyOnceByName[owner].includes(key))s.mainReadyOnceByName[owner].push(key);
}
function locked(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function buff(s,c,bp){if(!c||!bp)return;c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function energyBuff(s,c,amount,color){
 if(!c)return;c.buffs??=[];c.buffs.push({energy:amount,color,untilTurn:s.turn});
}
function grantImpact(s,c){if(c)c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function contains(pack,c,token,s){
 const d=def(pack,c);
 const names=[d.name,...(originalEffectsDisabled(s,c)?[]:(d.nameAliases||[]))];
 return names.some(n=>typeof n==='string'&&n.includes(token));
}
function exact(pack,c,name,s){return cardHasName(def(pack,c),name,originalEffectsDisabled(s,c));}
function trait(pack,c,name){return cardHasTrait(def(pack,c),name);}
function fieldCards(s,owner){return A.field(plOf(s,owner));}
function outs(s,owner){return plOf(s,owner).outside.filter(c=>def(A.pack,c).type==='event'||def(A.pack,c).alsoEvent===true).length;}
function eventUsed(s,owner){
 return usedOwnEventThisTurn(s,owner,c=>def(A.pack,c));
}
function traitUsed(s,owner,name){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.controller===owner&&
  e.from==='hand'&&e.reason==='rule'&&trait(A.pack,{uid:e.uid,cardId:e.cardId},name));
}
function enteredThisTurn(s,owner,c){
 if(!c)return false;
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===c.uid&&e.owner===owner&&
  ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from));
}
function apReady(s,owner){return plOf(s,owner).apCards.filter(c=>c.ready).length;}
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
 if(index<0)throw Error('Attack on Titan card left '+from);
 return A.move(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid});
}
function discard(pack,s,owner,uid,sourceUid){return moveUid(pack,s,owner,'hand',uid,'outside',sourceUid);}
function offerOrder(s,spec,uids,rest,after){
 const left=uids.filter(Boolean);
 if(left.length<=1){lay(plOf(s,spec.player),left,rest);return false;}
 hold(s,{...spec,step:'lookOrder',data:{left,built:[],rest,after:after||null,uids:left}},
  left.map(uid=>({type:'aot',mode:'next',uid})));
 return true;
}
function beginLook(s,spec,count,match,opts){
 const window=windowCards(s,spec.player,count);
 if(!window.length)return false;
 const matches=window.filter(c=>match(c));
 const data={uids:window.map(c=>c.uid),taken:[],max:opts.max,min:opts.min||0,
  rest:opts.rest,discard:opts.discard===true,after:opts.after||null};
 const actions=[
  ...(opts.min===0?[{type:'aot',mode:'done'}]:[]),
  ...matches.map(c=>({type:'aot',mode:'take',uid:c.uid}))
 ];
 if(!matches.length&&opts.min===0){
  if(!offerOrder(s,spec,data.uids,opts.rest,opts.after))return false;
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
  if(index<0)throw Error('Attack on Titan look lost a card');
  const physical=pl.deck[index];
  publish(pack,s,spec.player,physical);
  A.move(pack,s,{owner:spec.player,from:'deck',to:'hand',index,reason:'own-effect',sourceUid:spec.sourceUid});
 }
 if(data.discard&&data.taken.length&&pl.hand.length)
  return offerDiscard(s,spec,1,false,'afterLook');
 const left=data.uids.filter(uid=>!data.taken.includes(uid));
 if(data.rest==='outside'){
  for(const uid of left){
   const index=pl.deck.findIndex(c=>c.uid===uid);
   if(index>=0)A.move(pack,s,{owner:spec.player,from:'deck',to:'outside',index,
    reason:'own-effect',sourceUid:spec.sourceUid});
  }
  return data.after||null;
 }
 if(offerOrder(s,spec,left,data.rest,data.after))return 'held';
 return data.after||null;
}
function offerDiscard(s,spec,count,optional,next){
 const hand=plOf(s,spec.player).hand;
 if(hand.length<count)return false;
 hold(s,{...spec,step:'discard',data:{need:count,got:[],optional,next:next||null}},[
  ...(optional?[{type:'aot',mode:'skip'}]:[]),
  ...hand.map(c=>({type:'aot',mode:'discard',uid:c.uid}))
 ]);
 return true;
}
function offerReady(s,spec){
 const rested=plOf(s,spec.player).apCards.filter(c=>c.inPlay&&!c.ready);
 if(!rested.length)return false;
 hold(s,{...spec,step:'ready'},[
  {type:'aot',mode:'skip'},
  ...rested.map(c=>({type:'aot',mode:'ready',uid:c.uid}))
 ]);
 return true;
}
function payOrSkip(s,spec,next){
 if(apReady(s,spec.player)<1)return false;
 hold(s,{...spec,step:'pay',data:{next}},[{type:'aot',mode:'skip'},{type:'aot',mode:'pay'}]);
 return true;
}
function oppFront(s,owner,pred){
 return plOf(s,1-owner).front.filter(c=>c&&(!pred||pred(c)));
}
function rangeExtra(s,owner){
 return (s.aotBpRange?.[owner]||0)+(A.pack?aot2StandingBp(A.pack,s,owner):0);
}
function takeRange(s,owner,printed){
 const extra=rangeExtra(s,owner);
 const cap=printed+extra;
 return {cap,commit(){if(s.aotBpRange)s.aotBpRange[owner]=0;}};
}
function offerRetire(s,spec,printed,optional){
 const range=takeRange(s,spec.player,printed);
 const choices=oppFront(s,spec.player,c=>A.bp(A.pack,s,c)<=range.cap);
 if(!choices.length)return false;
 range.commit();
 hold(s,{...spec,step:'retire',data:{limit:range.cap,optional}},[
  ...(optional?[{type:'aot',mode:'skip'}]:[]),
  ...choices.map(c=>({type:'aot',mode:'retire',uid:c.uid}))
 ]);
 return true;
}
function offerBounce(s,spec,printed){
 const range=takeRange(s,spec.player,printed);
 const choices=oppFront(s,spec.player,c=>A.bp(A.pack,s,c)<=range.cap);
 if(!choices.length)return false;
 range.commit();
 hold(s,{...spec,step:'bounce',data:{limit:range.cap}},[
  {type:'aot',mode:'skip'},
  ...choices.map(c=>({type:'aot',mode:'bounce',uid:c.uid}))
 ]);
 return true;
}
function dests(s,owner,lines){
 const out=[];
 for(const line of lines)for(const dest of A.destinations(plOf(s,owner),line))
  out.push({type:'aot',mode:'dest',line,slot:dest.slot,...(dest.replaceUid?{replaceUid:dest.replaceUid}:{})});
 return out;
}
function handWhere(s,owner,pred){return plOf(s,owner).hand.filter(pred);}
function redCorps(pack,c){
 const d=def(pack,c);
 return d.type==='character'&&d.color==='red'&&d.energy<=3&&d.ap===1&&trait(pack,c,CORPS);
}
function markReturn(s,c){if(c)c.aotReturnHandAtAttackEnd={turn:s.turn,stamp:c.fieldEntryStamp};}
function doEnter(pack,s,owner,a,sourceUid,skip){
 A.enter(pack,s,{owner,from:a.from||'hand',uid:a.uid,line:a.line,slot:a.slot,
  ...(a.replaceUid?{replaceUid:a.replaceUid}:{}),ready:a.ready===true,sourceUid,
  ...(skip?{skipOnPlay:true}:{})});
}
function rememberRecover(s,owner,id,sourceUid){
 s.aotAttackStartRecover??=[];
 s.aotAttackStartRecover.push({owner,turn:s.turn,id,sourceUid});
}
function requireSelf(s,job){
 const c=selfOf(s,job.owner,job.sourceUid);
 if(!c||!live(s,c))return null;
 return c;
}

function on003(pack,s,job){
 const choices=[];
 for(const owner of [job.owner,1-job.owner])for(const c of fieldCards(s,owner)){
  if(!c.ready)continue;
  if(def(pack,c).type!=='character')continue;
  if(trait(pack,c,HEIR)||trait(pack,c,PURE))
   choices.push({type:'aot',mode:'rest',uid:c.uid,key:String(owner)});
 }
 if(!choices.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'restEither'},
  [{type:'aot',mode:'skip'},...choices]);
}
function on006(pack,s,job){rememberRecover(s,job.owner,'AOT-1-006',job.sourceUid);}
function on008(pack,s,job,bp){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 if(!payOrSkip(s,spec,'drawBuff:'+bp))return;
}
function on010Attack(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 if(!payOrSkip(s,spec,'grant010'))return;
}
function on011(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 // Sniper is only the third attack. done stays true until that attack is next.
 c.aotThirdSniper={turn:s.turn,stamp:c.fieldEntryStamp,done:true};
}
function on011End(pack,s,job){
 const c=requireSelf(s,job);if(!c||!A.raided(pack,c))return;
 const sniper=c.aotThirdSniper;
 if(sniper&&sniper.turn===s.turn&&sniper.stamp===c.fieldEntryStamp&&
  (s.attacksByUid[c.uid]||0)===2)sniper.done=false;
 const key=c.uid+'|AOT-1-011|end';
 if(used(s,key))return;
 // 「支払ってもよい」 declines without spending 【ターン1】.
 // Paying is what activates the once. No ready AP means it cannot activate.
 if(apReady(s,job.owner)<1)return;
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 if(!payOrSkip(s,{...spec,data:null},'readySelf'))return;
}
function on014(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-014';
 if(used(s,key))return;
 use(s,key);
 A.draw(pack,s,job.owner,1,job.sourceUid);
 if(!plOf(s,job.owner).hand.length)return;
 if(!offerDiscard(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},1,false,'active14'))return;
}
function finish020(pack,s,spec,data){
 const pl=plOf(s,spec.player);
 const rest=data.uids.filter(uid=>!data.kept.includes(uid));
 for(const uid of rest){
  const index=pl.deck.findIndex(c=>c.uid===uid);
  if(index>=0)A.move(pack,s,{owner:spec.player,from:'deck',to:'outside',index,
   reason:'own-effect',sourceUid:spec.sourceUid});
 }
 if(data.kept.length)lay(pl,data.kept,'top');
}
function on020(pack,s,job){
 const ymir=fieldCards(s,job.owner).some(c=>contains(pack,c,YMIR,s));
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const window=windowCards(s,job.owner,2);
 if(!window.length)return;
 if(!ymir){
  if(window.length>1)offerOrder(s,spec,window.map(c=>c.uid),'top',null);
  return;
 }
 // Any number returns to the top in the chosen order. The rest go outside.
 // Nothing in this window is added to hand, and the look stays private.
 hold(s,{...spec,step:'lookKeep',data:{uids:window.map(c=>c.uid),kept:[]}},[
  {type:'aot',mode:'done'},
  ...window.map(c=>({type:'aot',mode:'keep',uid:c.uid}))
 ]);
}
function on021(pack,s,job){
 if(!eventUsed(s,job.owner)||locked(s,job.owner,'AOT-1-021|event'))return;
 lock(s,job.owner,'AOT-1-021|event');
 offerReady(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id});
}
function on022Attack(pack,s,job){
 if(outs(s,job.owner)<2)return;
 const choices=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&trait(pack,c,CORPS));
 if(!choices.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'buffOne'},[
  {type:'aot',mode:'skip'},
  ...choices.map(c=>({type:'aot',mode:'buff',uid:c.uid}))
 ]);
}
function on031(pack,s,job){
 // 見る stays private. Any number returns to the top in pick order.
 // The rest go outside, and the draw happens only after that placement.
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 const window=windowCards(s,job.owner,2);
 if(!window.length){A.draw(pack,s,job.owner,2,job.sourceUid);return;}
 hold(s,{...spec,step:'lookKeep',data:{uids:window.map(c=>c.uid),kept:[],after:'draw2'}},[
  {type:'aot',mode:'done'},
  ...window.map(c=>({type:'aot',mode:'keep',uid:c.uid}))
 ]);
}
function cap033(pack,s,owner){
 let base=2000;
 if(fieldCards(s,owner).some(c=>exact(pack,c,HISTORIA,s))){
  // The event is used into OUTSIDE before its effect. The engine holds it in
  // resolvingEvents until the choice finishes, so that copy still counts.
  const pl=plOf(s,owner),seen=new Set();
  let events=0;
  for(const c of [...pl.outside,...(pl.resolvingEvents||[])]){
   if(seen.has(c.uid))continue;
   seen.add(c.uid);
   if(def(pack,c).type==='event'||def(pack,c).alsoEvent===true)events++;
  }
  base+=events*1000;
 }
 return base;
}
function on033(pack,s,job){offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},cap033(pack,s,job.owner),false);}
function on034(pack,s,job){
 const raised=fieldCards(s,job.owner).some(c=>exact(pack,c,LEVI,s));
 offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},raised?5000:3000,false);
}
function on047(pack,s,job){offerPure(s,job,2);}
function offerPure(s,job,energy){
 const cards=handWhere(s,job.owner,c=>def(A.pack,c).energy<=energy&&def(A.pack,c).ap===1&&trait(A.pack,c,PURE));
 const actions=[];
 for(const c of cards)for(const dest of dests(s,job.owner,['front','energy']))
  actions.push({...dest,uid:c.uid,ready:false,from:'hand'});
 if(!actions.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'deploy'},
  [{type:'aot',mode:'skip'},...actions]);
}
function on048(pack,s,job){
 for(const c of fieldCards(s,job.owner))if(trait(pack,c,PURE))buff(s,c,1000);
}
function on049(pack,s,job){offerPure(s,job,2);}
function on053(pack,s,job){
 const cards=handWhere(s,job.owner,c=>{
  const d=def(A.pack,c);return d.color==='green'&&d.type==='character'&&d.energy<=3&&d.ap===1;
 });
 const actions=[];
 for(const c of cards)for(const dest of dests(s,job.owner,['front','energy']))
  actions.push({...dest,uid:c.uid,ready:false,from:'hand'});
 if(!actions.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'deploy'},
  [{type:'aot',mode:'skip'},...actions]);
}
function on053Retire(pack,s,job){
 const base=job.baseUid&&plOf(s,job.owner).outside.find(c=>c.uid===job.baseUid);
 if(!base)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'baseHand',data:{uid:base.uid}},[
  {type:'aot',mode:'skip'},{type:'aot',mode:'take',uid:base.uid}
 ]);
}
function on057(pack,s,job){
 const foe=1-job.owner;
 const slots=[];
 plOf(s,foe).front.forEach((c,slot)=>{if(c&&def(pack,c).energy===0)slots.push(slot);});
 for(const slot of slots.sort((a,b)=>b-a))A.retire(pack,s,foe,'front',slot);
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self&&live(s,self))self.aotChoiceShield={turn:s.turn,stamp:self.fieldEntryStamp,scope:'characterOrTrigger'};
}
function on063(pack,s,job){
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 beginLook(s,spec,4,()=>true,{max:1,min:1,rest:'bottom',after:'recover63'});
}
function greenBig(pack,c){
 const d=def(pack,c);
 return d.color==='green'&&d.type==='character'&&d.energy>=4&&d.ap===1;
}
function on064(pack,s,job){
 const both=fieldCards(s,job.owner).some(c=>contains(pack,c,REINER,s));
 const spec={player:job.owner,sourceUid:job.sourceUid,id:job.id};
 if(both){start64A(s,spec,true);return;}
 hold(s,{...spec,step:'mode64'},[
  {type:'aot',mode:'mode',key:'a'},{type:'aot',mode:'mode',key:'b'}
 ]);
}
function start64A(s,spec,thenB){
 const opened=beginLook(s,spec,7,c=>def(A.pack,c).color==='green'&&def(A.pack,c).type==='character',
  {max:2,min:0,rest:'bottom',after:thenB?'modeB':null});
 if(!opened&&thenB)start64B(s,spec);
}
function start64B(s,spec){
 const cards=handWhere(s,spec.player,c=>greenBig(A.pack,c));
 if(!cards.length)return;
 const actions=pairActions(s,spec.player,cards);
 if(!actions.length)return;
 hold(s,{...spec,step:'pair64',data:{picked:[],actions}},[
  {type:'aot',mode:'done'},...actions
 ]);
}
function pairActions(s,owner,cards){
 const out=[];
 for(const c of cards){
  for(const dest of dests(s,owner,['front']))
   out.push({...dest,uid:c.uid,ready:true,from:'hand',key:'play'});
  for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
   const base=plOf(s,owner)[line][slot];
   if(!base||!A.raidBase(A.pack,s,owner,base,def(A.pack,c)))continue;
   if(line==='front')out.push({type:'aot',mode:'raid',uid:c.uid,baseUid:base.uid,line:'front',slot,key:'raid'});
   else{
    out.push({type:'aot',mode:'raid',uid:c.uid,baseUid:base.uid,line:'energy',slot,key:'raid'});
    for(const dest of A.destinations(plOf(s,owner),'front'))
     out.push({type:'aot',mode:'raid',uid:c.uid,baseUid:base.uid,line:'front',slot:dest.slot,
      ...(dest.replaceUid?{replaceUid:dest.replaceUid}:{}),key:'raid'});
   }
  }
 }
 return out;
}
function on066(pack,s,job){
 const raised=fieldCards(s,job.owner).some(c=>contains(pack,c,ZIKE,s));
 offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},raised?5000:3000,false);
}
function on067(pack,s,job){
 const cards=fieldCards(s,job.owner);
 if(!cards.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'green2'},
  cards.map(c=>({type:'aot',mode:'buff',uid:c.uid})));
}
function on072(pack,s,job){
 beginLook(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},5,c=>{
  const d=def(pack,c);
  return (d.color==='red'&&d.type==='character'&&contains(pack,c,EREN,s))||exact(pack,c,KEY,s);
 },{max:1,min:0,rest:'bottom',discard:true});
}
function on076(pack,s,job){
 if(s.active!==job.owner)return;
 const cards=handWhere(s,job.owner,c=>{
  const d=def(pack,c);return d.energy===1&&d.color==='red'&&exact(pack,c,ARMIN,s);
 });
 if(!cards.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'armin'},[
  {type:'aot',mode:'skip'},
  ...cards.map(c=>({type:'aot',mode:'discard',uid:c.uid}))
 ]);
}
function on077(pack,s,job){
 const others=fieldCards(s,job.owner).filter(c=>c.uid!==job.sourceUid&&def(pack,c).type==='character');
 const actions=[{type:'aot',mode:'range'}];
 if(others.length)actions.push({type:'aot',mode:'buffMode'});
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'fork77',
  data:{uids:others.map(c=>c.uid)}},actions);
}
function on082(pack,s,job){
 const c=requireSelf(s,job);
 if(c&&traitUsed(s,job.owner,FOOD))A.active(s,job.owner,c);
}
function on089(pack,s,job){
 if(!fieldCards(s,job.owner).some(c=>contains(pack,c,EREN,s)))return;
 offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},3500,true);
}
function on092(pack,s,job){
 const others=plOf(s,job.owner).front.filter(c=>c&&c.uid!==job.sourceUid&&trait(pack,c,CORPS));
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'tuck92'},[
  {type:'aot',mode:'skip'},
  ...others.map(c=>({type:'aot',mode:'tuck',uid:c.uid}))
 ]);
}
function on093(pack,s,job){
 const low=plOf(s,job.owner).life.length<=3;
 const actions=[{type:'aot',mode:'draw'}];
 if(low&&plOf(s,job.owner).hand.length>=2)actions.push({type:'aot',mode:'discard2'});
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'fork93'},actions);
}
function on094Attack(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-094|atk';
 if(used(s,key))return;
 use(s,key);
 const actions=[{type:'aot',mode:'impact'}];
 if(plOf(s,job.owner).life.length<=3)actions.push({type:'aot',mode:'ready'});
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'fork94'},actions);
}
function on096(pack,s,job){
 const opened=offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},5000,true);
 if(!opened)grant096(s,job);
 else s.pending.data.after='grant96';
}
function grant096(s,job){
 const targets=fieldCards(s,job.owner).filter(c=>exact(A.pack,c,TITAN_EREN,s)&&A.raided(A.pack,c));
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:'AOT-1-096',step:'special96'},[
  {type:'aot',mode:'skip'},
  ...targets.map(c=>({type:'aot',mode:'grant',uid:c.uid}))
 ]);
}
function on098(pack,s,job){
 beginLook(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},5,c=>exact(pack,c,BASEMENT,s)||trait(pack,c,HEIR),
  {max:1,min:0,rest:'bottom',after:'energy98'});
}
function on099(pack,s,job){
 A.draw(pack,s,job.owner,2,job.sourceUid);
 offerCorps(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},2);
}
function offerCorps(s,spec,max){
 const cards=handWhere(s,spec.player,c=>redCorps(A.pack,c));
 const actions=[];
 for(const c of cards)for(const dest of dests(s,spec.player,['front']))
  if(!dest.replaceUid)actions.push({...dest,uid:c.uid,ready:true,from:'hand'});
 if(!actions.length)return false;
 hold(s,{...spec,step:'corps',data:{left:max,entered:[]}},[{type:'aot',mode:'done'},...actions]);
 return true;
}
function on100(pack,s,job){
 const hand=plOf(s,job.owner).hand;
 if(!hand.length){offerReady(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id});return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'bottom100',data:{built:[],max:3}},[
  {type:'aot',mode:'done'},
  ...hand.map(c=>({type:'aot',mode:'bottom',uid:c.uid}))
 ]);
}
function on104(pack,s,job){
 const c=requireSelf(s,job);
 if(!c||lineOf(s,job.owner,c)!=='energy')return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'mode104'},[
  {type:'aot',mode:'mode',key:'search'},{type:'aot',mode:'mode',key:'deploy'}
 ]);
}
function on110(pack,s,job){
 payOrSkip(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},'bounce110');
}
function on111(pack,s,job){
 payOrSkip(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},'buff111');
}
function on112(pack,s,job){
 const energy=Object.values(A.energy(pack,s,job.owner)).reduce((n,x)=>n+x,0);
 offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},energy>=8?4000:2000,true);
}
function on113(pack,s,job){
 const foe=plOf(s,1-job.owner);
 const cards=[...foe.front,...foe.energy].filter(c=>c&&def(pack,c).type==='field');
 if(!cards.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'retireField'},[
  {type:'aot',mode:'skip'},
  ...cards.map(c=>({type:'aot',mode:'retire',uid:c.uid}))
 ]);
}
function attackStartRecover(pack,s,job){
 offerReady(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id});
}
function phaseReady(pack,s,job){
 const c=requireSelf(s,job);
 if(!c||lineOf(s,job.owner,c)!=='front'||!c.ready||s.active!==job.owner)return;
 offerReady(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id});
}
function deployAfter92(s,job){
 const open=plOf(s,job.owner).front.some(c=>!c);
 if(!open)return;
 offerCorps(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},1);
}

function main002(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-002';
 if(used(s,key)||apReady(s,job.owner)<1)return;
 use(s,key);
 A.spend(plOf(s,job.owner),1);
 A.noteEffect&&A.noteEffect(pack,s,job.owner,job.sourceUid);
 energyBuff(s,c,1,'blue');
 rememberRecover(s,job.owner,'AOT-1-002',job.sourceUid);
}
function main022(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-022';
 if(used(s,key)||lineOf(s,job.owner,c)!=='front')return;
 if(outs(s,job.owner)<4||!eventUsed(s,job.owner))return;
 use(s,key);
 offerReady(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id});
}
function main028(pack,s,job){
 const c=requireSelf(s,job);if(!c||!c.ready)return;
 c.ready=false;A.noteRest(s,job.owner,c);
 const top=plOf(s,job.owner).deck[0];
 if(!top)return;
 publish(pack,s,job.owner,top);
 const d=def(pack,top);
 if(d.color==='blue'&&d.type==='character'&&d.energy<=3)
  A.move(pack,s,{owner:job.owner,from:'deck',to:'hand',index:0,reason:'own-effect',sourceUid:job.sourceUid});
}
function main036(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const actions=[];
 const retireKey=c.uid+'|AOT-1-036|retire';
 // The retire line is its own 【ターン1】, and only on the turn this card entered.
 // The hand-to-outside BP line is a separate activation with no once.
 if(!used(s,retireKey)&&enteredThisTurn(s,job.owner,c)){
  const cap=A.bp(pack,s,c)+rangeExtra(s,job.owner);
  for(const t of oppFront(s,job.owner,x=>A.bp(pack,s,x)<=cap))
   actions.push({type:'aot',mode:'retire',uid:t.uid});
 }
 if(plOf(s,job.owner).hand.length)actions.push({type:'aot',mode:'discardBuff'});
 if(!actions.length)return;
 if(actions.some(a=>a.mode==='retire'))A.bpRange(s,job.owner,0);
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'main36'},actions);
}
function main046(pack,s,job){
 const c=requireSelf(s,job);if(!c||!c.ready)return;
 const targets=fieldCards(s,job.owner).filter(x=>trait(pack,x,PURE));
 if(!targets.length)return;
 c.ready=false;A.noteRest(s,job.owner,c);
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'buffOne'},
  targets.map(x=>({type:'aot',mode:'buff',uid:x.uid})));
}
function main048(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-048';
 if(used(s,key))return;
 use(s,key);
 const targets=fieldCards(s,job.owner).filter(x=>trait(pack,x,PURE));
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'impact48'},[
  {type:'aot',mode:'skip'},
  ...targets.map(x=>({type:'aot',mode:'buff',uid:x.uid}))
 ]);
}
function main062(pack,s,job){
 const c=requireSelf(s,job);if(!c||!c.ready)return;
 const key=c.uid+'|AOT-1-062';
 if(used(s,key)||!plOf(s,job.owner).hand.length)return;
 use(s,key);
 c.ready=false;A.noteRest(s,job.owner,c);
 offerDiscard(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},1,false,'gen62');
}
function main071(pack,s,job){
 const c=requireSelf(s,job);if(!c||!c.ready)return;
 if(!fieldCards(s,job.owner).some(x=>exact(pack,x,GRISHA,s)))return;
 c.ready=false;A.noteRest(s,job.owner,c);
 const loc=A.location(s,job.owner,c.uid);
 if(loc)A.retire(pack,s,job.owner,loc.line,loc.slot);
 A.draw(pack,s,job.owner,2,job.sourceUid);
 if(plOf(s,job.owner).hand.length)
  offerDiscard(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},1,false,null);
}
function main077(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-077';
 if(used(s,key)||lineOf(s,job.owner,c)!=='front')return;
 use(s,key);
 on077(pack,s,job);
}
function main091(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-091';
 if(used(s,key)||lineOf(s,job.owner,c)!=='front'||!plOf(s,job.owner).life.length)return;
 use(s,key);
 const life=plOf(s,job.owner).life;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'lifeHand'},
  life.map(x=>({type:'aot',mode:'life',uid:x.uid})));
}
function main094(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 const key=c.uid+'|AOT-1-094|main';
 if(used(s,key)||lineOf(s,job.owner,c)!=='front')return;
 use(s,key);
 offerRetire(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id},2000,true);
}
function main107(pack,s,job){
 const c=requireSelf(s,job);if(!c)return;
 if(lineOf(s,job.owner,c)!=='front'||!plOf(s,job.owner).life.length)return;
 const name=def(pack,c).name;
 if(locked(s,job.owner,name+'|AOT-1-107'))return;
 lock(s,job.owner,name+'|AOT-1-107');
 const life=plOf(s,job.owner).life;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'lifeOut'},
  life.map(x=>({type:'aot',mode:'life',uid:x.uid})));
}
function main108(pack,s,job){
 const c=requireSelf(s,job);if(!c||!c.ready)return;
 c.ready=false;A.noteRest(s,job.owner,c);
 const loc=A.location(s,job.owner,c.uid);
 if(loc)A.retire(pack,s,job.owner,loc.line,loc.slot);
 for(const x of fieldCards(s,job.owner))if(trait(pack,x,CORPS))buff(s,x,1000);
}

const JOBS={
 'AOT-1-002|main':main002,
 'AOT-1-002|attackStart':attackStartRecover,
 'AOT-1-006|attackStart':attackStartRecover,
 'AOT-1-003|onPlay':on003,
 'AOT-1-006|onPlay':on006,
 'AOT-1-008|onAttack':(pack,s,job)=>on008(pack,s,job,500),
 'AOT-1-009|onAttack':(pack,s,job)=>on008(pack,s,job,1000),
 'AOT-1-010|attackStart':phaseReady,
 'AOT-1-010|onAttack':on010Attack,
 'AOT-1-011|onPlay':on011,
 'AOT-1-011|attackEnd':on011End,
 'AOT-1-014|onAttack':on014,
 'AOT-1-020|onPlay':on020,
 'AOT-1-021|onPlay':on021,
 'AOT-1-022|onAttack':on022Attack,
 'AOT-1-022|main':main022,
 'AOT-1-028|main':main028,
 'AOT-1-031|onPlay':on031,
 'AOT-1-033|onPlay':on033,
 'AOT-1-034|onPlay':on034,
 'AOT-1-036|main':main036,
 'AOT-1-046|main':main046,
 'AOT-1-047|onPlay':on047,
 'AOT-1-048|onPlay':on048,
 'AOT-1-048|main':main048,
 'AOT-1-049|onRetire':on049,
 'AOT-1-053|onPlay':on053,
 'AOT-1-053|onRetire':on053Retire,
 'AOT-1-057|onPlay':on057,
 'AOT-1-062|main':main062,
 'AOT-1-063|onPlay':on063,
 'AOT-1-064|onPlay':on064,
 'AOT-1-066|onPlay':on066,
 'AOT-1-067|onPlay':on067,
 'AOT-1-071|main':main071,
 'AOT-1-072|onPlay':on072,
 'AOT-1-076|after':on076,
 'AOT-1-077|onPlay':on077,
 'AOT-1-077|main':main077,
 'AOT-1-082|onPlay':on082,
 'AOT-1-089|onPlay':on089,
 'AOT-1-091|main':main091,
 'AOT-1-092|onAttack':on092,
 'AOT-1-093|onAttack':on093,
 'AOT-1-094|main':main094,
 'AOT-1-094|onAttack':on094Attack,
 'AOT-1-096|onPlay':on096,
 'AOT-1-098|onPlay':on098,
 'AOT-1-099|onPlay':on099,
 'AOT-1-100|onPlay':on100,
 'AOT-1-104|onPlay':on104,
 'AOT-1-107|main':main107,
 'AOT-1-108|main':main108,
 'AOT-1-110|onAttack':on110,
 'AOT-1-111|attackStart':phaseReady,
 'AOT-1-111|onAttack':on111,
 'AOT-1-112|onPlay':on112,
 'AOT-1-113|onPlay':on113
};
export function aotImplements(id,slot){return typeof JOBS[id+'|'+slot]==='function';}
export function runAotJob(pack,s,job){
 arm(pack);
 const fn=JOBS[job.id+'|'+job.slot];
 if(!fn)throw Error('Attack on Titan job has no handler');
 fn(pack,s,job);
 if(!s.pending)go(pack,s);
}
function legalMain(pack,s,owner,c){
 const id=def(pack,c).id,front=lineOf(s,owner,c)==='front';
 if(id==='AOT-1-002')return !used(s,c.uid+'|AOT-1-002')&&apReady(s,owner)>=1;
 if(id==='AOT-1-022')return front&&!used(s,c.uid+'|AOT-1-022')&&outs(s,owner)>=4&&eventUsed(s,owner);
 if(id==='AOT-1-028')return c.ready&&plOf(s,owner).deck.length>0;
 if(id==='AOT-1-036'){
  const retire=!used(s,c.uid+'|AOT-1-036|retire')&&enteredThisTurn(s,owner,c)&&
   oppFront(s,owner,t=>A.bp(pack,s,t)<=A.bp(pack,s,c)+rangeExtra(s,owner)).length;
  return retire||plOf(s,owner).hand.length>0;
 }
 if(id==='AOT-1-046')return c.ready&&fieldCards(s,owner).some(x=>trait(pack,x,PURE));
 if(id==='AOT-1-048')return !used(s,c.uid+'|AOT-1-048');
 if(id==='AOT-1-062')return c.ready&&!used(s,c.uid+'|AOT-1-062')&&plOf(s,owner).hand.length>0;
 if(id==='AOT-1-071')return c.ready&&fieldCards(s,owner).some(x=>exact(pack,x,GRISHA,s));
 if(id==='AOT-1-077')return front&&!used(s,c.uid+'|AOT-1-077');
 if(id==='AOT-1-091')return front&&!used(s,c.uid+'|AOT-1-091')&&plOf(s,owner).life.length>0;
 if(id==='AOT-1-094')return front&&!used(s,c.uid+'|AOT-1-094|main');
 if(id==='AOT-1-107')return front&&plOf(s,owner).life.length>0&&!locked(s,owner,def(pack,c).name+'|AOT-1-107');
 if(id==='AOT-1-108')return c.ready;
 return false;
}
export function legalAotActivations(pack,s,owner,c){
 arm(pack);
 if(s.phase!=='main'||s.active!==owner)return [];
 const d=def(pack,c);
 if(d.mainAbility?.op!=='aotMain'||!live(s,c))return [];
 if(!legalMain(pack,s,owner,c))return [];
 return [{type:'activate',uid:c.uid,mode:'aot:'+d.id}];
}
export function activateAot(pack,s,action){
 arm(pack);
 const id=String(action.mode||'').slice(4);
 const owner=s.active,c=selfOf(s,owner,action.uid);
 if(!c||def(pack,c).id!==id)throw Error('Attack on Titan activation left the field');
 const job={owner,sourceUid:c.uid,id,slot:'main'};
 const fn=JOBS[id+'|main'];
 if(!fn)throw Error('Attack on Titan activation is not implemented');
 fn(pack,s,job);
 if(!s.pending)go(pack,s);
}
export function legalAotPending(pack,s){arm(pack);return s.pending?.actions||[];}

function afterPay(pack,s,q,kind){
 const self=selfOf(s,q.player,q.sourceUid);
 if(kind.startsWith('drawBuff:')){
  const bp=Number(kind.slice(9));
  A.draw(pack,s,q.player,1,q.sourceUid);
  if(self)buff(s,self,bp);
 }else if(kind==='grant010'){
  const choices=fieldCards(s,q.player).filter(c=>def(pack,c).type==='character');
  if(!choices.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'grant010'},[
   {type:'aot',mode:'skip'},...choices.map(c=>({type:'aot',mode:'grant',uid:c.uid}))
  ]);
  return 'held';
 }else if(kind==='readySelf'){
  const key=(self?.uid||q.sourceUid)+'|AOT-1-011|end';
  use(s,key);
  if(self)self.ready=true;
 }else if(kind==='buff111'){
  if(self)buff(s,self,500);
 }else if(kind==='bounce110'){
  if(offerBounce(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},2000))return 'held';
 }
 return null;
}
function continueAfter(pack,s,q,after){
 if(!after)return;
 if(after==='draw2'){A.draw(pack,s,q.player,2,q.sourceUid);return;}
 if(after==='active14'){
  const self=selfOf(s,q.player,q.sourceUid);
  if(self&&outs(s,q.player)>=6){
   hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'yes'},[
    {type:'aot',mode:'skip'},{type:'aot',mode:'ready'}
   ]);
   return 'held';
  }
  return;
 }
 if(after==='recover63')return;
 if(after==='modeB'){start64B(s,{player:q.player,sourceUid:q.sourceUid,id:q.id});return 'held';}
 if(after==='afterLook')return;
 if(after==='buff36'){buff(s,selfOf(s,q.player,q.sourceUid),1000);return;}
 if(after==='retire93'){
  if(offerRetire(s,{player:q.player,sourceUid:q.sourceUid,id:q.id},2000,true))return 'held';
  return;
 }
 if(after==='gen62'){energyBuff(s,selfOf(s,q.player,q.sourceUid),1,'green');return;}
 if(after==='grant96'){grant096(s,{owner:q.player,sourceUid:q.sourceUid});return 'held';}
 if(after==='energy98')return;
 return null;
}
function resolve64(pack,s,q){
 const picks=q.data?.picked||[];
 if(!picks.length)return;
 if(picks.length===1){
  resolveOne64(pack,s,q.player,picks[0],q.sourceUid,false);
  return;
 }
 resolvePair64(pack,s,q,picks);
}
function resolveOne64(pack,s,owner,pick,sourceUid,skip){
 if(pick.key==='raid'||pick.mode==='raid'){
  const pl=plOf(s,owner);
  const index=pl.hand.findIndex(c=>c.uid===pick.uid);
  if(index<0)throw Error('Attack on Titan raid card left the hand');
  const physical=pl.hand.splice(index,1)[0];
  const result=A.raid(pack,s,owner,physical,pick.baseUid,pick.line,pick.slot,pick.replaceUid,{
   entryCause:'handEffectRaid',entryFrom:'hand',effectSourceUid:sourceUid,deferEffects:!!skip});
  if(skip)return result;
  return null;
 }
 doEnter(pack,s,owner,{...pick,from:'hand',ready:true},sourceUid,skip);
 return null;
}
function resolvePair64(pack,s,q,picks){
 const owner=q.player;
 const raid=picks.find(p=>p.mode==='raid'||p.key==='raid');
 const play=picks.find(p=>p!==raid);
 const energyFull=plOf(s,owner).energy.filter(Boolean).length>=4;
 if(raid&&raid.line==='energy'&&energyFull){
  const result=resolveOne64(pack,s,owner,raid,q.sourceUid,true);
  const others=plOf(s,owner).energy.map((c,slot)=>c&&c.uid!==result.uid?{uid:c.uid,slot}:null).filter(Boolean);
  hold(s,{player:owner,sourceUid:q.sourceUid,id:q.id,step:'removeEnergy',
   data:{play,raidUid:result.uid,jobs:result.jobs||[]}},
   others.map(c=>({type:'aot',mode:'remove',uid:c.uid})));
  return;
 }
 const jobs=[];
 for(const pick of picks){
  if(pick.mode==='raid'||pick.key==='raid'){
   const result=resolveOne64(pack,s,owner,pick,q.sourceUid,true);
   jobs.push(...(result?.jobs||[]));
  }else{
   doEnter(pack,s,owner,{...pick,from:'hand',ready:true},q.sourceUid,true);
   const entered=selfOf(s,owner,pick.uid);
   if(entered)jobs.push(...(A.programs(pack,s,entered,'onPlay',owner,'handEffect',q.sourceUid)||[]));
  }
 }
 if(jobs.length)s.effectQueue.unshift(...jobs);
}
export function resolveAotPending(pack,s,action){
 arm(pack);
 const q=s.pending;
 if(q?.kind!=='aot')throw Error('Attack on Titan choice is not pending');
 const a=takeAction(q,action);
 if(q.id==='capacity'&&q.step==='overflow'){
  const loc=A.location(s,q.player,a.uid);
  if(!loc||loc.line!=='front')throw Error('Front capacity card left');
  s.pending=null;
  A.removeRule(pack,s,q.player,'front',loc.slot);
  A.recheck(pack,s);
  go(pack,s);
  return;
 }
 s.pending=null;
 const spec={player:q.player,sourceUid:q.sourceUid,id:q.id};
 if(q.step==='lookPick'){
  const data=q.data;
  if(a.mode==='take'){
   data.taken.push(a.uid);
   const left=data.uids.filter(uid=>!data.taken.includes(uid));
   const more=left.map(uid=>plOf(s,q.player).deck.find(c=>c.uid===uid)).filter(Boolean);
   if(data.taken.length<data.max&&more.length){
    const matches=more.filter(c=>{
     if(q.id==='AOT-1-064')return def(pack,c).color==='green'&&def(pack,c).type==='character';
     if(q.id==='AOT-1-072')return (def(pack,c).color==='red'&&def(pack,c).type==='character'&&contains(pack,c,EREN,s))||exact(pack,c,KEY,s);
     if(q.id==='AOT-1-098')return exact(pack,c,BASEMENT,s)||trait(pack,c,HEIR);
     if(q.id==='AOT-1-104')return trait(pack,c,CORPS)&&def(pack,c).energy<=3;
     return true;
    });
    hold(s,{...spec,step:'lookPick',data},{
     ...(data.taken.length>=data.min?[{type:'aot',mode:'done'}]:[]),
     ...matches.map(c=>({type:'aot',mode:'take',uid:c.uid}))
    }.length?[
     ...(data.taken.length>=data.min?[{type:'aot',mode:'done'}]:[]),
     ...matches.map(c=>({type:'aot',mode:'take',uid:c.uid}))
    ]:[...matches.map(c=>({type:'aot',mode:'take',uid:c.uid}))]);
    return;
   }
  }
  const taken=data.taken.map(uid=>plOf(s,q.player).deck.find(c=>c.uid===uid)).filter(Boolean);
  const next=finishLook(pack,s,spec,data);
  if(next==='held')return;
  if(q.id==='AOT-1-063'&&taken[0]){
   const c=plOf(s,q.player).hand.find(x=>x.uid===taken[0].uid);
   if(c&&(trait(pack,c,PURE)||contains(pack,c,ROD,s)||contains(pack,c,ZIKE,s)))
    if(offerReady(s,spec))return;
  }
  if(q.id==='AOT-1-098'&&taken[0]&&def(pack,taken[0]).energy>=6)
   if(offerReady(s,spec))return;
  if(next){const held=continueAfter(pack,s,q,next);if(held==='held'||s.pending)return;}
  go(pack,s);return;
 }
 if(q.step==='lookKeep'){
  const data=q.data;
  if(a.mode==='keep'){
   data.kept.push(a.uid);
   const left=data.uids.filter(uid=>!data.kept.includes(uid));
   if(left.length){
    hold(s,{...spec,step:'lookKeep',data},[
     {type:'aot',mode:'done'},
     ...left.map(uid=>({type:'aot',mode:'keep',uid}))
    ]);
    return;
   }
  }
  finish020(pack,s,spec,data);
  if(data.after==='draw2')A.draw(pack,s,spec.player,2,spec.sourceUid);
  go(pack,s);return;
 }
 if(q.step==='lookOrder'){
  const data=q.data;
  data.built.push(a.uid);
  const left=data.left.filter(uid=>uid!==a.uid);
  if(left.length>1){
   hold(s,{...spec,step:'lookOrder',data:{...data,left,uids:left}},left.map(uid=>({type:'aot',mode:'next',uid})));
   return;
  }
  lay(plOf(s,q.player),[...data.built,...left],data.rest);
  if(data.after){const held=continueAfter(pack,s,q,data.after);if(held==='held'||s.pending)return;}
  go(pack,s);return;
 }
 if(a.mode==='skip'){
  if(q.step==='bounceInstead'){
   A.bounce(pack,s,q.player,q.data.uid,q.data.sourceUid);
   go(pack,s);return;
  }
  if(q.data?.after){const held=continueAfter(pack,s,q,q.data.after);if(held==='held'||s.pending)return;}
  if(q.step==='tuck92')deployAfter92(s,{owner:q.player,sourceUid:q.sourceUid,id:q.id});
  go(pack,s);return;
 }
 if(q.step==='ready'||(q.step==='yes'&&a.mode==='ready')){
  const card=plOf(s,q.player).apCards.find(c=>c.uid===a.uid);
  if(q.step==='yes'){const self=selfOf(s,q.player,q.sourceUid);if(self)self.ready=true;}
  else if(card)card.ready=true;
  go(pack,s);return;
 }
 if(q.step==='pay'&&a.mode==='pay'){
  A.spend(plOf(s,q.player),1);
  if(A.noteEffect)A.noteEffect(pack,s,q.player,q.sourceUid);
  const held=afterPay(pack,s,q,q.data?.next);
  if(held==='held'||s.pending)return;
  go(pack,s);return;
 }
 if(q.step==='restEither'){
  let owner=null,target=null;
  for(const side of [0,1]){
   const hit=fieldCards(s,side).find(c=>c.uid===a.uid);
   if(hit){owner=side;target=hit;break;}
  }
  if(!target||!target.ready)throw Error('Attack on Titan rest target left');
  target.ready=false;
  if(owner===q.player)A.noteRest(s,owner,target);
  A.draw(pack,s,owner,1,q.sourceUid);
  go(pack,s);return;
 }
 if(q.step==='retire'||q.step==='retireField'){
  let found=null;
  for(const line of ['front','energy']){
   const slot=plOf(s,1-q.player)[line].findIndex(c=>c?.uid===a.uid);
   if(slot>=0){found={line,slot};break;}
  }
  if(!found)throw Error('Attack on Titan retire target left');
  if(q.data?.limit!==undefined&&A.bp(pack,s,plOf(s,1-q.player)[found.line][found.slot])>q.data.limit)
   throw Error('Attack on Titan retire target is above the printed BP');
  A.retire(pack,s,1-q.player,found.line,found.slot);
  if(q.data?.after){const held=continueAfter(pack,s,q,q.data.after);if(held==='held'||s.pending)return;}
  go(pack,s);return;
 }
 if(q.step==='bounce'){
  A.bounce(pack,s,1-q.player,a.uid,q.sourceUid);
  go(pack,s);return;
 }
 if(q.step==='discard'||q.step==='armin'){
  discard(pack,s,q.player,a.uid,q.sourceUid);
  if(q.step==='armin'){
   A.draw(pack,s,q.player,2,q.sourceUid);
   if(plOf(s,q.player).hand.length&&offerDiscard(s,spec,1,false,null))return;
  }else if(q.data?.next){
   const held=continueAfter(pack,s,q,q.data.next);
   if(held==='held'||s.pending)return;
  }
  go(pack,s);return;
 }
 if(q.step==='corps'){
  // AOT-1-099 deploys up to two characters in one event. Resolve all
  // actual onPlay programs after their physical entries, without replacing
  // the event's remaining deployment choice with a nested effect pending.
  const jobs=[...(q.data?.jobs||[])];
  if(a.mode==='done'){
   if(jobs.length)s.effectQueue.unshift(...jobs);
   go(pack,s);return;
  }
  doEnter(pack,s,q.player,{...a,from:'hand',ready:a.ready===true},q.sourceUid,true);
  const entered=selfOf(s,q.player,a.uid);
  if(entered){
   markReturn(s,entered);
   jobs.push(...(A.programs(pack,s,entered,'onPlay',q.player,'handEffect',q.sourceUid)||[]));
  }
  if(q.data?.left>1){
   const cards=handWhere(s,q.player,c=>redCorps(pack,c));
   const actions=[];
   for(const c of cards)for(const dest of dests(s,q.player,['front']))
    if(!dest.replaceUid)actions.push({...dest,uid:c.uid,ready:true,from:'hand'});
   if(actions.length){
    hold(s,{...spec,step:'corps',data:{left:q.data.left-1,jobs}},
     [{type:'aot',mode:'done'},...actions]);
    return;
   }
  }
  if(jobs.length)s.effectQueue.unshift(...jobs);
  go(pack,s);return;
 }
 if(q.step==='deploy'){
  doEnter(pack,s,q.player,{...a,from:'hand',ready:a.ready===true},q.sourceUid,false);
  go(pack,s);return;
 }
 if(q.step==='buffOne'||q.step==='green2'||q.step==='impact48'){
  const target=fieldCards(s,q.player).find(c=>c.uid===a.uid);
  if(!target)throw Error('Attack on Titan buff target left');
  if(q.step==='impact48')grantImpact(s,target);
  else if(q.step==='green2'){
   energyBuff(s,target,2,'green');
   if(fieldCards(s,q.player).some(c=>contains(pack,c,BERT,s)))
    if(offerReady(s,spec))return;
  }else buff(s,target,1000);
  go(pack,s);return;
 }
 if(q.step==='fork77'){
  if(a.mode==='range'){
   s.aotBpRange[q.player]=(s.aotBpRange[q.player]||0)+1000;
   go(pack,s);return;
  }
  const choices=fieldCards(s,q.player).filter(c=>c.uid!==q.sourceUid&&def(pack,c).type==='character');
  hold(s,{...spec,step:'buffOne'},[{type:'aot',mode:'skip'},...choices.map(c=>({type:'aot',mode:'buff',uid:c.uid}))]);
  return;
 }
 if(q.step==='grant010'){
  const target=fieldCards(s,q.player).find(c=>c.uid===a.uid);
  if(!target)throw Error('Attack on Titan grant target left');
  buff(s,target,1000);
  target.aotTriggerUnchosen={turn:s.turn,stamp:target.fieldEntryStamp};
  go(pack,s);return;
 }
 if(q.step==='main36'){
  if(a.mode==='discardBuff'){
   offerDiscard(s,{...spec,data:null},1,false,'buff36');
   s.pending.data.next='buff36';
   return;
  }
  const slot=plOf(s,1-q.player).front.findIndex(c=>c?.uid===a.uid);
  if(slot<0)throw Error('Attack on Titan retire target left');
  if(q.id==='AOT-1-036')use(s,q.sourceUid+'|AOT-1-036|retire');
  A.retire(pack,s,1-q.player,'front',slot);
  go(pack,s);return;
 }
 if(q.step==='baseHand'){
  const index=plOf(s,q.player).outside.findIndex(c=>c.uid===a.uid);
  if(index>=0)A.move(pack,s,{owner:q.player,from:'outside',to:'hand',index,reason:'own-effect',sourceUid:q.sourceUid});
  go(pack,s);return;
 }
 if(q.step==='mode64'){
  if(a.key==='a')start64A(s,spec,false);
  else start64B(s,spec);
  if(!s.pending)go(pack,s);
  return;
 }
 if(q.step==='pair64'){
  if(a.mode==='done'){resolve64(pack,s,q);if(!s.pending)go(pack,s);return;}
  const picked=[...(q.data.picked||[]),a];
  if(picked.length>=2){resolve64(pack,s,{...q,data:{picked}});if(!s.pending)go(pack,s);return;}
  const left=(q.data.actions||[]).filter(x=>x.uid!==a.uid);
  hold(s,{...spec,step:'pair64',data:{picked,actions:left}},[{type:'aot',mode:'done'},...left]);
  return;
 }
 if(q.step==='removeEnergy'){
  const loc=A.location(s,q.player,a.uid);
  if(!loc||loc.line!=='energy')throw Error('Attack on Titan energy card left');
  A.removeRule(pack,s,q.player,'energy',loc.slot);
  const play=q.data.play;
  if(play)doEnter(pack,s,q.player,{...play,from:'hand',line:'energy',slot:loc.slot,ready:true},q.sourceUid,true);
  const raider=selfOf(s,q.player,q.data.raidUid);
  const front=dests(s,q.player,['front']).filter(d=>!d.replaceUid);
  if(raider&&front.length){
   hold(s,{...spec,step:'moveFront',data:{uid:raider.uid,jobs:[...(q.data.jobs||[]),
    ...(play?A.programs(pack,s,selfOf(s,q.player,play.uid),'onPlay',q.player,'handEffect',q.sourceUid):[])],
    dests:front}},[{type:'aot',mode:'skip'},...front.map(d=>({...d,uid:raider.uid}))]);
   return;
  }
  const jobs=[...(q.data.jobs||[])];
  if(play){
   const entered=selfOf(s,q.player,play.uid);
   if(entered)jobs.push(...A.programs(pack,s,entered,'onPlay',q.player,'handEffect',q.sourceUid));
  }
  if(jobs.length)s.effectQueue.unshift(...jobs);
  go(pack,s);return;
 }
 if(q.step==='moveFront'){
  if(a.mode!=='skip')A.moveLine(pack,s,q.player,q.data.uid,a.line,a.slot,a.replaceUid,q.sourceUid);
  if(q.data.jobs?.length)s.effectQueue.unshift(...q.data.jobs);
  go(pack,s);return;
 }
 if(q.step==='fork93'){
  if(a.mode==='draw'){A.draw(pack,s,q.player,1,q.sourceUid);go(pack,s);return;}
  offerDiscard(s,spec,2,false,'retire93');
  if(s.pending)s.pending.data.next='retire93';
  else go(pack,s);
  return;
 }
 if(q.step==='fork94'){
  const self=selfOf(s,q.player,q.sourceUid);
  if(a.mode==='impact'&&self)grantImpact(s,self);
  if(a.mode==='ready'&&self)self.ready=true;
  go(pack,s);return;
 }
 if(q.step==='tuck92'){
  const loc=A.location(s,q.player,a.uid);
  if(!loc)throw Error('Attack on Titan tuck target left');
  const top=plOf(s,q.player)[loc.line][loc.slot];
  plOf(s,q.player)[loc.line][loc.slot]=null;
  const placed=A.clear(top);
  plOf(s,q.player).deck.unshift(placed);
  A.record(pack,s,{physical:placed,owner:q.player,from:loc.line,to:'deck',reason:'own-effect',
   sourceUid:q.sourceUid,deckPosition:'top',revealed:false});
  deployAfter92(s,{owner:q.player,sourceUid:q.sourceUid,id:q.id});
  if(!s.pending)go(pack,s);
  return;
 }
 if(q.step==='special96'){
  const target=fieldCards(s,q.player).find(c=>c.uid===a.uid);
  if(target)target.aotSpecialReplace={turn:s.turn,stamp:target.fieldEntryStamp};
  go(pack,s);return;
 }
 if(q.step==='bottom100'){
  const data=q.data||{built:[],max:3};
  if(a.mode==='bottom')data.built.push(a.uid);
  if(a.mode!=='done'&&data.built.length<data.max){
   const left=plOf(s,q.player).hand.filter(c=>!data.built.includes(c.uid));
   if(left.length){
    hold(s,{...spec,step:'bottom100',data},[{type:'aot',mode:'done'},...left.map(c=>({type:'aot',mode:'bottom',uid:c.uid}))]);
    return;
   }
  }
  for(const uid of data.built){
   const index=plOf(s,q.player).hand.findIndex(c=>c.uid===uid);
   if(index>=0)A.move(pack,s,{owner:q.player,from:'hand',to:'deck',index,reason:'own-effect',
    sourceUid:q.sourceUid,deckPosition:'bottom'});
  }
  if(data.built.length)A.draw(pack,s,q.player,data.built.length,q.sourceUid);
  if(offerReady(s,spec))return;
  go(pack,s);return;
 }
 if(q.step==='mode104'){
  if(a.key==='search'){
   beginLook(s,spec,3,c=>trait(pack,c,CORPS)&&def(pack,c).energy<=3,{max:1,min:0,rest:'bottom'});
   if(!s.pending)go(pack,s);
   return;
  }
  const cards=handWhere(s,q.player,c=>redCorps(pack,c));
  const actions=[];
  for(const c of cards)for(const dest of dests(s,q.player,['front']))
   if(!dest.replaceUid)actions.push({...dest,uid:c.uid,ready:true,from:'hand'});
  if(actions.length)hold(s,{...spec,step:'corps',data:{left:1}},[{type:'aot',mode:'done'},...actions]);
  else go(pack,s);
  return;
 }
 if(q.step==='lifeHand'||q.step==='lifeOut'){
  const index=plOf(s,q.player).life.findIndex(c=>c.uid===a.uid);
  if(index<0)throw Error('Attack on Titan life card left');
  A.move(pack,s,{owner:q.player,from:'life',to:q.step==='lifeHand'?'hand':'outside',index,
   reason:'own-effect',sourceUid:q.sourceUid});
  if(q.step==='lifeHand')buff(s,selfOf(s,q.player,q.sourceUid),1000);
  else if(offerReady(s,spec))return;
  go(pack,s);return;
 }
 if(q.step==='bounceInstead'){
  discard(pack,s,q.player,a.uid,q.sourceUid);
  go(pack,s);return;
 }
 if(q.data?.next==='buff36'){
  buff(s,selfOf(s,q.player,q.sourceUid),1000);
  go(pack,s);return;
 }
 if(q.data?.next==='retire93'){
  offerRetire(s,spec,2000,true);
  if(!s.pending)go(pack,s);
  return;
 }
 throw Error('Attack on Titan could not resolve '+q.step);
}

function underCap(job,c,cap,pack,s){
 return !!c&&A.bp(pack,s,c)<=cap&&(!job.payable||job.payable(c));
}
export function aotMandatoryTargets(pack,s,owner,job){
 arm(pack);
 if(job.id==='AOT-1-033'){
  const cap=cap033(pack,s,owner)+rangeExtra(s,owner);
  return plOf(s,1-owner).front.some(c=>underCap(job,c,cap,pack,s));
 }
 if(job.id==='AOT-1-034'){
  const cap=(fieldCards(s,owner).some(c=>exact(pack,c,LEVI,s))?5000:3000)+rangeExtra(s,owner);
  return plOf(s,1-owner).front.some(c=>underCap(job,c,cap,pack,s));
 }
 if(job.id==='AOT-1-066'){
  const cap=(fieldCards(s,owner).some(c=>contains(pack,c,ZIKE,s))?5000:3000)+rangeExtra(s,owner);
  return plOf(s,1-owner).front.some(c=>underCap(job,c,cap,pack,s));
 }
 if(job.id==='AOT-1-063')return plOf(s,owner).deck.length>0;
 return true;
}
export function aotRaidCut(pack,s,owner,definition){
 if(!definition||definition.color!=='green'||!cardHasTrait(definition,WARRIOR))return 0;
 return plOf(s,owner).front.some(c=>c&&!originalEffectsDisabled(s,c)&&def(pack,c).id==='AOT-1-053'&&
  A.raided(pack,c))?1:0;
}
