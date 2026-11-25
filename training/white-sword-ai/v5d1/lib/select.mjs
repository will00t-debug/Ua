// One position per original game. Train and validation are split inside each opponent.
import {OPPONENTS} from '../../v4b2/lib/protocol.mjs';
import {isActivate060Pair} from '../../v5d/lib/select.mjs';

export function onePerGame(pool){
 const games=new Map();
 for(const row of pool||[]){
  if(!row?.id||!Number.isInteger(row.seed)||!isActivate060Pair(row))continue;
  const key=(row.opponent||'')+'|'+row.seed;
  const existing=games.get(key);
  const earlier=!existing||row.step<existing.step||(row.step===existing.step&&row.id<existing.id);
  if(earlier)games.set(key,row);
 }
 return [...games.values()];
}
export function gameCoverage(pool){
 const games=onePerGame(pool);
 const counts={};
 for(const row of games)counts[row.opponent]=(counts[row.opponent]||0)+1;
 const splittable=Object.values(counts).filter(count=>count>=2).length;
 return {games:games.length,counts,splittable,ready:games.length>=8&&splittable>=2};
}
export function selectBalancedGames(pool,cap=8){
 const byOpponent=new Map();
 for(const row of onePerGame(pool)){
  const list=byOpponent.get(row.opponent)||[];
  list.push(row);
  byOpponent.set(row.opponent,list);
 }
 for(const list of byOpponent.values())list.sort((left,right)=>left.seed-right.seed||(left.id<right.id?-1:left.id>right.id?1:0));
 const picked=[];
 let pass=0;
 while(picked.length<cap){
  let added=false;
  for(const opponent of OPPONENTS){
   const row=(byOpponent.get(opponent)||[])[pass];
   if(!row)continue;
   picked.push(row);
   added=true;
   if(picked.length>=cap)break;
  }
  if(!added)break;
  pass++;
 }
 return picked;
}
export function splitByOpponent(rows){
 const byOpponent=new Map();
 for(const row of rows||[]){
  const list=byOpponent.get(row.opponent)||[];
  list.push(row);
  byOpponent.set(row.opponent,list);
 }
 const assigned=[];
 const notes=[];
 for(const opponent of OPPONENTS){
  const list=(byOpponent.get(opponent)||[]).slice().sort((left,right)=>left.seed-right.seed||(left.id<right.id?-1:1));
  if(list.length===1)notes.push(opponent);
  list.forEach((row,index)=>assigned.push({...row,role:index%2===0?'train':'validation'}));
 }
 const seen=new Set();
 for(const row of assigned){
  const key=row.opponent+'|'+row.seed;
  if(seen.has(key))throw Error('同一原始對局跨進兩個分組');
  seen.add(key);
 }
 return {rows:assigned.sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0),singletonOpponents:notes};
}
