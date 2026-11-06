// Static position value. It deliberately does not look a turn ahead:
// a front body is not worth more than developing energy. The beam search
// has to see the opponent's turn before a blocker outranks that energy.
import {legalUniversalActions,universalAttackDamage,universalBp,universalEnergy,universalEnergyByColor,universalImpact,universalImpactNull} from '../engine.mjs';
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
function frontValue(pack,state,cards){
 let score=0,threat=0;
 for(const card of cards||[]){
  if(!card)continue;
  const bp=Number(universalBp(pack,state,card))||0;
  score+=4+bp/400+(card.ready?3:0);
  if(card.ready)threat=Math.max(threat,nextAttack(bp));
 }
 return score+threat;
}
function findBody(state,uid){
 if(!uid)return null;
 for(const player of state.players||[]){
  for(const line of ['front','energy']){
   const card=(player[line]||[]).find(item=>item?.uid===uid);
   if(card)return card;
  }
 }
 return null;
}
function lifeChange(state,actor,player,loss){
 if(loss<=0)return 0;
 const have=state.players[player]?.life?.length||0;
 const delta=lifeScore(Math.max(0,have-loss))-lifeScore(have);
 return player===actor?delta:-delta;
}
function boardChange(pack,state,actor,owner,nextCards){
 const before=frontValue(pack,state,state.players[owner].front);
 const after=frontValue(pack,state,nextCards);
 const delta=after-before;
 return owner===actor?delta:-delta;
}
// A block or life window is scored before the engine has applied it. The
// adjustment is the public result of the attack that is already open:
// life from universalAttackDamage, a blocker leaving when the attacker's
// BP is greater or equal, and Impact only when the engine still counts it.
// Hidden life cards, hands and deck order are not read. The line stays
// pending; this is not a completed turn.
function battleOptions(pack,state,actor){
 const pending=state?.pending;
 if(!pending||state.status!=='playing'||pending.kind!=='block')return [];
 const attacker=findBody(state,pending.attackerUid);
 const defender=pending.player;
 if(!attacker||!Number.isInteger(defender))return [];
 let damage=1,impact=0,atkBp=0;
 try{
  damage=universalAttackDamage(pack,state,attacker);
  impact=universalImpact(pack,state,attacker);
  atkBp=Number(universalBp(pack,state,attacker))||0;
 }catch{return [];}
 let legal=[];
 try{legal=legalUniversalActions(pack,state);}catch{return [];}
 const front=state.players[defender].front||[];
 const rows=[];
 for(const action of legal){
  if(action?.type!=='chooseBlock')continue;
  let delta=0;
  if(!action.uid)delta=lifeChange(state,actor,defender,damage);
  else{
   const blocker=front.find(card=>card?.uid===action.uid);
   if(!blocker)continue;
   const bp=Number(universalBp(pack,state,blocker))||0;
   // Q34: the blocker wins only when its BP is strictly higher. Equal BP
   // removes the blocker. Impact life is separate and can still land.
   if(bp>atkBp){
    const rested=front.map(card=>card?.uid===blocker.uid?{...card,ready:false}:card);
    delta=boardChange(pack,state,actor,defender,rested);
   }else{
    const removed=front.map(card=>card?.uid===blocker.uid?null:card);
    const body=boardChange(pack,state,actor,defender,removed);
    // A proven refill pays with a known hand card. It does not read the deck.
    // The body is no longer the whole cost when that card enters ready.
    const plan=defender===actor&&bp>=4000?provenRebuild(pack,state,actor,blocker.uid):null;
    delta=plan?.ok&&body<0?Math.max(body,-2.2):body;
    const extra=impact>0&&!universalImpactNull(pack,state,blocker)?impact:0;
    delta+=lifeChange(state,actor,defender,extra);
   }
  }
  rows.push({action,delta,damage,impact});
 }
 return rows;
}
function apOnNextTurn(state,actor){
 const own=(state.players?.[actor]?.ownTurns||0)+1;
 if(own>=3)return 3;
 if(own===1&&actor===state.first)return 1;
 return 2;
}
function colorEnergy(pack,state,actor){
 try{return universalEnergyByColor(pack,state,actor)||{};}
 catch{return {};}
}
// The next own turn can replace a body only from the known hand and the
// public board. A normal play enters rested, so it cannot attack that turn.
// A paid Raid or a printed active entry can. The deck is not consulted, and
// a plan that takes a generator off the energy line is not a refill.
export function provenRebuild(pack,state,actor,removedUid){
 const mine=state?.players?.[actor];
 if(!mine)return {ok:false,reason:'none'};
 const catalog=packOf(pack,actor).cards;
 const front=(mine.front||[]).map(card=>card&&card.uid===removedUid?null:card);
 const colors=colorEnergy(pack,state,actor);
 const ap=apOnNextTurn(state,actor);
 const energy=(mine.energy||[]).filter(Boolean).map(card=>card.uid).join(',');
 const place=(slot,card)=>front.map((body,index)=>index===slot?card:body);
 const readyEnough=cards=>cards.every(card=>!card||(Number(universalBp(pack,state,card))||Number(catalog[card.cardId]?.bp)||0)>=4000);
 for(const card of mine.hand||[]){
  const printed=catalog[card?.cardId];
  if(!printed||printed.type!=='character'||(Number(printed.bp)||0)<4000)continue;
  if((printed.ap||1)>ap)continue;
  if((printed.energy||0)>(colors[printed.color]||0))continue;
  const added={...card,ready:true,cardId:printed.id};
  if(printed.enterAlwaysActive===true||(printed.enterActiveIfOpponentRest===true&&
   (state.players[1-actor].front||[]).some(body=>body&&body.ready===false))){
   const slot=front.findIndex(body=>!body);
   if(slot<0)continue;
   const next=place(slot,added);
   if(!readyEnough(next))continue;
   if((mine.energy||[]).filter(Boolean).map(body=>body.uid).join(',')!==energy)continue;
   return {ok:true,cardId:printed.id,mode:'active'};
  }
  if(!printed.raidName)continue;
  const names=new Set([printed.raidName,...(printed.raidBaseNames||[])].map(squash));
  const slot=front.findIndex(body=>body&&names.has(squash(catalog[body.cardId]?.name)));
  if(slot<0)continue;
  const next=place(slot,added);
  if(!readyEnough(next))continue;
  return {ok:true,cardId:printed.id,mode:'raid'};
 }
 return {ok:false,reason:'unproven'};
}
function listedEffects(printed,slot){
 const list=printed?.effects?.[slot];
 return Array.isArray(list)?list:[];
}
function effectCanStart(pack,state,actor,effect){
 if(!effect||effect.when)return false;
 const mine=state.players?.[actor];
 if(!mine)return false;
 if(Number(effect.ap)>0&&(mine.apCards||[]).filter(card=>card?.ready).length<Number(effect.ap))return false;
 const outside=(mine.outside||[]).length;
 if(effect.op==='removeOutsideThen'&&outside<(effect.count||1))return false;
 if((effect.op==='optionalRemoveHandThen'||effect.op==='nameEnergyRevealHandRemove')&&!(mine.hand||[]).length)return false;
 if(effect.op==='nameEnergyRevealHandRemove')return false;
 const known=effect.op==='draw'||effect.op==='drawDiscard'||effect.op==='buffSelf'||
  effect.op==='buffOwnField'||effect.op==='buffOwnTraitAllTurn'||effect.op==='skipNextActiveOppRest'||
  effect.op==='removeOutsideThen';
 return known;
}
function payableTiming(pack,state,actor,attacker,timing){
 const catalog=packOf(pack,actor).cards;
 const own=catalog[attacker?.cardId];
 const slots=timing==='declare'?['onAttack']:timing==='hit'?['unblocked']:timing==='win'?['win']:[];
 const effects=slots.flatMap(slot=>listedEffects(own,slot));
 if(timing==='declare'){
  for(const line of ['front','energy'])for(const card of state.players[actor][line]||[]){
   if(!card||card.uid===attacker.uid)continue;
   effects.push(...listedEffects(catalog[card.cardId],'allyAttackEnd'));
  }
 }
 return effects.some(effect=>effectCanStart(pack,state,actor,effect));
}
// A swing that a higher ready body can answer, with nothing removed and no
// life dealt, rests our attacker through the opponent's turn. The returned
// position has already refreshed that attacker, so the missed block is scored
// here. A payable declaration effect is a different swing. Hit and win
// effects are not, because this swing neither connects nor wins.
export function blankSwingAdjustment(pack,state,actor,action){
 if(action?.type!=='attack'||state?.pending||state?.status!=='playing')return 0;
 const attacker=(state.players?.[actor]?.front||[]).find(card=>card?.uid===action.uid);
 if(!attacker?.ready)return 0;
 let impact=0,atkBp=0;
 try{
  impact=universalImpact(pack,state,attacker)||0;
  atkBp=Number(universalBp(pack,state,attacker))||0;
 }catch{return 0;}
 const walls=(state.players[1-actor]?.front||[]).filter(card=>card?.ready);
 const blank=walls.some(wall=>{
  const bp=Number(universalBp(pack,state,wall))||0;
  if(!(bp>atkBp))return false;
  const leak=impact>0&&!universalImpactNull(pack,state,wall)?impact:0;
  return leak<=0;
 });
 if(!blank)return 0;
 // Hit and win effects do not start: the higher body stops the attack, and
 // impact does not leak. Only a declaration effect that can actually be paid
 // makes this swing different from resting for nothing.
 if(payableTiming(pack,state,actor,attacker,'declare'))return 1;
 let missed=0;
 for(const threat of walls){
  let damage=1,threatBp=0,threatImpact=0;
  try{
   damage=universalAttackDamage(pack,state,threat)||1;
   threatBp=Number(universalBp(pack,state,threat))||0;
   threatImpact=universalImpact(pack,state,threat)||0;
  }catch{continue;}
  const mineBp=Number(universalBp(pack,state,attacker))||0;
  let blocked;
  if(mineBp>threatBp){
   const rested=(state.players[actor].front||[]).map(card=>card?.uid===attacker.uid?{...card,ready:false}:card);
   blocked=boardChange(pack,state,actor,actor,rested);
  }else{
   const removed=(state.players[actor].front||[]).map(card=>card?.uid===attacker.uid?null:card);
   blocked=boardChange(pack,state,actor,actor,removed);
   if(threatImpact>0&&!universalImpactNull(pack,state,attacker))blocked+=lifeChange(state,actor,actor,threatImpact);
  }
  const passed=lifeChange(state,actor,actor,damage);
  missed=Math.max(missed,blocked-passed);
 }
 return missed>0?-missed:0;
}
export function battleActionValue(pack,state,actor,action){
 const rows=battleOptions(pack,state,actor);
 const row=rows.find(item=>item.action?.type===action?.type&&(item.action?.uid??null)===(action?.uid??null));
 if(!row)return null;
 const best=battleWindowDelta(pack,state,actor);
 const base=evaluate(pack,state,actor);
 if(!Number.isFinite(base)||!Number.isFinite(best))return null;
 return base-best+row.delta;
}
export function battleWindowAction(pack,state,actor){
 const rows=battleOptions(pack,state,actor);
 if(!rows.length)return null;
 const maximize=(state.pending?.player??state.active)===actor;
 return rows.reduce((best,row)=>best&&(maximize?row.delta<=best.delta:row.delta>=best.delta)?best:row).action;
}
export function battleWindowDelta(pack,state,actor){
 const pending=state?.pending;
 if(!pending||state.status!=='playing')return 0;
 if(pending.kind==='attack-life-target'){
  const defender=Number.isInteger(pending.defender)?pending.defender:pending.player;
  return lifeChange(state,actor,defender,pending.count||1);
 }
 const rows=battleOptions(pack,state,actor);
 if(!rows.length)return 0;
 const maximize=(state.pending?.player??state.active)===actor;
 return rows.reduce((best,row)=>maximize?Math.max(best,row.delta):Math.min(best,row.delta),maximize?-Infinity:Infinity);
}
function positionValue(pack,state,actor,strategy){
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
export function explainValue(pack,state,actor){
 const opp=1-actor;
 const mine=state.players[actor];
 const handRaid=mine.hand.reduce((sum,card)=>sum+raidMaterialValue(pack,state,actor,card),0);
 const ownBoard=board(pack,state,actor);
 const oppBoard=board(pack,state,opp);
 const battle=battleWindowDelta(pack,state,actor);
 const life=lifeScore(mine.life.length)-lifeScore(state.players[opp].life.length);
 const boardScore=ownBoard-oppBoard;
 const hand=Math.min(mine.hand.length,6)*2.2;
 const energy=Math.min(universalEnergy(pack,state,actor),6)*6-Math.min(universalEnergy(pack,state,opp),6)*2;
 const ap=mine.apCards.filter(card=>card.ready).length*1.5;
 return {total:life+boardScore+handRaid+hand+energy+ap+battle,life,board:boardScore,handRaid,hand,energy,ap,battle};
}
export function evaluate(pack,state,actor,strategy){
 const done=terminalValue(state,actor);
 if(done!==null)return done;
 return positionValue(pack,state,actor,strategy)+battleWindowDelta(pack,state,actor);
}
