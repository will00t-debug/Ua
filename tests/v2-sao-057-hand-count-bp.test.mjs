import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_PILOT_IDS,verifiedSaoV2Cards,saoV2Pack} from '../dist/universal-v2/sao-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalBp,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const ID='SAO-1-057';
const saoIds=['SAO-2-015','SAO-2-016','SAO-2-017','SAO-2-019','SAO-2-021',
 'SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-047','SAO-1-052',
 'SAO-1-054','SAO-1-057'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));
saoDeck['SAO-1-054']=2;
const mstIds=['001','002','003','010','012','013','015','017','019','020','022','024','027'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-027']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing physical UID '+id);
}
function scene(owner,line='front'){
 const packs=owner===0?[sao,mst]:[mst,sao];
 let s=newUniversalMatch(packs,{decks:owner===0?[saoDeck,mstDeck]:[mstDeck,saoDeck],
  first:owner,seed:57000+owner});
 const source=take(s,owner,ID);source.ready=true;
 s.players[owner][line][0]=source;
 return {packs,s,source,owner,line};
}
function handExactly(s,owner,target){
 const p=s.players[owner];
 while(p.hand.length>target)p.outside.push(p.hand.shift());
 while(p.hand.length<target)p.hand.push(p.deck.shift());
 assert.equal(p.hand.length,target);
}
test('SAO-1-057 source-locked original Japanese, BLUE stats, independent ACTIVE life',()=>{
 const sources=SAO_OFFICIAL_CARDS.filter(c=>c.id===ID);
 assert.equal(sources.length,1);
 const original=sources[0],card=sao.cards[ID];
 assert.equal(original.number,'UA15BT/SAO-1-057');
 assert.equal(original.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-057');
 assert.equal(original.nameJa,'ユージーン');
 assert.equal(original.effectJa,'【自分のターン中】自分の手札が5枚以上の場合、このキャラはBP+500。');
 assert.equal(original.bpPrinted,'3500+');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,
  card.type,card.traits,card.trigger],['ユージーン','blue',3,1,3500,1,
  'character',['ALO'],'active']);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bp:500}]);
 assert.deepEqual(card.effects,{});
 assert.equal(card.implementation,'dsl');
 assert.ok(SAO_V2_PILOT_IDS.includes(ID));
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.deepEqual(verifiedSaoV2Cards().find(c=>c.id===ID).passiveBonuses,card.passiveBonuses);
 assert.deepEqual(saoV2Pack().cards[ID],card);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
for(const owner of [0,1]){
 for(const line of ['front','energy']){
  test('physical SAO057 controller '+owner+' in '+line+': 5 own cards 4000, 4 own cards 3500, opponent turn 3500',()=>{
   const {packs,s,source}=scene(owner,line);
   handExactly(s,owner,5);
   const own=s.players[owner][line][0];
   assert.equal(own.uid,source.uid);
   assert.equal(universalBp(packs,s,own),4000);
   if(line==='front')assert.equal(universalPublicView(packs,s,1-owner).players[owner].front[0].bp,4000);
   const noLongerOwnTurn=structuredClone(s);
   noLongerOwnTurn.active=1-owner;
   assert.equal(universalBp(packs,noLongerOwnTurn,noLongerOwnTurn.players[owner][line][0]),3500);
   if(line==='front')assert.equal(universalPublicView(packs,noLongerOwnTurn,1-owner).players[owner].front[0].bp,3500);
   const four=structuredClone(s);
   four.players[owner].outside.push(four.players[owner].hand.shift());
   assert.equal(four.players[owner].hand.length,4);
   assert.equal(universalBp(packs,four,four.players[owner][line][0]),3500);
   const restored=structuredClone(four);
   restored.players[owner].hand.push(restored.players[owner].outside.pop());
   assert.equal(universalBp(packs,restored,restored.players[owner][line][0]),4000);
   assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
   assert.equal(assertUniversalMatch(packs,s),true);
   assert.equal(assertUniversalMatch(packs,four),true);
   assert.equal(assertUniversalMatch(packs,restored),true);
  });
 }
}
test('opponent hand count is irrelevant even when opponent has >=5 cards; no hidden hand reveal',()=>{
 const {packs,s,owner}=scene(0);
 handExactly(s,owner,4);
 handExactly(s,1,7);
 assert.equal(s.players[1].hand.length,7);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('actual paid SAO057 play consumes blue energy/AP, enters front without synthetic onPlay draw',()=>{
 const packs=[sao,mst];let s=newUniversalMatch(packs,{decks:[saoDeck,mstDeck],first:0,seed:57057});
 for(let i=0;i<3;i++){
  const energy=take(s,0,'SAO-1-039');
  energy.ready=true;s.players[0].energy[i]=energy;
 }
 const source=take(s,0,ID);s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');
 const deck=s.players[0].deck.length,ap=s.players[0].apCards.filter(c=>c.ready).length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'three real BLUE energy sources must satisfy printed energy 3');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),
  s.players[0].hand.length>=5?4000:3500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('generic ownHandCountAtLeast schema rejects wrong scope, zero min, extra keys, and bad numbers',()=>{
 const base={id:'SYN-HAND',name:'Hand-count example',type:'character',color:'blue',
  energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',effects:{}};
 const condition={kind:'ownHandCountAtLeast',turn:'own',min:5};
 const make=q=>createUniversalPack({id:'hand-condition-qa',cards:[
  {...base,passiveBonuses:[{condition:q,bp:500}]}]});
 assert.deepEqual(make(condition).cards[base.id].passiveBonuses[0].condition,condition);
 for(const q of [
  {...condition,min:0},{...condition,min:201},{...condition,min:1.5},
  {...condition,zone:'front'},{...condition,turn:'enemy'},
  {...condition,kind:'opponentHandCountAtLeast'},{kind:'ownHandCountAtLeast',turn:'own'}
 ])assert.throws(()=>make(q),/invalid/);
});
