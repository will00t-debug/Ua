// UA56BT/TTG-1-030 official Space King Kittan:
// Raid on Kittan (AP1 GREEN4), ACTIVE; Nullify Impact while battling;
// when sidelined, put up to one of its Raid bases on own field REST,
// or ACTIVE if the player's energy is >=6 on resolution.
// Does not cover simultaneous multi-trigger retirement with 034.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';

const field=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const name=c=>c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa;
const physical=c=>[c.uid,...(c.stack||[]).flatMap(physical),...(c.under||[]).flatMap(physical)];
const all=pl=>[...pl.hand,...pl.deck,...pl.life,...pl.outside,...(pl.removed||[]),...field(pl).map(x=>x.card)].flatMap(physical).sort();
const validBase=c=>name(c)==='キタン'&&!(c.stack||[]).length&&!(c.under||[]).length;
const activeEnergy=(s,p)=>Object.values(calculateTtgEnergyByColor(s,p)).reduce((a,b)=>a+b,0);
export function legalGreen030Raids(s,player){
 if(![0,1].includes(player)||s?.active!==player||s.phase!=='main'||s.pending||s.pendingTtgLife)return [];
 const pl=s.players?.[player],printed=TTG_BY_ID['TTG-1-030'];
 if(!pl?.front||!pl.energy||!pl.hand||!pl.apCards||activeEnergy(s,player)<printed.energy||
    pl.apCards.filter(x=>x.ready).length<printed.ap)return [];
 const out=[];
 for(const h of pl.hand.filter(x=>x.cardId==='TTG-1-030'))for(const base of field(pl).filter(x=>validBase(x.card))){
  const positions=[{line:base.line,slot:base.slot}];
  if(base.line==='energy')for(let slot=0;slot<pl.front.length;slot++)if(!pl.front[slot])positions.push({line:'front',slot});
  for(const pos of positions)out.push({type:'green030Raid',player,handUid:h.uid,baseUid:base.card.uid,...pos,requiredAp:printed.ap});
 }
 return out;
}
export function resolveGreen030Raid(s,{player,handUid,baseUid,line,slot,payApUids=[]}={}){
 const choice=legalGreen030Raids(s,player).find(x=>x.handUid===handUid&&x.baseUid===baseUid&&x.line===line&&x.slot===slot);
 if(!choice||!Array.isArray(payApUids)||payApUids.length!==choice.requiredAp)throw new Error('Invalid 030 Raid/AP/base');
 const before=all(s.players[player]),result=spendTtgApCards(s,{player,apUids:payApUids,count:choice.requiredAp});
 const pl=result.players[player],i=pl.hand.findIndex(c=>c.uid===handUid),src=field(pl).find(x=>x.card.uid===baseUid);
 if(!src||i<0)throw new Error('Missing 030 hand or Raid base');
 const top=pl.hand.splice(i,1)[0],base=src.card;
 pl[src.line][src.slot]=null;
 if(pl[line][slot])throw new Error('Occupied 030 Raid destination');
 pl[line][slot]={...top,ready:true,stack:[base],under:[],raidedTurn:s.turn,enteredTurn:s.turn};
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('030 Raid UID conservation');
 result.log??=[];result.log.push({type:'green030Raid',player,handUid,baseUid,line,slot});
 return withTtgDerivedEnergy(result,player);
}
export function sidelineGreen030(s,{player,uid}={}){
 if(![0,1].includes(player)||!s?.players?.[player]||
   s.pending&&s.pending.kind!=='block')throw new Error('Retirement timing blocked');
 const pl=s.players[player],pos=field(pl).find(x=>x.card.uid===uid&&x.card.cardId==='TTG-1-030');
 if(!pos)throw new Error('030 was not in play');
 // A simultaneous 034 site capture is resolved through a freely selectable
 // queue; neither ability may be skipped merely because the other triggered.
 const site034=pl.energy.some(c=>c?.cardId==='TTG-1-034'&&c.green034UsedTurn!==s.turn);
 const top=pos.card;
 if((top.stack||[]).some(x=>x.stack?.length||x.under?.length)||top.under?.length)
  throw new Error('Unsupported nested 030 retirement pile');
 const before=all(pl),result=structuredClone(s),owner=result.players[player],loc=field(owner).find(x=>x.card.uid===uid);
 const retiring=loc.card;
 owner[loc.line][loc.slot]=null;
 owner.outside.push({...retiring,stack:[],under:[]},...(retiring.stack||[]));
 const bases=(retiring.stack||[]).filter(validBase).map(x=>x.uid);
 if(site034)result.pending={kind:'greenRetireOrder',player,retiredUid:uid,sourceUid:uid,
  baseUids:bases,remaining:[...(bases.length?['030']:[]),'034']};
 else if(bases.length)result.pending={kind:'green030Sidelined',player,sourceUid:uid,baseUids:bases};
 if(JSON.stringify(all(owner))!==JSON.stringify(before))throw new Error('030 retirement UID conservation');
 return withTtgDerivedEnergy(result,player);
}
export function legalGreen030SidelinedChoices(s){
 const q=s?.pending;
 if(q?.kind!=='green030Sidelined')return [];
 const pl=s.players[q.player],opts=[{type:'green030Recover',player:q.player,sourceUid:q.sourceUid,mode:'decline'}];
 const energy=activeEnergy(s,q.player);
 for(const uid of q.baseUids){
  const c=pl.outside.find(x=>x.uid===uid);
  if(!c||!validBase(c))continue;
  for(const line of ['front','energy'])for(let slot=0;slot<pl[line].length;slot++)if(!pl[line][slot])
   opts.push({type:'green030Recover',player:q.player,sourceUid:q.sourceUid,mode:'recover',baseUid:uid,line,slot,ready:energy>=6});
 }
 return opts;
}
export function resolveGreen030Sidelined(s,action){
 const q=s?.pending,choices=legalGreen030SidelinedChoices(s);
 if(!q||!choices.some(x=>x.mode===action?.mode&&x.sourceUid===action?.sourceUid&&
   x.baseUid===action?.baseUid&&x.line===action?.line&&x.slot===action?.slot&&x.ready===action?.ready))
  throw new Error('Invalid 030 recovery target or position');
 const before=all(s.players[q.player]),result=structuredClone(s),pl=result.players[q.player];
 if(action.mode==='recover'){
  const i=pl.outside.findIndex(x=>x.uid===action.baseUid);
  if(i<0||pl[action.line][action.slot])throw new Error('030 base unavailable');
  pl[action.line][action.slot]={...pl.outside.splice(i,1)[0],ready:activeEnergy(result,q.player)>=6};
 }
 result.pending=null;
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('030 recovery card conservation');
 return withTtgDerivedEnergy(result,q.player);
}
