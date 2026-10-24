import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {matchesCompletedMove} from '../dist/universal-v2/zone-move-events.mjs';
const ids=Array.from({length:13},(_,i)=>'D'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({
 id,name:id,color:'green',energy:0,ap:1,bp:1000,gen:1,type:'character',
 implementation:id==='D00'?'dsl':'vanilla',
 ...(id==='D00'?{effects:{onPlay:[{op:'discardOppHand',count:1}]}}:{})
}));
const pack=createUniversalPack({id:'gpt-opponent-discard-provenance',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('no '+id);
}
test('opponent discard is opponent-effect, controlled by causing actor; never an own-effect ledger false positive',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:1906,first:0});
 const source=take(s,0,'D00');s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.pending.player,1);
 const action=legalUniversalActions(packs,s)[0];
 assert.equal(action.type,'chooseDiscard');
 const old=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:source.uid},{actor:1}),
  /not currently legal/);
 assert.deepEqual(old,s);
 s=dispatchUniversalAction(packs,s,action,{actor:1});
 const move=s.zoneMoveEvents.find(e=>e.uid===action.uid);
 assert.ok(move);
 assert.deepEqual([move.owner,move.controller,move.from,move.to,move.reason],
  [1,0,'hand','outside','opponent-effect']);
 assert.equal(move.sourceUid,source.uid);
 assert.equal(move.sourceCardId,'D00');
 assert.equal(move.sourceOnField,true);
 assert.equal(matchesCompletedMove(move,{owner:1,controller:0,reason:'opponent-effect'}),true);
 assert.equal(matchesCompletedMove(move,{reason:'own-effect'}),false);
 // Legacy broad boolean is intentionally compatible with pre-R19 behavior;
 // source-specific conditions must inspect the new typed event instead.
 assert.equal(s.turnEffectZoneMoves[1].handToOutside,true);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
