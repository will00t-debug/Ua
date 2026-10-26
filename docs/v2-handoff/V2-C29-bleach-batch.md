# V2 C29 — BLEACH batch (3 cards)

Date: 2026-10-25. Branch work on top of `gpt/v2-production-primary-20261025`.

This round registers three BLEACH cards whose whole stored print is covered by a tested program. It is not FAQ certification. BLEACH moves from 177/276 to 180/276. Five-title V2 moves from 429/700 to 432/700. Unported BLEACH is 96. FAQ acceptance stays 0.

## Registered

| ID | Number | Kind | What the program does |
| --- | --- | --- | --- |
| BLC-1-078 | UA08BT/BLC-1-078 | attackTraitBuff | Step from front to energy. On attack, up to one own field card with 護廷十三隊 gets BP+500 this turn. |
| BLC-2-072 | EX07BT/BLC-2-072 | hitsugayaHandRest | On play, if 日番谷 冬獅郎 is on the field, may REST one green character of energy 2 or less and AP 1 from hand. |
| BLC-4-064 | EX15BT/BLC-4-064 | greenEventOrFieldTop | Top 3, up to one green event or green field to hand, the rest to the bottom, then discard one hand card only if one was added. |

## Source notes

Official pages fetched 2026-10-25. The fetch drops timing icons. BLC-1-078's surviving sentences are the step parenthetical and 「自分の場の［特徴：護廷十三隊］を1枚まで選び、このターン中、BP+500。」 The catalogue fingerprint says 角色. The official sentence does not limit the choice to characters, so a field with that trait is a legal target. The catalogue still supplies the stripped 攻擊時 icon. The site's 3000+ is that bonus, not a higher printed BP. ACTIVE life stays generic.

BLC-2-072's official body matches the catalogue deploy. The on-play icon was stripped and the catalogue keeps 登場. Front and energy both count as 自分の場. The name check uses the existing character-name field predicate.

BLC-4-064's official body matches the catalogue search, including the discard after a successful add. The on-play icon was stripped. Its trigger line is empty.

BLC-2-050 stays unregistered. The fetched sentence collapsed to 「特徴を持たずを持たない」, which is not a readable official ruling for the catalogue's traitless-and-no-Raid line.

## Engine notes

- `buffOwnTrait` may resolve on attack as well as on a Raid base. The choice is still any own field card with the trait, and it can be skipped.
- `deployOwnHandRest` may require one own field name before it offers the hand. A miss does not open a choice. The older ungated hand entry is unchanged.
- `searchTopOneBottomDiscard` accepts `colorAndType` values such as `green:event` and `green:field`.

Do not treat 180/276 as official acceptance.

Tests: `tests/v2-c29-bleach-batch.test.mjs`.
