#!/usr/bin/env node
// Replay the v1 mirror losses. This does not train and does not touch the
// saved v1 weights.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {finalSpecs} from '../dist/universal-v2/white-sword-ai/protocol.mjs';
import {continueMatch,replayTo} from '../dist/universal-v2/white-sword-ai/diagnose.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||availableParallelism()-1||1),3));
const OUT=process.env.WS_OUT||'docs/white-sword-ai/diagnosis-v1.json';
const HARD_CAP=process.env.WS_HARD_CAP==null||process.env.WS_HARD_CAP===''?null:Number(process.env.WS_HARD_CAP);
const COUNTERFACTUAL=process.env.WS_COUNTERFACTUAL!=='0';

function materialize(row,model){
 const specialist={
  deckId:'white-sword',policy:'white-sword',model,
  mode:model.selectedMode||'blend',scale:model.blendScale??6,explore:0,
  hardCap:HARD_CAP
 };
 const opponent={deckId:'white-sword',policy:'hard-search-2',model:null,mode:'policy',explore:0,scale:0};
 const seats=[null,null];
 seats[row.cell.specialistSeat]=specialist;
 seats[1-row.cell.specialistSeat]=opponent;
 return {
  seed:row.seed,first:row.cell.first,specialistSeat:row.cell.specialistSeat,
  opponentDeck:'white-sword',label:'final',seats
 };
}
function runPool(specs){
 return new Promise((resolve,reject)=>{
  const results=new Array(specs.length);
  let cursor=0,finished=0;
  const pool=[];
  const fail=error=>{
   for(const worker of pool)worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  const assign=(worker,index)=>{
   const onMessage=message=>{
    worker.off('message',onMessage);
    if(!message?.ok)return fail(message?.error||'worker failed');
    results[index]=message.game;
    finished++;
    if(finished%8===0||finished===specs.length)console.log('diagnosed',finished+'/'+specs.length);
    if(cursor<specs.length)assign(worker,cursor++);
    else if(finished===specs.length){
     for(const item of pool)item.terminate();
     resolve(results);
    }
   };
   worker.on('message',onMessage);
   worker.postMessage(specs[index]);
  };
  for(let i=0;i<Math.min(WORKERS,specs.length);i++){
   const worker=new Worker(new URL('./white-sword-diagnose-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function countTags(games){
 const tags={};
 const primary={};
 let decisions=0;
 for(const game of games)for(const row of game.disagreements){
  decisions++;
  primary[row.primary]=(primary[row.primary]||0)+1;
  for(const tag of row.tags||[])tags[tag]=(tags[tag]||0)+1;
 }
 return {decisions,primary,tags};
}
function pickExamples(losses){
 const rows=[];
 for(const game of losses)for(const row of game.disagreements)
  rows.push({game,row});
 rows.sort((a,b)=>(b.row.sacrifice??-1e9)-(a.row.sacrifice??-1e9));
 const picked=[];
 const perGame=new Map();
 const perPrimary=new Map();
 const take=row=>{
  const id=row.game.seed+':'+row.game.first+':'+row.game.specialistSeat;
  perGame.set(id,(perGame.get(id)||0)+1);
  perPrimary.set(row.row.primary,(perPrimary.get(row.row.primary)||0)+1);
  picked.push(row);
 };
 for(const row of rows){
  if(picked.length>=20)break;
  const id=row.game.seed+':'+row.game.first+':'+row.game.specialistSeat;
  if((perGame.get(id)||0)>=2)continue;
  if((perPrimary.get(row.row.primary)||0)>=5)continue;
  if((row.row.sacrifice??0)<=7&&picked.length<12)continue;
  take(row);
 }
 for(const row of rows){
  if(picked.length>=20)break;
  if(picked.some(item=>item.game===row.game&&item.row.step===row.row.step))continue;
  take(row);
 }
 return picked.slice(0,20);
}
function specFrom(game,model){
 return materialize({
  seed:game.seed,
  cell:{first:game.first,specialistSeat:game.specialistSeat},
  opponentDeck:'white-sword'
 },model);
}
async function main(){
 const model=loadModel('training/white-sword-ai/weights/candidate.json');
 const specs=finalSpecs().filter(row=>row.opponentDeck==='white-sword').map(row=>materialize(row,model));
 console.log('mirror games',specs.length,'mode',model.selectedMode,'scale',model.blendScale);
 const games=await runPool(specs);
 const losses=games.filter(game=>game.status==='finished'&&game.winner!==game.specialistSeat);
 const wins=games.filter(game=>game.status==='finished'&&game.winner===game.specialistSeat);
 const unfinished=games.filter(game=>game.status!=='finished'||(game.winner!==0&&game.winner!==1));
 console.log('wins',wins.length,'losses',losses.length,'unfinished',unfinished.length);
 const examples=[];
 if(COUNTERFACTUAL)for(const item of pickExamples(losses)){
  const spec=specFrom(item.game,model);
  const {packs,state}=replayTo(spec,item.game.actions,item.row.step);
  const swapped=continueMatch(packs,state,spec,item.row.hardAction);
  const takeoverSpec={...spec,seats:spec.seats.map(seat=>({...seat,policy:'hard-search-2',model:null}))};
  const {packs:packs2,state:state2}=replayTo(spec,item.game.actions,item.row.step);
  const takeover=continueMatch(packs2,state2,takeoverSpec,item.row.hardAction);
  const originalLoss=item.game.winner!==item.game.specialistSeat;
  const swappedWin=swapped.winner===item.game.specialistSeat;
  const takeoverWin=takeover.winner===item.game.specialistSeat;
  let verdict='未改變結果';
  if(swappedWin)verdict='改成 Hard 的這一手後，其餘決策不變，這場由敗轉勝';
  else if(takeoverWin)verdict='只改這一手仍敗；從這裡改由 Hard 下完則勝，後面還有一連串決策';
  else verdict='改成 Hard 的這一手，或從這裡整段改由 Hard 下完，這場仍然落敗';
  examples.push({
   seed:item.game.seed,first:item.game.first,specialistSeat:item.game.specialistSeat,
   step:item.row.step,turn:item.row.turn,primary:item.row.primary,tags:item.row.tags,
   sacrifice:item.row.sacrifice,hardScore:item.row.hardScore,chosenScore:item.row.chosenScore,
   position:item.row.position,chosen:item.row.chosen,hard:item.row.hard,legal:item.row.legal,
   originalWinner:item.game.winner,swapped,takeover,originalLoss,swappedWin,takeoverWin,verdict
  });
  console.log('counterfactual',examples.length,item.game.seed,item.row.primary,verdict);
 }
 const report={
  source:'v1 candidate blend',hardCap:HARD_CAP,
  games:games.length,wins:wins.length,losses:losses.length,unfinished:unfinished.length,
  anomalies:games.reduce((sum,game)=>{
   for(const key of Object.keys(game.anomalies||{}))sum[key]=(sum[key]||0)+(game.anomalies[key]||0);
   return sum;
  },{}),
  lossTags:countTags(losses),
  winTags:countTags(wins),
  examples,
  gamesBrief:games.map(game=>({
   seed:game.seed,first:game.first,specialistSeat:game.specialistSeat,
   specialistIsFirst:game.specialistIsFirst,winner:game.winner,status:game.status,
   endReason:game.endReason,steps:game.steps,turn:game.turn,overrides:game.overrides,
   anomalies:game.anomalies,error:game.error
  }))
 };
 mkdirSync('docs/white-sword-ai',{recursive:true});
 writeFileSync(OUT,JSON.stringify(report,null,2));
 console.log('wrote',OUT);
}
main().catch(error=>{console.error(error);process.exit(1);});
