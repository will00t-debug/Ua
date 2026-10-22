import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createBleachV2Pack,BLEACH_V2_NEW_IDS} from '../dist/universal-v2/bleach-pack.mjs';
import {V2_ABILITY_TEMPLATE_IDS,expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';

// Maintain a fail-closed list for official effects the shared V2 primitives CANNOT
// currently express. These are NOT fake "ported" cards or disabled skills.
// A new implementation must add a real official scenario test and remove the
// corresponding entry from this unimplemented set.
export const BLEACH_CORE_GAP_SCENARIOS=Object.freeze([]);
test('implemented BLEACH core blockers are not left on the fail-closed gap list',()=>{
 const pack=createBleachV2Pack();
 const set=new Set(BLEACH_V2_NEW_IDS);
 assert.equal(BLEACH_CORE_GAP_SCENARIOS.length,0);
 assert.equal(pack.cards['BLC-2-063'].readyOnAttackCount,1);
 assert.ok(set.has('BLC-2-063'));
 for(const gap of BLEACH_CORE_GAP_SCENARIOS){
  const printed=CARDS.find(c=>c.identity===gap.id);
  assert.ok(printed,gap.id);
  assert.equal(printed.number,gap.number,gap.id);
  assert.equal(printed.effect,gap.exactEffect,gap.id);
  assert.match(printed.source,/unionarena-tcg\.com\/jp\/cardlist\//);
  assert.ok(!set.has(gap.id),'Unsupported new card silently added: '+gap.id);
  assert.equal(pack.cards[gap.id],undefined,'Unsupported card must be rejected by V2');
  assert.ok(gap.missing.length>=30&&gap.fixture.length>=30);
 }
});
test('printed Impact 1 and Damage 2 left the core-gap list once official scenarios existed',()=>{
 const pack=createBleachV2Pack();
 const impact=pack.cards['BLC-1-009'],damage=pack.cards['BLC-1-074'];
 assert.equal(impact.printedImpact,1);
 assert.equal(damage.printedAttackDamage,2);
 assert.deepEqual(impact.effects,{});
 assert.deepEqual(damage.effects,{});
 assert.ok(!BLEACH_CORE_GAP_SCENARIOS.some(x=>x.id==='BLC-1-009'||x.id==='BLC-1-074'));
});
test('A unlocked exact top-or-bottom; BLC-2-055 is now registered without OUTSIDE approximation',()=>{
 assert.ok(V2_ABILITY_TEMPLATE_IDS.includes('peekTopOrBottom'));
 assert.deepEqual(expandAbilityTemplates({onPlay:[{template:'peekTopOrBottom'}]}),
  {onPlay:[{op:'peekTopOrBottom'}]});
 assert.deepEqual(createBleachV2Pack().cards['BLC-2-055'].effects.onPlay,[{op:'peekTopOrBottom'}]);
 assert.ok(!BLEACH_CORE_GAP_SCENARIOS.some(x=>x.id==='BLC-2-055'));
});
test('batch opponent BP down has no printed minimum-BP threshold unless the range template supplies one',()=>{
 const effect=expandAbilityTemplates({onPlay:[{template:'enemyFrontAllBpDown',bp:500}]});
 assert.deepEqual(effect,{onPlay:[{op:'enemyFrontAllBpDown',bp:500}]});
 assert.ok(!Object.hasOwn(effect.onPlay[0],'minBp'));
 const ranged=expandAbilityTemplates({onPlay:[{template:'enemyFrontBpDownInRange',bp:500,minBp:1000,maxBp:null}]});
 assert.deepEqual(ranged,{onPlay:[{op:'enemyFrontAllBpDown',bp:500,minBp:1000}]});
 const pack=createBleachV2Pack();
 assert.equal(pack.cards['BLC-2-007'].trigger,'active');
 assert.deepEqual(pack.cards['BLC-2-007'].effects,ranged);
 assert.ok(!BLEACH_CORE_GAP_SCENARIOS.some(x=>x.id==='BLC-2-007'));
});
