// UA56BT TTG-1-060/061/062. Official printed rulings Q2293/Q2294.
// RED laboratory reducers. All physical cards retain identity, never auto-expose hand.
import {TTG_BY_ID} from './ttg-builder.mjs';
const onField=p=>[...(p.front||[]),...(p.energy||[])].filter(Boolean);
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa;
const asSimon=c=>!!c&&(name(c)==='シモン'||(c.stack||[]).some(asSimon));
const own=(s,p)=>[0,1].includes(p)&&!!s?.players?.[p];
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const inventory=p=>[...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...onField(p)].flatMap(deep).sort();
const confirm=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('TTG red 060-062 card conservation');};
export function red060ExtraEnergy(s,p,card){
 return card?.cardId==='TTG-1-060'&&own(s,p)&&s.players[p].front.some(asSimon)?1:0;
}
export function red061Entry(s,{player,uid}={}){
 if(!own(s,player)||s.active!==player||s.phase!=='main'||s.pending||
  !onField(s.players[player]).some(c=>c.uid===uid&&c.cardId==='TTG-1-061'&&c.enteredTurn===s.turn))
  throw new Error('061 entry requires newly played Nia');
 const r=structuredClone(s);
 const total=r.players[player].deck.length<=20?2:1;
 r.pending={kind:'ttgRed061',player,uid,remaining:total,step:total===2?'recover':'choose',used:[]};
 return r;
}
const simonRecover=c=>name(c)==='シモン'&&TTG_BY_ID[c.cardId]?.energy<=2;
const simonPlay=c=>simonRecover(c)&&TTG_BY_ID[c.cardId]?.color==='red'&&TTG_BY_ID[c.cardId]?.type==='character';
export function legalRed061Choices(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed061')return [];
 const p=s.players[q.player],base={type:'ttgRed061Choice',player:q.player,uid:q.uid};
 const recover=[null,...p.outside.filter(simonRecover).map(c=>c.uid)];
 const deploy=p.hand.filter(simonPlay).flatMap(c=>
  ['front','energy'].flatMap(line=>(p[line]||[]).flatMap((occupant,slot)=>
    occupant?[]:[{handUid:c.uid,line,slot}])));
 if(q.step==='recover')return recover.map(recoverUid=>({...base,mode:'recover',recoverUid}));
 if(q.step==='deploy')return [{...base,mode:'deploy',handUid:null},...deploy.map(x=>({...base,mode:'deploy',...x}))];
 const result=[];
 if(!q.used.includes('recover'))result.push(...recover.map(recoverUid=>({...base,mode:'recover',recoverUid})));
 if(!q.used.includes('deploy'))result.push({...base,mode:'deploy',handUid:null},...deploy.map(x=>({...base,mode:'deploy',...x})));
 return result;
}
export function resolveRed061Choice(s,a={}){
 const q=s?.pending;
 if(!legalRed061Choices(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&
    x.mode===a.mode&&x.recoverUid===a.recoverUid&&x.handUid===a.handUid&&x.line===a.line&&x.slot===a.slot))
  throw new Error('061 Q2293/Q2294 illegal duplicate option, target or resolution order');
 const r=structuredClone(s),p=r.players[q.player],before=inventory(s.players[q.player]);
 let enteredUid=null;
 if(a.mode==='recover'&&a.recoverUid){
  const index=p.outside.findIndex(c=>c.uid===a.recoverUid);p.hand.push(p.outside.splice(index,1)[0]);
 }
 if(a.mode==='deploy'&&a.handUid){
  const index=p.hand.findIndex(c=>c.uid===a.handUid);
  const card=p.hand.splice(index,1)[0];
  p[a.line][a.slot]={...card,ready:true,enteredTurn:s.turn};enteredUid=card.uid;
 }
 const used=[...q.used,a.mode],remaining=q.remaining-1;
 r.pending=remaining>0?{...q,remaining,used,step:'deploy'}:null;
 if(enteredUid)r.pending={kind:'ttgRed061FollowupEntry',player:q.player,uid:enteredUid,
  resume:r.pending};
 confirm(before,inventory(p));return r;
}
export function red062Entry(s,{player,uid}={}){
 if(!own(s,player)||s.active!==player||s.phase!=='main'||s.pending||
  !onField(s.players[player]).some(c=>c.uid===uid&&c.cardId==='TTG-1-062'&&c.enteredTurn===s.turn))
  throw new Error('062 entry requires newly played Nia');
 const r=structuredClone(s);r.pending={kind:'ttgRed062Retrigger',player,uid};return r;
}
export function legalRed062Retrigger(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed062Retrigger')return [];
 const b={type:'ttgRed062Retrigger',player:q.player,uid:q.uid};
 const eligible=onField(s.players[q.player]).filter(c=>name(c)==='シモン'&&TTG_BY_ID[c.cardId]?.energy<=3&&
  ['TTG-1-051','TTG-1-052','TTG-1-054','TTG-1-055'].includes(c.cardId));
 return [{...b,targetUid:null},...eligible.map(c=>({...b,targetUid:c.uid}))];
}
export function resolveRed062Retrigger(s,a={}){
 const q=s?.pending;if(!legalRed062Retrigger(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&x.targetUid===a.targetUid))
  throw new Error('062 must select own Simon whose ENTRY resolver is supported');
 const r=structuredClone(s);r.pending=null;
 if(a.targetUid)r.pending={kind:'ttgRed062FollowupEntry',player:q.player,uid:a.targetUid};
 return r;
}
export function legalRed062Main(s,p){
 if(!own(s,p)||s.active!==p||s.phase!=='main'||s.pending||s.players[p].deck.length>20)return [];
 const player=s.players[p];
 return onField(player).filter(c=>c.cardId==='TTG-1-062'&&c.ready).flatMap(c=>
  onField(player).filter(asSimon).flatMap(target=>
  [{type:'ttgRed062Main',player:p,uid:c.uid,targetUid:target.uid,discardUid:null},
   ...player.hand.map(h=>({type:'ttgRed062Main',player:p,uid:c.uid,targetUid:target.uid,discardUid:h.uid}))]));
}
export function resolveRed062Main(s,a={}){
 if(!legalRed062Main(s,a.player).some(x=>x.type===a.type&&x.uid===a.uid&&x.targetUid===a.targetUid&&x.discardUid===a.discardUid))
  throw new Error('062 main: REST source, correct Simon target and legal optional discard required');
 const r=structuredClone(s),p=r.players[a.player],before=inventory(s.players[a.player]);
 const source=onField(p).find(c=>c.uid===a.uid),target=onField(p).find(c=>c.uid===a.targetUid);
 source.ready=false;
 target.currentBp=(target.currentBp??TTG_BY_ID[target.cardId].bp)+1000;
 target.buffs??=[];target.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});
 if(a.discardUid){
  const i=p.hand.findIndex(c=>c.uid===a.discardUid);p.outside.push(p.hand.splice(i,1)[0]);target.ready=true;
 }
 confirm(before,inventory(p));return r;
}
