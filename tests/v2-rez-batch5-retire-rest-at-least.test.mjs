import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {assertUniversalMatch,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

test('REZ-2-040 uses a current-BP at-least REST, not the under-BP op',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-040'].effectJa,
  '[退場時]BP4500以上の相手のフロントLのキャラを1枚まで選び、レストにする。');
 assert.deepEqual(rez.cards['REZ-2-040'].effects.onRetire,
  [{op:'restOppFrontBpAtLeast',bp:4500,optional:true}]);
 assert.deepEqual(expandAbilityTemplates({onRetire:[
  {template:'restEnemyFrontBpAtLeast',bp:4500,optional:true}]}),
  {onRetire:[{op:'restOppFrontBpAtLeast',bp:4500,optional:true}]});
 const body={id:'X',name:'X',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl'};
 const make=effects=>createUniversalPack({id:'rest-floor',cards:[{...body,effects}]});
 assert.throws(()=>make({onPlay:[{op:'restOppFrontBpAtLeast',bp:4500,optional:true}]}),
  /onRetire/);
 assert.throws(()=>make({onRetire:[{op:'restOppFrontBpAtLeast',bp:4500,optional:false}]}),
  /BP-at-least/);
 assert.throws(()=>make({onRetire:[{op:'restOppFrontBpAtLeast',bp:4400,optional:true}]}),
  /BP-at-least/);
 assert.throws(()=>expandAbilityTemplates({onRetire:[
  {template:'restEnemyFrontBpAtLeast',bp:4500,optional:false}]}),/invalid/);
});

function battle(){
 let s=fresh(undefined,1040);
 const attacker=take(s,0,'REZ-2-046');attacker.ready=true;s.players[0].front[0]=attacker;
 const bystander=take(s,0,'REZ-2-049');bystander.ready=true;
 bystander.buffs=[{bp:1500,untilTurn:s.turn}];
 s.players[0].front[1]=bystander;
 const small=take(s,0,'REZ-2-014');small.ready=true;s.players[0].front[2]=small;
 const hidden=take(s,0,'REZ-2-055');hidden.ready=true;
 hidden.buffs=[{bp:4000,untilTurn:s.turn}];
 s.players[0].energy[0]=hidden;
 const heinkel=take(s,1,'REZ-2-040');heinkel.ready=true;s.players[1].front[0]=heinkel;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(s.pending?.kind,'block');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:heinkel.uid},{actor:1});
 return {s,attacker,bystander,small,hidden,heinkel};
}

test('retiring REZ-2-040 offers only opposing front characters whose current BP is at least 4500',()=>{
 const {s,attacker,bystander,small,hidden,heinkel}=battle();
 assert.ok(s.players[1].outside.some(c=>c.uid===heinkel.uid));
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.equal(s.pending.minBp,4500);
 assert.equal(s.pending.limit,null);
 assert.deepEqual(s.pending.choices,[bystander.uid]);
 assert.equal(s.pending.choices.includes(attacker.uid),false);
 assert.equal(s.pending.choices.includes(small.uid),false);
 assert.equal(s.pending.choices.includes(hidden.uid),false);
 const declined=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseRestBp',uid:null},{actor:1});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front.find(c=>c?.uid===bystander.uid).ready,true);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseRestBp',uid:attacker.uid},{actor:1}),
  /not currently legal|Illegal opponent REST/);
 const rested=dispatchUniversalAction(rezPacks,s,{type:'chooseRestBp',uid:bystander.uid},{actor:1});
 assert.equal(rested.pending,null);
 assert.equal(rested.players[0].front.find(c=>c?.uid===bystander.uid).ready,false);
 assert.equal(assertUniversalMatch(rezPacks,rested),true);
});

test('REZ-2-040 with no front character at 4500 or more does not open a REST choice',()=>{
 let s=fresh(undefined,1041);
 const attacker=take(s,0,'REZ-2-046');attacker.ready=true;s.players[0].front[0]=attacker;
 const heinkel=take(s,1,'REZ-2-040');heinkel.ready=true;s.players[1].front[0]=heinkel;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:heinkel.uid},{actor:1});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===heinkel.uid));
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
