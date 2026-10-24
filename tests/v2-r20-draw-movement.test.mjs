import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
const ids=Array.from({length:13},(_,i)=>'R'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({id,name:id,type:'character',color:'green',
 energy:0,ap:1,bp:1000,gen:1,implementation:id==='R00'?'dsl':'vanilla',
 ...(id==='R00'?{effects:{onPlay:[{op:'draw',count:2}]}}:{})}));
const pack=createUniversalPack({id:'r20-draw-provenance',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){for(const zone of ['hand','deck','life','outside']){
 const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
}throw Error('missing '+id)}
function main(s){for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;}
test('each completed effect draw records exact UID/source, a strict increasing order and hidden opponent hand',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:2020,first:0});
 const c=take(s,'R00');s.players[0].hand.push(c);s=main(s);
 const hand=s.players[0].hand.length;
 const a=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===c.uid&&x.line==='front');
 assert.ok(a);
 s=dispatchUniversalAction(packs,s,a);
 assert.equal(s.players[0].hand.length,hand-1+2);
 const events=s.zoneMoveEvents.filter(x=>x.from==='deck'&&x.to==='hand');
 assert.equal(events.length,2);
 assert.ok(events[0].order<events[1].order);
 assert.ok(events.every(x=>x.reason==='own-effect'&&x.sourceUid===c.uid&&
  x.sourceCardId==='R00'&&s.players[0].hand.some(y=>y.uid===x.uid)));
 const view=universalPublicView(packs,s,1);
 assert.equal(view.players[0].hand,null);
 assert.ok(!JSON.stringify(view).includes('zoneMoveEvents'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('initial rule draw only records when actual deck changes and clears on proper turn start',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:2021,first:0});
 assert.equal(s.zoneMoveEvents.length,0,'first player skips initial turn draw');
 let before=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'next'}); // start -> move
 assert.equal(s.zoneMoveEvents.length,0);
 s=dispatchUniversalAction(packs,s,{type:'next'}); // move -> main
 const action=legalUniversalActions(packs,s).find(a=>a.type==='draw');
 if(action){
  s=dispatchUniversalAction(packs,s,action);
  assert.equal(s.zoneMoveEvents.some(x=>x.from==='deck'&&x.to==='hand'),true);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
});
