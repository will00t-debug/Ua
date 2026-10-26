import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID,REZERO_VOL2_CARDS} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const names=['ナツキ・スバル','ベアトリス','禁書庫'];
const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'&&id!=='REZ-2-042'),'REZ-2-022','REZ-2-009'],'REZ-2-022');

test('REZ-2-022 filters Subaru, Beatrice, or the library name',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-022'].effectJa,
  '[登場時]自分の山札の上から2枚見て、〈ナツキ・スバル〉か〈ベアトリス〉か〈禁書庫〉を1枚まで場外に置く。残りを望む順で山札の上に置く。');
 assert.deepEqual(rez.cards['REZ-2-022'].effects.onPlay,
  [{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names}]);
 assert.equal(REZERO_VOL2_CARDS.some(c=>c.nameJa==='禁書庫'),false);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
});

test('Rem is not one of the three names, and Subaru is',()=>{
 let s=fresh(deck,1022);
 const subaruCard=take(s,0,'REZ-2-022');s.players[0].hand.push(subaruCard);
 s=toPhase(rezPacks,s,'main');
 const named=take(s,0,'REZ-2-014');
 const rem=take(s,0,'REZ-2-009');
 s.players[0].deck.unshift(named,rem);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===subaruCard.uid&&a.line==='front');
 let seen=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(seen.pending?.kind,'effect-top-trait-outside');
 assert.deepEqual(seen.pending.choices,[named.uid]);
 assert.equal(universalPublicView(rezPacks,seen,1).players[0].hand,null);
 assert.throws(()=>dispatchUniversalAction(rezPacks,seen,{type:'chooseTopTraitOutside',uid:rem.uid},{actor:0}),
  /not currently legal|exact-token/);
 seen=dispatchUniversalAction(rezPacks,seen,{type:'chooseTopTraitOutside',uid:named.uid},{actor:0});
 seen=dispatchUniversalAction(rezPacks,seen,{type:'chooseTopOrder',uid:rem.uid},{actor:0});
 assert.ok(seen.players[0].outside.some(c=>c.uid===named.uid));
 assert.equal(seen.players[0].deck[0].uid,rem.uid);
 assert.equal(seen.players[0].outside.some(c=>c.uid===rem.uid),false);
 assert.equal(assertUniversalMatch(rezPacks,seen),true);
});

test('the library name is a filter, not a catalogue card, and color is ignored',()=>{
 const src=rez.cards['REZ-2-022'];
 const played={id:src.id,name:src.name,color:src.color,type:src.type,energy:src.energy,ap:src.ap,
  bp:src.bp,gen:src.gen,trigger:src.trigger,implementation:'dsl',
  effects:{onPlay:[{op:'inspectTopNamesOutside',count:2,rest:'top',max:1,names:[...names]}]}};
 const filler=id=>({id,name:id,color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const pack=createUniversalPack({id:'rez-022-fixture',cards:[
  played,
  {id:'LIB',name:'禁書庫',color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'BEA',name:'ベアトリス',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'EMI',name:'エミリア',color:'purple',type:'character',energy:0,ap:1,bp:1500,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  ...Array.from({length:9},(_,i)=>filler('P'+i))
 ]});
 const ids=['REZ-2-022','LIB','BEA','EMI',...Array.from({length:9},(_,i)=>'P'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts['P8']=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1023,first:0});
 const actor=take(s,0,'REZ-2-022');s.players[0].hand.push(actor);
 const library=take(s,0,'LIB');
 const emilia=take(s,0,'EMI');
 s.players[0].deck.unshift(library,emilia);
 s=toPhase(packs,s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid);
 s=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.deepEqual(s.pending.choices,[library.uid]);
 assert.equal(s.pending.choices.includes(emilia.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:library.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:emilia.uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===library.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
