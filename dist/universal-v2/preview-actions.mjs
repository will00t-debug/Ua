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
 'life-batch-order':'選擇 LIFE／登場效果結算順序',
 'leave-replacement':'角色離場保護','private-top-choice':'查看牌庫頂','private-top-place':'選擇牌頂或牌底',
 'effect-recover-ap':'恢復 AP','end-hand-limit':'手牌上限',
 'effect-discard':'選擇棄牌','effect-discard-cost':'支付棄牌成本',
 'effect-discard-gate':'是否支付棄牌成本',
 'effect-remove-outside':'可將己方場外卡移入移除區',
 'effect-search-deck':'搜尋牌庫', 'effect-search-deck-multi':'依序搜尋牌庫',
 'effect-top-inspect':'查看牌庫頂','effect-top-inspect-many':'任意張卡送場外',
 'effect-top-filter-choice':'查看牌頂，選擇符合特徵的角色／卡','effect-top-trait-outside':'查看牌頂，將符合特徵的卡送場外',
 'effect-top-order':'排列牌庫頂或底',
 'effect-top-hand-outside':'查看牌頂，1 張加入手牌、1 張送至場外',
 'effect-energy-trait-front':'可將能源線上具有指定特徵的角色移至前線',
 'effect-optional-mill':'可將牌庫頂 1 張送場外',
 'effect-optional-draw':'攻擊時可抽 0 或 1 張',
 'effect-pay-ap-deploy':'可支付 1 AP，從場外 REST 登場',
 'effect-optional-pay-ap':'可支付 1 AP，然後結算後續效果',
 'effect-hand-rest':'從己方手牌免費 REST 登場',
 'effect-hand-rest-or-raid':'從己方手牌 REST 登場或合法 Raid',
 'effect-active-own-named':'可將最多 1 個己方指定名稱角色轉為 ACTIVE',
 'effect-active-energy-named':'可將最多 1 張己方能量線指定名稱卡轉為 ACTIVE',
 'effect-bounce-own':'選擇返回手牌的己方角色',
 'effect-buff-own':'選擇己方角色增加本回合 BP',
 'effect-once-choice':'是否發動本回合一次能力',
 'effect-choice-mode':'選擇一項效果',
 'effect-named-impact':'可選 1 個指定名稱角色，本回合 BP 上升並獲得 Impact',
 'effect-name-or-trait-impact':'可選最多 1 個己方場上指定名稱或特徵角色，本回合 BP+1000 並獲得 Impact 1',
 'effect-outside-color-ap-rest':'從場外將 1 張指定顏色、AP、名稱或特徵的角色以 REST 登場',
 'effect-first-attack-kit':'選 1 個指定名稱角色，本回合 BP 上升，第一次攻擊獲得 Impact 與狙擊',
 'effect-entry-sacrifice':'選另 1 個自己的角色退場，成功後此角色額外產生黃色能量並選 1 項',
 'effect-named-double':'選 1 個具有指定特徵的角色，本回合獲得 2 次攻擊',
 'effect-field-sacrifice-replay':'選 1 個自己的角色退場，成功後重播此場域的登場效果',
 'effect-swap-or-buff':'選交換位置、本回合 BP+1000，或在指定角色在場時兩項都做',
 'effect-swap-pair':'選 1 個要交換位置的角色',
 'energy-line-attack-end-swap':'可選 1 個本回合尚未攻擊的前線角色，與此角色交換位置',
 'effect-named-rest-ready':'可橫置 1 個 Active 的指定名稱角色，然後啟動 1 張 AP 卡',
 'effect-named-keyword':'可選 1 個指定名稱角色，賦予本回合 Impact 或直接攻擊傷害',
 'effect-keyword-mode':'選擇 Impact +1 或 Damage +1',
 'effect-name-or-trait-ready':'可將 1 個指定名稱或特徵角色改為 ACTIVE',
 'effect-name-or-trait-protect':'可讓 1 個指定名稱或特徵角色不被對方效果選擇',
 'effect-sacrifice-named':'可退場另 1 個指定名稱角色',
 'recovered-self-entry':'回收後可 REST 登場至能源線',
 'effect-recover-outside':'從場外回收','effect-retire-bp':'選擇敵方退場',
 'effect-retire-own-trait':'可退場 1 個己方指定特徵角色',
 'effect-retire-missing-trait':'使 1 個不具有指定特徵的己方角色退場',
 'effect-outside-color-trait-active':'可從場外將 1 張指定顏色與特徵的角色以 ACTIVE 登場',
 'effect-named-field-protect':'可選最多 1 個己方場上指定名稱角色，直到下一個己方回合開始前不受敵方角色或 Trigger 效果選擇',
 'effect-rest-ap-lock':'可選最多 1 個敵方前線角色轉為 REST；己方回合且己方前線有原始 AP 達標時，直到此角色離開前線前不能轉為 ACTIVE',
 'effect-outside-active-pair':'可從場外將符合條件的角色以 ACTIVE 登場',
 'effect-top-trait-hand':'查看牌頂，符合特徵可加入手牌，否則放回牌頂或場外',
 'effect-active-any':'可將 1 張己方場上卡改為 ACTIVE',
 'effect-grant-front-energy':'讓另一張己方前線指定特徵角色本回合也能產生能源',
 'effect-rest-bp':'選擇敵方 REST','effect-grant-ap-tax':'讓另一張己方 DFN 角色獲得指定時的 AP 加價保護','effect-attack-ban':'指定禁止攻擊的對手前線角色',
 'effect-buff-trait':'選擇己方 BP 加成',
 'main-two-buff':'主要能力選擇 BP 對象',
 'main-discard-buff':'支付一張手牌，讓自身 BP 增加',
 'effect-grant-attack':'授予己方角色攻擊時能力','granted-attack-draw':'攻擊時是否抽一張',
 'effect-target':'指定角色','effect-mark-opp-start':'可選 1 個敵方前線角色，下一個敵方回合開始時退場','effect-target-many':'最多選擇兩名不同敵方角色','raid-effect-order':'突襲能力結算順序',
 'effect-move-order':'選擇同時取得的移動觸發處理順序',
 'effect-rest-tuck':'是否 REST 角色，放置剛送至場外的手牌',
 'effect-tuck-moved':'可將該場外卡裏向放在自身下方',
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
 const zones=[id.hand,id.front,id.energy,id.outside,id.removed,id.deck,id.life,id.lifeRevealed];
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
  case 'attack':return action.targetUid?
   '狙擊攻擊：'+name()+' → '+uiCardLabel(pack,state,action.targetUid):
   '宣告攻擊：'+name();
  case 'activate':return action.mode==='discardSelfBuff'?
    '起動主要：棄一張手牌，本回合自身 BP＋1500（每回合一次）':
    action.mode==='selfRestEnergyRetire'?
    (pack?.cards&&state?.players?.some(p=>[...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.end==='hand'))
     ?'起動主要：REST 自身，產能＋1，主要階段結束回手'
     :'起動主要：REST 自身，產能＋1，主要階段結束退場'):
    action.mode==='selfRestThen'?'主要能力：REST 自身，執行效果':
    action.mode==='selfRestBuff'?'主要能力：REST 自身，指定另一張己方角色本回合 BP 加成':
    action.mode==='payApDrawEnergy'?'起動主要：支付 1 AP，抽 1 張，本回合產能＋1':
    action.mode==='restFrontGainEnergy'?'起動主要：REST 自身，再 REST 一張己方前線，本回合產能＋1':
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
  case 'chooseSacrificeNamed':return action.uid===null?'不退場指定名稱角色':'退場 '+name();
  case 'chooseNameOrTraitReady':return action.uid===null?'不改為 ACTIVE':'將 '+name()+' 改為 ACTIVE';
  case 'chooseNameOrTraitProtect':return action.uid===null?'不賦予選擇保護':'令 '+name()+' 不被對方效果選擇';
  case 'chooseNamedKeyword':return action.uid===null?'不賦予指定名稱角色':'選擇 '+name();
  case 'chooseKeywordMode':return action.mode==='impact'?'本回合 Impact +1':'本回合直接攻擊傷害 +1';
  case 'chooseNamedImpact':return action.uid===null?'不賦予 BP 與 Impact':'賦予 '+name()+' 本回合 BP 與 Impact';
  case 'chooseNamedRestReady':return action.uid===null?'不橫置指定角色':'橫置 '+name()+'，然後啟動 1 張 AP 卡';
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
  case 'chooseMoveEffectOrder':return action.key.startsWith('observer-')?
   '先處理場上角色取得的送場外反應':'先處理已取得的卡片移動能力';
  case 'chooseRestTuck':return action.mode==='rest'?
   'REST 此角色，選擇是否放置裏向底牌':'不發動 REST 放置';
  case 'chooseTuckMoved':return action.uid===null?
   '不放置裏向底牌':'將剛送場外的牌裏向放在角色下方';
  case 'chooseLifeOrder':return '先處理此公開 LIFE：'+name();
  case 'chooseLifeEffect':return '先結算登場效果：'+uiCardLabel(pack,state,state?.pending?.entries?.find(e=>e.key===action.key)?.sourceUid);
  case 'choosePhaseOrder':return '先結算此階段效果';
  case 'chooseApRecovery':return action.uid===null?'完成恢復 AP':'恢復 AP 卡';
  case 'chooseDiscardGate':return action.uid===null?'不支付成本':'棄 '+name()+' 支付成本';
  case 'chooseMarkOppStart':return action.uid===null?'不選擇敵方前線角色':'指定 '+name()+'，下一個敵方回合開始時退場';
  case 'chooseLineSlot':return '移至能源線 '+(action.slot+1);
  case 'chooseRemoveOutside':return action.mode==='skip'?'不將場外卡移入移除區':
   action.mode==='all'?'將目前場外的可選卡全部移入移除區，不結算後續':'將 '+name()+' 移入移除區';
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
  case 'chooseTopTraitOutside':return action.uid===null?'不送場外，排列剩餘牌':'將符合特徵的 '+name()+' 送場外';
  case 'chooseOptionalDraw':return action.mode==='draw'?'攻擊時抽 1 張':'不抽牌';
  case 'chooseOptionalMill':return action.mode==='mill'?'將牌庫頂 1 張送場外':'不送場外';
  case 'choosePayApDeploy':return action.mode==='pay'?'支付 1 AP，接著選擇場外角色':'不支付 AP';
  case 'chooseOptionalPayAp':return action.mode==='pay'?'支付 1 AP，然後結算後續效果':'不支付 AP';
  case 'chooseHandRest':return action.uid===null?'不特殊登場':'免費 REST 登場 '+name()+suffix();
  case 'chooseActiveOwnNamed':return action.uid===null?'不將指定名稱角色轉為 ACTIVE':'將 '+name()+' 轉為 ACTIVE';
  case 'chooseActiveEnergyNamed':return action.uid===null?'不將能量線指定名稱卡轉為 ACTIVE':'將能量線的 '+name()+' 轉為 ACTIVE';
  case 'chooseHandRestOrRaid':return action.uid===null?'不從手牌登場':
   (action.mode==='raid'?'從手牌 Raid ':'從手牌 REST 登場 ')+name()+suffix();
   case 'chooseOutsideNameRest':return action.uid===null?'不從場外登場':'REST 登場 '+name()+suffix();
  case 'chooseTopFiltered':return action.uid===null?'不加入手牌，將其餘卡排列至底部':'加入手牌：'+name();
  case 'chooseTopHandOutside':return action.step==='outside'?'將 '+name()+' 送至場外':'將 '+name()+' 加入手牌';
  case 'chooseEnergyTraitFront':return action.uid===null?'不移動其餘能源線角色':'將 '+name()+' 移至前線 '+(action.slot+1);
  case 'chooseTopOrder':return '依序放回：'+name();
  case 'chooseRestFrontEnergy':return 'REST '+name()+'，本回合產能＋1';
  case 'chooseOwnBuff':case 'chooseMainBuff':case 'chooseTraitBuff':case 'chooseRestBp':
  case 'chooseRetireBp':case 'chooseTargetMany':return action.uid===null?'完成目標選擇':'選擇第 '+(state?.pending?.selected?.length+1||1)+' 個角色';
  case 'chooseFrontEnergyGrant':return action.uid===null?
   '不指定暫時 FRONT 產能對象':'讓 '+name()+' 本回合在前線也能產生能源';
  case 'chooseApTaxGrant':return action.uid===null?
   '不指定 AP 加價保護角色':'令 '+name()+' 於對手下一回合被卡牌效果指定時，對手須額外支付 1 AP';
  case 'chooseAttackBan':return action.uid===null?'不指定攻擊禁止對象':
   '令 '+name()+' 至下個己方回合開始前不能攻擊';
  case 'chooseGrantAttack':return '授予 '+name()+' 本回合攻擊時抽牌';
  case 'chooseGrantedDraw':return action.mode==='draw'?'使用獲得的攻擊時抽 1 張':'不抽牌';
  case 'chooseTarget':
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
