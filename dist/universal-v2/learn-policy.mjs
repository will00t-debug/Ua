// Imitation policy for consented human decisions.
// Features come from the acting seat's observation and one legal action.
// Win/loss, hidden hands, deck order and seeds are not features.
// The result is a weight vector, not a copy of the match.
import {classifyDecision} from './coach-format.mjs';

export const LEARN_FORMAT='ua-v2-learn-v1';
export const LEARN_AI_VERSION='learned-v1';
export const LEARN_DIM=512;
export const LEARN_MIN_SAMPLES=8;
export const LEARN_MARGIN=0.2;
const MAX_NEGATIVES=24;
const EPOCHS=6;
const STEP=0.12;

function hash(text){
 let h=2166136261;
 const value=String(text);
 for(let i=0;i<value.length;i++){
  h^=value.charCodeAt(i);
  h=Math.imul(h,16777619);
 }
 return (h>>>0)%LEARN_DIM;
}
function blank(){return new Float64Array(LEARN_DIM);}
function add(vec,key,amount=1){vec[hash('v1|'+key)]+=amount;}
function dot(weights,vec){
 let score=0;
 for(let i=0;i<LEARN_DIM;i++)score+=weights[i]*vec[i];
 return score;
}
function bucket(n,cuts){
 const value=Math.max(0,Number(n)||0);
 for(const cut of cuts)if(value<=cut)return String(cut);
 return String(cuts[cuts.length-1])+'+';
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}

export function actingSeat(seat,observation){
 if(seat===0||seat===1)return seat;
 return observation?.visible?.actor===1?1:0;
}
function player(observation,seat){
 return observation?.visible?.players?.[seat]||{};
}
function zones(observation,seat){
 const me=player(observation,seat);
 const opp=player(observation,actingSeat(seat,observation)===0?1:0);
 const cards=[];
 const push=list=>{for(const card of list||[])if(card)cards.push(card);};
 push(me.hand);
 push(me.front);
 push(me.energy);
 push(me.faceUpLife);
 push(opp.front);
 push(opp.energy);
 push(opp.faceUpLife);
 push(observation?.private?.inspected);
 return cards;
}
function findCard(observation,seat,uid){
 if(typeof uid!=='string'||!uid)return null;
 return zones(observation,seat).find(card=>card.uid===uid)||null;
}
function chosenCardId(observation,action,seat){
 const card=findCard(observation,seat,action?.uid)||findCard(observation,seat,action?.targetUid);
 return typeof card?.cardId==='string'?card.cardId:'';
}

export function rowLeaks(row){
 const visible=row?.observation?.visible;
 const players=visible?.players;
 if(!Array.isArray(players)||players.length!==2)return true;
 const seat=actingSeat(row.seat,row.observation);
 const me=players[seat]||{};
 const opp=players[seat===0?1:0]||{};
 if(Array.isArray(opp.hand))return true;
 if(Array.isArray(me.deck)||Array.isArray(opp.deck))return true;
 if(Array.isArray(me.life)||Array.isArray(opp.life))return true;
 if(visible&&('winner' in visible||'seed' in visible||'initialCounts' in visible||'endReason' in visible))return true;
 return false;
}

export function featuresOf(observation,action,seat){
 const vec=blank();
 const me=player(observation,seat);
 const opp=player(observation,seat===0?1:0);
 const decisionClass=classifyDecision(action);
 const type=typeof action?.type==='string'?action.type:'';
 const mode=typeof action?.mode==='string'?action.mode:'';
 const phase=String(observation?.visible?.phase||'');
 const turn=Number(observation?.visible?.turn)||0;
 const turnBucket=turn<=0?'0':turn===1?'1':turn===2?'2':'3+';
 const cardId=chosenCardId(observation,action,seat);
 const handCount=me.handCount??(Array.isArray(me.hand)?me.hand.length:0);
 add(vec,'bias');
 add(vec,'class:'+decisionClass);
 add(vec,'type:'+type);
 add(vec,'mode:'+mode);
 add(vec,'phase:'+phase);
 add(vec,'turn:'+turnBucket);
 add(vec,'class+phase:'+decisionClass+'|'+phase);
 add(vec,'class+mode:'+decisionClass+'|'+mode);
 add(vec,'ap:'+bucket(me.apReady,[0,1,2,3]));
 add(vec,'energy:'+bucket(me.energyTotal,[0,1,2,3,5,7]));
 add(vec,'hand:'+bucket(handCount,[0,1,2,3,5,7]));
 add(vec,'myLife:'+bucket(me.lifeCount,[0,1,2,3,5,7]));
 add(vec,'oppLife:'+bucket(opp.lifeCount,[0,1,2,3,5,7]));
 if(cardId){
  add(vec,'card:'+cardId,2);
  add(vec,'class+card:'+decisionClass+'|'+cardId,2);
 }
 for(const [color,count] of Object.entries(me.energyByColor||{})){
  if(count>0&&typeof color==='string')add(vec,'color:'+color.slice(0,20));
 }
 return vec;
}

function usable(row,skipped){
 if(!row||typeof row!=='object'){skipped.bad++;return false;}
 if(row.record==='manifest'||row.record==='result'){skipped.result++;return false;}
 if(row.source==='ai'||row.actor==='ai'){skipped.ai++;return false;}
 if(row.source!=='human'||row.actor!=='human'){skipped.bad++;return false;}
 if(row.forced===true){skipped.forced++;return false;}
 if(!Array.isArray(row.legal)||row.legal.length<2){skipped.forced++;return false;}
 if(rowLeaks(row)){skipped.leak++;return false;}
 if(!row.legal.some(action=>same(action,row.choice))){skipped.bad++;return false;}
 return true;
}

function evaluate(weights,rows,support,cards){
 const policy={format:LEARN_FORMAT,dim:LEARN_DIM,weights,support,cards};
 let hits=0;
 for(const row of rows){
  const picked=chooseLearnedAction(policy,row.observation,row.legal,actingSeat(row.seat,row.observation));
  if(picked&&same(picked.action,row.choice))hits++;
 }
 return rows.length?hits/rows.length:null;
}

export function trainPolicy(rows){
 const skipped={ai:0,forced:0,leak:0,result:0,bad:0};
 const prepared=[];
 for(const row of Array.isArray(rows)?rows:[])if(usable(row,skipped))prepared.push(row);
 if(prepared.length<LEARN_MIN_SAMPLES)
  throw Error('可用的玩家決策不足 '+LEARN_MIN_SAMPLES+' 筆。學習只使用你在多個合法選項裡做出的選擇。');
 const order=[];
 const byMatch=new Map();
 for(const row of prepared){
  const matchId=typeof row.matchId==='string'?row.matchId:'match';
  if(!byMatch.has(matchId)){byMatch.set(matchId,[]);order.push(matchId);}
  byMatch.get(matchId).push(row);
 }
 let probe=prepared;
 let held=[];
 if(order.length>=2){
  const last=order[order.length-1];
  const rest=prepared.filter(row=>row.matchId!==last);
  const candidate=byMatch.get(last);
  if(rest.length>=LEARN_MIN_SAMPLES&&candidate.length>=1){probe=rest;held=candidate;}
 }else if(prepared.length>=16){
  const cut=Math.floor(prepared.length*0.8);
  probe=prepared.slice(0,cut);
  held=prepared.slice(cut);
 }
 const weights=new Array(LEARN_DIM).fill(0);
 const fit=rows=>{
  for(let epoch=0;epoch<EPOCHS;epoch++){
   for(const row of rows){
    const seat=actingSeat(row.seat,row.observation);
    const positive=featuresOf(row.observation,row.choice,seat);
    const negatives=row.legal.filter(action=>!same(action,row.choice)).slice(0,MAX_NEGATIVES);
    for(const action of negatives){
     const negative=featuresOf(row.observation,action,seat);
     let margin=0;
     for(let i=0;i<LEARN_DIM;i++)margin+=weights[i]*(positive[i]-negative[i]);
     const preference=1/(1+Math.exp(-Math.max(-20,Math.min(20,margin))));
     const scale=STEP*(1-preference);
     if(!scale)continue;
     for(let i=0;i<LEARN_DIM;i++){
      const delta=positive[i]-negative[i];
      if(delta)weights[i]=Math.max(-30,Math.min(30,weights[i]+scale*delta));
     }
    }
   }
  }
 };
 const tally=rows=>{
  const support={};
  const cards={};
  for(const row of rows){
   const seat=actingSeat(row.seat,row.observation);
   const decisionClass=classifyDecision(row.choice);
   support[decisionClass]=(support[decisionClass]||0)+1;
   const cardId=chosenCardId(row.observation,row.choice,seat);
   if(cardId)cards[cardId]=(cards[cardId]||0)+1;
  }
  return {support,cards};
 };
 fit(probe);
 const probeCount=tally(probe);
 const heldoutAccuracy=evaluate(weights.map(value=>value),held,probeCount.support,probeCount.cards);
 if(held.length)fit(held);
 const counted=tally(prepared);
 const packed=weights.map(value=>Math.round(value*10000)/10000);
 const baseline=held.length?held.filter(row=>same(row.legal[0],row.choice)).length/held.length:null;
 return {
  format:LEARN_FORMAT,
  dim:LEARN_DIM,
  weights:packed,
  support:counted.support,cards:counted.cards,
  trainedSamples:prepared.length,
  heldoutSamples:held.length,
  heldoutAccuracy,
  baselineAccuracy:baseline,
  skipped
 };
}

export function readPolicy(value){
 if(!value||value.format!==LEARN_FORMAT||value.dim!==LEARN_DIM||!Array.isArray(value.weights))return null;
 if(value.weights.length!==LEARN_DIM||value.weights.some(item=>typeof item!=='number'||!Number.isFinite(item)))return null;
 if(!value.support||typeof value.support!=='object'||Array.isArray(value.support))return null;
 return value;
}

export function chooseLearnedAction(policy,observation,legal,seat){
 const model=readPolicy(policy);
 if(!model||!Array.isArray(legal)||!legal.length)return null;
 const actor=actingSeat(seat,observation);
 if(rowLeaks({observation,seat:actor}))return null;
 let best=null,bestScore=-Infinity,second=-Infinity;
 for(const action of legal){
  const score=dot(model.weights,featuresOf(observation,action,actor));
  if(score>bestScore){second=bestScore;bestScore=score;best=action;}
  else if(score>second)second=score;
 }
 if(!best)return null;
 const decisionClass=classifyDecision(best);
 if((model.support?.[decisionClass]||0)<2)return null;
 const cardId=chosenCardId(observation,best,actor);
 if(cardId&&(model.cards?.[cardId]||0)<1&&decisionClass!=='skip'&&decisionClass!=='mulligan')return null;
 const margin=bestScore-(Number.isFinite(second)?second:bestScore);
 if(!(margin>=LEARN_MARGIN))return null;
 return {action:best,margin,decisionClass};
}

export function learnReport(policy){
 const skipped=policy?.skipped||{};
 const lines=['已用 '+(policy?.trainedSamples||0)+' 筆你的決策學習。'];
 lines.push('略過只有一個合法選項的 '+(skipped.forced||0)+' 筆，以及 AI 操作 '+(skipped.ai||0)+' 筆。');
 if(policy?.heldoutSamples>0&&typeof policy.heldoutAccuracy==='number'){
  const guessed=Math.round(policy.heldoutAccuracy*100);
  const baseline=typeof policy.baselineAccuracy==='number'
   ?'第一個合法按鈕猜中 '+Math.round(policy.baselineAccuracy*100)+'%。':'';
  lines.push('留出的決策裡，模型猜中你的選擇 '+guessed+'%。'+baseline);
 }else lines.push('這次沒有留出對局。再多打一場之後重新學習，才能檢查猜中率。');
 lines.push('請在對戰設定把電腦難度選成「學習」。有把握的步驟會照你的習慣走，其餘仍用困難 AI。');
 lines.push('這裡的百分比是猜中你的選擇。勝率要在對戰裡另外看。');
 return lines.join('');
}

export function rowsFromJsonl(text){
 const rows=[];
 for(const line of String(text||'').split(/\n+/)){
  const trimmed=line.trim();
  if(!trimmed)continue;
  rows.push(JSON.parse(trimmed));
 }
 return rows;
}
