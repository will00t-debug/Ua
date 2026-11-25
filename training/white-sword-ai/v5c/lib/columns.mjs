// A confirmed preference names one action column. Generic end-turn actions do not.
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {HISTORICAL_060} from './protocol.mjs';

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function specificSide(side){
 const body=side?.action||parsed(side?.key);
 if(!body?.type||body.type==='next')return null;
 const cards=side?.card?[side.card]:cardsOf(side?.features);
 if(cards.length!==1)return null;
 return {type:body.type,card:cards[0],line:body.line||null};
}
export function columnFromSides(actionA,actionB,prefer){
 if(prefer!=='A'&&prefer!=='B')throw Error('偏好方向必須是 A 或 B');
 const preferred=prefer==='A'?actionA:actionB;
 const other=prefer==='A'?actionB:actionA;
 const wanted=specificSide(preferred);
 if(wanted)return {sign:1,...wanted};
 const penalized=specificSide(other);
 if(!penalized)return null;
 return {sign:-1,...penalized};
}
export function signatureOf(column){
 return (column.sign>0?'+':'-')+'|'+column.type+'|'+column.card+'|'+(column.line||'');
}
export function columnFromRow(row){
 if(!row||row.id===HISTORICAL_060)return null;
 if(row.source!=='v5c'||row.confirmed!==true)return null;
 const made=columnFromSides(row.actionA,row.actionB,row.prefer||'B');
 if(!made)return null;
 const preferred=row.prefer==='A'?row.actionA:row.actionB;
 return {...made,signature:signatureOf(made),id:row.id,preferKey:preferred.key};
}
export function actionIdentity(column){
 return column.type+'|'+column.card+'|'+(column.line||'');
}
export function accumulateColumns(columns){
 const grouped=new Map();
 for(const column of columns||[]){
  const id=actionIdentity(column);
  const rows=grouped.get(id)||[];
  rows.push(column);
  grouped.set(id,rows);
 }
 const kept=[];
 const rejected=[];
 for(const [id,rows] of grouped){
  const signs=new Set(rows.map(row=>row.sign));
  if(signs.size>1){
   rejected.push({id,reason:'同一動作欄位有相反方向，不累積'});
   continue;
  }
  const first=rows[0];
  const targets=rows.flatMap(row=>row.targets||[]);
  kept.push({...first,targets:targets.length?targets:first.targets||[]});
 }
 return {kept,rejected};
}
export function roundColumns(rows){
 const grouped=new Map();
 for(const row of rows||[]){
  const column=columnFromRow(row);
  if(!column)continue;
  const existing=grouped.get(column.signature);
  const target={id:column.id,key:column.preferKey};
  if(!existing)grouped.set(column.signature,{...column,targets:[target]});
  else{
   if(existing.sign!==column.sign)throw Error('同一個欄位出現相反符號');
   existing.targets.push(target);
  }
 }
 return [...grouped.values()];
}
export function isEnergy070(column){
 return !!column&&column.sign>0&&column.type==='play'&&column.card==='BLC-4-070'&&column.line==='energy';
}
