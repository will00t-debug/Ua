// Shared decision-log shape for solo and online matches.
// This file does not import the rules engine. Training rows are projections
// of what the acting player was allowed to see, never a full match tape.
export const DECISION_FORMAT='ua-v2-coach-step-v2';
export const LABEL_FORMAT='ua-v2-coach-label-v2';
export const JSONL_FORMAT='ua-v2-coach-jsonl-v1';
export const ENGINE_NAME='universal-v2';
export const DECISION_ENGINE_VERSION='ua-v2.0';
export const DECISION_CLASSES=Object.freeze([
 'play','move','raid','attack','block','search','discard','pay','effect','order','skip','mulligan','other'
]);
export const UNFINISHED_ENDINGS=Object.freeze(['interrupted','abandoned','error','incomplete']);
export const DECIDED_ENDINGS=Object.freeze(['life-zero','unblocked-attack','required-draw-empty','finished']);

const HISTORY_KEYS=['kind','owner','cardId','uid','name','trigger','turn','bp','damage','impact','checking','color'];
const CHOICE_KEYS=['index','type','mode','uid','baseUid','replaceUid','targetUid','retireUid','line','slot','from','label'];

export function newCoachMatchId(){
 const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));
 return 'm'+[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function onlineMatchLink(code){
 const data=new TextEncoder().encode('ua-v2-online-link:v1:'+code);
 const digest=await crypto.subtle.digest('SHA-256',data);
 const hex=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 return 'k'+hex.slice(0,32);
}

export function classifyDecision(action){
 const type=typeof action?.type==='string'?action.type:'';
 const mode=typeof action?.mode==='string'?action.mode:'';
 if(type==='openingMulligan')return 'mulligan';
 if(type==='chooseBlock')return action.uid==null?'skip':'block';
 if(type==='attack')return 'attack';
 if(type==='move'||type==='step')return 'move';
 if(type==='raid'||mode==='raid')return 'raid';
 if(type==='play'||mode==='enter'||mode==='place'||mode==='rest')return 'play';
 if(type==='next'||type==='pass'||mode==='skip'||mode==='decline'||mode==='done'||mode==='pass')return 'skip';
 if(/order/i.test(type)||mode==='order')return 'order';
 if(/pay|payment|cost/i.test(type)||/pay|payment|cost/i.test(mode))return 'pay';
 if(/discard/i.test(type)||/discard/i.test(mode))return 'discard';
 if(/search|look|peek|inspect|filter/i.test(type)||/search|look|peek|inspect|filter/i.test(mode))return 'search';
 if(type.startsWith('choose')||type.startsWith('effect')||
  type==='kmr'||type==='kmr2'||type==='aot'||type==='aot2'||type==='kjn'||type==='iys'||type==='mmm2'||type==='csm')
  return 'effect';
 return 'other';
}

function pickHistory(card){
 const out={};
 if(!card||typeof card!=='object')return out;
 for(const key of HISTORY_KEYS){
  const value=card[key];
  if(value==null||typeof value==='object')continue;
  out[key]=typeof value==='string'?value.slice(0,80):value;
 }
 return out;
}

export function publicHistoryFrom(visible){
 const events=[];
 for(const card of visible?.openTriggers||[])events.push({kind:'trigger',...pickHistory(card)});
 for(const card of visible?.publicReveals||[])events.push({kind:typeof card?.kind==='string'?card.kind:'reveal',...pickHistory(card)});
 if(visible?.battle)events.push({kind:'battle',...pickHistory(visible.battle)});
 return events.slice(-40);
}

export function visibleForTraining(view,seat){
 if(!view||typeof view!=='object'||!Array.isArray(view.players)||view.players.length!==2)
  throw Error('可見場面不正確。');
 const visible=structuredClone(view);
 delete visible.winner;
 delete visible.seed;
 delete visible.initialCounts;
 delete visible.rng;
 delete visible.endReason;
 visible.players=visible.players.map((player,index)=>{
  const next={...player};
  delete next.deck;
  delete next.life;
  delete next.battleCounts;
  if(index===seat&&Array.isArray(player.hand))
   next.hand=player.hand.map(card=>({uid:card.uid,cardId:card.cardId}));
  else next.hand=null;
  return next;
 });
 return visible;
}

export function privateForTraining(inspection){
 if(!inspection)return null;
 const inspected=(Array.isArray(inspection.cards)?inspection.cards:[])
  .filter(card=>card&&typeof card.uid==='string'&&typeof card.cardId==='string')
  .map(card=>({
   uid:String(card.uid).slice(0,40),
   cardId:String(card.cardId).slice(0,40),
   name:String(card.name||'').slice(0,80),
   color:String(card.color||'').slice(0,20)
  }));
 const view={kind:String(inspection.kind||'look').slice(0,60)};
 if(inspection.step!=null)view.step=String(inspection.step).slice(0,40);
 if(inspected.length)view.inspected=inspected;
 return view;
}

export function tableChoices(choices){
 return (Array.isArray(choices)?choices:[]).map(choice=>{
  const out={};
  for(const key of CHOICE_KEYS)if(choice?.[key]!==undefined)out[key]=choice[key];
  return out;
 });
}

export function chainOf(matchId,step,previous,clientKey){
 return {matchId,step,previousStep:previous?previous.step:null,clientKey};
}

export function deckSnapshot(title,counts){
 const deck={};
 for(const [cardId,n] of Object.entries(counts||{}))if(n>0)deck[cardId]=n;
 return {title,counts:deck};
}
