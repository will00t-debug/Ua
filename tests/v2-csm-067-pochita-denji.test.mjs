import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];

function match(seed){
 const required=['CSM-1-067','CSM-1-050','CSM-1-051','CSM-1-049',
  'CSM-1-006','CSM-1-008'];
 const ids=[...required];
 for(const d of Object.values(pack.cards).sort((a,b)=>a.id.localeCompare(b.id))){
  if(ids.length>=13)break;
  if(!ids.includes(d.id)&&!['special','color','final'].includes(d.trigger))ids.push(d.id);
 }
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 while(s.phase!=='main')s=dispatchUniversalAction(packs,s,{type:'next'});
 return s;
}
function take(s,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[0][zone],i=pile.findIndex(c=>c.cardId===id);
  if(i>=0)return pile.splice(i,1)[0];
 }
 throw Error('Missing card '+id);
}
function put(s,id,line,slot){
 const c=take(s,id);
 c.ready=true;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=c;
 return c;
}
function act(s,pred){
 const a=legalUniversalActions(packs,s).find(pred);
 assert.ok(a,'expected legal action: '+JSON.stringify(s.pending));
 return dispatchUniversalAction(packs,s,a);
}

test('UA53BT/CSM-1-067 selects legal red Denji, chooses cell, tucks itself and resolves on-play',()=>{
 let s=match(6701);
 const occupied=put(s,'CSM-1-008','energy',0);
 const pochita=put(s,'CSM-1-067','energy',2);
 const denji=take(s,'CSM-1-050'); // red, printed energy 1; on-play draw + discard
 const tooLarge=take(s,'CSM-1-051'); // red, printed energy 3
 const purple=take(s,'CSM-1-006'); // purple Denji
 s.players[0].outside.push(denji,tooLarge,purple);
 const deckSize=s.players[0].deck.length;
 const apReady=s.players[0].apCards.filter(c=>c.ready).length;

 s=act(s,a=>a.type==='activate'&&a.uid===pochita.uid);
 assert.equal(s.pending?.kind,'csm');
 assert.equal(s.pending?.step,'denjiEnergy');
 assert.ok(s.pending.actions.some(a=>a.uid===denji.uid));
 assert.equal(s.pending.actions.some(a=>a.uid===tooLarge.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===purple.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===pochita.uid));

 s=act(s,a=>a.type==='csm'&&a.mode==='deploy'&&a.uid===denji.uid);
 assert.equal(s.pending?.step,'deploy');
 assert.ok(s.pending.actions.some(a=>a.uid===denji.uid&&a.line==='energy'&&a.slot===1));
 assert.equal(s.pending.actions.some(a=>a.line==='front'),false);
 s=act(s,a=>a.type==='csm'&&a.mode==='deploy'&&a.uid===denji.uid&&a.slot===1);
 assert.equal(s.players[0].energy[0]?.uid,occupied.uid);
 const entered=s.players[0].energy[1];
 assert.equal(entered?.uid,denji.uid);
 assert.equal(entered.ready,true);
 assert.equal(entered.under?.some(c=>c.uid===pochita.uid&&c.faceDown===true),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===pochita.uid),false);
 assert.equal(s.players[0].deck.length,deckSize-1,'Denji on-play must draw a card');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,apReady,'effect entry costs no AP');
 assertUniversalMatch(packs,s);
});

test('UA53BT/CSM-1-067 allows declining the optional Denji entry',()=>{
 let s=match(6702);
 const pochita=put(s,'CSM-1-067','energy',0);
 const denji=take(s,'CSM-1-049');
 s.players[0].outside.push(denji);
 s=act(s,a=>a.type==='activate'&&a.uid===pochita.uid);
 assert.equal(s.pending?.step,'denjiEnergy');
 s=act(s,a=>a.type==='csm'&&a.mode==='skip');
 assert.equal(s.players[0].energy.some(c=>c?.uid===denji.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===denji.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===pochita.uid),true);
 assertUniversalMatch(packs,s);
});
