# V2 C28 — BLEACH batch (4 cards)

Date: 2026-10-25. Branch work on top of `gpt/v2-production-primary-20261025`.

This round registers four BLEACH cards whose whole stored print is covered by a tested program. It is not FAQ certification. BLEACH moves from 173/276 to 177/276. Five-title V2 moves from 425/700 to 429/700. Unported BLEACH is 99. FAQ acceptance stays 0.

## Registered

| ID | Number | Kind | What the program does |
| --- | --- | --- | --- |
| BLC-1-062 | UA08BT/BLC-1-062 | buffThenAp | Choose one own field character, this turn BP+1000, then up to one own AP card may become ACTIVE. A field is not a character. ACTIVE life stays generic. |
| BLC-4-028 | EX15BT/BLC-4-028 | restUntilNextOwn | Main: rest this character, once per turn, BP+1000 until the next own turn starts. Front and energy can both pay the rest. |
| BLC-4-037 | EX15BT/BLC-4-037 | replayFrontDown | On play, up to one opposing front character at current BP 1500 or higher gets −1000. Main pays 1 AP, once per turn, and uses that same effect. |
| BLC-2-032 | UAPR/BLC-2-032 | printedApTop | Top 5, up to one card with printed AP 2 or higher to hand, the rest to the bottom in any order. No discard. |

## Source notes

Official pages fetched 2026-10-25. The fetch drops cost icons. BLC-4-028's surviving sentence is the until-next-own-start bonus, and the catalogue brackets supply Rest and once per turn. The site's 4000+ is that bonus, not a higher printed BP. BLC-4-037's second sentence lost the bracket text; the catalogue reads it as activating the on-play effect, and the first sentence matches the fetched BP 1500 front reduction. BLC-1-062's catalogue line is the short fingerprint 「一個己方角色本回合 BP +1000，可回復 1 AP。」 The official sentence is 「自分の場のキャラを1枚選び、このターン中、BP+1000。自分のAPカードを1枚まで選び、アクティブにする。」 Its ACTIVE line is the generic active trigger. BLC-2-032's catalogue line is 「登場：查看己方牌堆頂 5 張，可公開其中最多 1 張原始 AP 消耗 2 以上的卡並加入手牌，其餘以任意順序放至牌堆底。」 The official sentence matches that search, and Q1037 says 元々の消費AP is the printed AP. The on-play icon is in the catalogue and was stripped from the fetch.

## Engine notes

- A mandatory `buffOwnField` on an event is playable only when an own field character can be chosen.
- `restSelfThen` may be once per turn from either line and grant `buffSelfUntilNextOwnStart`. The older front mill program is unchanged. The match check accepts that printed main as a source of the timed BP buff.
- `oncePayProgram` may run one `enemyBpDown`. The action is offered only when a card in the printed window exists.
- `searchTopUpToTwoBottom` accepts a `printedApAtLeast` filter. It reads printed AP, not a modified cost.

Do not treat 177/276 as official acceptance.

Tests: `tests/v2-c28-bleach-batch.test.mjs`.
