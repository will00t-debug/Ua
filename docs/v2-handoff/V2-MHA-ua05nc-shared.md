# UA05NC / MHA-3 共用操作

這次加的都是通用操作，引擎不看卡號。

- `cardOnceChoose`：這張實體卡一回合一次，起動後做一個既有的二選一。
- `nameSharedProgram`：同名一回合一次。`scope:'nameIncludingGained'` 時，獲得這個效果的角色跟原名共用同一個計數。可以休息，也可以掛一個既有的場上條件。
- `enemyBpDown` 的 `belowPrinted:true`：目標的現在 BP 必須低於自己的原 BP。
- `grantOnAttack` 的 `traitless:true` 且 `optional:false`：必須選 1 張沒有特徵的自己角色，把「攻擊時最多抽 1」交給它。
- `buffOwnField` 的 `conditionalImpactName` / `conditionalImpactMinBp`：選中的那個名字，在這個回合 BP 達到門檻時才有衝擊 1。
- `drawBottomSkipNextActive`：攻擊時抽 1，必須把 1 張自己的手牌放到自己牌庫底，然後這張卡下一次不會活動。
- `oppFieldCurrentBpBelowPrinted`：對手的場（前線與能量線）有角色的現在 BP 低於原 BP。

MHA-3-002 沒有改。MHA-3-009 的攻擊句已接上，空場紅六角的減免數字卡面上看不清，所以維持 pending。005、007、008、010、011 與 AP 編號仍沒有公開卡面。
