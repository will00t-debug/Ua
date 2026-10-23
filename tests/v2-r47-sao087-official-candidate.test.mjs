import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedSaoV2Cards} from '../dist/universal-v2/sao-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {SAO_Q978_SELF_EVENT_TAX,selectionHandDiscardTaxPlan}
 from '../dist/universal-v2/selection-hand-tax.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalImpact,
 universalAttackDamage,universalBp,assertUniversalMatch,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-087');
const candidate={id:'SAO-1-087',name:source.nameJa,type:'character',color:'green',
 energy:7,ap:1,bp:5000,gen:1,trigger:'raid',traits:['GGO'],
 implementation:'dsl',effects:{},raidName:'キリト',printedImpact:1,
 otherOwnBattleWonDamageTwo:true,
 selectionHandDiscardTax:{...SAO_Q978_SELF_EVENT_TAX,
  sourceTypes:[...SAO_Q978_SELF_EVENT_TAX.sourceTypes]},
 mainAbility:{op:'fieldOnceBuffOther',lines:'field',oncePerTurn:true,bp:1000}};
const sao=createUniversalPack({id:'sword-art-online',cards:[...verifiedSaoV2Cards().filter(c=>c.id!=='SAO-1-087'),candidate]});
const bleach=createBleachV2Pack();
const ids=['SAO-1-001','SAO-1-068','SAO-1-075','SAO-1-095','SAO-1-073',
 'SAO-2-035','SAO-2-047','SAO-1-004','SAO-1-019','SAO-1-020',
 'SAO-1-051','SAO-1-069','SAO-1-087'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
const bleachIds=['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-039',
 'BLC-1-035','BLC-2-008','BLC-1-089','BLC-2-020','BLC-2-029',
 'BLC-4-062','BLC-1-102','BLC-1-030'];
const bleachDeck={...Object.fromEntries(bleachIds.map(id=>[id,4])),'BLC-1-034':2};
assert.deepEqual(validateUniversalDeck(sao,deck),[]);
assert.deepEqual(validateUniversalDeck(bleach,bleachDeck),[]);
function pull(s,p,id){for(const z of ['hand','deck','life','outside']){
 const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
 if(i>=0)return arr.splice(i,1)[0];
}throw Error('Missing legal physical '+id);}
function put(s,p,id,line,slot,ready=true){
 const c=pull(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
const run=(packs,s,a)=>dispatchUniversalAction(packs,s,a);
test('SAO-1-087 formal registry exactly matches independently built all-printed-effects candidate',()=>{
 const d=registeredV2TitlePack('sword-art-online').cards['SAO-1-087'];
 assert.ok(d,'official printed source must be formally registered');
 for(const field of ['name','color','type','energy','ap','bp','gen','traits','trigger',
  'raidName','printedImpact','printedAttackDamage','otherOwnBattleWonDamageTwo',
  'selectionHandDiscardTax','mainAbility','effects'])
  assert.deepEqual(d[field],sao.cards['SAO-1-087'][field],field+' drift');
});
test('Candidate identity exactly official Q763/Q978 full print matching registry',()=>{
 assert.equal(source.number,'UA15BT/SAO-1-087');
 assert.deepEqual([source.energy,source.ap,source.bp,source.gen,source.color,source.trigger],
  [7,1,5000,1,'green','raid']);
 for(const part of ['【レイド】〈キリト〉','【インパクト（1）】',
  '他のキャラがバトルに勝利','【ダメージ（2）】','イベントカードの効果',
  '【ターン1】','BP+1000'])
  assert.ok(source.effectJa.includes(part),part);
 assert.equal(sao.cards['SAO-1-087'].printedImpact,1);
 assert.equal(sao.cards['SAO-1-087'].printedAttackDamage,1);
 assert.equal(sao.cards['SAO-1-087'].otherOwnBattleWonDamageTwo,true);
 assert.deepEqual(sao.cards['SAO-1-087'].selectionHandDiscardTax.sourceTypes,['event']);
});
test('Actual other-own attacker battle win on equal BP gives candidate DAMAGE2, not extra Impact',()=>{
 const packs=[sao,sao];let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:470871});
 const watcher=put(s,0,'SAO-1-087','front',1),attacker=put(s,0,'SAO-1-068','front',0);
 const blocker=put(s,1,'SAO-1-068','front',0);
 s.active=0;s.phase='attack';
 s=run(packs,s,{type:'attack',uid:attacker.uid});
 s=run(packs,s,{type:'chooseBlock',uid:blocker.uid});
 const live=s.players[0].front.find(c=>c?.uid===watcher.uid);
 assert.equal(universalAttackDamage(packs,s,live),2);
 assert.equal(universalImpact(packs,s,live),1);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),1);
 const expired=structuredClone(s);expired.turn++;
 assert.equal(universalAttackDamage(packs,expired,expired.players[0].front[1]),1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Real MAIN Turn1 from ENERGY without REST/AP, other own BP only, AI and expiry',()=>{
 const packs=[sao,sao];let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:470872});
 const source=put(s,0,'SAO-1-087','energy',0,false);
 const other=put(s,0,'SAO-1-068','front',0);
 s.phase='main';s.active=0;
 const act={type:'activate',uid:source.uid,mode:'fieldOnceBuffOther'};
 assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(act)));
 s=run(packs,s,act);
 assert.equal(s.pending.kind,'effect-buff-own');
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 assert.throws(()=>run(packs,s,{type:'chooseOwnBuff',uid:source.uid}),
  /not currently legal/);
 s=run(packs,JSON.parse(JSON.stringify(s)),{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2500);
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),5000);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
 const later=structuredClone(s);later.turn++;
 assert.equal(universalBp(packs,later,later.players[0].front[0]),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Real BLEACH EVENT Q978 forces physical own-hand payment before choosing Kirito',()=>{
 const packs=[sao,bleach];let s=newUniversalMatch(packs,{decks:[deck,bleachDeck],first:1,seed:470873});
 const watcher=put(s,0,'SAO-1-087','front',0);
 const event=pull(s,1,'BLC-1-030');
 const funding=pull(s,1,'BLC-1-001');
 s.players[1].outside.push(...s.players[1].hand.splice(0));
 s.players[1].hand.push(event,funding);
 put(s,1,'BLC-1-002','energy',0);
 put(s,1,'BLC-1-012','energy',1);
 s.active=1;s.phase='main';s.players[1].ownTurns=2;
 for(const ap of s.players[1].apCards){ap.inPlay=true;ap.ready=true;}
 assert.equal(selectionHandDiscardTaxPlan(packs,s,1,watcher.uid,'event').cost,1);
 assert.equal(selectionHandDiscardTaxPlan(packs,s,1,watcher.uid,'character').cost,0);
 const play={type:'event',uid:event.uid};
 assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(play)));
 s=run(packs,s,play);
 const select=legalUniversalActions(packs,s).find(a=>a.uid===watcher.uid);
 assert.ok(select);
 s=run(packs,s,select);
 assert.equal(s.pending?.kind,'effect-selection-hand-payment');
 assert.equal(universalPrivateChoices(packs,s,0),null);
 const options=legalUniversalActions(packs,s);
 assert.deepEqual(options,[{type:'chooseSelectionTaxDiscard',uid:funding.uid}]);
 s=run(packs,JSON.parse(JSON.stringify(s)),options[0]);
 assert.ok(s.players[1].outside.some(c=>c.uid===funding.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===funding.uid&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='payment'));
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Genuine paid RAID and RAID LIFE remain independently legal without conflating Impact2',()=>{
 const packs=[sao,sao];let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:470874});
 const base=put(s,0,'SAO-1-001','front',0);
 const top=pull(s,0,'SAO-1-087');
 s.players[0].hand.push(top);
 for(const [i,id] of ['SAO-1-075','SAO-1-095','SAO-1-073'].entries())
  put(s,0,id,'energy',i);
 s.active=0;s.phase='main';s.players[0].ownTurns=2;
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(raid,'green generated energy >=7 must allow actual Raid');
 s=run(packs,s,raid);
 assert.ok(s.players[0].front.some(c=>c?.uid===top.uid&&c.ready));
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),1);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),1);
 assert.equal(assertUniversalMatch(packs,s),true);
 const copy=pull(s,0,'SAO-1-087');s.players[0].outside.push(copy);
 s.pending={kind:'life-trigger',player:0,uid:copy.uid,trigger:'raid'};
 const actions=legalUniversalActions(packs,s);
 assert.ok(actions.some(a=>a.type==='chooseTrigger'&&a.mode==='get'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
