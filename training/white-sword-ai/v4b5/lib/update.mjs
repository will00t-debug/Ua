// One confirmed energy-line play, searched inside the existing one-step box.
// The candidate is not written onto v2.
import {POLICY_INDEX,POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash} from '../../v4a/lib/store.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HASH_INDEX} from '../../v4b1/lib/feasibility.mjs';
import {SCALE} from '../../v4b2/lib/protocol.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {actionLabel} from '../../v4b4/lib/round.mjs';
import {minimumImpact} from '../../v4b3/lib/search.mjs';
import {CODE_VERSION,TARGET_ID} from './protocol.mjs';

const ANCHOR_ID='525ea92d';

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
function labelOf(row){
 if(!row)return '沒有這個動作';
 return actionLabel(row.key,cardsOf(row.features).join(',')||null);
}
function best(rows,policy){
 const key=chooseKey(rows,policy,SCALE);
 return rows.find(row=>row.key===key)||null;
}
export function sameCardLine(position,policy){
 const plays=(position.band||[]).map(row=>({row,parsed:parsed(row.key),card:cardsOf(row.features).join(',')}))
  .filter(item=>item.parsed.type==='play'&&(item.parsed.line==='front'||item.parsed.line==='energy')&&item.card);
 const cards=[...new Set(plays.map(item=>item.card))];
 const pairs=[];
 for(const card of cards){
  const group=plays.filter(item=>item.card===card);
  const fronts=group.filter(item=>item.parsed.line==='front').map(item=>item.row);
  const energies=group.filter(item=>item.parsed.line==='energy').map(item=>item.row);
  if(!fronts.length||!energies.length)continue;
  pairs.push({card,front:best(fronts,policy),energy:best(energies,policy)});
 }
 const current=chooseKey(position.band,policy,SCALE);
 return pairs.find(pair=>pair.front.key===current||pair.energy.key===current)||pairs[0]||null;
}
export function describePosition(parent,policy,position,source){
 const beforeKey=chooseKey(position.band,parent,SCALE);
 const afterKey=chooseKey(position.band,policy,SCALE);
 const before=position.band.find(row=>row.key===beforeKey);
 const after=position.band.find(row=>row.key===afterKey);
 const line=sameCardLine(position,parent);
 const currentLine=line&&line.front.key===beforeKey?'front':line&&line.energy.key===beforeKey?'energy':null;
 return {
  id:position.id,source,bucket:position.bucket,opponent:position.opponent,
  seed:position.seed,actor:position.actor,
  beforeKey,afterKey,beforeLabel:labelOf(before),afterLabel:labelOf(after),
  changed:beforeKey!==afterKey,
  line:line?{
   card:line.card,frontKey:line.front.key,energyKey:line.energy.key,currentLine,
   frontLabel:labelOf(line.front),energyLabel:labelOf(line.energy)
  }:null
 };
}
function loadRows(file,source){
 return (readJson(file,{positions:[]}).positions||[]).filter(position=>position?.band?.length>=2)
  .map(position=>({...position,source}));
}
export function savedPositions(){
 const rows=[
  ...loadRows('training/white-sword-ai/v4b2/pool.json','v4b2'),
  ...loadRows('training/white-sword-ai/v4b/selected.json','v4b')
 ];
 const seen=new Set();
 const out=[];
 for(const row of rows){
  if(seen.has(row.id))continue;
  seen.add(row.id);
  out.push(row);
 }
 return out;
}
function apply(parent,delta){
 return parent.map((weight,index)=>weight+(delta[index]||0));
}
export function searchUpdate(parent,positions){
 const target=positions.find(position=>position.id===TARGET_ID);
 if(!target)throw Error('找不到已確認的能量線局面');
 const keepKey=target.actionB.key;
 const guards=positions.filter(position=>position.id!==target.id).map(position=>({
  id:position.id,
  hard:position.id.startsWith(ANCHOR_ID),
  keepKey:chooseKey(position.band,parent,SCALE),
  band:position.band
 }));
 const impact=minimumImpact(parent,{band:target.band,keepKey},guards,{freezeHash:true});
 if(!impact.ok){
  return {
   codeVersion:CODE_VERSION,official:v2Hash(),ok:false,status:impact.status,
   adopted:false,recommended:false,weights:[],changes:[],rows:[]
  };
 }
 const policy=apply(parent,impact.delta);
 const rows=positions.map(position=>describePosition(parent,policy,position,position.source));
 const byId=new Map(rows.map(row=>[row.id,row]));
 const necessary=new Set(impact.necessary||[]);
 const changes=(impact.changed||[]).map(id=>{
  const row=byId.get(id);
  return {...row,necessary:necessary.has(id)};
 });
 const hashMoved=HASH_INDEX.some(index=>Math.abs(impact.delta[index]||0)>1e-8);
 const weights=(impact.weights||[]).map(row=>{
  const index=POLICY_INDEX[row.name];
  return {name:row.name,delta:row.delta,before:parent[index],after:parent[index]+row.delta};
 });
 return {
  codeVersion:CODE_VERSION,
  official:v2Hash(),
  ok:true,
  status:impact.status,
  adopted:false,
  recommended:false,
  objective:impact.objective,
  hashMoved,
  keptTarget:chooseKey(target.band,policy,SCALE)===keepKey,
  target:{
   id:target.id,bucket:target.bucket,opponent:target.opponent,
   before:labelOf(target.band.find(row=>row.key===target.actionA.key)),
   after:labelOf(target.band.find(row=>row.key===keepKey))
  },
  weights,
  necessary:impact.necessary||[],
  conditional:impact.conditional||[],
  changes,
  rows,
  delta:impact.delta,
  policy
 };
}
export function loadUpdate(){
 return searchUpdate(loadModel(V2_FILE).policy,savedPositions());
}
export function featureName(index){
 return POLICY_NAMES[index];
}
