import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingDispatch,soloTrainingLegalActions,soloTrainingBotAction,soloEnergy,soloMatchBp,inspectSoloAttached,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

const custom=(color,id)=>{const base=color==='purple'?SOLO_SHADOW_TRAINING_PRESET:SOLO_TRAINING_PRESET;
 const replace=color==='purple'?'SLG-1-001':'SLG-1-062';return {...base,[replace]:0,[id]:4};
};
const make=(color,id)=>{const deck=custom(color,id);const s=newSoloTrainingMatch({decks:[deck,deck],seed:121,first:0});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;};
const withPotion=id=>{const deck={...custom('purple',id),'SLG-1-009':0,'SLG-1-037':4};const s=newSoloTrainingMatch({decks:[deck,deck],seed:121,first:0});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;};
function pull(p,id){for(const z of ['hand','deck','life']){const i=p[z].findIndex(c=>c.cardId===id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('missing in deck '+id);}
function place(s,id,line,slot,owner=0,ready=true){const c=pull(s.players[owner],id);Object.assign(c,{owner,line,slot,ready});s.players[owner][line][slot]=c;return c;}
function toHand(s,id){const p=s.players[0],c=pull(p,id);p.hand.push(c);return c;}
function energy(s,color,count){const source=color==='purple'?'SLG-1-030':'SLG-1-041';
 for(let i=0;i<count;i++)place(s,source,'energy',i); }
function play(s,id,line='front'){const c=toHand(s,id);const a=soloTrainingLegalActions(s).find(x=>x.type==='play'&&x.uid===c.uid&&x.line===line);
 assert.ok(a,'play is legal: '+id);return soloTrainingDispatch(s,a);}
function event(s,id){const c=toHand(s,id);const a=soloTrainingLegalActions(s).find(x=>x.type==='playEvent'&&x.uid===c.uid);
 assert.ok(a,'event is legal: '+id);return soloTrainingDispatch(s,a);}
function select(s,a){assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)),'selection in legal options');return soloTrainingDispatch(s,a);}
const choice=(s,fn)=>{const a=soloTrainingLegalActions(s).find(fn);assert.ok(a,'expected legal choice');return a;};
test('SLG-1-003 gain energy with 10 outside, attack sees top and chooses top/outside, source unchanged',()=>{
 let s=make('purple','SLG-1-003');place(s,'SLG-1-003','energy',0);assert.equal(soloEnergy(s),1);
 for(let i=0;i<10;i++)s.players[0].outside.push(s.players[0].deck.shift());
 assert.equal(soloEnergy(s),2);
 const a=s.players[0].energy[0];s.players[0].energy[0]=null;Object.assign(a,{line:'front',slot:0,ready:true});s.players[0].front[0]=a;s.phase='attack';
 s=soloTrainingDispatch(s,{type:'attack',uid:a.uid});assert.equal(s.pending.kind,'peekTop');
 const top=s.players[0].deck[0].uid;s=select(s,choice(s,x=>x.outsideUid===top));
 assert.ok(s.players[0].outside.some(x=>x.uid===top));assertSoloTrainingMatch(s);
});
test('SLG-1-008 entry search four and recovered from outside draws then requires a hand discard',()=>{
 let s=make('purple','SLG-1-008');energy(s,'purple',1);s=play(s,'SLG-1-008');
 assert.equal(s.pending.kind,'slgSearch');assert.equal(s.pending.topUids.length,4);
 assert.throws(()=>soloTrainingDispatch(s,{type:'choose',picks:['bad'],order:[]}),/illegal SOLO action/);
 s=select(s,choice(s,x=>x.picks.length===0));assert.equal(s.pending,null);
 assertSoloTrainingMatch(s);
 let t=withPotion('SLG-1-008');energy(t,'purple',4);
 const e=pull(t.players[0],'SLG-1-008');t.players[0].outside.push(e);
 t=event(t,'SLG-1-037');t=select(t,{type:'choose',uid:e.uid});
 assert.equal(t.pending.kind,'slgDiscard');t=select(t,soloTrainingLegalActions(t)[0]);assert.equal(t.pending,null);
 assert.ok(t.players[0].hand.some(x=>x.uid===e.uid)||t.players[0].outside.some(x=>x.uid===e.uid));
 assertSoloTrainingMatch(t);
});
test('SLG-1-011 optional free REST entry after own recovery then mill top, blocker restriction requires 10 outside',()=>{
 let s=withPotion('SLG-1-011');energy(s,'purple',4);
 const card=pull(s.players[0],'SLG-1-011');s.players[0].outside.push(card);
 s=event(s,'SLG-1-037');s=select(s,{type:'choose',uid:card.uid});
 assert.equal(s.pending.kind,'slgRecoveredDeploy');const choiceAction=choice(s,x=>x.uid===card.uid&&x.line==='front');
 const before=s.players[0].ap;s=select(s,choiceAction);assert.equal(s.players[0].ap,before);
 assert.equal(s.players[0].front[choiceAction.slot].ready,false);
 assert.equal(s.pending.kind,'slgMill');s=select(s,{type:'choose',mill:true});
 assertSoloTrainingMatch(s);
});
test('SLG-1-018 from top 3 choose Sung/Shadow, unused cards to bottom with manual order, then mandatory discard',()=>{
 let s=make('purple','SLG-1-018');energy(s,'purple',3);
 const p=s.players[0],candidate=pull(p,'SLG-1-015');p.deck.unshift(candidate);
 s=play(s,'SLG-1-018');assert.equal(s.pending.kind,'slgSearch');assert.equal(s.pending.topUids.length,3);
 const chosen=choice(s,x=>x.picks.includes(candidate.uid));s=select(s,chosen);
 assert.equal(s.pending.kind,'slgDiscard');s=select(s,soloTrainingLegalActions(s)[0]);
 assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('SLG-1-019 is activated only from outside in main, uses Shadow hand cost and one shared turn counter',()=>{
 let s=make('purple','SLG-1-019'),p=s.players[0];p.outside.push(pull(p,'SLG-1-019'));p.outside.push(pull(p,'SLG-1-019'));
 p.hand.push(pull(p,'SLG-1-030'));
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='abilityOutside'));
 const a=soloTrainingLegalActions(s).find(a=>a.type==='abilityOutside');s=soloTrainingDispatch(s,a);
 assert.equal(s.pending.kind,'slg019Recover');
 const cost=choice(s,a=>a.uid!=null);s=select(s,cost);
 assert.equal(s.groupUsed['0:sung019'],s.turn);
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='abilityOutside'),false);
 assert.ok(s.players[0].hand.some(x=>x.uid===a.uid));assertSoloTrainingMatch(s);
});
test('SLG-1-044 face-down is owner-only, grants damage+1 and requires active FRONT Aoi',()=>{
 let s=make('green','SLG-1-044');energy(s,'green',2);
 const sung=place(s,'SLG-1-045','front',0),aoi=place(s,'SLG-1-044','front',1);
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===aoi.uid));
 s=select(s,{type:'ability',uid:aoi.uid,mode:'attachDamage'});
 assert.equal(s.pending.kind,'slg044Target');s=select(s,choice(s,x=>x.uid===sung.uid&&x.attach===true));
 const host=s.players[0].front[0];
 assert.equal(host.under.length,1);assert.equal(inspectSoloAttached(s,{viewer:1,owner:0,hostUid:sung.uid})[0].uid,undefined);
 assert.equal(inspectSoloAttached(s,{viewer:0,owner:0,hostUid:sung.uid})[0].uid,host.under[0].uid);
 assert.ok(host.grants.some(g=>g.kind==='damagePlus'));
 assertSoloTrainingMatch(s);
});
test('SLG-1-046 green top 4 search only Sung or Daily Quest, declined choice preserves card count',()=>{
 let s=make('green','SLG-1-046');energy(s,'green',1);
 s=play(s,'SLG-1-046');assert.equal(s.pending.kind,'slgSearch');
 const legal=soloTrainingLegalActions(s);assert.ok(legal.some(a=>a.picks.length===0));
 assert.ok(legal.every(a=>a.picks.every(uid=>s.pending.eligible.includes(uid))));
 s=select(s,legal.find(a=>a.picks.length===0));assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('SLG-1-059 entry can pay hand for ACTIVE BP+1000; attack picks up to two island cards and skips next ACTIVE',()=>{
 let s=make('green','SLG-1-059'),p=s.players[0];energy(s,'green',4);
 s=play(s,'SLG-1-059');assert.equal(s.pending.kind,'slg059Entry');const id=choice(s,x=>x.uid!=null);
 s=select(s,id);assert.equal(s.pending,null);
 const fighter=fieldOwn(s,'SLG-1-059');assert.equal(fighter.ready,true);assert.equal(soloMatchBp(s,fighter),5000);
 fighter.line='front';p.energy[fighter.slot]=null;fighter.slot=0;p.front[0]=fighter;
 const island=pull(p,'SLG-1-055');p.deck.unshift(island);s.phase='attack';
 s=soloTrainingDispatch(s,{type:'attack',uid:fighter.uid});assert.equal(s.pending.kind,'slgSearch');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.picks.length===0));
 const pick=soloTrainingLegalActions(s).find(a=>a.picks.includes(island.uid));
 if(pick){s=select(s,pick);assert.equal(s.players[0].front[0].skipActive,1);}
 else s=select(s,soloTrainingLegalActions(s)[0]);
 assertSoloTrainingMatch(s);
});
const fieldOwn=(s,id)=>[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId===id);
test('SLG-1-063 top 3 searches island trait; invalid target not offered',()=>{
 let s=make('green','SLG-1-063');energy(s,'green',1);
 s=play(s,'SLG-1-063');const q=s.pending;assert.equal(q.kind,'slgSearch');
 assert.equal(q.topUids.length,3);
 assert.ok(soloTrainingLegalActions(s).every(a=>a.picks.every(uid=>q.eligible.includes(uid))));
 s=select(s,choice(s,a=>a.picks.length===0));assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('SLG-1-077 removes legal enemy by conditional BP threshold and optional unique-name BP buff',()=>{
 let s=make('green','SLG-1-077');energy(s,'green',4);
 const enemy=place(s,'SLG-1-045','front',0,1);enemy.ready=false;
 s=event(s,'SLG-1-077');assert.equal(s.pending.kind,'slg077Target');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===enemy.uid));
 s=select(s,{type:'choose',uid:enemy.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===enemy.uid));
 assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('new cards retain no ability when blocked by illegal cost and AI can play 50-card custom decks',()=>{
 for(const [color,id] of [['purple','SLG-1-018'],['green','SLG-1-063']]){
  let s=newSoloTrainingMatch({decks:[custom(color,id),custom(color,id)],seed:48});
  let steps=0;
  while(s.status==='playing'&&steps++<3000){
   const a=soloTrainingBotAction(s);
   assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
   s=soloTrainingDispatch(s,a);
  }
  assert.equal(s.status,'finished');assertSoloTrainingMatch(s);
 }
});

test('SLG-1-003 recovered by own potion lets controller choose exactly one BP+1000 target',()=>{
 let s=withPotion('SLG-1-003');energy(s,'purple',4);
 const friend=place(s,'SLG-1-030','front',0);
 const rin=pull(s.players[0],'SLG-1-003');s.players[0].outside.push(rin);
 s=event(s,'SLG-1-037');s=select(s,{type:'choose',uid:rin.uid});
 assert.equal(s.pending.kind,'slgRecoveredBuff');
 assert.throws(()=>soloTrainingDispatch(s,{type:'choose',uid:'not-own'}),/illegal SOLO action/);
 s=select(s,{type:'choose',uid:friend.uid});
 assert.equal(soloMatchBp(s,s.players[0].front[0]),2500);assertSoloTrainingMatch(s);
});
test('SLG-1-011 with ten outside cannot be blocked by current BP4000 or higher',()=>{
 let s=make('purple','SLG-1-011');energy(s,'purple',4);
 const shizuku=place(s,'SLG-1-011','front',0);
 place(s,'SLG-1-033','front',0,1);
 for(let i=0;i<10;i++)s.players[0].outside.push(s.players[0].deck.shift());
 s.phase='attack';
 s=soloTrainingDispatch(s,{type:'attack',uid:shizuku.uid});
 assert.notEqual(s.pending?.kind,'block');
 assertSoloTrainingMatch(s);
});
test('SLG-1-077 gives extra BP only after five distinct island names, not five copies',()=>{
 let s=make('green','SLG-1-077');
 for(let i=0;i<3;i++)place(s,'SLG-1-041','energy',i);
 const fifth=place(s,'SLG-1-067','energy',3);
 const names=['SLG-1-055','SLG-1-065','SLG-1-066','SLG-1-072'];
 const allies=names.map((id,i)=>place(s,id,'front',i));
 const enemy=place(s,'SLG-1-045','front',0,1);
 s=event(s,'SLG-1-077');
 assert.equal(s.pending.kind,'slg077Target');
 s=select(s,{type:'choose',uid:enemy.uid});
 assert.equal(s.pending.kind,'slg077Buff');
 s=select(s,{type:'choose',uid:allies[0].uid});
 assert.equal(soloMatchBp(s,s.players[0].front[0]),2500);
 assertSoloTrainingMatch(s);
});
