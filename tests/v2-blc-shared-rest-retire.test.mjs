import {EXPECTED_V2_COUNTS,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition,createBleachV2Pack}
 from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalEnergyByColor,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

const bleach=registeredV2TitlePack('bleach'),
 ttg=registeredV2TitlePack('gurren-lagann'),
 mst=registeredV2TitlePack('mushoku-tensei'),
 slg=registeredV2TitlePack('solo-leveling');
const energyIds=[
 ['BLC-1-016','yellow','UA08BT/BLC-1-016','ベレニケ・ガブリエリ',
  '主要階段・每回合 1 次：REST 自己，本回合額外產生 1 黃能源；主要階段結束時，此角色退場。'],
 ['BLC-1-069','green','UA08BT/BLC-1-069','浮竹 十四郎',
  '主要階段・每回合 1 次：REST 自己，本回合額外產生 1 綠能源；主要階段結束時，此角色退場。'],
 ['BLC-2-022','blue','EX07BT/BLC-2-022','志波 岩鷲',
  '主要階段・每回合 1 次：REST 自己，本回合額外產生 1 藍能源；主要階段結束時，此角色退場。']
];
const retirement=['BLC-2-040','blue','EX07BT/BLC-2-040',
 'チルッチ・サンダーウィッチ','退場：抽 1 張。'];

function deck(pack,requiredId){
 const source=pack.cards[requiredId];assert.ok(source);
 const allowed=Object.values(pack.cards).filter(c=>c.type==='character'&&
  c.color===source.color&&!['special','color','final'].includes(c.trigger));
 assert.ok(allowed.some(c=>c.id===requiredId));
 const others=allowed.filter(c=>c.id!==requiredId).sort((a,b)=>a.id.localeCompare(b.id));
 assert.ok(others.length>=12,'need source plus 12 printed support identities for '+requiredId);
 const ids=[requiredId,...others.slice(0,12).map(c=>c.id)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts[ids.at(-1)]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const bleDecks=Object.fromEntries([...energyIds,retirement].map(([id])=>[id,deck(bleach,id)]));
const mstDeck=deck(mst,'MST-1-003');
const ttgDeck=deck(ttg,'TTG-1-043');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],ix=list.findIndex(c=>c.cardId===id);
  if(ix>=0)return list.splice(ix,1)[0];
 }
 throw Error('Missing true physical UID '+id);
}
function put(s,p,id,line,slot){
 assert.equal(s.players[p][line][slot],null);
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;
 return c;
}
function phase(packs,s,wanted){
 for(let i=0;i<5&&s.phase!==wanted;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,wanted);return s;
}
test('four BLEACH printed original sources are strictly fingerprint-pinned; no fake Life effect',()=>{
 assert.equal(Object.keys(bleach.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.equal(BLEACH_V2_ADDON_PROFILES.length,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.deepEqual(Object.keys(bleach.cards).sort(),Object.keys(createBleachV2Pack().cards).sort());
 for(const [id,color,number,name,effect] of [...energyIds,retirement]){
  const source=CARDS.find(x=>x.identity===id),pin=BLEACH_V2_ADDON_PROFILES.find(x=>x.id===id);
  const registered=bleach.cards[id];
  assert.ok(source&&pin&&registered);
  assert.equal(source.number,number);
  assert.equal(source.nameJa,name);
  assert.equal(source.effect,effect);
  assert.equal(source.source.includes('/jp/cardlist/'),true);
  assert.deepEqual([registered.name,registered.color,registered.energy,registered.ap,registered.bp,registered.gen,registered.type,registered.trigger],
   [name,color,0,1,1000,1,'character',null]);
  // checkedBleachAddonDefinition returns a SOURCE-LOCKED, raw authored
  // definition; the registered pack normalizer adds harmless default keys.
  // Verify its meaningful actions and exact fully normalized pack instead.
  const rawChecked=checkedBleachAddonDefinition(pin);
  assert.deepEqual(rawChecked.effects,registered.effects);
  assert.deepEqual(rawChecked.mainAbility??null,registered.mainAbility??null);
  assert.deepEqual(createBleachV2Pack().cards[id],registered);
  assert.throws(()=>checkedBleachAddonDefinition({...pin,effect:'fabricated effect'}),/official recheck required/);
 }
 for(const [id] of energyIds){
  assert.deepEqual(bleach.cards[id].mainAbility,ttg.cards['TTG-1-063'].mainAbility);
  assert.deepEqual(bleach.cards[id].mainAbility,mst.cards['MST-1-016'].mainAbility);
  assert.deepEqual(bleach.cards[id].mainAbility,slg.cards['SLG-1-013'].mainAbility);
  assert.deepEqual(bleach.cards[id].effects,{});
 }
 assert.deepEqual(bleach.cards[retirement[0]].effects.onRetire,
  mst.cards['MST-1-013'].effects.onRetire);
 assert.deepEqual(bleach.cards[retirement[0]].effects.onRetire,
  slg.cards['SLG-1-007'].effects.onRetire);
 assert.ok(Object.isFrozen(bleach.cards[retirement[0]].effects.onRetire));
});
for(const [cardId,color] of energyIds){
 test(cardId+' source MAIN REST generates only OWN '+color+' and retires exactly once at MAIN end vs MST',()=>{
  const packs=[bleach,mst];
  let s=newUniversalMatch(packs,{decks:[bleDecks[cardId],mstDeck],first:0,seed:11500+cardId.charCodeAt(cardId.length-1)});
  const source=put(s,0,cardId,'energy',0);
  s=phase(packs,s,'main');
  const apBefore=s.players[0].apCards.filter(c=>c.ready).length;
  const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
  assert.equal(universalEnergyByColor(packs,s,0)[color],1);
  assert.throws(()=>dispatchUniversalAction(packs,s,action,{actor:1}),/Wrong player/);
  const original=structuredClone(s);
  s=dispatchUniversalAction(packs,s,action,{actor:0});
  assert.equal(original.players[0].energy[0].ready,true);
  assert.equal(s.players[0].energy[0].ready,false);
  assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
  assert.equal(universalEnergyByColor(packs,s,0)[color],2);
  assert.equal(universalEnergyByColor(packs,s,1)[color]||0,0);
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,apBefore);
  assert.equal(s.delayedEffects.length,1);
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
  assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.phase,'attack');
  assert.equal(s.players[0].energy[0],null);
  assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
  assert.equal(s.delayedEffects.length,0);
  assert.equal(universalEnergyByColor(packs,s,0)[color]||0,0);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('BLEACH P1 blue ENERGY vs MST P0: owner-only production and hidden-hand isolation',()=>{
 const id='BLC-2-022',packs=[mst,bleach];
 let s=newUniversalMatch(packs,{decks:[mstDeck,bleDecks[id]],first:1,seed:22200});
 const source=put(s,1,id,'energy',0);
 s=phase(packs,s,'main');
 const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 assert.equal(universalEnergyByColor(packs,s,1).blue,1);
 s=dispatchUniversalAction(packs,s,action,{actor:1});
 assert.equal(universalEnergyByColor(packs,s,1).blue,2);
 assert.equal(universalEnergyByColor(packs,s,0).blue||0,0);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLEACH BLC-2-040 truly retired from blocked battle draws exactly one for owner, not foe',()=>{
 const packs=[ttg,bleach];
 let s=newUniversalMatch(packs,{decks:[ttgDeck,bleDecks['BLC-2-040']],first:0,seed:2040});
 const attacker=put(s,0,'TTG-1-043','front',0);
 const defender=put(s,1,'BLC-2-040','front',0);
 s=phase(packs,s,'attack');
 const handBefore=s.players[1].hand.length,deckBefore=s.players[1].deck.length,
  enemyDeck=s.players[0].deck.length;
 const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.ok(attack);s=dispatchUniversalAction(packs,s,attack,{actor:0});
 assert.equal(s.pending?.kind,'block');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:'forged'},{actor:1}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
 assert.equal(s.players[1].hand.length,handBefore+1);
 assert.equal(s.players[1].deck.length,deckBefore-1);
 assert.equal(s.players[0].deck.length,enemyDeck);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLEACH BLC-2-040 normal AP-paid play does not draw and does not create phantom retirement',()=>{
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[bleDecks['BLC-2-040'],bleDecks['BLC-2-040']],first:0,seed:2041});
 const source=take(s,0,'BLC-2-040');
 s.players[0].hand.push(source);
 s=phase(packs,s,'main');
 const ap=s.players[0].apCards.filter(c=>c.ready).length,deckLength=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.players[0].deck.length,deckLength);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLEACH delayed energy only on READY own ENERGY, never FRONT or forged source',()=>{
 const id='BLC-1-069',packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[bleDecks[id],bleDecks[id]],first:0,seed:16069});
 const source=put(s,0,id,'front',0);
 s=phase(packs,s,'main');
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'}),/not currently legal/);
 const moved=structuredClone(s);
 moved.players[0].front[0]=null;moved.players[0].energy[0]=moved.players[0].hand.find(c=>c.uid===source.uid)||source;
 moved.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,moved).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
