# Rurouni Kenshin / 浪客劍心 UA41 — V2 kickoff (2026-11-16)

## Verified target and release gate
- Title key `rnk`, engine IDs `RNK-1-001` through `RNK-1-113`.
- UA41BT: numbered cards 001–100 (100 unique deck cards); six AP card designs.
- UA41ST: numbered cards 068, 070, 074, 078, 080, 081, 085, 096, 100 (reprints) plus 101–113 (13 new deck cards); one AP print. Its 27 listed products include parallel versions and MUST NOT be treated as 27 unique playable effects.
- Target: 113 unique BT/ST numbered deck cards, plus separate UAPR/RNK-P-001 event (114 tracked deck identities total). 8 verified AP print IDs including UAPR/RNK-AP01. Count artwork variants separately, never as new engine effects.
- UAPR/RNK-1-014, -057, -086, -090 are additional promo prints of existing BT IDs; do not create duplicate effects. More promo products, if verified later, must be added to the inventory explicitly.
- **Source data complete at 114/114 identities, not V2 gameplay complete**: Group A 001–028 has transcribed Traditional Chinese printed rules, while Groups B/C/D 029–113 plus the standalone promo have confirmed identity/printed stats, source links and concise human-readable Traditional Chinese ability synopses. These synopses are not verbatim printed copy and not executable DSL. Japanese printed effects, card-by-card rules review, V2 programs, editor and live-registry entries, and deployment remain pending. All 114 rows intentionally have `battleReady:false` and `effectImplemented:false`.
- Sources:
  - Official booster: https://www.unionarena-tcg.com/jp/products/boosters/rnk-1.php
  - Official starter filter: https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570041
  - Cross-check full list: https://cardframescanner.com/ja/games/union-arena/sets/ua41bt
  - Cross-check starter: https://cardframescanner.com/ja/games/union-arena/sets/ua41st
  - Official promo event: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-P-001
  - Official Traditional Chinese card detail pattern (001–028 checked individually): https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-001

## Four independent owners (7-card sub-batches preferred)
| Group | Exclusive numbered ID ownership | Sub-batches |
| --- | --- | --- |
| A | RNK-1-001–028 | 001–007, 008–014, 015–021, 022–028 |
| B | RNK-1-029–056 | 029–035, 036–042, 043–049, 050–056 |
| C | RNK-1-057–084 | 057–063, 064–070, 071–077, 078–084 |
| D | RNK-1-085–113 and RNK-P-001 | 085–091, 092–098, 099–105, 106–113, promo event |

- Shared starter reprint numbers stay owned by their numeric group (C or D). The print alias must not create a second card effect.
- A/B/C/D own separate `dist/rnk/cards-<range>.mjs`, `dist/universal-v2/rnk/programs-<range>.mjs`, and matching `tests/v2-rnk-<range>.test.mjs` files. Do not concurrently edit common registry, engine, shared catalog, or other group's files.
- Each sub-batch: confirm official card number, Japanese name, source image, color/type/energy/AP/BP/gen, trigger, traits, Japanese rules text, Traditional Chinese localization, V2 effect program, positive and negative acceptance tests. Never fabricate missing details; if the source is incomplete, mark not-ready and record the missing evidence.
- V2 `onPlay` and `onRaid` are separate. Respect target choices, attack windows, cost payment, place replacement, trigger resolution, and card conservation. Existing `dist/mha/catalog.mjs` and `dist/universal-v2/mha-pack.mjs` illustrate `battleReady:false` source catalogs and program-owned `ready:true` gates.
- Any new shared-engine effect should be raised as a narrowly scoped integration change; don't silently patch the engine in multiple group branches.
- Only after each acceptance gate: integration branch merges verified batches, wires editor/search/AI and online V2 lazily, verifies traditional Chinese, confirms 50-card legality, mobile/desktop card inspect, local `npm test`, remote CI, and then production deployment. Do not merge or deploy a partial manifest.

## Definition of done per numbered card
1. Official identity, numeric stats, trigger, source, Japanese printed text, and accurate Traditional Chinese text confirmed.
2. Correct V2 DSL/vanilla classification (vanilla only if truly no printed effect); all effects implemented with correct timing and target selection.
3. Regression tests include legal and illegal paths; no unsupported action silently becomes legal.
4. Card enters the ready battle pack only if independently accepted and stays consistent across deck editor, AI, and online battle.
5. No duplicate IDs from UA41ST reprints and no AP in the 50-card deck.

## Foundation files
- `dist/rnk/manifest.mjs`: stable IDs, print/reprint mappings, starter-only card names, AP prints, and all 114 expressly non-ready source rows in `RNK_SOURCE_CATALOG`; `RNK_TC_CATALOG` tracks 113 numbered BT/ST cards.
- `dist/rnk/cards-001-007.mjs`, `cards-008-014.mjs`, `cards-015-021.mjs`, `cards-022-028.mjs`: full Group A official Traditional Chinese 001–028 identity, cost, effect, trigger and source links; Japanese effects and runtime acceptance are not yet verified.
- `tests/v2-rnk-cards-001-007.test.mjs`, `v2-rnk-cards-008-014.test.mjs`, `v2-rnk-cards-015-021.test.mjs`, `v2-rnk-cards-022-028.test.mjs`: four independent seven-card acceptance-data guards.
- `tests/v2-rnk-manifest.test.mjs`: guards 113 numbered + one UAPR event identity, reprints, AP exclusion and false-ready flags.
- `dist/rnk/tc-source-helper.mjs`: normalized source URLs / image names, printed stats, card types, synopses, flags, and strict non-ready defaults.
- Group B: `dist/rnk/cards-029-035.mjs`, `cards-036-042.mjs`, `cards-043-049.mjs`, `cards-050-056.mjs` = 28 numbered source rows.
- Group C: `dist/rnk/cards-057-063.mjs`, `cards-064-070.mjs`, `cards-071-077.mjs`, `cards-078-084.mjs` = 28 numbered source rows.
- Group D: `dist/rnk/cards-085-091.mjs`, `cards-092-098.mjs`, `cards-099-105.mjs`, `cards-106-113.mjs` = 29 numbered source rows; `dist/rnk/promo-card.mjs` = independent UAPR event.
- `tests/v2-rnk-b-catalog.test.mjs`, `tests/v2-rnk-c-catalog.test.mjs`, `tests/v2-rnk-d-catalog.test.mjs`: coverage of ownership, counts, key effects, cards, print exceptions, and non-ready gates.


## Effect-engine follow-up / printed wording edge case
- The Traditional Chinese UA41BT/RNK-1-011 text names the event 〈生存的意志〉, while UA41BT/RNK-1-027's own Traditional Chinese printed title is 〈求生意志〉. The Japanese title of RNK-1-027 is 〈生きようとする意志〉. Confirm canonical name mapping when implementing 011's once-per-turn main ability. Do not treat the two TC renderings as two different event cards.
- RNK-1-008 requires Raid, Damage(2), opponent blocker BP cap, own-turn BP, event recovery and once-per-turn BP grant; do not mark ready based on partial DSL support.
- RNK-1-018 requires safe deployment of the raid-bottom card from underneath the host, with temporary cannot-attack and end-of-attack retirement; verify card conservation and zone capacity.
- RNK-1-026 is a field and RNK-1-027/028 are events, not characters; keep their BP/gen/trigger semantics distinct from character entries.
- Catalog uses `confirmedTc:true` for audited TC data while `cardDataVerified:false`, `effectJa:null`, `battleReady:false` stay false until independent JP and V2 acceptance; this is intentional.

## B/C/D source-data milestone — 2026-11-16

| Owner | Deck IDs | Count | Source recording | V2-ready |
| --- | --- | ---: | --- | ---: |
| A | RNK-1-001–028 | 28 | Official Traditional Chinese printed effect transcriptions | 0 |
| B | RNK-1-029–056 | 28 | Official TC identity, stats, source image/page, summarized effects | 0 |
| C | RNK-1-057–084 | 28 | Official TC identity, stats, source image/page, summarized effects | 0 |
| D | RNK-1-085–113 + RNK-P-001 | 30 | 29 numbered printed rows and one JP promo, source/summary | 0 |
| **Total** | **114 unique identities** | **114** | **Source catalog milestone complete** | **0** |

**Acceptance gap:** A/B/C/D source files do not implement card effects; `effectJa:null`, `effectImplemented:false`, `cardDataVerified:false`, and `battleReady:false` are deliberate. The concise B/C/D effect synopses require full official JP/TC printed-text confirmation, FAQ/rules interpretation, DSL implementation, positive+negative functional tests, image checks, UI/editor, AI and online battle before production use. A catalog test checks data contracts, **not** an effect-correctness test.

### Known source conflicts and print-specific review

1. `UA41ST/RNK-1-106`: the official Traditional Chinese detail page unexpectedly displays an effect belonging to another card; the official English card detail confirms the red Kenshin Raid + Impact (1) + move opposing character to Energy line. Save official EN source in `sourceEn`, set `confirmedTc:false` and `needsManualReview:true`. Do not substitute erroneous TC text.
2. `UA41ST/RNK-1-112` and `113`: purple-character energy generation shows a blue symbol on the TC detail page. Mark `needsManualReview:true`; inspect Japanese or physical printing before confirming engine `genColor`. Their fields are not marked battle-ready.
3. `UAPR/RNK-1-086` is a booster-reprint ID with a **different printed trigger**. `RNK_PRINT_RULE_EXCEPTIONS` records the exception; identical engine ID does not imply the printed variants resolve an identical trigger. Introduce print-specific battle identity/rules design before enabling this promo print; do not conflate with base booster.
4. `UAPR/RNK-P-001`: standalone five-color event, cost 4 AP 1 with Final trigger, Japanese official page verified; TC official page unavailable, so `confirmedJa:true` and `confirmedTc:false`. Its color `multicolor` needs explicit V2 matching semantics.
5. `RNK-1-011` references the event using a Chinese variant `生存的意志` while `RNK-1-027` prints `求生意志`. Map to one canonical event ID when implementing 011 and 027.

### Suggested effect implementation order after source milestone

- B: red/purple energy discounts, target selection, attacks, battle-state moves, conditional enter/raid, and `onPlay`/ `onRetire` sequencing.
- C: mill-to-field triggered effects for `RNK-1-056/059`, conditional AP pay, active/rest swaps and opponent move/retire effects; test identity and no duplication.
- D: `RNK-1-085`–`090` battle-loss-to-energy replacement and overflow behavior; `RNK-1-103` must-block, `RNK-1-106` Raid/move and malformed TC source, multicolor `RNK-P-001`, and promo print-specific trigger.

**Release rule:** do not wire `rnk` into `officialV2Pack`, announce ready play, merge the draft or deploy before those rules and integration tests are completed.

## First V2 program implementation (B group): Japanese-authority sandbox

- `dist/rnk/jp-evidence-029-035.mjs`: Japanese-printed name, original effect, trigger text, and a Japanese transcription source for RNK-1-031 / 035. Do not change the existing Traditional Chinese display copy.
- `dist/universal-v2/rnk/programs-029-035.mjs`: verified DSL `recoverAp(2)` for RNK-1-031; true no-ability `vanilla` for RNK-1-035. RNK-1-029, 030, 032, 033, 034 remain explicitly unready with individualized blockers.
- `dist/universal-v2/rnk-staging-pack.mjs`: an isolated V2 validation pack of exactly those two cards. It is **not** imported by `officialV2Pack('rnk')`, editor, AI or production online battle.
- `tests/v2-rnk-b-programs-029-035.test.mjs`: Japanese evidence, engine schema normalization, exact AP 2 recovery shape, GET-only vanilla, unsafe-source/unknown-ID fail-closed checks, and production-registration exclusion.
- For RNK-1-029, Japanese official `Q1596` defines attack end as **after battle**, or **after trigger check** for damage to the player. Do not create a simplified instant-ready effect that misses this.
- General Japanese rule `Q81/Q83/Q84` distinguishes compulsory `1枚選び` from optional `1枚まで選び`. Keep this distinction when implementing RNK-1-032.
- This stage is a **program / schema acceptance milestone only**. Do not count it as a completed AI/online gameplay acceptance, and do not change the official `0/114` live tally before in-match AP payment and trigger regression tests pass.

Evidence: https://www.torekaoh.shop-pro.jp/?pid=187659257 (031), https://www.torekaoh.shop-pro.jp/?pid=187659262 (035), https://www.unionarena-tcg.com/jp/faq/list.php?series=UA41BT and https://www.unionarena-tcg.com/jp/faq/list.php?type=0.

## 共通引擎架構決議（Universal V2）

**決議：浪客劍心不建造獨立的 RNK 牌局引擎。** 作品代碼 `rnk` 僅用於卡表、印刷版本與設定資料，卡牌效果由 `dist/universal-v2/pack.mjs` 驗證的共通 DSL 表示，實際對局沿用現有 Universal V2 引擎。

- `dist/universal-v2/rnk-shared-adapter.mjs`：通用來源卡 → V2 卡牌資料轉接層，強制檢查日文原文依據、效果完整性、共通 V2 程式欄位及非 ready 原始卡表。
- `dist/universal-v2/rnk/programs-029-035.mjs`：每張卡的資料驅動 DSL，沒有 `rnkSpecial` 或任何作品專屬 opcode。
- `dist/universal-v2/rnk-staging-pack.mjs`：僅測試使用的輕量相容入口，由共通轉接層產生套牌，尚未註冊至正式遊戲。
- `tests/v2-rnk-common-engine-contract.test.mjs`：同一張卡可經共通 adapter 編譯為同一套 V2 pack；作品私有欄位及未知 opcode 必須被拒絕；未完成、重複編號、錯誤日文原文不得進包。

**以既有共通能力優先**：`draw`、`drawDiscard`、`recoverAp`、`retireOppFrontUnderBp`、`buffOwnField`、`raidName`、`impactNull`、`step`、`activeExtraEnergy` 等，都在共通驗證與 runtime 既有支援範圍內，但必須依照完整日文印刷文本進行正確組合及遊戲驗收。特殊時點如攻擊結束、結算 Trigger 後、對戰敗北改移能源線、滿格替換、印刷版本差異，不得用近似 DSL 冒充；必要時先做**非作品專用**的通用時序／選擇／移區機制並增加所有作品共用的回歸測試。

介面仍顯示原有繁中翻譯，不改 `dist/rnk/cards-*.mjs` 的顯示文案。日文卡文和 FAQ 負責**裁定**；共通引擎負責**執行**；逐卡程式負責**組合**。初期 031、035 是共通引擎**開發測試包**，不代表已完成完整對局驗收，`battleReady` 仍維持 false，正式 PR 保持 Draft，不得部署。

## B group 036–042: further shared V2 work, Japanese as authority

- `RNK-1-036` (斎藤 一): verified original Japanese effect and DRAW Trigger against `https://www.torekaoh.shop-pro.jp/?pid=187659263` and the official TC card list. Uses the same shared V2 `searchTopOneBottomDiscard` implementation already used by CSM: inspect top 3, choose up to one of 〈緋村 剣心〉 / 〈斎藤 一〉 / 〈相楽 左之助〉, put remainder on bottom in chosen order; discard one own hand card only if a named card was taken. Implemented as a tested staging program without changing the Traditional Chinese display.
- `dist/rnk/jp-evidence-036-042.mjs`: verified Japanese printed text for 036 only.
- `dist/universal-v2/rnk/programs-036-042.mjs`: ready DSL for 036; explicit non-ready reasons for 037–042.
- `dist/universal-v2/rnk-b036-staging-pack.mjs`: separate common-engine staging adapter, imports no production registry.
- `tests/v2-rnk-b-programs-036-042.test.mjs`: positive source/DSL/schema checks, negative unknown opcode, no 50-card deck and official registry exclusion.
- `RNK-1-037`: Japanese original is available at `https://www.torekaoh.shop-pro.jp/?pid=187659264`. Existing `mayShiftOwnCharacter` is unrestricted and must **not** be used for a printed three-name-only line move. Add a reusable name-restricted common movement operation only after cross-title tests.
- `RNK-1-041`: the existing common `bounceOwnOtherUnderEnergy(1)` appears to fit the Taiwan text and MHA precedent, but Japanese printed text still needs confirmation before enabling it.
- `RNK-1-042`: existing `optionalPayApThen` does not permit the opposing-field-retirement branch as-is; do not silently compose unsupported effects.
- B stage program count is now 3 (031, 035, 036), **not** 3 in-match gameplay acceptances. Full 114-card public match readiness remains 0 until end-to-end rule and UI tests.

## Fast-track reusable DSL batch — 2026-11-16

Following the user's request to reduce one-card-at-a-time overhead, the B/C/D workflow now groups identical fully checked Japanese card text into **one reusable program profile and one shared regression suite**, leaving exceptions non-ready.

- `dist/rnk/jp-evidence-common-bcd.mjs` holds seven Japanese print-source records with canonical names, printed effect/trigger and references.
- `dist/universal-v2/rnk/programs-common-bcd.mjs` reuses only existing common V2 ops `recoverAp(count:2)`, `drawDiscard(count:1)`, or genuine `vanilla`; no title-private op or RNK runtime.
- `dist/universal-v2/rnk-bcd-batch-pack.mjs` merges earlier verified 031, 035, 036 and seven newly verified 053, 055, 063, 065, 073, 096, 097, yielding **10 Japanese-evidence-backed programs in a staging-only V2 pack**.
- `tests/v2-rnk-bcd-batch-programs.test.mjs` checks each AP effect, vanilla trigger, the 053 draw/discard path, unique inventory, and production exclusion. This is **10 staged effect programs, still 0 fully battle-accepted**.
- `UA41ST/RNK-1-096` source card is a printed reprint of the shared `RNK-1-096` identity and has the same AP-recovery profile as the UA41BT print. Keep the source URL of the audited print in the evidence, rather than manufacturing another engine ID.
- CI failure on a previous commit (`43749361995`) traced to a literal `\\nimport` on the comment line in `dist/rnk/cards-106-113.mjs`, hiding the `tcCard` import. The import was fixed at `a6499328`. All nine failed RNK files shared this root module-load error; the corrected follow-on run still needs a green completion check.

## Shared-V2 fast batch expansion: 23 distinct programs (2026-11-16)

The combined `dist/universal-v2/rnk-bcd-batch-pack.mjs` now stages **23** independently source-reviewed identities. Beyond the original 10, nine new common profiles are in `rnk/programs-fast-bcd.mjs`: 041 and 078 reuse the mandatory under-energy bounce; 047 and 081 reuse active-only +1 generated energy; 068 reuses draw-then-discard one; 069 and 080 reuse optional +1000 BP for another own character; 074 and 091 are actual Japanese-print no-effect characters, retaining their printed ACTIVE triggers. Four additional passive profiles in `rnk/programs-passive-bcd.mjs`: 051 (opponent blue/red → -purple 1 required hand energy), 079 (opponent blue/purple → -red 1), 061 and starter-only 107 (impact null). All use the **existing** Universal V2 schema; no private `rnk` opcode.

Japanese print source records: `dist/rnk/jp-evidence-fast-bcd.mjs`, `dist/rnk/jp-evidence-passive-bcd.mjs`. Batch tests: `tests/v2-rnk-bcd-fast-nine.test.mjs` and `tests/v2-rnk-bcd-passives.test.mjs`, and updated 23-card census in `tests/v2-rnk-bcd-batch-programs.test.mjs`. Merchant Japanese print transcriptions were individually cross-checked. New source signatures are **not** a substitute for full board-action and gameplay tests; 23 staged programs, **0/114 live-approved cards**. `RNK-1-107` belongs to `UA41ST` and must not be fabricated as a booster printing. The complete 114-identity Traditional Chinese catalog is unchanged.

Full GitHub CI run `43750274533` passed before this 13-card expansion. The current 23-card commit requires new CI verification and must remain Draft/unmerged/unreleased.

## Next shared-DSL batch (2026-11-16): 27 staging cards and legal-deck smoke test

After all **23/23 previous staged cards passed the GitHub CI suite** (`43751567412`), four more card programs were Japanese-transcript verified and added to the SAME common-engine staging pack:

- `RNK-1-092` 明神 弥彦 (UA41BT): `step:true` and `emptyOwnFieldHandEnergyDiscount:2`. Discount applies only if own field has no cards; it does not change printed energy or printed generation. Japanese proof: `https://www.torekaoh.shop-pro.jp/?pid=187659326`.
- `RNK-1-104` 関原 妙＆三条 燕 (UA41ST): `onPlay [{op:'peekTopOrBottom'}]`; preserve ACTIVE trigger. Japanese proof: `https://www.torekaoh.shop-pro.jp/?pid=187659349`.
- `RNK-1-046` 緋村 剣心: common `mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1000}`. Japanese proof: `https://www.torekaoh.shop-pro.jp/?pid=187659273`.
- `RNK-1-064` 牙突: common `retireOppFrontUnderBp`, printed baseline BP3000, BP5000 in presence of own 〈斎藤 一〉, plus explicit `special` trigger retirement. Japanese proof: `https://www.torekaoh.shop-pro.jp/?pid=187659293`.

Data modules: `dist/rnk/jp-evidence-simple-next.mjs`, `dist/universal-v2/rnk/programs-simple-next.mjs`; all Traditional Chinese display data unchanged. The existing reusable `rnk-shared-adapter.mjs` now allows the existing common `emptyOwnFieldHandEnergyDiscount` schema field.

Tests: `tests/v2-rnk-bcd-simple-next.test.mjs`, `tests/v2-rnk-bcd-simple-extra.test.mjs`. Full legal 50-card *staging match initialization* smoke test: `tests/v2-rnk-27-staging-match-smoke.test.mjs`. This is cross-title engine integration coverage, **not** card-by-card battle-effect acceptance, not `officialV2Pack('rnk')` registration, and does not authorize production deployment.

Known blocked card examples: `RNK-1-075` mandatory unblocked draw has official FAQ Q1610 timing and cannot be silently made optional; `RNK-1-083` main REST+temporary generated energy+retire requires valid any-line semantics; `RNK-1-108` FIELD REST draws then discards and must preserve operation order. All remain unready.
