# V2 R22 — DAMAGE2 simultaneous LIFE and completed Raid UID movement

Date: 2026-10-22. Working PR [#78](https://github.com/will00t-debug/Ua/pull/78), branch `gpt/v2-resume-20261022`, target `cursor/v2-multi-retire-life-6ff5`. Base R21 HEAD `d47ef531ec8bde4fd9fa6f5337bb2b9c900f3325`. Validated feature HEAD **`4545153f23639934d99359bb9485768e27e71681`**, Actions [#39780010025](https://github.com/will00t-debug/Ua/actions/runs/39780010025) **SUCCESS**: Node 22 **1725/1725**, integrated five-title **60/60**, independent manifest and unported report successful. Tests ran remotely in GitHub Actions, not locally. No production deployment, main merge, Cursor PR #77 edits or force-push.

## Batch A — simultaneous LIFE revelation, original effect queue

- `life-reveal-batch.mjs` pure planner from R21 is wired into the original `dist/universal-v2/engine.mjs` for unblocked battle DAMAGE2. Full physical top min(printed damage, LIFE count) is revealed **atomically before any trigger resolution**.
- Temporary **`players[owner].lifeRevealed`** and internal `lifeRevealBatch` conserve physical UIDs, distinguish public-revealed from hidden LIFE, and delay sending each card to outside until its check. Correctly records real LIFE→lifeRevealed and later lifeRevealed→outside/hand physical moves.
- Pending `life-batch-order` offers defender legal `chooseLifeOrder` actions; the existing queue handles LIFE `get/draw/active/special/color/raid/final`, preserves already-queued nested effects, and guards winner checks until batch completion. Q72 one LIFE bounded; Q36 duplicate FINAL only effective while LIFE stays at 0. Single damage and battle IMPACT paths remain separately handled.
- Real BLEACH and MST test fixtures updated from **obsolete sequential assumption** to simultaneous official expectation without removing coverage; retained COLOR FIELD + mandatory discard, SPECIAL + retirement draw, multiple attacks, actual printed keyword tests. Synthetic `tests/v2-r22-q73-simultaneous-combat.test.mjs` verifies simultaneous reveal, reverse ordered triggers, Q35 no-trigger ordering, Q36 two physical FINAL UIDs from one legal ID, Q72 one LIFE, AI legal actions, no private data leaks.
- Main commits: `4e69ca03` journal zone, `fd753dca` integrated queue, `1645eaaa` last-step completion; corrected old tests in subsequent commits. **No second queue/reducer or forged public private-card provenance.**

## Batch B — real nested Raid destination and movement provenance

- `zone-move-events.mjs` now validates `raid-under` by traversing only the actual nested field `stack` / `under` of the physical owner, **not** by inventing a top-level zone array.
- `performRaid` records the base's **field→raid-under** and top's **hand / outside / public LIFE reveal→field** separately, with physical exact UIDs, correct entry reason and controller/source when identified. `stripOppRaidTop` now journals previously buried base **raid-under→front**, distinct from stripped top **front→outside**. R21 source boundaries still use the original queue.
- Focused tests: `tests/v2-r22-raid-under-destination.test.mjs`, plus existing `tests/v2-r21-raid-source-completion.test.mjs` and `tests/v2-raid-top-strip-round7.test.mjs` augmented with UID/provenance checks. Forged UID, incorrect owner, visible top misidentified as buried all rejected.
- Commits: `96c3fd2d`, `92aab412`, `72856f7c`, `981902b9`, `a9a6a89f`.

## Batch C — full-line replacement and nested physical REMOVAL journal

- Full-line replacement `commitDestination` receives the real pack and records every buried UID `raid-under→removed` plus the visible displaced top `front/energy→removed`, strictly after successful mutation. This is **not** a true retirement and does not grant `onRetire`. Already present replacement owner/slot/UID legal checks stay intact.
- Synthetic `tests/v2-r22-full-line-replacement-journal.test.mjs` asserts field replacement, UID/order, buried and visible destination conservation, no false retirement, rejected illegal action and no public private-journal leakage. Commits `b6ed603b`, `4545153f`. Latest HEAD CI success.

## Boundaries; do not overclaim

- **Q38 dynamic scheduling remains unresolved**: an onPlay from COLOR/RAID created during LIFE trigger might be able to be ordered against *other* pending triggered abilities, rather than always resolving the entire newly entered program first. Must check official Q38 and build real dynamic legal order/negative tests in the existing queue before claiming full Q35–Q38 certification.
- **Nested/reentrant damage and simultaneous LIFE batches** currently fail closed when another batch is open; print-specific scheduling and proper priority remain unaudited. Legacy `additionalBattleDamage` job still exists for saved/other cases; do not declare that code path fully official.
- **Some nested Raid removal / protection paths remain**: specifically buried cards released by `vacate` on true retirement and under-card consumption as leave-replacement, plus possible source-controller preservation and nested layered cards. Full-line replacements and Raid base transitions are now covered; this is not global journal exhaustiveness.
- **BLC-2-019 and BLC-2-047 not registered**. Their strict printed named-cost, BP dual-target, onAttack granted ability and official Raid/trigger semantics require full card tests. Current official registered total remains **312/700 (unported 388)** as evidenced in R21 manifest; re-query report before future change.
- All changes on **Draft PR #78 only**. No main changes, production deployment, forced pushes, or unvalidated per-card port. Do not interpret all official FAQ cases or all 700 cards as verified.

## Next coherent round

1. Q38 dynamic choice order across live LIFE triggers and newly generated onPlay effects, including interleaved nested pending decisions and victory/FINAL state checks.
2. Source-aware journal for truly buried UIDs during `vacate`, removed-vs-retired, and facedown consumed cards, with privacy-safe tests.
3. Re-check exact official BLC-2-019/047 text, add missing generally reusable primitives **without partial card registration**; keep matrix + manifest green.
