import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {UA54BT_VERIFIED as LEGACY_MST} from '../dist/mushoku-tensei.mjs';
import {MST_V2_OFFICIAL_CATALOGUE,MST_V2_OFFICIAL_BY_ID,MST_V2_OFFICIAL_LIMITS}
 from '../dist/universal-v2/sources/mst-inventory.mjs';
import {SAO_V2_PILOT_IDS,saoV2Pack,verifiedSaoV2Entries}
 from '../dist/universal-v2/sao-pack.mjs';
import {MST_V2_PILOT_IDS,mstV2Pack,verifiedMstV2Entries}
 from '../dist/universal-v2/mst-pack.mjs';
import saoContribution from '../dist/universal-v2/title-packs/sao.mjs';
import mstContribution from '../dist/universal-v2/title-packs/mst.mjs';
import {compileV2TitleContribution} from '../dist/universal-v2/title-packs/contract.mjs';
import {registeredV2TitlePack,listRegisteredV2Titles}
 from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_REAL_DECK_COUNTS,MST_V2_REAL_DECK_COUNTS,
 verifiedSaoV2RealDeck,verifiedMstV2RealDeck}
 from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalBp} from '../dist/universal-v2/engine.mjs';

const stableIds=x=>Object.keys(x.cards).sort();
const mod=e=>structuredClone(e);
const auditedStatKeys=['energy','ap','bp','gen','type','color','trigger'];

test('SAO and MST formal contributions meet strict sourceRecord/definition/evidence contract',()=>{
 for(const [title,contribution,ids,entries] of [
  ['sword-art-online',saoContribution,SAO_V2_PILOT_IDS,verifiedSaoV2Entries],
  ['mushoku-tensei',mstContribution,MST_V2_PILOT_IDS,verifiedMstV2Entries]
 ]){
  const expected=EXPECTED_V2_COUNTS[title];
  assert.equal(contribution.title,title);
  assert.equal(contribution.entries.length,expected);
  assert.deepEqual(contribution.entries.map(e=>e.id).sort(),[...ids].sort());
  const compiled=compileV2TitleContribution(contribution);
  assert.deepEqual([...compiled.cardIds].sort(),[...ids].sort());
  const viaRegistry=registeredV2TitlePack(title);
  const standalone=title==='sword-art-online'?saoV2Pack():mstV2Pack();
  assert.equal(Object.keys(viaRegistry.cards).length,expected);
  assert.deepEqual(stableIds(viaRegistry),stableIds(standalone));
  for(const id of ids){
   assert.deepEqual(viaRegistry.cards[id],standalone.cards[id],
    'registry cannot diverge from standalone authored definition '+id);
   const entry=contribution.entries.find(e=>e.id===id);
   assert.ok(entry.sourceRecord.source.startsWith('https://www.unionarena-tcg.com/jp/cardlist/'));
   assert.equal(entry.sourceRecord.number.endsWith('/'+id),true);
   assert.ok(entry.sourceRecord.effectJa.includes(entry.evidence.printedTextFragments[0]));
   assert.ok(entry.evidence.testFiles.length>0);
   assert.ok(entry.evidence.reviewNote.includes(id));
   for(const key of auditedStatKeys)
    assert.equal(entry.definition[key]??null,entry.sourceRecord[key]??null,id+' '+key);
   assert.equal(entry.definition.implementation==='vanilla',
    !!entry.evidence.verifiedNoExtraEffects);
  }
  assert.deepEqual(entries().map(e=>e.id),contribution.entries.map(e=>e.id));
 }
 const listed=listRegisteredV2Titles();
 assert.equal(listed.find(x=>x.title==='sword-art-online').newlyContributed,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.equal(listed.find(x=>x.title==='mushoku-tensei').newlyContributed,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.ok(listed.find(x=>x.title==='sword-art-online').previewReady);
 assert.ok(listed.find(x=>x.title==='mushoku-tensei').previewReady);
});
test('formal contract rejects stale source card, altered stats, missing text, forged vanilla and missing QA',()=>{
 for(const c of [saoContribution,mstContribution]){
  const first=c.entries[0];
  const mutations=[
   e=>{e.definition.energy+=1;},
   e=>{e.evidence.printedTextFragments=['wrong text'];},
   e=>{e.sourceRecord.number='WRONG';},
   e=>{e.sourceRecord.source='https://fake.example/test';},
   e=>{e.evidence.testFiles=[];},
   e=>{e.evidence.reviewNote='';},
   e=>{e.definition.implementation='vanilla';delete e.evidence.verifiedNoExtraEffects;},
   e=>{e.definition.implementation='dsl';e.definition.templateEffects={onPlay:[{template:'fabricated'}]};}
  ];
  for(const mutation of mutations){
   const e=mod(first);mutation(e);
   assert.throws(()=>compileV2TitleContribution({
    ...c,entries:[e]
   }),/printed|source|missing|requires|document|unknown|invalid|not verified|verified|changed|vanilla/i);
  }
  assert.throws(()=>compileV2TitleContribution({...c,entries:[first,first]}),/duplicate/);
 }
});
test('SAO official 202 printings deduplicate to 183 IDs; IDs outside the manifest stay unregistered',()=>{
 assert.equal(SAO_OFFICIAL_CARDS.length,202);
 assert.equal(new Set(SAO_OFFICIAL_CARDS.map(c=>c.id)).size,183);
 assert.equal(SAO_V2_PILOT_IDS.length,EXPECTED_V2_COUNTS['sword-art-online']);
 for(const id of SAO_V2_PILOT_IDS)
  assert.ok(SAO_OFFICIAL_CARDS.find(r=>r.id===id),'SAO source '+id);
 const registry=registeredV2TitlePack('sword-art-online');
 assert.equal(Object.keys(registry.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 // R53 whole-print green STEP+named-OUTSIDE onPlay now has its own
 // official source pin, strict effect schema and 50-card action test.
 assert.deepEqual(registry.cards['SAO-2-063'].effects.onPlay,
  [{op:'drawIfOwnOutsideNamedCountAtLeast',min:2,
   names:['ユウキ','マザーズ・ロザリオ'],count:1}]);
 assert.equal(registry.cards['SAO-2-063'].step,true);
 assert.equal(registry.cards['SAO-2-044'],undefined,
  'unreviewed SAO-2-044 must stay unregistered');
});
test('MST all 80 official Japanese records are available separately from old placeholder master',()=>{
 assert.equal(LEGACY_MST.length,80);
 assert.equal(MST_V2_OFFICIAL_CATALOGUE.length,80);
 assert.equal(new Set(MST_V2_OFFICIAL_CATALOGUE.map(c=>c.id)).size,80);
 const prepared=r=>['energy','ap','bp','gen','color','type'].every(k=>r[k]!==null&&r[k]!==undefined)
  &&!!String(r.nameJa||r.name||'').trim()&&!!String(r.effect||'').trim();
 assert.equal(MST_V2_OFFICIAL_CATALOGUE.filter(prepared).length,80);
 assert.ok(LEGACY_MST.filter(prepared).length<80,'legacy main line is still incomplete');
 for(let i=0;i<80;i++){
  const id='MST-1-'+String(i+1).padStart(3,'0'),c=MST_V2_OFFICIAL_CATALOGUE[i];
  assert.equal(c.id,id);
  assert.equal(c.effect,c.effectJa);
  assert.equal(c.number,'UA54BT/'+id);
  assert.equal(c.dataEvidence.includes('not certify V2 rules'),true);
  assert.equal(MST_V2_OFFICIAL_BY_ID[id],c);
 }
 assert.equal(MST_V2_OFFICIAL_LIMITS['MST-1-051'].maxCopies,1);
 assert.equal(MST_V2_OFFICIAL_LIMITS['MST-1-051'].effectiveFrom,'2026-10-01');
 assert.equal(registeredV2TitlePack('mushoku-tensei').cards['MST-1-051'].maxCopies,1,
  'official 051 restricted limit must survive registry');
});
test('both 50-card decks are truly registered, one title each, validated without fake or AP fillers',()=>{
 const pairs=[[verifiedSaoV2RealDeck(),SAO_V2_REAL_DECK_COUNTS,'SAO-'],
  [verifiedMstV2RealDeck(),MST_V2_REAL_DECK_COUNTS,'MST-']];
 for(const [{pack,counts},expected,prefix] of pairs){
  assert.deepEqual(counts,expected);
  assert.deepEqual(validateUniversalDeck(pack,counts),[]);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
  assert.ok(Object.keys(counts).every(id=>id.startsWith(prefix)&&
   !/TEST|FILLER|AP-?/i.test(id)&&pack.cards[id]));
  const limited=Object.entries(counts).filter(([id])=>
   ['special','color','final'].includes(pack.cards[id].trigger));
  for(const trigger of ['special','color','final'])
   assert.ok(limited.filter(([id])=>pack.cards[id].trigger===trigger)
    .reduce((sum,[,n])=>sum+n,0)<=4);
  for(const [id,cap] of Object.entries(MST_V2_OFFICIAL_LIMITS))
   assert.ok((counts[id]||0)<=cap.maxCopies);
 }
 const invalid={...MST_V2_REAL_DECK_COUNTS,'MST-1-051':2};
 invalid[Object.keys(MST_V2_REAL_DECK_COUNTS)[0]]-=2;
 assert.match(validateUniversalDeck(verifiedMstV2RealDeck().pack,invalid).join(';'),/0–1 copies/);
});
test('registry drives actual SAO vs MST 50-card physical-card match; no synthetic cards across turns',()=>{
 const a=verifiedSaoV2RealDeck(),b=verifiedMstV2RealDeck();
 const packs=[a.pack,b.pack],decks=[a.counts,b.counts];
 let state=newUniversalMatch(packs,{decks,seed:151011,first:0});
 assert.equal(state.title,'cross-title');
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(universalPublicView(packs,state,0).players[0].title,'sword-art-online');
 assert.equal(universalPublicView(packs,state,1).players[1].title,'mushoku-tensei');
 let steps=0;
 for(;steps<3500&&state.status==='playing';steps++){
  const actor=state.pending?.player??state.active;
  const ai=chooseUniversalAiAction(packs,state,{difficulty:actor===0?'normal':'hard'});
  assert.ok(ai,'No legitimate action at '+steps+' '+JSON.stringify(state.pending));
  assert.ok(legalUniversalActions(packs,state).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  state=dispatchUniversalAction(packs,state,ai,{actor});
  if(steps%50===0)assert.equal(assertUniversalMatch(packs,state),true);
 }
 assert.ok(steps>30,'must play through opening and real actions');
 assert.equal(state.status,'finished','V2 cross-series game failed to finish at '+steps);
 assert.equal(assertUniversalMatch(packs,state),true);
});

function removeReal(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const items=s.players[p][zone],at=items.findIndex(c=>c.cardId===id);
  if(at>=0)return items.splice(at,1)[0];
 }
 throw Error('Missing official fixture '+p+'/'+id);
}
const pick=(packs,s,tester)=>{
 const a=legalUniversalActions(packs,s).find(tester);
 assert.ok(a,'Expected legal registered action in '+s.phase+' / '+s.pending?.kind);
 return a;
};
const enterMain=(packs,s)=>{
 for(let n=0;n<2;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
};
test('new SAO 004/047/094/2-015/027/067 and MST 061 use exact own-other optional BP template',()=>{
 const sao=registeredV2TitlePack('sword-art-online');
 for(const id of ['SAO-1-004','SAO-1-047','SAO-1-094','SAO-2-015','SAO-2-027','SAO-2-067']){
  const effect=sao.cards[id]?.effects?.onPlay?.[0];
  assert.ok(effect,id+' missing effect');
  assert.equal(effect.op,'buffOwnField');
  assert.equal(effect.optional,true);
  assert.equal(effect.excludeSelf,true);
  assert.deepEqual(effect.filter,{field:'type',value:'character'});
  assert.equal(effect.bp,id==='SAO-2-067'?500:1000);
 }
 const mst=registeredV2TitlePack('mushoku-tensei');
 assert.equal(mst.cards['MST-1-061'].effects.onPlay[0].op,'buffOwnField');
 assert.equal(mst.cards['MST-1-061'].effects.onPlay[0].bp,1000);
});
test('real SAO 004 own-other BP choice blocks enemy/self and allows true skip',()=>{
 const a=verifiedSaoV2RealDeck(),b=verifiedMstV2RealDeck();
 const packs=[a.pack,b.pack],counts={...a.counts};
 counts['SAO-1-001']--;counts['SAO-1-004']=1;
 assert.deepEqual(validateUniversalDeck(a.pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,b.counts],seed:404,first:0});
 const card=removeReal(s,0,'SAO-1-004'),friend=removeReal(s,0,'SAO-1-035');
 const enemy=removeReal(s,1,'MST-1-050');
 s.players[0].hand.push(card);
 s.players[0].front[0]=friend;
 s.players[1].front[0]=enemy;
 s=enterMain(packs,s);
 s=dispatchUniversalAction(packs,s,pick(packs,s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'&&a.slot===1));
 assert.equal(s.pending?.kind,'effect-buff-own');
 const opts=legalUniversalActions(packs,s);
 assert.ok(opts.some(a=>a.type==='chooseOwnBuff'&&a.uid===friend.uid));
 assert.ok(opts.some(a=>a.type==='chooseOwnBuff'&&a.uid===null));
 assert.ok(!opts.some(a=>a.uid===card.uid||a.uid===enemy.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:enemy.uid}),/not currently legal/);
 const initial=universalBp(packs,s,friend);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:null});
 const boosted=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:friend.uid});
 assert.equal(universalBp(packs,boosted,boosted.players[0].front[0]),initial+1000);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front[0]),initial);
 assert.equal(assertUniversalMatch(packs,boosted),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});
test('real MST 061 green-cost BP support does not target self and uses actual energy',()=>{
 const a=verifiedMstV2RealDeck(),b=verifiedSaoV2RealDeck(),packs=[a.pack,b.pack];
 const counts={...a.counts};counts['MST-1-050']--;counts['MST-1-061']=1;
 assert.deepEqual(validateUniversalDeck(a.pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,b.counts],seed:161,first:0});
 const buff=removeReal(s,0,'MST-1-061'),energy=removeReal(s,0,'MST-1-050'),
  ally=removeReal(s,0,'MST-1-070');
 s.players[0].hand.push(buff);
 s.players[0].energy[0]=energy;s.players[0].front[0]=ally;
 s=enterMain(packs,s);
 s=dispatchUniversalAction(packs,s,pick(packs,s,x=>x.type==='play'&&x.uid===buff.uid&&x.line==='front'&&x.slot===1));
 assert.equal(s.pending?.kind,'effect-buff-own');
 const opts=legalUniversalActions(packs,s);
 assert.ok(opts.some(x=>x.uid===ally.uid));
 assert.ok(!opts.some(x=>x.uid===buff.uid));
 const base=universalBp(packs,s,ally);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),base+1000);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
