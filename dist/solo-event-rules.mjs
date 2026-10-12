// UA51BT isolated EVENT settlements, NOT connected to the published BLEACH match engine.
// Respects energy/AP payments, mandatory player choices and atomic illegal-action rejection.
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
const data=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const supported=new Set(['SLG-1-036','SLG-1-038','SLG-1-040','SLG-1-076','SLG-1-077','SLG-1-078','SLG-1-079','SLG-1-080']);
const source=s=>s.players[s.active];
const enemy=s=>s.players[1-s.active];
const ownChar=(s,name)=>source(s).field.some(c=>data[c.cardId]?.type==='character'&&data[c.cardId]?.nameJa===name);
const raidCards=s=>source(s).field.filter(c=>data[c.cardId]?.traits?.includes('第四次架南島Raid'));
const usable=s=>s.phase==='main'&&!s.pending;
const resolveCard=s=>s.pending?.card;
const drawing=(s,n)=>{for(let i=0;i<n&&source(s).deck.length;i++)source(s).hand.push(source(s).deck.shift());};
const targetBp=c=>(c.currentBp??data[c.cardId]?.bp??c.printedBp);
const legalEnemyTarget=(s,c,bpLimit)=>!!(c&&(c.line==='front'||c.line==null)&&targetBp(c)!=null&&targetBp(c)<=bpLimit&&source(s).ap>=(c.extraTargetAp||0));
export function canPlaySoloEvent(s,uid){
 const d=data[source(s).hand.find(c=>c.uid===uid)?.cardId];
 return !!(usable(s)&&d?.type==='event'&&supported.has(d.id)&&source(s).ap>=d.ap&&source(s).availableEnergy>=d.energy);
}
export function beginSoloEvent(s,uid){
 if(!canPlaySoloEvent(s,uid))throw Error('event payment or phase illegal');
 const p=source(s),i=p.hand.findIndex(c=>c.uid===uid),d=data[p.hand[i].cardId];
 // Defer all choices until after paying the printed card cost. No target is auto-picked.
 p.ap-=d.ap;const [c]=p.hand.splice(i,1);p.outside.push(c);
 const id=d.id;
 if(id==='SLG-1-036'){drawing(s,3);s.pending=p.hand.length?{type:'discard',left:Math.min(2,p.hand.length),player:s.active,card:c.uid}:null;}
 else if(['SLG-1-038','SLG-1-078','SLG-1-079'].includes(id))s.pending={type:'recoverAp',max:2,player:s.active,card:c.uid};
 else if(['SLG-1-040','SLG-1-076','SLG-1-077'].includes(id))s.pending={type:'destroy',player:s.active,card:c.uid};
 else if(id==='SLG-1-080'){drawing(s,1);s.pending={type:'grantAttackDraw',player:s.active,card:c.uid};}
 else throw Error('event resolver not implemented for '+id);
 return s;
}
export function enemyTargetsForSoloEvent(s){
 const pending=s.pending;
 if(!pending||pending.type!=='destroy'||pending.player!==s.active)return [];
 const c=source(s).outside.find(x=>x.uid===resolveCard(s)),id=c?.cardId;
 let threshold=0;
 if(id==='SLG-1-040'||id==='SLG-1-076')threshold=ownChar(s,'水篠 旬')?5000:3000;
 else if(id==='SLG-1-077')threshold=raidCards(s).length>=5?5000:2000;
 return enemy(s).field.filter(c=>legalEnemyTarget(s,c,threshold)).map(c=>c.uid);
}
export function chooseSoloEvent(s,{uid,count}={}){
 const q=s.pending;if(!q||q.player!==s.active)throw Error('no own pending event');
 const p=source(s);
 if(q.type==='discard'){
  const i=p.hand.findIndex(c=>c.uid===uid);if(i<0)throw Error('illegal discard target');
  p.outside.push(p.hand.splice(i,1)[0]);q.left--;if(q.left===0||p.hand.length===0)s.pending=null;
 }else if(q.type==='recoverAp'){
  if(!Number.isInteger(count)||count<0||count>q.max||p.ap+count>p.maxAp)throw Error('invalid AP recovery count');
  p.ap+=count;s.pending=null;
 }else if(q.type==='destroy'){
  const allowed=enemyTargetsForSoloEvent(s);
  if(uid==null){if(allowed.length)throw Error('target required while targets exist');s.pending=null;return s;}
  if(!allowed.includes(uid))throw Error('enemy target illegal');
  const i=enemy(s).field.findIndex(c=>c.uid===uid);
  const [t]=enemy(s).field.splice(i,1);
  p.ap-=t.extraTargetAp||0;
  enemy(s).outside.push(t);s.pending=null;
  const event=p.outside.find(c=>c.uid===q.card);
  if(event?.cardId==='SLG-1-077'){
   const cards=raidCards(s),names=new Set(cards.map(c=>data[c.cardId]?.nameJa));
   if(names.size>=5)s.pending={type:'raidBuff',player:s.active,card:q.card};
  }
 }else if(q.type==='raidBuff'){
  if(uid!=null){
   const c=p.field.find(c=>c.uid===uid&&data[c.cardId]?.type==='character');
   if(!c)throw Error('illegal buff target');
   c.buffs??=[];c.buffs.push({turn:s.turn,bp:1000});
  }
  s.pending=null;
 }else if(q.type==='grantAttackDraw'){
  if(uid!=null){
   const c=p.field.find(c=>c.uid===uid&&data[c.cardId]?.nameJa==='向坂 雫');
   if(!c)throw Error('must choose own Shizuku');
   c.granted??=[];c.granted.push({kind:'attackDraw',turn:s.turn});
  }
  s.pending=null;
 }else throw Error('unknown event choice');
 return s;
}
export function soloEventPreview(s,uid){
 if(!canPlaySoloEvent(s,uid))return {legal:false};
 const c=source(s).hand.find(c=>c.uid===uid),d=data[c.cardId];
 return {legal:true,cardNumber:d.number,apCost:d.ap,energyRequirement:d.energy,choicesRequired:true};
}
