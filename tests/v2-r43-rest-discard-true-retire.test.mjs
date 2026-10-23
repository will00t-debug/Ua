import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const after={op:'deployNamedFromZones',name:'Asuna',zones:['hand'],line:'any',ready:true,optional:true,color:'green',ap:1,maxEnergy:3,grantBp:1000};
const mk=(i,x={})=>({id:'QA-'+String(i).padStart(3,'0'),name:'Other'+i,type:'character',color:'green',energy:0,ap:1,bp:1000,gen:1,traits:[],implementation:'vanilla',...x});
const cards=[mk(1,{name:'Yuuki',energy:2,implementation:'dsl',mainAbility:{op:'restDiscardRetireThen',lines:'field',discardCount:1,then:[after]}}),
 mk(2,{name:'Asuna',energy:3}),mk(3,{name:'payment'}),...Array.from({length:10},(_,i)=>mk(i+4))];
const pack=createUniversalPack({id:'qa-r43',cards}),deck=Object.fromEntries(cards.map((x,i)=>[x.id,i===12?2:4]));
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){for(const z of ['hand','deck','life','outside']){const a=s.players[0][z],i=a.findIndex(x=>x.cardId===id);if(i>=0)return a.splice(i,1)[0]}throw Error('Missing '+id)}
function fixture(){let s=newUniversalMatch(pack,{decks:[deck,deck],seed:4306,first:0});
 const src=take(s,'QA-001'),target=take(s,'QA-002'),payment=take(s,'QA-003');
 src.ready=true;src.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=src;
 s.players[0].hand.push(target,payment);
 for(let i=0;i<4&&s.phase!=='main';i++)s=use(s,{type:'next'});
 return {s,src,target,payment};}
test('R43 no free entry before real REST+discard+self retirement',()=>{
 let {s,src,payment}=fixture();
 const start=legalUniversalActions(pack,s).find(x=>x.type==='activate'&&x.uid===src.uid&&x.mode==='restDiscardRetire');
 assert.ok(start);s=use(s,start);
 assert.equal(s.pending?.kind,'main-discard-self-retire');
 assert.equal(s.players[0].front[0].ready,false);
 assert.ok(!s.players[0].outside.some(c=>c.uid===src.uid));
 const saved=structuredClone(s);
 assert.throws(()=>use(s,{type:'chooseMainDiscardRetire',uid:'fake'}),/not currently legal/);
 assert.deepEqual(s,saved);assert.equal(assertUniversalMatch(pack,s),true);
});
test('R43 payment true retires and earned named ACTIVE only after all physical costs',()=>{
 let {s,src,target,payment}=fixture();
 s=use(s,legalUniversalActions(pack,s).find(x=>x.type==='activate'&&x.mode==='restDiscardRetire'));
 s=use(s,{type:'chooseMainDiscardRetire',uid:payment.uid});
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 assert.ok(s.players[0].outside.some(c=>c.uid===src.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===src.uid&&e.reason==='retirement'));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===payment.uid&&e.from==='hand'&&e.to==='outside'&&e.reason==='payment'&&e.sourceUid===src.uid));
 const a=legalUniversalActions(pack,s).find(x=>x.type==='chooseNamedZoneDeploy'&&x.uid===target.uid&&x.line==='front');
 assert.ok(a);s=use(s,a);
 const character=s.players[0].front[a.slot];assert.equal(character.uid,target.uid);assert.equal(character.ready,true);
 assert.ok(character.buffs.some(b=>b.bp===1000&&b.untilTurn===s.turn));
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R43 malformed main program and serialized pending rejected atomically',()=>{
 for(const bad of [{op:'restDiscardRetireThen',lines:'field',discardCount:0,then:[after]},
  {op:'restDiscardRetireThen',lines:'energy',discardCount:1,then:[after]},
  {op:'restDiscardRetireThen',lines:'field',discardCount:1,then:[]}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],mainAbility:bad},...cards.slice(1)]}),/unsupported main/);
 }
 let {s}=fixture();s=use(s,legalUniversalActions(pack,s).find(a=>a.type==='activate'&&a.mode==='restDiscardRetire'));
 for(const mutate of [q=>{q.sourceStamp++},q=>{q.sourceUid='0-forged'},q=>{q.choices=[]}]){
  const fake=structuredClone(s);mutate(fake.pending);
  assert.throws(()=>assertUniversalMatch(pack,fake),/Invalid paid MAIN retire/);
 }
});
