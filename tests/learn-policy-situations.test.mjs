import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {coachObservation,hiddenLeak} from '../dist/universal-v2/coach-record.mjs';
import {LEARN_FORMAT,LEARN_DIM,actionIdentity,applyLearningAssist,featureKeys,
 partitionByMatch,policyRecordStatus,preferLearnedAction,trainPolicy} from '../dist/universal-v2/learn-policy.mjs';

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
 const broken={format:LEARN_FORMAT,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(Number.NaN),support:{play:3},cards:{},profiles:{}};
 for(const policy of [{format:'ua-v2-learn-v1'},broken,null]){
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
 assert.equal(split.reliable,true);
 assert.ok(split.train.every(row=>row.matchId==='match-a'));
 assert.ok(split.held.every(row=>row.matchId==='match-b'));
 assert.equal(split.train.some(row=>row.note==='correction'),true);
 assert.equal(split.held.some(row=>row.note==='later-correction'),true);
 assert.equal(split.train.some(row=>row.matchId==='match-b'),false);
 const alone=partitionByMatch(rows.filter(row=>row.matchId==='match-a'));
 assert.equal(alone.reliable,false);
 assert.equal(alone.reason,'insufficient-matches');
 assert.equal(alone.held.length,0);
 assert.equal(alone.train.length,9);
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
