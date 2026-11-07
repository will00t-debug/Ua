// Match-level split used by learned-v4 training on PR #294.
// The last match is held out. Win/loss labels are accepted only by the
// future value trainer and are not read by the search prior.
export function holdoutLastMatch(rows){
 const order=[];
 const by=new Map();
 for(const row of Array.isArray(rows)?rows:[]){
  const matchId=typeof row?.matchId==='string'?row.matchId:'match';
  if(!by.has(matchId)){by.set(matchId,[]);order.push(matchId);}
  by.get(matchId).push(row);
 }
 if(order.length<2)return {train:[...by.values()].flat(),held:[],split:'none',heldMatch:null};
 const heldMatch=order[order.length-1];
 return {
  train:order.filter(id=>id!==heldMatch).flatMap(id=>by.get(id)),
  held:by.get(heldMatch),
  split:'match',
  heldMatch
 };
}
export function valueLabel(row){
 if(!row||row.record!=='result')return null;
 if(row.winner!==0&&row.winner!==1)return null;
 if(row.seat!==0&&row.seat!==1)return null;
 if(row.leak===true)return null;
 return row.winner===row.seat?1:0;
}
