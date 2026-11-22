// Actor-visible observation. Opponent hand identities, both deck orders,
// unrevealed LIFE, seeds and winners are rejected before any feature runs.
import {actorObservation} from '../ai-v3/observation.mjs';

const HIDDEN_KEYS=['winner','seed','initialCounts','endReason'];

export function assertObservationSafe(observation,seat){
 const visible=observation?.visible;
 const players=visible?.players;
 if(!visible||!Array.isArray(players)||players.length!==2)throw Error('observation missing seats');
 if(seat!==0&&seat!==1)throw Error('observation seat leaked');
 const opp=players[seat===0?1:0];
 const me=players[seat];
 if(!me||!opp)throw Error('observation missing seats');
 if(opp.hand!=null)throw Error('opponent hand leaked');
 for(const player of players){
  if(Array.isArray(player.deck)||Array.isArray(player.life))throw Error('hidden zone leaked');
  if('deck' in player||'life' in player)throw Error('hidden zone leaked');
 }
 for(const key of HIDDEN_KEYS)if(key in visible)throw Error('hidden match field leaked');
 const priv=observation.private;
 if(priv&&(priv.deck||priv.life||priv.opponentHand))throw Error('private zone leaked');
 return observation;
}

export function observeActor(pack,state,seat){
 return assertObservationSafe(actorObservation(pack,state,seat),seat);
}
