// Root information-set MCTS. Each iteration samples one belief world and
// rolls the selected root action through the same turn boundary machine
// with a width of one. It is a measured prototype, not the default policy.
import {scoreLine} from './beam.mjs';
import {mulberry32} from './belief.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function chooseIsmctsAction(pack,worlds,actor,legal,limits){
 const rows=legal.slice(0,8).map(action=>({action,n:0,w:0}));
 if(!rows.length)return {action:null,visits:0};
 const rng=mulberry32(limits.seed>>>0);
 let guard=0;
 const deadline=limits.deadline??Infinity;
 while(guard++<rows.length*3&&performance.now()<deadline){
  const total=rows.reduce((sum,row)=>sum+row.n,0);
  let pick=rows[0],best=-Infinity;
  for(const row of rows){
   const mean=row.n?row.w/row.n:0;
   const explore=row.n?Math.sqrt(Math.log(total+1)/row.n):1e6;
   const ucb=mean+1.2*explore;
   if(ucb>best){best=ucb;pick=row;}
  }
  const world=worlds[rng()%worlds.length];
  const line=scoreLine(pack,world.state,actor,pick.action,{
   nodes:Math.max(8,Math.floor((limits.nodes||48)/rows.length)),
   beam:1,
   deadline,
   actorDecisions:limits.actorDecisions??2,
   opponentDecisions:limits.opponentDecisions??2
  });
  if(!line||!Number.isFinite(line.search))continue;
  pick.n++;
  pick.w+=line.search;
 }
 rows.sort((a,b)=>(b.n?b.w/b.n:-Infinity)-(a.n?a.w/a.n:-Infinity)||
  (JSON.stringify(a.action)<JSON.stringify(b.action)?-1:1));
 const matched=legal.find(action=>same(action,rows[0].action))||null;
 return {action:matched,visits:rows.reduce((sum,row)=>sum+row.n,0)};
}
