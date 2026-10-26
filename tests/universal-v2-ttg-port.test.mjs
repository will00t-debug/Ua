import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
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
test('TTG additive pack preserves all 20 original V2 pilots, the registered additions, and a real 50-card mixed-title deck',()=>{
 const old=verifiedPilotPack('gurren-lagann');
 assert.deepEqual(TTG_V2_ADDITION_IDS,['TTG-1-020','TTG-1-067','TTG-1-028','TTG-1-006','TTG-1-005','TTG-1-014','TTG-1-019','TTG-1-010','TTG-1-023','TTG-1-018','TTG-1-063','TTG-1-053','TTG-1-077','TTG-1-022','TTG-1-015','TTG-1-002','TTG-1-007','TTG-1-013','TTG-1-057','TTG-1-071','TTG-1-054','TTG-1-055','TTG-1-026','TTG-1-081','TTG-1-011','TTG-1-016','TTG-1-035','TTG-1-041','TTG-1-048','TTG-1-076','TTG-1-008','TTG-1-025','TTG-1-030','TTG-1-039','TTG-1-044','TTG-1-050','TTG-1-029','TTG-1-003','TTG-1-017','TTG-1-040','TTG-1-068','TTG-1-070','TTG-1-080','TTG-1-060','TTG-1-059','TTG-1-058','TTG-1-069','TTG-1-024','TTG-1-075','TTG-1-021','TTG-1-004','TTG-1-012','TTG-1-027','TTG-1-031','TTG-1-032','TTG-1-033','TTG-1-034','TTG-1-056','TTG-1-061','TTG-1-062','TTG-1-074']);
 assert.equal(Object.keys(old.cards).length,20);
 assert.equal(Object.keys(ttg.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
 for(const [id,c] of Object.entries(old.cards))assert.deepEqual(ttg.cards[id].effects,c.effects);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
 assert.equal(ttg.cards['TTG-1-005'].impactNull,true);
 assert.equal(ttg.cards['TTG-1-005'].trigger,'draw');
 assert.equal(ttg.cards['TTG-1-014'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 assert.equal(Object.keys(ttg.cards).length,81);
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
 assert.equal(row.newlyContributed,TTG_V2_ADDITION_IDS.length);
 assert.equal(row.totalV2Cards,EXPECTED_V2_COUNTS['gurren-lagann']);
 const registered=registeredV2TitlePack('gurren-lagann');
 assert.equal(Object.keys(registered.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
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

test('Registry shares exactly the 20 original TTG pilot IDs plus the supported additions, no duplicated physical card ID',()=>{
 const pilot=Object.keys(verifiedPilotPack('gurren-lagann').cards);
 const ids=Object.keys(registeredV2TitlePack('gurren-lagann').cards);
 const additions=new Set(TTG_V2_ADDITION_IDS);
 assert.equal(pilot.length,20);
 assert.equal(additions.size,TTG_V2_ADDITION_IDS.length);
 assert.deepEqual(ids.filter(id=>!pilot.includes(id)).sort(),[...additions].sort());
 assert.ok(pilot.every(id=>!additions.has(id)));
 assert.equal(new Set(ids).size,EXPECTED_V2_COUNTS['gurren-lagann']);
 assert.deepEqual(listRegisteredV2Titles().slice(1,3).map(x=>x.totalV2Cards),[EXPECTED_V2_COUNTS['gurren-lagann'],EXPECTED_V2_COUNTS['solo-leveling']],
  'C title contribution counts stay exact independent of BLEACH A integration');
 assert.equal(Object.keys(registeredV2TitlePack('solo-leveling').cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
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

test('TTG-077 is registered with a source-locked exact Gunmen feature; other unported TTG IDs remain excluded',()=>{
 const pack=registeredV2TitlePack('gurren-lagann');
 assert.ok(pack.cards['TTG-1-077']);
 assert.equal(pack.cards['TTG-1-077'].type,'field');
 assert.deepEqual(pack.cards['TTG-1-077'].traits,['大グレン団','ガンメン']);
 assert.deepEqual(pack.cards['TTG-1-077'].effects.onPlay,[{
  op:'recoverOutsideOne',filter:{field:'trait',value:'ガンメン'},optional:true
 }]);
 const invalid={...ttgDeck,'TTG-1-001':3,'TTG-1-999':1};
 assert.equal(Object.values(invalid).reduce((n,k)=>n+k,0),50);
 assert.match(validateUniversalDeck(pack,invalid).join(';'),/Unregistered\/unsupported card: TTG-1-999/);
});

test('TTG-1-077 official onPlay recovers 0..1 Gunmen ONLY from own outside (red4, AP1, no life trigger)',()=>{
 const deck={...ttgDeck,'TTG-1-001':0,'TTG-1-077':4};
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 let state=newUniversalMatch(packs,{decks:[deck,slgDeck],first:0,seed:77});
 const source=take(state,0,'TTG-1-077'),other=take(state,0,'TTG-1-077');
 const ineligible=take(state,0,'TTG-1-009'),enemy=take(state,1,'SLG-1-005');
 // Own outside is the ONLY legal recovery zone. Do not use deck/hand or opponent.
 state.players[0].outside.push(other,ineligible);state.players[1].outside.push(enemy);
 for(let i=0;i<2;i++){
  const red=take(state,0,'TTG-1-049');red.ready=true;state.players[0].energy[i]=red;
 }
 state.players[0].hand.push(source);state=main(state);
 assert.equal(universalEnergyByColor(packs,state,0).red,4);
 const beforeAP=state.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const play=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(play);
 state=dispatchUniversalAction(packs,state,play);
 assert.equal(state.pending?.kind,'effect-recover-outside');
 assert.equal(state.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,beforeAP-1);
 assert.deepEqual(legalUniversalActions(packs,state),[
  {type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:other.uid}
 ]);
 for(const uid of [ineligible.uid,enemy.uid,source.uid,'0-forged'])
  assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid}),/not currently legal/);
 const skip=dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:null});
 assert.ok(skip.players[0].outside.some(c=>c.uid===other.uid));
 assert.equal(assertUniversalMatch(packs,skip),true);
 const handBefore=state.players[0].hand.length;
 const pick=dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:other.uid});
 assert.ok(pick.players[0].hand.some(c=>c.uid===other.uid));
 assert.equal(pick.players[0].hand.length,handBefore+1);
 assert.ok(!pick.players[0].outside.some(c=>c.uid===other.uid));
 assert.ok(pick.players[0].outside.some(c=>c.uid===ineligible.uid));
 assert.ok(pick.players[1].outside.some(c=>c.uid===enemy.uid));
 assert.equal(pick.pending,null);
 assert.equal(ttg.cards['TTG-1-077'].trigger,null);
 assert.equal(assertUniversalMatch(packs,pick),true);
});

test('TTG-077 official Gunmen trait recovers a DIFFERENT printed pilot TTG-072 from own outside, not merely another TTG-077 copy',()=>{
 const deck={...ttgDeck,'TTG-1-001':0,'TTG-1-072':2,'TTG-1-077':2};
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 let state=newUniversalMatch(packs,{decks:[deck,slgDeck],first:0,seed:77072});
 const source=take(state,0,'TTG-1-077'),gunmen=take(state,0,'TTG-1-072');
 const excluded=take(state,0,'TTG-1-009');
 state.players[0].outside.push(gunmen,excluded);
 for(let i=0;i<2;i++){const red=take(state,0,'TTG-1-049');red.ready=true;state.players[0].energy[i]=red;}
 state.players[0].hand.push(source);
 state=main(state);
 const action=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(action);
 state=dispatchUniversalAction(packs,state,action);
 assert.deepEqual(legalUniversalActions(packs,state),[
  {type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:gunmen.uid}
 ]);
 state=dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:gunmen.uid});
 assert.ok(state.players[0].hand.some(c=>c.uid===gunmen.uid));
 assert.ok(state.players[0].outside.some(c=>c.uid===excluded.uid));
 assert.equal(assertUniversalMatch(packs,state),true);
});

test('TTG-077 no qualifying OWN outside Gunmen: optional recovery does not create a mandatory phantom choice',()=>{
 const deck={...ttgDeck,'TTG-1-001':0,'TTG-1-077':4};
 let state=newUniversalMatch(packs,{decks:[deck,slgDeck],first:0,seed:7077});
 const source=take(state,0,'TTG-1-077'),notGunmen=take(state,0,'TTG-1-009');
 state.players[0].outside.push(notGunmen);
 for(let i=0;i<2;i++){const red=take(state,0,'TTG-1-049');red.ready=true;state.players[0].energy[i]=red;}
 state.players[0].hand.push(source);state=main(state);
 const beforeOutside=state.players[0].outside.length;
 const beforeHand=state.players[0].hand.length;
 const play=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(play);
 const after=dispatchUniversalAction(packs,state,play);
 assert.equal(after.pending,null);
 assert.equal(after.players[0].outside.length,beforeOutside);
 assert.equal(after.players[0].hand.length,beforeHand-1);
 assert.equal(after.players[0].energy.filter(Boolean).length,3);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('TTG-010/023 are exact limited TOP N and conditional-discard V2 programs (not full-deck searches)',()=>{
 const pack=registeredV2TitlePack('gurren-lagann');
 for(const [id,count,trait] of [['TTG-1-010',3,'大グレン団'],['TTG-1-023',5,'ガンメン']])
  assert.deepEqual(pack.cards[id].effects.onPlay,[{
   op:'searchTopOneBottomDiscard',count,filter:{field:'trait',value:trait}
  }]);
 assert.equal(pack.cards['TTG-1-010'].trigger,'draw');
 assert.equal(pack.cards['TTG-1-023'].trigger,null);
});
