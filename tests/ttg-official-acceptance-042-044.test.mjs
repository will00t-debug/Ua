import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {ttg044SearchChoice,ttgExecutableActions} from '../dist/ttg-browser.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {ttgRedStarterBpBonus,ttgRedStarterImpactNull} from '../dist/ttg-red-first-three.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Japanese official:
// 042 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-042
// 043 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-043
// 044 official English https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-044
// Japanese Q2285 timing (after block choice, before life damage).
const counts=Object.fromEntries([
 ...['042','043','044','047','048','064','065','066','005','006','019','002'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-064',0],['TTG-1-072',2],['TTG-1-051',1],['TTG-1-027',1],
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const match=seed=>{const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;};
function take(pl,id){
 for(const area of ['hand','deck','life','outside']){
  const i=pl[area].findIndex(x=>x.cardId===id);if(i>=0)return pl[area].splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function stage(s,id,line='front',slot=0,p=0){
 const c=take(s.players[p],id);c.ready=true;s.players[p][line][slot]=c;return c;
}
const legal=(s,fn)=>{const a=legalTtgCoreActions(s).find(fn);assert.ok(a,'No legal official choice');return a;};
function unblocked044(seed=4401){
 let s=match(seed),p=s.players[0];
 const kamina=stage(s,'TTG-1-044');
 const gurren=take(p,'TTG-1-072'),non=take(p,'TTG-1-043');
 p.deck.unshift(non,gurren);
 const handCard=take(p,'TTG-1-042');p.hand.push(handCard);
 s.phase='attack';s=withTtgDerivedEnergy(s,0);
 const beforeLife=s.players[1].life.length;
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='attack'&&a.uid===kamina.uid));
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:null});
 assert.equal(s.pending?.kind,'ttgRed044Search');
 assert.equal(s.players[1].life.length,beforeLife,'Q2285 before damage');
 return {s,kamina,gurren,non,handCard,beforeLife};
}
test('042 zero RED energy card physically plays with one AP and creates one RED generator',()=>{
 let s=match(4201),p=s.players[0],kamina=take(p,'TTG-1-042');p.hand.push(kamina);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(TTG_BY_ID[kamina.cardId].energy,0);
 assert.equal(TTG_BY_ID[kamina.cardId].trigger,'active');
 const action=legal(s,a=>a.type==='play'&&a.handUid===kamina.uid&&a.line==='energy'&&a.slot===0);
 const before=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchTtgCoreAction(s,action);
 assert.equal(s.players[0].energy[0].uid,kamina.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.equal(calculateTtgEnergyByColor(s,0).red,1);
 assert.ok(assertTtgCoreState(s));
});
test('043 loses IMPACT in a real block against 027 and protects LIFE from IMPACT 1',()=>{
 let s=match(4301),defender=stage(s,'TTG-1-043','front',0,1);
 const attacker=stage(s,'TTG-1-027','front',0,0);
 s.phase='attack';s=withTtgDerivedEnergy(s,0);
 assert.equal(ttgRedStarterImpactNull(defender),true);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='attack'&&a.uid===attacker.uid));
 assert.equal(s.pending?.kind,'greenHighAttackWindow');
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='greenHighAttack'&&a.spendUids?.length===0));
 const life=s.players[1].life.length;
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:defender.uid});
 assert.equal(s.players[1].life.length,life,'IMPAct canceled instead of dealing a life hit');
 assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
 assert.ok(assertTtgCoreState(s));
});
test('043 printed DRAW life is optional Q99, transfers only one actual deck card if accepted',()=>{
 let s=match(4302),p=s.players[0],draw=take(p,'TTG-1-043');
 const old=p.life.shift();p.deck.push(old);p.life.unshift(draw);
 s=withTtgDerivedEnergy(s,0);
 const revealed=beginTtgLifeTrigger(s,{player:0,lifeUid:draw.uid}),top=revealed.players[0].deck[0].uid;
 assert.deepEqual(legalTtgCoreActions(revealed).map(x=>x.mode),['draw','decline']);
 const yes=dispatchTtgCoreAction(revealed,legal(revealed,x=>x.mode==='draw'));
 assert.equal(yes.players[0].hand.at(-1).uid,top);
 const no=dispatchTtgCoreAction(revealed,legal(revealed,x=>x.mode==='decline'));
 assert.ok(no.players[0].deck.some(c=>c.uid===top));
 assert.ok(assertTtgCoreState(yes));assert.ok(assertTtgCoreState(no));
});
test('044 Q2285 when unblocked: SKIP never looks at, reorders or reveals deck before damage',()=>{
 const {s,beforeLife,non}=unblocked044(4401),original=s.players[0].deck.map(c=>c.uid);
 const skip=dispatchTtgCoreAction(s,ttg044SearchChoice(s,{mode:'skip'}));
 assert.deepEqual(skip.players[0].deck.map(c=>c.uid),original);
 assert.equal(skip.players[1].life.length,beforeLife-1);
 assert.ok(!skip.log.some(x=>x.type==='ttgPublicSearchReveal'));
 assert.ok(!skip.log.some(x=>Object.values(x).includes(non.uid)));
 assert.ok(assertTtgCoreState(skip));
});
test('044 Q2285: user selects actual Gurren, discards NEW picked card, arbitrary private bottom order then life damage',()=>{
 const {s,beforeLife,gurren,non}=unblocked044(4402);
 const order=s.players[0].deck.slice(0,7).filter(c=>c.uid!==gurren.uid).map(c=>c.uid).reverse();
 assert.throws(()=>ttg044SearchChoice(s,{mode:'search',takeUid:non.uid,discardUid:non.uid,bottomOrderUids:order}),/グレン/);
 assert.throws(()=>ttg044SearchChoice(s,{mode:'search',takeUid:gurren.uid,discardUid:null,bottomOrderUids:order}),/手牌/);
 const choice=ttg044SearchChoice(s,{mode:'search',takeUid:gurren.uid,discardUid:gurren.uid,bottomOrderUids:order});
 const next=dispatchTtgCoreAction(s,choice);
 assert.deepEqual(next.players[0].deck.slice(-order.length).map(c=>c.uid),order);
 assert.ok(next.players[0].outside.some(c=>c.uid===gurren.uid));
 assert.equal(next.players[1].life.length,beforeLife-1);
 const reveal=next.log.filter(x=>x.type==='ttgPublicSearchReveal');
 assert.equal(reveal.length,1);
 assert.equal(reveal[0].cardId,'TTG-1-072');
 assert.ok(!next.log.some(x=>Object.values(x).includes(non.uid)));
 assert.ok(assertTtgCoreState(next));
});
test('044 +500BP is live only on own turn when own Simon is on field or Raid base',()=>{
 let s=match(4403),kamina=stage(s,'TTG-1-044'),simon=stage(s,'TTG-1-051','energy',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(ttgRedStarterBpBonus(s,0,s.players[0].front[0]),500);
 const owner=s.players[0];owner.energy[0]=null;owner.outside.push(simon);
 assert.equal(ttgRedStarterBpBonus(s,0,owner.front[0]),0);
 const top=stage(s,'TTG-1-027','front',1),base=take(owner,'TTG-1-042'); // Kamina is not Simon.
 top.stack=[base];
 assert.equal(ttgRedStarterBpBonus(s,0,owner.front[0]),0);
 owner.front[1].stack=[simon];owner.outside.splice(owner.outside.findIndex(c=>c.uid===simon.uid),1);
 assert.equal(ttgRedStarterBpBonus(s,0,owner.front[0]),500);
 s.active=1;assert.equal(ttgRedStarterBpBonus(s,0,owner.front[0]),0);
 assert.ok(assertTtgCoreState(s));
});
test('044 simulated mobile button clicks require opt-in to private seven cards and preserve chosen arbitrary bottom order',async()=>{
 const {s,gurren}=unblocked044(4404),top=s.players[0].deck.slice(0,7).map(c=>c.uid);
 const storage=new Map([['ua-ttg-beta-game-v1',JSON.stringify(s)]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const document={querySelector:x=>x==='#app'?app:x==='#toast'?toast:null,onkeydown:null},window={scrollTo(){},open(){throw Error('unexpected navigation')}};
 globalThis.document=document;globalThis.window=window;
 globalThis.localStorage={getItem:x=>storage.get(x)||null,setItem:(x,v)=>storage.set(x,v)};
 const click=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?ttg044-Q2285-mobile');
  click({view:'ttgArena'});
  assert.match(app.innerHTML,/卡米那044 · Q2285/);
  assert.ok(!app.innerHTML.includes('data-ttg-044-take'), 'not display private card names before opt in');
  click({ttg044Mode:'search'});
  assert.match(app.innerHTML,/data-ttg-044-take/);
  click({ttg044Take:gurren.uid});
  click({ttg044Discard:gurren.uid});
  const remaining=top.filter(uid=>uid!==gurren.uid);
  click({ttg044Down:remaining[0]});
  click({action:'ttg044SearchSubmit'});
  const saved=JSON.parse(storage.get('ua-ttg-beta-game-v1'));
  const expected=[...remaining];[expected[0],expected[1]]=[expected[1],expected[0]];
  assert.equal(saved.pending?.kind==='ttgRed044Search',false);
  assert.deepEqual(saved.players[0].deck.slice(-expected.length).map(c=>c.uid),expected);
  assert.equal(saved.log.filter(x=>x.type==='ttgPublicSearchReveal').length,1);
  assert.ok(assertTtgCoreState(saved));
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
});
