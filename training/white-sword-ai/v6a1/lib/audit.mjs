// Rebuild paired rows from saved files. Attempt numbers are not identities across files.
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {foldPair} from '../../v4b/lib/evaluate.mjs';
import {CONSTRAINTS,gameFold,gameRole} from '../../v6a/lib/protocol.mjs';

const ROOT='training/white-sword-ai';
const LABELS=new Map(CONSTRAINTS.map(item=>[item.id,item.role]));

function walk(dir,out=[]){
 for(const name of readdirSync(dir)){
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
function fingerprint(position){
 const body=[position.actor===1?1:0,position.actionA?.key||'',position.actionB?.key||''].join('|');
 return createHash('sha256').update(body).digest('hex').slice(0,16);
}
export function loadCopies(){
 const copies=new Map();
 for(const file of walk(ROOT)){
  if(!file.endsWith('.json'))continue;
  let data;
  try{data=JSON.parse(readFileSync(file,'utf8'));}catch{continue;}
  for(const row of positionsOf(data)){
   if(!row?.id)continue;
   const list=copies.get(row.id)||[];
   list.push({file,row});
   copies.set(row.id,list);
  }
 }
 return copies;
}
function usable(row){
 return row?.actionA?.features?.length===115&&row?.actionB?.features?.length===115&&row.actionA?.key&&row.actionB?.key;
}
export function auditSources(copies=loadCopies()){
 const counts={ids:copies.size,consistent:0,keyConflict:0,featureConflict:0,actorConflict:0,swapped:0,noFeatures:0};
 const chosen=new Map();
 const quarantined=[];
 for(const [id,list] of copies){
  const ready=list.filter(item=>usable(item.row));
  if(!ready.length){
   counts.noFeatures++;
   quarantined.push({id,reason:'沒有成對的 115 維特徵'});
   continue;
  }
  const keys=new Set(ready.map(item=>item.row.actionA.key+'||'+item.row.actionB.key));
  const actors=new Set(ready.map(item=>item.row.actor===1?1:0));
  const feats=new Set(ready.map(item=>JSON.stringify(item.row.actionA.features)+JSON.stringify(item.row.actionB.features)));
  if(keys.size>1){
   const ordered=[...keys];
   const [a,b]=ordered[0].split('||');
   const [c,d]=ordered[1].split('||');
   if(ordered.length===2&&a===d&&b===c)counts.swapped++;
   counts.keyConflict++;
   quarantined.push({id,reason:'同一局面編號的 A/B 動作鍵不一致'});
   continue;
  }
  if(actors.size>1){
   counts.actorConflict++;
   quarantined.push({id,reason:'同一局面編號的行動者不一致'});
   continue;
  }
  if(feats.size>1){
   counts.featureConflict++;
   quarantined.push({id,reason:'同一 A/B 的特徵向量不一致'});
   continue;
  }
  if(!Number.isInteger(ready[0].row.seed)){
   quarantined.push({id,reason:'沒有原始對局種子，不能分組'});
   continue;
  }
  counts.consistent++;
  chosen.set(id,ready[0].row);
 }
 return {counts,chosen,quarantined};
}
export function readRollouts(){
 const files=walk(ROOT).filter(file=>file.endsWith('rollouts.jsonl'));
 const lines=[];
 for(const file of files){
  for(const line of readFileSync(file,'utf8').split('\n')){
   if(!line)continue;
   lines.push({file,row:JSON.parse(line)});
  }
 }
 return lines;
}
export function buildAudited(options={}){
 const {counts,chosen,quarantined}=auditSources();
 const dropped={incomplete:0,conflict:0,duplicate:0};
 const byComparison=new Map();
 const seen=new Map();
 const bad=new Set();
 for(const {file,row} of readRollouts()){
  const position=chosen.get(row.positionId);
  if(!position)continue;
  const pairKey=file+'|'+row.positionId+'|'+row.attempt;
  const key=pairKey+'|'+row.side;
  const signature=row.finished+':'+row.winner;
  if(seen.has(key)){
   dropped.duplicate++;
   if(seen.get(key)!==signature){dropped.conflict++; bad.add(pairKey);}
   continue;
  }
  seen.set(key,signature);
  const pair=byComparison.get(pairKey)||{file,id:row.positionId,attempt:row.attempt};
  pair[row.side]=row;
  byComparison.set(pairKey,pair);
 }
 const grouped=new Map();
 for(const [pairKey,pair] of byComparison){
  if(bad.has(pairKey))continue;
  const position=chosen.get(pair.id);
  const diff=foldPair(pair.A,pair.B,position.actor===1?1:0);
  if(diff===null){dropped.incomplete++;continue;}
  const bucket=grouped.get(pair.id)||[];
  bucket.push({diff,file:pair.file,attempt:pair.attempt});
  grouped.set(pair.id,bucket);
 }
 const rows=[];
 for(const [id,pairs] of grouped){
  const position=chosen.get(id);
  pairs.sort((left,right)=>left.file<right.file?-1:left.file>right.file?1:left.attempt-right.attempt);
  const diffs=pairs.map(item=>item.diff);
  const plus=diffs.filter(value=>value>0).length;
  const minus=diffs.filter(value=>value<0).length;
  const tie=diffs.filter(value=>value===0).length;
  const game=(position.opponent||'unknown')+'|'+position.seed;
  const forced=options.forceDev?.has(game);
  rows.push({
   id,game,seed:position.seed,opponent:position.opponent||null,bucket:position.bucket||null,
   comparison:fingerprint(position),
   pairs:pairs.map(item=>({file:item.file,attempt:item.attempt})),
   sources:[...new Set(pairs.map(item=>item.file))],
   n:diffs.length,plus,minus,tie,
   y:(plus-minus)/diffs.length,weight:diffs.length,diffs,
   featuresA:position.actionA.features,featuresB:position.actionB.features,
   hardA:position.actionA.hard,hardB:position.actionB.hard,
   keyA:position.actionA.key,keyB:position.actionB.key,
   band:position.band||null,
   label:LABELS.get(id)||null,
   split:forced?'dev-recheck':gameRole(game),
   fold:gameFold(game)
  });
 }
 return {counts,quarantined,dropped,rows};
}
export function orient(row){
 return {
  ...row,
  featuresA:row.featuresB,featuresB:row.featuresA,
  keyA:row.keyB,keyB:row.keyA,
  y:-row.y,
  diffs:row.diffs.map(value=>-value),
  plus:row.minus,minus:row.plus
 };
}
