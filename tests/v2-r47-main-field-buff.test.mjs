import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const basic=(id,bp=1500)=>({id,name:id,type:'character',color:'green',energy:0,ap:1,
 bp,gen:1,traits:[],effects:{},implementation:'vanilla'});
const kirito={...basic('observer',5000),implementation:'dsl',
 mainAbility:{op:'fieldOnceBuffOther',lines:'field',oncePerTurn:true,bp:1000}};
const cards=[kirito,basic('other',2000),...Array.from({length:11},(_,i)=>basic('f'+i))];
const pack=createUniversalPack({id:'r47-own-main-buff',cards});
const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===0?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
function pull(s,p,id){for(const z of ['hand','deck','life','outside']){
 const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
 if(i>=0)return arr.splice(i,1)[0];
}throw Error('Missing owned '+id);}
function scene(line='energy',withOther=true){
 let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:47087});
 const k=pull(s,0,'observer');k.ready=false;
 k.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0][line][0]=k;
 let other=null;
 if(withOther){other=pull(s,0,'other');other.ready=true;
  other.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0][line==='energy'?'front':'energy'][1]=other;}
 s.phase='main';s.active=0;
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,k,other};
}
test('Generic MAIN Turn1 on ENERGY while REST, selecting OTHER own uid on FRONT',()=>{
 let {s,k,other}=scene();
 const act={type:'activate',uid:k.uid,mode:'fieldOnceBuffOther'};
 assert.ok(legalUniversalActions(pack,s).some(a=>JSON.stringify(a)===JSON.stringify(act)));
 s=dispatchUniversalAction(pack,s,act);
 assert.equal(s.pending?.kind,'effect-buff-own');
 const valid=legalUniversalActions(pack,s);
 assert.deepEqual(valid,[{type:'chooseOwnBuff',uid:other.uid}]);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(pack,s,{difficulty});
  assert.ok(valid.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const prior=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseOwnBuff',uid:k.uid}),
  /not currently legal/);
 assert.deepEqual(s,prior);
 s=dispatchUniversalAction(pack,JSON.parse(JSON.stringify(s)),valid[0]);
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,s.players[0].front[1]),3000);
 assert.equal(universalBp(pack,s,s.players[0].energy[0]),5000);
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.type==='activate'&&a.uid===k.uid));
 const later=structuredClone(s);later.turn++;
 assert.equal(universalBp(pack,later,later.players[0].front[1]),2000);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('FRONT source also works; zero OTHER target blocks use entirely',()=>{
 const a=scene('front');
 assert.ok(legalUniversalActions(pack,a.s).some(x=>x.type==='activate'&&x.uid===a.k.uid));
 const b=scene('energy',false);
 assert.ok(!legalUniversalActions(pack,b.s).some(x=>x.type==='activate'&&x.uid===b.k.uid));
});
test('Only exact common printed field-once profile is accepted',()=>{
 for(const main of [
  {...kirito.mainAbility,oncePerTurn:false},
  {...kirito.mainAbility,lines:'front'},
  {...kirito.mainAbility,bp:0},
  {...kirito.mainAbility,extra:true}
 ])assert.throws(()=>createUniversalPack({id:'fake',cards:[{...kirito,mainAbility:main}]}));
});
