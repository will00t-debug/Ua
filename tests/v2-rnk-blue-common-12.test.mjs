import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_BLUE_COMMON} from '../dist/rnk/jp-evidence-blue-common.mjs';
import {RNK_PROGRAMS_BLUE_COMMON} from '../dist/universal-v2/rnk/programs-blue-common.mjs';
import {rnkJapaneseTraits} from '../dist/universal-v2/rnk-shared-adapter.mjs';
import {RNK_BATCH_STAGING_IDS,createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {cardHasTrait} from '../dist/universal-v2/field-conditions.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const ids=['001','002','003','004','006','009','012','014','015','016','020','021','022','023','025','027'].map(n=>'RNK-1-'+n);
const activeIds=ids;
const source=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
const pack=createRnkBcdBatchStagingPack();
const card=n=>pack.cards['RNK-1-'+n];

test('all sixteen Japanese blue evidence records compile in the growing universal V2 pack',()=>{
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(pack.id,'rnk');
 assert.equal(Object.keys(pack.cards).length,114);
 assert.deepEqual(Object.keys(pack.cards).sort(),RNK_BATCH_STAGING_IDS);
 assert.deepEqual(Object.keys(RNK_JP_EVIDENCE_BLUE_COMMON).sort(),ids);
 assert.deepEqual(Object.keys(RNK_PROGRAMS_BLUE_COMMON).sort(),ids);
 for(const id of ids){
   const jp=RNK_JP_EVIDENCE_BLUE_COMMON[id],tc=source[id],v2=pack.cards[id];
   assert.ok(jp&&tc,id+' missing Japanese evidence/source');
   assert.equal(jp.print,tc.number,id);
   assert.equal(tc.color,'blue',id);
   assert.equal(tc.cardDataVerified,false,id);
   assert.equal(tc.battleReady,false,id);
   assert.ok(jp.effectJa&&jp.triggerJa&&jp.sourceJa.startsWith('https://www.merucarduniari.jp/'),id);
   assert.ok(v2,id+' staged card missing');
   assert.equal(v2.implementation,'dsl',id);
   assert.equal(v2.name,jp.nameJa,id);
   assert.equal(v2.energy,tc.energy,id);
   assert.equal(v2.ap,tc.ap,id);
   assert.equal(v2.bp,tc.bp,id);
   assert.equal(v2.trigger,tc.trigger,id);
 }
});

test('003,004 reuse exactly the existing shared V2 temporary energy and mandatory bounce',()=>{
 assert.equal(card('003').bp,1000,'official JP/EN/TW print overrides mistaken merchant BP 2000');
 assert.equal(card('003').energy,0);
 assert.equal(card('003').gen,1);
 assert.deepEqual(card('003').mainAbility,{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1
 });
 assert.deepEqual(card('004').effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 assert.equal(card('004').energy,1);
 assert.equal(card('004').bp,1500);
 assert.equal(card('004').gen,2);
});

test('006,014 share optional Kenshin buff and mandatory draw then discard',()=>{
 assert.deepEqual(card('006').effects.onPlay,[{
   op:'buffOwnField',filter:{field:'name',value:'緋村 剣心'},
   bp:1000,optional:true,excludeSelf:false
 }]);
 assert.equal(card('006').trigger,'draw');
 assert.deepEqual(card('014').effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.equal(card('014').trigger,'active');
});

test('009 preserves impact null AND two-card reorder with arbitrary deck-top and outside split',()=>{
 const v=card('009');
 assert.equal(v.impactNull,true);
 assert.equal(v.bp,2000);
 assert.equal(v.trigger,null);
 assert.deepEqual(v.effects.onPlay,[{
  op:'inspectTopAnyOutside',count:2,rest:'top'
 }]);
});

test('012 hand cost discount and 015 own-turn-only +1000 BP use existing passives',()=>{
 assert.deepEqual(card('012').opponentFieldColorsHandEnergyDiscount,{
  colors:['purple','red'],amount:1
 });
 assert.equal(card('012').energy,3);
 assert.equal(card('012').bp,3000);
 assert.equal(card('015').ownTurnBp,1000);
 assert.equal(card('015').bp,2000);
 assert.deepEqual(card('015').effects,{});
});

test('020 retires and draws only if an own Aoshi remains on field',()=>{
 const v=card('020');
 assert.equal(v.type,'character');
 assert.equal(v.energy,0);
 assert.equal(v.trigger,null);
 assert.deepEqual(v.effects.onRetire,[{
  op:'drawIfOwnName',name:'四乃森 蒼紫',count:1
 }]);
});

test('021 name OR JP trait search uses Japanese canonical trait on every source character',()=>{
 const v=card('021');
 assert.deepEqual(v.effects.onPlay,[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',
  filters:[{field:'name',value:'高荷 恵'},{field:'trait',value:'御庭番衆'}]
 }]);
 assert.deepEqual(source['RNK-1-014'].traits,['御庭番眾']);
 assert.deepEqual(card('014').traits,['御庭番衆']);
 assert.deepEqual(v.traits,['御庭番衆']);
 assert.equal(cardHasTrait(card('014'),'御庭番衆'),true);
 assert.equal(cardHasTrait(card('014'),'御庭番眾'),false);
 assert.deepEqual(rnkJapaneseTraits(['御庭番眾','十本刀']),['御庭番衆','十本刀']);
 assert.equal(source['RNK-1-014'].nameZhTw,'四乃森蒼紫');
});

test('022,023,027 reuse plain impact null, active energy +1 and FINAL AP recovery',()=>{
 assert.equal(card('022').impactNull,true);
 assert.equal(card('022').trigger,'draw');
 assert.equal(card('023').activeExtraEnergy,1);
 assert.equal(card('023').trigger,null);
 assert.equal(card('027').type,'event');
 assert.equal(card('027').trigger,'final');
 assert.equal(card('027').energy,3);
 assert.deepEqual(card('027').traits,[],'official card has no trait; merchant metadata is wrong');
 assert.deepEqual(card('027').effects.onPlay,[{op:'recoverAp',count:2}]);
});

test('blue staging never changes TC display or enables production gameplay',()=>{
 for(const id of ids)assert.equal(source[id].battleReady,false);
 for(const id of activeIds)assert.ok(pack.cards[id],id);
 assert.equal(Object.keys(officialV2Pack('rnk').cards).length,114);
});

test('002 also counts as Kenshin across all zones via canonical V2 printed alias',()=>{
 const v=card('002');
 assert.equal(v.name,'心太');
 assert.deepEqual(v.nameAliases,['緋村 剣心']);
 assert.equal(v.energy,0);
 assert.equal(v.trigger,'active');
 assert.equal(source['RNK-1-002'].nameZhTw,'心太');
});
test('016 draws only on an OWN CHARACTER/EVENT source-effect entry, never arbitrary FIELD effect',()=>{
 const c=card('016'),p=RNK_PROGRAMS_BLUE_COMMON['RNK-1-016'];
 assert.equal(p.ready,true);
 assert.equal(c.name,'四乃森 蒼紫');
 assert.equal(c.bp,2500);
 assert.equal(c.energy,2);
 assert.equal(c.trigger,'color');
 assert.deepEqual(c.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(c.traits,['御庭番衆']);
 assert.deepEqual(c.effects.onPlay,[{
  op:'ifLiveThen',
  when:{kind:'selfEnteredByOwnEffect',turn:'any',sourceTypes:['character','event']},
  then:[{op:'draw',count:1}]
 }]);
 assert.equal(source['RNK-1-016'].battleReady,false);
});
test('025 preserves empty-field hand -2 energy and private top-three optional outside-one choice',()=>{
 const v=card('025');
 assert.equal(v.energy,2);
 assert.equal(v.bp,2000);
 assert.equal(v.trigger,'draw');
 assert.equal(v.emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(v.effects.onPlay,[{
  op:'inspectTopAnyOutside',count:3,rest:'top',maxOutside:1
 }]);
 assert.deepEqual(v.traits,['御庭番衆']);
});

test('001 uses named top-seven one-or-none without a hand discard',()=>{
 const c=card('001');
 assert.equal(c.name,'新井 青空');
 assert.equal(c.energy,2);
 assert.equal(c.ap,1);
 assert.equal(c.bp,2000);
 assert.equal(c.trigger,'draw');
 assert.deepEqual(c.effects.onPlay,[{
   op:'searchTopOneBottomDiscard',count:7,
   filter:{field:'name',value:'逆刃刀・真打'},discard:false
 }]);
});


test('009 allows 0, 1, or 2 inspected cards to go outside while the rest returns to deck top',async()=>{
 const {rnkPracticeDeck}=await import('../dist/universal-v2/official-entry.mjs');
 const {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
  universalPrivateChoices,assertUniversalMatch}=await import('../dist/universal-v2/engine.mjs');
 const {validateUniversalDeck}=await import('../dist/universal-v2/pack.mjs');
 const {counts:starter}=rnkPracticeDeck();
 const counts={...starter};
 if(!counts['RNK-1-009']){
  const donor=Object.keys(counts).find(id=>id!=='RNK-1-009'&&
   !['special','color','final'].includes(pack.cards[id]?.trigger));
  assert.ok(donor);
  if(--counts[donor]===0)delete counts[donor];
  counts['RNK-1-009']=1;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const packs=[pack,pack];
 const pick=(s,pred)=>{
  const action=legalUniversalActions(packs,s).find(pred);
  assert.ok(action,'expected legal choice missing: '+JSON.stringify(legalUniversalActions(packs,s).slice(0,5)));
  return dispatchUniversalAction(packs,s,action);
 };
 const take=(s,id)=>{
  for(const zone of ['deck','hand','life','outside','removed']){
   const cards=s.players[0][zone],i=cards.findIndex(c=>c.cardId===id);
   if(i!==-1)return cards.splice(i,1)[0];
  }
  throw Error('missing physical '+id);
 };
 for(const n of [0,1,2]){
  let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:901+n,openingMulligan:false});
  for(let i=0;i<6&&s.phase!=='main';i++)s=pick(s,a=>a.type==='next');
  assert.equal(s.phase,'main');
  const source=take(s,'RNK-1-009');
  const producerId=Object.keys(counts).find(id=>id!=='RNK-1-009'&&
   pack.cards[id]?.color==='blue'&&pack.cards[id]?.gen>=1);
  assert.ok(producerId);
  const producer=take(s,producerId);
  producer.ready=true;producer.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[0]=producer;
  s.players[0].hand.push(source);
  const window=s.players[0].deck.slice(0,2).map(c=>c.uid);
  assert.equal(window.length,2);
  s=pick(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy'&&a.slot===1);
  assert.equal(s.pending?.kind,'effect-top-inspect-many');
  assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid),window);
  assert.equal(universalPrivateChoices(packs,s,1),null);
  for(const uid of window.slice(0,n)){
   s=pick(s,a=>a.type==='chooseInspectedOutside'&&a.uid===uid);
  }
  if(s.pending?.kind==='effect-top-inspect-many')
   s=pick(s,a=>a.type==='chooseInspectedOutside'&&a.uid===null);
  while(s.pending?.kind==='effect-top-order')
   s=pick(s,a=>a.type==='chooseTopOrder'&&window.slice(n).includes(a.uid));
  assert.equal(s.pending,null);
  for(const uid of window.slice(0,n))
   assert.ok(s.players[0].outside.some(c=>c.uid===uid),'selected card must enter outside');
  for(const uid of window.slice(n))
   assert.ok(s.players[0].deck.some(c=>c.uid===uid),'kept card must remain in deck');
  assert.deepEqual(s.players[0].deck.filter(c=>window.includes(c.uid))
   .map(c=>c.uid).sort(),window.slice(n).sort());
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
