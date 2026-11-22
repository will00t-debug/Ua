import test from 'node:test';
import assert from 'node:assert/strict';
import {gainProbe,PROBE_GAINS} from '../dist/universal-v2/white-sword-ai/gain-probe.mjs';

const a={type:'play',uid:'a'};
const b={type:'raid',uid:'b'};
const c={type:'next'};
const makeRows=()=>[
 {action:a,hardScore:100,features:[1,0]},
 {action:b,hardScore:99,features:[0,1]}
];
test('trained residual gain changes only legal Hard-capped actions',()=>{
 const rows=makeRows(),base=[0,0],trained=[0,0.2];
 const probe=gainProbe(rows,base,trained,6,a);
 assert.deepEqual(PROBE_GAINS,[1,2,4,8,16,32]);
 assert.deepEqual(probe.reference,a);
 assert.equal(probe.gains['1'].switched,true);
 assert.deepEqual(probe.gains['1'].action,b);
 assert.equal(probe.gains['1'].hardAnchorLoss,1);
 assert.equal(probe.gains['16'].hardAnchorLoss,1);
 for(const v of Object.values(probe.gains))
  assert.ok(rows.some(row=>JSON.stringify(row.action)===JSON.stringify(v.action)));
});
test('zero residual preserves incumbent policy at every multiplier',()=>{
 const rows=makeRows(),policy=[-3,2];
 const probe=gainProbe(rows,policy,policy,6,a);
 assert.ok(Object.values(probe.gains).every(row=>!row.switched));
 assert.ok(Object.values(probe.gains).every(row=>JSON.stringify(row.action)===JSON.stringify(probe.reference)));
});
test('counterfactuals do not mutate candidate rows or weights',()=>{
 const rows=makeRows(),snapshot=structuredClone(rows);
 const inc=[0,0],trained=[0,0.2];
 gainProbe(rows,inc,trained,6,a);
 assert.deepEqual(rows,snapshot);
 assert.deepEqual(inc,[0,0]);
 assert.deepEqual(trained,[0,0.2]);
 assert.throws(()=>gainProbe([...rows,{action:c,hardScore:80,features:[1,0]}],inc,trained,6,a,{gains:[64]}),/gain/);
 assert.throws(()=>gainProbe(rows,inc,[1],6,a),/width/);
 assert.throws(()=>gainProbe([],inc,trained,6,a),/candidate/);
});
