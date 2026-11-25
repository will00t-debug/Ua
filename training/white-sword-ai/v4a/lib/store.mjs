// Persistence for one experimental lineage. Production weight files are read-only.
import {createHash} from 'node:crypto';
import {appendFileSync,mkdirSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {hostname} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cloneModel,loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT=join(HERE,'..');
export const REPO_ROOT=join(HERE,'../../../..');
export const V2_FILE=join(REPO_ROOT,'training/white-sword-ai/weights/v2-capped.json');
export const V1_FILE=join(REPO_ROOT,'training/white-sword-ai/weights/v1-selfplay.json');
export const V0_FILE=join(REPO_ROOT,'training/white-sword-ai/weights/v0-teacher.json');
export const DEFAULT_DOCS=join(REPO_ROOT,'docs/white-sword-ai/v4a');

export function v2Bytes(){
 return readFileSync(V2_FILE);
}
export function v2Hash(){
 return createHash('sha256').update(v2Bytes()).digest('hex');
}
export function loadParents(){
 return {v2:loadModel(V2_FILE),v1:loadModel(V1_FILE),v0:loadModel(V0_FILE)};
}
export function assertWritable(file){
 const norm=resolve(file).replaceAll('\\','/');
 if(norm.includes('/training/white-sword-ai/weights/'))throw Error('Refusing to write a production weight file');
 if(norm.endsWith('/v2-capped.json'))throw Error('Refusing to write the official v2 weights');
}
export function writeText(file,value){
 assertWritable(file);
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,value);
}
export function writeJson(file,value){
 assertWritable(file);
 mkdirSync(dirname(file),{recursive:true});
 const temp=file+'.tmp';
 writeFileSync(temp,JSON.stringify(value,null,2));
 renameSync(temp,file);
}
export function readJson(file,fallback=null){
 try{return JSON.parse(readFileSync(file,'utf8'));}
 catch(error){
  if(error?.code==='ENOENT')return fallback;
  throw error;
 }
}
export function appendJsonl(file,value){
 assertWritable(file);
 mkdirSync(dirname(file),{recursive:true});
 appendFileSync(file,JSON.stringify(value)+'\n');
}
export function readJsonl(file){
 try{
  const text=readFileSync(file,'utf8');
  if(!text.trim())return [];
  return text.split('\n').filter(Boolean).map(line=>JSON.parse(line));
 }catch(error){
  if(error?.code==='ENOENT')return [];
  throw error;
 }
}
export function roundDir(root,profile,round){
 if(profile==='smoke')return join(root,'rounds','smoke');
 return join(root,'rounds',String(round).padStart(4,'0'));
}
export function ledgerFile(root){
 return join(root,'seed-ledger.json');
}
export function championFile(root){
 return join(root,'champion','current.json');
}
function alive(pid){
 if(!Number.isInteger(pid)||pid<=0)return false;
 try{process.kill(pid,0);return true;}
 catch{return false;}
}
export function acquireLock(root){
 const file=join(root,'champion.lock');
 mkdirSync(root,{recursive:true});
 const body={pid:process.pid,host:hostname(),at:new Date().toISOString()};
 const held=lock=>{
  if(!lock||!Number.isFinite(Date.parse(lock.at)))return false;
  if(Date.now()-Date.parse(lock.at)>6*60*60*1000)return false;
  if(lock.host===hostname()&&lock.pid===process.pid)return false;
  if(lock.host===hostname())return alive(lock.pid);
  return true;
 };
 try{
  writeFileSync(file,JSON.stringify(body),{flag:'wx'});
 }catch(error){
  if(error?.code!=='EEXIST')throw error;
  let current=null;
  try{current=JSON.parse(readFileSync(file,'utf8'));}
  catch{current=null;}
  if(held(current))throw Error('另一輪正在更新實驗冠軍，這一輪已停止');
  writeFileSync(file,JSON.stringify(body));
 }
 return ()=>rmSync(file,{force:true});
}
export function ensureChampion(root){
 const file=championFile(root);
 const existing=readJson(file);
 if(existing)return existing;
 const model=cloneModel(loadModel(V2_FILE));
 model.v4a={
  kind:'experimental-champion',production:false,deployed:false,
  origin:'training/white-sword-ai/weights/v2-capped.json',
  originVersion:model.version,round:0,candidateId:null,
  note:'初始實驗冠軍是凍結的 v2 權重。這個檔案不是正式權重。'
 };
 writeJson(file,model);
 return model;
}
export function writeExperimentalChampion(root,candidate,judgment){
 const model=cloneModel(candidate.model);
 model.promoted=false;
 model.deployed=false;
 model.liveDefault='hard-search-2';
 model.promotion=null;
 model.v4a={
  kind:'experimental-champion',production:false,deployed:false,
  origin:'evolution',round:candidate.round,candidateId:candidate.id,
  method:candidate.method,judgment,
  note:'實驗冠軍。沒有部署，也不會取代正式版 v2。'
 };
 writeJson(championFile(root),model);
 writeJson(join(root,'champions',candidate.id+'.json'),model);
 return model;
}
export function haltFile(root){
 return join(root,'halt.json');
}
export function readHalt(root){
 return readJson(haltFile(root));
}
export function writeHalt(root,reason,round){
 writeJson(haltFile(root),{
  reason,round:round??null,at:new Date().toISOString()
 });
}
export function clearHalt(root){
 rmSync(haltFile(root),{force:true});
}
export function roundNumbers(root){
 try{
  return readdirSync(join(root,'rounds'))
   .filter(name=>/^[0-9]{4}$/.test(name))
   .map(name=>Number(name))
   .sort((a,b)=>a-b);
 }catch(error){
  if(error?.code==='ENOENT')return [];
  throw error;
 }
}
