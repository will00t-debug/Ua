import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPrivateChoices,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const registered=registeredV2TitlePack('bleach').cards['BLC-2-055'];
assert.ok(registered,'B must register official printed BLC-2-055, not just test-only fixture');
assert.deepEqual(registered.effects.onPlay,[{op:'peekTopOrBottom'}]);
const original=CARDS.find(c=>c.identity==='BLC-2-055');
assert.ok(original);assert.match(original.effect,/牌堆頂或牌堆底/);
const cards=[{id:'BLC-2-055',name:original.nameJa||original.name,type:'character',
 color:'purple',energy:0,ap:1,bp:2000,gen:1,implementation:'dsl',
 templateEffects:{onPlay:[{template:'peekTopOrBottom'}]}},
 ...Array.from({length:12},(_,i)=>({id:'TEST-ONLY-'+i,name:'QA '+i,type:'character',
 color:'purple',energy:0,ap:1,bp:1500,gen:1,implementation:'vanilla'}))];
const pack=createUniversalPack({id:'source-anchored-top-bottom-test',cards}),packs=[pack,pack];
const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function match(){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:77,first:0});
 const p=s.players[0];let src;
 for(const zone of ['hand','deck','life','outside']){
  const i=p[zone].findIndex(c=>c.cardId==='BLC-2-055');
  if(i>=0){src=p[zone].splice(i,1)[0];break;}
 }
 p.hand.push(src);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const a=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===src.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);return {s,a};
}
test('BLC-2-055 official-sourced: top unchanged, bottom rotated, outside illegal and no UID loss',()=>{
 const {s,a}=match(),snapshot=structuredClone(s);
 const q=dispatchUniversalAction(packs,s,a),before=q.players[0].deck.map(x=>x.uid);
 assert.equal(q.pending?.kind,'private-top-place');
 assert.deepEqual(legalUniversalActions(packs,q),[
  {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'bottom'}]);
 assert.equal(universalPrivateChoices(packs,q,0)?.options[0].card.cardId,q.players[0].deck[0].cardId);
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.ok(!JSON.stringify(universalPublicView(packs,q,1)).includes(before[0]));
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'outside'}),/not currently legal/);
 const top=dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'top'});
 assert.deepEqual(top.players[0].deck.map(x=>x.uid),before);
 const bottom=dispatchUniversalAction(packs,q,{type:'chooseTopCard',mode:'bottom'});
 assert.deepEqual(bottom.players[0].deck.map(x=>x.uid),[...before.slice(1),before[0]]);
 assert.equal(assertUniversalMatch(packs,bottom),true);
 assert.deepEqual(s,snapshot);
});
test('empty private deck finishes effect without fabricating extra card choices',()=>{
 const {s,a}=match();
 while(s.players[0].deck.length)s.players[0].outside.push(s.players[0].deck.pop());
 const done=dispatchUniversalAction(packs,s,a);
 assert.equal(done.pending,null);assert.equal(done.players[0].deck.length,0);
 assert.equal(assertUniversalMatch(packs,done),true);
});
test('top/bottom filter refuses unknown options or illegal outside raw operation',()=>{
 for(const effect of [
  {template:'peekTopOrBottom',outside:true},{op:'peekTopOrBottom',mode:'outside'}
 ]){
  const printed={...cards[0],templateEffects:undefined,effects:undefined};
  assert.throws(()=>createUniversalPack({id:'invalid',cards:[{...printed,
   ...(effect.template?{templateEffects:{onPlay:[effect]}}:{effects:{onPlay:[effect]}})}]}),
   /invalid|unsupported/);
 }
});
