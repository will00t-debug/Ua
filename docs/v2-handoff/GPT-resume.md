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
- GitHub Actions：這個交接 commit 推上之後，要看它自己的 pull_request run。`39734726291` 只屬於 `e57d8d9`，不能拿來當本輪通過。同一 SHA 若有被 concurrency 取消的 push run，那不是測試失敗。

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

