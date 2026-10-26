import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA56BT/TTG-1-057, 071, 054, 055, 026, 081. Registration plus the scenarios
// below. This is not a full official FAQ certification.
const ttg=createTtgV2Pack();
const ids=['TTG-1-057','TTG-1-071','TTG-1-054','TTG-1-055','TTG-1-026','TTG-1-081',
 'TTG-1-053','TTG-1-063','TTG-1-015','TTG-1-005','TTG-1-010','TTG-1-014',
 'TTG-1-018','TTG-1-028','TTG-1-019','TTG-1-022'];
const deck=Object.fromEntries(ids.map(id=>[id,3]));
deck['TTG-1-053']=4;deck['TTG-1-063']=4;
const bleach=registeredV2TitlePack('bleach');
function bleachDeck(){
 const rest=Object.values(bleach.cards).filter(c=>c.type==='character'&&c.color==='yellow'&&
  c.id!=='BLC-1-009'&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const chosen=['BLC-1-009',...rest.slice(0,12)];
 assert.equal(chosen.length,13);
 const counts=Object.fromEntries(chosen.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const yellow=bleachDeck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const c=take(s,p,id);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function act(packs,s,pred){
 const found=legalUniversalActions(packs,s).find(pred);
 assert.ok(found,s.phase+' '+(s.pending?.kind||''));
 return found;
}
function go(packs,s,action){
 const before=structuredClone(s);
 const next=dispatchUniversalAction(packs,s,action);
 assert.deepEqual(s,before,'pure reducer');
 return next;
}
function toPhase(packs,s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++)s=go(packs,s,act(packs,s,a=>a.type==='next'));
 assert.equal(s.phase,phase);return s;
}
function endTurn(packs,s){
 s=toPhase(packs,s,'attack');
 return go(packs,s,act(packs,s,a=>a.type==='next'));
}
function nullLife(s,p,id){
 const card=take(s,p,id),old=s.players[p].life.pop();
 s.players[p].life.unshift(card);if(old)s.players[p].deck.push(old);
}

test('six TTG batches keep official prints and a legal 50-card deck',()=>{
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 const expect={
  'TTG-1-057':['ダヤッカ','red',3,1,3000,2,null,'character'],
  'TTG-1-071':['キングキタンDX','red',4,1,4000,1,'raid','character'],
  'TTG-1-054':['シモン','red',2,1,2500,1,null,'character'],
  'TTG-1-055':['シモン','red',1,1,2000,1,null,'character'],
  'TTG-1-026':['ロシウ','green',2,1,2000,1,'draw','character'],
  'TTG-1-081':['ギガドリルブレイク','red',4,1,0,0,'special','event']
 };
 for(const [id,printed] of Object.entries(expect)){
  const src=TTG_BY_ID[id],card=ttg.cards[id];
  assert.equal(src.number,'UA56BT/'+id.replace('TTG','TTG'));
  assert.ok(src.effect.includes(card.id==='TTG-1-057'?'給予 IMPACT 無效':
   card.id==='TTG-1-071'?'第一次攻擊':card.id==='TTG-1-054'?'牌庫20張以下':
   card.id==='TTG-1-055'?'至多2張送場外':card.id==='TTG-1-026'?'アークグレン':'BP5000以下'));
  assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],printed);
 }
 assert.equal(ttg.cards['TTG-1-057'].impactNull,true);
 assert.equal(ttg.cards['TTG-1-057'].effects.onPlay[0].op,'grantImpactNullUntilNextOwnStart');
 assert.equal(ttg.cards['TTG-1-071'].raidName,'キタン');
 assert.equal(ttg.cards['TTG-1-071'].enterAlwaysActive,false);
 assert.equal(ttg.cards['TTG-1-071'].effects.onAttack[0].op,'buffOtherIfFirstAttack');
 assert.equal(ttg.cards['TTG-1-054'].passiveBonuses[0].impactNull,true);
 assert.equal(ttg.cards['TTG-1-054'].passiveBonuses[0].bp,1500);
 assert.deepEqual(ttg.cards['TTG-1-081'].triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(ttg.cards['TTG-1-081'].effects.onPlay[0].bonusNames,['シモン','カミナ']);
});

test('TTG-057 printed IMPACT null blocks impact, and the onPlay grant does too until the next own start',()=>{
 const packs=[ttg,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:57057});
 const blocker=place(s,0,'TTG-1-057','front',0);
 s=endTurn(packs,s);
 const attacker=place(s,1,'BLC-1-009','front',0);
 const lives=s.players[0].life.length;
 s=toPhase(packs,s,'attack');
 s=go(packs,s,{type:'attack',uid:attacker.uid});
 s=go(packs,s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(s.players[0].life.length,lives);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.find(c=>c.uid===blocker.uid).impactNullGranted,undefined);
 assert.equal(assertUniversalMatch(packs,s),true);

 let g=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:57058});
 for(let i=0;i<3;i++)place(g,0,'TTG-1-053','energy',i);
 const ally=place(g,0,'TTG-1-063','front',0);
 const source=hold(g,0,'TTG-1-057');
 g=toPhase(packs,g,'main');
 g=go(packs,g,act(packs,g,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 assert.equal(g.pending.kind,'effect-grant-impact-null');
 assert.ok(!g.pending.choices.includes(source.uid));
 assert.equal(chooseUniversalAiAction(packs,g,{difficulty:'easy'}).uid,null);
 const granted=go(packs,g,act(packs,g,a=>a.type==='chooseImpactNullGrant'&&a.uid===ally.uid));
 const marked=granted.players[0].front.find(c=>c.uid===ally.uid);
 assert.equal(marked.impactNullGranted.untilOwnTurnStart,granted.players[0].ownTurns+1);
 assert.equal(marked.impactNullGranted.stamp,marked.fieldEntryStamp);
 assert.throws(()=>dispatchUniversalAction(packs,g,{type:'chooseImpactNullGrant',uid:'0-nope'}));
 const skipped=go(packs,g,{type:'chooseImpactNullGrant',uid:null});
 assert.equal(skipped.players[0].front.find(c=>c.uid===ally.uid).impactNullGranted,undefined);
 uiActionLabel({type:'chooseImpactNullGrant',uid:null},{pack:packs,state:g});

 let battle=endTurn(packs,granted);
 const foe=place(battle,1,'BLC-1-009','front',0);
 const before=battle.players[0].life.length;
 battle=toPhase(packs,battle,'attack');
 battle=go(packs,battle,{type:'attack',uid:foe.uid});
 battle=go(packs,battle,{type:'chooseBlock',uid:ally.uid});
 assert.equal(battle.players[0].life.length,before);
 assert.equal(battle.pending,null);
 const retired=battle.players[0].outside.find(c=>c.uid===ally.uid);
 assert.ok(retired);assert.equal(retired.impactNullGranted,undefined);
 assert.equal(assertUniversalMatch(packs,battle),true);

 let expire=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:57059});
 for(let i=0;i<3;i++)place(expire,0,'TTG-1-053','energy',i);
 const kept=place(expire,0,'TTG-1-063','front',0);
 const played=hold(expire,0,'TTG-1-057');
 expire=toPhase(packs,expire,'main');
 expire=go(packs,expire,act(packs,expire,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'));
 expire=go(packs,expire,{type:'chooseImpactNullGrant',uid:kept.uid});
 expire=endTurn(packs,endTurn(packs,expire));
 assert.equal(expire.active,0);assert.equal(expire.phase,'start');
 assert.equal(expire.players[0].front.find(c=>c?.uid===kept.uid).impactNullGranted,undefined);
 assert.equal(assertUniversalMatch(packs,expire),true);
});

test('TTG-071 Raid enters ACTIVE and buffs another character only on the first attack',()=>{
 const packs=[ttg,ttg];
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:57071});
 for(let i=0;i<4;i++)place(s,0,'TTG-1-053','energy',i);
 const base=place(s,0,'TTG-1-005','front',0);
 const ally=place(s,0,'TTG-1-063','front',1);
 const top=hold(s,0,'TTG-1-071');
 nullLife(s,1,'TTG-1-054');nullLife(s,1,'TTG-1-055');
 s=toPhase(packs,s,'main');
 s=go(packs,s,act(packs,s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 const raider=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.equal(raider.ready,true);
 assert.equal(raider.stack[0].uid,base.uid);
 assert.equal(s.pending,null);
 s=toPhase(packs,s,'attack');
 s=go(packs,s,{type:'attack',uid:top.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.attacksThisTurn,1);
 s=go(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c.uid===ally.uid)),3000);
 assert.equal(s.pending.kind,'block');
 s=go(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending,null);
 s.players[0].front.find(c=>c.uid===top.uid).ready=true;
 s=go(packs,s,{type:'attack',uid:top.uid});
 assert.equal(s.attacksThisTurn,2);
 assert.equal(s.pending.kind,'block');
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c.uid===ally.uid)),3000);
 s=go(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('TTG-054 own-turn BP follows Nia and a deck of at most 20, and the mill is optional',()=>{
 const packs=[ttg,ttg];
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:57054});
 const nia=place(s,0,'TTG-1-015','front',0);
 for(let i=0;i<2;i++)place(s,0,'TTG-1-053','energy',i);
 const source=hold(s,0,'TTG-1-054');
 s=toPhase(packs,s,'main');
 const deckBefore=s.players[0].deck.length;
 s=go(packs,s,act(packs,s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy'));
 assert.equal(s.pending.kind,'effect-optional-mill');
 const skipped=go(packs,s,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(skipped.players[0].deck.length,deckBefore);
 const milled=go(packs,s,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(milled.players[0].deck.length,deckBefore-1);
 assert.equal(milled.players[0].outside.at(-1).uid,s.players[0].deck[0].uid);
 let live=skipped;
 while(live.players[0].deck.length>20)live.players[0].outside.push(live.players[0].deck.pop());
 const simon=live.players[0].energy.find(c=>c?.uid===source.uid);
 assert.equal(universalBp(packs,live,simon),4000);
 const other=structuredClone(live);other.active=1;
 assert.equal(universalBp(packs,other,other.players[0].energy.find(c=>c.uid===source.uid)),2500);
 const gone=structuredClone(live);
 const slot=gone.players[0].front.findIndex(c=>c?.uid===nia.uid);
 gone.players[0].outside.push(gone.players[0].front[slot]);gone.players[0].front[slot]=null;
 assert.equal(universalBp(packs,gone,gone.players[0].energy.find(c=>c.uid===source.uid)),2500);
 const over=structuredClone(live);
 over.players[0].deck.push(over.players[0].outside.pop());
 assert.equal(over.players[0].deck.length,21);
 assert.equal(universalBp(packs,over,over.players[0].energy.find(c=>c.uid===source.uid)),2500);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('TTG-055 mills up to two, then discards to recover only those cards',()=>{
 const packs=[ttg,ttg];
 function open(seed){
  let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed});
  place(s,0,'TTG-1-053','energy',0);
  const source=hold(s,0,'TTG-1-055');
  s=toPhase(packs,s,'main');
  s=go(packs,s,act(packs,s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
  return s;
 }
 let stop=open(57055);
 assert.equal(stop.pending.kind,'effect-mill-up-to');
 assert.equal(chooseUniversalAiAction(packs,stop,{difficulty:'easy'}).mode,'stop');
 assert.equal(chooseUniversalAiAction(packs,stop,{difficulty:'normal'}).mode,'mill');
 const deckSize=stop.players[0].deck.length;
 stop=go(packs,stop,{type:'chooseMillUpTo',mode:'stop'});
 assert.equal(stop.pending,null);
 assert.equal(stop.players[0].deck.length,deckSize);
 uiActionLabel({type:'chooseMillUpTo',mode:'stop'},{pack:packs,state:open(57056)});

 let one=open(57061);
 const first=one.players[0].deck[0].uid;
 one=go(packs,one,{type:'chooseMillUpTo',mode:'mill'});
 one=go(packs,one,{type:'chooseMillUpTo',mode:'stop'});
 assert.equal(one.pending.kind,'effect-mill-recover-discard');
 one=go(packs,one,{type:'chooseMillDiscard',uid:null});
 assert.equal(one.pending,null);
 assert.ok(one.players[0].outside.some(c=>c.uid===first));
 assert.ok(!one.players[0].hand.some(c=>c.uid===first));

 let two=open(57062);
 const milled=[two.players[0].deck[0].uid,two.players[0].deck[1].uid];
 two=go(packs,two,{type:'chooseMillUpTo',mode:'mill'});
 two=go(packs,two,{type:'chooseMillUpTo',mode:'mill'});
 assert.equal(two.pending.kind,'effect-mill-recover-discard');
 const discard=two.players[0].hand[0].uid;
 two=go(packs,two,{type:'chooseMillDiscard',uid:discard});
 assert.equal(two.pending.kind,'effect-mill-recover');
 assert.deepEqual(two.pending.choices,milled);
 assert.throws(()=>dispatchUniversalAction(packs,two,{type:'chooseMillRecover',uid:discard}));
 two=go(packs,two,{type:'chooseMillRecover',uid:milled[0]});
 assert.ok(two.players[0].hand.some(c=>c.uid===milled[0]));
 assert.ok(two.players[0].outside.some(c=>c.uid===milled[1]));
 assert.ok(two.players[0].outside.some(c=>c.uid===discard));
 assert.equal(two.pending,null);
 assert.equal(assertUniversalMatch(packs,two),true);

 let empty=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:57063});
 place(empty,0,'TTG-1-053','energy',0);
 const bare=hold(empty,0,'TTG-1-055');
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 empty=toPhase(packs,empty,'main');
 empty=go(packs,empty,act(packs,empty,a=>a.type==='play'&&a.uid===bare.uid&&a.line==='front'));
 assert.equal(empty.pending,null);
});

test('TTG-026 top 7 misses アークグレン and orders every inspected card to bottom',()=>{
 const packs=[ttg,ttg];
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:57026});
 place(s,0,'TTG-1-019','energy',0);
 const source=hold(s,0,'TTG-1-026');
 s=toPhase(packs,s,'main');
 s=go(packs,s,act(packs,s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['top','outside']);
 const hand=s.players[0].hand.map(c=>c.uid);
 const top=s.players[0].deck.slice(0,7).map(c=>c.uid);
 assert.equal(top.length,7);
 let looked=go(packs,s,{type:'chooseEffectMode',mode:'top'});
 assert.equal(looked.pending.kind,'effect-top-order');
 assert.deepEqual(looked.pending.uids,top);
 while(looked.pending?.kind==='effect-top-order')
  looked=go(packs,looked,legalUniversalActions(packs,looked)[0]);
 assert.deepEqual(looked.players[0].hand.map(c=>c.uid),hand);
 assert.deepEqual(looked.players[0].deck.slice(-7).map(c=>c.uid),top);
 assert.equal(assertUniversalMatch(packs,looked),true);
 const outside=go(packs,s,{type:'chooseEffectMode',mode:'outside'});
 assert.equal(outside.pending,null);
 assert.deepEqual(outside.players[0].hand.map(c=>c.uid),hand);
});

test('TTG-081 retires BP 3000, or 5000 when Simon is on the field or the raid base',()=>{
 const packs=[ttg,ttg];
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:57081});
 for(let i=0;i<4;i++)place(s,0,'TTG-1-063','energy',i);
 const spell=hold(s,0,'TTG-1-081');
 const low=place(s,1,'TTG-1-057','front',0);
 const mid=place(s,1,'TTG-1-071','front',1);
 const high=place(s,1,'TTG-1-071','front',2);
 const over=place(s,1,'TTG-1-071','front',3);
 s=toPhase(packs,s,'main');
 const live=uid=>s.players[1].front.find(c=>c?.uid===uid);
 live(high.uid).buffs=[{bp:1000,untilTurn:s.turn}];
 live(over.uid).buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,live(low.uid)),3000);
 assert.equal(universalBp(packs,s,live(mid.uid)),4000);
 assert.equal(universalBp(packs,s,live(high.uid)),5000);
 assert.equal(universalBp(packs,s,live(over.uid)),6000);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===spell.uid));
 let played=go(packs,s,act(packs,s,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.deepEqual(played.pending.choices,[low.uid]);
 assert.ok(!legalUniversalActions(packs,played).some(a=>a.uid===null));
 played=go(packs,played,{type:'chooseRetireBp',uid:low.uid});
 assert.ok(played.players[1].outside.some(c=>c.uid===low.uid));
 assert.equal(played.pending,null);

 const simon=place(s,0,'TTG-1-010','front',0);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===spell.uid));
 const raised=go(packs,s,{type:'event',uid:spell.uid});
 assert.deepEqual(raised.pending.choices.slice().sort(),[low.uid,mid.uid,high.uid].sort());
 assert.ok(!raised.pending.choices.includes(over.uid));

 const blocked=structuredClone(s);
 for(const line of ['front','energy'])for(let i=0;i<4;i++){
  const c=blocked.players[1][line][i];
  if(c&&c.uid!==mid.uid&&c.uid!==over.uid){
   blocked.players[1].outside.push(c);blocked.players[1][line][i]=null;
  }
 }
 const ownSimon=blocked.players[0].front.findIndex(c=>c?.uid===simon.uid);
 blocked.players[0].outside.push(blocked.players[0].front[ownSimon]);
 blocked.players[0].front[ownSimon]=null;
 assert.ok(!legalUniversalActions(packs,blocked).some(a=>a.type==='event'));
 const base=take(blocked,0,'TTG-1-010');
 const top=take(blocked,0,'TTG-1-028');
 top.ready=true;top.fieldEntryStamp=blocked.nextFieldEntryStamp++;
 top.stack=[base];blocked.players[0].front[0]=top;
 assert.equal(ttg.cards[base.cardId].name,'シモン');
 assert.notEqual(ttg.cards[top.cardId].name,'シモン');
 assert.ok(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===spell.uid));
 const fromBase=go(packs,blocked,{type:'event',uid:spell.uid});
 assert.deepEqual(fromBase.pending.choices,[mid.uid]);
 assert.equal(fromBase.pending.limit,5000);
 assert.equal(assertUniversalMatch(packs,fromBase),true);
});
