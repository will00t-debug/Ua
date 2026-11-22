import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {projectVisibleNextTurn} from '../dist/universal-v2/hard-ai.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {
 assertV33Disjoint,V33_TRAIN_SEEDS,V33_PILOT_SEEDS,V33_EVAL_SEEDS,
 v33TrainCases,v33EvaluationCases,v33MirrorCases
} from '../dist/universal-v2/white-sword-ai/v33-protocol.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const deck=Object.fromEntries(summarizeDesignatedDecks(id=>!!pack.cards[id])
 .map(row=>[row.key,designatedPlayableCounts(row)]));
function boot(){
 let s=newUniversalMatch(packs,{decks:[deck['white-sword'],deck['reject-blue']],seed:3,first:0});
 for(let i=0;s.phase!=='main'&&i<10;i++){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='next')||
   legalUniversalActions(packs,s)[0];
  assert.ok(action);
  s=dispatchUniversalAction(packs,s,action);
 }
 assert.equal(s.phase,'main');return s;
}
test('v3.3 fixed 96 train / 112 pilot / 840 final splits never overlap',()=>{
 assert.equal(assertV33Disjoint(),true);
 assert.equal(V33_TRAIN_SEEDS.length,24);
 assert.equal(V33_PILOT_SEEDS.length,4);
 assert.equal(V33_EVAL_SEEDS.length,30);
 assert.equal(v33TrainCases().length,96);
 assert.equal(v33EvaluationCases(V33_PILOT_SEEDS).length,48);
 assert.equal(v33MirrorCases(V33_PILOT_SEEDS).length,16);
 assert.equal(v33EvaluationCases().length,360);
 assert.equal(v33MirrorCases().length,120);
});
test('hidden cards and unknown LIFE order do not change next-turn projected threat',()=>{
 const s=boot(),before=structuredClone(s);
 const actor=s.active;
 const actions=legalUniversalActions(packs,s).slice(0,8);
 assert.ok(actions.length>=2);
 const first=projectVisibleNextTurn(packs,s,actor,actions);
 assert.deepEqual(s,before,'teacher must not mutate the real state');
 assert.ok(first.length>=1,'at least one visible legal branch can be projected');
 assert.ok(first.every(x=>Number.isFinite(x.delta)&&Math.abs(x.delta)<=14));
 const second=structuredClone(s);
 // Both players' unrevealed LIFE/deck are rearranged: identical public view.
 for(const pl of second.players){
  const life=pl.life[0],deck=pl.deck[0];
  if(life&&deck){pl.life[0]=deck;pl.deck[0]=life;}
  pl.deck.reverse();
 }
 assert.deepEqual(universalPublicView(packs,s,actor),universalPublicView(packs,second,actor));
 assert.deepEqual(projectVisibleNextTurn(packs,second,actor,actions),first);
 assert.deepEqual(projectVisibleNextTurn(packs,s,actor,actions),first);
});
test('non-voluntary or hidden pending states cannot request projection',()=>{
 const s=boot(),actions=legalUniversalActions(packs,s).slice(0,3);
 assert.deepEqual(projectVisibleNextTurn(packs,{...s,phase:'block'},0,actions),[]);
 assert.deepEqual(projectVisibleNextTurn(packs,{...s,pending:{kind:'effect-retire-bp'}},0,actions),[]);
 assert.deepEqual(projectVisibleNextTurn(packs,s,0,[]),[]);
});
test('one actual v3.3 training game records weighted future Q pairs without winner-as-action reward',()=>{
 const row=v33TrainCases({smoke:true})[0],base=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const seats=[];
 seats[row.specialistSeat]={deckId:'white-sword',policy:'white-sword',model:base,
  mode:'blend',hardCap:7,scale:6,timeoutMs:20000,explore:0};
 seats[1-row.specialistSeat]={deckId:row.opponentDeck,policy:'hard-search-2'};
 const game=playGame({...row,seats,label:'v33-hidden-safe',
  keepSamples:true,recordQPreferences:true,recordQStrategy:'next-turn',
  recordQScope:'voluntary',recordSeat:row.specialistSeat});
 assert.equal(game.status,'finished',JSON.stringify({error:game.error,anomalies:game.anomalies}));
 assert.ok(game.samples.length>0,'next-turn teacher should obtain useful choices');
 const types=new Set(['play','event','activate','attack','raid','next','extraDraw','move']);
 assert.ok(game.samples.every(s=>s.kind==='q-preference'&&types.has(s.actionType)&&
  s.weight>0&&!('reward' in s)));
});
