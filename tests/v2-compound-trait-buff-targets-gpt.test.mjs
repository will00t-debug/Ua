import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';

// Synthetic QA; no new real card identities registered.
const ids=Array.from({length:13},(_,i)=>'Z'+String(i).padStart(2,'0'));
const specs=ids.map(id=>({
 id,name:id,color:'green',energy:0,ap:1,bp:1000,gen:1,type:'character',
 implementation:id==='Z00'?'dsl':'vanilla',
 ...(id==='Z00'?{effects:{onPlay:[{op:'buffOwnTraitAllTurn',trait:'DFN',bp:500}]}}:{}),
 ...(id==='Z01'?{traits:['DFN／FourthRaid'],traitComponents:['DFN','FourthRaid']}:{}),
 ...(id==='Z02'?{traits:['DFN／Unverified']}:{}),
 ...(id==='Z03'?{traits:['DFN']}:{}),
 ...(id==='Z04'?{traits:['Other']}:{}),
}));
const pack=createUniversalPack({id:'gpt-qa-compound-trait-targets',cards:specs});
const packs=[pack,pack],counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card '+id);
}
function put(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;return c;
}
test('shared trait buff targets source-audited composites, not unverified slash guesses',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:20261022,first:0});
 const audited=put(s,0,'Z01','front',1);
 const unverified=put(s,0,'Z02','front',2);
 const exact=put(s,0,'Z03','energy',0);
 const other=put(s,0,'Z04','energy',1);
 const enemy=put(s,1,'Z03','front',1);
 const source=take(s,0,'Z00');s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'synthetic source must be payable');
 const v=dispatchUniversalAction(packs,s,action);
 assert.equal(v.pending,null);
 assert.equal(universalBp(packs,v,v.players[0].front[1]),1500,'explicit component DFN qualifies');
 assert.equal(universalBp(packs,v,v.players[0].front[2]),1000,'unverified composite cannot be split');
 assert.equal(universalBp(packs,v,v.players[0].energy[0]),1500,'single exact DFN qualifies');
 assert.equal(universalBp(packs,v,v.players[0].energy[1]),1000,'other trait not selected');
 assert.equal(universalBp(packs,v,v.players[1].front[1]),1000,'never buffs opponent');
 assert.deepEqual(v.players[0].front[1].buffs,[{bp:500,untilTurn:v.turn}]);
 assert.deepEqual(v.players[0].front[2].buffs,[]);
 assert.equal(v.players[0].front[1].uid,audited.uid);
 assert.equal(v.players[0].front[2].uid,unverified.uid);
 assert.equal(v.players[0].energy[0].uid,exact.uid);
 assert.equal(v.players[0].energy[1].uid,other.uid);
 assert.equal(v.players[1].front[1].uid,enemy.uid);
 assert.equal(universalPublicView(packs,v,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,v),true);
});
