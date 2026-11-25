// The v5-B.1 fair schedule, with the baseline and the candidate kept on the same cells.
import {CELLS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {MATCH_OPPONENTS} from '../../v5b/lib/protocol.mjs';
import {MATCH_GAMES,MATCH_SEEDS} from './protocol.mjs';

function hardSeat(deckId){
 return {deckId,policy:'hard-search-2',residual:false,modelRole:'none'};
}
function sword(role){
 if(role==='none')return {deckId:'white-sword',policy:'white-sword',residual:false,modelRole:'none'};
 return {deckId:'white-sword',policy:'white-sword',residual:true,modelRole:role};
}
export function fairSpecs({seeds=MATCH_SEEDS,baseline=false}={}){
 if(seeds.length!==16)throw Error('診斷種子不是 16 個');
 const base=baseline?'baseline':'none';
 const specs=[];
 for(const opponent of MATCH_OPPONENTS){
  seeds.forEach((seed,index)=>{
   if(opponent==='white-sword'){
    for(const cell of CELLS){
     const seats=[sword(base),sword(base)];
     seats[cell.specialistSeat]=sword('candidate');
     specs.push({seed,opponent,arm:'mirror',specialistSeat:cell.specialistSeat,first:cell.first,seats});
    }
    return;
   }
   const specialistSeat=index%2;
   for(const first of [0,1]){
    for(const arm of ['v2','residual']){
     const seats=[hardSeat(opponent),hardSeat(opponent)];
     seats[specialistSeat]=sword(arm==='residual'?'candidate':base);
     specs.push({seed,opponent,arm,specialistSeat,first,seats});
    }
   }
  });
 }
 return specs;
}
export function assertSchedule(specs){
 if(specs.length!==MATCH_GAMES)throw Error('診斷不是 192 場');
 const mirror=specs.filter(spec=>spec.opponent==='white-sword');
 if(mirror.length!==64)throw Error('鏡像不是 64 場');
 if(mirror.filter(spec=>spec.specialistSeat===spec.first).length!==32)throw Error('鏡像先攻不是一半');
 if(new Set(mirror.map(spec=>spec.specialistSeat+':'+spec.first)).size!==4)throw Error('鏡像沒有四種座位與先後攻');
 const played=specs.filter(spec=>spec.arm!=='v2');
 if(played.every(spec=>spec.specialistSeat===spec.first))throw Error('候選仍然每場先攻');
 if(played.filter(spec=>spec.specialistSeat===spec.first).length!==played.length/2)throw Error('候選先攻不是一半');
 for(const opponent of ['reject-blue','renruki']){
  const rows=specs.filter(spec=>spec.opponent===opponent);
  if(rows.filter(spec=>spec.specialistSeat===0).length!==32)throw Error(opponent+' 的座位沒有對半');
  const groups=new Map();
  for(const row of rows){
   const key=[row.seed,row.specialistSeat,row.first].join(':');
   groups.set(key,[...(groups.get(key)||[]),row.arm]);
  }
  if(groups.size!==32)throw Error(opponent+' 的配對格不是 32');
  for(const arms of groups.values()){
   if(arms.length!==2||!arms.includes('v2')||!arms.includes('residual'))throw Error(opponent+' 的配對不完整');
  }
 }
}
export function kindTotals(rows){
 const kinds={};
 for(const row of rows||[]){
  if(row.arm==='v2')continue;
  for(const [kind,count] of Object.entries(row.changeKinds||{}))kinds[kind]=(kinds[kind]||0)+(count||0);
 }
 return kinds;
}
