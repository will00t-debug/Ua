import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalActor,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'Q'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));
counts.Q12=2;
function makePack(title,scout){
 const list=ids.map((id,i)=>({
  id,name:i===2?(scout?'Scout Alpha':'Other World Hero'):'Unit '+i,
  type:'character',color:'green',energy:i===0?0:2,ap:1,bp:2000,
  gen:i===0?4:1,traits:i===2&&scout?['Scout']:[],
  implementation:'vanilla'
 }));
 function apply(index,operations){
  list[index]={...list[index],implementation:'dsl',templateEffects:{onPlay:operations}};
 }
 apply(1,[
  {template:'searchDeckOne',filter:{field:'trait',value:'Scout'},optional:false,shuffle:true},
  {template:'draw',count:1}
 ]);
 apply(4,[
  {template:'recoverOutsideOne',filter:{field:'name',value:'Scout Alpha'},optional:true},
  {template:'draw',count:1}
 ]);
 apply(5,[{template:'discardToDraw',count:2,optional:true}]);
 apply(6,[
  {template:'searchDeckOne',filter:{field:'name',value:'Nonexistent Hero'},optional:false,shuffle:true},
  {template:'draw',count:1}
 ]);
 apply(7,[
  {template:'recoverOutsideOne',filter:{field:'name',value:'Scout Alpha'},optional:false},
  {template:'draw',count:1}
 ]);
 apply(8,[
  {template:'searchDeckOne',filter:{field:'name',value:'Scout Alpha'},optional:true,shuffle:true},
  {template:'draw',count:1}
 ]);
 return createUniversalPack({id:title,cards:list,version:'test-template-2'});
}
const packs=[makePack('first-title',true),makePack('second-title',false)];
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[counts,counts],seed:713,first});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],at=arr.findIndex(x=>x.cardId===id);
  if(at>=0)return arr.splice(at,1)[0];
 }
 throw Error('Missing physical card '+p+'/'+id);
}
function advance(s){
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function prepare(p,id){
 let s=fresh(p),pl=s.players[p];
 const energy=take(s,p,'Q00'),effect=take(s,p,id);
 pl.energy[0]=energy;pl.hand.push(effect);
 s=advance(s);
 assert.equal(assertUniversalMatch(packs,s),true);
 const action=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===effect.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'expected legal character play '+id);
 return {s,action,effect,owner:p};
}
function play(f){
 return dispatchUniversalAction(packs,f.s,f.action,{actor:f.owner});
}
const legal=s=>legalUniversalActions(packs,s);

test('mandatory private deck search selects only own printed-trait physical cards, then shuffles and continues draw',()=>{
 const f=prepare(0,'Q01'),s=f.s,owner=0;
 const handBefore=s.players[0].hand.length,deckBefore=s.players[0].deck.length;
 const original=structuredClone(s);
 const q=play(f);
 assert.equal(q.pending.kind,'effect-search-deck');
 assert.equal(universalActor(q),0);
 assert.ok(q.effectQueue.some(x=>x.op==='draw'),'following jobs must wait');
 assert.equal(q.players[0].deck.length,deckBefore,'no draw before search choice');
 const choices=legal(q);
 assert.ok(choices.length>0);
 assert.ok(choices.every(a=>a.type==='chooseDeckSearch'&&a.uid!==null));
 assert.ok(choices.every(a=>q.players[0].deck.find(c=>c.uid===a.uid)?.cardId==='Q02'));
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseDeckSearch',uid:null},{actor:0}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseDeckSearch',uid:q.players[1].deck[0].uid},{actor:0}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,q,choices[0],{actor:1}),/Wrong player turn/);
 const attackerSideView=universalPublicView(packs,q,1);
 const text=JSON.stringify(attackerSideView);
 assert.deepEqual(attackerSideView.pending,{kind:'effect-search-deck',player:0});
 assert.equal(universalPrivateChoices(packs,q,1),null,'opponent cannot access search candidates');
 const privateView=universalPrivateChoices(packs,q,0);
 assert.equal(privateView.kind,'effect-search-deck');
 assert.ok(privateView.options.every(x=>x.card?.cardId==='Q02'));
 assert.ok(privateView.options.every(x=>x.card?.name==='Scout Alpha'));
 assert.deepEqual(privateView.options.map(x=>x.action),choices);
 assert.throws(()=>universalPrivateChoices(packs,q,2),/Invalid private choice viewer/);
 assert.equal(attackerSideView.players[0].hand,null);
 assert.ok(!text.includes(choices[0].uid),
  'private search candidate UID must not appear in opponent public view');
 assert.deepEqual(s,original);
 const after=dispatchUniversalAction(packs,q,choices[0],{actor:0});
 assert.equal(after.pending,null);
 assert.ok(after.players[0].hand.some(c=>c.uid===choices[0].uid));
 assert.equal(after.players[0].deck.length,deckBefore-2,
  'exactly one searched physical card and one later drawn physical card left deck');
 assert.equal(after.players[0].hand.length,handBefore-1+2,
  'ordinary play, searched card, and queued draw conserve inventory');
 assert.notEqual(after.rng,q.rng,'search shuffles after selection');
 assert.equal(assertUniversalMatch(packs,after),true);
 const ai=chooseUniversalAiAction(packs,q,{difficulty:'hard'});
 assert.ok(choices.some(a=>a.uid===ai.uid));
});

test('optional search can be skipped but MUST shuffle and continue later printed effects',()=>{
 const f=prepare(0,'Q08'),q=play(f);
 assert.equal(q.pending.kind,'effect-search-deck');
 assert.ok(legal(q).some(a=>a.type==='chooseDeckSearch'&&a.uid===null));
 const before=structuredClone(q);
 const skipped=dispatchUniversalAction(packs,q,{type:'chooseDeckSearch',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,q.players[0].deck.length-1,
  'only subsequent draw moves a card; skipped search retrieves none');
 assert.notEqual(skipped.rng,q.rng);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.deepEqual(q,before,'skipping cannot mutate the input state');
});

test('search with no matching card silently shuffles, skips pending, and continues next operation',()=>{
 const f=prepare(0,'Q06'),before=f.s.players[0].deck.length;
 const r=play(f);
 assert.equal(r.pending,null);
 assert.equal(r.players[0].deck.length,before-1);
 assert.notEqual(r.rng,f.s.rng);
 assert.equal(assertUniversalMatch(packs,r),true);
});

test('outside recovery is optional, limited to owned matching outside cards, and resumes the queue',()=>{
 const f=prepare(0,'Q04'),s=f.s;
 const eligible=take(s,0,'Q02');
 s.players[0].outside.push(eligible);
 const removed=take(s,0,'Q02');
 s.players[0].removed.push(removed);
 const enemy=take(s,1,'Q02');s.players[1].outside.push(enemy);
 const q=play(f);
 assert.equal(q.pending.kind,'effect-recover-outside');
 assert.deepEqual(legal(q),[
  {type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:eligible.uid}
 ]);
 assert.equal(universalPrivateChoices(packs,q,1),null);
 const options=universalPrivateChoices(packs,q,0).options;
 assert.equal(options[0].card,null);
 assert.deepEqual(options[1].card,{cardId:'Q02',name:'Scout Alpha',color:'green'});
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseOutsideRecovery',uid:enemy.uid},{actor:0}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseOutsideRecovery',uid:removed.uid},{actor:0}),/not currently legal/);
 const beforeDeck=q.players[0].deck.length;
 const recovered=dispatchUniversalAction(packs,q,{type:'chooseOutsideRecovery',uid:eligible.uid},{actor:0});
 assert.ok(recovered.players[0].hand.some(c=>c.uid===eligible.uid));
 assert.ok(!recovered.players[0].outside.some(c=>c.uid===eligible.uid));
 assert.ok(recovered.players[0].removed.some(c=>c.uid===removed.uid));
 assert.equal(recovered.players[0].deck.length,beforeDeck-1,
  'following draw happens AFTER successful recovery');
 assert.equal(assertUniversalMatch(packs,recovered),true);
 const skip=dispatchUniversalAction(packs,q,{type:'chooseOutsideRecovery',uid:null},{actor:0});
 assert.ok(skip.players[0].outside.some(c=>c.uid===eligible.uid));
 assert.equal(skip.players[0].deck.length,beforeDeck-1);
 assert.equal(assertUniversalMatch(packs,skip),true);
});

test('mandatory recovery with no match automatically advances and cannot steal the opposite title matching ID',()=>{
 const f=prepare(1,'Q07');
 const enemy=take(f.s,0,'Q02');f.s.players[0].outside.push(enemy);
 const before=f.s.players[1].deck.length;
 const r=play(f);
 assert.equal(r.pending,null);
 assert.equal(r.players[1].deck.length,before-1);
 assert.ok(r.players[0].outside.some(c=>c.uid===enemy.uid));
 assert.equal(assertUniversalMatch(packs,r),true);
});

test('discard-one cost pays before drawing two cards and optional skip does not pay or draw',()=>{
 const f=prepare(0,'Q05'),q=play(f);
 assert.equal(q.pending.kind,'effect-discard-cost');
 const beforeHand=q.players[0].hand.length;
 const beforeDeck=q.players[0].deck.length;
 assert.ok(legal(q).some(a=>a.uid===null));
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.ok(universalPrivateChoices(packs,q,0).options.some(x=>x.card?.cardId));
 const snapshot=structuredClone(q);
 const pass=dispatchUniversalAction(packs,q,{type:'chooseDiscardCost',uid:null},{actor:0});
 assert.equal(pass.pending,null);
 assert.equal(pass.players[0].hand.length,beforeHand);
 assert.equal(pass.players[0].deck.length,beforeDeck);
 assert.equal(assertUniversalMatch(packs,pass),true);
 const paidAction=legal(q).find(a=>a.uid!==null);
 const paid=dispatchUniversalAction(packs,q,paidAction,{actor:0});
 assert.ok(paid.players[0].outside.some(c=>c.uid===paidAction.uid));
 assert.equal(paid.players[0].hand.length,beforeHand+1);
 assert.equal(paid.players[0].deck.length,beforeDeck-2);
 assert.equal(paid.pending,null);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.deepEqual(q,snapshot);
 const ai=chooseUniversalAiAction(packs,q,{difficulty:'normal'});
 assert.ok(legal(q).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 assert.equal(ai.uid!==null,true);
 assert.equal(chooseUniversalAiAction(packs,q,{difficulty:'easy'}).uid,null);
});

test('empty hand cannot pay discard-to-draw and never draws for free',()=>{
 const f=prepare(0,'Q05');
 const pl=f.s.players[0];
 const held=pl.hand.splice(0);
 pl.deck.push(...held.filter(c=>c.uid!==f.effect.uid));
 pl.hand.push(f.effect);
 const q=play(f);
 assert.equal(q.pending,null);
 assert.equal(q.players[0].deck.length,pl.deck.length);
 assert.equal(q.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(packs,q),true);
});

test('strict schema rejects covert filters, unknown source zones and unsafe cost counts',()=>{
 const basic=Array.from({length:13},(_,i)=>({
  id:'X'+String(i).padStart(2,'0'),name:'Unit '+i,
  type:'character',energy:0,ap:1,bp:1000,gen:1,color:'green',
  implementation:'vanilla'
 }));
 const rejects=[
  {template:'searchDeckOne',filter:{field:'name',value:'A'},optional:true},
  {template:'searchDeckOne',filter:{field:'hand',value:'A'},optional:true,shuffle:true},
  {template:'searchDeckOne',filter:{field:'name',value:'A',secret:true},optional:true,shuffle:true},
  {template:'searchDeckOne',filter:{field:'type',value:'monster'},optional:true,shuffle:true},
  {template:'recoverOutsideOne',filter:{field:'name',value:'A'},optional:'yes'},
  {template:'discardToDraw',count:0,optional:true},
  {template:'discardToDraw',count:11,optional:true},
  {template:'discardToDraw',count:1},
  {template:'recoverHandOne',filter:{field:'name',value:'A'},optional:true}
 ];
 for(const invalid of rejects){
  const card={...basic[0],implementation:'dsl',templateEffects:{onPlay:[invalid]}};
  assert.throws(()=>createUniversalPack({id:'bad-fixture',cards:[card]}),
   /invalid|unknown\/invalid/,JSON.stringify(invalid));
 }
 const raw={...basic[0],implementation:'dsl',effects:{onPlay:[
  {op:'recoverOutsideOne',filter:{field:'name',value:'Unit 1'},optional:true,extra:1}
 ]}};
 assert.throws(()=>createUniversalPack({id:'raw-must-validate',cards:[raw]}),/invalid searched-card filter/);
});

test('printed filter objects are deeply frozen, including when supplied as mutable template input',()=>{
 const filter={field:'name',value:'Scout Alpha'};
 const author=ids.map((id,i)=>({
  id,name:'Unit '+i,type:'character',energy:0,ap:1,bp:1000,gen:1,color:'green',
  implementation:i===0?'dsl':'vanilla',
  ...(i===0?{templateEffects:{onPlay:[
   {template:'searchDeckOne',filter,shuffle:true,optional:false}
  ]}}:{})
 }));
 const pack=createUniversalPack({id:'immutable-filter',cards:author});
 assert.equal(Object.isFrozen(pack.cards.Q00.effects.onPlay[0].filter),true);
 filter.value='Malicious Changed Target';
 assert.equal(pack.cards.Q00.effects.onPlay[0].filter.value,'Scout Alpha');
 assert.throws(()=>{pack.cards.Q00.effects.onPlay[0].filter.value='Tampered';},TypeError);
});
