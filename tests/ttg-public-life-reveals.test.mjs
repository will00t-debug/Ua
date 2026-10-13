import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {beginTtgLifeTrigger,legalTtgLifeChoices,resolveTtgLifeChoice} from '../dist/ttg-green-life.mjs';
// Public only AFTER LIFE is actually revealed; hand, deck and unrevealed LIFE stay private.
function staged(id,seed=120){
 const s=newTtgCoreMatch({decks:[TTG_GREEN_BETA_PRESET,TTG_GREEN_BETA_PRESET],first:0,seed});
 const pl=s.players[1];let found=false;
 for(const zone of ['life','deck','hand']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i<0)continue;
  [pl.life[0],pl[zone][i]]=[pl[zone][i],pl.life[0]];
  found=true;break;
 }
 assert.ok(found,'Could not stage '+id);
 assert.ok(assertTtgCoreState(s));
 return s;
}
test('TTG LIFE with no printed Trigger still becomes publicly visible, no private cards logged',()=>{
 const s=staged('TTG-1-006'),privateTop=s.players[1].deck[0].uid,privateHand=s.players[1].hand[0].uid;
 const life=s.players[1].life[0];
 const out=beginTtgLifeTrigger(s,{player:1,lifeUid:life.uid});
 assert.equal(out.pendingTtgLife,undefined);
 assert.deepEqual(out.publicLifeReveals,[{uid:life.uid,cardId:life.cardId,owner:1,turn:s.turn,trigger:null,outcome:'none'}]);
 assert.ok(out.players[1].outside.some(c=>c.uid===life.uid));
 assert.ok(!JSON.stringify(out.publicLifeReveals).includes(privateTop));
 assert.ok(!JSON.stringify(out.publicLifeReveals).includes(privateHand));
 assert.ok(assertTtgCoreState(out));
});
test('TTG DRAW Trigger is publicly pending, then activated or declined by defender, preserving both branches',()=>{
 const s=staged('TTG-1-005'),life=s.players[1].life[0],hand=s.players[1].hand.length;
 const pending=beginTtgLifeTrigger(s,{player:1,lifeUid:life.uid});
 assert.equal(pending.publicLifeReveals.at(-1).outcome,'pending');
 assert.equal(pending.publicLifeReveals.at(-1).trigger,'draw');
 assert.deepEqual(legalTtgLifeChoices(pending).map(x=>x.mode),['draw','decline']);
 const fire=resolveTtgLifeChoice(pending,legalTtgLifeChoices(pending)[0]);
 assert.equal(fire.players[1].hand.length,hand+1);
 assert.equal(fire.publicLifeReveals.at(-1).outcome,'activated');
 assert.equal(fire.publicLifeReveals.at(-1).mode,'draw');
 const skip=resolveTtgLifeChoice(pending,legalTtgLifeChoices(pending)[1]);
 assert.equal(skip.players[1].hand.length,hand);
 assert.equal(skip.publicLifeReveals.at(-1).outcome,'declined');
 assert.equal(skip.publicLifeReveals.at(-1).mode,'decline');
 assert.equal(pending.publicLifeReveals.at(-1).outcome,'pending','input state remains immutable');
 assert.ok(assertTtgCoreState(fire));assert.ok(assertTtgCoreState(skip));
});
test('TTG publicly revealed LIFE history is bounded and the actual mobile view renders it',()=>{
 let s=staged('TTG-1-006',121);
 s.publicLifeReveals=Array.from({length:60},(_,i)=>({uid:'past-'+i,cardId:'TTG-1-005',owner:1,turn:i,trigger:'draw',outcome:'declined'}));
 const life=s.players[1].life[0];
 s=beginTtgLifeTrigger(s,{player:1,lifeUid:life.uid});
 assert.equal(s.publicLifeReveals.length,60);
 assert.equal(s.publicLifeReveals[0].uid,'past-1');
 assert.equal(s.publicLifeReveals.at(-1).uid,life.uid);
 const html=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(html,/公開生命翻牌/);
 assert.match(html,/publicLifeReveals/);
 assert.match(html,/選擇不發動 Trigger/);
});

test('Official Q99: green 028/031 and red 071 RAID LIFE allow both raidHand and full decline',()=>{
 for(const [id,base,donor] of [
  ['TTG-1-028',TTG_GREEN_BETA_PRESET,'TTG-1-003'],
  ['TTG-1-031',TTG_GREEN_BETA_PRESET,'TTG-1-003'],
  ['TTG-1-071',TTG_RED_BETA_PRESET,'TTG-1-042']
 ]){
  const counts={...base,[donor]:base[donor]-1,[id]:1};
  const s=newTtgCoreMatch({decks:[counts,counts],first:0,seed:1301});
  const pl=s.players[1];let found=false;
  for(const zone of ['life','deck','hand']){
   const i=pl[zone].findIndex(c=>c.cardId===id);
   if(i<0)continue;
   [pl.life[0],pl[zone][i]]=[pl[zone][i],pl.life[0]];
   found=true;break;
  }
  assert.ok(found,id+' available as physical card');
  const uid=pl.life[0].uid;
  const revealed=beginTtgLifeTrigger(s,{player:1,lifeUid:uid});
  assert.equal(revealed.pendingTtgLife?.trigger,'raid');
  const actions=legalTtgLifeChoices(revealed);
  assert.ok(actions.some(x=>x.mode==='raidHand'),id+' may add RAID card to hand');
  assert.ok(actions.some(x=>x.mode==='decline'),id+' must allow refusing RAID trigger');
  const declined=resolveTtgLifeChoice(revealed,actions.find(x=>x.mode==='decline'));
  assert.ok(declined.players[1].outside.some(x=>x.uid===uid));
  assert.equal(declined.publicLifeReveals.at(-1).outcome,'declined');
  assert.ok(assertTtgCoreState(declined));
  const added=resolveTtgLifeChoice(revealed,actions.find(x=>x.mode==='raidHand'));
  assert.ok(added.players[1].hand.some(x=>x.uid===uid));
  assert.equal(added.publicLifeReveals.at(-1).mode,'raidHand');
  assert.ok(assertTtgCoreState(added));
 }
});
