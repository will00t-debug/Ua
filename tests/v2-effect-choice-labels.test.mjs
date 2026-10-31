import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRezV2Pack} from '../dist/universal-v2/rez-pack.mjs';
import {mstV2Pack} from '../dist/universal-v2/mst-pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {uiActionLabel,pendingTextChoiceClass} from '../dist/universal-v2/preview-actions.mjs';

function asciiChoiceLabels(pack){
 const hits=[];
 const walk=node=>{
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){for(const item of node)walk(item);return;}
  if(typeof node.label==='string'&&/^[\x00-\x7F]+$/.test(node.label)&&/[A-Za-z]{3,}/.test(node.label))
   hits.push(node.label);
  for(const value of Object.values(node))if(value&&typeof value==='object')walk(value);
 };
 for(const card of Object.values(pack.cards||{}))walk(card);
 return hits;
}

test('choose-one labels that reach the table are Traditional Chinese',()=>{
 for(const pack of [createRezV2Pack(),mstV2Pack(),createBleachV2Pack(),createSlgV2Pack()])
  assert.deepEqual(asciiChoiceLabels(pack),[]);
 const engine=readFileSync(new URL('../dist/universal-v2/engine.mjs',import.meta.url),'utf8');
 assert.equal(engine.includes("label:'draw one'"),false);
 assert.equal(engine.includes('this character gains impact 1'),false);
 assert.equal(engine.includes('draw and put one hand card outside'),false);
});

test('REZ-2-062 raid-box choices stay Chinese and do not wear the raid outline',()=>{
 const felt=createRezV2Pack().cards['REZ-2-062'];
 assert.equal(felt.effects.onPlay,undefined);
 assert.equal(felt.mainAbility.raidBox,true);
 const options=felt.effects.onRaid[0].options;
 const state={pending:{kind:'effect-choice-mode',options}};
 assert.equal(uiActionLabel({type:'chooseEffectMode',mode:'draw'},{state}),'選擇效果：抽1張');
 assert.equal(uiActionLabel({type:'chooseEffectMode',mode:'active'},{state}),
  '選擇效果：使其他最多1張角色轉為ACTIVE');
 assert.equal(pendingTextChoiceClass({type:'chooseEffectMode',mode:'draw'}),'');
 assert.equal(pendingTextChoiceClass({type:'chooseEffectMode',mode:'active'}),'');
 assert.equal(pendingTextChoiceClass({type:'chooseEffectMode',mode:'raid'}),'recommended');
 assert.equal(pendingTextChoiceClass({type:'chooseEffectMode',mode:'skip'}),'quiet');
 assert.equal(pendingTextChoiceClass({type:'chooseDiscard',uid:'card'}),'recommended');
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/pendingTextChoiceClass\(action\)/);
});
