// Run the three PDF decks against each other (or the legacy bot), with
// deterministic seeds. No weight fitting occurs; this is evaluation/sparring.
// npm run spar:ai -- --games 36 --opponent legacy --difficulty hard --seed 12000
// npm run spar:ai -- --games 36 --opponent hard --difficulty hard --seed 12000
import {performance} from 'node:perf_hooks';
import {TRAINING_DECKS} from '../dist/training-decks.mjs';
import {newGame, dispatch, controller, botAction, assertState} from '../dist/engine.mjs';
import {chooseAiAction} from '../dist/ai-v2.mjs';

const args=process.argv.slice(2);
function flag(key, fallback){
 const index=args.indexOf('--'+key);
 return index<0?fallback:args[index+1]??fallback;
}
const games=Math.min(360,Math.max(1,Math.trunc(Number(flag('games',36)))||36));
const maxActions=Math.min(2000,Math.max(100,Math.trunc(Number(flag('max-actions',900)))||900));
const seedBase=Math.trunc(Number(flag('seed',12000)))||12000;
const difficulty=flag('difficulty','hard');
const opponent=flag('opponent','legacy');
if(!['normal','hard'].includes(difficulty)||!['normal','hard','legacy'].includes(opponent))
 throw Error('Use --difficulty normal|hard and --opponent normal|hard|legacy');
const selected=flag('deck','all');
const pool=selected==='all'?TRAINING_DECKS:TRAINING_DECKS.filter(d=>d.id===selected||d.sourceCode===selected);
if(!pool.length)throw Error('Unknown training deck: '+selected);
const pairs=pool.flatMap(a=>pool.map(b=>[a,b]));
const stats=Object.fromEntries(pairs.map(([a,b])=>[a.id+'__'+b.id,{games:0,v2Wins:0,opponentWins:0,unfinished:0,errors:0}]));
const times=[],gamesLog=[];
let wins=0,losses=0,unfinished=0,errors=0,allMoves=0;
const start=performance.now();
for(let g=0;g<games;g++){
 const [left,right]=pairs[g%pairs.length],block=Math.floor(g/pairs.length);
 const first=block%2, aiSeat=Math.floor(block/2)%2;
 const seatDecks=[left.counts,right.counts],seed=seedBase+Math.floor(block/4);
 const key=left.id+'__'+right.id, stat=stats[key];stat.games++;
 let s=newGame({decks:seatDecks,first,seed,mode:'solo',names:['AI A','AI B']});
 let moves=0,error=null;
 while(s.status!=='finished'&&moves<maxActions){
  const actor=controller(s);
  const t=performance.now();
  let action;
  try{
   action=actor===aiSeat?chooseAiAction(s,{difficulty})
     :opponent==='legacy'?botAction(s):chooseAiAction(s,{difficulty:opponent});
   if(actor===aiSeat)times.push(performance.now()-t);
   if(!action)throw Error('No AI decision');
   s=dispatch(s,action,actor);
   assertState(s);
   moves++;
  }catch(e){error=String(e?.stack||e);break;}
 }
 allMoves+=moves;
 const won=s.status==='finished'&&s.winner===aiSeat;
 if(error){errors++;stat.errors++;}
 else if(s.status!=='finished'){unfinished++;stat.unfinished++;}
 else if(won){wins++;stat.v2Wins++;}
 else{losses++;stat.opponentWins++;}
 const item={game:g+1,left:left.id,right:right.id,seed,first,aiSeat,result:error?'error':s.status==='finished'?won?'v2':'opponent':'unfinished',moves,...(error?{error}: {})};
 gamesLog.push(item);
 console.log('Game '+item.game+'/'+games+': '+item.left+' vs '+item.right+' -> '+item.result+', actions '+item.moves);
}
times.sort((a,b)=>a-b);
const decided=wins+losses;
const result={
 deckCodes:TRAINING_DECKS.map(d=>d.sourceCode),
 difficulty,opponent,games,wins,losses,unfinished,errors,
 winRateDecided:decided?+(wins/decided*100).toFixed(2):null,
 seedBase,maxActions,actionCount:allMoves,
 decisionMs:{p50:times[Math.floor(times.length*0.5)]??null,p95:times[Math.floor(times.length*0.95)]??null,max:times.at(-1)??null},
 elapsedMs:+(performance.now()-start).toFixed(2),
 byMatchup:stats,gamesLog
};
console.log('SPARRING_SUMMARY='+JSON.stringify(result));
if(errors){process.exitCode=1;}
