// Uncertainty is computed on original seeds. Four cells from one seed are one cluster.
const T_TABLE={
 2:12.706,3:4.303,4:3.182,5:2.776,6:2.571,7:2.447,8:2.365,9:2.306,10:2.262,
 12:2.179,15:2.131,20:2.086,30:2.042
};

export function tCritical(samples){
 if(samples<2)return null;
 if(samples>30)return 1.96;
 let chosen=2;
 for(const key of Object.keys(T_TABLE).map(Number).sort((left,right)=>left-right)){
  if(key<=samples)chosen=key;
 }
 return T_TABLE[chosen];
}
function interval(values){
 const width=values.length;
 const mean=values.reduce((sum,value)=>sum+value,0)/width;
 if(width<2)return {mean,low:null,high:null,se:null};
 const variance=values.reduce((sum,value)=>sum+(value-mean)**2,0)/(width-1);
 const se=Math.sqrt(variance/width);
 const band=tCritical(width)*se;
 return {mean,low:mean-band,high:mean+band,se};
}
export function seedSummary(games,winnerOf){
 const groups=new Map();
 for(const game of games){
  if(!groups.has(game.seed))groups.set(game.seed,[]);
  groups.get(game.seed).push(game);
 }
 const rows=[];
 for(const [seed,list] of groups){
  const done=list.filter(game=>game.status==='finished'&&(game.winner===0||game.winner===1));
  const wins=done.filter(game=>game.winner===winnerOf(game)).length;
  rows.push({
   seed,wins,n:done.length,unfinished:list.length-done.length,
   p:done.length?wins/done.length:null
  });
 }
 const used=rows.filter(row=>row.p!=null);
 const finished=used.reduce((sum,row)=>sum+row.n,0);
 if(!used.length)return {seeds:0,games:games.length,finished:0,mean:null,low:null,high:null,rows};
 const stats=interval(used.map(row=>row.p));
 return {
  seeds:used.length,games:games.length,finished,rows:used,
  mean:stats.mean,
  low:stats.low==null?null:Math.max(0,stats.low),
  high:stats.high==null?null:Math.min(1,stats.high),
  se:stats.se
 };
}
export function pairedDelta(before,after){
 const left=new Map((before||[]).filter(row=>row.p!=null).map(row=>[row.seed,row.p]));
 const diffs=[];
 for(const row of after||[]){
  if(row.p==null||!left.has(row.seed))continue;
  diffs.push({seed:row.seed,delta:row.p-left.get(row.seed)});
 }
 if(!diffs.length)return {seeds:0,mean:null,low:null,high:null,rows:diffs};
 const stats=interval(diffs.map(row=>row.delta));
 return {seeds:diffs.length,mean:stats.mean,low:stats.low,high:stats.high,rows:diffs};
}
export function selectCheckpoint(points){
 if(!points?.length)return null;
 const widest=Math.max(...points.map(point=>point.summary?.seeds||0));
 const pool=points.filter(point=>(point.summary?.seeds||0)===widest);
 let best=pool[0];
 for(const point of pool.slice(1)){
  const mean=point.summary?.mean;
  const bestMean=best.summary?.mean;
  if(mean==null)continue;
  const later=point.gamesPlayed>=best.gamesPlayed;
  if(bestMean==null||mean>bestMean+1e-12||(Math.abs(mean-bestMean)<=1e-12&&later))best=point;
 }
 return best;
}
