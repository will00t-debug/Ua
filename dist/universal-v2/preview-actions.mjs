// Presentation-only adapters for the isolated V2 preview.
// NEVER generate or accept an action outside legalUniversalActions().
export const V2_PHASE_LABELS=Object.freeze({
 start:'開始／額外抽牌',move:'移動階段',main:'主要階段',attack:'攻擊階段'
});
export const V2_TITLE_LABELS=Object.freeze({
 bleach:'BLEACH', 'gurren-lagann':'天元突破',
 'solo-leveling':'我獨自升級',
 'sword-art-online':'刀劍神域',
 'mushoku-tensei':'無職轉生'
});
export const V2_PENDING_LABELS=Object.freeze({
 block:'選擇是否阻擋', 'life-trigger':'生命觸發',
 'leave-replacement':'角色離場保護','private-top-choice':'查看牌庫頂','private-top-place':'選擇牌頂或牌底',
 'effect-recover-ap':'恢復 AP','end-hand-limit':'手牌上限',
 'effect-discard':'選擇棄牌','effect-discard-cost':'支付棄牌成本',
 'effect-discard-gate':'是否支付棄牌成本',
 'effect-search-deck':'搜尋牌庫', 'effect-search-deck-multi':'依序搜尋牌庫',
 'effect-top-inspect':'查看牌庫頂','effect-top-inspect-many':'任意張卡送場外',
 'effect-top-filter-choice':'查看牌頂，選擇符合特徵的角色／卡','effect-top-order':'排列牌庫頂或底',
 'effect-bounce-own':'選擇返回手牌的己方角色',
 'effect-buff-own':'選擇己方角色增加本回合 BP',
 'effect-once-choice':'是否發動本回合一次能力',
 'effect-choice-mode':'選擇一項效果',
 'recovered-self-entry':'回收後可 REST 登場至能源線',
 'effect-recover-outside':'從場外回收','effect-retire-bp':'選擇敵方退場',
 'effect-rest-bp':'選擇敵方 REST','effect-buff-trait':'選擇己方 BP 加成',
 'main-two-buff':'主要能力選擇 BP 對象',
 'main-discard-buff':'支付一張手牌，讓自身 BP 增加',
 'effect-target':'指定角色','raid-effect-order':'突襲能力結算順序',
 'retirement-order':'同時退場效果的結算順序'
});
export function isExactLegal(action,legal){
 return Array.isArray(legal)&&legal.some(candidate=>
  JSON.stringify(candidate)===JSON.stringify(action));
}
export function uiActor(state){
 return state.pending?.player??state.active;
}
export function uiCardLabel(pack,state,uid){
 if(uid==null)return '';
 if(/^AP\d-\d+$/.test(uid))return 'AP '+uid.replace(/^AP\d-/, '');
 const owner=Number(String(uid).split('-')[0]);
 if(owner!==0&&owner!==1)return String(uid);
 const sourcePack=Array.isArray(pack)?pack[owner]:pack;
 const id=state?.players?.[owner];
 if(!id)return '卡片';
 const zones=[id.hand,id.front,id.energy,id.outside,id.removed,id.deck,id.life];
 const locate=(entry)=>{
  if(!entry)return null;
  if(entry.uid===uid)return entry;
  for(const layer of [...(entry.stack||[]),...(entry.under||[])]){
   const hit=locate(layer);if(hit)return hit;
  }
  return null;
 };
 let physical=null;
 for(const cards of zones){
  if(!Array.isArray(cards))continue;
  for(const c of cards){physical=locate(c);if(physical)break;}
  if(physical)break;
 }
 if(!physical)return '指定卡片';
 const printed=sourcePack.cards[physical.cardId];
 return printed?.name||physical.cardId;
}
export function uiActionLabel(action,{pack,state}={}){
 const name=()=>pack&&state?uiCardLabel(pack,state,action.uid):'指定卡片';
 const destination=()=>action.line==='energy'?'能源線':'前線';
 const suffix=()=>action.slot===undefined?'':' · '+destination()+' '+(action.slot+1);
 switch(action.type){
  case 'next':return '前進下一階段／結束回合';
  case 'extraDraw':return '支付 1 AP 額外抽牌';
  case 'play':return '普通登場：'+name()+suffix();
  case 'raid':return '突襲登場：'+name()+' · 前線 '+(action.slot+1);
  case 'event':return '使用事件：'+name();
  case 'move':return '移至前線 '+(action.slot+1);
  case 'step':return 'STEP 移至能源線 '+(action.slot+1);
  case 'attack':return '宣告攻擊：'+name();
  case 'activate':return action.mode==='discardSelfBuff'?
    '起動主要：棄一張手牌，本回合自身 BP＋1500（每回合一次）':
    action.mode==='selfRestEnergyRetire'?
    (pack?.cards&&state?.players?.some(p=>[...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.end==='hand'))
     ?'起動主要：REST 自身，產能＋1，主要階段結束回手'
     :'起動主要：REST 自身，產能＋1，主要階段結束退場'):
    action.mode==='selfRestThen'?'主要能力：REST 自身，執行效果':
    action.mode==='selfRestBuff'?'主要能力：REST 自身，指定另一張己方角色本回合 BP 加成':
    action.mode==='selfRestEnemy'?'主要能力：REST 自身，指定敵方前線角色':
    action.mode==='ready'?'主要能力：ACTIVE':
    action.mode==='buff'?'主要能力：BP 加成':'主要能力：ACTIVE ＋ BP 加成';
  case 'chooseBlock':return action.uid===null?'不阻擋':'使用 '+name()+' 阻擋';
  case 'chooseTrigger':
   if(action.mode==='skip')return '不使用此觸發';
   if(action.mode==='get')return '加入手牌';
   if(action.mode==='draw')return '抽 1 張';
   if(action.mode==='final')return 'FINAL 恢復生命';
   if(action.mode==='raid')return '使用 RAID 觸發 · 前線 '+(action.slot+1);
   if(action.mode==='colorRestSkip')return 'COLOR：使 '+name()+' REST，下次不能 ACTIVE';
   if(action.mode==='colorOutside')return '從場外登場 '+name()+suffix();
   if(action.mode==='color')return 'COLOR 登場 '+name()+suffix();
   if(action.mode==='active')return '使 '+name()+' ACTIVE';
   if(action.mode==='special')return '使 '+name()+' 退場';
   return '生命觸發：'+action.mode;
  case 'chooseEffectMode':
   return action.mode==='skip'?'不選任何效果':
    '選擇效果：'+(state?.pending?.options?.find(o=>o.id===action.mode)?.label||action.mode);
  case 'chooseOnceEffect':
   return action.mode==='activate'?'使用每回合一次能力':'暫不使用（不消耗限次）';
  case 'chooseLeaveReplacement':
   return action.mode==='leave'?'讓角色退場':'消耗裏向底卡保護角色'+(action.uid?'（'+name()+'）':'');
  case 'chooseTopCard':return action.mode==='top'?'保留在牌庫頂':action.mode==='bottom'?'放回牌庫底':'送至場外';
  case 'chooseRaidOrder':return action.mode==='baseFirst'?'先結算突襲底板效果':'先結算突襲登場效果';
  case 'chooseRetirementOrder':return '先結算此退場效果';
  case 'choosePhaseOrder':return '先結算此階段效果';
  case 'chooseApRecovery':return action.uid===null?'完成恢復 AP':'恢復 AP 卡';
  case 'chooseDiscardGate':return action.uid===null?'不支付成本':'棄 '+name()+' 支付成本';
  case 'chooseDiscardCost':return action.uid===null?'不支付成本':'棄 '+name()+' 支付成本';
  case 'chooseHandLimit':return '超過上限，移除 '+name();
  case 'chooseDiscard':return '棄 '+name();
  case 'chooseMainDiscard':return '支付起動成本：將 '+name()+' 送至場外';
  case 'chooseOutsideRecovery':return action.uid===null?'不回收／完成':'回收 '+name()+' 至手牌';
  case 'chooseRecoveredEntry':return action.mode==='skip'?'保留在手牌':
   '回收後免費 REST 登場至能源線 '+(action.slot+1);
  case 'chooseOwnBounce':return '將 '+name()+' 返回手牌';
  case 'chooseDeckSearch':case 'chooseDeckSearchMulti':
   return action.uid===null?'結束搜尋':'將 '+name()+' 加入手牌';
  case 'chooseInspectedOutside':return action.uid===null?'完成選擇並排列剩餘牌':'將 '+name()+' 送場外';
  case 'chooseTopFiltered':return action.uid===null?'不加入手牌，將其餘卡排列至底部':'加入手牌：'+name();
  case 'chooseTopOrder':return '依序放回：'+name();
  case 'chooseOwnBuff':case 'chooseMainBuff':case 'chooseTraitBuff':case 'chooseRestBp':
  case 'chooseRetireBp':case 'chooseTarget':
   return action.uid===null?'不指定／完成':'指定 '+name();
  default:return '執行 '+action.type;
 }
}
export function visibleActionsForCard(legal,uid){
 return legal.filter(a=>a.uid===uid||a.baseUid===uid);
}
export function uiActionGroup(action){
 if(action.type==='next'||action.type==='extraDraw')return 'phase';
 if(['play','raid','event','move','step','attack','activate'].includes(action.type))return 'card';
 return 'pending';
}
