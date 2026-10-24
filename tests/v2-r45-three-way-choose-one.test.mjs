import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck}
 from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mode=n=>({id:'option'+n,label:'方案 '+n,turn:'any',
 then:[{op:'draw',count:n}]});
const special=(options)=>({id:'mayuri',name:'涅 マユリ',type:'character',
 color:'blue',energy:0,ap:1,bp:2000,gen:2,traits:['護廷十三隊'],
 implementation:'dsl',effects:{onPlay:[{op:'chooseOne',optional:false,options}]}});
const fillers=Array.from({length:12},(_,i)=>({id:'common'+i,name:'filler'+i,
 type:'character',color:'blue',energy:0,ap:1,bp:1000,gen:1,traits:[],
 implementation:'vanilla',effects:{}}));
const pack=createUniversalPack({id:'r45-three-way-acceptance',
 cards:[special([mode(1),mode(2),mode(3)]),...fillers]});
const roster={mayuri:2,...Object.fromEntries(fillers.map(x=>[x.id,4]))};
assert.deepEqual(validateUniversalDeck(pack,roster),[]);

test('Shared chooseOne legally exposes all three modes, executes exactly selected program',()=>{
 for(let option=1;option<=3;option++){
  let s=newUniversalMatch(pack,{decks:[roster,roster],first:0,seed:4500+option});
  let source;
  for(const zone of ['hand','deck','life']){
   const i=s.players[0][zone].findIndex(c=>c.cardId==='mayuri');
   if(i>=0){source=s.players[0][zone].splice(i,1)[0];break;}
  }
  assert.ok(source);s.players[0].hand.push(source);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  s=dispatchUniversalAction(pack,s,{type:'next'});
  assert.equal(s.phase,'main');
  const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&
   a.uid===source.uid&&a.line==='front');
  assert.ok(action,'source must play via ordinary AP');
  s=dispatchUniversalAction(pack,s,action);
  assert.equal(s.pending?.kind,'effect-choice-mode');
  const options=legalUniversalActions(pack,s).filter(a=>a.type==='chooseEffectMode');
  assert.deepEqual(options.map(a=>a.mode),['option1','option2','option3']);
  assert.equal(options.some(a=>a.mode==='skip'),false);
  const handBefore=s.players[0].hand.length, deckBefore=s.players[0].deck.length;
  s=dispatchUniversalAction(pack,s,{type:'chooseEffectMode',mode:'option'+option});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].hand.length,handBefore+option);
  assert.equal(s.players[0].deck.length,deckBefore-option);
  assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 }
});
test('Three-mode chooser keeps strict invalid/duplicated mode and unknown nested opcode rejection',()=>{
 assert.throws(()=>createUniversalPack({id:'r45-bad-one',cards:[
  special([mode(1)]),...fillers]}));
 assert.throws(()=>createUniversalPack({id:'r45-bad-four',cards:[
  special([mode(1),mode(2),mode(3),mode(4)]),...fillers]}));
 assert.throws(()=>createUniversalPack({id:'r45-bad-duplicate',cards:[
  special([mode(1),mode(1),mode(3)]),...fillers]}));
 assert.throws(()=>createUniversalPack({id:'r45-bad-branch',cards:[
  special([mode(1),mode(2),{...mode(3),then:[{op:'inventedPayment'}]}]),...fillers]}));
});
