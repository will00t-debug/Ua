// Experimental full-turn simulator for a STRICTLY restricted subset of TTG cards.
// It never treats the entire UA56BT catalogue as fully automated.
// Standalone from BLEACH engine/app. Intended for reproducible AI smoke tests.
import {TTG_BY_ID,normalizeTtgCounts} from './ttg-builder.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,resolveTtgMainPhaseEnd,resolveTtgTurnEnd,beginTtgGreenAttackPhase,chooseTtgRuleAiAction} from './ttg-rule-adapter.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {TTG_GREEN_ENTRY_IDS,legalTtgGreenEntryDecisions,resolveTtgGreenEntry} from './ttg-green-entry.mjs';
import {greenTtgCurrentBp,greenTtgNeedsEnergy,greenTtgImpactNull,greenTtgCanAttackOrBlock} from './ttg-green-passives.mjs';
import {canTtgGreen028Attack,resolveTtgGreen028Start} from './ttg-green-028.mjs';
import {applyGreen008UnblockedDraw} from './ttg-green-008.mjs';
import {sidelineGreen030} from './ttg-green-030.mjs';
import {legalHighRaidAttackEffects,resolveHighRaidAttackEffect,greenHighRaidCombatValue,expireGreen031AtOwnStart} from './ttg-green-high-raid.mjs';
import {resolveGreenOwnStart} from './ttg-green-main.mjs';
import {beginTtgLifeTrigger,legalTtgLifeChoices,resolveTtgLifeChoice,finalizeTtgLifeOutcome} from './ttg-green-life.mjs';

// Only IDs with on-entry, passives, attacks and life triggers implemented below
// may enter this core. In particular 071 Raid is tested independently, not here.
export const TTG_CORE_SMOKE_IDS=Object.freeze([
 'TTG-1-001','TTG-1-002','TTG-1-003','TTG-1-004','TTG-1-005','TTG-1-006','TTG-1-007','TTG-1-008','TTG-1-009',
 'TTG-1-010','TTG-1-011','TTG-1-012','TTG-1-013','TTG-1-014','TTG-1-015','TTG-1-016','TTG-1-017','TTG-1-018',
 'TTG-1-019','TTG-1-020','TTG-1-021','TTG-1-022','TTG-1-023','TTG-1-024','TTG-1-025','TTG-1-026','TTG-1-027','TTG-1-028','TTG-1-029','TTG-1-030','TTG-1-031','TTG-1-032','TTG-1-033','TTG-1-034',
 'TTG-1-035','TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-039',
 'TTG-1-040','TTG-1-041',
 'TTG-1-042','TTG-1-043','TTG-1-047','TTG-1-048',
 'TTG-1-063','TTG-1-064','TTG-1-065','TTG-1-066'
]);
const allowed=new Set(TTG_CORE_SMOKE_IDS);
const phases=['start','move','main','attack'];
const fresh=(uid,cardId)=>({uid,cardId,nameJa:TTG_BY_ID[cardId].nameJa,ready:false,stack:[],under:[]});
const field=pl=>[...pl.front,...pl.energy].filter(Boolean);
const uids=pl=>[...pl.deck,...pl.hand,...pl.life,...pl.outside,...(pl.removed||[]),...field(pl)].flatMap(function deep(c){return [c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)]});
const printed=c=>TTG_BY_ID[c.cardId];
function xorshift(s){let x=s.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296;}
function shuffle(s,cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(xorshift(s)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
export function validateTtgCoreDeck(counts){
 let c;try{c=normalizeTtgCounts(counts);}catch(e){return [e.message];}
 const out=[];
 if(Object.values(c).reduce((n,x)=>n+x,0)!==50)out.push('A TTG core deck must contain exactly 50 cards');
 for(const [id,n] of Object.entries(c))if(n&&!allowed.has(id))out.push(id+' card effect is not implemented in the core smoke engine');
 for(const trigger of ['special','color','final']){
  const n=Object.entries(c).reduce((sum,[id,count])=>sum+(TTG_BY_ID[id].trigger===trigger?count:0),0);
  if(n>4)out.push('Exceeds four '+trigger+' triggers');
 }
 return out;
}
function refreshEnergy(s,p){return withTtgDerivedEnergy(s,p);}
function start(s){
 const p=s.active;
 let pl=s.players[p];
 pl.turnCount++;s.turn++;s.phase='start';s.pending=null;s.extraDrawn=false;
 Object.assign(s,resolveTtgGreen028Start(s,p));
 Object.assign(s,expireGreen031AtOwnStart(s,p));
 // The hook clones the state: use the NEW authoritative player object for
 // AP refresh, ACTIVE, mandatory draw and buff expiration (not a stale alias).
 pl=s.players[p];
 for(const c of field(pl)){
  c.ready=true;c.attackTurn=-1;
  if(c.doubleBlockUntilOwnStartTurnCount!=null&&pl.turnCount>=c.doubleBlockUntilOwnStartTurnCount){
   delete c.doubleBlockUntilOwnStartTurnCount;
   delete c.doubleBlockUsedTurn;
  }
  if(c.buffs?.length){
   const expired=c.buffs.filter(b=>b.until==='ownNextStart');
   if(Number.isFinite(c.currentBp))c.currentBp-=expired.reduce((n,b)=>n+(b.bp||0),0);
   c.buffs=c.buffs.filter(b=>b.until!=='ownNextStart');
  }
 }
 const max=pl.turnCount>=3?3:(pl.turnCount===1&&p===s.first?1:2);
 for(let i=0;i<pl.apCards.length;i++)pl.apCards[i].ready=i<max;
 if(!(pl.turnCount===1&&p===s.first)){
  if(!pl.deck.length){s.status='finished';s.winner=1-p;s.endReason='requiredDrawEmpty';return s;}
  pl.hand.push(pl.deck.shift());
 }
 Object.assign(s,resolveGreenOwnStart(s,p));
 return refreshEnergy(s,p);
}
export function newTtgCoreMatch({decks,seed=1,first=0}={}){
 if(!Array.isArray(decks)||decks.length!==2||![0,1].includes(first))throw new Error('Two valid decks and starting player required');
 const problems=decks.flatMap((d,p)=>validateTtgCoreDeck(d).map(x=>'player '+p+': '+x));
 if(problems.length)throw new Error(problems.join('; '));
 const s={kind:'ttg-core-smoke',seed:(seed>>>0)||1,first,active:first,turn:0,
  phase:'start',status:'playing',winner:null,players:[],log:[],energyMode:'derive',pending:null};
 for(let p=0;p<2;p++){
  const names=Object.entries(normalizeTtgCounts(decks[p])).flatMap(([id,n])=>Array(n).fill(id));
  const deck=shuffle(s,names.map((id,i)=>fresh(p+'-'+i,id)));
  s.players[p]={deck,hand:deck.splice(0,7),life:deck.splice(0,7),
    front:[null,null,null,null],energy:[null,null,null,null],outside:[],removed:[],
    apCards:[0,1,2].map(i=>({uid:'AP'+p+'-'+i,ready:false})),
    energyProduced:{red:0,green:0},turnCount:0};
 }
 return start(s);
}
export function assertTtgCoreState(s){
 if(s?.kind!=='ttg-core-smoke'||s.players?.length!==2)throw new Error('Not a TTG core match');
 for(let p=0;p<2;p++){
  const pl=s.players[p],ids=uids(pl);
  if(pl.front.length!==4||pl.energy.length!==4||pl.apCards.length!==3||ids.length!==50||
     new Set(ids).size!==50||[...pl.deck,...pl.hand,...pl.life,...pl.outside,...(pl.removed||[]),...field(pl)]
      .some(c=>!allowed.has(c.cardId)))throw new Error('Core match card conservation failure '+p);
  if(pl.front.some(c=>c&&printed(c).type!=='character'))throw new Error('Front line is not character-only');
  const generated=calculateTtgEnergyByColor(s,p);
  if(p===s.active&&s.status==='playing'&&
     (generated.red!==pl.energyProduced.red||generated.green!==pl.energyProduced.green))
   throw new Error('Energy cache inconsistent with physical cards');
 }
 return true;
}
const bp=(s,p,c)=>greenTtgCurrentBp(s,p,c);
// Preserve a stable, user-selectable decision for each legal target; the full
// reducer validates custom bottom-order permutations if the UI supplies them.
function greenEntryChoices(s){
 const pending=s.pending,p=pending.player,pl=s.players[p];
 const decisions=legalTtgGreenEntryDecisions(s,{player:p,sourceUid:pending.sourceUid});
 const make=(opt,more={})=>({type:'resolveGreenEntry',player:p,sourceUid:pending.sourceUid,
  mode:opt.mode,...more});
 const actions=[];
 for(const opt of decisions){
  if(['keepTop','outsideTop','emptyDeck'].includes(opt.mode))actions.push(make(opt));
  else if(opt.mode==='drawThenDiscard')for(const discardUid of opt.discardUids)
   actions.push(make(opt,{discardUid}));
  else if(opt.mode==='niaDiscardDraw'){
   const cards=opt.candidateUids;
   actions.push(make(opt,{discardUids:[]}));
   for(let i=0;i<cards.length;i++){
    if(opt.max>=1)actions.push(make(opt,{discardUids:[cards[i]]}));
    for(let j=i+1;j<cards.length;j++)if(opt.max>=2)
     actions.push(make(opt,{discardUids:[cards[i],cards[j]]}));
   }
  }
  else if(opt.mode==='partnerRecover'){
   actions.push(make(opt));
   for(const takeUid of opt.candidateUids)for(const apUid of opt.readyApUids)
    for(const line of ['energy','front'])for(let slot=0;slot<4;slot++)if(!pl[line][slot])
     actions.push(make(opt,{takeUid,apUid,line,slot}));
  }
  else if(opt.mode==='niaOutsideToTop'){
   actions.push(make(opt,{takeUid:null}));
   for(const takeUid of opt.candidateUids)actions.push(make(opt,{takeUid}));
  }
  else if(opt.mode==='mandatoryBounce'){
   if(opt.selfIfEmpty)actions.push(make(opt));
   else for(const returnUid of opt.candidateUids)actions.push(make(opt,{returnUid}));
  }else if(opt.mode==='search'||opt.mode==='arkChoice'||opt.mode==='niaSearch'){
   for(const takeUid of [null,...opt.candidateUids]){
    const order=opt.revealed.filter(uid=>uid!==takeUid);
    if(!takeUid)actions.push(make(opt,{takeUid:null,bottomOrderUids:order}));
    else if(opt.mustDiscardOnTake){
     for(const discardUid of [...pl.hand.map(c=>c.uid),takeUid])
      actions.push(make(opt,{takeUid,discardUid,bottomOrderUids:order}));
    }else actions.push(make(opt,{takeUid,bottomOrderUids:order}));
   }
   if(opt.mode==='arkChoice')for(const takeUid of opt.outsideUids)
    actions.push(make(opt,{takeUid}));
  }
 }
 return actions;
}
export function legalTtgCoreActions(s){
 if(s.status!=='playing')return [];
 const p=s.active,pl=s.players[p];
 if(s.pendingTtgLife)return legalTtgLifeChoices(s);
 if(s.pending?.kind==='ttgGreenEntry')return greenEntryChoices(s);
 if(['ttgGreen028Entry','ttgGreen029Entry','green030Sidelined','green012Search','green012Discard','greenHighRaidQueue'].includes(s.pending?.kind))
  return legalTtgRuleActions(s,s.pending.player);
 if(s.pending?.kind==='greenHighAttackWindow')return legalHighRaidAttackEffects(s,s.pending.player,s.pending.uid);
 if(s.pending?.kind==='block'){
  const opp=s.players[1-p];
  return [{type:'block',blockUid:null},...opp.front.filter(c=>c?.ready&&greenTtgCanAttackOrBlock(s,1-p,c)).map(c=>({type:'block',blockUid:c.uid}))];
 }
 if(s.pending)throw new Error('Unsupported pending core effect cannot be skipped');
 const actions=[];
 if(s.phase==='start'){
  if(!s.extraDrawn&&pl.hand.length<3&&pl.deck.length&&pl.apCards.some(c=>c.ready))actions.push({type:'extraDraw',apUid:pl.apCards.find(c=>c.ready).uid});
  return [...actions,{type:'next'}];
 }
 if(s.phase==='move'){
  for(const c of pl.energy.filter(Boolean))for(let slot=0;slot<4;slot++)if(!pl.front[slot])
   actions.push({type:'move',uid:c.uid,slot});
 }
 if(s.phase==='main'){
  for(const h of pl.hand){
   const d=printed(h);
   if(d.type!=='character'||['TTG-1-008','TTG-1-012','TTG-1-027','TTG-1-028','TTG-1-029','TTG-1-030','TTG-1-031','TTG-1-032'].includes(h.cardId))continue;
   if(pl.energyProduced[d.color]<greenTtgNeedsEnergy(s,p,h)||pl.apCards.every(c=>!c.ready))continue;
   for(const line of ['energy','front'])for(let slot=0;slot<4;slot++)if(!pl[line][slot])
    actions.push({type:'play',handUid:h.uid,line,slot});
  }
  actions.push(...legalTtgRuleActions(s,p));
 }
 if(s.phase==='attack'&&pl.turnCount>1){
  for(const c of pl.front.filter(c=>c?.ready&&greenTtgCanAttackOrBlock(s,p,c)&&canTtgGreen028Attack(s,p,c)))actions.push({type:'attack',uid:c.uid});
 }
 if(s.phase==='move')actions.push(...legalTtgRuleActions(s,p));
 return [...actions,{type:'next'}];
}
const sameAction=(a,b)=>a.type===b.type&&['handUid','uid','slot','line','blockUid','targetUid','baseUid','sourceUid','mode','takeUid','discardUid','returnUid','apUid','cardUid','ready','outsideUid','step','raidUid','siteUid'].every(k=>
 a[k]===undefined||a[k]===b[k]);
function removeFront(s,p,uid){
 const pl=s.players[p],i=pl.front.findIndex(c=>c?.uid===uid);
 if(i<0)throw new Error('Missing battle card');
 if(pl.front[i].cardId==='TTG-1-030'){
  Object.assign(s,sidelineGreen030(s,{player:p,uid}));
 }else{
  pl.outside.push(pl.front[i]);pl.front[i]=null;
 }
}
function queueLifeDamage(s,defender,n){
 if(!Number.isInteger(n)||n<1)throw new Error('Invalid damage count');
 s.pendingDamage={defender,remaining:n};
 advanceQueuedDamage(s);
}
function advanceQueuedDamage(s){
 const q=s.pendingDamage;
 if(!q||s.pending||s.pendingTtgLife||s.status!=='playing')return;
 if(q.remaining===0){delete s.pendingDamage;return;}
 q.remaining--;
 lifeDamage(s,q.defender);
 if(s.status==='finished')delete s.pendingDamage;
 else if(!s.pending&&!s.pendingTtgLife&&!q.remaining)delete s.pendingDamage;
 else if(!s.pending&&!s.pendingTtgLife&&q.remaining)advanceQueuedDamage(s);
}
function lifeDamage(s,p){
 const pl=s.players[p];
 if(!pl.life.length){
  s.status='finished';s.winner=1-p;s.endReason='unblockedAttack';return;
 }
 Object.assign(s,beginTtgLifeTrigger(s,{player:p,lifeUid:pl.life[0].uid}));
}
export function dispatchTtgCoreAction(source,action){
 if(source.status!=='playing')throw new Error('Match finished');
 const s=structuredClone(source),p=s.active,pl=s.players[p];
 if(!legalTtgCoreActions(s).some(x=>sameAction(x,action)))throw new Error('Illegal TTG core action '+JSON.stringify({action,phase:s.phase,pending:s.pending,turn:s.turn,legal:legalTtgCoreActions(s).slice(0,12)}));
 if(s.pendingTtgLife){
  Object.assign(s,resolveTtgLifeChoice(s,action));
 }else if(s.pending?.kind==='ttgGreenEntry'){
  const after=resolveTtgGreenEntry(s,action);
  Object.assign(s,after);
  finalizeTtgLifeOutcome(s,p);
 }else if(s.pending?.kind==='greenHighAttackWindow'){
  Object.assign(s,resolveHighRaidAttackEffect(s,{...action,player:p}));
  s.pending={kind:'block',attackerUid:action.uid};
 }else if(s.pending?.kind==='block'){
  const attacker=pl.front.find(c=>c?.uid===s.pending.attackerUid);
  if(!attacker)throw new Error('Attacker disappeared');
  if(action.blockUid){
   const defender=s.players[1-p].front.find(c=>c?.uid===action.blockUid);
   defender.ready=false;
   if(defender.doubleBlockUntilOwnStartTurnCount!=null&&
      s.players[1-p].turnCount<defender.doubleBlockUntilOwnStartTurnCount&&
      defender.doubleBlockUsedTurn!==s.turn){
     // Double Block: first blocking action readies the REST blocker immediately.
     defender.ready=true;defender.doubleBlockUsedTurn=s.turn;
   }
   // Official Q71/Q75/Q77: IMPACT deals 1 life on a WINNING BLOCKED
   // battle only. Never add it to an unblocked direct attack. The blocker
   // may suppress IMPACT for this battle, even if retired on losing.
   const won=bp(s,p,attacker)>=bp(s,1-p,defender);
   const impactAmount=Math.max(attacker.greenEventImpact||0,attacker.green008Impact||0,greenHighRaidCombatValue(s,p,attacker).impact);
   const impactDamage=won&&!greenTtgImpactNull(defender)?impactAmount:0;
   if(won)removeFront(s,1-p,defender.uid);
   // Losing an attack does NOT retire the attacker (official Q34).
   if(impactDamage){
    s.pending=null;
    queueLifeDamage(s,1-p,impactDamage);
   }
  }else{
   // Official 008 Darry base: draw on a NOT BLOCKED attack before checking life.
   const after=applyGreen008UnblockedDraw(s,p,attacker.uid);
   Object.assign(s,after);
   s.pending=null;
   if(s.status==='playing')queueLifeDamage(s,1-p,greenHighRaidCombatValue(s,p,attacker).damage);
  }
  if(s.pending?.kind==='block')s.pending=null;
 }else if(action.type==='next'){
  if(s.phase==='start')s.phase='move';
  else if(s.phase==='move')s.phase='main';
  else if(s.phase==='main'){
   const after=resolveTtgMainPhaseEnd(s);Object.assign(s,after);s.phase='attack';
   Object.assign(s,beginTtgGreenAttackPhase(s));
  }
  else if(s.phase==='attack'){
   const after=resolveTtgTurnEnd(s);
   Object.assign(s,after);
   // UNION ARENA: the current player's own field readies at their turn end,
   // so those characters can block on the opponent's following turn.
   for(const c of field(s.players[p]))c.ready=true;
   s.active=1-p;start(s);
  }
 }else if(action.type==='extraDraw'){
  const ap=pl.apCards.find(c=>c.uid===action.apUid);
  if(!ap?.ready||!pl.deck.length)throw new Error('Extra draw cannot pay AP');
  ap.ready=false;pl.hand.push(pl.deck.shift());s.extraDrawn=true;
 }else if(action.type==='move'){
  const index=pl.energy.findIndex(c=>c?.uid===action.uid);
  if(index<0||pl.front[action.slot])throw new Error('Illegal front movement');
  pl.front[action.slot]=pl.energy[index];pl.energy[index]=null;
 }else if(action.type==='play'){
  const i=pl.hand.findIndex(c=>c.uid===action.handUid),h=pl.hand[i],d=printed(h);
  const ap=pl.apCards.find(c=>c.ready);
  if(!ap||pl[action.line][action.slot])throw new Error('Play destination or AP invalid');
  ap.ready=false;pl[action.line][action.slot]={...pl.hand.splice(i,1)[0],ready:false,enteredTurn:s.turn};
  if(TTG_GREEN_ENTRY_IDS.includes(d.id))s.pending={kind:'ttgGreenEntry',player:p,sourceUid:h.uid};
 }else if(action.type==='attack'){
  const c=pl.front.find(c=>c?.uid===action.uid);
  if(!c?.ready)throw new Error('Invalid attack');
  c.ready=false;c.attackTurn=s.turn;
  pl.characterAttacksThisTurn=(pl.attackTurn===s.turn?pl.characterAttacksThisTurn:0)+1;
  pl.attackTurn=s.turn;
  if(pl.characterAttacksThisTurn===1&&['TTG-1-047','TTG-1-048'].includes(c.cardId)){
   const amount=c.cardId==='TTG-1-047'?1500:500;
   c.currentBp=(c.currentBp??printed(c).bp)+amount;
   c.buffs??=[];c.buffs.push({bp:amount,turn:s.turn,until:c.cardId==='TTG-1-047'?'endTurn':'ownNextStart'});
   if(c.cardId==='TTG-1-048')c.doubleBlockUntilOwnStartTurnCount=pl.turnCount+1;
  }
  s.pending=['TTG-1-027','TTG-1-032'].includes(c.cardId)?
   {kind:'greenHighAttackWindow',player:p,uid:c.uid}:{kind:'block',attackerUid:c.uid};
 }else if(legalTtgRuleActions(s,s.pending?.player??p).some(x=>sameAction(x,action))){
  const owner=s.pending?.player??p;
  const after=dispatchTtgRuleAction(s,{...action,player:owner});Object.assign(s,after);
 }else throw new Error('Unsupported core action');
 if(s.status==='playing'&&!s.pending&&!s.pendingTtgLife&&s.pendingDamage)advanceQueuedDamage(s);
 if(s.status==='playing'&&s.pendingLifeOutcome&&!s.pending&&!s.pendingTtgLife&&!s.pendingDamage){
  finalizeTtgLifeOutcome(s,s.pendingLifeOutcome.player);
  delete s.pendingLifeOutcome;
 }
 if(s.status==='playing')Object.assign(s,refreshEnergy(s,s.active));
 assertTtgCoreState(s);
 return s;
}
export function ttgCoreAiChoice(s){
 const options=legalTtgCoreActions(s);
 if(!options.length)return null;
 const p=s.active,pl=s.players[p];
 if(s.pendingTtgLife){
  const options=legalTtgCoreActions(s);
  return options.find(x=>x.mode==='raid'&&x.line==='front')||options.find(x=>x.mode==='raid')||
   options.find(x=>x.mode==='raidHand')||options.find(x=>x.mode==='special'&&x.targetUid)||
   options.find(x=>x.mode==='get')||
   options.find(x=>x.mode==='active'&&x.targetUid)||
   options.find(x=>x.mode==='color'&&x.line==='front')||
   options.find(x=>x.mode==='color')||options[0];
 }
 if(['ttgGreen028Entry','ttgGreen029Entry','green030Sidelined','green012Search','green012Discard','greenHighRaidQueue'].includes(s.pending?.kind))
  return chooseTtgRuleAiAction(s,s.pending.player);
 if(s.pending?.kind==='ttgGreenEntry'){
  const decisions=legalTtgCoreActions(s);
  return decisions.find(x=>x.takeUid&&x.discardUid&&x.takeUid!==x.discardUid)||
   decisions.find(x=>x.takeUid)||decisions.find(x=>x.mode==='outsideTop')||decisions[0];
 }
 if(s.pending?.kind==='greenHighAttackWindow'){
  const choices=legalTtgCoreActions(s);
  return choices.find(x=>x.spendUids?.length&&x.targetUid)||choices.find(x=>x.spendUids?.length)||choices[0];
 }
 if(s.pending?.kind==='block'){
  const att=pl.front.find(c=>c?.uid===s.pending.attackerUid);
  const other=s.players[1-p];
  const candidates=other.front.filter(x=>x?.ready&&greenTtgCanAttackOrBlock(s,1-p,x)&&bp(s,1-p,x)>=bp(s,p,att));
  if(candidates.length)return {type:'block',blockUid:candidates.sort((a,b)=>bp(s,1-p,a)-bp(s,1-p,b))[0].uid};
  return {type:'block',blockUid:null};
 }
 if(s.phase==='move'){
  if(pl.turnCount>1&&pl.front.filter(Boolean).length<2){
   const moves=options.filter(x=>x.type==='move').sort((a,b)=>{
    const da=printed(pl.energy.find(c=>c?.uid===a.uid));
    const db=printed(pl.energy.find(c=>c?.uid===b.uid));
    return (db.bp||0)-(da.bp||0);
   });
   const current=pl.energyProduced.red+pl.energyProduced.green;
   const candidate=moves.find(x=>{
    const c=pl.energy.find(c=>c?.uid===x.uid);
    return current-(printed(c).gen||0)>=2&&printed(c).bp>=2000;
   });
   if(candidate)return candidate;
  }
  return {type:'next'};
 }
 if(s.phase==='main'){
  const plays=options.filter(x=>x.type==='play');
  if(plays.length){
   const onEnergy=plays.filter(x=>x.line==='energy');
   const onFront=plays.filter(x=>x.line==='front');
   const total=pl.energyProduced.green+pl.energyProduced.red;
   if(total<4&&onEnergy.length)return onEnergy.sort((a,b)=>
     printed(pl.hand.find(c=>c.uid===a.handUid)).energy-printed(pl.hand.find(c=>c.uid===b.handUid)).energy)[0];
   if(pl.front.filter(Boolean).length<3&&onFront.length)return onFront.sort((a,b)=>
     printed(pl.hand.find(c=>c.uid===b.handUid)).bp-printed(pl.hand.find(c=>c.uid===a.handUid)).bp)[0];
   if(onEnergy.length)return onEnergy[0];
  }
  // Use exactly the same stand-alone event/REST effect validator as human choices.
  const effects=options.filter(x=>!['play','next'].includes(x.type));
  if(effects.length){
   const candidate=effects.find(x=>x.type==='activateButa063')||effects.find(x=>x.type==='activateViral002')||
    effects.find(x=>x.type==='ttgGreen003Front')||effects.find(x=>x.type==='ttgGreen003Ready')||
    effects.find(x=>x.type==='ttgGreen015')||effects.find(x=>x.type==='ttgGreen011'&&x.mode==='boost')||
    effects.find(x=>x.type==='ttgGreen011')||effects.find(x=>x.type==='ttgGreen018')||
    effects.find(x=>x.type==='ttgGreen022');
   if(candidate)return candidate;
   const normalRaid=['ttgGreen028Raid','ttgGreen029Raid','green030Raid','greenHighRaid'];
   const raidCandidate=effects.find(x=>normalRaid.includes(x.type)&&x.line==='front')||effects.find(x=>normalRaid.includes(x.type));
   if(raidCandidate)return {...raidCandidate,payApUids:pl.apCards.filter(x=>x.ready).slice(0,raidCandidate.requiredAp).map(x=>x.uid)};
   const simon012=effects.find(x=>x.type==='green012Play');
   if(simon012)return {...simon012,payApUids:pl.apCards.filter(x=>x.ready).slice(0,2).map(x=>x.uid)};
   const double=effects.find(x=>x.type==='green012Double');if(double)return double;
   const site=effects.find(x=>x.type==='ttgGreenSitePlay');
   if(site)return {...site,payApUids:pl.apCards.filter(x=>x.ready).slice(0,1).map(x=>x.uid)};
   const raid008=effects.find(x=>x.type==='green008Raid'&&x.line==='front')||effects.find(x=>x.type==='green008Raid');
   if(raid008)return {...raid008,payApUids:pl.apCards.filter(x=>x.ready).slice(0,raid008.requiredAp).map(x=>x.uid)};
   const greenEvent=effects.filter(x=>x.type==='playGreenEvent').sort((a,b)=>(b.targetUids?.length||0)-(a.targetUids?.length||0))[0];
   if(greenEvent)return {type:greenEvent.type,player:p,handUid:greenEvent.handUid,cardId:greenEvent.cardId,
    targetUid:greenEvent.targetUid,targetUids:greenEvent.targetUids,
    payApUids:pl.apCards.filter(c=>c.ready).slice(0,greenEvent.requiredAp).map(c=>c.uid)};
   const multiplier=effects.find(x=>x.type==='green040Double');if(multiplier)return multiplier;
   const event=effects.find(x=>x.type==='playTtgEvent');
   if(event){
    const payApUids=pl.apCards.filter(c=>c.ready).slice(0,event.requiredAp).map(c=>c.uid);
    const readyApUids=pl.apCards.filter(c=>!c.ready||payApUids.includes(c.uid)).slice(0,2).map(c=>c.uid);
    return {type:'playTtgEvent',player:p,handUid:event.handUid,payApUids,readyApUids};
   }
  }
  return {type:'next'};
 }
 if(s.phase==='attack'){
  const actions=options.filter(x=>x.type==='attack');
  return actions[0]||{type:'next'};
 }
 return options.find(x=>x.type==='next')||options[0];
}
export function runTtgCoreAiMatch(startState,{maxSteps=6000}={}){
 if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>100000)throw new Error('Invalid simulation step budget');
 let state=structuredClone(startState),actions=0;
 assertTtgCoreState(state);
 while(state.status==='playing'&&actions<maxSteps){
  const a=ttgCoreAiChoice(state);
  if(!a)throw new Error('AI stuck with no legal actions');
  state=dispatchTtgCoreAction(state,a);
  actions++;
 }
 return {state,actions,truncated:state.status==='playing'};
}
