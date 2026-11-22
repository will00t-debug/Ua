// Read-only diagnostic playout: live Hard vs new Hybrid, with matched 50-card decks.
// This is a NEW clock-sensitive replay. It cannot reconstruct the earlier 80 exact actions.
// Signals are hypotheses, not proof of a tactical error.
import {writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalBp,universalEnergyByColor,universalAttackDamage} from '../dist/universal-v2/engine.mjs';

const deck=battleDecks().find(x=>x.id==='white-sword');
if(!deck)throw Error('No white-sword deck');
const shard=Number(process.env.SHARD||0);
const count=20, maxSteps=1200;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const names={
 'beater-energy':'4000 BP into energy with same card front option',
 'missed-raid':'left MAIN while legal raid was available',
 'empty-front-pass':'left MAIN with empty front and legal front play',
 'empty-lane-pass':'left ATTACK despite legal attack and empty opponent front',
 'lethal-no-block':'declined a legal block with own LIFE 1 or less',
 'early-extra-draw':'used AP extra draw on own first four turns',
 'low-front-four':'no 4000 BP front after own turn 4'
};
const actorOf=s=>s.pending?.player??s.active;
function bp(packs,s,c){if(!c)return 0;try{return universalBp(packs,s,c)||0;}catch{return 0;}}
function card(packs,s,actor,uid){
 const pl=s.players[actor];
 const obj=[...(pl.hand||[]),...(pl.front||[]),...(pl.energy||[])].find(x=>x?.uid===uid);
 return obj?packs[actor].cards[obj.cardId]:null;
}
function board(packs,s,actor){
 const a=s.players[actor],b=s.players[1-actor];
 const frontOf=p=>(p.front||[]).filter(Boolean).map(c=>({bp:bp(packs,s,c),ready:c.ready===true}));
 return {phase:s.phase,turn:s.turn,life:a.life.length,enemyLife:b.life.length,
  ap:(a.apCards||[]).filter(c=>c?.ready).length,energy:universalEnergyByColor(packs,s,actor),
  ownFront:frontOf(a),opponentFront:frontOf(b)};
}
function notices(packs,s,actor,chosen,legal,ownTurn) {
 const out=[];
 const own=s.players[actor],enemy=s.players[1-actor];
 if(!s.pending&&s.phase==='main'){
  if(chosen?.type==='play'&&chosen.line==='energy'){
   const c=card(packs,s,actor,chosen.uid);
   const hasFrontChoice=legal.some(a=>a.uid===chosen.uid&&a.type==='play'&&a.line==='front');
   const hasBeater=(own.front||[]).some(c=>c&&bp(packs,s,c)>=4000);
   if(hasFrontChoice&&c?.bp>=4000&&!hasBeater)out.push('beater-energy');
  }
  if(chosen?.type==='next'){
   if(legal.some(a=>a.type==='raid'))out.push('missed-raid');
   if(!(own.front||[]).some(Boolean)&&legal.some(a=>a.type==='play'&&a.line==='front'))out.push('empty-front-pass');
  }
 }
 if(!s.pending&&s.phase==='attack'&&chosen?.type==='next'&&
   !(enemy.front||[]).some(Boolean)&&legal.some(a=>a.type==='attack'))out.push('empty-lane-pass');
 if(s.pending?.kind==='block'&&chosen?.type==='chooseBlock'&&chosen.uid==null
   &&own.life.length<=1&&legal.some(a=>a.type==='chooseBlock'&&a.uid))out.push('lethal-no-block');
 if(!s.pending&&s.phase==='start'&&chosen?.type==='extraDraw'&&ownTurn<=4)out.push('early-extra-draw');
 return out;
}
const rows=[];
for(let i=0;i<count;i++){
 if(i%4!==shard)continue;
 const seed=9200+i;
 for(const hybridSeat of [0,1])for(const first of [0,1]){
  const packs=[deck.pack,deck.pack];
  let s=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],seed,first)).state;
  let steps=0,errors=0,fallbacks=0,ownTurn=0,turnOpen=false,turn4=null,first4000=null;
  const phaseKeys=['',''],phaseCounts=[0,0],signals={},examples=[],stats={
   playsEnergy:0,playsFront:0,raids:0,attacks:0,blocks:0,passBlocks:0,extraDraw:0,
   hardPlaysFront:0,hardAttacks:0,hybridActions:0,hardActions:0
  };
  while(s.status==='playing'&&steps<maxSteps){
   const actor=actorOf(s),isHybrid=actor===hybridSeat;
   if(isHybrid&&!s.pending&&s.phase==='start'&&!turnOpen){ownTurn++;turnOpen=true;}
   const key=String(s.turn)+'|'+s.active+'|'+s.phase;
   if(phaseKeys[actor]!==key){phaseKeys[actor]=key;phaseCounts[actor]=0;}
   const legal=legalUniversalActions(packs,s);
   let chosen=null;
   if(isHybrid){
    const requestId=steps+1,stateVersion=steps+1;
    const request=buildAiV3Request(packs,s,actor,{requestId,stateVersion,seed:1,
      nodes:MATCH_LIMITS.nodes,ms:MATCH_LIMITS.ms,policy:HYBRID_START_HARD_POLICY});
    const result=request?handleAiV3Request(request):null;
    const acceptance=acceptAiV3Result({requestId,stateVersion,actor,legal},result);
    if(acceptance.ok)chosen=acceptance.action;
    else{fallbacks++;chosen=chooseProgressSafeAiAction(packs,s,{
      difficulty:'hard',actionsInPhase:phaseCounts[actor]}).action;}
   } else chosen=chooseProgressSafeAiAction(packs,s,{
      difficulty:'hard',actionsInPhase:phaseCounts[actor]}).action;
   const exact=legal.find(a=>same(a,chosen));
   if(!exact){errors++;break;}
   if(isHybrid){
    stats.hybridActions++;
    const keys=notices(packs,s,actor,exact,legal,ownTurn);
    for(const flag of keys){
     signals[flag]=(signals[flag]||0)+1;
     if(examples.length<15)examples.push({flag,step:steps,ownTurn,...board(packs,s,actor),
       action:{type:exact.type,line:exact.line||null,mode:exact.mode||null,
         cardId:exact.uid?card(packs,s,actor,exact.uid)?.id||null:null},
       legalRaidCount:legal.filter(a=>a.type==='raid').length,
       legalAttackCount:legal.filter(a=>a.type==='attack').length});
    }
    if(exact.type==='play'&&exact.line==='energy')stats.playsEnergy++;
    if(exact.type==='play'&&exact.line==='front')stats.playsFront++;
    if(exact.type==='raid')stats.raids++;
    if(exact.type==='attack')stats.attacks++;
    if(exact.type==='chooseBlock'){if(exact.uid)stats.blocks++;else stats.passBlocks++;}
    if(exact.type==='extraDraw')stats.extraDraw++;
   } else {
    stats.hardActions++;
    if(exact.type==='play'&&exact.line==='front')stats.hardPlaysFront++;
    if(exact.type==='attack')stats.hardAttacks++;
   }
   try{s=dispatchUniversalAction(packs,s,exact,{actor});}
   catch(e){console.error('DISPATCH_ERROR',e.message);errors++;break;}
   if(isHybrid){
    const alive=s.players[actor].front.filter(Boolean);
    if(first4000===null&&alive.some(c=>bp(packs,s,c)>=4000))first4000=ownTurn;
    if(turnOpen&&(s.status!=='playing'||actorOf(s)!==actor)){
     if(ownTurn===4){
      const b=board(packs,s,hybridSeat);
      turn4={life:b.life,enemyLife:b.enemyLife,front4000:b.ownFront.filter(x=>x.bp>=4000).length,
       ownFront:b.ownFront.length,energy:b.energy,ap:b.ap};
      if(turn4.front4000===0)signals['low-front-four']=(signals['low-front-four']||0)+1;
     }
     turnOpen=false;
    }
   }
   phaseCounts[actor]++;steps++;
  }
  const finished=s.status==='finished'&&errors===0;
  const row={seed,deck:deck.id,hybridSeat,first,hybridIsFirst:hybridSeat===first,
   winner:finished?s.winner:null,hybridWon:finished&&s.winner===hybridSeat,
   hardWon:finished&&s.winner===1-hybridSeat,finished,steps,errors,fallbacks,
   ownTurns:ownTurn,first4000,turn4,signals,examples,stats,
   finalLife:s.players.map(p=>p.life.length),endReason:s.endReason||null};
  rows.push(row);
  console.log('DX_GAME '+JSON.stringify({seed,first,hybridSeat,hybridWon:row.hybridWon,
    steps,signals,turn4,first4000,finished,errors,fallbacks}));
 }
}
const roll=games=>{
 const counts={},value={games:games.length,wins:games.filter(x=>x.hybridWon).length,
  losses:games.filter(x=>x.hardWon).length,unfinished:games.filter(x=>!x.finished).length,
  avgOwnTurns:games.length?games.reduce((s,x)=>s+x.ownTurns,0)/games.length:null,
  avgFirst4000:null,avgTurn4LifeDiff:null,signals:counts};
 const firsts=games.map(x=>x.first4000).filter(Number.isFinite);
 if(firsts.length)value.avgFirst4000=firsts.reduce((s,x)=>s+x,0)/firsts.length;
 const diffs=games.map(x=>x.turn4?x.turn4.life-x.turn4.enemyLife:null).filter(Number.isFinite);
 if(diffs.length)value.avgTurn4LifeDiff=diffs.reduce((s,x)=>s+x,0)/diffs.length;
 for(const x of games)for(const [k,n] of Object.entries(x.signals))
   counts[k]=(counts[k]||0)+n;
 return value;
};
const result={description:'New diagnostic replays, soft-clock choices may differ from the original 80 games',
 head:process.env.GITHUB_SHA,shard,names,
 overall:roll(rows),lost:roll(rows.filter(x=>x.hardWon)),
 won:roll(rows.filter(x=>x.hybridWon)),hybridFirst:roll(rows.filter(x=>x.hybridIsFirst)),
 hybridSecond:roll(rows.filter(x=>!x.hybridIsFirst)),
 games:rows};
writeFileSync('ai-diagnosis-shard-'+shard+'.json',JSON.stringify(result,null,2));
console.log('DX_RESULT='+JSON.stringify({shard,overall:result.overall,lost:result.lost,
 won:result.won,hybridFirst:result.hybridFirst,hybridSecond:result.hybridSecond}));
if(result.overall.unfinished||rows.some(x=>x.errors))process.exitCode=1;
