// Production-only V2 deck compatibility: never use legacy auto, rules or match reducers.
import {TITLES} from './title-registry.mjs';
import {registeredV2TitlePack} from './universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from './universal-v2/pack.mjs';
import {officialV2Pack} from './universal-v2/official-entry.mjs';

export const LEGACY_DECK_KEYS=Object.freeze({
 bleach:['bleach-arena-deck-v1','bleach-arena-saved-decks-v1'],
 'gurren-lagann':['ua-ttg-draft-v1','ua-ttg-saved-v1'],
 'sword-art-online':['ua-sao-draft-v1','ua-sao-saved-v1'],
 'solo-leveling':['ua-slg-draft-v1','ua-slg-saved-v1'],
 'mushoku-tensei':['ua-mst-draft-v1','ua-mst-saved-v1'],
 rezero:['ua-rez-draft-v1','ua-rez-saved-v1']
});
export const V2_EDITOR_TRANSFER_KEY='ua-v2-editor-deck-v1';
export const titleCatalogue=id=>TITLES.find(t=>t.id===id)||null;
export function registeredPackForEditor(title){
 if(!titleCatalogue(title))return null;
 // Re:Zero stays outside the five-title census. Set 1 plus the integrated
 // Vol.2 profiles share one battle pack; unimplemented Vol.2 ids are absent.
 if(title==='rezero')return officialV2Pack('rezero');
 return registeredV2TitlePack(title);
}
export function normalizeEditorCounts(title,input){
 const catalog=titleCatalogue(title);
 if(!catalog)throw Error('找不到卡牌作品');
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('牌組資料格式不正確');
 const keys=new Map();
 for(const c of catalog.cards){
  for(const x of [c.id,c.identity,c.number,...(c.aliases||[])]){
   if(typeof x==='string'&&!keys.has(x))keys.set(x,c.id);
  }
 }
 const counts={};
 for(const [raw,v] of Object.entries(input)){
  const id=keys.get(raw);
  if(!id||!Number.isInteger(v)||v<0||v>4)throw Error('無效卡號或張數：'+raw);
  counts[id]=(counts[id]||0)+v;
  if(counts[id]>4)throw Error('同卡號超過 4 張：'+id);
 }
 return counts;
}
export function toV2Counts(title,counts){
 const catalog=titleCatalogue(title);
 if(!catalog)throw Error('找不到卡牌作品');
 const byId=new Map(catalog.cards.map(c=>[c.id,c]));
 const output={};
 for(const [id,n] of Object.entries(counts)){
  if(!n)continue;
  const c=byId.get(id);
  if(!c)throw Error('卡號不存在：'+id);
  const identity=c.identity||c.id;
  output[identity]=(output[identity]||0)+n;
 }
 return output;
}
export function editorV2Status(title,counts,pack=registeredPackForEditor(title)){
 const catalog=titleCatalogue(title);
 if(!catalog)return {supported:new Set(),issues:['未知的作品'],ready:false,total:0,registered:0,pack:null,counts:{}};
 const cards=catalog.cards,byId=new Map(cards.map(c=>[c.id,c]));
 const supported=new Set(cards.filter(c=>pack?.cards[c.identity||c.id]).map(c=>c.id));
 const selected=Object.entries(counts).filter(([,n])=>n>0);
 const total=selected.reduce((n,[,v])=>n+v,0);
 const errors=[];
 if(total!==50)errors.push('目前 '+total+'/50 張。V2 正式對戰需要完整 50 張牌組。');
 for(const [id,n] of selected){
  if(!byId.has(id)||!Number.isInteger(n)||n>4||n<0)errors.push('卡號或張數不合法：'+id);
 }
 const missing=selected.filter(([id])=>!supported.has(id)).map(([id])=>id);
 if(missing.length)errors.push('有 '+missing.length+' 種卡尚未完整移植 V2：'+missing.slice(0,6).join('、')+(missing.length>6?'…':''));
 if(!pack)errors.push('此作品尚未接入正式 V2 對戰登錄表；目前可收藏與組卡。');
 let v2Counts={};
 if(!errors.length){
  v2Counts=toV2Counts(title,counts);
  errors.push(...validateUniversalDeck(pack,v2Counts));
 }
 return {supported,issues:errors,ready:errors.length===0,total,registered:supported.size,pack,counts:v2Counts};
}
