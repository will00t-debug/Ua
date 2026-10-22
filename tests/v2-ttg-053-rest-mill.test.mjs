import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// Independently authored official oracle: UA56BT/TTG-1-053 Simon,
// RED 0, AP 1 to play, BP 1500, 1 red generated, ACTIVE Life.
// Main activated REST of this front-line character pays COST, then the
// physical top OWN deck card goes to OWN outside. No once-per-turn text.
const ttg=createTtgV2Pack(),slg=createSlgV2Pack(),packs=[ttg,slg];
const d=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
d['TTG-1-001']=2;d['TTG-1-053']=2;d['TTG-1-036']=2;
const enemy=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
enemy['SLG-1-038']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function toMain(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function setup(){
 let s=newUniversalMatch(packs,{decks:[d,enemy],first:0,seed:53053});
 const source=take(s,0,'TTG-1-053');source.ready=true;s.players[0].front[0]=source;
 s=toMain(s);
 assert.equal(assertUniversalMatch(packs,s),true);
 const act=legalUniversalActions(packs,s).find(x=>x.type==='activate'&&x.mode==='selfRestThen'&&x.uid===source.uid);
 assert.ok(act,'READY own FRONT can activate printed REST cost');
 return {s,source,act};
}
test('TTG-053 independent official printed stats, main REST→top outside and ACTIVE Life',()=>{
 const source=TTG_BY_ID['TTG-1-053'],card=ttg.cards['TTG-1-053'];
 assert.equal(source.number,'UA56BT/TTG-1-053');
 assert.equal(source.nameJa,'シモン');
 assert.equal(source.effect,'主要階段：REST自己，牌庫頂1張送場外。');
 assert.equal(source.trigger,'active');
 assert.equal(source.energy,0);assert.equal(source.ap,1);
 assert.equal(source.color,'red');assert.equal(source.bp,1500);assert.equal(source.gen,1);
 assert.equal(card.implementation,'dsl');
 assert.deepEqual(card.mainAbility,{op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:1}]});
 assert.deepEqual(card.effects,{});
 assert.equal(card.trigger,'active');
 assert.deepEqual(validateUniversalDeck(ttg,d),[]);
 assert.equal(Object.keys(ttg.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
});
test('TTG-053 own REST cost fires once when READY, mills OWN single top card and pays NO AP',()=>{
 const {s,source,act}=setup();
 const initial=structuredClone(s);
 const top=s.players[0].deck[0],deck=s.players[0].deck.length;
 const outside=s.players[0].outside.length,oppDeck=s.players[1].deck.map(c=>c.uid);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 const next=dispatchUniversalAction(packs,s,act,{actor:0});
 assert.deepEqual(s,initial,'pure reducer does not mutate caller');
 assert.equal(next.players[0].front[0].ready,false);
 assert.equal(next.players[0].front[0].uid,source.uid);
 assert.equal(next.players[0].deck.length,deck-1);
 assert.equal(next.players[0].outside.length,outside+1);
 assert.equal(next.players[0].outside.at(-1).uid,top.uid);
 assert.deepEqual(next.players[1].deck.map(c=>c.uid),oppDeck);
 assert.equal(next.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(next.pending,null);
 assert.ok(!legalUniversalActions(packs,next).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('self REST main cost rejects REST, energy line, non-main, foreign actor, and forged UID',()=>{
 const {s,act,source}=setup();
 for(const [name,change] of Object.entries({
  sourceREST:q=>{q.players[0].front[0].ready=false;},
  energyLine:q=>{q.players[0].energy[0]=q.players[0].front[0];q.players[0].front[0]=null;},
  attackPhase:q=>{q.phase='attack';}
 })){
  const q=structuredClone(s);change(q);
  assert.equal(assertUniversalMatch(packs,q),true,name);
  assert.ok(!legalUniversalActions(packs,q).some(a=>a.type==='activate'&&a.uid===source.uid),name);
  assert.throws(()=>dispatchUniversalAction(packs,q,act,{actor:0}),/not currently legal/,name);
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,act,{actor:1}),/Wrong player/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{...act,uid:'1-1234'},{actor:0}),/not currently legal/);
});
test('no invented once-per-turn counter: separate READY from another legal effect permits using own REST again',()=>{
 const {s,source,act}=setup();
 const done=dispatchUniversalAction(packs,s,act);
 assert.equal(done.mainAbilityUsedUids.includes(source.uid),false);
 const readied=structuredClone(done);readied.players[0].front[0].ready=true;
 assert.equal(assertUniversalMatch(packs,readied),true);
 assert.ok(legalUniversalActions(packs,readied).some(a=>a.type==='activate'&&a.mode==='selfRestThen'&&a.uid===source.uid));
});
test('MAIN cost does not require available AP and empty deck mills nothing without inventing cards',()=>{
 const {s,act}=setup();
 const q=structuredClone(s);for(const a of q.players[0].apCards)a.ready=false;
 assert.ok(legalUniversalActions(packs,q).some(a=>a.type==='activate'&&a.mode==='selfRestThen'));
 assert.equal(uiActionLabel(act,{pack:packs,state:q}).includes('REST'),true);
 const done=dispatchUniversalAction(packs,q,act);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(done.players[0].apCards.filter(c=>c.ready).length,0);
});
test('existing pilot TTG-001 private TOP information is visible ONLY to own controller',()=>{
 let s=newUniversalMatch(packs,{decks:[d,enemy],first:0,seed:1001});
 const simon=take(s,0,'TTG-1-001');s.players[0].hand.push(simon);
 s=toMain(s);
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===simon.uid&&x.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'private-top-choice');
 const top=s.players[0].deck[0];
 const own=universalPrivateChoices(packs,s,0);
 assert.ok(own);
 assert.deepEqual(own.options.map(x=>x.action.mode),['top','outside']);
 assert.ok(own.options.every(x=>x.card.cardId===top.cardId));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const opponentView=universalPublicView(packs,s,1);
 assert.equal(opponentView.players[0].hand,null);
 assert.ok(!JSON.stringify(opponentView).includes(JSON.stringify(top.uid)),'private top UID must not leak');
 assert.ok(!JSON.stringify(opponentView).includes('private-top-choice-cardId'),'no client-only card metadata in public view');
 const initialDeck=s.players[0].deck.map(c=>c.uid),initialOutside=s.players[0].outside.length;
 const stay=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'top'});
 assert.deepEqual(stay.players[0].deck.map(c=>c.uid),initialDeck);
 const milled=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'outside'});
 assert.deepEqual(milled.players[0].deck.map(c=>c.uid),initialDeck.slice(1));
 assert.equal(milled.players[0].outside.length,initialOutside+1);
 assert.equal(milled.players[0].outside.at(-1).uid,top.uid);
 assert.equal(assertUniversalMatch(packs,stay),true);
 assert.equal(assertUniversalMatch(packs,milled),true);
});
test('strict generic verifier rejects invisible no-effect REST abilities, extra AP, unknown program and bad count',()=>{
 const c={id:'A',name:'A',type:'character',color:'red',energy:0,ap:1,
  bp:1500,gen:1,implementation:'dsl',effects:{},
  mainAbility:{op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:1}]}};
 assert.ok(createUniversalPack({id:'fixture',cards:[c]}).cards.A);
 for(const bad of [
  {op:'restSelfThen',frontOnly:false,then:[{op:'millTop',count:1}]},
  {op:'restSelfThen',frontOnly:true,apCost:1,then:[{op:'millTop',count:1}]},
  {op:'restSelfThen',frontOnly:true,then:[]},
  {op:'restSelfThen',frontOnly:true,then:[{op:'draw',count:1}]},
  {op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:1},{op:'draw',count:1}]},
  {op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:0}]},
  {op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:1,when:'unknown'}]}
 ])assert.throws(()=>createUniversalPack({id:'negative',cards:[{...c,mainAbility:bad}]}),
  /unsupported main action ability|invalid|effect op unsupported/);
});
