import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {controllerChoiceArt,controllerDeckWindowCards,fieldEffectCopy,inspectedPendingChoiceCards,
 pendingFocusCard,pendingTextChoiceClass,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

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
 const focus=pendingFocusCard(packs,played);
 assert.equal(focus?.cardId,top.cardId);
 assert.equal(focus?.side,1);
 assert.equal(focus?.zone,'對手牌組頂');
 assert.equal(focus?.uid,top.uid);
 assert.notEqual(focus?.uid,hidden.uid);
 const printedTop=KMR_CARDS.find(card=>card.id===top.cardId);
 const effect=fieldEffectCopy(printedTop);
 assert.equal(effect.includes('沒有可顯示的效果'),false);
 assert.match(effect,/\S/);
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
 const fallen=controllerChoiceArt(packsArt,hidden,{type:'kmr',mode:'outside'});
 assert.equal(fallen.length,1);
 assert.equal(fallen[0].uid,'1-top');
 assert.equal(fallen[0].cardId,'SECRET');
 assert.equal(JSON.stringify(fallen).includes('1-next'),false);
 assert.equal(JSON.stringify(fallen).includes('1-hand'),false);
 assert.equal(JSON.stringify(fallen).includes('1-life'),false);
 const fallenFocus=pendingFocusCard(packsArt,hidden);
 assert.equal(fallenFocus?.uid,'1-top');
 assert.equal(fallenFocus?.zone,'對手牌組頂');
 assert.equal(JSON.stringify(fallenFocus).includes('1-next'),false);
 assert.deepEqual(controllerChoiceArt(packsArt,state,{uid:'1-top'}),[]);
 const beneath={...hidden,players:hidden.players.map((player,index)=>index===1?
  {...player,deck:[{uid:'1-other',cardId:'SECRET'},{uid:'1-top',cardId:'SECRET'}]}:player)};
 assert.deepEqual(controllerChoiceArt(packsArt,beneath,{type:'kmr',mode:'top'}),[]);
 assert.equal(pendingFocusCard(packsArt,{...hidden,pending:{...hidden.pending,player:1}}),null);
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
 assert.match(preview,/kmr:printedCatalogueMap\(\[\.\.\.KMR_CARDS,\.\.\.KMR2_CARDS,\.\.\.KMR_PR_CARDS,\.\.\.KMR_POINT_CARDS\]\)/);
 assert.match(preview,/draw:'抽卡',get:'獲得',active:'活動',special:'特殊',color:'顏色',raid:'突襲',final:'最終'/);
 assert.doesNotMatch(preview,/draw:'DRAW'/);
 assert.match(preview,/catalogue\?\.name\|\|printed\?\.name/);
 assert.match(preview,/printed\?\.printings\?\.\[0\]\?\.image/);
 assert.match(preview,/pendingFocusCard\(app\.packs,s\)/);
 assert.match(preview,/class:'v2-reveal-focus'/);
 assert.match(preview,/class:'v2-reveal-effect',text:effect/);
 assert.match(preview,/revealFocusSheet\(focus\)/);
 const builder=readFileSync(new URL('../dist/visual-deck-builder.mjs',import.meta.url),'utf8');
 assert.match(builder,/color:'顏色',special:'特殊',final:'最終'/);
 assert.doesNotMatch(builder,/color:'COLOR'/);
});

test('search, top look, and mill windows show cards that cannot be chosen',()=>{
 const s=fresh(countsFor(['KMR-1-001','KMR-1-095']));
 const top=s.players[0].deck.slice(0,5);
 s.pending={kind:'kmr',player:0,sourceUid:top[0].uid,id:'KMR-1-095',step:'lookPick',
  data:{uids:top.map(c=>c.uid),hits:[top[0].uid,top[1].uid],taken:[],max:1,min:0},
  actions:[{type:'kmr',mode:'done'},
   {type:'kmr',mode:'take',uid:top[0].uid},{type:'kmr',mode:'take',uid:top[1].uid}]};
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),top.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>!!c.action),[true,true,false,false,false]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const deckView=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(deckView.map(c=>c.uid),top.map(c=>c.uid));
 assert.equal(deckView[2].action,null);
 assert.equal(deckView[2].caption,'目前不能選');

 s.pending={kind:'kjn',player:0,sourceUid:top[0].uid,id:'KJN-1-001',step:'lookPick',
  data:{window:top.map(c=>c.uid)},
  actions:[{type:'kjn',mode:'done'},{type:'kjn',mode:'take',uid:top[4].uid}]};
 const kjn=universalPrivateChoices(packs,s,0);
 assert.deepEqual(kjn.inspected.map(c=>c.uid),top.map(c=>c.uid));
 const kjnShown=inspectedPendingChoiceCards(kjn,kjn.options.map(option=>option.action));
 assert.equal(kjnShown.filter(card=>card.action).map(card=>card.uid).join(','),top[4].uid);

 const milled=s.players[0].deck.slice(0,10);
 s.pending={kind:'kmr',player:0,sourceUid:milled[0].uid,id:'KMR-1-001',step:'mill',
  data:{uids:milled.map(c=>c.uid)},
  actions:[{type:'kmr',mode:'skip'},{type:'kmr',mode:'mill'}]};
 const mill=universalPrivateChoices(packs,s,0);
 assert.equal(mill.inspected.length,10);
 const millShown=inspectedPendingChoiceCards(mill,mill.options.map(option=>option.action));
 assert.equal(millShown.length,10);
 assert.equal(millShown.every(card=>card.action===null),true);

 const futureShown=inspectedPendingChoiceCards({kind:'kmr2',inspected:top.slice(0,3).map(card=>({
  uid:card.uid,cardId:card.cardId,name:card.cardId}))},
  [{type:'kmr2',mode:'done'},{type:'kmr2',mode:'take',uid:top[0].uid}]);
 assert.deepEqual(futureShown.map(card=>!!card.action),[true,false,false]);

 s.pending={kind:'aot',player:0,sourceUid:top[0].uid,id:'AOT-1-077',step:'fork77',
  data:{uids:['0-not-in-deck']},actions:[{type:'aot',mode:'range'}]};
 assert.equal(universalPrivateChoices(packs,s,0).inspected,undefined);
});
