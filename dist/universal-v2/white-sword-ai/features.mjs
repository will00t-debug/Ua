// Visible-only features. Synergy numbers describe the position; weights decide.
// A zero weight vector does not prefer any of these cards.
import {assertObservationSafe} from './observe.mjs';
import {
 AIZEN_NAME,GOTEI_TRAIT,KENPACHI_NAME,UNOHANA_NAME,WHITE_SWORD_IDS,YACHIRU_NAME
} from './constants.mjs';

export const POLICY_NAMES=Object.freeze([
 'bias',
 'type_play','type_raid','type_attack','type_block','type_block_pass','type_event','type_activate',
 'type_next','type_extra_draw','type_move','type_choice','type_keep','type_redraw',
 'line_front','line_energy',
 'phase_main','phase_attack','phase_other','pending',
 'life_diff','my_life','opp_life','my_energy','opp_energy','my_ap','opp_ap','my_hand','opp_hand','my_front','opp_front',
 'card_energy','card_bp','card_gen','card_ap','affordable','spends_ap',
 'attack_edge','attack_open','block_win','block_lose','pass_despite_attack','turn','gotei','opp_bp_max',
 'mulligan_redraw_thin',
 ...WHITE_SWORD_IDS.map(id=>'card_'+id),
 'k067_raid','k067_base_energy','k067_base_ge4','k067_damage2','k067_impact','k067_leave','k067_threatened',
 'h085_raid','h085_rest_target','h085_gotei','h085_upgrade','h085_energy_rest',
 'u070_raid','u070_base','u070_search','u070_follow','u070_ap_enable','u070_take','u070_skip_search',
 'aizen_energy_play','aizen_front_play','aizen_activate','aizen_ready_front','aizen_space',
 'aizen_energy_after','aizen_can_attack','aizen_draw',
 'k070_block','k070_pass','k070_impact','k070_null','k070_survives','k070_forced',
 'nos_event','nos_cap5000','nos_targets','nos_at3000','nos_at5000','nos_buried_only',
 'nos_choice','nos_choice_bp','nos_choice_high','nos_skip',
 'bankai_event','bankai_ap','bankai_enable','bankai_already','bankai_none',
 'h0','h1','h2','h3','h4','h5','h6','h7'
]);
export const VALUE_NAMES=Object.freeze([
 'bias','my_life','opp_life','life_diff','my_energy','opp_energy','my_ap','opp_ap',
 'my_hand','opp_hand','my_front_bp','opp_front_bp','my_ready','gotei','ken_top','aizen_energy','aizen_front',
 'high_ken','hand_067','hand_085','hand_070','hand_060','hand_073','hand_080','hand_k070',
 'turn','raid_bodies','opp_open','phase_main','phase_attack'
]);
export const POLICY_DIM=POLICY_NAMES.length;
export const VALUE_DIM=VALUE_NAMES.length;
export const POLICY_INDEX=Object.freeze(Object.fromEntries(POLICY_NAMES.map((name,index)=>[name,index])));
export const VALUE_INDEX=Object.freeze(Object.fromEntries(VALUE_NAMES.map((name,index)=>[name,index])));

const CARD_FEATURE=Object.freeze(Object.fromEntries(WHITE_SWORD_IDS.map(id=>[id,'card_'+id])));

export function squashName(value){
 return String(value??'').replace(/\s+/g,'');
}
export function nameMatches(definition,printed){
 if(!definition||typeof printed!=='string')return false;
 const want=squashName(printed);
 const names=[definition.name,...(Array.isArray(definition.nameAliases)?definition.nameAliases:[])];
 return names.some(name=>squashName(name)===want);
}
export function hasTrait(definition,trait){
 if(!definition||!Array.isArray(definition.traits))return false;
 return definition.traits.some(entry=>String(entry).split(/[／/]/).map(part=>part.trim()).includes(trait));
}
function ownerOf(uid){
 const owner=Number(String(uid??'').split('-')[0]);
 return owner===0||owner===1?owner:0;
}
function catalogs(value){
 if(Array.isArray(value))return value;
 return [value||{},value||{}];
}
function definitionOf(packs,card){
 if(!card?.cardId)return null;
 const pair=catalogs(packs);
 const owner=ownerOf(card.uid);
 return pair[owner]?.[card.cardId]||pair[0]?.[card.cardId]||pair[1]?.[card.cardId]||null;
}
function list(value){
 return Array.isArray(value)?value:[];
}
function tops(player){
 const out=[];
 for(const line of ['front','energy']){
  list(player?.[line]).forEach((card,slot)=>{
   if(card?.cardId)out.push({card,line,slot});
  });
 }
 return out;
}
function hand(player){
 return list(player?.hand).filter(card=>card?.cardId);
}
function frontCards(player){
 return list(player?.front).filter(card=>card?.cardId);
}
function raidBase(card){
 const layers=card?.raidLayers;
 if(Array.isArray(layers)&&layers.length&&layers[0]?.cardId)return layers[0];
 return card||null;
}
function locate(observation,seat,uid){
 if(!uid)return null;
 const players=observation.visible.players;
 const scan=(player,own)=>{
  const found=[];
  if(own)for(const card of hand(player))found.push(card);
  for(const row of tops(player)){
   found.push(row.card);
   for(const layer of list(row.card.raidLayers))if(layer?.uid)found.push(layer);
   for(const layer of list(row.card.underLayers))if(layer?.uid)found.push(layer);
  }
  for(const zone of ['outside','removed','faceUpLife','publicLife'])
   for(const card of list(player?.[zone]))if(card?.uid)found.push(card);
  return found;
 };
 for(const card of scan(players[seat],true))if(card.uid===uid)return card;
 for(const card of scan(players[seat===0?1:0],false))if(card.uid===uid)return card;
 for(const card of list(observation.private?.inspected))if(card?.uid===uid)return card;
 return null;
}
function energyOk(definition,colors){
 if(!definition)return 0;
 const discount=Number(definition.printedHandEnergyDiscount)||0;
 const cost=Math.max(0,(Number(definition.energy)||0)-discount);
 return (colors?.[definition.color]||0)>=cost?1:0;
}
function goteiCount(player,packs,skipUid=null){
 let count=0;
 for(const row of tops(player)){
  if(skipUid&&row.card.uid===skipUid)continue;
  if(hasTrait(definitionOf(packs,row.card),GOTEI_TRAIT))count++;
 }
 return count;
}
function namedTop(player,packs,printed){
 return tops(player).some(row=>nameMatches(definitionOf(packs,row.card),printed));
}
function kenLayers(player,packs){
 let top=false,buried=false;
 for(const row of tops(player)){
  if(nameMatches(definitionOf(packs,row.card),KENPACHI_NAME))top=true;
  for(const layer of list(row.card.raidLayers)){
   if(layer?.cardId&&nameMatches(definitionOf(packs,layer),KENPACHI_NAME))buried=true;
  }
 }
 return {top,buried};
}
function readyFronts(player){
 return frontCards(player).filter(card=>card.ready===true);
}
function emptySlots(cards){
 return list(cards).filter(card=>!card).length;
}
function hashBin(text,bins){
 let hash=2166136261;
 const value=String(text);
 for(let i=0;i<value.length;i++){
  hash^=value.charCodeAt(i);
  hash=Math.imul(hash,16777619);
 }
 return (hash>>>0)%bins;
}
function blank(names){
 return Array(names.length).fill(0);
}
function put(vector,index,names,name,value){
 const at=index[name];
 if(!Number.isInteger(at))throw Error('Unknown feature '+name);
 const number=Number(value);
 if(!Number.isFinite(number)||number===0)return;
 vector[at]=number;
}
export function readSeat(observation,seat,packs){
 assertObservationSafe(observation,seat);
 const visible=observation.visible;
 const me=visible.players[seat];
 const opp=visible.players[seat===0?1:0];
 const colors=me.energyByColor||{};
 const oppFront=frontCards(opp);
 const myFront=frontCards(me);
 const oppBp=oppFront.map(card=>Number(card.bp)||0);
 const ken=kenLayers(me,packs);
 const yachiru=list(me.outside).some(card=>nameMatches(definitionOf(packs,card),YACHIRU_NAME));
 return {
  visible,me,opp,colors,packs,
  myHand:hand(me),
  myFront,oppFront,oppBp,
  gotei:goteiCount(me,packs),
  ken,yachiru,
  cap5000:ken.top||yachiru,
  pending:visible.pending?.kind||'',
  phase:visible.phase||'',
  turn:Number(visible.turn)||0,
  battle:visible.battle||null
 };
}
function typeName(action){
 if(action?.type==='chooseBlock')return action.uid==null?'type_block_pass':'type_block';
 if(action?.type==='openingMulligan')return action.mode==='redraw'?'type_redraw':'type_keep';
 const names={
  play:'type_play',raid:'type_raid',attack:'type_attack',event:'type_event',activate:'type_activate',
  next:'type_next',extraDraw:'type_extra_draw',move:'type_move'
 };
 return names[action?.type]||'type_choice';
}
function acted(observation,seat,action){
 return locate(observation,seat,action?.uid);
}
function h085Others(position,observation,seat,action){
 const me=position.me;
 if(position.pending==='effect-rest-lock'){
  let skipped=false,count=0;
  for(const row of tops(me)){
   if(!hasTrait(definitionOf(position.packs,row.card),GOTEI_TRAIT))continue;
   if(!skipped&&row.card.cardId==='BLC-1-085'){skipped=true;continue;}
   count++;
  }
  return Math.max(0,count);
 }
 if(action?.type==='raid'&&action.uid){
  const card=acted(observation,seat,action);
  if(card?.cardId==='BLC-1-085'){
   const base=locate(observation,seat,action.baseUid);
   const buried=base&&hasTrait(definitionOf(position.packs,base),GOTEI_TRAIT)?1:0;
   return Math.max(0,position.gotei-buried);
  }
 }
 return position.gotei;
}
function followAp(position,ignoreUid,extraAp){
 let now=0,later=0;
 for(const card of position.myHand){
  if(card.uid===ignoreUid)continue;
  const definition=definitionOf(position.packs,card);
  if(!definition||(definition.type!=='character'&&definition.type!=='event'))continue;
  const need=Number(definition.ap)||0;
  if(need<=0||!energyOk(definition,position.colors))continue;
  const ap=position.me.apReady||0;
  if(ap>=need)now++;
  else if(ap+extraAp>=need)later++;
 }
 return {now,later};
}
function discountTargets(position,ignoreUid){
 let follow=0,enables=0;
 const ap=position.me.apReady||0;
 for(const card of position.myHand){
  if(card.uid===ignoreUid)continue;
  const definition=definitionOf(position.packs,card);
  if(!definition||definition.type!=='character'||(Number(definition.energy)||0)>4)continue;
  follow++;
  const need=Number(definition.ap)||0;
  if(energyOk(definition,position.colors)&&need>0&&ap<need&&ap>=need-1)enables++;
 }
 return {follow,enables};
}
function searchTake(position,observation,seat,action){
 const card=locate(observation,seat,action?.uid);
 const definition=definitionOf(position.packs,card);
 if(!definition)return 0;
 return definition.type==='character'&&hasTrait(definition,GOTEI_TRAIT)&&(Number(definition.energy)||0)<=4?1:0;
}

export function policyVector({observation,seat,action,legal,catalogs:packs}){
 const position=readSeat(observation,seat,packs);
 const vector=blank(POLICY_NAMES);
 const set=(name,value)=>put(vector,POLICY_INDEX,POLICY_NAMES,name,value);
 const me=position.me,opp=position.opp;
 set('bias',1);
 set(typeName(action),1);
 if(action?.line==='front')set('line_front',1);
 if(action?.line==='energy')set('line_energy',1);
 if(position.phase==='main')set('phase_main',1);
 else if(position.phase==='attack')set('phase_attack',1);
 else set('phase_other',1);
 if(position.pending)set('pending',1);
 const myLife=(Number(me.lifeCount)||0)/7,oppLife=(Number(opp.lifeCount)||0)/7;
 set('my_life',myLife);
 set('opp_life',oppLife);
 set('life_diff',myLife-oppLife);
 set('my_energy',(Number(me.energyTotal)||0)/8);
 set('opp_energy',(Number(opp.energyTotal)||0)/8);
 set('my_ap',(Number(me.apReady)||0)/3);
 set('opp_ap',(Number(opp.apReady)||0)/3);
 set('my_hand',position.myHand.length/8);
 set('opp_hand',(Number(opp.handCount)||0)/8);
 set('my_front',position.myFront.length/4);
 set('opp_front',position.oppFront.length/4);
 set('turn',Math.min(position.turn,12)/12);
 set('gotei',Math.min(position.gotei,8)/6);
 set('opp_bp_max',Math.max(0,...position.oppBp,0)/5000);
 const card=acted(observation,seat,action);
 const definition=definitionOf(packs,card);
 if(definition){
  set('card_energy',(Number(definition.energy)||0)/8);
  set('card_bp',(Number(card?.bp??definition.bp)||0)/5000);
  set('card_gen',(Number(definition.gen)||0)/3);
  set('card_ap',(Number(definition.ap)||0)/2);
  set('affordable',energyOk(definition,position.colors));
  if(CARD_FEATURE[card.cardId])set(CARD_FEATURE[card.cardId],1);
 }
 if(['play','raid','event','activate'].includes(action?.type))set('spends_ap',1);
 const legalList=Array.isArray(legal)?legal:[];
 const canDevelop=legalList.some(item=>item&&item.type!=='next'&&item.type!=='extraDraw');
 if((action?.type==='next'||action?.type==='extraDraw'||(action?.type==='chooseBlock'&&action.uid==null))&&canDevelop)
  set('pass_despite_attack',1);
 if(action?.type==='attack'){
  const mine=Number(card?.bp??definition?.bp)||0;
  const best=Math.max(0,...position.oppBp,0);
  set('attack_edge',(mine-best)/5000);
  if(!position.oppFront.length)set('attack_open',1);
 }
 if(action?.type==='chooseBlock'&&action.uid!=null&&position.battle){
  const mine=Number(card?.bp)||0;
  const attacker=Number(position.battle.bp)||0;
  if(mine>attacker)set('block_win',1);
  else set('block_lose',1);
 }
 const zeroCost=position.myHand.filter(item=>{
  const printed=definitionOf(packs,item);
  return printed&&(Number(printed.energy)||0)<=(Number(printed.printedHandEnergyDiscount)||0);
 }).length;
 if(action?.type==='openingMulligan'&&action.mode==='redraw'&&zeroCost<2)set('mulligan_redraw_thin',1);
 const bin=hashBin([action?.type,card?.cardId||'',action?.mode||'',action?.line||''].join('|'),8);
 set('h'+bin,1);
 writeKenpachiRaid(set,position,observation,seat,action,card);
 writeHitsugaya(set,position,observation,seat,action,card);
 writeUnohana(set,position,observation,seat,action,card);
 writeAizen(set,position,action,card,definition);
 writeMustBlock(set,position,action,card,legalList);
 writeNoshaba(set,position,observation,seat,action,card);
 writeBankai(set,position,action,card);
 return vector;
}
function writeKenpachiRaid(set,position,observation,seat,action,card){
 if(card?.cardId!=='BLC-2-067'||action?.type!=='raid')return;
 set('k067_raid',1);
 const base=raidBase(locate(observation,seat,action.baseUid));
 const printed=definitionOf(position.packs,base);
 const energy=Number(printed?.energy)||0;
 set('k067_base_energy',energy/8);
 const high=energy>=4?1:0;
 set('k067_base_ge4',high);
 set('k067_damage2',high);
 set('k067_impact',1);
 set('k067_leave',high&&position.myHand.length>=2?1:0);
 set('k067_threatened',position.oppBp.some(bp=>bp>=3500)?1:0);
}
function writeHitsugaya(set,position,observation,seat,action,card){
 const choosing=position.pending==='effect-rest-lock'&&tops(position.me).some(row=>row.card.cardId==='BLC-1-085');
 const playing=card?.cardId==='BLC-1-085'&&(action?.type==='raid'||action?.type==='play');
 if(!choosing&&!playing)return;
 if(action?.type==='raid')set('h085_raid',1);
 const others=h085Others(position,observation,seat,action);
 set('h085_gotei',Math.min(others,8)/6);
 const upgrade=others>=6?1:0;
 set('h085_upgrade',upgrade);
 if(playing)set('h085_rest_target',position.oppFront.length?1:0);
 else if(action?.uid&&position.oppFront.some(item=>item.uid===action.uid))set('h085_rest_target',1);
 if(upgrade)set('h085_energy_rest',list(position.opp.energy).filter(item=>item?.cardId&&definitionOf(position.packs,item)?.type==='character').length/4);
}
function writeUnohana(set,position,observation,seat,action,card){
 const onBoard=tops(position.me).some(row=>row.card.cardId==='BLC-1-070');
 const playing=card?.cardId==='BLC-1-070'&&(action?.type==='raid'||action?.type==='play');
 const searching=onBoard&&position.pending==='effect-top-filter-many-choice';
 if(!playing&&!searching)return;
 if(action?.type==='raid')set('u070_raid',1);
 set('u070_base',namedTop(position.me,position.packs,UNOHANA_NAME)?1:0);
 set('u070_search',(Number(position.me.deckCount)||0)>0?1:0);
 if(playing){
  const follow=discountTargets(position,action.uid);
  set('u070_follow',follow.follow/4);
  set('u070_ap_enable',follow.enables/4);
 }
 if(searching){
  if(action?.uid)set('u070_take',searchTake(position,observation,seat,action));
  else set('u070_skip_search',1);
 }
}
function writeAizen(set,position,action,card,definition){
 const playing=card?.cardId==='BLC-4-060'&&action?.type==='play';
 const activating=card?.cardId==='BLC-4-060'&&action?.type==='activate'&&action.mode==='restTwoMove';
 const attacking=card?.cardId==='BLC-4-060'&&action?.type==='attack';
 if(!playing&&!activating&&!attacking)return;
 if(playing&&action.line==='energy')set('aizen_energy_play',1);
 if(playing&&action.line==='front')set('aizen_front_play',1);
 set('aizen_ready_front',readyFronts(position.me).length/4);
 set('aizen_space',emptySlots(position.me.front)/4);
 if(activating){
  set('aizen_activate',1);
  const produces=Number(card?.produces??definition?.gen)||0;
  set('aizen_energy_after',Math.max(0,(Number(position.me.energyTotal)||0)-produces)/8);
  const can=card?.ready===true?1:0;
  set('aizen_can_attack',can);
  set('aizen_draw',can);
 }
 if(attacking)set('aizen_draw',1);
}
function writeMustBlock(set,position,action,card,legal){
 if(action?.type!=='chooseBlock')return;
 const blocks=legal.filter(item=>item?.type==='chooseBlock');
 const forced=blocks.length>0&&blocks.every(item=>item.uid!=null);
 const mine=card?.cardId==='BLC-4-070';
 if(action.uid==null){
  if(blocks.some(item=>item.uid!=null))set('k070_pass',1);
  return;
 }
 if(!mine)return;
 set('k070_block',1);
 const impact=Number(position.battle?.impact)||0;
 set('k070_impact',impact/2);
 if(impact>0)set('k070_null',1);
 const mineBp=Number(card?.bp)||0;
 const attacker=Number(position.battle?.bp)||0;
 if(position.battle&&mineBp>attacker)set('k070_survives',1);
 if(forced)set('k070_forced',1);
}
function writeNoshaba(set,position,observation,seat,action,card){
 const choosing=position.pending==='effect-retire-bp';
 const playing=card?.cardId==='BLC-2-073'&&action?.type==='event';
 if(!playing&&!choosing)return;
 const at3000=position.oppFront.filter(item=>(Number(item.bp)||0)<=3000).length;
 const at5000=position.oppFront.filter(item=>(Number(item.bp)||0)<=5000).length;
 if(playing){
  set('nos_event',1);
  set('nos_cap5000',position.cap5000?1:0);
  set('nos_at3000',at3000/4);
  set('nos_at5000',at5000/4);
  set('nos_targets',(position.cap5000?at5000:at3000)/4);
  if(!position.ken.top&&position.ken.buried)set('nos_buried_only',1);
 }
 if(choosing){
  set('nos_cap5000',position.cap5000?1:0);
  if(action?.uid==null)set('nos_skip',1);
  else {
   const target=position.oppFront.find(item=>item.uid===action.uid)||locate(observation,seat,action.uid);
   const bp=Number(target?.bp)||0;
   set('nos_choice',1);
   set('nos_choice_bp',bp/5000);
   if(bp>3000)set('nos_choice_high',1);
  }
 }
}
function writeBankai(set,position,action,card){
 if(card?.cardId!=='BLC-4-080'||action?.type!=='event')return;
 const follow=followAp(position,action.uid,2);
 set('bankai_event',1);
 set('bankai_ap',(Number(position.me.apReady)||0)/3);
 set('bankai_enable',follow.later>0?1:0);
 set('bankai_already',follow.now>0&&follow.later===0?1:0);
 set('bankai_none',follow.now===0&&follow.later===0?1:0);
}
function handCount(position,id){
 return position.myHand.filter(card=>card.cardId===id).length/4;
}
export function valueVector({observation,seat,catalogs:packs}){
 const position=readSeat(observation,seat,packs);
 const vector=blank(VALUE_NAMES);
 const set=(name,value)=>put(vector,VALUE_INDEX,VALUE_NAMES,name,value);
 const me=position.me,opp=position.opp;
 const myLife=(Number(me.lifeCount)||0)/7,oppLife=(Number(opp.lifeCount)||0)/7;
 set('bias',1);
 set('my_life',myLife);
 set('opp_life',oppLife);
 set('life_diff',myLife-oppLife);
 set('my_energy',(Number(me.energyTotal)||0)/8);
 set('opp_energy',(Number(opp.energyTotal)||0)/8);
 set('my_ap',(Number(me.apReady)||0)/3);
 set('opp_ap',(Number(opp.apReady)||0)/3);
 set('my_hand',position.myHand.length/8);
 set('opp_hand',(Number(opp.handCount)||0)/8);
 set('my_front_bp',position.myFront.reduce((sum,card)=>sum+(Number(card.bp)||0),0)/20000);
 set('opp_front_bp',position.oppBp.reduce((sum,bp)=>sum+bp,0)/20000);
 set('my_ready',readyFronts(me).length/4);
 set('gotei',Math.min(position.gotei,8)/6);
 set('ken_top',position.ken.top?1:0);
 set('aizen_energy',tops(me).some(row=>row.line==='energy'&&nameMatches(definitionOf(packs,row.card),AIZEN_NAME))?1:0);
 set('aizen_front',tops(me).some(row=>row.line==='front'&&nameMatches(definitionOf(packs,row.card),AIZEN_NAME))?1:0);
 set('high_ken',tops(me).some(row=>nameMatches(definitionOf(packs,row.card),KENPACHI_NAME)&&(Number(definitionOf(packs,row.card)?.energy)||0)>=4)?1:0);
 set('hand_067',handCount(position,'BLC-2-067'));
 set('hand_085',handCount(position,'BLC-1-085'));
 set('hand_070',handCount(position,'BLC-1-070'));
 set('hand_060',handCount(position,'BLC-4-060'));
 set('hand_073',handCount(position,'BLC-2-073'));
 set('hand_080',handCount(position,'BLC-4-080'));
 set('hand_k070',handCount(position,'BLC-4-070'));
 set('turn',Math.min(position.turn,12)/12);
 set('raid_bodies',tops(me).filter(row=>list(row.card.raidLayers).length>0).length/4);
 set('opp_open',position.oppFront.length?0:1);
 if(position.phase==='main')set('phase_main',1);
 if(position.phase==='attack')set('phase_attack',1);
 return vector;
}
export function uniqueFeatureNames(names){
 return new Set(names).size===names.length;
}
