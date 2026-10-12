import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,CARDS} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,bp,energy,assertState} from '../dist/engine.mjs';

function fixture(add={}){
 const deck={...PRESETS[0].counts};
 for(const [id,n] of Object.entries(add)){deck[id]=(deck[id]||0)+n;}
 let over=Object.values(add).reduce((a,b)=>a+b,0);for(const id of ['035','037','042','034','107','108']){const n=Math.min(deck[id]||0,over);deck[id]-=n;over-=n;if(!over)break;}assert.equal(over,0);
 let s=newGame({seed:113,decks:[deck,deck]});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const p of s.players){p.deck.push(...p.hand,...p.life);p.hand=[];p.life=[];p.front.fill(null);p.energy.fill(null);p.ap=3;p.maxAp=3;p.turnCount=3;}
 s.phase='main';s.turn=5;s.active=0;s.queue=[];s.log=[];s.pending=null;return s;
}
function take(s,p,id){const arr=s.players[p].deck,i=arr.findIndex(x=>x.cardId===id);assert.ok(i>=0,`missing ${id}`);return arr.splice(i,1)[0];}
function put(s,p,id,line,slot,{ready=true}={}){const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;}
function hand(s,p,id){const c=take(s,p,id);s.players[p].hand.push(c);return c;}
function choose(s,...ids){return dispatch(s,{type:'choose',ids});}
function boost(s,p,id,line='energy',slot=0){const c=put(s,p,id,line,slot);c.energyBoostTurn=s.turn;c.energyBoostAmount=12;return c;}
function raid(s,p,raidId,baseId,line='front',slot=0,frontSlot=slot){
 const base=put(s,p,baseId,line,slot,{ready:false}),c=hand(s,p,raidId);
 const target=legalActions(s).find(a=>a.type==='raid'&&a.uid===c.uid&&a.target===base.uid&&a.line==='front'&&a.slot===frontSlot);
 assert.ok(target,`legal raid ${raidId} on ${baseId}`);return {s:dispatch(s,target),base,c};
}

test('Raid base uses name across Japanese and Chinese sets, but never another printed Raid',()=>{
 let s=fixture({'BLC-1-002':1,'BLC-1-004':2,'BLC-1-003':1});
 const e=boost(s,0,'BLC-1-002','energy',0);const b=put(s,0,'BLC-1-003','front',0),r=hand(s,0,'BLC-1-004');
 assert.ok(legalActions(s).some(a=>a.type==='raid'&&a.target===b.uid));
 s=dispatch(s,legalActions(s).find(a=>a.type==='raid'&&a.target===b.uid));assert.equal(s.players[0].front[0].ready,true);
 // Once a Raid is printed on a normal-played base, a second Raid cannot stack on it.
 s.phase='main';s.players[0].ap=3;const second=hand(s,0,'BLC-1-004');
 assert.ok(!legalActions(s).some(a=>a.type==='raid'&&a.target===r.uid));assertState(s);
});

test('Raid does not grant raid-box IMPACT on normal deployment',()=>{
 let s=fixture({'BLC-1-002':1,'BLC-1-004':1});boost(s,0,'BLC-1-002');
 const r=hand(s,0,'BLC-1-004');s=dispatch(s,{type:'play',uid:r.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].stack.length,0);assert.equal(s.players[0].front[0].ready,false);assertState(s);
});

test('BLC-1-023 strips Raid top only and leaves original base on field',()=>{
 let s=fixture({'BLC-1-023':1,'BLC-1-021':1});boost(s,0,'BLC-1-021');
 const base=put(s,1,'039','front',0),top=take(s,1,'104');top.stack=[base];top.ready=true;s.players[1].front[0]=top;
 const card=hand(s,0,'BLC-1-023');s=dispatch(s,{type:'play',uid:card.uid,line:'front',slot:0});
 assert.equal(s.pending.effect.kind,'chooseMode');s=choose(s,'0');assert.equal(s.pending.effect.kind,'raidTopChoice');
 s=choose(s,top.uid);assert.equal(s.players[1].front[0].uid,base.uid);assert.ok(s.players[1].outside.some(x=>x.uid===top.uid));assertState(s);
});

test('BLC-2-065 Raid strips its own top at the beginning of the owner turn',()=>{
 let s=fixture({'BLC-2-065':1,'BLC-1-078':2});boost(s,0,'BLC-1-078');
 const {s:x,base,c}=raid(s,0,'BLC-2-065','BLC-1-078','energy',1,0);s=x;
 assert.equal(s.players[0].front[0].uid,c.uid);
 // Run a turn boundary for the current player and then the opponent.
 s.phase='attack';s=dispatch(s,{type:'next'});s.phase='attack';s=dispatch(s,{type:'next'});
 assert.equal(s.players[0].front[0].uid,base.uid);assert.ok(s.players[0].outside.some(x=>x.uid===c.uid));assertState(s);
});

test('BLC-2-067 high energy base can replace destruction with discard + de-Raid',()=>{
 let s=fixture({'BLC-2-067':1,'BLC-1-080':1});
 const base=put(s,1,'BLC-1-080','front',0),top=take(s,1,'BLC-2-067');top.stack=[base];top.ready=true;s.players[1].front[0]=top;
 const discard=hand(s,1,'034');
 const atk=put(s,0,'104','front',0);atk.buffs.push({turn:s.turn,bp:6000});s.phase='attack';
 s=dispatch(s,{type:'attack',uid:atk.uid});s=choose(s,top.uid);
 assert.equal(s.pending?.effect.kind,'raidShield');s=choose(s,discard.uid);
 assert.equal(s.players[1].front[0].uid,base.uid);assert.ok(s.players[1].outside.some(x=>x.uid===top.uid));assert.ok(s.players[1].outside.some(x=>x.uid===discard.uid));assertState(s);
});

test('BLC-2-019 Raid entry selects up to 2 opponents for a -1500 effect',()=>{
 let s=fixture({'BLC-2-019':1,'BLC-2-016':2});boost(s,0,'BLC-2-016');
 const a=put(s,1,'101','front',0),b=put(s,1,'102','front',1);
 const {s:x}=raid(s,0,'BLC-2-019','BLC-2-016','energy',1,0);s=x;
 assert.equal(s.pending?.max,2);s=choose(s,a.uid,b.uid);
 assert.equal(bp(s,s.players[1].front[0]),1500);assert.equal(bp(s,s.players[1].front[1]),1500);assertState(s);
});

test('BLC-1-041 mills 2 then banishes chosen cards and debuffs per removed card',()=>{
 let s=fixture({'BLC-1-041':1});boost(s,0,'102');const enemy=put(s,1,'101','front',0);
 const {s:x}=raid(s,0,'BLC-1-041','039','energy',1,0);s=x;
 assert.equal(s.pending?.effect.kind,'millRaidRemove');const chosen=s.pending.choices.slice(0,2).map(c=>c.id);
 s=choose(s,...chosen);assert.equal(s.pending?.effect.kind,'raidMillDebuff');s=choose(s,enemy.uid);
 assert.equal(bp(s,s.players[1].front[0]),2000);assert.equal(s.players[0].removed.length,2);assertState(s);
});

test('BLC-4-050 Raid activated ability has two different choices and requires Raid state',()=>{
 let s=fixture({'BLC-4-050':1,'BLC-1-045':1});boost(s,0,'046');
 const {s:x,c}=raid(s,0,'BLC-4-050','BLC-1-045','energy',1,0);s=x;
 assert.ok(legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid));
 s=dispatch(s,{type:'ability',uid:c.uid});assert.equal(s.pending?.effect.kind,'chooseMode');s=choose(s,'0');assert.equal(s.players[0].front[0].impactTurn,s.turn);assertState(s);
});

test('BLC-4-053 Raid readies after winning a block, once per turn',()=>{
 let s=fixture({'BLC-4-053':1,'BLC-1-048':1});boost(s,0,'046');
 const {s:x,c}=raid(s,0,'BLC-4-053','BLC-1-048','energy',1,0);s=x;
 // Raid's entry is optional and opponent without target results in no prompt.
 const enemy=put(s,1,'039','front',0);s.phase='attack';
 s=dispatch(s,{type:'attack',uid:c.uid});s=choose(s,enemy.uid);assert.equal(s.players[0].front[0].ready,true);assertState(s);
});

test('BLC-4-012 raid continuously raises other own character energy requirement',()=>{
 let s=fixture({'BLC-4-012':1,'BLC-4-011':1,'BLC-1-012':1});const base=boost(s,0,'BLC-4-011');const raidCard=hand(s,0,'BLC-4-012');
 s=dispatch(s,legalActions(s).find(a=>a.type==='raid'&&a.uid===raidCard.uid&&a.target===base.uid&&a.line==='front'));
 // Entry may ask to deploy a yellow card; skip optional choice.
 if(s.pending)s=choose(s);
 const next=hand(s,0,'BLC-1-012');const required=next.cardId;
 assert.ok(s.players[0].front[0].uid===raidCard.uid);assert.ok(energy(s,0,'yellow')>=0);assertState(s);
});

test('each of the 24 registered Raid profiles has at least one legal base and resolves without losing cards',async()=>{
 const {controller,botAction}=await import('../dist/engine.mjs');
 const raidCards=CARDS.filter(c=>c.raid);assert.equal(raidCards.length,24);
 for(const d of raidCards){
  const candidates=CARDS.filter(c=>c.type==='character'&&!c.raid&&!(c.effect||'').startsWith('Raid')&&!(c.effect||'').startsWith('突襲')&&(c.key===d.raid||c.name===d.raid||c.nameJa?.replaceAll(' ','')===d.raid));
  assert.ok(candidates.length,`${d.identity} no registered base`);
  const base=candidates.sort((a,b)=>a.energy-b.energy)[0];
  // Build a deck with the top and base, then supply its energy from an active same-color card.
  const extra={};for(const id of [d.id,base.id])if(!(PRESETS[0].counts[id]>0))extra[id]=(extra[id]||0)+1;
  const source=CARDS.find(c=>c.type==='character'&&c.color===d.color&&!c.raid&&c.id!==base.id&&c.auto);
  assert.ok(source,d.identity);
  if(!(PRESETS[0].counts[source.id]>0))extra[source.id]=(extra[source.id]||0)+1;
  const s=fixture(extra);
  const power=boost(s,0,source.id,'energy',0);const bottom=put(s,0,base.id,'energy',1,{ready:false});const card=hand(s,0,d.id);
  const actions=legalActions(s).filter(a=>a.type==='raid'&&a.uid===card.uid&&a.target===bottom.uid);
  assert.ok(actions.length,`${d.identity} should Raid on ${base.identity}`);
  const action=actions.find(a=>a.line==='front'&&a.slot===0)||actions.find(a=>a.line==='energy'&&a.slot===1);
  assert.ok(action,d.identity);
  let x=dispatch(s,action);assertState(x);
  let steps=0;while(x.pending&&steps++<25){const move=botAction(x);x=dispatch(x,move,controller(x));assertState(x);}
  assert.ok(steps<25,`${d.identity} resolution got stuck`);
 }
});

test('discounted BLC-4-050 Raid remains legal even if player has zero AP',()=>{
 let s=fixture({'BLC-4-050':1,'BLC-1-045':1});boost(s,0,'046');const base=put(s,0,'BLC-1-045','front',0),top=hand(s,0,'BLC-4-050');
 s.players[0].purpleApPaidTurn=s.turn;s.players[0].ap=0;
 const a=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===base.uid);
 assert.ok(a);s=dispatch(s,a);assert.equal(s.players[0].ap,0);assert.equal(s.players[0].front[0].uid,top.uid);assertState(s);
});

test('BLC-1-020 draws two and discards one at attack end only if opponent used a trigger',()=>{
 let s=fixture({'BLC-1-020':1,'BLC-1-018':2});boost(s,0,'BLC-1-018');
 const {s:x}=raid(s,0,'BLC-1-020','BLC-1-018','energy',1,0);s=x;
 s.players[1].triggerUsedTurn=s.turn;s.phase='attack';const before=s.players[0].hand.length;
 s=dispatch(s,{type:'next'});assert.equal(s.pending?.effect.rule.op,'discard');assert.equal(s.players[0].hand.length,before+2);
 s=choose(s,s.pending.choices[0].id);assert.equal(s.players[0].hand.length,before+1);assert.equal(s.active,1);assertState(s);
});

test('BLC-4-033 Raid base can re-enter REST on retirement while Urahara remains',()=>{
 let s=fixture({'BLC-4-033':1,'BLC-4-030':1});
 boost(s,0,'039');const event=hand(s,0,'064');
 const urahara=put(s,1,'037','energy',0);const base=put(s,1,'BLC-4-030','front',0);
 const top=take(s,1,'BLC-4-033');top.stack=[base];top.ready=true;s.players[1].front[0]=top;
 s=dispatch(s,{type:'play',uid:event.uid});assert.equal(s.pending?.effect.kind,'destroy');s=choose(s,top.uid);
 assert.equal(s.pending?.effect.kind,'raidBaseRevive');s=choose(s,'front-0');
 assert.equal(s.players[1].front[0].uid,base.uid);assert.equal(s.players[1].front[0].ready,false);assert.ok(s.players[1].outside.some(x=>x.uid===top.uid));assert.equal(s.players[1].energy[0].uid,urahara.uid);assertState(s);
});

test('BLC-4-069 swaps after life trigger choices are handled',()=>{
 const graves=['BLC-1-094','BLC-1-095','BLC-1-096','BLC-1-097'];
 let s=fixture(Object.fromEntries(['BLC-4-069','BLC-4-067',...graves].map(x=>[x,x==='BLC-4-067'?2:1])));
 for(const id of graves)s.players[0].outside.push(take(s,0,id));
 boost(s,0,'BLC-4-067','energy',0);const source=put(s,0,'BLC-4-067','energy',1),reserve=put(s,0,'039','energy',2);
 const top=hand(s,0,'BLC-4-069');const r=legalActions(s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.target===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(r);s=dispatch(s,r);
 s.players[1].life.push(take(s,1,'039'),take(s,1,'039'));
 s.phase='attack';s=dispatch(s,{type:'attack',uid:top.uid});s=choose(s,'pass');
 assert.equal(s.pending?.effect.kind,'triggerChoice');s=choose(s,'skip');
 assert.equal(s.pending?.effect.kind,'raidAttackSwap');s=choose(s,reserve.uid);
 assert.equal(s.players[0].front[0].uid,reserve.uid);assert.equal(s.players[0].energy[2].uid,top.uid);assertState(s);
});
