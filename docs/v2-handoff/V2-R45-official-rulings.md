# UNION ARENA V2 — R45 A 官方全文／FAQ 來源限定效果審核
日期：2026-10-23。原 GPT Draft PR #78 / `gpt/v2-resume-20261022`，不合併、不部署。

## 已逐字核對的四張完整官方印刷與 FAQ

1. [SAO-1-087／キリト／Q763、Q978](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-087)：綠色必要能源7、AP1、BP5000、GGO、Raid〈キリト〉、Impact 1、其他己方角色**戰鬥獲勝**時自身取得本回合 DAMAGE2、僅對手回合 EVENT 卡效果明文「選ぶ」自身時，對手額外從自己手牌送場外1張、MAIN Turn1 選其他己方角色 BP+1000、RAID LIFE。Q763 明確含己方其他角色**攻擊**時攻擊者 BP≥阻擋者 BP，及己方其他角色**防守**時防守者 BP>攻擊者 BP；不能只觀察進攻方。Q978：另選合法角色或合法選0張免付；無手牌不得選此目標。
2. [SAO-2-064／キリト／Q1208](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-064)：綠色必要能源4、AP1、BP4000、ALO、FRONT 存在期間讓自己場上卡名〈アスナ〉獲得只在對手回合受到 CHARACTER 或 EVENT 來源明文選擇時，對手額外手牌1張送場外之費用；多張此〈キリト〉授予同一目標**不疊加**（Q1208 仍僅1張）。DRAW LIFE。己方其他〈アスナ〉不限 FRONT，只要在己方場上且符合官方卡名判定。
3. [BLC-4-069／京楽 春水／Q2337、Q2338](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-069)：綠色必要能源5、AP1、BP4000、護廷十三隊、Raid〈京楽 春水〉；這張角色攻擊結束時，自己**場外**綠色 EVENT／FIELD 的**不同印刷卡名合計**≥4，可選最多一張自己的 ENERGY 角色與自身交換 FRONT／ENERGY 位置。登場時本回合**下一張符合［特徴：花天狂骨］**且從手牌使用的卡 AP−1。RAID LIFE。Q2337：有戰鬥者戰鬥結束後觸發；對玩家造成傷害者在 LIFE Trigger check 完成後觸發。Q2338：在此之前先用不合格手牌卡，不消耗這次折扣。Q2338 **不涉及位置交換時序**。
4. [BLC-4-042／涅 マユリ／Q2323](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-042)：藍色必要能源3、AP1、BP2000、發生藍色2、護廷十三隊、DRAW LIFE。登場時必須選三模式其中一種：(i) TOP2 查看，任意張依任意順序放回牌頂，其餘場外；(ii) 可支付**兩張**自己手牌→場外，成功後從自己場外回收最多一張印刷卡名〈涅 マユリ〉或〈涅 ネム〉；(iii) 可令其他己方角色**真退場**，成功後從自己手牌讓最多一張**藍色且印刷卡名精確為〈涅骸部隊〉** ACTIVE 登場 ENERGY。Q2323 明確：只有*特徵*〈涅骸部隊〉不合格。三模式須共用原有 chooseOne／TOP-N／棄牌 pending／真退場／特殊登場。

## Q978/Q1208 嚴格語意矩陣

| 判定 | SAO-1-087 自身 | SAO-2-064 授予〈アスナ〉 |
|---|---|---|
| 作用期間 | **對手**回合 | **對手**回合 |
| 來源 | 只有 **EVENT** | **CHARACTER 或 EVENT** |
| 來源位置 | 自身在自己場上，官方未限 FRONT | 授予來源必須在自己 FRONT |
| 目標 | 自己這張實體 UID | 自己場上符合〈アスナ〉印刷卡名的其他實體 UID |
| 棄手牌 | 選擇者從**自己的合法手牌**送場外1張；付款前不能確認目標 | 同左 |
| 多個來源 | 尚無對 087 多重交錯來源之獨立 Q&A，保留嚴格界線 | **Q1208 明定不疊加**，兩張來源仍棄1張 |
| 零手牌 | 此受保護目標不能被選 | 同左（Q978 直接規定；同等付款條件） |
| 其他合法目標或選0 | 不收費 | 不收費 |
| 普通攻擊／阻擋 | 不屬於效果「選擇」 | 同左 |
| LIFE Trigger | 不可從 EVENT 卡種推斷為 EVENT 效果；來源是 Trigger，未有允許計稅的官方依據 | 同左 |
| 全體而未明文選擇 | 不收 | 不收 |
| 多目標／其他額外 AP 同時加價 | **仍需逐項證據與原子付款設計**，不自行猜測或合併成本 | 同左 |

**明確區分三種引擎操作：**額外棄 hand→outside 的費用、額外支付 AP、以及完全不可被明文效果選擇。事件必選目標的付款能力必須在印刷 AP 扣除前預檢（Q1119）；如果只有受保護且無法支付的目標，不能先播放 EVENT 才要求付款。

## Batch A gate：完整真卡驗收狀態
- SAO-1-087：**PARTIAL**；source-specific hand discard tax、雙方戰鬥獲勝暫時 DAMAGE2、MAIN Turn1、Raid/Impact/RAID LIFE 均需完整核對與真實局驗收。
- SAO-2-064：**PARTIAL**；來源 FRONT 授予、卡名、非疊加、DRAW LIFE、合法選擇與原子支付整套缺口未驗收。
- BLC-4-069：**PARTIAL**；攻擊結束 exchange timing/UID、不同卡名計數尚無可安全套用的完整原語。Q2338 只證明已有 AP 折扣不應被不合格手牌使用消耗。
- BLC-4-042：**PARTIAL**；選一模式三條均需全部完成，不能只驗 TOP2。
- MST-1-067 Q2162、BLC-4-034 Raid 底層真退場、第二批 nested LIFE 維持安全阻塞。
- 目前**未批准任何新卡登錄**；本文件屬來源審核，不是程式已完成或 CI 通過證明。
