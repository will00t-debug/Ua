import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const base=Array.from({length:16},(_,i)=>({
 id:'F'+String(i).padStart(2,'0'),name:'Unit '+i,color:'green',type:'character',
 energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla'
}));
base[0]={...base[0],name:'Hero',gen:5};
base[1]={...base[1],name:'Hero Raid',energy:4,raidName:'Hero',trigger:'raid',implementation:'dsl',
 effects:{onPlay:[{op:'draw',count:1}],onRaid:[{op:'draw',count:1}]}};
base[2]={...base[2],name:'Green trigger eligible',energy:2,implementation:'dsl',
 effects:{onPlay:[{op:'draw',count:1}]}};
base[3]={...base[3],name:'SPECIAL event',type:'event',energy:2,bp:0,gen:0,trigger:'special',
 triggerEffect:{op:'retireOppFront'},implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
base[4]={...base[4],name:'COLOR hero',trigger:'color',
 triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}};
base[5]={...base[5],name:'Blue invalid',color:'blue',energy:2};
base[6]={...base[6],name:'Green too expensive',energy:3};
base[7]={...base[7],name:'Raid base with Raid keyword',raidName:'Hero',energy:0};
const packA=createUniversalPack({id:'fictional-a',cards:base});
const packB=createUniversalPack({id:'fictional-b',cards:base.map(c=>({...c,
 name:c.id==='F00'?'Hero':'Other '+c.id}))});
const packs=[packA,packB];
function legalDeck(){
 const d=Object.fromEntries(base.map(x=>[x.id,4]));
 d.F03=2;d.F04=2;d.F15=2;
 return d; // 16*4 - 6 = 58; reduce to 50 below.
}
const deck=legalDeck();
for(const id of ['F08','F09'])deck[id]=0; // 50
function fresh(seed=44){
 assert.deepEqual(validateUniversalDeck(packA,deck),[]);
 assert.deepEqual(validateUniversalDeck(packB,deck),[]);
 return newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing fixture card '+p+'/'+id);
}
function reveal(s,p,id){
 const c=take(s,p,id),old=s.players[p].life.shift();
 s.players[p].deck.push(old);s.players[p].life.unshift(c);
 return c;
}
function nextToAttack(s){
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 return s;
}
function hitWith(s,attacker){
 s=nextToAttack(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 return s;
}
test('new triggers fail closed without an explicit supported profile and retain special deck caps',()=>{
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base[4],triggerEffect:null}]}),/COLOR requires/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base[3],triggerEffect:{op:'destroyAll'}}]}),/SPECIAL requires/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base[1],raidName:null}]}),/RAID trigger requires/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base[2],triggerEffect:{op:'retireOppFront'}}]}),/unexpected trigger/);
 assert.deepEqual(validateUniversalDeck(packA,deck),[]);
 const doubleSpecial=createUniversalPack({id:'two-special-cards',cards:[...base,{...base[12],id:'SPECIAL2',trigger:'special',triggerEffect:{op:'retireOppFront'}}]});
 const tooMany={...deck,F03:4,SPECIAL2:1,F10:2,F15:1};
 assert.match(validateUniversalDeck(doubleSpecial,tooMany).join(' '),/SPECIAL Trigger limit exceeded/);
});
test('SPECIAL life optionally retires opposing-title front character, or can be declined',()=>{
 let s=fresh(),attacker=take(s,0,'F10');attacker.ready=true;
 s.players[0].front[0]=attacker;reveal(s,1,'F03');
 const other=take(s,0,'F11');s.players[0].front[1]=other;
 s=hitWith(s,attacker);
 assert.equal(s.pending?.trigger,'special');
 assert.equal(s.publicReveals.at(-1).title,'fictional-b');
 const choices=legalUniversalActions(packs,s);
 assert.deepEqual(choices.map(a=>a.mode),['skip','special','special']);
 assert.ok(!choices.some(a=>a.uid===s.players[1].hand[0].uid));
 const original=structuredClone(s);
 const ignored=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(ignored.players[0].front[0].uid,attacker.uid);
 const resolved=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:attacker.uid},{actor:1});
 assert.equal(resolved.players[0].front[0],null);
 assert.ok(resolved.players[0].outside.some(c=>c.uid===attacker.uid));
 assert.equal(resolved.players[0].front[1].uid,other.uid);
 assert.equal(assertUniversalMatch(packs,resolved),true);
 assert.deepEqual(s,original);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special',uid:s.players[1].hand[0].uid},{actor:1}),/not currently legal/);
});
test('COLOR only plays printed eligible hand characters in ACTIVE, without AP or Raid',()=>{
 let s=fresh(90),attacker=take(s,0,'F10');attacker.ready=true;
 s.players[0].front[0]=attacker;reveal(s,1,'F04');
 const green=take(s,1,'F02'),blue=take(s,1,'F05'),costly=take(s,1,'F06');
 s.players[1].hand.push(green,blue,costly);
 s=hitWith(s,attacker);
 assert.equal(s.pending.trigger,'color');
 const p=s.players[1],apBefore=p.apCards.filter(x=>x.ready).length;
 const out=legalUniversalActions(packs,s);
 assert.ok(out.some(a=>a.mode==='skip'));
 assert.ok(out.some(a=>a.mode==='color'&&a.uid===green.uid&&a.line==='front'));
 assert.ok(!out.some(a=>a.uid===blue.uid||a.uid===costly.uid));
 const action=out.find(a=>a.mode==='color'&&a.uid===green.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);
 const before=p.deck.length;
 const result=dispatchUniversalAction(packs,s,action,{actor:1});
 assert.equal(result.players[1].front[0].uid,green.uid);
 assert.equal(result.players[1].front[0].ready,true);
 assert.equal(result.players[1].apCards.filter(x=>x.ready).length,apBefore);
 assert.equal(result.players[1].deck.length,before-1,'onPlay effect resolves after free COLOR play');
 assert.ok(result.players[1].hand.some(c=>c.uid===blue.uid));
 assert.equal(assertUniversalMatch(packs,result),true);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.mode,'color');
});
test('RAID life may add revealed card to hand, decline, or Raid own base without AP',()=>{
 let s=fresh(111),attacker=take(s,0,'F10');attacker.ready=true;s.players[0].front[0]=attacker;
 const revealed=reveal(s,1,'F01');
 const generator=take(s,1,'F00'),baseOnFront=take(s,1,'F00');
 s.players[1].energy[0]=generator;s.players[1].front[0]=baseOnFront;baseOnFront.ready=false;
 s=hitWith(s,attacker);
 assert.equal(s.pending?.trigger,'raid');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.mode==='skip'));
 assert.ok(legal.some(a=>a.mode==='get'));
 const raid=legal.find(a=>a.mode==='raid'&&a.baseUid===baseOnFront.uid&&a.line==='front'&&a.slot===0);
 assert.ok(raid);
 assert.ok(!legal.some(a=>a.baseUid===attacker.uid),'enemy card never Raid base');
 const apBefore=s.players[1].apCards.map(a=>a.ready);
 const beforeDeck=s.players[1].deck.length;
 const saved=structuredClone(s);
 const raided=dispatchUniversalAction(packs,s,raid,{actor:1});
 assert.equal(raided.players[1].front[0].uid,revealed.uid);
 assert.equal(raided.players[1].front[0].ready,true,'REST base refreshed by real Raid');
 assert.equal(raided.players[1].front[0].stack[0].uid,baseOnFront.uid);
 assert.equal(raided.players[1].deck.length,beforeDeck-2,'both onPlay and onRaid execute');
 assert.deepEqual(raided.players[1].apCards.map(a=>a.ready),apBefore);
 assert.ok(!raided.players[1].outside.some(c=>c.uid===revealed.uid));
 assert.ok(raided.players[1].outside.some(c=>c.uid===saved.publicReveals.at(-1).uid)===false);
 assert.equal(assertUniversalMatch(packs,raided),true);
 const taken=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(taken.players[1].hand.some(c=>c.uid===revealed.uid));
 assert.equal(taken.players[1].front[0].uid,baseOnFront.uid);
 const skip=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.ok(skip.players[1].outside.some(c=>c.uid===revealed.uid));
 assert.deepEqual(s,saved);
});
test('RAID life cannot ignore color-energy requirements or stack another Raid card',()=>{
 let s=fresh(150),attacker=take(s,0,'F10');attacker.ready=true;s.players[0].front[0]=attacker;
 const shown=reveal(s,1,'F01'),base=take(s,1,'F00');s.players[1].front[0]=base;
 s=hitWith(s,attacker);
 assert.equal(s.pending.trigger,'raid');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.mode),['skip','get']);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'raid',baseUid:base.uid,line:'front',slot:0},{actor:1}),/not currently legal/);
 assert.ok(s.players[1].outside.some(c=>c.uid===shown.uid));
 let t=fresh(160),enemy=take(t,0,'F10');enemy.ready=true;t.players[0].front[0]=enemy;
 reveal(t,1,'F01');t.players[1].energy[0]=take(t,1,'F00');
 const raidBase=take(t,1,'F07');t.players[1].front[0]=raidBase;
 t=hitWith(t,enemy);
 assert.ok(!legalUniversalActions(packs,t).some(a=>a.mode==='raid'&&a.baseUid===raidBase.uid),
  'a non-Raided copy of a printed Raid card cannot become a Raid base');
});
test('RAID life onto energy base may stay energy or move to free front slot (FAQ Q58)',()=>{
 let s=fresh(180),attacker=take(s,0,'F10');attacker.ready=true;s.players[0].front[0]=attacker;
 const revealed=reveal(s,1,'F01'),base=take(s,1,'F00');
 s.players[1].energy[0]=base;s.players[1].energy[1]=take(s,1,'F00');
 s=hitWith(s,attacker);
 const options=legalUniversalActions(packs,s);
 const stay=options.find(a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='energy'&&a.slot===0);
 const front=options.find(a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front'&&a.slot===0);
 assert.ok(stay&&front,'Raid from energy offers both permitted destinations');
 const a=dispatchUniversalAction(packs,s,stay,{actor:1});
 assert.equal(a.players[1].energy[0].uid,revealed.uid);
 assert.equal(a.players[1].energy[0].ready,true);
 const b=dispatchUniversalAction(packs,s,front,{actor:1});
 assert.equal(b.players[1].energy[0],null);
 assert.equal(b.players[1].front[0].uid,revealed.uid);
 assert.equal(assertUniversalMatch(packs,a),true);assert.equal(assertUniversalMatch(packs,b),true);
});

test('cross-title conservation tracks original printed card quantities, not just physical UID count',()=>{
 const s=fresh(250);
 assert.equal(assertUniversalMatch(packs,s),true);
 const positive=Object.fromEntries(Object.entries(deck).filter(([,n])=>n>0));
 assert.deepEqual(s.initialCounts[0],positive);
 assert.deepEqual(s.initialCounts[1],positive);
 const changed=structuredClone(s);
 const physical=changed.players[0].hand[0],before=physical.cardId;
 physical.cardId=before==='F10'?'F11':'F10';
 assert.throws(()=>assertUniversalMatch(packs,changed),/Printed card ID conservation/);
 assert.equal(assertUniversalMatch(packs,s),true,'original source stays valid');
 const forged=structuredClone(s);
 forged.initialCounts[1].F10=8;
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid original deck signature/);
});

test('main play onto completely full front line requires choosing exact own card to REMOVE',()=>{
 let s=fresh(270);
 const beforeUids=[];
 for(let i=0;i<4;i++){const c=take(s,0,'F'+String(10+i));s.players[0].front[i]=c;beforeUids.push(c.uid);}
 const producer=take(s,0,'F00');s.players[0].energy[0]=producer;
 const newCard=take(s,0,'F02');s.players[0].hand.push(newCard);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const all=legalUniversalActions(packs,s);
 const choices=all.filter(a=>a.type==='play'&&a.uid===newCard.uid&&a.line==='front');
 assert.equal(choices.length,4);
 assert.deepEqual(choices.map(a=>a.replaceUid),beforeUids);
 assert.ok(!choices.some(a=>a.replaceUid===undefined));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'play',uid:newCard.uid,line:'front',slot:1},{actor:0}),/not currently legal/);
 const orig=structuredClone(s),a=choices[1],after=dispatchUniversalAction(packs,s,a,{actor:0});
 assert.equal(after.players[0].front[1].uid,newCard.uid);
 assert.equal(after.players[0].front[1].ready,false);
 assert.ok(after.players[0].removed.some(c=>c.uid===beforeUids[1]));
 assert.ok(!after.players[0].outside.some(c=>c.uid===beforeUids[1]));
 assert.equal(after.players[0].front[0].uid,beforeUids[0]);
 assert.equal(after.players[0].front[2].uid,beforeUids[2]);
 assert.equal(assertUniversalMatch(packs,after),true);
 assert.deepEqual(s,orig);
});
test('partial line may fill empty slot without removal, but cannot overwrite occupied slot',()=>{
 let s=fresh(271),occupied=take(s,0,'F10');s.players[0].front[0]=occupied;
 s.players[0].energy[0]=take(s,0,'F00');
 const handCard=take(s,0,'F02');s.players[0].hand.push(handCard);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===handCard.uid&&a.line==='front'&&a.slot===0));
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===handCard.uid&&a.line==='front'&&a.slot===1&&a.replaceUid===undefined));
});
test('COLOR trigger on full opposing-title front must REMOVE chosen character before ACTIVE arrival',()=>{
 let s=fresh(279),attacker=take(s,0,'F10');attacker.ready=true;s.players[0].front[0]=attacker;
 reveal(s,1,'F04');
 for(let i=0;i<4;i++)s.players[1].front[i]=take(s,1,'F'+String(10+i));
 const hand=take(s,1,'F02');s.players[1].hand.push(hand);
 s=hitWith(s,attacker);
 const options=legalUniversalActions(packs,s).filter(a=>a.mode==='color'&&a.uid===hand.uid&&a.line==='front');
 assert.equal(options.length,4);
 const old=s.players[1].front[2].uid,option=options.find(a=>a.slot===2);
 assert.equal(option.replaceUid,old);
 const after=dispatchUniversalAction(packs,s,option,{actor:1});
 assert.equal(after.players[1].front[2].uid,hand.uid);
 assert.equal(after.players[1].front[2].ready,true);
 assert.ok(after.players[1].removed.some(c=>c.uid===old));
 assert.equal(assertUniversalMatch(packs,after),true);
});
test('RAID life when front is full: energy-base to front explicitly removes occupied card and preserves Raid stack',()=>{
 let s=fresh(286),attacker=take(s,0,'F10');attacker.ready=true;s.players[0].front[0]=attacker;
 const top=reveal(s,1,'F01'),source=take(s,1,'F00');
 s.players[1].energy[0]=source;
 for(let i=0;i<4;i++)s.players[1].front[i]=take(s,1,'F'+String(10+i));
 s=hitWith(s,attacker);
 const choices=legalUniversalActions(packs,s).filter(a=>a.mode==='raid'&&a.baseUid===source.uid&&a.line==='front');
 assert.equal(choices.length,4);
 assert.ok(choices.every(a=>a.replaceUid));
 const old=s.players[1].front[0].uid;
 const raided=dispatchUniversalAction(packs,s,choices.find(a=>a.slot===0),{actor:1});
 assert.equal(raided.players[1].front[0].uid,top.uid);
 assert.equal(raided.players[1].front[0].stack[0].uid,source.uid);
 assert.equal(raided.players[1].energy[0],null);
 assert.ok(raided.players[1].removed.some(c=>c.uid===old));
 assert.equal(assertUniversalMatch(packs,raided),true);
});
test('RAID-life nested onPlay selection persists, then onRaid resolves in printed timing order',()=>{
 const nestedCards=base.map(c=>c.id==='F01'?{...c,effects:{
  onPlay:[{op:'drawDiscard',count:1}],onRaid:[{op:'draw',count:1}]
 }}:c);
 const opp=createUniversalPack({id:'fictional-nested-raid',cards:nestedCards});
 const ownPacks=[packA,opp];
 let s=newUniversalMatch(ownPacks,{decks:[deck,deck],seed:314,first:0});
 const takeFor=(p,id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const arr=s.players[p][zone],idx=arr.findIndex(c=>c.cardId===id);
   if(idx>=0)return arr.splice(idx,1)[0];
  }
  throw Error('missing fixture');
 };
 const attacker=takeFor(0,'F10');attacker.ready=true;s.players[0].front[0]=attacker;
 const baseCard=takeFor(1,'F00');s.players[1].front[0]=baseCard;s.players[1].energy[0]=takeFor(1,'F00');
 const top=takeFor(1,'F01');s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(top);
 for(let i=0;i<3;i++)s=dispatchUniversalAction(ownPacks,s,{type:'next'});
 s=dispatchUniversalAction(ownPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(ownPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 const before=s.players[1].deck.length;
 const raid=legalUniversalActions(ownPacks,s).find(a=>a.mode==='raid'&&a.baseUid===baseCard.uid);
 assert.ok(raid);
 const pending=dispatchUniversalAction(ownPacks,s,raid,{actor:1});
 assert.equal(pending.pending?.kind,'effect-discard','onPlay must prompt after raid life resolves');
 assert.equal(pending.pending.player,1);
 assert.equal(pending.players[1].deck.length,before-1,'onPlay draw one happened first');
 const discarded=legalUniversalActions(ownPacks,pending).find(a=>a.type==='chooseDiscard');
 assert.ok(discarded);
 const resumed=dispatchUniversalAction(ownPacks,pending,discarded,{actor:1});
 assert.equal(resumed.pending,null);
 assert.equal(resumed.players[1].deck.length,before-2,'onRaid draw resolves AFTER the discard choice');
 assert.equal(resumed.players[1].front[0].stack[0].uid,baseCard.uid);
 assert.equal(assertUniversalMatch(ownPacks,resumed),true);
});

test('Q2396 generic chain Raid is opt-in, moves the old Raid top facedown under original base with exact UID conservation',()=>{
 const newCards=base.map(c=>c.id==='F08'?{
  ...c,name:'Chain Hero',energy:4,raidName:'Hero',
  raidFromRaid:['Hero Raid'],trigger:'raid',
  implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}
 }:c);
 const chainPack=createUniversalPack({id:'chain-fixture',cards:newCards});
 const chainPacks=[packA,chainPack],chainDeck={...deck,F08:1,F15:1};
 assert.deepEqual(validateUniversalDeck(chainPack,chainDeck),[]);
 let s=newUniversalMatch(chainPacks,{decks:[deck,chainDeck],seed:811,first:0});
 const saved=(id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const arr=s.players[1][zone],idx=arr.findIndex(c=>c.cardId===id);
   if(idx!==-1)return arr.splice(idx,1)[0];
  }
  throw Error('Missing chain fixture '+id);
 };
 const producer=saved('F00'),originalBase=saved('F00'),first=saved('F01'),last=saved('F08');
 s.players[1].energy[0]=producer;s.players[1].front[0]=originalBase;
 s.players[1].hand.push(first,last);
 for(let i=0;i<6;i++)s=dispatchUniversalAction(chainPacks,s,{type:'next'});
 assert.equal(s.active,1);assert.equal(s.phase,'main');
 const firstRaid=legalUniversalActions(chainPacks,s).find(a=>a.type==='raid'&&a.uid===first.uid&&a.baseUid===originalBase.uid);
 assert.ok(firstRaid);
 s=dispatchUniversalAction(chainPacks,s,firstRaid,{actor:1});
 assert.equal(s.players[1].front[0].uid,first.uid);
 const chainActions=legalUniversalActions(chainPacks,s).filter(a=>a.type==='raid'&&a.uid===last.uid&&a.baseUid===first.uid);
 assert.deepEqual(chainActions.map(a=>a.baseUid),[first.uid]);
 const second=dispatchUniversalAction(chainPacks,s,chainActions[0],{actor:1});
 assert.equal(second.players[1].front[0].uid,last.uid);
 assert.equal(second.players[1].front[0].stack[0].uid,originalBase.uid);
 const oldTop=second.players[1].front[0].stack[0].under[0];
 assert.equal(oldTop.uid,first.uid);
 assert.equal(oldTop.faceDown,true);
 assert.equal(oldTop.stack.length,0,'same base is not recursively duplicated');
 assert.equal(second.players[1].outside.some(c=>c.uid===oldTop.uid),false);
 assert.ok(!JSON.stringify(universalPublicView(chainPacks,second,0)).includes(oldTop.uid),
  'the previous Raid top is now hidden from opponent');
 assert.equal(assertUniversalMatch(chainPacks,second),true);
 assert.equal(assertUniversalMatch(chainPacks,s),true,'original previous Raid state remains intact');
});
test('unprinted re-Raid destinations fail closed; only named prior Raid top is valid',()=>{
 const invalid={...base[8],implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]},
  raidFromRaid:['Hero Raid']};
 assert.throws(()=>createUniversalPack({id:'not-registered',cards:[invalid]}),/invalid explicitly permitted re-Raid/);
 const repeat={...base[8],raidName:'Hero',raidFromRaid:['Hero Raid','Hero Raid']};
 assert.throws(()=>createUniversalPack({id:'duplicate',cards:[repeat]}),/invalid explicitly permitted re-Raid/);
 const cards=base.map(c=>c.id==='F08'?{...c,raidName:'Hero',
  name:'Cannot chain',implementation:'dsl',
  effects:{onPlay:[{op:'draw',count:1}]}}:c);
 const newPack=createUniversalPack({id:'no-chain-permission',cards});
 const newDeck={...deck,F08:1,F15:1};
 let s=newUniversalMatch([packA,newPack],{decks:[deck,newDeck],seed:833,first:0});
 const take1=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const a=s.players[1][zone],index=a.findIndex(c=>c.cardId===id);
   if(index>=0)return a.splice(index,1)[0];
  }
 };
 s.players[1].energy[0]=take1('F00');
 s.players[1].front[0]=take1('F00');
 const first=take1('F01'),last=take1('F08');s.players[1].hand.push(first,last);
 for(let i=0;i<6;i++)s=dispatchUniversalAction([packA,newPack],s,{type:'next'});
 const firstAction=legalUniversalActions([packA,newPack],s).find(a=>a.type==='raid'&&a.uid===first.uid&&a.baseUid===s.players[1].front[0]?.uid);
 s=dispatchUniversalAction([packA,newPack],s,firstAction,{actor:1});
 assert.ok(!legalUniversalActions([packA,newPack],s).some(a=>a.type==='raid'&&a.uid===last.uid&&a.baseUid===first.uid));
 assert.equal(assertUniversalMatch([packA,newPack],s),true);
});
test('Q2286 foundation: an original Raid-base onRaided trigger fires AGAIN when an allowed chained Raid replaces the top',()=>{
 const special=base.map(c=>{
  if(c.id==='F00')return {...c,traits:['TestTrait'],implementation:'dsl',
   effects:{onRaided:[{op:'buffOwnTrait',trait:'TestTrait',bp:1000,optional:true}]}};
  if(c.id==='F01')return {...c,effects:{onPlay:[],onRaid:[]}};
  if(c.id==='F08')return {...c,raidName:'Hero',raidFromRaid:['Hero Raid'],
   name:'Chain Hero',energy:4,traits:['TestTrait'],implementation:'dsl',effects:{onPlay:[]}};
  return c;
 });
 const chain=createUniversalPack({id:'second-trigger',cards:special});
 const decks=[deck,{...deck,F08:1,F15:1}],packs=[packA,chain];
 let s=newUniversalMatch(packs,{decks,seed:845,first:0});
 const take1=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const arr=s.players[1][zone],idx=arr.findIndex(c=>c.cardId===id);
   if(idx!==-1)return arr.splice(idx,1)[0];
  }
  throw Error('not found');
 };
 const baseCard=take1('F00'),generator=take1('F00'),one=take1('F01'),two=take1('F08');
 s.players[1].front[0]=baseCard;s.players[1].energy[0]=generator;
 s.players[1].hand.push(one,two);
 for(let i=0;i<6;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const first=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===one.uid&&a.baseUid===baseCard.uid);
 s=dispatchUniversalAction(packs,s,first,{actor:1});
 assert.equal(s.pending?.kind,'effect-buff-trait','base trigger fires on first Raid');
 s=dispatchUniversalAction(packs,s,{type:'chooseTraitBuff',uid:null},{actor:1});
 assert.equal(s.pending,null);
 const chainAction=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===two.uid&&a.baseUid===one.uid);
 assert.ok(chainAction);
 s=dispatchUniversalAction(packs,s,chainAction,{actor:1});
 assert.equal(s.pending?.kind,'effect-buff-trait','original base re-triggers beneath facedown former top');
 assert.equal(s.pending.sourceUid,baseCard.uid);
 const done=dispatchUniversalAction(packs,s,{type:'chooseTraitBuff',uid:two.uid},{actor:1});
 assert.equal(universalBp(packs,done,done.players[1].front[0]),3000);
 assert.equal(done.players[1].front[0].stack[0].under[0].uid,one.uid);
 assert.equal(assertUniversalMatch(packs,done),true);
});

function protectedFullLineFixture(seed=900){
 const modified=base.map(c=>c.id==='F08'?{
  ...c,raidName:'Hero',implementation:'dsl',effects:{onPlay:[]},
  conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:500}
 }:c);
 const custom=createUniversalPack({id:'full-line-protect',cards:modified});
 const packs=[custom,packB],customDeck={...deck,F08:1,F15:deck.F15-1};
 assert.deepEqual(validateUniversalDeck(custom,customDeck),[]);
 let s=newUniversalMatch(packs,{decks:[customDeck,deck],seed,first:0});
 const take0=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
   if(i!==-1)return a.splice(i,1)[0];
  }
  throw Error('missing full-line source '+id);
 };
 const main=take0('F08'),baseCard=take0('F00'),under=take0('F01');
 under.faceDown=true;baseCard.under.push(under);main.stack=[baseCard];
 s.players[0].front[0]=main;
 for(let slot=1;slot<4;slot++)s.players[0].front[slot]=take0('F'+String(slot+9).padStart(2,'0'));
 s.players[0].energy[0]=take0('F00');
 const newcomer=take0('F02');s.players[0].hand.push(newcomer);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {packs,s,main,baseCard,under,newcomer};
}
test('full-line protected Raided target: explicit removal choice resumes original paid deployment AFTER removal',()=>{
 const {packs,s,main,baseCard,under,newcomer}=protectedFullLineFixture();
 const options=legalUniversalActions(packs,s);
 const attempted=options.find(a=>a.type==='play'&&a.uid===newcomer.uid&&a.line==='front'&&a.slot===0);
 assert.ok(attempted);
 assert.equal(attempted.replaceUid,main.uid);
 const original=structuredClone(s),ap=s.players[0].apCards.filter(a=>a.ready).length;
 const stalled=dispatchUniversalAction(packs,s,attempted,{actor:0});
 assert.equal(stalled.pending?.kind,'leave-replacement');
 assert.equal(stalled.pending.player,0);
 assert.equal(stalled.players[0].apCards.filter(a=>a.ready).length,ap,'AP not spent before leave choice');
 assert.deepEqual(legalUniversalActions(packs,stalled),[
  {type:'chooseLeaveReplacement',mode:'protect'},
  {type:'chooseLeaveReplacement',mode:'leave'}
 ]);
 const applied=dispatchUniversalAction(packs,stalled,{type:'chooseLeaveReplacement',mode:'leave'},{actor:0});
 assert.equal(applied.pending,null);
 assert.equal(applied.players[0].front[0].uid,newcomer.uid);
 assert.equal(applied.players[0].apCards.filter(a=>a.ready).length,ap-1);
 assert.ok(applied.players[0].removed.some(c=>c.uid===main.uid));
 assert.ok(applied.players[0].outside.some(c=>c.uid===baseCard.uid));
 assert.ok(applied.players[0].outside.some(c=>c.uid===under.uid&&c.faceDown===false));
 assert.equal(assertUniversalMatch(packs,applied),true);
 assert.deepEqual(s,original);
});
test('full-line protected Raided target: choosing protection consumes facedown card and cancels deployment without AP',()=>{
 const {packs,s,main,under,newcomer}=protectedFullLineFixture(901);
 const attempted=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===newcomer.uid&&a.slot===0&&a.line==='front');
 const held=dispatchUniversalAction(packs,s,attempted,{actor:0});
 const ap=held.players[0].apCards.filter(a=>a.ready).length;
 const kept=dispatchUniversalAction(packs,held,{type:'chooseLeaveReplacement',mode:'protect'},{actor:0});
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].front[0].uid,main.uid);
 assert.ok(kept.players[0].outside.some(c=>c.uid===under.uid));
 assert.equal(kept.players[0].front[0].stack[0].under.length,0);
 assert.equal(kept.players[0].apCards.filter(a=>a.ready).length,ap);
 assert.ok(kept.players[0].hand.some(c=>c.uid===newcomer.uid));
 assert.equal(universalBp(packs,kept,kept.players[0].front[0]),2000);
 assert.equal(assertUniversalMatch(packs,kept),true);
 const retry=legalUniversalActions(packs,kept).find(a=>a.type==='play'&&a.uid===newcomer.uid&&a.line==='front'&&a.slot===0);
 assert.equal(retry.replaceUid,main.uid,'now the same occupant can be removed without facedown replacement');
 const redone=dispatchUniversalAction(packs,kept,retry,{actor:0});
 assert.equal(redone.players[0].front[0].uid,newcomer.uid);
 assert.equal(redone.pending,null);
 assert.equal(assertUniversalMatch(packs,redone),true);
});

test('nested COLOR life trigger into protected full front line preserves its original pending decision before and after removal',()=>{
 const {packs,s:initial,main,under,newcomer}=protectedFullLineFixture(906);
 let s=initial;
 function grab(player,id){
  for(const zone of ['hand','deck','life','outside']){
   const cards=s.players[player][zone],i=cards.findIndex(c=>c.cardId===id);
   if(i>=0)return cards.splice(i,1)[0];
  }
  throw Error('Missing nested trigger fixture '+player+' '+id);
 }
 const attacker=grab(1,'F10');
 attacker.ready=true;s.players[1].front[0]=attacker;
 const color=grab(0,'F04'),life=s.players[0].life;
 s.players[0].deck.push(life.shift());life.unshift(color);
 for(let i=0;i<5;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'color');
 const choice=legalUniversalActions(packs,s).find(a=>
  a.mode==='color'&&a.uid===newcomer.uid&&a.line==='front'&&a.slot===0);
 assert.ok(choice,'full-line COLOR is legal with explicitly selected replacement');
 assert.equal(choice.replaceUid,main.uid);
 const nested=dispatchUniversalAction(packs,s,choice,{actor:0});
 assert.equal(nested.pending?.kind,'leave-replacement');
 assert.equal(nested.pending.previousPending?.kind,'life-trigger');
 assert.equal(nested.pending.previousPending?.uid,color.uid);
 const beforeDraw=nested.players[0].deck.length;
 const accepted=dispatchUniversalAction(packs,nested,{type:'chooseLeaveReplacement',mode:'leave'},{actor:0});
 assert.equal(accepted.pending,null,'parent life pending restored then fully resolved');
 assert.equal(accepted.players[0].front[0].uid,newcomer.uid);
 assert.equal(accepted.players[0].front[0].ready,true);
 assert.equal(accepted.players[0].deck.length,beforeDraw-1,'free COLOR onPlay draw executes after replacement');
 assert.ok(accepted.players[0].removed.some(c=>c.uid===main.uid));
 assert.ok(accepted.players[0].outside.some(c=>c.uid===under.uid));
 assert.equal(assertUniversalMatch(packs,accepted),true);
 const protectedGame=dispatchUniversalAction(packs,nested,{type:'chooseLeaveReplacement',mode:'protect'},{actor:0});
 assert.equal(protectedGame.pending,null);
 assert.equal(protectedGame.players[0].front[0].uid,main.uid);
 assert.ok(protectedGame.players[0].hand.some(c=>c.uid===newcomer.uid));
 assert.ok(protectedGame.players[0].outside.some(c=>c.uid===under.uid));
 assert.equal(assertUniversalMatch(packs,protectedGame),true);
});

test('protected Raided card in a FULL ENERGY line resolves leave replacement before AP payment and new energy placement',()=>{
 const {packs,s,main,under,newcomer}=protectedFullLineFixture(921);
 const generator=s.players[0].energy[0];
 s.players[0].energy[0]=main;s.players[0].front[0]=generator;
 const grab=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
   if(i>=0)return a.splice(i,1)[0];
  }
  throw Error('No physical fixture card '+id);
 };
 s.players[0].energy[1]=grab('F01');
 s.players[0].energy[2]=grab('F04');
 s.players[0].energy[3]=grab('F06');
 assert.equal(assertUniversalMatch(packs,s),true);
 const entry=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===newcomer.uid&&a.line==='energy'&&a.slot===0);
 assert.ok(entry,'normal energy-line deployment may replace protected occupant when all four slots are occupied');
 assert.equal(entry.replaceUid,main.uid);
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 const stalled=dispatchUniversalAction(packs,s,entry,{actor:0});
 assert.equal(stalled.pending?.kind,'leave-replacement');
 assert.equal(stalled.players[0].apCards.filter(x=>x.ready).length,ap);
 assert.deepEqual(legalUniversalActions(packs,stalled),[
  {type:'chooseLeaveReplacement',mode:'protect'},
  {type:'chooseLeaveReplacement',mode:'leave'}
 ]);
 const protectedEnergy=dispatchUniversalAction(packs,stalled,
  {type:'chooseLeaveReplacement',mode:'protect'},{actor:0});
 assert.equal(protectedEnergy.players[0].energy[0].uid,main.uid);
 assert.ok(protectedEnergy.players[0].outside.some(x=>x.uid===under.uid));
 assert.ok(protectedEnergy.players[0].hand.some(x=>x.uid===newcomer.uid));
 assert.equal(protectedEnergy.players[0].apCards.filter(x=>x.ready).length,ap);
 assert.equal(assertUniversalMatch(packs,protectedEnergy),true);
 const accepted=dispatchUniversalAction(packs,stalled,
  {type:'chooseLeaveReplacement',mode:'leave'},{actor:0});
 assert.equal(accepted.players[0].energy[0].uid,newcomer.uid);
 assert.ok(accepted.players[0].removed.some(x=>x.uid===main.uid));
 assert.ok(accepted.players[0].outside.some(x=>x.uid===under.uid));
 assert.equal(accepted.players[0].apCards.filter(x=>x.ready).length,ap-1);
 assert.equal(assertUniversalMatch(packs,accepted),true);
});
