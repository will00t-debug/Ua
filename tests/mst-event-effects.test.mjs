import test from 'node:test';
import assert from 'node:assert/strict';
import {mstEventOptions,mstApplyEvent} from '../dist/mst-event-effects.mjs';
const card=(uid,cardId)=>({uid,cardId,ready:true,buffs:[]});
const fixture=()=>({turn:5,players:[{
 deck:[card('d1','MST-1-001'),card('d2','MST-1-020'),card('d3','MST-1-022')],
 hand:[],outside:[],front:[card('eris','MST-1-007'),card('university','MST-1-060'),null,null],
 energy:[card('rudeus','MST-1-022'),null,null,null]
},{deck:[],hand:[],outside:[],front:[null,null,null,null],energy:[null,null,null,null]}]});
test('035 offers only named branches actually on own field',()=>{
 const s=fixture();
 assert.deepEqual(mstEventOptions(s,{player:0,cardId:'MST-1-035'}),['ルーデウス','エリス']);
 assert.throws(()=>mstApplyEvent(s,{player:0,cardId:'MST-1-035',choices:['ルイジェルド']}),/不可選擇/);
 const result=mstApplyEvent(s,{player:0,cardId:'MST-1-035',choices:['エリス','ルーデウス']});
 assert.equal(result.players[0].hand.length,2);
 assert.equal(result.players[0].deck.length,1);
 assert.equal(s.players[0].hand.length,0);
 assert.throws(()=>mstApplyEvent(s,{player:0,cardId:'MST-1-035',choices:['エリス','エリス']}),/重複/);
});
test('080 draws 2 and grants front-energy only to eligible academy front-line character',()=>{
 const s=fixture();
 assert.deepEqual(mstEventOptions(s,{player:0,cardId:'MST-1-080'}),['university']);
 assert.throws(()=>mstApplyEvent(s,{player:0,cardId:'MST-1-080',choices:['eris']}),/不可選擇/);
 const r=mstApplyEvent(s,{player:0,cardId:'MST-1-080',choices:['university']});
 assert.equal(r.players[0].hand.length,2);
 assert.equal(r.players[0].front[1].frontEnergyTurn,5);
 assert.equal(r.players[0].front[0].frontEnergyTurn,undefined);
});
test('080 without eligible field grants just draws; pending effects cannot be bypassed',()=>{
 let s=fixture();s.players[0].front.fill(null);
 assert.deepEqual(mstEventOptions(s,{player:0,cardId:'MST-1-080'}),[]);
 assert.equal(mstApplyEvent(s,{player:0,cardId:'MST-1-080'}).players[0].hand.length,2);
 s.pendingMst={player:0};assert.throws(()=>mstApplyEvent(s,{player:0,cardId:'MST-1-035'}),/先結算/);
});
