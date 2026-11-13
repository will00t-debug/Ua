// Experimental features taken from the ideas in the frozen hard policy:
// energy curve, whether the hand can be paid, raid material already on
// the field, a ready front that can threaten, and a block that survives.
// This module does not import or call the frozen search. Card numbers are
// not special cases. The three callers turn on one feature at a time.
// The preview page loads this file in the browser, so the budget stays on
// a synchronous stack. Search does not await inside the binding.
import {universalBp,universalEnergy,universalEnergyByColor,universalAttackDamage,universalImpact,universalImpactNull,legalUniversalActions,dispatchUniversalAction,effectiveHandRequiredEnergy} from '../engine.mjs';
import {fieldRestrictions,originalEffectsDisabled} from '../continuous-states.mjs';
import {aot2AttackBlocked} from '../aot2-continuous.mjs';
import {packOf} from './observation.mjs';
import {raidBoxListed} from '../raid-box.mjs';
import {sequencedFilter,lineSwitchBody,recoversActionPoints,filterEnergyFirst,lastApLineSwitch} from './eval.mjs';

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
// A and B stay off unless a comparison asks for them. Null is the 528ab204 path.
// The three comparison factors are coverage scope, raid-base retention, and
// where the evidence gate sits. A named variant is one fixed bundle. An
// explicit factors object is the separated comparison and stays off unless
// the caller passes it. This module does not read the process global.
const variantStack=[];
const factorStack=[];
const NO_FACTORS={coverage:null,raidBase:false,gate:null};
export function factorsForVariant(variant){
 if(variant==='a')return {coverage:'tree',raidBase:false,gate:null};
 if(variant==='b')return {coverage:null,raidBase:false,gate:'final'};
 if(variant==='ab')return {coverage:'tree',raidBase:false,gate:'final'};
 if(variant==='ab-front')return {coverage:'root',raidBase:true,gate:'energy'};
 return {coverage:null,raidBase:false,gate:null};
}
export function normalizeFactors(asked){
 if(!asked||typeof asked!=='object')return null;
 const coverage=asked.coverage==='root'||asked.coverage==='tree'?asked.coverage:null;
 const gate=asked.gate==='energy'||asked.gate==='final'||asked.gate==='main-front'?asked.gate:null;
 const factors={coverage,raidBase:asked.raidBase===true,gate};
 // Keeping the action points for a known energy line is a separate opt-in.
 // Named variants do not turn it on.
 if(asked.reserveAp===true)factors.reserveAp=true;
 // Keeping the energy a known front play needs is a separate opt-in. A move
 // that adds a body now, but leaves that play unpaid, is not taken while a
 // search is still unfinished. Named variants do not turn it on.
 if(asked.holdInfo===true)factors.holdInfo=true;
 // Equalize root boundaries inside the same node pool. Off unless asked.
 if(asked.alignRoots===true)factors.alignRoots=true;
 // A generator may move a searched front onto energy only with a searched
 // energy line at the same boundary. Off unless asked.
 if(asked.evidenceGenerator===true)factors.evidenceGenerator=true;
 // An executed energy play that reached a later phase is not dropped for an
 // earlier front of another card. Off unless asked. Named variants and the
 // other switches do not turn it on.
 if(asked.laterEnergy===true)factors.laterEnergy=true;
 // The idle-main front slot replaces the lowest-ranked root already in the
 // beam. The default still replaces the first unprotected root. Off unless
 // asked. Named variants and the other switches do not turn it on.
 if(asked.frontSpare===true)factors.frontSpare=true;
 // An unsettled life-zero from a trigger that cannot put a card back into
 // LIFE is not ranked above a block the same search already walked into the
 // opponent's turn. FINAL and SPECIAL stay untouched: FINAL can return a
 // life, and SPECIAL is an unresolved effect. Off unless asked. Named
 // variants and the other switches do not turn it on.
 if(asked.settleLife===true)factors.settleLife=true;
 // An unfinished block window is not evidence that blocking saved life.
 // The public battle ledger already compares BP, Impact and Impact null.
 // Off unless asked. Named variants and the other switches do not turn it on.
 if(asked.publicBlock===true)factors.publicBlock=true;
 // A scaled outside payment is one finished choice: how many cards leave,
 // then which enemy that total reduces. Off unless asked. Named variants
 // and the other switches do not turn it on.
 if(asked.scaleOutside===true)factors.scaleOutside=true;
 return factors;
}
export function bindVariant(variant,fn,factors){
 const named=variant==='a'||variant==='b'||variant==='ab'||variant==='ab-front'?variant:null;
 const resolved=factors?normalizeFactors(factors):factorsForVariant(named);
 variantStack.push(named);
 factorStack.push(resolved||NO_FACTORS);
 try{return fn();}
 finally{factorStack.pop();variantStack.pop();}
}
export function searchVariant(){
 return variantStack.length?variantStack[variantStack.length-1]:null;
}
export function searchFactors(){
 return factorStack.length?factorStack[factorStack.length-1]:NO_FACTORS;
}
let allowFrontCoverage=true;
export function setFrontCoverage(on){
 const previous=allowFrontCoverage;
 allowFrontCoverage=!!on;
 return previous;
}
export function frontCoverageOn(){
 if(!allowFrontCoverage)return false;
 const coverage=searchFactors().coverage;
 return coverage==='root'||coverage==='tree';
}
// The coverage winner does not evict the hand card it would raid onto.
// That base stays in the beam so the raid is still a follow-up. The score
// itself is unchanged.
export function coverageKeepsRaidBase(pack,state,viewer,incoming,displaced){
 if(!searchFactors().raidBase)return false;
 if(incoming?.type!=='play'||incoming.line!=='front')return false;
 if(displaced?.type!=='play'||displaced.line!=='front')return false;
 const hand=state.players?.[viewer]?.hand||[];
 const catalog=packOf(pack,viewer).cards;
 const next=hand.find(card=>card?.uid===incoming.uid);
 const base=hand.find(card=>card?.uid===displaced.uid);
 const printed=next&&catalog[next.cardId];
 const under=base&&catalog[base.cardId];
 return !!(printed?.raidName&&under?.name&&printed.raidName===under.name);
}
export function noteDispatch(){
 const meter=meterStack.length?meterStack[meterStack.length-1]:null;
 if(meter)meter.dispatches=(meter.dispatches||0)+1;
}
// One place the search calls the engine. A test watches this, so a walk that
// forgot to take a node is still visible. Setup and replay call the engine
// directly and stay outside the count. The watch runs only after the
// transition returns, matching the node that was kept.
let engineWatch=null;
export function watchEngineDispatch(fn){
 const previous=engineWatch;
 engineWatch=typeof fn==='function'?fn:null;
 return ()=>{engineWatch=previous;};
}
export function engineDispatch(pack,state,action,extra){
 const next=dispatchUniversalAction(pack,state,action,extra);
 if(engineWatch)engineWatch();
 return next;
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
// when the front is empty are reasons to move anyway. holdInfo is off unless
// this search asked for it. While it is on, an empty front is not a reason
// to move when that move leaves a known front play unpaid, and that play
// would have drawn or looked at new cards. The view is cached per factor, so
// a default call and an opted-in call on the same state do not share a row.
function moveKey(action){
 const hold=searchFactors().holdInfo===true?'hold':'';
 return [action.uid,action.slot??'',action.replaceUid||'',hold].join(':');
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
 const infoHold=!!judged?.stranded&&!benefit;
 const reason=infoHold?'info-front':!dropped.length?'energy-held':
  benefit==='lethal'?'lethal':benefit==='raid'?'raid':benefit==='block'?'block':
  benefit==='enough'?'enough':lethal==='unproven'?'unproven':rawStrip?'curve-hand':'open';
 return {before,after,beforeColors,afterColors,dropped,curve:parts.curve,wantsColor,
  strip:(rawStrip&&!benefit)||infoHold,benefit,lethal,lethalLine:judged?.line||null,reason};
}
function probeStep(pack,cursor,action){
 if(!takeProbeNode())return {stop:'budget'};
 const seat=cursor.pending?.player??cursor.active;
 try{
  const state=engineDispatch(pack,cursor,action,{actor:seat});
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
function lifeSavingMove(pack,state,actor,action,beforeColors,afterColors,ignoreEnabledPlay=false){
 if(!ignoreEnabledPlay&&keptEnergyEnablesPlay(pack,state,actor,beforeColors,afterColors))return false;
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
// A draw or a look that is printed on the play and is not behind an optional
// choice or a condition. The live deck is not read. An optional follow-up,
// such as choosing a character after the draw, is not itself the information.
const PUBLIC_INFO=new Set(['draw','peekTopOne','peekTopOrBottom','millTop','drawDiscard',
 'searchDeckOne','searchDeckMany','searchDeckWhere','searchTopOneBottomDiscard',
 'searchTopUpToTwoBottom','searchTopAddOneMillRest','inspectTopArrange','inspectTopAnyOutside']);
function effectInforms(effect){
 if(!effect||typeof effect!=='object')return false;
 if(effect.optional===true||effect.when||effect.whenName||effect.require)return false;
 if(PUBLIC_INFO.has(effect.op))return true;
 return Array.isArray(effect.then)&&effect.then.some(effectInforms);
}
// Q51: a timing listed in the raid frame does not resolve on an ordinary
// entry. Printed text that stays inside that frame is not information this
// play will gain. The lookup is the shared frame table, not a card exception.
function liveOnPlayInforms(printed){
 if(!printed||raidBoxListed(printed.id,'onPlay'))return false;
 return onPlayList(printed).some(effectInforms);
}
// The main-phase list is read on a copy. This is not a transition, so it does
// not take a search node and does not reveal the deck.
function listedFrontPlay(pack,state,actor,uid){
 if(state?.pending)return false;
 const copy=structuredClone(state);
 copy.phase='main';
 copy.active=actor;
 try{
  return legalUniversalActions(pack,copy).some(action=>action?.type==='play'&&action.line==='front'&&action.uid===uid);
 }catch{return false;}
}
// The hand can pay a front character, that character's entry gains new
// information, and the energy after this move can no longer pay it. A play
// that is still payable, or that cannot enter the front, is not this case.
function infoFrontStranded(pack,state,actor,beforeColors,afterColors){
 const mine=state.players?.[actor];
 if(!mine)return false;
 const catalog=packOf(pack,actor).cards;
 const ready=(mine.apCards||[]).filter(card=>card?.ready).length;
 for(const card of mine.hand||[]){
  const printed=catalog[card?.cardId];
  if(!printed||printed.type!=='character'||printed.frontForbidden)continue;
  if(!liveOnPlayInforms(printed))continue;
  let cost;
  try{cost=effectiveHandRequiredEnergy(pack,state,actor,printed,card);}catch{continue;}
  const before=beforeColors[printed.color]||0;
  const after=afterColors[printed.color]||0;
  if(!(cost<=before&&cost>after))continue;
  if(ready<apCost(printed))continue;
  if(listedFrontPlay(pack,state,actor,card.uid))return true;
 }
 return false;
}
function moveBenefit(pack,state,actor,action,beforeColors,afterColors,after,parts){
 const stranded=searchFactors().holdInfo===true&&infoFrontStranded(pack,state,actor,beforeColors,afterColors);
 if(after>=parts.curve&&!stranded)return {benefit:'enough',lethal:'no',stranded:false};
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
   if(lethal==='lethal')return {benefit:'lethal',lethal,line,stranded};
  }
  const bp=bpOf(pack,state,body);
  const baseName=squash(catalog[body.cardId]?.name);
  if(baseName){
   for(const card of state.players[actor].hand||[]){
    const printed=catalog[card?.cardId];
    if(!printed?.raidName)continue;
    const names=[printed.raidName,...(printed.raidBaseNames||[])].map(squash);
    if(!names.includes(baseName))continue;
    if((printed.energy||0)<=(afterColors[printed.color]||0))return {benefit:'raid',lethal,line,stranded};
   }
  }
  const ownFront=(state.players[actor].front||[]).filter(Boolean);
  const threats=(state.players[opp].front||[]).filter(card=>card?.ready);
  // One smaller body is not a block. The ready attackers that are still
  // larger stay, and dropping the color the hand needs is still a strip.
  // Matching the front while holdInfo is on does not justify a move that
  // leaves a known information play unpaid. A confirmed lethal, a raid the
  // remaining energy pays, and a move that is the difference between losing
  // now and still having a life stay available.
  if(!stranded&&!ownFront.length&&threats.length&&threats.every(wall=>bp>=bpOf(pack,state,wall)))return {benefit:'block',lethal,line,stranded};
  if(lifeSavingMove(pack,state,actor,action,beforeColors,afterColors,stranded))return {benefit:'block',lethal,line,stranded};
 }
 return {benefit:null,lethal,line,stranded};
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
// Same four steps as the static eval's next attack. This ranks one front
// slot; it is not a second copy of the position score.
function attackSteps(bp){
 if(bp>=4000)return 12;
 if(bp>=3000)return 8;
 if(bp>=2000)return 4;
 return 0;
}
// The reserved front slot used to follow string order. The score mixes the
// body's attack, what its printed effect adds, whether this turn can pay it,
// and the energy the curve still wants from a generator. No one term is a filter.
export function frontCoverageScore(pack,state,viewer,action){
 if(action?.type!=='play'||action?.line!=='front'||!action.uid)return null;
 const catalog=packOf(pack,viewer).cards;
 const card=(state.players?.[viewer]?.hand||[]).find(item=>item?.uid===action.uid);
 const printed=card&&catalog[card.cardId];
 if(!printed||printed.type!=='character')return null;
 const bp=Number(printed.bp)||0;
 const cost=Number(printed.energy)||0;
 const gen=Number(printed.gen)||0;
 const colors=colorsOf(pack,state,viewer);
 const payable=cost<=(colors[printed.color]||0);
 let contest=0;
 const threats=(state.players?.[1-viewer]?.front||[]).filter(item=>item?.ready);
 if(threats.length){
  let answered=0;
  for(const threat of threats)if(bp>=bpOf(pack,state,threat))answered++;
  contest=answered/threats.length*6;
 }
 const plays=printed.effects?.onPlay;
 let effect=0;
 if(Array.isArray(plays)&&plays.length)effect+=Math.min(plays.length,2)*2;
 if(raidReady(catalog,printed,state.players?.[viewer]))effect+=4;
 else if(printed.raidName)effect+=1;
 if(printed.trigger)effect+=1;
 if(printed.mainAbility||(Array.isArray(printed.printedMains)&&printed.printedMains.length))effect+=1;
 const costTerm=payable?-cost*0.5:-20-cost;
 const parts=strategyParts(pack,state,viewer);
 const energyUse=gen>0&&(parts.deficit>0||parts.stranded>0)?Math.min(gen,2)*2+Math.min(parts.deficit,3):0;
 return attackSteps(bp)+contest+effect+costTerm-energyUse;
}
function rowOf(rows,action){
 if(!action)return null;
 const key=JSON.stringify(action);
 return (rows||[]).find(row=>row?.executed!==false&&JSON.stringify(row.action)===key)||null;
}
function provenWin(row){return row?.boundary==='terminal'&&row.search>=90000;}
// A preference may replace the searched action only when that replacement was
// searched to the same boundary and did not score worse there. A deeper line
// is not treated as better. A confirmed win stays, and a known immediate loss
// is not put back over another line.
export function evidencedChoice(previous,choice,rows){
 if(!previous||!choice||JSON.stringify(previous)===JSON.stringify(choice))return choice;
 const before=rowOf(rows,previous);
 const after=rowOf(rows,choice);
 if(provenWin(before))return previous;
 if(provenWin(after))return choice;
 if(provenLoss(before)){
  if(!provenLoss(after))return choice;
 }else if(provenLoss(after))return previous;
 if(!before||!Number.isFinite(before.search))return choice;
 if(!after||!Number.isFinite(after.search))return previous;
 if(after.boundary!==before.boundary)return previous;
 if(after.search<before.search)return previous;
 return choice;
}
// The generator preference can name an energy play the beam never ran.
// That play is not evidence. Keep the searched front unless the energy line
// was executed, stopped on the same boundary, and did not score worse.
// A proven win stays. An executed terminal line that is not an immediate
// loss can still leave a finished loss. An energy line that was not searched
// is not that save, and a shallower score is not a reason to switch.
export function generatorEvidenceChoice(previous,choice,rows){
 if(previous?.type!=='play'||previous.line!=='front'||!previous.uid)return choice;
 if(choice?.type!=='play'||choice.line!=='energy')return choice;
 if(JSON.stringify(previous)===JSON.stringify(choice))return choice;
 const before=rowOf(rows,previous);
 const after=rowOf(rows,choice);
 if(provenWin(before))return previous;
 if(provenWin(after))return choice;
 if(provenLoss(before)&&terminalSave(after))return choice;
 if(provenLoss(after))return previous;
 if(!after||after.executed===false||!Number.isFinite(after.search))return previous;
 if(!before||before.executed===false||!Number.isFinite(before.search))return previous;
 if(after.boundary!==before.boundary)return previous;
 if(after.search<before.search)return previous;
 return choice;
}
function terminalSave(row){
 return !!row&&row.executed!==false&&row.boundary==='terminal'&&Number.isFinite(row.search)&&row.search>-90000;
}
// ab-front uses the same evidence rule, and only for one replacement:
// our main phase, nothing pending, the search chose a front play, and a
// later preference changed it to an energy play or to passing. Start-phase
// draws, moves, discards, triggers and every other choice stay as the
// preference left them. A same-boundary energy line that scores at least
// as high still replaces the front.
export function frontEvidenceChoice(state,actor,previous,choice,rows){
 if(!state||state.phase!=='main'||state.pending||state.active!==actor)return choice;
 if(previous?.type!=='play'||previous.line!=='front')return choice;
 const toEnergy=choice?.type==='play'&&choice.line==='energy';
 if(!toEnergy&&choice?.type!=='next')return choice;
 return evidencedChoice(previous,choice,rows);
}
// A confirmed play is affordable when it is legal now and its printed action
// points and color cost fit what is already on the field. A pass has no cost.
function confirmedPayable(pack,state,actor,choice){
 if(!choice)return false;
 let legal=[];
 try{legal=legalUniversalActions(pack,state);}catch{return false;}
 if(!legal.some(action=>JSON.stringify(action)===JSON.stringify(choice)))return false;
 if(choice.type==='next')return true;
 if((choice.type!=='play'&&choice.type!=='event')||!choice.uid)return false;
 const mine=state.players?.[actor];
 const card=[...(mine?.hand||[])].find(item=>item?.uid===choice.uid);
 const printed=card&&packOf(pack,actor).cards?.[card.cardId];
 if(!printed||(printed.type!=='character'&&printed.type!=='event'))return false;
 const cost=Number(printed.energy)||0;
 const have=colorsOf(pack,state,actor)[printed.color]||0;
 const ready=(mine?.apCards||[]).filter(item=>item?.ready).length;
 return cost<=have&&apCost(printed)<=ready;
}
// The main-front gate sits after energy, confirmed choices, and survival
// protection. A searched character front is compared with the later energy
// play or pass only when both lines reached the same boundary. A different
// boundary is not a reason to cancel the confirmed plan. The caller may spend
// the nodes still in the shared pool to bring the shorter line up to that
// boundary first. When the pool cannot produce that comparison, the confirmed
// plan stays if it is legal and payable. A proven win still comes first.
// The same-boundary rule is unchanged: a line that does not score worse
// replaces the front, including a 4000. Start, move, discard, trigger, and
// every other original choice stay with the preference.
export function mainFrontEvidenceChoice(pack,state,actor,previous,choice,rows){
 if(!state||state.phase!=='main'||state.pending||state.active!==actor)return choice;
 if(previous?.type!=='play'||previous.line!=='front'||!previous.uid)return choice;
 const toEnergy=choice?.type==='play'&&choice.line==='energy';
 if(!toEnergy&&choice?.type!=='next')return choice;
 const before=rowOf(rows,previous);
 if(!before||!Number.isFinite(before.search))return choice;
 const hand=state.players?.[actor]?.hand||[];
 const card=hand.find(item=>item?.uid===previous.uid);
 const printed=card&&packOf(pack,actor).cards?.[card.cardId];
 if(printed?.type!=='character')return choice;
 const after=rowOf(rows,choice);
 if(provenWin(before))return previous;
 if(provenWin(after))return choice;
 if(provenLoss(before)){
  if(!provenLoss(after))return choice;
 }else if(provenLoss(after))return previous;
 if(after&&Number.isFinite(after.search)&&after.boundary===before.boundary)
  return evidencedChoice(previous,choice,rows);
 if(!after||!Number.isFinite(after.search))return previous;
 return confirmedPayable(pack,state,actor,choice)?choice:previous;
}
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
const PHASE_RANK={start:1,move:2,main:3,attack:4};
const STOP_RANK={terminal:5,returned:4,yielded:3,pending:2,open:1};
function phaseRank(row){return PHASE_RANK[row?.phase]||0;}
function stopRank(row){return STOP_RANK[row?.boundary]||0;}
// Idle main only. The comparable set is an unfinished front, and an executed
// energy play of a different card stopped at a later phase. Those scores are
// not ranked against each other. The caller receives the later energy lines
// so the earlier front is not the winner by default. A returned or terminal
// line, a raid already in the comparison, and the same card's own energy
// stay with the existing comparison. A proven loss is not a landing spot.
export function laterEnergyCandidates(state,actor,scored,comparable){
 if(!state||state.phase!=='main'||state.pending||state.active!==actor)return null;
 if(!comparable?.length)return null;
 if(comparable.some(row=>row?.boundary==='returned'||row?.boundary==='terminal'))return null;
 if((scored||[]).some(row=>row?.executed!==false&&row.boundary==='terminal'&&row.search>=90000))return null;
 const front=row=>row?.executed!==false&&row.action?.type==='play'&&row.action.line==='front';
 const energy=row=>row?.executed!==false&&row.action?.type==='play'&&row.action.line==='energy'&&Number.isFinite(row.search);
 const developing=comparable.filter(row=>row?.action?.type!=='next'&&row?.action?.type!=='extraDraw');
 if(!developing.length||!developing.every(front))return null;
 if(comparable.some(row=>row?.action?.type==='raid'))return null;
 const frontPhase=Math.max(...developing.map(phaseRank));
 const frontUids=new Set(developing.map(row=>row.action.uid));
 const later=(scored||[]).filter(row=>energy(row)&&!provenLoss(row)&&!frontUids.has(row.action.uid)&&phaseRank(row)>frontPhase);
 if(!later.length)return null;
 const furthest=Math.max(...later.map(phaseRank));
 const reached=later.filter(row=>phaseRank(row)===furthest);
 const deepest=Math.max(...reached.map(stopRank));
 const sameStop=reached.filter(row=>stopRank(row)===deepest);
 const raids=(scored||[]).filter(row=>row?.executed!==false&&row.action?.type==='raid'&&!provenLoss(row)&&
  phaseRank(row)>=furthest&&stopRank(row)>=deepest);
 return [...sameStop,...raids];
}
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
function apCost(printed){
 return Number.isInteger(printed?.ap)?printed.ap:1;
}
// Two deck-look generators can raise a line-switch that is not payable yet,
// and that line-switch spends the last action point. The live deck is not
// read: a refund counts only after the card is in hand and the cost is legal.
function filterChainUsesAp(pack,state,actor){
 const mine=state.players?.[actor];
 if(!mine)return false;
 const ready=(mine.apCards||[]).filter(card=>card?.ready).length;
 if(ready<2)return false;
 const catalog=packOf(pack,actor).cards;
 const start=colorsOf(pack,state,actor);
 const have={...start};
 let ap=ready;
 let slots=(mine.energy||[]).filter(slot=>!slot).length;
 const hand=mine.hand||[];
 const filters=hand.filter(card=>sequencedFilter(catalog[card?.cardId]))
  .sort((a,b)=>(catalog[a.cardId].energy||0)-(catalog[b.cardId].energy||0));
 const used=new Set();
 for(const card of filters){
  const printed=catalog[card.cardId];
  const pay=apCost(printed);
  if(ap<pay||slots<=0)continue;
  if((Number(printed.energy)||0)>(have[printed.color]||0))continue;
  have[printed.color]=(have[printed.color]||0)+(printed.gen||0);
  ap-=pay;
  slots-=1;
  used.add(card.uid);
 }
 if(ready-ap<1||ap!==1)return false;
 return hand.some(card=>{
  if(used.has(card.uid))return false;
  const printed=catalog[card.cardId];
  if(!lineSwitchBody(printed))return false;
  const cost=Number(printed.energy)||0;
  const was=cost<=(start[printed.color]||0);
  const now=cost<=(have[printed.color]||0);
  return !was&&now&&apCost(printed)<=ap;
 });
}
function inspectedTop(pack,state,actor){
 const pending=state?.pending;
 if(pending?.kind!=='private-top-place'||pending.player!==actor)return null;
 const top=state.players?.[actor]?.deck?.[0];
 if(!top?.cardId)return null;
 return packOf(pack,actor).cards[top.cardId]||null;
}
// The effect has already shown this top card to its controller. The rest of
// the deck stays hidden. A refund that this energy and the remaining action
// points can pay stays on top so the following draw takes it. A refund that
// cannot be paid yet is not treated as already found.
function preferInspectedRefund(pack,state,actor,choice){
 const printed=inspectedTop(pack,state,actor);
 if(!recoversActionPoints(printed))return choice;
 const have=colorsOf(pack,state,actor)[printed.color]||0;
 const ready=(state.players?.[actor]?.apCards||[]).filter(card=>card?.ready).length;
 if((Number(printed.energy)||0)>have||apCost(printed)>ready)return choice;
 let keep=null;
 try{keep=legalUniversalActions(pack,state).find(action=>action?.type==='chooseTopCard'&&action.mode==='top')||null;}
 catch{keep=null;}
 return keep||choice;
}
function onPlayList(printed){
 const list=printed?.effects?.onPlay;
 return Array.isArray(list)?list:[];
}
// A mandatory bounce is part of entering. An optional bounce can be declined,
// so it does not reduce the line. The printed energy cap is the only filter.
function mandatoryBounceEnergy(printed){
 const effect=onPlayList(printed).find(item=>item?.op==='bounceOwnOtherUnderEnergy'&&
  item.optional!==true&&Number.isInteger(item.energy));
 return effect?effect.energy:null;
}
// AP comes back only from a refund already printed on this card, with no
// gate and no optional decline. A card still in the deck is not a plan.
function unconditionalRefund(printed){
 let count=0;
 for(const effect of onPlayList(printed)){
  if(effect?.op!=='recoverAp'||!(Number(effect.count)>0))continue;
  if(effect.optional===true||effect.when||effect.whenName||effect.require)continue;
  count+=Number(effect.count);
 }
 return count;
}
function colorTotal(colors){
 return Object.values(colors||{}).reduce((sum,value)=>sum+(Number(value)||0),0);
}
function producedBy(pack,state,actor,slot){
 const mine=state.players?.[actor];
 const card=mine?.energy?.[slot];
 if(!card)return 0;
 const before=colorTotal(colorsOf(pack,state,actor));
 mine.energy[slot]=null;
 let after=before;
 try{after=colorTotal(colorsOf(pack,state,actor));}
 finally{mine.energy[slot]=card;}
 return before-after;
}
function developmentOption(printed,card,cost){
 if(!printed||printed.energyForbidden||printed.energyLineForbidden)return null;
 const refund=unconditionalRefund(printed);
 const character=printed.type==='character';
 if(!character&&!(printed.type==='event'&&refund>0))return null;
 return {
  uid:card.uid,color:printed.color,cost,ap:apCost(printed),printed:Number(printed.energy)||0,
  produce:character?(Number(printed.gen)||0):0,bounce:character?mandatoryBounceEnergy(printed):null,
  refund,character,event:printed.type==='event'
 };
}
function copyBody(body){
 if(!body)return null;
 return {...body,replay:body.replay?{...body.replay}:null};
}
function energyBoard(pack,state,actor){
 const mine=state.players?.[actor];
 const catalog=packOf(pack,actor).cards;
 const replay=card=>{
  const printed=catalog[card?.cardId];
  return printed?developmentOption(printed,card,effectiveHandRequiredEnergy(pack,state,actor,printed,card)):null;
 };
 const energy=(mine?.energy||[null,null,null,null]).map((card,slot)=>{
  if(!card)return null;
  const printed=catalog[card.cardId];
  return {uid:card.uid,color:printed?.color||'',energy:Number(printed?.energy)||0,
   produce:producedBy(pack,state,actor,slot),replay:replay(card)};
 });
 const fronts=(mine?.front||[]).filter(Boolean).map(card=>{
  const printed=catalog[card.cardId];
  return {uid:card.uid,energy:Number(printed?.energy)||0,replay:replay(card)};
 });
 return {energy,fronts,total:colorTotal(colorsOf(pack,state,actor))};
}
function copyBoard(board){
 return {energy:board.energy.map(copyBody),fronts:board.fronts.map(copyBody),total:board.total};
}
function handDevelopment(pack,state,actor,card){
 const printed=packOf(pack,actor).cards[card?.cardId];
 if(!printed)return null;
 return developmentOption(printed,card,effectiveHandRequiredEnergy(pack,state,actor,printed,card));
}
// Place one known character on the energy line. The result is the best
// legal slot after a mandatory bounce and after the card that slot already
// held. A bounced character leaves its zone and returns to hand, so a later
// play can use that same card. The card a full line replaces is removed and
// does not return. Self-bounce leaves no new energy. Optional bounces are declined.
function placeDevelopment(board,colors,option){
 if(!option?.character||(colors[option.color]||0)<option.cost)return null;
 let best=null;
 for(let slot=0;slot<board.energy.length;slot++){
  const replaced=board.energy[slot];
  const energy=board.energy.map(copyBody);
  const fronts=board.fronts.map(copyBody);
  energy[slot]={uid:option.uid,color:option.color,energy:option.printed,produce:option.produce,replay:{...option}};
  let bounced=null,self=false,returned=null;
  if(option.bounce!=null){
   const targets=[];
   energy.forEach((body,index)=>{
    if(body&&body.uid!==option.uid&&body.energy<=option.bounce)
     targets.push({kind:'energy',index,produce:body.produce||0});
   });
   fronts.forEach((body,index)=>{
    if(body&&body.uid!==option.uid&&body.energy<=option.bounce)
     targets.push({kind:'front',index,produce:0});
   });
   if(!targets.length){energy[slot]=null;self=true;}
   else{
    targets.sort((a,b)=>a.produce-b.produce||(a.kind==='front'?-1:1));
    bounced=targets[0];
    const source=bounced.kind==='energy'?board.energy[bounced.index]:board.fronts[bounced.index];
    returned=source?.replay?{...source.replay}:null;
    if(bounced.kind==='energy')energy[bounced.index]=null;
    else fronts.splice(bounced.index,1);
   }
  }
  const stayed=!self&&!!energy[slot];
  const net=(stayed?option.produce:0)-(replaced?.produce||0)-(bounced?.kind==='energy'?bounced.produce:0);
  if(!(net>0))continue;
  const nextColors=plainColors(colors);
  const drop=body=>{
   if(!body?.produce)return;
   nextColors[body.color]=(nextColors[body.color]||0)-body.produce;
   if(nextColors[body.color]<=0)delete nextColors[body.color];
  };
  drop(replaced);
  if(bounced?.kind==='energy')drop(board.energy[bounced.index]);
  if(stayed)nextColors[option.color]=(nextColors[option.color]||0)+option.produce;
  const next={energy,fronts,total:colorTotal(nextColors)};
  if(!best||net>best.net)best={board:next,colors:nextColors,net,returned};
 }
 return best;
}
function withReturn(options,returned){
 if(!returned||options.some(item=>item.uid===returned.uid))return options;
 return options.concat(returned);
}
// The key has to name every zone a later play can see. Energy slots carry
// the printed cost and the energy they still make. Fronts are bounce
// targets. Hand entries are the cards that can still be played, including
// one that just returned. Action points and the color totals are included.
function planKey(left,have,board,options){
 const colors=Object.entries(have).sort().map(entry=>entry.join(':')).join(',');
 const energy=board.energy.map(body=>body?body.uid+'/'+body.energy+'/'+body.produce:'-').join(',');
 const fronts=board.fronts.map(body=>body.uid+'/'+body.energy).sort().join(',');
 const hand=options.map(item=>[item.uid,item.cost,item.ap,item.produce,item.bounce??'',item.refund].join('/')).sort().join(',');
 return left+'|'+colors+'|'+energy+'|'+fronts+'|'+hand;
}
function reachableEnergy(options,board,colors,ap){
 const memo=new Map();
 function walk(opts,current,have,left){
  const key=planKey(left,have,current,opts);
  const saved=memo.get(key);
  if(saved)return saved;
  let best={energy:current.total,plays:0};
  memo.set(key,best);
  const keep=candidate=>{
   if(candidate.energy>best.energy||candidate.energy===best.energy&&candidate.plays>best.plays){
    best={energy:candidate.energy,plays:candidate.plays};
    memo.set(key,best);
   }
  };
  if(left>0){
   for(let index=0;index<opts.length;index++){
    const option=opts[index];
    if(option.ap>left)continue;
    const rest=opts.filter((_,item)=>item!==index);
    if(option.event){
     if((have[option.color]||0)<option.cost)continue;
     keep(walk(rest,current,have,left-option.ap+option.refund));
     continue;
    }
    const placed=placeDevelopment(current,have,option);
    if(!placed)continue;
    const next=walk(withReturn(rest,placed.returned),placed.board,placed.colors,left-option.ap+option.refund);
    keep({energy:next.energy,plays:next.plays+1});
   }
  }
  return memo.get(key);
 }
 return walk(options,board,colors,ap);
}
// A refund already in hand counts when its cost and action point fit now, or
// after a known energy play this turn can pay for. The deck is not read, and
// a draw is not assumed to bring the refund back.
function refundReachable(plays,refunds,board,colors,ap){
 const payable=(list,have,left)=>list.some(option=>option.ap<=left&&(have[option.color]||0)>=option.cost);
 if(payable(refunds,colors,ap))return true;
 const onBoard=[...board.energy,...board.fronts].some(body=>body?.replay?.refund>0);
 if(!plays.length||ap<=0||!refunds.length&&!onBoard)return false;
 const memo=new Set();
 function walk(opts,current,have,left,refundList){
  const key=planKey(left,have,current,opts)+'|'+refundList.map(item=>item.uid).sort().join(',');
  if(memo.has(key))return false;
  memo.add(key);
  if(left<=0)return false;
  for(let index=0;index<opts.length;index++){
   const option=opts[index];
   if(option.ap>left)continue;
   const placed=placeDevelopment(current,have,option);
   if(!placed)continue;
   const nextAp=left-option.ap+option.refund;
   const nextRefunds=placed.returned?.refund>0?refundList.concat(placed.returned):refundList;
   if(option.refund>0||payable(nextRefunds,placed.colors,nextAp))return true;
   if(walk(withReturn(opts.filter((_,item)=>item!==index),placed.returned),placed.board,placed.colors,nextAp,nextRefunds))return true;
  }
  return false;
 }
 return walk(plays,board,colors,ap,refunds);
}
// The known hand can finish an energy line with the action points it already
// has, and spending one of them to draw removes a play that line needs.
// One usable generator, a line that still fits after the draw, and a refund
// that can already be paid are not this case. The deck is not read.
export function reserveApPlan(pack,state,actor){
 const none={keep:false,starters:0,full:null,short:null};
 const mine=state?.players?.[actor];
 if(!mine||state.phase!=='start'||state.pending)return none;
 if(!spareForEnergy(pack,state,actor))return none;
 const ready=(mine.apCards||[]).filter(card=>card?.ready).length;
 if(ready<2)return none;
 const colors=plainColors(colorsOf(pack,state,actor));
 const board=energyBoard(pack,state,actor);
 const options=(mine.hand||[]).map(card=>handDevelopment(pack,state,actor,card)).filter(Boolean);
 const payable=option=>option.ap<=ready&&(colors[option.color]||0)>=option.cost;
 if(options.some(option=>option.refund>0&&payable(option)))return {...none,starters:0,refund:true};
 const starters=options.filter(option=>option.character&&payable(option)&&placeDevelopment(board,colors,option));
 if(starters.length<2)return {keep:false,starters:starters.length,full:null,short:null};
 const full=reachableEnergy(starters,board,colors,ready);
 const short=reachableEnergy(starters,copyBoard(board),plainColors(colors),ready-1);
 const refunds=options.filter(option=>option.refund>0);
 const refund=refundReachable(starters,refunds,copyBoard(board),plainColors(colors),ready);
 return {
  keep:!refund&&full.plays>=2&&full.energy>short.energy,
  starters:starters.length,full,short,ready,...(refund?{refund:true}:{})
 };
}
// Search may already have chosen the draw. This still returns the pass when
// the known line needs the action point the draw would spend. A proven win
// on the draw, and a proven loss on the pass, stay where they are.
export function preferReserveAp(pack,state,actor,choice,rows){
 if(searchFactors().reserveAp!==true)return choice;
 if(choice?.type!=='extraDraw')return choice;
 const won=(rows||[]).find(row=>row?.executed!==false&&row.action?.type==='extraDraw'&&
  row.boundary==='terminal'&&row.search>=90000);
 if(won)return choice;
 const loss=(rows||[]).find(row=>row?.executed!==false&&row.action?.type==='next'&&
  row.boundary==='terminal'&&row.search<=-90000);
 if(loss)return choice;
 if(!reserveApPlan(pack,state,actor).keep)return choice;
 let pass=null;
 try{pass=legalUniversalActions(pack,state).find(action=>action?.type==='next')||null;}
 catch{pass=null;}
 return pass||choice;
}
// The start-phase draw spends one AP and is scored on the belief deck, not
// the live top. When the hand is still short of energy and one AP remains
// afterwards, take the draw and plan the main from the card that arrives.
// A proven win without the draw, or a proven loss from the draw, stays.
// A filter chain that spends every action point, including the line-switch
// backup, does not take the draw. Exactly three playable cards is not enough
// on its own: the chain has to be the look plus the backup.
export function preferEarlyDraw(pack,state,actor,choice,rows){
 if(state?.pending?.kind==='private-top-place')return preferInspectedRefund(pack,state,actor,choice);
 if(state?.phase!=='start'||state.pending)return choice;
 if(filterChainUsesAp(pack,state,actor)){
  let pass=null;
  try{pass=legalUniversalActions(pack,state).find(action=>action?.type==='next')||null;}
  catch{pass=null;}
  if(!pass)return choice;
  const row=(rows||[]).find(item=>item?.action?.type==='next'&&item.executed!==false);
  if(row?.boundary==='terminal'&&row.search<=-90000)return choice;
  return pass;
 }
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
// The refund is in hand and the line-switch backup is legal on the last
// action point. Playing the refund first is the branch that still leaves the
// backup. A refund that is not in hand is not assumed from the deck.
function preferHeldRefund(pack,state,actor,choice,rows){
 if(state?.pending||state?.phase!=='main')return choice;
 if((state.players?.[actor]?.apCards||[]).filter(card=>card?.ready).length!==1)return choice;
 let legal=[];
 try{legal=legalUniversalActions(pack,state);}catch{return choice;}
 if(legal.some(action=>filterEnergyFirst(pack,state,actor,action)))return choice;
 const catalog=packOf(pack,actor).cards;
 const hand=state.players?.[actor]?.hand||[];
 const event=legal.find(action=>{
  if(action?.type!=='event'||!action.uid)return false;
  const card=hand.find(item=>item?.uid===action.uid);
  return recoversActionPoints(card&&catalog[card.cardId]);
 });
 if(!event)return choice;
 if(!legal.some(action=>action?.type==='play'&&action.line==='energy'&&action.uid&&
  lineSwitchBody(catalog[hand.find(item=>item?.uid===action.uid)?.cardId])))return choice;
 return guarded(choice,rows,event);
}
function guarded(choice,rows,play){
 if(!play)return choice;
 const row=(rows||[]).find(item=>item?.executed!==false&&JSON.stringify(item.action)===JSON.stringify(play));
 if(!row||(row.boundary==='terminal'&&row.search<=-90000))return choice;
 const win=(rows||[]).find(item=>item?.executed!==false&&item.boundary==='terminal'&&item.search>=90000);
 if(win&&JSON.stringify(win.action)!==JSON.stringify(play))return choice;
 return play;
}
// The look that makes the line-switch payable is played before another energy
// body. The search still has to have run the line for its score to be used.
function preferOpenFilter(pack,state,actor,choice,rows){
 if(state?.pending||state?.phase!=='main')return choice;
 let legal=[];
 try{legal=legalUniversalActions(pack,state);}catch{return choice;}
 const plays=legal.filter(action=>filterEnergyFirst(pack,state,actor,action));
 const played=plays.find(action=>(rows||[]).some(item=>item?.executed!==false&&JSON.stringify(item.action)===JSON.stringify(action)));
 return guarded(choice,rows,played);
}
// With the looks already played and no refund in hand, the last action point
// is the line-switch. A rested character that just entered is not a blocker.
function preferLastSwitch(pack,state,actor,choice,rows){
 if(state?.pending||state?.phase!=='main')return choice;
 let legal=[];
 try{legal=legalUniversalActions(pack,state);}catch{return choice;}
 if(legal.some(action=>filterEnergyFirst(pack,state,actor,action)))return choice;
 const catalog=packOf(pack,actor).cards;
 const hand=state.players?.[actor]?.hand||[];
 if(legal.some(action=>action?.type==='event'&&recoversActionPoints(catalog[hand.find(card=>card?.uid===action.uid)?.cardId])))return choice;
 const play=legal.find(action=>lastApLineSwitch(pack,state,actor,action));
 return guarded(choice,rows,play);
}
// The printed move rests two other fronts and then effectMoveTo. That move
// keeps the source object, including ready. A confirmed win is not walked
// again. Ready, attack bans, and a quiet attack entry are read in place.
// Anything those do not answer takes one shared node before each transition
// and stops when the clock or the pool is already spent. An unfinished
// answer stays unknown: it is not proof that the body cannot attack.
function sameAction(a,b){
 return JSON.stringify(a)===JSON.stringify(b);
}
function confirmedWin(rows){
 return (rows||[]).some(row=>row?.executed!==false&&row.boundary==='terminal'&&row.search>=90000);
}
function paidShiftAttack(rows,choice){
 const row=(rows||[]).find(item=>item?.executed!==false&&sameAction(item.action,choice));
 return !!row?.sequence?.some(step=>step?.type==='attack'&&step.uid===choice.uid);
}
function attackEntryChanges(pack,state,actor){
 if(state?.phase==='attack'&&!state.pending)return false;
 if(state?.phase!=='main'||state.pending)return true;
 if((state.effectQueue||[]).length)return true;
 if((state.delayedEffects||[]).some(item=>item&&item.turn===state.turn&&item.owner===actor))return true;
 const mine=state.players?.[actor];
 const catalog=packOf(pack,actor).cards;
 const bodies=[...(mine?.front||[]),...(mine?.energy||[])].filter(Boolean);
 for(const card of bodies){
  const printed=catalog[card.cardId];
  if(printed?.phaseEffects?.some(item=>item?.phase==='attack'&&item?.edge==='start'))return true;
 }
 return (state.continuousStates||[]).some(item=>item?.until?.player===actor&&item.until.phase==='main'&&
  item.until.edge==='end'&&(item.kind==='cannotAttack'||item.kind==='cannotActive'||item.kind==='skipNextActive'));
}
function readableAttack(pack,state,actor,card){
 if(!card)return null;
 if(card.ready!==true)return false;
 const printed=packOf(pack,actor).cards[card.cardId];
 if(!printed||printed.type!=='character')return false;
 try{if(aot2AttackBlocked(pack,state,actor,card))return false;}catch{return null;}
 if(card.attackBanned&&card.attackBanned.turn===state.turn&&card.attackBanned.stamp===card.fieldEntryStamp&&
  !originalEffectsDisabled(state,card))return false;
 let restrictions=[];
 try{restrictions=fieldRestrictions(state,actor,card);}catch{return null;}
 if(restrictions.some(row=>row.kind==='cannotAttack'))return false;
 if(!originalEffectsDisabled(state,card)){
  if(printed.attackEnergyMin&&energyOf(pack,state,actor)<printed.attackEnergyMin)return false;
  if(printed.attackDeckAtMost&&(state.players?.[actor]?.deck?.length||0)>printed.attackDeckAtMost)return false;
  if(printed.attackRequiresName)return null;
 }
 const cap=state.attackCap?.[actor];
 if(cap!=null&&(state.attacksThisTurn||0)>=cap)return false;
 return true;
}
// Charge the shared pool before the transition. A direct call with no search
// binding is the proof itself. A miss gives the node back. The meter moves
// only when the transition is kept.
function chargeSharedDispatch(pack,cursor,action){
 const budget=probeBudget();
 const seat=cursor?.pending?.player??cursor?.active;
 if(!budget){
  try{return {state:engineDispatch(pack,cursor,action,{actor:seat})};}
  catch{return {stop:'error'};}
 }
 const expired=typeof budget.now==='function'&&budget.now()>budget.deadline;
 if(expired||!(budget.pool?.n>0))return {stop:'budget'};
 budget.pool.n--;
 try{
  const state=engineDispatch(pack,cursor,action,{actor:seat});
  noteDispatch();
  return {state};
 }catch{
  budget.pool.n++;
  return {stop:'error'};
 }
}
function probeShiftAttacks(pack,state,actor,choice){
 try{
  let cursor=structuredClone(state);
  const opened=chargeSharedDispatch(pack,cursor,choice);
  if(opened.stop)return null;
  cursor=opened.state;
  for(let guard=0;guard<8&&cursor.pending&&cursor.status==='playing';guard++){
   const steps=legalUniversalActions(pack,cursor);
   const step=steps.find(action=>action?.type==='chooseRestTwo')||steps.find(action=>action?.type==='chooseSelfFront');
   if(!step)return false;
   const stepped=chargeSharedDispatch(pack,cursor,step);
   if(stepped.stop)return null;
   cursor=stepped.state;
  }
  if(cursor.pending||cursor.status!=='playing')return null;
  if(cursor.phase==='main'){
   const pass=legalUniversalActions(pack,cursor).find(action=>action?.type==='next');
   if(!pass)return false;
   const stepped=chargeSharedDispatch(pack,cursor,pass);
   if(stepped.stop)return null;
   cursor=stepped.state;
  }
  if(cursor.phase!=='attack'||cursor.pending||cursor.active!==actor)return null;
  const moved=[...(cursor.players?.[actor]?.front||[]),...(cursor.players?.[actor]?.energy||[])].find(card=>card?.uid===choice.uid);
  if(!moved?.ready)return false;
  return legalUniversalActions(pack,cursor).some(action=>action?.type==='attack'&&action.uid===choice.uid);
 }catch{return null;}
}
function probeFrontAttackers(pack,state,actor){
 try{
  let cursor=structuredClone(state);
  if(cursor.pending)return null;
  if(cursor.phase==='main'){
   const pass=legalUniversalActions(pack,cursor).find(action=>action?.type==='next');
   if(!pass)return null;
   const stepped=chargeSharedDispatch(pack,cursor,pass);
   if(stepped.stop)return null;
   cursor=stepped.state;
  }
  if(cursor.phase!=='attack'||cursor.pending||cursor.active!==actor)return null;
  const attacks=new Set(legalUniversalActions(pack,cursor).filter(action=>action?.type==='attack').map(action=>action.uid));
  return (state.players?.[actor]?.front||[]).filter(card=>card&&attacks.has(card.uid)).length;
 }catch{return null;}
}
function shiftCanAttack(pack,state,actor,choice,rows){
 if(paidShiftAttack(rows,choice))return true;
 const mine=state.players?.[actor];
 const body=[...(mine?.energy||[]),...(mine?.front||[])].find(card=>card?.uid===choice.uid);
 if(!body)return null;
 if(!attackEntryChanges(pack,state,actor)){
  const read=readableAttack(pack,state,actor,body);
  if(read===true||read===false)return read;
 }
 if(confirmedWin(rows))return null;
 return probeShiftAttacks(pack,state,actor,choice);
}
function frontAttackCount(pack,state,actor,rows){
 if(state?.phase==='attack'&&!state.pending&&state.active===actor){
  try{
   const attacks=new Set(legalUniversalActions(pack,state).filter(action=>action?.type==='attack').map(action=>action.uid));
   return (state.players?.[actor]?.front||[]).filter(card=>card&&attacks.has(card.uid)).length;
  }catch{return null;}
 }
 if(!attackEntryChanges(pack,state,actor)){
  const fronts=(state.players?.[actor]?.front||[]).filter(Boolean);
  let count=0;
  for(const card of fronts){
   const open=readableAttack(pack,state,actor,card);
   if(open==null)return null;
   if(open)count++;
  }
  return count;
 }
 if(confirmedWin(rows))return null;
 return probeFrontAttackers(pack,state,actor);
}
function preferKeepReadyFront(pack,state,actor,choice,rows){
 if(choice?.type!=='activate'||state?.pending)return choice;
 const foes=(state.players?.[1-actor]?.front||[]).filter(Boolean);
 if(foes.length)return choice;
 const mine=state.players?.[actor];
 const body=[...(mine?.energy||[]),...(mine?.front||[])].find(card=>card?.uid===choice.uid);
 const printed=body&&packOf(pack,actor).cards[body.cardId];
 if(printed?.mainAbility?.op!=='restTwoActiveFrontMoveSelf')return choice;
 if(shiftCanAttack(pack,state,actor,choice,rows)!==false)return choice;
 if(!(frontAttackCount(pack,state,actor,rows)>=2))return choice;
 let pass=null;
 try{pass=legalUniversalActions(pack,state).find(action=>action?.type==='next')||null;}
 catch{pass=null;}
 if(!pass)return choice;
 const row=(rows||[]).find(item=>item?.executed!==false&&sameAction(item.action,pass));
 if(row?.boundary==='terminal'&&row.search<=-90000)return choice;
 return pass;
}
export function confirmedChoiceTrace(pack,state,actor,choice,rows){
 const early=preferEarlyDraw(pack,state,actor,choice,rows);
 const reserved=searchFactors().reserveAp===true?preferReserveAp(pack,state,actor,early,rows):early;
 const opened=preferOpenFilter(pack,state,actor,reserved,rows);
 const refund=preferHeldRefund(pack,state,actor,opened,rows);
 const switched=preferLastSwitch(pack,state,actor,refund,rows);
 const ready=preferKeepReadyFront(pack,state,actor,switched,rows);
 const steps=[['early-draw',early]];
 if(searchFactors().reserveAp===true)steps.push(['reserve-ap',reserved]);
 steps.push(['open-filter',opened],['refund',refund],['line-switch',switched],['ready-front',ready]);
 return {choice:ready,steps};
}
export function preferConfirmedChoices(pack,state,actor,choice,rows){
 return confirmedChoiceTrace(pack,state,actor,choice,rows).choice;
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
