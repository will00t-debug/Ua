import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_PROGRAMS_051_100} from '../dist/universal-v2/imc/programs-051-100.mjs';
import {IMC_REQUESTS_051_100} from '../dist/universal-v2/imc/requests-051-100.mjs';
import {runImc051} from '../dist/universal-v2/imc/runtime-051-100.mjs';

test('IMC C range starts with no battle program',()=>{
 assert.deepEqual({...IMC_PROGRAMS_051_100},{});
 assert.deepEqual(IMC_REQUESTS_051_100,[]);
 assert.throws(()=>runImc051(null,null,{id:'IMC-1-051'}),/C 組還沒有/);
});
