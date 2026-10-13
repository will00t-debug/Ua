// UA56BT TTG-1-030/034 simultaneous "When Sidelined" effects.
// Player chooses order; Kittan base return and galaxy-site face-down capture
// both physically resolve. The 034 trigger cannot silently intercept the 030
// Raid base without its own choice or discard any hidden card.
import {legalGreen030SidelinedChoices,resolveGreen030Sidelined} from './ttg-green-030.mjs';
import {legalGreen034SidelinedChoices,resolveGreen034Sidelined} from './ttg-green-fields.mjs';
import {withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';

export function legalGreenRetirementChoices(s){
 const q=s?.pending;
 if(q?.kind!=='greenRetireOrder')return [];
 const out=[];
 for(const effect of q.remaining){
  if(effect==='030'){
   const state={...s,pending:{kind:'green030Sidelined',player:q.player,sourceUid:q.sourceUid,baseUids:q.baseUids}};
   out.push(...legalGreen030SidelinedChoices(state).map(a=>({...a,retirementEffect:'030'})));
  }else if(effect==='034'){
   const state={...s,pending:{kind:'green034Sidelined',player:q.player,retiredUid:q.retiredUid}};
   out.push(...legalGreen034SidelinedChoices(state).map(a=>({...a,retirementEffect:'034'})));
  }
 }
 return out;
}
export function resolveGreenRetirementChoice(s,action){
 const q=s?.pending,choices=legalGreenRetirementChoices(s);
 if(!q||!choices.some(c=>c.type===action.type&&c.retirementEffect===action.retirementEffect&&
  c.mode===action.mode&&c.siteUid===action.siteUid&&c.baseUid===action.baseUid&&
  c.line===action.line&&c.slot===action.slot&&c.ready===action.ready))
   throw new Error('Illegal Q030/034 simultaneous retirement order/target');
 const effect=action.retirementEffect;
 let result;
 if(effect==='030'){
  result=resolveGreen030Sidelined({...s,pending:{kind:'green030Sidelined',player:q.player,
    sourceUid:q.sourceUid,baseUids:q.baseUids}},action);
 }else{
  result=resolveGreen034Sidelined({...s,pending:{kind:'green034Sidelined',player:q.player,
    retiredUid:q.retiredUid}},action);
 }
 const left=q.remaining.filter(x=>x!==effect);
 result.pending=left.length?{...q,remaining:left}:null;
 return withTtgDerivedEnergy(result,q.player);
}

// A sidelined RAID pile loses its in-field pile relationship: put each
// printed physical card in public OUTSIDE, then optional 034 captures only
// the one character that was actually sidelined.
export function flattenSidelinedPile(top){
 const walk=c=>[
  {...c,stack:[],under:[],faceDown:false},
  ...(c.stack||[]).flatMap(walk),
  ...(c.under||[]).flatMap(walk)
 ];
 return walk(top);
}
