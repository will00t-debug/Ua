import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
// Preserved E-line independent scenarios from c3b7dd658b83c964698062bfbd2ff15c89775667.
// Roster assertions retargeted; former unmerged IDs now have positive checks,
// with still-unported cards retained as negative controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {registeredV2TitlePack,listRegisteredV2Titles} from '../dist/universal-v2/title-packs/registry.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview,
 publicPreviewActionLabel} from '../dist/universal-v2/preview-replay.mjs';

const titleIds=['bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei'];
const presets=createAllV2PreviewRealDecks();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Source physical missing: '+id);
}
function phase(s,packs,wanted){
 for(let n=0;n<4&&s.phase!==wanted;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,wanted);
 return s;
}
function playFixture(id,deckKey,genId,seed){
 const d=presets[deckKey],pack=d.pack,packs=[pack,pack];
 const counts={...d.counts};
 if(!counts[id]){
  const replaced=Object.entries(counts).find(([key,n])=>n>=4&&key!==genId);
  if(!replaced)throw Error('No replaceable base');
  delete counts[replaced[0]];counts[id]=4;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 const source=take(s,0,id);s.players[0].hand.push(source);
 if(genId){
  const gen=take(s,0,genId);gen.ready=true;s.players[0].energy[0]=gen;
 }
 s=phase(s,packs,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'actual legal play available for '+id);
 return {s,packs,source,play};
}
test('new stable registry exact 255 IDs across five independently approved official title packs',()=>{
 const expected=Object.values(EXPECTED_V2_COUNTS),registered=listRegisteredV2Titles();
 assert.deepEqual(registered.map(t=>t.totalV2Cards),expected);
 const inventory=v2AllTitleInventory();
 assert.equal(inventory.totals.total,700);
 assert.equal(inventory.totals.pilotImplemented,EXPECTED_V2_TOTAL);
 assert.equal(inventory.totals.blocked,700-EXPECTED_V2_TOTAL);
 for(let i=0;i<titleIds.length;i++){
  const title=titleIds[i],pack=registeredV2TitlePack(title),ids=Object.keys(pack.cards).sort();
  assert.equal(ids.length,expected[i]);
  assert.equal(new Set(ids).size,ids.length);
  // Explicit, separate manifest catches substituted IDs even if card count unchanged.
  const extra=EXPECTED_V2_ADDED_CARD_IDS[title];
  for(const id of extra)assert.ok(pack.cards[id],title+'/'+id+' vanished despite same total');
 }
 for(const id of ['BLC-1-059','BLC-1-077','BLC-2-055','BLC-3-006','BLC-3-009','BLC-4-013'])
  assert.ok(registeredV2TitlePack('bleach').cards[id],'newly integrated printed identity '+id);
});
test('BLC-2-055 bottom/top alternate private outcomes indistinguishable to opponent, full deck order golden oracle',()=>{
 const {s,packs,play}=playFixture('BLC-2-055','bleach-purple',null,205516);
 const pending=dispatchUniversalAction(packs,s,play),before=pending.players[0].deck.map(x=>x.uid);
 assert.equal(pending.pending?.kind,'private-top-place');
 assert.ok(before.length>2);
 const publicBefore=universalPublicView(packs,pending,1);
 const ownChoices=universalPrivateChoices(packs,pending,0);
 assert.equal(universalPrivateChoices(packs,pending,1),null);
 assert.equal(ownChoices?.options?.length,2);
 assert.ok(ownChoices.options.every(x=>x.card?.cardId===pending.players[0].deck[0].cardId));
 const initial=structuredClone(pending);
 for(const [mode,wanted] of [
  ['top',before],['bottom',[...before.slice(1),before[0]]]
 ]){
  const q=dispatchUniversalAction(packs,pending,{type:'chooseTopCard',mode},{actor:0});
  assert.deepEqual(q.players[0].deck.map(x=>x.uid),wanted,'oracle: deck order');
  assert.equal(q.players[0].outside.length,pending.players[0].outside.length);
  assert.equal(q.players[0].hand.length,pending.players[0].hand.length);
  assert.equal(assertUniversalMatch(packs,q),true);
  assert.ok(!JSON.stringify(universalPublicView(packs,q,1)).includes(before[0]));
 }
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseTopCard',mode:'outside'},{actor:0}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseTopCard',mode:'bottom'},{actor:1}),/Wrong player/);
 assert.deepEqual(pending,initial);
 assert.equal(publicBefore.players[0].deckCount,pending.players[0].deck.length);
});
test('BLC-4-013 cross-title secrecy and forged uninspected UID rejected without changing AP or physical cards',()=>{
 const d=presets['bleach-green'],foe=presets['mushoku-tensei'],packs=[d.pack,foe.pack];
 const counts={...d.counts};delete counts['BLC-1-067'];counts['BLC-4-013']=4;
 delete counts['BLC-1-068'];counts['BLC-1-002']=4;
 assert.deepEqual(validateUniversalDeck(d.pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,foe.counts],seed:401366,first:0});
 const card=take(s,0,'BLC-4-013'),generator=take(s,0,'BLC-1-002');
 generator.ready=true;s.players[0].energy[0]=generator;s.players[0].hand.push(card);
 s=phase(s,packs,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.slot===0&&a.line==='front');
 assert.ok(play);
 let q=dispatchUniversalAction(packs,s,play),seen=q.pending?.uids||[];
 assert.equal(q.pending?.kind,'effect-top-inspect-many');assert.equal(seen.length,2);
 const foreign=q.players[1].hand[0].uid,uninspected=q.players[0].deck[3].uid;
 const before=structuredClone(q),ap=q.players[0].apCards.filter(x=>x.ready).length;
 for(const forged of [foreign,uninspected,'0-999999']){
  assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:forged},{actor:0}),/not currently legal/);
  assert.deepEqual(q,before);
 }
 const enemyView=universalPublicView(packs,q,1);
 assert.equal(enemyView.players[0].hand,null);
 assert.equal(enemyView.players[0].deckCount,q.players[0].deck.length);
 for(const uid of seen)assert.ok(!JSON.stringify(enemyView).includes(uid));
 q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:seen[0]},{actor:0});
 assert.ok(q.pending?.selected?.includes(seen[0]),'selected UID stays in pending until atomic completion');
 const unchanged=structuredClone(q);
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:seen[0]},{actor:0}),/not currently legal/);
 assert.deepEqual(q,unchanged);
 q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid:null},{actor:0});
 assert.equal(q.pending?.kind,'effect-top-order');
 q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid:seen[1]},{actor:0});
 assert.equal(q.pending,null);
 assert.ok(q.players[0].outside.some(x=>x.uid===seen[0]),'outside becomes public on completed private choice');
 assert.equal(q.players[0].apCards.filter(x=>x.ready).length,ap,'private choices must not spend extra AP');
 assert.equal(assertUniversalMatch(packs,q),true);
});
test('SLG-1-040 SPECIAL life: cross-title attacker, target and optional decline; AP-free, forged target rejected',()=>{
 const d=presets['solo-leveling'],f=presets['bleach-purple'],packs=[d.pack,f.pack];
 let s=newUniversalMatch(packs,{decks:[d.counts,f.counts],first:1,seed:376040});
 const life=take(s,0,'SLG-1-040'),attacker=take(s,1,'BLC-1-039');
 const target=take(s,1,'BLC-1-039');
 attacker.ready=true;target.ready=true;
 s.players[1].front[0]=attacker;s.players[1].front[1]=target;
 const displaced=s.players[0].life.shift();s.players[0].deck.push(displaced);s.players[0].life.unshift(life);
 s=phase(s,packs,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'special');
 const options=legalUniversalActions(packs,s);
 assert.ok(options.some(a=>a.mode==='skip'));
 assert.ok(options.some(a=>a.mode==='special'&&a.uid===target.uid));
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 const snapshot=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:'1-fake'},{actor:0}),/not currently legal/);
 assert.deepEqual(s,snapshot);
 const skip=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skip.players[1].front[1].uid,target.uid);
 const yes=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:target.uid},{actor:0});
 assert.equal(yes.players[1].front[1],null);
 assert.ok(yes.players[1].outside.some(c=>c.uid===target.uid));
 assert.equal(yes.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.ok(yes.players[0].outside.some(c=>c.uid===life.uid));
 assert.equal(assertUniversalMatch(packs,yes),true);
 assert.equal(assertUniversalMatch(packs,skip),true);
});
test('public-only AI action transcript cannot surface hidden card via private top or discard UID',()=>{
 const mine=presets['bleach-purple'],foe=presets['mushoku-tensei'],packs=[mine.pack,foe.pack];
 const counts={...mine.counts};delete counts['BLC-1-039'];counts['BLC-2-055']=4;
 assert.deepEqual(validateUniversalDeck(mine.pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,foe.counts],seed:568006,first:0});
 const source=take(s,0,'BLC-2-055');
 s.players[0].hand.push(source);s=phase(s,packs,'main');
 const act=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.slot===0&&a.line==='front');
 assert.ok(act);
 const q=dispatchUniversalAction(packs,s,act);
 const hidden=q.players[0].deck[0].uid;
 const own=universalPrivateChoices(packs,q,0);
 const opp=universalPublicView(packs,q,1);
 assert.ok(own.options.some(o=>o.card));
 assert.equal(universalPrivateChoices(packs,q,1),null);
 assert.ok(!JSON.stringify(opp).includes(hidden));
 // Debug replay is intentionally private. Public spectator captions must not
 // accidentally stringify the private card ID or UID selected by the AI.
 const label=publicPreviewActionLabel(packs,q,q,{type:'chooseTopCard',mode:'bottom'},1);
 assert.ok(!label.includes(hidden));
 assert.ok(!label.includes(q.players[0].deck[0].cardId));
 const tape=makeUniversalPreviewReplay(packs,{decks:[counts,foe.counts],seed:568006,first:0});
 const honest=appendUniversalReplay(tape,{type:'next'},0);
 assert.equal(replayUniversalPreview(packs,honest).phase,'move');
 const forged=appendUniversalReplay(tape,{type:'chooseTopCard',mode:'bottom'},0);
 assert.throws(()=>replayUniversalPreview(packs,forged),/not currently legal/);
});

test('BLC-1-030 printed mandatory REST cost is rejected pre-AP without opponent, accepts already-REST MST foe (Q1119/Q91)',()=>{
 const d=presets['bleach-green'],foe=presets['mushoku-tensei'],packs=[d.pack,foe.pack];
 const counts={...d.counts};
 for(const id of ['BLC-1-067','BLC-1-068','BLC-1-071'])delete counts[id];
 for(const id of ['BLC-1-030','BLC-1-002','BLC-1-012'])counts[id]=4;
 assert.deepEqual(validateUniversalDeck(d.pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,foe.counts],seed:300319,first:0});
 const jail=take(s,0,'BLC-1-030'),gen1=take(s,0,'BLC-1-002'),gen2=take(s,0,'BLC-1-012');
 gen1.ready=true;gen2.ready=true;s.players[0].energy[0]=gen1;s.players[0].energy[1]=gen2;s.players[0].hand.push(jail);
 s=phase(s,packs,'main');
 const before=structuredClone(s),ap=s.players[0].apCards.filter(x=>x.ready).length;
 const forbidden={type:'event',uid:jail.uid};
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===jail.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,forbidden,{actor:0}),/not currently legal/);
 assert.deepEqual(s,before);
 const enemy=take(s,1,'MST-1-001');enemy.ready=false;s.players[1].front[0]=enemy;
 assert.equal(assertUniversalMatch(packs,s),true);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===jail.uid);
 assert.ok(action,'Q91 already REST enemy is still mandatory legal target');
 const waiting=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(waiting.pending?.kind,'effect-rest-bp');
 assert.equal(waiting.players[0].apCards.filter(x=>x.ready).length,ap-1);
 assert.ok(waiting.players[0].outside.some(c=>c.uid===jail.uid));
 assert.deepEqual(legalUniversalActions(packs,waiting),[{type:'chooseRestBp',uid:enemy.uid}]);
 const snapshot=structuredClone(waiting);
 assert.throws(()=>dispatchUniversalAction(packs,waiting,{type:'chooseRestBp',uid:null},{actor:0}),/not currently legal/);
 assert.deepEqual(waiting,snapshot);
 const done=dispatchUniversalAction(packs,waiting,{type:'chooseRestBp',uid:enemy.uid},{actor:0});
 assert.equal(done.players[1].front[0].ready,false);
 assert.equal(done.pending,null);
 assert.equal(assertUniversalMatch(packs,done),true);
});
test('new handoff cards are registered while unsupported successors remain fail-closed',()=>{
 assert.ok(registeredV2TitlePack('bleach').cards['BLC-4-023']);
 assert.ok(registeredV2TitlePack('gurren-lagann').cards['TTG-1-077']);
 assert.deepEqual(registeredV2TitlePack('bleach').cards['BLC-1-005'].mainAbility,
  {op:'restSelfThenRestOppFrontOne',frontOnly:true});
 assert.ok(registeredV2TitlePack('gurren-lagann').cards['TTG-1-010']);
 assert.ok(registeredV2TitlePack('gurren-lagann').cards['TTG-1-023']);
});
