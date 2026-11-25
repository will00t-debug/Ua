// Column-pivoted Householder QR. Rank is the number of diagonal entries
// above relativeTol times the largest diagonal. A repeated column has rank 1.
export function columnPivotedFactor(matrix){
 const rows=matrix.length;
 const cols=rows?matrix[0].length:0;
 const work=matrix.map(row=>Float64Array.from(row));
 const diagonals=[];
 for(let k=0;k<Math.min(rows,cols);k++){
  let pivot=k;
  let best=-1;
  for(let column=k;column<cols;column++){
   let sum=0;
   for(let row=k;row<rows;row++)sum+=work[row][column]*work[row][column];
   if(sum>best){best=sum;pivot=column;}
  }
  if(pivot!==k){
   for(let row=0;row<rows;row++){
    const hold=work[row][k];
    work[row][k]=work[row][pivot];
    work[row][pivot]=hold;
   }
  }
  let sigma=0;
  for(let row=k;row<rows;row++)sigma+=work[row][k]*work[row][k];
  sigma=Math.sqrt(sigma);
  if(sigma===0){diagonals.push(0);continue;}
  const sign=work[k][k]>=0?1:-1;
  const reflector=new Float64Array(rows-k);
  reflector[0]=work[k][k]+sign*sigma;
  for(let row=k+1;row<rows;row++)reflector[row-k]=work[row][k];
  let norm=0;
  for(const value of reflector)norm+=value*value;
  norm=Math.sqrt(norm);
  if(norm>0)for(let index=0;index<reflector.length;index++)reflector[index]/=norm;
  work[k][k]=-sign*sigma;
  for(let row=k+1;row<rows;row++)work[row][k]=0;
  for(let column=k+1;column<cols;column++){
   let dot=0;
   for(let row=k;row<rows;row++)dot+=reflector[row-k]*work[row][column];
   for(let row=k;row<rows;row++)work[row][column]-=2*reflector[row-k]*dot;
  }
  diagonals.push(Math.abs(work[k][k]));
 }
 return diagonals;
}
export function numericalRank(matrix,{relativeTol=1e-10}={}){
 const diagonals=columnPivotedFactor(matrix);
 const largest=diagonals.reduce((max,value)=>Math.max(max,value),0);
 const tolerance=relativeTol*Math.max(matrix.length,matrix[0]?.length||0)*Math.max(largest,0);
 const rank=diagonals.filter(value=>value>tolerance).length;
 return {rank,diagonals,tolerance,largest};
}
