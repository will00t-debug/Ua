import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {steinsGatePracticeDeck,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalImpact,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {V2_PENDING_LABELS,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {REZ_BASE_IDS,rez,rezDeck} from './helpers/rez-v2-match.mjs';
import {deckWith,fresh,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const STILL=[];
const KINDS={
 'STG-1-066':'farisReplay','STG-1-070':'kurisuProtect','STG-1-060':'mayuriShift',
 'STG-1-003':'suzuhaActive','STG-1-010':'okabeChoose','STG-1-018':'mayuriDelay',
 'STG-1-028':'kurisuDual','STG-1-077':'dmailField','STG-1-039':'mayuriSlap',
 'STG-1-050':'rukaGrant'
};
const MAYURI_NAMES=['岡部 倫太郎','椎名 まゆり','橋田 至','まゆしぃのカイちゅ～止まっちゃってる……'];

function who(s){return s.pending?.player??s.active;}
function go(packs,s,action){
 return dispatchUniversalAction(packs,s,action,{actor:who(s)});
}
function act(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('Missing action '+(s.pending?.kind||s.phase)+' active '+s.active);
 return go(packs,s,action);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function outside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function lifeTop(s,p,id){
 const card=take(s,p,id);
 const life=s.players[p].life,displaced=life[0];
 life[0]=card;
 if(displaced&&displaced.uid!==card.uid)s.players[p].deck.push(displaced);
 return card;
}
function board(ids,seed){
 const s=toPhase(stgPacks,fresh(deckWith(ids),seed),'main');
 readyAp(s);
 return s;
}
function passUntil(s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending?.kind==='end-hand-limit'){
   s=go(stgPacks,s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
   continue;
  }
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+s.phase+' active '+s.active);
  s=go(stgPacks,s,{type:'next'});
  if(++guard>30)throw Error('stuck '+s.phase+' active '+s.active);
 }
 return s;
}
function apReady(s,p=0){
 return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;
}
function onBoard(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].some(c=>c?.uid===uid);
}
function order(s,uids){
 for(const uid of uids)s=go(stgPacks,s,{type:'chooseTopOrder',uid});
 return s;
}
function fillers(){
 return Array.from({length:12},(_,i)=>({
  id:'F'+i,name:'填料'+i,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}
 }));
}
function printed(id){
 const c=stg.cards[id];
 return {
  id:c.id,name:c.name,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:c.gen,trigger:c.trigger,traits:[...(c.traits||[])],
  implementation:c.implementation,effects:JSON.parse(JSON.stringify(c.effects)),
  ...(c.impactNull?{impactNull:true}:{}),
  ...(c.mainAbility?{mainAbility:JSON.parse(JSON.stringify(c.mainAbility))}:{}),
  ...(c.raidName?{raidName:c.raidName}:{})
 };
}
function labMatch(cards,seed){
 const pack=createUniversalPack({id:'stg-lab',version:'lab',cards:[...cards,...fillers()]});
 const counts={};
 let n=0;
 for(const card of cards){counts[card.id]=1;n++;}
 for(const card of fillers())while(n<50&&(counts[card.id]||0)<4){
  counts[card.id]=(counts[card.id]||0)+1;n++;
 }
 const packs=[pack,pack];
 return {packs,s:newUniversalMatch(packs,{decks:[counts,counts],seed,first:0})};
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','outside']){
  const index=pl[zone].findIndex(c=>c.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

test('batches 41-50 register ten prints and leave six catalogue cards',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.length,80);
 assert.equal(Object.keys(stg.cards).length,80);
 assert.equal(stg.version,'stg-ua57-full-20261028');
 assert.deepEqual(STEINS_GATE_CARDS.filter(c=>!c.engineKind).map(c=>c.id).sort(),[...STILL].sort());
 for(const [id,kind] of Object.entries(KINDS)){
  assert.equal(STEINS_GATE_BY_ID[id].engineKind,kind);
  assert.equal(stg.cards[id].name,STEINS_GATE_BY_ID[id].nameJa);
 }
 assert.equal(stg.cards['STG-1-011'].overflowToOutside,true);
 assert.equal(stg.cards['STG-1-066'].raidName,'フェイリス・ニャンニャン');
 assert.equal(stg.cards['STG-1-070'].raidName,'牧瀬 紅莉栖');
 assert.equal(stg.cards['STG-1-060'].raidName,'椎名 まゆり');
 assert.equal(stg.cards['STG-1-028'].raidName,'牧瀬 紅莉栖');
 assert.equal(stg.cards['STG-1-003'].enterAlwaysActive,true);
 assert.equal(stg.cards['STG-1-010'].impactNull,true);
 assert.equal(stg.cards['STG-1-018'].impactNull,true);
 assert.equal(stg.cards['STG-1-018'].mainAbility.onceKey,'椎名 まゆり|STG-1-018');
 assert.equal(stg.cards['STG-1-028'].mainAbility.discountOnceKey,'牧瀬 紅莉栖|STG-1-028-discount');
 assert.equal(stg.cards['STG-1-028'].mainAbility.filter.triggerNot,'final');
 assert.equal(stg.cards['STG-1-077'].colorTriggerMayField,true);
 assert.equal(stg.cards['STG-1-039'].handUseOncePerName,true);
 assert.deepEqual(stg.cards['STG-1-018'].effects.onAttack[0].filters.map(f=>f.value),MAYURI_NAMES);
 assert.equal(stg.cards['STG-1-066'].effects.onAttack[0].op,'replayOnPlayIf');
 assert.equal(stg.cards['STG-1-060'].effects.onRetire[0].op,'buffEnergyMoveFront');
 assert.equal(V2_PENDING_LABELS['effect-may-draw'].includes('抽'),true);
 assert.equal(V2_PENDING_LABELS['effect-ordered-subset'].includes('2'),true);
 assert.match(uiActionLabel({type:'chooseMayDraw',mode:'skip'}),/不抽/);
 assert.match(uiActionLabel({type:'chooseTrigger',mode:'colorMayField',uid:'0-1',line:'energy',slot:0}),/能源/);
 assert.match(uiActionLabel({type:'activate',mode:'nameActive',uid:'0-1'}),/椎名/);
 const practice=steinsGatePracticeDeck();
 assert.equal(v2DeckReport('steins-gate',practice.counts).ok,true);
 const editor=editorV2Status('steins-gate',practice.counts);
 assert.equal(editor.registered,80);
 assert.equal(v2DeckReport('steins-gate',practice.counts).ok,true);
});

test('STG-1-066 replays onPlay only after an event when a field card is present',()=>{
 let entered=board(['STG-1-066','STG-1-045','STG-1-054','STG-1-057'],41066);
 place(entered,0,'STG-1-045','energy',0);
 place(entered,0,'STG-1-054','energy',1);
 place(entered,0,'STG-1-057','energy',2);
 const faris=take(entered,0,'STG-1-066');
 hold(entered,0,[faris]);
 const deck=entered.players[0].deck.length;
 entered=act(stgPacks,entered,a=>a.type==='play'&&a.uid===faris.uid&&a.line==='front');
 assert.equal(entered.pending.kind,'effect-may-draw');
 const skipped=go(stgPacks,entered,{type:'chooseMayDraw',mode:'skip'});
 assert.equal(skipped.players[0].deck.length,deck);
 assert.equal(skipped.pending.kind,'effect-buff-own');
 assert.ok(legalUniversalActions(stgPacks,skipped).some(a=>a.uid===null));
 assert.ok(legalUniversalActions(stgPacks,skipped).some(a=>a.uid===faris.uid));
 entered=go(stgPacks,skipped,{type:'chooseOwnBuff',uid:null});
 assert.equal(entered.players[0].front.find(c=>c?.uid===faris.uid).ready,false);
 assert.equal(entered.pending,null);

 function attack(seed,withField,withEvent){
  let s=board(['STG-1-066','STG-1-073','STG-1-032','STG-1-057'],seed);
  const actor=place(s,0,'STG-1-066','front',0);
  place(s,0,'STG-1-057','front',1);
  if(withField)place(s,0,'STG-1-073','energy',0);
  if(withEvent){
   const event=take(s,0,'STG-1-032');
   hold(s,0,[event]);
   s=act(stgPacks,s,a=>a.type==='event'&&a.uid===event.uid);
   assert.equal(s.pending,null);
  }
  s=toPhase(stgPacks,s,'attack');
  s=act(stgPacks,s,a=>a.type==='attack'&&a.uid===actor.uid);
  return {s,actor};
 }
 const quiet=attack(41067,false,true);
 assert.equal(quiet.s.pending.kind,'block');
 const characters=attack(41068,false,false);
 assert.equal(characters.s.pending.kind,'block');
 const replay=attack(41069,true,true);
 assert.equal(replay.s.pending.kind,'effect-may-draw');
 let resolved=go(stgPacks,replay.s,{type:'chooseMayDraw',mode:'skip'});
 assert.equal(resolved.pending.kind,'effect-buff-own');
 const before=universalBp(stg,resolved,resolved.players[0].front[0]);
 resolved=go(stgPacks,resolved,{type:'chooseOwnBuff',uid:replay.actor.uid});
 assert.equal(universalBp(stg,resolved,resolved.players[0].front[0]),before+1000);
 assert.equal(resolved.pending.kind,'block');
 assert.equal(assertUniversalMatch(stgPacks,resolved),true);

 let raid=board(['STG-1-066','STG-1-064','STG-1-045','STG-1-054','STG-1-057'],41070);
 const base=place(raid,0,'STG-1-064','energy',0);
 place(raid,0,'STG-1-045','energy',1);
 place(raid,0,'STG-1-054','energy',2);
 place(raid,0,'STG-1-057','energy',3);
 const topCard=take(raid,0,'STG-1-066');
 hold(raid,0,[topCard]);
 const raids=legalUniversalActions(stgPacks,raid).filter(a=>a.type==='raid'&&a.uid===topCard.uid&&
  a.baseUid===base.uid);
 assert.ok(raids.length>=1);
 raid=act(stgPacks,raid,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid);
 assert.equal(raid.pending.kind,'effect-may-draw');
 raid=go(stgPacks,raid,{type:'chooseMayDraw',mode:'skip'});
 raid=go(stgPacks,raid,{type:'chooseOwnBuff',uid:null});
 assert.equal(raid.players[0].front.some(c=>c?.uid===topCard.uid&&c.ready&&c.stack?.[0]?.uid===base.uid),true);
 assert.equal(raid.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,raid),true);
});

test('STG-1-070 protects another character and offers the draw only with an open front',()=>{
 let s=board(['STG-1-070','STG-1-045','STG-1-054','STG-1-057','STG-1-039','STG-1-009','STG-1-001'],41071);
 place(s,0,'STG-1-045','energy',0);
 place(s,0,'STG-1-054','energy',1);
 const ally=place(s,0,'STG-1-057','front',0);
 const kurisu=take(s,0,'STG-1-070');
 hold(s,0,[kurisu]);
 s=act(stgPacks,s,a=>a.type==='play'&&a.uid===kurisu.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-entry-protect');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===null));
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===kurisu.uid),false);
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===ally.uid));
 s=go(stgPacks,s,{type:'chooseEntryProtect',uid:ally.uid});
 const grant=s.continuousStates.find(e=>e.kind==='cannotBeChosenByOppEffect');
 assert.equal(grant.selectionScope,'any');
 assert.equal(grant.targetUid,ally.uid);
 assert.equal(grant.until.phase,'start');
 place(s,1,'STG-1-009','energy',0);
 place(s,1,'STG-1-001','energy',1);
 const slap=take(s,1,'STG-1-039');
 s.players[1].hand.push(slap);
 s=passUntil(s,x=>x.phase==='main'&&x.active===1);
 readyAp(s,1);
 s=act(stgPacks,s,a=>a.type==='event'&&a.uid===slap.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(s.pending.kind,'effect-rest-bp');
 const rests=legalUniversalActions(stgPacks,s);
 assert.ok(rests.some(a=>a.uid===kurisu.uid));
 assert.equal(rests.some(a=>a.uid===ally.uid),false);
 assert.throws(()=>go(stgPacks,s,{type:'chooseRestBp',uid:ally.uid}),/not currently legal/);
 s=go(stgPacks,s,{type:'chooseRestBp',uid:kurisu.uid});
 assert.equal(s.players[0].front.find(c=>c?.uid===kurisu.uid).ready,false);
 assert.equal(s.players[0].front.find(c=>c?.uid===ally.uid).ready,true);
 assert.equal(s.pending,null);

 function strike(seed,fill){
  let state=board(['STG-1-070','STG-1-001','STG-1-012'],seed);
  const actor=place(state,0,'STG-1-070','front',0);
  if(fill)for(let slot=1;slot<4;slot++)place(state,0,'STG-1-001','front',slot);
  state=toPhase(stgPacks,state,'attack');
  state=act(stgPacks,state,a=>a.type==='attack'&&a.uid===actor.uid);
  return {state,actor};
 }
 const open=strike(41072,false);
 assert.equal(open.state.pending.kind,'effect-choice-mode');
 assert.deepEqual(legalUniversalActions(stgPacks,open.state).map(a=>a.mode).sort(),['draw','impact']);
 const deck=open.state.players[0].deck.length;
 const hand=open.state.players[0].hand.length;
 let drew=go(stgPacks,open.state,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(drew.pending.kind,'effect-discard');
 assert.equal(drew.players[0].deck.length,deck-2);
 drew=go(stgPacks,drew,{type:'chooseDiscard',uid:drew.players[0].hand[0].uid});
 assert.equal(drew.players[0].hand.length,hand+1);
 assert.equal(drew.pending.kind,'block');
 const closed=strike(41073,true);
 assert.deepEqual(legalUniversalActions(stgPacks,closed.state).map(a=>a.mode),['impact']);
 const impacted=go(stgPacks,closed.state,{type:'chooseEffectMode',mode:'impact'});
 assert.equal(universalImpact(stg,impacted,impacted.players[0].front.find(c=>c?.uid===closed.actor.uid)),1);
 assert.equal(impacted.pending.kind,'block');
 assert.equal(assertUniversalMatch(stgPacks,impacted),true);
});

test('STG-1-060 moves into an empty front on attack and can replace when retiring into a full front',()=>{
 function swing(seed,frontIds){
  let s=board(['STG-1-060','STG-1-057','STG-1-012','STG-1-014','STG-1-020'],seed);
  const actor=place(s,0,'STG-1-060','front',0);
  frontIds.forEach((id,i)=>place(s,0,id,'front',i+1));
  const mover=place(s,0,'STG-1-057','energy',0);
  s=toPhase(stgPacks,s,'attack');
  s=act(stgPacks,s,a=>a.type==='attack'&&a.uid===actor.uid);
  return {s,actor,mover};
 }
 const full=swing(41060,['STG-1-012','STG-1-014','STG-1-020']);
 assert.equal(full.s.pending.kind,'effect-buff-own');
 assert.ok(legalUniversalActions(stgPacks,full.s).some(a=>a.uid===null));
 let stayed=go(stgPacks,full.s,{type:'chooseOwnBuff',uid:full.mover.uid});
 assert.equal(stayed.players[0].energy[0].uid,full.mover.uid);
 assert.equal(universalBp(stg,stayed,stayed.players[0].energy[0]),2500);
 assert.equal(stayed.players[0].removed.length,0);
 assert.equal(stayed.pending.kind,'block');

 const one=swing(41061,['STG-1-012','STG-1-014']);
 let moved=go(stgPacks,one.s,{type:'chooseOwnBuff',uid:one.mover.uid});
 assert.equal(moved.players[0].front[3].uid,one.mover.uid);
 assert.equal(moved.players[0].energy[0],null);
 assert.equal(moved.pending.kind,'block');

 const many=swing(41062,['STG-1-012']);
 let choosing=go(stgPacks,many.s,{type:'chooseOwnBuff',uid:many.mover.uid});
 assert.equal(choosing.pending.kind,'effect-shift-slot');
 assert.deepEqual(choosing.pending.slots,[2,3]);
 choosing=go(stgPacks,choosing,{type:'chooseShiftSlot',slot:2});
 assert.equal(choosing.players[0].front[2].uid,many.mover.uid);
 assert.equal(choosing.pending.kind,'block');
 assert.equal(assertUniversalMatch(stgPacks,choosing),true);

 let retire=board(['STG-1-060','STG-1-013','STG-1-009','STG-1-007','STG-1-057','STG-1-012','STG-1-014','STG-1-020'],41063);
 const replaced=place(retire,0,'STG-1-012','front',0);
 place(retire,0,'STG-1-014','front',1);
 place(retire,0,'STG-1-020','front',2);
 place(retire,0,'STG-1-009','energy',0);
 place(retire,0,'STG-1-007','energy',1);
 const leaving=place(retire,0,'STG-1-060','energy',2);
 const mover=place(retire,0,'STG-1-057','energy',3);
 const moeka=take(retire,0,'STG-1-013');
 hold(retire,0,[moeka]);
 retire=act(stgPacks,retire,a=>a.type==='play'&&a.uid===moeka.uid&&a.line==='front');
 assert.equal(retire.pending.kind,'effect-retire-own-character');
 retire=go(stgPacks,retire,{type:'chooseOwnCharacterRetire',uid:leaving.uid});
 assert.equal(retire.pending.kind,'effect-energy-shift');
 assert.ok(legalUniversalActions(stgPacks,retire).some(a=>a.uid===null));
 assert.ok(legalUniversalActions(stgPacks,retire).some(a=>a.uid===mover.uid&&a.replaceUid===replaced.uid));
 const deck=retire.players[0].deck.length;
 retire=act(stgPacks,retire,a=>a.type==='chooseEnergyShift'&&a.uid===mover.uid&&a.replaceUid===replaced.uid);
 assert.ok(retire.players[0].removed.some(c=>c.uid===replaced.uid));
 assert.equal(retire.players[0].outside.some(c=>c.uid===replaced.uid),false);
 assert.equal(retire.players[0].front[0].uid,mover.uid);
 assert.equal(universalBp(stg,retire,retire.players[0].front[0]),3500);
 assert.ok(retire.players[0].outside.some(c=>c.uid===leaving.uid));
 assert.equal(retire.players[0].deck.length,deck-2);
 assert.equal(retire.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,retire),true);
});

test('STG-1-003 readies a character that Okabe rested, and STG-1-010 nulls impact',()=>{
 let s=board(['STG-1-003','STG-1-010','STG-1-009','STG-1-069','STG-1-001','STG-1-012','STG-1-032','STG-1-034','STG-1-057'],41010);
 place(s,0,'STG-1-009','energy',0);
 place(s,0,'STG-1-009','energy',1);
 place(s,0,'STG-1-001','energy',2);
 const kurisu=place(s,0,'STG-1-069','front',0);
 const manual=place(s,0,'STG-1-057','front',1,false);
 const legalTarget=place(s,1,'STG-1-001','front',0);
 const low=place(s,1,'STG-1-012','front',1);
 const okabe=take(s,0,'STG-1-010');
 const suzuha=take(s,0,'STG-1-003');
 const spare=take(s,0,'STG-1-020');
 const keep=outside(s,0,'STG-1-032');
 const final=outside(s,0,'STG-1-034');
 const peeked=s.players[0].deck[0];
 hold(s,0,[okabe,suzuha,spare]);
 s=act(stgPacks,s,a=>a.type==='play'&&a.uid===okabe.uid&&a.line==='front');
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(stgPacks,s,1)).includes(peeked.uid),false);
 s=go(stgPacks,s,{type:'chooseTopCard',mode:'outside'});
 assert.ok(s.players[0].outside.some(c=>c.uid===peeked.uid));
 s=act(stgPacks,s,a=>a.type==='play'&&a.uid===suzuha.uid&&a.line==='energy');
 assert.equal(s.players[0].energy.find(c=>c?.uid===suzuha.uid).ready,true);
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===null));
 s=go(stgPacks,s,{type:'chooseDiscardGate',uid:spare.uid});
 assert.equal(s.pending.kind,'effect-recover-event');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 const recovered=legalUniversalActions(stgPacks,s);
 assert.ok(recovered.some(a=>a.uid===keep.uid));
 assert.equal(recovered.some(a=>a.uid===final.uid),false);
 s=go(stgPacks,s,{type:'chooseRecoverEvent',uid:keep.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===keep.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===final.uid));
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===okabe.uid&&a.restUid===kurisu.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===kurisu.uid).ready,false);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(legalUniversalActions(stgPacks,s).map(a=>a.mode).sort(),['impact','weaken']);
 s=go(stgPacks,s,{type:'chooseEffectMode',mode:'weaken'});
 assert.equal(s.pending.kind,'effect-target');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===null));
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===legalTarget.uid));
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===low.uid),false);
 s=go(stgPacks,s,{type:'chooseTarget',uid:legalTarget.uid});
 assert.equal(universalBp(stg,s,s.players[1].front[0]),1000);
 s.players[0].front.find(c=>c?.uid===kurisu.uid).ready=true;
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===suzuha.uid&&
  a.targetUid===manual.uid),false);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===suzuha.uid&&a.targetUid===kurisu.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===kurisu.uid).ready,true);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===suzuha.uid),false);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===okabe.uid),false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let impact=board(['STG-1-010','STG-1-069'],41011);
 const source=place(impact,0,'STG-1-010','front',0);
 place(impact,0,'STG-1-069','front',1);
 impact=act(stgPacks,impact,a=>a.type==='activate'&&a.uid===source.uid);
 impact=go(stgPacks,impact,{type:'chooseEffectMode',mode:'impact'});
 assert.equal(universalImpact(stg,impact,impact.players[0].front[0]),1);
 assert.equal(impact.pending,null);

 const rezIds=REZ_BASE_IDS.map((id,i)=>i===REZ_BASE_IDS.length-1?'REZ-2-047':id);
 const packs=[rez,stg];
 let battle=newUniversalMatch(packs,{decks:[rezDeck(rezIds),deckWith(['STG-1-010'])],seed:41012,first:0});
 const attacker=put(battle,0,'REZ-2-047','front',0);
 const defender=put(battle,1,'STG-1-010','front',0);
 battle=toPhase(packs,battle,'attack');
 battle=act(packs,battle,a=>a.type==='attack'&&a.uid===attacker.uid);
 battle=go(packs,battle,{type:'chooseBlock',uid:defender.uid});
 assert.equal(battle.players[1].life.length,7);
 assert.ok(battle.players[1].outside.some(c=>c.uid===defender.uid));
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('STG-1-018 retires at the opponent attack end unless a character effect played it',()=>{
 const deploy={op:'deployOwnHandRest',type:'character',color:'blue',energy:4,ap:1,max:1,
  names:['椎名 まゆり']};
 const character={id:'DEP',name:'派遣',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{onPlay:[deploy]}};
 const event={id:'EV',name:'事件派遣',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
  implementation:'dsl',effects:{onPlay:[deploy]}};
 const byCharacter=labMatch([character,printed('STG-1-018')],41018);
 let entered=toPhase(byCharacter.packs,byCharacter.s,'main');
 readyAp(entered);
 const source=pull(entered,0,'DEP');
 const mayuri=pull(entered,0,'STG-1-018');
 hold(entered,0,[source,mayuri]);
 entered=act(byCharacter.packs,entered,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 entered=act(byCharacter.packs,entered,a=>a.type==='chooseHandRest'&&a.uid===mayuri.uid&&a.line==='front');
 const played=entered.players[0].front.find(c=>c?.uid===mayuri.uid);
 assert.equal(played.retireAtOppAttackEnd,undefined);
 assert.equal(entered.pending,null);
 const byEvent=labMatch([event,printed('STG-1-018')],41019);
 let caused=toPhase(byEvent.packs,byEvent.s,'main');
 readyAp(caused);
 const spell=pull(caused,0,'EV');
 const summoned=pull(caused,0,'STG-1-018');
 hold(caused,0,[spell,summoned]);
 caused=act(byEvent.packs,caused,a=>a.type==='event'&&a.uid===spell.uid);
 caused=act(byEvent.packs,caused,a=>a.type==='chooseHandRest'&&a.uid===summoned.uid&&a.line==='energy');
 assert.equal(caused.players[0].energy.find(c=>c?.uid===summoned.uid).retireAtOppAttackEnd.untilOwnTurnStart,2);
 assert.equal(assertUniversalMatch(byEvent.packs,caused),true);

 let s=board(['STG-1-018','STG-1-009'],41020);
 place(s,0,'STG-1-009','energy',0);
 place(s,0,'STG-1-009','energy',1);
 const delayed=take(s,0,'STG-1-018');
 const copy=place(s,0,'STG-1-018','energy',2,true);
 hold(s,0,[delayed]);
 s=act(stgPacks,s,a=>a.type==='play'&&a.uid===delayed.uid&&a.line==='front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c?.uid===delayed.uid).retireAtOppAttackEnd.untilOwnTurnStart,2);
 assert.equal(s.players[0].front.find(c=>c?.uid===delayed.uid).ready,false);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===delayed.uid&&a.mode==='nameActive');
 assert.equal(s.players[0].front.find(c=>c?.uid===delayed.uid).ready,true);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===copy.uid),false);
 assert.ok(s.mainReadyOnceByName[0].includes('椎名 まゆり|STG-1-018'));
 s=passUntil(s,x=>x.phase==='attack'&&x.active===0);
 assert.equal(onBoard(s,0,delayed.uid),true);
 s=passUntil(s,x=>x.phase==='start'&&x.active===1);
 assert.equal(onBoard(s,0,delayed.uid),true);
 s=passUntil(s,x=>x.phase==='attack'&&x.active===1);
 assert.equal(onBoard(s,0,delayed.uid),true);
 s=go(stgPacks,s,{type:'next'});
 assert.equal(onBoard(s,0,delayed.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===delayed.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let look=board(['STG-1-018','STG-1-010','STG-1-012','STG-1-032'],41021);
 const searcher=place(look,0,'STG-1-018','front',0);
 const window=top(look,0,['STG-1-010','STG-1-012','STG-1-032']);
 const spare=look.players[0].hand[0];
 look=toPhase(stgPacks,look,'attack');
 look=act(stgPacks,look,a=>a.type==='attack'&&a.uid===searcher.uid);
 assert.equal(look.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(stgPacks,look,1),null);
 assert.equal(JSON.stringify(universalPublicView(stgPacks,look,1)).includes(window[0].uid),false);
 assert.deepEqual(legalUniversalActions(stgPacks,look).filter(a=>a.uid).map(a=>a.uid),[window[0].uid]);
 look=go(stgPacks,look,{type:'chooseTopFiltered',uid:window[0].uid});
 look=order(look,[window[2].uid,window[1].uid]);
 assert.equal(look.pending.kind,'effect-discard');
 look=go(stgPacks,look,{type:'chooseDiscard',uid:spare.uid});
 assert.ok(look.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.deepEqual(look.players[0].deck.slice(-2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 assert.equal(look.pending.kind,'block');

 let miss=board(['STG-1-018','STG-1-001','STG-1-012','STG-1-032'],41022);
 const quiet=place(miss,0,'STG-1-018','front',0);
 const none=top(miss,0,['STG-1-001','STG-1-012','STG-1-032']);
 miss=toPhase(stgPacks,miss,'attack');
 const hand=miss.players[0].hand.length;
 miss=act(stgPacks,miss,a=>a.type==='attack'&&a.uid===quiet.uid);
 assert.equal(miss.pending.kind,'effect-top-order');
 miss=order(miss,none.map(c=>c.uid));
 assert.equal(miss.players[0].hand.length,hand);
 assert.deepEqual(miss.players[0].deck.slice(-3).map(c=>c.uid),none.map(c=>c.uid));
 assert.equal(miss.pending.kind,'block');
 assert.equal(assertUniversalMatch(stgPacks,miss),true);
});

test('STG-1-028 discounts the next matching event once per name and buffs while rested',()=>{
 let s=board(['STG-1-028','STG-1-009','STG-1-034','STG-1-032','STG-1-069'],41028);
 place(s,0,'STG-1-009','energy',0);
 place(s,0,'STG-1-009','energy',1);
 const other=place(s,0,'STG-1-069','front',0);
 const second=place(s,0,'STG-1-028','front',1,false);
 const sidelined=place(s,0,'STG-1-028','energy',2,false);
 const first=take(s,0,'STG-1-028');
 const mismatch=take(s,0,'STG-1-034');
 const match=take(s,0,'STG-1-032');
 hold(s,0,[first,mismatch,match]);
 s=act(stgPacks,s,a=>a.type==='play'&&a.uid===first.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,false);
 assert.equal(s.pending,null);
 const modes=uid=>legalUniversalActions(stgPacks,s).filter(a=>a.type==='activate'&&a.uid===uid)
  .map(a=>a.mode).sort();
 assert.deepEqual(modes(first.uid),['discount','restedBuff']);
 assert.deepEqual(modes(second.uid),['discount','restedBuff']);
 assert.deepEqual(modes(sidelined.uid),[]);
 const before=apReady(s);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='discount');
 assert.equal(apReady(s),before);
 assert.ok(s.mainReadyOnceByName[0].includes('牧瀬 紅莉栖|STG-1-028-discount'));
 assert.equal(s.mainAbilityUsedUids.includes(first.uid),false);
 assert.deepEqual(modes(first.uid),['restedBuff']);
 assert.deepEqual(modes(second.uid),['restedBuff']);
 assert.ok(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&!e.consumed));
 s=act(stgPacks,s,a=>a.type==='event'&&a.uid===mismatch.uid);
 assert.equal(apReady(s),before-1);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.ok(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'));
 s=go(stgPacks,s,{type:'chooseApRecovery',uid:null});
 const left=apReady(s);
 s=act(stgPacks,s,a=>a.type==='event'&&a.uid===match.uid);
 assert.equal(apReady(s),left);
 assert.equal(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'),false);
 assert.equal(s.pending,null);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='restedBuff');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===first.uid),false);
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===other.uid));
 s=go(stgPacks,s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(stg,s,s.players[0].front[0]),2500);
 assert.deepEqual(modes(first.uid),[]);
 assert.deepEqual(modes(second.uid),['restedBuff']);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='restedBuff');
 s=go(stgPacks,s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(stg,s,s.players[0].front[0]),4500);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-077 rests a field, deploys an active character, and may color-play a green field',()=>{
 let s=board(['STG-1-077','STG-1-045','STG-1-054','STG-1-073','STG-1-050','STG-1-066','STG-1-001'],41077);
 place(s,0,'STG-1-045','energy',0);
 place(s,0,'STG-1-054','energy',1);
 const field=place(s,0,'STG-1-073','energy',2);
 const deploy=take(s,0,'STG-1-050');
 const banned=take(s,0,'STG-1-066');
 const junk=take(s,0,'STG-1-001');
 const mail=take(s,0,'STG-1-077');
 hold(s,0,[mail,deploy,banned,junk]);
 const deck=s.players[0].deck.length;
 s=act(stgPacks,s,a=>a.type==='event'&&a.uid===mail.uid);
 assert.equal(s.pending.kind,'effect-rest-own-field');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===null),false);
 s=go(stgPacks,s,{type:'chooseRestOwnField',uid:field.uid});
 assert.equal(s.players[0].energy.find(c=>c?.uid===field.uid).ready,false);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 s=go(stgPacks,s,{type:'chooseDiscard',uid:junk.uid});
 assert.equal(s.pending.kind,'effect-hand-active-noraid');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 const entries=legalUniversalActions(stgPacks,s);
 assert.ok(entries.some(a=>a.uid===null));
 assert.ok(entries.some(a=>a.uid===deploy.uid&&a.line==='front'));
 assert.equal(entries.some(a=>a.uid===banned.uid),false);
 s=act(stgPacks,s,a=>a.type==='chooseHandActiveNoRaid'&&a.uid===deploy.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===deploy.uid).ready,true);
 assert.equal(s.pending,null);

 let idle=board(['STG-1-077','STG-1-045','STG-1-054','STG-1-073','STG-1-050'],41078);
 place(idle,0,'STG-1-045','energy',0);
 place(idle,0,'STG-1-054','energy',1);
 place(idle,0,'STG-1-073','energy',2,false);
 const waiting=take(idle,0,'STG-1-050');
 const letter=take(idle,0,'STG-1-077');
 hold(idle,0,[letter,waiting]);
 const unchanged=idle.players[0].deck.length;
 idle=act(stgPacks,idle,a=>a.type==='event'&&a.uid===letter.uid);
 assert.equal(idle.pending.kind,'effect-hand-active-noraid');
 assert.equal(idle.players[0].deck.length,unchanged);
 idle=go(stgPacks,idle,{type:'chooseHandActiveNoRaid',uid:null});
 assert.equal(onBoard(idle,0,waiting.uid),false);
 assert.equal(idle.pending,null);

 let life=board(['STG-1-077','STG-1-057','STG-1-073','STG-1-072','STG-1-066','STG-1-031','STG-1-001'],41079);
 const attacker=place(life,0,'STG-1-001','front',0);
 lifeTop(life,1,'STG-1-077');
 const character=take(life,1,'STG-1-057');
 const green=take(life,1,'STG-1-073');
 const wide=take(life,1,'STG-1-072');
 const raider=take(life,1,'STG-1-066');
 const blue=take(life,1,'STG-1-031');
 life.players[1].hand.push(character,green,wide,raider,blue);
 life=toPhase(stgPacks,life,'attack');
 life=act(stgPacks,life,a=>a.type==='attack'&&a.uid===attacker.uid);
 if(life.pending?.kind==='block')life=go(stgPacks,life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'color');
 const color=legalUniversalActions(stgPacks,life);
 assert.ok(color.some(a=>a.mode==='color'&&a.uid===character.uid&&a.line==='front'));
 assert.ok(color.some(a=>a.mode==='colorMayField'&&a.uid===green.uid&&a.line==='energy'));
 assert.ok(color.some(a=>a.mode==='colorMayField'&&a.uid===wide.uid&&a.line==='energy'));
 assert.equal(color.some(a=>a.mode==='colorMayField'&&a.line==='front'),false);
 assert.equal(color.some(a=>a.uid===blue.uid),false);
 assert.equal(color.some(a=>a.uid===raider.uid),false);
 life=act(stgPacks,life,a=>a.mode==='colorMayField'&&a.uid===green.uid&&a.line==='energy');
 assert.equal(life.players[1].energy[0].uid,green.uid);
 assert.equal(life.players[1].energy[0].ready,true);
 assert.equal(life.players[1].front.some(c=>c?.uid===green.uid),false);
 assert.equal(life.pending.kind,'effect-discard');
 life=go(stgPacks,life,{type:'chooseDiscard',uid:life.players[1].hand[0].uid});
 assert.ok(life.players[1].outside.some(c=>c.cardId==='STG-1-077'));
 assert.equal(life.pending,null);

 let characterTrigger=board(['STG-1-077','STG-1-057','STG-1-073','STG-1-001'],41080);
 const striker=place(characterTrigger,0,'STG-1-001','front',0);
 lifeTop(characterTrigger,1,'STG-1-077');
 const handCharacter=take(characterTrigger,1,'STG-1-057');
 const handField=take(characterTrigger,1,'STG-1-073');
 characterTrigger.players[1].hand.push(handCharacter,handField);
 characterTrigger=toPhase(stgPacks,characterTrigger,'attack');
 characterTrigger=act(stgPacks,characterTrigger,a=>a.type==='attack'&&a.uid===striker.uid);
 if(characterTrigger.pending?.kind==='block')
  characterTrigger=go(stgPacks,characterTrigger,{type:'chooseBlock',uid:null});
 characterTrigger=act(stgPacks,characterTrigger,a=>a.mode==='color'&&a.uid===handCharacter.uid&&
  a.line==='front');
 assert.equal(characterTrigger.players[1].front.find(c=>c?.uid===handCharacter.uid).ready,true);
 assert.ok(characterTrigger.players[1].hand.some(c=>c.uid===handField.uid));
 assert.equal(characterTrigger.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,characterTrigger),true);
});

test('STG-1-039 resolves two distinct effects in printed order, then readies AP',()=>{
 let s=board(['STG-1-039','STG-1-009','STG-1-001','STG-1-012'],41039);
 place(s,0,'STG-1-009','energy',0);
 place(s,0,'STG-1-001','energy',1);
 const mine=place(s,0,'STG-1-001','front',0,false);
 const foe=place(s,1,'STG-1-012','front',0);
 const slap=take(s,0,'STG-1-039');
 hold(s,0,[slap]);
 s=act(stgPacks,s,a=>a.type==='event'&&a.uid===slap.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'pick',id:'active'});
 assert.deepEqual(s.pending.selected,['active']);
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'pick',id:'active'});
 assert.deepEqual(s.pending.selected,[]);
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'pick',id:'buff'});
 assert.deepEqual(s.pending.selected,['rest','buff']);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.mode==='pick'&&a.id==='active'),false);
 s=go(stgPacks,s,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===null),false);
 s=go(stgPacks,s,{type:'chooseOwnBuff',uid:mine.uid});
 assert.equal(universalBp(stg,s,s.players[0].front[0]),4000);
 assert.equal(s.pending.kind,'effect-rest-bp');
 s=go(stgPacks,s,{type:'chooseRestBp',uid:foe.uid});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.pending,null);

 let ready=board(['STG-1-039','STG-1-009','STG-1-032','STG-1-035','STG-1-040'],41040);
 place(ready,0,'STG-1-009','energy',0);
 place(ready,0,'STG-1-001','energy',1);
 outside(ready,0,'STG-1-032');
 outside(ready,0,'STG-1-035');
 outside(ready,0,'STG-1-040');
 ready.players[0].apCards[2].ready=false;
 const first=take(ready,0,'STG-1-039');
 const second=take(ready,0,'STG-1-039');
 hold(ready,0,[first,second]);
 ready=act(stgPacks,ready,a=>a.type==='event'&&a.uid===first.uid);
 ready=go(stgPacks,ready,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(ready.pending.kind,'effect-recover-ap');
 assert.equal(legalUniversalActions(stgPacks,ready).some(a=>a.uid===null),false);
 const rested=ready.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 ready=go(stgPacks,ready,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(ready.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(legalUniversalActions(stgPacks,ready).some(a=>a.type==='event'&&a.uid===second.uid),false);
 assert.throws(()=>go(stgPacks,ready,{type:'event',uid:second.uid}),/not currently legal/);
 assert.equal(ready.pending,null);

 let short=board(['STG-1-039','STG-1-009','STG-1-032','STG-1-035'],41041);
 place(short,0,'STG-1-009','energy',0);
 place(short,0,'STG-1-001','energy',1);
 outside(short,0,'STG-1-032');
 outside(short,0,'STG-1-035');
 short.players[0].apCards[2].ready=false;
 const only=take(short,0,'STG-1-039');
 hold(short,0,[only]);
 short=act(stgPacks,short,a=>a.type==='event'&&a.uid===only.uid);
 short=go(stgPacks,short,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(short.pending,null);
 assert.equal(short.players[0].apCards[2].ready,false);
 assert.equal(assertUniversalMatch(stgPacks,short),true);
});

test('STG-1-050 grants one remaining mode, and impact sees an event used afterwards',()=>{
 let s=board(['STG-1-050','STG-1-064','STG-1-060','STG-1-012','STG-1-032'],41050);
 const first=place(s,0,'STG-1-050','front',0);
 const second=place(s,0,'STG-1-050','front',1);
 const sidelined=place(s,0,'STG-1-050','energy',0,false);
 const target=place(s,0,'STG-1-064','front',2);
 const high=place(s,1,'STG-1-060','front',0);
 const low=place(s,1,'STG-1-012','front',1);
 const grants=uid=>legalUniversalActions(stgPacks,s).filter(a=>a.type==='activate'&&a.uid===uid);
 assert.equal(grants(sidelined.uid).length,0);
 assert.ok(grants(first.uid).some(a=>a.targetUid===target.uid&&a.grant==='block'));
 assert.ok(grants(first.uid).some(a=>a.targetUid===target.uid&&a.grant==='eventImpact'));
 assert.equal(grants(first.uid).some(a=>a.targetUid===high.uid),false);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===first.uid&&a.grant==='block'&&
  a.targetUid===target.uid);
 const live=()=>s.players[0].front.find(c=>c?.uid===target.uid);
 assert.equal(grants(first.uid).length,0);
 assert.ok(grants(second.uid).length>0);
 assert.ok(grants(second.uid).every(a=>a.grant==='eventImpact'));
 assert.equal(universalImpact(stg,s,live()),0);
 s=act(stgPacks,s,a=>a.type==='activate'&&a.uid===second.uid&&a.grant==='eventImpact'&&
  a.targetUid===target.uid);
 assert.equal(universalBp(stg,s,live()),2500);
 assert.equal(universalImpact(stg,s,live()),0);
 assert.equal(grants(second.uid).length,0);
 const event=take(s,0,'STG-1-032');
 hold(s,0,[event]);
 s=act(stgPacks,s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(universalImpact(stg,s,live()),1);
 s=toPhase(stgPacks,s,'attack');
 s=act(stgPacks,s,a=>a.type==='attack'&&a.uid===target.uid);
 assert.equal(s.pending.kind,'block');
 const blocks=legalUniversalActions(stgPacks,s).filter(a=>a.type==='chooseBlock');
 assert.ok(blocks.some(a=>a.uid===low.uid));
 assert.equal(blocks.some(a=>a.uid===high.uid),false);
 assert.ok(blocks.some(a=>a.uid===null));
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
