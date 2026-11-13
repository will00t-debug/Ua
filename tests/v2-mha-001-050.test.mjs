import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {MHA_PROGRAMS_001_050} from '../dist/universal-v2/mha/programs-001-050.mjs';
import {MHA_REQUESTS_001_050} from '../dist/universal-v2/mha/requests-001-050.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor, MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack, validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalBp, universalEnergyByColor,
 universalImpactNull} from '../dist/universal-v2/engine.mjs';

const READY=[
 'MHA-1-008','MHA-1-015','MHA-1-016','MHA-1-021','MHA-1-022',
 'MHA-1-024','MHA-1-028','MHA-1-032','MHA-1-034','MHA-1-036','MHA-1-037',
 'MHA-1-039','MHA-1-040','MHA-1-041','MHA-1-043','MHA-1-046','MHA-1-047',
 'MHA-1-049','MHA-1-050'
];
const STANDARD_TRIGGER={
 active:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
 get:'【ゲット】このカードを手札に加える。',
 draw:'【ドロー】カードを1枚引く。',
 final:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。',
 color:'【カラー】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。'
};
const pack=createMhaV2Pack();
const packs=[pack,pack];

function probePack(){
 const cards=MHA_CATALOG.map(card=>mhaBattleCard(card,mhaProgramFor(card.id))).filter(Boolean);
 cards.push({
  id:'PROBE-IMPACT', name:'衝撃探針', color:'red', type:'character', energy:0,
  ap:1, bp:4000, gen:1, trigger:null, traits:[], implementation:'dsl', printedImpact:1
 });
 cards.push({
  id:'PROBE-TALL', name:'高BP探針', color:'red', type:'character', energy:0,
  ap:1, bp:3500, gen:1, trigger:null, traits:[], implementation:'vanilla'
 });
 return createUniversalPack({id:'mha-probe', cards, version:'mha-c-probe'});
}
const probe=probePack();
const probePacks=[probe,probe];

function deck(source, extra={}){
 const counts={...extra};
 const limited=new Set(['special','color','final']);
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 for(const card of Object.values(source.cards).sort((a,b)=>a.id<b.id?-1:1)){
  if(counts[card.id]||total>=50)continue;
  const n=Math.min(limited.has(card.trigger)?1:2,50-total);
  counts[card.id]=n;
  total+=n;
 }
 for(const card of Object.values(source.cards).filter(c=>!limited.has(c.trigger)).sort((a,b)=>a.id<b.id?-1:1)){
  if(total>=50)break;
  const add=Math.min(4-counts[card.id],50-total);
  counts[card.id]+=add;
  total+=add;
 }
 assert.equal(total,50,source.id+' deck length');
 assert.deepEqual(validateUniversalDeck(source,counts),[]);
 return counts;
}
function fresh(source=pack, seed=10){
 const pair=source===pack?packs:probePacks;
 return newUniversalMatch(pair,{decks:[deck(source),deck(source)], seed, first:0});
}
const pairs=new WeakMap();
function use(s,action){
 const pair=pairs.get(s)||packs;
 const next=dispatchUniversalAction(pair,s,action);
 pairs.set(next,pair);
 return next;
}
function acts(s){return legalUniversalActions(pairs.get(s)||packs,s);}
function open(source, seed){
 const s=fresh(source, seed);
 pairs.set(s,source===pack?packs:probePacks);
 return s;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function topLife(s,p,id){
 const card=take(s,p,id);
 const displaced=s.players[p].life[0];
 s.players[p].life[0]=card;
 s.players[p].deck.push(displaced);
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' from '+s.phase);
 }
 return s;
}
function findAct(s,pred,label){
 const action=acts(s).find(pred);
 assert.ok(action,label+' missing; pending='+(s.pending?.kind||'none')+' phase='+s.phase);
 return action;
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function attackUnblocked(s){
 s=use(s,findAct(s,a=>a.type==='attack','attack'));
 if(s.pending?.kind==='block')
  s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid===null,'decline block'));
 return s;
}

test('catalog is the official UA10BT 001-050 list and nothing beyond it',()=>{
 assert.equal(MHA_CATALOG.length,50);
 assert.deepEqual(MHA_CATALOG.map(c=>c.id),Array.from({length:50},(_,i)=>'MHA-1-'+String(i+1).padStart(3,'0')));
 for(const card of MHA_CATALOG){
  assert.equal(card.battleReady,false);
  assert.equal(card.auto,false);
  assert.equal(card.deckLegal,true);
  assert.equal(card.set,'UA10BT');
  assert.equal(card.name,card.nameJa);
  assert.match(card.image,/UA10BT_MHA-1-\d\d\d\.png$/);
  assert.match(card.source,/card_no=UA10BT%2FMHA-1-\d\d\d$/);
  assert.ok(card.effectJa.trim());
 }
 assert.equal(MHA_CATALOG.find(c=>c.id==='MHA-1-002').faq.some(f=>f.id==='Q421'),true);
 assert.deepEqual(MHA_CATALOG.find(c=>c.id==='MHA-1-024').traits,['死穢八斎會']);
});

test('only a fully matched program is ready, and official play stays closed',()=>{
 const ids=MHA_CATALOG.map(c=>c.id);
 assert.deepEqual(Object.keys(MHA_PROGRAMS_001_050).sort(),[...READY].sort());
 const pending=ids.filter(id=>!READY.includes(id)&&id!=='MHA-1-044');
 assert.deepEqual(Object.keys(MHA_REQUESTS_001_050).sort(),pending.sort());
 for(const id of pending){
  const request=MHA_REQUESTS_001_050[id];
  assert.equal(request.needs,'A');
  assert.ok(request.whyNotEnough.length>12);
  assert.equal(pack.cards[id],undefined);
 }
 assert.equal(pack.cards['MHA-1-044'].mainAbility.op,'restSelfGainEnergyRetireEndMain');
 for(const id of READY)assert.equal(pack.cards[id].id,id);
 for(const id of READY){
  const printed=MHA_CATALOG.find(c=>c.id===id);
  const battle=pack.cards[id];
  assert.equal(battle.name,printed.nameJa);
  assert.equal(battle.color,printed.color);
  assert.equal(battle.energy,printed.energy);
  assert.equal(battle.bp,printed.bp);
  assert.equal(battle.ap,printed.ap);
  assert.equal(battle.trigger||'',printed.trigger||'');
  assert.equal(printed.triggerTextJa,printed.trigger?STANDARD_TRIGGER[printed.trigger]:'');
 }
 const official=officialV2Pack('mha');
 assert.equal(official.id,'mha');
 assert.equal(official.cards['MHA-1-001'],undefined);
 const closed=v2DeckReport('mha',{'MHA-1-008':4});
 assert.equal(closed.ok,false);
 assert.match(closed.issues.join('\n'),/尚未開放正式對戰/);
 assert.match(MHA_OFFICIAL_MATCH_CLOSED,/尚未開放正式對戰/);
});

test('008 get trigger adds that life card to hand and can be declined',()=>{
 let s=open(probe,108);
 put(s,0,'PROBE-IMPACT','front',0,true);
 const shigaraki=topLife(s,1,'MHA-1-008');
 s=toPhase(s,'attack');
 s=attackUnblocked(s);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'get');
 s=use(s,findAct(s,a=>a.type==='chooseTrigger'&&a.mode==='get','get'));
 assert.equal(s.players[1].hand.some(c=>c.uid===shigaraki.uid),true);
 assert.equal(assertUniversalMatch(probePacks,s),true);

 let skipped=open(probe,109);
 put(skipped,0,'PROBE-IMPACT','front',0,true);
 const declined=topLife(skipped,1,'MHA-1-008');
 skipped=toPhase(skipped,'attack');
 skipped=attackUnblocked(skipped);
 skipped=use(skipped,findAct(skipped,a=>a.type==='chooseTrigger'&&a.mode==='skip','skip'));
 assert.equal(skipped.players[1].hand.some(c=>c.uid===declined.uid),false);
 assert.equal(skipped.players[1].outside.some(c=>c.uid===declined.uid),true);
 assert.equal(assertUniversalMatch(probePacks,skipped),true);
});

test('015 draws on retirement and does not draw when it enters',()=>{
 let entered=open(pack,115);
 const eri=toHand(entered,0,'MHA-1-015');
 const before=entered.players[0].deck.length;
 entered=toPhase(entered,'main');
 entered=use(entered,findAct(entered,a=>a.type==='play'&&a.uid===eri.uid&&a.line==='front','play'));
 assert.equal(entered.players[0].deck.length,before);
 assert.equal(entered.pending,null);
 assert.equal(assertUniversalMatch(packs,entered),true);

 let s=open(pack,116);
 put(s,0,'MHA-1-046','front',0,true);
 const twice=put(s,1,'MHA-1-015','front',0,true);
 const deck=s.players[1].deck.length;
 const hand=s.players[1].hand.length;
 s=toPhase(s,'attack');
 s=use(s,findAct(s,a=>a.type==='attack','attack'));
 s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid===twice.uid,'block'));
 assert.equal(s.players[1].deck.length,deck-1);
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('016 and 034 add one energy of their own color only while active on the energy line',()=>{
 let s=open(pack,1162);
 const purple=put(s,0,'MHA-1-016','energy',0,true);
 const green=put(s,0,'MHA-1-034','energy',1,true);
 assert.equal(universalEnergyByColor(pack,s,0).purple,2);
 assert.equal(universalEnergyByColor(pack,s,0).green,2);
 purple.ready=false;
 green.ready=false;
 assert.equal(universalEnergyByColor(pack,s,0).purple,1);
 assert.equal(universalEnergyByColor(pack,s,0).green,1);
 const front=put(s,0,'MHA-1-016','front',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).purple,1);
 assert.equal(live(s,0,front.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('021 and 037 reduce hand energy only for the printed opposing colors',()=>{
 let s=open(pack,121);
 const purple=toHand(s,0,'MHA-1-021');
 const printedPurple=pack.cards['MHA-1-021'];
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,printedPurple,purple),3);
 put(s,1,'MHA-1-008','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,printedPurple,purple),3);
 put(s,1,'MHA-1-034','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,printedPurple,purple),2);
 put(s,0,'MHA-1-008','energy',0,true);
 put(s,0,'MHA-1-024','energy',1,true);
 s=toPhase(s,'main');
 assert.equal(acts(s).some(a=>a.type==='play'&&a.uid===purple.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let green=open(pack,137);
 const rain=toHand(green,0,'MHA-1-037');
 const printedGreen=pack.cards['MHA-1-037'];
 put(green,1,'MHA-1-034','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,green,0,printedGreen,rain),3);
 put(green,1,'MHA-1-008','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,green,0,printedGreen,rain),2);
 put(green,0,'MHA-1-036','energy',0,true);
 put(green,0,'MHA-1-040','energy',1,true);
 green=toPhase(green,'main');
 assert.equal(acts(green).some(a=>a.type==='play'&&a.uid===rain.uid),true);
 assert.equal(assertUniversalMatch(packs,green),true);

 let red=open(probe,221);
 const named=toHand(red,0,'MHA-1-021');
 put(red,1,'PROBE-IMPACT','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(probe,red,0,probe.cards['MHA-1-021'],named),2);
 assert.equal(assertUniversalMatch(probePacks,red),true);
});

test('022 and 041 bounce another energy-1-or-less character, or themselves when none exists',()=>{
 let none=open(pack,122);
 put(none,0,'MHA-1-016','energy',0,true);
 const compress=toHand(none,0,'MHA-1-022');
 none=toPhase(none,'main');
 none=use(none,findAct(none,a=>a.type==='play'&&a.uid===compress.uid,'play'));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.some(c=>c.uid===compress.uid),true);
 assert.equal(none.players[0].front.every(c=>!c),true);
 assert.equal(assertUniversalMatch(packs,none),true);

 let s=open(pack,222);
 put(s,0,'MHA-1-016','energy',0,true);
 const other=put(s,0,'MHA-1-008','front',0,true);
 const incoming=toHand(s,0,'MHA-1-022');
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===incoming.uid&&a.slot===1,'play'));
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(acts(s).some(a=>a.type==='chooseOwnBounce'&&a.uid===other.uid),true);
 assert.equal(acts(s).some(a=>a.type==='chooseOwnBounce'&&a.uid===null),false);
 assert.equal(acts(s).some(a=>a.uid===s.players[0].energy[0].uid),false);
 assert.throws(()=>use(s,{type:'chooseOwnBounce',uid:s.players[0].energy[0].uid}),/Action not currently legal/);
 s=use(s,{type:'chooseOwnBounce',uid:other.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(live(s,0,incoming.uid)?.cardId,'MHA-1-022');
 assert.equal(assertUniversalMatch(packs,s),true);

 let ochaco=open(pack,241);
 put(ochaco,0,'MHA-1-034','energy',0,true);
 const returned=put(ochaco,0,'MHA-1-040','front',0,true);
 const girl=toHand(ochaco,0,'MHA-1-041');
 ochaco=toPhase(ochaco,'main');
 ochaco=use(ochaco,findAct(ochaco,a=>a.type==='play'&&a.uid===girl.uid&&a.slot===1,'play'));
 ochaco=use(ochaco,findAct(ochaco,a=>a.type==='chooseOwnBounce'&&a.uid===returned.uid,'bounce'));
 assert.equal(ochaco.players[0].hand.some(c=>c.uid===returned.uid),true);
 assert.equal(live(ochaco,0,girl.uid)?.cardId,'MHA-1-041');
 assert.equal(assertUniversalMatch(packs,ochaco),true);
});

test('028 draws one and must put one hand card outside',()=>{
 let s=open(pack,128);
 const mimic=toHand(s,0,'MHA-1-028');
 const before=s.players[0].deck.length;
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===mimic.uid,'play'));
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid===null),false);
 const drawn=s.players[0].hand.at(-1);
 assert.throws(()=>use(s,{type:'chooseDiscard',uid:'missing'}),/Action not currently legal/);
 s=use(s,{type:'chooseDiscard',uid:drawn.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===drawn.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('032 readies up to two rested AP cards and can stop early',()=>{
 let s=open(pack,132);
 put(s,0,'MHA-1-016','energy',0,true);
 put(s,0,'MHA-1-008','energy',1,true);
 const extra=s.players[0].apCards.find(c=>!c.inPlay);
 extra.inPlay=true;
 extra.ready=false;
 const event=toHand(s,0,'MHA-1-032');
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='event'&&a.uid===event.uid,'event'));
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 const first=acts(s).find(a=>a.type==='chooseApRecovery'&&a.uid);
 s=use(s,first);
 assert.equal(s.players[0].apCards.find(c=>c.uid===first.uid).ready,true);
 assert.equal(s.pending.remaining,1);
 assert.equal(acts(s).some(a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 s=use(s,{type:'chooseApRecovery',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.some(c=>c.inPlay&&!c.ready),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.throws(()=>use(s,{type:'chooseApRecovery',uid:extra.uid}),/Action not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('036 and 047 step from the front to energy only during the move phase',()=>{
 for(const id of ['MHA-1-036','MHA-1-047']){
  let s=open(pack,id==='MHA-1-036'?136:147);
  const stepper=put(s,0,id,'front',0,true);
  s=toPhase(s,'move');
  assert.throws(()=>use(s,{type:'step',uid:stepper.uid,slot:0,line:'front'}),/Action not currently legal/);
  s=use(s,findAct(s,a=>a.type==='step'&&a.uid===stepper.uid&&a.slot===1,'step'));
  assert.equal(s.players[0].energy[1].uid,stepper.uid);
  assert.equal(s.players[0].energy[1].ready,true);
  assert.equal(s.players[0].front[0],null);
  assert.throws(()=>use(s,{type:'step',uid:stepper.uid,slot:2}),/Action not currently legal/);
  s=toPhase(s,'attack');
  assert.throws(()=>use(s,{type:'step',uid:stepper.uid,slot:2}),/Action not currently legal/);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 let plain=open(pack,140);
 const vanilla=put(plain,0,'MHA-1-040','front',0,true);
 plain=toPhase(plain,'move');
 assert.equal(acts(plain).some(a=>a.type==='step'&&a.uid===vanilla.uid),false);
 assert.throws(()=>use(plain,{type:'step',uid:vanilla.uid,slot:0}),/Action not currently legal/);
});

test('039 gains 1000 BP only when it attacks, for this turn',()=>{
 let s=open(pack,139);
 const iida=put(s,0,'MHA-1-039','front',0,true);
 put(s,1,'MHA-1-008','front',0,true);
 assert.equal(universalBp(pack,s,iida),1500);
 s=toPhase(s,'attack');
 assert.equal(universalBp(pack,s,live(s,0,iida.uid)),1500);
 s=use(s,findAct(s,a=>a.type==='attack'&&a.uid===iida.uid,'attack'));
 s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid===s.players[1].front[0].uid,'block'));
 const after=live(s,0,iida.uid);
 assert.equal(universalBp(pack,s,after),2500);
 assert.equal(after.buffs.some(b=>b.bp===1000&&b.untilTurn===s.turn),true);
 assert.equal(s.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('040 active trigger readies one of its characters and gives 3000 BP this turn',()=>{
 let s=open(probe,1401);
 put(s,0,'PROBE-IMPACT','front',0,true);
 const target=put(s,1,'MHA-1-036','front',0,false);
 const uraraka=topLife(s,1,'MHA-1-040');
 s=toPhase(s,'attack');
 s=attackUnblocked(s);
 assert.equal(s.pending.trigger,'active');
 assert.equal(acts(s).some(a=>a.mode==='active'&&a.uid===target.uid),true);
 s=use(s,findAct(s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===target.uid,'active'));
 assert.equal(s.players[1].outside.some(c=>c.uid===uraraka.uid),true);
 const woken=live(s,1,target.uid);
 assert.equal(woken.ready,true);
 assert.equal(universalBp(pack,s,woken),2000+3000);
 assert.equal(assertUniversalMatch(probePacks,s),true);
});

test('043 may give one other character 1000 BP and cannot choose itself',()=>{
 let s=open(pack,143);
 const other=put(s,0,'MHA-1-040','front',0,true);
 const eri=toHand(s,0,'MHA-1-043');
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===eri.uid&&a.slot===1,'play'));
 assert.equal(s.pending.kind,'effect-buff-own');
 const self=live(s,0,eri.uid);
 assert.equal(acts(s).some(a=>a.uid===self.uid),false);
 assert.equal(acts(s).some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.throws(()=>use(s,{type:'chooseOwnBuff',uid:self.uid}),/Action not currently legal/);
 s=use(s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(pack,s,live(s,0,other.uid)),3000);
 assert.equal(universalBp(pack,s,live(s,0,eri.uid)),500);
 assert.equal(live(s,0,other.uid).buffs.some(b=>b.bp===1000&&b.untilTurn===s.turn),true);
 assert.equal(assertUniversalMatch(packs,s),true);

 let skipped=open(pack,243);
 const untouched=put(skipped,0,'MHA-1-040','front',0,true);
 const second=toHand(skipped,0,'MHA-1-043');
 skipped=toPhase(skipped,'main');
 skipped=use(skipped,findAct(skipped,a=>a.type==='play'&&a.uid===second.uid&&a.slot===1,'play'));
 skipped=use(skipped,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(pack,skipped,live(skipped,0,untouched.uid)),2000);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('046 stops impact damage when it blocks',()=>{
 let s=open(probe,146);
 put(s,0,'PROBE-IMPACT','front',0,true);
 const kirishima=put(s,1,'MHA-1-046','front',0,true);
 assert.equal(universalImpactNull(probe,s,kirishima),true);
 const life=s.players[1].life.length;
 s=toPhase(s,'attack');
 s=use(s,findAct(s,a=>a.type==='attack','attack'));
 s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid===kirishima.uid,'block'));
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.players[1].front[0],null);
 assert.equal(assertUniversalMatch(probePacks,s),true);

 let vanilla=open(probe,246);
 put(vanilla,0,'PROBE-IMPACT','front',0,true);
 put(vanilla,1,'MHA-1-008','front',0,true);
 const before=vanilla.players[1].life.length;
 vanilla=toPhase(vanilla,'attack');
 vanilla=use(vanilla,findAct(vanilla,a=>a.type==='attack','attack'));
 vanilla=use(vanilla,findAct(vanilla,a=>a.type==='chooseBlock','block'));
 assert.equal(vanilla.players[1].life.length+vanilla.players[1].lifeRevealed.length,before-1);
 assert.equal(assertUniversalMatch(probePacks,vanilla),true);
});

test('024 keeps the Shie Hassaikai trait and does not invent an effect',()=>{
 let s=open(pack,124);
 assert.deepEqual(pack.cards['MHA-1-024'].traits,['死穢八斎會']);
 assert.equal(pack.cards['MHA-1-024'].implementation,'vanilla');
 const overhaul=toHand(s,0,'MHA-1-024');
 const before=s.players[0].deck.length;
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===overhaul.uid,'play'));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before);
 assert.equal(live(s,0,overhaul.uid)?.cardId,'MHA-1-024');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('032 final trigger returns the top deck card only when life is empty',()=>{
 let s=open(probe,332);
 put(s,0,'PROBE-IMPACT','front',0,true);
 const event=topLife(s,1,'MHA-1-032');
 const rest=s.players[1].life.slice(1);
 s.players[1].deck.push(...rest);
 s.players[1].life=[event];
 const top=s.players[1].deck[0];
 s=toPhase(s,'attack');
 s=attackUnblocked(s);
 assert.equal(s.pending.trigger,'final');
 assert.equal(acts(s).some(a=>a.type==='chooseTrigger'&&a.mode==='skip'),true);
 s=use(s,findAct(s,a=>a.type==='chooseTrigger'&&a.mode==='final','final'));
 assert.equal(s.players[1].life[0]?.uid,top.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===event.uid),true);
 assert.equal(assertUniversalMatch(probePacks,s),true);
});

test('049 is a vanilla get card and does not create an effect when it enters',()=>{
 let s=open(pack,149);
 const mirio=toHand(s,0,'MHA-1-049');
 const deckBefore=s.players[0].deck.length;
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===mirio.uid,'play'));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(pack.cards['MHA-1-049'].implementation,'vanilla');
 assert.deepEqual(pack.cards['MHA-1-049'].effects,{});
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('050 costs one less green energy and cannot be blocked by BP 3000 or less',()=>{
 let cost=open(pack,150);
 const mirio=toHand(cost,0,'MHA-1-050');
 assert.equal(effectiveHandRequiredEnergy(pack,cost,0,pack.cards['MHA-1-050'],mirio),3);
 put(cost,0,'MHA-1-036','energy',0,true);
 put(cost,0,'MHA-1-040','energy',1,true);
 cost=toPhase(cost,'main');
 assert.equal(acts(cost).some(a=>a.type==='play'&&a.uid===mirio.uid),false);
 put(cost,0,'MHA-1-049','energy',2,true);
 assert.equal(universalEnergyByColor(pack,cost,0).green,3);
 assert.equal(acts(cost).some(a=>a.type==='play'&&a.uid===mirio.uid&&a.line==='front'),true);
 cost=use(cost,findAct(cost,a=>a.type==='play'&&a.uid===mirio.uid,'play'));
 assert.equal(cost.pending,null);
 assert.equal(assertUniversalMatch(packs,cost),true);

 let s=open(probe,250);
 const attacker=put(s,0,'MHA-1-050','front',0,true);
 put(s,1,'MHA-1-047','front',0,true);
 put(s,1,'PROBE-TALL','front',1,true);
 put(s,1,'MHA-1-036','front',2,true);
 s=toPhase(s,'attack');
 s=use(s,findAct(s,a=>a.type==='attack'&&a.uid===attacker.uid,'attack'));
 const blocks=acts(s).filter(a=>a.type==='chooseBlock'&&a.uid);
 assert.equal(blocks.length,1);
 assert.equal(s.players[1].front.find(c=>c?.uid===blocks[0].uid).cardId,'PROBE-TALL');
 assert.equal(assertUniversalMatch(probePacks,s),true);
});

test('050 color trigger deploys one green AP-1 character of energy 2 or less, active',()=>{
 let s=open(probe,350);
 put(s,0,'PROBE-IMPACT','front',0,true);
 const revealed=topLife(s,1,'MHA-1-050');
 const legal=toHand(s,1,'MHA-1-036');
 const exact=toHand(s,1,'MHA-1-034');
 const expensive=toHand(s,1,'MHA-1-047');
 const purple=toHand(s,1,'MHA-1-008');
 s=toPhase(s,'attack');
 s=attackUnblocked(s);
 assert.equal(s.pending.trigger,'color');
 assert.equal(acts(s).some(a=>a.uid===legal.uid&&a.mode==='color'&&a.line==='front'),true);
 assert.equal(acts(s).some(a=>a.uid===exact.uid&&a.mode==='color'),true);
 assert.equal(acts(s).some(a=>a.uid===expensive.uid&&a.mode==='color'),false);
 assert.equal(acts(s).some(a=>a.uid===purple.uid&&a.mode==='color'),false);
 s=use(s,findAct(s,a=>a.type==='chooseTrigger'&&a.mode==='color'&&a.uid===legal.uid&&a.line==='front','color'));
 const entered=s.players[1].front.find(c=>c?.uid===legal.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(assertUniversalMatch(probePacks,s),true);
});
