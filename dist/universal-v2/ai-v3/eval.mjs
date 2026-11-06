// Static position value. It deliberately does not look a turn ahead:
// a front body is not worth more than developing energy. The beam search
// has to see the opponent's turn before a blocker outranks that energy.
import {dispatchUniversalAction,legalUniversalActions,universalAttackDamage,universalBp,universalEnergy,universalEnergyByColor,universalImpact,universalImpactNull} from '../engine.mjs';
import {fieldRestrictions} from '../continuous-states.mjs';
import {packOf} from './observation.mjs';
import {noteDispatch,spendSharedStep,strategyScore} from './strategy.mjs';

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
// Who may attack, and who may block that attacker, is the engine's own
// list for this public state. Standing and a higher BP are not a block.
// Each later attacker has its own list. The read is cached on the state
// object, so another branch does not reuse it. A failed read proves no
// attack and no prevention.
const legalityNotes=new WeakMap();
function legalityNote(state){
 let note=legalityNotes.get(state);
 if(!note){note={attacks:undefined,blocks:new Map()};legalityNotes.set(state,note);}
 return note;
}
function attackRights(pack,state){
 const note=legalityNote(state);
 if(note.attacks!==undefined)return note.attacks;
 let legal=[];
 try{
  const copy=structuredClone(state);
  copy.pending=null;
  legal=legalUniversalActions(pack,copy);
 }catch{note.attacks=null;return null;}
 note.attacks=new Set(legal.filter(action=>action.type==='attack'&&action.uid).map(action=>action.uid));
 return note.attacks;
}
function blockRights(pack,state,defender,attackerUid){
 const note=legalityNote(state);
 if(note.blocks.has(attackerUid))return note.blocks.get(attackerUid);
 let legal=[];
 try{
  const copy=structuredClone(state);
  copy.pending={kind:'block',player:defender,attackerUid};
  legal=legalUniversalActions(pack,copy);
 }catch{note.blocks.set(attackerUid,null);return null;}
 const ids=new Set(legal.filter(action=>action.type==='chooseBlock'&&action.uid).map(action=>action.uid));
 note.blocks.set(attackerUid,ids);
 return ids;
}
// A block or life window is scored before the engine has applied it. The
// adjustment is the public result of the attack that is already open:
// life from universalAttackDamage, a blocker leaving when the attacker's
// BP is greater or equal, and Impact only when the engine still counts it.
// The defender's own plan picks the row. Another scorer sees that same
// plan with the sign turned around. Hidden life cards, hands and deck
// order are not read. The line stays pending; this is not a completed turn.
function battleOptions(pack,state,actor){
 const rows=framedBattle(pack,state);
 if(!rows.length)return rows;
 const defender=state.pending?.player;
 if(!Number.isInteger(actor)||actor===defender)return rows;
 return rows.map(row=>({action:row.action,delta:-row.delta,damage:row.damage,impact:row.impact}));
}
function framedBattle(pack,state){
 const pending=state?.pending;
 if(!pending||state.status!=='playing'||pending.kind!=='block')return [];
 const attacker=findBody(state,pending.attackerUid);
 const defender=pending.player;
 if(!attacker||!Number.isInteger(defender))return [];
 const actor=defender;
 let damage=1,impact=0,atkBp=0;
 try{
  damage=universalAttackDamage(pack,state,attacker);
  impact=universalImpact(pack,state,attacker);
  atkBp=Number(universalBp(pack,state,attacker))||0;
 }catch{return [];}
 let legal=[];
 try{legal=legalUniversalActions(pack,state);}catch{return [];}
 const front=state.players[defender].front||[];
 const threats=laterThreats(pack,state,attacker,defender);
 const ready=front.filter(card=>card?.ready).map(card=>blockerView(pack,state,card)).filter(Boolean);
 const rows=[];
 for(const action of legal){
  if(action?.type!=='chooseBlock')continue;
  let delta=0;
  if(!action.uid)delta=followUpDelta(pack,state,actor,defender,damage,ready,threats);
  else{
   const blocker=front.find(card=>card?.uid===action.uid);
   if(!blocker)continue;
   const bp=Number(universalBp(pack,state,blocker))||0;
   const others=ready.filter(item=>item.uid!==blocker.uid);
   // Q34: the blocker wins only when its BP is strictly higher. Both
   // characters stay and Impact does not land. The body is rested for the
   // rest of this attack, which is the loss the leaf can see.
   if(bp>atkBp){
    const rested=front.map(card=>card?.uid===blocker.uid?{...card,ready:false}:card);
    delta=boardChange(pack,state,actor,defender,rested);
    delta+=lifeChange(state,actor,defender,unanswered(others,threats));
   }
   else{
    const removed=front.map(card=>card?.uid===blocker.uid?null:card);
    const body=boardChange(pack,state,actor,defender,removed);
    const plan=defender===actor&&bp>=4000?provenRebuild(pack,state,actor,blocker.uid):null;
    if(plan?.ok&&body<0)delta=Math.max(body,-2.2);
    else{
     delta=body;
     if(holdMain(state,actor,defender,bp,atkBp,damage,impact,threats.length)){
      const passed=lifeChange(state,actor,defender,damage);
      if(delta>passed)delta=passed-4;
     }
    }
    const leak=impact>0&&!universalImpactNull(pack,state,blocker)?impact:0;
    delta+=lifeChange(state,actor,defender,leak+unanswered(others,threats));
   }
  }
  rows.push({action,delta,damage,impact});
 }
 return rows;
}
function blockerView(pack,state,card){
 try{
  return {uid:card.uid,bp:Number(universalBp(pack,state,card))||0,
   nulls:universalImpactNull(pack,state,card)===true};
 }catch{return null;}
}
function threatView(pack,state,card){
 let damage=1,impact=0,bp=0;
 try{
  damage=universalAttackDamage(pack,state,card)||1;
  impact=universalImpact(pack,state,card)||0;
  bp=Number(universalBp(pack,state,card))||0;
 }catch{/* one damage, no impact, no BP */}
 return {uid:card.uid,damage,impact,bp};
}
function laterThreats(pack,state,attacker,defender){
 const owner=Number(String(attacker?.uid||'').split('-')[0]);
 const pl=state.players?.[owner];
 if(!pl||!Number.isInteger(defender))return [];
 const rights=attackRights(pack,state);
 if(!rights)return [];
 const rows=[];
 const add=card=>{
  if(!card?.ready||!rights.has(card.uid))return;
  const view=threatView(pack,state,card);
  view.legal=blockRights(pack,state,defender,card.uid);
  rows.push(view);
 };
 for(const card of pl.front||[]){
  if(!card||card.uid===attacker.uid)continue;
  add(card);
 }
 if(attacker?.ready)add(attacker);
 return rows;
}
// A later swing is stopped only by a winning block the engine still allows
// against that attacker. A higher BP on a character who cannot block, or a
// list copied from the attack that is open now, is not that save. An
// unproven list does not reduce the damage.
function cleanPrevented(blockers,threats){
 const pool=blockers.map(item=>({uid:item.uid,bp:item.bp,used:false}));
 let saved=0;
 for(const threat of threats.slice().sort((a,b)=>b.damage-a.damage)){
  if(!(threat.legal instanceof Set))continue;
  const found=pool.find(item=>!item.used&&item.bp>threat.bp&&threat.legal.has(item.uid));
  if(!found)continue;
  found.used=true;
  saved+=threat.damage;
 }
 return saved;
}
function unanswered(blockers,threats){
 return threats.reduce((sum,threat)=>sum+threat.damage,0)-cleanPrevented(blockers,threats);
}
function removalDelta(pack,state,actor,defender,uid){
 const front=state.players[defender].front||[];
 return boardChange(pack,state,actor,defender,front.map(card=>card?.uid===uid?null:card));
}
// Passing keeps the blocker for one later swing. A clean save removes that
// swing's damage. Blocking and still losing the character, Impact included,
// is scored as that loss rather than as damage prevented.
function followUpDelta(pack,state,actor,defender,damage,blockers,threats){
 const all=damage+threats.reduce((sum,threat)=>sum+threat.damage,0);
 let best=lifeChange(state,actor,defender,all);
 const saved=cleanPrevented(blockers,threats);
 if(saved)best=Math.max(best,lifeChange(state,actor,defender,all-saved));
 for(const blocker of blockers){
  for(let i=0;i<threats.length;i++){
   const threat=threats[i];
   if(!(threat.legal instanceof Set)||!threat.legal.has(blocker.uid))continue;
   if(blocker.bp>threat.bp)continue;
   const leak=threat.impact>0&&!blocker.nulls?threat.impact:0;
   const rest=blockers.filter(item=>item.uid!==blocker.uid);
   const others=threats.filter((_,index)=>index!==i);
   const loss=damage+leak+unanswered(rest,others);
   const value=lifeChange(state,actor,defender,loss)+removalDelta(pack,state,actor,defender,blocker.uid);
   if(value>best)best=value;
  }
 }
 return best;
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
// One clean last hit that removes our 4000, no Impact, nothing else still
// ready to attack. A higher attacking BP does not make that body more worth
// losing. While four or more life remain, the hit does not pay for the main.
// At three the hold is gone and the life step is compared again. A winning
// block, a cheaper body, two damage, and a full refill do not use this hold.
function holdMain(state,actor,defender,bp,atkBp,damage,impact,later){
 if(defender!==actor||damage!==1||impact>0||later>0)return false;
 if(bp<4000||atkBp<bp)return false;
 const life=state.players?.[actor]?.life?.length||0;
 return life>=4&&life-damage>0;
}
// One immutable position. A shared search pool is not the same position:
// another branch can keep this uid and still have a different hand, energy
// line or restriction. An unfinished walk is not stored.
const rebuildProofs=new WeakMap();
function cachedProof(state,actor,removedUid,run){
 let bag=rebuildProofs.get(state);
 if(!bag){bag=new Map();rebuildProofs.set(state,bag);}
 const key=actor+':'+removedUid;
 if(bag.has(key))return bag.get(key);
 const result=run();
 if(result?.reason!=='budget')bag.set(key,result);
 return result;
}
// The next own turn fills all four front slots from the known hand and the
// public board. Every body is at least 4000, stands, and has a legal attack
// after the plan is played. A normal play enters rested, so it does not
// count. A paid Raid or a printed active entry does. Empty slots, a body
// that still cannot attack, and a walk the budget cannot finish are not
// success. The deck is not consulted.
export function provenRebuild(pack,state,actor,removedUid){
 return cachedProof(state,actor,removedUid,()=>planRebuild(pack,state,actor,removedUid));
}
function planRebuild(pack,state,actor,removedUid){
 const mine=state?.players?.[actor];
 if(!mine||!Array.isArray(mine.front)||mine.front.length<4)return {ok:false,reason:'none'};
 const catalog=packOf(pack,actor).cards;
 const colors=colorEnergy(pack,state,actor);
 let ap=apOnNextTurn(state,actor);
 const energy=(mine.energy||[]).map(card=>card?.uid||'').join(',');
 const oppRested=(state.players?.[1-actor]?.front||[]).some(body=>body&&body.ready===false);
 const used=new Set();
 const planned=mine.front.map(card=>card&&card.uid!==removedUid?{uid:card.uid,cardId:card.cardId,from:'field'}:null);
 const liveBp=card=>{
  try{
   const value=Number(universalBp(pack,state,card));
   if(Number.isFinite(value)&&value>0)return value;
  }catch{/* printed BP below */}
  return Number(catalog[card?.cardId]?.bp)||0;
 };
 const spendable=printed=>printed&&printed.type==='character'&&(Number(printed.bp)||0)>=4000&&
  (printed.ap||1)<=ap&&(printed.energy||0)<=(colors[printed.color]||0);
 const entersReady=printed=>printed.enterAlwaysActive===true||
  (printed.enterActiveIfOpponentRest===true&&oppRested);
 for(let slot=0;slot<planned.length;slot++){
  const current=planned[slot];
  const fieldCard=current&&mine.front.find(card=>card?.uid===current.uid);
  if(current&&catalog[current.cardId]?.type==='character'&&liveBp(fieldCard)>=4000&&
   attacksNextTurn(state,actor,fieldCard))continue;
  let placed=null;
  for(const card of mine.hand||[]){
   if(!card||used.has(card.uid))continue;
   const printed=catalog[card.cardId];
   if(!spendable(printed))continue;
   if(!current&&entersReady(printed)){
    placed={uid:card.uid,cardId:printed.id,from:printed.enterAlwaysActive?'active':'rested-active'};
    break;
   }
   if(!current||!printed.raidName)continue;
   const names=new Set([printed.raidName,...(printed.raidBaseNames||[])].map(squash));
   if(!names.has(squash(catalog[current.cardId]?.name)))continue;
   if((mine.energy||[]).some(body=>body?.uid===current.uid))continue;
   placed={uid:card.uid,cardId:printed.id,from:'raid',baseUid:current.uid};
   break;
  }
  if(!placed)return {ok:false,reason:'unproven'};
  used.add(placed.uid);
  ap-=catalog[placed.cardId].ap||1;
  planned[slot]=placed;
 }
 if(planned.length<4||planned.some(slot=>!slot))return {ok:false,reason:'unproven'};
 if(planned.some(slot=>(Number(catalog[slot.cardId]?.bp)||0)<4000))return {ok:false,reason:'unproven'};
 if((mine.energy||[]).map(card=>card?.uid||'').join(',')!==energy)return {ok:false,reason:'energy'};
 const walked=walkRebuild(pack,state,actor,removedUid,planned,energy);
 if(!walked.ok)return walked;
 const fresh=planned.find(slot=>slot.from!=='field');
 return {ok:true,cardId:fresh?.cardId||planned[0].cardId,
  mode:planned.some(slot=>slot.from==='raid')?'raid':'active',filled:planned.length};
}
// A ban that expires on the opponent's next start is still in force on our
// next attack. One that expires on our own next start is gone before then.
// Skipping the next refresh leaves the body rested, so it cannot attack.
function attacksNextTurn(state,actor,card){
 if(!card)return false;
 let rows=[];
 try{rows=fieldRestrictions(state,actor,card);}catch{return false;}
 if(rows.some(row=>row.kind==='cannotAttack'&&row.until?.player!==actor))return false;
 if(rows.some(row=>row.kind==='cannotActive'||row.kind==='skipNextActive'))return false;
 if(card.ownEffectActiveOnly)return false;
 return true;
}
function walkRebuild(pack,state,actor,removedUid,planned,energy){
 let cursor;
 try{cursor=structuredClone(state);}catch{return {ok:false,reason:'unproven'};}
 const queue=planned.filter(slot=>slot.from!=='field');
 let blocked=false,played=0;
 for(let step=0;step<12;step++){
  if(blocked&&played===queue.length&&cursor.active===actor&&cursor.phase==='attack'&&!cursor.pending)
   return rebuiltPosition(pack,cursor,actor,planned,energy);
  const ticket=spendSharedStep();
  if(ticket==='blocked')return {ok:false,reason:'budget'};
  const action=rebuildAction(pack,cursor,actor,removedUid,queue,played,blocked);
  if(!action)return {ok:false,reason:'unproven'};
  try{
   cursor=dispatchUniversalAction(pack,cursor,action,{actor:cursor.pending?.player??cursor.active});
  }catch{return {ok:false,reason:'unproven'};}
  if(ticket==='spent')noteDispatch();
  if(action.type==='chooseBlock'&&action.uid===removedUid)blocked=true;
  if(action.type==='play'||action.type==='raid')played++;
 }
 return {ok:false,reason:'unproven'};
}
function rebuildAction(pack,cursor,actor,removedUid,queue,played,blocked){
 let legal=[];
 try{legal=legalUniversalActions(pack,cursor);}catch{return null;}
 const pending=cursor.pending;
 if(!blocked&&pending?.kind==='block')
  return legal.find(action=>action.type==='chooseBlock'&&action.uid===removedUid)||null;
 if(pending?.kind==='block')
  return legal.find(action=>action.type==='chooseBlock'&&(action.uid??null)===null)||null;
 if(pending?.kind==='effect-discard-gate')
  return legal.find(action=>action.type==='chooseDiscardGate'&&(action.uid??null)===null)||null;
 if(pending?.kind==='life-trigger')
  return legal.find(action=>action.type==='chooseTrigger'&&action.mode==='get')||
   legal.find(action=>action.type==='chooseTrigger'&&action.mode==='skip')||null;
 if(pending?.kind==='life-batch-order')
  return legal.find(action=>action.type==='chooseLifeOrder')||null;
 if(pending){
  const skip=legal.find(action=>action.type!=='chooseBlock'&&(action.mode==='pass'||action.mode==='skip'||action.mode==='decline'));
  return skip||null;
 }
 if(cursor.active===actor&&cursor.phase==='main'&&played<queue.length){
  const next=queue[played];
  if(next.from==='raid')
   return legal.find(action=>action.type==='raid'&&action.uid===next.uid&&action.baseUid===next.baseUid&&action.line==='front')||null;
  return legal.find(action=>action.type==='play'&&action.uid===next.uid&&action.line==='front')||null;
 }
 return legal.find(action=>action.type==='next')||legal.find(action=>action.type==='extraDraw')||null;
}
function rebuiltPosition(pack,state,actor,planned,energy){
 const bodies=(state.players?.[actor]?.front||[]).filter(Boolean);
 if(bodies.length!==4)return {ok:false,reason:'unproven'};
 const want=new Set(planned.map(slot=>slot.uid));
 if(want.size!==4||bodies.some(card=>!want.has(card.uid)))return {ok:false,reason:'unproven'};
 let attacks=[];
 try{attacks=legalUniversalActions(pack,state).filter(action=>action.type==='attack');}
 catch{return {ok:false,reason:'unproven'};}
 for(const card of bodies){
  let bp=0;
  try{bp=Number(universalBp(pack,state,card))||0;}catch{return {ok:false,reason:'unproven'};}
  if(bp<4000||card.ready!==true||!attacks.some(action=>action.uid===card.uid))
   return {ok:false,reason:'unproven'};
 }
 const left=(state.players[actor].energy||[]).map(card=>card?.uid||'').join(',');
 if(left!==energy)return {ok:false,reason:'energy'};
 return {ok:true};
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
