// UA51BT staged rules. These are isolated transitions, not the full match engine.
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
const db=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const own=(s,uid)=>s.players[s.active].field.find(c=>c.uid===uid);
const pl=s=>s.players[s.active];
const draw=s=>{if(pl(s).deck.length)pl(s).hand.push(pl(s).deck.shift());};
const mill=(s,n)=>{for(let i=0;i<n&&pl(s).deck.length;i++)pl(s).outside.push(pl(s).deck.shift());};
const discard=(s,uid)=>{let a=pl(s).hand,i=a.findIndex(c=>c.uid===uid);if(i<0)throw Error('illegal discard');pl(s).outside.push(a.splice(i,1)[0]);pl(s).discardByOwnEffectTurn=s.turn;};
const buff=(s,c,bp)=>{c.buffs??=[];c.buffs.push({turn:s.turn,bp});};
export function soloBp(s,c){
 const d=db[c.cardId];if(!d)return null;
 const p=s.players[c.owner],n=(c.buffs||[]).filter(b=>b.turn===s.turn).reduce((x,b)=>x+b.bp,0);
 if(s.active!==c.owner)return d.bp+n;
 return d.bp+n+(c.cardId==='SLG-1-001'&&p.outside.length>=5?500:0)
 +(c.cardId==='SLG-1-004'&&(p.discardByOwnEffectTurn===s.turn||p.recoveredByOwnEffectTurn===s.turn)?500:0)
 +(c.cardId==='SLG-1-010'&&p.outside.length>=10?1000:0)
 +(c.cardId==='SLG-1-027'?p.field.filter(x=>x.owner===c.owner&&x.ready===false&&db[x.cardId]?.type==='character'&&db[x.cardId]?.traits?.includes('影之軍團')&&db[x.cardId].bp<=2500).length*500:0)
 +(c.cardId==='SLG-1-062'&&p.field.filter(x=>db[x.cardId]?.traits?.includes('第四次架南島Raid')).length>=5?1500:0)
 +(c.cardId==='SLG-1-065'&&p.hand.length>=5?1000:0)
 +(c.cardId==='SLG-1-069'&&p.hand.length>=5?1500:0);
}
export function soloGen(s,c){
 const d=db[c.cardId];if(!d)return null;
 return d.gen+((c.cardId==='SLG-1-006'||c.cardId==='SLG-1-041')&&c.ready?1:0)
 +(c.cardId==='SLG-1-003'&&s.players[c.owner].outside.length>=10?1:0)
 +(c.cardId==='SLG-1-013'&&c.boostedTurn===s.turn?1:0);
}
export const canPlaceSolo=(c,line)=>!(c.cardId==='SLG-1-014'&&line==='front');
export function soloEnter(s,uid,{mode,targetUid}={}){
 if(s.pending)throw Error('pending choice');
 const c=own(s,uid);if(!c)throw Error('no entry card');
 const id=c.cardId,p=pl(s);
 if(id==='SLG-1-002'){
  if(!['drawDiscard','buff'].includes(mode))throw Error('choose an entry mode');
  if(mode==='buff'){
   if(targetUid){
    const t=p.field.find(x=>x.uid===targetUid&&x.uid!==uid&&db[x.cardId]?.type==='character');
    if(!t)throw Error('illegal buff target');buff(s,t,1000);
   }
   return s;
  }
 }
 if(id==='SLG-1-002'||id==='SLG-1-004'){draw(s);s.pending={kind:'discard',player:s.active};return s;}
 if(id==='SLG-1-012'&&p.field.some(x=>db[x.cardId]?.nameJa==='水篠 旬'))draw(s);
 if(id==='SLG-1-014')mill(s,1);
 if(id==='SLG-1-016')mill(s,2);
 if(id==='SLG-1-017'&&p.deck.length)s.pending={kind:'peekTop',player:s.active,uid:p.deck[0].uid};
 return s;
}
export function soloChoose(s,{uid,destination}={}){
 const q=s.pending;if(!q||q.player!==s.active)throw Error('no pending choice');
 if(q.kind==='discard'){discard(s,uid);}
 else if(q.kind==='peekTop'){
  if(!['top','outside'].includes(destination)||pl(s).deck[0]?.uid!==q.uid)throw Error('illegal destination');
  if(destination==='outside')mill(s,1);
 }else throw Error('unknown pending action');
 s.pending=null;return s;
}
export function soloUseMain(s,uid,{discardUid}={}){
 if(s.phase!=='main'||s.pending)throw Error('not main phase');
 const c=own(s,uid),p=pl(s);if(!c)throw Error('no own card');
 if(c.cardId==='SLG-1-009'){
  if(s.usage?.[uid+':main']===s.turn)throw Error('used this turn');
  if(!p.hand.some(x=>x.uid===discardUid))throw Error('no legal cost');
  discard(s,discardUid);s.usage??={};s.usage[uid+':main']=s.turn;buff(s,c,1500);return s;
 }
 if(c.cardId==='SLG-1-013'){
  if(!c.ready||s.usage?.[uid+':main']===s.turn)throw Error('REST or once per turn');
  s.usage??={};s.usage[uid+':main']=s.turn;c.ready=false;c.boostedTurn=s.turn;c.retireAtMainEnd=true;return s;
 }
 if(c.cardId==='SLG-1-034'){
  if(!c.ready||s.usage?.[uid+':mill']===s.turn)throw Error('REST or once per turn');
  s.usage??={};s.usage[uid+':mill']=s.turn;c.ready=false;mill(s,1);return s;
 }
 throw Error('not implemented ability');
}
export const canUseDemonCastleHigh=(s,uid)=>!!(s.phase==='main'&&own(s,uid)?.cardId==='SLG-1-034'&&own(s,uid).ready&&pl(s).outside.length>=20&&pl(s).hand.length&&pl(s).ap>=1);
export function activateSoloCard(c){
 if((c.skipActive||0)>0){c.skipActive--;return false;}
 c.ready=true;return true;
}
export function soloRetire(s,uid,{owner=s.active}={}){
 const p=s.players[owner],i=p.field.findIndex(c=>c.uid===uid);if(i<0)throw Error('not on field');
 const [c]=p.field.splice(i,1);p.outside.push(c);
 if(c.cardId==='SLG-1-007'&&p.deck.length)p.hand.push(p.deck.shift());
 return s;
}
export function soloEndMain(s){
 for(let owner=0;owner<s.players.length;owner++)for(const c of [...s.players[owner].field])if(c.retireAtMainEnd){
  delete c.retireAtMainEnd;soloRetire(s,c.uid,{owner});
 }
 return s;
}
export function assertSoloConservation(s,expected){
 const seen=new Set;
 const visit=c=>{if(!c||typeof c.uid!=='string'||seen.has(c.uid))throw Error('missing or duplicated UID');seen.add(c.uid);for(const x of c.stack||[])visit(x);for(const x of c.under||[])visit(x);};
 for(const p of s.players)for(const zone of ['field','deck','hand','outside','removed','life'])for(const c of p[zone]||[])visit(c);
 if(seen.size!==expected)throw Error('card count changed '+seen.size+'/'+expected);
 return true;
}

/**
 * SLG-1-030 Shadow Soldier: inspect top two, optionally send a shadow-army or
 * Sung Jinwoo to outside, return the rest to the top in explicitly chosen order.
 * Transaction validates all chosen UIDs before moving anything.
 */
export function soldierTopOptions(s,uid){
 const c=own(s,uid);
 if(!c||c.cardId!=='SLG-1-030')throw Error('not Shadow Soldier');
 const p=pl(s);
 if(!p.field.some(x=>x.uid!==uid&&db[x.cardId]?.traits?.includes('影之軍團')))return {available:false,topUids:[],eligibleUids:[]};
 const top=p.deck.slice(0,2);
 return {available:true,topUids:top.map(x=>x.uid),
  eligibleUids:top.filter(x=>db[x.cardId]?.traits?.includes('影之軍團')||db[x.cardId]?.nameJa==='水篠 旬').map(x=>x.uid)};
}
export function resolveSoldierTop(s,uid,{sendOutsideUid=null,remainingTopUids=[]}={}){
 const opt=soldierTopOptions(s,uid);if(!opt.available)throw Error('missing other shadow army');
 const top=opt.topUids;
 if(sendOutsideUid!=null&&!opt.eligibleUids.includes(sendOutsideUid))throw Error('not eligible for outside');
 const remain=top.filter(x=>x!==sendOutsideUid);
 if(remainingTopUids.length!==remain.length||new Set(remainingTopUids).size!==remain.length||remainingTopUids.some(x=>!remain.includes(x)))throw Error('illegal top order');
 const p=pl(s),cards=p.deck.splice(0,top.length),lookup=Object.fromEntries(cards.map(c=>[c.uid,c]));
 if(sendOutsideUid!=null)p.outside.push(lookup[sendOutsideUid]);
 p.deck.unshift(...remainingTopUids.map(x=>lookup[x]));
 return s;
}
