import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {boardEntryMode,boardEntrySelection,entryClickPlan} from '../dist/universal-v2/preview-actions.mjs';

const legal=[
 {type:'play',uid:'hand',line:'front',slot:3},
 {type:'play',uid:'hand',line:'energy',slot:0,replaceUid:'energy-full'},
 {type:'raid',uid:'hand',baseUid:'front-base',slot:0},
 {type:'raid',uid:'hand',baseUid:'energy-a',slot:1},
 {type:'raid',uid:'hand',baseUid:'energy-b',slot:1},
 {type:'raid',uid:'hand',baseUid:'energy-a',line:'energy',slot:2},
 {type:'play',uid:'removed-card',from:'removed',line:'front',slot:2},
 {type:'choosePrintedRestRaid',mode:'enter',uid:'outside-card',line:'energy',slot:1},
 {type:'choosePrintedRestRaid',mode:'raid',uid:'outside-card',baseUid:'front-base',line:'front',slot:0},
 {type:'choosePrintedRestRaid',uid:null},
 {type:'chooseRemovedEnter',uid:'removed-card',line:'front',slot:2},
 {type:'chooseRemovedOkabeRaid',mode:'raid',uid:'okabe',baseUid:'front-base',line:'front',slot:0}
];

test('entry waits for the character, then the mode, then the cell',()=>{
 assert.equal(entryClickPlan({selectedUid:null,entryMode:null,line:'front',slot:3,
  slotUid:null,legal}).type,'idle');
 assert.equal(boardEntrySelection(legal,'hand').needsMode,true);
 assert.equal(entryClickPlan({selectedUid:'hand',entryMode:null,line:'front',slot:3,
  slotUid:null,legal}).type,'entry-mode');
 assert.deepEqual(entryClickPlan({selectedUid:'hand',entryMode:'normal',line:'front',slot:3,
  slotUid:null,legal}),{type:'entry',mode:'normal',actions:[legal[0]]});
 assert.equal(entryClickPlan({selectedUid:'hand',entryMode:'normal',line:'front',slot:0,
  slotUid:'front-base',legal}).type,'entry-wait');
 assert.deepEqual(entryClickPlan({selectedUid:'hand',entryMode:'raid',line:'front',slot:0,
  slotUid:'front-base',legal}),{type:'entry',mode:'raid',actions:[legal[2]]});
 const shared=entryClickPlan({selectedUid:'hand',entryMode:'raid',line:'front',slot:1,
  slotUid:null,legal});
 assert.equal(shared.type,'entry');
 assert.deepEqual(shared.actions.map(action=>action.baseUid),['energy-a','energy-b']);
 assert.deepEqual(entryClickPlan({selectedUid:'hand',entryMode:'raid',line:'energy',slot:2,
  slotUid:'energy-a',legal}).actions,[legal[5]]);
 assert.deepEqual(entryClickPlan({selectedUid:'hand',entryMode:'normal',line:'energy',slot:0,
  slotUid:'energy-full',legal}).actions,[legal[1]]);
});

test('outside and removed characters use the same cell click',()=>{
 assert.equal(boardEntryMode(legal[8]),'raid');
 assert.equal(boardEntryMode(legal[9]),null);
 assert.equal(boardEntrySelection(legal,'outside-card').needsMode,true);
 assert.deepEqual(entryClickPlan({selectedUid:'outside-card',entryMode:'normal',line:'energy',
  slot:1,slotUid:null,legal}).actions,[legal[7]]);
 assert.equal(boardEntrySelection(legal,'removed-card').needsMode,false);
 assert.deepEqual(entryClickPlan({selectedUid:'removed-card',entryMode:null,line:'front',
  slot:2,slotUid:null,legal}).actions,[legal[6],legal[10]]);
 assert.deepEqual(entryClickPlan({selectedUid:'okabe',entryMode:null,line:'front',slot:0,
  slotUid:'front-base',legal}).actions,[legal[11]]);
});

test('solo and online both ask for the character, then the mode, then the cell',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const preview=read('dist/universal-v2-preview.mjs');
 const online=read('dist/online.mjs');
 for(const source of [preview,online]){
  assert.match(source,/entryClickPlan\(/);
  assert.match(source,/普通進場/);
  assert.match(source,/突襲進場/);
  assert.match(source,/請直接點要登場的格子|請直接點要登場的格子/);
 }
 assert.match(preview,/先選擇要登場的角色/);
 assert.match(preview,/selectDeployedCharacter\(physical\.uid\)/);
 assert.match(online,/function clickZoneCard\(card\)/);
 assert.match(online,/移除區/);
 assert.match(read('dist/online.css'),/\.online-zones/);
});

test('online match offers raid or normal only after the hand character is selected',()=>{
 const source=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 class FakeNode{
  constructor(tag='',text=''){this.tag=tag;this.textContent=text;this.children=[];this.attributes={};this.handlers={};this.className='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,callback){this.handlers[name]=callback;}
 }
 const texts=node=>node instanceof FakeNode?node.textContent+' '+node.children.map(texts).join(' '):String(node??'');
 const classes=node=>{
  if(!(node instanceof FakeNode))return [];
  return [node.className,...node.children.flatMap(classes)];
 };
 const appRoot=new FakeNode('div');
 const document={
  createElement:tag=>new FakeNode(tag),
  createTextNode:text=>new FakeNode('#text',String(text)),
  querySelector:selector=>selector==='#app'?appRoot:null
 };
 const context=vm.createContext({
  document,Node:FakeNode,fetch:async()=>{throw new Error('offline');},
  clearInterval(){},setInterval(){},location:{hash:''},history:{replaceState(){}},
  localStorage:{getItem(){return null;}},sessionStorage:{setItem(){}},
  navigator:{},window:{location:{assign(){}}},confirm(){return false},
  setTimeout,clearTimeout,console
 });
 new vm.Script(source,{filename:'dist/online.mjs'}).runInContext(context);
 const empty=()=>[null,null,null,null];
 context.roomFixture={
  code:'ENTRY001',status:'playing',revision:2,seat:0,yourTurn:true,youAreFirst:true,
  you:{username:'yuwei',titleLabel:'BLEACH'},
  opponent:{username:'rival',titleLabel:'BLEACH'},
  choices:[
   {index:0,type:'play',uid:'hand',line:'front',slot:1,label:'普通登場'},
   {index:1,type:'raid',uid:'hand',baseUid:'base',slot:0,label:'突襲'},
   {index:2,type:'choosePrintedRestRaid',mode:'enter',uid:'out',line:'front',slot:1,label:'場外休息'},
   {index:3,type:'chooseRemovedEnter',uid:'gone',line:'energy',slot:0,label:'移除區登場'},
   {index:4,type:'next',label:'下一階段'}
  ],
  log:[],
  view:{phase:'main',openTriggers:[],players:[
   {lifeCount:7,deckCount:40,handCount:1,hand:[{uid:'hand',cardId:'H',name:'手牌角色',color:'blue'}],
    front:[{uid:'base',cardId:'B',name:'底板',color:'blue',ready:true},null,null,null],
    energy:empty(),apReady:1,apTotal:1,energyTotal:1,
    outside:[{uid:'out',cardId:'O',name:'場外角色',color:'green'}],
    removed:[{uid:'gone',cardId:'R',name:'移除角色',color:'red'}]},
   {lifeCount:7,deckCount:40,handCount:1,hand:null,front:empty(),energy:empty(),
    apReady:0,apTotal:0,energyTotal:0,outside:[],removed:[]}
  ]}
 };
 vm.runInContext("app.offline=false;app.user={username:'yuwei'};app.room=roomFixture;app.pick=null;render();",context);
 assert.match(texts(appRoot),/先選擇要登場的角色/);
 assert.doesNotMatch(texts(appRoot),/普通進場/);
 vm.runInContext("app.pick={uid:'hand',entryMode:null,options:null};render();",context);
 assert.match(texts(appRoot),/普通進場/);
 assert.match(texts(appRoot),/突襲進場/);
 assert.equal(classes(appRoot).some(name=>name.includes('destination')),false);
 vm.runInContext("app.pick={uid:'hand',entryMode:'raid',options:null};render();",context);
 assert.match(texts(appRoot),/請直接點要登場的格子/);
 assert.equal(classes(appRoot).some(name=>name.includes('destination')),true);
 vm.runInContext("app.zone='removed';render();",context);
 assert.match(texts(appRoot),/移除角色/);
});
