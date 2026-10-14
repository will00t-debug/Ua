import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalActor,universalEnergy,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {auditUniversalPort} from '../dist/universal-v2/migration.mjs';
import {TTG_CARDS} from '../dist/ttg-builder.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {SAO_CARDS} from '../dist/sao-cards.mjs';
import {MST_CARDS} from '../dist/mst-builder.mjs';

const base=Array.from({length:14},(_,i)=>({
 id:'P'+String(i).padStart(2,'0'),name:'Fighter '+i,type:'character',
 color:'green',energy:i%4===0?0:2,ap:1,bp:1500+i*100,gen:1,
 implementation:'vanilla'
}));
base[0]={...base[0],name:'Hero',energy:0,gen:4};
base[1]={...base[1],name:'Hero Power',energy:3,raidName:'Hero',implementation:'dsl',
 effects:{onRaid:[{op:'draw',count:1}]}};
base[2]={...base[2],implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
base[3]={...base[3],type:'event',energy:2,bp:0,gen:0,implementation:'dsl',
 effects:{onPlay:[{op:'draw',count:1}]}};
base[4]={...base[4],trigger:'draw'};
base[5]={...base[5],trigger:'get'};
base[6]={...base[6],trigger:'final'};
base[7]={...base[7],step:true};
base[9]={...base[9],implementation:'dsl',effects:{onAttack:[{op:'buffSelf',bp:1000}]}};
const pack=createUniversalPack({id:'test-future-work',cards:base});
const deck=Object.fromEntries(base.slice(0,12).map(c=>[c.id,4]));deck.P12=2;
const fresh=(seed=27,which=pack)=>newUniversalMatch(which,{decks:[deck,deck],seed,first:0});
const action=(pack,s,predicate)=>{const a=legalUniversalActions(pack,s).find(predicate);assert.ok(a,'Missing action in '+s.phase+': '+JSON.stringify(legalUniversalActions(pack,s)));return a;};
const go=(s,type)=>dispatchUniversalAction(pack,s,action(pack,s,a=>a.type===type));
const take=(s,p,id)=>{
 const pl=s.players[p];
 for(const zone of ['hand','deck','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw Error('Physical fixture missing '+id);
};
const toHand=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
function forceLife(s,p,id,last=false){
 const pl=s.players[p],c=take(s,p,id),old=pl.life.shift();
 pl.deck.push(old);pl.life.unshift(c);
 if(last)pl.outside.push(...pl.life.splice(1));
}
function preparedAttack(id='P08',life='P05',last=false){
 let s=fresh(11),attacker=take(s,0,id);
 s.players[0].front[0]=attacker;attacker.ready=true;
 forceLife(s,1,life,last);
 for(const phase of ['start','move','main']){assert.equal(s.phase,phase);s=go(s,'next');}
 assert.equal(s.phase,'attack');
 return {s,attacker};
}
function hit(s,uid){
 s=dispatchUniversalAction(pack,s,{type:'attack',uid});
 assert.equal(s.pending?.kind,'block');
 assert.equal(universalActor(s),1);
 s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:null},{actor:1});
 return s;
}

test('universal v2 validates strict card contracts, 50-card decks, colors and unsupported effects',()=>{
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.throws(()=>createUniversalPack({id:'x',cards:[{...base[0],effectText:'A special unexplained ability'}]}),/claims vanilla/);
 assert.throws(()=>createUniversalPack({id:'x',cards:[{...base[0],trigger:'color'}]}),/COLOR requires/);
 assert.throws(()=>createUniversalPack({id:'x',cards:[{...base[0],implementation:'dsl',effects:{onPlay:[{op:'teleport'}]}}]}),/unsupported/);
 assert.throws(()=>createUniversalPack({id:'x',cards:[base[0],base[0]]}),/Duplicate/);
 assert.match(validateUniversalDeck(pack,{...deck,P14:1}).join(),/Unregistered/);
 assert.match(validateUniversalDeck(pack,{...deck,P01:7}).join(),/0–4 copies/);
 const other=createUniversalPack({id:'another-work',cards:base});
 assert.throws(()=>newUniversalMatch(other,{decks:[deck,{...deck,P00:5}]}),/Player 1/);
 assert.deepEqual(Object.keys(other.cards),Object.keys(pack.cards),'new title needs only another pack, not new engine');
});

test('seeded 50-card physical zones deterministic with 7-card hand/life and no UID duplication',()=>{
 const s=fresh();
 assert.deepEqual(s,fresh());
 assert.notDeepEqual(s,fresh(28));
 assert.equal(s.turn,1);assert.equal(s.phase,'start');assert.equal(s.players[0].hand.length,7);
 assert.equal(s.players[1].life.length,7);assert.equal(s.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(assertUniversalMatch(pack,s),true);
 const clone=structuredClone(s);clone.players[1].hand.push({...clone.players[1].hand[0]});
 assert.throws(()=>assertUniversalMatch(pack,clone),/duplicated UID|conservation/i);
 assert.throws(()=>assertUniversalMatch(createUniversalPack({id:'different',cards:base}),s),/Incorrect pack/);
});

test('common AP, energy, placement, turn phases and physical deck-only draw are real transitions',()=>{
 let s=fresh(),pl=s.players[0];
 const producer=take(s,0,'P00');pl.energy[0]=producer;
 const char=toHand(s,0,'P02');
 assert.equal(universalEnergy(pack,s,0),4);
 const original=structuredClone(s);
 s=go(s,'next');assert.equal(s.phase,'move');
 s=go(s,'next');assert.equal(s.phase,'main');
 let before=s.players[0].deck.length;
 const play=action(pack,s,a=>a.type==='play'&&a.uid===char.uid&&a.line==='front'&&a.slot===0);
 let next=dispatchUniversalAction(pack,s,play);
 assert.equal(next.players[0].front[0].uid,char.uid);
 assert.equal(next.players[0].front[0].ready,false,'ordinary play is REST');
 assert.equal(next.players[0].deck.length,before-1,'onPlay draw uses physical deck');
 assert.equal(next.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(assertUniversalMatch(pack,next),true);
 assert.equal(original.players[0].front[0],null,'source state was not mutated');
 next=go(next,'next');assert.equal(next.phase,'attack');
 next=go(next,'next');assert.equal(next.active,1);assert.equal(next.phase,'start');
 assert.equal(next.players[1].apCards.filter(c=>c.ready).length,2);
 assert.equal(next.players[1].hand.length,8,'second player draws at start');
});

test('normal play of a Raid card NEVER fires Raid-only effect; real Raid stacks the physical base',()=>{
 const fixture=()=>{let s=fresh(47);const player=s.players[0];
  const baseCard=take(s,0,'P00');const producer=take(s,0,'P00');
  player.front[0]=baseCard;player.energy[0]=producer;
  const raid=toHand(s,0,'P01');
  s=go(s,'next');s=go(s,'next');
  return {s,raid,baseCard};
 };
 const normal=fixture();
 const before=normal.s.players[0].deck.length;
 const n=dispatchUniversalAction(pack,normal.s,action(pack,normal.s,a=>a.type==='play'&&a.uid===normal.raid.uid&&a.line==='energy'&&a.slot===1));
 assert.equal(n.players[0].deck.length,before);
 assert.equal(n.players[0].energy[1].stack.length,0);
 assert.equal(n.players[0].energy[1].ready,false);
 const raid=fixture(),b=raid.s.players[0].deck.length;
 const legal=action(pack,raid.s,a=>a.type==='raid'&&a.uid===raid.raid.uid&&a.baseUid===raid.baseCard.uid&&a.slot===0);
 const r=dispatchUniversalAction(pack,raid.s,legal);
 assert.equal(r.players[0].front[0].uid,raid.raid.uid);
 assert.equal(r.players[0].front[0].stack[0].uid,raid.baseCard.uid);
 assert.equal(r.players[0].front[0].ready,true);
 assert.equal(r.players[0].deck.length,b-1,'Raid-only entry effect draws exactly once');
 assert.equal(assertUniversalMatch(pack,r),true);
});

test('a true Raid executes printed on-entry AND Raid-only ability; normal play cannot enable Raid box',()=>{
 const composed=createUniversalPack({id:'raid-on-entry-composition',cards:base.map(c=>c.id==='P01'
  ?{...c,effects:{onPlay:[{op:'draw',count:1}],onRaid:[{op:'draw',count:1}]}}:c)});
 const setup=()=>{
  let s=newUniversalMatch(composed,{decks:[deck,deck],seed:57,first:0});
  const baseCard=take(s,0,'P00'),gen=take(s,0,'P00'),top=toHand(s,0,'P01');
  s.players[0].front[0]=baseCard;s.players[0].energy[0]=gen;
  s=dispatchUniversalAction(composed,s,{type:'next'});
  s=dispatchUniversalAction(composed,s,{type:'next'});
  return {s,baseCard,top};
 };
 const ordinary=setup(),initialOrdinaryDeck=ordinary.s.players[0].deck.length;
 const normalAction=legalUniversalActions(composed,ordinary.s).find(a=>
  a.type==='play'&&a.uid===ordinary.top.uid&&a.line==='energy'&&a.slot===1);
 assert.ok(normalAction);
 const regular=dispatchUniversalAction(composed,ordinary.s,normalAction);
 assert.equal(regular.players[0].deck.length,initialOrdinaryDeck-1);
 assert.equal(regular.players[0].energy[1].stack.length,0);
 const realRaid=setup(),initialRaidDeck=realRaid.s.players[0].deck.length;
 const raidAction=legalUniversalActions(composed,realRaid.s).find(a=>
  a.type==='raid'&&a.uid===realRaid.top.uid&&a.baseUid===realRaid.baseCard.uid&&a.slot===0);
 assert.ok(raidAction);
 const raided=dispatchUniversalAction(composed,realRaid.s,raidAction);
 assert.equal(raided.players[0].deck.length,initialRaidDeck-2);
 assert.equal(raided.players[0].front[0].stack[0].uid,realRaid.baseCard.uid);
 assert.equal(assertUniversalMatch(composed,raided),true);
});

test('events draw, go outside, pay AP and preserve cards; movement never teleports illegal cards',()=>{
 let s=fresh(53),pl=s.players[0];
 pl.energy[0]=take(s,0,'P00');
 const event=toHand(s,0,'P03');
 s=go(s,'next');s=go(s,'next');
 const b=s.players[0].deck.length;
 s=dispatchUniversalAction(pack,s,action(pack,s,a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.players[0].deck.length,b-1);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'play',uid:event.uid,line:'front',slot:0}),/not currently legal/);
});

test('one movement/STEP per move phase; only legal front characters attack',()=>{
 let s=fresh(16),pl=s.players[0];
 const step=take(s,0,'P07');pl.energy[0]=step;
 s=go(s,'next');
 const a=action(pack,s,x=>x.type==='move'&&x.uid===step.uid&&x.slot===1);
 s=dispatchUniversalAction(pack,s,a);
 assert.equal(s.players[0].front[1].uid,step.uid);
 assert.ok(!legalUniversalActions(pack,s).some(x=>x.type==='move'||x.type==='step'));
 s=go(s,'next');
 assert.equal(s.phase,'main');
 s=go(s,'next');
 assert.equal(s.phase,'attack');
 assert.equal(legalUniversalActions(pack,s).filter(x=>x.type==='attack').length,0,'REST until own next turn');
});

test('unblocked life GET is optional (official Q99): activating physically moves only the revealed card',()=>{
 const {s,attacker}=preparedAttack('P08','P05');
 const z=hit(s,attacker.uid);
 assert.equal(z.pending?.kind,'life-trigger');
 assert.equal(z.pending.trigger,'get');
 assert.deepEqual(legalUniversalActions(pack,z).map(a=>a.mode),['skip','get']);
 const u=z.pending.uid;
 const skipped=dispatchUniversalAction(pack,z,{type:'chooseTrigger',mode:'skip'},{actor:1});
 const taken=dispatchUniversalAction(pack,z,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(skipped.players[1].outside.some(c=>c.uid===u));
 assert.ok(taken.players[1].hand.some(c=>c.uid===u));
 assert.equal(assertUniversalMatch(pack,taken),true);
 assert.equal(z.players[1].hand.some(c=>c.uid===u),false,'Q99 choice must not mutate source');
});

test('Q99 DRAW is optional; required last-life FINAL resolves before victory or loss',()=>{
 const start=preparedAttack('P08','P04');
 const draw=hit(start.s,start.attacker.uid);
 assert.equal(draw.pending.trigger,'draw');
 const previous=draw.players[1].hand.length;
 const yes=dispatchUniversalAction(pack,draw,{type:'chooseTrigger',mode:'draw'},{actor:1});
 const no=dispatchUniversalAction(pack,draw,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(yes.players[1].hand.length,previous+1);
 assert.equal(no.players[1].hand.length,previous);
 const finalCase=preparedAttack('P08','P06',true);
 const last=hit(finalCase.s,finalCase.attacker.uid);
 assert.equal(last.pending.trigger,'final');assert.equal(last.status,'playing');
 assert.equal(last.players[1].life.length,0);
 const restored=dispatchUniversalAction(pack,last,{type:'chooseTrigger',mode:'final'},{actor:1});
 assert.equal(restored.players[1].life.length,1);assert.equal(restored.status,'playing');
 const decline=dispatchUniversalAction(pack,last,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(decline.status,'finished');assert.equal(decline.winner,0);
 assert.equal(assertUniversalMatch(pack,restored),true);
 assert.equal(assertUniversalMatch(pack,decline),true);
});

test('blocker selection cannot bypass ready/front restriction; attack buff DSL runs only on attack',()=>{
 let b=preparedAttack('P09','P05');
 const blocker=take(b.s,1,'P08');b.s.players[1].front[0]=blocker;blocker.ready=true;
 const hitStart=dispatchUniversalAction(pack,b.s,{type:'attack',uid:b.attacker.uid});
 assert.equal(hitStart.players[0].front[0].buffs[0].bp,1000);
 assert.equal(hitStart.pending.kind,'block');
 assert.ok(legalUniversalActions(pack,hitStart).some(a=>a.uid===blocker.uid));
 const blocked=dispatchUniversalAction(pack,hitStart,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(blocked.players[1].life.length,7,'blocked attack should not damage life');
 assert.ok(blocked.players[1].outside.some(c=>c.uid===blocker.uid),'weaker blocker retires');
 assert.equal(assertUniversalMatch(pack,blocked),true);
});

test('public view never exposes opponent deck or hand identities or unrevealed life card numbers',()=>{
 const s=fresh(99);
 const view=universalPublicView(pack,s,0);
 assert.equal(view.players[1].hand,null);
 assert.equal(view.players[1].handCount,7);
 assert.ok(!JSON.stringify(view).includes(s.players[1].hand[0].uid));
 assert.ok(!JSON.stringify(view).includes(s.players[1].life[0].uid));
 assert.deepEqual(view.publicReveals,[]);
 assert.throws(()=>universalPublicView(pack,s,2),/Invalid viewer/);
});

test('migration audit inventories existing five titles WITHOUT marking Beta or legacy auto as v2-ready',()=>{
 for(const [title,cards] of [['gurren-lagann',TTG_CARDS],['solo-leveling',SOLO_LEVELING_CARDS],
  ['sword-art-online',SAO_CARDS],['mushoku-tensei',MST_CARDS]]){
  const audit=auditUniversalPort(title,cards);
  assert.equal(audit.total,cards.length);
  assert.equal(audit.v2Ready,0,'legacy auto does not imply v2 ability coverage');
  assert.equal(audit.records.length,cards.length);
  assert.ok(audit.records.every(c=>c.requiresEffectPort));
 }
});
