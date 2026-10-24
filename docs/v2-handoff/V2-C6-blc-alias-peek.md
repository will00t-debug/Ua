# V2 C6 — BLC-4-002 alias and top-card choice

Parent: C5 `ad4b8338702c5b995f6faee9ed21f18b6df3120f`. Actions run 40058004910 SUCCESS, 2026-10-24 11:22–11:23 Asia/Taipei, Node v22.23.3, 2230/2230, matrix 60/60, manifest 364/700. This note is not itself an Actions acceptance.

## Registered

BLEACH +1. MST +0. No new engine operation.

- BLC-4-002 EX15BT. 黄- / AP1 / BP1500 / no trait / 発生黄 / DRAW. The whole print is 「このカードは〈ユーグラム・ハッシュヴァルト〉としても扱う。【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。」 The alias is the existing `nameAliases` field. The on-play choice is the existing `peekTopOne`. Silence keeps the printed name ユーゴー and drops the alias. The official page had no FAQ.

A five-title scan found no other unported card with that entire effect text.

## Official pages checked and still blocked

Fetched 2026-10-24. Neither page had a FAQ.

- BLC-4-001: also treated as バズビー, then look at the top 3, add up to one バズビー or ユーグラム・ハッシュヴァルト, put the rest on the bottom, and discard one hand card if a card was added. The discard after a successful add is a second result.
- BLC-1-091: also treated as 山本 元柳斎 重國, and BP+1000 while no other character is on the own front. The empty-front BP bonus is not the existing empty-field hand-energy discount.

Phase 2 battle AI has not started.
