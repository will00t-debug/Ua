import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {publicPreviewActionLabel,makeUniversalPreviewReplay,appendUniversalReplay} from '../dist/universal-v2/preview-replay.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';

const presets=createAllV2PreviewRealDecks();
test('real V2 opening decisions preserve null-safe stages including public action summary and replay',()=>{
 for(const [key,deck] of Object.entries(presets)){
  for(const first of [0,1]){
   for(const mode of ['keep','redraw']){
    for(const seed of [1,7,35,20261105]){
     const packs=[deck.pack,deck.pack],decks=[deck.counts,deck.counts];
     let s=newUniversalMatch(packs,{decks,first,seed,openingMulligan:true});
     let replay=makeUniversalPreviewReplay(packs,{decks,first,seed,openingMulligan:true});
     for(let i=0;i<2;i++){
      const actor=s.pending.player;
      const choice={type:'openingMulligan',mode:actor===0?mode:'keep'};
      assert.ok(legalUniversalActions(packs,s).some(a=>a.type===choice.type&&a.mode===choice.mode));
      let next;
      try{next=dispatchUniversalAction(packs,s,choice,{actor});}
      catch(error){throw new Error(key+' '+first+' '+mode+' '+seed+' dispatch: '+error.stack);}
      try{assertUniversalMatch(packs,next);}
      catch(error){throw new Error(key+' '+first+' '+mode+' '+seed+' validation: '+error.stack);}
      try{replay=appendUniversalReplay(replay,choice,actor);}
      catch(error){throw new Error(key+' '+first+' '+mode+' '+seed+' replay: '+error.stack);}
      try{publicPreviewActionLabel(packs,s,next,choice,actor);}
      catch(error){throw new Error(key+' '+first+' '+mode+' '+seed+' public label: '+error.stack);}
      try{universalPublicView(packs,next,0);}
      catch(error){throw new Error(key+' '+first+' '+mode+' '+seed+' public view: '+error.stack);}
      s=next;
     }
     assert.equal(s.phase,'start');
     assert.equal(s.pending,null);
     assert.equal(s.players[0].life.length,7);
     assert.equal(s.players[1].life.length,7);
    }
   }
  }
 }
});
test('AI strategy picks legal opening action for both seats',()=>{
 const {pack,counts}=presets['bleach-purple'];
 for(const first of [0,1]){
  let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:2077,first,openingMulligan:true});
  if(first===1){
   const chosen=chooseProgressSafeAiAction([pack,pack],s,{difficulty:'hard'}).action;
   assert.equal(chosen.type,'openingMulligan');
   s=dispatchUniversalAction([pack,pack],s,chosen,{actor:1});
   assert.equal(s.pending.player,0);
  }
 }
});
