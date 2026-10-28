// Presentation-only adapters for the isolated V2 preview.
// NEVER generate or accept an action outside legalUniversalActions().
export const V2_PHASE_LABELS=Object.freeze({
 start:'開始／額外抽牌',move:'移動階段',main:'主要階段',attack:'攻擊階段'
});
export const V2_TITLE_LABELS=Object.freeze({
 bleach:'BLEACH', 'gurren-lagann':'天元突破',
 'solo-leveling':'我獨自升級',
 'sword-art-online':'刀劍神域',
 'mushoku-tensei':'無職轉生',
 rezero:'Re:Zero'
});
export const V2_PENDING_LABELS=Object.freeze({
 block:'選擇是否阻擋', 'life-trigger':'生命觸發',
 'life-batch-order':'選擇 LIFE／登場效果結算順序',
 'leave-replacement':'角色離場保護','private-top-choice':'查看牌庫頂','private-top-place':'選擇牌頂或牌底',
 'effect-recover-ap':'恢復 AP','effect-hand-top':'將 1 張手牌放到牌庫頂',
 'effect-grant-lose-ready':'給能源 0 的指定角色本回合落敗時 ACTIVE',
 'effect-trait-ban-move':'給有特徵的角色本回合不能攻擊，並移到另一條線',
 'effect-entry-rest-front':'將前線 ACTIVE 角色轉為 REST',
 'effect-retire-tuck-active':'可退場 1 張其他角色，裏向放在此角色下方並 ACTIVE','end-hand-limit':'手牌上限',
 'effect-discard':'選擇棄牌','effect-discard-cost':'支付棄牌成本',
 'effect-discard-gate':'是否支付棄牌成本',
 'effect-remove-outside':'可將己方場外卡移入移除區',
 'effect-remove-hand-scale':'可將任意張手牌中具有指定特徵的卡除外，再依張數提高敵方前線退場的 BP 上限',
 'effect-remove-hand-cap':'可將手牌中最多 3 張具有指定特徵的卡除外，再依張數提高強制退場的 BP 上限並抽等量牌',
 'effect-name-energy-reveal':'指定 1 個需求能源數值，再公開牌堆頂',
 'effect-revealed-energy-hand':'需求能源相符時，可將公開的卡加入手牌',
 'effect-mandatory-hand-remove':'將 1 張手牌除外',
 'effect-search-deck':'搜尋牌庫', 'effect-search-deck-multi':'依序搜尋牌庫',
 'effect-top-inspect':'查看牌庫頂','effect-top-inspect-many':'任意張卡送場外',
 'effect-top-filter-choice':'查看牌頂，選擇符合特徵的角色／卡',
 'effect-top-trait-event':'查看牌頂，公開王選候補者或事件',
 'effect-top-trait-outside':'查看牌頂，將符合特徵的卡送場外',
 'effect-top-order':'排列牌庫頂或底',
 'effect-optional-mill':'可將牌庫頂 1 張送場外',
 'effect-mill-up-to':'可將牌庫頂至多數張送場外',
 'effect-mill-recover-discard':'可棄 1 張手牌以回收剛才送出場外的卡',
 'effect-mill-recover':'從剛才送出場外的卡回收至多 1 張',
 'effect-grant-impact-null':'選擇至多 1 張其他己方角色，給予 IMPACT 無效',
 'effect-discard-up-to':'可將至多指定張手牌送場外，再抽同數',
 'effect-top-add-one':'查看牌頂，將其中 1 張加入手牌',
 'effect-distinct-trait-buff':'選擇不同卡名的己方角色',
 'effect-energy-mode':'選擇至下次己方回合開始的產能方式',
 'effect-may-then':'未被阻擋時，是否查看牌庫',
 'effect-max-bp-impact':'選擇己方角色，加上場上最高 BP 並獲得 IMPACT',
 'effect-outside-or-rest':'從場外加入手牌，或在能源足夠時 REST 登場',
 'effect-replay-base':'將突襲底板重新登場',
 'effect-named-energy':'選擇要增加產能的角色',
 'effect-active-one-ap':'選擇 1 張 AP 轉為 ACTIVE',
 'effect-mode-discard':'支付手牌以起動主要能力',
 'effect-outside-deck-top':'從場外將至多 1 張放回牌庫頂',
 'effect-outside-names':'從場外將至多 1 張指定卡名加入手牌',
 'effect-active-character':'選擇 1 張己方角色轉為 ACTIVE',
 'effect-top-hand-outside':'查看牌頂，1 張加入手牌、1 張送至場外',
 'effect-energy-trait-front':'可將能源線上具有指定特徵的角色移至前線',
 'effect-optional-draw':'攻擊時可抽 0 或 1 張',
 'effect-optional-tuck-under':'可將牌庫頂 1 張蓋到此角色下方',
 'effect-facedown-outside':'選擇 1 張蓋牌放到場外',
 'effect-may-draw':'可抽1張牌',
 'effect-removed-name-outside':'將除外區的指定名稱卡送至場外',
 'effect-hand-front-active':'以 Active 登場於前線',
 'effect-front-retire-look':'使自己場上另1個角色退場',
 'effect-top-hand-one':'將查看的1張加入手牌',
 'effect-remove-own-other':'將自己場上另1個角色除外',
 'effect-retire-other-front-name':'可將自己場上另1個角色退場',
 'effect-buff-other-trait':'選擇其他己方角色',
 'effect-retire-life-or-hand':'退場時最多選一項',
 'effect-hidden-life-hand':'將1張生命加入手牌',
 'effect-rest-reenter':'以 Rest 重新登場',
 'effect-hand-two-outside':'將2張手牌送至場外',
 'effect-pay-ap-deploy':'可支付 1 AP，從場外 REST 登場',
 'effect-optional-pay-ap':'可支付 1 AP，然後結算後續效果',
 'effect-deck-named-play':'公開的卡片可加入手牌、休息登場或突襲',
 'effect-remove-hand':'可將手牌中1張具有指定特徵的卡除外',
 'effect-place-hand':'將1張手牌放到牌頂或場外',
 'effect-hand-rest':'從己方手牌免費 REST 登場',
 'effect-hand-rest-cap':'從手牌將符合條件的卡以 Rest 登場',
 'effect-hand-rest-or-raid':'從己方手牌 REST 登場或合法 Raid',
 'effect-active-own-named':'可將最多 1 個己方指定名稱角色轉為 ACTIVE',
 'effect-active-energy-named':'可將最多 1 張己方能量線指定名稱卡轉為 ACTIVE',
 'effect-bounce-own':'選擇返回手牌的己方角色',
 'effect-buff-own':'選擇己方角色增加本回合 BP',
 'effect-buff-either':'選擇自己或對手的其他角色，本回合 BP+1000',
 'effect-return-printed':'可將符合印刷條件的己方角色放回手牌',
 'effect-remove-named':'可將場外的指定卡移入移除區',
 'effect-pay-named':'可棄 1 張手牌或休息 1 張前線，以回收場外的指定卡',
 'effect-add-named':'將場外的指定卡加入手牌',
 'effect-reveal-bottom':'公開 1 張手牌並放到牌底',
 'effect-hand-top':'將 1 張手牌放到牌組上面',
 'effect-rest-front-ap':'可休息 1 張前線活動角色，之後恢復 AP',
 'effect-discard-active':'可將 1 張手牌放到場外，使這張場域活動',
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
 'effect-active-traitless':'可將另 1 個沒有特徵的角色改為 ACTIVE',
 'effect-active-other-trait':'選另 1 個指定特徵的角色改為 ACTIVE',
 'effect-raid-base-rest':'可將突襲底卡以 Rest 登場',
 'effect-name-or-trait-protect':'可讓 1 個指定名稱或特徵角色不被對方效果選擇',
 'effect-sacrifice-named':'可退場另 1 個指定名稱角色',
 'recovered-self-entry':'回收後可 REST 登場至能源線',
 'effect-recover-outside':'從場外回收','effect-retire-bp':'選擇敵方退場',
 'effect-retire-at-least':'選擇 BP 4500 以上的對手前線並使其退場',
 'effect-retire-at-most':'選擇 BP 5000 以下的對手前線並使其退場',
 'effect-retire-scaled':'選擇是否使對手前線退場',
 'effect-rest-outside-events':'選擇是否使對手前線休息',
 'effect-rested-retire-impact':'選擇是否使對手前線退場',
 'effect-hand-named-rest':'選擇是否以休息狀態登場',
 'effect-outside-printed-rest':'選擇是否以休息狀態登場',
 'effect-grant-printed-block':'選擇是否賦予防禦下限',
 'effect-move-opp-front':'選擇是否將對手前線移至能源線',
 'effect-unblocked-rest':'選擇是否使對手前線休息',
 'effect-energy-swap':'選擇要交換位置的己方前線',
 'effect-grant-named-impact':'選擇是否賦予衝擊',
 'effect-hand-bp-may':'這次參照手牌角色 BP 時，是否視為 +1000',
 'effect-hand-outside-active':'可將 1 張手牌放到場外，使這張角色活動',
 'effect-named-duration':'選擇最多 1 張帕克，給予 BP+2000 與衝擊 1',
 'effect-top-take-one':'從查看的牌中選 1 張加入手牌，其餘放到場外',
 'effect-reveal-optional':'可公開 1 張手牌並放到牌底',
 'effect-referenced-bp':'這次參照公開角色的 BP 時，是否視為增加',
 'effect-outside-referenced':'從場外選擇符合公開 BP 的藍色角色',
 'effect-reveal-retire':'公開 1 張手牌並放到牌底',
 'effect-retire-referenced':'可選擇公開 BP 以下的對手前線並使其退場',
 'effect-hand-block':'將 1 張手牌放到場外，本回合不被 BP4000 以上的角色阻擋',
 'effect-substitute-retire':'可改由前線的拉姆代替雷姆退場',
 'effect-outside-printed-active':'可讓場外能源 0 的藍色菜月昴以活動狀態登場',
 'effect-bounce-include-self':'可將 1 張自己場上的角色放回手牌',
 'effect-outside-rest-or-raid':'可讓場外的藍色菜月昴休息登場或突襲',
 'effect-grant-bounce-instead':'可指定 1 張菜月昴，對手效果退場時改回手牌',
 'effect-remove-opp-field':'選擇 1 張對手場上角色，放入移除區',
 'effect-hand-reenter-under':'可將 1 張手牌放到場外，讓菜月昴休息回到前線',
 'effect-hand-deploy-may':'這次參照手牌角色 BP 時，是否視為 +1000 並休息登場',
 'effect-hand-rest-entry':'選擇休息登場的位置',
 'effect-active-other':'選擇最多 1 張其他己方角色並使其活動',
 'effect-rest-own-front-draw':'選擇 1 張自己的活動前線角色並使其休息',
 'effect-raid-source-rest':'選擇是否將突襲來源以休息狀態登場',
 'effect-rest-or-retire':'選擇 1 張 BP 5000 以下的對手前線',
 'effect-retire-own-trait':'可退場 1 個己方指定特徵角色',
 'effect-retire-missing-trait':'使 1 個不具有指定特徵的己方角色退場',
 'effect-outside-color-trait-active':'可從場外將 1 張指定顏色與特徵的角色以 ACTIVE 登場',
 'effect-named-field-protect':'可選最多 1 個己方場上指定名稱角色，直到下一個己方回合開始前不受敵方角色或 Trigger 效果選擇',
 'effect-rest-ap-lock':'可選最多 1 個敵方前線角色轉為 REST；己方回合且己方前線有原始 AP 達標時，直到此角色離開前線前不能轉為 ACTIVE',
 'effect-outside-active-pair':'可從場外將符合條件的角色以 ACTIVE 登場',
 'effect-top-trait-hand':'查看牌頂，符合特徵可加入手牌，否則放回牌頂或場外',
 'effect-active-any':'可將 1 張己方場上卡改為 ACTIVE',
 'effect-grant-front-energy':'讓另一張己方前線指定特徵角色本回合也能產生能源',
 'effect-rest-bp':'選擇敵方 REST','effect-grant-ap-tax':'讓另一張己方 DFN 角色獲得指定時的 AP 加價保護','effect-attack-ban':'指定禁止攻擊的對手前線角色','effect-printed-lock':'可選 1 個對方前線角色，到自己下次回合開始前失去原有效果且不能攻擊或阻擋','effect-name-hand-remove':'將 1 張手牌除外',
 'effect-required-energy':'選自己場上另1個角色，本回合其所需能量增加2',
 'effect-buff-trait':'選擇己方 BP 加成',
 'main-two-buff':'主要能力選擇 BP 對象',
 'main-discard-buff':'支付一張手牌，讓自身 BP 增加',
 'main-active-named':'選擇指定卡名的己方角色並轉為 ACTIVE',
 'effect-grant-attack':'授予己方角色攻擊時能力','granted-attack-draw':'攻擊時是否抽一張',
 'effect-grant-opp-block':'對手選擇一名角色，本回合不被高 BP 阻擋',
 'effect-deploy-outside':'從場外選擇角色登場',
 'effect-energy-skip-swap':'能源線與下次不 ACTIVE 的前線角色交換',
 'effect-energy-trait-swap':'能源線與前線指定特徵角色交換',
 'effect-active-lines':'選擇己方前線或能源線的指定特徵角色 ACTIVE',
 'effect-active-skip-pair':'選擇下次不 ACTIVE 的前線角色並執行 ACTIVE',
 'effect-pay-hand-outside':'將 1 張手牌送至場外',
 'effect-play-outside-event':'可從場外支付 AP 使用指定事件',
 'effect-release-facedown':'可將 1 張裏向卡送至場外',
 'effect-outside-cost-hand':'棄一張指定特徵手牌，將場外的此卡加入手牌',
 'effect-attack-aid':'攻擊時可 REST 並選擇一項協助',
 'effect-attack-aid-grant':'選擇本次攻擊的協助對象',
 'effect-tuck-damage':'將牌庫頂裏向放在指定角色下並使傷害+1',
 'effect-active-own-trait':'選擇己方指定特徵角色轉為 ACTIVE',
 'effect-tuck-hand-under':'抽牌後將1張手牌裏向放在此角色下方',
 'effect-chain-raid-facedown':'可支付裏向卡，準備再次 Raid',
 'effect-chain-raid-hand':'可從手牌再 Raid 於原底板',
 'effect-chain-discard':'支付1AP後將1張手牌送場外',
 'effect-outside-named-raid':'可從場外 Raid 符合條件的角色',
 'effect-target':'指定角色',
 'effect-target-many':'最多選擇兩名不同敵方角色',
 'raid-effect-order':'突襲能力結算順序',
 'effect-mark-opp-start':'可選 1 個敵方前線角色，下一個敵方回合開始時退場',
 'effect-move-order':'選擇同時取得的移動觸發處理順序',
 'effect-rest-tuck':'是否 REST 角色，放置剛送至場外的手牌',
 'effect-tuck-moved':'可將該場外卡裏向放在自身下方',
 'opening-mulligan':'開局手牌調度（每人最多一次）',
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
  case 'openingMulligan':return action.mode==='redraw'?'整手重抽 7 張（僅一次）':'保留這 7 張手牌';
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
  case 'activateRemoved':return '起動移除區主要：本回合產生能源變為 2 倍';
  case 'activate':return action.mode==='front'?
    '起動主要：前線也能產生能源':
    action.mode==='ready20'?'起動主要：將 1 張己方角色轉為 ACTIVE':
    action.mode==='line'?'起動主要：棄 1 張手牌，本回合可從能源線攻擊':
    action.mode==='namedEnergyAp'?
    '起動主要：指定西蒙，本回合產能增加並 ACTIVE 1 張 AP':
    action.mode==='active'?'起動主要：棄 1 張手牌，使此角色 ACTIVE':
    action.mode==='energy'?'起動主要：REST 此角色，本回合產能＋1':
    action.mode==='bp'?'起動主要：棄 1 張手牌，本回合 BP＋1000':
    action.mode==='revealBottomBuff'?
   '起動主要：公開 1 張手牌放到牌底':
    action.mode==='outsideTraitHand'?
    '起動主要：從場外棄一張指定特徵手牌，將此卡加入手牌':
    action.mode==='discardSelfBuff'?
    '起動主要：棄一張手牌，本回合自身 BP＋1500（每回合一次）':
    action.mode==='selfRestEnergyRetire'?
    (pack?.cards&&state?.players?.some(p=>[...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.end==='hand'))
     ?'起動主要：REST 自身，產能＋1，主要階段結束回手'
     :'起動主要：REST 自身，產能＋1，主要階段結束退場'):
    action.mode==='selfRestThen'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.then?.[0]?.op==='drawHandTop'))
     ?'起動主要：休息這張場域，抽 1 張並將 1 張手牌放到牌組上面':
    action.mode==='selfRestThen'?'主要能力：REST 自身，執行效果':
    action.mode==='selfRestBuff'?'主要能力：REST 自身，指定另一張己方角色本回合 BP 加成':
    action.mode==='restRetireTrait'?'主要能力：REST 並退場自己，從場外回收 1 張指定特徵卡':
    action.mode==='gunmenModes'?('主要能力：依顏面張數選擇不同效果：'+
     (action.effects||[]).map(effect=>({bp:'本回合 BP＋1000',
      impactNull:'下次己方回合開始前 IMPACT 無效',
      doubleBlock:'下次己方回合開始前可再阻擋'}[effect]||effect)).join('、')):
    action.mode==='selfRestBuffHand'?'起動主要：REST 自身，指定另一張己方角色 BP＋1000，自身回手':
    action.mode==='restRetireNamed'?'起動主要：REST 並退場，從場外回收指定名稱':
    action.mode==='restTraitBuff'?'起動主要：REST 場域，己方指定特徵本回合 BP 加成':
    action.mode==='payApDrawEnergy'?'起動主要：支付 1 AP，抽 1 張，本回合產能＋1':
    action.mode==='restFrontGainEnergy'?'起動主要：REST 自身，再 REST 一張己方前線，本回合產能＋1':
    action.mode==='selfRestEnemy'?'主要能力：REST 自身，指定敵方前線角色':
    action.mode==='frontOnce'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.then?.[0]?.op==='handTopBuffSelf'))
     ?'起動主要：將 1 張手牌放到牌組上面，本回合 BP+1000':
    action.mode==='frontOnce'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.then?.[0]?.op==='discountNextNamedHandEnergy'))
     ?'起動主要：下一張從手牌使用的愛蜜莉雅，能源需求減少紫 1':
    action.mode==='frontOnce'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.requireOwnEffectRest===true))
     ?'起動主要：將這張角色置為活動，直到下一個我方回合開始前 BP+1000':
    action.mode==='frontOnce'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.then?.[0]?.op==='activeSelf'))
     ?'起動主要：將這張角色置為活動':
    action.mode==='frontOnce'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.then?.[0]?.op==='buffEitherField'))
     ?'起動主要：選擇最多 1 張場上角色，本回合 BP+1000':
    action.mode==='restLeaveReveal'?'起動主要：休息並退場，公開 1 張手牌放到牌底':
    action.mode==='handBlock'?'起動主要：將 1 張手牌放到場外，本回合不被 BP4000 以上的角色阻擋':
    action.mode==='energySwap'?'起動主要：與 1 張己方前線角色交換位置':
    action.mode==='ready'?'主要能力：ACTIVE':
    action.mode==='restTuckDamage'?
    '起動主要：REST 自身，將牌庫頂裏向放在指定角色下並使直接傷害變為 2':
    action.mode==='fieldMill'?'起動主要：REST 場域，將牌庫頂 1 張送場外':
    action.mode==='fieldOutsideEvent'?'起動主要：REST 場域，將手牌 1 張送場外後可使用場外事件':
    action.mode==='fieldTuck'?'起動主要：REST 場域，將牌庫頂 1 張裏向放在此卡下':
    action.mode==='fieldRelease'?'起動主要：REST 場域，將手牌 1 張送場外後可放出裏向卡':
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
  case 'chooseActiveTraitless':return action.uid===null?'不改為 ACTIVE':'將 '+name()+' 改為 ACTIVE';
  case 'chooseActiveOtherTrait':return '將 '+name()+' 改為 ACTIVE';
  case 'chooseRaidBaseRest':
   if(state?.pending?.kind==='effect-raid-source-rest')
    return action.uid===null?'不使突襲來源登場':
     '將 '+name()+' 以休息狀態放到'+destination()+' '+(action.slot+1);
   return action.uid===null?'不將突襲底卡以 Rest 登場':'將 '+name()+' 以 Rest 登場'+suffix();
  case 'chooseNameOrTraitProtect':return action.uid===null?'不賦予選擇保護':'令 '+name()+' 不被對方效果選擇';
  case 'chooseNamedKeyword':return action.uid===null?'不賦予指定名稱角色':'選擇 '+name();
  case 'chooseKeywordMode':return action.mode==='impact'?'本回合 Impact +1':'本回合直接攻擊傷害 +1';
  case 'chooseNamedImpact':
   if(state?.pending?.impactPlus!==undefined)
    return '選擇 '+name()+'，本回合 BP+1000 並獲得衝擊+1';
   return action.uid===null?'不賦予 BP 與 Impact':'賦予 '+name()+' 本回合 BP 與 Impact';
  case 'chooseNamedRestReady':return action.uid===null?'不橫置指定角色':'橫置 '+name()+'，然後啟動 1 張 AP 卡';
  case 'chooseEqualBpPair':return '退場 BP 相同的 '+name();
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
  case 'chooseLoseBattleReady':return action.uid===null?
   '不給予落敗時 ACTIVE':'給 '+name()+' 本回合落敗時 ACTIVE';
  case 'chooseTraitBanMove':return action.uid===null?
   '不選擇角色':'使 '+name()+' 本回合不能攻擊並換線';
  case 'chooseEntryRest':return '將 '+name()+' 轉為 REST';
  case 'chooseRetireTuck':return action.uid===null?
   '不退場其他角色':'退場 '+name()+'，裏向放在此角色下方並 ACTIVE';
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
  case 'chooseRecoveredEntry':
   if(action.mode==='skip')return '保留在手牌';
   return '回收後以 '+(state?.pending?.ready===true?'ACTIVE':'REST')+
    ' 登場至'+(action.line==='front'?'前線':'能源線')+' '+(action.slot+1);
  case 'chooseOwnBounce':return '將 '+name()+' 返回手牌';
  case 'chooseDeckSearch':case 'chooseDeckSearchMulti':
   return action.uid===null?'結束搜尋':'將 '+name()+' 加入手牌';
  case 'chooseInspectedOutside':return action.uid===null?'完成選擇並排列剩餘牌':'將 '+name()+' 送場外';
  case 'chooseTopTraitOutside':return action.uid===null?'不送場外，排列剩餘牌':'將符合特徵的 '+name()+' 送場外';
  case 'chooseOptionalDraw':return action.mode==='draw'?'攻擊時抽 1 張':'不抽牌';
  case 'chooseOptionalTuck':return action.mode==='tuck'?'將牌庫頂 1 張蓋到此角色下方':'不蓋牌';
  case 'chooseFacedownOutside':return '將蓋牌放到場外：'+name();
  case 'reorderUnder':return '調整蓋牌順序';
  case 'chooseMayDraw':return action.mode==='draw'?'抽1張':'不抽牌';
  case 'chooseRemovedOutside':return action.mode==='all'?'將符合名稱的除外卡全部送至場外':
   action.mode==='done'?'完成送至場外':'將 '+name()+' 送至場外';
  case 'chooseHandFrontActive':return '以 Active 登場於前線 '+(action.slot+1);
  case 'chooseRetireLifeOrHand':return action.mode==='skip'?'不選任何退場項目':
   action.mode==='life'?'將1張生命加入手牌':'將2張手牌送至場外';
  case 'chooseHiddenLifeHand':return '將1張生命加入手牌';
  case 'chooseRestReenter':return '以 Rest 登場於'+(action.line==='energy'?'能源線':'前線')+' '+(action.slot+1);
  case 'chooseHandTwoOutside':return '將手牌送至場外';
  case 'chooseOptionalMill':return action.mode==='mill'?'將牌庫頂 1 張送場外':'不送場外';
  case 'chooseMillUpTo':return action.mode==='mill'?'再將牌庫頂 1 張送場外':'停止送場外';
  case 'chooseMillDiscard':return action.uid===null?'不棄手牌，不回收':'棄掉 '+name()+'，接著回收';
  case 'chooseMillRecover':return action.uid===null?'不回收':'回收 '+name()+' 到手牌';
  case 'chooseImpactNullGrant':return action.uid===null?'不給予 IMPACT 無效':'給予 '+name()+' IMPACT 無效';
  case 'chooseDiscardUpTo':return action.uid===null?'停止棄牌並抽同數':'將 '+name()+' 送場外';
  case 'chooseTopAddOne':return '將 '+name()+' 加入手牌，其餘送場外';
  case 'chooseDistinctTrait':return action.uid===null?'結束選擇並結算 BP':'選擇 '+name();
  case 'chooseEnergyMode':return action.mode==='plus'?'產生能源 +1':'前線也能產生能源';
  case 'chooseMayThen':return action.mode==='do'?'查看牌庫頂':'不查看';
  case 'chooseMaxBpImpact':return '讓 '+name()+' 加上場上最高 BP 並獲得 IMPACT';
  case 'chooseOutsideDeckTop':return action.uid===null?'不放回牌庫頂':'放到牌庫頂：'+name();
  case 'chooseOutsideName':return action.uid===null?'不加入手牌':'加入手牌：'+name();
  case 'chooseActiveCharacter':return '使 '+name()+' ACTIVE';
  case 'chooseOutsideOrRest':return action.mode==='skip'?'不回收':
   action.mode==='hand'?'將 '+name()+' 加入手牌':'REST 登場 '+name()+suffix();
  case 'chooseReplayBase':return action.mode==='skip'?'不將底板重新登場':
   (action.mode==='active'?'ACTIVE 登場底板':'REST 登場底板')+suffix();
  case 'chooseNamedEnergy':return '讓 '+name()+' 本回合產能增加';
  case 'chooseActiveAp':return '將此 AP 轉為 ACTIVE';
  case 'chooseModeDiscard':return '支付 '+name();
  case 'choosePayApDeploy':return action.mode==='pay'?'支付 1 AP，接著選擇場外角色':'不支付 AP';
  case 'chooseOptionalPayAp':return action.mode==='pay'?'支付 1 AP，然後結算後續效果':'不支付 AP';
  case 'chooseDeckNamedPlay':return action.mode==='hand'?'將公開的卡片加入手牌':
   action.mode==='raid'?'以突襲登場：'+name()+suffix():'以休息狀態登場：'+name()+suffix();
  case 'choosePlaceHand':return action.mode==='deck'?
   '將 '+name()+' 放到牌組上面':'將 '+name()+' 放到場外';
  case 'chooseRemoveHand':return action.uid===null?'不除外':'將 '+name()+' 除外';
  case 'chooseRetireOtherFrontName':return action.uid===null?'不退場':'使 '+name()+' 退場';
  case 'chooseHandRest':return action.uid===null?'不特殊登場':'免費 REST 登場 '+name()+suffix();
  case 'chooseHandRestCap':return action.uid===null?'不以 Rest 登場':'以 Rest 登場 '+name()+suffix();
  case 'chooseActiveOwnNamed':return action.uid===null?'不將指定名稱角色轉為 ACTIVE':'將 '+name()+' 轉為 ACTIVE';
  case 'chooseActiveEnergyNamed':return action.uid===null?'不將能量線指定名稱卡轉為 ACTIVE':'將能量線的 '+name()+' 轉為 ACTIVE';
  case 'chooseHandRestOrRaid':return action.uid===null?'不從手牌登場':
   (action.mode==='raid'?'從手牌 Raid ':'從手牌 REST 登場 ')+name()+suffix();
   case 'chooseOutsideNameRest':return action.uid===null?'不從場外登場':'REST 登場 '+name()+suffix();
  case 'chooseTopFiltered':return action.uid===null?'不加入手牌，將其餘卡排列至底部':'加入手牌：'+name();
  case 'chooseTopTraitEvent':return action.uid===null?'不加入手牌，將其餘卡排列至底部':'公開 '+name()+' 並加入手牌';
  case 'chooseTopOrder':return '依序放回：'+name();
  case 'chooseRestFrontEnergy':return 'REST '+name()+'，本回合產能＋1';
  case 'chooseFacedownFront':return action.mode==='skip'?'不從能源線移到前線':
   '從能源線移到前線 '+(action.slot+1)+(action.replaceUid?'，並將原前線卡除外':'')+'，本回合 BP＋1000';
  case 'chooseEitherBuff':return action.uid===null?
   (state?.pending?.includeSelf?'不指定角色':'不指定其他角色'):'選擇 '+name()+'，本回合 BP+1000';
  case 'chooseHandOutsideActive':return action.uid===null?'不將手牌放到場外':
   '將 '+name()+' 放到場外，並使這張角色活動';
  case 'chooseNamedDuration':return action.uid===null?'不指定帕克':
   '選擇 '+name()+'，給予 BP+2000 與衝擊 1';
  case 'chooseTopTakeOne':return '將 '+name()+' 加入手牌，其餘放到場外';
  case 'chooseRevealOptional':return action.uid===null?'不公開手牌':'公開 '+name()+' 並放到牌底';
  case 'chooseReferencedBp':return action.mode==='accept'?'視為 BP 增加':'維持原本 BP';
  case 'chooseOutsideReferenced':return action.mode==='hand'?'將 '+name()+' 加入手牌':
   '使 '+name()+' 以休息狀態登場';
  case 'chooseRevealRetire':return '公開 '+name()+' 並放到牌底';
  case 'chooseRetireReferenced':return action.uid===null?'不使角色退場':'使 '+name()+' 退場';
  case 'chooseHandBlock':return '將 '+name()+' 放到場外';
  case 'chooseSubstituteRetire':return action.uid===null?'不代替，讓原本的角色退場':
   '改由 '+name()+' 退場';
  case 'chooseOutsidePrintedActive':return action.uid===null?'不登場':
   '使 '+name()+' 以活動狀態登場';
  case 'chooseBounceIncludeSelf':return action.uid===null?'不放回手牌':
   '將 '+name()+' 放回手牌';
  case 'chooseOutsideRestOrRaid':return action.uid===null?'不登場':
   (action.mode==='raid'?'以突襲登場：':'以休息狀態登場：')+name();
  case 'chooseGrantBounceInstead':return action.uid===null?'不指定菜月昴':
   '指定 '+name()+'，直到下一次自己的回合開始';
  case 'chooseHandReenterUnder':return action.uid===null?'不將手牌放到場外':
   '將 '+name()+' 放到場外，並讓這張角色休息回到前線';
  case 'chooseReturnPrinted':return action.uid===null?'不放回手牌':'將 '+name()+' 放回手牌，並使這張角色活動且本回合 BP 增加';
  case 'chooseRemoveNamed':return action.uid===null?'不移入移除區':'將 '+name()+' 移入移除區，並使這張角色活動';
  case 'choosePayNamed':return action.mode==='skip'?'不支付，不回收':
   action.mode==='hand'?'將 '+name()+' 放到場外，並回收指定卡':
   '休息 '+name()+'，並回收指定卡';
  case 'chooseAddNamed':return '將 '+name()+' 加入手牌';
  case 'chooseRevealBottom':return '公開 '+name()+' 並放到牌底';
  case 'chooseHandTop':return '將 '+name()+' 放到牌組上面';
  case 'chooseRestFrontAp':return action.uid===null?'不休息前線':'休息 '+name()+'，之後可恢復 1 張 AP';
  case 'chooseDiscardActive':return action.uid===null?'不棄牌，場域維持休息':
   '將 '+name()+' 放到場外，並使這張場域活動';
  case 'chooseTopHandOutside':return action.step==='outside'?'將 '+name()+' 送至場外':'將 '+name()+' 加入手牌';
  case 'chooseEnergyTraitFront':return action.uid===null?'不移動其餘能源線角色':'將 '+name()+' 移至前線 '+(action.slot+1);
  case 'chooseRemoveHandCap':return action.mode==='done'?'結束除外並退場':'將 '+name()+' 除外';
  case 'chooseNamedRequiredEnergy':return '指定需求能源 '+action.value;
  case 'chooseRevealedEnergyHand':return action.mode==='hand'?'將公開的卡加入手牌':'將公開的卡放回牌堆頂';
  case 'chooseMandatoryHandRemove':return '將 '+name()+' 除外';
  case 'chooseRequiredEnergy':return '本回合所需能量 +2：'+name();
  case 'chooseOwnBuff':case 'chooseMainBuff':case 'chooseTraitBuff':case 'chooseRestBp':
  case 'chooseRetireAtMost':return '使 '+name()+' 退場';
  case 'chooseRetireAtLeast':case 'chooseRetireScaled':return action.uid===null?'不使角色退場':'使 '+name()+' 退場';
  case 'chooseRestOutsideEvents':return action.uid===null?'不使角色休息':'使 '+name()+' 休息';
  case 'chooseRestedRetire':return action.uid===null?'不使角色退場':'使 '+name()+' 退場';
  case 'chooseHandNamedRest':return action.uid===null?'不登場':'使 '+name()+' 以休息狀態登場';
  case 'chooseOutsidePrintedRest':return action.uid===null?'不登場':'使 '+name()+' 以休息狀態登場';
  case 'chooseGrantPrintedBlock':return action.uid===null?'不賦予防禦下限':'使 '+name()+' 不會被 BP4000 以上的角色阻擋';
  case 'chooseMoveOppFront':return action.uid===null?'不移動':'將 '+name()+' 移至能源線';
  case 'chooseUnblockedRest':return action.uid===null?'不使角色休息':'使 '+name()+' 休息';
  case 'chooseRemoveOppField':return '將 '+name()+' 放入移除區';
  case 'chooseEnergySwap':return '與 '+name()+' 交換位置';
  case 'chooseGrantNamedImpact':return action.uid===null?'不賦予衝擊':'使 '+name()+' 獲得衝擊 1';
  case 'chooseHandBpMay':return action.mode==='accept'?'視為 BP+1000':'維持原本 BP';
  case 'handActivate':return '支付 1 AP，公開這張手牌';
  case 'chooseHandDeployMay':return action.mode==='accept'?'視為 BP+1000 並休息登場':'維持原本 BP，留在手牌';
  case 'chooseHandRestEntry':return '休息登場';
  case 'chooseActiveOther':return action.uid===null?'不使其他角色活動':'使 '+name()+' 活動';
  case 'chooseRestOwnFrontDraw':return '休息 '+name()+'，然後抽 1 張';
  case 'chooseRestOrRetire':return state?.pending?.mode==='retire'?'使 '+name()+' 退場':'使 '+name()+' 休息';
  case 'chooseRetireBp':case 'chooseTargetMany':return action.uid===null?'完成目標選擇':'選擇第 '+(state?.pending?.selected?.length+1||1)+' 個角色';
  case 'chooseFrontEnergyGrant':return action.uid===null?
   '不指定暫時 FRONT 產能對象':'讓 '+name()+' 本回合在前線也能產生能源';
  case 'chooseApTaxGrant':return action.uid===null?
   '不指定 AP 加價保護角色':'令 '+name()+' 於對手下一回合被卡牌效果指定時，對手須額外支付 1 AP';
  case 'chooseAttackBan':return action.uid===null?'不指定攻擊禁止對象':
   '令 '+name()+' 至下個己方回合開始前不能攻擊';
  case 'chooseGrantAttack':return '授予 '+name()+' 本回合攻擊時抽牌';
  case 'chooseOppBlock':return action.uid===null?'不賦予阻擋限制':'讓 '+name()+' 本回合不被 BP 以上角色阻擋';
  case 'chooseDeployOutside':return action.uid===null?'不從場外登場':'從場外登場 '+name()+suffix();
  case 'chooseEnergySkipSwap':return action.uid===null?'不交換位置':'與 '+name()+' 交換前線與能源線';
  case 'chooseEnergyTraitSwap':return action.uid===null?'不與這張能源角色交換':'與 '+name()+' 交換前線與能源線';
  case 'chooseActiveLines':return action.uid===null?'不 ACTIVE 這條線的角色':'將 '+name()+' 轉為 ACTIVE';
  case 'chooseActiveSkipPair':return action.uid===null?'只對自身執行 ACTIVE':'對 '+name()+' 與自身執行 ACTIVE';
  case 'choosePayHandOutside':return '將 '+name()+' 送至場外';
  case 'choosePlayOutsideEvent':return action.uid===null?'不使用場外事件':'支付 AP 使用 '+name();
  case 'chooseReleaseFacedown':return action.uid===null?'不放出裏向卡':'將裏向的 '+name()+' 送至場外';
  case 'chooseOutsideCostHand':return '棄 '+name()+'，將場外的此卡加入手牌';
  case 'chooseAttackAid':return action.mode==='skip'?'不協助':
   (state?.pending?.options?.find(o=>o.id===action.mode)?.label||'選擇協助');
  case 'chooseAttackAidGrant':return action.uid===null?'不指定本次攻擊的協助對象':'協助 '+name();
  case 'chooseTuckDamage':return '將牌庫頂裏向放在 '+name()+' 下方';
  case 'chooseActiveOwnTrait':return action.uid===null?'不將角色轉為 ACTIVE':'將 '+name()+' 轉為 ACTIVE';
  case 'chooseTuckHand':return '將 '+name()+' 裏向放在此角色下方';
  case 'chooseChainFacedown':return action.uid===null?'不支付裏向卡':'支付裏向卡 '+name();
  case 'chooseChainRaid':return action.uid===null?'只送走頂卡，不再 Raid':'從手牌再 Raid '+name();
  case 'chooseChainDiscard':return '將 '+name()+' 送場外';
  case 'chooseOutsideRaid':return action.uid===null?'不從場外 Raid':'從場外 Raid '+name()+suffix();
  case 'chooseGrantedDraw':return action.mode==='draw'?'使用獲得的攻擊時抽 1 張':'不抽牌';
  case 'chooseTarget':
   return action.uid===null?'不指定／完成':'指定 '+name();
  case 'chooseRaidWitness':return action.when==='now'?'先結算突襲見證':
   action.when==='later'?'稍後結算突襲見證':'不使用突襲見證';
  case 'chooseRaidAttach':return action.uid===null?'不放入突襲角色下':'將 '+name()+' 裏向放在突襲角色下';
  case 'chooseRaidWitnessMove':return action.mode==='move'?'把此卡裏向放在突襲角色下':'不移動此卡';
  case 'chooseLookTake':return action.uid===null?'不加入手牌':'加入手牌：'+name();
  case 'chooseLookOrder':return '依序放回牌庫底：'+name();
  case 'chooseDiscardPay':return action.uid===null?(action.mode==='activeAp'?'ACTIVE 1 張 AP':
   action.mode==='retire'?'改為退場敵方前線':'停止棄牌'):'棄掉 '+name();
  case 'chooseFacedownScale':return (action.retireUid?'退場 1 張敵方前線':'不退場')+
   (action.activeAp?'，並 ACTIVE 1 張 AP':'');
  case 'chooseSpendFacedown':return action.uids?.length?'送出 2 張裏向卡'+(action.targetUid?'並退場敵方前線':'') :'不送出裏向卡';
  case 'chooseAbsorbFront':return action.uids?.length?'把所選前線角色裏向放在自己下':'不吸收前線角色';
  case 'chooseSimonLow':return action.mode==='recover'?(action.uid===null?'不回收西蒙':'回收 '+name()):
   (action.uid===null?'不讓西蒙登場':'ACTIVE 登場 '+name());
  case 'chooseReplayEntry':return action.uid===null?'不重新發動登場效果':'重新發動 '+name()+' 的登場效果';
  case 'chooseAttackEndRaid':return action.uid===null?'不在攻擊結束時突襲':'從手牌突襲 '+name();
  case 'chooseRetireCapture':return action.uid===null?'不將退場角色放在場域下':'把退場角色裏向放在此場域下';
  default:return '執行 '+action.type;
 }
}
export function visibleActionsForCard(legal,uid){
 return legal.filter(a=>a.uid===uid||a.baseUid===uid);
}
export function uiActionGroup(action){
 if(action.type==='next'||action.type==='extraDraw')return 'phase';
 if(['play','raid','event','move','step','attack','activate','handActivate','card','reorderUnder'].includes(action.type))return 'card';
 return 'pending';
}
// Display data for a controller-only pending choice. Copies printed identity
// fields only; the legal action object is never decorated or rewritten.
export function pendingChoiceCards(option){
 if(!option||typeof option!=='object')return [];
 const listed=Array.isArray(option.cards)?option.cards:[];
 const source=listed.length?listed:(option.card?[option.card]:[]);
 const cards=[];
 for(const card of source){
  if(!card||typeof card.cardId!=='string'||!card.cardId)continue;
  cards.push({
   cardId:card.cardId,
   name:typeof card.name==='string'&&card.name?card.name:card.cardId,
   color:typeof card.color==='string'?card.color:''
  });
 }
 return cards;
}
export function pendingChoiceCaption(label,names){
 const clean=String(label||'').replace(/\s+/g,' ').trim();
 if(!clean||!Array.isArray(names)||!names.length)return '';
 let text=clean;
 for(const name of names){
  if(typeof name!=='string'||!name)continue;
  text=text.split(name).join(' ');
 }
 text=text.replace(/[|｜]+/g,' ').replace(/\s+/g,' ')
  .replace(/^[\s·:：,，、\-]+|[\s·:：,，、\-]+$/g,'').trim();
 // Keep the full instruction when it does not repeat the printed name,
 // so top/bottom or hand/outside modes stay distinguishable.
 return text&&text!==clean?text:clean;
}
function publicZoneCard(state,uid){
 if(!uid||!state?.players)return null;
 for(const pl of state.players){
  for(const pile of [pl.front,pl.energy,pl.outside,pl.lifeRevealed]){
   const physical=(pile||[]).find(c=>c?.uid===uid);
   if(physical)return physical;
  }
 }
 return null;
}
function publicZoneName(pack,state,uid){
 const physical=publicZoneCard(state,uid);
 if(!physical)return '';
 const owner=Number(String(uid).split('-')[0]);
 const source=Array.isArray(pack)?pack[owner]:pack;
 return source?.cards?.[physical.cardId]?.name||physical.cardId;
}
// Spectator-safe sentence for a life or hand trigger decision.
// The trigger card is named only from revealed life or outside.
// A COLOR play is named only after that card is on a public zone.
export function publicLifeTriggerText(pack,before,after,action){
 const q=before?.pending;
 if(!q||q.kind!=='life-trigger'||action?.type!=='chooseTrigger')return '';
 if(q.player!==0&&q.player!==1)return '';
 const pl=before.players?.[q.player];
 const physical=[...(pl?.lifeRevealed||[]),...(pl?.outside||[])].find(c=>c?.uid===q.uid);
 if(!physical?.cardId)return '';
 const source=Array.isArray(pack)?pack[q.player]:pack;
 const printed=source?.cards?.[physical.cardId];
 const name=printed?.name||physical.cardId;
 const mode=action.mode;
 let detail='使用觸發';
 if(mode==='skip')detail='不使用此觸發';
 else if(mode==='get')detail='加入手牌';
 else if(mode==='draw')detail='抽 1 張';
 else if(mode==='final')detail='FINAL 恢復生命';
 else if(mode==='active')detail='使 '+(publicZoneName(pack,before,action.uid)||'角色')+' ACTIVE';
 else if(mode==='special')detail='使 '+(publicZoneName(pack,before,action.uid)||'角色')+' 退場';
 else if(mode==='colorRetire')detail='COLOR：使 '+(publicZoneName(pack,before,action.uid)||'角色')+' 退場';
 else if(mode==='colorRestSkip')detail='COLOR：使 '+(publicZoneName(pack,before,action.uid)||'角色')+' REST';
 else if(mode==='colorBounce')detail='COLOR：將 '+(publicZoneName(pack,before,action.uid)||'角色')+' 返回手牌';
 else if(mode==='colorOutside')detail='COLOR：從場外登場 '+(publicZoneName(pack,before,action.uid)||'角色');
 else if(mode==='color'||mode==='colorField'){
  const played=publicZoneName(pack,after,action.uid)||publicZoneName(pack,before,action.uid);
  detail=played?'COLOR 登場 '+played:(mode==='colorField'?'COLOR 登場場域':'COLOR 登場');
 }else if(mode==='raid'){
  const base=publicZoneName(pack,before,action.baseUid);
  detail=base?'RAID 至 '+base:'使用 RAID 觸發';
 }
 return '觸發 '+name+' · '+detail;
}
export const FIELD_HOLD_MS=1000;
// Printed catalogue text only. This never reads the rules program or a hidden card.
export function fieldEffectCopy(card){
 if(!card||typeof card!=='object')return '這張卡沒有可顯示的效果。';
 const text=value=>typeof value==='string'?value.trim():'';
 const effect=text(card.effect);
 const trigger=text(card.triggerText)||text(card.triggerEffect);
 const skip=new Set(['','-','無 Trigger。','無觸發。']);
 const parts=[effect,!skip.has(trigger)?('觸發效果：'+trigger):''].filter(part=>part&&!skip.has(part));
 return parts.join('\n')||'這張卡沒有印刷效果。';
}
export function attackBattleTags(battle){
 if(!battle||typeof battle!=='object')return [];
 const tags=[];
 if(Number.isInteger(battle.bp))tags.push('BP '+battle.bp);
 if(Number.isInteger(battle.damage))tags.push(battle.damage===2?'直傷2':'直傷'+battle.damage);
 if(Number.isInteger(battle.impact))tags.push(battle.impact>0?'衝擊'+battle.impact:'無衝擊');
 return tags;
}
// Raid on the table is two clicks: the base, then the slot the raider enters.
// The first click never submits an action. Play and move stay on their own slots.
export function raidClickPlan({selectedUid,raidBaseUid,slotUid,line,slot,legal}){
 const actions=Array.isArray(legal)?legal:[];
 const raids=actions.filter(a=>a?.type==='raid'&&a.uid===selectedUid);
 const isBase=!!slotUid&&raids.some(a=>a.baseUid===slotUid);
 if(isBase&&raidBaseUid!==slotUid)return {type:'choose-base',baseUid:slotUid};
 // The reducer treats a raid with no line as the front line. Energy raids
 // are the only ones that carry line:'energy'.
 const dest=raidBaseUid?raids.filter(a=>a.baseUid===raidBaseUid&&a.slot===slot&&
  (a.line==='energy'?'energy':'front')===line):[];
 if(dest.length)return {type:'raid',actions:dest};
 const plays=actions.filter(a=>a?.uid===selectedUid&&a.line===line&&a.slot===slot&&
  ['play','move','step'].includes(a.type));
 if(plays.length)return {type:'place',actions:plays};
 return {type:'select'};
}
