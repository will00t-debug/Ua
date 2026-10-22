import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_PILOT_IDS,verifiedSaoV2Cards,saoV2Pack} from '../dist/universal-v2/sao-pack.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalBp,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const sao=registeredV2TitlePack('sword-art-online'),mst=registeredV2TitlePack('mushoku-tensei'),ID='SAO-1-051';
const saoIds=['SAO-1-051','SAO-1-039','SAO-1-035','SAO-1-054','SAO-2-015','SAO-2-016',
 'SAO-2-017','SAO-2-019','SAO-2-021','SAO-1-046','SAO-1-047','SAO-1-052','SAO-1-057'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));saoDeck[saoIds.at(-1)]=2;
const mstIds=['001','002','003','010','012','013','015','017','019','020','022','024','027'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));mstDeck['MST-1-027']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function scene(owner,line='front'){
 const packs=owner===0?[sao,mst]:[mst,sao];
 let s=newUniversalMatch(packs,{decks:owner===0?[saoDeck,mstDeck]:[mstDeck,saoDeck],first:owner,seed:10510+owner});
 const source=take(s,owner,ID);source.ready=true;s.players[owner][line][0]=source;
 return {packs,s,source,owner,line};
}
function exactHand(s,owner,n){
 const p=s.players[owner];
 while(p.hand.length>n)p.outside.push(p.hand.shift());
 while(p.hand.length<n)p.hand.push(p.deck.shift());
 assert.equal(p.hand.length,n);
}
test('official full SAO-1-051 Japanese two-clause print and combined native shared rules source pinned',()=>{
 const source=SAO_OFFICIAL_CARDS.filter(c=>c.id===ID);
 assert.equal(source.length,1);
 const original=source[0],card=sao.cards[ID];
 assert.equal(original.number,'UA15BT/SAO-1-051');
 assert.equal(original.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-051');
 assert.equal(original.effectJa,
  '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）\n【自分のターン中】自分の手札が5枚以上の場合、このキャラはBP+1000。');
 assert.equal(original.bpPrinted,'2000+');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.traits,card.trigger,card.type],
  ['キリト','blue',1,1,2000,1,['ALO'],null,'character']);
 assert.equal(card.impactNull,true);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bp:1000}]);
 assert.deepEqual(card.passiveBonuses[0].condition,sao.cards['SAO-1-057'].passiveBonuses[0].condition);
 assert.equal(card.implementation,'dsl');
 assert.equal(SAO_V2_PILOT_IDS.filter(id=>id===ID).length,1);
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.deepEqual(verifiedSaoV2Cards().find(c=>c.id===ID).passiveBonuses,card.passiveBonuses);
 assert.deepEqual(saoV2Pack().cards[ID],card);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
for(const owner of [0,1]){
 for(const line of ['front','energy']){
  test('SAO051 P'+owner+' '+line+': simultaneous IMPACT null and own hand 5→4→5 BP 3000→2000→3000',()=>{
   const {s,packs,source}=scene(owner,line);const card=s.players[owner][line][0];
   assert.equal(card.uid,source.uid);
   exactHand(s,owner,5);
   assert.equal(universalBp(packs,s,card),3000);
   assert.equal(sao.cards[ID].impactNull,true);
   if(line==='front')
    assert.equal(universalPublicView(packs,s,1-owner).players[owner].front[0].bp,3000);
   const otherTurn=structuredClone(s);
   otherTurn.active=1-owner;
   assert.equal(universalBp(packs,otherTurn,otherTurn.players[owner][line][0]),2000);
   const four=structuredClone(s);four.players[owner].outside.push(four.players[owner].hand.shift());
   assert.equal(four.players[owner].hand.length,4);
   assert.equal(universalBp(packs,four,four.players[owner][line][0]),2000);
   const fiveAgain=structuredClone(four);
   fiveAgain.players[owner].hand.push(fiveAgain.players[owner].outside.pop());
   assert.equal(universalBp(packs,fiveAgain,fiveAgain.players[owner][line][0]),3000);
   assert.equal(sao.cards[ID].impactNull,true,'impact null persists independent of hand predicate');
   assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
   assert.equal(assertUniversalMatch(packs,s),true);
   assert.equal(assertUniversalMatch(packs,otherTurn),true);
   assert.equal(assertUniversalMatch(packs,four),true);
   assert.equal(assertUniversalMatch(packs,fiveAgain),true);
  });
 }
}
test('opponent hand >=5, while own hand 4, never supplies printed own-card BP buff',()=>{
 const {s,packs,owner}=scene(0);
 exactHand(s,owner,4);exactHand(s,1-owner,7);
 assert.equal(universalBp(packs,s,s.players[owner].front[0]),2000);
 assert.equal(sao.cards[ID].impactNull,true);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('real BLUE1 AP1 normal play has neither phantom onPlay nor false conditional BP',()=>{
 const packs=[sao,mst];let s=newUniversalMatch(packs,{decks:[saoDeck,mstDeck],first:0,seed:51051});
 const energy=take(s,0,'SAO-1-039');energy.ready=true;s.players[0].energy[0]=energy;
 const source=take(s,0,ID);s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');
 const ap=s.players[0].apCards.filter(c=>c.ready).length,oldDeck=s.players[0].deck.length;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(act,'one physical BLUE generator pays required BLUE1');
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.players[0].deck.length,oldDeck);
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),s.players[0].hand.length>=5?3000:2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict schema rejects impactNull: false or non-boolean and forged conditional min/turn scope',()=>{
 const base={id:'QA-051',name:'Synthetic combined',color:'blue',energy:1,ap:1,bp:2000,gen:1,
  type:'character',implementation:'dsl',effects:{},impactNull:true,
  passiveBonuses:[{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bp:1000}]};
 const make=c=>createUniversalPack({id:'composite-qa',cards:[c]});
 assert.equal(make(base).cards[base.id].impactNull,true);
 for(const impact of [false,'true',1,null])
  assert.throws(()=>make({...base,impactNull:impact}),/invalid IMPACT/);
 for(const cond of [{kind:'ownHandCountAtLeast',turn:'own',min:0},
  {kind:'ownHandCountAtLeast',turn:'foe',min:5},
  {kind:'ownHandCountAtLeast',turn:'own',min:5,zone:'front'}])
  assert.throws(()=>make({...base,passiveBonuses:[{condition:cond,bp:1000}]}),/invalid/);
});
