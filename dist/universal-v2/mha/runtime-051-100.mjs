// D group owns this file. Closed jobs for MHA-1-051 through MHA-1-100.
// Cards in the battle pack use the shared DSL. An unknown id fails closed.
import {MHA_PROGRAMS_051_100} from './programs-051-100.mjs';

export function runMha051(pack,state,job){
 const program=MHA_PROGRAMS_051_100[job?.id];
 if(typeof program?.run!=='function')
  throw Error('MHA D 組還沒有這個效果的處理函式：'+job?.id);
 return program.run(pack,state,job);
}
