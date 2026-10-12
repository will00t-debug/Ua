# UA54BT / MST-1 implementation and FAQ audit

Status: **INCOMPLETE, NOT PLAYABLE. DO NOT MERGE.**

Scope: 80 numbered ordinary cards, excluding alternate art and AP artworks. Printed per-card AP costs are preserved where verified; no AP game mechanic is removed.

## Evidence
- Official product: https://www.unionarena-tcg.com/jp/products/boosters/mst-1.php (12 SR, 12 R, 28 U, 28 C = 80 non-AP card types).
- Card list: https://www.unionarena-tcg.com/jp/cardlist/
- Official UA54BT FAQ: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT

## FAQ implementation ledger
| FAQ | Card | Ruling to implement | Integration status |
|---|---|---|---|
| Q2145 | MST-1-007 | Turn-once branch of Eris is shared across copies of the name, unlike other selectable branch | Pending game-state integration |
| Q2146 | MST-1-008 | Unblocked attack trigger is after blocker selection, alongside block-time trigger | Pending |
| Q2147 | MST-1-009 | Attack-end triggers after battle, or after trigger check when damaging life | Pending |
| Q2148–Q2151 | MST-1-025 | Top removal exposes original base in same REST/ACTIVE without re-entry or top-card buffs | Isolated helper + unit-test source; match engine integration pending |
| Q2155 | MST-1-040 | Full destination line requires choosing a card to move to remove area | Isolated helper + unit-test source; match engine pending |
| Q2162 | MST-1-067 | Untargetable by opponent character effects only where effect explicitly selects | Pending |
| Q2163 | MST-1-068 | Full destination line: remove a selected card before moving | Isolated helper + unit-test source; match engine pending |
| Q2164–Q2165, Q2208 | MST-1-073 | Named shared one-per-turn; may activate when already ACTIVE | Isolated helper + unit-test source; match engine pending |

## Data and test status
- 80 card number identities enumerated in `dist/mushoku-tensei.mjs`.
- 68 entries currently carry preliminary metadata copied from previous work or newly compared with official card pages. **All require final card-by-card verification before certification.**
- Remaining 12 cards: verified basic names/rarities/color but missing official printed energy, AP, BP, and generated energy; explicit pending metadata.
- No parallel variants or AP illustrations included.
- Rules prototypes reused from previous branch, kept in isolated `dist/mst-rulings.mjs`; **not connected** to `dist/engine.mjs`.
- Full effect + AI completion: **0/80**. No false `auto:true`.
- `npm test`: not yet verified. Existing BLEACH `main` files unchanged.
- Artwork: placeholders only; no unlicensed official image embedded.
- Official special product distinct ordinary cards beyond UA54BT: not yet comprehensively verified.

## Blocking acceptance criteria
1. Verify every card's printed name, numbers, traits, trigger, Japanese text and images, plus official FAQ.
2. Port title-safe card registry and independent editor/presets without affecting BLEACH or other PRs.
3. Implement full match-state transitions including choices and raid bases, timing, alias, shields, AP, dynamic BP and effects.
4. Run npm test and full AI simulations, per-card branch tests, and review a Vercel preview.

## Increment 2026-10-13
- Source-checked MST-1-025 and MST-1-073 metadata added. Further batches now bring preliminary fields to 68/80.
- New pure helpers: `mstRemoveRaidTop`, `mstMoveChoices`, `mstUseNamedAbility`, and `mstRudeus73CanActivate`, plus `tests/mst-faq-raid-movement.test.mjs`.
- These are *not wired* into active game event queue; no simulated full matches yet, and source tests have not run successfully in local Node due clone DNS issue.

## 2026-10-13 inventory and legality checkpoint
- All **80 canonical non-AP card numbers have non-placeholder Japanese names**, basic card types, colors, and rarity: SR 12 / R 12 / U 28 / C 28.
- **68/80** have preliminary card-number metadata including printed energy, AP, BP, generation and effect summary. **12/80** only have partly checked descriptive fields, and all gameplay numbers remain `null`.
- Missing exact printed numerical fields: **MST-1-010, 011, 013, 015, 019, 023, 044, 045, 061, 064, 078, 079**. Their effects and original Japanese card text still require final official verification.
- **Original Japanese effect text and artwork licenses remain to be verified for the entire expansion.** Currently many newly added descriptions are Chinese summaries, not original Japanese transcriptions.
- **MST-1-051 Roxy is restricted to one copy per deck effective 2026-10-01**, including any parallel art of the same card number. Official https://www.unionarena-tcg.com/jp/rules/limited.php and https://www.unionarena-tcg.com/tc/rules/limited.php. Isolated `dist/mst-deck-rules.mjs` rejects illegal copies or foreign series, and `tests/mst-deck-rules.test.mjs` covers it. This verifier is not yet wired to the production editor or match startup.
- Newly added `tests/mst-completeness.test.mjs` asserts 80 unique card names/rarities and exact 68 preliminary / 12 pending split, rather than pretending the full engine is done.
- GitHub Actions Node 22 regression suite **passed** on commit 76762162 (run https://github.com/will00t-debug/Ua/actions/runs/38278235832), correcting the prior shared-turn key bug. Recheck the latest commit's CI before claiming a current pass.
- FULL automatic game engine effects **0/80**; independent helper functions still require match state, user-choice flow, trigger timing, AI and end-to-end validation.

## 2026-10-13 incremental state and event modules
- `dist/mst-entry-effects.mjs` now models copied state and legal selections for MST-1-022 / 051 / 061 / 063 / 069 / 075. Draw, discard, field buffs, deck-top inspection and field retirement have unit tests in `tests/mst-entry-effects.test.mjs`.
- `dist/mst-event-effects.mjs` models branch selection and actual hand/deck moves for MST-1-035 (up to three named draw branches) and MST-1-080 (draw 2 and optional academy-front energy effect); test in `tests/mst-event-effects.test.mjs`. The temporary front-energy flag still needs integration with `engine.generated()` / `engine.energy()`.
- Fixed Q2150–Q2151 top-Raid removal to keep the base character's own `usedTurn` value rather than copying the removed top's once-per-turn state.
- `docs/mst-faq-matrix.md` lists all 25 official FAQ entries individually and explicitly distinguishes isolated-unit tests from complete game engine integration.
- All these are **isolated reducers only**; they do not handle production engine's turn/stack/AP/AI/hotseat directly. Consequently full gameplay completion is still **0/80**. No flags were enabled and BLEACH `main` remains untouched.
