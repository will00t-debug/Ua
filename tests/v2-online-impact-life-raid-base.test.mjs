import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onlineBattleView,visibleRaidBaseCards,showOnlineCard} from '../dist/universal-v2/online-battle-ui.mjs';
import {makeAttackLifePicker} from '../dist/universal-v2/attack-life-picker.mjs';
import {FakeNode,texts} from './helpers/online-client-dom.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const el=(tag,props={},...children)=>{
 const node=new FakeNode(tag);
 for(const [key,value] of Object.entries(props)){
  if(value==null)continue;
  if(key==='text')node.textContent=String(value);
  else if(key==='class')node.className=value;
  else if(key==='onClick')node.addEventListener('click',value);
  else if(key==='disabled')node.disabled=!!value;
  else if(key.startsWith('data-')){node.setAttribute(key,String(value));node.dataset.lifeIndex=String(value);}
  else node.setAttribute(key,String(value));
 }
 node.append(...children.flat().filter(x=>x!=null));
 return node;
};

test('online impact 1 offers a real, legal attacker LIFE selection for either physical seat',()=>{
 for(const seat of [0,1]){
  const room={seat,status:'playing',view:{phase:'attack',active:seat,actor:seat,
   pending:{kind:'attack-life-target',player:seat,defender:1-seat,count:1},
   players:[{lifeCount:3,hand:[],front:[],energy:[]},{lifeCount:3,hand:[],front:[],energy:[]}]}};
  const view=onlineBattleView(room);
  assert.deepEqual(view.pending,{kind:'attack-life-target',player:0,defender:1,count:1});
  const choices=[{type:'chooseAttackLife',indices:[0],index:21},
   {type:'chooseAttackLife',indices:[1],index:22},
   {type:'chooseAttackLife',indices:[2],index:23}];
  const dispatched=[];
  const picker=makeAttackLifePicker({el,lifeCount:view.players[1].lifeCount,
   count:view.pending.count,actions:choices,onAction:a=>dispatched.push(a.index)});
  const life=picker.querySelectorAll('.v2-life-picker-slot');
  assert.equal(life.length,3);
  life[2].handlers.click();
  assert.deepEqual(dispatched,[23]);
 }
});

test('online pending life target has a centered usable choice on desktop as well as mobile',()=>{
 const source=read('dist/universal-v2/online-battle-ui.mjs');
 const css=read('dist/online-battle.css');
 assert.match(source,/view\.pending\?\.kind==='attack-life-target'&&room\.yourTurn&&view\.pending\.player===0/);
 assert.match(source,/overlay v2-attack-life-overlay online-life-target-overlay/);
 assert.match(source,/makeAttackLifePicker\(\{el,lifeCount:view\.players\[1\]\.lifeCount/);
 assert.doesNotMatch(source,/view\.pending\?\.kind==='attack-life-target'&&room\.yourTurn&&!desktop/);
 assert.match(css,/\.online-life-target-overlay\{[\s\S]*?position:fixed;inset:0;z-index:470/);
 assert.match(read('dist/online.mjs'),/online-battle-ui\.mjs\?v=20261114impactraid1/);
});

test('Raid inspection enumerates face-up bases, but never discloses hidden undercards',()=>{
 const card={uid:'top',cardId:'RAID',raidLayers:[
  {uid:'base1',cardId:'BASE1',faceDown:false,stack:[
   {uid:'base0',cardId:'BASE0',faceDown:false}]},
  {faceDown:true,uid:'SECRET_UID',cardId:'SECRET_CARD'}
 ]};
 assert.deepEqual(visibleRaidBaseCards(card),[
  {cardId:'BASE0',uid:'base0'},{cardId:'BASE1',uid:'base1'}
 ]);
 assert.equal(JSON.stringify(visibleRaidBaseCards(card)).includes('SECRET'),false);
 assert.deepEqual(visibleRaidBaseCards({cardId:'NORMAL'}),[]);
 const root=new FakeNode('div'),opened=[];
 const previous=globalThis.document;
 globalThis.document={activeElement:null,body:root,querySelector:selector=>
  selector==='.online-battle-shell'?root:null};
 try{
  showOnlineCard({el,card,definition:{name:'突襲角色',effect:'突襲效果'},
   src:'cards/raid.webp',nameOf:id=>({BASE0:'舊底板',BASE1:'新底板'}[id]||id),
   imageOf:id=>'cards/'+id+'.webp',effectOf:id=>'底板效果 '+id,
   onInspect:entry=>opened.push(entry.uid)});
  const sheet=root.querySelector('.online-raid-base-section');
  assert.ok(sheet);
  const shown=texts(sheet);
  assert.match(shown,/突襲底板/);
  assert.match(shown,/底板效果 BASE0/);
  assert.match(shown,/底板效果 BASE1/);
  assert.equal(shown.includes('SECRET'),false);
  const buttons=sheet.querySelectorAll('.v2-zone-open');
  assert.equal(buttons.length,2);
  buttons[0].handlers.click();
  assert.deepEqual(opened,['base0']);
 }finally{globalThis.document=previous;}
});
