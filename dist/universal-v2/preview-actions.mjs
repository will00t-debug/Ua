// Presentation-only adapters for the isolated V2 preview.
import {universalAttackDamage,universalImpact} from './engine.mjs';
// NEVER generate or accept an action outside legalUniversalActions().
export const V2_PHASE_LABELS=Object.freeze({
 start:'開始／額外抽牌',move:'移動階段',main:'主要階段',attack:'攻擊階段'
});
export const V2_TITLE_LABELS=Object.freeze({
 bleach:'BLEACH', 'gurren-lagann':'天元突破',
 'solo-leveling':'我獨自升級',
 'sword-art-online':'刀劍神域',
 'mushoku-tensei':'無職轉生',
 rezero:'Re:Zero',
 'steins-gate':'命運石之門',
 madoka:'魔法少女小圓',
 inuyasha:'犬夜叉',
 kjn:'我想成為影之強者！',
 aot:'進擊的巨人',
 kmr:'假面騎士',
 csm:'鏈鋸人'
});
export const V2_PENDING_LABELS=Object.freeze({
 block:'選擇是否阻擋',
 'effect-grant-below-printed':'選擇對方角色，本回合 BP 低於原本時不能阻擋',
 'life-trigger':'生命觸發',
 'life-batch-order':'選擇 LIFE／登場效果結算順序',
 'leave-replacement':'角色離場保護',iys:'犬夜叉效果選擇',kjn:'影之最強者效果選擇',aot:'進擊的巨人效果選擇',aot2:'進擊的巨人第二彈效果選擇',kmr:'假面騎士效果選擇',csm:'鏈鋸人效果選擇','private-top-choice':'查看牌庫頂','private-top-place':'選擇牌頂或牌底',
 'effect-recover-ap':'恢復 AP','effect-hand-top':'將 1 張手牌放到牌庫頂',
 'effect-grant-lose-ready':'給能源 0 的指定角色本回合落敗時 ACTIVE',
 'effect-trait-ban-move':'給有特徵的角色本回合不能攻擊，並移到另一條線',
 'effect-entry-rest-front':'將前線 ACTIVE 角色轉為 REST',
 'effect-retire-tuck-active':'可退場 1 張其他角色，裏向放在此角色下方並 ACTIVE','end-hand-limit':'手牌上限',
 'effect-discard':'選擇棄牌','effect-discard-cost':'支付棄牌成本',
 'effect-may-draw-discard':'選擇是否抽牌並棄牌',
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
 'effect-optional-mill':'可逐張將牌庫頂送場外（每次 1 張，可繼續或停止）',
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
 'effect-return-raid-base':'可將突襲底卡加入手牌',
 'effect-top-deploy-rest':'查看牌頂，可將 1 張以休息登場，其餘放回牌庫底',
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
 'effect-swap-lines':'可交換前線與能源線的角色',
 'effect-rest-gen':'可休息對方前線與發生能源1以下的能源角色，兩張都選到時可交換位置',
 'effect-retire-field-gen':'可退場1張發生能源1以下的對方場地',
 'effect-raid-life':'可將レイド元表向放入自己的生命區',
 'effect-wyrm-look':'查看牌頂，可公開鑄錠或需求能源3以下的桐人或莉茲貝特',
 'effect-bottom-retire':'可依序將場外卡放到牌庫底，再退場對方前線',
 'effect-outside-bottom':'依序將4張場外卡放到牌庫底',
 'effect-grant-survivor-damage':'可給1張SAO生存者本回合直接傷害2',
 'effect-top-deploy':'從查看的牌中最多讓1張符合條件的角色以ACTIVE登場前線',
 'effect-top-take-ready':'將查看的1張公開加入手牌',
 'effect-outside-color-rest':'可從場外以REST登場1張指定顏色與特徵的角色',
 'effect-ingot-double':'可將場外的指定卡除外並棄1張手牌',
 'effect-grant-double':'可給1張指定角色2回攻擊',
 'effect-attack-end-named':'可與能源線的指定角色交換位置',
 'effect-return-then':'可將其他己方角色返回手牌',
 'effect-active-trait-buff':'可將1張指定特徵角色轉為ACTIVE並BP+1000',
 'effect-return-trait':'將1張指定特徵角色返回手牌',
 'effect-armed-draw':'下一張指定角色登場時可抽1張',
 'effect-life-mandatory':'將1張生命加入手牌',
 'effect-trait-kit':'可讓其他指定特徵角色獲得BP與衝擊',
 'effect-life-until':'可將1張生命加入手牌並獲得保護',
 'effect-named-fronts':'可讓指定名稱的前線角色獲得BP與衝擊無效',
 'effect-own-attack-kit':'選擇1張己方角色獲得攻擊後的追加效果',
 'effect-active-except':'可將1張指定特徵角色轉為ACTIVE',
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
 'effect-shift-slot':'選擇移到前線的空位',
 'effect-energy-shift':'選擇能源線角色並移到前線',
 'effect-recover-event':'從場外回收沒有最終觸發的事件',
 'effect-ordered-subset':'依印刷順序選擇最多 2 個效果',
 'effect-rest-own-field':'休息 1 張活動場域',
 'effect-hand-active-noraid':'從手牌讓沒有突襲的角色活動登場',
 'effect-pay-ap-deploy':'可支付 1 AP，從場外 REST 登場',
 'effect-optional-pay-ap':'可支付 1 AP，然後結算後續效果',
 'effect-deck-named-play':'公開的卡片可加入手牌、休息登場或突襲',
 'effect-remove-hand':'可將手牌中1張具有指定特徵的卡除外',
 'effect-place-hand':'將1張手牌放到牌頂或場外',
 'effect-hand-rest':'從己方手牌免費 REST 登場',
 'effect-hand-rest-cap':'從手牌將符合條件的卡以 Rest 登場',
 'effect-hand-rest-or-raid':'從手牌休息登場或突襲',
 'effect-protect-gen':'選擇己方角色，直到下次自己的回合開始不能被對手效果選擇',
 'effect-raid-base-choice':'レイド元をレスト登場或加入手牌',
 'effect-named-ap-outside':'從場外 REST 登場或合法 Raid',
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
 'effect-attack-discard-active':'可將 1 張手牌放到場外，使這張角色活動',
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
 'effect-move-opp-if-event':'可將對手前線角色移至能源線',
 'effect-retire-own-other':'可退場1張其他己方卡片',
 'effect-retire-trigger-ceiling':'可退場觸發種類上限內的對手前線角色',
 'effect-remove-named-zones':'可將指定角色移入移除區',
 'effect-unblocked-rest':'選擇是否使對手前線休息',
 'effect-energy-swap':'選擇要交換位置的己方前線',
 'effect-removed-self-grant':'可將移除區的指定卡放到場外，這張角色本回合 BP+1000 並獲得衝擊 1',
 'effect-buff-name-or-trait':'選擇百江凪沙或其他五重奏，本回合 BP+1000',
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
 'effect-rest-skip-may-retire':'選擇 1 張 BP 5000 以下的對手前線，休息並跳過下次活動，或在巴麻美在場時改為退場',
 'effect-retire-named-draw':'退場 1 張自己場上的佐倉杏子',
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
 'effect-grant-attack':'授予己方角色攻擊時能力','effect-grant-retire':'授予己方角色退場時能力','granted-attack-draw':'攻擊時是否抽一張','granted-retire-draw':'退場時是否抽一張',
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
 'effect-pay-deploy-self':'是否支付 AP，讓此角色以活動狀態登場',
 'effect-deploy-self-active':'選擇以活動狀態登場的位置',
 'effect-rest-tuck':'是否 REST 角色，放置剛送至場外的手牌',
 'effect-tuck-moved':'可將該場外卡裏向放在自身下方',
 'opening-mulligan':'開局手牌調度（每人最多一次）',
 'retirement-order':'同時退場效果的結算順序',
 'effect-field-leave-remove':'上限或離場時可改放移除區',
 'effect-suzuha-attack-end':'攻擊結束可將手牌放到場外',
 'effect-mayuri-fork':'選擇對手前線角色',
 'effect-printed-rest-raid':'從場外休息登場或突襲',
 'effect-zone-rest-raid':'從場外或移除區休息登場或突襲',
 'effect-removed-okabe-raid':'從移除區使岡部倫太郎突襲',
 'effect-look-take':'查看牌庫，選擇加入手牌或放回牌底',
 'effect-discard-mode':'選擇要放到場外的手牌',
 mmm2:'魔法少女小圓效果選擇',
 kmr2:'假面騎士第二彈效果選擇',
 'phase-order':'選擇同時發動的階段效果順序',
 'effect-grant-cause':'是否給予這次退場原因的角色阻擋下限',
 'effect-hand-bottom':'可將 1 張手牌放到牌底',
 'effect-outside-hand-or-rest':'場外角色加入手牌，或以休息狀態登場',
 'effect-recover-under':'可將蓋在角色下的卡加入手牌',
 'effect-facedown-front':'是否從能源線移到前線',
 'effect-energy-front':'選擇要移到前線的能源角色',
 'effect-entry-protect':'是否保護剛登場的角色不被選擇',
 'attack-end-swap':'攻擊結束時是否交換位置',
 'effect-reveal-opp-top':'公開的對手牌頂留在上面，或放到場外',
 'effect-choose-printed-energy':'指定要查看的必要能源',
 'effect-top-filter-many-choice':'查看牌頂，選擇要加入手牌的卡',
 'effect-return-retired':'是否將剛退場的卡加入手牌',
 'effect-life-to-hand':'是否將生命加入手牌',
 'effect-life-active-self':'將 1 張生命加入手牌並使自身活動',
 'effect-name-draw':'名稱成立時是否抽 1 張',
 'effect-outside-traitless-rest':'可讓場外沒有特徵的角色以休息狀態登場',
 'effect-outside-exact-rest':'可讓場外符合能源的角色以休息狀態登場',
 'effect-outside-trait-ap-rest':'可支付 AP，讓場外指定特徵的角色以休息狀態登場',
 'effect-outside-name-rest':'可讓場外指定名稱的角色以休息狀態登場',
 'effect-named-zone-entry':'可從指定區域讓角色登場',
 'effect-outside-rest':'可讓場外角色以休息狀態登場',
 'effect-selection-hand-payment':'支付選擇費用，棄 1 張手牌',
 'effect-remove-outside-up-to':'可將場外角色移入移除區',
 'effect-removed-rest-pair':'可從移除區讓角色以休息狀態登場',
 'effect-top-character-outside':'可將牌頂角色放到場外',
 'effect-peek-top-place':'牌庫頂留在上面，或放到場外',
 'effect-remove-front-self':'將敵方前線與此卡放入移除區',
 'effect-bounce-named-cut':'可將手牌角色返回手牌',
 'effect-front-bp-cut':'可降低敵方前線 BP',
 'effect-reveal-top-place':'公開的牌留在上面，或放到牌庫底',
 'effect-life-reenter-grant':'將 1 張生命加入手牌',
 'effect-sayaka-reenter':'美樹沙耶香以休息狀態再登場，或突襲',
 'effect-tuck-named':'可將角色放到牌庫底',
 'effect-hand-girl-rest':'可從手牌讓角色以休息狀態登場',
 'effect-mami-active':'使 1 張其他己方角色活動',
 'effect-discard-named-energy':'棄 1 張事件，降低必要能源',
 'main-discard-self-retire':'棄 1 張手牌，並使自身退場',
 'effect-grant-block-at-least':'是否給予阻擋條件',
 'effect-draw-instead':'抽牌，或抽牌後再棄牌',
 'effect-entry-other-impact':'選擇要給予登場衝擊的角色',
 'effect-front-grant':'選擇要給予 BP 與追加能力的前線角色',
 'effect-removed-enter':'可從移除區讓角色以休息狀態登場',
 'effect-grant-impact':'是否給予衝擊',
 'main-rest-front-energy':'休息 1 張前線角色，本回合產能增加',
 'effect-own-front-protect':'選擇要保護的己方前線角色',
 'effect-equal-bp-pair':'選擇 BP 相同的角色退場',
 'main-field-trait-retire':'使指定特徵的角色退場',
 'effect-retire-own-character':'可讓 1 張己方角色退場',
 'effect-retire-own-field':'可讓 1 張己方場域退場',
 'effect-strip-raid-top':'是否移走突襲頂卡',
 'effect-named-outside-bounce-retire':'選擇場外指定名稱的角色',
 'effect-bounce-bp':'可將角色返回手牌並結算 BP',
 'effect-line-move':'選擇要移動的角色與位置',
 'effect-line-slot':'選擇要移到能源線的位置',
 'effect-rest-two':'休息 2 張己方前線角色',
 'effect-self-front':'選擇自身移到前線的位置',
 'effect-raid-leave':'是否支付手牌，只移走突襲頂卡',
 'effect-rest-lock':'是否休息並鎖定',
 'effect-hand-trigger-card':'選擇手牌的觸發',
 'effect-active-own-other':'可讓其他己方角色活動',
 'effect-grant-field-energy':'可讓另 1 張卡也能產生能源',
 'effect-attack-end-rest':'攻擊結束時是否休息角色',
 'effect-named-energy-bounce':'將指定角色返回手牌',
 'effect-outside-printed':'可從場外讓符合印刷條件的角色登場',
 'effect-outside-except':'可從場外讓其他角色登場',
 'effect-active-either':'選擇要活動的角色',
 'effect-rest-own':'可休息 1 張己方前線角色',
 'effect-buff-any':'可提高 1 張場上角色的 BP',
 'effect-grant-named':'是否給予這個回合的能力',
 'effect-self-to-front':'選擇自身移到前線的位置',
 'effect-grant-printed-ap':'是否給予衝擊',
 'effect-different-field':'可從場外以休息狀態登場',
 'effect-hand-fresh-name':'可從手牌讓新名稱的角色以休息狀態登場',
 'effect-block-floor':'是否設定阻擋下限'
});
export function isExactLegal(action,legal){
 return Array.isArray(legal)&&legal.some(candidate=>
  JSON.stringify(candidate)===JSON.stringify(action));
}
export function uiActor(state){
 return state.pending?.player??state.active;
}
function apPointRecord(pack,state,uid){
 if(!/^AP[01]-\d+$/.test(String(uid||'')))return null;
 const owner=Number(String(uid)[2]);
 const token=state?.players?.[owner]?.apCards?.find(card=>card?.uid===uid);
 if(typeof token?.cardId!=='string'||!token.cardId)return null;
 const source=Array.isArray(pack)?pack[owner]:pack;
 return (source?.pointCards||[]).find(card=>card?.id===token.cardId)||null;
}
export function uiCardLabel(pack,state,uid){
 if(uid==null)return '';
 if(/^AP\d-\d+$/.test(uid)){
  const point=apPointRecord(pack,state,uid);
  return point?.name||('AP '+uid.replace(/^AP\d-/, ''));
 }
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
// `recommended` is the raid-red outline. An on-play or activate branch is
// not a raid, even when the card itself has a raid keyword. Only a choice
// whose mode is raid keeps that frame.
const CLOSED_CHOICE_TYPES=new Set(['kmr','kmr2','iys','kjn','aot','aot2','mmm2','csm']);
export function pendingTextChoiceClass(action){
 const closed=CLOSED_CHOICE_TYPES.has(action?.type);
 const quiet=action?.mode==='skip'||action?.mode==='done'||(!closed&&action?.uid===null);
 if(quiet)return 'quiet';
 if(action?.type==='chooseEffectMode'&&action.mode!=='raid')return '';
 return 'recommended';
}
function closedChoiceName(pack,state,uid){
 if(!pack||!state||uid==null)return '';
 const label=uiCardLabel(pack,state,uid);
 return label&&label!=='指定卡片'&&label!=='卡片'?label:'';
}
function withClosedCard(pack,state,action,text){
 const name=closedChoiceName(pack,state,action?.uid);
 if(!name)return text;
 if(text.includes('這張卡')||text.includes('這張角色')||text.includes('這張手牌'))
  return text.replaceAll('這張卡',name).replaceAll('這張角色',name).replaceAll('這張手牌',name);
 return text+'：'+name;
}
// Closed title ops never fall through to an English "執行 op" button.
// A newly registered title uses kmr2 / the same mode words and stays in Chinese.
function kmr2ModeLine(id,key){
 const lines={
  'KMR-2-018':{
   draw:'抽 1 張，再將 1 張手牌放到場外',
   raid:'公開 1 張手牌的突襲角色，抽 2 張，再將 1 張手牌放到場外'
  },
  'KMR-2-022':{
   tuck:'抽 1 張，將 1 張手牌蓋到這張角色或含有 EX-AID 的角色下方',
   release:'將合計 3 張裏向卡放到場外，並給予衝擊 1'
  },
  'KMR-2-048':{
   look:'查看 5 張，公開 1 張切換記憶體',
   pay:'支付 1 AP，這個回合被防禦時可再活動'
  },
  'KMR-2-054':{
   top:'查看 1 張牌組頂，放到牌組上面或下面',
   draw:'抽最多 1 張'
  },
  'KMR-2-057':{
   draw:'抽 1 張',
   look:'查看 3 張，將 1 張加入手牌，其餘放回牌組上面'
  },
  'KMR-2-099':{
   deploy:'抽 1 張並將 1 張手牌放到場外，再讓鏡怪獸休息登場',
   replay:'發動 1 張鏡怪獸的登場時，並恢復 1 張 AP'
  }
 };
 return lines[id]?.[key]||'';
}
function closedTitleChoiceLabel(action,{pack,state}={}){
 const mode=action?.mode;
 const step=state?.pending?.step;
 if(mode==='skip')return '不發動';
 if(mode==='done')return '完成選擇';
 if(step==='oppDeck'&&mode==='top')return '放到對手牌組上面';
 if(step==='oppDeck'&&mode==='bottom')return '放到對手牌組下面';
 if(step==='oppTop'&&(mode==='top'||mode==='outside'))
  return mode==='outside'?'將這張公開的卡放到場外':'將這張公開的卡留在對手牌組上面';
 if(step==='gearTop'&&mode==='top')return '將這張場外卡放到牌組上面';
 if(step==='placeHand'&&mode==='top')return withClosedCard(pack,state,action,'將這張手牌放到牌組上面');
 if(step==='placeHand'&&mode==='bottom')return withClosedCard(pack,state,action,'將這張手牌放到牌組底');
 if((step==='topPlace'||step==='revealTop')&&(mode==='top'||mode==='bottom'||mode==='outside'||mode==='reveal')){
  if(mode==='outside')return '放到場外';
  if(mode==='bottom')return '放到牌組底';
  if(mode==='reveal')return '公開牌組頂';
  return '留在上面';
 }
 if(mode==='mode'){
  const keyed={draw:'抽 1 張，再將 1 張手牌放到場外',buff:'這個回合 BP＋1000',
   impact:'這個回合獲得衝擊 1',damage:'這個回合直接傷害變為 2',bp:'這個回合 BP＋1000',
   under:'放到角色下方',deploy:'以休息狀態登場'}[action.key];
  return keyed||'選擇這個效果';
 }
 if((mode==='one'||mode==='two')&&action.key){
  const line=kmr2ModeLine(state?.pending?.id,action.key);
  if(line)return line;
 }

 if(state?.pending?.id==='AOT-2-032'&&step==='mode'){
  if(mode==='done')return '不選擇後續效果';
  if(mode==='look')return '查看牌組頂 7 張，可公開 1 張始祖尤米爾';
  if(mode==='deploy')return '從場外使沒有突襲的黃色吉克・葉卡以休息狀態登場';
 }
 const table={
  take:'將這張卡加入手牌',next:'下一個放回這張卡',discard:'將這張手牌放到場外',
  retire:'使這張角色退場',retireOwn:'使這張角色退場',retireFood:'使這張卡退場',
  switch:'退場1張口嚼獸，改為選擇黃色角色卡',deckTop:'將這張卡放到自己牌組上面',
  outside:'放到場外',bottom:'放到牌組底',
  top:'留在上面',deploy:'讓這張卡登場',reveal:'公開牌組頂',rest:'使這張角色休息',
  raid:'以突襲登場',mill:'將牌組頂放到場外',remove:'將這張卡移入移除區',removed:'移入移除區',
  enter:'讓這張卡登場',enterAsk:'讓這張角色登場',host:'選擇這張角色',back:'放回',
  tuck:'將這張卡放到角色下方',tuckTop:'將牌組頂蓋到這張角色下方',life:'選擇這張生命',
  ready:'使這張角色活動',own:'選擇這張角色',same:'選擇需求能源相同的這張手牌',
  pay:'支付',payAll:'支付 1 AP，取得全部效果',payback:'放回',bounce:'將這張角色返回手牌',
  pick:'選擇這張卡',card:'選擇這張卡',ap:'恢復這張 AP',under:'放到角色下方',
  revive:'從場外以休息狀態回到場上',silence:'使這張角色失去原本的效果',
  sub:'由這張角色代替退場',layer:'消耗這張裏向卡',dest:'選擇登場的位置',
  active:'使這張角色活動',buff:'這個回合 BP 增加',draw:'抽牌',impact:'獲得衝擊',
  damage:'改變直接傷害',double:'獲得再次攻擊',hand:'加入手牌',look:'查看牌組',
  place:'放置這張卡',stay:'留在原處',down:'降低 BP',energy:'產生能源',keep:'保留',
  out:'放到場外',tax:'增加指定費用',grant:'給予這個回合的能力',range:'提高可選的 BP 範圍',
  one:'選擇第一項',two:'選擇第二項',three:'選擇第三項',d1:'選擇第一項',d2:'選擇第二項',
  triggerSafe:'這個回合不會被觸發效果指定',loseRemove:'戰鬥敗北時雙方移入移除區',
  energyPick:'選擇這張角色',copy:'複製這張卡這個回合的效果',
  toEnergy:'將這張角色移到能源線',removeTrio:'將這張角色移入移除區',
  outToTop:'將場外卡放回牌組頂',zombieRemove:'將選定殭屍玩家移入移除區',
  sparkleHand:'從場外加入手牌',namedDiscard:'棄掉符合條件的這張手牌',
  underHost:'選擇這張醫生角色作為蓋牌底座',
  d6:'選擇第三項',low:'選擇較低的效果',bare:'選擇生命較少時的效果',
  battle:'選擇戰鬥相關的效果',mark:'指定這張角色',kit:'選擇這個效果',
  discard2:'再將一張手牌放到場外',discardBuff:'將這張手牌放到場外並提高 BP',
  buffMode:'選擇 BP 效果'
 };
 const text=table[mode];
 if(!text)return '選擇這個效果';
 return withClosedCard(pack,state,action,text);
}
function orderEffectLabel(pack,state,action,base){
 const entry=state?.pending?.entries?.find(item=>item.key===action.key);
 const uid=entry?.sourceUid||entry?.jobs?.[0]?.sourceUid;
 const who=uid==null?'':uiCardLabel(pack,state,uid);
 return who&&who!=='指定卡片'&&who!=='卡片'?base+'：'+who:base;
}
function choicePlace(action){
 if(!Number.isInteger(action?.slot))return '';
 return ' · '+(action.line==='energy'?'能源線':'前線')+' '+(action.slot+1);
}
function unlabeledChoiceLabel(action,{pack,state}={}){
 const type=action?.type;
 if(typeof type!=='string'||!type.startsWith('choose'))return '';
 const place=choicePlace(action);
 const card=text=>withClosedCard(pack,state,action,text);
 const modes={
  chooseGrantCause:{grant:'給予這次退場原因的角色阻擋下限',skip:'不給予阻擋下限'},
  chooseArmedDraw:{draw:'抽 1 張',skip:'不抽牌'},
  chooseDrawInstead:{draw:'改為抽牌，不棄牌',discard:'抽牌後再棄牌'},
  chooseReturnRetired:{return:'將剛退場的卡加入手牌',skip:'不加入手牌'},
  chooseRevealedTop:{top:'把公開的牌留在上面',outside:'把公開的牌放到場外'},
  chooseTopTraitHand:{hand:'公開並加入手牌',top:'留在牌庫頂',outside:'放到場外'},
  chooseSwapMode:{swap:'交換前線與能源線',bp:'本回合提高 BP',both:'交換位置並提高 BP'}
 };
 if(modes[type])return modes[type][action.mode]||modes[type][action.place]||'';
 if(type==='choosePrintedEnergy')return Number.isInteger(action.value)?'指定必要能源 '+action.value:'';
 if(type==='chooseRaidLife')return action.index===null?'不把突襲底板放入生命':
  '放入生命區的第 '+(action.index+1)+' 張';
 if(type==='chooseOutsideUse'){
  if(action.mode==='skip')return '不使用場外卡';
  if(action.mode==='hand')return card('將這張卡加入手牌');
  if(action.mode==='rest')return card('以休息狀態登場')+place;
 }
 if(type==='chooseRaidBaseMode'){
  if(action.uid==null&&action.mode!=='dest')return '不選擇突襲底板';
  if(action.mode==='hand')return card('將這張卡加入手牌');
  if(action.mode==='rest'||action.mode==='dest')return card('以休息狀態登場')+place;
 }
 if(type==='chooseRaidLeave'){
  if(action.mode==='decline')return '不支付，照原本方式離場';
  if(action.mode==='pay')return card('支付這張手牌，只移走突襲頂卡');
 }
 if(type==='chooseRemoveHandScale'){
  if(action.mode==='done')return '結束除外並結算';
  if(action.mode==='pick')return card('除外這張卡');
 }
 const picks={
  chooseActiveAny:['不使角色活動','使這張卡活動'],
  chooseActiveEither:['使這張卡活動','使這張卡活動'],
  chooseActiveExcept:['不使其他角色活動','使這張卡活動'],
  chooseActiveNamed:['使這張卡活動','使這張卡活動'],
  chooseActiveOwnOther:['不使其他己方角色活動','使這張卡活動'],
  chooseActiveTraitBuff:['不活動也不加 BP','使這張卡活動並提高 BP'],
  chooseAnyBuff:['不提高 BP','本回合使這張卡 BP 增加'],
  chooseAttackEndNamed:['不指定攻擊結束的對象','攻擊結束時指定這張卡'],
  chooseAttackEndRest:['不在攻擊結束時休息','攻擊結束時休息這張卡'],
  chooseAttackEndSwap:['不在攻擊結束時交換','攻擊結束時與這張卡交換'],
  chooseBlockFloor:['不設定阻擋下限','給這張卡阻擋下限'],
  chooseBottomRetire:['結束放到牌底','將這張場外卡放到牌底'],
  chooseBounceBp:['不返回手牌','將這張卡返回手牌並結算 BP'],
  chooseEnergyFront:['將這張卡移到前線','將這張卡移到前線'],
  chooseEnergyLineAttackEndSwap:['不在攻擊結束時交換','攻擊結束時與能源線的這張卡交換'],
  chooseEntryImpact:['給這張卡登場時的衝擊','給這張卡登場時的衝擊'],
  chooseEntryProtect:['不保護登場的角色','保護這張卡不被選擇'],
  chooseEntrySacrifice:['退場這張卡，取得登場報酬','退場這張卡，取得登場報酬'],
  chooseFieldEnergyGrant:['不讓這張卡產生能源','讓這張卡也能產生能源'],
  chooseFieldSacrifice:['退場這張卡並重新發動','退場這張卡並重新發動'],
  chooseFieldTraitRetire:['使這張卡退場','使這張卡退場'],
  chooseFirstAttackKit:['把第一次攻擊的能力給這張卡','把第一次攻擊的能力給這張卡'],
  chooseFrontRetireLook:['使這張前線卡退場並查看牌庫','使這張前線卡退場並查看牌庫'],
  chooseGrantBelowPrinted:['不給予低於印刷 BP 的限制','讓這張卡在 BP 低於原本時不能阻擋'],
  chooseGrantBlockAtLeast:['不給予阻擋條件','讓這張卡適用阻擋條件'],
  chooseGrantDouble:['不給予再次攻擊','讓這張卡可以再次攻擊'],
  chooseGrantImpact:['不給予衝擊','讓這張卡獲得衝擊'],
  chooseHandBottom:['不將手牌放到牌底','將這張手牌放到牌底'],
  chooseHandFreshName:['不從手牌登場','讓這張卡以休息狀態登場'],
  chooseHandTriggerCard:['選擇這張手牌的觸發','選擇這張手牌的觸發'],
  chooseImpactGrant:['不給予衝擊','讓這張卡獲得衝擊'],
  chooseIngotDouble:['不給予再次攻擊','讓這張卡可以再次攻擊'],
  chooseLifeActive:['將這張生命加入手牌並使自身活動','將這張生命加入手牌並使自身活動'],
  chooseLifeMandatory:['將這張生命加入手牌','將這張生命加入手牌'],
  chooseLifeToHand:['不把生命加入手牌','將這張生命加入手牌'],
  chooseLifeUntil:['不指定持續對象','指定這張卡，效果持續到條件結束'],
  chooseLineMove:['不移動','移動這張卡'],
  chooseMainDiscardRetire:['棄掉這張手牌並使自身退場','棄掉這張手牌並使自身退場'],
  chooseMissingTraitRetire:['使這張卡退場','使這張卡退場'],
  chooseNameHandRemove:['除外這張手牌','除外這張手牌'],
  chooseNameOrTraitImpact:['不給予衝擊','讓這張卡獲得衝擊'],
  chooseNamedDouble:['讓這張卡可以再次攻擊','讓這張卡可以再次攻擊'],
  chooseNamedEnergyBounce:['將這張卡返回手牌','將這張卡返回手牌'],
  chooseNamedFieldProtect:['不保護場上角色','保護這張卡不被選擇'],
  chooseNamedFronts:['不指定前線','指定這張前線卡'],
  chooseNamedOutside:['不從場外登場','讓這張卡登場'],
  chooseNamedOutsideBounceRetire:['選擇這張卡','選擇這張卡'],
  chooseNamedZoneDeploy:['不從指定區域登場','讓這張卡登場'],
  chooseOtherTraitBuff:['不提高 BP','本回合使這張卡 BP 增加'],
  chooseOutsideActivePair:['不以活動狀態登場','讓這張卡以活動狀態登場'],
  chooseOutsideBottom:['將這張場外卡放到牌底','將這張場外卡放到牌底'],
  chooseOutsideColorApRest:['支付 AP，讓這張卡以休息狀態登場','支付 AP，讓這張卡以休息狀態登場'],
  chooseOutsideColorRest:['不從場外休息登場','讓這張卡以休息狀態登場'],
  chooseOutsideColorTraitActive:['不以活動狀態登場','讓這張卡以活動狀態登場'],
  chooseOutsideExactRest:['不以休息狀態登場','讓這張卡以休息狀態登場'],
  chooseOutsideExcept:['不從場外登場','讓這張卡登場'],
  chooseOutsidePrinted:['不從場外登場','讓這張卡登場'],
  chooseOutsideRest:['不從場外休息登場','讓這張卡以休息狀態登場'],
  chooseOutsideTraitApRest:['不支付 AP 休息登場','支付 AP，讓這張卡以休息狀態登場'],
  chooseOutsideTraitlessRest:['不讓無特徵角色休息登場','讓這張卡以休息狀態登場'],
  chooseOwnAttackKit:['把攻擊能力給這張卡','把攻擊能力給這張卡'],
  chooseOwnCharacterRetire:['不使角色退場','使這張卡退場'],
  chooseOwnFrontProtect:['保護這張前線卡','保護這張前線卡'],
  chooseOwnFrontRest:['不休息前線','休息這張卡'],
  chooseOwnTraitRetire:['不使角色退場','使這張卡退場'],
  choosePrintedLock:['不鎖定這張角色','鎖定這張卡，直到下一個自己的回合'],
  chooseProtectGen:['不保護產能角色','保護這張卡'],
  chooseRaidTopStrip:['不移走突襲頂卡','移走這張突襲頂卡'],
  chooseRecoverUnder:['不回收蓋牌','將這張蓋牌加入手牌'],
  chooseRemoveOwnOther:['不移入移除區','將這張卡移入移除區'],
  chooseRestApLock:['不休息','休息這張卡並鎖定'],
  chooseRestGen:['不休息產能角色','休息這張卡'],
  chooseRestTwo:['休息這張前線卡','休息這張前線卡'],
  chooseRetireFieldGen:['不退場','使這張卡退場'],
  chooseReturnThen:['不返回','將這張卡返回'],
  chooseReturnTrait:['返回這張卡','返回這張卡'],
  chooseSelectionTaxDiscard:['支付選擇費用：棄掉這張手牌','支付選擇費用：棄掉這張手牌'],
  chooseSurvivorDamage:['不指定直接傷害的對象','指定這張卡，本回合直接傷害提高'],
  chooseSwapLines:['不交換位置','與這張卡交換前線與能源線'],
  chooseSwapPair:['與這張卡交換','與這張卡交換'],
  chooseTopDeploy:['不讓牌庫頂登場','讓這張卡登場'],
  chooseTopFilteredMany:['不加入手牌','將這張卡加入手牌'],
  chooseTopHandOne:['將這張卡加入手牌','將這張卡加入手牌'],
  chooseTopTake:['將這張卡加入手牌並轉為活動','將這張卡加入手牌並轉為活動'],
  chooseTraitKit:['不選擇這項能力','選擇這張卡的能力'],
  chooseWyrmLook:['不加入手牌，其餘放回牌底','將這張卡加入手牌']
 };
 const pick=picks[type];
 if(!pick)return '';
 const declining=action.uid==null||action.mode==='skip'||action.mode==='decline';
 if(declining)return pick[0];
 return card(pick[1])+place;
}
function mmm2PrintedId(pack,state,uid){
 if(!pack||!state||typeof uid!=='string')return '';
 const owner=Number(uid.split('-')[0]);
 const player=state.players?.[owner];
 const source=Array.isArray(pack)?pack[owner]:pack;
 if(!player||!source?.cards)return '';
 const zones=[player.front,player.energy,player.hand,player.outside,player.removed,
  player.life,player.lifeRevealed];
 for(const cards of zones){
  if(!Array.isArray(cards))continue;
  const physical=cards.find(card=>card?.uid===uid);
  if(physical)return source.cards[physical.cardId]?.id||physical.cardId||'';
 }
 return '';
}
function mmm2Seat(action){
 const line=action.line==='energy'?'能源線':'前線';
 return line+' '+(action.slot+1)+(action.replaceUid?'（替換原位置）':'');
}
const MMM2_ACTIVATE={
 'MMM-2-007':{'mmm2:0':'休息自身。場外事件有 6 張以上時，再發動登場時'},
 'MMM-2-008':{'mmm2:0':'休息自身，抽 1 張，並將 1 張手牌放到場外'},
 'MMM-2-012':{
  'mmm2:0':'將 1 張〈鹿目圓〉返回手牌',
  'mmm2:1':'將場外的〈鹿目圓〉放到牌組底'
 },
 'MMM-2-016':{
  'mmm2:0':'使 1 張其他能源需求 4 以下的角色退場',
  'mmm2:1':'公開牌組頂，留在上面或放到場外'
 },
 'MMM-2-017':{'mmm2:0':'休息自身，使 1 張其他角色這個回合 BP＋1000'},
 'MMM-2-019':{'mmm2:0':'休息自身，抽 1 張，並將 1 張手牌放到場外'},
 'MMM-2-025':{'mmm2:0':'將 1 張前線的三日月莊小隊移到能源線'},
 'MMM-2-028':{'mmm2:0':'選擇最多 2 張角色，這個回合 BP＋1000'},
 'MMM-2-040':{'mmm2:0':'休息自身，使 1 張其他三日月莊小隊這個回合 BP＋1000'},
 'MMM-2-043':{'mmm2:0':'將 1 張其他角色放到牌組上面'},
 'MMM-2-044':{
  'mmm2:0':'公開牌組頂，留在上面或放到場外',
  'mmm2:1':'將這張角色轉為活動'
 },
 'MMM-2-047':{'mmm2:0':'將 1 張手牌放到牌組上面'},
 'MMM-2-049':{'mmm2:0':'抽 1 張，並將 1 張手牌放到牌組上面'},
 'MMM-2-051':{'mmm2:0':'休息自身並支付 1 AP，公開牌組頂並加入手牌'},
 'MMM-2-057':{'mmm2:0':'休息並退場，從手牌或場外以休息狀態登場'},
 'MMM-2-070':{'mmm2:0':'休息自身，抽 1 張，並將這張角色正面朝上放入生命'},
 'MMM-2-071':{'mmm2:0':'將 1 張生命加入手牌'},
 'MMM-2-072':{'mmm2:0':'從兩項效果中選擇最多 2 項'}
};
const MMM2_FORK={
 'MMM-2-003':{
  a:'抽 1 張（場上有最終形態鹿目圓，且這張是從手牌登場）',
  b:'可將移除區的最終形態鹿目圓放到場外'
 },
 'MMM-2-056':{
  a:'將 1 張 AP 轉為活動，這張角色這個回合 BP＋1000',
  b:'這個回合 BP＋1000，並獲得衝擊 1'
 },
 'MMM-2-072':{
  a:'這張角色這個回合 BP＋1000',
  b:'選擇 1 張其他角色，這個回合 BP＋1000'
 }
};
const MMM2_TARGET={
 u001:'將這張手牌移入移除區',
 u001out:'將這張場外角色移入移除區',
 handOut:'將這張手牌放到場外',
 u009:'這個回合使這張角色 BP＋2000',
 u010:'將這張手牌移入移除區',
 u011:'將這張手牌放到場外',
 u011c:'使這張角色活動，這個回合 BP＋2500',
 u012a:'將這張〈鹿目圓〉返回手牌',
 u012b:'將這張場外卡放到牌組底',
 u012look:'將這張卡加入手牌，其餘放到場外',
 u014:'這個回合使這張角色 BP－1000',
 u016a:'使這張角色退場',
 buff:'這個回合使這張角色 BP＋1000',
 u018:'選擇這張角色，接著以休息狀態登場',
 u023:'將這張手牌放到場外',
 buffMany:'這個回合使這張角色 BP＋1000',
 u031:'將這張角色返回手牌',
 swap:'與這張前線角色交換位置',
 u041:'公開這張卡並加入手牌',
 u043:'將這張角色放到牌組上面',
 u045lock:'鎖定這張角色，直到下一個自己的回合',
 u046:'公開這張卡並加入手牌',
 u047:'將這張手牌放到牌組上面',
 handTop:'將這張手牌放到牌組上面',
 u051:'將這張手牌放到場外',
 u055:'這個回合使這張角色 BP＋1000，並獲得衝擊 1',
 u060:'將這張卡加入手牌',
 u061:'使這張角色退場',
 u063:'將這張手牌放到場外',
 u067:'這張角色攻擊沒被阻擋時，可以抽 1 張',
 u071:'將這張生命加入手牌',
 u073:'這個回合使這張角色 BP＋2000',
 restFoe:'使這張角色休息',
 u003b:'將這張移除區的卡放到場外'
};
function mmm2ActivateLabel(action,{pack,state}={}){
 const id=mmm2PrintedId(pack,state,action.uid);
 const line=MMM2_ACTIVATE[id]?.[action.mode]||'起動這張角色的主要能力';
 const name=pack&&state?uiCardLabel(pack,state,action.uid):'';
 return '起動主要：'+line+(name&&name!=='指定卡片'&&name!=='卡片'?'：'+name:'');
}
function mmm2ChoiceLabel(action,{pack,state}={}){
 const mode=action?.mode;
 const step=state?.pending?.step;
 const card=text=>withClosedCard(pack,state,action,text);
 if(mode==='skip'){
  if(step==='drawOpt')return '不抽牌';
  if(step==='u069')return '不發動登場時';
  return '不發動';
 }
 if(mode==='done')return '不選擇後續效果';
 if(mode==='do'){
  if(step==='drawOpt')return '抽 1 張';
  if(step==='u069')return '再發動登場時效果';
  return '發動這個效果';
 }
 if(mode==='a'||mode==='b'){
  const id=state?.pending?.id;
  return MMM2_FORK[id]?.[mode]||(mode==='a'?'選擇第一項':'選擇第二項');
 }
 if(mode==='top'||mode==='bottom'||mode==='outside'){
  if(action.uid)return card(mode==='outside'?'將這張手牌放到場外':'將這張手牌放到牌組上面');
  if(mode==='bottom')return '放到牌組底';
  if(mode==='outside')return '放到場外';
  return step==='placeOne'?'放到牌組上面':'留在牌組上面';
 }
 if(Number.isInteger(action.slot)){
  const moving=step==='moveLine'||step==='u045';
  return card((moving?'將這張角色移到':'以休息狀態放到')+mmm2Seat(action));
 }
 const text=MMM2_TARGET[step];
 return text?card(text):card('選擇這張卡');
}
export function uiActionLabel(action,{pack,state}={}){
 if(action?.type==='activate'&&typeof action?.mode==='string'&&action.mode.startsWith('mmm2:'))
  return mmm2ActivateLabel(action,{pack,state});
 if(action?.type==='mmm2')return mmm2ChoiceLabel(action,{pack,state});
 const name=()=>pack&&state?uiCardLabel(pack,state,action.uid):'指定卡片';
 const destination=()=>action.line==='energy'?'能源線':'前線';
 const suffix=()=>action.slot===undefined?'':' · '+destination()+' '+(action.slot+1);
 switch(action.type){
  case 'openingMulligan':return action.mode==='redraw'?'整手重抽 7 張（僅一次）':'保留這 7 張手牌';
  case 'next':return '前進下一階段／結束回合';
  case 'extraDraw':return '支付 1 AP 額外抽牌';
  case 'play':return (action.from==='removed'?'從移除區登場：':'普通登場：')+name()+suffix();
  case 'raid':return '突襲登場：'+name()+' · 底板 '+
   (action.baseUid?uiCardLabel(pack,state,action.baseUid):'指定角色')+
   ' → '+(action.line==='energy'?'能源線':'前線')+' '+(action.slot+1);
  case 'event':return (action.from==='removed'?'從移除區使用事件：':'使用事件：')+name();
  case 'move':return '移至前線 '+(action.slot+1);
  case 'step':return 'STEP 移至能源線 '+(action.slot+1);
  case 'attack':return action.targetUid?
   '狙擊攻擊：'+name()+' → '+uiCardLabel(pack,state,action.targetUid):
   '宣告攻擊：'+name();
  case 'activateRemoved':return '起動移除區主要：本回合產生能源變為 2 倍';
  case 'activate':
   if(typeof action.mode==='string'&&(action.mode.startsWith('kmr:')||action.mode.startsWith('kmr2:')))
    return '起動主要：'+name();
   return action.mode==='namesActive'?
    '起動主要：場上同時有指定名稱時，將此角色轉為 ACTIVE':
    action.mode==='traitBuff'?
    '起動主要：發生能源與特徵齊備時，下次己方回合開始前 BP＋500':
    action.mode==='front'?
    '起動主要：前線也能產生能源':
    action.mode==='ready20'?'起動主要：將 1 張己方角色轉為 ACTIVE':
    action.mode==='plus2'?'起動主要：能源 8 以上時，本回合產能＋2':
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
    action.mode==='frontOnce'&&pack?.cards&&state?.players?.some(p=>
     [...p.front,...p.energy].some(c=>c?.uid===action.uid&&
      pack.cards[c.cardId]?.mainAbility?.then?.[0]?.op==='grantSelfFrontEnergyUntilNextOwnStart'))
     ?'起動主要：直到下次我方回合開始，前線也能產生能源':
    action.mode==='restLeaveReveal'?'起動主要：休息並退場，公開 1 張手牌放到牌底':
    action.mode==='handBlock'?'起動主要：將 1 張手牌放到場外，本回合不被 BP4000 以上的角色阻擋':
    action.mode==='energySwap'?'起動主要：與 1 張己方前線角色交換位置':
    action.mode==='ready'?'主要能力：將自己轉為 ACTIVE（適用的同名限次規則照常計算）':
    action.mode==='restTuckDamage'?
    '起動主要：REST 自身，將牌庫頂裏向放在指定角色下並使直接傷害變為 2':
    action.mode==='fieldMill'?'起動主要：REST 場域，將牌庫頂 1 張送場外':
    action.mode==='fieldOutsideEvent'?'起動主要：REST 場域，將手牌 1 張送場外後可使用場外事件':
    action.mode==='fieldTuck'?'起動主要：REST 場域，將牌庫頂 1 張裏向放在此卡下':
    action.mode==='fieldRelease'?'起動主要：REST 場域，將手牌 1 張送場外後可放出裏向卡':
    action.mode==='discount'?'起動主要：下一張符合條件的手牌事件，消費 AP-1':
    action.mode==='restedBuff'?'起動主要：選擇其他己方角色，本回合 BP+2000':
    action.mode==='rukaGrant'?action.grant==='block'
     ?'起動主要：本回合不被 BP4000 以上的角色阻擋'
     :'起動主要：本回合 BP+1000，使用過事件則獲得衝擊 1':
    action.mode==='readyRested'?'起動主要：將曾被自己效果休息的角色轉為活動':
    action.mode==='restNamedChoose'?'起動主要：休息前線的牧瀬紅莉栖，然後二選一':
    action.mode==='nameActive'?'起動主要：將這張椎名まゆり轉為活動':
    action.mode==='restPeek'?'起動主要：休息此角色，查看牌庫頂 1 張':
    action.mode==='lifeReenter'?'起動主要：將 1 張生命加入手牌，並獲得再登場或突襲':
    action.mode==='outsideActive'?'起動主要：棄 1 張手牌，使其他角色活動':
    action.mode==='frontDiscardBuff'?'起動主要：棄 1 張手牌，指定名稱與特徵 BP+1000':
    action.mode==='discardEventEnergy'?'起動主要：棄 1 張事件，本回合指定角色必要能源 -1':
    action.mode==='buff'?'主要能力：指定符合條件的角色 BP＋1000':'主要能力：先 ACTIVE 自己，再指定符合條件的角色 BP＋1000';
  case 'chooseBlock':return action.uid===null?'不阻擋':'使用 '+name()+' 阻擋';
  case 'chooseTrigger':
   if(action.mode==='skip')return '不使用此觸發';
   if(action.mode==='get')return '加入手牌';
   if(action.mode==='draw')return '抽 1 張';
   if(action.mode==='final')return 'FINAL 恢復生命';
   if(action.mode==='raid')return '使用 RAID 觸發 · '+destination()+' '+(action.slot+1);
   if(action.mode==='colorRestSkip')return 'COLOR：使 '+name()+' REST，下次不能 ACTIVE';
   if(action.mode==='colorOutside')return '從場外登場 '+name()+suffix();
   if(action.mode==='colorMayField')return 'COLOR：改以綠場域登場 '+name()+suffix();
   if(action.mode==='colorField')return 'COLOR：以場域代替角色登場 '+name()+suffix();
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
  case 'chooseRetirementOrder':return orderEffectLabel(pack,state,action,'先結算此退場效果');
  case 'chooseMoveEffectOrder':return orderEffectLabel(pack,state,action,
   String(action.key||'').startsWith('observer-')?'先處理場上角色取得的送場外反應':'先處理已取得的卡片移動能力');
  case 'chooseRestTuck':return action.mode==='rest'?
   'REST 此角色，選擇是否放置裏向底牌':'不發動 REST 放置';
  case 'chooseTuckMoved':return action.uid===null?
   '不放置裏向底牌':'將剛送場外的牌裏向放在角色下方';
  case 'chooseLifeOrder':return '先處理此公開 LIFE：'+name();
  case 'chooseLifeEffect':return '先結算登場效果：'+uiCardLabel(pack,state,state?.pending?.entries?.find(e=>e.key===action.key)?.sourceUid);
  case 'choosePhaseOrder':return orderEffectLabel(pack,state,action,'先結算此階段效果');
  case 'chooseApRecovery':
   if(action.uid===null)return '完成恢復 AP';
   return apPointRecord(pack,state,action.uid)?'啟動 '+name():'恢復 '+name();
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
   action.mode==='all'?'將目前場外的可選卡全部移入移除區，不結算後續':
   action.mode==='done'?'結束選擇，把已選的場外卡移入移除區':'將 '+name()+' 移入移除區';
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
  case 'chooseMayDrawDiscard':return action.mode==='draw'?
   '抽 1 張，再將 '+(state?.pending?.discardCount||1)+' 張手牌送至場外':'不抽牌、不棄牌';
  case 'chooseOptionalTuck':return action.mode==='tuck'?'將牌庫頂 1 張蓋到此角色下方':'不蓋牌';
  case 'chooseFacedownOutside':return '將蓋牌放到場外：'+name();
  case 'reorderUnder':return '調整蓋牌順序';
  case 'chooseMayDraw':return action.mode==='draw'?'抽1張':'不抽牌';
  case 'chooseNameDraw':return action.mode==='draw'?'名稱成立時抽 1 張':'不選這個名稱';
  case 'chooseRemovedOutside':return action.mode==='all'?'將符合名稱的除外卡全部送至場外':
   action.mode==='done'?'完成送至場外':'將 '+name()+' 送至場外';
  case 'chooseHandFrontActive':return '以 Active 登場於前線 '+(action.slot+1);
  case 'chooseRetireLifeOrHand':return action.mode==='skip'?'不選任何退場項目':
   action.mode==='life'?'將1張生命加入手牌':'將2張手牌送至場外';
  case 'chooseHiddenLifeHand':return '將1張生命加入手牌';
  case 'chooseRestReenter':return '以 Rest 登場於'+(action.line==='energy'?'能源線':'前線')+' '+(action.slot+1);
  case 'chooseHandTwoOutside':return '將 '+name()+' 送至場外';
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
  case 'chooseReturnRaidBase':return action.uid===null?'不將突襲底卡加入手牌':'將突襲底卡加入手牌';
  case 'chooseTopDeployRest':
   if(action.uid===null)return '不從查看的牌登場';
   if(action.line)return '將 '+name()+' 以休息狀態登場'+suffix();
   return '將 '+name()+' 放到牌庫底';
  case 'chooseReplayBase':return action.mode==='skip'?'不將底板重新登場':
   (action.mode==='active'?'ACTIVE 登場底板':'REST 登場底板')+suffix();
  case 'chooseNamedEnergy':return '讓 '+name()+' 本回合產能增加';
  case 'chooseActiveAp':
   return apPointRecord(pack,state,action.uid)?'將 '+name()+' 轉為活動':'將 '+name()+' 轉為 ACTIVE';
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
  case 'chooseGrantNamed':return action.uid===null?'不給予這項能力':'給予 '+name()+' 這個回合的能力';
  case 'choosePrintedApImpact':return action.uid===null?'不給予衝擊':'給予 '+name()+' 衝擊 1';
  case 'chooseSelfFront':return action.slot===null?'不移動到前線':'移動到前線 '+(action.slot+1);
  case 'chooseDifferentField':return action.uid===null?'不從場外登場':'以休息狀態登場 '+name()+suffix();
  case 'chooseOwnFieldRetire':return action.uid===null?'不退場場域':'退場場域 '+name();
  case 'chooseTopTraitEvent':return action.uid===null?'不加入手牌，將其餘卡排列至底部':'公開 '+name()+' 並加入手牌';
  case 'chooseTopOrder':
   if(action.place==='top')return '下一個放到牌庫頂：'+name();
   if(action.place==='bottom')return '下一個放到牌庫底：'+name();
   return '依序放回：'+name();
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
   '使 '+name()+' 以休息狀態登場'+suffix();
  case 'chooseRevealRetire':return '公開 '+name()+' 並放到牌底';
  case 'chooseRetireReferenced':return action.uid===null?'不使角色退場':'使 '+name()+' 退場';
  case 'chooseHandBlock':return '將 '+name()+' 放到場外';
  case 'chooseSubstituteRetire':return action.uid===null?'不代替，讓原本的角色退場':
   '改由 '+name()+' 退場';
  case 'chooseOutsidePrintedActive':return action.uid===null?'不登場':
   '使 '+name()+' 以活動狀態登場'+suffix();
  case 'chooseBounceIncludeSelf':return action.uid===null?'不放回手牌':
   '將 '+name()+' 放回手牌';
  case 'choosePrintedRestRaid':return action.uid===null?'不登場':
   (action.mode==='raid'?'以突襲登場：':'以休息狀態登場：')+name()+suffix();
  case 'chooseRemovedOkabeRaid':return '從移除區突襲：'+name();
  case 'chooseMayuriFork':return action.uid===null?'不指定對手角色':'指定 '+name();
  case 'chooseSuzuhaAttackEnd':return action.uid===null?'不將手牌放到場外':'將 '+name()+' 放到場外';
  case 'chooseFieldLeaveRemove':return action.mode==='remove'?'改放移除區':'留在場外';
  case 'chooseOutsideRestOrRaid':return action.uid===null?'不登場':
   (action.mode==='raid'?'以突襲登場：':'以休息狀態登場：')+name()+suffix();
  case 'chooseGrantBounceInstead':return action.uid===null?'不指定菜月昴':
   '指定 '+name()+'，直到下一次自己的回合開始';
  case 'chooseHandReenterUnder':return action.uid===null?'不將手牌放到場外':
   '將 '+name()+' 放到場外，並讓這張角色休息回到前線 '+(action.slot+1);
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
  case 'chooseAttackDiscardActive':return action.uid===null?'不棄牌，角色維持休息':
   '將 '+name()+' 放到場外，並使這張角色活動';
  case 'chooseTopHandOutside':return action.step==='outside'?'將 '+name()+' 送至場外':'將 '+name()+' 加入手牌';
  case 'chooseEnergyTraitFront':return action.uid===null?'不移動其餘能源線角色':'將 '+name()+' 移至前線 '+(action.slot+1);
  case 'chooseRemoveHandCap':return action.mode==='done'?'結束除外並退場':'將 '+name()+' 除外';
  case 'chooseNamedRequiredEnergy':return '指定需求能源 '+action.value;
  case 'chooseRevealedEnergyHand':return action.mode==='hand'?'將公開的卡加入手牌':'將公開的卡放回牌堆頂';
  case 'chooseMandatoryHandRemove':return '將 '+name()+' 除外';
  case 'chooseRequiredEnergy':return '本回合所需能量 +2：'+name();
  case 'chooseFrontGrant':return '本回合賦予 '+name()+' BP 與印刷的追加能力';
  case 'chooseRemovedEnter':return action.uid===null?'不從移除區登場':'讓 '+name()+' 從移除區休息登場';
  case 'chooseMainBuff':return '指定 '+name()+'，本回合 BP＋1000';
  case 'chooseOwnBuff':case 'chooseTraitBuff':case 'chooseRestBp':
  case 'chooseRetireAtMost':return '使 '+name()+' 退場';
  case 'chooseRetireAtLeast':case 'chooseRetireScaled':return action.uid===null?'不使角色退場':'使 '+name()+' 退場';
  case 'chooseRestOutsideEvents':return action.uid===null?'不使角色休息':'使 '+name()+' 休息';
  case 'chooseRestedRetire':return action.uid===null?'不使角色退場':'使 '+name()+' 退場';
  case 'chooseHandNamedRest':return action.uid===null?'不登場':'使 '+name()+' 以休息狀態登場';
  case 'chooseOutsidePrintedRest':return action.uid===null?'不登場':'使 '+name()+' 以休息狀態登場';
  case 'chooseGrantPrintedBlock':return action.uid===null?'不賦予防禦下限':'使 '+name()+' 不會被 BP4000 以上的角色阻擋';
  case 'chooseMoveOppFront':return action.uid===null?'不移動':'將 '+name()+' 移至能源線';
  case 'chooseRetireOwnOther':return action.uid===null?'不使卡片退場':'使 '+name()+' 退場';
  case 'chooseRemoveNamedZone':return action.uid===null?'不移入移除區':'將 '+name()+' 移入移除區';
  case 'chooseUnblockedRest':return action.uid===null?'不使角色休息':'使 '+name()+' 休息';
  case 'chooseRemoveOppField':return '將 '+name()+' 放入移除區';
  case 'chooseEnergySwap':return '與 '+name()+' 交換位置';
  case 'chooseRemovedSelfGrant':return action.uid===null?'不把移除區的卡放到場外':'將 '+name()+' 放到場外，並獲得 BP+1000 與衝擊 1';
  case 'chooseNameOrTraitBuff':return '本回合使 '+name()+' BP+1000';
  case 'chooseGrantNamedImpact':return action.uid===null?'不賦予衝擊':'使 '+name()+' 獲得衝擊 1';
  case 'chooseHandBpMay':return action.mode==='accept'?'視為 BP+1000':'維持原本 BP';
  case 'handActivate':return '支付 1 AP，公開這張手牌';
  case 'chooseHandDeployMay':return action.mode==='accept'?'視為 BP+1000 並休息登場':'維持原本 BP，留在手牌';
  case 'chooseHandRestEntry':return '以休息狀態登場'+suffix();
  case 'chooseActiveOther':return action.uid===null?'不使其他角色活動':'使 '+name()+' 活動';
  case 'chooseRestOwnFrontDraw':return '休息 '+name()+'，然後抽 1 張';
  case 'chooseRestOrRetire':return state?.pending?.mode==='retire'?'使 '+name()+' 退場':'使 '+name()+' 休息';
  case 'chooseRestSkipMayRetire':return action.mode==='retire'?'改為使 '+name()+' 退場':'使 '+name()+' 休息，下一次不活動';
  case 'chooseNamedRetireDraw':return '使 '+name()+' 退場';
  case 'chooseRetireBp':case 'chooseTargetMany':return action.uid===null?'完成目標選擇':'選擇第 '+(state?.pending?.selected?.length+1||1)+' 個角色';
  case 'chooseFrontEnergyGrant':return action.uid===null?
   '不指定暫時 FRONT 產能對象':'讓 '+name()+' 本回合在前線也能產生能源';
  case 'chooseApTaxGrant':return action.uid===null?
   '不指定 AP 加價保護角色':'令 '+name()+' 於對手下一回合被卡牌效果指定時，對手須額外支付 1 AP';
  case 'chooseAttackBan':return action.uid===null?'不指定攻擊禁止對象':
   '令 '+name()+' 至下個己方回合開始前不能攻擊';
  case 'chooseGrantAttack':return '授予 '+name()+' 本回合攻擊時抽牌';
  case 'chooseGrantRetire':return action.uid===null?'不授予退場時抽牌':'授予 '+name()+' 本回合退場時抽牌';
  case 'chooseGrantedRetireDraw':return action.mode==='draw'?'退場時抽 1 張':'不抽牌';
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
  case 'chooseMayDraw':return action.mode==='draw'?'抽 1 張':'不抽牌';
  case 'chooseShiftSlot':return '移到前線 '+(action.slot+1);
  case 'chooseEnergyShift':return action.uid===null?'不移動能源線角色':
   '將 '+name()+' 移到前線 '+(action.slot+1);
  case 'chooseRecoverEvent':return action.uid===null?'不加入手牌':'將 '+name()+' 加入手牌';
  case 'chooseOrderedSubset':{
   if(action.mode==='confirm')return '依印刷順序結算所選效果';
   const option=state?.pending?.options?.find(o=>o.id===action.id);
   if(typeof option?.label==='string'&&option.label.trim())return option.label;
   const op=option?.then?.[0]?.op;
   return op==='activeOwnOne'?'使 1 張己方角色活動':
    op==='buffOwnField'?'使 1 張己方角色本回合 BP＋2000':
    op==='restOppFrontOne'?'使 1 張對手前線休息':'選擇這個效果';
  }
  case 'chooseRestOwnField':return '休息 '+name()+'，然後抽 1 張並將 1 張手牌放到場外';
  case 'chooseHandActiveNoRaid':return action.uid===null?'不讓角色登場':
   '讓 '+name()+' 以活動狀態登場'+suffix();
  case 'chooseRemoveOutsideUpTo':return action.mode==='done'?'結束選擇場外角色':
   '將 '+name()+' 移入移除區';
  case 'chooseRemovedRestPair':return action.mode==='done'?'結束選擇移除區角色':
   action.mode==='place'?'讓 '+name()+' 以休息狀態登場'+suffix():'選擇 '+name();
  case 'chooseTopCharacterOutside':return action.uid===null?'不把角色放到場外':'將 '+name()+' 放到場外';
  case 'choosePeekTop':return action.mode==='outside'?'將牌庫頂放到場外':'把牌庫頂留在上面';
  case 'chooseRemoveFrontSelf':return '將 '+name()+' 與這張卡放入移除區';
  case 'chooseBounceNamedCut':return action.uid===null?'不把手牌角色返回手牌':'將 '+name()+' 返回手牌';
  case 'chooseFrontBpCut':return action.uid===null?'不降低敵方 BP':'使 '+name()+' 的 BP 降低';
  case 'chooseRevealTop':return action.mode==='bottom'?'將公開的牌放到牌庫底':'把公開的牌留在上面';
  case 'chooseLifeReenter':return '將 1 張生命加入手牌';
  case 'chooseSayakaReenter':return action.mode==='raid'?'以效果突襲'+suffix():'以休息狀態再登場'+suffix();
  case 'chooseTuckNamed':return action.uid===null?'不把角色放到牌庫底':'將 '+name()+' 放到牌庫底';
  case 'chooseHandGirlRest':return action.uid===null?'不從手牌休息登場':'讓 '+name()+' 以休息狀態登場'+suffix();
  case 'chooseMamiActive':return '使 '+name()+' 活動';
  case 'chooseDiscardNamedEnergy':return '棄掉事件 '+name();
  case 'chooseRestLock':return action.uid===null?'不鎖定這次休息':'休息鎖定 '+name();
  case 'choosePayDeploy':{
   if(action.mode!=='pay')return '不支付，留在場外';
   const ap=state?.pending?.ap;
   const cost=Number.isInteger(ap)&&ap>0?ap+' AP':'AP';
   return '支付 '+cost+'，以活動狀態登場';
  }
  case 'chooseDeploySelfActive':return '以活動狀態放到'+destination()+' '+(action.slot+1);
  case 'kmr':case 'kmr2':case 'iys':case 'kjn':case 'aot':case 'aot2':case 'csm':
   return closedTitleChoiceLabel(action,{pack,state});
  default:return unlabeledChoiceLabel(action,{pack,state})||'完成這個選擇';
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
function printedChoice(pack,owner,physical){
 const source=Array.isArray(pack)?pack[owner]:pack;
 const printed=source?.cards?.[physical.cardId];
 return {uid:physical.uid,cardId:physical.cardId,
  name:printed?.name||physical.cardId,color:printed?.color||'',side:owner};
}
function walkOwned(card,accept){
 if(!card)return null;
 if(accept(card))return card;
 for(const layer of [...(card.stack||[]),...(card.under||[])]){
  const hit=walkOwned(layer,accept);
  if(hit)return hit;
 }
 return null;
}
// The acting player already looked at this exact deck prefix. Show every
// card in that window, including ones that cannot be chosen. Search, look at
// the top, and mill use the same rule. Never walk the rest of the deck or
// the opponent's hidden zones. A new closed title inherits this by storing
// the full window on pending.uids, data.uids, or data.window.
export function controllerDeckWindowCards(state,packs,legal){
 const q=state?.pending;
 const listed=Array.isArray(q?.uids)&&q.uids.length?q.uids
  :q?.step==='lookOrder'&&Array.isArray(q?.data?.left)?q.data.left
  :Array.isArray(q?.data?.uids)&&q.data.uids.length?q.data.uids
  :Array.isArray(q?.data?.window)&&q.data.window.length?q.data.window
  :Array.isArray(q?.data?.windowUids)?q.data.windowUids:null;
 if(!q||q.player!==0||!Array.isArray(listed)||!listed.length)return [];
 const deck=state.players?.[0]?.deck;
 if(!Array.isArray(deck))return [];
 const window=deck.slice(0,listed.length);
 if(window.length!==listed.length||window.some((card,index)=>card?.uid!==listed[index]))
  return [];
 const order=q.phase==='order';
 return window.map(physical=>{
  const printed=printedChoice(packs,0,physical);
  const matches=(Array.isArray(legal)?legal:[]).filter(action=>action?.uid===physical.uid);
  const positional=matches.some(action=>action.line!=null||Number.isInteger(action.slot));
  const single=matches.length===1&&!positional;
  return {...printed,action:single?matches[0]:null,
   keepLegal:matches.length>1||positional,
   caption:single?(order?'下一個放到牌庫底':'點選此牌'):'目前不能選'};
 });
}
// Artwork for one legal choice. Own deck, life and facedown layers are used
// only when this action already names that physical UID. Opponent hand, life
// and every card under a revealed deck top stay closed.
function publicRevealChoice(pack,state,uid){
 if(typeof uid!=='string'||!uid)return null;
 const hit=(state.publicReveals||[]).find(entry=>entry?.uid===uid&&
  typeof entry.cardId==='string'&&entry.cardId);
 if(!hit)return null;
 const owner=hit.owner===0||hit.owner===1?hit.owner:Number(String(uid).split('-')[0]);
 if(owner!==0&&owner!==1)return null;
 const source=Array.isArray(pack)?pack[owner]:pack;
 const printed=source?.cards?.[hit.cardId];
 return {uid,cardId:hit.cardId,name:printed?.name||hit.cardId,
  color:printed?.color||'',side:owner};
}
export function controllerChoiceArt(pack,state,action){
 if(!state?.players||!action||typeof action!=='object'||state.pending?.player!==0)return [];
 const ids=[];
 const push=value=>{if(typeof value==='string'&&value&&!ids.includes(value))ids.push(value);};
 push(action.uid);
 if(action.uid==null){push(action.retireUid);push(action.targetUid);}
 if(Array.isArray(action.uids))for(const uid of action.uids)push(uid);
 const fromZones=ids.flatMap(uid=>{
  const found=findControllerCard(pack,state,uid);
  return found?[found]:[];
 });
 if(fromZones.length||ids.length)return fromZones;
 const ordered=orderChoiceSource(pack,state,action);
 if(ordered)return [ordered];
 // A deck-top choice names the card on the pending step. Own zones are visible
 // to the controller. A published opponent card uses that public identity.
 // Otherwise only deck[0] of this reveal step is readable.
 const pendingUid=state.pending?.data?.uid;
 if(typeof pendingUid!=='string')return [];
 const own=findControllerCard(pack,state,pendingUid);
 if(own)return [own];
 const revealed=publicRevealChoice(pack,state,pendingUid);
 if(revealed)return [revealed];
 // 公開 already happened. If the public list was dropped, the controller may
 // still see the one deck card this choice names. Never walk past deck[0].
 const named=namedRevealDeckTop(pack,state,pendingUid);
 return named?[named]:[];
}
// The pending step already names one revealed deck card. Read that top card
// only. Opponent hand, life, and every card under the top stay closed.
function namedRevealDeckTop(pack,state,uid){
 const q=state?.pending;
 if(!q||q.player!==0||typeof uid!=='string')return null;
 let owner=null;
 if(q.step==='oppTop')
  owner=q.data?.owner===0||q.data?.owner===1?q.data.owner:Number(String(uid).split('-')[0]);
 else if(q.step==='topPlace'||q.step==='revealTop')owner=0;
 else return null;
 if((owner!==0&&owner!==1)||(q.step!=='oppTop'&&owner!==0))return null;
 const top=state.players?.[owner]?.deck?.[0];
 if(!top||top.uid!==uid||typeof top.cardId!=='string'||!top.cardId)return null;
 return printedChoice(pack,owner,top);
}
const REVEAL_FOCUS_STEPS=new Set(['oppTop','topPlace','revealTop']);
// One card the current choice is about. Multi-card picks keep their own buttons.
export function pendingFocusCard(pack,state){
 const q=state?.pending;
 if(!q||q.player!==0||!REVEAL_FOCUS_STEPS.has(q.step))return null;
 const actions=Array.isArray(q.actions)?q.actions:[];
 if(actions.some(action=>typeof action?.uid==='string'&&action.uid))return null;
 const art=controllerChoiceArt(pack,state,{type:q.kind||'focus'});
 if(art.length!==1||typeof art[0]?.cardId!=='string'||!art[0].cardId)return null;
 const zone=q.step==='oppTop'||art[0].side===1?'對手牌組頂':'你的牌組頂';
 return {...art[0],zone};
}
// Life triggers and blocks already draw the card they are about. Mulligan is
// not an effect. Every other controller choice names its source with sourceUid.
const SOURCE_ART_SKIP=new Set(['life-trigger','block','opening-mulligan']);
// The character, or other card, whose effect opened this choice. Own deck and
// unrevealed life stay closed. An opponent card is shown only while face up.
export function pendingEffectSourceCard(pack,state){
 const q=state?.pending;
 if(!q||q.player!==0||SOURCE_ART_SKIP.has(q.kind))return null;
 const uid=typeof q.sourceUid==='string'?q.sourceUid:'';
 if(!uid)return null;
 const found=findPrintedCard(pack,state,uid,'effect');
 if(!found?.cardId)return null;
 const printed=(Array.isArray(pack)?pack[found.side]:pack)?.cards?.[found.cardId];
 return {...found,zone:printed?.type==='character'?'發動中的角色':'發動中的卡'};
}
function findControllerCard(pack,state,uid){
 return findPrintedCard(pack,state,uid,'choice');
}
// Several effects can be waiting, and each button names one of them. Show that
// effect's own card. LIFE order already has its own public reader.
function orderChoiceSource(pack,state,action){
 const q=state?.pending;
 if(!q||q.player!==0||!action)return null;
 let uid='';
 if(action.type==='chooseRaidOrder'&&q.kind==='raid-effect-order')
  uid=action.mode==='baseFirst'?q.baseUid:action.mode==='entryFirst'?q.raidUid:'';
 else if(['chooseMoveEffectOrder','choosePhaseOrder','chooseRetirementOrder'].includes(action.type)&&
  typeof action.key==='string'){
  const entry=(Array.isArray(q.entries)?q.entries:[]).find(item=>item?.key===action.key);
  uid=typeof entry?.sourceUid==='string'?entry.sourceUid:
   (typeof entry?.jobs?.[0]?.sourceUid==='string'?entry.jobs[0].sourceUid:'');
 }
 return typeof uid==='string'&&uid?findPrintedCard(pack,state,uid,'effect'):null;
}
function findPrintedCard(pack,state,uid,purpose){
 const point=apPointRecord(pack,state,uid);
 if(point)return {uid,cardId:point.id,name:point.name,color:'',side:Number(String(uid)[2])};
 const owner=Number(String(uid).split('-')[0]);
 if(owner!==0&&owner!==1)return null;
 const pl=state.players?.[owner];
 if(!pl)return null;
 const own=owner===0;
 const piles=[];
 const add=(cards,deep)=>{if(Array.isArray(cards))piles.push({cards,deep});};
 const faceUp=cards=>(Array.isArray(cards)?cards:[]).filter(card=>card&&card.faceDown!==true);
 if(own){
  add(pl.hand,false);add(pl.front,true);add(pl.energy,true);
  add(pl.outside,false);add(pl.removed,false);add(pl.lifeRevealed,false);
  if(purpose==='effect')add(pl.resolvingEvents,false);
  else{add(pl.life,false);add(pl.deck,false);}
 }else{
  add(faceUp(pl.front),false);
  add(faceUp(pl.energy),false);
  add(pl.outside,false);add(pl.removed,false);add(pl.lifeRevealed,false);
  if(purpose==='effect')add(faceUp(pl.resolvingEvents),false);
 }
 for(const pile of piles){
  for(const card of pile.cards){
   if(!card)continue;
   const hit=pile.deep?walkOwned(card,entry=>entry?.uid===uid&&entry.cardId&&
    (own||entry.faceDown!==true)?entry:null):
    (card.uid===uid&&card.cardId&&(own||card.faceDown!==true)?card:null);
   if(hit)return printedChoice(pack,owner,hit);
  }
 }
 return null;
}
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
// The controller sees every inspected card in deck order. Search, look at the
// top, and mill all use this list. A card with exactly one non-positional
// legal action is clickable. Cards that need a destination keep their
// existing buttons. Cards with no legal action stay on screen, disabled.
// A new pending kind does not need a new entry here: if it carries inspected,
// every card is shown. Closed titles match actions of their own kind.
const INSPECTED_ACTION_TYPES={
 'effect-top-filter-choice':'chooseTopFiltered',
 'effect-top-filter-many-choice':'chooseTopFilteredMany',
 'effect-top-trait-event':'chooseTopTraitEvent',
 'effect-top-trait-outside':'chooseTopTraitOutside',
 'effect-search-deck':'chooseDeckSearch',
 'effect-search-deck-multi':'chooseDeckSearchMulti',
 'effect-wyrm-look':'chooseWyrmLook',
 'effect-top-character-outside':'chooseTopCharacterOutside',
 'effect-top-deploy':'chooseTopDeploy',
 'effect-top-deploy-rest':'chooseTopDeployRest',
 iys:'iys',kmr:'kmr',kmr2:'kmr2',kjn:'kjn',aot:'aot',aot2:'aot2',mmm2:'mmm2',csm:'csm'
};
export function inspectedPendingChoiceCards(privateChoices,legal){
 const inspected=privateChoices?.inspected;
 if(!Array.isArray(inspected)||!Array.isArray(legal))return [];
 const kind=privateChoices?.kind;
 const type=INSPECTED_ACTION_TYPES[kind]||(CLOSED_CHOICE_TYPES.has(kind)?kind:null);
 const seen=new Set();
 return inspected.flatMap(card=>{
  if(!card||typeof card.uid!=='string'||!card.uid||
   typeof card.cardId!=='string'||!card.cardId||seen.has(card.uid))return [];
  seen.add(card.uid);
  const matches=legal.filter(a=>a?.uid===card.uid&&
   (type?a.type===type:true)&&
   a.mode!=='skip'&&a.mode!=='done'&&
   (kind!=='iys'||a.mode==='take'||a.mode==='next'));
  const positional=matches.some(a=>a.line!=null||Number.isInteger(a.slot));
  return [{uid:card.uid,cardId:card.cardId,
   name:typeof card.name==='string'&&card.name?card.name:card.cardId,
   color:typeof card.color==='string'?card.color:'',
   action:matches.length===1&&!positional?matches[0]:null,
   keepLegal:matches.length>1||(matches.length===1&&positional)}];
 });
}
// Fallback artwork for legal pending actions that identify the viewer's own
// hand or a PUBLIC outside card. Only data already present in the sanitized
// viewer=0 public view is used; opponent hands, decks, life and hidden layers
// are never inspected. Legal actions are passed through unchanged.
export function visiblePendingChoiceCards(view,action){
 const players=view?.players;
 if(!Array.isArray(players)||!action||typeof action!=='object')return [];
 const ids=Array.isArray(action.uids)&&action.uids.length?action.uids:[action.uid];
 const candidates=[
  ...((Array.isArray(players[0]?.hand)?players[0].hand:[])
   .map(card=>({card,side:0}))),
  // Outside and removed are public; the opponent's hand/deck/life remain hidden.
  ...players.slice(0,2).flatMap((player,side)=>
   ['outside','removed'].flatMap(zone=>
    (Array.isArray(player?.[zone])?player[zone]:[])
     .map(card=>({card,side}))))
 ];
 return ids.flatMap(uid=>{
  if(typeof uid!=='string'||!uid)return [];
  const hit=candidates.find(({card})=>card?.uid===uid&&!card.faceDown&&
   typeof card.cardId==='string'&&card.cardId);
  return hit?[{cardId:hit.card.cardId,side:hit.side}]:[];
 });
}
// Card-art candidates for effects with both a placement choice and another
// outcome (e.g. outside -> hand OR REST enter). This is controller-only data.
// Never look through the opponent's hand, deck, life or face-down layers.
// Actual choices are still validated by the reducer's unchanged legal list.
export function pendingEntryChoiceCards(privateChoices,view,legal){
 const uids=[...new Set((Array.isArray(legal)?legal:[])
  .filter(action=>boardEntryMode(action))
  .map(action=>action.uid))];
 return uids.map(uid=>{
  const option=(privateChoices?.options||[]).find(item=>item?.action?.uid===uid);
  const authorized=pendingChoiceCards(option)[0]||
   (privateChoices?.inspected||[]).find(card=>card?.uid===uid&&card.cardId);
  const visible=visiblePendingChoiceCards(view,{uid})[0];
  const card=authorized?{...authorized,side:0}:visible||null;
  return {uid,cardId:card?.cardId||null,side:card?.side??0,
   name:card?.name||card?.cardId||'可登場角色'};
 });
}
// LIFE-order targets are already publicly revealed. A deferred on-play
// entry may use only a controller-visible hand card or public field/outside
// identity. Never inspect unrevealed LIFE, deck, or opponent hand.
export function publicLifeOrderChoiceCard(view,pending,action){
 if(pending?.kind!=='life-batch-order'||!view||!action||
  (pending.player!==0&&pending.player!==1))return null;
 const owner=pending.player;
 const publicReveal=uid=>(Array.isArray(view.publicReveals)?view.publicReveals:[])
  .find(item=>item?.uid===uid&&item.owner===owner&&
   typeof item.cardId==='string'&&item.cardId)||null;
 if(action.type==='chooseLifeOrder'){
  if(!Array.isArray(pending.choices)||!pending.choices.includes(action.uid))return null;
  const revealed=publicReveal(action.uid);
  return revealed?{cardId:revealed.cardId,side:owner,uid:action.uid}:null;
 }
 if(action.type!=='chooseLifeEffect')return null;
 const entry=(Array.isArray(pending.entries)?pending.entries:[])
  .find(item=>item?.key===action.key);
 const uid=entry?.sourceUid;
 if(typeof uid!=='string'||!uid.startsWith(owner+'-'))return null;
 const player=view.players?.[owner];
 const shown=[...(player?.front||[]),...(player?.energy||[]),
  ...(player?.outside||[]),...(player?.removed||[]),
  ...(owner===0?(player?.hand||[]):[])];
 const physical=shown.find(card=>card?.uid===uid&&!card.faceDown&&
  typeof card.cardId==='string'&&card.cardId);
 const cardId=physical?.cardId||publicReveal(uid)?.cardId;
 return cardId?{cardId,side:owner,uid}:null;
}
// Resolve a pending target only against face-up PUBLIC field slots. This
// works for both controllers (self/opponent) but never exposes hidden hand,
// deck, life, or face-down under-card identities. A UID must match exactly.
export function publicPendingTargetCard(view,action){
 const uid=action?.uid;
 if(typeof uid!=='string'||!uid||!Array.isArray(view?.players))return null;
 for(const [side,player] of view.players.entries()){
  if(side!==0&&side!==1)continue;
  for(const line of ['front','energy']){
   const slots=Array.isArray(player?.[line])?player[line]:[];
   const index=slots.findIndex(card=>card?.uid===uid&&
    typeof card.cardId==='string'&&card.cardId);
   if(index>=0)return {side,line,index,cardId:slots[index].cardId,
    bp:line==='front'?slots[index].bp:null};
  }
 }
 return null;
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
 const japanese=text(card.effectJa);
 const body=effect&&effect!=='-'?effect:(japanese&&japanese!=='-'?japanese:'');
 const trigger=text(card.triggerText)||text(card.triggerTextJa)||text(card.triggerEffect);
 const skip=new Set(['','-','無 Trigger。','無觸發。']);
 const kana=(body.match(/[ぁ-んァ-ン]/g)||[]).length;
 const official=japanese&&japanese!=='-'&&japanese!==body&&kana>=8?('官方原文：\n'+japanese):'';
 const parts=[body,official,!skip.has(trigger)?('觸發效果：'+trigger):''].filter(part=>part&&!skip.has(part));
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
// Bright yellow markers reflect the CURRENT public attack, not a printed
// keyword inferred from a card's appearance. Ordinary attacks stay uncluttered.
export function attackKeywordBadges(battle){
 if(!battle||typeof battle!=='object')return [];
 const badges=[];
 if(Number.isInteger(battle.damage)&&battle.damage>1)
  badges.push({type:'damage',text:'直傷'+battle.damage});
 if(Number.isInteger(battle.impact)&&battle.impact>0)
  badges.push({type:'impact',text:'衝擊'+battle.impact});
 return badges;
}
// Use canonical V2 live values for each occupied FRONT slot, even outside
// a pending block and when the physical card is REST.
export function frontAttackKeywordBadges(packs,state,side,index){
 if(![0,1].includes(side)||!Number.isInteger(index)||index<0||index>3)return [];
 const front=state?.players?.[side]?.front?.[index];
 if(!front)return [];
 return attackKeywordBadges({
  damage:universalAttackDamage(packs,state,front),
  impact:universalImpact(packs,state,front)
 });
}
// Inline controls are derived only from the defender's legal actions and
// public FRONT cards. Readiness alone is insufficient (block restrictions,
// compulsory blockers and effects that allow a rested character to block).
export function inlineBlockDecision(view,legal,viewer=0){
 if(view?.status!=='playing'||view.pending?.kind!=='block'||
  view.pending.player!==viewer||view.actor!==viewer||!view.battle||
  view.battle.owner===viewer)return null;
 const battle=view.battle;
 if(!view.players?.[battle.owner]?.front?.some(c=>c?.uid===battle.uid))return null;
 const front=view.players?.[viewer]?.front||[];
 const actions=(Array.isArray(legal)?legal:[]).filter(a=>a?.type==='chooseBlock');
 const blockers=actions.filter(a=>typeof a.uid==='string'&&front.some(c=>c?.uid===a.uid));
 const skipAction=actions.find(a=>a.uid===null)||null;
 return blockers.length||skipAction?{battle,blockers,skipAction}:null;
}
// Movement in the normal move phase is two clicks: choose a character in
// its current row, then click a reducer-approved destination in the other row.
// Neither click invents actions; full-row replacement must match replaceUid.
export function moveClickPlan({selectedUid,slotUid,line,slot,legal}){
 const options=(Array.isArray(legal)?legal:[]).filter(a=>a?.type==='move'||a?.type==='step');
 const destinations=options.filter(a=>a.uid===selectedUid&&a.slot===slot&&
  (a.type==='move'?'front':'energy')===line&&
  (slotUid?a.replaceUid===slotUid:a.replaceUid===undefined));
 if(destinations.length)return {type:'destination',actions:destinations};
 if(slotUid&&options.some(a=>a.uid===slotUid))return {type:'choose-mover',uid:slotUid};
 return {type:'select'};
}
// Kept for callers that still describe the older base-then-slot raid gesture.
// The battle table uses entryClickPlan: choose the character, then the mode, then the cell.
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
// Character entry from hand, outside, or removed. The action must already be
// in the legal list; this only decides which click submits it.
const NORMAL_BOARD_ENTRY=new Set([
 'play','chooseOutsideExactRest','chooseOutsideColorApRest','chooseOutsideTraitApRest',
 'chooseOutsideActivePair','chooseOutsideNameRest','chooseOutsideRest',
 'chooseOutsidePrintedRest','chooseOutsidePrintedActive','chooseOutsidePrinted',
 'chooseHandNamedRest','chooseHandRest','chooseHandRestCap','chooseHandGirlRest',
 'chooseRemovedEnter','chooseNamedZoneDeploy',
  'chooseOutsideUse','chooseOutsideReferenced','chooseRestReenter',
  'chooseDeployOutside','chooseOutsideExcept','chooseOutsideColorRest',
  'chooseOutsideColorTraitActive','chooseHandFreshName','chooseHandRestEntry',
  'chooseRaidBaseRest','chooseHandFrontActive','chooseDeploySelfActive'
]);
// kmr, kjn, mmm2 and aot2 character entry use this set too: select the physical card,
// then 突襲進場 or 普通進場 only when the print allows both.
// Ordinary entry taps the destination cell. Raid taps the base, then the
// destination cell, the same two clicks as a paid Raid.
// Do not list one execute button per destination. A REST-only print such as
// Epsilon, Beta, or a raidless yellow Zeke stays normal entry and does not
// invent Raid.
const MODE_BOARD_ENTRY=new Set([
 'choosePrintedRestRaid','chooseOutsideRestOrRaid','chooseHandRestOrRaid',
 'chooseNamedOutside','chooseOutsideTraitlessRest','chooseRemovedRestPair',
 'chooseOutsideOrRest','chooseSayakaReenter','kmr','kjn','mmm2','aot2','csm'
]);
export function boardEntryMode(action){
 if(!action||typeof action.uid!=='string'||!action.uid)return null;
 if(!Number.isInteger(action.slot)||action.slot<0||action.slot>3)return null;
 if(action.type==='raid'){
  if(action.line!=null&&action.line!=='front'&&action.line!=='energy')return null;
  return 'raid';
 }
 if(action.line!=='front'&&action.line!=='energy')return null;
 if(action.type==='play'||NORMAL_BOARD_ENTRY.has(action.type))return 'normal';
 if(action.type==='chooseRemovedOkabeRaid'||action.type==='chooseOutsideRaid')return 'raid';
 if(action.type==='chooseTrigger'&&(action.mode==='color'||action.mode==='colorOutside'))
  return 'normal';
 // RAID life is staged in the dialog first. Once the player chooses 突襲,
 // the revealed card's uid is stamped on and this becomes the shared
 // base-then-cell gesture. An unstamped engine action stays a text choice.
 if(action.type==='chooseTrigger'&&action.mode==='raid')return 'raid';
 if(!MODE_BOARD_ENTRY.has(action.type))return null;
 // Epsilon and Beta print REST entry only. mode dest is that cell.
 // Do not treat any other kjn mode as Raid.
 if(action.type==='kjn')return action.mode==='dest'?'normal':null;
 if(action.type==='csm')return action.mode==='deploy'?'normal':null;
 if(action.mode==='raid')return 'raid';
 if(action.mode==='enter'||action.mode==='place'||action.mode==='rest')return 'normal';
 return null;
}
export function boardEntrySelection(legal,uid){
 const mine=(Array.isArray(legal)?legal:[]).filter(action=>
  boardEntryMode(action)&&action.uid===uid);
 const normal=mine.filter(action=>boardEntryMode(action)==='normal');
 const raid=mine.filter(action=>boardEntryMode(action)==='raid');
 // Only effects explicitly presenting both entry modes require a mode button.
 // Paid hand cards choose ordinary entry by cell, or Raid by tapping a base.
 const paidRaid=raid.some(action=>action.type==='raid');
 return {normal,raid,needsMode:normal.length>0&&raid.length>0&&!paidRaid};
}
function entryDestination(action,line,slot,slotUid){
 const dest=action.line==='energy'?'energy':'front';
 if(dest!==line||action.slot!==slot)return false;
 if(typeof action.replaceUid==='string')return action.replaceUid===slotUid;
 if(boardEntryMode(action)==='raid'&&action.baseUid&&slotUid&&action.baseUid===slotUid)
  return true;
 if(slotUid&&action.baseUid&&action.baseUid!==slotUid)return false;
 return !slotUid;
}
// Select the character first. When both rest entry and raid are legal, the
// mode click comes next. Ordinary entry then taps the cell. Raid taps the
// base, then the destination cell. One matching action submits.
export function entryClickPlan({selectedUid,entryMode,raidBaseUid=null,line,slot,slotUid,legal}){
 const selection=boardEntrySelection(legal,selectedUid);
 if(!selection.normal.length&&!selection.raid.length)return {type:'idle'};
 const paidRaid=selection.raid.some(action=>action.type==='raid');
 // Standard paid play: empty legal cell = ordinary entry. Tapping a legal
 // Raid base enters the two-step base -> destination flow; no mode button.
 if(paidRaid){
  const baseCandidate=slotUid&&selection.raid.some(action=>action.baseUid===slotUid);
  if(entryMode!=='normal'&&baseCandidate&&raidBaseUid!==slotUid)
   return {type:'raid-base',baseUid:slotUid};
  if(raidBaseUid){
   const hits=selection.raid.filter(action=>action.baseUid===raidBaseUid&&
    entryDestination(action,line,slot,slotUid));
   return hits.length?{type:'entry',mode:'raid',actions:hits}:{type:'entry-wait',mode:'raid'};
  }
  // An explicitly entered Raid gesture cannot silently become ordinary play
  // by clicking another occupied cell before choosing its legitimate base.
  if(entryMode==='raid')return {type:'entry-wait',mode:'raid'};
  const hits=selection.normal.filter(action=>entryDestination(action,line,slot,slotUid));
  return hits.length?{type:'entry',mode:'normal',actions:hits}:{type:'entry-wait',mode:'normal'};
 }
 // Effect entry, including kmr and EX15BT/BLC-4-054: choose the card, then
 // 普通進場 or 突襲進場 only when both are printed. Ordinary entry taps the
 // cell. Raid uses the same base, then destination, clicks as a paid Raid.
 const mode=entryMode==='raid'&&selection.raid.length?'raid':
  entryMode==='normal'&&selection.normal.length?'normal':
  selection.needsMode?null:selection.raid.length?'raid':'normal';
 if(!mode)return {type:'entry-mode'};
 if(mode==='raid'&&selection.raid.some(action=>action.baseUid)){
  const baseCandidate=slotUid&&selection.raid.some(action=>action.baseUid===slotUid);
  if(baseCandidate&&raidBaseUid!==slotUid)
   return {type:'raid-base',baseUid:slotUid};
  if(raidBaseUid){
   const hits=selection.raid.filter(action=>action.baseUid===raidBaseUid&&
    entryDestination(action,line,slot,slotUid));
   return hits.length?{type:'entry',mode:'raid',actions:hits}:{type:'entry-wait',mode:'raid'};
  }
  return {type:'entry-wait',mode:'raid'};
 }
 const hits=(mode==='raid'?selection.raid:selection.normal)
  .filter(action=>entryDestination(action,line,slot,slotUid));
 return hits.length?{type:'entry',mode,actions:hits}:{type:'entry-wait',mode};
}
