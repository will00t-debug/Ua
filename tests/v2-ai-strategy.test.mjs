import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {createUniversalAiObservation} from '../dist/universal-v2/ai-observation.mjs';
const presets=createAllV2PreviewRealDecks();
const left=presets['bleach-green'],right=presets['gurren-lagann-red'];
const packs=[left.pack,right.pack];
const match=()=>newUniversalMatch(packs,{decks:[left.counts,right.counts],seed:853});
test('all difficulty decisions are exact native actions and do not mutate state',()=>{
 let s=match();
 for(let n=0;n<140&&s.status==='playing';n++){
  const before=JSON.stringify(s),legal=legalUniversalActions(packs,s);
  for(const difficulty of ['easy','normal','hard']){
   const a=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(a)),difficulty);
  }
  assert.equal(JSON.stringify(s),before);
  s=dispatchUniversalAction(packs,s,chooseUniversalAiAction(packs,s,{difficulty:'hard'}),{actor:s.pending?.player??s.active});
 }
});
test('safe observation excludes hidden identities, RNG and opponent deck list',()=>{
 const s=match(),obs=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
 assert.deepEqual(obs.players[1].hand,[]);
 assert.equal(obs.rng,undefined);assert.equal(obs.effectQueue,undefined);
 assert.equal(obs.players[0].deck,undefined);assert.equal(obs.players[0].life.length,undefined);
 const hidden=s.players[1].hand.map(x=>x.uid);
 for(const uid of hidden)assert.ok(!JSON.stringify(obs).includes('"'+uid+'"'));
});
import {rankUniversalAiActions,evaluateUniversalAiPosition} from '../dist/universal-v2/ai-strategy.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
const tacticalPack=createUniversalPack({id:'ai-tactics-fixture',version:'1',cards:[
 {id:'weak',name:'Weak',type:'character',color:'red',energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla'},
 {id:'strong',name:'Strong',type:'character',color:'red',energy:4,ap:1,bp:4000,gen:1,implementation:'vanilla'},
 {id:'big',name:'Big',type:'character',color:'red',energy:5,ap:1,bp:5000,gen:1,implementation:'vanilla'}
]});
const tp=[tacticalPack,tacticalPack];
function tactical(){return {actor:0,active:0,phase:'attack',status:'playing',ownDeckCounts:{weak:4,strong:4,big:4},choices:[],pending:null,players:[0,1].map(()=>({life:5,deckCount:20,handCount:2,hand:[],outside:[],ap:3,energyTotal:5,energyByColor:{red:5},front:[],energy:[]})),legal:[]};}
const physical=(id,uid,bp,ready=true)=>({cardId:id,uid,bp,ready,impact:0,damage:1});
const pick=o=>rankUniversalAiActions(tp,o)[0].action;
test('Hard values live BP and rejects a losing sniper battle; retains exact target stamp',()=>{
 const o=tactical();o.players[0].front=[physical('strong','0-a',500),physical('weak','0-b',6000)];
 o.players[1].front=[physical('big','1-a',5000)];
 o.legal=[{type:'next'}, {type:'attack',uid:'0-a',targetUid:'1-a',targetStamp:7},{type:'attack',uid:'0-b',targetUid:'1-a',targetStamp:7}];
 assert.deepEqual(pick(o),o.legal[2]);
 o.players[0].front.pop();o.legal.pop();assert.equal(pick(o).type,'next');
});
test('Hard respects end-turn refresh and preserves a refresh-prohibited blocker under lethal counter-pressure',()=>{
 const o=tactical();o.players[0].front=[physical('strong','0-a',4000)];
 o.players[1].front=[physical('weak','1-a',1000,false),physical('weak','1-b',1000,false),physical('weak','1-c',1000,false)];
 o.legal=[{type:'next'},{type:'attack',uid:'0-a'}];
 assert.equal(pick(o).type,'attack');o.players[0].life=1;assert.equal(pick(o).type,'attack','normal end-turn refresh preserves defense');
 o.players[0].front[0].restrictions=[{kind:'cannotActive'}];assert.equal(pick(o).type,'next');
});
test('Hard avoids replacing a stronger own card for a weaker play and values lethal damage',()=>{
 const o=tactical();o.phase='main';o.players[0].hand=[{cardId:'weak',uid:'0-w'}];
 o.players[0].front=[physical('strong','0-a',4000)];
 o.legal=[{type:'next'},{type:'play',uid:'0-w',line:'front',replaceUid:'0-a',slot:0}];
 assert.equal(pick(o).type,'next');
 o.phase='attack';o.players[1].life=0;o.legal=[{type:'next'},{type:'attack',uid:'0-a'}];
 assert.equal(pick(o).type,'attack');
});
test('Hard pays mandatory discard with lower opportunity cost and can decline optional sacrifice',()=>{
 const o=tactical();o.players[0].hand=[{cardId:'big',uid:'0-a'},{cardId:'weak',uid:'0-b'}];
 o.pending={kind:'effect-discard',player:0};o.legal=o.players[0].hand.map(c=>({type:'chooseDiscard',uid:c.uid}));
 assert.equal(pick(o).uid,'0-b');
 o.players[0].front=[physical('big','0-c',5000)];o.pending.kind='effect-retire-own-character';
 o.legal=[{type:'chooseOwnCharacterRetire',uid:null},{type:'chooseOwnCharacterRetire',uid:'0-c'}];
 assert.equal(pick(o).uid,null);
});
test('evaluation responds to effective BP, life danger, hand resources and terminal outcome',()=>{
 const o=tactical(),before=evaluateUniversalAiPosition(tp,o);
 o.players[0].front.push(physical('weak','0-a',6000));assert.ok(evaluateUniversalAiPosition(tp,o)>before);
 o.status='finished';o.winner=1;assert.equal(evaluateUniversalAiPosition(tp,o),-1e6);
});
test('hidden-zone permutations cannot affect Hard observations, rankings or deterministic replay',()=>{
 let s=match();
 for(let n=0;n<100&&s.status==='playing';n++){
  if(!s.pending){
   const altered=structuredClone(s),actor=s.active;
   for(let p=0;p<2;p++){
    altered.players[p].deck.reverse();altered.players[p].life.reverse();
   }
   const enemy=altered.players[1-actor];
   if(enemy.hand.length&&enemy.deck.length)[enemy.hand[0],enemy.deck[0]]=[enemy.deck[0],enemy.hand[0]];
   altered.rng=123456;
   const a=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
   const b=createUniversalAiObservation(packs,altered,legalUniversalActions(packs,altered));
   assert.deepEqual(a,b);assert.deepEqual(rankUniversalAiActions(packs,a),rankUniversalAiActions(packs,b));
  }
  const diagA={},diagB={};
  // Fixed, deliberately small node budget: do not mistake different emergency
  // wall-clock preemptions for hidden-card influence in replay equivalence.
  const limits={roots:2,children:1,depth:2,nodes:6,timeMs:100};
  const action=chooseUniversalAiAction(packs,s,{difficulty:'hard',
   tacticalLimits:limits,telemetry:diagA}),actor=s.pending?.player??s.active;
  const next=dispatchUniversalAction(packs,s,action,{actor});
  const restored=JSON.parse(JSON.stringify(s));
  const repeated=chooseUniversalAiAction(packs,restored,{difficulty:'hard',
   tacticalLimits:limits,telemetry:diagB});
  if(JSON.stringify(repeated)!==JSON.stringify(action))
   console.error('R3 REPLAY DIVERGENCE',JSON.stringify({n,phase:s.phase,
    pending:s.pending?.kind||null,initial:diagA,repeated:diagB,
    rootActions:legalUniversalActions(packs,s).length}));
  assert.deepEqual(repeated,action);
  assert.deepEqual(dispatchUniversalAction(packs,restored,action,{actor}),next);
  s=next;
 }
});
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('every engine pending kind has an explicit reviewed AI category; new kinds fail this gate',()=>{
 const engine=readFileSync(new URL('../dist/universal-v2/engine.mjs',import.meta.url),'utf8');
 const start=engine.indexOf("!['phase-order'");
 const list=engine.slice(start,engine.indexOf('].includes(s.pending.kind)',start));
 const actual=[...list.matchAll(/'([^']+)'/g)].map(x=>x[1]).sort();
 const inventory=JSON.parse(readFileSync(new URL('./fixtures/v2-ai-decision-inventory.json',import.meta.url)));
 const reviewed=Object.values(inventory.pendingGroups).flat().sort();
 assert.deepEqual(actual,reviewed);assert.equal(new Set(reviewed).size,reviewed.length);
 const baseline=readFileSync(new URL('./fixtures/ai-r58/ai.mjs',import.meta.url),'utf8').replace("from '../../../dist/universal-v2/engine.mjs'","from './engine.mjs'");
 assert.equal(createHash('sha256').update(baseline).digest('hex'),'b7c17bb203cba998d6417775d07656b058ec22c33b0fcf54e8eda5306a12e616');
});
test('new strategy has no reducer import, remote API or access to concealed state',()=>{
 const code=readFileSync(new URL('../dist/universal-v2/ai-strategy.mjs',import.meta.url),'utf8');
 assert.ok(!/dispatchUniversalAction|fetch\(|XMLHttpRequest|\.rng\b|\.effectQueue\b|\.players\[[^\]]+\]\.deck\b/.test(code));
});
