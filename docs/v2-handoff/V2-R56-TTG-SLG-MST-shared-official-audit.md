# UNION ARENA V2 R56 — TTG / SLG / MST, shared whole-print audit

Date: 2026-10-24 (Taipei). GPT isolated branch: `gpt/v2-ttg-slg-mst-r56-20261024`.
Base R55 verified SHA: `878cc9ec4aab040b4887a1e17e7082f2edbfc2c8`.
Official source, physical UID, independent manifest and Node 22 CI govern acceptance.

## Batch A — reusable mandatory legal blocker

Shared onPlay `grantSelfMustBlockThisTurn`:
- Only an actual printed onPlay program grants this turn's physical UID/field-entry-stamped right.
- Paid play, free own-effect entry and true paid Raid all grant it; **do not** incorrectly gate this on an own-effect-only entry.
- During a **normal** attack's BLOCK pending choice, every otherwise-legal ACTIVE blocker must be available; `uid:null` is not legal if at least one exists. Blocker BP restrictions still apply.
- No opponent's legal ready blocker means direct LIFE damage; designated SNIPER skips the BLOCK window (official Q65–Q70).
- Source, stamp, state round-trip and negative payloads checked in `tests/v2-r56-mandatory-block-shared.test.mjs`.
- Official UA51BT/SLG-1-021 Q2028 (2026-04-17): https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT

## Batch B — shared attacking combat victory / live BP IMPACT / full SLG-1-021

Source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-021

Printed independent clauses:
1. RAID 〈水篠 旬〉 and RAID LIFE, using normal physical base/trigger machinery;
2. gain IMPACT(1) iff the source's *current* BP is at least 6000;
3. each five physical own OUTSIDE cards grants +500 BP onAttack for the current turn;
4. after an **attacking character battle victory**, optionally return a CHARACTER from OWN OUTSIDE with **original printed BP** <=2000+500 per five own OUTSIDE, excluding name 〈水篠 旬〉;
5. onPlay this turn's mandatory legal BLOCK choice as above.

Generic `attackWinRecover` calculates source-owned live OUTSIDE at resolution rather than using a cached total or opponent's OUTSIDE. It never fires for a direct LIFE hit or a defending BLOCK win. Generic `conditionalImpactBpAtLeast` reads the live current BP including own onAttack buffs. Pending choices remain UID-owned, optional selection includes skip, source stamp is retained by the earned queue. Return-to-hand and LIFE trigger remain independent.

The integrated DSL, printed pin, source proof, 50-card positive/negative test and separate CSV / manifest were updated. `tests/v2-r56-slg021-full-print.test.mjs` covers 9/10/19/20 OUTSIDE groups, original BP and name, paid RAID, source and direct LIFE, and malformed schema. `tests/v2-r56-mandatory-block-shared.test.mjs` covers ordinary paid/own-effect entry and Q2028.

**Registration is not all-applicable-FAQ certification**. Source report `fullyAccepted` remains 0. Do not claim card completion until the newest SHA's *whole* GitHub Actions run succeeds.

## Batch C — TTG remaining whole-print candidates (not yet registered)

TTG remains 37/81, 44 unported. R55 TTG-1-067 and its sniper/battle-win draw remain intact.

- TTG-1-057: shared source-granted IMPACT cancellation and timing/target need official complete text verification.
- TTG-1-069: MAIN REST, true physical self-retire and trait-limited recovery require atomic cost/resolution.
- TTG-1-081: base BP3000/BP5000 conditional eligibility, official corrected text and Raid-buried original naming require ruling evidence; **RULE BLOCKED**.
No TTG card is counted from an isolated generic atomic test.

## Batch D — MST-1-009 blocked pending full source-qualified atomic mode

Official https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-009 ;
Q2147 (2026-06-12) requires exchange after full character battle; after direct LIFE, *after* trigger checking.
Print: RAID 〈エリス〉, IMPACT(1), own-turn BP+500; only *own-effect entry* gets mandatory choose exactly one of +1000 BP **until next own turn starts** OR a source-stamped optional swap with an own ENERGY-line character after this turn's attack has fully ended.
Generic Q2337 physical attack-end swap is a useful primitive but has unrelated outside name/type prerequisites. It cannot be directly assigned to MST-1-009; no silent approximate card registration. Current classification **ENGINE BLOCKED**, not READY.

## Batch E — all-five-title unported complement & Cursor handoff

`scripts/v2-r56-ttg-slg-mst-five-title-rescan.mjs` rereads *all* unported cards and official source fingerprints after the shared additions. It reports named candidate groups and 700 identity/accounting consistency, but never auto-marks a text match READY or migrates a partial print.
`tests/v2-r56-five-title-rescan.test.mjs` asserts the exact dynamic complement. Node22 GitHub Actions includes it along with full test suite, 60-game five-title matrix, independent manifest, source certification and unported report.

Candidate reads **for Cursor**, without modifying BLEACH or SAO:
- BLC-4-044: recheck the new generic combat grants against all printed clauses and official FAQ;
- SAO-1-097: recheck source-qualified optional/timing and UID against all printed clauses.
Only Cursor migrates BLEACH/SAO. Do not touch their branch, PR #77, production deploy or main.

## Provisional count pending latest CI

From base 346/700, **provisional** SLG-1-021 +1 → total 347/700; unported 353.
By title: BLEACH 103/276, TTG 37/81, SLG 46/80, SAO 107/183, MST 54/80.
The final R56 SHA and Actions run must be separately observed before marking this independently accepted in a release report.
