import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition,createBleachV2Pack}
 from '../dist/universal-v2/bleach-pack.mjs';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS}
 from '../dist/universal-v2/verified-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('bleach'),standalone=createBleachV2Pack(),
 packs=[pack,pack];
const purple={...BLEACH_PURPLE_V2_PILOT_COUNTS,'BLC-1-059':4};
delete purple['BLC-1-039'];
const green={
 'BLC-1-067':4,'BLC-1-068':4,'BLC-1-071':4,'BLC-1-077':4,
 'BLC-1-075':4,'BLC-1-082':4,'BLC-1-086':4,'BLC-1-089':4,
 'BLC-1-090':4,'BLC-1-094':4,'BLC-1-097':4,'BLC-4-061':4,
 'BLC-1-100':2
};
const fresh=(counts,seed=15977)=>newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const array=s.players[p][zone],i=array.findIndex(c=>c.cardId===id);
  if(i>=0)return array.splice(i,1)[0];
 }
 throw Error('Missing actual printed physical card '+id);
}
function main(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,
  {type:'next'});
 assert.equal(s.phase,'main');return s;
}
const play=(s,uid)=>legalUniversalActions(packs,s).find(a=>
 a.type==='play'&&a.uid===uid&&a.line==='front'&&a.slot===0);

test('two actual printed other-character buffs have exact source fingerprints, no hidden trigger',()=>{
 assert.deepEqual(validateUniversalDeck(pack,purple),[]);
 assert.deepEqual(validateUniversalDeck(pack,green),[]);
 assert.equal(Object.keys(pack.cards).length,76);
 assert.equal(Object.keys(standalone.cards).length,76);
 assert.equal(contribution.entries.length,61);
 for(const [id,color,energy,bp] of [
  ['BLC-1-059','purple',2,3000],['BLC-1-077','green',0,1000]
 ]){
  const p=BLEACH_V2_ADDON_PROFILES.find(x=>x.id===id),
   source=CARDS.find(x=>x.identity===id),
   entry=contribution.entries.find(x=>x.id===id),registered=pack.cards[id];
  assert.ok(p&&source&&entry);
  assert.equal(source.color,color);
  assert.equal(source.energy,energy);
  assert.equal(source.bp,bp);
  assert.equal(source.effect,p.effect);
  assert.equal(source.trigger,null);
  assert.equal(registered.trigger,null);
  assert.equal(entry.sourceRecord.number,'UA08BT/'+id);
  assert.deepEqual(registered.effects.onPlay,[{
   op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true
  }]);
  assert.deepEqual(standalone.cards[id],registered);
  assert.ok(entry.evidence.testFiles.includes('tests/universal-v2-bleach-own-buff.test.mjs'));
  assert.throws(()=>checkedBleachAddonDefinition({...p,effect:'not official'}),/official recheck required/);
 }
});

test('BLC-1-059 can buff one OTHER own energy-line character, never self/enemy; AP and UID conserved',()=>{
 let s=fresh(purple),source=take(s,0,'BLC-1-059'),
  generator=take(s,0,'BLC-1-102'),target=take(s,0,'BLC-1-034'),
  foe=take(s,1,'BLC-1-034');
 s.players[0].energy[0]=generator;generator.ready=true;
 s.players[0].energy[1]=target;target.ready=true;
 s.players[1].front[1]=foe;
 s.players[0].hand.push(source);
 s=main(s);
 const choice=play(s,source.uid);
 assert.ok(choice,'two purple energy meet printed cost');
 const beforeAp=s.players[0].apCards.filter(c=>c.ready).length;
 const pre=structuredClone(s);
 let q=dispatchUniversalAction(packs,s,choice,{actor:0});
 assert.equal(q.pending?.kind,'effect-buff-own');
 const legal=legalUniversalActions(packs,q);
 assert.ok(legal.some(a=>a.type==='chooseOwnBuff'&&a.uid===target.uid));
 assert.ok(legal.some(a=>a.type==='chooseOwnBuff'&&a.uid===generator.uid));
 assert.ok(legal.some(a=>a.uid===null),'up to one, choosing nobody is legal');
 assert.ok(!legal.some(a=>a.uid===source.uid||a.uid===foe.uid));
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseOwnBuff',uid:source.uid},{actor:0}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseOwnBuff',uid:foe.uid},{actor:0}),/not currently legal/);
 q=dispatchUniversalAction(packs,q,
  {type:'chooseOwnBuff',uid:target.uid},{actor:0});
 assert.equal(q.pending,null);
 assert.equal(q.players[0].energy[1].uid,target.uid);
 assert.equal(q.players[0].energy[1].buffs.at(-1).bp,1000);
 assert.equal(q.players[0].energy[1].buffs.at(-1).untilTurn,q.turn);
 assert.equal(q.players[0].front[0].uid,source.uid);
 assert.ok(!(q.players[0].front[0].buffs||[]).some(x=>x.bp===1000));
 assert.equal(q.players[0].apCards.filter(c=>c.ready).length,beforeAp-1);
 assert.deepEqual(s,pre);
 assert.equal(assertUniversalMatch(packs,q),true);
});

test('BLC-1-077 may DECLINE optional BP+1000 without modifying another character',()=>{
 let s=fresh(green,177),source=take(s,0,'BLC-1-077'),
  target=take(s,0,'BLC-1-071');
 s.players[0].front[1]=target;
 s.players[0].hand.push(source);
 s=main(s);
 let q=dispatchUniversalAction(packs,s,play(s,source.uid),{actor:0});
 assert.equal(q.pending?.kind,'effect-buff-own');
 assert.ok(legalUniversalActions(packs,q).some(a=>a.type==='chooseOwnBuff'&&a.uid===null));
 const initialBp=universalBp(packs,q,target);
 q=dispatchUniversalAction(packs,q,{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(q.pending,null);
 assert.equal(universalBp(packs,q,q.players[0].front[1]),initialBp);
 assert.equal(assertUniversalMatch(packs,q),true);
});

test('BLC-1-077 onPlay without another own character skips optional effect and keeps UID valid',()=>{
 let s=fresh(green,17777),source=take(s,0,'BLC-1-077');
 s.players[0].hand.push(source);
 s=main(s);
 const a=play(s,source.uid);assert.ok(a);
 const q=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(q.pending,null);
 assert.equal(q.players[0].front[0].uid,source.uid);
 assert.ok(!(q.players[0].front[0].buffs||[]).length);
 assert.equal(assertUniversalMatch(packs,q),true);
});
