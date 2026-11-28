// Seed ledger. A seed used for one purpose cannot later be independent evidence.
import {readFileSync,writeFileSync} from 'node:fs';
import {isReserved,seedEntries} from './protocol.mjs';

export function emptyLedger(){
 return {format:'ua-white-sword-v4a-ledger',uses:[]};
}
export function loadLedger(file){
 try{
  const ledger=JSON.parse(readFileSync(file,'utf8'));
  if(ledger?.format!=='ua-white-sword-v4a-ledger'||!Array.isArray(ledger.uses))throw Error('Bad seed ledger');
  return ledger;
 }catch(error){
  if(error?.code==='ENOENT')return emptyLedger();
  throw error;
 }
}
export function assertPlanLegal(plan,ledger){
 const entries=seedEntries(plan);
 const seen=new Set();
 for(const entry of entries){
  if(seen.has(entry.seed))throw Error('Seed plan repeats '+entry.seed);
  seen.add(entry.seed);
  if(isReserved(entry.seed))throw Error('Seed '+entry.seed+' is reserved and cannot be used');
  const prior=ledger.uses.find(row=>row.seed===entry.seed);
  if(!prior)continue;
  const same=prior.purpose===entry.purpose&&prior.round===entry.round&&prior.profile===entry.profile;
  if(!same)throw Error('Seed '+entry.seed+' was already used for '+prior.profile+' round '+prior.round+' '+prior.purpose);
 }
 return entries;
}
export function recordPlan(ledger,plan){
 const entries=assertPlanLegal(plan,ledger);
 let added=0;
 for(const entry of entries){
  if(ledger.uses.some(row=>row.seed===entry.seed))continue;
  ledger.uses.push({...entry,at:new Date().toISOString()});
  added++;
 }
 return added;
}
export function saveLedger(file,ledger){
 writeFileSync(file,JSON.stringify(ledger,null,2));
}
