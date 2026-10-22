import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

// UA51BT/SLG-1-037 official 2026-04-17 FAQ Q2039:
// "元々のBP" is the number printed at bottom left of CHARACTER card.
const slg=createSlgV2Pack(),ttg=createTtgV2Pack(),packs=[ttg,slg];
const slgDeck=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-005']=2;slgDeck['SLG-1-037']=2;slgDeck['SLG-1-038']=2;
const ttgDeck=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const i=s.players[p][z].findIndex(c=>c.cardId===id);
 if(i>=0)return s.players[p][z].splice(i,1)[0];
}throw Error('Cannot find '+id);}
function main(pack,s){for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function realFixture(outsideId='SLG-1-016'){
 let s=newUniversalMatch(packs,{decks:[ttgDeck,slgDeck],first:1,seed:370037});
 const source=take(s,1,'SLG-1-037');s.players[1].hand.push(source);
 for(let i=0;i<4;i++){const g=take(s,1,'SLG-1-015');g.ready=true;s.players[1].energy[i]=g;}
 const outside=take(s,1,outsideId);s.players[1].outside.push(outside);
 s=main(packs,s);
 const event=legalUniversalActions(packs,s).find(x=>x.type==='event'&&x.uid===source.uid);
 assert.ok(event,'four real purple energy + one AP required');
 return {s,event,source,outside};
}
test('037 official event matches literal catalog, separate DRAW life, Q2039 printed 4000 recovery then draw',()=>{
 const c=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-037'),v2=slg.cards['SLG-1-037'];
 assert.equal(c.nameJa,'命の神水');assert.equal(c.trigger,'draw');
 assert.match(c.effect,/原本BP4000以下的角色/);
 assert.equal(v2.energy,4);assert.equal(v2.ap,1);assert.equal(v2.type,'event');
 assert.equal(v2.trigger,'draw');assert.equal(v2.bp,0);
 assert.deepEqual(v2.effects.onPlay,[
  {op:'recoverOutsidePrintedBp',bp:4000,optional:true},{op:'draw',count:1}
 ]);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
test('037 optional own-outside character recovery precedes unconditional draw and pays one event AP',()=>{
 let {s,event,source,outside}=realFixture();
 const n=s.players[1].deck.length,h=s.players[1].hand.length;
 const ap=s.players[1].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,event,{actor:1});
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.equal(s.players[1].deck.length,n,'must not draw before resolving optional recovery');
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,ap-1);
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===outside.uid));
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:outside.uid}
 ]);
 assert.equal(universalPrivateChoices(packs,s,0),null);
 const snapshot=structuredClone(s);
 for(const bad of [{type:'chooseOutsideRecovery',uid:'0-000000'},
  {type:'chooseOutsideRecovery',uid:source.uid}]){
  assert.throws(()=>dispatchUniversalAction(packs,s,bad,{actor:1}),/not currently legal/);
  assert.deepEqual(s,snapshot);
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:outside.uid},{actor:0}),/Wrong player/);
 const resolved=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:outside.uid},{actor:1});
 assert.equal(resolved.pending,null);
 assert.equal(resolved.players[1].deck.length,n-1,'draw happens exactly once AFTER recovery');
 assert.equal(resolved.players[1].hand.length,h-1+1+1,'played event, recovered, drew');
 assert.ok(resolved.players[1].hand.some(c=>c.uid===outside.uid));
 assert.ok(!resolved.players[1].outside.some(c=>c.uid===outside.uid));
 assert.equal(universalPublicView(packs,resolved,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,resolved),true);
});
test('037 optional skip STILL draws exactly one without recovering outside',()=>{
 const {s,event,outside}=realFixture();
 const deck=s.players[1].deck.length;
 const pending=dispatchUniversalAction(packs,s,event);
 const result=dispatchUniversalAction(packs,pending,{type:'chooseOutsideRecovery',uid:null},{actor:1});
 assert.equal(result.pending,null);
 assert.equal(result.players[1].deck.length,deck-1);
 assert.ok(result.players[1].outside.some(c=>c.uid===outside.uid));
 assert.equal(assertUniversalMatch(packs,result),true);
});
test('037 with NO eligible own-outside character performs unconditional one draw without pending',()=>{
 const {s,event}=realFixture('SLG-1-038');
 const n=s.players[1].deck.length;
 const done=dispatchUniversalAction(packs,s,event,{actor:1});
 assert.equal(done.pending,null);
 assert.equal(done.players[1].deck.length,n-1);
 assert.equal(assertUniversalMatch(packs,done),true);
});
test('strict generic printed BP selector ignores temporary changes and prohibits events/high printed BP',()=>{
 const printed=Array.from({length:13},(_,i)=>({
  id:'X-'+String(i),name:'Synthetic '+i,color:'purple',energy:0,ap:1,
  bp:i===0?4500:i===1?2000:i===12?0:1500,
  gen:i===12?0:1,type:i===12?'event':'character',
  implementation:i===12?'dsl':'vanilla',
  ...(i===12?{templateEffects:{onPlay:[
   {template:'recoverOutsidePrintedBp',bp:4000,optional:true},{template:'draw',count:1}
  ]}}:{effects:{}})
 }));
 const p=createUniversalPack({id:'synthetic-print-qa',cards:printed});
 const counts=Object.fromEntries(printed.map((c,i)=>[c.id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(p,counts),[]);
 let s=newUniversalMatch(p,{decks:[counts,counts],first:0,seed:370038});
 const source=take(s,0,'X-12'),tooHigh=take(s,0,'X-0'),low=take(s,0,'X-1'),
  outsideEvent=take(s,0,'X-12'),opponent=take(s,1,'X-1');
 source.ready=false;s.players[0].hand.push(source);
 tooHigh.buffs.push({bp:-3000,untilTurn:s.turn});
 low.buffs.push({bp:5000,untilTurn:s.turn});
 s.players[0].outside.push(tooHigh,low,outsideEvent);
 s.players[1].outside.push(opponent);
 s=main(p,s);
 const act=legalUniversalActions(p,s).find(a=>a.type==='event'&&a.uid===source.uid);
 assert.ok(act);
 const pending=dispatchUniversalAction(p,s,act);
 assert.deepEqual(legalUniversalActions(p,pending),[
  {type:'chooseOutsideRecovery',uid:null},{type:'chooseOutsideRecovery',uid:low.uid}
 ]);
 for(const uid of [tooHigh.uid,outsideEvent.uid,opponent.uid])
  assert.throws(()=>dispatchUniversalAction(p,pending,{type:'chooseOutsideRecovery',uid}),/not currently legal/);
 const out=dispatchUniversalAction(p,pending,{type:'chooseOutsideRecovery',uid:low.uid});
 assert.ok(out.players[0].hand.some(c=>c.uid===low.uid),'printed low BP allowed despite temporary boost');
 assert.ok(out.players[0].outside.some(c=>c.uid===tooHigh.uid),'printed 4500 excluded despite buff');
 assert.equal(assertUniversalMatch(p,out),true);
});
test('fail-closed printed-BP template rejects unknown modifiers and invalid thresholds',()=>{
 const template=bp=>({id:'E',name:'Event',color:'purple',energy:0,ap:1,
  bp:0,gen:0,type:'event',implementation:'dsl',
  templateEffects:{onPlay:[{template:'recoverOutsidePrintedBp',bp,optional:true}]}});
 assert.ok(createUniversalPack({id:'test',cards:[template(4000)]}).cards.E);
 for(const bad of [0,50001,'4000',null])
  assert.throws(()=>createUniversalPack({id:'negative',cards:[template(bad)]}),/invalid/);
 assert.throws(()=>createUniversalPack({id:'negative',cards:[{...template(4000),
  templateEffects:{onPlay:[{template:'recoverOutsidePrintedBp',bp:4000,optional:false,includeEvents:true}]}
 }]}),/invalid/);
});
