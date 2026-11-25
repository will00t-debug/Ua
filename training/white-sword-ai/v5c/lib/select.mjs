// Fill seven decision types without spending the round on another 070 energy search.
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {BUCKETS,CONFIRM_CAP,OPPONENTS,PER_CELL,SCREEN_CAP,SCREEN_FLOOR} from './protocol.mjs';
import {columnFromSides,isEnergy070,specificSide} from './columns.mjs';

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
function is070Energy(position){
 return [position?.actionA,position?.actionB].some(side=>{
  const body=side?.action||parsed(side?.key);
  return body?.type==='play'&&body?.line==='energy'&&cardsOf(side?.features).includes('BLC-4-070');
 });
}
function sidesOf(position){
 const found=[];
 for(const side of [position?.actionA,position?.actionB]){
  const made=specificSide(side);
  if(made)found.push(made);
 }
 return found;
}
function gainOf(position,types,cards){
 let gain=0;
 const seenType=new Set();
 const seenCard=new Set();
 for(const side of sidesOf(position)){
  if(!types.has(side.type)&&!seenType.has(side.type)){gain+=2;seenType.add(side.type);}
  if(side.card&&!cards.has(side.card)&&!seenCard.has(side.card)){gain+=1;seenCard.add(side.card);}
 }
 return gain;
}
export function namable(position){
 return sidesOf(position).length>0;
}
export function selectDiverse(pool,{perCell=PER_CELL,cap=SCREEN_CAP,buckets=BUCKETS,opponents=OPPONENTS}={}){
 const waiting=new Map();
 for(const position of pool||[]){
  if(!position?.id||!namable(position)||(position.band||[]).length<2)continue;
  const key=position.bucket+'|'+position.opponent;
  const rows=waiting.get(key)||[];
  rows.push(position);
  waiting.set(key,rows);
 }
 const chosen=[];
 const types=new Set();
 const cards=new Set();
 for(let slot=0;slot<perCell&&chosen.length<cap;slot++){
  for(const bucket of buckets){
   for(const opponent of opponents){
    if(chosen.length>=cap)break;
    const key=bucket+'|'+opponent;
    const rows=(waiting.get(key)||[]).filter(row=>!chosen.includes(row));
    const non=rows.filter(row=>!is070Energy(row));
    const inCell=chosen.some(row=>row.bucket===bucket&&row.opponent===opponent);
    const options=non.length?non:(inCell?[]:rows.filter(is070Energy));
    if(!options.length)continue;
    const ranked=[...options].sort((left,right)=>{
     const gap=gainOf(right,types,cards)-gainOf(left,types,cards);
     if(gap)return gap;
     return left.id<right.id?-1:left.id>right.id?1:0;
    });
    const pick=ranked[0];
    chosen.push(pick);
    for(const side of sidesOf(pick)){
     types.add(side.type);
     if(side.card)cards.add(side.card);
    }
   }
  }
 }
 return chosen;
}
export function confirmIdentity(position){
 const column=columnFromSides(position?.actionA,position?.actionB,'B');
 return column;
}
export function selectConfirm(rows,{floor=SCREEN_FLOOR,cap=CONFIRM_CAP}={}){
 const passed=(rows||[]).filter(row=>row?.column&&row.mean<=floor);
 const chosen=[];
 const types=new Set();
 const cards=new Set();
 let used070=false;
 while(chosen.length<cap){
  let best=null;
  for(const row of passed){
   if(chosen.includes(row))continue;
   if(isEnergy070(row.column)&&used070)continue;
   const typeGain=types.has(row.column.type)?0:2;
   const cardGain=row.column.card&&!cards.has(row.column.card)?1:0;
   const gain=typeGain+cardGain;
   if(!best||gain>best.gain||(gain===best.gain&&(row.mean<best.row.mean||(row.mean===best.row.mean&&row.id<best.row.id)))){
    best={gain,row};
   }
  }
  if(!best||best.gain===0)break;
  chosen.push(best.row);
  types.add(best.row.column.type);
  if(best.row.column.card)cards.add(best.row.column.card);
  if(isEnergy070(best.row.column))used070=true;
 }
 return chosen;
}
