import {UA54BT_VERIFIED} from './mushoku-tensei.mjs';
export const MST_CARDS=UA54BT_VERIFIED;
export const MST_BY_ID=Object.fromEntries(MST_CARDS.map(c=>[c.id,c]));
export const emptyMstDeck=()=>Object.fromEntries(MST_CARDS.map(c=>[c.id,0]));
export function normalizeMstCounts(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('牌組格式錯誤');
 const result=emptyMstDeck();
 for(const [raw,n] of Object.entries(data)){
  const id=raw.startsWith('UA54BT/')?raw.slice(7):raw;
  if(!MST_BY_ID[id]||!Number.isInteger(n)||n<0||n>4)throw new Error('卡號不存在或數量超過每種 4 張：'+raw);
  result[id]+=n;
  if(result[id]>4)throw new Error('同卡號與異圖合計不可超過 4 張：'+raw);
 }
 return result;
}
export function mstCount(counts){return Object.values(normalizeMstCounts(counts)).reduce((n,x)=>n+x,0);}
export function mstDeckIssues(counts){
 let c;try{c=normalizeMstCounts(counts);}catch(e){return [e.message];}
 const total=Object.values(c).reduce((n,x)=>n+x,0);
 const errors=[];
 if(total!==50)errors.push('目前 '+total+'/50 張，正式牌組需要 50 張。');
 if(MST_CARDS.some(x=>c[x.id]&&!x.auto))errors.push('包含尚未實作自動判定的卡片，目前不能開始對戰。');
 return errors;
}
export function readMstSaved(value){
 if(!Array.isArray(value))return [];
 return value.flatMap(x=>{try{
  if(typeof x.name!=='string'||!x.name.trim()||typeof x.id!=='string')return [];
  return [{id:x.id,name:x.name.trim().slice(0,40),counts:normalizeMstCounts(x.counts)}];
 }catch{return [];}});
}
