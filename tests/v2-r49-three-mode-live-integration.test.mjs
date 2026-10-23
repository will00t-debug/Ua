import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPrivateChoices,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Shared engine three-mode integration. NOT a certified BLC-4-042 official card:
// BLC-2-044's separate dual MAIN powers remain outside this synthetic fixture.
const entry={op:'deployNamedFromZones',name:'涅骸部隊',zones:['hand'],line:'energy',
 ready:true,optional:true,cardType:'field',color:'blue',ap:1,maxEnergy:30};
const modes=[
 {id:'top',label:'TOP 2',turn:'any',then:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]},
 {id:'recover',label:'Pay 2 / outside',turn:'any',then:[{op:'discardGate',count:2,optional:true,
  then:[{op:'recoverOutsideOne',optional:true,filter:{field:'printedNameAny',values:['涅 マユリ','涅 ネム']}}]}]},
 {id:'field',label:'Retire other / enter FIELD',turn:'any',then:[
  {op:'retireOwnCharacterOne',optional:true,excludeSelf:true,after:[entry]}]}
];
const cards=Array.from({length:13},(_,i)=>({id:'Z'+i,name:'Other'+i,
 type:'character',color:'blue',energy:0,ap:1,bp:1000,gen:1,
 traits:[],implementation:'vanilla'}));
cards[0]={...cards[0],name:'涅 マユリ',implementation:'dsl',
 effects:{onPlay:[{op:'chooseOne',optional:false,options:modes}]}};
cards[1]={...cards[1],name:'涅骸部隊',type:'field',bp:0,energy:3,
 implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
cards[2]={...cards[2],name:'涅 ネム',implementation:'dsl',
 effects:{onRetire:[{op:'draw',count:1}]}};
cards[3]={...cards[3],name:'涅 マユリ'};
cards[4]={...cards[4],name:'Fake',traits:['涅骸部隊']};
const pack=createUniversalPack({id:'r49-three-mode-core',cards});
const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
const act=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('missing '+id);}
function start(mode){
 let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:49042});
 const source=take(s,'Z0'),field=take(s,'Z1'),retire=take(s,'Z2'),
 paid=take(s,'Z3'),trait=take(s,'Z4');
 s.players[0].hand.push(source,field,paid,trait);
 retire.ready=true;retire.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=retire;
 while(s.phase!=='main')s=act(s,{type:'next'});
 const use=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(use);s=act(s,use);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 assert.deepEqual(legalUniversalActions(pack,s).map(x=>x.mode),['top','recover','field']);
 s=act(s,{type:'chooseEffectMode',mode});
 return {s,source,field,retire,paid,trait};
}
test('R49 mode A real TOP2 0/1/2 OUTSIDE and ordered remainder on TOP (not BOTTOM)',()=>{
 for(const count of [0,1,2]){
  let {s}=start('top');assert.equal(s.pending?.kind,'effect-top-inspect-many');
  assert.equal(universalPrivateChoices(pack,s,1),null);
  const uids=[...s.pending.uids];
  for(let i=0;i<count;i++)s=act(s,{type:'chooseInspectedOutside',uid:uids[i]});
  if(s.pending?.kind==='effect-top-inspect-many')
   s=act(s,{type:'chooseInspectedOutside',uid:null});
  const remain=uids.filter(uid=>!s.players[0].outside.some(c=>c.uid===uid));
  while(s.pending?.kind==='effect-top-order'){
   const next=legalUniversalActions(pack,s).find(a=>a.type==='chooseTopOrder');
   assert.ok(next);s=act(s,next);
  }
  assert.equal(s.pending,null);
  assert.ok(remain.every(uid=>s.players[0].deck.slice(0,remain.length).some(c=>c.uid===uid)));
  assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 }
});
test('R49 mode B two UID atomic payment then live exact outside pair-name recovery',()=>{
 let {s,paid}=start('recover');
 assert.equal(s.pending?.kind,'effect-discard-gate');
 const choice=legalUniversalActions(pack,s).find(a=>a.uids?.includes(paid.uid));
 assert.ok(choice);
 const before=structuredClone(s);
 assert.throws(()=>act(s,{type:'chooseDiscardGate',uid:paid.uid}),/not currently legal/);
 assert.deepEqual(s,before);
 s=act(s,choice);
 assert.ok(s.players[0].outside.some(c=>c.uid===paid.uid));
 assert.ok(s.zoneMoveEvents.filter(e=>e.reason==='payment').length===2);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('R49 mode C other own character truly retires then named BLUE FIELD ACTIVE on ENERGY',()=>{
 let {s,source,field,retire,trait}=start('field');
 assert.equal(s.pending?.kind,'effect-retire-own-character');
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.uid===retire.uid));
 assert.ok(!options.some(a=>a.uid===source.uid));
 const invalid=structuredClone(s);invalid.pending.choices.push(source.uid);
 assert.throws(()=>assertUniversalMatch(pack,invalid),/other-character retirement/);
 assert.ok(universalPublicView(pack,s,1).players[0].hand===null);
 for(const difficulty of ['normal','hard'])assert.ok(options.some(a=>
  JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(pack,s,{difficulty}))));
 s=act(s,{type:'chooseOwnCharacterRetire',uid:retire.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===retire.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===retire.uid&&e.to==='outside'));
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 const fieldOption=legalUniversalActions(pack,s).find(a=>a.type==='chooseNamedZoneDeploy'&&a.uid===field.uid&&a.line==='energy');
 assert.ok(fieldOption);
 const ap=s.players[0].apCards.filter(c=>c.ready).length,top=s.players[0].deck.length;
 s=act(s,fieldOption);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].energy.some(c=>c?.uid===field.uid&&c.ready&&c.fieldEntryStamp>=1));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(s.players[0].deck.length,top-1);
 assert.ok(s.players[0].hand.some(c=>c.uid===trait.uid),'trait-only character was not deployed');
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R49 C optional zero retirement does not execute any FIELD entry branch',()=>{
 let {s,field}=start('field');
 s=act(s,{type:'chooseOwnCharacterRetire',uid:null});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===field.uid));
 assert.ok(!s.players[0].energy.some(c=>c?.uid===field.uid));
});
