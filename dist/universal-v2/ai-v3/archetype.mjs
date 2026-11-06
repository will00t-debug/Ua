// Printed-card hypotheses. These are not the opponent's registered list.
import {packOf,viewerCard} from './observation.mjs';

const TRIGGERS=new Set(['final','color','special']);
const cache=new WeakMap();

function emptyTriggers(){return {final:0,color:0,special:0};}
function canTake(counts,triggers,total,card,n){
 const have=counts[card.id]||0;
 const limit=Number.isInteger(card.maxCopies)?card.maxCopies:4;
 if(n<1||have+n>limit||total+n>50)return false;
 if(TRIGGERS.has(card.trigger)&&triggers[card.trigger]+n>4)return false;
 return true;
}
function add(counts,triggers,total,card,n){
 if(!canTake(counts,triggers,total,card,n))return total;
 counts[card.id]=(counts[card.id]||0)+n;
 if(TRIGGERS.has(card.trigger))triggers[card.trigger]+=n;
 return total+n;
}
function fill(pack,scoreOf){
 const cards=Object.values(pack.cards);
 const counts={};
 const triggers=emptyTriggers();
 let total=0;
 const ranked=[...cards].sort((a,b)=>scoreOf(b)-scoreOf(a)||String(a.id).localeCompare(String(b.id)));
 for(const card of ranked){
  if(total>=50)break;
  const want=scoreOf(card);
  if(want<=0)continue;
  total=add(counts,triggers,total,card,Math.min(want,50-total));
 }
 let guard=0;
 const filler=[...cards].sort((a,b)=>(a.energy||0)-(b.energy||0)||String(a.id).localeCompare(String(b.id)));
 while(total<50&&guard++<80){
  let moved=false;
  for(const card of filler){
   const next=add(counts,triggers,total,card,1);
   if(next!==total){total=next;moved=true;if(total>=50)break;}
  }
  if(!moved)break;
 }
 return counts;
}
export function archetypeCatalog(pack){
 const found=cache.get(pack);
 if(found)return found;
 const builds=[
  {id:'curve',counts:fill(pack,card=>card.type==='character'&&(card.gen||0)>0&&(card.energy||0)<=2?4:card.type==='character'?1:0)},
  {id:'raid',counts:fill(pack,card=>card.raidName?4:(card.type==='character'&&(card.bp||0)>=3000?2:0))},
  {id:'removal',counts:fill(pack,card=>card.type==='event'?3:card.type==='character'?1:0)}
 ];
 cache.set(pack,builds);
 return builds;
}
export function archetypeIds(pack,index,seenCounts,slots){
 const builds=archetypeCatalog(pack);
 const chosen=builds[index%builds.length];
 const counts={...chosen.counts};
 for(const [id,n] of Object.entries(seenCounts||{})){
  if(counts[id])counts[id]=Math.max(0,counts[id]-n);
 }
 const ids=[];
 const order=Object.keys(counts).sort();
 while(ids.length<slots){
  let added=false;
  for(const id of order){
   if(ids.length>=slots)break;
   if(!counts[id])continue;
   counts[id]--;
   ids.push(id);
   added=true;
  }
  if(!added)break;
 }
 if(ids.length<slots){
  const vanilla=Object.values(pack.cards).filter(card=>card&&!card.trigger).map(card=>card.id).sort();
  let guard=0;
  while(ids.length<slots&&vanilla.length&&guard++<slots){
   ids.push(vanilla[ids.length%vanilla.length]);
  }
 }
 return ids.length===slots?{id:chosen.id,ids}:null;
}
function squash(value){return String(value||'').replace(/\s+/g,'');}
export function archetypeRank(pack,state,viewer,action){
 let score=0;
 if(action.type==='raid')score+=18;
 else if(action.type==='attack')score+=16;
 else if(action.type==='play'&&action.line==='energy')score+=14;
 else if(action.type==='play'&&action.line==='front')score+=11;
 else if(action.type==='activate'||action.type==='event'||action.type==='handActivate')score+=10;
 else if(action.type==='next')score+=3;
 else if(action.mode==='skip'||action.mode==='decline'||action.uid==null)score+=2;
 else score+=4;
 const card=viewerCard(state,viewer,action.uid);
 const printed=card?packOf(pack,viewer).cards[card.cardId]:null;
 if((action.type==='raid'||action.type==='play'||action.type==='event')&&printed?.raidName){
  const need=squash(printed.raidName);
  const mine=state.players[viewer];
  for(const line of ['front','energy'])for(const body of mine[line]||[]){
   if(!body)continue;
   const name=squash(packOf(pack,viewer).cards[body.cardId]?.name);
   if(name&&name===need)score+=8;
  }
 }
 if(action.type==='raid'&&action.baseUid){
  const base=viewerCard(state,viewer,action.baseUid);
  const basePrint=base?packOf(pack,viewer).cards[base.cardId]:null;
  if((basePrint?.energy||0)>=4)score+=3;
 }
 return score;
}
// An energy play whose printed on-play opens another window spends the first
// slice inside that window. A same-rank energy play with no on-play can settle
// in that slice. This is only a tie-break: it does not outrank a raid, an
// attack, or a pass the search has already scored higher, and it does not
// prefer the front. A finished on-play line can still win on its score.
export function entryNoise(pack,state,viewer,action){
 if(action?.type!=='play'||action?.line!=='energy')return 0;
 const card=viewerCard(state,viewer,action.uid);
 const printed=card?packOf(pack,viewer).cards[card.cardId]:null;
 const onPlay=printed?.effects?.onPlay;
 return Array.isArray(onPlay)&&onPlay.length?1:0;
}
export function actionGroup(state,viewer,action){
 const card=viewerCard(state,viewer,action.uid);
 return [action.type||'',action.mode||'',action.line||'',card?.cardId||''].join('|');
}
