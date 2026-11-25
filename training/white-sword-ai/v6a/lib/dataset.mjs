// One row per compared position. The target is the paired mean, weighted by how many pairs exist.
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {foldPair} from '../../v4b/lib/evaluate.mjs';
import {CONSTRAINTS,gameFold,gameRole} from './protocol.mjs';

const ROOT='training/white-sword-ai';
const LABELS=new Map(CONSTRAINTS.map(item=>[item.id,item.role]));

function walk(dir,out=[]){
 for(const name of readdirSync(dir)){
  if(dir===ROOT&&name==='v6a')continue;
  const path=join(dir,name);
  if(statSync(path).isDirectory())walk(path,out);
  else out.push(path);
 }
 return out;
}
function positionsOf(data){
 const rows=[];
 if(Array.isArray(data?.positions))rows.push(...data.positions);
 if(Array.isArray(data?.games))for(const game of data.games)rows.push(...(game?.positions||[]));
 return rows;
}
export function loadPositions(){
 const found=new Map();
 for(const file of walk(ROOT)){
  if(!file.endsWith('.json'))continue;
  let data;
  try{data=JSON.parse(readFileSync(file,'utf8'));}catch{continue;}
  for(const row of positionsOf(data)){
   const featured=row.actionA?.features?.length===115||row.band?.some(item=>item.features?.length===115);
   if(!row?.id||!featured)continue;
   if(!found.has(row.id))found.set(row.id,row);
  }
 }
 return found;
}
export function buildHistorical(){
 const positions=loadPositions();
 const best=new Map();
 for(const file of walk(ROOT)){
  if(!file.endsWith('rollouts.jsonl'))continue;
  const byPosition=new Map();
  for(const line of readFileSync(file,'utf8').split('\n')){
   if(!line)continue;
   const row=JSON.parse(line);
   if(!positions.has(row.positionId))continue;
   const attempts=byPosition.get(row.positionId)||new Map();
   const pair=attempts.get(row.attempt)||{};
   pair[row.side]=row;
   attempts.set(row.attempt,pair);
   byPosition.set(row.positionId,attempts);
  }
  for(const [id,attempts] of byPosition){
   const position=positions.get(id);
   const diffs=[];
   for(const attempt of [...attempts.keys()].sort((left,right)=>left-right)){
    const pair=attempts.get(attempt);
    const diff=foldPair(pair.A,pair.B,position.actor===1?1:0);
    if(diff!==null)diffs.push(diff);
   }
   const previous=best.get(id);
   if(diffs.length&&(!previous||diffs.length>previous.diffs.length))best.set(id,{diffs,source:file});
  }
 }
 const rows=[];
 for(const [id,item] of best){
   const position=positions.get(id);
  if(!position?.actionA?.features||!position?.actionB?.features||!Number.isInteger(position.seed))continue;
  const plus=item.diffs.filter(value=>value>0).length;
  const minus=item.diffs.filter(value=>value<0).length;
  const tie=item.diffs.filter(value=>value===0).length;
  const decisive=plus+minus;
  const game=(position.opponent||'unknown')+'|'+position.seed;
  const role=LABELS.get(id)||null;
  rows.push({
   id,game,seed:position.seed,opponent:position.opponent||null,bucket:position.bucket||null,
   source:item.source,n:item.diffs.length,plus,minus,tie,
   mean:(plus-minus)/item.diffs.length,
   y:(plus-minus)/item.diffs.length,
   weight:item.diffs.length,
   agreement:decisive?Math.max(plus,minus)/decisive:0,
   diffs:item.diffs,
   featuresA:position.actionA.features,featuresB:position.actionB.features,
   label:role,preference:role==='preference',harm:id==='0d035ea8a0b2be16'||role==='preserve',
   split:gameRole(game),fold:gameFold(game)
  });
 }
 return rows;
}
