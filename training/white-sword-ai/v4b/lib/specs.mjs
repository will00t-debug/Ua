// Pilot match list. 10 seeds, 4 seats, 5 opponent slots = 200 games.
import {CELLS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {cloneModel,loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson} from '../../v4a/lib/store.mjs';
import {HARD_CAP,PILOT_SEEDS,SCALE,assertFreshPlan} from './protocol.mjs';

const V2='training/white-sword-ai/weights/v2-capped.json';
const MARGIN='training/white-sword-ai/v4a2/candidates/v4a2-r0001-c1-a066cb4bea2e.json';
const ELITES='training/white-sword-ai/v4a/explore-state.json';

function modelSeat(model){
 return {
  deckId:'white-sword',policy:'white-sword',model,
  mode:'blend',scale:SCALE,hardCap:HARD_CAP,explore:0
 };
}
function hardSeat(deckId){
 return {deckId,policy:'hard-search-2',model:null,mode:'policy',explore:0,scale:0};
}
export function loadOpponents(){
 const parent=loadModel(V2);
 parent.promoted=false;
 parent.promotion=null;
 const margin=readJson(MARGIN);
 const eliteRow=readJson(ELITES,{elites:[]}).elites?.[0];
 if(!margin?.model?.policy||!eliteRow?.policy)throw Error('v4-A.2 候選或跨輪精英不在');
 if(margin.model.policy.length!==parent.policy.length||eliteRow.policy.length!==parent.policy.length)
  throw Error('對手權重寬度與 v2 不同');
 const elite=cloneModel(parent);
 elite.policy=eliteRow.policy.slice();
 elite.version=eliteRow.id;
 elite.promoted=false;
 return {parent,margin:margin.model,elite,marginId:margin.id,eliteId:eliteRow.id};
}
export function pilotSpecs(opponents){
 assertFreshPlan(PILOT_SEEDS,'pilot');
 const specs=[];
 for(const seed of PILOT_SEEDS){
  for(const cell of CELLS){
   for(const kind of ['v2','hard-white','hard-reject','hard-renruki','alternate']){
    const slot=kind==='alternate'?(seed%2===0?'v4a2':'elite'):kind;
    specs.push(one(seed,cell,slot,opponents));
   }
  }
 }
 if(specs.length!==200)throw Error('pilot 場數不是 200');
 return specs;
}
function one(seed,cell,slot,opponents){
 const learner=modelSeat(opponents.parent);
 let opponent;
 let opponentKind=slot;
 if(slot==='v2')opponent=modelSeat(opponents.parent);
 else if(slot==='v4a2')opponent=modelSeat(opponents.margin);
 else if(slot==='elite')opponent=modelSeat(opponents.elite);
 else if(slot==='hard-white')opponent=hardSeat('white-sword');
 else if(slot==='hard-reject')opponent=hardSeat('reject-blue');
 else if(slot==='hard-renruki')opponent=hardSeat('renruki');
 else throw Error('未知對手 '+slot);
 const seats=[null,null];
 seats[cell.specialistSeat]=learner;
 seats[1-cell.specialistSeat]=opponent;
 const spec={
  stage:'v4b-pilot',round:1,role:'pilot',candidateId:'v2',opponentKind,
  seed,first:cell.first,specialistSeat:cell.specialistSeat,
  opponentDeck:opponent.deckId,label:'v4b/pilot/'+opponentKind,seats,
  keepActions:false,keepSamples:false
 };
 spec.key=['v4b',seed,cell.first,cell.specialistSeat,opponentKind,opponent.deckId].join('|');
 return spec;
}
