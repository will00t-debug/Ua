import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';
import {boardEntryMode,boardEntrySelection,entryClickPlan}
 from '../dist/universal-v2/preview-actions.mjs';

const pack=createKjnV2Pack();
const packs=[pack,pack];
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
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
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function play(s,uid,line){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play onto '+line+' for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.step||''));
 return use(s,action);
}
function removedIds(s){return new Set(s.players[0].removed.map(c=>c.uid));}
function plan(actions,uid,line,slot,slotUid=null){
 return entryClickPlan({selectedUid:uid,entryMode:null,raidBaseUid:null,
  line,slot,slotUid,legal:actions});
}

test('Epsilon and Beta REST entry is a tapped cell on either line',()=>{
 const move={type:'kjn',mode:'dest',line:'front',slot:1};
 assert.equal(boardEntryMode(move),null);
 assert.equal(boardEntryMode({type:'kjn',mode:'skip'}),null);
 assert.equal(boardEntryMode({type:'kjn',mode:'dest',uid:'0-1',line:'energy',slot:2}),'normal');
 assert.equal(boardEntryMode({type:'kjn',mode:'raid',uid:'0-1',line:'front',slot:0}),null);
 for(const file of ['dist/universal-v2/preview-actions.mjs','dist/online.mjs']){
  const source=read(file);
  assert.match(source,/['"]kjn['"]/);
  assert.match(source,/action\.type==='kjn'\)return action\.mode==='dest'\?'normal':null/);
 }
 for(const file of ['dist/universal-v2-preview.mjs','dist/online.mjs'])
  assert.match(read(file),/替換並移入移除區/);
});

test('Epsilon can rest-enter an empty energy cell while the front line stays full',()=>{
 const counts=countsFor(['KJN-1-061','KJN-1-065','KJN-1-052','KJN-1-001','KJN-1-008','KJN-1-012']);
 let s=toPhase(fresh(counts,61061),'main');
 const epsilon=put(s,0,'KJN-1-061','front',0,true);
 const front=[epsilon,
  put(s,0,'KJN-1-001','front',1,true),
  put(s,0,'KJN-1-008','front',2,true),
  put(s,0,'KJN-1-012','front',3,true)];
 const tucked=put(s,0,'KJN-1-052','energy',0,true);
 const recruit=take(s,0,'KJN-1-065');
 const otherEpsilon=take(s,0,'KJN-1-061');
 s.players[0].outside.push(recruit,otherEpsilon);
 const frontIds=front.map(c=>c.uid);
 const removedBefore=removedIds(s);

 s=use(s,{type:'activate',uid:epsilon.uid,mode:'kjn:0'});
 assert.equal(s.pending.step,'bottomThen');
 s=choose(s,a=>a.mode==='bottom'&&a.uid===tucked.uid);
 assert.equal(s.players[0].deck.at(-1).uid,tucked.uid);
 assert.equal(s.pending.step,'deploy');
 assert.deepEqual(front.map(c=>c.uid),s.players[0].front.map(c=>c.uid));

 const actions=legalUniversalActions(packs,s);
 const mine=actions.filter(a=>a.type==='kjn'&&a.mode==='dest'&&a.uid===recruit.uid);
 assert.equal(mine.some(a=>a.line==='energy'&&a.replaceUid===undefined),true);
 assert.equal(mine.filter(a=>a.line==='front').every(a=>typeof a.replaceUid==='string'),true);
 assert.equal(mine.every(a=>boardEntryMode(a)==='normal'&&a.ready===false&&a.skip===true),true);
 assert.equal(actions.some(a=>a.uid===otherEpsilon.uid&&a.mode==='dest'),false);
 assert.equal(boardEntrySelection(actions,recruit.uid).needsMode,false);
 assert.equal(boardEntryMode(actions.find(a=>a.mode==='skip')),null);
 assert.equal(plan(actions,null,'energy',2).type,'idle');
 const energy=plan(actions,recruit.uid,'energy',2);
 assert.equal(energy.type,'entry');
 assert.equal(energy.mode,'normal');
 assert.equal(energy.actions.length,1);
 assert.equal(energy.actions[0].line,'energy');
 assert.equal(energy.actions[0].slot,2);
 assert.equal(energy.actions[0].replaceUid,undefined);
 const occupied=plan(actions,recruit.uid,'front',0,front[0].uid);
 assert.equal(occupied.type,'entry');
 assert.equal(occupied.actions[0].replaceUid,front[0].uid);
 assert.equal(plan(actions,recruit.uid,'front',0,null).type,'entry-wait');

 s=use(s,energy.actions[0]);
 assert.equal(s.players[0].energy[2].uid,recruit.uid);
 assert.equal(s.players[0].energy[2].ready,false);
 assert.deepEqual(s.players[0].front.map(c=>c.uid),frontIds);
 for(const uid of frontIds)assert.equal(removedIds(s).has(uid),false);
 assert.equal([...removedIds(s)].every(uid=>removedBefore.has(uid)),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Beta can bring a character onto an empty energy cell instead of the full front',()=>{
 const counts=countsFor(['KJN-1-074','KJN-1-070','KJN-1-041','KJN-1-065','KJN-1-001','KJN-1-008','KJN-1-012']);
 let s=toPhase(fresh(counts,74074),'main');
 readyAp(s);
 dumpHand(s);
 put(s,0,'KJN-1-041','energy',0,true);
 put(s,0,'KJN-1-041','energy',1,true);
 const base=put(s,0,'KJN-1-070','front',0,true);
 const front=[base,
  put(s,0,'KJN-1-001','front',1,true),
  put(s,0,'KJN-1-008','front',2,true),
  put(s,0,'KJN-1-012','front',3,true)];
 const beta=toHand(s,0,'KJN-1-074');
 const recruit=toHand(s,0,'KJN-1-065');
 assert.ok((universalEnergyByColor(packs,s,0).purple||0)>=4);
 const removedBefore=removedIds(s);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===beta.uid&&
  a.baseUid===base.uid&&a.slot===0&&a.line!=='energy');
 assert.ok(raid);

 s=use(s,raid);
 assert.equal(s.players[0].front[0].uid,beta.uid);
 assert.equal(s.pending.step,'betaDeploy');
 const tops=s.players[0].front.map(c=>c.uid);
 const actions=legalUniversalActions(packs,s);
 const mine=actions.filter(a=>a.type==='kjn'&&a.mode==='dest'&&a.uid===recruit.uid);
 assert.equal(mine.some(a=>a.line==='energy'&&a.slot===3&&a.replaceUid===undefined),true);
 assert.equal(mine.filter(a=>a.line==='front').every(a=>a.replaceUid&&tops.includes(a.replaceUid)),true);
 assert.equal(boardEntrySelection(actions,recruit.uid).needsMode,false);
 assert.equal(mine.every(a=>boardEntryMode(a)==='normal'),true);
 const energy=plan(actions,recruit.uid,'energy',3);
 assert.equal(energy.type,'entry');
 assert.equal(energy.actions[0].replaceUid,undefined);
 assert.equal(plan(actions,recruit.uid,'front',0,null).type,'entry-wait');

 s=use(s,energy.actions[0]);
 assert.equal(s.players[0].energy[3].uid,recruit.uid);
 assert.equal(s.players[0].energy[3].ready,false);
 assert.deepEqual(s.players[0].front.map(c=>c.uid),tops);
 for(const uid of [...tops,base.uid])assert.equal(removedIds(s).has(uid),false);
 assert.equal([...removedIds(s)].every(uid=>removedBefore.has(uid)),true);
 assert.equal(s.pending.step,'bottom');
 s=choose(s,a=>a.mode==='bottom'&&a.uid===front[3].uid);
 assert.equal(s.players[0].deck.at(-1).uid,front[3].uid);
 assert.equal(s.players[0].energy[3].uid,recruit.uid);
 assert.equal(removedIds(s).has(front[3].uid),false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('the online table lets Epsilon tap an empty energy cell and marks a full front cell as removal',()=>{
 const source=read('dist/online.mjs');
 class FakeNode{
  constructor(tag='',text=''){this.tag=tag;this.textContent=text;this.children=[];this.attributes={};this.handlers={};this.className='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,callback){this.handlers[name]=callback;}
 }
 const texts=node=>node instanceof FakeNode?node.textContent+' '+node.children.map(texts).join(' '):String(node??'');
 const labels=node=>{
  if(!(node instanceof FakeNode))return [];
  return [node.attributes['aria-label'],...node.children.flatMap(labels)].filter(Boolean);
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
 const room={
  code:'KJNENTRY',status:'playing',revision:3,seat:0,yourTurn:true,youAreFirst:true,
  you:{username:'yuwei',titleLabel:'我想成為影之強者！'},
  opponent:{username:'rival',titleLabel:'我想成為影之強者！'},
  choices:[
   {index:0,type:'kjn',mode:'dest',uid:'zeta',from:'outside',line:'energy',slot:2,label:'選擇登場的位置：潔塔'},
   {index:1,type:'kjn',mode:'dest',uid:'zeta',from:'outside',line:'front',slot:0,replaceUid:'front0',label:'選擇登場的位置：潔塔'},
   {index:2,type:'kjn',mode:'skip',label:'不發動'}
  ],
  log:[],
  view:{phase:'main',pending:{kind:'kjn',player:0,step:'deploy',id:'KJN-1-061'},
   openTriggers:[],players:[
    {lifeCount:4,deckCount:30,handCount:0,hand:[],
     front:[{uid:'front0',cardId:'KJN-1-061',name:'伊普西龍',color:'purple',ready:true},
      {uid:'front1',cardId:'KJN-1-001',name:'愛麗絲',color:'yellow',ready:true},
      {uid:'front2',cardId:'KJN-1-008',name:'亞蕾克西雅',color:'yellow',ready:true},
      {uid:'front3',cardId:'KJN-1-012',name:'前排',color:'yellow',ready:true}],
     energy:empty(),apReady:1,apTotal:1,energyTotal:4,
     outside:[{uid:'zeta',cardId:'KJN-1-065',name:'潔塔',color:'purple'}],
     removed:[]},
    {lifeCount:4,deckCount:30,handCount:1,hand:null,front:empty(),energy:empty(),
     apReady:0,apTotal:0,energyTotal:0,outside:[],removed:[]}
   ]}
 };
 context.room=room;
 vm.runInContext('app.offline=false;app.user={username:"yuwei"};app.room=room;app.pick={uid:"zeta",entryMode:null,options:null};app.zone=null;render();',context);
 const spoken=labels(appRoot).join('\n');
 assert.match(spoken,/普通進場/);
 assert.match(spoken,/替換並移入移除區/);
 assert.match(texts(appRoot),/請直接點要登場的格子/);
 assert.doesNotMatch(texts(appRoot),/突襲進場/);
});
