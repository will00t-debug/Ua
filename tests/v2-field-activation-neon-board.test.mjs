import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fieldActivationActions,mountFieldActivationButtons,openFieldActivationPicker}
 from '../dist/universal-v2/field-activation-ui.mjs';

const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fakeEl(tag,props={},...children){
 return {tag,props,children:[...children],style:{},dataset:{},removed:false,
  append(...entries){this.children.push(...entries);},
  addEventListener(type,fn){(this.events??={})[type]=fn;},
  remove(){this.removed=true;},focus(){}};
}
function mockArena(uid){
 const row={children:Array.from({length:4},(_,i)=>({
  classList:{contains:k=>k==='slot'},dataset:{v2CardUid:i===2?uid:'other-'+i},
  style:{}})),
  append(node){this.children.push(node);}};
 return {row,arena:{querySelectorAll:s=>s.includes('.lineGroup .slots')?[row]:[]}};
}
const A={type:'activate',uid:'card-1',mode:'rest',label:'起動主要：REST 自身',index:7};
const B={type:'activate',uid:'card-1',mode:'draw',label:'起動主要：抽 1 張',index:8};

test('field abilities are sourced ONLY from current legal activate actions',()=>{
 assert.deepEqual(fieldActivationActions([A,B,{type:'activateRemoved',uid:'card-1'},{
  type:'activate',uid:'other'}, {type:'attack',uid:'card-1'}],'card-1'),[A,B]);
 assert.deepEqual(fieldActivationActions([A,B],null),[]);
 assert.deepEqual(fieldActivationActions(null,'card-1'),[]);
});

test('selecting a card creates exactly one sibling 啟動 button, never nested in slot',()=>{
 const {arena,row}=mockArena('card-1');
 const chosen=[];
 const count=mountFieldActivationButtons({arena,el:fakeEl,
  actions:[A,B],selectedUid:'card-1',
  onOpen:(actions,uid)=>chosen.push({actions,uid})});
 assert.equal(count,1);
 assert.equal(row.children.length,5);
 assert.equal(row.children[4].tag,'button');
 assert.equal(row.children[4].props.text,'啟動');
 assert.equal(row.children[4].style.gridColumn,'3');
 assert.equal(row.children[4].style.gridRow,'1');
 assert.deepEqual(row.children.slice(0,4).map(x=>x.style.gridColumn),['1','2','3','4']);
 row.children[4].props.onClick({stopPropagation(){}});
 assert.deepEqual(chosen,[{actions:[A,B],uid:'card-1'}]);
});

test('no activate action -> no button, no changes to board grid',()=>{
 const {arena,row}=mockArena('card-1');
 assert.equal(mountFieldActivationButtons({arena,el:fakeEl,actions:[],
  selectedUid:'card-1',onOpen:()=>assert.fail()}),0);
 assert.equal(row.children.length,4);
});

test('ability modal lists every legal mode; only choosing one dispatches that action',()=>{
 const root={children:[],querySelector:()=>null,append(node){this.children.push(node);}};
 const dispatched=[];
 const overlay=openFieldActivationPicker({el:fakeEl,root,cardName:'示例角色',
  actions:[A,B],labelOf:a=>a.label,onChoose:a=>dispatched.push(a)});
 assert.equal(dispatched.length,0,'button opening must NOT fire ability');
 assert.equal(root.children[0],overlay);
 const dialog=overlay.children[0];
 assert.equal(dialog.props.role,'dialog');
 assert.equal(dialog.children[1].children.length,2,'two distinct choices presented');
 assert.match(dialog.children[1].children[1].children[1].props.text,/抽 1 張/);
 dialog.children[1].children[1].props.onClick();
 assert.deepEqual(dispatched,[B]);
 assert.equal(overlay.removed,true);
});

test('single legal activation still asks for confirmation',()=>{
 const root={children:[],querySelector:()=>null,append(x){this.children.push(x)}};
 let fired=0;
 const overlay=openFieldActivationPicker({el:fakeEl,root,
  cardName:'角色',actions:[A],onChoose:()=>{fired++}});
 assert.equal(fired,0);
 assert.equal(overlay.children[0].children[1].children[0].children[0].props.text,'確認發動');
});

test('both AI and online use the common card button, never generic one-click activate',()=>{
 const solo=load('dist/universal-v2-preview.mjs');
 const online=load('dist/universal-v2/online-battle-ui.mjs');
 const controller=load('dist/online.mjs');
 const helper=load('dist/universal-v2/field-activation-ui.mjs');
 assert.match(solo,/mountFieldActivationButtons\(\{arena,el,actions:legal/);
 assert.match(online,/mountFieldActivationButtons\(\{arena,el,actions:choices/);
 assert.match(solo,/onChoose:action=>applyAction\(action\)/);
 assert.match(online,/onChoose:action=>onAction\(action.index\)/);
 assert.match(solo,/\.filter\(a=>a.type!=='activate'/);
 assert.match(controller,/choice.type!=='activate'/);
 assert.doesNotMatch(helper,/activateRemoved/);
});

test('blue neon reference board loaded last in AI and online desktop style stack',()=>{
 const html=load('dist/universal-v2-battle.html');
 const online=load('dist/universal-v2/online-battle-ui.mjs');
 const css=load('dist/universal-v2-neon-board.css');
 assert.ok(html.lastIndexOf('universal-v2-neon-board.css')>
  html.lastIndexOf('universal-v2-table-layout-v3.css'));
 assert.ok(online.indexOf("'universal-v2-neon-board.css'")>
  online.indexOf("'universal-v2-table-layout-v3.css'"));
 for(const token of ['.v2-life-group.opponent','.v2-pile-group','.v2-table-ap',
  '.lineLabel.front','.handArea','.v2-field-activate-button','.v2-activation-dialog'])
  assert.ok(css.includes(token),token);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
