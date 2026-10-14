import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS,SOLO_LEVELING_MISSING_NUMBERS} from '../dist/solo-leveling.mjs';
import {TTG_CARDS} from '../dist/ttg-builder.mjs';
import {registeredV2TitlePack,listRegisteredV2Titles} from '../dist/universal-v2/title-packs/registry.mjs';
import {createSlgV2Pack,SLG_V2_VERIFIED_IDS} from '../dist/universal-v2/slg-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const slg=createSlgV2Pack(),ttg=createTtgV2Pack(),packs=[ttg,slg];
const ttgDeck=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
const slgDeck=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-038']=2;
// SPECIAL event fixture replaces a normal 4-copy card, never exceeds printed limit.
slgDeck['SLG-1-032']=0;
slgDeck['SLG-1-040']=2;
slgDeck['SLG-1-076']=2; // two official SPECIAL numbers, total SPECIAL physical cards = 4
const fresh=(first=1)=>newUniversalMatch(packs,{decks:[ttgDeck,slgDeck],seed:51,first});
function take(s,player,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing physical '+id);
}
function advance(s,phase){
 while(s.phase!==phase){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 return s;
}
test('TTG 81 and SLG 80 normal official card IDs are unique and contiguous, excluding AP and variants',()=>{
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 assert.deepEqual(SOLO_LEVELING_MISSING_NUMBERS,[]);
 assert.equal(TTG_CARDS.length,81);
 for(const [cards,title,n] of [[SOLO_LEVELING_CARDS,'SLG',80],[TTG_CARDS,'TTG',81]]){
  const expected=Array.from({length:n},(_,i)=>title+'-1-'+String(i+1).padStart(3,'0'));
  assert.deepEqual(cards.map(c=>c.id).sort(),expected);
  assert.equal(new Set(cards.map(c=>c.id)).size,n);
  assert.ok(cards.every(c=>c.type!=='ap'&&c.type!=='action_point'&&!c.id.includes('-AP')));
 }
});
test('SLG 16 printed effect profiles do not equate to full 80-card migration and retain life trigger separately',()=>{
 assert.equal(SLG_V2_VERIFIED_IDS.length,18);
 assert.equal(Object.keys(slg.cards).length,18);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
 assert.equal(slg.cards['SLG-1-005'].implementation,'vanilla');
 assert.equal(slg.cards['SLG-1-005'].trigger,'draw');
 assert.equal(slg.cards['SLG-1-015'].trigger,'get');
 assert.equal(slg.cards['SLG-1-032'].impactNull,true);
 assert.equal(slg.cards['SLG-1-032'].trigger,'active');
 assert.equal(slg.cards['SLG-1-038'].effects.onPlay[0].op,'recoverAp');
 assert.equal(slg.cards['SLG-1-038'].trigger,'final');
 for(const id of ['SLG-1-040','SLG-1-076']){
  assert.equal(slg.cards[id].trigger,'special');
  assert.equal(slg.cards[id].triggerEffect.op,'retireOppFront');
  assert.equal(slg.cards[id].effects.onPlay[0].bonusBp,5000);
 }
 assert.ok(!slg.cards['SLG-1-019']&&!slg.cards['SLG-1-047'],'shared name once and re-Raid unsupported; never enable flags');
});
test('SLG-1-043 onPlay draw/discard targets own hand only, requires real AP and conserves UID',()=>{
 let s=fresh(),c=take(s,1,'SLG-1-043');s.players[1].hand.push(c);
 s=advance(s,'main');
 const apBefore=s.players[1].apCards.filter(x=>x.inPlay&&x.ready).length;
 const deckBefore=s.players[1].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front');
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[1].deck.length,deckBefore-1);
 assert.equal(s.players[1].apCards.filter(x=>x.inPlay&&x.ready).length,apBefore-1);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'0-bad'}),/not currently legal/);
 const choose=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 s=dispatchUniversalAction(packs,s,choose);
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(x=>x.uid===choose.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-1-016 mandatory mill of two physical deck cards has no optional skip and IMPACT null',()=>{
 let s=fresh(),source=take(s,1,'SLG-1-016');
 for(let i=0;i<3;i++){
  const c=take(s,1,'SLG-1-015');c.ready=true;s.players[1].energy[i]=c;
 }
 s.players[1].hand.push(source);s=advance(s,'main');
 const deckBefore=s.players[1].deck.length,outsideBefore=s.players[1].outside.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[1].deck.length,deckBefore-2);
 assert.equal(s.players[1].outside.length,outsideBefore+2);
 assert.equal(s.pending,null);
 assert.equal(slg.cards['SLG-1-016'].impactNull,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-1-006 ACTIVE purple energy =2, REST purple energy =1, unrelated green unaffected',()=>{
 const s=fresh(),card=take(s,1,'SLG-1-006');s.players[1].energy[0]=card;card.ready=true;
 assert.equal(universalEnergyByColor(packs,s,1).purple,2);
 card.ready=false;assert.equal(universalEnergyByColor(packs,s,1).purple,1);
 assert.equal(universalEnergyByColor(packs,s,1).green||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-1-038 FINAL optional life trigger resolves as separate handler, replenishes precisely one life',()=>{
 let s=fresh(0),attack=take(s,0,'TTG-1-042'),flip=take(s,1,'SLG-1-038');
 attack.ready=true;s.players[0].front[0]=attack;
 const defender=s.players[1];
 defender.outside.push(...defender.life.splice(0,defender.life.length-1));
 defender.deck.push(defender.life.shift());
 defender.life.push(flip);
 s=advance(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attack.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending?.trigger,'final');
 const options=legalUniversalActions(packs,s);
 assert.ok(options.some(a=>a.mode==='skip'));
 const choose=options.find(a=>a.mode==='final');assert.ok(choose);
 const deckBefore=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,choose,{actor:1});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].deck.length,deckBefore-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SLG-040 paid event: no Jinwoo only BP3000, printed Jinwoo present raises limit to BP5000; illegal UID rejected',()=>{
 const setup=withJinwoo=>{
  let s=fresh(),enemy=take(s,0,'TTG-1-043'),source=take(s,1,'SLG-1-040');
  enemy.ready=true;enemy.buffs=[{bp:1000,untilTurn:s.turn}];s.players[0].front[0]=enemy;
  for(let i=0;i<4;i++){
   const c=take(s,1,withJinwoo&&i===0?'SLG-1-015':'SLG-1-005');
   c.ready=true;s.players[1].energy[i]=c;
  }
  s.players[1].hand.push(source);s=advance(s,'main');
  const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===source.uid);
  assert.ok(action,'purple energy and AP must permit paid event');
  return {s:dispatchUniversalAction(packs,s,action),enemy};
 };
 const without=setup(false);
 assert.equal(without.s.pending,null,'boosted enemy 4000 is NOT under base 3000');
 assert.equal(without.s.players[0].front[0].uid,without.enemy.uid);
 assert.equal(assertUniversalMatch(packs,without.s),true);
 const withName=setup(true);
 assert.equal(withName.s.pending?.kind,'effect-retire-bp');
 assert.deepEqual(legalUniversalActions(packs,withName.s),[{type:'chooseRetireBp',uid:withName.enemy.uid}]);
 assert.throws(()=>dispatchUniversalAction(packs,withName.s,{type:'chooseRetireBp',uid:'0-fake'}),/not currently legal/);
 const done=dispatchUniversalAction(packs,withName.s,{type:'chooseRetireBp',uid:withName.enemy.uid});
 assert.equal(done.players[0].front[0],null);
 assert.ok(done.players[0].outside.some(c=>c.uid===withName.enemy.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});
test('SLG-040 SPECIAL life trigger is OPTIONAL, independent of its printed BP-limited event text',()=>{
 let s=fresh(0),attack=take(s,0,'TTG-1-042'),flip=take(s,1,'SLG-1-040');
 attack.ready=true;s.players[0].front[0]=attack;
 const old=s.players[1].life.shift();s.players[1].deck.push(old);s.players[1].life.unshift(flip);
 s=advance(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attack.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending?.trigger,'special');
 const opts=legalUniversalActions(packs,s);
 assert.ok(opts.some(a=>a.mode==='skip'));
 assert.ok(opts.some(a=>a.mode==='special'&&a.uid===attack.uid));
 const rejected=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.ok(rejected.players[0].front[0]?.uid===attack.uid);
 const done=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:attack.uid},{actor:1});
 assert.equal(done.players[0].front[0],null);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('18 SLG profiles compile through the title-scoped V2 registry without legacy fallback',()=>{
 const row=listRegisteredV2Titles().find(x=>x.title==='solo-leveling');
 assert.equal(row.baselinePilots,0);
 assert.equal(row.newlyContributed,18);
 assert.equal(row.totalV2Cards,18);
 const registered=registeredV2TitlePack('solo-leveling');
 assert.ok(registered&&registered.kind==='ua-v2-pack');
 assert.equal(Object.keys(registered.cards).length,18);
 for(const id of SLG_V2_VERIFIED_IDS){
  assert.ok(registered.cards[id]);
  assert.equal(registered.cards[id].trigger,slg.cards[id].trigger);
  assert.deepEqual(registered.cards[id].effects,slg.cards[id].effects);
 }
 assert.ok(!registered.cards['SLG-1-047'],'not-yet ported green chained Raid must fail closed');
});

test('SLG-026 bounces itself if no other own printed-energy <=1 unit is present',()=>{
 let s=fresh(),source=take(s,1,'SLG-1-026');
 const costly=take(s,1,'SLG-1-016');costly.ready=true;s.players[1].energy[0]=costly;
 s.players[1].hand.push(source);s=advance(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 const after=dispatchUniversalAction(packs,s,play);
 assert.equal(after.pending,null);
 assert.ok(after.players[1].hand.some(c=>c.uid===source.uid));
 assert.equal(after.players[1].front.filter(Boolean).length,0);
 assert.equal(assertUniversalMatch(packs,after),true);
});
test('SLG-076 green SPECIAL event has real energy/AP cost and no false bonus without Jinwoo',()=>{
 let s=fresh(),source=take(s,1,'SLG-1-076'),target=take(s,0,'TTG-1-043');
 target.ready=true;target.buffs=[{bp:1000,untilTurn:s.turn}];s.players[0].front[0]=target;
 for(let i=0;i<4;i++){
  const x=take(s,1,'SLG-1-041');x.ready=true;s.players[1].energy[i]=x;
 }
 s.players[1].hand.push(source);s=advance(s,'main');
 const before=s.players[1].apCards.filter(c=>c.inPlay&&c.ready).length;
 const event=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===source.uid);
 assert.ok(event,'4 green energy is required for this event');
 const resolved=dispatchUniversalAction(packs,s,event);
 assert.equal(resolved.pending,null,'4000BP cannot be targeted without Jinwoo');
 assert.equal(resolved.players[1].apCards.filter(c=>c.inPlay&&c.ready).length,before-1);
 assert.equal(resolved.players[0].front[0].uid,target.uid);
 assert.ok(resolved.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,resolved),true);
});
test('SLG-076 SPECIAL Life Trigger can retire opposing front unit regardless of normal event BP threshold',()=>{
 let s=fresh(0),attacker=take(s,0,'TTG-1-042'),flip=take(s,1,'SLG-1-076');
 attacker.ready=true;s.players[0].front[0]=attacker;
 let old=s.players[1].life.shift();s.players[1].deck.push(old);s.players[1].life.unshift(flip);
 s=advance(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.trigger,'special');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.mode==='special'&&a.uid===attacker.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:attacker.uid},{actor:1});
 assert.equal(s.players[0].front[0],null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
