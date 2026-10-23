import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
const sao=registeredV2TitlePack('sword-art-online'),mst=registeredV2TitlePack('mushoku-tensei');
const packs=[sao,mst];
const S=['SAO-2-056','SAO-2-028','SAO-2-035','SAO-2-047','SAO-2-027',
 'SAO-2-026','SAO-2-046','SAO-2-048','SAO-2-050','SAO-2-051','SAO-2-052','SAO-2-055','SAO-2-043'];
const M=['MST-1-049','MST-1-060','MST-1-075','MST-1-062','MST-1-059',
 'MST-1-065','MST-1-056','MST-1-041','MST-1-023','MST-1-066',
 'MST-1-004','MST-1-043','MST-1-042'];
const decks=[S,M].map(ids=>Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4])));
for(let i=0;i<2;i++)assert.deepEqual(validateUniversalDeck(packs[i],decks[i]),[]);
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
const take=(s,player,id)=>{for(const z of ['hand','deck','life','outside']){
 const a=s.players[player][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
}throw Error('missing '+id);};
function prepare(id){
 const isSao=id==='SAO-2-056',player=isSao?0:1,energyCard=isSao?'SAO-2-028':'MST-1-060';
 let s=newUniversalMatch(packs,{decks,first:player,seed:isSao?39256:39449});
 const src=take(s,player,id);s.players[player].hand.push(src);
 for(let i=0;i<2;i++){
  const energy=take(s,player,energyCard);
  energy.ready=true;energy.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[player].energy[i]=energy;
 }
 const retireId=isSao?'SAO-2-028':'MST-1-075',target=take(s,player,retireId);
 const line=isSao?'front':'energy',slot=isSao?0:2;
 target.ready=true;target.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[player][line][slot]=target;
 const sequence=isSao?['SAO-2-056','SAO-2-035','SAO-2-056','SAO-2-028','SAO-2-047']:
  ['MST-1-060','MST-1-075','MST-1-049','MST-1-062','MST-1-059'];
 // TOP setup must draw distinct physical cards from the DECK only. The
 // source in hand is not available for the TOP5/TOP4 window.
 const top=sequence.map(id=>{
  // Build deterministic physical TOP cards from non-field zones only.
  // Setup may have distributed the remaining copies into LIFE or HAND;
  // never steal the actual source physical UID waiting in HAND.
  for(const zone of ['deck','life','outside','hand']){
   const list=s.players[player][zone],
    i=list.findIndex(c=>c.cardId===id&&c.uid!==src.uid);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('missing unreserved physical TOP fixture '+id);
 });s.players[player].deck.unshift(...top);
 for(let i=0;i<4&&s.phase!=='main';i++)s=act(s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===src.uid&&
  x.line===(isSao?'energy':'front'));
 assert.ok(play,id+' source paid play must be legal; '+JSON.stringify({phase:s.phase,active:s.active,expectedPlayer:player,hand:s.players[player].hand.map(x=>x.cardId),energy:s.players[player].energy.map(x=>x?.cardId),ap:s.players[player].apCards.map(x=>x.ready),legal:legalUniversalActions(packs,s).filter(x=>x.type==='play').slice(0,12)}));
 s=act(s,play);
 return {s,src,target,top,player,isSao};
}
test('R39 official SAO 2-056 and MST 1-049 pinned complete printing, GET and real decks',()=>{
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-056'));
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-049'));
 assert.equal(SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-056').number,'EX08BT/SAO-2-056');
 assert.deepEqual([sao.cards['SAO-2-056'].name,sao.cards['SAO-2-056'].type,
  sao.cards['SAO-2-056'].energy,sao.cards['SAO-2-056'].trigger],
 ['茅場 晶彦','field',2,'get']);
 assert.deepEqual([mst.cards['MST-1-049'].name,mst.cards['MST-1-049'].type,
  mst.cards['MST-1-049'].color,mst.cards['MST-1-049'].energy,
  mst.cards['MST-1-049'].bp,mst.cards['MST-1-049'].trigger],
 ['ルーデウス','character','green',4,4000,'get']);
 for(const [pack,id,type,count,max,filter] of [
  [sao,'SAO-2-056','character',5,2,{field:'trait',value:'プログレッシブ'}],
  [mst,'MST-1-049','field',4,1,{field:'traitlessCharacterOrField',value:true}]])
 {
  const e=pack.cards[id].effects.onPlay[0];
  assert.equal(e.op,'optionalRetireThenProgram');
  assert.equal(e.cardType,type);assert.equal(e.optional,true);
  const search=e.after.at(-1);
  assert.deepEqual([search.op,search.count,search.max,search.rest,search.filters],
   ['searchTopUpToTwoBottom',count,max,'bottom',[filter]]);
 }
});
for(const id of ['SAO-2-056','MST-1-049']){
 test(id+' optional skip never activates, inspects TOP or falsely retires',()=>{
  let {s,target,player}=prepare(id),before=s.players[player].deck.map(c=>c.uid);
  const options=legalUniversalActions(packs,s);
  assert.ok(options.some(x=>x.uid===null));assert.ok(options.some(x=>x.uid===target.uid));
  const kind=s.pending.kind;
  assert.equal(kind,id==='SAO-2-056'?'effect-retire-own-character':'effect-retire-own-field');
  const n=s.turnRetireEvents.length;
  s=act(s,options.find(x=>x.uid===null));
  assert.equal(s.pending,null);assert.equal(s.turnRetireEvents.length,n);
  assert.deepEqual(s.players[player].deck.map(c=>c.uid),before);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
 test(id+' requires true retire before later TOP; filters, order, UID and AI',()=>{
  let {s,target,src,top,player,isSao}=prepare(id);
  const opts=legalUniversalActions(packs,s);
  const a=opts.find(x=>x.uid===target.uid);
  assert.ok(a);
  const snap=structuredClone(s);
  assert.throws(()=>act(s,{...a,uid:'0-forged'}));assert.deepEqual(s,snap);
  for(const difficulty of ['normal','hard']){
   const choice=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(opts.some(o=>JSON.stringify(o)===JSON.stringify(choice)));
  }
  s=act(s,a);
  assert.ok(s.players[player].outside.some(c=>c.uid===target.uid));
  assert.ok(s.turnRetireEvents.some(x=>x.uid===target.uid));
  if(!isSao)assert.ok(s.players[player].front.some(c=>c?.uid===src.uid&&c.ready));
  assert.equal(s.pending.kind,'effect-top-filter-many-choice');
  assert.equal(universalPrivateChoices(packs,s,1-player),null);
  const legal=legalUniversalActions(packs,s);
  const shown=universalPublicView(packs,s,1-player);
  assert.equal(shown.players[player].hand,null);
  assert.ok(legal.some(x=>x.uid===null));
  const allowed=legal.find(x=>x.uid!==null);
  assert.ok(allowed);
  if(isSao){
   assert.ok(!legal.some(x=>x.uid===top[1].uid));
  }else{
   assert.ok(legal.some(x=>x.uid===top[1].uid),'traitless FIELD eligible');
   assert.ok(!legal.some(x=>x.uid===top[3].uid),'traited character forbidden');
  }
  s=act(s,allowed);
  // SAO allows up to TWO picks. Choosing exactly one requires a separate
  // optional stop before entering the bottom-order phase.
  if(s.pending?.kind==='effect-top-filter-many-choice')
   s=act(s,{type:'chooseTopFilteredMany',uid:null});
  assert.equal(s.pending.kind,'effect-top-order');
  const remain=s.pending.uids.filter(x=>x!==allowed.uid).reverse();
  for(const uid of remain)s=act(s,{type:'chooseTopOrder',uid});
  assert.equal(s.pending,null);
  assert.ok(s.players[player].hand.some(c=>c.uid===allowed.uid));
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 });
}
