// Round 16 acceptance on the 77-card MHA pack. The three lists are unofficial
// test decks taken from PR #451 and rebuilt against createMhaV2Pack(). They
// are not UA10ST_PRODUCT and they do not replace the 109-card editor catalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack,MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {UA10ST_PRODUCT,UA10ST_CARDS} from '../dist/mha/ua10st-cards.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {fieldEffectCopy} from '../dist/universal-v2/preview-actions.mjs';
import {facedownInspectModel,facedownTitle} from '../dist/universal-v2/facedown-inspect.mjs';
import {deckCardImage} from '../dist/deck-gallery.mjs';
import {normalizeEditorCounts,editorV2Status,LEGACY_DECK_KEYS} from '../dist/v2-editor-compat.mjs';
import {collectSavedV2LobbyDecks} from '../dist/universal-v2/lobby-saved-decks.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const UNOFFICIAL='非官方測試牌組';
const LIMITED=new Set(['special','final','color']);
const NEW_READY=['MHA-1-006','MHA-1-007','MHA-1-009','MHA-1-010','MHA-1-017',
 'MHA-1-048','MHA-1-056','MHA-1-059','MHA-1-071','MHA-1-074','MHA-1-087',
 'MHA-1-089','MHA-1-093'];
const STILL_PENDING=['MHA-1-002','MHA-1-038','MHA-1-076'];
const REPRINTS=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065'];
const NEEDED={
 green:['MHA-1-036','MHA-1-043','MHA-1-044','MHA-1-049','MHA-1-051',
  'MHA-1-056','MHA-1-061','MHA-1-102','MHA-1-103','MHA-1-106','MHA-1-107'],
 purple:['MHA-1-001','MHA-1-008','MHA-1-009','MHA-1-010','MHA-1-013',
  'MHA-1-014','MHA-1-021'],
 red:['MHA-1-067','MHA-1-073','MHA-1-080','MHA-1-087','MHA-1-093']
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
function clearLine(s,player,line){
 for(let slot=0;slot<4;slot++){
  const card=s.players[player][line][slot];
  if(!card)continue;
  s.players[player][line][slot]=null;
  s.players[player].deck.push(card);
 }
}
function placeLife(s,player,index,id){
 const life=s.players[player].life;
 if(life[index]?.cardId===id)return life[index];
 for(const zone of ['deck','hand','outside','removed']){
  const at=s.players[player][zone].findIndex(card=>card.cardId===id);
  if(at<0)continue;
  const card=s.players[player][zone].splice(at,1)[0];
  const prev=life[index];
  life[index]=card;
  if(prev)s.players[player].deck.push(prev);
  return card;
 }
 const at=life.findIndex((card,i)=>i!==index&&card?.cardId===id);
 if(at<0)throw Error('Missing '+id);
 const card=life[at];
 life[at]=life[index];
 life[index]=card;
 return card;
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
function quietLife(pack,s,player){
 const print=Array.isArray(pack)?pack[player].cards:pack.cards;
 const life=s.players[player].life;
 for(let i=0;i<life.length;i++){
  if(!print[life[i].cardId]?.trigger)continue;
  const index=s.players[player].deck.findIndex(card=>
   print[card.cardId]?.type==='character'&&!print[card.cardId]?.trigger);
  if(index<0)break;
  const swap=s.players[player].deck.splice(index,1)[0];
  s.players[player].deck.push(life[i]);
  life[i]=swap;
 }
}
function same(action,other){
 return JSON.stringify(action)===JSON.stringify(other);
}
function walkAi(packs,s,steps=20){
 for(const difficulty of ['easy','normal']){
  let cursor=s;
  for(let step=0;step<steps;step++){
   const legal=legalUniversalActions(packs,cursor);
   const chosen=chooseUniversalAiAction(packs,cursor,{difficulty});
   if(!legal.length){
    assert.equal(chosen,null);
    break;
   }
   assert.ok(legal.some(action=>same(action,chosen)),difficulty+' step '+step+' '+JSON.stringify(chosen));
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

test('the ready pool stays 77 cards and MHA stays unplayable',()=>{
 assert.equal(Object.keys(mha.cards).length,77);
 assert.equal(mha.version,'mha-ua10-ready-77');
 assert.equal(editor.length,109);
 assert.equal(getTitle('mha').playable,false);
 assert.equal(editor.every(card=>card.playable===false&&card.battleReady===false),true);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 for(const id of NEW_READY)assert.equal(mha.cards[id].id,id);
 for(const id of STILL_PENDING)assert.equal(mha.cards[id],undefined);
 assert.deepEqual(colorCards('green').length>0&&colorCards('purple').length>0&&colorCards('red').length>0,true);
});

test('green, purple and red unofficial decks are legal 50-card lists',()=>{
 for(const [name,counts] of Object.entries(decks)){
  assert.match(name,/非官方測試牌組/);
  assert.doesNotMatch(name,/官方預組|公式デッキ/);
  assert.equal(Object.values(counts).reduce((sum,n)=>sum+n,0),50);
  assert.deepEqual(validateUniversalDeck(mha,counts),[]);
  const colors=new Set(Object.keys(counts).map(id=>mha.cards[id].color));
  assert.equal(colors.size,1);
  for(const [id,n] of Object.entries(counts))
   assert.equal(Number.isInteger(n)&&n>=1&&n<=4,true,id);
  assert.ok(triggerTotal(counts,'special')<=4);
  assert.ok(triggerTotal(counts,'final')<=4);
  assert.ok(triggerTotal(counts,'color')<=4);
  const bins=curve(counts);
  assert.ok(bins[0]>=8,name+' zero '+bins[0]);
  assert.ok(bins[1]+bins[2]>=8,name+' mid '+JSON.stringify(bins));
  assert.ok(bins[3]>=2,name+' three');
  assert.ok(bins[4]>=2,name+' high '+JSON.stringify(bins));
 }
 assert.ok(green['MHA-1-107']>=2);
 assert.ok(green['MHA-1-106']>=2&&green['MHA-1-049']>=2&&green['MHA-1-056']>=2);
 assert.equal(mha.cards['MHA-1-107'].raidName,mha.cards['MHA-1-106'].name);
 assert.equal(mha.cards['MHA-1-051'].raidName,mha.cards['MHA-1-049'].name);
 assert.ok(purple['MHA-1-014']>=2&&purple['MHA-1-013']>=2);
 assert.ok(purple['MHA-1-010']>=2&&purple['MHA-1-008']>=2);
 assert.equal(mha.cards['MHA-1-014'].raidName,mha.cards['MHA-1-013'].name);
 assert.equal(mha.cards['MHA-1-010'].raidName,mha.cards['MHA-1-008'].name);
 assert.equal(colorCards('red').some(card=>card.raidName),false);
 assert.ok(red['MHA-1-087']>=2&&red['MHA-1-093']>=2);
 assert.equal(mha.cards['MHA-1-087'].energy,4);
 assert.equal(mha.cards['MHA-1-093'].name,mha.cards['MHA-1-107'].raidName);
});

test('deck cards keep official art and the full printed effect',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/mha:printedCatalogueMap\(mhaEditorCards\(\)\)/);
 assert.match(preview,/mha:new Map\(mhaEditorCards\(\)/);
 for(const counts of Object.values(decks)){
  for(const id of Object.keys(counts)){
   const row=editorById[id];
   assert.match(row.image,/https:\/\/www\.unionarena-tcg\.com\/.+UA10(BT|ST)_MHA-1-/);
   assert.equal(deckCardImage(row),row.image);
   assert.equal(row.nameJa.length>0,true);
   const copy=fieldEffectCopy(row);
   if(row.effect&&row.effect!=='-')assert.ok(copy.includes(row.effect.trim()),id);
   else if(row.triggerText)assert.ok(copy.includes(row.triggerText.trim()),id);
   else assert.match(copy,/沒有印刷效果|沒有可顯示的效果/);
  }
 }
 const fat=editorById['MHA-1-056'];
 assert.match(fieldEffectCopy(fat),/裏向き/);
 assert.ok(fieldEffectCopy(fat).includes(fat.effectJa.trim()));
 const allMight=editorById['MHA-1-102'];
 assert.match(allMight.nameJa,/オールマイト/);
 assert.match(allMight.image,/UA10ST_MHA-1-102/);
 assert.match(fieldEffectCopy(allMight),/傷害（2）/);
 assert.match(fieldEffectCopy(editorById['MHA-1-107']),/綠谷出久/);
 assert.match(editorById['MHA-1-107'].effectJa,/緑谷 出久/);
});

test('nine UA10ST reprints import, and the three decks save and reload',()=>{
 for(const id of REPRINTS){
  assert.equal(editorById[id].number,'UA10BT/'+id);
  assert.ok(editorById[id].aliases.includes('UA10ST/'+id));
  assert.equal(mha.cards[id].id,id);
  assert.match(starterById[id].image,/UA10ST_/);
  assert.match(editorById[id].image,/UA10BT_/);
  assert.deepEqual(normalizeEditorCounts('mha',{
   ['UA10ST/'+id]:2,['UA10BT/'+id]:2
  }),{[id]:4});
 }
 const saved=Object.entries(decks).map(([name,counts],index)=>{
  const pasted={};
  for(const [id,n] of Object.entries(counts))
   pasted[starterById[id]?.number||editorById[id].number]=n;
  assert.deepEqual(normalizeEditorCounts('mha',pasted),counts);
  return {id:'unofficial-mha-'+index,name,counts:pasted};
 });
 const storage={
  getItem(key){return key===LEGACY_DECK_KEYS.mha[1]?JSON.stringify(saved):null;},
  setItem(){}
 };
 const rows=collectSavedV2LobbyDecks(storage);
 for(const [name,counts] of Object.entries(decks)){
  const row=rows.find(item=>item.name===name);
  assert.equal(row.title,'mha');
  assert.equal(row.ready,false);
  assert.match(row.issues.join('\n'),new RegExp(MHA_OFFICIAL_MATCH_CLOSED));
  const status=editorV2Status('mha',counts);
  assert.equal(status.total,50);
  assert.equal(status.ready,false);
  assert.deepEqual(status.counts,counts);
 }
 assert.match(validateUniversalDeck(mha,{...green,'MHA-1-103':5}).join('\n'),/MHA-1-103/);
 assert.equal(getTitle('mha').playable,false);
});

test('green raids its own Midoriya, blocks, and sends the loser outside',()=>{
 const opened=openDecks(mha,mha,green,red,1601);
 let s=opened.s;
 seat(s,0,'MHA-1-036','energy',0,true);
 seat(s,0,'MHA-1-036','energy',1,true);
 seat(s,0,'MHA-1-044','energy',2,true);
 seat(s,0,'MHA-1-049','energy',3,true);
 const base=seat(s,0,'MHA-1-106','front',0,false);
 const wrong=seat(s,0,'MHA-1-105','front',1,false);
 const foe=seat(s,1,'MHA-1-093','front',0,true);
 const raider=hold(s,0,'MHA-1-107');
 setAp(s,0,1);
 const raids=legalUniversalActions(opened.packs,s).filter(action=>
  action.type==='raid'&&action.uid===raider.uid);
 assert.ok(raids.length>0);
 assert.ok(raids.every(action=>action.baseUid===base.uid));
 assert.equal(raids.some(action=>action.baseUid===wrong.uid||action.baseUid===foe.uid),false);
 s=act(opened.packs,s,raids[0]);
 const top=s.players[0].front.find(card=>card?.cardId==='MHA-1-107');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-106');
 assert.notEqual(top.stack[0].faceDown,true);
 const owner=universalPublicView(opened.packs,s,0);
 const other=universalPublicView(opened.packs,s,1);
 const layer=view=>view.players[0].front.find(card=>card?.cardId==='MHA-1-107').raidLayers[0];
 assert.equal(layer(owner).cardId,'MHA-1-106');
 assert.equal(layer(other).cardId,'MHA-1-106');
 s=reach(opened.packs,s,0,'attack');
 const attacker=seat(s,0,'MHA-1-103','front',2,true);
 const wall=seat(s,1,'MHA-1-080','front',1,true);
 quietLife(opened.packs,s,1);
 const life=s.players[1].life.length;
 s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='effect-target'||s.pending?.kind==='effect-retire-bp')
  s=act(opened.packs,s,action=>action.uid===null);
 assert.equal(s.pending.kind,'block');
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===wall.uid);
 assert.equal(s.players[0].front.find(card=>card?.uid===attacker.uid).ready,false);
 assert.equal(s.players[1].front.find(card=>card?.uid===wall.uid).ready,false);
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.players[1].outside.some(card=>card.uid===wall.uid),false);
 s=reach(opened.packs,s,1,'attack');
 const low=seat(s,0,'MHA-1-103','front',3,true);
 const hitter=seat(s,1,'MHA-1-087','front',2,true);
 s=act(opened.packs,s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='effect-target'||s.pending?.kind==='effect-retire-bp')
  s=act(opened.packs,s,action=>action.uid===null);
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===low.uid);
 assert.ok(s.players[0].outside.some(card=>card.uid===low.uid));
 assert.equal(s.players[0].removed.some(card=>card.uid===low.uid),false);
});

test('MHA-1-010 sends the losing character to removed and MHA-1-014 sends one outside',()=>{
 const opened=openDecks(mha,mha,purple,green,1602);
 let s=reach(opened.packs,opened.s,0,'attack');
 const winner=seat(s,0,'MHA-1-010','front',0,true);
 const loser=seat(s,1,'MHA-1-103','front',0,true);
 assert.equal(mha.cards['MHA-1-010'].battleRemoveInstead,true);
 quietLife(opened.packs,s,1);
 s=act(opened.packs,s,{type:'attack',uid:winner.uid});
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===loser.uid);
 assert.ok(s.players[1].removed.some(card=>card.uid===loser.uid));
 assert.equal(s.players[1].outside.some(card=>card.uid===loser.uid),false);
 assert.equal(s.players[0].front[0].uid,winner.uid);
 s=reach(opened.packs,s,0,'attack');
 const dabi=seat(s,0,'MHA-1-014','front',1,true);
 const low=seat(s,1,'MHA-1-036','front',1,true);
 s=act(opened.packs,s,{type:'attack',uid:dabi.uid});
 if(s.pending&&s.pending.kind!=='block')
  s=act(opened.packs,s,action=>action.uid===null||action.mode==='skip');
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===low.uid);
 assert.ok(s.players[1].outside.some(card=>card.uid===low.uid));
 assert.equal(s.players[1].removed.some(card=>card.uid===low.uid),false);
});

test('a facedown card under Fat Gum stays hidden from the opponent',()=>{
 const opened=openDecks(mha,mha,green,purple,1603);
 let s=opened.s;
 seat(s,0,'MHA-1-036','energy',0,true);
 seat(s,0,'MHA-1-036','energy',1,true);
 seat(s,0,'MHA-1-044','energy',2,true);
 seat(s,0,'MHA-1-049','energy',3,true);
 const secret=hold(s,0,'MHA-1-061');
 const gum=hold(s,0,'MHA-1-056');
 setAp(s,0,1);
 assert.ok((universalEnergyByColor(opened.packs,s,0).green||0)>=4);
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===gum.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-tuck-facedown');
 if(s.pending.step==='host')
  s=act(opened.packs,s,action=>action.type==='chooseTuckFacedown'&&action.uid===gum.uid);
 const chosen=chooseUniversalAiAction(opened.packs,s,{difficulty:'normal'});
 assert.ok(legalUniversalActions(opened.packs,s).some(action=>same(action,chosen)));
 s=act(opened.packs,s,{type:'chooseTuckFacedown',uid:secret.uid});
 if(s.pending?.kind==='effect-may-draw'||s.pending?.kind==='effect-optional-draw')
  s=act(opened.packs,s,action=>action.mode==='draw'||action.mode==='skip');
 const host=s.players[0].front.find(card=>card?.cardId==='MHA-1-056');
 assert.equal(host.under.length,1);
 assert.equal(host.under[0].uid,secret.uid);
 assert.equal(host.under[0].faceDown,true);
 const owner=universalPublicView(opened.packs,s,0);
 const foe=universalPublicView(opened.packs,s,1);
 const ownHost=owner.players[0].front.find(card=>card?.cardId==='MHA-1-056');
 const foeHost=foe.players[0].front.find(card=>card?.cardId==='MHA-1-056');
 assert.equal(ownHost.underLayers[0].cardId,'MHA-1-061');
 assert.equal(ownHost.underLayers[0].uid,secret.uid);
 assert.deepEqual(foeHost.underLayers[0],{faceDown:true});
 assert.equal(JSON.stringify(foe).includes('MHA-1-061'),false);
 assert.equal(JSON.stringify(foe).includes(secret.uid),false);
 const ownModel=facedownInspectModel(ownHost);
 const foeModel=facedownInspectModel(foeHost);
 assert.equal(ownModel.private,true);
 assert.equal(ownModel.cards[0].cardId,'MHA-1-061');
 assert.equal(facedownTitle(ownModel),'自己的裏向卡');
 assert.equal(foeModel.cards[0].hidden,true);
 assert.equal(foeModel.cards[0].cardId,undefined);
 assert.equal(facedownTitle(foeModel),'對手的裏向卡');
 const firstView=JSON.stringify(foe);
 const again=openDecks(mha,mha,green,purple,1604);
 assert.equal(again.s.players[0].front.every(card=>card===null),true);
 assert.equal(JSON.stringify(universalPublicView(again.packs,again.s,1)).includes(secret.uid),false);
 assert.equal(JSON.stringify(universalPublicView(opened.packs,s,1)),firstView);
 walkAi(again.packs,again.s,12);
 assert.equal(JSON.stringify(universalPublicView(opened.packs,s,1)),firstView);
});

test('MHA activates against IMC, chooses a life card, and resolves its own draw trigger',()=>{
 const opened=openDecks(mha,imc,green,fillDeck(imc,{
  'IMC-1-001':4,'IMC-1-007':4
 }),1605,{attackerChoosesLife:true});
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
 quietLife(opened.packs,s,1);
 const first=placeLife(s,1,0,'IMC-1-001');
 const second=placeLife(s,1,1,'IMC-1-007');
 clearLine(s,1,'front');
 s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='block')
  s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
 assert.equal(s.pending.kind,'attack-life-target');
 assert.equal(s.pending.player,0);
 s=act(opened.packs,s,action=>action.type==='chooseAttackLife'&&action.indices?.[0]===1);
 const revealed=[...s.players[1].lifeRevealed,...s.players[1].hand,...s.players[1].outside];
 assert.ok(revealed.some(card=>card.uid===second.uid));
 assert.ok(s.players[1].life.some(card=>card.uid===first.uid));
 if(s.pending?.kind==='life-trigger')
  s=act(opened.packs,s,action=>action.type==='chooseTrigger'&&(action.mode==='skip'||action.uid===null||action.mode));
 s=reach(opened.packs,s,1,'attack');
 const hitter=seat(s,1,'IMC-1-001','front',0,true);
 quietLife(opened.packs,s,0);
 const drawCard=placeLife(s,0,0,'MHA-1-043');
 clearLine(s,0,'front');
 const hand=s.players[0].hand.length;
 s=act(opened.packs,s,{type:'attack',uid:hitter.uid});
 if(s.pending?.kind==='block')
  s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(s.pending?.kind==='attack-life-target')
  s=act(opened.packs,s,action=>action.type==='chooseAttackLife'&&action.indices?.[0]===0);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.player,0);
 assert.equal(s.pending.trigger,'draw');
 s=act(opened.packs,s,action=>action.type==='chooseTrigger'&&action.mode==='draw');
 assert.equal(s.players[0].hand.length,hand+1);
 assert.ok(s.players[0].outside.some(card=>card.uid===drawCard.uid)||
  s.players[0].lifeRevealed.some(card=>card.uid===drawCard.uid));
});

test('BLEACH battle-remove and a facedown under-card stay on their printed zones',()=>{
 const opened=openDecks(mha,bleach,red,fillDeck(bleach,{
  'BLC-1-092':2,'BLC-1-002':4,'BLC-3-011':2,'BLC-1-078':4,'BLC-1-067':2
 }),1606);
 let s=reach(opened.packs,opened.s,1,'attack');
 const winner=seat(s,1,'BLC-1-092','front',0,true);
 const loser=seat(s,0,'MHA-1-067','front',0,true);
 assert.equal(bleach.cards['BLC-1-092'].battleRemoveInstead,true);
 quietLife(opened.packs,s,0);
 s=act(opened.packs,s,{type:'attack',uid:winner.uid});
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===loser.uid);
 assert.ok(s.players[0].removed.some(card=>card.uid===loser.uid));
 assert.equal(s.players[0].outside.some(card=>card.uid===loser.uid),false);
 s=reach(opened.packs,s,1,'main');
 seat(s,1,'BLC-1-078','energy',0,true);
 seat(s,1,'BLC-1-078','energy',1,true);
 const secret=pull(s,1,'BLC-1-067');
 s.players[1].deck.unshift(secret);
 const rider=hold(s,1,'BLC-3-011');
 setAp(s,1,1);
 assert.ok((universalEnergyByColor(opened.packs,s,1).green||0)>=3);
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===rider.uid);
 assert.equal(s.pending.kind,'effect-optional-tuck-under');
 s=act(opened.packs,s,{type:'chooseOptionalTuck',mode:'tuck'});
 const host=s.players[1].energy.find(card=>card?.cardId==='BLC-3-011');
 assert.equal(host.under[0].uid,secret.uid);
 assert.equal(host.under[0].faceDown,true);
 const mhaView=universalPublicView(opened.packs,s,0);
 const bleachView=universalPublicView(opened.packs,s,1);
 const hidden=mhaView.players[1].energy.find(card=>card?.cardId==='BLC-3-011');
 const shown=bleachView.players[1].energy.find(card=>card?.cardId==='BLC-3-011');
 assert.deepEqual(hidden.underLayers[0],{faceDown:true});
 assert.equal(shown.underLayers[0].cardId,'BLC-1-067');
 assert.equal(JSON.stringify(mhaView).includes('BLC-1-067'),false);
 assert.equal(JSON.stringify(mhaView).includes(secret.uid),false);
 assert.equal(facedownTitle(facedownInspectModel(hidden)),'對手的裏向卡');
 assert.equal(facedownInspectModel(shown).cards[0].cardId,'BLC-1-067');
});

test('AI actions stay legal across MHA, IMC and BLEACH, including a second match',()=>{
 const pairs=[
  openDecks(mha,mha,green,purple,1611),
  openDecks(mha,imc,purple,fillDeck(imc,{'IMC-1-001':4}),1612),
  openDecks(mha,bleach,red,fillDeck(bleach,{'BLC-1-002':4}),1613)
 ];
 for(const opened of pairs)walkAi(opened.packs,opened.s);
 const frozen=JSON.stringify(universalPublicView(pairs[0].packs,pairs[0].s,0));
 const again=openDecks(mha,mha,red,green,1614);
 walkAi(again.packs,again.s,12);
 assert.equal(JSON.stringify(universalPublicView(pairs[0].packs,pairs[0].s,0)),frozen);
 assert.notEqual(again.s,pairs[0].s);
 assert.equal(again.s.players.every(player=>player.front.every(card=>!card?.under?.length)),true);
});
