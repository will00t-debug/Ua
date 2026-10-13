// UA56BT/TTG-1-072/073/074. Official rules incl. Q2298, Q2299.
// Physically paid RED Raid, upgraded-RAID top face-down, AP discount 080.
// Isolated legal reducer: blocked in normal UI until 045/076 and Life RAID are
// integrated. All opponent face-down information remains private.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
import {beginRed073Leaving} from './ttg-red-073-leaving.mjs';
const raidIds=new Set(['TTG-1-072','TTG-1-073','TTG-1-074']);
const rows=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((c,slot)=>({c,line,slot})).filter(x=>x.c));
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa||'';
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const inventory=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...rows(p).map(x=>x.c)].flatMap(deep).sort();
const ownsName=(p,n)=>rows(p).some(x=>name(x.c)===n||(x.c.stack||[]).some(b=>name(b)===n));
const countFaces=c=>(c?.under||[]).filter(x=>x.faceDown).length;
const handCost=(s,p,id)=>s.players[p].red080DiscountUntilTurn===s.turn&&
 ['ラガン','グレン','グレンラガン'].includes(TTG_BY_ID[id]?.nameJa)?0:TTG_BY_ID[id].ap;
const targetEnergy=s=>null;
function candidateBase(card,id){
 if(id==='TTG-1-072')return (name(card)==='カミナ'||card.cardId==='TTG-1-070')&&!card.stack?.length&&!card.under?.length;
 if(id==='TTG-1-073'){
  if(['シモン','カミナ'].includes(name(card))&&!card.stack?.length&&!card.under?.length)return true;
  return ['ラガン','グレン'].includes(name(card))&&card.stack?.length===1&&
    ['シモン','カミナ'].includes(name(card.stack[0]))&&(card.under||[]).every(c=>c.faceDown);
 }
 if(id==='TTG-1-074'){
  if(name(card)==='シモン'&&!card.stack?.length&&!card.under?.length)return true;
  return ['ラガン','グレン'].includes(name(card))&&card.stack?.length===1&&
   ['シモン','ロシウ'].includes(name(card.stack[0]))&&(card.under||[]).every(c=>c.faceDown);
 }
 return false;
}
export function legalRedHighRaids(s,p){
 if(![0,1].includes(p)||s.active!==p||s.phase!=='main'||s.pending||s.pendingTtgLife)return [];
 const pl=s.players[p],options=[],energy=calculateTtgEnergyByColor(s,p).red;
 for(const h of pl.hand.filter(c=>raidIds.has(c.cardId))){
  const id=h.cardId,cost=handCost(s,p,id),d=TTG_BY_ID[id];
  if(energy<d.energy||pl.apCards.filter(c=>c.ready).length<cost)continue;
  if(id==='TTG-1-072'&&ownsName(pl,'カミナ')===true){ /* Rossiu itself cannot qualify while real Kamina exists */ }
  if(id==='TTG-1-074'&&!ownsName(pl,'ニア'))continue;
  if(id==='TTG-1-073'&&!(ownsName(pl,'シモン')&&ownsName(pl,'カミナ')))continue;
  for(const source of rows(pl).filter(x=>candidateBase(x.c,id)&&
    !(id==='TTG-1-072'&&x.c.cardId==='TTG-1-070'&&ownsName(pl,'カミナ')))){
   const spots=[{line:source.line,slot:source.slot}];
   if(source.line==='energy')for(let slot=0;slot<pl.front.length;slot++)if(!pl.front[slot])spots.push({line:'front',slot});
   for(const position of spots)options.push({type:'ttgRedHighRaid',player:p,handUid:h.uid,
    cardId:id,sourceUid:source.c.uid,...position,requiredAp:cost});
  }
 }
 return options;
}
export function resolveRedHighRaid(s,a={}){
 const choice=legalRedHighRaids(s,a.player).find(x=>x.type===a.type&&x.handUid===a.handUid&&
  x.sourceUid===a.sourceUid&&x.line===a.line&&x.slot===a.slot);
 if(!choice||!Array.isArray(a.payApUids)||a.payApUids.length!==choice.requiredAp||
  new Set(a.payApUids).size!==a.payApUids.length)throw new Error('Illegal red RAID or physical AP selection');
 const before=inventory(s.players[a.player]);
 const r=spendTtgApCards(s,{player:a.player,count:choice.requiredAp,apUids:a.payApUids});
 const pl=r.players[a.player],from=rows(pl).find(x=>x.c.uid===a.sourceUid);
 if(!from)throw new Error('RAID source missing after paying');
 const index=pl.hand.findIndex(x=>x.uid===a.handUid);
 if(index<0)throw new Error('RAID hand card missing');
 const h=pl.hand.splice(index,1)[0],prev=from.c,isUpgrade=!!prev.stack?.length;
 const bottom=isUpgrade?prev.stack[0]:prev;
 const under=isUpgrade?[...(prev.under||[]),{...prev,stack:[],under:[],faceDown:true}]:[];
 pl[from.line][from.slot]=null;
 if(pl[a.line][a.slot])throw new Error('Raid destination occupied');
 const raid={...h,ready:true,stack:[bottom],under,raidedTurn:s.turn,enteredTurn:s.turn};
 if(bottom.cardId==='TTG-1-070'&&choice.cardId==='TTG-1-072'&&ownsName(pl,'カミナ'))throw new Error('070 replacement unavailable with Kamina');
 pl[a.line][a.slot]=raid;
 if(pl.red080DiscountUntilTurn===s.turn){delete pl.red080DiscountUntilTurn;pl.red080DiscountConsumedTurn=s.turn;}
 r.raidNamesThisTurn=[...(r.raidNamesThisTurn||[]),TTG_BY_ID[h.cardId].nameJa];
 r.ttgRaidOccurredTurn??={};r.ttgRaidOccurredTurn[a.player]=s.turn;
 r.raidCountThisTurn=(r.raidCountThisTurn||0)+1;
 r.raidCountByPlayerTurn??={};
 const previous=r.raidCountByPlayerTurn[a.player];
 r.raidCountByPlayerTurn[a.player]={turn:s.turn,count:previous?.turn===s.turn?previous.count+1:1};
 const effects=[];
 if(choice.cardId==='TTG-1-072')effects.push('entry072');
 if(choice.cardId==='TTG-1-073'&&countFaces(raid))effects.push('entry073');
 if(choice.cardId==='TTG-1-074')effects.push('entry074');
 if(bottom.cardId==='TTG-1-045'&&s.active===a.player)effects.push('base045');
 r.pending={kind:'ttgRedRaidQueue',player:a.player,raidUid:raid.uid,steps:effects};
 if(!effects.length)r.pending=null;
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('RED RAID physical UID violation');
 return r;
}
export function legalRedRaidQueue(s){
 const q=s?.pending;if(q?.kind!=='ttgRedRaidQueue')return [];
 const raid=rows(s.players[q.player]).find(x=>x.c.uid===q.raidUid)?.c;
 if(!raid)throw new Error('Raid top disappeared before entry');
 const b={type:'ttgRedRaidEffect',player:q.player,raidUid:q.raidUid};
 return q.steps.flatMap(step=>{
  if(step==='entry072')return [{...b,step,targetUid:null},...s.players[1-q.player].front.filter(c=>c&&
   !c.protectedFromEffects&&!c.cannotBeChosen&&
   (c.currentBp??TTG_BY_ID[c.cardId].bp)<=3000).map(c=>({...b,step,targetUid:c.uid}))];
  if(step==='entry076')return [{...b,step,targetUid:null}];
  if(step==='entry073')return [{...b,step,targetUid:null},...s.players[1-q.player].front.filter(c=>c&&
   !c.protectedFromEffects&&!c.cannotBeChosen&&(c.currentBp??TTG_BY_ID[c.cardId].bp)<=5000)
   .map(c=>({...b,step,targetUid:c.uid}))];
  if(step==='base045')return [{...b,step,targetUid:null},...rows(s.players[q.player]).filter(x=>
   TTG_BY_ID[x.c.cardId]?.traits?.some(t=>t.includes('大グレン団'))).map(x=>({...b,step,targetUid:x.c.uid}))];
  if(step==='entry074')return [{...b,step,targetUid:null}];
  return [];
 });
}
export function resolveRedRaidQueue(s,a={}){
 const q=s?.pending;
 if(!legalRedRaidQueue(s).some(x=>x.type===a.type&&x.player===a.player&&
  x.raidUid===a.raidUid&&x.step===a.step&&x.targetUid===a.targetUid))
  throw new Error('Illegal red Raid effect or selection order');
 const before=[inventory(s.players[0]),inventory(s.players[1])],r=structuredClone(s),pl=r.players[q.player];
 const raid=rows(pl).find(x=>x.c.uid===q.raidUid).c;
 const draw=()=>{if(pl.deck.length)pl.hand.push(pl.deck.shift());else{
  r.status='finished';r.winner=1-q.player;r.endReason='requiredDrawEmpty';
 }};
 if(a.step==='entry072'){
  draw();
  if(a.targetUid){
   const target=r.players[1-q.player].front.find(c=>c?.uid===a.targetUid);
   if(target)target.ready=false;
  }
 }
 if(a.step==='entry076'){
  const revealed=pl.deck.slice(0,2).map(c=>c.uid);
  r.pending={kind:'ttgRed076Look',player:q.player,uid:raid.uid,revealed};
  if(q.steps.length>1)r.ttgRedRaidResume={...q,steps:q.steps.filter(x=>x!==a.step)};
  if(JSON.stringify(inventory(pl))!==JSON.stringify(before[q.player]))throw new Error('076 RAID top-two UID changed');
  return r;
 }
 if(a.step==='entry073'&&a.targetUid){
  const opp=r.players[1-q.player],i=opp.front.findIndex(c=>c?.uid===a.targetUid);
  const card=opp.front[i];
  if(card?.cardId==='TTG-1-073'&&(card.under||[]).some(x=>x.faceDown)&&
   (card.currentBp??TTG_BY_ID[card.cardId].bp)>=500){
   const next=q.steps.filter(x=>x!==a.step);
   const leaving=beginRed073Leaving({...r,pending:null},{player:1-q.player,uid:card.uid});
   if(next.length)leaving.ttgRedRaidResume={...q,steps:next};
   return leaving;
  }
  opp.front[i]=null;
  const flatten=x=>[{uid:x.uid,cardId:x.cardId},...(x.stack||[]).flatMap(flatten),...(x.under||[]).flatMap(flatten)];
  opp.outside.push(...flatten(card));
 }
 if(a.step==='entry074'){
  draw();
  if(countFaces(raid)>0&&r.status==='playing')draw();
  const remaining=pl.deck.length;
  if(remaining<=20){raid.currentBp=(raid.currentBp??TTG_BY_ID[raid.cardId].bp)+1000;
   raid.red074DamageUntilTurn=s.turn;
   raid.buffs??=[];raid.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});}
  if(remaining<=5){raid.currentBp=(raid.currentBp??TTG_BY_ID[raid.cardId].bp)+3000;
   raid.buffs??=[];raid.buffs.push({bp:3000,turn:s.turn,until:'endTurn'});}
 }
 if(a.step==='base045'){
  if(a.targetUid){
   const target=rows(pl).find(x=>x.c.uid===a.targetUid).c;
   target.currentBp=(target.currentBp??TTG_BY_ID[target.cardId].bp)+1000;
   target.buffs??=[];target.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});
  }
  if(countFaces(raid)>0&&r.status==='playing')draw();
 }
 r.pending=q.steps.filter(x=>x!==a.step).length?{...q,steps:q.steps.filter(x=>x!==a.step)}:null;
 if(r.status!=='finished'&&(JSON.stringify(inventory(r.players[0]))!==JSON.stringify(before[0])||
  JSON.stringify(inventory(r.players[1]))!==JSON.stringify(before[1])))throw new Error('Red entry changed UID inventory');
 return r;
}
export function redRaidPassive(s,p,c){
 if(c?.cardId==='TTG-1-072')return {bp:s.active===p?500:0,impact:0,damage:1};
 if(c?.cardId==='TTG-1-073')return {bp:countFaces(c)?1000:0,impact:countFaces(c)?1:0,damage:1};
 if(c?.cardId==='TTG-1-074')return {bp:0,impact:1,damage:c.red074DamageUntilTurn===s.turn?2:1};
 return {bp:0,impact:0,damage:1};
}
export function red073ReplaceLeaving(s,{player,uid,underUid}={}){
 const source=rows(s.players?.[player]).find(x=>x.c.uid===uid);
 if(!source||source.c.cardId!=='TTG-1-073'||!source.c.under?.some(c=>c.uid===underUid&&c.faceDown)||
  (source.c.currentBp??TTG_BY_ID[source.c.cardId].bp)<500)throw new Error('073 replacement unavailable');
 const r=structuredClone(s),pl=r.players[player],raid=rows(pl).find(x=>x.c.uid===uid).c;
 const i=raid.under.findIndex(c=>c.uid===underUid);
 pl.outside.push(raid.under.splice(i,1)[0]);
 return r;
}
