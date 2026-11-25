// The fair schedule pairs models under the same shuffle, seat and turn order.
import {CELLS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {
 AUDIT_GAMES,AUDIT_SEEDS,FAIR_GAMES,FAIR_SEEDS,FROZEN_WEIGHT,MATCH_OPPONENTS,seedInterval
} from './protocol.mjs';

function hardSeat(deckId){
 return {deckId,policy:'hard-search-2',residual:false,weight:0};
}
function swordSeat(arm,weight,feature){
 const residual=arm==='residual';
 return {deckId:'white-sword',policy:'white-sword',residual,weight:residual?weight:0,feature};
}
function pack(spec,seats){
 return {...spec,weight:spec.arm==='v2'?0:spec.weight,seats};
}
export function fairSpecs({seeds=FAIR_SEEDS,weight=FROZEN_WEIGHT,feature}={}){
 if(seeds.length!==16)throw Error('診斷種子不是 16 個');
 if(weight!==FROZEN_WEIGHT)throw Error('診斷不得改權重');
 const specs=[];
 for(const opponent of MATCH_OPPONENTS){
  seeds.forEach((seed,index)=>{
   if(opponent==='white-sword'){
    for(const cell of CELLS){
     const seats=[swordSeat('v2',weight,feature),swordSeat('v2',weight,feature)];
     seats[cell.specialistSeat]=swordSeat('residual',weight,feature);
     specs.push(pack({
      seed,opponent,arm:'mirror',specialistSeat:cell.specialistSeat,first:cell.first,weight
     },seats));
    }
    return;
   }
   const specialistSeat=index%2;
   for(const first of [0,1]){
    for(const arm of ['v2','residual']){
     const seats=[hardSeat(opponent),hardSeat(opponent)];
     seats[specialistSeat]=swordSeat(arm,weight,feature);
     specs.push(pack({seed,opponent,arm,specialistSeat,first,weight},seats));
    }
   }
  });
 }
 return specs;
}
export function auditJobs(){
 const jobs=[
  {audit:true,opponent:'white-sword',seed:AUDIT_SEEDS['white-sword'],specialistSeat:0,first:0},
  {audit:true,opponent:'white-sword',seed:AUDIT_SEEDS['white-sword'],specialistSeat:0,first:1},
  {audit:true,opponent:'white-sword',seed:AUDIT_SEEDS['white-sword-second'],specialistSeat:0,first:0},
  {audit:true,opponent:'white-sword',seed:AUDIT_SEEDS['white-sword-second'],specialistSeat:0,first:1}
 ];
 for(const opponent of ['reject-blue','renruki']){
  for(const cell of CELLS)jobs.push({audit:true,seed:AUDIT_SEEDS[opponent],opponent,...cell});
 }
 if(jobs.length!==AUDIT_GAMES)throw Error('零權重對局不是 12 場');
 const seen=new Set();
 for(const job of jobs){
  const key=[job.seed,job.opponent,job.first,job.specialistSeat].join(':');
  if(seen.has(key))throw Error('零權重對局重複');
  seen.add(key);
 }
 return jobs;
}
export function assertSchedule(specs){
 if(specs.length!==FAIR_GAMES)throw Error('診斷不是 192 場');
 const keys=new Set();
 for(const spec of specs){
  const key=[spec.seed,spec.opponent,spec.specialistSeat,spec.first,spec.arm].join(':');
  if(keys.has(key))throw Error('診斷場次重複');
  keys.add(key);
  if(spec.arm!=='v2'&&spec.weight!==FROZEN_WEIGHT)throw Error('殘差場次的權重不是凍結值');
  if(spec.arm==='v2'&&spec.seats.some(seat=>seat.residual||seat.weight))throw Error('v2 場次帶了殘差');
 }
 const mirror=specs.filter(spec=>spec.opponent==='white-sword');
 if(mirror.length!==64)throw Error('鏡像不是 64 場');
 if(new Set(mirror.map(spec=>spec.specialistSeat+':'+spec.first)).size!==4)throw Error('鏡像沒有四種座位與先後攻');
 if(mirror.filter(spec=>spec.specialistSeat===spec.first).length!==32)throw Error('鏡像先攻不是一半');
 for(const opponent of ['reject-blue','renruki']){
  const rows=specs.filter(spec=>spec.opponent===opponent);
  if(rows.length!==64)throw Error(opponent+' 不是 64 場');
  if(rows.filter(spec=>spec.specialistSeat===0).length!==32)throw Error(opponent+' 的座位沒有對半');
  const groups=new Map();
  for(const row of rows){
   const key=[row.seed,row.specialistSeat,row.first].join(':');
   groups.set(key,[...(groups.get(key)||[]),row.arm]);
  }
  if(groups.size!==32)throw Error(opponent+' 的配對格不是 32');
  for(const arms of groups.values()){
   if(arms.length!==2||!arms.includes('v2')||!arms.includes('residual'))throw Error(opponent+' 的配對不完整');
  }
 }
 const played=specs.filter(spec=>spec.arm!=='v2');
 if(played.every(spec=>spec.specialistSeat===spec.first))throw Error('殘差仍然每場先攻');
 if(played.filter(spec=>spec.specialistSeat===spec.first).length!==played.length/2)throw Error('殘差先攻不是一半');
}
function won(row){
 return row.finished&&row.winner===row.specialistSeat;
}
function rate(rows){
 const done=rows.filter(row=>row.finished);
 const wins=done.filter(won).length;
 return {games:done.length,wins,rate:done.length?wins/done.length:null};
}
function clustersOf(pairs){
 const groups=new Map();
 for(const pair of pairs){
  const rows=groups.get(pair.seed)||[];
  rows.push(pair.diff);
  groups.set(pair.seed,rows);
 }
 return [...groups.values()];
}
function paired(rows){
 const groups=new Map();
 const dropped=[];
 for(const row of rows){
  const key=[row.seed,row.specialistSeat,row.first].join(':');
  const group=groups.get(key)||{seed:row.seed,goingFirst:row.specialistSeat===row.first};
  group[row.arm]=row;
  groups.set(key,group);
 }
 const pairs=[];
 for(const group of groups.values()){
  const left=group.residual;
  const right=group.v2;
  if(!left?.finished||!right?.finished){
   dropped.push(group.seed);
   continue;
  }
  pairs.push({
   seed:group.seed,goingFirst:group.goingFirst,changes:left.changes||0,
   diff:(left.winner===left.specialistSeat?1:0)-(right.winner===right.specialistSeat?1:0)
  });
 }
 return {pairs,dropped};
}
export function effectOf(rows){
 const tally={changedWin:0,changedLoss:0,unchangedWin:0,unchangedLoss:0,unfinished:0};
 let changes=0;
 let indicated=0;
 let gamesWithChange=0;
 let gamesIndicated=0;
 for(const row of rows){
  const flips=row.changes||0;
  changes+=flips;
  indicated+=row.indicated||0;
  if(flips>0)gamesWithChange++;
  if((row.indicated||0)>0)gamesIndicated++;
  if(!row.finished){
   tally.unfinished++;
   continue;
  }
  const changed=flips>0;
  const key=(changed?'changed':'unchanged')+(won(row)?'Win':'Loss');
  tally[key]++;
 }
 return {games:rows.length,changes,indicated,gamesWithChange,gamesIndicated,...tally};
}
function mirrorSummary(rows){
 const games=rows.map(row=>({...row,goingFirst:row.specialistSeat===row.first})).filter(row=>row.finished);
 const pairs=games.map(row=>({seed:row.seed,goingFirst:row.goingFirst,diff:won(row)?1:-1}));
 return {
  kind:'mirror',
  residualFirst:rate(games.filter(row=>row.goingFirst)),
  residualSecond:rate(games.filter(row=>!row.goingFirst)),
  v2First:rate(games.filter(row=>!row.goingFirst).map(row=>({...row,specialistSeat:1-row.specialistSeat}))),
  v2Second:rate(games.filter(row=>row.goingFirst).map(row=>({...row,specialistSeat:1-row.specialistSeat}))),
  residual:rate(games),
  delta:seedInterval(clustersOf(pairs)),
  firstDelta:seedInterval(clustersOf(pairs.filter(pair=>pair.goingFirst))),
  secondDelta:seedInterval(clustersOf(pairs.filter(pair=>!pair.goingFirst))),
  dropped:rows.length-games.length,
  effects:effectOf(rows)
 };
}
function pairedSummary(rows){
 const ready=paired(rows);
 const interval=list=>seedInterval(clustersOf(list));
 return {
  kind:'paired',
  residualFirst:rate(rows.filter(row=>row.arm==='residual'&&row.specialistSeat===row.first)),
  residualSecond:rate(rows.filter(row=>row.arm==='residual'&&row.specialistSeat!==row.first)),
  v2First:rate(rows.filter(row=>row.arm==='v2'&&row.specialistSeat===row.first)),
  v2Second:rate(rows.filter(row=>row.arm==='v2'&&row.specialistSeat!==row.first)),
  residual:rate(rows.filter(row=>row.arm==='residual')),
  v2:rate(rows.filter(row=>row.arm==='v2')),
  delta:interval(ready.pairs),
  firstDelta:interval(ready.pairs.filter(pair=>pair.goingFirst)),
  secondDelta:interval(ready.pairs.filter(pair=>!pair.goingFirst)),
  pairs:ready.pairs.length,
  sameOutcome:ready.pairs.filter(pair=>pair.diff===0).length,
  changedPairs:ready.pairs.filter(pair=>pair.changes>0).length,
  changedSame:ready.pairs.filter(pair=>pair.changes>0&&pair.diff===0).length,
  dropped:ready.dropped.length,
  effects:effectOf(rows.filter(row=>row.arm==='residual'))
 };
}
export function summarizeFair(rows){
 const decks={};
 for(const opponent of MATCH_OPPONENTS){
  const mine=rows.filter(row=>row.opponent===opponent);
  decks[opponent]=opponent==='white-sword'?mirrorSummary(mine):pairedSummary(mine);
 }
 const residual=rows.filter(row=>row.arm!=='v2');
 return {
  games:rows.length,
  finished:rows.filter(row=>row.finished).length,
  illegal:rows.filter(row=>row.illegal).length,
  v2Changes:rows.filter(row=>row.arm==='v2').reduce((sum,row)=>sum+(row.changes||0),0),
  decks,
  effects:effectOf(residual)
 };
}
export function summarizeAudit(rows){
 const totals={
  games:rows.length,decisions:0,mismatches:0,openings:0,openingMismatches:0,
  orders:0,orderMismatches:0,ties:0,tieMismatches:0,fallbacks:0,fallbackMismatches:0
 };
 const samples=[];
 for(const row of rows){
  for(const key of Object.keys(totals))if(key!=='games')totals[key]+=row[key]||0;
  for(const sample of row.samples||[])if(samples.length<8)samples.push(sample);
 }
 const stopped=rows.filter(row=>row.error).length;
 return {...totals,samples,stopped,ok:rows.length===12&&totals.mismatches===0&&rows.every(row=>!row.error||row.error==='repeated position')};
}
