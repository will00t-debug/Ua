# UNION ARENA V2｜GPT 專項驗收矩陣（藍「我拒絕」／綠「白劍」）

> **狀態：進行中，未認證全數 PASS。** 本文只記錄實際對照與新舊測試，沒有將「CI全綠」視為逐卡個別FAQ已合格。官方日文印刷效果請點各卡官方頁（版權考量不全文轉錄）；以下逐效果以繁體中文摘要標示，官方日本語字句以連結原始資料為準。

- 基準：Cursor PR #89 `cursor/v2-blc-three-decks-6ff5`，`ba2cf8fae9978ac833e4ccf4fd505d9f340017b7`，Actions 40083017238 SUCCESS。
- GPT 獨立工作 PR #90 `gpt/v2-blc-blue-green-faq-20261024`，base Cursor 分支，不操作 Cursor HEAD、main、正式站、或 AI 策略。
- 僅以 `dist/universal-v2/bleach-designated-decks.mjs` 的 `reject-blue` 和 `white-sword` 為牌組來源，完整來源卡號、卡名與投入量保留。使用者原樣每組 13 種 50 張。
- 證據：官方 [卡表](https://www.unionarena-tcg.com/jp/cardlist/)、[FAQ](https://www.unionarena-tcg.com/jp/faq/)；發行系列 [EX07BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT)、[UA08BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA08BT)、[EX15BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT)。
- 核查位置：`dist/universal-v2/bleach-pack.mjs` / `dist/universal-v2/engine.mjs` / `dist/universal-v2/continuous-states.mjs` / `tests/v2-c22-designated-decks.test.mjs` / `tests/v2-c23-blue-shared.test.mjs` / `tests/v2-c24-green-shared.test.mjs` / `tests/v2-gpt-blue-green-official-faq-and-real-games.test.mjs`。
- 狀態用語：`PASS` = 該測試點有官方依據且在指定 SHA 的 CI 經執行成功；`FAIL` = 該測試點遭實驗證偽；`NOT TESTED` = 尚無直接可重現完備案例；`RULE UNCLEAR` = 來源裁定歧義待查。**沒有個別 FAQ 時必須註明「官方卡牌個別 FAQ 未查得」但不代表合格。** 本表「未完成認證」不等同已有實際功能錯誤。

## 藍色「我拒絕」13 種（不可用同名異版代替）

| 官方卡號／原印刷 | 數值／類型 | 印刷效果分段摘要與 LIFE | 該卡個別 FAQ | DSL／測試定位與正反例 | 本次全面認證 |
|---|---|---|---|---|---|
| [`EX07BT/BLC-2-016`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-016) 黑崎一護 | 0 / AP1 / BP1500 / 產能1 | 角色；登場抽1並棄1；DRAW | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C22、C23；來源棄牌案例；印刷數值與一般登場回歸有測；尚未逐效果極限認證 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-034`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034) 毒峰莉露卡 | 0 / AP1 / BP1000 / 產能1 | 角色；一護棄手觀察→REST後裏向壓底；能源登場ACTIVE；REST+退場取回壓底；COLOR | Q2315, Q2316 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-4-034 tuck/recover；faq-facedown-ui；正例及隱藏資訊證據已有；其他競合效果待驗 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-021`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-021) 斬月 | 0 / AP1 / BP1500 / 產能1 | 角色；藍色一護使之離手時，可授予本回合防 BP3000 以下阻擋；ACTIVE | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-2-021 may stop BP 3000；拒付授予和 BP3000/3500 正反例既有 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-026`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-026) 黑崎一護 | 1 / AP1 / BP2500 / 產能1 | 角色；登場抽1、棄1；無觸發 | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C23 引擎間接覆蓋；C22；未具本卡獨立全文及時序測試 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-015`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-015) 浦原喜助 | 1 / AP1 / BP1500 / 產能1 | 角色；登場看頂3、取最多一張無特徵角色、其餘任意排序至底；取到才棄1；DRAW | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-2-015 traitless top discard；選/不選及非角色/有特徵排除已測 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`UA04NC/BLC-3-001`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-001) 黑崎一護 | 3 / AP1 / BP3000 / 產能2 | 角色；兩次阻擋；首度阻擋後ACTIVE；自己回合若手牌進場外則 BP+1000；ACTIVE | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C22 BLC-3-001 own hand outside, first block；正反例已有 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-027`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-027) 黑崎一護 | 3 / AP1 / BP2500 / 特殊產能 | 角色；Impact無效；主要一次，棄斬月/月牙抽牌、BP+1500、攻擊開始可從能源移到空前線，Trigger不選；DRAW | Q2313 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-4-027 nullifies Impact ...；有場上/能源線與 Trigger 擇取回歸 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-019`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019) 黑崎一護 | 4 / AP1 / BP4000 / 產能1 | 角色Raid一護；登場對至多2敵前線 BP2000以上減1500；前線主要一次棄斬月/月牙→抽牌 BP+1000且攻擊可抽；RAID | Q1033 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-2-019 raids ...；新 Q1046 測試；來源完成才抽的 Q1033 主案例已測 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-022`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-022) 井上織姬 | 4 / AP2 / BP4000 / 產能1 | 角色ACTIVE登場；可棄1再取回或REST登場藍需求能≤1；入場回合主要一次選角色防對手效果；GET | Q2310, Q2311 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-4-022 enters active ...；補目標保護更多類型仍待驗 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-036`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-036) 葛力姆喬 | 6 / AP1 / BP4000 / 產能1 | 角色；一護或浦原棄手之後，符合4藍能源與純破面等特徵條件可另付1 AP ACTIVE登場，同名共用一次；GET | Q2317, Q2318 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-4-036 pays 1 AP ...；拒絕支付不消耗次數/來源限制已測 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-047`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-047) 其名為斬月 | 2 / AP1 / 事件 | 事件；正常使用抽2；藍一護效果由手離場後額外抽1，需等來源結算完成；無LIFE | Q1046；關聯 Q1033 屬 BLC-2-019 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-2-047 draws two ...；GPT FAQ Q1046；無能源時額外抽1正例新 CI 待驗；不能將 Q1033 當本卡個別FAQ | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-046`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-046) 月牙十字衝 | 3 / AP1 / 事件 | 事件；選敵前 BP≤3500退場；若藍一護棄之可選手牌置底，成功授2次攻擊並在首次攻擊轉ACTIVE；SPECIAL | Q1045 | `bleach-pack.mjs` + `engine.mjs`；C23 BLC-2-046 retires ...；可選與拒絕授予、必要能源不足由通用來源觸發適用 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-049`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-049) 卍解 | 3 / AP1 / 事件 | 事件；將至多2張己方已用AP卡ACTIVE；FINAL | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；既有通用 FINAL/AP 測試；尚無本印刷獨立正反例 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
## 綠色「白劍」13 種（不可用同名異版代替）

| 官方卡號／原印刷 | 數值／類型 | 印刷效果分段摘要與 LIFE | 該卡個別 FAQ | DSL／測試定位與正反例 | 本次全面認證 |
|---|---|---|---|---|---|
| [`UA04NC/BLC-3-009`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-009) 日番谷冬獅郎 | 3 / AP1 / BP2000 / 產能2 | 角色；登場抽1；COLOR | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C24 道具燃料；C22；抽牌及COLOR獨立精確測試待補 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-060`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-060) 藍染惣右介 | 3 / AP1 / BP4000 / 特殊產能 | 角色；禁止通常到前線；登場移線可除外騰空；主動REST己前線兩個ACTIVE→自身從能源移前；攻擊抽1；GET | Q2334 | `bleach-pack.mjs` + `engine.mjs`；C24 BLC-4-060 cannot enter...; rests two ...；滿線除外移動、非法通常前線、付款/攻擊抽牌測試已有 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-066`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-066) 卯之花烈 | 0 / AP1 / BP1500 / 產能1 | 角色；登場可棄1觸發頂牌相關處理；ACTIVE | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C24 間接作前線資源；尚未獨立正反例 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-067`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-067) 更木劍八 | 4 / AP1 / BP4000 / 產能1 | 角色Raid更木；BP減少免疫、Impact1；需底板印刷能源≥4才能離場棄手剝頂與 BP+1000 Damage2；RAID | Q1053-Q1057 | `bleach-pack.mjs` + `engine.mjs`；C24 BLC-2-067 gains/replaces/Damage；GPT REST strip；ACTIVE/REST/不付/無手/受對手及戰鬥等有測，巢狀多層仍缺 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-069`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-069) 日番谷冬獅郎 | 1 / AP1 / BP2500 / 產能1 | 角色；其他護廷十三隊≥6時可棄手1，再回收至多1〈日番谷〉；無LIFE | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C22 BLC-2-069 discards only...；正好6/拒絕棄牌與回收正反例已測 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-070`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-070) 更木劍八 | 1 / AP1 / BP4000 / 產能1 | 角色；Impact無效、可合法阻擋時必擋；DRAW | Q2339 | `bleach-pack.mjs` + `engine.mjs`；C22 BLC-4-070 must block ...；2張必擋擇一、REST不能擋後普通選擇已有 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`UA08BT/BLC-1-070`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-070) 卯之花八千流 | 6 / AP1 / BP4000 / 產能1 | 角色Raid卯之花；看頂4抽至多1護廷十三隊能源≤4；獲AP減費；RAID | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；既有 TOPN/AP減費跨作品測試；尚無完整本卡獨立認證 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`UA08BT/BLC-1-072`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-072) 卯之花烈 | 2 / AP1 / BP2000 / 產能1 | 角色；登場抽1；無LIFE | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C24 綠測試作目標/資源；尚無獨立事件時序驗收 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`UA08BT/BLC-1-083`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-083) 日番谷冬獅郎 | 0 / AP1 / BP1500 / 產能1 | 角色；無特殊內文；GET | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C24/Hitsu Raid底板與目標；Raid底板合法性有間接覆蓋 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`UA08BT/BLC-1-085`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-085) 日番谷冬獅郎 | 4 / AP1 / BP4000 / 產能1 | 角色Raid日番谷；登場可REST敵前1並禁止Active至敵下次攻擊結束；自己其他護廷≥6時擴至敵能源角色；RAID | Q569-Q571 | `bleach-pack.mjs` + `engine.mjs`；C24 BLC-1-085 rests ...；GPT Q570；被鎖底板Raid Q570新測試；Q571同一對手攻擊階段入場待專測 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`UA04NC/BLC-3-008`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA04NC%2FBLC-3-008) 更木劍八 | 4 / AP1 / BP3000 / 產能2 | 角色；只在手牌需求綠能源-1；不受BP減少；自己回合敵前BP≥3500則 BP+1000；無LIFE | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C22 BLC-3-008 reduces ...；印刷vs有效能源、減BP、回合條件測試已有 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX07BT/BLC-2-073`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-073) 野晒 | 4 / AP1 / 事件 | 事件；敵前退場 BP≤3000，若場上更木或場外草鹿八千流則≤5000；SPECIAL | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；C22 BLC-2-073 raises retire cap ...；場外/場上門檻已測，SPECIAL不受 BP 上限待專測 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
| [`EX15BT/BLC-4-080`](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-080) 卍解 | 3 / AP1 / 事件 | 事件；AP卡至多2重新ACTIVE；FINAL | 官方卡牌個別 FAQ 未查得 | `bleach-pack.mjs` + `engine.mjs`；通用 AP/FINAL 測試；本卡獨立測試待補 | **NOT TESTED**：部分既有案例不能代表整張卡所有 FAQ／交互 |
## 具編號官方裁定的逐條待驗門檻

| 官方編號 | 官方裁定要點與官方歸屬 | 已存在的機制或重現測試 | 本輪最終狀態 |
|---|---|---|---|
| Q1053 | BLC-2-067 只有 Raid 效果＋下有正面底板才屬 Raid；上層是最外可見卡 | `validRaidBase` / `performRaid`；C24 high/low/normal | NOT TESTED：尚缺巢狀完整體現 |
| Q1054 | BLC-2-067 只將上層送場外，下面的正面底板留場 | `stripRaidTopInPlace`；C24 / GPT FAQ 測試 | **PASS**：ACTIVE、REST、支付後基地 UID 保留 |
| Q1055 | 底板露出不會重新發動「登場時」 | `stripRaidTopInPlace`；GPT FAQ 無新 pending 斷言 | **PASS**：無二次 pending 的規則路徑；**NOT TESTED**：帶登場能力底板特殊交互 |
| Q1056 | 底板繼承上層離場當刻 ACTIVE／REST | C24 ACTIVE；GPT 新 REST 案例 | **PASS**：兩種狀態測試 |
| Q1057 | 上層曾受到效果不再附著底板 | C24 / GPT buff清理 | **PASS**：頂層buff、Damage期限、底板狀態清理；其他持續來源組合仍待 |
| Q569 | BLC-1-085 限制不能被一般 ACTIVE 效果提早解除 | `attemptFieldActive`；GPT 在舊底板禁止 Active 斷言 | **PASS**：被鎖基底不允許早 ACTIVE |
| Q570 | 已受限制底板被 Raid 後新 Raid 實體可 ACTIVE | `performRaid` + `pruneContinuousStates`；GPT 新重現 | **PASS**：新實體 ACTIVE、舊 UID 及效果分離 |
| Q571 | 在對手攻擊階段發動，該次攻擊階段結束即解除 | GPT 用真正 LIFE 觸發 Raid 施加效果；同攻擊階段結束即驗證清除 | **PASS**：同次攻擊階段特例；一般下次攻擊由 C24 PASS |
| Q2334 | BLC-4-060 目的線滿時先將一張置移除區，然後移線 | `commitDestination`；C24 full-line + 移除 | C24 既有 PASS；仍需邊界補驗 |
| Q2339 | BLC-4-070 有合法強制阻擋者必擋；多張只能在同類中擇一 | C22 blocked/rest fallback | C22 既有 PASS；特殊保護分支待補 |
| Q2315,Q2316 | BLC-4-034 裏向壓底及被移動卡待結算效果的交互 | C23 facedown/tuck 和 source resolution | 既有正反例；仍待逐條專屬驗收 |
| Q2317,Q2318 | BLC-4-036 當前現場特徵資格、同名及可選費用 | C23 AP付費與拒付 | 既有正反例；仍待逐條專屬驗收 |
| Q2310,Q2311 | BLC-4-022 場外低能源角色回收／防被選等交互 | C23 回收與保護 | 既有正反例；仍待逐條專屬驗收 |
| Q2313 | BLC-4-027 主動能力的發動與區域裁定 | C23 能源線啟動/移前 | 既有正反例；仍待逐條專屬驗收 |
| Q1033 | **個別歸屬 BLC-2-019**；BLC-2-047 的額外抽1應等來源效果完成 | C23 BLC-2-019 / 047 | 既有 PASS（指定交互） |
| Q1045 | **個別歸屬 BLC-2-046**；印刷能源不足也能觸發由一護造成的棄牌效果 | C23 + 共用 sourceMoveBoundary | 部分覆蓋，NOT TESTED 獨立零能量 |
| Q1046 | **個別歸屬 BLC-2-047**；印刷能源不足也能觸發棄牌抽牌 | GPT 新「零能源一護棄手」 | **PASS**：無能源的來源因果抽牌 |

### 誤植修正
交接舊說法「Q1046 代表浦原喜助棄牌不抽」的 FAQ 號碼歸屬**不正確**。Q1046 實際討論能源不足仍能發動；浦原喜助引發的離場是否觸發，是另一個依 *發動來源必須為藍色一護* 印刷條件的判斷，不可偷換成 Q1046 官方原文。

### 指定實戰與再現性
- 用 **8 組固定 seed**：四種先手／對局型態各有兩組，種子 2601–2604、2701–2704。完全採兩副原始50張內容。
- 每步檢查合法性、物理 UID 守恆；每 40 步完整 reducer 不變量；結束時完整不變量、勝負和完整 Replay 還原。
- 若 AI 無動作但 reducer 有合法行動，記錄 `aiFallbacks`，只使用引擎 `legalUniversalActions` 的已列合法行動作為保底，**不得把保底當成 AI 能力合格**。不修改 AI。
- **已驗證**：程式版 HEAD `ef70c0702717962953143379f5a3bb6452102582` 的 [Actions 40084849157](https://github.com/will00t-debug/Ua/actions/runs/40084849157) **SUCCESS**；Node.js 22 `2321/2321` 通過、五作品 `60/60`；8 場 `DESIGNATED_GAME_RESULT` 全部已結束且回播 PASS。若本文有後續文件更新，仍應另確認新 HEAD Actions。


### 最新實戰證據（Actions 40084849157；資料來源是測試日誌，不是舊 60 場矩陣）

| 指定牌組／先攻 | Seed | 逐步操作 | 勝方（player 0/1） | AI合法保底次數 | Replay |
|---|---:|---:|---:|---:|---|
| 藍 vs 綠；藍先 | 2601 | 138 | 綠（1） | 2 | PASS |
| 藍 vs 綠；綠先 | 2602 | 148 | 藍（0） | 0 | PASS |
| 藍鏡像；player0先 | 2603 | 194 | player1 | 1 | PASS |
| 綠鏡像；player1先 | 2604 | 178 | player0 | 0 | PASS |
| 藍 vs 綠；藍先 | 2701 | 200 | 藍（0） | 1 | PASS |
| 藍 vs 綠；綠先 | 2702 | 165 | 綠（1） | 0 | PASS |
| 藍鏡像；player1先 | 2703 | 138 | player1 | 0 | PASS |
| 綠鏡像；player0先 | 2704 | 115 | player0 | 0 | PASS |

全部 `endReason=life-zero`，累計 1,276 步，8/8 完整到終局、8/8 重播一致；AI 回傳空動作的 4 次合法選項保底已明列，**不可聲稱 AI 本身 8/8 無停滯**。

### 已確認並修復的 Bug

| 類別 | 原因 | 舊分支最小實戰失敗 | 修復 | 完整回歸 |
|---|---|---|---|---|
| 來源移動觸發／驗證器假陽性 | `assertUniversalMatch` 的 `effect-move-order` 驗證僅允許 `draw`，不認可確實被印刷卡移動事件賺取的 `grantCauseBlockAtMost` 等非抽牌效果；合法一護棄手與莉露卡壓卡交錯時拋出 `Forged moved-card earned draw` | 新指定牌組初版 Actions 40084323337 FAIL（第 79 步後有合法動作仍不能結算）；獨立莉露卡＋斬月負例可觸發待結算視窗 | `dist/universal-v2/engine.mjs` 提交 `517e7cecc9d36d0d4c68e54918ae36ae49ff1cfc`；逐 job 比對真實來源移動事件、卡牌已註冊 moveTrigger/條件、來源/參數，並拒重複領取 | `tests/v2-gpt-blue-green-official-faq-and-real-games.test.mjs`；後續 Actions 40084691936、40084849157 SUCCESS |
| 測試場景誤設（非引擎 Bug） | REST 測試在跨回合普通 refresh 前就把上層設 REST，導致剝離前上層已自然 ACTIVE | 新測試初版 Actions 40084000740 FAIL | 將 REST 狀態放到對手離場事件即將發生之前，沒有修改 Raid 規則 | REST 底板繼承驗證 SUCCESS |

規則引擎未因為原來成功的 Actions 而被視為「全部 26 張 PASS」；同時保留以上未完成缺口。
### 尚未完成
1. 每張精確日本語原文逐語句核對、一般通用裁定含 2026-10-23 新版修訂全文：本報有連結與摘要，不得視為閉合。
2. Q571「對方攻擊階段中 LIFE Raid」已由新測試通過；仍缺 Q1055 有登場能力的底板強斷言、Raid 多層 UID、指定雙組多種特殊 LIFE 交互。
3. 一些普通卡沒有自己的獨立逐卡正反例，雖有共用原語與舊場景，仍列 NOT TESTED。
4. 持續核對新版 CI；如仍失敗，此 PR 維持 Draft 且不可宣稱已驗收。

**禁止宣稱：** 兩副完全通過官方 FAQ、所有 26 張印刷已 100% 全面認證、或者 700 張皆已認證。
