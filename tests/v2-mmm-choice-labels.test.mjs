import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {boardEntryMode, uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

function emptyPlayer(){
 return {hand:[],front:[],energy:[],outside:[],removed:[],deck:[],life:[],lifeRevealed:[]};
}
function ctx(pending,extra){
 const you=emptyPlayer();
 you.hand=[{uid:'0-1',cardId:'madoka'},{uid:'0-2',cardId:'homura'}];
 you.front=[{uid:'0-9',cardId:'MMM-2-012'}];
 if(extra)Object.assign(you,extra);
 return {pack:{cards:{
  madoka:{id:'madoka',name:'鹿目圓'},
  homura:{id:'homura',name:'曉美焰'},
  'MMM-2-012':{id:'MMM-2-012',name:'惡魔焰'},
  'MMM-2-016':{id:'MMM-2-016',name:'環彩羽'},
  'MMM-2-044':{id:'MMM-2-044',name:'阿莉娜・格雷'}
 }},state:{players:[you,emptyPlayer()],pending}};
}
function labels(actions,pending,extra){
 return actions.map(action=>uiActionLabel(action,ctx(pending,extra)));
}
function unique(actions,pending,extra){
 const text=labels(actions,pending,extra);
 assert.equal(new Set(text).size,text.length,text.join(' | '));
 for(const label of text){
  assert.equal(label.includes('魔法少女小圓第二彈選擇'),false,label);
  assert.equal(label.includes('選擇這個效果'),false,label);
 }
 return text;
}

test('Madoka vol.2 forks and placements use different labels',()=>{
 unique([{type:'mmm2',mode:'top'},{type:'mmm2',mode:'bottom'}],{step:'placeOne',id:'MMM-2-063'});
 unique([{type:'mmm2',mode:'top'},{type:'mmm2',mode:'outside'}],{step:'u016b',id:'MMM-2-016'});
 unique([{type:'mmm2',mode:'top'},{type:'mmm2',mode:'outside'}],{step:'placeTop',id:'MMM-2-044'});
 unique([
  {type:'mmm2',uid:'0-1',mode:'top'},{type:'mmm2',uid:'0-1',mode:'outside'},
  {type:'mmm2',uid:'0-2',mode:'top'},{type:'mmm2',uid:'0-2',mode:'outside'}
 ],{step:'handPlace',id:'MMM-2-049'});
 unique([{type:'mmm2',mode:'skip'},{type:'mmm2',mode:'do'}],{step:'drawOpt',id:'MMM-2-067'});
 unique([{type:'mmm2',mode:'skip'},{type:'mmm2',mode:'do'}],{step:'u069',id:'MMM-2-069'});
 unique([{type:'mmm2',mode:'a'},{type:'mmm2',mode:'b'}],{step:'u003',id:'MMM-2-003'});
 unique([{type:'mmm2',mode:'a'},{type:'mmm2',mode:'b'}],{step:'u056',id:'MMM-2-056'});
 unique([
  {type:'mmm2',mode:'done'},{type:'mmm2',mode:'a'},{type:'mmm2',mode:'b'}
 ],{step:'u072',id:'MMM-2-072'});
 unique([
  {type:'mmm2',mode:'skip'},{type:'mmm2',uid:'0-1'},{type:'mmm2',uid:'0-2'}
 ],{step:'handOut',id:'MMM-2-008'});
 const seats=unique([
  {type:'mmm2',uid:'0-1',mode:'rest',line:'front',slot:0},
  {type:'mmm2',uid:'0-1',mode:'rest',line:'energy',slot:1},
  {type:'mmm2',mode:'skip'}
 ],{step:'deploy',id:'MMM-2-032'});
 assert.match(seats[0],/前線 1/);
 assert.match(seats[1],/能源線 2/);
 assert.equal(seats[2],'不發動');
 assert.equal(boardEntryMode({type:'mmm2',uid:'0-1',mode:'rest',line:'front',slot:0}),'normal');
 assert.equal(boardEntryMode({type:'mmm2',mode:'skip'}),null);
});

test('two main abilities on one Madoka card are not the same button',()=>{
 const pairs=[
  ['MMM-2-012','0-9'],
  ['MMM-2-016','0-16'],
  ['MMM-2-044','0-44']
 ];
 for(const [id,uid] of pairs){
  const text=unique([
   {type:'activate',uid,mode:'mmm2:0'},
   {type:'activate',uid,mode:'mmm2:1'}
  ],null,{front:[{uid,cardId:id}]});
  assert.match(text[0],/起動主要/);
  assert.match(text[1],/起動主要/);
 }
});

test('Madoka set 1 binary prints stay distinct',()=>{
 const view=ctx(null);
 const groups=[
  [{type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'outside'}],
  [{type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'bottom'}],
  [{type:'choosePlaceHand',mode:'deck',uid:'0-1'},{type:'choosePlaceHand',mode:'outside',uid:'0-1'}],
  [{type:'chooseRestSkipMayRetire',uid:'0-2',mode:'rest'},
   {type:'chooseRestSkipMayRetire',uid:'0-2',mode:'retire'}],
  [{type:'chooseInspectedOutside',uid:null},{type:'chooseInspectedOutside',uid:'0-1'}],
  [{type:'chooseEntryImpact',uid:'0-1'},{type:'chooseEntryImpact',uid:'0-2'}]
 ];
 for(const group of groups){
  const text=group.map(action=>uiActionLabel(action,view));
  assert.equal(new Set(text).size,text.length,text.join(' | '));
 }
});

const pack=createMadokaV2Pack();
const packs=[pack,pack];
function countsFor(required){
 const fillers=Object.values(pack.cards).filter(card=>!required.includes(card.id)&&
  !['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 const counts=Object.fromEntries(ids.map((id,index)=>[id,index===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(card=>card.cardId===id);
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
function toMain(seed){
 let s=newUniversalMatch(packs,{decks:[countsFor(['MMM-1-006','MMM-2-012','MMM-2-016']),
  countsFor(['MMM-1-006','MMM-2-012','MMM-2-016'])],seed,first:0});
 let guard=0;
 while(s.phase!=='main'){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach main');
 }
 return s;
}

test('a live Homura card offers two different main buttons',()=>{
 const s=toMain(2012);
 const homura=put(s,0,'MMM-2-012','front',0,true);
 put(s,0,'MMM-1-006','front',1,true);
 const buried=take(s,0,'MMM-1-006');
 s.players[0].outside.push(buried);
 const acts=legalUniversalActions(packs,s).filter(action=>action.type==='activate'&&action.uid===homura.uid);
 assert.equal(acts.length,2);
 const text=acts.map(action=>uiActionLabel(action,{pack:packs,state:s}));
 assert.equal(new Set(text).size,2,text.join(' | '));
 assert.equal(text.some(label=>label.includes('返回手牌')),true);
 assert.equal(text.some(label=>label.includes('牌組底')),true);
 assertUniversalMatch(packs,s);
});
