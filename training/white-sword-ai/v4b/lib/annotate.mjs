// Attach printed card numbers to the actions already chosen by the round.
// This only rereads the saved coordinates. It does not play new games.
import {join} from 'node:path';
import {readJson} from '../../v4a/lib/store.mjs';
import {replayState} from './play.mjs';

function cardId(state,uid){
 if(!uid)return null;
 const zones=['hand','front','energy','outside','removed','life','deck','lifeRevealed'];
 for(const player of state.players){
  for(const zone of zones){
   for(const card of player[zone]||[]){
    if(card?.uid===uid)return card.cardId||null;
    for(const layer of [...(card?.raidLayers||[]),...(card?.underLayers||[]),...(card?.stack||[]),...(card?.under||[])]){
     if(layer?.uid===uid)return layer.cardId||null;
    }
   }
  }
 }
 return null;
}
function uidOf(key){
 try{return JSON.parse(key).uid||null;}
 catch{return null;}
}
export function annotateReport(report,root){
 const selected=readJson(join(root,'selected.json'),{positions:[]});
 const pool=readJson(join(root,'pool.json'),{positions:[]});
 const positions=new Map();
 for(const position of [...(pool.positions||[]),...(selected.positions||[])])positions.set(position.id,position);
 const states=new Map();
 const stateFor=id=>{
  if(states.has(id))return states.get(id);
  const position=positions.get(id);
  if(!position)return null;
  const replay=replayState(position);
  states.set(id,replay.state);
  return replay.state;
 };
 const name=(id,key)=>{
  const state=stateFor(id);
  return state?cardId(state,uidOf(key)):null;
 };
 for(const row of report.preferences||[]){
  row.preferredCard=name(row.id,row.preferred);
  row.otherCard=name(row.id,row.other);
 }
 for(const group of [report.learning?.selectedChoices,report.learning?.untouchedChoices]){
  for(const row of group?.rows||[]){
   row.beforeCard=name(row.id,row.before);
   row.afterCard=name(row.id,row.after);
  }
 }
 return report;
}
