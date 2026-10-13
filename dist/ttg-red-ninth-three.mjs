// TTG-1-066/067/068, official Q2295-2297.
// 066 extra energy already derived while ACTIVE in ttg-energy-snapshot.
// 067 AP2, Active entry, unblockable by BP>=4000, one-turn snipe and on WIN draw.
// 068 energy-line attack / maximum four own attacks once per Yoko name per turn.
import {TTG_BY_ID} from './ttg-builder.mjs';
const field=p=>[...(p.front||[]),...(p.energy||[])].filter(Boolean);
const printed=c=>TTG_BY_ID[c?.cardId];
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const inventory=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...field(p)].flatMap(deep).sort();
export function red067MayBlock(s,p,attacker,blocker,currentBp){
 if(attacker?.cardId!=='TTG-1-067')return true;
 return currentBp<4000;
}
export function red067Entry(s,{player,uid}={}){
 const pl=s.players?.[player],c=field(pl||{}).find(x=>x.uid===uid);
 if(c?.cardId!=='TTG-1-067'||c.enteredTurn!==s.turn)throw new Error('067 entry timing invalid');
 const r=structuredClone(s),card=field(r.players[player]).find(x=>x.uid===uid);
 card.ready=true;card.red067SniperUntilTurn=s.turn;
 card.red067WinDrawUntilTurn=s.turn;
 return r;
}
export function red068BpBonus(s,p,c){
 if(c?.cardId!=='TTG-1-068'||s.active!==p)return 0;
 const n=s.raidCountByPlayerTurn?.[p]?.turn===s.turn?s.raidCountByPlayerTurn[p].count:
   (s.raidCountThisTurn||0);
 return Math.max(0,n)*1000;
}
export function legalRed068Main(s,p){
 if(s?.active!==p||s.phase!=='main'||s.pending||s.pendingTtgLife||
   ![0,1].includes(p))return [];
 const pl=s.players[p];
 if(pl.red068UsedTurn===s.turn)return [];
 return (pl.energy||[]).filter(c=>c?.cardId==='TTG-1-068').flatMap(c=>
  pl.hand.map(h=>({type:'ttgRed068Main',player:p,uid:c.uid,discardUid:h.uid})));
}
export function resolveRed068Main(s,a={}){
 if(!legalRed068Main(s,a.player).some(x=>x.type===a.type&&x.uid===a.uid&&x.discardUid===a.discardUid))
  throw new Error('068 energy-line Main once per Yoko name with hand discard');
 const before=inventory(s.players[a.player]),r=structuredClone(s),p=r.players[a.player];
 const i=p.hand.findIndex(c=>c.uid===a.discardUid);
 p.outside.push(p.hand.splice(i,1)[0]);
 const c=p.energy.find(c=>c?.uid===a.uid);c.attackFromEnergyUntilTurn=s.turn;
 p.red068UsedTurn=s.turn;p.red068AttackCapTurn=s.turn;p.red068AttackCap=4;
 if(JSON.stringify(inventory(p))!==JSON.stringify(before))throw new Error('068 card identity loss');
 return r;
}
export function canRed068EnergyAttack(s,p,c){
 return c?.cardId==='TTG-1-068'&&s.active===p&&c.attackFromEnergyUntilTurn===s.turn&&c.ready;
}
export function expireRed068AtTurnEnd(s,p){
 const r=structuredClone(s),pl=r.players[p];
 for(const c of pl.energy)if(c?.attackFromEnergyUntilTurn===s.turn)delete c.attackFromEnergyUntilTurn;
 delete pl.red068AttackCapTurn;delete pl.red068AttackCap;
 return r;
}
