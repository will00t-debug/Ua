import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Official: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-074
const pack=registeredV2TitlePack('mushoku-tensei'),packs=[pack,pack];
const deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,
 'MST-1-050':1,'MST-1-052':1,'MST-1-053':1,'MST-1-074':1};
function take(s,id){for(const zone of ['deck','hand','life','outside']){
 const p=s.players[0][zone],i=p.findIndex(c=>c.cardId===id);
 if(i>=0)return p.splice(i,1)[0];}throw Error('Missing official physical '+id);}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
function paidEntrance(retire=true){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:9074});
 const source=take(s,'MST-1-074');s.players[0].hand.push(source);
 const roxy=take(s,'MST-1-052');s.players[0].outside.push(roxy);
 const victim=take(s,'MST-1-050');victim.ready=true;s.players[0].front[0]=victim;
 const main=take(s,'MST-1-053');main.ready=true;s.players[0].front[1]=main;
 for(let i=0;i<2;i++){const field=take(s,'MST-1-075');field.ready=true;s.players[0].energy[i]=field;}
 s=next(next(s));assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy'&&a.slot===2);
 assert.ok(play,'genuine printed green2/AP1 FIELD play');
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-retire-own-character');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===victim.uid));
 const before=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnCharacterRetire',uid:retire?victim.uid:null});
 assert.equal(s.players[0].hand.length,before+(retire?2:0));
 return {s,source,victim,roxy,main};
}
test('MST074 exact official type, 2 green, GET trigger, both onRetire branches and 50-card deck',()=>{
 const src=MST_V2_OFFICIAL_BY_ID['MST-1-074'],c=pack.cards['MST-1-074'];
 assert.equal(src.verified,true);
 assert.equal(src.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-074');
 assert.deepEqual([c.name,c.color,c.type,c.energy,c.ap,c.gen,c.trigger],
  ['転移の迷宮','green','field',2,1,1,'get']);
 assert.deepEqual(c.effects.onPlay,[{op:'retireOwnCharacterOne',
  optional:true,after:[{op:'draw',count:2}]}]);
 assert.deepEqual(c.effects.onRetire[0].options.map(o=>o.id),['deploy','recover']);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
});
test('paid MST074 play retires true OWN character, draws2; genuine MST053 retires 074, discard then outside REST Roxy',()=>{
 let {s,source,victim,roxy,main}=paidEntrance(true);
 assert.equal(countRetirementsThisTurn(s,0,'character'),1);
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===main.uid&&a.mode==='retireFieldThen');
 assert.ok(activate);
 s=dispatchUniversalAction(packs,s,activate);
 assert.equal(s.pending?.kind,'effect-retire-own-field');
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:source.uid});
 assert.equal(s.pending?.kind,'effect-choice-mode');
 assert.equal(countRetirementsThisTurn(s,0,'field'),1);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'deploy'});
 assert.equal(s.pending?.kind,'effect-discard-gate');
 const discard=legalUniversalActions(packs,s).find(a=>a.uid!==null);
 assert.ok(discard);s=dispatchUniversalAction(packs,s,discard);
 assert.equal(s.pending?.kind,'effect-outside-rest');
 const eligible=legalUniversalActions(packs,s).filter(a=>a.uid===roxy.uid&&a.line==='front');
 assert.ok(eligible.length>0);
 s=dispatchUniversalAction(packs,s,eligible[0]);
 assert.ok(s.players[0].front.some(c=>c?.uid===roxy.uid&&c.ready===false));
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('declining printed onPlay cost draws nothing; onRetire recovery mode legally does nothing without Hydra in outside',()=>{
 let {s,source}=paidEntrance(false);
 assert.equal(countRetirementsThisTurn(s,0,'character'),0);
 const real=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='retireFieldThen');
 assert.ok(real);s=dispatchUniversalAction(packs,s,real);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:source.uid});
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'recover'});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
