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
| BLEACH | 79 | 197 | 276 |
| TTG | 24 | 57 | 81 |
| SLG | 18 | 62 | 80 |
| SAO | 53 | 130 | 183 |
| MST | 24 | 56 | 80 |
| Total | 198 | 502 | 700 |

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
   discard (TTG-1-010/023), and draw-three/discard-two (SLG-1-036).
4. Read official Japanese text / FAQs and add real cost, target, optional/mandatory,
   trigger, UID conservation and hidden-information cases for each capability.
5. Preserve main and production; current work is a reviewable candidate only.
