import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalRed076Raids,resolveRed076Raid,legalRed076Look,resolveRed076Look,legalRed076Main,resolveRed076Main,legalRed076Discard,resolveRed076Discard} from '../dist/ttg-red-twelfth-three.mjs';

// UA56BT/TTG-1-076 official printed English text:
// https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-076
// RAID Simon; on play look top 2, add one, other outside; MAIN rest, draw one/discard one.
const deck=Object.fromEntries([...['042','043','045','046','047','051','059','064','070','072','073'].map(n=>['TTG-1-'+n,4]),['TTG-1-076',4],['TTG-1-036',2]]);
function game(seed){const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});s.phase='main';s.players[0].turnCount=2;return s}
function take(p,id){for(const zone of ['hand','deck','life','outside']){const i=p[zone].findIndex(c=>c.cardId===id);if(i>=0)return p[zone].splice(i,1)[0]}throw Error('Missing '+id)}
function stage(s,id,line,slot){const c=take(s.players[0],id);c.ready=true;s.players[0][line][slot]=c;return c}
function prep(seed){let s=game(seed),p=s.players[0];const simon=stage(s,'TTG-1-051','front',0);const source=stage(s,'TTG-1-042','energy',0);source.energyBonus=3;const lagann=take(p,'TTG-1-076');p.hand.push(lagann);s=withTtgDerivedEnergy(s,0);return {s,simon,lagann}}
test('076 RAID pays a physical AP, moves one of top two to hand and the other outside',()=>{
 let {s,simon,lagann}=prep(7601);
 const a=legalRed076Raids(s,0).find(x=>x.handUid===lagann.uid&&x.baseUid===simon.uid&&x.line==='front');
 assert.ok(a);
 const ap=s.players[0].apCards.find(x=>x.ready).uid;
 s=resolveRed076Raid(s,{...a,payApUids:[ap]});
 assert.equal(s.players[0].front[0].uid,lagann.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,simon.uid);
 assert.equal(s.players[0].apCards.find(x=>x.uid===ap).ready,false);
 assert.equal(s.pending.kind,'ttgRed076Look');
 const [first,second]=s.pending.revealed;
 assert.equal(s.pending.revealed.length,2);
 assert.equal(legalRed076Look(s).length,2);
 const chosen=legalRed076Look(s).find(x=>x.takeUid===second);
 s=resolveRed076Look(s,chosen);
 assert.ok(s.players[0].hand.some(x=>x.uid===second));
 assert.ok(s.players[0].outside.some(x=>x.uid===first));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('076 cannot RAID without Simon on own field, or with wrong AP',()=>{
 let {s,simon}=prep(7602);s.players[0].front[0]=null;s.players[0].outside.push(simon);
 assert.equal(legalRed076Raids(s,0).length,0);
 assert.ok(assertTtgCoreState(s));
 let fresh=prep(7603),a=legalRed076Raids(fresh.s,0)[0];
 assert.ok(a);
 assert.throws(()=>resolveRed076Raid(fresh.s,{...a,payApUids:['AP-INVALID']}));
 assert.ok(assertTtgCoreState(fresh.s));
});
test('076 MAIN rests character then requires a real hand discard (including newly drawn card)',()=>{
 let {s,lagann}=prep(7604),p=s.players[0];
 const topUid=p.deck[0].uid;
 const a=legalRed076Raids(s,0).find(x=>x.handUid===lagann.uid&&x.line==='front');
 s=resolveRed076Raid(s,{...a,payApUids:[p.apCards[0].uid]});
 s=resolveRed076Look(s,legalRed076Look(s)[0]);
 // The Raid is ACTIVE on entry. Main effect rests it, draws 1 then mandates discard.
 const m=legalRed076Main(s,0).find(x=>x.uid===lagann.uid);
 assert.ok(m);
 const drawUid=s.players[0].deck[0].uid;
 s=resolveRed076Main(s,m);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.pending.kind,'ttgRed076Discard');
 assert.ok(legalRed076Discard(s).some(x=>x.discardUid===drawUid));
 assert.throws(()=>resolveRed076Discard(s,{type:'ttgRed076Discard',player:0,uid:lagann.uid,discardUid:'bad'}));
 s=resolveRed076Discard(s,legalRed076Discard(s).find(x=>x.discardUid===drawUid));
 assert.ok(s.players[0].outside.some(x=>x.uid===drawUid));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
