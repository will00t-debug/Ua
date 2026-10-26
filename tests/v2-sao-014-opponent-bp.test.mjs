import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_PILOT_IDS,verifiedSaoV2Cards,saoV2Pack} from '../dist/universal-v2/sao-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const ID='SAO-1-014';
const saoIds=['SAO-1-014','SAO-2-015','SAO-2-016','SAO-2-017','SAO-2-019','SAO-2-021',
 'SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-047','SAO-1-052','SAO-1-054'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));
saoDeck['SAO-1-054']=2;
const mstIds=['001','002','003','010','012','013','015','017','019','020','022','024','027'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-027']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('No physical UID '+id);
}
function scene(owner,line='front'){
 const packs=owner===0?[sao,mst]:[mst,sao];
 let s=newUniversalMatch(packs,{
  decks:owner===0?[saoDeck,mstDeck]:[mstDeck,saoDeck],
  first:owner,seed:14014+owner});
 const source=take(s,owner,ID);
 source.ready=true;
 s.players[owner][line][0]=source;
 return {packs,s,source,owner};
}
test('SAO-1-014 exact JP original opponent-turn BP source, separate DRAW Life and normalizer profile',()=>{
 const printed=SAO_OFFICIAL_CARDS.filter(c=>c.id===ID);
 assert.equal(printed.length,1);
 const source=printed[0],card=sao.cards[ID];
 assert.equal(source.number,'UA15BT/SAO-1-014');
 assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-014');
 assert.equal(source.nameJa,'エルドリエ・シンセシス・サーティワン');
 assert.equal(source.effectJa,'【相手のターン中】このキャラはBP+1000。');
 assert.equal(source.bpPrinted,'2500+');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,
  card.trigger,card.traits,card.type],
  [source.nameJa,'yellow',2,1,2500,1,'draw',['整合騎士'],'character']);
 assert.equal(card.opponentTurnBp,1000);
 assert.equal(card.ownTurnBp,0);
 assert.deepEqual(card.passiveBonuses,[]);
 assert.deepEqual(card.effects.onPlay,undefined);
 assert.equal(card.implementation,'dsl');
 assert.ok(SAO_V2_PILOT_IDS.includes(ID));
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.deepEqual(verifiedSaoV2Cards().find(c=>c.id===ID).opponentTurnBp,1000);
 assert.deepEqual(saoV2Pack().cards[ID],card);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
for(const owner of [0,1]){
 for(const line of ['front','energy']){
  test('SAO014 controller '+owner+' '+line+' live BP: own turn 2500, opponent turn 3500; no stale modifier',()=>{
   const {packs,s,source}=scene(owner,line);
   const physical=s.players[owner][line][0];
   assert.equal(physical.uid,source.uid);
   assert.equal(universalBp(packs,s,physical),2500);
   if(line==='front')assert.equal(universalPublicView(packs,s,1-owner).players[owner].front[0].bp,2500);
   const otherTurn=structuredClone(s);
   otherTurn.active=1-owner;
   assert.equal(universalBp(packs,otherTurn,otherTurn.players[owner][line][0]),3500);
   if(line==='front')assert.equal(universalPublicView(packs,otherTurn,1-owner).players[owner].front[0].bp,3500);
   otherTurn.players[owner][line][0].ready=false;
   assert.equal(universalBp(packs,otherTurn,otherTurn.players[owner][line][0]),3500,
    'REST does not turn off unconditional printed opponent-turn BP');
   otherTurn.active=owner;
   assert.equal(universalBp(packs,otherTurn,otherTurn.players[owner][line][0]),2500);
   assert.equal(universalBp(packs,s,s.players[owner][line][0]),2500);
   assert.equal(assertUniversalMatch(packs,s),true);
   assert.equal(assertUniversalMatch(packs,otherTurn),true);
  });
 }
}
test('generic opponentTurnBp schema: nonzero multiples of 500 within 5000, no event/unknown modifiers',()=>{
 const base={id:'QA-014',name:'Synthetic',color:'yellow',energy:1,ap:1,bp:2500,gen:1,
  type:'character',implementation:'dsl',effects:{}};
 const make=card=>createUniversalPack({id:'strict-opponent-turn',cards:[card]});
 assert.equal(make({...base,opponentTurnBp:1000}).cards['QA-014'].opponentTurnBp,1000);
 assert.equal(make({...base,opponentTurnBp:-1500}).cards['QA-014'].opponentTurnBp,-1500);
 assert.equal(make({...base,implementation:'vanilla'}).cards['QA-014'].opponentTurnBp,0);
 for(const value of [0,-1,1.5,5001,-5001,250,'1000',null]){
  assert.throws(()=>make({...base,opponentTurnBp:value}),/invalid opponent-turn BP/);
 }
 assert.throws(()=>make({...base,type:'event',bp:0,gen:0,opponentTurnBp:1000}),
  /invalid opponent-turn BP/);
});
test('opponent-turn generic bonus and own-turn generic bonus remain strictly separated',()=>{
 const def={id:'QA-015',name:'Synthetic',color:'yellow',energy:1,ap:1,bp:2500,gen:1,
  type:'character',implementation:'dsl',effects:{},ownTurnBp:500,opponentTurnBp:1000};
 const pack=createUniversalPack({id:'strict-turn-modifier',cards:[def]});
 const counts={'QA-015':4};
 assert.equal(pack.cards['QA-015'].ownTurnBp,500);
 assert.equal(pack.cards['QA-015'].opponentTurnBp,1000);
 // Each branch is selected solely by physical owner vs current turn;
 // no cumulative stacking of the two independent printed timing modifiers.
 assert.ok(validateUniversalDeck(pack,counts).some(e=>e.includes('50 cards')));
});
