import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {rnkSharedCard,createRnkSharedStagingPack} from '../dist/universal-v2/rnk-shared-adapter.mjs';
import {RNK_CARDS_029_035} from '../dist/rnk/cards-029-035.mjs';
import {RNK_JP_EVIDENCE_029_035} from '../dist/rnk/jp-evidence-029-035.mjs';
import {RNK_PROGRAMS_029_035} from '../dist/universal-v2/rnk/programs-029-035.mjs';
import {createRnkStagingPack} from '../dist/universal-v2/rnk-staging-pack.mjs';

const catalog=new Map(RNK_CARDS_029_035.map(card=>[card.id,card]));
const programs=RNK_PROGRAMS_029_035;
const evidence=RNK_JP_EVIDENCE_029_035;

test('RNK cards compile through exactly the same Universal V2 createUniversalPack schema',()=>{
 const generic=createRnkSharedStagingPack({
   cards:RNK_CARDS_029_035,programs,evidence,
   version:'rnk-031-035-universal-test'
 });
 const prior=createRnkStagingPack();
 assert.deepEqual(Object.keys(generic.cards),['RNK-1-031','RNK-1-035']);
 assert.deepEqual(Object.keys(prior.cards),Object.keys(generic.cards));
 for(const id of Object.keys(generic.cards)){
   assert.deepEqual(generic.cards[id],prior.cards[id]);
   assert.equal(generic.cards[id].title,'rnk');
 }
 assert.deepEqual(generic.cards['RNK-1-031'].effects.onPlay,[{op:'recoverAp',count:2}]);
 assert.deepEqual(generic.cards['RNK-1-035'].effects,{});
});

test('unknown or malformed RNK effect programs never bypass common engine validation',()=>{
 const original=catalog.get('RNK-1-031');
 const base=programs['RNK-1-031'];
 assert.throws(()=>rnkSharedCard(original,{...base,rnkCustomEffect:true},evidence[original.id]),
   /unsupported RNK program field/);
 const corrupted=rnkSharedCard(original,{
   ...base,effects:{onPlay:[{op:'rnkSpecialPrivate'}]}
 },evidence[original.id]);
 assert.throws(()=>createUniversalPack({id:'rnk',cards:[corrupted]}),
   /effect op unsupported/);
 assert.throws(()=>rnkSharedCard(original,{...base,implementation:'vanilla'},evidence[original.id]),
   /printed effects cannot be vanilla/);
 assert.throws(()=>rnkSharedCard(original,base,{...evidence[original.id],print:'UA41BT/RNK-1-999'}),
   /Japanese printed evidence/);
});

test('future unverified B/C/D programs remain excluded, no partial source-to-runtime fallback',()=>{
 for(const card of RNK_CARDS_029_035){
   if(card.id==='RNK-1-031'||card.id==='RNK-1-035')continue;
   assert.equal(rnkSharedCard(card,programs[card.id],evidence[card.id]),null);
 }
 const unknown={...catalog.get('RNK-1-031'),id:'RNK-1-036',number:'UA41BT/RNK-1-036'};
 assert.equal(rnkSharedCard(unknown,undefined,undefined),null);
 assert.throws(()=>createRnkSharedStagingPack({
   cards:[catalog.get('RNK-1-030')],programs,evidence,version:'no-ready'
 }),/No verified RNK programs/);
 assert.throws(()=>createRnkSharedStagingPack({
   cards:[catalog.get('RNK-1-031'),catalog.get('RNK-1-031')],
   programs,evidence,version:'duplicate'
 }),/Duplicate RNK numbered card/);
});
