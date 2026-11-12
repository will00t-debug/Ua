import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aiPolicyFor} from '../dist/universal-v2/ai-driver-safety.mjs';
import {policyDifficulty} from '../dist/universal-v2/ai-policy-label.mjs';
import {MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';

const page = readFileSync(new URL('../dist/universal-v2-preview.mjs', import.meta.url), 'utf8');

function shown(options){
 return aiPolicyFor(policyDifficulty(options));
}

test('lobby selection is shown before a match, and a live match keeps its launch difficulty', () => {
 assert.equal(shown({matchStarted: false, matchDifficulty: 'normal', lobbyDifficulty: 'normal'}), 'normal');
 assert.equal(shown({matchStarted: false, matchDifficulty: 'normal', lobbyDifficulty: 'hard'}), 'hard-search-2');
 assert.equal(shown({matchStarted: false, matchDifficulty: 'normal', lobbyDifficulty: 'easy'}), 'easy');
 assert.equal(shown({matchStarted: false, matchDifficulty: 'hard', lobbyDifficulty: 'normal'}), 'normal');
 assert.equal(shown({matchStarted: false, matchDifficulty: 'normal', lobbyDifficulty: 'learned'}), 'learned-v1');
 assert.equal(shown({matchStarted: true, matchDifficulty: 'hard', lobbyDifficulty: 'easy'}), 'hard-search-2');
 assert.equal(shown({matchStarted: true, matchDifficulty: 'learned', lobbyDifficulty: 'normal'}), 'learned-v1');
 assert.equal(shown({matchStarted: true, matchDifficulty: 'easy', lobbyDifficulty: 'hard'}), 'easy');
 assert.equal(shown({matchStarted: false, matchDifficulty: 'normal', lobbyDifficulty: 'not-a-level'}), 'normal');
});

test('the policy line reads the lobby select only when no match is running', () => {
 const body = page.split('function currentAiPolicy(){')[1].split('function paintAiPolicy(){')[0];
 assert.match(body, /if\(hybridStartOn\(\)\)return HYBRID_START_HARD_POLICY/);
 assert.match(body, /if\(hybridMainOn\(\)\)return HYBRID_MAIN_POLICY/);
 assert.match(body, /if\(searchPreviewOn\(\)\)return AI_V3_POLICY/);
 assert.match(body, /matchStarted:!!app\.state/);
 assert.match(body, /lobbyDifficulty:lobby/);
 assert.doesNotMatch(body, /app\.aiDifficulty\|\|\$\('ai-level'\)/);
 assert.match(page, /\$\('ai-level'\)\.value=difficulty;\n\s*syncMatchLobby\(\);markLobbyChanged\(\);rememberMatchLobby\(\);\n\s*paintAiPolicy\(\);/);
 assert.match(page, /if\(id==='ai-level'\)paintAiPolicy\(\)/);
 assert.match(page, /chooseProgressSafeAiAction\(app\.packs,app\.state,\s*\{difficulty:app\.aiDifficulty/);
 assert.equal(MATCH_LIMITS.nodes, 48);
 assert.equal(MATCH_LIMITS.ms, 40);
});
