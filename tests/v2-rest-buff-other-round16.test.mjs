import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official pages checked 2026-10-22. Neither card has an FAQ block.
// 【レストにする】 rests this card. There is no ターン1. The chosen card is
// another own character on the front or energy line. A later silence does
// not remove the BP already given.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const base={id:'LAB',name:'Lab',color:'yellow',type:'character',energy:0,ap:1,
 bp:1000,gen:1,implementation:'dsl',effects:{}};

function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13,pack.id);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const saoCounts=deck(sao,['SAO-1-007','SAO-1-008','SAO-2-006']);
const mstCounts=deck(mst,['MST-1-041','MST-1-001','MST-1-046']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function toMain(packs,counts){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1007,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function aiLegal(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('SAO-1-007 and MST-1-041 share REST-self then BP+1000, with no once-per-turn flag',()=>{
 const silica=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-007');
 assert.equal(silica.effectJa,'【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。');
 assert.equal(silica.gen,1);
 assert.equal(silica.trigger,null);
 assert.deepEqual(silica.traits,['ALO']);
 const aisha=UA54BT_OFFICIAL_PRINT['MST-1-041'];
 assert.equal(aisha.effectJa,'〖起動メイン〗 〖レストにする〗 自分の場の他のキャラを1枚選び、このターン中、BP+1000。');
 assert.equal(aisha.triggerEffectJa,'〖ドロー〗 カードを1枚引く。');
 assert.equal(aisha.gen,1);
 const saoCard=sao.cards['SAO-1-007'],mstCard=mst.cards['MST-1-041'];
 assert.equal(saoCard.name,'シリカ');
 assert.equal(mstCard.name,'アイシャ');
 assert.equal(mstCard.trigger,'draw');
 assert.deepEqual(mstCard.traits,[]);
 assert.deepEqual(saoCard.mainAbility,{op:'restSelfBuffOther',bp:1000});
 assert.deepEqual(mstCard.mainAbility,saoCard.mainAbility);
 assert.deepEqual(saoCard.effects,{});
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-007'));
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-041'));
 assert.throws(()=>createUniversalPack({id:'bad-turn',cards:[{...base,
  mainAbility:{op:'restSelfBuffOther',bp:1000,oncePerTurn:true}}]}),/unsupported main action/);
 assert.throws(()=>createUniversalPack({id:'bad-bp',cards:[{...base,
  mainAbility:{op:'restSelfBuffOther',bp:0}}]}),/unsupported main action/);
});

test('an energy-line SAO-1-007 rests itself and buffs one other own character, then may pay again',()=>{
 const packs=[sao,sao];
 let s=toMain(packs,saoCounts);
 const source=place(s,0,'SAO-1-007','energy',0,true);
 const ally=place(s,0,'SAO-1-008','front',0);
 const other=place(s,0,'SAO-2-006','energy',1);
 const foe=place(s,1,'SAO-1-008','front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='selfRestBuff'),true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:source.uid,
  targetUid:source.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s.continuousStates=[];
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestBuff'});
 assert.equal(s.players[0].energy[0].ready,false);
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid));
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid));
 assert.equal(choices.some(a=>a.uid===source.uid||a.uid===foe.uid||a.uid===null),false);
 aiLegal(packs,s);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2000);
 assert.equal(universalBp(packs,s,s.players[0].energy[1]),2500);
 assert.equal((s.turnRetireEvents||[]).length,0);
 s.players[0].energy[0].ready=true;
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestBuff'});
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:ally.uid,
  targetUid:ally.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3000);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-missing',mode:'selfRestBuff'}),/not currently legal/);
});

test('MST-1-041 on the front buffs an energy character, refuses a lone source, and its DRAW is the life trigger',()=>{
 const packs=[mst,mst];
 let alone=toMain(packs,mstCounts);
 const only=place(alone,0,'MST-1-041','front',0,true);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===only.uid&&a.type==='activate'),false);
 assert.throws(()=>dispatchUniversalAction(packs,alone,{type:'activate',uid:only.uid,mode:'selfRestBuff'}),/not currently legal/);

 let s=toMain(packs,mstCounts);
 const source=place(s,0,'MST-1-041','front',0,true);
 const ally=place(s,0,'MST-1-001','energy',0);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestBuff'});
 assert.equal(s.players[0].front[0].ready,false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),mst.cards['MST-1-001'].bp+1000);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2000);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);

 let flip=newUniversalMatch(packs,{decks:[mstCounts,mstCounts],seed:1041,first:0});
 for(let n=0;n<6&&flip.phase!=='attack';n++){
  const next=legalUniversalActions(packs,flip).find(a=>a.type==='next');
  flip=dispatchUniversalAction(packs,flip,next);
 }
 const striker=place(flip,0,'MST-1-001','front',0,true);
 const revealed=take(flip,1,'MST-1-041');
 flip.players[1].deck.push(flip.players[1].life.shift());
 flip.players[1].life.unshift(revealed);
 const hand=flip.players[1].hand.length;
 flip=dispatchUniversalAction(packs,flip,{type:'attack',uid:striker.uid});
 flip=dispatchUniversalAction(packs,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'draw');
 aiLegal(packs,flip);
 flip=dispatchUniversalAction(packs,flip,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(flip.players[1].hand.length,hand+1);
 assert.equal(universalPublicView(packs,flip,0).players[1].hand,null);
 assert.equal(countCards(flip.players[1]),50);
 assert.equal(assertUniversalMatch(packs,flip),true);
});
