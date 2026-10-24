# UNION ARENA V2 R57 — MST-1-009 & TTG-1-020 full-print acceptance

Date: 2026-10-24. Separate GPT branch `gpt/v2-ttg-slg-mst-r56-20261024`, Draft PR #79. Baseline from R56 passed SHA `cc81b384a7fe17ad89af28832fde6a47bcd492c8`. No main merge, production deployment or Cursor BLEACH/SAO changes.

## Batch A — shared printed onPlay source gate, atomic mode and next-own-turn BP

Shared typed program `chooseOne` supports explicit `entry:'ownEffect'`; no paid play, paid Raid or Life Raid may open those modes. **Only** true owned effect-entry event reasons (including source-qualified outside deploy or recovery) qualify.

New exact primitives `buffSelfUntilNextOwnStart` and `grantSelfAttackEndSwapThisTurn` are allowed **only** inside a gated `onPlay` choose-one. Invalid direct grants and paid-entry fallback are rejected at pack validation. The BP is a physical source modifier that survives the opponent's turn, but expires on the owning player's next START before the new phase. On field departure/re-entry it cannot leak to a newer physical field incarnation. The source-attached swap grant is stamped by actual turn and entry stamp; a forged source stamp fails restored-match validation.

## Batch B — MST-1-009 full print / FAQ Q2147

Official Japanese complete print:
https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-009

Source-locked stats: エリス / blue energy3 / AP1 / BP3500 / gen1 / RAID trigger.
Printed RAID〈エリス〉, IMPACT(1), continuous +500 BP during its owner's turn. **Only when entered through an OWN effect** the mandatory onPlay choice is exactly one:
- +1000 BP until the START of the controller's next own turn, **or**
- gain optional exact physical own ENERGY character position swap, once this character's attack ENDS, for the current turn.

The existing R47 Q2337 outside-distinct-name-gated swap remains unchanged for its own printed profiles. R57 reuses the same legal optional `attack-end-swap` pending selector with a *separate earned source-stamped entitlement*, not Q2337's unrelated prerequisites. It queues after battle outcome/retirement and after completed LIFE trigger check. It preserves physical UID and fieldEntryStamp through the front/energy pair swap, emits actual two completed movements, and permits no bogus foreign/empty target.

Q2147 (2026-06-12) specifically: after battle if fought, after completed Trigger Check if player damaged. Other applicable general rules and full independent official-FAQ certification are **not yet exhausted**.

Positive/negative tests: `tests/v2-r57-mst009-official.test.mjs`: whole source pin, actual provider card effect → onPlay, mandatory two modes, exact next-own-start BP clock, owner/opponent transition, live Impact, battle and direct LIFE attack-end boundaries, no paid-play activation, malformed DSL, forged field stamp, real 50-card legal MST paid RAID with original base under the new top.

Real source cards which can **later** trigger the own-effect mode: MST-1-006, MST-1-007, MST-1-021, MST-1-033; each remains unported until its entire effect has independent proof. This does **not** license synthetic entries into the official catalogue.

## Batch C — TTG-1-020 full print

Official JP:
https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-020
Official EN:
https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-020_p1

ヨーコ GREEN2 AP1 BP2500/gen1, trait 大グレン団. Printed **HAND ONLY** if own FRONT + ENERGY contain zero cards, required green energy -2 (never AP, never opponents' board; the discount turns off immediately after the first card enters). STEP remains ordinary front→energy move during own movement phase. ACTIVE LIFE reuses actual common trigger ready own character and +3000 BP this turn.

Generic `emptyOwnFieldHandEnergyDiscount` is bounded by printed original card required energy, only a DSL CHARACTER, non-Raid. It participates in common legal paid-hand-play enumeration with current own field and printed color, not guessed title-specific card checks. It does not change printed energy in the card definition, off-field cards, Raid base check, or opponent state.

`tests/v2-r57-ttg020-official.test.mjs` tests first-turn legal 50-card paid play at zero generated energy; a second card becomes illegal after own field ceases to be empty; opponent cards do not turn off the discount; STEP physical conservation on next own move; actual ACTIVE LIFE trigger and malformed discount profiles.

## Batch D — all-five-title live rescans and Cursor handoff

R56 shared source-only scanner is extended with own-effect-entry, empty-field-hand and next-own-start patterns; every new atom scans the **dynamic entire remaining complement**, not static R56 counts. Five title catalogues remain 700 source-identified cards; source fingerprint matches are REVIEW PENDING, never READY. All BLEACH/SAO text hits are reported to Cursor as `R57_CURSOR_SOURCE_REUSE_ONLY` in Actions; no BLEACH/SAO registry modifications.

Prior outstanding whole cards:
- TTG-1-069: MAIN self REST + genuine retirement as cost, then guaranteed trait ガンメン own OUTSIDE retrieval requires atomic source resolution; not registered.
- TTG-1-057: opponent combat IMPACT nullification plus targeted earned cancellation to next own start; not registered.
- TTG-1-081: 2026-08-28 official corrected erratum limits target to opponent FRONT; requires full field + Raid-under name eligibility; not registered.
- SLG-1-022: energy-line vs front attack-end swap after battle/LIFE, and own effect Raid/energy-discount coordination; not registered.
- MST-1-007 / 1-006 / 1-021 / 1-033: potential future real own-effect-entry enablers of MST-1-009; all full-print blocked.

Cursor-only candidate notes: BLC-4-044 and SAO-1-097 remain review-pending, and the new atomic source/condition pattern search surfaces other BLEACH/SAO textual hits without auto-import.

## Batch E — acceptance gate

Manifest, independent title CSV, title contribution source pins and live unported complement must agree. Node 22 `npm test`, official printed source guards, 60-game five-title match matrix and R35 certification audit must all succeed on **the same final SHA**.

Provisional post-R57 total until that check: BLEACH 103/276, TTG 38/81, SLG 46/80, SAO 107/183, MST 55/80 = **349/700**, 351 remaining. Independent exhaustive official-FAQ fully accepted remains 0; source-locked playable registration should not be misreported as all-FAQ certification.
