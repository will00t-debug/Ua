import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {lifeRaidStage,withLifeRaidBoard} from '../dist/universal-v2/life-raid-flow.mjs';
import {boardEntryMode,entryClickPlan} from '../dist/universal-v2/preview-actions.mjs';

const raw=[
 {type:'chooseTrigger',mode:'skip'},
 {type:'chooseTrigger',mode:'get'},
 {type:'chooseTrigger',mode:'raid',baseUid:'base',line:'front',slot:0},
 {type:'chooseTrigger',mode:'raid',baseUid:'base',line:'front',slot:1},
 {type:'chooseTrigger',mode:'raid',baseUid:'energy',line:'energy',slot:2},
 {type:'chooseTrigger',mode:'raid',baseUid:'energy',line:'front',slot:0}
];

test('a RAID life trigger asks to activate before raid or hand',()=>{
 assert.equal(lifeRaidStage({raid:false,actions:raw}),null);
 assert.equal(lifeRaidStage({raid:true,actions:raw}).phase,'activate');
 const mode=lifeRaidStage({raid:true,actions:raw,activated:true});
 assert.equal(mode.phase,'mode');
 assert.equal(mode.raids.length,4);
 assert.equal(mode.hand.mode,'get');
 assert.equal(lifeRaidStage({raid:true,actions:raw,activated:true,boarding:true}).phase,'board');
 assert.equal(lifeRaidStage({raid:true,actions:raw.filter(action=>action.mode==='raid')}).phase,'board');
 const handOnly=lifeRaidStage({raid:true,actions:raw.filter(action=>action.mode!=='raid'),activated:true});
 assert.equal(handOnly.phase,'mode');
 assert.equal(handOnly.raids.length,0);
});

test('choosing raid uses the base, then the destination cell',()=>{
 assert.equal(boardEntryMode(raw[2]),null);
 const legal=withLifeRaidBoard(raw,'life');
 assert.equal(boardEntryMode(legal[2]),'raid');
 assert.equal(legal[2].lifeRaidSource,raw[2]);
 assert.equal(entryClickPlan({selectedUid:'life',entryMode:'raid',line:'front',slot:0,
  slotUid:'base',legal}).type,'raid-base');
 assert.equal(entryClickPlan({selectedUid:'life',entryMode:'raid',raidBaseUid:'base',
  line:'front',slot:1,slotUid:null,legal}).actions[0].lifeRaidSource,raw[3]);
 assert.equal(entryClickPlan({selectedUid:'life',entryMode:'raid',line:'energy',slot:2,
  slotUid:'energy',legal}).type,'raid-base');
 const stay=entryClickPlan({selectedUid:'life',entryMode:'raid',raidBaseUid:'energy',
  line:'energy',slot:2,slotUid:'energy',legal});
 assert.equal(stay.actions[0].lifeRaidSource,raw[4]);
 const moved=entryClickPlan({selectedUid:'life',entryMode:'raid',raidBaseUid:'energy',
  line:'front',slot:0,slotUid:null,legal});
 assert.equal(moved.actions[0].lifeRaidSource,raw[5]);
 assert.equal(entryClickPlan({selectedUid:'life',entryMode:'raid',raidBaseUid:'base',
  line:'front',slot:3,slotUid:null,legal}).type,'entry-wait');
});

test('solo and online copy the three-step RAID life prompt',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const online=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 for(const source of [preview,online]){
  assert.match(source,/要發動這個突襲觸發嗎？/);
  assert.match(source,/選擇突襲登場，或是加入手牌。/);
  assert.match(source,/不發動/);
  assert.match(source,/lifeRaidBoard/);
 }
 assert.match(preview,/withLifeRaidBoard\(legal,key\)/);
 assert.match(online,/withLifeRaidBoard\(raw,card\.uid\)/);
});

test('online RAID life asks activate, then raid or hand, then the base',()=>{
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
 const buttons=node=>{
  if(!(node instanceof FakeNode))return [];
  return (node.tag==='button'?[node]:[]).concat(node.children.flatMap(buttons));
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
  code:'LIFERAID',status:'playing',revision:3,seat:0,yourTurn:true,youAreFirst:true,
  you:{username:'yuwei',titleLabel:'BLEACH'},
  opponent:{username:'rival',titleLabel:'BLEACH'},
  choices:[
   {index:0,type:'chooseTrigger',mode:'skip',label:'不使用此觸發'},
   {index:1,type:'chooseTrigger',mode:'get',label:'加入手牌'},
   {index:2,type:'chooseTrigger',mode:'raid',baseUid:'base',line:'front',slot:0,label:'使用 RAID 觸發 · 前線 1'},
   {index:3,type:'chooseTrigger',mode:'raid',baseUid:'base',line:'front',slot:1,label:'使用 RAID 觸發 · 前線 2'},
   {index:4,type:'chooseTrigger',mode:'raid',baseUid:'rear',line:'energy',slot:0,label:'使用 RAID 觸發 · 能源線 1'}
  ],
  log:[],
  view:{phase:'attack',pending:{kind:'life-trigger',player:0},openTriggers:[{
   owner:0,uid:'life',cardId:'BLC',name:'阿散井 恋次',trigger:'raid',checking:true
  }],players:[
   {lifeCount:4,deckCount:30,handCount:0,hand:[],
    front:[{uid:'base',cardId:'B',name:'底板',color:'purple',ready:true},null,null,null],
    energy:[{uid:'rear',cardId:'E',name:'後線底板',color:'purple',ready:true},null,null,null],
    apReady:0,apTotal:0,energyTotal:2,outside:[],removed:[]},
   {lifeCount:6,deckCount:30,handCount:5,hand:null,front:empty(),energy:empty(),
    apReady:1,apTotal:1,energyTotal:1,outside:[],removed:[]}
  ]}
 };
 vm.runInContext("app.offline=false;app.user={username:'yuwei'};app.lifeRaidActivated=false;app.lifeRaidBoard=false;app.pick=null;app.room=roomFixture;render();",context);
 const shown=()=>texts(appRoot);
 assert.match(shown(),/要發動這個突襲觸發嗎？/);
 assert.match(shown(),/發動/);
 assert.match(shown(),/不發動/);
 assert.doesNotMatch(shown(),/使用 RAID 觸發/);
 assert.doesNotMatch(shown(),/加入手牌/);
 const press=label=>buttons(appRoot).find(node=>node.textContent===label).handlers.click();
 press('發動');
 assert.match(shown(),/選擇突襲登場，或是加入手牌。/);
 assert.match(shown(),/突襲/);
 assert.match(shown(),/加入手牌/);
 assert.doesNotMatch(shown(),/使用 RAID 觸發/);
 press('突襲');
 assert.match(shown(),/突襲登場：先點底板，再點登場格子/);
 assert.equal(classes(appRoot).some(name=>name.includes('raid-base')),true);
 assert.equal(classes(appRoot).some(name=>name.includes('destination')),false);
 const base=buttons(appRoot).find(node=>String(node.attributes['aria-label']||'').includes('選為突襲底座'));
 assert.ok(base);
 base.handlers.click();
 assert.match(shown(),/已選好底板，請點登場格子/);
 assert.equal(classes(appRoot).some(name=>name.includes('destination')),true);
 press('返回');
 assert.match(shown(),/選擇突襲登場，或是加入手牌。/);
 assert.doesNotMatch(shown(),/使用 RAID 觸發/);
});
