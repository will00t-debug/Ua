// B group owns this file. Closed IMC jobs for IMC-1-001 through IMC-1-050.
import {IMC_PROGRAMS_001_050} from './programs-001-050.mjs';

export function runImc001(pack,state,job){
 const program=IMC_PROGRAMS_001_050[job?.id];
 if(typeof program?.run!=='function')
  throw Error('IMC B 組還沒有這個效果的處理函式：'+job?.id);
 return program.run(pack,state,job);
}
