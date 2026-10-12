import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('BLEACH, TTG and Solo Leveling selectors are present in deck editor',()=>{
 assert.deepEqual(TITLES.map(t=>t.id),['bleach','gurren-lagann','solo-leveling']);
 assert.match(app,/data-title=/);
 assert.match(app,/ui\.title==='gurren-lagann'\)return ttgLibrary\(\)/);
 assert.match(app,/ui\.title==='solo-leveling'\)return soloLibrary\(\)/);
});
test('TTG deck drafts are isolated from BLEACH drafts and playable Raid',()=>{
 assert.match(app,/ua-ttg-draft-v1/);
 assert.match(app,/ua-ttg-saved-v1/);
 assert.match(app,/天元突破尚未開放對戰/);
 assert.match(app,/raidFlow/);
});
test('TTG card inspection uses source link rather than BLEACH cards',()=>{
 assert.match(app,/TTG_CARDS\.find/);
 assert.match(app,/window\.open\(c\.source/);
});
