import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {designatedBattleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {applySharedOpening,newComparedMatch,nextBuckets,LEGACY_OPENING,OFFICIAL_OPENING} from '../dist/universal-v2/ai-v3/opening.mjs';

function whiteSword(){
 const deck=designatedBattleDecks().find(row=>row.id==='white-sword');
 return {deck,packs:[deck.pack,deck.pack]};
}
function costs(deck,state,seat){
 return state.players[seat].hand.map(card=>deck.pack.cards[card.cardId].energy);
}
function toMain(packs,state){
 let cursor=state;
 while(cursor.phase!=='main'){
  const actor=cursor.pending?.player??cursor.active;
  const next=legalUniversalActions(packs,cursor).find(action=>action.type==='next');
  assert.ok(next);
  cursor=dispatchUniversalAction(packs,cursor,next,{actor});
 }
 return cursor;
}
test('white sword 8300 cannot play before the mulligan and can play 16 cards after it',()=>{
 const {deck,packs}=whiteSword();
 const legacy=newComparedMatch(packs,[deck.counts,deck.counts],8300,1,LEGACY_OPENING);
 assert.equal(legacy.attackerChoosesLife,false);
 assert.deepEqual(costs(deck,legacy,1).slice().sort((a,b)=>a-b),[2,3,4,4,4,4,6]);
 const main=toMain(packs,legacy);
 const mainLegal=legalUniversalActions(packs,main);
 assert.equal(main.active,1);
 assert.deepEqual(mainLegal,[{type:'next'}]);
 assert.deepEqual(nextBuckets(mainLegal,{type:'next'}),{onlyNext:true,voluntaryNext:false,passedDevelopment:false});

 const official=newComparedMatch(packs,[deck.counts,deck.counts],8300,1,OFFICIAL_OPENING);
 assert.equal(official.attackerChoosesLife,true);
 assert.equal(official.pending.kind,'opening-mulligan');
 for(const choose of [chooseStrengthenedHardAction,chooseAiV3Action]){
  const action=choose(packs,official,choose===chooseAiV3Action?{actor:1,nodes:8,ms:1000,seed:1}:{nodes:8,ms:1000,seed:1});
  assert.equal(action.type,'openingMulligan');
  assert.equal(action.mode,'redraw');
 }
 const shared=applySharedOpening(packs,official);
 assert.deepEqual(shared.choices,[{actor:1,mode:'redraw'},{actor:0,mode:'keep'}]);
 const opened=toMain(packs,shared.state);
 const plays=legalUniversalActions(packs,opened).filter(action=>action.type==='play');
 assert.equal(opened.active,1);
 assert.equal(plays.length,16);
 const pass=nextBuckets(legalUniversalActions(packs,opened),{type:'next'});
 assert.equal(pass.onlyNext,false);
 assert.equal(pass.voluntaryNext,true);
 assert.equal(pass.passedDevelopment,true);
});
test('strategy features stay generic and do not call the frozen search',()=>{
 const source=readFileSync(new URL('../dist/universal-v2/ai-v3/strategy.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/hard-ai|chooseStrengthened|BLC-|CSM-|UA\d/);
 const bench=readFileSync(new URL('../scripts/ai-v3-benchmark.mjs',import.meta.url),'utf8');
 assert.match(bench,/openingMulligan/);
 assert.match(bench,/attackerChoosesLife/);
 assert.match(bench,/shared-hard-mulligan/);
 assert.match(bench,/onlyNext/);
 assert.match(bench,/voluntaryNext/);
 assert.match(bench,/88ee9db6/);
});
