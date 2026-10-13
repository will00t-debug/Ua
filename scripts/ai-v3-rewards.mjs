// Compare only legal actions observed in the same public state.
// Never label the same pair in opposite directions: this previously happened
// when an explored alternative won but teacher preference was also recorded.
export function buildTrainingPairs(records,winner){
 const samples=[];
 for(const r of records){
  if(r.explored && r.actor===winner){
   // A match win is weak, confounded evidence; do not reverse a teacher
   // ranking from a single outcome. Skip this ambiguous comparison.
   continue;
  }
  samples.push({yes:r.teacher,no:r.counter,weight:1});
  // Avoid duplicating the teacher > chosen pair: it is already above.
 }
 return samples;
}
