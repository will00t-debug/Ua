import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// COMPONENT ONLY, not MST053 registered card; full official registration separate.
const cards=Array.from({length:13},(_,i)=>({
 id:'COLORFIELD-'+i,name:'Fixture '+i,color:i===5?'blue':'green',
 type:i===2||i===5?'field':'character',energy:0,ap:1,
 bp:i===2||i===5?0:2000,gen:1,implementation:[0,2].includes(i)?'dsl':'vanilla',
 ...(i===0?{colorTriggerFieldSubstitution:'green'}:{}),
 ...(i===1?{trigger:'color',triggerEffect:{op:'deployHandCharacter',
  color:'green',maxEnergy:2,ap:1}}:{}),
 ...(i===2?{effects:{onPlay:[{op:'drawDiscard',count:1}]}}:{})
}));
const pack=createUniversalPack({id:'color-field-substitution-test',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){for(const zone of ['deck','hand','life','outside']){
 const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
 if(i>=0)return z.splice(i,1)[0];
 }throw Error('Missing physical '+id);}
function duel(activePassive=true){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:8553});
 const attacker=take(s,0,'COLORFIELD-4');attacker.ready=true;s.players[0].front[0]=attacker;
 const site=take(s,1,'COLORFIELD-2');s.players[1].hand.push(site);
 const character=take(s,1,'COLORFIELD-3');s.players[1].hand.push(character);
 const blue=take(s,1,'COLORFIELD-5');s.players[1].hand.push(blue);
 const color=take(s,1,'COLORFIELD-1');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(color);
 if(activePassive){const source=take(s,1,'COLORFIELD-0');s.players[1].energy[0]=source;}
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 return {s,site,character,blue};
}
test('opponent turn COLOR: green FIELD can be played ACTIVE on ENERGY from OWN hand and onPlay draws/discards',()=>{
 let {s,site,character,blue}=duel();
 const list=legalUniversalActions(packs,s);
 assert.ok(list.some(a=>a.mode==='colorField'&&a.uid===site.uid&&a.line==='energy'));
 assert.ok(list.some(a=>a.mode==='color'&&a.uid===character.uid));
 assert.equal(list.some(a=>a.mode==='colorField'&&a.uid===blue.uid),false);
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'colorField');
 const place=list.find(a=>a.mode==='colorField'&&a.uid===site.uid);
 const deckCount=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,place);
 assert.equal(s.players[1].energy[place.slot].uid,site.uid);
 assert.equal(s.players[1].energy[place.slot].ready,true);
 assert.equal(s.players[1].deck.length,deckCount-1);
 assert.equal(s.pending?.kind,'effect-discard');
 const discard=legalUniversalActions(packs,s).find(a=>a.uid===character.uid);
 assert.ok(discard);
 s=dispatchUniversalAction(packs,s,discard);
 assert.ok(s.players[1].outside.some(c=>c.uid===character.uid));
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('without on-field substitution: original character COLOR available and forged field choice is illegal',()=>{
 let {s,site,character}=duel(false);
 const list=legalUniversalActions(packs,s);
 assert.ok(list.some(a=>a.mode==='color'&&a.uid===character.uid));
 assert.equal(list.some(a=>a.mode==='colorField'),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'colorField',uid:site.uid,line:'energy',slot:0}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict live COLOR substitution rejects source mismatched type/color',()=>{
 for(const x of [{type:'field',color:'green'},{type:'character',color:'blue'}]){
  assert.throws(()=>createUniversalPack({id:'invalid-color',cards:[{...cards[0],...x}]}),
   /invalid live COLOR field-substitution/);
 }
});
