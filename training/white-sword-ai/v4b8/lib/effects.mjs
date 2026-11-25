// Read a finished step back onto measured positions. This does not search.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {attachMeasured,uncovered} from './measure.mjs';

export function policyFrom(parent,weights,names){
 const policy=parent.concat((names||[]).map(()=>0));
 for(const row of weights||[]){
  const extra=(names||[]).indexOf(row.name);
  const index=extra>=0?parent.length+extra:POLICY_INDEX[row.name];
  if(!Number.isInteger(index)||index<0)throw Error('未知權重 '+row.name);
  policy[index]=row.after;
 }
 return policy;
}
export function choiceChanges(parent,policy,names,positions,contexts){
 const changed=[];
 let covered=0;
 for(const position of positions||[]){
  const context=contexts.get(position.id);
  if(!position?.band||uncovered(position,context).length)continue;
  const attached=attachMeasured(position.band,context.actions,names);
  if(!attached.ok)continue;
  covered++;
  const before=chooseKey(position.band,parent,SCALE);
  const after=chooseKey(attached.band,policy,SCALE);
  if(before!==after)changed.push({id:position.id,before,after,bucket:position.bucket,opponent:position.opponent});
 }
 return {covered,changed};
}
