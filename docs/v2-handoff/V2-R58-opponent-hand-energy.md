# R58 — opponent-field-color HAND required-energy reduction (shared engine)

Review date: 2026-10-24. Work branch: `gpt/v2-r58-safe-integration-20261024`. Source-pinned six cards; **test-only candidate profiles, NOT production-registered**.

## Official source matrix

| ID | Official card detail (English) | Printed HAND condition | Value |
| --- | --- | --- | --- |
| BLC-1-007 | https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no=UE01BT%2FBLC-1-007 | opponent FRONT/ENERGY has purple OR green | yellow 3→2, AP 1 unchanged |
| BLC-1-044 | https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no=UE01BT%2FBLC-1-044 | opponent FRONT/ENERGY has yellow OR green | purple 3→2, AP 1 unchanged |
| BLC-1-073 | https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no=UE01BT%2FBLC-1-073 | opponent FRONT/ENERGY has yellow OR purple | green 3→2, AP 1 unchanged |
| SAO-1-015 | https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no=UE07BT%2FSAO-1-015 | opponent FRONT/ENERGY has blue OR green | yellow 3→2, AP 1 unchanged |
| SAO-1-050 | https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no=UE07BT%2FSAO-1-050 | opponent FRONT/ENERGY has yellow OR green | blue 3→2, AP 1 unchanged |
| SAO-1-092 | https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no=UE07BT%2FSAO-1-092 | opponent FRONT/ENERGY has yellow OR blue | green 3→2, AP 1 unchanged |

All six are character BP3000, printed 3 colored required energy, generated **2** of own color, AP1, no life trigger. No card-specific FAQ block on the six English official details; global rule/FAQ certification remains a separate gate.

## Implementation

- Schema: `opponentFieldColorsHandEnergyDiscount:{colors:['...','...'],amount:1}`. Two distinct audited opposing colors, never inferred from free text, never allowed on VANILLA or mistaken for printed AP/energy.
- Hand legality in `legalUniversalActions`: recompute live opponent FRONT + ENERGY physical objects by owner and printed card color before an action can be offered; shared function `effectiveHandRequiredEnergy`.
- `dispatchUniversalAction` accepts exactly a legal action, then uses existing AP payment; AP cost stays 1. Printed `energy` and generated `gen` are immutable.
- Own empty-field discount remains separate; unverified stacking is prohibited at schema normalization.
- No private opponent HAND, DECK or LIFE read or exposed. Wrong color, wrong zone, insufficient AP, or unknown profile fails closed.
- Test: `tests/v2-r58-opponent-hand-energy.test.mjs`, test-only official profiles + 50-card real-ID decks, positive & negative, immutable printed stats, legal play, physical UID and hidden-zone view.

## Cursor handoff

Cursor alone owns source normalization and **full-card registration** for BLC-1-007, BLC-1-044, BLC-1-073 and SAO-1-015, SAO-1-050, SAO-1-092. SAO source catalogue imported gen 3 must be normalized to official 2 without changing official `energy=3` or `ap=1`. Use the exact source matrix, never keyword auto-port.

No production BLEACH/SAO registry or independent manifest IDs changed by this batch. Never merge `main`, deploy production, force-push or alter Cursor branch.
