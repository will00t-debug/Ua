// UA56BT green sites 033 Arch-Gurren and 034 Super Galaxy Dai-Gurren.
// Official Q2280: 033 attachments share a once-per-NAME/turn quota.
// Q2281/Q2282: physical face-down cards below OWN cards are privately
// inspectable by owner; they are not public to opponent.
// Higher Raid entry effects remain separate mandatory/optional actions.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';

const field=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const all=p=>{
 const recur=c=>[c.uid,...(c.stack||[]).flatMap(recur),...(c.under||[]).flatMap(recur)];
 return [...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...field(p).map(x=>x.card)].flatMap(recur).sort();
};
const total=(s,p)=>Object.values(calculateTtgEnergyByColor(s,p)).reduce((a,b)=>a+b,0);
const isSite=c=>TTG_BY_ID[c.cardId]?.type==='field';
const validState=(s,p)=>[0,1].includes(p)&&s?.players?.[p];
export function green034PrintedEnergyNeed(s,player){
 if(!validState(s,player))throw new Error('Invalid 034 owner');
 const pl=s.players[player];
 return field(pl).some(x=>isSite(x.card))?8:5;
}
export function legalGreenSitePlays(s,player){
 if(!validState(s,player)||s.active!==player||s.phase!=='main'||s.pending||s.pendingTtgLife)return [];
 const pl=s.players[player],options=[];
 for(const h of pl.hand||[]){
  if(!['TTG-1-033','TTG-1-034'].includes(h.cardId))continue;
  const cost=h.cardId==='TTG-1-034'?green034PrintedEnergyNeed(s,player):TTG_BY_ID[h.cardId].energy;
  if(total(s,player)<cost||pl.apCards.filter(x=>x.ready).length<1)continue;
  for(let slot=0;slot<pl.energy.length;slot++)if(!pl.energy[slot])
   options.push({type:'ttgGreenSitePlay',player,handUid:h.uid,cardId:h.cardId,slot,requiredAp:1});
 }
 return options;
}
export function resolveGreenSitePlay(s,{player,handUid,cardId,slot,payApUids=[]}={}){
 const exists=legalGreenSitePlays(s,player).some(x=>
  x.handUid===handUid&&x.cardId===cardId&&x.slot===slot);
 if(!exists||!Array.isArray(payApUids)||payApUids.length!==1)throw new Error('Invalid 033/034 site AP/energy/slot');
 const before=all(s.players[player]),result=spendTtgApCards(s,{player,apUids:payApUids,count:1}),pl=result.players[player];
 const i=pl.hand.findIndex(c=>c.uid===handUid);
 if(i<0||pl.energy[slot])throw new Error('Site destination invalid');
 pl.energy[slot]={...pl.hand.splice(i,1)[0],ready:false,enteredTurn:s.turn};
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('033/034 site play conservation');
 return withTtgDerivedEnergy(result,player);
}
export function legalGreen033AfterRaid(s,{player,raidUid}={}){
 if(!validState(s,player)||s.players[player].green033UsedTurn===s.turn||
   s.pending&&s.pending.kind!=='green033RaidOrder')return [];
 const pl=s.players[player],raider=field(pl).find(x=>x.card.uid===raidUid&&x.card.cardId==='TTG-1-027');
 if(!raider||!(raider.card.stack||[]).length)return [];
 const base={type:'green033Attach',player,raidUid};
 return [...pl.energy.filter(x=>x?.cardId==='TTG-1-033').map(x=>({...base,siteUid:x.uid})),{...base,siteUid:null}];
}
export function resolveGreen033AfterRaid(s,{player,raidUid,siteUid=null}={}){
 if(!legalGreen033AfterRaid(s,{player,raidUid}).some(x=>x.siteUid===siteUid))
  throw new Error('Q2280: invalid 033 card, once-per-name or Arc Gurren Lagann');
 const before=all(s.players[player]),result=structuredClone(s),pl=result.players[player];
 if(siteUid){
  const i=pl.energy.findIndex(c=>c?.uid===siteUid&&c.cardId==='TTG-1-033'),card=pl.energy[i],
   top=field(pl).find(x=>x.card.uid===raidUid)?.card;
  if(i<0||!top)throw new Error('033 Raid card/site vanished');
  pl.energy[i]=null;
  top.under??=[];top.under.push({...card,faceDown:true});
  pl.green033UsedTurn=s.turn;
  for(let i=0;i<2;i++){
   if(!pl.deck.length){result.status='finished';result.winner=1-player;result.endReason='requiredDrawEmpty';break;}
   pl.hand.push(pl.deck.shift());
  }
 }
 if(result.pending?.kind==='green033RaidOrder')result.pending=null;
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('033 attach/draw card conservation');
 return withTtgDerivedEnergy(result,player);
}
export function beginGreen034Sidelined(s,{player,retiredUid}={}){
 if(!validState(s,player)||s.pending)throw new Error('034 retirement requires a free event queue');
 const pl=s.players[player],source=pl.outside.find(x=>x.uid===retiredUid);
 if(!source||TTG_BY_ID[source.cardId]?.type!=='character'||source.stack?.length||source.under?.length)
  throw new Error('034 requires ONE physically sidelined character card');
 const eligible=pl.energy.filter(c=>c?.cardId==='TTG-1-034'&&c.green034UsedTurn!==s.turn);
 if(!eligible.length)return s;
 const result=structuredClone(s);
 result.pending={kind:'green034Sidelined',player,retiredUid};
 return result;
}
export function legalGreen034SidelinedChoices(s){
 const q=s.pending;
 if(q?.kind!=='green034Sidelined')return [];
 const pl=s.players[q.player];
 if(!pl.outside.some(c=>c.uid===q.retiredUid))return [];
 return [{type:'green034Capture',player:q.player,retiredUid:q.retiredUid,siteUid:null},
  ...pl.energy.filter(c=>c?.cardId==='TTG-1-034'&&c.green034UsedTurn!==s.turn)
   .map(c=>({type:'green034Capture',player:q.player,retiredUid:q.retiredUid,siteUid:c.uid}))];
}
export function resolveGreen034Sidelined(s,{player,retiredUid,siteUid=null}={}){
 const choices=legalGreen034SidelinedChoices(s);
 if(!choices.some(x=>x.player===player&&x.retiredUid===retiredUid&&x.siteUid===siteUid))
  throw new Error('Illegal 034 retired character, once-per-card or site');
 const before=all(s.players[player]),result=structuredClone(s),pl=result.players[player];
 if(siteUid){
  const site=pl.energy.find(x=>x?.uid===siteUid),i=pl.outside.findIndex(x=>x.uid===retiredUid);
  if(i<0||!site)throw new Error('034 source/site vanished');
  site.under??=[];site.under.push({...pl.outside.splice(i,1)[0],faceDown:true});
  site.green034UsedTurn=s.turn;
 }
 result.pending=null;
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('034 retirement capture conservation');
 return withTtgDerivedEnergy(result,player);
}
export function legalGreen034AfterRaid(s,{player,raidUid}={}){
 if(!validState(s,player)||s.pending&&s.pending.kind!=='green034RaidOrder')return [];
 const pl=s.players[player],raider=field(pl).find(x=>x.card.uid===raidUid&&x.card.cardId==='TTG-1-031');
 if(!raider||!raider.card.stack?.length)return [];
 const base={type:'green034Transfer',player,raidUid};
 return [...pl.energy.filter(c=>c?.cardId==='TTG-1-034').map(c=>({...base,siteUid:c.uid})),{...base,siteUid:null}];
}
export function resolveGreen034AfterRaid(s,{player,raidUid,siteUid=null}={}){
 if(!legalGreen034AfterRaid(s,{player,raidUid}).some(x=>x.siteUid===siteUid))
  throw new Error('Invalid 034 transfer / Super Galaxy Raid');
 const before=all(s.players[player]),result=structuredClone(s),pl=result.players[player];
 if(siteUid){
  const i=pl.energy.findIndex(c=>c?.uid===siteUid),site=pl.energy[i],
   raider=field(pl).find(x=>x.card.uid===raidUid)?.card;
  if(i<0||!raider)throw new Error('034 site/Raid disappeared');
  const under=site.under||[];
  if(!under.every(x=>x.faceDown))throw new Error('034 has non-facedown cards under it');
  pl.hand.push(...under.map(c=>{const {faceDown,...rest}=c;return rest;}));
  pl.energy[i]=null;
  raider.under??[];raider.under.push({...site,under:[],faceDown:true});
 }
 if(result.pending?.kind==='green034RaidOrder')result.pending=null;
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('034 returned hand cards / site conservation');
 return withTtgDerivedEnergy(result,player);
}
