// min cost·x subject to coeff·x >= rhs and a finite box.
// A failed status means the box is empty. It is not a missed search direction.
const TOL=1e-8;
const ENTER=1e-8;

function substitute(inequalities,bounds,cost,l1){
 const width=bounds.length;
 const pieces=[];
 const constant=Array(width).fill(0);
 for(let index=0;index<width;index++){
  const lo=bounds[index].lo;
  const hi=bounds[index].hi;
  if(!(hi>lo+1e-12)){
   constant[index]=lo;
   continue;
  }
  if(lo>=-TOL){
   pieces.push({index,sign:1,shift:lo,upper:hi-lo,l1:l1?1:(cost?cost[index]||0:0)});
   constant[index]=lo;
  }else if(hi<=TOL){
   pieces.push({index,sign:-1,shift:hi,upper:hi-lo,l1:l1?1:(cost?-(cost[index]||0):0)});
   constant[index]=hi;
  }else{
   pieces.push({index,sign:1,shift:0,upper:hi,l1:l1?1:Math.max(cost?cost[index]||0:0,0),split:true});
   pieces.push({index,sign:-1,shift:0,upper:-lo,l1:l1?1:Math.max(cost?-(cost[index]||0):0,0),split:true});
  }
 }
 const rows=[];
 for(const source of inequalities){
  let rhs=source.rhs;
  const coeff=Array(pieces.length).fill(0);
  for(let index=0;index<width;index++)rhs-=(source.coeff[index]||0)*constant[index];
  for(let column=0;column<pieces.length;column++){
   const piece=pieces[column];
   coeff[column]=(source.coeff[piece.index]||0)*piece.sign;
  }
  let magnitude=0;
  for(const value of coeff)magnitude=Math.max(magnitude,Math.abs(value));
  if(magnitude<1e-12){
   if(rhs>1e-7)return {empty:true};
   continue;
  }
  rows.push({coeff,rhs});
 }
 return {empty:false,pieces,rows,constant,width};
}

function solvePrepared(pieces,rows){
 const constraintCount=rows.length;
 const boundCount=pieces.length;
 const structural=pieces.length;
 const surplus=structural;
 const boundSlack=structural+constraintCount;
 const artificial=structural+constraintCount+boundCount;
 const width=artificial+constraintCount;
 const height=constraintCount+boundCount;
 const basis=Array(height).fill(-1);
 const tableau=Array.from({length:height+1},()=>Array(width+1).fill(0));
 for(let row=0;row<constraintCount;row++){
  for(let column=0;column<structural;column++)tableau[row][column]=rows[row].coeff[column];
  tableau[row][surplus+row]=-1;
  tableau[row][width]=rows[row].rhs;
  if(tableau[row][width]>=-TOL){
   tableau[row][artificial+row]=1;
   basis[row]=artificial+row;
  }else{
   for(let column=0;column<=width;column++)tableau[row][column]*=-1;
   basis[row]=surplus+row;
  }
 }
 for(let index=0;index<boundCount;index++){
  const row=constraintCount+index;
  tableau[row][index]=1;
  tableau[row][boundSlack+index]=1;
  tableau[row][width]=Math.max(0,pieces[index].upper);
  basis[row]=boundSlack+index;
 }
 const objective=height;
 for(let row=0;row<constraintCount;row++){
  if(basis[row]<artificial)continue;
  tableau[objective][basis[row]]=1;
  for(let column=0;column<=width;column++)tableau[objective][column]-=tableau[row][column];
 }
 const limit=Math.max(4000,height*Math.max(width,1));
 if(!optimize(tableau,basis,limit,width))return {ok:false,status:'phase1-cycle'};
 if(Math.abs(tableau[objective][width])>1e-5&&tableau[objective][width]<-1e-5)return {ok:false,status:'infeasible'};
 // Artificial objective is stored as z = -tableau[rhs] + reduced·nonbasic
 // after the subtraction above, so a positive remaining sum of artificials
 // shows up as a negative right-hand side. Accept only a near-zero value.
 if(Math.abs(tableau[objective][width])>1e-5)return {ok:false,status:'infeasible'};
 for(let row=0;row<height;row++){
  if(basis[row]<artificial)continue;
  let enter=-1;
  for(let column=0;column<artificial;column++){
   if(Math.abs(tableau[row][column])>1e-8){enter=column;break;}
  }
  if(enter<0)continue;
  pivot(tableau,row,enter);
  basis[row]=enter;
 }
 for(let column=0;column<=width;column++)tableau[objective][column]=0;
 for(let column=0;column<structural;column++)tableau[objective][column]=pieces[column].l1;
 for(let row=0;row<height;row++){
  const basic=basis[row];
  if(basic>=structural)continue;
  const factor=tableau[objective][basic];
  if(Math.abs(factor)<1e-12)continue;
  for(let column=0;column<=width;column++)tableau[objective][column]-=factor*tableau[row][column];
 }
 if(!optimize(tableau,basis,limit,artificial))return {ok:false,status:'phase2-cycle'};
 const packed=Array(structural).fill(0);
 for(let row=0;row<height;row++)if(basis[row]<structural)packed[basis[row]]=Math.max(0,tableau[row][width]);
 return {ok:true,status:'optimal',packed};
}

function optimize(tableau,basis,limit,lastColumn){
 const rhs=tableau[0].length-1;
 const objective=tableau.length-1;
 for(let step=0;step<limit;step++){
  let enter=-1;
  for(let column=0;column<lastColumn;column++){
   if(tableau[objective][column]<-ENTER&&(enter<0||column<enter))enter=column;
  }
  if(enter<0)return true;
  let leave=-1;
  let best=Infinity;
  for(let row=0;row<basis.length;row++){
   const gain=tableau[row][enter];
   if(gain<=1e-10)continue;
   const ratio=tableau[row][rhs]/gain;
   if(ratio<best-1e-10||(Math.abs(ratio-best)<=1e-10&&(leave<0||basis[row]<basis[leave]))){
    best=ratio;
    leave=row;
   }
  }
  if(leave<0)return false;
  pivot(tableau,leave,enter);
  basis[leave]=enter;
 }
 return false;
}
function pivot(tableau,row,column){
 const width=tableau[row].length;
 const scale=tableau[row][column];
 for(let index=0;index<width;index++)tableau[row][index]/=scale;
 for(let other=0;other<tableau.length;other++){
  if(other===row)continue;
  const factor=tableau[other][column];
  if(Math.abs(factor)<1e-12)continue;
  for(let index=0;index<width;index++)tableau[other][index]-=factor*tableau[row][index];
 }
}

function unpack(spec,packed){
 const x=spec.constant.slice();
 for(let column=0;column<spec.pieces.length;column++){
  const piece=spec.pieces[column];
  x[piece.index]+=piece.sign*(packed[column]||0);
 }
 return x;
}
function violationOf(inequalities,x){
 let worst=0;
 for(const row of inequalities){
  let score=0;
  for(let index=0;index<x.length;index++)score+=(row.coeff[index]||0)*x[index];
  worst=Math.max(worst,row.rhs-score);
 }
 return worst;
}

export function minimize(inequalities,bounds,{l1=true}={}){
 if(bounds.some(bound=>!(bound.hi+1e-9>=bound.lo)))return {ok:false,status:'bounds'};
 const spec=substitute(inequalities,bounds,null,l1);
 if(spec.empty)return {ok:false,status:'infeasible',x:bounds.map(bound=>bound.lo)};
 if(!spec.rows.length&&!spec.pieces.length){
  const missed=violationOf(inequalities,spec.constant);
  if(missed>1e-6)return {ok:false,status:'infeasible',x:spec.constant.slice(),violation:missed};
  return {ok:true,status:'optimal',x:spec.constant.slice(),objective:0,violation:missed};
 }
 const solved=solvePrepared(spec.pieces,spec.rows);
 if(!solved.ok)return {ok:false,status:solved.status,x:spec.constant.slice()};
 const x=unpack(spec,solved.packed);
 const violation=violationOf(inequalities,x);
 if(violation>1e-5)return {ok:false,status:'residual',x,violation};
 for(let index=0;index<bounds.length;index++){
  if(x[index]<bounds[index].lo-1e-5||x[index]>bounds[index].hi+1e-5)return {ok:false,status:'bounds',x};
 }
 let objective=0;
 for(const value of x)objective+=Math.abs(value);
 return {ok:true,status:'optimal',x,objective,violation};
}
