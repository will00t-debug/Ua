import {MADOKA_BY_ID,MADOKA_CARDS} from './madoka-cards.mjs';
import {v2UnsupportedIds} from './universal-v2/official-entry.mjs';
export {MADOKA_CARDS,MADOKA_BY_ID};

export const emptyMadokaDeck=()=>Object.fromEntries(MADOKA_CARDS.map(c=>[c.id,0]));

export function normalizeMadokaCounts(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('牌組格式錯誤');
 const result=emptyMadokaDeck();
 for(const [raw,n] of Object.entries(data)){
  const id=raw.replace(/^UA31(BT|ST)\//,'');
  if(!MADOKA_BY_ID[id]||!Number.isInteger(n)||n<0||n>4)throw new Error('卡號不存在或數量超過每種 4 張：'+raw);
  result[id]+=n;
  if(result[id]>4)throw new Error('同卡號與異圖合計不可超過 4 張：'+raw);
 }
 return result;
}

export function madokaCount(counts){
 return Object.values(normalizeMadokaCounts(counts)).reduce((n,x)=>n+x,0);
}

export function madokaDeckIssues(counts){
 let deck;
 try{deck=normalizeMadokaCounts(counts);}catch(error){return [error.message];}
 const total=Object.values(deck).reduce((n,x)=>n+x,0);
 const errors=[];
 if(total!==50)errors.push('目前 '+total+'/50 張，正式牌組需要 50 張。目前不能開始對戰。');
 const unsupported=v2UnsupportedIds('madoka',deck);
 if(unsupported.length)errors.push('包含尚未支援 V2 效果的卡片：'+unsupported.slice(0,8).join('、')+'。目前不能開始對戰。這些效果不會被略過。');
 return errors;
}

export function readMadokaSaved(value){
 if(!Array.isArray(value))return [];
 return value.flatMap(entry=>{
  try{
   if(typeof entry?.name!=='string'||!entry.name.trim()||typeof entry.id!=='string')return [];
   return [{id:entry.id,name:entry.name.trim().slice(0,40),counts:normalizeMadokaCounts(entry.counts)}];
  }catch{return [];}
 });
}
