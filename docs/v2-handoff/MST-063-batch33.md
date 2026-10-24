# V2 Batch 33 — source-pinned MST-1-063 resolved-energy draw

- Official BANDAI Japanese print: [UA54BT/MST-1-063](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-063), as independently mirrored/pinned in `dist/universal-v2/sources/mst-official-print.mjs`: ノルン, green required energy 2, AP1, BP2000, printed energy1, ［ラノア魔法大学］, DRAW Life (separate). OnPlay: draw **one** exactly iff controller's total currently **generated** energy is >=7. No AP charge beyond ordinary entry.
- New reusable strict `drawIfOwnEnergyAtLeast` template/op in `ability-templates.mjs`, `pack.mjs` and `engine.mjs`. It evaluates controller's live generated energy by summing actual ENERGY-line physical sources at effect resolution, including conditional/ACTIVE bonuses, without counting opponents, FRONT production, printed cost or hand/deck. An own source entering ENERGY before onPlay can raise the total to7; RESTing an active-extra producer can lower it.
- Literal independent source whitelist `tests/fixtures/v2-integrated-id-manifest.mjs` separately includes MST-1-063 and is not computed from the tested registry. Exact roster counts and blocked inventory adjusted without weakening negatives.
- `tests/v2-mst-063-energy-draw.test.mjs` covers official print, source fingerprint, AP/UID, owner P0/P1, live 6/7 generated thresholds, own ENERGY arrival, ACTIVE producer transition, opponent hidden zones, strict invalid profiles. Real cross-title MST/SLG 50-card matches only.
- **Expected** post-batch: V2 241/700 source-registered, 459 unported; BLEACH85/276, TTG30/81, SLG34/80, SAO61/183, MST31/80. NOT complete per-card official FAQ certification.
- Feature SHA `30915de62f1164dd290bbed0aa31fd10bcbf01bc`; acceptance-code SHA and CI evidence MUST be populated after verification. No production deploy or main merge.

## Initial CI regression correction

- Feature/test integration commit `60d2626fd4c2f3dbb348817616b0ca2fb5709a73` triggered four tests failing: a strict finite generic template whitelist now needs the new audited template ID; three new MST-063 threshold fixtures mistakenly omitted physical MST-1-050 despite attempting to extract that UID.
- Corrected the *literal test fixture deck* to include exactly one real MST-1-050 in place of one MST-1-001 (preserves 50-card total), and manually added `drawIfOwnEnergyAtLeast` to the independent finite template whitelist. No gameplay test or negative check was deleted; no engine workaround.
- Run fresh full Node22 CI and 60-game matrix before reporting green.

## Independently green verified milestone

- Feature commit `30915de62f1164dd290bbed0aa31fd10bcbf01bc`; audited ID roster commit `60d2626fd4c2f3dbb348817616b0ca2fb5709a73`; physical 50-card scenario and independent strict template whitelist fix `00724204cdc607178347dab8fd413a51be8338bd`.
- Actual GitHub Actions [V2 Resumed Integration #39591722158](https://github.com/will00t-debug/Ua/actions/runs/39591722158): **SUCCESS** — Node22 **1,388/1,388 npm tests passed, 0 failed**, **60/60 seeded five-title matches completed, 0 failed**, unported report successful.
- [V2-D SAO/MST isolated QA #39591728730](https://github.com/will00t-debug/Ua/actions/runs/39591728730): both regression jobs SUCCESS.
- Source-pinned source IDs/pilot registration **241/700**, unported **459/700** (MST 31/80 source-registered, 49 unported), not official per-card full FAQ audit. Registration does not imply exhaustive FAQ compliance.
- First CI found four failures: independent finite template allowlist was not updated; three new source real-deck scenarios attempted to extract MST-1-050 from a legal 50-card test deck that did not include it. The correction preserved exactly 50 physical cards, complete negative assertions and unchanged shared engine logic.
- No local clone test, manual mobile visual QA, main merge, production deployment or force push. PR #75 remains Draft.
