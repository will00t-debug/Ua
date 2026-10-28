import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {steinsGatePracticeDeck,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalEnergyByColor,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {deckWith,fresh,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const IDS=['STG-1-076','STG-1-080','STG-1-051','STG-1-058','STG-1-074',
 'STG-1-079','STG-1-049','STG-1-041','STG-1-055','STG-1-045'];

function go(s,action,actor=0){
 return dispatchUniversalAction(stgPacks,s,action,{actor});
}
function find(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('Missing legal action');
 return action;
}
function play(s,uid,line){
 return go(s,find(stgPacks,s,a=>a.type==='play'&&a.uid===uid&&a.line===line));
}
function event(s,uid){
 return go(s,find(stgPacks,s,a=>a.type==='event'&&a.uid===uid));
}
function order(s,uids,actor=0){
 for(const uid of uids)s=go(s,{type:'chooseTopOrder',uid},actor);
 return s;
}
function stamp(s,card){
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 return card;
}
function hand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function lifeTop(s,p,id){
 const card=take(s,p,id);
 const life=s.players[p].life;
 const displaced=life[0];
 life[0]=card;
 if(displaced&&displaced.uid!==card.uid)s.players[p].deck.push(displaced);
 return card;
}
function outside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function replay(id){
 const c=stg.cards[id];
 return {
  id:c.id,name:c.name,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:c.gen,trigger:c.trigger,traits:[...(c.traits||[])],
  implementation:c.implementation,effects:JSON.parse(JSON.stringify(c.effects)),
  ...(c.step?{step:true}:{}),
  ...(c.grantStepToOtherOwn?{grantStepToOtherOwn:true}:{}),
  ...(c.attackWinDraw?{attackWinDraw:JSON.parse(JSON.stringify(c.attackWinDraw))}:{}),
  ...(c.phaseEffects?.length?{phaseEffects:JSON.parse(JSON.stringify(c.phaseEffects))}:{}),
  ...(c.mainAbility?{mainAbility:JSON.parse(JSON.stringify(c.mainAbility))}:{}),
  ...(c.emptyOwnFieldHandEnergyDiscount?{
   emptyOwnFieldHandEnergyDiscount:c.emptyOwnFieldHandEnergyDiscount}:{}),
  ...(c.triggerEffect?{triggerEffect:JSON.parse(JSON.stringify(c.triggerEffect))}:{})
 };
}
function fillers(){
 return Array.from({length:12},(_,i)=>({
  id:'F'+i,name:'填料'+i,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}
 }));
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','outside']){
  const index=pl[zone].findIndex(c=>c.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 const life=pl.life.findIndex(c=>c.cardId===id);
 if(life<0)throw Error('Missing '+id);
 const swapped=pl.deck.pop();
 const card=pl.life[life];
 pl.life[life]=swapped;
 return card;
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
function labGo(packs,s,pred,actor=0){
 const action=find(packs,s,pred);
 return dispatchUniversalAction(packs,s,action,{actor});
}

test('batches 21-30 register ten whole prints outside the census',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.filter(c=>c.engineKind).length,80);
 assert.equal(STEINS_GATE_CARDS.filter(c=>!c.engineKind).length,0);
 assert.equal(Object.keys(stg.cards).length,80);
 assert.equal(stg.version,'stg-ua57-full-20261028');
 assert.equal(STEINS_GATE_BY_ID['STG-1-011'].engineKind,'okabeOverflow');
 assert.equal(STEINS_GATE_BY_ID['STG-1-016'].engineKind,'inspectCharacterEntry');
 assert.equal(stg.cards['STG-1-011'].raidName,'岡部 倫太郎');
 assert.equal(stg.cards['STG-1-016'].effects.onPlay[0].op,'inspectTopAnyOutside');
 const kinds={
  'STG-1-076':'kurisuRetire','STG-1-080':'anyReadyAp','STG-1-051':'winDrawMoved',
  'STG-1-058':'attackEndFront','STG-1-074':'madScientist','STG-1-079':'suzuhaAttackDraw',
  'STG-1-049':'dmailSearch','STG-1-041':'differentField','STG-1-055':'eventFrontEnergy',
  'STG-1-045':'grantStep'
 };
 for(const id of IDS){
  assert.equal(STEINS_GATE_BY_ID[id].engineKind,kinds[id]);
  assert.equal(stg.cards[id].name,STEINS_GATE_BY_ID[id].nameJa);
 }
 assert.deepEqual(stg.cards['STG-1-076'].effects.onPlay,[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'牧瀬 紅莉栖',bonusBp:5000,mandatory:true
 }]);
 assert.deepEqual(stg.cards['STG-1-076'].triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(stg.cards['STG-1-080'].effects.onPlay[0],{
  op:'searchTopAnyReadyAp',count:5,name:'フェイリス・ニャンニャン',type:'field'
 });
 assert.equal(stg.cards['STG-1-051'].attackWinDraw.condition.kind,'selfMovedThisTurn');
 assert.equal(stg.cards['STG-1-058'].phaseEffects[0].then[0].op,'mayMoveSelfToFront');
 assert.deepEqual(stg.cards['STG-1-074'].effects.onPlay.map(e=>e.op),
  ['buffOwnCharactersAll','grantPrintedApImpact','drawIfOwnName']);
 assert.equal(stg.cards['STG-1-079'].effects.onPlay[1].op,'grantNamedBuffAttackDraw');
 assert.equal(stg.cards['STG-1-049'].emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(stg.cards['STG-1-049'].effects.onPlay[0].filters.map(f=>f.value),['field','Dメール']);
 assert.equal(stg.cards['STG-1-041'].effects.onPlay[0].op,'retireOwnFieldThenDifferent');
 assert.equal(stg.cards['STG-1-055'].mainAbility.then[0].op,'grantSelfFrontEnergyUntilNextOwnStart');
 assert.equal(stg.cards['STG-1-045'].step,true);
 assert.equal(stg.cards['STG-1-045'].grantStepToOtherOwn,true);
 const practice=steinsGatePracticeDeck();
 assert.equal(v2DeckReport('steins-gate',practice.counts).ok,true);
 const editor=editorV2Status('steins-gate',practice.counts);
 assert.equal(editor.ready,true,editor.issues.join('；'));
 assert.equal(editor.registered,80);
 const blocked=v2DeckReport('steins-gate',{'STG-1-011':4});
 assert.equal(blocked.ok,false);
 const base={id:'X',name:'X',color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}};
 assert.throws(()=>createUniversalPack({id:'vanilla-step',cards:[{
  ...base,step:true,grantStepToOtherOwn:true
 }]}),/vanilla/);
 assert.throws(()=>createUniversalPack({id:'step-miss',cards:[{
  ...base,implementation:'dsl',grantStepToOtherOwn:true
 }]}),/granted STEP/);
 assert.throws(()=>createUniversalPack({id:'bad-any',cards:[{
  ...base,type:'event',bp:0,gen:0,implementation:'dsl',effects:{onPlay:[{
   op:'searchTopAnyReadyAp',count:5,name:'其他',type:'field'
  }]}
 }]}),/unsupported any-card top search/);
});

test('STG-1-076 retires a front character at 3000, or 5000 when Kurisu is present',()=>{
 let none=toPhase(stgPacks,fresh(deckWith(['STG-1-076','STG-1-041']),21076),'main');
 put(none,0,'STG-1-042','energy',0);
 put(none,0,'STG-1-047','energy',1);
 put(none,0,'STG-1-053','energy',2);
 put(none,0,'STG-1-057','energy',3);
 const high=put(none,1,'STG-1-041','front',0);
 const blocked=hand(none,0,'STG-1-076');
 readyAp(none);
 assert.equal(legalUniversalActions(stgPacks,none).some(a=>a.type==='event'&&a.uid===blocked.uid),false);

 let low=toPhase(stgPacks,fresh(deckWith(['STG-1-076','STG-1-041']),21077),'main');
 put(low,0,'STG-1-042','energy',0);
 put(low,0,'STG-1-047','energy',1);
 put(low,0,'STG-1-053','energy',2);
 put(low,0,'STG-1-057','energy',3);
 const legalTarget=put(low,1,'STG-1-001','front',0);
 const stillHigh=put(low,1,'STG-1-041','front',1);
 const source=hand(low,0,'STG-1-076');
 readyAp(low);
 low=event(low,source.uid);
 assert.equal(low.pending.kind,'effect-retire-bp');
 assert.equal(low.pending.limit,3000);
 assert.deepEqual(low.pending.choices,[legalTarget.uid]);
 assert.equal(legalUniversalActions(stgPacks,low).some(a=>a.uid===null),false);
 low=go(low,{type:'chooseRetireBp',uid:legalTarget.uid});
 assert.ok(low.players[1].outside.some(c=>c.uid===legalTarget.uid));
 assert.equal(low.players[1].front[1].uid,stillHigh.uid);
 assert.equal(assertUniversalMatch(stgPacks,low),true);

 let bonus=toPhase(stgPacks,fresh(deckWith(['STG-1-076','STG-1-069','STG-1-041']),21078),'main');
 put(bonus,0,'STG-1-069','energy',0);
 put(bonus,0,'STG-1-042','energy',1);
 put(bonus,0,'STG-1-047','energy',2);
 put(bonus,0,'STG-1-053','energy',3);
 const raised=put(bonus,1,'STG-1-041','front',0);
 const kurisuEvent=hand(bonus,0,'STG-1-076');
 readyAp(bonus);
 bonus=event(bonus,kurisuEvent.uid);
 assert.equal(bonus.pending.limit,5000);
 assert.ok(bonus.pending.choices.includes(raised.uid));
 bonus=go(bonus,{type:'chooseRetireBp',uid:raised.uid});
 assert.ok(bonus.players[1].outside.some(c=>c.uid===raised.uid));

 let life=toPhase(stgPacks,fresh(deckWith(['STG-1-076']),21079),'attack');
 const attacker=put(life,0,'STG-1-001','front',0,true);
 lifeTop(life,1,'STG-1-076');
 life=go(life,find(stgPacks,life,a=>a.type==='attack'&&a.uid===attacker.uid));
 life=go(life,{type:'chooseBlock',uid:null},1);
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'special');
 const special=find(stgPacks,life,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===attacker.uid);
 assert.equal(uiActionLabel(special,{pack:stg,state:life}).includes('不使用'),false);
 life=go(life,special,1);
 assert.ok(life.players[0].outside.some(c=>c.uid===attacker.uid));
 assert.ok(life.players[1].outside.some(c=>c.cardId==='STG-1-076'));
 assert.equal(assertUniversalMatch(stgPacks,life),true);
});

test('STG-1-080 readies an AP only after adding Feiris or a field',()=>{
 const deck=deckWith(['STG-1-080','STG-1-022','STG-1-073']);
 function setup(seed){
  let s=toPhase(stgPacks,fresh(deck,seed),'main');
  put(s,0,'STG-1-042','energy',0);
  put(s,0,'STG-1-047','energy',1);
  const source=hand(s,0,'STG-1-080');
  readyAp(s);
  s.players[0].apCards[0].ready=false;
  return {s,source};
 }
 let feiris=setup(21080);
 const window=top(feiris.s,0,['STG-1-022','STG-1-001','STG-1-007','STG-1-012','STG-1-014']);
 feiris.s=event(feiris.s,feiris.source.uid);
 assert.equal(feiris.s.pending.kind,'effect-top-filter-choice');
 assert.equal(feiris.s.pending.discard,false);
 assert.equal(universalPrivateChoices(stgPacks,feiris.s,1),null);
 feiris.s=go(feiris.s,{type:'chooseTopFiltered',uid:window[0].uid});
 assert.equal(feiris.s.pending.recoverApAfter,true);
 feiris.s=order(feiris.s,feiris.s.pending.uids);
 assert.equal(feiris.s.pending.kind,'effect-recover-ap');
 assert.equal(feiris.s.pending.optional,false);
 assert.equal(legalUniversalActions(stgPacks,feiris.s).some(a=>a.uid===null),false);
 feiris.s=go(feiris.s,{type:'chooseApRecovery',uid:'AP0-0'});
 assert.equal(feiris.s.players[0].apCards[0].ready,true);
 assert.ok(feiris.s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.equal(assertUniversalMatch(stgPacks,feiris.s),true);

 let field=setup(21081);
 const fields=top(field.s,0,['STG-1-073','STG-1-001','STG-1-007','STG-1-012','STG-1-014']);
 field.s=event(field.s,field.source.uid);
 field.s=go(field.s,{type:'chooseTopFiltered',uid:fields[0].uid});
 field.s=order(field.s,field.s.pending.uids);
 assert.equal(field.s.pending.kind,'effect-recover-ap');
 field.s=go(field.s,{type:'chooseApRecovery',uid:'AP0-0'});
 assert.equal(field.s.players[0].apCards[0].ready,true);

 let other=setup(21082);
 const events=top(other.s,0,['STG-1-032','STG-1-001','STG-1-007','STG-1-012','STG-1-014']);
 other.s=event(other.s,other.source.uid);
 other.s=go(other.s,{type:'chooseTopFiltered',uid:events[0].uid});
 other.s=order(other.s,other.s.pending.uids);
 assert.equal(other.s.pending,null);
 assert.equal(other.s.players[0].apCards[0].ready,false);
 assert.ok(other.s.players[0].hand.some(c=>c.uid===events[0].uid));

 let declined=setup(21083);
 const kept=top(declined.s,0,['STG-1-022','STG-1-073','STG-1-001','STG-1-007','STG-1-012']);
 declined.s=event(declined.s,declined.source.uid);
 declined.s=go(declined.s,{type:'chooseTopFiltered',uid:null});
 assert.equal(declined.s.pending.recoverApAfter,undefined);
 declined.s=order(declined.s,kept.map(c=>c.uid));
 assert.equal(declined.s.pending,null);
 assert.equal(declined.s.players[0].apCards[0].ready,false);
 assert.equal(declined.s.players[0].hand.some(c=>kept.some(k=>k.uid===c.uid)),false);
 assert.equal(assertUniversalMatch(stgPacks,declined.s),true);
});

test('STG-1-051 draws for a battle win only after moving between lines this turn',()=>{
 function battle(seed,prepare){
  let s=toPhase(stgPacks,fresh(deckWith(['STG-1-051','STG-1-049']),seed),'start');
  const okabe=stamp(s,put(s,0,'STG-1-051','energy',0,true));
  const defender=put(s,1,'STG-1-042','front',0,true);
  s=prepare(s,okabe);
  lifeTop(s,1,'STG-1-049');
  const before=s.players[0].deck.length;
  s=toPhase(stgPacks,s,'attack');
  s=go(s,find(stgPacks,s,a=>a.type==='attack'&&a.uid===okabe.uid));
  s=go(s,{type:'chooseBlock',uid:defender.uid},1);
  return {s,before,okabe};
 }
 const moved=battle(21051,(s,okabe)=>{
  s=toPhase(stgPacks,s,'move');
  return go(s,find(stgPacks,s,a=>a.type==='move'&&a.uid===okabe.uid));
 });
 assert.equal(moved.s.players[0].deck.length,moved.before-1);
 assert.equal(moved.s.players[0].front.some(c=>c?.uid===moved.okabe.uid),true);
 assert.ok(moved.s.players[1].outside.some(c=>c.cardId==='STG-1-042'));

 let stayed=toPhase(stgPacks,fresh(deckWith(['STG-1-051']),21052),'start');
 const parked=stamp(stayed,put(stayed,0,'STG-1-051','front',0,true));
 const blocker=put(stayed,1,'STG-1-042','front',0,true);
 stayed=toPhase(stgPacks,stayed,'attack');
 const parkedDeck=stayed.players[0].deck.length;
 stayed=go(stayed,find(stgPacks,stayed,a=>a.type==='attack'&&a.uid===parked.uid));
 stayed=go(stayed,{type:'chooseBlock',uid:blocker.uid},1);
 assert.equal(stayed.players[0].deck.length,parkedDeck);
 assert.equal(assertUniversalMatch(stgPacks,stayed),true);

 let played=toPhase(stgPacks,fresh(deckWith(['STG-1-051']),21053),'main');
 put(played,0,'STG-1-042','energy',0);
 put(played,0,'STG-1-047','energy',1);
 const entered=hand(played,0,'STG-1-051');
 const victim=put(played,1,'STG-1-042','front',0,true);
 readyAp(played);
 played=play(played,entered.uid,'front');
 played.players[0].front.find(c=>c.uid===entered.uid).ready=true;
 played=toPhase(stgPacks,played,'attack');
 const playedDeck=played.players[0].deck.length;
 played=go(played,find(stgPacks,played,a=>a.type==='attack'&&a.uid===entered.uid));
 played=go(played,{type:'chooseBlock',uid:victim.uid},1);
 assert.equal(played.players[0].deck.length,playedDeck);

 let open=toPhase(stgPacks,fresh(deckWith(['STG-1-051','STG-1-049']),21054),'start');
 const rusher=stamp(open,put(open,0,'STG-1-051','energy',0,true));
 open=toPhase(stgPacks,open,'move');
 open=go(open,find(stgPacks,open,a=>a.type==='move'&&a.uid===rusher.uid));
 lifeTop(open,1,'STG-1-049');
 open=toPhase(stgPacks,open,'attack');
 const openDeck=open.players[0].deck.length;
 open=go(open,find(stgPacks,open,a=>a.type==='attack'&&a.uid===rusher.uid));
 open=go(open,{type:'chooseBlock',uid:null},1);
 assert.equal(open.players[0].deck.length,openDeck);
 assert.equal(open.players[1].life.length,6);

 let later=toPhase(stgPacks,fresh(deckWith(['STG-1-051']),21055),'start');
 const veteran=stamp(later,put(later,0,'STG-1-051','energy',0,true));
 const raider=put(later,1,'STG-1-042','front',0,true);
 later=toPhase(stgPacks,later,'move');
 later=go(later,find(stgPacks,later,a=>a.type==='move'&&a.uid===veteran.uid));
 later=toPhase(stgPacks,later,'attack');
 later=go(later,{type:'next'});
 assert.equal(later.active,1);
 later=toPhase(stgPacks,later,'attack');
 const laterDeck=later.players[0].deck.length;
 later=go(later,find(stgPacks,later,a=>a.type==='attack'&&a.uid===raider.uid),1);
 later=go(later,{type:'chooseBlock',uid:veteran.uid},0);
 assert.equal(later.players[0].deck.length,laterDeck);
 assert.ok(later.players[1].outside.some(c=>c.uid===raider.uid));
 assert.equal(assertUniversalMatch(stgPacks,later),true);
});

test('STG-1-058 may step from energy to an empty front at the end of its attack',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-058']),21058),'main');
 const mayuri=hand(s,0,'STG-1-058');
 readyAp(s);
 s=play(s,mayuri.uid,'energy');
 s=toPhase(stgPacks,s,'attack');
 s=go(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-self-to-front');
 assert.deepEqual(s.pending.slots,[0,1,2,3]);
 const move=find(stgPacks,s,a=>a.type==='chooseSelfFront'&&a.slot===0);
 assert.equal(uiActionLabel(move,{pack:stg,state:s}),'移動到前線 1');
 assert.equal(uiActionLabel(find(stgPacks,s,a=>a.slot===null),{pack:stg,state:s}),'不移動到前線');
 s=go(s,move);
 assert.equal(s.players[0].front[0].uid,mayuri.uid);
 assert.equal(s.players[0].energy.some(c=>c?.uid===mayuri.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let skip=toPhase(stgPacks,fresh(deckWith(['STG-1-058']),21059),'main');
 const staying=hand(skip,0,'STG-1-058');
 readyAp(skip);
 skip=play(skip,staying.uid,'energy');
 skip=toPhase(stgPacks,skip,'attack');
 skip=go(skip,{type:'next'});
 skip=go(skip,{type:'chooseSelfFront',slot:null});
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].energy.some(c=>c?.uid===staying.uid),true);

 let full=toPhase(stgPacks,fresh(deckWith(['STG-1-058']),21060),'main');
 put(full,0,'STG-1-001','front',0);
 put(full,0,'STG-1-007','front',1);
 put(full,0,'STG-1-012','front',2);
 put(full,0,'STG-1-014','front',3);
 const packed=hand(full,0,'STG-1-058');
 readyAp(full);
 full=play(full,packed.uid,'energy');
 full=toPhase(stgPacks,full,'attack');
 full=go(full,{type:'next'});
 assert.equal(full.pending,null);
 assert.equal(full.players[0].energy.some(c=>c?.uid===packed.uid),true);

 let front=toPhase(stgPacks,fresh(deckWith(['STG-1-058']),21061),'main');
 const already=hand(front,0,'STG-1-058');
 readyAp(front);
 front=play(front,already.uid,'front');
 front=toPhase(stgPacks,front,'attack');
 front=go(front,{type:'next'});
 assert.equal(front.pending,null);
 assert.equal(front.players[0].front.some(c=>c?.uid===already.uid),true);
});

test('STG-1-074 buffs current characters, grants impact 1 to one AP-1 character, and draws for Okabe',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-074','STG-1-052','STG-1-049']),21074),'main');
 put(s,0,'STG-1-042','energy',0);
 put(s,0,'STG-1-047','energy',1);
 put(s,0,'STG-1-053','energy',2);
 const okabe=stamp(s,put(s,0,'STG-1-052','front',0,true));
 const other=stamp(s,put(s,0,'STG-1-001','front',1,true));
 const defender=put(s,1,'STG-1-001','front',0,true);
 lifeTop(s,1,'STG-1-049');
 const source=hand(s,0,'STG-1-074');
 readyAp(s);
 const deck=s.players[0].deck.length;
 s=event(s,source.uid);
 assert.equal(s.pending.kind,'effect-grant-printed-ap');
 assert.equal(s.players[0].deck.length,deck);
 assert.deepEqual(s.pending.choices.slice().sort(),[okabe.uid,other.uid].sort());
 const buffed=uid=>s.players[0].front.find(c=>c.uid===uid);
 assert.equal(buffed(okabe.uid).buffs.some(b=>b.bp===1000&&b.untilTurn===s.turn),true);
 assert.equal(buffed(other.uid).buffs.some(b=>b.bp===1000),true);
 s=go(s,{type:'choosePrintedApImpact',uid:okabe.uid});
 assert.equal(s.players[0].deck.length,deck-1);
 assert.deepEqual(Object.keys(buffed(okabe.uid).impactGranted).sort(),['amount','stamp','turn']);
 assert.equal(buffed(other.uid).impactGranted,undefined);
 const later=hand(s,0,'STG-1-042');
 s=play(s,later.uid,'front');
 const arrived=s.players[0].front.find(c=>c.uid===later.uid);
 assert.equal(arrived.buffs.length,0);
 assert.equal(arrived.impactGranted,undefined);
 s=toPhase(stgPacks,s,'attack');
 s=go(s,find(stgPacks,s,a=>a.type==='attack'&&a.uid===okabe.uid));
 s=go(s,{type:'chooseBlock',uid:defender.uid},1);
 assert.equal(s.players[1].life.length,6);
 assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let declined=toPhase(stgPacks,fresh(deckWith(['STG-1-074','STG-1-052','STG-1-049']),21075),'main');
 put(declined,0,'STG-1-042','energy',0);
 put(declined,0,'STG-1-047','energy',1);
 put(declined,0,'STG-1-053','energy',2);
 const named=stamp(declined,put(declined,0,'STG-1-052','front',0,true));
 const foe=put(declined,1,'STG-1-001','front',0,true);
 lifeTop(declined,1,'STG-1-049');
 const spell=hand(declined,0,'STG-1-074');
 readyAp(declined);
 const before=declined.players[0].deck.length;
 declined=event(declined,spell.uid);
 declined=go(declined,{type:'choosePrintedApImpact',uid:null});
 assert.equal(named.impactGranted,undefined);
 assert.equal(declined.players[0].deck.length,before-1);
 declined=toPhase(stgPacks,declined,'attack');
 declined=go(declined,find(stgPacks,declined,a=>a.type==='attack'&&a.uid===named.uid));
 declined=go(declined,{type:'chooseBlock',uid:foe.uid},1);
 assert.equal(declined.players[1].life.length,7);

 const ap2={id:'AP2',name:'高耗',color:'green',type:'character',energy:0,ap:2,bp:4000,gen:1,
  implementation:'vanilla',effects:{}};
 const field={id:'FLD',name:'場域',color:'green',type:'field',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const battery={id:'BAT',name:'電池',color:'green',type:'character',energy:0,ap:2,bp:1000,gen:4,
  implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-074'),ap2,field,battery],21076);
 let t=toPhase(lab.packs,lab.s,'main');
 const power=pull(t,0,'BAT');
 t.players[0].energy[0]=power;
 const generator=stamp(t,pull(t,0,'F0'));
 t.players[0].front[1]=generator;
 const heavy=stamp(t,pull(t,0,'AP2'));
 t.players[0].front[0]=heavy;
 const area=pull(t,0,'FLD');
 t.players[0].energy[1]=area;
 const spellLab=pull(t,0,'STG-1-074');
 t.players[0].hand.push(spellLab);
 readyAp(t);
 const labDeck=t.players[0].deck.length;
 t=labGo(lab.packs,t,a=>a.type==='event'&&a.uid===spellLab.uid);
 assert.equal(t.pending.kind,'effect-grant-printed-ap');
 assert.deepEqual(t.pending.choices,[generator.uid]);
 const liveHeavy=t.players[0].front.find(c=>c.uid===heavy.uid);
 const liveArea=t.players[0].energy.find(c=>c.uid===area.uid);
 assert.equal(liveHeavy.buffs.some(b=>b.bp===1000),true);
 assert.equal(liveArea.buffs.length,0);
 t=dispatchUniversalAction(lab.packs,t,{type:'choosePrintedApImpact',uid:null},{actor:0});
 const afterHeavy=t.players[0].front.find(c=>c.uid===heavy.uid);
 const afterLight=t.players[0].front.find(c=>c.uid===generator.uid);
 assert.equal(afterHeavy.impactGranted,undefined);
 assert.equal(afterLight.impactGranted,undefined);
 assert.equal(t.players[0].deck.length,labDeck);
 assert.equal(assertUniversalMatch(lab.packs,t),true);
});

test('STG-1-079 draws, then may give Suzuha BP and an attack draw',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-079']),21079),'main');
 put(s,0,'STG-1-047','energy',0);
 put(s,0,'STG-1-053','energy',1);
 put(s,0,'STG-1-057','energy',2);
 const suzuha=stamp(s,put(s,0,'STG-1-042','front',0,true));
 const source=hand(s,0,'STG-1-079');
 readyAp(s);
 const deck=s.players[0].deck.length;
 s=event(s,source.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-grant-named');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='chooseGrantNamed'&&a.uid===null),true);
 s=go(s,{type:'chooseGrantNamed',uid:suzuha.uid});
 const granted=s.players[0].front.find(c=>c.uid===suzuha.uid);
 assert.equal(granted.buffs.some(b=>b.bp===1000),true);
 assert.equal(granted.eventAttackDrawGranted.stamp,granted.fieldEntryStamp);
 s=toPhase(stgPacks,s,'attack');
 const beforeAttack=s.players[0].deck.length;
 s=go(s,find(stgPacks,s,a=>a.type==='attack'&&a.uid===suzuha.uid));
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].deck.length,beforeAttack-1);
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let skipped=toPhase(stgPacks,fresh(deckWith(['STG-1-079']),21080),'main');
 put(skipped,0,'STG-1-047','energy',0);
 put(skipped,0,'STG-1-053','energy',1);
 put(skipped,0,'STG-1-057','energy',2);
 const plain=stamp(skipped,put(skipped,0,'STG-1-042','front',0,true));
 const spell=hand(skipped,0,'STG-1-079');
 readyAp(skipped);
 skipped=event(skipped,spell.uid);
 skipped=go(skipped,{type:'chooseGrantNamed',uid:null});
 assert.equal(plain.eventAttackDrawGranted,undefined);
 skipped=toPhase(stgPacks,skipped,'attack');
 const quiet=skipped.players[0].deck.length;
 skipped=go(skipped,find(stgPacks,skipped,a=>a.type==='attack'&&a.uid===plain.uid));
 assert.equal(skipped.players[0].deck.length,quiet);

 let missing=toPhase(stgPacks,fresh(deckWith(['STG-1-079']),21081),'main');
 put(missing,0,'STG-1-047','energy',0);
 put(missing,0,'STG-1-053','energy',1);
 put(missing,0,'STG-1-057','energy',2);
 const unstamped=put(missing,0,'STG-1-042','front',0,true);
 const lone=hand(missing,0,'STG-1-079');
 readyAp(missing);
 const missingDeck=missing.players[0].deck.length;
 missing=event(missing,lone.uid);
 assert.equal(missing.pending,null);
 assert.equal(missing.players[0].deck.length,missingDeck-1);
 assert.equal(unstamped.eventAttackDrawGranted,undefined);
 assert.equal(assertUniversalMatch(stgPacks,missing),true);
});

test('STG-1-049 discounts an empty field and discards only after adding a field or D-mail',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-049','STG-1-073']),21049),'main');
 const source=hand(s,0,'STG-1-049');
 readyAp(s);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='play'&&a.uid===source.uid),true);
 const window=top(s,0,['STG-1-073','STG-1-001','STG-1-007','STG-1-012']);
 const spare=s.players[0].hand.find(c=>c.uid!==source.uid);
 s=play(s,source.uid,'energy');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 assert.deepEqual(legalUniversalActions(stgPacks,s).filter(a=>a.uid).map(a=>a.uid),[window[0].uid]);
 s=go(s,{type:'chooseTopFiltered',uid:window[0].uid});
 s=order(s,window.slice(1).map(c=>c.uid));
 assert.equal(s.pending.kind,'effect-discard');
 s=go(s,{type:'chooseDiscard',uid:spare.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===spare.uid));
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let priced=toPhase(stgPacks,fresh(deckWith(['STG-1-049']),21050),'main');
 put(priced,0,'STG-1-001','front',0);
 const costly=hand(priced,0,'STG-1-049');
 readyAp(priced);
 assert.equal(legalUniversalActions(stgPacks,priced).some(a=>a.type==='play'&&a.uid===costly.uid),false);

 let declined=toPhase(stgPacks,fresh(deckWith(['STG-1-049','STG-1-073']),21051),'main');
 const again=hand(declined,0,'STG-1-049');
 readyAp(declined);
 const kept=top(declined,0,['STG-1-073','STG-1-001','STG-1-007','STG-1-012']);
 const handBefore=declined.players[0].hand.length;
 declined=play(declined,again.uid,'energy');
 declined=go(declined,{type:'chooseTopFiltered',uid:null});
 declined=order(declined,kept.map(c=>c.uid));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.length,handBefore-1);
 assert.deepEqual(declined.players[0].deck.slice(-4).map(c=>c.uid),kept.map(c=>c.uid));

 const mail={id:'DM',name:'Dメール',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,
  trigger:null,implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-049'),mail],21052);
 let t=toPhase(lab.packs,lab.s,'main');
 const actor=pull(t,0,'STG-1-049');
 const letter=pull(t,0,'DM');
 const rest=['F0','F1','F2'].map(id=>pull(t,0,id));
 t.players[0].deck.unshift(letter,...rest);
 t.players[0].hand.push(actor);
 readyAp(t);
 const discard=t.players[0].hand.find(c=>c.uid!==actor.uid);
 t=labGo(lab.packs,t,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='energy');
 assert.deepEqual(legalUniversalActions(lab.packs,t).filter(a=>a.uid).map(a=>a.uid),[letter.uid]);
 t=dispatchUniversalAction(lab.packs,t,{type:'chooseTopFiltered',uid:letter.uid},{actor:0});
 t=rest.reduce((state,card)=>dispatchUniversalAction(lab.packs,state,
  {type:'chooseTopOrder',uid:card.uid},{actor:0}),t);
 t=dispatchUniversalAction(lab.packs,t,{type:'chooseDiscard',uid:discard.uid},{actor:0});
 assert.ok(t.players[0].hand.some(c=>c.uid===letter.uid));
 assert.equal(assertUniversalMatch(lab.packs,t),true);
});

test('STG-1-041 can retire a field and rest a different green field from outside',()=>{
 const fieldA={id:'FA',name:'甲場域',color:'green',type:'field',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const fieldA2={id:'FA2',name:'甲場域',color:'green',type:'field',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const fieldB={id:'FB',name:'乙場域',color:'green',type:'field',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const blue={id:'BL',name:'藍場域',color:'blue',type:'field',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const gen={id:'GN',name:'產能',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:4,
  implementation:'vanilla',effects:{}};
 const cards=[replay('STG-1-041'),fieldA,fieldA2,fieldB,blue,gen];
 function board(seed){
  const lab=labMatch(cards,seed);
  let s=toPhase(lab.packs,lab.s,'main');
  const generator=pull(s,0,'GN');
  const first=pull(s,0,'FA');
  const second=pull(s,0,'FB');
  const other=pull(s,0,'BL');
  s.players[0].energy[0]=generator;
  s.players[0].energy[1]=first;
  s.players[0].outside.push(second,other);
  const actor=pull(s,0,'STG-1-041');
  s.players[0].hand.push(actor);
  readyAp(s);
  return {lab,s,first,second,other,actor};
 }
 const success=board(21041);
 let s=labGo(success.lab.packs,success.s,a=>a.type==='play'&&a.uid===success.actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-retire-own-field');
 s=dispatchUniversalAction(success.lab.packs,s,{type:'chooseOwnFieldRetire',uid:success.first.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-different-field');
 assert.deepEqual(s.pending.choices,[success.second.uid]);
 assert.equal(s.pending.exceptName,'甲場域');
 const entry=find(success.lab.packs,s,a=>a.type==='chooseDifferentField'&&a.uid===success.second.uid);
 s=dispatchUniversalAction(success.lab.packs,s,entry,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===success.second.uid&&c.ready===false),true);
 assert.ok(s.players[0].outside.some(c=>c.uid===success.first.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===success.other.uid));
 assert.equal(assertUniversalMatch(success.lab.packs,s),true);

 const declined=board(21042);
 let skip=labGo(declined.lab.packs,declined.s,a=>a.type==='play'&&a.uid===declined.actor.uid&&a.line==='front');
 skip=dispatchUniversalAction(declined.lab.packs,skip,{type:'chooseOwnFieldRetire',uid:null},{actor:0});
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].energy.some(c=>c?.uid===declined.first.uid),true);
 assert.ok(skip.players[0].outside.some(c=>c.uid===declined.second.uid));

 const same=board(21043);
 const twin=pull(same.s,0,'FA2');
 same.s.players[0].outside=same.s.players[0].outside.filter(c=>c.uid!==same.second.uid);
 same.s.players[0].deck.push(same.second);
 same.s.players[0].outside.push(twin);
 let stuck=labGo(same.lab.packs,same.s,a=>a.type==='play'&&a.uid===same.actor.uid&&a.line==='front');
 stuck=dispatchUniversalAction(same.lab.packs,stuck,{type:'chooseOwnFieldRetire',uid:same.first.uid},{actor:0});
 assert.equal(stuck.pending,null);
 assert.ok(stuck.players[0].outside.some(c=>c.uid===same.first.uid));
 assert.equal(stuck.players[0].energy.some(c=>c?.uid===twin.uid),false);
});

test('STG-1-055 generates front energy until the next own turn after an event',()=>{
 let idle=toPhase(stgPacks,fresh(deckWith(['STG-1-055']),21055),'main');
 put(idle,0,'STG-1-042','energy',0);
 put(idle,0,'STG-1-047','energy',1);
 const waiting=hand(idle,0,'STG-1-055');
 readyAp(idle);
 idle=play(idle,waiting.uid,'front');
 assert.equal(legalUniversalActions(stgPacks,idle).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);

 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-055','STG-1-080']),21056),'main');
 put(s,0,'STG-1-042','energy',0);
 put(s,0,'STG-1-047','energy',1);
 put(s,0,'STG-1-053','energy',2);
 put(s,0,'STG-1-057','energy',3);
 const moe=hand(s,0,'STG-1-055');
 const used=hand(s,0,'STG-1-080');
 readyAp(s);
 s=play(s,moe.uid,'front');
 assert.equal(universalEnergyByColor(stg,s,0).green,4);
 const looked=top(s,0,['STG-1-001','STG-1-007','STG-1-012','STG-1-014','STG-1-020']);
 s=event(s,used.uid);
 s=go(s,{type:'chooseTopFiltered',uid:null});
 s=order(s,looked.map(c=>c.uid));
 const activate=find(stgPacks,s,a=>a.type==='activate'&&a.uid===moe.uid&&a.mode==='frontOnce');
 assert.equal(uiActionLabel(activate,{pack:stg,state:s}),'起動主要：直到下次我方回合開始，前線也能產生能源');
 s=go(s,activate);
 assert.equal(universalEnergyByColor(stg,s,0).green,5);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===moe.uid),false);
 let guard=0;
 while(!(s.active===1&&s.phase==='start')){
  if(s.pending)throw Error(s.pending.kind);
  s=dispatchUniversalAction(stgPacks,s,{type:'next'});
  if(++guard>6)throw Error('opponent turn');
 }
 assert.equal(universalEnergyByColor(stg,s,0).green,5);
 const seen=s.turn;
 guard=0;
 while(!(s.active===0&&s.phase==='start'&&s.turn>seen)){
  if(s.pending)throw Error(s.pending.kind);
  s=dispatchUniversalAction(stgPacks,s,{type:'next'});
  if(++guard>8)throw Error('own turn');
 }
 assert.equal(s.players[0].front.find(c=>c.uid===moe.uid).frontEnergyUntil,undefined);
 assert.equal(universalEnergyByColor(stg,s,0).green,4);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-045 gives STEP to other own characters on its turn',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-045','STG-1-064']),21045),'start');
 const suzuha=put(s,0,'STG-1-045','front',0,true);
 const ally=put(s,0,'STG-1-064','front',1,true);
 s=toPhase(stgPacks,s,'move');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='step'&&a.uid===suzuha.uid),true);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='step'&&a.uid===ally.uid),true);
 s=go(s,find(stgPacks,s,a=>a.type==='step'&&a.uid===ally.uid));
 assert.equal(s.players[0].energy.some(c=>c?.uid===ally.uid),true);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='step'&&a.uid===suzuha.uid),true);
 s=go(s,find(stgPacks,s,a=>a.type==='step'&&a.uid===suzuha.uid));
 assert.equal(s.players[0].energy.filter(Boolean).length,2);
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 let alone=toPhase(stgPacks,fresh(deckWith(['STG-1-064']),21046),'start');
 const solo=put(alone,0,'STG-1-064','front',0,true);
 alone=toPhase(stgPacks,alone,'move');
 assert.equal(legalUniversalActions(stgPacks,alone).some(a=>a.type==='step'&&a.uid===solo.uid),false);
 assert.equal(legalUniversalActions(stgPacks,alone).some(a=>a.type==='move'&&a.uid===solo.uid),false);

 let energy=toPhase(stgPacks,fresh(deckWith(['STG-1-045','STG-1-064']),21047),'start');
 put(energy,0,'STG-1-045','energy',0,true);
 const front=put(energy,0,'STG-1-064','front',0,true);
 energy=toPhase(stgPacks,energy,'move');
 assert.equal(legalUniversalActions(stgPacks,energy).some(a=>a.type==='step'&&a.uid===front.uid),true);
 energy=go(energy,find(stgPacks,energy,a=>a.type==='step'&&a.uid===front.uid));
 assert.equal(energy.players[0].energy.some(c=>c?.uid===front.uid),true);
 assert.equal(assertUniversalMatch(stgPacks,energy),true);
});
