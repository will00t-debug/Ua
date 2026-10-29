import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView}
 from '../dist/universal-v2/engine.mjs';

// Reuse the proven printed-card RenRuki fixture from v2-c25-purple-shared.
const pack=createBleachV2Pack(),packs=[pack,pack];
const purple=summarizeDesignatedDecks(id=>!!pack.cards[id]).find(r=>r.key==='renruki');
const counts=designatedPlayableCounts(purple);
const fresh=seed=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[0][zone],i=cards.findIndex(c=>c.cardId===id);
  if(i>=0)return cards.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function act(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,'missing legal V2 action');
 return dispatchUniversalAction(packs,s,action,{actor:s.pending?.player??s.active});
}
function setup(seed){
 let s=fresh(seed);
 for(let i=0;i<8&&s.phase!=='main';i++)s=act(s,a=>a.type==='next');
 assert.equal(s.phase,'main');
 for(let i=0;i<3;i++){
  const maker=take(s,'BLC-1-039');
  maker.ready=true;
  maker.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=maker;
 }
 for(let i=0;i<3;i++){
  s.players[0].apCards[i].inPlay=i===0;
  s.players[0].apCards[i].ready=i===0;
 }
 const high=take(s,'BLC-1-041'),low=take(s,'BLC-4-048');
 const marker=take(s,'BLC-4-049');
 assert.ok(pack.cards[high.cardId].energy>=3);
 assert.ok(pack.cards[low.cardId].energy<3);
 s.players[0].deck.unshift(high,low,marker);
 const source=take(s,'BLC-4-082');
 s.players[0].hand.push(source);
 const originalDeck=s.players[0].deck.map(c=>c.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
 const handBefore=s.players[0].hand.length;
 s=act(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending?.kind,'effect-top-inspect-many');
 assert.deepEqual(s.pending.uids,[high.uid,low.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const publicView=JSON.stringify(universalPublicView(packs,s,1));
 assert.ok(!publicView.includes(high.uid));
 assert.ok(!publicView.includes(low.uid));
 return {s,high,low,marker,originalDeck,handBefore};
}
const choose=(s,type,uid)=>act(s,a=>a.type===type&&a.uid===uid);

test('BLC-4-082 qualifying outside then top return: drawn UID equals returned top UID',()=>{
 const {s:pending,high,low,marker,handBefore}=setup(408201);
 let s=choose(pending,'chooseInspectedOutside',high.uid);
 s=choose(s,'chooseInspectedOutside',null);
 assert.equal(s.pending?.thenDraw,true);
 s=choose(s,'chooseTopOrder',low.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].hand.at(-1).uid,low.uid);
 assert.equal(s.players[0].deck[0].uid,marker.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC-4-082 only low-energy card outside: no draw',()=>{
 const {s:pending,high,low,marker,handBefore}=setup(408202);
 let s=choose(pending,'chooseInspectedOutside',low.uid);
 s=choose(s,'chooseInspectedOutside',null);
 assert.notEqual(s.pending?.thenDraw,true);
 s=choose(s,'chooseTopOrder',high.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[high.uid,marker.uid]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC-4-082 both sent outside: draw next previously uninspected card',()=>{
 const {s:pending,high,low,marker,handBefore,originalDeck}=setup(408203);
 let s=choose(pending,'chooseInspectedOutside',high.uid);
 s=choose(s,'chooseInspectedOutside',low.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].hand.at(-1).uid,marker.uid);
 assert.equal(s.players[0].deck[0].uid,originalDeck[3]);
 assert.ok(s.players[0].outside.some(c=>c.uid===high.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===low.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC-4-082 no card outside: keep arbitrary top order without drawing',()=>{
 const {s:pending,high,low,marker,handBefore}=setup(408204);
 let s=choose(pending,'chooseInspectedOutside',null);
 s=choose(s,'chooseTopOrder',low.uid);
 s=choose(s,'chooseTopOrder',high.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),
  [low.uid,high.uid,marker.uid]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
