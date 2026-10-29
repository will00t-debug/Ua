import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL}
 from './fixtures/v2-integrated-id-manifest.mjs';

// Scenario coverage for ten whole SAO prints on the shared engine.
// Passing these tests is not official FAQ acceptance. FAQ certified stays 0.
// Japanese text is the pinned official effectJa already checked by verifiedSaoV2Cards.

const TEN=['SAO-2-054','SAO-2-073','SAO-1-104','SAO-1-109','SAO-2-042',
 'SAO-1-097','SAO-2-010','SAO-1-028','SAO-2-022','SAO-1-018'];
const sao=registeredV2TitlePack('sword-art-online');

function deck(required,copies={}){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts={};
 let total=0;
 ids.forEach((id,i)=>{
  const n=copies[id]??(i===12?2:4);
  counts[id]=n;
  total+=n;
 });
 for(const id of rest){
  if(total>=50)break;
  const have=counts[id]||0;
  if(have>=4)continue;
  const add=Math.min(4-have,50-total);
  counts[id]=have+add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,card,line,slot,ready=false){
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1+(c.stack||[]).length+(c.under||[]).length;
 return n;
}
function conserved(s){
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),
   difficulty+':'+(s.pending?.kind||s.phase));
 }
}
function reach(packs,s,pred,discardHand=false){
 for(let n=0;n<80&&!pred(s);n++){
  if(discardHand&&s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid});
   continue;
  }
  if(s.pending)throw Error('pending '+s.pending.kind+' at '+s.phase+' active '+s.active);
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step,s.phase+':'+s.active);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(pred(s),true,(s.pending&&s.pending.kind)+' '+s.phase+' '+s.active+' turn '+s.turn);
 return s;
}
function fresh(ids,seed,first=0,who=0,phase='main',copies){
 const counts=deck(ids,copies);
 const packs=[sao,sao];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first});
 s=reach(packs,s,x=>x.active===who&&x.phase===phase);
 return {packs,s};
}
function energize(s,p,ids){
 return ids.map((id,i)=>place(s,p,take(s,p,id),'energy',i,true));
}
function find(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,JSON.stringify(s.pending?.kind||s.phase));
 return action;
}
function use(packs,s,pred){
 return dispatchUniversalAction(packs,s,find(packs,s,pred));
}
function playFront(packs,s,uid){
 return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line==='front');
}
function playEvent(packs,s,uid){
 return use(packs,s,a=>a.type==='event'&&a.uid===uid);
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function purpleAsuna(c){
 const d=sao.cards[c.cardId];
 return d.type==='character'&&d.color==='purple'&&d.ap===1&&d.energy<=2&&
  (d.name==='アスナ'||(d.nameAliases||[]).includes('アスナ'));
}
function exileHand(s,p,pred){
 const hand=s.players[p].hand;
 for(let i=hand.length-1;i>=0;i--)if(pred(hand[i]))s.players[p].outside.push(hand.splice(i,1)[0]);
}
function quietLife(s,p){
 s.players[p].life.unshift(take(s,p,'SAO-1-001'));
}

test('ten more SAO prints join the shared pilot without counting as FAQ acceptance',()=>{
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],167);
 assert.equal(EXPECTED_V2_TOTAL,664);
 assert.equal(Object.keys(sao.cards).length,167);
 for(const id of TEN){
  assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes(id),true);
  assert.equal(sao.cards[id].implementation,'dsl');
 }
 const mito=sao.cards['SAO-2-054'];
 assert.equal(mito.raidName,'ミト');
 assert.equal(mito.triggerEffect??null,null);
 assert.deepEqual(mito.blockBpRestriction,{relation:'atMost',bp:2000,condition:null});
 assert.equal(sao.cards['SAO-2-073'].raidName,'シノン');
 assert.equal(sao.cards['SAO-2-073'].mainAbility.op,'onceFrontChoose');
 assert.equal(sao.cards['SAO-1-104'].raidName,'キリト');
 assert.equal(sao.cards['SAO-1-104'].triggerEffect??null,null);
 assert.equal(sao.cards['SAO-1-109'].type,'event');
 assert.equal(sao.cards['SAO-1-109'].triggerEffect??null,null);
 assert.equal(sao.cards['SAO-2-042'].raidName,'アスナ');
 assert.equal(sao.cards['SAO-1-097'].triggerEffect.op,'retireOppFront');
 assert.equal(sao.cards['SAO-2-010'].mainAbility.op,'nameOnceLifeThenTrait');
 assert.equal(sao.cards['SAO-2-010'].mainAbility.trait,'女神');
 assert.equal(sao.cards['SAO-1-028'].impactNull,true);
 assert.equal(sao.cards['SAO-1-028'].triggerEffect??null,null);
 assert.equal(sao.cards['SAO-2-022'].effects.onPlay[1].op,'armNextNamedTraitEntry');
 assert.deepEqual(sao.cards['SAO-1-018'].nameAliases,['ユージオ']);
 assert.equal(sao.cards['SAO-1-018'].raidName,'ユージオ');
 assert.equal(sao.cards['SAO-1-018'].printedImpact,1);
 assert.equal(sao.cards['SAO-1-018'].impactNull,true);
 assert.equal(sao.cards['SAO-1-018'].triggerEffect??null,null);
});

test('SAO-2-054 chooses a draw or a rested purple Asuna, then blocks only above 2000',()=>{
 const ids=['SAO-2-054','SAO-2-044','SAO-2-040','SAO-1-001','SAO-1-003'];
 const {packs,s}=fresh(ids,2054);
 energize(s,0,['SAO-2-044','SAO-2-044']);
 const asuna=hold(s,0,'SAO-2-040');
 const mito=hold(s,0,'SAO-2-054');
 const low=place(s,1,take(s,1,'SAO-1-001'),'front',0,true);
 const high=place(s,1,take(s,1,'SAO-1-003'),'front',1,true);
 const played=playFront(packs,s,mito.uid);
 assert.equal(played.pending.kind,'effect-choice-mode');
 aiOk(packs,played);
 const modes=legalUniversalActions(packs,played).map(a=>a.mode);
 assert.deepEqual(modes.sort(),['asuna','draw']);
 const deck=played.players[0].deck.length,hand=played.players[0].hand.length;
 const drew=use(packs,structuredClone(played),a=>a.type==='chooseEffectMode'&&a.mode==='draw');
 assert.equal(drew.pending,null);
 assert.equal(drew.players[0].deck.length,deck-1);
 assert.equal(drew.players[0].hand.length,hand+1);
 const empty=structuredClone(played);
 exileHand(empty,0,purpleAsuna);
 const missed=use(packs,empty,a=>a.type==='chooseEffectMode'&&a.mode==='asuna');
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].front.some(c=>c?.cardId==='SAO-2-040'),false);
 const rested=use(packs,structuredClone(played),a=>a.type==='chooseEffectMode'&&a.mode==='asuna');
 assert.equal(rested.pending.kind,'effect-hand-rest');
 aiOk(packs,rested);
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.uid===asuna.uid),true);
 let entered=use(packs,rested,a=>a.type==='chooseHandRest'&&a.uid===asuna.uid&&a.line==='front');
 if(entered.pending?.kind==='private-top-choice'||entered.pending?.kind==='private-top-place')
  entered=use(packs,entered,a=>a.type==='chooseTopCard'&&a.mode==='top');
 assert.equal(entered.pending,null);
 const body=entered.players[0].front.find(c=>c?.uid===asuna.uid);
 assert.equal(body.ready,false);
 const aimed=use(packs,entered,a=>a.type==='activate'&&a.uid===mito.uid&&a.mode==='frontOnce');
 assert.equal(aimed.pending.kind,'effect-target');
 assert.equal(aimed.pending.choices.includes(low.uid),true);
 const lowered=use(packs,aimed,a=>a.type==='chooseTarget'&&a.uid===low.uid);
 assert.equal(universalBp(packs,lowered,lowered.players[1].front.find(c=>c?.uid===low.uid)),1000);
 lowered.players[0].front.find(c=>c?.uid===mito.uid).ready=true;
 const battle=reach(packs,lowered,x=>x.active===0&&x.phase==='attack');
 const swinging=use(packs,battle,a=>a.type==='attack'&&a.uid===mito.uid);
 assert.equal(swinging.pending.kind,'block');
 const blocks=legalUniversalActions(packs,swinging);
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===high.uid),true);
 conserved(swinging);
});

test('SAO-2-073 rests one green GGO and then buffs another character',()=>{
 const gate=fresh(['SAO-2-073','SAO-1-073'],20730);
 const solo=place(gate.s,0,take(gate.s,0,'SAO-2-073'),'front',0,true);
 assert.equal(legalUniversalActions(gate.packs,gate.s).some(a=>a.uid===solo.uid&&a.type==='activate'),false);
 place(gate.s,0,take(gate.s,0,'SAO-1-073'),'energy',0,true);
 assert.equal(legalUniversalActions(gate.packs,gate.s)
  .some(a=>a.type==='activate'&&a.mode==='frontChoose'&&a.uid===solo.uid),true);
 const ids=['SAO-2-073','SAO-1-073','SAO-1-090','SAO-1-081','SAO-1-001'];
 const {packs,s}=fresh(ids,2073,0,0,'main',{'SAO-1-090':2,'SAO-1-081':2});
 energize(s,0,['SAO-1-073','SAO-1-073','SAO-1-073']);
 const legalRest=hold(s,0,'SAO-1-090');
 const illegal=hold(s,0,'SAO-1-081');
 s.players[0].deck.unshift(take(s,0,'SAO-1-001'));
 const sinon=hold(s,0,'SAO-2-073');
 const deck=s.players[0].deck.length;
 const played=playFront(packs,s,sinon.uid);
 assert.equal(played.players[0].deck.length,deck-1);
 assert.equal(played.pending.kind,'effect-hand-rest');
 aiOk(packs,played);
 const rests=legalUniversalActions(packs,played);
 assert.equal(rests.some(a=>a.uid===legalRest.uid),true);
 assert.equal(rests.some(a=>a.uid===illegal.uid),false);
 const entered=use(packs,played,a=>a.type==='chooseHandRest'&&a.uid===legalRest.uid&&a.line==='energy');
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].energy.find(c=>c?.uid===legalRest.uid).ready,false);
 const opened=use(packs,entered,a=>a.type==='activate'&&a.uid===sinon.uid&&a.mode==='frontChoose');
 assert.equal(opened.pending.kind,'effect-choice-mode');
 assert.deepEqual(opened.pending.options.map(o=>o.id).sort(),['bp','impact']);
 const impact=use(packs,structuredClone(opened),a=>a.type==='chooseEffectMode'&&a.mode==='impact');
 assert.equal(impact.pending.kind,'effect-grant-impact');
 assert.equal(legalUniversalActions(packs,impact).some(a=>a.uid===null),false);
 assert.equal(impact.pending.choices.includes(sinon.uid),false);
 const granted=use(packs,impact,a=>a.type==='chooseGrantImpact'&&a.uid===legalRest.uid);
 assert.equal(granted.pending,null);
 assert.equal(universalImpact(packs,granted,granted.players[0].energy.find(c=>c?.uid===legalRest.uid)),1);
 const bp=use(packs,structuredClone(opened),a=>a.type==='chooseEffectMode'&&a.mode==='bp');
 assert.equal(bp.pending.kind,'effect-buff-own');
 assert.equal(legalUniversalActions(packs,bp).some(a=>a.uid===null),false);
 const boosted=use(packs,bp,a=>a.type==='chooseOwnBuff'&&a.uid===legalRest.uid);
 assert.equal(universalBp(packs,boosted,boosted.players[0].energy.find(c=>c?.uid===legalRest.uid)),4000);
 assert.equal(legalUniversalActions(packs,boosted).some(a=>a.uid===sinon.uid&&a.type==='activate'),false);
 conserved(boosted);
});

test('SAO-1-104 may swap other characters and double-attacks only while Asuna is on the field',()=>{
 function open(seed,withAsuna){
  const {packs,s}=fresh(['SAO-1-104','SAO-1-052','SAO-1-001','SAO-1-051','SAO-2-040'],seed);
  energize(s,0,['SAO-1-052','SAO-1-052']);
  const front=place(s,0,take(s,0,'SAO-1-001'),'front',1,true);
  const energy=place(s,0,take(s,0,'SAO-1-051'),'energy',2,true);
  const asuna=withAsuna?place(s,0,take(s,0,'SAO-2-040'),'energy',3,false):null;
  const kirito=hold(s,0,'SAO-1-104');
  const played=playFront(packs,s,kirito.uid);
  return {packs,played,front,energy,asuna,kirito};
 }
 const named=open(2104,true);
 assert.equal(named.played.pending.kind,'effect-swap-lines');
 assert.equal(named.played.pending.choices.includes(named.kirito.uid),false);
 assert.equal(named.played.pending.choices.includes(named.front.uid),true);
 aiOk(named.packs,named.played);
 let swapped=use(named.packs,named.played,a=>a.type==='chooseSwapLines'&&a.uid===named.front.uid);
 assert.equal(swapped.pending.step,'energy');
 assert.equal(legalUniversalActions(named.packs,swapped).some(a=>a.uid===null),false);
 swapped=use(named.packs,swapped,a=>a.type==='chooseSwapLines'&&a.uid===named.energy.uid);
 assert.equal(swapped.pending,null);
 assert.equal(swapped.players[0].energy.some(c=>c?.uid===named.front.uid),true);
 assert.equal(swapped.players[0].front.some(c=>c?.uid===named.energy.uid),true);
 assert.deepEqual(swapped.players[0].front.find(c=>c?.uid===named.kirito.uid).readyOnAttackGranted&&
  Object.keys(swapped.players[0].front.find(c=>c?.uid===named.kirito.uid).readyOnAttackGranted).sort(),
  ['stamp','turn']);
 const skipped=use(named.packs,structuredClone(named.played),a=>a.type==='chooseSwapLines'&&a.uid===null);
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].front.find(c=>c?.uid===named.kirito.uid).readyOnAttackGranted);
 const plain=open(2105,false);
 const done=use(plain.packs,plain.played,a=>a.type==='chooseSwapLines'&&a.uid===null);
 assert.equal(done.players[0].front.find(c=>c?.uid===plain.kirito.uid).readyOnAttackGranted,undefined);
 swapped.players[0].front.find(c=>c?.uid===named.kirito.uid).ready=true;
 const attack=reach(named.packs,swapped,x=>x.active===0&&x.phase==='attack');
 const swinging=use(named.packs,attack,a=>a.type==='attack'&&a.uid===named.kirito.uid);
 assert.equal(swinging.players[0].front.find(c=>c?.uid===named.kirito.uid).ready,true);
 conserved(swinging);
});

test('SAO-1-109 readies one AP, then moves a character or swaps the lines',()=>{
 const ids=['SAO-1-109','SAO-1-052','SAO-1-001'];
 const {packs,s}=fresh(ids,2109);
 energize(s,0,['SAO-1-052']);
 const mover=place(s,0,take(s,0,'SAO-1-001'),'front',0,true);
 const event=hold(s,0,'SAO-1-109');
 const played=playEvent(packs,s,event.uid);
 assert.equal(played.pending.kind,'effect-recover-ap');
 aiOk(packs,played);
 const rested=played.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 const readied=use(packs,played,a=>a.type==='chooseApRecovery'&&a.uid===rested.uid);
 assert.equal(readied.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(readied.pending.kind,'effect-choice-mode');
 assert.deepEqual(readied.pending.options.map(o=>o.id).sort(),['move','swap']);
 const moving=use(packs,structuredClone(readied),a=>a.type==='chooseEffectMode'&&a.mode==='move');
 assert.equal(moving.pending.kind,'effect-line-move');
 aiOk(packs,moving);
 let shifted=use(packs,moving,a=>a.type==='chooseLineMove'&&a.uid===mover.uid);
 assert.equal(shifted.pending.kind,'effect-line-slot');
 shifted=use(packs,shifted,a=>a.type==='chooseLineSlot'&&a.replaceUid===undefined);
 assert.equal(shifted.pending,null);
 assert.equal(shifted.players[0].energy.some(c=>c?.uid===mover.uid),true);
 const swapping=use(packs,structuredClone(readied),a=>a.type==='chooseEffectMode'&&a.mode==='swap');
 assert.equal(swapping.pending.kind,'effect-swap-lines');
 let exchanged=use(packs,swapping,a=>a.type==='chooseSwapLines'&&a.uid===mover.uid);
 const energyUid=exchanged.pending.choices[0];
 exchanged=use(packs,exchanged,a=>a.type==='chooseSwapLines'&&a.uid===energyUid);
 assert.equal(exchanged.pending,null);
 assert.equal(exchanged.players[0].energy.some(c=>c?.uid===mover.uid),true);
 const bare=fresh(ids,2110);
 energize(bare.s,0,['SAO-1-052']);
 for(const card of bare.s.players[0].energy)if(card)delete card.fieldEntryStamp;
 const lonely=playEvent(bare.packs,bare.s,hold(bare.s,0,'SAO-1-109').uid);
 assert.equal(lonely.pending.kind,'effect-recover-ap');
 const after=use(bare.packs,lonely,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(after.pending.kind,'effect-choice-mode');
 assert.equal(after.pending.options.length,2);
 const noop=use(bare.packs,after,a=>a.type==='chooseEffectMode'&&a.mode==='swap');
 assert.equal(noop.pending,null);
 conserved(shifted);
});

test('SAO-2-042 gains BP and impact, then actives a non-Asuna Progressive when the opponent is below printed BP',()=>{
 const ids=['SAO-2-042','SAO-2-044','SAO-2-040','SAO-2-049','SAO-1-001'];
 function board(seed){
  const {packs,s}=fresh(ids,seed);
  const generators=energize(s,0,['SAO-2-044','SAO-2-044']);
  generators[0].ready=false;
  const named=place(s,0,take(s,0,'SAO-2-040'),'front',1,false);
  const kirito=place(s,0,take(s,0,'SAO-2-049'),'front',2,true);
  const foe=place(s,1,take(s,1,'SAO-1-001'),'front',0,true);
  const asuna=hold(s,0,'SAO-2-042');
  return {packs,s,generators,named,kirito,foe,asuna};
 }
 const down=board(2042);
 let s=use(down.packs,down.s,a=>a.type==='activate'&&a.uid===down.kirito.uid&&a.mode==='frontOnce');
 assert.equal(s.pending.kind,'effect-target');
 s=use(down.packs,s,a=>a.type==='chooseTarget'&&a.uid===down.foe.uid);
 assert.equal(universalBp(down.packs,s,s.players[1].front[0]),1000);
 s=playFront(down.packs,s,down.asuna.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(down.packs,s,s.players[0].front.find(c=>c?.uid===down.asuna.uid)),5000);
 assert.equal(universalImpact(down.packs,s,s.players[0].front.find(c=>c?.uid===down.asuna.uid)),1);
 s.players[0].front.find(c=>c?.uid===down.asuna.uid).ready=true;
 s=reach(down.packs,s,x=>x.active===0&&x.phase==='attack');
 s=use(down.packs,s,a=>a.type==='attack'&&a.uid===down.asuna.uid);
 assert.equal(s.pending.kind,'effect-active-except');
 aiOk(down.packs,s);
 const choices=legalUniversalActions(down.packs,s);
 assert.equal(choices.some(a=>a.uid===down.generators[0].uid),true);
 assert.equal(choices.some(a=>a.uid===down.named.uid),false);
 assert.equal(choices.some(a=>a.uid===down.asuna.uid),false);
 s=use(down.packs,s,a=>a.type==='chooseActiveExcept'&&a.uid===down.generators[0].uid);
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].energy.find(c=>c?.uid===down.generators[0].uid).ready,true);
 const plain=board(2043);
 let quiet=playFront(plain.packs,plain.s,plain.asuna.uid);
 quiet.players[0].front.find(c=>c?.uid===plain.asuna.uid).ready=true;
 quiet=reach(plain.packs,quiet,x=>x.active===0&&x.phase==='attack');
 quiet=use(plain.packs,quiet,a=>a.type==='attack'&&a.uid===plain.asuna.uid);
 assert.equal(quiet.pending.kind,'block');
 conserved(s);
});

test('SAO-1-097 gives a battle-win draw, and sniper only when the chosen character is Sinon',()=>{
 const ids=['SAO-1-097','SAO-1-073','SAO-1-088','SAO-1-001','SAO-1-087'];
 function cast(seed){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-073','SAO-1-073']);
  const event=hold(s,0,'SAO-1-097');
  return {packs,s,event};
 }
 const sinon=cast(2097);
 const shooter=place(sinon.s,0,take(sinon.s,0,'SAO-1-088'),'front',0,true);
 const victim=place(sinon.s,1,take(sinon.s,1,'SAO-1-001'),'front',0,true);
 let s=playEvent(sinon.packs,sinon.s,sinon.event.uid);
 assert.equal(s.pending.kind,'effect-own-attack-kit');
 assert.equal(legalUniversalActions(sinon.packs,s).some(a=>a.uid===null),false);
 aiOk(sinon.packs,s);
 s=use(sinon.packs,s,a=>a.type==='chooseOwnAttackKit'&&a.uid===shooter.uid);
 assert.equal(s.pending,null);
 const armed=s.players[0].front.find(c=>c?.uid===shooter.uid);
 assert.equal(universalBp(sinon.packs,s,armed),4000);
 assert.equal(armed.attackWinDrawGranted.sourceUid,sinon.event.uid);
 assert.equal(armed.eventSniperGranted.bp,2500);
 const hand=s.players[0].hand.length;
 s=reach(sinon.packs,s,x=>x.active===0&&x.phase==='attack');
 s=use(sinon.packs,s,a=>a.type==='attack'&&a.uid===shooter.uid&&a.targetUid===victim.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[0].hand.length,hand+1);
 const other=cast(2098);
 const ally=place(other.s,0,take(other.s,0,'SAO-1-073'),'front',0,true);
 const blocker=place(other.s,1,take(other.s,1,'SAO-1-001'),'front',0,true);
 let plain=playEvent(other.packs,other.s,other.event.uid);
 plain=use(other.packs,plain,a=>a.type==='chooseOwnAttackKit'&&a.uid===ally.uid);
 assert.equal(plain.players[0].front.find(c=>c?.uid===ally.uid).eventSniperGranted,undefined);
 assert.ok(plain.players[0].front.find(c=>c?.uid===ally.uid).attackWinDrawGranted);
 const before=plain.players[0].hand.length;
 plain=reach(other.packs,plain,x=>x.active===0&&x.phase==='attack');
 plain=use(other.packs,plain,a=>a.type==='attack'&&a.uid===ally.uid);
 assert.equal(plain.pending.kind,'block');
 plain=dispatchUniversalAction(other.packs,plain,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(plain.players[0].hand.length,before+1);
 assert.equal(plain.players[1].outside.some(c=>c.uid===blocker.uid),true);
 const loss=cast(2099);
 const loser=place(loss.s,0,take(loss.s,0,'SAO-1-088'),'front',0,true);
 const wall=place(loss.s,1,take(loss.s,1,'SAO-1-087'),'front',0,true);
 quietLife(loss.s,0);
 let beaten=playEvent(loss.packs,loss.s,loss.event.uid);
 beaten=use(loss.packs,beaten,a=>a.type==='chooseOwnAttackKit'&&a.uid===loser.uid);
 const held=beaten.players[0].hand.length;
 beaten=reach(loss.packs,beaten,x=>x.active===0&&x.phase==='attack');
 beaten=use(loss.packs,beaten,a=>a.type==='attack'&&a.uid===loser.uid);
 assert.equal(beaten.pending.kind,'block');
 beaten=dispatchUniversalAction(loss.packs,beaten,{type:'chooseBlock',uid:wall.uid});
 assert.equal(beaten.players[0].hand.length,held);
 assert.equal(beaten.players[0].outside.some(c=>c.uid===loser.uid),true);
 const empty=cast(2100);
 for(const card of empty.s.players[0].energy)if(card)delete card.fieldEntryStamp;
 const quiet=playEvent(empty.packs,empty.s,empty.event.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===empty.event.uid),true);
 conserved(s);
});

test('SAO-2-010 takes one life, then may grant another Goddess BP and impact once per name',()=>{
 const ids=['SAO-2-010','SAO-2-009','SAO-1-003'];
 const {packs,s}=fresh(ids,2010);
 const first=place(s,0,take(s,0,'SAO-2-010'),'front',0,true);
 const second=place(s,0,take(s,0,'SAO-2-010'),'front',1,true);
 const goddess=place(s,0,take(s,0,'SAO-2-009'),'energy',0,true);
 const life=s.players[0].life.length;
 let used=use(packs,s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='lifeThenTrait');
 assert.equal(used.pending.kind,'effect-life-mandatory');
 assert.equal(legalUniversalActions(packs,used).some(a=>a.uid===null),false);
 aiOk(packs,used);
 const taken=used.pending.choices[0];
 used=use(packs,used,a=>a.type==='chooseLifeMandatory'&&a.uid===taken);
 assert.equal(used.players[0].life.length,life-1);
 assert.equal(used.players[0].hand.some(c=>c.uid===taken),true);
 assert.equal(used.pending.kind,'effect-trait-kit');
 assert.equal(used.pending.choices.includes(first.uid),false);
 assert.equal(used.pending.choices.includes(goddess.uid),true);
 const skipped=use(packs,structuredClone(used),a=>a.type==='chooseTraitKit'&&a.uid===null);
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].energy.find(c=>c?.uid===goddess.uid)),3000);
 assert.equal(universalImpact(packs,skipped,skipped.players[0].energy.find(c=>c?.uid===goddess.uid)),0);
 const granted=use(packs,used,a=>a.type==='chooseTraitKit'&&a.uid===goddess.uid);
 assert.equal(granted.pending,null);
 assert.equal(universalBp(packs,granted,granted.players[0].energy.find(c=>c?.uid===goddess.uid)),5000);
 assert.equal(universalImpact(packs,granted,granted.players[0].energy.find(c=>c?.uid===goddess.uid)),1);
 assert.equal(legalUniversalActions(packs,granted).some(a=>a.mode==='lifeThenTrait'),false);
 assert.equal(granted.players[0].mainReadyOnceByName?.includes('シノン（太陽神ソルス）|lifeThenTrait')||
  granted.mainReadyOnceByName[0].includes('シノン（太陽神ソルス）|lifeThenTrait'),true);
 const none=fresh(ids,2011);
 place(none.s,0,take(none.s,0,'SAO-2-010'),'front',0,true);
 none.s.players[0].outside.push(...none.s.players[0].life.splice(0));
 assert.equal(legalUniversalActions(none.packs,none.s).some(a=>a.mode==='lifeThenTrait'),false);
 const lonely=fresh(ids,2012);
 const only=place(lonely.s,0,take(lonely.s,0,'SAO-2-010'),'front',0,true);
 let bare=use(lonely.packs,lonely.s,a=>a.type==='activate'&&a.uid===only.uid&&a.mode==='lifeThenTrait');
 bare=use(lonely.packs,bare,a=>a.type==='chooseLifeMandatory'&&a.uid===bare.pending.choices[0]);
 assert.equal(bare.pending,null);
 assert.equal(second.cardId,'SAO-2-010');
 conserved(granted);
});

test('SAO-1-028 may take a life to gain BP and selection immunity until the next own start',()=>{
 const ids=['SAO-1-028','SAO-1-003','SAO-1-001','SAO-2-049'];
 const {packs,s}=fresh(ids,2028);
 energize(s,0,['SAO-1-003','SAO-1-003']);
 const kirito=place(s,0,take(s,0,'SAO-1-001'),'front',1,true);
 const foe=place(s,1,take(s,1,'SAO-2-049'),'front',0,true);
 const leafa=hold(s,0,'SAO-1-028');
 const played=playFront(packs,s,leafa.uid);
 assert.equal(played.pending.kind,'effect-life-until');
 aiOk(packs,played);
 const skipped=use(packs,structuredClone(played),a=>a.type==='chooseLifeUntil'&&a.uid===null);
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front.find(c=>c?.uid===leafa.uid)),4000);
 assert.equal(skipped.continuousStates.some(e=>e.targetUid===leafa.uid),false);
 const life=played.players[0].life.length;
 let taken=use(packs,played,a=>a.type==='chooseLifeUntil'&&a.uid===played.pending.choices[0]);
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].life.length,life-1);
 assert.equal(universalBp(packs,taken,taken.players[0].front.find(c=>c?.uid===leafa.uid)),6000);
 assert.equal(taken.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'&&
  e.targetUid===leafa.uid&&e.selectionScope==='any'&&!e.consumed),true);
 let enemy=reach(packs,taken,x=>x.active===1&&x.phase==='main');
 enemy=use(packs,enemy,a=>a.type==='activate'&&a.uid===foe.uid&&a.mode==='frontOnce');
 assert.equal(enemy.pending.kind,'effect-target');
 assert.equal(enemy.pending.choices.includes(kirito.uid),true);
 assert.equal(enemy.pending.choices.includes(leafa.uid),false);
 enemy=use(packs,enemy,a=>a.type==='chooseTarget'&&a.uid===kirito.uid);
 const turn=enemy.turn;
 let later=reach(packs,enemy,x=>x.active===1&&x.phase==='main'&&x.turn>turn,true);
 later=use(packs,later,a=>a.type==='activate'&&a.uid===foe.uid&&a.mode==='frontOnce');
 assert.equal(later.pending.choices.includes(leafa.uid),true);
 conserved(later);
});

test('SAO-2-022 draws, then offers one draw the next time an ALO Kirito enters',()=>{
 const ids=['SAO-2-022','SAO-1-052','SAO-1-051','SAO-1-001'];
 function begin(seed,first=1){
  const {packs,s}=fresh(ids,seed,first);
  energize(s,0,['SAO-1-052']);
  return {packs,s};
 }
 const wrong=begin(2022);
 const yui=hold(wrong.s,0,'SAO-2-022');
 const deck=wrong.s.players[0].deck.length;
 let s=playFront(wrong.packs,wrong.s,yui.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].armedEntryMayDraw.pending,false);
 assert.equal(s.players[0].armedEntryMayDraw.name,'キリト');
 assert.equal(s.mainReadyOnceByName[0].includes('ユイ|armedEntryDraw'),false);
 const other=hold(s,0,'SAO-1-001');
 s=playFront(wrong.packs,s,other.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].armedEntryMayDraw.pending,false);
 const right=begin(2023);
 const first=hold(right.s,0,'SAO-2-022');
 let armed=playFront(right.packs,right.s,first.uid);
 const kirito=hold(armed,0,'SAO-1-051');
 const before=armed.players[0].deck.length;
 armed=playFront(right.packs,armed,kirito.uid);
 assert.equal(armed.pending.kind,'effect-armed-draw');
 aiOk(right.packs,armed);
 assert.equal(armed.players[0].armedEntryMayDraw.pending,true);
 assert.equal(armed.mainReadyOnceByName[0].includes('ユイ|armedEntryDraw'),true);
 const drew=use(right.packs,armed,a=>a.type==='chooseArmedDraw'&&a.mode==='draw');
 assert.equal(drew.pending,null);
 assert.equal(drew.players[0].armedEntryMayDraw,null);
 assert.equal(drew.players[0].deck.length,before-1);
 const skipped=use(right.packs,structuredClone(armed),a=>a.type==='chooseArmedDraw'&&a.mode==='skip');
 assert.equal(skipped.players[0].armedEntryMayDraw,null);
 assert.equal(skipped.players[0].deck.length,before);
 const dry=begin(2024);
 let waiting=playFront(dry.packs,dry.s,hold(dry.s,0,'SAO-2-022').uid);
 waiting.players[0].outside.push(...waiting.players[0].deck.splice(0));
 const empty=playFront(dry.packs,waiting,hold(waiting,0,'SAO-1-051').uid);
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].armedEntryMayDraw.pending,false);
 assert.equal(empty.mainReadyOnceByName[0].includes('ユイ|armedEntryDraw'),false);
 const later=fresh(ids,2025,1);
 let third=reach(later.packs,later.s,x=>x.active===0&&x.phase==='main'&&
  x.players[0].apCards.filter(c=>c.inPlay&&c.ready).length>=3,true);
 energize(third,0,['SAO-1-052']);
 const opening=hold(third,0,'SAO-2-022');
 third=playFront(later.packs,third,opening.uid);
 const alo=hold(third,0,'SAO-1-051');
 third=playFront(later.packs,third,alo.uid);
 assert.equal(third.pending.kind,'effect-armed-draw');
 third=use(later.packs,third,a=>a.type==='chooseArmedDraw'&&a.mode==='draw');
 const again=hold(third,0,'SAO-2-022');
 third=playFront(later.packs,third,again.uid);
 assert.equal(third.pending,null);
 assert.equal(third.players[0].armedEntryMayDraw,null);
 conserved(third);
});

test('SAO-1-018 retires from battle and grants Kirito and Alice BP plus impact null',()=>{
 const ids=['SAO-1-018','SAO-1-001','SAO-1-013','SAO-2-049'];
 function battle(seed,withAlice){
  const {packs,s}=fresh(ids,seed);
  const eugeo=place(s,0,take(s,0,'SAO-1-018'),'front',0,true);
  const kirito=place(s,0,take(s,0,'SAO-1-001'),'front',1,true);
  const alice=withAlice?place(s,0,take(s,0,'SAO-1-013'),'front',2,true):null;
  const attacker=place(s,1,take(s,1,'SAO-2-049'),'front',0,true);
  let going=reach(packs,s,x=>x.active===1&&x.phase==='attack');
  going=use(packs,going,a=>a.type==='attack'&&a.uid===attacker.uid);
  assert.equal(going.pending.kind,'block');
  going=dispatchUniversalAction(packs,going,{type:'chooseBlock',uid:eugeo.uid});
  return {packs,going,eugeo,kirito,alice};
 }
 const both=battle(2018,true);
 assert.equal(both.going.players[0].outside.some(c=>c.uid===both.eugeo.uid),true);
 assert.equal(both.going.pending.kind,'effect-named-fronts');
 assert.equal(both.going.pending.name,'キリト');
 aiOk(both.packs,both.going);
 let granted=use(both.packs,both.going,a=>a.type==='chooseNamedFronts'&&a.uid===both.kirito.uid);
 assert.equal(granted.pending.kind,'effect-named-fronts');
 assert.equal(granted.pending.name,'アリス');
 granted=use(both.packs,granted,a=>a.type==='chooseNamedFronts'&&a.uid===both.alice.uid);
 assert.equal(granted.pending,null);
 assert.equal(universalBp(both.packs,granted,granted.players[0].front.find(c=>c?.uid===both.kirito.uid)),3000);
 assert.equal(universalBp(both.packs,granted,granted.players[0].front.find(c=>c?.uid===both.alice.uid)),5000);
 assert.equal(granted.players[0].front.find(c=>c?.uid===both.kirito.uid).impactNullThisTurn.turn,granted.turn);
 assert.equal(granted.players[0].front.find(c=>c?.uid===both.alice.uid).impactNullThisTurn.turn,granted.turn);
 const skipped=use(both.packs,structuredClone(both.going),a=>a.type==='chooseNamedFronts'&&a.uid===null);
 assert.equal(skipped.pending.name,'アリス');
 assert.equal(universalBp(both.packs,skipped,skipped.players[0].front.find(c=>c?.uid===both.kirito.uid)),2000);
 const only=battle(2019,false);
 assert.equal(only.going.pending.name,'キリト');
 const finished=use(only.packs,only.going,a=>a.type==='chooseNamedFronts'&&a.uid===only.kirito.uid);
 assert.equal(finished.pending,null);
 const none=fresh(ids,2020);
 const eugeo=place(none.s,0,take(none.s,0,'SAO-1-018'),'front',0,true);
 const attacker=place(none.s,1,take(none.s,1,'SAO-2-049'),'front',0,true);
 let quiet=reach(none.packs,none.s,x=>x.active===1&&x.phase==='attack');
 quiet=use(none.packs,quiet,a=>a.type==='attack'&&a.uid===attacker.uid);
 quiet=dispatchUniversalAction(none.packs,quiet,{type:'chooseBlock',uid:eugeo.uid});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===eugeo.uid),true);
 conserved(granted);
});
