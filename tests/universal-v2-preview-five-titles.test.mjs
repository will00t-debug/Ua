import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createAllV2PreviewRealDecks,SLG_V2_COUNTS,BLEACH_GREEN_V2_COUNTS}
 from '../dist/universal-v2/preview-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,assertUniversalMatch,
 legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {listRegisteredV2Titles} from '../dist/universal-v2/title-packs/registry.mjs';
const source=p=>readFileSync(fileURLToPath(new URL(p,import.meta.url)),'utf8');
const all=createAllV2PreviewRealDecks(),ids=[
 'bleach-purple','bleach-green','gurren-lagann-red',
 'solo-leveling','sword-art-online','mushoku-tensei',
 'mushoku-tensei-roxy-field'
];
test('private UI exposes seven exact 50-card genuine decks for all FIVE independently registered titles',()=>{
 assert.deepEqual(Object.keys(all),ids);
 const officialTitles=new Set(listRegisteredV2Titles().map(x=>x.title));
 assert.equal(officialTitles.size,5);
 assert.equal(new Set(Object.values(all).map(d=>d.pack.id)).size,5);
 for(const [preset,{pack,counts}] of Object.entries(all)){
  assert.ok(officialTitles.has(pack.id),preset);
  assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),50,preset);
  assert.deepEqual(validateUniversalDeck(pack,counts),[],preset);
  assert.ok(Object.keys(counts).every(id=>pack.cards[id]&&
   !/TEST|FILLER|-AP\d/i.test(id)),preset);
  assert.equal(new Set(Object.keys(counts)).size,Object.keys(counts).length);
 }
 assert.equal(Object.keys(SLG_V2_COUNTS).length,14);
 assert.equal(SLG_V2_COUNTS['SLG-1-040']+SLG_V2_COUNTS['SLG-1-076'],4);
 assert.equal(Object.keys(BLEACH_GREEN_V2_COUNTS).length,13);
});
test('static private preview uses five-title V2 reducer instead of silently delegating to three old match engines',()=>{
 const page=source('../dist/universal-v2-preview.html'),
  script=source('../dist/universal-v2-preview.mjs'),
  index=source('../dist/index.html');
 assert.ok(page.includes('noindex,nofollow,noarchive'));
 assert.ok(!index.includes('universal-v2-preview'));
 for(const option of ids){
  assert.equal((page.match(new RegExp('value="'+option+'"','g'))||[]).length,2,
   option+' must be available on both human and AI sides');
 }
 assert.match(script,/createAllV2PreviewRealDecks\(\)/);
 assert.match(script,/newUniversalMatch\(app\.packs,/);
 assert.match(script,/dispatchUniversalAction\(app\.packs,app\.state,a,/);
 assert.ok(!/import.*(solo-match|match-runtime|gurren-match|universal-legacy)/.test(script));
});
test('every preview pairing creates a strict V2 cross-title 50+50 physical state',()=>{
 for(const my of ids)for(const foe of ids){
  const a=all[my],b=all[foe],packs=[a.pack,b.pack];
  const s=newUniversalMatch(packs,{decks:[a.counts,b.counts],seed:74,first:0});
  assert.equal(assertUniversalMatch(packs,s),true,my+' / '+foe);
  assert.deepEqual(s.packIds,[a.pack.id,b.pack.id]);
  assert.ok(legalUniversalActions(packs,s).some(x=>x.type==='next'));
 }
});
test('integrated seeded cross-title full-real AI matches reach a final outcome with conserved cards',()=>{
 const fixtures=[
  ['bleach-green','solo-leveling',31],
  ['sword-art-online','mushoku-tensei',52],
  ['gurren-lagann-red','bleach-purple',73]
 ];
 for(const [my,foe,seed] of fixtures){
  const a=all[my],b=all[foe],packs=[a.pack,b.pack];
  let s=newUniversalMatch(packs,{decks:[a.counts,b.counts],seed,first:seed%2}),steps=0;
  while(s.status==='playing'&&steps++<3500){
   const action=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
   assert.ok(action,'AI cannot stall: '+my+' vs '+foe+' step '+steps);
   assert.ok(legalUniversalActions(packs,s).some(x=>
    JSON.stringify(x)===JSON.stringify(action)),'AI illegal action '+my+' vs '+foe);
   s=dispatchUniversalAction(packs,s,action);
   if(steps%70===0)assert.equal(assertUniversalMatch(packs,s),true);
  }
  assert.equal(s.status,'finished',my+' vs '+foe+' did not finish in '+steps);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
