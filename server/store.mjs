// Single-process JSON file for accounts, sessions and decks.
// Match state stays in memory and is never written here.
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

const empty=()=>({users:{},sessions:{},decks:{}});

export async function openJsonStore(file){
 let state;
 try{
  state=JSON.parse(await readFile(file,'utf8'));
 }catch(error){
  if(error?.code!=='ENOENT')throw error;
  state=empty();
 }
 if(!state||typeof state!=='object'||Array.isArray(state)||
  !state.users||!state.sessions||!state.decks||
  typeof state.users!=='object'||typeof state.sessions!=='object'||typeof state.decks!=='object')
  throw Error('帳號資料格式不正確：'+file);
 return {
  file,state,
  async save(){
   await mkdir(dirname(file),{recursive:true});
   const tmp=file+'.tmp';
   await writeFile(tmp,JSON.stringify(this.state));
   await rename(tmp,file);
  }
 };
}
