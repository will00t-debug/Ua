# MHA 下一輪共用操作

基準是 PR #454，`cursor/v2-round15-integrate-65f8` 的 `a22d510eda60f3d4736bcebf4aaddc47aa860af8`。這一輪只加通用 DSL。沒有寫 MHA 卡牌程式，沒有把未完成卡標成 ready，也沒有依卡號硬編碼。

IMC 維持 113／113、`playable:true`。MHA 維持 77／109 ready、32 pending、`playable:false`。`UA10ST_PRODUCT.recipe` 維持 null。沒有合併 `main`，沒有套用 #456，也沒有部署。

`main` 已合併的 #449、#452、#455 介面修正留在 `main`。這條分支沒有整檔覆蓋 `dist/app.mjs`、`dist/index.html`、`dist/styles.css` 或 `dist/clean.css`。後續整合必須保留那些修改。

## 複製同列起動

`{op:'gainSameLineMains', oncePerTurn:true, excludeNames:[字串]}`

`excludeNames` 是 0 到 4 個不重複的名稱。起動模式是 `gainLineMains`。結算時把同一列其他角色當下的印刷【起動メイン】做成快照，記在這張角色的 `gainedMains`。快照略過自己、另一列、蓋牌、被沉默、名稱在 `excludeNames` 裡、沒有起動，以及突襲框裡且目前不是正面突襲的起動。沒有可複製的角色也會用掉這一回合。

之後的重放是 `{type:'activate', uid, mode, gained:來源 uid}`。每回合鍵是「這張角色|gained|來源 uid」，所以來源自己的每回合限制還在。重放走原本的起動處理，支付、合法目標與結算都留在那個處理裡。目前會提供按鈕的是 `onceTuckFacedown`、`payHandMoveOrSwap`、`payHandGrantImpact`、`onceMandatorySwapLines`，以及 `frontOnceProgram`。還沒對到按鈕的起動仍留在快照裡，不會被提供。因此 004 維持 pending。

手牌付不出時，支付類重放不會出現；硬送會在寫入重放鍵之前被拒絕。選到的手牌在支付前離開，那個選擇不合法。來源在快照之後離場，複製仍在。偽造的 `gainedMains` 會被拒絕。回合更換或這張角色離場時，快照清除。

`grantSelfAttackDamageThisTurn` 這類會回頭核對印刷起動的後段，也接受已經使用過的同列快照裡的同一步。

## 依蓋牌張數的額外阻擋與攻擊

`facedownKeywordThresholds:[{atLeast, keyword}]`

角色欄位，1 到 2 條，關鍵字只能是 `doubleBlock` 或 `doubleAttack`，且不重複。`atLeast` 是 1 到 8。只數這張角色正下方的蓋牌，在宣告攻擊或阻擋的當下計算。2 張給雙重阻擋，4 張同時給雙重攻擊，1 張都沒有。沉默後都沒有。先拿掉一張再宣告，就失去對應關鍵字。第一次會把角色活動，第二次不會再活動。牌庫是空的時候，既有的 `onceTuckFacedown` 不會提供。

## 依底板張數的 BP

`bpPerDirectFacedown:{amount, turn}`

`amount` 是 500 到 5000 的 500 倍數。`turn` 是 `own`、`opponent` 或 `any`。BP 加上「直接蓋牌張數 × amount」。牌堆裡的蓋牌與正面下方卡不算。沉默後不加。`own` 在對手回合不加。

## 攻擊時查看底板並入手

`{op:'lookUnderToHandThenActive', max:1, optional:true, excludeName?}`

只放在角色的攻擊時。沒有直接蓋牌就不開選擇。控制者看得到每一張蓋牌；對手的私人選擇是 null。跳過則不入手，也不活動。選中的蓋牌必須還在下面，然後正面加入手牌。有加入，且場上還有其他自己角色、又不是 `excludeName`，才開可跳過的活動選擇。沒有那樣的角色時，入手的卡留在手牌，攻擊繼續進入阻擋。`max` 不是 1、空白名稱，或放在攻擊以外的時機，都會被拒絕。

## 依手牌張數的退場上限

`{op:'retireOppFrontUnderBp', bp, handAtMost:{atMost, bp, other:true}}`

基本 `bp` 與較高的 `bp` 都是 500 的倍數，而且較高的那個更大。`atMost` 是 0 到 10。`other:true` 時，來源若還在手牌就不計入張數；事件已經打出時，剩下的手牌就是其他手牌。選擇開著的時候手牌變多，超過基本上限的目標會掉出合法清單；手牌變少，較高上限裡的目標會進來。結算時再算一次。已經離開前線的目標不能選。已經加上的 BP 範圍會記在這個選擇上，手牌變化時不會丟掉。

## 仍維持 pending 的鄰近卡

002、003、005、011 的共用形狀在第 15 輪已經能寫，這輪核對後仍能建包，程式沒有寫。026 的可選磨 3 張後，回收可以是特徵或卡名，`excludeName` 會排除指名卡；突襲名與印刷衝擊已有，程式沒有寫。004、038、085、090、099 也維持 pending。

後續八張的共用契約在 `docs/v2-handoff/V2-MHA-final8-shared.md`。上面這段是當時的 pending 狀態。
