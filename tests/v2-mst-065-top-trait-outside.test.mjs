import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPrivateChoices,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. UA54BT/MST-1-065 has no FAQ block.
// Cost alt 緑-, generated alt 緑. Also treated as 〈シルフィエット〉.
// Look at the top 2, put up to one exact ラノア魔法大学 token outside,
// then order the rest on top. A slash composite is not that token.

const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[mst,mst];
const printed=MST_V2_OFFICIAL_BY_ID['MST-1-065'];

function deck(){
 const required=['MST-1-065','MST-1-061','MST-1-052'];
 const rest=Object.values(mst.cards).filter(c=>c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function toMain(seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 return s;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('MST-1-065 keeps the Silphy alias and the top-two trait sentence',()=>{
 assert.equal(printed.energy,0);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 assert.equal(printed.effectJa.includes('シルフィエット'),true);
 assert.equal(printed.effectJa.includes('ラノア魔法大学'),true);
 const card=mst.cards['MST-1-065'];
 assert.equal(card.name,'フィッツ');
 assert.deepEqual(card.nameAliases,['シルフィエット']);
 assert.deepEqual(card.traits,['ラノア魔法大学']);
 assert.equal(cardHasName(card,'シルフィエット'),true);
 assert.equal(cardHasName(card,'シルフィエット',true),false);
 assert.equal(cardHasName(card,'フィッツ',true),true);
 assert.deepEqual(card.effects.onPlay,[{op:'inspectTopTraitOutside',count:2,
  trait:'ラノア魔法大学',rest:'top'}]);
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-065'));
 const base={id:'LAB',name:'Lab',color:'green',type:'character',energy:0,ap:1,
  bp:1000,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bottom',cards:[{...base,
  effects:{onPlay:[{op:'inspectTopTraitOutside',count:2,trait:'ラノア魔法大学',rest:'bottom'}]}}]}),
  /trait top-outside/);
});

test('one matching trait card goes outside and the other returns to the top',()=>{
 let s=toMain(1065);
 const match=take(s,0,'MST-1-061');
 const other=take(s,0,'MST-1-052');
 assert.equal(mst.cards['MST-1-061'].traits.includes('ラノア魔法大学'),true);
 assert.equal(mst.cards['MST-1-052'].traits.includes('ラノア魔法大学'),false);
 s.players[0].deck.unshift(other,match);
 const fitz=take(s,0,'MST-1-065');
 s.players[0].hand.push(fitz);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===fitz.uid&&
  a.line==='front'&&!a.replaceUid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(s.pending.choices,[match.uid]);
 const seen=universalPrivateChoices(packs,s,0);
 assert.equal(seen.options.some(o=>o.card?.cardId==='MST-1-061'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 aiLegal(s);
 const declined=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:null});
 assert.equal(declined.pending.kind,'effect-top-order');
 assert.deepEqual(declined.pending.uids,[other.uid,match.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:match.uid});
 assert.equal(s.players[0].outside.at(-1).uid,match.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,[other.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:other.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,other.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('no match still orders the window, and a slash token is not the trait',()=>{
 let s=toMain(1066);
 const a=take(s,0,'MST-1-052'),b=take(s,0,'MST-1-052');
 s.players[0].deck.unshift(b,a);
 const fitz=take(s,0,'MST-1-065');
 s.players[0].hand.push(fitz);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===fitz.uid&&a.line==='energy'&&!a.replaceUid));
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.rest,'top');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:b.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:a.uid});
 assert.equal(s.players[0].deck[0].uid,b.uid);
 assert.equal(s.players[0].deck[1].uid,a.uid);
 const vanilla={color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}};
 const cards=[
  {...vanilla,id:'FITZ',name:'フィッツ',nameAliases:['シルフィエット'],
   traits:['ラノア魔法大学'],implementation:'dsl',
   effects:{onPlay:[{op:'inspectTopTraitOutside',count:2,trait:'ラノア魔法大学',rest:'top'}]}},
  {...vanilla,id:'SLASH',name:'複合',traits:['ラノア魔法大学／別']},
  {...vanilla,id:'PLAIN',name:'無'},
  ...Array.from({length:10},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}))
 ];
 const lab=createUniversalPack({id:'lab-trait',cards});
 const labPacks=[lab,lab];
 const ids=cards.map(c=>c.id);
 const labCounts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 let labState=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:1067,first:0});
 for(let n=0;n<6&&labState.phase!=='main';n++)
  labState=dispatchUniversalAction(labPacks,labState,
   legalUniversalActions(labPacks,labState).find(x=>x.type==='next'));
 function pull(id){
  for(const zone of ['hand','deck','life','outside']){
   const i=labState.players[0][zone].findIndex(c=>c.cardId===id);
   if(i>=0)return labState.players[0][zone].splice(i,1)[0];
  }
  throw Error(id);
 }
 const slash=pull('SLASH'),plain=pull('PLAIN');
 labState.players[0].deck.unshift(plain,slash);
 const actor=pull('FITZ');
 labState.players[0].hand.push(actor);
 labState=dispatchUniversalAction(labPacks,labState,legalUniversalActions(labPacks,labState)
  .find(x=>x.type==='play'&&x.uid===actor.uid&&x.line==='front'&&!x.replaceUid));
 assert.equal(labState.pending.kind,'effect-top-order');
 assert.equal(labState.pending.uids.includes(slash.uid),true);
 assert.equal(labState.pending.uids.includes(plain.uid),true);
 assert.equal(assertUniversalMatch(labPacks,labState),true);
});
