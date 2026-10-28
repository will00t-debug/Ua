import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('option B keeps the phase tracker and next action in one row between players, without TURN heading',()=>{
 const script=read('dist/universal-v2-preview.mjs');
 const render=script.split('function render(){')[1]?.split('function applyAction(a)')[0];
 assert.ok(render,'the battle renderer must be present');
 assert.match(render,/const next=legal\.find\(a=>a\.type==='next'\)/);
 assert.match(render,/const middle=el\('section',\{class:'v2-middle-controls'/);
 assert.match(render,/middle\.append\(phasesEl\)/);
 assert.doesNotMatch(render,/middle\.append\(el\('div',\{class:'centerLine'/);
 assert.doesNotMatch(render,/text:'TURN '\+s\.turn/);
 assert.match(render,/middle\.append\(el\('div',\{class:'v2-middle-next'/);
 assert.match(render,/if\(next&&uiActor\(s\)===0&&!app\.busy\)/);
 assert.match(render,/btn\(s\.phase==='attack'\?'結束回合 →':'下一階段 →',\(\)=>applyAction\(next\),'btn primary'\)/);
 assert.match(render,/arena\.append\(legacyPlayer\(v,1,legal\),middle,legacyPlayer\(v,0,legal\)\)/);
 assert.equal(render.match(/class:'phaseBar'/g)?.length,1);
 assert.equal(render.match(/class:'v2-middle-next'/g)?.length,1);
 assert.ok(render.indexOf('middle.append(phasesEl)')<render.indexOf("middle.append(el('div',{class:'v2-middle-next'"));
 assert.ok(render.indexOf('arena.append(legacyPlayer(v,1,legal),middle')<render.indexOf('arena.append(handArea)'));
});

test('phase controls use a compact single-line layout, including phone widths',()=>{
 const classic=read('dist/universal-v2-legacy.css');
 const battle=read('dist/universal-v2-battle.css');
 assert.match(classic,/#match-view \.v2-middle-controls\{[\s\S]*?display:flex;align-items:center;justify-content:center;flex-wrap:nowrap/);
 assert.match(classic,/#match-view \.v2-middle-controls \.phaseBar\{[\s\S]*?flex-wrap:nowrap/);
 assert.match(classic,/#match-view \.v2-middle-next\{[\s\S]*?width:auto;max-width:none/);
 assert.match(classic,/#match-view \.v2-middle-next button\{[\s\S]*?width:auto;min-height:36px/);
 assert.match(classic,/@media\(max-width:620px\)\{\s*\.v2-shell #match-view \.v2-middle-controls/);
 assert.match(classic,/#match-view \.v2-middle-next button\{[\s\S]*?background:transparent/);
 assert.match(battle,/body\.v2-battle-page \.v2-shell #match-view \.v2-middle-controls\{/);
 assert.match(battle,/#match-view \.v2-middle-controls \.phaseBar \.current\{/);
 assert.match(battle,/#match-view \.v2-middle-next button\{\s*background:transparent/);
});
