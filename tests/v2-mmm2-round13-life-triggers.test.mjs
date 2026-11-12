import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp} from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];
const IDS=['MMM-2-056','MMM-2-057','MMM-2-058','MMM-2-067','MMM-2-071','MMM-2-042'];

function countsFor(){
 const fillers=Object.values(pack.cards).filter(c=>!IDS.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of IDS){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(copies,2,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=(counts[id]||0)+add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const deck=countsFor();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function open(seed){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 let guard=0;
 while(s.phase!=='attack'){
  if(s.pending)throw Error('Pending blocked attack '+s.pending.kind);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>12)throw Error('attack '+s.phase);
 }
 return s;
}
function hit(seed,id){
 let s=open(seed);
 const rested=put(s,1,'MMM-2-042','front',0,false);
 const attacker=put(s,0,'MMM-2-042','front',0,true);
 const trigger=take(s,1,id);
 const filler=take(s,1,'MMM-2-042');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life=[trigger,filler];
 const before=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===null));
 return {s,rested,before};
}

test('MMM-2-056 life trigger draws one',()=>{
 const {s,before}=hit(14056,'MMM-2-056');
 assert.equal(s.pending.trigger,'draw');
 const drawn=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(drawn.players[1].deck.length,before-1);
 assert.equal(drawn.pending,null);
 assert.equal(assertUniversalMatch(packs,drawn),true);
});

test('MMM-2-057 life trigger draws one',()=>{
 const {s,before}=hit(14057,'MMM-2-057');
 assert.equal(s.pending.trigger,'draw');
 const drawn=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(drawn.players[1].deck.length,before-1);
 assert.equal(drawn.pending,null);
 assert.equal(assertUniversalMatch(packs,drawn),true);
});

test('MMM-2-058 life trigger draws one',()=>{
 const {s,before}=hit(14058,'MMM-2-058');
 assert.equal(s.pending.trigger,'draw');
 const drawn=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(drawn.players[1].deck.length,before-1);
 assert.equal(drawn.pending,null);
 assert.equal(assertUniversalMatch(packs,drawn),true);
});

test('MMM-2-067 life trigger readies one character for 3000 BP',()=>{
 const {s,rested}=hit(14067,'MMM-2-067');
 assert.equal(s.pending.trigger,'active');
 const done=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(done.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,done,done.players[1].front[0]),4500);
 assert.equal(done.pending,null);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('MMM-2-071 life trigger readies one character for 3000 BP',()=>{
 const {s,rested}=hit(14071,'MMM-2-071');
 assert.equal(s.pending.trigger,'active');
 const done=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(done.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,done,done.players[1].front[0]),4500);
 assert.equal(done.pending,null);
 assert.equal(assertUniversalMatch(packs,done),true);
});
