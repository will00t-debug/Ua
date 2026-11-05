import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mainDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseAiV3Action,lastAiV3Trace,AI_V3_POLICY,AI_V3_BASELINE,resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {blendRoot,learnBonus,SEARCH_PRIOR_GAP} from '../dist/universal-v2/ai-v3/prior.mjs';
import {featureKeys,hashV4,V4_DIM,V4_FORMAT} from '../dist/universal-v2/ai-v3/v4-features.mjs';
import {holdoutLastMatch,valueLabel} from '../dist/universal-v2/ai-v3/learn-bridge.mjs';
import {beliefWorld} from '../dist/universal-v2/ai-v3/belief.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
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
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,OPTS);
 const trace=lastAiV3Trace();
 assert.equal(action.type,'play');
 assert.equal(action.line,'front');
 assert.equal(action.uid,body.uid);
 assert.equal(trace.policy,AI_V3_POLICY);
 assert.ok(trace.opponentTurns>=1);
 assert.equal(trace.fallback,false);
 const front=dispatchUniversalAction(packs,state,action,{actor:0});
 assert.equal(front.players[0].front.some(card=>card?.uid===body.uid),true);
 assert.equal(legalUniversalActions(packs,state).some(item=>same(item,action)),true);
 const swapped=hiddenSwap(state);
 assert.deepEqual(chooseAiV3Action(packs,swapped,OPTS),action);
 const world=beliefWorld(packs,state,0,11,0);
 const trueHand=state.players[1].hand.map(card=>card.cardId).sort().join(',');
 const believed=world.state.players[1].hand.map(card=>card.cardId).sort().join(',');
 assert.notEqual(believed,trueHand);
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
});
