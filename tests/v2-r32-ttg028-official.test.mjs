import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Source-pinned formal registry/manifest acceptance:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-028
const record=TTG_BY_ID['TTG-1-028'];
const pilot={id:record.id,name:record.nameJa,energy:4,ap:1,bp:4000,gen:1,color:'green',
 type:'character',traits:['大グレン団','ガンメン'],trigger:'raid',
 raidName:'シモン',raidBaseNames:['シモン','ヴィラル'],implementation:'dsl',
 effects:{onPlay:[{op:'draw',count:1},
  {op:'forbidAttackOppFrontOne',optional:true,ownTurnOnly:true,until:'nextOwnTurnStart'}]}};
const pack=registeredV2TitlePack('gurren-lagann');
assert.deepEqual(pack.cards['TTG-1-028'].effects.onPlay,pilot.effects.onPlay);
const sao=registeredV2TitlePack('sword-art-online'),packs=[pack,sao];
const ttgIds=['TTG-1-028','TTG-1-010','TTG-1-002','TTG-1-001','TTG-1-005','TTG-1-006',
 'TTG-1-007','TTG-1-009','TTG-1-014','TTG-1-018','TTG-1-019','TTG-1-023','TTG-1-022'];
const saoIds=['SAO-1-001','SAO-1-005','SAO-1-010','SAO-1-011','SAO-1-004','SAO-1-019',
 'SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const decks=[ttgIds,saoIds].map(ids=>{
 const d=Object.fromEntries(ids.map(id=>[id,4]));d[ids.at(-1)]=2;return d;
});
for(let p=0;p<2;p++)assert.deepEqual(validateUniversalDeck(packs[p],decks[p]),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error(id);
}
function setup(){
 let s=newUniversalMatch(packs,{decks,first:0,seed:32028});
 const source=take(s,0,'TTG-1-028'),base=take(s,0,'TTG-1-010'),
  enemy=take(s,1,'SAO-1-001'),other=take(s,1,'SAO-1-005');
 s.players[0].hand.push(source);
 base.fieldEntryStamp=s.nextFieldEntryStamp++;base.ready=true;s.players[0].front[0]=base;
 for(let i=0;i<4;i++){
  const energy=take(s,0,'TTG-1-001');
  energy.fieldEntryStamp=s.nextFieldEntryStamp++;energy.ready=true;
  s.players[0].energy[i]=energy;
 }
 for(const [card,slot] of [[enemy,0],[other,1]]){
  card.fieldEntryStamp=s.nextFieldEntryStamp++;card.ready=true;s.players[1].front[slot]=card;
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const raid=legalUniversalActions(packs,s).find(a=>
  a.type==='raid'&&a.uid===source.uid&&a.baseUid===base.uid);
 assert.ok(raid,'paid Raid legal only with printed 4 green energy/AP and Simon');
 return {s,raid,source,base,enemy,other};
}
test('R32 registered real TTG-028: legal paid Raid draws exactly 1, targets opponent FRONT, AI legal',()=>{
 let {s,raid,source,enemy,other}=setup();
 const handBefore=s.players[0].hand.length,deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,raid);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.pending.kind,'effect-attack-ban');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),[null,enemy.uid,other.uid]);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  assert.notEqual(ai.uid,null);
 }
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const old=structuredClone(s);
 for(const uid of ['1-forged',source.uid,s.players[1].hand[0].uid]){
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseAttackBan',uid}),/not currently legal/);
  assert.deepEqual(s,old);
 }
 s=dispatchUniversalAction(packs,JSON.parse(JSON.stringify(s)),{type:'chooseAttackBan',uid:enemy.uid});
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates.filter(x=>x.kind==='cannotAttack').length,1);
 assert.equal(s.continuousStates[0].targetUid,enemy.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R32 registered optional 0 grants nothing; forged pending stamp and unsupported DSL keys fail closed',()=>{
 let {s,raid}=setup();
 s=dispatchUniversalAction(packs,s,raid);
 const orig=structuredClone(s);
 for(const patch of [{stamp:0},{stamp:9999}]){
  const bad=structuredClone(orig);
  bad.pending.choices[0].stamp=patch.stamp;
  assert.throws(()=>assertUniversalMatch(packs,bad),/Invalid attack-prohibition pending/);
 }
 s=dispatchUniversalAction(packs,s,{type:'chooseAttackBan',uid:null});
 assert.equal(s.pending,null);assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
 for(const invalid of [
  {op:'forbidAttackOppFrontOne',optional:true,ownTurnOnly:false,until:'nextOwnTurnStart'},
  {op:'forbidAttackOppFrontOne',optional:true,ownTurnOnly:true,until:'endOfTurn'},
  {op:'forbidAttackOppFrontOne',optional:false,ownTurnOnly:true,until:'nextOwnTurnStart'},
  {op:'forbidAttackOppFrontOne',optional:true,ownTurnOnly:true,until:'nextOwnTurnStart',trait:'X'}
 ]){
  assert.throws(()=>createUniversalPack({id:'bad-ban',cards:[
   {...pilot,effects:{onPlay:[invalid]}}]}),/invalid temporary attack prohibition/);
 }
});

test('R32 official full print, raid trigger, strict independent ID and source evidence',async()=>{
 const {EXPECTED_V2_IDS}=await import('./fixtures/v2-integrated-id-manifest.mjs');
 assert.equal(EXPECTED_V2_IDS['gurren-lagann'].includes('TTG-1-028'),true);
 assert.deepEqual([record.nameJa,record.color,record.energy,record.ap,record.bp,
  record.gen,record.trigger],['グレンラガン','green',4,1,4000,1,'raid']);
 assert.equal(record.effect.includes('登場抽1張'),true);
 assert.ok(record.effect.includes('己方回合可使敵方前線最多1名角色直到下次己方回合開始不能攻擊'));
 assert.deepEqual(pack.cards['TTG-1-028'].raidBaseNames,['シモン','ヴィラル']);
 assert.deepEqual(pack.cards['TTG-1-028'].traits,['大グレン団','ガンメン']);
});
