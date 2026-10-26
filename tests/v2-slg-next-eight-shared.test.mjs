import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalCardEnergy} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Eight further Solo Leveling prints on the shared V2 engine.
// Official pages checked 2026-10-26:
// SLG-1-024, 067, 057, 003, 039, 077, 019, 060.
const slg=createSlgV2Pack(),packs=[slg,slg];
const batch=['SLG-1-024','SLG-1-067','SLG-1-057','SLG-1-003','SLG-1-039','SLG-1-077','SLG-1-019','SLG-1-060'];
const use=(s,a)=>dispatchUniversalAction(packs,s,a);

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
function toPhase(counts,seed,phase,first=0){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first});
 for(let i=0;i<8&&s.phase!==phase;i++)s=use(s,{type:'next'});
 assert.equal(s.phase,phase);
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
 assert.ok(action,'missing legal play '+uid);
 return use(s,action);
}
function secondAp(s,p=0){
 s.players[p].apCards[1].inPlay=true;
 s.players[p].apCards[1].ready=true;
}
function blockUids(s){
 return legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
}
function afterUnblocked(s){
 while(s.pending?.kind==='life-trigger')s=use(s,{type:'chooseTrigger',mode:'skip'});
 return use(s,{type:'next'});
}
function lacksTrait(s,p,trait){
 const pl=s.players[p];
 for(let i=pl.hand.length-1;i>=0;i--){
  const d=slg.cards[pl.hand[i].cardId];
  if(d.traits.includes(trait)||(d.traitComponents||[]).includes(trait))
   pl.deck.push(pl.hand.splice(i,1)[0]);
 }
}

test('eight further official SLG prints are registered on the shared engine',()=>{
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
 assert.deepEqual(slg.cards['SLG-1-024'].blockBpRestriction,
  {relation:'atLeast',bp:4000,condition:null});
 assert.deepEqual(slg.cards['SLG-1-067'].traitComponents,['DFN','第四次架南島レイド']);
 assert.equal(slg.cards['SLG-1-067'].triggerEffect.op,'deployHandCharacter');
 assert.equal(slg.cards['SLG-1-057'].triggerEffect.color,'green');
 assert.equal(slg.cards['SLG-1-003'].passiveBonuses[0].extraEnergy,1);
 assert.equal(slg.cards['SLG-1-060'].impactNull,true);
 assert.equal(slg.cards['SLG-1-060'].phaseEffects[0].then[0].op,'swapEnergyWithFrontSkip');
 assert.equal(EXPECTED_V2_IDS['solo-leveling'].length,80);
});

test('024 is not blocked by current BP 4000, and a lost block lets the opponent grant that rule',()=>{
 const counts=countsFor(['SLG-1-024','SLG-1-032','SLG-1-023','SLG-1-004','SLG-1-015']);
 let s=toPhase(counts,1024,'attack');
 const attacker=put(s,0,'SLG-1-024','front',0);
 const low=put(s,1,'SLG-1-032','front',0);
 const high=put(s,1,'SLG-1-023','front',1);
 s=use(s,{type:'attack',uid:attacker.uid});
 const blocked=blockUids(s);
 assert.ok(blocked.includes(low.uid));
 assert.equal(blocked.includes(high.uid),false);
 assert.throws(()=>use(s,{type:'chooseBlock',uid:high.uid}));

 let granted=toPhase(counts,2024,'attack',1);
 const beater=put(granted,1,'SLG-1-004','front',0);
 const ally=put(granted,1,'SLG-1-015','front',1);
 const wall=put(granted,0,'SLG-1-024','front',0);
 const big=put(granted,0,'SLG-1-023','front',1);
 const small=put(granted,0,'SLG-1-032','front',2);
 granted=use(granted,{type:'attack',uid:beater.uid});
 granted=use(granted,{type:'chooseBlock',uid:wall.uid});
 assert.equal(granted.pending.kind,'effect-grant-opp-block');
 assert.equal(granted.pending.player,1);
 granted=use(granted,{type:'chooseOppBlock',uid:ally.uid});
 assert.equal(live(granted,ally).blockAtLeastGranted.bp,4000);
 granted=use(granted,{type:'attack',uid:ally.uid});
 const later=blockUids(granted);
 assert.equal(later.includes(big.uid),false);
 assert.ok(later.includes(small.uid));
 assert.equal(assertUniversalMatch(packs,granted),true);

 let skipped=toPhase(counts,3024,'attack',1);
 const foe=put(skipped,1,'SLG-1-004','front',0);
 const other=put(skipped,1,'SLG-1-015','front',1);
 const victim=put(skipped,0,'SLG-1-024','front',0);
 const stillBig=put(skipped,0,'SLG-1-023','front',1);
 skipped=use(skipped,{type:'attack',uid:foe.uid});
 skipped=use(skipped,{type:'chooseBlock',uid:victim.uid});
 skipped=use(skipped,{type:'chooseOppBlock',uid:null});
 assert.equal(live(skipped,other).blockAtLeastGranted,undefined);
 skipped=use(skipped,{type:'attack',uid:other.uid});
 assert.ok(blockUids(skipped).includes(stillBig.uid));
});

test('067 draws, readies and gains BP only when three DFN cards are present, once per name',()=>{
 const counts=countsFor(['SLG-1-067','SLG-1-055','SLG-1-066','SLG-1-050','SLG-1-052','SLG-1-069','SLG-1-072']);
 let s=toPhase(counts,1067,'main');
 put(s,0,'SLG-1-055','energy',0);put(s,0,'SLG-1-066','energy',1);
 put(s,0,'SLG-1-050','energy',2);put(s,0,'SLG-1-052','energy',3);
 put(s,0,'SLG-1-069','front',1);put(s,0,'SLG-1-072','front',2);
 const first=take(s,0,'SLG-1-067');s.players[0].hand.push(first);
 const before=s.players[0].hand.length;
 s=play(s,first.uid,'front',0);
 assert.equal(s.players[0].hand.length,before);
 assert.equal(live(s,first).ready,true);
 assert.equal(universalBp(packs,s,live(s,first)),4000);
 secondAp(s);
 const again=take(s,0,'SLG-1-067');s.players[0].hand.push(again);
 const held=s.players[0].hand.length;
 s=play(s,again.uid,'front',3);
 assert.equal(s.players[0].hand.length,held-1);
 assert.equal(live(s,again).ready,false);
 assert.equal(universalBp(packs,s,live(s,again)),3000);

 let miss=toPhase(counts,2067,'main');
 put(miss,0,'SLG-1-055','energy',0);put(miss,0,'SLG-1-066','energy',1);
 put(miss,0,'SLG-1-050','energy',2);put(miss,0,'SLG-1-052','energy',3);
 const lonely=take(miss,0,'SLG-1-067');miss.players[0].hand.push(lonely);
 const lonelyHand=miss.players[0].hand.length;
 miss=play(miss,lonely.uid,'front',0);
 assert.equal(miss.players[0].hand.length,lonelyHand-1);
 assert.equal(live(miss,lonely).ready,false);
 assert.equal(miss.onceEffectUses[0].includes('name:カナ'),false);
 put(miss,0,'SLG-1-069','front',1);put(miss,0,'SLG-1-072','front',2);
 secondAp(miss);
 const later=take(miss,0,'SLG-1-067');miss.players[0].hand.push(later);
 const laterHand=miss.players[0].hand.length;
 miss=play(miss,later.uid,'front',3);
 assert.equal(miss.players[0].hand.length,laterHand);
 assert.equal(live(miss,later).ready,true);
 assert.equal(universalBp(packs,miss,live(miss,later)),4000);
});

test('057 readies and gains the next-ACTIVE skip immediately at five island-raid cards',()=>{
 const counts=countsFor(['SLG-1-057','SLG-1-062','SLG-1-054','SLG-1-063','SLG-1-056']);
 let s=toPhase(counts,1057,'main');
 put(s,0,'SLG-1-062','energy',0);put(s,0,'SLG-1-054','energy',1);
 put(s,0,'SLG-1-063','energy',2);put(s,0,'SLG-1-056','energy',3);
 const actor=take(s,0,'SLG-1-057');s.players[0].hand.push(actor);
 s=play(s,actor.uid,'front',0);
 assert.equal(live(s,actor).ready,true);
 assert.equal(live(s,actor).attackSkipGranted,undefined);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===actor.uid));
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=use(s,{type:'attack',uid:actor.uid});
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===actor.uid));
 s=use(s,{type:'chooseBlock',uid:null});
 s=afterUnblocked(s);
 assert.equal(s.active,1);
 assert.equal(live(s,actor).ready,false);
 secondAp(s,0);
 // The name gate was spent on player 0's turn, which has already ended.
 let again=toPhase(counts,2057,'main');
 put(again,0,'SLG-1-062','energy',0);put(again,0,'SLG-1-054','energy',1);
 put(again,0,'SLG-1-063','energy',2);put(again,0,'SLG-1-056','energy',3);
 const one=take(again,0,'SLG-1-057');again.players[0].hand.push(one);
 again=play(again,one.uid,'front',0);
 secondAp(again);
 const two=take(again,0,'SLG-1-057');again.players[0].hand.push(two);
 again=play(again,two.uid,'front',1);
 assert.equal(live(again,two).ready,false);
 assert.equal(live(again,two).attackSkipGranted,undefined);
 assert.equal(again.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===two.uid),false);
});

test('003 generates an extra energy at ten outside cards and buffs when recovered by an own effect',()=>{
 const counts=countsFor(['SLG-1-003','SLG-1-025','SLG-1-006','SLG-1-001','SLG-1-015','SLG-1-002']);
 let s=toPhase(counts,1003,'main');
 const rin=put(s,0,'SLG-1-003','energy',0);
 s.players[0].outside.push(...s.players[0].deck.splice(0,9));
 assert.equal(universalCardEnergy(packs,s,0,rin),1);
 s.players[0].outside.push(s.players[0].deck.shift());
 assert.equal(universalCardEnergy(packs,s,0,live(s,rin)),2);

 let back=toPhase(counts,2003,'main');
 put(back,0,'SLG-1-006','energy',0,{ready:true});
 put(back,0,'SLG-1-001','energy',1);
 put(back,0,'SLG-1-015','energy',2);
 const ally=put(back,0,'SLG-1-002','energy',3);
 const recovered=take(back,0,'SLG-1-003');
 back.players[0].outside.push(recovered);
 secondAp(back);
 const caster=take(back,0,'SLG-1-025');back.players[0].hand.push(caster);
 back=play(back,caster.uid,'front',0);
 back=use(back,{type:'chooseEffectMode',mode:'drawRecover'});
 assert.equal(back.pending.kind,'effect-recover-outside');
 assert.ok(back.pending.choices.includes(recovered.uid));
 back=use(back,{type:'chooseOutsideRecovery',uid:recovered.uid});
 assert.equal(back.pending.kind,'effect-buff-own');
 back=use(back,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,back,live(back,ally)),1500);
 assert.ok(back.players[0].hand.some(c=>c.uid===recovered.uid));
 assert.equal(back.players[0].outside.some(c=>c.uid===recovered.uid),false);
 assert.equal(assertUniversalMatch(packs,back),true);
});

test('039 deploys one shadow-army character ACTIVE or two energy-3-or-less characters REST',()=>{
 const counts=countsFor(['SLG-1-039','SLG-1-006','SLG-1-001','SLG-1-015','SLG-1-002','SLG-1-030','SLG-1-027','SLG-1-028','SLG-1-032']);
 let s=toPhase(counts,1039,'main');
 put(s,0,'SLG-1-006','energy',0);put(s,0,'SLG-1-001','energy',1);
 put(s,0,'SLG-1-015','energy',2);put(s,0,'SLG-1-002','energy',3);
 const soldier=take(s,0,'SLG-1-030'),iron=take(s,0,'SLG-1-027');
 const igrit=take(s,0,'SLG-1-028'),tank=take(s,0,'SLG-1-032');
 s.players[0].outside.push(soldier,iron,igrit,tank);
 const event=take(s,0,'SLG-1-039');s.players[0].hand.push(event);
 s=play(s,event.uid);
 s=use(s,{type:'chooseEffectMode',mode:'activeOne'});
 assert.equal(s.pending.kind,'effect-deploy-outside');
 assert.deepEqual([...s.pending.choices].sort(),[soldier.uid,iron.uid,igrit.uid].sort());
 assert.equal(s.pending.choices.includes(tank.uid),false);
 s=use(s,{type:'chooseDeployOutside',uid:soldier.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].uid,soldier.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.pending,null);

 let rest=toPhase(counts,2039,'main');
 put(rest,0,'SLG-1-006','energy',0);put(rest,0,'SLG-1-001','energy',1);
 put(rest,0,'SLG-1-015','energy',2);put(rest,0,'SLG-1-002','energy',3);
 const a=take(rest,0,'SLG-1-030'),b=take(rest,0,'SLG-1-027');
 const c=take(rest,0,'SLG-1-028'),d=take(rest,0,'SLG-1-032');
 rest.players[0].outside.push(a,b,c,d);
 const ev=take(rest,0,'SLG-1-039');rest.players[0].hand.push(ev);
 rest=play(rest,ev.uid);
 rest=use(rest,{type:'chooseEffectMode',mode:'restTwo'});
 assert.deepEqual([...rest.pending.choices].sort(),[a.uid,b.uid].sort());
 rest=use(rest,{type:'chooseDeployOutside',uid:a.uid,line:'front',slot:1});
 assert.equal(rest.pending.kind,'effect-deploy-outside');
 assert.equal(rest.pending.remaining,1);
 rest=use(rest,{type:'chooseDeployOutside',uid:b.uid,line:'front',slot:0});
 assert.equal(rest.players[0].front[1].uid,a.uid);
 assert.equal(rest.players[0].front[1].ready,false);
 assert.equal(rest.players[0].front[0].ready,false);
 assert.equal(rest.pending,null);
 assert.ok(rest.players[0].outside.some(x=>x.uid===c.uid));
 assert.ok(rest.players[0].outside.some(x=>x.uid===d.uid));

 let skip=toPhase(counts,3039,'main');
 put(skip,0,'SLG-1-006','energy',0);put(skip,0,'SLG-1-001','energy',1);
 put(skip,0,'SLG-1-015','energy',2);put(skip,0,'SLG-1-002','energy',3);
 const left=take(skip,0,'SLG-1-030');skip.players[0].outside.push(left);
 const skipped=take(skip,0,'SLG-1-039');skip.players[0].hand.push(skipped);
 skip=play(skip,skipped.uid);
 skip=use(skip,{type:'chooseEffectMode',mode:'activeOne'});
 skip=use(skip,{type:'chooseDeployOutside',uid:null});
 assert.ok(skip.players[0].outside.some(x=>x.uid===left.uid));
 assert.equal(skip.players[0].front.every(x=>!x),true);
});

test('077 raises the retire limit at five island-raid cards and buffs only at five distinct names',()=>{
 const low=countsFor(['SLG-1-077','SLG-1-055','SLG-1-066','SLG-1-050','SLG-1-052','SLG-1-062','SLG-1-056']);
 let s=toPhase(low,1077,'main');
 put(s,0,'SLG-1-055','energy',0);put(s,0,'SLG-1-066','energy',1);
 put(s,0,'SLG-1-050','energy',2);put(s,0,'SLG-1-052','energy',3);
 const small=put(s,1,'SLG-1-062','front',0);
 const mid=put(s,1,'SLG-1-056','front',1);
 const event=take(s,0,'SLG-1-077');s.players[0].hand.push(event);
 s=play(s,event.uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,2000);
 assert.ok(s.pending.choices.includes(small.uid));
 assert.equal(s.pending.choices.includes(mid.uid),false);
 s=use(s,{type:'chooseRetireBp',uid:small.uid});
 assert.equal(s.pending,null);

 const named=countsFor(['SLG-1-077','SLG-1-056','SLG-1-062','SLG-1-054','SLG-1-069','SLG-1-072','SLG-1-063','SLG-1-021','SLG-1-023']);
 let wide=toPhase(named,2077,'main');
 put(wide,0,'SLG-1-056','energy',0);put(wide,0,'SLG-1-062','energy',1);
 put(wide,0,'SLG-1-054','energy',2);put(wide,0,'SLG-1-069','energy',3);
 const fifth=put(wide,0,'SLG-1-072','front',0);
 const legalHigh=put(wide,1,'SLG-1-021','front',0);
 const illegal=put(wide,1,'SLG-1-023','front',1);
 const always=put(wide,1,'SLG-1-063','front',2);
 legalHigh.buffs=[{bp:1000,untilTurn:wide.turn}];
 illegal.buffs=[{bp:1500,untilTurn:wide.turn}];
 const wideEvent=take(wide,0,'SLG-1-077');wide.players[0].hand.push(wideEvent);
 wide=play(wide,wideEvent.uid);
 assert.equal(wide.pending.limit,5000);
 assert.ok(wide.pending.choices.includes(legalHigh.uid));
 assert.ok(wide.pending.choices.includes(always.uid));
 assert.equal(wide.pending.choices.includes(illegal.uid),false);
 wide=use(wide,{type:'chooseRetireBp',uid:always.uid});
 assert.equal(wide.pending.kind,'effect-buff-own');
 wide=use(wide,{type:'chooseOwnBuff',uid:fifth.uid});
 assert.equal(universalBp(packs,wide,live(wide,fifth)),3000);

 const four=countsFor(['SLG-1-077','SLG-1-056','SLG-1-062','SLG-1-054','SLG-1-069','SLG-1-066','SLG-1-063','SLG-1-074']);
 let narrow=toPhase(four,3077,'main');
 put(narrow,0,'SLG-1-056','energy',0);put(narrow,0,'SLG-1-062','energy',1);
 put(narrow,0,'SLG-1-054','energy',2);put(narrow,0,'SLG-1-069','energy',3);
 put(narrow,0,'SLG-1-066','front',0);
 const still=put(narrow,1,'SLG-1-063','front',0);
 const over=put(narrow,1,'SLG-1-074','front',1);
 const narrowEvent=take(narrow,0,'SLG-1-077');narrow.players[0].hand.push(narrowEvent);
 narrow=play(narrow,narrowEvent.uid);
 assert.equal(narrow.pending.limit,2000);
 assert.ok(narrow.pending.choices.includes(still.uid));
 assert.equal(narrow.pending.choices.includes(over.uid),false);
 narrow=use(narrow,{type:'chooseRetireBp',uid:still.uid});
 assert.equal(narrow.pending,null);

 const dup=countsFor(['SLG-1-077','SLG-1-056','SLG-1-062','SLG-1-063','SLG-1-054','SLG-1-069','SLG-1-021','SLG-1-023']);
 let same=toPhase(dup,4077,'main');
 put(same,0,'SLG-1-056','energy',0);put(same,0,'SLG-1-062','energy',1);
 put(same,0,'SLG-1-063','energy',2);put(same,0,'SLG-1-054','energy',3);
 put(same,0,'SLG-1-069','front',0);
 const scaled=put(same,1,'SLG-1-021','front',0);
 const tooBig=put(same,1,'SLG-1-023','front',1);
 scaled.buffs=[{bp:1000,untilTurn:same.turn}];
 tooBig.buffs=[{bp:1500,untilTurn:same.turn}];
 const dupEvent=take(same,0,'SLG-1-077');same.players[0].hand.push(dupEvent);
 same=play(same,dupEvent.uid);
 assert.equal(same.pending.limit,5000);
 assert.ok(same.pending.choices.includes(scaled.uid));
 assert.equal(same.pending.choices.includes(tooBig.uid),false);
 same=use(same,{type:'chooseRetireBp',uid:scaled.uid});
 assert.equal(same.pending,null);
});

test('019 recovers itself from outside by discarding a shadow-army hand card, once per name',()=>{
 const counts=countsFor(['SLG-1-019','SLG-1-030','SLG-1-015']);
 let s=toPhase(counts,1019,'main');
 const first=take(s,0,'SLG-1-019'),second=take(s,0,'SLG-1-019');
 const shadow=take(s,0,'SLG-1-030'),other=take(s,0,'SLG-1-015');
 s.players[0].outside.push(first,second);
 s.players[0].hand.push(shadow,other);
 const modes=legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.mode==='outsideTraitHand');
 assert.deepEqual(modes.map(a=>a.uid).sort(),[first.uid,second.uid].sort());
 s=use(s,{type:'activate',uid:first.uid,mode:'outsideTraitHand'});
 assert.equal(s.pending.kind,'effect-outside-cost-hand');
 assert.ok(s.pending.choices.includes(shadow.uid));
 assert.equal(s.pending.choices.includes(other.uid),false);
 s=use(s,{type:'chooseOutsideCostHand',uid:shadow.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===first.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===shadow.uid));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===second.uid&&a.mode==='outsideTraitHand'),false);

 let played=toPhase(counts,2019,'main');
 put(played,0,'SLG-1-015','energy',0);
 const actor=take(played,0,'SLG-1-019');
 const pay=take(played,0,'SLG-1-030');
 played.players[0].hand.push(actor,pay);
 const deck=played.players[0].deck.length;
 played=play(played,actor.uid,'front',0);
 assert.equal(played.pending.kind,'effect-discard-gate');
 played=use(played,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(played.players[0].deck.length,deck-1);
 assert.ok(played.players[0].outside.some(c=>c.uid===pay.uid));

 let declined=toPhase(counts,3019,'main');
 put(declined,0,'SLG-1-015','energy',0);
 const body=take(declined,0,'SLG-1-019'),kept=take(declined,0,'SLG-1-030');
 declined.players[0].hand.push(body,kept);
 const keptDeck=declined.players[0].deck.length;
 declined=play(declined,body.uid,'front',0);
 declined=use(declined,{type:'chooseDiscardGate',uid:null});
 assert.equal(declined.players[0].deck.length,keptDeck);
 assert.ok(declined.players[0].hand.some(c=>c.uid===kept.uid));

 let bare=toPhase(counts,4019,'main');
 const outsideOnly=take(bare,0,'SLG-1-019');
 bare.players[0].outside.push(outsideOnly);
 lacksTrait(bare,0,'影の軍団');
 assert.equal(legalUniversalActions(packs,bare).some(a=>a.mode==='outsideTraitHand'),false);
});

test('060 swaps from the energy line with a front character that has skip-next-active',()=>{
 const counts=countsFor(['SLG-1-060','SLG-1-057','SLG-1-062','SLG-1-054','SLG-1-063','SLG-1-056']);
 let s=toPhase(counts,1060,'main');
 const energy=put(s,0,'SLG-1-060','energy',0);
 put(s,0,'SLG-1-062','energy',1);put(s,0,'SLG-1-054','energy',2);
 const plain=put(s,0,'SLG-1-063','front',1);
 const other=put(s,0,'SLG-1-056','front',2);
 const actor=take(s,0,'SLG-1-057');s.players[0].hand.push(actor);
 s=play(s,actor.uid,'front',0);
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:actor.uid});
 s=use(s,{type:'chooseBlock',uid:null});
 s=afterUnblocked(s);
 assert.equal(s.pending.kind,'effect-energy-skip-swap');
 assert.deepEqual(s.pending.choices.map(c=>c.uid),[actor.uid]);
 assert.equal(s.pending.choices.some(c=>c.uid===plain.uid||c.uid===other.uid),false);
 s=use(s,{type:'chooseEnergySkipSwap',uid:actor.uid});
 assert.equal(s.players[0].front[0].uid,energy.uid);
 assert.equal(s.players[0].energy[0].uid,actor.uid);
 assert.equal(assertUniversalMatch(packs,s),true);

 let stay=toPhase(counts,2060,'main');
 const staying=put(stay,0,'SLG-1-060','energy',0);
 put(stay,0,'SLG-1-062','energy',1);put(stay,0,'SLG-1-054','energy',2);
 put(stay,0,'SLG-1-063','front',1);
 const skipped=take(stay,0,'SLG-1-057');stay.players[0].hand.push(skipped);
 stay=play(stay,skipped.uid,'front',0);
 stay=use(stay,{type:'next'});
 stay=use(stay,{type:'attack',uid:skipped.uid});
 stay=use(stay,{type:'chooseBlock',uid:null});
 stay=afterUnblocked(stay);
 stay=use(stay,{type:'chooseEnergySkipSwap',uid:null});
 assert.equal(stay.players[0].energy[0].uid,staying.uid);
 assert.equal(stay.players[0].front[0].uid,skipped.uid);

 let front=toPhase(counts,3060,'main');
 const source=put(front,0,'SLG-1-060','front',1);
 put(front,0,'SLG-1-062','energy',0);put(front,0,'SLG-1-054','energy',1);
 put(front,0,'SLG-1-063','energy',2);put(front,0,'SLG-1-056','energy',3);
 const entered=take(front,0,'SLG-1-057');front.players[0].hand.push(entered);
 front=play(front,entered.uid,'front',0);
 front=use(front,{type:'next'});
 front=use(front,{type:'attack',uid:entered.uid});
 front=use(front,{type:'chooseBlock',uid:null});
 front=afterUnblocked(front);
 assert.equal(front.pending,null);
 assert.equal(front.players[0].front[1].uid,source.uid);
 assert.equal(front.players[0].front[0].uid,entered.uid);
});

test('new shared profiles reject empty, mistimed or under-threshold prints',()=>{
 const shell={id:'X',name:'試',color:'green',type:'character',energy:1,ap:1,
  bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const pack=cards=>createUniversalPack({id:'slg-next-negative',cards});
 assert.throws(()=>pack([{...shell,effects:{onPlay:[{op:'deployOutsideFiltered',
  trait:'',count:1,ready:true,optional:true}]}}]),/invalid/);
 assert.throws(()=>pack([{...shell,effects:{onPlay:[{op:'oncePerTurnGate',scope:'name',
  optional:false,then:[{op:'retireOppFrontUnderBp',bp:2000}]}]}}]),/invalid once-per-turn/);
 assert.throws(()=>pack([{...shell,phaseEffects:[{phase:'main',edge:'end',turn:'own',
  then:[{op:'swapEnergyWithFrontSkip'}]}]}]),/invalid attack-end energy skip swap/);
 assert.throws(()=>pack([{...shell,mainAbility:{op:'outsideDiscardTraitToHand',
  trait:'影の軍団',oncePerTurn:true}}]),/unsupported main/);
 assert.throws(()=>pack([{...shell,effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:2000,
  scaleTrait:'第四次架南島レイド',scaleMin:5,scaleBp:2000}]}}]),/unsupported printed BP/);
});
