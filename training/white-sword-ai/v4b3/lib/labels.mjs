// Two-sided normal tail and Benjamini-Hochberg across one round's comparisons.
// Optional stopping makes these probabilities optimistic. They are a screen,
// not a second independent sample.
export function normalTwoSided(z){
 const abs=Math.abs(z);
 if(!Number.isFinite(abs))return 1;
 const t=1/(1+0.2316419*abs);
 const density=0.3989422804014327*Math.exp(-0.5*abs*abs);
 const upper=density*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
 return Math.max(0,Math.min(1,2*upper));
}
export function comparisonP(row){
 if(!row||!row.n)return 1;
 const se=(row.high-row.low)/(2*1.96);
 if(!(se>1e-12))return row.mean===0?1:0;
 return normalTwoSided(row.mean/se);
}
export function benjaminiHochberg(pValues,alpha=0.05){
 const order=pValues.map((p,index)=>({p,index})).sort((left,right)=>left.p-right.p||left.index-right.index);
 const count=order.length;
 let cutoff=-1;
 for(let rank=0;rank<count;rank++){
  if(order[rank].p<=((rank+1)/count)*alpha)cutoff=rank;
 }
 const kept=new Set();
 for(let rank=0;rank<=cutoff;rank++)kept.add(order[rank].index);
 return kept;
}
export function labelTiers(judgments,alpha=0.05){
 const values=(judgments||[]).map(comparisonP);
 const kept=benjaminiHochberg(values,alpha);
 return (judgments||[]).map((row,index)=>({
  id:row.id,
  p:values[index],
  nominal:row.usable===true,
  adjusted:kept.has(index)&&row.usable===true
 }));
}
