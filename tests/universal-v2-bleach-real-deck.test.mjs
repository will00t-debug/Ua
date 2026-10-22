import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {REAL_V2_PILOT_IDS,verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS,verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalActor} from '../dist/universal-v2/engine.mjs';

// Official cards, NEVER synthetic filler; all fixture rearrangements preserve
// the exact fifty printed card IDs originally supplied by the deck.
const prepared=verifiedBleachPurplePilotDeck(),pack=prepared.pack;
const packs=[pack,pack],counts={...BLEACH_PURPLE_V2_PILOT_COUNTS};
const fresh=(first=0,seed=556)=>newUniversalMatch(packs,{decks:[counts,counts],first,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(x=>x.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Expected real BLEACH physical card '+p+'/'+id);
}
function startTo(s,phase){
 while(s.phase!==phase){
  const a=legalUniversalActions(packs,s).find(x=>x.type==='next');
  assert.ok(a,'must advance legally to '+phase);
  s=dispatchUniversalAction(packs,s,a);
 }
 return s;
}

test('official BLEACH pilot has fifteen distinct allowed identities and exact 50-card PURPLE deck with no invented filler',()=>{
 const expect=[
  'BLC-1-034','BLC-1-036','BLC-1-037','BLC-1-039','BLC-1-040',
  'BLC-1-064','BLC-1-066','BLC-1-045','BLC-1-048',
  'BLC-1-052','BLC-1-057','BLC-1-102','BLC-1-103',
  'BLC-1-105','BLC-1-107'
 ];
 assert.deepEqual(REAL_V2_PILOT_IDS.bleach,expect);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.ok(Object.entries(counts).every(([id,n])=>
  pack.cards[id]&&pack.cards[id].color==='purple'&&n>=1&&n<=4&&!id.includes('TEST')));
 assert.equal(counts['BLC-1-066'],2,'exactly two total FINAL cards');
 const original=verifiedPilotPack('bleach');
 assert.deepEqual(Object.keys(original.cards),expect,
  'the original fifteen individually reviewed pilots cannot be deleted or renamed');
 assert.ok(expect.every(id=>pack.cards[id]?.id===id),
  'the expanded registered pack must retain every original Pilot card');
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach,
  '15 baseline + exact 73 individually pinned BLEACH additions');
 const s=fresh();
 assert.equal(s.players[0].life.length,7);
 assert.equal(s.players[1].life.length,7);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('official BLC-1-036 millTop 2 is mandatory, even with only one deck card (official Q556)',()=>{
 let s=fresh(),pl=s.players[0],generator=take(s,0,'BLC-1-102');
 const effect=take(s,0,'BLC-1-036');
 pl.energy[0]=generator;pl.hand.push(effect);
 // Keep just one physical card in deck; excess goes to the real outside zone.
 while(pl.deck.length>1)pl.outside.push(pl.deck.pop());
 s=startTo(s,'main');
 const before=structuredClone(s),milled=s.players[0].deck[0].uid;
 const option=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===effect.uid&&a.line==='front'&&a.slot===0);
 assert.ok(option);
 s=dispatchUniversalAction(packs,s,option,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,0);
 assert.ok(s.players[0].outside.some(c=>c.uid===milled));
 assert.equal(s.players[0].front[0]?.uid,effect.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,before),true);
});

function colorTriggerSetup(){
 let s=fresh(1,708);
 const attacker=take(s,1,'BLC-1-039');s.players[1].front[0]=attacker;attacker.ready=true;
 const trigger=take(s,0,'BLC-1-040'),oldLife=s.players[0].life.shift();
 s.players[0].deck.push(oldLife);s.players[0].life.unshift(trigger);
 s=startTo(s,'attack');
 const attacked=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 const flipped=dispatchUniversalAction(packs,attacked,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(flipped.pending?.kind,'life-trigger');
 assert.equal(flipped.pending.trigger,'color');
 return {flipped,trigger,attacker};
}

test('official BLC-1-040 COLOR may deploy a cost-2 AP1 PURPLE card from OWN OUTSIDE to ACTIVE FRONT, not hand',()=>{
 const {flipped,trigger}=colorTriggerSetup();
 const s=structuredClone(flipped),p=s.players[0];
 const target=take(s,0,'BLC-1-036');p.outside.push(target);
 const foeOutside=take(s,1,'BLC-1-036');s.players[1].outside.push(foeOutside);
 const high=take(s,0,'BLC-1-052');p.outside.push(high);
 const event=take(s,0,'BLC-1-066');p.outside.push(event);
 const actions=legalUniversalActions(packs,s);
 const selected=actions.find(a=>a.mode==='colorOutside'&&a.uid===target.uid&&a.slot===0);
 assert.ok(selected);
 assert.ok(actions.every(a=>a.mode==='skip'||a.mode==='colorOutside'));
 assert.ok(!actions.some(a=>a.uid===foeOutside.uid||a.uid===high.uid||a.uid===event.uid));
 assert.ok(!actions.some(a=>a.mode==='colorOutside'&&a.line!=='front'));
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'colorOutside',uid:foeOutside.uid,line:'front',slot:0},{actor:0}),
  /not currently legal/);
 const beforeAp=p.apCards.filter(a=>a.ready).length,beforeDeck=p.deck.length;
 const after=dispatchUniversalAction(packs,s,selected,{actor:0});
 assert.equal(after.pending,null);
 assert.equal(after.players[0].front[0]?.uid,target.uid);
 assert.equal(after.players[0].front[0]?.ready,true);
 assert.equal(after.players[0].deck.length,beforeDeck-2,
  'outside-deployed 036 must execute its normal mandatory onPlay mill 2');
 assert.equal(after.players[0].apCards.filter(a=>a.ready).length,beforeAp,
  'life COLOR costs zero AP');
 assert.ok(after.players[0].outside.some(x=>x.uid===trigger.uid),
  'life source remains in outside when a different character is summoned');
 assert.equal(assertUniversalMatch(packs,after),true);
 assert.equal(assertUniversalMatch(packs,flipped),true);
});

test('official BLC-1-040 life COLOR may select itself from outside and its onPlay private top decision survives life trigger cleanup',()=>{
 const {flipped,trigger}=colorTriggerSetup();
 const options=legalUniversalActions(packs,flipped);
 const self=options.find(a=>a.mode==='colorOutside'&&a.uid===trigger.uid&&a.slot===0);
 assert.ok(self,'revealed COLOR itself satisfies its printed criteria in outside zone');
 const oldDeck=flipped.players[0].deck.length;
 const deployed=dispatchUniversalAction(packs,flipped,self,{actor:0});
 assert.equal(deployed.pending.kind,'private-top-choice');
 assert.equal(deployed.pending.player,0);
 assert.equal(deployed.players[0].front[0]?.uid,trigger.uid);
 assert.equal(deployed.players[0].front[0]?.ready,true);
 assert.equal(universalActor(deployed),0);
 assert.equal(deployed.players[0].deck.length,oldDeck);
 assert.deepEqual(universalPublicView(packs,deployed,1).pending,
  {kind:'private-top-choice',player:0});
 assert.deepEqual(legalUniversalActions(packs,deployed),[
  {type:'chooseTopCard',mode:'top'},{type:'chooseTopCard',mode:'outside'}
 ]);
 const bottom=deployed.players[0].deck[0].uid;
 const resolved=dispatchUniversalAction(packs,deployed,{type:'chooseTopCard',mode:'outside'},{actor:0});
 assert.equal(resolved.pending,null);
 assert.equal(resolved.players[0].deck.length,oldDeck-1);
 assert.ok(resolved.players[0].outside.some(c=>c.uid===bottom));
 assert.equal(assertUniversalMatch(packs,resolved),true);
});

test('official BLC-1-052 onAttack draw then discard waits before opponent BLOCK action',()=>{
 let s=fresh(0,982),attacker=take(s,0,'BLC-1-052');
 attacker.ready=true;s.players[0].front[0]=attacker;
 s=startTo(s,'attack');
 const before=structuredClone(s),beforeDeck=s.players[0].deck.length;
 const attacked=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(attacked.pending?.kind,'effect-discard');
 assert.equal(attacked.pending.player,0);
 assert.ok(!legalUniversalActions(packs,attacked).some(a=>a.type==='chooseBlock'));
 assert.equal(attacked.players[0].deck.length,beforeDeck-1);
 const discard=legalUniversalActions(packs,attacked).find(a=>a.type==='chooseDiscard');
 assert.ok(discard);
 const resolved=dispatchUniversalAction(packs,attacked,discard,{actor:0});
 assert.equal(resolved.pending.kind,'block');
 assert.equal(resolved.pending.player,1);
 assert.ok(resolved.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(resolved.players[0].hand.length,attacked.players[0].hand.length-1);
 assert.equal(assertUniversalMatch(packs,resolved),true);
 assert.deepEqual(s,before);
});

test('two real 50-card BLEACH packs can play a deterministic complete normal AI mirror game with no synthetic cards',()=>{
 let s=fresh(0,2108),completed=false,steps=0;
 for(;steps<2500&&s.status==='playing';steps++){
  const a=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
  assert.ok(a, 'normal AI must select an allowed move at step '+steps);
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
  s=dispatchUniversalAction(packs,s,a);
  if(steps%30===0)assert.equal(assertUniversalMatch(packs,s),true);
 }
 completed=s.status==='finished';
 assert.ok(steps>20,'real-only match should progress past opening');
 assert.equal(completed,true,'both real decks should finish within turn/action safety cap');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.ok(['life-zero','unblocked-attack','required-draw-empty'].includes(s.endReason));
});
