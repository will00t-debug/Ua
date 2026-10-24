import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'P'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({id,name:id,type:'character',color:'green',energy:0,
 ap:1,bp:1000,gen:1,implementation:id==='P00'?'dsl':'vanilla',
 ...(id==='P00'?{effects:{onPlay:[{op:'searchDeckOne',
  filter:{field:'name',value:'P01'},optional:true,shuffle:true}]}}:{})}));
const pack=createUniversalPack({id:'r20-search-uid-provenance',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function opened(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:20202});
 const source=take(s,'P00');s.players[0].hand.push(source);
 const target=take(s,'P01');s.players[0].deck.push(target);
 for(let k=0;k<5&&s.phase!=='main';k++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-search-deck');
 assert.ok(s.pending.choices.includes(target.uid));
 return {s,source,target};
}
test('a chosen deck search moves the exact UID once, retaining its field source and secrecy',()=>{
 let {s,source,target}=opened(),before=s.zoneMoveEvents.length;
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const allowed=legalUniversalActions(packs,s).find(x=>x.type==='chooseDeckSearch'&&x.uid===target.uid);
 assert.ok(allowed);
 const old=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDeckSearch',uid:'1-5000'}),/not currently legal/);
 assert.deepEqual(s,old);
 s=dispatchUniversalAction(packs,s,allowed);
 const changes=s.zoneMoveEvents.slice(before);
 assert.equal(changes.length,1);
 assert.deepEqual([changes[0].uid,changes[0].from,changes[0].to,changes[0].reason,
  changes[0].sourceUid,changes[0].sourceCardId],
  [target.uid,'deck','hand','own-effect',source.uid,'P00']);
 assert.ok(s.players[0].hand.some(c=>c.uid===target.uid));
 assert.ok(!s.players[0].deck.some(c=>c.uid===target.uid));
 const other=universalPublicView(packs,s,1);
 assert.equal(other.players[0].hand,null);
 assert.ok(!JSON.stringify(other).includes('zoneMoveEvents'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('optional declined search changes no card zone and writes zero extra move events',()=>{
 let {s}=opened(),before=s.zoneMoveEvents.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDeckSearch',uid:null});
 assert.equal(s.zoneMoveEvents.length,before);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
