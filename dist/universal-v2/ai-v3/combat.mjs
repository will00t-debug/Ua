// One-step public combat comparison. It orders attacks and blocks.
// The beam still resolves the block window with the engine.
import {universalBp} from '../engine.mjs';
import {viewerCard} from './observation.mjs';

function bpOf(pack,state,card){
 try{
  const value=universalBp(pack,state,card);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
export function combatRank(pack,state,viewer,action){
 if(action?.type!=='attack'&&action?.type!=='chooseBlock')return 0;
 if(action.uid==null)return 1;
 const card=viewerCard(state,viewer,action.uid);
 if(!card)return 0;
 const bp=bpOf(pack,state,card);
 if(action.type==='chooseBlock')return 4+bp/200;
 const walls=state.players[1-viewer].front.filter(Boolean).map(body=>bpOf(pack,state,body));
 if(!walls.length)return 22;
 const wall=Math.max(...walls);
 if(bp>wall)return 16;
 if(bp===wall)return 12;
 return 3;
}
