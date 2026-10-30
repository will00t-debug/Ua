import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,assertUniversalMatch,universalBp,universalImpact,
 universalImpactNull,universalAttackDamage} from '../dist/universal-v2/engine.mjs';

// Q51 / Q552: Raid-box keywords need a face-up card under a Raid top.
// Ordinary play still runs 登場時 outside the box. Not full FAQ certification.
const cases=[
 {title:'bleach',id:'BLC-1-004',base:'BLC-1-002',filler:'BLC-1-001',
  impact:[0,1]},
 {title:'bleach',id:'BLC-1-020',base:'BLC-1-018',filler:'BLC-1-001',
  impact:[0,1]},
 {title:'bleach',id:'BLC-1-093',base:'BLC-1-080',filler:'BLC-1-079',
  impact:[0,1]},
 {title:'bleach',id:'BLC-2-065',base:'BLC-1-078',filler:'BLC-1-079',
  impactNull:[false,true]},
 {title:'bleach',id:'BLC-2-067',base:'BLC-1-080',filler:'BLC-1-079',
  impact:[0,1]},
 {title:'solo-leveling',id:'SLG-1-022',base:'SLG-1-001',filler:'SLG-1-006',
  impact:[0,1]},
 {title:'solo-leveling',id:'SLG-1-049',base:'SLG-1-001',filler:'SLG-1-006',
  impact:[0,1],bp:[4000,4500]},
 {title:'sword-art-online',id:'SAO-1-018',base:'SAO-1-005',filler:'SAO-1-001',
  impact:[0,1],impactNull:[false,true]},
 {title:'sword-art-online',id:'SAO-1-087',base:'SAO-1-041',filler:'SAO-1-001',
  impact:[0,1]},
 {title:'mushoku-tensei',id:'MST-1-009',base:'MST-1-001',filler:'MST-1-002',
  impact:[0,1],bp:[3500,4000]},
 {title:'mushoku-tensei',id:'MST-1-031',base:'MST-1-032',filler:'MST-1-001',
  impactNull:[false,true]},
 {title:'rezero',id:'REZ-1-015',base:'REZ-1-013',filler:'REZ-1-001',
  bp:[3500,4000]},
 {title:'rezero',id:'REZ-1-053',base:'REZ-1-013',filler:'REZ-1-001',
  impact:[0,1]},
 {title:'rezero',id:'REZ-1-089',base:'REZ-1-027',filler:'REZ-1-001',
  impactNull:[false,true]},
 {title:'rezero',id:'REZ-2-065',base:'REZ-2-001',filler:'REZ-1-001',
  bp:[4000,5000]},
 {title:'madoka',id:'MMM-1-071',base:'MMM-1-073',filler:'MMM-1-085',
  damage:[1,2]},
 {title:'madoka',id:'MMM-1-090',base:'MMM-1-073',filler:'MMM-1-085',
  impact:[0,1],impactNull:[false,true]},
 {title:'madoka',id:'MMM-2-032',base:'MMM-2-036',filler:'MMM-1-085',
  impactNull:[false,true]},
 {title:'inuyasha',id:'IYS-1-059',base:'IYS-1-001',filler:'IYS-1-002',
  impact:[0,1]},
 {title:'kjn',id:'KJN-1-015',base:'KJN-1-001',filler:'KJN-1-012',
  impactNull:[false,true]},
 {title:'kjn',id:'KJN-1-049',base:'KJN-1-001',filler:'KJN-1-012',
  impact:[0,1]},
 {title:'kjn',id:'KJN-1-074',base:'KJN-1-052',filler:'KJN-1-065',
  impactNull:[false,true]}
];

function deckFor(pack, featured){
 const deck={};
 for(const id of featured){
  if(!pack.cards[id])throw Error('missing '+id);
  deck[id]=2;
 }
 const need=50-Object.values(deck).reduce((n,c)=>n+c,0);
 const fillers=Object.values(pack.cards).filter(c=>
  c.type==='character'&&c.energy<=2&&!featured.includes(c.id));
 let left=need;
 for(const c of fillers){
  if(left<=0)break;
  const n=Math.min(4,left);
  deck[c.id]=(deck[c.id]||0)+n;
  left-=n;
 }
 if(left>0)throw Error('could not fill 50 for '+featured.join(','));
 return deck;
}

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone],i=pile.findIndex(c=>c.cardId===id);
  if(i>=0)return pile.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}

test('Raid-box keywords stay off after ordinary play on every official V2 title',()=>{
 for(const row of cases){
  const pack=officialV2Pack(row.title);
  const printed=pack.cards[row.id];
  assert.ok(printed.raidName||printed.raidTrait,row.id+' must be a Raid card');
  const featured=[row.id,row.base,row.filler];
  const deck=deckFor(pack,featured);
  assert.deepEqual(validateUniversalDeck(pack,deck),[],row.id+' deck');
  let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:51051});
  const bare=take(s,0,row.id);
  bare.ready=false;bare.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=bare;
  if(row.impact)assert.equal(universalImpact(pack,s,bare),row.impact[0],row.id+' bare impact');
  if(row.impactNull)assert.equal(universalImpactNull(pack,s,bare),row.impactNull[0],row.id+' bare null');
  if(row.bp)assert.equal(universalBp(pack,s,bare),row.bp[0],row.id+' bare bp');
  if(row.damage)assert.equal(universalAttackDamage(pack,s,bare),row.damage[0],row.id+' bare damage');
  const base=take(s,0,row.base);
  bare.stack=[base];bare.ready=true;
  if(row.impact)assert.equal(universalImpact(pack,s,bare),row.impact[1],row.id+' raid impact');
  if(row.impactNull)assert.equal(universalImpactNull(pack,s,bare),row.impactNull[1],row.id+' raid null');
  if(row.bp)assert.equal(universalBp(pack,s,bare),row.bp[1],row.id+' raid bp');
  if(row.damage)assert.equal(universalAttackDamage(pack,s,bare),row.damage[1],row.id+' raid damage');
  assert.equal(assertUniversalMatch(pack,s),true,row.id+' match');
 }
});
