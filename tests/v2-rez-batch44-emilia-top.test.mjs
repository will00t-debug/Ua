import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-057','REZ-2-066'
],'REZ-2-056');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function order(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=dispatchUniversalAction(rezPacks,s,{type:'chooseTopOrder',uid},{actor:0});
 }
 return s;
}

test('REZ-2-057 adds Emilia, printed BP 2500, or the spaced Priestella name, and 066 is neither',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-057'].effectJa,/〈水門都市 プリステラ〉/);
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-066'].nameJa,'水門都市プリステラ');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-057'].effectJa.includes('水門都市プリステラ'),false);
 assert.equal(rez.cards['REZ-2-057'].effects.onPlay[0].filters[2].field,'printedBp');
 let s=fresh(deck,2057);
 s=toPhase(rezPacks,s,'main');
 for(let i=0;i<3;i++)sit(s,0,'REZ-2-055','energy',i);
 const emilia=take(s,0,'REZ-2-057');s.players[0].hand.push(emilia);
 const city=take(s,0,'REZ-2-066');
 const subaru=take(s,0,'REZ-2-014');
 const named=take(s,0,'REZ-2-055');
 s.players[0].deck.unshift(city,subaru,named);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='front'),{actor:0});
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[named.uid]);
 assert.equal(s.pending.choices.includes(city.uid),false);
 const declined=order(dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseTopFiltered',uid:null},{actor:0}));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===named.uid),false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTopFiltered',uid:named.uid},{actor:0});
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-2-055');
 s=order(s);
 assert.equal(s.pending.kind,'effect-discard');
 const discarded=s.players[0].hand.find(c=>c.uid!==named.uid);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscard',uid:discarded.uid},{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===named.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 let printed=fresh(deck,3057);
 printed=toPhase(rezPacks,printed,'main');
 for(let i=0;i<3;i++)sit(printed,0,'REZ-2-055','energy',i);
 const second=take(printed,0,'REZ-2-057');printed.players[0].hand.push(second);
 const field=take(printed,0,'REZ-2-066');
 const other=take(printed,0,'REZ-2-014');
 const otto=take(printed,0,'REZ-2-033');
 printed.players[0].deck.unshift(field,other,otto);
 printed=dispatchUniversalAction(rezPacks,printed,legalUniversalActions(rezPacks,printed).find(a=>a.type==='play'&&a.uid===second.uid),{actor:0});
 assert.deepEqual(printed.pending.choices,[otto.uid]);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,printed),true);
});

test('the spaced Priestella name is a different printed name from REZ-2-066',()=>{
 const filters=[
  {field:'name',value:'エミリア'},
  {field:'name',value:'水門都市 プリステラ'},
  {field:'printedBp',value:2500}
 ];
 const unit={color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,trigger:null};
 const pack=createUniversalPack({id:'rez-057-space',cards:[
  {id:'S',name:'エミリア',...unit,energy:0,implementation:'dsl',effects:{onPlay:[
   {op:'searchTopOneBottomDiscard',count:3,logic:'any',filters}]}},
  {id:'GATE',name:'水門都市 プリステラ',...unit,implementation:'vanilla',effects:{}},
  {id:'CITY',name:'水門都市プリステラ',color:'green',type:'field',energy:0,ap:1,bp:0,gen:0,
   trigger:null,implementation:'vanilla',effects:{}},
  ...Array.from({length:10},(_,i)=>({id:'G'+i,name:'G'+i,...unit,implementation:'vanilla',effects:{}}))
 ]});
 const ids=['S','GATE','CITY',...Array.from({length:10},(_,i)=>'G'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.G9=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:4057,first:0});
 const searcher=pull(s,'S');s.players[0].hand.push(searcher);
 const gate=pull(s,'GATE'),city=pull(s,'CITY'),plain=pull(s,'G0');
 s.players[0].deck.unshift(city,plain,gate);
 let guard=0;
 while(s.phase!=='main'){
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
  if(++guard>6)throw Error('no main');
 }
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===searcher.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[gate.uid]);
 assert.equal(assertUniversalMatch(packs,s),true);
});

function pull(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
