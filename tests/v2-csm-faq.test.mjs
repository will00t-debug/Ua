import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {csmEventUseCount,csmAlsoEventAuraLive,csmCardCountsAsEvent,csmOnlyRezeHighBp,
 csmBp}
 from '../dist/universal-v2/csm-continuous.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {appendCompletedMove} from '../dist/universal-v2/zone-move-events.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp}
 from '../dist/universal-v2/engine.mjs';
import {runCsmJob} from '../dist/universal-v2/csm-runtime.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];
const printed=(p,c)=>pack.cards[c.cardId];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||''));
 return use(s,action);
}
function fuel(s){
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}

test('Q2073 Denji main is name-once across copies',()=>{
 const counts=countsFor(['CSM-1-007','CSM-1-022','CSM-1-036','CSM-1-038','CSM-1-008']);
 let s=toPhase(fresh(counts,2073),'main');
 readyAp(s);fuel(s);dumpHand(s);
 put(s,0,'CSM-1-022','front',0);
 const first=put(s,0,'CSM-1-007','front',1,false);
 const second=put(s,0,'CSM-1-007','front',2,false);
 const ev1=take(s,0,'CSM-1-036');
 const ev2=take(s,0,'CSM-1-038');
 s.players[0].outside.push(ev1,ev2);
 appendCompletedMove(s,{uid:ev1.uid,cardId:ev1.cardId,owner:0,controller:0,
  from:'hand',to:'outside',reason:'rule'});
 appendCompletedMove(s,{uid:ev2.uid,cardId:ev2.cardId,owner:0,controller:0,
  from:'hand',to:'outside',reason:'rule'});
 assert.equal(csmEventUseCount(s,0,c=>printed(pack,c))>=2,true);
 const acts=legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&
  (a.uid===first.uid||a.uid===second.uid));
 assert.ok(acts.length>=1);
 s=use(s,acts[0]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&
  (a.uid===first.uid||a.uid===second.uid)&&a.mode==='csm:0'),false);
 assertUniversalMatch(packs,s);
});

test('Q2077/Q2078 Bomb alias counts as Reze for the high-BP gate',()=>{
 const counts=countsFor(['CSM-1-016','CSM-1-017','CSM-1-001','CSM-1-024','CSM-1-008']);
 let s=toPhase(fresh(counts,2077),'main');
 put(s,0,'CSM-1-017','front',0);
 assert.equal(csmOnlyRezeHighBp(pack,s,0,printed,c=>universalBp(packs,s,c)),true);
 put(s,0,'CSM-1-001','front',1); // BP 2000 — below 4000
 assert.equal(csmOnlyRezeHighBp(pack,s,0,printed,c=>universalBp(packs,s,c)),true);
 put(s,0,'CSM-1-024','energy',0); // Makima BP 4000, not Reze
 assert.equal(csmOnlyRezeHighBp(pack,s,0,printed,c=>universalBp(packs,s,c)),false);
 assertUniversalMatch(packs,s);
});

test('Q2079 / Q2080 Makima alsoEvent is not retroactive',()=>{
 const counts=countsFor(['CSM-1-022','CSM-1-024','CSM-1-001','CSM-1-004','CSM-1-008']);
 let s=toPhase(fresh(counts,2080),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const purple=toHand(s,0,'CSM-1-001');
 s=play(s,purple.uid);
 assert.equal(csmEventUseCount(s,0,c=>printed(pack,c)),0);
 const makima=toHand(s,0,'CSM-1-024');
 s=play(s,makima.uid);
 if(s.pending?.kind==='csm')s=choose(s,a=>a.mode==='draw');
 assert.equal(csmAlsoEventAuraLive(s,0,c=>printed(pack,c)),true);
 assert.equal(csmEventUseCount(s,0,c=>printed(pack,c)),0);
 assert.equal(csmCardCountsAsEvent(s,0,pack.cards['CSM-1-001'],c=>printed(pack,c)),true);
 assertUniversalMatch(packs,s);
});

test('Q2081 next event AP discount survives a non-matching play',()=>{
 assert.equal(pack.cards['CSM-1-024'].effects.onPlay.some(e=>
  e.op==='nextEligibleHandPlayApDiscount'),true);
 const filter=pack.cards['CSM-1-024'].effects.onPlay.find(e=>
  e.op==='nextEligibleHandPlayApDiscount').filter;
 assert.equal(filter.cardType,'event');
 assert.equal(filter.noSpecialFinal,true);
});

test('Q2084 Reze AP branch is name-once; debuff branch is free',()=>{
 const counts=countsFor(['CSM-1-031','CSM-1-006','CSM-1-008','CSM-1-001']);
 let s=toPhase(fresh(counts,2084),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const denji=put(s,0,'CSM-1-006','front',1);
 s.players[0].front[1]=null;
 s.players[0].outside.push(denji);
 appendCompletedMove(s,{uid:denji.uid,cardId:denji.cardId,owner:0,controller:0,
  from:'front',to:'outside',reason:'retirement'});
 const reze=toHand(s,0,'CSM-1-031');
 s=play(s,reze.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.ok(s.pending.actions.some(a=>a.mode==='ap'));
 s=choose(s,a=>a.mode==='ap');
 if(s.pending?.step==='ap')s=choose(s,a=>true);
 const again=toHand(s,0,'CSM-1-031');
 s=play(s,again.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.equal(s.pending.actions.some(a=>a.mode==='ap'),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='debuff'),true);
 assertUniversalMatch(packs,s);
});

test('Q2098 frontForbidden blocks energy-to-front moves for Pochita',()=>{
 assert.equal(pack.cards['CSM-1-067'].frontForbidden,true);
});

test('Raid-box gates CSM-1-017 main and leaves 024 onPlay live',()=>{
 assert.equal(raidBoxListed('CSM-1-017','main'),true);
 assert.equal(raidBoxListed('CSM-1-048','attackEnd'),true);
 assert.equal(raidBoxListed('CSM-1-024','onPlay'),false);
 assert.equal(raidBoxListed('CSM-1-024','passive'),false);
});

test('Q2075 Power BP+1000 turns on when Makima arrives after an event',()=>{
 const counts=countsFor(['CSM-1-010','CSM-1-022','CSM-1-036','CSM-1-008']);
 let s=toPhase(fresh(counts,2075),'main');
 assert.equal(s.active,0);
 const power=put(s,0,'CSM-1-010','front',0);
 const ev=take(s,0,'CSM-1-036');
 s.players[0].outside.push(ev);
 appendCompletedMove(s,{uid:ev.uid,cardId:ev.cardId,owner:0,controller:0,
  from:'hand',to:'outside',reason:'rule'});
 assert.equal(csmBp(pack,s,power,pack.cards['CSM-1-010'],false,0,printed),0);
 put(s,0,'CSM-1-022','front',1);
 assert.equal(csmBp(pack,s,power,pack.cards['CSM-1-010'],false,0,printed),1000);
 assert.equal(universalBp(packs,s,power),pack.cards['CSM-1-010'].bp+1000);
 assertUniversalMatch(packs,s);
});

function buryRaid(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const deck=s.players[p].deck;
 if(!deck.length)throw Error('No deck card to bury under '+card.cardId);
 const under=deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function tuckFacedown(s,p,host,id){
 const card=take(s,p,id);
 card.faceDown=true;card.ready=false;card.fieldEntryStamp=null;
 host.under??=[];host.under.push(card);
 return card;
}

test('Q2093/Q2094 CSM-1-061 leaveReplace accept retires the substitute',()=>{
 const counts=countsFor(['CSM-1-061','CSM-1-030','CSM-1-024','CSM-1-008','CSM-1-001']);
 let s=toPhase(fresh(counts,2093),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const power=buryRaid(s,0,put(s,0,'CSM-1-061','front',0));
 const sub=put(s,0,'CSM-1-024','front',1);
 const reze=toHand(s,0,'CSM-1-030');
 s=play(s,reze.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.equal(s.pending?.step,'retireThenChoose');
 s=choose(s,a=>a.mode==='pick'&&a.uid===power.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.equal(s.pending?.step,'leaveReplace');
 assert.ok(s.pending.actions.some(a=>a.mode==='pick'&&a.uid===sub.uid));
 assert.ok(s.pending.actions.some(a=>a.mode==='skip'));
 s=choose(s,a=>a.mode==='pick'&&a.uid===sub.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===power.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===sub.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===sub.uid));
 assertUniversalMatch(packs,s);
});

test('Q2093 CSM-1-061 leaveReplace skip resumes the original retirement',()=>{
 const counts=countsFor(['CSM-1-061','CSM-1-030','CSM-1-024','CSM-1-008','CSM-1-001']);
 let s=toPhase(fresh(counts,2094),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const power=buryRaid(s,0,put(s,0,'CSM-1-061','front',0));
 put(s,0,'CSM-1-024','front',1);
 const reze=toHand(s,0,'CSM-1-030');
 s=play(s,reze.uid);
 s=choose(s,a=>a.mode==='pick'&&a.uid===power.uid);
 assert.equal(s.pending?.step,'leaveReplace');
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.players[0].front.some(c=>c?.uid===power.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===power.uid));
 assertUniversalMatch(packs,s);
});

test('Q2082 Café「二道」 deploy from 028 is energy-only',()=>{
 const counts=countsFor(['CSM-1-028','CSM-1-033','CSM-1-008','CSM-1-001','CSM-1-006']);
 let s=toPhase(fresh(counts,2082),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const cafe=toHand(s,0,'CSM-1-033');
 const host=toHand(s,0,'CSM-1-028');
 s=play(s,host.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.equal(s.pending?.step,'deploy');
 const cafeActs=s.pending.actions.filter(a=>a.mode==='deploy'&&a.uid===cafe.uid);
 assert.ok(cafeActs.length>0);
 assert.equal(cafeActs.every(a=>a.line==='energy'),true);
 assert.equal(cafeActs.some(a=>a.line==='front'),false);
 assertUniversalMatch(packs,s);
});

test('Q2098 066 onRetire excludes frontForbidden Pochita from energy→front',()=>{
 // Avoid pairing two color-trigger cards (030+067) in the same 50-card build.
 const counts=countsFor(['CSM-1-066','CSM-1-067','CSM-1-008','CSM-1-006']);
 let s=toPhase(fresh(counts,2098),'main');
 dumpHand(s);
 const himeno=put(s,0,'CSM-1-066','front',0);
 const pochita=put(s,0,'CSM-1-067','energy',0);
 const other=put(s,0,'CSM-1-006','energy',1);
 legalUniversalActions(packs,s);
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-066',slot:'onRetire',owner:0,sourceUid:himeno.uid});
 assert.equal(s.pending?.step,'buffMoveFront');
 assert.equal(s.pending.actions.some(a=>a.uid===pochita.uid),false);
 assert.ok(s.pending.actions.some(a=>a.uid===other.uid));
 assertUniversalMatch(packs,s);
});

test('Q2095 066 full-front move asks for replaceUid',()=>{
 const counts=countsFor(['CSM-1-066','CSM-1-006','CSM-1-008','CSM-1-001','CSM-1-002',
  'CSM-1-003']);
 let s=toPhase(fresh(counts,2095),'main');
 dumpHand(s);
 const himeno=put(s,0,'CSM-1-066','energy',0);
 const mover=put(s,0,'CSM-1-006','energy',1);
 const victims=[put(s,0,'CSM-1-001','front',0),put(s,0,'CSM-1-002','front',1),
  put(s,0,'CSM-1-003','front',2),put(s,0,'CSM-1-008','front',3)];
 legalUniversalActions(packs,s);
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-066',slot:'onRetire',owner:0,sourceUid:himeno.uid});
 assert.equal(s.pending?.step,'buffMoveFront');
 s=choose(s,a=>a.mode==='pick'&&a.uid===mover.uid);
 assert.equal(s.pending?.step,'moveFront');
 assert.ok(s.pending.actions.every(a=>a.mode==='move'&&a.replaceUid));
 assert.ok(s.pending.actions.some(a=>a.replaceUid===victims[0].uid));
 s=choose(s,a=>a.replaceUid===victims[0].uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===mover.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===victims[0].uid),false);
 assertUniversalMatch(packs,s);
});

test('Q2077/Q2078 017 reze branch retires then optional BP-5000',()=>{
 // 017 is energy 5; seat it with put + runCsmJob rather than paying from a 4-slot line.
 const counts=countsFor(['CSM-1-017','CSM-1-006','CSM-1-008','CSM-1-001']);
 let s=toPhase(fresh(counts,2078),'main');
 dumpHand(s);
 const bomb=put(s,0,'CSM-1-017','front',1);
 const ally=put(s,0,'CSM-1-006','front',0);
 const foe=put(s,1,'CSM-1-001','front',0);
 legalUniversalActions(packs,s);
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-017',slot:'onPlay',owner:0,sourceUid:bomb.uid});
 assert.equal(s.pending?.step,'choose');
 assert.ok(s.pending.actions.some(a=>a.mode==='reze'));
 s=choose(s,a=>a.mode==='reze');
 assert.equal(s.pending?.step,'retireThenDebuff5k');
 s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
 assert.equal(s.pending?.id,'CSM-1-006');
 assert.deepEqual(s.pending.actions.map(a=>a.mode).sort(),['draw','look']);
 s=choose(s,a=>a.mode==='draw');
 assert.equal(s.pending?.step,'debuff5k');
 s=choose(s,a=>a.mode==='pick'&&a.uid===foe.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===foe.uid),false,
  'BP below zero must retire instead of staying on the board');
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===ally.uid));
 assertUniversalMatch(packs,s);
});

for(const [targetId,printedBp] of [['CSM-1-007',4000],['CSM-1-048',5000]]){
 test('CSM-1-017 BP-5000 retires a '+printedBp+' BP target (official Q94)',()=>{
  const counts=countsFor(['CSM-1-017','CSM-1-006','CSM-1-008','CSM-1-001',targetId]);
  let s=toPhase(fresh(counts,5000+printedBp),'main');
  dumpHand(s);
  const bomb=put(s,0,'CSM-1-017','front',1);
  const ally=put(s,0,'CSM-1-006','front',0);
  const foe=put(s,1,targetId,'front',0);
  assert.equal(universalBp(packs,s,foe),printedBp);
  legalUniversalActions(packs,s);
  runCsmJob(pack,s,{op:'csm',id:'CSM-1-017',slot:'onPlay',owner:0,sourceUid:bomb.uid});
  s=choose(s,a=>a.mode==='reze');
  s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
  assert.equal(s.pending?.id,'CSM-1-006');
  s=choose(s,a=>a.mode==='draw');
  s=choose(s,a=>a.mode==='pick'&&a.uid===foe.uid);
  assert.equal(s.players[1].front[0],null);
  assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
  assert.ok(s.players[0].outside.some(c=>c.uid===ally.uid));
  assertUniversalMatch(packs,s);
 });
}

test('CSM-1-017 BP-5000 keeps a target that still has positive effective BP',()=>{
 const counts=countsFor(['CSM-1-017','CSM-1-006','CSM-1-008','CSM-1-001','CSM-1-007']);
 let s=toPhase(fresh(counts,5061),'main');
 dumpHand(s);
 const bomb=put(s,0,'CSM-1-017','front',1);
 const ally=put(s,0,'CSM-1-006','front',0);
 const foe=put(s,1,'CSM-1-007','front',0);
 foe.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,foe),6000);
 legalUniversalActions(packs,s);
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-017',slot:'onPlay',owner:0,sourceUid:bomb.uid});
 s=choose(s,a=>a.mode==='reze');
 s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
 assert.equal(s.pending?.id,'CSM-1-006');
 s=choose(s,a=>a.mode==='draw');
 s=choose(s,a=>a.mode==='pick'&&a.uid===foe.uid);
 assert.equal(s.players[1].front[0]?.uid,foe.uid);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),1000);
 assert.equal(s.players[1].outside.some(c=>c.uid===foe.uid),false);
 assertUniversalMatch(packs,s);
});

test('CSM-1-017 BP-1000 mode retires a 1000 BP target at exactly zero',()=>{
 const counts=countsFor(['CSM-1-017','CSM-1-006','CSM-1-008','CSM-1-003']);
 let s=toPhase(fresh(counts,1000),'main');
 dumpHand(s);
 const bomb=put(s,0,'CSM-1-017','front',0);
 const foe=put(s,1,'CSM-1-003','front',0);
 assert.equal(universalBp(packs,s,foe),1000);
 legalUniversalActions(packs,s);
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-017',slot:'onPlay',owner:0,sourceUid:bomb.uid});
 s=choose(s,a=>a.mode==='debuff');
 s=choose(s,a=>a.mode==='pick'&&a.uid===foe.uid);
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
 assertUniversalMatch(packs,s);
});

test('Q2088/Q2089 048 multi-under peel offers a choice',()=>{
 const counts=countsFor(['CSM-1-048','CSM-1-067','CSM-1-001','CSM-1-008','CSM-1-006',
  'CSM-1-022']);
 let s=toPhase(fresh(counts,2088),'main');
 readyAp(s);fuel(s);dumpHand(s);
 const host=buryRaid(s,0,put(s,0,'CSM-1-048','front',0));
 const first=tuckFacedown(s,0,host,'CSM-1-001');
 const second=tuckFacedown(s,0,host,'CSM-1-067');
 put(s,0,'CSM-1-022','front',1); // ensureCsm via activation scan
 legalUniversalActions(packs,s);
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-048',slot:'attackEnd',owner:0,sourceUid:host.uid});
 assert.equal(s.pending?.step,'peelUnder');
 assert.ok(s.pending.actions.some(a=>a.mode==='peel'&&a.uid===first.uid));
 assert.ok(s.pending.actions.some(a=>a.mode==='peel'&&a.uid===second.uid));
 s=choose(s,a=>a.mode==='peel'&&a.uid===second.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===second.uid)||s.pending?.step==='pochita');
 assert.equal(host.under.some(c=>c.uid===first.uid),true);
 assertUniversalMatch(packs,s);
});
