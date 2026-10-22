import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {cardHasTrait,ownFieldTraitKinds,matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';

// Printed Japanese evidence:
// UA51BT/SLG-1-069 and SLG-1-065: DFN／第四次架南島レイド.
// Keep one exact printed traits token; audit explicitly which parts are traits.
const slg=createSlgV2Pack();
const fake=(id,uid)=>({uid,cardId:id,ready:true,buffs:[],stack:[],under:[]});
const empty=()=>({active:0,continuousStates:[],players:[{front:Array(4).fill(null),energy:Array(4).fill(null)},
 {front:Array(4).fill(null),energy:Array(4).fill(null)}]});
const printed=c=>slg.cards[c.cardId];
const cond={kind:'ownTraitCount',turn:'own',zone:'field',excludeSelf:false,trait:'DFN',min:3};

test('official audited composite preserves immutable PRINTED token while matching either verified component',()=>{
 for(const id of ['SLG-1-069','SLG-1-065']){
  const c=slg.cards[id];
  assert.deepEqual(c.traits,['DFN／第四次架南島レイド']);
  assert.deepEqual(c.traitComponents,['DFN','第四次架南島レイド']);
  assert.ok(Object.isFrozen(c.traitComponents));
  assert.equal(cardHasTrait(c,'DFN'),true);
  assert.equal(cardHasTrait(c,'第四次架南島レイド'),true);
  assert.equal(cardHasTrait(c,'未印刷特徵'),false);
 }
});
test('unverified composites remain ONE exact token, not implicitly split',()=>{
 const basic={id:'T',name:'Test',color:'green',energy:0,ap:1,bp:1000,gen:1,
  type:'character',traits:['DFN／Other'],implementation:'vanilla'};
 const raw=createUniversalPack({id:'no-guess',cards:[basic]}).cards.T;
 assert.equal(cardHasTrait(raw,'DFN'),false);
 assert.equal(cardHasTrait(raw,'DFN／Other'),true);
 for(const bad of [
  ['DFN','Wrong'],['Wrong','Other'],['DFN','Other','Extra'],['DFN','DFN']
 ]){
  assert.throws(()=>createUniversalPack({id:'invalid-trait',cards:[{...basic,traitComponents:bad}]}),
   /invalid audited compound traits/);
 }
});
test('own field DFN threshold includes two printed composite cards and excludes opponent, hand, outside',()=>{
 const s=empty();
 s.players[0].front[0]=fake('SLG-1-069','0-0');
 s.players[0].energy[0]=fake('SLG-1-065','0-1');
 s.players[1].front[0]=fake('SLG-1-069','1-0');
 const profile={zone:'field',subject:'character',excludeSelf:false};
 assert.equal(matchesV2LiveCondition(s,0,'0-source',cond,printed),false);
 const kinds=ownFieldTraitKinds(s,0,'0-source',profile,printed);
 assert.ok(kinds.has('DFN'));assert.ok(kinds.has('第四次架南島レイド'));
 assert.equal(kinds.size,2,'two audited traits are distinct KINDs, not three cards');
 s.players[0].front[1]=fake('SLG-1-065','0-2');
 assert.equal(matchesV2LiveCondition(s,0,'0-source',cond,printed),true);
 s.players[0].front[1]=null;
 assert.equal(matchesV2LiveCondition(s,0,'0-source',cond,printed),false);
 assert.equal(matchesV2LiveCondition({...s,active:1},0,'0-source',cond,printed),false);
});
