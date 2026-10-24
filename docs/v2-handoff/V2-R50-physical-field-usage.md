# R50 follow-up — physical FIELD MAIN usage isolation (2026-10-24)

Work branch: `gpt/v2-resume-20261022`, Draft PR #78 (base `cursor/v2-multi-retire-life-6ff5`).
This follow-up does not merge main, deploy Vercel, change Cursor PR #77, or force push.

## Found defect and minimal shared-engine fix

The R50 common `fieldDualMain` integration keyed both independent once-per-turn
MAIN abilities by **printed card name** in `mainReadyOnceByName`. When two
physical copies of the same FIELD (for example official EX07BT/BLC-2-044
〈涅骸部隊〉) were present, using the first copy suppressed the other copy's
legal MAIN action for the entire turn. A printed once-per-turn restriction is
not a player-wide once-per-name restriction.

Code commit: `8025909f59ef2c6eaea989fb4a7ce01a55d350e9`.
Only the three existing `fieldDualMain` source-key sites in
`dist/universal-v2/engine.mjs` were changed:
- legal action enumeration now uses the physical source UID;
- actual MAIN cost/ability dispatch uses that same physical source UID;
- saved `main-field-trait-retire` pending validation requires that exact
  source UID's spent key.

The two printed modes retain **separate** once-per-turn keys for the same
physical source. Existing turn reset and the single effect queue are unchanged.
This deliberately follows existing UID-per-turn conventions; it does not
assert unreviewed same-turn leave/re-enter resetting of a spent MAIN.

## New strict regression

Test commit: `1339609c8b74ba6c298bd6124d6097e59e9802de`.
New file: `tests/v2-r50-dual-field-physical-uid.test.mjs`.

Uses the official source-pinned BLC-2-044 FIELD definition plus synthetic
controlled ally fixtures in a legal 50-card model deck. Two different physical
copies of the same FIELD each:
1. have their own legal first MAIN trait-retirement action;
2. cannot repeat that action after using it once;
3. preserve exact source UID and fieldEntryStamp across saved pending;
4. retain independent second MAIN REST/BP buff use;
5. REST their own source, not the other copy;
6. preserve physical UID and JSON round-trip validity.

This is a **shared-engine regression**, not another official card registration
or an independent exhaustive FAQ certification. All five-title R35–R49
scanners must continue to derive the current 700-ID registry complement;
no additional parallel card inventory was created.

## Verification status and handoff

The execution container has no local GitHub DNS checkout, so `npm test`,
the 60-game matrix, manifest and CI were **not run locally** here.
The GitHub connector's commit-workflow query only exposes PR-triggered runs;
the workflow file also runs on `push`, and no exact new SHA CI result was
available from that query. **Do not claim this new HEAD passed CI** until
the actual GitHub Actions job for the exact SHA is checked.

Next developer: inspect the latest branch HEAD and CI, fix any real failure
without removing negative tests, then continue R50 full-print composite
acceptance and run `npm test`, the five-title 60-game matrix, independent
manifest and current R48/R49 full-roster rescans. Existing official-print
R50 additions BLC-2-044/4-042/4-069/4-076 must not be called fully
FAQ-certified merely because they are registered and have targeted tests.

## Independent official ruling confirmed

Official Japanese Q770 (updated 2024-01-19): https://www.unionarena-tcg.com/jp/faq/list.php?category=カード効果 . It explicitly distinguishes ordinary **[ターン1]** (each physical card can use its own effect once, even with duplicate names) from the special wording **〈name〉のこの効果は1ターンに1回のみ発動** (shared across same-name copies). The exact official BLC-2-044 print at https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-044 shows two independent **[ターン1]** MAIN abilities and does not contain the name-wide restriction. This is affirmative official evidence for the per-UID correction, not a guessed card-specific exception.

Source comment cites Q770 in commit `deccd4c21b4e1bec389d2dd0b40a33721302f638`. The new regression deliberately includes two physical copies of BLC-2-044 to enforce Q770; it does not claim complete Q770 compliance for every other legacy once-per-name ability.
