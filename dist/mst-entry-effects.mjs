// Isolated UA54BT effect-state reducer; not yet registered as a production match plugin.
// The caller owns action selection, turn timing and state conservation.
import {UA54BT_VERIFIED} from './mushoku-tensei.mjs';
const BY_ID=Object.fromEntries(UA54BT_VERIFIED.map(c=>[c.id,c]));
const clone=s=>structuredClone(s);
const owner=(s,p)=>s.players[p];
const draw=(s,p)=>{const top=owner(s,p).deck.shift();if(top)owner(s,p).hand.push(top);return top||null;};
function choices(s,p,kind,options,metadata={}){s.pendingMst={player:p,kind,options,...metadata};}
const characters=(s,p)=>[...owner(s,p).front,...owner(s,p).energy].filter(c=>c&&BY_ID[c.cardId]?.type==='character');
export function mstEnter(source,{player,cardId,uid,generatedEnergy=0}){
 if(source.pendingMst)throw new Error('必須先結算上一效果');
 if(player!==0&&player!==1)throw new Error('不合法的玩家');
 const s=clone(source),pl=owner(s,player);
 switch(cardId){
 case 'MST-1-051': // Roxy — draw and discard
 case 'MST-1-075': // Labyrinth city field — draw and discard
 case 'MST-1-022': // Rudeus — draw and discard
  draw(s,player);
  if(pl.hand.length)choices(s,player,'discard',pl.hand.map(c=>c.uid),{cardId});
  break;
 case 'MST-1-063': // Norn — if own generated energy >= 7
  if(generatedEnergy>=7)draw(s,player);
  break;
 case 'MST-1-061':{ // Nanahoshi — optional own other +1000 BP
  const legal=characters(s,player).filter(c=>c.uid!==uid).map(c=>c.uid);
  if(legal.length)choices(s,player,'buff',legal,{cardId,amount:1000,turn:s.turn});
  break;
 }
 case 'MST-1-069':
  if(pl.deck.length)choices(s,player,'peek',['top','outside'],{cardId,topUid:pl.deck[0].uid});
  break;
 default:throw new Error('尚未實作此卡登場效果：'+cardId);
 }
 return s;
}
export function mstChoose(source,{player,selection=null}){
 if(!source.pendingMst||source.pendingMst.player!==player)throw new Error('沒有合法待選效果');
 const s=clone(source),q=s.pendingMst,pl=owner(s,player);
 if(selection!==null&&!q.options.includes(selection))throw new Error('不合法的目標');
 if(selection===null&&q.kind!=='buff')throw new Error('必須選擇目標');
 if(q.kind==='discard'){
  const i=pl.hand.findIndex(c=>c.uid===selection);
  if(i<0)throw new Error('指定手牌不存在');
  pl.outside.push(pl.hand.splice(i,1)[0]);
 }else if(q.kind==='buff'){
  if(selection!==null){
   const c=characters(s,player).find(c=>c.uid===selection);
   if(!c)throw new Error('選擇目標不在己方場上');
   c.buffs??=[];
   c.buffs.push({turn:q.turn,bp:q.amount,source:q.cardId});
  }
 }else if(q.kind==='peek'){
  if(pl.deck[0]?.uid!==q.topUid)throw new Error('選擇期間牌頂已改變');
  if(selection==='outside')pl.outside.push(pl.deck.shift());
 }else throw new Error('不支援的效果選擇');
 s.pendingMst=null;
 return s;
}
export function mstFieldRetire(source,{player,cardId}){
 if(cardId!=='MST-1-075')throw new Error('無已實作的退場效果：'+cardId);
 const s=clone(source);draw(s,player);return s;
}
