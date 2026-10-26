import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Eight Solo Leveling batches on the shared V2 engine.
// Official pages checked 2026-10-26:
// SLG-1-063, 054, 017, 074, 071, 050, 080, 035.
const slg=createSlgV2Pack(),packs=[slg,slg];
const batch=['SLG-1-063','SLG-1-054','SLG-1-017','SLG-1-074','SLG-1-071','SLG-1-050','SLG-1-080','SLG-1-035'];

function countsFor(required){
 const fillers=Object.values(slg.cards).filter(c=>c.type==='character'&&
  (c.maxCopies??4)===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(slg,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card '+id);
}
function put(s,p,id,line,slot,{ready=true}={}){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toMain(counts,seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let i=0;i<6&&s.phase!=='main';i++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function orderTops(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function live(s,card){
 const p=Number(String(card.uid).split('-')[0]);
 const found=[...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===card.uid);
 assert.ok(found,card.uid);
 return found;
}
function play(s,uid,line,slot){
 const action=legalUniversalActions(packs,s).find(a=>
  (a.type==='play'||a.type==='event')&&a.uid===uid&&
  (a.type==='event'||(a.line===line&&a.slot===slot)));
 assert.ok(action,'missing legal play');
 return dispatchUniversalAction(packs,s,action);
}

test('eight official SLG prints are registered on the shared engine',()=>{
 for(const id of batch){
  const cat=SOLO_LEVELING_CARDS.find(c=>c.id===id);
  const card=slg.cards[id];
  assert.equal(card.name,cat.nameJa);
  assert.equal(card.energy,cat.energy);
  assert.equal(card.ap,cat.ap);
  assert.equal(card.bp,cat.bp??0);
  assert.equal(card.gen,cat.gen);
  assert.equal(card.trigger,cat.trigger);
  assert.equal(EXPECTED_V2_IDS['solo-leveling'].includes(id),true);
 }
 assert.deepEqual(slg.cards['SLG-1-063'].traits,['第四次架南島レイド']);
 assert.deepEqual(slg.cards['SLG-1-074'].traitComponents,['DFN','第四次架南島レイド']);
 assert.equal(slg.cards['SLG-1-017'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(slg.cards['SLG-1-035'].enterAlwaysActive,true);
});

test('063 reveals one island-raid card from the top three, bottoms the rest, then discards',()=>{
 const counts=countsFor(['SLG-1-063','SLG-1-062','SLG-1-056','SLG-1-066','SLG-1-055']);
 let s=toMain(counts,1063);
 put(s,0,'SLG-1-055','energy',0);
 const actor=take(s,0,'SLG-1-063');s.players[0].hand.push(actor);
 const match=take(s,0,'SLG-1-062'),miss=take(s,0,'SLG-1-066'),other=take(s,0,'SLG-1-056');
 s.players[0].deck.unshift(match,miss,other);
 s=play(s,actor.uid,'front',0);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices.sort(),[match.uid,other.uid].sort());
 assert.equal(s.pending.choices.includes(miss.uid),false);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:match.uid});
 s=orderTops(s);
 assert.equal(s.pending.kind,'effect-discard');
 const discard=s.players[0].hand.find(c=>c.uid!==match.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===match.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.publicReveals.at(-1).uid,match.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('063 skip still orders the inspected window and does not discard',()=>{
 const counts=countsFor(['SLG-1-063','SLG-1-062','SLG-1-066','SLG-1-056','SLG-1-055']);
 let s=toMain(counts,2063);
 put(s,0,'SLG-1-055','energy',0);
 const actor=take(s,0,'SLG-1-063');s.players[0].hand.push(actor);
 const window=[take(s,0,'SLG-1-062'),take(s,0,'SLG-1-066'),take(s,0,'SLG-1-056')];
 s.players[0].deck.unshift(...window);
 const outside=s.players[0].outside.length;
 s=play(s,actor.uid,'front',0);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 s=orderTops(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.length,outside);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('054 sends one island-raid card outside and returns the rest to the top',()=>{
 const counts=countsFor(['SLG-1-054','SLG-1-062','SLG-1-066']);
 let s=toMain(counts,1054);
 const actor=take(s,0,'SLG-1-054');s.players[0].hand.push(actor);
 const match=take(s,0,'SLG-1-062'),miss=take(s,0,'SLG-1-066');
 s.players[0].deck.unshift(match,miss);
 s=play(s,actor.uid,'energy',0);
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(s.pending.choices,[match.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:match.uid});
 s=orderTops(s);
 assert.equal(s.players[0].deck[0].uid,miss.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===match.uid));
 assert.equal(s.players[0].energy[0].uid,actor.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('017 costs zero purple while the own field is empty and peeks the top card',()=>{
 const counts=countsFor(['SLG-1-017','SLG-1-050','SLG-1-066']);
 let s=toMain(counts,1017);
 const actor=take(s,0,'SLG-1-017');s.players[0].hand.push(actor);
 const top=take(s,0,'SLG-1-066');s.players[0].deck.unshift(top);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===actor.uid));
 s=play(s,actor.uid,'front',0);
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'outside'});
 assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));
 assert.equal(s.pending,null);
 const blocked=toMain(counts,3017);
 put(blocked,0,'SLG-1-050','front',0);
 const second=take(blocked,0,'SLG-1-017');blocked.players[0].hand.push(second);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='play'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('074 grants this-turn Impact 1 to one other own DFN and can be skipped',()=>{
 const counts=countsFor(['SLG-1-074','SLG-1-069','SLG-1-056','SLG-1-055','SLG-1-050']);
 let s=toMain(counts,1074);
 put(s,0,'SLG-1-055','energy',0);put(s,0,'SLG-1-050','energy',1);
 const ally=put(s,0,'SLG-1-069','front',0),other=put(s,0,'SLG-1-056','front',1);
 const foe=put(s,1,'SLG-1-069','front',0);
 const actor=take(s,0,'SLG-1-074');s.players[0].hand.push(actor);
 s=play(s,actor.uid,'front',2);
 assert.equal(s.pending.kind,'effect-grant-impact');
 assert.deepEqual(s.pending.choices,[ally.uid]);
 const skipped=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseImpactGrant',uid:null});
 assert.equal(universalImpact(packs,skipped,live(skipped,ally)),0);
 assert.equal(skipped.pending,null);
 s=dispatchUniversalAction(packs,s,{type:'chooseImpactGrant',uid:ally.uid});
 assert.equal(universalImpact(packs,s,live(s,ally)),1);
 assert.equal(live(s,other).impactGranted,undefined);
 assert.equal(live(s,foe).impactGranted,undefined);
 assert.equal(s.players[0].front[2].uid,actor.uid);
 assert.throws(()=>dispatchUniversalAction(packs,toMain(counts,4074),{type:'chooseImpactGrant',uid:ally.uid}));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('071 rests once, buffs another character, then returns itself to hand',()=>{
 const counts=countsFor(['SLG-1-071','SLG-1-056']);
 let s=toMain(counts,1071);
 const first=put(s,0,'SLG-1-071','front',0),second=put(s,0,'SLG-1-071','energy',0);
 const ally=put(s,0,'SLG-1-056','front',1);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='selfRestBuffHand'));
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:first.uid,mode:'selfRestBuffHand'});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(first.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,live(s,ally)),3000+1000);
 assert.ok(s.players[0].hand.some(c=>c.uid===first.uid));
 assert.equal(s.players[0].front[0],null);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:second.uid,mode:'selfRestBuffHand'});
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,live(s,ally)),3000+2000);
 assert.ok(s.players[0].hand.some(c=>c.uid===second.uid));
 put(s,0,'SLG-1-071','front',0);
 const replayed=s.players[0].front[0];
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===replayed.uid),false);
 const alone=toMain(counts,2071);
 put(alone,0,'SLG-1-071','front',0);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.type==='activate'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('050 rests, retires, and may recover one outside character named 水篠 旬',()=>{
 const counts=countsFor(['SLG-1-050','SLG-1-015','SLG-1-056']);
 let s=toMain(counts,1050);
 const actor=put(s,0,'SLG-1-050','front',0);
 const named=take(s,0,'SLG-1-015'),other=take(s,0,'SLG-1-056');
 s.players[0].outside.push(named,other);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:actor.uid,mode:'restRetireNamed'});
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.deepEqual(s.pending.choices,[named.uid]);
 assert.ok(s.players[0].outside.some(c=>c.uid===actor.uid));
 const declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseOutsideRecovery',uid:null});
 assert.ok(declined.players[0].outside.some(c=>c.uid===named.uid));
 assert.equal(declined.pending,null);
 s=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:named.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===named.uid));
 assert.ok(!s.players[0].hand.some(c=>c.uid===other.uid));
 const empty=toMain(counts,2050);
 const lone=put(empty,0,'SLG-1-050','energy',0);
 const retired=dispatchUniversalAction(packs,empty,{type:'activate',uid:lone.uid,mode:'restRetireNamed'});
 assert.equal(retired.pending,null);
 assert.ok(retired.players[0].outside.some(c=>c.uid===lone.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,retired),true);
});

test('080 draws, then grants one 向坂 雫 an optional attack draw',()=>{
 const counts=countsFor(['SLG-1-080','SLG-1-056','SLG-1-015','SLG-1-066','SLG-1-050']);
 let s=toMain(counts,1080);
 put(s,0,'SLG-1-066','energy',0);put(s,0,'SLG-1-050','energy',1);
 const named=put(s,0,'SLG-1-056','front',0),other=put(s,0,'SLG-1-015','front',1);
 const event=take(s,0,'SLG-1-080');s.players[0].hand.push(event);
 const deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 s=play(s,event.uid);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.pending.kind,'effect-grant-attack');
 assert.deepEqual(s.pending.choices,[named.uid]);
 assert.equal(s.pending.choices.includes(other.uid),false);
 const skipped=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseGrantAttack',uid:null});
 assert.equal(skipped.pending,null);
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantAttack',uid:named.uid});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:named.uid});
 assert.equal(s.pending.kind,'granted-attack-draw');
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'draw'});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.ok(s.players[0].outside.some(c=>c.cardId==='SLG-1-080'));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('035 enters ACTIVE and scales the shadow-army BP buff from the live own field',()=>{
 const counts=countsFor(['SLG-1-035','SLG-1-030','SLG-1-032','SLG-1-056','SLG-1-001','SLG-1-006','SLG-1-015']);
 let s=toMain(counts,1035);
 put(s,0,'SLG-1-001','energy',0);put(s,0,'SLG-1-006','energy',1);put(s,0,'SLG-1-015','energy',2);
 const soldiers=[0,1,2,3].map(slot=>put(s,0,'SLG-1-030','front',slot));
 const wrong=put(s,1,'SLG-1-030','front',0);
 const field=take(s,0,'SLG-1-035');s.players[0].hand.push(field);
 s=play(s,field.uid,'energy',3);
 assert.equal(s.players[0].energy[3].ready,true);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:field.uid,mode:'restTraitBuff'});
 assert.equal(s.players[0].energy[3].ready,false);
 for(const soldier of soldiers)assert.equal(universalBp(packs,s,live(s,soldier)),1500+1000);
 assert.equal(universalBp(packs,s,s.players[0].energy[3]),1000);
 assert.equal(universalBp(packs,s,live(s,wrong)),1500);
 const low=toMain(counts,2035);
 put(low,0,'SLG-1-001','energy',0);put(low,0,'SLG-1-006','energy',1);put(low,0,'SLG-1-015','energy',2);
 const few=[0,1,2].map(slot=>put(low,0,'SLG-1-030','front',slot));
 const catalogue=put(low,0,'SLG-1-032','front',3);
 const area=take(low,0,'SLG-1-035');low.players[0].hand.push(area);
 let quiet=play(low,area.uid,'energy',3);
 quiet=dispatchUniversalAction(packs,quiet,{type:'activate',uid:area.uid,mode:'restTraitBuff'});
 for(const soldier of few)assert.equal(universalBp(packs,quiet,live(quiet,soldier)),1500+500);
 assert.equal(universalBp(packs,quiet,live(quiet,catalogue)),2000);
 assert.equal(universalBp(packs,quiet,quiet.players[0].energy[3]),500);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('new shared profiles reject malformed arguments',()=>{
 const basic={id:'T',name:'Test',color:'green',energy:0,ap:1,bp:1000,gen:1,
  type:'character',implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-impact',cards:[{...basic,
  effects:{onPlay:[{op:'grantOwnOtherTraitImpact',trait:'',amount:1,optional:true}]}}]}),/invalid/);
 assert.throws(()=>createUniversalPack({id:'bad-hand',cards:[{...basic,
  mainAbility:{op:'restSelfBuffOtherThenHand',bp:1000}}]}),/unsupported main/);
 assert.throws(()=>createUniversalPack({id:'bad-field',cards:[{...basic,type:'character',
  mainAbility:{op:'restBuffOwnTraitScaled',trait:'影の軍団',bp:500,scaledMin:5,scaledBp:1000}}]}),/unsupported main/);
 assert.throws(()=>createUniversalPack({id:'bad-grant',cards:[{...basic,type:'event',bp:0,gen:0,
  effects:{onPlay:[{op:'grantOnAttack',target:'self',name:'向坂 雫',optional:true,
   until:'endOfTurn',then:[{op:'draw',count:1}]}]}}]}),/invalid granted attack/);
});
