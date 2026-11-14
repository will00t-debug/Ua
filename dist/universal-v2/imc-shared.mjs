// Shared IMC entry grants. They ride the existing continuous-effect turn
// and the existing hand-play reducer. They are not a second battle engine.
import {cardHasTrait} from './field-conditions.mjs';

function walkPrinted(value,job){
 if(!value||typeof value!=='object')return false;
 if(value.op==='grantTraitActiveEntryThisTurn'&&value.trait===job.trait&&value.scope===job.scope)
  return true;
 return Object.values(value).some(item=>walkPrinted(item,job));
}

export function traitEntryGrantPrinted(definition,job){
 return walkPrinted(definition,job);
}

export function grantTraitActiveEntry(s,owner,source,job){
 if(!Array.isArray(s.traitEntryGrants))s.traitEntryGrants=[];
 s.traitEntryGrants.push({
  controller:owner,trait:job.trait,scope:job.scope,turn:s.turn,
  consumed:false,sourceUid:source.uid,sourceCardId:source.cardId
 });
}

// A new field entry, not a move between front and energy. scope:'next'
// is spent by the first matching character. scope:'all' stays until the
// turn ends. A later REST instruction does not undo this boundary.
export function applyTraitActiveEntry(s,owner,physical,definition){
 if(!Array.isArray(s.traitEntryGrants)||definition?.type!=='character')return;
 const hits=s.traitEntryGrants.filter(g=>
  g.controller===owner&&g.turn===s.turn&&g.consumed!==true&&cardHasTrait(definition,g.trait));
 if(!hits.length)return;
 physical.ready=true;
 for(const g of hits)if(g.scope==='next')g.consumed=true;
 s.traitEntryGrants=s.traitEntryGrants.filter(g=>g.consumed!==true);
}

export function clearTraitEntryGrants(s){
 s.traitEntryGrants=[];
}

export function assertTraitEntryGrants(s,cardOf){
 if(!Array.isArray(s.traitEntryGrants))throw Error('Missing trait entry grants');
 for(const g of s.traitEntryGrants){
  if(![0,1].includes(g.controller)||typeof g.trait!=='string'||!g.trait.trim()||
   !['next','all'].includes(g.scope)||g.turn!==s.turn||g.consumed!==false||
   typeof g.sourceUid!=='string'||!g.sourceUid.startsWith(g.controller+'-')||
   typeof g.sourceCardId!=='string'||!g.sourceCardId)
   throw Error('Invalid trait entry grant');
  const pl=s.players[g.controller];
  const source=[...pl.front,...pl.energy,...pl.outside,...(pl.resolvingEvents||[]),
   ...pl.hand,...pl.deck,...pl.life].find(c=>c&&c.uid===g.sourceUid);
  if(!source||source.cardId!==g.sourceCardId||!traitEntryGrantPrinted(cardOf(source),g))
   throw Error('Unproven trait entry grant');
 }
}
