import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';

// Snapshot gate. Remove it only when BOTH official cards have full-print / FAQ
// tests and a separately reviewed explicit registration PR.
test('BLC-2-019/047 remain deliberately unregistered until all printed clauses pass',()=>{
 const registered=registeredV2TitlePack('bleach');
 assert.equal(registered.cards['BLC-2-019'],undefined);
 assert.equal(registered.cards['BLC-2-047'],undefined);
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
