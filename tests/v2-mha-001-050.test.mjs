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
 universalImpact, universalImpactNull, universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const READY=[
 'MHA-1-001','MHA-1-006','MHA-1-007','MHA-1-008','MHA-1-009','MHA-1-010','MHA-1-012',
 'MHA-1-013','MHA-1-014','MHA-1-015','MHA-1-016','MHA-1-017','MHA-1-018','MHA-1-019',
 'MHA-1-021','MHA-1-022','MHA-1-024','MHA-1-027','MHA-1-028','MHA-1-032','MHA-1-034',
 'MHA-1-036','MHA-1-037','MHA-1-039','MHA-1-040','MHA-1-041','MHA-1-043','MHA-1-046',
 'MHA-1-047','MHA-1-048','MHA-1-049','MHA-1-050'
];
const STANDARD_TRIGGER={
 active:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
 get:'【ゲット】このカードを手札に加える。',
 draw:'【ドロー】カードを1枚引く。',
 final:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。',
 color:'【カラー】自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。',
 raid:'【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。'
};
const COLOR_009='【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。';
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
 cards.push({
  id:'PROBE-OVER', name:'オーバーホール', color:'purple', type:'character', energy:4,
  ap:1, bp:4000, gen:1, trigger:null, traits:['死穢八斎會'], implementation:'vanilla'
 });
 cards.push({
  id:'PROBE-RETIRE', name:'退場探針', color:'red', type:'character', energy:0,
  ap:1, bp:1000, gen:1, trigger:null, traits:[], implementation:'dsl',
  effects:{onPlay:[{op:'retireOppFrontOne'}]}
 });
 cards.push({
  id:'PROBE-SNIPER', name:'狙擊探針', color:'red', type:'character', energy:0,
  ap:1, bp:1000, gen:1, trigger:null, traits:[], implementation:'dsl',
  effects:{onPlay:[{op:'grantSelfSniperThisTurn'}], onRetire:[{op:'draw',count:1}]}
 });
 return createUniversalPack({id:'mha-probe', cards, version:'mha-c-probe'});
}
const probe=probePack();
const probePacks=[probe,probe];

function deck(source, extra={}){
 const counts={...extra};
 const pinned=[
  'MHA-1-001','MHA-1-006','MHA-1-007','MHA-1-008','MHA-1-009','MHA-1-010','MHA-1-012',
  'MHA-1-013','MHA-1-014','MHA-1-015','MHA-1-016','MHA-1-017','MHA-1-018','MHA-1-019',
  'MHA-1-021','MHA-1-022','MHA-1-024','MHA-1-027','MHA-1-028','MHA-1-032','MHA-1-034',
  'MHA-1-036','MHA-1-037','MHA-1-039','MHA-1-040','MHA-1-041','MHA-1-043','MHA-1-046',
  'MHA-1-047','MHA-1-048','MHA-1-049','MHA-1-050',
  'PROBE-IMPACT','PROBE-TALL','PROBE-OVER','PROBE-RETIRE','PROBE-SNIPER'
 ];
 for(const id of pinned)
  if(source.cards[id]&&!counts[id])counts[id]=id==='MHA-1-016'?2:id==='MHA-1-034'?3:1;
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
function toOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function untilActive(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach player '+player+' '+phase);
 }
 return s;
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
  const expected=printed.id==='MHA-1-009'?COLOR_009:
   printed.trigger?STANDARD_TRIGGER[printed.trigger]:'';
  assert.equal(printed.triggerTextJa,expected);
 }
 const official=officialV2Pack('mha');
 assert.equal(official.id,'mha');
 assert.equal(official.cards['MHA-1-001'].id,'MHA-1-001');
 assert.equal(official.cards['MHA-1-002'],undefined);
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

test('012 rests for one purple energy this turn and leaves at the end of main',()=>{
 let s=open(pack,1201);
 const spinner=put(s,0,'MHA-1-012','energy',0,true);
 s=toPhase(s,'main');
 assert.equal(universalEnergyByColor(pack,s,0).purple,1);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===spinner.uid&&a.mode==='selfRestEnergyRetire'),true);
 s=use(s,findAct(s,a=>a.type==='activate'&&a.uid===spinner.uid,'activate'));
 assert.equal(live(s,0,spinner.uid).ready,false);
 assert.equal(universalEnergyByColor(pack,s,0).purple,2);
 assert.equal(universalEnergyByColor(pack,s,0).green||0,0);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===spinner.uid),false);
 assert.throws(()=>use(s,{type:'activate',uid:spinner.uid,mode:'selfRestEnergyRetire'}),/Action not currently legal/);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===spinner.uid),true);
 assert.equal(universalEnergyByColor(pack,s,0).purple||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);

 let front=open(pack,1202);
 const seated=put(front,0,'MHA-1-012','front',0,true);
 front=toPhase(front,'main');
 const second=front.players[0].front.find(c=>c?.uid===seated.uid);
 assert.equal(acts(front).some(a=>a.type==='activate'&&a.uid===second.uid),true);
 second.ready=false;
 assert.equal(acts(front).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(packs,front),true);
});

test('019 on the front once per turn reduces one opposing front character of BP 1500 or more',()=>{
 let empty=open(pack,1901);
 const sidelined=put(empty,0,'MHA-1-019','energy',0,true);
 put(empty,1,'MHA-1-016','front',0,true);
 empty=toPhase(empty,'main');
 assert.equal(acts(empty).some(a=>a.type==='activate'&&a.uid===sidelined.uid),false);

 let s=open(pack,1902);
 const toga=put(s,0,'MHA-1-019','front',0,true);
 const low=put(s,1,'MHA-1-015','front',0,true);
 const exact=put(s,1,'MHA-1-008','front',1,true);
 const back=put(s,1,'MHA-1-016','energy',0,true);
 s=toPhase(s,'main');
 assert.equal(universalBp(pack,s,exact),1500);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===toga.uid),true);
 s=use(s,findAct(s,a=>a.type==='activate'&&a.uid===toga.uid,'activate'));
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.choices.includes(exact.uid),true);
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.equal(s.pending.choices.includes(back.uid),false);
 assert.equal(acts(s).some(a=>a.type==='chooseTarget'&&a.uid===null),false);
 assert.throws(()=>use(s,{type:'chooseTarget',uid:low.uid}),/Action not currently legal/);
 s=use(s,{type:'chooseTarget',uid:exact.uid});
 assert.equal(universalBp(pack,s,live(s,1,exact.uid)),500);
 assert.equal(universalBp(pack,s,live(s,1,low.uid)),1000);
 assert.equal(universalBp(pack,s,live(s,1,back.uid)),2500);
 assert.equal(live(s,1,exact.uid).buffs.some(b=>b.bp===-1000&&b.untilTurn===s.turn),true);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===toga.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);

 let short=open(pack,1903);
 const waiting=put(short,0,'MHA-1-019','front',0,true);
 put(short,1,'MHA-1-015','front',0,true);
 short=toPhase(short,'main');
 assert.equal(acts(short).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 assert.equal(assertUniversalMatch(packs,short),true);
});

test('027 gains 1000 BP only while Overhaul is on the owner front',()=>{
 let s=open(probe,2701);
 const chrono=put(s,0,'MHA-1-027','front',0,true);
 const overhaul=put(s,0,'PROBE-OVER','energy',0,true);
 assert.equal(universalBp(probe,s,chrono),3000);
 s.players[0].energy[0]=null;
 s.players[0].front[1]=overhaul;
 assert.equal(universalBp(probe,s,chrono),4000);
 s.players[0].front[0]=null;
 s.players[0].energy[1]=chrono;
 assert.equal(universalBp(probe,s,chrono),4000);
 s.players[0].front[1]=null;
 s.players[0].energy[0]=overhaul;
 assert.equal(universalBp(probe,s,chrono),3000);
 const cover=put(s,0,'MHA-1-008','front',0,true);
 s.players[0].energy[0]=null;
 cover.stack=[overhaul];
 assert.equal(universalBp(probe,s,chrono),4000);
 assert.equal(assertUniversalMatch(probePacks,s),true);
});

function keepOneLife(s,owner){
 const kept=s.players[owner].life[0];
 s.players[owner].deck.push(...s.players[owner].life.slice(1));
 s.players[owner].life=[kept];
 return kept;
}

test('001 is impact-null and draws then discards exactly one card when it retires',()=>{
 let entered=open(pack,1001);
 const eri=toHand(entered,0,'MHA-1-001');
 const deck=entered.players[0].deck.length;
 entered=toPhase(entered,'main');
 entered=use(entered,findAct(entered,a=>a.type==='play'&&a.uid===eri.uid,'play'));
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].deck.length,deck);
 assert.equal(assertUniversalMatch(packs,entered),true);

 let s=open(probe,1002);
 put(s,0,'PROBE-IMPACT','front',0,true);
 const blocker=put(s,1,'MHA-1-001','front',0,true);
 assert.equal(universalImpactNull(probe,s,blocker),true);
 s.players[1].deck.push(...s.players[1].hand);
 s.players[1].hand=[];
 const drawn=s.players[1].deck[0];
 const life=s.players[1].life.length;
 s=toPhase(s,'attack');
 s=use(s,findAct(s,a=>a.type==='attack','attack'));
 s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid,'block'));
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[1].hand.length,1);
 assert.equal(s.players[1].hand[0].uid,drawn.uid);
 assert.throws(()=>use(s,{type:'chooseDiscard',uid:'missing'}),/Action not currently legal/);
 s=use(s,{type:'chooseDiscard',uid:drawn.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].outside.some(c=>c.uid===drawn.uid),true);
 assert.equal(assertUniversalMatch(probePacks,s),true);

 let empty=open(probe,1003);
 put(empty,0,'PROBE-IMPACT','front',0,true);
 const gone=put(empty,1,'MHA-1-001','front',0,true);
 empty.players[1].deck.push(...empty.players[1].hand);
 empty.players[1].hand=[];
 empty.players[1].outside.push(...empty.players[1].deck);
 empty.players[1].deck=[];
 const before=empty.players[1].outside.length;
 empty=toPhase(empty,'attack');
 empty=use(empty,findAct(empty,a=>a.type==='attack','attack'));
 empty=use(empty,findAct(empty,a=>a.type==='chooseBlock'&&a.uid===gone.uid,'block'));
 assert.equal(empty.pending,null);
 assert.equal(empty.players[1].hand.length,0);
 assert.equal(empty.players[1].outside.length,before+1);
 assert.equal(empty.players[1].life.length,life);
 assert.equal(assertUniversalMatch(probePacks,empty),true);
});

test('013 takes one life before activating another front character, and Q429 loses only after that',()=>{
 let short=open(pack,1301);
 put(short,0,'MHA-1-012','energy',0,true);
 const unpaid=toHand(short,0,'MHA-1-013');
 short=toPhase(short,'main');
 assert.equal(acts(short).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 assert.throws(()=>use(short,{type:'play',uid:unpaid.uid,line:'front',slot:0}),/Action not currently legal/);
 assert.equal(assertUniversalMatch(packs,short),true);

 let skipped=open(pack,1302);
 put(skipped,0,'MHA-1-016','energy',0,true);
 const resting=put(skipped,0,'MHA-1-008','front',0,false);
 const dabi=toHand(skipped,0,'MHA-1-013');
 const kept=keepOneLife(skipped,0);
 skipped=toPhase(skipped,'main');
 skipped=use(skipped,findAct(skipped,a=>a.type==='play'&&a.uid===dabi.uid&&a.slot===1,'play'));
 assert.equal(skipped.pending.kind,'effect-life-to-hand');
 skipped=use(skipped,{type:'chooseLifeToHand',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].life.length,1);
 assert.equal(live(skipped,0,resting.uid).ready,false);
 assert.equal(skipped.status,'playing');
 assert.equal(assertUniversalMatch(packs,skipped),true);

 let s=open(pack,1303);
 put(s,0,'MHA-1-016','energy',0,true);
 const other=put(s,0,'MHA-1-008','front',0,false);
 const back=put(s,0,'MHA-1-015','energy',1,true);
 const incoming=toHand(s,0,'MHA-1-013');
 const life=keepOneLife(s,0);
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===incoming.uid&&a.slot===1,'play'));
 assert.equal(s.status,'playing');
 assert.equal(acts(s).some(a=>a.type==='chooseLifeToHand'&&a.uid===life.uid),true);
 assert.throws(()=>use(s,{type:'chooseLifeToHand',uid:'missing'}),/Action not currently legal/);
 s=use(s,{type:'chooseLifeToHand',uid:life.uid});
 assert.equal(s.status,'playing');
 assert.equal(s.players[0].life.length,0);
 assert.equal(s.players[0].hand.some(c=>c.uid===life.uid),true);
 assert.equal(s.pending.kind,'effect-active-own-other');
 assert.equal(acts(s).some(a=>a.type==='chooseActiveOwnOther'&&a.uid===other.uid),true);
 assert.equal(acts(s).some(a=>a.uid===back.uid),false);
 assert.equal(acts(s).some(a=>a.uid===incoming.uid),false);
 assert.equal(acts(s).some(a=>a.type==='chooseActiveOwnOther'&&a.uid===null),true);
 assert.throws(()=>use(s,{type:'chooseActiveOwnOther',uid:back.uid}),/Action not currently legal/);
 s=use(s,{type:'chooseActiveOwnOther',uid:other.uid});
 assert.equal(live(s,0,other.uid).ready,true);
 assert.equal(s.status,'finished');
 assert.equal(s.winner,1);
 assert.equal(s.endReason,'life-zero');
});

test('014 raids Dabi, then retires one opposing front of BP 3500 or less, and Q430 loses after that',()=>{
 assert.equal(pack.cards['MHA-1-014'].raidName,'荼毘');
 let short=open(pack,1401);
 put(short,0,'MHA-1-016','energy',0,true);
 const unpaid=toHand(short,0,'MHA-1-014');
 short=toPhase(short,'main');
 assert.equal(acts(short).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 assert.throws(()=>use(short,{type:'play',uid:unpaid.uid,line:'front',slot:0}),/Action not currently legal/);

 let raid=open(pack,1402);
 put(raid,0,'MHA-1-016','energy',0,true);
 put(raid,0,'MHA-1-021','energy',1,true);
 const base=put(raid,0,'MHA-1-013','energy',2,false);
 const wrong=put(raid,0,'MHA-1-008','energy',3,false);
 const raider=toHand(raid,0,'MHA-1-014');
 raid=toPhase(raid,'main');
 const raids=acts(raid).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid&&a.line!=='energy'),true);
 assert.equal(raids.some(a=>a.baseUid===wrong.uid),false);
 raid=use(raid,findAct(raid,a=>a.type==='raid'&&a.uid===raider.uid&&a.line!=='energy','raid'));
 assert.equal(raid.pending.kind,'effect-life-to-hand');
 raid=use(raid,{type:'chooseLifeToHand',uid:null});
 const top=raid.players[0].front.find(Boolean);
 assert.equal(top.cardId,'MHA-1-014');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-013');
 assert.equal(raid.pending,null);
 assert.equal(assertUniversalMatch(packs,raid),true);

 let skipped=open(probe,1403);
 put(skipped,0,'MHA-1-016','energy',0,true);
 put(skipped,0,'MHA-1-021','energy',1,true);
 const tall=put(skipped,1,'PROBE-TALL','front',0,true);
 const incoming=toHand(skipped,0,'MHA-1-014');
 keepOneLife(skipped,0);
 skipped=toPhase(skipped,'main');
 skipped=use(skipped,findAct(skipped,a=>a.type==='play'&&a.uid===incoming.uid,'play'));
 skipped=use(skipped,{type:'chooseLifeToHand',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,1,tall.uid)?.cardId,'PROBE-TALL');
 assert.equal(skipped.status,'playing');
 assert.equal(assertUniversalMatch(probePacks,skipped),true);

 let s=open(probe,1404);
 put(s,0,'MHA-1-016','energy',0,true);
 put(s,0,'MHA-1-021','energy',1,true);
 const legal=put(s,1,'PROBE-TALL','front',0,true);
 const high=put(s,1,'PROBE-IMPACT','front',1,true);
 const back=put(s,1,'MHA-1-015','energy',0,true);
 const dabi=toHand(s,0,'MHA-1-014');
 const life=keepOneLife(s,0);
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='play'&&a.uid===dabi.uid,'play'));
 s=use(s,{type:'chooseLifeToHand',uid:life.uid});
 assert.equal(s.status,'playing');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(acts(s).some(a=>a.type==='chooseRetireBp'&&a.uid===legal.uid),true);
 assert.equal(acts(s).some(a=>a.uid===high.uid),false);
 assert.equal(acts(s).some(a=>a.uid===back.uid),false);
 assert.equal(acts(s).some(a=>a.type==='chooseRetireBp'&&a.uid===null),true);
 assert.throws(()=>use(s,{type:'chooseRetireBp',uid:high.uid}),/Action not currently legal/);
 s=use(s,{type:'chooseRetireBp',uid:legal.uid});
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===legal.uid),true);
 assert.equal(live(s,1,high.uid)?.cardId,'PROBE-IMPACT');
 assert.equal(s.status,'finished');
 assert.equal(s.winner,1);
 assert.equal(s.endReason,'life-zero');
});

test('018 grants its own attack-win draw from either line, once per turn',()=>{
 let energy=open(pack,1801);
 const back=put(energy,0,'MHA-1-018','energy',0,false);
 energy=toPhase(energy,'main');
 assert.equal(acts(energy).some(a=>a.type==='activate'&&a.uid===back.uid&&a.mode==='frontOnce'),true);
 energy=use(energy,findAct(energy,a=>a.type==='activate'&&a.uid===back.uid,'activate'));
 assert.equal(live(energy,0,back.uid).attackWinDrawGranted.turn,energy.turn);
 assert.equal(acts(energy).some(a=>a.type==='activate'&&a.uid===back.uid),false);
 assert.throws(()=>use(energy,{type:'activate',uid:back.uid,mode:'frontOnce'}),/Action not currently legal/);
 assert.equal(assertUniversalMatch(packs,energy),true);

 let plain=open(pack,1802);
 const quiet=put(plain,0,'MHA-1-018','front',0,true);
 put(plain,1,'MHA-1-015','front',0,true);
 const deck=plain.players[0].deck.length;
 const hand=plain.players[0].hand.length;
 plain=toPhase(plain,'attack');
 assert.equal(acts(plain).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 plain=use(plain,findAct(plain,a=>a.type==='attack','attack'));
 plain=use(plain,findAct(plain,a=>a.type==='chooseBlock'&&a.uid!==null,'block'));
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(plain.players[0].hand.length,hand);
 assert.equal(plain.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,plain),true);

 let lost=open(pack,1803);
 const weak=put(lost,0,'MHA-1-018','front',0,true);
 put(lost,1,'MHA-1-016','front',0,true);
 lost=toPhase(lost,'main');
 lost=use(lost,findAct(lost,a=>a.type==='activate'&&a.uid===weak.uid,'activate'));
 const lostDeck=lost.players[0].deck.length;
 lost=toPhase(lost,'attack');
 lost=use(lost,findAct(lost,a=>a.type==='attack','attack'));
 lost=use(lost,findAct(lost,a=>a.type==='chooseBlock'&&a.uid!==null,'block'));
 assert.equal(lost.players[0].deck.length,lostDeck);
 assert.equal(live(lost,0,weak.uid)?.cardId,'MHA-1-018');
 assert.equal(live(lost,1,lost.players[1].front[0].uid)?.cardId,'MHA-1-016');
 assert.equal(assertUniversalMatch(packs,lost),true);

 let s=open(pack,1804);
 const toga=put(s,0,'MHA-1-018','front',0,true);
 put(s,1,'MHA-1-015','front',0,true);
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='activate'&&a.uid===toga.uid,'activate'));
 const before=s.players[0].deck.length;
 const held=s.players[0].hand.length;
 s=toPhase(s,'attack');
 s=use(s,findAct(s,a=>a.type==='attack','attack'));
 s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid!==null,'block'));
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.players[0].hand.length,held+1);
 assert.equal(s.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('006 pays one hand card, then moves or swaps, and cannot repeat',()=>{
 let dry=open(pack,6001);
 const quiet=put(dry,0,'MHA-1-006','front',0,true);
 dry.players[0].deck.push(...dry.players[0].hand);
 dry.players[0].hand=[];
 dry=toPhase(dry,'main');
 assert.equal(acts(dry).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assert.throws(()=>use(dry,{type:'activate',uid:quiet.uid,mode:'payHandMove'}),/Action not currently legal/);
 assert.equal(assertUniversalMatch(packs,dry),true);

 let moved=open(pack,6002);
 const source=put(moved,0,'MHA-1-006','energy',0,true);
 const rider=put(moved,0,'MHA-1-008','energy',1,true);
 const front=put(moved,0,'MHA-1-015','front',0,true);
 const paid=toHand(moved,0,'MHA-1-012');
 moved.players[0].deck.push(...moved.players[0].hand.filter(c=>c.uid!==paid.uid));
 moved.players[0].hand=[paid];
 moved=toPhase(moved,'main');
 moved=use(moved,findAct(moved,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='payHandMove','pay'));
 assert.equal(moved.pending.kind,'effect-pay-hand-move');
 assert.throws(()=>use(moved,{type:'choosePayHandMove',uid:'missing'}),/Action not currently legal/);
 moved=use(moved,{type:'choosePayHandMove',uid:paid.uid});
 assert.equal(moved.players[0].outside.some(c=>c.uid===paid.uid),true);
 assert.equal(moved.pending.kind,'effect-move-or-swap');
 moved=use(moved,findAct(moved,a=>a.type==='chooseMoveOrSwap'&&a.mode==='shift','shift'));
 moved=use(moved,findAct(moved,a=>a.type==='chooseLineMove'&&a.uid===rider.uid,'move'));
 moved=use(moved,findAct(moved,a=>a.type==='chooseLineSlot'&&a.slot===1,'slot'));
 assert.equal(moved.players[0].front[1]?.uid,rider.uid);
 assert.equal(acts(moved).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.throws(()=>use(moved,{type:'activate',uid:source.uid,mode:'payHandMove'}),/Action not currently legal/);
 assert.equal(live(moved,0,front.uid)?.cardId,'MHA-1-015');
 assert.equal(assertUniversalMatch(packs,moved),true);

 let swapped=open(pack,6003);
 const fog=put(swapped,0,'MHA-1-006','front',1,true);
 const left=put(swapped,0,'MHA-1-015','front',0,true);
 const back=put(swapped,0,'MHA-1-008','energy',0,true);
 const cost=toHand(swapped,0,'MHA-1-012');
 swapped=toPhase(swapped,'main');
 swapped=use(swapped,findAct(swapped,a=>a.type==='activate'&&a.uid===fog.uid,'pay'));
 swapped=use(swapped,{type:'choosePayHandMove',uid:cost.uid});
 swapped=use(swapped,findAct(swapped,a=>a.type==='chooseMoveOrSwap'&&a.mode==='swap','swap'));
 swapped=use(swapped,findAct(swapped,a=>a.type==='chooseSwapLines'&&a.uid===left.uid,'front'));
 swapped=use(swapped,findAct(swapped,a=>a.type==='chooseSwapLines'&&a.uid===back.uid,'energy'));
 assert.equal(swapped.players[0].energy[0].uid,left.uid);
 assert.equal(swapped.players[0].front[0].uid,back.uid);
 assert.equal(assertUniversalMatch(packs,swapped),true);

 let lost=open(pack,6004);
 const lone=put(lost,0,'MHA-1-006','front',0,true);
 const spare=toHand(lost,0,'MHA-1-012');
 lost=toPhase(lost,'main');
 lost=use(lost,findAct(lost,a=>a.type==='activate'&&a.uid===lone.uid,'pay'));
 lost=use(lost,{type:'choosePayHandMove',uid:spare.uid});
 assert.equal(lost.players[0].outside.some(c=>c.uid===spare.uid),true);
 lost.players[0].front[0]=null;
 lost.players[0].outside.push(lone);
 assert.throws(()=>use(lost,{type:'chooseLineMove',uid:lone.uid}),/Action not currently legal|Illegal line-move|Line move source/);
 assert.equal(lost.players[0].outside.some(c=>c.uid===spare.uid),true);
});

test('007 returns the loser to hand on its own turn, and Q424 skips the retire effect',()=>{
 let s=open(pack,7001);
 const gentle=put(s,0,'MHA-1-007','front',0,true);
 const twice=put(s,1,'MHA-1-015','front',0,true);
 const deck=s.players[1].deck.length;
 const life=s.players[1].life.length;
 s=toPhase(s,'attack');
 s=use(s,findAct(s,a=>a.type==='attack'&&a.uid===gentle.uid,'attack'));
 s=use(s,findAct(s,a=>a.type==='chooseBlock'&&a.uid===twice.uid,'block'));
 assert.equal(s.players[1].hand.some(c=>c.uid===twice.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===twice.uid),false);
 assert.equal(s.players[1].deck.length,deck);
 assert.equal(s.players[1].life.length+s.players[1].lifeRevealed.length,life-1);
 const handAt=s.zoneMoveEvents.findIndex(e=>e.uid===twice.uid&&e.to==='hand');
 const lifeAt=s.zoneMoveEvents.findIndex(e=>e.from==='life'&&e.owner===1);
 assert.equal(handAt>=0&&lifeAt>handAt,true);
 if(s.pending?.kind==='life-trigger')s=use(s,findAct(s,a=>a.type==='chooseTrigger'&&a.mode==='skip','skip'));
 assert.equal(assertUniversalMatch(packs,s),true);

 let other=open(probe,7002);
 const wall=put(other,0,'MHA-1-007','front',0,true);
 const sniper=toHand(other,1,'PROBE-SNIPER');
 other=untilActive(other,1,'main');
 other=use(other,findAct(other,a=>a.type==='play'&&a.uid===sniper.uid&&a.line==='front','snipe'));
 const shooter=live(other,1,sniper.uid);
 shooter.ready=true;
 other=toPhase(other,'attack');
 const otherDeck=other.players[1].deck.length;
 other=use(other,findAct(other,a=>a.type==='attack'&&a.uid===shooter.uid&&a.targetUid===wall.uid,'shot'));
 assert.equal(other.players[1].outside.some(c=>c.uid===shooter.uid),true);
 assert.equal(other.players[1].hand.some(c=>c.uid===shooter.uid),false);
 assert.equal(other.players[1].deck.length,otherDeck-1);
 assert.equal(live(other,0,wall.uid)?.cardId,'MHA-1-007');
 assert.equal(assertUniversalMatch(probePacks,other),true);
});

test('009 removes a battle loser on its turn, grants impact after payment, and deploys from outside',()=>{
 let plain=open(pack,9001);
 const tomura=put(plain,0,'MHA-1-009','front',0,true);
 const twice=put(plain,1,'MHA-1-015','front',0,true);
 const deck=plain.players[1].deck.length;
 const life=plain.players[1].life.length;
 plain=toPhase(plain,'attack');
 plain=use(plain,findAct(plain,a=>a.type==='attack'&&a.uid===tomura.uid,'attack'));
 plain=use(plain,findAct(plain,a=>a.type==='chooseBlock'&&a.uid===twice.uid,'block'));
 assert.equal(plain.players[1].removed.some(c=>c.uid===twice.uid),true);
 assert.equal(plain.players[1].outside.some(c=>c.uid===twice.uid),false);
 assert.equal(plain.players[1].deck.length,deck);
 assert.equal(plain.players[1].life.length,life);
 assert.equal(assertUniversalMatch(packs,plain),true);

 let paid=open(pack,9002);
 const source=put(paid,0,'MHA-1-009','front',0,true);
 const cost=toHand(paid,0,'MHA-1-012');
 paid.players[0].deck.push(...paid.players[0].hand.filter(c=>c.uid!==cost.uid));
 paid.players[0].hand=[cost];
 paid=toPhase(paid,'main');
 paid=use(paid,findAct(paid,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='payHandImpact','pay'));
 assert.equal(paid.pending.kind,'effect-pay-hand-impact');
 assert.throws(()=>use(paid,{type:'choosePayHandImpact',uid:'missing'}),/Action not currently legal/);
 paid=use(paid,{type:'choosePayHandImpact',uid:cost.uid});
 assert.equal(live(paid,0,source.uid).impactGranted.amount,1);
 assert.equal(universalImpact(pack,paid,live(paid,0,source.uid)),1);
 assert.equal(acts(paid).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 const loser=put(paid,1,'MHA-1-008','front',0,true);
 const before=paid.players[1].life.length;
 paid=toPhase(paid,'attack');
 paid=use(paid,findAct(paid,a=>a.type==='attack'&&a.uid===source.uid,'attack'));
 paid=use(paid,findAct(paid,a=>a.type==='chooseBlock'&&a.uid===loser.uid,'block'));
 assert.equal(paid.players[1].removed.some(c=>c.uid===loser.uid),true);
 assert.equal(paid.players[1].life.length+paid.players[1].lifeRevealed.length,before-1);
 if(paid.pending?.kind==='life-trigger')paid=use(paid,findAct(paid,a=>a.type==='chooseTrigger'&&a.mode==='skip','skip'));
 assert.equal(assertUniversalMatch(packs,paid),true);

 let dry=open(pack,9003);
 const quiet=put(dry,0,'MHA-1-009','front',0,true);
 dry.players[0].deck.push(...dry.players[0].hand);
 dry.players[0].hand=[];
 dry=toPhase(dry,'main');
 assert.equal(acts(dry).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assert.throws(()=>use(dry,{type:'activate',uid:quiet.uid,mode:'payHandImpact'}),/Action not currently legal/);
 let rear=open(pack,9005);
 const back=put(rear,0,'MHA-1-009','energy',0,true);
 toHand(rear,0,'MHA-1-012');
 rear=toPhase(rear,'main');
 assert.equal(acts(rear).some(a=>a.type==='activate'&&a.uid===back.uid&&a.mode==='payHandImpact'),true);

 let color=open(probe,9004);
 put(color,0,'PROBE-IMPACT','front',0,true);
 const revealed=topLife(color,1,'MHA-1-009');
 const legal=toOutside(color,1,'MHA-1-016');
 const expensive=toOutside(color,1,'MHA-1-021');
 const green=toOutside(color,1,'MHA-1-034');
 const held=toHand(color,1,'MHA-1-008');
 color=toPhase(color,'attack');
 color=attackUnblocked(color);
 assert.equal(color.pending.trigger,'color');
 assert.equal(acts(color).some(a=>a.uid===legal.uid&&a.mode==='colorOutside'&&a.line==='front'),true);
 assert.equal(acts(color).some(a=>a.uid===legal.uid&&a.line==='energy'),false);
 assert.equal(acts(color).some(a=>a.uid===expensive.uid),false);
 assert.equal(acts(color).some(a=>a.uid===green.uid),false);
 assert.equal(acts(color).some(a=>a.uid===held.uid),false);
 color=use(color,findAct(color,a=>a.type==='chooseTrigger'&&a.mode==='colorOutside'&&a.uid===legal.uid&&a.line==='front','color'));
 assert.equal(live(color,1,legal.uid).ready,true);
 assert.equal(color.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(assertUniversalMatch(probePacks,color),true);

 let left=open(pack,9006);
 const gone=put(left,0,'MHA-1-009','front',0,true);
 const fee=toHand(left,0,'MHA-1-012');
 left=toPhase(left,'main');
 left=use(left,findAct(left,a=>a.type==='activate'&&a.uid===gone.uid,'pay'));
 left.players[0].front[0]=null;
 left.players[0].outside.push(gone);
 left=use(left,{type:'choosePayHandImpact',uid:fee.uid});
 assert.equal(gone.impactGranted,undefined);
 assert.equal(left.players[0].outside.some(c=>c.uid===fee.uid),true);
 assert.equal(left.mainAbilityUsedUids.includes(gone.uid),true);

 let other=open(probe,9007);
 const body=put(other,0,'MHA-1-009','front',0,true);
 const sniper=toHand(other,1,'PROBE-SNIPER');
 other=untilActive(other,1,'main');
 other=use(other,findAct(other,a=>a.type==='play'&&a.uid===sniper.uid&&a.line==='front','snipe'));
 const shooter=live(other,1,sniper.uid);
 shooter.ready=true;
 other=toPhase(other,'attack');
 const otherDeck=other.players[1].deck.length;
 other=use(other,findAct(other,a=>a.type==='attack'&&a.uid===shooter.uid&&a.targetUid===body.uid,'shot'));
 assert.equal(other.players[1].outside.some(c=>c.uid===shooter.uid),true);
 assert.equal(other.players[1].removed.some(c=>c.uid===shooter.uid),false);
 assert.equal(other.players[1].deck.length,otherDeck-1);
 assert.equal(live(other,0,body.uid)?.cardId,'MHA-1-009');
 assert.equal(assertUniversalMatch(probePacks,other),true);
});

test('010 raids Shigaraki, removes one front of BP 2000 or less, and Q426 skips retirement',()=>{
 assert.equal(pack.cards['MHA-1-010'].raidName,'死柄木 弔');
 let energy=open(pack,10001);
 const back=put(energy,0,'MHA-1-010','energy',0,true);
 put(energy,1,'MHA-1-015','front',0,true);
 energy=toPhase(energy,'main');
 assert.equal(acts(energy).some(a=>a.type==='activate'&&a.uid===back.uid),false);
 assert.throws(()=>use(energy,{type:'activate',uid:back.uid,mode:'frontOnce'}),/Action not currently legal/);

 let none=open(pack,10002);
 const waiting=put(none,0,'MHA-1-010','front',0,true);
 put(none,1,'MHA-1-016','front',0,true);
 none=toPhase(none,'main');
 assert.equal(acts(none).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 assert.equal(none.mainAbilityUsedUids.includes(waiting.uid),false);

 let s=open(pack,10003);
 const actor=put(s,0,'MHA-1-010','front',0,true);
 const low=put(s,1,'MHA-1-018','front',0,true);
 const high=put(s,1,'MHA-1-016','front',1,true);
 const rear=put(s,1,'MHA-1-015','energy',0,true);
 s=toPhase(s,'main');
 s=use(s,findAct(s,a=>a.type==='activate'&&a.uid===actor.uid,'remove'));
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.destination,'removed');
 assert.equal(acts(s).some(a=>a.type==='chooseRetireBp'&&a.uid===low.uid),true);
 assert.equal(acts(s).some(a=>a.uid===high.uid),false);
 assert.equal(acts(s).some(a=>a.uid===rear.uid),false);
 assert.equal(acts(s).some(a=>a.type==='chooseRetireBp'&&a.uid===null),false);
 assert.throws(()=>use(s,{type:'chooseRetireBp',uid:high.uid}),/Action not currently legal/);
 s=use(s,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(s.players[1].removed.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),false);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);

 let battle=open(pack,10004);
 const winner=put(battle,0,'MHA-1-010','front',0,true);
 const twice=put(battle,1,'MHA-1-015','front',0,true);
 const deck=battle.players[1].deck.length;
 battle=toPhase(battle,'attack');
 battle=use(battle,findAct(battle,a=>a.type==='attack'&&a.uid===winner.uid,'attack'));
 battle=use(battle,findAct(battle,a=>a.type==='chooseBlock'&&a.uid===twice.uid,'block'));
 assert.equal(battle.players[1].removed.some(c=>c.uid===twice.uid),true);
 assert.equal(battle.players[1].deck.length,deck);
 assert.equal(assertUniversalMatch(packs,battle),true);

 let other=open(probe,10006);
 const body=put(other,0,'MHA-1-010','front',0,true);
 const sniper=toHand(other,1,'PROBE-SNIPER');
 other=untilActive(other,1,'main');
 other=use(other,findAct(other,a=>a.type==='play'&&a.uid===sniper.uid&&a.line==='front','snipe'));
 const shooter=live(other,1,sniper.uid);
 shooter.ready=true;
 other=toPhase(other,'attack');
 const otherDeck=other.players[1].deck.length;
 other=use(other,findAct(other,a=>a.type==='attack'&&a.uid===shooter.uid&&a.targetUid===body.uid,'shot'));
 assert.equal(other.players[1].outside.some(c=>c.uid===shooter.uid),true);
 assert.equal(other.players[1].removed.some(c=>c.uid===shooter.uid),false);
 assert.equal(other.players[1].deck.length,otherDeck-1);
 assert.equal(live(other,0,body.uid)?.cardId,'MHA-1-010');
 assert.equal(assertUniversalMatch(probePacks,other),true);

 let raid=open(pack,10005);
 put(raid,0,'MHA-1-016','energy',0,true);
 put(raid,0,'MHA-1-021','energy',1,true);
 put(raid,0,'MHA-1-027','energy',2,true);
 const base=put(raid,0,'MHA-1-008','front',0,false);
 const wrong=put(raid,0,'MHA-1-015','energy',3,false);
 const raider=toHand(raid,0,'MHA-1-010');
 raid=toPhase(raid,'main');
 const raids=acts(raid).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid&&a.line!=='energy'),true);
 assert.equal(raids.some(a=>a.baseUid===wrong.uid),false);
 raid=use(raid,findAct(raid,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.line!=='energy','raid'));
 const top=raid.players[0].front.find(c=>c?.cardId==='MHA-1-010');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-008');
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('017 deploys the bottom of its Twice raid active, and a missing bottom can only be skipped',()=>{
 let bare=open(pack,1701);
 put(bare,0,'MHA-1-016','energy',0,true);
 put(bare,0,'MHA-1-021','energy',1,true);
 const played=toHand(bare,0,'MHA-1-017');
 bare=toPhase(bare,'main');
 bare=use(bare,findAct(bare,a=>a.type==='play'&&a.uid===played.uid,'play'));
 assert.equal(bare.pending,null);
 assert.equal(live(bare,0,played.uid)?.cardId,'MHA-1-017');
 assert.equal(assertUniversalMatch(packs,bare),true);

 let raid=open(pack,1702);
 put(raid,0,'MHA-1-016','energy',0,true);
 put(raid,0,'MHA-1-021','energy',1,true);
 const base=put(raid,0,'MHA-1-015','energy',2,false);
 const wrong=put(raid,0,'MHA-1-008','energy',3,false);
 const raider=toHand(raid,0,'MHA-1-017');
 const deck=raid.players[0].deck.length;
 raid=toPhase(raid,'main');
 const raids=acts(raid).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid),true);
 assert.equal(raids.some(a=>a.baseUid===wrong.uid),false);
 raid=use(raid,findAct(raid,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.line!=='energy','raid'));
 assert.equal(raid.pending.kind,'effect-raid-bottom-active');
 assert.equal(raid.pending.origin,'stack');
 raid=use(raid,{type:'chooseRaidBottomActive',uid:null});
 assert.equal(raid.pending,null);
 assert.equal(raid.players[0].front.find(c=>c?.cardId==='MHA-1-017').stack[0].uid,base.uid);
 assert.equal(raid.players[0].deck.length,deck);
 assert.equal(assertUniversalMatch(packs,raid),true);

 let entered=open(pack,1703);
 put(entered,0,'MHA-1-016','energy',0,true);
 put(entered,0,'MHA-1-021','energy',1,true);
 const under=put(entered,0,'MHA-1-015','energy',2,false);
 const topCard=toHand(entered,0,'MHA-1-017');
 entered=toPhase(entered,'main');
 entered=use(entered,findAct(entered,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===under.uid&&a.line!=='energy','raid'));
 const host=entered.players[0].front.find(c=>c?.cardId==='MHA-1-017');
 host.stack.shift();
 entered.players[0].outside.push(under);
 assert.equal(acts(entered).every(a=>a.uid===null),true);
 assert.throws(()=>use(entered,{type:'chooseRaidBottomActive',uid:under.uid,line:'front',slot:1}),/Action not currently legal/);
 entered=use(entered,{type:'chooseRaidBottomActive',uid:null});
 assert.equal(entered.pending,null);

 let liveBottom=open(pack,1704);
 put(liveBottom,0,'MHA-1-016','energy',0,true);
 put(liveBottom,0,'MHA-1-021','energy',1,true);
 const bottom=put(liveBottom,0,'MHA-1-015','energy',2,false);
 const incoming=toHand(liveBottom,0,'MHA-1-017');
 liveBottom=toPhase(liveBottom,'main');
 liveBottom=use(liveBottom,findAct(liveBottom,a=>a.type==='raid'&&a.uid===incoming.uid&&a.baseUid===bottom.uid&&a.line!=='energy','raid'));
 liveBottom=use(liveBottom,findAct(liveBottom,a=>a.type==='chooseRaidBottomActive'&&a.uid===bottom.uid&&a.line==='front','deploy'));
 assert.equal(live(liveBottom,0,bottom.uid).ready,true);
 assert.equal(liveBottom.players[0].front.find(c=>c?.cardId==='MHA-1-017').stack.length,0);
 assert.equal(liveBottom.pending,null);
 assert.equal(assertUniversalMatch(packs,liveBottom),true);
});

test('048 reorders its life and stays once against an opposing effect. Q446 still retires',()=>{
 let short=open(pack,4801);
 put(short,0,'MHA-1-034','energy',0,true);
 put(short,0,'MHA-1-034','energy',1,true);
 put(short,0,'MHA-1-034','energy',2,true);
 const one=toHand(short,0,'MHA-1-048');
 short.players[0].deck.push(...short.players[0].life.slice(1));
 short.players[0].life=short.players[0].life.slice(0,1);
 short=toPhase(short,'main');
 short=use(short,findAct(short,a=>a.type==='play'&&a.uid===one.uid,'play'));
 assert.equal(short.pending,null);
 assert.equal(short.players[0].life.length,1);
 assert.equal(assertUniversalMatch(packs,short),true);

 let ordered=open(pack,4802);
 put(ordered,0,'MHA-1-034','energy',0,true);
 put(ordered,0,'MHA-1-034','energy',1,true);
 put(ordered,0,'MHA-1-034','energy',2,true);
 const nighteye=toHand(ordered,0,'MHA-1-048');
 const kept=ordered.players[0].life.slice(0,3);
 ordered.players[0].deck.push(...ordered.players[0].life.slice(3));
 ordered.players[0].life=kept;
 ordered=toPhase(ordered,'main');
 ordered=use(ordered,findAct(ordered,a=>a.type==='play'&&a.uid===nighteye.uid,'play'));
 assert.equal(ordered.pending.kind,'effect-life-order');
 assert.deepEqual(ordered.pending.uids,kept.map(c=>c.uid));
 assert.deepEqual(universalPrivateChoices(pack,ordered,0).inspected.map(c=>c.uid),kept.map(c=>c.uid));
 assert.equal(universalPrivateChoices(pack,ordered,1),null);
 const skipped=use(ordered,{type:'chooseReorderOwnLife',uid:null});
 assert.deepEqual(skipped.players[0].life.map(c=>c.uid),kept.map(c=>c.uid));
 const left=kept[2];
 ordered.players[0].life=ordered.players[0].life.filter(c=>c.uid!==left.uid);
 ordered.players[0].outside.push(left);
 assert.throws(()=>use(ordered,{type:'chooseReorderOwnLife',uid:left.uid}),/Action not currently legal/);
 ordered=use(ordered,{type:'chooseReorderOwnLife',uid:kept[1].uid});
 ordered=use(ordered,{type:'chooseReorderOwnLife',uid:kept[0].uid});
 assert.deepEqual(ordered.players[0].life.map(c=>c.uid),[kept[1].uid,kept[0].uid]);
 assert.equal(ordered.pending,null);
 assert.equal(assertUniversalMatch(packs,ordered),true);

 let stay=open(probe,4803);
 const body=put(stay,0,'MHA-1-048','front',0,true);
 const hit=toHand(stay,1,'PROBE-RETIRE');
 stay=untilActive(stay,1,'main');
 stay=use(stay,findAct(stay,a=>a.type==='play'&&a.uid===hit.uid,'retire'));
 assert.equal(stay.pending.kind,'effect-retire-bp');
 stay=use(stay,{type:'chooseRetireBp',uid:body.uid});
 assert.equal(live(stay,0,body.uid)?.cardId,'MHA-1-048');
 assert.equal(stay.players[0].outside.some(c=>c.uid===body.uid),false);
 assert.equal(stay.mainAbilityUsedUids.includes(body.uid+'|oppLeave'),true);
 assert.equal(assertUniversalMatch(probePacks,stay),true);

 let lost=open(probe,4804);
 const defender=put(lost,0,'MHA-1-048','front',0,true);
 const attacker=put(lost,1,'PROBE-IMPACT','front',0,true);
 lost=untilActive(lost,1,'attack');
 lost=use(lost,findAct(lost,a=>a.type==='attack'&&a.uid===attacker.uid,'attack'));
 lost=use(lost,findAct(lost,a=>a.type==='chooseBlock'&&a.uid===defender.uid,'block'));
 assert.equal(lost.players[0].front[0],null);
 assert.equal(lost.players[0].outside.some(c=>c.uid===defender.uid),true);
 assert.equal(assertUniversalMatch(probePacks,lost),true);
});
