# UNION ARENA V2｜R41 官方來源限定保護與五作品真卡批次回查

2026-10-23｜GPT Draft PR #78｜工作分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`

> 本文件的 READY 僅指完整印刷效果可直接驗收，不等於某段文字恰好命中。R41 本次官方完整卡文審核的未移植候選已列為 PARTIAL 或 RULE BLOCKED；**無新增符合全部條件的 READY 卡**。絕不合併 main、改 Cursor #77、部署正式站、force push。

## 檢驗過的原語與正式代表卡

`recoverOutsideOne`（0–1 角色且沒有印刷外額外限制） → 原 `effectQueue` 繼續 → 新 `deployOwnHandSpecial`（當前手牌、印刷卡種／顏色／AP／特徵與**可選**能源上限；ACTIVE 或 REST、0–N、免費） → `commitDestination`／`recordCompletedMove`／實體新 `fieldEntryStamp` → 實際成功登場後 `grantContinuousState` 並 `applyEffects(onPlay)`。

正式 `SAO-2-060`：<https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-060>（Q1207）。EVENT 紫4／AP1／歌：從己方場外**任意角色**0–1 回手；後續**獨立**由現在手牌的紫色、印刷 AP1、SAOサバイバー角色 0–1 免費 ACTIVE 登場，實際新 UID 才能取得「僅對手角色效果不可選」至下一個己方 START。SPECIAL LIFE 另起結算，選對手 FRONT 一張真退場。

已用真正 50 卡 SAO 牌組、獨立 synthetic 正反例、Human／Normal／Hard AI、可選兩段、同一／不同 UID、印刷篩選、額外 AP 禁止、來源事件／保護時效／回場印記／非法動作及私有手牌／JSON 還原測試。另加入存檔 pending 驗證，杜絕任意竄改免費登場篩選或保護範圍。全部 source／manifest／移植與全文測試參見 `docs/v2-handoff/V2-R41-sao060-official-dsl-spec.md`、`tests/v2-r41-sao060-full-print.test.mjs`、`tests/v2-r41-hand-special-recover-shared.test.mjs`。

## 重新掃描 700 張，並審核重要候選

固定重用 `capabilityIndex()`、R35／R37／R40 報告和現有官方來源；自動報告 `scripts/v2-r41-special-hand-candidate-report.mjs` 跑完 **700 張來源、370 張當前未移植**。72 張去重文字候選，拆成手牌登場31、場外回手32、ACTIVE手牌5、REST手牌17、保護4、退場後手牌登場3（互相重疊，不能相加）。依官方完整全文有紀錄的當前未移植 **9** 張：**8 PARTIAL，1 RULE BLOCKED，另63張文字候選 REVIEW PENDING；0 已核實 READY**。沒有因共用能力而忽略其他作品，但也不以卡數取代整張官方審核。

| 正式官方完整卡文候選 | 來源與 FAQ | 完整阻塞 |
|---|---|---|
| **SAO-2-069**（PARTIAL） | [官方 EX08BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-069) | Raid、雙方攻擊階段結束真退場、onPlay 選 BP≤4000 退場、onRetire 免費 REST 指定〈アスナ〉、Raid LIFE |
| **SAO-2-068**（PARTIAL） | [官方 EX08BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-068) | MAIN REST＋棄手一張＋自身真退場成本；免費 ACTIVE 指定〈アスナ〉／能源≤3／印刷 AP1＋BP1000、ACTIVE LIFE |
| **SLG-1-028**（PARTIAL） | [官方 UA51BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-028) | 固定 ACTIVE 登場；onPlay 從**手牌或場外**選指定〈影の兵士〉免費 REST；GET LIFE |
| **BLC-4-042**（PARTIAL） | [官方 EX15BT／Q2323](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-042) | 三選一各自完整效果；Q2323 僅接受印刷**卡名**〈涅骸部隊〉，不等於同名特徵；TOP2／棄手2回收／真退場後 ACTIVE 到 ENERGY |
| **BLC-4-036**（PARTIAL） | [官方 EX15BT／Q2317／Q2318](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-036) | 指定來源棄牌、能源與全場特徵判定、需**實際再付 AP1** 的 ACTIVE 登場、同名 TURN1 |
| **SAO-1-028**（PARTIAL） | [官方 UA15BT／Q752](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-028) | LIFE 可選回手、LIFE 歸零輸局時點、自身 BP2000／全部對手來源的選取保護、IMPACT NULL、ACTIVE LIFE |
| **SAO-1-087**（PARTIAL） | [官方 UA15BT／Q763／Q978](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-087) | 只有對手 EVENT 選取時需額外**棄手1**；其他角色戰勝後 DAMAGE2、MAIN TURN1、Raid／Raid LIFE |
| **SAO-2-064**（PARTIAL） | [官方 EX08BT／Q1208](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-064) | FRONT 來源對所有己方〈アスナ〉授予：對手角色／EVENT 效果選時棄手1，**非疊加**；DRAW LIFE |
| **MST-1-067**（RULE BLOCKED） | [官方 UA54BT／Q2162](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067) | 卡文「對手效果」與 Q2162「角色效果」作用域差異未釐清，Raid 底卡真正退場與 REST／回手順序未完整核准 |

已確認 BLC-2-057 的手牌文字是「從手牌移到移除區以提高擊退 BP」，**不是**從手牌特殊登場；它展示文字搜尋可能有假陽性，不應直接移植。

## 五種不可混用的來源選擇語意

1. 對手**任意效果**不可選：SAO-2-058 Q1206 已登錄。
2. 僅對手**CHARACTER 效果**不可選：SAO-2-060 Q1207 已登錄。
3. 僅**Trigger 效果**不可選：需獨立 provenance／全印刷審核，無可直接認證之本輪 READY。
4. 選擇合法目標需要額外**付 AP**：現有 selection AP tax，不能改成免疫。
5. 選擇合法目標需要額外**棄手牌**：SAO-1-087 Q978（EVENT）、SAO-2-064 Q1208（CHARACTER／EVENT，不能疊加），不能當成 AP 或免疫，無手牌時不可選。

## 後續優先排序

**第一**：指定卡名／跨手牌或場外 FREE ACTIVE／REST 的共用合法候選，目標 SAO-2-068／069、SLG-1-028、BLC-4-042；需先把來源成本／真退場／OnPlay／Raid 等不同缺口分開驗證，不因新原語存在就宣稱全部 READY。

**第二**：同來源不同作用域的「棄手牌1才能選」且明確非疊加的選取加價，適用 SAO-1-087 Q978、SAO-2-064 Q1208，不能重造目標解析／AP 系統。

**第三**：`attackEndDistinctOutsideNamesSwap`／BLC-4-069；先核對 Q2337／Q2338 的攻擊結束、LIFE／Trigger、場外交換時序。

**第四**：其他 370 未移植來源中經逐張官方完整文字可完整解鎖多卡且低核心風險者。MST-1-067 Q2162／BLC-4-034／第二批巢狀 LIFE 保留 RULE BLOCKED 或既有限制，絕不自行推斷裁定。

## CI 與認證界線

R41 經過的安全前一個程式提交 `9cd3f876cb5fcb9fbb2889c66f6df5d048cda2b4` 對應 [GitHub Actions 39938875140](https://github.com/will00t-debug/Ua/actions/runs/39938875140) **SUCCESS**：Node22 1988/1988，五作品矩陣60/60、manifest330/700、五作品98／36／43／99／54、未移植370，官方全文審核的未移植9張分類確認。之後的保存狀態安全驗證與此份文件提交均必須**各自核對更新 HEAD 的 CI**，不能援用此舊綠燈。完整獨立 FAQ 認證仍 **0**。
