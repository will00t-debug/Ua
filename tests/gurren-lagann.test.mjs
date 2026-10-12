import test from 'node:test';
import assert from 'node:assert/strict';
import {UA56BT_VERIFIED,UA56BT_BY_NUMBER,gigaDrillTargets} from '../dist/gurren-lagann.mjs';
import {TITLES,validateTitleMembership} from '../dist/title-registry.mjs';
import {CARDS,PRESETS} from '../dist/cards.mjs';
test('title registry does not alter existing BLEACH catalogue',()=>{
 assert.equal(TITLES[0].cards,CARDS);assert.equal(TITLES[0].presets,PRESETS);assert.equal(CARDS.length,276);
 assert.equal(TITLES[1].playable,false);assert.equal(TITLES[1].cards,UA56BT_VERIFIED);
});
test('verified TTG identities are unique and explicitly pending automation',()=>{
 assert.equal(new Set(UA56BT_VERIFIED.map(c=>c.identity)).size,UA56BT_VERIFIED.length);
 for(const c of UA56BT_VERIFIED){assert.equal(c.auto,false);assert.ok(c.source);assert.equal(c.image,null);}
 assert.equal(UA56BT_BY_NUMBER['UA56BT/TTG-1-081'].rarity,'U');
});
test('Giga Drill Break corrected ruling only chooses opponent FRONT line within threshold',()=>{
 const list=[{owner:'opponent',line:'front',bp:3000},{owner:'opponent',line:'energy',bp:500},{owner:'opponent',line:'front',bp:5000},{owner:'own',line:'front',bp:100}];
 assert.deepEqual(gigaDrillTargets(list),[list[0]]);
 assert.deepEqual(gigaDrillTargets(list,{hasSimonOrKamina:true}),[list[0],list[2]]);
});
test('title membership forbids cross-title decks',()=>{
 const cards={bleach:{id:'bleach'},ttg:{id:'ttg',title:'gurren-lagann'}};
 assert.deepEqual(validateTitleMembership({bleach:4,ttg:1},cards).length,1);
 assert.deepEqual(validateTitleMembership({bleach:4,ttg:0},cards),[]);
});
