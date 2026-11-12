import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report = JSON.parse(readFileSync(new URL('../audit/ai-v3-neon-integration-e2e.json', import.meta.url), 'utf8'));
const clicker = readFileSync(new URL('../scripts/ai-v3-start-hard-preview-e2e.mjs', import.meta.url), 'utf8');

test('the unfinished mobile white-sword extra ran out of test time while the engine was still advancing', () => {
 const [unfinished, finished] = report.extra.filter(game => game.deck === 'white-sword' && game.mobile && game.width === 412);
 assert.ok(unfinished);
 assert.equal(unfinished.finished, false);
 assert.equal(unfinished.elapsedMs >= 150000 && unfinished.elapsedMs < 160000, true);
 assert.equal(unfinished.timeouts, 0);
 assert.equal(unfinished.rejected, 0);
 assert.equal(unfinished.error, '');
 assert.equal(unfinished.stuck, false);
 assert.equal(unfinished.clicks > 0, true);
 assert.equal(unfinished.policy, 'hybrid-start-hard-v1');
 assert.equal(unfinished.lanes['start/hard'] > 0, true);
 assert.equal(unfinished.lanes['pending/v3'] > 0, true);
 assert.equal(unfinished.lanes['battle/v3'] > 0, true);
 assert.equal(unfinished.clickKinds.includes('下一階段'), true);
 assert.equal(unfinished.clickKinds.includes('結束回合'), true);
 assert.equal(unfinished.gestures.raidCommit || 0, 0);
 assert.equal(unfinished.buttons.includes('重新選擇角色'), true);
 assert.equal(unfinished.buttons.some(text => text.includes('下一階段') || text.includes('結束回合')), false);
 assert.equal(unfinished.sample.some(line => line.startsWith('電腦：')), true);
 assert.equal(finished.finished, true);
 assert.equal(finished.width, 412);
 assert.equal(finished.timeouts, 0);
 assert.equal(finished.rejected, 0);
 assert.equal(finished.error, '');
 assert.equal(finished.elapsedMs < 150000, true);
 assert.equal(finished.gestures.raidBase, 1);
 assert.equal(finished.gestures.raidCommit, 1);
 assert.match(clicker, /if \(!log\.raidCommit && selected && pendingHand\)/);
 assert.match(clicker, /if \(log\.raidCommit && cell\)/);
 assert.match(clicker, /const gameMs = Number\(process\.env\.AI_V3_E2E_MS \|\| 150000\)/);
});
