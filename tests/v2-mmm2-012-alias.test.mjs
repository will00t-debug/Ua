import test from 'node:test';
import assert from 'node:assert/strict';
import {EXEDRA_CARDS} from '../dist/madoka-exedra-cards.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp} from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(copies,2,4-caps[trigger]);
   caps[trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
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
function fresh(seed){
 return newUniversalMatch(packs,{decks:[countsFor([
  'MMM-2-012','MMM-1-062','MMM-1-037','MMM-1-006']),countsFor([
  'MMM-2-012','MMM-1-062','MMM-1-037','MMM-1-006'])],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+(s.pending.kind||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' at '+s.phase);
 }
 return s;
}
function readyAp(s){
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
function playEvent(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event '+uid);
 return dispatchUniversalAction(packs,s,action);
}

test('MMM-2-012 is treated as Homura when MMM-1-062 checks the field',()=>{
 const printed=pack.cards['MMM-2-012'];
 const official=EXEDRA_CARDS.find(c=>c.id==='MMM-2-012');
 assert.equal(printed.name,'悪魔ほむら');
 assert.deepEqual([...printed.nameAliases],['暁美 ほむら']);
 assert.equal(official.effectJa.startsWith('このカードは〈暁美 ほむら〉としても扱う。'),true);

 let named=toPhase(fresh(14012),'main');
 put(named,0,'MMM-1-037','energy',0);
 put(named,0,'MMM-1-037','energy',1);
 const devil=put(named,0,'MMM-2-012','front',0,true);
 const spell=take(named,0,'MMM-1-062');
 named.players[0].hand.push(spell);
 readyAp(named);
 const before=named.players[0].deck.length;
 named=playEvent(named,spell.uid);
 assert.equal(named.pending.kind,'effect-front-grant');
 assert.ok(named.pending.choices.includes(devil.uid));
 named=dispatchUniversalAction(packs,named,{type:'chooseFrontGrant',uid:devil.uid});
 assert.equal(named.players[0].deck.length,before-1);
 assert.equal(universalBp(packs,named,named.players[0].front[0]),6000);
 assert.equal(named.players[0].front[0].impactPlus.amount,1);
 assert.equal(named.pending,null);
 assert.equal(assertUniversalMatch(packs,named),true);

 let plain=toPhase(fresh(14013),'main');
 put(plain,0,'MMM-1-037','energy',0);
 put(plain,0,'MMM-1-037','energy',1);
 const madoka=put(plain,0,'MMM-1-006','front',0,true);
 const other=take(plain,0,'MMM-1-062');
 plain.players[0].hand.push(other);
 readyAp(plain);
 const stayed=plain.players[0].deck.length;
 const beforeBp=universalBp(packs,plain,madoka);
 plain=playEvent(plain,other.uid);
 plain=dispatchUniversalAction(packs,plain,{type:'chooseFrontGrant',uid:madoka.uid});
 assert.equal(plain.players[0].deck.length,stayed);
 assert.equal(universalBp(packs,plain,plain.players[0].front[0]),beforeBp+2000);
 assert.equal(plain.pending,null);
 assert.equal(assertUniversalMatch(packs,plain),true);
});
