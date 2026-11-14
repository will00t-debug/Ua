// MHA-1-091, 095, 096. Each ready card is played through the real battle actions.
// 091: attack and block, open front, optional hand to outside, then this-turn BP+2000.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';

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
function seat(s,owner,id,line,slot,ready=true){
 const card=pull(s,owner,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=card;
 return card;
}
function hold(s,owner,id){
 const card=s.players[owner].hand.find(c=>c.cardId===id)||pull(s,owner,id);
 if(!s.players[owner].hand.includes(card))s.players[owner].hand.push(card);
 return card;
}
function reach(s,phase){
 for(let i=0;i<8&&s.phase!==phase;i++){
  if(s.pending)throw Error(s.pending.kind+' before '+phase);
  s=act(s,{type:'next'});
 }
 if(s.phase!==phase)throw Error('Stopped in '+s.phase);
 return s;
}

test('MHA-1-091 pays one hand card for BP only when its front has room, on attack and on block',()=>{
 const printed=pack.cards['MHA-1-091'];
 assert.equal(printed.effects.onAttack[0].op,'openFrontHandOutsideBuff');
 assert.equal(printed.effects.onBlock[0].bp,2000);
 assert.equal(printed.effects.onAttack[0].optional,true);

 let s=open({'MHA-1-091':1,'MHA-1-080':1,'MHA-1-082':1},9101);
 const self=seat(s,0,'MHA-1-091','front',0,true);
 const pay=hold(s,0,'MHA-1-082');
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'effect-open-front-hand-buff');
 assert.equal(s.pending.optional,true);
 assert.ok(legal(s).some(a=>a.type==='chooseOpenFrontHandBuff'&&a.uid===null));
 assert.ok(legal(s).some(a=>a.uid===pay.uid));
 const skipped=act(structuredClone(s),{type:'chooseOpenFrontHandBuff',uid:null});
 assert.equal(universalBp(pack,skipped,skipped.players[0].front[0]),2500);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===pay.uid));
 assert.equal(skipped.pending.kind,'block');

 s=act(s,{type:'chooseOpenFrontHandBuff',uid:pay.uid});
 const boosted=s.players[0].front.find(c=>c.uid===self.uid);
 assert.equal(universalBp(pack,s,boosted),4500);
 assert.ok(s.players[0].outside.some(c=>c.uid===pay.uid));
 assert.equal(s.players[0].hand.some(c=>c.uid===pay.uid),false);
 assert.equal(s.pending.kind,'block');
 assert.throws(()=>act(structuredClone(s),{type:'chooseOpenFrontHandBuff',uid:pay.uid}),/not currently legal/);

 let full=open({'MHA-1-091':1,'MHA-1-082':1,'MHA-1-088':1,'MHA-1-094':1,'MHA-1-086':1},9102);
 const crowded=seat(full,0,'MHA-1-091','front',0,true);
 seat(full,0,'MHA-1-082','front',1,true);
 seat(full,0,'MHA-1-088','front',2,true);
 seat(full,0,'MHA-1-094','front',3,true);
 const stuck=hold(full,0,'MHA-1-086');
 full=reach(full,'attack');
 full=act(full,{type:'attack',uid:crowded.uid});
 assert.equal(full.pending?.kind==='effect-open-front-hand-buff',false);
 assert.equal(universalBp(pack,full,full.players[0].front[0]),2500);
 assert.ok(full.players[0].hand.some(c=>c.uid===stuck.uid));

 let bare=open({'MHA-1-091':1},9103);
 const lonely=seat(bare,0,'MHA-1-091','front',0,true);
 bare.players[0].outside.push(...bare.players[0].hand.splice(0));
 bare=reach(bare,'attack');
 bare=act(bare,{type:'attack',uid:lonely.uid});
 assert.equal(bare.pending?.kind==='effect-open-front-hand-buff',false);
 assert.equal(universalBp(pack,bare,bare.players[0].front[0]),2500);

 let blocked=open({'MHA-1-091':1,'MHA-1-080':1,'MHA-1-082':1},9104);
 const wall=seat(blocked,0,'MHA-1-091','front',0,true);
 const toll=hold(blocked,0,'MHA-1-082');
 const striker=seat(blocked,1,'MHA-1-080','front',0,true);
 for(let i=0;i<12&&!(blocked.active===1&&blocked.phase==='attack');i++){
  if(blocked.pending)throw Error(blocked.pending.kind+' while passing');
  blocked=act(blocked,{type:'next'});
 }
 assert.equal(blocked.active,1);
 assert.equal(blocked.phase,'attack');
 blocked=act(blocked,{type:'attack',uid:striker.uid});
 assert.equal(blocked.pending.kind,'block');
 assert.ok(legal(blocked).some(a=>a.type==='chooseBlock'&&a.uid===wall.uid));
 const declined=act(structuredClone(blocked),{type:'chooseBlock',uid:wall.uid});
 assert.equal(declined.pending.kind,'effect-open-front-hand-buff');
 const lost=act(declined,{type:'chooseOpenFrontHandBuff',uid:null});
 assert.equal(lost.players[0].front.some(c=>c?.uid===wall.uid),false);
 assert.ok(lost.players[0].outside.some(c=>c.uid===wall.uid));
 assert.ok(lost.players[1].front.some(c=>c?.uid===striker.uid));

 blocked=act(blocked,{type:'chooseBlock',uid:wall.uid});
 assert.equal(blocked.pending.kind,'effect-open-front-hand-buff');
 blocked=act(blocked,{type:'chooseOpenFrontHandBuff',uid:toll.uid});
 assert.equal(universalBp(pack,blocked,blocked.players[0].front.find(c=>c.uid===wall.uid)),4500);
 assert.ok(blocked.players[0].front.some(c=>c?.uid===wall.uid));
 assert.ok(blocked.players[1].front.some(c=>c?.uid===striker.uid));
 assert.ok(blocked.players[0].outside.some(c=>c.uid===toll.uid));
 assert.equal(assertUniversalMatch(pack,blocked),true);
});
