// UNIVERSAL RULES V2 EXPERIMENT. No production title uses this reducer yet.
// Pure physical-card reducer: common UA zones/AP/phases/limited effects/Raid
// and official Q99 optional GET/DRAW/FINAL. Unsupported keywords FAIL CLOSED.
import {validateUniversalDeck} from './pack.mjs';
export const UNIVERSAL_V2_VERSION='ua-v2.0';
const playerIndex=n=>n===0||n===1;
const field=p=>[...p.front,...p.energy].filter(Boolean);
// A match accepts one legacy pack or a pair of independently registered packs.
// Card ownership is determined by the physical UID, never by card ID alone:
// different titles may print identical local card identifiers.
function playerPacks(pack){
 const result=Array.isArray(pack)?pack:[pack,pack];
 if(result.length!==2||result.some(p=>p?.kind!=='ua-v2-pack'))
  throw Error('Expected one valid pack or a pair of registered title packs');
 return result;
}
const card=(pack,c)=>{
 const n=/^([01])-\d+$/.exec(c?.uid||'');
 if(!n)throw Error('Card owner cannot be determined from physical UID');
 const printed=playerPacks(pack)[Number(n[1])].cards[c.cardId];
 if(!printed)throw Error('Card not registered in physical owner title');
 return printed;
};
const titleOf=(pack,owner)=>playerPacks(pack)[owner].id;
const random=s=>{let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;};
function shuffle(s,list){
 for(let i=list.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
const clone=source=>structuredClone(source);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function actor(s){return s.pending?.player??s.active;}
export const universalActor=actor;
function draw(s,p,count=1){
 for(let i=0;i<count&&s.players[p].deck.length;i++)s.players[p].hand.push(s.players[p].deck.shift());
}
// Each card requires its OWN printed energy color. A mixed-color deck may be
// legal, but three green icons do not pay a purple energy-3 requirement.
export function universalEnergyByColor(pack,s,p){
 const counts=Object.create(null);
 for(const c of s.players[p].energy){
  if(!c)continue;
  const d=card(pack,c);
  counts[d.color]=(counts[d.color]||0)+(d.gen||0);
 }
 return counts;
}
function calcEnergy(pack,s,p){
 return Object.values(universalEnergyByColor(pack,s,p)).reduce((n,c)=>n+c,0);
}
export const universalEnergy=calcEnergy;
function bp(pack,s,c){
 return (card(pack,c)?.bp||0)+(c.buffs||[]).filter(b=>b.untilTurn===s.turn).reduce((n,b)=>n+b.bp,0);
}
export const universalBp=bp;
function startTurn(pack,s){
 const p=s.active,pl=s.players[p];
 pl.ownTurns++;s.turn++;s.phase='start';s.extraDrawn=false;s.moved=false;s.movedUids=[];s.pending=null;
 const max=pl.ownTurns>=3?3:(pl.ownTurns===1&&p===s.first?1:2);
 for(let i=0;i<pl.apCards.length;i++){pl.apCards[i].inPlay=i<max;pl.apCards[i].ready=i<max;}
 for(const c of field(pl)){c.ready=true;c.buffs=(c.buffs||[]).filter(b=>b.untilTurn>=s.turn);}
 if(!(pl.ownTurns===1&&p===s.first)){
  if(!pl.deck.length){s.status='finished';s.winner=1-p;s.endReason='required-draw-empty';return;}
  draw(s,p);
 }
}
// Queue printed effects so each pending cross-title target is chosen before
// remaining steps resolve. Native card packs remain responsible for their own text.
function continueEffectQueue(pack,s){
 while(!s.pending&&s.status==='playing'&&s.effectQueue.length){
  const job=s.effectQueue.shift(),owner=job.owner,pl=s.players[owner];
  if(job.op==='draw')draw(s,owner,job.count);
  else if(job.op==='millTop'){
   for(let i=0;i<job.count&&pl.deck.length;i++)pl.outside.push(pl.deck.shift());
  }else if(job.op==='buffSelf'){
   const source=field(pl).find(c=>c.uid===job.sourceUid);
   if(!source)throw Error('buffSelf source must be on field');
   source.buffs.push({bp:job.bp,untilTurn:s.turn});
  }else if(job.op==='peekTopOne'){
   // Only the effect controller can inspect this private top card. Do not
   // include its UID/cardId in pending UI or public snapshots.
   if(pl.deck.length)s.pending={kind:'private-top-choice',player:owner,sourceUid:job.sourceUid};
  }else if(job.op==='recoverAp'){
   if(pl.apCards.some(c=>c.inPlay&&!c.ready))
    s.pending={kind:'effect-recover-ap',player:owner,sourceUid:job.sourceUid,remaining:job.count};
  }else if(job.op==='drawDiscard'){
   draw(s,owner,job.count);
   if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid};
  }else if(job.op==='retireOppFrontUnderBp'){
   const ownName=job.bonusName.replace(/\s+/g,'');
   const hasBonus=field(pl).some(c=>card(pack,c).name.replace(/\s+/g,'')===ownName);
   const limit=hasBonus?job.bonusBp:job.bp;
   const choices=s.players[1-owner].front.filter(c=>c&&bp(pack,s,c)<=limit).map(c=>c.uid);
   if(choices.length)s.pending={kind:'effect-retire-bp',player:owner,sourceUid:job.sourceUid,choices,limit};
  }else if(job.op==='enemyBpDown'){
   const targetUids=s.players[1-owner].front.filter(Boolean).map(c=>c.uid);
   if(targetUids.length)s.pending={kind:'effect-target',player:owner,sourceUid:job.sourceUid,
    bp:job.bp,optional:job.optional===true,choices:targetUids};
  }else throw Error('Unimplemented effect op');
 }
}
function applyEffects(pack,s,cardOnField,timing,owner){
 const program=card(pack,cardOnField).effects[timing]||[];
 s.effectQueue.push(...program.map(e=>({...e,owner,sourceUid:cardOnField.uid})));
 continueEffectQueue(pack,s);
}
function validRaidBase(pack,base,top){
 return !!base&&!!top.raidName&&card(pack,base).name===top.raidName&&
  !card(pack,base).raidName&&!(base.stack?.length);
}
function performRaid(pack,s,p,cardOnTop,baseUid,line,slot){
 const pl=s.players[p],base=location(s,p,baseUid),top=card(pack,cardOnTop);
 if(!base||!validRaidBase(pack,base.c,top))throw Error('Illegal Raid base');
 if(line!=='front'&&line!=='energy')throw Error('Illegal Raid destination');
 if(base.line==='front'&&(line!=='front'||slot!==base.slot))
  throw Error('Cannot move a front-line Raid base');
 if(line==='energy'&&(base.line!=='energy'||slot!==base.slot))
  throw Error('Raid can only stay in base energy slot');
 if(pl[line][slot]&&!(line===base.line&&slot===base.slot))
  throw Error('Raid destination occupied');
 pl[base.line][base.slot]=null;
 cardOnTop.stack=[base.c];cardOnTop.ready=true;
 pl[line][slot]=cardOnTop;
 applyEffects(pack,s,cardOnTop,'onPlay',p);
 applyEffects(pack,s,cardOnTop,'onRaid',p);
}
function location(s,p,uid){
 for(const line of ['front','energy']){
  const slot=s.players[p][line].findIndex(c=>c?.uid===uid);
  if(slot!==-1)return {line,slot,c:s.players[p][line][slot]};
 }
 return null;
}
function retire(s,p,line,slot){
 const top=s.players[p][line][slot];if(!top)throw Error('No character to retire');
 s.players[p][line][slot]=null;
 const expand=c=>[c,...(c.stack||[]).flatMap(expand),...(c.under||[]).flatMap(expand)];
 s.players[p].outside.push(...expand(top).map(c=>({...c,stack:[],under:[],buffs:[],ready:false})));
}
function damage(pack,s,defender){
 const pl=s.players[defender];
 if(!pl.life.length){s.status='finished';s.winner=1-defender;s.endReason='unblocked-attack';return;}
 const c=pl.life.shift();pl.outside.push(c);
 const trig=card(pack,c).trigger;
 s.publicReveals.push({owner:defender,title:titleOf(pack,defender),cardId:c.cardId,uid:c.uid,trigger:trig||null,turn:s.turn});
 if(s.publicReveals.length>12)s.publicReveals.shift();
 if(['get','draw','active','special','color','raid'].includes(trig)||(trig==='final'&&!pl.life.length)){
  s.pending={kind:'life-trigger',player:defender,uid:c.uid,trigger:trig};
 }else if(!pl.life.length){
  s.status='finished';s.winner=1-defender;s.endReason='life-zero';
 }
}
function finishPending(s){
 if(s.status==='playing'&&!s.pending&&s.players.some(p=>p.life.length===0)){
  const defeated=s.players.findIndex(p=>p.life.length===0);
  s.status='finished';s.winner=1-defeated;s.endReason='life-zero';
 }
}
function advanceAfterEnd(pack,s,owner){
 const pl=s.players[owner];
 // End phase: REST cards return ACTIVE before opponent's turn.
 for(const c of field(pl))c.ready=true;
 if(pl.hand.length>8){s.pending={kind:'end-hand-limit',player:owner};return;}
 s.active=1-owner;
 startTurn(pack,s);
}
function resolveChoice(s,a,pack){
 const q=s.pending,p=s.players[q.player];
 if(q.kind==='block'){
  const attacker=s.players[s.active].front.find(c=>c?.uid===q.attackerUid);
  if(!attacker)throw Error('Attacker no longer exists');
  if(a.uid===null)damage(pack,s,q.player);
  else{
   const slot=p.front.findIndex(c=>c?.uid===a.uid);
   if(slot<0||!p.front[slot].ready)throw Error('Illegal blocker');
   const blocker=p.front[slot];blocker.ready=false;
   if(bp(pack,s,attacker)>=bp(pack,s,blocker))retire(s,q.player,'front',slot);
  }
  if(s.pending===q)s.pending=null;
  return;
 }
 if(q.kind==='private-top-choice'){
  if(a.mode==='outside'&&p.deck.length)p.outside.push(p.deck.shift());
  s.pending=null;continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-recover-ap'){
  if(a.uid===null){s.pending=null;continueEffectQueue(pack,s);return;}
  const ap=p.apCards.find(c=>c.uid===a.uid&&c.inPlay&&!c.ready);
  if(!ap)throw Error('AP recovery must target a REST AP card owned by controller');
  ap.ready=true;q.remaining--;
  if(q.remaining<=0||!p.apCards.some(c=>c.inPlay&&!c.ready)){
   s.pending=null;continueEffectQueue(pack,s);
  }
  return;
 }
 if(q.kind==='end-hand-limit'){
  const i=p.hand.findIndex(c=>c.uid===a.uid);
  if(i<0)throw Error('End phase must remove an owned hand card');
  p.removed.push(p.hand.splice(i,1)[0]);
  s.pending=null;
  advanceAfterEnd(pack,s,q.player);
  return;
 }
 if(q.kind==='effect-discard'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(index<0)throw Error('Discard requires an owned hand card');
  p.outside.push(p.hand.splice(index,1)[0]);
  s.pending=null;
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-retire-bp'){
  const opponent=1-q.player,slot=s.players[opponent].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid)||bp(pack,s,s.players[opponent].front[slot])>q.limit)
   throw Error('Illegal BP-threshold retirement target');
  retire(s,opponent,'front',slot);
  s.pending=null;continueEffectQueue(pack,s);return;
 }
 if(q.kind==='effect-target'){
  if(a.uid===null&&q.optional===true){
   s.pending=null;continueEffectQueue(pack,s);return;
  }
  const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
  if(slot<0||!q.choices.includes(a.uid))throw Error('Illegal cross-title effect target');
  const target=s.players[foe].front[slot];
  target.buffs??=[];
  target.buffs.push({bp:-q.bp,untilTurn:s.turn});
  // Official state-based rule: characters at 0 BP or below are sidelined.
  if(bp(pack,s,target)<=0)retire(s,foe,'front',slot);
  s.pending=null;
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='life-trigger'){
  const i=p.outside.findIndex(c=>c.uid===q.uid);
  if(i<0)throw Error('Revealed life card not found');
  if(a.mode==='get'&&q.trigger==='get')p.hand.push(p.outside.splice(i,1)[0]);
  else if(a.mode==='draw'&&q.trigger==='draw')draw(s,q.player);
  else if(a.mode==='active'&&q.trigger==='active'){
   const target=field(p).find(c=>c.uid===a.uid);
   if(!target||card(pack,target).type!=='character')throw Error('Illegal ACTIVE trigger target');
   // Official FAQ Q101 permits targeting a character already ACTIVE.
   target.ready=true;
   target.buffs??=[];
   target.buffs.push({bp:3000,untilTurn:s.turn});
  }
  else if(a.mode==='special'&&q.trigger==='special'){
   const foe=1-q.player,slot=s.players[foe].front.findIndex(c=>c?.uid===a.uid);
   if(slot<0)throw Error('SPECIAL target no longer on enemy front line');
   retire(s,foe,'front',slot);
  }
  else if(a.mode==='color'&&q.trigger==='color'){
   const profile=card(pack,p.outside[i]).triggerEffect;
   const handIndex=p.hand.findIndex(c=>c.uid===a.uid);
   if(handIndex<0)throw Error('COLOR requires a hand character');
   const picked=p.hand[handIndex],d=card(pack,picked);
   if(d.type!=='character'||d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap||
    !['front','energy'].includes(a.line)||p[a.line][a.slot])throw Error('Illegal COLOR deployment');
   p.hand.splice(handIndex,1);picked.ready=true;p[a.line][a.slot]=picked;
   // This is ordinary playing through a trigger, NOT a Raid: no AP is spent.
   applyEffects(pack,s,picked,'onPlay',q.player);
  }
  else if(a.mode==='raid'&&q.trigger==='raid'){
   const revealed=p.outside.splice(i,1)[0];
   performRaid(pack,s,q.player,revealed,a.baseUid,a.line,a.slot);
  }
  else if(a.mode==='get'&&q.trigger==='raid')p.hand.push(p.outside.splice(i,1)[0]);
  else if(a.mode==='final'&&q.trigger==='final'&&!p.life.length&&p.deck.length)p.life.unshift(p.deck.shift());
  else if(a.mode!=='skip')throw Error('Illegal trigger option');
  s.pending=null;
  continueEffectQueue(pack,s);
  finishPending(s);
  return;
 }
 throw Error('Unsupported pending decision');
}
export function newUniversalMatch(pack,{decks,seed=1,first=0}={}){
 const packs=playerPacks(pack);
 if(!Array.isArray(decks)||decks.length!==2||!playerIndex(first))
  throw Error('Universal v2 requires one or two title packs and two decks');
 for(const [i,d] of decks.entries()){
  const issues=validateUniversalDeck(packs[i],d);
  if(issues.length)throw Error('Player '+i+': '+issues.join('; '));
 }
 const isSame=packs[0].id===packs[1].id&&packs[0].version===packs[1].version;
 const s={version:UNIVERSAL_V2_VERSION,title:isSame?packs[0].id:'cross-title',packVersion:isSame?packs[0].version:null,
  packIds:packs.map(p=>p.id),packVersions:packs.map(p=>p.version),
  rng:(seed>>>0)||1,first,active:first,turn:0,phase:'start',status:'playing',
  winner:null,endReason:null,pending:null,extraDrawn:false,moved:false,movedUids:[],
  publicReveals:[],effectQueue:[],players:[],
  initialCounts:decks.map(d=>Object.fromEntries(Object.entries(d).filter(([,n])=>n>0)))
 };
 for(let p=0;p<2;p++){
  const ids=Object.entries(decks[p]).flatMap(([id,count])=>Array(count).fill(id));
  const pile=shuffle(s,ids.map((id,i)=>({uid:p+'-'+i,cardId:id,ready:false,stack:[],under:[],buffs:[]})));
  s.players.push({
   deck:pile,hand:pile.splice(0,7),life:pile.splice(0,7),
   front:[null,null,null,null],energy:[null,null,null,null],
   outside:[],removed:[],apCards:[0,1,2].map(i=>({uid:'AP'+p+'-'+i,ready:false,inPlay:false})),ownTurns:0
  });
 }
 startTurn(pack,s);
 assertUniversalMatch(pack,s);
 return s;
}
function legalPending(pack,s){
 const q=s.pending,p=s.players[q.player];
 if(q.kind==='block')return [
  {type:'chooseBlock',uid:null},
  ...p.front.filter(c=>c?.ready).map(c=>({type:'chooseBlock',uid:c.uid}))
 ];
 if(q.kind==='private-top-choice')return [
   {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'outside'}
  ];
 if(q.kind==='effect-recover-ap')return [
   {type:'chooseApRecovery',uid:null},
   ...p.apCards.filter(c=>c.inPlay&&!c.ready).map(c=>({type:'chooseApRecovery',uid:c.uid}))
  ];
 if(q.kind==='end-hand-limit')return p.hand.map(c=>({type:'chooseHandLimit',uid:c.uid}));
 if(q.kind==='effect-discard')return p.hand.map(c=>({type:'chooseDiscard',uid:c.uid}));
 if(q.kind==='effect-retire-bp')return q.choices.map(uid=>({type:'chooseRetireBp',uid}));
 if(q.kind==='effect-target')return [
   ...(q.optional?[{type:'chooseTarget',uid:null}]:[]),
   ...q.choices.map(uid=>({type:'chooseTarget',uid}))
  ];
 if(q.kind==='life-trigger'){
  const out=[{type:'chooseTrigger',mode:'skip'}];
  if(q.trigger==='active')out.push(...field(p).filter(c=>card(pack,c).type==='character')
   .map(c=>({type:'chooseTrigger',mode:'active',uid:c.uid})));
  if(q.trigger==='special')
   out.push(...s.players[1-q.player].front.filter(Boolean)
    .map(c=>({type:'chooseTrigger',mode:'special',uid:c.uid})));
  if(q.trigger==='color'){
   const profile=card(pack,p.outside.find(c=>c.uid===q.uid)).triggerEffect;
   for(const c of p.hand){
    const d=card(pack,c);
    if(d.type!=='character'||d.color!==profile.color||d.energy>profile.maxEnergy||d.ap!==profile.ap)continue;
    for(const line of ['front','energy'])
     for(let slot=0;slot<4;slot++)if(!p[line][slot])
      out.push({type:'chooseTrigger',mode:'color',uid:c.uid,line,slot});
   }
  }
  if(q.trigger==='raid'){
   const revealed=p.outside.find(c=>c.uid===q.uid),d=card(pack,revealed);
   out.push({type:'chooseTrigger',mode:'get'});
   if(d.energy<=(universalEnergyByColor(pack,s,q.player)[d.color]||0)){
    for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
     const base=p[line][slot];
     if(!validRaidBase(pack,base,d))continue;
     if(line==='front')out.push({type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'front',slot});
     else{
      out.push({type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'energy',slot});
      for(let dest=0;dest<4;dest++)if(!p.front[dest])
       out.push({type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'front',slot:dest});
     }
    }
   }
  }
  if(q.trigger==='get')out.push({type:'chooseTrigger',mode:'get'});
  if(q.trigger==='draw'&&p.deck.length)out.push({type:'chooseTrigger',mode:'draw'});
  if(q.trigger==='final'&&!p.life.length&&p.deck.length)out.push({type:'chooseTrigger',mode:'final'});
  return out;
 }
 throw Error('No handler for pending decision '+q.kind);
}
export function legalUniversalActions(pack,s){
 assertUniversalMatch(pack,s);
 if(s.status!=='playing')return [];
 if(s.pending)return legalPending(pack,s);
 const p=s.active,pl=s.players[p],out=[{type:'next'}];
 if(s.phase==='start'){
  if(!s.extraDrawn&&pl.apCards.some(c=>c.ready)&&pl.deck.length)out.push({type:'extraDraw'});
 }
 if(s.phase==='move'){
  const frontEmpty=pl.front.flatMap((c,slot)=>c?[]:[slot]);
  const energyEmpty=pl.energy.flatMap((c,slot)=>c?[]:[slot]);
  for(const c of pl.energy.filter(c=>c&&!s.movedUids.includes(c.uid)&&card(pack,c).type==='character'))for(const slot of frontEmpty)out.push({type:'move',uid:c.uid,slot});
  for(const c of pl.front.filter(c=>c&&!s.movedUids.includes(c.uid)&&card(pack,c).step))for(const slot of energyEmpty)
   out.push({type:'step',uid:c.uid,slot});
 }
 if(s.phase==='main'){
  const ap=pl.apCards.filter(c=>c.ready).length;
  const produced=universalEnergyByColor(pack,s,p);
  for(const c of pl.hand){
   const d=card(pack,c);
   if(d.energy>(produced[d.color]||0)||d.ap>ap)continue;
   if(d.type==='event')out.push({type:'event',uid:c.uid});
   else for(const line of ['energy','front'])for(let slot=0;slot<4;slot++)
    if(!pl[line][slot]&&(line!=='front'||d.type==='character'))
     out.push({type:'play',uid:c.uid,line,slot});
   if(d.raidName){
    for(const line of ['energy','front'])for(let slot=0;slot<4;slot++){
     const base=pl[line][slot];
     if(!validRaidBase(pack,base,d))continue;
     for(let dest=0;dest<4;dest++)if(!pl.front[dest]||(line==='front'&&slot===dest))
      out.push({type:'raid',uid:c.uid,baseUid:base.uid,slot:dest});
    }
   }
  }
 }
 if(s.phase==='attack')for(const c of pl.front.filter(c=>c?.ready&&card(pack,c).type==='character'))
  out.push({type:'attack',uid:c.uid});
 return out;
}
function spendAp(pl,n){
 let remaining=n;for(const c of pl.apCards)if(c.ready&&remaining){c.ready=false;remaining--;}
 if(remaining)throw Error('Insufficient AP');
}
export function dispatchUniversalAction(pack,source,action,{actor:requested}={}){
 const options=legalUniversalActions(pack,source);
 if(requested!==undefined&&requested!==actor(source))throw Error('Wrong player turn');
 if(!options.some(a=>same(a,action)))throw Error('Action not currently legal');
 const s=clone(source),p=actor(s),pl=s.players[p];
 if(s.pending){
  // Pass the entire pre-validated action: some life triggers choose both a
  // mode and an owned field UID (e.g. ACTIVE); stripping the UID corrupts it.
  resolveChoice(s,action,pack);
 }else switch(action.type){
  case 'extraDraw':
   spendAp(pl,1);draw(s,p);s.extraDrawn=true;break;
  case 'next':
   if(s.phase==='start')s.phase='move';
   else if(s.phase==='move')s.phase='main';
   else if(s.phase==='main')s.phase='attack';
   else if(s.phase==='attack')advanceAfterEnd(pack,s,p);
   break;
  case 'move':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='energy'||pl.front[action.slot])throw Error('Invalid move');
   pl.energy[l.slot]=null;pl.front[action.slot]=l.c;s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'step':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='front'||pl.energy[action.slot])throw Error('Invalid STEP');
   pl.front[l.slot]=null;pl.energy[action.slot]=l.c;s.moved=true;s.movedUids.push(l.c.uid);break;
  }
  case 'play':case 'event':case 'raid':{
   const index=pl.hand.findIndex(c=>c.uid===action.uid);
   if(index<0)throw Error('Card not in hand');
   const current=pl.hand[index],d=card(pack,current);
   spendAp(pl,d.ap);pl.hand.splice(index,1);
   if(action.type==='event'){pl.outside.push(current);applyEffects(pack,s,current,'onPlay',p);}
   else if(action.type==='raid'){
    performRaid(pack,s,p,current,action.baseUid,'front',action.slot);
   }else{
    current.ready=false;pl[action.line][action.slot]=current;
    applyEffects(pack,s,current,'onPlay',p);
   }
   break;
  }
  case 'attack':{
   const attacker=pl.front.find(c=>c?.uid===action.uid);
   if(!attacker)throw Error('Attacker missing');
   attacker.ready=false;
   applyEffects(pack,s,attacker,'onAttack',p);
   s.pending={kind:'block',player:1-p,attackerUid:attacker.uid};
   break;
  }
  default:throw Error('Unsupported universal action');
 }
 assertUniversalMatch(pack,s);
 return s;
}
export function assertUniversalMatch(pack,s){
 const packs=playerPacks(pack),isSame=packs[0].id===packs[1].id&&packs[0].version===packs[1].version;
 if(s?.version!==UNIVERSAL_V2_VERSION||
   s.title!==(isSame?packs[0].id:'cross-title')||
   s.packVersion!==(isSame?packs[0].version:null)||
   !Array.isArray(s.packIds)||!Array.isArray(s.packVersions)||
   packs.some((p,i)=>s.packIds[i]!==p.id||s.packVersions[i]!==p.version)||
   s.packIds.length!==2||s.packVersions.length!==2||
   !Array.isArray(s.initialCounts)||s.initialCounts.length!==2||
   s.players?.length!==2||!playerIndex(s.active)||
   !['playing','finished'].includes(s.status))throw Error('Incorrect pack/version or match state');
 if(s.pending&&(!playerIndex(s.pending.player)||!['block','life-trigger','effect-target','effect-discard','end-hand-limit','effect-recover-ap','private-top-choice','effect-retire-bp'].includes(s.pending.kind)))
  throw Error('Invalid pending controller');
 if(!Array.isArray(s.movedUids)||new Set(s.movedUids).size!==s.movedUids.length)
  throw Error('Invalid movement accounting');
 if(!Array.isArray(s.effectQueue)||s.effectQueue.some(e=>!playerIndex(e.owner)||
   !['draw','millTop','buffSelf','enemyBpDown','drawDiscard','recoverAp','peekTopOne','retireOppFrontUnderBp'].includes(e.op)))
  throw Error('Invalid queued effects');
 for(let p=0;p<2;p++){
  const pl=s.players[p],uids=new Set(),items=[];
  if(pl.front?.length!==4||pl.energy?.length!==4||pl.apCards?.length!==3||
    pl.apCards.some(c=>typeof c.ready!=='boolean'||typeof c.inPlay!=='boolean'||(c.ready&&!c.inPlay)))throw Error('Invalid zones or AP cards');
  function visit(c){
   if(!c)return;
   if(typeof c.uid!=='string'||uids.has(c.uid)||!c.uid.startsWith(p+'-')||
     !packs[p].cards[c.cardId])throw Error('Card conservation / wrong title / duplicated UID');
   uids.add(c.uid);items.push(c);
   for(const q of c.stack||[])visit(q);
   for(const q of c.under||[])visit(q);
  }
  for(const zone of ['deck','hand','life','outside','removed'])for(const c of pl[zone]||[])visit(c);
  for(const c of field(pl))visit(c);
  if(items.length!==50)throw Error('Card conservation violated ('+items.length+'/50)');
  const counts=Object.create(null);
  for(const c of items)counts[c.cardId]=(counts[c.cardId]||0)+1;
  const expected=s.initialCounts[p];
  if(validateUniversalDeck(packs[p],expected).length)
   throw Error('Invalid original deck signature for player '+p);
  for(const id of new Set([...Object.keys(counts),...Object.keys(expected)]))
   if((counts[id]||0)!==(expected[id]||0))
    throw Error('Printed card ID conservation violated for player '+p+' ('+id+')');
  if(pl.front.some(c=>c&&card(pack,c).type!=='character'))
   throw Error('Front line must contain only characters');
  if(pl.energy.some(c=>c&&card(pack,c).type==='event'))
   throw Error('Event cannot remain in energy line');
 }
 return true;
}
// Safe, title-agnostic view model for common UI: no opponent hand IDs, hidden
// life identities or private deck order are ever exported to the viewer.
export function universalPublicView(pack,s,viewer=0){
 assertUniversalMatch(pack,s);
 if(!playerIndex(viewer))throw Error('Invalid viewer');
 return {title:s.title,playerTitles:[...s.packIds],status:s.status,winner:s.winner,phase:s.phase,turn:s.turn,
  active:s.active,actor:actor(s),
  pending:s.pending?{kind:s.pending.kind,player:s.pending.player}:null,
  publicReveals:s.publicReveals.map(x=>({...x})),
  players:s.players.map((pl,p)=>({
   title:s.packIds[p],lifeCount:pl.life.length,deckCount:pl.deck.length,handCount:pl.hand.length,
   hand:p===viewer?pl.hand.map(c=>({uid:c.uid,cardId:c.cardId})):null,
   front:pl.front.map(c=>c?{uid:c.uid,cardId:c.cardId,ready:c.ready,bp:bp(pack,s,c),raidDepth:c.stack?.length||0}:null),
   energy:pl.energy.map(c=>c?{uid:c.uid,cardId:c.cardId,ready:c.ready,produces:card(pack,c).gen}:null),
   apReady:pl.apCards.filter(c=>c.ready).length,apTotal:pl.apCards.filter(c=>c.inPlay).length,energyTotal:calcEnergy(pack,s,p),energyByColor:{...universalEnergyByColor(pack,s,p)},
   outside:pl.outside.map(c=>({uid:c.uid,cardId:c.cardId}))
  }))
 };
}
