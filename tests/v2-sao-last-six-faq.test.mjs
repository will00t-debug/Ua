import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalImpact,universalAttackDamage,universalCardEnergy,
 universalEnergyByColor,universalPublicView,universalPrivateChoices,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {fieldRestrictions} from '../dist/universal-v2/continuous-states.mjs';
import {V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL}
 from './fixtures/v2-integrated-id-manifest.mjs';

// The last six SAO prints, plus the official rulings named on those card pages.
// Q751, Q1197, Q1198, Q1202, Q1203 and Q1214 are encoded as match states.
// Passing these tests is not official FAQ acceptance. FAQ certified stays 0.
// SAO-1-033 and SAO-2-018 have no card-page FAQ; their tests are the printed text.

const SIX=['SAO-1-022','SAO-1-033','SAO-2-011','SAO-2-018','SAO-2-031','SAO-2-036'];
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
function take(s,p,id,zones=['hand','deck','life','outside','removed']){
 for(const zone of zones){
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
function find(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,JSON.stringify(s.pending?.kind||s.phase));
 return action;
}
function use(packs,s,pred){
 return dispatchUniversalAction(packs,s,find(packs,s,pred));
}
function playFront(packs,s,uid){
 return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line==='front'&&a.replaceUid===undefined);
}
function playEvent(packs,s,uid){
 return use(packs,s,a=>a.type==='event'&&a.uid===uid);
}
function hold(s,p,id,zones){
 const card=take(s,p,id,zones);
 s.players[p].hand.push(card);
 return card;
}
function putOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function setLife(s,p,n){
 while(s.players[p].life.length>n)s.players[p].outside.push(s.players[p].life.pop());
 assert.equal(s.players[p].life.length,n);
}
function stackTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id,['deck','life','outside','removed','hand']));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function cardOf(s,p,uid){
 for(const zone of ['hand','deck','life','outside','removed']){
  const found=s.players[p][zone].find(c=>c.uid===uid);
  if(found)return found;
 }
 for(const line of ['front','energy']){
  const found=s.players[p][line].find(c=>c?.uid===uid);
  if(found)return found;
 }
 return null;
}
function orderBottom(packs,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'&&s.pending.split!==true){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=use(packs,s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
  assert.ok(++guard<=12);
 }
 return s;
}
function discardAll(packs,s,keep){
 let guard=0;
 while(s.pending?.kind==='effect-discard'){
  const hand=s.players[s.pending.player].hand;
  const uid=(hand.find(c=>c.uid!==keep)||hand[0]).uid;
  s=use(packs,s,a=>a.type==='chooseDiscard'&&a.uid===uid);
  assert.ok(++guard<=6);
 }
 return s;
}
function apReady(s,p){
 return s.players[p].apCards.filter(c=>c.ready).length;
}
function moved(s,uid){
 return s.continuousStates.some(e=>e.kind==='cannotMove'&&!e.consumed&&e.targetUid===uid);
}
function yellowPair(s,p){
 return [0,1].map(i=>place(s,p,take(s,p,'SAO-1-003'),'energy',i,true));
}

test('the last six SAO prints join the shared pilot',()=>{
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],183);
 assert.equal(EXPECTED_V2_TOTAL,700);
 assert.equal(Object.keys(sao.cards).length,183);
 for(const id of SIX){
  assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes(id),true);
  assert.equal(sao.cards[id].implementation,'dsl');
 }
 const stacia=sao.cards['SAO-1-022'];
 assert.equal(stacia.raidName,'アスナ（創世神ステイシア）');
 assert.equal(stacia.effects.onPlay[0].op,'restGenEnergySwap');
 assert.equal(stacia.effects.onPlay[0].lockLifeAtMost,4);
 const terrain=sao.cards['SAO-1-033'];
 assert.equal(terrain.type,'event');
 assert.equal(terrain.effects.onPlay[0].options[0].then[0].lockLifeAtMost,undefined);
 assert.equal(terrain.effects.onPlay[0].options[1].then[0].op,'retireOppFieldGenAtMost');
 const leafa=sao.cards['SAO-2-011'];
 assert.equal(leafa.effects.onPlay[0].op,'frontTraitImpactRaidToLife');
 assert.equal(leafa.effects.onPlay[0].trait,'女神');
 assert.equal(sao.cards['SAO-2-018'].effects.onRetire[0].op,'lookTopNameOrLowEnergy');
 assert.equal(sao.cards['SAO-2-031'].mainAbility.op,'onceOutsideBottomDamage');
 assert.equal(sao.cards['SAO-2-031'].effects.onPlay[0].filter.trait,'歌');
 assert.equal(sao.cards['SAO-2-036'].impactNull,true);
 assert.equal(sao.cards['SAO-2-036'].triggerEffect.op,'deployOutsideCharacter');
 assert.equal(sao.cards['SAO-2-036'].effects.onPlay[0].when.trait,'歌');
 assert.equal(V2_PENDING_LABELS['effect-rest-gen'].includes('休息'),true);
 assert.equal(V2_PENDING_LABELS['effect-raid-life'].includes('生命'),true);
 assert.equal(V2_PENDING_LABELS['effect-wyrm-look'].includes('鑄錠'),true);
 assert.equal(V2_PENDING_LABELS['effect-bottom-retire'].includes('牌庫底'),true);
});

test('SAO-1-022 rests a front and a generated-energy-1 character, then locks both at 4 life',()=>{
 const ids=['SAO-1-022','SAO-1-003','SAO-2-028','SAO-2-031'];
 const {packs,s}=fresh(ids,1022);
 yellowPair(s,0);
 setLife(s,0,4);
 assert.equal(universalEnergyByColor(packs,s,0).yellow,4);
 const front=place(s,1,take(s,1,'SAO-1-003'),'front',0,true);
 const lows=[];
 for(let i=0;i<4;i++)lows.push(place(s,1,take(s,1,'SAO-2-028'),'energy',i,true));
 const asuna=hold(s,0,'SAO-1-022');
 let played=playFront(packs,s,asuna.uid);
 assert.equal(played.pending.kind,'effect-rest-gen');
 assert.equal(played.pending.step,'front');
 assertUniversalMatch(packs,played);
 aiOk(packs,played);
 assert.deepEqual(played.pending.choices,[front.uid]);
 let asked=use(packs,played,a=>a.type==='chooseRestGen'&&a.uid===front.uid);
 assert.equal(asked.pending.step,'energy');
 assert.equal(asked.pending.choices.includes(lows[0].uid),true);
 const skippedEnergy=use(packs,structuredClone(asked),a=>a.type==='chooseRestGen'&&a.uid===null);
 assert.equal(skippedEnergy.pending,null);
 assert.equal(skippedEnergy.players[1].front.find(c=>c?.uid===front.uid).ready,false);
 assert.equal(moved(skippedEnergy,front.uid),false);
 assert.equal(moved(skippedEnergy,lows[0].uid),false);
 asked=use(packs,asked,a=>a.type==='chooseRestGen'&&a.uid===lows[0].uid);
 assert.equal(asked.pending.step,'swap');
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===null),true);
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===lows[0].uid),true);
 const stayed=use(packs,structuredClone(asked),a=>a.type==='chooseRestGen'&&a.uid===null);
 assert.equal(stayed.pending,null);
 assert.equal(stayed.players[1].energy.some(c=>c?.uid===lows[0].uid),true);
 assert.equal(stayed.players[1].front.find(c=>c?.uid===front.uid).ready,false);
 assert.equal(stayed.players[1].energy.find(c=>c?.uid===lows[0].uid).ready,false);
 assert.equal(moved(stayed,front.uid),true);
 assert.equal(moved(stayed,lows[0].uid),true);
 const lock=stayed.continuousStates.find(e=>e.kind==='cannotMove'&&e.targetUid===lows[0].uid);
 assert.deepEqual(lock.until,{player:0,phase:'start',edge:'start'});
 const swapped=use(packs,asked,a=>a.type==='chooseRestGen'&&a.uid===lows[0].uid);
 assert.equal(swapped.players[1].front.some(c=>c?.uid===lows[0].uid),true);
 assert.equal(swapped.players[1].energy.some(c=>c?.uid===front.uid),true);
 assert.equal(moved(swapped,front.uid),true);
 assert.equal(moved(swapped,lows[0].uid),true);
 let moving=reach(packs,stayed,x=>x.active===1&&x.phase==='move');
 const moves=legalUniversalActions(packs,moving).filter(a=>a.type==='move');
 assert.equal(moves.some(a=>a.uid===lows[0].uid),false);
 assert.equal(moves.some(a=>a.uid===lows[1].uid),true);
 const yuna=hold(moving,1,'SAO-2-031');
 moving=reach(packs,moving,x=>x.active===1&&x.phase==='main');
 assert.equal(fieldRestrictions(moving,1,moving.players[1].energy.find(c=>c?.uid===lows[0].uid))
  .some(r=>r.kind==='cannotMove'),true);
 const raid=find(packs,moving,a=>a.type==='raid'&&a.uid===yuna.uid&&a.baseUid===lows[0].uid&&
  a.line!=='energy');
 let raided=dispatchUniversalAction(packs,moving,raid);
 const top=raided.players[1].front.find(c=>c?.uid===yuna.uid);
 assert.equal(top.stack[0].uid,lows[0].uid);
 assert.equal(raided.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===lows[0].uid),false);
 assert.equal(fieldRestrictions(raided,1,top).some(r=>r.kind==='cannotMove'),false);
 assert.equal(raided.pending,null);
 conserved(raided);
});

test('SAO-1-022 does not lock above 4 life, with one target, or a higher generated-energy card',()=>{
 const ids=['SAO-1-022','SAO-1-003','SAO-2-028','SAO-1-029'];
 function open(seed,life){
  const {packs,s}=fresh(ids,seed);
  yellowPair(s,0);
  setLife(s,0,life);
  const front=place(s,1,take(s,1,'SAO-1-003'),'front',0,true);
  const asuna=hold(s,0,'SAO-1-022');
  const played=playFront(packs,s,asuna.uid);
  return {packs,played,front};
 }
 const high=open(1023,5);
 const low=place(high.played,1,take(high.played,1,'SAO-2-028'),'energy',0,true);
 let both=use(high.packs,high.played,a=>a.type==='chooseRestGen'&&a.uid===high.front.uid);
 both=use(high.packs,both,a=>a.type==='chooseRestGen'&&a.uid===low.uid);
 assert.equal(both.pending.step,'swap');
 const unlocked=use(high.packs,both,a=>a.type==='chooseRestGen'&&a.uid===null);
 assert.equal(moved(unlocked,high.front.uid),false);
 assert.equal(moved(unlocked,low.uid),false);
 const only=open(1024,4);
 let one=use(only.packs,only.played,a=>a.type==='chooseRestGen'&&a.uid===only.front.uid);
 assert.equal(one.pending,null);
 assert.equal(one.players[1].front.find(c=>c?.uid===only.front.uid).ready,false);
 assert.equal(moved(one,only.front.uid),false);
 const {packs,s}=fresh(ids,1025);
 yellowPair(s,0);
 setLife(s,0,4);
 const front=place(s,1,take(s,1,'SAO-1-003'),'front',0,true);
 const yuna=place(s,1,take(s,1,'SAO-2-028'),'energy',0,true);
 const active=place(s,1,take(s,1,'SAO-1-003'),'energy',1,true);
 const rested=place(s,1,take(s,1,'SAO-1-003'),'energy',2,false);
 const field=place(s,1,take(s,1,'SAO-1-029'),'energy',3,true);
 assert.equal(universalCardEnergy(packs,s,1,yuna),1);
 assert.equal(universalCardEnergy(packs,s,1,active),2);
 assert.equal(universalCardEnergy(packs,s,1,rested),1);
 assert.equal(universalCardEnergy(packs,s,1,field),1);
 const asuna=hold(s,0,'SAO-1-022');
 let played=playFront(packs,s,asuna.uid);
 assert.deepEqual(played.pending.choices,[front.uid]);
 played=use(packs,played,a=>a.type==='chooseRestGen'&&a.uid===front.uid);
 assert.deepEqual(played.pending.choices,[yuna.uid,rested.uid]);
 conserved(played);
});

test('SAO-1-033 chooses the same rest without a move lock, or retires one low-energy field',()=>{
 const ids=['SAO-1-033','SAO-1-003','SAO-2-028','SAO-1-029','SAO-1-096'];
 const {packs,s}=fresh(ids,1033);
 yellowPair(s,0);
 setLife(s,0,4);
 const front=place(s,1,take(s,1,'SAO-1-003'),'front',0,true);
 const yuna=place(s,1,take(s,1,'SAO-2-028'),'energy',0,true);
 const cedar=place(s,1,take(s,1,'SAO-1-029'),'energy',1,true);
 const buggy=place(s,1,take(s,1,'SAO-1-096'),'energy',2,true);
 const event=hold(s,0,'SAO-1-033');
 const played=playEvent(packs,s,event.uid);
 assert.equal(played.pending.kind,'effect-choice-mode');
 assertUniversalMatch(packs,played);
 aiOk(packs,played);
 let rested=use(packs,structuredClone(played),a=>a.type==='chooseEffectMode'&&a.mode==='rest');
 rested=use(packs,rested,a=>a.type==='chooseRestGen'&&a.uid===front.uid);
 rested=use(packs,rested,a=>a.type==='chooseRestGen'&&a.uid===yuna.uid);
 assert.equal(rested.pending.step,'swap');
 rested=use(packs,rested,a=>a.type==='chooseRestGen'&&a.uid===null);
 assert.equal(rested.players[1].front.find(c=>c?.uid===front.uid).ready,false);
 assert.equal(rested.players[1].energy.find(c=>c?.uid===yuna.uid).ready,false);
 assert.equal(moved(rested,front.uid),false);
 assert.equal(moved(rested,yuna.uid),false);
 let field=use(packs,played,a=>a.type==='chooseEffectMode'&&a.mode==='field');
 assert.equal(field.pending.kind,'effect-retire-field-gen');
 assert.deepEqual(field.pending.choices,[cedar.uid]);
 const skipped=use(packs,structuredClone(field),a=>a.type==='chooseRetireFieldGen'&&a.uid===null);
 assert.equal(skipped.players[1].energy.some(c=>c?.uid===cedar.uid),true);
 field=use(packs,field,a=>a.type==='chooseRetireFieldGen'&&a.uid===cedar.uid);
 assert.equal(field.pending,null);
 assert.equal(field.players[1].outside.some(c=>c.uid===cedar.uid),true);
 assert.equal(field.players[1].energy.some(c=>c?.uid===buggy.uid),true);
 conserved(field);
});

test('SAO-2-011 grants impact at 4 life when every front character is a goddess',()=>{
 const ids=['SAO-2-011','SAO-1-028','SAO-1-003'];
 function cast(seed,life){
  const {packs,s}=fresh(ids,seed);
  yellowPair(s,0);
  setLife(s,0,life);
  const leafa=hold(s,0,'SAO-2-011');
  return {packs,s,leafa};
 }
 const plain=cast(2011,4);
 let played=playFront(plain.packs,plain.s,plain.leafa.uid);
 const body=played.players[0].front.find(c=>c?.uid===plain.leafa.uid);
 assert.equal(played.pending,null);
 assert.equal(universalImpact(plain.packs,played,body),1);
 const high=cast(2012,5);
 played=playFront(high.packs,high.s,high.leafa.uid);
 assert.equal(universalImpact(high.packs,played,played.players[0].front.find(c=>c?.uid===high.leafa.uid)),0);
 const mixed=cast(2013,4);
 place(mixed.s,0,take(mixed.s,0,'SAO-1-003'),'front',1,true);
 played=playFront(mixed.packs,mixed.s,mixed.leafa.uid);
 assert.equal(universalImpact(mixed.packs,played,
  played.players[0].front.find(c=>c?.uid===mixed.leafa.uid)),0);
 const {packs,s}=fresh(ids,2014);
 yellowPair(s,0);
 setLife(s,0,4);
 const base=place(s,0,take(s,0,'SAO-1-028'),'front',0,true);
 const leafa=hold(s,0,'SAO-2-011');
 let raided=use(packs,s,a=>a.type==='raid'&&a.uid===leafa.uid&&a.baseUid===base.uid&&
  a.line!=='energy');
 const top=raided.players[0].front.find(c=>c?.uid===leafa.uid);
 assert.equal(universalImpact(packs,raided,top),1);
 assert.equal(raided.pending.kind,'effect-raid-life');
 assert.equal(raided.pending.baseUid,base.uid);
 assertUniversalMatch(packs,raided);
 aiOk(packs,raided);
 const declined=use(packs,structuredClone(raided),a=>a.type==='chooseRaidLife'&&a.index===null);
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].life.length,4);
 assert.equal(top.stack.length,1);
 let placed=use(packs,raided,a=>a.type==='chooseRaidLife'&&a.index===0);
 assert.equal(placed.pending,null);
 assert.equal(placed.players[0].life.length,5);
 assert.equal(placed.players[0].life[0].uid,base.uid);
 assert.equal(placed.players[0].life[0].lifePublic,true);
 assert.equal(placed.players[0].front.find(c=>c?.uid===leafa.uid).stack.length,0);
 const hidden=placed.players[0].life.filter(c=>c.lifePublic!==true);
 const seen=universalPublicView(packs,placed,1);
 assert.deepEqual(seen.players[0].publicLife,[{index:0,uid:base.uid,cardId:'SAO-1-028'}]);
 assert.equal(seen.players[0].lifeCount,5);
 assert.equal(seen.players[0].hand,null);
 for(const c of hidden)assert.equal(JSON.stringify(seen).includes(c.uid),false);
 const attacker=place(placed,1,take(placed,1,'SAO-1-003'),'front',0,true);
 placed=reach(packs,placed,x=>x.active===1&&x.phase==='attack');
 let hit=use(packs,placed,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(hit.pending.kind,'block');
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:null});
 assert.equal(hit.status,'playing');
 assert.equal(hit.pending.kind,'life-trigger');
 assert.equal(hit.pending.trigger,'active');
 assert.equal(hit.pending.uid,base.uid);
 conserved(hit);
});

test('Q1198: raiding the last life and putting the base back does not lose',()=>{
 const ids=['SAO-2-011','SAO-1-028','SAO-1-003'];
 const {packs,s}=fresh(ids,1198,0,1,'attack');
 while(s.players[0].life.length)s.players[0].outside.push(s.players[0].life.pop());
 const life=take(s,0,'SAO-2-011');
 s.players[0].life.unshift(life);
 yellowPair(s,0);
 const base=place(s,0,take(s,0,'SAO-1-028'),'front',0,true);
 const attacker=place(s,1,take(s,1,'SAO-1-003'),'front',0,true);
 assert.equal(universalEnergyByColor(packs,s,0).yellow,4);
 let hit=use(packs,s,a=>a.type==='attack'&&a.uid===attacker.uid);
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:null});
 assert.equal(hit.pending.kind,'life-trigger');
 assert.equal(hit.pending.trigger,'raid');
 assert.equal(hit.players[0].life.length,0);
 assert.equal(hit.status,'playing');
 let raided=use(packs,hit,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&
  a.baseUid===base.uid&&a.line==='front');
 assert.equal(raided.pending.kind,'effect-raid-life');
 assert.equal(raided.status,'playing');
 assertUniversalMatch(packs,raided);
 const lost=use(packs,structuredClone(raided),a=>a.type==='chooseRaidLife'&&a.index===null);
 assert.equal(lost.players[0].life.length,0);
 assert.equal(lost.status,'finished');
 assert.equal(lost.endReason,'life-zero');
 assert.equal(lost.winner,1);
 const kept=use(packs,raided,a=>a.type==='chooseRaidLife'&&a.index===0);
 assert.equal(kept.players[0].life.length,1);
 assert.equal(kept.players[0].life[0].uid,base.uid);
 assert.equal(kept.players[0].life[0].lifePublic,true);
 assert.equal(kept.status,'playing');
 assert.notEqual(kept.endReason,'life-zero');
 conserved(kept);
});

test('SAO-2-018 looks at five cards for an ingot or a low printed-energy Kirito or Liz',()=>{
 const ids=['SAO-2-018','SAO-1-041','SAO-2-025','SAO-2-020','SAO-2-028','SAO-1-003','SAO-2-035','SAO-1-096'];
 function battle(seed,top){
  const {packs,s}=fresh(ids,seed,0,1,'attack');
  const wyrm=place(s,0,take(s,0,'SAO-2-018'),'front',0,true);
  const kirito=place(s,1,take(s,1,'SAO-1-041'),'front',0,true);
  const window=stackTop(s,0,top);
  let fought=use(packs,s,a=>a.type==='attack'&&a.uid===kirito.uid);
  assert.equal(fought.pending.kind,'block');
  fought=dispatchUniversalAction(packs,fought,{type:'chooseBlock',uid:wyrm.uid});
  return {packs,fought,wyrm,window};
 }
 const hit=battle(2018,['SAO-2-025','SAO-2-020','SAO-1-041','SAO-2-028','SAO-1-003']);
 const window=hit.window;
 assert.equal(hit.fought.pending.kind,'effect-wyrm-look');
 assertUniversalMatch(hit.packs,hit.fought);
 aiOk(hit.packs,hit.fought);
 const idsIn=hit.fought.pending.choices.map(uid=>cardOf(hit.fought,0,uid).cardId).sort();
 assert.deepEqual(idsIn,['SAO-2-020','SAO-2-025']);
 const mine=universalPrivateChoices(hit.packs,hit.fought,0);
 assert.equal(mine.options.some(o=>o.card?.cardId==='SAO-2-025'),true);
 assert.equal(mine.options.some(o=>o.card?.cardId==='SAO-1-041'),false);
 assert.equal(universalPrivateChoices(hit.packs,hit.fought,1),null);
 const pub=universalPublicView(hit.packs,hit.fought,1);
 assert.equal(pub.players[0].hand,null);
 assert.equal(pub.players[0].deck,undefined);
 for(const c of window)assert.equal(JSON.stringify(pub).includes(c.uid),false);
 const ingot=hit.fought.pending.choices.find(uid=>cardOf(hit.fought,0,uid).cardId==='SAO-2-025');
 let taken=use(hit.packs,structuredClone(hit.fought),a=>a.type==='chooseWyrmLook'&&a.uid===ingot);
 assert.equal(taken.players[0].hand.some(c=>c.uid===ingot),true);
 assert.equal(taken.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===ingot),true);
 taken=orderBottom(hit.packs,taken);
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===ingot),true);
 const liz=hit.fought.pending.choices.find(uid=>cardOf(hit.fought,0,uid).cardId==='SAO-2-020');
 let character=use(hit.packs,hit.fought,a=>a.type==='chooseWyrmLook'&&a.uid===liz);
 character=orderBottom(hit.packs,character);
 assert.equal(character.pending.kind,'effect-discard');
 character=discardAll(hit.packs,character);
 assert.notEqual(character.pending?.kind,'effect-discard');
 const skipped=battle(2019,['SAO-2-025','SAO-2-020','SAO-1-041','SAO-2-028','SAO-1-003']);
 const hand=skipped.fought.players[0].hand.length;
 let none=use(skipped.packs,skipped.fought,a=>a.type==='chooseWyrmLook'&&a.uid===null);
 assert.equal(none.pending.kind,'effect-top-order');
 assert.equal(none.pending.uids.length,5);
 none=orderBottom(skipped.packs,none);
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.length,hand);
 const miss=battle(2020,['SAO-1-041','SAO-2-028','SAO-1-003','SAO-2-035','SAO-1-096']);
 assert.equal(miss.fought.pending.kind,'effect-top-order');
 assert.notEqual(miss.fought.pending.kind,'effect-wyrm-look');
 conserved(taken);
});

test('Q1202: an ineligible hand play does not spend the song AP discount',()=>{
 const ids=['SAO-2-031','SAO-2-028','SAO-2-062','SAO-2-035'];
 const {packs,s}=fresh(ids,1202,1,0,'main');
 assert.equal(apReady(s,0),2);
 for(let i=0;i<4;i++)place(s,0,take(s,0,'SAO-2-035'),'energy',i,true);
 const yuna=hold(s,0,'SAO-2-031');
 const plain=hold(s,0,'SAO-2-028');
 const other=hold(s,0,'SAO-2-028',['deck','life','outside','removed']);
 const song=hold(s,0,'SAO-2-062');
 let played=playFront(packs,s,yuna.uid);
 assert.equal(played.pending,null);
 assert.equal(apReady(played,0),1);
 played=playFront(packs,played,plain.uid);
 assert.equal(apReady(played,0),0);
 assert.equal(played.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(legalUniversalActions(packs,played).some(a=>a.type==='play'&&a.uid===other.uid),false);
 assert.equal(legalUniversalActions(packs,played).some(a=>a.type==='event'&&a.uid===song.uid),true);
 let sung=playEvent(packs,played,song.uid);
 assert.equal(sung.pending.kind,'effect-discard');
 assert.equal(apReady(sung,0),0);
 assertUniversalMatch(packs,sung);
 const second=fresh(ids,1203,1,0,'main');
 for(let i=0;i<4;i++)place(second.s,0,take(second.s,0,'SAO-2-035'),'energy',i,true);
 const host=hold(second.s,0,'SAO-2-031');
 const firstSong=hold(second.s,0,'SAO-2-062');
 const nextSong=hold(second.s,0,'SAO-2-062',['deck','life','outside','removed']);
 let turn=playFront(second.packs,second.s,host.uid);
 assert.equal(apReady(turn,0),1);
 turn=playEvent(second.packs,turn,firstSong.uid);
 assert.equal(turn.pending.kind,'effect-discard');
 assert.equal(apReady(turn,0),1);
 turn=discardAll(second.packs,turn,nextSong.uid);
 if(turn.pending?.kind==='effect-recover-ap')
  turn=use(second.packs,turn,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(apReady(turn,0),1);
 assert.equal(turn.players[0].hand.some(c=>c.uid===nextSong.uid),true);
 turn=playEvent(second.packs,turn,nextSong.uid);
 assert.equal(turn.pending.kind,'effect-discard');
 assert.equal(apReady(turn,0),0);
 conserved(sung);
});

test('SAO-2-031 puts exactly four outside cards on the bottom, then may grant damage 2',()=>{
 const ids=['SAO-2-031','SAO-2-035'];
 const {packs,s}=fresh(ids,2031);
 const yuna=place(s,0,take(s,0,'SAO-2-031'),'front',0,true);
 const survivor=place(s,0,take(s,0,'SAO-2-035'),'front',1,true);
 const outside=[];
 for(let i=0;i<3;i++)outside.push(s.players[0].deck.pop());
 s.players[0].outside.push(...outside);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='outsideBottomDamage'),false);
 outside.push(s.players[0].deck.pop());
 s.players[0].outside.push(outside[3]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===yuna.uid&&a.mode==='outsideBottomDamage'),true);
 let asked=use(packs,s,a=>a.type==='activate'&&a.uid===yuna.uid&&a.mode==='outsideBottomDamage');
 assert.equal(asked.pending.kind,'effect-outside-bottom');
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===null),false);
 assertUniversalMatch(packs,asked);
 aiOk(packs,asked);
 const order=outside.map(c=>c.uid);
 for(const uid of order)asked=use(packs,asked,a=>a.type==='chooseOutsideBottom'&&a.uid===uid);
 assert.equal(asked.pending.kind,'effect-grant-survivor-damage');
 assert.equal(asked.pending.choices.includes(survivor.uid),true);
 assert.equal(asked.pending.choices.includes(yuna.uid),false);
 assert.deepEqual(asked.players[0].deck.slice(-4).map(c=>c.uid),order);
 const skipped=use(packs,structuredClone(asked),a=>a.type==='chooseSurvivorDamage'&&a.uid===null);
 assert.equal(universalAttackDamage(packs,skipped,skipped.players[0].front.find(c=>c?.uid===survivor.uid)),1);
 asked=use(packs,asked,a=>a.type==='chooseSurvivorDamage'&&a.uid===survivor.uid);
 assert.equal(asked.pending,null);
 assert.equal(universalAttackDamage(packs,asked,asked.players[0].front.find(c=>c?.uid===survivor.uid)),2);
 for(let i=0;i<4;i++)asked.players[0].outside.push(asked.players[0].deck.pop());
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===yuna.uid&&a.mode==='outsideBottomDamage'),false);
 conserved(asked);
});

test('Q1203 needs a song this turn and 1 AP before five outside cards raise the BP ceiling',()=>{
 const ids=['SAO-2-036','SAO-2-062','SAO-2-035','SAO-2-028','SAO-2-033'];
 function late(seed){
  const {packs,s}=fresh(ids,seed);
  const turned=reach(packs,s,x=>x.active===0&&x.phase==='main'&&x.players[0].ownTurns>=3,true);
  assert.equal(apReady(turned,0),3);
  for(let i=0;i<4;i++)place(turned,0,take(turned,0,'SAO-2-035'),'energy',i,true);
  const small=place(turned,1,take(turned,1,'SAO-2-028'),'front',0,true);
  const exact=place(turned,1,take(turned,1,'SAO-2-035'),'front',1,true);
  const large=place(turned,1,take(turned,1,'SAO-2-033'),'front',2,true);
  const song=hold(turned,0,'SAO-2-062');
  const kirito=hold(turned,0,'SAO-2-036');
  return {packs,s:turned,song,kirito,small,exact,large};
 }
 function outs(s,n){
  const cards=[];
  for(let i=0;i<n;i++){
   const card=s.players[0].deck.pop();
   s.players[0].outside.push(card);
   cards.push(card);
  }
  return cards;
 }
 function sing(packs,state,song){
  let sung=playEvent(packs,state,song.uid);
  assert.equal(sung.pending.kind,'effect-discard');
  assert.equal(apReady(sung,0),2);
  sung=discardAll(packs,sung);
  assert.equal(sung.pending,null);
  return sung;
 }
 const bare=late(1204);
 outs(bare.s,5);
 let quiet=playFront(bare.packs,bare.s,bare.kirito.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[1].front.some(c=>c?.uid===bare.large.uid),true);
 assert.equal(quiet.players[0].outside.length,5);
 const skipped=late(1205);
 const skippedPile=outs(skipped.s,5);
 let declined=sing(skipped.packs,skipped.s,skipped.song);
 declined=playFront(skipped.packs,declined,skipped.kirito.uid);
 assert.equal(declined.pending.kind,'effect-optional-pay-ap');
 assert.equal(apReady(declined,0),1);
 declined=use(skipped.packs,declined,a=>a.type==='chooseOptionalPayAp'&&a.mode==='skip');
 assert.equal(declined.pending,null);
 assert.equal(skippedPile.every(c=>
  declined.players[0].outside.some(x=>x.uid===c.uid)),true);
 assert.equal(apReady(declined,0),1);
 const low=late(1206);
 const five=outs(low.s,5);
 let paid=sing(low.packs,low.s,low.song);
 paid=playFront(low.packs,paid,low.kirito.uid);
 assertUniversalMatch(low.packs,paid);
 aiOk(low.packs,paid);
 paid=use(low.packs,paid,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(paid.pending.kind,'effect-bottom-retire');
 assert.equal(apReady(paid,0),0);
 assert.equal(legalUniversalActions(low.packs,paid).some(a=>a.uid===null),true);
 let one=use(low.packs,structuredClone(paid),a=>a.type==='chooseBottomRetire'&&a.uid===five[0].uid);
 assert.equal(legalUniversalActions(low.packs,one).some(a=>a.uid===null),false);
 const ceiling=use(low.packs,paid,a=>a.type==='chooseBottomRetire'&&a.uid===null);
 assert.equal(ceiling.pending.kind,'effect-retire-bp');
 assert.equal(ceiling.pending.limit,2000);
 const lowIds=ceiling.pending.choices.map(uid=>cardOf(ceiling,1,uid).cardId).sort();
 assert.deepEqual(lowIds,['SAO-2-028','SAO-2-035']);
 const raised=late(1207);
 const pile=outs(raised.s,5);
 let high=sing(raised.packs,raised.s,raised.song);
 high=playFront(raised.packs,high,raised.kirito.uid);
 high=use(raised.packs,high,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 for(const card of pile)high=use(raised.packs,high,a=>a.type==='chooseBottomRetire'&&a.uid===card.uid);
 assert.equal(high.pending.kind,'effect-retire-bp');
 assert.equal(high.pending.limit,5000);
 assert.deepEqual(high.players[0].deck.slice(-5).map(c=>c.uid),pile.map(c=>c.uid));
 assert.equal(high.pending.choices.includes(raised.large.uid),true);
 high=use(raised.packs,high,a=>a.type==='chooseRetireBp'&&a.uid===raised.large.uid);
 assert.equal(high.players[1].outside.some(c=>c.uid===raised.large.uid),true);
 const short=late(1208);
 let direct=sing(short.packs,short.s,short.song);
 direct=playFront(short.packs,direct,short.kirito.uid);
 direct=use(short.packs,direct,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(direct.pending.kind,'effect-retire-bp');
 assert.equal(direct.pending.limit,2000);
 assert.equal(direct.pending.choices.includes(short.large.uid),false);
 conserved(high);
});

test('SAO-2-036 color trigger deploys one purple energy-2 AP-1 character from outside',()=>{
 const ids=['SAO-2-036','SAO-2-035','SAO-2-033','SAO-1-003'];
 const {packs,s}=fresh(ids,2036,0,1,'attack');
 const trigger=take(s,0,'SAO-2-036');
 s.players[0].life.unshift(trigger);
 const egil=putOutside(s,0,'SAO-2-035');
 const asuna=putOutside(s,0,'SAO-2-033');
 const attacker=place(s,1,take(s,1,'SAO-1-003'),'front',0,true);
 let hit=use(packs,s,a=>a.type==='attack'&&a.uid===attacker.uid);
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:null});
 assert.equal(hit.pending.kind,'life-trigger');
 assert.equal(hit.pending.trigger,'color');
 assert.equal(hit.status,'playing');
 const choices=legalUniversalActions(packs,hit).filter(a=>a.mode==='colorOutside');
 assert.equal(choices.some(a=>a.uid===egil.uid),true);
 assert.equal(choices.some(a=>a.uid===asuna.uid),false);
 hit=use(packs,hit,a=>a.type==='chooseTrigger'&&a.mode==='colorOutside'&&a.uid===egil.uid&&a.line==='front');
 const body=hit.players[0].front.find(c=>c?.uid===egil.uid);
 assert.equal(body.ready,true);
 assert.equal(hit.pending,null);
 assert.equal(hit.players[0].outside.some(c=>c.uid===trigger.uid),true);
 assert.equal(hit.status,'playing');
 conserved(hit);
});
