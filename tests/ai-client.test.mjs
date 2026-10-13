import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,legalActions} from '../dist/engine.mjs';
import {requestAiAction,cancelPendingAiActions} from '../dist/ai-client.mjs';

function initial(){
 let s=newGame({seed:412});
 s=dispatch(s,{type:'keep'});
 return dispatch(s,{type:'keep'});
}

test('changing game cancels an in-flight AI decision instead of replaying fallback',async()=>{
 const original=globalThis.Worker;
 const instances=[];
 class FakeWorker {
  constructor(){this.requests=[];this.terminated=false;instances.push(this);}
  postMessage(m){this.requests.push(m);}
  terminate(){this.terminated=true;}
 }
 globalThis.Worker=FakeWorker;
 try{
  const s=initial();
  const result=requestAiAction(s,{difficulty:'hard'});
  assert.equal(instances.length,1);
  assert.equal(instances[0].requests.length,1);
  cancelPendingAiActions();
  assert.equal(await result,null);
  assert.equal(instances[0].terminated,true);
  const fresh=requestAiAction(s,{difficulty:'normal'});
  assert.equal(instances.length,2);
  const response=instances[1].requests[0];
  const valid=legalActions(s)[0];
  instances[1].onmessage({data:{id:response.id,action:valid}});
  assert.deepEqual(await fresh,valid);
 }finally{
  cancelPendingAiActions();
  if(original===undefined)delete globalThis.Worker;
  else globalThis.Worker=original;
 }
});

test('multiple pending requests are all canceled without applying old actions',async()=>{
 const original=globalThis.Worker;
 class FakeWorker {
  postMessage(){}
  terminate(){this.closed=true;}
 }
 globalThis.Worker=FakeWorker;
 try{
  const s=initial();
  const first=requestAiAction(s,{difficulty:'hard'});
  const second=requestAiAction(s,{difficulty:'normal'});
  cancelPendingAiActions();
  assert.deepEqual(await Promise.all([first,second]),[null,null]);
 }finally{
  cancelPendingAiActions();
  if(original===undefined)delete globalThis.Worker;
  else globalThis.Worker=original;
 }
});
