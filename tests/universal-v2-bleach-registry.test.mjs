import {EXPECTED_V2_COUNTS,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {compileV2TitleContribution} from '../dist/universal-v2/title-packs/contract.mjs';
import {V2_TITLE_CONTRIBUTIONS,listRegisteredV2Titles,registeredV2TitlePack}
 from '../dist/universal-v2/title-packs/registry.mjs';
import {v2InventoryForTitle} from '../dist/universal-v2/title-packs/inventory.mjs';
import {BLEACH_V2_NEW_IDS,BLEACH_V2_ADDON_PROFILES,createBleachV2Pack}
 from '../dist/universal-v2/bleach-pack.mjs';
import {REAL_V2_PILOT_IDS} from '../dist/universal-v2/real-card-pilots.mjs';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';

import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';

const registered=registeredV2TitlePack('bleach');
const standalone=createBleachV2Pack();
const packs=[registered,registered];
const sorted=a=>[...a].sort();
const GREEN_COUNTS=Object.freeze({
 'BLC-1-067':4,'BLC-1-068':4,'BLC-1-071':4,'BLC-1-072':4,
 'BLC-1-075':4,'BLC-1-082':4,'BLC-1-086':4,'BLC-1-089':4,
 'BLC-1-090':4,'BLC-1-094':4,'BLC-1-097':4,'BLC-4-061':4,
 'BLC-1-100':2
});
const fresh=(first=0,seed=713)=>newUniversalMatch(packs,{
 decks:[{...GREEN_COUNTS},{...GREEN_COUNTS}],first,seed
});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(x=>x.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Real physical '+id+' unavailable');
}
function phase(s,need){
 for(let n=0;n<5&&s.phase!==need;n++){
  const a=legalUniversalActions(packs,s).find(x=>x.type==='next');
  assert.ok(a);s=dispatchUniversalAction(packs,s,a);
 }
 assert.equal(s.phase,need);return s;
}
function lifeHit(id){
 let s=fresh(1,771),victim=take(s,0,id),attacker=take(s,1,'BLC-1-071');
 attacker.ready=true;s.players[1].front[0]=attacker;
 s.players[0].deck.push(s.players[0].life.shift());
 s.players[0].life.unshift(victim);
 s=phase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 return {s,victim};
}
test('registry adds exact 73 official BLEACH IDs to 15 Pilots, never duplicates or ghosts',()=>{
 assert.equal(V2_TITLE_CONTRIBUTIONS.bleach,contribution);
 assert.equal(REAL_V2_PILOT_IDS.bleach.length,15);
 assert.equal(contribution.entries.length,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.deepEqual(sorted(contribution.entries.map(x=>x.id)),sorted(BLEACH_V2_NEW_IDS));
 assert.equal(new Set(contribution.entries.map(x=>x.id)).size,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.ok(!BLEACH_V2_NEW_IDS.some(id=>REAL_V2_PILOT_IDS.bleach.includes(id)));
 assert.deepEqual(sorted(Object.keys(registered.cards)),
  sorted([...REAL_V2_PILOT_IDS.bleach,...BLEACH_V2_NEW_IDS]));
 assert.equal(Object.keys(registered.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.equal(Object.keys(standalone.cards).length,EXPECTED_V2_COUNTS.bleach);
 const info=listRegisteredV2Titles().find(x=>x.title==='bleach');
 assert.equal(info.baselinePilots,15);
 assert.equal(info.newlyContributed,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.equal(info.totalV2Cards,EXPECTED_V2_COUNTS.bleach);
 const inventory=v2InventoryForTitle('bleach');
 assert.equal(inventory.total,276);
 assert.equal(inventory.pilotImplemented,EXPECTED_V2_COUNTS.bleach);
 assert.equal(inventory.blocked,276-EXPECTED_V2_COUNTS.bleach);
 assert.deepEqual(inventory.pilotIds,sorted(Object.keys(registered.cards)));
});

test('every integrated card is exactly the same compiled definition as independent BLEACH pack',()=>{
 for(const id of Object.keys(registered.cards)){
  assert.deepEqual(registered.cards[id],standalone.cards[id],id+' independent/registry drift');
  assert.ok(CARDS.some(c=>c.identity===id&&(c.source?.includes('unionarena-tcg.com/jp/cardlist/')||
   id==='BLC-4-082'&&c.source==='https://shopping.fullcomp.jp/products/pdsrqs97vlmo'||
   id==='BLC-4-083'&&c.source==='https://dorasuta.jp/union-arena/product?pid=709493')),id);
 }
 for(const [index,p] of BLEACH_V2_ADDON_PROFILES.entries()){
  const entry=contribution.entries[index];
  assert.equal(entry.id,p.id);
  assert.equal(entry.sourceRecord.effect,p.effect);
  assert.ok([entry.sourceRecord.number,...(entry.sourceRecord.aliases||[])].includes(p.number),
   p.id+' official alias matches original source');
  assert.ok(entry.evidence.printedTextFragments.every(x=>entry.sourceRecord.effect.includes(x)));
  assert.ok(entry.evidence.testFiles.includes('tests/universal-v2-bleach-registry.test.mjs'));
  assert.equal(entry.evidence.verifiedNoExtraEffects===true,
   ['plain','plainAlt','step'].includes(p.kind));
  assert.equal(entry.definition.gen,registered.cards[p.id].gen);
 }
});

test('fail-closed contract rejects source drift, fake vanilla, unknown code and duplicate Pilot IDs',()=>{
 // This rejection suite intentionally uses an explicitly verified VANILLA
 // profile, not whichever entry happens to be first in the growing registry.
 const base=contribution.entries.find(x=>x.evidence.verifiedNoExtraEffects===true);
 assert.ok(base,'test requires source-pinned vanilla negative-control fixture');
 function invalid(change){
  const candidate=structuredClone(base);
  change(candidate);
  return ()=>compileV2TitleContribution({
   title:'bleach',version:'negative-proof',entries:[candidate]
  });
 }
 assert.throws(invalid(x=>x.sourceRecord.source='https://wrong.example/card'),/official cardlist|missing/);
 assert.throws(invalid(x=>x.sourceRecord.effect='altered'),/printed text fragment/);
 assert.throws(invalid(x=>x.sourceRecord.bp=9000),/printed bp changed/);
 assert.throws(invalid(x=>x.evidence.verifiedNoExtraEffects=false),/vanilla requires/);
 assert.throws(()=>compileV2TitleContribution({title:'bleach',version:'duplicate',
  entries:[base,base]}),/duplicate contribution ID/);
 assert.ok(validateUniversalDeck(registered,{'BLC-2-055':50})
  .some(x=>x.includes('exceeds 0–4 copies')),
  'registered printed card is legal, but 50 copies violates exact copy cap');
 assert.deepEqual(registered.cards['BLC-2-055'].effects.onPlay,[{op:'peekTopOrBottom'}]);
 assert.deepEqual(registered.cards['BLC-4-013'].effects.onPlay,[{op:'inspectTopAnyOutside',count:2,rest:'top'}]);
});

test('BLC-4-014 normalizes original ACTIVE total 2 to REST 1, ACTIVE 2 with same physical UID',()=>{
 const id='BLC-4-014',original=CARDS.find(x=>x.identity===id);
 const {sourceRecord,definition,evidence}=contribution.entries.find(x=>x.id===id);
 assert.equal(original.gen,2,'old imported active-total fingerprint');
 assert.equal(sourceRecord.legacyImportedGen,2);
 assert.equal(sourceRecord.gen,1);
 assert.equal(definition.gen,1);
 assert.equal(definition.activeExtraEnergy,1);
 assert.match(evidence.reviewNote,/REST 1.*ACTIVE.*\+1/);
 const counts={...GREEN_COUNTS,'BLC-4-014':4};
 delete counts['BLC-1-072'];
 assert.deepEqual(validateUniversalDeck(registered,counts),[],
  'one-for-one replacement retains 50 legal official cards');
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:14014});
 const card=take(s,0,id);card.ready=true;s.players[0].energy[0]=card;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,2);
 card.ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,1);
 card.ready=true;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,2);
 assert.equal(s.players[0].energy[0].uid,card.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('real 50-card green BLEACH deck plays via formal registry and AI, not isolated pack',()=>{
 assert.equal(Object.values(GREEN_COUNTS).reduce((n,v)=>n+v,0),50);
 assert.deepEqual(validateUniversalDeck(registered,GREEN_COUNTS),[]);
 assert.ok(Object.entries(GREEN_COUNTS).every(([id,n])=>
  n>0&&n<=4&&registered.cards[id]?.color==='green'&&!id.startsWith('TEST')));
 let s=fresh(0,2703),steps=0;
 for(;steps<2500&&s.status==='playing';steps++){
  const action=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
  assert.ok(action,'AI action available at '+steps);
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(action)));
  s=dispatchUniversalAction(packs,s,action);
  if(steps%40===0)assert.equal(assertUniversalMatch(packs,s),true);
 }
 assert.ok(steps>25);
 assert.equal(s.status,'finished','registered real BLEACH decks must complete a game');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('GET life on real BLC-1-071 returns exact flipped UID to hand in registry game',()=>{
 const {s,victim}=lifeHit('BLC-1-071');
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseTrigger'&&x.mode==='get');
 assert.ok(a);
 const n=s.players[0].hand.length;
 const done=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(done.players[0].hand.length,n+1);
 assert.ok(done.players[0].hand.some(c=>c.uid===victim.uid));
 assert.ok(!done.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('DRAW life on real BLC-4-061 draws exactly once, source goes outside',()=>{
 const {s,victim}=lifeHit('BLC-4-061');
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseTrigger'&&x.mode==='draw');
 assert.ok(a);
 const n=s.players[0].deck.length;
 const done=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(done.players[0].deck.length,n-1);
 assert.ok(done.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('ACTIVE life on real BLC-1-086 may ready own REST source, never enemy UID',()=>{
 const {s,victim}=lifeHit('BLC-1-086');
 const target=take(s,0,'BLC-1-071');target.ready=false;
 s.players[0].energy[0]=target;
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseTrigger'&&
  x.mode==='active'&&x.uid===target.uid);
 assert.ok(a);
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.mode==='active'&&
  x.uid===s.players[1].front[0].uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{...a,uid:s.players[1].front[0].uid},{actor:0}),
  /not currently legal/);
 const done=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(done.players[0].energy[0].uid,target.uid);
 assert.equal(done.players[0].energy[0].ready,true);
 assert.ok(done.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});

// Retained verified V2-B positive real-effect and COLOR life-trigger regressions.
test('COLOR life on BLC-1-049 in formal registry deploys eligible OWN outside character for zero AP',()=>{
 const purple={...BLEACH_PURPLE_V2_PILOT_COUNTS,'BLC-1-049':4};
 delete purple['BLC-1-040']; // Replace the old COLOR copies: printed cap stays four.
 assert.deepEqual(validateUniversalDeck(registered,purple),[]);
 assert.equal(Object.values(purple).reduce((n,x)=>n+x,0),50);
 let s=newUniversalMatch(packs,{decks:[purple,purple],first:1,seed:14949});
 const revealed=take(s,0,'BLC-1-049'),eligible=take(s,0,'BLC-1-039'),
  attack=take(s,1,'BLC-1-039'),enemy=take(s,1,'BLC-1-034');
 s.players[0].deck.push(s.players[0].life.shift());
 s.players[0].life.unshift(revealed);
 s.players[0].outside.push(eligible);
 s.players[1].outside.push(enemy);
 s.players[1].front[0]=attack;attack.ready=true;
 s=phase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attack.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'color');
 const options=legalUniversalActions(packs,s);
 const deploy=options.find(x=>x.type==='chooseTrigger'&&x.mode==='colorOutside'&&
  x.uid===eligible.uid&&x.slot===0);
 assert.ok(deploy,'printed COLOR target in OWN outside can join active front');
 assert.ok(options.some(x=>x.type==='chooseTrigger'&&x.mode==='skip'));
 assert.ok(!options.some(x=>x.uid===enemy.uid),'opponent outside is not selectable');
 assert.throws(()=>dispatchUniversalAction(packs,s,{...deploy,uid:enemy.uid},{actor:0}),
  /not currently legal/);
 const before=structuredClone(s);
 const apBefore=s.players[0].apCards.filter(c=>c.ready).length;
 const done=dispatchUniversalAction(packs,s,deploy,{actor:0});
 assert.deepEqual(s,before,'life Trigger must not mutate its source match');
 assert.equal(done.players[0].front[0]?.uid,eligible.uid);
 assert.equal(done.players[0].front[0]?.ready,true);
 assert.ok(!done.players[0].outside.some(c=>c.uid===eligible.uid));
 assert.ok(done.players[0].outside.some(c=>c.uid===revealed.uid));
 assert.equal(done.players[0].apCards.filter(c=>c.ready).length,apBefore);
 assert.equal(assertUniversalMatch(packs,done),true);
 const skip=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skip.players[0].front[0],null);
 assert.ok(skip.players[0].outside.some(c=>c.uid===revealed.uid));
 assert.equal(assertUniversalMatch(packs,skip),true);
});

test('formal registry BLC-1-049 onPlay BP reduction chooses legal foe or declines; no fake UID',()=>{
 const purple={...BLEACH_PURPLE_V2_PILOT_COUNTS,'BLC-1-049':4};
 delete purple['BLC-1-040'];
 let s=newUniversalMatch(packs,{decks:[purple,purple],first:0,seed:14905});
 const target=take(s,1,'BLC-1-039'),spell=take(s,0,'BLC-1-049'),
  energy2=take(s,0,'BLC-1-102'),energy1=take(s,0,'BLC-1-039');
 energy2.ready=true;energy1.ready=true;
 s.players[0].energy[0]=energy2;s.players[0].energy[1]=energy1;
 s.players[0].hand.push(spell);
 target.ready=true;s.players[1].front[0]=target;
 s=phase(s,'main');
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===spell.uid&&
  x.line==='front'&&x.slot===0);
 assert.ok(play,'three purple energy can legally summon BLC-1-049');
 const waiting=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(waiting.pending?.kind,'effect-target');
 const options=legalUniversalActions(packs,waiting);
 const selected=options.find(x=>x.type==='chooseTarget'&&x.uid===target.uid);
 assert.ok(selected);
 assert.ok(options.some(x=>x.type==='chooseTarget'&&x.uid===null));
 assert.throws(()=>dispatchUniversalAction(packs,waiting,{...selected,uid:'FORGED-UID'},{actor:0}),
  /not currently legal/);
 const settled=dispatchUniversalAction(packs,waiting,selected,{actor:0});
 assert.equal(settled.pending,null);
 assert.ok(settled.players[1].front[0].buffs.some(x=>x.bp===-500));
 assert.equal(assertUniversalMatch(packs,settled),true);
 const declined=dispatchUniversalAction(packs,waiting,
  options.find(x=>x.type==='chooseTarget'&&x.uid===null),{actor:0});
 assert.ok(!(declined.players[1].front[0].buffs||[]).some(x=>x.bp===-500));
 assert.equal(assertUniversalMatch(packs,declined),true);
});
