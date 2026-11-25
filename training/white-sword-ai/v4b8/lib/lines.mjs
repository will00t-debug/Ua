// A few screen slots are reserved for same-card line choices.
// Each direction keeps its own quota. An empty direction is not backfilled.
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {selectBalanced} from '../../v4b2/lib/balance.mjs';
import {LINE_PER_DIRECTION,PER_CELL,SCREEN_CAP} from './protocol.mjs';

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function lineDirection(position){
 const left=parsed(position?.actionA?.key);
 const right=parsed(position?.actionB?.key);
 const cardA=cardsOf(position?.actionA?.features).join(',');
 const cardB=cardsOf(position?.actionB?.features).join(',');
 if(left.type!=='play'||right.type!=='play'||!cardA||cardA!==cardB)return null;
 if(left.line==='front'&&right.line==='energy')return 'front-kept';
 if(left.line==='energy'&&right.line==='front')return 'energy-kept';
 return null;
}
function takeDirection(rows,count){
 const ordered=rows.slice().sort((left,right)=>String(left.opponent).localeCompare(String(right.opponent))||left.step-right.step||(left.id<right.id?-1:1));
 const chosen=[];
 const seen=new Set();
 for(const row of ordered){
  if(chosen.length>=count||seen.has(row.opponent))continue;
  seen.add(row.opponent);
  chosen.push(row);
 }
 for(const row of ordered){
  if(chosen.length>=count)break;
  if(chosen.some(item=>item.id===row.id))continue;
  chosen.push(row);
 }
 return chosen;
}
export function selectLineQuota(positions,{perDirection=LINE_PER_DIRECTION}={}){
 const groups={'front-kept':[],'energy-kept':[]};
 for(const position of positions||[]){
  const direction=lineDirection(position);
  if(direction)groups[direction].push(position);
 }
 const chosen=[];
 for(const direction of ['front-kept','energy-kept']){
  for(const row of takeDirection(groups[direction],perDirection))chosen.push({position:row,direction});
 }
 return {chosen,available:{'front-kept':groups['front-kept'].length,'energy-kept':groups['energy-kept'].length}};
}
export function selectScreen(positions,{cap=SCREEN_CAP,perCell=PER_CELL,perDirection=LINE_PER_DIRECTION}={}){
 const lines=selectLineQuota(positions,{perDirection});
 const used=new Set(lines.chosen.map(row=>row.position.id));
 const rest=selectBalanced((positions||[]).filter(position=>!used.has(position.id)),{perCell}).chosen;
 const chosen=lines.chosen.map(row=>row.position);
 for(const position of rest){
  if(chosen.length>=cap)break;
  if(used.has(position.id))continue;
  chosen.push(position);
  used.add(position.id);
 }
 return {chosen:chosen.slice(0,cap),lines:lines.chosen,available:lines.available};
}
