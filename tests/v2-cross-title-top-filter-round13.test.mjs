import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

// Official pages checked 2026-10-22. Generated energy is the icon alt, not the filename.
// SAO-1-009 黄3 / 発生 黄黄 / 登場時 top 3 ［特徴：女神］ / DRAW. No card FAQ on the page.
// SAO-1-040 青1 / 発生 青 / top 3 アインクラッド / no trigger.
// SAO-2-023 青1 / 発生 青 / top 3 ALO / no trigger.
// SAO-1-077 緑1 / 発生 緑 / top 3 緑 AND ALO / DRAW.
// MST-1-043 ギース 緑0 / 発生 緑 / top 5 緑のフィールド / no trigger.
// All five use the existing top-N filter: up to one match, ordered bottom, discard only after a take.
const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const saoIds=['SAO-1-009','SAO-1-040','SAO-1-077','SAO-2-023','SAO-1-019','SAO-1-057',
 'SAO-1-073','SAO-2-016','SAO-1-051','SAO-1-001','SAO-1-055','SAO-1-014','SAO-1-020'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));
saoDeck['SAO-1-020']=2;
const mstIds=['MST-1-043','MST-1-075','MST-1-052','MST-1-001','MST-1-016','MST-1-050',
 'MST-1-010','MST-1-012','MST-1-013','MST-1-020','MST-1-055','MST-1-002','MST-1-070'];
const mstDeck=Object.fromEntries(mstIds.map(id=>[id,4]));
mstDeck['MST-1-070']=2;
assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],index=list.findIndex(c=>c.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing physical '+id);
}
function toMain(packs,s){
 for(let n=0;n<4&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function order(packs,s,uids){
 for(const uid of uids){
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseTopOrder'&&a.uid===uid));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function open(title,id,topIds,energyIds){
 const packs=title==='sao'?[sao,mst]:[mst,sao];
 const decks=title==='sao'?[saoDeck,mstDeck]:[mstDeck,saoDeck];
 let s=newUniversalMatch(packs,{decks,first:0,seed:13013});
 const source=take(s,0,id);
 s.players[0].hand.push(source);
 energyIds.forEach((energyId,i)=>{
  const generator=take(s,0,energyId);
  generator.ready=true;
  s.players[0].energy[i]=generator;
 });
 const window=topIds.map(cardId=>take(s,0,cardId));
 s.players[0].deck.unshift(...window);
 s=toMain(packs,s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,id+' pays its printed energy and AP');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {packs,s,source,window,play};
}

test('official top-filter cards keep the printed sentence and no extra effect',()=>{
 assert.equal(sao.cards['SAO-1-009'].gen,2);
 assert.deepEqual(sao.cards['SAO-1-009'].effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'女神'}}]);
 assert.deepEqual(sao.cards['SAO-1-040'].effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'アインクラッド'}}]);
 assert.deepEqual(sao.cards['SAO-2-023'].effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'ALO'}}]);
 assert.deepEqual(sao.cards['SAO-1-077'].effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,
  filters:[{field:'color',value:'green'},{field:'trait',value:'ALO'}],logic:'all'}]);
 assert.deepEqual(mst.cards['MST-1-043'].effects.onPlay,[{op:'searchTopOneBottomDiscard',count:5,
  filters:[{field:'color',value:'green'},{field:'type',value:'field'}],logic:'all'}]);
 for(const id of ['SAO-1-009','SAO-1-040','SAO-1-077','SAO-2-023']){
  assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(id));
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  assert.equal(sao.cards[id].name,source.nameJa);
  assert.equal(sao.cards[id].trigger,source.trigger);
 }
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-043'));
 assert.equal(mst.cards['MST-1-043'].name,MST_V2_OFFICIAL_BY_ID['MST-1-043'].nameJa);
});

test('SAO-1-009 takes only a goddess from the top three, then discards after the bottom order',()=>{
 let {packs,s,play,window,source}=open('sao','SAO-1-009',['SAO-1-057','SAO-1-019','SAO-1-073'],['SAO-1-019','SAO-1-019','SAO-1-019']);
 const deckBefore=s.players[0].deck.map(c=>c.uid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),[null,window[1].uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const forged=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[0].uid}),/not currently legal/);
 assert.deepEqual(s,forged);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid});
 s=order(packs,s,[window[2].uid,window[0].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...deckBefore.slice(3),window[2].uid,window[0].uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:window[1].uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===window[1].uid));
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('declining SAO-1-040 orders every inspected card to the bottom and does not discard',()=>{
 let {packs,s,play,window}=open('sao','SAO-1-040',['SAO-1-019','SAO-1-057','SAO-2-016'],['SAO-1-051']);
 const hand=s.players[0].hand.length,outside=s.players[0].outside.length;
 const deckBefore=s.players[0].deck.map(c=>c.uid);
 s=dispatchUniversalAction(packs,s,play);
 assert.deepEqual(s.pending.choices,[window[2].uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 assert.equal(s.pending.discardAfter,undefined);
 s=order(packs,s,[window[1].uid,window[0].uid,window[2].uid]);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...deckBefore.slice(3),window[1].uid,window[0].uid,window[2].uid]);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.players[0].outside.length,outside);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-077 requires both green and ALO, and SAO-2-023 accepts any ALO',()=>{
 const green=open('sao','SAO-1-077',['SAO-1-057','SAO-1-073','SAO-1-019'],['SAO-1-073']);
 const filtered=dispatchUniversalAction(green.packs,green.s,green.play);
 assert.deepEqual(legalUniversalActions(green.packs,filtered).filter(a=>a.uid).map(a=>a.uid),[green.window[1].uid]);
 let alo=open('sao','SAO-2-023',['SAO-1-019','SAO-1-057','SAO-2-016'],['SAO-2-016']);
 alo.s=dispatchUniversalAction(alo.packs,alo.s,alo.play);
 assert.deepEqual(alo.s.pending.choices,[alo.window[1].uid]);
 assert.equal(assertUniversalMatch(alo.packs,alo.s),true);
});

test('MST-1-043 against SAO takes only a green field from the top five',()=>{
 let {packs,s,play,window,source}=open('mst','MST-1-043',
  ['MST-1-001','MST-1-052','MST-1-016','MST-1-075','MST-1-050'],[]);
 const deckBefore=s.players[0].deck.map(c=>c.uid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[window[3].uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[3].uid});
 const rest=[0,1,2,4].map(i=>window[i].uid);
 s=order(packs,s,rest);
 assert.equal(s.pending.kind,'effect-discard');
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...deckBefore.slice(5),...rest]);
 const other=s.players[0].hand.find(c=>c.uid!==window[3].uid&&c.uid!==source.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:other.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===window[3].uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===other.uid));
 assert.equal(s.players[0].front[0].cardId,'MST-1-043');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-009 is illegal after its yellow energy leaves the energy line',()=>{
 let {packs,s,source}=open('sao','SAO-1-009',['SAO-1-057','SAO-1-019','SAO-1-073'],['SAO-1-019','SAO-1-019','SAO-1-019']);
 const removed=s.players[0].energy[2];
 s.players[0].energy[2]=null;
 s.players[0].outside.push(removed);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===source.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
