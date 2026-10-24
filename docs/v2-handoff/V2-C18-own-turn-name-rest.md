# V2 C18 — own-turn shared-name retirement REST

Parent: C17 `d52c00c480b4e406365f340b7a67db60224de2fb`. Actions run 40064741644 SUCCESS, 2026-10-24 13:03–13:04 Asia/Taipei, Node v22.23.3, 2261/2261, matrix 60/60, manifest 373/700.

## New shared behavior

`oncePerTurnGate` now accepts `ownTurnOnly: true`. When the controller is not the active player, the printed own-turn condition fails, the nested program does not start, and the shared use is not spent. A name scope still keys `name:` plus the printed `sourceName`. A card scope still keys that physical UID. The gate's existing `then` list is unchanged.

Character and field `onRetire` programs may now be a `oncePerTurnGate`. BLC-2-039 uses a non-optional name gate whose nested effect is optional `restOppFrontOne`. Skipping that REST still spends the name, because the retire sentence has already activated. Q1041 limits 「この効果」 to that sentence. Q1042 says a second copy cannot activate it in the same turn.

A blocker whose BP is strictly higher now retires the attacker. That is the lost battle, so no life damage is dealt, and the attacker's onRetire runs on the attacker's turn. Equality still retires only the blocker. Sniper battles are unchanged.

`dist/universal-v2/ai.mjs` is unchanged. There is no new pending kind. The nested choice is the existing `effect-rest-bp`, and its current AI policy still prefers a ready opposing front character.

## Registered

BLEACH +1. MST +0.

- BLC-2-039 EX07BT シャルロッテ・クールホーン. 青2 / AP1 / BP3000 / 破面／涅骸部隊 / 発生青 / ACTIVE. Official page https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-039 with Q1041 and Q1042. The ACTIVE life trigger is the standard one.

A rescan of the five-title unported set found no other whole print that is only this retire sentence. BLC-2-043 uses the same shared-name sentence around a different on-play payment and outside REST entry, so it stays unregistered. SAO, TTG, and SLG were not registered.

## Counts

BLEACH 123/276. MST 56/80. Five titles 374/700. Strict FAQ certification stays 0.

Local Node 22 suite on `4aefac6`: 2266/2266, matrix 60/60, manifest bleach 123 / mst 56 / total 374, unported 326. Actions for that commit is recorded separately from this note.
