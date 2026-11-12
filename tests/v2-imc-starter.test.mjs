import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_PROGRAMS_STARTER} from '../dist/universal-v2/imc/programs-starter.mjs';
import {IMC_REQUESTS_STARTER} from '../dist/universal-v2/imc/requests-starter.mjs';
import {runImcStarter} from '../dist/universal-v2/imc/runtime-starter.mjs';

test('IMC D range starts with no battle program',()=>{
 assert.deepEqual({...IMC_PROGRAMS_STARTER},{});
 assert.deepEqual(IMC_REQUESTS_STARTER,[]);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-102'}),/D 組還沒有/);
});
