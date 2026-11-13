// C group owns this file. Closed IMC jobs for IMC-1-051 through IMC-1-100.
import {IMC_PROGRAMS_051_100} from './programs-051-100.mjs';

export function runImc051(pack,state,job){
 const program=IMC_PROGRAMS_051_100[job?.id];
 if(typeof program?.run!=='function')
  throw Error('IMC C 組還沒有這個效果的處理函式：'+job?.id);
 return program.run(pack,state,job);
}
