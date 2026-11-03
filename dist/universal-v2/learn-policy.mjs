// Imitation preference for consented human decisions.
// Every feature is a property of one legal action together with information
// the acting seat can already see. Board totals are crossed with the action
// so they do not cancel when two candidates are compared.
// UIDs locate a visible card. They are not features.
// Win/loss, hidden hands, deck order and seeds are not features.
// A learn score is not a probability and is not shown as confidence.
import {classifyDecision} from './coach-format.mjs';
import {requireRegisteredV2TitlePack} from './title-packs/registry.mjs';

export const LEARN_FORMAT='ua-v2-learn-v2';
export const LEARN_FORMAT_V1='ua-v2-learn-v1';
export const LEARN_AI_VERSION='learned-v2';
export const LEARN_DIM=4096;
export const LEARN_MIN_SAMPLES=8;
export const LEARN_MARGIN=0.2;
export const LEARN_ASSIST_CAP=18;
export const LEARN_ASSIST_CAP_MAX=40;
// Same band the hard search uses for a finished win or loss.
export const LEARN_TERMINAL=50000;
const NEGATIVE_FULL=64;
const NEGATIVE_SAMPLE=48;
const EPOCHS=6;
const STEP=0.12;
const CLASS_SUPPORT=2;
const PROFILE_SUPPORT=2;

const LIFE_BINS=[0,1,2,3,5,7];
const RESOURCE_BINS=[0,1,2,3,5,7];
const AP_BINS=[0,1,2,3];
const BP_BINS=[0,1500,2000,2500,3000,3500,4000,5000];
const COST_BINS=[0,1,2,3,4];

let printedCatalog=null;
function catalog(){
 if(printedCatalog)return printedCatalog;
 const map=new Map();
 for(const title of ['bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei']){
  let pack=null;
  try{pack=requireRegisteredV2TitlePack(title);}catch{pack=null;}
  for(const [id,card] of Object.entries(pack?.cards||{}))if(card&&!map.has(id))map.set(id,summarize(card));
 }
 printedCatalog=map;
 return map;
}
function summarize(card){
 const bases=Array.isArray(card.raidBaseNames)?card.raidBaseNames.filter(name=>typeof name==='string').slice(0,6):[];
 return {
  type:typeof card.type==='string'?card.type:'',
  color:typeof card.color==='string'?card.color:'',
  energy:Number(card.energy)||0,
  ap:Number(card.ap)||0,
  bp:Number(card.bp)||0,
  gen:Number(card.gen)||0,
  trigger:typeof card.trigger==='string'&&card.trigger?card.trigger:'none',
  raid:!!(card.raidName||card.raidTrait),
  raidName:typeof card.raidName==='string'?card.raidName:'',
  raidBases:bases,
  name:typeof card.name==='string'?card.name:'',
  damage:Number(card.printedAttackDamage||card.raidAttackDamage||0)||0,
  impact:Number(card.impact||card.raidImpact||0)||0,
  impactNull:card.impactNull===true,
  extraEnergy:card.activeExtraEnergy?1:0
 };
}
function printedOf(cardId){
 if(typeof cardId!=='string'||!cardId)return null;
 return catalog().get(cardId)||null;
}
function hash(text){
 let h=2166136261;
 const value=String(text);
 for(let i=0;i<value.length;i++){
  h^=value.charCodeAt(i);
  h=Math.imul(h,16777619);
 }
 return (h>>>0)%LEARN_DIM;
}
function hash32(text){
 let h=2166136261;
 const value=String(text);
 for(let i=0;i<value.length;i++){
  h^=value.charCodeAt(i);
  h=Math.imul(h,16777619);
 }
 return h>>>0;
}
function mulberry32(seed){
 let a=seed>>>0;
 return ()=>{
  a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
function blank(){return new Float64Array(LEARN_DIM);}
function bucket(n,cuts){
 const value=Math.max(0,Number(n)||0);
 for(const cut of cuts)if(value<=cut)return String(cut);
 return String(cuts[cuts.length-1])+'+';
}
function squash(value){return String(value||'').replace(/\s+/g,'');}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n));}
function assistCapOf(value){
 const n=Number(value);
 if(!Number.isFinite(n))return LEARN_ASSIST_CAP;
 return clamp(n,1,LEARN_ASSIST_CAP_MAX);
}

export function actingSeat(seat,observation){
 if(seat===0||seat===1)return seat;
 return observation?.visible?.actor===1?1:0;
}
function player(observation,seat){
 return observation?.visible?.players?.[seat]||{};
}
function indexVisible(observation,seat){
 const map=new Map();
 const me=player(observation,seat);
 const opp=player(observation,seat===0?1:0);
 const put=(card,zone,who,extra)=>{
  if(!card||typeof card.uid!=='string'||!card.uid||typeof card.cardId!=='string'||!card.cardId)return;
  if(map.has(card.uid))return;
  map.set(card.uid,{uid:card.uid,cardId:card.cardId,zone,who,...extra});
 };
 const walk=(layers,zone,who)=>{
  for(const layer of layers||[]){
   if(!layer||typeof layer!=='object')continue;
   if(layer.faceDown===true&&typeof layer.cardId!=='string')continue;
   put(layer,zone,who);
   walk(layer.stack,zone,who);
   walk(layer.under,zone,who);
  }
 };
 const board=(person,who,includeHand)=>{
  if(includeHand)for(const card of person.hand||[])put(card,'hand',who);
  for(const line of ['front','energy']){
   (person[line]||[]).forEach((card,slot)=>{
    if(!card)return;
    put(card,line,who,{
     line,slot,ready:card.ready===true,bp:typeof card.bp==='number'?card.bp:null,
     produces:typeof card.produces==='number'?card.produces:null,
     baseProduces:typeof card.baseProduces==='number'?card.baseProduces:null,
     restrictions:Array.isArray(card.restrictions)?card.restrictions:null,
     raidDepth:Number(card.raidDepth)||0
    });
    walk(card.raidLayers,line+'-layer',who);
    walk(card.underLayers,line+'-under',who);
   });
  }
  for(const card of person.outside||[])put(card,'outside',who);
  for(const card of person.removed||[])put(card,'removed',who);
  for(const card of person.faceUpLife||[])put(card,'faceUpLife',who);
  for(const card of person.publicLife||[])put(card,'publicLife',who);
 };
 board(me,'me',true);
 board(opp,'opp',false);
 for(const card of observation?.private?.inspected||[])put(card,'inspected','me');
 return map;
}
function intentOf(action){
 const type=typeof action?.type==='string'?action.type:'';
 const mode=typeof action?.mode==='string'?action.mode:'';
 if(type==='attack')return 'attack';
 if(type==='chooseBlock')return action?.uid==null?'pass':'block';
 if(type==='raid'||mode==='raid')return 'raid';
 if(type==='move'||type==='step')return 'move';
 if(type==='play'||mode==='enter'||mode==='place'||mode==='rest'){
  if(action?.line==='energy')return 'play-energy';
  if(action?.line==='front')return 'play-front';
  return 'play';
 }
 if(type==='next')return 'end';
 if(type==='pass'||mode==='skip'||mode==='decline'||mode==='done'||mode==='pass')return 'pass';
 return classifyDecision(action);
}
function signatureOf(cardId){
 const printed=printedOf(cardId);
 if(!printed)return '';
 return [printed.type,printed.color,'c'+bucket(printed.energy,COST_BINS),'b'+bucket(printed.bp,BP_BINS),
  'g'+bucket(printed.gen,[0,1,2]),printed.raid?'r1':'r0','t'+printed.trigger].join('|');
}
function addPrinted(keys,prefix,cardId){
 const printed=printedOf(cardId);
 keys.push(prefix+':id:'+cardId);
 if(!printed){
  keys.push(prefix+':printed:unknown');
  return;
 }
 keys.push(prefix+':type:'+printed.type);
 keys.push(prefix+':color:'+(printed.color||'none'));
 keys.push(prefix+':cost:'+bucket(printed.energy,COST_BINS));
 keys.push(prefix+':pbp:'+bucket(printed.bp,BP_BINS));
 keys.push(prefix+':gen:'+bucket(printed.gen,[0,1,2]));
 keys.push(prefix+':trigger:'+printed.trigger);
 keys.push(prefix+':raid:'+(printed.raid?'y':'n'));
 if(printed.damage>0)keys.push(prefix+':pdmg:'+bucket(printed.damage,[1,2,3]));
 if(printed.impact>0)keys.push(prefix+':pimp:'+bucket(printed.impact,[1,2,3]));
 if(printed.impactNull)keys.push(prefix+':inull');
 if(printed.extraEnergy)keys.push(prefix+':egen');
}
function addLive(keys,prefix,card){
 if(!card){
  keys.push(prefix+':unseen');
  return;
 }
 keys.push(prefix+':zone:'+card.zone);
 keys.push(prefix+':who:'+card.who);
 addPrinted(keys,prefix,card.cardId);
 if(typeof card.bp==='number')keys.push(prefix+':lbp:'+bucket(card.bp,BP_BINS));
 if(card.ready===true||card.ready===false)keys.push(prefix+':rdy:'+(card.ready?'y':'n'));
 if(typeof card.produces==='number')keys.push(prefix+':prod:'+bucket(card.produces,[0,1,2,3]));
 if(typeof card.baseProduces==='number')keys.push(prefix+':baseprod:'+bucket(card.baseProduces,[0,1,2,3]));
 if(card.raidDepth>0)keys.push(prefix+':raidDepth:'+bucket(card.raidDepth,[1,2,3]));
 for(const restriction of card.restrictions||[]){
  if(restriction&&typeof restriction.kind==='string'&&restriction.kind)
   keys.push(prefix+':rk:'+restriction.kind.slice(0,40));
 }
}
function relation(left,right){
 if(typeof left!=='number'||typeof right!=='number')return 'unknown';
 if(left>right)return 'ahead';
 if(left<right)return 'behind';
 return 'tie';
}
function raidBases(observation,seat,cardId){
 const printed=printedOf(cardId);
 if(!printed)return null;
 if(!printed.raid&&!printed.raidName&&!printed.raidBases.length)return 0;
 const names=new Set();
 if(printed.raidName)names.add(squash(printed.raidName));
 for(const name of printed.raidBases)names.add(squash(name));
 if(!names.size)return null;
 let count=0;
 const me=player(observation,seat);
 for(const line of ['front','energy']){
  for(const card of me[line]||[]){
   if(!card?.cardId)continue;
   const body=printedOf(card.cardId);
   if(body?.name&&names.has(squash(body.name)))count++;
  }
 }
 return count;
}
function canAfford(observation,seat,cardId){
 const printed=printedOf(cardId);
 if(!printed)return 'unknown';
 const have=player(observation,seat).energyByColor?.[printed.color]||0;
 return printed.energy<=have?'yes':'no';
}
function handResource(observation,seat){
 const hand=player(observation,seat).hand;
 if(!Array.isArray(hand))return 'unknown';
 let yes=false,unknown=false;
 for(const card of hand){
  const mark=canAfford(observation,seat,card?.cardId);
  if(mark==='yes')yes=true;
  else if(mark==='unknown')unknown=true;
 }
 if(yes)return 'yes';
 if(unknown)return 'unknown';
 return 'no';
}
function describe(observation,action,seat){
 const keys=['bias|'+intentOf(action)];
 const actor=actingSeat(seat,observation);
 const me=player(observation,actor);
 const opp=player(observation,actor===0?1:0);
 const intent=intentOf(action);
 const type=typeof action?.type==='string'?action.type:'';
 const mode=typeof action?.mode==='string'?action.mode:'';
 const phase=String(observation?.visible?.phase||'');
 const turn=Number(observation?.visible?.turn)||0;
 const turnBucket=turn<=0?'0':turn===1?'1':turn===2?'2':'3+';
 const decisionClass=classifyDecision(action);
 const cards=indexVisible(observation,actor);
 const front=Array.isArray(me.front)?me.front:[];
 const empty=front.filter(card=>!card).length;
 const readyFront=front.filter(card=>card?.ready).length;
 const oppReady=Array.isArray(opp.front)?opp.front.filter(card=>card?.ready).length:0;
 const handCount=me.handCount??(Array.isArray(me.hand)?me.hand.length:0);
 const cross=(name,value)=>keys.push('x:'+name+':'+value+'|'+intent);
 keys.push('act:'+decisionClass);
 keys.push('act:'+type+'|'+mode);
 keys.push('class+phase:'+decisionClass+'|'+phase+'|'+intent);
 keys.push('turn:'+turnBucket+'|'+intent);
 cross('myLife',bucket(me.lifeCount,LIFE_BINS));
 cross('oppLife',bucket(opp.lifeCount,LIFE_BINS));
 cross('ap',bucket(me.apReady,AP_BINS));
 cross('energy',bucket(me.energyTotal,RESOURCE_BINS));
 cross('hand',bucket(handCount,RESOURCE_BINS));
 cross('empty',String(Math.max(0,Math.min(4,empty))));
 cross('readyFront',String(Math.max(0,Math.min(4,readyFront))));
 cross('oppReady',String(Math.max(0,Math.min(4,oppReady))));
 if(typeof action?.line==='string')keys.push('role:line:'+action.line);
 if(Number.isInteger(action?.slot))keys.push('role:slot:'+action.slot);
 if(typeof action?.from==='string')keys.push('role:from:'+action.from.slice(0,20));
 if(mode)keys.push('role:mode:'+mode);
 const role=(name,uid)=>{
  if(uid==null||uid==='')return;
  if(typeof uid!=='string'){
   keys.push('role:'+name+':unseen');
   return;
  }
  addLive(keys,'role:'+name,cards.get(uid)||null);
 };
 role('src',action?.uid);
 role('tgt',action?.targetUid);
 role('base',action?.baseUid);
 role('rep',action?.replaceUid);
 role('ret',action?.retireUid);
 if(Array.isArray(action?.uids)){
  const ids=action.uids.map(uid=>{
   const card=typeof uid==='string'?cards.get(uid):null;
   return card?.cardId||'unseen';
  }).sort();
  keys.push('role:set:'+ids.join(','));
 }
 const src=typeof action?.uid==='string'?cards.get(action.uid):null;
 const tgt=typeof action?.targetUid==='string'?cards.get(action.targetUid):null;
 const myLife=bucket(me.lifeCount,LIFE_BINS);
 const oppLife=bucket(opp.lifeCount,LIFE_BINS);
 if(intent==='attack'||intent==='block'||intent==='pass'){
  const battle=observation?.visible?.battle;
  if(battle&&typeof battle.bp==='number'){
   keys.push('battle:bp:'+bucket(battle.bp,BP_BINS)+'|life:'+myLife+'|'+intent);
   if(typeof battle.damage==='number')keys.push('battle:dmg:'+bucket(battle.damage,[1,2,3])+'|life:'+myLife+'|'+intent);
   if(typeof battle.impact==='number')keys.push('battle:imp:'+bucket(battle.impact,[0,1,2,3])+'|life:'+myLife+'|'+intent);
   if(src&&typeof src.bp==='number')
    keys.push('battle:rel:'+relation(src.bp,battle.bp)+'|life:'+myLife+'|dmg:'+bucket(battle.damage,[1,2,3])+'|'+intent);
  }else if(src&&typeof src.bp==='number'){
   keys.push('strike:bp:'+bucket(src.bp,BP_BINS)+'|opp:'+oppLife+'|'+intent);
   if(tgt&&typeof tgt.bp==='number')
    keys.push('strike:rel:'+relation(src.bp,tgt.bp)+'|opp:'+oppLife+'|'+intent);
  }
 }
 if(src?.cardId&&(intent==='play-front'||intent==='play-energy'||intent==='play'||intent==='raid'||intent==='end')){
  const afford=canAfford(observation,actor,src.cardId);
  keys.push('afford:'+afford+'|'+intent+'|en:'+bucket(me.energyTotal,RESOURCE_BINS));
  const bases=raidBases(observation,actor,src.cardId);
  if(bases!=null)keys.push('raidBases:'+bucket(bases,[0,1,2])+'|'+intent+'|en:'+bucket(me.energyTotal,RESOURCE_BINS));
 }
 const base=typeof action?.baseUid==='string'?cards.get(action.baseUid):null;
 if(intent==='raid'&&base&&typeof base.bp==='number')
  keys.push('raidPick:bp:'+bucket(base.bp,BP_BINS)+'|opp:'+oppLife);
 if(intent==='play-front'||intent==='play-energy')
  keys.push('linePick:'+intent+'|empty:'+String(Math.max(0,Math.min(4,empty)))+'|life:'+oppLife);
 if(intent==='end'||intent==='pass')keys.push('hold:'+handResource(observation,actor)+'|'+intent);
 for(const [color,count] of Object.entries(me.energyByColor||{})){
  if(count>0&&typeof color==='string')keys.push('x:color:'+color.slice(0,20)+'|'+intent);
 }
 return keys;
}
export function featureKeys(observation,action,seat){
 return describe(observation,action,seat);
}
export function featuresOf(observation,action,seat){
 const vec=blank();
 for(const key of describe(observation,action,seat))vec[hash('v2|'+key)]+=1;
 return vec;
}
export function actionIdentity(observation,action,seat){
 const cards=indexVisible(observation,actingSeat(seat,observation));
 const idOf=uid=>typeof uid==='string'?cards.get(uid)?.cardId||'':'';
 return [action?.type||'',action?.mode||'',action?.line||'',String(action?.slot??''),action?.from||'',
  idOf(action?.uid),idOf(action?.targetUid),idOf(action?.baseUid),idOf(action?.replaceUid),idOf(action?.retireUid)].join('|');
}
function sourceCard(observation,action,seat){
 if(typeof action?.uid!=='string'||!action.uid)return {present:false};
 const card=indexVisible(observation,actingSeat(seat,observation)).get(action.uid);
 return card?{present:true,card}:{present:true,card:null};
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
function actionKey(action){return JSON.stringify(action);}
// Full comparison stays cheap while a decision has a modest legal list.
// Larger search windows use a seeded sample so the legal-list order cannot
// decide which mistakes are seen, without scoring every card in a long look.
function selectNegatives(row){
 const list=row.legal.filter(action=>!same(action,row.choice));
 list.sort((a,b)=>actionKey(a)<actionKey(b)?-1:actionKey(a)>actionKey(b)?1:0);
 if(list.length<=NEGATIVE_FULL)return {actions:list,mode:'full'};
 const rng=mulberry32(hash32(String(row.matchId||'')+'|'+String(row.step??'')+'|'+String(row.clientKey||'')));
 const copy=list.slice();
 const take=Math.min(NEGATIVE_SAMPLE,copy.length);
 for(let i=0;i<take;i++){
  const j=i+Math.floor(rng()*(copy.length-i));
  const swap=copy[i];copy[i]=copy[j];copy[j]=swap;
 }
 const picked=copy.slice(0,take);
 picked.sort((a,b)=>actionKey(a)<actionKey(b)?-1:actionKey(a)>actionKey(b)?1:0);
 return {actions:picked,mode:'sampled'};
}
function pairsOf(observation,action,seat){
 const vec=featuresOf(observation,action,seat);
 const pairs=[];
 for(let i=0;i<LEARN_DIM;i++)if(vec[i])pairs.push([i,vec[i]]);
 return pairs;
}
function dotSparse(weights,pairs){
 let score=0;
 for(const [index,value] of pairs)score+=weights[index]*value;
 return score;
}
function fit(weights,examples){
 for(let epoch=0;epoch<EPOCHS;epoch++){
  for(const example of examples){
   const accum=new Map();
   for(const negative of example.negatives){
    let margin=dotSparse(weights,example.positive);
    for(const [index,value] of negative)margin-=weights[index]*value;
    const preference=1/(1+Math.exp(-clamp(margin,-20,20)));
    const scale=STEP*(1-preference);
    if(!scale)continue;
    for(const [index,value] of example.positive)accum.set(index,(accum.get(index)||0)+scale*value);
    for(const [index,value] of negative)accum.set(index,(accum.get(index)||0)-scale*value);
   }
   for(const [index,delta] of accum)weights[index]=clamp(weights[index]+delta,-30,30);
  }
 }
}
function tally(rows){
 const support={},cards={},profiles={};
 for(const row of rows){
  const seat=actingSeat(row.seat,row.observation);
  const decisionClass=classifyDecision(row.choice);
  support[decisionClass]=(support[decisionClass]||0)+1;
  const found=sourceCard(row.observation,row.choice,seat);
  if(found.present&&found.card?.cardId){
   cards[found.card.cardId]=(cards[found.card.cardId]||0)+1;
   const signature=signatureOf(found.card.cardId);
   if(signature)profiles[signature]=(profiles[signature]||0)+1;
  }
 }
 return {support,cards,profiles};
}
function scoreRows(policy,rows){
 const byClass={};
 let proposed=0,agreed=0,abstained=0;
 for(const row of rows){
  const decisionClass=classifyDecision(row.choice);
  const bucket=byClass[decisionClass]||(byClass[decisionClass]={samples:0,proposed:0,agreed:0,abstained:0});
  bucket.samples++;
  const preference=preferLearnedAction(policy,row.observation,row.legal,actingSeat(row.seat,row.observation));
  if(!preference.action){bucket.abstained++;abstained++;continue;}
  bucket.proposed++;proposed++;
  if(same(preference.action,row.choice)){bucket.agreed++;agreed++;}
 }
 return {samples:rows.length,proposed,agreed,abstained,byClass};
}

export function partitionByMatch(rows){
 const order=[];
 const grouped=new Map();
 for(const row of rows){
  const matchId=typeof row.matchId==='string'&&row.matchId?row.matchId:'match';
  if(!grouped.has(matchId)){grouped.set(matchId,[]);order.push(matchId);}
  grouped.get(matchId).push(row);
 }
 if(order.length<2)return {train:rows.slice(),held:[],reliable:false,reason:'insufficient-matches',matchCount:order.length};
 const heldId=order[order.length-1];
 const held=grouped.get(heldId).slice();
 const train=[];
 for(const matchId of order)if(matchId!==heldId)train.push(...grouped.get(matchId));
 if(train.length<LEARN_MIN_SAMPLES)return {train:rows.slice(),held:[],reliable:false,reason:'insufficient-matches',matchCount:order.length};
 return {train,held,reliable:true,reason:null,matchCount:order.length};
}

export function trainPolicy(rows){
 const skipped={ai:0,forced:0,leak:0,result:0,bad:0};
 const prepared=[];
 for(const row of Array.isArray(rows)?rows:[])if(usable(row,skipped))prepared.push(row);
 if(prepared.length<LEARN_MIN_SAMPLES)
  throw Error('可用的玩家決策不足 '+LEARN_MIN_SAMPLES+' 筆。學習只使用你在多個合法選項裡做出的選擇。');
 const split=partitionByMatch(prepared);
 let negativeMode='full';
 const compile=list=>list.map(row=>{
  const seat=actingSeat(row.seat,row.observation);
  const picked=selectNegatives(row);
  if(picked.mode==='sampled')negativeMode='sampled';
  return {
   positive:pairsOf(row.observation,row.choice,seat),
   negatives:picked.actions.map(action=>pairsOf(row.observation,action,seat))
  };
 });
 const probeWeights=new Array(LEARN_DIM).fill(0);
 const probeRows=compile(split.train);
 fit(probeWeights,probeRows);
 const probeCount=tally(split.train);
 const probePolicy={
  format:LEARN_FORMAT,dim:LEARN_DIM,weights:probeWeights,
  support:probeCount.support,cards:probeCount.cards,profiles:probeCount.profiles
 };
 const heldScore=split.held.length?scoreRows(probePolicy,split.held):null;
 const finalWeights=new Array(LEARN_DIM).fill(0);
 fit(finalWeights,compile(prepared));
 const counted=tally(prepared);
 const packed=finalWeights.map(value=>Math.round(value*10000)/10000);
 const validation={
  reliable:split.reliable,
  reason:split.reason,
  matchCount:split.matchCount,
  heldoutMatches:split.reliable?1:0,
  heldoutSamples:split.held.length,
  proposed:heldScore?.proposed||0,
  agreed:heldScore?.agreed||0,
  abstained:heldScore?.abstained||0,
  byClass:heldScore?.byClass||{},
  model:'probe-without-heldout-matches',
  hardChanges:null,
  note:split.reliable
   ?'留出的是完整對局。同意次數是模型選擇和該場玩家選擇相同，不是勝率，也不是機率。'
   :'完整對局不足，不能可靠驗證。沒有把同一場切成訓練和驗證。'
 };
 return {
  format:LEARN_FORMAT,
  dim:LEARN_DIM,
  weights:packed,
  support:counted.support,cards:counted.cards,profiles:counted.profiles,
  trainedSamples:prepared.length,
  heldoutSamples:split.held.length,
  heldoutAccuracy:heldScore&&split.held.length?heldScore.agreed/split.held.length:null,
  baselineAccuracy:null,
  negativeMode,
  validation,
  final:{samples:prepared.length,model:'all-usable-rows',
   note:'最終權重使用全部可用決策。它看過留出的對局，不能把自我吻合當成獨立驗證。'},
  skipped
 };
}

export function readPolicy(value){
 if(!value||value.format!==LEARN_FORMAT||value.dim!==LEARN_DIM||!Array.isArray(value.weights))return null;
 if(value.weights.length!==LEARN_DIM||value.weights.some(item=>typeof item!=='number'||!Number.isFinite(item)))return null;
 if(!value.support||typeof value.support!=='object'||Array.isArray(value.support))return null;
 if(!value.cards||typeof value.cards!=='object'||Array.isArray(value.cards))return null;
 if(!value.profiles||typeof value.profiles!=='object'||Array.isArray(value.profiles))return null;
 return value;
}
export function policyRecordStatus(value){
 if(!value||typeof value!=='object')return {state:'missing',policy:null,message:''};
 if(value.format===LEARN_FORMAT_V1)return {state:'old',policy:null,
  message:'以前的學習結果用的是舊特徵，不能直接套用。請再按一次「用這些紀錄學習」。驗證通過之後才會換上，舊結果會留下。'};
 const policy=readPolicy(value);
 if(!policy)return {state:'incompatible',policy:null,message:'學習結果和目前的模型不相容，已沿用困難 AI。請重新學習。'};
 return {state:'ok',policy,message:''};
}
function familiar(model,observation,action,seat){
 const found=sourceCard(observation,action,seat);
 if(!found.present)return true;
 if(!found.card)return false;
 if((model.cards?.[found.card.cardId]||0)>=1)return true;
 const signature=signatureOf(found.card.cardId);
 return !!(signature&&(model.profiles?.[signature]||0)>=PROFILE_SUPPORT);
}
export function preferLearnedAction(policy,observation,legal,seat){
 const status=policyRecordStatus(policy);
 if(status.state==='missing')return {action:null,reason:'fallback-no-policy',margin:null,decisionClass:null};
 if(status.state==='old')return {action:null,reason:'fallback-old-model',margin:null,decisionClass:null};
 if(status.state!=='ok')return {action:null,reason:'fallback-incompatible',margin:null,decisionClass:null};
 if(!Array.isArray(legal)||!legal.length)return {action:null,reason:'fallback-empty',margin:null,decisionClass:null};
 const actor=actingSeat(seat,observation);
 if(rowLeaks({observation,seat:actor}))return {action:null,reason:'fallback-leak',margin:null,decisionClass:null};
 const model=status.policy;
 const ranked=legal.map(action=>({
  action,
  score:dotSparse(model.weights,pairsOf(observation,action,actor)),
  identity:actionIdentity(observation,action,actor)
 }));
 ranked.sort((a,b)=>b.score-a.score||(a.identity<b.identity?-1:a.identity>b.identity?1:0));
 const best=ranked[0];
 const second=ranked.length>1?ranked[1].score:best.score;
 const margin=best.score-second;
 const decisionClass=classifyDecision(best.action);
 if((model.support?.[decisionClass]||0)<CLASS_SUPPORT)
  return {action:null,reason:'fallback-low-support',margin,decisionClass};
 if(!(margin>=LEARN_MARGIN))return {action:null,reason:'fallback-low-margin',margin,decisionClass};
 if(!familiar(model,observation,best.action,actor))
  return {action:null,reason:'fallback-unknown',margin,decisionClass};
 return {action:best.action,reason:null,margin,decisionClass};
}
export function chooseLearnedAction(policy,observation,legal,seat){
 const preference=preferLearnedAction(policy,observation,legal,seat);
 if(!preference.action)return null;
 return {action:preference.action,margin:preference.margin,decisionClass:preference.decisionClass};
}
function necessaryBlock(observation,seat,hardAction,other){
 const pending=observation?.visible?.pending;
 if(!pending||(pending.kind!=='block'&&pending.kind!=='effect-block-floor'))return false;
 if(hardAction?.type!=='chooseBlock'||hardAction.uid==null)return false;
 if(other?.type!=='chooseBlock'||other.uid!=null)return false;
 const battle=observation.visible.battle;
 if(!battle||typeof battle.bp!=='number')return false;
 const life=Number(player(observation,actingSeat(seat,observation)).lifeCount)||0;
 const damage=Number(battle.damage)||0;
 const impact=Number(battle.impact)||0;
 if(!(life>0&&damage>=life))return false;
 if(impact<life)return true;
 const blocker=indexVisible(observation,actingSeat(seat,observation)).get(hardAction.uid);
 return typeof blocker?.bp==='number'&&blocker.bp>battle.bp;
}
function protectsResource(observation,seat,hardAction,other){
 if(!hardAction||!other||same(hardAction,other))return false;
 const me=player(observation,actingSeat(seat,observation));
 if((Number(me.energyTotal)||0)>1)return false;
 if(hardAction.type==='play'&&hardAction.line==='energy'&&
  other.type==='play'&&other.line==='front'&&other.uid===hardAction.uid)return true;
 const generators=(Array.isArray(me.energy)?me.energy:[]).filter(card=>card&&
  Number(card.produces||card.baseProduces)>0);
 if(generators.length!==1)return false;
 const uid=generators[0].uid;
 const spends=action=>!!action&&(action.type==='attack'||action.type==='move'||action.type==='step')&&action.uid===uid;
 return spends(other)&&!spends(hardAction);
}
function hardScoreOf(candidates,action){
 const found=(candidates||[]).find(item=>same(item?.action,action));
 return found&&Number.isFinite(found.score)?found.score:null;
}
export function applyLearningAssist({
 policy,observation,legal,seat,hardAction,candidates,assistCap
}={}){
 const cap=assistCapOf(assistCap);
 const base={
  hardAction:hardAction||null,preference:null,finalAction:hardAction||null,
  changed:false,reason:null,margin:null,hardScore:null,preferenceScore:null
 };
 if(!hardAction)return {...base,reason:'fallback-no-hard'};
 if(!Array.isArray(legal)||!legal.some(action=>same(action,hardAction)))
  return {...base,reason:'fallback-illegal'};
 if(legal.length<2)return {...base,reason:'forced'};
 const preference=preferLearnedAction(policy,observation,legal,seat);
 base.preference=preference.action;
 base.margin=preference.margin;
 if(!preference.action)return {...base,reason:preference.reason};
 if(same(preference.action,hardAction))return {...base,reason:'agree'};
 if(!legal.some(action=>same(action,preference.action)))return {...base,reason:'fallback-illegal'};
 const scored=(Array.isArray(candidates)?candidates:[]).filter(item=>item&&Number.isFinite(item.score)&&
  legal.some(action=>same(action,item.action)));
 const hardScore=hardScoreOf(scored,hardAction);
 const preferenceScore=hardScoreOf(scored,preference.action);
 base.hardScore=hardScore;
 base.preferenceScore=preferenceScore;
 if(hardScore==null||preferenceScore==null)return {...base,reason:'fallback-uncompared'};
 const actor=actingSeat(seat,observation);
 const blocked=action=>{
  const score=hardScoreOf(scored,action);
  if(score!=null&&score<=-LEARN_TERMINAL&&hardScore>-LEARN_TERMINAL)return 'protect-loss';
  if(necessaryBlock(observation,actor,hardAction,action))return 'protect-block';
  if(protectsResource(observation,actor,hardAction,action))return 'protect-resource';
  return null;
 };
 if(hardScore>=LEARN_TERMINAL)return {...base,reason:'protect-lethal'};
 const direct=blocked(preference.action);
 if(direct)return {...base,reason:direct};
 const learnScores=scored.map(item=>dotSparse(readPolicy(policy).weights,pairsOf(observation,item.action,actor)));
 const mean=learnScores.reduce((sum,score)=>sum+score,0)/learnScores.length;
 let maxDev=0;
 for(const score of learnScores)maxDev=Math.max(maxDev,Math.abs(score-mean));
 const bonus=maxDev>0?learnScores.map(score=>clamp((score-mean)/maxDev*cap,-cap,cap)):learnScores.map(()=>0);
 let best=null;
 for(let i=0;i<scored.length;i++){
  const adjusted=scored[i].score+bonus[i];
  const identity=actionIdentity(observation,scored[i].action,actor);
  const current={action:scored[i].action,adjusted,hard:scored[i].score,identity};
  if(!best||adjusted>best.adjusted+1e-9)best=current;
  else if(Math.abs(adjusted-best.adjusted)<=1e-9){
   if(same(current.action,hardAction))best=current;
   else if(!same(best.action,hardAction)&&current.hard>best.hard)best=current;
   else if(!same(best.action,hardAction)&&current.hard===best.hard&&identity<best.identity)best=current;
  }
 }
 if(!best)return {...base,reason:'fallback-uncompared'};
 const guard=blocked(best.action);
 if(guard)return {...base,reason:guard};
 const finalAction=legal.find(action=>same(action,best.action))||hardAction;
 const changed=!same(finalAction,hardAction);
 return {...base,finalAction,changed,reason:changed?'assist':'assist-kept'};
}

const CLASS_LABEL={
 attack:'攻擊',block:'阻擋',play:'登場',raid:'突襲',search:'選牌',move:'移動',
 skip:'略過',effect:'效果',discard:'棄牌',pay:'支付',order:'排序',mulligan:'調度',other:'其他'
};
function classLine(validation){
 const parts=[];
 for(const [name,bucket] of Object.entries(validation?.byClass||{})){
  if(!bucket?.samples)continue;
  parts.push((CLASS_LABEL[name]||name)+' 樣本 '+bucket.samples+'、提出 '+bucket.proposed+'、相同 '+bucket.agreed+'、回退 '+bucket.abstained);
 }
 return parts.join('。');
}
export function learnReport(policy){
 if(!policy)return '目前沒有可使用的學習結果。';
 const validation=policy.validation||{};
 const lines=['已用 '+(policy.trainedSamples||0)+' 筆你的決策學習。最終權重用了全部可用決策。'];
 const skipped=policy.skipped||{};
 lines.push('略過只有一個合法選項的 '+(skipped.forced||0)+' 筆，以及 AI 操作 '+(skipped.ai||0)+' 筆。');
 if(!validation.reliable){
  lines.push('完整對局不足，無法可靠驗證。沒有把同一場切成兩半來冒充獨立驗證。');
 }else if(validation.heldoutSamples>0){
  lines.push('留出 '+validation.heldoutMatches+' 場、'+validation.heldoutSamples+' 筆。模型提出 '+
   validation.proposed+' 筆，其中和你當時的選擇相同 '+validation.agreed+' 筆，沒有提出而回退 '+
   validation.abstained+' 筆。');
  const detail=classLine(validation);
  if(detail)lines.push(detail+'。');
  lines.push('這些次數只代表留出對局裡的選擇是否相同。提出選擇不等於改掉困難 AI，也不是勝率。');
  lines.push('留出對局沒有困難 AI 的分數，所以這裡不算實際改走法。對戰當下的診斷才分得出有沒有改。');
 }
 lines.push('原始分數差不是機率，畫面上也不換成百分比。請在對戰設定把電腦難度選成「學習」。學習只在困難 AI 的相近走法之間加減有限的分數。');
 lines.push('勝率要在對戰裡另外看。');
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
