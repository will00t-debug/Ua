// Public site for accounts and online matches.
// AccountBook keeps users, sessions, decks and the room directory.
// Each MatchRoom is one Durable Object: hidden cards never leave that object,
// and its SQLite storage is still there after the player's computer is off.
import {DurableObject} from 'cloudflare:workers';
import {ApiError,dispatchAccount,dispatchRoom} from '../server/domain.mjs';
import {SCHEMA,createRepositories,roomTtl} from '../server/repos.mjs';
import {durableAct,durableCancel,durableCreate,durableJoin,durableResign,durableView} from './orchestrate.mjs';

function adapt(storage){
 const sql=storage.sql;
 return {
  transaction(fn){
   let value;
   storage.transactionSync(()=>{value=fn();});
   return value;
  },
  exec(query){sql.exec(query);},
  run(query,...params){sql.exec(query,...params);},
  get(query,...params){return sql.exec(query,...params).toArray()[0]||null;},
  all(query,...params){return sql.exec(query,...params).toArray();}
 };
}
function reply(fn){
 try{return {ok:true,result:fn()};}
 catch(error){
  const status=error instanceof ApiError?error.status:500;
  const message=error instanceof ApiError?error.message:'伺服器無法完成這個操作。';
  if(!(error instanceof ApiError))console.error(error);
  return {ok:false,status,error:message};
 }
}
function stub(namespace,name){
 return typeof namespace.getByName==='function'?namespace.getByName(name):namespace.get(namespace.idFromName(name));
}
function migrate(ctx){
 ctx.storage.sql.exec(SCHEMA);
 return createRepositories(adapt(ctx.storage));
}

export class AccountBook extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.repos=migrate(ctx);
  this.sql=adapt(ctx.storage);
 }
 handle(message){
  return reply(()=>this.sql.transaction(()=>dispatchAccount(this.repos,message,Date.now())));
 }
}
export class MatchRoom extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.repos=migrate(ctx);
  this.sql=adapt(ctx.storage);
 }
 async handle(message){
  const data=reply(()=>this.sql.transaction(()=>dispatchRoom(this.repos,message,Date.now())));
  if(data.ok&&data.result?.alarmAt){
   try{await this.ctx.storage.setAlarm(data.result.alarmAt);}catch(error){console.error(error);}
  }
  if(data.ok&&message?.op==='cancel'){
   try{await this.ctx.storage.deleteAlarm();}catch{/* This room had no alarm yet. */}
  }
  return data;
 }
 async alarm(){
  const row=this.sql.get('SELECT code,status,updated_at AS updatedAt FROM rooms LIMIT 1');
  if(!row)return;
  const due=row.updatedAt+roomTtl(row.status);
  if(Date.now()<due){await this.ctx.storage.setAlarm(due);return;}
  this.sql.run('DELETE FROM rooms WHERE code=?',row.code);
  try{await stub(this.env.ACCOUNTS,'accounts').handle({op:'release',code:row.code});}
  catch(error){console.error(error);}
 }
}

function send(status,payload,headers={}){
 const body=JSON.stringify(payload);
 return new Response(body,{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin',
  ...headers
 }});
}
function cookie(token,secure){
 const maxAge=token?14*24*60*60:0;
 return 'ua_session='+(token||'')+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+maxAge+(secure?'; Secure':'');
}
function sessionToken(request){
 const header=request.headers.get('authorization')||'';
 const match=/^Bearer ([a-f0-9]{64})$/.exec(header);
 if(match)return match[1];
 const raw=request.headers.get('cookie')||'';
 for(const part of raw.split(';')){
  const index=part.indexOf('=');
  if(index<0)continue;
  if(part.slice(0,index).trim()==='ua_session')return decodeURIComponent(part.slice(index+1).trim());
 }
 return '';
}
async function readBody(request){
 if(request.method==='GET'||request.method==='HEAD')return {};
 const announced=Number(request.headers.get('content-length')||0);
 if(Number.isFinite(announced)&&announced>262144)throw new ApiError(413,'送出的資料太大。');
 const raw=await request.text();
 if(new TextEncoder().encode(raw).length>262144)throw new ApiError(413,'送出的資料太大。');
 if(!raw)return {};
 if(!(request.headers.get('content-type')||'').includes('application/json'))
  throw new ApiError(415,'請用 JSON 送出資料。');
 try{return JSON.parse(raw);}
 catch{throw new ApiError(400,'JSON 格式不正確。');}
}
async function invoke(target,message){
 let data;
 try{data=await target.handle(message);}
 catch(error){
  console.error(error);
  throw new ApiError(500,'伺服器無法完成這個操作。');
 }
 if(!data?.ok)throw new ApiError(data?.status||500,data?.error||'伺服器無法完成這個操作。');
 return data.result;
}

export default {
 async fetch(request,env){
  try{
   const url=new URL(request.url);
   const path=url.pathname;
   const method=request.method||'GET';
   if(method==='GET'&&path==='/api/health')
    return send(200,{ok:true,service:'ua-accounts',storage:'durable-object'});
   if(path.startsWith('/api/')){
    const token=sessionToken(request);
    const secure=url.protocol==='https:';
    const ip=(request.headers.get('cf-connecting-ip')||'local').slice(0,80);
    const callAccount=message=>invoke(stub(env.ACCOUNTS,'accounts'),message);
    const callRoom=(code,message)=>invoke(stub(env.ROOMS,code),message);
    if(method==='POST'&&path==='/api/register'){
     const body=await readBody(request);
     const result=await callAccount({op:'register',username:body.username,password:body.password,ip});
     return send(201,{username:result.username,token:result.token},{'set-cookie':cookie(result.token,secure)});
    }
    if(method==='POST'&&path==='/api/login'){
     const body=await readBody(request);
     const result=await callAccount({op:'login',username:body.username,password:body.password,ip});
     return send(200,{username:result.username,token:result.token},{'set-cookie':cookie(result.token,secure)});
    }
    if(method==='POST'&&path==='/api/logout'){
     await callAccount({op:'logout',token});
     return send(200,{ok:true},{'set-cookie':cookie('',secure)});
    }
    if(method==='GET'&&path==='/api/me')return send(200,await callAccount({op:'me',token}));
    if(method==='GET'&&path==='/api/decks')return send(200,await callAccount({op:'listDecks',token}));
    if(method==='POST'&&path==='/api/decks')
     return send(200,await callAccount({op:'saveDeck',token,input:await readBody(request)}));
    const deckDelete=method==='DELETE'&&/^\/api\/decks\/(d[a-f0-9]{16})$/.exec(path);
    if(deckDelete)return send(200,await callAccount({op:'deleteDeck',token,deckId:deckDelete[1]}));
    if(method==='POST'&&path==='/api/rooms'){
     const body=await readBody(request);
     const result=await durableCreate(callAccount,callRoom,{token,first:body.first,deckId:body.deckId});
     return send(201,result);
    }
    const room=path.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{8})(?:\/(join|actions|resign|cancel))?$/);
    if(room){
     const [,code,action]=room;
     if(!action&&method==='GET')return send(200,await durableView(callAccount,callRoom,{token,code}));
     if(action==='join'&&method==='POST'){
      const body=await readBody(request);
      return send(200,await durableJoin(callAccount,callRoom,{token,code,deckId:body.deckId}));
     }
     if(action==='actions'&&method==='POST'){
      const body=await readBody(request);
      return send(200,await durableAct(callAccount,callRoom,{token,code,index:body.index}));
     }
     if(action==='resign'&&method==='POST')return send(200,await durableResign(callAccount,callRoom,{token,code}));
     if(action==='cancel'&&method==='POST')return send(200,await durableCancel(callAccount,callRoom,{token,code}));
    }
    return send(404,{error:'找不到這個功能。'});
   }
   if(path==='/'){
    const home=new URL(request.url);
    home.pathname='/universal-v2-preview.html';
    return env.ASSETS.fetch(new Request(home,request));
   }
   if(method==='GET'||method==='HEAD')return env.ASSETS.fetch(request);
   return send(404,{error:'找不到頁面。'});
  }catch(error){
   const status=error instanceof ApiError?error.status:500;
   const message=error instanceof ApiError?error.message:'伺服器無法完成這個操作。';
   if(!(error instanceof ApiError))console.error(error);
   return send(status,{error:message});
  }
 }
};
