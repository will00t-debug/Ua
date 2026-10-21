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
| SLG | 19 | 61 | 80 |
| SAO | 53 | 130 | 183 |
| MST | 24 | 56 | 80 |
| Total | 202 | 498 | 700 |

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
