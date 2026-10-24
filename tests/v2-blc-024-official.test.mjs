import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalAttackDamage,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Official card UA08BT/BLC-1-024, FAQ Q547-Q551
const pack=registeredV2TitlePack('bleach'),packs=[pack,pack];
const ids=['BLC-1-024','BLC-1-017','BLC-1-021','BLC-1-002','BLC-1-005',
 'BLC-1-012','BLC-1-018','BLC-1-071','BLC-1-083','BLC-1-086',
 'BLC-1-035','BLC-1-010','BLC-1-075'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
function take(s,p,id){for(const zone of ['deck','hand','life','outside']){
 const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('Missing real '+id);}
function duel(raidTarget){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:7240+Number(raidTarget),first:0});
 const top=take(s,0,'BLC-1-024');s.players[0].hand.push(top);
 const base=take(s,0,'BLC-1-021');base.ready=false;s.players[0].energy[3]=base;
 for(let i=0;i<3;i++){const c=take(s,0,'BLC-1-017');c.ready=false;s.players[0].energy[i]=c;}
 const low=take(s,1,'BLC-1-002');low.ready=true;s.players[1].front[1]=low;
 let victim=null,under=null;
 if(raidTarget){
  victim=take(s,1,'BLC-1-024');under=take(s,1,'BLC-1-021');
  victim.stack=[under];victim.ready=false;victim.fieldEntryStamp=s.nextFieldEntryStamp++;
  victim.buffs=[{bp:900,untilTurn:s.turn}];s.players[1].front[0]=victim;
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(raid);s=dispatchUniversalAction(packs,s,raid);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,top,low,victim,under};
}
test('BLC024 source-locked official stats, full printed two modes/RAID and legal 50-card deck',()=>{
 const c=pack.cards['BLC-1-024'],src=CARDS.find(x=>x.identity==='BLC-1-024');
 assert.ok(src.source.includes('unionarena-tcg.com/jp/cardlist'));
 assert.deepEqual([c.name,c.color,c.energy,c.ap,c.bp,c.gen,c.trigger,c.raidName],
  ['ユーハバッハ','yellow',6,1,4000,1,'raid','ユーハバッハ']);
 assert.deepEqual(c.effects.onPlay[0].options.map(x=>x.id),['strip','retire']);
 assert.equal(c.passiveBonuses[0].extraDamage,1);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
});
test('actual BLC024 Raid top stripping keeps REST base; does not retire and grant Damage2',()=>{
 let {s,victim,under}=duel(true);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'strip'});
 assert.equal(s.pending.kind,'effect-strip-raid-top');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).uid,victim.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidTopStrip',uid:victim.uid});
 assert.equal(s.players[1].front[0].uid,under.uid);
 assert.equal(s.players[1].front[0].ready,false);
 assert.deepEqual(s.players[1].front[0].buffs,[]);
 assert.equal(countRetirementsThisTurn(s,'any','character'),0);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('actual BLC024 alternative retires only legal BP3000 target, count1 does not grant Damage2',()=>{
 let {s,low}=duel(false);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'normal'}).uid,low.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(countRetirementsThisTurn(s,'any','character'),1);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('two distinct official BLC024 paid Raid deployments cause two true retirements, live BP5000 and Q73 simultaneous LIFE damage',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:7248,first:0});
 // Reach an actual third own turn: 3 paid AP, not synthetic AP injected.
 for(let n=0;n<35&&(s.players[0].ownTurns<3||s.active!==0);n++){
  const actions=legalUniversalActions(packs,s);
  const a=actions.find(x=>x.type==='next')||actions[0];
  assert.ok(a,'a legal continuation must exist until turn three');
  s=dispatchUniversalAction(packs,s,a,{actor:s.pending?.player??s.active});
 }
 assert.equal(s.players[0].ownTurns,3);
 assert.equal(s.active,0);assert.equal(s.phase,'start');
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,3);
 const firstTop=take(s,0,'BLC-1-024'),secondTop=take(s,0,'BLC-1-024');
 const firstBase=take(s,0,'BLC-1-021'),secondBase=take(s,0,'BLC-1-021');
 s.players[0].hand.push(firstTop,secondTop,secondBase);
 firstBase.ready=false;s.players[0].energy[3]=firstBase;
 for(let i=0;i<3;i++){
  const c=take(s,0,'BLC-1-017');c.ready=false;s.players[0].energy[i]=c;
 }
 const victims=['BLC-1-002','BLC-1-005'].map((id,i)=>{
  const c=take(s,1,id);c.ready=true;s.players[1].front[i]=c;return c;
 });
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 function paidRaid(top,base,slot){
  const a=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
   a.uid===top.uid&&a.baseUid===base.uid&&a.slot===slot);
  assert.ok(a,'printed yellow6 + AP1 Raid must be legal');
  s=dispatchUniversalAction(packs,s,a);
  assert.equal(s.pending?.kind,'effect-choice-mode');
  s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'retire'});
  assert.equal(s.pending?.kind,'effect-retire-bp');
  s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:victims[slot].uid});
 }
 paidRaid(firstTop,firstBase,0);
 assert.equal(countRetirementsThisTurn(s,'any','character'),1);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),1);
 const secondPlay=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===secondBase.uid&&a.line==='energy'&&a.slot===3);
 assert.ok(secondPlay);
 s=dispatchUniversalAction(packs,s,secondPlay);
 paidRaid(secondTop,secondBase,1);
 assert.equal(countRetirementsThisTurn(s,'any','character'),2);
 for(const c of s.players[0].front.filter(Boolean)){
  assert.equal(universalBp(packs,s,c),5000);
  assert.equal(universalAttackDamage(packs,s,c),2);
 }
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,0);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:firstTop.uid});
 assert.equal(s.pending?.kind,'block');
 const beforeLife=s.players[1].life.length,beforeReveals=s.publicReveals.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.publicReveals.length,beforeReveals+2,'Q73 reveals both LIFE at once');
 assert.equal(s.players[1].lifeRevealed.length,2);
 for(let n=0;n<8&&s.pending;n++){
  const action=s.pending.kind==='life-batch-order'?legalUniversalActions(packs,s)[0]:
   {type:'chooseTrigger',mode:'skip'};
  s=dispatchUniversalAction(packs,s,action);
 }
 assert.equal(s.pending,null);
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.equal(s.publicReveals.length,beforeReveals+2);
 assert.equal(assertUniversalMatch(packs,s),true);
});
