import test from 'node:test';
import assert from 'node:assert/strict';
import {createTtgV2Pack,TTG_V2_ADDITION_IDS} from '../dist/universal-v2/ttg-pack.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {registeredV2TitlePack,listRegisteredV2Titles} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const ttg=createTtgV2Pack(),slg=createSlgV2Pack(),packs=[ttg,slg];
const ttgDeck=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
const slgDeck=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-038']=2;
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[ttgDeck,slgDeck],seed:56,first});
function take(s,player,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('No fixture: '+id);
}
function main(s){
 while(s.phase!=='main'){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 return s;
}
test('TTG additive pack preserves all 20 original V2 pilots; 3 supported additions and real 50-card mixed-title deck',()=>{
 const old=verifiedPilotPack('gurren-lagann');
 assert.deepEqual(TTG_V2_ADDITION_IDS,['TTG-1-005','TTG-1-014','TTG-1-019']);
 assert.equal(Object.keys(old.cards).length,20);
 assert.equal(Object.keys(ttg.cards).length,23);
 for(const [id,c] of Object.entries(old.cards))assert.deepEqual(ttg.cards[id].effects,c.effects);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
 assert.equal(ttg.cards['TTG-1-005'].impactNull,true);
 assert.equal(ttg.cards['TTG-1-005'].trigger,'draw');
 assert.equal(ttg.cards['TTG-1-014'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 assert.ok(!ttg.cards['TTG-1-074'],'complex unported TTG Raid must fail closed');
});
test('TTG-1-014 ordinary onPlay spends AP, offers only eligible own bounce UID, and rejects forged choice',()=>{
 let s=fresh(),energy=take(s,0,'TTG-1-005'),source=take(s,0,'TTG-1-014');
 energy.ready=true;s.players[0].energy[0]=energy;s.players[0].hand.push(source);
 s=main(s);
 const beforeAp=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,beforeAp-1);
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseOwnBounce',uid:energy.uid}]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:'0-forged'}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:energy.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===energy.uid));
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('TTG-1-019 ACTIVE generates an extra GREEN energy only until REST, retaining physical-card conservation',()=>{
 const s=fresh(),c=take(s,0,'TTG-1-019');s.players[0].energy[0]=c;c.ready=true;
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 c.ready=false;assert.equal(universalEnergyByColor(packs,s,0).green,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('TTG contribution is consumable by latest shared V2 title registry and is disjoint from original pilots',()=>{
 const row=listRegisteredV2Titles().find(x=>x.title==='gurren-lagann');
 assert.equal(row.baselinePilots,20);
 assert.equal(row.newlyContributed,3);
 assert.equal(row.totalV2Cards,23);
 const registered=registeredV2TitlePack('gurren-lagann');
 assert.equal(Object.keys(registered.cards).length,23);
 for(const id of TTG_V2_ADDITION_IDS){
  assert.deepEqual(registered.cards[id].effects,ttg.cards[id].effects);
  assert.equal(registered.cards[id].trigger,ttg.cards[id].trigger);
 }
});

test('TTG-014 has NO optional cancel: without another eligible own character it returns itself, conserving UID',()=>{
 let state=fresh(),source=take(state,0,'TTG-1-014');
 state.players[0].hand.push(source);
 // A green energy source only with printed energy above one cannot be bounced.
 const energy=take(state,0,'TTG-1-019');
 energy.ready=true;state.players[0].energy[0]=energy;
 state=main(state);
 const play=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 const s=dispatchUniversalAction(packs,state,play);
 assert.equal(s.pending,null,'mandatory self-bounce resolves automatically with zero eligible other targets');
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].front.filter(Boolean).length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('TTG-1-005 DRAW life can be declined, or draws exactly one owned top-deck physical card',()=>{
 let s=fresh(1),attacker=take(s,1,'SLG-1-005'),flip=take(s,0,'TTG-1-005');
 attacker.ready=true;s.players[1].front[0]=attacker;
 const old=s.players[0].life.shift();s.players[0].deck.push(old);s.players[0].life.unshift(flip);
 while(s.phase!=='attack'){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending.trigger,'draw');
 const actions=legalUniversalActions(packs,s);
 assert.ok(actions.some(a=>a.mode==='skip')&&actions.some(a=>a.mode==='draw'));
 const originalDeck=s.players[0].deck.length,originalHand=s.players[0].hand.length;
 const declined=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(declined.players[0].deck.length,originalDeck);
 assert.equal(declined.players[0].hand.length,originalHand);
 assert.ok(declined.players[0].outside.some(c=>c.uid===flip.uid));
 const resolved=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:0});
 assert.equal(resolved.players[0].deck.length,originalDeck-1);
 assert.equal(resolved.players[0].hand.length,originalHand+1);
 assert.ok(resolved.players[0].outside.some(c=>c.uid===flip.uid));
 assert.equal(assertUniversalMatch(packs,resolved),true);
});

test('Registry shares exactly the 20 original TTG pilot IDs plus THREE new, no duplicated physical card ID',()=>{
 const pilot=Object.keys(verifiedPilotPack('gurren-lagann').cards);
 const ids=Object.keys(registeredV2TitlePack('gurren-lagann').cards);
 const additions=new Set(TTG_V2_ADDITION_IDS);
 assert.equal(pilot.length,20);
 assert.equal(additions.size,3);
 assert.deepEqual(ids.filter(id=>!pilot.includes(id)).sort(),[...additions].sort());
 assert.ok(pilot.every(id=>!additions.has(id)));
 assert.equal(new Set(ids).size,23);
 assert.deepEqual(listRegisteredV2Titles().slice(1,3).map(x=>x.totalV2Cards),[23,18],
  'C title contribution counts stay exact independent of BLEACH A integration');
 assert.equal(Object.keys(registeredV2TitlePack('solo-leveling').cards).length,18);
});

test('Real title registry decks play cross-title turns on ONE V2 engine without losing a physical UID',()=>{
 const rp=[registeredV2TitlePack('gurren-lagann'),registeredV2TitlePack('solo-leveling')];
 assert.deepEqual(validateUniversalDeck(rp[0],ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(rp[1],slgDeck),[]);
 let s=newUniversalMatch(rp,{decks:[ttgDeck,slgDeck],seed:188,first:0});
 const identity=(state,i)=>{
  const p=state.players[i],cards=[...p.deck,...p.hand,...p.life,...p.outside,...p.removed,
   ...p.front.filter(Boolean),...p.energy.filter(Boolean)];
  return cards.map(c=>c.uid).sort();
 };
 const before=[identity(s,0),identity(s,1)];
 assert.deepEqual(s.packIds,['gurren-lagann','solo-leveling']);
 assert.equal(s.packVersions[0],rp[0].version);
 assert.equal(s.packVersions[1],rp[1].version);
 // No test-only fallback: these must be the real C registered packs.
 assert.equal(rp[0].cards['TTG-1-014'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 assert.equal(rp[1].cards['SLG-1-068'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 for(let turn=0;turn<2;turn++){
  const actor=s.active;
  while(s.phase!=='main'){
   const next=legalUniversalActions(rp,s).find(a=>a.type==='next');
   assert.ok(next);s=dispatchUniversalAction(rp,s,next);
  }
  const event=legalUniversalActions(rp,s).find(a=>a.type==='play'&&rp[actor].cards[
   s.players[actor].hand.find(c=>c.uid===a.uid)?.cardId]?.energy===0);
  if(event){
   s=dispatchUniversalAction(rp,s,event);
   // All printed onPlay choices need explicit resolution before end turn.
   while(s.pending){
    const choice=legalUniversalActions(rp,s)[0];
    assert.ok(choice);s=dispatchUniversalAction(rp,s,choice);
   }
  }
  while(s.active===actor&&s.status==='playing'){
   const next=legalUniversalActions(rp,s).find(a=>a.type==='next');
   assert.ok(next);s=dispatchUniversalAction(rp,s,next);
  }
  assert.equal(assertUniversalMatch(rp,s),true);
  assert.deepEqual(identity(s,0),before[0]);
  assert.deepEqual(identity(s,1),before[1]);
 }
 assert.equal(s.active,0);
 assert.equal(s.players[0].ownTurns,2);
 assert.equal(s.players[1].ownTurns,1);
});

test('TTG-077 remains fail-closed: own-outside [ガンメン] recovery cannot silently miss composite traits',()=>{
 const pack=registeredV2TitlePack('gurren-lagann');
 assert.equal(pack.cards['TTG-1-077'],undefined);
 const invalid={...ttgDeck,'TTG-1-001':3,'TTG-1-077':1};
 assert.equal(Object.values(invalid).reduce((n,k)=>n+k,0),50);
 assert.match(validateUniversalDeck(pack,invalid).join(';'),/Unregistered\/unsupported card: TTG-1-077/);
});
