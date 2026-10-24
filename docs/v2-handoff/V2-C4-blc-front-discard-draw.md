# V2 C4 — BLC-4-025 front discard then draw

Parent: C3 `0024fcce1551e5c343e08db00a18d2c0757e197b`. Actions run 40056945310 SUCCESS, 2026-10-24 11:06–11:07 Asia/Taipei, Node v22.23.3, 2223/2223, matrix 60/60, manifest 362/700. This note is not itself an Actions acceptance.

## Registered

BLEACH +1. MST +0. No new engine operation.

- BLC-4-025 EX15BT. 青4 / AP1 / BP4000 / no trait / 発生青 / no trigger. The only sentence is 「【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】カードを1枚引く。」 Reuses `frontOnceProgram` with a mandatory one-card `discardGate` and then `draw` 1. The official page had no FAQ.

A five-title scan found no other unported card whose entire effect is that sentence. BLC-4-010 uses the same cost icons and then reduces an opposing character, and it also requires ユーハバッハ on the own field, so it stays unregistered. SAO-2-021 and SAO-1-096 pay one hand card once per turn for a different result. They stay with GPT.

## Official pages checked and still blocked

Fetched 2026-10-24. These are not whole-print matches of an existing operation.

- BLC-1-003: BP+1000 per opposing rested front character. Q535 says a blocker that rests during this attack does raise BP. The COLOR life rests one opposing front character and skips its next ACTIVE. Neither sentence is a generic color trigger.
- BLC-1-015: on play, draw 1 if the opponent has a rested character.
- BLC-1-019: BP+500 while the opponent has at least two characters at current BP 4000 or higher. `oppCharacterBpAtLeast` is true for one character.
- BLC-1-027: on play, draw 1 if the opponent has a character at current BP 4000 or higher.
- BLC-1-032: event choose-one of an optional own BP+1000 or an optional opposing front BP−1000. `chooseOne` does not allow `enemyBpDown`.
- BLC-2-027: during your turn, BP+500 for each own front character whose printed AP is 2 or higher. Q1035: 元々の消費AP is the printed AP. `bpEach` is locked to rested printed-BP-at-most with a trait.
- BLC-2-041: during your turn, BP+1000 if another own field character retired this turn. `ownRetiredThisTurn` does not express the other-card exclusion.
- BLC-2-054: during your turn, BP+500 if you put a hand card outside this turn. The existing movement predicate is own-effect movement, not every hand-to-outside payment.
- BLC-4-028: REST, once per turn, BP+1000 until your next turn starts. `buffSelfUntilNextOwnStart` is only legal inside an own-effect on-play choice.
- BLC-4-038: during your turn, BP+1500 if any own front character has printed AP 2 or higher. Q2319 repeats the printed-AP definition. There is no existence form of that check.
- BLC-4-046: on play, up to one purple 黒崎 一護, BP+1500 this turn. `buffOwnField` takes one filter, not color and name together.

Local Node v22.23.4: `npm test` 2226/2226 fail 0, matrix 60/60, manifest bleach 113, gurren-lagann 38, solo-leveling 46, sword-art-online 111, mushoku-tensei 55, total 363/700. Unported 337, of which BLEACH 163 and MST 25. FAQ certification stays 0. Push Actions run 40057561660 on `b15c98a` succeeded at 2026-10-24 11:15–11:16 Asia/Taipei, Node v22.23.3, with the same 2226/2226, 60/60 and 363/700.

Phase 2 battle AI has not started. BLEACH is 113/276 and MST is 55/80.
