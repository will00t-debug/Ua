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
const pack=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei'),packs=[pack,mst];
const mstIds=['MST-1-053','MST-1-050','MST-1-052','MST-1-075','MST-1-001','MST-1-002','MST-1-012','MST-1-016','MST-1-020','MST-1-022','MST-1-027','MST-1-070','MST-1-054'];
const mstDeck=Object.fromEntries(mstIds.map((id,i)=>[id,i===12?2:4]));
const ids=['BLC-1-024','BLC-1-017','BLC-1-021','BLC-1-002','BLC-1-005',
 'BLC-1-012','BLC-1-018','BLC-1-071','BLC-1-083','BLC-1-086',
 'BLC-1-035','BLC-1-010','BLC-1-075'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
function take(s,p,id){for(const zone of ['deck','hand','life','outside']){
 const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('Missing real '+id);}
test('BLEACH Q73 reveals both LIFE before MST COLOR FIELD deployment and mandatory discard',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,mstDeck],seed:7248,first:0});
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
 const victims=['MST-1-052','MST-1-002'].map((id,i)=>{
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
 const live=take(s,1,'MST-1-053');s.players[1].energy[0]=live;
 const trigger=take(s,1,'MST-1-053'),secondLife=take(s,1,'MST-1-050');
 s.players[1].deck.push(...s.players[1].life.splice(0,2));s.players[1].life.unshift(trigger,secondLife);
 const field=take(s,1,'MST-1-075');s.players[1].hand.push(field);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:firstTop.uid});
 assert.equal(s.pending?.kind,'block');
 const beforeLife=s.players[1].life.length,beforeReveals=s.publicReveals.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.equal(s.publicReveals.length,beforeReveals+2);
 assert.ok(s.players[1].lifeRevealed.some(c=>c.uid===secondLife.uid));
 assert.equal(s.pending?.kind,'life-batch-order');
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:trigger.uid},{actor:1});
 const choice=legalUniversalActions(packs,s).find(a=>a.mode==='colorField'&&a.uid===field.uid);
 assert.ok(choice);s=dispatchUniversalAction(packs,s,choice);
 assert.equal(s.pending.kind,'life-batch-order');
 const entry=legalUniversalActions(packs,s).find(a=>a.type==='chooseLifeEffect');
 assert.ok(entry,'Q38 offers new entry against remaining LIFE');
 s=dispatchUniversalAction(packs,s,entry);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.ok(s.players[1].lifeRevealed.some(c=>c.uid===secondLife.uid));
 assert.equal(s.publicReveals.length,beforeReveals+2);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'}),/not currently legal/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]);
 assert.equal(s.pending.kind,'life-trigger');assert.equal(s.pending.uid,secondLife.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.equal(s.publicReveals.length,beforeReveals+2);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.lifeRevealBatch,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
