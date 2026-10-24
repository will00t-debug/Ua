import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {UA54BT_VERIFIED} from '../dist/universal-v2/sources/mst-catalog.mjs';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {MST_V2_PILOT_IDS,mstV2Pack,verifiedMstV2Cards}
 from '../dist/universal-v2/mst-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';

const pack=mstV2Pack();
function deck50(){
 // Source-pinned physical fixture: newly ported IDs MUST NOT eject the
 // original STEP 047 / energy 029 / discard 022 / peek 069 test subjects.
 const ids=[
  'MST-1-001','MST-1-002','MST-1-010','MST-1-012','MST-1-017',
  'MST-1-018','MST-1-019','MST-1-020','MST-1-022','MST-1-027',
  'MST-1-029','MST-1-047','MST-1-069'
 ];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));counts[ids.at(-1)]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const deck=deck50();
const fresh=(counts=deck)=>newUniversalMatch(pack,{decks:[counts,counts],seed:251016,first:0});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const ix=s.players[p][zone].findIndex(c=>c.cardId===id);
  if(ix>=0)return s.players[p][zone].splice(ix,1)[0];
 }
 throw Error('Missing true MST physical card '+id);
}
function action(s,predicate){
 const a=legalUniversalActions(pack,s).find(predicate);
 assert.ok(a,'No matching legal action in phase '+s.phase+' pending '+s.pending?.kind);
 return a;
}
function toMain(s){for(let i=0;i<2;i++)s=dispatchUniversalAction(pack,s,{type:'next'});return s;}
function deckWith(id){const d={...deck};d['MST-1-001']--;d[id]=(d[id]||0)+1;
 assert.deepEqual(validateUniversalDeck(pack,d),[]);return d;}
test('MST source preserves exactly 001–080 Japanese printed regular IDs, and 41 only are V2 allowed',()=>{
 assert.equal(UA54BT_VERIFIED.length,80);
 assert.equal(Object.keys(UA54BT_OFFICIAL_PRINT).length,80);
 for(let n=1;n<=80;n++){
  const id='MST-1-'+String(n).padStart(3,'0');
  assert.equal(UA54BT_VERIFIED[n-1].id,id);
  assert.equal(UA54BT_VERIFIED[n-1].verified,true);
  assert.ok(UA54BT_OFFICIAL_PRINT[id].effectJa);
  assert.equal(UA54BT_OFFICIAL_PRINT[id].source.includes('UA54BT%2F'),true);
 }
 assert.equal(MST_V2_PILOT_IDS.length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.equal(verifiedMstV2Cards().length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.equal(pack.cards['MST-1-051'].maxCopies,1,'2026-10-01 official restricted limit');
 assert.ok(!pack.cards['MST-1-068'],'two-mode conditional Raid is unported');
 assert.ok(!validateUniversalDeck(pack,{...deck,'MST-1-051':1}).join().includes('Unregistered'));
 assert.match(validateUniversalDeck(pack,{...deck,'MST-1-051':2}).join(),/0–1 copies/);
 for(const id of MST_V2_PILOT_IDS){
  const original=UA54BT_OFFICIAL_PRINT[id],card=pack.cards[id];
  for(const field of ['energy','ap','bp','gen','type','trigger'])
   assert.equal(card[field],original[field],id+' mismatch '+field);
 }
});
test('MST paid ordinary entry produces a real pending discard, spent AP and physical conservation',()=>{
 let s=fresh(),unit=take(s,0,'MST-1-022');s.players[0].hand.push(unit);
 s=toMain(s);const n=s.players[0].deck.length,prior=structuredClone(s);
 const play=action(s,a=>a.type==='play'&&a.uid===unit.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction(pack,s,play);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,n-1);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,0);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseDiscard',uid:'forged'}),/not currently legal/);
 const discard=action(s,a=>a.type==='chooseDiscard');
 const next=dispatchUniversalAction(pack,s,discard);
 assert.ok(next.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(next.pending,null);
 assert.equal(prior.players[0].front[0],null);
 assert.equal(assertUniversalMatch(pack,next),true);
});
test('MST 012 on-attack paid discard resolves before blocking and cannot borrow enemy hand',()=>{
 let s=fresh(),unit=take(s,0,'MST-1-012');
 unit.ready=true;s.players[0].front[0]=unit;
 for(let i=0;i<3;i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'attack');
 const start=s.players[0].deck.length;
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='attack'&&a.uid===unit.uid));
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,start-1);
 assert.equal(s.pending?.player,0);
 const done=dispatchUniversalAction(pack,s,action(s,a=>a.type==='chooseDiscard'));
 assert.equal(done.pending?.kind,'block');
 assert.equal(done.pending?.player,1);
 assert.equal(assertUniversalMatch(pack,done),true);
});
test('MST 019 targets only own printed energy<=1 unit and a legal choice moves that UID to hand',()=>{
 let s=fresh(),low=take(s,0,'MST-1-020'),producer=take(s,0,'MST-1-017'),
  source=take(s,0,'MST-1-019');
 s.players[0].front[0]=low;s.players[0].energy[0]=producer;
 s.players[0].hand.push(source);s=toMain(s);
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===1));
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.ok(legalUniversalActions(pack,s).some(a=>a.type==='chooseOwnBounce'&&a.uid===low.uid));
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.uid===source.uid));
 const resolved=dispatchUniversalAction(pack,s,{type:'chooseOwnBounce',uid:low.uid});
 assert.ok(resolved.players[0].hand.some(c=>c.uid===low.uid));
 assert.equal(resolved.players[0].front[0],null);
 assert.equal(assertUniversalMatch(pack,resolved),true);
});
test('MST 029 only gains printed extra energy when ACTIVE, STEP 047 consumes movement',()=>{
 let s=fresh(),source=take(s,0,'MST-1-029'),step=take(s,0,'MST-1-047');
 s.players[0].energy[0]=source;s.players[0].front[0]=step;
 source.ready=false;
 assert.equal(universalEnergyByColor(pack,s,0).blue,1);
 source.ready=true;
 assert.equal(universalEnergyByColor(pack,s,0).blue,2);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 const a=action(s,a=>a.type==='step'&&a.uid===step.uid&&a.slot===1);
 const next=dispatchUniversalAction(pack,s,a);
 assert.equal(next.players[0].energy[1].uid,step.uid);
 assert.ok(!legalUniversalActions(pack,next).some(a=>a.type==='move'&&a.uid===step.uid));
 assert.equal(assertUniversalMatch(pack,next),true);
});
test('MST 034 pays event AP before recovering; can decline remaining AP recovery',()=>{
 let s=fresh(deckWith('MST-1-034')),ev=take(s,0,'MST-1-034');
 s.players[0].hand.push(ev);
 for(let n=0;n<3;n++)s.players[0].energy[n]=take(s,0,'MST-1-001');
 s=toMain(s);
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='event'&&a.uid===ev.uid));
 assert.equal(s.pending?.kind,'effect-recover-ap');
 assert.ok(s.players[0].outside.some(c=>c.uid===ev.uid));
 const ready=action(s,a=>a.type==='chooseApRecovery'&&a.uid!==null);
 s=dispatchUniversalAction(pack,s,ready);
 assert.ok(s.players[0].apCards.some(c=>c.uid===ready.uid&&c.ready));
 assert.equal(s.pending,null,'only one AP is in play on turn one, so recovery ends');
 assert.equal(assertUniversalMatch(pack,s),true);
 // A separate legal branch permits declining the recovery entirely.
 let declined=fresh(deckWith('MST-1-034')),event=take(declined,0,'MST-1-034');
 declined.players[0].hand.push(event);
 for(let n=0;n<3;n++)declined.players[0].energy[n]=take(declined,0,'MST-1-001');
 declined=toMain(declined);
 declined=dispatchUniversalAction(pack,declined,action(declined,a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(declined.pending?.kind,'effect-recover-ap');
 declined=dispatchUniversalAction(pack,declined,{type:'chooseApRecovery',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(pack,declined),true);
});
test('MST 069 private peek allows top or outside without any exposed opponent hand',()=>{
 let s=fresh(deckWith('MST-1-069')),c=take(s,0,'MST-1-069');
 s.players[0].hand.push(c);s=toMain(s);
 const n=s.players[0].deck.length;
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='play'&&a.uid===c.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'private-top-choice');
 assert.deepEqual(legalUniversalActions(pack,s).map(a=>a.mode).sort(),['outside','top']);
 const first=s.players[0].deck[0].uid;
 const result=dispatchUniversalAction(pack,s,{type:'chooseTopCard',mode:'outside'});
 assert.equal(result.players[0].deck.length,n-1);
 assert.ok(result.players[0].outside.some(x=>x.uid===first));
 assert.equal(assertUniversalMatch(pack,result),true);
});
