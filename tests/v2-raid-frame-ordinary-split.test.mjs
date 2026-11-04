import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact}
 from '../dist/universal-v2/engine.mjs';

// Rugia span.raidBorder splits one print into ordinary text and raid-frame
// text. Q51 / Q552: the frame is live only with a face-up card underneath.
// Ordinary play still resolves the text outside the frame.
function deckFor(pack, featured){
 const deck={};
 const caps={final:0,color:0,special:0};
 const add=(id,n)=>{
  const c=pack.cards[id];
  if(!c)throw Error('missing '+id);
  let k=Math.min(n,(c.maxCopies||4)-(deck[id]||0));
  if(Object.prototype.hasOwnProperty.call(caps,c.trigger)){
   k=Math.min(k,4-caps[c.trigger]);
   if(k>0)caps[c.trigger]+=k;
  }
  if(k<=0)return;
  deck[id]=(deck[id]||0)+k;
 };
 for(const id of featured)add(id,2);
 let left=50-Object.values(deck).reduce((n,c)=>n+c,0);
 for(const c of Object.values(pack.cards)){
  if(left<=0)break;
  if(c.type!=='character'||c.energy>1||featured.includes(c.id))continue;
  const before=50-left;
  add(c.id,Math.min(4-(deck[c.id]||0),left));
  left-=Object.values(deck).reduce((n,x)=>n+x,0)-before;
 }
 if(left>0)throw Error('short deck');
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 return deck;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone],i=pile.findIndex(c=>c.cardId===id);
  if(i>=0)return pile.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function keepHand(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function fuel(s,p,ids){
 let n=0;
 for(const id of ids){
  const e=take(s,p,id);
  e.ready=true;e.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[p].energy[n++]=e;
 }
}

test('Genm ordinary entry discards, and the raid-frame main stays closed',()=>{
 const pack=officialV2Pack('kmr');
 const packs=[pack,pack];
 const deck=deckFor(pack,['KMR-1-044','KMR-1-043','KMR-1-046','KMR-1-046','KMR-1-001']);
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:44044});
 fuel(s,0,['KMR-1-046','KMR-1-046','KMR-1-046']);
 const genm=take(s,0,'KMR-1-044');
 const extra=take(s,0,'KMR-1-001');
 keepHand(s,0,[genm,extra]);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===genm.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 const body=s.players[0].front.find(c=>c?.uid===genm.uid);
 assert.ok(body);
 assert.equal(body.stack.length,0);
 assert.equal(s.players[0].outside.some(c=>c.uid===extra.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===genm.uid),false);
 const base=take(s,0,'KMR-1-043'); // A Genm base, not unrelated Kamen Rider Birth.
 base.faceDown=false;
 body.stack=[base];
 s.players[0].outside.push(take(s,0,'KMR-1-044'));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===genm.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Fang Joker impact is printed inside the raid frame',()=>{
 const pack=officialV2Pack('kmr');
 const packs=[pack,pack];
 const deck=deckFor(pack,['KMR-2-049','KMR-2-048']);
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:49049});
 const rider=take(s,0,'KMR-2-049');
 rider.ready=true;rider.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=rider;
 assert.equal(universalImpact(packs,s,rider),0);
 const base=take(s,0,'KMR-2-048');
 rider.stack=[base];
 assert.equal(universalImpact(packs,s,rider),1);
 assert.equal(universalBp(packs,s,rider),pack.cards['KMR-2-049'].bp);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Colossal Titan ordinary play keeps the outside front limit and skips the raid-frame entry',()=>{
 const pack=officialV2Pack('aot');
 const packs=[pack,pack];
 const deck=deckFor(pack,['AOT-2-013','AOT-2-003','AOT-2-004','AOT-2-012','AOT-2-017','AOT-2-001']);
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:13013});
 fuel(s,0,['AOT-2-003','AOT-2-004','AOT-2-012','AOT-2-017']);
 const titan=take(s,0,'AOT-2-013');
 const victim=take(s,1,'AOT-2-001');
 victim.ready=true;victim.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=victim;
 keepHand(s,0,[titan]);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===titan.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0].uid,victim.uid);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].aotFrontLimit,3);
 assert.equal(assertUniversalMatch(packs,s),true);
});
