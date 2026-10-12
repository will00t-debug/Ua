import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
const byId=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const aliasToId=Object.fromEntries(SOLO_LEVELING_CARDS.flatMap(c=>[c.id,c.number,...(c.aliases||[])].map(k=>[k,c.id])));
export const SOLO_BASE_TOTAL=80;
export const SOLO_DRAFT_PRESET={
 'SLG-1-030':12,'SLG-1-001':4,'SLG-1-002':4,'SLG-1-003':4,
 'SLG-1-006':4,'SLG-1-015':4,'SLG-1-019':4,'SLG-1-020':4,
 'SLG-1-028':4,'SLG-1-033':4,'SLG-1-036':2
};
// A deck editor draft is not a match-ready default until all included card effects are implemented.
export function normalizeSoloDeck(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid UA51BT deck');
 const counts=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,0]));
 for(const [raw,n] of Object.entries(input)){
  const id=aliasToId[raw],c=byId[id];
  if(!c||!Number.isInteger(n)||n<0)throw Error('card id or count invalid: '+raw);
  counts[id]+=n;
  if(counts[id]>c.maxCopies)throw Error('card exceeds official copy limit: '+id);
 }
 return counts;
}
export function soloDeckIssues(input={}){
 let counts;try{counts=normalizeSoloDeck(input);}catch(e){return [e.message];}
 const selected=SOLO_LEVELING_CARDS.filter(c=>counts[c.id]>0),total=selected.reduce((n,c)=>n+counts[c.id],0);
 const errs=[];
 if(total!==50)errs.push('一副牌組需正好50張；目前'+total+'張');
 for(const tr of ['special','final','color']){
  const n=selected.filter(c=>c.trigger===tr).reduce((n,c)=>n+counts[c.id],0);
  if(n>4)errs.push(tr.toUpperCase()+' Trigger最多4張');
 }
 if(selected.some(c=>!c.auto))errs.push('尚有卡片效果未接入UA51BT對戰引擎，不能開始對戰');
 return errs;
}
