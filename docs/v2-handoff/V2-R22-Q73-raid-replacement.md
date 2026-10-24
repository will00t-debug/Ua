# V2 R22 — Atomic LIFE, buried Raid provenance, replacement journal

## Verified at code SHA `4545153f23639934d99359bb9485768e27e71681`

- GitHub Actions [39780010025](https://github.com/will00t-debug/Ua/actions/runs/39780010025): **success**.
- Node 22 regression **1725/1725**, five-title legal match matrix **60/60**, independent manifest and unported report steps success. Earlier intermediate CI failures were addressed; do not cite their snapshots as final.
- Working branch `gpt/v2-resume-20261022` / PR #78 targets `cursor/v2-multi-retire-life-6ff5`. No main merge, deployment, Cursor PR #77 edit, or official card registration.

## Batch A — Q72/Q73 simultaneous LIFE check, existing effectQueue

- `planSimultaneousLifeReveal` is integrated into direct unblocked `DAMAGE2` battle damage. Up to the actual remaining LIFE count are moved **together** to the temporary public `lifeRevealed` zone and entered into `publicReveals` before any trigger is processed.
- Defender chooses the next physical LIFE UID through `life-batch-order`; queued steps resolve sequentially, not separate game reducer or event bus. Unchosen cards stay publicly revealed. Non-trigger cards are moved to outside only when selected. Each is journaled with UID. Existing GET, DRAW, COLOR, SPECIAL and printed Raid cases use the selected physical card; FINAL checks the then-current remaining LIFE.
- Initial `Q73` and dual physical FINAL tests (`tests/v2-r22-q73-simultaneous-combat.test.mjs`) cover selection reversal, private/physical UID continuity, zero/one-LIFE bounds, Q35 no-trigger option, Q36 second FINAL becoming invalid once LIFE is restored, AI legal choices and result. `v2-blc-impact`, `v2-blc-024`, `v2-cross-title-life-queue`, `v2-special-life-retire-chain`, `v2-ready-on-attack`, `v2-printed-impact` preserve prior gameplay assertions while updating the obsolete sequential LIFE expectation.
- Single damage and Impact battle paths retain their original behavior; the legacy `additionalBattleDamage` job remains as validator-compatible internal operation but no longer starts direct unblocked DAMAGE2.

## Batch B — Raid physical UID journal

- `zone-move-events.mjs`: `raid-under` destination verifies the UID **actually exists nested beneath a field top** (stack or under). Visible top, unowned card, or fabricated UID cannot masquerade as a buried destination.
- `performRaid`: after physical mutation, logs the base from original FRONT/ENERGY to `raid-under` and the Raid top from its exact source (HAND, OUTSIDE, or `lifeRevealed`) to destination field. Source cause is rule, own effect, or life trigger as appropriate. Existing source completion boundaries unchanged.
- Stripping the top to OUTSIDE independently logs that the buried base returns to FRONT.
- Unit tests `tests/v2-r22-raid-under-destination.test.mjs`; strengthened `v2-r21-raid-source-completion.test.mjs` and `v2-raid-top-strip-round7.test.mjs`.

## Batch C — full-line replacement

- All usages of `commitDestination` now supply `pack` for journal writes.
- A full FRONT/ENERGY line replacing an existing top logs each nested/hidden physical UID from `raid-under` to REMOVED and visible top from its original line to REMOVED **only after** the actual move. Retired triggers are not fabricated for zone replacement.
- `tests/v2-r22-full-line-replacement-journal.test.mjs` covers nested UID, order, conservation, wrong replacement UID rejection, hidden opponent view and absence of retirement.

## Scope limits / next priority

1. **Q38 dynamic effects/order**: baseline Q73 multiple simultaneously revealed LIFE order and sequential nested effects pass; official exhaustive Q38 where newly entered cards create additional triggers alongside outstanding triggers remains not separately acceptance-tested. Nested additional damage while a batch is open is intentionally rejected rather than resolved under unsupported ordering.
2. **Movement journal**: remaining physical nested-layer paths include facedown leave-replacement consumption, other `vacate` and non-full-line transformations, and independent event-source distinction across opponent-controlled effects. Do not fabricate events; add actual post-mutation evidence and negative tests.
3. **BLC-2-019 and BLC-2-047 are NOT registered**; the printed complete text and Q1033/Q1046/Q2315 official cases still require named discard cost, dual enemy BP modifications, grants of onAttack, accurate Raid / LIFE trigger, card-specific positives and negatives.
4. 312/700 five-title V2 registered cards and 388 unported remain previous verified manifest totals; this R22 round added zero registered cards. No official end-to-end per-card FAQ sign-off or live mobile UI verification. Do not infer future deck counts without fresh report.
5. PR #78 is a draft workspace; keep base `cursor/v2-multi-retire-life-6ff5`, never merge main or deploy the production simulator.
