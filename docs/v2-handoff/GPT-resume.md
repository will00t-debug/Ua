# ChatGPT / Codex resumed integration — 2026-10-21

User instruction: resume development with GPT. This supersedes the old
Cursor-only freeze for this new branch, not the protections on main/production.

Branch: `codex/v2-resume-20261021`; base PR #70 at
`3a760228de5da29590d09021a29a7f7a425e70a6`.

## Imported provenance

- B / PR #73 `ee5f99d6d39ae624f0a1018f1a1414080f685aed`: BLC-4-023.
- C / PR #72 `c77816b78d849f4320fe4f120f052ba29d896c01`: TTG-1-077.
- D / PR #74 `f53a22841967e3872abb093a9c6a0869ff8055e3`:
  SAO-1-003, 032, 052, 063, 073, 075, 089, 098, 107;
  SAO-2-017, 030, 048, 057, 072; MST-1-010.
- E / PR #71 `c3b7dd658b83c964698062bfbd2ff15c89775667`:
  seven independent scenarios, now in `tests/v2-resumed-independent-acceptance.test.mjs`.
  Retargeted exact roster and replaced the obsolete rejection of newly integrated
  BLC-4-023 / TTG-1-077 with positive checks plus still-unported negative controls.

Selectively imported title implementations and tests, preserving A's shared
core fixes and additional regression cases. No whole-branch overwrite or old
engine fallback. Exact independent card manifest extended by those 17 IDs.
C CSV provenance distinguishes historical PR70 integration from this branch.
Other old handoff inventories remain historical snapshots.

## Current registry, not full FAQ certification

| Title | Integrated | Unported | Catalogue |
|---|---:|---:|---:|
| BLEACH | 80 | 196 | 276 |
| TTG | 26 | 55 | 81 |
| SLG | 22 | 58 | 80 |
| SAO | 53 | 130 | 183 |
| MST | 24 | 56 | 80 |
| Total | 205 | 495 | 700 |

These are source-pinned registered effects with scenario tests, not a claim that
every official FAQ interaction is certified. No mobile manual QA or deployment
was performed in this integration batch.

## Verification

- Original A baseline: 1143/1143 tests passed locally under Node 24.19.0.
- Integrated 17-card code: 1158/1158 passed under Node 22.23.3;
  60/60 seeded cross-title matches completed, zero failures.
- With E acceptance scenarios: 1165/1165 passed under Node 22.23.3,
  local code commit `143c936` (before documentation / workflow additions).
- Commands: `npm test`, `node scripts/v2-integrated-match-matrix.mjs`.
- `.github/workflows/v2-resume.yml` reruns full tests and the matrix on the
  published branch; consult its actual result for the remote commit rather
  than treating local runs as completed GitHub Actions.

## Next work

1. Keep this as the unified integration branch; no need to revive five writers.
2. Generate the current missing-ID list with `node scripts/v2-unported-report.mjs`.
3. Add shared capabilities for remaining cards in verified batches: self-REST
   costs (BLC-1-005), filtered top-N search with ordered remainder and conditional
   discard (TTG-1-010/023). SLG-1-036 draw-three/discard-two is Batch 1 below.
4. Read official Japanese text / FAQs and add real cost, target, optional/mandatory,
   trigger, UID conservation and hidden-information cases for each capability.
5. Preserve main and production; current work is a reviewable candidate only.

## Batch 1 — 2026-10-21 — SLG-1-036
- Japanese official card: UA51BT/SLG-1-036. Mandatory draw three, then place two cards from own hand outside. Its ACTIVE life trigger is independently handled.
- Shared `drawDiscardMany` template and sequential UID-based mandatory discards; retains legacy `drawDiscardOne` behavior within V2.
- Manually updated independent literal ID manifest (not registry-derived). 199/700 integrated, 501 unported; not full FAQ certified.
- New dedicated `tests/v2-slg-036-draw-discard.test.mjs` covers costs, ordered choices, forced count, invalid choices, private hand and UID conservation.
- Remote CI must be checked for this batch commit: historical 1165/1165 and 60/60 are previous commit counts.
- Local clone DNS blocked (`Could not resolve host: github.com`); no mobile QA or card-specific FAQ audit yet.
- Next: BLC-1-005 self-REST costs, TTG-1-010/023 top-N filter and order.

### Batch 1 CI corrections
- Follow-up independent SLG proof gate: `8d5ca3455ce32742e96c7903cd85c3c57fed69e0`.
- Initial GitHub Actions for this commit: 1169 tests, 1162 passed, 7 failed, matrix therefore skipped. Follow-up addresses exact manifest expectations, SLG CSV provenance, and two defective test fixtures without dropping checks.
- New CI execution result is required before claiming pass. Historical `npm test` success is not evidence for this batch.

### Batch 1 verified integration milestone — 2026-10-21

- Source/acceptance commits: `dc533bec170a132d6ae196096ee7a35244afc828` (implemented shared operation and SLG-1-036), `8d5ca3455ce32742e96c7903cd85c3c57fed69e0` (source proof whitelist), `b2e79853b65d23ead3aea9d54de9b89be7278ae5` (strict roster/CSV/negative-case and UID-safe test corrections), `29bb5733233fd863cd1ba6e25b3bed649f9a10b7` (independent matrix pins 199 IDs).
- GitHub Actions **success**, `V2 Resumed Integration` run 39533569793: Node 22 `npm test` **1169/1169 passed, 0 failed**; `node scripts/v2-integrated-match-matrix.mjs` **60/60 five-title seeded matches, 0 failures**; `node scripts/v2-unported-report.mjs` **success**.
- Independent source inventory: BLEACH 79/276, TTG 24/81, SLG 19/80, SAO 53/183, MST 24/80. **V2 integrated 199/700, unported 501**. Catalogued 700; standalone source metadata readiness and full-FAQ acceptance remain separate. Full official FAQ certification still **0** until independent per-card rulings verification.
- SLG official catalogue metadata incomplete for 12 other records per report. No speculative ports. No changes to main or production, no local clone, no manual mobile QA.
- Next recommended batch: shared own-character REST payment / target gating for BLC-1-005, or filtered top-N and ordered remainder for TTG-1-010/023, against Japanese official card text and FAQ.

## Batch 2 — BLC-1-005 (2026-10-21)

- Official printed source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-005. 2 yellow energy, one AP to PLAY character, 3000 BP, yellow generation 1, Sternritter trait, NO life trigger. Main-phase/front-only ability: REST this READY character as activation cost, then choose one opposing front-line character and REST it. No printed per-turn restriction or extra AP activation cost.
- Shared V2 operation: `mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:true}`, strict pack verifier plus common `activate` legality and mandatory existing opponent REST target queue. The source cost is paid BEFORE target choice, and no null/skip allowed. Existing Raid-based main action is unaffected. V2 AI/preview labels recognize this action.
- Source fingerprint `dist/expansion-cards.mjs` / checked BLEACH addon, independent formal title contribution and explicit manifest; negative tests for illegal source, target, cost/actor and foreign UID; tests `tests/v2-blc-005-self-rest.test.mjs`.
- Catalogued 700, V2 implemented/integrated 200 (BLEACH 80, TTG 24, SLG 19, SAO 53, MST 24), unported 500. FAQ full-audit certification remains 0. Printed page has no card-specific Q&A entry; general activation REST rules apply, but further interaction FAQ reviews remain open.
- CI result/commit SHA: see subsequent verification milestone in this file; do not treat former green run as a new batch result.

### Batch 2 validated milestone — BLC-1-005

- GitHub branch commits: `2c9ba0053f1f4fef5cc12d6f80bdb925eee70e9a` (shared self-REST implementation and new exact test); `2c883978dea00bc116f23433087883e47f04c647` (retain strict BLEACH inventory tests with 80 source-pinned identities).
- CI `V2 Resumed Integration` run 39535129609 succeeded under Node 22: `npm test` **1176/1176 passed**; integrated five-title seeded matrix **60/60 completed**; `v2-unported-report` succeeded, **200 registered / 500 unported**.
- These pass counts certify tested code paths, not a full per-card official FAQ acceptance. Main / production untouched.

## Batch 3 — TTG-1-010 / TTG-1-023 (2026-10-21)

- Japanese official: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-010 (green1/AP1, DRAW Life, private top three, 大グレン団); https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-023 (green2/AP1, no Life trigger, private top five, ガンメン). Each reveals up to ONE matching printed-trait card into hand, orders all remaining inspected cards to the bottom of deck WITHOUT shuffling, and ONLY IF a card was added must discard exactly one OWN hand UID AFTER ordering.
- Added strictly typed shared `searchTopOneBottomDiscard` template, controller-only `effect-top-filter-choice` and existing `effect-top-order` / `effect-discard` transitions, opponent-hidden private inspected UIDs and lossless card movement. Compound printed trait `大グレン団／ガンメン` matches its constituent printed trait without mutating other source records.
- Explicitly re-audited, registered and source-fingerprinted only 010 and 023. Independent ID manifest extended by two manually, not generated from tested registry. See `tests/v2-ttg-top-filtered.test.mjs` for success, decline, no valid top match, invalid/foreign UID, independent bottom order, contingent discard, AP and UID conservation.
- Catalogued 700, V2 implemented/integrated 202 (BLEACH 80, TTG 26, SLG 19, SAO 53, MST 24), unported 498. **Full FAQ per-card certification remains 0** pending independent ruling coverage.
- CI of THIS batch is to be independently verified before claim of success.

### Batch 3 independently verified milestone — TTG-1-010 / TTG-1-023

- Code commit: `4537c9522e1f8a4fa07423d07cb0b3dcbc5d120c`. Exact two source-pinned card IDs, generic TOP-N inspected UID filter / bottom ordering / conditional mandatory hand discard, independent per-card scenarios; no legacy reducer calls.
- GitHub Actions `V2 Resumed Integration` run **39536242174**: Node.js 22 `npm test` **1182/1182 passed, 0 failed**, `node scripts/v2-integrated-match-matrix.mjs` **60/60 seeded five-title completed, 0 failures**, and `node scripts/v2-unported-report.mjs` **success**. Separate SAO/MST regression run 39536244786 reviewed above.
- Source-driven inventory: **BLEACH 80/276 (196 unported); TTG 26/81 (55 unported); SLG 19/80 (61 unported); SAO 53/183 (130 unported); MST 24/80 (56 unported). Total 202/700 integrated, 498 unported.** Full independent official FAQ acceptance **0**, not conflated with registration or scenario execution.
- No changes to main, no merge/deployment/force push; this workflow has GitHub object and Actions access but the local repository clone was not available. PR #75 remains draft.
- Next candidates: `SLG-1-037` printed-BP-limited optional own-outside character recovery followed by unconditional draw (verify official FAQ Q2039 on "original BP" first), and/or other multi-card reusable shared primitives. Do not expand unreviewed scope as implicit certified support.

## Batch 4 — SLG-1-037 printed original-BP recovery (2026-10-21)

- Official `UA51BT/SLG-1-037` 命の神水: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-037. Purple 4, AP 1 event, DRAW life trigger; body optionally recovers at most one CHARACTER card in controller's own OUTSIDE whose **printed original BP <=4000**, THEN independently draws one card even when recovery skipped/unavailable.
- **Official card-specific FAQ Q2039**, updated 2026-04-17, defines original BP exactly as the value printed at bottom-left of the character card. Do not compare temporary combat BP, card color/energy, an event BP, or an opponent's outside area.
- New reusable `recoverOutsidePrintedBp` ability DSL/profile (strict exact keys `bp`/boolean `optional`); uses shared `effect-recover-outside` UID decision and independent following `draw` queue. No old solo reducer/fake auto flag. Separate V2 DRAW life handler remains unchanged.
- Independent acceptance IDs and CSV provenance updated explicitly; tests `tests/v2-slg-037-original-bp.test.mjs` cover printed source, optional recovery/skip/no targets, unconditional one draw in order, legal physical own-outside UID and invalid enemy/event/printed BP >4000, opposing hand privacy, paid AP/energy, UID conservation, and strict template negatives.
- Roster: BLEACH 80, TTG 26, SLG 20, SAO 53, MST 24, **203/700 integrated** and **497 unported**. Full per-card FAQ certification remains **0**, notwithstanding one confirmed relevant FAQ ruling. Await this batch's own full CI and 60-match verification.

### Batch 4 verified integration milestone — SLG-1-037

- Source implementation commit `5c3dcf37a2c832c83b291e89203235395d399406`; source-pinned independent evidence/cross-title suite correction commit `edadc01336175fa8bbe8972e44973c53b827a639`. Corrections retained all tests and strict independent provenance; they did not bypass negative validations.
- GitHub Actions `V2 Resumed Integration` run **39537305232** (Node.js 22) **success**: `npm test` **1188/1188 passed**, no failures; `node scripts/v2-integrated-match-matrix.mjs` **60/60 seeded five-title games finished**, no failures; `node scripts/v2-unported-report.mjs` **success**. Other series isolated run `39537307341` checked separately.
- V2 source-driven integrated roster: **203/700**, unported **497**. Breakdown **BLEACH 80/276, TTG 26/81, SLG 20/80, SAO 53/183, MST 24/80**. Explicitly no full per-card FAQ certification yet (0; Q2039 addressed for one particular printed-BP behavior only), no local mobile manual QA, no main merge or production deployment.
- Next priorities: group by *shared* missing primitives in `node scripts/v2-unported-report.mjs`; continue source-verified small batches with independent manifests and tested timing/UID/hidden-information details.

## Batch 5 — SLG-1-018, shared compound TOP-N ANY selector (2026-10-21)

- Official Japanese `UA51BT/SLG-1-018`: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-018. OnPlay inspect exactly own TOP3; choose 0..1 card by name `水篠 旬` **OR** printed trait `影の軍団`; publicly reveal/add it, bottom-order every remaining inspected card; only if added a card force exactly one own hand discard AFTER ordering. Its COLOR life independently deploys own OUTSIDE purple energy<=2/AP1 CHARACTER to ACTIVE FRONT without spending AP; target entering front triggers onPlay if printed.
- Source provenance: imported Traditional Chinese trait label `影之軍團` is the same printed Japanese `影の軍団`; V2 filter uses the exact source tag and does not rewrite source data or infer unknown traits.
- Shared engine `searchTopOneBottomDiscard` now handles either a strict single predicate or a source-authored 2–3 predicate ALL/ANY profile via template `searchTopOneBottomDiscardWhere`. Both use only exact inspected top physical UIDs, independent controller-only choices, original unchanged rest deck, ordered bottom, conditional mandatory discard and no shuffle.
- Strict pack verification rejects missing/duplicate filters, unsupported operators, extra/shuffle fields, illegal counts and unsupported card effects. Explicit manual ID manifest, independent printed proof and new `tests/v2-slg-018-compound-top.test.mjs` cover paid AP, alternatives (name vs trait), skip/empty top window, bottom ordering, forgery, wrong actor, concealed UIDs, separate COLOR life, AP/UID conservation, and fail-closed bad templates.
- Proposed batch roster: BLEACH 80, TTG 26, SLG 21, SAO 53, MST 24; **204/700 integrated candidates**, 496 unported. Full per-card Japanese FAQ certification still 0. Confirm batch CI before crediting test success.

### Batch 5 verified milestone — SLG-1-018

- Code commit `d1211067460991dbc125497730bdbc997e741efc`, exact independent test-roster fix `d3400e86a69382fc72ed77faf7c7d60606566891`.
- GitHub Actions `V2 Resumed Integration` run **39539223613** successfully completed Node.js 22 `npm test` **1194/1194 passing**; integrated match matrix **60/60 matches with zero failures**; `scripts/v2-unported-report.mjs` **success** reporting **204/700 V2 integrated, 496 unported**. Initial CI on the prior SHA had one stale independent TTG roster assertion (20 vs 21); fixed without deleting or loosening negative validations.
- The initial isolated SAO/MST core regression on `d121...` failed for that same outdated roster and was superseded by complete Node regression on `d340...`. Manual visual reveal/UX of added TOP-N cards remains a separate acceptance item.
- Full per-card official FAQ certification remains zero; printed Japanese card body and relevant generic color handler are source verified, but no all-FAQ certification is claimed.

## Batch 6 — SLG-1-012 own-field named ally draws one (2026-10-21)

- Official Japanese source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-012; `後藤 清臣`, purple3, AP1, BP2500, produces purple2, no life trigger. OnPlay: draw **one** only if controller's own field includes `水篠 旬`.
- Added reusable strict V2 template/DSL `drawIfOwnName` to evaluate actual own FRONT and ENERGY physical characters after source enters field. Does not count opponent field, hand, outside, facedown under-cards, or arbitrary same-name print not yet on field. No additional AP cost; retains ordinary printed play cost.
- Independent source-pinned ID manifest, strict SLG contribution proof, audit ledger and `tests/v2-slg-012-own-name.test.mjs` cover exact printed values, name present in either own field line, opponent-only/hand/outside negatives, insufficient AP/energy, strict extra fields/counts rejection, proper one-card UID transition and no concealed-hand leak.
- Proposed coverage becomes BLEACH 80, TTG 26, SLG 22, SAO 53, MST 24; **205/700 V2 candidates, 495 unported**; NOT full per-card FAQ certification. Validate fresh batch CI before claiming pass.

### Batch 6 independently verified milestone — SLG-1-012

- Code batch commit `31da4acf8a3ff62c0fcd48fe9876a2ffe1a9ce96`; strict independent SLG count correction `9e0d7f8cbd5bf471188eadd00668ea7de2561522`. The first CI run had only an outdated exact-source SLG cardinality assertion (21 vs 22); the fix retained every existing positive and negative test.
- GitHub Actions `V2 Resumed Integration` run **39539858076** on Node.js 22 completed successfully: `npm test` **1200/1200 passed, 0 failed**, `scripts/v2-integrated-match-matrix.mjs` **60/60 seeded five-title matches finished without failure**, `scripts/v2-unported-report.mjs` **success**.
- Source-driven inventory: **205/700 V2 integrated** (BLEACH 80/276, TTG 26/81, SLG 22/80, SAO 53/183, MST 24/80), **495 unported**. Independent all-official-FAQ certification remains **0**; tests are targeted implementation/scenario verification, not exhaustive certification. Manual preview UX and reveal-event display are still outstanding.
- Branch/PR unchanged apart from commits on `codex/v2-resume-20261021` / PR #75; no main changes, deployments, or force push. Continue by grouping remaining printed profiles by common mechanic; potential next group: own-turn energy threshold passive BP bonus (e.g. TTG-1-006), source/FAQ gated and tested before registering.

## PR #75 reconciled integration of TTG-1-053 — 2026-10-21

- Kept PR #75's two other 2026-10-21 completed additions, `SLG-1-018` (composite TOP-N private filtered choice) and `SLG-1-012` (own-field name conditional draw), with their current shared-engine operations and individual tests intact.
- Integrated isolated `TTG-1-053` implementation, its strict source-REST MAIN action with one physical OWN top-deck card sent to outside, and owner-only reveal data for existing `TTG-1-001`. Candidate commit `2d2fa2aa4c51a2e04d69d645cece0fbd4b1085f8` originated from PR #75 code head `9e0d7f8cbd5bf471188eadd00668ea7de2561522` and has been reconciled with documentation-only head `c5518b38b1ab7341d8d07a069ca24ea00669dbe0`.
- **Complete combined CI succeeded**, GitHub Actions https://github.com/will00t-debug/Ua/actions/runs/39540271562: Node.js 22 `npm test` **1207/1207 pass**, `node scripts/v2-integrated-match-matrix.mjs` **60/60 complete, 0 failures**, `node scripts/v2-unported-report.mjs` **success**.
- Manually source-pinned independent ID roster and titles: BLEACH 80/276, TTG **27/81**, SLG **22/80**, SAO 53/183, MST 24/80. V2 integrated/tested **206/700**, currently unported **494**. **0/700 full independent per-card official FAQ certified**: passing tests are not per-FAQ full audit.
- Both source branches retained; merge is into PR #75 development branch only, **not main**, no production deployment and no force push. The temporary integration-only workflow file is not carried into the PR development branch.

## Batch 7 — shared conditional DISTINCT TRAIT energy predicate, no new official card (2026-10-21)

- Started from PR #75 verified merge HEAD `7d927c3b263380115e3739471d583df6a10d7273`, success CI 39540532098 (1207/1207 unit and 60/60 seeded games). No local Git checkout is available in this execution environment; verified no local repository worktree to overwrite. Use GitHub object APIs and branch-safe compare-and-swap updates.
- Reviewed actual title catalogues: BLEACH official-imported 269 + previous pilots, TTG 81, SLG 80, SAO 183, MST 80, plus 5-title unported report. No registered or unported card in these five source sets has a **verified printed requirement of N different trait KINDS giving this card +X energy**. Notably `BLC-2-062` counts THREE OTHER same-trait cards (copies), NOT three distinct traits and stays unported. Do not claim that the existing unofficially authored examples in other titles are part of the 700-card registry.
- Also checked official Japanese FAQ Q254 (2023-04-25) on UA04BT/IMS-1-021: traitless is NOT a kind. Q258 on UA04BT/IMS-1-025 excludes own card only when printed `他のキャラ` (other characters). Closest external title energy samples `UA31BT/MMM-1-077` and `PC02BT/NIK-2-035` instead count different **card names** of cards with a fixed trait, NOT different traits, and must NOT be registered through a trait-kind predicate.
- Implement a strict condition+bonus separation in `dist/universal-v2/field-conditions.mjs` and `conditionalTraitEnergy` card profile with explicit `zone:field/front/energy`, `subject:character/card`, `minimumDistinctTraits:N`, `extraEnergy:X`, `excludeSelf:boolean`, `requiresActive:boolean`. Exact source-verified trait tokens are deduplicated with Set; source-verified per-title normalized multi-traits count as separate traits; unknown slash composite is one indivisible token. Hand/outside/opponent/Raid layers excluded.
- Every query derives effective production, never edits printed `gen`, and never grants front production. Includes existing ACTIVE bonus. Expose `baseProduces` and current `produces` in universal public UI energy line, reconcile color/total and legal pre-play/AP requirements. AI move safety compares removal of currently effective own energy contribution. Programmed main-action per-turn REST costs are NOT expanded in this batch.
- `tests/v2-conditional-trait-energy.test.mjs`: synthetic packs/fixtures only, no fake official source registration. Positive, negative, opponent, duplicate, composite, self, zone, ACTIVE, state transitions, color, forbidden forged play and UID; all existing 206 official-registered V2 IDs remain unchanged; 494 unported, 0 fully FAQ-certified.
- Batch CI run/commit SHA to be appended only AFTER actual GitHub Actions proof. No main merge or production deployment.

### Batch 7 independent verified CI milestone — conditional DISTINCT TRAIT energy

- First code commit `c9435870ef622ba151055bfa57102dc941a7890c`; full test fixture physical-UID conservation correction `971c15d24a1a539a98e9ff4e935f1e5dad9e99e4`. The initial CI surfaced one invalid TEST fixture card lost after an energy-line mutation; it was fixed by relocating actual physical card UIDs to outside, without skipping test or weakening the engine. No gameplay regression was observed.
- **GitHub Actions SUCCESS:** https://github.com/will00t-debug/Ua/actions/runs/39541800765 on Node.js 22: `npm test` **1214/1214 passed**, **0 failed**; `node scripts/v2-integrated-match-matrix.mjs` **60/60 five-title seeded matches completed**, zero failures; `node scripts/v2-unported-report.mjs` success. Separate SAO/MST isolated QA run 39541805643 also verifies title-specific regression.
- **Source-driven 206/700 V2 integrated and 494/700 unported.** No fabricated `different trait kinds => energy` real-card registration. Full per-card official FAQ acceptance remains **0**.
- Passive condition is checked only for printed/source-audited tokens; source-verified composite traits declared as separate tokens in a registered adapter are eligible independently, raw slash or translated labels are not guessed. The generic `conditionalTraitEnergy` specification includes the independent base/bonus display and source-energy-line-only production.
- Remaining UI caveat: automatic console/preview state has snapshot/projection assertions, but no claim of manual phone touchscreen visual QA or production deployment. Future verified official matching card may reuse this passive without touching `gen`; don't confuse different character/card NAMES (`MMM-1-077` etc.) with different TRAIT kinds, and don't confuse BLC-2-062's three character COPIES with three distinct traits.

## Batch 8a — shared live conditions for persistent BP / energy (2026-10-21)

- Current PR #75 base: `7be2caf47b413319630192598d123f2f5bd0cab5`, both V2 CI suites successful on HEAD, 206/700 previously V2-registered. No local worktree was supplied in this session; GitHub object updates are performed with a HEAD lease.
- Added strict reusable `passiveBonuses` with `condition` separate from `bp` or `extraEnergy`, sourced from a CURRENT state query, not snapshotted once. Conditions: own/opponent/any turn; own OUTSIDE >= N; own FRONT/ENERGY/field has named CHARACTER; count exact printed matched-trait CHARACTER instances (NOT distinct trait kinds), with explicitly specified own zones and excludeSelf; own total generated energy >= N. Character energy bonuses depending on energy total are rejected at PACK VALIDATION to prevent cycles, while BP may query energy.
- Source-verified first official cards from UA51BT: **SLG-1-001** (朝比奈 りん, purple1/AP1/BP2500/gen1, no life trigger, own-turn own OUTSIDE >=5 => persistent self BP+500), **SLG-1-010** (向坂 雫, purple3/AP1/BP3000/gen1, DRAW life, own-turn own OUTSIDE >=10 => persistent self BP+1000); official URLs https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-001 and https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-010. Checked official UA51BT series FAQ listing; no specific erratum changing either printed continuous bonus was found there. This is **not** full official FAQ certification.
- Did NOT port multi-effect SLG-1-003: it also has a recover-to-hand trigger, attack TOP action and active life; it remains unported until all effects are represented.
- Live passives never mutate printed gen/BP, trigger timing, turn-duration buffers, or old `ownTurnBp` and `activeExtraEnergy` profiles. Legality compares pre-play energy. Synthetic source-free condition variants (zone/name/trait count/energy) tested strictly; official effects tested through actual `registeredV2TitlePack('solo-leveling')` and physical matches. Official PASSIVE BP is independent of being in FRONT versus ENERGY unless card source explicitly narrows its own scope.
- Exact five-title roster after addition: BLEACH 80, TTG 27, SLG **24**, SAO 53, MST 24 = **208/700** V2 candidates, **492 unported**, **0 fully individually Japanese FAQ certified**. Manual exact-ID fixture and audited SLG CSV updated. Multi-mode choice (batch 8b) and exit/deferred triggers (batch 8c) remain unmodified until 8a green CI.
- Commit, CI, and any corrections MUST be logged as actual evidence after CI, never presumed.

## Batch 8b — shared strict choice-of-one effect queue; SLG-1-002 (2026-10-21)

- Started from PR #75 HEAD `d9a3f44e1b1a0a4ab5cee255c252c4575b4cdb5c` (208/700 integrated, both latest V2 CI suites passing). No local Git checkout at `/`; remote updates use strict expected SHA to avoid branch conflict. PR #75 remains a DRAFT and targets V2 foundation, not main.
- New V2 effect DSL operation `chooseOne` for EXACTLY TWO PRINTED modes. Each mode contains stable `id`, human label, availability by turn (`any`/`own`/`opponent`), and an ordered 1–3 instruction body composed ONLY of already-supported `draw`, `drawDiscard`, `buffOwnField`, `recoverOutsideOne`, `buffSelf`. Every nested primitive is checked with existing strict validators and new nested unknown-key checks; duplicate/missing mode IDs and unknown operations fail closed. No printed option numbers guessed from translation. Multiselect and conditional mode-count extension remain unsupported.
- Legal modes are filtered by printed WHEN conditions and by mandatory target existence; `optional:true` target instructions are still legal with zero targets. Optional mode skipping exists ONLY when `chooseOne.optional===true`; a mandatory `chooseOne` has no skip. The option-selection pending step never runs an unselected branch; chosen steps are prepended in original order, preserving sourceUid/name, owner and subsequent pending queue. Built-in `play` AP is already paid on ordinary play and is NOT returned by a branch skip. Unknown mode, wrong actor, forged extra UID and replay are rejected by existing exact legal action matching before mutation.
- Real Japanese card source **UA51BT/SLG-1-002**: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-002 . Official print: 朝比奈 りん, purple 0/AP1/BP500, produces purple1, DRAW life. OnPlay MANDATORY choice: (a) draw1, then mandatory own-hand discard1, or (b) **if own turn** select **up to one OTHER** own field character (FRONT or ENERGY) and give this turn BP+1000. Both paths implemented with existing shared V2 primitives; DRAW life remains independently registered. Verified body against original SLG catalogue and Japanese official card detail. No dedicated card-specific official FAQ was evidenced for these print lines; **full per-card FAQ review is NOT claimed**.
- Candidate **SLG-1-025** official URL https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-025 , prints purple3/AP2/BP2000/gen2, onPlay draw2 OR draw1 then optionally recover ONE traitless printed ENERGY<=3 own-outside character, plus independent ACTIVE life **ready one own field character AND BP+3000 that turn**. Shared V2 ACTIVE life currently lacks its BP+3000 half; 025 intentionally remains UNPORTED, rather than register incomplete life text. Qualified outside-recovery also needs a separately source-verified print-energy/traitless filter.
- New `effect-choice-mode` pending kind; presentation labels use option metadata from same authoritative legal choice; public model exports pending kind/controller only and never shares private hand, deck, inspected UIDs, or mode metadata. Universal AI selects from `legalUniversalActions` without any hard-coded title card ID. Existing dedicated Kamina main options and non-branch effects are unchanged.
- Added real-registry acceptance tests in `tests/v2-choice-mode-slg002.test.mjs` plus synthetic optional/missing-target modes, integrity/replay and strict branch-negative cases. Independent exact ID manifest, SLG proof, audit CSV, total-count tests, match-matrix pinned roster updated.
- Proposed V2 exact card totals: BLEACH 80, TTG 27, SLG **25**, SAO 53, MST 24; **209/700**, **491 remaining**, **0 full per-card FAQ-certified**. Code commit and CI results must be separately verified; don't claim success before Actions passes. No main merge, no production deployment.

### Batch 8b independent green milestone — shared choice-of-one

- Complete feature/test/registered-card candidate commit: `d217521884f36e876a39ba7e70bdd5f5722a55a6` (19 explicit file updates), then exact registry manifest correction `7a8c41f96e6709d8992729e8bc5fedb86d867c04`. No unrelated effects removed or tests disabled.
- First combined CI 39545216111 identified ONE stale older `tests/universal-v2-ttg-port.test.mjs` assertion expecting SLG 24 despite the new source-verified SLG-002 resulting in SLG 25; **1228/1229 passed**. That strict independent assertion now requires **25**. This was not an engine failure.
- **Verified CI PASS:** https://github.com/will00t-debug/Ua/actions/runs/39545357595 , Node.js 22 `npm test` **1229/1229 pass (0 fail)**; `scripts/v2-integrated-match-matrix.mjs` **60/60 seeded matches success**; `scripts/v2-unported-report.mjs` success with **209/700** V2 source-registered, **491** unported, **0** full official FAQ certified. Independent SAO/MST QA jobs on run https://github.com/will00t-debug/Ua/actions/runs/39545361924 both completed SUCCESS.
- Nine new test cases cover exact SLG-002 official print/trigger, both real-registry branches, mode stability and order, mandatory vs optional, zero optional targets, AP paid once, strict branch schemas/unknown fields, legal actor/replay/forged UID, UI mode-label projection, private opponent views, pure reducer/UID conservation and AI legal action completion. UI verification is automated label/model-state assertions only; **NO manual phone/browser preview QA** and **NO production deployment**.
- Last successful code HEAD before this documentation commit: `7a8c41f96e6709d8992729e8bc5fedb86d867c04`. This batch ends with common chooseOne; next independent batch will address narrowly-scoped actual retire triggers and delayed effects.

## Batch 8c — native V2 retirement & MAIN-end deferred retirement (2026-10-21)

- Started from last fully green PR #75 `a5fd314e3092b6a9044b4bfcf3956f9ea85c3efe` (V2 1229 tests; five-title 60 games; 209/700 verified candidate registrations). No local Git checkout in this tool environment; direct GitHub object API branch updates require CAS expected HEAD; no main merges or Vercel deployments.
- Reviewed Japanese official printed source for `UA51BT/SLG-1-007`: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-007, エシル, purple0, AP1, BP500, gen purple1, **on-retirement draw one**, independent DRAW Life. First new V2 shared timing `onRetire` is initially STRICTLY limited to previously audited `draw` or `millTop`. On true retirement, snapshot the physical top card's UID, owner, printed cardId, source line, ready and pre-exit BP, then queue printed onRetire jobs *without leaving the top on the field*. No automatic onRetire for bounce to hand, removed-area displacement, prevented/protected retirements or stripping upper Raid cards. Japan official Q1417/English FAQ Q695 explicitly say stripping Raid top is NOT retirement. Japan official Q60–Q62 specifies Raid base side effects; preserve current reducer handling.
- Reviewed Japanese official `UA51BT/SLG-1-013`: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-013, 水篠 葵, purple0, AP1, BP1000, printed gen purple1, no Life. MAIN activated ability: ENERGY-L source pays its own REST cost **once per turn**, gains +1 purple generated energy through the current turn, and acquires an END OF MAIN self-retirement. Implemented narrow strict `mainAbility.op=restSelfGainEnergyRetireEndMain` in native V2 (not legacy). The current energy display/color/total uses existing live `universalCardEnergy` through turn-scoped buff, printed `gen` immutable.
- Deferred jobs store `owner,sourceUid,fieldEntryStamp,turn`; consume due jobs exactly once when the active player's MAIN phase closes, settle them before any legal attack. EXIT clears the field instance stamp; Raid layering hides the source; a new same-UID field incarnation does not receive the old delayed exit. The legacy `oncePerTurn` or per-name dedicated Kamina option implementation is unaffected.
- On TRUE retirement, effect jobs append behind any already-snapshotted simultaneous batch victim retirements, preserving their physical moves and deterministic source order before sequential triggered draw jobs; replacement decision delays actual retirement until the owner chooses leave. Removal of a full line occupant is the removed area and never treated as retirement. Unknown onRetire operations, invalid main ability profiles and fabricated source registrations continue to fail closed.
- `tests/v2-retire-delayed-slg.test.mjs` covers real registry → match → battle onRetire DRAW with the owned physical card, true bounce/removed negatives, ENERGY REST activation, repeated activation rejected, exact phase-end one-shot, UID incarnation re-entry, UI/AI action labels, strict schema and all physical UID conservation.
- Source-audited five-title counts expected BLEACH 80, TTG 27, SLG **27**, SAO 53, MST 24: **211/700** candidate V2 cards, **489 not ported**, **0 full per-card FAQ certifications**. No claim of exhaustive simultaneous replacement chains / all delayed phases / full official FAQ review. Other original cards `SLG-1-064` and MST multi-effect resurrection remain unported in this restricted batch.
- Commit SHA / complete npm test / 60-game matrix / source report / CI status must be recorded after actual successful run. No production deployment.

### Batch 8c — independently green integration checkpoint

- Code and source/ID/audit integration commit `ec71c87d5fa106029e981e2c5f2b0f38fea39b33`; strict independent SLG counts corrected in `52d856e25aa4989df4163e2461fac8bca05e9d7b` (expected 27/80, 53 unported; nothing from other titles removed); simultaneous batch retire / facedown leave-protection negative tests added in `c86eb71d1e5ccc1948dc2e9fd29feca00600d123`.
- First CI run 39547817935 had **1235/1237 tests passing**, with TWO stale expected-count assertions only (SLG 25 vs 27 and blocked 55 vs 53). Both changed to exact independently checked expected counts; gameplay and physical UID checks were not disabled.
- Subsequent GitHub Actions https://github.com/will00t-debug/Ua/actions/runs/39548007725: **1237/1237 tests green, 60/60 five-title matches, successful unported report**. Independent SAO/MST jobs https://github.com/will00t-debug/Ua/actions/runs/39548013078 both green.
- Full acceptance including 2 added edge tests: https://github.com/will00t-debug/Ua/actions/runs/39548357202 **1239/1239 npm tests pass, 0 fails**; **60/60 seeded five-title cross-title matches** (zero fails); `node scripts/v2-unported-report.mjs` succeeds with **211/700 registered, 489 unported, 0 independently complete FAQ certified**. Both isolated regressions on https://github.com/will00t-debug/Ua/actions/runs/39548361218 PASS.
- New synthetic negative cases run the actual V2 reducer/UID conservation: two physical characters retire simultaneously in stable front-slot order (draw then mill, not lost/duplicated); a protected face-down bottom layer sacrificed as retirement replacement correctly DOES NOT fire the original top's onRetire, while deliberately choosing TRUE leave does.
- Automation and real UI: V2 public energy values, legal action/AI choice, and UI action label have automated scenario tests only; **no manual Android/mobile visual preview QA**. The live official website and main branch were never touched. Supported onRetire effect bodies intentionally limited to shared draw/mill, and end-MAIN delayed retirement intentionally limited to explicit small energy-REST profile. Do NOT infer support for all resurrection/re-Raid/competing retirement chains.

## Batch 9 — source-audited SLG-1-025 chooseOne + traitless printed-energy outside recovery (2026-10-21)

- Japanese official card https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-025 : 観月 絵里, purple 3, printed AP 2, BP 2000, gen 2; **mandatory** onPlay choose EXACTLY ONE of draw 2 OR draw 1 then optionally add at most one OWN OUTSIDE CHARACTER with NO printed traits and printed required energy <=3 to own hand. The separate ACTIVE life trigger readies one own field character and gives it BP +3000 for the remainder of the turn; the existing V2 ACTIVE handler correctly implements both parts.
- Shared strict V2 reducer operation `recoverOutsideTraitlessUnderEnergy` and profile validation; its own-outside physical UID choices exclude enemy outside, events, characters with printed traits and those above the printed energy limit. The choice-of-one queue resolves one selected branch in printed order and does not grant extra draw or return the printed 2 AP. Legal mode selection retains printed mandatory vs optional semantics. No source records are guessed or rewritten.
- Feature commit `9523428852051d4598b2b85d002b11b40589032e`, with exact source-pinned SLG contribution evidence, independent manifest and audit CSV. Five new scenarios in `tests/v2-slg-025-traitless-recovery.test.mjs`: source fingerprint/mandatory branches, draw-two path, draw-then-optional-recover with negative eligible targets and UID conservation, ACTIVE trigger, fail-closed schema. Existing 002 choice test updated to reflect 025 now ported.
- Initial GitHub Actions run **39552220431** had **1239/1244 pass, 5 fail**: four older exact SLG registered-count expectations were pinned to 27 rather than the now audited 28; new opponent-public-view assertion incorrectly treated a card in the PUBLIC outside area as secret. These were TEST expectation errors. Follow-up commit `ab1ec3189b07198e6b4694fd28d56d36c30c066c` corrects them without removing negative or UID tests and verifies opponent pending choice metadata remains hidden.
- **Independently verified green CI on commit `ab1ec318`**: [V2 Resumed Integration #39552419583](https://github.com/will00t-debug/Ua/actions/runs/39552419583), Node 22 `npm test` **1244/1244 pass**, **0 fail**; integrated cross-title matrix **60/60 complete**, 0 failures; unported report **success**, total **212/700 registered**, **488 unported**. [V2-D isolated SAO and MST QA #39552423247](https://github.com/will00t-debug/Ua/actions/runs/39552423247) both jobs success.
- Exact source candidate counts: BLEACH **80**, TTG **27**, SLG **28**, SAO **53**, MST **24**. Full independent per-card official FAQ certifications remain **0**, even though 025 printed text was verified. The new recovery's threshold/high-energy negative remains a useful follow-up regression, not an excuse to claim complete FAQ acceptance.
- NO local repository clone (DNS blocked), so no local `npm test`. No manual Android/browser visual QA; UI state and action checks are automated. No production deployment, no main merge, no force push. PR #75 remains draft; next batch should target a different source-backed common primitive rather than rewriting the existing chooseOne, passive BP or retire/deferred work.

## Batch 10 — SLG-1-014 own-outside recovery REST entry and FRONT ban (2026-10-21)

- Printed official `UA51BT/SLG-1-014`: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-014 . 水篠 聡子, purple2, AP1, BP1000, gen1, traitless and no Life trigger; once OWN effect adds this physical card from OWN OUTSIDE to OWN hand, controller MAY move it immediately to own ENERGY REST without extra AP, with onPlay mandatory TOP1 to outside. This physical card may neither enter nor move to FRONT. Japanese official **Q2025, updated 2026-04-17**, explicitly forbids even moving/swapping it from ENERGY to FRONT. No full per-card FAQ certification inferred.
- Generic strict card profile `ownOutsideRecovery:{op:'restSelfToEnergy',optional:true,rest:true}`; separate `frontForbidden:true` property. The shared `effect-recover-outside` action fires only on a physical OWN outside UID recovered by an own effect, not from life GET/deck search/bounce. A new `recovered-self-entry` controller pending lets player SKIP (retain hand) or enter ENERGY REST into a legal slot, including explicit full-line replacement to REMOVED. It keeps existing ordered queue, triggers real onPlay without AP double-spend, uses first-party exact legal action matching, AI and UI choice labels. Normal play, move, Raid and COLOR paths reject FRONT for frontForbidden. Strict schema rejects unknown, non-optional, ACTIVE-entry or FRONT profiles. No legacy reducer fallback.
- Commits: `aa9bd3e7b1dfec776428bec1337249a5e50cda4f` source implementation, `563eaab73348c3bc66f2e115d609df52e0ee2be1` 5 dedicated tests, `8b100410a9f2d1d5d8e585eb93c96ae10548ee8f` independent 213-ID registry/test/CSV evidence, `a07b300a1dc5917c75bffeec9809813329a03a68` CI-proven correction and full-energy AI no-sacrifice.
- First combined CI `39554242784`: **1244/1249 passed, 5 failed**. Four older exact SLG count pins still expected 28 rather than newly verified 29; one NEW negative test incorrectly expected the fourth EMPTY ENERGY slot to be illegal. Corrected the negative fixture to attempt occupied slot0 when the line is not full, and updated all strict independent cardinality pins. No skipped tests or loosened official identity validation. Normal/hard AI now prefers unoccupied energy insertion; it will SKIP optional free entry rather than sacrifice a card when all four energy slots are full.
- **VERIFIED SUCCESS** GitHub Actions `V2 Resumed Integration` run https://github.com/will00t-debug/Ua/actions/runs/39554412191 at code SHA `a07b300a`: Node 22 `npm test` **1249/1249 pass, 0 failed**; **60/60 five-title seeded matches complete with zero failures**; `node scripts/v2-unported-report.mjs` success. Isolated SAO/MST regression https://github.com/will00t-debug/Ua/actions/runs/39554417536 completed SUCCESS.
- Five-title source-pinned V2 registration: BLEACH 80/276, TTG 27/81, **SLG 29/80**, SAO 53/183, MST 24/80; **213/700 registered** and **487 unported**. Strict full individual official FAQ certification remains **0**. No local repo clone, manual Android UX or actual production deployment, no main merge, no force push; PR #75 remains DRAFT.
- Next shared cross-title primitive: events triggered by own-card OUTSIDE-to-hand recovery (e.g. SLG-1-003 and SLG-1-008), but do NOT register partial multi-effect cards. Official print and mandatory/optional sub-actions plus active/passive/attack parts must all be represented and verified before advancing official card count.

## Batch 11 — source-complete SLG-1-008, shared onOutsideRecover trigger (2026-10-21)

- Source: Japanese official https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-008 and independent printed equivalent https://exburst.dev/ua/cards/UA51BT-SLG-1-008 . Original card `エシル` (SLG-1-008), purple energy 1, AP1, BP2000, production purple1, character with NO traits and NO Life trigger. **Both printed text abilities audited and implemented**, not merely auto-authorized:
  1. When this same physical card enters its owner's HAND from its owner's OUTSIDE through an OWN effect, immediately mandatory draw exactly ONE, then mandatory discard exactly ONE own-hand physical UID.
  2. OnPlay inspect OWN deck TOP FOUR, select at most one whose **Japanese printed NAME** is either `水篠 旬` or `悪魔の城`, reveal it and add to hand; order the remaining inspected window cards to deck BOTTOM, without shuffle; only if at least one selected, discard exactly ONE own-hand card. No fifth-card search or opponent private leakage. `悪魔の城` (SLG-1-034) is still unported; the exact name predicate is intentionally valid for future authorized pack additions, not an excuse to enable that card.
- Reused the existing audited `searchTopOneBottomDiscardWhere` template (two name filters, `logic:'any'`) and its physical UID / private inspection / bottom arrangement / contingent discard chain. The new reusable timing `onOutsideRecover` is available through both raw `effects` and the existing `templateEffects` compiler. Its current strict profile is **one mandatory `drawDiscard` with count 1 on a CHARACTER**, no extra keys, no invented optional skip; any unsupported op, duplicate steps, event card or combination with `ownOutsideRecovery.restSelfToEnergy` fails closed until ordering rules are formally researched.
- `engine.mjs` adds the recovered card's own `programJobs(pack,recovered,'onOutsideRecover',owner)` to the FRONT of its original effect queue **only** after verifying the selected owned OUTSIDE UID and physically moving that exact card to its owner's hand. This suspends the recovering source's follow-up draw and guarantees recovered-self draw / mandatory discard first; the original queued instructions resume next. Deck search, ordinary draw, GET Life, bounce from field, enemy outside and skip do NOT trigger this new timing. SLG-014 optional free REST entry remains unchanged and incompatible mixed profiles are expressly blocked.
- Built `tests/v2-slg-008-on-outside-recover.test.mjs` with **six real-title tests**: official Japanese characteristics / both timings / missing Life, real SLG-037 recovery followed by the exact new self-trigger and then SLG-037 draw in correct order, optional skip and cross-title adversarial illegal UIDs, top-4 private positive select + ordered bottom + forced contingent discard, top-4 no-match/fifth-card negative with no forced discard, and strict fail-closed timing schema negatives. Independent exact-ID manifest, SLG contribution source evidence, audit CSV, suite cardinality pins and seeded matrix contract all updated.
- Code commit `e8e4d901d5e35cd2dd9211e45518b6546eebe16f`, test file `a230512d1cd7049e4eda296768759ed54d5f629e`, consolidated exact-ID/count acceptance `cb0febb01a4f94eb0dac0d1deea102f331acd08c`.
- **ACTUAL VERIFIED GREEN**: GitHub Actions V2 Resumed Integration https://github.com/will00t-debug/Ua/actions/runs/39556633927 (SHA `cb0febb`) successfully ran Node 22 `npm test` **1255 / 1255 pass, 0 fail**; seeded five-title legal matrix **60/60 completed with 0 failures**; `scripts/v2-unported-report.mjs` completed and reported **214 / 700 registered Pilot**, **486 blocked**, **0 fully FAQ-certified**. Exact counts: BLEACH 80/276, TTG 27/81, SLG **30/80**, SAO 53/183, MST 24/80. Separate SAO/MST workflow run: https://github.com/will00t-debug/Ua/actions/runs/39556641228 ; check its final status independently.
- Source registration is not complete official FAQ certification. UI tests are exact legal action/public-private model tests, NOT manual phone/browser testing. No change to main, no published Vercel update, no force push; PR #75 remains Draft. Continue from the latest branch HEAD, not historical commit IDs.
- Next shared primitive candidates: narrowly audited OWN hand-to-outside / outside-to-hand event ledger for continuous same-turn conditions (SLG-004), or hand discard as explicit activated main cost (SLG-009). Avoid calling SLG-004 complete until both its onPlay draw-discard and its board-live turn history condition are implemented and tested.

## Batch 12 — SLG-1-009 generic MAIN discard-hand cost and source BP buff (2026-10-21)

- Source: official Japanese UA51BT/SLG-1-009 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-009 . `向坂 雫`, PURPLE required energy 0, AP1, BP1500, generated purple1, CHARACTER traitless and independent ACTIVE Life. Its only printed character ability is **起動メイン: pay exactly ONE own HAND card to OUTSIDE, TURN 1; then THIS character gains BP+1500 this turn**. No AP, source REST/ACTIVE or line-specific activation cost is printed. The existing shared ACTIVE Life separately readies one owned field character and grants BP+3000 this turn. Official printed source reviewed, but full FAQ acceptance is NOT claimed.
- Reusable strict `mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500}` is explicitly schema-validated on character DSL entries; unknown extra fields, invented AP/REST costs, non-optional/zero/two-discard and empty BP fail closed. The engine offers activation for an OWN character in FRONT or ENERGY even when REST as long as it is own MAIN, has at least one OWN hand UID and has not yet used its ability that turn. No opponent/free-area cards can be discarded, and hand removal is an exact physical UID selection through a new `main-discard-buff` pending with `chooseMainDiscard` legal actions. **Only after payment** does source receive turn-scoped BP+N and its physical UID enter existing `mainAbilityUsedUids`. No AP spent, no source REST cost and no extra energy production. Once-use clears on the next turn using existing shared accounting, while BP expires according to current turn. UI label/pending shown, AI chooses lowest printed-energy legal own hand UID and hard AI can activate only with spare cards.
- Fixed a preexisting strict-trust loophole caught by the newly added schema-negative scenario: `implementation:'vanilla'` must reject **all** non-null `mainAbility` profiles (previous validator checked declared effects/passives but inadvertently omitted mainAbility). Actual legit card DSL remains unchanged.
- `tests/v2-slg-009-discard-main.test.mjs`: **seven** actual pack and match tests: official printed source + ACTIVE Life; REST own FRONT source pays a real own HAND card with no AP/REST double charge, does not buff before payment, and locks once after paying; own REST ENERGY activation, AI physical UID, no energy-generation change; empty own hand has no activation; next own turn loses old BP and permits a fresh payment while preserving discarded UID in OUTSIDE; independent ACTIVE life readies and gives BP+3000 without hand cost; fail-closed invalid main-ability schema and faux vanilla. Checks legal/public/private opponent view, wrong actor, fake UIDs and full 50-card UID conservation. Audit CSV, exact test-only source manifest and strict five-title counts updated; no title adapter uses legacy reducer or fake support flag.
- Code commit `f13679d08e6f9473a01b189f866f673f35637b8a`, dedicated tests `446c370888d0d8ff35d671bfa244c5c594247551`, strict 215-card count updates `26d7371ff17f63a59f4691ac40f79e69f44e11bf`. Initial CI run `39557620333`: **1260/1262 pass, 2 fail** — independent SLG audit provenance allowlist required explicit `SLG-1-009` addition and the new negative test exposed the genuine faux-vanilla mainAbility hole; neither was a reason to weaken tests. Both fixed in `44c7d74c44e4cab579ff5c9a9b17452aebd2548d`.
- **INDEPENDENTLY VERIFIED GREEN on code SHA `44c7d74`**: https://github.com/will00t-debug/Ua/actions/runs/39557812169 , Node 22 `npm test` **1262/1262 PASS; 0 FAIL**, five-title matrix **60/60 complete, 0 failures**, unported report SUCCESS (**215/700 registered Pilot, 485 unported, full independent official FAQ-certified 0**). SAO/MST isolated CI https://github.com/will00t-debug/Ua/actions/runs/39557819789 completed SUCCESS. Title breakdown: BLEACH 80/276, TTG 27/81, SLG **31/80**, SAO 53/183, MST 24/80.
- No main merge, no deployment, no force push, no manual browser/mobile QA; PR #75 still Draft. **Next candidate**: same-turn card-movement ledger for source-verified SLG-1-004, but NEVER register it until entire printed onPlay, once-trigger condition and Q/A timing are understood and tested. Alternatively use source-backed simpler on-play fully printed effects, keeping shared engine API generic. Always re-check new HEAD.

## Batch 13 — generic same-turn own effect movement ledger + SLG-1-004 (2026-10-21)

- Official Japanese source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-004 , `犬飼 晃` (purple 3 energy / AP 1 / BP 3500 / purple gen 1 / independent DRAW Life). The printed onPlay is **mandatory draw ONE, then place ONE physical OWN hand card in OUTSIDE**. Continuous BP+500 applies **only on this character's controller's turn** if, at some point in **this turn**, an OWN effect physically moved an OWN hand card to OWN outside OR one OWN outside card to OWN hand. The printed Japanese brackets are an OR, not a contemporaneous current-count check. No complete official FAQ certification.
- New cross-title same-turn state flags `turnEffectZoneMoves:[{handToOutside:false,outsideToHand:false},...]`, initialized per match, independently reset for BOTH owners in `startTurn`. Shared `markOwnEffectZoneMove(s,owner,from,to)` is called only after actual physical own-hand discard in the FOUR authoritative engine resolveChoice paths (`effect-discard`, paid `effect-discard-cost`, paid `effect-discard-gate`, `main-discard-buff`) and after actual `effect-recover-outside` physical card was added back to same owner's hand. It is **not** called on an unchosen pending payment, ordinary draw, deck search, life GET, deck mill, bounce from a field, removed-area displacement, or another owner's move. The printed origin and destination are inspected, not inferred by comparing pile counts. No private hand UID or history is surfaced to opponent public view. Invariants require exactly two Boolean flags per player and fail closed on malformed account state.
- Reusable live predicate `passiveBonuses:[{condition:{kind:'ownEffectHandOutsideOrRecovery',turn:'own'},bp:500}]`, independently strictly validated in `pack.mjs` (wrong turn, fabricated source/zone/min args rejected). Existing `matchesV2LiveCondition` performs true BOARD-LIVE BP evaluation from current state and own active turn instead of snapshotting on play. `SLG-1-004` also implements its fully printed onPlay `{op:'drawDiscard',count:1}` and independent DRAW Life; no unsupported effect omitted.
- Seven real-match/pack cases in `tests/v2-slg-004-turn-zone-ledger.test.mjs` cover official fingerprint and both effects; onPlay draw vs pending discard vs PAID discard (only latter gives BP); an entirely different owned SLG-009 MAIN discard creating the bonus with no SLG-004 onPlay; owned SLG-037 outside-to-hand triggering live BP but optional SKIP never triggering it; turn/owner reset and stale BP removal; non-effect pile changes do NOT grant buff; fail-closed profile validation and malformed ledger state. Includes exact physical UID, AP, public opponent privacy, wrong actor and card-zone integrity. Strict independent 216-card ID manifest, all SLG exact-count tests, audit CSV, per-title contribution and 60-game matrix pin updated.
- Feature SHA `0536222442bfad628fa685449ce944740421992f`; seven dedicated regression tests SHA `0704df848a56d330e6f9fc0cda121689aa966c6e`; independent exact-count/test matrix SHA `6efc14926860267615529c9d3b997efe76eb07c6`.
- **VERIFIED ALL GREEN on SHA `6efc149`**: V2 Resumed Integration https://github.com/will00t-debug/Ua/actions/runs/39558976235 , Node22 `npm test` **1269/1269 pass, 0 failed**, five-title 60 seeded games **60/60 completed, zero failures**, unported report SUCCESS: **216/700 V2 registered**, **484 remain unported**, **0 fully FAQ-certified**. Isolated SAO/MST QA https://github.com/will00t-debug/Ua/actions/runs/39558983568 SUCCESS. Exact counts BLEACH **80/276**, TTG **27/81**, SLG **32/80**, SAO **53/183**, MST **24/80**. No dropped prior title cards or disabled tests.
- No local checkout, browser/manual mobile test, production deployment, main merge, force push, or official exhaustive FAQ acceptance. PR #75 stays DRAFT. Future worker should inspect head/CI before editing; movement flags track actually resolved effect transitions but are not an exhaustive historical event log for arbitrary new zone kinds (later cards must use explicit schema and tests).
- Next small shared mechanic candidate: printed BP based on CURRENT OWN HAND size (SLG-1-069), or turn-history dependent on receiving a buff; verify complete official text/any trigger first. Do NOT conflate same-turn own effects with all zone changes or guess passive effect operators.

## Batch 14 — prove shared MAIN discard + self BP on *another* title, SAO-2-021 (2026-10-21)

- Purposeful course correction following user feedback: do NOT keep porting only SLG. Prior generic `discardHandBuffSelf` on SLG-1-009 was insufficient cross-title evidence; this batch independently pins the same printed main effect to **Sword Art Online** EX08BT/SAO-2-021 `キリト`. Next focus should remain BLEACH / TTG / SAO / MST and genuinely repeated source-backed mechanics; avoid new SLG as default.
- Independently verified OFFICIAL Japanese page https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-021 : BLUE required energy 0, AP1, printed BP1500+ (numeric base 1500), blue production 1, CHARACTER with **ALO** trait, independent ACTIVE Life. Full printed body `【起動メイン】【手札を1枚場外に置く】 【ターン1】このキャラはこのターン中、BP+1500。`. It has NO onPlay; life ACTIVE is independently global and must not be conflated with MAIN discard.
- Added exact Japanese source-locked `SAO-2-021` to manually reviewed `PRINTED_PINS` in `dist/universal-v2/sao-pack.mjs`, `kind:'mainDiscardSelfBuff'`; the SAO adapter compiles it directly to existing STRICT generic shared `mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,bp:1500}`, **identical** to separately pinned `SLG-1-009` printed ability. It reuses unchanged `engine.mjs`, `pack.mjs`, UI, AI, preview and life-trigger handlers, proving genuine cross-title applicability rather than cloning series-specific logic. No new engine or unsupported title logic.
- New `tests/v2-sao-021-shared-main-cost.test.mjs` has SIX independently constructed actual-title scenarios and source fingerprint: official characteristics, strict identical shared mainAbility; SAO as P0 versus SLG as P1 in REST FRONT: legal activation costs exactly own HAND UID, no AP or REST cost, no premature BP, wrong actor/foreign UIDs rejected, public/private hand secrecy, exact once turn use and movement ledger; reversed owner order (SAO P1 vs SLG P0) in REST ENERGY with legal hard AI selection and owner-ledger isolation; independent per-physical UID activation and zero-own-hand negative; BP expires and once flag rearms next turn while outside spent card remains; ACTIVE Life versus SLG attacker independently readies own SAO character and gives temporary BP+3000 without hand cost or ledger write. Independent source test files, 217-card manifest, title and suite pins and 60-game matrix all updated.
- Actual commits: code + independent roster/source file `060106a2dd4d08d715f301fbc9a62a84521b8130`, six detailed tests `cb57eb8eda9b070c68cab42a683a639e86b21531`; initial CI had **1272/1275 pass, three failures** (two old hardcoded SAO=53 test expectations; one wrong initial actor in new ACTIVE Life fixture) and isolated SAO/MST QA also flagged old 53 pins. Corrected both at `cc9bfe8dd70644808d809892a2763f3d353787e3` without loosening any legality or skipping scenarios.
- **INDEPENDENTLY VERIFIED ALL GREEN on SHA `cc9bfe8`**: Node22 `npm test` **1275/1275 pass, 0 failed**, seeded five-title 60/60 completed, 0 failed, unported report success https://github.com/will00t-debug/Ua/actions/runs/39561416389 . Isolated SAO/MST QA **SUCCESS** https://github.com/will00t-debug/Ua/actions/runs/39561424162 . Registered candidates **217/700**, blocked **483**, full independent per-card official FAQ acceptance **0**. Exact counts: BLEACH 80/276, TTG 27/81, SLG 32/80 (unchanged this batch), **SAO 54/183**, MST 24/80.
- Never claim the 60 seeded-match smoke tests prove every official FAQ; there was no local npm run, no manual browser/mobile gameplay, no production deploy, no main merge, no force push. PR #75 remains Draft. Next prioritization: audit TTG/MST/BLEACH for simple fully source-verifiable current hand-size / BP / energy or a fully printed onPlay reuse. Where possible prove same common mechanic with a second non-SLG card, and avoid unnecessary engine complexity.

## Batch 15 — TTG-1-006 generated-energy threshold (2026-10-21)

TTG-1-006 uses existing generic live `ownEnergyAtLeast` own-turn BP condition; six real TTG vs SAO tests cover source provenance, 5→6→5 generated-energy transitions, ACTIVE bonus, owner isolation, turn boundary and strict fail-closed profiles. Non-SLG TTG V2 rose 27→28; SLG unchanged 32. Source provenance is a user-supplied TTG card-front PDF mirrored into repository; direct individual Japanese page retrieval was not available, so this is NOT full official FAQ certification. Card/roster SHA `06d5596`, tests `b578cfc`, independent audit/count fix `7740954`, verified green at https://github.com/will00t-debug/Ua/actions/runs/39562864696 (**1281/1281 npm tests**, 60/60 five-title matrix; 218/700 registered, 482 blocked). SAO/MST isolated QA https://github.com/will00t-debug/Ua/actions/runs/39562870128 green. Another contributor has already authored `docs/v2-handoff/TTG-006-batch15.md` on this same branch at `6b2e7c4`; preserve its work. Next prioritize MST/BLEACH verified shared abilities; do not repeat SLG-only feature rounds.

## Batch 35 — MST-1-057 source-locked shared FRONT energy (2026-10-21)

- Current verified code SHA `94e131d1111acf8ee5fd30e5a483010e014484c8`. BANDAI Japanese official `UA54BT/MST-1-057` クリフ: GREEN4/AP1/BP3500, GREEN1, trait ラノア魔法大学, DRAW Life; full printed body `このキャラはフロントLでもエナジーを発生させる。` Source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-057 . No omitted extra printed effect. Full test/evidence: `docs/v2-handoff/MST-057-batch35.md` and `tests/v2-mst-057-front-energy.test.mjs`.
- Generic `frontGeneratesEnergy:true` strictly restricted to explicitly DSL CHARACTER. Shared live production now includes only own actual FRONT cards with that flag, alongside normal ENERGY line, with no opponent/hand/outside contributions and no duplicate when physically moved. REST/READY does not change base production; separate ACTIVE-only bonus still applies. Tests use two 50-card decks, MST vs SLG in both seats, GREEN4/AP1 paid entry, UID zone conservation, owner isolation, public hand privacy, schema negatives. No legacy title reducer, main change, or Production deploy.
- First SHA `f439968` CI had 1394/1398 tests pass, 4 fail: stale MST=32 and blocked=48 assertions, plus expected error text for an invalid DSL profile that correctly failed closed earlier than the explicit schema check. Corrected three exact count assertions and kept fail-closed invalid-profile tests at `94e131d`; no tests removed.
- **Verified ALL GREEN** at `94e131d`: Node22 `npm test` **1398/1398 PASS**, 60/60 seeded five-title matrix finished, 0 failed, unported report successful: https://github.com/will00t-debug/Ua/actions/runs/39594322873 . Isolated SAO/MST QA SUCCESS https://github.com/will00t-debug/Ua/actions/runs/39594331446 . Counts BLEACH 85/276, TTG 30/81, SLG 34/80, SAO 61/183, MST **33/80**; total **243/700 registered**, **457 unported**, **0 full official FAQ-certified**. No local clone/npm run (local GitHub DNS unavailable), manual mobile QA, main merge, production deployment or force push. PR #75 remains Draft. Next batch should verify another official cross-title common effect or improve the live front producer cost-payment test; do not treat seeded smoke tests as official FAQ acceptance.

## Batch 36 — shared AI REST-target quality regression (2026-10-21)

- Addressed the open PR review finding for the shared `effect-rest-bp` decision. Official Q91 legality is unchanged: an already-RESTed opposing character may still be selected. Normal/hard AI now prefers an eligible READY target, falling back to an already-RESTed target only when the pending effect is mandatory and no READY choice exists.
- Normal/hard AI no longer activates BLC-1-005's `selfRestEnemy` MAIN ability when every opposing FRONT character is already RESTed. The legal action remains available to a human controller; this is strategy-only and does not rewrite the card or engine legality.
- Added actual BLC-1-005 cases for both difficulty levels: all-opponent-REST negative activation and mixed REST/READY exact physical-UID target preference. Focused Q91/mandatory/uncapped REST regressions all pass.
- Code/test commit `9970353b38b92288c10c2e75cd3824aef54522e0`. Local Node **22.23.3**: `npm test` **1399/1399 PASS, 0 failed**; `node scripts/v2-integrated-match-matrix.mjs` **60/60 finished, 0 failures**; `node scripts/v2-unported-report.mjs` successful with counts unchanged at **243/700 registered, 457 unported, 0 fully FAQ-certified**. GitHub Actions on integration SHA `0156f1327bc7cbf69027bf441a65948ec800e25c` also succeeded: [V2 Resumed Integration #39595964281](https://github.com/will00t-debug/Ua/actions/runs/39595964281) completed `npm test`, the 60-game matrix and unported report; [isolated SAO/MST #39595968957](https://github.com/will00t-debug/Ua/actions/runs/39595968957) completed both isolated jobs.
- No main merge, deployment, force push, card-count change, or manual browser/mobile QA. Generated local audit outputs remain untracked and are not part of the commit.


## Continuous batch group — live production consumers (2026-10-21)

- Resume base: b40f59c8cd1a7ef069becde8a68d55b6b8305273. Kept existing AI REST fixes. Three related batches, separately committed; no newly registered cards.
- 9552e324907b816fa675855823d015b820f81479: universalCardEnergy now resolves the physical UID against the current field before reading printed identity, READY and timed buffs. Detached pre-dispatch references cannot misreport current production. Actual MST-1-029 tests in both seats cover READY/REST, timed expiry, foreign owner, exit and forged stale identity.
- 667b34f8f8707e7897d105642ae2a4ab051b080e: real MST-1-057 FRONT production pays another GREEN4 card; removing producer invalidates the old play action without mutating input; AP, UID and privacy checks in both seats.
- 3b0b29300ae0410cc5d2a737c28acda81dd0e931: real MST-1-063 onPlay draw sees total production 6 versus 7 with MST057 FRONT plus MST029 blue energy; exact drawn UID, owner isolation and both seats. Existing source-pinned profiles reused; no guessed new card text.
- 1ef220f528df8c073d43d557c7ca8f1bd59f5aeb: old SLG006 fixture had mutated a detached object after immutable dispatch; now explicitly asserts detached changes have no effect, then mutates the real field card to verify REST removes active bonus.
- Local Node 22.23.3: final clean committed snapshot npm test 1407/1407 PASS, 0 failed; node scripts/v2-integrated-match-matrix.mjs 60/60 completed, 0 failures; node scripts/v2-unported-report.mjs successful, 243/700 registered, 457 unported, 0 fully FAQ certified. Eight new tests.
- Initial exploratory full run failed twice: audit rejected concurrent tracked edits, and stale-object SLG fixture expected 1 while current state correctly produced 2. Resolved fixture and stopped mutations during final full suite; no gate disabled.
- Git HTTPS fetch failed with missing username; synchronized the three changed upstream files through authenticated GitHub connector and published commits via Git objects with expected-head non-force update. Remote CI verified SUCCESS for 545dbd96fc0146b3680223a0449d45fec22472b8: V2 Resumed Integration https://github.com/will00t-debug/Ua/actions/runs/39596922937 and isolated SAO/MST https://github.com/will00t-debug/Ua/actions/runs/39596928102. Local and published tree both d429e35dc0e5cb8e4dea16284dbb06f316b274c4. Subsequent documentation-only commits are not the tested SHA. No manual UI/mobile QA, main merge or deployment.
- Automation updated to 3–5 related batches per run, targeted tests each, full Node22/matrix acceptance per group, every hour at :45 Asia/Taipei unchanged. Updating task settings does not prove an already-running worker received them.
- Next: inspect latest head/CI; source-audit another non-SLG shared effect or front producer movement/Raid interaction. Do not redo these eight regressions or claim new card ports.

## Batch 37 — public FRONT producer display, real movement and payment (2026-10-21)

- Source-pinned `MST-1-057` has printed FRONT energy generation. The V2 public snapshot previously counted its energy in totals but did not expose per-card `produces` on FRONT; the V2 preview displayed no per-card production. Added a conditional, sanitized FRONT `produces` field and a shared FRONT/ENERGY badge using only the public snapshot. Non-producer FRONT cards do not gain an invented production property.
- `tests/v2-front-production-public-view.test.mjs` uses real MST/SLG 50-card decks in both seats. It tests actual legal ENERGY-to-FRONT movement, REST producer still generating, real green-4 paid play, AP, physical UID, opponent hidden hand, invalid actor/foreign hand UID, repeat-move rejection, public per-card energy and total energy, match conservation and preview badge wiring. No new card ID registered or FAQ certification asserted.
- Local git clone unavailable: `git ls-remote` failed `Could not resolve host: github.com`. Node 22 full suite and five-title matrix must be verified on this batch's own GitHub Actions run; do not carry forward previous counts.

### Batch 37 CI recovery verified — 2026-10-21

- The original Batch 37 test commit `4596449115491f03dd1a77a5cf3907fcd135c943` failed due to over-escaped regular expressions in `tests/v2-front-production-public-view.test.mjs` (not an engine rules failure).
- Correction commit `375cd90afb267481a26f34f9bbeef58fd9760018` fixes the three preview-source assertions without changing card rules or production behavior.
- GitHub Actions **SUCCESS** on that exact correction SHA: [V2 Resumed Integration #39604335973](https://github.com/will00t-debug/Ua/actions/runs/39604335973) completed Node 22 `npm test`, `node scripts/v2-integrated-match-matrix.mjs` (five-title matrix), and `node scripts/v2-unported-report.mjs`; [SAO/MST isolated #39604343159](https://github.com/will00t-debug/Ua/actions/runs/39604343159) completed core shared regression and isolated port tests. Workflow job conclusions were checked; exact test-count output was not independently extracted.
- No new card IDs, no claim of full FAQ certification, no main merge or deployment. Local clone is still unavailable due to DNS resolution failure. Next batch should start from the latest branch HEAD and source-audit a distinct reusable effect or add verified FRONT movement/Raid regression cases.

## 2026-10-22｜Shared continuous status / phase boundary round (Batches A–E)

**Work branch** `codex/v2-resume-20261021`; **integration PR** #75 (Draft). This supersedes only the latest engineering-status summary, not historical handoffs. Previous stable HEAD before this round: `7898d1bbbfa132e935ca55a5044bf69d042b4c47`. No changes to main, no production deployment, and no force push.

### Source of truth and separate acceptance levels
- **Engine support:** Added and remotely regression-tested generic, data-driven continuous state and exact phase-boundary queue. Not automatically enabled for any legacy title/card.
- **Registered card count:** remains **243 / 700**, **457 unported** (BLEACH 85/276, TTG 30/81, SLG 34/80, SAO 61/183, MST 33/80). No new full card ID registered in this round.
- **Real printed component tests:** `BLC-1-006` ATTACK optional REST-character skip; `SAO-1-034` >4-LIFE REST+skip branch. These are isolated test-only definitions with official source URLs. **Neither is fully ported.** BLC onPlay ACTIVE condition and SAO <=4-LIFE retirement override are still missing; no official per-card FAQ certification is claimed.
- **Complete official FAQ sign-off:** not performed.
- **UI:** Public snapshot includes per-visible-card restrictions, and legal source choices are shared with AI and UI interfaces. Actual graphical/mobile browser interaction was **not tested**.

### Changes and commits
1. **Batch A**, `0f49e77acea4125bb9f9a639fd9dc7fda99a8826`: `continuous-states.mjs`, owner/source/target UID and field-entry incarnation, phase expiry, one-at-a-time skip consumption, source-link cancellation, fresh Raid/play identity and field public restriction snapshot. Four tests in `tests/v2-continuous-states-batch-a.test.mjs`. End-of-turn duplicate refresh guard; no source-UID-derived status inheritance.
2. **Batch B**, `b576e172d0c75197f64f25a0aaa2d8b244274858`: strictly validated `skipNextActiveOppRest`, `restEnemyFrontSkipNextActive`, `restEnemyUnderBpSkipNextActive`; reuses existing `effect-rest-bp` choice, optional vs mandatory legal actions, printed BP gate, common AI. Four tests in `tests/v2-continuous-states-batch-b.test.mjs`. **First CI failed 2 of 1418 tests**, owing to new explicit templates not yet added to finite-registry expectation and a fixture wrongly assuming an untargetable mandatory event could be played. **Fixed without relaxing engine legality** in `d229c0251d46f0e24af6dc62712d3cfe001c661a`; CI then 1418/1418, 60/60.
3. **Batch C**, `6e578beb13a4d837309165763e3fde04e53b60ff`: explicit character/field `phaseEffects` configuration (`phase`, `edge`, `turn`, `then`); snapshots physical UID at phase edge, queues effects in one existing `effectQueue`; active owner before nonactive; simultaneous same-owner sources resolved by controlled `phase-order` selection, pauses for mandatory nested choices. Four tests in `tests/v2-phase-boundary-queue-batch-c.test.mjs`; Node22 1422/1422 and matrix 60/60.
4. **Batch D**, `b2e201cdded78fb1cbe709a9023aa49380018bd7`: source-pinned BLEACH and SAO partial printed-behavior tests, legal AI choices, hidden hand, no double UID. Initial CI **failed** because isolated SAO test omitted printed SPECIAL trigger profile; corrected in `d16ffce07856b651e20a4898d119d307dc9085be` with `triggerEffect:{op:'retireOppFront'}`. Source test is deliberately isolated from V2 registered packs, which must reject those unfinished card IDs.
5. **Batch E:** GitHub Actions on `d16ffce0` **SUCCESS**: Node22 `npm test` **1425/1425 pass, 0 fail**; `node scripts/v2-integrated-match-matrix.mjs` **60/60 matches, 0 failures**; `node scripts/v2-unported-report.mjs` completed; integration run [#39640216179](https://github.com/will00t-debug/Ua/actions/runs/39640216179). SAO/MST isolated QA run [#39640224303](https://github.com/will00t-debug/Ua/actions/runs/39640224303) SUCCESS: core 1425/1425, isolated 24/24. These tests ran through remote Actions `node-version: '22'`; a local clone/runtime check was unavailable because `github.com` could not resolve from the runtime.

### Known remaining gaps / next batch priority
- **Top priority:** One declarative **life-count-dependent alternate outcome** for SAO-1-034 (>4 life REST+skip, <=4 life retirement with replacement protection), and **enter ACTIVE if an opponent REST exists** for BLC-1-006. Wire them to existing paid-event/entry/retire and ordered effect queue, not work-specific reducers. Verify original card effect text, AP/energy, source UID, distinct life thresholds, AI, and trigger. Then evaluate full registration of these two cards only after all branches/trigger and official source checks.
- Next: universal `cannotActive` and `skipNextActive` printed timing for MST-1-054, combined with temporary ability-disable layer and Raid/onLeave semantics; no full card registration before all effects proven. Add official phase timing tests to use `phaseEffects` on a real completed card before claiming a true phase-boundary card port.
- Test gaps to prioritize: multi-actor simultaneous trigger ordering under Raid replacement, source leaves while pending, expired status on bounce/replay, duplicate same-name triggers, and browser/mobile graphical choice rendering.
- Keep migration/port reports source-pinned; old `auto` is irrelevant. Do not reuse these isolated partial test cards as if authoritative registered content.

### Final-doc commit note
This section records the last fully evaluated **code commit** `d16ffce0`. A documentation-only commit updating handoffs is made afterward and must not be presented as independently verified until its own CI finishes.

## 2026-10-22｜第二輪實際開發：LIFE 分支與條件式 ACTIVE 登場（PR #75）

**工作分支**：`codex/v2-resume-20261021`。接續上一輪通過 CI 的 HEAD `7a128f068f0ac62791fae4424aa8eb02b42aad5b`。本輪程式驗收 HEAD：`46b66c40cd876cc03c788a509a461f5308090709`。只更新 PR #75，沒有合併 main、force push 或部署 Vercel 正式站。

### 已完成且已驗證的新共用機制
1. `restOrRetireOppFrontByLife`：卡牌資料設定 BP 上限、己方 LIFE 門檻與 optionality；效果實際執行時決定是既有 `effect-rest-bp`（並施加 UID 綁定的一次性 ACTIVE 跳過）或既有 `effect-retire-bp`（含既有 leave-replacement / Raid 保護路徑）。費用與強制事件的合法目標預檢仍由 V2 核心執行，不引入作品或卡號判定分支。模板名：`restOrRetireEnemyFrontByOwnLife`。
2. `enterActiveIfOpponentRest`：正式 V2 character schema 的布林旗標，只接受顯式 true；普通場上登場時以敵方目前可見的任一 REST 角色決定 ACTIVE/REST。不可從印刷文字自動推斷；場上角色實體 UID、`fieldEntryStamp`、AP／能源均沿用原本共用路徑。

### 此輪新增「完整印刷卡面邏輯 V2 登錄」
- `SAO-1-034`（ラディアント・ライト，UA15BT/SAO-1-034）：來源 `dist/sao-official-import.mjs` 與 [日本官方卡面](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-034)。黃3／AP1 Event，BP 5000 以下敵方 FRONT 必選。己方 LIFE 5+ REST 並跳過下一次 ACTIVE，LIFE <=4 改退場；SPECIAL Life trigger 明確配置。實際正式 SAO × BLEACH 50 卡場景：`tests/v2-sao-034-official.test.mjs`。官方個別 FAQ Q754 已核對。
- `BLC-1-006`（キルゲ・オピー，UA08BT/BLC-1-006）：`dist/expansion-cards.mjs` 統合的官方來源映射與 [日本官方卡面](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-006)。黃4／AP2 Character，有敵方任一 REST 角色則 ACTIVE 登場；攻擊時可以指定敵方場上 REST 角色（含 ENERGY 線），令下一次 ACTIVE 失敗；GET trigger 保留。真正第二個己方回合 AP2/能源4、跨 SAO 牌組、攻擊和對手起始 refresh 測試：`tests/v2-blc-006-official.test.mjs`。官方個別 FAQ Q536 已核對。
- **登錄數**：BLEACH **86/276**（未移植 190）；TTG **30/81**（51）；SLG **34/80**（46）；SAO **62/183**（121）；MST **33/80**（47）。合計 **245/700 已登錄，455 未移植**。比上一輪 +2 / -2。獨立 ID manifest 與所有來源鎖定驗收清單已同步；歷史盤點快照保留。

### Commit / CI 實據
- `0287f376abb1de4c6828448519a42f2997ae6997`：通用 schema、效果 op、LIFE 判斷與條件登場程式。
- `bdaa1c30e5f3fd833549997cf8b1457f47a57388`：獨立共用機制測試；初次測試嘗試在 LIFE=0 的已終局對局繼續下動作而失敗，`f38c78d89014c34952e6456dc33e18d7221a8934` 改為有效 LIFE=1/4 場景並回歸通過（沒有改引擎合法性）。
- `c8e36f3a3a2da4e73512399dd948e30c1496707e`：SAO 真卡正式登錄和實牌測試，`d13de773d650f0eb2a8f890e369aed2fa9d44bc0` 更新 SAO 舊計數測試。
- `cd969cbd695b9b7106b35bb5c03604f14b402bfb`：BLEACH 真卡登錄、實牌測試與五作品整合矩陣的獨立精確卡數更新（保留 60 場與 5500 步結算判斷），`46b66c40cd876cc03c788a509a461f5308090709` 更新其餘 BLEACH 歷史計數斷言。
- 本輪最後程式驗證：[V2 Resumed Integration run #39643776535](https://github.com/will00t-debug/Ua/actions/runs/39643776535) **SUCCESS**：GitHub Actions Node.js 22，`npm test` **1433/1433，失敗 0**；`node scripts/v2-integrated-match-matrix.mjs` **60/60、零失敗**；`node scripts/v2-unported-report.mjs` 執行成功、回報最新 245/455。
- [SAO/MST isolated run #39643785791](https://github.com/will00t-debug/Ua/actions/runs/39643785791) **SUCCESS**：核心 1433/1433，獨立移植 24/24。
- 本機 `git ls-remote` 因 `Could not resolve host: github.com` 失敗，因此沒有宣稱本機 Node 22 已跑測試；上述數字全取自真正遠端 CI 日誌。
- 本文件更新 commit 會晚於 `46b66c4`，它自己的 CI 要另查，不能混充上述已驗證程式 commit 的結果。

### 不得擴張的驗收宣稱／下輪重點
本輪「完整印刷卡面邏輯 V2 登錄」是程式邏輯與已確認個別 Q536/Q754 的等級，**不是**兩張卡所有可能互動的「完整官方 FAQ 全情境驗收」。實際手機／圖形瀏覽器 UI 互動未測；只驗證公開牌面資訊、合法選項來源及 Normal/Hard AI。
下一輪優先以官方卡文逐張核對其他延遲能力失效／跨回合持續（如 MST-1-054），補齊來源離場、回手再登場、Raid 上層更換與多來源同時觸發的整合測試。先擴充通用 DSL／事件隊列，不因部分效果就把其他真卡列入完成。

## 2026-10-22｜第三輪：MST-1-054 驅動的共用原能力失效／攻擊階段末持續狀態

### 範圍與來源
- 接續 `69c8352ed188512e1698b2e3745d3a675d8df60c`；工作分支 `codex/v2-resume-20261021`，整合 Draft PR #75。不合併 main、不部署生產 Vercel、不使用 force push。
- 本輪官方來源是 [UA54BT/MST-1-054 洛琪希的 JP 印刷卡文及 Q2158、Q2159、Q2160、Q2220、Q2228](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-054_p2)。
- 目標為**通用 V2 引擎功能**和官方**元件**測試；`MST-1-054` **未加入正式作品 registry**，不可把測試輔助牌或未認證交互算成新增實卡。全五作品仍 **245/700，未移植 455**（BLEACH86、TTG30、SLG34、SAO62、MST33）。

### 通用功能已完成
1. `continuous-states.mjs` 新增 `originalEffectsDisabled` 物理場上 UID、場上進入編號（`fieldEntryStamp`）綁定狀態；和現有 `cannotActive` 一樣具有可列印的到期 `{player,phase,edge}`。不以名字/卡號推導，不依賴來源持續留場；目標離場/換 Raid 頂層/重新登場即排除舊實體化身，對手公開可見限制，對隱藏牌資訊沒有新暴露。
2. 新的封閉式共用 DSL `restSilenceOppFrontIfOwnOutsideField` 和模板同名。只有控制者場外 **真正 FIELD 實體** 才可在效果結算時選敵方 FRONT 最多一角色，轉 REST 並附加「下次對手 ATTACK phase end 前不可 ACTIVE」及「失去所有**原本印刷效果**」。不選擇亦合法；使用既有 `effect-rest-bp` pending 與 Normal/Hard AI/legal selector。
3. 動態分離 printed-vs-granted：封印印刷被動 BP／產能加成、前線產能資格、印刷 IMPACT/留場條件、STEP、MAIN、攻擊／階段／真退場觸發與被 Raid 時觸發（`onRaided`）；**不清除已獲得的 buff 或其他來源給予的效果**，卡片本身 BP/原本 gen 與 Raid 疊層仍存在，尚未排定的印刷能力不會發動。帶來源效果已實際觸發並排入隊列者不因來源後續失效而回溯取消。
4. **重要修正**：`advanceAfterEnd` 的 ATTACK phase end ACTIVE refresh **先進行封鎖中的那一次 ACTIVE 嘗試，再刪除到期狀態**；`next(attack)` 不得提早刪除。原先順序造成在指定結束邊界提前 ACTIVE，和卡文期限不符。前階段動作及 hand-limit continuation 仍用既有單一隊列。

### 真正跑過的測試與 commit
- `0232c0edbc90088034b3c5357a2a10e0c03d55ef`：嚴格 DSL/schema/status。
- `5d917141ee721f88e66ffae85199e0980d5fa54b`：核心 originalEffectsDisabled 對共用判定入口的套用。
- `d137cbecc460e2221638fb2e65ccf1c9c0119962`：共用狀態七組測試（包含原本的官方 Q2220、Q2228 保護）；`a68a7dddec549a3100c392a949d0cadae0365d71` 修正測試 stale reference（immutable dispatch 後須取最新物件）。
- `9958f8c528167a57db7fa85bd72c86d81ab69833`：修正 ATTACK-end refresh 的精確時序（真實回歸修正）。
- `22bfbdfbe3af453d755ff35402c08c799d703fd5`：`tests/v2-mst-054-source-pinned-component.test.mjs` 使用 `MST_V2_OFFICIAL_BY_ID` 精確官方文字/數值/RAID trigger，真正的 MST 洛琪希 RAID 基底與真正 SAO-1-014 對戰。**僅為元件測試**：因正式 V2 MST FIELD 尚未移植，特別使用明確命名 `MST-COMPONENT-FIELD` 的合成場域卡來測條件，沒有加入正式 deck/registry。
- 已完成 [GitHub Actions V2 Resumed Integration #39692749399](https://github.com/will00t-debug/Ua/actions/runs/39692749399) **SUCCESS**：Node 22 `npm test` **1442/1442、0 失敗**，60/60 五作品 legal match 矩陣零失敗，unported report 完成。
- [SAO/MST isolated #39692757463](https://github.com/will00t-debug/Ua/actions/runs/39692757463) **SUCCESS**：核心完整測試及 24/24 isolated subset 都通過。
- 保留數據和安全界限：243→245 已是上一輪的變更，此輪 **新增正式已移植卡數 0**。沒有本機 clone 成功的證據，因此 CI 數字只來自 GitHub Actions 日誌。沒有手機或圖形 UI 手動實機驗收，也未做完整官方 FAQ 所有特殊交互。
- 這一份交接文件提交後會觸發自身 CI；不能將上述程式 HEAD 的已通過狀態直接宣稱為文件 HEAD 自己的 CI。

### 接續目標
1. 若要正式加入 `MST-1-054`，先找出並源鎖正式可玩的 MST FIELD 牌及足夠的綠4、RAID 牌組，在真實完整 50 卡條件下驗證全部觸發／取得／互動，並同步所有獨立卡號與 unported 斷言；禁止用 `MST-COMPONENT-FIELD` 冒充正式 port。
2. 細查取得的額外能力和「原本」能力的延遲觸發 Q2220/Q2228 對照，以及有多個角色同時進入 ATTACK end 的 phaseOrder 對過期順序的互動。來源離場、同名再登場、Raid 頂層替換及 suppress/onRetire 的基礎回歸現已覆蓋。
3. UI/真機仍是獨立驗收缺口。保持 Draft PR，不碰 main / prod。

## 2026-10-22｜第四輪：官方 MST-075 FIELD ＋ MST-054 RAID 正式移植；新增可用的真實預設牌組

**分支與安全範圍**：從 `d4b26f675950fb1cb43209c2a97334d0f0b81dbc` 接續；工作分支 `codex/v2-resume-20261021`，整合 PR #75 保持 Draft。**不合併 main，不部署正式 Vercel，不 force push。**

### 官方來源、真卡精確實作
1. **MST-1-075《迷宮都市ラパン》**：[BANDAI 日本官方卡表](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-075)。印刷綠色 Field / energy 0 / AP 1 / 產能 1 / GET：登場時**抽 1、手牌 1 到場外**（`onPlay:drawDiscardOne`），**真退場**時抽 1（`onRetire:draw 1`）。本輪正式 `PRINTED_PINS` 鎖 `MST_V2_OFFICIAL_CATALOGUE` 原文／數值／官方連結，經 title contract 合法登錄，不是以前的 `MST-COMPONENT-FIELD` 假卡。
2. **MST-1-054《ロキシー》**：[BANDAI 日本官方卡表](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-054)，官方 Q2158、Q2159、Q2160、Q2220、Q2228。印刷綠 4 / AP1 / BP4000 / 產能1 / RAID〈ロキシー〉 / RAID trigger；登場時若**自己的場外有真正 FIELD**，敵方 FRONT 最多 1 角色 REST，失去原本印刷能力且不能 ACTIVE 直到下次對手 ATTACK end。使用上輪已完成通用 `restSilenceOppFrontIfOwnOutsideField`，不寫任何 MST 專屬 reducer，不會把原本印刷效果和外加的 buff 混淆。
3. **真退場及滿場 REMOVAL 區分**：`pack.mjs` 允許 Field card 的明確 `onRetire` 畫出 `draw/millTop` program；`engine.mjs` 通用新增經完整選項驗證的 `retireOwnFieldOne`（最多 1、可選擇不退場、只有己方 ENERGY 的**場域卡**，保留物理 UID 與退場隊列），可由未來具有該效果的印刷卡採用。測試專用事件 `TEST-RETIRE-FIELD-EVENT` 用它來測 MST-075 的退場抽牌／拒選／原效果失效；**這個事件不在正式登錄或任何可用真實牌組中**。滿場正常替換將原卡送 REMOVED 而非退休，不觸發 `onRetire`。
4. 原本 `tests/v2-mst-054-source-pinned-component.test.mjs` 已移除合成場域卡，改為 source-pinned 的兩張**正式已登錄**卡證據。

### 合法官方 50 張與預覽實際可選
- 新增 `dist/universal-v2/sao-mst-real-decks.mjs` 中 `MST_V2_ROXY_FIELD_REAL_DECK_COUNTS` 與 `verifiedMstV2RoxyFieldDeck()`，全部卡號限官方 MST UA54BT、每卡最多 4；**MST-1-051 自 2026-10-01 僅允許 1 張**，牌組配置確實為 1 張，總 50。使用已登錄 `MST-1-050` 作 RAID 底卡、`MST-1-051` 產能 2、`MST-1-075` 真場域、`MST-1-054` 上層。
- `dist/universal-v2/preview-real-decks.mjs` 增加**第七套** `mushoku-tensei-roxy-field`；`dist/universal-v2-preview.html` 人類／AI 兩個選單都已加入。原先六套全部保留。頁面是**private/noindex preview**，不是正式 production 部署。
- `tests/v2-mst-054-075-real-deck.test.mjs`：以真實 MST50 × SAO50，從合法 P0 第二回合 AP 2 出發：先支付 AP1 登場 MST075 → 真正抽 1、棄**另一張 MST075**至己方場外 → 支付另 1 AP 用真 `MST050` 進行 MST054 RAID（綠4足夠）→ 選 SAO014 對方前線；測驗 REST、原本 opponent-turn BP 加成失效、UID、疊層、公眾資訊與 Normal/Hard AI 合法選項。也驗證無場外 Field 條件時不觸發和 controller 自願不選。
- `tests/v2-mst-075-retire-trigger.test.mjs`：含測試專用、**從不加入真牌組**的效果來源，以實際 MST075 測試「真退場抽 1」，來源已失原能力時不抽，拒絕退場不抽，滿 ENERGY 以新卡**移除**原 Field 不可誤抽；虛構 UID 無合法選項。

### 實際批次與 CI
- `996f12e928a60773ce9e32add5f8f1e3b9aad1cf`：通用 Field retirement 的 onRetire / optional own FIELD choice 可編譯且安全操作。
- `513239512f24658d9268e7d59473f0ca92edb824`：MST-054/075 正式印刷卡面落地、真實牌組測試、退休測試及全五作品計數同步；該 SHA 的兩套 CI 已通過。
- `4d4f68894e122e9458053f9ba344653dff3a4bdf`：預設牌組 canonical export 與預覽增加第七套；首次 CI 僅舊預覽測試仍要求六套而失敗，未放寬牌組或勝負檢驗。
- **最新已驗證程式／預覽 SHA `d075dcc6b10ee6c6efea544ae3fcd04ed05dd988`**：雙方預覽 HTML 新選項、七套預覽驗收。完整 Node 22 [V2 Resumed Integration #39695493230](https://github.com/will00t-debug/Ua/actions/runs/39695493230) **SUCCESS，1449/1449、0 fail**；原本 60 場 [five-title matrix](https://github.com/will00t-debug/Ua/actions/runs/39695493230) **60/60、0 fail**，unported 報告執行完成。獨立 [SAO/MST QA #39695496325](https://github.com/will00t-debug/Ua/actions/runs/39695496325) **SUCCESS，core 1449/1449、isolated 24/24**。
- 目前正式登錄：**BLEACH 86/276、TTG 30/81、SLG 34/80、SAO 62/183、MST 35/80**；合計 **247/700 已登錄，453 未移植**（本輪真卡 +2，沒有將虛構 Field/Event 算入）。
- Docs commit 須於提交後另等遠端 CI，不可混用程式／預覽 SHA 的成功結果。

### 尚未聲稱通過的關卡
完整官方 FAQ 多卡同時交互／視覺 UI 與手機手動驗收仍未完成；官方個別印刷規則和指定回歸通過不等於所有 Q&A 全面認證。本輪測試專用 `retireOwnFieldOne` source 不是官方可玩卡。後續優先把真 FIELD 發生 retirement 的官方 MST 卡能力（例如 MST-053／MST-074）以完整原文驗證後再移植；不要擅自把測試用 fake event 混入 V2。

## 2026-10-22｜第五輪：共用實體退場事件、場域退場成本與完整 MST042／046

**工作分支** `codex/v2-resume-20261021`；**Draft PR** #75，接續起點 `6040ddf15bf4ada5ff82220c35d62b534c94a3e5`。本輪最後完整程式 CI 驗收的 SHA 是 `d427c19aae8f80af329547fe714000e405c1050a`，**不是**後續文件更新 commit。沒有合併 main、部署正式 Vercel 或 force push。

### 三種完成層級必須區分

- **共用引擎已實作：** `turnRetireEvents`（每個 turn 清空；真實場上實體退至場外才紀錄）、`retiredThisTurn(s,controller,cardType)`、`ownRetiredThisTurn` 動態 BP/產能條件、`readySelfIfOwnRetiredThisTurn`、`retireOwnFieldThen`；退場的控制者、CHARACTER/FIELD、物理 UID、原場上行與 `fieldEntryStamp` 均記錄。沿用既有 `retire()`、`onRetire`、`retireOwnFieldOne`、`mainReadyOnceByName`、`passiveBonuses`、`effectQueue`、`leave-replacement` 和 LEGAL/AI 單一來源。不把 full-line replacement/remove、bounce、Raid 內部層隱藏移除當作普通實體退休事件。
- **新增完整 V2 登錄真卡：** `MST-1-042`（エリナリーゼ；GREEN4/AP1/4000/GEN1；IMPACT null、已退場的己方 FIELD 才可 MAIN READY、每回合同名一次、ACTIVE LIFE trigger）與 `MST-1-046`（タルハンド；GREEN3/AP1/3000/GEN2；己方 FIELD 已退場同回合 +GREEN1；FRONT 的每回合一次 MAIN：選己方實存 FIELD 真退場成功後自身 +1000BP）。完整來源 `dist/universal-v2/sources/mst-official-print.mjs` 以及 Bandai `UA54BT/MST-1-042`、`UA54BT/MST-1-046`；Q2156 同名條件核對。成功支付可接續真正的 `MST-1-075` FIELD onRetire DRAW。對應完整真牌 `tests/v2-mst-042-046-retirement-official.test.mjs`。沒有把測試用合成卡登錄。
- **官方 FAQ 全面驗收：** 仍為 **0**，不得和上兩欄混淆。官方 Q2156 有精確參照；其他跨牌交互、瀏覽器 UI/手機、所有可能 leave/Raid 情境尚未宣稱全面 FAQ 認證。

### 正式 coverage／守恆

| 作品 | 已登錄 / 總母體 | 尚未移植 |
|---|---:|---:|
| BLEACH | 86 / 276 | 190 |
| TTG | 30 / 81 | 51 |
| SLG | 34 / 80 | 46 |
| SAO | 62 / 183 | 121 |
| MST | 37 / 80 | 43 |
| **合計** | **249 / 700** | **451** |

獨立 `tests/fixtures/v2-integrated-id-manifest.mjs` 包含新增兩個精確實卡 ID。劇本確保兩位玩家共用合法動作及 UID/原版牌組簽名；此輪沒有新增 BLEACH/TTG/SLG/SAO registry 卡數。原 457 卡自動效果關鍵字盤點是歷史快照，不以重新宣稱等同 451 卡人工重分類。

### 分批 commit（逐批接續，失敗修復保留日誌）

1. **Batch A** `30b7df9a203e5f8c18f0566f7412c39c01a96090`：實際完成的退場 ledger、回合重設與正負例；GitHub CI [整合 #39700550898](https://github.com/will00t-debug/Ua/actions/runs/39700550898)、[SAO/MST #39700553713](https://github.com/will00t-debug/Ua/actions/runs/39700553713) SUCCESS。
2. **Batch B** `cca14bc5c20d79ad63efba14b91b868bd6299bfa`：同回合退場分類條件的共享能量、BP、同名 once MAIN READY；合成卡元件負測、AI 單一合法動作回歸。當 SHA 的整合與獨立 CI 均 SUCCESS。
3. **Batch C** `a95bf7abb0f5dd0b558b8042b0c5524046db9943`：共用 MAIN 強制 FIELD 真實成本、非空法定選擇、真退休的 MST075 onRetire 先於成功代價後的 BP buff；[整合 #39702004595](https://github.com/will00t-debug/Ua/actions/runs/39702004595)、[SAO/MST #39702007299](https://github.com/will00t-debug/Ua/actions/runs/39702007299) SUCCESS。
4. **Batch D** `e1663eb2fbcf8a0c4669363e7d01631ac78d82e6`：完整 MST042/MST046 官方日文 pin、正式 registry、獨立 manifest、真實 50 卡對局。第一輪 Node22 **11 項失敗**，全都來自舊的 `35 MST/247 V2` 歷史固定數量斷言，非實卡邏輯失敗。保留實際日誌並只修正正確數量：`6918a042ae63a8a5d43ca4029d7f272460c01cbe`、`d427c19aae8f80af329547fe714000e405c1050a`。不刪測試、未弱化任何 engine legal/assert。新的 `MST042/046` 官方測試均通過。
5. **Batch E** 在 `d427c19aae8f80af329547fe714000e405c1050a` 的 GitHub Actions：Node.js **22.23.3**，`npm test` **1458/1458 通過，0 失敗**；`node scripts/v2-integrated-match-matrix.mjs` **60/60 完成，0 失敗**；`node scripts/v2-unported-report.mjs` **700 總卡／249 Pilot／451 未移植／完整 FAQ 0**。 [V2 Resumed Integration #39703049095](https://github.com/will00t-debug/Ua/actions/runs/39703049095) SUCCESS、[SAO/MST isolated #39703051722](https://github.com/will00t-debug/Ua/actions/runs/39703051722) SUCCESS，獨立 QA **24/24**。GitHub CI 是真正 Node22 執行來源；本地 runtime 無法 DNS 連 github.com，沒有聲稱本機執行所有測試。

### 未完成／下一輪最佳共用解鎖

- **MST-1-052**：〖退場時〗僅在己方場上有 FIELD 才抽 1；需共用條件式 onRetire、確認退場觸發當刻的場域狀態與同時事件順序。仍 **未登錄**。
- **MST-1-053**：COLOR trigger 的對應替代（角色卡改 FIELD 卡）、登場抽棄、FRONT optional FIELD retire → draw；不能只實作後半就登錄。
- **MST-1-074／076**：複合效果，需逐字核對 full JP text、Raid／生命 Trigger／事件連鎖。
- **BLEACH BLC-1-024**：本回合兩個 CHARACTER 真退休的 BP/DAMAGE2 條件，需共用計數型 `retiredThisTurn`（不只是 boolean）＋ Raid 頂層去向與多模式擇一。尚未登錄；其他 TTG/SLG/SAO 候選不得只靠效果關鍵字推定等同。
- **推薦下一輪：** 扩充同回合真退場 ledger 的 **次數／所有者／卡型／事件時點條件**，並與泛化 `onRetire` 後續工作隊列和 `chooseOne` 合流。先用 MST052、BLC124 官方逐字卡文做元件測試，再挑完整可移植實卡。優先補真 bounce、Raid 剝離、remove、leave-protection 同回合的各別事件否定測試；不把 full-line removal 偽裝退場。
- **安全狀態：** main 未合併；正式 Vercel 未更新；未 force push；沒有覆寫競爭分支的 ref（每次更新都帶 `expected_sha`）。


## 2026-10-22｜第六輪：真退場張數條件、條件式 onRetire、完整 MST052

**工作分支** `codex/v2-resume-20261021`，**Draft PR #75**；起始 HEAD `e78660a0bd8d4ac99a437b397ca3f6fbc0c2eb22`。最後已通過全量程式 CI 的 SHA 為 **`667309127ab3c2ff77367673356ae6a5442d140d`**，文件更新的 commit 較晚且需另外查 CI。不合併 main、不部署正式 Vercel、不 force push。GitHub 連接工具支援遠端 Git object 及 Actions；本地無完整 git checkout，以下 Node22 證據來自 Actions 日誌而非假稱本機測試。

### 引擎／真卡／驗收必須各別呈現

- **已完成共用引擎：**
  1. `countRetirementsThisTurn(s,controller,cardType)` 從既有唯一 `turnRetireEvents` 計算**真正完成的事件次數**，可限定 controller 0、1 或 `any`，以及 `character`／`field`／`any`；同一實體離場、回場再退場時按真實事件算，不去重 physical UID；下一個 turn 一律重置。沿用 `retiredThisTurn`，不新增第二套事件隊列、不揭露對手隱藏 card ID。
  2. `retireCountThisTurn` 為完整資料驗證的 live passive 條件：`{kind,turn,controller:'own'|'opponent'|'any',cardType:'character'|'field'|'any',min:1..50}`。供既有 `passiveBonuses` 使用，不新增作品專用計算器。測試 2 次對方 CHARACTER 真戰鬥退場、0/1/2 閾值、己敵方分離、FIELD 不混算及新回合重置；非法 schema fail-closed。
  3. `drawIfOwnFieldExists` 為共用、嚴格限定 `onRetire` 的條件式 `draw` operation。真正觸發退場效果結算時檢查**退場卡控制者**當下場上的 FIELD 實體，成功才由其牌庫抽卡。純手牌、場外、除外、Raid 隱藏底層不能代替 FIELD。繼續重用 `programJobs`、`queueRetirement`、`retire`、`effectQueue`；滿線 `removed` 非退場，不排程。`onRetire` 的原本能力已遭封印時沿用原 `programJobs` 規則。
- **完整移植真卡：** 依 `dist/universal-v2/sources/mst-official-print.mjs` 精確日文原文和官方 [UA54BT/MST-1-052](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-052) 的 `MST-1-052` 洛琪希，綠0／AP1／BP2000／產能綠1／CHARACTER／無 Trigger；〖退場時〗己方場上有 FIELD 時抽 1。正式 `mst-pack.mjs` `PRINTED_PINS` 嚴格比對實際 `MST_V2_OFFICIAL_CATALOGUE`，新增完整 `tests/v2-mst-052-official-retire.test.mjs`：真實 50 張 MST×MST、兩個 owner、FIELD 有無／只對方有 FIELD、實際阻擋退場、抽牌來源、UID、隱藏手牌、滿線移除非退場。獨立 `tests/fixtures/v2-integrated-id-manifest.mjs` 同步，不使用測試用假卡充當正式登錄。
- **元件／未移植：** `BLC-1-024` 的印刷本回合「雙方合計至少 2 張 CHARACTER 真退場」數量條件現可共用，但該卡尚有 Raid 頂層剝離、登場模式選擇及賦予 DAMAGE(2) 等能力，**仍不在 V2 registry**。官方 [BLC-1-024](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-024_p1) 及 FAQ **Q549** 明示 RAID 上層剝離非退場。此輪合成卡計數測試僅證明共用條件，不是 BLC 全卡驗收。
- **嚴格官方 FAQ 全情境驗收：仍為 0**。既有正反例、特定官方 FAQ 與程序化真卡對戰，均不等於完全官方 FAQ／手動 UI 驗收；下一輪宜核對【退場時】與支付代價後的順序特例，不得把一例推成普遍時序規則。

### 本輪 commit、失敗原因及真實 GitHub Actions

1. Batch A `cab9d835c9ec5d0cbde7994b7901d703a3a36508`：共用本回合 true retirement count 和帶 controller/cardType/min 的嚴格 passive schema，2 組元件測試。兩套 CI success。
2. Batch B `00193498caa9e941de30a9b16740e4164c8e70b5`：strict `drawIfOwnFieldExists` onRetire opcode、事件隊列及正負例，首 CI **1 例失敗**是測試牌組漏放 `MST-1-001`（非引擎邏輯失敗）。修正 `c02d5701392d48b20ff8292d52844cf76cfcdddc` 合法配置 4 張真 MST001；Node22 完整及隔離測試 success，沒有刪除測試／鬆綁合法性。
3. Batch C `74fd59af3c8ebf7c093cd7f1730f6d8989c1109a`：正式加入完整 `MST-1-052`，JP PIN、實卡對局及獨立 manifest；首全量 CI 有 **11 例失敗**，均為舊 MST 37 張與 V2 249 張硬編碼斷言，**MST052 的新真卡測試通過**。
4. Batch D `667309127ab3c2ff77367673356ae6a5442d140d`：對照真實日誌，**只**同步 10 份獨立來源／覆蓋率計數驗收為 MST38、全 250，不刪除測試、不改 game engine 的判定或正規性。
5. Batch E：`667309127ab3c2ff77367673356ae6a5442d140d` 的 GitHub Actions Node.js **22.23.3**，`npm test` **1466/1466 通過，0 fail**；`node scripts/v2-integrated-match-matrix.mjs` **60/60 完成、0 fail**；`node scripts/v2-unported-report.mjs` 報 **700 張、250 V2 登錄、450 未移植、完整官方 FAQ 0**。[整合 #39705764230](https://github.com/will00t-debug/Ua/actions/runs/39705764230) SUCCESS，[SAO/MST isolated #39705769250](https://github.com/will00t-debug/Ua/actions/runs/39705769250) SUCCESS，獨立 24/24。

### 最新 source-registered 覆蓋率

| 作品 | V2 已登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 86 / 276 | 190 |
| TTG | 30 / 81 | 51 |
| SLG | 34 / 80 | 46 |
| SAO | 62 / 183 | 121 |
| MST | 38 / 80 | 42 |
| **合計** | **250 / 700** | **450** |

### 下一輪優先級、阻塞與守恆注意事項

- **BLC-1-024**：優先建立通用 Raid 頂層剝離、被 Raid 時/離場 replacement 的明確非退場事件路徑、二選一完整效果與當回合 DAMAGE2 授予；新增普通合法選項/非法 UID/物理卡守恆/不同玩家 AI 圖層，核對 Q549、Q550、Q551。不可只因 2 CHARACTER predicate 就登錄。
- **MST-1-053**：退場 FIELD 可選成本→抽牌已可部分沿用，但其**對方回合 COLOR Trigger 的角色/場域替換**尚缺，不能只實作半卡就正式登錄。
- **MST-1-074、076**：逐字核對多重條件、退場、選擇、Trigger，再設計能跨作品重用的 program composition；保留 unported。
- 特別查【退場時】事件與支付費用後原能力的結算優先級（現有 `retirementAfter` 流程對不同原文可能有差別），以及 Raid Q549 非退場、同時狀態移轉及隱藏資訊；任何修正都必須真實 FAQ 與針對性回歸支持。


## 2026-10-22｜第七輪：Raid 上層精確剝離、二選一真退場、動態 DAMAGE2、完整 BLC-1-024

**工作分支** `codex/v2-resume-20261021`，**Draft PR #75**。起始最新 HEAD `e89cebb7a319c2e1c4d00634a1015777567045dd`，最後**已通過程式 CI** 的 HEAD `c91e6491eee455021e84486624186876596f1c84`；本文件追加的 docs commit 是後續新 SHA，不能直接冒用前一 SHA 的成功證據。沒有合併 main、沒有 force push、沒有部署正式 Vercel；使用 GitHub 連接直接寫 commit，Node22 實測是 Actions 日誌而非本地執行。

### 共用引擎新功能及其邊界

1. `stripOppRaidTop`（可選擇最多 1）：僅選對手 FRONT 上擁有實際 `raidName`、可見面朝上的單一 `stack` 基底的 Raid 實體；既有 `effectQueue` 和合法目標 `chooseRaidTopStrip` 暫停／恢復。去掉 Raid 最上層送對手 `outside`，保留原面朝上基底在同一 FRONT slot，承接 Raid 的 REST/ACTIVE；top 的 `buffs` 不繼承。重建 `fieldEntryStamp`，整個過程**不是退場或登場**，不執行上下牌的 `onRetire`／`onPlay`，不推進 `turnRetireEvents`。核對官方 Q547–Q551（尤其 Q549/Q550/Q551）：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-024_p1 。對尚未審核的「Raid top 自身帶額外 under」幾何，**目前 fail-closed** 不選；不得宣稱所有 Raid 多層交互已全面驗收。
2. `retireOppFrontOneUnderBp`：公用 FRONT BP 上限（印刷 BLC024 是 3000）＋ optional true，沿用 `effect-retire-bp`、真正 `retire()`、保護離場決策及回合退場記錄。加入既有 `chooseOne` 的封閉式合法子效果白名單，玩家從 2 種印刷模式選**一種**，然後才選該模式「最多 1」張，非法 UID 不可選。Normal/Hard AI 只讀合法列表、場上公開 BP/Raid 狀態判斷分支；沒有作品或卡號專屬 reducer。
3. `passiveBonuses[].extraDamage` + `universalAttackDamage()`：通用 own-turn 條件式攻擊傷害；使用上一輪 `retireCountThisTurn` 正確計算**雙方本回合**角色退場次數。退場累計到 2 張後可**同時**給 BP+1000/DAMAGE(2)，不把 Raid 剝離算作退場。無阻擋攻擊的第二 LIFE 由 `additionalBattleDamage` 內部效果隊列處理：每次傷害單獨揭露／執行 LIFE Trigger，先處理前一個 Trigger 才繼續下一張；不改動被阻擋時的 IMPACT 類型判定，原能力封印依現有 `originalEffectsDisabled` 自動排除印刷被動。嚴格 schema 拒絕非法 `extraDamage`。這項原能力與 `onRetire` / `chooseOne` 共享效果隊列、沒有額外單作品分支。

### 正式完整登錄真卡

- **BLC-1-024《ユーハバッハ》**：日本官方 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-024_p1 ，黃6/AP1/BP4000/黃1/CHARACTER/星十字騎士團（repo 原始受審核來源字串）/RAID〈ユーハバッハ〉/RAID 生命 Trigger。己方回合中本回合共至少兩張 CHARACTER 真退場時 BP+1000、Damage(2)；登場選一種 (1) 最多 1 張敵 FRONT Raid top 剝離 (2) 最多 1 張敵 FRONT BP<=3000 真退場。完整來源 `dist/expansion-cards.mjs` 的原始 `CARDS` fingerprint 與 `BLEACH_V2_ADDON_PROFILES` 固定字面逐項核對。新增 `tests/v2-blc-024-official.test.mjs` 使用**全部真實登錄官方卡的合法 50 張牌組**，確實支付黃色能源 6/AP1/兩次 Raid／同名 base；驗證兩模式、真退場一次不觸發 Damage2、上層剝離不退場、第三己方回合實際 3AP 串接兩次 Raid＋兩名敵方角色真退場後 BP5000 / Damage2，一次未阻擋攻擊確實造成兩張不同 LIFE 的分別處理，AI normal/hard、UID/守恆與隱藏資訊不洩露。正式 source-pinned BLEACH contribution、独立 ID manifest 与卡號計數同步；**不是單純 component、也不是自動 `auto` 旗標**。
- 邊界認定：單卡完整印刷邏輯在指定真實場景落地、官方 Q547–Q551 實際對照；**並不等同**所有跨卡 FAQ 交互、Raid top 帶複雜 under 分層、實機 browser/mobile UI 的全面認證。嚴格 fullyAccepted/FAQ = **0**。

### 具體 commit、CI 及回歸處理

1. Batch A `7b8b0a30682ddcb57f5d8cfef0bcbc4f4350c5f6`：物理 Raid 剝離／非退休、未繼承 buff、REST 精確承接、合法不選、官方 Q547–Q551 元件測試；GitHub Node22 雙回歸 SUCCESS。
2. Batch B `c3ffd4ca89dbdd2bb4a9874f80e9a70199fcd079`：generic `retireOppFrontOneUnderBp`、`chooseOne` 實作與 AI。首 CI **1 個測試 fixture 失敗**：vanilla base 誤標 `dsl`，嚴格編譯如預期拒絕；改正 `976104a02cfe9699b54093ebe5f1c5b4c5e31929`，CI 雙成功，未調弱編譯器驗證。
3. Batch C `4ef5fd4fdc5a749c4ce9ce4b552d10916004fe12`：通用動態 DAMAGE2、逐張 LIFE queue、實際同回合兩退場和負測；Node22 **1474/1474**、五作品 60/60、isolated 24/24 SUCCESS；此時正式覆蓋 250/700（元件卡沒有算入）。
4. Batch D `207df17b17a79a393b2f7f583b086e9a738728b2`：正式登錄真 `BLC-1-024` 和真牌組測試。首次完整 CI **14 個失敗均為舊 86 BLEACH/71 新增/250 V2 硬性數量斷言**，不是該卡的真實邏輯失敗。後續 `1acbeb128e3abd03bf58551ca6abc2c2e78a2332`、`27d2b545ce239cf86eba8290bcbb460dbd127756` 只將兩批既有獨立驗收、對戰矩陣的計數修正為精確 87 BLEACH/72 新增/251 V2/449 未移植；不刪測試、不更動遊戲判定以硬通過。
5. Batch E `c91e6491eee455021e84486624186876596f1c84`：增添真實 3AP 第三回合、先後支付兩張官方 BLC024 Raid 真正退休兩張不同敵方角色、動態 BP／DAMAGE2 與無阻擋兩次 LIFE 實戰驗收。GitHub Actions **Node22.23.3** `npm test` **1478/1478 通過、0 失敗**；`node scripts/v2-integrated-match-matrix.mjs` **60/60 完成、0 失敗**；`node scripts/v2-unported-report.mjs` **總卡700／正式 V2登錄251／未移植449／全面 FAQ0**。整合 CI https://github.com/will00t-debug/Ua/actions/runs/39709687098 SUCCESS；SAO/MST 獨立 CI https://github.com/will00t-debug/Ua/actions/runs/39709693909 SUCCESS、isolated 24/24。沒有假稱本地跑過 Node 測試。

### 最後真實 registry 覆蓋率

| 作品 | V2 已登錄／母體 | 未移植 |
|---|---:|---:|
| BLEACH | 87/276 | 189 |
| TTG | 30/81 | 51 |
| SLG | 34/80 | 46 |
| SAO | 62/183 | 121 |
| MST | 38/80 | 42 |
| **合計** | **251/700** | **449** |

### 下輪優先：跨作品共用缺口

- 有額外 facedown `under` 或多層重複 Raid 時的官方剝離 Q547–Q551 組合情境需 source pin 及守恆擴充；當前明確 fail closed，不能擅自把所有幾何視為已支援。
- **MST-1-053**：官方對手回合 COLOR Trigger 的角色卡／FIELD 卡替換＋登場抽棄／FRONT optional retireOwnField→draw 完整資料驅動組合。必須全部印刷分支和生命 Trigger 完成後才登錄；目前 450→449 中**未包含 MST053**。
- 同回合多來源 onRetire 與 leave replacement、BP 歸零連鎖退場、傷害2 LIFE Trigger 中的第二效果延遲、AI 真實攻防策略、瀏覽器／手機視覺操作仍需更深入測試；不改 main、不更新正式站。


## 2026-10-22｜第八輪：官方 MST-1-053 全能力與跨作品 COLOR→FIELD 替代

- 分支 `codex/v2-resume-20261021`／Draft PR #75，起點 HEAD `09dba2b6dae92ebf767a02b588c53b79191a6054`，最後**已完整測試的程式 HEAD `3ede2260bd3997549b9e7670e7999f5ca64b3c10`**。沒有合併 main、沒有部署正式 Vercel、沒有 force push；GitHub 接線直接 commit，Node22 真實測試由 GitHub Actions 遠端 runner 提供，未假稱本機執行。
- **正式完整移植真卡**：UA54BT/MST-1-053「ロキシー」，綠1／AP1／BP2500／發生綠1／無特徵／CHARACTER／COLOR LIFE Trigger，全部按照 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-053 和 `dist/universal-v2/sources/mst-official-print.mjs` source PIN 核對印刷效果及 Trigger：
  - 對方回合中：將自己綠色 COLOR Trigger 記載的「キャラカード」依能力改成「フィールドカード」。共用 `colorTriggerFieldSubstitution:'green'` 僅讀自己實存場上角色（不含 hidden Raid under、手牌、場外），符合顏色與需要能源<=2／消費AP1 的己方手牌 FIELD，僅可 ACTIVE 登場於 ENERGY line，不扣 AP，完整執行其 onPlay；**仍保留原本合法 CHARACTER COLOR 選項**。只在對方回合可替代，不是任何回合或所有 COLOR 顏色無條件有效；live source 遭失原能力時按 `originalEffectsDisabled` 不提供新選項。沿用單一 `legalUniversalActions`／`dispatchUniversalAction`／AI／`assertUniversalMatch` 路徑；假造 UID 或位置不合法。
  - 登場時：原通用 `drawDiscardOne`，抽1後確實從自家手牌選1張場外。
  - FRONT MAIN：原通用 `retireOwnFieldThen` 放寬為明確 `optional:true`、pay `retireOwnFieldOne` 完成後執行 `after:[{op:'draw',count:1}]`，仍嚴格 one-use、需己方 ENERGY 真 FIELD、不可偽造或用 full-line removed 代替；選 skip 則沒有任何抽牌、能力該回合不能再使用。真 MST-1-075 FIELD 的 `onRetire` 抽1和 MAIN 成功後的抽1**各自結算**，所以可實際增加2張手牌。原 MST046 強制支付 FIELD +1000BP 完全保留。
- **元件與實卡 QA**：`tests/v2-optional-own-field-main-round8.test.mjs`、`tests/v2-color-field-substitution-round8.test.mjs` 僅使用合成卡測通用能力與嚴格拒絕；`tests/v2-mst-053-official-full.test.mjs` 用正式來源鎖定真 MST 卡，合法50張雙方牌組實測付 AP 登場、抽棄、真 FIELD cost/once、對方 COLOR LIFE 讓真 MST075 以 ACTIVE 登場到 ENERGY，續接 onPlay 抽棄、合法 AI 與隱藏對手手牌保護。**沒有把 QA 合成卡計入 registry**。獨立 `tests/fixtures/v2-integrated-id-manifest.mjs` 包含新 `MST-1-053`；`MST-1-051` 的 2026-10-01 起限1不變。
- **實際提交／回歸**：
  1. Batch A `0ed21ad18bd670f922b4530105fa12a14f2dc92c`（通用 optional FIELD MAIN）、`8d0218407bc0a874830efa3037de8d539c72cfdd`（只把舊「draw 不支援」負測換成依然不支援的 millTop，保留嚴格拒絕）。CI SUCCESS。
  2. Batch B `5967938dba668744eb6aacf96ff4b399ede4f4e1`（共用 COLOR 自己場上活角色修改為 FIELD），`e3d8b8151bde7f50f990131c26be7ee702803f42`（合法／非法／AI／真抽棄元件測試），CI SUCCESS。
  3. Batch C `2a4fdd8fffddeb920ce3573151f71cc9878573ef`（官方真 MST053 註冊與獨立 manifest）、`688a36377da9b3fefc6c592bcb422ca5170f48cb`（真卡完整實戰測試）。首 CI 效果測試皆通過；舊固定 MST38／全251 數量驗收失敗 15 項。
  4. Batch D `2c8ee7b46db072990026305b6dce3718b3a5f400`、`ed96fccb3c425943cdef0fce4fb60eb2a41dc817`、`6f77d2b20b8c9c2ee5caded11ed3973983cc5201`、`3ede2260bd3997549b9e7670e7999f5ca64b3c10`：只更新獨立來源、數量、整合矩陣的正確要求為 MST39／V2全252；最後剩 `tests/v2-sao-mst-registry-real-decks.test.mjs` 的單一老 expected=38 亦修正，未刪測試、未放寬遊戲合法性。
  5. **最終整合 CI** https://github.com/will00t-debug/Ua/actions/runs/39712544649 Node.js **22.23.3**，`npm test` **1487/1487 成功／0失敗**、五作品矩陣 **60/60／0失敗**、unported 報告總700／Pilot252／未移植448／官方全面認證0。**獨立 CI** https://github.com/will00t-debug/Ua/actions/runs/39712548045 SUCCESS：同一 1487/1487，另外 SAO/MST isolated **24/24**。
- 最終 registry：BLEACH **87/276**（未189）、TTG **30/81**（未51）、SLG **34/80**（未46）、SAO **62/183**（未121）、MST **39/80**（未41）；合計 **252/700**，未移植 **448**。官方完整 FAQ、瀏覽器 UI／手機、所有跨卡/多層 Raid 情境仍屬未全面驗收，**嚴格官方 fullyAccepted 為 0**。
- **下一輪候選**：逐字核對 MST074/076 的整卡多時機／FIELD 成本／COLOR 或 RAID 組合；多層 facedown under 的 Raid-top stripping；COLOR 中 FIELD 交換面對 full ENERGY replacement 時的既有 `removed` 非退場、同時場域 retirement/對手 turn life trigger 相依時序。採共用引擎、先正反例再移植，不以關鍵字或歷史快照充當完整源驗。


## 2026-10-22｜第九輪：完整官方 MST-1-074／MST-1-076，跨系列共用 TRUE RETIRE → OUTSIDE REST/RAID

- **基準** `b9e0c59f3335d81c6ffd2aff36138a7af5331cbc`，**最終完成程式且雙 CI 成功** `d64f8bba9b75ac6c4b45fb6101a03df7e8c6f32f`，分支 `codex/v2-resume-20261021`、Draft PR #75；僅以 GitHub 連線 commit，不合併 main、不部署正式站、不覆蓋其他工作分支。這筆交接文件 commit 自身形成更新 SHA，應獨立確認 CI 後才能宣稱該 docs HEAD GREEN。
- **官方來源**：
  - `MST-1-074`：`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-074`。綠色 FIELD，必要能源 2、AP1、產能1、GET Trigger；登場最多退場己方一張 CHARACTER，成功抽2；退場時**一定二選一**：(a) 可先棄己方手牌1張，確實棄掉後從己方 OUTSIDE 選最多1張「必要能源≤1／AP1／綠色／〈ロキシー〉」以 REST 登場；(b) 從己方 OUTSIDE 選最多1張〈迷宮の守護者 マナタイトヒュドラ〉返回手牌。
  - `MST-1-076`：`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-076`。綠色 FIELD，必要能源 3、AP1、產能2、SPECIAL Trigger（明確 `{op:'retireOppFront'}`，對敵方 FRONT 單張真退場）；退場時從己方 OUTSIDE 選最多1張綠色／無特徵／AP1 的角色，必要能源上限 1＋其他**實際** OUTSIDE FIELD 張數，能以 REST 直接登場，或合法 Raid 到己方真實基底（可繼續位於 ENERGY）。不把自身剛退場的 FIELD 算作『其他』；沒有偷扣 AP，沒有錯算真退場與離場替換。
- **可重用引擎**：
  1. `retireOwnCharacterOne` 完整 optional OWN FRONT/ENERGY 角色真退場成本，維持 `turnRetireEvents` 與 onRetire→after draw 隊列順序／合法 UID／保護離場；不得把 REMOVED 當 RETIRED。
  2. FIELD onRetire `chooseOne` 的兩種封閉 DSL 模式，`discardGate` 真實己方手牌成本→`deployOutsideRest` 真實場外角色 REST 登場（原有入場效果依隊列優先），或原 `recoverOutsideOne` 指定 name 回收。可選分支的支付跳過不是隱形 free effect。
  3. `deployOutsideTraitlessRestOrRaid` 共用其他 OUTSIDE FIELD 數量放大上限，僅允許符合正式顏色、AP、無特徵的己方場外實體；真實 `performRaid` 與合法目的地、front/energy/REST、AP 不消耗、在場身份與隱藏資訊守恆，不能用作品硬編碼。
  4. 元件測試：`tests/v2-own-character-retire-round9.test.mjs`、`tests/v2-retire-choice-outside-rest-round9.test.mjs`、`tests/v2-scaled-outside-traitless-round9.test.mjs`（查實際來源名稱）、兩真卡 50 張合法牌組的 `tests/v2-mst-074-official-full.test.mjs`／`tests/v2-mst-076-official-full.test.mjs`。涵蓋付費、跳過、合法 UID、真退場事件、依 OUTSIDE 其他 FIELD 數目增加能源上限、FREE REST RAID 到真實 Roxy 基底與 FRONT/ENERGY、牌張守恆與 AI 合法動作。
- **已提交批次**：A `0fc1bd9bd`／`02a585ebf`；B `f12d08c4a`／`8b8f86569`；C 官方 MST074 `439d13728`／`848b9259b`／`24aa0dbf5`；D 既有 40 MST、總 253 計數精確更新 `39a71a87c`、`9c0fb9687`、`59357547b`；E 可擴能源 REST/RAID `88e590feb`、`ac810f92b`、`e52122115`、`81a5925b4`、官方 MST076 `c3382e314`／`24bbf9aad`；F 回歸修復 `9ee898bfb`（MST076 SPECIAL 印刷目標明確 profile）、`7570464da`／`12931321f`／`d64f8bba9`（MST41／總254／未移植446 的全部舊版精確驗收；不刪測、不放寬合法性）。
- **回歸解析**：MST076 剛登錄時 `pack.mjs` 的 SPECIAL 強制驗證因原真卡缺乏 `triggerEffect`，引起跨作品 registry 全域 50 個連鎖失敗；`9ee898bfb` 增加來源鎖定的合法 SPECIAL 單一對敵方 FRONT 角色真退場，測試變為 **1503 total／1487 pass／16 fail**（餘皆舊 MST40 計數斷言）。三組只針對精確更新舊常數、獨立 MANIFEST／60-match gate 的修正後，完整 Node22 測試 **1503/1503／0 fail**。
- **實際最新程式 CI**：整合 https://github.com/will00t-debug/Ua/actions/runs/39718238077 **SUCCESS**，Node 22.23.3 `npm test` **1503/1503**，五作品矩陣 **60/60**，unported report 總700／Pilot254／未移植446／全面驗收0；獨立 https://github.com/will00t-debug/Ua/actions/runs/39718243686 **SUCCESS**（core-shared + isolated-port）。此為 GitHub Actions 實跑，不是本地 Terminal 跑過。
- **五作品正式 registry**：BLEACH 87/276（未189）、TTG 30/81（未51）、SLG 34/80（未46）、SAO 62/183（未121）、MST **41/80**（未39），合計 **254/700**，尚未登錄 **446**；全面官方 FAQ certified **0**（不宣稱瀏覽器／手機端 UI 或全部官方 FAQ 證據完成）。
- **下輪建議**：深層 Raid STACK + facedown UNDER 多層結構剝離（現階段對未審核複雜層 fail closed）；COLOR FIELD full ENERGY replacement 應進 REMOVED 而不推退場；多來源同步 FIELD onRetire／保護離場／兩張 LIFE Trigger；更廣泛的跨系列真實 50 張對戰與視覺操作驗收。保持只在自己的 branch，先查最新 HEAD/CI 和此交接再動作。

## 2026-10-22｜第十輪：跨作品共用能力整合與驗收強化

起點 `1f060e0467eee6740c8a0f34c0fd5bb969c6381e`，PR #75 仍為 Draft。
本輪五批已發布至 `codex/v2-resume-20261021`；沒有 main merge、production deployment 或 force push。
本地 git push 缺少憑證，改用已授權 GitHub connector 依序建立五筆 commit，
每筆遠端 Git tree SHA 均與本地已測試 tree 完全一致（commit metadata 不同，故 SHA 不同）。

### 程式與測試批次（以下為 GitHub SHA）

| 批次 | 程式/測試成果 | 遠端 commit |
|---|---|---|
| A | 正式 BLC-1-023，來源指紋、真 BLEACH vs MST 合法50張、兩模式/skip/非法UID/AP2/黃4/GET/AI/守恆 | `05bda2d7ff0b480dabcae958ecf68680cd39d298` |
| B | 共用 Raid 剝離阻止底板舊 buff 復活，明確拒絕未審核複雜 stack/under；ACTIVE/REST 與新 fieldEntryStamp | `5643394355d4703943c6fb7443d53cf177395041` |
| C | 真 BLEACH 攻擊→MST053 COLOR，滿 ENERGY 的 CHARACTER/FIELD 精確替換、REMOVED 不觸發 onRetire、ACTIVE/免費AP/隱藏手牌 | `d7925d71439d9fe3a976963253ebaf8e05247373` |
| D | 真 BLC024 DAMAGE2→MST053 COLOR→MST075 登場抽棄：修正第二 LIFE 搶先於登場效果的隊列錯誤 | `a2e063fcdc4b3f39b8a9c6b40aca3f7a3854b914` |
| E | 獨立 literal baseline+新增卡號 manifest，集中數量期待，報告與60場矩陣也檢查精確ID，負測拒絕漏卡/重複/同數量換卡 | `fb2bd3e1f6bf881545fadccccfc0e07c1483986e` |

最後程式 SHA：`fb2bd3e1f6bf881545fadccccfc0e07c1483986e`。
對應本地程式 SHA `da16c82d87deccfaa48df0677e1727c39a4124d1`，
相同 tree `561005bd6d6b2edf33e8f57d36e43b2e522a007f`。

### 官方來源及能力界線

- BLC023 日本官方： https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-023 。黃4/AP2/BP4000/黃1/星十字騎士団/GET；登場必選一種，各分支最多1張敵 FRONT（Raid頂層剝離，或BP<=2000真退場）。核對 Q542–546；未賦予 BLC024 的 Raid 或 Damage2。
- Q542–546：剝離保留底板，承接 ACTIVE/REST，不算退場或登場，不承接 Raid 受到的效果。Q49 https://www.unionarena-tcg.com/jp/faq/list.php?number=49 ：底板之前受的效果不應在 Raid 後繼續；本輪修正剝離時殘留 `base.buffs` 重新生效。
- Q53 https://www.unionarena-tcg.com/jp/faq/list.php?number=53 是一般不可對 Raid 再 Raid；特別印刷例外必須逐張核對，不據此全面開放多層。
- MST053 原文 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-053 與 Q22 https://www.unionarena-tcg.com/jp/faq/list.php?number=22 核對：敵回合綠 COLOR 可改 FIELD；滿線先指定一張移至 REMOVED 再進場。測試確認 MST075 的登場抽棄執行，但被替換同名 FIELD 不執行退場抽牌。
- 完全重用 `chooseOne`、`stripOppRaidTop`、`retireOppFrontOneUnderBp`、GET、COLOR、`commitDestination`、`effectQueue`、Normal/Hard AI 合法動作列舉。沒有新作品 reducer、沒有第二套觸發狀態系統。
- D 修正 `applyEffects` 將新觸發的登場工作插在暫停的 continuation 之前。新測試先實際支付兩次 BLC024 Raid、造成兩次真退場，才啟用 DAMAGE2；第一 LIFE 的 FIELD 登場 mandatory discard 未完成時，第二 LIFE UID 留在生命區且不公開。

### 實測與登錄數

- 本機只有 Node **24.19.0**；npm 安裝 Node22 的網路請求未完成，因此不宣稱本機 Node22 測試。
- 每批先跑針對性測試後提交：A 109/109；B 22/22；C 8/8；D 12/12（另含 C 的聯合測試14/14）；E 第一組111/111、第二組28/28。
- 本機完整 `npm test` **1521/1521，0 failed、0 skipped**；`node scripts/v2-integrated-match-matrix.mjs` **60/60，0 failures**；`node scripts/v2-unported-report.mjs` 成功。
- GitHub Node22 CI 的實際結果見下方追加驗收；不得拿本機Node24成功代替Node22。

| 作品 | V2正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 88/276 | 188 |
| TTG | 30/81 | 51 |
| SLG | 34/80 | 46 |
| SAO | 62/183 | 121 |
| MST | 41/80 | 39 |
| 合計 | 255/700 | 445 |

本輪只新增正式真卡 **BLC-1-023**；合成測試卡不計入。全面官方 FAQ 認證仍為0。

### 仍封閉與未完成驗收，下一輪優先

1. `strippableRaidTop` 僅開放已驗證的兩張面朝上角色結構。top 帶 under、base 帶 under、巢狀 stack、多 base、facedown base、特殊 Raid 底板均 fail-closed。這是明確收緊原本可能意外通過的幾何，不是宣稱多層剝離已完成。
2. Batch D 本輪完成 DAMAGE2 / COLOR / FIELD 登場的真跨作品時序修正與回歸；**沒有宣稱已新增涵蓋全部「同時多FIELD退場、退場再次退場、所有退場成本順序」的真卡案例**。舊 phase-order、退場成本、MST074/076 與全量測試通過，但不足以等同這些新情境全部已驗收。
3. 下一輪最值得優先：共用 onRetire 在既有 continuation 中的優先順序（特別 SPECIAL LIFE→退場→onRetire→第二 LIFE）、多個同時退場的玩家排序與連鎖成本。先找到官方優先級來源並建立跨作品真卡負測，再修改單一 effectQueue。
4. 本輪沒有瀏覽器／手機手動 UI 驗收；不能將 reducer/label 測試當作實機驗收。
5. 新卡只應手動更新獨立 manifest 卡號；期待總數由該獨立清單計算，不能從 registry 反推。`v2-unported-report` 和矩陣現會直接拒絕 registry 與 manifest 不一致。

### 第十輪 GitHub Node22 最終程式驗收

- 程式 HEAD `fb2bd3e1f6bf881545fadccccfc0e07c1483986e`。
- [整合 CI 39720372611](https://github.com/will00t-debug/Ua/actions/runs/39720372611) **SUCCESS**。實際 job `119632205434` 日誌：`tests 1521`、`pass 1521`、`fail 0`；矩陣 `60/60 finished (failures 0)`；unported report `700 / 255 / 445`。setup-node 明確指定 Node22。
- [SAO/MST 獨立 CI 39720376827](https://github.com/will00t-debug/Ua/actions/runs/39720376827) **SUCCESS**；`core-shared-regression` 和 `isolated-port-regression` 均成功。
- 本段為後續文件提交，產生的新 HEAD 不是上述程式 SHA；文件 HEAD 的 CI 必須另查，不借用程式 CI 成功。

## 2026-10-22｜第十一輪：同時退場順序、LIFE 連鎖與兩張 mill 退場真卡

接續時重新確認：`origin/codex/v2-resume-20261021` HEAD 為 `810e66959906fe18316bf7c49ab486ff1b93effc`（第十輪交接文件）。其前一個程式 SHA `fb2bd3e1f6bf881545fadccccfc0e07c1483986e` 的 Node 22 CI 仍是上一輪已記錄的成功，不借用到本輪。PR #75 當時為 Draft、可合併，CI 全綠。本輪工作分支 `cursor/v2-multi-retire-life-6ff5` 從該 HEAD 建立，PR 合併目標是 `codex/v2-resume-20261021`，不是 main。沒有改 main、沒有部署正式站、沒有 force push。

本輪驗收使用本機 Node **v22.23.4**（`node -v`），時間 2026-10-22 13:34（台北時間）。

### 共用引擎（沒有另寫第二套觸發系統）

1. 同時真退場先完成實體離場（含既有 leave-replacement），再關閉 batch。同一控制者的多個 `onRetire` 由該玩家排序；回合玩家的觸發全部先於非回合玩家。單張卡維持印刷順序，不另開選項。
2. 退場效果再次造成的真退場，其 `onRetire` 插到剩餘隊列之前，因此先於其他同時觸發，也先於造成此次退場的後續動作（例如事件的後續抽牌）。同一張實體卡在同一個 batch 內不會重複排隊。
3. Q74：阻擋勝方的 Impact 生命確認排在阻擋者 `onRetire` 之後。沒有退場觸發時仍立即傷害，與舊行為一致。
4. 單獨的 `onRetire` 會插進暫停中的 continuation。既有 `additionalBattleDamage` 與一張一張 LIFE 的 DAMAGE2 流程沒有重寫。Raid 頂層剝離與滿線 REMOVED 仍不發 `onRetire`、不記真退場。
5. `onRetire` 允許清單補上既有 op `retireOppFrontOneUnderBp`，讓退場可以再退場。`millTop`、`draw` 原本就可用，所以沒有為了新卡再加引擎。Batch C 复查後沒有另開 DSL：能量不足或條件不完整的卡沒有登錄。

官方 Q73（DAMAGE2 同時公開、再由玩家排 Trigger）與本程式「一張 LIFE 結完才下一張」仍然不一致。本輪依指示保留既有時序，不把它改成同時公開。

### 批次 SHA

| 批次 | 內容 | commit |
|---|---|---|
| A | 同時退場排序、巢狀退場、Q74 Impact 時序；合成卡測試與舊 SLG 同時退場測試改為玩家排序 | `308040b80fbf98fccb7ac105af5ab17dc43b9760` |
| B | 真卡 MST-1-076 SPECIAL → BLC-2-040 退場抽 1 → 第二張 LIFE；無 onRetire 的角色仍正好前進一張。LIFE 離區不發 076 自己的退場時 | `b774f9bebb13734e996fbec0805286e08c67e33c` |
| C | 不擴充引擎。既有 `millTop`／`draw`／`retireOppFrontOneUnderBp` 已夠用 | 無獨立 commit |
| D | 正式登錄 BLC-1-051、BLC-2-042 | `10b17feb421bb9b915e601a80037411e1a90c2ad` |

### 新增正式卡

- **UA08BT/BLC-1-051** 朽木 ルキア。官方頁 2026-10-22 核對：紫0、AP1、角色、BP1500、特徵「護廷十三隊」、發生紫1、退場時將自己牌庫頂 2 張置於場外、DRAW Trigger。Q563：必須執行；牌庫只剩 1 張時仍送出那 1 張。
- **EX07BT/BLC-2-042** ルピ・アンテノール。官方頁同一天核對：青0、AP1、角色、BP1500、特徵頁面為單一字串「破面／涅骸部隊」（不拆斜線）、發生青1、同一句退場時與 DRAW。該頁沒有獨立 FAQ，不把 Q563 說成這張卡的官方問答。

兩張都只用既有 `{op:'millTop',count:2}`。登場、DRAW Trigger、滿能源線 REMOVED 都不磨牌。合成 `Q*`／`R*`／`I*` 測試卡沒有進 registry。

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 90/276 | 186 |
| TTG | 30/81 | 51 |
| SLG | 34/80 | 46 |
| SAO | 62/183 | 121 |
| MST | 41/80 | 39 |
| 合計 | 257/700 | 443 |

嚴格全面官方 FAQ 驗收仍為 0。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1533 tests、1533 pass、0 fail、0 skipped。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-unported-report.mjs`：700／Pilot 257／尚未移植 443／嚴格全面驗收 0，且 manifest 與 registry 一致。

GitHub CI：Draft PR https://github.com/will00t-debug/Ua/pull/77 合併目標是 `codex/v2-resume-20261021`。建立後唯一檢查是 Gitar pending；`gh run list --branch cursor/v2-multi-retire-life-6ff5` 沒有 Actions run。原因是 `.github/workflows/v2-resume.yml` 只在 push 到 `codex/v2-resume-20261021` 時跑 Node 22 的 `npm test`、矩陣與未移植報告，PR 進該分支不會觸發。本輪沒有把 commit 推上那條共用分支，避免改寫 PR #75 的 HEAD。因此不能宣稱本輪 GitHub Node 22 CI 已通過，也不能借用 `fb2bd3e`。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。不要為了對齊 Q73 而重寫已修好的 DAMAGE2。
- 未審核的 Raid 幾何（top/base 的 under、巢狀 stack、多 base、facedown base）仍 fail closed。
- 雙方同時各有退場觸發時，目前規則是回合玩家全部先結，再換另一方；這輪的真卡案例是單方同時退場加上巢狀退場，不是雙方各多張的官方問答全集。
- 沒有瀏覽器或手機手動操作驗收。
- 下一輪仍優先「現有 DSL 能完整表達」的真卡。候選：無條件 Damage 2／Impact 1（例如 BLC-1-074、BLC-1-009）要先確認是否只需資料、不能為了單卡加計算器；登場讓對手棄 1 張（BLC-1-054）若要做，必須是跨作品的棄牌目標 op，而不是 BLEACH 專用判斷。

## 2026-10-22｜第十二輪：印刷 Impact 1、直接 Damage 2、登場對手棄 1

接續第十一輪已推送的 `9f818d8f89d10d08a46d112ff533780f4faf761a`。工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`，不是 main。沒有改 main、沒有部署、沒有 force push，也沒有把 commit 推上共用整合分支。

本輪驗收使用本機 Node **v22.23.4**，時間 2026-10-22 13:49（台北時間）。第一次完整 `npm test` 是 1549 則、1 失敗：`BLEACH_CORE_GAP_SCENARIOS` 仍把已有官方情境的 BLC-1-009、BLC-1-074 當成不能玩。已從該 fail-closed 清單移除，清單剩下 BLC-2-007 與 BLC-2-063。沒有刪測試、沒有放寬合法性。

### 共用引擎

1. `printedImpact` 只能是 1，代表無條件【インパクト（1）】。`impactOnBattleWin` 在原效果未被關閉時先回傳它，再看裏向底卡的條件 Impact。不能和 `conditionalUnderFaceDown` 疊加。原效果關閉時 Impact 為 0。阻擋者已有的 `impactNull` 仍會讓大於 0 的 Impact 變成 0。戰鬥勝利才造成那 1 點生命；沒有阻擋時也是 1 點，不會變成 2。
2. `printedAttackDamage` 只能是 2，代表【ダメージ（2）】。直接攻擊的基礎生命傷害從 1 改成 2，既有被動 `extraDamage` 仍往上加。被阻擋時這 2 點生命不發生。多張生命仍走既有 `additionalBattleDamage`，一張結完才下一張。沒有為了對齊 Q73 而重寫 DAMAGE2。原效果關閉時攻擊傷害回到 1。
3. `discardOppHand` 的 `count` 只能是 1，而且只能掛在 `onPlay`（角色或事件）。引擎把 `pending` 設成 `effect-discard`，玩家是對手（`1-owner`），沿用既有手牌送場外與 `markOwnEffectZoneMove`。手牌是空的就不開 pending、也不跳過其他效果。控制者不能代選。公開視圖不露出對手手牌。Normal／Hard AI 只能選合法的 `chooseDiscard`。`turnEffectZoneMoves` 只記實際棄牌的那一方。

非角色、Impact 不是 1、Damage 不是 2、棄牌不是 1、或棄牌不在登場時，pack 驗證直接拒絕。

### 批次 SHA

| 批次 | 內容 | commit |
|---|---|---|
| A | 印刷 Impact 1 與直接 Damage 2；合成卡正負測 | `d4113aa4550f325dfb67db517bd33e7ed4b827e6` |
| B | 正式登錄 BLC-1-009、BLC-1-074 | `ca89e91207a216fc3d94ed25bc3b65d2204a6af5` |
| C | 登場時讓對手棄正好 1 張手牌；合成卡正負測 | `58e070d90898ffc29f3e1482656fe3fdb7845770` |
| D | 正式登錄 BLC-1-054 | `109a9ad0af8fd80138a63ae64f493ec1c74fdf85` |
| 回歸 | 核心缺口清單改為只留 BLC-2-007、BLC-2-063，並鎖定 009／074 已登錄 | `6b8718785332fe89dc03ab71e45a360c93d17bf2` |

### 新增正式卡

官方頁皆於 2026-10-22 核對。發生能源讀圖示 alt，不讀檔名數字。三張該頁都沒有獨立 FAQ。

- **UA08BT/BLC-1-009** ドリスコール・ベルチ。黃 2、AP1、角色、BP3000、特徵頁「星十字騎士団」（目錄既有同義 token「星十字騎士團」）、發生黃 1、【インパクト（1）】、括號是攻擊並贏得戰鬥時對對手 1 傷害、無 Trigger。
- **UA08BT/BLC-1-074** 京楽 春水。綠 3、AP1、角色、BP2500、護廷十三隊、發生是兩個綠（圖檔 `green3` 是 sprite 索引）、【ダメージ（2）】、括號是直接攻擊傷害改為 2、DRAW。
- **UA08BT/BLC-1-054** 涅 マユリ。紫 3、AP1、角色、BP3000、護廷十三隊、發生紫 1、登場時「相手は自身の手札を1枚場外に置く」、無 Trigger。跨作品測試對手是 MST；MST-1-051 的 `maxCopies` 仍是 1，牌組組裝有排除，沒有放寬張數上限。

條件式 Impact／Damage（例如 BLC-1-011、BLC-1-024 的被動加傷、帶額外句子的其他作品卡）沒有掛上這兩個無條件欄位。本地日文目錄裡沒有另一張「整句只有對手棄 1 張」的完整卡，所以只加了這個共用 op 和 BLC-1-054。

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 93/276 | 183 |
| TTG | 30/81 | 51 |
| SLG | 34/80 | 46 |
| SAO | 62/183 | 121 |
| MST | 41/80 | 39 |
| 合計 | 260/700 | 440 |

嚴格全面官方 FAQ 驗收仍為 0。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1550 tests、1550 pass、0 fail、0 skipped。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-unported-report.mjs`：700／Pilot 260／尚未移植 440／嚴格全面驗收 0，且 manifest 與 registry 一致。

GitHub CI：`.github/workflows/v2-resume.yml` 仍只在 push 到 `codex/v2-resume-20261021` 時跑 Node 22 的 `npm test`、矩陣與未移植報告。本輪沒有推上那條共用分支。推送 `4165574a73e2834f86a5e69b1274c8b478f3414d` 之後，`gh run list --branch cursor/v2-multi-retire-life-6ff5` 沒有 Actions run；PR #77 的檢查只有 Gitar pending。因此不能宣稱本輪 GitHub Node 22 CI 已通過，也不能借用 `fb2bd3e` 或第十一輪的本地數字。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。
- 未審核的 Raid 幾何仍 fail closed。
- 印刷 Impact 不與裏向底卡 Impact 疊加；Impact 以外的數值、Damage 以外的 2，驗證器拒絕。
- `discardOppHand` 固定 1 張且只在登場時。`onRetire` 白名單仍是 `draw`、`millTop`、`drawIfOwnFieldExists`、`chooseOne`、`deployOutsideTraitlessRestOrRaid`、`retireOppFrontOneUnderBp`，所以 BLC-2-010 這種退場時可選 REST 還不能當純資料卡。
- 核心缺口清單剩下 BLC-2-007（敵方前線 BP≥1000 再 −500；現有 `enemyFrontAllBpDown` 沒有 `minBp`）與 BLC-2-063（每張實體卡本回合第一次攻擊後轉 ACTIVE）。
- 沒有瀏覽器或手機手動操作驗收。全面 FAQ 認證仍為 0。
- 下一輪若走現有 DSL：先對官方日文重核「整句就是抽 2 再棄 1」的事件（目錄摘要裡的 BLC-1-109），確認沒有額外句子後才用既有 `drawDiscard`。不要把條件式 Impact／Damage 登錄成 `printedImpact`／`printedAttackDamage`。若要做 BLC-2-007 或 BLC-2-063，必須先加可重用的共用規則與正負測，不能只翻支援旗標。

## 第十三輪（2026-10-22）

接續第十二輪已推送的 `35df0defd37d503270f4852e02df657047cfe51b`。工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`，不是 main。沒有改 main、沒有部署、沒有 force push，也沒有把 commit 推上共用整合分支。第十一、十二輪的多重退場、LIFE 連鎖、Impact 1、Damage 2、對手棄牌，以及 BLC-1-051、BLC-2-042、BLC-1-009、BLC-1-074、BLC-1-054 都沒有重做。

本輪驗收使用本機 Node **v22.23.4**。時間 2026-10-22 14:28（台北時間）完成矩陣與未移植報告。完整 `npm test` 在修正 SAO／MST 舊的硬編碼張數後是 1570 則、1570 通過。沒有刪測試、沒有放寬合法性。

### Batch A：開發 PR 的 GitHub Actions

`.github/workflows/v2-resume.yml` 本來只在 push 到 `codex/v2-resume-20261021` 時跑。現在另外接受：

- push 到 `cursor/**`（這個 workflow 不在 main 上；push 是 workflow 還沒進預設分支時也能跑的事件）
- `pull_request` 目標為 `codex/v2-resume-20261021`（開啟、同步、重開都會再跑；checkout 的是 merge ref）

權限只有 `contents: read`。沒有 `pull_request_target`，沒有 repository secrets。同一 SHA 的 push 與 pull_request 會共用 concurrency group，後到的會取消先到的，所以驗收要看最後留下的那一個 run，不能把被取消的 push run 當成失敗測試。步驟是 Node 22 `npm test`、五作品 60 場矩陣、`scripts/v2-assert-independent-manifest.mjs`、未移植報告。

`99a76a07e515bc11481917e4d5eb7013e2d1db9a` 的 pull_request run `39731138495` 後來也成功，但那不是本輪最終 SHA。最終交接 commit `5d37287bc6f10b553ea3f6d678252f6c476d481f` 的驗收是 pull_request run [`39734484979`](https://github.com/will00t-debug/Ua/actions/runs/39734484979)。同一 SHA 的 push run `39734481119` 被 concurrency 在 3 秒內取消，那不是測試失敗。留下的 run 於 2026-10-22 14:31（台北時間）開始、14:32 結束，runner 是 Node v22.23.3，conclusion 是 success。Job `regression` 的日誌是：`npm test` 1570 tests、1570 pass、0 fail、0 skipped；矩陣 `60/60 finished (failures 0)`；獨立 manifest `bleach 96, gurren-lagann 30, solo-leveling 34, sword-art-online 66, mushoku-tensei 42; total 268`；未移植報告 `總卡 700／Pilot 268／尚未移植 432／嚴格全面驗收 0`。這個結論只屬於 `5d37287`。若其後再推文件修訂，那個新 SHA 要另看自己的 run。

### Batch B：既有 DSL 的跨作品卡

官方頁都在 2026-10-22 用 iframe HTML 核對。發生能源讀圖示 alt。這些頁面沒有獨立 FAQ。

- **UA15BT/SAO-1-009** リズベット。黃 3、發生是兩個黃（圖檔 `yellow3` 是 sprite 索引，本地 `gen` 從 3 改為 2）。登場時看牌頂 3 張，特徵「女神」最多 1 張入手，其餘任意順序放牌底，入手後棄 1。DRAW。
- **UA15BT/SAO-1-040** キリト。青 1、發生青。同樣的牌頂 3 張，特徵「アインクラッド」。無 Trigger。
- **UA15BT/SAO-1-077** ユイ。綠 1、發生綠。牌頂 3 張裡同時是綠色且特徵 ALO 的最多 1 張。DRAW。
- **EX08BT/SAO-2-023** リーファ。青 1、發生青。牌頂 3 張，特徵 ALO。無 Trigger。
- **UA54BT/MST-1-043** ギース。必要能源 0、發生綠。牌頂 5 張裡同時是綠色且為場地卡的最多 1 張。無 Trigger。
- **UA08ST/BLC-1-109** 空座町の死神代行。日文是「カードを2枚引き、自分の手札を1枚場外に置く。」紫 1、事件、無發生能源、無特徵。DRAW 的括號是「カードを1枚引く。」中文目錄「抽 2 張，再棄 1 張。」只當指紋。用既有 `drawDiscard`，`count:2`、`discardCount:1`。牌庫空仍要棄手上剩下的牌；抽完後手牌也是空的則不開 pending。不能跳過。

沒有登錄的接近卡：SAO-1-008、SAO-1-045、SAO-1-093、SAO-2-050 的起動能源句不是「只在能源線」，既有 `restSelfGainEnergyRetireEndMain` 不能套。SAO-2-007、SAO-2-055 還有卡名代用，不能只登錄抽棄。條件式 Impact／Damage 沒有掛上無條件欄位。

### Batch C：共用 BP 範圍

`enemyFrontAllBpDown` 增加可選的 `minBp`／`maxBp`，含邊界。目標集合在效果結算當下用當時 BP 抓一次，之後的減益不會把已經入選的卡剔掉，也不會把後來才登場或剛掉出範圍的卡補進來。沒有上下限時行為與舊模板相同。新模板 `enemyFrontBpDownInRange` 至少要有一側是數字。這不是 BLEACH 專用判定。

**EX07BT/BLC-2-007** キャンディス・キャットニップ。黃 3、AP1、BP2500、發生兩個黃、登場時「BP1000以上の相手のフロントLのキャラ全ては、このターン中、BP-500。」ACTIVE 是既有的選 1 張己方角色轉 ACTIVE 並本回合 BP+3000。該頁沒有 FAQ。特徵沿用目錄裡的一整條「星十字騎士團／邦比愛塔親衛隊」，沒有拆斜線。官方頁的日文特徵是「星十字騎士団／バンビーズ」。

### Batch D：每張實體卡的第一次攻擊

官方關鍵字【2回アタック】的括號是「このキャラがこのターン初めてアタックした時、アクティブにする」。Q79（2023-03-17）：指定攻擊角色並 REST 之後才轉 ACTIVE，而且發生在戰鬥之前。`attacksThisTurn` 仍是整回合計數，不用來判斷這張卡。新的 `attacksByUid` 按實體 UID 累計，下一個回合開始時清空。`readyOnAttackCount` 目前只接受 1。原效果被封印時不轉 ACTIVE。`attemptFieldActive` 仍會吃掉「次の1回アクティブにならない」。第二下攻擊不再轉 ACTIVE，所以沒有第三下。AI 只能選當時的合法行動。

Raid 的新頂牌是另一個 UID，次數從 0 開始，不繼承底板。沒有找到「同一張實體卡離場再登場後次數是否歸零」的專用 FAQ；依印刷的「このキャラがこのターン」保留同一個 UID 的次數，不在再登場時清掉。這個解釋要標成印刷讀法，不是已核對的再登場 FAQ。

**EX07BT/BLC-2-063** 京楽 春水。綠 4、AP1、BP2000、護廷十三隊、發生兩個綠、無 Trigger。一般登場是 REST，所以第一次合法攻擊是下一回合刷新之後，不是登場的那一回合。該頁沒有卡牌 FAQ。Q78 的 Impact 組合不是這張卡的印刷內容，沒有加進去。

核心缺口清單在 007 與 063 都有官方情境測試後清空。

### 批次 SHA

| 批次 | 內容 | commit |
|---|---|---|
| A | `cursor/**` push 與整合分支 PR 的 Node 22 CI | `99a76a07e515bc11481917e4d5eb7013e2d1db9a` |
| B | SAO／MST 牌頂篩選；SAO-1-009 發生能源改為 2 | `ddcef2c406526ca516ca62a7dad2f6f817b40682` |
| B | BLC-1-109 抽 2 棄 1 | `e1f8de9e7cfa59330554bc7edd7453dfa728a91e` |
| C | 共用 BP 範圍與 BLC-2-007 | `44d8dcb49a287ad21a08a6ce9804da134802e069` |
| D | 每張實體卡第一次攻擊後 ACTIVE，與 BLC-2-063 | `b3f7db5908bf64f78970905d85467e37824d8aa7` |
| 回歸 | SAO 66、MST 42 改走獨立 manifest，023／043 移出未完成清單 | `14e659769a636a85796032dd47ee25550534a80f` |

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 96/276 | 180 |
| TTG | 30/81 | 51 |
| SLG | 34/80 | 46 |
| SAO | 66/183 | 117 |
| MST | 42/80 | 38 |
| 合計 | 268/700 | 432 |

嚴格全面官方 FAQ 驗收仍為 0。合成測試卡沒有計入。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1570 tests、1570 pass、0 fail、0 skipped。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-unported-report.mjs`：700／Pilot 268／尚未移植 432／嚴格全面驗收 0。獨立 manifest 與 registry 一致（bleach 96、gurren-lagann 30、solo-leveling 34、sword-art-online 66、mushoku-tensei 42）。
- GitHub Actions pull_request run `39734484979`（HEAD `5d37287`、Node v22.23.3、2026-10-22 14:32 台北時間結束）：同一組數字，conclusion success。push run `39734481119` 被 concurrency 取消。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。DAMAGE2 沒有重寫。
- 未審核的 Raid 幾何仍 fail closed。2 回アタック的 Raid 測試只覆蓋「新頂牌是另一個 UID」。
- BLC-2-063 的再登場次數沒有專用 FAQ。目前保留同一個 UID 在該回合的攻擊次數。
- `onRetire` 白名單仍沒有 REST，所以 BLC-2-010 還不能當純資料卡。
- 【2回ブロック】（例如 SAO-1-038、SAO-1-072）不是這次的攻擊計數。Q80 的時機要另外做。
- 單張「BP 以上的對手角色 1 張」不是全體 BP 範圍。SAO-2-052、SAO-2-043 還沒有對應的單目標下限。
- 卡名代用加抽棄（SAO-2-007、SAO-2-055）不能只登錄抽棄。SAO-1-008、SAO-1-045、SAO-1-093、SAO-2-050 不能套用「只在能源線」的起動。
- BLC-2-047 的目錄句除了抽 2 還有另一句，不能當成純抽牌。
- 沒有瀏覽器或手機手動操作驗收。全面 FAQ 認證仍為 0。
- 下一輪可先核對、但還不能直接登錄的方向：BLC-2-010 的退場 REST；SAO-1-038／SAO-1-072 的第一次阻擋後 ACTIVE；把單目標 BP 下限做成和這次全體範圍同一套條件。每張仍要先對官方日文與 FAQ，不能靠目錄摘要。

## 第十四輪（2026-10-22）

接續第十三輪已由 GitHub Actions 驗過的 `e57d8d97bcee16c95888caa66d1f9a5725acd500`（pull_request run `39734726291`）。工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`。沒有改 main、沒有部署、沒有 force push。BP 範圍、第一次攻擊後 ACTIVE、Impact 1、Damage 2、LIFE 連鎖，以及當時已登錄的卡都沒有重做。

本輪本地驗收使用 Node **v22.23.4**。時間 2026-10-22 15:19（台北時間）完成矩陣與未移植報告。`npm test` 是 1601 則、1601 通過。沒有刪測試、沒有放寬合法性。

### Batch A：退場時 REST

`restOppFrontUnderBp` 原本就能選至多一張敵方 FRONT、BP 在上限以內的角色並轉 REST。這次只把 `onRetire` 放進時機白名單，沒有另寫一套 REST 判定。Q83：「1枚まで」可以選 0。Q91：已經 REST 的角色仍可被選，結果維持 REST。

只有真正退場會排隊。Raid 剝離頂牌、回手、REMOVED 都不會。`protectedLeave` 消耗裏向底卡時不退場。無合法目標時效果正常結束，不開空選擇。非法 UID 不在合法行動裡。

**EX07BT/BLC-2-010** ミニーニャ・マカロン。黃、必要能源 0、AP1、BP2000、發生黃。印刷句是「BP2000以下の相手のフロントLのキャラを1枚まで選び、レストにする。」無 Trigger。該頁沒有獨立 FAQ。特徵沿用目錄的一整條，沒有拆斜線。

### Batch B：第一次阻擋後 ACTIVE

`blocksByUid` 跟 `attacksByUid` 分開。`readyOnBlockCount` 目前只接受 1。Q79／Q80（2023-03-17）：指定阻擋者、REST，然後在戰鬥之前 ACTIVE。第一次阻擋即使輸掉，ACTIVE 也已經發生。第三下不再轉 ACTIVE。原效果被封印時不轉。`skipNextActive` 與 `cannotActive` 仍會讓它維持 REST。下一個回合開始時清空。Raid 頂牌是另一個 UID，次數從 0 開始。沒有找到「同一張實體卡離場再登場後，2回ブロック次數是否歸零」的專用 FAQ；依印刷「このキャラがこのターン」保留同一個 UID 的次數。這是印刷讀法，不是已核對的再登場 FAQ。Normal／Hard AI 只從當時的合法阻擋列表選。Q68 的狙い撃ち不是阻擋；引擎沒有這個動作，沒有另做。

- **UA15BT/SAO-1-038** エギル。青 1、BP2500、アインクラッド、發生青、無 Trigger。只有【2回ブロック】。
- **UA15BT/SAO-1-072** クライン。綠 3、BP3500、ALO、發生綠、DRAW。同一句，DRAW 仍抽 1。

兩張官方頁都沒有卡牌 FAQ。

### Batch C：單目標 BP 範圍

`enemyBpDown` 增加可選的含邊界 `minBp`／`maxBp`，以及 `zone`。預設 `front` 只看敵方 FRONT。`field` 只看敵方 FRONT 或 ENERGY 上的角色，不看場域卡。目標在 pending 打開時抓一次；結算時對同一個 UID 減 BP，減到 0 以下就從它所在的那一列退場，不會用減完後的 BP 重新篩選。

`frontOnceProgram` 是角色、只在 FRONT、每回合一次。後續只能是一發 `enemyBpDown`，或一層不能拒絕的 `discardGate` 再接那一發。Q84：「1枚選び」是必選。Q770：【ターン1】按實體卡。封印後看不到起動。

- **EX08BT/SAO-2-052** ミト。紫 1、BP1500、プログレッシブ、發生紫、無 Trigger。選 1 張 BP1500 以上的敵方 FRONT，本回合 BP-1000。
- **EX08BT/SAO-2-043** アルゴ。紫 2、BP3000、發生紫、DRAW。先支付「手札を1枚場外に置く」，目標改為敵方場上角色（FRONT 或 ENERGY）。沒有手牌就不能起動。DRAW 另外抽 1。

### Batch D：正式名稱別名

`nameAliases` 不改 `cardId`，也不改印刷卡名。Q87（2023-03-17）：別名在手牌、牌庫、場外、場上、REMOVED 以及其他區域都成立。Q1946：元々のカード名仍是卡面頂端的名字，每回合一次的卡名鍵繼續用這個名字。Q2077：別名可以滿足場上或場外的指定卡名。Q50／Q55：Raid 埋在下面的那層不是場上的那張卡，所以埋層的別名不算；埋層的印刷本名仍沿用既有的牌堆掃描，沒有改掉。封印只在這張卡是場上可見實體時拿掉別名。場外的 `originalEffectsDisabled` 不成立，所以手牌、牌庫、場外、REMOVED 仍保留別名。另一個作品裡字面相同的名字仍是另一張卡，身份看 UID 前綴與 `cardId`。LIFE 被 Q87 的「全て」涵蓋，但目前沒有依卡名搜 LIFE 的效果，沒有另做。牌庫搜尋與場外回收不會列出 LIFE 或 REMOVED。

- **EX08BT/SAO-2-007** ユージオ・シンセシス・サーティツー。也視為〈ユージオ〉。登場時抽 1 棄 1。DRAW。
- **EX08BT/SAO-2-055** 結城 明日奈。也視為〈アスナ〉。同一句登場抽棄。DRAW。

### Batch E：零引擎修改

這 7 張沒有再改 `engine.mjs`、`pack.mjs`、`field-conditions.mjs`、`ability-templates.mjs`。A 到 D 是規則擴充，不計入這個數字。TTG 與 MST 剩下的短卡都還有額外句子，這輪沒有半張能只靠既有 DSL 完整移植，所以零引擎張數是 7，不是只擴充 BLEACH。

- **UA15BT/SAO-1-010** 也視為〈アリス〉。無其他角色能力。GET 把公開的那張加入手牌。
- **UA15BT/SAO-1-011** 也視為〈アリス〉，加上【ステップ】。無 Trigger。封印後不能 STEP，別名也不算。
- **EX08BT/SAO-2-003** キリト＆ユージオ。也視為〈キリト〉與〈ユージオ〉。Q1195（2024-11-08）：場上這一張同時滿足兩個名字。發生能源圖示 alt 是「黃黃」，`gen` 從 3 改為 2，與 SAO-1-009 同一讀法。DRAW。
- **EX08BT/SAO-2-051** 也視為〈ミト〉。GET。
- **UA51BT/SLG-1-023** 水篠 潤一郎。既有 2回ブロック，ACTIVE 是通用的己方角色 ACTIVE 並 BP+3000。
- **UA51BT/SLG-1-056** 向坂 雫。既有 Impact 1。登錄特徵是官方的單一代幣「第四次架南島レイド」。目錄的「第四次架南島Raid」沒有拿來註冊。
- **UA51BT/SLG-1-069** ケン。己方回合且手牌至少 5 張時 BP+1500。登錄特徵是單一代币「DFN／第四次架南島レイド」，沒有拆斜線。

沒有登錄：SAO-1-012 的 COLOR 是選 1 張敵方 FRONT 轉 REST，並使它下一次不能 ACTIVE，不是現有的 COLOR 模式。SAO-2-004 除了別名，還要在其他整合騎士至少 4 張時把自己轉 ACTIVE。SAO-1-008、SAO-1-045、SAO-1-093、SAO-2-050 的起動不是「只在能源線」。

### 批次 SHA

| 批次 | 內容 | commit |
|---|---|---|
| A | `onRetire` 可重用 REST；BLC-2-010 | `3491223d23bee779af2306fc686ce54654a66435` |
| B | 第一次阻擋後 ACTIVE；SAO-1-038、SAO-1-072 | `bb4831ab87d507ad816d80470ed92353b05b35cb` |
| C | 單目標 BP 範圍；SAO-2-052、SAO-2-043 | `f4f739edeca91be79ed646625dd892b24e1f4b9f` |
| D | 印刷卡名別名；SAO-2-007、SAO-2-055 | `52e24211c9dbc9a19cf68b9b8d45995bb8629b9e` |
| E | 零引擎 7 張：SAO-1-010、SAO-1-011、SAO-2-003、SAO-2-051、SLG-1-023、SLG-1-056、SLG-1-069 | `9180c86a4d2bb95779c9b8a2f0562717b8209b44` |

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 97/276 | 179 |
| TTG | 30/81 | 51 |
| SLG | 37/80 | 43 |
| SAO | 76/183 | 107 |
| MST | 42/80 | 38 |
| 合計 | 282/700 | 418 |

本輪正式新增 14 張。零引擎完整移植是其中 7 張。嚴格全面官方 FAQ 驗收仍為 0。合成測試卡沒有計入。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1601 tests、1601 pass、0 fail、0 skipped。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-assert-independent-manifest.mjs`：bleach 97、gurren-lagann 30、solo-leveling 37、sword-art-online 76、mushoku-tensei 42；total 282。
- `node scripts/v2-unported-report.mjs`：700／Pilot 282／尚未移植 418／嚴格全面驗收 0。
- GitHub Actions pull_request run [`39739813788`](https://github.com/will00t-debug/Ua/actions/runs/39739813788)（HEAD `ed654b11c0c0b6fd7abd352da98d9e3f5a36e1ce`、Node v22.23.3）：2026-10-22 15:20（台北時間）開始、15:26 結束，conclusion success。Job `regression` 的日誌是 `npm test` 1601 tests、1601 pass、0 fail、0 skipped；矩陣 `60/60 finished (failures 0)`；獨立 manifest `bleach 97, gurren-lagann 30, solo-leveling 37, sword-art-online 76, mushoku-tensei 42; total 282`；未移植報告 `總卡 700／Pilot 282／尚未移植 418／嚴格全面驗收 0`。同一 SHA 的 push run `39739808141` 被 concurrency 取消，那不是測試失敗。這個結論只屬於 `ed654b1`。其後若再推文件修訂，那個新 SHA 要另看自己的 run。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。DAMAGE2 沒有重寫。
- 未審核的 Raid 幾何仍 fail closed。
- 2回アタック與 2回ブロック都沒有「同一 UID 離場再登場後次數歸零」的專用 FAQ。目前保留該回合的次數。
- 埋在 Raid 底下的印刷本名仍算進既有的名稱掃描。別名不算。LIFE 沒有依名字搜尋的效果。
- 全面 FAQ 認證仍為 0。沒有瀏覽器或手機手動操作驗收。
- TTG、MST 目前沒有剩下一張可以零引擎完整移植的卡。
- 下一輪最值得先核對官方頁再決定要不要加共用規則的卡：
  - `SAO-2-004`：別名已經可用，缺的是「其他整合騎士至少 4 張時，登場轉 ACTIVE」。
  - `SAO-1-012`：別名、STEP、兩個名字的 BP 比較接近了，但 COLOR 是「敵方 FRONT 1 張 REST，且下一次不能 ACTIVE」，不能套現有 COLOR。
  - `SAO-1-008`、`SAO-1-045`、`SAO-1-093`、`SAO-2-050`：REST 自己產生能源，但不是只限能源線。
  - `BLC-2-047`：除了抽 2，還有被己方藍一護從手牌送場外時再抽 1。
  - `TTG-1-022`：也視為庸子，加上 REST 自己、本回合能源 +1、主要階段結束時回手。回手不是現有的結束時退場。
  - `MST-1-004`：只有「因己方效果登場」時才轉 ACTIVE。

## 第十五輪（2026-10-22）

接續第十四輪已由 GitHub Actions 驗過的 `ed654b11c0c0b6fd7abd352da98d9e3f5a36e1ce`（pull_request run `39739813788`）與其文件修訂 `c5f0d3e6704fb29ef71a6290e72d7ecf9c9c0b1c`。工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`。沒有改 main、沒有部署、沒有 force push。第十四輪的阻擋、退場 REST、BP 範圍、別名，以及當時已登錄的卡都沒有重做。

本輪本地驗收使用 Node **v22.23.4**。時間 2026-10-22 16:20（台北時間）完成矩陣與未移植報告。`npm test` 是 1631 則、1631 通過。沒有刪測試、沒有放寬合法性。這個數字含第十五輪 A 到 E 的新測試。GitHub Actions 的規則與交接 SHA 是 `61bbd8765e528b1554bad674c909e3d3161851ca`。記錄這次 Actions 結果的文件修訂是其後的 commit，要另看自己的 run。

### 本輪共用引擎

- `activeSelfIf`：登場後依印刷條件把自己轉 ACTIVE。條件可以是己方場上其他指定特徵的角色數量，也可以是「這次登場是己方效果造成」。`paidPlay`、`paidRaid` 是支付登場，不是效果。`outsideEffect`、`outsideEffectRaid`、`recoveredEffect` 算己方效果。`lifeColor`、`lifeRaid` 沒有卡牌 FAQ 把它們算進去，所以 fail closed，不轉 ACTIVE。滿場替換走既有 `commitDestination`，被換下的卡進 REMOVED，不是退場。封印、`skipNextActive`、`cannotActive` 都維持 REST。
- `restSelfGainEnergyRetireEndMain` 的位置改成資料裡的 `lines`：`front`、`energy` 或 `field`。舊的四鍵 `energyOnly:true` 仍只能在能源線起動。REST 自己是代價，本回合指定顏色 +1，支付當下重算。主要階段結束的退場仍走既有延遲隊列。每回合一次鎖在實體 UID。事先被封印不能起動。起動之後才被封印，不會收回已經加上的能源，也不會取消已經排好的退場；SAO-2-050 的「を得る」沒有另外的 FAQ，沒有做成第二套引擎。
- `moveAtMainEnd` 的目的地 `hand` 走同一條延遲隊列，結算時用既有 `bounceToHand`。頂牌回手，底板與裏向 under 去自己的場外，暫時狀態清掉。不跑 `onRetire`，不加真退場計數。UID 不在、stamp 不符、或人在 Raid 底下，都不動作。同一時間的真退場仍先走退場 batch，回手排在後面。這個順序沒有卡牌 FAQ，是 fail closed，不是控制者可選的順序。對手的公開視圖仍看不到手牌內容。
- COLOR 的 `restOppFrontSkipNextActive` 是獨立模式 `colorRestSkip`。選一張敵方 FRONT，轉 REST，並給沒有期限的 `skipNextActive`。不是 `colorRetire`，也不是一般的 COLOR 登場。沒有敵方 FRONT 就只跳過。能源線與己方 FRONT 不是目標。
- `draw` 可選的 `entry:'ownEffect'` 只允許角色的登場時。原因集合與上面的 ACTIVE 相同。沒有這個鍵的舊抽牌不變。

### Batch A：條件式 ACTIVE 登場

`187b101c585d8fce566b3b2184048a62f09f6f92`

- **EX08BT/SAO-2-004** アリス・シンセシス・サーティ。也視為〈アリス〉。其他整合騎士至少 4 張時，登場轉 ACTIVE。發生能源 alt 是黃，gen 1。標準 ACTIVE Trigger。該頁沒有 FAQ。
- **UA54BT/MST-1-004** エリス。只有「自分の効果で登場」才轉 ACTIVE。無 Trigger。該頁沒有 FAQ。

### Batch B：不限定能源線的 MAIN 產能

`27de62c5f83c3f1bc4edeb7c593e213f3e3039c1`

四張的標頭都是「色+」：一顆色珠加一個加號，休息時的發生量是 1，不是 `activeExtraEnergy`。印刷沒有「アクティブの場合」。前線可以起動，但前線不產生能源。能源線起動後該顏色立刻 +1，主要階段結束退場。

- **UA15BT/SAO-1-008** ユイ。黃。
- **UA15BT/SAO-1-045** ピナ。青。UA15ST 再錄同一句，gen 也是 1。
- **UA15BT/SAO-1-093** ゼクシード。綠。
- **EX08BT/SAO-2-050** ディアベル。紫。「を得る」與上面三張用同一個已結算的 REST、+1、結束退場。

SAO-1-003 已經登錄，圖示也是「黃+」，但資料仍是 gen 2 再加 `activeExtraEnergy` 1。這輪沒有改它。

### Batch C：MAIN 結束時回手

`d5e31fa8c365bd2f3492d1ac9312d5711749889d`

- **UA56BT/TTG-1-022** ヨマコ先生。也視為〈ヨーコ〉。REST 自己，本回合綠 +1，主要階段結束時回手。標頭「綠+」是 gen 1。必要能源 1、AP 1、BP 1500、特徵大グレン団、DRAW。回手不是退場。該頁沒有 FAQ。

### Batch D：COLOR 觸發的控制效果

`2d3bdcfb3b70ee81b4f545bd80f0037304207868`

- **UA15BT/SAO-1-012** アリス・シンセシス・サーティ。也視為〈アリス〉，有【ステップ】。己方回合場上同時有〈キリト〉與〈ユージオ〉時 BP+1000；一張 SAO-2-003 可以同時滿足兩個名字，封印後別名與這個 BP 都不算。COLOR 另句：選 1 張敵方 FRONT 轉 REST，它下一次不能 ACTIVE。發生能源圖示 alt 是「黃黃」，gen 從 3 改為 2。BP 印刷 `3000+`，數值 3000。必要能源黃 3、AP 1、特徵整合騎士。角色本文不含 COLOR 那句。該頁沒有 FAQ。

### Batch E：跨作品移植

`2591b21eaeb65d8b141862fba9a98f3d7d95452b`

不改引擎就完整移植的是下面 4 張。A 到 D 與 MST-1-023 都不計入這個數字。

- **EX08BT/SAO-2-006** ベルクーリ・シンセシス・ワン。其他整合騎士至少 3 張時，發生能源 +黃。沒有「自分のターン中」，也沒有「アクティブの場合」。標頭「黃+」所以 gen 從匯入的 2 改為 1。只有能源線真的多產生 1。無 Trigger。該頁沒有 FAQ。
- **EX08BT/SAO-2-008** レンリ・シンセシス・トゥエニセブン。己方回合、其他整合騎士至少 4 張時 BP+1500。BP 印刷 `1500+`。發生黃，gen 1。標準 ACTIVE Trigger。該頁沒有 FAQ。
- **UA51BT/SLG-1-062** 最上 真。己方回合、場上「第四次架南島レイド」至少 5 張時 BP+1500。印刷沒有「他の」，自己要算進去。登錄特徵用官方那一條；目錄的「第四次架南島Raid」沒有拿來計數。發生綠，gen 1。DRAW。該頁沒有 FAQ。
- **UA54BT/MST-1-066** フィッツ。也視為〈シルフィエット〉。己方回合、己方發生能源至少 7 時 BP+1000。發生能源 alt 是「綠綠」，gen 2。特徵ラノア魔法大学。DRAW。該頁沒有 FAQ。

另外用本輪的登場原因，給既有 `draw` 加了可選閘門：

- **UA54BT/MST-1-023** ルーデウス。登場時若是己方效果造成，抽 1。支付 AP 登場與 LIFE 的 COLOR 登場都不抽。無 Trigger。該頁沒有 FAQ。這張算少量條件擴充，不是零引擎移植。

這輪看過、仍不登錄：SLG-1-027 是逐張計數；SLG-1-065 同時要 BP 與 Impact；SLG-1-072 是特徵數量到了才抽，目前沒有這個閘門；TTG-1-015 付的是 AP 不是 REST；SAO-1-007 與 MST-1-041 是 REST 自己再給另一張角色 BP，現有的後續只允許磨牌；SAO-2-005 的 Impact 1 帶有整合騎士數量條件，不能掛上無條件的 `printedImpact`。

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 97/276 | 179 |
| TTG | 31/81 | 50 |
| SLG | 38/80 | 42 |
| SAO | 84/183 | 99 |
| MST | 45/80 | 35 |
| 合計 | 295/700 | 405 |

本輪正式新增 13 張。其中不改引擎就移植的是 4 張。嚴格全面官方 FAQ 驗收仍為 0。合成測試卡沒有計入。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1631 tests、1631 pass、0 fail、0 skipped。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-assert-independent-manifest.mjs`：bleach 97、gurren-lagann 31、solo-leveling 38、sword-art-online 84、mushoku-tensei 45；total 295。
- `node scripts/v2-unported-report.mjs`：700／Pilot 295／尚未移植 405／嚴格全面驗收 0。
- GitHub Actions pull_request run [`39747250598`](https://github.com/will00t-debug/Ua/actions/runs/39747250598)（HEAD `61bbd8765e528b1554bad674c909e3d3161851ca`、runner Node v22.23.3）：2026-10-22 16:22（台北時間）開始、16:23 結束，conclusion success。Job `regression` 的日誌是 `npm test` 1631 tests、1631 pass、0 fail、0 skipped；矩陣 `60/60 finished (failures 0)`；獨立 manifest `bleach 97, gurren-lagann 31, solo-leveling 38, sword-art-online 84, mushoku-tensei 45; total 295`；未移植報告 `總卡 700／Pilot 295／尚未移植 405／嚴格全面驗收 0`。同一 SHA 的 push run `39747246588` 被 concurrency 取消。這個結論只屬於 `61bbd87`。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。
- 未審核的 Raid 幾何與連鎖 Raid 仍 fail closed。
- 2回アタック與 2回ブロック都沒有「同一 UID 離場再登場後次數歸零」的專用 FAQ。目前保留該回合的次數。
- 「自分の効果で登場」不含 LIFE Trigger。這是沒有卡牌 FAQ 時的 fail closed，不是已確認的官方排除。
- 前線上的條件式發生能源不加進資源。只有能源線，或印了前線也能產生的卡，才產生。
- SAO-1-003 的「黃+」與 `activeExtraEnergy` 疊加仍未改。
- SAO-2-050、TTG-1-022 在起動後才被封印時，已獲得的能源與已排定的退場或回手不收回。沒有對應 FAQ。
- 主要階段結束時，真退場與回手同時發生的順序沒有 FAQ。目前先退場、再回手。
- 埋在 Raid 底下的層不會被延遲回手或延遲退場抽出來。
- 全面 FAQ 認證仍為 0。沒有瀏覽器或手機手動操作驗收。
- 下一輪最接近、但這輪沒有完整印刷支援的卡：
  - `SLG-1-072`：登場時己方 DFN 至少 3 張才抽 1。缺的是特徵數量閘門。官方特徵是單一トークン，目錄把 DFN 與 Raid 拆開。
  - `SAO-2-005`：其他整合騎士至少 4 張時才得到 Impact 1。不能把無條件 Impact 套上去。
  - `SLG-1-065`：手牌至少 5 張時同時 BP+1000 與 Impact 1。現有的手牌 BP 不會附帶 Impact。
  - `TTG-1-015`：付 1 AP、抽 1、本回合綠 +1。代價不是 REST 自己。
  - `SAO-1-007`、`MST-1-041`：REST 自己，再選另一張己方角色 BP+1000。現有後續只允許磨牌頂。
  - `MST-1-056`：REST 另一張己方 ACTIVE 的前線角色，成功後自己本回合綠 +1。不是 REST 自己的那條產能。

## 第十六輪（2026-10-22）

接續第十五輪規則與交接 SHA `61bbd8765e528b1554bad674c909e3d3161851ca`。記錄該 SHA 的文件修訂 `d8c15e288471bebe0646e8ee6740dbaff7f3b56e`，其 pull_request run [`39747804954`](https://github.com/will00t-debug/Ua/actions/runs/39747804954) 是 success。runner Node v22.23.3。2026-10-22 16:26（台北時間）開始、16:29 結束。Job `regression` 的日誌是 `npm test` 1631 tests、1631 pass、0 fail、0 skipped；矩陣 `60/60 finished (failures 0)`；獨立 manifest `bleach 97, gurren-lagann 31, solo-leveling 38, sword-art-online 84, mushoku-tensei 45; total 295`；未移植報告 `總卡 700／Pilot 295／尚未移植 405／嚴格全面驗收 0`。同一 SHA 的 push run `39747797200` 被 concurrency 取消。這個結論只屬於 `d8c15e2`，不涵蓋本輪。

工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`。沒有改 main、沒有部署、沒有 force push。第十五輪已登錄的卡與共用能力沒有重做。SAO-1-003 沒有改。斜線複合特徵仍是一個完整トークン，沒有拆開。各作品包的版本字串沒有改。

本輪本地驗收使用 Node **v22.23.4**。時間 2026-10-22 16:46（台北時間）完成矩陣與未移植報告。`npm test` 是 1646 則、1646 通過、0 fail、0 skipped。沒有刪測試、沒有放寬合法性。規則 SHA 是 `65ae315e605aa12516e79be0016564bc64acc672`。記錄本輪的這份文件修訂是其後的 commit，要另看自己的 pull_request run。不要把 `39747804954` 當成第十六輪的結果。

### 本輪共用引擎

- 條件式 Impact 1 走 `passiveBonuses.impact`，只能正好是 1。`impactOnBattleWin` 在沒有 `printedImpact`、也沒有裏向底卡 Impact 時，才加總仍成立的被動 Impact。不寫進 `printedImpact`。已有無條件 Impact 或裏向底卡 Impact 時，包驗證會拒絕再掛條件式 Impact。封印後這個被動不算。條件不成立時，被阻擋的勝利不扣生命。
- `restSelfBuffOther` 只有 `op` 與 `bp` 正好 1000。前線與能源線都可以起動。沒有每回合一次。先 REST 自己，再強制選另一張己方角色（前線或能源線），本回合 BP+1000。場上沒有另一張角色就不能起動。再次轉成 ACTIVE 後可以再付一次，兩次 +1000 會疊加。起動之後才被封印，不會收回已經加上的 BP。沒有對應 FAQ，沒有做成第二套收回。
- `payApDrawGainEnergy` 的鍵是 `op`、`oncePerTurn:true`、`draw:1`、`extraEnergy:1`。付 1 AP，不 REST 來源。已經 REST 的角色只要還有 AP 就能付。每回合一次鎖在實體 UID。抽 1；牌庫空了抽 0，但 AP 已經付掉，能源仍加上。能源加成是本回合的 `{energy, untilTurn}`。前線仍走既有的早退，產生 0。能源線才把印刷發生量與這次加成加在一起。
- `restSelfRestFrontGainEnergy` 的鍵是 `op`、`oncePerTurn:true`、`extraEnergy:1`。先 REST 這張卡（前線或能源線），再選另一張目前 ACTIVE 的前線角色並 REST 它。能源加成只在那次 REST 成功之後才加上。來源自己已經 REST，不能當目標。場上只剩這張 ACTIVE 前線時不能起動。能源線的角色不是目標。不付 AP，不加真退場計數。能源線來源該顏色變成印刷量 +1；前線來源仍產生 0。

### Batch A：條件式 Impact 1

`89f4392af793d26e30a41231002a85c84660e56e`

- **EX08BT/SAO-2-005** シェータ・シンセシス・トゥエルブ。其他整合騎士至少 4 張時，這張得到 Impact 1。沒有「自分のターン中」。自己不算進那 4 張。任一回合、前線或能源線都算。3 張、把自己算進去、或被封印，都沒有 Impact。條件成立時，被阻擋且戰鬥勝利只扣 1 點生命，並只在公開到的 LIFE 有 Trigger 時開 LIFE。發生能源 alt 是黃，gen 1。無 Trigger。該頁 2026-10-22 沒有 FAQ。

### Batch B：REST 自己，再給另一張角色 BP

`7d20598535b1cf100b4e9ff1a6d767fc396427d1`

- **UA15BT/SAO-1-007** シリカ。黃。必要能源 2、AP 1、BP 2500、gen 1、特徵 ALO。無 Trigger。REST 自己，選另一張己方角色，本回合 BP+1000。能源線測過。該頁 2026-10-22 沒有 FAQ。
- **UA54BT/MST-1-041** アイシャ。綠。必要能源 2、AP 1、BP 2000、gen 1。標準 DRAW。同一句 REST 與 BP+1000。前線測過。該頁 2026-10-22 沒有 FAQ。

### Batch C：付 AP 抽牌並本回合產能

`aaf677fde8edfb350bab9a74a5883be9f9697ec3`

- **UA56BT/TTG-1-015** ニア。綠。必要能源 alt 是「綠-」，能源費用 0。AP 1、BP 500。發生能源 alt 是「綠+」，gen 1。特徵大グレン団。DRAW。主要階段每回合一次：付 1 AP，抽 1，本回合發生能源 +1。不 REST。沒有 AP 不能起動。同一回合即使再標一張 AP 卡，也不能付第二次。REST 的前線仍能付，但仍產生 0。能源線產生 2。牌庫空了仍付 AP 並得到能源。該頁 2026-10-22 沒有 FAQ。目錄中文指紋是「主要階段每回合一次，支付1 AP：抽1張；本回合產生能源+1。」

### Batch D：不改引擎

`3f23b51dd86dfe1e41a165482a840e321add8bb6`

這輪不改引擎就完整移植的只有 1 張。A、B、C、E 都改了引擎，不計入這個數字。第十五輪的 4 張也不在這裡重算。

- **UA51BT/SLG-1-065** アーシー。己方回合、自己手牌至少 5 張時，同時 BP+1000 與 Impact 1。手牌 4 張、對手回合、或被封印，兩個都沒有。BP 印刷 `4000+`，數值 4000。發生能源 alt 是「綠」，gen 1。必要能源綠 4、AP 1。DRAW。官方特徵是單一トークン `DFN／第四次架南島レイド`。目錄拆成 `DFN` 與 `第四次架南島Raid`，沒有拿來當登錄特徵。能源線只產生印刷的 1。該頁 2026-10-22 沒有 FAQ。

### Batch E：REST 另一張前線再產能

`65ae315e605aa12516e79be0016564bc64acc672`

- **UA54BT/MST-1-056** エリナリーゼ。綠。必要能源 1、AP 1、BP 2000、gen 1。特徵ラノア魔法大学。無 Trigger。標頭「綠+」是 gen 1，不是 gen 2。起動：先 REST 自己，再 REST 另一張目前 ACTIVE 的前線角色。成功後，這張本回合發生能源 +綠。每回合一次。只剩自己一張 ACTIVE 前線時不能起動。能源線角色與自己都不是目標。不付 AP。能源線來源該卡綠色發生量變成 2；前線來源仍是 0。該頁 2026-10-22 沒有 FAQ。印刷本文是 `〖起動メイン〗 〖レストにする〗 〖ターン1〗 自分のフロントLのアクティブのキャラを1枚レストにする。そうした場合、このキャラはこのターン中、発生エナジー+ 〖緑〗 。`（`+` 與 `〖緑〗` 之間有空格）。

這輪看過、仍不登錄：SLG-1-072。官方效果是登場時己方場上「特徵：DFN」至少 3 張才抽 1。官方特徵卻是複合トークン `DFN／第四次架南島レイド`。發生能源 alt 是「綠綠」，gen 2。必要能源綠 3、BP 2000、無 Trigger、名字ミズア。現有 `ownTraitCount` 用完整トークン比對，不會把這張自己或其他複合 DFN 算成 `DFN`。若拆開斜線，會改掉第十五輪已鎖住的測試：SLG-1-069 的複合特徵不算 `第四次架南島レイド`。TTG-1-002 的中文目錄看起來接近 MST-1-056，這輪沒有抓官方頁，沒有當成同一句。

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 97/276 | 179 |
| TTG | 32/81 | 49 |
| SLG | 39/80 | 41 |
| SAO | 86/183 | 97 |
| MST | 47/80 | 33 |
| 合計 | 301/700 | 399 |

本輪正式新增 6 張：SAO-2-005、SAO-1-007、MST-1-041、TTG-1-015、SLG-1-065、MST-1-056。其中不改引擎就移植的是 1 張。嚴格全面官方 FAQ 驗收仍為 0。合成測試卡沒有計入。正式登錄、測試通過、全面 FAQ 認證是三件不同的事。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1646 tests、1646 pass、0 fail、0 skipped。時間 2026-10-22 16:46（台北時間）。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-assert-independent-manifest.mjs`：bleach 97、gurren-lagann 32、solo-leveling 39、sword-art-online 86、mushoku-tensei 47；total 301。
- `node scripts/v2-unported-report.mjs`：700／Pilot 301／尚未移植 399／嚴格全面驗收 0。
- 上面是本機結果。GitHub Actions 尚未跑本輪。`39747804954` 只屬於 `d8c15e2`。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。
- 未審核的 Raid 幾何與連鎖 Raid 仍 fail closed。
- 2回アタック與 2回ブロック都沒有「同一 UID 離場再登場後次數歸零」的專用 FAQ。目前保留該回合的次數。
- 「自分の効果で登場」不含 LIFE Trigger。這是沒有卡牌 FAQ 時的 fail closed，不是已確認的官方排除。
- 前線上的條件式或起動獲得的發生能源不加進資源。TTG-1-015 與 MST-1-056 都維持這個早退。只有能源線，或印了前線也能產生的卡，才產生。
- SAO-1-003 的「黃+」與 gen 2 再加 `activeExtraEnergy` 仍未改。
- SAO-2-050、TTG-1-022，以及本輪起動後才被封印的能源與 BP，已獲得的文字不收回。沒有對應 FAQ。
- 主要階段結束時，真退場與回手同時發生的順序沒有 FAQ。目前先退場、再回手。
- 埋在 Raid 底下的層不會被延遲回手或延遲退場抽出來。
- 斜線複合特徵維持一個完整トークン。SLG-1-072 因此這輪不登錄。
- 全面 FAQ 認證仍為 0。沒有瀏覽器或手機手動操作驗收。
- 下一輪最接近、但這輪沒有完整印刷支援的卡：
  - `SLG-1-072`：要先決定斜線複合特徵能不能在特定效果裡拆成 `DFN`。沒有這個決定之前不移植。
  - `TTG-1-002`：中文目錄接近 MST-1-056 的 REST 另一張前線。官方頁這輪沒有抓，不能假設同一句。
  - `SAO-2-065`：不在場時的 BP。這輪沒有抓官方頁。
  - `TTG-1-007`、`TTG-1-013`：這輪沒有抓官方頁。
  - `SLG-1-027`：逐張 REST 的 BP，現有被動不是逐張計數。

## 第十七輪（2026-10-22）

接續第十六輪規則 SHA `65ae315e605aa12516e79be0016564bc64acc672`。記錄該輪的文件修訂 `d930207ce295b38167eb0f9f595302e1adef2cbd`，其 pull_request run [`39750703694`](https://github.com/will00t-debug/Ua/actions/runs/39750703694) 是 success。runner Node v22.23.3。2026-10-22 16:49（台北時間）開始、16:51 結束。Job `regression` 的日誌是 `npm test` 1646 tests、1646 pass、0 fail、0 skipped；矩陣 `60/60 finished (failures 0)`；獨立 manifest `bleach 97, gurren-lagann 32, solo-leveling 39, sword-art-online 86, mushoku-tensei 47; total 301`；未移植報告 `總卡 700／Pilot 301／尚未移植 399／嚴格全面驗收 0`。同一 SHA 的 push run `39750700005` 被 concurrency 取消。checkout、setup-node、upload-artifact 的 Node.js 20 淘汰警告是 runner 警告，不是測試失敗。這個結論只屬於 `d930207`，不涵蓋本輪。

工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`。沒有改 main、沒有部署、沒有 force push。第十六輪已登錄的卡與共用能力沒有重做。SAO-1-003 沒有改。斜線複合特徵仍是一個完整トークン。各作品包的版本字串沒有改。

本輪本地驗收使用 Node **v22.23.4**。時間 2026-10-22 17:19（台北時間）完成矩陣與未移植報告。`npm test` 是 1661 則、1661 通過、0 fail、0 skipped。沒有刪測試、沒有放寬合法性。規則 SHA 是 `17a1d486ff447041b14d334fd387e89d9af8300f`。記錄本輪的這份文件修訂是其後的 commit，要另看自己的 pull_request run。不要把 `39750703694` 當成第十七輪的結果。

### 本輪共用引擎

- `ownNameAbsent`：自己場上沒有指定名字的角色時成立。前線與能源線都算。手牌、場外、對手場上、Raid 底下不算。別名與封印的處理跟 `ownNameExists` 一樣：封印拿掉別名，印刷名字還在。這個條件只允許負的 BP，而且必須是 500 的倍數、最低 -5000。正的 BP 不能掛在這個條件上。
- `ownRestPrintedBpAtMost` 配 `bpEach`：己方回合，每有 1 張符合的 REST 角色就加一次 BP。比的是印刷 BP，不是現在的 BP。Q2030：元々のBP 是卡面左下的數字。Q2070：場域沒有 BP，所以不算；實作只數角色。特徵是完整トークン。印刷沒有「他の」時，自己也數，但自己的印刷 BP 超過上限就不算。ACTIVE、對手、中文譯名特徵都不算。
- `oppCharacterBpAtLeast`：對手場上有現在 BP 達到門檻的角色。Q749：效果把 BP 抬到門檻也算。自己的場上不算。手牌不算。互相讀取現在 BP 時，正在計算的那張卡不再往下展開被動，避免循環。Q749 要看的那張卡，本身的本回合加值仍算進去。
- 退場時可以選擇性使用既有的 `buffOwnField`。必須是 optional。角色已經離場，所以自己不是目標。Q2220：退場前被封印，印刷的退場文不會發動。

### Batch A：名字不在場時的 BP

`e8d5bf81393720204cee54ddcfeddc7d4bc1f66a`

- **EX08BT/SAO-2-065** クライン。自己場上沒有〈フレイヤ〉時 BP-500。沒有「自分のターン中」。BP 印刷 `3500-`，數值 3500。發生能源 alt 是「綠」，gen 1。必要能源綠 2、AP 1、特徵 ALO。標準 ACTIVE Trigger。手牌、場外、對手的フレイヤ都不取消減成。自己場上的別名算。別名被封印後不算；印刷名字被封印仍算。這張自己被封印後，減成消失，回到 3500。該頁 2026-10-22 沒有 FAQ。

### Batch B：逐張 REST 的印刷 BP

`9e59100a8983ca2dddd7d095eaf3659748ee77ad`

- **UA51BT/SLG-1-027** アイアン。己方回合，每有 1 張印刷 BP 2500 以下、REST、特徵正好是 `影の軍団` 的己方角色，BP+500。能源線也算。ACTIVE 不算。印刷 3000 即使本回合被減到 2500 以下也不算。場域不算。目錄特徵 `影之軍團` 沒有拿來計數。BP 印刷 `3000+`，數值 3000。發生能源 alt 是「紫」，gen 1。必要能源紫 2、AP 1。無 Trigger。Q2030、Q2070 如上。這不是整頁 FAQ 認證。

### Batch C：對手現在 BP 的 Impact

`17a0d9158b618817ef59aaa5af53183d5792aad0`

- **UA15BT/SAO-1-017** ベルクーリ・シンセシス・ワン。對手場上有現在 BP 4000 以上的角色時，這張得到 Impact 1。Q749：效果把 BP 抬上去也算。自己場上的 4000 不算。3500 不算。手牌不算。能源線的對手角色算。這張被封印後 Impact 是 0。發生能源 alt 是「黃」，gen 1。必要能源黃 5、AP 1、BP 4000、特徵整合騎士。標準 ACTIVE Trigger。

### Batch D：退場時給另一張角色 BP

`9343216b18a00e4f3e09bede2470e719265b0826`

- **UA15BT/SAO-1-079** ユウキ。真退場時，可選自己場上 1 張角色，本回合 BP+1000。可以不選。前線與能源線都是目標。自己已經離場，不是目標。場上沒有其他角色就不會開選擇。退場前被封印則這句不發動。選完之後，目標再被封印，已加上的 BP 不收回。發生能源 alt 是「綠」，gen 1。必要能源綠 2、AP 1、BP 3000、特徵 ALO。無 Trigger。該頁 2026-10-22 沒有 FAQ。

### Batch E：不改引擎

`17a1d486ff447041b14d334fd387e89d9af8300f`

這輪不改引擎就完整移植的只有 1 張。A 到 D 都改了規則，不計入這個數字。第十六輪的 1 張也不在這裡重算。

- **UA56BT/TTG-1-002** ヴィラル。官方句與 MST-1-056 是同一條已結算的能力：先 REST 自己，再 REST 另一張目前 ACTIVE 的前線角色。成功後，這張本回合發生能源 +綠。每回合一次。標頭「綠+」是 gen 1。必要能源綠 1、AP 1、BP 1500、特徵大グレン団。標準 ACTIVE Trigger。前線起動後仍產生 0。能源線起動後該卡變成 2。不付 AP，不加真退場計數。該頁 2026-10-22 沒有 FAQ。

這輪看過、仍不登錄：SLG-1-072 仍卡在斜線複合特徵。TTG-1-007 與 TTG-1-013 除了場上有搭檔時 BP+1000，還有從手牌登場可付 1 AP、把場外搭檔 REST 登場；只做 BP 會是半套。SAO-1-043 是場外〈ピナ〉最多 1 張 REST 登場，現有 `deployOutsideRest` 還強制顏色、能源與 AP，這張印刷沒有那些限制。SAO-2-034 的「1枚まで」是可選磨牌，不是強制 `millTop`。MST-1-065 是看頂 2、符合特徵的最多 1 張放場外、其餘放回牌庫頂；現有查看不是這個目的地。

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 97/276 | 179 |
| TTG | 33/81 | 48 |
| SLG | 40/80 | 40 |
| SAO | 89/183 | 94 |
| MST | 47/80 | 33 |
| 合計 | 306/700 | 394 |

本輪正式新增 5 張：SAO-2-065、SLG-1-027、SAO-1-017、SAO-1-079、TTG-1-002。其中不改引擎就移植的是 1 張。嚴格全面官方 FAQ 驗收仍為 0。合成測試卡沒有計入。正式登錄、測試通過、全面 FAQ 認證是三件不同的事。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1661 tests、1661 pass、0 fail、0 skipped。時間 2026-10-22 17:19（台北時間）。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-assert-independent-manifest.mjs`：bleach 97、gurren-lagann 33、solo-leveling 40、sword-art-online 89、mushoku-tensei 47；total 306。
- `node scripts/v2-unported-report.mjs`：700／Pilot 306／尚未移植 394／嚴格全面驗收 0。
- 上面是本機結果。GitHub Actions 尚未跑本輪。`39750703694` 只屬於 `d930207`。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。
- 未審核的 Raid 幾何與連鎖 Raid 仍 fail closed。
- 2回アタック與 2回ブロック都沒有「同一 UID 離場再登場後次數歸零」的專用 FAQ。目前保留該回合的次數。
- 「自分の効果で登場」不含 LIFE Trigger。這是沒有卡牌 FAQ 時的 fail closed。
- 前線上起動或條件得到的發生能源不加進資源。TTG-1-002 也維持這個早退。
- SAO-1-003 的「黃+」與 gen 2 再加 `activeExtraEnergy` 仍未改。
- 起動或退場選擇之後才被封印時，已獲得的能源與 BP 不收回。沒有對應 FAQ。
- 主要階段結束時，真退場與回手同時發生的順序沒有 FAQ。目前先退場、再回手。
- 埋在 Raid 底下的層不會被延遲回手或延遲退場抽出來。
- 斜線複合特徵維持一個完整トークン。SLG-1-072 因此仍不登錄。
- 互相讀取現在 BP 時，正在計算的那張不再展開自己的被動。這不是另一條 FAQ，只是避免循環。
- 全面 FAQ 認證仍為 0。沒有瀏覽器或手機手動操作驗收。
- 下一輪最接近、但這輪沒有完整印刷支援的卡：
  - `SLG-1-072`：要先決定斜線複合特徵能不能在特定效果裡拆成 `DFN`。
  - `TTG-1-007`、`TTG-1-013`：BP 與付 AP 從場外 REST 登場是同一張卡的兩句，不能只登 BP。
  - `SAO-1-043`：場外〈ピナ〉REST 登場沒有顏色、能源、AP 上限。
  - `SAO-2-034`：攻擊時牌庫頂最多 1 張放場外，是可選，不是強制磨 1。
  - `MST-1-065`：也視為〈シルフィエット〉。看頂 2，特徵符合的最多 1 張放場外，其餘放回牌庫頂。

## 第十八輪（2026-10-22）

接續第十七輪規則 SHA `17a1d486ff447041b14d334fd387e89d9af8300f`。記錄該輪的文件修訂 `a3630814ac265fc2042c0e8858cd8a48eea10ee0`，其 pull_request run [`39754862677`](https://github.com/will00t-debug/Ua/actions/runs/39754862677) 是 success。runner Node v22.23.3。2026-10-22 17:22（台北時間）開始、17:23 結束。Job `regression` 的日誌是 `npm test` 1661 tests、1661 pass、0 fail、0 skipped；矩陣 `60/60 finished (failures 0)`；獨立 manifest `bleach 97, gurren-lagann 33, solo-leveling 40, sword-art-online 89, mushoku-tensei 47; total 306`；未移植報告 `總卡 700／Pilot 306／尚未移植 394／嚴格全面驗收 0`。同一 SHA 的 push run `39754856464` 被 concurrency 取消。checkout、setup-node、upload-artifact 的 Node.js 20 淘汰警告是 runner 警告，不是測試失敗。這個結論只屬於 `a363081`，不涵蓋本輪。

工作分支仍是 `cursor/v2-multi-retire-life-6ff5`，Draft PR #77 的合併目標仍是 `codex/v2-resume-20261021`。沒有改 main、沒有部署、沒有 force push。第十七輪已登錄的卡與共用能力沒有重做。SAO-1-003 沒有改。斜線複合特徵仍是一個完整トークン。各作品包的版本字串沒有改。

本輪本地驗收使用 Node **v22.23.4**。時間 2026-10-22 17:53（台北時間）完成矩陣與未移植報告。`npm test` 是 1674 則、1674 通過、0 fail、0 skipped。沒有刪測試、沒有放寬合法性。共用引擎 SHA 是 `eff466e628f746c85d473087da01b03d30eae09c`。規則與卡牌的最終 SHA 是 `79fde3d65bc48b35c8faff1ac61872a1e281d19f`。記錄本輪的這份文件修訂是其後的 commit，要另看自己的 pull_request run。不要把 `39754862677` 當成第十八輪的結果。

`202c9745169b556109b4880f9b34169dccb87061` 的 manifest 已經寫入 `MST-1-065`，MST 卡包與測試在下一個提交 `1a5b965c300777109c305dc47e40cb85fcc89046`。最終 HEAD `79fde3d` 的 manifest 與卡包一致。沒有用 force push 改寫中間提交。

### 本輪共用引擎

- `deployOutsideNameRest`：鍵只有 `op`、`name`、`optional:true`。只看名字。既有 `deployOutsideRest` 仍要齊顏色、能源、AP 六個鍵，缺了仍拒絕。目標是自己場外、沒有 `raidName`、`cardHasName` 符合的角色。別名算。場外的卡套不到只對場上卡生效的 `originalEffectsDisabled`，所以場外別名一直算。可以不選。登場是 REST，前線或能源線；前線被禁止時不能上前線。入場原因是 `outsideEffect`。手牌與對手的同名不算。
- `millTop` 加上 `optional:true` 時，張數必須正好是 1。沒有 `optional` 的舊磨牌仍是強制，張數 2 仍合法。選擇不公開牌庫頂。空牌庫，以及排隊當下被封印，都不開選擇，直接進阻擋。接受後只把那一張放到場外，然後開阻擋。
- `inspectTopTraitOutside`：看牌庫頂 2 到 4 張。特徵用完整トークン的 `traits.includes`，不走會拆斜線的 `matchesFilter`。有符合的才開「0 或 1 張放場外」。沒有符合的就直接進既有的牌頂順序，全部放回牌庫頂。不加手牌、不棄牌、不放牌庫底。
- `payApDeployNamedRest`：鍵只有 `op`、`entry:'hand'`、`name`。只在入場原因是 `paidPlay` 或 `paidRaid`、而且至少還有 1 AP 時才開。LIFE、`outsideEffect`、`recoveredEffect`、沒有入場原因都不開。跳過不付 AP。接受時先付 1 AP，再從場外挑同名、而且該顏色已有的發生能源夠付必要能源的角色。必要能源 0 一定夠。其他顏色的能源不算。付完沒有合法目標時，選擇關掉，AP 已經花掉。先攻第一回合只有 1 AP，打出 AP 1 的卡之後這個選擇不開。被效果登場的搭檔，自己的登場時不再提供這次付費。場上有指定名字時的 BP+1000 用既有 `ownNameExists`，沒有新的 BP 引擎。手牌、場外、對手不算。來源被封印後加值消失。任一回合都算。

### Batch A 與 B：指名 REST 登場、可選磨 1

`202c9745169b556109b4880f9b34169dccb87061`

- **UA15BT/SAO-1-043** シリカ。登場時，自己場外的〈ピナ〉最多 1 張，REST 登場。印刷沒有顏色、必要能源、AP 上限。已登錄的 SAO-2-019（必要能源 2）與 SAO-1-045（必要能源 0）都可以。不是ピナ的不算。手牌與對手的ピナ不算。進場是 REST。SAO-2-019 進場後，自己回合、場上有シリカ時 BP 是 4000（印刷 2000，加上既有的己方回合 +2000）。對手回合回到 2000。前線的シリカ發生能源仍是 0。該頁 2026-10-22 沒有 FAQ。
- **EX08BT/SAO-2-034** エイジ。攻擊時，自己牌庫頂最多 1 張放場外。可以不放。不放時牌庫頂留在原位。放了就只移那一張到場外，然後開阻擋。選擇不公開那張牌。空牌庫與被封印直接進阻擋。發生能源 alt 是「紫」，gen 1。必要能源紫 2、AP 1、BP 3000、特徵 SAOサバイバー。標準 ACTIVE Trigger。該頁 2026-10-22 沒有 FAQ。

### Batch C：別名與特徵牌頂放場外

`1a5b965c300777109c305dc47e40cb85fcc89046`

- **UA54BT/MST-1-065** フィッツ。也視為〈シルフィエット〉。登場時看自己牌庫頂 2 張，特徵正好是 `ラノア魔法大學` 的最多 1 張放場外，其餘以想要的順序放回牌庫頂。`ラノア魔法大學／別` 這種斜線複合特徵不算。沒有符合的就不開「放場外」，直接排順序放回頂端。費用 alt「綠-」是能源 0。發生能源 alt「綠」是 gen 1。BP 1500、特徵ラノア魔法大學、標準 ACTIVE Trigger。`effectJa` 對的是目錄字串，含換行與空格。該頁 2026-10-22 沒有 FAQ。Q87：場上未封印時別名算；封印後別名拿掉，印刷名字フィッツ仍算。場外沒有另做封印。

### Batch D：搭檔 BP 與付 AP 的 REST 登場

`79fde3d65bc48b35c8faff1ac61872a1e281d19f`

- **UA56BT/TTG-1-007** ギミー 與 **UA56BT/TTG-1-013** ダリー。兩句都做了。自己場上有對方名字時 BP+1000。手牌、場外、對手不算。能源線的搭檔也算。任一回合都算。自己被封印後回到印刷 1500。從手牌登場時可付 1 AP，然後把自己場外、必要能源已滿足的搭檔最多 1 張 REST 登場。先攻第一回合打出這張會用掉僅有的 1 AP，付費選擇不開。自己的第二回合有 2 AP：打出花 1，不付則搭檔留在場外、剩下的 AP 還在；付掉之後，能源 0 的搭檔可以 REST 到能源線，而且不再開第二次付費，來源 BP 變成 2500。綠色 1 點付得起能源 0 的ダリー與未封印的別名，付不起必要能源 2 的綠卡，也付不起必要能源 1 的藍卡。效果登場的搭檔不再開這次付費。費用 alt「綠-」是能源 0。發生能源 alt「綠」是 gen 1。BP 印刷 1500。特徵 `大グレン団`。007 是 ACTIVE Trigger，013 是抽牌 Trigger。兩頁 2026-10-22 都沒有 FAQ。

這輪不改引擎就完整移植的是 0 張。A 到 D 都依賴共用引擎提交。第十七輪的 1 張、第十六輪的 1 張、第十五輪的 4 張不在這裡重算。

這輪看過、仍不登錄：SLG-1-072。官方頁 2026-10-22 抓過，沒有 FAQ。登場時自己場上［特徴：DFN］有 3 張以上就抽 1。印刷特徵是一個トークン `DFN／第四次架南島レイド`。發生能源 alt「綠綠」是 gen 2。費用綠 3。名字ミズア。斜線沒有拆開。本輪五張移植之後沒有再抓其他官方頁。

### 登錄數（`node scripts/v2-unported-report.mjs`）

| 作品 | V2 正式登錄 | 未移植 |
|---|---:|---:|
| BLEACH | 97/276 | 179 |
| TTG | 35/81 | 46 |
| SLG | 40/80 | 40 |
| SAO | 91/183 | 92 |
| MST | 48/80 | 32 |
| 合計 | 311/700 | 389 |

本輪正式新增 5 張：SAO-1-043、SAO-2-034、MST-1-065、TTG-1-007、TTG-1-013。其中不改引擎就移植的是 0 張。嚴格全面官方 FAQ 驗收仍為 0。合成測試卡沒有計入。正式登錄、測試通過、全面 FAQ 認證是三件不同的事。

### 本輪實際測試（Node v22.23.4）

- `npm test`：1674 tests、1674 pass、0 fail、0 skipped。時間 2026-10-22 17:53（台北時間）。
- `node scripts/v2-integrated-match-matrix.mjs`：60/60 finished，failures 0。
- `node scripts/v2-assert-independent-manifest.mjs`：bleach 97、gurren-lagann 35、solo-leveling 40、sword-art-online 91、mushoku-tensei 48；total 311。
- `node scripts/v2-unported-report.mjs`：700／Pilot 311／尚未移植 389／嚴格全面驗收 0。
- 上面是本機結果。GitHub Actions 尚未跑本輪。`39754862677` 只屬於 `a363081`。

### 未完成與下一輪

- Q73 與逐張 LIFE 的差異仍開放。
- 未審核的 Raid 幾何與連鎖 Raid 仍 fail closed。
- 2回アタック與 2回ブロック都沒有「同一 UID 離場再登場後次數歸零」的專用 FAQ。目前保留該回合的次數。
- 「自分の効果で登場」不含 LIFE Trigger。這是沒有卡牌 FAQ 時的 fail closed。
- 前線上起動或條件得到的發生能源不加進資源。
- SAO-1-003 的「黃+」與 gen 2 再加 `activeExtraEnergy` 仍未改。
- 起動或退場選擇之後才被封印時，已獲得的能源與 BP 不收回。沒有對應 FAQ。
- 主要階段結束時，真退場與回手同時發生的順序沒有 FAQ。目前先退場、再回手。
- 埋在 Raid 底下的層不會被延遲回手或延遲退場抽出來。
- 斜線複合特徵維持一個完整トークン。SLG-1-072 因此仍不登錄。
- 互相讀取現在 BP 時，正在計算的那張不再展開自己的被動。這不是另一條 FAQ，只是避免循環。
- `originalEffectsDisabled` 只作用在場上的卡。場外的卡不會被封印，場外別名因此一直算。沒有另做場外封印。
- 全面 FAQ 認證仍為 0。沒有瀏覽器或手機手動操作驗收。
- 下一輪最接近、但這輪沒有完整印刷支援的卡：
  - `SLG-1-072`：要先決定斜線複合特徵能不能在特定效果裡拆成 `DFN`。官方頁已抓，沒有 FAQ。登場時自己場上［特徴：DFN］3 張以上抽 1。特徵是一個トークン `DFN／第四次架南島レイド`。發生能源「綠綠」是 gen 2。
- 本輪五張之後沒有再抓其他官方頁，所以不另列尚未核對印刷的卡。


## GPT 接手 Cursor PR #77（2026-10-22）

**目前最新工作分支** `gpt/v2-resume-20261022`；獨立 Draft PR [#78](https://github.com/will00t-debug/Ua/pull/78)，合併目標是 `cursor/v2-multi-retire-life-6ff5`，不是 main。由 Cursor 已驗收第十八輪 HEAD `e12b0ca225e5b099a2cbae70cdae39d9b25d3cd7` 建立，沒有複製新專案、改寫 Cursor 分支、合併 main、部署正式站或 force push。Cursor 原 Draft PR #77 仍留在原本分支。保留第十一至十八輪原有成果。

**第一批：官方複合特徵的可審核語意。** `5df01cd8f368478d264d615f872a13cb44265a1f` 新增 `traitComponents`（只接受已在來源適配層明確審核的卡面），保留官方原始 `traits:["DFN／第四次架南島レイド"]` 完整 token，不把其他未審核斜線字串猜成兩個特徵。SLG-1-069、SLG-1-065 有獨立來源證據。共用 `cardHasTrait`、`ownTraitCount` 與 distinct trait count 支援經審核複合特徵。首輪 CI [39762663751](https://github.com/will00t-debug/Ua/actions/runs/39762663751) 1675/1677，兩項失敗是自製 fixture 漏 `continuousStates`，及 SLG-1-062 舊測試錯誤排除帶有官方複合特徵的 069。修正 `dc8261cf634c18c4f32ea79180c0a9b74583871a` 的遠端 [39762978752](https://github.com/will00t-debug/Ua/actions/runs/39762978752) 成功。

**第二批：解除 SLG-1-072 阻塞。** `e2cc69c63247f9e449843bf8383ddfe771a1f163` 實作可跨作品重用的 `drawIfOwnTraitCount`，明確定義己方 front/energy 範圍、是否排除自己、特徵原文 token、最少卡數及抽牌數；在真實 `onPlay` 結算時判斷而非登場前快照。官方 UA51BT/SLG-1-072 ミズア，綠 3／AP 1／BP 2000／產生綠 2／無 LIFE，己方場上［DFN］含自身共至少 3 張時抽一張。登錄唯一實際新卡 `SLG-1-072`，加入獨立 manifest、正反測試及本標題官方證據，更新 `audit/v2-c-slg-status.csv` 確認來源與審核狀態。CI 初期因漏同步 strict template allowlist、title pack 證據與 CSV 造成報錯，經 `30d82ac1c6c7974820c60631dac6e9a73bba95ba`、`ed21e7deab13893a439b550ef2851e1f6a69a169` 修正後，[39763959023](https://github.com/will00t-debug/Ua/actions/runs/39763959023) 遠端成功。所有舊規則與卡牌保留。

**第三批：共用特徵目標一致性。** `b9fbcb95967fb1d93c20e3e05c5624f7af9127e9`：`buffOwnTrait`、`buffOwnTraitAllTurn`、`main-two-buff`、`effect-buff-trait` 以同一來源審核 `cardHasTrait` 選擇或再次核對實體 UID，不任意拆解未審核複合字串。新增合成跨區域、跨玩家、確切印刷與未審核負例測試，不視為新增實卡。遠端 [39764357733](https://github.com/will00t-debug/Ua/actions/runs/39764357733) **Node 22 成功**。

### 截至程式 SHA b9fbcb9 的獨立遠端驗收

- **GitHub Actions**：Node v22（`actions/setup-node@v4` version `22`），2026-10-22，run `39764357733`；`npm test` **1683/1683 pass, 0 fail**；`node scripts/v2-integrated-match-matrix.mjs` **60/60 finished、0 failures**；`node scripts/v2-assert-independent-manifest.mjs` **success、312 IDs**；`node scripts/v2-unported-report.mjs` **success**。
- 五作品正式登錄：BLEACH 97/276、TTG 35/81、SLG 41/80、SAO 91/183、MST 48/80；**312/700**；未移植 **388**（BLEACH 179、TTG 46、SLG 39、SAO 92、MST 32）。本輪只新增正式卡 `SLG-1-072` 一張。
- **沒有本地 clone / 本地 Node 測試**：此執行環境對 GitHub clone DNS 解析失敗，所有成功數字指向 GitHub Actions，不假稱本地通過。
- **官方 FAQ 全面逐卡認證：0**。正式登錄、Node22 自動測試、五作品矩陣與完整官方 FAQ 驗收是四件不同的事。本輪只對有限印刷內容及語意人工核對；沒有手機或正式站手動 QA。
- 原始 Cursor 第十八輪與此前數字保留在以上歷史段落；以此節的 GitHub Actions 數字為 GPT 接手驗收依據。**本次文件提交後新 SHA 需另看自己 CI**，不能套用上述結果。

### 下一批應處理

1. 繼續分離經官方證實的複合特徵與未審核 slash；某些舊 `matchesFilter` 仍有字串拆分歷史行為，**本輪沒有擅自統一或宣稱已完備**。
2. 通用區域移動事件／來源追蹤（原效果、付款、LIFE、手牌／場外／場上）；帶明確實體 UID、觸發時間與可見性。
3. DSL 費用＋合法目標＋時機＋條件組合；未審核 Raid 幾何與連鎖 Raid 繼續 fail-closed。
4. Q73、DAMAGE(2)、LIFE Trigger 結算相異；再登場 UID 攻擊／阻擋計數歸零尚無正式依據不得猜測。持續比對官方 FAQ 再實作。
5. 不為增加卡數而新增大量作品專用 `if`；下一批要有共用能力、反例、測試與明確紀錄。


## GPT 第十九輪｜統一特徵與私有移動來源（2026-10-22）

**最新程式 SHA `7ad676e42bc6b3fbc97edeee60f4110d899268d0`**；本輪沿用
`gpt/v2-resume-20261022` / Draft PR [#78](https://github.com/will00t-debug/Ua/pull/78)
→ `cursor/v2-multi-retire-life-6ff5`，原 PR #77、main、正式站均未修改、未部署、未 force-push。
第十一～十八輪 Cursor 成果和 GPT 前輪的 SLG-1-072、複合特徵能力均保留。

### 已執行的五個相關批次（含驗收修正）

1. **Batch A** `55123874f274b957d8e860540a15ea69489d810a`：
   `matchesFilter` 的不安全 slash 字串任意拆分改為已存在的
   `cardHasTrait`；主階段 trait mode 合法性與 Raid 後 BUFF 模式也共用
   同一來源審核語意。MST-1-065 的 `inspectTopTraitOutside` 仍依原印刷
   exact-token 規則嚴格比對，不擅自改語意。新增
   `tests/v2-r19-trait-selector.test.mjs` 和
   `docs/v2-handoff/V2-R19-trait-path-audit.md`。Actions
   [39765760482](https://github.com/will00t-debug/Ua/actions/runs/39765760482) 成功。

2. **Batch B1** `eccffd3dc3f0c6422933dc7edfa4032264a6292a`：
   新增單一共用來源輔助模組
   `dist/universal-v2/zone-move-events.mjs`，掛入既有 V2 reducer，
   每筆完成的私有事件有物理 UID、cardId、owner、controller、
   來源／目的區域、原因、來源 UID/印刷姓名與顏色、當下來源是否在場、
   回合及單調序號。接入已完成的手牌棄牌費用、效果棄牌、場外回手，
   保留 `turnEffectZoneMoves`；非法選擇／預覽／跳過不造假移動。
   Actions [39766215458](https://github.com/will00t-debug/Ua/actions/runs/39766215458) 成功。

3. **Batch B2** `f693a14950e2f1027f6db161ae375655b7c4a499`：
   在既有成功移動點記錄真退場、部分場外效果入場、
   LIFE 傷害移往場外、LIFE GET 回手、COLOR 從場外入場及 Raid 頂牌剝離；
   保留原本退場／Raid／LIFE 效果排序。Actions
   [39766727055](https://github.com/will00t-debug/Ua/actions/runs/39766727055) 成功。
   後續 `3bec0ce6723c59b4b51efe602d1dab7d0bbc4f0f`
   增加已完成的 deck→outside、部分 TOP-N 放場外、
   field→hand 自身回手與一般手牌登場來源紀錄，配合
   `7ad676e42bc6b3fbc97edeee60f4110d899268d0` 的舊測試相容修正後遠端驗收通過。
   這**不是**所有區域移動的完整覆蓋；draw deck→hand、特殊 Raid
   幾何與少數其他路徑仍需逐項補審。

4. **Batch C** `f29ed2056f9bdc7015a59fe10fd595eaa47566a4`：
   `validateCompletedMoveCondition`、`matchesCompletedMove`、
   `completedMovesMatching` 僅選擇真正完成、有來源證據的紀錄，
   嚴格限定條件鍵與 enum，允許指定來源、玩家、移動方向及
   payment／own-effect 等具區別的原因。基於 BLC-2-047
   官方 EX07BT 卡文與 **Q1033／Q1046／Q2315** 撰寫負例測試與來源文件。
   **不在移動瞬間盲目執行觸發，也尚未實作來源效果整段結算後入列**。
   BLC-2-047 與 BLC-2-019 的完整聯動未驗證，兩卡不得因本輪視為完成。
   Actions [39767072980](https://github.com/will00t-debug/Ua/actions/runs/39767072980) 成功。

5. **Batch D/E 驗收** `d202228be6ce481d6284ff32b08a693170c67c84`：
   既有 `chooseOne` → `discardGate` → `oncePerTurnGate`
   → `draw` 可以使用原共用 effectQueue、合法動作及 AI
   而不新增 op；加上可選成本、非法 UID、取消、負面 DSL 資料測試。
   另在 `V2-R19-dsl-and-faq-audit.md` 盤點未完成官方規則。
   Actions [39767402456](https://github.com/will00t-debug/Ua/actions/runs/39767402456) 成功。

### 回歸處理與相容性

- `eeab663b5adcf311723d12aef6556f23cd448c5f`
  首先正確區分對手強制棄牌為 `opponent-effect`（owner/控制者不同），
  但舊 `turnEffectZoneMoves` 有歷史較寬布林行為，
  GitHub Actions [39767604952](https://github.com/will00t-debug/Ua/actions/runs/39767604952)
  顯示兩個原有案例受影響；`7189d5ab61f882e87ff49f7977c67d0b612fb3dd`
  恢復舊布林行為，**新的細分移動來源仍正確**，避免既有卡牌回歸。
  [39767808268](https://github.com/will00t-debug/Ua/actions/runs/39767808268) 成功。
  對手效果來源必須用新 journal，**不可**靠舊布林辨認。
- Deck mill / paid-play journal 擴充版 `3bec0ce` 的遠端
  [39768100161](https://github.com/will00t-debug/Ua/actions/runs/39768100161)
  1693/1696 通過、3 fail；其中舊 fixture 直接 `s.turn++`
  和兩個新測試假設一般登場沒有事件。修正
  `7ad676e42bc6b3fbc97edeee60f4110d899268d0` 後完整通過。
  **不刪除任何失敗測試，也沒有撤銷實際登場來源紀錄。**

### 最後一個程式提交的實際驗收

**GitHub Actions [39768352364](https://github.com/will00t-debug/Ua/actions/runs/39768352364) —
`7ad676e4` — Node.js 22 — success**：

- `npm test`：**1696／1696 pass；0 fail**。
- `node scripts/v2-integrated-match-matrix.mjs`：**60／60**；0 失敗。
- `node scripts/v2-assert-independent-manifest.mjs`：通過，
  BLEACH 97、TTG 35、SLG 41、SAO 91、MST 48；合計 **312**。
- `node scripts/v2-unported-report.mjs`：通過，五作品共 **700**，
  V2 已登錄 **312**、未移植 **388**；全面官方 FAQ 認證 **0**。
- 本輪淨新增實卡 **0**；合成測試與資料驗證器絕不計入。
- **沒有本地 npm test / 本地矩陣**：本工作環境無法 DNS 解析
  `github.com` 下載專案，完整通過數僅來自遠端 GitHub Actions。
  沒有進行實機 UI、正式站或完整官方 FAQ 手動驗收。
- 本次交接文件另提交新 SHA；**文件 SHA 的 CI 要另查**，不可沿用
  程式 SHA 的成功作為文件提交已驗收的證據。

### 官方規則風險與下一輪

- Q73（2023-03-17，Damage2）原文要求同時翻出多張生命卡並可
  選擇多觸發順序；現有 `additionalBattleDamage` 按次序逐張處理，
  存在 **已知尚未完成的官方規則差異**。未在本輪冒然更動核心。
  須連同 Q71／Q72、FINAL、Impact 與資訊揭露重新設計和驗證。
- Q1033 明示 BLC-2-019 全部起動效果結算後才觸發 BLC-2-047；
  來源條件資料已可查詢，**跨效果完成邊界排隊尚未實裝**。
  Q1046 不需事件卡藍2能源；Q2315 即使後續埋入裏向底牌仍可觸發。
  先完整審核來源卡與 source effect queue boundary，再考慮正式移植。
- 其餘：多重退場／中斷恢復、MAIN 結束真退場與回手排序、
  未審核 Raid 多層幾何／連鎖 Raid、物理 UID 離場再入場後的
  攻擊阻擋次數、封印後的既成效果、尚未記錄的移動路徑，維持
  保守判定與回歸保護。
- 下一輪優先（1）補齊常見移動 journal 缺口與來源 snapshot
  （2）設計單一共用 after-source-resolution trigger drain
  （3）BLC-2-019／047 真卡測試（4）Q73 DAMAGE2 simultaneous
  life reveal 的獨立狀態與 hidden-information 驗收
  （5）跨標題 AI／人類一致性、UID 再入場 FAQ。


## GPT 第二十輪｜來源效果結算邊界與完整移動事件（2026-10-22）

**沿用分支** `gpt/v2-resume-20261022`、Draft PR #78 →
`cursor/v2-multi-retire-life-6ff5`；起始 HEAD
`fd469bb86ce1817a9d1b1e504590959d7c437211`，
最後已驗收**程式** SHA `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`。
沒有建立新分支、改 main、改 Cursor PR #77、部署正式站或 force push。

### 五批實作與各自提交

1. **A：真實抽牌的 deck→hand 事件** —
   `e9bbda244530759cce6763439cd3827029d73d78`，
   改善 `draw` 共用呼叫並使用已存在的 completed move ledger，
   每一張抽到手中的物理 UID 留下順序／來源；
   一般規則抽牌與已完成的來源效果抽牌分開，
   opponent 不能從 `universalPublicView` 取得隱藏身分。
   Node22 遠端 [39770014603](https://github.com/will00t-debug/Ua/actions/runs/39770014603)
   **1698/1698、矩陣60/60**。

2. **B：指定牌庫搜尋與 LIFE 移動** —
   `a6bd8034c878f0bfc396409e5af46e1626c0225a`：
   單張/多張 deck search、top-filter 命中 deck→hand、LIFE
   RAID/GET 外→手、FINAL deck→life、COLOR hand→field，
   結束手牌超限 hand→removed 等移動成功後記錄來源。
   初次 [39770413261](https://github.com/will00t-debug/Ua/actions/runs/39770413261)
   因新合成測試忘記宣告既有 `shuffle:true` 造成一項檔案層級失敗；
   修復 fixture `d6f257851206e12f8c46674afd2a36dd075215e9`，
   未放寬正式 DSL 驗證器；[39770801984](https://github.com/will00t-debug/Ua/actions/runs/39770801984)
   **1700/1700、60/60**。

3. **C：來源效果整段結束後才處理移動觸發** —
   `343357a690f19f9f3b90f7daafd8b2532f9fe920`。
   可審核 `moveTriggers` 印刷來源 profile（來源名稱/顏色、
   hand→outside、支付/己方效果、真實 field residence），
   用既有 `sourceResolutionBoundary` **內部**效果隊列哨兵，
   把符合條件的移動卡片 `then:[{op:'draw',count:1}]`
   放在**造成它的來源程式及其合法選擇結束之後**。不是新的
   reducer/作品專屬分支。非本 profile 的效果、對手效果與非法來源
   fail-closed。純合成來源測試與錯誤 profile 測試；
   [39771274699](https://github.com/will00t-debug/Ua/actions/runs/39771274699)
   **1703/1703、60/60**。

4. **D：MAIN 起動費用邊界** —
   `2e38aa36216f34f3d462814c90d204f80e0b44ed`。
   `discardHandBuffSelf`、`restSelfThen`、
   `frontOnceProgram` 的整段完成點加入同一通用邊界；
   尤其先**確實棄牌／支付、完成 BP 與剩餘主能力**，再觸發
   被送場外的卡。測試 wrong sourceName、sourceColor、非法 UID，
   Normal/Hard AI 使用既有 legal actions。
   [39771651317](https://github.com/will00t-debug/Ua/actions/runs/39771651317)
   **1706/1706、60/60**。

5. **E：多實體與序列化驗收** —
   `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`，
   在同一來源依序棄兩張相同印刷卡但不同**物理 UID**時，
   第一張不提前觸發，等第二張也確實移動、來源其餘效果完成，
   各自依序觸發一筆而不複製/遺漏。
   驗證內部 `sourceResolutionBoundary` 欄位，
   拒絕虛構 UID、越界／非整數順序與多餘欄位。
   [39772113594](https://github.com/will00t-debug/Ua/actions/runs/39772113594)
   **1708/1708、60/60**。

### 程式最後一版 Node.js 22 遠端集中驗收

- **程式 SHA** `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`；
  GitHub Actions [39772113594](https://github.com/will00t-debug/Ua/actions/runs/39772113594)：
  `npm test` **1708 tests / 1708 pass / 0 fail**；
  `node scripts/v2-integrated-match-matrix.mjs` **60/60 finished、0 fail**；
  `node scripts/v2-assert-independent-manifest.mjs` **success**；
  `node scripts/v2-unported-report.mjs` **success**。
- 五作品維持 BLEACH **97**、TTG **35**、SLG **41**、
  SAO **91**、MST **48**，**312/700 V2、未移植388**，
  本輪正式新增 **0**、全面 FAQ 每卡認證 **0**。
  `moveTriggers` 測試只用合成 `K/U/J` 卡號，不列入卡冊。
- **沒有本地 Node22 / npm test**。歷史 clone 的 GitHub DNS
  解析失敗，所以唯一完整驗收來自 Actions，未進行正式站或手機
  UI 驗收；本份**文件提交**的 HEAD CI 要另行確認。

### 正式來源與尚未支持的部分

- 官方 [EX07BT/BLC-2-047](https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=EX07BT%2FBLC-2-047)
  **「その名は斬月」**：藍2／AP1 事件；一般使用抽2；
  **己方場上的藍色〈黒崎 一護〉效果把該物理事件從自己手牌送至場外**
  時，後續抽1；非任意 discard／pay 皆可觸發。
  [Q1046](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT)
  不要求額外能力觸發時支付印刷藍2能源。
- [EX07BT/BLC-2-019](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1)
  除 main 限定卡名含斬月／月牙的棄牌費用，還有 Raid、登場時雙目標
  BP-1500、自己 main 抽1、BP+1000 與授予攻擊時可抽牌。
  [Q1033](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT)
  指明先完整處理此 MAIN，再結算 047 抽1。
  [Q2315](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT)
  證實後續把 047 放到別的角色下面裏向，仍可發動抽1。
  **本輪沒有正式移植 BLC-2-019 或 BLC-2-047**；
  尚需嚴格名稱過濾費用、Raid/上場目標、
  主階段授予 attack draw 與 Trigger 完整正負例，不能只加
  `moveTriggers` 就宣布全卡支援。

### 下一輪精確缺口

1. source boundary 目前覆蓋 **onPlay** 與三種既有 MAIN 來源；
   onAttack／phaseOrder／Raid entry／onOutsideRecover 等
   來源程式還沒有完整一致的 boundary；
   中途 onRetire 插入與來源封印規則需獨立官方審核。
2. `moveTriggers` 當前是**限制嚴格的原語**（已核對 hand→outside
   + own named/color field source + draw），不是任意
   zone→zone/任意 nested ops 的通用驗證認證。
   費用中的指定印刷名字比對與後續重複移動，
   必須擴充證據及反例。
3. 既有私有 journal 仍未列舉完成所有 Raid-under、
   full-line replacement／removal、部分 LIFE/Raid
   實體層移動。不得假稱 event bus 全路徑覆蓋。
4. **Q73 / DAMAGE2** 多張 LIFE 同時翻開與觸發次序；
   Q71/Q72、Impact/FINAL 組合未完整驗收，沒有
   冒然改動既有戰鬥核心。
5. MAIN end 同時退場回手、層疊 Raid、
   同 UID 再入場後攻擊/阻擋次數、
   已取得效果與原效果封印時序仍需正式 FAQ。


## GPT 第二十一輪｜完整移動來源邊界與 Q73 LIFE 狀態模型（2026-10-22）

沿用 Draft PR #78 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。起始 HEAD `e5b0c87e17df4845be2fd3e8ea6288eeac15f670`，對應遠端 Actions [39772556209](https://github.com/will00t-debug/Ua/actions/runs/39772556209) 成功。未修改 main、原 Cursor PR #77、正式 Vercel 站，未 force-push。此執行環境無法 clone（DNS 失敗），因此以下均為 **GitHub Actions 遠端 Node22**，不是本地執行。

### 本輪分批提交（保留既有 DSL 與單一 effectQueue）

1. **A：新增已完成物理移動**：程式 `198450e835852a12bd71b3f28fd0e9fbcf831964`、測試 `c31ce885b2932f8aca6d57e511701da5004f5397`。補記 MOVE energy→front、STEP front→energy、回收後自身 hand→energy；僅在真實變更後記錄 UID、所有者、來源與區域。負例驗證非法 action 不改狀態及公開視圖不洩露私有 journal。Actions [39775002964](https://github.com/will00t-debug/Ua/actions/runs/39775002964) success。
2. **B1：來源攻擊及階段結算**：程式 `2a58bc547a12f1e3112d4fd8849a0f300bfd2d2c`、測試 `e4a865270fc70ebf95ee22d172c420b91d1c5dde`。onAttack 在 openBlock 前加入原共用 sourceResolutionBoundary；phaseOrder 每個實際選定來源效果先完成選擇、棄牌及追加能力，再釋放該來源的已完成移動觸發。Human、Normal/Hard AI 共用 legal actions。Actions [39775321902](https://github.com/will00t-debug/Ua/actions/runs/39775321902) success。
3. **B2：Raid / 回收來源邊界**：程式 `7afba4c607514ff7aab7b696e36ea9235ed56e2b`；新測試 `01a613651768476e939d9b4abc78b7d5040d5a10` 首次 Actions [39775596552](https://github.com/will00t-debug/Ua/actions/runs/39775596552) **failure**，原因為合成 onRaided fixture 使用 pack 驗證器不允許的 draw op（非引擎回歸），修正測試 `3c4f16785bc3a2b0d0a7c0fad4b99d091fde6a87` 使用既有 drawIfRaidUnderFacedown；Actions [39775974235](https://github.com/will00t-debug/Ua/actions/runs/39775974235) **success**。保持 Raid baseFirst / entryFirst 合法選擇、base onRaided 及頂牌 onPlay/onRaid 分別來源、頂牌共享一次完成邊界；onOutsideRecover 接入同一 queue。沒有為通過測試放寬 validator。
4. **D：Q73 同時公開的純規劃模型**：程式 `fb1b90d7cb7932ff80f86f9362ac3d7cb7f701fa` 新增 `life-reveal-batch.mjs`，測試 `1729defcd6e9957a636ca7447b7f8d621159d649`。函式 `planSimultaneousLifeReveal` 僅在私有狀態上保留同批最上方 min(傷害,目前 LIFE) 的物理 UID，避免非法/重複 UID；不改既有 `damage()`、`effectQueue`、LIFE、公開牌、勝負或選擇流程。Actions [39776021769](https://github.com/will00t-debug/Ua/actions/runs/39776021769) **success**；這是獨立設計／測試，**不能稱 DAMAGE2 已修正**。
5. **E：覆蓋及官方差異盤點**：`docs/v2-handoff/V2-R21-move-coverage-and-Q73.md`（提交 `b1f4de60ba968c6fa1e28bd44414a8b1a551b3e1`）列出已覆蓋與缺漏的每項物理移動、來源無法辨識原因、特別 Raid 地層、Q71/72/73 與 Q35/36/38 差異、完整 BLC 印刷移植 gate。

### 正式移植及限制

- 本輪正式新增卡牌 **0**；最新已確認盤點仍為 BLEACH 97、TTG 35、SLG 41、SAO 91、MST 48，共 312/700、未移植388；須以每次實際 manifest / report 更新數字，不能當作永遠不變。
- **BLC-2-019／047 仍未登錄，完整官方能力仍欠：斬月/月牙特定名稱費用、兩敵方目標的 BP 變更、MAIN 完整抽牌/BUFF/授予 onAttack、合法 Raid 與 LIFE trigger 正反例。** 共用移動來源原語不等於完整兩卡驗收。Q1033、Q1046、Q2315 的來源與限制見 R20、R21 文件。
- **Q73 未整合核心**：原 `additionalBattleDamage` 仍逐張 LIFE 結算，未符合多張同時公開及玩家選擇多 Trigger 順序；Q35 的無 Trigger 時序、Q36 雙 FINAL、Q38 onPlay 插隊必須一併納入既有 effectQueue。避免只為 Q73 改壞 LIFE、IMPACT、SPECIAL、FINAL 的其他流程。
- **Raid under / full-line replacement / hidden face-down protection** 等實際移動仍有 journal 缺口；`raid-under` 不在 direct `players[p][zone]` 陣列，不能假造符合 helper 驗證的事件。原來源封印、退場中斷及同 UID 回場攻阻計數尚未官方全驗收。
- 本輪以合成精準測試和原有全標題回歸護欄驗收，**全面逐卡官方 FAQ 認證仍為 0**，未做正式站或手機手動 QA。
- 本段文件之提交 SHA 與最新遠端 CI 應另外核對；不能沿用更早成功 run 作為最新驗收。

**下一輪首要工作**：先用 Q35/Q36/Q38 官方語意把 Q73 原子 reveal 與動態觸發選擇接到 **原 effectQueue**；其次針對 Raid-under 真正巢狀 destination 擴充驗證／journal（含完整替換與隱藏資訊）；然後才考慮 BLC-2-019/047 full-card 移植。禁止半成品註冊、合併 main 或部署正式站。


## GPT 第二十二輪｜Q73 正式整合、Raid 底板與滿場替換（2026-10-22）

**此段覆蓋前述 R21「Q73 未整合」／Raid-under 缺口的舊狀態；不要再將 R21 快照當最新成果。** 詳見 `docs/v2-handoff/V2-R22-Q73-raid-replacement.md`。在程式 SHA `4545153f23639934d99359bb9485768e27e71681`，GitHub Actions [39780010025](https://github.com/will00t-debug/Ua/actions/runs/39780010025) **SUCCESS**：Node.js 22 **1725/1725**、跨五作品對戰 **60/60**、manifest 與未移植盤點步驟通過。

- Q72/Q73：原 `effectQueue` 接入 `life-reveal-batch.mjs`；DAMAGE2 一次公開正確數量的物理 LIFE UID 到暫時 `lifeRevealed`，防守方可決定兩張卡及無 Trigger 卡的處理順序；GET/DRAW/SPECIAL/COLOR/RAID/FINAL 由原引擎處理，Q35、雙 FINAL Q36 已有驗證。既有真實卡牌與跨作品測試改為核對「同時公開、依序結算」，不是刪除測試。單次傷害、Impact 保留原行為。
- Raid：`raid-under` destination 現在驗證場上巢狀實體 UID，`performRaid` 記錄底板 FRONT／ENERGY→raid-under 與 Raid 頂牌 HAND／OUTSIDE／LIFE 公開暫存區→場上；剝離頂牌時底板回 FRONT；滿場替換的每一張頂牌／下層卡分別記錄進 removed，非真正退場不觸發退休效果。具 UID、擁有者、負例和私人視圖測試。
- **未完成限制**：Q38「登場後新觸發與未結算 LIFE Trigger 的動態交錯」未完整官方逐例驗收；巢狀第二次傷害仍須明確官方時序；消耗 faceDown 保護卡與其他 hidden-layer 移動尚有 journal 缺口；BLC-2-019／047 未註冊、全卡 FAQ 正式逐卡審核仍未完成。本輪正式新增卡牌 0。
- 最新上游操作基準：PR #78，`gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`；維持 Draft／不改 PR #77，不合併 main，不部署正式站。下輪必須先重查當下最新 HEAD、CI 與衝突，再續增測試。


## GPT 第二十二輪｜Q73 同時 LIFE、Raid 埋底與滿場替換 UID（2026-10-22）

**最新程式驗收基準（2026-10-22）：** `4545153f23639934d99359bb9485768e27e71681`；[GitHub Actions #39780010025](https://github.com/will00t-debug/Ua/actions/runs/39780010025) **success**：遠端 Node 22 **1725/1725 tests**、跨五作品完整 **60/60 matches**，manifest 和 unported report 通過。這是**程式 HEAD**；後續交接文件更新為文件專屬 commit，須對應再查 CI。

- **A：Q73 / DAMAGE2** 已在原 `engine.mjs` / **唯一原始 `effectQueue`** 實作同時公開（原先 R21 僅純 planner），暫存在實體 `lifeRevealed`，使用內部 `lifeRevealBatch` 與玩家合法 `chooseLifeOrder`，保留隱藏 LIFE 私隱及精確 UID。包含 Q72 最後一張 LIFE、Q35 無 Trigger 與有 Trigger 選擇、Q36 雙 FINAL（同一合法印刷 ID 兩張不同 UID）。原 BLC／MST 真實 COLOR FIELD、SPECIAL retirement、印刷 DAMAGE2 及攻擊次數的舊測試已按官方同時翻開修正，未刪測試。
- **B：Raid 真正巢狀 destination** `zone-move-events.mjs` 在 `raid-under` 查實際現存的 `stack/under`，而不是不存在的頂層陣列；實體 `performRaid` 各記錄 base field→raid-under 和 top hand / outside / lifeRevealed→field；頂牌剝離另記 base raid-under→front。完整 UID、owner、source 驗證和偽造負例；仍未推廣稱所有巢狀路徑 100% 覆蓋。
- **C：滿場替換** `commitDestination(pack,...)` 保證被替換的 visible top 和每一張 nested UID 進 `removed` 都有獨立已完成事件，且不是 onRetire。新增精確負例／公私資訊護欄；全矩陣通過。
- 完整程式範圍、具體 commits、限制、下輪目標見 **[V2-R22-damage2-raid-movement.md](./V2-R22-damage2-raid-movement.md)**。對 R21 文件中「Q73 未整合」的敘述，應視為**當時歷史狀態**而非這輪最新現況。

**剩餘實質缺口：** Q38 同次 LIFE 已進場後 newly-generated onPlay 對其他未處理 Trigger 的**動態選擇交錯次序**尚未完整官方驗證；巢狀重入 LIFE batch 目前 fail-closed；真退場 `vacate` 埋底、裏向保護消耗，以及少數移除實體來源路徑仍未完全 journal；BLC-2-019/047 **尚未全卡移植**，不可擅自登錄。卡牌數未變，原清單 **312/700**、未登錄 388，今後須即時重算。此輪只動 PR #78 分支，不合併 main、不修改 #77、不部署正式站、不 force push。


## GPT 第二十三輪｜Q38 動態排序、LIFE 重入護欄、Raid／裏向移動（2026-10-22）

本段為最新狀態，覆蓋 R22 的「所有 Raid 底板跟頂牌一起除外」預期。
沿用 Draft PR #78，`gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`。
起始 HEAD `d4e7df1a75e57e96879b2d6a02c82f17ef2275ea` 的 Actions
39780840034 已核對成功。此輪成功本地 clone，沒有既有未提交修改；遠端
ref 每次更新帶 expected SHA 且 force=false。沒有變更 Cursor PR #77/main，沒有部署。

### 提交與驗收

| 批次 | GitHub commit | 實際完成 |
|---|---|---|
| A | `2ca2dd2e8cde6d556c61f06b6b60e150463e0b60` | Q38 COLOR／RAID 新登場完整程式加入原 lifeBatchStep.entries，可與剩餘 LIFE 自選；維持 Q73 原子公開。Actions 39783245996 success。 |
| B | `8be66387128b310327015927a8daded7df694489` | 連鎖 LIFE 未全面開放；補 single damage 不得繞過現有 batch 護欄、狀態不變反例與序列化來源檢查。Actions 39783462055 success。 |
| C | `7063c1656783dc19dd5d87fab0102077c32b74e7` | vacate 真正底層 UID 移動紀錄；Q60/Q61 底板進 outside，僅頂牌依指定目的區域移動／真正退場。首次 CI 39784297026 failure：舊測試仍期待底板 removed。 |
| D | `aa7bec926866379e43b25db367f1d7f09cd1ed13` | 裏向保護消耗與 rule cleanup 分開，記錄 attachedToUid、wasFaceDown、identityViewersBefore；實際 TTG073 vs BLEACH 驗收。首次 CI 39784693233 同樣因舊 Q61 預期 failure。 |
| C/D 回歸修正＋E 評估 | `266e7209879dc8201ef076b7a84b88e46fde9548` | 保留三個舊測試全部 AP／UID／pending 檢查，改正底板 outside 預期；官方 BLC 全能力缺口表。Actions 39784988524 success。 |
| A 人類選擇顯示 | `e70de995abb26cfdb7ece0ab8a8a5f5adb623f4a` | 顯示公開 LIFE 與新登場來源卡名。Actions 39785139959 regression 全部步驟 success。 |

**最後程式驗收 SHA：`e70de995abb26cfdb7ece0ab8a8a5f5adb623f4a`**。
[GitHub Actions 39785139959](https://github.com/will00t-debug/Ua/actions/runs/39785139959)：
Node 22 npm test、五作品矩陣、獨立 manifest、未移植報告全部 success。
本地 Node **22.23.4**：`npm test` **1734/1734 PASS**；矩陣 **60/60，0 failures**；
manifest/report 通過。最後顯示文字修正後另有 15/15 預覽測試及完整 1734/1734 通過。
本地測試版本樹與 GitHub 程式樹相同（`6f615de9869e6be577898979b260e8c1ddd9cc63`）；
shell git push 缺憑證，改用已授權 GitHub object/ref 工具逐批提交，並安全同步本地到遠端 HEAD。
無手動手機／瀏覽器視覺驗收。後續純文件 HEAD 的 CI 應分開確認，不能冒充程式 SHA 結果。

最新盤點：BLEACH **97/276**、TTG **35/81**、SLG **41/80**、SAO **91/183**、MST **48/80**；
共 **312/700**，未移植 **388**；本輪正式新增 **0**，全面逐卡 FAQ 認證 **0**。

### 官方結論與尚未完成

- Q35/Q36/Q38/Q71/Q72/Q73 已重新核對；Q38 確認新登場效果可與未處理 LIFE 自選，且仍在 trigger check。
  已實作同防守者 COLOR／RAID 完整 entry block 的排序、合法 action、Normal/Hard AI、暫停與恢復。
  **不是全面 Q38 認證**：跨玩家新效果、SPECIAL/onRetire 動態交錯、獨立 onRaid/onPlay 排序仍未完整驗證。
- **連鎖 LIFE 尚未安全全面支援**，不擴充第二套 queue 或 reducer。已補 single-damage 重入拒絕、狀態保存反例及後續模型要求。
- Q61 明確：Raid 頂牌除外時底板送場外。R22 舊報告與舊測試在此有誤，R23 修正。
  底板移動不算退場；裏向消耗不算退場；消耗後頂牌 BP 歸零是另一筆真正退場。
  日誌序號不是官方同時移動中的可選先後裁定。未新增未驗證多層 Raid 合法幾何。
- BLC-2-019／047 **仍未正式登錄**。重新核對 Q1033/Q1046/Q2315 與卡文，保留完整命名棄牌成本、
  雙 BP 目標、授予 onAttack、完整 Raid／Trigger 與場外再埋底資格的全卡驗收缺口。
- 下一輪優先：跨玩家 Q38/SPECIAL 時序與連鎖傷害官方依據；再做嚴格名稱支付與授予攻擊能力。

詳細規則時序、覆蓋與 BLC gate：`docs/v2-handoff/V2-R23-Q38-and-hidden-moves.md`。


## GPT R24 — Q38 cross-player, conservative LIFE reentry, named UID payment (2026-10-22)

**Use [V2-R24-event-priority-and-payments.md](./V2-R24-event-priority-and-payments.md) as the exact R24 handoff.**
Work branch `gpt/v2-resume-20261022`, PR #78 → `cursor/v2-multi-retire-life-6ff5` unchanged.
Starting `2711177ced2a15403863618cdba2a7d03cca6825` Actions 39785577234 success.
New code progression:
- A Q12 drain / cross-player SPECIAL→onRetire→FINAL and pending actor/AI: `88f93a44`, fixture corrections through `4d397ffd8d9b5aef16795e4ac5d3e7c264ffece3`;
- D named hand-payment DSL, strict UID and two-title Human/AI: `8842c7ddf5c5e1057c1527ed684285a2fd3b5d62`;
- B global other-player LIFE guard, cross-owner second-damage and FINAL replay: `336173a5ebe9a41c279a0fd4b97b1294faf4ca10`;
- C two same-print different-UID move trigger programs complete **after** source, both controllers: `68ddba44e5ff1e4ad3fa0a5e8048f7d6d231445c`;
- E official BLC gate, coverage matrix and handoff documentation: this later commit; recheck its actual CI.

**Latest pre-document verified CI:** [39790506182](https://github.com/will00t-debug/Ua/actions/runs/39790506182)
for `68ddba44`, Node22 **1746/1746 PASS**, five-title **60/60 PASS**, manifest/report success.
Failures at earlier intermediate test-fixture SHAs were corrected without loosening official validators.
No **local** full test this session (GitHub DNS from container failed); results are **remote Actions**.

Q38 cross-player SPECIAL/onRetire selected case works; unrestricted global Q38 not certified.
Nested second damage is still **fail closed**. Q12 zero LIFE waits for earned queue.
Source resolution covers known restricted timings; not every global cross-owner boundary.
Named `discardGate.payment` supports strict printed names incl substrings; granted
temporary onAttack and dual distinct BP targets **not** completed.
BLC-2-019 and 047 still **not registered**. Latest 312/700 (BLEACH97 TTG35 SLG41 SAO91 MST48),
unported388, net new0, full official per-card FAQ certifications 0.
No changes main, Cursor PR77 or production deployment; no force-push.
Next priority: granted attack-time DSL + two-target BP, then full Q1033/Q2315 BLC scenario
and simultaneous opponent trigger priority evidence, eventually nested LIFE official model.


## GPT R25 — target snapshot, temporary attack grant, completed MAIN composition

Complete detailed evidence: [V2-R25-general-grants-and-blc.md](./V2-R25-general-grants-and-blc.md). Original GPT PR #78/branch stays active and targets Cursor PR #77 branch; no merge/deploy/force-push.
R25 batches: A `30a60cbadfa50ec9353989dbd1484cbb92477134` (two distinct BP UIDs, previous CI SUCCESS [39793144785](https://github.com/will00t-debug/Ua/actions/runs/39793144785), Node22 1755/1755, matrix 60/60); B `06c1f66b11361ce66c96608870b2b1d20c6739ee` (grantOnAttack, stored per physical field stamp); C `faeb167dfb54e7c1264d7c0152a1fef4c596a4fe` (typed paid MAIN draw/buff/grant before move-trigger), D `1ac80609c2222c7899e85e3eb3a50a30c12417d3` (current-turn expiration and grantor departure), E `04495e2d1e689c799128c616a81a00f67c30d6c9` (real BLC official-print pilot, still unregistered); fixture fix `300ad3d87eb2025ea33e9b82400466ab80b19736`. **Latest Actions for full HEAD must be verified separately; intermediate B/C CI failed, later full runs were queued during handoff.** No local Node verification, only GH Actions. Registry baseline unchanged 312/700, 388 unported, full card FAQ certification zero. BLC-2-019/047 not registered until Q2315 and all full-card independent acceptance. Source timing, ownership, hidden faces and nested LIFE remain conservatively bounded.


## GPT R26 — Q2315/Q2316 physical earned trigger and source snapshot (2026-10-22)

See [V2-R26-Q2315-hidden-earned-moves.md](./V2-R26-Q2315-hidden-earned-moves.md) for exact official source links, code, test fixtures, remaining limitations and commits. R26 scoped five batches: A `1e9abec`, B `9c71791`–`0657e15` shared named move watcher/REST/under and both priority order tests, C `3e95acb` LIFE Raid + Q1046 energy-independent move trigger, D `72dab55` exact source/owner/multiple watchers, E `bd8a538` earned watcher physical UID/stamp captured at move time. Verified code Actions [39801612655](https://github.com/will00t-debug/Ua/actions/runs/39801612655) completed SUCCESS Node22 **1786/1786**, five-title **60/60**; manifest 312/700 unchanged (BLEACH97 TTG35 SLG41 SAO91 MST48), unported388 and full card certified0. Q2315 synthetic observer references **Riruka BLC-4-034** but full Riruka and BLC-2-019/047 are **not** registered. Source and hidden UID proof is bounded, no global cross-player Q38 or nested LIFE certification. No main/production/Cursor PR77 changes; no force push. This documentation-only follow-up HEAD must also be checked in Actions.


## GPT R27 — Q38 cross-owner and exact earned event provenance (2026-10-22)

Details and official rules in [V2-R27-Q38-physical-event-hardening.md](./V2-R27-Q38-physical-event-hardening.md). Existing PR #78, branch gpt/v2-resume-20261022 unchanged. Four code batches: A `4d834308` prevents stale REST/tuck legal actions after watched physical target leaves (remote Actions 39803940806 success); B `0272eec`→`e15bdc`→`39ef2a2` validates earned move-order save event UID/stamp/queue provenance (intermediate CI RED corrected, do not count); C `047da8e` two-title cross-owner Q38 COLOR onPlay and paid physical event trigger vs FINAL (Actions [39804712396](https://github.com/will00t-debug/Ua/actions/runs/39804712396) SUCCESS Node22 **1792/1792**, matrix **60/60**, unchanged registry 312/700); D `767331e` tests nested LIFE injection atomic rollback and pre-earning Q2220 original-effects silence, remote CI must be checked. E documentation-only consolidation in this commit. Nested LIFE remains fail-closed. No real card registration, main merge, PR77 edit, force push or production deploy. Full official certification 0, 388 unported. Reconfirm final SHA exact CI.


## R28 GPT 第 28 輪（2026-10-22）— PR #78 / 五批集中驗收

以 `ee5c1212` (R27 docs HEAD) 為起點，正式開發 PR #78 合併目標仍 `cursor/v2-multi-retire-life-6ff5`。起點 Actions [39805362290](https://github.com/will00t-debug/Ua/actions/runs/39805362290) success；R27 `767331eb` [39804977135](https://github.com/will00t-debug/Ua/actions/runs/39804977135) success。

- **A** `30813700`，測試 fixture 正確 auto-entry 修正 `1460cbf5`：Q12 simultaneous DRAW/FINAL in both orderings, LIFE zero provisional, frozen public/private/saved state on invalid trigger action.
- **B** `578d3a16`：grantOnAttack original-effects silence distinction, independent grants surviving giver departure, tampered program rejected, common legal/AI actions.
- **C** `06f3bd3b`：unregistered 50-card BLC-2-019 / 047 integrated Raid→two BP targets→typed named payment→MAIN→earned move draw→actual granted attack draw and state consistency. Pilot passed; complete whole-card FAQ acceptance is **not** claimed.
- **D** `4d66b1d3`：new `docs/v2-handoff/V2-R28-cross-title-print-audit.md`, four source-checked unported TTG/SLG/SAO/MST official full-text candidates, explicit missing clauses.
- **E** `819dce2e`：new `docs/v2-handoff/V2-R28-priority-and-nested-life-proof.md`, Q12/35-38/71-74 and Q2220/2228 differences, including unresolved multi-player reentrant damage. Preserve atomic fail closed; no new queue.

Verified **remote GitHub Actions** [39809160866](https://github.com/will00t-debug/Ua/actions/runs/39809160866) on `06f3bd3b`: Node.js22 **1801/1801 PASS**, five-title legal match matrix **60/60 PASS**, independent manifest and unported report passed. D documentation [39809645550](https://github.com/will00t-debug/Ua/actions/runs/39809645550) success same counts. Intermediate `30813700` and `578d3a16` were red due solely to the A fixture; `1460cbf5` fixed them, [39808947609](https://github.com/will00t-debug/Ua/actions/runs/39808947609) success 1800/1800. Final E plus documentation commits' own Actions must be verified separately.

Fresh registry evidence BLEACH **97**, TTG **35**, SLG **41**, SAO **91**, MST **48** = **312/700**, unported **388**, independent full-card all-FAQ audit certification **0**. **No newly registered cards or DSL primitives** in R28; it added validation and official cross-title audit only. BLC-2-019, BLC-2-047 still outside registry/manifest.

Next: complete BLC 019/047 Q1033/Q1046/Q2315/Q2316 full per-card / all-source scenarios before registration; cross-player independently owned pending priority including SPECIAL/onRetire/onRaid; after-earned suppression vs reincarnation under multiple sources; official oracle for nested LIFE before changing the atomic guard. No main merge, Vercel deployment, overwriting Cursor PR #77, force push, local-test claim or unsafe recovery of the old branch.


## R29 GPT 接續：物理 UID／跨玩家雙 SPECIAL／已取得效果封印後維持（2026-10-23）

From R28 verified code+handoff `66dea296d3e74c9ab0f0569f3f3e58275cb84872`, same PR #78 / `gpt/v2-resume-20261022` into `cursor/v2-multi-retire-life-6ff5`. Full scope and official FAQ boundaries at [V2-R29-earned-events-and-cross-owner-acceptance.md](./V2-R29-earned-events-and-cross-owner-acceptance.md).

A `4ac116ad`: same official-print unregistered BLC-2-019/047 50-card pilot, two different physically stamped Ichigo sources with independent source-qualified hand-payment 047 UIDs; 2 successful Q1033/Q1046 earned draws; second source field-entry prepared as a fixture, **not** another paid Raid. [CI 39864577235](https://github.com/will00t-debug/Ua/actions/runs/39864577235) green **1802/1802**, matrix60/60.
B `3c7c5ed7`: both player controllers, giver departure, two grants survive printed-target original-effect sealing, but original printed draw suppressed; incarnation changes strip old stamped grants. [CI 39864773510](https://github.com/will00t-debug/Ua/actions/runs/39864773510) green **1805/1805**, matrix60/60.
C `f23310da`: two independently revealed defender SPECIALs retire different attacker characters with two onRetire earned choice windows, legal Human/Normal/Hard and owner handoff both permutations; still a bounded cross-owner case, not global ordering. [CI 39865047656](https://github.com/will00t-debug/Ua/actions/runs/39865047656) green **1807/1807**, matrix60/60.
D `86f12d2e`: Q2315 earned moved-047 reaction and Riruka-like observer remain after **post-earn** original source and watcher seal, still exact source stamp, optional legal REST/tuck and Q2316 owner privacy. [CI 39865310494](https://github.com/will00t-debug/Ua/actions/runs/39865310494) green Node22 **1811/1811**, cross-title **60/60** and independent manifest+unported report success. E official rules/next unresolved scope documentation `158cbb52` plus full handoff updates require their **own** exact CI.

No new DSL or registry cards this round. Independent five-title registered **BLEACH97 TTG35 SLG41 SAO91 MST48 = 312/700**, unported **388**, full independent per-card FAQ certifications **0**. BLC-2-019/047 and Riruka BLC-4-034 **NOT** production registered or fully audited. Multiple independent real-player simultaneous choice ownership beyond the bounded tests, complete printed 019/047/034 matching, and real nested LIFE priority remain open. Secondary LIFE during unresolved batch remains atomic fail closed. No local Node22 run, no merge main, deploy, force push, or overwrite PR77.


## R30 GPT 第三十輪：COLOR BP hand-return、ENERGY 定位 ACTIVE、三張 BLEACH 官方印刷原型（2026-10-23）

從 R29 full remote-green `fc0ab18ba02ea9e9a4d60fe2a8ddee336399b8e7` 原分支延續。完整 R30 來源 / 限制 / 測試明細在 [V2-R30-034-full-print-and-cross-player.md](./V2-R30-034-full-print-and-cross-player.md)，PR #78 合併目標仍 `cursor/v2-multi-retire-life-6ff5`。

**A** `9da7c8a3`、`14bdd4ef`、`3c04c8d1`：新通用 COLOR `bounceOppFrontUnderBp` 嚴格限制對手 FRONT 3500 以下角色返回其所有者手牌，保留 Raid/裏向 layer 去向及 opponent-effect controller。不視作退場。真正 EX15BT/BLC-4-034 source-pinned 色彩 Trigger 正反測試，遠端 [39867007395](https://github.com/will00t-debug/Ua/actions/runs/39867007395) success **1817/1817, 60/60**。

**B** `ffc04344`：Q38 COLOR（敵方物理 LOW 返回手牌）與同批 FINAL 兩種排序、Q12 zero LIFE 非即時勝負，驗收 [39867247586](https://github.com/will00t-debug/Ua/actions/runs/39867247586) success **1819/1819, 60/60**。

**C** `de325714`、`906994f1`、`e2eda2c3`：擴充既有 `activeSelfIf.line` 僅接受 `front|energy`，以場上真實所在位置決定 ACTIVE；034 只在 ENERGY line 登場可 ACTIVE，FRONT 不能，其他原條件不變。[39867555312](https://github.com/will00t-debug/Ua/actions/runs/39867555312) success **1824/1824, 60/60**。

**D** `33e5f8fb`：同一合法 50 卡獨立牌組使用真正 BLEACH 印刷身分 019／047／4-034，完整已支持的 Raid→雙 BP→名字費用→來源結算抽卡／BP+1000／暫時 grantOnAttack→ Q2315 observer REST/tuck→ Q2316 own-only hidden layer→本回合真攻擊選擇額外抽牌。兩種移動排序、嚴格非法未知 MAIN 拒絕、合法 AI、物理 UID/序列化；Riruka 先前已在 ENERGY 為真正 field witness fixture，未宣稱同回合付費使用。遠端 [39867840517](https://github.com/will00t-debug/Ua/actions/runs/39867840517) success **1828/1828, 60/60**。

**E** `ecc23eb4`：來源證據 + 官方完整卡文差異及下一輪優先工作文件，接續更新兩份 GPT handoff。E 和文件 HEAD 的 CI 需要對應 exact SHA 再確認。

**嚴格非認證：** BLC-4-034 正式印刷的 `MAIN【REST 本身、退場、最多一張自己底下裏向卡回手】` 尚未完全定義成本和實體移動時序，不得跳過。019/047/034 **均未登錄正式 registry**、不改 manifest。五作品仍 BLEACH97 TTG35 SLG41 SAO91 MST48＝**312/700**，未移植388，全卡完整 FAQ 獨立認證 **0**。不宣稱全域跨玩家優先權、任意授予能力或巢狀 LIFE 已驗證；第二次未結算 LIFE 傷害仍原子 fail-closed。沒有 main merge、Cursor PR77 覆寫、Vercel production deploy、force push；Node22 數據全部來自 GitHub 遠端 Actions，非本地。



## GPT 第三十一輪 R31｜REST/退場/裏向附屬卡官方差異、SAO 名稱搜尋正式登錄（2026-10-23）

從確認遠端 baseline `2fae2b6d5ac5628280bf1793241ee0cf5738b2c7` 開始，延續同一 GPT PR #78 `gpt/v2-resume-20261022`（base `cursor/v2-multi-retire-life-6ff5`）。官方審核/未釐清順序見 [V2-R31-official-under-recovery-audit.md](./V2-R31-official-under-recovery-audit.md)，原 R30 BLC 三張合法 50 卡證據與完整正反例原封不動保留。

- **Batch A, official audit** `d9165bedacabda33c035aa789457e680026025b3`: 核對 BLC-4-034 實印 MAIN 的 REST／自身真正退場兩項強制支付，後續最多一張裏向附屬卡回手、Q60–Q62 Raid/base 去向、Q81 最多可選零張、Q2315 已取得觸發可保留、Q2316 只有控制者可看自己的裏向卡。對比 `retire`／`vacate` 立即拆出所有下層到場外，官方未給明確 last-known/select 和 interruption 優先權；**BLC-4-034 MAIN 暫未實作**，舊 fail-closed 斷言保留。[39869518022](https://github.com/will00t-debug/Ua/actions/runs/39869518022) 成功。
- **Batch D1, true-card isolated preflight** `c2304609ca8831e1cf6e022ab97d92cc56aa6f59`: 單張尚未登錄 SAO-1-005 使用正式日文原文及 50 張真卡牌組，重用已存在 `searchTopOneBottomDiscardWhere` / `searchTopOneBottomDiscard` 多名稱 `logic:'any'` + `cardHasName` alias；印刷需求黃能源2／AP1、TOP4／〈キリト〉或〈アリス〉／最多1張／BOTTOM自選排序／成功取得才棄1。測試正反例、Wrong UID、AI、JSON 恢復、對手不得查看私有檢視。[39869697116](https://github.com/will00t-debug/Ua/actions/runs/39869697116) 成功，當時未計入 registry。
- **Batch E1, shared public-reveal defect** `1d54bdb8e093f9867eaee3edc997129d912c8d50`: 既有 `effect-top-filter-choice` 在合法 TOP-N 選擇牌入手後，通過既有有界 `publicReveals` **只公開被選中的物理 UID**；不新建事件佇列、不公開其他 inspected 卡，不改 `zoneMoveEvents`；無牌取得時不公開。[39870054641](https://github.com/will00t-debug/Ua/actions/runs/39870054641) 成功。
- **Batch D2, formal complete printed registration** `79ddbc73c1996dedecbbcb51dbbd319adf3f58ad`: SAO-1-005 加入 `sao-pack.mjs` 嚴格 source-pinned metadata / 已有 ANY-NAME 模板及 `tests/fixtures/v2-integrated-id-manifest.mjs`，將 isolated 測試替換為正式 registry 測試。第一次 [39870434867](https://github.com/will00t-debug/Ua/actions/runs/39870434867) **FAILED**：新增證據檔引用不存在局部變數 `id` 觸發大量 import 錯誤；未刪測試或放寬 validation。緊接 `f796ed985791380bff1f7f38c18bedac37012ecc` 改成 `def.id`，[39870620372](https://github.com/will00t-debug/Ua/actions/runs/39870620372) 成功 **1832/1832**, 60/60。
- **Batch E2, positive/negative options** `6a885ca40251f4f914c2b8aa5a2f91ccd76b62e6`: 正式 SAO-1-005 TOP4 同時有真實 Kirito 與 Alice 時仍可選 0 張（不公開、不棄牌、底部完整順序），及選 Kirito 的另一實體 UID（只公開該 UID，排序後棄已取得卡合法）；序列化和卡牌守恆。[39870856615](https://github.com/will00t-debug/Ua/actions/runs/39870856615) 成功 **1834/1834 Node22, 60/60 five-title**, independent manifest / `v2-unported-report` success。

**登錄權威結果：** BLEACH **97**, TTG **35**, SLG **41**, SAO **92（本輪+1）**, MST **48**，合計 **313/700**，未移植 **387**；全面逐卡每條官方 FAQ 獨立認證 **0**（現有逐卡/逐原語覆蓋不可誤稱 0→313）。BLC-2-019／BLC-2-047／BLC-4-034 **三張仍未移植**，沒有把未完成原印刷能力計入數量。BLC-019/047 的已支援原語及來源繫結獨立案例依 R30，未擴張成完整全卡 FAQ 認證。BLC-4-034 MAIN 仍 blocked，**未新增**臆造的 undercard recovery DSL，保留 Q60/Q61 Raid 確切 OUTSIDE 去向及真正 onRetire、Q2315 earned-event 已取得觸發，對手不得見自己的裏向卡以外資訊。

**R32 第一優先：** 取得 BLC-4-034 MAIN「支付自我退場後最多 1 底牌回手」的直接官方結算裁定（選取快照時點、真正退場/退休觸發與替代中斷、多人層 Raid 和剩餘下層的去向）；有明確 oracle 才可最小改動既有 queue/zone move UID/stamp 作共享 recovery。官方資料不足則先挑 `TTG-1-028` 的跨作品『至下個己方回合開始前禁止攻擊』通用 *turn-bounded legal action restriction*，先確定官方結束時點、重進場的 stamped expiration，不和 BP Buff、onAttack 授予或產能混用。SLG-1-070 AP 額外目標費及 MST-1-059 FRONT 暫時產能保留為不同的獨立原語候選。巢狀第二批 LIFE 繼續原子 fail-closed；不以未知官方次序強行整合。

**執行邊界：** 全部 PASS 統計來自 GitHub Actions **remote Node.js 22**，本環境 GitHub clone DNS 失敗，未跑本地 Node22，沒有私自並行修改別人的 local working tree、main merge、正式 Vercel 部署、覆寫 Cursor PR #77、force push。已驗證最新已完成程式提交 `6a885ca40251f4f914c2b8aa5a2f91ccd76b62e6`；本交接文件提交本身要另核對精確 SHA Actions，不能只拿舊 green 抵充。



## 第三十二輪｜通用禁止攻擊、正式 TTG-1-028 及跨作品真卡測試（2026-10-23）

從 R31 [39871185997](https://github.com/will00t-debug/Ua/actions/runs/39871185997) 成功 HEAD `2aa041e5f7b31090966be09af551b2cd930e94ef` 延續 GPT PR #78，保留 Cursor base/main/production。官方印刷來源與逐批差異詳見 [V2-R32-cross-title-next-own-start-attack-ban.md](./V2-R32-cross-title-next-own-start-attack-ban.md)。

1. **A** `02893557` + syntax fix `52aa9b4b`: existing `continuousStates` 新增 physical/stamped `cannotAttack`，僅濾除合法 `attack` action，`sourceLinked:false`，嚴格於能力授予者 **下個自己回合 START** 到期；不影響阻擋／REST／BP／能源。第一次 [39872555141](https://github.com/will00t-debug/Ua/actions/runs/39872555141) 因一處括號語法錯誤失敗，修正後 [39872730722](https://github.com/will00t-debug/Ua/actions/runs/39872730722) full green。
2. **B** `64a17b76e091771aed54bbbbc81bf4f9ae4e5a33`: 嚴格通用 onPlay DSL `forbidAttackOppFrontOne` + 現有 `effectQueue` 上的 `effect-attack-ban` pending，選 0/1 敵方 FRONT，原子核對所有者／UID／`fieldEntryStamp`、AI 合法選項；真正 TTG-028 合法 50 卡 cross-title 隔離測試。 [39873136036](https://github.com/will00t-debug/Ua/actions/runs/39873136036) **1838/1838，60/60**。
3. **C** `2f1f7c0ec71453026053d22693378a4ec44d8e62` 正式註冊綠4/AP1/BP4000、Simon 或 Viral 雙 Raid 底板、onPlay 抽1、僅己方回合對手 FRONT 攻擊禁止、LIFE RAID 的 `TTG-1-028`。同步 TTG 審核資料、獨立 manifest、真卡測試。初 CI [39873375638](https://github.com/will00t-debug/Ua/actions/runs/39873375638) 兩個歷史清單失配，`f5f1323d` 更新來源 CSV 和 TTG 明確名單，`7481cde1` 更新獨立 workstream 範疇，[39873771779](https://github.com/will00t-debug/Ua/actions/runs/39873771779) **1839/1839，60/60**。
4. **D** `c5b08f0d4d32402a6eaf22d368be388bcc15d750`: 兩種 Raid 底板、沒有敵方 FRONT 時仍抽牌、選 0、過期實體 stamp、off-turn 無效、Human UI 選項的真卡正反例與公開提示。[39874056639](https://github.com/will00t-debug/Ua/actions/runs/39874056639) **1843/1843 Node22, 60/60 matrix, independent manifest and unported report success**。

**目前最新程式數據：** BLEACH97 TTG**36** SLG41 SAO92 MST48 → **314/700**，未移植 **386**，全面逐卡 FAQ 完整認證仍 **0**。TTG-1-028 本輪正式移植，非隔離 prototype；新增通用不能攻擊的 *legal action restriction*，**不是** `grantOnAttack`、`cannotActive` 或增加能源。BLC-4-034 MAIN 的 REST／真正退場費用與下層裏向卡回收優先權欠官方明確依據，**仍不實作**，BLC-2-019/047 也未登錄；巢狀二次 LIFE 繼續 fail closed。下一輪可先等 BLC-034 官方裁定，或研究 SLG-1-070 Q2062 的共用 AP 選擇加價，而非猜時序。既有前30輪能力未刪，未改 main/PR77/正式站、未 force push；Node22 僅 GitHub Actions 遠端實測。本交接 docs SHA 另需 CI。



## R33 — 2026-10-23: Q2062 card-effect targeting AP tax, SLG-1-070 officially registered

See [V2-R33-Q2062-AP-selection-tax-audit.md](./V2-R33-Q2062-AP-selection-tax-audit.md) for official source, Q2062/Q1119 semantics, exact commits, CI failure repairs and tests.
Started from R32 green b7b02699e664bbc979dbfafb6001093aeceefe41. Five batches:
- A bc1c3614: target physical UID+stamp; own-next-opponent-turn scoped selection surcharge; GitHub CI [39876085032](https://github.com/will00t-debug/Ua/actions/runs/39876085032) 1845/1845 Node22, 60/60.
- B c95b0295: choose target only with enough extra ready AP, charge at exact target decision, no attack/block tax; [39876436885](https://github.com/will00t-debug/Ua/actions/runs/39876436885) 1849/1849, 60/60.
- C c141febe, corrected f8405cb1: generic other-own-DFN onPlay optional-grant, valid UID/stamp target snapshots, Normal/Hard AI, source-pinned 50-card isolated tests; [39876971666](https://github.com/will00t-debug/Ua/actions/runs/39876971666) 1851/1851, 60/60.
- D d7a1d4ff: register official SLG-1-070 / シーマ (green 0/AP1/BP1000/gen1, ACTIVE LIFE, official one-token DFN／第四次架南島レイド with audited individual traits). Independent manifest, historical evidence CSV, actual true-card tests; [39877281648](https://github.com/will00t-debug/Ua/actions/runs/39877281648) 1852/1852, 60/60.
- E 0d8db897 through final code 745d378be6105921a272d1e825818ea7ac9dc09d: Q2062 plus Q1119 mandatory event legal-target preflight RESERVING own event AP; protected target surcharge after event-cost, free alternate target still legal. Initial test fixture accidentally put UNPROTECTED grantor into FRONT and assumed protected character sole FRONT target; the free alternate made prior red CI correctly reject test assertions. Fix moved grantor to ENERGY and [39878428295](https://github.com/will00t-debug/Ua/actions/runs/39878428295) **1854/1854 PASS, 60/60 PASS, independent manifest and unported report PASS**.

Validated source-code totals: BLEACH 97, TTG 36, SLG 42, SAO 92, MST 48 = **315/700** registered; **385** unported. Full independent all-card/all-FAQ official certification still **0**, not a denial of focused card tests. BLC-2-019/047/4-034 still NOT registered; BLC034 facing-down recovery after own REST + true retirement requires direct ruling, do not invent chronology. Nested LIFE atomic fail-closed. Next: MST-1-059 front temporary energy permission with source-pinned conditions, or official BLC034 chronological oracle. All tests remote GitHub Actions Node22, not local clone. No main merge, no Cursor PR #77 write, no production Vercel, no force-push. R33 documentation commit must have its own CI checked.


## 第三十四輪 R34｜MST059 正式兩模式、獨立暫時 FRONT 產能與 BLC 阻塞（2026-10-23）

GPT PR #78 原分支 `gpt/v2-resume-20261022`（對 `cursor/v2-multi-retire-life-6ff5`）。官方印刷／FAQ 差異、提交與失敗修正詳見 [V2-R34-MST059-front-energy-audit.md](./V2-R34-MST059-front-energy-audit.md)。

- **A** `06b2ebe7`: MST-1-059 green2/AP1/BP3000/gen1/ラノア魔法大学/onPlay 二選一、無 LIFE；官方 REST 也可產能；授予效果和原本印刷封印分開。官方時序沒有依據的部分保守處理。[CI 39882470095](https://github.com/will00t-debug/Ua/actions/runs/39882470095) SUCCESS。
- **B** `c5e300f7` + `7d970b71`，追加 `525e0192`: 通用 `frontEnergyPermission` 綁物理 UID/fieldEntryStamp/控制者/本回合結束；復用現有 `continuousStates` 和唯一 `universalEnergyByColor`，不當成能源+1、不重複印刷基礎、不沿用離場再登場、不依賴授予者持續留場。正反、JSON、非己方回合到期測試。[CI 39882857433](https://github.com/will00t-debug/Ua/actions/runs/39882857433) 及 [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) SUCCESS。
- **C** `79b2f989` + `79677647`: 正式登錄 MST-1-059，`chooseOne`→真實抽1棄1 或同回合其他己方 Ranoa FRONT 最多1張暫時產能；完整印刷 pin、獨立 manifest、50張真牌、Human/Normal/Hard 選項、來源 UID ledger、零選取與非法、到期。先前 `760ba258`、`fa2d53f6` 紅燈是測試錯用 phase 與 `physicalUid` 欄位，按實際資料模型更正，沒有刪測試。[CI 39883529361](https://github.com/will00t-debug/Ua/actions/runs/39883529361) SUCCESS。
- **D** `b6a232cd`，校正確實有實體測試目標的 50 張 TTG/MST/SLG 牌組 `e2cf9c68`、`712dfad4`: 真實 TTG REST 能源、MST 印刷永久/暫時 FRONT/定時增加、SAO 各自能源／登場合法性、SLG Q2062 AP 指定加價、不得攻擊、暫時授予攻擊能力等獨立共存。[CI 39883944857](https://github.com/will00t-debug/Ua/actions/runs/39883944857) SUCCESS。
- **E** `c7119b35`: 官方再查 EX15BT Q2315/2316、類比 Q576/577，尚無直接證明 BLC-4-034 的 self REST→true-retire→裏向底卡選取時點；保留 BLC-2-019/047/4-034 **未正式登錄**，加測完整 BLEACH vs MST 50 卡負面回歸，Q61、Q2315/2316、巢狀 LIFE fail-closed 不改。

**最後完成程式 SHA `525e01925ee62270e75646a3823e18ec60f2cffa`，GitHub Actions [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) Node 22 `npm test` **1869/1869 PASS**、五作品對戰 **60/60 PASS**、獨立 manifest／未移植報告成功。登錄 BLEACH97、TTG36、SLG42、SAO92、MST49，共 **316/700**，未移植 **384**；逐卡全部官方 FAQ 完整認證仍 **0**。測試在 GitHub 遠端，不宣稱本地 Node22；此文件提交自己的 CI 待另驗。未合併 main、未部署、未改 Cursor PR77、未 force-push。

**R35 首要缺口**：在取得官方的 BLC-4-034 退場費用與下層回收優先權依據以前，延續共用來源完成邊界、fieldEntryStamp、背面可視資訊及跨作品逐卡 FAQ 驗收，不為卡數加入作品專屬判定。

## 2026-10-23 · R35 independent card-acceptance and shared-atom audit

Continue on `gpt/v2-resume-20261022` / PR #78 against `cursor/v2-multi-retire-life-6ff5`. Detailed independent official-print comparisons, explicit missing FAQ applicability and replay procedures: [V2-R35-real-card-certification-and-atom-gaps.md](./V2-R35-real-card-certification-and-atom-gaps.md). This round is a **reviewable but not yet CI-certified candidate**.

1. **Batch A** `ea8239042a53a45442d0c5123f570fd2ffb6423c`, `0c3b0edc7a886d78eee7d2331446784a3c417e4c`: scripts/test for exhaustive per-card certification ledger. Exactly four recent source-linked cards SAO-1-005 / TTG-1-028 / SLG-1-070 / MST-1-059 explicitly **partial** with 13-dimensional evidence checklist; none marked all-FAQ certified.
2. **Batch B** `f8718bf0eeb069f4c75ba7b7119c25d8fa31d294`: real registered 50-card MST vs SLG same-match actual paid onPlay SLG070 AP-tax then MST059 temporary FRONT producer; state overlap, UID stamp, atomic illegal actions, serialized/private/AI decisions, expiry. No alternative energy engine / queue.
3. **Batch C** `b44198fd838931472fac5c66b481ed2143fdf06f`, `993a88351ab86fc87d5c661b205acc6a20af5540`: source-ID-validated current 384-unported partition; five candidate common atomic gaps with **10** concretely source compared real cards and **374** still pending per-card semantic audit. This is honest partial classification rather than the historic 457-card keyword result.
4. **Batch D deliberately skipped unsafe DSL code**: priority `nextEligibleHandPlayApDiscount` original printed-stat one-shot AP reduction (SAO-2-074/MST-1-062, official Q1210/Q2161). Shared paid action preflight and independent option/rollback tests needed prior to actual implementation; no partial card registered.
5. **Batch E** `703cc4c97e1cbe9c6881f925f76c8b844131b52c`: documented exact BLC-4-034 self-REST + true-retire/facedown-under-recovery official timing missing. BLC-2-019/047/4-034 unsupported, nested secondary LIFE atomic fail-closed. No change to core, no fake LKI snapshot.

Previous known green code `525e01925ee62270e75646a3823e18ec60f2cffa` and Actions [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) Node22 **1869/1869**, 60/60, independent manifest/report success **ONLY covers earlier R34 code**. New R35 HEAD, including this handoff doc, requires its own GitHub Actions logs; these **have not been verified yet** through connected GitHub workflow-run lookup (which only includes PR-triggered runs, not push runs). Do not claim successful R35 Node22 or matrix until a matching new HEAD job log is reviewed. No local clone/Node22 run. Baseline counts only: BLEACH97, TTG36, SLG42, SAO92, MST49 = **316/700**; **384** still unported; all-card exhaustive official FAQ certification **0**. Main, production and Cursor PR #77 untouched; no force push.

Reproduction commands: `node scripts/v2-card-certification-report.mjs`, `node scripts/v2-r35-unported-atom-audit.mjs`, `npm test`, `node scripts/v2-integrated-match-matrix.mjs`, `node scripts/v2-assert-independent-manifest.mjs`, `node scripts/v2-unported-report.mjs`. Next immediate task is **inspect current-head CI, fix any real failures, then complete comprehensive per-card FAQ matrix or safely implement first shared original-stat next eligible hand-play AP modifier**.


## 第三十六輪 R36｜能力全庫對照 → AP 減費 → SAO/MST 真卡批次移植（2026-10-23）

本輪詳細且**可重跑**的資料請看 [V2-R36-capability-to-real-cards-and-ap-discount.md](./V2-R36-capability-to-real-cards-and-ap-discount.md)，並參照較精確的當日累積 [GPT-resume-20261022.md](./GPT-resume-20261022.md) R36 段落。PR #78 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5` 仍 Draft；不合併 main／不部署正式站／不改 PR #77／不 force-push。

本輪在原 R35 腳本實作來源 roster + registry 動態 `capabilityIndex()`（`15334bd8`）；既有支付和 `continuousStates` 實作一次性的 `nextEligibleHandPlayApDiscount`（`182f7e37`），印刷 BP/產能/trait/card type、合格手牌使用才消耗、到期、UID/stamp、save/restore、Q1210/Q2161/Q670 疊加；同時把 **SAO-2-074 トンキー** 和 **MST-1-062 ナナホシ** 的完整已知印刷效果登錄 V2 registry、獨立 manifest 和局部獨立認證紀錄（`5088cf49`），另驗 AP selection surcharge 互不混用和 LIFE、AI、跨作品、UID（`6823a12`）。新增 7 張已核對仍缺其他能力的減費真卡候選，不自動登錄。

**已正式驗證程式 SHA `6823a1205c1615b0f91342f018a96c08ae15038c` → [Actions 39891258143](https://github.com/will00t-debug/Ua/actions/runs/39891258143) success：Node22 1896/1896；五作品矩陣60/60；認證 ledger／atom audit／獨立 manifest／未移植報告 success。** BLEACH97、TTG36、SLG42、SAO93、MST50，合計 **318/700**，未移植 **382**；獨立全面 FAQ 完整認證 **0**，局部認證紀錄 6 張。所有 Node22 數字來自遠端，不宣稱本地 test。早期 R35 `07c01009` 的 CI 曾失敗；不可拿舊 R34 綠燈套用。

**固定後續流程**：完成共用能力 → 重算所有未移植真卡及印刷來源候選 → 必須逐張核對官方全部印刷效果 → 完整才移植並更新各名單/驗收 → 集中 CI → 排序下一批缺口。不以字串命中為官方語意等價，並主動回查過往因該原語阻塞的卡。下一批優先 TOP-N 0–2 UID 合法選擇（SAO-1-031/066）、重用 FRONT 產能 grant（MST-1-080/060）、印刷產能上限（BLC-1-070/MST-1-031），高風險 BLC-4-069 攻擊結束/SAO-2-058/MST-1-067 不可被效果選擇另做官方時序與選擇作用域審核。

**不得越過安全閘門**：BLC-2-019/047/4-034 未登錄，4-034 強制 REST→真正退場→底下裏向卡回手選擇時點未獲官方明確裁定；巢狀第二批 LIFE 保留原子安全拒絕。R36 文件更新 SHA 的 CI 需按最終 HEAD 另查，不可用 `6823a12` 成功宣稱文件提交已驗證。


## GPT R37：共用 TOP-N 雙選、380 張全庫篩查及兩張 MST FRONT 重用（2026-10-23）

- **必看最終詳細交接**：[V2-R37-top-n-two-full-roster-cross-title.md](./V2-R37-top-n-two-full-roster-cross-title.md)。工作分支仍是 `gpt/v2-resume-20261022`、GPT Draft PR #78 指向 Cursor 工作 base，不碰 main / PR #77 / production。
- 共用嚴格 `searchTopUpToTwoBottom`：TOP 5/4、可選 0/1/2 不同 UID、只公開選中、合法人類與兩級 AI、餘卡 bottom-order、嚴格存檔/序列化來源。SAO-1-031（黃3 AP1 三名稱）與 SAO-1-066（藍2 AP1 ALO）正式源卡登錄。
- 重用既有 `frontEnergyPermission`：MST-1-080（EVENT 抽2，可選前線授產能 DRAW）和 MST-1-060（STEP FRONT-only Turn1 MAIN 抽1棄1後可授予其他前線產能 GET）正式登錄；後者維持共用 effectQueue 並額外驗證暫停中的 grant 絕非偽造來源。
- 依真實 source catalogue + `capabilityIndex()` 掃描當時 380 張未登錄，64 TOP-N 候選（BLEACH29/TTG7/SLG11/SAO12/MST5），其中 SAO-2-056/MST-1-049/SLG-1-059 已查官方完整卡文與各自其他缺口（PARTIAL）；剩餘 61 REVIEW PENDING，無其他安全 READY。
- **最後已核對遠端成功程式 SHA `95a30319c24ee4f8b0653c277d30cad4c68c91fd`，Actions [39895776980](https://github.com/will00t-debug/Ua/actions/runs/39895776980)：Node22 1922/1922；五作品矩陣60/60；manifest、獨立 card ledger、兩層 audit、unported 報告 success。** 新文件/LIFE tests 的最終提交需要各自新 CI，不可沿用這個 SHA 的成功。
- **正式 322/700，未移植 378：BLEACH97/179、TTG36/45、SLG42/38、SAO95/88、MST52/28**。獨立全面 FAQ 認證 **0**，局部來源/情境評審 **10 張**。所有源卡印刷/功能驗收不得宣稱全面官方 FAQ 認證。
- 下輪優先 printedEnergyAtMostFilter、cannotBeChosenByOppEffect（官方 Q1206/Q2162）、topNOptionalSingleNoDiscard、optionalRetireThenProgram、attackEndDistinctOutsideNamesSwap（官方 Q2337/Q2338）；每新增一個原語都要回查五作品當時全部未移植真卡，完整整卡驗收後才能登錄。
- **禁止**合併 main、部署、force push、寫回 PR #77、重建 effectQueue／AP／能源；BLC-4-034 與未裁定巢狀 LIFE 照舊 fail closed。


## GPT R38：必要能源上限、TOP-N 單張選取、完整真卡跨作品批次重用（2026-10-23）

- **詳細交接**：[V2-R38-printed-required-energy-top-n-full-roster.md](./V2-R38-printed-required-energy-top-n-full-roster.md)。沿用 GPT Draft PR #78／`gpt/v2-resume-20261022`，對 Cursor 工作分支提 PR，不合 main、不覆寫 PR #77、不部署正式站、不 force push。
- R38 共用原語：`printedRequiredEnergyAtMost` 比較 **印刷必要能源 `energy`**，不等於發生能源 `gen`；已重用手牌 AP 減費與 TOP-N filters。`searchTopUpToOneBottom` 專用模板重用 TOP-N 物理 UID 多選引擎的 `max=1` 流程。`ownEventUsedThisTurn` 直接從已完成的區域搬移紀錄檢視成功的 EVENT 使用，不新建事件計數器／效果隊列。
- **已登錄三張完整印刷效果真卡**：BLC-1-070（護廷十三隊 TOP4 0–1、下個合格必要能源≤4手牌角色 AP−1、Raid）；MST-1-031（Impact 無效＋己方已用 EVENT 才 Impact1、下個必要能源≤3 EVENT AP−1、Raid／LIFE，Q2152）；SLG-1-046（TOP4 指定兩名字 OR 0–1、成功入手才棄一手牌）。皆更新 registry、independent manifest、來源證據、正式情境測試；**不是**官方全部 FAQ 獨立認證。
- 完整掃描 **375** 尚未移植卡、其中 TOP-N 關鍵字候選 **62**（BLEACH28/TTG7/SLG10/SAO12/MST5）。已核對官方 SAO-1-056 全文，**NEAR READY**：TOP2 或 REST 免費手牌登場二選一，後者缺完整可驗證的 `chooseOneFreeRestHandCharacterWithPrintedColorEnergyAp`，不登錄。SAO-2-056/MST-1-049/SLG-1-059 仍 PARTIAL，其餘 58 TOP-N 字串候選 REVIEW PENDING，不能視為已核對完 62 張。
- **截至已驗證程式 SHA `010482e1a40e1984f79129e694e535d22ddcad2d`** 遠端 GitHub Actions [39899603904](https://github.com/will00t-debug/Ua/actions/runs/39899603904) SUCCESS：Node22 **1941/1941**、五作品 60/60、ledger、R35/R37 報告、independent manifest、unported report。各系列 BLEACH98／TTG36／SLG43／SAO95／MST53，**325/700，未移植375**。獨立完整 FAQ 認證 **0**，局部獨立來源／情境審核 **13**。這是遠端結果，沒有宣稱本地執行。
- 本段與 R38 文件新增後的 **最新 HEAD** 必須另查其精確 SHA 對應 CI，不可以把 `010482e1` 的成功直接冒充文件新 HEAD 的成功。下輪優先 SAO-1-056 的 REST 免費手牌登場共用 op → optionalRetireThenProgram → cannotBeChosenByOppEffect（Q1206/Q2162），BLC-4-069 攻擊結束交換高風險留後。BLC-4-034 真退場／裏向底卡與巢狀 LIFE 繼續安全阻塞。


## GPT R39：免費手牌 REST 登場、可選真退場後 TOP-N、雙次五作品全庫回查（2026-10-23）

- **完整官方卡文／真卡／共用原語／驗收／候選統計與下一輪排序**：[V2-R39-free-hand-rest-optional-retire-roster.md](./V2-R39-free-hand-rest-optional-retire-roster.md)。工作分支仍為 `gpt/v2-resume-20261022`、GPT Draft PR #78 → Cursor base，不動 main／Cursor PR #77／正式部署，不 force push。
- 新增通用 `deployOwnHandRest`（印刷顏色／必要能源／AP／卡種限制；免費效果登場不二次扣 AP、不消耗正常手牌 AP 減費；實體 UID、fieldEntryStamp、onPlay、法定滿場替換，UI/AI 共用合法選擇），及 `optionalRetireThenProgram`（先可選真正 CHARACTER／FIELD 退場，後續 TOP-N／自身 ACTIVE 僅在確實退場完成後執行，沿用現有 onRetire 與 queue）。TOP-N 增 `traitlessCharacterOrField` 精確過濾。沒有第二套登場／退場流程。
- 完整印刷來源移植三張：**SAO-1-056、SAO-2-056、MST-1-049**，含同源真卡對戰、二選一／可選0、TOP2／TOP5／TOP4、底排序、印刷限定、UID／AP／Human+AI 負例。正式 registry + independent manifest + 獨立局部審核共 **328/700**，尚未 **372**（BLEACH98、TTG36、SLG43、SAO97、MST54）；局部 16、完整獨立 FAQ 認證 **0**。
- 每個新共用原語後以原來的 `capabilityIndex()` 掃描所有當下尚未移植卡，先 **374 張**、再 **372 張**；最新手牌特殊登場文字候選 **32**、真退場+TOP-N 文字候選 **8**、TOP-N **59**。未完成全印刷個別審核的候選只標待審，**沒有**宣稱額外 READY 或衝卡數登錄。
- **截至文件編寫前最後可驗證程式 SHA `97acfeb159eee068eba0ebf08039651baa7cdd58`**：遠端 Actions [39926750588](https://github.com/will00t-debug/Ua/actions/runs/39926750588) SUCCESS，Node22 **1962/1962**、五作品 **60/60**、獨立 manifest、R35/R37 全庫腳本、認證與 unported 報告成功。**追加文件與證據檔案產生新的 HEAD，務必對新 SHA 另行查驗 Actions，不能借舊成功。**
- 後續建議 `cannotBeChosenByOppEffect`（Q1206/Q2162；絕不可誤用選擇 AP surcharge）→ 完整來源審核上述文字候選 → 高風險攻擊結束交換 Q2337/Q2338。BLC-4-034 裏向底卡時序和巢狀 LIFE 繼續 fail-closed。


## GPT R40：來源分級不可選、SAO 完整事件移植及五作品全庫回查（2026-10-23）

- **R40 官方來源、完整真卡／候選、程式與安全阻塞**：[V2-R40-official-choice-protection.md](./V2-R40-official-choice-protection.md)、[V2-R40-choice-protection-full-roster.md](./V2-R40-choice-protection-full-roster.md)。沿用 GPT Draft PR #78 / `gpt/v2-resume-20261022` → Cursor base；未合 main、未修改 PR #77、未部署、未 force push。
- **通用原語** `cannotBeChosenByOppEffect` 與 `grantOwnFrontChoiceProtection`：由現有 continuousStates、fieldEntryStamp、合法行動清單／原子 dispatch、sourceResolutionBoundary 和 effectQueue 重用，來源分 `any/character/trigger`，人類與 Easy/Normal/Hard AI 走同一驗證；場外 EVENT、Trigger 物理來源、Q1119 EVENT 必選前置檢查、加費並存、到期、來源與目標 UID／序列化皆有正反例；不影響無個別選擇之全體效果／戰鬥宣告。
- **完整印刷正式新增 SAO-2-058**，官方 EX08BT Q1206：紫2/AP1 EVENT、必選己方 FRONT、對手所有效果選擇保護至下次己方回合開始、若〈アスナ〉則自選最多1張己方 AP ACTIVE、完整 ACTIVE LIFE。新 shared DSL 不含卡號特判，正式 SAO registry + source pin + independent manifest + 50 張真卡／AI／UID 測試。
- **保留阻塞**：SAO-2-060 Q1207 僅防對手「角色」效果；整張仍缺場外回收、從手牌免費 ACTIVE 登場、來源授予及 SPECIAL LIFE 完整驗收，維持 PARTIAL。MST-1-067 最新卡文為「對手效果」、Q2162 卻引「對手角色效果」且 Raid 底卡真退場處理未完整驗收，維持 RULE BLOCKED；沒有猜測勘誤或部分登錄。BLEACH Q2311/Q2313 源範圍對照已列文。
- **每個新共用原語後回查全部當期未移植卡**：R40 初次 372/372，移植 SAO-2-058 後 371/371；保護關鍵字候選從 6（SAO5/MST1）→ 5（SAO4/MST1）。同時重查 R39 特殊手牌登場 32、真退場 TOP-N 8、TOP-N 59 文字候選，**可重疊不得相加，也不可視關鍵字命中＝READY**。正式覆蓋 **329/700**：BLEACH98、TTG36、SLG43、SAO98、MST54；未移植 371。官方整卡審核 3，部分來源驗收不等於獨立完成逐卡 FAQ 認證，後者仍 **0**。
- **已證實程序提交 `a81fae38e42ee6e0f6edcea3947e0ec79ded7866`**：[GitHub Actions 39932466201](https://github.com/will00t-debug/Ua/actions/runs/39932466201) SUCCESS，遠端 Node22 **1973/1973 PASS**、矩陣 **60/60 PASS**、ledger、R35／R37、manifest、未移植報告皆綠。之後另外將 SAO 測試改成直接使用正式 registry，並追加交接文件；**必須重新檢查最終 HEAD Actions**，不能以前一筆成功冒充新提交成功。
- 下一輪首選 `outsideOneRecoverThenFreeActiveHandDeploy` 並完整驗證 SAO-2-060；回審保護文字候選其他3張，必要時再處理 BLC-4-069 `attackEndDistinctOutsideNamesSwap` Q2337/Q2338。MST-1-067 等官方範圍與多層 Raid 退場裁定；BLC-4-034 和未驗證巢狀 LIFE 維持安全阻塞。


## R41 補充交接（2026-10-23；新節點優先於上方 R40 歷史快照）

- **保持原 GPT PR #78**（`gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`），不合併／不部署／不改 Cursor PR #77／不 force push；每次 push 先比對最新 PR HEAD。
- A 官方 `SAO-2-060` Q1207 全文驗證，`f11e234`。B 通用 `deployOwnHandSpecial` 共用效果，`1988226`；負例 `5eb0bd1`，嚴格佇列白名單修正 `09cf3e4`，[39937109260](https://github.com/will00t-debug/Ua/actions/runs/39937109260) SUCCESS。
- C 完整 `SAO-2-060` registry／manifest／八個真卡案例 `bff66c8`，R40 歷史盤點與實際 pending fixture 更正 `708468e`， [39937890797](https://github.com/will00t-debug/Ua/actions/runs/39937890797) SUCCESS，1985 Node22 測試／60局。
- D `c40dd06` 同一 `capabilityIndex` 重新搜索所有 **370 張**未移植真卡、五作品文字候選 **72** 張（手牌31／場外回手32／保護4，重疊不可相加），[39938053007](https://github.com/will00t-debug/Ua/actions/runs/39938053007) SUCCESS，1987/1987、60/60。
- E `9cd3f87` 官方全文／FAQ 分類尚未移植候選 **9 張：PARTIAL8、RULE BLOCKED1、REVIEW PENDING63、READY0**（63 為其他文字候選，非完整人工審核），[39938875140](https://github.com/will00t-debug/Ua/actions/runs/39938875140) SUCCESS，1988/1988、60/60。`cf944bd` 另外加固 save pending 的來源、免費 ACTIVE 與角色保護作用域 anti-forgery；該 SHA 和後續文件 SHA 都要查自己的 CI。
- 最新通過的已登錄 **330/700**（BLEACH98、TTG36、SLG43、SAO99、MST54），未移植 **370**；完整獨立逐張 FAQ 認證 **0**。**SAO-2-060 現在已完整登錄，舊 R40「仍 PARTIAL」記錄僅供歷史，不再是最新狀態**。
- 核對與優先序：詳 [R41 SAO-2-060 DSL 規格](./V2-R41-sao060-official-dsl-spec.md) 和 [R41 全庫官方保護／重用審查](./V2-R41-official-protection-roster-and-next.md)。SAO-2-069、SAO-2-068、SLG-1-028、BLC-4-042、SAO-1-087、SAO-2-064 等需要其他共用能力才能完整移植。MST-1-067 Q2162、BLC-4-034 真退場與裏向底卡、未核准第二批巢狀 LIFE 維持安全封鎖。


## R42 補充交接（2026-10-23；以最新 SHA Actions 為準）

- **原 GPT Draft PR #78、原分支 `gpt/v2-resume-20261022`**，不得合併 main、部署、force push、改 Cursor PR #77，所有 commit 前均確認 PR HEAD。
- **Batch A** `b14fd9e4`：基於 `inspectTopTraitOutside` 的 `orName`／`requiresOtherOwnTrait` 最小擴充；TOP2 選0或1→OUTSIDE、剩餘依序TOP，最初遠端 Actions [39945024669](https://github.com/will00t-debug/Ua/actions/runs/39945024669) 成功。
- **Batch B** `d0a1c4d` ＋ `23277fa`／`68b9589`／`ea2b38e`：SLG-1-030 影の兵士 官方完整印刷 12 張牌組例外、其他己方影の軍団存在、TOP2 特徵或水篠旬卡名選擇；完整 registry／獨立 manifest／來源 CSV。中間紅燈是 source deckLimit 未傳遞、一般上限4特殊12、TOP2 fixture；修正後 [39946175840](https://github.com/will00t-debug/Ua/actions/runs/39946175840) SUCCESS，未刪測試。
- **Batch C** `d00a2340` 新共用 `deployNamedFromZones`：從 OWN HAND 或 OWN OUTSIDE 選印刷卡名、指定 ACTIVE/REST 與合法目的地，來源 UID 事件、entryStamp、onPlay、Human/AI 同一合法操作，不新增第二套 AP/效果隊列；[39946348220](https://github.com/will00t-debug/Ua/actions/runs/39946348220) SUCCESS。
- **Batch D** `c6baf7bc`＋`3680ff59`：SLG-1-028 イグリット 官方紫4/AP2/BP4000/GET，`enterAlwaysActive`，onPlay 手牌**或**場外影の兵士 0–1 免費 REST 登場，會真正觸發 SLG-1-030 TOP2；修正 AP2 fixture + R41 歷史名單，不改規則，[39947064630](https://github.com/will00t-debug/Ua/actions/runs/39947064630) SUCCESS：Node22 **2003/2003**、矩陣 **60/60**、manifest **332**。
- **Batch E** `cfbe11c2`：saved pending 防偽，防改成未印刷的 READY／改卡名／換所有權／免費區域；[39947235806](https://github.com/will00t-debug/Ua/actions/runs/39947235806) SUCCESS。 `84839279`：以現有 R35/R41 能力索引重掃所有 **368** 未移植、全700來源，候選去重約71（需最新 Actions 確認），新 R42 CI 工作流程與自動分類；最新 HEAD 不得借前一個成功記錄。
- **目前基準：332/700**：BLEACH98、TTG36、SLG45、SAO99、MST54；未移植 **368**。原 R41 的9張官方未移植候選，現在 SLG-1-028 已移植，其餘官方整卡審核 **8張：7 PARTIAL + 1 RULE BLOCKED**、其他 REVIEW PENDING63；獨立完整 FAQ **0**。
- 完整官方來源、測試、剩餘缺口、優先序：[R42 handoff](./V2-R42-named-free-zone-slg-pair.md)。SAO-2-068／069、BLC-4-042、SAO-1-087／2-064 複合印刷效果未完整支援，MST-1-067 Q2162、BLC-4-034 和巢狀 LIFE 仍維持封鎖。正式站 Vercel 未部署。


## R43 接續完成／下一輪基準（2026-10-23）

- GPT PR #78、原工作分支 `gpt/v2-resume-20261022`；不合 main、不能覆寫 Cursor PR #77、不部署、不 force push。開工 HEAD `ac04417d`（39947812815 SUCCESS）。
- **Batch A** `30968fae`：擴充既有 `deployNamedFromZones` 印刷 AP／能源／顏色篩選與當回合物理 UID BP 增益；[39950145957](https://github.com/will00t-debug/Ua/actions/runs/39950145957) SUCCESS。
- **Batch B** `d8d64e40`：資料驅動 `restDiscardRetireThen` 真實 MAIN 成本，REST→合法己方 hand discard→真正己方退場→可選後續；原有 retirement queue、source UID、來源完成時序，安全否決偽造 saved pending；[39950677505](https://github.com/will00t-debug/Ua/actions/runs/39950677505) SUCCESS。
- **Batch C** `2b7eaacb`：SAO-2-068 官方 EX08BT card 本文 pin，完整 MAIN＋ACTIVE LIFE、免費綠〈アスナ〉ACTIVE 印刷能源≤3 AP1、BP+1000 當回合；與 registry／獨立 manifest／真牌測試一致；[39951145269](https://github.com/will00t-debug/Ua/actions/runs/39951145269) SUCCESS。
- **Batch D** `42b13411`：補 LIFE 真行動，R43 同既有全庫原始 catalog 重新搜尋，明列 SAO-2-069 Raid/phase/onPlay/onRetire/LIFE 完整阻塞、MST Q2162 仍 RULE BLOCKED；新增集中 CI 掃描。**D 的 CI 不可沿用 C 成功**。
- **Batch E** 新增 [R43 handoff](./V2-R43-paid-main-true-retire-sao068.md)，完整官方來源、負例、共同 DSL、全庫候選及 R44 排序；此文件的**最後 HEAD Actions 必須另查**。
- 基準：**333/700 正式登錄／367 未移植**，BLEACH98／TTG36／SLG45／SAO100／MST54。R41 已核對候選仍未移植7張：PARTIAL6、MST-1-067 Q2162 RULE BLOCKED1。獨立完整逐卡 FAQ Certified **0**。SAO-2-069 不因部分原語重用而登錄。
- 必跑 `node scripts/v2-card-certification-report.mjs`、R35/R37/R40/R41/R42/R43 audit、`npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`，核對最新 SHA Actions URL。沒有本地 clone 與手機 UI QA；不部署正式站。


## R44 完整成果與下一輪基準（2026-10-23）

- 原 GPT Draft PR #78，分支 `gpt/v2-resume-20261022` → `cursor/v2-multi-retire-life-6ff5`，不合 main、不部署、不修改 Cursor #77、不 force push。
- **Batch A `bdce53914df7`**：重用印刷條件免費 hand/outside REST，避免強制 BP grant。
- **Batch B `b2f5d6dd56b0`**：雙方 attack-phase end 真退場、UID／fieldEntryStamp、來源排程安全。
- **Batch C `d9fe92b59ac3`**（修正 `50015c6f3330`、`11a460aa5aa7`）：SAO-2-069 Raid／onPlay BP4000 真退場／onRetire 〈アスナ〉印刷條件免費 REST／雙方 attack-end／Raid LIFE 全文驗收及 registry＋獨立 manifest。
- **Batch D `c76b840d6955`**（修正 `620758cd8bba`）：真實 Raid LIFE、對手回合及五作品 R44 全庫搜尋與 CI。
- **Batch E `a9fd51acd4fc`**：兩來源 phase-end 真退場優先順序、序列化偽造 pending 防禦；[39957725253](https://github.com/will00t-debug/Ua/actions/runs/39957725253) SUCCESS：Node22 **2034／2034**、矩陣 **60／60**、獨立 manifest **334**；本輪文件更新後以**最後 HEAD CI** 再確認。
- 最新已核實：**334／700** 正式登錄，**366** 未移植；BLEACH98、TTG36、SLG45、SAO101、MST54。R44 廣泛字詞候選238（不可視為 READY）；366張目前 **360 REVIEW PENDING、5 PARTIAL、1 RULE BLOCKED**；已核對完整官方卡文的未移植6張。**完整獨立 FAQ 認證0**。SAO-2-069 本輪已正式移植。
- 交接詳見 [V2-R44](./V2-R44-sao069-phase-end-true-retire.md)。R45 優先 BLC-4-069 Q2337/Q2338、SAO-1-087 Q978、SAO-2-064 Q1208、BLC-4-042 Q2323；MST-1-067 Q2162、BLC-4-034、未核對巢狀 LIFE 持續阻塞。既有共用原語／測試不可重寫，下一輪仍先官方全文再任何 READY 登錄。


## GPT R45 — Q978/Q1208 source-specific selection HAND-discard, Q2337 outside distinct names, Q2323 three-way DSL (2026-10-23)

See [V2-R45-source-taxes-attack-end-three-mode.md](./V2-R45-source-taxes-attack-end-three-mode.md) for official four-card full-print/Q&A audit, exact five batch commits, CI evidence, honest gates and next priorities. Existing branch `gpt/v2-resume-20261022`, Draft PR #78, merge target Cursor PR #77 branch unchanged.

**R45 is a bounded common-primitives/evidence round; none of SAO-1-087, SAO-2-064, BLC-4-069, BLC-4-042 was registered or whole-print certified.** Code commits: A `9b1b64f` (official source/Q763/Q978/Q1208/Q2337/Q2338/Q2323), B `ffa1f3f`+`cdc9d9b` (Q978/Q1208 pure source/UID/no-stack/hand eligibility planner and negative tests, NOT live pending payment), C `c253c3e`+`c72eacb` (existing R35 index complete five-title source rescan and CI), D `0a6ab51`+`4b1349c` (printed green outside distinct EVENT+FIELD name counter, NOT actual attack-end slot swap), E `a182cae`+`66ee215` (validated existing chooseOne 2–3 options with real synthetic paid-play test, NOT all Mayuri branches).

Latest **code** SHA `66ee215b7d34eeaaae6e6a931a97e1debde80ba4` GitHub Actions [39978309934](https://github.com/will00t-debug/Ua/actions/runs/39978309934) **SUCCESS**: Node22 **2050/2050 tests PASS**, matrix **60/60 PASS**, strict manifest and R35–R45 scan success. Documentation-only follow-up HEAD still requires its own successful CI.

Five-title catalogue **334/700 registered, 366 unported** (BLEACH98 TTG36 SLG45 SAO101 MST54). R45 `capabilityIndex()` rescan of **all 366** unported: 47 unique keyword candidates (NOT READY), **360 REVIEW PENDING / 5 PARTIAL / 1 RULE BLOCKED**, four target full prints individually checked, zero new READY or registered, independent per-card all-FAQ certified **0**. No local clone/manual mobile test; no main/production merge/deploy, force push or Cursor branch mutation. Continue pending/event atomic hand-discard cost before printed AP, Q763 own attack + defense battle-winning DAMAGE2, Q2337 attack-ending after LIFE exchange and Q2323 all three effect modes. MST-1-067 Q2162, BLC-4-034 Raid undercards and unverified second nested LIFE remain strict blockers.


### R46 2026-10-23 update
Batch A generic live selection hand payment, Q1119 mandatory EVENT preflight, actual physical UID payment and serialized pending. Verified green Node22 2055/2055 + 60/60 at SHA 2e756a7 (Actions 39984451710). Batch B adds official SAO-2-064 Q1208 profile, actual 50-card SAO selection via SAO-2-069 and DRAW LIFE tests, independent manifest and partial FAQ record, subject to NEW SHA CI. Details docs/v2-handoff/V2-R46-live-selection-payment.md. No exhaustive FAQ certification, no main merge/deploy/Cursor PR change.


### R46 third live batch and Q763 full-roster conservative discovery
- Batch C: actual blocked combat winner hook for both attacker BP>=blocker and defender BP>attacker, granting THIS TURN DAMAGE2 on printed other-own watcher (not self or direct LIFE). Normal existing battle flows only run the strict stamp hook if an actual printed listener exists. Physical UID, fieldEntryStamp, expiry, AI and saved-state negatives in tests/v2-r46-battle-won-damage2-live.test.mjs.
- SHA 09e6684: Node22 full regression and 60/60 matrix green, Actions https://github.com/will00t-debug/Ua/actions/runs/39987041690 . SAO-1-087 is NOT registered pending all other full print and official FAQ composite scenarios.
- R46 live five-title scan for other-battle-win cards: scripts/v2-r46-battle-win-candidate-report.mjs and its strict all-UID test. Scanner reports candidate words as REVIEW PENDING, never READY. New doc/scan SHA requires independent Actions.
- SAO-2-064 is now registered and complete-print tested at SHA 467f79a, Actions 39986070774: 2061/2061, 60/60; inventory now SAO 102, all titles 335/700, unported 365, independently exhaustive FAQ certified 0.


### R47 FINAL — 2026-10-24 source-pinned live Q2337, MAIN Turn1 and SAO-1-087
- Original GPT Draft PR #78, branch `gpt/v2-resume-20261022`, target Cursor integration branch; NEVER main merge, deploy prod, touch Cursor PR #77 or force-push.
- Q2337 live single-ATTACK-end from actual BLOCK and post-LIFE Trigger queue: `attackEndSwap` source-pinned green EVENT/FIELD 4 distinct own OUTSIDE names; strict UID/field stamp, optional ENERGY candidate, atomic FRONT/ENERGY physical exchange without onPlay/onRetire/entry, reversible zero choice. Positive/negative/AI, normal blocked and direct DRAW LIFE checked. Commits 963a0d3, 3745a22, 0b9911c and c56f736; exact CI SUCCESS for c56f736 in Actions 39990653463.
- Shared `fieldOnceBuffOther` MAIN Turn1 from either own field line (even REST) reuses own field buff pending and once-per-turn ledger. Verified SHA f2f18cc; Actions 39991420979 SUCCESS.
- SAO-1-087 official complete print cross-title 50-card candidate verified (Q763 attack/block, Q978 EVENT-only actual hand payment, printed IMPACT1, temporary DAMAGE2, MAIN +1000, paid Raid/RAID LIFE), then formally source-pinned / registered with independently separate card-ID manifest and partial FAQ ledger. Verified SHA 7765edfb; Actions 39993910596 SUCCESS, Node22 2085/2085, 60/60, registry BLEACH98 TTG36 SLG45 SAO103 MST54 = **336/700**, unported **364**, fully independently FAQ-certified **0**.
- Whole-five-title R47 audit `scripts/v2-r47-attack-end-swap-candidate-report.mjs`: 364 unported inspected, 51 broad text candidates, 2 reviewed PARTIAL (BLC-4-069, BLC-4-042), 49 REVIEW PENDING, zero READY. Crucial verified result: BLEACH **four different already registered green EVENT/FIELD printed names** = 卍解, 天地灰尽, 尸魂界, 隊首羽織. This clears the 4-kind source-pool concern for real BLC-4-069 50-card testing; its whole printed Raid/RAID LIFE/AP-discount/attack-end must still be independently accepted before registration. Nine more canonical green EVENT/FIELD source IDs remain unported, not automatically READY.
- Preserve RULE BLOCKED MST-1-067 Q2162, BLC-4-034 hidden-bottom true-retire/raid order, unsupported nested LIFE, multi-target combined AP+discard expense. BLC-4-042 three-mode true sequencing still PARTIAL. Next safest priorities: complete BLC-4-069 source-pinned real 50-card full print and Q2337/Q2338 combo with R36 nextEligibleHandPlayApDiscount, then BLC-4-042 source-pinned true modes (TOP2, two distinct hand UID cost then named recovery, true retirement then named free ACTIVE ENERGY), only complete READY cards graduate.
- Per-source docs: `docs/v2-handoff/V2-R47-attack-end-swap.md` and `docs/v2-handoff/V2-R47-full-title-coverage-audit.md`.
- R47 handoff docs update itself requires a new exact-HEAD CI, never inherit earlier commit success.


## R48 實際接續紀錄（2026-10-24；以最新 GitHub Actions 為驗收準繩）

- **不合 main、不部署、不修改 Cursor、不 force push**。沿用 GPT Draft PR #78、`gpt/v2-resume-20261022`，原 base `cursor/v2-multi-retire-life-6ff5`。R47 文檔 HEAD `7edbdf30` 的 Actions `39994396912` 本身已成功；不能把此成功套到 R48。
- R48 官方全文與共用能力逐卡阻塞：`docs/v2-handoff/V2-R48-official-full-print-audit.md`。BLEACH BLC-4-069 Q2337/2338 與 BLC-4-042 Q2323 見該檔；無完整驗收故均**未註冊**。BLC-4-042 藍色發生能源**2**（原 legacy 記 3），其 Q2323 名稱〈涅骸部隊〉唯一已找到的合法來源 `BLC-2-044` 是藍色 **FIELD** 而非 CHARACTER。
- Batch A：`tests/v2-r48-four-official-green-sources.test.mjs`，來源 pin 綠 EVENT/FIELD `BLC-1-094`／`097`／`099`／`100`。普通覆蓋 FIELD 進 REMOVED，不能偽稱 OUTSIDE；另提供透過新的 `BLC-1-095` 達成**四種綠 EVENT 印刷卡名**的正式出牌測試。
- Batch D 真卡移植 `BLC-1-095`（UA08BT 綠 EVENT「護廷十三隊」，必要能源2／AP1／產0／無 LIFE，TOP4 選最多2張護廷十三隊特徵卡加入手牌，剩餘依合法順序回 BOTTOM），**重用** R37 共用 `searchTopUpToTwoBottom`，新增 official fingerprint 來源 profile、`title-packs/bleach.mjs`、獨立 manifest、`tests/v2-r48-BLC-1-095-complete.test.mjs`；未新增同功能第二套原語。
- Batch D 全庫動態搜尋 `scripts/v2-r48-official-readiness-report.mjs`：使用現有 `capabilityIndex()`、R46、R47 與 registry，每次重計五作品 700 張補集，文本候選不等同 READY。手工完整核對 8 張未移植卡：BLC-4-069、BLC-4-042、BLC-2-044、TTG-1-067、SLG-1-021、SAO-1-018、SAO-1-070、MST-1-009，均為 PARTIAL（印刷效果尚未完整實作），其他仍 REVIEW PENDING。另完整審核新移植 BLC-1-095：本輪共 9 張新增官方全文核對（局部原本有舊審查，非全面 FAQ 認證）。
- 此輪預期 registry **337/700**（BLEACH 99／TTG 36／SLG 45／SAO 103／MST 54），unported **363**。此為實作提交之預期值，必須以 Node.js22 / `v2-unported-report` / 最新 SHA CI 再驗證，任何失敗不宣稱通過。
- 能力優先順序：①單次來源限定**雙 UID 手費**原子完成再回收，②真退場後指定印刷卡名 **FIELD** 從 HAND 零 AP ACTIVE 進 ENERGY，③本回合暫時授予 attack-end 換位（MST-1-009）；④花天狂骨真卡 BLC-4-076／077／081 可全印刷移植者，實測 BLC-4-069 Q2338；⑤TTG 勝戰抽卡、SLG 依場外張數動態 BP 與回收門檻。
- 不改舊保留疑義：MST-1-067 Q2162、BLC-4-034 裏向底卡、未釐清巢狀 LIFE、多目標 AP＋棄手費用。**全面獨立逐卡 FAQ 認證仍為 0**；R48 新真卡個別整卡測試不等於全 337 張逐卡 FAQ 認證。
- 集中 CI 指令：`node scripts/v2-card-certification-report.mjs`、`node scripts/v2-r35-unported-atom-audit.mjs`、`node scripts/v2-r46-battle-win-candidate-report.mjs`、`node scripts/v2-r47-attack-end-swap-candidate-report.mjs`、`node scripts/v2-r48-official-readiness-report.mjs`、`npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`，核實最新 HEAD Actions SUCCESS 才報成功。


## R49 下一輪接續（2026-10-24）

- 基準：R48 HEAD `126ae120`、Actions `40002474994` SUCCESS（2,092/2,092 + 60/60），從最新 GPT Draft PR #78 `gpt/v2-resume-20261022` 接續；PR base `cursor/v2-multi-retire-life-6ff5`，未修改 Cursor #77、不合 main、不部署、不 force push。
- 詳細官方印刷、源 UID、整卡阻塞及分批內容：`docs/v2-handoff/V2-R49-atomic-payment-field-three-mode.md`。
- Batch A 原子雙手費：在已存在 `discardGate` 增加 `count:2`，單一次合法 action 指定兩個不同 OWN HAND 實體 UID，先驗兩張再一起進 OUTSIDE；直到完整支付才可執行後續；可選 0 張完全不支付、不接續；待決來源與私有資訊嚴格驗證。保留 count1。測試 `tests/v2-r49-atomic-two-hand-cost.test.mjs`。
- Batch B 精確印刷名稱：`recoverOutsideOne` 新 `filter.field='printedNameAny'`，支付完成後從**現在** OWN OUTSIDE 判定精確 `['涅 マユリ','涅 ネム']`，不是同特徵或舊 aliases；反例、Hand/Outside UID、Human/AI 測試。
- Batch C 通用 FIELD 免費登場：既有 `deployNamedFromZones` 嚴格 `cardType:'field'`＋手牌＋ENERGY＋ACTIVE＋顏色、印刷名及其他合法參數；真實 UID 搬移、新入場 stamp、onPlay，0 額外 AP；`tests/v2-r49-named-active-field-entry.test.mjs`。
- Batch D `retireOwnCharacterOne(excludeSelf:true)` 真正己方其他角色退場後才接續 FIELD；原本 draw 接續和 AP/排隊系統不重寫；加入 `chooseOne` 分支合法的 `inspectTopAnyOutside`／`retireOwnCharacterOne`。三模式合成 50 張牌組完整操作 `tests/v2-r49-three-mode-live-integration.test.mjs`。截至 R49 核心程式 HEAD `42983156`，Node 22 **2101/2101 PASS**、60/60 PASS、Actions `40006288492` SUCCESS；後續提交必須另外確認自己的 CI。
- Batch E：`scripts/v2-r49-unported-reuse-report.mjs` 直接重用 R35、R48 registry/官方 source index，動態搜尋五作品**目前所有未移植卡牌**；`tests/v2-r49-unported-rescan.test.mjs` 守住母體700、UID保存及不憑文字自動 READY；來源證據 `tests/v2-r49-blc042-044-official-source-pins.test.mjs` 分別確認 `BLC-4-042` Legacy gen3 **不能**直接沿用為官方發生藍能源2，和 `BLC-2-044` 是精確印刷名藍色 FIELD。
- **正式登錄尚未增加：337／700，未移植 363**（應再執行報告查最新）。`BLC-4-042` **PARTIAL**：雖三種模式可於共用引擎真實 UI ACTION 結算，但 BLC-2-044 本身兩種不同 MAIN 特殊能力、042 的印刷能源正規化與真正合法 50 張 BLEACH 卡牌、DRAW LIFE 尚未完成官方整卡認證；不得把合成能力通過誤作完成。BLC-4-069 同樣 PARTIAL，還需花天狂骨合法來源與真實整卡驗收。完整人工官方核對 R48 8 張仍 PARTIAL，其他文字候選 REVIEW PENDING。
- 下一輪：優先 `BLC-2-044` 同一卡兩項獨立 once MAIN 能力、退場後的 FIELD REST 全體 buff；其次真正 BLC-4-042 印刷正規化與全卡三模式；再 BLC-4-076／077／081 真卡使 BLC-4-069 完成 Q2337/2338。每新原語完成都重跑五作品全庫，READY 才批次移植。
- 保留 MST-1-067 Q2162、BLC-4-034 face-down bottom／退場、未裁決二批巢狀 LIFE、合併 AP＋棄手費。全面獨立 FAQ 認證仍 **0**。集中 CI：`node scripts/v2-card-certification-report.mjs`、`node scripts/v2-r35-unported-atom-audit.mjs`、`node scripts/v2-r46-battle-win-candidate-report.mjs`、`node scripts/v2-r47-attack-end-swap-candidate-report.mjs`、`node scripts/v2-r48-official-readiness-report.mjs`、`node scripts/v2-r49-unported-reuse-report.mjs`、`npm test`、`node scripts/v2-integrated-match-matrix.mjs`、`node scripts/v2-assert-independent-manifest.mjs`、`node scripts/v2-unported-report.mjs`；只承認最後程式 HEAD 自己的 SUCCESS。


## R51 2026-10-24 — named OWN OUTSIDE physical-count passive threshold

- From latest R50 `7c0817e0` (which already includes BLC-2-044/4-042/4-069/4-076 and Q770 per-UID FIELD MAIN fix), implemented cross-title `ownOutsideNamedCountAtLeast` in shared `field-conditions.mjs` + strict `pack.mjs` schema. This counts matching **physical cards**, not Q2337 different printed names; one card matching multiple audited names counts once. Live BP and IMPACT read it through existing passive engine.
- New `tests/v2-r51-named-outside-count.test.mjs` covers legal 50-card model, 4/6 thresholds, own-turn BP vs always-on IMPACT, aliases, UID and save, wrong zones/owner and malformed source profiles. `scripts/v2-r51-named-outside-candidate-report.mjs` + test rescan the dynamic full five-title 700-ID complement using R35 capabilityIndex, never text→READY.
- Official UA15BT/SAO-1-070 アスナ was fully print-reviewed: 4 own OUTSIDE 〈ユウキ〉＋〈マザーズ・ロザリオ〉 cards → own-turn BP+500; 6 → IMPACT1. Still **PARTIAL/unregistered** until real registered 50-card sources for both names, actual 6 OUTSIDE, battle/Impact/LIFE and official source pin + manifest acceptance; synthetic model is not full official card certification.
- Current independent literal manifest snapshot **341/700** (BLEACH103 TTG36 SLG45 SAO103 MST54), 359 unported, full exhaustive independent FAQ certification 0; **not a newly verified CI count**. R51 commits must be checked at their own latest GitHub Actions SHA. No local clone/Node test, no main merge/deploy/Cursor PR77 mutation. Handoff: [V2-R51-named-outside-threshold.md](./V2-R51-named-outside-threshold.md).

## R52 SAO Q767 shared EVENT resolution and genuine 4/6-OUTSIDE integration (2026-10-24)

- Still on GPT Draft PR #78 and gpt/v2-resume-20261022; target cursor/v2-multi-retire-life-6ff5; no main merge, production deployment, Cursor #77 edit or forced push.
- Official UA15BT/SAO-1-100 Q767: paid EVENT resolves completely before own OUTSIDE insertion; 2 prior named cards bounce, 3 retire. SPECIAL LIFE independently retires. Official UA15BT/SAO-1-070: 4 named physical OUTSIDE yield +500 BP on OWN turn; 6 independently grant IMPACT1.
- Reuse R51 ownOutsideNamedCountAtLeast and existing true bounce/retire, selection legality, AP and LIFE. R52 adds strictly validated conditionalBounceOrRetireByOwnOutsideNames and generic in-flight resolvingEvents/completeResolvingEvent Q767 boundary plus fail-closed saved UID/provenance.
- Independently pinned real registry and manifest include SAO-1-100 and SAO-1-070. Official scenario tests use 50 legal SAO printed cards; three actual paid SAO100 EVENT actions and three SAO-2-068 MAIN discard/self-retire actions are used for genuine OUTSIDE threshold generation, battle/IMPACT and LIFE; keep fully separate from synthetic shared DSL coverage.
- Dynamic R35-sourced five-title scan at current registry: 343/700 registered, 357 unported (BLEACH103 TTG36 SLG45 SAO105 MST54), R52 text candidates 34, zero automatically READY. R51 broader text candidates 93. Exhaustive independently verified FAQ certificates remain 0.
- Shared engine + strict queue validation commit 9b3ba352 had GitHub Actions SUCCESS run https://github.com/will00t-debug/Ua/actions/runs/40043667572. Full official-card latest-SHA CI is a separate required gate; do not inherit earlier success. Old R48 assumption that SAO070 was unported and R52 test fixture repeating the same hand UID were corrected without deleting negative tests.
- New current source and CI handoff: docs/v2-handoff/V2-R52-conditional-outside-official-cards.md and docs/v2-handoff/V2-R52-SAO-Q767-source-audit.md. Next review official TTG-1-067, SLG-1-021, MST-1-009 and other text candidates; retain rule blocks on MST-1-067, BLC-4-034, unaudited LIFE nesting and multi-target AP+hand costs.

### R52 full code-head Actions SUCCESS (2026-10-24)

- **Executed code SHA**: 36f67514a6de7e2f33edcf61ff3519022e36aa52.
- **GitHub Actions run**: https://github.com/will00t-debug/Ua/actions/runs/40044354789 ; event push, conclusion **SUCCESS**, Node.js 22 tests **2136/2136 PASS**, five-title matrix **60/60** (zero failures), independent literal manifest PASS and 700-source R35/R51/R52 dynamic censuses PASS.
- 5-title current registration: BLEACH 103, TTG 36, SLG 45, SAO 105, MST 54 = **343/700**; remaining **357**. R52 named-OUTSIDE text hits 34 require individual full print / FAQ reviews; no other card inferred READY.
- This SHA is the final R52 gameplay/test implementation before handoff-only documentation commits. After documentation pushes, confirm the exact *latest* PR HEAD GitHub Actions SUCCESS independently; older source green evidence cannot be substituted.

## R53 — 五方向一起納入，真卡來源與跨作品原語（2026-10-24）

- 延續 Draft PR #78／`gpt/v2-resume-20261022`，未合 main／未部署正式站／未修改 Cursor PR #77／未 force push。R52 起始 HEAD `2f8cd915` 的完整 Actions [40044586095](https://github.com/will00t-debug/Ua/actions/runs/40044586095) SUCCESS。
- **Batch A 官方來源與 FAQ 審核：** TTG-1-067 ヨーコ Q2295（ACTIVE 入場、高 BP 不可阻擋、登場給本回合狙擊和自身攻擊戰勝抽牌、ACTIVE LIFE）；SLG-1-021 水篠旬 Q2028（場外每5張攻擊 BP+500、戰勝後按張數回收、強制阻擋、RAID 和條件 IMPACT）；MST-1-009 エリス Q2147（自身效果登場二選一：跨回合 BP 或本回合攻擊結束交換、RAID/IMPACT）。三張都未全卡 READY，保持 PARTIAL。
- **Batch B 共用能力：** `countOwnOutsidePhysicalGroups`（只計自己 OUTSIDE 真實實體，floor(n/N)，不包含 opponent/under）與嚴格 `blockBpRestriction`（atLeast/atMost 當前 BP，或套 R51 官方來源指定名稱條件），目前是跨作品共用能力，**不等於** TTG/SLG/MST 完整移植。
- **Batch C 已完成真卡：** 官方 EX08BT/SAO-2-063 アスナ：綠3/AP1/BP3000/真實產能**3**/ALO/無 LIFE、STEP、OUTSIDE 〈ユウキ〉＋〈マザーズ・ロザリオ〉合計 2 張才於真正登場結算抽1。新增 `drawIfOwnOutsideNamedCountAtLeast` 原語、完整卡文 pin、registry、獨立 manifest、合法50張真卡 EVENT 付費來源正反測試與 AI／UID／STEP；沿用 R51 計數而非建立第二套。
- **Batch D 五作品全庫與 12 張 SAO 回查：** `scripts/v2-r53-five-direction-candidate-report.mjs` 從 R35 `capabilityIndex()` 使用當下 registry 完整查 700 張；官方 SAO-1-071 4／6／8 場外多門檻仍 PARTIAL；SAO-1-083、2-001、2-002、2-009、2-020、2-031、2-032、2-036、2-049、2-062 逐卡官方全文已比對，詳見 [R53 官方全文與阻塞表](./V2-R53-five-direction-official-audit.md)。保留 SOURCE/FAQ／多效果阻塞，不從關鍵字自動 READY。
- **Batch E 回歸與交接：** `db9920fc50d1108dac4572604f5abc601d55916b` 的 [GitHub Actions 40045611773](https://github.com/will00t-debug/Ua/actions/runs/40045611773) **Node22 2146/2146 PASS**、五作品 60/60、獨立 manifest PASS；正式登錄 **344／700**，未移植 **356**（BLEACH 103／TTG 36／SLG 45／SAO **106**／MST 54）。R52 檢索本輪新 33 筆文字候選，不直接視為 READY；逐張獨立 FAQ 全面認證仍 0。已新增 R53 稽核到既有 `.github/workflows/v2-resume.yml`，**最新提交仍須各自確認 Actions SUCCESS**。
- 下輪可安全延伸的核心原語：① TTG 暫時戰勝抽牌 + 狙擊合法選擇；② SLG 場外每五張的攻擊 BP/戰勝回收動態兩個消費者 + Q2028 強制 block；③ MST 來源限定二選一／Q2147 暫時攻擊結束交換；④ SAO-1-071 4／6／8 門檻複合效果；⑤ 官方核對後其他跨作品 READY 真卡整批移植。
- 繼續嚴格保留 MST-1-067 Q2162、BLC-4-034 裏向 Raid 底層、未認證巢狀 LIFE、混合多目標 AP/棄手支付阻塞。



## R54 | Five-title shared atom development, 2026-10-24

Same branch `gpt/v2-resume-20261022`, Draft PR #78 against Cursor integration branch only. Four initial independent source candidates: TTG-1-067/Q2295, SLG-1-021/Q2028, MST-1-009/Q2147, SAO-1-071. Full source review and limitations are in [V2-R54-five-direction-official-audit.md](./V2-R54-five-direction-official-audit.md).

R54 introduced source-stamped `onAttack` 0-or-1 named-OUTSIDE optional draw (`92af0774`, Actions [40047961290](https://github.com/will00t-debug/Ua/actions/runs/40047961290) SUCCESS); source pinned the four/six/eight cumulative SAO-1-071 Raid card (`d0468fa3`); and re-used R53 physical-group counter to grant attack-time `buffSelfPerOwnOutsideGroups` (`7c631931`). Registry includes SAO-1-071 only after strict printed pin and independent expected-ID manifest; TTG/SLG/MST above remain PARTIAL, no partial-card registrations.

Historic R54 intermediate CI failures were caused by a stale 106 SAO independent roster, the 1-AP fixture on first turn, an immutable reducer test that inspected stale actor rather than resulting physical state, and an opponent end-of-turn 8-hand pending choice. Fixes preserve all real payment and negative tests. Latest status MUST be checked against newest Actions SHA. R54 has repeatable `node scripts/v2-r54-five-title-candidate-report.mjs` census integrated into workflow. A text hit never sets READY.

Assuming the R54 SAO registration remains intact: inventory 345/700, 355 unported, BLEACH 103, TTG 36, SLG 45, SAO 107, MST 54. These are registration counts, not independent FAQ certification: 0/700. Remain on GPT Draft PR #78, do not merge/deploy, do not modify Cursor PR #77.


## GPT R55｜2026-10-24 SNIPER & 戰勝抽牌擴展

依前輪 R54 的永久約束：共用能力 → 五作品全部未移植卡來源搜尋 → 官方完整卡文 FAQ 查對 → READY/PARTIAL/REVIEW PENDING → 僅登錄整卡正式驗收者 → Node22 + 60 矩陣及獨立清單。

沿用 `gpt/v2-resume-20261022` 與 Draft PR #78，來源 [V2-R55-sniper-battle-official-audit.md](./V2-R55-sniper-battle-official-audit.md)。`2112b79a` 新增物理 UID/stamp 限期的狙擊合法指定角色攻擊與戰鬥判定，官方 Q65～Q70，無阻擋／不計 BLOCK；`11752289` 補上普通 BLOCK 戰勝抽牌；`ed62a591` 正式來源綁定 TTG-1-067、獨立 manifest、合法 50 張紅牌組及 AP2／ACTIVE LIFE 測試。新增 `scripts/v2-r55-sniper-battle-candidate-report.mjs` 與整庫驗收 workflow step。

R55 TTG-1-067 的最新 CI 必須對應實際最終 HEAD，不可挪用先前成功；若 CI 未成功應標為未驗收。登錄基準在無其他提交時為 BLEACH 103、TTG 37、SLG 45、SAO 107、MST 54，合計 346／700，尚未 354；全體獨立 FAQ 仍 0。BLC-4-044／SLG-1-022／SAO-1-097 屬文字候選，不因共用能力完成而算 READY。SLG-1-021、MST-1-009 仍 PARTIAL。

不合併 main、不部署正式站、不動 Cursor #77、不 force push。
