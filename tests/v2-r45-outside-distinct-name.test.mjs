import test from 'node:test';
import assert from 'node:assert/strict';
import {countOwnOutsideDistinctPrintedNames}
 from '../dist/universal-v2/field-conditions.mjs';

// Official EX15BT/BLC-4-069 Q2337: exact original printed name,
 // original green color, EVENT+FIELD union in one's own outside only.
const phys=(n,id,owner=0)=>({uid:owner+'-'+n,cardId:id});
const defs={
 eventA:{name:'花天狂骨',type:'event',color:'green'},
 eventB:{name:'春水の遊び',type:'event',color:'green'},
 fieldC:{name:'春水の庭',type:'field',color:'green'},
 fieldD:{name:'護廷十三隊',type:'field',color:'green'},
 sameNameField:{name:'花天狂骨',type:'field',color:'green'},
 eventRed:{name:'新しい名前',type:'event',color:'red'},
 greenCharacter:{name:'もう一枚',type:'character',color:'green'}
};
const state=(outside=[])=>({players:[{outside},{outside:[]}]});
const count=s=>countOwnOutsideDistinctPrintedNames(s,0,c=>defs[c.cardId],
 {color:'green',types:['event','field']});
test('BLC-4-069 four different printed names, event + field are eligible',()=>{
 assert.equal(count(state([phys(1,'eventA'),phys(2,'eventB'),
  phys(3,'fieldC'),phys(4,'fieldD')])),4);
});
test('Four same printed names are ONE; identical name across EVENT and FIELD also ONE',()=>{
 assert.equal(count(state([phys(1,'eventA'),phys(2,'eventA'),
  phys(3,'sameNameField'),phys(4,'sameNameField')])),1);
});
test('Exclude other colors and character type even if green',()=>{
 assert.equal(count(state([phys(1,'eventA'),phys(2,'eventRed'),
  phys(3,'greenCharacter'),phys(4,'fieldC')])),2);
});
test('Only own outside; other-owner UID in own outside rejects',()=>{
 assert.throws(()=>count(state([phys(1,'eventA',1)])));
 assert.equal(count(state([])),0);
});
test('Printed-name counter rejects unsupported type, empty input, forged printed face',()=>{
 const s=state([phys(1,'eventA')]);
 for(const o of [{color:'green',types:['event','event']},
  {color:'orange',types:['event']},{color:'green',types:[]}])
  assert.throws(()=>countOwnOutsideDistinctPrintedNames(s,0,c=>defs[c.cardId],o));
 assert.throws(()=>countOwnOutsideDistinctPrintedNames(s,0,()=>({name:'',
  color:'green',type:'event'}),{color:'green',types:['event']}));
});
