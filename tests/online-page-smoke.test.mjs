import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');

class FakeNode{
 constructor(tag='',text=''){this.tag=tag;this.textContent=text;this.children=[];this.attributes={};this.handlers={};this.className='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(name,callback){this.handlers[name]=callback;}
}
function texts(node){
 if(!(node instanceof FakeNode))return String(node??'');
 return node.textContent+' '+node.children.map(texts).join(' ');
}

test('production account frontend compiles as JavaScript (catches missing comma that caused blank login)',()=>{
 assert.doesNotThrow(()=>new vm.Script(source,{filename:'dist/online.mjs'}));
 const html=readFileSync(new URL('../dist/online.html',import.meta.url),'utf8');
 assert.match(html,/id="app"/);
 assert.match(html,/online\.mjs\?v=/);
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

test('entering an online room shows a card-sized table, the opening hand, and the mulligan choices',()=>{
 const css=readFileSync(new URL('../dist/online.css',import.meta.url),'utf8');
 assert.match(css,/\.online-match \.slot\{[^}]*aspect-ratio:63\/88/);
 assert.match(css,/\.online-match \.slot img\.art\{[^}]*object-fit:contain/);
 assert.match(css,/\.online-match \.slot\.empty\{[^}]*background:transparent/);
 assert.match(css,/\.online-match button\.slot\{[^}]*min-height:0/);
 assert.match(css,/\.online-match \.slot\.selected\{[^}]*outline:2px solid #ffd56a/);
 assert.match(css,/\.online-match \.slot\.destination\{[^}]*#2f8f55/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(250px,320px\)/);
 const appRoot=new FakeNode('div');
 const document={
  createElement:tag=>new FakeNode(tag),
  createTextNode:text=>new FakeNode('#text',String(text)),
  querySelector:selector=>selector==='#app'?appRoot:null
 };
 const context=vm.createContext({
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
  {id:'BLC-1-010',image:'https://example.test/energy.png'}
 ]}]};
 vm.runInContext("coverCatalogue=artFixture;artById=null;app.offline=false;app.user={username:'32928748'};app.room=roomFixture;render();",context);
 const rendered=texts(appRoot);
 assert.match(rendered,/房間 G7MC92Y3/);
 assert.match(rendered,/你的手牌/);
 assert.match(rendered,/測試卡1/);
 assert.match(rendered,/測試卡7/);
 assert.match(rendered,/保留這 7 張手牌/);
 assert.match(rendered,/整手重抽 7 張/);
 assert.match(rendered,/開局可選擇保留 7 張/);
 assert.match(rendered,/對手手牌是隱藏的，這裡只顯示張數。/);
 assert.match(rendered,/生命尚未設置/);
 assert.match(rendered,/能量角色/);
 const classes=[];
 const images=[];
 function visit(node){
  if(!(node instanceof FakeNode))return;
  if(node.className)classes.push(node.className);
  if(node.tag==='img')images.push(node.attributes.src);
  for(const child of node.children)visit(child);
 }
 visit(appRoot);
 assert.deepEqual(images.sort(),['https://example.test/energy.png','https://example.test/ichigo.png']);
 assert.ok(classes.includes('online-match'));
 assert.ok(classes.includes('online-table'));
 assert.ok(classes.includes('online-hand'));
 assert.ok(classes.includes('online-dock'));
 assert.equal(classes.filter(name=>name==='slot empty').length,15,'own lines are empty and the opponent has one occupied energy card');
 assert.ok(classes.some(name=>name.includes('slot occupied')&&name.includes('green')));
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
 assert.equal(classes.filter(name=>name==='slot empty').length,15,'selecting an attacker does not turn empty slots into destinations');
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
