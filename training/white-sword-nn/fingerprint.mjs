// Replay fingerprints. The hash covers the played outcomes and the stored
// behavior distribution. It does not keep the tensors in the report.
import {createHash} from 'node:crypto';

function bytes(values){
 const view=Float64Array.from(values||[]);
 return Buffer.from(view.buffer,view.byteOffset,view.byteLength);
}
export function thetaHash(net){
 const view=net.theta;
 return createHash('sha256').update(Buffer.from(view.buffer,view.byteOffset,view.byteLength)).digest('hex');
}
export function sampleFingerprint(games){
 const hash=createHash('sha256');
 for(const game of games||[]){
  hash.update([
   game.seed,game.first,game.learnerSeat,game.status,game.winner,game.steps,game.decisions
  ].join('|')+'\n');
  for(const sample of game.ppo||[]){
   hash.update([
    sample.seat,sample.index,sample.chosen,sample.value,sample.target,sample.oldLogProb
   ].join('|')+'|');
   hash.update(bytes(sample.oldLogProbs));
   hash.update(bytes(sample.state));
   hash.update('\n');
  }
 }
 return hash.digest('hex');
}
