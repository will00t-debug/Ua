import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'R'+String(i).padStart(2,'0'));
const cards=ids.map(id=>({id,name:id,type:'character',color:'green',
 energy:0,ap:1,bp:1500,gen:1,step:id==='R00',implementation:'vanilla'}));
const pack=createUniversalPack({id:'r21-field-movement-ledger',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function arrange(line){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:21021,first:0});
 const zone=s.players[0].hand;
 let c=zone.find(x=>x.cardId==='R00');
 if(!c){for(const z of ['deck','life']){
  const i=s.players[0][z].findIndex(x=>x.cardId==='R00');
  if(i>=0){c=s.players[0][z].splice(i,1)[0];break;}
 }}
 else zone.splice(zone.indexOf(c),1);
 assert.ok(c);c.ready=true;s.players[0][line][0]=c;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'move');
 return {s,c};
}
for(const [from,to,type] of [['energy','front','move'],['front','energy','step']]){
 test('completed '+type+' journals physical UID once and never leaks private journal',()=>{
  let {s,c}=arrange(from);
  const n=s.zoneMoveEvents.length;
  const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===c.uid&&a.slot===0);
  assert.ok(action,'printed field movement must be legal');
  const snapshot=structuredClone(s);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type,uid:'0-999999',slot:0}),/not currently legal/);
  assert.deepEqual(s,snapshot);
  s=dispatchUniversalAction(packs,s,action);
  const entries=s.zoneMoveEvents.slice(n);
  assert.equal(entries.length,1);
  assert.deepEqual([entries[0].uid,entries[0].from,entries[0].to,entries[0].reason,
   entries[0].owner,entries[0].controller,entries[0].sourceUid],
   [c.uid,from,to,'rule',0,0,null]);
  assert.equal(s.players[0][to][0]?.uid,c.uid);
  assert.equal(s.players[0][from][0],null);
  assert.equal(universalPublicView(packs,s,1).zoneMoveEvents,undefined);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
