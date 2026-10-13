import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloMatchBp,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
const purple=id=>({...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,[id]:4});
const green=id=>({...SOLO_TRAINING_PRESET,'SLG-1-062':0,[id]:4});
const state=deck=>{const s=newSoloTrainingMatch({decks:[deck,deck],seed:22,first:0});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;};
function remove(p,id){for(const z of ['hand','deck','life']){let i=p[z].findIndex(x=>x.cardId===id);if(i>=0)return p[z].splice(i,1)[0];}throw Error(id);}
function put(s,id,line,slot){const p=s.players[0],c=remove(p,id);Object.assign(c,{owner:0,line,slot,ready:true});p[line][slot]=c;return c;}
function deploy(s,id){const p=s.players[0],c=remove(p,id);p.hand.push(c);const a=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front');assert.ok(a,id);return soloTrainingDispatch(s,a);}
test('SLG-002 legal mandatory draw/discard versus choose another own BP buff',()=>{
 const deck=purple('SLG-1-002');
 let s=state(deck);put(s,'SLG-1-030','energy',0);
 const before=s.players[0].hand.length;s=deploy(s,'SLG-1-002');
 assert.deepEqual(soloTrainingLegalActions(s).map(x=>x.mode),['drawDiscard','buff']);
 s=soloTrainingDispatch(s,{type:'choose',mode:'drawDiscard'});
 assert.equal(s.pending.kind,'entry002Discard');const next=s.players[0].hand[0].uid;
 s=soloTrainingDispatch(s,{type:'choose',uid:next});
 assert.equal(s.players[0].hand.length,before);assert.equal(s.players[0].discardByOwnEffectTurn,s.turn);
 assertSoloTrainingMatch(s);
 s=state(deck);put(s,'SLG-1-030','energy',0);const target=put(s,'SLG-1-030','front',0);
 s=deploy(s,'SLG-1-002');s=soloTrainingDispatch(s,{type:'choose',mode:'buff'});
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===target.uid));
 s=soloTrainingDispatch(s,{type:'choose',uid:target.uid});
 assert.equal(soloMatchBp(s,s.players[0].front[0]),2500);assertSoloTrainingMatch(s);
});
test('SLG-004 enter must draw then discard and BP+500 only on own effect discarding turn',()=>{
 let s=state(purple('SLG-1-004'));
 for(let i=0;i<3;i++)put(s,'SLG-1-030','energy',i);
 s=deploy(s,'SLG-1-004');assert.equal(s.pending.kind,'entry004Discard');
 let c=s.players[0].front.find(x=>x?.cardId==='SLG-1-004');
 assert.equal(soloMatchBp(s,c),3500);
 s=soloTrainingDispatch(s,soloTrainingLegalActions(s)[0]);
 c=s.players[0].front.find(x=>x?.cardId==='SLG-1-004');
 assert.equal(soloMatchBp(s,c),4000);
 s.turn++;assert.equal(soloMatchBp(s,c),3500);assertSoloTrainingMatch(s);
});
test('SLG-017 top deck look is explicit: return top or send top to outside; UID conservation',()=>{
 let s=state(purple('SLG-1-017'));for(let i=0;i<2;i++)put(s,'SLG-1-030','energy',i);
 s=deploy(s,'SLG-1-017');assert.equal(s.pending.kind,'peekTop');
 const old=s.players[0].deck[0].uid;const legal=soloTrainingLegalActions(s);
 assert.ok(legal.some(a=>a.outsideUid===old));
 assert.ok(legal.some(a=>a.outsideUid===null));
 const send=legal.find(a=>a.outsideUid===old);s=soloTrainingDispatch(s,send);
 assert.equal(s.players[0].outside.at(-1).uid,old);assertSoloTrainingMatch(s);
});
test('SLG-054 inspect two top cards, only island trait eligible; preserve explicit remaining order',()=>{
 let s=state(green('SLG-1-054'));let p=s.players[0];
 const top=p.deck.splice(0,2);const other=remove(p,'SLG-1-045'),island=remove(p,'SLG-1-055');
 p.deck.unshift(island,other);p.deck.push(...top);
 s=deploy(s,'SLG-1-054');assert.equal(s.pending.kind,'peekTop');
 const legal=soloTrainingLegalActions(s);
 assert.ok(legal.some(a=>a.outsideUid===island.uid));
 assert.ok(!legal.some(a=>a.outsideUid===other.uid));
 s=soloTrainingDispatch(s,legal.find(a=>a.outsideUid===island.uid));
 assert.ok(s.players[0].outside.some(x=>x.uid===island.uid));
 assert.equal(s.players[0].deck[0].uid,other.uid);assertSoloTrainingMatch(s);
});
