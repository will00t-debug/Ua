// Experimental features taken from the ideas in the frozen hard policy:
// energy curve, whether the hand can be paid, raid material already on
// the field, a ready front that can threaten, and a block that survives.
// This module does not import or call the frozen search. Card numbers are
// not special cases. The three callers turn on one feature at a time.
// The preview page loads this file in the browser, so the budget stays on
// a synchronous stack. Search does not await inside the binding.
import {universalBp,universalEnergy,universalEnergyByColor,universalAttackDamage,universalImpact,universalImpactNull,legalUniversalActions,dispatchUniversalAction} from '../engine.mjs';
import {packOf} from './observation.mjs';

const probeStack=[];
const meterStack=[];
export function bindProbeBudget(budget,fn){
 probeStack.push(budget||null);
 try{return fn();}
 finally{probeStack.pop();}
}
export function bindMeter(meter,fn){
 if(!meter)return fn();
 meterStack.push(meter);
 try{return fn();}
 finally{meterStack.pop();}
}
export function noteDispatch(){
 const meter=meterStack.length?meterStack[meterStack.length-1]:null;
 if(meter)meter.dispatches=(meter.dispatches||0)+1;
}
// One transition of a proof that shares the search pool and clock. A direct
// call with no search binding is the proof itself. The line's own step
// counter stays untouched so the root can still be billed afterwards.
export function spendSharedStep(){
 const budget=probeBudget();
 if(!budget)return 'free';
 const expired=typeof budget.now==='function'&&budget.now()>budget.deadline;
 if(expired||!(budget.pool?.n>1))return 'blocked';
 budget.pool.n--;
 return 'spent';
}
export function searchPool(){
 return probeBudget()?.pool||null;
}
function probeBudget(){
 return probeStack.length?probeStack[probeStack.length-1]:null;
}
// One decision's legal lists. The key is the state object itself plus the
// pack object: dispatch clones, so a later AP, discount, pending, or hidden
// world is a different object. The map lives on that decision's budget and
// is dropped with it. A caller must not mutate the list or the state.
export function cachedLegal(pack,state){
 const cache=probeBudget()?.legalCache;
 if(!cache)return legalUniversalActions(pack,state);
 const hit=cache.get(state);
 if(hit&&hit.pack===pack)return hit.list;
 const list=legalUniversalActions(pack,state);
 cache.set(state,{pack,list});
 return list;
}

function squash(value){return String(value||'').replace(/\s+/g,'');}
function energyOf(pack,state,player){
 try{
  const value=universalEnergy(pack,state,player);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
function colorsOf(pack,state,player){
 try{return universalEnergyByColor(pack,state,player)||{};}
 catch{return {};}
}
function bpOf(pack,state,card){
 try{
  const value=universalBp(pack,state,card);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
function curveTarget(catalog,counts){
 const costs=[];
 for(const [id,copies] of Object.entries(counts||{})){
  const printed=catalog[id];
  if(printed?.type==='character'&&printed.energy>0)for(let i=0;i<copies;i++)costs.push(printed.energy);
 }
 if(!costs.length)return 3;
 costs.sort((a,b)=>a-b);
 return Math.max(2,Math.min(5,costs[Math.floor((costs.length-1)*0.8)]));
}
function raidReady(catalog,printed,mine){
 if(!printed?.raidName)return false;
 const wanted=new Set([printed.raidName,...(printed.raidBaseNames||[])].map(squash));
 for(const line of ['front','energy'])for(const body of mine?.[line]||[]){
  if(body&&wanted.has(squash(catalog[body.cardId]?.name)))return true;
 }
 return false;
}
function handView(pack,state,player){
 const catalog=packOf(pack,player).cards;
 const colors=colorsOf(pack,state,player);
 const mine=state.players[player];
 let playable=0,stranded=0,raids=0;
 for(const card of mine?.hand||[]){
  const printed=catalog[card?.cardId];
  if(!printed)continue;
  if((printed.energy||0)<=(colors[printed.color]||0))playable++;
  else stranded++;
  if(raidReady(catalog,printed,mine))raids++;
 }
 return {playable,stranded,raids};
}
function threatOf(pack,state,player){
 let best=0;
 for(const card of state.players[player].front){
  if(!card?.ready)continue;
  const bp=bpOf(pack,state,card);
  const walls=state.players[1-player].front.filter(Boolean);
  let value=0;
  if(!walls.length)value=bp>=2000?6:3;
  else if(walls.some(wall=>bp>bpOf(pack,state,wall)))value=8;
  else if(walls.some(wall=>bp===bpOf(pack,state,wall)))value=4;
  if(value>best)best=value;
 }
 return best;
}
function attackerCard(state){
 const uid=state.pending?.attackerUid;
 if(!uid)return null;
 for(const player of state.players){
  const card=player.front.find(item=>item?.uid===uid);
  if(card)return card;
 }
 return null;
}
function liveBlockers(pack,state,player){
 const attacker=attackerCard(state);
 const threats=attacker?[attacker]:state.players[1-player].front.filter(card=>card?.ready);
 if(!threats.length)return 0;
 let live=0;
 for(const card of state.players[player].front){
  if(!card)continue;
  if(state.pending?.kind!=='block'&&!card.ready)continue;
  const bp=bpOf(pack,state,card);
  if(threats.some(body=>bp>=bpOf(pack,state,body)))live++;
 }
 return live;
}
const moveViews=new WeakMap();
// A finished view stays on this state object. Another state, even one with
// the same friendly UIDs, has its own blocker, life, and battle result.
// A search binds one pool and clock for its whole call, including the
// ranking and the short lethal line. Nothing outside that binding may run
// the line for free.
function takeProbeNode(){
 const budget=probeBudget();
 if(!budget)return false;
 const expired=typeof budget.now==='function'&&budget.now()>budget.deadline;
 if(expired||!(budget.pool?.n>0))return false;
 if(Number.isInteger(budget.lineCap)&&!(budget.lineSpent<budget.lineCap))return false;
 budget.pool.n--;
 if(Number.isInteger(budget.lineSpent))budget.lineSpent++;
 return true;
}
function plainColors(colors){
 const out={};
 for(const [color,value] of Object.entries(colors||{}))if(value)out[color]=value;
 return out;
}
function boardSignature(state,actor){
 const mine=state?.players?.[actor];
 const opp=state?.players?.[1-actor];
 if(!mine||!opp)return '';
 const ids=zone=>(zone||[]).map(card=>card?card.uid+':'+card.cardId+':'+(card.ready===false?'r':'a'):'').join(',');
 return [state.phase||'',state.turn||0,state.pending?.kind||'',
  ids(mine.energy),ids(mine.front),ids(mine.hand),
  ids(opp.energy),ids(opp.front),(mine.life||[]).length,(opp.life||[]).length].join('|');
}
// Moving off the energy line is legal development only when the color that
// disappears is no longer needed. The curve, the cards actually in hand, and
// the energy after this move decide that. A lethal swing, a raid the
// remaining energy can pay, a front that still meets the curve, or a block
// when the front is empty are reasons to move anyway.
function moveKey(action){
 return [action.uid,action.slot??'',action.replaceUid||''].join(':');
}
function viewEntry(view){
 const budget=probeBudget();
 return {view,complete:view?.lethal!=='unproven',pool:budget?.pool||null};
}
// A finished yes or no can be reused. An unproven result belongs only to the
// pool that ran out, so a later call with a real budget can still check.
function storedMove(saved,key){
 const entry=saved?.views?.get(key);
 if(!entry)return null;
 if(entry.complete)return entry.view;
 const pool=probeBudget()?.pool||null;
 if(pool&&entry.pool===pool)return entry.view;
 return null;
}
export function cachedMoveDevelopment(pack,state,actor,action){
 if(action?.type!=='move'||!action.uid||!state?.players?.[actor])return null;
 const saved=moveViews.get(state);
 if(!saved||saved.signature!==boardSignature(state,actor))return null;
 return saved.views.get(moveKey(action))?.view||null;
}
export function moveDevelopment(pack,state,actor,action){
 if(action?.type!=='move'||!action.uid||!state?.players?.[actor])return null;
 const signature=boardSignature(state,actor);
 let saved=moveViews.get(state);
 if(!saved||saved.signature!==signature){
  saved={signature,views:new Map()};
  moveViews.set(state,saved);
 }
 const key=moveKey(action);
 const hit=storedMove(saved,key);
 if(hit)return hit;
 const view=assessMove(pack,state,actor,action);
 saved.views.set(key,viewEntry(view));
 return view;
}
function relocatedEnergy(pack,state,actor,action){
 const mine=state.players?.[actor];
 if(!mine)return null;
 const from=(mine.energy||[]).findIndex(card=>card?.uid===action.uid);
 if(from<0||!Number.isInteger(action.slot)||action.slot<0||action.slot>=(mine.front||[]).length)return null;
 const moving=mine.energy[from];
 const previous=mine.front[action.slot];
 mine.energy[from]=null;
 mine.front[action.slot]=moving;
 try{
  return {colors:plainColors(colorsOf(pack,state,actor)),total:energyOf(pack,state,actor)};
 }finally{
  mine.front[action.slot]=previous;
  mine.energy[from]=moving;
 }
}
function assessMove(pack,state,actor,action){
 const beforeColors=plainColors(colorsOf(pack,state,actor));
 const before=energyOf(pack,state,actor);
 const relocated=relocatedEnergy(pack,state,actor,action);
 if(!relocated)return null;
 const afterColors=relocated.colors;
 const after=relocated.total;
 const dropped=[];
 for(const color of new Set([...Object.keys(beforeColors),...Object.keys(afterColors)])){
  if((afterColors[color]||0)<(beforeColors[color]||0))dropped.push(color);
 }
 const parts=strategyParts(pack,state,actor);
 const catalog=packOf(pack,actor).cards;
 const hand=(state.players[actor].hand||[]).map(card=>catalog[card?.cardId]).filter(Boolean);
 const wantsColor=hand.some(printed=>dropped.includes(printed.color)&&(printed.energy||0)>(afterColors[printed.color]||0));
 const rawStrip=dropped.length>0&&after<parts.curve&&wantsColor;
 const judged=moveBenefit(pack,state,actor,action,beforeColors,afterColors,after,parts);
 const benefit=judged?.benefit||null;
 const lethal=judged?.lethal||'no';
 const reason=!dropped.length?'energy-held':
  benefit==='lethal'?'lethal':benefit==='raid'?'raid':benefit==='block'?'block':
  benefit==='enough'?'enough':lethal==='unproven'?'unproven':rawStrip?'curve-hand':'open';
 return {before,after,beforeColors,afterColors,dropped,curve:parts.curve,wantsColor,
  strip:rawStrip&&!benefit,benefit,lethal,lethalLine:judged?.line||null,reason};
}
function probeStep(pack,cursor,action){
 if(!takeProbeNode())return {stop:'budget'};
 const seat=cursor.pending?.player??cursor.active;
 try{
  const state=dispatchUniversalAction(pack,cursor,action,{actor:seat});
  noteDispatch();
  return {state};
 }catch{return {stop:'error'};}
}
function lifeVerdict(cursor,actor){
 if(!cursor)return null;
 if(cursor.status==='finished')return cursor.winner===actor?'lethal':'no';
 const pending=cursor.pending;
 if(pending?.kind==='attack-life-target'){
  const life=cursor.players[pending.defender]?.life?.length||0;
  return life>0&&(pending.count||0)>=life?'lethal':'no';
 }
 if(pending?.kind==='life-trigger')return 'unproven';
 return null;
}
function forcedPublic(pack,cursor){
 let legal=[];
 try{legal=legalUniversalActions(pack,cursor);}catch{return null;}
 if(legal.length!==1)return null;
 const action=legal[0];
 if(action.type==='chooseAttackLife'||action.type==='chooseTrigger'||action.type==='chooseLifeEffect')return null;
 return action;
}
// One short line: move, pass to the attack, then every legal block. Beating
// one blocker is not life damage. Impact and impact-null come from the
// engine result. Hidden life cards and hands are not read. Anything the
// line cannot settle, including a spent search budget, stays unproven.
function confirmMoveLethal(pack,state,actor,action){
 const line=[];
 const note=(cursor,step)=>{
  if(line.length>=8)return;
  line.push({type:step?.type||null,uid:step?.uid??null,phase:cursor?.phase||null,
   pending:cursor?.pending?.kind||null,life:cursor?.players?.[1-actor]?.life?.length??null,
   status:cursor?.status||null,winner:cursor?.winner??null});
 };
 const act=(cursor,step)=>{
  const stepped=probeStep(pack,cursor,step);
  if(stepped.state)note(stepped.state,step);
  return stepped;
 };
 let opened=act(state,action);
 if(!opened.state)return {verdict:'unproven',line};
 let cursor=opened.state;
 for(let guard=0;guard<8&&cursor.status==='playing';guard++){
  const judged=lifeVerdict(cursor,actor);
  if(judged)return {verdict:judged,line};
  if(cursor.pending){
   const only=forcedPublic(pack,cursor);
   if(!only)return {verdict:'unproven',line};
   const stepped=act(cursor,only);
   if(!stepped.state)return {verdict:'unproven',line};
   cursor=stepped.state;
   continue;
  }
  const seat=cursor.active;
  if(seat!==actor)return {verdict:'no',line};
  if(cursor.phase==='attack')break;
  if(cursor.phase!=='move'&&cursor.phase!=='main'&&cursor.phase!=='start')return {verdict:'unproven',line};
  let legal=[];
  try{legal=legalUniversalActions(pack,cursor);}catch{return {verdict:'unproven',line};}
  const pass=legal.find(entry=>entry.type==='next');
  if(!pass)return {verdict:'unproven',line};
  const stepped=act(cursor,pass);
  if(!stepped.state)return {verdict:'unproven',line};
  cursor=stepped.state;
 }
 const reached=lifeVerdict(cursor,actor);
 if(reached)return {verdict:reached,line};
 if(cursor.status!=='playing'||cursor.phase!=='attack'||cursor.pending)return {verdict:'unproven',line};
 let legal=[];
 try{legal=legalUniversalActions(pack,cursor);}catch{return {verdict:'unproven',line};}
 const attack=legal.find(entry=>entry.type==='attack'&&entry.uid===action.uid&&!entry.targetUid);
 if(!attack)return {verdict:'no',line};
 const swung=act(cursor,attack);
 if(!swung.state)return {verdict:'unproven',line};
 cursor=swung.state;
 const afterSwing=lifeVerdict(cursor,actor);
 if(afterSwing)return {verdict:afterSwing,line};
 if(cursor.pending?.kind!=='block')return {verdict:'unproven',line};
 let blocks=[];
 try{blocks=legalUniversalActions(pack,cursor);}catch{return {verdict:'unproven',line};}
 const answers=blocks.filter(entry=>entry.type==='chooseBlock'&&entry.uid);
 const pass=blocks.find(entry=>entry.type==='chooseBlock'&&(entry.uid===null||entry.uid===undefined));
 const defenses=answers.length?answers:(pass?[pass]:[]);
 if(!defenses.length)return {verdict:'unproven',line};
 let lethal=0,saved=0,open=0;
 for(const defense of defenses){
  const stepped=act(cursor,defense);
  if(!stepped.state){open++;continue;}
  let followed=stepped.state;
  let verdict=null;
  for(let guard=0;guard<6&&!verdict;guard++){
   verdict=lifeVerdict(followed,actor);
   if(verdict)break;
   if(followed.status!=='playing'){verdict='no';break;}
   if(!followed.pending){verdict='no';break;}
   const only=forcedPublic(pack,followed);
   if(!only){verdict='unproven';break;}
   const next=act(followed,only);
   if(!next.state){verdict='unproven';break;}
   followed=next.state;
  }
  if(!verdict)verdict='unproven';
  if(verdict==='lethal')lethal++;
  else if(verdict==='no')saved++;
  else open++;
 }
 if(saved)return {verdict:'no',line};
 if(lethal&&!open)return {verdict:'lethal',line};
 return {verdict:'unproven',line};
}
// A card the current color can pay, and the color left after the move cannot,
// is a play keeping that energy actually enables. Cost above the reduced
// total is not enough: the card was already stranded.
function keptEnergyEnablesPlay(pack,state,actor,beforeColors,afterColors){
 const catalog=packOf(pack,actor).cards;
 const mine=state.players?.[actor];
 if(!mine)return false;
 const ready=(mine.apCards||[]).filter(card=>card?.ready).length;
 for(const card of mine.hand||[]){
  const printed=catalog[card?.cardId];
  if(!printed||(printed.type!=='character'&&printed.type!=='event'))continue;
  const cost=Number(printed.energy)||0;
  const before=beforeColors[printed.color]||0;
  const after=afterColors[printed.color]||0;
  if(!(cost<=before&&cost>after))continue;
  if(ready<(Number(printed.ap)||0))continue;
  if(printed.type==='event')return true;
  const lines=[];
  if(!printed.frontForbidden)lines.push('front');
  if(!printed.energyForbidden&&!printed.energyLineForbidden)lines.push('energy');
  if(lines.some(line=>(mine[line]||[]).some(slot=>!slot)||(mine[line]||[]).some(Boolean)))return true;
 }
 return false;
}
function attackDamageOf(pack,state,card){
 try{
  const damage=universalAttackDamage(pack,state,card);
  return Number.isFinite(damage)&&damage>0?damage:1;
 }catch{return null;}
}
// Ready front characters, summed as if none of them can be blocked. Life
// above that total is already safe, so the legal-block read stays unused.
function openSwingDamage(pack,state,actor){
 let total=0;
 for(const card of state.players?.[1-actor]?.front||[]){
  if(!card?.ready)continue;
  const damage=attackDamageOf(pack,state,card);
  if(damage==null)return null;
  total+=damage;
 }
 return total;
}
function listedAttacks(pack,state,attacker){
 const copy=structuredClone(state);
 copy.pending=null;
 copy.phase='attack';
 copy.active=attacker;
 copy.attacksThisTurn=0;
 let legal=[];
 try{legal=legalUniversalActions(pack,copy);}catch{return null;}
 return legal.filter(action=>action.type==='attack'&&action.uid&&!action.targetUid).map(action=>action.uid);
}
function listedBlocks(pack,state,defender,attackerUid){
 const copy=structuredClone(state);
 copy.phase='attack';
 copy.active=1-defender;
 copy.pending={kind:'block',player:defender,attackerUid};
 let legal=[];
 try{legal=legalUniversalActions(pack,copy);}catch{return null;}
 return new Set(legal.filter(action=>action.type==='chooseBlock'&&action.uid).map(action=>action.uid));
}
// The smallest life loss from assigning the front we have now. A block the
// engine does not list is not a save. Winning on BP keeps the character and
// spends one block. Losing removes it, and Impact leaks only when the engine
// still counts it. This read does not dispatch, so it does not take a node.
function minimumLifeLoss(pack,state,actor){
 const opp=1-actor;
 const attacks=listedAttacks(pack,state,opp);
 if(!attacks)return null;
 const threats=[];
 for(const card of state.players?.[opp]?.front||[]){
  if(!card?.ready||!attacks.includes(card.uid))continue;
  const damage=attackDamageOf(pack,state,card);
  if(damage==null)return null;
  let impact=0;
  try{impact=universalImpact(pack,state,card)||0;}catch{return null;}
  const blocks=listedBlocks(pack,state,actor,card.uid);
  if(!blocks)return null;
  threats.push({damage,impact,bp:bpOf(pack,state,card),blocks});
 }
 const blockers=(state.players?.[actor]?.front||[]).filter(card=>card?.ready).map(card=>{
  let nulls=false;
  try{nulls=universalImpactNull(pack,state,card)===true;}catch{nulls=false;}
  return {uid:card.uid,bp:bpOf(pack,state,card),nulls,uses:1,alive:true};
 });
 const walk=(index,left)=>{
  if(index>=threats.length)return 0;
  const threat=threats[index];
  let best=threat.damage+walk(index+1,left);
  for(let i=0;i<left.length;i++){
   const blocker=left[i];
   if(!blocker.alive||blocker.uses<=0||!threat.blocks.has(blocker.uid))continue;
   const wins=blocker.bp>threat.bp;
   const leak=!wins&&threat.impact>0&&!blocker.nulls?threat.impact:0;
   const next=left.map((item,at)=>at===i?(wins?{...item,uses:item.uses-1}:{...item,uses:0,alive:false}):item);
   const got=leak+walk(index+1,next);
   if(got<best)best=got;
  }
  return best;
 };
 return walk(0,blockers);
}
// Beating one attacker is not a reason to leave the energy line. It is a
// block when that one legal save is the difference between losing now and
// still having a life, and keeping the color does not pay a card in hand.
function lifeSavingMove(pack,state,actor,action,beforeColors,afterColors){
 if(keptEnergyEnablesPlay(pack,state,actor,beforeColors,afterColors))return false;
 const life=state.players?.[actor]?.life?.length||0;
 if(life<=0)return false;
 const open=openSwingDamage(pack,state,actor);
 if(open==null||life>open)return false;
 const mine=state.players?.[actor];
 const from=(mine?.energy||[]).findIndex(card=>card?.uid===action.uid);
 if(!mine||from<0||!Number.isInteger(action.slot))return false;
 const moving=mine.energy[from];
 if(!moving||moving.ready===false)return false;
 const before=minimumLifeLoss(pack,state,actor);
 if(before==null||life>before)return false;
 const previous=mine.front[action.slot];
 mine.energy[from]=null;
 mine.front[action.slot]=moving;
 let after=null;
 try{after=minimumLifeLoss(pack,state,actor);}
 finally{
  mine.front[action.slot]=previous;
  mine.energy[from]=moving;
 }
 return after!=null&&life>after;
}
function moveBenefit(pack,state,actor,action,beforeColors,afterColors,after,parts){
 if(after>=parts.curve)return {benefit:'enough',lethal:'no'};
 const opp=1-actor;
 const body=(state.players[actor].energy||[]).find(card=>card?.uid===action.uid);
 const catalog=packOf(pack,actor).cards;
 let lethal='no',line=null;
 if(body&&body.ready!==false){
  const life=state.players[opp]?.life;
  const lifeCount=Array.isArray(life)?life.length:Number(life)||0;
  if(lifeCount===1){
   const confirmed=confirmMoveLethal(pack,state,actor,action);
   lethal=confirmed.verdict;
   line=confirmed.line;
   if(lethal==='lethal')return {benefit:'lethal',lethal,line};
  }
  const bp=bpOf(pack,state,body);
  const baseName=squash(catalog[body.cardId]?.name);
  if(baseName){
   for(const card of state.players[actor].hand||[]){
    const printed=catalog[card?.cardId];
    if(!printed?.raidName)continue;
    const names=[printed.raidName,...(printed.raidBaseNames||[])].map(squash);
    if(!names.includes(baseName))continue;
    if((printed.energy||0)<=(afterColors[printed.color]||0))return {benefit:'raid',lethal,line};
   }
  }
  const ownFront=(state.players[actor].front||[]).filter(Boolean);
  const threats=(state.players[opp].front||[]).filter(card=>card?.ready);
  // One smaller body is not a block. The ready attackers that are still
  // larger stay, and dropping the color the hand needs is still a strip.
  if(!ownFront.length&&threats.length&&threats.every(wall=>bp>=bpOf(pack,state,wall)))return {benefit:'block',lethal,line};
  if(lifeSavingMove(pack,state,actor,action,beforeColors,afterColors))return {benefit:'block',lethal,line};
 }
 return {benefit:null,lethal,line};
}
export function strategyParts(pack,state,actor){
 const catalog=packOf(pack,actor).cards;
 const energy=energyOf(pack,state,actor);
 const curve=curveTarget(catalog,state.initialCounts?.[actor]);
 const hand=handView(pack,state,actor);
 const opp=1-actor;
 return {
  energy,curve,deficit:Math.max(0,curve-energy),
  playable:hand.playable,stranded:hand.stranded,raids:hand.raids,
  threat:threatOf(pack,state,actor),opposingThreat:threatOf(pack,state,opp),
  blocks:liveBlockers(pack,state,actor)
 };
}
// Weights are an experiment. They are not the frozen heuristic's numbers.
export function strategyScore(pack,state,actor){
 const parts=strategyParts(pack,state,actor);
 return -parts.deficit*parts.deficit*4+parts.playable*1.2-Math.min(parts.stranded,4)*0.3+
  parts.raids*3+parts.threat*2-parts.opposingThreat+parts.blocks*3;
}
function cardPrint(pack,state,viewer,uid){
 if(!uid)return null;
 const catalog=packOf(pack,viewer).cards;
 for(const zone of ['hand','front','energy','outside']){
  const card=(state.players[viewer][zone]||[]).find(item=>item?.uid===uid);
  if(card)return catalog[card.cardId]||null;
 }
 return null;
}
function blockerLives(pack,state,viewer,action){
 if(action?.type!=='chooseBlock'||!action.uid)return false;
 const card=state.players[viewer].front.find(item=>item?.uid===action.uid);
 const attacker=attackerCard(state);
 if(!card||!attacker)return false;
 return bpOf(pack,state,card)>=bpOf(pack,state,attacker);
}
function unblockedHits(pack,state,actor){
 const threats=(state.players?.[1-actor]?.front||[]).filter(card=>card?.ready);
 const ours=(state.players?.[actor]?.front||[]).filter(Boolean);
 const used=new Set();
 let hits=0;
 for(const threat of threats){
  const bp=bpOf(pack,state,threat);
  const block=ours.find(body=>!used.has(body.uid)&&bpOf(pack,state,body)>=bp);
  if(block)used.add(block.uid);
  else hits++;
 }
 return hits;
}
function energyPlays(pack,state,uid){
 try{
  return legalUniversalActions(pack,state).filter(action=>action?.type==='play'&&action.line==='energy'&&action.uid===uid);
 }catch{return [];}
}
// Playing onto a full energy line removes the card named by replaceUid.
// The printed generator is not new energy until that removal is subtracted.
// The swap is not a dispatch: the search clock and node pool stay put.
export function energyPlayNet(pack,state,actor,action){
 const mine=state?.players?.[actor];
 if(!mine||action?.type!=='play'||action.line!=='energy'||!action.uid)return null;
 const hand=mine.hand||[];
 const index=hand.findIndex(card=>card?.uid===action.uid);
 if(index<0||!Number.isInteger(action.slot))return null;
 const moving=hand[index];
 const previous=mine.energy?.[action.slot];
 if(previous?action.replaceUid!==previous.uid:!!action.replaceUid)return null;
 const before=plainColors(colorsOf(pack,state,actor));
 hand.splice(index,1);
 mine.energy[action.slot]=moving;
 let after;
 try{after=plainColors(colorsOf(pack,state,actor));}
 finally{
  mine.energy[action.slot]=previous;
  hand.splice(index,0,moving);
 }
 const gain={};
 for(const color of new Set([...Object.keys(before),...Object.keys(after)]))
  gain[color]=(after[color]||0)-(before[color]||0);
 const ready=(mine.apCards||[]).filter(card=>card?.ready).length;
 const printed=packOf(pack,actor).cards[moving.cardId];
 const ap=Math.max(0,Number(printed?.ap)||0);
 return {before,after,gain,ap,readyAfter:Math.max(0,ready-ap)};
}
function positiveGain(net){
 if(!net)return false;
 return Object.values(net.gain).some(value=>value>0);
}
// 'reach' pays a card that is stranded now. 'narrow' only adds some of the
// missing color. A replacement that does not raise that color is neither.
function gapProgress(pack,state,actor,net,playedUid,extra=0){
 if(!positiveGain(net))return null;
 const catalog=packOf(pack,actor).cards;
 const played=catalog[(state.players?.[actor]?.hand||[]).find(card=>card?.uid===playedUid)?.cardId];
 let narrow=false;
 for(const card of state.players?.[actor]?.hand||[]){
  if(!card||card.uid===playedUid)continue;
  const body=catalog[card.cardId];
  if(!body)continue;
  const had=net.before[body.color]||0;
  if((net.gain[body.color]||0)<=0)continue;
  const cost=Number(body.energy)||0;
  if(cost<=had)continue;
  const pool=(net.after[body.color]||0)+(body.color===played?.color?extra:0);
  if(cost<=pool)return 'reach';
  if(pool>had)narrow=true;
 }
 return narrow?'narrow':null;
}
function payableCharacters(pack,state,actor){
 const catalog=packOf(pack,actor).cards;
 const colors=colorsOf(pack,state,actor);
 let count=0;
 for(const card of state.players?.[actor]?.hand||[]){
  const printed=catalog[card?.cardId];
  if(!printed||printed.type!=='character')continue;
  if((Number(printed.energy)||0)<=(colors[printed.color]||0))count++;
 }
 return count;
}
function partnerEnergy(pack,state,actor,printed,uid){
 const colors=colorsOf(pack,state,actor);
 const catalog=packOf(pack,actor).cards;
 let extra=0;
 for(const card of state.players?.[actor]?.hand||[]){
  if(!card||card.uid===uid)continue;
  const body=catalog[card.cardId];
  if(!body||body.type!=='character'||!(body.gen>0)||body.color!==printed.color)continue;
  if((Number(body.energy)||0)>(colors[body.color]||0))continue;
  extra+=Number(body.gen)||0;
 }
 return extra;
}
// Life can spare the body when the hits we cannot already block would still
// leave four or more. Below that the generator stays a front candidate.
function spareForEnergy(pack,state,actor){
 const life=state.players?.[actor]?.life?.length||0;
 if(life<4)return false;
 return life-unblockedHits(pack,state,actor)>=4;
}
function rowOf(rows,action){
 if(!action)return null;
 const key=JSON.stringify(action);
 return (rows||[]).find(row=>row?.executed!==false&&JSON.stringify(row.action)===key)||null;
}
function provenWin(row){return row?.boundary==='terminal'&&row.search>=90000;}
// Lines that stopped together were already compared. A worse energy score
// does not get to replace the front just because the color would rise.
function frontBeatsEnergy(choice,rows){
 const front=rowOf(rows,choice);
 if(!front)return false;
 const matched=(rows||[]).filter(row=>row?.executed!==false&&row.action?.type==='play'&&
  row.action.line==='energy'&&row.action.uid===choice.uid&&row.boundary===front.boundary);
 if(!matched.length)return false;
 return matched.every(row=>front.search>=row.search);
}
function provenLoss(row){return row?.boundary==='terminal'&&row.search<=-90000;}
// A finished win stays. The one finished line that is not an immediate loss
// stays too. An energy preference that has not itself won is not a substitute.
function provenChoice(choice,rows){
 const mine=rowOf(rows,choice);
 if(!mine||mine.boundary!=='terminal'||!(mine.search>-90000))return false;
 if(provenWin(mine))return true;
 const safe=(rows||[]).filter(row=>row?.executed!==false&&row.boundary==='terminal'&&!provenLoss(row));
 return safe.length===1&&JSON.stringify(safe[0].action)===JSON.stringify(choice);
}
// A small generator's front line can finish, or stop early with a higher raw
// score, while its energy line is still cut. That is not a reason to put the
// generator on the front. A 4000 generator follows the same energy line when
// the added color is real and the life total can take the open swings.
// A 4000 that is needed to stay at four life stays where the search put it.
// A proven win, and the only proven way to avoid an immediate loss, stay.
export function preferEnergyGenerator(pack,state,actor,choice,rows){
 if(choice?.type!=='play'||choice.line!=='front'||!choice.uid)return choice;
 if(provenChoice(choice,rows))return choice;
 const catalog=packOf(pack,actor).cards;
 const hand=state.players?.[actor]?.hand||[];
 const chosen=hand.find(card=>card?.uid===choice.uid);
 const printed=chosen&&catalog[chosen.cardId];
 if(!printed||!(printed.gen>0))return choice;
 const parts=strategyParts(pack,state,actor);
 // A 4000 that still generates goes to energy when the hand cannot pay its
 // curve and this is the only body we can play, or this energy reaches a
 // card that is stranded now. The gain is the color left after replacement.
 // Another payable body keeps the front line. A proven loss is not a landing spot.
 if((Number(printed.bp)||0)>=4000){
  if(!(spareForEnergy(pack,state,actor)&&(parts.deficit>0||parts.stranded>0)))return choice;
  const alone=payableCharacters(pack,state,actor)<=1;
  const pressure=(state.players?.[1-actor]?.front||[]).some(card=>card?.ready);
  const extra=partnerEnergy(pack,state,actor,printed,choice.uid);
  let best=null,bestGain=-1;
  for(const action of energyPlays(pack,state,choice.uid)){
   if(provenLoss(rowOf(rows,action))||frontBeatsEnergy(choice,rows))continue;
   const net=energyPlayNet(pack,state,actor,action);
   const own=gapProgress(pack,state,actor,net,choice.uid,0);
   const partner=pressure&&extra>0?gapProgress(pack,state,actor,net,choice.uid,extra):null;
   const useful=own==='reach'||partner==='reach'||(alone&&(own==='narrow'||partner==='narrow'||own==='reach'));
   if(!useful)continue;
   const gain=Object.values(net.gain).reduce((sum,value)=>sum+(value>0?value:0),0);
   const rank=gain*2+(rowOf(rows,action)?1:0);
   if(rank>bestGain){bestGain=rank;best=action;}
  }
  return best||choice;
 }
 // A smaller generator follows the same payment rule. One real energy that
 // pays a stranded card is the development line; the front body can wait.
 const reaching=energyPlays(pack,state,choice.uid).filter(action=>{
  if(provenLoss(rowOf(rows,action))||frontBeatsEnergy(choice,rows))return false;
  return gapProgress(pack,state,actor,energyPlayNet(pack,state,actor,action),choice.uid,0)==='reach';
 });
 if(spareForEnergy(pack,state,actor)&&reaching.length){
  reaching.sort((a,b)=>Number(!!rowOf(rows,b))-Number(!!rowOf(rows,a)));
  return reaching[0];
 }
 const front=rows.find(row=>row?.action?.type==='play'&&row.action.line==='front'&&row.action.uid===choice.uid);
 const energy=rows.find(row=>row?.action?.type==='play'&&row.action.line==='energy'&&row.action.uid===choice.uid&&row.executed!==false);
 if(!energy||energy.boundary==='terminal')return choice;
 // Both lines reached home and energy scored no better: the front placement won fairly.
 if(front?.boundary==='returned'&&energy.boundary==='returned'&&energy.search<=front.search)return choice;
 const cut=energy.boundary!=='returned';
 if(!cut)return choice;
 const colors=colorsOf(pack,state,actor);
 const ready=(state.players?.[actor]?.apCards||[]).filter(card=>card?.ready).length;
 const chosenAp=printed.ap||1;
 const mainWaiting=hand.some(card=>{
  if(!card||card.uid===choice.uid)return false;
  const body=catalog[card.cardId];
  if(!body||body.type!=='character'||(Number(body.bp)||0)<4000)return false;
  if((body.energy||0)>(colors[body.color]||0))return false;
  return ready>=chosenAp+(body.ap||1);
 });
 const frontHasBody=(state.players?.[actor]?.front||[]).some(Boolean);
 if(!(mainWaiting||(front?.boundary==='returned'&&frontHasBody))||provenLoss(energy))return choice;
 const net=energyPlayNet(pack,state,actor,energy.action);
 return positiveGain(net)?energy.action:choice;
}
// The start-phase draw spends one AP and is scored on the belief deck, not
// the live top. When the hand is still short of energy and one AP remains
// afterwards, take the draw and plan the main from the card that arrives.
// A proven win without the draw, or a proven loss from the draw, stays.
export function preferEarlyDraw(pack,state,actor,choice,rows){
 if(state?.phase!=='start'||state.pending)return choice;
 if(choice?.type==='extraDraw')return choice;
 let draw=null;
 try{draw=legalUniversalActions(pack,state).find(action=>action?.type==='extraDraw')||null;}
 catch{draw=null;}
 if(!draw)return choice;
 const ready=(state.players?.[actor]?.apCards||[]).filter(card=>card?.ready).length;
 if(ready<2)return choice;
 const life=state.players?.[actor]?.life?.length||0;
 const front=(state.players?.[actor]?.front||[]).filter(Boolean).length;
 const threats=(state.players?.[1-actor]?.front||[]).filter(card=>card?.ready).length;
 if(life<=3&&!front&&threats)return choice;
 const parts=strategyParts(pack,state,actor);
 if(parts.deficit<=0&&parts.stranded<=0)return choice;
 const loss=(rows||[]).find(row=>row?.action?.type==='extraDraw'&&row.boundary==='terminal'&&row.search<=-90000);
 if(loss)return choice;
 const win=(rows||[]).find(row=>row?.action?.type==='next'&&row.boundary==='terminal'&&row.search>=90000);
 if(win)return choice;
 return draw;
}
// A cut search used to copy the energy-before-front rank. That is right when
// the line still needs a generator. It is the wrong backup once current
// energy and AP already pay a large front body, and that body is not an
// unready raid card sitting behind a bigger friendly attacker.
export function situationalBackup(pack,state,actor,legal,choice){
 if(!choice||choice.type!=='play'||choice.line!=='energy')return choice;
 if(!(energyOf(pack,state,actor)>0))return choice;
 const mine=state.players?.[actor];
 if(!mine)return choice;
 const ready=(mine.apCards||[]).filter(card=>card?.ready).length;
 if(!ready)return choice;
 const catalog=packOf(pack,actor).cards;
 const colors=colorsOf(pack,state,actor);
 let best=null,bestBp=-1;
 for(const action of legal||[]){
  if(action?.type!=='play'||action.line!=='front'||!action.uid)continue;
  const card=(mine.hand||[]).find(item=>item?.uid===action.uid);
  const printed=card&&catalog[card.cardId];
  if(!printed||printed.type!=='character')continue;
  if((printed.energy||0)>(colors[printed.color]||0))continue;
  if(printed.raidName&&!raidReady(catalog,printed,mine))continue;
  const bp=Number(printed.bp)||0;
  if(bp<3000)continue;
  const covered=(mine.front||[]).some(body=>body&&(Number(catalog[body.cardId]?.bp)||0)>=bp);
  if(covered)continue;
  if(bp>bestBp){bestBp=bp;best=action;}
 }
 return best||choice;
}
export function strategyOrder(pack,state,viewer,action){
 const parts=strategyParts(pack,state,viewer);
 if(action.type==='chooseBlock'&&action.uid)return blockerLives(pack,state,viewer,action)?16:1;
 if(action.type==='chooseBlock')return 2;
 if(action.type==='play'&&action.line==='energy'){
  const printed=cardPrint(pack,state,viewer,action.uid);
  return parts.deficit>0&&(printed?.gen||0)>0?20+parts.deficit:4;
 }
 if(action.type==='raid')return parts.raids>0?18:8;
 if(action.type==='attack')return parts.threat?12:3;
 if(action.type==='play'&&action.line==='front')return 6;
 if(action.type==='activate'||action.type==='event'||action.type==='handActivate')return 5;
 if(action.type==='move'){
  const view=moveDevelopment(pack,state,viewer,action);
  return view?.strip?-4:1;
 }
 if(action.type==='next')return 0;
 return 1;
}
function replyRank(pack,state,action){
 const seat=state.pending?.player??state.active;
 if(action.type==='chooseBlock'&&action.uid)return blockerLives(pack,state,seat,action)?50:4;
 if(action.type==='chooseBlock'||action.mode==='skip'||action.mode==='decline'||action.uid==null&&action.type!=='next'&&action.type!=='play'&&action.type!=='attack')return 6;
 const parts=strategyParts(pack,state,seat);
 if(action.type==='play'&&action.line==='energy'&&parts.deficit>0)return 40;
 if(action.type==='raid')return 36;
 if(action.type==='attack')return 30;
 if(action.type==='play')return 24;
 if(action.type==='activate'||action.type==='event'||action.type==='handActivate')return 20;
 if(action.type==='move')return moveDevelopment(pack,state,seat,action)?.strip?0:8;
 if(action.type==='next')return 2;
 return 8;
}
export function replyAction(pack,state,legal){
 const seat=state.pending?.player??state.active;
 if(state.pending?.kind==='block'){
  const live=legal.filter(action=>action.type==='chooseBlock'&&blockerLives(pack,state,seat,action));
  live.sort((a,b)=>{
   const left=state.players[seat].front.find(card=>card?.uid===a.uid);
   const right=state.players[seat].front.find(card=>card?.uid===b.uid);
   return bpOf(pack,state,left)-bpOf(pack,state,right);
  });
  if(live.length)return live[0];
  return legal.find(action=>action.uid==null)||legal[0]||null;
 }
 const ranked=[...legal].sort((a,b)=>replyRank(pack,state,b)-replyRank(pack,state,a));
 return ranked[0]||null;
}
export function replyOrder(pack,state,legal){
 return [...legal].sort((a,b)=>replyRank(pack,state,b)-replyRank(pack,state,a)||
  (JSON.stringify(a)<JSON.stringify(b)?-1:1));
}
