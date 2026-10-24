import {EXPECTED_V2_COUNTS,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition,createBleachV2Pack}
 from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS}
 from '../dist/universal-v2/verified-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('bleach'),standalone=createBleachV2Pack(),packs=[pack,pack];
const purple={...BLEACH_PURPLE_V2_PILOT_COUNTS,'BLC-3-006':4};
delete purple['BLC-1-039'];
const green={
 'BLC-1-067':4,'BLC-1-068':4,'BLC-1-071':4,'BLC-3-009':4,
 'BLC-1-075':4,'BLC-1-082':4,'BLC-1-086':4,'BLC-1-089':4,
 'BLC-1-090':4,'BLC-1-094':4,'BLC-1-097':4,'BLC-4-061':4,
 'BLC-1-100':2
};
const fresh=(counts,first=0,seed=3306)=>newUniversalMatch(packs,{
 decks:[{...counts},{...counts}],first,seed
});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Expected physical '+id);
}
function phase(s,target){
 for(let i=0;i<5&&s.phase!==target;i++){
  const a=legalUniversalActions(packs,s).find(x=>x.type==='next');
  assert.ok(a);s=dispatchUniversalAction(packs,s,a);
 }
 assert.equal(s.phase,target);return s;
}
function strikeLife(counts,triggerId,attackerId){
 let s=fresh(counts,1,31199),source=take(s,0,triggerId),
  attacker=take(s,1,attackerId);
 attacker.ready=true;s.players[1].front[0]=attacker;
 s.players[0].deck.push(s.players[0].life.shift());
 s.players[0].life.unshift(source);
 s=phase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 return {s,source};
}
test('NC batch is exactly two Japanese UA04NC IDs with correct original trigger semantics',()=>{
 for(const c of Object.values({purple,green})){
  assert.deepEqual(validateUniversalDeck(pack,c),[]);
  assert.equal(Object.values(c).reduce((a,v)=>a+v,0),50);
 }
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.equal(Object.keys(standalone.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.equal(contribution.entries.length,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 const official={
  'BLC-3-006':{number:'UA04NC/BLC-3-006',trigger:'active',
   effect:[{op:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]},
  'BLC-3-009':{number:'UA04NC/BLC-3-009',trigger:'color',
   effect:[{op:'draw',count:1}]}
 };
 for(const [id,expected] of Object.entries(official)){
  const p=BLEACH_V2_ADDON_PROFILES.find(x=>x.id===id),
   source=CARDS.find(x=>x.identity===id),
   entry=contribution.entries.find(x=>x.id===id);
  assert.ok(p&&source&&entry&&source.source.includes('unionarena-tcg.com'));
  assert.equal(p.number,expected.number);
  assert.equal(entry.sourceRecord.effect,source.effect);
  assert.equal(pack.cards[id].trigger,expected.trigger);
  assert.deepEqual(pack.cards[id].effects.onPlay,expected.effect);
  assert.deepEqual(pack.cards[id],standalone.cards[id]);
  assert.ok(entry.evidence.testFiles.includes('tests/universal-v2-bleach-nc-batch.test.mjs'));
  assert.throws(()=>checkedBleachAddonDefinition({...p,effect:'fake card text'}),
   /official recheck required/);
 }
 assert.deepEqual(pack.cards['BLC-3-009'].triggerEffect,
  {op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
});

test('BLC-3-006 onPlay privately inspects three, refuses invalid UID, can reorder top without losing cards',()=>{
 let s=fresh(purple),source=take(s,0,'BLC-3-006'),
  producer=take(s,0,'BLC-1-102');
 s.players[0].energy[0]=producer;producer.ready=true;
 s.players[0].hand.push(source);
 s=phase(s,'main');
 const n=s.players[0].deck.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const old=structuredClone(s);
 let q=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(q.pending?.kind,'effect-top-inspect');
 assert.equal(q.pending.uids.length,3);
 const selected=[...q.pending.uids];
 assert.ok(!JSON.stringify(universalPublicView(packs,q,1)).includes(selected[0]));
 assert.throws(()=>dispatchUniversalAction(packs,q,
  {type:'chooseInspectedOutside',uid:'NOT-A-REAL-UID'},{actor:0}),/not currently legal/);
 let next=dispatchUniversalAction(packs,q,
  {type:'chooseInspectedOutside',uid:null},{actor:0});
 for(const uid of [...selected].reverse())next=dispatchUniversalAction(packs,next,
  {type:'chooseTopOrder',uid},{actor:0});
 assert.equal(next.pending,null);
 assert.deepEqual(next.players[0].deck.slice(0,3).map(c=>c.uid),[...selected].reverse());
 assert.equal(next.players[0].deck.length,n);
 assert.equal(assertUniversalMatch(packs,next),true);
 assert.deepEqual(s,old);
});

test('BLC-3-006 may move exactly one inspected UID outside and retains other two in chosen order',()=>{
 let s=fresh(purple,0,33066),source=take(s,0,'BLC-3-006'),
  producer=take(s,0,'BLC-1-102');
 s.players[0].energy[0]=producer;s.players[0].hand.push(source);
 s=phase(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid);
 assert.ok(play);
 let q=dispatchUniversalAction(packs,s,play,{actor:0});
 const inspected=[...q.pending.uids],n=q.players[0].deck.length;
 q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:inspected[1]},{actor:0});
 for(const uid of [inspected[2],inspected[0]])q=dispatchUniversalAction(packs,q,
  {type:'chooseTopOrder',uid},{actor:0});
 assert.equal(q.pending,null);
 assert.equal(q.players[0].deck.length,n-1);
 assert.deepEqual(q.players[0].deck.slice(0,2).map(c=>c.uid),[inspected[2],inspected[0]]);
 assert.ok(q.players[0].outside.some(c=>c.uid===inspected[1]));
 assert.equal(assertUniversalMatch(packs,q),true);
});

test('BLC-3-009 onPlay draws exactly one through formal registered V2 engine',()=>{
 let s=fresh(green,0,33009),source=take(s,0,'BLC-3-009');
 const p=s.players[0];
 const generators=[take(s,0,'BLC-1-075'),take(s,0,'BLC-1-071'),
  take(s,0,'BLC-1-086')];
 generators.forEach((x,i)=>{x.ready=true;p.energy[i]=x;});
 p.hand.push(source);
 assert.ok(universalEnergyByColor(packs,s,0).green>=3);
 s=phase(s,'main');
 const n=p.deck.length,hand=p.hand.length;
 const action=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action);
 const done=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(done.players[0].deck.length,n-1);
 assert.equal(done.players[0].hand.length,hand);
 assert.ok(done.players[0].front.some(c=>c?.uid===source.uid));
 assert.equal(done.pending,null);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-006 ACTIVE life selects own REST character; invalid enemy UID is illegal',()=>{
 const {s,source}=strikeLife(purple,'BLC-3-006','BLC-1-034');
 const actor=take(s,0,'BLC-1-034');actor.ready=false;
 s.players[0].energy[0]=actor;
 const bad=s.players[1].front[0].uid;
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.mode==='active'&&a.uid===bad));
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'active',uid:bad},{actor:0}),/not currently legal/);
 const select=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===actor.uid);
 assert.ok(select);
 const done=dispatchUniversalAction(packs,s,select,{actor:0});
 assert.equal(done.players[0].energy[0]?.ready,true);
 assert.equal(done.players[0].energy[0]?.buffs.at(-1)?.bp,3000);
 assert.ok(done.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-009 COLOR life deploys only eligible GREEN AP1 <=2 character from HAND, ACTIVE, at zero AP',()=>{
 const {s,source}=strikeLife(green,'BLC-3-009','BLC-1-071');
 const low=take(s,0,'BLC-1-071'),high=take(s,0,'BLC-1-097'),
  foe=take(s,1,'BLC-1-071');
 s.players[0].hand.push(low,high);
 s.players[1].front[1]=foe; // Preserve actual opponent UID for illegal-target test.
 const actions=legalUniversalActions(packs,s);
 const color=actions.find(a=>a.type==='chooseTrigger'&&a.mode==='color'&&
  a.uid===low.uid&&a.line==='front'&&a.slot===0);
 assert.ok(color);
 assert.ok(!actions.some(a=>a.uid===high.uid||a.uid===foe.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {...color,uid:foe.uid},{actor:0}),/not currently legal/);
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 const done=dispatchUniversalAction(packs,s,color,{actor:0});
 assert.equal(done.players[0].front[0]?.uid,low.uid);
 assert.equal(done.players[0].front[0]?.ready,true);
 assert.equal(done.players[0].apCards.filter(x=>x.ready).length,ap);
 assert.ok(done.players[0].outside.some(x=>x.uid===source.uid));
 assert.equal(done.pending,null);
 assert.equal(assertUniversalMatch(packs,done),true);
});
