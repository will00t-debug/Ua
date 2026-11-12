import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';

function deck(pack,extra){
 const counts={...extra};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(pack.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
function position(){
 const pack=officialV2Pack('bleach');
 const counts=deck(pack,{'BLC-1-042':4,'BLC-1-051':2,'BLC-1-053':2});
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0});
 while(state.phase!=='main')state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 assert.equal(assertUniversalMatch(packs,state),true);
 return {packs,state};
}

test('a real deadline returns a legal action without using the clock as a combo oracle',()=>{
 const {packs,state}=position();
 const legal=legalUniversalActions(packs,state);
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  actor:0,seed:1,nodes:960,ms:25,beam:4,worlds:1,plan:'tree'
 });
 const trace=lastAiV3Trace();
 assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(typeof trace.ms,'number');
 for(const row of trace.compared||[]){
  if(row.boundary==='terminal')assert.ok(Math.abs(row.search)>=90000);
  else assert.notEqual(row.search,100000);
 }
 console.log('plan clock',Math.round(trace.ms*10)/10,trace.reason,trace.cut||'');
});
