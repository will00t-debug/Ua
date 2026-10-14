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
| EX07BT | BLC-2-065 | 狛村左陣 | ✅ | ✅ | 尚需效果逐項驗收 |
| EX07BT | BLC-2-067 | 更木劍八 | ✅ | ✅ | 需求能源4以上底板才得 DAMAGE 2 |
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
