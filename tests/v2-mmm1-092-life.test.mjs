import test from 'node:test';
import assert from 'node:assert/strict';
import {MADOKA_CARDS} from '../dist/madoka-cards.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp} from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(seed){
 return newUniversalMatch(packs,{decks:[countsFor(['MMM-1-085','MMM-1-080','MMM-1-092']),
  countsFor(['MMM-1-085','MMM-1-080','MMM-1-092'])],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot){
 const card=take(s,p,id);
 card.ready=true;
 s.players[p][line][slot]=card;
 return card;
}
function toMain(seed){
 let s=fresh(seed),guard=0;
 while(s.phase!=='main'){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach main');
 }
 return s;
}
function readyAp(s){
 for(let i=0;i<s.players[0].apCards.length;i++){
  s.players[0].apCards[i].inPlay=i<3;
  s.players[0].apCards[i].ready=i<3;
 }
}
function playEvent(s){
 put(s,0,'MMM-1-085','energy',0);
 const event=take(s,0,'MMM-1-092');
 s.players[0].hand.push(event);
 readyAp(s);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 if(!action)throw Error('092 cannot be played');
 return [dispatchUniversalAction(packs,s,action),event];
}

test('MMM-1-092 must take one life card and draws two only after that',()=>{
 const printed=MADOKA_CARDS.find(c=>c.id==='MMM-1-092');
 assert.equal(printed.effectJa,'自分のライフエリアにあるカードを1枚手札に加える。そうした場合、カードを2枚引く。');
 assert.equal(printed.effectJa.includes('てもよい'),false);
 assert.deepEqual(pack.cards['MMM-1-092'].effects.onPlay,[{
  op:'optionalOwnLifeToHandThenDraw',optional:false,then:[{op:'draw',count:2}]
 }]);

 let s=toMain(31092);
 const kyoko=put(s,0,'MMM-1-080','front',0);
 assert.equal(universalBp(packs,s,kyoko),3000);
 const kept=s.players[0].life[1];
 const chosen=s.players[0].life[0];
 const deck=s.players[0].deck.length;
 [s]=playEvent(s);
 assert.equal(s.pending.kind,'effect-life-to-hand');
 assert.equal(s.pending.optional,false);
 const choices=legalUniversalActions(packs,s);
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.equal(choices.filter(a=>a.type==='chooseLifeToHand').length,s.players[0].life.length);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseLifeToHand',uid:null}),
  /not currently legal/);
 assert.equal(s.players[0].deck.length,deck);
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeToHand',uid:chosen.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===chosen.uid),true);
 assert.equal(s.players[0].life.some(c=>c.uid===chosen.uid),false);
 assert.equal(s.players[0].life.some(c=>c.uid===kept.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(universalBp(packs,s,kyoko),4000);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-092 draws nothing when no life card can be added',()=>{
 let s=toMain(31093);
 while(s.players[0].life.length)s.players[0].deck.push(s.players[0].life.pop());
 put(s,0,'MMM-1-085','energy',0);
 const event=take(s,0,'MMM-1-092');
 s.players[0].hand.push(event);
 readyAp(s);
 const deck=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].life.length,0);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].hand.some(c=>c.uid===event.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
