import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack,KMR_STARTER_IDS} from '../dist/universal-v2/kmr-pack.mjs';
import {kmrEngineKind} from '../dist/universal-v2/kmr-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {kmrPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const STARTER=new Set(KMR_STARTER_IDS);

test('Kamen Rider set 1 registers 113 identities without parallels or the five-title census',()=>{
 assert.equal(KMR_CARDS.length,113);
 assert.equal(Object.keys(pack.cards).length,113);
 const ids=KMR_CARDS.map(c=>c.id);
 assert.deepEqual(ids,Array.from({length:113},(_,i)=>'KMR-1-'+String(i+1).padStart(3,'0')));
 assert.equal(ids.some(id=>id.includes('_p')||id.endsWith('AP')),false);
 for(const card of KMR_CARDS){
  assert.equal(kmrEngineKind(card.effectJa),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa,card.id);
 }
 assert.equal(V2_TITLE_IDS.includes('kmr'),false);
 const reprint=KMR_CARDS.find(c=>c.id==='KMR-1-016');
 assert.deepEqual(reprint.sets,['UA29BT','UA29ST']);
 assert.deepEqual(reprint.printings.map(p=>p.set),['UA29BT','UA29ST']);
});

test('yellow starter practice deck uses only the 18 starter identities',()=>{
 const built=kmrPracticeDeck();
 const ids=Object.keys(built.counts);
 assert.equal(Object.values(built.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(ids.every(id=>STARTER.has(id)),true);
 for(const promo of ['KMR-1-110','KMR-1-111','KMR-1-112','KMR-1-113'])
  assert.equal(built.counts[promo],undefined);
 assert.deepEqual(validateUniversalDeck(built.pack,built.counts),[]);
 const status=editorV2Status('kmr',built.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,113);
});

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:29,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}

function ready(s){
 s.pending=null;
 s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
test('ARK-ONE hand energy drops by 5 with two outside AP2 trait cards',()=>{
 const s=fresh(countsFor(['KMR-1-001','KMR-1-021','KMR-1-024']));
 s.players[0].outside.push(take(s,0,'KMR-1-021'),take(s,0,'KMR-1-024'));
 const printed=pack.cards['KMR-1-001'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),printed.energy-5);
 s.players[0].outside.pop();
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),printed.energy);
});

test('Faiz Accel can raid onto a Faiz name and cannot be played from hand',()=>{
 const s=fresh(countsFor(['KMR-1-085','KMR-1-082','KMR-1-069','KMR-1-072','KMR-1-089','KMR-1-090']));
 put(s,0,'KMR-1-082','front',0,true);
 for(const [i,id] of ['KMR-1-069','KMR-1-072','KMR-1-089','KMR-1-090'].entries())
  put(s,0,id,'energy',i,true);
 const rider=take(s,0,'KMR-1-085');
 s.players[0].hand.push(rider);
 ready(s);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(a=>a.type==='play'&&a.uid===rider.uid),false);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===rider.uid),true);
});

test('Den-O host accepts a raider whose name contains 電王',()=>{
 const s=fresh(countsFor(['KMR-1-078','KMR-1-079','KMR-1-069','KMR-1-072','KMR-1-082','KMR-1-089']));
 const host=put(s,0,'KMR-1-078','front',0,true);
 for(const [i,id] of ['KMR-1-069','KMR-1-072','KMR-1-082','KMR-1-089'].entries())
  put(s,0,id,'energy',i,true);
 const rider=take(s,0,'KMR-1-079');
 s.players[0].hand.push(rider);
 ready(s);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===host.uid),true);
});

test('shared sentences stay on the existing profiles',()=>{
 assert.equal(pack.cards['KMR-1-008'].opponentBounceImmune,true);
 assert.equal(pack.cards['KMR-1-008'].impactNull,true);
 assert.deepEqual(pack.cards['KMR-1-089'].blockBpRestriction,{relation:'atMost',bp:2000,condition:null});
 assert.equal(pack.cards['KMR-1-078'].raidHostNameIncludes,'電王');
 assert.equal(pack.cards['KMR-1-085'].raidOnlyEntry,true);
});

test('same-energy main is offered only when three hand cards share a cost',()=>{
 const s=fresh(countsFor(['KMR-1-034','KMR-1-006','KMR-1-017','KMR-1-023']));
 const actor=put(s,0,'KMR-1-034','front',0,true);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 ready(s);
 const before=legalUniversalActions(packs,s);
 assert.equal(before.some(a=>a.uid===actor.uid&&String(a.mode).startsWith('kmr:KMR-1-034')),false);
 s.players[0].hand.push(take(s,0,'KMR-1-006'),take(s,0,'KMR-1-017'),take(s,0,'KMR-1-023'));
 const after=legalUniversalActions(packs,s);
 assert.equal(after.some(a=>a.uid===actor.uid&&String(a.mode).startsWith('kmr:KMR-1-034')),true);
});

test('a Kamen Rider choice does not fall through the AI play path',()=>{
 const s=fresh(countsFor(['KMR-1-001']));
 s.pending={kind:'kmr',player:0,sourceUid:'0-1',id:'KMR-1-001',step:'mill',
  actions:[{type:'kmr',mode:'skip'},{type:'kmr',mode:'mill'}]};
 const chosen=dispatchUniversalAction(packs,s,{type:'kmr',mode:'skip'});
 assert.equal(chosen.pending,null);
});
