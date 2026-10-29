import {DISCOUNT_KIND,validateHandDiscount} from './ap-discounts.mjs';
// Reusable V2 physical-field continuous statuses, never inferred from card prose.
const field=p=>[...p.front,...p.energy].filter(Boolean);
const player=n=>n===0||n===1;
const protectionScope=v=>['any','character','trigger','characterOrTrigger'].includes(v);
const GRANTED_PROGRAM=new Set(['grantedOnAttack','grantedOnRetire']);
const grantedProgram=(kind,program,optional,until)=>GRANTED_PROGRAM.has(kind)&&(
 !Array.isArray(program)||program.length!==1||program[0]?.op!=='draw'||program[0]?.count!==1||
 Object.keys(program[0]).length!==2||optional!==true||!player(until?.player)||
 until?.phase!=='attack'||until?.edge!=='end');
// A grant can outlive its source's FIELD incarnation, but the physical source
// still belongs to the granting controller, possibly now beneath a Raid.
function ownedSource(s,owner,uid){
 const p=s.players[owner],todo=[
  ...p.front,...p.energy,...p.hand,...p.deck,...p.life,...(p.lifeRevealed||[]),
  ...p.outside,...p.removed
 ];
 const seen=new Set();
 while(todo.length){
  const c=todo.pop();
  if(!c||typeof c!=='object'||seen.has(c))continue;
  seen.add(c);
  if(c.uid===uid)return true;
  if(c.physical)todo.push(c.physical);
  if(Array.isArray(c.under))todo.push(...c.under);
  if(Array.isArray(c.stack))todo.push(...c.stack);
 }
 return false;
}
export function fieldInstance(s,uid){
 for(let p=0;p<2;p++){const c=field(s.players[p]).find(c=>c.uid===uid);
  if(c)return {owner:p,card:c};}return null;
}
export function stampFieldInstance(s,c){
 if(!Number.isInteger(c.fieldEntryStamp)||c.fieldEntryStamp<1)c.fieldEntryStamp=s.nextFieldEntryStamp++;
 return c.fieldEntryStamp;
}
export function grantContinuousState(s,{kind,controller,sourceUid,targetUid,until=null,sourceLinked=false,program=null,optional=false,selectionScope=null,releaseBeforeRefresh=false,whileSourceFront=false}){
 if(!['skipNextActive','cannotActive','cannotAttack','cannotMove','selectionApTax','frontEnergyPermission','originalEffectsDisabled','grantedOnAttack','grantedOnRetire','cannotBeChosenByOppEffect','cannotBlock'].includes(kind)||!player(controller)||
  typeof sourceUid!=='string'||typeof targetUid!=='string'||typeof sourceLinked!=='boolean')
  throw Error('Invalid continuous-state descriptor');
 const target=fieldInstance(s,targetUid),source=fieldInstance(s,sourceUid);
 if(!target)throw Error('Continuous status needs a live field target');
 if(sourceLinked&&!source)throw Error('Source-linked status needs a live source');
 if(GRANTED_PROGRAM.has(kind)&&(sourceLinked||grantedProgram(kind,program,optional,until)))
  throw Error('Invalid granted '+kind+' program or expiration');
 if(!GRANTED_PROGRAM.has(kind)&&(program!==null||optional!==false))
  throw Error('Unknown continuous status program');
 if(kind==='cannotBeChosenByOppEffect'){
  if(!protectionScope(selectionScope)||sourceLinked||target.owner!==controller||
   !ownedSource(s,controller,sourceUid)||until?.player!==controller||
   until?.phase!=='start'||until?.edge!=='start'||Object.keys(until).length!==3)
   throw Error('Selection immunity must have owned source/target and next own START expiration');
 }else if(selectionScope!==null)throw Error('Selection immunity scope belongs only to protection grants');
 if(kind==='skipNextActive'&&until!==null)throw Error('Skip may not have expiry');
 // Q2062: the first OPPONENT turn that begins after the grant. An onPlay
 // during their current turn does not make the surcharge active early.
 const foe=1-controller;
 if(kind==='selectionApTax'&&(sourceLinked||!target||target.owner!==controller||
  until?.player!==foe||until?.phase!=='attack'||until?.edge!=='end'||
  !Number.isInteger(until?.ownTurn)||until.ownTurn!==s.players[foe].ownTurns+1))
  throw Error('Selection AP tax requires own target and next opponent turn');
 // FRONT generation is a separately gained permission this CURRENT turn, not a +1 energy bonus.
 // It can survive its source leaving or losing ORIGINAL printed effects (MST Q2228).
 if(kind==='frontEnergyPermission'&&(sourceLinked||target.owner!==controller||
  until?.player!==s.active||until?.phase!=='attack'||until?.edge!=='end'||
  Object.keys(until).length!==3))
  throw Error('FRONT energy permission requires own live target and current turn end');
 // Only the controller's next own START may expire a temporary attack ban.
 if((kind==='cannotAttack'||kind==='cannotBlock')&&(sourceLinked||until?.player!==controller||
  until?.phase!=='start'||until?.edge!=='start'))
  throw Error('Attack ban must expire on granting controller next own start');
 if(kind==='cannotMove'&&(sourceLinked||until?.player!==controller||
  until?.phase!=='start'||until?.edge!=='start'||Object.keys(until).length!==3))
  throw Error('Move lock must expire on granting controller next own start');
 if(releaseBeforeRefresh!==false&&(releaseBeforeRefresh!==true||kind!=='cannotActive'||sourceLinked))
  throw Error('Early refresh release belongs only to a cannot-active lock');
 // 「このキャラがフロントLを離れるまで、アクティブにならない。」 The lock has
 // no phase expiry. Moving the source to the energy line ends it.
 if(whileSourceFront!==false&&(whileSourceFront!==true||kind!=='cannotActive'||
  !sourceLinked||until!==null||releaseBeforeRefresh!==false||
  !s.players[controller].front.some(c=>c?.uid===sourceUid)))
  throw Error('Front-linked active lock needs its source on the front and no phase expiry');
 if(!(kind==='cannotActive'&&whileSourceFront)&&['cannotActive','cannotAttack','cannotMove','cannotBlock','selectionApTax','frontEnergyPermission','originalEffectsDisabled','grantedOnAttack','grantedOnRetire','cannotBeChosenByOppEffect'].includes(kind)&&(!until||!player(until.player)||
  !['start','move','main','attack'].includes(until.phase)||!['start','end'].includes(until.edge)||
  Object.keys(until).some(k=>!['player','phase','edge',...(kind==='selectionApTax'?['ownTurn']:[])].includes(k))))
  throw Error('Invalid status expiration phase');
 const status={id:s.nextContinuousStateId++,kind,controller,sourceUid,sourceLinked,
  sourceStamp:sourceLinked?stampFieldInstance(s,source.card):null,
  targetUid,targetOwner:target.owner,targetStamp:stampFieldInstance(s,target.card),
  until:until?{...until}:null,consumed:false,
  ...(GRANTED_PROGRAM.has(kind)?{program:program.map(p=>({...p})),optional:true}:{}),
  ...(kind==='cannotBeChosenByOppEffect'?{selectionScope}:{}),
  ...(releaseBeforeRefresh===true?{releaseBeforeRefresh:true}:{}),
  ...(whileSourceFront===true?{whileSourceFront:true}:{})};
 s.continuousStates.push(status);return status.id;
}
// Losing original rules does not remove buffs granted by another effect.
export function originalEffectsDisabled(s,c){
 const target=fieldInstance(s,c?.uid);
 return !!target&&s.continuousStates.some(e=>e.kind==='originalEffectsDisabled'&&
  !e.consumed&&e.targetUid===c.uid&&e.targetOwner===target.owner&&
  e.targetStamp===target.card.fieldEntryStamp);
}
export function pruneContinuousStates(s){
 s.continuousStates=s.continuousStates.filter(e=>{
  if(e.consumed)return false;
  if(e.kind===DISCOUNT_KIND)return e.turn===s.turn;
  const t=fieldInstance(s,e.targetUid);
  if(!t||t.owner!==e.targetOwner||t.card.fieldEntryStamp!==e.targetStamp)return false;
  if(e.sourceLinked){const src=fieldInstance(s,e.sourceUid);
   if(!src||src.card.fieldEntryStamp!==e.sourceStamp)return false;
   if(e.whileSourceFront&&!s.players[e.controller].front.some(c=>
    c?.uid===e.sourceUid&&c.fieldEntryStamp===e.sourceStamp))return false;}
  return true;
 });
}
export function expireContinuousStates(s,{player,phase,edge,onlyReleaseBeforeRefresh=false}){
 s.continuousStates=s.continuousStates.filter(e=>{
  const due=!!e.until&&e.until.player===player&&e.until.phase===phase&&
   e.until.edge===edge&&
   (e.until.ownTurn===undefined||s.players[player].ownTurns>=e.until.ownTurn);
  if(!due)return true;
  if(onlyReleaseBeforeRefresh)return e.releaseBeforeRefresh!==true;
  return false;
 });
 pruneContinuousStates(s);
}
export function attemptFieldActive(s,owner,c){
 pruneContinuousStates(s);
 // 「自分の効果以外でアクティブにならない」: a rule refresh never calls this
 // with a foreign controller, and an opponent effect does not match.
 if(c?.ownEffectActiveOnly){
  let controller=null;
  for(const p of [0,1])if(field(s.players[p]).some(x=>x.uid===c.uid))controller=p;
  if(controller!==owner)return false;
 }
 const restrictions=s.continuousStates.filter(e=>e.targetOwner===owner&&e.targetUid===c.uid&&
  e.targetStamp===c.fieldEntryStamp);
 const skip=restrictions.find(e=>e.kind==='skipNextActive');
 if(c.ready)return true; // already ACTIVE is not a transition
 if(skip)skip.consumed=true; // multiple skips consume one per distinct ACTIVE attempt
 const blocked=!!skip||restrictions.some(e=>e.kind==='cannotActive');
 c.ready=!blocked;pruneContinuousStates(s);return !blocked;
}
export function refreshFieldActive(s,owner){
 pruneContinuousStates(s);
 for(const c of field(s.players[owner])){
  // Q2205: start and end refresh still spend 「次の1回アクティブにならない」.
  // The printed own-effect lock keeps the character REST.
  if(c.ownEffectActiveOnly){
   const skip=s.continuousStates.find(e=>e.kind==='skipNextActive'&&!e.consumed&&
    e.targetOwner===owner&&e.targetUid===c.uid&&e.targetStamp===c.fieldEntryStamp);
   if(skip){skip.consumed=true;pruneContinuousStates(s);}
   continue;
  }
  // Q1052: a start or end refresh consumes 「次の1回アクティブにならない」
  // even when the character is already ACTIVE and stays ACTIVE.
  const skip=s.continuousStates.find(e=>e.kind==='skipNextActive'&&!e.consumed&&
   e.targetOwner===owner&&e.targetUid===c.uid&&e.targetStamp===c.fieldEntryStamp);
  if(c.ready&&skip){skip.consumed=true;pruneContinuousStates(s);continue;}
  attemptFieldActive(s,owner,c);
 }
}
// Only explicit card/Trigger EFFECT choice is restricted, never combat.
// Unknown opposing effect provenance fails closed for character-only and
// combined character-or-trigger protection. An explicit event or field
// source stays selectable under the combined scope.
export function effectChoiceProtected(s,selector,targetUid,sourceType){
 if(!player(selector)||typeof targetUid!=='string')return false;
 const target=fieldInstance(s,targetUid);
 if(!target)return false;
 const triggerImmune=target.card.triggerUnchosenGranted;
 if(sourceType==='trigger'&&triggerImmune&&triggerImmune.turn===s.turn&&
  triggerImmune.stamp===target.card.fieldEntryStamp)return true;
 // 「このターン中、相手の効果で選ばれない」. Combat never calls this helper.
 // The flag is cleared at the next turn start, which is shorter than the
 // continuous cannotBeChosenByOppEffect expiry of the controller's next start.
 const turnImmune=target.card.oppChoiceImmuneGranted;
 if(turnImmune&&selector!==target.owner&&turnImmune.turn===s.turn&&
  turnImmune.stamp===target.card.fieldEntryStamp)return true;
 if(target.owner===selector)return false;
 const earnedUnchosen=target.card.unchosenGranted;
 if(earnedUnchosen&&earnedUnchosen.turn===s.turn&&
  earnedUnchosen.stamp===target.card.fieldEntryStamp)return true;
 return s.continuousStates.some(e=>
  e.kind==='cannotBeChosenByOppEffect'&&!e.consumed&&
  e.controller===target.owner&&e.targetOwner===target.owner&&
  e.targetUid===targetUid&&e.targetStamp===target.card.fieldEntryStamp&&
  (e.selectionScope==='any'||(e.selectionScope==='character'&&
   (sourceType==='character'||sourceType==='unknown'))||
   (e.selectionScope==='trigger'&&sourceType==='trigger')||
   (e.selectionScope==='characterOrTrigger'&&
    (sourceType==='character'||sourceType==='trigger'||sourceType==='unknown'))));
}
// A card-effect selection tax is not a combat attacker/blocker restriction.
export function selectionApSurcharge(s,selector,targetUid){
 if(!player(selector)||s.active!==selector)return 0;
 const target=fieldInstance(s,targetUid);
 if(!target||target.owner===selector)return 0;
 return s.continuousStates.filter(e=>e.kind==='selectionApTax'&&!e.consumed&&
  e.controller===target.owner&&e.targetOwner===target.owner&&
  e.targetUid===targetUid&&e.targetStamp===target.card.fieldEntryStamp&&
  e.until?.player===selector&&
  e.until.ownTurn===s.players[selector].ownTurns).length;
}
export function hasFrontEnergyPermission(s,owner,c){
 const live=fieldInstance(s,c?.uid);
 return !!live&&live.owner===owner&&s.continuousStates.some(e=>
  e.kind==='frontEnergyPermission'&&!e.consumed&&e.controller===owner&&
  e.targetOwner===owner&&e.targetUid===c.uid&&
  e.targetStamp===live.card.fieldEntryStamp);
}
export function fieldRestrictions(s,owner,c){
 return s.continuousStates.filter(e=>!e.consumed&&e.targetOwner===owner&&
  e.targetUid===c.uid&&e.targetStamp===c.fieldEntryStamp)
  .map(e=>({kind:e.kind,until:e.until?{...e.until}:null}));
}
export function validateContinuousStates(s){
 if(!Array.isArray(s.continuousStates)||!Number.isInteger(s.nextContinuousStateId)||
  s.nextContinuousStateId<1||new Set(s.continuousStates.map(e=>e.id)).size!==s.continuousStates.length||
  s.continuousStates.some(e=>e.kind===DISCOUNT_KIND ? !validateHandDiscount(s,e) : !Number.isInteger(e.id)||e.id<1||
   !['skipNextActive','cannotActive','cannotAttack','cannotMove','selectionApTax','frontEnergyPermission','originalEffectsDisabled','grantedOnAttack','grantedOnRetire','cannotBeChosenByOppEffect','cannotBlock'].includes(e.kind)||!player(e.controller)||
   !player(e.targetOwner)||typeof e.sourceUid!=='string'||typeof e.targetUid!=='string'||
   !Number.isInteger(e.targetStamp)||e.targetStamp<1||typeof e.consumed!=='boolean'||
   typeof e.sourceLinked!=='boolean'||(e.sourceLinked&&(!Number.isInteger(e.sourceStamp)||e.sourceStamp<1))||
   (e.kind==='skipNextActive'&&e.until!==null)||
   ((e.kind==='cannotAttack'||e.kind==='cannotBlock')&&(e.sourceLinked||e.until?.player!==e.controller||
    e.until?.phase!=='start'||e.until?.edge!=='start'))||
   (e.kind==='cannotMove'&&(e.sourceLinked||e.until?.player!==e.controller||
    e.until?.phase!=='start'||e.until?.edge!=='start'||Object.keys(e.until||{}).length!==3))||
   (e.kind==='frontEnergyPermission'&&(e.sourceLinked||e.targetOwner!==e.controller||
    e.sourceStamp!==null||e.until?.phase!=='attack'||e.until?.edge!=='end'||
    !player(e.until?.player)||Object.keys(e.until).length!==3||
    Object.keys(e).length!==11||
    Object.keys(e).some(k=>!['id','kind','controller','sourceUid','sourceLinked','sourceStamp',
     'targetUid','targetOwner','targetStamp','until','consumed'].includes(k))))||
   (e.kind==='selectionApTax'&&(e.sourceLinked||e.targetOwner!==e.controller||
    e.until?.player!==1-e.controller||e.until?.phase!=='attack'||
    e.until?.edge!=='end'||!Number.isInteger(e.until?.ownTurn)||
    e.until.ownTurn<1||Object.keys(e.until).length!==4||
    Object.keys(e.until).some(k=>!['player','phase','edge','ownTurn'].includes(k))))||
   (e.kind==='cannotBeChosenByOppEffect'&&(
    !protectionScope(e.selectionScope)||e.sourceLinked||e.sourceStamp!==null||
    e.targetOwner!==e.controller||!ownedSource(s,e.controller,e.sourceUid)||
    e.until?.player!==e.controller||e.until?.phase!=='start'||
    e.until?.edge!=='start'||Object.keys(e.until).length!==3||
    Object.keys(e).length!==12||
    Object.keys(e).some(k=>!['id','kind','controller','sourceUid','sourceLinked',
     'sourceStamp','targetUid','targetOwner','targetStamp','until','consumed',
     'selectionScope'].includes(k))))||
   (e.kind!=='cannotBeChosenByOppEffect'&&e.selectionScope!==undefined)||
   (GRANTED_PROGRAM.has(e.kind)&&(
     e.optional!==true||e.sourceLinked||grantedProgram(e.kind,e.program,e.optional,e.until)))||
   (!GRANTED_PROGRAM.has(e.kind)&&(e.program!==undefined||e.optional!==undefined))||
   (e.whileSourceFront!==undefined&&!(e.kind==='cannotActive'&&e.whileSourceFront===true&&
    e.sourceLinked&&e.until===null&&e.releaseBeforeRefresh===undefined&&
    s.players[e.controller].front.some(c=>c?.uid===e.sourceUid&&c.fieldEntryStamp===e.sourceStamp)))||
   (e.releaseBeforeRefresh!==undefined&&(e.kind!=='cannotActive'||e.releaseBeforeRefresh!==true||e.sourceLinked))||
   (!(e.kind==='cannotActive'&&e.whileSourceFront===true)&&['cannotActive','cannotAttack','cannotMove','selectionApTax','frontEnergyPermission','originalEffectsDisabled','grantedOnAttack','grantedOnRetire','cannotBeChosenByOppEffect','cannotBlock'].includes(e.kind)&&(!e.until||!player(e.until.player)||
    !['start','move','main','attack'].includes(e.until.phase)||!['start','end'].includes(e.until.edge)))))
  throw Error('Invalid continuous-state accounting');
 return true;
}
