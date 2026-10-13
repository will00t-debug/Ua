import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
const deck=()=>({...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-009':0,'SLG-1-034':4,'SLG-1-037':4});
const with039=()=>({...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-039':4});
const match=counts=>{const s=newSoloTrainingMatch({decks:[counts,counts],seed:932,first:0});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;};
function pluck(p,id){for(const z of ['hand','deck','life']){let i=p[z].findIndex(x=>x.cardId===id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('no '+id);}
function deploy(s,id,line='energy',slot=0){const p=s.players[0],c=pluck(p,id);Object.assign(c,{owner:0,line,slot,ready:true});p[line][slot]=c;return c;}
test('Q2038: Castle at 19 outside cannot activate high mode even if discard cost would make 20',()=>{
 let s=match(deck());const p=s.players[0],castle=deploy(s,'SLG-1-034');
 for(let i=1;i<4;i++)deploy(s,'SLG-1-030','energy',i);
 p.outside.push(pluck(p,'SLG-1-037'));
 while(p.outside.length<19)p.outside.push(p.deck.shift());
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===castle.uid&&a.mode==='potion'),false);
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===castle.uid&&a.mode==='mill'));
 p.outside.push(p.deck.shift());assert.equal(p.outside.length,20);
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===castle.uid&&a.mode==='potion'));
 s=soloTrainingDispatch(s,{type:'ability',uid:castle.uid,mode:'potion'});
 assert.equal(s.pending.kind,'castleCost');assert.equal(s.players[0].energy[0].ready,false);
 const before=s.players[0].ap;
 s=soloTrainingDispatch(s,soloTrainingLegalActions(s)[0]);assert.equal(s.pending.kind,'castlePotion');
 assert.equal(s.players[0].ap,before);
 const potionAction=soloTrainingLegalActions(s).find(a=>a.uid!=null);assert.ok(potionAction);
 s=soloTrainingDispatch(s,potionAction);assert.equal(s.pending.kind,'castleRecover');
 assert.equal(s.players[0].ap,before-1);
 assert.equal(s.players[0].removed[0].cardId,'SLG-1-037');
 s=soloTrainingDispatch(s,{type:'choose',uid:null});assert.equal(s.pending,null);
 assertSoloTrainingMatch(s);
});
test('039 one ACTIVE summon from outside is chosen with explicit location and conserves UID',()=>{
 let s=match(with039()),p=s.players[0];deploy(s,'SLG-1-029','energy',0);for(let i=1;i<4;i++)deploy(s,'SLG-1-030','energy',i);
 const target=pluck(p,'SLG-1-029');p.outside.push(target);
 const event=pluck(p,'SLG-1-039');p.hand.push(event);
 const act=soloTrainingLegalActions(s).find(a=>a.type==='playEvent'&&a.uid===event.uid);assert.ok(act);
 s=soloTrainingDispatch(s,act);assert.equal(s.pending.kind,'shadowSummonMode');
 s=soloTrainingDispatch(s,{type:'choose',mode:'oneActive'});
 assert.equal(s.pending.kind,'shadowSummonCard');
 const where=soloTrainingLegalActions(s).find(a=>a.uid===target.uid&&a.line==='front');
 assert.ok(where);s=soloTrainingDispatch(s,where);
 assert.equal(s.pending,null);assert.equal(s.players[0].front[where.slot].uid,target.uid);
 assert.equal(s.players[0].front[where.slot].ready,true);
 assertSoloTrainingMatch(s);
});
test('039 two REST summon includes per-enter choice queue, no card duplication',()=>{
 let s=match(with039()),p=s.players[0];deploy(s,'SLG-1-029','energy',0);for(let i=1;i<4;i++)deploy(s,'SLG-1-030','energy',i);
 const a=pluck(p,'SLG-1-029'),b=pluck(p,'SLG-1-030');p.outside.push(a,b);
 const event=pluck(p,'SLG-1-039');p.hand.push(event);
 s=soloTrainingDispatch(s,soloTrainingLegalActions(s).find(x=>x.type==='playEvent'&&x.uid===event.uid));
 s=soloTrainingDispatch(s,{type:'choose',mode:'twoRest'});
 let option=soloTrainingLegalActions(s).find(x=>x.uid===a.uid&&x.line==='front');s=soloTrainingDispatch(s,option);
 assert.equal(s.pending.kind,'shadowSummonCard');option=soloTrainingLegalActions(s).find(x=>x.uid===b.uid&&x.line==='front');
 s=soloTrainingDispatch(s,option);
 assert.equal(s.players[0].front.filter(Boolean).length,2);
 assert.equal(s.players[0].front.every(c=>!c||!c.ready),true);
 // Shadow Soldier's entered-top-two ability interrupts and must resolve.
 if(s.pending?.kind==='soldierTop'){s=soloTrainingDispatch(s,soloTrainingLegalActions(s)[0]);}
 assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
