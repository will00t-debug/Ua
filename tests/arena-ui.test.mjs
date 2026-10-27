import test from 'node:test';
import assert from 'node:assert/strict';
import {makeVisualDeckModel,renderVisualDeckBuilder,requiredEnergyKey} from '../dist/visual-deck-builder.mjs';
import {recordDeckResult,readDeckRecord,tally,formatRate,DECK_RECORD_KEY} from '../dist/deck-records.mjs';

const cards=[
 {id:'low',number:'BLC-1-001',name:'低能角色',type:'character',color:'red',energy:0,gen:1,ap:2,maxCopies:4},
 {id:'mid',number:'BLC-1-010',name:'中能角色',type:'character',color:'blue',energy:1,gen:0,ap:1,maxCopies:2},
 {id:'eight',number:'BLC-1-020',name:'八能',type:'character',color:'yellow',energy:8,gen:5,ap:1},
 {id:'nine',number:'BLC-1-003',name:'高能',type:'event',color:'green',energy:9,gen:6,ap:3,effect:'抽一張'},
 {id:'same',number:'BLC-1-002',name:'同能量',type:'field',color:'purple',energy:0,gen:3,ap:1},
 {id:'AP',name:'AP 卡',type:'action_point',energy:0,gen:9,ap:1}
];
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};

test('generate filter uses printed produce value and leaves AP cost alone',()=>{
 const produced=makeVisualDeckModel({cards,counts:{},generate:'1'}).results.map(card=>card.id);
 assert.deepEqual(produced,['low']);
 assert.equal(makeVisualDeckModel({cards,counts:{},generate:'all'}).results.some(card=>card.id==='nine'),true);
 assert.equal(makeVisualDeckModel({cards,counts:{},generate:'5'}).results.some(card=>card.id==='nine'),false);
});

test('required energy can select several exact costs, and 8+ means 9 or more',()=>{
 assert.equal(requiredEnergyKey({energy:8}),'8');
 assert.equal(requiredEnergyKey({energy:9}),'8+');
 const picked=makeVisualDeckModel({cards,counts:{},energies:['0','8+']}).results.map(card=>card.id);
 assert.deepEqual(picked,['low','same','nine']);
 const onlyEight=makeVisualDeckModel({cards,counts:{},energies:['8']}).results.map(card=>card.id);
 assert.deepEqual(onlyEight,['eight']);
});

test('default order is required energy low to high, then card number',()=>{
 const ids=makeVisualDeckModel({cards,counts:{},sort:'energy-asc'}).results.map(card=>card.id);
 assert.deepEqual(ids,['low','same','mid','eight','nine']);
 const high=makeVisualDeckModel({cards,counts:{},sort:'gen-desc'}).results.map(card=>card.id);
 assert.equal(high[0],'nine');
});

test('search combines name, number and title with the active filters',()=>{
 const found=makeVisualDeckModel({cards,counts:{},search:'BLC-1-003',type:'event',color:'green',titleName:'BLEACH'}).results.map(card=>card.id);
 assert.deepEqual(found,['nine']);
 const byTitle=makeVisualDeckModel({cards,counts:{},search:'BLEACH',titleName:'BLEACH 千年血戰篇'}).results.length;
 assert.equal(byTitle,5);
});

test('plus button stops at that card\'s own copy limit and the curve counts copies',()=>{
 const html=renderVisualDeckBuilder({titles:[{id:'bleach',label:'BLEACH',cards}],titleId:'bleach',ready:true,tab:'pick',counts:{mid:2,low:3},name:'練習',nameId:'v2DeckName',savedId:'saved',savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',issues:['目前 5/50 張。'],energies:[],generate:'all',sort:'energy-asc'});
 assert.match(html,/data-builder-count="mid" data-delta="1"[^>]*disabled/);
 assert.match(html,/必要能量/);
 assert.match(html,/產能/);
 assert.match(html,/8\+/);
 assert.match(html,/目前 5\/50/);
 assert.doesNotMatch(html,/平手/);
 const model=makeVisualDeckModel({cards,counts:{low:3,nine:1}});
 assert.equal(model.energyCurve['0'],3);
 assert.equal(model.energyCurve['8+'],1);
 assert.equal(model.generateCurve['6+'],1);
});

test('deck records stay on their own ids and never store a draw',()=>{
 const storage=memory();
 recordDeckResult(storage,{deckId:'deck-a',channel:'ai',win:true});
 recordDeckResult(storage,{deckId:'deck-a',channel:'ai',win:false});
 recordDeckResult(storage,{deckId:'deck-a',channel:'online',win:true});
 recordDeckResult(storage,{deckId:'deck-b',channel:'online',win:false});
 assert.equal(recordDeckResult(storage,{deckId:'deck-a',channel:'ai',win:'draw'}),null);
 const alpha=readDeckRecord(storage,'deck-a');
 const beta=readDeckRecord(storage,'deck-b');
 assert.deepEqual(tally(alpha,'ai'),{wins:1,losses:1,games:2,rate:50});
 assert.deepEqual(tally(alpha,'online'),{wins:1,losses:0,games:1,rate:100});
 assert.equal(formatRate(tally(alpha,'all')),'66.7%');
 assert.equal(formatRate(tally(beta,'ai')),'尚無戰績');
 assert.equal(beta.online.losses,1);
 assert.equal(storage.getItem(DECK_RECORD_KEY).includes('draw'),false);
});
