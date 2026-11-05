import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const pack=createTtgV2Pack();
const feature=['TTG-1-004','TTG-1-012','TTG-1-027','TTG-1-031','TTG-1-032','TTG-1-033',
 'TTG-1-034','TTG-1-056','TTG-1-061','TTG-1-062','TTG-1-074'];
const filler=['TTG-1-009','TTG-1-002','TTG-1-029','TTG-1-076','TTG-1-058','TTG-1-044','TTG-1-053'];
const deck=Object.fromEntries(feature.map(id=>[id,2]));
for(const id of filler)deck[id]=4;
const take=(s,id,owner=0)=>{
 const p=s.players[owner];
 for(const zone of ['hand','deck','life','outside']){
  const i=p[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return p[zone].splice(i,1)[0];
 }
 throw Error('Cannot locate '+id);
};
const advance=(s,predicate)=>{
 const legal=legalUniversalActions(pack,s);
 const action=legal.find(predicate);
 assert.ok(action,'missing legal action at '+s.phase+'/'+(s.pending?.kind||''));
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
};
function readyCount(s){return s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;}
function setup(seed,{spare=false,topCards=0}={}){
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed,first:0});
 const p=s.players[0];
 const simon=take(s,'TTG-1-012');
 const extra=spare?take(s,'TTG-1-058'):null;
 for(let i=0;i<3;i++){
  const c=take(s,'TTG-1-009');
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  c.buffs=[{energy:10,untilTurn:1}];p.energy[i]=c;
 }
 s=advance(s,a=>a.type==='next'); // START -> MOVE
 s=advance(s,a=>a.type==='next'); // MOVE -> MAIN
 const mine=s.players[0];
 mine.outside.push(...mine.hand.splice(0),...mine.deck.splice(topCards));
 if(topCards===0){
  // No deck window: setup should still resolve the mandatory AP recovery.
  mine.outside.push(...mine.deck.splice(0));
 }
 mine.hand.push(simon);
 if(extra)mine.hand.push(extra);
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,simon,extra};
}

test('Q2266: discard exactly one card, then recover one AP without reaching energy 15',()=>{
 let {s,simon,extra}=setup(12010,{spare:true});
 const apBefore=readyCount(s);
 s=advance(s,a=>a.type==='play'&&a.uid===simon.uid&&a.line==='front');
 assert.equal(readyCount(s),apBefore-2,'Simon costs 2 AP');
 assert.equal(s.pending.kind,'effect-discard-mode');
 const choices=legalUniversalActions(pack,s);
 assert.equal(choices.some(a=>a.mode==='skip'),false,'skipping printed AP recovery is illegal');
 assert.equal(choices.some(a=>a.mode==='activeAp'),false,'must discard while a hand card exists');
 s=advance(s,a=>a.type==='chooseDiscardPay'&&a.uid===extra.uid);
 assert.equal(s.pending.kind,'effect-discard-mode');
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.type==='chooseDiscardPay'&&a.mode==='activeAp'));
 assert.equal(options.some(a=>a.mode==='retire'),false,'low-energy discard still recovers AP');
 assert.equal(options.some(a=>a.mode==='skip'),false);
 const label=uiActionLabel(options.find(a=>a.mode==='activeAp'),{pack,state:s});
 assert.match(label,/AP/);
 const apPaid=readyCount(s);
 s=advance(s,a=>a.type==='chooseDiscardPay'&&a.mode==='activeAp');
 assert.equal(readyCount(s),apPaid+1);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===extra.uid));
});

test('Q2266: with zero hand and an empty deck, Simon still recovers one AP',()=>{
 let {s,simon}=setup(12011);
 const before=readyCount(s);
 s=advance(s,a=>a.type==='play'&&a.uid===simon.uid&&a.line==='front');
 assert.equal(s.pending,null);
 assert.equal(readyCount(s),before-1,'paid 2 AP, then recovered 1 AP automatically');
});

test('Q2266: with a nonempty inspected deck and zero remaining hand, AP still recovers',()=>{
 let {s,simon}=setup(12012,{topCards:3});
 const before=readyCount(s);
 s=advance(s,a=>a.type==='play'&&a.uid===simon.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-look-take');
 s=advance(s,a=>a.type==='chooseLookTake'&&a.uid===null);
 for(let i=0;i<3;i++)s=advance(s,a=>a.type==='chooseLookOrder');
 assert.equal(s.pending,null);
 assert.equal(readyCount(s),before-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('V2 renders the mandatory AP result, rather than an optional zero-effect skip',()=>{
 const text=readFileSync(new URL('../dist/universal-v2/ttg-finish-runtime.mjs',import.meta.url),'utf8');
 const section=text.split("if(q.kind==='effect-discard-mode'){")[1]?.split("if(q.kind==='effect-facedown-scale')")[0];
 assert.ok(section);
 assert.match(section,/mode:'activeAp'/);
 assert.doesNotMatch(section,/mode:'skip'/);
 assert.match(text,/if\(!p\.hand\.length\)\{[\s\S]*?readyOneAp\(p\)/);
});
