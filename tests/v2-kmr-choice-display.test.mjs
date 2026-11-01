import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {controllerChoiceArt,fieldEffectCopy,pendingTextChoiceClass,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];

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
function fresh(counts){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:29,first:0});
}
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
function ready(s){
 s.pending=null;
 s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
function latin(label){
 return /[A-Za-z]/.test(label);
}

test('Muse publishes the opponent deck top and the choice shows that card in Chinese',()=>{
 const s=fresh(countsFor(['KMR-1-113','KMR-1-068','KMR-1-069','KMR-1-072','KMR-1-073']));
 for(const [slot,id] of ['KMR-1-068','KMR-1-069','KMR-1-072','KMR-1-073'].entries())
  put(s,0,id,'energy',slot,true);
 const muse=take(s,0,'KMR-1-113');
 s.players[0].hand.push(muse);
 ready(s);
 const top=s.players[1].deck[0];
 const hidden=s.players[1].deck[1];
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===muse.uid&&a.line==='front');
 assert.ok(play,'Muse should be playable with four red energy');
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending?.step,'oppTop');
 assert.equal(played.pending?.data?.uid,top.uid);
 assert.equal(played.players[1].deck[0].uid,top.uid);
 const published=played.publicReveals.filter(entry=>entry.uid===top.uid);
 assert.equal(published.length,1);
 assert.equal(published[0].cardId,top.cardId);
 assert.equal(published[0].owner,1);
 assert.equal(published[0].kind,'deck-top');
 assert.equal(played.publicReveals.some(entry=>entry.uid===hidden.uid),false);
 for(const mode of ['top','outside']){
  const action={type:'kmr',mode};
  const art=controllerChoiceArt(packs,played,action);
  assert.equal(art.length,1,mode);
  assert.equal(art[0].cardId,top.cardId);
  assert.equal(art[0].side,1);
  assert.equal(art[0].name,pack.cards[top.cardId].name);
  const label=uiActionLabel(action,{pack:packs,state:played});
  assert.equal(label.toLowerCase().includes('kmr'),false,label);
  assert.equal(latin(label),false,label);
 }
 assert.equal(uiActionLabel({type:'kmr',mode:'top'},{pack:packs,state:played}),'將這張公開的卡留在對手牌組上面');
 assert.equal(uiActionLabel({type:'kmr',mode:'outside'},{pack:packs,state:played}),'將這張公開的卡放到場外');
 assert.equal(pendingTextChoiceClass({type:'kmr',mode:'top'}),'recommended');
 assert.equal(pendingTextChoiceClass({type:'kmr',mode:'skip'}),'quiet');
});

test('looking at your own deck top stays private and still shows the controller the card',()=>{
 const s=fresh(countsFor(['KMR-1-027']));
 const rider=put(s,0,'KMR-1-027','front',0,true);
 ready(s);
 const top=s.players[0].deck[0];
 const action=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===rider.uid&&a.mode==='kmr:KMR-1-027:b');
 assert.ok(action);
 const looked=dispatchUniversalAction(packs,s,action);
 assert.equal(looked.pending?.step,'topPlace');
 assert.equal(looked.pending?.data?.uid,top.uid);
 assert.equal(looked.publicReveals.some(entry=>entry.uid===top.uid),false);
 const art=controllerChoiceArt(packs,looked,{type:'kmr',mode:'outside'});
 assert.equal(art[0]?.cardId,top.cardId);
 assert.equal(art[0]?.side,0);
 assert.equal(uiActionLabel({type:'kmr',mode:'outside'},{pack:packs,state:looked}),'放到場外');
 assert.equal(uiActionLabel({type:'kmr',mode:'top'},{pack:packs,state:looked}),'留在上面');
 const button=uiActionLabel(action,{pack:packs,state:s});
 assert.equal(button.includes('kmr'),false);
 assert.match(button,/起動主要/);
});

test('a published opponent top is shown without opening the rest of that deck',()=>{
 const packsArt=[{cards:{SECRET:{name:'不該出現'},SHOWN:{name:'公開的牌'}}},
  {cards:{SECRET:{name:'不該出現'},SHOWN:{name:'公開的牌'}}}];
 const state={
  pending:{player:0,kind:'kmr',step:'oppTop',data:{uid:'1-top',owner:1}},
  publicReveals:[{kind:'deck-top',owner:1,cardId:'SHOWN',uid:'1-top',turn:1}],
  players:[
   {hand:[],front:[],energy:[],outside:[],removed:[],life:[],deck:[]},
   {hand:[{uid:'1-hand',cardId:'SECRET'}],front:[],energy:[],outside:[],removed:[],
    life:[{uid:'1-life',cardId:'SECRET'}],
    deck:[{uid:'1-top',cardId:'SECRET'},{uid:'1-next',cardId:'SECRET'}]}
  ]
 };
 const art=controllerChoiceArt(packsArt,state,{type:'kmr',mode:'top'});
 assert.equal(art.length,1);
 assert.equal(art[0].cardId,'SHOWN');
 assert.equal(art[0].name,'公開的牌');
 assert.equal(JSON.stringify(art).includes('SECRET'),false);
 const hidden={...state,publicReveals:[]};
 assert.deepEqual(controllerChoiceArt(packsArt,hidden,{type:'kmr',mode:'outside'}),[]);
 assert.deepEqual(controllerChoiceArt(packsArt,state,{uid:'1-top'}),[]);
});

test('new closed-title choices stay in Chinese and Muse shows its printed effect',()=>{
 assert.equal(uiActionLabel({type:'kmr2',mode:'skip'}),'不發動');
 assert.equal(uiActionLabel({type:'kmr2',mode:'take',uid:null}),'將這張卡加入手牌');
 assert.equal(uiActionLabel({type:'brandNew',mode:'english'}),'完成這個選擇');
 assert.equal(uiActionLabel({type:'brandNew',mode:'english'}).includes('brandNew'),false);
 const muse=KMR_CARDS.find(card=>card.id==='KMR-1-113');
 const text=fieldEffectCopy(muse);
 assert.match(text,/登場時/);
 assert.match(text,/對方是自身的山札|對手/);
 assert.match(text,/官方原文：\n【登場時】相手は自身の山札の上から1枚を公開する/);
 assert.match(text,/觸發效果/);
 assert.equal(text.includes('沒有可顯示的效果'),false);
 assert.equal(fieldEffectCopy({effect:'-',effectJa:'【登場時】公開。'}),'【登場時】公開。');
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/kmr:printedCatalogueMap\(KMR_CARDS\)/);
 assert.match(preview,/draw:'抽卡',get:'獲得',active:'活動',special:'特殊',color:'顏色',raid:'突襲',final:'最終'/);
 assert.doesNotMatch(preview,/draw:'DRAW'/);
 assert.match(preview,/catalogue\?\.name\|\|printed\?\.name/);
 assert.match(preview,/printed\?\.printings\?\.\[0\]\?\.image/);
 const builder=readFileSync(new URL('../dist/visual-deck-builder.mjs',import.meta.url),'utf8');
 assert.match(builder,/color:'顏色',special:'特殊',final:'最終'/);
 assert.doesNotMatch(builder,/color:'COLOR'/);
});
