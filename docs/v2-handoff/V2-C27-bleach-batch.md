# V2 C27 — BLEACH batch (3 cards)

Date: 2026-10-25. Branch work on top of `gpt/v2-production-primary-20261025`.

This round registers three BLEACH cards whose whole stored print is covered by a tested program. It is not FAQ certification. BLEACH moves from 170/276 to 173/276. Five-title V2 moves from 422/700 to 425/700. Unported BLEACH is 103. FAQ acceptance stays 0.

## Registered

| ID | Number | Kind | What the program does |
| --- | --- | --- | --- |
| BLC-4-052 | EX15BT/BLC-4-052 | oppFrontBelowPrinted | +1500 while an opposing front character's current BP is below that card's printed BP. Q2325: printed BP is the lower-left number. Energy-line cards do not count. No own-turn icon. |
| BLC-1-004 | UA08BT/BLC-1-004 | raidFrontRestUnder | Raid〈エス・ノト〉, Impact 1, and a front-only once-per-turn optional REST of one opposing front character at current BP 3000 or lower. |
| BLC-2-041 | EX07BT/BLC-2-041 | otherRetiredBp | +1000 this turn when another own character retired from the front or energy line. This physical card and a field do not count. |

## Source conflict

The catalogue text of BLC-2-041 says 己方回合中. The official page fetched 2026-10-25 says 「このターン中に自分の場の他のキャラが退場している場合、このキャラはBP+1000。」 That sentence is このターン中, so the bonus uses `turn:'any'` and the retirement ledger clears at the next turn boundary. The trait stays the single token 破面／涅骸部隊.

BLC-2-027 stays unregistered. Its catalogue also says 己方回合中, while the fetched official sentence has no 自分のターン中 and counts printed AP on the front. The site's 2500+ is the same conditional display used by BLC-4-052 and is not proof of an own-turn icon.

## Engine notes

- Passive kind `oppFrontCurrentBpBelowPrinted` reads live BP. A card already being measured stops the lookup, so two copies cannot recurse.
- Passive kind `otherOwnCharacterRetiredThisTurn` reads this turn's true retirements. Controller must be the owner, the card type must be character, and the uid must not be the source.
- `frontOnceProgram` may be a single `restOppFrontUnderBp`. The action is offered only when an opposing front character is at or below that BP. Skipping still consumes the once-per-turn use. No skip-next-ACTIVE is added.

BLC-2-041 left the C1 engine-blocked list. Do not treat 173/276 as official acceptance.

Tests: `tests/v2-c27-bleach-batch.test.mjs`.
