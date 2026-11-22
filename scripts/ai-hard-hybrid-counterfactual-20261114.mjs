// Audit same deck scenarios with an alternative legal block at LIFE <=1.
// A counterfactual is measured only through the end of the CURRENT attack turn.
// It does not assume a block wins the game and does not alter a real AI.
import {writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalBp,universalImpact,universalImpactNull,universalAttackDamage} from '../dist/universal-v2/engine.mjs';

const deck=battleDecks().find(x=>x.id==='white-sword');
if(!deck)throw Error('White sword deck missing');
const shard=Number(process.env.SHARD||0);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const current=s=>s.pending?.player??s.active;
const publicBp=(packs,s,c)=>{try{return universalBp(packs,s,c)||0;}catch{return 0;}};
const value=(fn,fallback=0)=>{try{const x=fn();return Number.isFinite(x)?x:fallback;}catch{return fallback;}};
function chooser(packs,s,hybridSeat,steps){
 const actor=current(s),legal=legalUniversalActions(packs,s);
 let action=null,reason=null;
 if(actor===hybridSeat){
  const requestId=steps+1,stateVersion=steps+1;
  const req=buildAiV3Request(packs,s,actor,{requestId,stateVersion,seed:1,
   nodes:MATCH_LIMITS.nodes,ms:MATCH_LIMITS.ms,policy:HYBRID_START_HARD_POLICY});
  const handled=req?handleAiV3Request(req):null;
  const accepted=acceptAiV3Result({requestId,stateVersion,actor,legal},handled);
  if(accepted.ok)action=accepted.action;
  else reason='hybrid-fallback';
 }else reason='hard';
 if(!action)action=chooseProgressSafeAiAction(packs,s,{difficulty:'hard'}).action;
 const exact=legal.find(a=>same(a,action));
 if(!exact)throw Error('Illegal chooser');
 return {actor,legal,action:exact,reason};
}
function untilAttackTurnEnds(packs,starting,hybridSeat,initialAction){
 // Compare each alternative from the exact same starting state and remaining hidden card order.
 const turn=starting.turn;
 let s=dispatchUniversalAction(packs,structuredClone(starting),initialAction,{actor:current(starting)});
 let moves=1,error=null;
 try{
  while(s.status==='playing'&&s.turn===turn&&moves<90){
   const next=chooser(packs,s,hybridSeat,moves);
   s=dispatchUniversalAction(packs,s,next.action,{actor:next.actor});
   moves++;
  }
 }catch(e){error=e?.message||String(e);}
 return {life:s.players[hybridSeat].life.length,
  finished:s.status==='finished',winner:s.winner,turnChanged:s.turn!==turn,
  moves,limit:moves>=90,error,endReason:s.endReason||null};
}
const rows=[],errors=[];
for(let i=0;i<20;i++){
 if(i%4!==shard)continue;
 const seed=9200+i;
 for(const hybridSeat of [0,1])for(const first of [0,1]){
  const packs=[deck.pack,deck.pack];
  let s=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],seed,first)).state;
  let steps=0,marked=0;
  try{
   while(s.status==='playing'&&steps<1200){
    const picked=chooser(packs,s,hybridSeat,steps);
    const actor=picked.actor;
    if(actor===hybridSeat&&s.pending?.kind==='block'&&picked.action.type==='chooseBlock'
      &&picked.action.uid==null&&s.players[actor].life.length<=1){
     marked++;
     const attackerUid=s.pending.attackerUid;
     const attacker=s.players[1-actor].front.find(c=>c?.uid===attackerUid)||null;
     const atBp=publicBp(packs,s,attacker);
     const impact=value(()=>universalImpact(packs,s,attacker),0);
     const attackDamage=value(()=>universalAttackDamage(packs,s,attacker),1);
     const blockers=picked.legal.filter(a=>a.type==='chooseBlock'&&a.uid!=null);
     const pass=untilAttackTurnEnds(packs,s,hybridSeat,picked.action);
     const counter=blockers.map(a=>{
      const body=s.players[actor].front.find(c=>c?.uid===a.uid)||null;
      const post=untilAttackTurnEnds(packs,s,hybridSeat,a);
      return {bp:publicBp(packs,s,body),impactNull:!!universalImpactNull(packs,s,body),
       lifeAfter:post.life,finished:post.finished,winner:post.winner,
       turnChanged:post.turnChanged,moves:post.moves,limit:post.limit,error:post.error};
     });
     const saved=pass.life===0&&counter.some(a=>a.life>0&&a.turnChanged&&!a.error);
     rows.push({seed,first,hybridSeat,step:steps,lifeBefore:s.players[actor].life.length,
      attackerBp:atBp,impact,attackDamage,blockers:counter,
      passLife:pass.life,passLost:pass.life===0,
      passTurnChanged:pass.turnChanged,passError:pass.error,
      savedToNextTurn:saved});
     console.log('COUNTER '+JSON.stringify({seed,first,hybridSeat,step:steps,
      attackerBp:atBp,impact,attackDamage,passLife:pass.life,
      bestBlockLife:Math.max(0,...counter.map(x=>x.life)),saved}));
    }
    s=dispatchUniversalAction(packs,s,picked.action,{actor:picked.actor});
    steps++;
   }
  }catch(e){errors.push({seed,first,hybridSeat,steps,message:e?.message||String(e)});}
  console.log('GAME_DONE '+JSON.stringify({seed,first,hybridSeat,steps,marked,
   finished:s.status==='finished',winner:s.winner}));
 }
}
const saved=rows.filter(x=>x.savedToNextTurn);
const result={head:process.env.GITHUB_SHA,shard,investigated:rows.length,
 savedToNextTurn:saved.length,reportedWins:saved.map(({seed,first,hybridSeat,step,passLife,blockers})=>({
  seed,first,hybridSeat,step,passLife,blockers})),rows,errors};
writeFileSync('ai-counterfactual-shard-'+shard+'.json',JSON.stringify(result,null,2));
console.log('SUMMARY='+JSON.stringify({shard,investigated:rows.length,savedToNextTurn:saved.length,
 errors:errors.length,rows:rows.map(({seed,first,hybridSeat,savedToNextTurn})=>({
  seed,first,hybridSeat,savedToNextTurn}))}));
if(errors.length)process.exitCode=1;
