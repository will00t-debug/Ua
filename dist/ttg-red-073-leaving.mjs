// TTG-1-073 optional leave-the-field replacement (BP >=500 with facedown under).
// Applied BEFORE the physical Raid card would move to outside. Red player's
// choice is explicit; enemy cannot see identities of facedown cards until moved.
import {TTG_BY_ID} from './ttg-builder.mjs';
const rows=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((c,slot)=>({c,line,slot})).filter(x=>x.c));
const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
const inventory=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...rows(p).map(x=>x.c)].flatMap(deep).sort();
const flattened=c=>[{uid:c.uid,cardId:c.cardId},...(c.stack||[]).flatMap(flattened),...(c.under||[]).flatMap(flattened)];
export function beginRed073Leaving(s,{player,uid}={}){
 const loc=rows(s.players?.[player]).find(x=>x.c.uid===uid),c=loc?.c;
 if(!c||c.cardId!=='TTG-1-073'||(c.currentBp??TTG_BY_ID[c.cardId].bp)<500||
  !(c.under||[]).some(x=>x.faceDown))throw new Error('073 replacement not available');
 const r=structuredClone(s);
 r.pending={kind:'ttgRed073Leaving',player,uid,reason:'leavingField'};
 return r;
}
export function legalRed073Leaving(s){
 const q=s?.pending;if(q?.kind!=='ttgRed073Leaving')return [];
 const c=rows(s.players[q.player]).find(x=>x.c.uid===q.uid)?.c;
 if(!c)throw new Error('073 left before replacement decision');
 const b={type:'ttgRed073Leaving',player:q.player,uid:q.uid};
 return [{...b,mode:'retire',underUid:null},...(c.under||[]).filter(x=>x.faceDown)
  .map(x=>({...b,mode:'replace',underUid:x.uid}))];
}
export function resolveRed073Leaving(s,a={}){
 if(!legalRed073Leaving(s).some(x=>x.type===a.type&&x.player===a.player&&x.uid===a.uid&&
  x.mode===a.mode&&x.underUid===a.underUid))
  throw new Error('073 optional replacement choice invalid');
 const r=structuredClone(s),pl=r.players[a.player],before=inventory(s.players[a.player]);
 const loc=rows(pl).find(x=>x.c.uid===a.uid),card=loc.c;
 if(a.mode==='replace'){
  const i=card.under.findIndex(c=>c.uid===a.underUid);
  const facedown=card.under.splice(i,1)[0];
  pl.outside.push({...facedown,faceDown:false});
 }else{
  pl[loc.line][loc.slot]=null;
  pl.outside.push(...flattened(card));
 }
 r.pending=null;
 r.log??=[];r.log.push({type:'ttgRed073Leaving',player:a.player,uid:a.uid,mode:a.mode});
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('073 replacement changed physical count');
 return r;
}
