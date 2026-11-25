// Build reproducible match specs. Models travel with the spec; workers do not read weight files.
import {CELLS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {HARD_CAP,HARD_DECK,SCALE,EXPLORE} from './protocol.mjs';

export function modelSeat(model){
 return {
  deckId:'white-sword',policy:'white-sword',model,
  mode:'blend',scale:SCALE,hardCap:HARD_CAP,explore:EXPLORE
 };
}
export function hardSeat(deckId){
 return {deckId,policy:'hard-search-2',model:null,mode:'policy',explore:0,scale:0};
}
function cellsOf(count){
 if(count>CELLS.length)throw Error('Cell count exceeds the registered seat grid');
 return CELLS.slice(0,count);
}
export function buildStageSpecs({
 stage,round,candidates,champion,historical,seeds,cells,opponents
}){
 const grid=cellsOf(cells);
 const specs=[];
 for(let index=0;index<candidates.length;index++){
  const candidate=candidates[index];
  const peer=candidates[(index+1)%candidates.length];
  for(const seed of seeds){
   for(const cell of grid){
    for(const opponentKind of opponents){
     specs.push(oneSpec({
      stage,round,candidate,champion,historical,peer,seed,cell,opponentKind,role:'candidate'
     }));
    }
   }
  }
 }
 return specs;
}
function oneSpec({stage,round,candidate,champion,historical,peer,seed,cell,opponentKind,role}){
 let opponent;
 let opponentId;
 let historicalSame=false;
 if(opponentKind==='champion'||opponentKind==='historical'){
  const source=opponentKind==='champion'?champion:historical;
  opponent=modelSeat(source.model);
  opponentId=source.id;
  historicalSame=opponentKind==='historical'&&!!source.same;
 }else if(opponentKind==='peer'){
  opponent=modelSeat(peer.model);
  opponentId=peer.id;
 }else if(HARD_DECK[opponentKind]){
  opponent=hardSeat(HARD_DECK[opponentKind]);
  opponentId=HARD_DECK[opponentKind];
 }else throw Error('Unknown opponent '+opponentKind);
 const seats=[null,null];
 seats[cell.specialistSeat]=modelSeat(candidate.model);
 seats[1-cell.specialistSeat]=opponent;
 const spec={
  round,stage,role,candidateId:candidate.id,opponentKind,opponentId,historicalSame,
  seed,first:cell.first,specialistSeat:cell.specialistSeat,
  opponentDeck:opponent.deckId,
  label:'v4a/'+stage+'/'+candidate.id+'/'+opponentKind,
  seats,keepActions:true,keepSamples:false
 };
 spec.key=[round,stage,role,candidate.id,seed,cell.first,cell.specialistSeat,opponentKind,opponent.deckId].join('|');
 return spec;
}
export function buildStageCSpecs({round,challenger,champion,pairedSeeds,mirrorSeeds,decks,cells}){
 const grid=cellsOf(cells);
 const specs=[];
 for(const seed of pairedSeeds){
  for(const cell of grid){
   for(const deckId of decks){
    const kind=deckId==='white-sword'?'hard-white':deckId==='reject-blue'?'hard-reject':'hard-renruki';
    specs.push(pairedSeat({
     round,seed,cell,deckId,kind,model:challenger.model,candidateId:challenger.id,role:'challenger'
    }));
    specs.push(pairedSeat({
     round,seed,cell,deckId,kind,model:champion.model,candidateId:champion.id,role:'baseline'
    }));
   }
  }
 }
 for(const seed of mirrorSeeds){
  for(const cell of grid){
   const opponent=modelSeat(champion.model);
   const seats=[null,null];
   seats[cell.specialistSeat]=modelSeat(challenger.model);
   seats[1-cell.specialistSeat]=opponent;
   const spec={
    round,stage:'stage-c-mirror',role:'mirror',candidateId:challenger.id,
    opponentKind:'champion',opponentId:champion.id,historicalSame:false,
    seed,first:cell.first,specialistSeat:cell.specialistSeat,opponentDeck:'white-sword',
    label:'v4a/mirror/'+challenger.id,seats,keepActions:true,keepSamples:false
   };
   spec.key=[round,'stage-c-mirror','mirror',challenger.id,seed,cell.first,cell.specialistSeat,'champion','white-sword'].join('|');
   specs.push(spec);
  }
 }
 return specs;
}
function pairedSeat({round,seed,cell,deckId,kind,model,candidateId,role}){
 const opponent=hardSeat(deckId);
 const seats=[null,null];
 seats[cell.specialistSeat]=modelSeat(model);
 seats[1-cell.specialistSeat]=opponent;
 const spec={
  round,stage:'stage-c',role,candidateId,opponentKind:kind,opponentId:deckId,historicalSame:false,
  seed,first:cell.first,specialistSeat:cell.specialistSeat,opponentDeck:deckId,
  label:'v4a/stage-c/'+role+'/'+deckId,seats,keepActions:true,keepSamples:false
 };
 spec.key=[round,'stage-c',role,candidateId,seed,cell.first,cell.specialistSeat,kind,deckId].join('|');
 return spec;
}
