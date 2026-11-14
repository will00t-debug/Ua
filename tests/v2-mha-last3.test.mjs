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

test('MHA-1-095 gains double attack only after it moves, and a full front removes one card first',()=>{
 const printed=pack.cards['MHA-1-095'];
 assert.equal(printed.step,true);
 assert.equal(printed.doubleAttackIfSelfMoved,true);
 assert.deepEqual(printed.mainAbility,{op:'payHandMoveSelf',oncePerTurn:true,pay:1});

 let still=open({'MHA-1-095':1},9501);
 const parked=seat(still,0,'MHA-1-095','front',0,true);
 still=reach(still,'attack');
 still=act(still,{type:'attack',uid:parked.uid});
 const rested=still.players[0].front.find(c=>c.uid===parked.uid);
 assert.equal(rested.ready,false);
 assert.equal(still.attacksByUid[parked.uid],1);

 let full=open({'MHA-1-095':1,'MHA-1-082':1,'MHA-1-088':1,'MHA-1-086':1,'MHA-1-094':1,'MHA-1-080':1},9502);
 const mover=seat(full,0,'MHA-1-095','energy',0,true);
 const occupants=[
  seat(full,0,'MHA-1-082','front',0,true),
  seat(full,0,'MHA-1-088','front',1,true),
  seat(full,0,'MHA-1-086','front',2,true),
  seat(full,0,'MHA-1-094','front',3,true)
 ];
 const toll=hold(full,0,'MHA-1-080');
 assert.equal(full.phase,'main');
 assert.equal(legal(full).some(a=>a.type==='activate'&&a.uid===mover.uid&&a.mode==='payHandMoveSelf'),true);
 full=act(full,{type:'activate',uid:mover.uid,mode:'payHandMoveSelf'});
 assert.equal(full.pending.kind,'effect-pay-hand-self');
 assert.equal(legal(full).some(a=>a.uid===null),false);
 full=act(full,{type:'choosePayHandSelf',uid:toll.uid});
 assert.ok(full.players[0].outside.some(c=>c.uid===toll.uid));
 assert.equal(full.pending.kind,'effect-line-slot');
 assert.equal(full.pending.line,'front');
 assert.equal(legal(full).length,4);
 assert.ok(legal(full).every(a=>a.replaceUid));
 full=act(full,{type:'chooseLineSlot',slot:0,replaceUid:occupants[0].uid});
 assert.ok(full.players[0].removed.some(c=>c.uid===occupants[0].uid));
 assert.equal(full.players[0].outside.some(c=>c.uid===occupants[0].uid),false);
 assert.equal(full.players[0].front[0].uid,mover.uid);
 assert.equal(full.players[0].energy[0],null);
 assert.equal(legal(full).some(a=>a.type==='activate'&&a.mode==='payHandMoveSelf'),false);
 assert.throws(()=>act(structuredClone(full),{type:'activate',uid:mover.uid,mode:'payHandMoveSelf'}),/not currently legal/);
 full=reach(full,'attack');
 full=act(full,{type:'attack',uid:mover.uid});
 if(full.pending?.kind==='block')full=act(full,{type:'chooseBlock',uid:null});
 assert.equal(full.players[0].front.find(c=>c?.uid===mover.uid).ready,true);
 full=act(full,{type:'attack',uid:mover.uid});
 if(full.pending?.kind==='block')full=act(full,{type:'chooseBlock',uid:null});
 assert.equal(full.players[0].front.find(c=>c?.uid===mover.uid).ready,false);
 assert.equal(assertUniversalMatch(pack,full),true);

 let unpaid=open({'MHA-1-095':1},9503);
 const broke=seat(unpaid,0,'MHA-1-095','front',0,true);
 unpaid.players[0].outside.push(...unpaid.players[0].hand.splice(0));
 assert.equal(legal(unpaid).some(a=>a.uid===broke.uid&&a.mode==='payHandMoveSelf'),false);

 let stepped=open({'MHA-1-095':1,'MHA-1-082':1},9504);
 const walker=seat(stepped,0,'MHA-1-095','front',0,true);
 const kept=hold(stepped,0,'MHA-1-082');
 for(let i=0;i<16&&!(stepped.active===0&&stepped.phase==='move'&&stepped.turn>0);i++){
  if(stepped.pending?.kind==='block')stepped=act(stepped,{type:'chooseBlock',uid:null});
  else{
   if(stepped.pending)throw Error(stepped.pending.kind+' before the next move phase');
   stepped=act(stepped,{type:'next'});
  }
 }
 assert.equal(stepped.phase,'move');
 stepped=act(stepped,a=>a.type==='step'&&a.uid===walker.uid&&a.replaceUid===undefined);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===walker.uid),true);
 stepped=reach(stepped,'main');
 stepped=act(stepped,{type:'activate',uid:walker.uid,mode:'payHandMoveSelf'});
 stepped=act(stepped,{type:'choosePayHandSelf',uid:kept.uid});
 assert.equal(stepped.pending.kind,'effect-line-slot');
 assert.equal(legal(stepped).some(a=>a.replaceUid),false);
 stepped=act(stepped,{type:'chooseLineSlot',slot:0});
 assert.equal(stepped.players[0].front[0].uid,walker.uid);
 assert.equal(stepped.players[0].removed.length,0);
 assert.ok(stepped.players[0].outside.some(c=>c.uid===kept.uid));
 stepped=reach(stepped,'attack');
 stepped=act(stepped,{type:'attack',uid:walker.uid});
 if(stepped.pending?.kind==='block')stepped=act(stepped,{type:'chooseBlock',uid:null});
 assert.equal(stepped.players[0].front.find(c=>c?.uid===walker.uid).ready,true);
 assert.equal(assertUniversalMatch(pack,stepped),true);
});

test('MHA-1-096 optionally rests one active copy and draws when an own effect puts a hand card outside',()=>{
 const printed=pack.cards['MHA-1-096'];
 assert.equal(printed.mainAbility,null);
 assert.equal(printed.moveObserver.op,'mayRestActiveFieldDraw');
 assert.equal(printed.moveObserver.once,'name');
 assert.equal(printed.moveObserver.turn,'own');
 assert.deepEqual([...printed.moveObserver.when.reasons],['payment','own-effect']);
 const body=(s,uid,owner=0)=>[...s.players[owner].front,...s.players[owner].energy].find(c=>c?.uid===uid);
 const payMove=(s,mover,toll,slot)=>{
  s=act(s,{type:'activate',uid:mover.uid,mode:'payHandMoveSelf'});
  s=act(s,{type:'choosePayHandSelf',uid:toll.uid});
  assert.equal(s.pending.kind,'effect-line-slot');
  assert.equal(s.pending.line,'energy');
  return act(s,{type:'chooseLineSlot',slot});
 };

 let same=open({'MHA-1-096':2,'MHA-1-095':1,'MHA-1-091':1,'MHA-1-080':1,'MHA-1-082':1},9601);
 const taken=seat(same,0,'MHA-1-096','energy',0,true);
 const spared=seat(same,0,'MHA-1-096','energy',1,true);
 const striker=seat(same,0,'MHA-1-091','front',0,true);
 const mover=seat(same,0,'MHA-1-095','front',1,true);
 const toll=hold(same,0,'MHA-1-080');
 const later=hold(same,0,'MHA-1-082');
 assert.equal(legal(same).some(a=>a.type==='activate'&&(a.uid===taken.uid||a.uid===spared.uid)),false);
 same=payMove(same,mover,toll,2);
 assert.equal(same.pending.kind,'effect-rest-field-draw');
 assert.equal(same.pending.player,0);
 assert.equal(same.pending.sourceUid,taken.uid);
 const drawn=same.players[0].hand.length;
 const deck=same.players[0].deck.length;
 same=act(same,{type:'chooseRestFieldDraw',mode:'rest'});
 assert.equal(same.pending,null);
 assert.equal(body(same,taken.uid).ready,false);
 assert.equal(body(same,spared.uid).ready,true);
 assert.equal(same.players[0].hand.length,drawn+1);
 assert.equal(same.players[0].deck.length,deck-1);
 same=reach(same,'attack');
 same=act(same,{type:'attack',uid:striker.uid});
 assert.equal(same.pending.kind,'effect-open-front-hand-buff');
 same=act(same,{type:'chooseOpenFrontHandBuff',uid:later.uid});
 assert.equal(same.pending.kind,'block');
 assert.equal(body(same,taken.uid).ready,false);
 assert.equal(body(same,spared.uid).ready,true);
 same=act(same,{type:'chooseBlock',uid:null});
 assert.equal(assertUniversalMatch(pack,same),true);

 let passed=open({'MHA-1-096':2,'MHA-1-095':1,'MHA-1-080':1},9602);
 const declined=seat(passed,0,'MHA-1-096','energy',0,true);
 const other=seat(passed,0,'MHA-1-096','energy',1,true);
 const walker=seat(passed,0,'MHA-1-095','front',0,true);
 const fee=hold(passed,0,'MHA-1-080');
 passed=payMove(passed,walker,fee,2);
 assert.equal(passed.pending.sourceUid,declined.uid);
 passed=act(passed,{type:'chooseRestFieldDraw',mode:'skip'});
 assert.equal(body(passed,declined.uid).ready,true);
 assert.equal(passed.pending.kind,'effect-rest-field-draw');
 assert.equal(passed.pending.sourceUid,other.uid);
 const before=passed.players[0].hand.length;
 passed=act(passed,{type:'chooseRestFieldDraw',mode:'rest'});
 assert.equal(passed.pending,null);
 assert.equal(body(passed,declined.uid).ready,true);
 assert.equal(body(passed,other.uid).ready,false);
 assert.equal(passed.players[0].hand.length,before+1);

 let tired=open({'MHA-1-096':2,'MHA-1-095':1,'MHA-1-080':1},9603);
 const asleep=seat(tired,0,'MHA-1-096','energy',0,false);
 const awake=seat(tired,0,'MHA-1-096','energy',1,true);
 const shifter=seat(tired,0,'MHA-1-095','front',0,true);
 const cost=hold(tired,0,'MHA-1-080');
 const quiet=tired.players[0].hand.length;
 tired=payMove(tired,shifter,cost,2);
 assert.equal(tired.pending.sourceUid,awake.uid);
 tired=act(tired,{type:'chooseRestFieldDraw',mode:'skip'});
 assert.equal(tired.pending,null);
 assert.equal(body(tired,asleep.uid).ready,false);
 assert.equal(body(tired,awake.uid).ready,true);
 assert.equal(tired.players[0].hand.length,quiet-1);

 let foreign=open({'MHA-1-096':1,'MHA-1-095':1,'MHA-1-080':1},9604);
 const home=seat(foreign,0,'MHA-1-096','energy',0,true);
 const theirs=seat(foreign,1,'MHA-1-095','front',0,true);
 const theirToll=hold(foreign,1,'MHA-1-080');
 for(let i=0;i<12&&!(foreign.active===1&&foreign.phase==='main');i++){
  if(foreign.pending)throw Error(foreign.pending.kind+' before the opponent main');
  foreign=act(foreign,{type:'next'});
 }
 assert.equal(foreign.active,1);
 foreign=payMove(foreign,theirs,theirToll,0);
 assert.notEqual(foreign.pending?.kind,'effect-rest-field-draw');
 assert.equal(body(foreign,home.uid).ready,true);

 let ruled=open({'MHA-1-096':1,'MHA-1-097':1,'MHA-1-080':1,'MHA-1-082':1,'MHA-1-088':1,'MHA-1-091':1},9605);
 const office=seat(ruled,0,'MHA-1-096','energy',0,true);
 seat(ruled,0,'MHA-1-080','energy',1,true);
 seat(ruled,0,'MHA-1-082','energy',2,true);
 seat(ruled,0,'MHA-1-088','energy',3,true);
 const victim=seat(ruled,1,'MHA-1-091','front',0,true);
 const event=hold(ruled,0,'MHA-1-097');
 ruled=act(ruled,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(ruled.pending.kind,'effect-retire-bp');
 ruled=act(ruled,{type:'chooseRetireBp',uid:victim.uid});
 assert.notEqual(ruled.pending?.kind,'effect-rest-field-draw');
 assert.ok(ruled.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(body(ruled,office.uid).ready,true);
 assert.equal(assertUniversalMatch(pack,ruled),true);
});
