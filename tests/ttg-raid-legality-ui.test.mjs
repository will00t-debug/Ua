import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,assertTtgCoreState,dispatchTtgCoreAction,
 legalTtgRaidChoices,isTtgRaidAction,TTG_RAID_ACTION_TYPES,TTG_PRINTED_RAID_IDS}
 from '../dist/ttg-core-match.mjs';
import {TTG_RED_BETA_PRESET,TTG_GREEN_BETA_PRESET,ttgRaidDecisions,ttgActionLabel} from '../dist/ttg-browser.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';

const counts=()=>{
 const d={...TTG_RED_BETA_PRESET};
 delete d['TTG-1-075'];delete d['TTG-1-077'];
 d['TTG-1-070']=4;d['TTG-1-071']=4;
 return d;
};
function game(){
 let s=newTtgCoreMatch({decks:[counts(),counts()],seed:802,first:0});
 const p=s.players[0];
 const take=(id)=>{
  for(const zone of ['deck','hand','life']){
   const idx=p[zone].findIndex(c=>c.cardId==='TTG-1-'+id);
   if(idx>=0)return p[zone].splice(idx,1)[0];
  }
  throw new Error('No card in fixture '+id);
 };
 // Preserve 50 real physical cards by returning a card from each active
 // zone into the deck before taking a new desired physical instance.
 const moveTo=(id,slot)=>{
  const existing=p.energy[slot];if(existing)p.deck.push(existing);
  p.energy[slot]=take(id);
 };
 moveTo('047',0);moveTo('042',1);moveTo('043',2);moveTo('046',3);
 const raid=take('071');
 p.hand.push(raid);p.apCards.forEach((ap,i)=>ap.ready=i<2);
 s.turn=6;s.phase='main';s.active=0;s.status='playing';s.pending=null;
 s=withTtgDerivedEnergy(s,0);
 assert.ok(s.players[0].energyProduced.red>=4);
 assertTtgCoreState(s);
 return {s,raid};
}

test('TTG core exposes all currently wired printed Raid kinds, never ordinary play',()=>{
 assert.equal(TTG_PRINTED_RAID_IDS.length,12);
 assert.equal(TTG_RAID_ACTION_TYPES.length,8);
 for(const type of TTG_RAID_ACTION_TYPES)assert.equal(isTtgRaidAction({type}),true);
 assert.equal(isTtgRaidAction({type:'play'}),false);
 assert.equal(isTtgRaidAction({type:'ttgLifeChoice',mode:'raid'}),false);
});

test('071 legal Raid decisions come from core and include actual physical AP choices',()=>{
 const {s,raid}=game(),before=JSON.stringify(s);
 const templates=legalTtgRaidChoices(s,raid.uid);
 assert.ok(templates.some(a=>a.type==='raidTtg'&&a.baseUid&&a.line==='front'));
 const options=ttgRaidDecisions(s,raid.uid);
 assert.ok(options.length>0);
 assert.ok(options.every(a=>a.handUid===raid.uid&&a.type==='raidTtg'&&a.payApUids.length===a.requiredAp));
 assert.ok(options.every(a=>/^突襲/.test(ttgActionLabel(s,a))&&ttgActionLabel(s,a).includes('底板')));
 const choice=options.find(a=>a.line==='front');
 assert.ok(choice);
 assert.equal(JSON.stringify(s),before,'legal enumeration never spends AP');
 const next=dispatchTtgCoreAction(s,choice);
 assert.ok(next.players[0].front[choice.slot]?.stack?.some(c=>c.uid===choice.baseUid));
 assert.equal(next.players[0].front[choice.slot].uid,raid.uid);
 assert.equal(next.players[0].front[choice.slot].ready,true);
 assert.equal(next.players[0].apCards.filter(x=>x.ready).length,1);
 assertTtgCoreState(next);
});

test('a Raid card cannot skip required base and no bogus Raid action is displayed',()=>{
 const {s,raid}=game();
 const p=s.players[0],base=p.energy[0];
 p.deck.push(base);p.energy[0]=p.deck.find(c=>c.cardId==='TTG-1-042');
 // Restore physical conservation when replacing the energy slot.
 const i=p.deck.findIndex(c=>c.uid===p.energy[0].uid);p.deck.splice(i,1);
 const fixed=withTtgDerivedEnergy(s,0);
 assertTtgCoreState(fixed);
 assert.deepEqual(legalTtgRaidChoices(fixed,raid.uid),[]);
 assert.deepEqual(ttgRaidDecisions(fixed,raid.uid),[]);
});

test('TTG match UI offers executable Raid button and resolves a paid Raid through the core',async()=>{
 const {s,raid}=game(),opts=ttgRaidDecisions(s,raid.uid),choice=opts.find(a=>a.line==='front');
 assert.ok(choice);
 const storage=new Map([['ua-ttg-beta-game-v1',JSON.stringify(s)]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const saved={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null,onkeydown:null};
 globalThis.window={scrollTo(){}};
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
 try{
  await import('../dist/app.mjs?ttg-raid-ui-core-test');
  const press=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  press({view:'ttgArena'});
  press({ttgSelect:raid.uid});
  assert.match(app.innerHTML,/天元突破合法突襲選項/);
  assert.match(app.innerHTML,/突襲 Raid/);
  assert.match(app.innerHTML,/Raid 底板|底板/);
  assert.match(app.innerHTML,/data-ttg-act=/);
  assert.match(app.innerHTML,/亮起的空格只會普通登場/);
  press({ttgAct:encodeURIComponent(JSON.stringify(choice))});
  const next=JSON.parse(storage.get('ua-ttg-beta-game-v1'));
  assert.equal(next.players[0].front[choice.slot]?.uid,raid.uid);
  assert.equal(next.players[0].front[choice.slot]?.stack?.[0]?.uid,choice.baseUid);
  assertTtgCoreState(next);
 }finally{
  globalThis.document=saved.document;globalThis.window=saved.window;
  globalThis.localStorage=saved.localStorage;globalThis.setTimeout=saved.setTimeout;
  globalThis.clearTimeout=saved.clearTimeout;
 }
});

test('green 028 Raid receives the same executable UI choices, AP and drawn-entry sequence',()=>{
 const deck={...TTG_GREEN_BETA_PRESET};
 delete deck['TTG-1-019'];deck['TTG-1-028']=4;
 let s=newTtgCoreMatch({decks:[deck,deck],seed:2828,first:0});
 const p=s.players[0];
 const take=id=>{
  for(const zone of ['deck','hand','life']){
   const idx=p[zone].findIndex(c=>c.cardId==='TTG-1-'+id);
   if(idx>=0)return p[zone].splice(idx,1)[0];
  }
  throw new Error('Missing green '+id);
 };
 p.front[0]=take('009');
 p.energy[0]=take('017');p.energy[1]=take('017');
 const top=take('028');p.hand.push(top);
 p.apCards.forEach((c,i)=>c.ready=i<2);
 s.turn=7;s.phase='main';s.pending=null;
 s=withTtgDerivedEnergy(s,0);
 assert.ok(s.players[0].energyProduced.green>=4);
 assertTtgCoreState(s);
 const choices=ttgRaidDecisions(s,top.uid);
 assert.ok(choices.length>0);
 assert.ok(choices.every(c=>c.type==='ttgGreen028Raid'));
 const target=choices.find(c=>c.line==='front'&&c.slot===0);
 assert.ok(target);
 assert.match(ttgActionLabel(s,target),/^突襲/);
 assert.match(ttgActionLabel(s,target),/底板/);
 const next=dispatchTtgCoreAction(s,target);
 assert.equal(next.players[0].front[0]?.uid,top.uid);
 assert.equal(next.players[0].front[0]?.stack[0]?.uid,target.baseUid);
 assert.equal(next.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(next.pending?.kind,'ttgGreen028Entry','on-Raid draw/choice must not be skipped');
 assertTtgCoreState(next);
});
