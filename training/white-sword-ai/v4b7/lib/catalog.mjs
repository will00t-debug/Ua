// Reliable preferences are kept by kind. One position does not get its own rule.
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {RAID_POSITION,TARGET_PREFERENCE} from './protocol.mjs';

export const CLASS_LABEL=Object.freeze({
 safe:'現有模型可以安全學會',
 collateral:'可以學會，但有必須驗證的連帶改動',
 unlearnable:'經獨立確認，但現有單步方盒無解',
 insufficient:'尚未重現或證據不足',
 opposite:'同類決策在不同局面出現相反方向'
});

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
function signature(key,features){
 const body=parsed(key);
 return [body.type||'',body.line||'',body.mode||'',cardsOf(features).join(',')].join(':');
}
export function preferenceOf(position,mean){
 const left=signature(position.actionA?.key,position.actionA?.features);
 const right=signature(position.actionB?.key,position.actionB?.features);
 return {
  family:[left,right].sort().join('||'),
  prefer:mean<0?right:left
 };
}
export function conflictIds(rows,{floor=0.25}={}){
 const groups=new Map();
 for(const row of rows||[]){
  if(!row?.family||!(Math.abs(row.mean)>=floor))continue;
  const list=groups.get(row.family)||[];
  list.push(row);
  groups.set(row.family,list);
 }
 const ids=new Set();
 for(const list of groups.values()){
  const sides=new Set(list.map(row=>row.prefer));
  if(sides.size<2)continue;
  for(const row of list)ids.add(row.id);
 }
 return ids;
}
export function classifyRow(row){
 if(row?.conflict)return 'opposite';
 if(row?.confirmed&&row.learnable&&row.searchStatus==='safe')return 'safe';
 if(row?.confirmed&&row.learnable)return 'collateral';
 if(row?.confirmed&&!row.learnable)return 'unlearnable';
 return 'insufficient';
}
export function searchEligible(row){
 return row?.confirmed===true&&row.learnable===true&&row.role==='learnable'&&row.conflict!==true;
}
export function filterRecord(targetDiff,protectMax){
 const target=Number(targetDiff);
 const protect=Number(protectMax);
 return {
  id:TARGET_PREFERENCE,
  feature:'hand_short',
  targetDiff:target,
  protectMax:protect,
  status:'filter-not-passed',
  text:'手牌能源缺口差值 '+target.toFixed(2)+' 高於其他保護局面的最大值 '+protect.toFixed(2)+'，未通過事先設定的分離門檻。這不是該特徵在數學上無法改善策略的證明。'
 };
}
export function retainedRecords(note){
 return [
  {
   id:TARGET_PREFERENCE,source:'v4b4',class:'collateral',
   label:CLASS_LABEL.collateral,
   note:'已確認的能量線偏好。v4-B.5 的單步更新會放開 067 突襲。這一輪不重估、不學習。',
   feature:note
  },
  {
   id:RAID_POSITION,source:'v4b5',class:'insufficient',
   label:'既有保護約束，不是已確認標籤',
   note:'067 突襲只保留為保護約束。不刪除，也不強迫學習。'
  }
 ];
}
