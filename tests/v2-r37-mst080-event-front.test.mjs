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
const a=['MST-1-080','MST-1-062','MST-1-046','MST-1-050','MST-1-059','MST-1-063',
 'MST-1-055','MST-1-057','MST-1-052','MST-1-069','MST-1-054','MST-1-075','MST-1-070'];
const b=['SAO-1-031','SAO-1-066','SAO-1-005','SAO-1-020','SAO-1-051','SAO-1-057',
 'SAO-1-019','SAO-1-068','SAO-1-073','SAO-1-077','SAO-1-079','SAO-1-082','SAO-1-084'];
const decks=[a,b].map(z=>Object.fromEntries(z.map((id,i)=>[id,i===12?2:4])));
for(let p=0;p<2;p++)assert.deepEqual(validateUniversalDeck(packs[p],decks[p]),[]);
function take(s,p,id){for(const z of ['deck','life','hand','outside']){const v=s.players[p][z],
 i=v.findIndex(c=>c.cardId===id);if(i>=0)return v.splice(i,1)[0];}throw Error('Missing '+id);}
function put(s,p,id,line,slot){const c=take(s,p,id);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p][line][slot]=c;return c;}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function setup(){
 let s=newUniversalMatch(packs,{decks,first:0,seed:38080});
 for(let i=0;i<3;i++)put(s,0,'MST-1-050','energy',i);
 const target=put(s,0,'MST-1-059','front',0);
 const event=take(s,0,'MST-1-080');s.players[0].hand.push(event);
 s=act(act(s,{type:'next'}),{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 return {s,play,target,event};
}
test('R37 MST-1-080 official full print, DRAW LIFE, independent 50-card source-pinned manifest',()=>{
 const d=packs[0].cards['MST-1-080'],source=MST_V2_OFFICIAL_BY_ID['MST-1-080'];
 assert.equal(source.number,'UA54BT/MST-1-080');
 assert.equal(source.nameJa,d.name);
 assert.equal(source.effectJa,'カードを2枚引く。自分のフロントLの［特徴：ラノア魔法大学］を1枚まで選び、このターン中、「このキャラはフロントLでもエナジーを発生させる。」を与える。');
 assert.deepEqual([d.name,d.type,d.color,d.energy,d.ap,d.bp,d.gen,d.trigger],
  ['そう、ボクはシルフィエット','event','green',3,1,0,0,'draw']);
 assert.deepEqual(d.effects.onPlay,[{op:'draw',count:2},
  {op:'grantFrontEnergyOwnOtherFrontTrait',trait:'ラノア魔法大学',optional:true,until:'thisTurn'}]);
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes(d.id));
});
for(const choose of [false,true])test('MST080 paid EVENT: draws 2, front permission '+choose+
 ', no hidden UID leak and legal AI',()=>{
 let {s,play,target,event}=setup(),n=s.players[0].deck.length;
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(s,play);assert.equal(s.players[0].deck.length,n-2);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(s.pending?.kind,'effect-grant-front-energy');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseFrontEnergyGrant'&&a.uid===target.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,s).some(a=>
  JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const snapshot=structuredClone(s);
 assert.throws(()=>act(s,{type:'chooseFrontEnergyGrant',uid:'0-forged'}),/not currently legal/);
 assert.deepEqual(s,snapshot);
 s=act(s,{type:'chooseFrontEnergyGrant',uid:choose?target.uid:null});
 assert.equal(s.continuousStates.filter(x=>x.kind==='frontEnergyPermission').length,choose?1:0);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 if(choose){
  s=act(s,{type:'next'});s=act(s,{type:'next'});
  assert.equal(s.continuousStates.filter(x=>x.kind==='frontEnergyPermission').length,0);
 }
});
test('MST080 with missing green energy fails before spending EVENT AP or moving physical card',()=>{
 let {s,event}=setup();
 const moved=s.players[0].energy[2];s.players[0].energy[2]=null;s.players[0].outside.push(moved);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
