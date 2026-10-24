import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_PILOT_IDS,verifiedSaoV2Cards,saoV2Pack} from '../dist/universal-v2/sao-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const sao=registeredV2TitlePack('sword-art-online'),mst=registeredV2TitlePack('mushoku-tensei'),ID='SAO-2-019';
const ids=['SAO-2-015','SAO-2-016','SAO-2-017','SAO-2-019','SAO-2-021','SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-047','SAO-1-052','SAO-1-054','SAO-1-055'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));deck[ids.at(-1)]=2;
const mstIds=['001','002','003','010','012','013','015','017','019','020','022','024','027'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));mstDeck['MST-1-027']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0]}throw Error('missing UID '+id);}
function scene(owner=0,ownZone='front'){
 const packs=owner===0?[sao,mst]:[mst,sao];
 let s=newUniversalMatch(packs,{decks:owner===0?[deck,mstDeck]:[mstDeck,deck],first:owner,seed:20190+owner});
 let source=take(s,owner,ID);source.ready=true;s.players[owner].front[0]=source;
 if(ownZone==='front'||ownZone==='energy'){let friend=take(s,owner,'SAO-2-017');friend.ready=true;s.players[owner][ownZone][ownZone==='front'?1:0]=friend;}
 for(let i=0;i<5&&s.phase!=='main';i++){const x=legalUniversalActions(packs,s).find(a=>a.type==='next');assert.ok(x);s=dispatchUniversalAction(packs,s,x);}
 assert.equal(s.phase,'main');
 return {packs,s,source,owner};
}
test('SAO2019 full EX08BT original Japanese and live OWN-name passive matches shared MST024 predicate',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id===ID&&c.number==='EX08BT/SAO-2-019');
 assert.ok(source);
 assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-019');
 assert.equal(source.effectJa,'【自分のターン中】自分の場に〈シリカ〉がある場合、このキャラはBP+2000。');
 assert.equal(source.bpPrinted,'2000+');
 const p=sao.cards[ID];
 assert.deepEqual([p.name,p.color,p.energy,p.ap,p.bp,p.gen,p.trigger,p.traits],
  ['ピナ','blue',2,1,2000,1,'active',['アインクラッド']]);
 assert.deepEqual(p.passiveBonuses,[{condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:true,name:'シリカ'},bp:2000}]);
 assert.equal(p.effects.onPlay,undefined);
 assert.equal(p.impactNull,false);
 assert.ok(SAO_V2_PILOT_IDS.includes(ID));
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.deepEqual(verifiedSaoV2Cards().find(c=>c.id===ID).passiveBonuses,p.passiveBonuses);
 assert.deepEqual(saoV2Pack().cards[ID],p);
 assert.deepEqual(validateUniversalDeck(sao,deck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
for(const owner of [0,1]){
 for(const zone of ['front','energy']){
  test('SAO2019 owner '+owner+' with OWN シリカ in '+zone+': BP 4000 own turn, 2000 opponent turn, no stale value',()=>{
   const {packs,s,source}=scene(owner,zone);
   assert.equal(universalBp(packs,s,s.players[owner].front[0]),4000);
   const foe=structuredClone(s);foe.active=1-owner;
   assert.equal(universalBp(packs,foe,foe.players[owner].front[0]),2000);
   assert.equal(universalBp(packs,s,s.players[owner].front[0]),4000);
   const changed=structuredClone(s);
   const index=zone==='front'?1:0;
   const moved=changed.players[owner][zone][index];
   changed.players[owner][zone][index]=null;changed.players[owner].hand.push(moved);
   assert.equal(universalBp(packs,changed,changed.players[owner].front[0]),2000);
   assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
   assert.equal(assertUniversalMatch(packs,s),true);
   assert.equal(assertUniversalMatch(packs,changed),true);
  });
 }
}
test('SAO2019 opponent シリカ and OWN hand/outside never satisfy own-field passive',()=>{
 const packs=[sao,sao];
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:21990});
 const p=take(s,0,ID);p.ready=true;s.players[0].front[0]=p;
 const opp=take(s,1,'SAO-2-017');opp.ready=true;s.players[1].front[0]=opp;
 s.players[0].hand.push(take(s,0,'SAO-2-017'));
 s.players[0].outside.push(take(s,0,'SAO-2-017'));
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict V2 ownNameExists field predicate rejects fake opponent scope, empty name, and schema drift',()=>{
 const base={id:'SYN-019',name:'Synthetic',color:'blue',energy:0,ap:1,bp:2000,gen:1,type:'character',implementation:'dsl',passiveBonuses:[{condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:true,name:'シリカ'},bp:2000}]};
 assert.ok(createUniversalPack({id:'strict-own-name',cards:[base]}).cards['SYN-019']);
 for(const invalid of [
  {...base.passiveBonuses[0],condition:{...base.passiveBonuses[0].condition,name:''}},
  {...base.passiveBonuses[0],condition:{...base.passiveBonuses[0].condition,includeOpponent:true}},
  {...base.passiveBonuses[0],condition:{...base.passiveBonuses[0].condition,zone:'hand'}},
  {...base.passiveBonuses[0],condition:{...base.passiveBonuses[0].condition,turn:'enemy'}}
 ])assert.throws(()=>createUniversalPack({id:'strict-own-name',cards:[{...base,passiveBonuses:[invalid]}]}),/invalid/);
});
