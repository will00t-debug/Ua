#!/usr/bin/env node
// Self-play -> outcome-weighted ranking -> held-out mirror-match evaluation.
// Data is generated entirely by the legal rules engine and is never an LLM.
// Example: npm run train:ai -- --games 700 --eval 72 --seed 27000
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {TRAINING_DECKS} from '../dist/training-decks.mjs';
import {newGame,dispatch,legalActions,controller,assertState,cardOf} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';
import {chooseNeuralAction} from '../dist/ai-v3-policy.mjs';
import {encodeAction,FEATURE_VERSION} from '../dist/ai-v3-features.mjs';
import {initModel,trainPair,validateModel} from '../dist/ai-v3-network.mjs';
import {CHAMPION_MODEL} from '../dist/ai-v3-weights.mjs';
import {buildTrainingPairs} from './ai-v3-rewards.mjs';

const args=process.argv.slice(2);
function arg(key,def){const i=args.indexOf('--'+key);return i<0?def:args[i+1]??def;}
const games=Math.max(2,Math.min(5000,Number(arg('games',700))|0));
const evalGames=Math.max(4,Math.min(2000,Number(arg('eval',72))|0));
const maxActions=Math.max(60,Math.min(1500,Number(arg('max-actions',650))|0));
const epochs=Math.max(1,Math.min(20,Number(arg('epochs',5))|0));
const seed=Number(arg('seed',25000))|0;
const promote=args.includes('--promote');
const reportPath=arg('report','audit/ai-v3-evaluation.json');
const candidatePath=arg('candidate','audit/ai-v3-candidate.json');
const minWinRate=Number(arg('min-win-rate',0.55));
const pairs=TRAINING_DECKS.flatMap(l=>TRAINING_DECKS.map(r=>[l,r]));
const now=()=>performance.now();
let randState=(seed>>>0)||1;
function rng(){randState^=randState<<13;randState^=randState>>>17;randState^=randState<<5;return (randState>>>0)/4294967296;}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function prepared(g,seedBase) {
 const [left,right]=pairs[g%pairs.length];
 // Four rotations: first and learning seat are independent.
 const block=Math.floor(g/pairs.length);
 const first=block%2,learningSeat=Math.floor(block/2)%2;
 // Each matchup uses its own held-out seed, with four mirrored seat/first
 // rotations sharing that seed. Avoid measuring all nine pairs with one shuffle.
 const shuffledSeed=seedBase+Math.floor(block/4)*pairs.length+(g%pairs.length);
 return {left:left.id,right:right.id,first,learningSeat,seed:shuffledSeed,
  state:newGame({decks:[left.counts,right.counts],mode:'solo',first,seed:shuffledSeed})};
}
function playGame(g,seedBase,{model=null,collect=false,explore=0}={}){
 const info=prepared(g,seedBase);
 let s=info.state,moves=0,failed=null;
 const records=[];
 while(s.status!=='finished'&&moves<maxActions){
  try{
   const p=controller(s);
   const teacher=chooseAiAction(s,{difficulty:'hard'});
   const actions=legalActions(s);
   if(!teacher||!actions.some(a=>same(a,teacher)))throw Error('baseline returned an illegal action');
   let move=teacher;
   if(model&&p===info.learningSeat){
    move=chooseNeuralAction(s,{model});
    if(!actions.some(a=>same(a,move)))throw Error('network returned an illegal action');
   }
   // Focus exploration on comparable character deployments. Blindly sampling
   // combat, blocking, event choices and pending effects destabilized the
   // baseline and generated contradictory outcome rewards.
   const canCompare=collect&&s.phase==='main'&&!s.pending&&
    teacher.type==='play'&&
    cardOf(s.players[p].hand.find(c=>c.uid===teacher.uid)||{})?.type==='character';
   // Deduplicate equivalent empty slots so a single card cannot dominate
   // the training set merely because three identical slots were available.
   const seenCards=new Set();
   const alternatives=canCompare?actions.filter(a=>{
    if(a.type!=='play'||a.line!==teacher.line||a.uid===teacher.uid||
       seenCards.has(a.uid)||cardOf(s.players[p].hand.find(c=>c.uid===a.uid)||{})?.type!=='character')return false;
    seenCards.add(a.uid);return true;
   }):[];
   // Rank the teacher against up to three DISTINCT legal cards at the same
   // decision point; only one alternative is ever played experimentally.
   const contrasts=[];
   const pool=alternatives.slice();
   for(let j=0;j<3&&pool.length;j++)contrasts.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
   const explored=contrasts.length>0&&rng()<explore;
   if(explored)move=contrasts[Math.floor(rng()*contrasts.length)];
   if(contrasts.length){
    const teacherFeatures=encodeAction(s,teacher,p);
    const chosenFeatures=encodeAction(s,move,p);
    for(const alternative of contrasts){
     records.push({actor:p,chosen:chosenFeatures,teacher:teacherFeatures,
      counter:encodeAction(s,alternative,p),
      // Only one actual exploratory action has game-outcome feedback.
      explored:explored&&same(alternative,move)});
    }
   }
   s=dispatch(s,move,p);
   assertState(s);
   moves++;
  }catch(e){failed=String(e?.stack||e);break;}
 }
 const completed=!failed&&s.status==='finished';
 const samples=collect&&completed?buildTrainingPairs(records,s.winner):[];
 return {completed,winner:completed?s.winner:null,error:failed,moves,
  samples,matchup:info.left+'__'+info.right,first:info.first,
  learningSeat:info.learningSeat,seed:info.seed};
}
function train(model,pairs){
 let last=0;
 for(let epoch=0;epoch<epochs;epoch++){
  // Deterministic shuffled SGD, with a decaying learning rate.
  for(let i=pairs.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
  let total=0;
  for(const row of pairs)total+=trainPair(model,row.yes,row.no,{
   rate:0.009/(1+epoch*0.25),weight:row.weight
  });
  last=total/Math.max(1,pairs.length);
  console.log('Epoch '+(epoch+1)+'/'+epochs+': ranking loss '+last.toFixed(5));
 }
 return last;
}
function evaluate(model){
 const stats=Object.fromEntries(pairs.map(([a,b])=>[a.id+'__'+b.id,{games:0,wins:0,losses:0,unfinished:0,errors:0}]));
 let wins=0,losses=0,unfinished=0,errors=0,moves=0;
 const start=now();
 for(let i=0;i<evalGames;i++){
  const g=playGame(i,seed+1_000_000,{model,collect:false});
  moves+=g.moves;const entry=stats[g.matchup];entry.games++;
  if(g.error){errors++;entry.errors++;console.log('EVAL error '+i+': '+g.error.slice(0,200));}
  else if(!g.completed){unfinished++;entry.unfinished++;}
  else if(g.winner===g.learningSeat){wins++;entry.wins++;}
  else{losses++;entry.losses++;}
  if((i+1)%Math.max(1,Math.ceil(evalGames/8))===0)
   console.log('Eval '+(i+1)+'/'+evalGames+': '+wins+' wins / '+losses+' losses, '+unfinished+' unfinished');
 }
 return {games:evalGames,wins,losses,unfinished,errors,moves,
  winRate:(wins+losses)?wins/(wins+losses):0,
  byMatchup:stats,elapsedMs:Math.round(now()-start)};
}
console.log('AI v3 neural training: '+games+' self-play games, '+evalGames+' separate held-out games');
const model=initModel({seed:seed^0x5fae124,hidden:32});
let completed=0,unfinished=0,failures=0,rows=[];
const started=now();
for(let i=0;i<games;i++){
 // Starting with strong v2 policy + legal exploration reduces cold-start risk.
 const g=playGame(i,seed,{collect:true,explore:0.10});
 if(g.error){failures++;console.log('TRAIN error '+i+': '+g.error.slice(0,200));}
 else if(!g.completed)unfinished++;
 else {completed++;rows.push(...g.samples);}
 if((i+1)%Math.max(1,Math.ceil(games/10))===0)
  console.log('Collect '+(i+1)+'/'+games+': '+completed+' finished, '+rows.length+' pairs');
}
if(!rows.length)throw Error('No completed training games; cannot fit a neural network');
const loss=train(model,rows);
validateModel(model);
fs.mkdirSync(path.dirname(candidatePath),{recursive:true});
fs.writeFileSync(candidatePath,JSON.stringify(model));
const evaluation=evaluate(model);
const adequate=evaluation.wins+evaluation.losses>=Math.min(32,evalGames)
 &&evaluation.unfinished===0&&evaluation.errors===0
 &&evaluation.winRate>=minWinRate;
const report={schema:'ua-ai-v3-training-3',featureVersion:FEATURE_VERSION,
 neuralNetwork:{inputs:model.features,hidden:model.hidden,output:1},
 training:{requestedGames:games,completed,unfinished,failures,
  rankingPairs:rows.length,alternativesPerDecision:3,epochs,finalLoss:loss,elapsedMs:Math.round(now()-started)},
 evaluation:{...evaluation,seedBase:seed+1_000_000,opponent:'hard v2',
  isHeldOut:true,accepted:adequate,
  acceptanceThreshold:minWinRate},
 candidatePath,championPromoted:promote&&adequate,
 disclaimer:'Teacher-ranked legal character deployments with up to three distinct alternative cards per position; weak outcome feedback on the actually explored choice only. Synergy/energy signals derive solely from public and own known cards.'};
if(promote&&adequate){
 const output='dist/ai-v3-weights.mjs';
 const versioned=JSON.stringify({...model,approvedAgainst:'hard-v2',
  holdoutWinRate:evaluation.winRate,holdoutGames:evalGames,
  trainingSeed:seed});
 fs.writeFileSync(output,'// Auto-approved only after held-out test passed.\\nexport const CHAMPION_MODEL='+versioned+';\\n'.replaceAll('\\n','\n'));
 console.log('PROMOTED validated model to '+output);
}else{
 console.log('NOT PROMOTED: '+(promote?'held-out gate failed':'no --promote flag')+'. Existing champion unchanged.');
}
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('FINAL_REPORT='+JSON.stringify({training:report.training,evaluation:{...evaluation,byMatchup:undefined},accepted:adequate,promoted:report.championPromoted}));
if(failures||evaluation.errors)process.exitCode=1;
