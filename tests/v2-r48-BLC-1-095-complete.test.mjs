import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';
const pack=registeredV2TitlePack('bleach'),packs=[pack,pack],id='BLC-1-095';
const counts={...BLEACH_GREEN_V2_COUNTS};
delete counts['BLC-4-061'];delete counts['BLC-1-090'];
counts['BLC-1-099']=4;counts[id]=4;
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('missing authentic printed '+id);
}
const run=(s,a)=>dispatchUniversalAction(packs,s,a);
function setup(){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:48095});
 const src=take(s,0,id);s.players[0].hand.push(src);
 for(let i=0;i<2;i++){const c=take(s,0,'BLC-1-068');
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=c;}
 const top=['BLC-1-071','BLC-1-075','BLC-1-097','BLC-1-099']
  .map(cid=>take(s,0,cid));
 s.players[0].deck.unshift(...top);
 while(s.phase!=='main')s=run(s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===src.uid);
 assert.ok(play,'real printed green paid EVENT should be legally usable');
 return {s:run(s,play),src,top};
}
test('R48 full print BLC-1-095 source, cost, type, trigger, TOP4 up-to-two trait only',()=>{
 const d=pack.cards[id],c=CARDS.find(x=>x.identity===id);
 assert.deepEqual([c.number,c.nameJa,c.color,c.energy,c.ap,c.bp,c.gen,c.trigger,c.type],
  ['UA08BT/BLC-1-095','護廷十三隊','green',2,1,0,0,null,'event']);
 assert.deepEqual([d.name,d.energy,d.ap,d.color,d.gen,d.trigger,d.type],
  ['護廷十三隊',2,1,'green',0,null,'event']);
 assert.deepEqual(d.effects.onPlay,[{op:'searchTopUpToTwoBottom',count:4,max:2,
  rest:'bottom',logic:'all',filters:[{field:'trait',value:'護廷十三隊'}]}]);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
});
for(const count of [0,2])test('R48 BLC-1-095 genuinely selects '+count+
 ' cards and orders remaining TOP4 to BOTTOM with physical UID integrity',()=>{
 let {s,src,top}=setup();
 assert.equal(s.pending?.kind,'effect-top-filter-many-choice');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.deepEqual(universalPublicView(packs,s,1).pending,
  {kind:'effect-top-filter-many-choice',player:0});
 const orig=structuredClone(s);
 assert.throws(()=>run(s,{type:'chooseTopFilteredMany',uid:'0-forged'}),/not currently legal/);
 assert.deepEqual(s,orig);
 for(const difficulty of ['normal','hard'])
  assert.ok(legalUniversalActions(packs,s).some(a=>
   JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const picked=[];
 for(let i=0;i<count;i++){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopFilteredMany'&&a.uid!==null);
  assert.ok(action,'must offer '+count+' printed trait matching physical cards');
  picked.push(action.uid);s=run(s,action);
 }
 if(s.pending?.kind==='effect-top-filter-many-choice')
  s=run(s,{type:'chooseTopFilteredMany',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 while(s.pending?.kind==='effect-top-order'){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder');
  assert.ok(action);s=run(s,action);
 }
 assert.equal(s.pending,null);
 for(const uid of picked)assert.ok(s.players[0].hand.some(c=>c.uid===uid));
 assert.equal(picked.length,count);
 assert.ok(s.players[0].outside.some(c=>c.uid===src.uid));
 assert.ok(top.filter(c=>!picked.includes(c.uid))
  .every(c=>s.players[0].deck.some(x=>x.uid===c.uid)));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
