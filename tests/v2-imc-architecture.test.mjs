import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {imcCatalog,imcCardFace,imcEditorCards} from '../dist/imc/catalog.mjs';
import {IMC_BOOSTER,IMC_GROUPS,IMC_PROMO_IDS,IMC_STARTER,IMC_STARTER_DECK_IDS} from '../dist/imc/product.mjs';
import {loadImcOfficialStarter} from '../dist/imc/starter-deck.mjs';
import {createImcV2Pack,imcProgramFor,IMC_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/imc-pack.mjs';
import {assertImcSharedRequest,imcRange,imcSharedRequests,runImcJob} from '../dist/universal-v2/imc-runtime.mjs';
import {IMC_REQUESTS_001_050} from '../dist/universal-v2/imc/requests-001-050.mjs';
import {IMC_REQUESTS_051_100} from '../dist/universal-v2/imc/requests-051-100.mjs';
import {IMC_REQUESTS_STARTER} from '../dist/universal-v2/imc/requests-starter.mjs';
import {officialV2Pack,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {editorV2Status,normalizeEditorCounts,LEGACY_DECK_KEYS} from '../dist/v2-editor-compat.mjs';
import {prepareSoloBattle} from '../dist/universal-v2/solo-battle-session.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {createService} from '../server/domain.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import ledger from '../docs/audit/effect-audit-ledger.json' with {type:'json'};

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pad=n=>'IMC-1-'+String(n).padStart(3,'0');
const ALL_IDS=Array.from({length:113},(_,i)=>pad(i+1));

test('official IMC identities load and stay unverified',()=>{
 const catalog=imcCatalog();
 assert.deepEqual(catalog.booster.map(card=>card.id),Array.from({length:100},(_,i)=>pad(i+1)));
 assert.deepEqual(catalog.ap.map(card=>card.id),Array.from({length:13},(_,i)=>'IMC-1-AP'+String(i+1).padStart(2,'0')));
 assert.deepEqual(catalog.cards.filter(card=>card.group==='starter').map(card=>card.id),
  Array.from({length:13},(_,i)=>pad(101+i)));
 assert.equal(catalog.deck.length,113);
 assert.equal(catalog.cards.every(card=>card.battleReady===false&&card.auto===false&&!('engineKind' in card)),true);
 const rarity={};
 for(const card of catalog.booster)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 assert.deepEqual(rarity,IMC_BOOSTER.rarities);
 assert.equal(IMC_BOOSTER.regular,100);
 assert.equal(IMC_BOOSTER.ap,13);
 for(const card of catalog.deck){
  assert.match(card.number,/^UA55(?:BT|ST)\/IMC-1-\d{3}$/);
  assert.match(card.image,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\//);
  assert.equal(card.deckLegal,true);
 }
 for(const card of catalog.ap){
  assert.equal(card.deckLegal,false);
  assert.equal(card.type,'action-point');
  assert.equal(card.effect,'');
  assert.equal(card.effectJa,'-');
 }
 const reprints=catalog.reprints;
 assert.equal(reprints.length,9);
 assert.equal(reprints.every(row=>row.samePrintedText===true),true);
 assert.deepEqual(reprints.map(row=>row.id),IMC_STARTER_DECK_IDS.filter(id=>Number(id.slice(6))<=100));
 const reprinted=catalog.byId.get('IMC-1-088');
 assert.ok(reprinted.printings.some(printing=>printing.set==='UA55ST'));
 const ap=catalog.byId.get('IMC-1-AP01');
 assert.deepEqual(ap.sets,['UA55BT','UA55ST']);
 assert.equal(imcEditorCards().some(card=>card.id.startsWith('IMC-1-AP')),false);
 const face=imcCardFace(catalog.byId.get('IMC-1-001'));
 assert.equal(face.id,'IMC-1-001');
 assert.match(face.image,/UA55BT_IMC-1-001\.png$/);
 assert.ok(face.effectJa);
});

test('starter loader names 18 kinds and does not invent the 50-card list',()=>{
 const starter=loadImcOfficialStarter();
 const catalog=imcCatalog();
 assert.equal(starter.ready,false);
 assert.equal(starter.counts,null);
 assert.equal(starter.deckCards,50);
 assert.equal(starter.kinds.length,IMC_STARTER.deckKinds);
 assert.equal(IMC_STARTER.apCopies,3);
 assert.equal(starter.ap.id,'IMC-1-AP01');
 assert.equal(starter.ap.deckLegal,false);
 assert.deepEqual(starter.kinds.map(card=>card.id), [...IMC_STARTER_DECK_IDS]);
 assert.equal(starter.reprints.length,9);
 assert.equal(starter.exclusive.length,9);
 assert.deepEqual(new Set(starter.kinds.map(card=>catalog.byId.get(card.id).color)),new Set(['red']));
 assert.deepEqual(starter.promo.map(card=>card.id), [...IMC_PROMO_IDS]);
 assert.deepEqual(starter.promo.map(card=>({id:card.id,color:card.color,rarity:card.rarity})),[
  {id:'IMC-1-110',color:'yellow',rarity:'R'},
  {id:'IMC-1-111',color:'yellow',rarity:'R'},
  {id:'IMC-1-112',color:'blue',rarity:'R'},
  {id:'IMC-1-113',color:'blue',rarity:'R'}
 ]);
 assert.match(starter.reason,/50/);
});

test('ready IMC cards stay in the controlled pack and cannot open an official match',()=>{
 const pack=officialV2Pack('imc');
 const built=createImcV2Pack();
 assert.equal(pack.kind,'ua-v2-pack');
 assert.equal(pack.id,'imc');
 assert.equal(pack.version,built.version);
 assert.deepEqual(Object.keys(pack.cards),ALL_IDS);
 assert.equal(ALL_IDS.length,113);
 assert.equal(pack.cards['IMC-1-011'].bpGainFollow.bp,1000);
 assert.equal(pack.cards['IMC-1-012'].effects.onPlay[0].op,'grantConditionalSniperThisTurn');
 assert.equal(pack.cards['IMC-1-012'].effects.onPlay[0].minBp,7000);
 assert.equal(pack.cards['IMC-1-012'].effects.onAttack[0].op,'drawIfSelfBpAtLeast');
 assert.equal(pack.cards['IMC-1-039'].mainAbility.op,'discardExactFrontMove');
 assert.equal(pack.cards['IMC-1-039'].mainAbility.count,3);
 assert.equal(pack.cards['IMC-1-051'].mainAbility.gate.bp,4500);
 assert.equal(pack.cards['IMC-1-061'].effects.onPlay[1].then[0].op,'grantAttackPhaseEndHand');
 assert.equal(pack.cards['IMC-1-075'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 assert.equal(pack.cards['IMC-1-075'].passiveBonuses[0].condition.min,6);
 assert.equal(pack.cards['IMC-1-107'].mainAbility.draw,1);
 assert.equal(pack.cards['IMC-1-107'].mainAbility.then[0].energy,3);
 for(const id of ['IMC-1-011','IMC-1-012','IMC-1-039','IMC-1-051','IMC-1-061','IMC-1-075','IMC-1-107'])
  assert.equal(imcProgramFor(id).ready,true,id);
 assert.equal(pack.cards['IMC-1-050'].readyOnBlockCount,1);
 assert.equal(pack.cards['IMC-1-066'].effects.onPlay[1].when.minBp,4500);
 assert.equal(pack.cards['IMC-1-098'].effects.onPlay[2].else[0].then[0].scope,'next');
 assert.equal(pack.cards['IMC-1-102'].effects.onPlay[1].printedBpTraitCount.per,1000);
 assert.equal(pack.cards['IMC-1-106'].effects.onPlay[0].noHandDiscard,true);
 assert.equal(pack.cards['IMC-1-108'].effects.onPlay[0].zone,'front');
 assert.equal(pack.cards['IMC-1-020'].effects.onPlay[0].skipWhen.kind,'selfOwnEffectRaid');
 assert.equal(pack.cards['IMC-1-020'].mainAbility.then[0].op,'raidOwnHandNamed');
 assert.equal(pack.cards['IMC-1-024'].effects.onAttack[1].firstOwnAttack,true);
 assert.equal(pack.cards['IMC-1-052'].mainAbility.then[0].op,'chooseFrontOrOwnTrait');
 assert.equal(pack.cards['IMC-1-054'].nameActive.when.minBp,4500);
 assert.equal(pack.cards['IMC-1-054'].mainAbility.op,'frontOnceProgram');
 assert.equal(pack.cards['IMC-1-111'].effects.onAttack[0].when.kind,'ownRaidColorTrait');
 assert.equal(imcProgramFor('IMC-1-001').ready,true);
 assert.equal(imcProgramFor('IMC-1-003').ready,true);
 assert.equal(imcProgramFor('IMC-1-011').ready,true);
 assert.equal(imcProgramFor('IMC-1-098').ready,true);
 const closed=v2DeckReport('imc',{'IMC-1-011':4});
 assert.equal(closed.ok,false);
 assert.deepEqual(closed.warnings,[]);
 assert.match(closed.issues.join('\n'),/尚未開放正式對戰/);
 assert.doesNotMatch(closed.issues.join('\n'),/尚未支援的效果/);
 const report=v2DeckReport('imc',{'IMC-1-001':4});
 assert.equal(report.ok,false);
 assert.match(report.issues.join('\n'),new RegExp(IMC_OFFICIAL_MATCH_CLOSED));
 const status=editorV2Status('imc',{'IMC-1-001':4});
 assert.equal(status.ready,false);
 assert.equal(status.registered,113);
 assert.match(status.issues.join('\n'),/尚未開放正式對戰/);
 assert.throws(()=>normalizeEditorCounts('imc',{'IMC-1-AP01':1}),/無效卡號/);
 assert.deepEqual(normalizeEditorCounts('imc',{'UA55BT/IMC-1-001':2}),{'IMC-1-001':2});
 assert.deepEqual(LEGACY_DECK_KEYS.imc,['ua-imc-draft-v1','ua-imc-saved-v1']);
 const title=TITLES.find(item=>item.id==='imc');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,113);
 assert.equal(title.cards.every(card=>card.battleReady===false&&card.playable===false),true);
 assert.equal(Object.keys(officialV2Pack('csm').cards).length,80);
 assert.equal(TITLES.find(item=>item.id==='bleach').playable,true);
 assert.throws(()=>prepareSoloBattle({
  mine:{pack,counts:{'IMC-1-001':4},label:'草稿'},
  foe:{pack,counts:{'IMC-1-001':4},label:'草稿'},
  first:0,difficulty:'easy'
 }),new RegExp(IMC_OFFICIAL_MATCH_CLOSED));
 assert.match(read('dist/universal-v2-preview.mjs'),/raw\.title==='imc'/);
 assert.doesNotMatch(read('dist/universal-v2/engine.mjs'),/op==='imc'/);
});

test('IMC-1-098 reuses draw and the next trait AP discount, and the entry grant is not a field-only name count',()=>{
 const card=imcCatalog().byId.get('IMC-1-098');
 assert.equal(card.number,'UA55BT/IMC-1-098');
 assert.equal(card.type,'event');
 assert.equal(card.trigger,'special');
 assert.match(card.effectJa,/カードを1枚引く。このターン中、次に手札から使用する［特徴：お願い！シンデレラ］の消費APを-1する/);
 assert.match(card.effectJa,/自分の場と場外に［特徴：お願い！シンデレラ］のカード名が合計6種類以上/);
 assert.match(card.effectJa,/『次に自分の場に登場させる［特徴：お願い！シンデレラ］1枚』は、アクティブで登場させる/);
 assert.match(card.effectJa,/合計9種類以上ある場合、『自分の場に登場させる［特徴：お願い！シンデレラ］全て』に代わる/);
 const probe=createUniversalPack({id:'probe',version:'imc-098-pieces',cards:[{
  id:'PROBE-098',name:'イベント',color:'red',type:'event',energy:4,ap:1,bp:0,gen:0,
  trigger:'special',triggerEffect:{op:'retireOppFront'},traits:[],implementation:'dsl',
  effects:{onPlay:[
   {op:'draw',count:1},
   {op:'nextEligibleHandPlayApDiscount',filter:{trait:'お願い！シンデレラ'}}
  ]}
 }]});
 assert.deepEqual(probe.cards['PROBE-098'].effects.onPlay.map(step=>step.op),
  ['draw','nextEligibleHandPlayApDiscount']);
 const printed=physical=>({name:physical.name,traits:physical.traits,type:'character'});
 const outside={uid:'0-1',name:'島村卯月',traits:['お願い！シンデレラ']};
 const state={players:[
  {front:[],energy:[],outside:[outside]},
  {front:[],energy:[],outside:[]}
 ]};
 const condition={kind:'ownDistinctTraitNames',turn:'any',min:1,zone:'field',excludeSelf:false,
  trait:'お願い！シンデレラ'};
 assert.equal(matchesV2LiveCondition(state,0,null,condition,printed),false);
 state.players[0].front.push(outside);
 assert.equal(matchesV2LiveCondition(state,0,null,condition,printed),true);
});

test('IMC-1-102 raid and impact use the printed-BP ceiling inside the battle pack',()=>{
 const card=imcCatalog().byId.get('IMC-1-102');
 assert.equal(card.number,'UA55ST/IMC-1-102');
 assert.equal(card.bp,4000);
 assert.equal(card.trigger,'raid');
 assert.deepEqual(card.traitComponents,['new generations','お願い！シンデレラ']);
 assert.match(card.effectJa,/【レイド】〈渋谷 凛〉アクティブにし、フロントLに移動できる/);
 assert.match(card.effectJa,/【登場時】このキャラはこのターン中、【インパクト（1）】/);
 assert.match(card.effectJa,/自分の場の元々のBPが4000の他の［特徴：new generations］の枚数×1000以下のBP/);
 assert.match(card.effectJa,/1枚まで選び、退場させる/);
 const face={
  id:'PROBE-102',name:'渋谷 凛',color:'red',type:'character',energy:5,ap:1,bp:4000,gen:1,
  trigger:'raid',raidName:'渋谷 凛',implementation:'dsl',
  traits:['new generations／お願い！シンデレラ'],
  traitComponents:['new generations','お願い！シンデレラ']
 };
 const impact={...face,effects:{onPlay:[{op:'grantSelfImpactThisTurn',amount:1}]}};
 createUniversalPack({id:'probe',version:'imc-102-impact',cards:[impact]});
 const scaled={...face,effects:{onPlay:[
  {op:'grantSelfImpactThisTurn',amount:1},
  {op:'retireOppFrontUnderBp',optional:true,printedBpTraitCount:{
   trait:'new generations',printedBp:4000,per:1000,excludeSelf:true
  }}
 ]}};
 const accepted=createUniversalPack({id:'probe',version:'imc-102-scale',cards:[scaled]});
 assert.equal(accepted.cards['PROBE-102'].effects.onPlay[1].printedBpTraitCount.per,1000);
 assert.equal(createImcV2Pack().cards['IMC-1-102'].raidName,'渋谷 凛');
 assert.equal(createImcV2Pack().cards['IMC-1-113'].effects.onPlay[0].op,'chooseFrontOrOwnTrait');
 assert.equal(createImcV2Pack().cards['IMC-1-111'].effects.onAttack[0].when.kind,'ownRaidColorTrait');
 assert.equal(createImcV2Pack().cards['IMC-1-107'].mainAbility.op,'restRetireSequence');
 assert.equal(createImcV2Pack().cards['IMC-1-107'].mainAbility.then[0].color,'red');
 assert.equal(createImcV2Pack().cards['IMC-1-112'].effects.onPlay[0].op,'bottomOwnCharacterThen');
 assert.equal(createImcV2Pack().cards['IMC-1-112'].raidName,'渋谷 凛');
 assert.equal(createImcV2Pack().cards['IMC-1-112'].impactNull,true);
});

test('group ranges, request files and the audit ledger stay separate',()=>{
 assert.equal(imcRange('IMC-1-001'),'b');
 assert.equal(imcRange('IMC-1-050'),'b');
 assert.equal(imcRange('IMC-1-051'),'c');
 assert.equal(imcRange('IMC-1-100'),'c');
 assert.equal(imcRange('IMC-1-101'),'d');
 assert.equal(imcRange('IMC-1-113'),'d');
 assert.equal(imcRange('IMC-1-114'),null);
 assert.equal(imcRange('IMC-1-AP01'),null);
 assert.throws(()=>runImcJob(null,null,{op:'imc',id:'IMC-1-098'}),/C 組還沒有/);
 assert.deepEqual(imcSharedRequests(),[]);
 assert.deepEqual(IMC_REQUESTS_001_050,[]);
 assert.deepEqual(IMC_REQUESTS_051_100,[]);
 assert.deepEqual(IMC_REQUESTS_STARTER,[]);
 assert.throws(()=>assertImcSharedRequest({
  cardId:'IMC-1-098',sentence:'x',existingOps:[],whyNotEnough:'x',proposal:'x'
 }),/existing op/);
 assertImcSharedRequest({
  cardId:'IMC-1-098',sentence:'場與場外的不同卡名',
  existingOps:['draw','nextEligibleHandPlayApDiscount'],
  whyNotEnough:'ownDistinctTraitNames 只看場上',
  proposal:'先留在 C 組 runtime'
 });
 const root=new URL('../',import.meta.url);
 for(const group of Object.values(IMC_GROUPS)){
  for(const path of Object.values(group)){
   if(path.startsWith('dist/')||path.startsWith('tests/'))
    assert.equal(existsSync(new URL(path,root)),true,path);
  }
 }
 assert.equal(ledger.summary.playable.total,938);
 assert.equal(ledger.summary.playable.已驗證,938);
 assert.equal(ledger.summary.series.some(series=>series.id==='imc'),false);
 assert.doesNotMatch(read('scripts/build-effect-audit-ledger.mjs'),/id:'imc'/);
});

test('an unfinished IMC deck can be saved and cannot open a two-player room',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-imc-arch-'));
 const sql=openDatabase(join(dir,'account.sqlite'));
 const service=createService({sql,now:()=>Date.parse('2026-11-12T00:00:00Z')});
 try{
  const {token}=await service.register({username:'imcarch',password:'correct-horse-123'},{ip:'127.0.0.1'});
  const saved=await service.saveDeck(token,{
   name:'灰姑娘草稿',title:'imc',counts:{'IMC-1-001':4},localId:'imc-local-1'
  });
  assert.equal(saved.deck.title,'imc');
  assert.equal(saved.deck.titleLabel,'偶像大師 灰姑娘女孩');
  assert.equal(saved.deck.playable,false);
  await assert.rejects(
   ()=>service.createRoom(token,{deckId:saved.deck.id,first:'me'}),
   error=>error?.status===400
  );
  await assert.rejects(
   ()=>service.saveDeck(token,{name:'AP',title:'imc',counts:{'IMC-1-AP01':1}}),
   error=>error?.status===400
  );
 }finally{
  sql.close();
  await rm(dir,{recursive:true,force:true});
 }
});
