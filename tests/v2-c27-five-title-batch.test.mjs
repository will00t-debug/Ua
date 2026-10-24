import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';

// UA15BT/SAO-1-083 generated energy: ico_resource_energy_green3.png is the
// two-pip sprite (alt 緑緑). Required energy stays green 3. GPT FAQ branch
// had not corrected the imported gen 3.

test('SAO-1-083 generated energy is two green pips and required energy stays 3',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-083');
 const card=registeredV2TitlePack('sword-art-online').cards['SAO-1-083'];
 assert.equal(source.number,'UA15BT/SAO-1-083');
 assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
 assert.equal(source.energy,3);
 assert.equal(source.ap,2);
 assert.equal(source.bp,3000);
 assert.equal(source.gen,2);
 assert.equal(card.energy,3);
 assert.equal(card.gen,2);
 assert.equal(card.ap,2);
 assert.equal(card.name,'リズベット');
});
