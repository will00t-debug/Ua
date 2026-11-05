# ai-v3 完整回合搜尋：第一個里程碑

這是可切換的單人預覽，不是正式站行為。預設關閉。困難難度仍走凍結的 `hard-search-2`。線上房間協定、規則引擎與玩家紀錄都沒有改。

量測時間：2026-11-05 16:50（台北時間）。Node.js 22.23.4。

## 固定版本

| 項目 | 值 |
| --- | --- |
| main | `03bd60f7237e1b1ecdd1002eac167f718b2947b7`（Merge PR #318） |
| 正式 Worker | `ua-arena`，Actions run [41983603518](https://github.com/will00t-debug/Ua/actions/runs/41983603518)，2026-11-05 14:54（台北時間）成功 |
| 正式站 UI | header `BIFPPOIQ`，preview cache `20261105ttg012ap1`，困難政策 `hard-search-2`，學習格式 `ua-v2-learn-v1` |
| PR #294 | 仍開啟、未合併。HEAD `cac9fef39f945afd0051041c6db82208fd9ff98d`，`learned-v4` / `ua-v2-learn-v4`，`RAW_GAP=0` |
| 凍結基準 | `dist/universal-v2/hard-ai.mjs` SHA256 `f202dc4fcc07b9f7d794cc6fa3c486836cb8bf9d3ab8be69c16ebe733d40b262` |

PR #294 的 v4 特徵、對局級分割與診斷有移植進 `dist/universal-v2/ai-v3/`，但正式站沒有 `learned-v4`。拿掉 `RAW_GAP` 不會被當成變強。這裡的搜尋先驗上限是 `SEARCH_PRIOR_GAP=8`：學習分只能在這個差距內重排，不能把搜尋明顯較差的走法抬成首選。預覽沒有載入權重，價值網路尚未訓練。

細節在 `audit/ai-v3-baseline-pin.json`。

## 玩法

單人對戰設定頁有「完整回合搜尋預覽」，寫入 `localStorage` 鍵 `ua-ai-v3-preview`。對局中可按「關閉搜尋預覽」回到這場選擇的難度。困難是 `hard-search-2`。

電腦回合把 actor 可見局面做成 belief world，交給 module Worker。`requestId`、`stateVersion` 或 `actor` 不符就丟棄；回來的 action 必須重新出現在當下的合法列表。Worker 逾時（700ms）時，同一頁內用較小預算再搜一次，仍不合法就回到 `chooseProgressSafeAiAction`。

搜尋邊界是真正的決策，不是把舊 depth 常數加大。單選動作直接採用。起手調度與順序類 pending 交給凍結基準。其餘候選用牌型先驗縮束，再對當前回合與對手下一回合做 minimax。強制的階段推進與戰鬥結算不佔決策配額。相同規則狀態共用 transposition。每一步都是引擎的合法 action。

抽樣世界只用自己剩餘張數、公開資訊與合理對手牌型。真實對手手牌、牌序、LIFE 與 RNG 不會進入 Worker。模擬對手只看它自己的可見局面。

## 重現

```bash
node --test tests/ai-v3-search.test.mjs
npm test
npm run worker:build
AI_V3_GAMES=1 AI_V3_STEPS=16 AI_V3_MODES=baseline,prior,beam,belief,ismcts node scripts/ai-v3-benchmark.mjs
```

開發種子從 `AI_V3_DEV_SEED`（預設 8100）起。最終種子從 `AI_V3_FINAL_SEED`（預設 5000）起，需 `AI_V3_SPLIT=final`。這次沒有用最終種子調參，也沒有跑最終分割。

本地頁面：`python3 -m http.server 8000 --directory dist`，打開 `/universal-v2-preview.html`。

## 已測到的決策差異

`tests/fixtures/ai-v3-mistakes.json` 的 `bleach-energy-instead-of-blocker` 是決策錯誤，不是規則錯誤。

局面：先手生命 1，手牌是 0 費 1000 BP 的茶渡 泰虎（`BLC-1-042`），對手前線有可行動的阿散井 恋次（`BLC-1-045`，2000 BP）。Q34：阻擋者 BP 較低時雙方都不退場，也不扣生命。放到前線，回合結束會回復並擋下攻擊。放到能量區則擋不住。

`hard-search-2` 打到能量區。`ai-v3-beam-1` 打到前線。同一測試也確認未阻擋的致死攻擊會被選走，以及非法 action 會被拒絕。

五副合法 50 張牌組：BLEACH、Sword Art Online、Solo Leveling、Steins;Gate、進擊的巨人。後兩部不在舊的五作品統計裡。

100 個主要／攻擊階段的多選局面，每個作品至少 20 個。搜尋結果必須在合法列表中，而且不能在另有非立即敗北走法時選立即敗北。這次五個作品都通過。

## 同預算比較（開發種子，不是勝率）

命令就是上面的 benchmark。每作品 1 個種子、先後手各一場、每場最多 16 步。雙方用同一副牌、同一個種子。預算：`nodes=48`、`ms=40`、`beam=4`、雙方各 2 個決策。belief 用 2 個抽樣世界。完整數字在 `audit/ai-v3-dev-benchmark.json`。

五個作品的共同結果：非法動作 0、備援 0、16 步內沒有終局。下表的完成率是「走完步數上限且沒有非法動作」，不是對局完成。配對勝率的樣本數是 0，所以沒有信賴區間。延遲只計合法選項多於 1 的決策，單位是毫秒。

| 作品 | baseline P50 / P95 | prior P50 / P95 | beam P50 / P95 | belief P50 / P95 | ISMCTS P50 / P95 |
| --- | --- | --- | --- | --- | --- |
| bleach | 33.0 / 51.8 | 1.1 / 5.1 | 30.0 / 32.0 | 40.3 / 41.5 | 40.2 / 40.4 |
| sword-art-online | 22.9 / 50.0 | 0.6 / 1.7 | 29.1 / 36.7 | 33.2 / 41.6 | 40.2 / 41.2 |
| solo-leveling | 21.8 / 32.9 | 0.6 / 1.0 | 27.3 / 42.8 | 28.9 / 42.1 | 40.2 / 41.2 |
| steins-gate | 21.0 / 43.8 | 0.6 / 0.9 | 31.2 / 41.1 | 36.1 / 46.4 | 40.4 / 42.9 |
| aot | 29.4 / 46.5 | 0.6 / 1.5 | 32.1 / 34.5 | 40.5 / 42.1 | 40.2 / 41.0 |

prior 幾乎不搜尋，所以快，也不計算對手下一回合。beam 用掉大部分預算。belief 與 ISMCTS 常碰到 40ms 截止。ISMCTS 維持合法，但這次沒有比 beam 更好的終局證據，因此預設政策是 `ai-v3-beam-1`，不採用 MCTS。

另外只用 BLEACH、種子 8100、最多 250 步、同一套 beam 預算，把先後手對調各打一場。兩場都在步數上限內結束，非法動作 0、備援 0。多選決策 P50 38.0ms、P95 42.7ms。配對只有 1 個種子：兩種座位 beam 都輸給 `hard-search-2`，點估計 -0.5，bootstrap 區間也是 -0.5 到 -0.5，因為沒有第二個種子。這不是勝率結論，也不拿來調參。阻擋局面的差異與整場勝負是兩件不同的證據。

## 瀏覽器

Chrome headless 打開本機預覽頁。核取方塊一開始未勾、`localStorage` 沒有開啟值。勾選後寫入 `1`，難度設為困難、電腦先手，進入對戰頁。電腦思考時 `document.body.dataset.aiPolicy` 是 `ai-v3-beam-1`，頁面出現 Worker，沒有未捕捉例外。關掉預覽並按下一個階段之後，政策回到 `hard-search-2`，按鈕變回「完整回合搜尋」。

`npm run worker:build` 已寫出 gitignore 的 `worker/dist/index.mjs`。esbuild 對既有重複鍵的警告還在，建置本身成功。

## 未達標

- 沒有可用的配對勝率區間。16 步的五作品對局沒有終局。BLEACH 種子 8100 的 250 步兩場都結束，但只有 1 個種子，區間沒有寬度，而且 beam 兩場都輸。最終種子分割沒有跑。
- 失誤資料目前只有上述一個可重現決策局面，不是從大量真實重播整理出來的語料。
- 價值網路沒有訓練。先驗只在呼叫端傳入 v4 權重時生效。
- 瀏覽器 Worker 路徑先送一個已抹除隱藏資訊的世界，Worker 內再以 `worlds:1` 搜尋。同預算表裡的 belief 是行程內 2 個世界，兩者不要看成同一個路徑。
- 不部署正式站，也不把這個預覽說成已上線。
