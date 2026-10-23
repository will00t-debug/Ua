# R51 — 通用場外指定名稱實體張數門檻（2026-10-24）

工作分支 `gpt/v2-resume-20261022`，GPT Draft PR #78，base `cursor/v2-multi-retire-life-6ff5`。不合 main、不部署、不改 Cursor PR #77、不 force push。

## 接續基準：R50 已完成，不能重做

本輪開工 HEAD `7c0817e03f0fcd9f368c1d18f0881ec2597acb06`（R50 Q770 每張實體 FIELD 各自使用 Turn1 的修正與交接文件）。R50 已將 BLC-2-044、BLC-4-042、BLC-4-069、BLC-4-076 加入正式 BLEACH registry 和獨立 manifest，並加入真卡與兩張同名 FIELD 的負例測試；這四張不是本輪新增。R50 最新 HEAD 沒有可由 GitHub connector 的 PR-only workflow 查詢確認的成功 CI，**不可借用 R49 的綠燈**。

依最新獨立 literal manifest：BLEACH 103、TTG 36、SLG 45、SAO 103、MST 54，共 **341／700**；未移植 **359**。此為 manifest 快照，最新程式實際驗收仍以遠端 Node22 + manifest + 五作品矩陣為準。全量獨立逐卡 FAQ 認證仍為 0。

## 新共用原語：ownOutsideNamedCountAtLeast

官方全文例：**UA15BT/SAO-1-070 アスナ**，https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-070 。

- 綠 CHARACTER／必要綠3／AP1／BP3500+／綠產1／ALO／無 LIFE。
- 自己 OUTSIDE 的〈ユウキ〉與〈マザーズ・ロザリオ〉合計實體卡達 **4 張**，自己回合 BP+500。
- 合計達 **6 張**，獲得 IMPACT1；這個門檻本身不限制己方回合。
- **合計張數不是不同印刷卡名數**：不可誤用 R45 Q2337 的 `countOwnOutsideDistinctPrintedNames`。同一張有兩個合法卡名的物理卡也只算一次。
- Q87 等已存在的明確印刷卡名 alias 規則透過共用 `cardHasName`，不由文字推測別名。
- 只查 OWN OUTSIDE；不包含對手 OUTSIDE、手牌、REMOVED、Raid 底層或場上角色。

本輪完成的實際共用程式：

1. `dist/universal-v2/field-conditions.mjs`：從當前物理 OUTSIDE 即時計算符合任一指定卡名的**實體張數**，無快取。
2. `dist/universal-v2/pack.mjs`：新增嚴格 `ownOutsideNamedCountAtLeast` 印刷條件 schema（`turn`、`min`、非空唯一 `names`），拒絕額外鍵、非法門檻、重複名字或錯誤型別。重用現有 `passiveBonuses` BP／IMPACT 計算，不加作品專屬 reducer。
3. `tests/v2-r51-named-outside-count.test.mjs`：0/3/4/5/6 門檻、合法 alias 同一 UID 不重複、對手 OUTSIDE 排除、手牌/REMOVED/底層排除、自己回合 BP 與雙方回合 IMPACT 區別、非法 schema；另在合法 50 張模型牌組使用真正 `universalBp`／`universalImpact`／UID／JSON round-trip 測試。
4. `scripts/v2-r51-named-outside-candidate-report.mjs` ＋ `tests/v2-r51-named-outside-rescan.test.mjs`：直接重用 R35 `capabilityIndex()` 和現有五作品 700 ID registry 補集，動態掃描所有未移植真卡；所有關鍵字候選只標 REVIEW PENDING，沒有自動 READY。

### 正式卡牌移植狀態

**SAO-1-070 尚未登錄**。本輪已核對完整官方日文卡文，但仍須確認 50 張合法真實 SAO 牌組中〈ユウキ〉與〈マザーズ・ロザリオ〉來源均已完整登錄，實際操作達到 6 張 OUTSIDE、對手回合／攻擊獲勝 Impact、LIFE、來源 pin、獨立 manifest 及跨作品回歸。只用合成模型達成 6 張不能聲稱整張官方真卡驗收。暫列 PARTIAL，不增加卡數。

## 遠端驗收與未完成

GitHub connector 可以直接修改工作分支，但本執行環境無法 DNS 連線 clone；因此 **本輪尚未在本地跑 Node.js 22 `npm test`**。Connector `fetch_commit_workflow_runs` 只回傳 PR-triggered run，對 push-triggered workflow 可能回空；**沒有新 SHA 的 CI SUCCESS 證據，不可聲稱測試通過**。

下一輪務必：

1. 核對最新 HEAD 對應 GitHub Actions 的實際 job 與 Node22 失敗原因（若有），先修復回歸，不刪測試。
2. 跑 `npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`，及 R35～R51 全庫腳本。
3. 確認本輪新的 `ownOutsideNamedCountAtLeast` 在所有五作品 359 未移植真卡的候選；完整日文卡文與 FAQ 審核後才 READY。
4. 優先補合法〈マザーズ・ロザリオ〉來源與 SAO-1-070 全印刷真卡實戰；如沒有安全來源，維持 PARTIAL。
5. 保留 MST-1-067 Q2162、BLC-4-034 裏向底退場、未確認第二批巢狀 LIFE、合併 AP＋棄手費用阻塞。

本輪所有新增 SHA 及 CI 以 PR #78 當下最新 HEAD 為準；沒有修改 Cursor PR、main 或 Vercel 正式站。


## 追加來源追蹤：〈マザーズ・ロザリオ〉

重新搜尋原始 `dist/sao-official-import.mjs`，找到未登錄的官方 `SAO-1-100`（UA15BT 綠 EVENT、必要綠4／AP1、SPECIAL LIFE）。其完整效果是選對手 FRONT BP5000 以下角色，通常回手；若自己 OUTSIDE 的〈ユウキ〉與〈マザーズ・ロザリオ〉合計 **3 張以上**，改為真正退場。這張卡**不能當成無能力事件卡**直接登錄來湊 SAO-1-070 的六張來源；必須先完成通用「依 OWN OUTSIDE 指定名稱總張數，選擇回手或真正退場」效果、SPECIAL LIFE、來源 UID／目標合法性／實際真牌驗收。官方來源：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-100 。

因此 R51 下一輪最高重用路線為：已完成的 `ownOutsideNamedCountAtLeast` → 新的來源限定條件式 bounce-or-retire（重用現有真正回手／真退場）→ SAO-1-100 完整真卡 → 以真正 SAO 牌組驗收 SAO-1-070 的 4/6 門檻。每新增共用能力重新搜尋五作品未移植卡，不預先聲稱 READY。


### 官方 Q767 必須保留的效果支付／來源時序

`SAO-1-100` 官方 Q767（2024-01-19）：使用前自己場外合計只有 2 張時，**不能**把正在從手牌使用的 `SAO-1-100` 本身算作第 3 張。EVENT 卡要在**該 EVENT 效果處理完成後**才放入場外。下一輪的條件式回手／退場引擎必須在此時間點取樣，並測試使用前 2→回手、使用前 3→真正退場兩種完整真實流程；不能因為共用物理移動日誌先記錄 hand→outside 而提前成立。來源：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-100 。
