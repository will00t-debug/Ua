import test, {after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay} from '../dist/universal-v2/preview-replay.mjs';
import {buildHumanStep,coachHeader,newCoachMatchId} from '../dist/universal-v2/coach-record.mjs';
import {createHandler} from '../server/http.mjs';

const deck=verifiedBleachPurplePilotDeck();
const packs=[deck.pack,deck.pack];
let ctx;

async function listen(handler){
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,base:'http://127.0.0.1:'+server.address().port,handler};
}
async function api(path,{method='GET',token,body}={}){
 const response=await fetch(ctx.base+path,{
  method,
  headers:{
   ...(body!==undefined?{'content-type':'application/json'}:{}),
   ...(token?{authorization:'Bearer '+token}:{})
  },
  body:body!==undefined?JSON.stringify(body):undefined
 });
 const text=await response.text();
 let data=null;
 try{data=text?JSON.parse(text):null;}catch{data={raw:text};}
 return {status:response.status,data,text};
}
function humanStep(step=0){
 const state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
 const action=legalUniversalActions(packs,state).find(item=>item.mode==='keep');
 const header=coachHeader({matchId:newCoachMatchId(),packs,counts:deck.counts,aiVersion:'normal'});
 return buildHumanStep({packs,state,action,step,replayIndex:0,previous:null,header});
}

before(async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-coach-'));
 const started=await listen(await createHandler({dataFile:join(dir,'store.sqlite'),staticRoot:null}));
 ctx={...started,dir};
});
after(async()=>{
 if(!ctx)return;
 await new Promise(resolve=>ctx.server.close(resolve));
 ctx.handler.close();
 await rm(ctx.dir,{recursive:true,force:true});
});

test('coach storage requires login and keeps one row per step',async()=>{
 const guest=await api('/api/coach/matches');
 assert.equal(guest.status,401);
 const created=await api('/api/register',{method:'POST',body:{username:'教練甲',password:'correct-horse-1'}});
 assert.equal(created.status,201);
 const token=created.data.token;
 const step=humanStep();
 const saved=await api('/api/coach/steps',{method:'POST',token,body:step});
 assert.equal(saved.status,200,saved.text);
 assert.equal(saved.data.duplicate,false);
 const again=await api('/api/coach/steps',{method:'POST',token,body:step});
 assert.equal(again.status,200);
 assert.equal(again.data.duplicate,true);
 assert.equal(again.data.id,saved.data.id);
 const leaked=structuredClone(step);
 leaked.observation.visible.players[1].hand=[{uid:'1-9',cardId:'BLC-1-067'}];
 leaked.step=1;
 leaked.clientKey=step.matchId+':1:human';
 const rejected=await api('/api/coach/steps',{method:'POST',token,body:leaked});
 assert.equal(rejected.status,400);
 const named=structuredClone(step);
 named.username='教練甲';
 const hiddenName=await api('/api/coach/steps',{method:'POST',token,body:named});
 assert.equal(hiddenName.status,400);
 const label=await api('/api/coach/labels',{method:'POST',token,body:{
  ...step,format:'ua-v2-coach-label-v1',completed:false,winner:1,endReason:'conceded'
 }});
 assert.equal(label.status,200);
 const replay=makeUniversalPreviewReplay(packs,{decks:[deck.counts,deck.counts],seed:424242,first:0,openingMulligan:true});
 const debug=await api('/api/coach/debug-replays',{method:'POST',token,body:{header:step,replay}});
 assert.equal(debug.status,200,debug.text);
 const exported=await api('/api/coach/export',{token});
 assert.equal(exported.status,200);
 assert.equal(exported.text.includes('教練甲'),false);
 assert.equal(exported.text.includes('424242'),false);
 assert.equal(exported.text.includes('ua-universal-v2-preview'),false);
 assert.equal(exported.data.matches[0].label.endReason,'conceded');
 assert.equal(exported.data.matches[0].steps.length,1);
 assert.equal(exported.data.matches[0].steps[0].observation.visible.winner,undefined);
 assert.equal(exported.data.anonymousId.startsWith('a'),true);
 const other=await api('/api/register',{method:'POST',body:{username:'教練乙',password:'correct-horse-1'}});
 const denied=await api('/api/coach/matches/'+step.matchId,{token:other.data.token});
 assert.equal(denied.status,404);
 const removed=await api('/api/coach/matches/'+step.matchId,{method:'DELETE',token});
 assert.equal(removed.status,200);
 const afterDelete=await api('/api/coach/export',{token});
 assert.equal(afterDelete.data.matches.length,0);
 assert.equal(afterDelete.data.demonstrations.length,0);
});

test('a match after the old 40-match cap keeps the oldest match',async()=>{
 const created=await api('/api/register',{method:'POST',body:{username:'上限甲',password:'correct-horse-1'}});
 assert.equal(created.status,201,created.text);
 const token=created.data.token;
 const template=humanStep();
 const retarget=matchId=>JSON.parse(JSON.stringify(template).split(template.matchId).join(matchId));
 const ids=[];
 for(let n=0;n<41;n++){
  const matchId=newCoachMatchId();
  ids.push(matchId);
  const saved=await api('/api/coach/steps',{method:'POST',token,body:retarget(matchId)});
  assert.equal(saved.status,200,saved.text);
 }
 const listed=await api('/api/coach/matches',{token});
 assert.equal(listed.data.matches.length,41);
 for(const matchId of ids)assert.equal(listed.data.matches.some(match=>match.id===matchId),true);
 const oldest=await api('/api/coach/matches/'+ids[0],{token});
 assert.equal(oldest.status,200);
 assert.equal(oldest.data.steps.length,1);
});

test('a corrected demonstration replaces the unmarked AI step once',async()=>{
 const created=await api('/api/register',{method:'POST',body:{username:'教練丙',password:'correct-horse-1'}});
 const token=created.data.token;
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:12,first:1,openingMulligan:true});
 const header=coachHeader({matchId:newCoachMatchId(),packs,counts:deck.counts,aiVersion:'easy'});
 const ai=legalUniversalActions(packs,state).find(item=>item.mode==='keep');
 const {buildAiMark,buildAiDemonstration}=await import('../dist/universal-v2/coach-record.mjs');
 const mark=buildAiMark({packs,state,action:ai,step:0,replayIndex:0,header});
 const marked=await api('/api/coach/demos',{method:'POST',token,body:mark});
 assert.equal(marked.status,200,marked.text);
 const redraw=legalUniversalActions(packs,state).find(item=>item.mode==='redraw');
 state=dispatchUniversalAction(packs,state,ai,{actor:1});
 const follow=legalUniversalActions(packs,state)[0];
 const demo=buildAiDemonstration(mark,[redraw,follow],'base');
 const saved=await api('/api/coach/demos',{method:'POST',token,body:demo});
 assert.equal(saved.status,200,saved.text);
 assert.equal(saved.data.updated,true);
 const repeat=await api('/api/coach/demos',{method:'POST',token,body:demo});
 assert.equal(repeat.status,200);
 assert.equal(repeat.data.duplicate,true);
 const listed=await api('/api/coach/demos',{token});
 assert.equal(listed.data.demonstrations.length,1);
 assert.equal(listed.data.demonstrations[0].reason,'base');
 void appendUniversalReplay;
});
