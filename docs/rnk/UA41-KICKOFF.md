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

## B/C/D 31-card Universal V2 staging (2026-11-16)

The previous 27-card CI (`43752524509`) ran **5,617 tests with 5,616 passing and one failing**. The failure was an invalid negative-test fixture in `tests/v2-rnk-bcd-simple-next.test.mjs`: it passed a *normalized output* back into the compiler and hit `invalid alternative Raid bases` before the intended unknown-op guard. Fixed in commit `0107908b` by compiling the deliberately bad authored card *once* via `rnkSharedCard`. No observed failure of an actual RNK gameplay assertion.

Four additional Japanese-transcribed cards are newly staged, bringing the compiled shared-V2 count to **31** (but still **0/114 accepted in production**):

- `RNK-1-049`, purple 三島 栄次: `mainAbility: {op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}` (source https://www.merucarduniari.jp/product/12927).
- `RNK-1-057`, purple 瀬田 宗次郎: one shared `searchTopOneBottomDiscard` effect using Japanese exact names 〈志々雄 真実〉、〈駒形 由美〉 or ［十本刀］, with conditional discard after adding to hand (source https://www.merucarduniari.jp/product/12935).
- `RNK-1-083`, red 塚山 由太郎: same `restSelfGainEnergyRetireEndMain` common ability (source https://www.merucarduniari.jp/product/12961).
- `RNK-1-108`, red UA41ST field 神谷道場: `mainAbility:{op:'fieldRestDiscardDraw'}`, REST then draw1/discard1, GET trigger (source https://www.merucarduniari.jp/product/13000).

The reusable implementation is `dist/universal-v2/rnk/programs-bcd-next4.mjs`; original JP proof is `dist/rnk/jp-evidence-bcd-next4.mjs`. The integration pack `dist/universal-v2/rnk-bcd-batch-pack.mjs` now computes 31 staged IDs, and `tests/v2-rnk-bcd-next4-programs.test.mjs` verifies exact printed names/stats, field trigger and common opcode semantics, while the full 50-card match smoke test was updated for 31. No change to Chinese display or production route. Current new CI run `43753592693` must finish before any statement that 31 are CI green; PR remains Draft/unmerged/unreleased.

## Printed rule mismatch found: RNK-1-062 (do NOT auto-port the Chinese synopsis)

Japanese official FAQ **Q1607** and the original English official print reveal that `RNK-1-062` 大型甲鉄艦 煉獄 has a fundamentally different effect from the initial source-only synopsis. The Japanese-faithful behavior has **three** interdependent clauses: (1) on play, one own 〈志々雄 真実〉 may gain an unblocked-attack optional draw until end of turn, (2) main ability REST+retire this FIELD, (3) on retirement draw two cards. The granted unblocked effect resolves immediately after blocker declaration, not after damage/trigger, per Q1607.

- Grounded official English print: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-062
- Official Japanese FAQ: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA41BT
- Do not implement it with generic `buffOwnField` or a 1000-BP buff; that would be a rules bug.
- `dist/rnk/jp-rule-holdouts.mjs` and `tests/v2-rnk-jp-faq-holdouts.test.mjs` enforce an explicit block until all clauses and source timings are supported and exercised in common-engine match tests.
- **As requested, existing Traditional Chinese display has not been altered.** This lock is about English/Japanese evidence and future rule implementation, not a user-visible translation overhaul.

## Japanese blue events 030/032 → 33 common-V2 programs (2026-11-16)

B-group blue event `RNK-1-030` 九頭龍閃 and `RNK-1-032` 逆刃刀・真打 were independently cross-checked with full Japanese printed card text (Japanese seller prints: https://www.merucarduniari.jp/product/12908 and https://www.merucarduniari.jp/product/12910). These are effect- and trigger-complete **staging** programs, not live acceptance.

- `030`: `retireOppFrontUnderBp({bp:3000,bonusName:'比古 清十郎',bonusBp:5000})` then an `ifLiveThen(ownNameExists 比古 清十郎)` gate for **optional** +1000 BP to up to one own `緋村 剣心`. The optional +1000 exists **only** if Hiko is in the controller's field. SPECIAL is preserved. Not unconditional.
- `032`: **mandatory** `buffOwnField` +2000 to exactly one own `緋村 剣心` (`optional:false`), followed by `recoverAp({count:1})`, optionally ready at most one own AP. Printed Japanese `1枚選び` vs `1枚まで選び` is deliberately distinguished. DRAW trigger preserved. **Important**: common schema compilation does not itself prove that a play is rejected when mandatory Kenshin target absent; add a real in-match legality test before release.
- Sources: `dist/rnk/jp-evidence-blue-events.mjs`, `dist/universal-v2/rnk/programs-blue-events.mjs`, `tests/v2-rnk-blue-events.test.mjs`. Updated shared staging pack aggregate and 33-card census test. No changes to existing Traditional Chinese UI texts or official battle registry.

**Rules holdout:** `RNK-1-075` 相楽 左之助 must draw one **every time it attacks and is not blocked**, immediately after blocker declaration and before damage or trigger. Japanese official **Q1610** (https://www.unionarena-tcg.com/jp/faq/list.php?series=UA41BT). Existing generic `unblockedAttack` schema supports mandatory `oncePerTurn:true` or optional no-once; neither faithfully represents this printed mandatory no-once ability. `dist/rnk/jp-rule-holdouts.mjs` and `tests/v2-rnk-jp-faq-holdouts.test.mjs` explicitly bar 075 from staging until a reusable V2 engine extension and end-to-end tests exist.

**Count**: 33/114 staged shared-engine programs; 0/114 end-to-end battle-accepted. The 31-card GitHub workflow `43753592693` passed; test maintenance refactor workflow `43754405544` also passed. The HEAD containing 33 cards and FAQ holdout needs its own green CI check. PR stays Draft/unmerged/unreleased.

## Shared V2 next-eligible AP discount: RNK-1-048 (34 staged programs)

Original Japanese `UA41BT/RNK-1-048` 緋村 剣心, https://www.merucarduniari.jp/product/12926:
- Enters ACTIVE unconditionally (`enterAlwaysActive:true`).
- On play: **the next hand use this turn of a CHARACTER named 〈斎藤 一〉 with printed required energy at most 3** costs 1 less AP. An earlier nonmatching hand use does **not** consume it. Japanese official Q1599: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA41BT
- Uses the existing Universal V2 `nextEligibleHandPlayApDiscount` with `{cardType:'character',name:'斎藤 一',printedRequiredEnergyAtMost:3}`, and the existing shared `enterAlwaysActive`; no new RNK engine branch, no Chinese UI modification.
- Files: `dist/rnk/jp-evidence-048.mjs`, `dist/universal-v2/rnk/programs-048.mjs`, `tests/v2-rnk-048-discount.test.mjs`. Tests positive same-name energy ≤3, reject energy 4 / wrong name / event.
- Source-count milestone **34/114 Japanese-backed V2 staging programs, 0/114 full game-effect acceptance**. The new HEAD's full CI must complete before considering it CI-green. Only one cross-group census test stores the fixed 34 expected count; other test suites derive size from `RNK_BATCH_STAGING_IDS.length`. Do not wire RNK into officialV2Pack yet.

## 2026-11-16: blue-language source normalization + 49 staged / 16 reviewed B001-027

The 34-program baseline passed full GitHub Actions (`43755980010`). An additional **15 Japanese-verified, runnable shared V2 profiles** are staged in `dist/universal-v2/rnk/programs-blue-common.mjs` alongside the prior 34 (total **49**). The source file `dist/rnk/jp-evidence-blue-common.mjs` contains **16** reviewed prints: 15 executable and one held out. Executable IDs:

`RNK-1-001,002,003,004,006,009,012,014,015,020,021,022,023,025,027`.

They use only existing shared DSL operations: `searchTopOneBottomDiscard` (including top-7 with no discard), `nameAliases` (printed alias 002 as 〈緋村 剣心〉), `restSelfGainEnergyRetireEndMain`, `bounceOwnOtherUnderEnergy`, `buffOwnField`, `impactNull`, `inspectTopArrange`, `opponentFieldColorsHandEnergyDiscount`, `drawDiscard`, `ownTurnBp`, `drawIfOwnName` on retirement, `activeExtraEnergy`, `inspectTopAnyOutside` (top 3, move up to one to outside), `emptyOwnFieldHandEnergyDiscount`, and `recoverAp`. All cards remain source-only and nonproduction.

### Data and name identity safeguards

- Cross-language trait: source Traditional Chinese `御庭番眾` is explicitly mapped at **runtime only** to Japanese `御庭番衆` in `rnk-shared-adapter.mjs`. This matters for RNK-1-021's top-three `高荷 恵` OR `御庭番衆` search. The old Chinese display is unmodified; do not replace source translations.
- The Japanese merchandise listing `RNK-1-003` incorrectly states printed BP **2000**, while the official `UA41BT/RNK-1-003` Japanese/English local print and the existing TC source correctly show **1000**. The compiled V2 card retains the official **1000**; the vendor BP is not rules authority. Official: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-003
- Merchant listing `RNK-1-027` incorrectly labels a `御庭番衆` trait; the official original print has **no trait**. The compiled event has `traits:[]`. Official: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-027
- Note: `RNK-1-016` was **audited but not staged**: printed effect grants a draw only when the card is entered by **own CHARACTER or EVENT CARD effect**, whereas the existing generic `selfEnteredByOwnEffect` query accepts every own-effect cause, including a FIELD's effect. It would overdraw, so `RNK_PROGRAMS_BLUE_COMMON['RNK-1-016'].ready=false` until the common engine can check the **source card type**. Never count it as playable or silently generalize.
- Other unresolved complex cards (e.g., 026 hand-discard threshold, 028 Aoshi-count-dependent BP retirement) are not staged.

Regression test: `tests/v2-rnk-blue-common-12.test.mjs` (historical filename retained) checks all 16 Japanese records, 15 exact runnable programs, 016 exclusion, Japanese names/traits, printed numeric stats, and complete effect shape; `tests/v2-rnk-bcd-batch-programs.test.mjs` asserts the **single global 49-card census**. Existing legal 50-card V2 staging match smoke remains in the suite. HEAD CI for the 49-stage milestone is pending. **0/114 fully battle-accepted, no merge or deployment, PR stays Draft.**

## 2026-11-16: UA41ST/RNK-1-109 — 50th Japanese-backed shared V2 program

The **49-card** staging CI `43757496844` completed **success**. The next milestone adds exactly **one** newly audited starter card `RNK-1-109` (逆刃刀) while the remaining difficult cards await reusable engine capabilities.

- Original Japanese print transcribed from https://www.merucarduniari.jp/product/13001 and cross-checked with official English and Traditional Chinese: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-109.
- Event on use: first **mandatory draw 1**, then **optional up to one** own 〈緋村 剣心〉 gains a `when attacking -> draw 1` effect through **end of turn**.
- Reuses existing Universal V2 `draw` and `grantOnAttack({target:'ownCharacter',name:'緋村 剣心',optional:true,until:'endOfTurn',then:[draw(1)]})`; keeps printed DRAW trigger.
- Files: `dist/rnk/jp-evidence-st-109.mjs`, `dist/universal-v2/rnk/programs-st-109.mjs`, `tests/v2-rnk-st-109-grant-attack-draw.test.mjs`. Staging aggregator and sole fixed total census updated from 49 to **50**.
- No source Traditional Chinese fields changed. `RNK-1-109` is **UA41ST**; the print is not mislabeled UA41BT. This milestone remains program/schema only, **not** end-to-end effects or UI/AI acceptance.
- Several next candidates are not safe shorthand conversions: `RNK-1-058` requires front-line main activation with top one -> top or OUTSIDE, not bottom; `RNK-1-060` has name/name/trait **one-target OR** selection; `RNK-1-112` places a card from hand on top of deck **without first drawing**; `RNK-1-113` optionally draws then skips **exactly the next one** ACTIVE attempt, per official Japanese Q1623. None can be treated as ready using approximate shared operations.
- **50/114 staged programs; 0/114 fully battle-accepted.** Latest 50-card CI is pending. PR remains Draft/unmerged/unreleased.

## 2026-11-16 — Universal V2 source-kind predicates (51 staged card programs)

Latest source-only catalog remains **114/114** and Traditional Chinese card display is unchanged. **49-card full CI run 43757496844 succeeded**. The follow-on **50-card run 43758267395** executed 5,647 tests, with 5,646 passing and **one historical test count fixture** failing (`tests/v2-rnk-blue-common-12.test.mjs` asserted 49 when the 109 card made it 50). The test was adjusted to the current staging inventory; the 109 shared-effect assertions did not fail.

- `RNK-1-109` (starter event, 逆刃刀): Japanese printed event gives **mandatory draw 1** followed by optionally giving one own 〈緋村 剣心〉 attack-triggered draw 1 for the turn. Implemented by existing shared `draw` and `grantOnAttack`; tracked separately in `dist/rnk/jp-evidence-st-109.mjs`, `dist/universal-v2/rnk/programs-st-109.mjs`, and its regression suite.
- `RNK-1-016` (四乃森 蒼紫): previous safety holdout was resolved **generically in Universal V2**. A predicate `{kind:'selfEnteredByOwnEffect',turn:'any',sourceTypes:['character','event']}` now uses the **latest completed own field-entry record**, requires `reason==='own-effect'`, follows the record's `sourceCardId` to the printed source type, and fails closed for missing, unknown or FIELD sources. This is a shared, strictly validated engine capability, not an RNK-only exception.
- Core updates: `dist/universal-v2/pack.mjs` verifies the optional source-types filter; `dist/universal-v2/field-conditions.mjs` checks actual move provenance; `dist/universal-v2/rnk/programs-blue-common.mjs` enables the exact 016 program. Legacy predicate uses lacking `sourceTypes` retain their semantics for other titles.
- Tests: `tests/v2-rnk-016-shared-entry-source-types.test.mjs` covers CHARACTER, EVENT, FIELD, absent source, invalid source, non-effect entries, latest entry precedence and old behavior; `tests/v2-rnk-blue-common-12.test.mjs` now counts all 16 Japanese-checked blue programs as executable staging definitions. `tests/v2-rnk-bcd-batch-programs.test.mjs` is the sole fixed total census (51).
- Current milestone **51/114 distinct shared-V2 staging programs**, but still **0/114 complete end-to-end gameplay and UI accepted cards**. New CI (run 43758747655) has not been verified green. PR #506 remains Draft; nothing merged into production, no deployment.

## 2026-11-16 — shared line shift, named impact, hand-to-top, attack draw skip (55 staged)

Four more Japanese-checked prints compile on the shared Universal V2 engine. Source catalog stays **114/114**. Traditional Chinese display is unchanged. **0/114** are battle, UI, or AI accepted. `officialV2Pack('rnk')` stays closed. This remains a draft continuation of PR #506.

- `RNK-1-037` 斎藤 一: lone character onPlay `mayShiftOwnCharacter` with `optional:true` and names 〈緋村 剣心〉〈斎藤 一〉〈相楽 左之助〉. A printed alias such as 心太 counts. Other names stay illegal. The unrestricted shift is still rejected, including the pending copy in `programs-036-042.mjs`. Official EN: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-037
- `RNK-1-095` 悪一文字: `buffNamedImpact` +1500 BP and Impact (1) for up to one 〈相楽 左之助〉, then an unconditional `draw`. Skipping the target or having none still draws. The shared BP step is 500, so 1500 is exact and 750 is rejected. Official EN: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-095
- `RNK-1-112` 志々雄 真実: lone character onPlay `placeHandOnDeckTop`. Mandatory one hand card onto the deck top, unrevealed, with no draw. An empty hand does not open a choice. New pending kind `effect-place-hand-top` is on the pending-kind allowlist and the private-choice reader. Official EN: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-112
- `RNK-1-113` 斎藤 一: lone character onAttack `optionalDrawSkipNextActive`. Drawing grants `skipNextActive` for exactly the next ACTIVE attempt (official Q1623). Declining, or an empty deck, does not. `mayDrawOne` stays onPlay-only. Official EN: https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-113
- `RNK-1-016` color trigger was missing from the compiled program, so the staging pack could not load. Official JP, EN, and TC all print: choose one opponent front character with BP 3500 or less and return it to hand. The merchant page omits that trigger. The program now uses the existing `bounceOppFrontUnderBp` profile at BP 3500. Display text is unchanged.
- Files: `dist/rnk/jp-evidence-shared-next.mjs`, `dist/universal-v2/rnk/programs-shared-next.mjs`, `tests/v2-rnk-shared-next.test.mjs`. Fixed census is **55** in `tests/v2-rnk-bcd-batch-programs.test.mjs` and `tests/v2-rnk-blue-common-12.test.mjs`.
- Still unstaged: `RNK-1-058` (top or outside, not bottom), `RNK-1-060` (name/name/other-trait one target), `RNK-1-075` (mandatory unblocked draw, Q1610), `RNK-1-062` (three-clause FAQ Q1607). Starter `RNK-1-112` and `RNK-1-113` keep `needsManualReview` for the printed generation symbol.
- **55/114 staged shared-V2 programs; 0/114 fully battle-accepted.** No merge and no deployment.

## 2026-11-16 — twenty shared effects (75 staged)

Twenty more Japanese-checked prints compile on the shared Universal V2 engine. Where an existing opcode did not match the printed sentence, the new effect is a shared op, not a title-private opcode and not a nearby approximation. Source catalog stays **114/114**. Traditional Chinese display is unchanged. **0/114** are battle, UI, or AI accepted. `officialV2Pack('rnk')` stays closed. `battleReady`, `effectImplemented`, and `cardDataVerified` stay false. This is a draft continuation of PR #508. Official Japanese pages are the rules authority: `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-NNN`.

- `RNK-1-005` 武田 観柳: choose one. Up to one opponent front character with BP 2000 or less, or optionally sideline one of your 御庭番衆 and, if you do, draw 1 and sideline up to one opponent front character with BP 4000 or less.
- `RNK-1-007` 比古 清十郎: during your turn, Impact (1) only after a successful hand play of 〈九頭龍閃〉 or 〈生きようとする意志〉. Payment discards do not count. New live condition `ownNamedCardsUsedThisTurn`.
- `RNK-1-017` 四乃森 蒼紫: may rest one other active front 御庭番衆. If you do, this character becomes active.
- `RNK-1-026` 修行: look at the top 3, add up to one 〈比古 清十郎〉 or 〈緋村 剣心〉, rest to the bottom. A hand discard happens only when the added card's required energy is 4 or more. 心太 matches through the printed alias.
- `RNK-1-028` 回天剣舞: mandatory retire of one opponent front character with BP 3000 or less, plus 1000 for each of your 〈四乃森 蒼紫〉. Special trigger retires one opponent front character.
- `RNK-1-034` 駒形 由美: on play, draw 1 then place one hand card outside. On leave, if 〈志々雄 真実〉 is on your front, you may rest one opponent front character. Energy-line 志々雄 does not count.
- `RNK-1-042` 相楽 左之助: may pay 1 AP. If you do, sideline up to one opponent field.
- `RNK-1-045` 緋村 剣心: look at the top 2. Up to one purple card with no traits, of any type, goes outside. The rest returns to the top. Both inspected cards stay visible, including the one that cannot be chosen.
- `RNK-1-052` 佐渡島 方治: purple energy generation +1 while the combined unique count of 〈志々雄 真実〉, 〈駒形 由美〉, or other 十本刀 on your field is 3 or more. `か` plus `他の` excludes this card from the trait count. This is not an on-play effect.
- `RNK-1-058` 瀬田 宗次郎: front, once per turn, look at the top card and place it on top or outside. The color trigger plays one purple character of required energy 2 or less and AP 1 from outside, active, onto the front.
- `RNK-1-060` 本条 鎌足: up to one 〈志々雄 真実〉, 〈駒形 由美〉, or other 十本刀 gets +1000 BP this turn. This card cannot choose itself through the trait.
- `RNK-1-062` 大型甲鉄艦 煉獄: up to one 〈志々雄 真実〉 gains "when this character attacks and is not blocked, you may draw 1" until end of turn (Q1607, after the block decision and before damage). The grant stays if this field later leaves. Activate by resting this energy-line field to sideline it. On leave, draw 2. The Traditional Chinese synopsis is not implemented. Holdout status `JAPANESE_PRINT_CONFLICT` stays on the holdout record.
- `RNK-1-066` 十本刀集結: mandatory retire of one opponent front character with BP at most 1000 times the sum of 〈志々雄 真実〉 and 〈駒形 由美〉 and 十本刀. A card that is both a printed name and the trait counts twice. This is not the unique-or count used by 052 and 060.
- `RNK-1-067` 幕末の亡霊: place one 〈志々雄 真実〉, 〈駒形 由美〉, or 十本刀 from outside onto the deck top, unrevealed. Then you may active one of your AP. The AP sentence is not gated by the place. With no matching outside card, the place does not happen and the AP choice still opens.
- `RNK-1-072` 斎藤 一: up to one 〈緋村 剣心〉, including the 心太 alias, loses its during-your-turn text until end of turn. Attack and on-play text without that icon stay. Opponent-turn BP stays.
- `RNK-1-075` 相楽 左之助: when this character attacks and is not blocked, draw 1. Mandatory, every attack, no once-per-turn gate (Q1610). The compiled program keeps `optional:false`. Holdout status `MANDATORY_UNBLOCKED_DRAW_TIMING` stays on the holdout record.
- `RNK-1-082` 高荷 恵: choose one. Up to one character with required energy 1 or less from outside to hand, or up to one other character on your field gets +1500 BP this turn.
- `RNK-1-084` 月岡 津南: choose one. Up to one resting front 〈相楽 左之助〉 becomes active, or you may rest one active front 〈相楽 左之助〉 and, if you do, rest up to one opponent front character.
- `RNK-1-094` 赤べこ: look at the top 3, add up to one character, rest to the bottom. If the added card is not 〈相楽 左之助〉, place one hand card outside.
- `RNK-1-100` 龍槌閃: up to one opponent front character with BP 5000 or less moves to that player's energy line. If 〈緋村 剣心〉 is on your field, you may put that character on the bottom of their deck instead. Energy is the default.
- New shared ops include `retireOppFrontPerName`, `retireOppFrontCategoryScale`, `searchTopConditionalDiscard`, `peekTopOrOutside`, `grantNamedUnblockedOptionalDraw`, `fieldRestRetire`, `loseOwnTurnText`, `moveOppFrontBpOrBottom`, `outsideUnionToDeckTopThenActiveAp`, `optionalRetireOwnTraitThen`, `optionalRestNamedFrontThen`, `optionalRestOtherFrontTraitThenActive`, `buffOwnUnion`, and `unionEnergy`. Closed looks still store the full window.
- Files: `dist/rnk/jp-evidence-shared-twenty.mjs`, `dist/universal-v2/rnk/programs-shared-twenty.mjs`, `tests/v2-rnk-shared-twenty.test.mjs`. Staging census is **75**.
- Starter `RNK-1-112` and `RNK-1-113` keep `needsManualReview` for the printed generation symbol. The earlier pending copies of 034 and 042 stay `ready:false` in their old modules. The batch pack spreads this batch last.
- **75/114 staged shared-V2 programs; 0/114 fully battle-accepted.** No merge and no deployment.

## 2026-11-16 — twenty shared effects (95 staged)

Twenty more Japanese-checked prints compile on the shared Universal V2 engine. A printed sentence that did not match an existing opcode got a new shared op. No title-private opcode was added. Source catalog stays **114/114**. Traditional Chinese display is unchanged. **0/114** are battle, UI, or AI accepted. `officialV2Pack('rnk')` stays closed. `battleReady`, `effectImplemented`, and `cardDataVerified` stay false. This is a draft continuation of PR #510. Official Japanese pages are the rules authority: `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-NNN` and `UA41ST` for 101, 102, 105, 106, and 110.

- `RNK-1-085` 緋村 剣心: step, and the character that loses the battle moves to its energy line. Get trigger, no trigger effect.
- `RNK-1-086` 緋村 剣心: the same battle move, then look at the top 3 and add up to one 〈緋村 剣心〉. The rest goes to the bottom. Discard a hand card only when a card was added. 心太 matches through the printed alias. Active trigger.
- `RNK-1-087` 緋村 剣心: the battle move only. Trigger is `-`.
- `RNK-1-088` 緋村 剣心: Impact null, the battle move, and on play you may place one hand card outside and, if you do, active this character. Color trigger retires one opponent front character with BP 2500 or less.
- `RNK-1-090` 緋村 剣心: the battle move, raid 〈緋村 剣心〉, once per turn on attack you may place one hand card outside and, if you do, active this character, and on play draw 1. Declining still spends the once-per-turn. Raid trigger.
- `RNK-1-105` 緋村 剣心: during your turn, BP −1000, plus the battle move. Draw trigger. UA41ST.
- `RNK-1-106` 緋村 剣心: the battle move, raid 〈緋村 剣心〉, Impact (1), and on play up to one opponent front character moves to that player's energy line. UA41ST. Raid trigger.
- `RNK-1-070` 神谷 薫: on play, only while on the energy line, you may place one hand card outside and, if you do, active this character. Main: rest this card and give one other character +1000 BP this turn. No once-per-turn. Active trigger.
- `RNK-1-102` 斎藤 一: on attack, you may rest one of your active front characters and, if you do, this character gains Impact (1) this turn. Draw trigger. UA41ST.
- `RNK-1-098` 飛天御剣流: mandatory rest of one opponent front character. When your red 〈緋村 剣心〉 on the field places this card from hand to outside, draw 1. Trigger is `-`.
- `RNK-1-039` 斎藤 一: raid 〈斎藤 一〉, Impact null, cannot be blocked by BP 2000 or less, look at the top 5, add up to one 〈緋村 剣心〉, 〈斎藤 一〉, or 〈相楽 左之助〉, rest to the bottom, no hand discard. Raid trigger.
- `RNK-1-024` 巻町 操: on play, choose one. This character's generated energy is +blue this turn, or up to one other character gets +1000 BP this turn. Main: rest this card, give one other character +1000 BP this turn, and return this card to hand. No once-per-turn. Draw trigger.
- `RNK-1-043` 志々雄 真実: while this character's BP is 5000 or more, Impact (1). Front, once per turn: put the top card outside, and this character's BP this turn increases by that card's required energy × 500. Trigger is `-`.
- `RNK-1-110` 四乃森 蒼紫: raid 〈四乃森 蒼紫〉, Impact null, look at the top 3, add up to one ［特徴：御庭番衆］ or an event whose name contains 「回天剣舞」, rest to the bottom, no discard. The full window stays visible. Raid trigger. UA41ST.
- `RNK-1-029` 回天剣舞 六連: choose one of your 〈四乃森 蒼紫〉. This turn its BP is −1000 and, at the end of its attack, you may rest one active 〈四乃森 蒼紫〉 and, if you do, active the attacker. Special trigger retires one opponent front character.
- `RNK-1-013` 式尉: during your turn, while this character is active on the front, when your 〈四乃森 蒼紫〉 would leave by an opponent effect, you may retire this character instead. Draw trigger.
- `RNK-1-093` 明神 弥彦: main, pay 1 AP, once per turn, draw 1 and this character gets +1000 BP this turn. On attack, you may place one hand card outside and, if you do, active up to one of your characters that has not attacked this turn. Declining the active after paying is legal. Color trigger retires BP 2500 or less.
- `RNK-1-101` 神谷 薫: at the end of your attack phase, if no opponent character retired this turn, you may rest this active character and, if you do, draw 1. Once per name 〈神谷 薫〉 this turn. Accepting marks the name; declining does not. On play, only on the energy line, the same optional discard-then-active as 070. Draw trigger. UA41ST. The end-phase refresh actives characters again after this window.
- `RNK-1-008` 比古 清十郎: raid, damage (2), cannot be blocked by BP 2000 or less, during your turn BP +3000, on play up to one outside event to hand, and main once gives one other character +1000 BP this turn. Required energy 7 is payable with four blue generation-2 cards. Raid trigger.
- `RNK-1-019` 般若: main, once per turn, place one hand card outside and this character gets +1000 BP this turn. On retire, you may place one hand card outside and, if you do, play up to one blue 〈四乃森 蒼紫〉 with required energy 2 or less from outside, rested, onto your field. The official text has no AP filter. Trigger is `-`.
- Battle rule shared by every `battleEnergyInstead` print, including ones that omit the parenthetical: an empty energy line takes the loser, the winner's controller chooses among several empty slots, and a full line has the loser's owner choose one energy card for the remove area first. The move reason is `rule`, so on-retire effects do not fire and 101 still treats it as no retirement. Q34 is unchanged: when the blocker's BP is strictly higher, neither character leaves. Q1645: a loser that cannot move stays and is not retired, and Impact still happens because the attacker won.
- New shared ops: `recoverOutsideType`, `optionalHandOutsideThenRestDeploy`, `grantSelfColorEnergyThisTurn`, `grantNamedAttackEndReactive`, `optionalDiscardThenActive`, `frontMillScaleBp`, `optionalDiscardActiveUnattacked`, `optionalRestDrawIfNoOppRetired`, `optionalRestOwnFrontThenImpact`, `moveOppFrontEnergyVacate`, and the main `payApDrawBuff`. `nameIncludes` matches the printed name only. A grouped top window may set `discard:false`. `ownTurnBp` may be a negative multiple of 500. The own-turn substitute requires the substitute to be active on the front.
- Files: `dist/rnk/jp-evidence-shared-third.mjs`, `dist/universal-v2/rnk/programs-shared-third.mjs`, `tests/v2-rnk-shared-third.test.mjs`. Staging census is **95**. The batch pack spreads this batch last. The earlier pending copies stay `ready:false`.
- Starter `RNK-1-112` and `RNK-1-113` keep `needsManualReview` for the printed generation symbol.
- **95/114 staged shared-V2 programs; 0/114 fully battle-accepted.** No merge and no deployment.

## 2026-11-16 — the last nineteen shared effects (114 staged)

The last eighteen numbered prints and the promo `RNK-P-001` compile on the shared Universal V2 engine. A printed sentence that did not match an existing opcode got a new shared op. No title-private opcode was added. Source catalog stays **114/114**. Traditional Chinese display is unchanged. **0/114** are battle, UI, or AI accepted. `officialV2Pack('rnk')` stays closed. `battleReady`, `effectImplemented`, and `cardDataVerified` stay false. This is a draft continuation of PR #511. Official Japanese pages are the rules authority: `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-NNN`, `UA41ST` for 103 and 111, and `UAPR%2FRNK-P-001` for the promo.

- `RNK-1-010` 緋村 剣心: energy line, once per turn, put one outside 〈生きようとする意志〉 under the deck. If you do, move this character to the front and BP +1000 this turn. Color trigger returns one opponent front character with BP 3500 or less to hand. The Traditional Chinese synopsis omitted that trigger.
- `RNK-1-011` 緋村 剣心: raid 〈緋村 剣心〉. While BP is 6000 or more, 【2回アタック】. Main, once per turn, only after 〈生きようとする意志〉 was used this turn: BP +1000. On attack, if the hand has 3 or fewer cards, draw up to 1. Raid trigger.
- `RNK-1-018` 四乃森 蒼紫: raid 〈四乃森 蒼紫〉. On play, BP +1000. Main: the raid source enters active, cannot attack this turn, and retires at the end of your attack phase if it is still active. Raid trigger.
- `RNK-1-033` 流水の動き: from hand or outside, up to one 〈四乃森 蒼紫〉 with required energy 2 or less and AP 1 enters active with that same lock. If it entered from hand, draw 1. Active trigger.
- `RNK-1-038` 斎藤 一: while your field is empty, hand energy is reduced by purple ×2. On attack, you may return one front 〈緋村 剣心〉, another 〈斎藤 一〉, or 〈相楽 左之助〉 to hand and, if you do, BP +1500. Color trigger plays one purple character with required energy 2 or less and AP 1 from outside onto the front.
- `RNK-1-040` 斎藤 一: raid 〈斎藤 一〉, Impact (1). On play, only when no card on your field has a trait, both happen: BP +1000 and an energy-line attack, and that attack moves this character to the front and grants 【狙い撃ち】 this turn. The opponent's field does not count. When several front slots are empty, the move uses the first empty slot. Raid trigger.
- `RNK-1-044` 志々雄 真実: when used, you may place one hand 〈志々雄 真実〉, 〈駒形 由美〉, or ［特徴：十本刀］ character outside and, if you do, this character becomes active. On play, put the top card outside and retire up to one opponent front character with BP at most that card's required energy × 1000. Get trigger.
- `RNK-1-050` 魚沼 宇水: on attack, look at the facedown cards under this character, add up to 1 to hand, and leave the rest. On block, you may retire one other front character and, if you do, put the top card facedown under this character and BP +500 this turn. Draw trigger.
- `RNK-1-054` 沢下条 張: raid 〈沢下条 張〉. On play, only while the opponent front has an empty slot, you may reveal one hand 〈志々雄 真実〉, 〈駒形 由美〉, or ［特徴：十本刀］ and put it on top of your deck. If you do, move up to one opponent energy character whose generated energy is 1 or less to that slot. The official text is generated energy, not required energy. Get trigger.
- `RNK-1-056` 瀬田 宗次郎: when your effect moves this card from the deck to outside, you may place one hand card outside. If you do, play this card from outside onto your field, rested. Once per name 〈瀬田 宗次郎〉, marked only when the payment is accepted. Trigger is `-`.
- `RNK-1-059` 瀬田 宗次郎: the same deck-to-outside move may raid this card from outside when its required energy is met. AP is not paid and it enters active. Raid 〈瀬田 宗次郎〉. On play, if the entry was not from hand, draw up to 1 and gain Impact (1) this turn. Main, front, once per name: put the top card of this raid onto your deck. The base stays. Raid trigger.
- `RNK-1-071` 神谷 薫: while 〈緋村 剣心〉 is on your front, this character's generated energy is +red 1. Main, once per turn, only on the turn this character entered: one front 〈緋村 剣心〉 gains, until the start of your next turn, the extra hand card the opponent must place outside to choose it. Draw trigger.
- `RNK-1-076` 相楽 左之助: during your turn, BP +1000. While on the energy line, once per turn, at the end of one of your attacks you may place one hand card outside. If you do, you may swap with one front character that has not attacked this turn. The once is spent only when the hand card is placed. Trigger is `-`.
- `RNK-1-077` 相楽 左之助: raid 〈相楽 左之助〉, damage (2). When this character's attack is blocked, you may rest one other active front 〈相楽 左之助〉. If you do, BP +1000 and Impact (1) this turn, before the battle. On play, draw 1. Raid trigger.
- `RNK-1-089` 緋村 剣心: enters active. On play, draw 1 and place one hand card outside. Main, front, once per turn: put one outside 〈不殺の誓い〉 into the remove area. If you do, draw 1, and this turn every one of your 〈緋村 剣心〉, including aliases, loses 【自分のターン中】 text. Get trigger.
- `RNK-1-099` 二重の極み: requires 〈相楽 左之助〉 on your field. Choose one opponent front character with BP 5000 or less. It is retired unless you rest one active front 〈相楽 左之助〉, in which case it moves to the remove area. Special trigger retires one opponent front character.
- `RNK-1-103` 相楽 左之助: enters active. While on the front, once per turn, when an effect rests this active character, it becomes active. An attack declaration and a block do not wake it. On play, it must block this turn. Active trigger. UA41ST.
- `RNK-1-111` 比古 清十郎: cannot enter the front except by its own effect. On play, look at the top 2. Any number stay on top and the rest go outside. Main, once per turn, only while 〈緋村 剣心〉 is on your field: place two hand cards outside and move this character to the other line. Active trigger. UA41ST.
- `RNK-P-001` るろうに剣心 －明治剣客浪漫譚－: this card's color and required energy are treated as all colors. The cost is the sum of every generated color. Active up to 2 of your AP cards. Final trigger is the life-zero rule. The card stays `multicolor`; it is not assigned one color.
- New timing: `onAttackBlocked`, queued before the blocked battle resumes. New shared ops: `drawUpToIfHandAtMost`, `deployNamedLocked`, `optionalBounceUnionBuff`, `traitlessFieldAttackKit`, `optionalUnionDiscardEnterActive`, `millRetireScale`, `lookFacedownToHand`, `optionalRetireFrontTuck`, `optionalRevealUnionTopMoveGen`, `optionalHandThenRestSelf`, `optionalEnergyRaidSelf`, `nonHandEntryDrawImpact`, `optionalRestNamedThenBattle`, `retireOrRemoveFront`, plus the queued `retireLockedActive` and `energyDiscardSwap`. The promo payment uses `allColors` on the play and raid gates.
- Files: `dist/rnk/jp-evidence-shared-rest.mjs`, `dist/universal-v2/rnk/programs-shared-rest.mjs`, `tests/v2-rnk-shared-rest.test.mjs`. Staging census is **114**. The batch pack spreads this batch last and includes `RNK_PROMO_CARD`. The earlier pending copies stay `ready:false`.
- Starter `RNK-1-112` and `RNK-1-113` keep `needsManualReview` for the printed generation symbol.
- **114/114 staged shared-V2 programs; 0/114 fully battle-accepted.** No merge and no deployment.

## 2026-11-16 — checks on the last nineteen

Three staged resolutions did not match the printed sentences. The programs stay staged, and none of these cards are battle-accepted.

- `RNK-1-059`: putting the raid top onto the deck left facedown cards under that top off every zone. Those cards stay under the raid base, the same way another raid-top strip keeps them.
- `RNK-1-099`: removing a raided character threw. The visible character now goes to the remove area and its raid layers go outside, through the shared removal. A shielded character is not offered the remove mode.
- `RNK-1-050`: the deck-top tuck happened before the retired character's on-retire draw, so that draw took the next card. The tuck now waits until the retirement, including its draw, has finished. If the character stays, nothing is tucked.
- `RNK-1-071`: the extra hand card is charged when the opponent chooses that character with an effect, including the new retire-or-remove, mill-scale, and generated-energy move choices. An empty hand cannot make that choice. The owner's own effect does not pay it.
- Still approximate: `RNK-1-044` becomes active after it has already entered rested, and `RNK-1-040` / `RNK-1-054` / `RNK-1-056` still use the first empty slot when several are open. **0/114** battle-accepted. No merge and no deployment.
