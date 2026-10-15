import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPrivateChoices,universalPublicView,assertUniversalMatch
} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'N'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));
counts.N12=2;
const all=[{field:'color',value:'green'},{field:'trait',value:'Scout'}];
const any=[{field:'name',value:'Scout Beta'},{field:'color',value:'blue'}];
function makePack(id,scouts){
 const cards=ids.map((cardId,i)=>({
  id:cardId,name:i===2?(scouts?'Scout Beta':'Other Hero'):i===9?'Blue Pilot':'Unit '+i,
  color:i===9?'blue':'green',type:'character',energy:i===0?0:2,ap:1,bp:2000,
  gen:i===0?4:1,traits:i===2&&scouts?['Scout']:[],
  implementation:'vanilla'
 }));
 const effect=(n,program)=>{cards[n]={...cards[n],implementation:'dsl',templateEffects:{onPlay:program}};};
 effect(1,[
  {template:'searchDeckWhere',filters:all,logic:'all',count:3,optional:true,shuffle:true},
  {template:'draw',count:1}
 ]);
 effect(3,[
  {template:'searchDeckWhere',filters:any,logic:'any',count:2,optional:false,shuffle:true},
  {template:'draw',count:1}
 ]);
 effect(4,[
  {template:'inspectTopArrange',count:3,toOutside:true,rest:'bottom'},
  {template:'draw',count:1}
 ]);
 effect(5,[
  {template:'inspectTopArrange',count:3,toOutside:true,rest:'top'},
  {template:'draw',count:1}
 ]);
 effect(6,[
  {template:'inspectTopArrange',count:2,toOutside:false,rest:'bottom'}
 ]);
 effect(7,[
  {template:'payDiscardThen',optional:true,then:[
   {template:'searchDeckWhere',filters:all,logic:'all',count:1,optional:true,shuffle:true},
   {template:'inspectTopArrange',count:2,toOutside:true,rest:'bottom'}
  ]},
  {template:'draw',count:1}
 ]);
 return createUniversalPack({id,version:'compound-top-1',cards});
}
const packs=[makePack('title-scout',true),makePack('title-other',false)];
function take(s,p,id){
 for(const zone of ['hand','life','deck','outside']){
  const list=s.players[p][zone],idx=list.findIndex(c=>c.cardId===id);
  if(idx!==-1)return list.splice(idx,1)[0];
 }
 throw Error('Missing fixture card '+p+'/'+id);
}
function prepare(id,owner=0){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:owner,seed:1907});
 const pl=s.players[owner];
 const generator=take(s,owner,'N00'),effect=take(s,owner,id);
 pl.energy[0]=generator;pl.hand.push(effect);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const a=legalUniversalActions(packs,s).find(x=>
  x.type==='play'&&x.uid===effect.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a,'legal sample play');
 return {s,owner,effect,a};
}
const play=f=>dispatchUniversalAction(packs,f.s,f.a,{actor:f.owner});
const actions=s=>legalUniversalActions(packs,s);
function labels(s,player){return universalPrivateChoices(packs,s,player);}

test('compound all search only matches own GREEN Scout trait; same printed ID in other title never qualifies',()=>{
 const f=prepare('N01'),q=play(f);
 assert.equal(q.pending.kind,'effect-search-deck-multi');
 const choices=actions(q);
 assert.ok(choices.length>=1);
 assert.ok(choices.filter(a=>a.uid!==null).every(a=>
  q.players[0].deck.find(c=>c.uid===a.uid)?.cardId==='N02'));
 assert.equal(labels(q,1),null);
 assert.ok(labels(q,0).options.some(x=>x.card?.name==='Scout Beta'));
 assert.ok(!JSON.stringify(universalPublicView(packs,q,1)).includes(
  choices.find(x=>x.uid!==null).uid));
 const snap=structuredClone(q);
 const picked=choices.find(a=>a.uid!==null);
 const after=dispatchUniversalAction(packs,q,picked,{actor:0});
 assert.ok(after.players[0].hand.some(c=>c.uid===picked.uid));
 assert.equal(assertUniversalMatch(packs,after),true);
 assert.deepEqual(q,snap);
 const other=prepare('N01',1),done=play(other);
 assert.equal(done.pending,null,'other title has no cards with Scout trait');
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('compound any search accepts either matching name or blue cards, rejects all other physical cards',()=>{
 const f=prepare('N03'),q=play(f);
 assert.equal(q.pending.kind,'effect-search-deck-multi');
 const choices=actions(q);
 assert.ok(choices.length>=1);
 assert.ok(choices.every(a=>a.uid!==null),'mandatory search cannot be declined');
 for(const choice of choices){
  const c=q.players[0].deck.find(x=>x.uid===choice.uid);
  assert.ok(['N02','N09'].includes(c.cardId));
 }
 const ai=chooseUniversalAiAction(packs,q,{difficulty:'hard'});
 assert.ok(choices.some(a=>a.uid===ai.uid));
 const after=dispatchUniversalAction(packs,q,ai,{actor:0});
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('private top 3: choose middle card outside, put last then first onto bottom, then queued draw occurs',()=>{
 const f=prepare('N04'),q=play(f),original=structuredClone(q);
 assert.equal(q.pending.kind,'effect-top-inspect');
 assert.equal(labels(q,1),null);
 const window=q.players[0].deck.slice(0,4).map(x=>x.uid);
 const privateChoices=labels(q,0);
 assert.equal(privateChoices.options.length,4);
 assert.deepEqual(privateChoices.options.map(x=>x.action.uid),[null,...window.slice(0,3)]);
 assert.ok(privateChoices.options.slice(1).every(x=>x.card?.name));
 const enemy=JSON.stringify(universalPublicView(packs,q,1));
 assert.ok(window.slice(0,3).every(uid=>!enemy.includes(uid)));
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseInspectedOutside',uid:q.players[1].deck[0].uid},{actor:0}),
  /not currently legal/);
 let s=dispatchUniversalAction(packs,q,
  {type:'chooseInspectedOutside',uid:window[1]},{actor:0});
 assert.equal(s.pending.kind,'effect-top-order');
 assert.ok(s.players[0].outside.some(c=>c.uid===window[1]));
 assert.deepEqual(actions(s).map(a=>a.uid),[window[0],window[2]]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:window[2]},{actor:0});
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(actions(s),[{type:'chooseTopOrder',uid:window[0]}]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:window[0]},{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[3]),'draw uses first uninspected card');
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[2],window[0]],
  'bottom ordered exactly as chosen, without shuffle');
 assert.equal(s.rng,q.rng,'inspecting and ordering is not shuffling');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.deepEqual(q,original);
});

test('private top 3 rest on deck top: declining outside and reversing order changes next drawn card',()=>{
 const f=prepare('N05'),q=play(f),window=q.players[0].deck.slice(0,4).map(c=>c.uid);
 let s=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:null},{actor:0});
 assert.equal(s.pending.kind,'effect-top-order');
 for(const uid of [...window.slice(0,3)].reverse())
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid},{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[2]));
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[1],window[0]]);
 assert.equal(s.rng,q.rng);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('top 2 with no outside permission skips selection, orders straight to bottom, never leaks a card',()=>{
 const f=prepare('N06'),q=play(f),window=q.players[0].deck.slice(0,2).map(x=>x.uid);
 assert.equal(q.pending.kind,'effect-top-order');
 assert.equal(labels(q,1),null);
 assert.deepEqual(labels(q,0).options.map(x=>x.action.uid),window);
 assert.ok(!actions(q).some(a=>a.type==='chooseInspectedOutside'));
 let s=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid:window[1]},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:window[0]},{actor:0});
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[window[1],window[0]]);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('inside paid gate: boolean deck search waits for payment; top-order window finishes before outside draw',()=>{
 const f=prepare('N07');
 // Ensure the sample has at least one matching Scout in deck after setup.
 const card=take(f.s,0,'N02');f.s.players[0].deck.unshift(card);
 const q=play(f),before=q.players[0].deck.length,old=structuredClone(q);
 assert.equal(q.pending.kind,'effect-discard-gate');
 const pass=dispatchUniversalAction(packs,q,{type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(pass.pending,null);
 assert.equal(pass.players[0].deck.length,before-1);
 const paidAction=actions(q).find(a=>a.uid!==null);
 let s=dispatchUniversalAction(packs,q,paidAction,{actor:0});
 assert.equal(s.pending.kind,'effect-search-deck-multi');
 const found=actions(s).find(a=>a.uid!==null);
 assert.ok(found);
 s=dispatchUniversalAction(packs,s,found,{actor:0});
 assert.equal(s.pending.kind,'effect-top-inspect');
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null},{actor:0});
 assert.equal(s.pending.kind,'effect-top-order');
 while(s.pending?.kind==='effect-top-order'){
  const action=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
  s=dispatchUniversalAction(packs,s,action,{actor:0});
 }
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===paidAction.uid));
 assert.equal(s.players[0].deck.length,before-2,
  'one searched card and one queued draw leave deck; paid cost comes from hand');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.deepEqual(q,old);
});

test('compound and inspect templates strictly reject invalid clauses, counts, modes and hidden nested options',()=>{
 const invalid=[
  {template:'searchDeckWhere',filters:[all[0]],logic:'all',count:1,optional:true,shuffle:true},
  {template:'searchDeckWhere',filters:[all[0],all[0]],logic:'all',count:1,optional:true,shuffle:true},
  {template:'searchDeckWhere',filters:all,logic:'xor',count:2,optional:true,shuffle:true},
  {template:'searchDeckWhere',filters:all,logic:'all',count:6,optional:true,shuffle:true},
  {template:'searchDeckWhere',filters:[all[0],{field:'location',value:'hand'}],
   logic:'any',count:2,optional:true,shuffle:true},
  {template:'inspectTopArrange',count:1,toOutside:true,rest:'bottom'},
  {template:'inspectTopArrange',count:3,toOutside:'yes',rest:'bottom'},
  {template:'inspectTopArrange',count:3,toOutside:true,rest:'remove'},
  {template:'payDiscardThen',optional:true,then:[
   {template:'searchDeckWhere',filters:all,logic:'all',count:1,optional:true,shuffle:false}
  ]}
 ];
 const base={id:'BAD',name:'Bad',type:'character',color:'green',energy:0,ap:1,bp:2000,
  gen:1,implementation:'dsl'};
 for(const x of invalid)assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...base,templateEffects:{onPlay:[x]}}
 ]}),/invalid|incompatible|unsupported/,JSON.stringify(x));
 const authored=all.map(x=>({...x}));
 const good=createUniversalPack({id:'frozen',cards:[{...base,templateEffects:{onPlay:[
  {template:'payDiscardThen',optional:true,then:[
   {template:'searchDeckWhere',filters:authored,logic:'all',count:1,optional:true,shuffle:true}
  ]}
 ]}}]});
 const clauses=good.cards.BAD.effects.onPlay[0].then[0].filters;
 assert.ok(Object.isFrozen(clauses)&&clauses.every(Object.isFrozen));
 authored[0].value='Tampered';
 assert.equal(clauses[0].value,'green');
});

test('top inspection handles exhausted decks and a one-card window without illegal choices',()=>{
 for(const left of [0,1]){
  const f=prepare('N04');
  const pl=f.s.players[0];
  while(pl.deck.length>left)pl.outside.push(pl.deck.pop());
  assert.equal(assertUniversalMatch(packs,f.s),true);
  const suspended=play(f);
  if(left===0){
   assert.equal(suspended.pending,null);
   assert.equal(suspended.players[0].deck.length,0);
   assert.equal(assertUniversalMatch(packs,suspended),true);
  }else{
   assert.equal(suspended.pending.kind,'effect-top-inspect');
   const uid=suspended.players[0].deck[0].uid;
   assert.deepEqual(actions(suspended),[
    {type:'chooseInspectedOutside',uid:null},
    {type:'chooseInspectedOutside',uid}
   ]);
   const kept=dispatchUniversalAction(packs,suspended,
    {type:'chooseInspectedOutside',uid:null},{actor:0});
   assert.equal(kept.pending.kind,'effect-top-order');
   const reordered=dispatchUniversalAction(packs,kept,
    {type:'chooseTopOrder',uid},{actor:0});
   assert.equal(reordered.pending,null);
   assert.equal(reordered.players[0].deck.length,0);
   assert.ok(reordered.players[0].hand.some(c=>c.uid===uid),
    'trailing draw collects the only inspected top card after arranging');
   const sent=dispatchUniversalAction(packs,suspended,
    {type:'chooseInspectedOutside',uid},{actor:0});
   assert.equal(sent.pending,null);
   assert.equal(sent.players[0].deck.length,0);
   assert.ok(sent.players[0].outside.some(c=>c.uid===uid));
   assert.equal(assertUniversalMatch(packs,reordered),true);
   assert.equal(assertUniversalMatch(packs,sent),true);
  }
 }
});
