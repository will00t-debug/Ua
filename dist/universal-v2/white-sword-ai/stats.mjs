export function wilson(wins,n,z=1.96){
 if(!n)return {wins:0,n:0,p:null,low:null,high:null};
 const p=wins/n;
 const z2=z*z;
 const den=1+z2/n;
 const center=(p+z2/(2*n))/den;
 const margin=z*Math.sqrt((p*(1-p)/n)+z2/(4*n*n))/den;
 return {wins,n,p,low:center-margin,high:center+margin};
}
export function percentile(values,p){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));
 return sorted[index];
}
export function timingOf(values){
 const list=values.filter(Number.isFinite);
 return {
  n:list.length,
  mean:list.length?list.reduce((sum,value)=>sum+value,0)/list.length:null,
  p50:percentile(list,0.5),
  p95:percentile(list,0.95),
  max:list.length?Math.max(...list):null
 };
}
export function rateBy(games,pred,{win}={}){
 const rows=games.filter(pred);
 const done=rows.filter(game=>game.status==='finished'&&(game.winner===0||game.winner===1));
 const wins=done.filter(game=>game.winner===(win?win(game):game.specialistSeat)).length;
 return {...wilson(wins,done.length),games:rows.length,finished:done.length,unfinished:rows.length-done.length};
}
export function addAnomalies(games){
 const total={illegal:0,timeout:0,fallback:0,deadLoop:0,engineError:0,leak:0};
 for(const game of games){
  for(const key of Object.keys(total))total[key]+=game.anomalies?.[key]||0;
 }
 return total;
}
export function judgeChampion(summary){
 const reasons=[];
 const overall=summary.overall;
 if(!overall||overall.finished<200)reasons.push('已完成的基準對局少於 200');
 if(!(overall?.p>=0.6))reasons.push('總勝率未達 60%');
 if(!(overall?.low>0.5))reasons.push('95% 勝率信賴區間下限未高於 50%');
 if((summary.opponentDecks||[]).length<3)reasons.push('對手牌型少於 3 種');
 if(!summary.first?.finished||!summary.second?.finished)reasons.push('缺少先手或後手對局');
 const anomalies=summary.anomalies||{};
 if(anomalies.illegal)reasons.push('出現非法行動');
 if(anomalies.leak)reasons.push('出現隱藏資訊洩漏');
 if(anomalies.deadLoop)reasons.push('出現死循環');
 if(anomalies.engineError)reasons.push('出現引擎異常');
 if(anomalies.fallback||anomalies.timeout)reasons.push('模型發生回退或逾時，這些對局不能當成模型棋力');
 if(!(summary.nonMirror?.low>0.5))reasons.push('非鏡像對局的 95% 信賴區間下限未高於 50%，不能只靠白劍鏡像');
 if(summary.selectedMode==='hard')reasons.push('驗證集沒有選到可學習的模型模式');
 return {promoted:reasons.length===0,reasons};
}
