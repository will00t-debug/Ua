import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
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
