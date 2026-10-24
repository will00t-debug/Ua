import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const op={op:'deployNamedFromZones',name:'Asuna',zones:['hand'],line:'any',
 ready:true,optional:true,color:'green',ap:1,maxEnergy:3,grantBp:1000};
const mk=(i,details={})=>({id:'QA-'+String(i).padStart(3,'0'),name:'QA'+i,
 type:'character',color:'green',energy:0,ap:1,bp:1000,gen:1,traits:[],
 implementation:'vanilla',...details});
const cards=[mk(1,{name:'source',implementation:'dsl',effects:{onPlay:[op]}}),
 mk(2,{name:'Asuna',color:'green',energy:3,ap:1,bp:2500}),
 mk(3,{name:'Asuna',color:'blue',energy:2}),
 mk(4,{name:'Asuna',color:'green',energy:4}),
 mk(5,{name:'Asuna',color:'green',energy:2,ap:2}),
 ...Array.from({length:8},(_,i)=>mk(6+i))];
const pack=createUniversalPack({id:'r43-printed-hand',cards}),deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const doAction=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){for(const z of ['hand','deck','outside','life']){const a=s.players[0][z],i=a.findIndex(x=>x.cardId===id);if(i>=0)return a.splice(i,1)[0]}throw Error('missing '+id)}
function fixture(){
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed:431,first:0});
 const source=take(s,'QA-001');s.players[0].hand.push(source);
 const choices=['QA-002','QA-003','QA-004','QA-005'].map(id=>take(s,id));
 s.players[0].hand.push(...choices);
 for(let i=0;i<4&&s.phase!=='main';i++)s=doAction(s,{type:'next'});
 const play=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(play);s=doAction(s,play);
 return {s,source,choices};
}
test('R43 printed exact name/color/AP/energy ≤3 yields only genuine green Asuna',()=>{
 const {s,choices}=fixture();assert.equal(s.pending.kind,'effect-named-zone-entry');
 assert.deepEqual(s.pending.handChoices,[choices[0].uid]);
 const acts=legalUniversalActions(pack,s);
 assert.ok(acts.some(a=>a.type==='chooseNamedZoneDeploy'&&a.uid===choices[0].uid&&a.line==='front'));
 for(const c of choices.slice(1))assert.ok(!acts.some(a=>a.uid===c.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('R43 free ACTIVE on successful entry buffs actual UID until this turn; skip gives none',()=>{
 let {s,source,choices}=fixture();
 const act=legalUniversalActions(pack,s).find(a=>a.type==='chooseNamedZoneDeploy'&&a.uid===choices[0].uid&&a.line==='front');
 const before=s.players[0].apCards.filter(c=>c.ready).length;s=doAction(s,act);
 const actual=s.players[0].front[act.slot];
 assert.equal(actual.uid,choices[0].uid);assert.equal(actual.ready,true);
 assert.deepEqual(actual.buffs?.filter(b=>b.bp===1000),[{bp:1000,untilTurn:s.turn}]);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,before);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 let t=fixture().s;t=doAction(t,{type:'chooseNamedZoneDeploy',uid:null});
 assert.equal(t.pending,null);assert.ok(!t.players[0].front.some(c=>c?.buffs?.some(b=>b.bp===1000)));
});
test('R43 filter cannot be expanded, omitted or used to mint extra payment',()=>{
 for(const invalid of [{...op,grantBp:0},{...op,grantBp:5001},{...op,ap:0},
  {...op,maxEnergy:31},{...op,payAp:1},{...op,grantBp:undefined}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],effects:{onPlay:[invalid]}},...cards.slice(1)]}),/invalid/);
 }
 const {s}=fixture();
 for(const corrupt of [q=>{q.color='blue'},q=>{q.grantBp=5000},q=>{q.maxEnergy=10},q=>{q.handChoices=[]}]){
  const altered=structuredClone(s);corrupt(altered.pending);
  assert.throws(()=>assertUniversalMatch(pack,altered),/Invalid named free zone entry/);
 }
});

test('R44 named free REST may filter printed energy/AP/color with NO invented BP buff',()=>{
 const rest={op:'deployNamedFromZones',name:'Asuna',zones:['hand'],line:'any',
  ready:false,optional:true,color:'green',ap:1,maxEnergy:3};
 const noBuff=createUniversalPack({id:'r44-filtered-rest',cards:[
  {...cards[0],effects:{onPlay:[rest]}},...cards.slice(1)]});
 assert.deepEqual(noBuff.cards['QA-001'].effects.onPlay,[rest]);
 for(const bad of [{...rest,grantBp:0},{...rest,grantBp:undefined},
  {...rest,color:null},{...rest,maxEnergy:31},{...rest,payAp:1}]){
  assert.throws(()=>createUniversalPack({id:'r44-invalid',cards:[
   {...cards[0],effects:{onPlay:[bad]}},...cards.slice(1)]}),/invalid/);
 }
});
