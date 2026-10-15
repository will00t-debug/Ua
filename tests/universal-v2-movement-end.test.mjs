import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalActor} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'R'+String(i).padStart(2,'0'),name:'Character '+i,color:'green',
 type:'character',energy:0,ap:1,bp:1000+250*i,gen:1,
 implementation:'vanilla',...(i===0?{step:true}:{})
}));
const pack=createUniversalPack({id:'shared-end-phase-test',cards});
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const fresh=()=>newUniversalMatch(pack,{decks:[deck,deck],seed:234,first:0});
function take(s,id){
 const p=s.players[0];
 for(const zone of ['hand','deck','life']){
  const i=p[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return p[zone].splice(i,1)[0];
 }
 throw Error('Missing card '+id);
}
const choose=(s,pred)=>{
 const a=legalUniversalActions(pack,s).find(pred);assert.ok(a);
 return dispatchUniversalAction(pack,s,a);
};
test('movement phase permits any number of distinct characters, but each moves at most once',()=>{
 let s=fresh(),a=take(s,'R00'),b=take(s,'R01');
 s.players[0].energy[0]=a;s.players[0].energy[1]=b;
 s=choose(s,x=>x.type==='next');assert.equal(s.phase,'move');
 s=choose(s,x=>x.type==='move'&&x.uid===a.uid&&x.slot===0);
 assert.equal(s.players[0].front[0].uid,a.uid);
 assert.ok(!legalUniversalActions(pack,s).some(x=>x.type==='step'&&x.uid===a.uid),
  'STEP character moved forward cannot instantly move back within simultaneous movement phase');
 assert.ok(legalUniversalActions(pack,s).some(x=>x.type==='move'&&x.uid===b.uid),
  'other independent character can move in the same movement phase');
 s=choose(s,x=>x.type==='move'&&x.uid===b.uid&&x.slot===1);
 assert.deepEqual(s.movedUids,[a.uid,b.uid]);
 assert.ok(!legalUniversalActions(pack,s).some(x=>x.type==='move'||x.type==='step'));
 const before=structuredClone(s);
 s=choose(s,x=>x.type==='next');
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(pack,s),true);
 assert.deepEqual(before.players[0].front.map(x=>x?.uid||null),[a.uid,b.uid,null,null]);
});
test('official end phase turns REST field cards ACTIVE before opponent turn',()=>{
 let s=fresh(),a=take(s,'R00'),b=take(s,'R01');
 s.players[0].energy[0]=a;s.players[0].front[0]=b;a.ready=false;b.ready=false;
 for(let n=0;n<4;n++)s=choose(s,x=>x.type==='next');
 assert.equal(s.active,1);
 assert.equal(s.turn,2);
 assert.equal(s.phase,'start');
 assert.equal(s.players[0].energy[0].ready,true,'our energy ready before enemy turn');
 assert.equal(s.players[0].front[0].ready,true,'our front ready to block on enemy turn');
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('hand above eight in end phase requires controller choices into REMOVED, not sideline',()=>{
 let s=fresh();
 s.players[0].hand.push(...s.players[0].deck.splice(0,3));
 const initialHand=s.players[0].hand.map(c=>c.uid);
 assert.equal(initialHand.length,10);
 for(let n=0;n<3;n++)s=choose(s,x=>x.type==='next');
 assert.equal(s.phase,'attack');
 s=choose(s,x=>x.type==='next');
 assert.equal(s.pending?.kind,'end-hand-limit');
 assert.equal(s.active,0);
 assert.equal(universalActor(s),0,'controller chooses which cards leave hand');
 assert.equal(legalUniversalActions(pack,s).length,10);
 assert.ok(legalUniversalActions(pack,s).every(x=>x.type==='chooseHandLimit'));
 const before=structuredClone(s),first=s.players[0].hand[3].uid;
 s=dispatchUniversalAction(pack,s,{type:'chooseHandLimit',uid:first},{actor:0});
 assert.equal(s.pending.kind,'end-hand-limit');
 assert.equal(s.players[0].hand.length,9);
 assert.ok(s.players[0].removed.some(c=>c.uid===first));
 assert.equal(s.players[0].outside.length,0,'extra hand cards go to REMOVAL area');
 assert.equal(before.players[0].hand.length,10,'pure transition');
 const second=s.players[0].hand[2].uid;
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseHandLimit',uid:first},{actor:0}),/not currently legal/);
 const ai=chooseUniversalAiAction(pack,s,{difficulty:'normal'});
 assert.equal(ai.type,'chooseHandLimit','AI must resolve its forced end hand choice');
 s=dispatchUniversalAction(pack,s,{type:'chooseHandLimit',uid:second},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,8);
 assert.equal(s.players[0].removed.length,2);
 assert.equal(s.active,1);
 assert.equal(s.phase,'start');
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('full front line permits movement only with explicit target sent to REMOVAL',()=>{
 let s=fresh(),moving=take(s,'R02');s.players[0].energy[0]=moving;
 for(let i=0;i<4;i++)s.players[0].front[i]=take(s,'R'+String(i+3).padStart(2,'0'));
 s=dispatchUniversalAction(pack,s,{type:'next'});
 const legal=legalUniversalActions(pack,s).filter(a=>a.type==='move'&&a.uid===moving.uid);
 assert.equal(legal.length,4);
 const replaced=s.players[0].front[2].uid,a=legal.find(a=>a.slot===2);
 assert.equal(a.replaceUid,replaced);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'move',uid:moving.uid,slot:2}),/not currently legal/);
 const after=dispatchUniversalAction(pack,s,a);
 assert.equal(after.players[0].front[2].uid,moving.uid);
 assert.equal(after.players[0].energy[0],null);
 assert.ok(after.players[0].removed.some(c=>c.uid===replaced));
 assert.ok(!after.players[0].outside.some(c=>c.uid===replaced));
 assert.equal(assertUniversalMatch(pack,after),true);
});
test('full energy line allows STEP only after a selected energy card is REMOVED',()=>{
 let s=fresh(),moving=take(s,'R00');s.players[0].front[0]=moving;
 for(let i=0;i<4;i++)s.players[0].energy[i]=take(s,'R'+String(i+3).padStart(2,'0'));
 s=dispatchUniversalAction(pack,s,{type:'next'});
 const legal=legalUniversalActions(pack,s).filter(a=>a.type==='step'&&a.uid===moving.uid);
 assert.equal(legal.length,4);
 const replaced=s.players[0].energy[1].uid,action=legal.find(a=>a.slot===1);
 assert.equal(action.replaceUid,replaced);
 const after=dispatchUniversalAction(pack,s,action);
 assert.equal(after.players[0].front[0],null);
 assert.equal(after.players[0].energy[1].uid,moving.uid);
 assert.ok(after.players[0].removed.some(c=>c.uid===replaced));
 assert.equal(assertUniversalMatch(pack,after),true);
});
