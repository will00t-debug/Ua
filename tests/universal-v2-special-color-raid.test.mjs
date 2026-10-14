import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
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
 const tooMany={...deck,F03:4,F08:0,F15:0};
 assert.match(validateUniversalDeck(packA,tooMany).join(' '),/SPECIAL Trigger limit exceeded/);
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
