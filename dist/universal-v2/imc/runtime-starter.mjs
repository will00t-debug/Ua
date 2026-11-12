// D group owns this file. Closed IMC jobs for UA55ST IMC-1-101 through IMC-1-113.
import {IMC_PROGRAMS_STARTER} from './programs-starter.mjs';

export function runImcStarter(pack,state,job){
 const program=IMC_PROGRAMS_STARTER[job?.id];
 if(typeof program?.run!=='function')
  throw Error('IMC D 組還沒有這個效果的處理函式：'+job?.id);
 return program.run(pack,state,job);
}
