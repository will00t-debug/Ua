import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET,ttg023SearchChoice,ttgExecutableActions,ttgActionLabel} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';

// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-021
// 021 FAQ Q2269 full-line removal, Q2270 once per Yoko name, Q2271 private facedown.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-022
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-023
const deck={...TTG_GREEN_BETA_PRESET,'TTG-1-003':0,'TTG-1-035':0,'TTG-1-015':0,
 'TTG-1-021':4,'TTG-1-022':2,'TTG-1-023':2,'TTG-1-029':2};
function game(seed=2123){
 const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(p,id){
 for(const z of ['hand','deck','life','outside']){
  const i=p[z].findIndex(c=>c.cardId===id);
  if(i>=0)return p[z].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function stage(s,id,line='energy',slot=0,p=0){
 const c=take(s.players[p],id);
 c.ready=true;s.players[p][line][slot]=c;return c;
}
function gurren(s,slot=0){
 const c=stage(s,'TTG-1-029','front',slot);
 c.stack=[take(s.players[0],'TTG-1-009')];
 c.under=[{...take(s.players[0],'TTG-1-005'),faceDown:true}];
 return c;
}
function pending023(seed=2301){
 let s=game(seed),p=s.players[0];
 const source=stage(s,'TTG-1-023','energy',0),gun=take(p,'TTG-1-029'),notGun=take(p,'TTG-1-005');
 p.deck.unshift(notGun,gun); // First viewed card is non-Gunmen; second is eligible.
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:source.uid};
 s=withTtgDerivedEnergy(s,0);
 return {s,source,gun,notGun};
}
const action=(s,fn)=>{const a=legalTtgCoreActions(s).find(fn);assert.ok(a,'expected legal action');return a;};
test('021 official Q2270: exactly one optional attack-start move among two printed Yoko copies, no extra AP',()=>{
 let s=game(2101),p=s.players[0];
 const g=gurren(s),first=stage(s,'TTG-1-021','energy',0),second=stage(s,'TTG-1-021','energy',1);
 s=withTtgDerivedEnergy(s,0);
 const apBefore=p.apCards.map(a=>a.ready);
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.pending?.kind,'ttgGreen021PhaseStart');
 const offered=ttgExecutableActions(s).filter(a=>a.type==='green021PhaseStart');
 assert.ok(offered.some(a=>a.uid===first.uid&&a.mode==='move'));
 assert.ok(offered.some(a=>a.uid===second.uid&&a.mode==='move'));
 assert.ok(offered.some(a=>a.mode==='decline'));
 const moving=offered.find(a=>a.uid===second.uid&&a.mode==='move'&&a.slot===2);
 assert.ok(moving);
 s=dispatchTtgCoreAction(s,moving);
 assert.equal(s.players[0].front[2].uid,second.uid);
 assert.equal(s.players[0].energy[0].uid,first.uid);
 assert.equal(s.players[0].front[2].currentBp,TTG_BY_ID['TTG-1-021'].bp+1000);
 assert.equal(s.players[0].green021UsedAtTurn,s.turn);
 assert.deepEqual(s.players[0].apCards.map(a=>a.ready),apBefore);
 assert.equal(s.players[0].front[0].uid,g.uid);
 assert.ok(assertTtgCoreState(s));
});
test('021 Q2269: full FRONT forces explicit choice of removed character, never silently sends to outside',()=>{
 let s=game(2102),p=s.players[0],yoko=stage(s,'TTG-1-021','energy');
 gurren(s,0);
 const a=stage(s,'TTG-1-005','front',1),b=stage(s,'TTG-1-006','front',2),c=stage(s,'TTG-1-009','front',3);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,{type:'next'});
 const choices=ttgExecutableActions(s).filter(x=>x.type==='green021PhaseStart'&&x.mode==='move');
 assert.equal(choices.length,4);
 assert.ok(!choices.some(x=>x.replaceUid===null));
 assert.equal(choices.every(x=>/green021PhaseStart/.test(x.type)),true);
 const before=s.players[0].outside.length;
 const picked=choices.find(x=>x.uid===yoko.uid&&x.replaceUid===b.uid);
 assert.ok(picked);
 assert.match(ttgActionLabel(s,picked),/先將.*移除區/);
 assert.match(ttgActionLabel(s,choices[0]),/前線/);
 s=dispatchTtgCoreAction(s,picked);
 assert.equal(s.players[0].front[2].uid,yoko.uid);
 assert.ok(s.players[0].removed.some(x=>x.uid===b.uid));
 assert.equal(s.players[0].outside.length,before);
 assert.equal(s.players[0].front[1].uid,a.uid);
 assert.equal(s.players[0].front[3].uid,c.uid);
 assert.ok(assertTtgCoreState(s));
});
test('021 cannot activate when Gurren lacks a facedown under-card and will not expose it',()=>{
 let s=game(2103);
 const g=gurren(s);
 g.under[0].faceDown=false;
 stage(s,'TTG-1-021','energy',0);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.pending,null);
 assert.ok(!JSON.stringify(s.log).includes(g.under[0].uid),'private underlying UID stays private');
 assert.ok(assertTtgCoreState(s));
});
test('022 official: REST +1 energy, Main-end returns SAME Yomako physical card to hand, not sideline',()=>{
 let s=game(2201),pl=s.players[0],source=stage(s,'TTG-1-022','energy');
 assert.equal(TTG_BY_ID[source.cardId].trigger,'draw');
 assert.equal(TTG_BY_ID[source.cardId].nameJa,'ヨマコ先生');
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,1);
 const used=action(s,a=>a.type==='ttgGreen022'&&a.uid===source.uid);
 s=dispatchTtgCoreAction(s,used);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(calculateTtgEnergyByColor(s,0).green,2);
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='ttgGreen022'&&a.uid===source.uid),false);
 const outside=s.players[0].outside.length;
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].outside.length,outside);
 assert.equal(calculateTtgEnergyByColor(s,0).green,0);
 assert.ok(assertTtgCoreState(s));
});
test('023 official: human can choose a real Gunmen, discard the newly picked card, and freely reorder remaining five',()=>{
 const {s,source,gun,notGun}=pending023();
 const offered=ttgExecutableActions(s).filter(a=>a.type==='resolveGreenEntry'&&a.mode==='search');
 assert.ok(offered.some(a=>a.takeUid===gun.uid));
 assert.ok(!offered.some(a=>a.takeUid===notGun.uid));
 const remaining=s.players[0].deck.slice(0,5).map(c=>c.uid).filter(uid=>uid!==gun.uid);
 const order=[...remaining].reverse();
 assert.throws(()=>ttg023SearchChoice(s,{takeUid:notGun.uid,discardUid:null,bottomOrderUids:order}),/ガンメン/);
 assert.throws(()=>ttg023SearchChoice(s,{takeUid:gun.uid,discardUid:null,bottomOrderUids:order}),/手牌/);
 assert.throws(()=>ttg023SearchChoice(s,{takeUid:gun.uid,discardUid:gun.uid,bottomOrderUids:remaining.concat('wrong')}),/順序/);
 const exact=ttg023SearchChoice(s,{takeUid:gun.uid,discardUid:gun.uid,bottomOrderUids:order});
 const next=dispatchTtgCoreAction(s,exact);
 assert.equal(next.pending,null);
 assert.ok(next.players[0].outside.some(c=>c.uid===gun.uid));
 assert.ok(!next.players[0].hand.some(c=>c.uid===gun.uid));
 assert.deepEqual(next.players[0].deck.slice(-4).map(c=>c.uid),order);
 const reveals=next.log.filter(x=>x.type==='ttgPublicSearchReveal');
 assert.equal(reveals.length,1);
 assert.equal(reveals[0].cardId,'TTG-1-029');
 assert.equal(reveals[0].uid,gun.uid);
 assert.ok(!next.log.some(record=>Object.entries(record).some(([key,value])=>key!=='turn'&&value===notGun.uid)),
  'private looked-at physical UID must never be explicitly revealed');
 assert.ok(assertTtgCoreState(next));
});
test('023 official skip-pick keeps all five deck cards in chosen bottom order, reveals nothing',()=>{
 const {s,gun}=pending023(2302),rest=s.players[0].deck.slice(0,5).map(c=>c.uid);
 const order=[...rest].reverse(),hand=s.players[0].hand.map(c=>c.uid);
 const skip=ttg023SearchChoice(s,{takeUid:null,discardUid:null,bottomOrderUids:order});
 const next=dispatchTtgCoreAction(s,skip);
 assert.deepEqual(next.players[0].deck.slice(-5).map(c=>c.uid),order);
 assert.deepEqual(next.players[0].hand.map(c=>c.uid),hand);
 assert.ok(!next.log.some(x=>x.type==='ttgPublicSearchReveal'));
 assert.ok(!next.log.some(record=>Object.entries(record).some(([key,value])=>key!=='turn'&&value===gun.uid)));
 assert.ok(assertTtgCoreState(next));
});
test('023 real mobile clicks: private pick, hand discard, arrow reordering, submit through app state',async()=>{
 const {s,gun}=pending023(2303),cards=s.players[0].deck.slice(0,5).map(c=>c.uid);
 const remain=cards.filter(uid=>uid!==gun.uid);
 const storage=new Map([['ua-ttg-beta-game-v1',JSON.stringify(s)]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const document={querySelector(sel){return sel==='#app'?app:sel==='#toast'?toast:null;},onkeydown:null};
 const window={scrollTo(){},open(){throw Error('unexpected navigation')}};
 globalThis.document=document;globalThis.window=window;
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const click=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?ttg023-official-mobile-choice');
  click({view:'ttgArena'});
  assert.match(app.innerHTML,/利龍 023 · 私人查看牌庫頂/);
  click({ttg023Take:gun.uid});
  click({ttg023Discard:gun.uid});
  click({ttg023Down:remain[0]});
  click({action:'ttg023SearchSubmit'});
  const next=JSON.parse(storage.get('ua-ttg-beta-game-v1'));
  assert.equal(next.pending,null);
  const order=[...remain];[order[0],order[1]]=[order[1],order[0]];
  assert.deepEqual(next.players[0].deck.slice(-4).map(c=>c.uid),order);
  assert.equal(next.log.filter(x=>x.type==='ttgPublicSearchReveal').length,1);
  assert.ok(assertTtgCoreState(next));
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
});
