// Reusable V2 physical-field continuous statuses, never inferred from card prose.
const field=p=>[...p.front,...p.energy].filter(Boolean);
const player=n=>n===0||n===1;
export function fieldInstance(s,uid){
 for(let p=0;p<2;p++){const c=field(s.players[p]).find(c=>c.uid===uid);
  if(c)return {owner:p,card:c};}return null;
}
export function stampFieldInstance(s,c){
 if(!Number.isInteger(c.fieldEntryStamp)||c.fieldEntryStamp<1)c.fieldEntryStamp=s.nextFieldEntryStamp++;
 return c.fieldEntryStamp;
}
export function grantContinuousState(s,{kind,controller,sourceUid,targetUid,until=null,sourceLinked=false}){
 if(!['skipNextActive','cannotActive','originalEffectsDisabled'].includes(kind)||!player(controller)||
  typeof sourceUid!=='string'||typeof targetUid!=='string'||typeof sourceLinked!=='boolean')
  throw Error('Invalid continuous-state descriptor');
 const target=fieldInstance(s,targetUid),source=fieldInstance(s,sourceUid);
 if(!target)throw Error('Continuous status needs a live field target');
 if(sourceLinked&&!source)throw Error('Source-linked status needs a live source');
 if(kind==='skipNextActive'&&until!==null)throw Error('Skip may not have expiry');
 if(['cannotActive','originalEffectsDisabled'].includes(kind)&&(!until||!player(until.player)||
  !['start','move','main','attack'].includes(until.phase)||!['start','end'].includes(until.edge)||
  Object.keys(until).some(k=>!['player','phase','edge'].includes(k))))
  throw Error('Invalid status expiration phase');
 const status={id:s.nextContinuousStateId++,kind,controller,sourceUid,sourceLinked,
  sourceStamp:sourceLinked?stampFieldInstance(s,source.card):null,
  targetUid,targetOwner:target.owner,targetStamp:stampFieldInstance(s,target.card),
  until:until?{...until}:null,consumed:false};
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
  const t=fieldInstance(s,e.targetUid);
  if(!t||t.owner!==e.targetOwner||t.card.fieldEntryStamp!==e.targetStamp)return false;
  if(e.sourceLinked){const src=fieldInstance(s,e.sourceUid);
   if(!src||src.card.fieldEntryStamp!==e.sourceStamp)return false;}
  return true;
 });
}
export function expireContinuousStates(s,{player,phase,edge}){
 s.continuousStates=s.continuousStates.filter(e=>!e.until||
  !(e.until.player===player&&e.until.phase===phase&&e.until.edge===edge));
 pruneContinuousStates(s);
}
export function attemptFieldActive(s,owner,c){
 pruneContinuousStates(s);
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
 for(const c of field(s.players[owner]))attemptFieldActive(s,owner,c);
}
export function fieldRestrictions(s,owner,c){
 return s.continuousStates.filter(e=>!e.consumed&&e.targetOwner===owner&&
  e.targetUid===c.uid&&e.targetStamp===c.fieldEntryStamp)
  .map(e=>({kind:e.kind,until:e.until?{...e.until}:null}));
}
export function validateContinuousStates(s){
 if(!Array.isArray(s.continuousStates)||!Number.isInteger(s.nextContinuousStateId)||
  s.nextContinuousStateId<1||new Set(s.continuousStates.map(e=>e.id)).size!==s.continuousStates.length||
  s.continuousStates.some(e=>!Number.isInteger(e.id)||e.id<1||
   !['skipNextActive','cannotActive','originalEffectsDisabled'].includes(e.kind)||!player(e.controller)||
   !player(e.targetOwner)||typeof e.sourceUid!=='string'||typeof e.targetUid!=='string'||
   !Number.isInteger(e.targetStamp)||e.targetStamp<1||typeof e.consumed!=='boolean'||
   typeof e.sourceLinked!=='boolean'||(e.sourceLinked&&(!Number.isInteger(e.sourceStamp)||e.sourceStamp<1))||
   (e.kind==='skipNextActive'&&e.until!==null)||
   (['cannotActive','originalEffectsDisabled'].includes(e.kind)&&(!e.until||!player(e.until.player)||
    !['start','move','main','attack'].includes(e.until.phase)||!['start','end'].includes(e.until.edge)))))
  throw Error('Invalid continuous-state accounting');
 return true;
}
