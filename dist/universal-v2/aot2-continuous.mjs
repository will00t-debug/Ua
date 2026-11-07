// EX10BT continuous sentences. The pack validator keeps its closed condition
// list; these rules are keyed by the printed card id and read from the live
// match. Registration is not an official FAQ certification.
import {cardHasName,cardHasTrait} from './field-conditions.mjs';
import {originalEffectsDisabled} from './continuous-states.mjs';

const RUMBLE='地鳴らし';
const YMIR='始祖ユミル';
const FINAL_EREN='エレン・イェーガー（終尾の巨人）';
export const AOT2_FRONT_PENALTY=['AOT-2-013','AOT-2-029','AOT-2-069'];

// Matches may pass one pack or the two-player pair used by the engine.
function sheet(pack,c){
 if(!c)return null;
 const books=Array.isArray(pack)?pack:[pack];
 const owner=Number(String(c.uid||'').split('-')[0]);
 const book=books[owner]||books[0];
 return book?.cards?.[c.cardId]||null;
}
function fieldOf(s,owner){
 return [...s.players[owner].front,...s.players[owner].energy].filter(Boolean);
}
function token(pack,c,text,s){
 const d=sheet(pack,c);
 if(!d)return false;
 const names=[d.name,...(originalEffectsDisabled(s,c)?[]:(d.nameAliases||[]))];
 return names.some(n=>typeof n==='string'&&n.includes(text));
}
export function aot2YellowNames(pack,s,owner){
 const names=new Set();
 for(const c of fieldOf(s,owner)){
  const d=sheet(pack,c);
  if(!d||d.type!=='character'||d.color!=='yellow')continue;
  if(cardHasTrait(d,RUMBLE))continue;
  if(d.name)names.add(d.name);
 }
 return names.size;
}
function bothFounders(pack,s,owner){
 return fieldOf(s,owner).some(c=>token(pack,c,'エレン',s))&&
  fieldOf(s,owner).some(c=>token(pack,c,'ジーク',s));
}
function ymirAnywhere(pack,s,owner){
 const piles=[...fieldOf(s,owner),...s.players[owner].outside];
 return piles.some(c=>cardHasName(sheet(pack,c),YMIR,originalEffectsDisabled(s,c)));
}
function faceUpRaid(c){
 return (c?.stack||[]).some(x=>x&&x.faceDown!==true);
}
export function aot2StandingBp(pack,s,owner){
 // Q1566: the +1000 sits inside the raid frame, and raid-state copies stack.
 let n=0;
 for(const c of s.players[owner].front){
  if(!c||originalEffectsDisabled(s,c)||!faceUpRaid(c))continue;
  if(sheet(pack,c)?.id==='AOT-2-069')n+=1000;
 }
 return n;
}
export function aot2Bp(pack,s,c,printed,suppressed,owner){
 if(suppressed||!printed)return 0;
 const names=aot2YellowNames(pack,s,owner);
 if(printed.id==='AOT-2-005'&&names>=4)return 1000;
 if(printed.id==='AOT-2-006'&&s.active===owner&&names>=4)return 1500;
 if(printed.id==='AOT-2-027'&&s.active===owner&&bothFounders(pack,s,owner))return 1500;
 return 0;
}
export function aot2EnergyBonus(pack,s,owner,c,printed,suppressed){
 if(suppressed||printed?.id!=='AOT-2-021')return 0;
 return ymirAnywhere(pack,s,owner)?1:0;
}
export function aot2FrontEnergy(pack,s,owner,c){
 if(!c||originalEffectsDisabled(s,c))return false;
 if(sheet(pack,c)?.id!=='AOT-2-026')return false;
 return bothFounders(pack,s,owner);
}
export function aot2EnergyCut(pack,s,owner,d,zone){
 if(!d)return 0;
 if(d.id==='AOT-2-013'&&zone!=='field'&&aot2YellowNames(pack,s,owner)>=4)return 3;
 if(d.id==='AOT-2-022'&&zone!=='field'&&
  fieldOf(s,owner).some(c=>token(pack,c,'ジーク',s))&&
  !fieldOf(s,owner).some(c=>cardHasName(sheet(pack,c),FINAL_EREN,originalEffectsDisabled(s,c))))
  return 5;
 if(d.id==='AOT-2-029'&&zone==='hand'&&bothFounders(pack,s,owner))return 2;
 return 0;
}
export function aot2HandApCut(pack,s,owner,d){
 if(!d)return 0;
 let n=0;
 if(d.id==='AOT-2-037'&&aot2YellowNames(pack,s,owner)>=4)n+=1;
 const food=s.players[owner]?.aot2FoodAp;
 if(food&&food.turn===s.turn&&food.amount>0&&cardHasTrait(d,'食材'))n+=food.amount;
 return n;
}
export function aot2ConsumeFoodAp(pack,s,owner,d){
 const food=s.players[owner]?.aot2FoodAp;
 if(food&&food.turn===s.turn&&d&&cardHasTrait(d,'食材'))s.players[owner].aot2FoodAp=null;
}
export function aot2RaidCut(pack,s,owner,d,base){
 // The printed host reduces the raiding card by red 2. The yellow colossal
 // shares the name and does not pay red, so only a red copy is reduced.
 if(!d||d.color!=='red'||d.name!=='アルミン・アルレルト（超大型巨人）'||!base)return 0;
 if(originalEffectsDisabled(s,base))return 0;
 return sheet(pack,base)?.id==='AOT-2-068'?2:0;
}
export function aot2Warhammer(pack,s,c){
 if(!c||originalEffectsDisabled(s,c)||sheet(pack,c)?.id!=='AOT-2-028')return false;
 const owner=Number(String(c.uid).split('-')[0]);
 return bothFounders(pack,s,owner);
}
export function aot2Impact(pack,s,c){
 const d=sheet(pack,c);
 if(!d||originalEffectsDisabled(s,c))return 0;
 const owner=Number(String(c.uid).split('-')[0]);
 if(d.id==='AOT-2-008'&&s.players[1-owner].life.length===1)return 1;
 // The entry-turn impact is inside 056's raid frame and only while it is on the front.
 if(d.id==='AOT-2-056'&&faceUpRaid(c)&&s.players[owner].front.some(x=>x?.uid===c.uid)){
  const entered=(s.zoneMoveEvents||[]).some(e=>e.turn===s.turn&&e.uid===c.uid&&e.owner===owner&&
   ['front','energy'].includes(e.to)&&!['front','energy'].includes(e.from));
  if(entered)return 1;
 }
 return 0;
}
export function aot2CannotPlay(pack,s,owner,d){
 if(!d)return false;
 if(d.id==='AOT-2-067')return true;
 if(d.id==='AOT-2-031'&&!fieldOf(s,owner).some(c=>token(pack,c,'イェーガー',s)))return true;
 if(d.id==='AOT-2-034'){
  const hand=s.players[owner].hand.length;
  return !(bothFounders(pack,s,owner)&&hand>=3);
 }
 return false;
}
export function aot2AttackBlocked(pack,s,owner,c){
 const rule=s.players[owner]?.aot2AttackOnly;
 if(!rule||rule.turn!==s.turn||!c)return false;
 return !cardHasName(sheet(pack,c),rule.name,originalEffectsDisabled(s,c));
}
export function aot2SelectTax(s,c){
 const g=c?.aot2SelectTax;
 if(!g)return false;
 const owner=Number(String(c.uid).split('-')[0]);
 return g.stamp===c.fieldEntryStamp&&s.players[owner].ownTurns<g.untilOwnTurnStart;
}
