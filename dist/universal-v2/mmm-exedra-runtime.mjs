// EX16BT scripts. The engine passes zone helpers; this file does not import it.
// Printed 「まで」 includes zero. A name-once lock is spent only when that
// option is actually used. MMM-2-017's deck-energy cut stacks per unsiled
// copy; no card-page FAQ says otherwise.
import {cardHasName,cardHasTrait,cardCountsAsEvent,distinctTraitEntryNames,
 mamiOutsideEventBonus} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';

const GIRL='魔法少女';
const VILLA='チームみかづき荘';
const MAGIUS='マギウス';
const WING='マギウスの翼';
let A=null;
export function bindMmm2(api){A=api;}

function plOf(s,owner){return s.players[owner];}
function def(pack,c){return A.card(pack,c);}
function live(s,c){return !originalEffectsDisabled(s,c);}
function names(d,name,c,s){return cardHasName(d,name,c?originalEffectsDisabled(s,c):false);}
function ownChars(s,owner,pred){
 return A.field(plOf(s,owner)).filter(c=>def(A.pack,c).type==='character'&&(!pred||pred(c)));
}
function hold(s,spec,actions){
 s.pending={kind:'mmm2',player:spec.player,sourceUid:spec.sourceUid,id:spec.id,
  step:spec.step,actions,data:spec.data||null};
}
function skipDo(actions){return [{type:'mmm2',mode:'skip'},...actions];}
function once(s,owner,key){return s.mainReadyOnceByName[owner].includes(key);}
function lock(s,owner,key){if(!once(s,owner,key))s.mainReadyOnceByName[owner].push(key);}
function used(s,key){return s.mainAbilityUsedUids.includes(key);}
function use(s,key){if(!used(s,key))s.mainAbilityUsedUids.push(key);}
function buff(s,c,bp){c.buffs??=[];c.buffs.push({bp,untilTurn:s.turn});}
function impact(s,c){c.impactGranted={turn:s.turn,stamp:c.fieldEntryStamp,amount:1};}
function damage2(s,c){c.attackDamageGranted={amount:2,turn:s.turn,stamp:c.fieldEntryStamp};}
function energyPlus(pack,s,c){
 const color=def(pack,c).color;
 c.buffs??=[];c.buffs.push({energy:1,untilTurn:s.turn,color});
}
function outsideEvents(s,owner,exceptUid=null){
 return plOf(s,owner).outside.filter(c=>c.uid!==exceptUid&&cardCountsAsEvent(def(A.pack,c))).length+
  mamiOutsideEventBonus(s,owner,c=>def(A.pack,c));
}
function entries(s,owner,trait){
 return distinctTraitEntryNames(s,owner,trait,c=>def(A.pack,c)).size;
}
function fromHand(s,owner,uid){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===uid&&e.owner===owner&&
  e.from==='hand'&&['front','energy'].includes(e.to));
}
function ownEffectEntry(s,uid){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===uid&&e.reason==='own-effect'&&
  ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from));
}
function removedEntry(s,owner){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.controller===owner&&
  e.from==='removed'&&['front','energy'].includes(e.to)&&
  def(A.pack,{uid:e.uid,cardId:e.cardId}).type==='character');
}
function lifeToHand(s,owner){
 return (s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.owner===owner&&e.controller===owner&&
  e.to==='hand'&&(e.from==='life'||(e.from==='lifeRevealed'&&e.reason==='life-trigger')));
}
function girlNames(s,owner,exceptUid=null){
 const names=new Set();
 for(const c of A.field(plOf(s,owner))){
  if(c.uid===exceptUid)continue;
  const d=def(A.pack,c);
  if(d.type==='character'&&cardHasTrait(d,GIRL))names.add(d.name);
 }
 return names.size;
}
function publish(pack,s,owner,physical){
 const d=def(pack,physical);
 s.publicReveals.push({kind:'deck-top',owner,title:A.title(pack,owner),cardId:physical.cardId,
  uid:physical.uid,trigger:d.trigger||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.splice(0,s.publicReveals.length-12);
 A.reveal(pack,s,owner,physical);
}
function moveZone(pack,s,owner,from,uid,to,sourceUid,extra){
 const pl=plOf(s,owner);
 const index=pl[from].findIndex(c=>c.uid===uid);
 if(index<0)throw Error('Madoka vol.2 card left '+from);
 return A.move(pack,s,{owner,from,to,index,reason:'own-effect',sourceUid,...(extra||{})});
}
function offerDeploy(s,spec,cards,ready){
 const pl=plOf(s,spec.player);
 const actions=[];
 for(const c of cards){
  const d=def(A.pack,c);
  for(const line of ['front','energy']){
   if(line==='front'&&d.frontForbidden)continue;
   if(line==='energy'&&(d.energyForbidden||d.energyLineForbidden))continue;
   for(const dest of A.destinations(pl,line)){
    const action={type:'mmm2',uid:c.uid,line,slot:dest.slot};
    if(dest.replaceUid)action.replaceUid=dest.replaceUid;
    actions.push(action);
   }
  }
 }
 if(!actions.length)return false;
 hold(s,{...spec,step:spec.step||'deploy',data:{...(spec.data||{}),ready:ready===true}},skipDo(actions));
 return true;
}
function doDeploy(pack,s,q,a){
 if(a.mode==='skip')return;
 A.enter(pack,s,{owner:q.player,from:q.data.from,uid:a.uid,line:a.line,slot:a.slot,
  replaceUid:a.replaceUid,ready:q.data.ready===true,sourceUid:q.sourceUid});
}
function restSelf(s,owner,c){
 if(!c?.ready)return false;
 A.noteRest(s,owner,c);
 c.ready=false;
 return true;
}
function selfOf(s,owner,uid){
 return A.location(s,owner,uid)?.c||null;
}

function arm(pack){A.pack=pack;}
function start(pack,s,job){
 arm(pack);
 const id=job.id,slot=job.slot,owner=job.owner;
 const self=selfOf(s,owner,job.sourceUid);
 if(id==='MMM-2-001'&&slot==='onPlay')return play001(pack,s,job);
 if(id==='MMM-2-001'&&slot==='onRetire')return retire001(pack,s,job);
 if(id==='MMM-2-003')return play003(pack,s,job);
 if(id==='MMM-2-007')return replay(pack,s,job);
 if(id==='MMM-2-008')return main008(pack,s,job);
 if(id==='MMM-2-009')return play009(pack,s,job);
 if(id==='MMM-2-010')return play010(pack,s,job);
 if(id==='MMM-2-011')return play011(pack,s,job);
 if(id==='MMM-2-012')return job.mode==='mmm2:1'?main012b(pack,s,job):main012a(pack,s,job);
 if(id==='MMM-2-014')return play014(pack,s,job);
 if(id==='MMM-2-016')return job.mode==='mmm2:1'?main016b(pack,s,job):main016a(pack,s,job);
 if(id==='MMM-2-017')return main017(pack,s,job);
 if(id==='MMM-2-018')return play018(pack,s,job);
 if(id==='MMM-2-019')return main019(pack,s,job);
 if(id==='MMM-2-023')return play023(pack,s,job);
 if(id==='MMM-2-025')return main025(pack,s,job);
 if(id==='MMM-2-028')return main028(pack,s,job);
 if(id==='MMM-2-031')return play031(pack,s,job);
 if(id==='MMM-2-032')return play032(pack,s,job);
 if(id==='MMM-2-033')return play033(pack,s,job);
 if(id==='MMM-2-035')return end035(pack,s,job);
 if(id==='MMM-2-038')return attack038(pack,s,job);
 if(id==='MMM-2-040')return main040(pack,s,job);
 if(id==='MMM-2-041'&&slot==='onPlay')return play041(pack,s,job);
 if(id==='MMM-2-041')return attack041(pack,s,job);
 if(id==='MMM-2-043')return main043(pack,s,job);
 if(id==='MMM-2-044')return job.mode==='mmm2:1'?main044b(pack,s,job):main044a(pack,s,job);
 if(id==='MMM-2-045')return play045(pack,s,job);
 if(id==='MMM-2-046')return play046(pack,s,job);
 if(id==='MMM-2-047')return main047(pack,s,job);
 if(id==='MMM-2-049'&&slot==='onPlay')return play049(pack,s,job);
 if(id==='MMM-2-049')return main049(pack,s,job);
 if(id==='MMM-2-051'&&slot==='onPlay')return play051(pack,s,job,self);
 if(id==='MMM-2-051')return main051(pack,s,job);
 if(id==='MMM-2-055')return revealed055(pack,s,job);
 if(id==='MMM-2-056')return play056(pack,s,job);
 if(id==='MMM-2-057')return main057(pack,s,job);
 if(id==='MMM-2-060')return play060(pack,s,job);
 if(id==='MMM-2-061')return play061(pack,s,job);
 if(id==='MMM-2-063')return play063(pack,s,job);
 if(id==='MMM-2-067'&&slot==='onRaided')return raided067(pack,s,job);
 if(id==='MMM-2-067')return unblocked067(pack,s,job);
 if(id==='MMM-2-069')return retire069(pack,s,job);
 if(id==='MMM-2-070')return main070(pack,s,job);
 if(id==='MMM-2-071')return main071(pack,s,job);
 if(id==='MMM-2-072')return main072(pack,s,job);
 if(id==='MMM-2-073')return play073(pack,s,job);
}

function play001(pack,s,job){
 A.draw(pack,s,job.owner,1);
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u001'},
  skipDo(hand.map(c=>({type:'mmm2',uid:c.uid}))));
}
function retire001(pack,s,job){
 const pl=plOf(s,job.owner);
 const index=pl.outside.findIndex(c=>c.uid===job.sourceUid);
 if(index>=0)A.move(pack,s,{owner:job.owner,from:'outside',to:'removed',index,
  reason:'own-effect',sourceUid:job.sourceUid});
 const chars=pl.outside.filter(c=>def(pack,c).type==='character');
 if(!chars.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u001out'},
  skipDo(chars.map(c=>({type:'mmm2',uid:c.uid}))));
}
function play003(pack,s,job){
 const owner=job.owner,keyA='暁美 ほむら|a',keyB='暁美 ほむら|b';
 const ult=ownChars(s,owner,c=>names(def(pack,c),'アルティメットまどか',c,s)).length>0;
 const modes=[];
 if(!once(s,owner,keyA)&&ult&&fromHand(s,owner,job.sourceUid))modes.push('a');
 if(!once(s,owner,keyB))modes.push('b');
 if(!modes.length)return;
 hold(s,{player:owner,sourceUid:job.sourceUid,id:job.id,step:'u003'},
  modes.map(mode=>({type:'mmm2',mode})));
}
function replay(pack,s,job){
 const printed=def(pack,{cardId:job.id});
 const jobs=(printed.effects?.onPlay||[]).map(e=>({...e,owner:job.owner,sourceUid:job.sourceUid}));
 if(jobs.length)s.effectQueue.unshift(...jobs);
}
function main008(pack,s,job){
 A.draw(pack,s,job.owner,1);
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'handOut'},
  hand.map(c=>({type:'mmm2',uid:c.uid})));
}
function play009(pack,s,job){
 const chars=ownChars(s,job.owner);
 const drawN=outsideEvents(s,job.owner,job.sourceUid)>=6?2:1;
 if(!chars.length){A.draw(pack,s,job.owner,drawN);return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u009',
  data:{left:2,drawN,picked:[]}},
  [{type:'mmm2',mode:'done'},...chars.map(c=>({type:'mmm2',uid:c.uid}))]);
}
function play010(pack,s,job){
 const owner=job.owner;
 const madoka=ownChars(s,owner,c=>names(def(pack,c),'鹿目 まどか',c,s)).length>0;
 A.draw(pack,s,owner,madoka?3:2);
 const hand=plOf(s,owner).hand;
 if(!hand.length){
  const index=plOf(s,owner).outside.findIndex(c=>c.uid===job.sourceUid);
  if(index>=0)A.move(pack,s,{owner,from:'outside',to:'removed',index,reason:'own-effect',sourceUid:job.sourceUid});
  return;
 }
 hold(s,{player:owner,sourceUid:job.sourceUid,id:job.id,step:'u010'},
  hand.map(c=>({type:'mmm2',uid:c.uid})));
}
function play011(pack,s,job){
 const hand=plOf(s,job.owner).hand.filter(c=>{
  const d=def(pack,c);
  return d.color==='purple'&&names(d,'アルティメットまどか',c,s);
 });
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u011'},
  skipDo(hand.map(c=>({type:'mmm2',uid:c.uid}))));
}
function main012a(pack,s,job){
 const targets=ownChars(s,job.owner,c=>names(def(pack,c),'鹿目 まどか',c,s));
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u012a'},
  targets.map(c=>({type:'mmm2',uid:c.uid})));
}
function main012b(pack,s,job){
 const pool=plOf(s,job.owner).outside.filter(c=>names(def(pack,c),'鹿目 まどか',c,s));
 if(!pool.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u012b',data:{picked:[],sum:0}},
  pool.map(c=>({type:'mmm2',uid:c.uid})));
}
function play014(pack,s,job){
 if(s.active!==job.owner||!ownEffectEntry(s,job.sourceUid))return;
 const foes=plOf(s,1-job.owner).front.filter(Boolean);
 if(!foes.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u014'},
  skipDo(foes.map(c=>({type:'mmm2',uid:c.uid}))));
}
function main016a(pack,s,job){
 const targets=ownChars(s,job.owner,c=>c.uid!==job.sourceUid&&def(pack,c).energy<=4);
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u016a'},
  targets.map(c=>({type:'mmm2',uid:c.uid})));
}
function main016b(pack,s,job){
 const top=plOf(s,job.owner).deck[0];
 if(!top)return;
 publish(pack,s,job.owner,top);
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u016b',data:{uid:top.uid}},
  [{type:'mmm2',mode:'top'},{type:'mmm2',mode:'outside'}]);
}
function main017(pack,s,job){
 const targets=ownChars(s,job.owner,c=>c.uid!==job.sourceUid);
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'buff'},
  targets.map(c=>({type:'mmm2',uid:c.uid})));
}
function play018(pack,s,job){
 const pool=plOf(s,job.owner).outside.filter(c=>{
  const d=def(pack,c);
  return d.color==='purple'&&d.energy<=1&&d.type==='character'&&
   (names(d,'暁美 ほむら',c,s)||names(d,'鹿目 まどか',c,s));
 });
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u018',data:{homura:false,madoka:false}},
  [{type:'mmm2',mode:'done'},...pool.map(c=>({type:'mmm2',uid:c.uid}))]);
}
function main019(pack,s,job){
 A.draw(pack,s,job.owner,1);
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'handOut'},
  hand.map(c=>({type:'mmm2',uid:c.uid})));
}
function play023(pack,s,job){
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u023'},
  skipDo(hand.map(c=>({type:'mmm2',uid:c.uid}))));
}
function main025(pack,s,job){
 const pl=plOf(s,job.owner);
 const targets=pl.front.filter(c=>c&&c.uid!==job.sourceUid&&cardHasTrait(def(pack,c),VILLA));
 const actions=[];
 for(const c of targets)for(const dest of A.destinations(pl,'energy')){
  const action={type:'mmm2',uid:c.uid,line:'energy',slot:dest.slot};
  if(dest.replaceUid)action.replaceUid=dest.replaceUid;
  actions.push(action);
 }
 if(actions.length)hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'moveLine'},actions);
}
function main028(pack,s,job){
 const chars=ownChars(s,job.owner);
 if(!chars.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'buffMany',data:{left:2}},
  [{type:'mmm2',mode:'done'},...chars.map(c=>({type:'mmm2',uid:c.uid}))]);
}
function play031(pack,s,job){
 if(s.active!==job.owner)return;
 const targets=ownChars(s,job.owner,c=>def(pack,c).energy<=2&&cardHasTrait(def(pack,c),VILLA));
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u031'},
  skipDo(targets.map(c=>({type:'mmm2',uid:c.uid}))));
}
function play032(pack,s,job){
 const cards=plOf(s,job.owner).hand.filter(c=>{
  const d=def(pack,c);
  return d.color==='green'&&d.energy<=3&&d.ap===1&&cardHasTrait(d,VILLA)&&d.type==='character';
 });
 offerDeploy(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,data:{from:'hand'}},cards,false);
}
function play033(pack,s,job){
 if(ownEffectEntry(s,job.sourceUid))A.draw(pack,s,job.owner,1);
}
function end035(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||A.location(s,job.owner,self.uid)?.line!=='energy')return;
 const fronts=plOf(s,job.owner).front.filter(c=>c&&cardHasTrait(def(pack,c),VILLA));
 if(!fronts.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'swap'},
  skipDo(fronts.map(c=>({type:'mmm2',uid:c.uid}))));
}
function attack038(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(!self||once(s,job.owner,'深月 フェリシア|attack'))return;
 if(!plOf(s,1-job.owner).front.some(Boolean))return;
 if(A.bp(pack,s,self)<5000)return;
 lock(s,job.owner,'深月 フェリシア|attack');
 damage2(s,self);
}
function main040(pack,s,job){
 const targets=ownChars(s,job.owner,c=>c.uid!==job.sourceUid&&cardHasTrait(def(pack,c),VILLA));
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'buff'},
  targets.map(c=>({type:'mmm2',uid:c.uid})));
}
function play041(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self)self.mmm2DoubleAttack=s.turn;
}
function attack041(pack,s,job){
 if(entries(s,job.owner,VILLA)<3)return;
 look(pack,s,job,3,'u041');
}
function main043(pack,s,job){
 const targets=ownChars(s,job.owner,c=>c.uid!==job.sourceUid);
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u043'},
  targets.map(c=>({type:'mmm2',uid:c.uid})));
}
function main044a(pack,s,job){
 const top=plOf(s,job.owner).deck[0];
 if(!top)return;
 publish(pack,s,job.owner,top);
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'placeTop'},
  [{type:'mmm2',mode:'top'},{type:'mmm2',mode:'outside'}]);
}
function main044b(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self)A.active(s,job.owner,self);
}
function play045(pack,s,job){
 const foes=plOf(s,1-job.owner).front.filter(Boolean);
 const pl=plOf(s,1-job.owner);
 const actions=[];
 for(const c of foes){
  const slot=pl.front.findIndex(x=>x?.uid===c.uid);
  for(const dest of A.destinations(pl,'energy')){
   const action={type:'mmm2',uid:c.uid,line:'energy',slot:dest.slot,fromSlot:slot};
   if(dest.replaceUid)action.replaceUid=dest.replaceUid;
   actions.push(action);
  }
 }
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u045'},
  [{type:'mmm2',mode:'skip'},...actions]);
}
function play046(pack,s,job){look(pack,s,job,2,'u046');}
function main047(pack,s,job){
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u047'},
  hand.map(c=>({type:'mmm2',uid:c.uid})));
}
function play049(pack,s,job){
 A.draw(pack,s,job.owner,2);
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'handPlace'},
  hand.flatMap(c=>[{type:'mmm2',uid:c.uid,mode:'top'},{type:'mmm2',uid:c.uid,mode:'outside'}]));
}
function main049(pack,s,job){
 A.draw(pack,s,job.owner,1);
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'handTop'},
  hand.map(c=>({type:'mmm2',uid:c.uid})));
}
function play051(pack,s,job,self){
 if(!self||A.location(s,job.owner,self.uid)?.line!=='energy')return;
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u051'},
  skipDo(hand.map(c=>({type:'mmm2',uid:c.uid}))));
}
function main051(pack,s,job){
 const top=plOf(s,job.owner).deck[0];
 if(!top)return;
 const energy=A.deckEnergy(pack,s,job.owner,def(pack,top));
 publish(pack,s,job.owner,top);
 moveZone(pack,s,job.owner,'deck',top.uid,'hand',job.sourceUid);
 if(energy>=5)plOf(s,job.owner).nextPrintedEnergyApCut={turn:s.turn,amount:1};
}
function revealed055(pack,s,job){
 if(once(s,job.owner,'梓 みふゆ|revealed'))return;
 const targets=ownChars(s,job.owner,c=>cardHasTrait(def(pack,c),MAGIUS));
 if(!targets.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u055'},
  skipDo(targets.map(c=>({type:'mmm2',uid:c.uid}))));
}
function play056(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self)A.active(s,job.owner,self);
 if(distinctTraitEntryNames(s,job.owner,MAGIUS,c=>def(pack,c)).size<3&&
  ownChars(s,job.owner,c=>cardHasTrait(def(pack,c),MAGIUS))
   .reduce((n,c)=>n.add(def(pack,c).name),new Set()).size<3)return;
 const names=new Set(ownChars(s,job.owner,c=>cardHasTrait(def(pack,c),MAGIUS)).map(c=>def(pack,c).name));
 if(names.size<3)return;
 const modes=[];
 if(!once(s,job.owner,'ホーリーマミ|a'))modes.push('a');
 if(!once(s,job.owner,'ホーリーマミ|b'))modes.push('b');
 if(!modes.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u056'},
  modes.map(mode=>({type:'mmm2',mode})));
}
function offer057(pack,s,job){
 const cards=[...plOf(s,job.owner).hand,...plOf(s,job.owner).outside].filter(c=>{
  const d=def(pack,c);
  return d.type==='character'&&d.color==='green'&&d.energy<=0&&cardHasTrait(d,VILLA)&&
   d.name!=='チームみかづき荘ー！';
 });
 offerDeploy(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,data:{from:'either'}},cards,false);
}
function main057(pack,s,job){
 const self=selfOf(s,job.owner,job.sourceUid);
 if(self?.ready)restSelf(s,job.owner,self);
 const loc=A.location(s,job.owner,job.sourceUid);
 if(loc)A.retire(pack,s,job.owner,loc.line,loc.slot);
 if(s.pending){
  s.effectQueue.push({op:'mmm2',id:'MMM-2-057',slot:'after',owner:job.owner,sourceUid:job.sourceUid});
  return;
 }
 offer057(pack,s,job);
}
function play060(pack,s,job){look(pack,s,job,4,'u060');}
function play061(pack,s,job){
 const count=A.field(plOf(s,job.owner)).reduce((n,c)=>{
  const d=def(pack,c);
  return n+(cardHasTrait(d,MAGIUS)?1:0)+(cardHasTrait(d,WING)?1:0);
 },0);
 const ceiling=count*1000;
 const foes=(plOf(s,1-job.owner).front||[]).filter(c=>c&&A.bp(pack,s,c)<=ceiling);
 if(!foes.length){drawDiscard(pack,s,job);return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u061'},
  foes.map(c=>({type:'mmm2',uid:c.uid})));
}
function play063(pack,s,job){
 const hand=plOf(s,job.owner).hand;
 if(!hand.length){lookOne(pack,s,job);return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u063'},
  skipDo(hand.map(c=>({type:'mmm2',uid:c.uid}))));
}
function raided067(pack,s,job){
 const chars=ownChars(s,job.owner);
 if(!chars.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u067'},
  skipDo(chars.map(c=>({type:'mmm2',uid:c.uid}))));
}
function unblocked067(pack,s,job){
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'drawOpt'},
  [{type:'mmm2',mode:'skip'},{type:'mmm2',mode:'do'}]);
}
function retire069(pack,s,job){
 if(girlNames(s,job.owner,job.sourceUid)<4)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u069'},
  [{type:'mmm2',mode:'skip'},{type:'mmm2',mode:'do'}]);
}
function main070(pack,s,job){
 A.draw(pack,s,job.owner,1);
 A.toLife(pack,s,job.owner,job.sourceUid);
}
function main071(pack,s,job){
 const life=plOf(s,job.owner).life;
 if(!life.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u071'},
  life.map(c=>({type:'mmm2',uid:c.uid})));
}
function main072(pack,s,job){
 const modes=['a'];
 if(girlNames(s,job.owner,job.sourceUid)>=4||lifeToHand(s,job.owner))modes.push('b');
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u072',data:{picked:[]}},
  [{type:'mmm2',mode:'done'},...modes.map(mode=>({type:'mmm2',mode}))]);
}
function play073(pack,s,job){
 A.draw(pack,s,job.owner,1);
 const girls=ownChars(s,job.owner,c=>cardHasTrait(def(pack,c),GIRL));
 const many=girlNames(s,job.owner)>=5;
 if(!girls.length){if(many)A.readyAp(plOf(s,job.owner));return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'u073',data:{many}},
  skipDo(girls.map(c=>({type:'mmm2',uid:c.uid}))));
}

function look(pack,s,job,count,step){
 const uids=plOf(s,job.owner).deck.slice(0,count).map(c=>c.uid);
 if(!uids.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step,data:{uids,picked:[]}},
  [{type:'mmm2',mode:'done'},...uids.map(uid=>({type:'mmm2',uid}))]);
}
function lookOne(pack,s,job){
 const top=plOf(s,job.owner).deck[0];
 if(!top){A.draw(pack,s,job.owner,1);return;}
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'placeOne'},
  [{type:'mmm2',mode:'top'},{type:'mmm2',mode:'bottom'}]);
}
function drawDiscard(pack,s,job){
 A.draw(pack,s,job.owner,1);
 const hand=plOf(s,job.owner).hand;
 if(!hand.length)return;
 hold(s,{player:job.owner,sourceUid:job.sourceUid,id:job.id,step:'handOut'},
  hand.map(c=>({type:'mmm2',uid:c.uid})));
}

const STEPS={
 u001(pack,s,q,a){
  if(a.mode==='skip')return;
  moveZone(pack,s,q.player,'hand',a.uid,'removed',q.sourceUid);
  const cards=plOf(s,q.player).removed.filter(c=>{
   const d=def(pack,c);
   return d.type==='character'&&d.color==='yellow'&&d.energy<=3&&d.ap===1&&
    cardHasTrait(d,GIRL)&&!names(d,'鹿目 まどか',null,s);
  });
  offerDeploy(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:{from:'removed'}},cards,false);
 },
 u001out(pack,s,q,a){
  if(a.mode==='skip')return;
  moveZone(pack,s,q.player,'outside',a.uid,'removed',q.sourceUid);
 },
 u003(pack,s,q,a){
  if(a.mode==='a'){lock(s,q.player,'暁美 ほむら|a');A.draw(pack,s,q.player,1);return;}
  lock(s,q.player,'暁美 ほむら|b');
  const pool=plOf(s,q.player).removed.filter(c=>names(def(pack,c),'アルティメットまどか',c,s));
  if(!pool.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u003b'},
   skipDo(pool.map(c=>({type:'mmm2',uid:c.uid}))));
 },
 u003b(pack,s,q,a){
  if(a.mode==='skip')return;
  moveZone(pack,s,q.player,'removed',a.uid,'outside',q.sourceUid);
  const foes=plOf(s,1-q.player).front.filter(Boolean);
  if(!foes.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'restFoe'},
   skipDo(foes.map(c=>({type:'mmm2',uid:c.uid}))));
 },
 handOut(pack,s,q,a){
  moveZone(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
 },
 u009(pack,s,q,a){
  const data=q.data;
  if(a.mode!=='done'&&data.left>0){
   const c=ownChars(s,q.player).find(x=>x.uid===a.uid);
   if(!c||data.picked.includes(a.uid))throw Error('Illegal villa buff');
   buff(s,c,2000);data.picked.push(a.uid);data.left--;
   if(data.left>0){
    const left=ownChars(s,q.player).filter(x=>!data.picked.includes(x.uid));
    hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u009',data},
     [{type:'mmm2',mode:'done'},...left.map(x=>({type:'mmm2',uid:x.uid}))]);
    return;
   }
  }
  A.draw(pack,s,q.player,data.drawN);
 },
 u010(pack,s,q,a){
  moveZone(pack,s,q.player,'hand',a.uid,'removed',q.sourceUid);
  const index=plOf(s,q.player).outside.findIndex(c=>c.uid===q.sourceUid);
  if(index>=0)A.move(pack,s,{owner:q.player,from:'outside',to:'removed',index,
   reason:'own-effect',sourceUid:q.sourceUid});
 },
 u011(pack,s,q,a){
  if(a.mode==='skip')return;
  moveZone(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
  const cards=[...plOf(s,q.player).hand,...plOf(s,q.player).outside].filter(c=>{
   const d=def(pack,c);return d.type==='character'&&d.color==='purple'&&d.energy<=1;
  });
  const spec={player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u011b',data:{from:'either'}};
  const pl=plOf(s,q.player),actions=[];
  for(const c of cards){
   const from=pl.hand.some(x=>x.uid===c.uid)?'hand':'outside';
   for(const line of ['front','energy']){
    const d=def(pack,c);
    if(line==='energy'&&(d.energyForbidden||d.energyLineForbidden))continue;
    for(const dest of A.destinations(pl,line)){
     const action={type:'mmm2',uid:c.uid,line,slot:dest.slot,from};
     if(dest.replaceUid)action.replaceUid=dest.replaceUid;
     actions.push(action);
    }
   }
  }
  if(!actions.length)return;
  hold(s,spec,skipDo(actions));
 },
 u011b(pack,s,q,a){
  if(a.mode==='skip')return;
  A.enter(pack,s,{owner:q.player,from:a.from,uid:a.uid,line:a.line,slot:a.slot,
   replaceUid:a.replaceUid,ready:false,sourceUid:q.sourceUid});
  const madoka=ownChars(s,q.player,c=>names(def(pack,c),'鹿目 まどか',c,s));
  if(!madoka.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u011c'},
   skipDo(madoka.map(c=>({type:'mmm2',uid:c.uid}))));
 },
 u011c(pack,s,q,a){
  if(a.mode==='skip')return;
  const c=ownChars(s,q.player).find(x=>x.uid===a.uid);
  if(!c)throw Error('Madoka left');
  A.active(s,q.player,c);buff(s,c,2500);
 },
 u012a(pack,s,q,a){
  A.bounce(pack,s,q.player,a.uid,q.sourceUid);
  look(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id},2,'u012look');
 },
 u012look(pack,s,q,a){
  const data=q.data;
  if(a.mode!=='done'&&!data.picked.length){
   moveZone(pack,s,q.player,'deck',a.uid,'hand',q.sourceUid);
   data.picked.push(a.uid);
  }
  const left=plOf(s,q.player).deck.filter(c=>data.uids.includes(c.uid)&&!data.picked.includes(c.uid));
  for(const c of left)moveZone(pack,s,q.player,'deck',c.uid,'outside',q.sourceUid);
 },
 u012b(pack,s,q,a){
  const data=q.data,d=def(pack,plOf(s,q.player).outside.find(c=>c.uid===a.uid)||{});
  if(data.bottomAt===undefined)data.bottomAt=plOf(s,q.player).deck.length;
  A.toDeckBottom(pack,s,q.player,'outside',a.uid,q.sourceUid,data.bottomAt);
  data.picked.push(a.uid);data.sum+=d.energy||0;
  if(data.sum>=4){
   const self=selfOf(s,q.player,q.sourceUid);
   if(self)A.active(s,q.player,self);
   return;
  }
  const pool=plOf(s,q.player).outside.filter(c=>names(def(pack,c),'鹿目 まどか',c,s));
  if(!pool.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u012b',data},
   pool.map(c=>({type:'mmm2',uid:c.uid})));
 },
 u014(pack,s,q,a){
  if(a.mode==='skip')return;
  const c=plOf(s,1-q.player).front.find(x=>x?.uid===a.uid);
  if(!c)throw Error('Front left');
  c.buffs??=[];c.buffs.push({bp:-1000,untilTurn:s.turn});
 },
 u016a(pack,s,q,a){
  const loc=A.location(s,q.player,a.uid);
  if(!loc||def(pack,loc.c).energy>4||a.uid===q.sourceUid)throw Error('Illegal retire');
  s.effectQueue.push({op:'mmm2',id:'MMM-2-016',slot:'after',owner:q.player,sourceUid:q.sourceUid});
  A.retire(pack,s,q.player,loc.line,loc.slot);
 },
 after(pack,s,job){
  A.draw(pack,s,job.owner,1);
  const self=selfOf(s,job.owner,job.sourceUid);
  if(self)A.active(s,job.owner,self);
 },
 u016b(pack,s,q,a){
  const top=plOf(s,q.player).deck[0];
  if(!top||top.uid!==q.data.uid)throw Error('Revealed top changed');
  const printed=def(pack,top);
  const energy=printed.color==='purple'?A.deckEnergy(pack,s,q.player,printed):null;
  if(a.mode==='outside')moveZone(pack,s,q.player,'deck',top.uid,'outside',q.sourceUid);
  const self=selfOf(s,q.player,q.sourceUid);
  if(self&&energy!==null){
   self.mmm2Block={turn:s.turn,atLeast:energy<=2?4000:0,atMost:energy<=1?2000:0};
  }
 },
 buff(pack,s,q,a){
  const c=ownChars(s,q.player).find(x=>x.uid===a.uid);
  if(!c)throw Error('Buff target left');
  buff(s,c,1000);
 },
 u018(pack,s,q,a){
  const data=q.data;
  if(a.mode==='done'){
   if(plOf(s,q.player).front.some(c=>c&&names(def(pack,c),'悪魔ほむら',c,s)))
    A.readyAp(plOf(s,q.player));
   return;
  }
  const c=plOf(s,q.player).outside.find(x=>x.uid===a.uid);
  const d=c&&def(pack,c);
  const homura=d&&names(d,'暁美 ほむら',c,s);
  const madoka=d&&names(d,'鹿目 まどか',c,s);
  if(!c||d.color!=='purple'||d.energy>1||(homura&&data.homura)||(madoka&&data.madoka)||(!homura&&!madoka))
   throw Error('Illegal pair entry');
  data.homura=data.homura||homura;data.madoka=data.madoka||madoka;
  const opened=offerDeploy(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u018enter',data},[c],false);
  if(!opened)return finish018(pack,s,q);
 },
 u018enter(pack,s,q,a){
  if(a.mode!=='skip')A.enter(pack,s,{owner:q.player,from:'outside',uid:a.uid,line:a.line,
   slot:a.slot,replaceUid:a.replaceUid,ready:false,sourceUid:q.sourceUid});
  const data=q.data;
  const pool=plOf(s,q.player).outside.filter(c=>{
   const d=def(pack,c);
   if(d.color!=='purple'||d.energy>1||d.type!=='character')return false;
   if(names(d,'暁美 ほむら',c,s)&&!data.homura)return true;
   if(names(d,'鹿目 まどか',c,s)&&!data.madoka)return true;
   return false;
  });
  if(data.homura&&data.madoka||!pool.length){finish018(pack,s,q);return;}
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u018',data},
   [{type:'mmm2',mode:'done'},...pool.map(c=>({type:'mmm2',uid:c.uid}))]);
 },
 u023(pack,s,q,a){
  if(a.mode==='skip')return;
  moveZone(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
  const cards=plOf(s,q.player).outside.filter(c=>{
   const d=def(pack,c);
   return d.color==='green'&&d.energy<=3&&d.ap===1&&names(d,'呉 キリカ',c,s);
  });
  offerDeploy(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:{from:'outside'}},cards,false);
 },
 moveLine(pack,s,q,a){
  A.moveLine(pack,s,q.player,a.uid,a.line,a.slot,a.replaceUid,q.sourceUid);
 },
 buffMany(pack,s,q,a){
  const data=q.data;
  if(a.mode==='done')return;
  const c=ownChars(s,q.player).find(x=>x.uid===a.uid);
  if(!c)throw Error('Buff target left');
  buff(s,c,1000);data.left--;
  if(data.left<=0)return;
  const left=ownChars(s,q.player).filter(x=>x.uid!==a.uid);
  if(!left.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'buffMany',data},
   [{type:'mmm2',mode:'done'},...left.map(x=>({type:'mmm2',uid:x.uid}))]);
 },
 u031(pack,s,q,a){
  if(a.mode==='skip')return;
  A.bounce(pack,s,q.player,a.uid,q.sourceUid);
  const cards=plOf(s,q.player).hand.filter(c=>{
   const d=def(pack,c);
   return d.color==='green'&&d.energy<=3&&d.ap===1&&cardHasTrait(d,VILLA)&&d.type==='character';
  });
  offerDeploy(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,data:{from:'hand'}},cards,false);
 },
 swap(pack,s,q,a){
  if(a.mode==='skip')return;
  const self=A.location(s,q.player,q.sourceUid);
  const other=A.location(s,q.player,a.uid);
  if(!self||self.line!=='energy'||!other||other.line!=='front')throw Error('Swap left its lines');
  const pl=plOf(s,q.player);
  pl.energy[self.slot]=other.c;pl.front[other.slot]=self.c;
  A.record(pack,s,{physical:self.c,owner:q.player,from:'energy',to:'front',reason:'own-effect',sourceUid:q.sourceUid});
  A.record(pack,s,{physical:other.c,owner:q.player,from:'front',to:'energy',reason:'own-effect',sourceUid:q.sourceUid});
 },
 u041(pack,s,q,a){takeWindow(pack,s,q,a,1,c=>cardHasTrait(def(pack,c),VILLA),'bottom');},
 u043(pack,s,q,a){
  const loc=A.location(s,q.player,a.uid);
  if(!loc||a.uid===q.sourceUid)throw Error('Illegal deck-top character');
  A.toDeckTop(pack,s,q.player,a.uid,q.sourceUid);
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)buff(s,self,2000);
 },
 u045(pack,s,q,a){
  if(a.mode!=='skip'){
   const foe=1-q.player;
   A.moveLine(pack,s,foe,a.uid,'energy',a.slot,a.replaceUid,q.sourceUid);
  }
  const top=plOf(s,q.player).deck[0];
  if(!top)return;
  const energy=A.deckEnergy(pack,s,q.player,def(pack,top));
  publish(pack,s,q.player,top);
  moveZone(pack,s,q.player,'deck',top.uid,'hand',q.sourceUid);
  if(energy<5)return;
  const energies=plOf(s,foeOf(q)).energy.filter(Boolean);
  if(!energies.length)return;
  hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u045lock'},
   skipDo(energies.map(c=>({type:'mmm2',uid:c.uid}))));
 },
 u045lock(pack,s,q,a){
  if(a.mode==='skip')return;
  A.lockMove(s,q.player,q.sourceUid,a.uid);
 },
 u046(pack,s,q,a){takeWindow(pack,s,q,a,1,c=>{
  const d=def(pack,c);return cardHasTrait(d,MAGIUS)||cardHasTrait(d,WING);
 },'top',true);},
 u047(pack,s,q,a){
  moveZone(pack,s,q.player,'hand',a.uid,'deck',q.sourceUid,{deckPosition:'top',revealed:false});
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)energyPlus(pack,s,self);
 },
 handPlace(pack,s,q,a){
  moveZone(pack,s,q.player,'hand',a.uid,a.mode==='outside'?'outside':'deck',q.sourceUid,
   a.mode==='top'?{deckPosition:'top',revealed:false}:undefined);
 },
 handTop(pack,s,q,a){
  moveZone(pack,s,q.player,'hand',a.uid,'deck',q.sourceUid,{deckPosition:'top',revealed:false});
 },
 u051(pack,s,q,a){
  if(a.mode==='skip')return;
  moveZone(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)A.active(s,q.player,self);
 },
 u055(pack,s,q,a){
  if(a.mode==='skip')return;
  const c=ownChars(s,q.player).find(x=>x.uid===a.uid&&cardHasTrait(def(pack,x),MAGIUS));
  if(!c)throw Error('Magius left');
  lock(s,q.player,'梓 みふゆ|revealed');
  buff(s,c,1000);impact(s,c);
 },
 u056(pack,s,q,a){
  const self=selfOf(s,q.player,q.sourceUid);
  if(a.mode==='a'){
   lock(s,q.player,'ホーリーマミ|a');
   A.readyAp(plOf(s,q.player));
   if(self)buff(s,self,1000);
  }else{
   lock(s,q.player,'ホーリーマミ|b');
   if(self){buff(s,self,1000);impact(s,self);}
  }
 },
 deploy(pack,s,q,a){
  if(a.mode==='skip')return;
  const from=q.data.from==='either'
   ?(plOf(s,q.player).hand.some(c=>c.uid===a.uid)?'hand':'outside'):q.data.from;
  A.enter(pack,s,{owner:q.player,from,uid:a.uid,line:a.line,slot:a.slot,
   replaceUid:a.replaceUid,ready:q.data.ready===true,sourceUid:q.sourceUid});
 },
 u060(pack,s,q,a){takeWindow(pack,s,q,a,2,()=>true,'top');},
 u061(pack,s,q,a){
  const foe=1-q.player,loc=A.location(s,foe,a.uid);
  if(!loc)throw Error('Front left');
  A.retire(pack,s,foe,loc.line,loc.slot);
  if(!s.pending)drawDiscard(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id});
  else s.effectQueue.push({op:'mmm2',id:'MMM-2-061',slot:'after',owner:q.player,sourceUid:q.sourceUid});
 },
 u063(pack,s,q,a){
  if(a.mode!=='skip')moveZone(pack,s,q.player,'hand',a.uid,'outside',q.sourceUid);
  lookOne(pack,s,{owner:q.player,sourceUid:q.sourceUid,id:q.id});
 },
 placeOne(pack,s,q,a){
  const pl=plOf(s,q.player);
  if(pl.deck.length&&a.mode==='bottom')pl.deck.push(pl.deck.shift());
  A.draw(pack,s,q.player,1);
 },
 placeTop(pack,s,q,a){
  const top=plOf(s,q.player).deck[0];
  if(top&&a.mode==='outside')moveZone(pack,s,q.player,'deck',top.uid,'outside',q.sourceUid);
 },
 u067(pack,s,q,a){
  if(a.mode==='skip')return;
  const c=ownChars(s,q.player).find(x=>x.uid===a.uid);
  if(!c)throw Error('Grant target left');
  c.mmm2UnblockedDraw={turn:s.turn,stamp:c.fieldEntryStamp,optional:true};
 },
 drawOpt(pack,s,q,a){if(a.mode==='do')A.draw(pack,s,q.player,1);},
 u069(pack,s,q,a){
  if(a.mode!=='do')return;
  const printed=def(pack,{cardId:'MMM-2-069'});
  s.effectQueue.unshift(...(printed.effects.onPlay||[]).map(e=>({...e,owner:q.player,sourceUid:q.sourceUid})));
 },
 u071(pack,s,q,a){
  const index=plOf(s,q.player).life.findIndex(c=>c.uid===a.uid);
  if(index<0)throw Error('Life card left');
  A.move(pack,s,{owner:q.player,from:'life',to:'hand',index,reason:'own-effect',sourceUid:q.sourceUid});
  const self=selfOf(s,q.player,q.sourceUid);
  if(self)buff(s,self,2000);
 },
 u072(pack,s,q,a){
  const data=q.data;
  if(a.mode!=='done'){
   if(data.picked.includes(a.mode)||data.picked.length>=2)throw Error('Repeated option');
   data.picked.push(a.mode);
   const left=['a','b'].filter(m=>!data.picked.includes(m)&&
    (m==='a'||girlNames(s,q.player,q.sourceUid)>=4||lifeToHand(s,q.player)));
   if(data.picked.length<2&&left.length){
    hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'u072b',data},
     [{type:'mmm2',mode:'done'},...left.map(mode=>({type:'mmm2',mode}))]);
    return;
   }
  }
  apply072(pack,s,q,data.picked);
 },
 u072b(pack,s,q,a){
  if(a.mode!=='done')q.data.picked.push(a.mode);
  apply072(pack,s,q,q.data.picked);
 },
 u073(pack,s,q,a){
  if(a.mode!=='skip'){
   const c=ownChars(s,q.player).find(x=>x.uid===a.uid);
   if(!c||!cardHasTrait(def(pack,c),GIRL))throw Error('Girl left');
   buff(s,c,2000);
   if(names(def(pack,c),'鹿目 まどか',c,s))impact(s,c);
  }
  if(q.data.many||girlNames(s,q.player)>=5)A.readyAp(plOf(s,q.player));
 },
 restFoe(pack,s,q,a){
  if(a.mode==='skip')return;
  const c=plOf(s,1-q.player).front.find(x=>x?.uid===a.uid);
  if(!c?.ready)return;
  A.noteRest(s,1-q.player,c);c.ready=false;
 }
};

function foeOf(q){return 1-q.player;}
function finish018(pack,s,q){
 if(plOf(s,q.player).front.some(c=>c&&names(def(pack,c),'悪魔ほむら',c,s)))
  A.readyAp(plOf(s,q.player));
}
function takeWindow(pack,s,q,a,max,ok,rest,toOutside){
 const data=q.data;
 if(a.mode!=='done'&&data.picked.length<max){
  const c=plOf(s,q.player).deck.find(x=>x.uid===a.uid);
  if(!c||!data.uids.includes(a.uid)||data.picked.includes(a.uid)||!ok(c))
   throw Error('Illegal looked card');
  const to=toOutside?'outside':'hand';
  moveZone(pack,s,q.player,'deck',a.uid,to,q.sourceUid);
  data.picked.push(a.uid);
  if(data.picked.length<max){
   const left=plOf(s,q.player).deck.filter(x=>data.uids.includes(x.uid)&&ok(x));
   if(left.length){
    hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:q.step,data},
     [{type:'mmm2',mode:'done'},...left.map(x=>({type:'mmm2',uid:x.uid}))]);
    return;
   }
  }
 }
 const pl=plOf(s,q.player);
 const left=pl.deck.filter(c=>data.uids.includes(c.uid));
 if(rest==='top'||!left.length)return;
 const ids=new Set(left.map(c=>c.uid));
 const kept=[],moved=[];
 for(const c of pl.deck)(ids.has(c.uid)?moved:kept).push(c);
 pl.deck=[...kept,...moved];
}
function apply072(pack,s,q,picked){
 const order=['a','b'].filter(m=>picked.includes(m));
 const self=selfOf(s,q.player,q.sourceUid);
 if(order.includes('a')&&self)buff(s,self,1000);
 if(!order.includes('b'))return;
 const targets=ownChars(s,q.player,c=>c.uid!==q.sourceUid);
 if(!targets.length)return;
 hold(s,{player:q.player,sourceUid:q.sourceUid,id:q.id,step:'buff'},
  targets.map(c=>({type:'mmm2',uid:c.uid})));
}

export function runMmm2Job(pack,s,job){
 arm(pack);
 if(job.slot==='after'&&job.id==='MMM-2-016')return STEPS.after(pack,s,job);
 if(job.slot==='after'&&job.id==='MMM-2-057')return offer057(pack,s,job);
 if(job.slot==='after'&&job.id==='MMM-2-061')return drawDiscard(pack,s,job);
 start(pack,s,job);
}
export function legalMmm2Pending(pack,s){
 arm(pack);
 const actions=s.pending?.actions;
 if(!Array.isArray(actions)||!actions.length)throw Error('Madoka vol.2 choice has no legal action');
 return actions;
}
export function resolveMmm2Pending(pack,s,action){
 arm(pack);
 const q=s.pending;
 const step=STEPS[q.step];
 if(!step)throw Error('Unknown Madoka vol.2 choice');
 s.pending=null;
 step(pack,s,q,action);
 if(!s.pending)A.go(pack,s);
}
export function legalMmm2Activations(pack,s,owner,c){
 arm(pack);
 const d=def(pack,c);
 if(d.mainAbility?.op!=='mmm2Main'||originalEffectsDisabled(s,c))return [];
 const id=d.id,loc=A.location(s,owner,c.uid),out=[];
 const front=loc?.line==='front';
 const push=(mode,ok=true)=>{if(ok)out.push({type:'activate',uid:c.uid,mode});};
 if(id==='MMM-2-007')push('mmm2:0',c.ready&&!used(s,c.uid+'|replay')&&outsideEvents(s,owner)>=6);
 if(id==='MMM-2-008')push('mmm2:0',c.ready&&!once(s,owner,'美樹 さやか|removed')&&removedEntry(s,owner));
 if(id==='MMM-2-012'){
  push('mmm2:0',front&&!used(s,c.uid+'|bounce')&&
   ownChars(s,owner,x=>names(def(pack,x),'鹿目 まどか',x,s)).length>0);
  push('mmm2:1',!once(s,owner,'悪魔ほむら|bottom')&&
   plOf(s,owner).outside.some(x=>names(def(pack,x),'鹿目 まどか',x,s)));
 }
 if(id==='MMM-2-016'){
  push('mmm2:0',!used(s,c.uid+'|retire')&&
   ownChars(s,owner,x=>x.uid!==c.uid&&def(pack,x).energy<=4).length>0);
  push('mmm2:1',front&&!used(s,c.uid+'|reveal')&&plOf(s,owner).deck.length>0);
 }
 if(id==='MMM-2-017')push('mmm2:0',c.ready&&ownChars(s,owner,x=>x.uid!==c.uid).length>0);
 if(id==='MMM-2-019')push('mmm2:0',c.ready);
 if(id==='MMM-2-025')push('mmm2:0',!used(s,c.uid+'|move')&&
  plOf(s,owner).front.some(x=>x&&x.uid!==c.uid&&cardHasTrait(def(pack,x),VILLA)));
 if(id==='MMM-2-028')push('mmm2:0',front&&!used(s,c.uid+'|buff'));
 if(id==='MMM-2-040')push('mmm2:0',c.ready&&
  ownChars(s,owner,x=>x.uid!==c.uid&&cardHasTrait(def(pack,x),VILLA)).length>0);
 if(id==='MMM-2-043')push('mmm2:0',front&&!used(s,c.uid+'|top')&&
  ownChars(s,owner,x=>x.uid!==c.uid).length>0);
 if(id==='MMM-2-044'){
  push('mmm2:0',front&&!used(s,c.uid+'|reveal')&&plOf(s,owner).deck.length>0);
  push('mmm2:1',!once(s,owner,'アリナ・グレイ|active')&&plOf(s,owner).deckRevealEnergy5===s.turn);
 }
 if(id==='MMM-2-047')push('mmm2:0',!used(s,c.uid+'|top')&&plOf(s,owner).hand.length>0);
 if(id==='MMM-2-049')push('mmm2:0',front&&!used(s,c.uid+'|draw'));
 if(id==='MMM-2-051')push('mmm2:0',c.ready&&!used(s,c.uid+'|reveal')&&
  plOf(s,owner).apCards.filter(x=>x.ready).length>=1&&plOf(s,owner).deck.length>0);
 if(id==='MMM-2-057')push('mmm2:0',c.ready);
 if(id==='MMM-2-070')push('mmm2:0',c.ready&&!once(s,owner,'美樹 さやか|life')&&lifeToHand(s,owner));
 if(id==='MMM-2-071')push('mmm2:0',!used(s,c.uid+'|life')&&plOf(s,owner).life.length>0);
 if(id==='MMM-2-072')push('mmm2:0',!used(s,c.uid+'|two'));
 return out;
}
export function activateMmm2(pack,s,action){
 arm(pack);
 const owner=s.active,c=selfOf(s,owner,action.uid);
 if(!c)throw Error('Madoka vol.2 activator left');
 const key={
  'mmm2:0':{'MMM-2-007':c.uid+'|replay','MMM-2-012':c.uid+'|bounce','MMM-2-016':c.uid+'|retire',
   'MMM-2-025':c.uid+'|move','MMM-2-028':c.uid+'|buff','MMM-2-043':c.uid+'|top',
   'MMM-2-044':c.uid+'|reveal','MMM-2-047':c.uid+'|top','MMM-2-049':c.uid+'|draw',
   'MMM-2-051':c.uid+'|reveal','MMM-2-071':c.uid+'|life','MMM-2-072':c.uid+'|two'}[def(pack,c).id],
  'mmm2:1':{'MMM-2-016':c.uid+'|reveal'}[def(pack,c).id]
 }[action.mode];
 if(key)use(s,key);
 if(def(pack,c).id==='MMM-2-008')lock(s,owner,'美樹 さやか|removed');
 if(def(pack,c).id==='MMM-2-044'&&action.mode==='mmm2:1')lock(s,owner,'アリナ・グレイ|active');
 if(def(pack,c).id==='MMM-2-070')lock(s,owner,'美樹 さやか|life');
 if(def(pack,c).id==='MMM-2-012'&&action.mode==='mmm2:1')lock(s,owner,'悪魔ほむら|bottom');
 if(['MMM-2-007','MMM-2-008','MMM-2-017','MMM-2-019','MMM-2-040','MMM-2-051','MMM-2-057','MMM-2-070']
  .includes(def(pack,c).id)){
  if(def(pack,c).id==='MMM-2-051')A.spendAp(plOf(s,owner),1);
  if(def(pack,c).id!=='MMM-2-057')restSelf(s,owner,c);
 }
 start(pack,s,{id:def(pack,c).id,slot:'main',owner,sourceUid:c.uid,mode:action.mode});
 if(!s.pending)A.go(pack,s);
}
