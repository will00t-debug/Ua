# V2 Batch 32 — MST-1-045 green MAIN energy / delayed retirement

- Source: BANDAI Japanese UA54BT/MST-1-045, mirrored and validated in `dist/universal-v2/sources/mst-official-print.mjs`; official card URL https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-045 .
- Printed full ability: REST this ENERGY source in MAIN (TURN 1), grant its own generated **green** energy +1 until turn end, and retire this same field instance once when MAIN ends. Green0 / AP1 / BP1000 / printed green gen1, no Life. The source is ゼニス.
- Reuses the exact shared `restSelfGainEnergyRetireEndMain` DSL and phase-end engine queue already used by blue MST-1-016 and purple SLG-1-013. Renamed adapter-only `restSelfBlueEnergyRetireEndMain` kind to color-neutral `restSelfEnergyRetireEndMain`, without changing existing card behavior.
- New independent source pin and exact card manifest entry; same-title/SLG cross-title green-vs-blue bonus isolation, P0/P1 actor and UID ownership, physical REST/AP cost, pending retirement one-shot, legality, opponent privacy and conservation tests in `tests/v2-mst-045-green-delayed-energy.test.mjs`.
- Candidate inventory: original pilot totals BLEACH 85, TTG 30, SLG 34, SAO 61, MST 30 = 240 across packs (includes earlier pilot cards), while unique source-contributed counts/700 must be obtained from fresh unported report. Registration + scenarios are not full Japanese FAQ certification.
- Check THIS commit's GitHub Actions `V2 Resumed Integration`, five-title matrix and unported report before claiming acceptance. Branch PR #75 Draft only; no main merge, production deploy or manual phone QA.

## Initial CI correction

Commit 878ae9f0 independent MST dedicated action passed, but complete suite reported exactly three stale external expectation counts: MST all-card 29→30, MST blocked 51→50, all-title blocked 461→460. Corrected strict tests without removing assertions or changing engine logic; verify the fresh commit's CI separately.

## Independently verified final result

- Core implementation `878ae9f0`, strict pinned-count correction `eb0c1c7d`, final code-and-test SHA `2998eb8b`.
- GitHub Actions [V2 Resumed Integration run 39590345691](https://github.com/will00t-debug/Ua/actions/runs/39590345691): **SUCCESS**, Node 22 `npm test` **1382/1382 passed**, 0 failed; seeded five-title match matrix **60/60 completed**, 0 failed; unported report SUCCESS.
- [V2-D SAO and MST isolated QA run 39590354533](https://github.com/will00t-debug/Ua/actions/runs/39590354533): **SUCCESS**. Dedicated MST045 legal transition, cross-color energy, delayed retire and hidden-zone checks pass.
- Exact integrated V2 inventory **240/700**, unported **460/700**; title packs BLEACH 85/276, TTG 30/81, SLG 34/80, SAO 61/183, MST 30/80. This is NOT full official per-card FAQ certification, which remains outstanding.
- First CI found 3 obsolete exact-card counts; second found one stale total (239 instead of 240). These were fixed by adjusting the asserted cardinalities only, while keeping strict negative checks. There were no observed engine regressions.
- No local clone-based test, manual Android/browser preview, production deployment or main merge.
