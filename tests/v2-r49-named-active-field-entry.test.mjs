import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const op={op:'deployNamedFromZones',name:'涅骸部隊',
 zones:['hand'],line:'energy',ready:true,optional:true,
 cardType:'field',color:'blue',ap:1,maxEnergy:30};
const cards=Array.from({length:13},(_,i)=>({
 id:'Y'+i,name:'Other '+i,type:'character',color:'blue',energy:0,ap:1,
 bp:1000,gen:1,traits:[],implementation:'vanilla'
}));
cards[0]={...cards[0],name:'Source',implementation:'dsl',
 effects:{onPlay:[op]}};
cards[1]={...cards[1],name:'涅骸部隊',type:'field',energy:3,bp:0,
 implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
cards[2]={...cards[2],name:'涅骸部隊',color:'purple',type:'field',energy:3,bp:0};
cards[3]={...cards[3],name:'Fake',type:'field',energy:3,bp:0,traits:['涅骸部隊']};
const pack=createUniversalPack({id:'r49-free-field',cards});
const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
const act=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){for(const zone of ['hand','deck','life','outside']){
 const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('missing '+id);}
function setup(){
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed:49224,first:0});
 const source=take(s,'Y0'),target=take(s,'Y1'),wrongColor=take(s,'Y2'),traitOnly=take(s,'Y3');
 s.players[0].hand.push(source,target,wrongColor,traitOnly);
 while(s.phase!=='main')s=act(s,{type:'next'});
 const play=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);s=act(s,play);return {s,source,target,wrongColor,traitOnly};
}
test('R49 field name is literal print, not trait or other color, and goes ACTIVE ENERGY without extra AP',()=>{
 let {s,source,target,wrongColor,traitOnly}=setup();
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 assert.equal(s.pending.cardType,'field');
 const legal=legalUniversalActions(pack,s);
 const paid=legal.filter(a=>a.type==='chooseNamedZoneDeploy'&&a.uid!==null);
 assert.ok(paid.length);
 assert.ok(paid.every(a=>a.uid===target.uid&&a.zone==='hand'&&a.line==='energy'));
 assert.ok(!paid.some(a=>a.uid===wrongColor.uid||a.uid===traitOnly.uid));
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.ok(universalPrivateChoices(pack,s,0).options.some(x=>x.action.uid===target.uid));
 assert.equal(universalPublicView(pack,s,1).players[0].hand,null);
 for(const difficulty of ['normal','hard'])assert.ok(legal.some(a=>
  JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(pack,s,{difficulty}))));
 const bad=structuredClone(s);bad.pending.cardType='character';
 assert.throws(()=>assertUniversalMatch(pack,bad),/Invalid named free zone entry/);
 const spoof=structuredClone(s);spoof.pending.handChoices.push(wrongColor.uid);
 assert.throws(()=>assertUniversalMatch(pack,spoof),/Invalid named free zone entry/);
 const original=structuredClone(s);
 assert.throws(()=>act(s,{type:'chooseNamedZoneDeploy',uid:traitOnly.uid,zone:'hand',line:'energy',slot:0}),/not currently legal/);
 assert.deepEqual(s,original);
 const ap=s.players[0].apCards.filter(c=>c.ready).length,deck=s.players[0].deck.length;
 s=act(s,paid[0]);
 const entered=s.players[0].energy.find(c=>c?.uid===target.uid);
 assert.ok(entered&&entered.ready);
 assert.ok(Number.isInteger(entered.fieldEntryStamp)&&entered.fieldEntryStamp>=1);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(s.players[0].deck.length,deck-1,'genuine FIELD onPlay executes without an extra AP');
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===target.uid&&e.from==='hand'&&
  e.to==='energy'&&e.sourceUid===source.uid&&e.reason==='own-effect'));
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R49 optional field entry can decline without moving source and field-only schema rejects spoofed routes',()=>{
 let {s,target}=setup();
 s=act(s,{type:'chooseNamedZoneDeploy',uid:null});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===target.uid));
 for(const wrong of [
  {...op,line:'front'},{...op,zones:['outside']},{...op,ready:false},
  {...op,cardType:'event'},{...op,grantBp:1000}
 ]){
  const altered=cards.map((c,i)=>i===0?{...c,effects:{onPlay:[wrong]}}:c);
  assert.throws(()=>createUniversalPack({id:'forged-field',cards:altered}),/invalid free named-zone entry/);
 }
});
