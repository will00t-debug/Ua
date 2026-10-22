import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const counts=Object.fromEntries(['004','005','006','008','009','015','016','018',
 '025','032','041','043'].map(id=>['SLG-1-'+id,4]));
counts['SLG-1-037']=2;
const fresh=(seed=4014)=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function main(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function deployedFixture(){
 let s=fresh(),source=take(s,0,'SLG-1-004');
 s.players[0].hand.push(source);
 for(let i=0;i<3;i++){
  const c=take(s,0,'SLG-1-015');c.ready=true;s.players[0].energy[i]=c;
 }
 s=main(s);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===source.uid&&a.line==='front');
 assert.ok(action);
 return {s,source,action};
}
test('official UA51BT/SLG-1-004 has full standalone onPlay and live own-turn bonus, independent DRAW life',()=>{
 const official=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-004'),d=pack.cards['SLG-1-004'];
 assert.equal(official.number,'UA51BT/SLG-1-004');
 assert.equal(official.nameJa,'犬飼 晃');
 assert.deepEqual([official.color,official.energy,official.ap,official.bp,official.gen,official.trigger],
  ['purple',3,1,3500,1,'draw']);
 assert.deepEqual(d.effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(d.passiveBonuses,[{condition:{kind:'ownEffectHandOutsideOrRecovery',turn:'own'},bp:500}]);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
});
test('own onPlay DRAW alone does not buff: only actual paid hand-to-outside sets factual history',()=>{
 const {s:pre,source,action}=deployedFixture();
 assert.deepEqual(pre.turnEffectZoneMoves,[{handToOutside:false,outsideToHand:false},
  {handToOutside:false,outsideToHand:false}]);
 const init=structuredClone(pre),ap=pre.players[0].apCards.filter(c=>c.ready).length,
  deckLen=pre.players[0].deck.length;
 const pending=dispatchUniversalAction(packs,pre,action);
 assert.deepEqual(pre,init);
 assert.equal(pending.pending.kind,'effect-discard');
 assert.equal(pending.players[0].deck.length,deckLen-1);
 assert.equal(universalBp(packs,pending,pending.players[0].front.find(c=>c?.uid===source.uid)),3500,
  'draw alone or OPEN pending choice is NOT a hand-to-outside move');
 assert.equal(pending.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(pending.players[0].apCards.filter(c=>c.ready).length,ap-1);
 const enemyView=universalPublicView(packs,pending,1);
 assert.deepEqual(enemyView.pending,{kind:'effect-discard',player:0});
 assert.equal(enemyView.players[0].hand,null);
 const legal=legalUniversalActions(packs,pending);
 assert.ok(legal.length>0&&legal.every(a=>a.type==='chooseDiscard'));
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseDiscard',uid:null}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,pending,legal[0],{actor:1}),/Wrong player/);
 const result=dispatchUniversalAction(packs,pending,legal[0]);
 assert.equal(result.pending,null);
 assert.equal(result.turnEffectZoneMoves[0].handToOutside,true);
 assert.equal(result.turnEffectZoneMoves[0].outsideToHand,false);
 assert.ok(result.players[0].outside.some(c=>c.uid===legal[0].uid));
 assert.equal(universalBp(packs,result,result.players[0].front.find(c=>c?.uid===source.uid)),4000);
 assert.equal(universalPublicView(packs,result,1).players[0].front[0].bp,4000);
 assert.equal(result.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(assertUniversalMatch(packs,result),true);
});
test('a DIFFERENT own effect (SLG-009 MAIN discard) grants SLG-004 passive without its onPlay',()=>{
 let s=fresh(4008),subject=take(s,0,'SLG-1-004'),other=take(s,0,'SLG-1-009');
 s.players[0].front[0]=subject;s.players[0].energy[0]=other;
 s=main(s);other.ready=false;
 assert.equal(universalBp(packs,s,subject),3500);
 const mainAction=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===other.uid&&a.mode==='discardSelfBuff');
 assert.ok(mainAction);
 s=dispatchUniversalAction(packs,s,mainAction);
 assert.equal(s.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 const paid=legalUniversalActions(packs,s)[0];
 s=dispatchUniversalAction(packs,s,paid);
 assert.equal(s.turnEffectZoneMoves[0].handToOutside,true);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('own outside-to-hand via real SLG-037 choice grants SLG-004 live BP only after exact recovery',()=>{
 let s=fresh(4010),subject=take(s,0,'SLG-1-004'),
  event=take(s,0,'SLG-1-037'),candidate=take(s,0,'SLG-1-005');
 s.players[0].front[0]=subject;
 for(let i=0;i<4;i++){const c=take(s,0,'SLG-1-015');c.ready=true;s.players[0].energy[i]=c;}
 s.players[0].outside.push(candidate);s.players[0].hand.push(event);
 s=main(s);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 assert.equal(s.turnEffectZoneMoves[0].outsideToHand,false);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===candidate.uid));
 const recovered=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:candidate.uid});
 assert.equal(recovered.turnEffectZoneMoves[0].outsideToHand,true);
 assert.equal(recovered.turnEffectZoneMoves[0].handToOutside,false);
 assert.ok(recovered.players[0].hand.some(c=>c.uid===candidate.uid));
 assert.equal(universalBp(packs,recovered,recovered.players[0].front[0]),4000);
 assert.equal(assertUniversalMatch(packs,recovered),true);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(skipped.turnEffectZoneMoves[0].outsideToHand,false);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front[0]),3500);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});
test('history resets on turn switch and requires own turn: no stale buff from previous turn',()=>{
 let {s,source,action}=deployedFixture();
 s=dispatchUniversalAction(packs,s,action);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.deepEqual(s.turnEffectZoneMoves[0],{handToOutside:false,outsideToHand:false});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 s=main(s);
 assert.equal(s.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('non-effect hand and outside changes, even owned, cannot forge movement trigger',()=>{
 let s=fresh(4015),subject=take(s,0,'SLG-1-004'),
  outgoing=take(s,0,'SLG-1-005'),incoming=take(s,0,'SLG-1-005');
 s.players[0].front[0]=subject;
 s.players[0].outside.push(incoming);
 s.players[0].hand.push(outgoing);
 s=main(s);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 // Direct fixture zone permutations simulate non-effect events (mill/top/deck
 // or a hand-limit accounting change), which never call the audited hook.
 const alternate=structuredClone(s),discard=alternate.players[0].hand.pop();
 alternate.players[0].outside.push(discard);
 alternate.players[0].hand.push(alternate.players[0].outside.shift());
 assert.equal(universalBp(packs,alternate,alternate.players[0].front[0]),3500);
 assert.equal(alternate.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(alternate.turnEffectZoneMoves[0].outsideToHand,false);
 assert.equal(assertUniversalMatch(packs,alternate),true);
});
test('fail-closed movement predicate requires valid own-turn semantics and valid state accounting',()=>{
 const profile={id:'SYN',name:'Test',type:'character',color:'purple',energy:0,ap:1,
  bp:1500,gen:1,implementation:'dsl',effects:{},
  passiveBonuses:[{condition:{kind:'ownEffectHandOutsideOrRecovery',turn:'own'},bp:500}]};
 const make=p=>createUniversalPack({id:'test-ledger',cards:[p]});
 assert.doesNotThrow(()=>make(profile));
 for(const cond of [
  {kind:'ownEffectHandOutsideOrRecovery',turn:'opponent'},
  {kind:'ownEffectHandOutsideOrRecovery',turn:'any'},
  {kind:'ownEffectHandOutsideOrRecovery',turn:'own',min:1},
  {kind:'ownEffectHandOutsideOrRecovery',turn:'own',zone:'outside'},
  {kind:'ownEffectHandOutsideOrRecovery',turn:'own',source:'opponent'}
 ])assert.throws(()=>make({...profile,passiveBonuses:[{condition:cond,bp:500}]}),/invalid/);
 let {s}=deployedFixture();
 for(const malformed of [[],[{handToOutside:true,outsideToHand:false}],
  [{handToOutside:'yes',outsideToHand:false},{handToOutside:false,outsideToHand:false}],
  [{handToOutside:false,outsideToHand:false,secret:true},{handToOutside:false,outsideToHand:false}]]){
  assert.throws(()=>assertUniversalMatch(packs,{...s,turnEffectZoneMoves:malformed}),/Invalid own-effect movement ledger/);
 }
});
