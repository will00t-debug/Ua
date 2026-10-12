import test from 'node:test';
import assert from 'node:assert/strict';
import {mstEnter,mstChoose,mstFieldRetire} from '../dist/mst-entry-effects.mjs';
const card=(uid,cardId='MST-1-001')=>({uid,cardId,ready:false,buffs:[]});
function fixture(){
 return {turn:4,players:[
 {deck:[card('d1'),card('d2')],hand:[card('h1')],outside:[],front:[card('f1','MST-1-007'),card('field','MST-1-075'),null,null],energy:[card('e1','MST-1-051'),null,null,null]},
 {deck:[card('od1')],hand:[],outside:[],front:[null,null,null,null],energy:[null,null,null,null]}
 ]};
}
test('Roxy 051 and Rudeus 022 draws, then player legally chooses a discard',()=>{
 const initial=fixture(),before=structuredClone(initial);
 let s=mstEnter(initial,{player:0,cardId:'MST-1-051'});
 assert.deepEqual(initial,before,'pure reducer must not mutate caller state');
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.pendingMst.kind,'discard');
 assert.deepEqual(s.pendingMst.options,['h1','d1']);
 assert.throws(()=>mstChoose(s,{player:1,selection:'d1'}),/沒有合法/);
 assert.throws(()=>mstChoose(s,{player:0,selection:'illegal'}),/不合法/);
 s=mstChoose(s,{player:0,selection:'h1'});
 assert.equal(s.players[0].outside[0].uid,'h1');
 assert.deepEqual(s.players[0].hand.map(c=>c.uid),['d1']);
 assert.equal(s.pendingMst,null);
});
test('Nanahoshi 061 may buff another owned character, not a field or itself',()=>{
 const s=mstEnter(fixture(),{player:0,cardId:'MST-1-061',uid:'f1'});
 assert.equal(s.pendingMst.kind,'buff');
 assert.deepEqual(s.pendingMst.options,['e1']);
 const result=mstChoose(s,{player:0,selection:'e1'});
 assert.deepEqual(result.players[0].energy[0].buffs,[{turn:4,bp:1000,source:'MST-1-061'}]);
 const passed=mstChoose(s,{player:0,selection:null});
 assert.equal(passed.players[0].energy[0].buffs.length,0);
});
test('Plushena 069 reveals only top card, choose outside or retain top',()=>{
 const initial=fixture();
 const a=mstEnter(initial,{player:0,cardId:'MST-1-069'});
 assert.deepEqual(mstChoose(a,{player:0,selection:'top'}).players[0].deck.map(c=>c.uid),['d1','d2']);
 const b=mstChoose(a,{player:0,selection:'outside'});
 assert.deepEqual(b.players[0].deck.map(c=>c.uid),['d2']);
 assert.equal(b.players[0].outside[0].uid,'d1');
});
test('Norn 063 condition and Labyrinth 075 retirement draw resolve exactly once',()=>{
 let s=mstEnter(fixture(),{player:0,cardId:'MST-1-063',generatedEnergy:6});
 assert.equal(s.players[0].hand.length,1);
 s=mstEnter(fixture(),{player:0,cardId:'MST-1-063',generatedEnergy:7});
 assert.equal(s.players[0].hand.length,2);
 s=mstFieldRetire(fixture(),{player:0,cardId:'MST-1-075'});
 assert.equal(s.players[0].hand.length,2);
});
test('entry reducer explicitly rejects unknown card instead of marking it automatic',()=>{
 assert.throws(()=>mstEnter(fixture(),{player:0,cardId:'MST-1-080'}),/尚未實作/);
});
