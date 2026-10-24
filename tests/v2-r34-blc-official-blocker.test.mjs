import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const bleach=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei');
const heldAside=['BLC-4-034','BLC-2-019','BLC-2-047'];
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','050','059','063','070'].map(n=>['MST-1-'+n,4]));mstDeck['MST-1-057']=2;
const bleachIds=Object.values(bleach.cards).filter(c=>c.type==='character'&&
 c.maxCopies===4&&!heldAside.includes(c.id)).map(c=>c.id).sort().slice(0,13);
assert.equal(bleachIds.length,13);
const bleachDeck=Object.fromEntries(bleachIds.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(bleach,bleachDeck),[]);
assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
test('R34 BLC034 Q2315/Q2316 source print exists and the three whole cards are registered',()=>{
 const source=CARDS.find(x=>x.identity==='BLC-4-034');
 assert.ok(source);
 assert.match(source.effect,/退場/);
 assert.match(source.effect,/裏向/);
 assert.equal(bleach.cards['BLC-4-034'].moveObserver.op,'restSelfTuckMovedFaceDown');
 assert.equal(bleach.cards['BLC-2-019'].raidName,'黒崎 一護');
 assert.equal(bleach.cards['BLC-2-047'].effects.onPlay[0].count,2);
 assert.equal(mst.cards['MST-1-059']?.effects?.onPlay?.[0]?.op,'chooseOne');
 const fake={id:'BAD-034',name:'Riruka',type:'character',color:'blue',
  energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',
  mainAbility:{op:'retireSelfRecoverOwnFacedownUnder',
   restSelf:true,sourceLinked:true}};
 assert.throws(()=>createUniversalPack({id:'no-guess',cards:[fake]}),/unsupported main action ability/i);
});
test('R34 BLEACH against fully registered MST keeps real 50-card action legality and no public private-hand disclosure',()=>{
 const packs=[bleach,mst];
 let s=newUniversalMatch(packs,{decks:[bleachDeck,mstDeck],first:0,seed:34035});
 for(let turn=0;turn<8;turn++){
  assert.equal(assertUniversalMatch(packs,s),true);
  const actions=legalUniversalActions(packs,s);
  if(!actions.length)break;
  for(const difficulty of ['normal','hard']){
   const ai=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  }
  const viewer=1-s.active,publicState=universalPublicView(packs,s,viewer);
  assert.equal(publicState.players[s.active].hand,null);
  const action=actions.find(a=>a.type==='next')||actions[0];
  s=dispatchUniversalAction(packs,s,action);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(bleach.cards['BLC-4-034'].mainAbility.op,'restRetireRecoverUnder');
 assert.equal(bleach.cards['BLC-2-019'].mainAbility.frontOnly,true);
 assert.equal(bleach.cards['BLC-2-047'].moveTriggers[0].then[0].count,1);
});
