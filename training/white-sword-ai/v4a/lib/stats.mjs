// Screening, selection and the pre-registered experimental gate.
// Stage A and stage B only decide who spends the independent games.
import {wilson} from '../../../../dist/universal-v2/white-sword-ai/stats.mjs';
import {BOOTSTRAP_SAMPLES,BOOTSTRAP_SEED,DECK_LABEL,PROMOTION} from './protocol.mjs';

const ANOMALY_KEYS=['illegal','timeout','fallback','deadLoop','engineError','leak','opponentFallback'];

export function xorshift32(seed){
 let x=seed>>>0||1;
 return ()=>{
  x=(x^(x<<13))>>>0;
  x=(x^(x>>>17))>>>0;
  x=(x^(x<<5))>>>0;
  return x/4294967296;
 };
}
export function anomalyReport(games){
 const totals={};
 for(const key of ANOMALY_KEYS)totals[key]=0;
 let unfinished=0;
 for(const game of games||[]){
  for(const key of ANOMALY_KEYS)totals[key]+=game.anomalies?.[key]||0;
  if(game.status!=='finished'||(game.winner!==0&&game.winner!==1))unfinished++;
 }
 const bad=unfinished>0||ANOMALY_KEYS.some(key=>totals[key]>0);
 return {totals,unfinished,bad};
}
function won(game){
 return game.status==='finished'&&game.winner===game.specialistSeat;
}
export function screenCandidates(games,candidates,{floor=false}={}){
 const kept=[];
 const eliminated=[];
 for(const candidate of candidates){
  const rows=games.filter(game=>game.candidateId===candidate.id);
  const dirt=anomalyReport(rows);
  if(!rows.length){
   eliminated.push({id:candidate.id,reason:'沒有完成初選對局'});
   continue;
  }
  if(dirt.bad){
   eliminated.push({id:candidate.id,reason:'初選出現非法、洩漏、fallback、死循環、未完成或對手無合法動作',anomalies:dirt});
   continue;
  }
  const wins=rows.filter(won).length;
  if(floor&&rows.length>=PROMOTION.screenGames&&wins<=PROMOTION.screenWinFloor){
   eliminated.push({id:candidate.id,reason:'初選明顯退步（'+wins+'/'+rows.length+'）',wins,games:rows.length});
   continue;
  }
  kept.push({id:candidate.id,wins,games:rows.length});
 }
 return {kept,eliminated};
}
function hardWin(game){
 return String(game.opponentKind||'').startsWith('hard-')&&won(game);
}
function championWin(game){
 const kind=game.opponentKind==='historical'&&game.historicalSame?'champion':game.opponentKind;
 return (kind==='champion')&&won(game);
}
export function rankCandidates(games,ids){
 const rows=ids.map((id,index)=>{
  const mine=games.filter(game=>game.candidateId===id);
  return {
   id,index,
   hardWins:mine.filter(hardWin).length,
   championWins:mine.filter(championWin).length,
   peerWins:mine.filter(game=>game.opponentKind==='peer'&&won(game)).length,
   wins:mine.filter(won).length,
   games:mine.length
  };
 });
 rows.sort((a,b)=>b.hardWins-a.hardWins||b.championWins-a.championWins||b.peerWins-a.peerWins||a.index-b.index);
 return rows;
}
export function clusterBootstrap(pairs,{samples=BOOTSTRAP_SAMPLES,seed=BOOTSTRAP_SEED}={}){
 const groups=new Map();
 for(const pair of pairs){
  if(!groups.has(pair.seed))groups.set(pair.seed,[]);
  groups.get(pair.seed).push(pair);
 }
 const keys=[...groups.keys()];
 if(!keys.length||!pairs.length)return {n:0,delta:null,ci:{low:null,high:null},samples};
 let point=0;
 for(const pair of pairs)point+=Number(pair.challengerWin)-Number(pair.championWin);
 const delta=point/pairs.length;
 const rng=xorshift32(seed);
 const draws=[];
 for(let sample=0;sample<samples;sample++){
  let good=0;
  let n=0;
  for(let i=0;i<keys.length;i++){
   const cluster=groups.get(keys[Math.floor(rng()*keys.length)]);
   for(const pair of cluster){
    good+=Number(pair.challengerWin)-Number(pair.championWin);
    n++;
   }
  }
  draws.push(good/n);
 }
 draws.sort((a,b)=>a-b);
 const quantile=q=>draws[Math.floor(q*(draws.length-1))];
 return {n:pairs.length,delta,ci:{low:quantile(0.025),high:quantile(0.975)},samples:draws.length,clusters:keys.length};
}
export function pairGames(challengerGames,baselineGames){
 const baseline=new Map(baselineGames.map(game=>[pairKey(game),game]));
 const pairs=[];
 const missing=[];
 for(const game of challengerGames){
  const other=baseline.get(pairKey(game));
  if(!other){
   missing.push(pairKey(game));
   continue;
  }
  pairs.push({
   seed:game.seed,deck:game.opponentDeck,key:pairKey(game),
   challengerWin:won(game),championWin:won(other)
  });
 }
 return {pairs,missing};
}
function pairKey(game){
 return [game.seed,game.first,game.specialistSeat,game.opponentDeck].join('|');
}
export function judgeExperimental({profile,paired,mirror,decks,anomalies}){
 const reasons=[];
 if(profile==='smoke')reasons.push('smoke 只檢查閉環，不晉級');
 if(!paired)reasons.push('沒有進入冠軍挑戰');
 else{
  if(paired.n!==PROMOTION.pairedGames)reasons.push('配對驗證不是事先登記的 '+PROMOTION.pairedGames+' 場');
  if(!(paired.delta>=PROMOTION.pairedDelta))reasons.push('配對勝率差未達 +5 個百分點');
  if(!(paired.ci?.low>PROMOTION.ciLow))reasons.push('配對勝率差的 95% 信賴區間下限沒有大於 0');
 }
 if(!mirror)reasons.push('沒有直接鏡像驗證');
 else{
  if(mirror.n<PROMOTION.mirrorGames)reasons.push('直接鏡像少於 '+PROMOTION.mirrorGames+' 場');
  if(!(mirror.p>=PROMOTION.mirrorP))reasons.push('直接鏡像勝率未達 55%');
  if(!(mirror.low>PROMOTION.mirrorWilsonLow))reasons.push('直接鏡像沒有統計上可信的優勢');
 }
 for(const deck of decks||[]){
  if(!(deck.delta>=PROMOTION.deckFloor))reasons.push('對'+(DECK_LABEL[deck.id]||deck.id)+'明顯退步');
 }
 const dirt=anomalies||{};
 if(dirt.illegal)reasons.push('出現非法行動');
 if(dirt.leak)reasons.push('出現隱藏資訊洩漏');
 if(dirt.fallback)reasons.push('出現 fallback');
 if(dirt.timeout)reasons.push('出現推論逾時');
 if(dirt.deadLoop)reasons.push('出現死循環');
 if(dirt.engineError)reasons.push('出現引擎異常');
 if(dirt.opponentFallback)reasons.push('對手沒有回傳合法動作，這些對局不能當成證據');
 if(dirt.unfinished)reasons.push('有未完成對局');
 return {
  promoted:reasons.length===0,
  experimentalOnly:true,
  production:false,
  deployed:false,
  reasons
 };
}
export function rateOf(games){
 const done=games.filter(game=>game.status==='finished'&&(game.winner===0||game.winner===1));
 const wins=done.filter(won).length;
 return {...wilson(wins,done.length),games:games.length};
}
export function meanTally(games){
 const keys=['energy','front','move','raid','attack','apSpent'];
 const out={};
 for(const key of keys){
  const values=games.map(game=>game.tally?.[key]).filter(Number.isFinite);
  out[key]=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
 }
 const ms=games.map(game=>game.timing?.mean).filter(Number.isFinite);
 out.decisionMs=ms.length?ms.reduce((sum,value)=>sum+value,0)/ms.length:null;
 return out;
}
export function bySeat(games){
 return {
  first:rateOf(games.filter(game=>game.specialistIsFirst)),
  second:rateOf(games.filter(game=>game.specialistIsFirst===false))
 };
}
export function byOpponent(games){
 const kinds=[...new Set(games.map(game=>game.opponentKind))];
 return Object.fromEntries(kinds.map(kind=>[kind,rateOf(games.filter(game=>game.opponentKind===kind))]));
}
