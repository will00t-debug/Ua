import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('phase tracker and legal next action render between both player boards exactly once',()=>{
 const script=read('dist/universal-v2-preview.mjs');
 const render=script.split('function render(){')[1]?.split('function applyAction(a)')[0];
 assert.ok(render,'the battle renderer must be present');
 assert.match(render,/const next=legal\.find\(a=>a\.type==='next'\)/);
 assert.match(render,/const middle=el\('section',\{class:'v2-middle-controls'/);
 assert.match(render,/middle\.append\(el\('div',\{class:'centerLine'/);
 assert.match(render,/middle\.append\(el\('div',\{class:'v2-middle-next'/);
 assert.match(render,/if\(next&&uiActor\(s\)===0&&!app\.busy\)/);
 assert.match(render,/btn\(s\.phase==='attack'\?'結束回合 →':'進入下一階段 →',\(\)=>applyAction\(next\),'btn primary'\)/);
 assert.match(render,/arena\.append\(legacyPlayer\(v,1,legal\),middle,legacyPlayer\(v,0,legal\)\)/);
 assert.doesNotMatch(render,/arena\.append\(phasesEl\)/);
 assert.doesNotMatch(render,/controls\.append\(btn\(uiActionLabel\(next/);
 assert.equal(render.match(/class:'phaseBar'/g)?.length,1);
 assert.equal(render.match(/class:'v2-middle-next'/g)?.length,1);
 assert.ok(render.indexOf("const middle=el('section'")<render.indexOf('arena.append(legacyPlayer(v,1,legal),middle'));
 assert.ok(render.indexOf('arena.append(legacyPlayer(v,1,legal),middle')<render.indexOf('arena.append(handArea)'));
});

test('both classic mobile and dedicated blue battle layouts center controls',()=>{
 const classic=read('dist/universal-v2-legacy.css');
 const battle=read('dist/universal-v2-battle.css');
 assert.match(classic,/#match-view \.v2-middle-controls\{[\s\S]*?justify-items:center/);
 assert.match(classic,/#match-view \.v2-middle-controls \.phaseBar\{[\s\S]*?justify-content:center/);
 assert.match(classic,/#match-view \.v2-middle-next button\{[\s\S]*?min-height:44px/);
 assert.match(classic,/@media\(max-width:620px\)\{\s*\.v2-shell #match-view \.v2-middle-controls/);
 assert.match(battle,/body\.v2-battle-page \.v2-shell #match-view \.v2-middle-controls\{/);
 assert.match(battle,/#match-view \.v2-middle-controls \.phaseBar \.current\{/);
});
