import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const counts={
 'BLC-1-013':4,'BLC-1-017':4,'BLC-2-029':4,'BLC-2-020':4,
 'BLC-2-031':4,'BLC-2-048':4,'BLC-1-105':4,'BLC-1-039':4,
 'BLC-2-008':4,'BLC-1-071':4,'BLC-1-075':4,'BLC-1-072':4,
 'BLC-1-100':2
};
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[counts,counts],first,seed:2801});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing official physical card '+id);
}
function to(s,phase){for(let i=0;i<4&&s.phase!==phase;i++)s=dispatchUniversalAction(packs,s,{type:'next'});assert.equal(s.phase,phase);return s;}

test('64+ official BLEACH cards include real mandatory BP-limited REST and 2 SPECIAL retirement programs',()=>{
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.keys(pack.cards).length,68);
 assert.deepEqual(pack.cards['BLC-1-013'].effects.onPlay,[{op:'restOppFrontUnderBp',bp:3500,optional:true}]);
 for(const [id,name] of [['BLC-1-099','山本元柳斎重國'],['BLC-2-048','朽木ルキア']]){
  assert.equal(pack.cards[id].trigger,'special');
  assert.deepEqual(pack.cards[id].triggerEffect,{op:'retireOppFront'});
  assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'retireOppFrontUnderBp',bp:3000,bonusName:name,bonusBp:5000}]);
 }
});

test('BLC-1-013 onPlay optional REST cannot target BP 4000 foe; skip and legal REST preserve UID',()=>{
 let s=fresh(),p=s.players[0],foe=s.players[1];
 const power=take(s,0,'BLC-1-017'),entry=take(s,0,'BLC-1-013'),
  low=take(s,1,'BLC-2-029'),high=take(s,1,'BLC-1-105');
 power.ready=true;p.energy[0]=power;p.hand.push(entry);
 low.ready=true;high.ready=true;foe.front[0]=low;foe.front[1]=high;
 s=to(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===entry.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const pending=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(pending.pending?.kind,'effect-rest-bp');
 const actions=legalUniversalActions(packs,pending);
 assert.ok(actions.some(a=>a.type==='chooseRestBp'&&a.uid===low.uid));
 assert.ok(actions.some(a=>a.type==='chooseRestBp'&&a.uid===null));
 assert.ok(!actions.some(a=>a.uid===high.uid));
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:high.uid},{actor:0}),/not currently legal/);
 const resolved=dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:low.uid},{actor:0});
 assert.equal(resolved.players[1].front[0].ready,false);
 assert.equal(resolved.players[1].front[1].ready,true);
 assert.equal(assertUniversalMatch(packs,resolved),true);
 const skip=dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:null},{actor:0});
 assert.equal(skip.players[1].front[0].ready,true);
 assert.equal(assertUniversalMatch(packs,skip),true);
});

test('BLC-2-048 bonus Rukia enables legal 4000-BP retirement; no Rukia means no free removal',()=>{
 let s=fresh(),p=s.players[0],foe=s.players[1];
 const a=take(s,0,'BLC-2-029'),b=take(s,0,'BLC-2-020'),
  rukia=take(s,0,'BLC-2-031'),spell=take(s,0,'BLC-2-048'),
  high=take(s,1,'BLC-1-105');
 a.ready=true;b.ready=true;p.energy[0]=a;p.energy[1]=b;
 p.front[0]=rukia;p.hand.push(spell);foe.front[0]=high;
 s=to(s,'main');
 const option=legalUniversalActions(packs,s).find(x=>x.type==='event'&&x.uid===spell.uid);
 assert.ok(option);
 let buffed=dispatchUniversalAction(packs,s,option,{actor:0});
 assert.equal(buffed.pending?.kind,'effect-retire-bp');
 assert.deepEqual(legalUniversalActions(packs,buffed),[{type:'chooseRetireBp',uid:high.uid}]);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseRetireBp',uid:high.uid},{actor:0});
 assert.equal(buffed.players[1].front[0],null);
 assert.ok(buffed.players[1].outside.some(x=>x.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,buffed),true);
 // Without Rukia, above 3000 BP has no eligible retirement target.
 const noRukia=structuredClone(s);
 noRukia.players[0].front[0]=null;noRukia.players[0].outside.push(rukia);
 const base=dispatchUniversalAction(packs,noRukia,option,{actor:0});
 assert.equal(base.pending,null);
 assert.equal(base.players[1].front[0]?.uid,high.uid);
 assert.equal(assertUniversalMatch(packs,base),true);
});

test('BLC-2-048 SPECIAL life trigger can retire a BP4000 foe without event energy/AP cost',()=>{
 let s=fresh(1);
 const attacker=take(s,1,'BLC-1-039'),high=take(s,1,'BLC-1-105');
 attacker.ready=true;high.ready=true;
 s.players[1].front[0]=attacker;s.players[1].front[1]=high;
 const trigger=take(s,0,'BLC-2-048');
 const displaced=s.players[0].life.shift();
 s.players[0].deck.push(displaced);
 s.players[0].life.unshift(trigger);
 s=to(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'special');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===high.uid),
  'SPECIAL ignores normal event BP<=3000 requirement');
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='skip'),
  'life trigger can be declined');
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'special',uid:'forged'},{actor:0}),/not currently legal/);
 assert.deepEqual(s,before);
 const apBefore=s.players[0].apCards.filter(x=>x.ready).length;
 const after=dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'special',uid:high.uid},{actor:0});
 assert.equal(after.players[1].front[1],null);
 assert.ok(after.players[1].outside.some(x=>x.uid===high.uid));
 assert.equal(after.players[0].apCards.filter(x=>x.ready).length,apBefore);
 assert.ok(after.players[0].outside.some(x=>x.uid===trigger.uid));
 assert.equal(assertUniversalMatch(packs,after),true);
 const skip=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skip.players[1].front[1]?.uid,high.uid);
 assert.equal(assertUniversalMatch(packs,skip),true);
});
