import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
// Synthetic component cards ONLY; Q547-Q551 official BLC-1-024 are tested.
const cards=Array.from({length:13},(_,i)=>({
 id:'RAID-'+i,name:i===0?'Source':i===1?'Base':i===2?'Raid':'Unit '+i,
 color:'yellow',type:'character',energy:0,ap:1,bp:2000,gen:1,
 implementation:i<=2?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[{op:'stripOppRaidTop',optional:true}]}}:{}),
 ...(i===1?{effects:{onPlay:[{op:'draw',count:1}]}}:{}),
 ...(i===2?{raidName:'Base',effects:{onRetire:[{op:'draw',count:1}]}}:{})
}));
const pack=createUniversalPack({id:'raid-strip-component',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){for(const z of ['deck','hand','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('missing '+id);}
function setup(raid=true,shape=null){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:7024});
 const source=take(s,0,'RAID-0');s.players[0].hand.push(source);
 const top=take(s,1,raid?'RAID-2':'RAID-1');
 const base=raid?take(s,1,'RAID-1'):null;
 top.ready=false;top.fieldEntryStamp=s.nextFieldEntryStamp++;
 top.buffs=[{bp:1000,untilTurn:s.turn}];
 if(base){base.ready=true;base.fieldEntryStamp=s.nextFieldEntryStamp++;top.stack=[base];}
 s.players[1].front[0]=top;
 if(shape)shape(s,top,base);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const a=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(a);s=dispatchUniversalAction(packs,s,a);
 return {s,top,base};
}
test('official Q548-551: only top goes OUTSIDE, base stays REST, no retire/entry, no inherited buffs',()=>{
 let {s,top,base}=setup();
 const hand=s.players[1].hand.length,decks=s.players[1].deck.length;
 assert.equal(s.pending?.kind,'effect-strip-raid-top');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseRaidTopStrip',uid:null},{type:'chooseRaidTopStrip',uid:top.uid}]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRaidTopStrip',uid:base.uid}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidTopStrip',uid:top.uid});
 assert.equal(s.players[1].front[0].uid,base.uid);
 assert.equal(s.players[1].front[0].ready,false);
 assert.deepEqual(s.players[1].front[0].buffs,[]);
 assert.ok(s.players[1].outside.some(c=>c.uid===top.uid&&c.stack.length===0));
 const baseEntry=s.zoneMoveEvents.find(x=>x.uid===base.uid&&
  x.from==='raid-under'&&x.to==='front'&&x.reason==='raid-strip');
 assert.ok(baseEntry,'stripped physical Raid base returns to visible FRONT');
 assert.equal(baseEntry.owner,1);
 assert.equal(s.players[1].hand.length,hand);assert.equal(s.players[1].deck.length,decks);
 assert.deepEqual(s.turnRetireEvents,[]);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('up-to-one permits decline; no Raid top means no pending',()=>{
 let {s,top}=setup();
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidTopStrip',uid:null});
 assert.equal(s.players[1].front[0].uid,top.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
 const plain=setup(false);assert.equal(plain.s.pending,null);
 assert.equal(assertUniversalMatch(packs,plain.s),true);
});
test('schema rejects mandatory or unverified strip effects',()=>{
 for(const op of [{op:'stripOppRaidTop',optional:false},
  {op:'stripOppRaidTop',optional:true,anyLine:true},{op:'stripOppRaidTop'}])
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],effects:{onPlay:[op]}}]}),
   /invalid optional opponent RAID-top strip/);
});

// Round 10: Q49 + Q542-Q546; complex unverified geometries stay closed.
for(const ready of [false,true])test(`stripped base does not revive pre-Raid buff; ACTIVE=${ready}`,()=>{
 let {s,base}=setup(true,(s,top,base)=>{
  top.ready=ready;base.buffs=[{bp:3000,untilTurn:s.turn}];
 });
 const oldStamp=base.fieldEntryStamp;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[1]);
 const survivor=s.players[1].front[0];
 assert.equal(survivor.ready,ready);assert.deepEqual(survivor.buffs,[]);
 assert.notEqual(survivor.fieldEntryStamp,oldStamp);
 assert.equal(s.turnRetireEvents.length,0);assert.equal(assertUniversalMatch(packs,s),true);
});
for(const shape of ['top-under','base-under','nested-stack','two-bases','facedown-base'])
 test(`unverified ${shape} is fail-closed without losing or revealing cards`,()=>{
  const {s,top}=setup(true,(s,top,base)=>{
   if(shape==='facedown-base'){base.faceDown=true;return;}
   const extra=take(s,1,'RAID-4');extra.faceDown=true;
   if(shape==='top-under')top.under=[extra];
   if(shape==='base-under')base.under=[extra];
   if(shape==='nested-stack')base.stack=[extra];
   if(shape==='two-bases')top.stack.push(extra);
  });
  assert.equal(s.pending,null);assert.equal(s.players[1].front[0].uid,top.uid);
  assert.equal(s.turnRetireEvents.length,0);assert.equal(assertUniversalMatch(packs,s),true);
  const publicView=JSON.stringify(universalPublicView(packs,s,0));
  const hidden=[...(top.under||[]),...(top.stack||[]).flatMap(c=>[...(c.under||[]),...(c.stack||[])])];
  for(const c of hidden)assert.ok(!publicView.includes(c.uid));
 });
