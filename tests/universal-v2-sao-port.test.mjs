import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {SAO_V2_PILOT_IDS,saoV2Pack,verifiedSaoV2Cards} from '../dist/universal-v2/sao-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

const pack=saoV2Pack();
function deck50(){
 const ids=SAO_V2_PILOT_IDS.slice(0,13);
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts[ids.at(-1)]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const deck=deck50();
const fresh=()=>newUniversalMatch(pack,{decks:[deck,deck],seed:251015,first:0});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const ix=s.players[p][zone].findIndex(c=>c.cardId===id);
  if(ix>=0)return s.players[p][zone].splice(ix,1)[0];
 }
 throw Error('No registered physical card '+id);
}
function action(s,fn){const result=legalUniversalActions(pack,s).find(fn);
 assert.ok(result,'Expected legal action at '+s.phase);return result;}
function toMain(s){
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='next'));
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
test('SAO official dedup identity and product scopes stay unchanged, AP/parallel excluded',()=>{
 assert.equal(SAO_OFFICIAL_CARDS.length,202);
 assert.equal(new Set(SAO_OFFICIAL_CARDS.map(c=>c.id)).size,183);
 for(const [set,count] of Object.entries({UA15BT:100,EX08BT:74,UA15ST:18,UAPR:10}))
  assert.equal(SAO_OFFICIAL_CARDS.filter(c=>c.set===set).length,count);
 assert.equal(SAO_V2_PILOT_IDS.length,22);
 assert.equal(Object.keys(pack.cards).length,22);
 assert.ok(!pack.cards['SAO-2-063'],'conditional STEP + onPlay is NOT a basic vanilla');
 assert.ok(!pack.cards['SAO-1-107'],'draw 3 then discard 1 is NOT drawDiscardOne');
 for(const id of SAO_V2_PILOT_IDS){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  assert.ok(source&&source.source.includes('unionarena-tcg.com'));
  const data=pack.cards[id];
  for(const field of ['color','energy','ap','bp','gen','type','trigger'])
   assert.equal(data[field],source[field],id+' mismatch '+field);
 }
 assert.equal(verifiedSaoV2Cards().length,22);
 assert.match(validateUniversalDeck(pack,{...deck,'SAO-2-063':1}).join(),'Unregistered');
});
test('SAO 50 physical-card deck, actual AP spending and entry draw/discard are V2 transitions',()=>{
 let s=fresh(),p=s.players[0],card=take(s,0,'SAO-1-055');
 p.hand.push(card);s=toMain(s);
 const initialDeck=s.players[0].deck.length,original=structuredClone(s);
 const chosen=action(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction(pack,s,chosen);
 assert.equal(s.players[0].front[0].uid,card.uid);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,0);
 assert.equal(s.players[0].deck.length,initialDeck-1);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseDiscard',uid:'fake'}),/not currently legal/);
 const discard=action(s,a=>a.type==='chooseDiscard');
 const after=dispatchUniversalAction(pack,s,discard);
 assert.equal(after.pending,null);
 assert.ok(after.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(after.players[0].front[0].ready,false);
 assert.equal(original.players[0].front[0],null);
 assert.equal(assertUniversalMatch(pack,after),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('SAO printed STEP is a legal once-per-movement action, never a free extra move',()=>{
 let s=fresh(),unit=take(s,0,'SAO-1-001');
 s.players[0].front[0]=unit;s=dispatchUniversalAction(pack,s,{type:'next'});
 const step=action(s,a=>a.type==='step'&&a.uid===unit.uid&&a.slot===0);
 const after=dispatchUniversalAction(pack,s,step);
 assert.equal(after.players[0].energy[0].uid,unit.uid);
 assert.equal(after.players[0].front[0],null);
 assert.ok(!legalUniversalActions(pack,after).some(a=>a.uid===unit.uid&&a.type==='move'));
 assert.equal(assertUniversalMatch(pack,after),true);
});
