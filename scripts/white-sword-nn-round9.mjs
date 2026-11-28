#!/usr/bin/env node
// Round 9 replays two stored stops and a pre-listed set of losses. It does not train.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {BLEND_HARD_CAP,BLEND_SCALE,BLEND_TIMEOUT_MS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {positionKey} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {encodeDecision,sameVector} from '../training/white-sword-nn/encode.mjs';
import {compactAction,noteLegacy,openTracker} from '../training/white-sword-nn/loop.mjs';
import {greedyIndex,loadNet,scoreActions} from '../training/white-sword-nn/net.mjs';
import {loadOfficialV2,playMatch} from '../training/white-sword-nn/play.mjs';
import {
 ROUND9_BASELINE_FILE,ROUND9_CANDIDATE_FILE,ROUND9_LOOPS,agreementClass,loopReport,observeLoop,selectLosses
} from '../training/white-sword-nn/round9.mjs';

const ROUND8_JSON='docs/white-sword-ai/nn-round8.json';
const ROUND8_PLAN='docs/white-sword-ai/nn-round8-plan.json';
const LOSS_JSON='docs/white-sword-ai/nn-round9-losses.json';
const LOOP_JSON='docs/white-sword-ai/nn-round9-loops.json';
const FIXED_JSON='docs/white-sword-ai/nn-round9-fixed.json';
const GAP_JSON='docs/white-sword-ai/nn-round9-gaps.json';

function lossList(){
 const round8=JSON.parse(readFileSync(ROUND8_JSON,'utf8'));
 const plan=JSON.parse(readFileSync(ROUND8_PLAN,'utf8'));
 const selected=selectLosses(plan.schedule,round8.games);
 const record={
  createdAt:new Date().toISOString(),
  source:'docs/white-sword-ai/nn-round8.json',
  plan:'docs/white-sword-ai/nn-round8-plan.json',
  note:'名單在重播敗局之前寫下。不因診斷結果改選。第八輪的 invalid 判定不改。',
  direct:{games:36,finished:36,wins:7,losses:29},
  sharedCandidate:{games:108,finished:108,wins:36},
  cells:selected
 };
 writeFileSync(LOSS_JSON,JSON.stringify(record,null,2)+'\n');
 return record;
}
function replayLoop(spec){
 const watched=observeLoop(positionKey);
 const seats=[
  {deckId:spec.deck,kind:'hard',explore:0},
  {deckId:'white-sword',kind:'v2',explore:0}
 ];
 const game=playMatch({
  seed:spec.seed,first:spec.first,mode:'eval',learnerSeat:spec.learnerSeat,
  comparison:'shared',model:'v2',opponent:'hard',deck:spec.deck,
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,
  decisionMs:BLEND_TIMEOUT_MS,detector:'legacy',seats,nets:[null,null],critics:[null,null],
  observe:watched.observe
 });
 return loopReport(spec,game,watched.steps);
}
function controlSeats(spec){
 return [
  {deckId:spec.deck,kind:'hard',explore:0},
  {deckId:'white-sword',kind:'v2',explore:0}
 ];
}
function replayFixed(spec){
 const tracker=openTracker();
 let legacyStopStep=null;
 let continued=0;
 const game=playMatch({
  seed:spec.seed,first:spec.first,mode:'eval',learnerSeat:spec.learnerSeat,
  comparison:'shared',model:'v2',opponent:'hard',deck:spec.deck,
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,
  decisionMs:BLEND_TIMEOUT_MS,seats:controlSeats(spec),nets:[null,null],critics:[null,null],
  observe(event){
   if(event.when!=='before')return;
   const noted=noteLegacy(tracker,event.state);
   if(noted.stop&&legacyStopStep==null)legacyStopStep=event.step;
   else if(legacyStopStep!=null)continued++;
  }
 });
 return {
  seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,
  originalStop:spec.steps,
  legacyWouldStopAt:legacyStopStep,
  continuedPastLegacyStop:continued>0,
  status:game.status,winner:game.winner,endReason:game.endReason,error:game.error,
  steps:game.steps,anomalies:game.anomalies,policies:game.policies,
  evaluation:false
 };
}
function lineOf(player){
 return (player?.front||[]).map(card=>card?{
  uid:card.uid||null,cardId:card.cardId||'',bp:card.bp??null,ready:card.ready===true
 }:null);
}
function publicSummary(observation,seat){
 const visible=observation.visible;
 const me=visible.players[seat];
 const opp=visible.players[seat===0?1:0];
 return {
  phase:visible.phase,turn:visible.turn,active:visible.active,
  pending:visible.pending?{kind:visible.pending.kind||null,player:visible.pending.player??null}:null,
  battle:visible.battle?{
   bp:visible.battle.bp??null,damage:visible.battle.damage??null,
   impact:visible.battle.impact??null,cardId:visible.battle.cardId||''
  }:null,
  life:[me.lifeCount,opp.lifeCount],
  hand:[me.handCount,opp.handCount],
  ap:[me.apReady,opp.apReady],
  front:[lineOf(me),lineOf(opp)]
 };
}
function collisions(actions){
 let count=0;
 for(let i=0;i<actions.length;i++){
  for(let j=i+1;j<actions.length;j++)if(sameVector(actions[i],actions[j]))count++;
 }
 return count;
}
function greedy(net,packs,state,actor,legal,history){
 const observation=observeActor(packs,state,actor);
 const encoded=encodeDecision(observation,actor,legal,history);
 const scores=scoreActions(net,encoded.state,encoded.actions);
 return {
  action:legal[greedyIndex(scores,legal)],
  collisions:collisions(encoded.actions),
  summary:publicSummary(observation,actor)
 };
}
function sameChoice(left,right){
 return JSON.stringify(compactAction(left))===JSON.stringify(compactAction(right));
}
function visibleTag(row){
 const battle=row.view?.battle;
 const pending=row.view?.pending?.kind;
 if(pending!=='block'||!battle||!Number.isInteger(battle.damage))return null;
 const passed=row.b?.type==='chooseBlock'&&row.b.uid==null;
 const blocks=(row.legal||[]).filter(action=>action.type==='chooseBlock'&&action.uid);
 if(!passed||!blocks.length||!(battle.damage>=row.view.life[0]))return null;
 const higher=blocks.some(action=>{
  const card=(row.view.front[0]||[]).find(item=>item?.uid===action.uid);
  return card&&Number.isInteger(card.bp)&&Number.isInteger(battle.bp)&&card.bp>battle.bp;
 });
 return higher?'visible-lethal-block':'possible-lethal-block';
}
function replayGap(row,candidate,baseline){
 const decks=[getDeck('white-sword'),getDeck('white-sword')];
 const packs=[decks[0].pack,decks[1].pack];
 const model=loadOfficialV2();
 const seats=[null,null];
 seats[row.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0,policy:'greedy'};
 seats[1-row.learnerSeat]={deckId:'white-sword',kind:'v2',explore:0};
 const nets=[null,null];
 nets[row.learnerSeat]=candidate;
 const decisions=[];
 let open=null;
 const game=playMatch({
  seed:row.seed,first:row.first,mode:'eval',learnerSeat:row.learnerSeat,
  comparison:'direct',model:'candidate',opponent:'v2',deck:'white-sword',
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,
  decisionMs:BLEND_TIMEOUT_MS,seats,nets,critics:[null,null],
  observe(event){
   if(event.when==='choice'){
    if(open){
     open.b=compactAction(event.action);
     open.bMatchesPlayed=sameChoice(event.action,open.shadowB);
     if(!open.bMatchesPlayed){
      open.label=null;
      open.unresolved='shadow-diverged';
     }
     delete open.shadowB;
     open=null;
    }
    return;
   }
   if(event.actor!==row.learnerSeat||event.legal.length<2)return;
   try{
    const history=event.history.slice();
    const b=greedy(candidate,packs,cloneMatch(event.state),event.actor,event.legal,history);
    const a=greedy(baseline,packs,cloneMatch(event.state),event.actor,event.legal,history);
    const v2=chooseWhiteSwordAction(packs,cloneMatch(event.state),{
     actor:event.actor,model,mode:'blend',hardCap:BLEND_HARD_CAP,scale:BLEND_SCALE,
     explore:0,seed:row.seed,step:event.step,timeoutMs:BLEND_TIMEOUT_MS
    });
    const official=event.legal.find(action=>sameChoice(action,v2?.action))||null;
    const prior=event.legal.find(action=>sameChoice(action,a.action))||null;
    const shadow=event.legal.find(action=>sameChoice(action,b.action))||null;
    const timed=v2?.reason==='timeout'||v2?.source==='fallback';
    const record={
     step:event.step,actor:event.actor,legalCount:event.legal.length,
     collisions:b.collisions,shadowB:b.action,
     a:compactAction(prior),b:null,v2:compactAction(official),
     v2Source:v2?.source||null,v2Reason:v2?.reason||null,
     label:timed?null:agreementClass(prior,shadow,official,sameChoice),
     unresolved:timed?'v2-timeout':null,
     view:b.summary,
     legal:event.legal.map(compactAction)
    };
    decisions.push(record);
    open=record;
   }catch(error){
    decisions.push({step:event.step,shadowError:String(error?.message||error)});
    open=null;
   }
  }
 });
 for(const decision of decisions)decision.tag=visibleTag(decision);
 return {
  seed:row.seed,learnerSeat:row.learnerSeat,first:row.first,
  stored:{winner:row.winner,steps:row.steps},
  replay:{
   status:game.status,winner:game.winner,endReason:game.endReason,
   steps:game.steps,anomalies:game.anomalies
  },
  matched:game.status==='finished'&&game.winner===row.winner&&game.steps===row.steps,
  decisions
 };
}
function main(){
 const command=process.argv[2]||'loops';
 if(command==='loops'){
  if(existsSync(LOOP_JSON))throw Error('The legacy loop diagnosis is already saved');
  const losses=lossList();
  console.log('losses locked',losses.cells.map(cell=>cell.losses.map(row=>row.seed).join(',')).join(' | '));
  const reports=ROUND9_LOOPS.map(spec=>{
   console.log('replay',spec.seed);
   return replayLoop(spec);
  });
  writeFileSync(LOOP_JSON,JSON.stringify({createdAt:new Date().toISOString(),reports},null,2)+'\n');
  return;
 }
 if(command==='fixed'){
  const reports=ROUND9_LOOPS.map(spec=>{
   console.log('fixed',spec.seed);
   return replayFixed(spec);
  });
  writeFileSync(FIXED_JSON,JSON.stringify({
   createdAt:new Date().toISOString(),
   note:'修正偵測後的重播。不是新的驗證對局，不改第八輪的 invalid 判定，也不覆寫 nn-round9-loops.json。',
   reports
  },null,2)+'\n');
  console.log(JSON.stringify(reports.map(row=>({
   seed:row.seed,continued:row.continuedPastLegacyStop,steps:row.steps,reason:row.endReason,status:row.status
  }))));
  return;
 }
 if(command==='gaps'){
  const losses=JSON.parse(readFileSync(LOSS_JSON,'utf8'));
  const rows=losses.cells.flatMap(cell=>cell.losses);
  if(rows.length!==8)throw Error('The locked loss list is not eight games');
  const candidate=loadNet(ROUND9_CANDIDATE_FILE);
  const baseline=loadNet(ROUND9_BASELINE_FILE);
  const games=rows.map(row=>{
   console.log('gap',row.seed,row.learnerSeat,row.first);
   return replayGap(row,candidate,baseline);
  });
  const decisions=games.flatMap(game=>game.decisions.filter(row=>row.label));
  const counts={};
  for(const row of decisions)counts[row.label]=(counts[row.label]||0)+1;
  writeFileSync(GAP_JSON,JSON.stringify({
   createdAt:new Date().toISOString(),
   note:'影子比較不改原對局。分歧不是錯誤標籤。',
   counts,games
  },null,2)+'\n');
  console.log(JSON.stringify({
   matched:games.map(game=>game.matched),
   counts,
   errors:games.reduce((sum,game)=>sum+game.decisions.filter(row=>row.shadowError).length,0),
   tags:decisions.filter(row=>row.tag).length
  }));
  return;
 }
 throw Error('Use loops, fixed, or gaps');
}

main();
