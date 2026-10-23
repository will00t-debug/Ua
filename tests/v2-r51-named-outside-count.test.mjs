import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalBp,universalImpact,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

// Shared cross-title atom: counts PHYSICAL cards bearing any named card name
// in own OUTSIDE, never the number of distinct names (unlike Q2337).
// Official source example: UA15BT/SAO-1-070 (4 names -> own-turn BP+500,
// 6 names -> IMPACT1 during either turn). This is an atom test, NOT a formal
// whole-card registration or exhaustive independent FAQ certification.
const names=['ユウキ','マザーズ・ロザリオ'];
const bpCondition={kind:'ownOutsideNamedCountAtLeast',turn:'own',min:4,names};
const impactCondition={kind:'ownOutsideNamedCountAtLeast',turn:'any',min:6,names};
const basic=(id,name)=>({id,name,color:'green',type:'character',
 energy:0,ap:1,bp:1000,gen:1,traits:[],effects:{},implementation:'vanilla'});
const source={...basic('source','アスナ'),energy:3,bp:3500,traits:['ALO'],
 implementation:'dsl',passiveBonuses:[
  {condition:bpCondition,bp:500},{condition:impactCondition,impact:1}
 ]};
const cards=[source,basic('yuuki','ユウキ'),basic('rosario','マザーズ・ロザリオ'),
 {...basic('alias','another print'),implementation:'dsl',
  nameAliases:['ユウキ','マザーズ・ロザリオ']},
 basic('other','other'),...Array.from({length:8},(_,i)=>basic('f'+i,'f'+i))];
const pack=createUniversalPack({id:'r51-named-outside-count',cards});
const printed=c=>pack.cards[c.cardId];
const physical=(id,i,owner=0)=>({uid:owner+'-'+i,cardId:id});
function state(ids,opponent=[]){
 return {active:0,players:[
  {outside:ids.map((id,i)=>physical(id,i))},
  {outside:opponent.map((id,i)=>physical(id,i,1))}
 ]};
}
const evalCondition=(s,condition,owner=0)=>
 matchesV2LiveCondition(s,owner,'0-source',condition,printed,()=>0);

test('named OUTSIDE count uses total matching physical cards, not distinct names',()=>{
 const s=state(['yuuki','yuuki','rosario','other']);
 assert.equal(evalCondition(s,bpCondition),false);
 assert.equal(evalCondition(s,impactCondition),false);
 s.players[0].outside.push(physical('yuuki',4));
 assert.equal(evalCondition(s,bpCondition),true);
 assert.equal(evalCondition(s,impactCondition),false);
 s.players[0].outside.push(physical('rosario',5));
 assert.equal(evalCondition(s,impactCondition),false);
 s.players[0].outside.push(physical('yuuki',6));
 assert.equal(evalCondition(s,impactCondition),true);
});
test('outside alias matching counts one physical card once even if it matches both names',()=>{
 const s=state(['alias','yuuki','rosario','other']);
 assert.equal(evalCondition(s,bpCondition),false);
 s.players[0].outside.push(physical('alias',4));
 assert.equal(evalCondition(s,bpCondition),true);
 assert.equal(evalCondition(s,impactCondition),false);
});
test('own OUTSIDE ignores opponent, hand, removed, underlayers and own-turn BP expires',()=>{
 const s=state(['yuuki','rosario','yuuki'],['yuuki','yuuki','rosario']);
 s.players[0].hand=[physical('yuuki',20)];
 s.players[0].removed=[physical('yuuki',21)];
 s.players[0].front=[{...physical('yuuki',22),under:[physical('rosario',23)]}];
 assert.equal(evalCondition(s,bpCondition),false);
 assert.equal(evalCondition(s,impactCondition),false);
 s.players[0].outside.push(physical('yuuki',3),physical('rosario',4),physical('yuuki',5));
 assert.equal(evalCondition(s,bpCondition),true);
 assert.equal(evalCondition(s,impactCondition),true);
 s.active=1;
 assert.equal(evalCondition(s,bpCondition),false);
 assert.equal(evalCondition(s,impactCondition),true);
});
test('printed condition schema rejects malformed names, duplicate aliases and invalid thresholds',()=>{
 for(const bad of [
  {...bpCondition,names:[]},
  {...bpCondition,names:['ユウキ','ユウキ']},
  {...bpCondition,names:['ユウキ','']},
  {...bpCondition,names:['ユウキ',5]},
  {...bpCondition,min:0},
  {...bpCondition,min:201},
  {...bpCondition,zone:'outside'},
  {...bpCondition,turn:'mine'}
 ]){
  const changed={...source,passiveBonuses:[{condition:bad,bp:500}]};
  assert.throws(()=>createUniversalPack({id:'r51-invalid',cards:[changed,...cards.slice(1)]}));
 }
});

test('R51 live 50-card match recomputes BP+500 at 4 and IMPACT1 at 6 own OUTSIDE names',()=>{
 const ids=Object.keys(pack.cards);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 assert.equal(Object.values(counts).reduce((n,v)=>n+v,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const s=newUniversalMatch(pack,{decks:[counts,counts],seed:51070,first:0});
 const take=id=>{
  for(const zone of ['hand','deck','life']){
   const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
   if(i>=0)return a.splice(i,1)[0];
  }
  throw Error('missing named OUTSIDE physical '+id);
 };
 const asuna=take('source');asuna.ready=true;
 asuna.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=asuna;
 const outside=id=>s.players[0].outside.push(take(id));
 assert.equal(universalBp(pack,s,asuna),3500);
 assert.equal(universalImpact(pack,s,asuna),0);
 for(let i=0;i<3;i++)outside('yuuki');
 assert.equal(universalBp(pack,s,asuna),3500);
 outside('rosario');
 assert.equal(universalBp(pack,s,asuna),4000);
 assert.equal(universalImpact(pack,s,asuna),0);
 outside('yuuki');outside('rosario');
 assert.equal(universalBp(pack,s,asuna),4000);
 assert.equal(universalImpact(pack,s,asuna),1);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 s.active=1;
 assert.equal(universalBp(pack,s,asuna),3500);
 assert.equal(universalImpact(pack,s,asuna),1);
});
