import test from 'node:test';
import assert from 'node:assert/strict';
import {appendCompletedMove,completedMovesMatching} from '../dist/universal-v2/zone-move-events.mjs';

function state(){
 const base={uid:'0-3',cardId:'BASE',stack:[],under:[]};
 const top={uid:'0-4',cardId:'TOP',stack:[base],under:[]};
 return {s:{turn:1,zoneMoveEvents:[],nextZoneMoveOrder:1,players:[
  {front:[top,null,null,null],energy:[null,null,null,null]},
  {front:[null,null,null,null],energy:[null,null,null,null]}]},base,top};
}
test('real nested Raid base is present only as raid-under, never falsely as visible front',()=>{
 const {s,base,top}=state();
 const event=appendCompletedMove(s,{uid:base.uid,cardId:base.cardId,
  owner:0,controller:0,from:'front',to:'raid-under',reason:'rule',
  sourceUid:top.uid,sourceCardId:top.cardId,sourceName:'RaidTop',
  sourceColor:'yellow',sourceOnField:true});
 assert.deepEqual([event.order,event.from,event.to,event.uid,event.sourceUid],
  [1,'front','raid-under',base.uid,top.uid]);
 assert.equal(completedMovesMatching(s,{from:'front',to:'raid-under',owner:0}).length,1);
 assert.equal(s.nextZoneMoveOrder,2);
});
test('Raid movement journal rejects forged UID, wrong owner or visible top as buried',()=>{
 const {s,base,top}=state();
 const attempt=(uid,owner=0)=>appendCompletedMove(s,{uid,cardId:'BASE',owner,
  controller:0,from:'front',to:'raid-under',reason:'rule'});
 for(const [uid,owner] of [['0-999',0],[top.uid,0],[base.uid,1]])
  assert.throws(()=>attempt(uid,owner),/Zone provenance|Invalid V2/);
 assert.equal(s.zoneMoveEvents.length,0);
 assert.equal(s.nextZoneMoveOrder,1);
});
