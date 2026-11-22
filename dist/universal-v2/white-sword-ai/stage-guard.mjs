// Experimental decision-stage guard for learned White Sword residuals.
// A terminal win/loss gradient is not targeted enough to choose effect victims,
// discard slots, or compulsory ordering windows. Keep V2 there; allow V3's
// learned main-phase plan only for voluntary, non-pending decisions.
export function isVoluntaryMainDecision(state){
 return !!state&&state.status==='playing'&&state.phase==='main'&&!state.pending;
}
export function isVoluntaryDecision(state){
 return !!state&&state.status==='playing'&&!state.pending&&
  (state.phase==='main'||state.phase==='attack');
}
export function stageGuardModel(seat,state){
 if(!seat?.stageGuard)return seat?.model;
 if(!seat.model||!seat.baselineModel)throw Error('Stage guarded candidate requires both explicit models');
 const permitted=seat.stageGuardScope==='voluntary'?
  isVoluntaryDecision(state):isVoluntaryMainDecision(state);
 return permitted?seat.model:seat.baselineModel;
}
