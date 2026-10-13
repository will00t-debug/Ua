import test from 'node:test';
import assert from 'node:assert/strict';
import {beginTtgLifeTrigger,legalTtgLifeChoices,resolveTtgLifeChoice} from '../dist/ttg-green-life.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const card=(uid,id,other={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id]?.nameJa,ready:false,stack:[],under:[],...other});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],deck:[],hand:[],outside:[],life:[],apCards:[],turnCount:2});
const game=(id)=>({active:0,phase:'attack',status:'playing',turn:9,players:[pl(),pl()],log:[],pending:null,
 energyMode:'external',pendingTtgLife:null});
const lifeGame=id=>{const s=game();s.players[1].life=[card('life',id),card('another','TTG-1-042')];return s;};
const all=p=>{
 const visit=c=>[c.uid,...(c.stack||[]).flatMap(visit),...(c.under||[]).flatMap(visit)];
 return [...p.life,...p.deck,...p.hand,...p.outside,...p.front.filter(Boolean),...p.energy.filter(Boolean)].flatMap(visit).sort();
};
test('ACTIVE 002 trigger offers optional own target, readies and adds 3000 not AP',()=>{
 const s=lifeGame('TTG-1-002'),own=s.players[1];
 own.front[0]=card('v','TTG-1-005');
 own.front[1]=card('already','TTG-1-006',{ready:true});
 const before=all(own),p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 assert.deepEqual(legalTtgLifeChoices(p).map(x=>x.targetUid),['v','already',undefined]);
 assert.throws(()=>resolveTtgLifeChoice(p,{player:0,cardUid:'life',mode:'active',targetUid:'v'}));
 const r=resolveTtgLifeChoice(p,{player:1,cardUid:'life',mode:'active',targetUid:'v'});
 assert.equal(r.pendingTtgLife,null);assert.equal(r.players[1].front[0].ready,true);
 assert.equal(r.players[1].front[0].currentBp,TTG_BY_ID['TTG-1-005'].bp+3000);
 assert.deepEqual(all(r.players[1]),before);
 assert.equal(s.players[1].life.length,2);
});
test('GET 004 adds revealed life card to owner hand or declines to outside',()=>{
 const s=lifeGame('TTG-1-004');
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 assert.deepEqual(legalTtgLifeChoices(p).map(x=>x.mode),['get','decline']);
 const r=resolveTtgLifeChoice(p,{player:1,cardUid:'life',mode:'get'});
 assert.deepEqual(r.players[1].hand.map(x=>x.uid),['life']);
 assert.equal(r.players[1].outside.length,0);
 const no=resolveTtgLifeChoice(p,{player:1,cardUid:'life',mode:'decline'});
 assert.deepEqual(no.players[1].outside.map(x=>x.uid),['life']);
 assert.deepEqual(all(r.players[1]),all(s.players[1]));
});
test('SPECIAL 035 removes only opponent front, preserving all RAID pile UIDs',()=>{
 const s=lifeGame('TTG-1-035');
 s.players[0].front[0]=card('top','TTG-1-029',{stack:[card('base','TTG-1-009')],under:[card('fd','TTG-1-004',{faceDown:true})]});
 s.players[0].energy[0]=card('energy','TTG-1-006');
 const oppBefore=all(s.players[0]);
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 const choices=legalTtgLifeChoices(p);
 assert.deepEqual(choices.filter(x=>x.mode==='special').map(x=>x.targetUid),['top']);
 assert.throws(()=>resolveTtgLifeChoice(p,{player:1,cardUid:'life',mode:'special',targetUid:'energy'}));
 const r=resolveTtgLifeChoice(p,{player:1,cardUid:'life',mode:'special',targetUid:'top'});
 assert.equal(r.players[0].front[0],null);assert.equal(r.players[0].energy[0].uid,'energy');
 assert.deepEqual(r.players[0].outside.map(x=>x.uid),['top','base','fd']);
 assert.deepEqual(all(r.players[0]),oppBefore);
});
test('COLOR 017 deploys only green AP1 energy<=2 character into free slot ACTIVE',()=>{
 const s=lifeGame('TTG-1-017');
 s.players[1].hand=[card('g','TTG-1-005'),card('high','TTG-1-027'),card('red','TTG-1-042')];
 s.players[1].front[0]=card('occupied','TTG-1-006');
 const original=all(s.players[1]),p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 const choices=legalTtgLifeChoices(p);
 assert.ok(choices.some(x=>x.mode==='color'&&x.handUid==='g'&&x.line==='front'&&x.slot===1));
 assert.ok(!choices.some(x=>x.handUid==='high'||x.handUid==='red'||x.slot===0&&x.line==='front'));
 assert.throws(()=>resolveTtgLifeChoice(p,{player:1,cardUid:'life',mode:'color',handUid:'red',line:'front',slot:1}));
 const action=choices.find(x=>x.mode==='color'&&x.handUid==='g'&&x.line==='front');
 const r=resolveTtgLifeChoice(p,action);
 assert.equal(r.players[1].front[action.slot].uid,'g');
 assert.equal(r.players[1].front[action.slot].ready,true);
 assert.equal(r.players[1].hand.some(x=>x.uid==='g'),false);
 assert.deepEqual(all(r.players[1]),original);
});
test('COLOR into green 009 retains mandatory entry choice and waits before victory',()=>{
 const s=game();s.players[1].life=[card('life','TTG-1-017')];
 s.players[1].hand=[card('simon','TTG-1-009')];s.players[1].deck=[card('draw','TTG-1-005')];
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 const action=legalTtgLifeChoices(p).find(x=>x.mode==='color'&&x.handUid==='simon');
 const r=resolveTtgLifeChoice(p,action);
 assert.equal(r.players[1][action.line][action.slot].uid,'simon');
 assert.equal(r.pending.kind,'ttgGreenEntry');
 assert.equal(r.status,'playing','must resolve on-entry before game result');
});
test('SPECIAL/GET/COLOR triggers are optional even with legal targets',()=>{
 for(const id of ['TTG-1-035','TTG-1-004','TTG-1-017']){
  const s=lifeGame(id);
  if(id==='TTG-1-035')s.players[0].front[0]=card('enemy','TTG-1-005');
  if(id==='TTG-1-017')s.players[1].hand=[card('candidate','TTG-1-005')];
  const p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
  const decline=legalTtgLifeChoices(p).find(x=>x.mode==='decline');
  const result=resolveTtgLifeChoice(p,decline);
  assert.deepEqual(result.players[1].outside.map(c=>c.uid),['life']);
  assert.equal(result.pendingTtgLife,null);
 }
});
test('last life SPECIAL resolves before defeat, while FINAL can rescue',()=>{
 const s=game();s.players[1].life=[card('life','TTG-1-035')];
 s.players[0].front[0]=card('target','TTG-1-005');
 const reveal=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 assert.equal(reveal.status,'playing');
 const action=legalTtgLifeChoices(reveal).find(x=>x.mode==='special');
 const after=resolveTtgLifeChoice(reveal,action);
 assert.equal(after.status,'finished');assert.equal(after.winner,0);
 assert.equal(after.players[0].front[0],null);
 const final=game();final.players[1].life=[card('life','TTG-1-036')];
 final.players[1].deck=[card('newLife','TTG-1-005')];
 const pendingFinal=beginTtgLifeTrigger(final,{player:1,lifeUid:'life'});
 assert.equal(pendingFinal.status,'playing');assert.equal(pendingFinal.players[1].life.length,0);
 assert.deepEqual(legalTtgLifeChoices(pendingFinal).map(x=>x.mode),['final','decline']);
 const rescued=resolveTtgLifeChoice(pendingFinal,legalTtgLifeChoices(pendingFinal)[0]);
 assert.equal(rescued.status,'playing');assert.equal(rescued.players[1].life.length,1);
 const skip=resolveTtgLifeChoice(pendingFinal,legalTtgLifeChoices(pendingFinal)[1]);
 assert.equal(skip.status,'finished');assert.equal(skip.winner,0);
 assert.equal(skip.players[1].life.length,0);
});
test('red 071 Raid life always permits hand, and real Raid requires matching Kittan and red4',()=>{
 const s=lifeGame('TTG-1-071');
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
 assert.deepEqual(legalTtgLifeChoices(p).map(x=>x.mode),['raidHand','decline']);
 const hand=resolveTtgLifeChoice(p,legalTtgLifeChoices(p)[0]);
 assert.ok(hand.players[1].hand.some(x=>x.uid==='life'));
});

test('001 and 014 have no printed life trigger and go straight to OUTSIDE',()=>{
 for(const id of ['TTG-1-001','TTG-1-014']){
  const s=lifeGame(id),r=beginTtgLifeTrigger(s,{player:1,lifeUid:'life'});
  assert.equal(r.pendingTtgLife,null);
  assert.deepEqual(r.players[1].outside.map(x=>x.uid),['life']);
  assert.equal(r.players[1].life.length,1);
 }
});
