import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
  assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Official component evidence (NOT FULL CARD PORTS):
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-006
// BLC-1-006: on attack, optionally choose opponent REST character on ANY field line;
// its next ACTIVE opportunity is skipped. OnPlay ACTIVE-if-rest is NOT modeled here.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-034
// SAO-1-034: above four own Life, mandatory opponent FRONT BP<=5000 REST+skip;
// below threshold must retire instead. That alternate branch is NOT modeled here.
const blc={id:'BLC-1-006',name:'キルゲ・オピー',type:'character',color:'yellow',
 energy:4,ap:2,bp:4000,gen:1,trigger:'get',implementation:'dsl',
 templateEffects:{onAttack:[{template:'skipNextActiveOppRest',optional:true}]}};
const sao={id:'SAO-1-034',name:'ラディアント・ライト',type:'event',color:'yellow',
 energy:3,ap:1,bp:0,gen:0,trigger:'special',triggerEffect:{op:'retireOppFront'},implementation:'dsl',
 templateEffects:{onPlay:[{template:'restEnemyUnderBpSkipNextActive',bp:5000,optional:false}]}};
function sample(prefix,first){
 return [first,...Array.from({length:12},(_,i)=>({id:prefix+String(i).padStart(2,'0'),
  name:prefix+' filler '+i,type:'character',color:'yellow',energy:0,ap:1,
  bp:i===11?6000:2000,gen:i===0?4:1,implementation:'vanilla'}))];
}
const bCards=sample('BLC-P-',blc),sCards=sample('SAO-P-',sao);
const packs=[createUniversalPack({id:'source-BLEACH-component',cards:bCards}),
 createUniversalPack({id:'source-SAO-component',cards:sCards})];
const deck=cards=>Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[deck(bCards),deck(sCards)],first,seed:666});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical UID for '+id);
}
function place(s,p,id,line,slot,ready){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
test('Batch D: BLC-1-006 official ATTACK component skips next ACTIVE for REST enemy ENERGY UID',()=>{
 let s=fresh(),attacker=place(s,0,'BLC-1-006','front',0,true);
 const foe=place(s,1,'SAO-P-01','energy',0,false);
 const blocker=place(s,1,'SAO-P-11','front',0,true);
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:foe.uid}
 ]);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.deepEqual(ai,{type:'chooseRestBp',uid:foe.uid});
 s=dispatchUniversalAction(packs,s,ai);
 assert.equal(s.continuousStates[0].targetUid,foe.uid);
 assert.equal(s.pending?.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.pending,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(s.players[1].energy[0].ready,false,'first ACTIVE opportunity consumed on opponent start');
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch D: SAO-1-034 official >4 life REST component is mandatory, BP bounded, and scoped to one UID',()=>{
 let s=fresh(1);
 const generator=place(s,1,'SAO-P-00','energy',0,true);
 const evt=take(s,1,'SAO-1-034');s.players[1].hand.push(evt);
 const target=place(s,0,'BLC-P-02','front',0,true);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===evt.uid);
 assert.ok(play,'energy 3 and 1 AP meet printed paid requirements');
 s=dispatchUniversalAction(packs,s,play);
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRestBp',uid:target.uid}]);
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'normal'}),{
  type:'chooseRestBp',uid:target.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:target.uid});
 assert.equal(s.players[0].front[0].ready,false);
 assert.deepEqual(universalPublicView(packs,s,1).players[0].front[0].restrictions,
  [{kind:'skipNextActive',until:null}]);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(s.continuousStates[0].targetUid,target.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch D: official component pilots cannot be mistaken for completed registered V2 cards',()=>{
 assert.ok(registeredV2TitlePack('bleach').cards['BLC-1-006']);
 assert.ok(registeredV2TitlePack('sword-art-online').cards['SAO-1-034']);
 assert.equal(blc.templateEffects.onAttack[0].optional,true);
 assert.equal(sao.templateEffects.onPlay[0].bp,5000);
});
