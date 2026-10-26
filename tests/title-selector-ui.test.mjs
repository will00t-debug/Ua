import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES,validateTitleMembership} from '../dist/title-registry.mjs';
import {CARDS} from '../dist/cards.mjs';
import {TTG_CARDS} from '../dist/ttg-builder.mjs';
import {TTG_PENDING_CARDS} from '../dist/ttg-pending.mjs';
import {SAO_CARDS} from '../dist/sao-cards.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {MST_CARDS} from '../dist/mst-builder.mjs';
import {REZERO_VOL2_CARDS} from '../dist/rezero-vol2.mjs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('registered titles and verified card inventory are available in deck builders',()=>{
 assert.deepEqual(TITLES.map(t=>t.id),['bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei','rezero']);
 assert.equal(CARDS.length,276);
 assert.equal(TTG_CARDS.length,81);
 assert.equal(TTG_PENDING_CARDS.length,0);
 assert.equal(SAO_CARDS.length,183);
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 assert.equal(MST_CARDS.length,80);
 assert.equal(REZERO_VOL2_CARDS.length,73);
 assert.deepEqual(TITLES.map(t=>t.playable),[true,false,false,false,false,false]);
});
test('four new editors and source-link inspection exist while BLEACH Raid is preserved',()=>{
 assert.match(app,/data-title=/);
 for(const route of ['ttgLibrary','saoLibrary','soloLibrary','mstLibrary','rezLibrary'])assert.match(app,new RegExp('return '+route+'\\(\\)'));
 for(const k of ['ua-ttg-draft-v1','ua-sao-draft-v1','ua-slg-draft-v1','ua-mst-draft-v1','ua-rez-draft-v1'])assert.ok(app.includes(k));
 for(const marker of ['天元突破 81/81 張已接入共用對戰入口（Beta）','刀劍神域尚未開放對戰','我獨自升級 80/80 張已接入共用對戰入口（Beta）','無職轉生尚未開放對戰','Re:從零 Vol.2 尚未開放對戰'])assert.ok(app.includes(marker));
 assert.match(app,/raidFlow/);
 assert.match(app,/window\.open\(c\.source/);
});
test('cross-title mixes reject and AP art is not added to a regular deck',()=>{
 const ids=[CARDS[0],TTG_CARDS[0],SAO_CARDS[0],SOLO_LEVELING_CARDS[0],MST_CARDS[0],REZERO_VOL2_CARDS[0]];
 const byId=Object.fromEntries(ids.map(c=>[c.id,c]));
 assert.equal(validateTitleMembership(Object.fromEntries(ids.map(c=>[c.id,1])),byId).length,1);
 for(const t of TITLES)assert.ok(t.cards.every(c=>c.type!=='action-point'&&c.type!=='action_point'));
});
