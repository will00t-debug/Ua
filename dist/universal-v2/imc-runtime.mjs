// IMC closed-effect dispatcher. Shared draw, discard, BP, AP, Raid, life
// damage, and choice windows stay in the V2 engine. A group handles only
// the card ids in its range. An unknown id fails closed.
import {runImc001} from './imc/runtime-001-050.mjs';
import {runImc051} from './imc/runtime-051-100.mjs';
import {runImcStarter} from './imc/runtime-starter.mjs';
import {IMC_REQUESTS_001_050} from './imc/requests-001-050.mjs';
import {IMC_REQUESTS_051_100} from './imc/requests-051-100.mjs';
import {IMC_REQUESTS_STARTER} from './imc/requests-starter.mjs';

const REQUEST_KEYS=['cardId','sentence','existingOps','whyNotEnough','proposal'];

export function imcRange(id){
 const serial=/^IMC-1-(\d{3})$/.exec(String(id||''));
 const n=serial?Number(serial[1]):0;
 if(n>=1&&n<=50)return 'b';
 if(n>=51&&n<=100)return 'c';
 if(n>=101&&n<=113)return 'd';
 return null;
}

export function runImcJob(pack,state,job){
 if(!job||job.op!=='imc'||imcRange(job.id)==null)
  throw Error('IMC 效果沒有對上的卡號：'+job?.id);
 if(imcRange(job.id)==='b')return runImc001(pack,state,job);
 if(imcRange(job.id)==='c')return runImc051(pack,state,job);
 return runImcStarter(pack,state,job);
}

export function assertImcSharedRequest(row){
 if(!row||typeof row!=='object')throw Error('IMC shared request is not an object');
 for(const key of REQUEST_KEYS){
  if(key==='existingOps'){
   if(!Array.isArray(row.existingOps)||!row.existingOps.length||
    row.existingOps.some(op=>typeof op!=='string'||!op.trim()))
    throw Error(row.cardId+' request needs the existing op names');
   continue;
  }
  if(typeof row[key]!=='string'||!row[key].trim())
   throw Error('IMC shared request is missing '+key);
 }
 if(imcRange(row.cardId)==null)throw Error('IMC request card is outside 001–113 '+row.cardId);
 return row;
}

export function imcSharedRequests(){
 const rows=[
  ...IMC_REQUESTS_001_050,
  ...IMC_REQUESTS_051_100,
  ...IMC_REQUESTS_STARTER
 ];
 for(const row of rows)assertImcSharedRequest(row);
 return rows;
}
