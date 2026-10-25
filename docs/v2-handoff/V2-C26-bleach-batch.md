# V2 C26 — BLEACH batch (10 cards)

Date: 2026-10-25. Branch work on top of `gpt/v2-production-primary-20261025`.

This round registers ten BLEACH cards whose whole stored print is covered by a tested program. It is not FAQ certification. BLEACH moves from 160/276 to 170/276. Five-title V2 moves from 412/700 to 422/700. Unported BLEACH is 106. FAQ acceptance stays 0.

## Registered

| ID | Number | Kind | What the program does |
| --- | --- | --- | --- |
| BLC-1-080 | UA08BT/BLC-1-080 | ownTurnImmune | BP reduction immunity. Own turn +1000 on printed BP 4000. ACTIVE life stays generic. |
| BLC-1-032 | UA08BT/BLC-1-032 | chooseBuffOrDown | Mandatory choose-one. Up to one own character +1000, or up to one opposing front −1000. |
| BLC-4-046 | EX15BT/BLC-4-046 | namedColorBuff | On play, up to one own purple 黒崎 一護 +1500 this turn. Name and color are both required. |
| BLC-3-004 | UA04NC/BLC-3-004 | restFrontEnergy | Main, rest self, once per turn, rest one other active front, then this card generates +1 of its own color. Generation still only counts on the energy line. |
| BLC-1-091 | UA08BT/BLC-1-091 | frontEmptyAlias | Alias 山本 元柳斎 重國. +1000 while no other own front character exists. Energy-line allies do not cancel it. No own-turn icon is printed. |
| BLC-3-007 | UA04NC/BLC-3-007 | traitTopDiscard | Top 3, up to one exact trait 護廷十三隊, rest to bottom, discard one hand card only if a card was added. |
| BLC-4-001 | EX15BT/BLC-4-001 | aliasNameTop | Alias バズビー. Top 3, up to one バズビー or ユーグラム・ハッシュヴァルト. Same bottom and discard rule. |
| BLC-3-002 | UA04NC/BLC-3-002 | fourNameTop | Top 3, up to one of 黒崎 一護, 阿散井 恋次, 朽木 ルキア, or 朽木 白哉. Compound name filters now allow four. |
| BLC-2-005 | EX07BT/BLC-2-005 | ownEffectRest | On play, if this card entered by an own character's effect, rest up to one opposing front. Trait stays the single token 護廷十三隊／殭屍. |
| BLC-2-006 | EX07BT/BLC-2-006 | ownEffectDrawPayImpact | Same character-entry gate draws 1. Main, once per turn, pay 1 AP, gain Impact 1 this turn. COLOR life is rest one opposing front and skip its next ACTIVE. |

## Engine notes

- `entry:'ownCharacter'` reads the latest completed move of that physical card onto front or energy. The reason must be `own-effect`, and the snapshotted source must be one of that player's characters. Paid play, paid Raid, life, a field source, and an event source fail closed. The older cause string `ownEffect` stays outside `OWN_EFFECT_ENTRY`.
- `buffOwnField` accepts an optional color. The name filter and the color are both checked when the choice opens and when it resolves.
- `searchTopOneBottomDiscard` compound filters allow 2–4. Other search ops stay at their previous caps.
- `oncePayProgram` may grant `grantSelfImpactThisTurn`.
- Passive kind `ownFrontNoOtherCharacter` counts other own front characters only.

## Still not registered

BLC-1-091 left the C1 partial list because both of its sentences are now tested. BLC-2-041 stays engine-blocked: the retirement counter still includes this physical card. Do not treat 170/276 as official acceptance.

Tests: `tests/v2-c26-bleach-batch.test.mjs`.
