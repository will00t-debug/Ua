# UNION ARENA V2 R48 — 官方真卡全印刷、來源可達性及五作品回查

> 本檔為 2026-10-24 R48 人工官方核對，**不是**全面獨立逐卡 FAQ 認證。現有 V2 舊卡的部分驗收與 FAQ0 必須分開。所有數量以 `node scripts/v2-r48-official-readiness-report.mjs` 即時計算，不接受歷史快照作真實母數。

## 一、官方高風險差異

### BLC-4-069 京楽 春水 — PARTIAL；FAQ Q2337、Q2338
日本官方：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-069

官方全文核對：綠 CHARACTER，必要綠 5、AP 1、BP 4000、綠產 1、護廷十三隊，RAID〈京楽 春水〉，RAID LIFE。注意攻擊結束效果**沒有**限定「必須為 Raid 狀態」，不採用 legacy 翻譯「以下僅在突襲狀態適用」。每次真正攻擊結束時，自己 OUTSIDE 有至少四種不同印刷卡名的綠 EVENT／FIELD，可選最多一張自己 ENERGY 角色與自身交換位置。Q2337：BLOCK 戰鬥後；直接傷害時 LIFE trigger check 後。登場時本回合下一張印刷特徵「花天狂骨」手牌使用 AP−1，Q2338：非合格手牌使用不消耗此一次折扣。

**現成共用能力，不可重寫**：`attackEndSwap`、`countOwnOutsideDistinctPrintedNames`、`nextEligibleHandPlayApDiscount`、Raid／RAID LIFE。已正式登錄的原始來源四種是 BLC-1-094（尸魂界／FIELD）、BLC-1-097（隊首羽織／EVENT）、BLC-1-099（天地灰尽／EVENT）、BLC-1-100（卍解／EVENT）。相同卡名的 BLC-4-080 卍解不得當成第五種。正式 EVENT 使用會進 OUTSIDE，但普通 ENERGY FIELD 被覆蓋時進 REMOVED，**不**可誤當 OUTSIDE。因此先前單靠這四張、且聲稱合法覆蓋 FIELD 可獲四名的來源測試是無效證據。

**R48 批次移植來源卡**：BLC-1-095「護廷十三隊」，UA08BT/BLC-1-095，綠 EVENT，必要綠 2、AP 1、產能 0、沒有 LIFE trigger，官方完整效果是 TOP4 擇至多二張印刷特徵「護廷十三隊」公開加入手牌，其餘自選順序放牌庫底。官方：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-095。直接使用既有 `searchTopUpToTwoBottom`（count4, max2, filters trait, rest bottom），無新增引擎原語。這提供第四種不同綠 EVENT 卡名，取代不可達 OUTSIDE 的 FIELD。真卡逐 UID、0／2 張、AI、牌庫底排序驗收記錄於 `tests/v2-r48-BLC-1-095-complete.test.mjs`；四來源合法 EVENT 行動於 `tests/v2-r48-four-official-green-sources.test.mjs`。以 CI 的最終成功作為結論條件。

**尚阻塞 BLC-4-069 正式整卡登錄**：印刷特徵「花天狂骨」相關 BLC-4-076、BLC-4-077、BLC-4-081 仍未列正式 registry，無法在真正 50 張 BLEACH 可玩牌組完成 Q2338 合格手牌使用、一次性消耗及非法操作全套實測；且必須對整張真正 069 做合法攻擊、BLOCK、LIFE、Raid、交換及存檔驗收。R48 不加進 registry，不能將純函式已有能力直接當成全印刷認證。

### BLC-4-042 涅 マユリ — PARTIAL；FAQ Q2323
官方：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-042

藍 CHARACTER，必要藍3、AP1、BP2000、**印刷產能藍2**、護廷十三隊、DRAW LIFE。Legacy `dist/expansion-cards.mjs` `gen:3` 與官方實物藍2 不符；正式註冊前必須加像 BLC-4-014 一樣的雙重印刷來源 pin 與正規化，而不是直接承襲3。登場時必選三模式之一：
- A：TOP2 依任意 0／1／2 張與合法次序放 TOP，其餘真實送 OUTSIDE。既有 `inspectTopAnyOutside` 可部分直接重用，但需置入 `chooseOne` 並驗收真實 pending。
- B：可選不支付，或完整支付自己的手牌**兩個不同物理 UID**進 OUTSIDE；全部費用完成後從最新 OUTSIDE 選最多一張印刷名「涅 マユリ」或「涅 ネム」回 HAND。R46 `discardGate` 只有單張來源限定支付，**不能**拿兩次單張支付假裝同一原子費用；仍缺 count2 的嚴格 pending／恢復／取消與 paid source proof。
- C：可使己方**其他**角色真正退場，完成適用 onRetire 後，從目前手牌選最多一張藍色**印刷卡名**〈涅骸部隊〉以 ACTIVE 登場 ENERGY，不額外付正常手牌 AP。**官方 BLC-2-044 涅骸部隊是 FIELD，不是 CHARACTER**，官方 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-044 ，Q2323 僅限定精確印刷名，不能誤以同名特徵是合格；也不能錯誤限制角色才可登場。當前 V2 `deployNamedFromZones` 主要限 CHARACTER，需要通用 FIELD 來源與 onPlay 支援；BLC-2-044 自身有兩個 MAIN 效果仍未完整移植。

故 BLC-4-042 整張不能 READY。避免註冊三選一空殼或作品專屬硬編碼。優先解鎖**多 UID 手費原子支付**及**手牌指定印刷名 FIELD 免費 ACTIVE 入 ENERGY（退休後）**，每個新共用原語完成立刻重跑 R48 五作品掃描。

## 二、R46 跨作品五張完整日文印刷及 FAQ 核對

這五張均為人工全文核對且為 PARTIAL，不因命中「戰鬥勝利」關鍵字就宣稱 READY：

| ID | 官方全文來源／FAQ | 正確語意與尚缺共用能力 |
|---|---|---|
| TTG-1-067 | [官方 UA56BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-067)，Q2295 | 赤4 AP2 BP3500；ACTIVE 登場；BP>=4000 角色不可 BLOCK；登場至本回合賦予勝戰抽1與狙擊、ACTIVE LIFE。缺組合式暫時授權與戰鬥勝利事件整卡測試。 |
| SLG-1-021 | [官方 UA51BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-021)，Q2028 | 紫5 AP1 BP4000+；Raid、外區每5張攻擊+BP500、BP>=6000 Impact1、戰勝時依場外每5張動態提高 BP 回收上限且不能回收同名，登場賦予必須 BLOCK；RAID LIFE。缺動態上限與整張時序、BLOCK 強制規則。 |
| SAO-1-018 | [官方 UA15BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-018) | 黃4 AP1 BP4000，亦視〈ユージオ〉；Raid、Impact1、Impact null；退場時各選至多1張〈キリト〉與〈アリス〉BP+1000且賦予 Impact null，本回合；RAID LIFE。不是只有戰勝後傷害。 |
| SAO-1-070 | [官方 UA15BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-070) | 綠3 AP1 BP3500+，ALO；自己的 OUTSIDE 〈ユウキ〉＋〈マザーズ・ロザリオ〉總數達4，己回 BP+500；達6 取得 Impact1。這是累計**張數**與兩門檻，不是不同印刷名。 |
| MST-1-009 | [官方 UA54BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-009)，Q2147 | 藍3 AP1 BP3500+，Raid、Impact1、己方回合 BP+500；若自身由己方效果登場，強制 chooseOne：至下次己方回合開始 BP+1000，**或**本回合取得自身 attack-end 交換至多一張 ENERGY 角色；RAID LIFE。此為「選擇後暫時授予」原語，不是永久 attackEndSwap。 |

## 三、動態全庫重掃與分類

`scripts/v2-r48-official-readiness-report.mjs` 直接呼叫既有 R35 `capabilityIndex()`、`v2AllTitleInventory()`、R46 戰勝掃描、R47 攻擊結束掃描。每次實際執行重新取得當時 registry 中**全部未移植** 700來源 UID 的補集，按十類文字線索廣搜而不以文字等價為 READY，人工檢查結果只記缺口與 FAQ，不新增平行卡牌庫。BLC-4-069、BLC-4-042、BLC-2-044 及上述五張都保留 PARTIAL；其餘沒做完整官方核對維持 REVIEW PENDING。0 張候選可因關鍵字而自動 READY。若某候選將來全印刷整合通過，必須更新測試、source pins、manifest、registry 及本報告。配套 `tests/v2-r48-unported-rescan.test.mjs` 守住五作品 700 張、互斥分類與 UID 守恆。

## 四、下一輪最高重用價值序

1. **真實來源限定 count2 手牌支付**：加到已存在 `discardGate` pending，首次選擇前可整體不付；開始支付後不可只支付一張就拿效果，保存兩個不同 UID、恢復時按支付記錄原子驗證、支付後從目前 OUTSIDE 重新選取精確印刷名。
2. **通用免費 FIELD ACTIVE 入 ENERGY**：改造 `deployNamedFromZones` 既有選擇、物理 move、onPlay 觸發，不能誤用角色限定。與 `retireOwnCharacterOne` 的 excludeSelf／真正 retire 事件之後串接；驗收 BLC-4-042 模式 C 及完整 BLC-2-044 前提。
3. **可授予之一次性攻擊結束換位**：在 R47 真 attack-end pending／UID／stamp 上表達「本回合取得」，並維持 LIFE Q2147 時序，優先 MST-1-009。
4. **合格特徵 花天狂骨 真卡**：人工核對 BLC-4-076／077／081 其他所有印刷能力，選擇可全印刷移植者，做出 BLC-4-069 Q2338 的真實手牌出牌證據；其後才完整移植 069。
5. **跨作品戰勝來源觀測＋動態回收**：優先 TTG-1-067、SLG-1-021；不要忽略對應的狙擊、BP 上限、強制 BLOCK 與 Raid LIFE。

## 五、保留不得誤判的原有疑義

- MST-1-067 Q2162 保護來源範圍。
- BLC-4-034 裏向底卡與真正退場時序。
- 未經官方確認的第二批巢狀 LIFE。
- 多目標合併 AP 與棄手附加費用的未確認語意。

**安全邊界**：GPT Draft PR #78，base cursor PR #77；不合 main、不部署、不 force push、不改 Cursor、不登錄半成品。全面獨立逐卡 FAQ 認證尚是 **0**；本輪局部官方卡文核對、完整單卡測試不得替代此全量認證。
