// Position keys for the experiment runner. The legacy key is the round-8
// detector. A progress key may replace it only after a replay shows that the
// legacy key stopped a game while the position was still advancing.
import {createHash} from 'node:crypto';
import {LOOP_LIMIT} from './constants.mjs';

export function legacyLoopKey(state){
 const pending=state.pending;
 const board=state.players.map(player=>[
  player.life.length,player.hand.length,player.deck.length,
  player.front.map(card=>card?card.uid+(card.ready?'a':'r'):'-').join('.'),
  player.energy.map(card=>card?card.uid+(card.ready?'a':'r'):'-').join('.')
 ].join('/')).join('|');
 return [state.turn,state.phase,state.active,pending?.kind||'',pending?.player??'',board].join('#');
}
// Record counters move even when the match position does not. They must not
// reset the repeat count. Choice lists such as pending.selected are the effect.
const RECORD_COUNTERS=new Set([
 'afterOrder','effectScope','visits','serial','stamp','fieldEntryStamp','rng'
]);
function progressValue(value,depth=0){
 if(value==null||typeof value!=='object')return value??null;
 if(depth>6)return '[deep]';
 if(Array.isArray(value))return value.map(item=>progressValue(item,depth+1));
 if(typeof value.uid==='string'&&('cardId' in value||'ready' in value||Array.isArray(value.buffs))){
  return {uid:value.uid,cardId:value.cardId||'',ready:value.ready===true};
 }
 const out={};
 for(const key of Object.keys(value).sort()){
  if(RECORD_COUNTERS.has(key)||typeof value[key]==='function')continue;
  out[key]=progressValue(value[key],depth+1);
 }
 return out;
}
export function progressLoopKey(state){
 const pending=progressValue(state.pending);
 const queue=progressValue(state.effectQueue||[]);
 return legacyLoopKey(state)+'#'+JSON.stringify({pending,queue});
}
export function noteProgress(tracker,state){
 const key=progressLoopKey(state);
 tracker.repeats=key===tracker.last?tracker.repeats+1:0;
 tracker.last=key;
 return {key,repeats:tracker.repeats,stop:tracker.repeats>=LOOP_LIMIT};
}

function isCard(value){
 return !!value&&typeof value==='object'&&typeof value.uid==='string'&&
  ('cardId' in value||'ready' in value||Array.isArray(value.buffs));
}
function mark(value,depth=0){
 if(value==null||typeof value!=='object')return value??null;
 if(depth>5)return '[deep]';
 if(isCard(value)){
  return {
   uid:value.uid,cardId:value.cardId||'',ready:value.ready===true,
   buffs:mark(value.buffs||[],depth+1),
   stack:(value.stack||[]).map(card=>card?.uid||null),
   under:(value.under||[]).map(card=>card?.uid||null)
  };
 }
 if(Array.isArray(value))return value.map(item=>mark(item,depth+1));
 const out={};
 for(const key of Object.keys(value).sort()){
  if(typeof value[key]==='function')continue;
  out[key]=mark(value[key],depth+1);
 }
 return out;
}
const COUNTERS=new Set([
 'rng','nextFieldEntryStamp','nextContinuousStateId','nextZoneMoveOrder'
]);
export function positionSlice(state){
 const players=(state.players||[]).map(player=>({
  life:(player.life||[]).map(card=>card?.uid||null),
  lifeRevealed:mark(player.lifeRevealed||[]),
  hand:(player.hand||[]).map(card=>card?.uid||null),
  deck:(player.deck||[]).map(card=>card?.uid||null),
  outside:mark(player.outside||[]),
  removed:mark(player.removed||[]),
  resolvingEvents:mark(player.resolvingEvents||[]),
  apCards:mark(player.apCards||[]),
  front:mark(player.front||[]),
  energy:mark(player.energy||[])
 }));
 const counters={};
 const scalars={};
 for(const key of Object.keys(state)){
  const value=state[key];
  if(typeof value==='function')continue;
  if(COUNTERS.has(key))counters[key]=value;
  else if(value==null||typeof value!=='object')scalars[key]=value;
 }
 return {
  scalars,
  counters,
  pending:mark(state.pending),
  queue:mark(state.effectQueue||[]),
  delayed:mark(state.delayedEffects||[]),
  retirementBatch:mark(state.retirementBatch),
  lifeRevealBatch:mark(state.lifeRevealBatch),
  continuousStates:mark(state.continuousStates||[]),
  publicReveals:mark(state.publicReveals||[]),
  players
 };
}
export function digest(value){
 return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function changedPaths(before,after,path='$'){
 if(Object.is(before,after))return [];
 const leftMissing=before===undefined;
 const rightMissing=after===undefined;
 if(leftMissing||rightMissing||before===null||after===null||typeof before!==typeof after||typeof before!=='object'){
  return [{path,before:before??null,after:after??null}];
 }
 if(Array.isArray(before)||Array.isArray(after)){
  if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length){
   return [{path,before,after}];
  }
  const rows=[];
  for(let i=0;i<before.length;i++)rows.push(...changedPaths(before[i],after[i],path+'['+i+']'));
  return rows;
 }
 const rows=[];
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
  rows.push(...changedPaths(before[key],after[key],path+'.'+key));
 }
 return rows;
}
export function compactAction(action){
 if(!action||typeof action!=='object')return null;
 return {
  type:action.type||null,mode:action.mode??null,line:action.line??null,
  uid:action.uid??null,baseUid:action.baseUid??null,targetUid:action.targetUid??null,
  slot:Number.isInteger(action.slot)?action.slot:null,
  cardId:action.cardId??null,index:Number.isInteger(action.index)?action.index:null
 };
}
export function sameAction(left,right){
 return JSON.stringify(compactAction(left))===JSON.stringify(compactAction(right));
}
export function openTracker(){
 return {last:null,repeats:0};
}
export function noteLegacy(tracker,state){
 const key=legacyLoopKey(state);
 tracker.repeats=key===tracker.last?tracker.repeats+1:0;
 tracker.last=key;
 return {key,repeats:tracker.repeats,stop:tracker.repeats>=LOOP_LIMIT};
}

const COUNTER_PATH=/^\$\.counters(\.|$)/;
export function classifyStop(steps){
 const run=[];
 for(let i=steps.length-1;i>=0;i--){
  run.push(steps[i]);
  if(steps[i].repeats===0)break;
 }
 run.reverse();
 const diffs=[];
 for(let i=1;i<run.length;i++){
  const paths=changedPaths(run[i-1].slice,run[i].slice);
  diffs.push({
   from:run[i-1].step,to:run[i].step,
   paths:paths.map(row=>row.path),
   counterOnly:paths.length>0&&paths.every(row=>COUNTER_PATH.test(row.path)),
   sample:paths.slice(0,12)
  });
 }
 const meaningful=diffs.filter(row=>row.paths.length>0&&!row.counterOnly);
 const unchanged=diffs.filter(row=>row.paths.length===0);
 const counterOnly=diffs.filter(row=>row.counterOnly);
 let kind='unknown';
 if(!run.length)kind='unknown';
 else if(meaningful.length)kind='false-stop';
 else if(unchanged.length===diffs.length&&diffs.length)kind='no-progress';
 else if(counterOnly.length&&!meaningful.length)kind='counter-only';
 const actions=run.map(row=>row.action).filter(Boolean);
 const uniqueActions=[...new Set(actions.map(action=>JSON.stringify(action)))];
 return {
  kind,visits:run.length,diffs,
  actions,uniqueActions:uniqueActions.length,
  sameAction:uniqueActions.length<=1
 };
}
