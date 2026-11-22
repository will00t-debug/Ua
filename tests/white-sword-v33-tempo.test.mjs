import test from 'node:test';
import assert from 'node:assert/strict';
import {
 tacticalTempoScore,applyTempoToCappedRows,TEMPO_LIMIT,TEMPO_VERSION
} from '../dist/universal-v2/white-sword-ai/v33-tempo.mjs';
import {
 V33_PILOT_SEEDS,V33_EVAL_SEEDS,assertV33Disjoint,v33Cases,v33MirrorCases
} from '../dist/universal-v2/white-sword-ai/v33-protocol.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';

const item={uid:'0-1',cardId:'BLC-4-060',ready:true};
const me={hand:[item],front:[{uid:'0-2',cardId:'BLC-1-083',ready:true}],
 energy:[],apReady:2,energyTotal:2,lifeCount:3};
const other={hand:null,front:[],energy:[],lifeCount:2,apReady:1};
const packs=[{'BLC-4-060':{ap:1,gen:2}},{'BLC-1-083':{ap:1}}];
const obs=(phase='main',pending=null,opp=other)=>({
 visible:{phase,pending,players:[structuredClone(me),structuredClone(opp)]}
});
const play={type:'play',uid:'0-1',line:'energy'};
const next={type:'next'};
const attack={type:'attack',uid:'0-2'};
const score=(observation,action,legal=[action])=>tacticalTempoScore({
 observation,seat:0,action,legal,catalogs:packs
});
test('v3.3 reserves untouched 840 matches and separate pilot',()=>{
 assert.equal(assertV33Disjoint(),true);
 assert.equal(v33Cases().length,360);
 assert.equal(v33MirrorCases().length,120);
 assert.equal(v33Cases(V33_PILOT_SEEDS).length,48);
 assert.equal(v33MirrorCases(V33_PILOT_SEEDS).length,16);
 assert.equal(V33_EVAL_SEEDS.length,30);
 assert.equal(new Set([...V33_PILOT_SEEDS,...V33_EVAL_SEEDS]).size,34);
 assert.match(TEMPO_VERSION,/v3.3/);
});
test('positive early energy development, safe AP utilization and not passing with available plays',()=>{
 const state=obs();
 const good=score(state,play,[play,next]);
 const pass=score(state,next,[play,next]);
 assert.ok(good.bonus>0);
 assert.ok(pass.bonus<0);
 assert.ok(good.bonus<=TEMPO_LIMIT&&pass.bonus>=-TEMPO_LIMIT);
});
test('only public low LIFE with unblocked ready attacker gets closing-pressure bonus',()=>{
 const open=score(obs('attack'),attack,[attack,next]);
 const high=score(obs('attack',null,{...other,lifeCount:5}),attack,[attack,next]);
 const blocked=score(obs('attack',null,{...other,front:[{uid:'1-1',ready:true,cardId:'BLC-1-083'}]}),attack,[attack,next]);
 assert.ok(open.bonus>high.bonus);
 assert.ok(open.bonus>blocked.bonus);
 assert.ok(score(obs('attack'),next,[attack,next]).bonus<0);
});
test('guard and terminal search results cannot be overturned',()=>{
 const state=obs('attack',{kind:'effect-retire-bp'});
 assert.equal(score(state,attack,[attack,next]).bonus,0);
 const rows=[{action:attack,hardScore:50000,measured:true,score:50000},
  {action:next,hardScore:49999,measured:true,score:49999}];
 assert.deepEqual(applyTempoToCappedRows(rows,{enabled:true,observation:obs('attack'),seat:0,legal:[attack,next],catalogs:packs}),rows);
 assert.strictEqual(applyTempoToCappedRows(rows,{enabled:false}),rows);
});
test('opponent hidden cards cannot influence tactical bonus',()=>{
 const state=obs('attack');
 const first=score(state,attack,[attack,next]);
 const otherCopy=structuredClone(state);
 otherCopy.visible.players[1].deckCount=43;
 otherCopy.visible.players[1].handCount=8;
 assert.deepEqual(score(otherCopy,attack,[attack,next]),first);
 assert.throws(()=>score({...state,visible:{...state.visible,players:[state.visible.players[0],{...state.visible.players[1],hand:[item]}]}},attack),
  /opponent hand leaked/);
});
test('headless match with opt-in tempo is legal and finishes',()=>{
 const base=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const seats=[{deckId:'white-sword',policy:'white-sword',model:base,
  tacticalTempo:true,mode:'blend',scale:6,hardCap:7,explore:0},
  {deckId:'reject-blue',policy:'hard-search-2'}];
 const game=playGame({seed:V33_PILOT_SEEDS[0],first:0,specialistSeat:0,
  opponentDeck:'reject-blue',seats,keepSamples:false});
 assert.equal(game.status,'finished',JSON.stringify({error:game.error,anomalies:game.anomalies}));
 assert.deepEqual(Object.values(game.anomalies).filter(Boolean),[]);
});
