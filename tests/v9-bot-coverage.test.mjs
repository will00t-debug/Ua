import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,PRESETS,validateDeck} from '../dist/cards.mjs';
import {newGame,dispatch,botAction,assertState} from '../dist/engine.mjs';
function coloredDeck(color){
 const pool=CARDS.filter(c=>c.color===color&&c.type==='character'&&c.ap===1&&c.energy<=5&&c.trigger!=='color'&&c.trigger!=='special'&&c.trigger!=='final');
 const ordered=[...pool].sort((a,b)=>a.energy-b.energy||a.identity.localeCompare(b.identity));
 const ids=ordered.slice(0,16);const counts={};let remain=50;
 for(let i=0;i<ids.length&&remain>0;i++){const n=Math.min(i<5?4:3,remain);counts[ids[i].id]=n;remain-=n;}
 assert.equal(remain,0);assert.deepEqual(validateDeck(counts),[]);return counts;
}
test('mixed v9 cards can complete seeded AI games without violating card conservation',()=>{
 const mixed={...PRESETS[0].counts};for(const id of ['BLC-4-082','BLC-4-083','BLC-4-056','BLC-4-015','BLC-1-055','BLC-4-054','BLC-4-034','BLC-4-044']){mixed[id]=1;const donor=Object.keys(mixed).find(k=>!k.startsWith('BLC')&&mixed[k]>=2);mixed[donor]--;}
 const decks=[mixed,coloredDeck('blue'),coloredDeck('yellow'),coloredDeck('green'),coloredDeck('purple')];
 for(const [i,counts] of decks.entries())for(let seed=1;seed<=3;seed++){
  let s=newGame({decks:[counts,counts],seed:345+i*50+seed,first:seed%2});let step=0;
  while(s.status!=='finished'&&step++<1000){const a=botAction(s);assert.ok(a,`no action ${i}/${seed}/${step}`);s=dispatch(s,a);assertState(s);}
  assert.ok(step<1000,`incomplete game ${i}/${seed}`);
 }
});
