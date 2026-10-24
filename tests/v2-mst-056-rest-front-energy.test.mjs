import test from 'node:test';
import assert from 'node:assert/strict';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalEnergyByColor,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. No FAQ block. Header alt is 緑+, so
// generated energy is 1. 【レストにする】 rests this card. The effect then
// rests one other ACTIVE front character. Only that success gives this
// card +1 generated energy this turn. 【ターン1】 is once per this UID.

const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[mst,mst];
const base={id:'LAB',name:'Lab',color:'green',type:'character',energy:0,ap:1,
 bp:1000,gen:1,implementation:'dsl',effects:{}};

function deck(){
 const required=['MST-1-056','MST-1-001','MST-1-041'];
 const rest=Object.values(mst.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 return counts;
}
const counts=deck();
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
function toMain(seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  s=dispatchUniversalAction(packs,s,next);
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
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('MST-1-056 keeps gen 1 and rests another active front after resting itself',()=>{
 const print=UA54BT_OFFICIAL_PRINT['MST-1-056'];
 assert.equal(print.effectJa,'〖起動メイン〗 〖レストにする〗 〖ターン1〗 自分のフロントLのアクティブのキャラを1枚レストにする。そうした場合、このキャラはこのターン中、発生エナジー+ 〖緑〗 。');
 assert.equal(print.gen,1);
 assert.equal(print.trigger,null);
 assert.deepEqual(print.traits,['ラノア魔法大学']);
 const card=mst.cards['MST-1-056'];
 assert.equal(card.name,'エリナリーゼ');
 assert.equal(card.gen,1);
 assert.equal(card.activeExtraEnergy,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.mainAbility,{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1});
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-056'));
 assert.throws(()=>createUniversalPack({id:'bad-once',cards:[{...base,
  mainAbility:{op:'restSelfRestFrontGainEnergy',extraEnergy:1}}]}),/unsupported main action/);
});

test('an energy-line source rests one other active front and then generates two green',()=>{
 let s=toMain(1056);
 const source=place(s,0,'MST-1-056','energy',0,true);
 const front=place(s,0,'MST-1-001','front',0,true);
 const energyAlly=place(s,0,'MST-1-041','energy',1,true);
 const foe=place(s,1,'MST-1-001','front',0,true);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(universalCardEnergy(packs,s,0,source),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:source.uid,
  targetUid:source.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s.continuousStates=[];
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'restFrontGainEnergy'});
 assert.equal(s.players[0].energy[0].ready,false);
 const choices=legalUniversalActions(packs,s);
 assert.deepEqual(choices.map(a=>a.uid),[front.uid]);
 assert.equal(choices.some(a=>a.uid===source.uid||a.uid===energyAlly.uid||a.uid===foe.uid),false);
 aiLegal(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestFrontEnergy',uid:front.uid});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].energy[1].ready,true);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[1]),1);
 assert.equal(universalEnergyByColor(packs,s,0).green,3);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal((s.turnRetireEvents||[]).length,0);
 s.players[0].energy[0].ready=true;
 s.players[0].front[0].ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-missing',mode:'restFrontGainEnergy'}),/not currently legal/);
});

test('a lone active front cannot pay, and a front source generates nothing after the second REST',()=>{
 let alone=toMain(1057);
 const only=place(alone,0,'MST-1-056','front',0,true);
 place(alone,0,'MST-1-001','front',1,false);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===only.uid&&a.type==='activate'),false);
 assert.throws(()=>dispatchUniversalAction(packs,alone,{type:'activate',uid:only.uid,mode:'restFrontGainEnergy'}),/not currently legal/);

 let s=toMain(1058);
 const source=place(s,0,'MST-1-056','front',0,true);
 const other=place(s,0,'MST-1-001','front',1,true);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'restFrontGainEnergy'});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestFrontEnergy',uid:other.uid});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].front[0]),0);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});
