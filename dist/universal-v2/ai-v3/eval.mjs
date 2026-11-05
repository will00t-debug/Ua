// Static position value. It deliberately does not look a turn ahead:
// a front body is not worth more than developing energy. The beam search
// has to see the opponent's turn before a blocker outranks that energy.
import {universalBp,universalEnergy} from '../engine.mjs';
import {packOf} from './observation.mjs';
import {strategyScore} from './strategy.mjs';

function squash(value){return String(value||'').replace(/\s+/g,'');}
// A hand card that can raid a body already on our side is not a generic card.
// Discard lines that drop it or keep it otherwise evaluate the same.
export function raidMaterialValue(pack,state,player,card){
 const catalog=packOf(pack,player).cards;
 const printed=catalog[card?.cardId];
 if(!printed?.raidName)return 0;
 const want=new Set([printed.raidName,...(printed.raidBaseNames||[])].map(squash));
 const mine=state.players[player];
 for(const line of ['front','energy'])for(const body of mine?.[line]||[]){
  if(body&&want.has(squash(catalog[body.cardId]?.name)))return 8;
 }
 return 0;
}
export function keepScore(pack,state,player,card){
 const printed=packOf(pack,player).cards[card?.cardId];
 if(!printed)return 0;
 return (Number(printed.bp)||0)/400+(printed.gen||0)*2+raidMaterialValue(pack,state,player,card);
}
function lifeScore(n){
 if(n<=0)return -90000;
 const table=[0,40,130,190,235,270,295,315,330];
 return table[n]??315+(n-7)*8;
}
// A small body and a 4000 both remove one life when the opponent has no
// blocker. The extra value is the next attack: 4000 still threatens a life
// after they develop, and one life step on the table above is 20.
function nextAttack(bp){
 if(bp>=4000)return 12;
 if(bp>=3000)return 8;
 if(bp>=2000)return 4;
 return 0;
}
function board(pack,state,player){
 let score=0,threat=0;
 const catalog=packOf(pack,player).cards;
 for(const card of state.players[player].front)if(card){
  const bp=Number(universalBp(pack,state,card))||0;
  score+=4+bp/400+(card.ready?3:0);
  if(card.ready)threat=Math.max(threat,nextAttack(bp));
 }
 score+=threat;
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
export function explainValue(pack,state,actor){
 const opp=1-actor;
 const mine=state.players[actor];
 const handRaid=mine.hand.reduce((sum,card)=>sum+raidMaterialValue(pack,state,actor,card),0);
 const ownBoard=board(pack,state,actor);
 const oppBoard=board(pack,state,opp);
 return {
  total:evaluate(pack,state,actor),
  life:lifeScore(mine.life.length)-lifeScore(state.players[opp].life.length),
  board:ownBoard-oppBoard,
  handRaid,
  hand:Math.min(mine.hand.length,6)*2.2,
  energy:Math.min(universalEnergy(pack,state,actor),6)*6-Math.min(universalEnergy(pack,state,opp),6)*2,
  ap:mine.apCards.filter(card=>card.ready).length*1.5
 };
}
export function evaluate(pack,state,actor,strategy){
 const done=terminalValue(state,actor);
 if(done!==null)return done;
 const opp=1-actor;
 let score=lifeScore(state.players[actor].life.length)-lifeScore(state.players[opp].life.length);
 score+=board(pack,state,actor)-board(pack,state,opp);
 score+=Math.min(state.players[actor].hand.length,6)*2.2;
 for(const card of state.players[actor].hand)score+=raidMaterialValue(pack,state,actor,card);
 score-=Math.min(state.players[opp].hand.length,6)*1.1;
 score+=Math.min(universalEnergy(pack,state,actor),6)*6;
 score-=Math.min(universalEnergy(pack,state,opp),6)*2;
 score+=state.players[actor].apCards.filter(card=>card.ready).length*1.5;
 if(strategy==='score')score+=strategyScore(pack,state,actor);
 return score;
}
