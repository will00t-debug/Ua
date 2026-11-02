import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as sharedBattleUi from '../dist/universal-v2/online-battle-ui.mjs';
import {FakeNode,texts} from './helpers/online-client-dom.mjs';

const source=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');

test('production account frontend compiles as JavaScript (catches missing comma that caused blank login)',()=>{
 assert.doesNotThrow(()=>new vm.Script(source,{filename:'dist/online.mjs'}));
 const html=readFileSync(new URL('../dist/online.html',import.meta.url),'utf8');
 assert.match(html,/id="app"/);
 assert.match(html,/src="online-bootstrap\.mjs"/);
});

test('a failed battlefield import shows a retry screen without reopening the old online UI',async()=>{
 const appRoot=new FakeNode('div');
 const document={createElement:tag=>new FakeNode(tag),createTextNode:text=>new FakeNode('#text',String(text)),
  querySelector:selector=>selector==='#app'?appRoot:null};
 const context=vm.createContext({document,Node:FakeNode,
  fetch:async path=>({ok:path==='/api/health',status:path==='/api/health'?200:401,json:async()=>path==='/api/health'?{ok:true}:{error:'需要登入'}}),
  clearInterval(){},setInterval(){},location:{hash:''},history:{replaceState(){}},
  localStorage:{getItem(){return null;}},sessionStorage:{setItem(){}},navigator:{},
  window:{location:{assign(){}}},confirm(){return false},setTimeout,clearTimeout,console});
 new vm.Script(source,{filename:'dist/online.mjs'}).runInContext(context);
 for(let i=0;i<30&&!appRoot.children.length;i++)await new Promise(resolve=>setImmediate(resolve));
 vm.runInContext("app.offline=false;app.user={username:'player'};app.room={code:'ABCD2345',status:'playing',seat:0,view:{phase:'main'}};render();",context);
 assert.match(texts(appRoot),/正在載入對戰介面/);
 for(let i=0;i<30&&!texts(appRoot).includes('對戰介面載入失敗');i++)await new Promise(resolve=>setImmediate(resolve));
 assert.match(texts(appRoot),/對戰介面載入失敗/);
 assert.match(texts(appRoot),/重新載入對戰介面/);
 assert.equal(appRoot.querySelectorAll('.online-table').length,0);
 assert.equal(vm.runInContext('app.room.code',context),'ABCD2345','the live room is preserved while loading fails');
});

test('a deployment changing during startup reloads the same page before account or room actions',async()=>{
 const appRoot=new FakeNode('div'),requests=[];let reloads=0;
 const document={createElement:tag=>new FakeNode(tag),createTextNode:text=>new FakeNode('#text',String(text)),
  querySelector:selector=>selector==='#app'?appRoot:null};
 const context=vm.createContext({document,Node:FakeNode,onlineClientBuild:'ABCDEFGH',
  fetch:async path=>{requests.push(path);return {ok:true,status:200,json:async()=>({ok:true,uiVersion:'IJKLMNOP',uiScript:'/online-client-IJKLMNOP.mjs'})};},
  clearInterval(){},setInterval(){},location:{hash:'#ABCD2345'},history:{replaceState(){}},
  localStorage:{getItem(){return null;}},sessionStorage:{setItem(){}},navigator:{},
  window:{location:{reload(){reloads++;}}},setTimeout,clearTimeout,console});
 new vm.Script(source,{filename:'dist/online.mjs'}).runInContext(context);
 for(let i=0;i<30&&!reloads;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(reloads,1);assert.deepEqual(requests,['/api/health']);
 assert.equal(context.location.hash,'#ABCD2345');
});

test('Cloudflare /online.html login boot produces actual inputs, registration switch and account dashboard',async()=>{
 const appRoot=new FakeNode('div');
 const document={
  createElement:tag=>new FakeNode(tag),
  createTextNode:text=>new FakeNode('#text',String(text)),
  querySelector:selector=>selector==='#app'?appRoot:null
 };
 const requests=[];
 const fetch=async(path)=>{
  requests.push(path);
  if(path==='/api/health')return {ok:true,status:200,json:async()=>({ok:true})};
  if(path==='/api/me')return {ok:false,status:401,json:async()=>({error:'需要登入'})};
  return {ok:false,status:404,json:async()=>({error:'not found'})};
 };
 const context=vm.createContext({
  document,Node:FakeNode,fetch,clearInterval(){},setInterval(){},
  location:{hash:''},history:{replaceState(){}},
  localStorage:{getItem(){return null;}},sessionStorage:{setItem(){}},
  navigator:{},window:{location:{assign(){}}},
  confirm(){return false},setTimeout,clearTimeout,console
 });
 new vm.Script(source,{filename:'dist/online.mjs'}).runInContext(context);
 // boot() fetches health then session, the unauthorized response must still
 // render the authentication form rather than leave an empty #app container.
 for(let i=0;i<30&&!appRoot.children.length;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.ok(appRoot.children.length>0,'Login page is blank after /api/me returns 401');
 assert.match(texts(appRoot),/登入/);
 assert.ok(requests.includes('/api/health'));
 assert.ok(requests.includes('/api/me'));
 let fields=[];
 function visit(n){
  if(!(n instanceof FakeNode))return;
  if(n.tag==='input')fields.push(n.attributes.name);
  for(const child of n.children)visit(child);
 }
 visit(appRoot);
 assert.ok(fields.includes('username'),'Missing username input');
 assert.ok(fields.includes('password'),'Missing password input');
 vm.runInContext("app.mode='register';render();",context);
 assert.match(texts(appRoot),/註冊並登入/);
 vm.runInContext("app.mode='login';app.user={username:'test_owner'};app.decks=[];render();",context);
 assert.match(texts(appRoot),/test_owner/);
 assert.match(texts(appRoot),/牌組構築/);
 assert.match(texts(appRoot),/單人對戰/);
 assert.match(texts(appRoot),/線上對戰/);
 vm.runInContext("app.openRooms=[{code:'G7MC92Y3',status:'playing',role:'host'},{code:'HUJAU4DC',status:'waiting',role:'host'},{code:'ABCD2345',status:'playing',role:'guest'},{code:'WXYZ6789',status:'playing',role:'host'}];app.error='你已經有 3 個未結束的房間。';render();",context);
 assert.match(texts(appRoot),/還沒結束的房間/);
 assert.match(texts(appRoot),/G7MC92Y3/);
 assert.match(texts(appRoot),/對戰中/);
 assert.match(texts(appRoot),/等待加入/);
 assert.match(texts(appRoot),/你是訪客/);
 assert.match(texts(appRoot),/關閉最舊的對戰並建立/);
 assert.match(texts(appRoot),/你已經有 3 個未結束的房間。/);
 let alertParent='';
 function findAlert(node,parentId=''){
  if(!(node instanceof FakeNode))return;
  const id=node.attributes?.id||parentId;
  if(node.attributes?.id==='room-alert')alertParent=parentId;
  for(const child of node.children)findAlert(child,node.attributes?.id==='online-match'?'online-match':id);
 }
 findAlert(appRoot);
 assert.equal(alertParent,'online-match');
});

test('entering an online room uses the shared AI table, opening hand, and mulligan choices',()=>{
 const appRoot=new FakeNode('div');
 const document={
  createElement:tag=>new FakeNode(tag),
  createTextNode:text=>new FakeNode('#text',String(text)),
  querySelector:selector=>selector==='#app'?appRoot:null
 };
 const context=vm.createContext({
  sharedBattleUi,
  document,Node:FakeNode,fetch:async()=>{throw new Error('offline');},
  clearInterval(){},setInterval(){},
  location:{hash:''},history:{replaceState(){}},
  localStorage:{getItem(){return null;}},sessionStorage:{setItem(){}},
  navigator:{},window:{location:{assign(){}}},
  confirm(){return false},setTimeout,clearTimeout,console
 });
 new vm.Script(source,{filename:'dist/online.mjs'}).runInContext(context);
 const empty=()=>[null,null,null,null];
 const hand=Array.from({length:7},(_,i)=>({uid:'h'+i,cardId:'BLC-1-00'+(i+1),name:'測試卡'+(i+1),color:'blue'}));
 context.roomFixture={
  code:'G7MC92Y3',status:'playing',revision:1,seat:0,yourTurn:true,youAreFirst:true,
  you:{username:'32928748',titleLabel:'BLEACH'},
  opponent:{username:'night0307',titleLabel:'BLEACH'},
  choices:[{index:0,label:'保留這 7 張手牌'},{index:1,label:'整手重抽 7 張（僅一次）'}],
  log:[{text:'對局開始'}],
  view:{phase:'setup',openTriggers:[],players:[
   {lifeCount:0,deckCount:43,handCount:7,hand,front:empty(),energy:empty(),apReady:0,apTotal:0,energyTotal:0,outside:[],removed:[]},
   {lifeCount:0,deckCount:43,handCount:7,hand:null,front:empty(),energy:[{uid:'e1',cardId:'BLC-1-010',name:'能量角色',color:'green',ready:true,bp:4000},null,null,null],apReady:0,apTotal:0,energyTotal:0,outside:[],removed:[]}
  ]}
 };
 context.artFixture={titles:[{id:'bleach',cards:[
  {id:'BLC-1-001',image:'https://example.test/ichigo.png',aliases:['UA08ST/BLC-1-001']},
  {id:'BLC-1-010',image:'https://example.test/energy.png'},
  {id:'064',number:'UA08ST/BLC-1-064',image:'https://example.test/event.png'}
 ]}]};
 vm.runInContext("battleUi=sharedBattleUi;coverCatalogue=artFixture;artById=null;app.offline=false;app.user={username:'32928748'};app.room=roomFixture;render();",context);
 assert.equal(vm.runInContext("cardSrc({cardId:'BLC-1-064'})",context),'https://example.test/event.png',
  'engine canonical IDs must resolve legacy catalogue artwork');
 const rendered=texts(appRoot);
 assert.match(rendered,/房間 G7MC92Y3/);
 assert.match(rendered,/你的手牌/);
 assert.match(rendered,/測試卡1/);
 assert.match(rendered,/測試卡7/);
 assert.match(rendered,/保留這 7 張手牌/);
 assert.match(rendered,/整手重抽 7 張/);
 assert.match(rendered,/開局可選擇保留 7 張/);
 assert.equal(context.roomFixture.view.players[1].hand,null);
 assert.match(rendered,/LIFE/);
 const classes=[];
 const images=[];
 const labels=[];
 function visit(node){
  if(!(node instanceof FakeNode))return;
  if(node.className)classes.push(node.className);
  if(node.attributes['aria-label'])labels.push(node.attributes['aria-label']);
  if(node.tag==='img')images.push(node.attributes.src);
  for(const child of node.children)visit(child);
 }
 visit(appRoot);
 assert.deepEqual(images.filter(src=>src!=='assets/mark.svg').sort(),['https://example.test/energy.png','https://example.test/ichigo.png']);
 const has=name=>classes.some(value=>value.split(/\s+/).includes(name));
 assert.ok(has('online-battle-shell'));
 assert.ok(has('arena'));
 assert.ok(has('handArea'));
 assert.equal(has('online-table'),false,'the legacy table must not be presented');
 assert.equal(classes.filter(name=>name.split(/\s+/).includes('empty')).length,15,'own lines are empty and the opponent has one occupied energy card');
 assert.ok(labels.some(label=>label.includes('能量角色')),'field artwork keeps its accessible card name');
 assert.ok(classes.some(name=>name.split(/\s+/).includes('occupied')&&name.split(/\s+/).includes('slot')));
 vm.runInContext(`roomFixture.view.phase='attack';roomFixture.choices=[
  {index:0,type:'next',label:'前進下一階段'},
  {index:1,type:'attack',uid:'h0',label:'宣告攻擊：測試卡1'},
  {index:2,type:'attack',uid:'e9',label:'宣告攻擊：能源角色'}
 ];app.pick=null;render();`,context);
 const attackText=texts(appRoot);
 assert.match(attackText,/結束回合/);
 assert.match(attackText,/點自己可攻擊的角色/);
 assert.doesNotMatch(attackText,/宣告攻擊：測試卡1/);
 assert.doesNotMatch(attackText,/宣告攻擊：能源角色/);
 vm.runInContext("app.pick={uid:'h0',baseUid:null,options:null};render();",context);
 const picked=texts(appRoot);
 assert.match(picked,/宣告攻擊：測試卡1/);
 assert.doesNotMatch(picked,/宣告攻擊：能源角色/);
 classes.length=0;
 visit(appRoot);
 assert.equal(classes.filter(name=>name.split(/\s+/).includes('empty')).length,15,'selecting an attacker does not turn empty slots into destinations');
 assert.ok(classes.some(name=>name.includes('selected')));
 // The real online room renders every authorized private inspection card, but
 // only the actual legal choice indices may be clicked.
 vm.runInContext(`roomFixture.view.phase='main';roomFixture.choices=[
  {index:0,type:'chooseDeckSearch',label:'選第一張'},
  {index:1,type:'chooseDeckSearch',label:'選第二個位置'},
  {index:2,type:'next',label:'下一階段'}
 ];roomFixture.inspection={kind:'effect-search-deck',cards:[
  {uid:'mine-0',cardId:'BLC-1-001',name:'符合條件的角色',actions:[
   {index:0,label:'以第一種方式選擇'},{index:1,label:'以第二種方式選擇'}]},
  {uid:'mine-1',cardId:'BLC-1-010',name:'不符合條件的角色',actions:[]}
 ]};app.pick=null;app.inspectPick=null;render();`,context);
 const found=[];
 function walk(node){
  if(!(node instanceof FakeNode))return;
  if(node.className?.includes('online-inspection-card'))found.push(node);
  for(const child of node.children)walk(child);
 }
 walk(appRoot);
 assert.equal(found.length,2);
 assert.equal(found[0].disabled,false);
 assert.equal(found[1].disabled,true,'nonmatching card must not dispatch anything');
 assert.equal(found[1].handlers.click,undefined);
 assert.match(texts(appRoot),/不符合條件 · 無法選擇/);
 assert.ok(!texts(appRoot).includes('以第一種方式選擇'),'multiple choices are initially collapsed');
 vm.runInContext("app.inspectPick='mine-0';render();",context);
 assert.match(texts(appRoot),/以第一種方式選擇/);
 assert.match(texts(appRoot),/以第二種方式選擇/);
 // No actor privileges -> neither inspected card may be present at all.
 vm.runInContext("roomFixture.yourTurn=false;app.inspectPick=null;render();",context);
 assert.doesNotMatch(texts(appRoot),/符合條件的角色|不符合條件的角色/);
});
