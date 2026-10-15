# UNION ARENA V2：多工作線 GitHub 交接契約

**整合主控**：PR #70，`feature/universal-rules-v2-foundation-20261014`。
**交付時間目標**（Asia/Taipei，2026-10-15）：02:15 核心缺口排序、04:30 首批卡包、05:30 候選版、06:40 最後回歸。這些只是檢查點，不代表背景工作或未來承諾。

## 目前確定的共同基準

- 五作一般去重卡：BLEACH **276**／TTG **81**／SLG **80**／SAO **183**／MST **80**，共 **700**。不計異圖、AP。
- **目前已接入 V2 且有局部效果測試：35**（BLEACH 15、TTG 20），另三作品零；**嚴格全卡 FAQ 逐卡完整驗收：未有整批足夠證據，暫列 0**。沒有移植：**665**。
- 現有兩副純印刷真卡的 50 張 BLEACH 紫／TTG 紅及跨作品 AI 全局對局。測試項目數字不是卡片完成數。
- 主控維護 `dist/universal-v2/{engine.mjs,pack.mjs,ability-templates.mjs,ai.mjs}`、`dist/universal-v2/title-packs/{contract,registry,inventory}.mjs`、`dist/universal-v2-preview.mjs`、預覽 CSS/HTML、部署與整體整合測試。
- **各工作線不能共同修改 `real-card-pilots.mjs`，不能更動 main，不能把舊引擎自動判定接進 V2 冒充已移植。**

## 各工作線唯一主權檔

| 工作線 | 獨立系列交付檔案 | 專屬測試（建議） |
|---|---|---|
| [V2-B] BLEACH | `dist/universal-v2/title-packs/bleach.mjs` | `tests/v2-bleach-*.test.mjs` |
| [V2-C] 天元／我獨自升級 | `title-packs/ttg.mjs`、`title-packs/slg.mjs` | `tests/v2-ttg-*.test.mjs`、`tests/v2-slg-*.test.mjs` |
| [V2-D] 刀劍／無職 | `title-packs/sao.mjs`、`title-packs/mst.mjs` | `tests/v2-sao-*.test.mjs`、`tests/v2-mst-*.test.mjs` |
| [V2-E] 全卡驗收 | `V2_OFFICIAL_ACCEPTANCE_LEDGER.md`（逐卡官方 QA 連結、可重現測試證據）及 `tests/v2-acceptance-*.test.mjs` | 不碰核心／他人系列檔 |

所有工作線可閱讀任何核心檔與官方來源，但**只有主控**可以修改共享引擎、registry、預覽入口、共用模板與全域測試檔。遇到核心缺口請在 PR #70 留下 `[V2-CORE-REQ]`，附上卡號、日版卡文、FAQ／目前判定結果、預期合法選擇與最小重現測試；主控會排入核心修補隊列，不要自行分叉共享引擎。

## 獨立卡包填寫規格（供 V2-B/C/D 使用）

每個系列檔僅 `export default` 一個物件：`{title,version,entries}`。不得刪掉任何既有 Pilot，也不得重複提供相同 ID；已有 Pilot 如需修正，先在 PR #70 提供差異與驗收證據，交由主控逐卡升級。

範例（**純合成契約示例，TEST-ONLY，不是真實卡或官方判定**）：

```js
import {SOLO_LEVELING_CARDS} from '../../solo-leveling.mjs';
const source=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-001');
export default {
  title:'solo-leveling',
  version:'slg-review-batch-001',
  entries:[
    // 真卡的 definition/evidence 必須依官方原文填寫，
    // 以下是欄位形狀示意，不可以拿來宣稱 SLG-1-001 已驗收：
    // {id:'SLG-1-001',sourceRecord:source,
    //  definition:{id:'SLG-1-001',name:source.nameJa,...印刷數值,
    //    implementation:'dsl',templateEffects:{onPlay:[...] }},
    //  evidence:{printedTextFragments:['日版原文一段'],
    //    reviewNote:'官方卡片 URL、FAQ 或尚未覆蓋的例外',
    //    testFiles:['tests/v2-slg-001.test.mjs']}}
  ]
};
```

契約 `title-packs/contract.mjs` **拒絕**：無官方 cardlist 來源、缺能源/AP/BP/產能、印刷欄位不一致、未匹配卡文、缺測試與審核註記、未知模板/時點、非官方 AP、重複 ID、及拿 `implementation:'vanilla'` 假裝沒有未實作效果。真卡的 `vanilla` 另須 `verifiedNoExtraEffects:true` 明確證明；仍須有對應正常／反例 QA。

共用 Pack 匯入採：
```js
import {registeredV2TitlePack} from './dist/universal-v2/title-packs/registry.mjs';
const titlePack=registeredV2TitlePack('solo-leveling');
// 零張已移植時回傳 null，**不是** legacy 引擎 fallback。
// 規則／組牌／跨作品 match 都用同一 V2 core。
```

請先在自己的 GitHub feature branch 提交並執行 `npm test`；建立獨立 Draft PR **目標分支設為上述 V2 主控分支**，標題前綴 `[V2-B]`、`[V2-C]`、`[V2-D]` 或 `[V2-E]`。為減少覆寫衝突，交付僅包含自己主權檔、新測試、該工作線自己的 QA 記錄，不修改別線檔。PR 必須列出增加／未完成的每一個卡號、每張測試結果與 Core-Req 依賴；**不能只回報合併的總數**。

## 整合判斷準則

主控僅收進來源與印刷效果均通過、具有真實效果結算與跨卡測試的獨立貢獻。若兩分支修改同一系列檔，先核對共同祖先及不同卡號，再進行人工受控整合；**不 force push、不覆蓋他人改動**。合併／cherry-pick 前核對最新 PR SHA；合併後要重新跑 `npm test`、V2 真卡 50×50、不同先手的 AI 戰鬥、角色 UID 守恆、卡圖／私密資訊、預覽手機動作。即使 CI 全綠，也不可當成官方全部驗收。

最後狀態表與完整未移植卡號可由下列命令產生（內容來自五作品的既有卡表）：

```sh
node scripts/v2-unported-report.mjs > V2_UNPORTED_IDS_GENERATED.md
```

新增加卡片後必須重新產生，不應手動維護 665 個卡號清單。
