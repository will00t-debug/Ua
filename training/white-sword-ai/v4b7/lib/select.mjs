// Three learnable confirmation slots, plus one reserved for a position
// the one-step box cannot represent. Empty slots stay empty.
import {SCREEN_FLOOR} from '../../v4b4/lib/confirm.mjs';
import {LEARNABLE_SLOTS,RESERVED_SLOTS} from './protocol.mjs';

export function selectExplore(summaries,learnableFlags,{
 floor=SCREEN_FLOOR,learnableSlots=LEARNABLE_SLOTS,reservedSlots=RESERVED_SLOTS
}={}){
 if(summaries.length!==learnableFlags.length)throw Error('篩選列數和可學標記不一致');
 const ranked=summaries.map((row,index)=>({
  index,mean:row.mean,learnable:learnableFlags[index]===true
 })).filter(row=>row.mean<=floor).sort((left,right)=>left.mean-right.mean||left.index-right.index);
 const learnable=ranked.filter(row=>row.learnable).slice(0,learnableSlots)
  .map(row=>({...row,role:'learnable'}));
 const reserved=ranked.filter(row=>!row.learnable).slice(0,reservedSlots)
  .map(row=>({...row,role:'reserved'}));
 return [...learnable,...reserved].sort((left,right)=>left.mean-right.mean||left.index-right.index);
}
