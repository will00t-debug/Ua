import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 boardEntryMode,pendingEntryChoiceCards,visiblePendingChoiceCards
} from '../dist/universal-v2/preview-actions.mjs';

const outside={uid:'0-yo-1',cardId:'TTG-1-015',name:'ヨーコ'};
const other={uid:'0-simon-2',cardId:'TTG-1-011',name:'シモン'};
const visible={players:[
 {hand:[],outside:[outside],removed:[other],front:[],energy:[]},
 {hand:[{uid:'1-secret',cardId:'SECRET'}],outside:[],removed:[],front:[],energy:[]}
]};

test('effect entry target cards are illustrated from public outside and removed, once per physical UID',()=>{
 const actions=[
  {type:'chooseOutsideOrRest',uid:outside.uid,mode:'rest',line:'front',slot:0},
  {type:'chooseOutsideOrRest',uid:outside.uid,mode:'rest',line:'energy',slot:1},
  {type:'chooseOutsideOrRest',uid:outside.uid,mode:'hand'},
  {type:'chooseRemovedRestPair',uid:other.uid,mode:'place',line:'front',slot:2},
  {type:'chooseOutsideOrRest',uid:'1-secret',mode:'hand'}
 ];
 assert.equal(boardEntryMode(actions[0]),'normal');
 const before=structuredClone(actions);
 const gallery=pendingEntryChoiceCards(null,visible,actions);
 assert.deepEqual(gallery.map(card=>[card.uid,card.cardId]),
  [[outside.uid,outside.cardId],[other.uid,other.cardId]]);
 assert.deepEqual(actions,before,'gallery is presentation only; must not change exact legal actions');
 assert.deepEqual(visiblePendingChoiceCards(visible,{uid:'1-secret'}),[],
  'never inspect an opponent hidden hand');
});

test('pending private target art can identify controller-authorized cards without exposing unseen zones',()=>{
 const action={type:'chooseOutsideOrRest',uid:'0-private',mode:'rest',line:'front',slot:0};
 const privateChoices={options:[{action,card:{cardId:'TTG-1-019',name:'ニア'}}]};
 assert.deepEqual(pendingEntryChoiceCards(privateChoices,visible,[action]).map(card=>card.cardId),
  ['TTG-1-019']);
 assert.deepEqual(pendingEntryChoiceCards(null,visible,[action]).map(card=>card.cardId),
  [null],'without authorized identity, do not guess from a hidden pile');
});

test('solo mixed effect gallery picks target before the legal destination, and never dispatches placement from the picker',()=>{
 const src=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(src,/placement=legal\.filter\(action=>boardEntryMode\(action\)\)/);
 assert.match(src,/pendingEntryChoiceCards\(privateChoices,view,placement\)/);
 assert.match(src,/for\(const card of entryCards\)list\.append\(pendingEntrySelectControl\(card\)\)/);
 assert.match(src,/onClick:\(\)=>\{selectDeployedCharacter\(card\.uid\);render\(\);\}/);
 assert.match(src,/const rows=legal\.filter\(action=>!boardEntryMode\(action\)/);
 assert.match(src,/pendingRest=s\.pending&&!board\?/);
 assert.match(src,/重新選擇角色/);
});

test('online effect gallery keeps server action indices and does not bypass mode/destination',()=>{
 const src=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 assert.match(src,/function effectEntryGallery\(room\)/);
 assert.match(src,/const entries=legal\.filter\(action=>boardEntryMode\(action\)\)/);
 assert.match(src,/app\.pick=\{uid,entryMode:null,options:null\}/);
 assert.match(src,/text:action\.label,onClick:\(\)=>sendAction\(action\.index\)/);
 assert.match(src,/effectTarget\?\.node/);
 assert.match(src,/重新選擇角色/);
});
