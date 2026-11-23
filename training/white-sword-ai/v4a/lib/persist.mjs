// Experimental state moves between runs as files with hashes.
// Nothing here writes production weights or the main branch.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {CODE_VERSION} from './protocol.mjs';

const KEEP=Object.freeze(['champion','champions','rounds','seed-ledger.json','history.json','explore-state.json','halt.json']);
const FORBIDDEN_BRANCH=new Set(['main','master','production','deploy']);

function walk(root,dir,out){
 for(const name of readdirSync(dir,{withFileTypes:true})){
  if(name.name==='champion.lock'||name.name.endsWith('.tmp'))continue;
  const path=join(dir,name.name);
  if(name.isDirectory())walk(root,path,out);
  else if(name.isFile())out.push(relative(root,path).split('\\').join('/'));
 }
}
export function stateFiles(root){
 const out=[];
 for(const name of KEEP){
  const path=join(root,name);
  if(!existsSync(path))continue;
  try{
   if(readdirSync(path))walk(root,path,out);
  }catch{
   out.push(name);
  }
 }
 return out.sort();
}
export function fingerprint(root){
 return stateFiles(root).map(file=>({
  file,sha256:createHash('sha256').update(readFileSync(join(root,file))).digest('hex')
 }));
}
function assertSafePath(file){
 const norm=file.split('\\').join('/');
 if(norm.includes('..')||norm.startsWith('/')||norm.includes('weights/')||norm.endsWith('v2-capped.json'))
  throw Error('狀態檔路徑不允許：'+file);
}
export function exportState(root,dest){
 rmSync(dest,{recursive:true,force:true});
 mkdirSync(dest,{recursive:true});
 const files=fingerprint(root);
 for(const row of files){
  assertSafePath(row.file);
  const target=join(dest,row.file);
  mkdirSync(join(target,'..'),{recursive:true});
  cpSync(join(root,row.file),target);
 }
 const running=files.some(row=>row.file.endsWith('/manifest.json')&&
  JSON.parse(readFileSync(join(dest,row.file),'utf8')).status==='running');
 const manifest={
  format:'ua-white-sword-v4a-state',codeVersion:CODE_VERSION,running,files
 };
 writeFileSync(join(dest,'state-manifest.json'),JSON.stringify(manifest,null,2));
 return manifest;
}
export function importState(bundle,root){
 const manifestPath=join(bundle,'state-manifest.json');
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 if(manifest?.format!=='ua-white-sword-v4a-state'||!Array.isArray(manifest.files))
  throw Error('實驗狀態清單損壞');
 for(const row of manifest.files){
  assertSafePath(row.file);
  const bytes=readFileSync(join(bundle,row.file));
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==row.sha256)throw Error('實驗狀態雜湊不符：'+row.file);
  if(row.file.endsWith('/manifest.json')){
   const round=JSON.parse(bytes.toString('utf8'));
   if(round.status==='running'&&round.codeVersion!==CODE_VERSION)
    throw Error('進行中的輪次是 '+round.codeVersion+'，與現在的 '+CODE_VERSION+' 不相容');
  }
 }
 mkdirSync(root,{recursive:true});
 for(const row of manifest.files){
  const target=join(root,row.file);
  mkdirSync(join(target,'..'),{recursive:true});
  cpSync(join(bundle,row.file),target);
 }
 return manifest;
}
export function publishState({repo,root,branch,remote='origin'}){
 if(FORBIDDEN_BRANCH.has(branch)||branch==='HEAD')throw Error('拒絕把實驗狀態寫進 '+branch);
 const bundle=join(repo,'.v4a-state-bundle');
 const work=join(repo,'.v4a-state-work');
 exportState(root,bundle);
 const git=(args,cwd=repo)=>execFileSync('git',args,{cwd,encoding:'utf8'});
 let hasRemote=false;
 try{hasRemote=git(['ls-remote','--heads',remote,branch]).trim().length>0;}
 catch{hasRemote=false;}
 rmSync(work,{recursive:true,force:true});
 try{
  if(hasRemote){
   git(['fetch',remote,'refs/heads/'+branch]);
   git(['worktree','add','--detach',work,'FETCH_HEAD']);
  }else{
   git(['worktree','add','--detach',work,'HEAD']);
   git(['checkout','--orphan',branch],work);
  }
  for(const name of readdirSync(work)){
   if(name==='.git')continue;
   rmSync(join(work,name),{recursive:true,force:true});
  }
  cpSync(bundle,work,{recursive:true});
  git(['add','-A'],work);
  if(!git(['status','--porcelain'],work).trim())return {pushed:false,branch};
  git(['-c','user.email=v4a-state@local','-c','user.name=v4a-state','commit','-m','Save white-sword v4-A experimental state'],work);
  git(['push',remote,'HEAD:refs/heads/'+branch],work);
  return {pushed:true,branch};
 }finally{
  rmSync(bundle,{recursive:true,force:true});
  try{ git(['worktree','remove','--force',work]);}catch{rmSync(work,{recursive:true,force:true});}
 }
}
export function loadPublishedState({repo,root,branch,remote='origin'}){
 if(FORBIDDEN_BRANCH.has(branch)||branch==='HEAD')throw Error('拒絕從 '+branch+' 讀取實驗狀態');
 const git=(args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'});
 let listed='';
 try{listed=git(['ls-remote','--heads',remote,branch]).trim();}
 catch(error){
  const failed=Error('讀取實驗狀態失敗：'+(error?.message||error));
  failed.code='V4A_STATE';
  throw failed;
 }
 if(!listed)return {loaded:false};
 git(['fetch',remote,'refs/heads/'+branch]);
 const dest=join(repo,'.v4a-state-load');
 rmSync(dest,{recursive:true,force:true});
 mkdirSync(dest,{recursive:true});
 try{
  const archive=execFileSync('git',['archive','FETCH_HEAD'],{cwd:repo});
  writeFileSync(join(dest,'archive.tar'),archive);
  execFileSync('tar',['-xf',join(dest,'archive.tar'),'-C',dest]);
  const manifest=importState(dest,root);
  return {loaded:true,files:manifest.files.length,running:manifest.running};
 }finally{
  rmSync(dest,{recursive:true,force:true});
 }
}
