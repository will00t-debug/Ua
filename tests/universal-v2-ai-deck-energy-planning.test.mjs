import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergy,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'P'+String(i).padStart(2,'0'),name:'Planning '+i,
 type:'character',color:'red',
 energy:i===12?5:i===3?2:i<3||i===4?0:1,
 ap:1,bp:i===0?4000:i===3?3000:i===12?4500:1000,
 gen:i===1?2:1,implementation:i===0?'dsl':'vanilla',
 ...(i===0?{activeExtraEnergy:1}:{}),
 traits:[]
}));
const pack=createUniversalPack({id:'ai-registered-deck-planning-fixture',version:'1',cards});
const packs=[pack,pack];
const counts=Object.fromEntries(cards.slice(0,12).map(c=>[c.id,4]));
counts.P12=2;
function pull(state,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=state.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Fixture lacks card '+id);
}
function match(seed=120){return newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});}

test('hard AI plans around registered 50-card max expense, not just low-cost current hand',()=>{
 let s=match();
 // Deliberately keep expensive cards OUT of hand: the AI must know its
 // registered deck can still draw a 5-energy character.
 const p=s.players[0];
 while(p.hand.some(x=>pack.cards[x.cardId].energy>2)){
  const i=p.hand.findIndex(x=>pack.cards[x.cardId].energy>2);
  p.outside.push(p.hand.splice(i,1)[0]);
 }
 const producers=['P02','P02','P04'].map(id=>pull(s,0,id));
 p.energy.splice(0,4,...producers,null);
 const frontCard=pull(s,0,'P03'),energyCard=pull(s,0,'P01');
 p.hand.push(frontCard,energyCard);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(universalEnergy(packs,s,0),3);
 assert.ok(s.players[0].hand.every(c=>pack.cards[c.cardId].energy<=2));
 const actions=legalUniversalActions(packs,s);
 assert.ok(actions.some(x=>x.type==='play'&&x.line==='front'));
 assert.ok(actions.some(x=>x.type==='play'&&x.line==='energy'));
 const hard=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 const normal=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
 assert.equal(hard.type,'play');
 assert.equal(hard.line,'energy','hard should preserve future 5-energy access');
 assert.equal(normal.type,'play');
 assert.equal(normal.line,'front','normal may favor immediate board strength');
 const after=dispatchUniversalAction(packs,s,hard,{actor:0});
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('hard AI never moves an ACTIVE bonus-energy producer forward if total loss drops below max-cost target',()=>{
 let s=match(910),p=s.players[0];
 const active=pull(s,0,'P00');
 active.ready=true;
 const other=[pull(s,0,'P01'),pull(s,0,'P02'),pull(s,0,'P04')];
 p.energy.splice(0,4,active,...other);
 assert.equal(universalEnergy(packs,s,0),6,
  'P00 supplies 1 printed + 1 ACTIVE bonus, and P01 supplies 2');
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'move');
 const candidate=legalUniversalActions(packs,s).find(x=>
  x.type==='move'&&x.uid===active.uid);
 assert.ok(candidate,'the high-BP active producer can legally move before strategy checks');
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.type,'next',
  'moving an ACTIVE 2-energy producer reduces 6 to 4, below required 5');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('energy policy does not contaminate normal/easy and never picks an illegal action',()=>{
 let s=match(371);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const selected=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(selected)),difficulty);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
});
