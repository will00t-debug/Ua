# TTG seven-card batch

Registration plus scenario tests in `tests/v2-ttg-seven-more.test.mjs`. This continues from the 63-card line and lands at 70/81. It is not full official FAQ certification. `fullyAccepted` stays 0. The live R56 and R58 ledgers now record TTG-1-069 as registered with scenario tests; that does not certify the official FAQ.

| Card | Shared ability |
| --- | --- |
| TTG-1-060 ニア | Mutual entry ban with カミナ. Generated energy +1 while an own front character is シモン or has シモン as its raid base. The bonus is produced only on the energy line. |
| TTG-1-059 ニア | Same ban. MAIN rests this card and gives one other own シモン, or a character whose raid base is シモン, BP+1000 this turn. |
| TTG-1-058 ニア | Same ban. On play, may choose another own character for BP+1000, or +1500 when that character is シモン or has シモン as its raid base. |
| TTG-1-069 リーロン | MAIN rests and retires this card, then adds one outside ガンメン card to hand. |
| TTG-1-024 レイテ | Each copy on the field reduces the required green energy of green field cards in hand by 1. A top-card ガンメン gives generated energy +1 on the energy line. |
| TTG-1-075 大グレン団ガンメン | While ニア is a top card, once per physical card choose a non-empty distinct subset scaled by on-field ガンメン: BP+1000, impact null, or double block until the next own start. |
| TTG-1-021 ヨーコ | Printed STEP. At the own attack-phase start, may move from energy to front and gain BP+1000 when a グレンラガン-name character has a facedown under it, once per printed name. |

Catalog disagreements kept in the proof:

- The mutual ban is the printed text on TTG-1-058, 059, and 060. Green TTG-1-017 is named ニア and does not stop カミナ. A silenced top ニア stops enforcing the ban. A silenced カミナ still has its printed name, so ニア still cannot enter. A buried カミナ still blocks ニア. A buried ニア does not block カミナ.
- 059 has no once-per-turn sentence. REST is the cost, so a later ACTIVE can pay again.
- 069 is not offered when no ガンメン is outside. Paying recovers exactly one. The legacy resolver also refused a stacked 069. This port uses shared retire, so a stacked 069 can pay, and subordinate layers still go outside.
- 024 discounts green field cards only, by one per unsilenced copy, floored at 0. Red fields and characters are unchanged. Buried ガンメン does not add energy, and the front line still generates 0.
- 075 does not offer the empty selection that the legacy resolver treated as spending the use. Activating is optional. A taken activation picks 1 to min(count, 3) distinct modes. The count uses top-card traits.
- 021 sends the chosen full front pile, including its stack and facedown undercards, to the remove area. That follows Q2269–Q2271. The shared full-line replacement still sends subordinate layers outside. Declining does not spend the once-per-name use.

Chain Raid onto a card that itself has `raidName` stays illegal. TTG-1-004, 012, 027, 031, 032, 033, 034, 056, 061, 062, and 074 stay unregistered on this 70-card line.

2026-10-26 (Asia/Taipei): those eleven cards are registered on `cursor/ttg-finish-593a`. See `docs/v2-handoff/TTG-finish.md`. This file stays the record of the 70-card line. That later registration is still scenario tests, not full official FAQ certification.
