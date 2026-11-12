import test from 'node:test';
import assert from 'node:assert/strict';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalImpact,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

// UA11BT/GNT-1-054 is only the Q1551 fixture. Gintama is not a playable series.
const katsura={
 id:'GNT-1-054',name:'桂 小太郎',color:'purple',type:'character',energy:3,ap:1,
 bp:4000,gen:1,traits:['松下村塾'],trigger:'get',implementation:'dsl',
 effects:{onRetire:[{op:'ownLifeToOutside'}]}
};
const fillers=Array.from({length:12},(_,i)=>({
 id:'GNT-F-'+String(i).padStart(3,'0'),name:'銀魂填充 '+i,color:'purple',
 type:'character',energy:1,ap:1,bp:i===3?5000:1000,gen:1,
 trigger:i<2?'get':null,implementation:'vanilla'
}));
const aot=createAotV2Pack();
const gnt=createUniversalPack({id:'gnt-q1551',cards:[katsura,...fillers]});
const packs=[aot,gnt];

function aotDeck(){
 const required=['AOT-2-008','AOT-2-001'];
 const pool=Object.values(aot.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const counts={};
 const caps={special:0,color:0,final:0};
 for(const id of required){
  const trigger=aot.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(2,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of pool){
  if(total>=50)break;
  const trigger=aot.cards[id].trigger;
  let add=Math.min(4,50-total);
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=add;total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(aot,counts),[]);
 return counts;
}
const gntDeck=Object.fromEntries([katsura,...fillers].map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(gnt,gntDeck),[]);

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
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
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function acts(s){return legalUniversalActions(packs,s);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}

test('Q1551: impact is not gained when the blocker\'s retirement drops life to 1',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[aotDeck(),gntDeck],seed:1551,first:0}),'attack');
 put(s,0,'AOT-2-001','energy',0,true);
 const mikasa=put(s,0,'AOT-2-008','front',0,true);
 const wall=put(s,1,'GNT-1-054','front',0,true);
 const tall=put(s,1,'GNT-F-003','front',1,true);
 const first=take(s,1,'GNT-F-000');
 const second=take(s,1,'GNT-F-001');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.push(first,second);
 assert.equal(universalBp(packs,s,mikasa),4000);
 assert.equal(universalBp(packs,s,wall),4000);
 assert.equal(universalBp(packs,s,tall),5000);
 assert.equal(universalImpact(packs,s,mikasa),0);
 const reveals=s.publicReveals.length;
 s=use(s,{type:'attack',uid:mikasa.uid});
 const blockers=acts(s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blockers.includes(wall.uid),true);
 assert.equal(blockers.includes(tall.uid),false);
 s=use(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.pending?.kind,'effect-own-life-outside');
 assert.equal(V2_PENDING_LABELS[s.pending.kind],'將 1 張自己的生命放到場外');
 assert.deepEqual(acts(s).map(a=>uiActionLabel(a,{pack:packs,state:s})).sort(),
  ['將 銀魂填充 0 放到場外','將 銀魂填充 1 放到場外']);
 assert.equal(s.pending.player,1);
 assert.equal(s.players[1].life.length,2);
 assert.equal(s.status,'playing');
 const seen=universalPrivateChoices(packs,s,1);
 assert.deepEqual(seen.options.map(o=>o.card.cardId).sort(),['GNT-F-000','GNT-F-001']);
 assert.equal(universalPrivateChoices(packs,s,0),null);
 assert.equal(JSON.stringify(universalPublicView(packs,s,0)).includes(first.uid),false);
 assert.equal(JSON.stringify(universalPublicView(packs,s,0)).includes(second.uid),false);
 s=use(s,{type:'chooseOwnLifeOutside',uid:first.uid});
 assert.equal(s.players[1].life.map(c=>c.uid).join(','),second.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===first.uid),true);
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.status,'playing');
 assert.equal(s.pending?.kind==='life-trigger',false);
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(s.players[0].front.some(c=>c?.uid===mikasa.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('own life outside is only GNT-1-054\'s lone on-retire',()=>{
 assert.throws(()=>createUniversalPack({id:'bad-gnt',cards:[{
  ...katsura,id:'GNT-1-055',effects:{onRetire:[{op:'ownLifeToOutside'}]}
 }]}),/own life outside is only GNT-1-054/);
 assert.throws(()=>createUniversalPack({id:'bad-gnt',cards:[{
  ...katsura,effects:{onPlay:[{op:'ownLifeToOutside'}]}
 }]}),/own life outside is only GNT-1-054/);
 assert.throws(()=>createUniversalPack({id:'bad-gnt',cards:[{
  ...katsura,effects:{onRetire:[{op:'ownLifeToOutside',count:1}]}
 }]}),/invalid own life to outside/);
});
