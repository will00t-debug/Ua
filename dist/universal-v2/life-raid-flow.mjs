// Presentation stages for a RAID life trigger.
// These helpers never invent an action. The page shows one step at a time,
// then submits an action the engine already listed.

export function lifeRaidStage({raid,actions,activated=false,boarding=false}={}){
 if(raid!==true)return null;
 const list=Array.isArray(actions)?actions:[];
 const raids=list.filter(action=>action?.type==='chooseTrigger'&&action.mode==='raid'&&action.baseUid);
 const skip=list.find(action=>action?.type==='chooseTrigger'&&action.mode==='skip')||null;
 const hand=list.find(action=>action?.type==='chooseTrigger'&&action.mode==='get')||null;
 if(!raids.length&&!hand&&!skip)return null;
 // A print that must raid, such as KMR-1-041, goes straight to the board.
 if(boarding||(!skip&&!hand&&raids.length))return {phase:'board',raids,skip,hand};
 if(activated||(!skip&&(raids.length||hand)))return {phase:'mode',raids,skip,hand};
 return {phase:'activate',raids,skip,hand};
}

// The revealed life card is already chosen. Stamp its uid so the shared
// base-then-cell gesture can see these actions, and keep the engine action
// for the actual submit. The engine list itself stays without that uid.
export function withLifeRaidBoard(actions,uid){
 const list=Array.isArray(actions)?actions:[];
 if(typeof uid!=='string'||!uid)return list;
 return list.map(action=>action?.type==='chooseTrigger'&&action.mode==='raid'
  ?{...action,uid,lifeRaidSource:action}:action);
}
