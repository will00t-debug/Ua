import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditFixtureName} from '../dist/universal-v2/audit-entry.mjs';
import {loadAuditFixture} from '../dist/universal-v2/audit-browser-fixtures.mjs';

test('a public battle host ignores an audit query and any other query', () => {
 assert.equal(auditFixtureName('?audit=stg006', 'ua-arena.will00t.workers.dev'), '');
 assert.equal(auditFixtureName('?audit=blc067dual', 'bleach-arena.vercel.app'), '');
 assert.equal(auditFixtureName('?audit=stg006&foo=1', 'localhost.evil.test'), '');
 assert.equal(auditFixtureName('?deck=white-sword', '127.0.0.1'), '');
 assert.equal(auditFixtureName('', 'localhost'), '');
 assert.equal(auditFixtureName('?audit=', 'localhost'), '');
});

test('localhost can still name a legal audit fixture', () => {
 assert.equal(auditFixtureName('?audit=stg006', '127.0.0.1'), 'stg006');
 assert.equal(auditFixtureName('?audit=blc067dual', 'localhost'), 'blc067dual');
 assert.equal(auditFixtureName('?audit=aot2016', '::1'), 'aot2016');
 assert.equal(auditFixtureName('?audit=aot2016', '[::1]'), 'aot2016');
 const named = loadAuditFixture('stg006');
 assert.equal(named.state.players[0].energy[0].cardId, 'STG-1-006');
 assert.equal(loadAuditFixture('blc067dual').state.players[0].hand[0].cardId, 'BLC-2-067');
});

test('the battle boot asks the host gate before it loads a fixture', () => {
 const page = readFileSync(new URL('../dist/universal-v2-preview.mjs', import.meta.url), 'utf8');
 assert.match(page, /import \{auditFixtureName\} from '\.\/universal-v2\/audit-entry\.mjs'/);
 assert.match(page, /const auditName=auditFixtureName\(location\.search, location\.hostname\)/);
 assert.match(page, /const loaded=auditName\?null:loadSoloBattle\(sessionStorage\)/);
 assert.match(page, /if\(auditName\)\{\s*void startAuditFixture\(auditName\);\s*\}else if\(loaded\)/);
 assert.equal(page.includes("new URLSearchParams(location.search).get('audit')"), false);
});
