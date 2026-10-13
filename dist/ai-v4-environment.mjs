// AI v4 training boundary: never expose opponent hand, deck order or hidden life cards.
import {legalActions,controller} from './engine.mjs';

const publicCard = c => c ? ({uid:c.uid,cardId:c.cardId,ready:!!c.ready,stackCount:c.stack?.length||0}) : null;
const publicPlayer = (pl,own) => ({
 ap:pl.ap, maxAp:pl.maxAp, handCount:pl.hand.length,
 deckCount:pl.deck.length, lifeCount:pl.life.length,
 front:pl.front.map(publicCard),energy:pl.energy.map(publicCard),
 outside:pl.outside.map(publicCard),removed:pl.removed.map(publicCard),
 ...(own?{hand:pl.hand.map(c=>({uid:c.uid,cardId:c.cardId}))}:{})
});

export function observeForPlayer(state,player=controller(state)) {
 if(player!==0&&player!==1)throw new RangeError('Invalid player');
 return {
  player,active:state.active,phase:state.phase,status:state.status,
  turn:state.turn,players:state.players.map((pl,i)=>publicPlayer(pl,i===player)),
  // Pending choices can contain private information. Only expose choices
  // when the observer is the decision-making player.
  pending:state.pending&&controller(state)===player?{
   player:state.pending.player,kind:state.pending.effect?.kind||null,
   choices:(state.pending.choices||[]).map(c=>({id:c.id,label:c.label}))
  }:null
 };
}

export function legalActionBatch(state,player=controller(state)) {
 if(player!==controller(state))return {actions:[],mask:[]};
 const actions=legalActions(state);
 return {actions,mask:actions.map(()=>1)};
}

export function decisionSample(state,player=controller(state)) {
 return {observation:observeForPlayer(state,player),...legalActionBatch(state,player)};
}
