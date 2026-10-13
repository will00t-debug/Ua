// Incrementally executable green UA56BT Main-phase abilities.
// Choice validation, once-per-turn constraints and printed costs are shared
// across the human / AI dispatcher. Never auto-enable unimplemented cards.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
const own=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const field=state=>state.players.flatMap(p=>own(p).map(x=>x.card));
const name=c=>c.nameJa||TTG_BY_ID[c.cardId]?.nameJa;
const simon=c=>name(c)==='シモン'||(c.stack||[]).some(simon);
const stat=(s,p,uid,id)=>{
 if(s?.active!==p||s.phase!=='main'||s.pending||s.pendingTtgTrigger||![0,1].includes(p))throw new Error('Green activation requires own main phase');
 const loc=own(s.players[p]).find(x=>x.card.uid===uid);
 if(!loc||loc.card.cardId!==id)throw new Error('Wrong green activation source');
 return loc;
};
const used=(s,p,uid,tag)=>s.players[p]?.greenUsed?.[s.turn+':'+uid+':'+tag]===true;
const mark=(s,p,uid,tag)=>{s.players[p].greenUsed??={};s.players[p].greenUsed[s.turn+':'+uid+':'+tag]=true;};
function allEnergy(s,p){const energy=calculateTtgEnergyByColor(s,p);return energy.red+energy.green;}
// 015 Nia: pay an ACTIVE AP, draw 1, this turn printed energy+1, once per turn.
export function legalGreen015(s,{player,uid}={}){
 try{const src=stat(s,player,uid,'TTG-1-015');
 if(used(s,player,uid,'draw')||s.players[player].deck.length===0)return [];
 return s.players[player].apCards.filter(a=>a.ready).map(a=>({type:'ttgGreen015',player,uid,apUid:a.uid}));
 }catch{return [];}
}
export function resolveGreen015(s,{player,uid,apUid}={}){
 if(!legalGreen015(s,{player,uid}).some(x=>x.apUid===apUid))throw new Error('Nia 015 has no legal AP or draw');
 const result=spendTtgApCards(s,{player,apUids:[apUid],count:1});
 const pl=result.players[player],card=own(pl).find(x=>x.card.uid===uid).card;
 pl.hand.push(pl.deck.shift());
 card.energyBonus=(card.energyBonus||0)+1;
 card.ttgGreenEnergyExpiresTurn=s.turn;
 card.ttgGreenBonusCount=(card.ttgGreenBonusCount||0)+1;
 mark(result,player,uid,'draw');
 return result;
}
// 018 Buta: REST -> +1 energy this turn and retire at Main end.
export function legalGreen018(s,{player,uid}={}){
 try{const x=stat(s,player,uid,'TTG-1-018');return x.card.ready&&!used(s,player,uid,'boost')?[{type:'ttgGreen018',player,uid}]:[];
 }catch{return [];}
}
export function resolveGreen018(s,{player,uid}={}){
 if(!legalGreen018(s,{player,uid}).length)throw new Error('Buta 018 needs ACTIVE source');
 const result=structuredClone(s),c=own(result.players[player]).find(x=>x.card.uid===uid).card;
 c.ready=false;c.energyBonus=(c.energyBonus||0)+1;c.greenRetireAtMainEndTurn=s.turn;
 mark(result,player,uid,'boost');return result;
}
// 022 Yomako: REST -> +1 energy until Main end, then return to hand.
export function legalGreen022(s,{player,uid}={}){
 try{const x=stat(s,player,uid,'TTG-1-022');return x.card.ready&&!used(s,player,uid,'boost')?[{type:'ttgGreen022',player,uid}]:[];
 }catch{return [];}
}
export function resolveGreen022(s,{player,uid}={}){
 if(!legalGreen022(s,{player,uid}).length)throw new Error('Yomako 022 needs ACTIVE source');
 const result=structuredClone(s),c=own(result.players[player]).find(x=>x.card.uid===uid).card;
 c.ready=false;c.energyBonus=(c.energyBonus||0)+1;c.greenBounceAtMainEndTurn=s.turn;
 mark(result,player,uid,'boost');return result;
}
// 011 Simon: choose either +1 printed energy OR allow self to generate from
// front line until next own turn, once this turn per printed character.
export function legalGreen011(s,{player,uid}={}){
 try{stat(s,player,uid,'TTG-1-011');if(used(s,player,uid,'mode'))return [];
 return ['boost','frontEnergy'].map(mode=>({type:'ttgGreen011',player,uid,mode}));
 }catch{return [];}
}
export function resolveGreen011(s,{player,uid,mode}={}){
 if(!legalGreen011(s,{player,uid}).some(a=>a.mode===mode))throw new Error('Invalid Simon 011 option');
 const result=structuredClone(s),pl=result.players[player],card=own(pl).find(x=>x.card.uid===uid).card;
 if(mode==='boost'){card.energyBonus=(card.energyBonus||0)+1;card.greenBonusUntilOwnStart=pl.turnCount+1;}
 else{card.frontGenerates=true;card.greenFrontUntilOwnStart=pl.turnCount+1;}
 mark(result,player,uid,'mode');return result;
}
// 003 Viral: activate front-energy with 6+ own energy; immediately re-check
// for 8+ energy *after* self starts producing (official Q2392).
export function legalGreen003(s,{player,uid}={}){
 try{
 const src=stat(s,player,uid,'TTG-1-003'),energy=allEnergy(s,player),pl=s.players[player],actions=[];
 if(src.line==='front'&&energy>=6&&!used(s,player,uid,'front'))actions.push({type:'ttgGreen003Front',player,uid});
 if(src.line==='front'&&energy>=20&&!pl.greenUsedNames?.[s.turn+':ヴィラル:ready']){
  for(const c of own(pl))if(!c.card.ready)actions.push({type:'ttgGreen003Ready',player,uid,targetUid:c.card.uid});
 }
 return actions;
 }catch{return [];}
}
export function resolveGreen003(s,{player,uid,type,targetUid}={}){
 if(!legalGreen003(s,{player,uid}).some(a=>a.type===type&&a.targetUid===targetUid))throw new Error('Unavailable Viral ability/target');
 const result=structuredClone(s),pl=result.players[player],source=own(pl).find(x=>x.card.uid===uid).card;
 if(type==='ttgGreen003Front'){
  source.frontGenerates=true;source.greenFrontExpiresTurn=s.turn;
  if(allEnergy(result,player)>=8){pl.frontGeneratesAll=true;pl.frontGenerationExpiresTurn=s.turn;}
  mark(result,player,uid,'front');
 }else{
  const target=own(pl).find(x=>x.card.uid===targetUid);
  if(!target||target.card.ready)throw new Error('Must ready one REST own character');
  target.card.ready=true;
  pl.greenUsedNames??={};pl.greenUsedNames[s.turn+':ヴィラル:ready']=true;
 }
 return result;
}
function unwrapPile(card){
 const visit=c=>[{uid:c.uid,cardId:c.cardId},...(c.stack||[]).flatMap(visit),...(c.under||[]).flatMap(visit)];
 return visit(card);
}
// At Main end pay all printed retirement/bounce costs. Never delete a Raid
// stack in the absence of full exit-pile semantics; refuse atomically instead.
export function resolveGreenMainEnd(s){
 if(s?.phase!=='main'||![0,1].includes(s.active))throw new Error('Wrong green main-phase end timing');
 const result=structuredClone(s),pl=result.players[result.active];
 for(const pos of own(pl)){
  const c=pos.card;
  if(c.greenRetireAtMainEndTurn!==s.turn&&c.greenBounceAtMainEndTurn!==s.turn)continue;
  if((c.stack||[]).length||(c.under||[]).length)throw new Error('Unsupported Raid retirement/bounce');
  if(c.greenRetireAtMainEndTurn===s.turn){pl.outside.push({uid:c.uid,cardId:c.cardId});}
  else pl.hand.push({uid:c.uid,cardId:c.cardId,nameJa:c.nameJa,ready:false,stack:[],under:[]});
  pl[pos.line][pos.slot]=null;
 }
 return result;
}
// Turn expiry & next-own-start hook keep temporary energy and passive flags
// accurate even after moving between Energy/Front lines.
export function resolveGreenTurnEnd(s){
 if(!Number.isInteger(s?.turn))throw new Error('Turn index required');
 const result=structuredClone(s);
 for(const pl of result.players){
  for(const x of own(pl))if(x.card.ttgGreenEnergyExpiresTurn===s.turn){
   x.card.energyBonus=Math.max(0,(x.card.energyBonus||0)-(x.card.ttgGreenBonusCount||1));
   delete x.card.ttgGreenBonusCount;
   delete x.card.ttgGreenEnergyExpiresTurn;
  }
  if(pl.frontGenerationExpiresTurn===s.turn){
   delete pl.frontGeneratesAll;delete pl.frontGenerationExpiresTurn;
  }
  for(const x of own(pl))if(x.card.greenFrontExpiresTurn===s.turn){
   delete x.card.frontGenerates;delete x.card.greenFrontExpiresTurn;
  }
 }
 return result;
}
export function resolveGreenOwnStart(s,player){
 if(![0,1].includes(player))throw new Error('Invalid green start-phase owner');
 const result=structuredClone(s),pl=result.players[player];
 for(const x of own(pl)){
  const c=x.card;
  if(c.greenBonusUntilOwnStart!=null&&pl.turnCount>=c.greenBonusUntilOwnStart){
   c.energyBonus=Math.max(0,(c.energyBonus||0)-1);delete c.greenBonusUntilOwnStart;
  }
  if(c.greenFrontUntilOwnStart!=null&&pl.turnCount>=c.greenFrontUntilOwnStart){
   delete c.frontGenerates;delete c.greenFrontUntilOwnStart;
  }
 }
 return result;
}


// 020 Yoko STEP: optional Front -> empty Energy line transfer in own move phase.
// Do not reactivate a rested card or silently displace an existing card.
export function legalGreen020Step(s,{player,uid}={}){
 if(![0,1].includes(player)||s?.active!==player||s.phase!=='move'||s.pending)return [];
 const pl=s.players[player],src=pl.front.find(c=>c?.uid===uid&&c.cardId==='TTG-1-020');
 if(!src)return [];
 return pl.energy.flatMap((x,slot)=>x?[]:[{type:'ttgGreen020Step',player,uid,slot}]);
}
export function resolveGreen020Step(s,{player,uid,slot}={}){
 if(!legalGreen020Step(s,{player,uid}).some(a=>a.slot===slot))
  throw new Error('Illegal Yoko STEP movement');
 const result=structuredClone(s),pl=result.players[player],index=pl.front.findIndex(c=>c?.uid===uid);
 pl.energy[slot]=pl.front[index];pl.front[index]=null;
 return result;
}

// 016 Nia: once per NAME in one turn; at 20+ total energy REST and draw 1.
export function legalGreen016(s,{player,uid}={}){
 try{const x=stat(s,player,uid,'TTG-1-016'),pl=s.players[player];
  return x.card.ready&&allEnergy(s,player)>=20&&pl.deck.length>0&&
   !pl.greenUsedNames?.[s.turn+':ニア:draw20']?[{type:'ttgGreen016',player,uid}]:[];
 }catch{return [];}
}
export function resolveGreen016(s,{player,uid}={}){
 if(!legalGreen016(s,{player,uid}).length)throw new Error('Illegal Nia 016 20-energy draw');
 const result=structuredClone(s),pl=result.players[player],c=own(pl).find(x=>x.card.uid===uid).card;
 c.ready=false;pl.hand.push(pl.deck.shift());
 pl.greenUsedNames??={};pl.greenUsedNames[s.turn+':ニア:draw20']=true;
 return result;
}
// 017 Nia: at 8+ energy, once this turn, add TWO temporary green energy.
export function legalGreen017(s,{player,uid}={}){
 try{stat(s,player,uid,'TTG-1-017');
  return allEnergy(s,player)>=8&&!used(s,player,uid,'plus2')?[{type:'ttgGreen017',player,uid}]:[];
 }catch{return [];}
}
export function resolveGreen017(s,{player,uid}={}){
 if(!legalGreen017(s,{player,uid}).length)throw new Error('Illegal Nia 017 +2 energy activation');
 const result=structuredClone(s),c=own(result.players[player]).find(x=>x.card.uid===uid).card;
 c.energyBonus=(c.energyBonus||0)+2;
 c.ttgGreenBonusCount=(c.ttgGreenBonusCount||0)+2;
 c.ttgGreenEnergyExpiresTurn=s.turn;
 mark(result,player,uid,'plus2');return result;
}
