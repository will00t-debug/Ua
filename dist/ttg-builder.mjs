import {UA56BT_VERIFIED} from './gurren-lagann.mjs';
import {ttgArtSource} from './ttg-art.mjs';
// Action Point illustration cards are not deck-building cards and must not appear in the card pool.
export const TTG_CARDS=UA56BT_VERIFIED.filter(c=>c.type!=='action_point'&&c.type!=='ap'&&!/TTG-1-AP\d+/i.test(c.id)).map(c=>({...c,image:ttgArtSource(c.id)}));
export const TTG_BY_ID=Object.fromEntries(TTG_CARDS.map(c=>[c.id,c]));
export const emptyTtgDeck=()=>Object.fromEntries(TTG_CARDS.map(c=>[c.id,0]));
export function normalizeTtgCounts(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('牌組格式錯誤');
 const result=emptyTtgDeck();
 for(const [raw,n] of Object.entries(data)){
  const id=raw.startsWith('UA56BT/')?raw.slice(7):raw;
  if(!TTG_BY_ID[id]||!Number.isInteger(n)||n<0||n>4)throw new Error('卡號不存在或數量超過每種 4 張：'+raw);
  result[id]+=n;
  if(result[id]>4)throw new Error('同卡號與異圖合計不可超過 4 張：'+raw);
 }
 return result;
}
export function ttgCount(counts){return Object.values(normalizeTtgCounts(counts)).reduce((n,x)=>n+x,0);}
export function ttgDeckIssues(counts){
 let c;try{c=normalizeTtgCounts(counts);}catch(e){return [e.message];}
 const total=Object.values(c).reduce((n,x)=>n+x,0);
 const errors=[];
 if(total!==50)errors.push('目前 '+total+'/50 張，正式牌組需要 50 張。');
 for(const trigger of ['special','color','final']){
  const count=TTG_CARDS.reduce((n,card)=>n+(card.trigger===trigger?(c[card.id]||0):0),0);
  if(count>4)errors.push(trigger.toUpperCase()+' Trigger 合計不可超過 4 張（目前 '+count+' 張）。');
 }
 return errors;
}
export function readTtgSaved(value){
 if(!Array.isArray(value))return [];
 return value.flatMap(x=>{try{
  if(typeof x.name!=='string'||!x.name.trim()||typeof x.id!=='string')return [];
  return [{id:x.id,name:x.name.trim().slice(0,40),counts:normalizeTtgCounts(x.counts)}];
 }catch{return [];}});
}
