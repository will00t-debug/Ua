// Accept positions in opponent turns, then pick a balanced subset.
// A bucket that one deck never reaches stays empty. It is not backfilled.
import {BUCKETS,OPPONENTS} from './protocol.mjs';

export function interleaveSpecs(plan){
 const entries=Object.entries(plan);
 const width=Math.max(0,...entries.map(([,list])=>list.length));
 const specs=[];
 for(let index=0;index<width;index++){
  for(const [opponent,list] of entries){
   if(list[index]!=null)specs.push({opponent,seed:list[index],index});
  }
 }
 return specs;
}
export function acceptBalanced(games,perCell){
 const counts={};
 const positions=[];
 for(const game of games||[]){
  for(const position of game.positions||[]){
   const key=position.bucket+'|'+position.opponent;
   if((counts[key]||0)>=perCell)continue;
   positions.push(position);
   counts[key]=(counts[key]||0)+1;
  }
 }
 return {positions,counts,cells:Object.keys(counts).length};
}
export function selectBalanced(pool,{perCell=2,buckets=BUCKETS,opponents=OPPONENTS}={}){
 const waiting=new Map();
 for(const position of pool||[]){
  if((position.band||[]).length<2)continue;
  const key=position.bucket+'|'+position.opponent;
  const rows=waiting.get(key)||[];
  rows.push(position);
  waiting.set(key,rows);
 }
 for(const rows of waiting.values())rows.sort((left,right)=>left.step-right.step||left.seed-right.seed||(left.id<right.id?-1:1));
 const chosen=[];
 const counts={};
 const opponentsCount={};
 const cells={};
 for(let slot=0;slot<perCell;slot++){
  for(const bucket of buckets){
   for(const opponent of opponents){
    const key=bucket+'|'+opponent;
    const next=(waiting.get(key)||[]).find(row=>!chosen.includes(row));
    if(!next)continue;
    chosen.push(next);
    counts[bucket]=(counts[bucket]||0)+1;
    opponentsCount[opponent]=(opponentsCount[opponent]||0)+1;
    cells[key]=(cells[key]||0)+1;
   }
  }
 }
 return {
  chosen,counts,opponents:opponentsCount,cells,
  buckets:Object.values(counts).filter(count=>count>0).length
 };
}
export function cellTable(positions,buckets=BUCKETS,opponents=OPPONENTS){
 const table={};
 for(const bucket of buckets){
  table[bucket]={};
  for(const opponent of opponents)table[bucket][opponent]=0;
 }
 for(const position of positions||[]){
  if(!table[position.bucket])table[position.bucket]={};
  table[position.bucket][position.opponent]=(table[position.bucket][position.opponent]||0)+1;
 }
 return table;
}
