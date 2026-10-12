// Isolated UA54BT event-effect state transitions (NOT yet connected to production match engine).
import {UA54BT_VERIFIED} from './mushoku-tensei.mjs';
const byId=Object.fromEntries(UA54BT_VERIFIED.map(c=>[c.id,c]));
const clone=s=>structuredClone(s);
const own=(s,p)=>s.players[p];
const draw=(s,p,n)=>{let actual=0;for(let i=0;i<n;i++){const top=own(s,p).deck.shift();if(!top)break;own(s,p).hand.push(top);actual++;}return actual;};
const names=card=>[byId[card.cardId]?.nameJa,...(byId[card.cardId]?.aliasesNames||[])].filter(Boolean);
const includesName=(s,p,name)=>[...own(s,p).front,...own(s,p).energy].some(c=>c&&names(c).includes(name));
const CHARACTER_NAMES=['ルーデウス','エリス','ルイジェルド'];
export function mstEventOptions(state,{player,cardId}){
 if(cardId==='MST-1-035')return CHARACTER_NAMES.filter(n=>includesName(state,player,n));
 if(cardId==='MST-1-080')return own(state,player).front.filter(c=>c&&byId[c.cardId]?.traits?.includes('ラノア魔法大学')).map(c=>c.uid);
 throw new Error('事件卡效果尚未實作：'+cardId);
}
export function mstApplyEvent(state,{player,cardId,choices=[]}){
 if(![0,1].includes(player))throw new Error('玩家不存在');
 if(state.pendingMst)throw new Error('必須先結算上一效果');
 if(!Array.isArray(choices)||new Set(choices).size!==choices.length)throw new Error('重複效果選擇');
 const valid=mstEventOptions(state,{player,cardId});
 if(choices.some(x=>!valid.includes(x)))throw new Error('不可選擇不存在的目標');
 if(cardId==='MST-1-080'&&choices.length>1)throw new Error('最多指定一張角色');
 const next=clone(state);
 if(cardId==='MST-1-035'){
  draw(next,player,choices.length); // selected each named condition once
 }else if(cardId==='MST-1-080'){
  draw(next,player,2);
  if(choices.length){
   const target=own(next,player).front.find(c=>c?.uid===choices[0]);
   if(!target)throw new Error('前線目標不存在');
   target.frontEnergyTurn=state.turn;
  }
 }
 return next;
}
