import {EXPECTED_V2_COUNTS,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {BLEACH_V2_NEW_IDS,BLEACH_V2_ADDON_PROFILES,
 createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {REAL_V2_PILOT_IDS} from '../dist/universal-v2/real-card-pilots.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,
 dispatchUniversalAction,assertUniversalMatch,universalPublicView,universalEnergyByColor
} from '../dist/universal-v2/engine.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const twelve=['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-039',
 'BLC-1-035','BLC-2-008','BLC-1-089','BLC-2-020','BLC-2-029',
 'BLC-4-062','BLC-1-102','BLC-1-017'];
const counts={...Object.fromEntries(twelve.map(id=>[id,4])),'BLC-1-034':2};
const fresh=(first=0,seed=12015)=>newUniversalMatch(packs,{decks:[counts,counts],first,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(x=>x.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing physical card '+p+'/'+id);
}
function reach(s,phase){
 for(let i=0;i<5&&s.phase!==phase;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'Cannot reach '+phase);
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
test('73 official standalone BLEACH profiles extend rather than replace 15 existing pilots',()=>{
 assert.equal(REAL_V2_PILOT_IDS.bleach.length,15);
 assert.equal(BLEACH_V2_NEW_IDS.length,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.equal(new Set(BLEACH_V2_NEW_IDS).size,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.ok(REAL_V2_PILOT_IDS.bleach.every(id=>pack.cards[id]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 for(const p of BLEACH_V2_ADDON_PROFILES){
  const c=pack.cards[p.id],old=CARDS.find(x=>x.identity===p.id);
  const recordedShop=p.id==='BLC-4-082'&&old?.source==='https://shopping.fullcomp.jp/products/pdsrqs97vlmo'||
   p.id==='BLC-4-083'&&old?.source==='https://dorasuta.jp/union-arena/product?pid=709493';
  assert.ok(c&&old&&(old.source.includes('unionarena-tcg.com/jp/cardlist/')||recordedShop),p.id);
  for(const field of ['energy','ap','bp','color','trigger','type'])
   assert.equal(c[field],p[field],p.id+' '+field);
  assert.equal(c.gen,p.id==='BLC-4-014'||p.id==='BLC-4-074'?1:p.id==='BLC-4-042'?2:p.gen,p.id+' printed base energy');
  assert.ok(!Object.hasOwn(c,'auto'));
  assert.equal(c.title,'bleach');
  assert.equal(c.step,p.kind==='step');
  if(p.kind==='bounce')
   assert.deepEqual(c.effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
  if(p.kind==='drawPlay')assert.deepEqual(c.effects.onPlay,[{op:'draw',count:1}]);
  if(p.kind==='drawDiscardPlay')assert.deepEqual(c.effects.onPlay,[{op:'drawDiscard',count:1}]);
  if(p.kind==='drawDiscardAttack')assert.deepEqual(c.effects.onAttack,[{op:'drawDiscard',count:1}]);
  if(p.kind==='recoverAp2')assert.deepEqual(c.effects.onPlay,[{op:'recoverAp',count:2}]);
  if(p.kind==='impactNull')assert.equal(c.impactNull,true);
  if(p.kind==='activeEnergy')assert.equal(c.activeExtraEnergy,1);
  if(['plain','plainAlt','step'].includes(p.kind))assert.deepEqual(c.effects,{});
  if(p.kind==='traitBuffAllDraw')assert.deepEqual(c.effects.onPlay,[
   {op:'buffOwnTraitAllTurn',trait:'護廷十三隊',bp:1000},{op:'draw',count:1}
  ]);
  assert.equal(p.kind==='plain',p.effect==='無固有效果。');
 }
});

test('STEP cards have legal front-to-energy movement only in move phase and conserve UIDs',()=>{
 let s=fresh(),card=take(s,0,'BLC-1-001');
 s.players[0].front[0]=card;
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='step'));
 s=reach(s,'move');
 const legal=legalUniversalActions(packs,s).find(a=>a.type==='step'&&a.uid===card.uid&&a.slot===0);
 assert.ok(legal);
 const old=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{...legal,slot:99},{actor:0}),/not currently legal/);
 assert.deepEqual(s,old,'illegal move must not mutate original game state');
 const next=dispatchUniversalAction(packs,s,legal,{actor:0});
 assert.equal(next.players[0].front[0],null);
 assert.equal(next.players[0].energy[0]?.uid,card.uid);
 assert.ok(!legalUniversalActions(packs,next).some(a=>a.type==='step'&&a.uid===card.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});

test('printed mandatory bounce chooses another cost 1 or lower; illegal UID and skip rejected',()=>{
 let s=fresh(),p=s.players[0],generator=take(s,0,'BLC-1-102');
 const base=take(s,0,'BLC-1-039'),arrival=take(s,0,'BLC-1-035');
 p.energy[0]=generator;p.front[0]=base;p.hand.push(arrival);
 s=reach(s,'main');
 const act=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===arrival.uid&&a.line==='front'&&a.slot===1);
 assert.ok(act,'printed two-purple-energy producer pays requirement 1');
 let after=dispatchUniversalAction(packs,s,act,{actor:0});
 assert.equal(after.pending?.kind,'effect-bounce-own');
 const options=legalUniversalActions(packs,after);
 assert.deepEqual(options,[{type:'chooseOwnBounce',uid:base.uid}]);
 const before=structuredClone(after);
 assert.throws(()=>dispatchUniversalAction(packs,after,
  {type:'chooseOwnBounce',uid:null},{actor:0}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,after,
  {type:'chooseOwnBounce',uid:arrival.uid},{actor:0}),/not currently legal/);
 assert.deepEqual(after,before);
 after=dispatchUniversalAction(packs,after,options[0],{actor:0});
 assert.equal(after.pending,null);
 assert.ok(after.players[0].hand.some(x=>x.uid===base.uid));
 assert.equal(after.players[0].front[1]?.uid,arrival.uid);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('mandatory bounce returns itself when no legal other low-energy character exists',()=>{
 let s=fresh(),p=s.players[0],generator=take(s,0,'BLC-2-029'),
 arrival=take(s,0,'BLC-2-020');
 p.energy[0]=generator;p.hand.push(arrival);
 s=reach(s,'main');
 const act=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===arrival.uid&&a.line==='front'&&a.slot===0);
 assert.ok(act);
 const beforeAP=s.players[0].apCards.filter(c=>c.ready).length;
 const next=dispatchUniversalAction(packs,s,act,{actor:0});
 assert.equal(next.pending,null);
 assert.ok(next.players[0].hand.some(c=>c.uid===arrival.uid));
 assert.equal(next.players[0].front[0],null);
 assert.equal(next.players[0].apCards.filter(c=>c.ready).length,beforeAP-1,
  'returning itself does not refund paid AP');
 assert.equal(assertUniversalMatch(packs,next),true);
});

test('insufficient energy blocks play and does not silently bypass arrival cost',()=>{
 let s=fresh(),p=s.players[0],expensive=take(s,0,'BLC-1-035');
 p.hand.push(expensive);
 s=reach(s,'main');
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===expensive.uid));
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'play',uid:expensive.uid,line:'front',slot:0},{actor:0}),/not currently legal/);
 assert.deepEqual(s,before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('GET/DRAW/ACTIVE triggers retain printed type; public state redacts opposing cards',()=>{
 for(const [id,expected] of [
  ['BLC-1-012','get'],['BLC-2-023','draw'],['BLC-1-002','active']]){
  const c=pack.cards[id];
  assert.equal(c.trigger,expected);
  const s=fresh();
  assert.equal(assertUniversalMatch(packs,s),true);
  const opponentView=universalPublicView(packs,s,1);
  assert.ok(!JSON.stringify(opponentView).includes(s.players[0].hand[0]?.uid||'UNLIKELY-UID'));
 }
});


test('official draw-then-discard onPlay queues mandatory discard and refuses illegal skip',()=>{
 let s=fresh(0,812),p=s.players[0],actor=take(s,0,'BLC-2-008');
 p.hand.push(actor);
 s=reach(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const before=structuredClone(s),initialDeck=s.players[0].deck.length;
 const pending=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(pending.players[0].deck.length,initialDeck-1);
 assert.equal(pending.pending?.kind,'effect-discard');
 const actions=legalUniversalActions(packs,pending);
 assert.ok(actions.some(a=>a.type==='chooseDiscard'));
 assert.ok(!actions.some(a=>a.type==='next'));
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseDiscard',uid:null},{actor:0}),/not currently legal/);
 assert.deepEqual(s,before);
 const selected=actions.find(a=>a.type==='chooseDiscard');
 const resolved=dispatchUniversalAction(packs,pending,selected,{actor:0});
 assert.equal(resolved.pending,null);
 assert.ok(resolved.players[0].outside.some(c=>c.uid===selected.uid));
 assert.equal(assertUniversalMatch(packs,resolved),true);
});

test('ACTIVE-only bonus energy does not produce bonus while REST',()=>{
 let s=fresh(0,333),p=s.players[0],producer=take(s,0,'BLC-2-029');
 p.energy[0]=producer;producer.ready=true;
 const active=universalEnergyByColor(packs,s,0);
 assert.equal(active.blue,2,'base blue + 1 only while active');
 producer.ready=false;
 const rested=universalEnergyByColor(packs,s,0);
 assert.equal(rested.blue,1,'REST retains printed base energy, not ACTIVE bonus');
 assert.equal(assertUniversalMatch(packs,s),true)
});


function strikeLife(id){
 let s=fresh(1,10101),attacker=take(s,1,'BLC-1-039'),life=take(s,0,id);
 attacker.ready=true;s.players[1].front[0]=attacker;
 const old=s.players[0].life.shift();
 s.players[0].deck.push(old);
 s.players[0].life.unshift(life);
 s=reach(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 return {s,life};
}

test('BLC-1-039 printed GET life trigger can be taken into hand, not duplicated',()=>{
 const {s,life}=strikeLife('BLC-1-039');
 const preCount=s.players[0].hand.length;
 const get=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='get');
 assert.ok(get);
 const after=dispatchUniversalAction(packs,s,get,{actor:0});
 assert.ok(after.players[0].hand.some(c=>c.uid===life.uid));
 assert.equal(after.players[0].hand.length,preCount+1);
 assert.ok(!after.players[0].outside.some(c=>c.uid===life.uid));
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('BLC-2-008 printed DRAW trigger is separate from onPlay draw-discard',()=>{
 const {s,life}=strikeLife('BLC-2-008'),d=s.players[0].deck.length;
 const draw=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.ok(draw);
 const after=dispatchUniversalAction(packs,s,draw,{actor:0});
 assert.equal(after.players[0].deck.length,d-1);
 assert.ok(after.players[0].outside.some(c=>c.uid===life.uid));
 assert.equal(after.pending,null);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('BLC-1-002 ACTIVE life trigger selects own legal character and rejects enemy UID',()=>{
 const {s,life}=strikeLife('BLC-1-002');
 const target=take(s,0,'BLC-1-012');target.ready=false;s.players[0].energy[0]=target;
 const foe=s.players[1].front[0];
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'active',uid:foe.uid},{actor:0}),/not currently legal/);
 const ready=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===target.uid);
 assert.ok(ready);
 const after=dispatchUniversalAction(packs,s,ready,{actor:0});
 assert.equal(after.players[0].energy[0]?.ready,true);
 assert.equal(after.players[0].energy[0]?.buffs.at(-1)?.bp,3000);
 assert.ok(after.players[0].outside.some(c=>c.uid===life.uid));
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('BLC-4-014 legacy gen=2 import is normalized to official yellow+ base and ACTIVE bonus',()=>{
 const name='BLC-4-014',p=pack.cards[name];
 assert.equal(BLEACH_V2_ADDON_PROFILES.find(x=>x.id===name).gen,2,
  'raw repository is known to encode active total in gen');
 assert.equal(p.gen,1,'printed base is one yellow');
 assert.equal(p.activeExtraEnergy,1,'ACTIVE adds exactly one yellow');
 const deck={...counts};
 deck['BLC-1-017']=0;deck[name]=4;delete deck['BLC-1-017'];
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:14014,first:0});
 const gen=take(s,0,name);
 gen.ready=true;s.players[0].energy[0]=gen;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,2);
 gen.ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).yellow,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
