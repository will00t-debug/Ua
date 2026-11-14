// Round 15. These lists are unofficial test decks. They are not UA10ST_PRODUCT
// and they are not an official 50-card recipe. The integrated pack on this
// branch has the ready cards createMhaV2Pack actually publishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack,MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {UA10ST_PRODUCT,UA10ST_CARDS} from '../dist/mha/ua10st-cards.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {fieldEffectCopy} from '../dist/universal-v2/preview-actions.mjs';
import {deckCardImage} from '../dist/deck-gallery.mjs';
import {normalizeEditorCounts,editorV2Status,LEGACY_DECK_KEYS} from '../dist/v2-editor-compat.mjs';
import {collectSavedV2LobbyDecks} from '../dist/universal-v2/lobby-saved-decks.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const UNOFFICIAL='非官方測試牌組';
const LIMITED=new Set(['special','final','color']);
const NEEDED={
 green:['MHA-1-036','MHA-1-044','MHA-1-049','MHA-1-051','MHA-1-057',
  'MHA-1-102','MHA-1-103','MHA-1-106','MHA-1-107'],
 purple:['MHA-1-001','MHA-1-013','MHA-1-014','MHA-1-021'],
 red:['MHA-1-067','MHA-1-073','MHA-1-080']
};
const mha=createMhaV2Pack();
const imc=createImcV2Pack();
const bleach=createBleachV2Pack();
const editor=mhaEditorCards();
const editorById=Object.fromEntries(editor.map(card=>[card.id,card]));
const starterById=Object.fromEntries(UA10ST_CARDS.map(card=>[card.id,card]));

function colorCards(color){
 return Object.values(mha.cards)
  .filter(card=>card.color===color&&['character','event','field'].includes(card.type))
  .sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id));
}
function unofficialDeck(color){
 const pool=colorCards(color);
 const counts={};
 const used={special:0,final:0,color:0};
 let total=0;
 const room=card=>{
  const have=counts[card.id]||0;
  let n=4-have;
  if(LIMITED.has(card.trigger))n=Math.min(n,4-used[card.trigger]);
  return Math.max(0,n);
 };
 const take=(card,want)=>{
  const add=Math.min(want,room(card),50-total);
  if(add<=0)return 0;
  counts[card.id]=(counts[card.id]||0)+add;
  total+=add;
  if(LIMITED.has(card.trigger))used[card.trigger]+=add;
  return add;
 };
 for(const id of NEEDED[color]||[])take(mha.cards[id],2);
 const raids=pool.filter(card=>card.raidName);
 for(const card of raids)take(card,2);
 for(const card of pool){
  if(card.type!=='character'||!raids.some(raid=>raid.raidName===card.name&&raid.id!==card.id))continue;
  take(card,2);
 }
 for(const card of pool)if(card.type==='character'&&card.energy>=4)take(card,2);
 let mids=0;
 for(const card of pool){
  if(mids>=12||card.energy<1||card.energy>2)continue;
  mids+=take(card,3);
 }
 let zeros=0;
 for(const card of pool){
  if(zeros>=12||card.energy!==0||card.type!=='character')continue;
  zeros+=take(card,2);
 }
 for(const card of pool){
  if(total>=46||card.energy!==3)continue;
  take(card,2);
 }
 for(const card of pool){
  if(total>=50)break;
  take(card,4);
 }
 if(total!==50)throw Error(color+' unofficial deck stopped at '+total);
 return counts;
}
function curve(counts){
 const bins={0:0,1:0,2:0,3:0,4:0};
 for(const [id,n] of Object.entries(counts)){
  const energy=mha.cards[id].energy;
  bins[energy>=4?4:energy]+=n;
 }
 return bins;
}
function triggerTotal(counts,trigger){
 return Object.entries(counts).reduce((sum,[id,n])=>
  sum+(mha.cards[id].trigger===trigger?n:0),0);
}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legalUniversalActions(pack,s).find(action);
  assert.ok(found,'missing legal action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pull(s,player,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const cards=s.players[player][zone];
  const index=cards.findIndex(card=>card.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,player,id){
 const hand=s.players[player].hand;
 const card=hand.find(item=>item.cardId===id)||pull(s,player,id);
 if(!hand.includes(card))hand.push(card);
 return card;
}
function seat(s,player,id,line,slot,ready=true){
 const card=pull(s,player,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[player][line][slot]=card;
 return card;
}
function setAp(s,player,count){
 s.players[player].apCards.forEach((card,index)=>{
  card.inPlay=index<count;
  card.ready=index<count;
 });
}
function reach(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=act(pack,s,{type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase+' at '+s.active+' '+s.phase);
 }
 return s;
}
function fillDeck(pack,pinned={}){
 const counts={...pinned};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const used={special:0,final:0,color:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(LIMITED.has(trigger))used[trigger]+=n;
 }
 for(const card of Object.values(pack.cards)){
  if(total>=50)break;
  if(!['character','event','field'].includes(card.type))continue;
  let n=Math.min(4-(counts[card.id]||0),50-total);
  if(LIMITED.has(card.trigger))n=Math.min(n,4-(used[card.trigger]||0));
  if(n<=0)continue;
  counts[card.id]=(counts[card.id]||0)+n;
  total+=n;
  if(LIMITED.has(card.trigger))used[card.trigger]+=n;
 }
 if(total!==50)throw Error(pack.id+' filler stopped at '+total);
 return counts;
}
function openDecks(left,right,leftCounts,rightCounts,seed,extra={}){
 assert.deepEqual(validateUniversalDeck(left,leftCounts),[]);
 assert.deepEqual(validateUniversalDeck(right,rightCounts),[]);
 const packs=left===right?left:[left,right];
 let s=newUniversalMatch(packs,{
  decks:[leftCounts,rightCounts],seed,first:0,openingMulligan:false,...extra
 });
 if(left!==right)assert.equal(s.title,'cross-title');
 s=reach(packs,s,0,'main');
 return {packs,s};
}
function same(action,other){
 return JSON.stringify(action)===JSON.stringify(other);
}
function walkAi(packs,s){
 for(const difficulty of ['easy','normal']){
  let cursor=s;
  for(let step=0;step<20;step++){
   const legal=legalUniversalActions(packs,cursor);
   const chosen=chooseUniversalAiAction(packs,cursor,{difficulty});
   if(!legal.length){
    assert.equal(chosen,null);
    break;
   }
   assert.ok(legal.some(action=>same(action,chosen)),difficulty+' step '+step);
   const safe=chooseProgressSafeAiAction(packs,cursor,{difficulty,actionsInPhase:0});
   assert.equal(safe.reason,null);
   cursor=act(packs,cursor,chosen);
  }
 }
}

const green=unofficialDeck('green');
const purple=unofficialDeck('purple');
const red=unofficialDeck('red');
const decks={
 [UNOFFICIAL+'・綠']:green,
 [UNOFFICIAL+'・紫']:purple,
 [UNOFFICIAL+'・紅']:red
};

test('the integrated ready pool is 64 cards and MHA stays unplayable',()=>{
 assert.equal(Object.keys(mha.cards).length,64);
 assert.equal(editor.length,109);
 assert.equal(getTitle('mha').playable,false);
 assert.equal(editor.every(card=>card.playable===false&&card.battleReady===false),true);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.equal(mha.restrictColors,false);
});

test('green, purple and red unofficial decks are legal 50-card lists',()=>{
 for(const [name,counts] of Object.entries(decks)){
  assert.match(name,/非官方測試牌組/);
  assert.doesNotMatch(name,/官方預組|公式デッキ/);
  assert.equal(Object.values(counts).reduce((sum,n)=>sum+n,0),50);
  assert.deepEqual(validateUniversalDeck(mha,counts),[]);
  const colors=new Set(Object.keys(counts).map(id=>mha.cards[id].color));
  assert.equal(colors.size,1);
  for(const [id,n] of Object.entries(counts)){
   assert.equal(Number.isInteger(n)&&n>=1&&n<=4,true,id);
  }
  assert.ok(triggerTotal(counts,'special')<=4);
  assert.ok(triggerTotal(counts,'final')<=4);
  assert.ok(triggerTotal(counts,'color')<=4);
  const bins=curve(counts);
  assert.ok(bins[0]>=8,name+' zero '+bins[0]);
  assert.ok(bins[1]+bins[2]>=8,name+' mid '+JSON.stringify(bins));
  assert.ok(bins[3]>=2,name+' three');
 }
 const greenBins=curve(green);
 assert.ok(greenBins[4]>=2);
 assert.ok(green['MHA-1-107']>=2);
 assert.ok(green['MHA-1-106']>=2||green['MHA-1-057']>=2);
 assert.ok(green['MHA-1-051']>=2&&green['MHA-1-049']>=2);
 assert.equal(mha.cards['MHA-1-107'].raidName,mha.cards['MHA-1-106'].name);
 const purpleBins=curve(purple);
 assert.ok(purpleBins[4]>=2);
 assert.ok(purple['MHA-1-014']>=2&&purple['MHA-1-013']>=2);
 assert.equal(mha.cards['MHA-1-014'].raidName,mha.cards['MHA-1-013'].name);
 const redCards=colorCards('red');
 assert.equal(redCards.some(card=>card.raidName),false);
 assert.equal(redCards.some(card=>card.type==='character'&&card.energy>=4),false);
 assert.ok(red['MHA-1-080']>=2);
 assert.equal(mha.cards['MHA-1-080'].energy,3);
 assert.equal(curve(red)[4],0);
});

test('green raids its own Midoriya, blocks, and sends the loser outside against purple',()=>{
 const opened=openDecks(mha,mha,green,purple,1501);
 let s=opened.s;
 const gens=['MHA-1-036','MHA-1-049','MHA-1-044','MHA-1-036'];
 for(let slot=0;slot<4;slot++)seat(s,0,gens[slot],'energy',slot,true);
 const base=seat(s,0,'MHA-1-106','front',0,false);
 const other=seat(s,0,'MHA-1-105','front',1,false);
 const foe=seat(s,1,'MHA-1-001','front',0,true);
 const raider=hold(s,0,'MHA-1-107');
 setAp(s,0,1);
 const raids=legalUniversalActions(opened.packs,s).filter(action=>
  action.type==='raid'&&action.uid===raider.uid);
 assert.ok(raids.length>0);
 assert.ok(raids.every(action=>action.baseUid===base.uid));
 assert.equal(raids.some(action=>action.baseUid===other.uid||action.baseUid===foe.uid),false);
 s=act(opened.packs,s,raids[0]);
 const top=s.players[0].front.find(card=>card?.cardId==='MHA-1-107');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-106');
 s=reach(opened.packs,s,0,'attack');
 const attacker=seat(s,0,'MHA-1-103','front',2,true);
 const wall=seat(s,1,'MHA-1-021','front',1,true);
 const life=s.players[1].life.length;
 s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'block');
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===wall.uid);
 assert.equal(s.players[0].front.find(card=>card?.uid===attacker.uid).ready,false);
 assert.equal(s.players[1].front.find(card=>card?.uid===wall.uid).ready,false);
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.players[1].outside.some(card=>card.uid===wall.uid),false);
 s=reach(opened.packs,s,1,'attack');
 const low=s.players[0].front.find(card=>card?.cardId==='MHA-1-103');
 const hitter=seat(s,1,'MHA-1-014','front',2,true);
 s=act(opened.packs,s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='effect-target'||s.pending?.kind==='effect-retire-bp')
  s=act(opened.packs,s,action=>action.uid===null);
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===low.uid);
 assert.ok(s.players[0].outside.some(card=>card.uid===low.uid));
 assert.equal(s.players[0].removed.some(card=>card.uid===low.uid),false);
 assert.equal(s.players[1].front.some(card=>card?.uid===foe.uid),true);
});

test('MHA-1-044 activates against IMC and a direct attack can choose a life card',()=>{
 const opened=openDecks(mha,imc,green,fillDeck(imc,{
  'IMC-1-001':4,'IMC-1-007':4
 }),1502,{attackerChoosesLife:true});
 let s=opened.s;
 const self=seat(s,0,'MHA-1-044','energy',0,true);
 setAp(s,0,1);
 s=act(opened.packs,s,action=>action.type==='activate'&&action.uid===self.uid);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>
  action.type==='activate'&&action.uid===self.uid),false);
 s=act(opened.packs,s,{type:'next'});
 assert.ok(s.players[0].outside.some(card=>card.uid===self.uid));
 s=reach(opened.packs,s,0,'attack');
 const attacker=seat(s,0,'MHA-1-103','front',0,true);
 const first=pull(s,1,'IMC-1-001');
 const second=pull(s,1,'IMC-1-007');
 s.players[1].deck.push(s.players[1].life[0],s.players[1].life[1]);
 s.players[1].life[0]=first;
 s.players[1].life[1]=second;
 s.players[1].front=[null,null,null,null];
 s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='block')
  s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
 assert.equal(s.pending.kind,'attack-life-target');
 assert.equal(s.pending.player,0);
 const choice=legalUniversalActions(opened.packs,s).find(action=>
  action.type==='chooseAttackLife'&&action.indices?.[0]===1);
 assert.ok(choice);
 s=act(opened.packs,s,choice);
 const revealed=[...s.players[1].lifeRevealed,...s.players[1].hand,...s.players[1].outside];
 assert.ok(revealed.some(card=>card.uid===second.uid));
 assert.ok(s.players[1].life.some(card=>card.uid===first.uid));
});

test('a BLEACH battle-remove character sends the losing MHA character to removed',()=>{
 const opened=openDecks(mha,bleach,red,fillDeck(bleach,{'BLC-1-092':2,'BLC-1-002':4}),1503);
 let s=reach(opened.packs,opened.s,1,'attack');
 const winner=seat(s,1,'BLC-1-092','front',0,true);
 const loser=seat(s,0,'MHA-1-067','front',0,true);
 assert.equal(bleach.cards['BLC-1-092'].battleRemoveInstead,true);
 s=act(opened.packs,s,{type:'attack',uid:winner.uid});
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===loser.uid);
 assert.ok(s.players[0].removed.some(card=>card.uid===loser.uid));
 assert.equal(s.players[0].outside.some(card=>card.uid===loser.uid),false);
 assert.equal(s.players[1].front[0].uid,winner.uid);
});

test('AI actions stay legal for MHA against MHA, IMC and BLEACH',()=>{
 walkAi(...Object.values(openDecks(mha,mha,green,purple,1511)));
 walkAi(...Object.values(openDecks(mha,imc,purple,fillDeck(imc,{'IMC-1-001':4}),1512)));
 walkAi(...Object.values(openDecks(mha,bleach,red,fillDeck(bleach,{'BLC-1-002':4}),1513)));
});

test('UA10ST and UA10BT reprint numbers import, save and reload as one card',()=>{
 assert.equal(editorById['MHA-1-034'].number,'UA10BT/MHA-1-034');
 assert.ok(editorById['MHA-1-034'].aliases.includes('UA10ST/MHA-1-034'));
 assert.deepEqual(normalizeEditorCounts('mha',{
  'UA10ST/MHA-1-034':2,'UA10BT/MHA-1-034':2
 }),{'MHA-1-034':4});
 const pasted={};
 for(const [id,n] of Object.entries(green))
  pasted[starterById[id]?.number||editorById[id].number]=n;
 assert.deepEqual(normalizeEditorCounts('mha',pasted),green);
 const shown=editorById['MHA-1-102'];
 assert.match(shown.nameJa,/オールマイト/);
 assert.match(shown.image,/UA10ST_MHA-1-102/);
 assert.equal(deckCardImage(shown),shown.image);
 assert.match(fieldEffectCopy(shown),/傷害（2）/);
 assert.match(starterById['MHA-1-034'].image,/UA10ST_/);
 assert.match(editorById['MHA-1-034'].image,/UA10BT_/);
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/mha:printedCatalogueMap\(mhaEditorCards\(\)\)/);
 const saved={id:'unofficial-mha-green',name:UNOFFICIAL+'・綠',counts:pasted};
 const storage={
  getItem(key){return key===LEGACY_DECK_KEYS.mha[1]?JSON.stringify([saved]):null;},
  setItem(){}
 };
 const row=collectSavedV2LobbyDecks(storage).find(item=>item.localId==='unofficial-mha-green');
 assert.equal(row.name,UNOFFICIAL+'・綠');
 assert.equal(row.title,'mha');
 assert.equal(row.ready,false);
 assert.match(row.issues.join('\n'),new RegExp(MHA_OFFICIAL_MATCH_CLOSED));
 const status=editorV2Status('mha',green);
 assert.equal(status.total,50);
 assert.equal(status.ready,false);
 assert.deepEqual(status.counts,green);
 assert.match(validateUniversalDeck(mha,{...green,'MHA-1-103':5}).join('\n'),/MHA-1-103/);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.equal(getTitle('mha').playable,false);
});
