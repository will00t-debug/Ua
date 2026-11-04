import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {coachObservation,hiddenLeak} from '../dist/universal-v2/coach-record.mjs';
import {officialV2Pack,officialV2Titles} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {LEARN_FORMAT,LEARN_FORMAT_V2,LEARN_FORMAT_V3,LEARN_DIM,LEARN_ASSIST_CAP,LEARN_BONUS_RATE,LEARN_BONUS_THRESHOLD,
 LEARN_MIN_AGREEMENT,LEARN_MIN_VALIDATION_DECISIONS,
 LEARN_MIN_VALIDATION_MATCHES,actionIdentity,activationOf,applyLearningAssist,featureKeys,featuresOf,
 interventionOf,learningAssistBonus,learningBattleMode,learnReport,partitionByMatch,policyRecordStatus,preferLearnedAction,trainPolicy} from '../dist/universal-v2/learn-policy.mjs';

const bleach=verifiedBleachPurplePilotDeck();
const bleachPacks=[bleach.pack,bleach.pack];
const ttg=verifiedTtgRedPilotDeck();
const ttgPacks=[ttg.pack,ttg.pack];
const clock={ms:1e9};

function play(packs,state,pred){
 const legal=legalUniversalActions(packs,state);
 const action=typeof pred==='function'?legal.find(pred):pred;
 assert.ok(action,(state.phase||'')+' '+(state.pending?.kind||'')+' 沒有要測的合法操作');
 const actor=state.pending?.player??state.active;
 return dispatchUniversalAction(packs,state,action,{actor});
}
function toPhase(packs,counts,phase,seed=3,first=0){
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed,first,openingMulligan:true});
 for(let guard=0;state.status==='playing'&&state.phase!==phase&&guard<12;guard++)
  state=play(packs,state,action=>action.mode==='keep'||action.type==='next');
 assert.equal(state.phase,phase);
 assert.equal(state.pending,null);
 return state;
}
function take(state,player,cardId){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  const index=list.findIndex(card=>card?.cardId===cardId);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('找不到 '+cardId);
}
function place(state,player,cardId,line,slot,ready=true){
 const card=take(state,player,cardId);
 card.ready=ready;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
 return card;
}
function hold(state,player,cards){
 const keep=new Set(cards.map(card=>card.uid));
 const hand=state.players[player].hand;
 for(let i=hand.length-1;i>=0;i--)if(!keep.has(hand[i].uid))state.players[player].deck.push(hand.splice(i,1)[0]);
 for(const card of cards)if(!hand.includes(card))hand.push(card);
}
function setLife(player,count){
 while(player.life.length>count)player.deck.push(player.life.pop());
 while(player.life.length<count&&player.deck.length)player.life.push(player.deck.pop());
}
function readyAp(state,player,count){
 state.players[player].apCards.forEach((card,index)=>{
  card.inPlay=index<count;
  card.ready=index<count;
 });
}
function reach(packs,state,phase){
 for(let guard=0;state.phase!==phase&&state.status==='playing'&&guard<8;guard++)
  state=play(packs,state,action=>action.type==='next');
 assert.equal(state.phase,phase);
 return state;
}
function rowFrom(packs,state,choice,matchId,seat=0){
 const legal=legalUniversalActions(packs,state);
 assert.ok(legal.some(action=>JSON.stringify(action)===JSON.stringify(choice)));
 return {source:'human',actor:'human',seat,matchId,forced:false,
  observation:coachObservation(packs,state,seat),legal,choice};
}
function prefer(policy,packs,state,seat=0){
 const legal=legalUniversalActions(packs,state);
 return preferLearnedAction(policy,coachObservation(packs,state,seat),legal,seat);
}

test('life and resources change the learned action for the same cards',()=>{
 const base=toPhase(bleachPacks,bleach.counts,'main',4);
 const card=take(base,0,'BLC-1-039');
 hold(base,0,[card]);
 readyAp(base,0,2);
 place(base,0,'BLC-1-107','energy',0,true);
 place(base,0,'BLC-1-045','energy',1,true);
 const rows=[];
 for(let i=0;i<6;i++){
  const low=structuredClone(base),high=structuredClone(base);
  setLife(low.players[1],1);
  setLife(high.players[1],6);
  const lowLegal=legalUniversalActions(bleachPacks,low);
  const highLegal=legalUniversalActions(bleachPacks,high);
  const attack=lowLegal.find(action=>action.type==='attack');
  const front=lowLegal.find(action=>action.type==='play'&&action.uid===card.uid&&action.line==='front'&&!action.replaceUid);
  const energy=highLegal.find(action=>action.type==='play'&&action.uid===card.uid&&action.line==='energy'&&!action.replaceUid);
  assert.ok(front&&energy,'登場選項');
  const matchId='life-'+i;
  rows.push(rowFrom(bleachPacks,low,front,matchId));
  rows.push(rowFrom(bleachPacks,high,energy,matchId));
  if(!attack)continue;
 }
 const freshLow=structuredClone(base),freshHigh=structuredClone(base);
 setLife(freshLow.players[1],1);
 setLife(freshHigh.players[1],6);
 const lowKeys=featureKeys(coachObservation(bleachPacks,freshLow,0),
  legalUniversalActions(bleachPacks,freshLow).find(action=>action.type==='play'&&action.line==='front'),0);
 const highKeys=featureKeys(coachObservation(bleachPacks,freshHigh,0),
  legalUniversalActions(bleachPacks,freshHigh).find(action=>action.type==='play'&&action.line==='front'),0);
 assert.notDeepEqual(lowKeys,highKeys);
 assert.ok(lowKeys.some(key=>key.includes('play-front')&&key.includes('oppLife')));
 const policy=trainPolicy(rows);
 const lowPick=prefer(policy,bleachPacks,freshLow);
 const highPick=prefer(policy,bleachPacks,freshHigh);
 assert.equal(lowPick.action?.line,'front',lowPick.reason);
 assert.equal(highPick.action?.line,'energy',highPick.reason);
 assert.equal(lowPick.action.uid,card.uid);
 assert.equal(highPick.action.uid,card.uid);
});

test('front, block target and raid base features can be learned apart',()=>{
 let raid=toPhase(ttgPacks,ttg.counts,'main',6);
 const lowBase=place(raid,0,'TTG-1-042','front',0,true);
 const highBase=place(raid,0,'TTG-1-043','front',1,true);
 place(raid,0,'TTG-1-064','energy',0,true);
 place(raid,0,'TTG-1-047','energy',1,true);
 place(raid,0,'TTG-1-065','energy',2,true);
 const glen=take(raid,0,'TTG-1-072');
 hold(raid,0,[glen]);
 readyAp(raid,0,2);
 const raidRows=[];
 for(let i=0;i<6;i++){
  const low=structuredClone(raid),high=structuredClone(raid);
  setLife(low.players[1],1);
  setLife(high.players[1],7);
  const lowLegal=legalUniversalActions(ttgPacks,low);
  const highLegal=legalUniversalActions(ttgPacks,high);
  const lowRaid=lowLegal.find(action=>action.type==='raid'&&action.uid===glen.uid&&action.baseUid===highBase.uid);
  const highRaid=highLegal.find(action=>action.type==='raid'&&action.uid===glen.uid&&action.baseUid===lowBase.uid);
  assert.ok(lowRaid&&highRaid,'突襲底座選項');
  const keysA=featureKeys(coachObservation(ttgPacks,low,0),lowRaid,0);
  const keysB=featureKeys(coachObservation(ttgPacks,low,0),
   lowLegal.find(action=>action.type==='raid'&&action.baseUid===lowBase.uid),0);
  assert.notDeepEqual(keysA,keysB);
  assert.ok(keysA.some(key=>key.startsWith('role:base:')));
  assert.ok(keysB.some(key=>key.includes('TTG-1-042'))||keysB.some(key=>key.includes('raidPick')));
  raidRows.push(rowFrom(ttgPacks,low,lowRaid,'raid-'+i));
  raidRows.push(rowFrom(ttgPacks,high,highRaid,'raid-'+i));
 }
 const raidPolicy=trainPolicy(raidRows);
 const raidLow=structuredClone(raid),raidHigh=structuredClone(raid);
 setLife(raidLow.players[1],1);
 setLife(raidHigh.players[1],7);
 assert.equal(prefer(raidPolicy,ttgPacks,raidLow).action.baseUid,highBase.uid);
 assert.equal(prefer(raidPolicy,ttgPacks,raidHigh).action.baseUid,lowBase.uid);

 let battle=toPhase(bleachPacks,bleach.counts,'main',8);
 const attacker=place(battle,0,'BLC-1-039','front',0,true);
 const big=place(battle,1,'BLC-1-107','front',0,true);
 const small=place(battle,1,'BLC-1-048','front',1,true);
 readyAp(battle,0,1);
 battle=reach(bleachPacks,battle,'attack');
 battle=play(bleachPacks,battle,action=>action.type==='attack'&&action.uid===attacker.uid&&!action.targetUid);
 assert.equal(battle.pending.kind,'block');
 assert.equal(battle.pending.player,1);
 const blockRows=[];
 for(let i=0;i<6;i++){
  const low=structuredClone(battle),high=structuredClone(battle);
  setLife(low.players[1],1);
  setLife(high.players[1],6);
  const lowLegal=legalUniversalActions(bleachPacks,low);
  const highLegal=legalUniversalActions(bleachPacks,high);
  const bigBlock=lowLegal.find(action=>action.type==='chooseBlock'&&action.uid===big.uid);
  const smallBlock=highLegal.find(action=>action.type==='chooseBlock'&&action.uid===small.uid);
  assert.ok(bigBlock&&smallBlock);
  const bigKeys=featureKeys(coachObservation(bleachPacks,low,1),bigBlock,1);
  const smallKeys=featureKeys(coachObservation(bleachPacks,low,1),
   lowLegal.find(action=>action.type==='chooseBlock'&&action.uid===small.uid),1);
  assert.notDeepEqual(bigKeys,smallKeys);
  assert.ok(bigKeys.some(key=>key.includes('role:src:'))&&smallKeys.some(key=>key.includes('role:src:')));
  assert.ok(bigKeys.join('\n')!==smallKeys.join('\n'));
  blockRows.push(rowFrom(bleachPacks,low,bigBlock,'block-'+i,1));
  blockRows.push(rowFrom(bleachPacks,high,smallBlock,'block-'+i,1));
 }
 const blockPolicy=trainPolicy(blockRows);
 const blockLow=structuredClone(battle),blockHigh=structuredClone(battle);
 setLife(blockLow.players[1],1);
 setLife(blockHigh.players[1],6);
 assert.equal(prefer(blockPolicy,bleachPacks,blockLow,1).action.uid,big.uid);
 assert.equal(prefer(blockPolicy,bleachPacks,blockHigh,1).action.uid,small.uid);

 let moving=toPhase(ttgPacks,ttg.counts,'move',5);
 const mover=place(moving,0,'TTG-1-064','energy',0,true);
 const moves=legalUniversalActions(ttgPacks,moving).filter(action=>action.type==='move'&&action.uid===mover.uid);
 assert.ok(moves.length>=2);
 const moveKeys=moves.slice(0,2).map(action=>featureKeys(coachObservation(ttgPacks,moving,0),action,0));
 assert.notDeepEqual(moveKeys[0],moveKeys[1]);
 assert.ok(moveKeys[0].some(key=>key.includes('|move')));
});

test('uid changes and seat swaps keep the same judgment',()=>{
 const state=toPhase(bleachPacks,bleach.counts,'main',9);
 const card=take(state,0,'BLC-1-107');
 hold(state,0,[card]);
 readyAp(state,0,2);
 const rows=[];
 for(let i=0;i<6;i++){
  const low=structuredClone(state),high=structuredClone(state);
  setLife(low.players[1],1);
  setLife(high.players[1],6);
  const front=legalUniversalActions(bleachPacks,low).find(action=>action.type==='play'&&action.line==='front'&&action.uid===card.uid);
  const energy=legalUniversalActions(bleachPacks,high).find(action=>action.type==='play'&&action.line==='energy'&&action.uid===card.uid);
  rows.push(rowFrom(bleachPacks,low,front,'swap-'+i));
  rows.push(rowFrom(bleachPacks,high,energy,'swap-'+i));
 }
 const policy=trainPolicy(rows);
 const probe=structuredClone(state);
 setLife(probe.players[1],1);
 const observation=coachObservation(bleachPacks,probe,0);
 const legal=legalUniversalActions(bleachPacks,probe);
 const picked=preferLearnedAction(policy,observation,legal,0);
 assert.equal(picked.action.line,'front');
 const ids=[];
 const walk=value=>{
  if(typeof value==='string'&&/^[01]-\d+$/.test(value))ids.push(value);
  else if(Array.isArray(value))value.forEach(walk);
  else if(value&&typeof value==='object')Object.values(value).forEach(walk);
 };
 walk(observation);walk(legal);
 const map=new Map([...new Set(ids)].map((uid,index)=>[uid,uid.slice(0,2)+(100+index)]));
 const retarget=value=>{
  if(typeof value==='string')return map.get(value)||value;
  if(Array.isArray(value))return value.map(retarget);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,retarget(item)]));
  return value;
 };
 const moved=retarget(observation),movedLegal=retarget(legal);
 assert.deepEqual(featureKeys(observation,picked.action,0),featureKeys(moved,retarget(picked.action),0));
 assert.equal(actionIdentity(observation,picked.action,0),
  actionIdentity(moved,preferLearnedAction(policy,moved,movedLegal,0).action,0));
 const swapped=structuredClone(observation);
 [swapped.visible.players[0],swapped.visible.players[1]]=[swapped.visible.players[1],swapped.visible.players[0]];
 const flip=value=>value===0?1:value===1?0:value;
 swapped.visible.actor=flip(swapped.visible.actor);
 swapped.visible.active=flip(swapped.visible.active);
 if(swapped.visible.pending)swapped.visible.pending.player=flip(swapped.visible.pending.player);
 if(swapped.visible.battle)swapped.visible.battle.owner=flip(swapped.visible.battle.owner);
 const prefix=value=>{
  if(typeof value==='string'&&/^0-/.test(value))return '1-'+value.slice(2);
  if(typeof value==='string'&&/^1-/.test(value))return '0-'+value.slice(2);
  if(Array.isArray(value))return value.map(prefix);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,prefix(item)]));
  return value;
 };
 const seated=prefix(swapped);
 const seatedLegal=prefix(legal);
 assert.deepEqual(featureKeys(observation,picked.action,0),featureKeys(seated,prefix(picked.action),1));
 assert.equal(actionIdentity(observation,picked.action,0),
  actionIdentity(seated,preferLearnedAction(policy,seated,seatedLegal,1).action,1));
 const reversed=legal.slice().reverse();
 assert.equal(actionIdentity(observation,preferLearnedAction(policy,observation,reversed,0).action,0),
  actionIdentity(observation,picked.action,0));
});

test('legal order does not change the trained weights',()=>{
 const state=toPhase(bleachPacks,bleach.counts,'main',10);
 const card=take(state,0,'BLC-1-039');
 hold(state,0,[card]);
 readyAp(state,0,2);
 const observation=coachObservation(bleachPacks,state,0);
 const legal=legalUniversalActions(bleachPacks,state);
 const choice=legal.find(action=>action.type==='play'&&action.line==='front'&&action.uid===card.uid);
 const build=list=>Array.from({length:8},(_,index)=>({
  source:'human',actor:'human',seat:0,matchId:'order-'+index,forced:false,
  observation,legal:list,choice
 }));
 const forward=trainPolicy(build(legal));
 const backward=trainPolicy(build(legal.slice().reverse()));
 assert.deepEqual(forward.weights,backward.weights);
 const wide=legal.slice();
 while(wide.length<80){
  const sample=legal[wide.length%legal.length];
  wide.push({...sample,slot:(wide.length%4),from:'sample-'+wide.length});
 }
 const sampled=trainPolicy(build(wide));
 const sampledBack=trainPolicy(build(wide.slice().reverse()));
 assert.equal(sampled.negativeMode,'sampled');
 assert.deepEqual(sampled.weights,sampledBack.weights);
});

test('a bad imitation cannot overturn a visible lethal or a necessary block',()=>{
 let attack=toPhase(bleachPacks,bleach.counts,'main',12);
 const attacker=place(attack,0,'BLC-1-107','front',0,true);
 hold(attack,0,[]);
 readyAp(attack,0,1);
 for(let slot=0;slot<4;slot++)if(attack.players[1].front[slot]){
  attack.players[0].deck.push(attack.players[1].front[slot]);
  attack.players[1].front[slot]=null;
 }
 setLife(attack.players[1],1);
 attack=reach(bleachPacks,attack,'attack');
 const attackLegal=legalUniversalActions(bleachPacks,attack);
 const swing=attackLegal.find(action=>action.type==='attack'&&action.uid===attacker.uid);
 const pass=attackLegal.find(action=>action.type==='next');
 assert.ok(swing&&pass);
 const attackRows=[];
 for(let i=0;i<8;i++)attackRows.push(rowFrom(bleachPacks,structuredClone(attack),pass,'bad-attack-'+i));
 const attackPolicy=trainPolicy(attackRows);
 const before=structuredClone(attack);
 const assisted=chooseProgressSafeAiAction(bleachPacks,attack,{difficulty:'learned',policy:attackPolicy,...clock});
 assert.deepEqual(attack,before);
 assert.ok(attackLegal.some(action=>JSON.stringify(action)===JSON.stringify(assisted.action)));
 assert.equal(assisted.diagnosis.hardAction.type,'attack');
 assert.equal(assisted.diagnosis.preference.type,'next');
 assert.equal(assisted.action.type,'attack');
 assert.equal(assisted.diagnosis.changed,false);
 assert.equal(assisted.diagnosis.reason,'protect-lethal');
 assert.equal(assisted.learned,false);

 let block=toPhase(bleachPacks,bleach.counts,'main',13);
 const threat=place(block,0,'BLC-1-039','front',0,true);
 const wall=place(block,1,'BLC-1-107','front',0,true);
 place(block,1,'BLC-1-048','front',1,true);
 readyAp(block,0,1);
 setLife(block.players[1],1);
 block=reach(bleachPacks,block,'attack');
 block=play(bleachPacks,block,action=>action.type==='attack'&&action.uid===threat.uid&&!action.targetUid);
 assert.equal(block.pending.kind,'block');
 const blockLegal=legalUniversalActions(bleachPacks,block);
 const decline=blockLegal.find(action=>action.type==='chooseBlock'&&action.uid==null);
 assert.ok(decline);
 const blockRows=[];
 for(let i=0;i<8;i++)blockRows.push(rowFrom(bleachPacks,structuredClone(block),decline,'bad-block-'+i,1));
 const blockPolicy=trainPolicy(blockRows);
 const blocked=chooseProgressSafeAiAction(bleachPacks,block,{difficulty:'learned',policy:blockPolicy,...clock});
 assert.equal(blocked.diagnosis.preference.uid,null);
 assert.equal(blocked.action.type,'chooseBlock');
 assert.equal(blocked.action.uid,wall.uid);
 assert.match(blocked.diagnosis.reason,/^protect-(loss|block)$/);
 assert.equal(blocked.learned,false);
 const observation=coachObservation(bleachPacks,block,1);
 const wallAction=blockLegal.find(action=>action.type==='chooseBlock'&&action.uid===wall.uid);
 assert.equal(observation.visible.battle.damage>=observation.visible.players[1].lifeCount,true);
 const guarded=applyLearningAssist({
  policy:blockPolicy,observation,legal:blockLegal,seat:1,hardAction:wallAction,
  candidates:[{action:wallAction,score:40},{action:decline,score:30}]
 });
 assert.equal(guarded.preference.uid,null);
 assert.equal(guarded.finalAction.uid,wall.uid);
 assert.equal(guarded.changed,false);
 assert.equal(guarded.reason,'protect-block');
});

test('unknown, old and broken models fall back without leaving the legal list',()=>{
 const state=toPhase(bleachPacks,bleach.counts,'main',14);
 const legal=legalUniversalActions(bleachPacks,state);
 const observation=coachObservation(bleachPacks,state,0);
 const hard=legal.find(action=>action.type==='next');
 const candidates=legal.slice(0,4).map((action,index)=>({action,score:20-index}));
 const old=policyRecordStatus({format:'ua-v2-learn-v1',dim:512,weights:[0],support:{play:3}});
 assert.equal(old.state,'old');
 assert.match(old.message,/舊特徵|再按一次/);
 const retired=policyRecordStatus({format:LEARN_FORMAT_V2,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(0),
  support:{play:3},cards:{},profiles:{}});
 assert.equal(retired.state,'old');
 assert.match(retired.message,/重新訓練/);
 const retiredV3=policyRecordStatus({format:LEARN_FORMAT_V3,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(0),
  support:{play:3},cards:{},profiles:{}});
 assert.equal(retiredV3.state,'old');
 assert.match(retiredV3.message,/重新訓練/);
 const broken={format:LEARN_FORMAT,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(Number.NaN),support:{play:3},cards:{},profiles:{}};
 for(const policy of [{format:'ua-v2-learn-v1'},{format:LEARN_FORMAT_V2,dim:LEARN_DIM,weights:[0]},
  {format:LEARN_FORMAT_V3,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(0),support:{play:3},cards:{},profiles:{}},broken,null]){
  const result=applyLearningAssist({policy,observation,legal,seat:0,hardAction:hard,candidates});
  assert.equal(result.changed,false);
  assert.deepEqual(result.finalAction,hard);
  assert.match(result.reason,/fallback-/);
 }
 const keeps=[];
 for(let i=0;i<8;i++){
  const mulligan=newUniversalMatch(bleachPacks,{decks:[bleach.counts,bleach.counts],seed:11,first:0,openingMulligan:true});
  const choice=legalUniversalActions(bleachPacks,mulligan).find(action=>action.mode==='keep');
  keeps.push(rowFrom(bleachPacks,mulligan,choice,'mulligan-'+i));
 }
 const narrow=trainPolicy(keeps);
 const unknown=preferLearnedAction(narrow,observation,legal,0);
 assert.equal(unknown.action,null);
 assert.match(unknown.reason,/fallback-/);
});

test('training and validation do not share a match',()=>{
 const sample=choice=>({source:'human',actor:'human',seat:0,matchId:'',forced:false,choice});
 const rows=[];
 for(let i=0;i<8;i++)rows.push({...sample({type:'next'}),matchId:'match-a'});
 rows.push({...sample({type:'play'}),matchId:'match-a',note:'correction'});
 for(let i=0;i<3;i++)rows.push({...sample({type:'attack'}),matchId:'match-b'});
 rows.push({...sample({type:'raid'}),matchId:'match-b',note:'later-correction'});
 const split=partitionByMatch(rows);
 assert.equal(split.splitValid,true);
 assert.equal(split.evaluationSufficient,false);
 assert.equal(split.heldoutMatches,1);
 assert.equal(split.reliable,undefined);
 assert.ok(split.train.every(row=>row.matchId==='match-a'));
 assert.ok(split.held.every(row=>row.matchId==='match-b'));
 assert.equal(split.train.some(row=>row.note==='correction'),true);
 assert.equal(split.held.some(row=>row.note==='later-correction'),true);
 assert.equal(split.train.some(row=>row.matchId==='match-b'),false);
 const alone=partitionByMatch(rows.filter(row=>row.matchId==='match-a'));
 assert.equal(alone.splitValid,false);
 assert.equal(alone.splitReason,'insufficient-matches');
 assert.equal(alone.held.length,0);
 assert.equal(alone.train.length,9);
 const wide=[];
 for(const name of ['m1','m2','m3','m4'])
  for(let i=0;i<4;i++)wide.push({...sample({type:'next'}),matchId:name});
 const enough=partitionByMatch(wide);
 assert.equal(enough.splitValid,true);
 assert.equal(enough.evaluationSufficient,true);
 assert.equal(enough.heldoutMatches,LEARN_MIN_VALIDATION_MATCHES);
 assert.equal(enough.held.length>=LEARN_MIN_VALIDATION_DECISIONS,true);
 assert.ok(enough.held.every(row=>row.matchId==='m3'||row.matchId==='m4'));
 assert.equal(enough.train.length,8);
 assert.equal(activationOf({splitValid:true,evaluationSufficient:false,agreement:1}).acceptReason,'evaluation-insufficient');
 assert.equal(activationOf({splitValid:true,evaluationSufficient:true,agreement:0}).acceptReason,'agreement-below-threshold');
 assert.equal(activationOf({
  splitValid:true,evaluationSufficient:true,agreement:LEARN_MIN_AGREEMENT,
  comparison:{available:true,existingAgreement:0.9}
 }).acceptReason,'existing-better');
 assert.equal(activationOf({
  splitValid:true,evaluationSufficient:true,agreement:LEARN_MIN_AGREEMENT,
  comparison:{available:false,reason:'no-existing'}
 }).accepted,true);
});

test('learning does not read hidden cards or mutate the match',()=>{
 const state=toPhase(bleachPacks,bleach.counts,'main',15);
 const legal=legalUniversalActions(bleachPacks,state);
 const observation=coachObservation(bleachPacks,state,0);
 const text=JSON.stringify(observation);
 assert.equal(observation.visible.players[1].hand,null);
 assert.ok(Array.isArray(observation.visible.players[0].hand));
 const hidden=state.players[1].hand.map(card=>card.uid).concat(
  state.players[0].deck.map(card=>card.uid),
  state.players[1].deck.map(card=>card.uid),
  state.players[0].life.filter(card=>card.lifePublic!==true&&card.faceUp!==true).map(card=>card.uid),
  state.players[1].life.filter(card=>card.lifePublic!==true&&card.faceUp!==true).map(card=>card.uid)
 );
 assert.ok(hidden.length>20);
 const token=uid=>new RegExp('(^|[^0-9])'+uid+'([^0-9]|$)');
 for(const uid of hidden)assert.equal(token(uid).test(text),false,uid);
 assert.equal(text.includes('"winner"'),false);
 assert.equal(text.includes('"seed"'),false);
 assert.deepEqual(hiddenLeak(state,observation,0),[]);
 const keys=legal.flatMap(action=>featureKeys(observation,action,0)).join('\n');
 const visibleUids=state.players.flatMap(player=>[
  ...player.hand,...player.front.filter(Boolean),...player.energy.filter(Boolean)
 ].map(card=>card.uid));
 for(const uid of hidden.concat(visibleUids))assert.equal(token(uid).test(keys),false,uid);
 const before=structuredClone(state);
 const acted=chooseProgressSafeAiAction(bleachPacks,state,{difficulty:'hard',...clock});
 assert.deepEqual(state,before);
 assert.ok(legal.some(action=>JSON.stringify(action)===JSON.stringify(acted.action)));
 const learned=chooseProgressSafeAiAction(bleachPacks,state,{difficulty:'learned',policy:null,...clock});
 assert.deepEqual(state,before);
 assert.ok(legal.some(action=>JSON.stringify(action)===JSON.stringify(learned.action)));
 assert.equal(learned.diagnosis.reason,'fallback-no-policy');
});

test('a low-energy development is not pulled off the energy line',()=>{
 const state=toPhase(bleachPacks,bleach.counts,'main',16);
 const card=take(state,0,'BLC-1-039');
 hold(state,0,[card]);
 readyAp(state,0,2);
 const rows=[];
 for(let i=0;i<8;i++){
  const copy=structuredClone(state);
  const front=legalUniversalActions(bleachPacks,copy).find(action=>action.type==='play'&&action.line==='front'&&action.uid===card.uid);
  rows.push(rowFrom(bleachPacks,copy,front,'resource-'+i));
 }
 const policy=trainPolicy(rows);
 const observation=coachObservation(bleachPacks,state,0);
 const legal=legalUniversalActions(bleachPacks,state);
 const front=legal.find(action=>action.type==='play'&&action.line==='front'&&action.uid===card.uid&&!action.replaceUid);
 const energy=legal.find(action=>action.type==='play'&&action.line==='energy'&&action.uid===card.uid&&!action.replaceUid);
 const result=applyLearningAssist({
  policy,observation,legal,seat:0,hardAction:energy,
  candidates:[{action:energy,score:30},{action:front,score:28}]
 });
 assert.equal(result.preference.line,'front');
 assert.equal(result.finalAction.line,'energy');
 assert.equal(result.changed,false);
 assert.equal(result.reason,'protect-resource');
 assert.equal(observation.visible.players[0].energyTotal<=1,true);
});

function handObservation(cardId){
 return {visible:{phase:'main',turn:2,actor:0,status:'playing',players:[
  {hand:[{uid:'0-1',cardId}],handCount:1,front:[null,null,null,null],energy:[],apReady:2,apTotal:2,
   energyTotal:3,energyByColor:{purple:3},lifeCount:4,deckCount:40},
  {hand:null,handCount:4,front:[null,null,null,null],energy:[],apReady:1,apTotal:1,energyTotal:1,
   energyByColor:{},lifeCount:5,deckCount:40}
 ]}};
}
function plainRow(cardId,matchId,choice){
 const observation=handObservation(cardId);
 const play={type:'play',mode:'enter',uid:'0-1',line:'front'};
 return {source:'human',actor:'human',seat:0,matchId,forced:false,observation,
  legal:[{type:'next'},play],choice:choice||play};
}

test('one held-out decision does not count as a passed validation',()=>{
 const rows=[];
 for(let i=0;i<8;i++)rows.push(plainRow('BLC-1-039','match-train'));
 rows.push(plainRow('BLC-1-045','match-held',{type:'next'}));
 const policy=trainPolicy(rows);
 assert.equal(policy.validation.splitValid,true);
 assert.equal(policy.validation.heldoutSamples,1);
 assert.equal(policy.validation.heldoutMatches,1);
 assert.equal(policy.validation.evaluationSufficient,false);
 assert.equal(policy.validation.accepted,false);
 assert.equal(policy.validation.acceptReason,'evaluation-insufficient');
 assert.equal(policy.validation.reliable,undefined);
 assert.equal(policy.format,LEARN_FORMAT);
});

test('an unfamiliar finalist cannot inherit another card passing the familiarity check',()=>{
 const state=toPhase(bleachPacks,bleach.counts,'main',21);
 const card039=take(state,0,'BLC-1-039');
 const card045=take(state,0,'BLC-1-045');
 place(state,0,'BLC-1-034','energy',0,true);
 place(state,0,'BLC-1-036','energy',1,true);
 hold(state,0,[card039,card045]);
 readyAp(state,0,2);
 const legal=legalUniversalActions(bleachPacks,state);
 const front039=legal.find(action=>action.type==='play'&&action.uid===card039.uid&&action.line==='front'&&!action.replaceUid);
 const energy039=legal.find(action=>action.type==='play'&&action.uid===card039.uid&&action.line==='energy'&&!action.replaceUid);
 const front045=legal.find(action=>action.type==='play'&&action.uid===card045.uid&&action.line==='front'&&!action.replaceUid);
 const energy045=legal.find(action=>action.type==='play'&&action.uid===card045.uid&&action.line==='energy'&&!action.replaceUid);
 const next=legal.find(action=>action.type==='next');
 assert.ok(front039&&energy039&&front045&&energy045&&next);
 const rows=[];
 for(let i=0;i<10;i++)rows.push(rowFrom(bleachPacks,structuredClone(state),front039,'known-'+i));
 const policy=trainPolicy(rows);
 const observation=coachObservation(bleachPacks,state,0);
 const alone=preferLearnedAction(policy,observation,[front045,energy045],0);
 assert.equal(alone.action,null);
 assert.equal(alone.reason,'fallback-unknown');
 const learn=action=>{
  const vec=featuresOf(observation,action,0);
  let score=0;
  for(let i=0;i<vec.length;i++)if(vec[i])score+=policy.weights[i]*vec[i];
  return score;
 };
 const energyTarget=LEARN_BONUS_THRESHOLD+(7/LEARN_BONUS_RATE)+0.05;
 const energyVec=featuresOf(observation,energy039,0);
 const frontVec=featuresOf(observation,front039,0);
 const nextVec=featuresOf(observation,next,0);
 const strictlyFront=()=>legal.every(action=>action===front039||learn(action)<learn(front039));
 let lifted=false;
 for(let i=0;i<frontVec.length&&!lifted;i++){
  if(!frontVec[i]||energyVec[i]||nextVec[i])continue;
  const start=policy.weights[i];
  policy.weights[i]=start+30/frontVec[i];
  if(strictlyFront())lifted=true;
  else policy.weights[i]=start;
 }
 assert.equal(lifted,true);
 const energyGoal=learn(next)+energyTarget;
 assert.ok(energyGoal<learn(front039));
 let energySet=false;
 for(let i=0;i<energyVec.length&&!energySet;i++){
  if(!energyVec[i]||frontVec[i]||nextVec[i])continue;
  const start=policy.weights[i];
  policy.weights[i]=start+(energyGoal-learn(energy039))/energyVec[i];
  if(learn(energy039)>learn(next)&&learn(energy039)<learn(front039)&&strictlyFront())energySet=true;
  else policy.weights[i]=start;
 }
 assert.equal(energySet,true);
 assert.ok(learningAssistBonus(learn(energy039)-learn(next))>=7);
 assert.ok(80+LEARN_ASSIST_CAP<107);
 const preference=preferLearnedAction(policy,observation,legal,0);
 assert.equal(preference.action.uid,card039.uid);
 assert.equal(preference.action.line,'front');
 const assisted=applyLearningAssist({
  policy,observation,legal,seat:0,hardAction:next,
  candidates:[
   {action:next,score:100},
   {action:energy039,score:100},
   {action:front039,score:80},
   {action:front045,score:200}
  ]
 });
 assert.equal(assisted.preference.uid,card039.uid);
 assert.equal(assisted.preference.line,'front');
 assert.equal(assisted.finalAction.uid,card039.uid);
 assert.equal(assisted.finalAction.line,'energy');
 assert.notEqual(assisted.finalAction.line,assisted.preference.line);
 assert.notEqual(assisted.finalAction.type,next.type);
 assert.equal(assisted.changed,true);
 assert.equal(assisted.reason,'assist');
 assert.notEqual(assisted.finalAction.uid,card045.uid);
 const kept=applyLearningAssist({
  policy,observation,legal,seat:0,hardAction:front045,
  candidates:[
   {action:front045,score:100},
   {action:front039,score:30},
   {action:energy039,score:20},
   {action:next,score:10}
  ]
 });
 assert.equal(kept.finalAction.uid,card045.uid);
 assert.equal(kept.changed,false);
 assert.equal(kept.reason,'assist-kept');
});

function colorDeck(pack,color,required){
 const rest=Object.values(pack.cards).filter(card=>card.color===color&&(card.maxCopies||4)===4&&
  !required.includes(card.id)&&!['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13,color+' filler');
 const counts=Object.fromEntries(built.map((id,index)=>[id,index===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function anyDeck(pack,required){
 const rest=Object.values(pack.cards).filter(card=>(card.maxCopies||4)===4&&!required.includes(card.id)&&
  !['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,index)=>[id,index===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function reachMain(pack,counts,seed){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let guard=0;state.phase!=='main'&&state.status==='playing'&&guard<8;guard++)
  state=dispatchUniversalAction(packs,state,{type:'next'});
 assert.equal(state.phase,'main');
 assert.equal(assertUniversalMatch(packs,state),true);
 return {packs,state};
}
function retarget(value,map){
 if(typeof value==='string')return map.get(value)||value;
 if(Array.isArray(value))return value.map(item=>retarget(item,map));
 if(value&&typeof value==='object')
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,retarget(item,map)]));
 return value;
}
function uidMap(value){
 const ids=[];
 const walk=item=>{
  if(typeof item==='string'&&/^[01]-\d+$/.test(item))ids.push(item);
  else if(Array.isArray(item))item.forEach(walk);
  else if(item&&typeof item==='object')Object.values(item).forEach(walk);
 };
 walk(value);
 return new Map([...new Set(ids)].map((uid,index)=>[uid,uid.slice(0,2)+(100+index)]));
}
function sameChoice(policy,observation,legal,seat,action){
 const forward=preferLearnedAction(policy,observation,legal,seat);
 const reversed=preferLearnedAction(policy,observation,legal.slice().reverse(),seat);
 assert.equal(actionIdentity(observation,forward.action,seat),actionIdentity(observation,action,seat));
 assert.equal(actionIdentity(observation,reversed.action,seat),actionIdentity(observation,action,seat));
 const map=uidMap([observation,legal,action]);
 const moved=retarget(observation,map);
 const movedAction=retarget(action,map);
 assert.deepEqual(featureKeys(observation,action,seat),featureKeys(moved,movedAction,seat));
 assert.equal(actionIdentity(observation,action,seat),actionIdentity(moved,movedAction,seat));
 const swapped=structuredClone(observation);
 [swapped.visible.players[0],swapped.visible.players[1]]=[swapped.visible.players[1],swapped.visible.players[0]];
 const flip=item=>item===0?1:item===1?0:item;
 swapped.visible.actor=flip(swapped.visible.actor);
 swapped.visible.active=flip(swapped.visible.active);
 if(swapped.visible.pending)swapped.visible.pending.player=flip(swapped.visible.pending.player);
 const prefix=item=>{
  if(typeof item==='string'&&/^0-/.test(item))return '1-'+item.slice(2);
  if(typeof item==='string'&&/^1-/.test(item))return '0-'+item.slice(2);
  if(Array.isArray(item))return item.map(prefix);
  if(item&&typeof item==='object')return Object.fromEntries(Object.entries(item).map(([key,child])=>[key,prefix(child)]));
  return item;
 };
 const seated=prefix(swapped);
 assert.deepEqual(featureKeys(observation,action,seat),featureKeys(seated,prefix(action),seat===0?1:0));
}

test('printed energy, revealed destination and raid-life slot stay distinct',()=>{
 const bleachPack=officialV2Pack('bleach');
 const yellow=colorDeck(bleachPack,'yellow',['BLC-1-022','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021']);
 const revealed=reachMain(bleachPack,yellow,29022);
 place(revealed.state,0,'BLC-1-002','energy',0,true);
 place(revealed.state,0,'BLC-1-012','energy',1,true);
 place(revealed.state,0,'BLC-1-018','energy',2,true);
 const shown=take(revealed.state,1,'BLC-1-021');
 revealed.state.players[1].deck.unshift(shown);
 const self=take(revealed.state,0,'BLC-1-022');
 revealed.state.players[0].hand.push(self);
 let revealedState=dispatchUniversalAction(revealed.packs,revealed.state,
  legalUniversalActions(revealed.packs,revealed.state).find(action=>action.type==='play'&&action.uid===self.uid&&action.line==='front'));
 assert.equal(revealedState.pending.kind,'effect-reveal-opp-top');
 const places=legalUniversalActions(revealed.packs,revealedState);
 const top=places.find(action=>action.place==='top');
 const outside=places.find(action=>action.place==='outside');
 assert.ok(top&&outside);
 const revealView=coachObservation(revealed.packs,revealedState,0);
 assert.notDeepEqual(featureKeys(revealView,top,0),featureKeys(revealView,outside,0));
 assert.notEqual(actionIdentity(revealView,top,0),actionIdentity(revealView,outside,0));
 const hiddenDeck=revealedState.players[1].deck.slice(1).map(card=>card.uid);
 const token=uid=>new RegExp('(^|[^0-9A-Za-z])'+uid+'([^0-9]|$)');
 for(const uid of hiddenDeck){
  assert.equal(token(uid).test(featureKeys(revealView,top,0).join('\n')),false,uid);
  assert.equal(token(uid).test(featureKeys(revealView,outside,0).join('\n')),false,uid);
 }
 const placeRows=[];
 for(let i=0;i<8;i++)placeRows.push(rowFrom(revealed.packs,structuredClone(revealedState),top,'place-'+i));
 const placePolicy=trainPolicy(placeRows);
 const placed=preferLearnedAction(placePolicy,revealView,places,0);
 assert.equal(placed.action.place,'top',placed.reason);
 sameChoice(placePolicy,revealView,places,0,top);

 const purple=colorDeck(bleachPack,'purple',['BLC-1-060','BLC-1-034','BLC-1-039','BLC-1-045','BLC-1-036']);
 const energy=reachMain(bleachPack,purple,29060);
 place(energy.state,0,'BLC-1-034','energy',0,true);
 place(energy.state,0,'BLC-1-039','energy',1,true);
 place(energy.state,0,'BLC-1-045','energy',2,true);
 const namer=take(energy.state,0,'BLC-1-060');
 energy.state.players[0].hand.push(namer);
 const namedState=dispatchUniversalAction(energy.packs,energy.state,
  legalUniversalActions(energy.packs,energy.state).find(action=>action.type==='play'&&action.uid===namer.uid&&action.line==='front'));
 assert.equal(namedState.pending.kind,'effect-choose-printed-energy');
 const numbers=legalUniversalActions(energy.packs,namedState);
 const zero=numbers.find(action=>action.value===0);
 const two=numbers.find(action=>action.value===2);
 assert.ok(zero&&two);
 const energyView=coachObservation(energy.packs,namedState,0);
 assert.notDeepEqual(featureKeys(energyView,zero,0),featureKeys(energyView,two,0));
 assert.notEqual(actionIdentity(energyView,zero,0),actionIdentity(energyView,two,0));
 const deckUids=namedState.players.flatMap(player=>player.deck.map(card=>card.uid));
 for(const uid of deckUids)
  assert.equal(token(uid).test(featureKeys(energyView,two,0).join('\n')),false,uid);
 const energyRows=[];
 for(let i=0;i<8;i++)energyRows.push(rowFrom(energy.packs,structuredClone(namedState),two,'energy-'+i));
 const energyPolicy=trainPolicy(energyRows);
 assert.equal(preferLearnedAction(energyPolicy,energyView,numbers,0).action.value,2);
 sameChoice(energyPolicy,energyView,numbers,0,two);

 const sao=officialV2Pack('sword-art-online');
 const saoCounts=anyDeck(sao,['SAO-2-011','SAO-1-028','SAO-1-003']);
 const raid=reachMain(sao,saoCounts,2014);
 place(raid.state,0,'SAO-1-003','energy',0,true);
 place(raid.state,0,'SAO-1-003','energy',1,true);
 setLife(raid.state.players[0],4);
 const base=place(raid.state,0,'SAO-1-028','front',0,true);
 const leafa=take(raid.state,0,'SAO-2-011');
 raid.state.players[0].hand.push(leafa);
 const raided=dispatchUniversalAction(raid.packs,raid.state,
  legalUniversalActions(raid.packs,raid.state).find(action=>action.type==='raid'&&action.uid===leafa.uid&&action.baseUid===base.uid&&action.line!=='energy'));
 assert.equal(raided.pending.kind,'effect-raid-life');
 const slots=legalUniversalActions(raid.packs,raided);
 const decline=slots.find(action=>action.type==='chooseRaidLife'&&action.index===null);
 const first=slots.find(action=>action.type==='chooseRaidLife'&&action.index===0);
 assert.ok(decline&&first);
 const raidView=coachObservation(raid.packs,raided,0);
 assert.notDeepEqual(featureKeys(raidView,decline,0),featureKeys(raidView,first,0));
 assert.notEqual(actionIdentity(raidView,decline,0),actionIdentity(raidView,first,0));
 const hiddenLife=raided.players.flatMap(player=>player.life.filter(card=>card.lifePublic!==true&&card.faceUp!==true).map(card=>card.uid));
 assert.ok(hiddenLife.length>0);
 const joined=featureKeys(raidView,first,0).concat(featureKeys(raidView,decline,0)).join('\n');
 for(const uid of hiddenLife)assert.equal(token(uid).test(joined),false,uid);
 const raidRows=[];
 for(let i=0;i<8;i++)raidRows.push(rowFrom(raid.packs,structuredClone(raided),first,'raid-life-'+i));
 const raidPolicy=trainPolicy(raidRows);
 assert.equal(preferLearnedAction(raidPolicy,raidView,slots,0).action.index,0);
 sameChoice(raidPolicy,raidView,slots,0,first);
});

test('every official battle title contributes printed attributes',()=>{
 const seen=[];
 for(const title of officialV2Titles()){
  const pack=officialV2Pack(title);
  const card=Object.values(pack.cards).find(item=>typeof item.energy==='number'&&typeof item.bp==='number'&&typeof item.gen==='number'&&typeof item.ap==='number');
  assert.ok(card,title);
  const keys=featureKeys(handObservation(card.id),{type:'play',mode:'enter',uid:'0-1',line:'front'},0);
  assert.equal(keys.some(key=>key.includes('printed:unknown')),false,title+' '+card.id);
  assert.ok(keys.some(key=>key.includes(':cost:')&&!key.includes(':cost:unknown')),title+' cost '+card.id);
  assert.ok(keys.some(key=>key.includes(':ap:')&&!key.includes(':ap:unknown')),title+' ap '+card.id);
  assert.ok(keys.some(key=>key.includes(':pbp:')&&!key.includes(':pbp:unknown')),title+' bp '+card.id);
  assert.ok(keys.some(key=>key.includes(':gen:')&&!key.includes(':gen:unknown')),title+' gen '+card.id);
  assert.ok(keys.some(key=>key.includes(':raid:')),title+' raid '+card.id);
  seen.push(card.id);
 }
 const fresh=officialV2Pack('rezero');
 const vol2=Object.values(fresh.cards).find(card=>String(card.id).startsWith('REZ-2-')&&typeof card.energy==='number');
 const madoka=Object.values(officialV2Pack('madoka').cards).find(card=>String(card.id).startsWith('MMM-2-'));
 const titan=Object.values(officialV2Pack('aot').cards).find(card=>String(card.id).startsWith('AOT-2-'));
 const rider=Object.values(officialV2Pack('kmr').cards).find(card=>String(card.id).startsWith('KMR-2-'));
 for(const card of [vol2,madoka,titan,rider]){
  assert.ok(card);
  const keys=featureKeys(handObservation(card.id),{type:'play',mode:'enter',uid:'0-1',line:'front'},0);
  assert.equal(keys.some(key=>key.includes('printed:unknown')),false,card.id);
  assert.ok(keys.some(key=>key.includes(':cost:')));
 }
 const unknown=featureKeys(handObservation('NO-SUCH-CARD'),{type:'play',mode:'enter',uid:'0-1',line:'front'},0);
 assert.ok(unknown.some(key=>key.includes('printed:unknown')));
 assert.equal(unknown.some(key=>key.includes(':cost:0')),false);
 assert.equal(unknown.some(key=>key.includes(':pbp:0')),false);
 assert.equal(seen.length,officialV2Titles().length);
});

test('a fair comparison uses the same unseen matches and says when it cannot',()=>{
 const first=[];
 for(let i=0;i<8;i++)first.push(plainRow('BLC-1-039','old-'+i));
 for(let i=0;i<8;i++)first.push(plainRow('BLC-1-039','old-h'+i));
 const existing=trainPolicy(first);
 assert.equal(existing.validation.accepted,true);
 const fresh=[];
 for(let i=0;i<8;i++)fresh.push(plainRow('BLC-1-039','new-'+i));
 for(let i=0;i<8;i++)fresh.push(plainRow('BLC-1-039','new-h'+i));
 const compared=trainPolicy(fresh,{existing});
 assert.equal(compared.validation.comparison.available,true);
 assert.equal(typeof compared.validation.comparison.candidateAgreement,'number');
 assert.equal(typeof compared.validation.comparison.existingAgreement,'number');
 assert.equal(compared.validation.accepted,true);
 const overlap=trainPolicy(first,{existing});
 assert.equal(overlap.validation.comparison.available,false);
 assert.equal(overlap.validation.comparison.reason,'overlap');
 assert.equal(overlap.validation.comparison.existingAgreement,null);
});

function blankModel(support,cards){
 return {format:LEARN_FORMAT,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(0),
  support,cards,profiles:{},active:true};
}
function favorOnly(policy,observation,action,seat,amount,others){
 const mine=featuresOf(observation,action,seat);
 const rest=others.map(item=>featuresOf(observation,item,seat));
 for(let i=0;i<mine.length;i++){
  if(!mine[i]||rest.some(vec=>vec[i]))continue;
  policy.weights[i]=amount;
  return true;
 }
 return false;
}
function setLearnLead(policy,observation,action,seat,lead,others){
 policy.weights.fill(0);
 const mine=featuresOf(observation,action,seat);
 const rest=others.map(item=>featuresOf(observation,item,seat));
 for(let i=0;i<mine.length;i++){
  if(!mine[i]||rest.some(vec=>vec[i]))continue;
  policy.weights[i]=lead/mine[i];
  return true;
 }
 return false;
}

test('a single alternative bonus is measured from the hard choice',()=>{
 const bleachPack=officialV2Pack('bleach');
 const yellow=colorDeck(bleachPack,'yellow',['BLC-1-022','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021']);
 const reached=reachMain(bleachPack,yellow,29022);
 place(reached.state,0,'BLC-1-002','energy',0,true);
 place(reached.state,0,'BLC-1-012','energy',1,true);
 place(reached.state,0,'BLC-1-018','energy',2,true);
 const shown=take(reached.state,1,'BLC-1-021');
 reached.state.players[1].deck.unshift(shown);
 const self=take(reached.state,0,'BLC-1-022');
 reached.state.players[0].hand.push(self);
 const state=dispatchUniversalAction(reached.packs,reached.state,
  legalUniversalActions(reached.packs,reached.state).find(action=>action.type==='play'&&action.uid===self.uid&&action.line==='front'));
 assert.equal(state.pending.kind,'effect-reveal-opp-top');
 const legal=legalUniversalActions(reached.packs,state);
 const top=legal.find(action=>action.place==='top');
 const outside=legal.find(action=>action.place==='outside');
 const observation=coachObservation(reached.packs,state,0);
 const preferred=blankModel({effect:4},{'BLC-1-021':2});
 const outsideLead=LEARN_BONUS_THRESHOLD+(1/LEARN_BONUS_RATE)+0.25;
 assert.equal(favorOnly(preferred,observation,outside,0,outsideLead,[top]),true);
 const preference=preferLearnedAction(preferred,observation,legal,0);
 assert.equal(preference.action.place,'outside',preference.reason);
 const switched=applyLearningAssist({
  policy:preferred,observation,legal,seat:0,hardAction:top,
  candidates:[{action:top,score:100},{action:outside,score:99}]
 });
 assert.equal(switched.finalAction.place,'outside');
 assert.equal(switched.changed,true);
 assert.equal(switched.reason,'assist');
 assert.equal(switched.bonus>0,true);
 assert.equal(99+switched.bonus>=100,true);
 const tied=blankModel({effect:4},{'BLC-1-021':2});
 const kept=applyLearningAssist({
  policy:tied,observation,legal,seat:0,hardAction:top,
  candidates:[{action:top,score:100},{action:outside,score:101}]
 });
 assert.equal(kept.finalAction.place,'top');
 assert.equal(kept.changed,false);
 assert.equal(kept.bonus,0);
 assert.match(kept.reason,/fallback-low-margin|agree|assist-kept/);
 const wide=handObservation('BLC-1-039');
 const front={type:'play',mode:'enter',uid:'0-1',line:'front'};
 const energy={type:'play',mode:'enter',uid:'0-1',line:'energy'};
 const pass={type:'next'};
 const wideLegal=[pass,front,energy];
 const widePolicy=blankModel({play:4,skip:4},{'BLC-1-039':4});
 const frontLead=LEARN_BONUS_THRESHOLD+(7/LEARN_BONUS_RATE)+0.05;
 assert.equal(favorOnly(widePolicy,wide,front,0,frontLead,[energy,pass]),true);
 assert.equal(preferLearnedAction(widePolicy,wide,wideLegal,0).action.line,'front');
 const noBonus=applyLearningAssist({
  policy:widePolicy,observation:wide,legal:wideLegal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:100},{action:front,score:80},{action:energy,score:104}]
 });
 assert.equal(noBonus.finalAction.type,'next');
 assert.equal(noBonus.changed,false);
 assert.equal(noBonus.bonus,0);
 const crosses=applyLearningAssist({
  policy:widePolicy,observation:wide,legal:wideLegal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:100},{action:front,score:100.2},{action:energy,score:101}]
 });
 assert.equal(crosses.finalAction.line,'front');
 assert.equal(crosses.changed,true);
 assert.equal(crosses.bonus>0,true);
 assert.equal(100.2+crosses.bonus>=107,true);
 const weakGap=applyLearningAssist({
  policy:widePolicy,observation:wide,legal:wideLegal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:100},{action:front,score:90},{action:energy,score:101}]
 });
 assert.equal(weakGap.changed,false);
 assert.equal(weakGap.finalAction.type,'next');
 const tooFar=applyLearningAssist({
  policy:widePolicy,observation:wide,legal:wideLegal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:100},{action:front,score:80},{action:energy,score:106}]
 });
 assert.equal(tooFar.changed,false);
 assert.equal(tooFar.finalAction.type,'next');
 const losing=applyLearningAssist({
  policy:widePolicy,observation:wide,legal:wideLegal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:10},{action:front,score:-50000},{action:energy,score:9}]
 });
 assert.equal(losing.changed,false);
 assert.equal(losing.reason,'protect-loss');
 const illegal={type:'play',mode:'enter',uid:'9-9',line:'front'};
 const illegalPolicy=blankModel({play:4},{'BLC-1-039':4,'NO-SUCH':4});
 favorOnly(illegalPolicy,wide,front,0,8,[energy,pass]);
 const stayed=applyLearningAssist({
  policy:illegalPolicy,observation:wide,legal:wideLegal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:100},{action:front,score:80},{action:illegal,score:400}]
 });
 assert.equal(wideLegal.some(action=>JSON.stringify(action)===JSON.stringify(stayed.finalAction)),true);
 assert.notEqual(stayed.finalAction.uid,'9-9');
});

test('equal raw scores can switch and a 0.21 preference stays a small bonus',()=>{
 const observation=handObservation('BLC-1-039');
 observation.visible.pending={kind:'effect-discard',player:0};
 const front={type:'play',mode:'enter',uid:'0-1',line:'front'};
 const pass={type:'next'};
 const legal=[pass,front];
 const policy=blankModel({play:4,skip:4},{'BLC-1-039':4});
 assert.equal(setLearnLead(policy,observation,front,0,1, [pass]),true);
 const tied=applyLearningAssist({
  policy,observation,legal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:138.43},{action:front,score:138.43}]
 });
 assert.equal(tied.changed,true);
 assert.equal(tied.reason,'assist');
 assert.equal(tied.finalAction.line,'front');
 assert.equal(tied.bonus,learningAssistBonus(1));
 assert.ok(tied.bonus>0);
 const weakPolicy=blankModel({play:4,skip:4},{'BLC-1-039':4});
 assert.equal(setLearnLead(weakPolicy,observation,front,0,0.21,[pass]),true);
 const weakTie=applyLearningAssist({
  policy:weakPolicy,observation,legal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:138.43},{action:front,score:138.43}]
 });
 const small=learningAssistBonus(0.21);
 assert.equal(small,Math.min(LEARN_ASSIST_CAP,LEARN_BONUS_RATE*Math.max(0,0.21-LEARN_BONUS_THRESHOLD)));
 assert.ok(small>0);
 assert.ok(small<1);
 assert.equal(weakTie.changed,true);
 assert.equal(weakTie.bonus,small);
 const weakGap=applyLearningAssist({
  policy:weakPolicy,observation,legal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:55.57636363636363},{action:front,score:53.55636363636363}]
 });
 assert.equal(weakGap.changed,false);
 assert.equal(weakGap.finalAction.type,'next');
 assert.equal(weakGap.bonus,0);
 assert.ok(small<2.02);
 const reproduced=learningAssistBonus(0.5865);
 assert.ok(reproduced>0);
 assert.ok(53.56+reproduced<55.57636363636363);
 const zeroPolicy=blankModel({play:4,skip:4},{'BLC-1-039':4});
 assert.equal(setLearnLead(zeroPolicy,observation,front,0,LEARN_BONUS_THRESHOLD,[pass]),true);
 const zero=applyLearningAssist({
  policy:zeroPolicy,observation,legal,seat:0,hardAction:pass,
  candidates:[{action:pass,score:138.43},{action:front,score:138.43}]
 });
 assert.equal(learningAssistBonus(LEARN_BONUS_THRESHOLD),0);
 assert.equal(zero.changed,false);
 assert.equal(zero.finalAction.type,'next');
 assert.equal(zero.bonus,0);
});

test('the revealed card is part of the current placement features',()=>{
 const bleachPack=officialV2Pack('bleach');
 const yellow=colorDeck(bleachPack,'yellow',['BLC-1-022','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021']);
 const reached=reachMain(bleachPack,yellow,29022);
 place(reached.state,0,'BLC-1-002','energy',0,true);
 place(reached.state,0,'BLC-1-012','energy',1,true);
 place(reached.state,0,'BLC-1-018','energy',2,true);
 const shown=take(reached.state,1,'BLC-1-021');
 reached.state.players[1].deck.unshift(shown);
 const self=take(reached.state,0,'BLC-1-022');
 reached.state.players[0].hand.push(self);
 const playAction=legalUniversalActions(reached.packs,reached.state)
  .find(action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 const reveal=source=>dispatchUniversalAction(reached.packs,source,playAction);
 const stateA=reveal(structuredClone(reached.state));
 const swapped=structuredClone(reached.state);
 const deck=swapped.players[1].deck;
 const swapAt=deck.findIndex((card,index)=>index>0&&card.cardId!==deck[0].cardId);
 assert.ok(swapAt>0);
 const buriedTop=deck[0];
 deck[0]=deck[swapAt];
 deck[swapAt]=buriedTop;
 const stateB=reveal(swapped);
 assert.equal(stateA.pending.kind,'effect-reveal-opp-top');
 assert.equal(stateB.pending.kind,'effect-reveal-opp-top');
 assert.notEqual(stateA.publicReveals.at(-1).cardId,stateB.publicReveals.at(-1).cardId);
 const first={packs:reached.packs,state:stateA,card:stateA.players[1].deck[0]};
 const second={packs:reached.packs,state:stateB,card:stateB.players[1].deck[0]};
 const legalA=legalUniversalActions(first.packs,first.state);
 const legalB=legalUniversalActions(second.packs,second.state);
 const topA=legalA.find(action=>action.place==='top');
 const outsideA=legalA.find(action=>action.place==='outside');
 const topB=legalB.find(action=>action.place==='top');
 const outsideB=legalB.find(action=>action.place==='outside');
 const viewA=coachObservation(first.packs,first.state,0);
 const viewB=coachObservation(second.packs,second.state,0);
 assert.notDeepEqual(featureKeys(viewA,topA,0),featureKeys(viewB,topB,0));
 assert.ok(featureKeys(viewA,outsideA,0).some(key=>key.includes('shown:id:BLC-1-021')));
 assert.ok(featureKeys(viewB,topB,0).some(key=>key.includes('shown:id:'+second.card.cardId)));
 assert.equal(featureKeys(viewA,topA,0).some(key=>key.includes('shown:id:'+second.card.cardId)),false);
 assert.ok(featureKeys(viewA,topA,0).some(key=>key.startsWith('shown:cost:')));
 const token=uid=>new RegExp('(^|[^0-9A-Za-z])'+uid+'([^0-9]|$)');
 assert.equal(token(first.card.uid).test(featureKeys(viewA,topA,0).join('\n')),false);
 const older=structuredClone(viewA);
 older.visible.publicReveals.unshift({kind:'revealed-top',cardId:'BLC-1-018',uid:'1-999',trigger:null});
 assert.deepEqual(featureKeys(older,topA,0),featureKeys(viewA,topA,0));
 const unrelated=structuredClone(viewA);
 unrelated.visible.publicReveals.unshift({kind:'deck-top',cardId:'BLC-1-012',uid:'1-998'});
 assert.deepEqual(featureKeys(unrelated,outsideA,0),featureKeys(viewA,outsideA,0));
 const hidden=structuredClone(first.state);
 const hiddenDeck=hidden.players[1].deck;
 assert.ok(hiddenDeck.length>2);
 assert.equal(hiddenDeck[0].cardId,first.state.players[1].deck[0].cardId);
 const lower=hiddenDeck[1];
 hiddenDeck[1]=hiddenDeck[2];
 hiddenDeck[2]=lower;
 assert.equal(assertUniversalMatch(first.packs,hidden),true);
 assert.deepEqual(featureKeys(coachObservation(first.packs,hidden,0),topA,0),featureKeys(viewA,topA,0));
 const rows=[];
 for(let i=0;i<8;i++)rows.push(rowFrom(first.packs,structuredClone(first.state),outsideA,'show-a-'+i));
 for(let i=0;i<8;i++)rows.push(rowFrom(second.packs,structuredClone(second.state),topB,'show-b-'+i));
 const policy=trainPolicy(rows);
 assert.equal(policy.format,LEARN_FORMAT);
 const pickA=preferLearnedAction(policy,viewA,legalA,0);
 const pickB=preferLearnedAction(policy,viewB,legalB,0);
 assert.equal(pickA.action?.place,'outside',pickA.reason);
 assert.equal(pickB.action?.place,'top',pickB.reason);
});

test('activation ignores steps the live battle will not score',()=>{
 const keeps=[];
 for(let i=0;i<16;i++){
  const state=newUniversalMatch(bleachPacks,{decks:[bleach.counts,bleach.counts],seed:11,first:0,openingMulligan:true});
  const choice=legalUniversalActions(bleachPacks,state).find(action=>action.mode==='keep');
  keeps.push(rowFrom(bleachPacks,state,choice,'mulligan-only-'+i));
 }
 const mulligan=trainPolicy(keeps);
 assert.equal(mulligan.validation.overallAgreement,1);
 assert.equal(mulligan.validation.intervenableSamples,0);
 assert.equal(mulligan.validation.possibleSamples,0);
 assert.equal(mulligan.validation.confirmedSamples,0);
 assert.equal(mulligan.validation.unscoredSamples>=8,true);
 assert.equal(mulligan.validation.evaluationSufficient,false);
 assert.equal(mulligan.validation.evaluationReason,'insufficient-intervenable');
 assert.equal(mulligan.validation.accepted,false);
 assert.equal(mulligan.validation.switchRate,null);
 assert.equal(interventionOf(keeps[0]).label,'不會評分');
 const report=learnReport(mulligan);
 assert.match(report,/整體模仿吻合率/);
 assert.match(report,/可能介入/);
 assert.match(report,/已確認可介入/);
 assert.match(report,/實戰改選率/);
 const plays=[];
 for(let i=0;i<16;i++)plays.push(plainRow('BLC-1-039','intervenable-'+i));
 const enough=trainPolicy(plays);
 assert.equal(enough.validation.intervenableSamples>=LEARN_MIN_VALIDATION_DECISIONS,true);
 assert.equal(enough.validation.possibleSamples>=LEARN_MIN_VALIDATION_DECISIONS,true);
 assert.equal(enough.validation.confirmedSamples,0);
 assert.equal(enough.validation.evaluationSufficient,true);
 assert.equal(enough.validation.accepted,true);
 assert.equal(interventionOf(plays[0]).label,'可能介入');
 const confirmed=plainRow('BLC-1-039','scored-row');
 confirmed.hardAction=confirmed.choice;
 confirmed.candidates=[{action:confirmed.choice,score:12,hard:true},{action:confirmed.legal[0],score:11}];
 assert.equal(interventionOf(confirmed).label,'已確認可介入');
 const order={choice:{type:'reorder',mode:'order'},observation:{visible:{pending:{kind:'phase-order'}}}};
 assert.equal(interventionOf(order).level,'unscored');
 const missing=learningBattleMode(null,{failed:true});
 assert.equal(missing.effective,'hard');
 assert.equal(missing.notice,'本場使用困難 AI');
 assert.equal(missing.reason,'讀不到學習結果');
 assert.equal(learningBattleMode({policy:null}).reason,'還沒有學習結果');
 assert.equal(learningBattleMode({policy:null,inactive:true}).reason,'候選未啟用');
 assert.equal(learningBattleMode({policy:null,stale:true}).reason,'舊特徵請重新訓練');
 const ready=learningBattleMode({policy:enough});
 assert.equal(ready.effective,'learned');
 assert.equal(ready.policy.format,LEARN_FORMAT);
 const foreign=learningBattleMode({accountId:'u'+'b'.repeat(16),policy:enough},{accountId:'u'+'a'.repeat(16)});
 assert.equal(foreign.effective,'hard');
 assert.equal(foreign.notice,'本場使用困難 AI');
 assert.equal(foreign.reason,'模型帳號與本場不符');
 assert.equal(foreign.policy,null);
 assert.equal(learningBattleMode({policy:enough,accountId:'u'+'a'.repeat(16)},{accountId:'u'+'a'.repeat(16)}).effective,'learned');
});
