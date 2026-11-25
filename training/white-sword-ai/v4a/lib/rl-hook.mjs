// Evolution is the built-in proposer. A later reinforcement model can register
// beside it. This module does not import a neural-network library.
import {proposeEvolution} from './evolve.mjs';

const extra=new Map();
export function registerProposer(kind,fn){
 if(kind==='evolution')throw Error('內建的演化提案器固定不變');
 if(typeof fn!=='function')throw Error('提案器必須是函式');
 extra.set(kind,fn);
}
export function propose(request){
 if(!request?.kind||request.kind==='evolution')return proposeEvolution(request);
 const fn=extra.get(request.kind);
 if(!fn)throw Error('尚未接上名為 '+request.kind+' 的提案器。這個位置保留給之後的強化學習模型，目前沒有神經網路。');
 return fn(request);
}
