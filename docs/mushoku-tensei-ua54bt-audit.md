# UA54BT / MST-1 implementation and FAQ audit

Status: **INCOMPLETE, NOT PLAYABLE. DO NOT MERGE.**

Scope: 80 numbered ordinary cards, excluding alternate art and AP artworks. Printed per-card AP costs are preserved where verified; no AP game mechanic is removed.

## Evidence
- Official product: https://www.unionarena-tcg.com/jp/products/boosters/mst-1.php (12 SR, 12 R, 28 U, 28 C = 80 non-AP card types).
- Card list: https://www.unionarena-tcg.com/jp/cardlist/
- Official UA54BT FAQ: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT

## FAQ implementation ledger
| FAQ | Card | Ruling to implement | Integration status |
|---|---|---|---|
| Q2145 | MST-1-007 | Turn-once branch of Eris is shared across copies of the name, unlike other selectable branch | Pending game-state integration |
| Q2146 | MST-1-008 | Unblocked attack trigger is after blocker selection, alongside block-time trigger | Pending |
| Q2147 | MST-1-009 | Attack-end triggers after battle, or after trigger check when damaging life | Pending |
| Q2148–Q2151 | MST-1-025 | Top removal exposes original base in same REST/ACTIVE without re-entry or top-card buffs | Isolated helper + unit-test source; match engine integration pending |
| Q2155 | MST-1-040 | Full destination line requires choosing a card to move to remove area | Isolated helper + unit-test source; match engine pending |
| Q2162 | MST-1-067 | Untargetable by opponent character effects only where effect explicitly selects | Pending |
| Q2163 | MST-1-068 | Full destination line: remove a selected card before moving | Isolated helper + unit-test source; match engine pending |
| Q2164–Q2165, Q2208 | MST-1-073 | Named shared one-per-turn; may activate when already ACTIVE | Isolated helper + unit-test source; match engine pending |

## Data and test status
- 80 card number identities enumerated in `dist/mushoku-tensei.mjs`.
- 72 entries currently carry preliminary metadata copied from previous work or newly compared with official card pages. **All require final card-by-card verification before certification.**
- Remaining 8 cards: verified basic names/rarities/color and selected additional fields, but some printed numerical fields remain unverified; explicit pending metadata.
- No parallel variants or AP illustrations included.
- Rules prototypes reused from previous branch, kept in isolated `dist/mst-rulings.mjs`; **not connected** to `dist/engine.mjs`.
- Full effect + AI completion: **0/80**. No false `auto:true`.
- `npm test`: not yet verified. Existing BLEACH `main` files unchanged.
- Artwork: placeholders only; no unlicensed official image embedded.
- Official special product distinct ordinary cards beyond UA54BT: not yet comprehensively verified.

## Blocking acceptance criteria
1. Verify every card's printed name, numbers, traits, trigger, Japanese text and images, plus official FAQ.
2. Port title-safe card registry and independent editor/presets without affecting BLEACH or other PRs.
3. Implement full match-state transitions including choices and raid bases, timing, alias, shields, AP, dynamic BP and effects.
4. Run npm test and full AI simulations, per-card branch tests, and review a Vercel preview.

## Increment 2026-10-13
- Source-checked MST-1-025 and MST-1-073 metadata added. Further batches now bring preliminary fields to 68/80.
- New pure helpers: `mstRemoveRaidTop`, `mstMoveChoices`, `mstUseNamedAbility`, and `mstRudeus73CanActivate`, plus `tests/mst-faq-raid-movement.test.mjs`.
- These are *not wired* into active game event queue; no simulated full matches yet, and source tests have not run successfully in local Node due clone DNS issue.

## 2026-10-13 inventory and legality checkpoint
- All **80 canonical non-AP card numbers have non-placeholder Japanese names**, basic card types, colors, and rarity: SR 12 / R 12 / U 28 / C 28.
- **72/80** have preliminary card-number metadata including printed energy, AP, BP, generation and effect summary. **8/80** only have partly checked descriptive fields; unknown gameplay values remain `null`.
- Missing some exact printed numerical fields: **MST-1-010, 011, 015, 019, 023, 044, 064, 078**. Their effects and original Japanese card text still require final official verification.
- **Original Japanese effect text and artwork licenses remain to be verified for the entire expansion.** Currently many newly added descriptions are Chinese summaries, not original Japanese transcriptions.
- **MST-1-051 Roxy is restricted to one copy per deck effective 2026-10-01**, including any parallel art of the same card number. Official https://www.unionarena-tcg.com/jp/rules/limited.php and https://www.unionarena-tcg.com/tc/rules/limited.php. Isolated `dist/mst-deck-rules.mjs` rejects illegal copies or foreign series, and `tests/mst-deck-rules.test.mjs` covers it. This verifier is not yet wired to the production editor or match startup.
- Newly added `tests/mst-completeness.test.mjs` asserts 80 unique card names/rarities and exact 72 preliminary / 8 pending split, rather than pretending the full engine is done.
- GitHub Actions Node 22 regression suite **passed** on commit 76762162 (run https://github.com/will00t-debug/Ua/actions/runs/38278235832), correcting the prior shared-turn key bug. Recheck the latest commit's CI before claiming a current pass.
- FULL automatic game engine effects **0/80**; independent helper functions still require match state, user-choice flow, trigger timing, AI and end-to-end validation.

## 2026-10-13 incremental state and event modules
- `dist/mst-entry-effects.mjs` now models copied state and legal selections for MST-1-022 / 051 / 061 / 063 / 069 / 075. Draw, discard, field buffs, deck-top inspection and field retirement have unit tests in `tests/mst-entry-effects.test.mjs`.
- `dist/mst-event-effects.mjs` models branch selection and actual hand/deck moves for MST-1-035 (up to three named draw branches) and MST-1-080 (draw 2 and optional academy-front energy effect); test in `tests/mst-event-effects.test.mjs`. The temporary front-energy flag still needs integration with `engine.generated()` / `engine.energy()`.
- Fixed Q2150–Q2151 top-Raid removal to keep the base character's own `usedTurn` value rather than copying the removed top's once-per-turn state.
- `docs/mst-faq-matrix.md` lists all 25 official FAQ entries individually and explicitly distinguishes isolated-unit tests from complete game engine integration.
- All these are **isolated reducers only**; they do not handle production engine's turn/stack/AP/AI/hotseat directly. Consequently full gameplay completion is still **0/80**. No flags were enabled and BLEACH `main` remains untouched.

## 2026-10-13 latest metadata update (71/80 preliminary)
- Moved **MST-1-013, MST-1-045, MST-1-079** from the partial-data bucket into the preliminary-stat bucket, filling printed energy, AP cost, BP, generation, effect, Trigger where applicable and a short Japanese text transcription. Evidence: retail card images https://www.merucarduniari.jp/product/17109 , https://www.merucarduniari.jp/product/17141 , https://www.merucarduniari.jp/product/17175 ; final authoritative Japanese wording is still to be checked.
- Added source-supported snippets to nine partial records: **010,011,015,019,023,044,061,064,078**. Their missing numeric values **remain null**. Third-party translation and product references https://rugiacreation.com/ua/search?Find1=UA54BT&Name=HK and https://www.unionarena-tcg.com/jp/cardlist/.
- Explicitly no claim of full data completion (80 names/rarities, only **71 preliminary full numeric rows**). `tests/mst-completeness.test.mjs` now verifies the 71/9 split and checks 013/045/079. No official art copied and no `auto` flags changed.

## 2026-10-13 路基亞卡表交叉核對
- 將路基亞中文卡表列為**非官方翻譯參考**：https://rugiacreation.com/ua/search?Find1=UA54BT&Name=HK ，日文原卡與 Q&A 裁定仍以 BANDAI 官方為準。
- Rugia 的部分印刷數字用圖示顯示，不能把 HTML 文字中的 `Image` 當成具體 AP、BP 或能源值。異圖及 AP 卡仍然排除。
- **MST-1-061 七星**：根據路基亞效果與卡片商家列出的能源1／AP1／BP2000及原本初步產能資訊，補齊完整數值欄位，正式自動結算仍未驗證。商家資料：https://www.ebay.com/itm/398082826728；路基亞：https://rugiacreation.com/ua/search?Color1=%E7%B6%A0&Name=HK&Version=MST。
- **初步完整欄位 72/80**；其餘8張（010、011、015、019、023、044、064、078）仍有數值待核對，不造假。全部卡片 `auto:false`，遊戲引擎實際支援 0/80。

## 2026-10-14 官方 80/80 印刷欄位完整稽核（最新、優先於上方歷史紀錄）
- 使用日本 BANDAI 官方逐卡頁 `detail_iframe.php?card_no=UA54BT/MST-1-NNN`，於獨立 GitHub Actions 讀取 001～080 共 **80/80** 頁並完成稽核：https://github.com/will00t-debug/Ua/actions/runs/38450040170 （PASS，80/80 官方頁可用、數值可解碼）。
- 目前 **80/80 初步完整印刷資料**：需求能源、印刷 AP、BP、發生能源、種類、特徵、Trigger、日文效果及生命 Trigger 效果，均已保存在 `dist/mst-official-print.mjs`，並由 `dist/mushoku-tensei.mjs` 明確載入覆寫早期參考資料。之前提及的 72/80 和其餘8張待補，屬於**已過期進度**。
- 最後八張 010 / 011 / 015 / 019 / 023 / 044 / 064 / 078 已依官方直接補齊，重點 064 原印刷 AP=2、BP4000、發生綠能源2；010 發生藍能源2；019 / 044 發生同色能源2。
- 已對全部80張的原有數值／Trigger／種類／特徵比對 BANDAI 官方，**0 項發現不一致**（最後8張修復後）。不含官方卡圖檔，維持版權待確認。
- `tests/mst-completeness.test.mjs` 與 `tests/mst-card-inventory.test.mjs` 更新成 **80/80** 資料檢查；執行測試用 `feature/mst-source-audit` 暫存分支的 GitHub Actions，避免覆蓋其他作品分支。
- **80/80 此處僅指初步印刷欄位**，不是中文逐字翻譯完整性、每卡 FAQ 結算驗證或可玩程度。主要對戰引擎 **0/80 已完成端到端驗證**；仍需接線、玩家選項、AP/Raid/生命時序、AI 與牌組 UI。
