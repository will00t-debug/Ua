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
 for(let i=0;i<8&&!appRoot.children.length;i++)await Promise.resolve();
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
 assert.match(texts(appRoot),/圖片式牌組構築/);
 assert.match(texts(appRoot),/線上對戰/);
});
