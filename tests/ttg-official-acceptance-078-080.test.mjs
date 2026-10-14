import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalTtgHandEvents,dispatchTtgHandEvent} from '../dist/ttg-event-resolver.mjs';
import {legalRed080Events,resolveRed080Event,red080DiscountFor} from '../dist/ttg-red-thirteenth-three.mjs';
import {legalRed076Raids} from '../dist/ttg-red-twelfth-three.mjs';

// Official: UA56BT/TTG-1-078/079 red 3 AP1, recover at most two own AP, FINAL trigger.
// 080 Q2300: retain discount until NEXT eligible hand Raid, ignore unrelated actions.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-080
const deck=Object.fromEntries([...['042','043','045','046','047','051','059','064','070','072','076'].map(n=>['TTG-1-'+n,4]),...['078','079','080'].map(n=>['TTG-1-'+n,2])]);
function start(seed){const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});s.phase='main';s.players[0].turnCount=2;return s}
function take(p,id){for(const z of ['hand','deck','life','outside']){const i=p[z].findIndex(c=>c.cardId===id);if(i!==-1)return p[z].splice(i,1)[0]}throw Error('Missing '+id)}
function place(s,id,line='energy',slot=0){const c=take(s.players[0],id);c.ready=true;s.players[0][line][slot]=c;return c}
for(const id of ['078','079'])test(id+' official event: paid AP may be among two readied, enemy AP illegal',()=>{
 let s=start(7800+Number(id)),p=s.players[0];const power=place(s,'TTG-1-064');power.energyBonus=3;
 const event=take(p,'TTG-1-'+id);p.hand.push(event);s=withTtgDerivedEnergy(s,0);
 const ap=s.players[0].apCards[0].uid,enemy=s.players[1].apCards[0].uid;
 assert.ok(legalTtgHandEvents(s,0).some(x=>x.handUid===event.uid));
 assert.throws(()=>dispatchTtgHandEvent(s,{player:0,handUid:event.uid,payApUids:[ap],readyApUids:[enemy]}));
 s=dispatchTtgHandEvent(s,{player:0,handUid:event.uid,payApUids:[ap],readyApUids:[ap,s.players[0].apCards[1].uid]});
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,true);
 assert.ok(s.players[0].outside.some(x=>x.uid===event.uid));
 assert.ok(assertTtgCoreState(s));
});
test('080 requires own Kamina, pays an AP, recovers only a Lagann/Gurren/Gurren Lagann',()=>{
 let s=start(8001),p=s.players[0];const power=place(s,'TTG-1-064');power.energyBonus=3;
 const event=take(p,'TTG-1-080');p.hand.push(event);
 const recover=take(p,'TTG-1-076');p.outside.push(recover);
 const invalid=take(p,'TTG-1-043');p.outside.push(invalid);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(legalRed080Events(s,0).length,0);
 place(s,'TTG-1-045','front',0);s=withTtgDerivedEnergy(s,0);
 const options=legalRed080Events(s,0).filter(a=>a.handUid===event.uid);
 assert.ok(options.some(a=>a.recoverUid===recover.uid));
 assert.ok(options.some(a=>a.recoverUid===null));
 assert.ok(!options.some(a=>a.recoverUid===invalid.uid));
 const a=options.find(a=>a.recoverUid===recover.uid);
 s=resolveRed080Event(s,{...a,payApUids:[p.apCards[0].uid]});
 assert.ok(s.players[0].hand.some(x=>x.uid===recover.uid));
 assert.equal(s.players[0].red080DiscountUntilTurn,s.turn);
 assert.equal(red080DiscountFor(s,0,recover),1);
 assert.ok(assertTtgCoreState(s));
});
test('080 discount remains for next eligible hand Raid, not for unrelated Simon',()=>{
 let s=start(8002),p=s.players[0];const power=place(s,'TTG-1-064');power.energyBonus=3;
 place(s,'TTG-1-045','front',1);const simon=place(s,'TTG-1-051','front',0);
 const event=take(p,'TTG-1-080');p.hand.push(event);
 const lagann=take(p,'TTG-1-076');p.outside.push(lagann);
 s=withTtgDerivedEnergy(s,0);
 const a=legalRed080Events(s,0).find(x=>x.recoverUid===lagann.uid);
 assert.ok(a);
 s=resolveRed080Event(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(red080DiscountFor(s,0,simon),0);
 const raids=legalRed076Raids(s,0);
 assert.ok(raids.some(x=>x.handUid===lagann.uid&&x.baseUid===simon.uid&&x.requiredAp===0));
 assert.equal(s.players[0].red080DiscountUntilTurn,s.turn);
 assert.ok(assertTtgCoreState(s));
});
