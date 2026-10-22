import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID,MST_V2_OFFICIAL_LIMITS} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,verifiedMstV2RoxyFieldDeck}
 from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
export const packs=[registeredV2TitlePack('mushoku-tensei'),registeredV2TitlePack('sword-art-online')];
// Every card is an official registered identity; MST-051 is limited to one.
const mstIds=['MST-1-050','MST-1-051','MST-1-054','MST-1-075',
 'MST-1-055','MST-1-057','MST-1-061','MST-1-063','MST-1-070',
 'MST-1-069','MST-1-047','MST-1-010','MST-1-077','MST-1-072'];
const saoIds=['SAO-1-014','SAO-1-020','SAO-1-001','SAO-1-016','SAO-1-019',
 'SAO-1-023','SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046',
 'SAO-1-054','SAO-1-055','SAO-1-058'];
const deck=ids=>{const c=Object.fromEntries(ids.map(id=>[id,4]));
 if(ids===mstIds){c['MST-1-051']=1;c['MST-1-072']=1;}else c[ids.at(-1)]=2;
 return c;};
export const verifiedRoxyDeck=MST_V2_ROXY_FIELD_REAL_DECK_COUNTS;
const opponentDeck=Object.freeze(deck(saoIds));
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing physical official card '+id);
}
function fieldPlace(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function jumpToSecondMain(s){
 let n=0;
 while(!(s.active===0&&s.players[0].ownTurns===2&&s.phase==='start')){
  const allowed=legalUniversalActions(packs,s);
  const choice=allowed.find(a=>a.type==='next')||
   allowed.find(a=>a.type==='chooseHandLimit');
  assert.ok(choice,'missing a legal path to the second player-0 turn');
  s=dispatchUniversalAction(packs,s,choice);
  assert.ok(++n<24,'unexpected turn loop');
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');assert.equal(s.active,0);
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,2);
 return s;
}
function officialRaid({outsideField=true,decline=false}={}){
 let s=newUniversalMatch(packs,{decks:[verifiedRoxyDeck,opponentDeck],first:0,seed:1611});
 const base=fieldPlace(s,0,'MST-1-050','front',0);
 fieldPlace(s,0,'MST-1-051','energy',0);
 fieldPlace(s,0,'MST-1-050','energy',1);
 fieldPlace(s,0,'MST-1-070','energy',2);
 const victim=fieldPlace(s,1,'SAO-1-014','front',0,true);
 s=jumpToSecondMain(s);
 const roxy=take(s,0,'MST-1-054'),first=take(s,0,'MST-1-075');
 const second=take(s,0,outsideField?'MST-1-075':'MST-1-069');
 s.players[0].hand.push(roxy,first,second);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===first.uid&&a.line==='energy'&&a.slot===3);
 assert.ok(play,'official field should play with 0 energy and cost one AP');
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseDiscard'&&a.uid===second.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:second.uid});
 assert.equal(s.players[0].energy[3]?.uid,first.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===second.uid),true);
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,1);
 assert.ok(s.players[0].energy.every(Boolean));
 const raider=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===roxy.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(raider,'official MST-1-054 has enough green energy and a real Roxy base');
 s=dispatchUniversalAction(packs,s,raider);
 assert.equal(s.players[0].front[0]?.uid,roxy.uid);
 assert.equal(s.players[0].front[0]?.stack[0]?.uid,base.uid);
 assert.equal(s.players[0].front[0]?.ready,true);
 if(outsideField){
  assert.equal(s.pending?.kind,'effect-rest-bp');
  assert.deepEqual(legalUniversalActions(packs,s),[
   {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:victim.uid}]);
  for(const difficulty of ['normal','hard'])
   assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===
    JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
  s=dispatchUniversalAction(packs,s,
   {type:'chooseRestBp',uid:decline?null:victim.uid});
 }else assert.equal(s.pending,null);
 return {s,roxy,base,victim,field:first,discard:second};
}
test('MST 054/075 are two sourced official V2 cards in a LEGAL 50-card single-title deck',()=>{
 for(const [p,c] of [[packs[0],verifiedRoxyDeck],[packs[1],opponentDeck]]){
  assert.equal(Object.values(c).reduce((n,v)=>n+v,0),50);
  assert.deepEqual(validateUniversalDeck(p,c),[]);
  for(const id of Object.keys(c))assert.ok(p.cards[id]);
 }
 assert.equal(verifiedRoxyDeck['MST-1-051'],MST_V2_OFFICIAL_LIMITS['MST-1-051'].maxCopies);
 for(const id of ['MST-1-054','MST-1-075'])
  assert.equal(packs[0].cards[id].name,MST_V2_OFFICIAL_BY_ID[id].nameJa);
 assert.equal(Object.keys(packs[0].cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(verifiedMstV2RoxyFieldDeck().counts,verifiedRoxyDeck);
 const available=createAllV2PreviewRealDecks();
 assert.deepEqual(available['mushoku-tensei-roxy-field'].counts,verifiedRoxyDeck);
 assert.equal(Object.keys(available).length,7);
});
test('real MST-075 field onPlay draw/discard pays AP, puts SECOND real field into OUTSIDE; then real MST-054 Raid silences SAO',()=>{
 const {s,roxy,base,victim,field,discard}=officialRaid();
 assert.equal(discard.cardId,'MST-1-075');
 assert.equal(s.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.equal(s.players[0].energy[3]?.uid,field.uid);
 assert.equal(s.players[0].front[0]?.stack[0]?.uid,base.uid);
 assert.equal(s.players[0].front[0]?.uid,roxy.uid);
 assert.equal(s.players[1].front[0]?.uid,victim.uid);
 assert.equal(s.players[1].front[0]?.ready,false);
 assert.equal(s.continuousStates.length,2);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),2500);
 assert.deepEqual(universalPublicView(packs,s,0).players[1].front[0].restrictions.map(x=>x.kind),
  ['cannotActive','originalEffectsDisabled']);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('no field in OUTSIDE: official Raid works with zero targets; optional choice may decline',()=>{
 for(const [outsideField,decline] of [[false,false],[true,true]]){
  const {s,victim}=officialRaid({outsideField,decline});
  assert.equal(s.continuousStates.length,0);
  assert.equal(s.players[1].front[0]?.uid,victim.uid);
  assert.equal(s.players[1].front[0]?.ready,true);
  assert.equal(universalBp(packs,s,s.players[1].front[0]),3500);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
