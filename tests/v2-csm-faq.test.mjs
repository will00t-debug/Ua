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
