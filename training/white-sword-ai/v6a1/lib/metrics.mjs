// Position-level error keeps opposite mistakes visible. Game-level error is reported beside it.
import {blendScore} from '../../v4a2/lib/sensitivity.mjs';
import {GENERIC_FEATURES,INTERACTIONS,SCALE} from '../../v6a/lib/protocol.mjs';
import {actionResidual,differenceFeatures,pairPredict,unchangedChoice,valueChoice} from '../../v6a/lib/model.mjs';

export function positionLoss(rows,model){
 const weight=rows.reduce((sum,row)=>sum+row.weight,0);
 if(!weight)return {mse:null,correlation:0,positions:0};
 let error=0;
 let yMean=0;
 let pMean=0;
 const scored=rows.map(row=>({...row,pred:pairPredict(row,model)}));
 for(const row of scored){
  error+=row.weight*(row.y-row.pred)**2;
  yMean+=row.weight*row.y;
  pMean+=row.weight*row.pred;
 }
 yMean/=weight;
 pMean/=weight;
 let yy=0;
 let pp=0;
 let yp=0;
 for(const row of scored){
  const dy=row.y-yMean;
  const dp=row.pred-pMean;
  yy+=row.weight*dy*dy;
  pp+=row.weight*dp*dp;
  yp+=row.weight*dy*dp;
 }
 return {mse:error/weight,correlation:yy>1e-12&&pp>1e-12?yp/Math.sqrt(yy*pp):0,positions:rows.length};
}
export function gameLoss(rows,model){
 const games=new Map();
 for(const row of rows){
  const pred=pairPredict(row,model);
  const game=games.get(row.game)||{square:0,y:0,pred:0,weight:0};
  game.square+=row.weight*(row.y-pred)**2;
  game.y+=row.weight*row.y;
  game.pred+=row.weight*pred;
  game.weight+=row.weight;
  games.set(row.game,game);
 }
 const flat=[...games.values()];
 const weight=flat.reduce((sum,game)=>sum+game.weight,0);
 if(!weight)return {mse:null,cancelledMse:null,correlation:0,games:0};
 let error=0;
 let cancelled=0;
 let yMean=0;
 let pMean=0;
 for(const game of flat){
  error+=game.square;
  cancelled+=game.weight*(game.y/game.weight-game.pred/game.weight)**2;
  yMean+=game.y;
  pMean+=game.pred;
 }
 yMean/=weight;
 pMean/=weight;
 let yy=0;
 let pp=0;
 let yp=0;
 for(const game of flat){
  const dy=game.y/game.weight-yMean;
  const dp=game.pred/game.weight-pMean;
  yy+=game.weight*dy*dy;
  pp+=game.weight*dp*dp;
  yp+=game.weight*dy*dp;
 }
 return {
  mse:error/weight,
  cancelledMse:cancelled/weight,
  correlation:yy>1e-12&&pp>1e-12?yp/Math.sqrt(yy*pp):0,
  games:flat.length
 };
}
function quantile(values,fraction){
 if(!values.length)return null;
 const sorted=[...values].sort((left,right)=>left-right);
 return sorted[Math.min(sorted.length-1,Math.floor(fraction*(sorted.length-1)))];
}
export function scaleReport(rows,weights,model){
 const gaps=[];
 const predictions=[];
 const residuals=[];
 let beyondClip=0;
 let beats=0;
 for(const row of rows){
  if(!Number.isFinite(row.hardA)||!Number.isFinite(row.hardB))continue;
  const gap=Math.abs(blendScore(row.hardA,weights,row.featuresA,SCALE)-blendScore(row.hardB,weights,row.featuresB,SCALE));
  const residual=Math.abs(actionResidual(row.featuresA,model)-actionResidual(row.featuresB,model));
  gaps.push(gap);
  predictions.push(Math.abs(pairPredict({x:differenceFeatures(row.featuresA,row.featuresB,model.interactions)},model)));
  residuals.push(residual);
  if(gap>36)beyondClip++;
  if(residual>gap)beats++;
 }
 return {
  positions:gaps.length,
  blendGap:{median:quantile(gaps,0.5),p90:quantile(gaps,0.9),max:quantile(gaps,1)},
  prediction:{median:quantile(predictions,0.5),p90:quantile(predictions,0.9),max:quantile(predictions,1)},
  residual:{median:quantile(residuals,0.5),p90:quantile(residuals,0.9),max:quantile(residuals,1)},
  gapAbove36:beyondClip,
  residualBeatsGap:beats
 };
}
export function decisionReport(rows,weights,model){
 const tally={kept:0,changed:0,toward:0,against:0,unknown:0,protectedChanged:0};
 for(const row of rows){
  if(!row.band?.length)continue;
  const before=unchangedChoice(row.band,weights);
  const after=valueChoice(row.band,weights,model);
  if(row.label&&before!==after)tally.protectedChanged++;
  if(before===after){tally.kept++;continue;}
  tally.changed++;
  if(after!==row.keyA&&after!==row.keyB||row.y===0){tally.unknown++;continue;}
  const pickedB=after===row.keyB;
  if((row.y<0&&pickedB)||(row.y>0&&!pickedB))tally.toward++;
  else tally.against++;
 }
 return tally;
}
function jacobi(matrix){
 const size=matrix.length;
 const values=matrix.map(row=>row.slice());
 for(let iter=0;iter<48;iter++){
  let left=0;
  let right=1;
  let max=0;
  for(let row=0;row<size;row++)for(let column=row+1;column<size;column++){
   if(Math.abs(values[row][column])>max){max=Math.abs(values[row][column]); left=row; right=column;}
  }
  if(max<1e-10)break;
  const diagonal=(values[right][right]-values[left][left])/(2*values[left][right]);
  const tangent=Math.sign(diagonal)/(Math.abs(diagonal)+Math.sqrt(1+diagonal*diagonal));
  const cosine=1/Math.sqrt(1+tangent*tangent);
  const sine=tangent*cosine;
  for(let index=0;index<size;index++){
   const first=values[index][left];
   const second=values[index][right];
   values[index][left]=cosine*first-sine*second;
   values[index][right]=sine*first+cosine*second;
  }
  for(let index=0;index<size;index++){
   const first=values[left][index];
   const second=values[right][index];
   values[left][index]=cosine*first-sine*second;
   values[right][index]=sine*first+cosine*second;
  }
  values[left][right]=0;
  values[right][left]=0;
 }
 return values.map((row,index)=>row[index]).sort((left,right)=>right-left);
}
export function featureReport(rows){
 function inspect(interactions){
  const samples=rows.map(row=>differenceFeatures(row.featuresA,row.featuresB,interactions));
  const width=samples[0].length;
  const names=[...GENERIC_FEATURES,...(interactions||[]).map(pair=>pair.join('×'))];
  const zero=[];
  for(let column=0;column<width;column++){
   if(samples.every(row=>Math.abs(row[column])<1e-12))zero.push(names[column]);
  }
  const gram=Array.from({length:width},()=>Array(width).fill(0));
  for(const sample of samples)for(let left=0;left<width;left++)for(let right=0;right<width;right++)gram[left][right]+=sample[left]*sample[right];
  const eigenvalues=jacobi(gram);
  const top=eigenvalues[0]||0;
  return {width,zero,rank:eigenvalues.filter(value=>value>top*1e-8).length,top};
 }
 const linear=inspect([]);
 const interaction=inspect(INTERACTIONS);
 return {linear,interaction};
}
export function gamesNeeded(correlation,current){
 if(!(Math.abs(correlation)>0.02))return {total:null,extra:null};
 const total=Math.ceil(4*(1-correlation*correlation)/(correlation*correlation)+2);
 const have=Number.isFinite(current)?current:0;
 return {total,extra:Math.max(0,total-have)};
}
