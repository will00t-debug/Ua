// Offline constrained update on the positions v4-B and v4-B.2 already stored.
// No new training loop. A feasible step is not adopted.
import {loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash} from '../../v4a/lib/store.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HASH_INDEX,pairwiseSwing} from '../../v4b1/lib/feasibility.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {minimumStep} from '../../v4b2/lib/step.mjs';
import {HARD_CAP,OFFICIAL_NODES,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {comparisonP,labelTiers} from './labels.mjs';
import {fitTarget,keepsAll,minimumImpact,selectionAudit} from './search.mjs';

export const CODE_VERSION='v4b3-1';

function preferredOf(row){
 return row.mean>0?row.actionA:row.actionB;
}
function otherOf(row){
 return row.mean>0?row.actionB:row.actionA;
}
function cardOf(band,key){
 const row=(band||[]).find(item=>item.key===key);
 return cardsOf(row?.features).join(',')||null;
}
function roleOf(chosen,preferredKey,otherKey){
 if(chosen===preferredKey)return 'aligned';
 if(chosen===otherKey)return 'opposed';
 return 'third';
}
export function budgetClass(row,role,boxFeasible){
 if(!row?.usable)return 'insufficient';
 if(role==='aligned')return 'aligned';
 if(role==='third')return 'uncompared-choice';
 if(boxFeasible)return 'learnable';
 return 'beyond-one-step';
}
function multiplicity(judgments){
 const tiers=labelTiers(judgments);
 return tiers.map((tier,index)=>{
  const row=judgments[index];
  const se=(row.high-row.low)/(2*1.96);
  return {
   id:row.id,bucket:row.bucket,opponent:row.opponent,n:row.n,mean:row.mean,
   low:row.low,high:row.high,usable:row.usable===true,
   z:se>1e-12?row.mean/se:0,p:tier.p,adjusted:tier.adjusted
  };
 });
}
function watchOf(parent,source,positions,judgments){
 const judged=new Map((judgments||[]).map(row=>[row.id,row]));
 const tiers=new Map(labelTiers(judgments||[]).map(row=>[row.id,row]));
 const rows=[];
 for(const position of positions||[]){
  if(!position?.band||position.band.length<2)continue;
  const judgment=judged.get(position.id)||null;
  const current=chooseKey(position.band,parent,SCALE);
 const preferred=judgment?.usable?preferredOf(judgment):null;
 const other=judgment?.usable?otherOf(judgment):null;
 const role=preferred?roleOf(current,preferred.key,other.key):null;
  rows.push({
   id:position.id,source,bucket:position.bucket,opponent:position.opponent,
   seed:position.seed,band:position.band,judgment,tier:tiers.get(position.id)||null,
   current,preferred,other,role,
   anchor:judgment?.usable===true&&tiers.get(position.id)?.adjusted===true&&role==='aligned'
  });
 }
 return rows;
}
function dedupe(rows){
 const seen=new Set();
 const out=[];
 for(const row of rows){
  if(seen.has(row.id))continue;
  seen.add(row.id);
  out.push(row);
 }
 return out;
}
function publicChange(row,policy){
 const after=chooseKey(row.band,policy,SCALE);
 return {
  id:row.id,source:row.source,bucket:row.bucket,opponent:row.opponent,
  before:row.current,after,
  beforeCard:cardOf(row.band,row.current),afterCard:cardOf(row.band,after),
  changed:after!==row.current
 };
}
function rayView(parent,target){
 const step=minimumStep(parent,target.band,target.preferred.key,target.other.key);
 const audit=selectionAudit(step.policy,target.band,target.preferred.key,target.other.key);
 return {
  status:step.status,alpha:step.alpha??null,maxAbs:step.maxAbs??0,hashMoved:step.hashMoved??0,
  flipped:step.flipped===true,policy:step.policy,
  chosen:audit.chosen,pair:audit.pair,third:audit.third
 };
}
function compactFit(fit){
 if(!fit)return null;
 return {ok:fit.ok===true,status:fit.status,objective:fit.objective??null};
}
export function analyze(parent,rounds){
 const watch=dedupe(rounds.flatMap(round=>watchOf(parent,round.source,round.positions,round.judgments)));
 const screens=rounds.map(round=>({source:round.source,rows:multiplicity(round.judgments||[])}));
 const learning=watch.filter(row=>row.judgment?.usable===true&&row.role==='opposed');
 const anchors=watch.filter(row=>row.anchor);
 const learningIds=new Set(learning.map(row=>row.id));
 const protectedRows=watch.filter(row=>!learningIds.has(row.id));
 const targets=[];
 for(const target of learning){
  const swing=pairwiseSwing(parent,target.preferred,target.other,{frozen:HASH_INDEX});
  const openSwing=pairwiseSwing(parent,target.preferred,target.other,{frozen:[]});
  const named=fitTarget(parent,target.band,target.preferred.key,{freezeHash:true});
  const hashFree=named.ok?null:fitTarget(parent,target.band,target.preferred.key,{freezeHash:false});
  const ray=rayView(parent,target);
  const guards=protectedRows.filter(row=>row.id!==target.id).map(row=>({
   id:row.id,hard:row.anchor,keepKey:row.current,band:row.band
  }));
  const impact=minimumImpact(parent,{band:target.band,keepKey:target.preferred.key},guards,{freezeHash:true});
  let blocking=[];
  if(impact.status==='anchor-infeasible'){
   blocking=anchors.filter(row=>row.id!==target.id).filter(row=>{
    const trial=keepsAll(parent,{band:target.band,keepKey:target.preferred.key},[{band:row.band,keepKey:row.current}]);
    return !trial.ok;
   }).map(row=>row.id);
  }
  const policy=impact.ok?impact.policy:null;
  const changed=policy?watch.filter(row=>row.id!==target.id&&chooseKey(row.band,policy,SCALE)!==row.current).map(row=>publicChange(row,policy)):[];
  const rayChanged=watch.filter(row=>row.id!==target.id&&chooseKey(row.band,ray.policy,SCALE)!==row.current).map(row=>publicChange(row,ray.policy));
  const rayThird=watch.filter(row=>row.judgment?.usable===true&&row.id!==target.id&&selectionAudit(ray.policy,row.band,row.preferred.key,row.other.key).third).map(row=>row.id);
  targets.push({
   id:target.id,source:target.source,bucket:target.bucket,opponent:target.opponent,
   n:target.judgment.n,mean:target.judgment.mean,low:target.judgment.low,high:target.judgment.high,
   p:comparisonP(target.judgment),adjusted:target.tier?.adjusted===true,
   preferred:target.preferred.key,other:target.other.key,
   preferredCard:cardOf(target.band,target.preferred.key),otherCard:cardOf(target.band,target.other.key),
   swing:{gap:swing.gap,named:swing.swing,open:openSwing.swing,clears:swing.clears,openClears:openSwing.clears},
   currentCard:cardOf(target.band,target.current),band:target.band.length,
   named:compactFit(named),hashFree:compactFit(hashFree),
   ray:{status:ray.status,alpha:ray.alpha,maxAbs:ray.maxAbs,hashMoved:ray.hashMoved,flipped:ray.flipped,third:ray.third,chosen:ray.chosen,changes:rayChanged,thirdLabels:rayThird},
   search:impact.ok?{
    ok:true,status:impact.status,objective:impact.objective,weights:impact.weights,
    necessary:impact.necessary,conditional:impact.conditional,changed:changed.map(row=>row.id),
    blocking
   }:{ok:false,status:impact.status,blocking,objective:null,weights:[],necessary:[],conditional:[],changed:[]},
   changes:changed,
   keptTarget:policy?chooseKey(target.band,policy,SCALE)===target.preferred.key:false
  });
 }
 const judged=watch.filter(row=>row.judgment);
 const classes=judged.map(row=>{
  const feasible=row.role==='opposed'?targets.some(item=>item.id===row.id&&(item.named?.ok||item.search?.ok)):false;
  return {
   id:row.id,source:row.source,bucket:row.bucket,opponent:row.opponent,
   usable:row.judgment.usable===true,role:row.role,attempts:row.judgment.attempts,
   finished:row.judgment.finished,games:(row.judgment.finished||0)*2,
   kind:budgetClass(row.judgment,row.role,feasible)
  };
 });
 return {
  codeVersion:CODE_VERSION,
  official:v2Hash(),
  limits:{nodes:OFFICIAL_NODES,hardCap:HARD_CAP,clip:WEIGHT_CLIP,stepCap:STEP_CAP,scale:SCALE},
  adopted:false,promoted:false,
  watch:watch.length,
  anchors:anchors.map(row=>({id:row.id,source:row.source,bucket:row.bucket,opponent:row.opponent,card:cardOf(row.band,row.current)})),
  screens,targets,classes
 };
}
export function loadStudy(){
 const parent=loadModel(V2_FILE).policy;
 const rounds=[
  {
   source:'v4b2',
   positions:readJson('training/white-sword-ai/v4b2/pool.json',{positions:[]}).positions,
   judgments:readJson('training/white-sword-ai/v4b2/judgments.json',[])
  },
  {
   source:'v4b',
   positions:readJson('training/white-sword-ai/v4b/selected.json',{positions:[]}).positions,
   judgments:readJson('training/white-sword-ai/v4b/judgments.json',[])
  }
 ];
 return analyze(parent,rounds);
}
