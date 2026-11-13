// Static position value. It deliberately does not look a turn ahead:
// a front body is not worth more than developing energy. The beam search
// has to see the opponent's turn before a blocker outranks that energy.
import {dispatchUniversalAction,effectiveHandRequiredEnergy,legalUniversalActions,universalAttackDamage,universalBp,universalEnergy,universalEnergyByColor,universalImpact,universalImpactNull} from '../engine.mjs';
import {fieldRestrictions,originalEffectsDisabled} from '../continuous-states.mjs';
import {aot2Warhammer} from '../aot2-continuous.mjs';
import {packOf} from './observation.mjs';
import {cachedLegal,engineDispatch,noteDispatch,spendSharedStep,strategyScore} from './strategy.mjs';

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
function colorsOf(pack,state,player){
 try{return universalEnergyByColor(pack,state,player)||{};}
 catch{return {};}
}
const DECK_LOOK=new Set(['peekTopOrBottom','peekTopOne','draw','searchTopUpToTwoBottom','searchTopOneBottomDiscard','searchDeckOne','searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside']);
function onPlay(printed){
 const list=printed?.effects?.onPlay;
 return Array.isArray(list)?list:[];
}
function readyAp(state,player){
 return (state?.players?.[player]?.apCards||[]).filter(item=>item?.ready).length;
}
// A generator whose on-play is an optional discard, then a look at the deck.
// A gated discard, or a draw that does not ask for a discard, is not this chain.
export function sequencedFilter(printed){
 if(!printed||printed.type!=='character'||!(printed.gen>0))return false;
 return onPlay(printed).some(effect=>effect?.op==='discardGate'&&effect.optional!==false&&!effect.when&&
  (effect.then||[]).some(step=>DECK_LOOK.has(step?.op)&&!step?.when));
}
export function lineSwitchBody(printed){
 if(!printed||printed.type!=='character')return false;
 if(printed.frontForbidden)return true;
 return onPlay(printed).some(effect=>effect?.op==='moveOtherAcrossOrRemove'&&!effect.when);
}
function plainGenerator(printed){
 return printed?.type==='character'&&printed.gen>0&&onPlay(printed).length===0;
}
function developingDraw(printed){
 return printed?.type==='character'&&(printed.gen||0)>=2&&
  onPlay(printed).some(effect=>effect?.op==='draw'&&!effect.when);
}
export function recoversActionPoints(printed){
 return (printed?.type==='event')&&onPlay(printed).some(effect=>effect?.op==='recoverAp'&&(effect.count||0)>=2);
}
function sameCostFilters(hand,catalog,printed,card){
 const cost=Number(printed.energy)||0;
 return hand.filter(other=>other&&other.uid!==card?.uid&&sequencedFilter(catalog[other.cardId])&&
  catalog[other.cardId].color===printed.color&&(Number(catalog[other.cardId].energy)||0)===cost);
}
function gainedFromFilters(hand,catalog,printed,card,have,ready,slots){
 let gained=0,ap=ready,room=slots;
 const extras=hand.filter(other=>other&&other.uid!==card?.uid&&sequencedFilter(catalog[other.cardId])&&
  catalog[other.cardId].color===printed.color)
  .map(other=>catalog[other.cardId])
  .sort((a,b)=>(Number(a.energy)||0)-(Number(b.energy)||0));
 for(const body of extras){
  if(ap<=0||room<=0)break;
  if((Number(body.energy)||0)>have+gained)continue;
  gained+=body.gen||0;
  ap-=Number.isInteger(body.ap)?body.ap:1;
  room-=1;
 }
 return have+gained;
}
function reachableDevelopment(state,player,printed,card,hand,catalog,colors,ready){
 const cost=Number(printed.energy)||0;
 const have=colors[printed.color]||0;
 if(cost<=have)return true;
 const slots=(state.players?.[player]?.energy||[]).filter(slot=>!slot).length;
 return gainedFromFilters(hand,catalog,printed,card,have,ready,slots)>=cost;
}
function filterSource(state,player,catalog){
 const pending=state?.pending;
 if(pending?.kind!=='effect-discard-gate'||pending.player!==player||!pending.sourceUid)return null;
 const mine=state.players?.[player];
 const source=[...(mine?.energy||[]),...(mine?.front||[]),...(mine?.resolvingEvents||[]),...(mine?.hand||[])]
  .find(body=>body?.uid===pending.sourceUid);
 const printed=source&&catalog[source.cardId];
 return sequencedFilter(printed)?printed:null;
}
// What the discard window should hold onto. A payable generator is the energy
// plan while something in hand still cannot be paid. A cheap body we can play
// this turn stays. An event is worth keeping only when it can be paid at a
// live opposing front; a duplicate is the easier copy to spend. Raid material
// already on our side stays above all of those.
// A plain generator is not that plan once two other cards of the same cost and
// color already look at the deck. While one of those looks is being paid and
// the hand can still reach a line-switch or a double-energy draw, that card,
// the next look, and a refund already in hand stay above one-cost fuel. Raid
// material is not fuel, and similar energy does not make a card the raid base.
// A gate with no such follow-up still spends an unaffordable event first.
export function keepScore(pack,state,player,card){
 const catalog=packOf(pack,player).cards;
 const printed=catalog[card?.cardId];
 if(!printed)return 0;
 let score=(Number(printed.bp)||0)/400+(printed.gen||0)*2+raidMaterialValue(pack,state,player,card);
 const colors=colorsOf(pack,state,player);
 const have=colors[printed.color]||0;
 const cost=Number(printed.energy)||0;
 const payable=cost<=have;
 const ready=readyAp(state,player);
 const hand=state.players?.[player]?.hand||[];
 let stranded=0;
 for(const other of hand){
  const body=catalog[other?.cardId];
  if(body&&(Number(body.energy)||0)>(colors[body.color]||0))stranded++;
 }
 const covered=plainGenerator(printed)&&sameCostFilters(hand,catalog,printed,card).length>=2;
 if(!covered&&payable&&printed.gen>0&&stranded>0)score+=6;
 if(!covered&&payable&&printed.type==='character'&&cost<=1&&ready>0)score+=3;
 if(printed.type==='event'){
  const foes=(state.players?.[1-player]?.front||[]).filter(Boolean);
  if(payable&&foes.length)score+=6;
 }
 const copies=hand.filter(other=>other?.cardId===card.cardId).length;
 if(copies>1)score-=Math.min(3,copies-1);
 if(filterSource(state,player,catalog)){
  const keeper=sequencedFilter(printed)||lineSwitchBody(printed)||developingDraw(printed)||recoversActionPoints(printed);
  const chain=hand.some(other=>{
   const body=catalog[other?.cardId];
   return (lineSwitchBody(body)||developingDraw(body))&&
    reachableDevelopment(state,player,body,other,hand,catalog,colors,ready);
  });
  if(chain&&keeper&&reachableDevelopment(state,player,printed,card,hand,catalog,colors,ready))score+=16;
  if(chain&&!keeper&&raidMaterialValue(pack,state,player,card)<=0&&
   printed.type==='character'&&payable&&cost<=1)score-=16;
 }
 return score;
}
// The private peek has already shown this top card. Rank keeping it only when
// the refund can be paid now. The cards under it stay unread.
export function payableRefundOnTop(pack,state,player){
 if(state?.pending?.kind!=='private-top-place'||state.pending.player!==player)return false;
 const top=state.players?.[player]?.deck?.[0];
 const printed=top&&packOf(pack,player).cards[top.cardId];
 if(!recoversActionPoints(printed))return false;
 const have=colorsOf(pack,state,player)[printed.color]||0;
 const ap=Number.isInteger(printed.ap)?printed.ap:1;
 return (Number(printed.energy)||0)<=have&&ap<=readyAp(state,player);
}
// Playing this filter to energy is what makes a line-switch in hand payable.
export function filterEnergyFirst(pack,state,player,action){
 if(action?.type!=='play'||action.line!=='energy'||!action.uid)return false;
 const catalog=packOf(pack,player).cards;
 const hand=state.players?.[player]?.hand||[];
 const card=hand.find(item=>item?.uid===action.uid);
 const printed=card&&catalog[card.cardId];
 if(!sequencedFilter(printed))return false;
 const pay=Number.isInteger(printed.ap)?printed.ap:1;
 if(readyAp(state,player)-pay<1)return false;
 const have=colorsOf(pack,state,player)[printed.color]||0;
 const slots=(state.players?.[player]?.energy||[]).filter(slot=>!slot).length;
 const reach=gainedFromFilters(hand,catalog,printed,null,have,readyAp(state,player),slots);
 return hand.some(other=>{
  if(!other||other.uid===card.uid)return false;
  const body=catalog[other.cardId];
  if(!lineSwitchBody(body)||body.color!==printed.color)return false;
  const cost=Number(body.energy)||0;
  return cost>have&&cost<=reach;
 });
}
// The last action point can still play the line-switch once the filters have
// raised its color. A freshly played body is not given a block from this rank.
export function lastApLineSwitch(pack,state,player,action){
 if(action?.type!=='play'||action.line!=='energy'||!action.uid)return false;
 if(readyAp(state,player)!==1)return false;
 const catalog=packOf(pack,player).cards;
 const card=(state.players?.[player]?.hand||[]).find(item=>item?.uid===action.uid);
 const printed=card&&catalog[card.cardId];
 if(!lineSwitchBody(printed))return false;
 const have=colorsOf(pack,state,player)[printed.color]||0;
 return (Number(printed.energy)||0)<=have;
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
   // characters stay and Impact does not land. A second block is available
   // only when this block stands the body back up. Otherwise it stays
   // rested, and a loss removes it before any later swing.
   if(bp>atkBp){
    if(reStandsAfterNextBlock(pack,state,blocker)){
     const kept=ready.map(item=>item.uid===blocker.uid?{...item,uses:1}:item);
     delta=lifeChange(state,actor,defender,unanswered(kept,threats));
    }else{
     const rested=front.map(card=>card?.uid===blocker.uid?{...card,ready:false}:card);
     delta=boardChange(pack,state,actor,defender,rested);
     delta+=lifeChange(state,actor,defender,unanswered(others,threats));
    }
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
// The next block stands the body back up only on the same conditions the
// engine uses: the printed count, a live until-next-start grant, or the
// shared warhammer check, matched against blocks already spent, plus an
// earned grant on the first block. Silence drops the printed text. A
// skip or an active lock still leaves the body rested. This does not
// dispatch and does not change the match.
function reStandsAfterNextBlock(pack,state,card){
 if(!card?.uid)return false;
 const owner=Number(String(card.uid).split('-')[0]);
 const side=state.players?.[owner];
 if(!side)return false;
 const blocked=(Number(state.blocksByUid?.[card.uid])||0)+1;
 let silenced=true,printed=0,hammer=false;
 try{silenced=originalEffectsDisabled(state,card);}catch{silenced=true;}
 try{
  printed=Number(packOf(pack,owner).cards[card.cardId]?.readyOnBlockCount)||0;
  hammer=aot2Warhammer(pack,state,card)===true;
 }catch{printed=0;hammer=false;}
 const until=card.doubleBlockUntil;
 const untilLive=!silenced&&!!until&&until.stamp===card.fieldEntryStamp&&side.ownTurns<until.untilOwnTurnStart;
 const keyword=Math.max(silenced?0:printed,untilLive?1:0,hammer?1:0);
 const grant=card.doubleBlockGranted;
 const earned=!!grant&&grant.stamp===card.fieldEntryStamp&&side.ownTurns<grant.untilOwnTurnStart&&blocked===1;
 if(!((keyword>0&&blocked===keyword&&!silenced)||earned))return false;
 let rows=[];
 try{rows=fieldRestrictions(state,owner,card);}catch{return false;}
 if(rows.some(row=>row.kind==='cannotActive'||row.kind==='skipNextActive'))return false;
 if(card.ownEffectActiveOnly){
  const home=[...(side.front||[]),...(side.energy||[])].some(body=>body?.uid===card.uid);
  if(!home)return false;
 }
 return true;
}
function blockUses(pack,state,card){
 return reStandsAfterNextBlock(pack,state,card)?2:1;
}
function blockerView(pack,state,card){
 try{
  return {uid:card.uid,bp:Number(universalBp(pack,state,card))||0,
   nulls:universalImpactNull(pack,state,card)===true,uses:blockUses(pack,state,card)};
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
// against that attacker. The whole set is matched together: spending the
// only body who can answer a later swing on an earlier one is not a save.
// A normal body is used once. A second use exists only when the engine has
// already given that body another block. Unproven lists do not reduce damage.
function cleanPrevented(blockers,threats){
 const usable=blockers.filter(item=>item?.uid);
 const open=threats.filter(threat=>threat?.legal instanceof Set);
 if(!usable.length||!open.length)return 0;
 const left=usable.map(item=>item.uses>1?item.uses:1);
 let best=0;
 const walk=(index,saved)=>{
  if(saved>best)best=saved;
  if(index>=open.length)return;
  walk(index+1,saved);
  const threat=open[index];
  for(let i=0;i<usable.length;i++){
   if(left[i]<=0)continue;
   const blocker=usable[i];
   if(!(blocker.bp>threat.bp)||!threat.legal.has(blocker.uid))continue;
   left[i]-=1;
   walk(index+1,saved+threat.damage);
   left[i]+=1;
  }
 };
 walk(0,0);
 return best;
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
   cursor=engineDispatch(pack,cursor,action,{actor:cursor.pending?.player??cursor.active});
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
 // One higher body can answer only one swing. Another ready attacker, or a
 // swing that already happened this turn, is the rest of the wave. The line
 // scores that follow-up itself. This penalty is only the lone blank swing.
 const wave=(state.players[actor].front||[]).some(card=>card?.ready&&card.uid!==attacker.uid);
 if(wave||(state.attacksThisTurn||0)>0)return 0;
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
// A raid changes the energy the engine actually produces. The penalty is a
// hand character the raid left in hand when that color paid the effective
// hand cost before the transfer and does not pay it at the state this line
// reached. The requirement is effectiveHandRequiredEnergy on the physical
// card in each of those states, so a discount that is still live keeps its
// lower cost, and a discount that expired is judged at the new cost. Printed
// energy is not the requirement. AP and other play bans stay in the legal
// action filter above this energy check. A later start phase has no play
// action; that absence is not an energy loss. A card the line already played,
// or a color the line restored, is the line's own result.
export function raidStranded(pack,state,actor,action,after){
 if(action?.type!=='raid'||!after||state?.pending||state?.phase!=='main')return 0;
 const catalog=packOf(pack,actor).cards;
 let legal;
 try{legal=cachedLegal(pack,state);}catch{return 0;}
 const payable=new Set();
 for(const item of legal){
  if(!item?.uid||item.uid===action.uid)continue;
  if(item.type!=='play'&&item.type!=='raid')continue;
  payable.add(item.uid);
 }
 const beforeHand=state.players?.[actor]?.hand||[];
 const afterHand=after.players?.[actor]?.hand||[];
 let stranded=0;
 for(const uid of payable){
  const beforeCard=beforeHand.find(item=>item?.uid===uid);
  const afterCard=afterHand.find(item=>item?.uid===uid);
  if(!beforeCard||!afterCard)continue;
  const printed=catalog[afterCard.cardId];
  if(!printed||printed.type!=='character')continue;
  let beforeNeed,afterNeed;
  try{
   beforeNeed=effectiveHandRequiredEnergy(pack,state,actor,printed,beforeCard);
   afterNeed=effectiveHandRequiredEnergy(pack,after,actor,printed,afterCard);
  }catch{continue;}
  const had=colorsOf(pack,state,actor)[printed.color]||0;
  const have=colorsOf(pack,after,actor)[printed.color]||0;
  if(beforeNeed<=had&&afterNeed>have)stranded++;
 }
 return stranded*2.2;
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
// One removed card has to earn its place. The card is already outside, so the
// hand plan in keepScore does not apply in full: only a share of it is a
// later payment. A one-point BP tick does not spend a raid piece. Retiring a
// body, or taking away a hit that life cannot afford, still does. This is
// the finished payment, not the score of a single pick.
function outsideFuel(pack,state,actor,card){
 return Math.max(1,keepScore(pack,state,actor,card)*0.2);
}
function act(pack,cursor,action){
 return dispatchUniversalAction(pack,cursor,action,{actor:cursor.pending?.player??cursor.active});
}
function readyBp(pack,state,actor){
 let best=0;
 for(const card of state.players?.[actor]?.front||[]){
  if(!card?.ready)continue;
  const bp=Number(universalBp(pack,state,card))||0;
  if(bp>best)best=bp;
 }
 return best;
}
// Declining the block pays attack damage. A strictly higher ready body can
// win that battle, so the hit is not forced. Impact is the cost of losing
// the block, which this line does not have to accept.
function forcedAttackLoss(pack,state,actor){
 if(!state||state.status!=='playing'||state.pending)return 0;
 const foe=1-actor;
 const blockers=(state.players?.[actor]?.front||[]).filter(card=>card?.ready)
  .map(card=>({bp:Number(universalBp(pack,state,card))||0,used:false}));
 const attackers=(state.players?.[foe]?.front||[]).filter(card=>card?.ready)
  .sort((a,b)=>(Number(universalBp(pack,state,b))||0)-(Number(universalBp(pack,state,a))||0));
 let loss=0;
 for(const attacker of attackers){
  const bp=Number(universalBp(pack,state,attacker))||0;
  const stop=blockers.find(blocker=>!blocker.used&&blocker.bp>bp);
  if(stop){stop.used=true;continue;}
  loss+=Math.max(0,Number(universalAttackDamage(pack,state,attacker))||0);
 }
 return loss;
}
function threatenedLife(pack,state,actor){
 const loss=forcedAttackLoss(pack,state,actor);
 if(loss<=0)return 0;
 const have=state.players?.[actor]?.life?.length||0;
 return lifeScore(Math.max(0,have-loss))-lifeScore(have);
}
function removalStep(pack,state,k,ranked,already){
 const legal=legalUniversalActions(pack,state);
 if(k<=0)return legal.find(action=>action.type==='chooseRemoveOutside'&&action.mode==='skip')||null;
 if(k===already)return legal.find(action=>action.type==='chooseRemoveOutside'&&action.mode==='done')||null;
 return legal.find(action=>action.type==='chooseRemoveOutside'&&action.mode==='pick'&&action.uid===ranked[0]?.uid)||null;
}
function projectScale(pack,state,actor,k,targetUid,ranked,already){
 const first=removalStep(pack,state,k,ranked,already);
 if(!first)return null;
 const copy=structuredClone(state);
 copy.pending=null;
 const drop=new Set(state.pending?.selected||[]);
 for(const card of ranked.slice(0,Math.max(0,k-already)))drop.add(card.uid);
 let spent=0;
 const mine=copy.players[actor];
 mine.outside=(mine.outside||[]).filter(card=>{
  if(!drop.has(card.uid))return true;
  spent+=outsideFuel(pack,state,actor,card);
  return false;
 });
 if(k>0&&targetUid){
  const foe=copy.players[1-actor];
  for(const line of ['front','energy']){
   const slot=(foe[line]||[]).findIndex(card=>card?.uid===targetUid);
   if(slot<0)continue;
   const card=foe[line][slot];
   card.buffs=[...(card.buffs||[]),{bp:-k*state.pending.scalePer,untilTurn:copy.turn}];
   if((Number(universalBp(pack,copy,card))||0)<=0)foe[line][slot]=null;
  }
 }
 const score=evaluate(pack,copy,actor)+threatenedLife(pack,copy,actor)-spent;
 return {score,first,k};
}
// The removal window pays one card at a time, then chooses one enemy. A
// two-step search never sees the tenth payment, so it can stop while the
// threatened body is still on the field. This reads the finished payment:
// how many of the cheapest outside cards, and which one enemy, leave the
// best final position. It does not name a card.
function scaledTargetAction(pack,state,actor){
 let best=null;
 for(const action of legalUniversalActions(pack,state)){
  if(action.type!=='chooseTarget')continue;
  let cursor=null;
  try{cursor=act(pack,state,action);}catch{continue;}
  if(cursor.pending)continue;
  const score=evaluate(pack,cursor,actor)+threatenedLife(pack,cursor,actor);
  if(!best||score>best.score+1e-9)best={score,action};
 }
 return best?.action||null;
}
export function scaledOutsideAction(pack,state,actor){
 const pending=state?.pending;
 if((pending?.player??state?.active)!==actor)return null;
 if(pending?.kind==='effect-target')return scaledTargetAction(pack,state,actor);
 if(pending?.kind!=='effect-remove-outside'||pending.any!==true||!(pending.scalePer>0))return null;
 const selected=pending.selected||[];
 const already=selected.length;
 const chosen=new Set(selected);
 const ranked=(state.players?.[actor]?.outside||[])
  .filter(card=>pending.choices?.includes(card.uid)&&!chosen.has(card.uid))
  .sort((a,b)=>keepScore(pack,state,actor,a)-keepScore(pack,state,actor,b)||(a.uid<b.uid?-1:1));
 const max=already+ranked.length;
 const per=pending.scalePer;
 const ours=readyBp(pack,state,actor);
 const steps=new Set([already]);
 if(!already)steps.add(0);
 steps.add(max);
 for(const card of state.players?.[1-actor]?.front||[]){
  if(!card)continue;
  let bp=0;
  try{bp=Number(universalBp(pack,state,card))||0;}catch{continue;}
  if(bp<=0)continue;
  steps.add(Math.min(max,Math.ceil(bp/per)));
  if(ours>0&&bp>=ours)steps.add(Math.min(max,Math.ceil((bp-ours+1)/per)));
 }
 let best=null;
 const foes=(state.players?.[1-actor]?.front||[]).filter(Boolean).map(card=>card.uid);
 for(const k of steps){
  if(k<already||k>max)continue;
  const menus=k<=0||!foes.length?[null]:foes;
  for(const target of menus){
   let row=null;
   try{row=projectScale(pack,state,actor,k,target,ranked,already);}catch{row=null;}
   if(!row)continue;
   if(!best||row.score>best.score+1e-9||(Math.abs(row.score-best.score)<=1e-9&&row.k<best.k))best=row;
  }
 }
 return best?.first||null;
}
