// Optional attack-phase snapshot. Build it only after a search has returned.
// It reads the public front and the finished trace. It never reads a hand,
// deck, life pile, outside pile, or a Raid layer.
import {legalUniversalActions,universalBp} from '../engine.mjs';

function packOf(pack,owner){
 return Array.isArray(pack)?pack[owner]:pack;
}
function roundScore(value){
 return Number.isFinite(value)?Math.round(value*10)/10:null;
}
export function publicSearchLines(trace){
 return (trace?.candidates||[]).flatMap(row=>{
  const action=row?.action;
  if(action?.type!=='attack'&&action?.type!=='next')return [];
  return [{
   type:action.type,
   uid:typeof action.uid==='string'?action.uid:null,
   search:roundScore(row.search),
   boundary:typeof row.boundary==='string'?row.boundary:null
  }];
 });
}
function frontCard(pack,state,owner,card,slot){
 if(!card?.uid)return {slot,uid:null,ready:null,name:null,cardId:null,bp:null};
 const printed=packOf(pack,owner)?.cards?.[card.cardId];
 let bp=null;
 try{
  const value=universalBp(pack,state,card);
  bp=Number.isFinite(value)?value:null;
 }catch{bp=null;}
 return {
  slot,uid:card.uid,ready:card.ready===true,
  name:printed?.name||null,cardId:typeof card.cardId==='string'?card.cardId:null,bp
 };
}
export function publicAttackDiagnostic(pack,state,actor,{action=null,route=null,search=null,fallback=null}={}){
 const legal=legalUniversalActions(pack,state);
 const fronts=[0,1].map(owner=>({
  owner,
  self:owner===actor,
  cards:(state?.players?.[owner]?.front||[]).map((card,index)=>frontCard(pack,state,owner,card,index+1))
 }));
 const lines=Array.isArray(search?.lines)?search.lines.map(line=>({
  type:line?.type==='attack'||line?.type==='next'?line.type:null,
  uid:typeof line?.uid==='string'?line.uid:null,
  search:roundScore(line?.search),
  boundary:typeof line?.boundary==='string'?line.boundary:null
 })).filter(line=>line.type):publicSearchLines(search);
 return {
  policy:route?.policy||search?.route?.policy||null,
  lane:route?.lane||search?.route?.lane||null,
  source:route?.source||search?.route?.source||null,
  actor,
  attacksThisTurn:state?.attacksThisTurn||0,
  fronts,
  attacks:legal.filter(item=>item.type==='attack'&&typeof item.uid==='string').map(item=>item.uid),
  next:legal.some(item=>item.type==='next'),
  chosen:{
   type:action?.type||null,
   uid:typeof action?.uid==='string'?action.uid:null
  },
  lines,
  nodes:Number.isFinite(search?.nodesUsed)?search.nodesUsed:null,
  ms:roundScore(search?.ms),
  reason:search?.reason||null,
  fallback:fallback||search?.fallbackKind||null
 };
}
export function formatAttackDiagnostic(row){
 const side=(entry)=>((entry?.self?'行動方':'對手')+' ')+
  ((entry?.cards||[]).filter(card=>card.uid).map(card=>
   '前線'+card.slot+' '+card.uid+' '+(card.ready?'ACTIVE':'REST')).join('、')||'前線空白');
 const lines=(row?.lines||[]).map(line=>
  (line.type==='attack'?'攻擊 '+(line.uid||''):'next')+' '+
  (line.search==null?'無分數':line.search)+
  (line.boundary?' '+line.boundary:'')).join('、');
 const chosen=row?.chosen?.type==='attack'?'攻擊 '+(row.chosen.uid||''):(row?.chosen?.type||'無');
 return '攻擊診斷：'+[row?.policy,row?.lane,row?.source].filter(Boolean).join('/')+
  ' · 選擇 '+chosen+
  ' · '+(row?.fronts||[]).map(side).join('；')+
  ' · 合法攻擊 '+((row?.attacks||[]).length?row.attacks.join('、'):'沒有')+
  (row?.next?' · 可結束攻擊':'')+
  (lines?' · '+lines:'')+
  ' · 節點 '+(row?.nodes??'—')+
  ' · '+(row?.ms==null?'—':row.ms+'ms')+
  (row?.reason?' · '+row.reason:'')+
  (row?.fallback?' · '+row.fallback:'');
}
