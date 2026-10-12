import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlaySoloEvent,beginSoloEvent,chooseSoloEvent,enemyTargetsForSoloEvent,soloEventPreview} from '../dist/solo-event-rules.mjs';
import {assertSoloConservation} from '../dist/solo-phase-effects.mjs';
const setup=()=>({turn:3,active:0,phase:'main',pending:null,players:[0,1].map(()=>({field:[],deck:[],hand:[],outside:[],removed:[],life:[],ap:3,maxAp:3,availableEnergy:10}))});
const add=(s,id,zone='hand',player=0,uid=id,opts={})=>{const c={cardId:id,uid,owner:player,...opts};s.players[player][zone].push(c);return c;};
test('036 draws three then requires owner discard choices, preserves all card IDs',()=>{
 const s=setup();add(s,'SLG-1-036');for(let i=0;i<3;i++)add(s,'SLG-1-005','deck',0,'d'+i);
 assert.equal(soloEventPreview(s,'SLG-1-036').legal,true);
 beginSoloEvent(s,'SLG-1-036');assert.equal(s.players[0].ap,2);assert.equal(s.pending.left,2);
 assert.equal(s.players[0].hand.length,3);assert.throws(()=>chooseSoloEvent(s,{uid:'invalid'}),/illegal/);
 chooseSoloEvent(s,{uid:'d0'});assert.equal(s.pending.left,1);
 chooseSoloEvent(s,{uid:'d1'});assert.equal(s.pending,null);assert.equal(s.players[0].hand[0].uid,'d2');
 assertSoloConservation(s,4);
});
test('036 with exhausted deck discards only what can actually be discarded, not softlock',()=>{
 const s=setup();add(s,'SLG-1-036');beginSoloEvent(s,'SLG-1-036');assert.equal(s.pending,null);
 assertSoloConservation(s,1);
});
test('038/078/079 restore up to two real AP, cannot exceed max',()=>{
 for(const id of ['SLG-1-038','SLG-1-078','SLG-1-079']){
  const s=setup();s.players[0].ap=1;add(s,id);beginSoloEvent(s,id);
  assert.equal(s.players[0].ap,0);assert.throws(()=>chooseSoloEvent(s,{count:4}),/invalid/);
  chooseSoloEvent(s,{count:2});assert.equal(s.players[0].ap,2);assertSoloConservation(s,1);
 }
});
test('040 removal target BP threshold is conditional on Sung Jinwoo; no blind target selection',()=>{
 let s=setup();add(s,'SLG-1-040');
 add(s,'SLG-1-045','field',1,'enemy',{line:'front',currentBp:4500});
 beginSoloEvent(s,'SLG-1-040');assert.deepEqual(enemyTargetsForSoloEvent(s),[]);
 assert.throws(()=>chooseSoloEvent(s,{uid:'enemy'}),/illegal/);
 chooseSoloEvent(s,{uid:null});assert.equal(s.players[1].field.length,1);
 s=setup();add(s,'SLG-1-040');
 add(s,'SLG-1-045','field',0,'sung');
 add(s,'SLG-1-045','field',1,'enemy',{line:'front',currentBp:4500});
 beginSoloEvent(s,'SLG-1-040');assert.deepEqual(enemyTargetsForSoloEvent(s),['enemy']);
 chooseSoloEvent(s,{uid:'enemy'});assert.equal(s.players[1].outside[0].uid,'enemy');
 assertSoloConservation(s,3);
});
test('076 with extra-AP protection: only pay target selection cost if actually chosen',()=>{
 const s=setup();s.players[0].ap=1;add(s,'SLG-1-076');
 add(s,'SLG-1-045','field',1,'costly',{line:'front',currentBp:2000,extraTargetAp:1});
 beginSoloEvent(s,'SLG-1-076');assert.equal(s.players[0].ap,0);
 assert.deepEqual(enemyTargetsForSoloEvent(s),[]);assert.equal(s.players[0].ap,0);
 assert.throws(()=>chooseSoloEvent(s,{uid:'costly'}),/illegal/);
 chooseSoloEvent(s,{uid:null});assert.equal(s.players[0].ap,0);
});
test('077 five raid cards vs five distinct printed names lead to different effects',()=>{
 const s=setup();add(s,'SLG-1-077');add(s,'SLG-1-045','field',1,'victim',{line:'front',currentBp:4000});
 for(const [i,id] of ['SLG-1-054','SLG-1-055','SLG-1-060','SLG-1-061','SLG-1-062'].entries())
  add(s,id,'field',0,'raid'+i);
 beginSoloEvent(s,'SLG-1-077');
 assert.deepEqual(enemyTargetsForSoloEvent(s),['victim']);
 chooseSoloEvent(s,{uid:'victim'});assert.equal(s.pending.type,'raidBuff');
 assert.throws(()=>chooseSoloEvent(s,{uid:'no'}),/illegal buff/);
 chooseSoloEvent(s,{uid:'raid1'});assert.equal(s.players[0].field[1].buffs[0].bp,1000);
 assertSoloConservation(s,7);
});
test('080 draws one then selects optional own Shizuku, not unrelated characters',()=>{
 const s=setup();add(s,'SLG-1-080');add(s,'SLG-1-005','deck',0,'drawn');
 const shizuku=add(s,'SLG-1-055','field',0,'shizuku');
 const other=add(s,'SLG-1-045','field',0,'notshizuku');
 beginSoloEvent(s,'SLG-1-080');assert.equal(s.players[0].hand[0].uid,'drawn');
 assert.throws(()=>chooseSoloEvent(s,{uid:other.uid}),/Shizuku/);
 chooseSoloEvent(s,{uid:shizuku.uid});
 assert.equal(shizuku.granted[0].kind,'attackDraw');assert.equal(shizuku.granted[0].turn,s.turn);
 assertSoloConservation(s,4);
});
test('unsupported 037 event must never consume AP or hand card',()=>{
 const s=setup();add(s,'SLG-1-037');const before=s.players[0].ap;
 assert.equal(canPlaySoloEvent(s,'SLG-1-037'),false);
 assert.throws(()=>beginSoloEvent(s,'SLG-1-037'),/illegal/);
 assert.equal(s.players[0].ap,before);assert.equal(s.players[0].hand.length,1);
});

test('077 five trait cards but only four distinct printed names do not grant extra buff',()=>{
 const s=setup();add(s,'SLG-1-077');add(s,'SLG-1-045','field',1,'target',{line:'front',currentBp:3500});
 ['SLG-1-054','SLG-1-055','SLG-1-056','SLG-1-060','SLG-1-062'].forEach((id,i)=>add(s,id,'field',0,'member'+i));
 beginSoloEvent(s,'SLG-1-077');chooseSoloEvent(s,{uid:'target'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].field.every(c=>!c.buffs),true);
});
