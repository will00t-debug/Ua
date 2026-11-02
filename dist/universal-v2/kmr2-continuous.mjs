// EX12BT continuous numbers. The engine calls these while measuring BP,
// energy, Impact, hand cost and block legality. This file does not import
// the engine. Copying another card's turn text is by that card's id, for
// KMR-2-067 and KMR-2-068 only. Registration is not an official FAQ certification.
import {cardHasTrait} from './field-conditions.mjs';

const SCHOOL='天ノ川学園高校';
const ADVENT='アドベントカード';

function ownerOf(c){return Number(String(c?.uid||'').split('-')[0]);}
function field(pl){return [...(pl?.front||[]),...(pl?.energy||[])].filter(Boolean);}
function nameHas(def,token){
 if(!def)return false;
 if(String(def.name||'').includes(token))return true;
 return (def.nameAliases||[]).some(n=>typeof n==='string'&&n.includes(token));
}
function exactName(def,name){
 return def?.name===name||(def?.nameAliases||[]).includes(name);
}
function facedown(c){return (c?.under||[]).some(x=>x&&x.faceDown===true);}
export function kmr2CopiedIds(c){
 const g=c?.kmr2Copied;
 if(!g||!Array.isArray(g.ids))return [];
 return g.ids.filter(id=>typeof id==='string');
}
function idsOf(printed,c){
 const extra=kmr2CopiedIds(c).filter(id=>id!==printed?.id);
 return [printed?.id,...extra];
}
function schoolCount(pack,s,owner,card,exclude){
 return field(s.players[owner]).filter(x=>{
  const d=card(pack,x);
  if(!cardHasTrait(d,SCHOOL))return false;
  if(exclude&&nameHas(d,exclude))return false;
  return true;
 }).length;
}
function frontHas(pack,s,owner,card,token){
 return (s.players[owner].front||[]).some(x=>x&&nameHas(card(pack,x),token));
}
function fieldHas(pack,s,owner,card,token){
 return field(s.players[owner]).some(x=>nameHas(card(pack,x),token));
}
function fieldExact(pack,s,owner,card,name){
 return field(s.players[owner]).some(x=>exactName(card(pack,x),name));
}
function enteredNow(s,c){return c?.kmr2EnteredBy?.turn===s.turn;}

function bpFor(id,pack,s,c,owner,card){
 let n=0;
 if(id==='KMR-2-005'&&s.active===owner&&enteredNow(s,c))n+=3000;
 if(id==='KMR-2-008'&&s.active===owner&&s.kmr2GochizoLeft?.[owner]===s.turn)n+=1000;
 if(id==='KMR-2-012'&&s.active===owner&&enteredNow(s,c))n+=1000;
 if(id==='KMR-2-023'&&s.active===owner&&facedown(c))n+=1500;
 if(id==='KMR-2-038'&&s.active===owner&&schoolCount(pack,s,owner,card,'メテオ')>=3)n+=1000;
 if(id==='KMR-2-051'&&s.active!==owner&&id!==card(pack,c).id)n-=1500;
 if(id==='KMR-2-072'&&s.active===owner&&fieldHas(pack,s,owner,card,'ディケイド'))n+=500;
 if(id==='KMR-2-073'&&s.active===owner&&fieldHas(pack,s,owner,card,'ディケイド'))n+=1000;
 if(id==='KMR-2-074'&&s.active!==owner&&
  (fieldHas(pack,s,owner,card,'ディケイド')||fieldHas(pack,s,owner,card,'ディエンド')))n+=1000;
 if(id==='KMR-2-075'&&s.active===owner&&fieldHas(pack,s,owner,card,'ディケイド'))n+=1000;
 if(id==='KMR-2-082'&&s.active===owner&&frontHas(pack,s,owner,card,'ファイズ'))n+=1000;
 if(id==='KMR-2-091'&&s.active===owner&&fieldHas(pack,s,owner,card,'ナイト'))n+=1000;
 if(id==='KMR-2-096'&&s.active===owner&&fieldExact(pack,s,owner,card,'仮面ライダー龍騎サバイブ'))n+=1000;
 return n;
}
export function kmr2Bp(pack,s,c,printed,suppressed,owner,card){
 if(suppressed||!printed||!c)return 0;
 return idsOf(printed,c).reduce((n,id)=>n+bpFor(id,pack,s,c,owner,card),0);
}
function impactFor(id,pack,s,c,owner,card){
 if(id==='KMR-2-012'&&s.active===owner&&enteredNow(s,c))return 1;
 if(id==='KMR-2-030'&&s.active===owner&&schoolCount(pack,s,owner,card,'フォーゼ')>=3)return 1;
 if(id==='KMR-2-073'&&s.active===owner&&fieldHas(pack,s,owner,card,'ディケイド'))return 1;
 return 0;
}
export function kmr2Impact(pack,s,c,printed,owner,card,suppressed){
 if(suppressed||!printed)return 0;
 return idsOf(printed,c).reduce((n,id)=>Math.max(n,impactFor(id,pack,s,c,owner,card)),0);
}
export function kmr2ImpactNull(pack,s,c,printed,owner,card,suppressed){
 if(suppressed||!printed||s.active===owner)return false;
 const ids=idsOf(printed,c);
 if(!ids.includes('KMR-2-074'))return false;
 return fieldHas(pack,s,owner,card,'ディケイド')||fieldHas(pack,s,owner,card,'ディエンド');
}
export function kmr2EnergyBonus(pack,s,c,printed,owner,card,suppressed){
 if(suppressed||!printed)return 0;
 const ids=idsOf(printed,c);
 if(!ids.includes('KMR-2-031'))return 0;
 const others=field(s.players[owner]).filter(x=>x.uid!==c.uid&&cardHasTrait(card(pack,x),SCHOOL));
 return others.length>=3?1:0;
}
export function kmr2EnergyCut(pack,s,p,d,zone,card){
 if(zone!=='hand'||d?.id!=='KMR-2-082')return 0;
 return frontHas(pack,s,p,card,'ファイズ')?0:2;
}
export function kmr2FrontEnergy(pack,s,p,c,card,suppressed){
 if(!c)return false;
 const printed=card(pack,c);
 const until=c.kmr2FrontEnergy;
 if(until&&Number.isInteger(until.untilOwnTurn)&&s.players[p].ownTurns<until.untilOwnTurn)return true;
 if(suppressed)return false;
 const ids=idsOf(printed,c);
 if(!ids.includes('KMR-2-070')||s.active!==p)return false;
 return fieldHas(pack,s,p,card,'ディケイド');
}
export function kmr2SelectTax(pack,s,c,card,suppressed){
 if(!c||suppressed)return 0;
 const owner=ownerOf(c);
 if(s.active===owner)return 0;
 const printed=card(pack,c);
 if(!idsOf(printed,c).includes('KMR-2-071'))return 0;
 return fieldHas(pack,s,owner,card,'ディケイド')?1:0;
}
export function kmr2HandApCut(pack,s,owner,d,card){
 let n=0;
 if(d?.id==='KMR-2-073'&&fieldHas(pack,s,owner,card,'ディケイド'))n+=1;
 if(cardHasTrait(d,ADVENT)&&s.kmr2NextAdventAp?.[owner]===s.turn)n+=1;
 return n;
}
export function kmr2BlockFloors(pack,s,attacker,card,suppressed){
 if(!attacker)return [];
 const floors=[];
 const grant=attacker.kmr2Block;
 if(grant&&grant.turn===s.turn&&grant.stamp===attacker.fieldEntryStamp&&
  (grant.relation==='atLeast'||grant.relation==='atMost')&&Number.isInteger(grant.bp))
  floors.push({relation:grant.relation,bp:grant.bp});
 if(suppressed)return floors;
 const owner=ownerOf(attacker),printed=card(pack,attacker),ids=idsOf(printed,attacker);
 if(ids.includes('KMR-2-072')&&s.active===owner&&fieldHas(pack,s,owner,card,'ディケイド'))
  floors.push({relation:'atMost',bp:2000});
 if(ids.includes('KMR-2-095')&&fieldExact(pack,s,owner,card,'仮面ライダーナイトサバイブ'))
  floors.push({relation:'atLeast',bp:4000});
 return floors;
}
export function kmr2ChoiceImmune(pack,s,c,card,suppressed){
 if(!c||suppressed||!enteredNow(s,c))return false;
 return idsOf(card(pack,c),c).includes('KMR-2-005');
}
export function kmr2Protected(pack,s,target,card,sourceType){
 if(!target||(sourceType!=='character'&&sourceType!=='trigger'&&sourceType!=='unknown'))return false;
 const owner=ownerOf(target);
 const pl=s.players[owner];
 if(!pl)return false;
 const magnet=(pl.front||[]).find(c=>c&&card(pack,c).id==='KMR-2-034'&&
  Number.isInteger(c.kmr2ShieldUntil)&&pl.ownTurns<c.kmr2ShieldUntil);
 if(!magnet||magnet.uid===target.uid)return false;
 const d=card(pack,target);
 if(d?.name==='仮面ライダーフォーゼ マグネットステイツ')return false;
 return cardHasTrait(d,SCHOOL);
}
export function kmr2ActsAs(c,id){
 return c&&(id===undefined||kmr2CopiedIds(c).includes(id));
}
export function kmr2HasText(pack,c,card,id){
 if(!c)return false;
 const printed=card(pack,c);
 return printed?.id===id||kmr2CopiedIds(c).includes(id);
}