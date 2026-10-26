import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {ApiError,createService} from './domain.mjs';
import {openDatabase} from './sqlite.mjs';

const TYPES={
 '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8',
 '.woff2':'font/woff2'
};

function send(res,status,payload){
 if(res.headersSent||res.writableEnded)return;
 const body=JSON.stringify(payload);
 res.writeHead(status,{
  'content-type':'application/json; charset=utf-8',
  'content-length':Buffer.byteLength(body),
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin'
 });
 res.end(body);
}
function cookie(token,secure){
 const maxAge=token?14*24*60*60:0;
 return 'ua_session='+(token||'')+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+maxAge+(secure?'; Secure':'');
}
function clientIp(req){
 const remote=req.socket?.remoteAddress||'local';
 if(process.env.UA_TRUST_PROXY==='1'){
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  if(forwarded)return forwarded.slice(0,80);
 }
 return String(remote).slice(0,80);
}
function bearer(req){
 const header=req.headers.authorization||'';
 const match=/^Bearer ([a-f0-9]{64})$/.exec(header);
 return match?match[1]:'';
}
function sessionToken(req){
 if(bearer(req))return bearer(req);
 const raw=req.headers.cookie||'';
 for(const part of raw.split(';')){
  const index=part.indexOf('=');
  if(index<0)continue;
  if(part.slice(0,index).trim()==='ua_session')return decodeURIComponent(part.slice(index+1).trim());
 }
 return '';
}
function readBody(req){
 return new Promise((resolve,reject)=>{
  const chunks=[];
  let size=0;
  req.on('data',chunk=>{
   size+=chunk.length;
   if(size>262144){
    reject(new ApiError(413,'送出的資料太大。'));
    req.destroy();
    return;
   }
   chunks.push(chunk);
  });
  req.on('end',()=>{
   if(!chunks.length)return resolve({});
   const type=String(req.headers['content-type']||'');
   if(!type.includes('application/json'))return reject(new ApiError(415,'請用 JSON 送出資料。'));
   try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}
   catch{reject(new ApiError(400,'JSON 格式不正確。'));}
  });
  req.on('error',()=>reject(new ApiError(400,'連線中斷。')));
 });
}
function safePath(root,urlPath){
 let pathname;
 try{pathname=decodeURIComponent(urlPath.split('?')[0]);}
 catch{return null;}
 if(!pathname.startsWith('/')||pathname.includes('\0')||pathname.includes('\\'))return null;
 const rootPath=resolve(root);
 const target=resolve(rootPath,'.'+pathname);
 if(target!==rootPath&&!target.startsWith(rootPath+sep))return null;
 return target;
}
function serveStatic(req,res,root,urlPath){
 const pathname=urlPath.split('?')[0];
 const mapped=pathname==='/'?'/universal-v2-preview.html':pathname;
 const target=safePath(root,mapped);
 if(!target){send(res,404,{error:'找不到頁面。'});return;}
 stat(target).then(info=>{
  if(!info.isFile()){send(res,404,{error:'找不到頁面。'});return;}
  const type=TYPES[extname(target).toLowerCase()];
  if(!type){send(res,404,{error:'找不到頁面。'});return;}
  res.writeHead(200,{
   'content-type':type,
   'content-length':info.size,
   'cache-control':type.startsWith('text/html')||type.includes('javascript')?'no-cache':'public, max-age=3600',
   'x-content-type-options':'nosniff'
  });
  if(req.method==='HEAD'){res.end();return;}
  createReadStream(target).pipe(res);
 }).catch(()=>send(res,404,{error:'找不到頁面。'}));
}

export async function createHandler({dataFile,staticRoot=null}){
 const sql=openDatabase(dataFile);
 const service=createService({sql});
 async function handle(req,res){
  try{
   const url=new URL(req.url||'/', 'http://localhost');
   const path=url.pathname;
   const method=req.method||'GET';
   const secure=req.headers['x-forwarded-proto']==='https';
   const meta={ip:clientIp(req)};
   if(method==='GET'&&path==='/api/health')return send(res,200,{ok:true,service:'ua-accounts',storage:'sqlite'});
   if(path.startsWith('/api/')){
    const token=sessionToken(req);
    if(method==='POST'&&path==='/api/register'){
     const body=await readBody(req);
     const result=await service.register(body,meta);
     res.setHeader('set-cookie',cookie(result.token,secure));
     return send(res,201,{username:result.username,token:result.token});
    }
    if(method==='POST'&&path==='/api/login'){
     const body=await readBody(req);
     const result=await service.login(body,meta);
     res.setHeader('set-cookie',cookie(result.token,secure));
     return send(res,200,{username:result.username,token:result.token});
    }
    if(method==='POST'&&path==='/api/logout'){
     await service.logout(token);
     res.setHeader('set-cookie',cookie('',secure));
     return send(res,200,{ok:true});
    }
    if(method==='GET'&&path==='/api/me')return send(res,200,await service.me(token));
    if(method==='GET'&&path==='/api/decks')return send(res,200,await service.listDecks(token));
    if(method==='POST'&&path==='/api/decks')return send(res,200,await service.saveDeck(token,await readBody(req)));
    const deckDelete=method==='DELETE'&&/^\/api\/decks\/(d[a-f0-9]{16})$/.exec(path);
    if(deckDelete)return send(res,200,await service.deleteDeck(token,deckDelete[1]));
    if(method==='POST'&&path==='/api/rooms')return send(res,201,await service.createRoom(token,await readBody(req)));
    const room=path.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{8})(?:\/(join|actions|resign|cancel))?$/);
    if(room){
     const [,code,action]=room;
     if(!action&&method==='GET')return send(res,200,await service.roomView(token,code));
     if(action==='join'&&method==='POST')return send(res,200,await service.joinRoom(token,code,await readBody(req)));
     if(action==='actions'&&method==='POST')return send(res,200,await service.act(token,code,await readBody(req)));
     if(action==='resign'&&method==='POST')return send(res,200,await service.resign(token,code));
     if(action==='cancel'&&method==='POST')return send(res,200,await service.cancel(token,code));
    }
    return send(res,404,{error:'找不到這個功能。'});
   }
   if((method==='GET'||method==='HEAD')&&staticRoot)return serveStatic(req,res,staticRoot,path);
   send(res,404,{error:'找不到頁面。'});
  }catch(error){
   const status=error instanceof ApiError?error.status:500;
   const message=error instanceof ApiError?error.message:'伺服器無法完成這個操作。';
   if(!(error instanceof ApiError))console.error(error);
   send(res,status,{error:message});
  }
 }
 handle.close=()=>sql.close();
 return handle;
}
