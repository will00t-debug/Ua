// Separate pure reward labeling from game simulation so it can be audited.
// A lost game is not evidence that every action selected by the teacher was bad.
export function buildTrainingPairs(records,winner){
 const samples=[];
 for(const r of records){
  // Learning only compares actions that were legal in the same public state.
  samples.push({yes:r.teacher,no:r.counter,weight:1});
  if(r.explored){
   if(r.actor===winner)
    samples.push({yes:r.chosen,no:r.teacher,weight:0.12});
   else
    samples.push({yes:r.teacher,no:r.chosen,weight:0.24});
  }
 }
 return samples;
}
