# UNION ARENA V2｜R44 — SAO-2-069 完整印刷移植、真攻擊階段結束退場與跨作品原語回查

日期：2026-10-23。原 [GPT Draft PR #78](https://github.com/will00t-debug/Ua/pull/78)；分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。不合 main、不改 Cursor #77、不部署正式站、不 force push、不建立第二套 queue 或支付。

## 來源／完整印刷與 FAQ 邊界

官方 [EX08BT/SAO-2-069](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-069) ユウキ（綠4、AP1、BP4000、ALO、Raid／Raid LIFE）：
1. **己方及對手**攻擊階段結束時，場上的這張卡真退場，不是僅 REST，不免除任意一方的階段邊界。
2. 登場時，對手 FRONT 中 BP4000 以下最多一張合法目標真退場。
3. 自身真退場後，可由**自己當前手牌**挑選最多一張〈アスナ〉、綠色、印刷必要能源≤3、印刷 AP1 免費 **REST** 登場；來源 UID、實際退場、替換及新 fieldEntryStamp 均使用原引擎事件。
4. RAID LIFE 是獨立效果入口，不能用 onPlay 或 onRetire 代替。

來源 `dist/sao-official-import.mjs`、釘選 `dist/universal-v2/sao-pack.mjs`、既有 `dist/universal-v2/engine.mjs`、`tests/v2-r44-sao069-full-print.test.mjs`；整張真卡登錄於同一官方 allowlist 並同步更新獨立 manifest。仍未取得**全面獨立逐卡 FAQ** 認證：0。

## 五批及提交

| 批次 | Commit | 已實施工作 |
|---|---|---|
| A | `bdce53914df7` | 重用跨 hand/outside 印刷條件免費登場，不強制未印刷 BP 授予；負面與相容測試。 |
| B | `b2f5d6dd56b0` | 共用、雙方攻擊階段結束 `fieldEntryStamp`/UID 真退場，對異動來源和階段事件進行測試。 |
| C | `d9fe92b59ac3`，測試修正 `50015c6f3330`／`11a460aa5aa7` | SAO-2-069 官方完整卡文：Raid、登場 BP 門檻選擇、攻擊階段結束、退場免費 REST〈アスナ〉、Raid LIFE；修改 registry／manifest／歷史未移植報告。 |
| D | `c76b840d6955`，測試修正 `620758cd8bba` | 真實 Raid LIFE 與對手回合時序負例；五作品來源 `scripts/v2-r44-phase-retire-candidate-report.mjs` 回查，新增 CI 步驟。 |
| E | `a9fd51acd4fc` | 來源限定、存檔偽造 phase-end retire job 原子拒絕，兩來源優先順序；本交接文件為後續文件提交。 |

## 已確認 GitHub CI

最後的**程式 SHA** `a9fd51acd4fc834c16fbafd4b90e7e3d00ac0244`：
[GitHub Actions 39957725253](https://github.com/will00t-debug/Ua/actions/runs/39957725253) **SUCCESS**；
Node.js 22 **2034／2034 PASS**；五作品矩陣 **60／60**；獨立 registry／manifest 精確一致。
若本文件另有後續提交，**最終 HEAD 必須有自己的成功 Actions**，不可借此舊綠燈作最後程式保證。沒有執行本地 clone 或正式站 UI 測試。

## 當前全庫來源搜尋

- 全部來源 **700 張**；已登錄 **334**，未移植 **366**。
- BLEACH **98**（未移植178）、TTG **36**（45）、SLG **45**（35）、SAO **101**（82）、MST **54**（26）。
- `scripts/v2-r44-phase-retire-candidate-report.mjs` 的**廣泛字詞候選 238 張**，多個字詞分類重疊：attackEnd6、trueRetire80、fromOwnHand125、restDeploy16、activeDeploy7、printedRequirement23、raid81；不能用命中數推斷 READY。
- **尚未移植 366 張**的官方全文分類：**360 REVIEW PENDING、5 PARTIAL、1 RULE BLOCKED**；其中逐卡已完整核對的未移植 **6 張**（5 PARTIAL、1 RULE BLOCKED）。原 R41 已核實的 SAO-2-069 在本輪整卡移植，不能再列 PARTIAL。獨立完整 FAQ Certified **0**。

## 下一輪優先

1. `BLC-4-069`：官方 Q2337/Q2338，`attackEndDistinctOutsideNamesSwap`、真攻擊結束與 LIFE／Trigger、來源 UID 及不同名稱回收時序；全文確認之前 **REVIEW PENDING**。
2. `SAO-1-087` Q978 ＋ `SAO-2-064` Q1208：對手 EVENT 或 CHARACTER/EVENT 選擇需**棄手牌 1 張**，後者不疊加。不得代替 AP 付費或效果選擇免疫；兩張其他整卡效果亦須完整驗收。PARTIAL。
3. `BLC-4-042` Q2323：三選一的真支付與印刷**名稱**，不能改為特徵。PARTIAL。
4. `BLC-4-036` Q2317/Q2318：指定來源 discard、自付 AP1、同名 once-per-turn 真實界線。PARTIAL。
5. `MST-1-067` Q2162 官方卡頁 vs FAQ 作用域、Raid 底卡真退場次序；保留 **RULE BLOCKED**。此外 `BLC-4-034` 和未獨立核對的第二批巢狀 LIFE 保留原安全阻塞。

下一輪繼續永久流程：共用能力 → 五作品全量來源掃描 → 官方逐卡全文 → 缺口分類 → 所有完整 READY 安全批次移植 → Node22／60局／獨立 manifest／最新 HEAD CI。絕不登錄部分效果卡或合併／部署。
