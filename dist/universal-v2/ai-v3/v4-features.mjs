// Feature keys copied from PR #294 HEAD cac9fef39f945afd0051041c6db82208fd9ff98d
// (learn format ua-v2-learn-v4). The official site still serves learned-v1.
// This module does not train, does not read win/loss labels, and does not
// change the frozen hard-search-2 policy. Hash prefix remains v4|.
import {classifyDecision} from '../coach-format.mjs';
import {officialV2Pack} from '../official-entry.mjs';

export const V4_FORMAT='ua-v2-learn-v4';
export const V4_DIM=4096;
const LEARN_DIM=V4_DIM;
const TITLES=['bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei','rezero','steins-gate','madoka','inuyasha','kjn','csm','aot','kmr'];
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
 for(const title of TITLES){
  let pack=null;
  try{pack=officialV2Pack(title);}catch{pack=null;}
  for(const card of Object.values(pack?.cards||{})){
   if(!card||typeof card.id!=='string'||!card.id||map.has(card.id))continue;
   map.set(card.id,summarize(card));
  }
 }
 printedCatalog=map;
 return map;
}
function knownNumber(value){
 return typeof value==='number'&&Number.isFinite(value)?value:null;
}
function summarize(card){
 const bases=Array.isArray(card.raidBaseNames)?card.raidBaseNames.filter(name=>typeof name==='string').slice(0,6):[];
 return {
  type:typeof card.type==='string'?card.type:'',
  color:typeof card.color==='string'?card.color:'',
  energy:knownNumber(card.energy),
  ap:knownNumber(card.ap),
  bp:knownNumber(card.bp),
  gen:knownNumber(card.gen),
  trigger:typeof card.trigger==='string'&&card.trigger?card.trigger:'none',
  raid:!!(card.raidName||card.raidTrait),
  raidName:typeof card.raidName==='string'?card.raidName:'',
  raidBases:bases,
  name:typeof card.name==='string'?card.name:'',
  damage:knownNumber(card.printedAttackDamage??card.raidAttackDamage),
  impact:knownNumber(card.impact??card.raidImpact),
  impactNull:card.impactNull===true,
  extraEnergy:card.activeExtraEnergy?1:0
 };
}
function printedOf(cardId){
 if(typeof cardId!=='string'||!cardId)return null;
 return catalog().get(cardId)||null;
}
export function hashV4(text){
 const index=hashIndex(text);
 return index;
}
function hashIndex(text){
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
function bucketKnown(n,cuts){
 if(typeof n!=='number'||!Number.isFinite(n))return 'unknown';
 return bucket(n,cuts);
}
function squash(value){return String(value||'').replace(/\s+/g,'');}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
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
 return [printed.type,printed.color,'c'+bucketKnown(printed.energy,COST_BINS),'a'+bucketKnown(printed.ap,AP_BINS),
  'b'+bucketKnown(printed.bp,BP_BINS),'g'+bucketKnown(printed.gen,[0,1,2]),
  printed.raid?'r1':'r0','t'+printed.trigger].join('|');
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
 keys.push(prefix+':cost:'+bucketKnown(printed.energy,COST_BINS));
 keys.push(prefix+':ap:'+bucketKnown(printed.ap,AP_BINS));
 keys.push(prefix+':pbp:'+bucketKnown(printed.bp,BP_BINS));
 keys.push(prefix+':gen:'+bucketKnown(printed.gen,[0,1,2]));
 keys.push(prefix+':trigger:'+printed.trigger);
 keys.push(prefix+':raid:'+(printed.raid?'y':'n'));
 if(typeof printed.damage==='number'&&printed.damage>0)keys.push(prefix+':pdmg:'+bucket(printed.damage,[1,2,3]));
 if(typeof printed.impact==='number'&&printed.impact>0)keys.push(prefix+':pimp:'+bucket(printed.impact,[1,2,3]));
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
 if(!printed||printed.energy==null)return 'unknown';
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
 role('discard',action?.discardUid);
 role('recover',action?.recoverUid);
 role('rest',action?.restUid);
 for(const part of scalarParts(action,cards))keys.push('role:'+part);
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
 const pendingKind=observation?.visible?.pending?.kind;
 if(type==='chooseRevealedTop'||pendingKind==='effect-reveal-opp-top'){
  const shown=latestRevealedTop(observation);
  const place=publicToken(action?.place)||'none';
  if(shown){
   addPrinted(keys,'shown',shown);
   keys.push('shownPick:'+shown+'|'+place);
  }else keys.push('shownPick:unknown|'+place);
 }
 return keys;
}
function latestRevealedTop(observation){
 const list=observation?.visible?.publicReveals;
 if(!Array.isArray(list))return '';
 for(let i=list.length-1;i>=0;i--){
  const card=list[i];
  if(!card||card.kind!=='revealed-top'||typeof card.cardId!=='string'||!card.cardId)continue;
  return card.cardId;
 }
 return '';
}
export function featureKeys(observation,action,seat){
 return describe(observation,action,seat);
}
export function featuresOf(observation,action,seat){
 const vec=blank();
 for(const key of describe(observation,action,seat))vec[hashIndex('v4|'+key)]+=1;
 return vec;
}
function publicToken(text){
 if(typeof text!=='string'||!text)return '';
 const value=text.replace(/\s+/g,'').slice(0,40);
 if(!value||/^[01]-\d+$/.test(value)||/(^|[^A-Za-z0-9])[01]-\d+(?=$|[^0-9])/.test(value))return '';
 return value;
}
function scrubBranch(text,cards){
 if(typeof text!=='string'||!text)return '';
 const value=text.slice(0,160).replace(/(^|[^A-Za-z0-9])([01]-\d+)(?=$|[^0-9])/g,(all,pre,uid)=>{
  return pre+(cards.get(uid)?.cardId||'unseen');
 }).replace(/\d{5,}/g,'n').replace(/\s+/g,'');
 return value.slice(0,80);
}
function scalarParts(action,cards){
 const parts=[];
 if(Number.isInteger(action?.value)&&action.value>=0&&action.value<=40)parts.push('value:'+action.value);
 const place=publicToken(action?.place);
 if(place)parts.push('place:'+place);
 if(action?.index===null)parts.push('index:none');
 else if(Number.isInteger(action?.index)&&action.index>=0&&action.index<=20)parts.push('index:'+action.index);
 if(Number.isInteger(action?.fromSlot)&&action.fromSlot>=0&&action.fromSlot<=7)
  parts.push('fromSlot:'+action.fromSlot);
 if(Number.isInteger(action?.step)&&action.step>=0&&action.step<=40)parts.push('step:'+action.step);
 else{
  const step=publicToken(typeof action?.step==='string'?action.step:'');
  if(step)parts.push('step:'+step);
 }
 const when=publicToken(action?.when);
 if(when)parts.push('when:'+when);
 const id=publicToken(action?.id);
 if(id)parts.push('id:'+id);
 const name=publicToken(action?.name);
 if(name)parts.push('name:'+name);
 const key=scrubBranch(action?.key,cards);
 if(key)parts.push('key:'+key);
 return parts;
}
export function actionIdentity(observation,action,seat){
 const cards=indexVisible(observation,actingSeat(seat,observation));
 const idOf=uid=>typeof uid==='string'?cards.get(uid)?.cardId||'':'';
 return [action?.type||'',action?.mode||'',action?.line||'',String(action?.slot??''),action?.from||'',
  idOf(action?.uid),idOf(action?.targetUid),idOf(action?.baseUid),idOf(action?.replaceUid),idOf(action?.retireUid),
  idOf(action?.discardUid),idOf(action?.recoverUid),idOf(action?.restUid),
  scalarParts(action,cards).join(',')].join('|');
}

export function dotV4(weights,observation,action,seat){
 if(!Array.isArray(weights)||weights.length!==V4_DIM)return 0;
 let score=0;
 for(const key of featureKeys(observation,action,seat)){
  const index=hashIndex('v4|'+key);
  const weight=weights[index];
  if(weight)score+=weight;
 }
 return score;
}
