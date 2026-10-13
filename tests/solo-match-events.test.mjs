import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloTrainingBotAction,assertSoloTrainingMatch,soloMatchBp} from '../dist/solo-match.mjs';
const purple=id=>({...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,[id]:4});
const green=id=>({...SOLO_TRAINING_PRESET,'SLG-1-062':0,[id]:4});
const setup=deck=>{const s=newSoloTrainingMatch({decks:[deck,deck],first:0,seed:444});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s};
const take=(p,id)=>{for(const zone of ['hand','deck','life']){let i=p[zone].findIndex(c=>c.cardId===id);if(i>=0)return p[zone].splice(i,1)[0];}throw Error('missing '+id)};
const place=(s,id,line,slot,owner=0,ready=true)=>{
 const p=s.players[owner],c=take(p,id);Object.assign(c,{owner,line,slot,ready});p[line][slot]=c;return c;
};
const play=(s,id)=>{const p=s.players[0],c=take(p,id);p.hand.push(c);
 const a=soloTrainingLegalActions(s).find(a=>a.type==='playEvent'&&a.uid===c.uid);
 assert.ok(a,'playEvent '+id+' must exist');return soloTrainingDispatch(s,a);
};
test('036 draws three and requires exactly two independent chosen hand discards',()=>{
 let s=setup(purple('SLG-1-036'));for(let i=0;i<3;i++)place(s,'SLG-1-030','energy',i);
 const event=take(s.players[0],'SLG-1-036');s.players[0].hand.push(event);
 const origHand=s.players[0].hand.length;s=play(s,'SLG-1-036');
 assert.equal(s.pending.kind,'eventDiscard');assert.equal(s.pending.left,2);
 assert.equal(s.players[0].hand.length,origHand+2);
 assert.throws(()=>soloTrainingDispatch(s,{type:'choose',uid:'fake'}),/illegal/);
 s=soloTrainingDispatch(s,soloTrainingLegalActions(s)[0]);assert.equal(s.pending.left,1);
 s=soloTrainingDispatch(s,soloTrainingLegalActions(s)[0]);assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,origHand);assertSoloTrainingMatch(s);
});
test('037 checks printed BP, allows zero or one recovery, draws after choice',()=>{
 let s=setup(purple('SLG-1-037')),p=s.players[0];for(let i=0;i<4;i++)place(s,'SLG-1-030','energy',i);
 const target=take(p,'SLG-1-015');p.outside.push(target);
 s=play(s,'SLG-1-037');assert.equal(s.pending.kind,'eventRecover');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===target.uid));
 s=soloTrainingDispatch(s,{type:'choose',uid:target.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===target.uid));
 assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('038, 078, 079 can restore at most two AP and cannot exceed max AP after payment',()=>{
 for(const id of ['SLG-1-038','SLG-1-078','SLG-1-079']){
  let s=setup(id==='SLG-1-038'?purple(id):green(id));
  const source=id==='SLG-1-038'?'SLG-1-030':'SLG-1-041';for(let i=0;i<3;i++)place(s,source,'energy',i);
  s.players[0].ap=1;
  s=play(s,id);assert.equal(s.players[0].ap,0);assert.equal(s.pending.kind,'eventRestoreAp');
  assert.deepEqual(soloTrainingLegalActions(s).map(a=>a.count),[0,1,2]);
  s=soloTrainingDispatch(s,{type:'choose',count:2});assert.equal(s.players[0].ap,2);
  assertSoloTrainingMatch(s);
 }
});
test('040 target selection checks threshold and extra AP after event payment',()=>{
 let s=setup(purple('SLG-1-040'));for(let i=0;i<4;i++)place(s,'SLG-1-030','energy',i);
 const target=place(s,'SLG-1-031','front',0,1);
 target.extraTargetAp=1;
 s.players[0].ap=1;
 let c=take(s.players[0],'SLG-1-040');s.players[0].hand.push(c);
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='playEvent'&&a.uid===c.uid),false);
 s.players[0].ap=2;
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='playEvent'&&a.uid===c.uid),true);
 target.cardId='SLG-1-033';
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='playEvent'&&a.uid===c.uid),false); // printed BP4000 without Sung
 assertSoloTrainingMatch(s);
});
test('076 selects BP5000 limit when Sung is on field, can choose protected target with extra AP',()=>{
 let s=setup(green('SLG-1-076'));for(let i=0;i<4;i++)place(s,'SLG-1-041','energy',i);
 place(s,'SLG-1-045','front',0);
 const victim=place(s,'SLG-1-065','front',0,1);
 victim.extraTargetAp=1;
 const ap=s.players[0].ap;s=play(s,'SLG-1-076');assert.equal(s.pending.kind,'eventDestroy');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===victim.uid));
 s=soloTrainingDispatch(s,{type:'choose',uid:victim.uid});
 assert.equal(s.players[0].ap,ap-2);assert.ok(s.players[1].outside.some(x=>x.uid===victim.uid));
 assertSoloTrainingMatch(s);
});
test('080 grants optional on-attack draw to chosen Shizuku this turn',()=>{
 let s=setup(green('SLG-1-080'));
 for(let i=0;i<2;i++)place(s,'SLG-1-041','energy',i);
 const shizuku=place(s,'SLG-1-055','front',0);
 s=play(s,'SLG-1-080');assert.equal(s.pending.kind,'eventDance');
 s=soloTrainingDispatch(s,{type:'choose',uid:shizuku.uid});
 assert.ok(s.players[0].front[0].grants.some(x=>x.kind==='attackDraw'));
 s=soloTrainingDispatch(s,{type:'next'});assert.equal(s.phase,'attack');
 s=soloTrainingDispatch(s,{type:'attack',uid:shizuku.uid});assert.equal(s.pending.kind,'attackDraw');
 const deckBefore=s.players[0].deck.length;
 s=soloTrainingDispatch(s,{type:'choose',draw:true});
 assert.equal(s.players[0].deck.length,deckBefore-1);assertSoloTrainingMatch(s);
});
test('071 REST gives BP+1000 to other own character and returns herself to hand, invalid self target unavailable',()=>{
 let s=setup(green('SLG-1-071'));const marie=place(s,'SLG-1-071','front',0),other=place(s,'SLG-1-045','front',1);
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===marie.uid));
 s=soloTrainingDispatch(s,{type:'ability',uid:marie.uid,mode:'marie'});
 assert.equal(s.pending.kind,'marieBuff');
 assert.ok(!soloTrainingLegalActions(s).some(a=>a.uid===marie.uid));
 s=soloTrainingDispatch(s,{type:'choose',uid:other.uid});
 assert.ok(s.players[0].hand.some(x=>x.uid===marie.uid));assert.equal(soloMatchBp(s,s.players[0].front[1]),2500);
 assertSoloTrainingMatch(s);
});
test('AI actually plays effect events and finishes mixed custom decks without card loss',()=>{
 for(const deck of [purple('SLG-1-036'),green('SLG-1-080')]){
  let s=newSoloTrainingMatch({decks:[deck,deck],seed:14});
  for(let i=0;i<3200&&s.status==='playing';i++){
   const a=soloTrainingBotAction(s);
   assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
   s=soloTrainingDispatch(s,a);
  }
  assert.equal(s.status,'finished');
  assertSoloTrainingMatch(s);
 }
});
