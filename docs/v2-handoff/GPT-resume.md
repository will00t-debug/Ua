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
