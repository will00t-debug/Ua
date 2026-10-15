# V2-E 第三輪獨立驗收交付（最新相同 SHA 為準）

結論：**受控六預設真卡私人測試可條件 GO；全700張官方效果完成率 NO-GO。**

## 固定版本

- A 整合 PR #70：`75468867b7ec4f5cdd78661e5b98f400494fb94d`。
- B PR #73：`2a502f01ec1e29a98c44e45e12f4aaa5a9753222`。
- C PR #72：`979eed8530721fae53c63201e033a5297464c853`。
- D PR #74：`efa367fc99c4afdd4dd9edfeddae1a736afb5333`。
- Node.js `v22.23.3`；A 同一 SHA 1143/1143 full regression：[Actions 38694133956](https://github.com/will00t-debug/Ua/actions/runs/38694133956)；A 相同 SHA 60/60 all-real pairwise finished：[Actions 38694131961](https://github.com/will00t-debug/Ua/actions/runs/38694131961)。E 沒有無變更重跑舊60場。
- E 新增獨立測試：`node scripts/v2-e-round3.mjs`（runner checkout exact A/B/C/D detached commits）；7/7 independent official-card negative tests、B own-buff 6/6、C TTG 13/13、D newly registered SAO/MST 5/5、真實 desktop Chromium 390px mobile viewport 六組合法預設 UI/一個新 seed314159 終局。Node22 [E CI 38703740095](https://github.com/will00t-debug/Ua/actions/runs/38703740095)，完整 action/session log 與 screenshot 在 run artifact。

## 四階段

| 系列 | 建檔普通卡 | 獨立分支已移植 | A 已整合 | 本輪新增分支覆蓋案例 | 全印刷能力/官方 FAQ 終驗 |
|---|---:|---:|---:|---|---:|
| BLEACH | 276 | 79 | 78 | BLC-2-055/4-013/1-030、新 BLC-4-023 受控分支測試 | 0 |
| TTG | 81 | 24 | 23 | 新 TTG-1-077 own outside recovery | 0 |
| SLG | 80 | 18 | 18 | SLG-1-040 SPECIAL Life / 異作品假目標拒絕 | 0 |
| SAO | 183 | 47 | 39 | 新8張 D 官方效果對照 5 組回歸 | 0 |
| MST | 80 | 24 | 23 | 新 MST-1-010 私密頂三排列，MST 敵卡 REST 實測 | 0 |
| **合計** | **700** | **192** | **181** | **7 筆 E 新增測試 + 各分支焦點測試** | **0** |

差集為 **11 張尚未整合**：BLEACH `BLC-4-023`；TTG `TTG-1-077`；SAO `SAO-1-032,SAO-1-063,SAO-1-098,SAO-1-107,SAO-2-017,SAO-2-030,SAO-2-057,SAO-2-072`；MST `MST-1-010`。B/C/D 新卡的獨立綠燈不等於 PR70 新增了卡；需主控正式整合新 HEAD 並再次驗證。

## 增量能力與負向驗收

- `BLC-2-055`: 原始 deck UID 作為 oracle，TOP 保留 / BOTTOM 搬至底，拒 OUTSIDE、拒錯誤 actor、隱藏對手牌庫。
- `BLC-4-013`: 非 inspected 的自己的 UID / 對方 UID / 已選過 UID 都拒，效果完成才原子提交 outside，守恆／AP。
- `SLG-1-040`: 跨作品 SPECIAL life 可選 skip，非法 enemy target fail-closed，合法 target 不收 AP。
- `BLC-1-030`: Q1119 無敵前線不能支付事件 AP、Q91 已 REST 敵角仍可必選，拒 null。
- 公開記錄不能顯示私密 top，除錯 Replay 拒絕未經合法選項之手工 action。
- 固定新六卡 identity manifest，不讓總數相等取代嚴格卡號核對。

## Chromium UI

真實 CI 桌面 Chrome CDP 390×844 DPR3 touch emulation（**不是實體手機**）；六預設各從 UI select->start 有手牌，AI-first 可啟動；新 seed `314159` 的 SLG vs SAO，84 次控制器循環內終局，能源登場 11、效果 pending 13、換階段 next 24、法定列表展開 35；viewport/scrollWidth 390px 無超寬，無錯誤或 JS exceptions，保留 browser screenshot。沒有在實際 Android/iOS 或私人 Vercel URL 登入後測試，也沒有自由組牌 UI 的端到端。

## 未驗收／下一步責任

1. **A 主控**：接入以上 11 卡後固定新整合 SHA，對每卡印刷 body / Life Trigger / wrong actor / costs / cancellation / Raid / protected full-field / public private visibility 新舊互動重驗，runner 不可沿用舊 A SHA。
2. **B/C/D**：繼續擴張逐卡全部能力合法與非法分支，包括來源印刷、最新 FAQ、生命時機；不要以 test suite 數字聲稱全卡驗收。
3. **V2-E**：保留 181 已整合、192 候選、11 待整合不同欄位；手機真機與全卡自訂組牌仍 not_run；未獲全181張官方全能力逐卡終驗的證據，正式全卡認證數維持0。

本交付僅改 E 獨立測試、腳本、CI、交接文，**沒有修改共用核心、B/C/D 包、main 或正式站**。詳見 `docs/v2-handoff/E-acceptance.md` 第三輪最新節。
