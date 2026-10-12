import test from 'node:test';
import assert from 'node:assert/strict';
import {attachFacedown,visibleAttached,removeAttached,legalOutsideRaid,resolveOutsideRaid,canTriggerRyuu,claimRyuuEntry} from '../dist/solo-shared-mechanics.mjs';
const fixture=()=>({turn:8,players:[
 {field:[],deck:[],outside:[],hand:[],removed:[],availableEnergy:4},
 {field:[],deck:[],outside:[],hand:[],removed:[],availableEnergy:4}
]});
const card=(uid,cardId=uid,extra={})=>({uid,cardId,...extra});
test('FAQ Q2053/Q2064 owner may inspect facedown attachment; opponent cannot see UID or card ID',()=>{
 const s=fixture();s.players[0].field.push(card('host'));s.players[0].deck.push(card('secret','SLG-1-055'));
 attachFacedown(s,{owner:0,hostUid:'host',cardUid:'secret'});
 assert.deepEqual(visibleAttached(s,{viewer:0,owner:0,hostUid:'host'}),[{uid:'secret',cardId:'SLG-1-055',faceDown:true}]);
 assert.deepEqual(visibleAttached(s,{viewer:1,owner:0,hostUid:'host'}),[{faceDown:true}]);
 assert.equal(s.players[0].deck.length,0);
 assert.throws(()=>attachFacedown(s,{owner:1,hostUid:'host',cardUid:'secret'}));
 removeAttached(s,{owner:0,hostUid:'host',cardUid:'secret'});
 assert.equal(s.players[0].outside[0].uid,'secret');
 assert.deepEqual(visibleAttached(s,{viewer:1,owner:0,hostUid:'host'}),[]);
});
test('FAQ Q2054 eligible green Sung Jinwoo moves from outside onto base with no card duplication',()=>{
 const s=fixture();s.players[0].field.push(card('base','SLG-1-003',{name:'水篠 旬'}));
 s.players[0].outside.push(card('raid','SLG-1-050',{type:'character',raidName:'水篠 旬',color:'green'}));
 assert.equal(legalOutsideRaid(s,{player:0,raidUid:'raid',baseUid:'base'}),true);
 const top=resolveOutsideRaid(s,{player:0,raidUid:'raid',baseUid:'base'});
 assert.equal(top.ready,true);assert.equal(top.stack[0].uid,'base');
 assert.equal(s.players[0].outside.length,0);assert.equal(s.players[0].field.length,1);
 assert.throws(()=>resolveOutsideRaid(s,{player:0,raidUid:'raid',baseUid:'base'}));
});
test('FAQ Q2054 rejects missing base, wrong color and insufficient energy without zone mutations',()=>{
 const s=fixture(),p=s.players[0];p.outside.push(card('r','r',{type:'character',raidName:'水篠 旬',color:'green'}));
 assert.equal(legalOutsideRaid(s,{player:0,raidUid:'r',baseUid:'absent'}),false);
 p.field.push(card('b','b',{name:'水篠 旬'}));p.availableEnergy=3;
 assert.equal(legalOutsideRaid(s,{player:0,raidUid:'r',baseUid:'b'}),false);
 assert.throws(()=>resolveOutsideRaid(s,{player:0,raidUid:'r',baseUid:'b'}));
 assert.equal(p.outside.length,1);assert.equal(p.field[0].uid,'b');
});
test('FAQ Q2063 all copies Ryuu share entry trigger per player per turn',()=>{
 const s=fixture();s.players[0].field.push(card('one','SLG-1-073'),card('two','SLG-1-073'));
 assert.equal(claimRyuuEntry(s,{player:0,uid:'one'}),true);
 assert.equal(canTriggerRyuu(s,{player:0,uid:'two'}),false);
 assert.equal(claimRyuuEntry(s,{player:0,uid:'two'}),false);
 s.turn++;
 assert.equal(claimRyuuEntry(s,{player:0,uid:'two'}),true);
});
