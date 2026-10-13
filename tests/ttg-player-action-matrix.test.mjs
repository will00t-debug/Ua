import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET,ttgBetaDeckIssues,ttgExecutableActions,ttgChoiceActor} from '../dist/ttg-browser.mjs';
import {TTG_CORE_SMOKE_IDS,newTtgCoreMatch,legalTtgCoreActions,ttgCoreAiChoice,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';

// End-to-end public UI actions are NOT always identical to core legal templates.
// Each sampled action must be directly executable via the same dispatch as a real
// phone button, with physical-card conservation and no silent skips.
function deckContaining(id){
 const card=TTG_BY_ID[id];
 const d={...(card.color==='red'?TTG_RED_BETA_PRESET:TTG_GREEN_BETA_PRESET)};
 if(d[id])return d;
 for(const donor of Object.keys(d)){
  if(d[donor]<1)continue;
  const next={...d,[donor]:d[donor]-1,[id]:1};
  if(!ttgBetaDeckIssues(next).length)return next;
 }
 throw Error('No valid TTG deck with '+id);
}
test('81-card player-action matrix: a sampled displayed button must always resolve as a valid core action',()=>{
 const sampled=new Set();
 let checked=0;
 for(const id of TTG_CORE_SMOKE_IDS){
  const deck=deckContaining(id);
  let s=newTtgCoreMatch({decks:[deck,deck],seed:9000+Number(id.slice(-3)),first:0});
  for(let step=0;step<4000&&s.status==='playing';step++){
   const actor=ttgChoiceActor(s);
   const offered=ttgExecutableActions(s);
   assert.ok(offered.length,id+' showed no actions at step '+step+' pending='+JSON.stringify(s.pending));
   assert.ok(offered.every(a=>a&&typeof a.type==='string'),id+' invalid display action');
   const candidates=offered.filter(a=>{
    const key=a.type+'|'+String(a.mode)+'|'+String(a.cardId||'')+'|'+String(a.line||'');
    return !sampled.has(key);
   });
   for(const a of candidates.slice(0,2)){
    const key=a.type+'|'+String(a.mode)+'|'+String(a.cardId||'')+'|'+String(a.line||'');
    try{
     const after=dispatchTtgCoreAction(s,a);
     assert.ok(assertTtgCoreState(after));
    }catch(e){
     throw new Error('Unclickable TTG button from deck '+id+' at step '+step+' actor='+actor+' pending='+(s.pending?.kind||s.pendingTtgLife?.trigger||'none')+' action='+JSON.stringify(a)+' cause='+e.message,{cause:e});
    }
    sampled.add(key);checked++;
   }
   const ai=ttgCoreAiChoice(s);
   assert.ok(ai,'AI stall at '+id+' step '+step);
   s=dispatchTtgCoreAction(s,ai);
   assert.ok(assertTtgCoreState(s),'conservation '+id+' '+step);
  }
  assert.equal(s.status,'finished','full game did not end '+id);
 }
 assert.ok(checked>=12,'UI actions sampled too few types: '+checked);
});
