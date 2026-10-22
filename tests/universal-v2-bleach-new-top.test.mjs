import {EXPECTED_V2_COUNTS,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition,createBleachV2Pack}
 from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('bleach'),solo=createBleachV2Pack(),packs=[pack,pack];
const purple={...BLEACH_PURPLE_V2_PILOT_COUNTS,'BLC-2-055':4};
delete purple['BLC-1-039'];
const yellows=['BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021',
 'BLC-1-001','BLC-1-017','BLC-1-010','BLC-4-014','BLC-1-008',
 'BLC-2-008','BLC-1-013','BLC-4-013'];
const yellow={...Object.fromEntries(yellows.map(id=>[id,4])),'BLC-1-029':2};
const fresh=(counts,seed=2055)=>newUniversalMatch(packs,{
 decks:[{...counts},{...counts}],seed,first:0
});
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[0][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing real printed card '+id);
}
function setup(counts,id,energyId,seed){
 let s=fresh(counts,seed),source=take(s,id);
 s.players[0].hand.push(source);
 if(energyId){const maker=take(s,energyId);maker.ready=true;s.players[0].energy[0]=maker;}
 for(let i=0;i<3&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'real cost/AP supports playing '+id);
 return {s,play,source};
}
test('new top batch preserves official profiles / 88 real V2 identities with no extra life Trigger',()=>{
 assert.equal(contribution.entries.length,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.deepEqual(validateUniversalDeck(pack,purple),[]);
 assert.deepEqual(validateUniversalDeck(pack,yellow),[]);
 assert.equal(Object.values(yellow).reduce((n,v)=>n+v,0),50);
 for(const [id,kind,effect] of [
  ['BLC-2-055','peekTopOrBottom',[{op:'peekTopOrBottom'}]],
  ['BLC-4-013','inspectTopAnyOutside2',[{op:'inspectTopAnyOutside',count:2,rest:'top'}]]
 ]){
  const p=BLEACH_V2_ADDON_PROFILES.find(c=>c.id===id),
   c=CARDS.find(c=>c.identity===id),entry=contribution.entries.find(c=>c.id===id);
  assert.ok(p&&c&&entry);
  assert.equal(p.kind,kind);
  assert.equal(c.effect,p.effect);
  assert.equal(c.trigger,null);
  assert.equal(pack.cards[id].trigger,null);
  assert.deepEqual(pack.cards[id].effects.onPlay,effect);
  assert.deepEqual(pack.cards[id],solo.cards[id]);
  assert.equal(entry.sourceRecord.number,p.number);
  assert.ok(entry.evidence.testFiles.includes('tests/universal-v2-bleach-new-top.test.mjs'));
  assert.throws(()=>checkedBleachAddonDefinition({...p,effect:'fictional'}),
   /official recheck required/);
 }
});
test('BLC-2-055 looks at own top one: TOP unchanged, BOTTOM rotates; OUTSIDE illegal and hidden',()=>{
 const {s,play}=setup(purple,'BLC-2-055',null,2550);
 const snapshot=structuredClone(s);
 const q=dispatchUniversalAction(packs,s,play,{actor:0});
 const before=q.players[0].deck.map(c=>c.uid);
 assert.equal(q.pending?.kind,'private-top-place');
 assert.deepEqual(legalUniversalActions(packs,q),[
  {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'bottom'}]);
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.ok(universalPrivateChoices(packs,q,0)?.options[0]?.card);
 assert.ok(!JSON.stringify(universalPublicView(packs,q,1)).includes(before[0]));
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'outside'},{actor:0}),
  /not currently legal/);
 const top=dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'top'},{actor:0});
 assert.deepEqual(top.players[0].deck.map(c=>c.uid),before);
 const bottom=dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'bottom'},{actor:0});
 assert.deepEqual(bottom.players[0].deck.map(c=>c.uid),[...before.slice(1),before[0]]);
 assert.equal(assertUniversalMatch(packs,bottom),true);
 assert.deepEqual(s,snapshot);
});
test('BLC-2-055 top/bottom handles empty remaining deck without creating any UID',()=>{
 const {s,play}=setup(purple,'BLC-2-055',null,2551);
 while(s.players[0].deck.length)s.players[0].outside.push(s.players[0].deck.pop());
 const q=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(q.pending,null);
 assert.equal(q.players[0].deck.length,0);
 assert.equal(assertUniversalMatch(packs,q),true);
});
test('BLC-4-013 choose arbitrary 0,1,2 outside from own private top two then arrange rest; UID conserved',()=>{
 for(const outsideCount of [0,1,2]){
  const {s,play}=setup(yellow,'BLC-4-013','BLC-1-002',4013+outsideCount);
  const snapshot=structuredClone(s);
  let q=dispatchUniversalAction(packs,s,play,{actor:0});
  const before=q.players[0].deck.map(c=>c.uid);
  assert.equal(q.pending?.kind,'effect-top-inspect-many');
  const window=q.pending.uids.slice();
  assert.deepEqual(window,before.slice(0,2));
  assert.equal(universalPrivateChoices(packs,q,1),null);
  for(const uid of window)assert.ok(!JSON.stringify(universalPublicView(packs,q,1)).includes(uid));
  const oldOutside=q.players[0].outside.length;
  for(let i=0;i<outsideCount;i++){
   q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:window[i]},{actor:0});
   if(outsideCount===2&&i===0)assert.throws(()=>dispatchUniversalAction(packs,q,
    {type:'chooseInspectedOutside',uid:window[0]},{actor:0}),/not currently legal/);
  }
  if(outsideCount<2)q=dispatchUniversalAction(packs,q,
   {type:'chooseInspectedOutside',uid:null},{actor:0});
  for(const uid of window.slice(outsideCount).reverse()){
   assert.equal(q.pending?.kind,'effect-top-order');
   q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid},{actor:0});
  }
  assert.equal(q.pending,null);
  assert.deepEqual(q.players[0].deck.map(c=>c.uid),
   [...window.slice(outsideCount).reverse(),...before.slice(2)]);
  assert.equal(q.players[0].outside.length,oldOutside+outsideCount);
  assert.deepEqual(s,snapshot);
  assert.equal(assertUniversalMatch(packs,q),true);
 }
});
test('BLC-4-013 with short deck one card accepts keeping or sending it outside only once',()=>{
 for(const toOutside of [false,true]){
  const {s,play}=setup(yellow,'BLC-4-013','BLC-1-002',4190+Number(toOutside));
  while(s.players[0].deck.length>1)s.players[0].outside.push(s.players[0].deck.pop());
  let q=dispatchUniversalAction(packs,s,play,{actor:0});
  assert.equal(q.pending?.kind,'effect-top-inspect-many');
  assert.equal(q.pending.uids.length,1);
  const uid=q.pending.uids[0];
  q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:toOutside?uid:null},{actor:0});
  if(!toOutside)q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid},{actor:0});
  assert.equal(q.pending,null);
  assert.equal(q.players[0].deck.length,toOutside?0:1);
  assert.equal(assertUniversalMatch(packs,q),true);
 }
});
