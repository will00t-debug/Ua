import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mainDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action,lastAiV3Trace,AI_V3_POLICY,AI_V3_BASELINE,resetAiV3Report,aiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {positionKey,searchPosition,rankLegal} from '../dist/universal-v2/ai-v3/beam.mjs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {matchGrid,pairedChallenger} from '../dist/universal-v2/ai-v3/compare.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {blendRoot,learnBonus,SEARCH_PRIOR_GAP} from '../dist/universal-v2/ai-v3/prior.mjs';
import {comparedLines} from '../dist/universal-v2/ai-v3/search.mjs';
import {featureKeys,hashV4,V4_DIM,V4_FORMAT} from '../dist/universal-v2/ai-v3/v4-features.mjs';
import {holdoutLastMatch,valueLabel} from '../dist/universal-v2/ai-v3/learn-bridge.mjs';
import {beliefWorld} from '../dist/universal-v2/ai-v3/belief.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {battleWindowAction,battleWindowDelta} from '../dist/universal-v2/ai-v3/eval.mjs';
import {beliefWorlds} from '../dist/universal-v2/ai-v3/belief.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalAttackDamage,universalBp,universalImpact,universalImpactNull} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,hardAiReport,HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pin=JSON.parse(readFileSync(new URL('../audit/ai-v3-baseline-pin.json',import.meta.url),'utf8'));
const corpus=JSON.parse(readFileSync(new URL('./fixtures/ai-v3-mistakes.json',import.meta.url),'utf8'));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const OPTS={seed:11,nodes:180,ms:700,beam:4,actorDecisions:1,opponentDecisions:3};

function boot(deck,seed=7){
 const packs=[deck.pack,deck.pack];
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed,first:0});
 const step=()=>{
  const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
  state=dispatchUniversalAction(packs,state,next);
 };
 while(state.phase!=='main'&&state.status==='playing')step();
 return {packs,state,step};
}
function take(state,player,id){
 for(const zone of ['hand','deck','life']){
  const list=state.players[player][zone];
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function blockerPosition(){
 const deck=mainDecks().find(item=>item.title==='bleach');
 const {packs,state}=boot(deck,7);
 const body=take(state,0,'BLC-1-042');
 const threat=take(state,1,'BLC-1-045');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(body);
 threat.ready=true;
 threat.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[1].front[0]=threat;
 while(state.players[0].life.length>1)state.players[0].deck.push(state.players[0].life.pop());
 while(state.players[1].life.length>5)state.players[1].deck.push(state.players[1].life.pop());
 assert.equal(assertUniversalMatch(packs,state),true);
 return {packs,state,body};
}
function hiddenSwap(state){
 const copy=structuredClone(state);
 for(const player of copy.players){
  const deck=player.deck;
  if(deck.length>=2){
   const last=deck[deck.length-1];
   deck[deck.length-1]=deck[deck.length-2];
   deck[deck.length-2]=last;
  }
  if(player.life.length>=2){
   const last=player.life[player.life.length-1];
   player.life[player.life.length-1]=player.life[0];
   player.life[0]=last;
  }
  if(player.hand.length>=2){
   const last=player.hand[player.hand.length-1];
   player.hand[player.hand.length-1]=player.hand[0];
   player.hand[0]=last;
  }
 }
 return copy;
}
function losesIfPassed(packs,state){
 let cursor=state;
 for(let guard=0;guard<8&&cursor.status==='playing';guard++){
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const attack=actor===1?legal.find(action=>action.type==='attack'):null;
  const pass=legal.find(action=>action.type==='chooseBlock'&&action.uid==null);
  const next=legal.find(action=>action.type==='next');
  const action=attack||pass||next;
  if(!action)break;
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
 }
 return cursor.winner===1||cursor.players[0].life.length===0;
}

test('frozen hard-search-2 is the comparison baseline and learned-v4 stays unmerged',()=>{
 const hash=createHash('sha256').update(readFileSync(new URL('../dist/universal-v2/hard-ai.mjs',import.meta.url))).digest('hex');
 assert.equal(hash,pin.hardAiSha256);
 assert.equal(HARD_AI_POLICY,'hard-search-2');
 assert.equal(AI_V3_BASELINE,'hard-search-2');
 assert.equal(pin.deployed.learnPolicy,'learned-v1');
 assert.equal(pin.pr294.merged,false);
 assert.equal(pin.pr294.learnPolicy,'learned-v4');
 assert.equal(pin.pr294.rawGap,0);
 assert.ok(SEARCH_PRIOR_GAP>0);
 assert.equal(corpus.baseline,'hard-search-2');
});

test('five legal main decks include titles outside the old five-title census',()=>{
 const decks=mainDecks();
 assert.equal(decks.length,5);
 const titles=decks.map(deck=>deck.title).sort();
 assert.deepEqual(titles,['aot','bleach','solo-leveling','steins-gate','sword-art-online']);
 for(const deck of decks){
  assert.deepEqual(validateUniversalDeck(deck.pack,deck.counts),[]);
  assert.equal(Object.values(deck.counts).reduce((sum,n)=>sum+n,0),50);
 }
});

test('hard-search-2 plays energy and the full-turn search plays the blocker',()=>{
 const {packs,state,body}=blockerPosition();
 const hard=chooseStrengthenedHardAction(packs,state,{ms:10000,nodes:80,seed:1});
 assert.equal(hard.type,'play');
 assert.equal(hard.line,'energy');
 assert.equal(hard.uid,body.uid);
 const energy=legalUniversalActions(packs,state).find(action=>action.type==='play'&&action.line==='energy'&&action.uid===body.uid);
 const afterEnergy=dispatchUniversalAction(packs,state,energy,{actor:0});
 assert.equal(losesIfPassed(packs,afterEnergy),true);
 const frozen={...OPTS,ms:1e9,now:()=>0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,frozen);
 const trace=lastAiV3Trace();
 assert.equal(action.type,'play');
 assert.equal(action.line,'front');
 assert.equal(action.uid,body.uid);
 assert.equal(trace.policy,AI_V3_POLICY);
 assert.ok(trace.opponentTurns>=1);
 assert.equal(trace.fallback,false);
 assert.ok(trace.nodesUsed<=OPTS.nodes);
 const front=dispatchUniversalAction(packs,state,action,{actor:0});
 assert.equal(front.players[0].front.some(card=>card?.uid===body.uid),true);
 assert.equal(legalUniversalActions(packs,state).some(item=>same(item,action)),true);
 const swapped=hiddenSwap(state);
 assert.deepEqual(chooseAiV3Action(packs,swapped,frozen),action);
 const world=beliefWorld(packs,state,0,11,0);
 const trueHand=state.players[1].hand.map(card=>card.cardId).sort().join(',');
 const believed=world.state.players[1].hand.map(card=>card.cardId).sort().join(',');
 assert.notEqual(believed,trueHand);
});

test('the blocker search stops at its deadline and still returns a legal action',()=>{
 const {packs,state}=blockerPosition();
 const meter={dispatches:0};
 let reads=0;
 let atExpiry=null;
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  ...OPTS,meter,diagnose:true,
  now(){
   const time=reads>=6?OPTS.ms+1000:0;
   reads++;
   if(time>OPTS.ms&&atExpiry==null)atExpiry=meter.dispatches;
   return time;
  }
 });
 const trace=lastAiV3Trace();
 assert.notEqual(atExpiry,null);
 assert.equal(meter.dispatches,atExpiry);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=OPTS.nodes);
 assert.equal(legalUniversalActions(packs,state).some(item=>same(item,action)),true);
 assert.ok(trace.unexecuted.length>=1);
 assert.ok(trace.unexecuted.every(row=>row.reason==='time'));
});

test('an unblocked lethal attack is taken and an illegal result is refused',()=>{
 const deck=mainDecks().find(item=>item.title==='bleach');
 const packs=[deck.pack,deck.pack];
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:7,first:0});
 while(state.phase!=='attack'){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 const attacker=take(state,0,'BLC-1-043');
 attacker.ready=true;
 attacker.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[0].front[0]=attacker;
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 while(state.players[1].life.length>1)state.players[1].deck.push(state.players[1].life.pop());
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 assert.equal(assertUniversalMatch(packs,state),true);
 const action=chooseAiV3Action(packs,state,OPTS);
 assert.equal(action.type,'attack');
 assert.equal(action.uid,attacker.uid);
 let after=dispatchUniversalAction(packs,state,action,{actor:0});
 for(let guard=0;guard<6&&after.status==='playing'&&after.pending;guard++){
  const actor=after.pending.player??after.active;
  const options=legalUniversalActions(packs,after);
  const pass=options.find(item=>item.type==='chooseBlock'&&item.uid==null)||
   options.find(item=>item.mode==='skip')||options[0];
  after=dispatchUniversalAction(packs,after,pass,{actor});
 }
 assert.ok(after.winner===0||after.players[1].life.length===0);
 const legal=legalUniversalActions(packs,state);
 const request=buildAiV3Request(packs,state,0,{requestId:4,stateVersion:9,seed:11});
 const result=handleAiV3Request(request);
 assert.equal(result.error,null);
 assert.equal(acceptAiV3Result({requestId:4,stateVersion:9,actor:0,legal},result).ok,true);
 assert.equal(acceptAiV3Result({requestId:5,stateVersion:9,actor:0,legal},result).reason,'stale-request');
 assert.equal(acceptAiV3Result({requestId:4,stateVersion:10,actor:0,legal},result).reason,'stale-version');
 assert.equal(acceptAiV3Result({requestId:4,stateVersion:9,actor:1,legal},result).reason,'stale-actor');
 assert.equal(acceptAiV3Result({requestId:4,stateVersion:9,actor:0,legal},{...result,action:{type:'play',uid:'nope'}}).reason,'not-legal');
 assert.equal(handleAiV3Request({...request,sealed:false}).error,'unsealed');
 assert.equal(handleAiV3Request({...request,opponentHand:['secret']}).error,'hidden-field');
});

test('a learned-v4 prior cannot cross the search gap',()=>{
 const far=blendRoot([
  {action:{type:'next'},search:100},
  {action:{type:'attack',uid:'0-1'},search:100-SEARCH_PRIOR_GAP-1}
 ],action=>action.type==='attack'?50:0);
 assert.equal(far.action.type,'next');
 const near=blendRoot([
  {action:{type:'next'},search:100},
  {action:{type:'play',line:'front'},search:96}
 ],action=>action.type==='play'?6:0);
 assert.equal(near.action.type,'play');
 assert.ok(near.bonus<=SEARCH_PRIOR_GAP);
 const tiedPlay=blendRoot([
  {action:{type:'next'},search:10},
  {action:{type:'play',line:'energy'},search:10}
 ],()=>0);
 assert.equal(tiedPlay.action.type,'play');
 const tiedSwing=blendRoot([
  {action:{type:'attack',uid:'0-1'},search:10},
  {action:{type:'next'},search:10}
 ],()=>0);
 assert.equal(tiedSwing.action.type,'next');
 const shared=comparedLines([
  {action:{type:'next'},search:49.5,boundary:'yielded',phase:'main',pending:null,leafTurn:2,leafActive:0,leafOwnTurns:1},
  {action:{type:'raid',uid:'1-38'},search:71.4,boundary:'yielded',phase:'main',pending:null,leafTurn:2,leafActive:0,leafOwnTurns:1}
 ]);
 assert.equal(shared.shared,true);
 assert.equal(shared.rows.length,2);
 const misplaced=comparedLines([
  {action:{type:'next'},search:49.5,boundary:'yielded',phase:'main',pending:null,leafTurn:2,leafActive:0,leafOwnTurns:1},
  {action:{type:'raid',uid:'1-38'},search:71.4,boundary:'yielded',phase:'attack',pending:'block',leafTurn:3,leafActive:1,leafOwnTurns:2}
 ]);
 assert.equal(misplaced.rows.length,1);
 assert.equal(misplaced.rows[0].action.type,'raid');
 const split=comparedLines([
  {action:{type:'play',uid:'0-1',line:'front'},search:10,boundary:'pending',phase:'main',pending:'effect-discard',leafTurn:2,leafActive:0,leafOwnTurns:1},
  {action:{type:'raid',uid:'0-2'},search:30,boundary:'pending',phase:'main',pending:'effect-order',leafTurn:4,leafActive:1,leafOwnTurns:2}
 ]);
 assert.equal(split.rows.length,0);
 const cut=comparedLines([
  {action:{type:'next'},search:22,boundary:'yielded'},
  {action:{type:'move',uid:'0-14'},search:17,boundary:'pending'}
 ]);
 assert.equal(cut.rows.length,0);
 const observation={visible:{phase:'main',turn:1,actor:0,players:[
  {hand:[],front:[],energy:[],lifeCount:1,energyTotal:0,apReady:0,energyByColor:{},handCount:0},
  {hand:null,front:[],energy:[],lifeCount:5,energyTotal:0,apReady:0,energyByColor:{},handCount:0}
 ]}};
 const action={type:'play',line:'front'};
 const key=featureKeys(observation,action,0)[0];
 const weights=new Array(V4_DIM).fill(0);
 weights[hashV4('v4|'+key)]=4;
 assert.equal(learnBonus({format:V4_FORMAT,weights},observation,action,0),4);
 assert.equal(learnBonus({format:'ua-v2-learn-v1',weights:[1,2,3]},observation,action,0),0);
});

test('match holdout ignores a leaking result label',()=>{
 const rows=[
  {matchId:'m1',choice:1},{matchId:'m1',choice:2},{matchId:'m2',choice:3}
 ];
 const split=holdoutLastMatch(rows);
 assert.equal(split.split,'match');
 assert.equal(split.heldMatch,'m2');
 assert.equal(split.train.length,2);
 assert.equal(valueLabel({record:'result',winner:1,seat:1,leak:false}),1);
 assert.equal(valueLabel({record:'result',winner:0,seat:1,leak:true}),null);
 assert.equal(valueLabel({record:'decision',winner:1,seat:1}),null);
});

test('one hundred reachable decisions stay legal and do not take an immediate loss',()=>{
 const decks=mainDecks();
 const problems=[];
 const byTitle={};
 let checked=0;
 const perTitle=20;
 for(const deck of decks){
  byTitle[deck.title]=0;
  for(const seed of [11,29,47]){
   if(byTitle[deck.title]>=perTitle)break;
   const packs=[deck.pack,deck.pack];
   let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed,first:seed%2});
   let guard=0;
   while(state.status==='playing'&&byTitle[deck.title]<perTitle&&guard++<500){
    const legal=legalUniversalActions(packs,state);
    if(legal.length>1&&(state.phase==='main'||state.phase==='attack')&&!state.pending){
     const actor=state.active;
     const action=chooseAiV3Action(packs,state,{seed,nodes:36,ms:80,beam:3,actorDecisions:1,opponentDecisions:2,worlds:1});
     checked++;
     byTitle[deck.title]++;
     if(!legal.some(item=>same(item,action))){
      problems.push({title:deck.title,seed,kind:'rule',action});
     }else{
      let lost=false,safe=false;
      for(const item of legal){
       let next;
       try{next=dispatchUniversalAction(packs,state,item,{actor});}
       catch{problems.push({title:deck.title,seed,kind:'rule-dispatch'});continue;}
       const death=next.winner===1-actor;
       if(same(item,action))lost=death;
       else if(!death)safe=true;
      }
      if(lost&&safe)problems.push({title:deck.title,seed,kind:'decision',action});
     }
    }
    const actor=state.pending?.player??state.active;
    const follow=legalUniversalActions(packs,state);
    const hard=chooseStrengthenedHardAction(packs,state,{ms:10000,nodes:32,seed});
    const step=follow.find(item=>same(item,hard))||follow[0];
    if(!step)break;
    state=dispatchUniversalAction(packs,state,step,{actor});
   }
  }
  assert.ok(byTitle[deck.title]>=perTitle,deck.title+' only reached '+byTitle[deck.title]);
 }
 assert.ok(checked>=100,'only reached '+checked);
 assert.deepEqual(problems,[]);
 console.log('legality-positions '+JSON.stringify({checked,byTitle,problems:problems.length}));
});

test('default policy is the beam search, and ISMCTS stays a legal prototype',()=>{
 const {packs,state}=blockerPosition();
 resetAiV3Report();
 const beam=chooseAiV3Action(packs,state,{...OPTS,mode:'beam'});
 assert.equal(lastAiV3Trace().reason==='budget'||lastAiV3Trace().reason==='search',true);
 assert.equal(beam.line,'front');
 const proto=chooseAiV3Action(packs,state,{...OPTS,mode:'ismcts',nodes:40,ms:200});
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.some(action=>same(action,proto)),true);
 assert.equal(lastAiV3Trace().reason,'ismcts');
 assert.ok(lastAiV3Trace().nodesUsed<=40);
});

function purpleCounts(pack){
 const counts={'BLC-1-046':2,'BLC-1-051':2,'BLC-3-006':2,'BLC-1-042':4,'BLC-1-058':2,'BLC-2-052':2,'BLC-1-053':2,'BLC-4-059':1,'BLC-1-106':2};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id].trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(pack.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const n=Math.min(card.maxCopies||4,50-total,triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
function place(state,player,card,line,slot){
 card.ready=true;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
}
test('an engine-settled BP split does not reuse the other score',()=>{
 const pack=officialV2Pack('bleach');
 const counts=purpleCounts(pack);
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0});
 while(state.phase!=='main')state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 const renji=take(state,0,'BLC-1-046');
 const low=take(state,0,'BLC-1-051');
 const high=take(state,0,'BLC-3-006');
 place(state,0,renji,'front',0);
 place(state,0,low,'front',1);
 place(state,0,high,'front',2);
 assert.equal(assertUniversalMatch(packs,state),true);
 const beforeKey=positionKey(state,0,'us',2);
 const pending=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='activate'&&action.uid===renji.uid),{actor:0});
 assert.equal(pending.pending.kind,'effect-buff-own');
 assert.notEqual(positionKey(pending,0,'us',2),beforeKey);
 const choose=(cursor,uid)=>dispatchUniversalAction(packs,cursor,{type:'chooseOwnBuff',uid},{actor:cursor.pending.player});
 const even=choose(structuredClone(pending),low.uid);
 const split=choose(structuredClone(pending),high.uid);
 const bp=(cursor,id)=>universalBp(packs,cursor,cursor.players[0].front.find(card=>card?.cardId===id));
 assert.deepEqual([bp(even,'BLC-1-051'),bp(even,'BLC-3-006')],[2000,2000]);
 assert.deepEqual([bp(split,'BLC-1-051'),bp(split,'BLC-3-006')],[1500,2500]);
 assert.notEqual(positionKey(even,0,'us',2),positionKey(split,0,'us',2));
 const arm=cursor=>{
  const wall=take(cursor,1,'BLC-1-058');
  place(cursor,1,wall,'front',0);
  const source=cursor.players[0].front.find(card=>card?.cardId==='BLC-1-046');
  const small=cursor.players[0].front.find(card=>card?.cardId==='BLC-1-051');
  source.ready=false;
  small.ready=false;
  while(cursor.phase!=='attack'&&cursor.status==='playing'){
   const next=legalUniversalActions(packs,cursor).find(action=>action.type==='next');
   cursor=dispatchUniversalAction(packs,cursor,next);
  }
  assert.equal(assertUniversalMatch(packs,cursor),true);
  return cursor;
 };
 const leftState=arm(even),rightState=arm(split);
 const table=new Map();
 const limits={nodes:120,beam:4,actorDecisions:3,opponentDecisions:1,deadline:1e15};
 const left=searchPosition(packs,leftState,0,limits,table);
 const right=searchPosition(packs,rightState,0,limits,table);
 assert.notEqual(left.key,right.key);
 assert.ok(right.value>left.value,left.value+' vs '+right.value);
 assert.equal(right.hits,0);
});

test('prior ranks a legal play ahead of ending the phase',()=>{
 const deck=mainDecks().find(item=>item.title==='bleach');
 const {packs,state}=boot(deck,7);
 const body=take(state,0,'BLC-1-042');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(body);
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.some(action=>action.type==='play'&&action.uid===body.uid),true);
 assert.equal(legal.some(action=>action.type==='next'),true);
 const ranked=rankLegal(packs,state,0,legal);
 assert.equal(ranked[0].type,'play');
 resetAiV3Report();
 const chosen=chooseAiV3Action(packs,state,{actor:0,mode:'prior',seed:1,nodes:48});
 assert.equal(chosen.type,'play');
 assert.equal(chosen.uid,body.uid);
});

test('belief samples share one node budget with hard-search-2',()=>{
 const deck=mainDecks().find(item=>item.title==='bleach');
 const {packs,state}=boot(deck,7);
 resetHardAiReport();
 chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:1});
 assert.ok(hardAiReport().nodes<=48);
 resetAiV3Report();
 chooseAiV3Action(packs,state,{actor:0,mode:'belief',worlds:2,nodes:48,ms:1e9,beam:4,seed:3});
 const used=lastAiV3Trace().nodesUsed;
 assert.equal(aiV3Report().nodes,used);
 assert.ok(used>0&&used<=48,'used '+used);
});

test('first player and challenger seat are separate pairings',()=>{
 const grid=matchGrid(8100);
 assert.equal(grid.length,4);
 assert.equal(grid.filter(row=>row.challengerIsFirst).length,2);
 assert.deepEqual(grid.filter(row=>row.first===0).map(row=>row.challengerSeat).sort(),[0,1]);
 const rows=[
  {seed:8100,first:0,challengerSeat:0,finished:true,winner:0},
  {seed:8100,first:0,challengerSeat:1,finished:true,winner:0},
  {seed:8100,first:1,challengerSeat:0,finished:true,winner:1},
  {seed:8100,first:1,challengerSeat:1,finished:true,winner:1}
 ];
 const paired=pairedChallenger(rows);
 assert.equal(paired.n,2);
 assert.equal(paired.mean,0);
});

test('an engine-scheduled delayed retirement changes the position key',()=>{
 const pack=officialV2Pack('solo-leveling');
 const counts={'SLG-1-042':4};
 let total=4;
 const triggers={final:0,color:0,special:0,draw:0};
 for(const card of Object.values(pack.cards).filter(item=>item.id!=='SLG-1-042').sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0});
 while(state.phase!=='main')state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 const source=take(state,0,'SLG-1-042');
 place(state,0,source,'energy',0);
 assert.equal(assertUniversalMatch(packs,state),true);
 const before=positionKey(state,0,'us',2);
 const activate=legalUniversalActions(packs,state).find(action=>action.type==='activate'&&action.uid===source.uid);
 const after=dispatchUniversalAction(packs,state,activate,{actor:0});
 assert.equal(after.delayedEffects.some(effect=>effect.op==='retireAtMainEnd'&&effect.sourceUid===source.uid),true);
 assert.equal(after.mainAbilityUsedUids.includes(source.uid),true);
 assert.notEqual(positionKey(after,0,'us',2),before);
});

function cardId(state,action){
 for(const player of state.players)for(const zone of ['hand','front','energy']){
  const card=(player[zone]||[]).find(item=>item?.uid===action?.uid);
  if(card)return card.cardId;
 }
 return '';
}
function whiteSwordAt(seed,first,seat,target){
 const report=JSON.parse(readFileSync(new URL('../audit/ai-v3-official-8300-scope-36.json',import.meta.url),'utf8'));
 const deck=battleDecks().find(item=>item.id==='white-sword');
 const game=report.titles['white-sword'].byMode.tree.games.find(item=>item.seed===seed&&item.first===first&&item.challengerSeat===seat);
 const packs=[deck.pack,deck.pack];
 const rules=matchRules('official');
 let state=newComparedMatch(packs,[deck.counts,deck.counts],seed,first,rules);
 for(const choice of game.opening||[]){
  const action=legalUniversalActions(packs,state).find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
  state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
 }
 for(const step of game.actions){
  if(step.step===target)return {packs,state};
  const actor=state.pending?.player??state.active;
  const action=legalUniversalActions(packs,state).find(item=>JSON.stringify(item)===JSON.stringify(step.action));
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 throw new Error('missing step '+target);
}

test('white sword turn 1 searches the plain energy play before the on-play and before passing',()=>{
 const {packs,state}=whiteSwordAt(8300,0,0,2);
 const actor=0;
 const legal=legalUniversalActions(packs,state);
 const ranked=rankLegal(packs,state,actor,legal,null);
 const energy=ranked.filter(action=>action.type==='play'&&action.line==='energy');
 assert.equal(cardId(state,energy[0]),'BLC-1-083');
 const onPlay=ranked.findIndex(action=>action.type==='play'&&action.line==='energy'&&cardId(state,action)==='BLC-4-066');
 const quietFront=ranked.findIndex(action=>action.type==='play'&&action.line==='front'&&cardId(state,action)==='BLC-1-083');
 assert.ok(onPlay>=0&&quietFront>onPlay);
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:24,now:()=>meter.dispatches,meter,diagnose:true});
 const trace=lastAiV3Trace();
 assert.equal(cardId(state,action),'BLC-1-083');
 assert.equal(action.line,'energy');
 assert.equal(trace.rootPlan[0].type,'play');
 assert.equal(cardId(state,trace.rootPlan[0]),'BLC-1-083');
 assert.ok(trace.rootPlan.findIndex(item=>item.type==='next')>0);
 const quiet=trace.candidates.find(row=>row.action?.line==='energy'&&cardId(state,row.action)==='BLC-1-083');
 const noisy=trace.candidates.find(row=>row.action?.line==='energy'&&cardId(state,row.action)==='BLC-4-066');
 const front=trace.candidates.find(row=>row.action?.line==='front');
 assert.equal(quiet.boundary,'returned');
 assert.ok(quiet.search>0);
 if(noisy?.boundary==='returned')assert.ok(quiet.search>noisy.search);
 assert.ok(front&&front.nodes>0);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(meter.dispatches<=48);
});

test('a legal raid still outranks the plain energy play, and an attack is not passed',()=>{
 const raidSpot=whiteSwordAt(8300,0,0,40);
 const raidLegal=legalUniversalActions(raidSpot.packs,raidSpot.state);
 const raidRanked=rankLegal(raidSpot.packs,raidSpot.state,0,raidLegal,null);
 assert.equal(raidRanked[0].type,'raid');
 const attackSpot=whiteSwordAt(8301,1,1,35);
 const actor=attackSpot.state.pending?.player??attackSpot.state.active;
 const attackLegal=legalUniversalActions(attackSpot.packs,attackSpot.state);
 assert.equal(attackLegal.some(action=>action.type==='attack'),true);
 resetAiV3Report();
 const attackMeter={dispatches:0};
 const action=chooseAiV3Action(attackSpot.packs,attackSpot.state,{...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,meter:attackMeter,diagnose:true});
 assert.equal(action.type,'attack');
 assert.equal(attackMeter.dispatches,lastAiV3Trace().nodesUsed);
 const raidMeter={dispatches:0};
 resetAiV3Report();
 chooseAiV3Action(raidSpot.packs,raidSpot.state,{...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,meter:raidMeter,diagnose:true});
 const raidTrace=lastAiV3Trace();
 const raidRow=(raidTrace.candidates||[]).find(row=>row.action?.type==='raid');
 assert.ok(raidRow&&raidRow.nodes>0);
 assert.ok((raidTrace.candidates||[]).some(row=>row.action?.type==='next'&&row.nodes>0));
 assert.equal(raidMeter.dispatches,raidTrace.nodesUsed);
});

function clocked(spot,ms,extra={}){
 const actor=spot.state.pending?.player??spot.state.active;
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(spot.packs,spot.state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',diagnose:true,meter,
  nodes:extra.nodes??48,ms,now:extra.now||(()=>meter.dispatches)
 });
 const trace=lastAiV3Trace();
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=(extra.nodes??48));
 assert.equal(legalUniversalActions(spot.packs,spot.state).some(item=>same(item,action)),true);
 return {action,trace,meter,actor};
}

test('step 17 searches the front before the clock is gone, and a cut does not copy the energy rank',()=>{
 const spot=whiteSwordAt(8301,1,1,17);
 const covered=clocked(spot,36);
 const front=covered.trace.candidates.find(row=>row.action?.line==='front'&&cardId(spot.state,row.action)==='BLC-4-070');
 assert.ok(front&&front.nodes>=4);
 assert.equal(cardId(spot.state,covered.action),'BLC-4-070');
 assert.equal(covered.action.line,'front');
 assert.equal(covered.trace.fallbackKind,null);
 const cut=clocked(spot,12);
 assert.equal(cut.trace.reason,'budget-fallback');
 assert.equal(cut.trace.fallbackKind,'budget');
 const started=(cut.trace.candidates||[]).find(row=>row.action?.line==='front');
 assert.equal(started?.nodes||0,0);
 assert.equal(cut.action.line,'front');
 assert.equal(cardId(spot.state,cut.action),'BLC-4-070');
 const fixed=clocked(spot,1e9,{now:()=>0});
 assert.equal(fixed.action.line,'front');
 assert.equal(cardId(spot.state,fixed.action),'BLC-4-070');
 assert.equal(fixed.trace.reason,'search');
});

test('a line with no energy keeps the energy play when the search is cut',()=>{
 const spot=whiteSwordAt(8300,0,0,2);
 const none=clocked(spot,0);
 assert.equal(none.meter.dispatches,0);
 assert.equal(none.action.line,'energy');
 assert.equal(cardId(spot.state,none.action),'BLC-1-083');
 const early=clocked(spot,4);
 assert.equal(early.trace.reason,'budget-fallback');
 assert.equal(early.action.line,'energy');
 assert.equal(cardId(spot.state,early.action),'BLC-1-083');
});

test('a finished on-play line still wins when that score is higher',()=>{
 const spot=whiteSwordAt(8302,1,1,2);
 const full=clocked(spot,1e9,{now:()=>0});
 const rows=full.trace.candidates.filter(row=>row.action?.line==='energy'&&row.boundary==='returned');
 const loud=rows.find(row=>cardId(spot.state,row.action)==='BLC-4-066');
 const quiet=rows.find(row=>cardId(spot.state,row.action)==='BLC-1-083');
 assert.ok(loud&&quiet);
 assert.ok(loud.search>quiet.search);
 assert.equal(full.action.line,'energy');
 assert.equal(cardId(spot.state,full.action),'BLC-4-066');
});

test('zero, tiny, entry, and mid-search clocks record every transition',()=>{
 const spot=whiteSwordAt(8301,1,1,17);
 const zero=clocked(spot,1e9,{nodes:0,now:()=>0});
 assert.equal(zero.meter.dispatches,0);
 const tiny=clocked(spot,1e9,{nodes:2,now:()=>0});
 assert.ok(tiny.meter.dispatches>0&&tiny.meter.dispatches<=2);
 const entry=clocked(spot,0);
 assert.equal(entry.meter.dispatches,0);
 assert.equal(entry.trace.reason,'budget-fallback');
 const meter={dispatches:0};
 let jumped=false;
 resetAiV3Report();
 const actor=spot.state.pending?.player??spot.state.active;
 const action=chooseAiV3Action(spot.packs,spot.state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,meter,diagnose:true,
  now(){return jumped?1000:meter.dispatches;},
  onRootDone(){if(meter.dispatches>0)jumped=true;}
 });
 const trace=lastAiV3Trace();
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed>0&&trace.nodesUsed<48);
 assert.equal(legalUniversalActions(spot.packs,spot.state).some(item=>same(item,action)),true);
 assert.ok(trace.unexecuted.length>=1);
 assert.ok(trace.unexecuted.every(row=>row.reason==='time'));
});

// The clock stays at the origin until `expireAfter` reads, then reports a
// time past the total deadline and stays there. The assertion is the
// deadline invariant: once a read is past that deadline, the decision adds
// no further engine transition. It does not require shareDeadline to read
// the clock twice.
function transitionsAfterExpiry(ms,expireAfter,nowFor){
 const spot=whiteSwordAt(8301,1,1,17);
 const meter={dispatches:0};
 let reads=0;
 let atExpiry=null;
 resetAiV3Report();
 const actor=spot.state.pending?.player??spot.state.active;
 const action=chooseAiV3Action(spot.packs,spot.state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms,meter,diagnose:true,
  now(){
   const time=nowFor?nowFor(meter,reads):((reads>=expireAfter)?ms+1000:0);
   reads++;
   if(time>ms&&atExpiry==null)atExpiry=meter.dispatches;
   return time;
  }
 });
 const trace=lastAiV3Trace();
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=48);
 assert.equal(legalUniversalActions(spot.packs,spot.state).some(item=>same(item,action)),true);
 return {dispatches:meter.dispatches,atExpiry,added:meter.dispatches-(atExpiry??meter.dispatches),trace,action};
}

test('a clock that crosses the total deadline adds no later transition',()=>{
 // Entry reads, the first root's time share, and the reads before its
 // first transition. One of these is the old second sample that extended
 // the deadline and billed 16 transitions after the parent deadline.
 for(let expireAfter=1;expireAfter<=12;expireAfter++){
  const row=transitionsAfterExpiry(40,expireAfter);
  assert.notEqual(row.atExpiry,null,'clock crossed '+expireAfter);
  assert.equal(row.added,0,'transitions after expiry at read '+expireAfter+' ('+row.dispatches+' dispatched, expiry at '+row.atExpiry+')');
 }
});

test('expiry after the time share and before the first transition adds nothing',()=>{
 // Read 4 samples the share. Read 5 admits the world. Read 6 is the check
 // immediately before the first transition. Crossing there must not bill it.
 const row=transitionsAfterExpiry(40,6);
 assert.equal(row.atExpiry,0);
 assert.equal(row.added,0);
 assert.equal(row.dispatches,0);
});

test('a transition already started can finish after the deadline and does not start another',()=>{
 const row=transitionsAfterExpiry(40,0,(meter,reads)=>{
  if(reads===0)return 0;
  return meter.dispatches>=1?1000:meter.dispatches;
 });
 assert.equal(row.dispatches,1);
 assert.equal(row.atExpiry,1);
 assert.equal(row.added,0);
});

test('a normal dispatch clock still leaves a later root some nodes',()=>{
 const spot=whiteSwordAt(8301,1,1,17);
 const covered=clocked(spot,36);
 const started=covered.trace.candidates.filter(row=>row.nodes>0);
 assert.ok(started.length>=2);
 assert.ok(covered.trace.coverage.executed>=2);
 assert.equal(cardId(spot.state,covered.action),'BLC-4-070');
 assert.equal(covered.action.line,'front');
});

test('a frozen clock keeps the fixed 48-node choice inside the node cap',()=>{
 const spot=whiteSwordAt(8301,1,1,17);
 const fixed=clocked(spot,1e9,{now:()=>0});
 assert.equal(cardId(spot.state,fixed.action),'BLC-4-070');
 assert.equal(fixed.action.line,'front');
 assert.equal(fixed.trace.reason,'search');
 assert.ok(fixed.trace.nodesUsed<=48);
 assert.equal(fixed.meter.dispatches,fixed.trace.nodesUsed);
});

function setBp(packs,state,card,bp){
 const delta=bp-universalBp(packs,state,card);
 card.buffs=delta?[{bp:delta,untilTurn:state.turn}]:[];
}
function openBlock({life=7,damage=1,impact=0,blockerId='BLC-1-042',attackerId='BLC-1-043',blockerBp=1000,attackerBp=4000}={}){
 const deck=mainDecks().find(item=>item.title==='bleach');
 const packs=[deck.pack,deck.pack];
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:7,first:0});
 for(let guard=0;guard<16&&!(state.active===1&&state.phase==='attack');guard++){
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw');
  if(!action)break;
  state=dispatchUniversalAction(packs,state,action);
 }
 const blocker=take(state,0,blockerId);
 const attacker=take(state,1,attackerId);
 blocker.ready=true;
 attacker.ready=true;
 blocker.fieldEntryStamp=state.nextFieldEntryStamp++;
 attacker.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[0].front[0]=blocker;
 state.players[1].front[0]=attacker;
 while(state.players[0].life.length>life)state.players[0].deck.push(state.players[0].life.pop());
 setBp(packs,state,blocker,blockerBp);
 setBp(packs,state,attacker,attackerBp);
 if(damage===2)attacker.attackDamageGranted={turn:state.turn,stamp:attacker.fieldEntryStamp,amount:2};
 if(impact>0)attacker.impactGranted={turn:state.turn,stamp:attacker.fieldEntryStamp,amount:impact};
 assert.equal(assertUniversalMatch(packs,state),true);
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack'&&action.uid===attacker.uid);
 assert.ok(swing);
 state=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(state.pending?.kind,'block');
 return {packs,state,blocker,attacker};
}
function chosenBlock(packs,state){
 const action=battleWindowAction(packs,state,0);
 assert.ok(action);
 return action.uid?state.players[0].front.find(card=>card?.uid===action.uid)?.cardId||action.uid:null;
}

test('one life makes a smaller blocker worth more than the character',()=>{
 const {packs,state,blocker}=openBlock({life:1,blockerBp:1000,attackerBp:4000});
 assert.equal(universalAttackDamage(packs,state,state.players[1].front[0]),1);
 assert.equal(chosenBlock(packs,state),blocker.cardId);
 const blocked=dispatchUniversalAction(packs,state,battleWindowAction(packs,state,0),{actor:0});
 assert.equal(blocked.players[0].life.length,1);
 assert.equal(blocked.players[0].front.some(card=>card?.uid===blocker.uid),false);
 const passed=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='chooseBlock'&&!action.uid),{actor:0});
 assert.equal(passed.players[0].life.length,0);
});

test('spare life keeps an important character instead of trading it for one damage',()=>{
 const opened=openBlock({life:7,blockerBp:4000,attackerBp:4000});
 assert.equal(chosenBlock(opened.packs,opened.state),null);
 const blocked=dispatchUniversalAction(opened.packs,opened.state,legalUniversalActions(opened.packs,opened.state).find(action=>action.uid===opened.blocker.uid),{actor:0});
 assert.equal(blocked.players[0].front.some(card=>card?.uid===opened.blocker.uid),false);
 assert.equal(blocked.players[0].life.length,7);
});

test('impact, impact-null and multi-damage follow the engine rather than assuming a block saves life',()=>{
 const plain=openBlock({life:7,blockerBp:2000,attackerBp:4000});
 assert.equal(chosenBlock(plain.packs,plain.state),plain.blocker.cardId);
 const impact=openBlock({life:7,blockerBp:2000,attackerBp:4000,impact:1});
 assert.equal(universalImpact(impact.packs,impact.state,impact.attacker),1);
 assert.equal(universalImpactNull(impact.packs,impact.state,impact.blocker),false);
 assert.equal(chosenBlock(impact.packs,impact.state),null);
 const traded=dispatchUniversalAction(impact.packs,impact.state,legalUniversalActions(impact.packs,impact.state).find(action=>action.uid===impact.blocker.uid),{actor:0});
 let life=traded;
 for(let guard=0;guard<4&&life.pending;guard++){
  const actor=life.pending.player??life.active;
  const legal=legalUniversalActions(impact.packs,life);
  const step=legal.find(action=>action.type==='chooseAttackLife')||legal[0];
  life=dispatchUniversalAction(impact.packs,life,step,{actor});
 }
 assert.equal(life.players[0].life.length,6);
 assert.equal(life.players[0].front.some(card=>card?.uid===impact.blocker.uid),false);
 const nulled=openBlock({life:7,blockerId:'BLC-1-043',attackerId:'BLC-1-042',blockerBp:2000,attackerBp:4000,impact:1});
 assert.equal(universalImpactNull(nulled.packs,nulled.state,nulled.blocker),true);
 assert.equal(chosenBlock(nulled.packs,nulled.state),nulled.blocker.cardId);
 const stopped=dispatchUniversalAction(nulled.packs,nulled.state,battleWindowAction(nulled.packs,nulled.state,0),{actor:0});
 assert.equal(stopped.players[0].life.length,7);
 assert.equal(stopped.players[0].front.some(card=>card?.uid===nulled.blocker.uid),false);
 const doubled=openBlock({life:7,blockerBp:4000,attackerBp:5000,damage:2});
 assert.equal(universalAttackDamage(doubled.packs,doubled.state,doubled.attacker),2);
 assert.equal(chosenBlock(doubled.packs,doubled.state),doubled.blocker.cardId);
 const single=openBlock({life:7,blockerBp:4000,attackerBp:5000,damage:1});
 assert.equal(chosenBlock(single.packs,single.state),null);
});

function nodes48At(target){
 const report=JSON.parse(readFileSync(new URL('../audit/ai-v3-official-8300-nodes48-white.json',import.meta.url),'utf8'));
 const deck=battleDecks().find(item=>item.id==='white-sword');
 const game=report.titles['white-sword'].byMode.tree.games.find(item=>item.seed===8301&&item.first===1&&item.challengerSeat===0);
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],8301,1,matchRules('official'));
 for(const choice of game.opening||[]){
  const action=legalUniversalActions(packs,state).find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
  state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
 }
 for(const step of game.actions){
  if(step.step===target)return {packs,state};
  const actor=state.pending?.player??state.active;
  const action=legalUniversalActions(packs,state).find(item=>JSON.stringify(item)===JSON.stringify(step.action));
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 throw new Error('missing step '+target);
}
function finishNoted(packs,state,root){
 const world=beliefWorlds(packs,state,0,1,1)[0].state;
 const go=(cursor,action)=>dispatchUniversalAction(packs,cursor,action,{actor:cursor.pending?.player??cursor.active});
 let cursor=go(world,root);
 for(let guard=0;guard<24&&cursor.status==='playing'&&!(!cursor.pending&&cursor.active===0&&cursor.phase==='start'&&cursor.players[0].ownTurns>state.players[0].ownTurns);guard++){
  const seat=cursor.pending?.player??cursor.active;
  let action=null;
  if(cursor.pending?.kind==='block')action=battleWindowAction(packs,cursor,0);
  if(!action){
   const legal=legalUniversalActions(packs,cursor);
   if(seat===0){
    action=legal.find(item=>item.type==='chooseDiscardGate'&&!item.uid)||
     legal.find(item=>item.type==='chooseAttackLife')||
     legal.find(item=>item.type==='next')||legal[0];
   }else action=rankLegal(packs,cursor,seat,legal,null)[0];
  }
  if(!action)break;
  cursor=go(cursor,action);
 }
 return cursor;
}

test('step 24 scores an open battle without calling the cut a finished turn',()=>{
 const spot=nodes48At(24);
 const fixed=clocked(spot,1e9,{now:()=>0});
 const lineOf=row=>row.action?.line||row.action?.type;
 const rows=fixed.trace.candidates.filter(row=>['energy','front','next'].includes(lineOf(row)));
 assert.equal(rows.length,3);
 for(const row of rows){
  assert.equal(row.boundary,'pending');
  assert.equal(row.settled,false);
  assert.notEqual(row.boundary,'returned');
  assert.ok(row.nodes<=16);
 }
 assert.equal(fixed.trace.nodesUsed,48);
 const front=rows.find(row=>lineOf(row)==='front');
 const energy=rows.find(row=>lineOf(row)==='energy');
 const passed=rows.find(row=>lineOf(row)==='next');
 assert.equal(front.stopPending,'block');
 assert.equal(energy.stopPending,'block');
 assert.equal(passed.stopPending,'life-trigger');
 assert.ok(front.search>energy.search);
 assert.ok(front.search>passed.search);
 assert.ok(front.search<-28);
 assert.ok(energy.search<-40);
 const followed={};
 for(const row of rows){
  const end=finishNoted(spot.packs,spot.state,row.action);
  followed[lineOf(row)]=end.players[0].life.length;
 }
 assert.equal(followed.front,6);
 assert.equal(followed.energy,5);
 assert.ok(followed.next<=5);
 assert.equal(lineOf({action:fixed.action}),'front');
});
