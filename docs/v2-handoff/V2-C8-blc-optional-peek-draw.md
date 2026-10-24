# V2 C8 — BLC-4-030 and BLC-4-066 optional discard, peek, draw

Parent: C7 `a5bcc8d437ebae7f6e72d1fbbd4c588ca17d67c7`. Actions run 40058774889 SUCCESS, 2026-10-24 11:33–11:34 Asia/Taipei, Node v22.23.3, 2234/2234, matrix 60/60, manifest 365/700. This note is not itself an Actions acceptance.

## Registered

BLEACH +2. MST +0. No new engine operation.

Both official pages, fetched 2026-10-24, have no FAQ and the same sentence: 「【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、カードを1枚引く。」

- BLC-4-030 EX15BT 四楓院 夜一. 青- / AP1 / BP1500 / no trait / 発生青 / DRAW.
- BLC-4-066 EX15BT 卯ノ花 烈. 緑- / AP1 / BP1500 / 護廷十三隊 / 発生緑 / ACTIVE.

The program is an optional `discardGate`, then `peekTopOrBottom`, then `draw` 1. Declining the hand card does not look or draw. An empty hand cannot pay, so those cards also do not look or draw. Putting the looked-at card on top means the following draw takes it. The opponent does not see that card.

A five-title scan found no other unported card with either catalogue sentence. BLC-1-078 was also fetched: Step plus an attack-time choice of one own-field Gotei card, BP+500. The shared field buff selects characters only, while the official text does not say キャラ, so it stays unregistered.

Local Node v22.23.4: `npm test` 2238/2238 fail 0, matrix 60/60, manifest bleach 117, gurren-lagann 38, solo-leveling 46, sword-art-online 111, mushoku-tensei 55, total 367/700. Unported 333, of which BLEACH 159 and MST 25. FAQ certification stays 0. Push Actions run 40059217595 on `9a1c215` succeeded at 2026-10-24 11:39–11:40 Asia/Taipei, Node v22.23.3, with the same 2238/2238, 60/60 and 367/700.

Phase 2 battle AI has not started. BLEACH is 117/276 and MST is 55/80.
