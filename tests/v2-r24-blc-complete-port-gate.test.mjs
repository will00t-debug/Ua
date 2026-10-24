import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';

test('BLC-2-019/047 are registered as whole printed programs',()=>{
 const registered=registeredV2TitlePack('bleach');
 const ichigo=registered.cards['BLC-2-019'];
 const event=registered.cards['BLC-2-047'];
 assert.equal(ichigo.raidName,'黒崎 一護');
 assert.equal(ichigo.mainAbility.op,'frontOnceProgram');
 assert.equal(ichigo.mainAbility.frontOnly,true);
 assert.equal(ichigo.effects.onPlay[0].op,'enemyBpDown');
 assert.equal(event.effects.onPlay[0].count,2);
 assert.equal(event.moveTriggers[0].then[0].op,'draw');
 assert.equal(event.moveTriggers[0].then[0].count,1);
 assert.equal(event.moveTriggers[0].when.sourceName,'黒崎 一護');
 assert.equal(event.moveTriggers[0].when.sourceColor,'blue');
});
test('typed named cost must not imply an unsupported temporary granted attack program',()=>{
 const base={id:'AUDIT-BLC019',name:'黒崎 一護',type:'character',
  color:'blue',energy:4,ap:1,bp:4000,gen:1,
  implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]},
  mainAbility:{op:'grantAttackProgram',oncePerTurn:true,
   payment:{zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']},
   then:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'not-whole-card',cards:[base]}),
  /unsupported|invalid|main/i);
});
