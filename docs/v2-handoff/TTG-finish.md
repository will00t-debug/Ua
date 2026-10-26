# TTG remaining eleven cards

Registration plus scenario tests in `tests/v2-ttg-finish.test.mjs`. This continues from the 70-card line (`cursor/ttg-seven-more-593a`) and lands at 81/81 TTG cards, five-title registered 455. It is not full official FAQ certification. `fullyAccepted` stays 0.

| Card | Shared ability |
| --- | --- |
| TTG-1-004 ヴィラル | Front witness. A raid whose name contains グレンラガン onto シモン or ヴィラル may tuck the counterpart from hand or outside. A hand placement draws 1. Once per printed name. The controller chooses now, later, or decline. |
| TTG-1-012 シモン | Enters ACTIVE and cannot use the energy line. Looks at the top 6, takes up to one ニア or energy 8+, orders the rest, then discards at least 1. May active 1 AP, or retire one front when the discarded energy sum is 15 or more. Doubles generated energy only after the entry turn. |
| TTG-1-027 アークグレンラガン | Chain-raids exact グレンラガン, or raids シモン / ヴィラル directly. BP+1000 and printed IMPACT 1. Facedown entry scale and a 2-facedown attack for damage 2. |
| TTG-1-031 超銀河グレンラガン | Chain-raids exact アークグレンラガン. Printed damage 2 and BP+1000. Once per name: BP+5000 and unchoosable until the next own start, plus the energy 20 and energy 50 gates. |
| TTG-1-032 天元突破グレンラガン | Chain-raid only, not on the same turn the host raided, and not while another own top has this name. Own-turn impact 4 and damage 7. May absorb other front piles. Opponent effects cannot choose it unless it is silenced. |
| TTG-1-033 アークグレン | ACTIVE field energy +1. May tuck under an exact アークグレンラガン raid and draw 2. TTG-1-026 can now find this name. |
| TTG-1-034 超銀河ダイグレン | Hand energy -3 while no own field is on the board. Direct facedowns add energy. May capture a retired character. Tucks under an exact 超銀河グレンラガン raid and returns buried cards to hand. |
| TTG-1-056 シモン | Attacks only with ニア and a deck of 20 or fewer. At attack end, a free raid of a red ラガン or グレンラガン onto this card. |
| TTG-1-061 ニア | Mutual ban with カミナ. One Simon mode, or two different modes when the deck has 20 or fewer cards. |
| TTG-1-062 ニア | Same ban. Replays one low Simon entry. READY main rests this card, buffs a Simon, and may discard to active it when the deck is short. |
| TTG-1-074 グレンラガン | Raids only with ニア. Chains from exact ラガン or グレン onto シモン. Draw ladder, then deck-size BP and damage. |

Catalog disagreements kept in the proof:

- 027 facedown thresholds of 1 and 3, and the BP 5000 retire window, come from the legacy resolver. They were not re-read from the official FAQ page.
- Scaled facedown counts walk the recursive pile. TTG-1-034 energy counts only direct facedowns, matching 底下每張.
- 074's bottom is シモン only. Legacy ロシウ is not a base. 074 does not chain onto グレンラガン, because the chain names are exact ラガン and グレン.
- 056's attack-end raid follows the catalog: any red ラガン or グレンラガン. The legacy list TTG-1-073/074/076 is not the limit.
- 061 lets the player pick either unused mode. The legacy resolver forced recover, then deploy.
- COLOR and SPECIAL life sentences that are missing from the Chinese effect text use the shared handlers: 032 SPECIAL `retireOppFront`, 033 COLOR deploy green energy 2 or less and AP 1, 062 COLOR retire an opponent front of BP 2500 or less.
- A second raid of the same printed name stays legal. Official BLEACH raids already do that in one turn. TTG-1-032 uses its own chain flags instead of a global name ban. The catalog sentence on TTG-1-056 is not applied as that global ban.
- 032 may still be played normally. The chain flags gate Raid only.
- A played character without `enterAlwaysActive` enters REST. 012 is the exception.
