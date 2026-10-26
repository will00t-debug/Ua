import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {effectChoiceProtected} from '../dist/universal-v2/continuous-states.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Eight further Solo Leveling prints on the shared V2 engine.
// Official pages checked 2026-10-26:
// SLG-1-033, 029, 031, 011, 044, 059, 061, 020.
const slg=createSlgV2Pack(),packs=[slg,slg];
const batch=['SLG-1-033','SLG-1-029','SLG-1-031','SLG-1-011','SLG-1-044','SLG-1-059','SLG-1-061','SLG-1-020'];
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
function toHand(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
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
function clearBattle(s){
 while(s.pending?.kind==='effect-attack-aid')s=use(s,{type:'chooseAttackAid',mode:'skip'});
 if(s.pending?.kind==='block')s=use(s,{type:'chooseBlock',uid:null});
 while(s.pending?.kind==='life-trigger')s=use(s,{type:'chooseTrigger',mode:'skip'});
 return s;
}
function lift(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i<0)continue;
  pl.deck.unshift(pl[zone].splice(i,1)[0]);
  return pl.deck[0];
 }
 throw Error('cannot lift '+id);
}
function settle(s){
 const skip={
  'effect-discard-gate':{type:'chooseDiscardGate',uid:null},
  'effect-buff-own':{type:'chooseOwnBuff',uid:null},
  'effect-optional-mill':{type:'chooseOptionalMill',mode:'skip'},
  'effect-active-own-trait':{type:'chooseActiveOwnTrait',uid:null},
  'effect-attack-aid':{type:'chooseAttackAid',mode:'skip'},
  'effect-attack-aid-grant':{type:'chooseAttackAidGrant',uid:null},
  'life-trigger':{type:'chooseTrigger',mode:'skip'},
  'block':{type:'chooseBlock',uid:null},
  'effect-discard':null
 };
 let guard=0;
 while(s.pending&&guard++<16){
  const action=skip[s.pending.kind];
  if(!action)throw Error('stuck on '+s.pending.kind);
  s=use(s,action);
 }
 return s;
}
function passTo(s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase)&&guard++<24){
  s=settle(s);
  if(s.active===player&&s.phase===phase)break;
  if(s.pending)throw Error('unsettled '+s.pending.kind);
  s=use(s,{type:'next'});
 }
 assert.equal(s.active,player);
 assert.equal(s.phase,phase);
 return s;
}

test('eight more official SLG prints are registered on the shared engine',()=>{
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
 assert.equal(slg.cards['SLG-1-033'].effects.onAttack[0].scope,'name');
 assert.equal(slg.cards['SLG-1-029'].attackAid.options.length,2);
 assert.equal(slg.cards['SLG-1-031'].attackAid.options[1].grant,'drawDiscard');
 assert.equal(slg.cards['SLG-1-011'].ownOutsideRecovery.op,'playSelfMeetEnergy');
 assert.equal(slg.cards['SLG-1-011'].triggerEffect.frontOnly,true);
 assert.equal(slg.cards['SLG-1-044'].mainAbility.op,'restTuckTopDamage');
 assert.equal(slg.cards['SLG-1-044'].triggerEffect.op,'deployHandCharacter');
 assert.equal(slg.cards['SLG-1-059'].effects.onAttack[0].skipSelfIfAdded,true);
 assert.equal(slg.cards['SLG-1-061'].phaseEffects[0].then[0].then[0].op,'activeOwnTrait');
 assert.equal(slg.cards['SLG-1-020'].raidName,'水篠 旬');
 assert.equal(EXPECTED_V2_IDS['solo-leveling'].length,80);
 assert.equal(slg.cards['SLG-1-047'].phaseEffects[0].then[0].op,'chainRaidHand');
 assert.match(V2_PENDING_LABELS['effect-attack-aid'],/協助/);
 assert.match(V2_PENDING_LABELS['effect-tuck-damage'],/裏向/);
 assert.match(V2_PENDING_LABELS['effect-active-own-trait'],/ACTIVE/);
 assert.equal(uiActionLabel({type:'chooseAttackAid',mode:'skip'}),'不協助');
 assert.match(uiActionLabel({type:'activate',mode:'restTuckDamage'}),/裏向/);
 assert.match(uiActionLabel({type:'chooseRecoveredEntry',mode:'enter',line:'front',slot:0},
  {state:{pending:{ready:false}}}),/REST 登場至前線 1/);
 assert.match(uiActionLabel({type:'chooseRecoveredEntry',mode:'enter',line:'energy',slot:1},
  {state:{pending:{ready:true}}}),/ACTIVE 登場至能源線 2/);
});

test('033 actives itself only after a paid discard, and the name is shared',()=>{
 const counts=countsFor(['SLG-1-033','SLG-1-030','SLG-1-032','SLG-1-023']);
 let s=toPhase(counts,1033,'attack');
 const bell=put(s,0,'SLG-1-033','front',0);
 const rests=[1,2,3].map(slot=>put(s,0,'SLG-1-030','front',slot,{ready:false}));
 rests.push(put(s,0,'SLG-1-030','energy',0,{ready:false}));
 s=use(s,{type:'attack',uid:bell.uid});
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.onceEffectUses[0].includes('name:ベル'),false);
 const pay=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscardGate'&&a.uid);
 s=use(s,pay);
 assert.equal(live(s,bell).ready,true);
 assert.equal(s.onceEffectUses[0].includes('name:ベル'),true);
 assert.equal(s.pending.kind,'block');
 s=clearBattle(s);
 const displaced=s.players[0].front[1];
 s.players[0].front[1]=null;
 s.players[0].energy[1]=displaced;
 const second=put(s,0,'SLG-1-033','front',1);
 s=use(s,{type:'attack',uid:second.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(s.onceEffectUses[0].filter(k=>k==='name:ベル').length,1);

 let short=toPhase(counts,2033,'attack');
 const lone=put(short,0,'SLG-1-033','front',0);
 put(short,0,'SLG-1-030','front',1,{ready:false});
 put(short,0,'SLG-1-030','front',2,{ready:false});
 put(short,0,'SLG-1-030','front',3,{ready:false});
 short=use(short,{type:'attack',uid:lone.uid});
 assert.equal(short.pending.kind,'block');
 assert.deepEqual(short.onceEffectUses[0],[]);

 let alien=toPhase(counts,3033,'attack');
 const mixed=put(alien,0,'SLG-1-033','front',0);
 put(alien,0,'SLG-1-030','front',1,{ready:false});
 put(alien,0,'SLG-1-030','front',2,{ready:false});
 put(alien,0,'SLG-1-030','front',3,{ready:false});
 put(alien,0,'SLG-1-032','energy',0,{ready:false});
 alien=use(alien,{type:'attack',uid:mixed.uid});
 assert.equal(alien.pending.kind,'block');
 assert.equal(alien.onceEffectUses[0].length,0);
});

test('029 and 031 aid a low printed-BP shadow attacker and share each mode by name',()=>{
 const counts=countsFor(['SLG-1-029','SLG-1-031','SLG-1-030','SLG-1-032','SLG-1-023']);
 let skipped=toPhase(counts,1029,'attack');
 const quiet=put(skipped,0,'SLG-1-029','energy',0);
 const wrong=put(skipped,0,'SLG-1-032','front',0);
 skipped=use(skipped,{type:'attack',uid:wrong.uid});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(live(skipped,quiet).ready,true);
 skipped=clearBattle(skipped);
 const soldier=put(skipped,0,'SLG-1-030','front',1);
 skipped=use(skipped,{type:'attack',uid:soldier.uid});
 assert.equal(skipped.pending.kind,'effect-attack-aid');
 skipped=use(skipped,{type:'chooseAttackAid',mode:'skip'});
 assert.equal(live(skipped,quiet).ready,true);
 assert.deepEqual(skipped.onceEffectUses[0],[]);
 assert.equal(skipped.pending.kind,'block');

 let s=toPhase(counts,2029,'attack');
 const kaisers=[0,1,2].map(slot=>put(s,0,'SLG-1-029','energy',slot));
 const attackers=[0,1,2].map(slot=>put(s,0,'SLG-1-030','front',slot));
 const wall=put(s,1,'SLG-1-023','front',0);
 const small=put(s,1,'SLG-1-032','front',1);
 s=use(s,{type:'attack',uid:attackers[0].uid});
 assert.deepEqual(s.pending.options.map(o=>o.id).sort(),['ceiling','immune']);
 s=use(s,{type:'chooseAttackAid',mode:'ceiling'});
 assert.equal(live(s,kaisers[0]).ready,false);
 s=use(s,{type:'chooseAttackAidGrant',uid:attackers[0].uid});
 while(s.pending?.kind==='effect-attack-aid')s=use(s,{type:'chooseAttackAid',mode:'skip'});
 assert.equal(s.pending.kind,'block');
 const blocked=blockUids(s);
 assert.equal(blocked.includes(wall.uid),false);
 assert.equal(blocked.includes(small.uid),true);
 s=clearBattle(s);

 s=use(s,{type:'attack',uid:attackers[1].uid});
 assert.deepEqual(s.pending.options.map(o=>o.id),['immune']);
 s=use(s,{type:'chooseAttackAid',mode:'immune'});
 s=use(s,{type:'chooseAttackAidGrant',uid:attackers[1].uid});
 assert.equal(effectChoiceProtected(s,1,attackers[1].uid,'character'),true);
 assert.equal(effectChoiceProtected(s,0,attackers[1].uid,'character'),false);
 s=clearBattle(s);
 s=use(s,{type:'attack',uid:attackers[2].uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(live(s,kaisers[2]).ready,true);

 let kiba=toPhase(counts,3029,'attack');
 const fangs=[0,1].map(slot=>put(kiba,0,'SLG-1-031','energy',slot));
 const prey=[0,1].map(slot=>put(kiba,0,'SLG-1-030','front',slot));
 kiba=use(kiba,{type:'attack',uid:prey[0].uid});
 kiba=use(kiba,{type:'chooseAttackAid',mode:'bp'});
 kiba=use(kiba,{type:'chooseAttackAidGrant',uid:prey[0].uid});
 assert.equal(universalBp(packs,kiba,live(kiba,prey[0])),3000);
 assert.equal(live(kiba,fangs[0]).ready,false);
 kiba=clearBattle(kiba);
 const handBefore=kiba.players[0].hand.length;
 kiba=use(kiba,{type:'attack',uid:prey[1].uid});
 assert.deepEqual(kiba.pending.options.map(o=>o.id),['draw']);
 kiba=use(kiba,{type:'chooseAttackAid',mode:'draw'});
 assert.equal(kiba.pending.kind,'effect-discard');
 assert.equal(kiba.players[0].hand.length,handBefore+1);
 assert.equal(legalUniversalActions(packs,kiba).some(a=>a.uid===null),false);
 kiba=use(kiba,{type:'chooseDiscard',uid:kiba.players[0].hand[0].uid});
 while(kiba.pending?.kind==='effect-attack-aid')kiba=use(kiba,{type:'chooseAttackAid',mode:'skip'});
 assert.equal(kiba.pending.kind,'block');
});

test('011 mills on play, blocks from ten outside cards, and enters REST from an unmatched recovery',()=>{
 const counts=countsFor(['SLG-1-011','SLG-1-006','SLG-1-037','SLG-1-023','SLG-1-032','SLG-1-001']);
 let played=toPhase(counts,1011,'main');
 put(played,0,'SLG-1-006','energy',0);
 put(played,0,'SLG-1-006','energy',1);
 const shizuku=toHand(played,0,'SLG-1-011');
 played=play(played,shizuku.uid,'front',0);
 assert.equal(played.pending.kind,'effect-optional-mill');
 played=use(played,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(played.players[0].front[0].uid,shizuku.uid);

 let ceiling=toPhase(counts,2011,'attack');
 const attacker=put(ceiling,0,'SLG-1-011','front',0);
 while(ceiling.players[0].outside.length<9)ceiling.players[0].outside.push(ceiling.players[0].deck.shift());
 const high=put(ceiling,1,'SLG-1-023','front',0);
 const low=put(ceiling,1,'SLG-1-032','front',1);
 ceiling=use(ceiling,{type:'attack',uid:attacker.uid});
 assert.equal(blockUids(ceiling).includes(high.uid),true);
 ceiling.players[0].outside.push(ceiling.players[0].deck.shift());
 assert.equal(ceiling.players[0].outside.length,10);
 ceiling=clearBattle(ceiling);
 ceiling.players[0].front[0].ready=true;
 ceiling=use(ceiling,{type:'attack',uid:attacker.uid});
 const uids=blockUids(ceiling);
 assert.equal(uids.includes(high.uid),false);
 assert.equal(uids.includes(low.uid),true);

 let recovered=toPhase(counts,3011,'main');
 put(recovered,0,'SLG-1-006','energy',0);
 put(recovered,0,'SLG-1-006','energy',1);
 const outside=toHand(recovered,0,'SLG-1-011');
 recovered.players[0].outside.push(recovered.players[0].hand.pop());
 const event=toHand(recovered,0,'SLG-1-037');
 recovered=play(recovered,event.uid);
 assert.equal(recovered.pending.kind,'effect-recover-outside');
 assert.equal(recovered.pending.choices.includes(outside.uid),true);
 for(const c of recovered.players[0].energy)if(c)c.ready=false;
 recovered=use(recovered,{type:'chooseOutsideRecovery',uid:outside.uid});
 assert.equal(recovered.pending?.kind==='recovered-self-entry',false);
 assert.ok(recovered.players[0].hand.some(c=>c.uid===outside.uid));

 let entered=toPhase(counts,4011,'main');
 put(entered,0,'SLG-1-006','energy',0);
 put(entered,0,'SLG-1-006','energy',1);
 const waiting=take(entered,0,'SLG-1-011');
 entered.players[0].outside.push(waiting);
 const potion=toHand(entered,0,'SLG-1-037');
 entered=play(entered,potion.uid);
 entered=use(entered,{type:'chooseOutsideRecovery',uid:waiting.uid});
 assert.equal(entered.pending.kind,'recovered-self-entry');
 assert.equal(entered.pending.mode,'meetEnergy');
 assert.equal(entered.pending.ready,false);
 entered=use(entered,{type:'chooseRecoveredEntry',mode:'enter',line:'front',slot:0});
 assert.equal(entered.players[0].front[0].uid,waiting.uid);
 assert.equal(entered.players[0].front[0].ready,false);
 if(entered.pending?.kind==='effect-optional-mill')
  entered=use(entered,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(assertUniversalMatch(packs,entered),true);
});

test('a recovering source named 水篠 旬 enters the recovered card ACTIVE',()=>{
 const cards=[{
  id:'SRC',name:'水篠 旬',color:'purple',type:'character',energy:0,ap:1,bp:1000,
  gen:1,traits:[],trigger:null,implementation:'dsl',
  effects:{onPlay:[{op:'recoverOutsidePrintedBp',bp:4000,optional:true}]}
 },{
  id:'DROP',name:'向坂 雫',color:'purple',type:'character',energy:1,ap:1,bp:4000,
  gen:0,traits:[],trigger:null,implementation:'dsl',
  ownOutsideRecovery:{op:'playSelfMeetEnergy',optional:true,activeSourceName:'水篠 旬'},
  effects:{onPlay:[{op:'millTop',count:1,optional:true}]}
 },...Array.from({length:11},(_,i)=>({
  id:'F'+i,name:'補'+i,color:'purple',type:'character',energy:0,ap:1,bp:1000,
  gen:i===0?1:0,traits:[],trigger:null,implementation:'vanilla',effects:{}
 }))];
 const pack=createUniversalPack({id:'slg-meet-energy',cards});
 const both=[pack,pack];
 const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(both,{decks:[counts,counts],seed:5011});
 s=dispatchUniversalAction(both,s,{type:'next'});
 s=dispatchUniversalAction(both,s,{type:'next'});
 assert.equal(s.phase,'main');
 const fuel=s.players[0].deck.find(c=>c.cardId==='F0');
 s.players[0].deck.splice(s.players[0].deck.indexOf(fuel),1);
 fuel.ready=true;fuel.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=fuel;
 const drop=s.players[0].deck.find(c=>c.cardId==='DROP');
 s.players[0].deck.splice(s.players[0].deck.indexOf(drop),1);
 s.players[0].outside.push(drop);
 const src=s.players[0].deck.find(c=>c.cardId==='SRC');
 s.players[0].deck.splice(s.players[0].deck.indexOf(src),1);
 s.players[0].hand.push(src);
 const action=legalUniversalActions(both,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction(both,s,action);
 s=dispatchUniversalAction(both,s,{type:'chooseOutsideRecovery',uid:drop.uid});
 assert.equal(s.pending.mode,'meetEnergy');
 assert.equal(s.pending.ready,true);
 s=dispatchUniversalAction(both,s,{type:'chooseRecoveredEntry',mode:'enter',line:'energy',slot:1});
 assert.equal(s.players[0].energy[1].ready,true);
 assert.equal(assertUniversalMatch(both,s),true);
});

test('044 discards on play and tucks a facedown card under 水篠 旬 for damage 2',()=>{
 const counts=countsFor(['SLG-1-044','SLG-1-045','SLG-1-056','SLG-1-063']);
 let bare=toPhase(counts,1044,'main');
 put(bare,0,'SLG-1-056','energy',0);
 put(bare,0,'SLG-1-063','energy',1);
 const aoi=toHand(bare,0,'SLG-1-044');
 bare=play(bare,aoi.uid,'front',0);
 assert.equal(bare.pending.kind,'effect-discard');
 bare=use(bare,{type:'chooseDiscard',uid:bare.players[0].hand[0].uid});
 live(bare,aoi).ready=true;
 assert.equal(legalUniversalActions(packs,bare).some(a=>a.type==='activate'&&a.uid===aoi.uid),false);

 let s=toPhase(counts,2044,'main');
 put(s,0,'SLG-1-056','energy',0);
 put(s,0,'SLG-1-063','energy',1);
 const caster=toHand(s,0,'SLG-1-044');
 const host=put(s,0,'SLG-1-045','front',1);
 s=play(s,caster.uid,'front',0);
 s=use(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 live(s,caster).ready=true;
 const top=s.players[0].deck[0];
 s=use(s,{type:'activate',uid:caster.uid,mode:'restTuckDamage'});
 assert.equal(live(s,caster).ready,false);
 assert.equal(s.pending.kind,'effect-tuck-damage');
 s=use(s,{type:'chooseTuckDamage',uid:host.uid});
 assert.equal(live(s,host).under.at(-1).uid,top.uid);
 assert.equal(live(s,host).under.at(-1).faceDown,true);
 assert.equal(universalAttackDamage(packs,s,live(s,host)),2);

 let empty=toPhase(counts,3044,'main');
 put(empty,0,'SLG-1-056','energy',0);
 put(empty,0,'SLG-1-063','energy',1);
 const again=toHand(empty,0,'SLG-1-044');
 const named=put(empty,0,'SLG-1-045','front',1);
 empty=play(empty,again.uid,'front',0);
 empty=use(empty,{type:'chooseDiscard',uid:empty.players[0].hand[0].uid});
 live(empty,again).ready=true;
 empty.players[0].removed.push(...empty.players[0].deck.splice(0));
 empty=use(empty,{type:'activate',uid:again.uid,mode:'restTuckDamage'});
 empty=use(empty,{type:'chooseTuckDamage',uid:named.uid});
 assert.equal((live(empty,named).under||[]).length,0);
 assert.equal(universalAttackDamage(packs,empty,live(empty,named)),2);
});

test('059 readies from a paid discard and skips the next ACTIVE only after a hand add',()=>{
 const counts=countsFor(['SLG-1-059','SLG-1-053','SLG-1-065','SLG-1-056','SLG-1-057','SLG-1-060']);
 let declined=toPhase(counts,1059,'main');
 secondAp(declined);
 put(declined,0,'SLG-1-053','energy',0);
 put(declined,0,'SLG-1-065','energy',1);
 put(declined,0,'SLG-1-056','energy',2);
 const tiger=toHand(declined,0,'SLG-1-059');
 declined=play(declined,tiger.uid,'front',0);
 assert.equal(declined.pending.kind,'effect-discard-gate');
 declined=use(declined,{type:'chooseDiscardGate',uid:null});
 assert.equal(live(declined,tiger).ready,false);
 assert.equal(universalBp(packs,declined,live(declined,tiger)),4000);

 let s=toPhase(counts,2059,'main');
 secondAp(s);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-065','energy',1);
 put(s,0,'SLG-1-056','energy',2);
 const source=toHand(s,0,'SLG-1-059');
 s=play(s,source.uid,'front',0);
 const paid=legalUniversalActions(packs,s).find(a=>a.uid);
 s=use(s,paid);
 assert.equal(live(s,source).ready,true);
 assert.equal(universalBp(packs,s,live(s,source)),5000);
 s=use(s,{type:'next'});
 lift(s,0,'SLG-1-057');
 lift(s,0,'SLG-1-060');
 s=use(s,{type:'attack',uid:source.uid});
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 const first=s.pending.choices[0],second=s.pending.choices.find(uid=>uid!==first);
 s=use(s,{type:'chooseTopFilteredMany',uid:first});
 s=use(s,{type:'chooseTopFilteredMany',uid:second});
 assert.equal(s.pending.kind,'effect-top-order');
 while(s.pending?.kind==='effect-top-order')
  s=use(s,{type:'chooseTopOrder',uid:s.pending.uids.find(uid=>!s.pending.order.includes(uid))});
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===source.uid));
 s=clearBattle(s);
 s=use(s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(s.phase,'start');
 assert.equal(live(s,source).ready,false);

 let none=toPhase(counts,3059,'main');
 secondAp(none);
 put(none,0,'SLG-1-053','energy',0);
 put(none,0,'SLG-1-065','energy',1);
 put(none,0,'SLG-1-056','energy',2);
 const quiet=toHand(none,0,'SLG-1-059');
 none=play(none,quiet.uid,'front',0);
 none=use(none,{type:'chooseDiscardGate',uid:null});
 none=use(none,{type:'next'});
 live(none,quiet).ready=true;
 lift(none,0,'SLG-1-057');
 none=use(none,{type:'attack',uid:quiet.uid});
 assert.equal(none.pending.kind,'effect-top-filter-many-choice');
 none=use(none,{type:'chooseTopFilteredMany',uid:null});
 while(none.pending?.kind==='effect-top-order')
  none=use(none,{type:'chooseTopOrder',uid:none.pending.uids.find(uid=>!none.pending.order.includes(uid))});
 assert.equal(none.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===quiet.uid),false);
 none=clearBattle(none);
 none=use(none,{type:'next'});
 assert.equal(none.active,1);
 assert.equal(none.phase,'start');
 assert.equal(live(none,quiet).ready,true);
});

test('061 keeps 白川 大虎 buffed through the opponent turn and actives a raid trait at attack end',()=>{
 const counts=countsFor(['SLG-1-061','SLG-1-057','SLG-1-059','SLG-1-056','SLG-1-065','SLG-1-063']);
 let ordinary=toPhase(counts,1061,'main');
 put(ordinary,0,'SLG-1-065','energy',0);
 put(ordinary,0,'SLG-1-056','energy',1);
 put(ordinary,0,'SLG-1-063','energy',2);
 const ally=put(ordinary,0,'SLG-1-057','front',1);
 const mino=toHand(ordinary,0,'SLG-1-061');
 ordinary=play(ordinary,mino.uid,'front',0);
 assert.equal(ordinary.pending.kind,'effect-buff-own');
 assert.equal(ordinary.pending.choices.includes(ally.uid),true);
 assert.equal(ordinary.pending.choices.includes(mino.uid),false);
 ordinary=use(ordinary,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,ordinary,live(ordinary,ally)),5000);
 ordinary=passTo(ordinary,1,'start');
 assert.equal(universalBp(packs,ordinary,live(ordinary,ally)),4000);

 let lasting=toPhase(counts,2061,'main');
 put(lasting,0,'SLG-1-065','energy',0);
 put(lasting,0,'SLG-1-056','energy',1);
 put(lasting,0,'SLG-1-063','energy',2);
 const tiger=put(lasting,0,'SLG-1-059','front',1);
 const source=toHand(lasting,0,'SLG-1-061');
 lasting=play(lasting,source.uid,'front',0);
 lasting=use(lasting,{type:'chooseOwnBuff',uid:tiger.uid});
 assert.equal(universalBp(packs,lasting,live(lasting,tiger)),5000);
 lasting=passTo(lasting,1,'start');
 assert.equal(universalBp(packs,lasting,live(lasting,tiger)),5000);
 lasting=passTo(lasting,0,'start');
 assert.equal(universalBp(packs,lasting,live(lasting,tiger)),4000);

 let ending=toPhase(counts,3061,'attack');
 const self=put(ending,0,'SLG-1-061','front',0,{ready:false});
 const other=put(ending,0,'SLG-1-057','front',1,{ready:false});
 ending=use(ending,{type:'next'});
 assert.equal(ending.pending.kind,'effect-discard-gate');
 assert.equal(live(ending,self).ready,false);
 assert.equal(live(ending,other).ready,false);
 ending=use(ending,{type:'chooseDiscardGate',uid:null});
 assert.notEqual(ending.pending?.kind,'effect-active-own-trait');
 assert.equal(ending.active,1);
 assert.equal(ending.phase,'start');
 assert.equal(live(ending,self).ready,true);
 assert.equal(live(ending,other).ready,true);

 let paid=toPhase(counts,4061,'attack');
 const actor=put(paid,0,'SLG-1-061','front',0,{ready:false});
 put(paid,0,'SLG-1-057','front',1,{ready:false});
 paid=use(paid,{type:'next'});
 const hand=legalUniversalActions(packs,paid).find(a=>a.uid);
 paid=use(paid,hand);
 assert.equal(paid.pending.kind,'effect-active-own-trait');
 assert.equal(paid.pending.choices.includes(actor.uid),true);
 assert.equal(live(paid,actor).ready,false);
 paid=use(paid,{type:'chooseActiveOwnTrait',uid:actor.uid});
 assert.equal(live(paid,actor).ready,true);
 assert.equal(paid.active,1);
});

test('020 draws, recovers a non-旬 printed BP 3000 card, and scales attack BP from outside',()=>{
 const counts=countsFor(['SLG-1-020','SLG-1-030','SLG-1-015','SLG-1-032','SLG-1-006','SLG-1-001','SLG-1-002']);
 let declined=toPhase(counts,1020,'main');
 put(declined,0,'SLG-1-006','energy',0);
 put(declined,0,'SLG-1-001','energy',1);
 put(declined,0,'SLG-1-002','energy',2);
 const outside=take(declined,0,'SLG-1-030');
 declined.players[0].outside.push(outside);
 const hero=toHand(declined,0,'SLG-1-020');
 declined=play(declined,hero.uid,'front',0);
 assert.equal(declined.pending.kind,'effect-discard-gate');
 declined=use(declined,{type:'chooseDiscardGate',uid:null});
 assert.notEqual(declined.pending?.kind,'effect-recover-outside');
 assert.ok(declined.players[0].outside.some(c=>c.uid===outside.uid));

 let s=toPhase(counts,2020,'main');
 put(s,0,'SLG-1-006','energy',0);
 put(s,0,'SLG-1-001','energy',1);
 put(s,0,'SLG-1-002','energy',2);
 const soldier=take(s,0,'SLG-1-030');
 const shun=take(s,0,'SLG-1-015');
 s.players[0].outside.push(soldier,shun);
 const tank=toHand(s,0,'SLG-1-032');
 const played=toHand(s,0,'SLG-1-020');
 const handBefore=s.players[0].hand.length;
 s=play(s,played.uid,'front',0);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.pending.kind,'effect-discard-gate');
 s=use(s,{type:'chooseDiscardGate',uid:tank.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 const ids=s.pending.choices.map(uid=>[...s.players[0].outside].find(c=>c.uid===uid).cardId);
 assert.equal(ids.includes('SLG-1-030'),true);
 assert.equal(ids.includes('SLG-1-032'),true);
 assert.equal(ids.includes('SLG-1-015'),false);
 s=use(s,{type:'chooseOutsideRecovery',uid:soldier.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===soldier.uid));

 let battle=toPhase(counts,3020,'attack');
 const attacker=put(battle,0,'SLG-1-020','front',0);
 while(battle.players[0].outside.length<4)battle.players[0].outside.push(battle.players[0].deck.shift());
 battle=use(battle,{type:'attack',uid:attacker.uid});
 assert.equal(battle.pending.kind,'effect-discard');
 battle=use(battle,{type:'chooseDiscard',uid:battle.players[0].hand[0].uid});
 assert.equal(battle.players[0].outside.length,5);
 assert.equal(universalBp(packs,battle,live(battle,attacker)),4500);

 let raid=toPhase(counts,4020,'main');
 secondAp(raid);
 put(raid,0,'SLG-1-006','energy',0);
 put(raid,0,'SLG-1-001','energy',1);
 put(raid,0,'SLG-1-002','energy',2);
 const base=put(raid,0,'SLG-1-015','front',1);
 const top=toHand(raid,0,'SLG-1-020');
 const action=legalUniversalActions(packs,raid).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(action);
 raid=use(raid,action);
 assert.equal(raid.players[0].front[1].cardId,'SLG-1-020');
 assert.equal(raid.players[0].front[1].stack[0].uid,base.uid);
 if(raid.pending?.kind==='effect-discard-gate')
  raid=use(raid,{type:'chooseDiscardGate',uid:null});
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('new shared profiles reject a short aid, a nameless recovery, and a short REST count',()=>{
 const shell={id:'X',name:'試',color:'purple',type:'character',energy:1,ap:1,
  bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const pack=cards=>createUniversalPack({id:'slg-third-negative',cards});
 assert.throws(()=>pack([{...shell,attackAid:{trait:'影の軍団',maxPrintedBp:2000,options:[]}}]),
  /invalid attack aid/);
 assert.throws(()=>pack([{...shell,ownOutsideRecovery:{op:'playSelfMeetEnergy',optional:true}}]),
  /unsupported own-outside/);
 assert.throws(()=>pack([{...shell,effects:{onAttack:[{op:'discardGate',optional:true,
  when:{kind:'ownRestPrintedBpCount',turn:'any',min:4,zone:'field',excludeSelf:false,trait:'影の軍団'},
  then:[{op:'activeSelf'}]}]}}]),/invalid or cyclic/);
});
