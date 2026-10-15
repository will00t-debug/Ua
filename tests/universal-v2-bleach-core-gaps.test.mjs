import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createBleachV2Pack,BLEACH_V2_NEW_IDS} from '../dist/universal-v2/bleach-pack.mjs';
import {V2_ABILITY_TEMPLATE_IDS,expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';

// Maintain a fail-closed list for official effects the shared V2 primitives CANNOT
// currently express. These are NOT fake "ported" cards or disabled skills.
// A new implementation must add a real official scenario test and remove the
// corresponding entry from this unimplemented set.
export const BLEACH_CORE_GAP_SCENARIOS=Object.freeze([
 {
  id:'BLC-1-009',
  number:'UA08BT/BLC-1-009',
  exactEffect:'Impact 1：攻擊並贏得戰鬥時，對敵方玩家造成 1 點傷害。',
  missing:'Ordinary IMPACT 1 on a battle won (without facedown); defender IMPACT-null applies',
  fixture:'ATTACK 3000 v BLOCK 2000 -> 1 damage after battle; IMPACT-null defender -> 0'
 },
 {
  id:'BLC-1-074',
  number:'UA08BT/BLC-1-074',
  exactEffect:'Damage 2：攻擊直接造成傷害時，改為造成 2 點傷害。',
  missing:'Unblocked DAMAGE 2 replaces one damage with two independent life checks',
  fixture:'No blocker + 2 life with GET/DRAW -> check each in correct order, all UIDs once'
 },
 {
  id:'BLC-2-007',
  number:'EX07BT/BLC-2-007',
  exactEffect:'登場：所有敵方前線 BP 1000 以上角色，本回合 BP −500。',
  missing:'Batch BP >= 1000 filter snapshot before applying -500, excluding BP <= 999',
  fixture:'Foe front BP 500/1000/1500 -> debuff only 1000 and 1500, no retarget'
 },
 {
  id:'BLC-2-055',
  number:'EX07BT/BLC-2-055',
  exactEffect:'登場：查看己方牌堆頂 1 張，將其放至牌堆頂或牌堆底。',
  missing:'Controller-private peek top 1 and place TOP or BOTTOM, never OUTSIDE',
  fixture:'Deck top UID A, next UID B: bottom choice -> top B, bottom A, outside unchanged; illegal skip rejected'
 },
 {
  id:'BLC-2-063',
  number:'EX07BT/BLC-2-063',
  exactEffect:'每回合首次攻擊時，此角色立即轉為 ACTIVE，因此可攻擊 2 次。',
  missing:'First attack per physical UID becomes ACTIVE, but third attack same turn is illegal',
  fixture:'UID attacks twice (once after 1st ready), other physical UID separately eligible'
 }
]);
test('five official BLEACH core blockers are tracked and not misrepresented as V2 playable',()=>{
 const pack=createBleachV2Pack();
 const set=new Set(BLEACH_V2_NEW_IDS);
 assert.equal(BLEACH_CORE_GAP_SCENARIOS.length,5);
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
test('available top-one choice is TOP/OUTSIDE, not TOP/BOTTOM, so cannot implement BLC-2-055',()=>{
 assert.ok(V2_ABILITY_TEMPLATE_IDS.includes('peekTopOne'));
 const program=expandAbilityTemplates({onPlay:[{template:'peekTopOne'}]});
 assert.deepEqual(program,{onPlay:[{op:'peekTopOne'}]});
 // The official BLC-2-055 BOTTOM ability must NOT be replaced by OUTSIDE.
 assert.ok(BLEACH_CORE_GAP_SCENARIOS.find(x=>x.id==='BLC-2-055').missing.includes('BOTTOM'));
});
test('batch opponent BP down has no printed minimum-BP threshold and cannot stand in for BLC-2-007',()=>{
 const effect=expandAbilityTemplates({onPlay:[{template:'enemyFrontAllBpDown',bp:500}]});
 assert.deepEqual(effect,{onPlay:[{op:'enemyFrontAllBpDown',bp:500}]});
 assert.ok(!Object.hasOwn(effect.onPlay[0],'minBp'));
});
