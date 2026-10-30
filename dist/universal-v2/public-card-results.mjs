// Publish only results that became public under the V2 rules. Never send
// a private TOP-N inspection window, a generic draw, or hidden hand/deck data.
// Read from reducer state, not client labels. This module stays inside dist
// so the browser preview can load it; static hosting does not serve /server.
const PUBLIC_DESTINATIONS=new Set(['outside','removed']);
const EXPLICIT_REVEALS=new Map([
 ['searched-to-hand',{label:'公開加入手牌',destination:'hand'}],
 ['revealed-window',{label:'公開查看',destination:'reveal'}],
 ['revealed-top',{label:'公開牌庫頂',destination:'reveal'}],
 ['deck-top',{label:'公開牌庫頂',destination:'reveal'}],
 ['hand-bottom',{label:'公開手牌',destination:'reveal'}],
 ['hand-to-bottom',{label:'公開手牌',destination:'reveal'}],
 ['revealed-energy',{label:'公開牌庫頂',destination:'reveal'}]
]);
function validCard(owner,cardId){
 return [0,1].includes(owner)&&typeof cardId==='string'&&cardId.length>0&&cardId.length<=80;
}
function eventCounts(events){
 const counts=new Map();
 for(const e of events||[]){
  if(!e||!validCard(e.owner,e.cardId)||typeof e.uid!=='string')continue;
  const key=[e.owner,e.uid,e.cardId,e.kind||'life',e.turn].join('|');
  counts.set(key,(counts.get(key)||0)+1);
 }
 return counts;
}
function newReveals(before,after){
 const previous=eventCounts(before?.publicReveals);
 const next=[];
 for(const event of after?.publicReveals||[]){
  if(!event||!validCard(event.owner,event.cardId)||typeof event.uid!=='string')continue;
  const key=[event.owner,event.uid,event.cardId,event.kind||'life',event.turn].join('|');
  const count=previous.get(key)||0;
  if(count>0){previous.set(key,count-1);continue;}
  const info=EXPLICIT_REVEALS.get(event.kind);
  if(info)next.push({owner:event.owner,uid:event.uid,cardId:event.cardId,
   kind:info.destination,label:info.label});
 }
 return next;
}
export function publicCardResults(before,after,action){
 if(!before||!after||!Array.isArray(after.players))return [];
 const results=newReveals(before,after);
 // The move ledger is private and must never be serialized. Only a card
 // already moved into an open/public zone may be exposed here.
 const maxBefore=Math.max(0,...(before.zoneMoveEvents||[])
  .filter(e=>Number.isInteger(e?.order)).map(e=>e.order));
 for(const move of after.zoneMoveEvents||[]){
  if(!move||!Number.isInteger(move.order)||move.order<=maxBefore||
   !PUBLIC_DESTINATIONS.has(move.to)||!validCard(move.owner,move.cardId))continue;
  results.push({owner:move.owner,uid:move.uid,cardId:move.cardId,
   kind:move.to,label:move.to==='outside'?'送至場外':'送至移除區'});
 }
 // A genuine full-deck search requires the selected matching card to be
 // shown before hand entry. Private peek, ordinary draw and TOP-N rearrange
 // do NOT enter this branch. A real physical move must have completed.
 const q=before.pending;
 if(['effect-search-deck','effect-search-deck-multi'].includes(q?.kind)&&
  ['chooseDeckSearch','chooseDeckSearchMulti'].includes(action?.type)&&
  typeof action.uid==='string'&&q.choices?.includes(action.uid)&&
  (q.player===0||q.player===1)){
  const source=before.players[q.player]?.deck?.find(c=>c.uid===action.uid);
  const found=after.players[q.player]?.hand?.some(c=>c.uid===action.uid);
  if(source&&found&&validCard(q.player,source.cardId))
   results.push({owner:q.player,uid:action.uid,cardId:source.cardId,
    kind:'hand',label:'檢索公開加入手牌'});
 }
 // Public zone arrays are also authoritative: a title may move an eligible
 // card straight into a public destination. Detect exact newly visible
 // physical UIDs even when it has no standalone move ledger entry.
 for(const owner of [0,1])for(const kind of PUBLIC_DESTINATIONS){
  const seen=new Set((before.players?.[owner]?.[kind]||[]).map(card=>card?.uid));
  for(const card of after.players?.[owner]?.[kind]||[]){
   if(!card||seen.has(card.uid)||!validCard(owner,card.cardId)||
    typeof card.uid!=='string')continue;
   results.push({owner,uid:card.uid,cardId:card.cardId,kind,
    label:kind==='outside'?'送至場外':'送至移除區'});
  }
 }
 // De-duplicate the SAME physical result, not two copies of an identical
 // printed card. Strip internal UIDs before sending the public log.
 const unique=new Set();
 return results.filter(card=>{
  const key=[card.owner,card.uid,card.kind].join('|');
  if(unique.has(key))return false;
  unique.add(key);return true;
 }).slice(0,50).map(({uid,...publicCard})=>publicCard);
}
