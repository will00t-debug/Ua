import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalCardEnergy,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// UA56BT/TTG-1-011, 016, 035, 041, 048, 076. Registration plus the scenarios
// below. This is not a full official FAQ certification.
const ttg=createTtgV2Pack();
const ids=['TTG-1-011','TTG-1-016','TTG-1-035','TTG-1-041','TTG-1-048','TTG-1-076',
 'TTG-1-019','TTG-1-063','TTG-1-053','TTG-1-010','TTG-1-054','TTG-1-055','TTG-1-005','TTG-1-028'];
const deck=Object.fromEntries(ids.map(id=>[id,3]));
for(const id of ids.slice(6))deck[id]=4;
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
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}

test('next six TTG cards keep official prints and a legal 50-card deck',()=>{
 assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
 const expect={
  'TTG-1-011':['シモン','green',3,1,2500,1,null,'character'],
  'TTG-1-016':['ニア','green',4,1,2500,2,'active','character'],
  'TTG-1-035':['時空烈断バーストスピニングパンチ','green',5,1,0,0,'special','event'],
  'TTG-1-041':['それが俺達 大グレン団だ!','green',5,1,0,0,'active','event'],
  'TTG-1-048':['キタン','red',2,1,3000,1,'active','character'],
  'TTG-1-076':['ラガン','red',2,1,3000,1,'raid','character']
 };
 const match={
  'TTG-1-011':'能源8以上','TTG-1-016':'最多棄2張','TTG-1-035':'送除外',
  'TTG-1-041':'被選數×1000','TTG-1-048':'DOUBLE BLOCK','TTG-1-076':'牌庫頂2張'
 };
 for(const [id,printed] of Object.entries(expect)){
  const src=TTG_BY_ID[id],card=ttg.cards[id];
  assert.equal(src.number,'UA56BT/'+id);
  assert.ok(src.effect.includes(match[id]));
  assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],printed);
 }
 assert.equal(ttg.cards['TTG-1-011'].passiveBonuses[0].condition.turn,'any');
 assert.equal(ttg.cards['TTG-1-011'].passiveBonuses[0].bp,1500);
 assert.equal(ttg.cards['TTG-1-011'].mainAbility.op,'chooseEnergyModeUntilNextOwnStart');
 assert.deepEqual(ttg.cards['TTG-1-035'].triggerEffect,{op:'retireOppFront'});
 assert.equal(ttg.cards['TTG-1-035'].effects.onPlay[0].op,'removeOppFrontUnderBp');
 assert.deepEqual(ttg.cards['TTG-1-041'].traits,['大グレン団']);
 assert.equal(ttg.cards['TTG-1-048'].effects.onAttack[0].bp,500);
 assert.equal(ttg.cards['TTG-1-076'].raidName,'シモン');
 assert.equal(ttg.cards['TTG-1-076'].enterAlwaysActive,false);
 assert.equal(ttg.cards['TTG-1-076'].mainAbility,null);
 assert.deepEqual(ttg.cards['TTG-1-076'].traits,TTG_BY_ID['TTG-1-076'].traits);
 assert.deepEqual(ttg.cards['TTG-1-076'].effects.onPlay.map(e=>e.op),
  ['searchTopAddOneMillRest','drawDiscard']);
});

test('TTG-011 energy 8 raises BP on either turn, and the main chooses one energy mode until the next own start',()=>{
 const packs=ttg;
 let low=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:11011});
 const quiet=place(low,0,'TTG-1-011','front',0);
 for(let i=0;i<3;i++)place(low,0,'TTG-1-019','energy',i);
 assert.equal(universalBp(packs,low,quiet),2500);
 let high=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:11012});
 const boosted=place(high,0,'TTG-1-011','front',0);
 for(let i=0;i<4;i++)place(high,0,'TTG-1-019','energy',i);
 assert.equal(universalBp(packs,high,boosted),4000);
 high=endTurn(packs,high);
 assert.equal(high.active,1);
 assert.equal(universalBp(packs,high,high.players[0].front.find(c=>c?.uid===boosted.uid)),4000);

 let mode=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:11013});
 const energyCopy=place(mode,0,'TTG-1-011','energy',0);
 const frontCopy=place(mode,0,'TTG-1-011','front',0);
 const third=place(mode,0,'TTG-1-011','front',1);
 mode=toPhase(packs,mode,'main');
 assert.equal(universalCardEnergy(packs,mode,0,live(mode,0,energyCopy.uid)),1);
 mode=go(packs,mode,act(packs,mode,a=>a.type==='activate'&&a.uid===energyCopy.uid&&a.mode==='energyMode'));
 assert.equal(mode.pending.kind,'effect-energy-mode');
 assert.equal(chooseUniversalAiAction(packs,mode,{difficulty:'hard'}).mode,'plus');
 uiActionLabel({type:'chooseEnergyMode',mode:'plus'},{pack:packs,state:mode});
 mode=go(packs,mode,{type:'chooseEnergyMode',mode:'plus'});
 const plus=live(mode,0,energyCopy.uid);
 assert.equal(universalCardEnergy(packs,mode,0,plus),2);
 assert.equal(plus.frontEnergyUntil,undefined);
 assert.ok(!legalUniversalActions(packs,mode).some(a=>a.type==='activate'&&a.uid===energyCopy.uid));
 mode=go(packs,mode,act(packs,mode,a=>a.type==='activate'&&a.uid===frontCopy.uid&&a.mode==='energyMode'));
 assert.equal(chooseUniversalAiAction(packs,mode,{difficulty:'hard'}).mode,'front');
 mode=go(packs,mode,{type:'chooseEnergyMode',mode:'front'});
 const front=live(mode,0,frontCopy.uid);
 assert.equal(universalCardEnergy(packs,mode,0,front),1);
 assert.equal(front.energyPlusUntil,undefined);
 assert.equal(universalPublicView(packs,mode,1).players[0].front.find(c=>c?.uid===frontCopy.uid).produces,1);
 mode=go(packs,mode,act(packs,mode,a=>a.type==='activate'&&a.uid===third.uid&&a.mode==='energyMode'));
 mode=go(packs,mode,{type:'chooseEnergyMode',mode:'plus'});
 assert.equal(universalCardEnergy(packs,mode,0,live(mode,0,third.uid)),0);
 assert.equal(live(mode,0,third.uid).frontEnergyUntil,undefined);
 assert.throws(()=>dispatchUniversalAction(packs,mode,{type:'chooseEnergyMode',mode:'nope'}));
 mode=endTurn(packs,endTurn(packs,mode));
 assert.equal(mode.active,0);assert.equal(mode.phase,'start');
 assert.equal(live(mode,0,energyCopy.uid).energyPlusUntil,undefined);
 assert.equal(live(mode,0,frontCopy.uid).frontEnergyUntil,undefined);
 assert.equal(universalCardEnergy(packs,mode,0,live(mode,0,energyCopy.uid)),1);
 assert.equal(assertUniversalMatch(packs,mode),true);
});

test('TTG-016 discards up to two then draws that many, and the energy-20 REST draw is once per name',()=>{
 const packs=ttg;
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:16016});
 for(let i=0;i<2;i++)place(s,0,'TTG-1-019','energy',i);
 const played=hold(s,0,'TTG-1-016');
 const extras=s.players[0].hand.filter(c=>c.uid!==played.uid).slice(0,2).map(c=>c.uid);
 s=toPhase(packs,s,'main');
 const deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 s=go(packs,s,act(packs,s,a=>a.type==='play'&&a.uid===played.uid&&a.line==='energy'));
 assert.equal(s.pending.kind,'effect-discard-up-to');
 assert.equal(s.pending.max,2);
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'easy'}).uid,null);
 uiActionLabel({type:'chooseDiscardUpTo',uid:null},{pack:packs,state:s});
 const stopped=go(packs,s,{type:'chooseDiscardUpTo',uid:null});
 assert.equal(stopped.players[0].deck.length,deckBefore);
 assert.equal(stopped.players[0].hand.length,handBefore-1);
 assert.equal(stopped.pending,null);
 const one=go(packs,s,{type:'chooseDiscardUpTo',uid:extras[0]});
 assert.equal(one.pending.kind,'effect-discard-up-to');
 const oneDone=go(packs,one,{type:'chooseDiscardUpTo',uid:null});
 assert.equal(oneDone.players[0].deck.length,deckBefore-1);
 assert.ok(oneDone.players[0].outside.some(c=>c.uid===extras[0]));
 assert.equal(oneDone.players[0].hand.length,handBefore-1);
 const both=go(packs,one,{type:'chooseDiscardUpTo',uid:extras[1]});
 assert.equal(both.pending,null);
 assert.equal(both.players[0].deck.length,deckBefore-2);
 assert.equal(both.players[0].hand.length,handBefore-1);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscardUpTo',uid:'0-nope'}));
 assert.equal(assertUniversalMatch(packs,both),true);

 let main=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:16017});
 const gen=place(main,0,'TTG-1-019','energy',0);
 const first=place(main,0,'TTG-1-016','front',0);
 const second=place(main,0,'TTG-1-016','front',1);
 main=toPhase(packs,main,'main');
 assert.ok(!legalUniversalActions(packs,main).some(a=>a.mode==='energyDraw'));
 live(main,0,gen.uid).buffs=[{energy:18,untilTurn:main.turn}];
 assert.ok(universalCardEnergy(packs,main,0,live(main,0,gen.uid))>=20);
 const drawn=main.players[0].deck.length;
 main=go(packs,main,act(packs,main,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='energyDraw'));
 assert.equal(live(main,0,first.uid).ready,false);
 assert.equal(main.players[0].deck.length,drawn-1);
 assert.ok(main.mainReadyOnceByName[0].includes('ニア|energyDraw'));
 assert.ok(!legalUniversalActions(packs,main).some(a=>a.type==='activate'&&a.uid===second.uid));
 assert.equal(assertUniversalMatch(packs,main),true);
});

test('TTG-035 removes a front character, raises the limit for Simon, and blocks an empty choice',()=>{
 const packs=ttg;
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:35035});
 for(let i=0;i<3;i++)place(s,0,'TTG-1-019','energy',i);
 const spell=hold(s,0,'TTG-1-035');
 const layer=take(s,1,'TTG-1-055');
 const low=place(s,1,'TTG-1-048','front',0);
 low.stack=[layer];
 const mid=place(s,1,'TTG-1-028','front',1);
 const high=place(s,1,'TTG-1-028','front',2);
 s=toPhase(packs,s,'main');
 const foe=uid=>s.players[1].front.find(c=>c?.uid===uid);
 foe(high.uid).buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,foe(low.uid)),3000);
 assert.equal(universalBp(packs,s,foe(mid.uid)),4000);
 assert.equal(universalBp(packs,s,foe(high.uid)),6000);
 const played=go(packs,s,act(packs,s,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.destination,'removed');
 assert.deepEqual(played.pending.choices,[low.uid]);
 const removed=go(packs,played,{type:'chooseRetireBp',uid:low.uid});
 assert.ok(removed.players[1].removed.some(c=>c.uid===low.uid));
 assert.ok(!removed.players[1].outside.some(c=>c.uid===low.uid));
 assert.ok(removed.players[1].outside.some(c=>c.uid===layer.uid));
 assert.ok(!removed.turnRetireEvents.some(e=>e.uid===low.uid));
 assert.equal(removed.pending,null);
 assert.equal(assertUniversalMatch(packs,removed),true);

 const simon=place(s,0,'TTG-1-010','front',0);
 const raised=go(packs,s,{type:'event',uid:spell.uid});
 assert.equal(raised.pending.limit,5000);
 assert.deepEqual(raised.pending.choices.slice().sort(),[low.uid,mid.uid].sort());
 assert.ok(!raised.pending.choices.includes(high.uid));
 assert.equal(simon.cardId,'TTG-1-010');

 const blocked=structuredClone(s);
 const own=blocked.players[0].front.findIndex(c=>c?.uid===simon.uid);
 blocked.players[0].outside.push(blocked.players[0].front[own]);
 blocked.players[0].front[own]=null;
 blocked.players[1].outside.push(blocked.players[1].front[0]);
 blocked.players[1].front[0]=null;
 assert.ok(!legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===spell.uid));
 const base=take(blocked,0,'TTG-1-053');
 const carrier=take(blocked,0,'TTG-1-019');
 carrier.ready=true;carrier.fieldEntryStamp=blocked.nextFieldEntryStamp++;
 carrier.stack=[base];blocked.players[0].front[0]=carrier;
 assert.equal(ttg.cards[base.cardId].name,'シモン');
 assert.notEqual(ttg.cards[carrier.cardId].name,'シモン');
 assert.ok(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===spell.uid));
 const fromBase=go(packs,blocked,{type:'event',uid:spell.uid});
 assert.equal(fromBase.pending.limit,5000);
 assert.deepEqual(fromBase.pending.choices,[mid.uid]);
 assert.equal(assertUniversalMatch(packs,fromBase),true);
});

test('TTG-041 scales BP by the number of distinct printed names and can choose zero',()=>{
 const packs=ttg;
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:41041});
 for(let i=0;i<3;i++)place(s,0,'TTG-1-019','energy',i);
 const spell=hold(s,0,'TTG-1-041');
 const nia=place(s,0,'TTG-1-016','front',0);
 const kittan=place(s,0,'TTG-1-048','front',1);
 const yoko=place(s,0,'TTG-1-019','front',2);
 const simon=place(s,0,'TTG-1-011','front',3);
 const same=place(s,0,'TTG-1-053','energy',3);
 s=toPhase(packs,s,'main');
 s=go(packs,s,act(packs,s,a=>a.type==='event'&&a.uid===spell.uid));
 assert.equal(s.pending.kind,'effect-distinct-trait-buff');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'easy'}).uid,null);
 uiActionLabel({type:'chooseDistinctTrait',uid:null},{pack:packs,state:s});
 const none=go(packs,s,{type:'chooseDistinctTrait',uid:null});
 assert.equal(universalBp(packs,none,live(none,0,nia.uid)),2500);
 assert.equal(none.pending,null);
 let three=go(packs,s,{type:'chooseDistinctTrait',uid:nia.uid});
 three=go(packs,three,{type:'chooseDistinctTrait',uid:kittan.uid});
 three=go(packs,three,{type:'chooseDistinctTrait',uid:yoko.uid});
 three=go(packs,three,{type:'chooseDistinctTrait',uid:null});
 assert.equal(universalBp(packs,three,live(three,0,nia.uid)),5500);
 assert.equal(universalBp(packs,three,live(three,0,kittan.uid)),6000);
 assert.equal(universalBp(packs,three,live(three,0,yoko.uid)),5500);
 assert.equal(universalBp(packs,three,live(three,0,simon.uid)),2500);
 const only=go(packs,s,{type:'chooseDistinctTrait',uid:nia.uid});
 const stopped=go(packs,only,{type:'chooseDistinctTrait',uid:null});
 assert.equal(universalBp(packs,stopped,live(stopped,0,nia.uid)),3500);
 assert.equal(universalBp(packs,stopped,live(stopped,0,kittan.uid)),3000);
 const named=go(packs,s,{type:'chooseDistinctTrait',uid:simon.uid});
 assert.ok(!legalUniversalActions(packs,named).some(a=>a.uid===same.uid));
 assert.throws(()=>dispatchUniversalAction(packs,named,{type:'chooseDistinctTrait',uid:same.uid}));
 assert.equal(assertUniversalMatch(packs,three),true);
});

test('TTG-048 grants BP, impact null and double block only on the first own attack',()=>{
 const packs=[ttg,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:48048});
 const kittan=place(s,0,'TTG-1-048','front',0);
 nullLife(s,1,'BLC-1-009');nullLife(s,1,'BLC-1-009');
 s=toPhase(packs,s,'attack');
 s=go(packs,s,{type:'attack',uid:kittan.uid});
 assert.equal(s.attacksThisTurn,1);
 assert.equal(s.pending.kind,'block');
 const granted=live(s,0,kittan.uid);
 assert.equal(universalBp(packs,s,granted),3500);
 assert.equal(granted.impactNullGranted.untilOwnTurnStart,s.players[0].ownTurns+1);
 assert.equal(granted.doubleBlockGranted.stamp,granted.fieldEntryStamp);
 s=go(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending,null);
 live(s,0,kittan.uid).ready=true;
 s=go(packs,s,{type:'attack',uid:kittan.uid});
 assert.equal(s.attacksThisTurn,2);
 assert.equal(s.pending.kind,'block');
 assert.equal(universalBp(packs,s,live(s,0,kittan.uid)),3500);
 assert.equal(live(s,0,kittan.uid).buffs.filter(b=>b.untilOwnTurnStart!==undefined).length,1);
 s=go(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(assertUniversalMatch(packs,s),true);

 let other=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:48049});
 const first=place(other,0,'TTG-1-063','front',0);
 const later=place(other,0,'TTG-1-048','front',1);
 nullLife(other,1,'BLC-1-009');nullLife(other,1,'BLC-1-009');
 other=toPhase(packs,other,'attack');
 other=go(packs,other,{type:'attack',uid:first.uid});
 other=go(packs,other,{type:'chooseBlock',uid:null});
 other.players[0].front.find(c=>c.uid===later.uid).ready=true;
 other=go(packs,other,{type:'attack',uid:later.uid});
 assert.equal(universalBp(packs,other,live(other,0,later.uid)),3000);
 assert.equal(live(other,0,later.uid).impactNullGranted,undefined);
 other=go(packs,other,{type:'chooseBlock',uid:null});
 assert.equal(assertUniversalMatch(packs,other),true);

 let battle=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:48050});
 const blocker=place(battle,0,'TTG-1-048','front',0);
 nullLife(battle,1,'BLC-1-009');
 battle=toPhase(packs,battle,'attack');
 battle=go(packs,battle,{type:'attack',uid:blocker.uid});
 battle=go(packs,battle,{type:'chooseBlock',uid:null});
 battle=endTurn(packs,battle);
 assert.equal(battle.active,1);
 live(battle,0,blocker.uid).ready=true;
 const attacker=place(battle,1,'BLC-1-009','front',0);
 const lives=battle.players[0].life.length;
 battle=toPhase(packs,battle,'attack');
 battle=go(packs,battle,{type:'attack',uid:attacker.uid});
 battle=go(packs,battle,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(live(battle,0,blocker.uid).ready,true);
 assert.ok(battle.players[1].outside.some(c=>c.uid===attacker.uid));
 assert.equal(battle.players[0].life.length,lives);
 assert.equal(battle.pending,null);

 let loss=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:48051});
 const victim=place(loss,0,'TTG-1-048','front',0);
 nullLife(loss,1,'BLC-1-009');
 loss=toPhase(packs,loss,'attack');
 loss=go(packs,loss,{type:'attack',uid:victim.uid});
 loss=go(packs,loss,{type:'chooseBlock',uid:null});
 loss=endTurn(packs,loss);
 live(loss,0,victim.uid).ready=true;
 const heavy=place(loss,1,'BLC-1-009','front',0);
 loss=toPhase(packs,loss,'attack');
 live(loss,1,heavy.uid).buffs=[{bp:1000,untilTurn:loss.turn}];
 const before=loss.players[0].life.length;
 loss=go(packs,loss,{type:'attack',uid:heavy.uid});
 loss=go(packs,loss,{type:'chooseBlock',uid:victim.uid});
 assert.equal(loss.players[0].life.length,before);
 const retired=loss.players[0].outside.find(c=>c.uid===victim.uid);
 assert.ok(retired);
 assert.equal(retired.impactNullGranted,undefined);
 assert.equal(retired.doubleBlockGranted,undefined);
 assert.equal(loss.pending,null);
 assert.equal(assertUniversalMatch(packs,loss),true);

 let expire=newUniversalMatch(packs,{decks:[deck,yellow],first:0,seed:48052});
 const kept=place(expire,0,'TTG-1-048','front',0);
 nullLife(expire,1,'BLC-1-009');
 expire=toPhase(packs,expire,'attack');
 expire=go(packs,expire,{type:'attack',uid:kept.uid});
 expire=go(packs,expire,{type:'chooseBlock',uid:null});
 expire=endTurn(packs,endTurn(packs,expire));
 assert.equal(expire.active,0);assert.equal(expire.phase,'start');
 const back=live(expire,0,kept.uid);
 assert.equal(universalBp(packs,expire,back),3000);
 assert.equal(back.impactNullGranted,undefined);
 assert.equal(back.doubleBlockGranted,undefined);
 assert.equal(assertUniversalMatch(packs,expire),true);
});

test('TTG-076 raids Simon, adds one of the top two, then draws and discards',()=>{
 const packs=ttg;
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:76076});
 for(let i=0;i<2;i++)place(s,0,'TTG-1-063','energy',i);
 const base=place(s,0,'TTG-1-053','front',0);
 const top=hold(s,0,'TTG-1-076');
 const seen=[take(s,0,'TTG-1-054'),take(s,0,'TTG-1-055')];
 s.players[0].deck.unshift(seen[0],seen[1]);
 s=toPhase(packs,s,'main');
 s=go(packs,s,act(packs,s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 const raider=live(s,0,top.uid);
 assert.equal(raider.ready,true);
 assert.equal(raider.stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-top-add-one');
 assert.deepEqual(s.pending.uids,seen.map(c=>c.uid));
 const mine=universalPrivateChoices(packs,s,0);
 assert.equal(mine.options.length,2);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 uiActionLabel({type:'chooseTopAddOne',uid:seen[0].uid},{pack:packs,state:s});
 const chosen=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 s=go(packs,s,chosen);
 assert.ok(s.players[0].hand.some(c=>c.uid===chosen.uid));
 const rest=seen.map(c=>c.uid).find(uid=>uid!==chosen.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===rest));
 assert.equal(s.pending.kind,'effect-discard');
 const discard=s.players[0].hand[0];
 s=go(packs,s,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(assertUniversalMatch(packs,s),true);

 let one=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:76077});
 for(let i=0;i<2;i++)place(one,0,'TTG-1-063','energy',i);
 const baseOne=place(one,0,'TTG-1-053','front',0);
 const raidOne=hold(one,0,'TTG-1-076');
 const only=one.players[0].deck[0];
 while(one.players[0].deck.length>1)one.players[0].outside.push(one.players[0].deck.pop());
 one=toPhase(packs,one,'main');
 one=go(packs,one,act(packs,one,a=>a.type==='raid'&&a.uid===raidOne.uid&&a.baseUid===baseOne.uid));
 assert.equal(one.pending?.kind,'effect-discard');
 assert.ok(one.players[0].hand.some(c=>c.uid===only.uid));
 assert.equal(one.status,'playing');
 one=go(packs,one,{type:'chooseDiscard',uid:one.players[0].hand[0].uid});
 assert.equal(assertUniversalMatch(packs,one),true);

 let empty=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:76078});
 for(let i=0;i<2;i++)place(empty,0,'TTG-1-063','energy',i);
 const baseEmpty=place(empty,0,'TTG-1-053','front',0);
 const raidEmpty=hold(empty,0,'TTG-1-076');
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 empty.players[0].outside.push(...empty.players[0].hand.filter(c=>c.uid!==raidEmpty.uid));
 empty.players[0].hand=empty.players[0].hand.filter(c=>c.uid===raidEmpty.uid);
 empty=toPhase(packs,empty,'main');
 empty=go(packs,empty,act(packs,empty,a=>a.type==='raid'&&a.uid===raidEmpty.uid&&a.baseUid===baseEmpty.uid));
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length,0);
 assert.equal(empty.status,'playing');
 assert.equal(assertUniversalMatch(packs,empty),true);
});
