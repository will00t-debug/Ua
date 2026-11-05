import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalEnergy,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {boardEntryMode,boardEntrySelection,entryClickPlan,pendingEntryChoiceCards,
 uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {onlinePrivateGallery} from '../server/domain.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 return counts;
}
function withCopies(ids,extras){
 const counts=countsFor(ids);
 for(const [id,n] of Object.entries(extras)){
  let need=n-(counts[id]||0);
  counts[id]=n;
  for(const key of Object.keys(counts)){
   if(need<=0)break;
   if(key===id||Object.prototype.hasOwnProperty.call(extras,key)&&key!==id)continue;
   if(ids.includes(key))continue;
   const drop=Math.min(need,counts[key]);
   counts[key]-=drop;
   if(counts[key]<=0)delete counts[key];
   need-=drop;
  }
  assert.equal(need,0,'deck has no room for '+id);
 }
 assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const counts=withCopies([
 'KMR-1-022','KMR-1-023','KMR-1-006','KMR-1-017','KMR-1-101','KMR-1-102',
 'KMR-1-007','KMR-1-109','KMR-1-078','KMR-1-103'
],{'KMR-1-023':2});

function fresh(){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:29,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 const life=s.players[p].life,index=life.findIndex(c=>c.cardId===id);
 if(index<0)throw Error('Missing '+id);
 const deck=s.players[p].deck,swapAt=deck.findIndex(c=>c&&c.cardId!==id);
 if(swapAt<0)throw Error('No life swap for '+id);
 const swap=deck.splice(swapAt,1)[0];
 const card=life[index];
 life[index]=swap;
 return card;
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function park(s,p){
 const pl=s.players[p];
 pl.deck.push(...pl.hand.splice(0),...pl.outside.splice(0));
}
function ready(s){
 s.pending=null;
 s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
function go(s,action){return dispatchUniversalAction(packs,s,action);}

test('kmr character entry is one card, then mode only when both are printed, then the cell',()=>{
 const uid='platform';
 const enters=[0,1,2,3].map(slot=>({type:'kmr',mode:'enter',uid,line:'front',slot,
  replaceUid:null,ready:false,from:'outside'}));
 assert.equal(enters.every(action=>boardEntryMode(action)==='normal'),true);
 assert.equal(boardEntryMode({type:'kmr',mode:'raid',uid,baseUid:'base',line:'front',slot:0}),'raid');
 assert.equal(boardEntryMode({type:'kmr',mode:'deploy',uid}),null);
 assert.equal(boardEntryMode({type:'kmr',mode:'skip'}),null);
 const view={players:[{hand:[],outside:[],removed:[]},{outside:[],removed:[]}]};
 assert.equal(pendingEntryChoiceCards(null,view,enters).length,1);
 assert.equal(entryClickPlan({selectedUid:null,entryMode:null,line:'front',slot:0,
  slotUid:null,legal:enters}).type,'idle');
 const cell=entryClickPlan({selectedUid:uid,entryMode:null,line:'front',slot:1,
  slotUid:null,legal:enters});
 assert.equal(cell.type,'entry');
 assert.equal(cell.mode,'normal');
 assert.equal(cell.actions.length,1);
 assert.equal(boardEntrySelection(enters,uid).needsMode,false);
 const both=[enters[1],{type:'kmr',mode:'raid',uid,baseUid:'base',line:'front',slot:0,replaceUid:null}];
 assert.equal(boardEntrySelection(both,uid).needsMode,true);
 assert.equal(entryClickPlan({selectedUid:uid,entryMode:null,line:'front',slot:1,
  slotUid:null,legal:both}).type,'entry-mode');
 const picked=entryClickPlan({selectedUid:uid,entryMode:'raid',line:'front',slot:0,
  slotUid:'base',legal:both});
 assert.equal(picked.type,'raid-base');
 assert.equal(picked.baseUid,'base');
 const raid=entryClickPlan({selectedUid:uid,entryMode:'raid',raidBaseUid:'base',
  line:'front',slot:0,slotUid:'base',legal:both});
 assert.equal(raid.type,'entry');
 assert.equal(raid.mode,'raid');
 assert.equal(raid.actions.length,1);
 assert.doesNotMatch(uiActionLabel({type:'kmr',mode:'skip'}),/執行 kmr/);
 assert.equal(uiActionLabel({type:'kmr',mode:'enter',line:'front',slot:0}),'讓這張卡登場');
 assert.equal(uiActionLabel({type:'kmr',mode:'raid',line:'front',slot:0}),'以突襲登場');
 for(const file of ['dist/universal-v2/preview-actions.mjs','dist/online.mjs']){
  const block=read(file).split('const MODE_BOARD_ENTRY')[1].split('function boardEntryMode')[0];
  assert.match(block,/['"]kmr['"]/,file);
 }
 assert.match(read('dist/online.mjs'),/選擇此角色 · 再選登場方式/);
 const runtime=read('dist/universal-v2/kmr-runtime.mjs');
 const base=runtime.split('function baseRest')[1].split('function tuckOffer')[0];
 assert.match(base,/offerFieldEntry/);
 assert.match(base,/skipOnPlay:\s*false/);
 const event=runtime.split("'KMR-1-109|onPlay'")[1].split("'KMR-1-110|onPlay'")[0];
 assert.match(event,/offerFieldEntry/);
 assert.doesNotMatch(event,/beginLook|deployOrRaid/);
});

test('KMR-1-022 offers every legal copy as a rest entry, then draws after a hand summon',()=>{
 // The printed 登場時 sits in the Raid frame, so it resolves after 022 raids.
 let s=fresh();
 park(s,0);
 for(const [i,id] of ['KMR-1-006','KMR-1-017','KMR-1-101','KMR-1-102'].entries())
  put(s,0,id,'energy',i,true);
 const base=put(s,0,'KMR-1-023','front',0,true);
 const handA=take(s,0,'KMR-1-023'),outside=take(s,0,'KMR-1-007');
 const rider=take(s,0,'KMR-1-022');
 s.players[0].hand.push(rider,handA);
 s.players[0].outside.push(outside);
 ready(s);
 assert.ok(universalEnergy(pack,s,0)>=4);
 const deckBefore=s.players[0].deck.length;
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===rider.uid&&
  a.baseUid===base.uid&&a.line!=='energy'&&a.slot===0);
 assert.ok(raid);
 s=go(s,raid);
 assert.equal(s.pending?.kind,'kmr');
 assert.equal(s.pending.step,'enter');
 const actions=s.pending.actions;
 const uids=new Set(actions.filter(a=>a.mode==='enter').map(a=>a.uid));
 assert.deepEqual([...uids].sort(),[handA.uid,outside.uid].sort());
 assert.equal(actions.some(a=>a.mode==='raid'||a.mode==='deploy'),false);
 assert.ok(actions.filter(a=>a.uid===handA.uid).every(a=>a.mode==='enter'&&
  (a.line==='front'||a.line==='energy')&&Number.isInteger(a.slot)));
 assert.equal(boardEntrySelection(actions,handA.uid).needsMode,false);
 const chosen=actions.find(a=>a.mode==='enter'&&a.uid===handA.uid&&a.line==='front'&&
  a.slot===1&&a.replaceUid==null);
 assert.ok(chosen);
 s=go(s,chosen);
 assert.equal(s.players[0].front[1]?.uid,handA.uid);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.players[0].front[0]?.cardId,'KMR-1-022');
 assert.equal(s.players[0].hand.some(c=>c.uid===handA.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===outside.uid),true);
 assert.equal(s.pending?.step,'mayDraw');
 assert.equal(s.players[0].deck.length,deckBefore);
 s=go(s,{type:'kmr',mode:'draw'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deckBefore-1);
});

test('KMR-1-109 rests or raids a looked character, then orders the other three',()=>{
 let s=fresh();
 park(s,0);
 for(const [i,id] of ['KMR-1-006','KMR-1-017','KMR-1-101'].entries())
  put(s,0,id,'energy',i,true);
 const base=put(s,0,'KMR-1-023','front',0,true);
 const window=['KMR-1-022','KMR-1-078','KMR-1-023','KMR-1-103'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const event=take(s,0,'KMR-1-109');
 s.players[0].hand.push(event);
 ready(s);
 assert.ok(universalEnergy(pack,s,0)>=3);
 s=go(s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending?.step,'enter');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 const actions=s.pending.actions;
 const rider=window[0],plain=window[2];
 assert.ok(actions.some(a=>a.uid===rider.uid&&a.mode==='enter'&&a.from==='deck'));
 assert.ok(actions.some(a=>a.uid===rider.uid&&a.mode==='raid'&&a.baseUid===base.uid&&a.from==='deck'));
 assert.ok(actions.some(a=>a.uid===plain.uid&&a.mode==='enter'));
 assert.equal(actions.some(a=>a.uid===plain.uid&&a.mode==='raid'),false);
 assert.equal(actions.some(a=>a.uid===window[1].uid||a.uid===window[3].uid),false);
 assert.equal(boardEntrySelection(actions,rider.uid).needsMode,true);
 const priv=universalPrivateChoices(packs,s,0);
 assert.equal(priv.inspected?.length,4);
 assert.equal(priv.inspected[1].uid,window[1].uid);
 const legal=legalUniversalActions(packs,s);
 const shown=onlinePrivateGallery(priv,legal,packs,s);
 assert.deepEqual(shown.cards.map(c=>c.uid),window.map(c=>c.uid));
 assert.ok(shown.cards[0].actions.length>1);
 assert.equal(shown.cards[1].actions.length,0);
 assert.equal(shown.cards[3].actions.length,0);
 const raid=actions.find(a=>a.mode==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid&&
  a.line==='front'&&a.slot===0);
 const raided=go(s,raid);
 assert.equal(raided.players[0].front[0]?.cardId,'KMR-1-022');
 assert.equal(raided.players[0].front[0].ready,true);
 assert.equal(raided.players[0].front[0].stack?.[0]?.uid,base.uid);
 assert.equal(raided.players[0].hand.some(c=>c.uid===rider.uid),false);
 assert.equal(raided.players[0].deck.some(c=>c.uid===rider.uid),false);
 assert.equal(raided.pending?.step,'lookOrder');
 assert.equal(raided.pending.actions.some(a=>a.uid===rider.uid),false);
 assert.equal(new Set(raided.pending.actions.map(a=>a.uid)).size,3);
 const enter=actions.find(a=>a.mode==='enter'&&a.uid===rider.uid&&a.line==='front'&&
  a.slot===1&&a.replaceUid==null);
 const rested=go(s,enter);
 assert.equal(rested.players[0].front[1]?.uid,rider.uid);
 assert.equal(rested.players[0].front[1].ready,false);
 assert.equal(rested.players[0].front[1].stack?.length||0,0);
 assert.equal(rested.players[0].front[0]?.uid,base.uid);
 assert.equal(rested.pending?.step,'lookOrder');
 const skipped=go(s,actions.find(a=>a.mode==='skip'));
 assert.equal(skipped.pending?.step,'lookOrder');
 assert.equal(new Set(skipped.pending.actions.map(a=>a.uid)).size,4);
});
