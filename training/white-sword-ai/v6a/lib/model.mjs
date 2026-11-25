// Ridge on paired differences. A zero coefficient vector leaves v2 unchanged.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {cappedPool} from '../../v5d/lib/compare.mjs';
import {EE6C_ID} from '../../v5b/lib/protocol.mjs';
import {
 CONSTRAINTS,GENERIC_FEATURES,INTERACTIONS,LAMBDAS,RESIDUAL_CLIP,SCALE
} from './protocol.mjs';

function component(features,name){
 const index=POLICY_INDEX[name];
 return index==null?0:(features?.[index]||0);
}
export function differenceFeatures(left,right,interactions){
 const values=GENERIC_FEATURES.map(name=>component(left,name)-component(right,name));
 for(const [first,second] of interactions||[]){
  values.push(component(left,first)*component(left,second)-component(right,first)*component(right,second));
 }
 return values;
}
export function singleFeatures(features,interactions){
 const values=GENERIC_FEATURES.map(name=>component(features,name));
 for(const [first,second] of interactions||[])values.push(component(features,first)*component(features,second));
 return values;
}
export function solve(matrix,vector){
 const size=vector.length;
 const rows=matrix.map((row,index)=>[...row,vector[index]]);
 for(let col=0;col<size;col++){
  let pivot=col;
  for(let row=col+1;row<size;row++)if(Math.abs(rows[row][col])>Math.abs(rows[pivot][col]))pivot=row;
  if(Math.abs(rows[pivot][col])<1e-12)throw Error('線性系統沒有唯一解');
  const hold=rows[col];
  rows[col]=rows[pivot];
  rows[pivot]=hold;
  const scale=rows[col][col];
  for(let column=col;column<=size;column++)rows[col][column]/=scale;
  for(let row=0;row<size;row++){
   if(row===col)continue;
   const factor=rows[row][col];
   for(let column=col;column<=size;column++)rows[row][column]-=factor*rows[col][column];
  }
 }
 return rows.map(row=>row[size]);
}
function moments(rows){
 const width=rows[0].x.length;
 const weight=rows.reduce((sum,row)=>sum+row.weight,0);
 const scale=Array(width).fill(0);
 for(const row of rows){
  for(let index=0;index<width;index++)scale[index]+=row.weight*row.x[index]*row.x[index];
 }
 return {scale:scale.map(value=>Math.sqrt(value/weight)||1)};
}
export function fitRidge(rows,lambda){
 if(!rows.length)throw Error('沒有訓練列');
 const {scale}=moments(rows);
 const width=scale.length;
 const left=Array.from({length:width},()=>Array(width).fill(0));
 const right=Array(width).fill(0);
 for(const row of rows){
  const scaled=row.x.map((value,index)=>value/scale[index]);
  for(let a=0;a<width;a++){
   right[a]+=row.weight*scaled[a]*row.y;
   for(let b=0;b<width;b++)left[a][b]+=row.weight*scaled[a]*scaled[b];
  }
 }
 for(let index=0;index<width;index++)left[index][index]+=lambda;
 return {beta:solve(left,right),scale,lambda};
}
export function pairPredict(row,model){
 if(!model?.beta?.length)return 0;
 let score=0;
 for(let index=0;index<model.beta.length;index++)score+=model.beta[index]*((row.x[index]||0)/(model.scale[index]||1));
 return score;
}
export function actionResidual(features,model){
 if(!model?.beta?.length)return 0;
 const values=singleFeatures(features,model.interactions);
 let score=0;
 for(let index=0;index<model.beta.length;index++)score+=model.beta[index]*((values[index]||0)/(model.scale[index]||1));
 const clip=model.clip??RESIDUAL_CLIP;
 return Math.max(-clip,Math.min(clip,score));
}
export function valueChoice(band,weights,model){
 const pool=cappedPool(band);
 const source=pool.length?pool:(band||[]);
 if(!source.length)return null;
 let best=source[0];
 let bestScore=blendScore(best.hard,weights,best.features,SCALE)+actionResidual(best.features,model);
 for(const row of source.slice(1)){
  const score=blendScore(row.hard,weights,row.features,SCALE)+actionResidual(row.features,model);
  const left=row.sort||row.key;
  const right=best.sort||best.key;
  if(score>bestScore+1e-12||(Math.abs(score-bestScore)<=1e-12&&left<right)){
   best=row;
   bestScore=score;
  }
 }
 return best.key;
}
export function unchangedChoice(band,weights){
 return chooseKey(cappedPool(band).length?cappedPool(band):band,weights,SCALE);
}
export function lossOf(rows,model){
 const games=new Map();
 for(const row of rows){
  const game=games.get(row.game)||{y:0,pred:0,weight:0};
  game.y+=row.weight*row.y;
  game.pred+=row.weight*pairPredict(row,model);
  game.weight+=row.weight;
  games.set(row.game,game);
 }
 const flat=[...games.values()].map(game=>({y:game.y/game.weight,pred:game.pred/game.weight,weight:game.weight}));
 const weight=flat.reduce((sum,row)=>sum+row.weight,0);
 let error=0;
 let yMean=0;
 let pMean=0;
 for(const row of flat){
  error+=row.weight*(row.y-row.pred)**2;
  yMean+=row.weight*row.y;
  pMean+=row.weight*row.pred;
 }
 yMean/=weight;
 pMean/=weight;
 let yy=0;
 let pp=0;
 let yp=0;
 for(const row of flat){
  const dy=row.y-yMean;
  const dp=row.pred-pMean;
  yy+=row.weight*dy*dy;
  pp+=row.weight*dp*dp;
  yp+=row.weight*dy*dp;
 }
 return {
  mse:error/weight,
  correlation:yy>1e-12&&pp>1e-12?yp/Math.sqrt(yy*pp):0,
  games:flat.length
 };
}
export function zeroLoss(rows){
 return lossOf(rows,{beta:[]});
}
function design(rows,interactions){
 return rows.map(row=>({...row,x:differenceFeatures(row.featuresA,row.featuresB,interactions)}));
}
export function selectModel(train,dev){
 const classes=[
  {id:'linear',interactions:[]},
  {id:'interaction',interactions:INTERACTIONS}
 ];
 const chosen=[];
 for(const item of classes){
  const designed=design(train,item.interactions);
  let best=null;
  for(const lambda of LAMBDAS){
   const losses=[];
   for(let fold=0;fold<5;fold++){
    const held=designed.filter(row=>row.fold===fold);
    const fitRows=designed.filter(row=>row.fold!==fold);
    if(!held.length||!fitRows.length)continue;
    losses.push(lossOf(held,fitRidge(fitRows,lambda)).mse);
   }
   const mse=losses.reduce((sum,value)=>sum+value,0)/losses.length;
   if(!best||mse<best.mse-1e-12||(Math.abs(mse-best.mse)<=1e-12&&lambda>best.lambda))best={lambda,mse};
  }
  const model=fitRidge(designed,best.lambda);
  const devLoss=lossOf(design(dev,item.interactions),{...model,interactions:item.interactions});
  chosen.push({id:item.id,lambda:best.lambda,dev:devLoss,model:{...model,interactions:item.interactions,clip:RESIDUAL_CLIP,class:item.id}});
 }
 chosen.sort((left,right)=>left.dev.mse-right.dev.mse||(left.id==='linear'?-1:1));
 return {...chosen[0],alternatives:chosen.map(item=>({id:item.id,lambda:item.lambda,mse:item.dev.mse,correlation:item.dev.correlation}))};
}
export function permutationTest(rows,model,draw,count=2000){
 const base=lossOf(rows,model);
 const observed=base.correlation;
 if(!(observed>0))return {...base,p:1};
 let beat=0;
 const bucket=[...rows];
 for(let trial=0;trial<count;trial++){
  const shuffled=bucket.map(row=>({...row}));
  for(let index=shuffled.length-1;index>0;index--){
   const swap=Math.floor(draw()*(index+1));
   const y=shuffled[index].y;
   shuffled[index].y=shuffled[swap].y;
   shuffled[swap].y=y;
  }
  if(lossOf(shuffled,model).correlation>=observed-1e-15)beat++;
 }
 return {...base,p:(beat+1)/(count+1)};
}
export function safetyOf(model,weights,positions){
 const results=[];
 for(const item of CONSTRAINTS){
  const position=positions.get(item.id);
  if(!position?.band?.length){
   results.push({id:item.id,ok:false,missing:true});
   continue;
  }
  const before=unchangedChoice(position.band,weights);
  const after=valueChoice(position.band,weights,model);
  const afterRow=position.band.find(row=>row.key===after);
  let ok=after===before;
  if(item.role==='preference')ok=after===before||energyKey({band:[afterRow]})===after;
  else if(item.id===EE6C_ID){
   let type='';
   try{type=JSON.parse(after||'{}').type||'';}catch{type='';}
   ok=after===before||type==='next';
  }
  results.push({id:item.id,ok,before,after});
 }
 return {ok:results.every(row=>row.ok&&!row.missing),results};
}
export function energyKey(position){
 return (position?.band||[]).find(row=>{
  let body={};
  try{body=JSON.parse(row.key);}catch{body={};}
  return body.type==='play'&&body.line==='energy'&&cardsOf(row.features).includes('BLC-4-070');
 })?.key||null;
}
