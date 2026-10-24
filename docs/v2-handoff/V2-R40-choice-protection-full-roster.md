# UNION ARENA V2 R40 — Source-scoped immunity, full-print SAO EVENT, five-title roster

2026-10-23 · GPT Draft PR #78 · branch `gpt/v2-resume-20261022` · base `cursor/v2-multi-retire-life-6ff5`. This file supplements [source text/scope comparisons](./V2-R40-official-choice-protection.md).

## Explicit rule distinctions (BANDAI JP)

| Item | Protection text and source scope | Decision |
|---|---|---|
| [SAO-2-058](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-058) Q1206 | `相手の効果で選ばれない`; all opponent EFFECT choices, not own choices or battle | **REGISTERED** after verifying every on-play and ACTIVE LIFE component; purple EVENT 2/AP1; mandatory one OWN FRONT character; protection until NEXT OWN START; if named 〈アスナ〉, optionally ACTIVE one owned AP; ACTIVE LIFE chooses own field character, makes ACTIVE and adds BP3000 for turn |
| [SAO-2-060](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-060) Q1207 | `相手のキャラの効果で選ばれない`; opponent CHARACTER effects only | **PARTIAL**; still needs outside recovery + filtered free ACTIVE hand deployment + grant-on-deployed + SPECIAL LIFE full integration |
| [MST-1-067](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067) Q2162 | Card says `相手の効果`, but Q2162 quotation says `相手のキャラの効果` | **RULE BLOCKED** until authoritative current scope/erratum; remaining Raid-under true-retirement + optional REST/hand destinations and multi-layer sequencing also unverified |
| BLEACH Q2311 / Q2313 | Opponent effect vs Trigger-only phrasing are independent | Controls for source qualifiers; not sufficient to register their own full cards |

There is no semantic inference from card ID. In particular, Q1207 does **not** turn all opponent EFFECT protection into character-only, and Q2162 is not adjudicated by guessing. Neither AP selection surcharge nor ordinary attack/block is protected by source-scoped effect-choice immunity.

## Implementation and tested boundaries

- `continuous-states.mjs`: `cannotBeChosenByOppEffect` with `any | character | trigger`, target UID+fieldEntryStamp, owned source UID, owner, source-independent grant and exact next OWN START expiry. Multiple grants coexist and stale re-entered card incarnation cannot inherit.
- `engine.mjs`: reuses existing `legalUniversalActions` -> `dispatchUniversalAction` action authorization, existing `effectQueue`, existing active AP recovery, and existing LIFE Trigger semantics. Actual on-field CHARACTER, paid EVENT in OUTSIDE, and revealed LIFE Trigger source category all identified from physical state, not claimed by client.
- Illegal mandatory EVENT choice is filtered **before** AP is spent by Q1119 preflight; post-queue late protection filters the legally resolvable choice. Optional choice keeps null action and alternates; unconditional global effects and combat are not silently rewritten as individual selection.
- `pack.mjs`: strict reusable `grantOwnFrontChoiceProtection` validation: one mandatory own FRONT target, typed source scope, expires NEXT OWN START and **optional** exact-name AP recovery. This is not a per-card conditional in the reducer.
- `sao-pack.mjs`: independent official Japanese `PRINTED_PINS` and complete R40 EVENT registration for SAO-2-058 including ACTIVE LIFE (generic trigger).
- New `tests/v2-r40-effect-choice-immunity.test.mjs`, `tests/v2-r40-sao058-full-print-probe.test.mjs` and `tests/v2-r40-protection-roster-audit.test.mjs`; negative UID, source, scope, save-load, exact AP, LIFE, Q1119, AI legality. Historical AP tax, TOP-N, true retire, 60-game matrix remain mandatory regressions.
- Independent `tests/fixtures/v2-integrated-id-manifest.mjs` explicitly pins SAO-2-058; no registry-derived expected IDs.

## Full five-title roster and previous backlog

Every scan uses the current **five-title 700 physical-identity** catalogue, only unported IDs, `capabilityIndex()`, original R35 R37 scripts, and new `scripts/v2-r40-protection-candidate-report.mjs`. Pre-registration scan at 328/700 read **372/372 unported** and found 6 textual protection hits: BLEACH0 / TTG0 / SLG0 / SAO5 / MST1. After registering SAO-2-058, the next full scan should read **371 unported**, 5 remaining textual protection hits: SAO4 / MST1; actual evidence comes from current Actions, not from a manually fabricated snapshot.

The previous unported textual pools are *independent, overlapping*:
- Special deploy from hand: historically 32 keyword candidates.
- True retire -> TOP-N: historically 8 candidates.
- All TOP-N: historically 59 candidates.

They are **not additive** and are never automatically READY. Outside of the three above source-pinned complete-print reviews, unreviewed keyword hits stay REVIEW PENDING or SOURCE PENDING, not fully proven. Even an official complete-print review does not raise the **independent FAQ-per-card certification ledger** without its own independent acceptance procedure.

## Safety / classification

- **Ready/registered**: only SAO-2-058, subject to final complete CI matching the current HEAD. COMPLETE on-play, conditional AP, ACTIVE LIFE and real 50-card validated play.
- **PARTIAL**: SAO-2-060 (at least two additional shared abilities and LIFE integration).
- **RULE BLOCKED**: MST-1-067 due to Q2162 scope conflict and multilayer Raid undercard retirement.
- **REVIEW PENDING**: other source-text protection hits; do not source-shift or silently register.
- BLC-4-034 true retirement vs face-down Raid-base and unconfirmed second nested LIFE batch remain blocked.

Current registered title counts after complete SAO commit are projected BLEACH98 / TTG36 / SLG43 / SAO98 / MST54 = **329 / 700**, leaving **371**; these are conditioned on current exact SHA's green CI.

## Next prioritization

1. `outsideOneRecoverThenFreeActiveHandDeploy` (SAO-2-060 Q1207), but only if complete outside recovery, FREE ACTIVE hand entry, printed trait/color/AP, source-linked grant to resulting physical target, and SPECIAL LIFE can be exercised safely. May unlock more cards only after **another full unported roster scan**.
2. Review the other 4 SAO protection text hits for complete printed effects; use true missing-atom counts and official source clarity rather than keyword counts.
3. `attackEndDistinctOutsideNamesSwap` BLC-4-069, subject to Q2337/Q2338 and timing, lower priority than scoped source verifications if regression risk high.
4. MST-1-067 only after printed-card / Q2162 scope difference has official authoritative resolution plus true-retire multi-layer Raid handling.

No main merge, no Cursor PR #77 modification, no force push, no production Vercel deployment. This R40 implementation does **not** claim any independently completed full FAQ-per-card certification; the historical count remains 0.
