import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalAttackDamage}
 from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const white=summarizeDesignatedDecks(id=>!!pack.cards[id]).find(r=>r.key==='white-sword');
const counts=designatedPlayableCounts(white);
const fresh=(seed=2401)=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function uids(s){
 const out=[],walk=c=>{out.push(c.uid);for(const x of c.stack||[])walk(x);for(const x of c.under||[])walk(x);};
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed'])
   for(const c of p[zone])walk(c);
  for(const c of [...p.front,...p.energy])if(c)walk(c);
 }
 return out.sort();
}
function actorOf(s){return s.pending?.player??s.active;}
function play(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,'missing legal action');
 const next=dispatchUniversalAction(packs,s,action,{actor:actorOf(s)});
 assert.deepEqual(uids(next),uids(s));
 assert.equal(assertUniversalMatch(packs,next),true);
 return next;
}
function phase(s,target){
 for(let i=0;i<8&&s.phase!==target;i++)s=play(s,a=>a.type==='next');
 assert.equal(s.phase,target);return s;
}
function sit(s,card,ready=true){
 card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;return card;
}
function place(s,p,id,line,slot,ready=true){
 const card=sit(s,take(s,p,id),ready);
 s.players[p][line][slot]=card;return card;
}
function fuel(s,p=0){
 place(s,p,'BLC-3-009','energy',0);
 place(s,p,'BLC-3-009','energy',1);
}
function hold(s,p,id){
 const card=take(s,p,id);s.players[p].hand.push(card);return card;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function raid(s,topId,baseId){
 const base=place(s,0,baseId,'front',0);
 const top=hold(s,0,topId);
 s=play(s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 return {s,baseUid:base.uid,topUid:top.uid};
}
function toOpponentMain(s){
 s=phase(s,'attack');
 s=play(s,a=>a.type==='next');
 assert.equal(s.active,1);
 return phase(s,'main');
}
function find(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}

test('three green prints complete the white-sword deck without joining the seven presets',()=>{
 assert.equal(Object.keys(pack.cards).length,160);
 assert.equal(EXPECTED_V2_COUNTS.bleach,160);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.equal(white.playable,true);
 assert.equal(white.registeredKinds,13);
 assert.deepEqual(white.missing,[]);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.keys(createAllV2PreviewRealDecks()).includes('white-sword'),false);
 assert.equal(Object.keys(createAllV2PreviewRealDecks()).includes('reject-blue'),false);
});

test('BLC-4-060 cannot enter the front by play or the move rule, and only shifts a differently named character',()=>{
 let s=phase(fresh(2460),'main');
 place(s,0,'BLC-4-060','energy',0);
 const played=hold(s,0,'BLC-4-060');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===played.uid&&a.line==='energy'),true);
 s=play(s,a=>a.type==='play'&&a.uid===played.uid&&a.line==='energy'&&a.slot===1);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy[1].uid,played.uid);
 let moving=phase(fresh(2461),'main');
 fuel(moving);
 const other=place(moving,0,'BLC-4-070','energy',2);
 const aizen=hold(moving,0,'BLC-4-060');
 moving=play(moving,a=>a.type==='play'&&a.uid===aizen.uid&&a.line==='energy'&&a.slot===3);
 assert.equal(moving.pending.kind,'effect-line-move');
 assert.equal(moving.pending.choices.includes(other.uid),true);
 assert.equal(moving.pending.choices.includes(aizen.uid),false);
 aiOk(moving);
 moving=play(moving,a=>a.type==='chooseLineMove'&&a.uid===other.uid);
 assert.equal(moving.pending.kind,'effect-line-slot');
 moving=play(moving,a=>a.type==='chooseLineSlot'&&a.slot===0);
 assert.equal(moving.players[0].front[0].uid,other.uid);
 assert.equal(moving.players[0].energy[2],null);
 let full=phase(fresh(2462),'main');
 fuel(full);
 const mover=place(full,0,'BLC-1-083','energy',2);
 const occupants=[0,1,2,3].map(slot=>place(full,0,'BLC-1-072','front',slot));
 const entering=hold(full,0,'BLC-4-060');
 full=play(full,a=>a.type==='play'&&a.uid===entering.uid&&a.line==='energy'&&a.slot===3);
 full=play(full,a=>a.type==='chooseLineMove'&&a.uid===mover.uid);
 full=play(full,a=>a.type==='chooseLineSlot'&&a.replaceUid===occupants[0].uid);
 assert.equal(full.players[0].removed.some(c=>c.uid===occupants[0].uid),true);
 assert.equal(full.players[0].front[0].uid,mover.uid);
 let ruled=fresh(2463);
 const stuck=place(ruled,0,'BLC-4-060','energy',0,false);
 ruled=phase(ruled,'move');
 assert.equal(legalUniversalActions(packs,ruled).some(a=>a.type==='move'&&a.uid===stuck.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,ruled,{type:'move',uid:stuck.uid,slot:0}),/not currently legal/);
 assert.equal(ruled.players[0].energy[0].uid,stuck.uid);
});

test('BLC-4-060 rests two ready fronts, moves from energy by its own effect, and draws on attack',()=>{
 let s=phase(fresh(2464),'main');
 const aizen=place(s,0,'BLC-4-060','energy',0,false);
 const second=place(s,0,'BLC-4-060','energy',1,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===aizen.uid),false);
 const ready=[place(s,0,'BLC-4-070','front',0),place(s,0,'BLC-1-083','front',1)];
 place(s,0,'BLC-1-072','front',2);place(s,0,'BLC-2-069','front',3);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===aizen.uid),false);
 for(const slot of [2,3]){
  const parked=s.players[0].front[slot];
  s.players[0].front[slot]=null;
  parked.ready=false;parked.fieldEntryStamp=null;
  s.players[0].deck.push(parked);
 }
 s=play(s,a=>a.type==='activate'&&a.uid===aizen.uid&&a.mode==='restTwoMove');
 assert.equal(s.pending.kind,'effect-rest-two');
 aiOk(s);
 s=play(s,a=>a.type==='chooseRestTwo'&&a.uid===ready[0].uid);
 assert.equal(s.pending.kind,'effect-rest-two');
 s=play(s,a=>a.type==='chooseRestTwo'&&a.uid===ready[1].uid);
 assert.equal(s.pending.kind,'effect-self-front');
 s=play(s,a=>a.type==='chooseSelfFront'&&a.slot===2);
 const moved=s.players[0].front[2];
 assert.equal(moved.uid,aizen.uid);
 assert.equal(moved.ownEffectFront,true);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.mainAbilityUsedUids.includes(aizen.uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 s.players[0].front[0].ready=true;s.players[0].front[1].ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='restTwoMove'),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===aizen.uid),false);
 moved.ready=true;
 s=phase(s,'attack');
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 s=play(s,a=>a.type==='attack'&&a.uid===aizen.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending.kind,'block');
});

test('BLC-2-067 gains BP and Damage 2 only from a printed energy-4 Raid base',()=>{
 let high=phase(fresh(2467),'main');
 fuel(high);
 const life=high.players[1].life.length;
 ({s:high}=raid(high,'BLC-2-067','BLC-3-008'));
 const ken=high.players[0].front[0];
 assert.equal(universalBp(packs,high,ken),5000);
 assert.equal(universalAttackDamage(packs,high,ken),2);
 assert.equal(high.players[1].life.length,life);
 ken.buffs.push({bp:-1500,untilTurn:high.turn});
 assert.equal(universalBp(packs,high,ken),5000);
 grantContinuousState(high,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:ken.uid,targetUid:ken.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalBp(packs,high,ken),3500);
 assert.equal(universalAttackDamage(packs,high,ken),2);
 assert.equal(assertUniversalMatch(packs,high),true);
 let low=phase(fresh(2468),'main');
 fuel(low);
 ({s:low}=raid(low,'BLC-2-067','BLC-4-070'));
 const plain=low.players[0].front[0];
 assert.equal(universalBp(packs,low,plain),4000);
 assert.equal(universalAttackDamage(packs,low,plain),1);
 assert.equal(plain.attackDamageGranted,undefined);
 let normal=phase(fresh(2469),'main');
 fuel(normal);
 const played=hold(normal,0,'BLC-2-067');
 normal=play(normal,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'&&a.slot===0);
 assert.equal(normal.pending,null);
 assert.equal(universalBp(packs,normal,normal.players[0].front[0]),4000);
 assert.equal(universalAttackDamage(packs,normal,normal.players[0].front[0]),1);
 let later=phase(fresh(2470),'main');
 fuel(later);
 ({s:later}=raid(later,'BLC-2-067','BLC-3-008'));
 later=phase(later,'attack');
 later=play(later,a=>a.type==='next');
 const faded=later.players[0].front[0];
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,faded),4000);
 assert.equal(universalAttackDamage(packs,later,faded),1);
 assert.equal(faded.attackDamageGranted,undefined);
});

test('BLC-2-067 Damage 2 hits unblocked life and a blocked win deals Impact 1',()=>{
 let open=phase(fresh(2471),'main');
 fuel(open);
 ({s:open}=raid(open,'BLC-2-067','BLC-3-008'));
 const topUid=open.players[0].front[0].uid;
 open=phase(open,'attack');
 const life=open.players[1].life.length;
 open=play(open,a=>a.type==='attack'&&a.uid===topUid);
 open=play(open,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(open.players[1].life.length,life-2);
 let blocked=phase(fresh(2472),'main');
 fuel(blocked);
 ({s:blocked}=raid(blocked,'BLC-2-067','BLC-3-008'));
 const attacker=blocked.players[0].front[0].uid;
 const blocker=place(blocked,1,'BLC-1-083','front',0);
 blocked=phase(blocked,'attack');
 const before=blocked.players[1].life.length;
 blocked=play(blocked,a=>a.type==='attack'&&a.uid===attacker);
 blocked=play(blocked,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(blocked.players[1].life.length,before-1);
 assert.equal(blocked.players[1].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(blocked.players[1].life.length===before-2,false);
});

test('BLC-2-067 replaces an opponent or battle leave only on a high Raid base',()=>{
 function opened(seed,baseId){
  let s=phase(fresh(seed),'main');
  fuel(s);
  const raided=raid(s,'BLC-2-067',baseId);
  return raided;
 }
 function eventAt(s,topUid){
  s=toOpponentMain(s);
  fuel(s,1);
  place(s,1,'BLC-4-070','front',1);
  const event=hold(s,1,'BLC-2-073');
  s=play(s,a=>a.type==='event'&&a.uid===event.uid);
  assert.equal(s.pending.kind,'effect-retire-bp');
  assert.equal(s.pending.choices.includes(topUid),true);
  return play(s,a=>a.type==='chooseRetireBp'&&a.uid===topUid);
 }
 let {s,baseUid,topUid}=opened(2473,'BLC-3-008');
 s=eventAt(s,topUid);
 assert.equal(s.pending.kind,'effect-raid-leave');
 assert.equal(s.pending.by,'opponent');
 aiOk(s);
 const pay=s.players[0].hand[0].uid;
 const before=JSON.stringify(s.players[0].hand.map(c=>c.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRaidLeave',mode:'pay',uid:'missing'}),/not currently legal/);
 assert.equal(JSON.stringify(s.players[0].hand.map(c=>c.uid)),before);
 const accepted=play(s,a=>a.type==='chooseRaidLeave'&&a.mode==='pay'&&a.uid===pay);
 const stayed=accepted.players[0].front[0];
 assert.equal(stayed.uid,baseUid);
 assert.equal(stayed.ready,true);
 assert.deepEqual(stayed.buffs,[]);
 assert.equal(universalAttackDamage(packs,accepted,stayed),1);
 assert.equal(accepted.players[0].outside.some(c=>c.uid===topUid),true);
 assert.equal(accepted.players[0].outside.some(c=>c.uid===pay),true);
 const declined=play(s,a=>a.type==='chooseRaidLeave'&&a.mode==='decline');
 assert.equal(declined.players[0].front[0],null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===topUid),true);
 assert.equal(declined.players[0].outside.some(c=>c.uid===baseUid),true);
 assert.equal(declined.players[0].hand.some(c=>c.uid===pay),true);
 let empty=opened(2474,'BLC-3-008');
 empty.s.players[0].deck.push(...empty.s.players[0].hand.splice(0));
 empty.s=eventAt(empty.s,empty.topUid);
 assert.equal(empty.s.pending,null);
 assert.equal(empty.s.players[0].outside.some(c=>c.uid===empty.topUid),true);
 assert.equal(empty.s.players[0].outside.some(c=>c.uid===empty.baseUid),true);
 let silent=opened(2475,'BLC-3-008');
 const live=find(silent.s,0,silent.topUid);
 grantContinuousState(silent.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:live.uid,targetUid:live.uid,sourceLinked:false,
  until:{player:1,phase:'attack',edge:'end'}});
 silent.s=eventAt(silent.s,silent.topUid);
 assert.equal(silent.s.pending,null);
 assert.equal(silent.s.players[0].outside.some(c=>c.uid===silent.topUid),true);
 let short=opened(2476,'BLC-4-070');
 short.s=eventAt(short.s,short.topUid);
 assert.equal(short.s.pending,null);
 assert.equal(short.s.players[0].outside.some(c=>c.uid===short.topUid),true);
 assert.equal(short.s.players[0].outside.some(c=>c.uid===short.baseUid),true);
 let battle=opened(2477,'BLC-3-008');
 const wall=place(battle.s,1,'BLC-1-083','front',0);
 wall.buffs=[{bp:4000,untilTurn:battle.s.turn}];
 const lives=battle.s.players[1].life.length;
 battle.s=phase(battle.s,'attack');
 battle.s=play(battle.s,a=>a.type==='attack'&&a.uid===battle.topUid);
 battle.s=play(battle.s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.s.pending.kind,'effect-raid-leave');
 assert.equal(battle.s.pending.by,'battle');
 assert.equal(battle.s.pending.postImpact,false);
 assert.equal(battle.s.players[1].life.length,lives);
});

test('BLC-1-085 rests one front, upgrades at six other Squad cards, and releases before refresh',()=>{
 function board(seed,extra){
  let s=phase(fresh(seed),'main');
  fuel(s);
  place(s,0,'BLC-1-072','energy',2);
  place(s,0,'BLC-2-069','energy',3);
  place(s,0,'BLC-4-066','front',1);
  if(extra)place(s,0,'BLC-4-070','front',2);
  const base=place(s,0,'BLC-1-083','front',0);
  const foe=place(s,1,'BLC-1-083','front',0);
  const energy=place(s,1,'BLC-1-072','energy',0,true);
  const top=hold(s,0,'BLC-1-085');
  s=play(s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
  return {s,foeUid:foe.uid,energyUid:energy.uid,topUid:top.uid};
 }
 let skipped=board(2485,false);
 assert.equal(skipped.s.pending.kind,'effect-rest-lock');
 aiOk(skipped.s);
 skipped.s=play(skipped.s,a=>a.type==='chooseRestLock'&&a.uid===null);
 assert.equal(skipped.s.pending,null);
 assert.equal(find(skipped.s,1,skipped.foeUid).ready,true);
 assert.equal(skipped.s.continuousStates.length,0);
 let few=board(2486,false);
 few.s=play(few.s,a=>a.type==='chooseRestLock'&&a.uid===few.foeUid);
 const locked=find(few.s,1,few.foeUid);
 assert.equal(locked.ready,false);
 assert.equal(find(few.s,1,few.energyUid).ready,true);
 assert.equal(few.s.continuousStates.length,1);
 assert.equal(few.s.continuousStates[0].kind,'cannotActive');
 assert.equal(few.s.continuousStates[0].releaseBeforeRefresh,true);
 assert.deepEqual(few.s.continuousStates[0].until,{player:1,phase:'attack',edge:'end'});
 let many=board(2487,true);
 many.s=play(many.s,a=>a.type==='chooseRestLock'&&a.uid===many.foeUid);
 assert.equal(find(many.s,1,many.foeUid).ready,false);
 assert.equal(find(many.s,1,many.energyUid).ready,false);
 assert.equal(many.s.continuousStates.length,2);
 assert.equal(many.s.continuousStates.every(e=>e.kind==='cannotActive'&&e.releaseBeforeRefresh===true),true);
 let none=phase(fresh(2488),'main');
 fuel(none);
 for(const [id,line,slot] of [['BLC-1-072','energy',2],['BLC-2-069','energy',3],['BLC-4-066','front',1],['BLC-4-070','front',2],['BLC-1-072','front',3]])
  place(none,0,id,line,slot);
 const buried=place(none,0,'BLC-1-083','front',0);
 const idle=place(none,1,'BLC-1-072','energy',0);
 const hitter=hold(none,0,'BLC-1-085');
 none=play(none,a=>a.type==='raid'&&a.uid===hitter.uid&&a.baseUid===buried.uid);
 assert.equal(none.pending,null);
 assert.equal(find(none,1,idle.uid).ready,true);
 few.s=phase(few.s,'attack');
 few.s=play(few.s,a=>a.type==='next');
 assert.equal(few.s.active,1);
 assert.equal(few.s.phase,'start');
 assert.equal(find(few.s,1,few.foeUid).ready,false);
 few.s=phase(few.s,'attack');
 assert.equal(find(few.s,1,few.foeUid).ready,false);
 few.s=play(few.s,a=>a.type==='next');
 assert.equal(few.s.active,0);
 assert.equal(find(few.s,1,few.foeUid).ready,true);
 assert.equal(few.s.continuousStates.some(e=>e.kind==='cannotActive'),false);
});
