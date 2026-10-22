import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_PILOT_IDS,verifiedSaoV2Cards,saoV2Pack} from '../dist/universal-v2/sao-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const ID='SAO-1-020';
const saoIds=['SAO-1-019','SAO-1-020','SAO-1-014','SAO-2-015','SAO-2-016','SAO-2-017','SAO-2-019',
 'SAO-2-021','SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-047'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));saoDeck[saoIds.at(-1)]=2;
const mstIds=['001','002','003','010','012','013','015','017','019','020','022','024','027'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));mstDeck['MST-1-027']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing genuine physical '+id);
}
function scenario(owner,line='front'){
 const packs=owner===0?[sao,mst]:[mst,sao];
 let s=newUniversalMatch(packs,{decks:owner===0?[saoDeck,mstDeck]:[mstDeck,saoDeck],
  first:owner,seed:20020+owner});
 const source=take(s,owner,ID);source.ready=true;s.players[owner][line][0]=source;
 return {s,packs,source,owner,line};
}
function life(s,p,n){
 const pl=s.players[p];
 assert.ok(n>=1&&n<=7);
 while(pl.life.length>n)pl.hand.push(pl.life.shift());
 while(pl.life.length<n)pl.life.unshift(pl.hand.pop());
 assert.equal(pl.life.length,n);
}
test('official SAO-1-020 original Japanese exact printed trigger, numbers and generic own-life predicate',()=>{
 const originals=SAO_OFFICIAL_CARDS.filter(c=>c.id===ID);
 assert.equal(originals.length,1);
 const source=originals[0],c=sao.cards[ID];
 assert.equal(source.number,'UA15BT/SAO-1-020');
 assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-020');
 assert.equal(source.nameJa,'アスナ（創世神ステイシア）');
 assert.equal(source.effectJa,'自分のライフが4以下の場合、このキャラはBP+500。');
 assert.equal(source.bpPrinted,'2500+');
 assert.deepEqual([c.name,c.color,c.energy,c.ap,c.bp,c.gen,c.type,c.traits,c.trigger],
  [source.nameJa,'yellow',1,1,2500,1,'character',['女神'],null]);
 assert.deepEqual(c.passiveBonuses,[{condition:{kind:'ownLifeAtMost',turn:'any',max:4},bp:500}]);
 assert.deepEqual(c.effects,{});
 assert.equal(c.implementation,'dsl');
 assert.ok(SAO_V2_PILOT_IDS.includes(ID));
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.deepEqual(verifiedSaoV2Cards().find(x=>x.id===ID).passiveBonuses,c.passiveBonuses);
 assert.deepEqual(saoV2Pack().cards[ID],c);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
for(const owner of [0,1]){
 for(const line of ['front','energy']){
  test('actual SAO-1-020 P'+owner+' '+line+' own life 7→5→4→5 changes BP 2500→2500→3000→2500 across turns',()=>{
   const {s,packs,source}=scenario(owner,line);
   const card=s.players[owner][line][0];assert.equal(card.uid,source.uid);
   assert.equal(s.players[owner].life.length,7);
   assert.equal(universalBp(packs,s,card),2500);
   life(s,owner,5);
   assert.equal(universalBp(packs,s,card),2500);
   life(s,owner,4);
   assert.equal(universalBp(packs,s,card),3000);
   if(line==='front')
    assert.equal(universalPublicView(packs,s,1-owner).players[owner].front[0].bp,3000);
   const oppositeTurn=structuredClone(s);
   oppositeTurn.active=1-owner;
   assert.equal(universalBp(packs,oppositeTurn,oppositeTurn.players[owner][line][0]),3000,
    'printed condition is unconditional, NOT own-turn only');
   life(s,owner,5);
   assert.equal(universalBp(packs,s,card),2500);
   assert.equal(universalBp(packs,oppositeTurn,oppositeTurn.players[owner][line][0]),3000,
    'pure state snapshots do not mutate each other');
   assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
   assert.equal(assertUniversalMatch(packs,s),true);
   assert.equal(assertUniversalMatch(packs,oppositeTurn),true);
  });
 }
}
test('opponent at 4 lives cannot grant SAO-1-020 BP unless controller also meets its OWN threshold',()=>{
 const {s,packs,owner}=scenario(0);
 assert.equal(s.players[owner].life.length,7);
 life(s,1-owner,4);
 assert.equal(universalBp(packs,s,s.players[owner].front[0]),2500);
 s.active=1-owner;
 assert.equal(universalBp(packs,s,s.players[owner].front[0]),2500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('real AP-paid yellow-energy SAO-1-020 play does not manufacture BP or extra draw',()=>{
 const packs=[sao,mst];
 let s=newUniversalMatch(packs,{decks:[saoDeck,mstDeck],first:0,seed:2020});
 const energy=take(s,0,'SAO-1-019');energy.ready=true;s.players[0].energy[0]=energy;
 const source=take(s,0,ID);s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 }
 assert.equal(s.phase,'main');
 const ap=s.players[0].apCards.filter(c=>c.ready).length,deck=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'the genuine yellow generator satisfies SAO020 printed yellow1');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('generic ownLifeAtMost schema allows max 0 to 10, rejects min/cyclic/foreign keys and wrong numeric types',()=>{
 const base={id:'SYN-LIFE',name:'Life threshold',type:'character',color:'yellow',
  energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',effects:{}};
 const cond={kind:'ownLifeAtMost',turn:'any',max:4};
 const make=q=>createUniversalPack({id:'life-qa',cards:[{...base,passiveBonuses:[{condition:q,bp:500}]}]});
 assert.deepEqual(make(cond).cards[base.id].passiveBonuses[0].condition,cond);
 assert.equal(make({...cond,max:0}).cards[base.id].passiveBonuses[0].condition.max,0);
 assert.equal(make({...cond,max:10}).cards[base.id].passiveBonuses[0].condition.max,10);
 for(const bad of [{...cond,max:-1},{...cond,max:11},{...cond,max:4.5},
  {...cond,max:'4'},{...cond,min:4},{...cond,zone:'front'},
  {...cond,max:null},{kind:'ownLifeAtMost',turn:'any'},
  {...cond,kind:'opponentLifeAtMost'},{...cond,turn:'foe'}])
  assert.throws(()=>make(bad),/invalid/);
});
