// Seat and first-player are separate factors. One pair keeps the same
// seed, deck and initial deal, and swaps which policy sits in which seat.
export function matchGrid(seed){
 const rows=[];
 for(const first of [0,1]){
  for(const challengerSeat of [0,1]){
   rows.push({seed,first,challengerSeat,challengerIsFirst:challengerSeat===first});
  }
 }
 return rows;
}
function mean(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;}
export function pairedChallenger(rows){
 const groups=new Map();
 for(const row of rows){
  const key=row.seed+'|'+row.first;
  const list=groups.get(key)||[];
  list.push(row);
  groups.set(key,list);
 }
 const diffs=[];
 for(const list of groups.values()){
  if(list.length!==2)continue;
  const seats=new Set(list.map(row=>row.challengerSeat));
  if(seats.size!==2)continue;
  if(list.some(row=>!row.finished||row.winner!==0&&row.winner!==1))continue;
  const wins=list.map(row=>row.winner===row.challengerSeat?1:0);
  diffs.push((wins[0]+wins[1])/2-0.5);
 }
 if(!diffs.length)return {n:0,mean:null,low:null,high:null};
 const point=mean(diffs);
 const boots=[];
 for(let i=0;i<1000;i++){
  let sum=0;
  for(let j=0;j<diffs.length;j++)sum+=diffs[Math.floor(Math.random()*diffs.length)];
  boots.push(sum/diffs.length);
 }
 boots.sort((a,b)=>a-b);
 return {n:diffs.length,mean:point,low:boots[25],high:boots[974]};
}
