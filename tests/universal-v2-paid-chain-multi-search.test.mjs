import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices
} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'M'+String(i).padStart(2,'0'));
const deck=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));
deck.M12=2;
const scoutFilter={field:'trait',value:'Scout'};
const nameFilter={field:'name',value:'Scout Alpha'};
function title(id,withScout){
 const cards=ids.map((cardId,i)=>({
  id:cardId,name:i===2?(withScout?'Scout Alpha':'Other World Hero'):'Unit '+i,
  type:'character',color:'green',energy:i===0?0:2,ap:1,bp:2000,
  gen:i===0?4:1,traits:i===2&&withScout?['Scout']:[],
  implementation:'vanilla'
 }));
 cards[1]={...cards[1],implementation:'dsl',templateEffects:{onPlay:[
  {template:'searchDeckMany',filter:scoutFilter,count:3,optional:true,shuffle:true},
  {template:'draw',count:1}
 ]}};
 cards[3]={...cards[3],implementation:'dsl',templateEffects:{onPlay:[
  {template:'payDiscardThen',optional:true,then:[
   {template:'draw',count:1},
   {template:'searchDeckOne',filter:nameFilter,optional:true,shuffle:true},
   {template:'enemyBpDown',bp:2500,optional:false}
  ]},
  {template:'draw',count:1}
 ]}};
 cards[5]={...cards[5],implementation:'dsl',templateEffects:{onPlay:[
  {template:'searchDeckMany',filter:{field:'name',value:'Absent'},
   count:5,optional:false,shuffle:true},
  {template:'draw',count:1}
 ]}};
 cards[6]={...cards[6],implementation:'dsl',templateEffects:{onAttack:[
  {template:'payDiscardThen',optional:true,then:[
   {template:'enemyBpDown',bp:2500,optional:false}
  ]}
 ]}};
 cards[7]={...cards[7],implementation:'dsl',templateEffects:{onPlay:[
  {template:'searchDeckMany',filter:scoutFilter,count:5,optional:false,shuffle:true},
  {template:'draw',count:1}
 ]}};
 return createUniversalPack({id,cards,version:'multisearch-gate-1'});
}
const packs=[title('green-scouts',true),title('green-other',false)];
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[deck,deck],seed:1102,first});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const x=s.players[p][zone],at=x.findIndex(c=>c.cardId===id);
  if(at>=0)return x.splice(at,1)[0];
 }
 throw Error('Missing test physical card '+p+'/'+id);
}
function moveScoutsIntoDeck(s,p){
 const pl=s.players[p];
 for(const zone of ['hand','life']){
  for(let i=pl[zone].length-1;i>=0;i--){
   if(pl[zone][i].cardId==='M02')pl.deck.push(pl[zone].splice(i,1)[0]);
  }
 }
}
function fixture(id,p=0){
 let s=fresh(p);
 const energy=take(s,p,'M00'),effect=take(s,p,id);
 s.players[p].energy[0]=energy;s.players[p].hand.push(effect);
 moveScoutsIntoDeck(s,p);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const a=legalUniversalActions(packs,s).find(x=>
  x.type==='play'&&x.uid===effect.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,p,effect,a};
}
function play(f){return dispatchUniversalAction(packs,f.s,f.a,{actor:f.p});}
const legal=s=>legalUniversalActions(packs,s);

test('multi-deck-search takes exactly three matching owned cards, one choice at a time, shuffles only once and then draws',()=>{
 const f=fixture('M01'),before=f.s,original=structuredClone(before);
 const suspended=play(f),startDeck=suspended.players[0].deck.length,oldRng=suspended.rng;
 assert.equal(suspended.pending.kind,'effect-search-deck-multi');
 assert.equal(suspended.pending.remaining,3);
 assert.equal(suspended.pending.player,0);
 assert.deepEqual(universalPublicView(packs,suspended,1).pending,
  {kind:'effect-search-deck-multi',player:0});
 assert.equal(universalPrivateChoices(packs,suspended,1),null);
 const privateView=universalPrivateChoices(packs,suspended,0);
 assert.equal(privateView.options[0].action.uid,null);
 assert.equal(privateView.options[0].card,null);
 assert.ok(privateView.options.slice(1).every(x=>x.card?.cardId==='M02'));
 assert.ok(!JSON.stringify(universalPublicView(packs,suspended,1)).includes(
  privateView.options[1].action.uid));
 const selected=[];
 let current=suspended;
 for(let n=0;n<3;n++){
  const actions=legal(current);
  const chosen=actions.find(x=>x.uid!==null);
  assert.ok(chosen);
  assert.ok(!selected.includes(chosen.uid),'same physical card cannot be selected twice');
  selected.push(chosen.uid);
  const next=dispatchUniversalAction(packs,current,chosen,{actor:0});
  if(n<2){
   assert.equal(next.pending.kind,'effect-search-deck-multi');
   assert.equal(next.pending.remaining,2-n);
   assert.equal(next.rng,oldRng,'do not shuffle midway through selection');
   assert.equal(next.players[0].deck.length,startDeck-n-1);
  }
  current=next;
 }
 assert.equal(current.pending,null);
 assert.notEqual(current.rng,oldRng,'single shuffle occurs after final search');
 assert.equal(current.players[0].deck.length,startDeck-4,
  '3 searched cards plus 1 later queued draw');
 for(const uid of selected)assert.ok(current.players[0].hand.some(x=>x.uid===uid));
 assert.equal(assertUniversalMatch(packs,current),true);
 assert.deepEqual(before,original);
});

test('optional search can stop after one selected card and still run one final shuffle and later draw',()=>{
 const f=fixture('M01'),s=play(f),initial=s.players[0].deck.length;
 const chosen=legal(s).find(x=>x.uid!==null);
 const first=dispatchUniversalAction(packs,s,chosen,{actor:0});
 assert.equal(first.pending.remaining,2);
 const skipped=dispatchUniversalAction(packs,first,{type:'chooseDeckSearchMulti',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,initial-2);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===chosen.uid));
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('no valid own-deck matches produces no pending decision, shuffles and continues only legal jobs',()=>{
 for(const [id,p] of [['M05',0],['M01',1]]){
  const f=fixture(id,p),before=f.s.players[p].deck.length,oldRng=f.s.rng;
  const done=play(f);
  assert.equal(done.pending,null);
  assert.equal(done.players[p].deck.length,before-1,
   'the downstream draw still happens without fake search gains');
  assert.notEqual(done.rng,oldRng);
  assert.equal(assertUniversalMatch(packs,done),true);
 }
});

test('paid multi-step effects execute only after real discard and preserve target -> search -> draw timing',()=>{
 const f=fixture('M03');
 const target=take(f.s,1,'M08');f.s.players[1].front[0]=target;
 const q=play(f);
 assert.equal(q.pending.kind,'effect-discard-gate');
 const deckBefore=q.players[0].deck.length,handBefore=q.players[0].hand.length;
 const option=legal(q).find(a=>a.uid===null);
 assert.ok(option);
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.ok(universalPrivateChoices(packs,q,0).options.some(x=>x.card?.cardId));
 const snapshot=structuredClone(q);
 const rejected=dispatchUniversalAction(packs,q,option,{actor:0});
 assert.equal(rejected.pending,null);
 assert.equal(rejected.players[0].deck.length,deckBefore-1,
  'unconditional trailing draw still resolves, but gated draw/search/effect do not');
 assert.equal(rejected.players[0].hand.length,handBefore+1);
 assert.ok(rejected.players[1].front.some(c=>c?.uid===target.uid));
 assert.equal(assertUniversalMatch(packs,rejected),true);
 const ai=chooseUniversalAiAction(packs,q,{difficulty:'hard'});
 assert.ok(ai.uid!==null);
 assert.equal(chooseUniversalAiAction(packs,q,{difficulty:'easy'}).uid,null);
 const paid=dispatchUniversalAction(packs,q,ai,{actor:0});
 assert.ok(paid.players[0].outside.some(x=>x.uid===ai.uid),
  'selected cost must enter outside before any gated benefit');
 assert.equal(paid.pending.kind,'effect-search-deck');
 assert.equal(paid.players[0].deck.length,deckBefore-1,'paid draw runs before search');
 assert.ok(paid.effectQueue.some(e=>e.op==='enemyBpDown'));
 assert.ok(paid.effectQueue.some(e=>e.op==='draw'));
 const search=legal(paid).find(a=>a.uid!==null);
 assert.ok(search);
 const afterSearch=dispatchUniversalAction(packs,paid,search,{actor:0});
 assert.equal(afterSearch.pending.kind,'effect-target');
 assert.equal(afterSearch.players[0].deck.length,deckBefore-2);
 assert.ok(legal(afterSearch).some(a=>a.uid===target.uid));
 const ended=dispatchUniversalAction(packs,afterSearch,
  {type:'chooseTarget',uid:target.uid},{actor:0});
 assert.equal(ended.pending,null);
 assert.equal(ended.players[1].front[0],null,'BP reduction resolves after search selection');
 assert.equal(ended.players[0].deck.length,deckBefore-3,
  'last unconditional draw resumes after target decision');
 assert.equal(assertUniversalMatch(packs,ended),true);
 assert.deepEqual(q,snapshot);
});

test('attack-time paid effect is decided before blocker choice and skipped cost never applies enemy BP effect',()=>{
 let s=fresh();
 const attacker=take(s,0,'M06'),target=take(s,1,'M08');
 attacker.ready=true;s.players[0].front[0]=attacker;
 target.ready=true;s.players[1].front[0]=target;
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 const before=structuredClone(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.ok(!legal(s).some(x=>x.type==='chooseBlock'));
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(skipped.pending.kind,'block');
 assert.ok(legal(skipped).some(x=>x.uid===target.uid));
 assert.equal(assertUniversalMatch(packs,skipped),true);
 const paidChoice=legal(s).find(a=>a.uid!==null);
 const paid=dispatchUniversalAction(packs,s,paidChoice,{actor:0});
 assert.equal(paid.pending.kind,'effect-target');
 const applied=dispatchUniversalAction(packs,paid,{type:'chooseTarget',uid:target.uid},{actor:0});
 assert.equal(applied.pending.kind,'block');
 assert.ok(applied.players[1].outside.some(x=>x.uid===target.uid));
 assert.deepEqual(legal(applied),[{type:'chooseBlock',uid:null}]);
 assert.equal(assertUniversalMatch(packs,applied),true);
 assert.equal(assertUniversalMatch(packs,before),true);
});

test('invalid nested operations, recursive cost gates and non-raid base timing fail closed',()=>{
 const sample={
  id:'BAD',name:'Invalid gate',type:'character',energy:0,ap:1,bp:1000,
  gen:1,color:'green',implementation:'dsl'
 };
 const bad=[
  {template:'searchDeckMany',filter:scoutFilter,count:0,optional:true,shuffle:true},
  {template:'searchDeckMany',filter:scoutFilter,count:6,optional:true,shuffle:true},
  {template:'searchDeckMany',filter:scoutFilter,count:3,optional:true,shuffle:false},
  {template:'payDiscardThen',optional:true,then:[]},
  {template:'payDiscardThen',optional:true,then:[{template:'discardToDraw',optional:true,count:2}]},
  {template:'payDiscardThen',optional:true,then:[
   {template:'payDiscardThen',optional:true,then:[{template:'draw',count:1}]}
  ]},
  {template:'payDiscardThen',optional:true,then:[{template:'draw',count:-1}]}
 ];
 for(const x of bad)assert.throws(
  ()=>createUniversalPack({id:'bad-template',cards:[{...sample,templateEffects:{onPlay:[x]}}]}),
  /invalid|incompatible|unsupported/,JSON.stringify(x)
 );
 assert.throws(()=>createUniversalPack({id:'bad-timing',cards:[{
  ...sample,templateEffects:{onRaided:[
   {template:'payDiscardThen',optional:true,then:[{template:'draw',count:1}]}
  ]}
 }]}),/unsupported Raid-base timing effect/);
 const filter={field:'name',value:'Scout Alpha'};
 const pack=createUniversalPack({id:'nested-freeze',cards:[{
  ...sample,templateEffects:{onPlay:[
   {template:'payDiscardThen',optional:true,then:[
    {template:'searchDeckMany',filter,count:2,optional:true,shuffle:true}
   ]}
  ]}}
 ]});
 const gate=pack.cards.BAD.effects.onPlay[0];
 assert.equal(Object.isFrozen(gate.then),true);
 assert.equal(Object.isFrozen(gate.then[0].filter),true);
 filter.value='Tampered';
 assert.equal(gate.then[0].filter.value,'Scout Alpha');
 assert.throws(()=>{gate.then[0].filter.value='Tampered';},TypeError);
});

test('mandatory up-to-five search with only four matching cards completes automatically after fourth selection',()=>{
 const f=fixture('M07'),q=play(f),before=q.players[0].deck.length;
 assert.equal(q.pending.kind,'effect-search-deck-multi');
 assert.equal(q.pending.remaining,5);
 assert.equal(legal(q).some(a=>a.uid===null),false);
 let current=q;
 const selected=new Set();
 for(let i=0;i<4;i++){
  const option=legal(current).find(a=>a.uid!==null);
  assert.ok(option);
  selected.add(option.uid);
  current=dispatchUniversalAction(packs,current,option,{actor:0});
  if(i<3)assert.equal(current.pending.kind,'effect-search-deck-multi');
 }
 assert.equal(selected.size,4);
 assert.equal(current.pending,null,'no fifth eligible card: mandatory search must finish');
 assert.equal(current.players[0].deck.length,before-5,
  'four matching physical cards plus one queued draw');
 assert.equal(assertUniversalMatch(packs,current),true);
});

test('unpayable mandatory or optional discard gate never schedules paid benefits',()=>{
 const f=fixture('M03'),pl=f.s.players[0];
 const nonSource=pl.hand.filter(c=>c.uid!==f.effect.uid);
 pl.hand=pl.hand.filter(c=>c.uid===f.effect.uid);
 pl.deck.push(...nonSource);
 const target=take(f.s,1,'M08');f.s.players[1].front[0]=target;
 assert.equal(assertUniversalMatch(packs,f.s),true);
 const before=pl.deck.length;
 const done=play(f);
 assert.equal(done.pending,null,'no remaining hand card means no valid payment');
 assert.equal(done.players[0].deck.length,before-1,
  'only unrelated trailing draw resolves');
 assert.equal(done.players[0].hand.length,1);
 assert.equal(done.players[1].front[0]?.uid,target.uid);
 assert.equal(assertUniversalMatch(packs,done),true);
});
