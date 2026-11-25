// A rollout counts only when the producing script's input file still has the same actions.
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {foldPair} from '../../v4b/lib/evaluate.mjs';
import {auditSources,readRollouts} from '../../v6a1/lib/audit.mjs';
import {gameFold,gameRole} from '../../v6a/lib/protocol.mjs';

export const ROLLOUT_SOURCES=Object.freeze({
 'training/white-sword-ai/v4b/rollouts.jsonl':['training/white-sword-ai/v4b/pool.json','training/white-sword-ai/v4b/selected.json'],
 'training/white-sword-ai/v4b2/rollouts.jsonl':['training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b2/selected.json'],
 'training/white-sword-ai/v4b3/rollouts.jsonl':['training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b/selected.json'],
 'training/white-sword-ai/v4b4/screen-rollouts.jsonl':['training/white-sword-ai/v4b2/selected.json'],
 'training/white-sword-ai/v4b4/confirm-rollouts.jsonl':['training/white-sword-ai/v4b2/selected.json'],
 'training/white-sword-ai/v4b5/check-rollouts.jsonl':['training/white-sword-ai/v4b5/mine.json'],
 'training/white-sword-ai/v4b7/screen-rollouts.jsonl':['training/white-sword-ai/v4b7/mine.json'],
 'training/white-sword-ai/v4b7/confirm-rollouts.jsonl':['training/white-sword-ai/v4b7/mine.json'],
 'training/white-sword-ai/v4b8/screen-rollouts.jsonl':['training/white-sword-ai/v4b8/mine.json'],
 'training/white-sword-ai/v4b8/confirm-rollouts.jsonl':['training/white-sword-ai/v4b8/mine.json'],
 'training/white-sword-ai/v4b9/confirm-rollouts.jsonl':['training/white-sword-ai/v4b9/mine.json'],
 'training/white-sword-ai/v4b9/validate-rollouts.jsonl':[
  'training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b/selected.json',
  'training/white-sword-ai/v4b5/mine.json','training/white-sword-ai/v4b7/mine.json','training/white-sword-ai/v4b8/mine.json'
 ],
 'training/white-sword-ai/v5b/validate-rollouts.jsonl':[
  'training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b/selected.json',
  'training/white-sword-ai/v4b5/mine.json','training/white-sword-ai/v4b7/mine.json',
  'training/white-sword-ai/v4b8/mine.json','training/white-sword-ai/v4b9/mine.json',
  'training/white-sword-ai/v5b/mine.json'
 ],
 'training/white-sword-ai/v5c/screen-rollouts.jsonl':['training/white-sword-ai/v5c/mine.json'],
 'training/white-sword-ai/v5c/confirm-rollouts.jsonl':['training/white-sword-ai/v5c/mine.json'],
 'training/white-sword-ai/v5d/screen-rollouts.jsonl':['training/white-sword-ai/v5d/mine.json'],
 'training/white-sword-ai/v5d/confirm-rollouts.jsonl':['training/white-sword-ai/v5d/mine.json'],
 'training/white-sword-ai/v5d1/confirm-rollouts.jsonl':['training/white-sword-ai/v5d1/mine.json'],
 'training/white-sword-ai/v6a/rollouts.jsonl':['training/white-sword-ai/v6a/mine.json']
});

function positionsIn(file){
 let data;
 try{data=JSON.parse(readFileSync(file,'utf8'));}catch{return new Map();}
 const rows=[];
 if(Array.isArray(data?.positions))rows.push(...data.positions);
 if(Array.isArray(data?.games))for(const game of data.games)rows.push(...(game?.positions||[]));
 const map=new Map();
 for(const row of rows)if(row?.id)map.set(row.id,row);
 return map;
}
const CACHE=new Map();
function sourcePositions(file){
 if(!CACHE.has(file))CACHE.set(file,positionsIn(file));
 return CACHE.get(file);
}
function scanPlans(){
 let files=0;
 let withActionKeys=0;
 function walk(dir){
  for(const name of readdirSync(dir)){
   if(name==='v6a2')continue;
   const path=join(dir,name);
   if(statSync(path).isDirectory())walk(path);
   else if(name.endsWith('.json')&&name.includes('plan')){
    files++;
    const text=readFileSync(path,'utf8');
    if(text.includes('"actionA"')||text.includes('"keyA"')||text.includes('"actionB"'))withActionKeys++;
   }
  }
 }
 walk('training/white-sword-ai');
 return {files,withActionKeys};
}
function sameFeatures(left,right){
 return !!left&&!!right&&JSON.stringify(left)===JSON.stringify(right);
}
export function buildTagged(forceDev=new Set()){
 const {counts,chosen,quarantined}=auditSources();
 const plans=scanPlans();
 const dropped={incomplete:0,conflict:0,duplicate:0,unconfirmedPairs:0,confirmedPairs:0};
 const byPair=new Map();
 const seen=new Map();
 const bad=new Set();
 for(const {file,row} of readRollouts()){
  if(!chosen.has(row.positionId))continue;
  const pairKey=file+'|'+row.positionId+'|'+row.attempt;
  const lineKey=pairKey+'|'+row.side;
  const signature=row.finished+':'+row.winner;
  if(seen.has(lineKey)){
   dropped.duplicate++;
   if(seen.get(lineKey)!==signature){dropped.conflict++;bad.add(pairKey);}
   continue;
  }
  seen.set(lineKey,signature);
  const pair=byPair.get(pairKey)||{file,id:row.positionId,attempt:row.attempt};
  pair[row.side]=row;
  byPair.set(pairKey,pair);
 }
 const grouped=new Map();
 for(const [pairKey,pair] of byPair){
  if(bad.has(pairKey))continue;
  const position=chosen.get(pair.id);
  const diff=foldPair(pair.A,pair.B,position.actor===1?1:0);
  if(diff===null){dropped.incomplete++;continue;}
  const sources=ROLLOUT_SOURCES[pair.file]||[];
  const matched=sources.map(file=>sourcePositions(file).get(pair.id)).find(row=>row?.actionA?.key===position.actionA.key&&row?.actionB?.key===position.actionB.key&&sameFeatures(row.actionA.features,position.actionA.features));
  const confirmed=!!matched;
  if(confirmed)dropped.confirmedPairs++;
  else dropped.unconfirmedPairs++;
  const bucket=grouped.get(pair.id)||{confirmed:[],other:[]};
  bucket[confirmed?'confirmed':'other'].push(diff);
  grouped.set(pair.id,bucket);
 }
 const rows=[];
 for(const [id,bucket] of grouped){
  const position=chosen.get(id);
  const use=bucket.confirmed.length?bucket.confirmed:null;
  if(!use)continue;
  const plus=use.filter(value=>value>0).length;
  const minus=use.filter(value=>value<0).length;
  const game=(position.opponent||'unknown')+'|'+position.seed;
  rows.push({
   id,game,seed:position.seed,opponent:position.opponent||null,bucket:position.bucket||null,
   comparison:createHash('sha256').update([position.actor===1?1:0,position.actionA.key,position.actionB.key].join('|')).digest('hex').slice(0,16),
   n:use.length,y:(plus-minus)/use.length,weight:use.length,
   sensitiveN:bucket.other.length,
   featuresA:position.actionA.features,featuresB:position.actionB.features,
   hardA:position.actionA.hard,hardB:position.actionB.hard,
   keyA:position.actionA.key,keyB:position.actionB.key,band:position.band||[],
   split:forceDev.has(game)?'dev-recheck':gameRole(game),fold:gameFold(game)
  });
 }
 const sensitive=[];
 for(const [id,bucket] of grouped){
  if(!bucket.other.length)continue;
  const position=chosen.get(id);
  const use=bucket.confirmed.concat(bucket.other);
  const plus=use.filter(value=>value>0).length;
  const minus=use.filter(value=>value<0).length;
  sensitive.push({id,n:use.length,y:(plus-minus)/use.length,weight:use.length,featuresA:position.actionA.features,featuresB:position.actionB.features,game:(position.opponent||'unknown')+'|'+position.seed,split:gameRole((position.opponent||'unknown')+'|'+position.seed)});
 }
 return {counts,quarantined,dropped,rows,sensitive,plansChecked:plans};
}
