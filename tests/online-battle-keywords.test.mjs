import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchRoom} from '../server/domain.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS as baseCounts} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

test('both online viewers receive current field keywords while opponent hands stay hidden',()=>{
 const pack=officialV2Pack('bleach');
 const counts={...baseCounts,'BLC-1-048':1,'BLC-1-009':1,'BLC-1-074':1,'BLC-1-043':1};
 const match=newUniversalMatch([pack,pack],{decks:[counts,counts],first:0,seed:261102});
 for(let side=0;side<2;side++){
  const player=match.players[side];
  for(const [slot,id]of ['BLC-1-074','BLC-1-009','BLC-1-043'].entries()){
   const pool=['hand','deck','life'].map(zone=>player[zone]).find(cards=>cards.some(c=>c.cardId===id));
   const card=pool.splice(pool.findIndex(c=>c.cardId===id),1)[0];
   card.ready=side===0;card.fieldEntryStamp=match.nextFieldEntryStamp++;
   player.front[slot]=card;
  }
 }
 assert.equal(assertUniversalMatch([pack,pack],match),true);
 let room={code:'ABCD2345',status:'playing',revision:1,first:0,match,log:[],updatedAt:1,
  seats:[0,1].map(side=>({userId:'user'+side,username:'玩家'+side,title:'bleach',battleCounts:counts}))};
 const repos={pruneRooms(){},loadRoom:()=>structuredClone(room),saveRoom:r=>{room=structuredClone(r);}};
 for(const seat of [0,1]){
  const result=dispatchRoom(repos,{op:'view',code:room.code,userId:'user'+seat},2).public;
  assert.equal(result.view.players[seat].hand.length,match.players[seat].hand.length);
  assert.equal(result.view.players[1-seat].hand,null);
  for(const player of result.view.players){
   assert.equal(player.front[0].damage,2,'printed damage must be included before attack, even while REST');
   assert.equal(player.front[1].impact,1);
   assert.equal(player.front[2].impactNull,true);
  }
 }
});
