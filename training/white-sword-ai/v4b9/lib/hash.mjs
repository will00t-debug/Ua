// The eight frozen hash bits. This mirrors features.mjs and does not change a weight.
import {WHITE_SWORD_IDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {HASH_INDEX,HASH_NAMES} from '../../v4b1/lib/feasibility.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';

export function hashBin(text,bins=8){
 let hash=2166136261;
 const value=String(text);
 for(let index=0;index<value.length;index++){
  hash^=value.charCodeAt(index);
  hash=Math.imul(hash,16777619);
 }
 return (hash>>>0)%bins;
}
export function signatureOf(type,card,mode,line){
 return [type||'',card||'',mode||'',line||''].join('|');
}
function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function storedBin(features){
 const hits=[];
 HASH_NAMES.forEach((name,index)=>{
  if((features?.[HASH_INDEX[index]]||0)>0.5)hits.push(index);
 });
 return hits;
}
export function explainHashes(parent,positions){
 const weights=HASH_NAMES.map((name,index)=>({
  name,index,weight:parent[HASH_INDEX[index]],points:SCALE*parent[HASH_INDEX[index]]
 }));
 const observed=HASH_NAMES.map(()=>new Map());
 const unresolved=HASH_NAMES.map(()=>new Map());
 let checked=0;
 let mismatched=0;
 let structural=0;
 const reconstructable=new Set(['play','raid','activate','attack','move','next']);
 for(const position of positions||[]){
  for(const row of position.band||[]){
   const body=parsed(row.key);
   const cards=cardsOf(row.features);
   const text=signatureOf(body.type,cards[0]||'',body.mode,body.line);
   const bin=hashBin(text);
   const hits=storedBin(row.features);
   checked++;
   if(hits.length===1&&hits[0]===bin){
    const bucket=observed[bin];
    bucket.set(text,(bucket.get(text)||0)+1);
    continue;
   }
   mismatched++;
   const known=reconstructable.has(body.type)||cards.length>0||hits.length!==1;
   if(known)structural++;
   if(hits.length===1){
    const label=(body.type||'未知')+'（向量沒有可還原的卡號）';
    const bucket=unresolved[hits[0]];
    bucket.set(label,(bucket.get(label)||0)+1);
   }
  }
 }
 const space=HASH_NAMES.map(()=>[]);
 const kinds=[
  ['play','front'],['play','energy'],['raid',''],['activate',''],['attack',''],['move','']
 ];
 for(const card of WHITE_SWORD_IDS){
  for(const [type,line] of kinds){
   const text=signatureOf(type,card,'',line);
   space[hashBin(text)].push(text);
  }
 }
 const bins=HASH_NAMES.map((name,index)=>({
  name,
  weight:weights[index].weight,
  points:weights[index].points,
  observed:[...observed[index].entries()].map(([text,count])=>({text,count})).sort((left,right)=>right.count-left.count||(left.text<right.text?-1:1)),
  unresolved:[...unresolved[index].entries()].map(([text,count])=>({text,count})).sort((left,right)=>right.count-left.count),
  space:space[index]
 }));
 const pair=(card,line)=>signatureOf('play',card,'',line);
 return {
  weights,checked,mismatched,structural,bins,
  line:{
   front:pair('BLC-4-070','front'),
   energy:pair('BLC-4-070','energy'),
   frontBin:hashBin(pair('BLC-4-070','front')),
   energyBin:hashBin(pair('BLC-4-070','energy'))
  },
  index:POLICY_INDEX.h2
 };
}
