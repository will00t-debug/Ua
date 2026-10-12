import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_IMPLEMENTED_HAND_EVENTS,legalTtgHandEvents,dispatchTtgHandEvent} from '../dist/ttg-event-resolver.mjs';
const ap=()=>[{uid:'p0',ready:true},{uid:'p1',ready:false},{uid:'p2',ready:true}];
const blank=()=>({front:Array(4).fill(null),energy:Array(4).fill(null),apCards:ap(),hand:[],outside:[],energyProduced:{red:4,green:3}});
const game=()=>({phase:'main',active:0,players:[blank(),blank()],log:[]});
const card=(uid,cardId,nameJa,bp=2000,extra={})=>({uid,cardId,nameJa,bp,ready:true,stack:[],under:[],...extra});
const uids=pl=>[...pl.hand,...pl.outside,...pl.front.filter(Boolean).flatMap(c=>[c,...(c.stack||[]),...(c.under||[])])].map(c=>c.uid);

test('only six explicitly implemented hand-event effects are offered',()=>{
 assert.deepEqual([...TTG_IMPLEMENTED_HAND_EVENTS].sort(),['TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-078','TTG-1-079','TTG-1-081']);
 const s=game();
 for(const id of TTG_IMPLEMENTED_HAND_EVENTS)s.players[0].hand.push(card('u'+id,id,'Event'));
 s.players[0].hand.push(card('unknown','TTG-1-080','Unsupported'));
 s.players[1].front[0]=card('enemy','TTG-1-005','キタン',3000);
 assert.equal(legalTtgHandEvents(s,0).length,6);
 assert.equal(legalTtgHandEvents(s,1).length,0);
 assert.equal(legalTtgHandEvents({...s,phase:'attack'},0).length,0);
});
test('printed green/red energy and physical AP are checked before offering actions',()=>{
 const s=game();s.players[0].hand.push(card('g','TTG-1-036','green'),card('r','TTG-1-081','red'));
 s.players[1].front[0]=card('enemy','TTG-1-005','キタン',3000);
 s.players[0].energyProduced={red:3,green:3};
 assert.deepEqual(legalTtgHandEvents(s,0).map(x=>x.handUid),['g']);
 assert.throws(()=>dispatchTtgHandEvent(s,{player:0,handUid:'r',payApUids:['p0'],targetUid:'enemy'}));
 s.players[0].energyProduced={red:4,green:2};
 assert.deepEqual(legalTtgHandEvents(s,0).map(x=>x.handUid),['r']);
 s.players[0].apCards.forEach(x=>x.ready=false);
 assert.deepEqual(legalTtgHandEvents(s,0),[]);
});
test('Q2301 Giga Drill destroys legal front target, pays one AP, discards event once',()=>{
 const s=game();s.players[0].hand.push(card('evt','TTG-1-081','ギガドリルブレイク'));
 s.players[1].front[0]=card('opp','TTG-1-005','キタン',3000);
 s.players[1].energy[0]=card('hidden','TTG-1-050','キヨウ',1000);
 assert.deepEqual(legalTtgHandEvents(s,0)[0].targetUids,['opp']);
 const before=JSON.stringify(s);
 const result=dispatchTtgHandEvent(s,{player:0,handUid:'evt',payApUids:['p0'],targetUid:'opp'});
 assert.equal(JSON.stringify(s),before);
 assert.equal(result.players[0].apCards[0].ready,false);
 assert.deepEqual(result.players[0].hand,[]);
 assert.deepEqual(result.players[0].outside.map(c=>c.uid),['evt']);
 assert.deepEqual(result.players[1].outside.map(c=>c.uid),['opp']);
 assert.equal(result.players[1].front[0],null);
 assert.equal(result.players[1].energy[0].uid,'hidden');
 assert.deepEqual(uids(s.players[0]).sort(),uids(result.players[0]).sort());
});
test('Raid base Simon grants 5000 BP target threshold and retired stack remains physical',()=>{
 const s=game();s.players[0].hand.push(card('evt','TTG-1-081','ギガドリルブレイク'));
 s.players[0].energy[0]=card('raid','TTG-1-029','グレンラガン',4000,{
  stack:[card('simon','TTG-1-009','シモン',1500)]
 });
 s.players[1].front[0]=card('victim','TTG-1-075','ガンメン',5000,{
  stack:[card('base','TTG-1-050','キヨウ',2000)],
  under:[card('facedown','TTG-1-071',undefined,0,{faceDown:true})]
 });
 assert.deepEqual(legalTtgHandEvents(s,0)[0].targetUids,['victim']);
 const state=dispatchTtgHandEvent(s,{player:0,handUid:'evt',payApUids:['p0'],targetUid:'victim'});
 assert.deepEqual(state.players[1].outside.map(c=>c.uid),['victim','base','facedown']);
 assert.equal(new Set(state.players[1].outside.map(c=>c.uid)).size,3);
});
test('invalid target/insufficient AP/phase cannot spend AP or consume the event',()=>{
 const s=game();s.players[0].hand.push(card('evt','TTG-1-081','ギガドリルブレイク'));
 s.players[1].energy[0]=card('bad','TTG-1-050','キヨウ',2000);
 s.players[1].front[0]=card('protected','TTG-1-031','超銀河グレンラガン',2500,{cannotBeChosen:true});
 const before=JSON.stringify(s);
 for(const action of [
  {player:0,handUid:'evt',payApUids:['p0'],targetUid:'bad'},
  {player:0,handUid:'evt',payApUids:['p0'],targetUid:'protected'},
  {player:0,handUid:'evt',payApUids:['p1'],targetUid:'protected'},
  {player:0,handUid:'evt',payApUids:[],targetUid:'protected'}
 ])assert.throws(()=>dispatchTtgHandEvent(s,action));
 assert.equal(JSON.stringify(s),before);
});
test('FINAL-event printed AP-ready effects are executable after payment',()=>{
 for(const id of ['TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-078','TTG-1-079']){
  const s=game();s.players[0].hand.push(card('evt',id,id));
  s.players[0].apCards[1].ready=false;
  const r=dispatchTtgHandEvent(s,{player:0,handUid:'evt',payApUids:['p0'],readyApUids:['p0','p1']});
  assert.deepEqual(r.players[0].apCards.map(c=>c.ready),[true,true,true]);
  assert.deepEqual(r.players[0].outside.map(x=>x.cardId),[id]);
  assert.equal(s.players[0].apCards[1].ready,false);
 }
});
test('AP recovery disallows opponent AP, duplicate selection, and fake hand UID',()=>{
 const s=game();s.players[0].hand.push(card('evt','TTG-1-078','red FINAL'));
 for(const x of [
  {player:0,handUid:'evt',payApUids:['p0'],readyApUids:['p0','p0']},
  {player:0,handUid:'evt',payApUids:['p0'],readyApUids:['p0','p1','p2']},
  {player:0,handUid:'evt',payApUids:['p0'],readyApUids:['enemyToken']},
  {player:0,handUid:'other',payApUids:['p0'],readyApUids:[]}
 ])assert.throws(()=>dispatchTtgHandEvent(s,x));
 assert.deepEqual(s.players[0].outside,[]);
 assert.equal(s.players[0].hand[0].uid,'evt');
});
