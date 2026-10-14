// Run against the exact production commit, not a potentially stale AI v4 branch.
import {newGame,dispatch,controller,legalActions} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';
import {decisionSample} from '../dist/ai-v4-environment.mjs';
const games=Number(process.env.AI_V4_GAMES||4);
const samples=[];
const stats={games:0,decisions:0,illegal:0,finished:0,wins:[0,0],truncated:0};
for(let game=0;game<games;game++){
 let s=newGame({mode:'solo',first:game%2,seed:240000+game});
 for(let step=0;step<700&&s.status!=='finished';step++){
  const p=controller(s);
  const action=chooseAiAction(s,{difficulty:'hard'});
  if(!action)break;
  const batch=decisionSample(s,p);
  const index=batch.actions.findIndex(a=>JSON.stringify(a)===JSON.stringify(action));
  if(index<0){stats.illegal++;throw Error('Teacher chose action outside legalActions: '+JSON.stringify(action));}
  samples.push({observation:batch.observation,actions:batch.actions,mask:batch.mask,actionIndex:index});
  stats.decisions++;
  s=dispatch(s,action);
 }
 stats.games++;
 if(s.status==='finished'){stats.finished++;if(s.winner===0||s.winner===1)stats.wins[s.winner]++;}
 else stats.truncated++;
}
console.log(JSON.stringify({stats,examples:samples.length,teacher:'production-hard',sourceCommit:process.env.AI_V4_BASELINE_SHA||'UNPINNED'},null,2));
if(process.env.AI_V4_DATASET_PATH){
 const {writeFileSync}=await import('node:fs');
 writeFileSync(process.env.AI_V4_DATASET_PATH,samples.map(s=>JSON.stringify(s)).join('\n')+'\n');
}
