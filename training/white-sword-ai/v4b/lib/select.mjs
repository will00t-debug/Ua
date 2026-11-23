// Round-robin across situation types, then across opponent decks.
// High-disagreement raid positions do not fill the whole sample.
import {BUCKETS,MAX_POSITIONS,PER_BUCKET_CAP} from './protocol.mjs';

export function selectPositions(pool,limit=MAX_POSITIONS){
 const waiting=new Map(BUCKETS.map(bucket=>[bucket,[]]));
 for(const position of pool||[]){
  if((position.band||[]).length<2)continue;
  if(waiting.has(position.bucket))waiting.get(position.bucket).push(position);
 }
 const chosen=[];
 const counts={};
 const opponents={};
 let moved=true;
 while(chosen.length<limit&&moved){
  moved=false;
  for(const bucket of BUCKETS){
   if((counts[bucket]||0)>=PER_BUCKET_CAP)continue;
   const rows=waiting.get(bucket).filter(row=>!chosen.includes(row));
   rows.sort((left,right)=>(opponents[left.opponent]||0)-(opponents[right.opponent]||0)||left.step-right.step);
   const next=rows[0];
   if(!next)continue;
   chosen.push(next);
   counts[bucket]=(counts[bucket]||0)+1;
   opponents[next.opponent]=(opponents[next.opponent]||0)+1;
   moved=true;
   if(chosen.length>=limit)break;
  }
 }
 return {chosen,counts,opponents,buckets:Object.values(counts).filter(count=>count>0).length};
}
