import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('online battle UI keeps optional MHA card catalog lazy and renders supplied translated card definitions',()=>{
 const ui=readFileSync(new URL('../dist/universal-v2/online-battle-ui.mjs',import.meta.url),'utf8');
 const entry=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/import\s*\{[^}]*getTitle[^}]*\}\s*from\s*['"][^'"]*title-registry\.mjs/);
 assert.doesNotMatch(ui,/MHA_PRINTED_ZH/);
 assert.match(entry,/import\('\.\/title-registry\.mjs\?v=/);
 assert.match(entry,/definition:onlineCardDefinition\(card\?\.cardId\)/);
 assert.match(ui,/const name=definition\.name\|\|card\.name\|\|card\.cardId/);
 assert.match(ui,/const effect=definition\.effect\|\|definition\.text\|\|definition\.description/);
 assert.match(ui,/const name=printed\.name\|\|card\.name\|\|card\.cardId/);
});
