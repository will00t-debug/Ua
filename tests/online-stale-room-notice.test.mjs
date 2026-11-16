import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
function extract(start,next){
 const begin=source.indexOf(start),end=source.indexOf(next,begin);
 assert.ok(begin>=0&&end>begin,'source handler '+start+' exists');
 return source.slice(begin,end);
}

const joinSource=extract('async function joinRoom(event){','async function enterListed(code){');
const listedSource=extract('async function enterListed(code){','async function leaveListed(room){');
const applySource=extract('function applyRoom(next,','function noteOnlineResult(room){');

function lobbyHarness(snippet,apiImpl){
 const app={room:null,busy:false,error:'',notice:'已取消房間。'};
 const calls={history:[],poll:0,renders:0};
 const api=apiImpl|| (async()=>({code:'R9LF29BA',status:'playing',revision:1}));
 const history={replaceState:(_a,_b,url)=>calls.history.push(url)};
 const startPoll=()=>calls.poll++;
 const render=()=>calls.renders++;
 const showRoomAlert=()=>{};
 const FormData=class{constructor(form){this.form=form}get(key){return this.form[key]}};
 const ROOM=/^[A-HJ-NP-Z2-9]{8}$/;
 const actions=new Function('app','api','history','startPoll','render','showRoomAlert','FormData','ROOM',snippet+'\nreturn {joinRoom:typeof joinRoom==="function"?joinRoom:null,enterListed:typeof enterListed==="function"?enterListed:null};')(app,api,history,startPoll,render,showRoomAlert,FormData,ROOM);
 return {app,calls,...actions};
}

test('joining another room clears previous cancellation banner',async()=>{
 const ui=lobbyHarness(joinSource);
 await ui.joinRoom({preventDefault(){},currentTarget:{code:'R9LF29BA',deckId:'test-deck'}});
 assert.equal(ui.app.notice,'');
 assert.equal(ui.app.room.code,'R9LF29BA');
 assert.equal(ui.calls.poll,1);
});

test('re-entering an existing room clears previous cancellation banner',async()=>{
 const ui=lobbyHarness(listedSource);
 await ui.enterListed('R9LF29BA');
 assert.equal(ui.app.notice,'');
 assert.equal(ui.app.room.code,'R9LF29BA');
 assert.equal(ui.calls.poll,1);
});

test('transition from waiting to playing clears outdated success banner',()=>{
 const app={room:{code:'R9LF29BA',status:'waiting',revision:1},notice:'已關閉舊房間。',recordedCode:'',busy:false};
 const renderCalls=[];
 const decisions=()=>({settle(){},prepare(){return Promise.resolve()},result(){}});
 const applyRoom=new Function('app','decisions','render','noteOnlineResult',applySource+'\nreturn applyRoom;')(app,decisions,()=>renderCalls.push(1),()=>{});
 applyRoom({code:'R9LF29BA',status:'playing',revision:2});
 assert.equal(app.notice,'');
 assert.equal(renderCalls.length,1);
});

test('routine polling of an existing match does not erase manual-copy fallback',()=>{
 const app={room:{code:'R9LF29BA',status:'playing',revision:2},notice:'房間代碼：R9LF29BA',recordedCode:'',busy:false};
 const decisions=()=>({settle(){},prepare(){return Promise.resolve()},result(){}});
 const applyRoom=new Function('app','decisions','render','noteOnlineResult',applySource+'\nreturn applyRoom;')(app,decisions,()=>{},()=>{});
 applyRoom({code:'R9LF29BA',status:'playing',revision:3});
 assert.equal(app.notice,'房間代碼：R9LF29BA');
});
