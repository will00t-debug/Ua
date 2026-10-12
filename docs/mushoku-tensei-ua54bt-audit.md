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
| Q2148 | MST-1-025 | Removing only the top raid card leaves its base on the field | Pending |
| Q2149–Q2155 | Varies | Verify official text individually before implementing | Pending |
| Q2162–Q2163 | Varies | Verify official text individually before implementing | Pending |

## Data and test status
- 80 card number identities enumerated in `dist/mushoku-tensei.mjs`.
- 10 entries currently carry preliminary metadata copied from previous work or newly compared with official card pages. **All require final card-by-card verification before certification.**
- Remaining 70 cards: null gameplay stats / explicit pending placeholders.
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
