import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
const phases=[{phase:'attack',edge:'end',turn:'own',then:[{op:'retireSourceOnPhaseEnd'}]},
 {phase:'attack',edge:'end',turn:'opponent',then:[{op:'retireSourceOnPhaseEnd'}]}];
const mk=(i,a={})=>({id:'QA-'+String(i).padStart(3,'0'),name:'C'+i,color:'green',
 type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],implementation:'vanilla',...a});
const cards=[mk(1,{implementation:'dsl',phaseEffects:phases}),...Array.from({length:12},(_,i)=>mk(i+2))];
const pack=createUniversalPack({id:'r44-boundary',cards});
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function place(s,p){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],
 i=a.findIndex(c=>c.cardId==='QA-001');if(i<0)continue;const c=a.splice(i,1)[0];
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p].front[0]=c;return c;}throw Error('Missing source');}
for(const owner of [0,1])test('R44 both players attack-end retire stamped source owner '+owner,()=>{
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed:4401,first:0});
 const src=place(s,owner);
 for(let n=0;n<3;n++)s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');s=use(s,{type:'next'});
 assert.ok(s.players[owner].outside.some(c=>c.uid===src.uid));
 assert.equal(s.players[owner].front[0],null);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R44 phase-only op illegal in other timing, with extra payment or FIELD',()=>{
 for(const invalid of [
  {...cards[0],phaseEffects:[{phase:'main',edge:'end',turn:'own',then:[{op:'retireSourceOnPhaseEnd'}]}]},
  {...cards[0],phaseEffects:[],effects:{onPlay:[{op:'retireSourceOnPhaseEnd'}]}},
  {...cards[0],phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[{op:'retireSourceOnPhaseEnd',payAp:1}]}]},
  {...cards[0],type:'field'}])
  assert.throws(()=>createUniversalPack({id:'bad',cards:[invalid,...cards.slice(1)]}),/invalid/);
});

test('R44 saved MAIN or ordinary ATTACK cannot inject earned attack-end self-retirement',()=>{
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed:44012,first:0});
 const source=place(s,0);
 for(let i=0;i<2;i++)s=use(s,{type:'next'});
 const fake={op:'retireSourceOnPhaseEnd',owner:0,sourceUid:source.uid,
  sourceName:'C1',sourceStamp:source.fieldEntryStamp};
 let saved=structuredClone(s);saved.effectQueue.push(fake);
 assert.throws(()=>assertUniversalMatch(pack,saved),/Unproven queued attack-end/);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 saved=structuredClone(s);saved.effectQueue.push(fake);
 assert.throws(()=>assertUniversalMatch(pack,saved),/Unproven queued attack-end/);
});
test('R44 two printed same-name but different UID phase sources use original legal priority',()=>{
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed:44014,first:0});
 const extract=()=>{for(const zone of ['deck','hand','life','outside']){
  const a=s.players[0][zone],i=a.findIndex(c=>c.cardId==='QA-001');
  if(i>=0)return a.splice(i,1)[0];}throw Error('Need source')};
 for(let i=0;i<2;i++){
  const c=extract();c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[i]=c;
 }
 for(let i=0;i<3;i++)s=use(s,{type:'next'});
 s=use(s,{type:'next'});
 assert.equal(s.pending?.kind,'phase-order');
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 for(let i=0;i<3&&s.pending?.kind==='phase-order';i++){
  const a=legalUniversalActions(pack,s).find(x=>x.key);
  assert.ok(a);s=use(s,a);
 }
 assert.ok(s.players[0].outside.filter(c=>c.cardId==='QA-001').length>=2);
 assert.equal(assertUniversalMatch(pack,s),true);
});
