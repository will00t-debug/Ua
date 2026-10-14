import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const ids=Array.from({length:13},(_,i)=>'Y'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));counts.Y12=2;
function title(name,ownTrait){
 const cards=ids.map((id,i)=>({
  id,name:'Unit '+i,type:'character',color:i===12?'purple':'green',
  energy:i===0?0:2,ap:1,bp:2000,gen:i===0?4:1,
  traits:i===1||i===2?(ownTrait?['Scout']:['Enemy']):[],
  implementation:'vanilla'
 }));
 cards[1]={...cards[1],implementation:'dsl',templateEffects:{onPlay:[
  {template:'buffOwnField',filter:{field:'trait',value:'Scout'},
   bp:1500,optional:true,excludeSelf:true},{template:'draw',count:1}
 ]}};
 cards[5]={...cards[5],implementation:'dsl',templateEffects:{onPlay:[
  {template:'payDiscardThen',optional:true,then:[
   {template:'buffOwnField',filter:{field:'name',value:'Unit 2'},
    bp:1000,optional:false,excludeSelf:false}
  ]},{template:'draw',count:1}
 ]}};
 return createUniversalPack({id:name,cards});
}
const packs=[title('own-scout',true),title('different-title',false)];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const items=s.players[p][zone],i=items.findIndex(c=>c.cardId===id);
  if(i>=0)return items.splice(i,1)[0];
 }
 throw Error('Missing fixture card');
}
function prepare(effect='Y01',target=true){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:180,first:0});
 const g=take(s,0,'Y00'),source=take(s,0,effect);
 s.players[0].energy[0]=g;s.players[0].hand.push(source);
 let ally=null;
 if(target){ally=take(s,0,'Y02');s.players[0].front[1]=ally;}
 const enemy=take(s,1,'Y02');s.players[1].front[0]=enemy;
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const a=legalUniversalActions(packs,s).find(x=>x.type==='play'&&
  x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a);
 return {s,source,ally,enemy,a};
}
test('own-field buff excludes printed source, rejects cross-title opponent even with same local ID and waits before draw',()=>{
 const f=prepare(),before=structuredClone(f.s);
 const deckBefore=f.s.players[0].deck.length;
 const pending=dispatchUniversalAction(packs,f.s,f.a,{actor:0});
 assert.equal(pending.pending.kind,'effect-buff-own');
 assert.equal(pending.pending.player,0);
 const actions=legalUniversalActions(packs,pending);
 assert.deepEqual(actions,[
  {type:'chooseOwnBuff',uid:null},
  {type:'chooseOwnBuff',uid:f.ally.uid}
 ]);
 assert.ok(!actions.some(a=>a.uid===f.enemy.uid||a.uid===f.source.uid));
 assert.equal(pending.players[0].deck.length,deckBefore);
 assert.deepEqual(universalPublicView(packs,pending,1).pending,
  {kind:'effect-buff-own',player:0});
 assert.throws(()=>dispatchUniversalAction(packs,pending,
  {type:'chooseOwnBuff',uid:f.enemy.uid},{actor:0}),/not currently legal/);
 const hard=chooseUniversalAiAction(packs,pending,{difficulty:'hard'});
 assert.equal(hard.uid,f.ally.uid);
 const after=dispatchUniversalAction(packs,pending,hard,{actor:0});
 assert.equal(after.pending,null);
 assert.equal(after.players[0].deck.length,deckBefore-1);
 assert.equal(universalBp(packs,after,after.players[0].front[1]),3500);
 assert.equal(universalBp(packs,after,after.players[0].front[0]),2000);
 assert.equal(universalBp(packs,after,after.players[1].front[0]),2000);
 assert.equal(assertUniversalMatch(packs,after),true);
 assert.deepEqual(f.s,before);
});

test('no legal own trait candidate fizzles optional buff and still performs following mandatory draw',()=>{
 const f=prepare('Y01',false),before=f.s.players[0].deck.length;
 const s=dispatchUniversalAction(packs,f.s,f.a);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('declining optional own buff still continues following queue exactly once',()=>{
 const f=prepare(),q=dispatchUniversalAction(packs,f.s,f.a);
 const before=q.players[0].deck.length;
 const s=dispatchUniversalAction(packs,q,{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(universalBp(packs,s,s.players[0].front[1]),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('paid discard cost gates own-field buff; no payment means neither selection nor buff',()=>{
 const f=prepare('Y05'),q=dispatchUniversalAction(packs,f.s,f.a);
 assert.equal(q.pending.kind,'effect-discard-gate');
 const deckBefore=q.players[0].deck.length;
 const skip=dispatchUniversalAction(packs,q,{type:'chooseDiscardGate',uid:null});
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].deck.length,deckBefore-1);
 assert.equal(universalBp(packs,skip,skip.players[0].front[1]),2000);
 const paid=legalUniversalActions(packs,q).find(a=>a.uid!==null);
 const chosen=dispatchUniversalAction(packs,q,paid,{actor:0});
 assert.equal(chosen.pending.kind,'effect-buff-own');
 assert.deepEqual(legalUniversalActions(packs,chosen),[
  {type:'chooseOwnBuff',uid:f.ally.uid}
 ]);
 const boosted=dispatchUniversalAction(packs,chosen,
  {type:'chooseOwnBuff',uid:f.ally.uid},{actor:0});
 assert.equal(boosted.pending,null);
 assert.equal(universalBp(packs,boosted,boosted.players[0].front[1]),3000);
 assert.equal(boosted.players[0].deck.length,deckBefore-1);
 assert.equal(assertUniversalMatch(packs,boosted),true);
});

test('strict template rejects missing optionality, unsupported filters and extra keys',()=>{
 const base={id:'BAD',name:'Bad',type:'character',energy:0,ap:1,bp:1500,
  gen:1,color:'green',implementation:'dsl'};
 const choices=[
  {template:'buffOwnField',filter:{field:'trait',value:'Scout'},bp:1000,excludeSelf:true},
  {template:'buffOwnField',filter:{field:'trait',value:'Scout'},bp:0,optional:true,excludeSelf:true},
  {template:'buffOwnField',filter:{field:'unknown',value:'Scout'},bp:1000,optional:true,excludeSelf:true},
  {template:'buffOwnField',filter:{field:'name',value:'Scout'},bp:1000,optional:'no',excludeSelf:true},
  {template:'buffOwnField',filter:{field:'name',value:'Scout'},bp:1000,optional:true,excludeSelf:true,magic:true}
 ];
 for(const effect of choices)assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...base,templateEffects:{onPlay:[effect]}}
 ]}),/invalid|unsupported/,JSON.stringify(effect));
});
