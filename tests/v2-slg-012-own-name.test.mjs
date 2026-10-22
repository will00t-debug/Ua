import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

// Official UA51BT/SLG-1-012: onPlay draw exactly 1 IF an OWN field
// (front/energy line) character named 水篠 旬 exists at resolution.
const slg=createSlgV2Pack(),packs=[slg,slg];
const counts=Object.fromEntries(['005','006','012','015','016','018','032','041','043','045','052','068'].map(x=>['SLG-1-'+x,4]));
counts['SLG-1-038']=2;
const take=(s,p,id)=>{
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing '+id);
};
function setup({nameOn='energy',opponentOnly=false}={}){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:12012,first:0});
 const spell=take(s,0,'SLG-1-012');s.players[0].hand.push(spell);
 for(let i=0;i<3;i++){
  const id=!opponentOnly&&nameOn==='energy'&&i===0?'SLG-1-015':'SLG-1-005';
  const g=take(s,0,id);g.ready=true;s.players[0].energy[i]=g;
 }
 if(nameOn==='front'&&!opponentOnly){
  const friend=take(s,0,'SLG-1-015');friend.ready=true;s.players[0].front[1]=friend;
 }
 if(opponentOnly){
  const foe=take(s,1,'SLG-1-015');foe.ready=true;s.players[1].front[0]=foe;
 }
 for(let k=0;k<4&&s.phase!=='main';k++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===spell.uid&&x.line==='front'&&x.slot===0);
 assert.ok(play,'three purple energy and one AP required');
 return {s,play,spell};
}
test('012 official printed fingerprint / zero life trigger / single conditional V2 DSL',()=>{
 const printed=SOLO_LEVELING_CARDS.find(x=>x.id==='SLG-1-012');
 assert.equal(printed.nameJa,'後藤 清臣');
 assert.equal(printed.energy,3);assert.equal(printed.ap,1);
 assert.equal(printed.bp,2500);assert.equal(printed.gen,2);
 assert.equal(printed.trigger,null);
 assert.equal(printed.effect,'登場時，己方場上存在水篠旬即可抽1張。');
 assert.deepEqual(slg.cards['SLG-1-012'].effects.onPlay,[{op:'drawIfOwnName',name:'水篠 旬',count:1}]);
 assert.equal(slg.cards['SLG-1-012'].trigger,null);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.deepEqual(validateUniversalDeck(slg,counts),[]);
});
test('012 draws once if own energy line has 水篠 旬; AP is paid; deck UID conserved',()=>{
 const {s,play,spell}=setup({nameOn:'energy'});
 const deck=s.players[0].deck.map(c=>c.uid),before=s.players[0].hand.length,ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const played=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].deck.length,deck.length-1);
 assert.equal(played.players[0].hand.length,before,'play -1 + conditional draw +1');
 assert.equal(played.players[0].hand.at(-1).uid,deck[0]);
 assert.equal(played.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,ap-1);
 assert.equal(played.players[0].front[0].uid,spell.uid);
 assert.equal(universalPublicView(packs,played,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,played),true);
});
test('012 draws once if OWN front has name, even when own energy sources have different names',()=>{
 const {s,play}=setup({nameOn:'front'});
 const before=s.players[0].deck.length;
 const next=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(next.players[0].deck.length,before-1);
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('012 does NOT draw for named card in opponent field, in hand, or own outside',()=>{
 const {s,play}=setup({nameOn:'none',opponentOnly:true});
 const handOnly=take(s,0,'SLG-1-015'),outside=take(s,0,'SLG-1-015');
 s.players[0].hand.push(handOnly);s.players[0].outside.push(outside);
 const old=s.players[0].deck.map(c=>c.uid),before=s.players[0].hand.length;
 const next=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.deepEqual(next.players[0].deck.map(c=>c.uid),old);
 assert.equal(next.players[0].hand.length,before-1);
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('012 cannot play without AP or three actual purple energy, even if condition is met',()=>{
 const {s,play}=setup({nameOn:'energy'});
 for(const condition of ['energy','ap']){
  const q=structuredClone(s);
  if(condition==='energy'){q.players[0].hand.push(q.players[0].energy[1]);q.players[0].energy[1]=null;}
  else for(const a of q.players[0].apCards)a.ready=false;
  assert.equal(assertUniversalMatch(packs,q),true);
  assert.ok(!legalUniversalActions(packs,q).some(a=>a.type==='play'&&a.uid===play.uid));
  assert.throws(()=>dispatchUniversalAction(packs,q,play,{actor:0}),/not currently legal/);
 }
});
test('strict generic name-gated draw rejects extra fields, empty names, and impossible counts',()=>{
 const base={id:'TEST',name:'Test',color:'purple',energy:0,ap:1,bp:1000,gen:1,type:'character',implementation:'dsl'};
 const make=template=>createUniversalPack({id:'conditional-draw',cards:[{...base,templateEffects:{onPlay:[template]}}]});
 assert.deepEqual(make({template:'drawIfOwnName',name:'水篠 旬',count:1}).cards.TEST.effects.onPlay,
  [{op:'drawIfOwnName',name:'水篠 旬',count:1}]);
 for(const v of [
  {template:'drawIfOwnName',name:'',count:1},
  {template:'drawIfOwnName',name:'水篠 旬',count:0},
  {template:'drawIfOwnName',name:'水篠 旬',count:6},
  {template:'drawIfOwnName',name:'水篠 旬',count:1,includeOpponent:true}
 ])assert.throws(()=>make(v),/invalid/);
 assert.throws(()=>createUniversalPack({id:'bypass',cards:[{...base,effects:{onPlay:[
  {op:'drawIfOwnName',name:'水篠 旬',count:1,drawOpponent:true}]}}]}),/invalid/);
});
