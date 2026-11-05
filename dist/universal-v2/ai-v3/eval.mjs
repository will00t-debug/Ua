// Static position value. It deliberately does not look a turn ahead:
// a front body is not worth more than developing energy. The beam search
// has to see the opponent's turn before a blocker outranks that energy.
import {universalBp,universalEnergy} from '../engine.mjs';
import {packOf} from './observation.mjs';

function lifeScore(n){
 if(n<=0)return -90000;
 const table=[0,40,130,190,235,270,295,315,330];
 return table[n]??315+(n-7)*8;
}
function board(pack,state,player){
 let score=0;
 const catalog=packOf(pack,player).cards;
 for(const card of state.players[player].front)if(card){
  const bp=Number(universalBp(pack,state,card))||0;
  score+=4+bp/400+(card.ready?3:0);
 }
 for(const card of state.players[player].energy)if(card){
  const printed=catalog[card.cardId];
  score+=6+(printed?.gen||0)*8;
 }
 return score;
}
export function terminalValue(state,actor){
 if(state.status==='finished'){
  if(state.winner===actor)return 100000;
  if(state.winner===1-actor)return -100000;
  return 0;
 }
 const mine=state.players[actor].life.length;
 const opp=state.players[1-actor].life.length;
 if(opp<=0&&mine>0)return 90000;
 if(mine<=0&&opp>0)return -90000;
 return null;
}
export function evaluate(pack,state,actor){
 const done=terminalValue(state,actor);
 if(done!==null)return done;
 const opp=1-actor;
 let score=lifeScore(state.players[actor].life.length)-lifeScore(state.players[opp].life.length);
 score+=board(pack,state,actor)-board(pack,state,opp);
 score+=Math.min(state.players[actor].hand.length,6)*2.2;
 score-=Math.min(state.players[opp].hand.length,6)*1.1;
 score+=Math.min(universalEnergy(pack,state,actor),6)*6;
 score-=Math.min(universalEnergy(pack,state,opp),6)*2;
 score+=state.players[actor].apCards.filter(card=>card.ready).length*1.5;
 return score;
}
