# V2 C5 — BLC-2-003 front discard then field BP reduction

Parent: C4 `b15c98addfdbc16e844016ebccdc852c2a02cfdb`. Actions run 40057561660 SUCCESS, 2026-10-24 11:15–11:16 Asia/Taipei, Node v22.23.3, 2226/2226, matrix 60/60, manifest 363/700. This note is not itself an Actions acceptance.

## Registered

BLEACH +1. MST +0. No new engine operation.

- BLC-2-003 EX07BT. 黄2 / AP1 / BP3000 / 星十字騎士団 / 発生黄 / ACTIVE. The only sentence is 「【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】BP1500以上の相手の場のキャラを1枚選び、このターン中、BP-1000。」 Reuses `frontOnceProgram`, a mandatory one-card `discardGate`, and `enemyBpDown` at current BP 1500 or higher on either opposing line. The official page had no FAQ. The same program is already used by registered SAO-2-043.

A five-title scan found no other unported card whose entire effect is that sentence. BLC-4-010 has the same cost and reduction, then also requires ユーハバッハ on the own field, so it stays unregistered.

## Official pages checked and still blocked

Fetched 2026-10-24.

- BLC-2-018: on play, return one opposing front character at BP 4000 or lower; plus a separate front once-per-turn draw then discard. Two sentences.
- BLC-4-037: on play, optional opposing front BP−1000 at BP 1500 or higher; the main ability pays 1 AP once per turn to activate that on-play effect again. The replay is not an existing operation.
- BLC-4-070: Impact null, and this character must block if able. Q2339 is on the page. Continuous mandatory block is not the existing on-play must-block grant.
- BLC-1-079: once per turn, discard one hand card, this character generates two extra green energy this turn. That energy grant is not the field-card energy program.
- BLC-1-108: field card rests and retires itself, then draws 2 and discards 1. The retire-self main program does not draw and discard.

Local Node v22.23.4: `npm test` 2230/2230 fail 0, matrix 60/60, manifest bleach 114, gurren-lagann 38, solo-leveling 46, sword-art-online 111, mushoku-tensei 55, total 364/700. Unported 336, of which BLEACH 162 and MST 25. FAQ certification stays 0. Push Actions run 40058004910 on `ad4b833` succeeded at 2026-10-24 11:22–11:23 Asia/Taipei, Node v22.23.3, with the same 2230/2230, 60/60 and 364/700.

Phase 2 battle AI has not started. BLEACH is 114/276 and MST is 55/80.
