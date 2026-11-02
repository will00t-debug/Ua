import test from 'node:test';
import assert from 'node:assert/strict';
import {TITLES} from '../dist/title-registry.mjs';
import {makeVisualDeckModel,renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {verifiedSaoV2Cards} from '../dist/universal-v2/sao-pack.mjs';

// Official 発生エナジー alt: characters before + are resting pips.
// The + is added only after the printed condition. Sprite filenames are not pip counts.
const PRINTED=[
 ["bleach","BLC-1-010",1,"+"],
 ["bleach","037",1,"+"],
 ["bleach","042",1,"+"],
 ["bleach","BLC-1-069",1,"+"],
 ["bleach","BLC-1-016",1,"+"],
 ["bleach","BLC-1-075",1,"+"],
 ["bleach","BLC-1-079",1,"+"],
 ["bleach","BLC-2-022",1,"+"],
 ["bleach","BLC-2-029",1,"+"],
 ["bleach","BLC-2-062",1,"+"],
 ["bleach","BLC-3-004",1,"+"],
 ["bleach","BLC-3-011",1,"+"],
 ["bleach","BLC-4-006",2,""],
 ["bleach","BLC-4-011",2,""],
 ["bleach","BLC-4-016",2,"+"],
 ["bleach","BLC-4-014",1,"+"],
 ["bleach","BLC-4-017",2,""],
 ["bleach","BLC-4-024",2,""],
 ["bleach","BLC-4-027",2,""],
 ["bleach","BLC-4-037",2,""],
 ["bleach","BLC-4-042",2,""],
 ["bleach","BLC-4-051",2,""],
 ["bleach","BLC-4-055",2,""],
 ["bleach","BLC-4-063",2,""],
 ["bleach","BLC-4-060",2,""],
 ["bleach","BLC-4-065",2,""],
 ["bleach","BLC-4-071",2,""],
 ["bleach","BLC-4-074",1,"+"],
 ["bleach","BLC-4-077",2,""],
 ["bleach","BLC-4-032",2,""],
 ["gurren-lagann","TTG-1-002",1,"+"],
 ["bleach","BLC-4-075",2,"+"],
 ["gurren-lagann","TTG-1-063",1,"+"],
 ["gurren-lagann","TTG-1-022",1,"+"],
 ["bleach","BLC-4-054",2,""],
 ["gurren-lagann","TTG-1-034",2,"+"],
 ["gurren-lagann","TTG-1-033",1,"+"],
 ["gurren-lagann","TTG-1-024",1,"+"],
 ["gurren-lagann","TTG-1-050",1,"+"],
 ["gurren-lagann","TTG-1-066",1,"+"],
 ["gurren-lagann","TTG-1-060",1,"+"],
 ["gurren-lagann","TTG-1-019",1,"+"],
 ["gurren-lagann","TTG-1-017",2,"+"],
 ["gurren-lagann","TTG-1-018",1,"+"],
 ["gurren-lagann","TTG-1-011",1,"+"],
 ["gurren-lagann","TTG-1-015",1,"+"],
 ["sword-art-online","SAO-1-003",1,"+"],
 ["sword-art-online","SAO-1-006",2,""],
 ["sword-art-online","SAO-1-008",1,"+"],
 ["sword-art-online","SAO-1-016",2,""],
 ["sword-art-online","SAO-1-045",1,"+"],
 ["sword-art-online","SAO-1-048",2,""],
 ["sword-art-online","SAO-1-052",1,"+"],
 ["sword-art-online","SAO-1-062",2,""],
 ["sword-art-online","SAO-1-073",1,"+"],
 ["sword-art-online","SAO-1-075",2,""],
 ["sword-art-online","SAO-1-046",2,""],
 ["sword-art-online","SAO-1-086",2,""],
 ["sword-art-online","SAO-1-095",2,""],
 ["sword-art-online","SAO-1-096",1,"+"],
 ["sword-art-online","SAO-1-102",2,""],
 ["sword-art-online","SAO-1-093",1,"+"],
 ["sword-art-online","SAO-1-103",2,""],
 ["sword-art-online","SAO-1-107",2,""],
 ["sword-art-online","SAO-2-006",1,"+"],
 ["sword-art-online","SAO-2-014",2,""],
 ["sword-art-online","SAO-2-038",2,""],
 ["sword-art-online","SAO-2-046",2,""],
 ["sword-art-online","SAO-2-044",2,""],
 ["sword-art-online","SAO-2-048",1,"+"],
 ["sword-art-online","SAO-2-050",1,"+"],
 ["sword-art-online","SAO-2-053",2,""],
 ["sword-art-online","SAO-2-063",2,""],
 ["solo-leveling","SLG-1-003",1,"+"],
 ["solo-leveling","SLG-1-006",1,"+"],
 ["solo-leveling","SLG-1-013",1,"+"],
 ["solo-leveling","SLG-1-042",1,"+"],
 ["solo-leveling","SLG-1-041",1,"+"],
 ["mushoku-tensei","MST-1-010",2,""],
 ["mushoku-tensei","MST-1-011",1,""],
 ["mushoku-tensei","MST-1-013",1,""],
 ["mushoku-tensei","MST-1-015",1,""],
 ["mushoku-tensei","MST-1-016",1,"+"],
 ["mushoku-tensei","MST-1-019",2,""],
 ["mushoku-tensei","MST-1-023",1,""],
 ["mushoku-tensei","MST-1-029",1,"+"],
 ["mushoku-tensei","MST-1-044",2,""],
 ["mushoku-tensei","MST-1-045",1,"+"],
 ["mushoku-tensei","MST-1-046",2,"+"],
 ["mushoku-tensei","MST-1-056",1,"+"],
 ["mushoku-tensei","MST-1-061",1,""],
 ["mushoku-tensei","MST-1-064",2,""],
 ["mushoku-tensei","MST-1-072",1,"+"],
 ["rezero","REZ-1-006",1,"+"],
 ["rezero","REZ-1-016",1,"+"],
 ["rezero","REZ-1-110",1,"+"],
 ["steins-gate","STG-1-031",1,""],
 ["steins-gate","STG-1-071",1,""],
 ["steins-gate","STG-1-072",2,""],
 ["steins-gate","STG-1-073",1,""],
 ["aot","AOT-1-002",2,"+"],
 ["aot","AOT-1-005",1,"+"],
 ["aot","AOT-1-024",1,"+"],
 ["aot","AOT-1-026",1,"+"],
 ["aot","AOT-1-052",1,"+"],
 ["aot","AOT-1-054",1,"+"],
 ["aot","AOT-1-062",2,"+"],
 ["aot","AOT-1-068",1,"+"],
 ["aot","AOT-1-087",1,"+"],
 ["aot","AOT-2-001",1,"+"],
 ["aot","AOT-2-010",1,"+"],
 ["aot","AOT-2-021",1,"+"],
 ["aot","AOT-2-040",1,"+"],
 ["kmr","KMR-2-006",1,"+"],
 ["kmr","KMR-2-004",2,""],
 ["kmr","KMR-2-008",2,""],
 ["kmr","KMR-2-014",2,""],
 ["kmr","KMR-2-017",1,"+"],
 ["kmr","KMR-2-018",2,""],
 ["kmr","KMR-2-025",2,""],
 ["kmr","KMR-2-031",1,"+"],
 ["kmr","KMR-2-038",2,""],
 ["kmr","KMR-2-040",2,""],
 ["kmr","KMR-2-047",1,"+"],
 ["kmr","KMR-2-059",2,""],
 ["kmr","KMR-2-066",1,"+"],
 ["kmr","KMR-2-067",2,""],
 ["kmr","KMR-2-071",2,""],
 ["kmr","KMR-2-075",2,""],
 ["kmr","KMR-2-082",2,""],
 ["kmr","KMR-2-085",2,""],
 ["kmr","KMR-2-091",2,""],
 ["kmr","KMR-2-092",1,"+"],
 ["kmr","KMR-2-045",2,""],
 ["kmr","KMR-2-096",2,""],
 ["rezero","REZ-1-037",1,"+"],
 ["rezero","REZ-1-043",1,"+"],
 ["rezero","REZ-1-082",1,"+"],
 ["rezero","REZ-1-086",1,"+"],
];

function cardOf(title,id){
 const cards=TITLES.find(t=>t.id===title).cards;
 return cards.find(c=>c.id===id||c.identity===id||c.identity==='BLC-1-'+id);
}

test('card table stores resting generate and keeps conditional plus off the number',()=>{
 for(const [title,id,gen,mark] of PRINTED){
  const card=cardOf(title,id);
  assert.ok(card,title+' '+id);
  assert.equal(card.gen,gen,id+' resting generate');
  assert.equal(card.genMark==='+'?'+':'',mark,id+' conditional mark');
 }
 const dash=cardOf('rezero','REZ-1-034');
 const two=cardOf('rezero','REZ-1-041');
 assert.equal(dash.gen,1);
 assert.equal(dash.genMark==='+'?'+':'','');
 assert.equal(two.gen,2);
 assert.equal(cardOf('mushoku-tensei','MST-1-073').gen,3);
 assert.equal(cardOf('mushoku-tensei','MST-1-078').gen,null);
});

test('deck builder shows the plus and filters on the resting number',()=>{
 const cards=[{id:'A',name:'條件產能',number:'X-1',type:'character',color:'yellow',energy:1,gen:1,genMark:'+',ap:1,bp:1000,effect:'條件達成後額外產生。'}];
 const html=renderVisualDeckBuilder({titles:[{id:'bleach',label:'BLEACH',cards}],titleId:'bleach',ready:true,counts:{A:0},tab:'pick'});
 assert.match(html,/產能 1\+/);
 assert.match(html,/常駐產能/);
 assert.equal(makeVisualDeckModel({cards,generate:'1'}).results.length,1);
 assert.equal(makeVisualDeckModel({cards,generate:'3+'}).results.length,0);
});

test('battle generate uses the resting pip and leaves implemented plus on the effect',()=>{
 const bleach=registeredV2TitlePack('bleach');
 assert.equal(bleach.cards['BLC-4-014'].gen,1);
 assert.equal(bleach.cards['BLC-4-014'].activeExtraEnergy,1);
 assert.equal(bleach.cards['BLC-4-074'].gen,1);
 assert.equal(bleach.cards['BLC-4-042'].gen,2);
 assert.equal(bleach.cards['BLC-4-027'].gen,2);
 assert.equal(bleach.cards['BLC-4-016'].gen,2);
 const sao=Object.fromEntries(verifiedSaoV2Cards().map(c=>[c.id,c]));
 assert.equal(sao['SAO-2-063'].gen,2);
 assert.equal(sao['SAO-1-006'].gen,2);
 assert.equal(sao['SAO-1-096'].gen,1);
 assert.equal(sao['SAO-1-096'].mainAbility.extraEnergy,2);
});
