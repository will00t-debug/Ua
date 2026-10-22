# V2 two-chat integration checkpoint — 2026-10-21 (Asia/Taipei)

This file reconciles the two active V2 development conversations. **The authoritative common code branch is `codex/v2-resume-20261021`, reviewed by Draft PR #75, based on PR #70's `feature/universal-rules-v2-foundation-20261014`.** It is not a request to merge main, deploy production, or re-port completed cards.

## Exact verified snapshot before this coordination document

- Branch HEAD checked: `8a6b518383f745fe92371ef599c021deefeffa63`, at 2026-10-21 15:52:56 Taiwan time.
- Latest **actual GitHub Actions** `V2 Resumed Integration`: [run 39565129000](https://github.com/will00t-debug/Ua/actions/runs/39565129000), **success** at that HEAD. Node 22 `npm test`: **1281/1281 passed, 0 failed**; `node scripts/v2-integrated-match-matrix.mjs`: **60/60 five-title games finished, 0 failures**; `node scripts/v2-unported-report.mjs`: success.
- Separate SAO/MST QA [run 39565303484](https://github.com/will00t-debug/Ua/actions/runs/39565303484): both `core-shared-regression` and `isolated-port-regression` succeeded at that head.
- Source-registered candidates **218/700**, unported **482/700**, independently complete per-card official-FAQ certifications **0**. Exact source manifest: BLEACH **80/276**, TTG **28/81**, SLG **32/80**, SAO **54/183**, MST **24/80**. These are not 218 fully approved rules.
- No manual Android/phone browser QA, no main merge, no production Vercel deployment.

## Branch and conversation reconciliation

1. The separate `codex/v2-pr75-integration-ttg053-20261021` head `2d2fa2a` is a **strict ancestor** of the unified branch (48 further commits at this checkpoint): its TTG-1-053 feature and regression are already in PR #75. **Do not cherry-pick or merge it again.**
2. The earlier `codex/v2-ttg053-isolated-20261021` head `7edb62d` diverges historically from PR #75, but the substantive TTG-1-053 rest/mill implementation and tests are already included in the unified branch. Do not merge its full older test manifests/CI/hand-off files over current 218-card inventories; compare any purportedly novel fix individually first.
3. Both recent development conversations have committed their surviving batches to the **same unified branch**. Prefer current GitHub tree over chat-reported older HEAD, figures, or unpushed intentions. Existing `docs/v2-handoff/GPT-resume.md` and `TTG-006-batch15.md` are retained.
4. Recent validated shared mechanisms include `chooseOne` sequential mode resolution, conditional own-trait generated energy, own energy-threshold BP, same-turn effect zone-movement conditions, source-paid MAIN self buffs reused across SLG-1-009 / SAO-2-021, filtered TOP-N search and ordered bottom, on-retirement and deferred end-of-MAIN actions, and exact OWN OUTSIDE recovery. Do not reimplement these under title-specific reducers.
5. **Newest unregistered infrastructure:** commits `a079960`, `5fe64af`, `8a6b518` add the `ownFieldHasAllNames` live predicate and strict validation in shared `field-conditions.mjs` / `pack.mjs`. The regression suite passed at this head, but **no newly source-certified MST card was registered and no dedicated full positive/negative predicate scenario was added in these three commits**. Treat it as a shared primitive, not completed MST-1-003 coverage or full FAQ acceptance.

## Operational rules for both chats

- **One active writer per shared branch at a time**. Before every new batch, check PR #75 head SHA, compare with the last observed HEAD, and preserve concurrent commits; use dedicated feature branches for parallel work, selectively integrate only genuinely new diffs.
- Keep registration source-locked: printed complete body and Life, actor/UID/cost/target timing, opponent privacy, retirement/Raid and AI/UI interactions where applicable. Mark unverified cards unsupported; never increment registered totals for an incomplete effect.
- Small shared-first batches across **BLEACH, TTG, SAO, MST**, not SLG-only work by default. Build dedicated scenarios (including strict negative cases), update independent exact-ID manifest / provenance / per-title expectations and re-run `npm test`, 60-game matrix and unported report at the **new** commit. No stale green claims.
- If a new predicate is implemented before a title card is approved, first prove the generic predicate with dedicated legal and illegal cross-title tests; only then register the complete official card.
- Do **not** modify `main`, merge PR #70 or #75 to main, deploy `ua-eight.vercel.app`, overwrite sibling branches, or force-push.

This is a non-gameplay coordination document; it does not itself increase card coverage.
