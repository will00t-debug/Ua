import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,PRESETS,validateDeck} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,controller,cardOf,bp,energy,botAction,assertState} from '../dist/engine.mjs';

function fixture(){
 let s=newGame({seed:123});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(let p=0;p<2;p++){
  const pl=s.players[p];pl.deck=[...pl.deck,...pl.hand,...pl.life];pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.outside=[];pl.removed=[];pl.turnCount=3;pl.ap=3;pl.maxAp=3;
 }
 s.phase='main';s.turn=5;s.active=0;s.log=[];s.logSeq=0;s.queue=[];s.pending=null;s.status='playing';return s;
}
function take(s,p,id){const pl=s.players[p],i=pl.deck.findIndex(c=>c.cardId===id);assert.notEqual(i,-1,`need ${id}`);return pl.deck.splice(i,1)[0];}
function put(s,p,id,line,slot,{ready=true}={}){const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;}
function putRaided(s,p,id,line,slot,baseId='103'){
 const base=put(s,p,baseId,line,slot);
 const top=take(s,p,id);top.stack=[base];top.ready=true;
 s.players[p][line][slot]=top;
 return top;
}
function hand(s,p,id){const c=take(s,p,id);s.players[p].hand.push(c);return c;}
function grave(s,p,ids){for(const id of ids)s.players[p].outside.push(take(s,p,id));}
function life(s,p,ids){for(const id of ids)s.players[p].life.push(take(s,p,id));}
function power(s,p=0){put(s,p,'102','energy',0);put(s,p,'102','energy',1);put(s,p,'039','energy',2);}
function choose(s,ids){return dispatch(s,{type:'choose',ids});}
function advance(s,n=1){for(let i=0;i<n;i++)s=dispatch(s,{type:'next'});return s;}

test('all 18 starter card types remain and both practice decks are legal',()=>{
 assert.equal(CARDS.filter(c=>c.sets.includes('st')).length,18);for(const p of PRESETS)assert.deepEqual(validateDeck(p.counts),[]);
 assert.ok(validateDeck({...PRESETS[0].counts,'104':5}).length);
 assert.ok(validateDeck({...PRESETS[0].counts,'999':1}).length);
});
test('mulligan draws a disjoint new hand before original hand is shuffled back',()=>{
 let s=newGame({seed:3});const first=s.players[0].hand.map(c=>c.uid);
 assert.equal(s.players[0].life.length,0);s=dispatch(s,{type:'redraw'});
 assert.equal(s.players[0].hand.length,7);assert.ok(s.players[0].hand.every(c=>!first.includes(c.uid)));assert.equal(s.players[0].deck.length,43);
 assert.throws(()=>dispatch(s,{type:'redraw'}));s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});assert.equal(s.players[0].life.length,7);assert.equal(s.players[1].life.length,7);assertState(s);
});
test('AP schedule is first 1/2/3 and second 2/2/3, with first draw skipped',()=>{
 let s=newGame({seed:4});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 const actual=[];for(let t=0;t<6;t++){actual.push(s.players[s.active].ap);s=advance(s,4);}assert.deepEqual(actual,[1,2,2,2,3,3]);
 let x=newGame({seed:2});x=dispatch(x,{type:'keep'});x=dispatch(x,{type:'keep'});assert.equal(x.players[0].hand.length,7);x=advance(x,4);assert.equal(x.players[1].hand.length,8);
});
test('extra draw costs one AP, only once in Start, and requires a nonempty deck',()=>{
 let s=newGame({seed:8});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'extraDraw'});assert.equal(s.players[0].ap,0);assert.equal(s.players[0].hand.length,8);assert.throws(()=>dispatch(s,{type:'extraDraw'}));
 const f=fixture();f.phase='start';f.players[0].outside.push(...f.players[0].deck);f.players[0].deck=[];assert.ok(!legalActions(f).some(a=>a.type==='extraDraw'));assertState(f);
});
test('normal cards enter Rest and fields can only be played in Energy',()=>{
 let s=fixture();power(s);const c=hand(s,0,'108');assert.ok(legalActions(s).filter(a=>a.uid===c.uid).every(a=>a.line==='energy'));
 s=dispatch(s,{type:'play',uid:c.uid,line:'energy',slot:3});assert.equal(s.players[0].energy[3].ready,false);assert.equal(energy(s,0),6);assertState(s);
});
test('Urahara conditional generated energy responds to Active and Rest',()=>{
 const s=fixture();const c=put(s,0,'037','energy',0);assert.equal(energy(s,0),2);c.ready=false;assert.equal(energy(s,0),1);
});
test('Start and End both ready characters, End does not recover AP',()=>{
 let s=fixture();const c=put(s,0,'039','front',0,{ready:false});s.phase='attack';s.players[0].ap=0;s=advance(s);assert.equal(s.players[0].front[0].ready,true);assert.equal(s.players[0].ap,0);
 s.players[0].front[0].ready=false;s=advance(s,4);assert.equal(s.players[0].front[0].ready,true);assert.equal(s.players[0].ap,3);assert.equal(s.players[0].front[0].uid,c.uid);
});
test('phase transitions cannot return to Main, and Move and Attack cost no AP',()=>{
 let s=fixture();const c=put(s,0,'103','energy',0);s.phase='move';s.players[0].ap=2;s=dispatch(s,{type:'move',uid:c.uid,slot:0});assert.equal(s.players[0].ap,2);s=advance(s,2);assert.equal(s.phase,'attack');assert.ok(!legalActions(s).some(a=>a.type==='play'||a.type==='ability'));
 s=dispatch(s,{type:'attack',uid:c.uid});assert.equal(s.players[0].ap,2);assert.equal(controller(s),1);assertState(s);
});
test('using required targets is mandatory for Bread and Getsuga',()=>{
 let s=fixture();power(s);const bread=hand(s,0,'062'),getsuga=hand(s,0,'064');
 // Power characters themselves are legal Bread targets.
 assert.ok(legalActions(s).some(a=>a.uid===bread.uid));assert.ok(!legalActions(s).some(a=>a.uid===getsuga.uid));
 s.players[0].removed.push(...s.players[0].energy.filter(Boolean));s.players[0].energy.fill(null);
 // Put an energy-generating field plus cards in the line: no invented legal target check.
 const f=put(s,0,'108','energy',0);f.energyBoostTurn=s.turn;
 assert.ok(!legalActions(s).some(a=>a.uid===bread.uid));
});
test('Getsuga normal use has BP cap, raised by any own Ichigo, and target must be Front',()=>{
 const s=fixture();power(s);const event=hand(s,0,'064');put(s,1,'104','front',0);put(s,1,'039','energy',0);
 // Power includes Ichigo: cap becomes 5000.
 assert.ok(legalActions(s).some(a=>a.uid===event.uid));const x=dispatch(s,{type:'play',uid:event.uid});assert.equal(x.pending.choices.length,1);const y=choose(x,[s.players[1].front[0].uid]);assert.equal(y.players[1].front[0],null);assert.ok(y.players[1].energy[0]);assertState(y);
 const noIchigo=fixture();put(noIchigo,0,'102','energy',0);put(noIchigo,0,'102','energy',1);put(noIchigo,1,'104','front',0);const e=hand(noIchigo,0,'064');assert.ok(!legalActions(noIchigo).some(a=>a.uid===e.uid));
});
test('Orihime bounces a different cheap character, or herself if no target',()=>{
 let s=fixture();const base=put(s,0,'039','energy',0),o=hand(s,0,'035');s=dispatch(s,{type:'play',uid:o.uid,line:'energy',slot:1});assert.equal(s.pending.choices.length,1);s=choose(s,[base.uid]);assert.equal(s.players[0].energy[0],null);assert.equal(energy(s,0),2);assertState(s);
 let x=fixture();const prev=put(x,0,'035','energy',0),newO=hand(x,0,'035');x=dispatch(x,{type:'play',uid:newO.uid,line:'energy',slot:0});assert.equal(x.players[0].energy[0],null);assert.ok(x.players[0].hand.some(c=>c.uid===newO.uid));assert.ok(x.players[0].removed.some(c=>c.uid===prev.uid));assertState(x);
});
test('Uryu draw-and-discard does not allow discarding the resolving event',()=>{
 let s=fixture();power(s);const c=hand(s,0,'034');s=dispatch(s,{type:'play',uid:c.uid,line:'front',slot:0});assert.equal(s.players[0].hand.length,1);s=choose(s,[s.players[0].hand[0].uid]);assert.equal(s.players[0].outside.length,1);assertState(s);
 let x=fixture();power(x);const e=hand(x,0,'109');x=dispatch(x,{type:'play',uid:e.uid});assert.equal(x.players[0].hand.length,2);assert.ok(!x.pending.choices.some(c=>c.id===e.uid));x=choose(x,[x.pending.choices[0].id]);assert.equal(x.players[0].outside.length,2);assertState(x);
});
test('Chad rests to produce extra energy then leaves at the end of Main',()=>{
 let s=fixture();const c=put(s,0,'042','energy',0);s=dispatch(s,{type:'ability',uid:c.uid});assert.equal(energy(s,0),2);assert.equal(s.players[0].energy[0].ready,false);assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid));s=advance(s);assert.equal(s.players[0].energy[0],null);assert.equal(s.players[0].outside[0].uid,c.uid);assertState(s);
});
test('Renji mills before optional +500; BP debuff removes zero BP characters',()=>{
 let s=fixture();power(s);const renji=put(s,0,'046','front',0),friend=put(s,0,'039','front',1);s=dispatch(s,{type:'ability',uid:renji.uid});assert.equal(s.players[0].outside.length,1);assert.ok(!s.pending.choices.some(c=>c.id===renji.uid));s=choose(s,[friend.uid]);assert.equal(bp(s,s.players[0].front[1]),2000);assertState(s);
 let x=fixture();power(x);const enemy=put(x,1,'101','front',0),r=hand(x,0,'105');x=dispatch(x,{type:'play',uid:r.uid,line:'front',slot:0});x=choose(x,[enemy.uid]);assert.equal(x.players[1].front[0],null);assert.equal(x.players[0].ap,1);assertState(x);
});
test('Ichigo ability with 3 outside removes all 3 without drawing or Impact (FAQ574)',()=>{
 let s=fixture();const ichigo=putRaided(s,0,'104','front',0);grave(s,0,['034','039','107']);s=dispatch(s,{type:'ability',uid:ichigo.uid});s=choose(s,s.pending.choices.map(c=>c.id));assert.equal(s.players[0].outside.length,0);assert.equal(s.players[0].removed.length,3);assert.equal(s.players[0].hand.length,0);assert.notEqual(s.players[0].front[0].impactTurn,s.turn);assertState(s);
});
test('Ichigo ability with 4 grants exactly one card and Impact; cannot reuse this turn',()=>{
 let s=fixture();const c=putRaided(s,0,'104','front',0);grave(s,0,['034','039','107','062']);s=dispatch(s,{type:'ability',uid:c.uid});s=choose(s,s.pending.choices.slice(0,4).map(c=>c.id));assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].front[0].impactTurn,s.turn);assert.ok(!legalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid));assertState(s);
});
test('Rukia optional partial removal cannot draw, while full removal draws two (FAQ575)',()=>{
 for(const n of [2,3]){let s=fixture();power(s);grave(s,0,['034','039','107'].slice(0,n));const c=hand(s,0,'106');s=dispatch(s,{type:'play',uid:c.uid,line:'front',slot:0});s=choose(s,s.pending.choices.map(c=>c.id));assert.equal(s.players[0].hand.length,n===3?2:0);assert.equal(s.players[0].removed.length,n);assertState(s);}
});
test('Room activation retires field before draw and discard',()=>{
 let s=fixture();const c=put(s,0,'108','energy',0);s=dispatch(s,{type:'ability',uid:c.uid});assert.equal(s.players[0].energy[0],null);assert.equal(s.players[0].outside[0].uid,c.uid);assert.equal(s.players[0].hand.length,2);s=choose(s,[s.pending.choices[0].id]);assert.equal(s.players[0].outside.length,2);assertState(s);
});
test('Bread requires a target, gives +1000 BP and can recover its own spent AP',()=>{
 let s=fixture();power(s);const target=put(s,0,'107','front',0),event=hand(s,0,'062');s=dispatch(s,{type:'play',uid:event.uid});s=choose(s,[target.uid]);assert.equal(bp(s,s.players[0].front[0]),3000);assert.equal(s.players[0].ap,2);s=choose(s,['1']);assert.equal(s.players[0].ap,3);assertState(s);
});
test('Bankai may restore up to two AP without exceeding the current turn cap',()=>{
 let s=fixture();power(s);s.players[0].maxAp=2;s.players[0].ap=1;const event=hand(s,0,'066');s=dispatch(s,{type:'play',uid:event.uid});assert.equal(s.players[0].ap,0);assert.deepEqual(s.pending.choices.map(c=>c.id),['0','1','2']);s=choose(s,['2']);assert.equal(s.players[0].ap,2);assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));assertState(s);
});
test('Raid checks original energy then resets base effects and readies the new character',()=>{
 let s=fixture();put(s,0,'102','energy',0);const base=put(s,0,'103','energy',1);base.buffs=[{turn:s.turn,bp:500}];base.ready=false;const c=hand(s,0,'104');
 assert.equal(energy(s,0),4);s=dispatch(s,{type:'raid',uid:c.uid,target:base.uid,line:'front',slot:0});assert.equal(s.players[0].front[0].ready,true);assert.equal(bp(s,s.players[0].front[0]),4000);assert.equal(s.players[0].front[0].stack[0].uid,base.uid);assert.equal(energy(s,0),2);assertState(s);
 const another=hand(s,0,'104');assert.ok(!legalActions(s).some(a=>a.type==='raid'&&a.uid===another.uid&&a.target===c.uid));
});
test('full-line replacement sends Raid top to Remove and bottom to Outside',()=>{
 let s=fixture();power(s);const base=put(s,0,'039','front',0),top=hand(s,0,'104');s=dispatch(s,{type:'raid',uid:top.uid,target:base.uid,line:'front',slot:0});const c=hand(s,0,'107');s=dispatch(s,{type:'play',uid:c.uid,line:'front',slot:0});assert.ok(s.players[0].removed.some(x=>x.uid===top.uid));assert.ok(s.players[0].outside.some(x=>x.uid===base.uid));assertState(s);
});
test('battles never destroy the attacker; ties destroy only the blocker',()=>{
 for(const blockId of ['104','107']){let s=fixture();const a=put(s,0,'103','front',0),b=put(s,1,blockId,'front',0);s.phase='attack';life(s,1,['039']);s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,[b.uid]);assert.ok(s.players[0].front[0]);assert.equal(bp(s,s.players[0].front[0]),4000);assert.equal(s.players[1].front[0],null);assertState(s);}
 let s=fixture();const a=put(s,0,'039','front',0),b=put(s,1,'104','front',0);s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,[b.uid]);assert.ok(s.players[0].front[0]);assert.ok(s.players[1].front[0]);assert.equal(s.players[1].front[0].ready,false);assertState(s);
});
test('Double Block readies on first declaration even before battle, then rests on second',()=>{
 let s=fixture();const a=put(s,0,'039','front',0),a2=put(s,0,'107','front',1),b=put(s,1,'101','front',0);s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,[b.uid]);assert.equal(s.players[1].front[0].ready,true);s=dispatch(s,{type:'attack',uid:a2.uid});s=choose(s,[b.uid]);assert.equal(s.players[1].front[0].ready,false);assertState(s);
});
test('Impact damages life only after winning a blocked battle, not twice on direct hit',()=>{
 let s=fixture();const a=put(s,0,'104','front',0),b=put(s,1,'107','front',0);a.impactTurn=s.turn;s.phase='attack';life(s,1,['107','107']);s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,[b.uid]);assert.equal(s.players[1].life.length,1);assert.equal(s.status,'playing');assertState(s);
 let x=fixture();const aa=put(x,0,'104','front',0);aa.impactTurn=x.turn;x.phase='attack';life(x,1,['107','107']);x=dispatch(x,{type:'attack',uid:aa.uid});x=choose(x,['pass']);assert.equal(x.players[1].life.length,1);assertState(x);
});
test('last Final trigger can restore life before defeat; declining loses without another hit',()=>{
 for(const accept of [true,false]){let s=fixture();const a=put(s,0,'107','front',0);life(s,1,['066']);s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,['pass']);assert.equal(s.status,'playing');assert.equal(s.players[1].life.length,0);s=choose(s,[accept?'activate':'skip']);assert.equal(s.status,accept?'playing':'finished');assert.equal(s.players[1].life.length,accept?1:0);assertState(s);}
});
test('Special ignores BP threshold and Active works on Energy or already-active characters',()=>{
 let s=fixture();const a=put(s,0,'104','front',0);a.buffs=[{turn:s.turn,bp:5000}];life(s,1,['064','107']);s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,['pass']);s=choose(s,['activate']);s=choose(s,[a.uid]);assert.equal(s.players[0].front[0],null);assertState(s);
 let x=fixture();const a2=put(x,0,'107','front',0),e=put(x,1,'039','energy',0);life(x,1,['101','107']);x.phase='attack';x=dispatch(x,{type:'attack',uid:a2.uid});x=choose(x,['pass']);x=choose(x,['activate']);x=choose(x,[e.uid]);assert.equal(bp(x,x.players[1].energy[0]),4500);assert.equal(x.players[1].energy[0].ready,true);assertState(x);
});
test('Raid life trigger ignores AP but still requires energy and a legal base',()=>{
 let s=fixture();power(s,1);const base=put(s,1,'039','front',0);base.ready=false;s.players[1].ap=0;life(s,1,['104','107']);const a=put(s,0,'107','front',0);s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,['pass']);const opt=s.pending.choices.find(c=>c.action?.target===base.uid);assert.ok(opt);s=choose(s,[opt.id]);assert.equal(s.players[1].front[0].cardId,'104');assert.equal(s.players[1].front[0].ready,true);assert.equal(s.players[1].ap,0);assertState(s);
});
test('effect draw from an empty deck is safe; missing mandatory Start draw loses',()=>{
 let s=fixture();const a=put(s,0,'107','front',0);life(s,1,['034','107']);s.players[1].outside.push(...s.players[1].deck);s.players[1].deck=[];s.phase='attack';s=dispatch(s,{type:'attack',uid:a.uid});s=choose(s,['pass']);s=choose(s,['activate']);assert.equal(s.status,'playing');assertState(s);s=advance(s);assert.equal(s.status,'finished');assert.equal(s.winner,0);assertState(s);
});
test('50 seeded full games finish and preserve all 100 unique cards after every action',()=>{
 for(let seed=1;seed<=50;seed++){let s=newGame({seed,first:seed%2});let steps=0;while(s.status!=='finished'&&steps++<1500){s=dispatch(s,botAction(s));assertState(s);}assert.equal(s.status,'finished',`seed ${seed}`);}
});
