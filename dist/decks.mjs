import {CARDS,BY_ID,validateDeck,resolveCardId} from './cards.mjs?v=8';

export const emptyDeck=()=>Object.fromEntries(CARDS.map(c=>[c.id,0]));
export function normalizeCounts(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('牌組內容必須是卡號與張數。');
 const counts=emptyDeck();
 for(const [key,raw] of Object.entries(input)){
  const id=cardId(key),n=Number(raw);
  if(typeof raw==='boolean'||raw===null||!Number.isInteger(n)||n<0||n>4)throw new Error(`${key} 的張數必須是 0–4。`);
  counts[id]+=n;if(counts[id]>4)throw new Error(`${BY_ID[id].number} 合計超過 4 張。`);
 }
 return counts;
}
function cardId(value){
 const id=resolveCardId(value);
 if(!id)throw new Error(`尚未支援卡號 ${value}。請使用完整的 BLEACH 卡號。`);
 return id;
}
export function parseDeck(text){
 const source=String(text).trim();if(!source)throw new Error('請貼上牌組清單。');
 let counts,name=null;
 if(source.startsWith('{')){
  let data;try{data=JSON.parse(source);}catch{throw new Error('JSON 格式不正確。');}
  if(data&&typeof data.name==='string')name=data.name.trim().slice(0,40);
  counts=normalizeCounts(data?.counts??data);
 }else{
  counts=emptyDeck();const lines=source.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
   const line=lines[i].trim();if(!line||line.startsWith('//'))continue;
   if(line.startsWith('#')){if(!name)name=line.slice(1).trim().slice(0,40);continue;}
   let id,n,match;
   if((match=line.match(/^(\d{1,2})\s*[x×]\s*(\S+)$/i))||(match=line.match(/^(\d{1,2})\s+(\S+)$/))){n=Number(match[1]);id=cardId(match[2]);}
   else if((match=line.match(/^(\S+?)\s*[x×:]\s*(\d{1,2})$/i))||(match=line.match(/^(\S+)\s+(\d{1,2})$/))){id=cardId(match[1]);n=Number(match[2]);}
   else {try{id=cardId(line);n=1;}catch{throw new Error(`第 ${i+1} 行無法讀取。請使用「4 UA08ST/BLC-1-104」格式。`);}}
   if(n<1||n>4)throw new Error(`第 ${i+1} 行張數必須是 1–4。`);
   counts[id]+=n;if(counts[id]>4)throw new Error(`${BY_ID[id].number} 合計超過 4 張。`);
  }
 }
 const errors=validateDeck(counts);if(errors.length)throw new Error(errors.join(' '));
 return {name,counts};
}
export function formatDeck(counts,name=''){
 return (name?`# ${name.replace(/[\r\n]/g,' ')}\n`:'')+CARDS.filter(c=>counts[c.id]).map(c=>`${counts[c.id]} ${c.number}`).join('\n');
}
export function readSavedDecks(data){
 if(!Array.isArray(data))return [];
 const saved=[],seen=new Set();
 for(const d of data){try{
  if(typeof d.id!=='string'||!d.id||seen.has(d.id)||typeof d.name!=='string'||!d.name.trim())continue;
  const counts=normalizeCounts(d.counts);if(validateDeck(counts).length)continue;
  saved.push({id:d.id,name:d.name.trim().slice(0,40),counts,updatedAt:typeof d.updatedAt==='string'?d.updatedAt:null});seen.add(d.id);
 }catch{}}
 return saved;
}
export const sameCounts=(a,b)=>CARDS.every(c=>(a[c.id]||0)===(b[c.id]||0));
