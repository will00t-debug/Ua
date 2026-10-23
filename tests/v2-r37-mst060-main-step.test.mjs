import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
const packs=[registeredV2TitlePack('mushoku-tensei'),registeredV2TitlePack('sword-art-online')];
const m=['MST-1-060','MST-1-080','MST-1-062','MST-1-046','MST-1-050','MST-1-059',
 'MST-1-063','MST-1-055','MST-1-057','MST-1-052','MST-1-069','MST-1-054','MST-1-070'];
const s=['SAO-1-031','SAO-1-066','SAO-1-005','SAO-1-020','SAO-1-051','SAO-1-057',
 'SAO-1-019','SAO-1-068','SAO-1-073','SAO-1-077','SAO-1-079','SAO-1-082','SAO-1-084'];
const decks=[m,s].map(xs=>Object.fromEntries(xs.map((id,i)=>[id,i===12?2:4])));
for(let p=0;p<2;p++)assert.deepEqual(validateUniversalDeck(packs[p],decks[p]),[]);
function take(a,p,id){for(const z of ['hand','deck','life','outside']){
 const row=a.players[p][z],i=row.findIndex(c=>c.cardId===id);
 if(i>=0)return row.splice(i,1)[0];
}throw Error('Missing '+id);}
function put(a,p,id,line,slot){
 const card=take(a,p,id);card.ready=true;card.fieldEntryStamp=a.nextFieldEntryStamp++;
 a.players[p][line][slot]=card;return card;
}
const act=(x,y)=>dispatchUniversalAction(packs,x,y);
function setup(){
 let a=newUniversalMatch(packs,{decks,first:0,seed:38060});
 const source=put(a,0,'MST-1-060','front',0);
 const target=put(a,0,'MST-1-059','front',1);
 for(let i=0;i<3;i++)put(a,0,'MST-1-050','energy',i);
 a=act(act(a,{type:'next'}),{type:'next'});
 return {a,source,target};
}
test('R37 MST060 printed STEP plus FRONT-only once MAIN draw/discard/grant and GET Life',()=>{
 const d=packs[0].cards['MST-1-060'],official=MST_V2_OFFICIAL_BY_ID[d.id];
 assert.equal(official.number,'UA54BT/MST-1-060');
 assert.equal(official.effectJa,'〖ステップ〗 （自分の移動フェイズにフロントLからエナジーLへ移動できる）\n 〖起動メイン〗 〖フロントLにある場合〗 〖ターン1〗 カードを1枚引き、自分の手札を1枚場外に置く。自分のフロントLの他の［特徴：ラノア魔法大学］を1枚まで選び、このターン中、「このキャラはフロントLでもエナジーを発生させる。」を与える。');
 assert.deepEqual([d.name,d.type,d.color,d.energy,d.ap,d.bp,d.gen,d.traits,d.trigger,d.step],
 ['シルフィエット','character','green',3,1,2500,2,['ラノア魔法大学'],'get',true]);
 assert.deepEqual(d.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'drawDiscard',count:1},{op:'grantFrontEnergyOwnOtherFrontTrait',
   trait:'ラノア魔法大学',optional:true,until:'thisTurn'}]});
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes(d.id));
});
for(const targetChosen of [false,true])test('MST060 MAIN resolution via shared queue: draw 1, discard 1, then grant '+targetChosen,()=>{
 let {a,source,target}=setup(),before=a.players[0].deck.length,hand=a.players[0].hand.length,
 ap=a.players[0].apCards.filter(c=>c.ready).length;
 const activate={type:'activate',uid:source.uid,mode:'frontOnce'};
 assert.ok(legalUniversalActions(packs,a).some(x=>JSON.stringify(x)===JSON.stringify(activate)));
 a=act(a,activate);
 assert.equal(a.players[0].deck.length,before-1);
 assert.equal(a.pending?.kind,'effect-discard');
 const discarded=a.players[0].hand[0];a=act(a,{type:'chooseDiscard',uid:discarded.uid});
 assert.equal(a.players[0].hand.length,hand);
 assert.ok(a.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(a.pending?.kind,'effect-grant-front-energy');
 for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,a).some(x=>
  JSON.stringify(x)===JSON.stringify(chooseUniversalAiAction(packs,a,{difficulty}))));
 assert.equal(universalPrivateChoices(packs,a,1),null);
 a=act(a,{type:'chooseFrontEnergyGrant',uid:targetChosen?target.uid:null});
 assert.equal(a.pending,null);
 assert.equal(a.players[0].apCards.filter(c=>c.ready).length,ap,'MAIN does not pay an invented AP');
 assert.equal(a.continuousStates.filter(x=>x.kind==='frontEnergyPermission').length,targetChosen?1:0);
 assert.ok(!legalUniversalActions(packs,a).some(x=>x.type==='activate'&&x.uid===source.uid),'same UID Turn 1');
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(a))),true);
 assert.equal(universalPublicView(packs,a,1).players[0].hand,null);
 if(targetChosen){
  a=act(a,{type:'next'});a=act(a,{type:'next'});
  assert.equal(a.continuousStates.some(x=>x.kind==='frontEnergyPermission'),false);
 }
});
test('MST060 STEP is available only during move and moving to ENERGY forbids FRONT MAIN',()=>{
 let {a,source}=setup();
 assert.ok(!legalUniversalActions(packs,a).some(x=>x.type==='step'&&x.uid===source.uid));
 a=newUniversalMatch(packs,{decks,first:0,seed:38061});
 const p=put(a,0,'MST-1-060','front',0);
 a=act(a,{type:'next'});
 const step=legalUniversalActions(packs,a).find(x=>x.type==='step'&&x.uid===p.uid);
 assert.ok(step);a=act(a,step);
 assert.ok(a.players[0].energy.some(x=>x?.uid===p.uid));
 a=act(a,{type:'next'});
 assert.ok(!legalUniversalActions(packs,a).some(x=>x.type==='activate'&&x.uid===p.uid));
 assert.equal(assertUniversalMatch(packs,a),true);
});
test('MST060 once-per-turn keys on physical UID not globally shared printed name',()=>{
 let {a,source,target}=setup();
 const second=put(a,0,'MST-1-060','front',2);
 const candidates=legalUniversalActions(packs,a).filter(x=>x.type==='activate'&&x.mode==='frontOnce');
 assert.ok(candidates.some(x=>x.uid===source.uid));
 assert.ok(candidates.some(x=>x.uid===second.uid));
 a=act(a,{type:'activate',uid:source.uid,mode:'frontOnce'});
 a=act(a,{type:'chooseDiscard',uid:a.players[0].hand[0].uid});
 a=act(a,{type:'chooseFrontEnergyGrant',uid:null});
 assert.ok(legalUniversalActions(packs,a).some(x=>x.type==='activate'&&x.uid===second.uid));
 assert.equal(assertUniversalMatch(packs,a),true);
});

test('MST060 serialized paused grant remains source-authenticated (no fake UID, trait, expiry or source name)',()=>{
 let {a,source}=setup();a=act(a,{type:'activate',uid:source.uid,mode:'frontOnce'});
 assert.equal(a.pending.kind,'effect-discard');
 const pending=a.effectQueue.find(x=>x.op==='grantFrontEnergyOwnOtherFrontTrait');
 assert.ok(pending,'a real grant is queued behind the paid discard');
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(a))),true);
 for(const modify of [x=>x.sourceUid='0-fake',x=>x.trait='incorrect',
   x=>x.until='nextTurn',x=>x.sourceName='forged']){
  const forged=structuredClone(a),grant=forged.effectQueue.find(x=>x.op==='grantFrontEnergyOwnOtherFrontTrait');
  modify(grant);assert.throws(()=>assertUniversalMatch(packs,forged),
   /Unproven queued FRONT energy grant/);
 }
});
