// Local SQLite adapter. The same statements run inside Cloudflare Durable
// Objects; this file is only the Node process's file-backed database.
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {SCHEMA} from './repos.mjs';

export function openDatabase(file){
 mkdirSync(dirname(file),{recursive:true});
 try{
  const head=readFileSync(file).subarray(0,1).toString('utf8');
  if(head==='{')throw Error('帳號資料已改為 SQLite。請把 UA_DATA_FILE 指到新的 .sqlite 檔，不要覆寫舊的 JSON。');
 }catch(error){
  if(error?.code!=='ENOENT')throw error;
 }
 const db=new DatabaseSync(file);
 db.exec('PRAGMA journal_mode=WAL');
 db.exec('PRAGMA busy_timeout=5000');
 db.exec('PRAGMA foreign_keys=ON');
 db.exec(SCHEMA);
 return {
  exec(query){db.exec(query);},
  run(query,...params){db.prepare(query).run(...params);},
  get(query,...params){return db.prepare(query).get(...params)||null;},
  all(query,...params){return db.prepare(query).all(...params);},
  transaction(fn){
   db.exec('BEGIN IMMEDIATE');
   try{
    const value=fn();
    db.exec('COMMIT');
    return value;
   }catch(error){
    try{db.exec('ROLLBACK');}catch{/* The original error is the one to surface. */}
    throw error;
   }
  },
  close(){db.close();}
 };
}
