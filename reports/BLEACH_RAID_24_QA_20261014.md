# BLEACH — 24 張 Raid 卡基本判定 QA（2026-10-14）

## 來源與規則
- 官方綜合規則 / FAQ Q51：沒有實際疊放合法底板的普通登場卡不能使用 Raid 框內能力；框外能力按原規則處理。
- 官方單卡資料：https://www.unionarena-tcg.com/jp/cardlist/
- 起始牌組一護 [UA08ST/BLC-1-104](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08ST%2FBLC-1-104)、FAQ Q574：起動能力位於 Raid 框內，普通登場不應使用。
- 白哉 [EX15BT/BLC-4-053](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-053)、FAQ Q2326/Q2327：Raid 中、自己的回合、敵前線至少三個角色 BP 低於原本 BP，才具有 DAMAGE 2。官方最新卡表文字與路基亞卡表均為「3 張」；專案曾註記原始卡圖疑似「1 張」，保留差異記錄。
- 官方 FAQ Q2330：角色失去印刷能力時，即使 Raid 疊卡還存在，相關框內能力也無效。

## 覆蓋率定義
1. ✅ **48/48 基本情境**：每張 Raid 卡各有一個普通登場（確保無底板）及一個真正以合法底板進行 Raid（確保底板、角色 ACTIVE、卡片守恆）的引擎測試。
2. ✅ **條件式專項**：UA08ST 104 起動能力在普通登場時封鎖、真 Raid 可發動、失去印刷能力時封鎖；EX15BT 053 於 0/1/2/3 名敵方降 BP 角色及敵方回合的 DAMAGE 2 判定。
3. ✅ **補強舊版 16 張**：以 `raidBox` 資料標記框內/框外 entry、ability、attack 類能力，並有普通登場的基本防漏測試。
4. ⚠️ **尚非全卡官方 FAQ 逐一驗收**：各張特殊 Raid 的每個選擇/支付 AP/退場/Trigger/複數角色共同每回合限制/跨回合效應，不能由這 48 次基本對照測試推斷全數正確。
5. ⚠️ **未做手機實機畫面對戰**：本輪測試是在 Node.js 引擎與 GitHub Actions 執行，不是人眼操作正式網站。正式版在 PR 合併/部署前不會更新。

## 24 張逐張基本 Raid 對照表

| 系列 | 卡號 | 卡名 | 普通登場 | 合法 Raid | 額外專項 |
|---|---|---|---|---|---|
| UA08BT | BLC-1-004 | 艾斯・諾特 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-014 | 邦比愛塔 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-020 | 雨葛蘭 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-024 | 友哈巴赫 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-041 | 黑崎一護 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-047 | 阿散井戀次 | ✅ | ✅ | 框外 AP 能力保留；框內登場受限 |
| UA08BT | BLC-1-050 | 朽木白哉 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-053 | 朽木露琪亞 | ✅ | ✅ | 普通登場不抽3棄2、不發動 BP+500 |
| UA08BT | BLC-1-070 | 卯之花八千流 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-085 | 日番谷冬獅郎 | ✅ | ✅ | 尚需效果逐項驗收 |
| UA08BT | BLC-1-093 | 山本元柳齋重國 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX07BT | BLC-2-019 | 黑崎一護 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX07BT | BLC-2-034 | 朽木露琪亞 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX07BT | BLC-2-038 | 涅繭利 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX07BT | BLC-2-057 | 修多羅千手丸 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX07BT | BLC-2-065 | 狛村左陣 | ✅ | ✅ | 追加框內防護、失去印刷能力、橫置／回手／IMPACT 實際結算；尚非全 FAQ 驗收 |
| EX07BT | BLC-2-067 | 更木劍八 | ✅ | ✅ | 高費底板 DAMAGE 2、回手替代、印刷效果喪失；尚非全 FAQ 驗收 |
| EX15BT | BLC-4-012 | 雨葛蘭 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX15BT | BLC-4-033 | 四楓院夜一 | ✅ | ✅ | Raid 狀態下的 ACTIVE 登場 |
| EX15BT | BLC-4-050 | 阿散井戀次 | ✅ | ✅ | Raid 限定起動能力 |
| EX15BT | BLC-4-053 | 朽木白哉 | ✅ | ✅ | 條件式 DAMAGE 2：3 名敵方 BP 降低 |
| EX15BT | BLC-4-069 | 京樂春水 | ✅ | ✅ | 框外登場 AP 減免 |
| EX15BT | BLC-4-075 | 浮竹十四郎 | ✅ | ✅ | 框外登場抽牌與起動能力 |
| UA08ST | BLC-1-104 | 黑崎一護（起始牌組） | ✅ | ✅ | 起動能力：Raid 限定；FAQ Q574/Q2330 |

## 實際修改
- `dist/extra-rules.mjs`：舊版 16 張 Raid 卡的框內/外 metadata。
- `dist/engine.mjs`：依物理疊卡狀態判定 boxed entry/main/attack/raidImpact；起始牌組一護特殊起動能力受 Raid 狀態與 silence 限制；白哉 Damage2 需三名 BP 低於印刷 BP 且為己方回合。
- `dist/expansion-cards.mjs`：白哉卡文更新為官方目前版本的 3 名。
- `tests/bleach-all-24-raid-qa.test.mjs`：全部24張各2種登場模式，外加起始牌組一護及白哉條件。
- `tests/raid-box-normal-play.test.mjs`：舊版 16 張及 7 張擴充新卡的代表性行為測試。
- `tests/engine.test.mjs`、`tests/official-faq.test.mjs`：既有 Raid 效果 FAQ 測試改為真正存在底板的局面，避免非法普通登場也能通過。

## CI
- GitHub Actions run: https://github.com/will00t-debug/Ua/actions/runs/38504128070
- 結果 **741 tests, 741 pass, 0 fail**。
- 工作分支：`fix/bleach-raid-box-real-20261014` / PR #49。
- **未合併 main，未部署正式網站。**

## 接續「錯誤修改」：狛村常駐能力漏判修正

- 再讀官方 EX07BT/BLC-2-065 卡表及卡圖，確認 IMPACT 無效、敵方橫置／回手抗性也位於 Raid 框內。原 48 個基本登場案例沒有實際攻擊或施加這些效果，因而未抓到漏判。
- 以共用 `printedRuleActive` 判斷這些常駐能力，普通登場及失去印刷能力時不啟用；真正 Raid 仍保留。回合開始自動送走頂卡的印刷能力亦受效果喪失限制。
- 官方 [EX15BT/BLC-4-057 Q2330](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-057)：失去原有效果會令 Raid 框能力失效，物理 Raid 堆疊仍保留。
- 狛村 Q1052 指明「不能被橫置」不免除後續不能 ACTIVE 的效果。修正冬獅郎 085、露琪亞 034 遇到抗橫置目標時整段跳過 ACTIVE 限制的問題；二者的卡文分別見 [085/Q569](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT/BLC-1-085)、[034](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT/BLC-2-034)。這是依卡文與 Q1052 做的跨卡判定，並非有獨立 FAQ 指名此配對。
- `tests/raid-komamura-passives.test.mjs`：16 個新案例，透過合法登場/事件/攻擊指令驗證普通登場、真 Raid、失去印刷效果、回手時底板場外處理、生命實際減少、ACTIVE 限制與下一回合頂卡保留，均檢查 50 張實體卡 UID 守恆。牌面身分與部分中途狀態為受控 fixture，非手機實機對戰。
- 本機 Node 24 全套回歸 **782/782 通過，0 fail**（舊段落的 741 是前一筆 CI 紀錄，不能視為本次基準總數）；Node 22 GitHub CI 另行確認。維持 PR #49 Draft，不合併或部署。

## 接續：劍八離場替代與失去印刷效果

- 上一輪 `f6a2345` 的 Node 22 [GitHub CI 38507358775](https://github.com/will00t-debug/Ua/actions/runs/38507358775) 已確認成功。
- 再核對官方 [EX07BT/BLC-2-067](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT/BLC-2-067)：能源 4 以上底板的替代能力涵蓋「因敵方效果或戰鬥離場」，不只退場。既有引擎的回手路徑漏掉選擇；現已接入同一個支付手牌／去 Raid 頂卡流程，拒絕時按原回手目的地結算。
- 官方 [EX15BT/BLC-4-057 Q2330/Q2332](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT/BLC-4-057)：消除印刷效果後，劍八不能繼續抗降 BP 或使用離場替代；已結算的本回合 +1000 BP／DAMAGE 2 保留。
- `tests/kenpachi-leave-replacement.test.mjs` 新增 10 個案例：回手替代接受／拒絕、非法支付不改狀態、ACTIVE／REST 繼承、普通登場／低費底板／無手牌封鎖替代、真實使用 057 後再降 BP／退場、已給予增益保留。均從 50 張牌組建立實體卡並檢查 UID 守恆，敵方能源供應與特定狀態使用受控 fixture。
- 仍需補齊生命 RAID Trigger、所有跨卡／戰鬥替代連鎖及手機操作驗收，不宣稱劍八或全 24 張 FAQ 已完整完成。PR #49 保持 Draft，不合併、不發布。

- 本輪 Node 24 本機 `npm test`：**792/792 pass，0 fail**；Node 22 CI 由本次 PR 更新觸發。

## 生命 Trigger 沒有顯示：整合公開翻牌介面

- 原因：BLEACH 的 `modalContent` 為保護 AI 私人選擇而隱藏 AI 的效果視窗，但主畫面沒有獨立的公開生命翻牌區。翻牌與效果結算完成後只留下文字紀錄。
- 沿用 PR #31 / `feature/direct-placement-trigger-display` 已有的公開翻牌程式，先整合 Trigger 功能到 PR #49，不覆蓋此前狛村／劍八修正；後續已另外檢查並整合直接點格子登場。
- 受傷瞬間記錄每張公開生命卡（包含無 Trigger 與 DAMAGE 2 同時翻牌），主畫面保留最近 3 張的卡圖、卡號、Trigger 效果及等待／不發動／已發動／加入手牌／Raid 結果；可查看最近 60 次翻牌。
- 人類 Trigger 選擇視窗另顯示來源卡。AI 私人查看牌庫選項仍不渲染；只以已公開翻牌歷史及 `revealed` 來源顯示。補上舊存檔正停在 Trigger 選擇時的顯示與結算後歷史保存。
- `tests/public-trigger-display.test.mjs` 8 項包含真實 `dispatch` 與載入實際 `app.mjs`、AI 定時決策、翻牌紀錄按鈕、舊存檔選擇按鈕、GET、重複翻開同卡、雙傷害與私人資訊不外洩。全套本機 Node24 **800/800 pass，0 fail**；語法檢查通過。
- 曾嘗試 Playwright 手機尺寸視覺檢查，但此環境沒有 Chromium 可執行檔，因此本輪 UI 驗證是可執行 DOM 測試，未宣稱手機實機／截圖驗收。正式網站仍未部署。

## 接續：普通登場直接點格子 + 突襲需明確啟動（2026-10-14）

- 延續 PR #31 中獨立驗證過的直接登場互動：選擇手牌後，前線與能源線任何合法空格都能直接點擊登場；一般登場仍為 REST，合法動作／支付成本均交由引擎驗證。
- Raid 卡被選中時**不會自動開始 Raid**。普通點格子一律普通登場；若要 Raid，須先按「突襲」再選合法底板、位置並確認。無底板的普通登場仍不能啟用 Raid 框內效果（本 PR 先前的規則修正）。
- 選牌欄移除普通登場多餘的前線／能源線切換，移動階段仍可直接點合法格子；消除未選任何 Raid 時空格也被誤標示 `raid-base-selected` 的 CSS 狀態錯誤。
- 更新 `tests/raid-placement.test.mjs` 六個導引 Raid 用例，新增 `tests/direct-placement-ui.test.mjs` 實際 app DOM/存檔/前線與能源線出牌／明確 Raid／AP／高亮回歸。生命 Trigger 原有 `tests/public-trigger-display.test.mjs` 維持，不覆寫隱私保護。
- 初次 CI 38508895446 為 **800/801 通過**，唯一失敗是新測試沿用 PR #31 舊視窗標題；現已修正測試字串並補空格高亮防漏回歸。最後一版 CI 結果須查詢，不可將 800/801 誤寫為全部通過。
- 仍維持 PR #49 Draft，不合併 main、不部署。手機實機視覺驗收及 24 張 Raid 全 FAQ 逐卡驗收尚未完成。
