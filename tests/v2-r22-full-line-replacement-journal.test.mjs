import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'X'+i,name:'X'+i,type:'character',color:'purple',energy:0,
 ap:1,bp:1500,gen:1,implementation:'vanilla'
}));
const pack=createUniversalPack({id:'r22-full-line-replacement',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('physical not found '+id);
}
function full(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:22022,first:0});
 const top=take(s,'X1'),under=take(s,'X2');
 under.faceDown=true;top.stack=[under];
 s.players[0].front[0]=top;
 for(let i=1;i<4;i++)s.players[0].front[i]=take(s,'X'+(i+2));
 const played=take(s,'X0');s.players[0].hand.push(played);
 s.phase='main';
 assert.equal(assertUniversalMatch(packs,s),true);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===played.uid&&
  a.line==='front'&&a.slot===0&&a.replaceUid===top.uid);
 assert.ok(action,'full line must require exact replacement UID');
 return {s,top,under,played,action};
}
test('full line replaces one top and buried physical UID exactly once, no retirement',()=>{
 let {s,top,under,played,action}=full();
 const before=s.zoneMoveEvents.length;
 const original=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{...action,replaceUid:'0-99999'}),/not currently legal/);
 assert.deepEqual(s,original);
 s=dispatchUniversalAction(packs,s,action);
 const moves=s.zoneMoveEvents.slice(before);
 const removed=moves.filter(e=>e.to==='removed'||e.from==='raid-under');
 assert.equal(removed.length,2);
 assert.deepEqual(removed.map(e=>e.to),['outside','removed'],'official Q61: bottom goes outside');
 assert.equal(s.players[0].removed.some(c=>c.uid===under.uid),false);
 assert.deepEqual(removed.map(e=>[e.uid,e.from,e.reason]),
  [[under.uid,'raid-under','rule'],[top.uid,'front','rule']]);
 assert.ok(removed[0].order<removed[1].order);
 assert.equal(s.players[0].front[0].uid,played.uid);
 assert.ok(s.players[0].removed.some(c=>c.uid===top.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===under.uid));
 assert.equal(s.turnRetireEvents.some(e=>e.uid===top.uid||e.uid===under.uid),false);
 assert.equal(universalPublicView(packs,s,1).zoneMoveEvents,undefined);
 assert.equal(assertUniversalMatch(packs,s),true);
});
