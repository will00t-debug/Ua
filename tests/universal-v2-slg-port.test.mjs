import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS,SOLO_LEVELING_MISSING_NUMBERS} from '../dist/solo-leveling.mjs';
import {TTG_CARDS} from '../dist/ttg-builder.mjs';
import {registeredV2TitlePack,listRegisteredV2Titles} from '../dist/universal-v2/title-packs/registry.mjs';
import {createSlgV2Pack,SLG_V2_VERIFIED_IDS} from '../dist/universal-v2/slg-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
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
test('registered SLG printed effect profiles do not equate to full 80-card migration and retain life trigger separately',()=>{
 assert.equal(SLG_V2_VERIFIED_IDS.length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
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
 assert.equal(slg.cards['SLG-1-019'].mainAbility.op,'outsideDiscardTraitToHand');
 assert.equal(slg.cards['SLG-1-019'].mainAbility.scope,'name');
 assert.equal(slg.cards['SLG-1-047'].phaseEffects[0].then[0].facedown,2);
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

test('registered SLG profiles compile through the title-scoped V2 registry without legacy fallback',()=>{
 const row=listRegisteredV2Titles().find(x=>x.title==='solo-leveling');
 assert.equal(row.baselinePilots,0);
 assert.equal(row.newlyContributed,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.equal(row.totalV2Cards,EXPECTED_V2_COUNTS['solo-leveling']);
 const registered=registeredV2TitlePack('solo-leveling');
 assert.ok(registered&&registered.kind==='ua-v2-pack');
 assert.equal(Object.keys(registered.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 for(const id of SLG_V2_VERIFIED_IDS){
  assert.ok(registered.cards[id]);
  assert.equal(registered.cards[id].trigger,slg.cards[id].trigger);
  assert.deepEqual(registered.cards[id].effects,slg.cards[id].effects);
 }
 assert.equal(registered.cards['SLG-1-047'].effects.onAttack[0].op,'drawTuckHandUnder');
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

test('SLG-1-068 mandatory onPlay bounce only offers another eligible printed-energy <=1 own UID',()=>{
 let state=fresh(),src=take(state,1,'SLG-1-068');
 const ownLow=take(state,1,'SLG-1-005'),ownHigh=take(state,1,'SLG-1-016');
 const green=take(state,1,'SLG-1-041'),enemy=take(state,0,'TTG-1-005');
 green.ready=true;state.players[1].energy[0]=green;
 state.players[1].front[0]=ownLow;state.players[1].front[1]=ownHigh;
 state.players[0].front[0]=enemy;state.players[1].hand.push(src);
 state=advance(state,'main');
 const play=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front');
 assert.ok(play,'real green energy/AP lets 068 enter a free front slot');
 state=dispatchUniversalAction(packs,state,play);
 assert.equal(state.pending?.kind,'effect-bounce-own');
 assert.deepEqual(legalUniversalActions(packs,state),[{type:'chooseOwnBounce',uid:ownLow.uid}]);
 for(const uid of [ownHigh.uid,green.uid,enemy.uid,null]){
  assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseOwnBounce',uid}),/not currently legal/);
 }
 state=dispatchUniversalAction(packs,state,{type:'chooseOwnBounce',uid:ownLow.uid});
 assert.ok(state.players[1].hand.some(c=>c.uid===ownLow.uid));
 assert.ok(state.players[1].front.some(c=>c?.uid===src.uid));
 assert.ok(state.players[1].front.some(c=>c?.uid===ownHigh.uid));
 assert.equal(assertUniversalMatch(packs,state),true);
});
test('SLG-1-043 ACTIVE life trigger is optional, affects only own character and adds exactly +3000 BP',()=>{
 let s=fresh(0),a=take(s,0,'TTG-1-042'),flip=take(s,1,'SLG-1-043');
 const target=take(s,1,'SLG-1-005');
 a.ready=true;target.ready=false;s.players[0].front[0]=a;s.players[1].front[0]=target;
 const old=s.players[1].life.shift();s.players[1].deck.push(old);s.players[1].life.unshift(flip);
 s=advance(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:a.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending.trigger,'active');
 const available=legalUniversalActions(packs,s);
 assert.ok(available.some(c=>c.mode==='skip'));
 assert.ok(available.some(c=>c.mode==='active'&&c.uid===target.uid));
 assert.ok(!available.some(c=>c.uid===a.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:a.uid},{actor:1}),/not currently legal/);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[1].front[0].ready,false);
 const selected=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:target.uid},{actor:1});
 assert.equal(selected.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,selected,selected.players[1].front[0]),5000);
 assert.equal(assertUniversalMatch(packs,selected),true);
});
test('SLG-1-015 GET life adds exact revealed physical card to hand; skip retains outside',()=>{
 let s=fresh(0),attacker=take(s,0,'TTG-1-042'),flip=take(s,1,'SLG-1-015');
 attacker.ready=true;s.players[0].front[0]=attacker;
 const old=s.players[1].life.shift();s.players[1].deck.push(old);s.players[1].life.unshift(flip);
 s=advance(s,'attack');s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.trigger,'get');
 const modes=legalUniversalActions(packs,s).map(a=>a.mode);
 assert.ok(modes.includes('skip')&&modes.includes('get'));
 const declined=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.ok(declined.players[1].outside.some(c=>c.uid===flip.uid));
 const accepted=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(accepted.players[1].hand.some(c=>c.uid===flip.uid));
 assert.ok(!accepted.players[1].outside.some(c=>c.uid===flip.uid));
 assert.equal(assertUniversalMatch(packs,accepted),true);
});

test('V2-C card-by-card evidence CSV remains complete, disjoint and tracks the resumed integration separately from historical PR70',()=>{
 const inspect=(title,catalogue,registered,baseline)=>{
  const rows=readFileSync(new URL('../audit/v2-c-'+title+'-status.csv',import.meta.url),'utf8')
   .trimEnd().split('\n');
  assert.ok(rows[0].includes('integration_scope_v2_c'));
  assert.ok(rows[0].includes('life_trigger_v2_port'));
  const ids=new Set(),pilots=[],added=[],blocked=[],registeredIds=new Set(Object.keys(registered.cards));
  for(const row of rows.slice(1)){
   const m=row.match(/^"([A-Z]+-1-\d{3})","(?:[^"]|"")*","([^"]+)","([^"]+)","([^"]+)"/);
   const scope=row.match(/,"(pr70_baseline_pilot|pr70_integrated_contribution|codex_integrated_contribution|not_implemented_any_branch)","([^"]*)"$/);
   assert.ok(m&&scope,'invalid independent evidence row: '+row);
   const [,id,body,trigger,life]=m;
   assert.ok(!ids.has(id),'duplicate ledger ID '+id);ids.add(id);
   assert.ok(['none','draw','get','active','final','special','raid','color'].includes(trigger));
   if(body==='existing_v2_pilot'){
    assert.equal(scope[1],'pr70_baseline_pilot');pilots.push(id);
   }else if(body.startsWith('v2_batch')){
    assert.equal(scope[1],(['TTG-1-020','TTG-1-067','TTG-1-028','TTG-1-007','TTG-1-013','TTG-1-002','TTG-1-015','TTG-1-022','TTG-1-018','TTG-1-006','TTG-1-077','TTG-1-010','TTG-1-023','TTG-1-053','TTG-1-063','TTG-1-057','TTG-1-071','TTG-1-054','TTG-1-055','TTG-1-026','TTG-1-081','TTG-1-011','TTG-1-016','TTG-1-035','TTG-1-041','TTG-1-048','TTG-1-076','TTG-1-008','TTG-1-025','TTG-1-030','TTG-1-039','TTG-1-044','TTG-1-050','TTG-1-029','TTG-1-003','TTG-1-017','TTG-1-040','TTG-1-068','TTG-1-070','TTG-1-080','TTG-1-060','TTG-1-059','TTG-1-058','TTG-1-069','TTG-1-024','TTG-1-075','TTG-1-021','TTG-1-004','TTG-1-012','TTG-1-027','TTG-1-031','TTG-1-032','TTG-1-033','TTG-1-034','TTG-1-056','TTG-1-061','TTG-1-062','TTG-1-074','SLG-1-021','SLG-1-070','SLG-1-036','SLG-1-037','SLG-1-018','SLG-1-012','SLG-1-001','SLG-1-010','SLG-1-002','SLG-1-007','SLG-1-013','SLG-1-014','SLG-1-008','SLG-1-009','SLG-1-004','SLG-1-042','SLG-1-053','SLG-1-025','SLG-1-023','SLG-1-056','SLG-1-069','SLG-1-062','SLG-1-065','SLG-1-027','SLG-1-072','SLG-1-046','SLG-1-030','SLG-1-028','SLG-1-063','SLG-1-054','SLG-1-017','SLG-1-074','SLG-1-071','SLG-1-050','SLG-1-080','SLG-1-035','SLG-1-024','SLG-1-067','SLG-1-057','SLG-1-003','SLG-1-039','SLG-1-077','SLG-1-019','SLG-1-060','SLG-1-033','SLG-1-029','SLG-1-031','SLG-1-011','SLG-1-044','SLG-1-059','SLG-1-061','SLG-1-020','SLG-1-047','SLG-1-048','SLG-1-049','SLG-1-051','SLG-1-022','SLG-1-034','SLG-1-058','SLG-1-064','SLG-1-073','SLG-1-075'].includes(id))?'codex_integrated_contribution':'pr70_integrated_contribution');added.push(id);
   }else{
    assert.equal(body,'not_ported');assert.equal(scope[1],'not_implemented_any_branch');
    assert.equal(life,trigger==='none'?'not_applicable':'not_registered');
    blocked.push(id);
   }
  }
  assert.deepEqual([...ids].sort(),catalogue.map(c=>c.id).sort());
  assert.deepEqual([...pilots,...added].sort(),[...registeredIds].sort());
  assert.equal(pilots.length,baseline);
  assert.equal(added.length,registeredIds.size-baseline);
  assert.equal(blocked.length,catalogue.length-registeredIds.size);
  assert.ok(blocked.every(id=>!registeredIds.has(id)));
 };
 inspect('ttg',TTG_CARDS,registeredV2TitlePack('gurren-lagann'),20);
 inspect('slg',SOLO_LEVELING_CARDS,registeredV2TitlePack('solo-leveling'),0);
});

test('SLG-068 eligible low-cost ENERGY-line target is bounceable; no fake play from outside',()=>{
 let state=fresh(),source=take(state,1,'SLG-1-068');
 const low=take(state,1,'SLG-1-045'),green=take(state,1,'SLG-1-041');
 low.ready=true;green.ready=true;state.players[1].energy[0]=low;state.players[1].energy[1]=green;
 state.players[1].hand.push(source);state=advance(state,'main');
 assert.ok(!legalUniversalActions(packs,state).some(a=>a.type==='play'&&a.uid===low.uid));
 const play=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 const next=dispatchUniversalAction(packs,state,play);
 assert.equal(next.pending?.kind,'effect-bounce-own');
 assert.deepEqual(legalUniversalActions(packs,next),[{type:'chooseOwnBounce',uid:low.uid}]);
 const done=dispatchUniversalAction(packs,next,{type:'chooseOwnBounce',uid:low.uid});
 assert.equal(done.players[1].energy[0],null);
 assert.ok(done.players[1].hand.some(c=>c.uid===low.uid));
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('SLG-014 recovered-self optional ENERGY-only REST is now source verified',()=>{
 const pack=registeredV2TitlePack('solo-leveling');
 assert.equal(pack.cards['SLG-1-014'].frontForbidden,true);
 const invalid={...slgDeck,'SLG-1-005':3,'SLG-1-014':1};
 assert.equal(Object.values(invalid).reduce((n,k)=>n+k,0),50);
 assert.deepEqual(validateUniversalDeck(pack,invalid),[]);
});

test('SLG-036 and 037 have distinct complete event-body programs and separate Life icons',()=>{
 const pack=registeredV2TitlePack('solo-leveling');
 assert.deepEqual(pack.cards['SLG-1-036'].effects.onPlay,[{op:'drawDiscard',count:3,discardCount:2}]);
 assert.deepEqual(pack.cards['SLG-1-037'].effects.onPlay,[
  {op:'recoverOutsidePrintedBp',bp:4000,optional:true},{op:'draw',count:1}
 ]);
 const printed=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
 assert.equal(printed['SLG-1-036'].trigger,'active');
 assert.equal(printed['SLG-1-037'].trigger,'draw');
 assert.equal(pack.cards['SLG-1-037'].trigger,'draw');
});
