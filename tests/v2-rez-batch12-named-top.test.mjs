import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'&&id!=='REZ-2-042'),'REZ-2-017','REZ-2-009'],'REZ-2-017');
const names=['ナツキ・スバル','レム'];

test('REZ-2-017 filters the top two by Subaru or Rem',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-017'].effectJa,
  '[登場時]自分の山札の上から2枚見て、〈ナツキ・スバル〉か〈レム〉を1枚まで場外に置く。残りを望む順で山札の上に置く。');
 assert.deepEqual(rez.cards['REZ-2-017'].effects.onPlay,
  [{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names}]);
 assert.equal(rez.cards['REZ-2-017'].effects.onPlay[0].op==='inspectTopArrange',false);
 assert.deepEqual(expandAbilityTemplates({onPlay:[{template:'inspectTopNamesOutside',count:2,names}]}),
  {onPlay:[{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names}]});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'X',name:'レム',color:'blue',type:'character',energy:0,ap:1,bp:1500,gen:1,
  implementation:'dsl'};
 const make=effects=>createUniversalPack({id:'top-names',cards:[{...body,effects}]});
 assert.throws(()=>make({onAttack:[{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names}]}),/onPlay/);
 assert.throws(()=>make({onPlay:[{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names:['レム']}]}),/named top/);
 assert.throws(()=>make({onPlay:[{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names,color:'blue'}]}),/named top/);
 assert.throws(()=>expandAbilityTemplates({onPlay:[{template:'inspectTopNamesOutside',count:5,names}]}),/invalid/);
});

test('a real Subaru in the top two can leave, and an unmatched name cannot',()=>{
 let s=fresh(deck,1017);
 const rem=take(s,0,'REZ-2-017');s.players[0].hand.push(rem);
 s=toPhase(rezPacks,s,'main');
 const subaru=take(s,0,'REZ-2-014');
 const mimi=take(s,0,'REZ-2-043');
 s.players[0].deck.unshift(subaru,mimi);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===rem.uid&&a.line==='front');
 let seen=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(seen.pending?.kind,'effect-top-trait-outside');
 assert.deepEqual(seen.pending.choices,[subaru.uid]);
 assert.equal(seen.pending.choices.includes(mimi.uid),false);
 assert.equal(universalPublicView(rezPacks,seen,1).pending.uids,undefined);
 assert.throws(()=>dispatchUniversalAction(rezPacks,seen,{type:'chooseTopTraitOutside',uid:mimi.uid},{actor:0}),
  /not currently legal|exact-token/);
 let ordered=dispatchUniversalAction(rezPacks,structuredClone(seen),{type:'chooseTopTraitOutside',uid:null},{actor:0});
 assert.equal(ordered.pending?.kind,'effect-top-order');
 ordered=dispatchUniversalAction(rezPacks,ordered,{type:'chooseTopOrder',uid:mimi.uid},{actor:0});
 ordered=dispatchUniversalAction(rezPacks,ordered,{type:'chooseTopOrder',uid:subaru.uid},{actor:0});
 assert.deepEqual(ordered.players[0].deck.slice(0,2).map(c=>c.uid),[mimi.uid,subaru.uid]);
 seen=dispatchUniversalAction(rezPacks,seen,{type:'chooseTopTraitOutside',uid:subaru.uid},{actor:0});
 assert.equal(seen.pending?.kind,'effect-top-order');
 seen=dispatchUniversalAction(rezPacks,seen,{type:'chooseTopOrder',uid:mimi.uid},{actor:0});
 assert.equal(seen.pending,null);
 assert.ok(seen.players[0].outside.some(c=>c.uid===subaru.uid));
 assert.equal(seen.players[0].deck[0].uid,mimi.uid);
 assert.equal(assertUniversalMatch(rezPacks,seen),true);
 assert.equal(assertUniversalMatch(rezPacks,ordered),true);
});

test('an alias and a non-character with the printed name are legal top choices',()=>{
 const src=rez.cards['REZ-2-017'];
 const played={id:src.id,name:src.name,color:src.color,type:src.type,energy:src.energy,ap:src.ap,
  bp:src.bp,gen:src.gen,trigger:src.trigger,implementation:'dsl',
  effects:{onPlay:[{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names:[...names]}]}};
 const filler=id=>({id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const pack=createUniversalPack({id:'rez-017-fixture',cards:[
  played,
  {id:'ALIAS',name:'別人',nameAliases:['レム'],color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'dsl',effects:{}},
  {id:'EVT',name:'ナツキ・スバル',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'BEA',name:'ベアトリス',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  ...Array.from({length:9},(_,i)=>filler('B'+i))
 ]});
 const ids=['REZ-2-017','ALIAS','EVT','BEA',...Array.from({length:9},(_,i)=>'B'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts['B8']=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1018,first:0});
 const actor=take(s,0,'REZ-2-017');s.players[0].hand.push(actor);
 const alias=take(s,0,'ALIAS');
 const bea=take(s,0,'BEA');
 s.players[0].deck.unshift(alias,bea);
 s=toPhase(packs,s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid);
 s=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.deepEqual(s.pending.choices,[alias.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:alias.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:bea.uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===alias.uid));
 let again=newUniversalMatch(packs,{decks:[counts,counts],seed:1019,first:0});
 const second=take(again,0,'REZ-2-017');again.players[0].hand.push(second);
 const event=take(again,0,'EVT');
 const other=take(again,0,'B0');
 again.players[0].deck.unshift(event,other);
 again=toPhase(packs,again,'main');
 const next=legalUniversalActions(packs,again).find(a=>a.type==='play'&&a.uid===second.uid);
 again=dispatchUniversalAction(packs,again,next,{actor:0});
 assert.deepEqual(again.pending.choices,[event.uid]);
 again=dispatchUniversalAction(packs,again,{type:'chooseTopTraitOutside',uid:event.uid},{actor:0});
 again=dispatchUniversalAction(packs,again,{type:'chooseTopOrder',uid:other.uid},{actor:0});
 assert.ok(again.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,again),true);
});
