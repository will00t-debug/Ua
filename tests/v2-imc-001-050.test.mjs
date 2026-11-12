import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_PROGRAMS_001_050} from '../dist/universal-v2/imc/programs-001-050.mjs';
import {IMC_REQUESTS_001_050} from '../dist/universal-v2/imc/requests-001-050.mjs';
import {runImc001} from '../dist/universal-v2/imc/runtime-001-050.mjs';

test('IMC B range starts with no battle program',()=>{
 assert.deepEqual({...IMC_PROGRAMS_001_050},{});
 assert.deepEqual(IMC_REQUESTS_001_050,[]);
 assert.throws(()=>runImc001(null,null,{id:'IMC-1-001'}),/B 組還沒有/);
});
