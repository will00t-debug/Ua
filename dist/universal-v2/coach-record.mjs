// Solo-vs-computer training rows. The model sees only the acting seat's
// public view plus cards that seat is already allowed to inspect.
// Win/loss stays on the match label. Debug replays are a different file.
// AI moves are not written as player decisions.
import {legalUniversalActions,dispatchUniversalAction,universalActor,
 universalPublicView,universalPrivateChoices,UNIVERSAL_V2_VERSION} from './engine.mjs';
import {replayUniversalPreview} from './preview-replay.mjs';
import {DECISION_FORMAT,classifyDecision,publicHistoryFrom,chainOf,deckSnapshot} from './coach-format.mjs';

export {newCoachMatchId} from './coach-format.mjs';
export {classifyDecision,publicHistoryFrom};

export const COACH_REASONS=Object.freeze([
 ['','不填理由'],
 ['energy','先補能源'],
 ['base','保留底座'],
 ['clear','先解場'],
 ['attack-order','改變攻擊順序']
]);

const same=value=>JSON.stringify(value);

export function coachHeader({matchId,packs,counts,aiVersion,engineVersion=UNIVERSAL_V2_VERSION,channel='solo',matchLink=null}){
 return {
  matchId,matchLink:matchLink||matchId,channel,mode:channel,engine:'universal-v2',engineVersion,
  pool:{titles:packs.map(pack=>pack.id),versions:packs.map(pack=>pack.version)},
  aiVersion,deck:deckSnapshot(packs[0].id,counts)
 };
}

function privateView(raw){
 if(!raw)return null;
 const view={kind:raw.kind};
 if(raw.step!=null)view.step=String(raw.step);
 if(Array.isArray(raw.inspected))view.inspected=raw.inspected.map(card=>({
  uid:card.uid,cardId:card.cardId,name:card.name,color:card.color||''
 }));
 if(Array.isArray(raw.options))view.options=raw.options.map(option=>({action:option.action}));
 return view;
}

export function coachObservation(packs,state,seat){
 const visible=universalPublicView(packs,state,seat);
 delete visible.winner;
 if(visible.status!=='playing')throw Error('只記錄進行中的決策。');
 return {visible,private:privateView(universalPrivateChoices(packs,state,seat))};
}

export function stateAtReplayIndex(packs,replay,replayIndex){
 if(!replay||!Number.isInteger(replayIndex)||replayIndex<0||replayIndex>replay.actions.length)
  throw Error('找不到這個步驟。');
 return replayUniversalPreview(packs,{...replay,actions:replay.actions.slice(0,replayIndex)});
}

function decision(packs,state,seat,provided){
 if(universalActor(state)!==seat)throw Error('還不是這個座位的決策。');
 const legal=(Array.isArray(provided)?provided:legalUniversalActions(packs,state)).map(action=>structuredClone(action));
 return {legal,observation:coachObservation(packs,state,seat)};
}

export function buildHumanStep({packs,state,action,step,replayIndex,previous,header,legal:providedLegal}){
 const {legal,observation}=decision(packs,state,0,providedLegal);
 const choice=structuredClone(action);
 if(!legal.some(item=>same(item)===same(choice)))throw Error('玩家選擇不在目前的合法操作裡。');
 const clientKey=header.matchId+':'+step+':human';
 const link=previous?{step:previous.step,type:previous.type,replayIndex:previous.replayIndex,
  ...(previous.clientKey?{clientKey:previous.clientKey}:{})}:null;
 return {
  format:DECISION_FORMAT,
  clientKey,step,replayIndex,source:'human',actor:'human',seat:0,...header,
  turn:observation.visible.turn,phase:observation.visible.phase,
  observation,publicHistory:publicHistoryFrom(observation.visible),
  legal,choice,forced:legal.length===1,decisionClass:classifyDecision(choice),
  previous:link,chain:chainOf(header.matchId,step,link,clientKey)
 };
}

export function buildAiMark({packs,state,action,step,replayIndex,header,reason=''}){
 const {legal,observation}=decision(packs,state,1);
 const original=structuredClone(action);
 if(!legal.some(item=>same(item)===same(original)))throw Error('電腦選擇不在當時的合法操作裡。');
 return {
  ...header,
  format:'ua-v2-coach-demo-v1',
  clientKey:header.matchId+':ai:'+replayIndex,
  step,replayIndex,source:'ai',actor:'ai',seat:1,observation,legal,original,
  correction:null,demonstration:[],reason
 };
}

export function buildAiDemonstration(mark,actions,reason=''){
 if(!Array.isArray(actions)||actions.length<1||actions.length>8)
  throw Error('請先選一個做法。');
 const demonstration=actions.map(action=>structuredClone(action));
 const correction=demonstration[0];
 if(demonstration.length===1&&same(correction)===same(mark.original))
  throw Error('請改一個做法，或接上後續操作。');
 if(!mark.legal.some(item=>same(item)===same(correction)))
  throw Error('修正不在當時的合法操作裡。');
 return {...mark,correction,demonstration,reason:reason||''};
}

export function pushSandbox(packs,state,action){
 const fingerprint=same(state);
 const actor=universalActor(state);
 const legal=legalUniversalActions(packs,state);
 if(!legal.some(item=>same(item)===same(action)))throw Error('這不是目前的合法操作。');
 const next=dispatchUniversalAction(packs,structuredClone(state),structuredClone(action),{actor});
 if(same(state)!==fingerprint)throw Error('示範改到了原對局。');
 return next;
}

function showsUid(text,uid){return text.includes('"'+uid+'"');}
function collectDisclosed(value,ids){
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){for(const item of value)collectDisclosed(item,ids);return;}
 if(typeof value.uid==='string')ids.add(value.uid);
 for(const [key,child] of Object.entries(value))if(key!=='hand')collectDisclosed(child,ids);
}
export function hiddenLeak(state,observation,seat){
 const text=JSON.stringify(observation);
 const disclosed=new Set();
 if(observation?.visible){
  collectDisclosed({...observation.visible,players:(observation.visible.players||[]).map(player=>{
   const next={...player};
   delete next.hand;
   return next;
  })},disclosed);
 }
 for(const card of observation?.private?.inspected||[])if(card?.uid)disclosed.add(card.uid);
 const leaks=[];
 state.players.forEach((player,index)=>{
  for(const card of player.deck)if(!disclosed.has(card.uid)&&showsUid(text,card.uid))leaks.push('deck:'+card.uid);
  for(const card of player.life)if(!card.lifePublic&&card.faceUp!==true&&!disclosed.has(card.uid)&&showsUid(text,card.uid))
   leaks.push('life:'+card.uid);
  if(index!==seat)for(const card of player.hand)if(!disclosed.has(card.uid)&&showsUid(text,card.uid))
   leaks.push('hand:'+card.uid);
 });
 if(text.includes('"winner"')||text.includes('"initialCounts"')||text.includes('"seed"'))
  leaks.push('label');
 for(const card of state.players[seat].hand)if(!showsUid(text,card.uid))leaks.push('missing-own-hand:'+card.uid);
 return leaks;
}
