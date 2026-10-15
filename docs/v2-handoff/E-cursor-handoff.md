# V2-E → Cursor｜停止開發、保全與接手清單

> 狀態：**FROZEN / HANDOFF**（2026-10-15 台灣時間）。**請勿再由此 ChatGPT 工作線新增卡、編輯規則或補測。** 這是交接備忘，不是所有 700 張通過認證的宣告。屬於尚未完成的內容均標記 **WIP**。

## 1. 專案、所有權與提交位置

- Repository：[will00t-debug/Ua](https://github.com/will00t-debug/Ua)。
- **本 E 工作分支（唯一可改動）**：`audit/v2-full-catalog-20261015`，Draft [PR #71](https://github.com/will00t-debug/Ua/pull/71)，PR base：`feature/universal-rules-v2-foundation-20261014`。
- **E 交接前最後完成、已 push 並有完整 CI 成功證據的 SHA**：`0b8581f771151e68c89da1560459d921409764bf`。
- **E 凍結註記提交**：`154ad30b0fb987316ba2b42b1bc425fc1f8bc720`，修改 `docs/v2-handoff/E-acceptance.md`；本文件提交後的**最終 Git commit SHA 以 PR #71 當前 HEAD 或 `git rev-parse HEAD` 讀值為準**，因為 commit 無法在其自身內容預先寫入自己的 SHA。
- **PR #71 在交接時 `mergeable=false`**。此欄代表現階段無法直接乾淨合併，需 Cursor 檢查衝突與分支差異；**沒有**進行 merge/rebase 來覆蓋 A/B/C/D。
- **A 核心／整合 PR #70**：`feature/universal-rules-v2-foundation-20261014`，SHA `75468867b7ec4f5cdd78661e5b98f400494fb94d`。
- **B／BLEACH PR #73**：`feature/v2-bleach-port-20261015`，SHA `2a502f01ec1e29a98c44e45e12f4aaa5a9753222`。
- **C／TTG + SLG PR #72**：`feature/v2-ttg-slg-port-20261015`，SHA `29ddd3ffdc5379584923539a8323ee7ec09d6add`。
- **D／SAO + MST PR #74**：`feature/v2-sao-mst-port-20261015`，SHA `b2b10f2f0ecd4ce41c04d863b2476da1ae302667`。

以上全部為**同一輪定格的來源**。請勿將不同時間的 HEAD 或先前 E 文件中的 35／175／192 當現況；上游有提交後須重新固定 commit 才能產生新驗收數。

## 2. 已完成／已保存（非 WIP）

- **已保存於 E 分支**：`docs/v2-handoff/E-acceptance.md`（含歷史及第三輪最新更正）、`audit/v2-e-round3-delivery.md`、`audit-tests/v2-e-round3-branches.test.mjs`、`audit-tests/v2-e-round3-browser.mjs`、`scripts/v2-e-round3.mjs`、`.github/workflows/v2-e-round3.yml`，以及更早的 E 獨立驗收與來源盤點程式、檢測測例、CI。
- **A 穩定版整合 181／700 張**，同 SHA 的 1119 等過去成績**不是**最新；實際 Node22 全量回歸 **1143/1143 PASS**，真卡跨作品矩陣 **60/60 完局**。
- **第三輪 E 自行撰寫的獨立反例 7/7 PASS**：BLEACH `BLC-2-055` 頂底私密排序、`BLC-4-013` 跨 MST 多選頂牌且非法 UID/原子場外、SLG `SLG-1-040` 跨 BLEACH 生命 SPECIAL、BLEACH `BLC-1-030` 強制事件 Q1119/Q91、來源卡號 exact manifest、Replay 公開資訊與非法動作拒絕，以及 A 未整合卡 fail-closed。
- **B/C/D 自己固定分支上的焦點測試**：B **6/6 PASS**、C **13/13 PASS**、D **8/8 PASS**。這只是焦點能力案例數，**不是** 198 個候選逐卡驗收完成率。
- **真桌面 Chromium 模擬手機尺寸**：390×844、DPR3、touch emulation；六組真卡預設可從 UI 選擇開局、AI 先手切換；`seed=314159`、人類 SLG vs AI SAO，進入 pending 選擇／能源登場／階段交接並在 UI 完整終局；JS error 0、無橫向溢出。**不是**實體 Android／iOS，未驗證線上私人 Vercel 授權網址。
- 本輪 E 工作用 GitHub Contents API 向本分支直接保存 commit/push；未進行其他分支寫入或正式部署。

### 實際執行紀錄（不要混 SHA）

| 驗證來源 | 指令或工作流程 | 結果 | 證據 |
|---|---|---|---|
| A pinned `75468867` | Node22 `npm test` | **1143/1143 PASS** | [CI #38694133956](https://github.com/will00t-debug/Ua/actions/runs/38694133956) |
| A pinned `75468867` | `node scripts/v2-integrated-match-matrix.mjs` | **60/60 all-real finished** | [CI #38694131961](https://github.com/will00t-debug/Ua/actions/runs/38694131961) |
| E pre-handoff `0b8581f7` | `node scripts/v2-e-round3.mjs`（四個 exact-SHA detach worktrees）| **E 7/7、B 6/6、C 13/13、D 8/8 PASS；Chromium smoke PASS；blockers=[]** | [CI #38705499481](https://github.com/will00t-debug/Ua/actions/runs/38705499481) |
| E focal Chromium | E runner 啟動 headless Chrome CDP 操作 UI | **六預設／AI 先手／314159 終局 PASS（僅桌面觸控模擬）** | 上述 E CI artifacts 的 `browser/` screenshot、report JSON |
| D 自有分支（舊批） | D full repo regression | **1148/1150，兩項固定卡號／inventory 斷言失敗**；D isolated QA job SUCCESS | [D CI #38704847532](https://github.com/will00t-debug/Ua/actions/runs/38704847532) |

重現 E 最近的已驗收程式（**Cursor 接手後自行決定是否重跑；交接期間不再追加開發**）：

```bash
git clone https://github.com/will00t-debug/Ua.git
cd Ua
git fetch origin --prune
git switch --track origin/audit/v2-full-catalog-20261015
git rev-parse HEAD   # 此值才是 E 最終交接 HEAD；勿誤用 0b8581f7 舊程式提交
node --version        # CI 使用 v22.23.3
node scripts/v2-e-round3.mjs
# 核對 audit/v2-e-round3/report.json，CI artifacts 包含一份可下載的歷史執行證據
```

其中 `scripts/v2-e-round3.mjs` **固定**上述 A/B/C/D commit，建立暫時 worktrees 而不修改 A/B/C/D；新上游批次必須先改 pin 並由 Cursor 判定差異，不能把原 E CI 成功直接視為新版本通過。

## 3. 已移植候選、A 已整合、尚未整合：三者必須分開

| 一般卡作品 | 官方範圍 | A 已整合／能供現有預設使用 | B/C/D 獨立候選 | **尚未進 A 的候選** |
|---|---:|---:|---:|---:|
| BLEACH | 276 | 78 | 79 | 1 |
| TTG | 81 | 23 | 24 | 1 |
| SLG | 80 | 18 | 18 | 0 |
| SAO | 183 | 39 | 53 | 14 |
| MST | 80 | 23 | 24 | 1 |
| **合計** | **700** | **181** | **198** | **17** |

**精確 17 張尚未整合卡號與其來源 commit：**

- **B／PR #73 @ `2a502f01ec`（1）**：`BLC-4-023`。登場可選己方其他角色 BP+1000，生命 DRAW；需由 A 依卡文合入與完整測試。B 專測已 PASS，A 主線未註冊。
- **C／PR #72 @ `29ddd3ffdc`（1）**：`TTG-1-077`。己方場外ガンメン檢索／回手含可放棄等分支；C 焦點測試 PASS，A 主線未註冊。
- **D／PR #74 @ `b2b10f2f0e`（14 SAO）**：`SAO-1-003`、`SAO-1-032`、`SAO-1-052`、`SAO-1-063`、`SAO-1-073`、`SAO-1-075`、`SAO-1-089`、`SAO-1-098`、`SAO-1-107`、`SAO-2-017`、`SAO-2-030`、`SAO-2-048`、`SAO-2-057`、`SAO-2-072`。其中 `SAO-1-075/089` 同時具有 STEP 與登場私密選牌能力，不能只驗 STEP；`SAO-1-003/052/073`、`SAO-2-048` 等較新身分更需新增與來源印刷獨立的驗收 oracle。
- **D／PR #74 @ `b2b10f2f0e`（1 MST）**：`MST-1-010`，登場看頂3依序全部返頂，不得任意送場外。

候選總數 198 = 已整合 181 + 新 17，均按 title/ID 差集檢查；**不是可完整玩的 198/700**。若上游 PR HEAD 移動，需重新盤點。

## 4. WIP／阻塞／不能宣告完成

1. **WIP / P0：519 張仍未移植進 A 的 700 張來源 Registry**（700 − 181）。其中有 17 張雖在系列獨立工作線有候選定義，仍未進主線；其餘需核心能力或卡片效果移植。**全 700 同引擎遊玩 = NO-GO**。
2. **WIP / P0：現有 181 張雖註冊並可參與指定預設真卡對局，沒有逐卡全官文、條件、成本、被動、Raid、生命 Trigger、時間點、選擇/放棄、隱藏資訊與 FAQ 獨立終驗。**「完整逐卡認證」仍記 **0**，不把測試總數當成驗收完成率。
3. **WIP / P0：B/C/D 17 張尚未正式以單一 A 新整合 SHA 接入，不能跨不同 commit 合算回歸證據**。A 若整合，需明確按固定 ID manifest/官方印刷鎖定、測所有 branch；不要自行取消失敗 assertion。
4. **WIP / P1：D 的共享回歸有 2 項固定卡號／inventory 預期落後 D 新定義**（D run #38704847532），是 branch-level 版本差異；**不要錯誤宣稱 A `75468867` 的 Node22 測試失敗**。由 Cursor 在真正 A 整合時調整已簽核 manifest 與重跑完整回歸。
5. **WIP / P1：PR #71 `mergeable=false`**；未解衝突，不合併 main。Cursor 應先做 diff、檢查衝突，保留 E 全部測試與交接，不要把 E 歷史 audit 文件覆蓋成「全部通過」。
6. **WIP / P1：真人 Android/iOS 真機、私人 Vercel preview 實際登入與可觸控對局、自由組牌 UI 及各種手機螢幕尺寸未驗收**。Chromium 模擬的成功不能外推。
7. **WIP / P1：source provenance/測試檔路徑契約不能只憑字串聲明為真**（第二輪已指出），需要以官方卡文、真檔與負向驗收建立可確認的獨立 oracle。
8. **WIP / P1：核心未支援的複合印刷能力**（牌頂5選2且底置、找牌後附帶棄牌、雙抽雙棄分段、特殊 Raid/退場時觸發、能力抹除、個別限卡 `MST-1-051` 及 FAQ 等），需看各線 `docs/v2-handoff/A-core.md`、`B-bleach.md`、`C-ttg-slg.md`、`D-sao-mst.md`。E **不得在這裡另造核心**。

## 5. Cursor 接手防衝突原則／剩餘工作分配

- Cursor 首先讀 `AGENTS.md`、`docs/v2-handoff/A-core.md` 和本 E handoff，再讀 B/C/D 交接；保留所有現有 commit/PR。**先讀，不要直接 rebase / force-push 或把 D/B/C 內容整份覆蓋 A**。
- 下一輪如果需要開發，**由 Cursor/主控在獨立新工作安排中主導**；V2-E 在本次交接後停止新增測試／卡牌／功能、停止週期性整合行為。
- 新整合前先比較 `git diff <A_SHA>..<B/C/D_SHA>` 各系列責任檔，使用 fixed official ID whitelist；合入候選需由 A 更新自己的 registry 與共用測試的 exact manifest，使用同版 Node22 全量與新測例跑 CI。切勿在 E 工作線偷偷改共享引擎。
- E 可保留只讀獨立驗收腳本作重播與錯誤診斷；**最終開發完成率只能來自固定新 A SHA 的真實運行與完整官文交叉驗證**。
- 不合併 `main`、不部署正式站 `https://ua-eight.vercel.app/`，不覆寫任何他人分支。

## 6. 備援與資料保全

- E 的程式／交接已透過 GitHub commit 更新至 **遠端工作分支**，不需由 Cursor 從聊天複製程式碼。**交接後先檢查遠端 PR #71 HEAD**；若與本文 pre-handoff SHA 不同，這是提交本交接文件本身產生的新 SHA。
- GitHub Actions 產物可在 [E 最新已完成測試 run #38705499481](https://github.com/will00t-debug/Ua/actions/runs/38705499481) 的 artifacts 下載：`audit/v2-e-round3/report.json`、`a-third-round-new-tests.log`、`b/c/d-candidate.log`、`browser/browser-report.json` 與截圖等。CI artifact 有期限，請 Cursor 視需要下載保存。
- 若 GitHub 此次寫入失敗，須另輸出 patch；**本記錄的保存狀態需以完成實際 GitHub commit 並讀回 PR #71 HEAD 才能確認**。
- 本介面使用 GitHub connector 操作遠端，無法偵測 Cursor 本地端尚未儲存的檔案；若有另一台電腦的未提交變更，請在 Cursor 當地執行 `git status --short` 另行保存，勿與 E 的遠端成果混淆。

**交接完成後，此 V2-E ChatGPT 工作線停止，不再繼續開發。**
