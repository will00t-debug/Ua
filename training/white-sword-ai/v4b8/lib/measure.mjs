// Interaction columns are appended only where every action was actually measured.
// A missing action is a failed measurement. It is not stored as zero.
import {extendBand} from '../../v4b6/lib/expand.mjs';
import {CARD_LINE_INTERACTIONS,POSITION_INTERACTIONS} from './protocol.mjs';

export function uncovered(position,context){
 const keys=new Set((context?.actions||[]).map(action=>action.key));
 return (position?.band||[]).filter(row=>!keys.has(row.key)).map(row=>row.key);
}
export function attachMeasured(band,actions,names){
 const byKey=new Map();
 for(const action of actions||[]){
  if(!action?.key||byKey.has(action.key))continue;
  byKey.set(action.key,action.values||{});
 }
 const missing=[];
 for(const row of band||[])if(!byKey.has(row.key))missing.push(row.key);
 if(missing.length)return {ok:false,status:'unmeasured',missing};
 return {ok:true,band:extendBand(band,byKey,names)};
}
export function valuesAt(context,key){
 if(!context?.actions)return null;
 const found=context.actions.find(action=>action.key===key);
 return found?found.values||{}:null;
}
export function lineKeys(position){
 let left={};
 let right={};
 try{left=JSON.parse(position?.actionA?.key||'{}');}catch{left={};}
 try{right=JSON.parse(position?.actionB?.key||'{}');}catch{right={};}
 const front=left.line==='front'?position.actionA.key:right.line==='front'?position.actionB.key:null;
 const energy=left.line==='energy'?position.actionA.key:right.line==='energy'?position.actionB.key:null;
 return {front,energy};
}
export function interactionDiffs(context,position,names=[...POSITION_INTERACTIONS,...CARD_LINE_INTERACTIONS]){
 const keys=lineKeys(position);
 const energy=valuesAt(context,keys.energy);
 const front=valuesAt(context,keys.front);
 if(!energy||!front)return null;
 return Object.fromEntries(names.map(name=>[name,(Number(energy[name])||0)-(Number(front[name])||0)]));
}
