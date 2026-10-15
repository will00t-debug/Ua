// V2 preview forensic replay and spectator-safe descriptions.
// Replay JSON is an explicitly downloaded DEBUG artifact, never sent/stored.
// Full replay includes PRIVATE actions and must not be shown to an opponent.
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from './engine.mjs';
import {uiActionLabel} from './preview-actions.mjs';

export const UNIVERSAL_PREVIEW_REPLAY_VERSION=1;
const privateActions=new Set([
 'chooseDeckSearch','chooseDeckSearchMulti','chooseInspectedOutside',
 'chooseTopOrder','chooseTopCard','chooseDiscardCost','chooseDiscardGate',
 'chooseDiscard','chooseHandLimit','chooseLeaveReplacement'
]);
const numeric=v=>Number.isSafeInteger(v)&&v>=0;
const ownedCard=(s,p,uid)=>{
 if(!uid||typeof uid!=='string')return false;
 const pl=s.players[p];if(!pl)return false;
 const field=[...pl.front,...pl.energy].filter(Boolean);
 // Only exposed field / outside cards may be described to the opponent.
 // Never traverse private layered Raid bases or facedown undercards.
 return [...field,...pl.outside].some(c=>c?.uid===uid);
};
export function publicPreviewActionLabel(packs,before,after,action,player){
 const actor=player===0?'你':'電腦';
 if(player===0)return actor+'：'+uiActionLabel(action,{pack:packs,state:before});
 if(privateActions.has(action.type))return actor+'：完成私密／可選效果（'+action.type+'）';
 // A card in AI hand / deck before the step might be hidden. It can only
 // be named when it was on a public field/outside BEFORE or became public
 // AFTER the action. A named legal target is always in a public zone.
 const uid=action.uid;
 const reveal=ownedCard(before,1,uid)||ownedCard(after,1,uid);
 const safe=(uid&&!reveal)?null:before;
 return actor+'：'+uiActionLabel(action,safe?{pack:packs,state:safe}:{});
}
export function makeUniversalPreviewReplay(packs,{decks,seed,first}){
 if(!Array.isArray(packs)||packs.length!==2||
  !Array.isArray(decks)||decks.length!==2||
  !numeric(seed)||seed<1||!numeric(first)||first>1)
  throw Error('Invalid replay setup');
 // Clone records: never retain a mutable reference to live deck inputs.
 const initialCounts=decks.map(c=>Object.fromEntries(Object.entries(c)));
 return {
  format:'ua-universal-v2-preview',version:UNIVERSAL_PREVIEW_REPLAY_VERSION,
  playerTitles:packs.map(p=>p.id),packVersions:packs.map(p=>p.version),seed,first,initialCounts,actions:[]
 };
}
export function appendUniversalReplay(replay,action,player){
 if(!replay||replay.format!=='ua-universal-v2-preview'||
  ![0,1].includes(player)||!action||typeof action!=='object')
  throw Error('Invalid replay action');
 const next={...replay,actions:[...replay.actions,{actor:player,action:structuredClone(action)}]};
 return next;
}
export function replayUniversalPreview(packs,tape,{maxActions=15000}={}){
 if(!tape||tape.format!=='ua-universal-v2-preview'||
  tape.version!==UNIVERSAL_PREVIEW_REPLAY_VERSION||
  !Array.isArray(packs)||packs.length!==2||
  !Array.isArray(tape.playerTitles)||tape.playerTitles.length!==2||
  packs.some((p,i)=>p.id!==tape.playerTitles[i])||
  !Array.isArray(tape.packVersions)||tape.packVersions.length!==2||
  packs.some((p,i)=>p.version!==tape.packVersions[i])||
  !Array.isArray(tape.initialCounts)||tape.initialCounts.length!==2||
  !Array.isArray(tape.actions)||tape.actions.length>maxActions||
  !Number.isSafeInteger(tape.seed)||tape.seed<1||tape.seed>999999999||
  ![0,1].includes(tape.first))throw Error('Invalid preview replay format/title');
 let state=newUniversalMatch(packs,{
  decks:tape.initialCounts,seed:tape.seed,first:tape.first
 });
 for(const [index,entry]of tape.actions.entries()){
  if(!entry||![0,1].includes(entry.actor)||!entry.action)
   throw Error('Replay step '+index+' has no actor/action');
  const legal=legalUniversalActions(packs,state);
  if(!legal.some(a=>JSON.stringify(a)===JSON.stringify(entry.action)))
   throw Error('Replay step '+index+' is not currently legal');
  state=dispatchUniversalAction(packs,state,entry.action,{actor:entry.actor});
  if(index%25===0)assertUniversalMatch(packs,state);
 }
 assertUniversalMatch(packs,state);
 return state;
}
export function publicPreviewTranscript({header,lines}){
 if(typeof header!=='string'||!Array.isArray(lines))
  throw Error('Invalid public transcript');
 return [header,'',...lines].join('\n')+'\n';
}
