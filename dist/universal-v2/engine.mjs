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
 pl.ownTurns++;s.turn++;s.phase='start';s.extraDrawn=false;s.moved=false;s.pending=null;
 const max=pl.ownTurns>=3?3:(pl.ownTurns===1&&p===s.first?1:2);
 for(let i=0;i<pl.apCards.length;i++)pl.apCards[i].ready=i<max;
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
  }else if(job.op==='drawDiscard'){
   draw(s,owner,job.count);
   if(pl.hand.length)s.pending={kind:'effect-discard',player:owner,sourceUid:job.sourceUid};
  }else if(job.op==='enemyBpDown'){
   const targetUids=s.players[1-owner].front.filter(Boolean).map(c=>c.uid);
   if(targetUids.length)s.pending={kind:'effect-target',player:owner,sourceUid:job.sourceUid,
    bp:job.bp,choices:targetUids};
  }else throw Error('Unimplemented effect op');
 }
}
function applyEffects(pack,s,cardOnField,timing,owner){
 const program=card(pack,cardOnField).effects[timing]||[];
 s.effectQueue.push(...program.map(e=>({...e,owner,sourceUid:cardOnField.uid})));
 continueEffectQueue(pack,s);
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
 if(['get','draw'].includes(trig)||(trig==='final'&&!pl.life.length)){
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
 if(q.kind==='effect-discard'){
  const index=p.hand.findIndex(c=>c.uid===a.uid);
  if(index<0)throw Error('Discard requires an owned hand card');
  p.outside.push(p.hand.splice(index,1)[0]);
  s.pending=null;
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='effect-target'){
  const target=s.players[1-q.player].front.find(c=>c?.uid===a.uid);
  if(!target||!q.choices.includes(a.uid))throw Error('Illegal cross-title effect target');
  target.buffs??=[];
  target.buffs.push({bp:-q.bp,untilTurn:s.turn});
  s.pending=null;
  continueEffectQueue(pack,s);
  return;
 }
 if(q.kind==='life-trigger'){
  const i=p.outside.findIndex(c=>c.uid===q.uid);
  if(i<0)throw Error('Revealed life card not found');
  if(a.mode==='get'&&q.trigger==='get')p.hand.push(p.outside.splice(i,1)[0]);
  else if(a.mode==='draw'&&q.trigger==='draw')draw(s,q.player);
  else if(a.mode==='final'&&q.trigger==='final'&&!p.life.length&&p.deck.length)p.life.unshift(p.deck.shift());
  else if(a.mode!=='skip')throw Error('Illegal trigger option');
  s.pending=null;
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
  winner:null,endReason:null,pending:null,extraDrawn:false,moved:false,
  publicReveals:[],effectQueue:[],players:[]
 };
 for(let p=0;p<2;p++){
  const ids=Object.entries(decks[p]).flatMap(([id,count])=>Array(count).fill(id));
  const pile=shuffle(s,ids.map((id,i)=>({uid:p+'-'+i,cardId:id,ready:false,stack:[],under:[],buffs:[]})));
  s.players.push({
   deck:pile,hand:pile.splice(0,7),life:pile.splice(0,7),
   front:[null,null,null,null],energy:[null,null,null,null],
   outside:[],removed:[],apCards:[0,1,2].map(i=>({uid:'AP'+p+'-'+i,ready:false})),ownTurns:0
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
 if(q.kind==='effect-discard')return p.hand.map(c=>({type:'chooseDiscard',uid:c.uid}));
 if(q.kind==='effect-target')return q.choices.map(uid=>({type:'chooseTarget',uid}));
 if(q.kind==='life-trigger'){
  const out=[{type:'chooseTrigger',mode:'skip'}];
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
 if(s.phase==='move'&&!s.moved){
  const frontEmpty=pl.front.flatMap((c,slot)=>c?[]:[slot]);
  const energyEmpty=pl.energy.flatMap((c,slot)=>c?[]:[slot]);
  for(const c of pl.energy.filter(Boolean))for(const slot of frontEmpty)out.push({type:'move',uid:c.uid,slot});
  for(const c of pl.front.filter(c=>c&&card(pack,c).step))for(const slot of energyEmpty)
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
     if(!base||card(pack,base).name!==d.raidName)continue;
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
  if(['block','effect-target','effect-discard'].includes(s.pending.kind))resolveChoice(s,{uid:action.uid},pack);
  else resolveChoice(s,{mode:action.mode},pack);
 }else switch(action.type){
  case 'extraDraw':
   spendAp(pl,1);draw(s,p);s.extraDrawn=true;break;
  case 'next':
   if(s.phase==='start')s.phase='move';
   else if(s.phase==='move')s.phase='main';
   else if(s.phase==='main')s.phase='attack';
   else if(s.phase==='attack'){s.active=1-p;startTurn(pack,s);}
   break;
  case 'move':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='energy'||pl.front[action.slot])throw Error('Invalid move');
   pl.energy[l.slot]=null;pl.front[action.slot]=l.c;s.moved=true;break;
  }
  case 'step':{
   const l=location(s,p,action.uid);
   if(!l||l.line!=='front'||pl.energy[action.slot])throw Error('Invalid STEP');
   pl.front[l.slot]=null;pl.energy[action.slot]=l.c;s.moved=true;break;
  }
  case 'play':case 'event':case 'raid':{
   const index=pl.hand.findIndex(c=>c.uid===action.uid);
   if(index<0)throw Error('Card not in hand');
   const current=pl.hand[index],d=card(pack,current);
   spendAp(pl,d.ap);pl.hand.splice(index,1);
   if(action.type==='event'){pl.outside.push(current);applyEffects(pack,s,current,'onPlay',p);}
   else if(action.type==='raid'){
    const base=location(s,p,action.baseUid);
    if(!base||card(pack,base.c).name!==d.raidName)throw Error('Illegal Raid base');
    pl[base.line][base.slot]=null;
    current.stack=[base.c];current.ready=true;pl.front[action.slot]=current;
    // A Raid is also an entry: ordinary on-entry abilities must still resolve.
    // Raid-only abilities must never resolve on normal non-Raid deployment.
    applyEffects(pack,s,current,'onPlay',p);
    applyEffects(pack,s,current,'onRaid',p);
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
   s.players?.length!==2||!playerIndex(s.active)||
   !['playing','finished'].includes(s.status))throw Error('Incorrect pack/version or match state');
 if(s.pending&&(!playerIndex(s.pending.player)||!['block','life-trigger','effect-target','effect-discard'].includes(s.pending.kind)))
  throw Error('Invalid pending controller');
 if(!Array.isArray(s.effectQueue)||s.effectQueue.some(e=>!playerIndex(e.owner)||
   !['draw','millTop','buffSelf','enemyBpDown','drawDiscard'].includes(e.op)))
  throw Error('Invalid queued effects');
 for(let p=0;p<2;p++){
  const pl=s.players[p],uids=new Set(),items=[];
  if(pl.front?.length!==4||pl.energy?.length!==4||pl.apCards?.length!==3||
    pl.apCards.some(c=>typeof c.ready!=='boolean'))throw Error('Invalid zones or AP cards');
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
   apReady:pl.apCards.filter(c=>c.ready).length,energyTotal:calcEnergy(pack,s,p),energyByColor:{...universalEnergyByColor(pack,s,p)},
   outside:pl.outside.map(c=>({uid:c.uid,cardId:c.cardId}))
  }))
 };
}
