import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalPrivateChoices,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. EX08BT/SAO-2-034 has no FAQ block.
// Cost alt 紫2, generated alt 紫. Attack: put up to one top card outside.
// The choice is blind. Mandatory millTop is a different printed sentence.

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];

function deck(){
 const required=['SAO-2-034','SAO-1-007','SAO-2-008'];
 const rest=Object.values(sao.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
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
function toAttack(seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let n=0;n<8&&s.phase!=='attack';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'attack');
 return s;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('SAO-2-034 mills at most one and leaves mandatory mill unchanged',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-034');
 assert.equal(source.effectJa,'【アタック時】自分の山札の上から1枚まで場外に置く。');
 assert.equal(source.energy,2);
 assert.equal(source.gen,1);
 assert.equal(source.trigger,'active');
 assert.deepEqual(source.traits,['SAOサバイバー']);
 const card=sao.cards['SAO-2-034'];
 assert.equal(card.name,'エイジ');
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects.onAttack,[{op:'millTop',count:1,optional:true}]);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-034'));
 const base={id:'LAB',name:'Lab',color:'purple',type:'character',energy:0,ap:1,
  bp:1000,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'two',cards:[{...base,
  effects:{onAttack:[{op:'millTop',count:2,optional:true}]}}]}),/optional mill/);
 assert.doesNotThrow(()=>createUniversalPack({id:'forced',cards:[{...base,
  effects:{onAttack:[{op:'millTop',count:2}]}}]}));
});

test('skip leaves the top card, and accepting moves exactly that card outside',()=>{
 let s=toAttack(2034);
 const age=take(s,0,'SAO-2-034');age.ready=true;s.players[0].front[0]=age;
 const top=s.players[0].deck[0];
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:age.uid});
 assert.equal(s.pending.kind,'effect-optional-mill');
 assert.equal(universalPrivateChoices(packs,s,0),null);
 assert.deepEqual(universalPublicView(packs,s,1).pending,{kind:'effect-optional-mill',player:0});
 assert.equal(s.players[0].deck[0].uid,top.uid);
 aiLegal(s);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(skipped.players[0].deck[0].uid,top.uid);
 assert.equal(skipped.players[0].deck.length,before);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===top.uid),false);
 const milled=dispatchUniversalAction(packs,s,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(milled.pending.kind,'block');
 assert.equal(milled.players[0].outside.at(-1).uid,top.uid);
 assert.equal(milled.players[0].deck.length,before-1);
 assert.equal(milled.players[0].deck[0]?.uid===top.uid,false);
 assert.equal(universalCardEnergy(packs,milled,0,milled.players[0].front[0]),0);
 assert.equal(assertUniversalMatch(packs,milled),true);
});

test('silence and an empty deck do not open the mill choice',()=>{
 let s=toAttack(2035);
 const age=take(s,0,'SAO-2-034');age.ready=true;s.players[0].front[0]=age;
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:age.uid,
  targetUid:age.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:age.uid});
 assert.equal(s.pending.kind,'block');
 let empty=toAttack(2036);
 const again=take(empty,0,'SAO-2-034');again.ready=true;empty.players[0].front[0]=again;
 empty.players[0].hand.push(...empty.players[0].deck.splice(0));
 empty=dispatchUniversalAction(packs,empty,{type:'attack',uid:again.uid});
 assert.equal(empty.pending.kind,'block');
 assert.equal(empty.players[0].outside.some(c=>c.uid===again.uid),false);
 assert.equal(assertUniversalMatch(packs,empty),true);
});
