# 白劍專屬 AI v1

這是 BLEACH 綠色白劍的獨立訓練與驗收流程。它使用現有 V2 引擎列出的合法動作，不另外寫一套規則。

不會改寫 `hard-search-2`、AI v3、Hybrid Main，也不會改對戰選單的預設策略，也不會部署正式站。

## 牌組

`white-sword` 來自 `dist/universal-v2/bleach-designated-decks.mjs`。50 張、13 個卡號，張數與印刷來源維持原檔。訓練不會補卡、換卡或改效果。

## 模型

`dist/universal-v2/white-sword-ai/` 是可更新權重的線性策略／價值模型。

- 特徵只來自行動方當時看得到的公開場面、自己的手牌，以及自己已查看的選擇窗。
- 對方手牌、兩邊牌庫順序、未公開 LIFE、種子與勝敗不會進特徵。
- 更木劍八、日番谷冬獅郎、卯之花八千流、藍染惣右介、強制阻擋、野晒、卍解是特徵，不是寫死的出牌順序。權重為 0 時這些特徵不會改變選擇。
- 模型丟出例外、非法行動或超過決策時限時，該步改走既有 Hard Search 2。這種對局不會被當成正常敗局拿去訓練。
- 對手策略若沒有回傳合法動作，該步改由 Hard Search 2 代打，並記入 `opponentFallback`。這不計入白劍模型的非法行動，但整場不會拿去訓練，也不能用來晉升。現有 `universal-hard` 在 `effect-rest-tuck` 會因為回傳語句沒有帶回選項而出現這個情況。
- 純排序的視窗沿用 Hard Search 2 的既有參考，並記成 `reference`，不是 fallback。

## 資料分割

| 分割 | 種子 | 用途 |
|---|---|---|
| smoke | 11000–11004 | 20 場系統煙霧測試 |
| full | 12000–12004 | 100 場合法性測試 |
| train | 19000–19007、20000–20249 | 教師示範與 1000 場自我對戰 |
| validation | 30000–30201、30100–30105、41000–41999 | v1 模式選擇；41000 起是 v2 確認，禁止進入訓練 |
| final | 50000–50016 | v1 的 204 場驗收，禁止進入訓練或調參 |
| final-v2 | 80000–80999 | v2 的新最終測試，禁止進入訓練或調參 |

最終測試的種子不會進 `collectSamples`。

## 指令

```bash
node scripts/white-sword-selfplay.mjs smoke
node scripts/white-sword-selfplay.mjs full
node scripts/white-sword-selfplay.mjs train
node scripts/white-sword-selfplay.mjs eval
node scripts/white-sword-selfplay.mjs all
```

`all` 會依序做煙霧測試、100 場、訓練、驗證集模式選擇、與教師權重比較，以及未參與訓練的基準對局。結果寫入：

- `training/white-sword-ai/weights/v0-teacher.json`
- `training/white-sword-ai/weights/v1-selfplay.json`
- `training/white-sword-ai/weights/candidate.json`
- `docs/white-sword-ai/report.json`
- `docs/white-sword-ai/REPORT.md`

基準對手是正式 `hard-search-2` 的 48 node 搜尋。時鐘維持這個函式在指定 node 數時的 clock-free 行為，同一種子可以重播；這不會比會被 40ms 軟截止截斷的搜尋更弱。Hybrid Main 仍使用它自己的 48 node／40ms。

## 晉升

冠軍門檻在跑最終測試之前就寫在 `judgeChampion`：

- 至少 200 場已完成對局，總勝率至少 60%
- 95% Wilson 信賴區間下限高於 50%
- 先手、後手都有對局
- 至少三種對手牌型：白劍鏡像、我拒絕、戀露
- 非鏡像對局的信賴區間下限也要高於 50%
- 沒有非法行動、隱藏資訊洩漏、死循環、引擎錯誤、fallback 或逾時

沒有達到時，正式基準仍是 `hard-search-2`。報告會留下實測數字與未晉升原因，不會把權重寫進正式預設。

## v2 評分上限

v1 權重保留在 `candidate.json`。v2 不重新訓練，只在 blend 時拒絕比 Hard 選擇低超過 7 分的候選。7 是 `hard-ai.mjs` 的 `ROOT_MARGIN`，不是看過測試後調的門檻。權重在 `training/white-sword-ai/weights/v2-capped.json`，`deployed` 是 false。

```bash
node scripts/white-sword-v2-eval.mjs
```

診斷與 20 個局面在 `docs/white-sword-ai/DIAGNOSIS.md`。新種子的結果在 `docs/white-sword-ai/REPORT-V2.md`。這條指令不會改對戰選單，也不會部署。

## 神經網路實驗

`training/white-sword-nn/` 是另外一條實驗。它自己從全部合法動作裡選，不經過 v2 的 Hard cap 7，也不把預測加進混合分。正式 v2 和網站預設都不會改。

```bash
node scripts/white-sword-nn.mjs trial
```

第一輪的測速和試訓寫在 `docs/white-sword-ai/NN-PROTOTYPE.md`。原型有跑起來，學習沒有被證明。

第二輪修正公開歷史在模仿和對戰之間的不一致，重新凍結 A，並用種子分組的開發曲線做固定預算試訓。結果寫在 `docs/white-sword-ai/NN-ROUND2.md`。正式預設、晉級門檻和網站都沒有改。

第三輪沿用第二輪凍結的 A，檢查 Monte-Carlo 更新的尺度，並在同一預算下比較純 Monte-Carlo 和固定比例的模仿回放。結果寫在 `docs/white-sword-ai/NN-ROUND3.md`。

```bash
node scripts/white-sword-nn-round3.mjs trial
```

第四輪沿用凍結 A，把選牌偏好和終局回報分成 Actor 與 Critic，做固定預算的 PPO-Clip 對照。結果寫在 `docs/white-sword-ai/NN-ROUND4.md`。這不是正式晉級，也不部署。

```bash
node scripts/white-sword-nn-round4.mjs trial
```

第五輪不重訓。它把固定 Actor 的整批 KL 和更新過程的混合平均分開，並用第四輪凍結的 80 場 Actor 對一批新的開發種子再評估。結果寫在 `docs/white-sword-ai/NN-ROUND5.md`。這不是正式晉級，也不部署。

```bash
node scripts/white-sword-nn-round5.mjs trial
```

第六輪接受第五輪：凍結的 80 場候選尚未確認優於 A。它從凍結 A 重新訓練三條獨立的 PPO 線，停止只看固定 Actor 的整批 KL，並只比較事先鎖定的終點。結果寫在 `docs/white-sword-ai/NN-ROUND6.md`。這不是正式晉級，也不部署。

```bash
node scripts/white-sword-nn-round6.mjs trial
```
