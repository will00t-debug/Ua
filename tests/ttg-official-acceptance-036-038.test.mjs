import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {ttgExecutableActions,ttgActionLabel} from '../dist/ttg-browser.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';

// Japanese official, three distinct FINAL events with identical printed text:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-036
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-037
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-038
// All cost green 3 AP 1, ready UP TO TWO physical own AP tokens; FINAL can be declined (Q99).
const counts=Object.fromEntries([
 ...['004','005','006','009','012','027','029','030','031','032','034'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-037',1],['TTG-1-038',2],['TTG-1-011',2]
]);
function game(seed){
 const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(pl,id){
 for(const zone of ['hand','deck','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }throw Error('Missing '+id);
}
function put(s,id,line='energy',slot=0){
 const c=take(s.players[0],id);c.ready=true;s.players[0][line][slot]=c;return c;
}
function setup(id,seed){
 let s=game(seed),p=s.players[0];
 const card=take(p,id);p.hand.push(card);
 const producer=put(s,'TTG-1-005','energy',0);
 producer.energyBonus=2; // 3 green exactly, 3-green printed event is affordable.
 s=withTtgDerivedEnergy(s,0);
 return {s,card};
}
for(const [id,seed] of [['TTG-1-036',3601],['TTG-1-037',3701],['TTG-1-038',3801]]){
 test(id+' normal event: human chooses physical AP payment and up to two OWN AP to ACTIVE, UID conserved',()=>{
  let {s,card}=setup(id,seed);
  assert.equal(TTG_BY_ID[id].trigger,'final');
  assert.equal(TTG_BY_ID[id].energy,3);
  assert.equal(TTG_BY_ID[id].ap,1);
  const ap=s.players[0].apCards.map(x=>x.uid);
  const other=s.players[1].apCards.map(x=>x.ready);
  const alternatives=ttgExecutableActions(s).filter(a=>a.type==='playTtgEvent'&&a.handUid===card.uid);
  assert.ok(alternatives.some(a=>a.payApUids[0]===ap[0]));
  assert.ok(alternatives.some(a=>a.payApUids[0]===ap[1]));
  const chosen=alternatives.find(a=>a.payApUids[0]===ap[0]&&
   a.readyApUids.length===2&&a.readyApUids.includes(ap[0])&&a.readyApUids.includes(ap[2]));
  assert.ok(chosen,'pay the chosen AP; ready it again plus AP3, not always first exhausted token');
  assert.match(ttgActionLabel(s,chosen),/AP/);
  s=dispatchTtgCoreAction(s,chosen);
  assert.deepEqual(s.players[0].apCards.map(x=>x.ready),[true,true,true]);
  assert.deepEqual(s.players[1].apCards.map(x=>x.ready),other);
  assert.ok(s.players[0].outside.some(x=>x.uid===card.uid));
  assert.ok(!s.players[0].hand.some(x=>x.uid===card.uid));
  assert.ok(assertTtgCoreState(s));
 });
}
test('036-038 AP event may select ZERO AP to ready, while the chosen AP cost is still paid',()=>{
 let {s,card}=setup('TTG-1-036',3602);
 const choice=ttgExecutableActions(s).find(x=>x.type==='playTtgEvent'&&x.handUid===card.uid&&
  x.payApUids?.[0]===s.players[0].apCards[1].uid&&x.readyApUids?.length===0);
 assert.ok(choice);
 const after=dispatchTtgCoreAction(s,choice);
 assert.equal(after.players[0].apCards[1].ready,false);
 assert.equal(after.players[0].apCards[0].ready,true);
 assert.equal(after.players[0].apCards[2].ready,false);
 assert.ok(assertTtgCoreState(after));
});
test('036-038 illegal AP recovery: enemy AP, duplicate AP, or REST AP payment leaves original unchanged',()=>{
 const {s,card}=setup('TTG-1-037',3702),p=s.players[0],enemy=s.players[1];
 const before=JSON.stringify(s),base={type:'playTtgEvent',player:0,handUid:card.uid,cardId:card.cardId};
 assert.throws(()=>dispatchTtgCoreAction(s,{...base,payApUids:[p.apCards[0].uid],readyApUids:[enemy.apCards[0].uid]}));
 assert.throws(()=>dispatchTtgCoreAction(s,{...base,payApUids:[p.apCards[0].uid],readyApUids:[p.apCards[0].uid,p.apCards[0].uid]}));
 assert.throws(()=>dispatchTtgCoreAction(s,{...base,payApUids:[p.apCards[2].uid],readyApUids:[p.apCards[2].uid]}));
 assert.equal(JSON.stringify(s),before);
});
for(const [id,seed] of [['TTG-1-036',3603],['TTG-1-037',3703],['TTG-1-038',3803]]){
 test(id+' FINAL life at last health: player may rescue one real deck card or DECLINE and lose',()=>{
  let {s,card}=setup(id,seed),p=s.players[0];
  p.hand.splice(p.hand.findIndex(x=>x.uid===card.uid),1);
  p.outside.push(...p.life.splice(1));
  const prior=p.life.shift();
  p.deck.push(prior);p.life.unshift(card);
  s=withTtgDerivedEnergy(s,0);
  const reveal=beginTtgLifeTrigger(s,{player:0,lifeUid:card.uid});
  assert.equal(reveal.players[0].life.length,0);
  assert.equal(reveal.pendingTtgLife?.trigger,'final');
  assert.ok(legalTtgCoreActions(reveal).some(x=>x.mode==='final'));
  assert.ok(legalTtgCoreActions(reveal).some(x=>x.mode==='decline'));
  const saved=dispatchTtgCoreAction(reveal,legalTtgCoreActions(reveal).find(x=>x.mode==='final'));
  assert.equal(saved.players[0].life.length,1);
  assert.equal(saved.status,'playing');
  assert.equal(saved.publicLifeReveals.at(-1).outcome,'activated');
  const declined=dispatchTtgCoreAction(reveal,legalTtgCoreActions(reveal).find(x=>x.mode==='decline'));
  assert.equal(declined.status,'finished');
  assert.equal(declined.winner,1);
  assert.equal(declined.publicLifeReveals.at(-1).outcome,'declined');
  assert.ok(assertTtgCoreState(saved));assert.ok(assertTtgCoreState(declined));
 });
}
