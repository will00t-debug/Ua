// Last seven MHA cards. Each ready card is played in a match.
// Q634: the owner sees facedown cards under their own card.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const pack=createMhaV2Pack();

function open(want,seed){
 const counts={...want};
 let total=Object.values(counts).reduce((a,b)=>a+b,0);
 const triggers={color:0,special:0,final:0};
 for(const [id,num] of Object.entries(counts)){
  const kind=pack.cards[id]?.trigger;
  if(triggers[kind]!=null)triggers[kind]+=num;
 }
 for(const id of Object.keys(pack.cards)){
  if(total>=50)break;
  const kind=pack.cards[id].trigger;
  const room=Math.min(4-(counts[id]||0),50-total,triggers[kind]!=null?4-triggers[kind]:4);
  if(room<=0)continue;
  counts[id]=(counts[id]||0)+room;
  total+=room;
  if(triggers[kind]!=null)triggers[kind]+=room;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error(s.pending.kind+' before main');
  s=dispatchUniversalAction(pack,s,{type:'next'});
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return s;
}
function legal(s){return legalUniversalActions(pack,s);}
function act(s,action){
 if(typeof action==='function'){
  const found=legal(s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pull(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','life','outside','removed']){
  const index=pl[zone].findIndex(c=>c?.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(c=>c?.cardId===id);
  if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
 }
 throw Error('Missing '+id);
}
function hold(s,owner,id){
 const card=s.players[owner].hand.find(c=>c.cardId===id)||pull(s,owner,id);
 if(!s.players[owner].hand.includes(card))s.players[owner].hand.push(card);
 return card;
}
function seat(s,owner,id,line,slot,ready=true){
 const card=pull(s,owner,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=card;
 return card;
}
function fuel(s,owner,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,owner,id);
  card.ready=false;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner].energy[i]=card;
 });
}
function readyAp(s,n,owner=0){
 s.players[owner].apCards.forEach((card,index)=>{
  if(index<n){card.inPlay=true;card.ready=true;}
 });
}
function play085(s){
 const card=hold(s,0,'MHA-1-085');
 const top=s.players[0].deck.slice(0,2).map(c=>c.uid);
 const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.ok(action,'no play for 085');
 return {s:act(s,action),top};
}

test('MHA-1-085 tucks two cards, gains own-turn BP, and retires only after a strip',()=>{
 let s=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-082':1,
  'MHA-1-083':1,'MHA-1-079':1},8501);
 fuel(s,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-082']);
 readyAp(s,1);
 const legalFoe=seat(s,1,'MHA-1-083','front',0,true);
 const high=seat(s,1,'MHA-1-079','front',1,true);
 const played=play085(s);
 s=played.s;
 const host=s.players[0].front.find(c=>c?.cardId==='MHA-1-085');
 assert.deepEqual((host.under||[]).map(c=>c.uid),played.top);
 assert.equal(host.under.every(c=>c.faceDown===true),true);
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,host),5500);
 s=act(s,{type:'next'});
 while(s.active===0){
  if(s.pending)throw Error(s.pending.kind);
  s=act(s,{type:'next'});
 }
 assert.equal(universalBp(pack,s,host),3500);

 s=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-082':1,
  'MHA-1-083':1,'MHA-1-079':1},8502);
 fuel(s,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-082']);
 readyAp(s,1);
 const small=seat(s,1,'MHA-1-083','front',0,true);
 const tall=seat(s,1,'MHA-1-079','front',1,true);
 s=play085(s).s;
 for(let i=0;i<6&&s.phase!=='attack';i++)s=act(s,{type:'next'});
 const attacker=s.players[0].front.find(c=>c?.cardId==='MHA-1-085');
 attacker.ready=true;
 s=act(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'effect-strip-facedown');
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(legal(s).filter(a=>a.type==='chooseStripFacedown'&&a.uid).length,2);
 const kept=act(s,{type:'chooseStripFacedown',uid:null});
 assert.equal(kept.pending.kind,'block');
 assert.equal(kept.players[0].front.find(c=>c?.uid===attacker.uid).under.length,2);
 assert.equal(kept.players[1].front.some(c=>c?.uid===small.uid),true);

 s=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-082':1,
  'MHA-1-079':1},8503);
 fuel(s,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-082']);
 readyAp(s,1);
 const onlyHigh=seat(s,1,'MHA-1-079','front',0,true);
 s=play085(s).s;
 const layer=s.players[0].front.find(c=>c?.cardId==='MHA-1-085').under[0].uid;
 for(let i=0;i<6&&s.phase!=='attack';i++)s=act(s,{type:'next'});
 const quiet=s.players[0].front.find(c=>c?.cardId==='MHA-1-085');
 quiet.ready=true;
 s=act(s,{type:'attack',uid:quiet.uid});
 s=act(s,{type:'chooseStripFacedown',uid:layer});
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].outside.some(c=>c.uid===layer),true);
 assert.equal(s.players[1].front[0].uid,onlyHigh.uid);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===quiet.uid)),4500);

 s=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-082':1,
  'MHA-1-083':1,'MHA-1-079':1},8504);
 fuel(s,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-082']);
 readyAp(s,1);
 const target=seat(s,1,'MHA-1-083','front',0,true);
 const over=seat(s,1,'MHA-1-079','front',1,true);
 s=play085(s).s;
 const spent=s.players[0].front.find(c=>c?.cardId==='MHA-1-085').under[0].uid;
 for(let i=0;i<6&&s.phase!=='attack';i++)s=act(s,{type:'next'});
 const striker=s.players[0].front.find(c=>c?.cardId==='MHA-1-085');
 striker.ready=true;
 s=act(s,{type:'attack',uid:striker.uid});
 s=act(s,{type:'chooseStripFacedown',uid:spent});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.optional,true);
 assert.equal(legal(s).some(a=>a.uid===target.uid),true);
 assert.equal(legal(s).some(a=>a.uid===over.uid),false);
 s.players[1].deck.push(s.players[1].front[0]);
 s.players[1].front[0]=null;
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:target.uid}),
  /not currently legal|Illegal BP-threshold/);
 s=act(s,{type:'chooseRetireBp',uid:null});
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[1].front.some(c=>c?.uid===target.uid),false);

 s=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-082':1,
  'MHA-1-083':1},8505);
 fuel(s,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-082']);
 readyAp(s,1);
 const retired=seat(s,1,'MHA-1-083','front',0,true);
 s=play085(s).s;
 const removedLayer=s.players[0].front.find(c=>c?.cardId==='MHA-1-085').under[1].uid;
 for(let i=0;i<6&&s.phase!=='attack';i++)s=act(s,{type:'next'});
 const finisher=s.players[0].front.find(c=>c?.cardId==='MHA-1-085');
 finisher.ready=true;
 s=act(s,{type:'attack',uid:finisher.uid});
 s=act(s,{type:'chooseStripFacedown',uid:removedLayer});
 s=act(s,{type:'chooseRetireBp',uid:retired.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===retired.uid),true);
 assert.equal(s.pending.kind,'block');
 s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].front.find(c=>c?.uid===finisher.uid).ready,false);
 assert.equal(legal(s).some(a=>a.type==='attack'&&a.uid===finisher.uid),false);

 const unpaid=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-082':1},8506);
 fuel(unpaid,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-082']);
 unpaid.players[0].apCards.forEach(card=>{card.inPlay=true;card.ready=false;});
 const noAp=hold(unpaid,0,'MHA-1-085');
 assert.equal(legal(unpaid).some(a=>a.type==='play'&&a.uid===noAp.uid),false);
 const green=open({'MHA-1-085':1,'MHA-1-057':4},8507);
 fuel(green,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(green,1);
 const wrongColor=hold(green,0,'MHA-1-085');
 assert.equal(legal(green).some(a=>a.type==='play'&&a.uid===wrongColor.uid),false);

 const raided=open({'MHA-1-085':1,'MHA-1-067':1,'MHA-1-073':1,'MHA-1-075':1,'MHA-1-078':1,'MHA-1-082':1},8508);
 fuel(raided,0,['MHA-1-067','MHA-1-073','MHA-1-075','MHA-1-078']);
 readyAp(raided,1);
 const base=seat(raided,0,'MHA-1-082','front',1,false);
 const topCard=hold(raided,0,'MHA-1-085');
 const buried=raided.players[0].deck.slice(0,2).map(c=>c.uid);
 s=act(raided,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid&&a.line!=='energy');
 const raidTop=s.players[0].front.find(c=>c?.cardId==='MHA-1-085');
 assert.equal(raidTop.ready,true);
 assert.equal(raidTop.stack.some(c=>c.uid===base.uid),true);
 assert.deepEqual(raidTop.under.map(c=>c.uid),buried);
 assert.equal(universalBp(pack,s,raidTop),5500);
});

