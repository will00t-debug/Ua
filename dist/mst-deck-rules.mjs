import {UA54BT_VERIFIED} from './mushoku-tensei.mjs';
export const MST_REGULAR_CARDS=UA54BT_VERIFIED;
export const MST_BY_ID=Object.fromEntries(MST_REGULAR_CARDS.map(c=>[c.id,c]));
export const MST_RESTRICTIONS={'MST-1-051':1};
// 2026-10-01 JP/TC rules: https://www.unionarena-tcg.com/jp/rules/limited.php
export function mstCanonicalId(value){
 const key=String(value||'').trim();
 const m=/^(?:UA54BT\/)?(MST-1-\d{3})(?:_p\d+)?$/i.exec(key);
 if(!m||!Object.hasOwn(MST_BY_ID,m[1].toUpperCase()))throw new Error('非無職轉生一般卡號：'+key);
 return m[1].toUpperCase();
}
export function mstNormalizeDeck(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('牌組格式錯誤');
 const counts=Object.fromEntries(MST_REGULAR_CARDS.map(c=>[c.id,0]));
 for(const [raw,n] of Object.entries(input)){
  const id=mstCanonicalId(raw);
  if(!Number.isInteger(n)||n<0)throw new Error('張數必須是非負整數：'+raw);
  counts[id]+=n;
  const limit=MST_RESTRICTIONS[id]??4;
  if(counts[id]>limit)throw new Error(id+' 最多 '+limit+' 張，含同卡號異圖。');
 }
 return counts;
}
export function mstValidateDeck(input,{requirePlayable=true}={}){
 let counts;
 try{counts=mstNormalizeDeck(input);}catch(error){return [error.message];}
 const errors=[];
 const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 if(total!==50)errors.push('牌組必須正好 50 張，目前 '+total+' 張。');
 for(const trigger of ['special','final','color']){
  const n=MST_REGULAR_CARDS.filter(c=>c.trigger===trigger).reduce((sum,c)=>sum+counts[c.id],0);
  if(n>4)errors.push(trigger.toUpperCase()+' Trigger 最多 4 張，現在 '+n+' 張。');
 }
 if(requirePlayable){
  const pending=MST_REGULAR_CARDS.filter(c=>counts[c.id]>0&&(!c.verified||!c.auto));
  if(pending.length)errors.push(pending.length+' 種未完成端到端判定，不可開啟 AI 對戰：'+pending.map(c=>c.id).join('、'));
 }
 return errors;
}
