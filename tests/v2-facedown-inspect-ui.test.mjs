import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {listFacedownUnder,facedownInspectModel,facedownPlaceText,facedownGallery,
 createFacedownBadge,eventHitsFacedownBadge,findKnownLayer,facedownInspectorNote}
 from '../dist/universal-v2/facedown-inspect.mjs';
import {FakeNode,texts} from './helpers/online-client-dom.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function el(tag,props={},...children){
 const node=new FakeNode(tag);
 for(const [key,value] of Object.entries(props||{})){
  if(value==null)continue;
  if(key==='text')node.textContent=String(value);
  else if(key==='class')node.className=value;
  else node.setAttribute(key,String(value));
 }
 for(const child of children.flat()){
  if(child==null||child===false)continue;
  node.append(child instanceof FakeNode?child:new FakeNode('#text',String(child)));
 }
 return node;
}
function sample(){
 return {
  cardId:'TOP',uid:'top',faceDown:false,
  under:[
   {faceDown:true,cardId:'A',uid:'ua',name:'甲'},
   {faceDown:false,cardId:'B',uid:'ub',name:'乙',under:[
    {faceDown:true,cardId:'C',uid:'uc',name:'丙'}
   ]},
   {faceDown:true,cardId:'D',uid:'ud'}
  ],
  stack:[{faceDown:false,cardId:'BASE',uid:'base',name:'底座',under:[
   {faceDown:true,cardId:'OLD',uid:'old',name:'舊頂'}
  ]}]
 };
}

test('face-down undercards keep bottom-up order and skip hidden children',()=>{
 const card=sample();
 const secret='SECRET-NAME-XYZ',nested='NESTED-ID-XYZ',secretUid='SECRET-UID-XYZ';
 card.under.push({faceDown:true,name:secret,uid:secretUid,cardId:'',under:[
  {faceDown:true,cardId:nested,uid:secretUid,name:secret}
 ]});
 const before=structuredClone(card);
 const listed=listFacedownUnder(card);
 assert.deepEqual(card,before);
 assert.deepEqual(listed.map(entry=>entry.cardId||entry.hidden),[
  'A','C','D',true,'OLD'
 ]);
 assert.equal(listed.some(entry=>entry.cardId==='TOP'||entry.cardId==='B'||entry.cardId==='BASE'),false);
 assert.deepEqual(listed[0],{hidden:false,cardId:'A',uid:'ua',name:'甲',relation:'direct',order:1});
 assert.deepEqual(listed[1],{hidden:false,cardId:'C',uid:'uc',name:'丙',relation:'buried',order:1,hostCardId:'B'});
 assert.equal(listed[2].relation,'direct');
 assert.equal(listed[2].order,2);
 const old=listed.find(entry=>entry.cardId==='OLD');
 assert.equal(old.hostCardId,'BASE');
 assert.equal(old.relation,'buried');
 const hidden=listed.find(entry=>entry.hidden);
 assert.deepEqual(Object.keys(hidden).sort(),['hidden','order','relation']);
 assert.equal(JSON.stringify(listed).includes(secret),false);
 assert.equal(JSON.stringify(listed).includes(nested),false);
 assert.equal(JSON.stringify(listed).includes(secretUid),false);
 assert.equal(findKnownLayer(card,'uc')?.cardId,'C');
 assert.equal(findKnownLayer(card,secretUid),null);
 assert.equal(facedownPlaceText({relation:'direct',order:1}),'這張角色正下方，由下往上第 1 張');
 assert.equal(facedownPlaceText({relation:'buried',order:2,hostCardId:'RAW-ID'},id=>id).includes('RAW-ID'),false);
 assert.match(facedownPlaceText({relation:'buried',order:1,hostCardId:'BASE'},()=>'底座'),/在「底座」底下/);
 const note=facedownInspectorNote(facedownInspectModel({under:[
  {faceDown:true,name:secret,uid:secretUid}
 ]}),()=>'');
 assert.match(note.lines[0],/^卡背朝上/);
 assert.equal(note.lines[0].includes(secret),false);
});

test('the gallery shows owned card faces and only a back for a hidden marker',()=>{
 const model=facedownInspectModel({
  under:[
   {faceDown:true,cardId:'A',uid:'ua',name:'甲'},
   {faceDown:true,name:'SECRET-NAME-XYZ',uid:'SECRET-UID-XYZ',cardId:'',under:[
    {faceDown:true,cardId:'NESTED-ID-XYZ'}
   ]}
  ]
 });
 const called=[];
 const gallery=facedownGallery(el,model,{
  nameOf:id=>{called.push('name:'+id);return id==='A'?'甲':id;},
  imageOf:id=>{called.push('image:'+id);return 'cards/a.png';},
  effectOf:id=>{called.push('effect:'+id);return '效果甲';},
  onInspect:entry=>called.push('open:'+entry.cardId)
 });
 const shown=texts(gallery);
 assert.match(shown,/甲/);
 assert.match(shown,/卡背朝上/);
 assert.match(shown,/效果甲/);
 assert.equal(shown.includes('SECRET-NAME-XYZ'),false);
 assert.equal(shown.includes('NESTED-ID-XYZ'),false);
 assert.equal(shown.includes('SECRET-UID-XYZ'),false);
 assert.deepEqual(called,['image:A','effect:A']);
 assert.equal(gallery.querySelectorAll('img').length,1);
 assert.equal(gallery.querySelector('[data-facedown-hidden]')?.getAttribute('data-facedown-hidden'),'true');
 const button=gallery.querySelector('[data-facedown-card]');
 assert.equal(button.getAttribute('data-facedown-card'),'A');
 button.handlers.click({preventDefault(){},stopPropagation(){}});
 assert.deepEqual(called.at(-1),'open:A');
 let opened=0,stopped=0;
 const badge=createFacedownBadge(el,facedownInspectModel({under:[{faceDown:true,cardId:'A',uid:'ua'}]}),()=>opened++);
 badge.handlers.pointerdown({stopPropagation(){stopped++;}});
 badge.handlers.click({preventDefault(){},stopPropagation(){stopped++;}});
 assert.equal(opened,1);
 assert.equal(stopped,2);
 assert.equal(eventHitsFacedownBadge({target:{}}),false);
 assert.equal(eventHitsFacedownBadge({target:{closest(){return null}}}),false);
 assert.equal(eventHitsFacedownBadge({target:{closest:sel=>sel==='.slotFacedown'?{}:null},clientX:0,clientY:0}),true);
 const rect={left:10,right:40,top:20,bottom:36};
 const slot={querySelector:sel=>sel==='.slotFacedown'?{getBoundingClientRect:()=>rect}:null};
 const target={closest:sel=>sel==='.slot'?slot:null};
 assert.equal(eventHitsFacedownBadge({target,clientX:12,clientY:22}),true);
 assert.equal(eventHitsFacedownBadge({target,clientX:0,clientY:0}),false);
});

test('Q2316 public view lets the owner read undercards and gives the opponent only backs',()=>{
 const cards=Array.from({length:13},(_,i)=>({id:'FD'+i,name:'裏向'+i,
  color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla'}));
 const packs=[createUniversalPack({id:'facedown-a',cards}),createUniversalPack({id:'facedown-b',cards})];
 const deck=Object.fromEntries(cards.map((card,index)=>[card.id,index===12?2:4]));
 const owner=0,state=newUniversalMatch(packs,{decks:[deck,deck],seed:2616,first:0});
 const player=state.players[owner];
 const take=()=>player.deck.splice(0,1)[0];
 const root=take(),direct=take(),base=take(),buried=take();
 direct.faceDown=true;direct.ready=false;
 buried.faceDown=true;buried.ready=false;
 base.faceDown=false;base.ready=false;base.under=[buried];
 root.ready=true;root.fieldEntryStamp=state.nextFieldEntryStamp++;
 root.under=[direct];root.stack=[base];
 player.front[0]=root;
 assert.equal(assertUniversalMatch(packs,state),true);
 const own=universalPublicView(packs,state,owner).players[owner].front[0];
 const foe=universalPublicView(packs,state,1).players[owner].front[0];
 const ownModel=facedownInspectModel(own);
 const foeModel=facedownInspectModel(foe);
 assert.deepEqual(ownModel.cards.map(entry=>entry.cardId),[direct.cardId,buried.cardId]);
 assert.equal(ownModel.private,true);
 assert.equal(ownModel.cards[0].relation,'direct');
 assert.equal(ownModel.cards[1].relation,'buried');
 assert.equal(ownModel.cards[1].hostCardId,base.cardId);
 assert.equal(foeModel.cards.every(entry=>entry.hidden),true);
 assert.equal(foeModel.private,false);
 const foeJson=JSON.stringify(foeModel);
 for(const secret of [direct.cardId,buried.cardId,direct.uid,buried.uid])
  assert.equal(foeJson.includes(secret),false,secret);
 const looked=[];
 const gallery=facedownGallery(el,foeModel,{
  nameOf:id=>{
   if(id===direct.cardId||id===buried.cardId)throw new Error('hidden name '+id);
   looked.push(id);
   return '公開底座';
  },
  imageOf:id=>{throw new Error('hidden image '+id);},
  effectOf:id=>{throw new Error('hidden effect '+id);}
 });
 const shown=texts(gallery);
 assert.match(shown,/卡背朝上/);
 assert.match(shown,/公開底座/);
 assert.deepEqual(looked,[base.cardId]);
 assert.equal(shown.includes(direct.cardId),false);
 assert.equal(shown.includes(buried.cardId),false);
 assert.equal(shown.includes(base.cardId),false);
 assert.equal(gallery.querySelectorAll('[data-facedown-card]').length,0);
 assert.equal(gallery.querySelectorAll('[data-facedown-hidden]').length,2);
});

test('battle surfaces open the facedown sheet from the public card and leave online.mjs import-free',()=>{
 const preview=read('dist/universal-v2-preview.mjs');
 const slot=preview.split('function legacySlot(')[1].split('function legacyLine(')[0];
 assert.match(slot,/if\(event\.button>0\|\|eventHitsFacedownBadge\(event\)\)return/);
 const slotClick=slot.split("addEventListener('click'")[1];
 assert.ok(slotClick.indexOf('eventHitsFacedownBadge')<slotClick.indexOf('applyAction'));
 assert.match(slotClick,/openFacedownSheet\(side,c\)/);
 const sheet=preview.split('function showFieldSheet(')[1].split('function closeZoneSheet(')[0];
 assert.match(sheet,/if\(facedownSection\)dialog\.append\(facedownSection\)/);
 const onlineUi=read('dist/universal-v2/online-battle-ui.mjs');
 const onlineSheet=onlineUi.split('export function showOnlineCard(')[1].split('export function renderOnlineBattle(')[0];
 assert.match(onlineSheet,/if\(facedownSection\)dialog\.append\(facedownSection\)/);
 const inspect=onlineUi.split('export function bindOnlineCardInspect')[1]
  .split('export function onlineBattleCard')[0];
 const onlineClick=inspect.split("addEventListener('click'")[1];
 assert.ok(onlineClick.indexOf('eventHitsFacedownBadge')<onlineClick.indexOf('activate()'));
 const online=read('dist/online.mjs');
 assert.equal(online.includes('facedown-inspect'),false);
 assert.match(online,/onFacedown:card\?\(\)=>openOnlineFacedown\(card\)/);
 assert.match(online,/restoreOnlineFacedown/);
 assert.doesNotMatch(online,/^import /m);
 const desktop=read('dist/universal-v2/desktop-battle-ui.mjs');
 assert.match(desktop,/facedownInspectorNote/);
 assert.doesNotMatch(desktop,/state\.players/);
 const coach=read('dist/universal-v2/coach-review.mjs');
 assert.match(coach,/eventHitsFacedownBadge\(event\)/);
 assert.match(coach,/closeFacedownOverlays\(\)/);
});
