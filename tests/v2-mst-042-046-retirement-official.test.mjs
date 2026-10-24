import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalCardEnergy,universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const pack=registeredV2TitlePack('mushoku-tensei'),packs=[pack,pack];
const deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS};
deck['MST-1-050']-=2;deck['MST-1-054']-=2;deck['MST-1-042']=2;deck['MST-1-046']=2;
function take(s,p,id){for(const z of ['deck','hand','life','outside']){
 const a=s.players[p][z],i=a.findIndex(x=>x.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('Missing real '+id);
}
function setup(){let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:1189});
 const tal=take(s,0,'MST-1-046'),producer=take(s,0,'MST-1-046'),eli=take(s,0,'MST-1-042'),field=take(s,0,'MST-1-075');
 tal.ready=false;producer.ready=false;eli.ready=false;field.ready=false;
 s.players[0].front[0]=tal;s.players[0].energy[0]=producer;s.players[0].front[1]=eli;s.players[0].energy[1]=field;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});return {s,tal,producer,eli,field};}
test('MST 042 and 046 match independently verified Japanese print values and triggers',()=>{
 for(const id of ['MST-1-042','MST-1-046']){const src=MST_V2_OFFICIAL_BY_ID[id],d=pack.cards[id];
  assert.ok(src?.verified&&d);assert.equal(d.name,src.nameJa);
  for(const k of ['energy','ap','bp','gen','type','trigger'])assert.equal(d[k],src[k]);
  assert.deepEqual([...d.traits],src.traits);
 }
 assert.equal(pack.cards['MST-1-042'].impactNull,true);
 assert.equal(pack.cards['MST-1-042'].mainAbility.op,'readySelfIfOwnRetiredThisTurn');
 assert.equal(pack.cards['MST-1-046'].mainAbility.op,'retireOwnFieldThen');
 assert.equal(pack.cards['MST-1-046'].passiveBonuses[0].extraEnergy,1);
});
test('registered 50-card MST duel: true FIELD cost draws for MST075, buffs MST046 and enables MST042',()=>{
 let {s,tal,producer,eli,field}=setup();
 assert.equal(universalCardEnergy(packs,s,0,producer),2);
 assert.equal(universalBp(packs,s,tal),3000);
 assert.equal(legalUniversalActions(packs,s).some(x=>x.type==='activate'&&x.uid===eli.uid),false);
 const action=legalUniversalActions(packs,s).find(x=>x.type==='activate'&&x.uid===tal.uid&&x.mode==='retireFieldThen');
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseOwnFieldRetire',uid:field.uid}]);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(universalCardEnergy(packs,s,0,producer),3);
 const ready=legalUniversalActions(packs,s).find(x=>x.type==='activate'&&x.uid===eli.uid&&x.mode==='retireReady');
 assert.ok(ready);s=dispatchUniversalAction(packs,s,ready);
 assert.equal(s.players[0].front[1].ready,true);
 assert.equal(s.turnRetireEvents[0].cardType,'field');
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('without FIELD retirement, 042 MAIN and 046 production bonus stay disabled',()=>{
 const {s,eli,tal,producer}=setup();
 assert.equal(legalUniversalActions(packs,s).some(x=>x.type==='activate'&&x.uid===eli.uid),false);
 assert.equal(universalBp(packs,s,tal),3000);assert.equal(universalCardEnergy(packs,s,0,producer),2);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:eli.uid,mode:'retireReady'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
