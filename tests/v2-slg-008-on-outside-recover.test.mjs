import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

const slg=createSlgV2Pack(),ttg=createTtgV2Pack(),packs=[slg,ttg];
const deck=Object.fromEntries(['005','006','008','015','016','018','025','032',
 '041','043','045','052'].map(id=>['SLG-1-'+id,4]));
deck['SLG-1-037']=2;
const opponent=Object.fromEntries(['001','005','009','014','019','042','043','047',
 '049','051','064','065'].map(id=>['TTG-1-'+id,4]));
opponent['TTG-1-036']=2;
function fresh(seed=8008){return newUniversalMatch(packs,{decks:[deck,opponent],first:0,seed});}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing exact physical card '+id);
}
function main(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function recovery(){
 let s=fresh(),recovered=take(s,0,'SLG-1-008'),
  event=take(s,0,'SLG-1-037'),enemy=take(s,1,'TTG-1-005');
 s.players[0].outside.push(recovered);s.players[1].outside.push(enemy);
 for(let i=0;i<4;i++){
  const x=take(s,0,'SLG-1-015');x.ready=true;s.players[0].energy[i]=x;
 }
 s.players[0].hand.push(event);s=main(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play,'printed purple-4 event must be legal with four purple energy');
 const priorDeck=s.players[0].deck.length;
 const after=dispatchUniversalAction(packs,s,play);
 assert.equal(after.pending?.kind,'effect-recover-outside');
 assert.ok(after.effectQueue.some(job=>job.op==='draw'));
 return {s:after,recovered,event,enemy,priorDeck};
}
function entry(top){
 let s=fresh(8009),source=take(s,0,'SLG-1-008');
 s.players[0].hand.push(source);
 const energy=take(s,0,'SLG-1-005');
 energy.ready=true;s.players[0].energy[0]=energy;
 const window=top.map(id=>take(s,0,'SLG-1-'+id));
 s.players[0].deck.unshift(...window);
 s=main(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'printed purple 1 / AP 1 allows entry');
 return {s,source,window,play};
}
function order(s,uids){
 for(const uid of uids)s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 return s;
}
test('008 Japanese official source fingerprint, BOTH independent text timings and no life trigger',()=>{
 const source=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-008'),
  c=slg.cards['SLG-1-008'];
 assert.equal(source.number,'UA51BT/SLG-1-008');
 assert.equal(source.nameJa,'エシル');assert.equal(source.trigger,null);
 assert.ok(source.source.includes('/jp/cardlist/'));
 assert.match(source.effect,/經自己效果從場外加入手牌時/);
 assert.match(source.effect,/牌庫頂4張/);
 assert.deepEqual([c.color,c.energy,c.ap,c.bp,c.gen,c.type,c.trigger],
  ['purple',1,1,2000,1,'character',null]);
 assert.deepEqual(c.effects.onOutsideRecover,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(c.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:4,
  filters:[{field:'name',value:'水篠 旬'},{field:'name',value:'悪魔の城'}],logic:'any'}]);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.deepEqual(validateUniversalDeck(slg,deck),[]);
});
test('real SLG-037 recovers SLG-008: self mandatory draw then discard BEFORE source trailing draw',()=>{
 let {s,recovered,enemy,priorDeck}=recovery();
 const options=legalUniversalActions(packs,s);
 assert.deepEqual(options,[{type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:recovered.uid}]);
 assert.ok(!options.some(a=>a.uid===enemy.uid));
 const clone=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:enemy.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,options[1],{actor:1}),/Wrong player/);
 s=dispatchUniversalAction(packs,s,options[1],{actor:0});
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),
  clone.players[0].deck.map(c=>c.uid).slice(1),
  'exactly one onRecover draw before discard choice');
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.pending?.sourceUid,recovered.uid,'trigger belongs to recovered physical source');
 assert.ok(s.effectQueue.some(job=>job.op==='draw'),'recovering source next effect still waits');
 assert.equal(s.players[0].deck.length,priorDeck-1);
 assert.ok(s.players[0].hand.some(c=>c.uid===recovered.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.deepEqual(universalPublicView(packs,s,1).pending,{kind:'effect-discard',player:0});
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const handDiscard=legalUniversalActions(packs,s).find(a=>a.uid!==recovered.uid);
 assert.ok(handDiscard);
 s=dispatchUniversalAction(packs,s,handDiscard);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,priorDeck-2,'source trailing draw after paid discard');
 assert.ok(s.players[0].outside.some(c=>c.uid===handDiscard.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===recovered.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('optional outside recovery SKIP neither triggers recovered ability nor steals rival title card',()=>{
 const {s,recovered,enemy,priorDeck}=recovery();
 const before=structuredClone(s);
 const done=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:null});
 assert.deepEqual(s,before,'reducer input is immutable');
 assert.equal(done.pending,null);
 assert.equal(done.players[0].deck.length,priorDeck-1,'only recovering event trailing draw');
 assert.ok(done.players[0].outside.some(c=>c.uid===recovered.uid));
 assert.ok(done.players[1].outside.some(c=>c.uid===enemy.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});
test('SLG-008 onPlay inspects top FOUR privately and name-match selects 0..1, then BOTTOM order and contingent discard',()=>{
 let {s,play,source,window}=entry(['015','005','032','006']);
 const old=s.players[0].deck.map(c=>c.uid),oldHand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseTopFiltered',uid:null},{type:'chooseTopFiltered',uid:window[0].uid}
 ]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.ok(!JSON.stringify(universalPublicView(packs,s,1)).includes(window[0].uid),
  'private deck-window UIDs are hidden from opponent');
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTopFiltered',uid:window[1].uid}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[0].uid});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending?.discardAfter,true);
 s=order(s,[window[3].uid,window[1].uid,window[2].uid]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),
  [...old.slice(4),window[3].uid,window[1].uid,window[2].uid]);
 assert.equal(s.pending?.kind,'effect-discard');
 // Obtaining a card from DECK is never an own-OUTSIDE-to-hand recovery.
 assert.ok(s.players[0].hand.some(x=>x.uid===window[0].uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:window[0].uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,oldHand-1);
 assert.ok(s.players[0].outside.some(x=>x.uid===window[0].uid));
 assert.ok(s.players[0].front.some(x=>x?.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('onPlay no matched card in exact TOP4 orders four below with zero discard, cannot peek fifth',()=>{
 let {s,play,window}=entry(['005','006','032','041']);
 const fifth=take(s,0,'SLG-1-015');s.players[0].deck.splice(4,0,fifth);
 const old=s.players[0].deck.map(x=>x.uid),hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===fifth.uid));
 const orderUids=window.map(c=>c.uid).reverse();
 s=order(s,orderUids);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,fifth.uid);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...old.slice(4),...orderUids]);
 assert.equal(s.players[0].hand.length,hand-1,'no contingent discard without a pick');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('new recovered timing fails closed for events, unknown operations, costs and combined free entry',()=>{
 const c={id:'T0',name:'Printed',type:'character',color:'purple',
  energy:0,ap:1,bp:1500,gen:1,implementation:'dsl',
  templateEffects:{onOutsideRecover:[{template:'drawDiscardOne'}]}};
 const compile=x=>createUniversalPack({id:'strict-recover',cards:[x]});
 assert.deepEqual(compile(c).cards.T0.effects.onOutsideRecover,[{op:'drawDiscard',count:1}]);
 for(const variant of [
  {...c,type:'event',bp:0,gen:0},
  {...c,ownOutsideRecovery:{op:'restSelfToEnergy',optional:true,rest:true}},
  {...c,templateEffects:{onOutsideRecover:[{template:'draw',count:1}]}},
  {...c,templateEffects:{onOutsideRecover:[{template:'millTop',count:1}]}},
  {...c,effects:{onOutsideRecover:[{op:'drawDiscard',count:1,discardCount:1}]},
   templateEffects:undefined},
  {...c,effects:{onOutsideRecover:[{op:'drawDiscard',count:1,rogue:1}]},
   templateEffects:undefined},
  {...c,templateEffects:{onOutsideRecover:[{template:'drawDiscardOne'},{template:'drawDiscardOne'}]}}
 ])assert.throws(()=>compile(variant),/unsupported onOutsideRecover|invalid|incompatible/);
});
