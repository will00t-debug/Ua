// Actor-visible state and one candidate action.
// Physical uids are lookup keys only. They are not copied into the vector.
import {assertObservationSafe} from '../../dist/universal-v2/white-sword-ai/observe.mjs';
import {WHITE_SWORD_IDS} from '../../dist/universal-v2/white-sword-ai/constants.mjs';
import {HISTORY} from './constants.mjs';

const UID=/^[01]-\d+$/;
const WS=new Map(WHITE_SWORD_IDS.map((id,index)=>[id,index]));
const PHASES=['start','move','main','attack','end'];
const COLORS=['blue','green','red','yellow','purple'];
const LINES=['front','energy'];
const SLOTS=4;
const ID_DIM=WHITE_SWORD_IDS.length+2;
const SLOT_DIM=6+ID_DIM;
const STEP_DIM=12;

function clip(value,low,high){
 const number=Number(value);
 if(!Number.isFinite(number))return 0;
 return Math.max(low,Math.min(high,number));
}
function fnv(text){
 let hash=2166136261;
 const value=String(text);
 for(let i=0;i<value.length;i++){
  hash^=value.charCodeAt(i);
  hash=Math.imul(hash,16777619);
 }
 return hash>>>0;
}
function oneHot(bins,index){
 const out=Array(bins).fill(0);
 if(Number.isInteger(index)&&index>=0&&index<bins)out[index]=1;
 return out;
}
function identityOf(cardId,faceDown){
 const out=Array(ID_DIM).fill(0);
 if(faceDown&&!cardId){
  out[ID_DIM-1]=1;
  return out;
 }
 const known=WS.get(cardId);
 if(Number.isInteger(known))out[known]=1;
 else if(cardId)out[WHITE_SWORD_IDS.length]=1;
 return out;
}
function genOf(card){
 const value=card?.produces??card?.baseProduces??0;
 if(typeof value==='number')return value;
 if(value&&typeof value==='object')
  return Object.values(value).reduce((sum,item)=>sum+(Number(item)||0),0);
 return 0;
}
function hiddenLayers(card){
 let count=0;
 const walk=layers=>{
  for(const layer of layers||[]){
   if(!layer||typeof layer!=='object')continue;
   if(layer.faceDown===true&&typeof layer.cardId!=='string')count++;
   walk(layer.raidLayers);
   walk(layer.underLayers);
   walk(layer.stack);
   walk(layer.under);
  }
 };
 walk(card?.raidLayers);
 walk(card?.underLayers);
 return count;
}
function remember(map,card){
 if(!card||typeof card!=='object')return;
 if(typeof card.uid==='string'){
  if(typeof card.cardId==='string')map.set(card.uid,{cardId:card.cardId,faceDown:card.faceDown===true});
  else if(card.faceDown===true)map.set(card.uid,{cardId:'',faceDown:true});
 }
 for(const layer of [...(card.raidLayers||[]),...(card.underLayers||[]),...(card.stack||[]),...(card.under||[])])
  remember(map,layer);
}
export function visibleIndex(observation,seat){
 assertObservationSafe(observation,seat);
 const map=new Map();
 const players=observation.visible.players;
 for(const card of players[seat].hand||[])remember(map,card);
 for(const player of players){
  for(const line of LINES)for(const card of player[line]||[])remember(map,card);
  for(const card of [...(player.outside||[]),...(player.removed||[]),...(player.faceUpLife||[]),...(player.publicLife||[])])
   remember(map,card);
 }
 for(const card of observation.private?.inspected||[])remember(map,card);
 return map;
}
function lookup(index,uid){
 if(typeof uid!=='string'||!UID.test(uid))return null;
 return index.get(uid)||null;
}
function colorsOf(table){
 const out=Array(COLORS.length+1).fill(0);
 for(const [name,value] of Object.entries(table||{})){
  const at=COLORS.indexOf(name);
  const scaled=clip(value,0,24)/8;
  if(at>=0)out[at]=scaled;
  else out[COLORS.length]+=scaled;
 }
 return out;
}
function countsOf(cards){
 const out=Array(WHITE_SWORD_IDS.length+1).fill(0);
 for(const card of cards||[]){
  const at=WS.get(card?.cardId);
  if(Number.isInteger(at))out[at]++;
  else if(card?.cardId)out[WHITE_SWORD_IDS.length]++;
 }
 return out.map(value=>value/4);
}
function slotOf(card){
 const out=Array(SLOT_DIM).fill(0);
 if(!card)return out;
 out[0]=1;
 out[1]=card.ready===true?1:0;
 out[2]=clip((Number(card.bp)||0)/5000,-1,2);
 out[3]=Math.min(Number(card.raidDepth)||0,4)/4;
 out[4]=clip(genOf(card),0,4)/3;
 out[5]=Math.min(hiddenLayers(card),3)/3;
 const id=typeof card.cardId==='string'?card.cardId:'';
 const face=card.faceDown===true||(!id&&hiddenLayers(card)>0);
 identityOf(id,face&&!id).forEach((value,index)=>{out[6+index]=value;});
 return out;
}
function playerSlots(player){
 const out=[];
 for(const line of LINES){
  const row=player?.[line];
  if(!Array.isArray(row)||row.length!==SLOTS)throw Error('Board line is not four slots');
  for(const card of row)out.push(...slotOf(card));
 }
 return out;
}
function historyStep(step,seat){
 const out=Array(STEP_DIM).fill(0);
 if(!step)return out;
 out[0]=1;
 out[1]=step.actor===seat?1:0;
 out[2]=step.line==='front'?1:0;
 out[3]=step.line==='energy'?1:0;
 out[4]=Number.isInteger(step.slot)?clip(step.slot,0,3)/3:0;
 const typeBin=fnv(step.type||'')%4;
 out[5+typeBin]=1;
 const card=step.cardId||'';
 if(WS.has(card))out[9]=1;
 else if(card)out[10]=1;
 out[11]=step.public===true?1:0;
 return out;
}
function finite(vector,label){
 for(let i=0;i<vector.length;i++)if(!Number.isFinite(vector[i]))throw Error(label+' feature '+i+' is not finite');
 return vector;
}
export function encodeState(observation,seat,history){
 assertObservationSafe(observation,seat);
 const visible=observation.visible;
 const me=visible.players[seat];
 const opp=visible.players[seat===0?1:0];
 const phase=PHASES.indexOf(visible.phase);
 const pending=visible.pending?.kind||'';
 const lifeMe=(Number(me.lifeCount)||0)/7;
 const lifeOpp=(Number(opp.lifeCount)||0)/7;
 const battle=visible.battle;
 const attacker=typeof battle?.cardId==='string'?battle.cardId:'';
 const recent=Array.isArray(history)?history.slice(-HISTORY):[];
 while(recent.length<HISTORY)recent.unshift(null);
 const vector=[
  1,
  ...oneHot(PHASES.length+1,phase>=0?phase:PHASES.length),
  pending?1:0,
  ...oneHot(8,pending?fnv(pending)%8:-1),
  visible.active===seat?1:0,
  clip(visible.turn,0,16)/16,
  lifeMe,lifeOpp,lifeMe-lifeOpp,
  clip(me.hand?.length??me.handCount,0,10)/10,
  clip(opp.handCount,0,10)/10,
  clip(me.deckCount,0,50)/50,
  clip(opp.deckCount,0,50)/50,
  clip(me.energyTotal,0,12)/12,
  clip(opp.energyTotal,0,12)/12,
  clip(me.apReady,0,4)/4,
  clip(opp.apReady,0,4)/4,
  clip((me.outside||[]).length,0,16)/16,
  clip((opp.outside||[]).length,0,16)/16,
  clip((me.removed||[]).length,0,16)/16,
  clip((opp.removed||[]).length,0,16)/16,
  clip((me.faceUpLife||[]).length,0,7)/7,
  clip((opp.faceUpLife||[]).length,0,7)/7,
  ...colorsOf(me.energyByColor),
  ...colorsOf(opp.energyByColor),
  battle?1:0,
  clip((Number(battle?.bp)||0)/5000,-1,2),
  clip(battle?.damage,0,3)/3,
  clip(battle?.impact,0,2)/2,
  WS.has(attacker)?1:0,
  attacker&&!WS.has(attacker)?1:0,
  ...playerSlots(me),
  ...playerSlots(opp),
  ...countsOf(me.hand),
  ...countsOf(me.outside),
  ...recent.flatMap(step=>historyStep(step,seat))
 ];
 return finite(vector,'state');
}
function semantic(value){
 return typeof value==='string'&&value&&!UID.test(value)?value:'';
}
export function encodeAction(index,action){
 if(!action||typeof action!=='object')throw Error('Action is missing');
 const card=lookup(index,action.uid);
 const base=lookup(index,action.baseUid);
 const target=lookup(index,action.targetUid);
 const key=semantic(action.key);
 const mode=semantic(action.mode);
 const indices=Array.isArray(action.indices)?action.indices.filter(item=>Number.isInteger(item)):[];
 const from=action.from==='hand'||action.from==='outside'||action.from==='removed'?action.from:'';
 const vector=[
  1,
  ...oneHot(12,fnv(action.type||'')%12),
  action.line==='front'?1:0,
  action.line==='energy'?1:0,
  Number.isInteger(action.slot)?clip(action.slot,0,3)/3:0,
  ...identityOf(card?.cardId||'',card?.faceDown===true),
  base?1:0,
  ...identityOf(base?.cardId||'',base?.faceDown===true),
  target?1:0,
  ...identityOf(target?.cardId||'',target?.faceDown===true),
  ...oneHot(8,mode?fnv(mode)%8:-1),
  from==='hand'?1:0,
  from==='outside'?1:0,
  from==='removed'?1:0,
  action.uid==null&&(action.type||'').startsWith('choose')?1:0,
  clip(indices.length,0,7)/7,
  clip(indices[0],0,7)/7,
  ...oneHot(4,key?fnv(key)%4:-1),
  action.replaceUid!=null?1:0
 ];
 return finite(vector,'action');
}
export function encodeDecision(observation,seat,legal,history){
 const index=visibleIndex(observation,seat);
 const state=encodeState(observation,seat,history);
 const actions=legal.map(action=>encodeAction(index,action));
 return {state,actions,index};
}
export function joinFeatures(state,action){
 if(state.length!==STATE_DIM||action.length!==ACTION_DIM)throw Error('Feature width mismatch');
 const joined=new Float64Array(INPUT_DIM);
 joined.set(state,0);
 joined.set(action,state.length);
 return joined;
}
export function publicHistoryStep(actor,action,cardId){
 const record={
  actor,
  type:typeof action?.type==='string'?action.type:'',
  line:action?.line==='front'||action?.line==='energy'?action.line:'',
  slot:Number.isInteger(action?.slot)?action.slot:null,
  cardId:typeof cardId==='string'&&!UID.test(cardId)?cardId:'',
  public:true
 };
 for(const key of Object.keys(record))if(/uid/i.test(key))throw Error('Public history named a uid');
 return record;
}
export function sameVector(left,right){
 if(left.length!==right.length)return false;
 for(let i=0;i<left.length;i++)if(left[i]!==right[i])return false;
 return true;
}

const SAMPLE_PLAYER=()=>({
 lifeCount:7,deckCount:40,handCount:0,hand:[],
 front:[null,null,null,null],energy:[null,null,null,null],
 apReady:0,energyTotal:0,energyByColor:{},outside:[],removed:[],faceUpLife:[],publicLife:[]
});
function blankObservation(){
 const me=SAMPLE_PLAYER();
 const opp=SAMPLE_PLAYER();
 opp.hand=null;
 return {
  visible:{
   phase:'main',turn:1,active:0,pending:null,battle:null,
   players:[me,opp]
  },
  private:null
 };
}
export const STATE_DIM=encodeState(blankObservation(),0,[]).length;
export const ACTION_DIM=encodeAction(new Map(),{type:'next'}).length;
export const INPUT_DIM=STATE_DIM+ACTION_DIM;
