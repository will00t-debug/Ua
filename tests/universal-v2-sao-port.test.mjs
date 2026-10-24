import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {SAO_V2_PILOT_IDS,saoV2Pack,verifiedSaoV2Cards} from '../dist/universal-v2/sao-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

const pack=saoV2Pack();
function deck50(){
 // Stable explicit official fixture; expanding V2 cards must never silently
 // remove a scenario's required physical card (e.g. SAO-1-055).
 const ids=[
  'SAO-1-001','SAO-1-016','SAO-1-019','SAO-1-023','SAO-1-035',
  'SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-054','SAO-1-055',
  'SAO-1-058','SAO-1-061','SAO-1-006'
 ];
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
 assert.equal(SAO_V2_PILOT_IDS.length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.ok(pack.cards['SAO-2-063']?.step&&pack.cards['SAO-2-063']?.effects.onPlay.length===1,'R53 full conditional STEP+onPlay now registered');
 assert.deepEqual(pack.cards['SAO-1-107'].effects.onPlay,[{op:'draw',count:2},{op:'drawDiscard',count:1}]);
 for(const id of SAO_V2_PILOT_IDS){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  assert.ok(source&&source.source.includes('unionarena-tcg.com'));
  const data=pack.cards[id];
  for(const field of ['color','energy','ap','bp','gen','type','trigger'])
   assert.equal(data[field],source[field],id+' mismatch '+field);
 }
 assert.equal(verifiedSaoV2Cards().length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.ok(pack.cards['SAO-1-071']?.raidName==='アスナ','R54 full composite card explicitly registered');
  assert.match(validateUniversalDeck(pack,{...deck,'SAO-1-083':1}).join(),/Unregistered/);
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

test('SAO pure-impact-null card is registered only with the precise passive ability',()=>{
 for(const id of ['SAO-1-026','SAO-1-027','SAO-1-074','SAO-2-026','SAO-2-045']){
  assert.equal(pack.cards[id].impactNull,true);
  assert.equal(pack.cards[id].implementation,'dsl');
  assert.equal(pack.cards[id].effects.onPlay,undefined);
 }
 assert.equal(pack.cards['SAO-1-001'].impactNull,false);
});
test('SAO 006 mandatory own low-energy bounce chooses physical card; cannot target enemy or high-energy own unit',()=>{
 let s=fresh(),p=s.players[0];
 const unit=take(s,0,'SAO-1-006'),low=take(s,0,'SAO-1-001'),producer=take(s,0,'SAO-1-016'),
  enemy=take(s,1,'SAO-1-001');
 p.hand.push(unit);p.front[0]=low;p.energy[0]=producer;
 s.players[1].front[0]=enemy;
 s=toMain(s);
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='play'&&a.uid===unit.uid&&a.line==='front'&&a.slot===1));
 assert.equal(s.pending?.kind,'effect-bounce-own');
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.uid===low.uid&&a.type==='chooseOwnBounce'));
 assert.ok(!options.some(a=>a.uid===enemy.uid));
 assert.ok(!options.some(a=>a.uid===producer.uid));
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseOwnBounce',uid:enemy.uid}),/not currently legal/);
 const resolved=dispatchUniversalAction(pack,s,{type:'chooseOwnBounce',uid:low.uid});
 assert.ok(resolved.players[0].hand.some(c=>c.uid===low.uid));
 assert.equal(resolved.players[0].front[0],null);
 assert.equal(assertUniversalMatch(pack,resolved),true);
});
test('SAO 042 optional BP<=3000 enemy REST respects target legality and may be skipped',()=>{
 let s=fresh(),p=s.players[0],unit=take(s,0,'SAO-1-042'),
  producer=take(s,0,'SAO-1-035'),blueTwo=take(s,0,'SAO-1-055'),low=take(s,1,'SAO-1-001');
 p.hand.push(unit);p.energy[0]=producer;p.energy[1]=blueTwo;
 low.ready=true;s.players[1].front[0]=low;
 s=toMain(s);
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='play'&&a.uid===unit.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'effect-rest-bp');
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.type==='chooseRestBp'&&a.uid===null));
 assert.ok(options.some(a=>a.type==='chooseRestBp'&&a.uid===low.uid));
 const skip=dispatchUniversalAction(pack,s,{type:'chooseRestBp',uid:null});
 assert.equal(skip.players[1].front[0].ready,true);
 const used=dispatchUniversalAction(pack,s,{type:'chooseRestBp',uid:low.uid});
 assert.equal(used.players[1].front[0].ready,false);
 assert.equal(assertUniversalMatch(pack,used),true);
 assert.equal(assertUniversalMatch(pack,skip),true);
});
test('SAO 2-040 private on-entry top peek chooses no shuffle or actual outside movement',()=>{
 const copy={...deck};
 copy['SAO-1-001']-=2;copy['SAO-2-040']=1;copy['SAO-2-035']=1;
 assert.deepEqual(validateUniversalDeck(pack,copy),[]);
 let s=newUniversalMatch(pack,{decks:[copy,copy],seed:7474,first:0});
 const unit=take(s,0,'SAO-2-040'),producer=take(s,0,'SAO-2-035');
 s.players[0].hand.push(unit);s.players[0].energy[0]=producer;
 s=toMain(s);
 const before=s.players[0].deck.length,first=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(pack,s,action(s,a=>a.type==='play'&&a.uid===unit.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'private-top-choice');
 const stay=dispatchUniversalAction(pack,s,{type:'chooseTopCard',mode:'top'});
 assert.equal(stay.players[0].deck.length,before);
 assert.equal(stay.players[0].deck[0].uid,first);
 const outside=dispatchUniversalAction(pack,s,{type:'chooseTopCard',mode:'outside'});
 assert.equal(outside.players[0].deck.length,before-1);
 assert.ok(outside.players[0].outside.some(c=>c.uid===first));
 assert.equal(assertUniversalMatch(pack,stay),true);
 assert.equal(assertUniversalMatch(pack,outside),true);
});
