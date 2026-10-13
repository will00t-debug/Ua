// Public-board tactical approximation. No hand/deck/life card identities are read.
// Unknown triggers and complex on-attack/on-block chains are NOT predicted.
import {cardOf,bp,locate,damageOf,impactOf} from './engine.mjs';
const muted=(s,c)=>!!(c.silencedUntilSource&&s.players[c.silencedUntilSource.p].turnCount<c.silencedUntilSource.turnCount);
function piece(s,c){
 const d=cardOf(c),r=muted(s,c)?{}:d.rules||{};
 return {id:c.uid,power:bp(s,c),damage:damageOf(s,c),impact:impactOf(s,c),
  value:1.5+bp(s,c)/1100+(c.stack?.length?1:0),
  nullImpact:!!r.impactNull,forced:!!r.forcedBlock||c.forcedBlockTurn===s.turn,
  low:r.noBlockBelow|| (c.noBlockBelowTurn===s.turn?3000:-1),
  high:c.noBlockHighTurn===s.turn?Math.min(4000,c.noBlockHighThreshold||4000):Infinity,
  blocks:!muted(s,c)&&d.doubleBlock&&c.blockTurn!==s.turn?2:1,
  swings:(r.doubleAttack||c.doubleAttackTurn===s.turn)&&c.attackTurn!==s.turn?2:1};
}
function allowed(a,b){return b.power>a.low&&b.power<a.high;}
function pressure(initial,life){return life<=0?1000: (initial-life)*4 + (life<=2?(3-life)*5:0);}
// Three attacks, alternating best attack / best legal defence; memoized per decision.
export function combatPlan(s,{attackUid=null,blockChoices=null}={}) {
 const p=s.active,enemy=s.players[1-p];
 const attackers=s.players[p].front.filter(c=>c&&c.ready&&!muted(s,c)).map(c=>piece(s,c));
 const defenders=enemy.front.filter(c=>c&&c.ready&&!muted(s,c)).map(c=>piece(s,c));
 const initial=enemy.life.length,cache=new Map();
 function outcome(a,b,as,bs,life,depth){
  let damage=a.damage,lost=0,nextBs=bs;
  if(b){
   const dies=a.power>=b.power;
   damage=dies&&!b.nullImpact?a.impact:0;
   lost=dies?b.value*0.85:0;
   nextBs=bs.flatMap(x=>x.id!==b.id?[x]:!dies&&x.blocks>1?[{...x,blocks:x.blocks-1}]:[]);
  }
  return lost+search(as,nextBs,Math.max(0,life-damage),depth);
 }
 function defence(a,as,bs,life,depth,choices=null){
  const legal=bs.filter(b=>allowed(a,b));
  const forced=legal.filter(b=>b.forced);
  let opts=forced.length?forced:[null,...legal];
  if(choices)opts=opts.filter(b=>choices.includes(b?.id||'pass'));
  let best=Infinity,id='pass';
  for(const b of opts){const v=outcome(a,b,as,bs,life,depth);if(v<best){best=v;id=b?.id||'pass';}}
  return {score:best,id};
 }
 function search(as,bs,life,depth){
  if(!life||!depth||!as.length)return pressure(initial,life);
  const key=JSON.stringify([as.map(a=>[a.id,a.swings]),bs.map(b=>[b.id,b.blocks]),life,depth]);
  if(cache.has(key))return cache.get(key);
  let best=pressure(initial,life);
  for(const a of as){
   const rest=as.flatMap(x=>x.id!==a.id?[x]:x.swings>1?[{...x,swings:x.swings-1}]:[]);
   best=Math.max(best,defence(a,rest,bs,life,depth-1).score);
  }
  cache.set(key,best);return best;
 }
 if(attackUid){
  const c=locate(s,attackUid)?.card;if(!c)return null;
  const a=piece(s,c);
  // A pending attack is already spent; ready copies represent a remaining double attack.
  return defence(a,attackers,defenders,initial,2,blockChoices);
 }
 let best=null;
 for(const a of attackers){
  const rest=attackers.flatMap(x=>x.id!==a.id?[x]:x.swings>1?[{...x,swings:x.swings-1}]:[]);
  const score=defence(a,rest,defenders,initial,2).score;
  if(!best||score>best.score)best={uid:a.id,score};
 }
 return best;
}
