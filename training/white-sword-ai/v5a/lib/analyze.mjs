// Offline feasibility of a frozen-v2 residual. Reads saved games and does not fit.
import {loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {V2_FILE,readJson,v2Hash} from '../../v4a/lib/store.mjs';
import {explainHashes,hashBin,signatureOf} from '../../v4b9/lib/hash.mjs';
import {keepRecord,summarizeUses,trainingUse} from './evidence.mjs';
import {
 actionLead,hashPressure,isPlay,linePlayOccupancy,oneStepRoom,rebucket,sideKey,signatureReach,stepsUntil
} from './pressure.mjs';
import {
 CONSTRAINTS,EVIDENCE_PRIOR,MAX_ACCUMULATED_STEPS,OFFICIAL_V2,uniqueNamedFeatures,assertOfficialLimits
} from './protocol.mjs';

const POSITION_FILES=[
 'training/white-sword-ai/v4b2/pool.json',
 'training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b5/mine.json',
 'training/white-sword-ai/v4b7/mine.json',
 'training/white-sword-ai/v4b8/mine.json',
 'training/white-sword-ai/v4b9/mine.json'
];
const HARM_ID='0d035ea8a0b2be16';

export function positionsOf(data){
 const rows=[];
 if(Array.isArray(data?.positions))rows.push(...data.positions);
 if(Array.isArray(data?.games)){
  for(const game of data.games)rows.push(...(game.positions||[]));
 }
 return rows.filter(row=>row?.id&&row.band?.length>=2);
}
export function loadPositions(files=POSITION_FILES,read=readJson){
 const byId=new Map();
 for(const file of files){
  for(const position of positionsOf(read(file,{}))){
   if(!byId.has(position.id))byId.set(position.id,position);
  }
 }
 return [...byId.values()];
}
function pairCount(row){
 if(Number.isFinite(row.n))return row.n;
 if(Number.isFinite(row.pairs)&&row.plus==null)return row.pairs;
 if(Number.isFinite(row.plus)&&Number.isFinite(row.minus)&&Number.isFinite(row.tie))return row.plus+row.minus+row.tie;
 if(Number.isFinite(row.pairs))return row.pairs;
 return null;
}
function recordFrom(row,kind,source,defaultPairs=null){
 const decisive=Number.isFinite(row.decisive)?row.decisive:Number.isFinite(row.plus)?row.plus+(row.minus||0):null;
 return {
  id:row.id,source,kind,
  confirmed:!!row.confirmed,
  harm:kind==='validation'&&row.id===HARM_ID&&!!row.confirmed,
  mean:row.mean??row.confirmMean??row.screenMean??null,
  decisive:decisive||null,
  pairs:pairCount(row)??defaultPairs,
  labelA:row.labelA||row.beforeLabel||null,
  labelB:row.labelB||row.afterLabel||null
 };
}
export function collectRecords(read=readJson){
 const found=new Map();
 const add=row=>{
  if(!row?.id)return;
  found.set(row.id,keepRecord(found.get(row.id),row));
 };
 for(const row of read('training/white-sword-ai/v4b4/round.json',{rows:[]}).rows||[]){
  add(recordFrom(row,'confirm','v4b4'));
 }
 for(const file of ['training/white-sword-ai/v4b7/catalog.json','training/white-sword-ai/v4b8/catalog.json']){
  for(const row of read(file,{rows:[]}).rows||[]){
   const paired=row.confirmMean!=null||row.confirmed;
   add(recordFrom(row,paired?'confirm':'screen',file.includes('v4b8')?'v4b8':'v4b7',paired?66:null));
  }
 }
 for(const row of read('training/white-sword-ai/v4b9/confirm.json',{rows:[]}).rows||[]){
  add(recordFrom(row,'confirm','v4b9',66));
 }
 for(const row of read('training/white-sword-ai/v4b9/study.json',{}).validation?.rows||[]){
  add(recordFrom(row,'validation','v4b9',66));
 }
 for(const row of read('training/white-sword-ai/v4b5/update.json',{}).checks||[]){
  add(recordFrom(row,'short','v4b5'));
 }
 return [...found.values()];
}
function observedSignatures(explained){
 const texts=new Set();
 for(const bin of explained.bins||[]){
  for(const row of bin.observed||[])texts.add(row.text);
 }
 return [...texts];
}
export function buildAnalysis(options={}){
 assertOfficialLimits();
 const read=options.read||readJson;
 const hash=options.hash||v2Hash();
 if(hash!==OFFICIAL_V2)throw Error('正式 v2 雜湊和這一輪登記的不一致');
 const weights=options.weights||loadModel(V2_FILE).policy;
 const positions=options.positions||loadPositions(POSITION_FILES,read);
 const records=options.records||collectRecords(read);
 const explained=explainHashes(weights,positions);
 if(explained.structural)throw Error('可還原動作的雜湊桶和向量不一致');
 const signatures=observedSignatures(explained);
 const features=uniqueNamedFeatures();
 const feature=features[0];
 const predicate=row=>isPlay(row,feature.card,feature.line);
 const byId=new Map(positions.map(position=>[position.id,position]));
 const leads=CONSTRAINTS.filter(item=>item.role==='preference').map(item=>{
  const position=byId.get(item.id);
  const lead=position?actionLead(position,weights):null;
  const steps=position?stepsUntil(position.band,weights,predicate,sideKey(position,'energy'),MAX_ACCUMULATED_STEPS):null;
  return {id:item.id,text:item.text,lead:lead?.leadA??null,steps,missing:!position};
 });
 const need=Math.max(...leads.map(item=>item.steps||0));
 const points=need*oneStepRoom();
 const reach=signatureReach(positions,weights,predicate,points);
 const preserve=CONSTRAINTS.filter(item=>item.role==='preserve').map(item=>({
  id:item.id,text:item.text,flipped:reach.flipped.includes(item.id),missing:!byId.has(item.id)
 }));
 const preferenceIds=new Set(leads.map(item=>item.id));
 const preference=leads.map(item=>({
  id:item.id,
  cleared:item.lead!=null&&item.steps!=null&&item.steps<=need&&reach.flipped.includes(item.id)
 }));
 const outside=reach.flipped.filter(id=>!preferenceIds.has(id));
 const binsOf=(card,line)=>({text:signatureOf('play',card,'',line),bin:hashBin(signatureOf('play',card,'',line))});
 const front070=binsOf('BLC-4-070','front');
 const energy070=binsOf('BLC-4-070','energy');
 const front085=binsOf('BLC-1-085','front');
 const energy009=binsOf('BLC-3-009','energy');
 const candidate=read('training/white-sword-ai/v4b9/candidate.json',{weights:[]});
 const candidateNames=(candidate.weights||[]).map(row=>row.name);
 return {
  official:hash,
  codeVersion:'v5a-1',
  fitted:false,
  adopted:false,
  positions:positions.length,
  pressure:hashPressure(positions,weights),
  occupancy:{eight:linePlayOccupancy(8),thirtyTwo:linePlayOccupancy(32)},
  collisions:{eight:rebucket(signatures,8),thirtyTwo:rebucket(signatures,32)},
  structural:explained.structural,
  unresolved:explained.mismatched,
  checked:explained.checked,
  lineBins:{front070,energy070,front085,energy009,samePair:front085.bin===energy009.bin,shares070:front085.bin===front070.bin||front085.bin===energy070.bin||energy009.bin===front070.bin||energy009.bin===energy070.bin},
  candidateNames,
  candidateMovesHash:candidateNames.some(name=>/^h[0-7]$/.test(name)),
  evidence:{prior:EVIDENCE_PRIOR,tiers:summarizeUses(records),records:records.length},
  feature:feature?signatureOf(feature.type,feature.card,'',feature.line):null,
  featureCount:features.length,
  leads,
  accumulation:{
   need,maxSteps:MAX_ACCUMULATED_STEPS,points,
   fits:need>0&&need<=MAX_ACCUMULATED_STEPS&&leads.every(item=>item.lead!=null),
   exposed:reach.exposed,flips:reach.flips,outside:outside.length,
   preserve,preference
  },
  softPairs:records.filter(record=>trainingUse(record).tier==='paired-inconclusive').map(record=>record.pairs),
  uses:records.filter(record=>record.confirmed||record.harm).map(record=>({...record,...trainingUse(record)}))
 };
}
