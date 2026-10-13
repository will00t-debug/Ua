// Red RAID life trigger (071/072/073/074/076).
// The life card is already in OUTSIDE when choices are enumerated.
// Raid ignores AP but MUST satisfy current red energy and RAID prerequisites.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
const supported=new Set(['TTG-1-071','TTG-1-072','TTG-1-073','TTG-1-074','TTG-1-076']);
const rows=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((c,slot)=>({c,line,slot})).filter(x=>x.c));
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa;
const contains=(c,n)=>name(c)===n||(c?.stack||[]).some(v=>contains(v,n));
const own=(p,n)=>rows(p).some(x=>contains(x.c,n));
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const all=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...rows(p).map(x=>x.c)].flatMap(deep).sort();
function baseLegal(id,pl,c){
 const n=name(c),under=(c.under||[]).length,stack=(c.stack||[]).length;
 if(id==='TTG-1-071')return n==='キタン'&&!stack&&!under;
 if(id==='TTG-1-076')return n==='シモン'&&!stack&&!under;
 if(id==='TTG-1-072')return (n==='カミナ'&&!stack&&!under)||
  (c.cardId==='TTG-1-070'&&!stack&&!under&&!own(pl,'カミナ'));
 if(id==='TTG-1-073'&&!(own(pl,'シモン')&&own(pl,'カミナ')))return false;
 if(id==='TTG-1-074'&&!own(pl,'ニア'))return false;
 if(['TTG-1-073','TTG-1-074'].includes(id)){
  if(id==='TTG-1-073'&&['シモン','カミナ'].includes(n)&&!stack&&!under)return true;
  if(id==='TTG-1-074'&&n==='シモン'&&!stack&&!under)return true;
  if(['グレン','ラガン'].includes(n)&&stack===1&&
   (c.under||[]).every(x=>x.faceDown)){
   const b=name(c.stack[0]);
   return id==='TTG-1-073'?['シモン','カミナ'].includes(b):['シモン','ロシウ'].includes(b);
  }
 }
 return false;
}
export function legalRedLifeRaids(s,{player,cardUid}={}){
 if(![0,1].includes(player)||s.pending||s.pendingTtgLife?.player!==player||
  s.pendingTtgLife.cardUid!==cardUid)return [];
 const pl=s.players[player],life=pl.outside.find(c=>c.uid===cardUid);
 if(!supported.has(life?.cardId)||calculateTtgEnergyByColor(s,player).red<TTG_BY_ID[life.cardId].energy)
  return [];
 return rows(pl).filter(x=>baseLegal(life.cardId,pl,x.c)).flatMap(source=>{
  const spots=[{line:source.line,slot:source.slot}];
  if(source.line==='energy')for(let slot=0;slot<pl.front.length;slot++)if(!pl.front[slot])
   spots.push({line:'front',slot});
  return spots.map(dest=>({sourceUid:source.c.uid,raidKind:'red',...dest}));
 });
}
export function resolveRedLifeRaid(s,{player,cardUid,sourceUid,line,slot}={}){
 if(!legalRedLifeRaids(s,{player,cardUid}).some(a=>a.sourceUid===sourceUid&&a.line===line&&a.slot===slot))
  throw new Error('Red RAID life does not satisfy printed energy/base/field conditions');
 const r=structuredClone(s),pl=r.players[player],before=all(s.players[player]);
 const loc=rows(pl).find(x=>x.c.uid===sourceUid),index=pl.outside.findIndex(c=>c.uid===cardUid);
 const top=pl.outside.splice(index,1)[0],prev=loc.c,upgraded=!!prev.stack?.length,
  base=upgraded?prev.stack[0]:prev;
 const under=upgraded?[...(prev.under||[]),{...prev,stack:[],under:[],faceDown:true}]:[];
 pl[loc.line][loc.slot]=null;
 if(pl[line][slot])throw new Error('Red life RAID target became occupied');
 pl[line][slot]={...top,ready:true,stack:[base],under,raidedTurn:s.turn,enteredTurn:s.turn};
 const steps=[];
 if(top.cardId==='TTG-1-072')steps.push('entry072');
 if(top.cardId==='TTG-1-073'&&under.length)steps.push('entry073');
 if(top.cardId==='TTG-1-074')steps.push('entry074');
 if(top.cardId==='TTG-1-076')steps.push('entry076');
 // 045 base only triggers on your OWN turn, not opponent attack/life.
 if(s.active===player&&base.cardId==='TTG-1-045')steps.push('base045');
 r.pending=steps.length?{kind:'ttgRedRaidQueue',player,raidUid:top.uid,steps}:null;
 r.raidNamesThisTurn=[...(r.raidNamesThisTurn||[]),TTG_BY_ID[top.cardId].nameJa];
 r.ttgRaidOccurredTurn??={};r.ttgRaidOccurredTurn[player]=s.turn;
 r.raidCountThisTurn=(r.raidCountThisTurn||0)+1;
 r.raidCountByPlayerTurn??={};
 const count=r.raidCountByPlayerTurn[player];
 r.raidCountByPlayerTurn[player]={turn:s.turn,count:count?.turn===s.turn?count.count+1:1};
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('Red life RAID duplicated physical cards');
 return r;
}
