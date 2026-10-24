import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,selectionApSurcharge} from '../dist/universal-v2/continuous-states.mjs';
const packs=[registeredV2TitlePack('solo-leveling'),registeredV2TitlePack('sword-art-online')];
const sids=['SLG-1-070','SLG-1-072','SLG-1-069','SLG-1-062','SLG-1-065','SLG-1-053',
 'SLG-1-042','SLG-1-004','SLG-1-007','SLG-1-008','SLG-1-014','SLG-1-013','SLG-1-025'];
const aids=['SAO-1-034','SAO-1-020','SAO-1-001','SAO-1-010','SAO-1-011','SAO-1-004',
 'SAO-1-019','SAO-1-051','SAO-1-057','SAO-1-073','SAO-1-077','SAO-2-016','SAO-2-003'];
const decks=[sids,aids].map(ids=>{const d=Object.fromEntries(ids.map(id=>[id,4]));d[ids.at(-1)]=2;return d;});
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function set(s,p,id,line,slot){const c=take(s,p,id);c.fieldEntryStamp=s.nextFieldEntryStamp++;c.ready=true;s.players[p][line][slot]=c;return c;}
function setup(includeFree){
 let s=newUniversalMatch(packs,{decks,first:0,seed:33071});
 // OnPlay works in either field line (official Q90). Keep the source outside
 // the opponent's FRONT-only mandatory event target pool.
 const source=set(s,0,'SLG-1-070','energy',0),protectedCard=set(s,0,'SLG-1-072','front',1);
 const free=includeFree?set(s,0,'SLG-1-053','front',2):null;
 grantContinuousState(s,{kind:'selectionApTax',controller:0,sourceUid:source.uid,
  targetUid:protectedCard.uid,sourceLinked:false,
  until:{player:1,phase:'attack',edge:'end',ownTurn:s.players[1].ownTurns+1}});
 const event=take(s,1,'SAO-1-034');s.players[1].hand.push(event);
 for(let i=0;i<3;i++)set(s,1,'SAO-1-020','energy',i);
 for(let n=0;n<8&&(s.active!==1||s.phase!=='main');n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);assert.equal(s.phase,'main');
 // The opponent has one payable event AP, but NOT a second AP for Q2062.
 const ready=s.players[1].apCards.filter(c=>c.ready);
 assert.ok(ready.length>=1);for(const x of ready.slice(1))x.ready=false;
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(s.continuousStates.length,1,'protection status must survive both turn phase transitions');
 assert.equal(s.continuousStates[0].until.ownTurn,s.players[1].ownTurns,'targeting protection must activate on opponent next own turn');
 assert.equal(selectionApSurcharge(s,1,protectedCard.uid),1,'Q2062 surcharge must be active for exact physical target');
 return {s,event,protectedCard,free};
}
test('R33 Q2062 + Q1119: mandatory paid event is not offered when its ONLY target needs unaffordable extra AP',()=>{
 const {s,event,protectedCard}=setup(false);
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,1);
 assert.deepEqual(packs[1].cards['SAO-1-034'].effects.onPlay,[
  {op:'restOrRetireOppFrontByLife',bp:5000,lifeAtMost:4,optional:false}]);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(x=>x.type==='event'&&x.uid===event.uid),false);
 const snap=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'event',uid:event.uid}),/not currently legal/);
 assert.deepEqual(s,snap);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R33 Q2062: paid event can select unprotected alternate for FREE; no mid-effect deadlock or double AP',()=>{
 let {s,event,protectedCard,free}=setup(true);
 const play=legalUniversalActions(packs,s).find(x=>x.type==='event'&&x.uid===event.uid);
 assert.ok(play,'Q1119 permits a legal unprotected target after spending event AP');
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,0);
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.equal(s.continuousStates.length,1,'targeting protection must survive event dispatch');
 assert.equal(selectionApSurcharge(s,1,protectedCard.uid),1,'printed Q2062 tax must still exist at target resolution');
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRestBp',uid:free.uid}]);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:free.uid});
 assert.equal(s.players[0].front[2].ready,false);
 assert.equal(s.players[0].front[1].uid,protectedCard.uid);
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
