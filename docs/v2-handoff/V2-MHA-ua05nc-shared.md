# UA05NC / MHA-3 共用操作

這次加的都是通用操作，引擎不看卡號。

- `cardOnceChoose`：這張實體卡一回合一次，起動後做一個既有的二選一。
- `nameSharedProgram`：同名一回合一次。`scope:'nameIncludingGained'` 時，獲得這個效果的角色跟原名共用同一個計數。可以休息，也可以掛一個既有的場上條件。
- `enemyBpDown` 的 `belowPrinted:true`：目標的現在 BP 必須低於自己的原 BP。
- `grantOnAttack` 的 `traitless:true` 且 `optional:false`：必須選 1 張沒有特徵的自己角色，把「攻擊時最多抽 1」交給它。
- `buffOwnField` 的 `conditionalImpactName` / `conditionalImpactMinBp`：選中的那個名字，在這個回合 BP 達到門檻時才有衝擊 1。
- `drawBottomSkipNextActive`：攻擊時抽 1，必須把 1 張自己的手牌放到自己牌庫底，然後這張卡下一次不會活動。
- `oppFieldCurrentBpBelowPrinted`：對手的場（前線與能量線）有角色的現在 BP 低於原 BP。
- `fieldReturnHandApDiscount`：本回合自己的角色從前線或能量線回到手牌，而且本回合還沒有從手牌打出消耗 AP 為 0 的同名卡時，手牌中的此卡消耗 AP-1。移除區打出不算。誰把角色彈回手牌不影響條件。
- `drawBpIfOwnFieldReturned`：攻擊時若上述回手牌已經發生，抽 1，此角色本回合 BP+500。
- `grantOwnFrontAuraThisTurn`：登場時獲得「自己前線的所有角色本回合 BP+N」。來源可以在能量線，接受者必須在前線。下一個回合開始就消失。
- `grantSelfStayWardUntilNextOwnStart`：登場當下自己場上有指定名字時，直到下一次自己的回合開始，效果退場不成立、BP 減少不加、對手的效果不能選。戰鬥與 BP 0 的規則退場仍然退場。返回手牌和移除不是退場。

2026-11-17 公開卡面：005 蛙吹梅雨、007 切島銳兒郎，009 空場減的紅六角是 1。這三張和 001–004、006 都進書卡對戰包。008、010、011 與 AP 編號仍沒有公開卡面。官方 FAQ 仍是 0。

併上第二彈 73 張對戰包時，第一彈仍是 109，點卡仍是 3 張且在自己的包。正式入口是 `mha-live-109-73-3-8`。

牌組畫面讀的是作品目錄。目錄現在是 109+73+3+8。007 的「退場せず」沒有官方 FAQ，範圍寫在上面那條共用操作。
