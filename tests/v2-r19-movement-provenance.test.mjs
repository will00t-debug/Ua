import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {matchesCompletedMove,V2_MOVE_REASONS} from '../dist/universal-v2/zone-move-events.mjs';
const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['005','006','009','015','016','018','025','032','041','043','045','052'];
const counts=Object.fromEntries(ids.map(id=>['SLG-1-'+id,4]));
counts['SLG-1-037']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],at=list.findIndex(x=>x.cardId===id);
  if(at>=0)return list.splice(at,1)[0];
 }throw Error('Missing '+id);
}
function main(s){for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;}
test('completed MAIN discard payment records exact UID, source, cause and no opponent hand leak',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1919,first:0});
 assert.deepEqual(s.zoneMoveEvents,[]);
 const c=take(s,0,'SLG-1-009');s.players[0].hand.push(c);
 s=main(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===c.uid&&a.mode==='discardSelfBuff');
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 const legal=legalUniversalActions(packs,s);
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseMainDiscard',uid:'1-9999'}),/not currently legal/);
 assert.deepEqual(s,before,'invalid payment creates no phantom event');
 const uid=legal[0].uid;
 s=dispatchUniversalAction(packs,s,legal[0]);
 const log=s.zoneMoveEvents.filter(e=>e.uid===uid);
 assert.equal(log.length,1);
 assert.deepEqual([log[0].owner,log[0].controller,log[0].from,log[0].to,log[0].reason],
  [0,0,'hand','outside','payment']);
 assert.equal(log[0].sourceUid,c.uid);
 assert.equal(log[0].sourceCardId,'SLG-1-009');
 assert.equal(log[0].sourceColor,'purple');
 assert.equal(log[0].sourceOnField,true);
 assert.equal(matchesCompletedMove(log[0],{sourceCardId:'SLG-1-009',from:'hand',reason:'payment'}),true);
 assert.equal(matchesCompletedMove(log[0],{reason:'opponent-effect'}),false);
 assert.ok(s.turnEffectZoneMoves[0].handToOutside,'legacy movement predicate remains');
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes('zoneMoveEvents'),false);
 assert.ok(V2_MOVE_REASONS.includes('life-trigger'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
