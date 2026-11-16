import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../dist/online.mjs', import.meta.url), 'utf8');
const start = source.indexOf('async function copyCode(code){');
const end = source.indexOf('async function cancelRoom(){', start);
assert.ok(start >= 0 && end > start, 'online room-code copy handler exists');
const handler = source.slice(start, end);

function setup(writeText) {
  const app = { notice: '已登入。' };
  const copied = [];
  let renders = 0;
  const navigator = { clipboard: { writeText: async (value) => { copied.push(value); await writeText(value); } } };
  const render = () => { renders += 1; };
  const copyCode = new Function('navigator', 'app', 'render', handler + '\nreturn copyCode;')(navigator, app, render);
  return { app, copied, copyCode, get renders() { return renders; } };
}

test('copying room code succeeds silently without a persistent banner', async () => {
  const ui = setup(async () => {});
  await ui.copyCode('CHER652V');
  assert.deepEqual(ui.copied, ['CHER652V']);
  assert.equal(ui.app.notice, '');
  assert.equal(ui.renders, 1);
});

test('failed clipboard access still displays the code for manual copy', async () => {
  const ui = setup(async () => { throw new Error('clipboard unavailable'); });
  await ui.copyCode('CHER652V');
  assert.equal(ui.app.notice, '房間代碼：CHER652V');
  assert.equal(ui.renders, 1);
});
