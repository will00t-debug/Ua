# V2 C17 — own name plus fewer hand cards

Parent: C16 `997f5343dfaf5975c95e8949fbed5ba23279dc40`.

## New shared operation

`ownHandFewerThanOpponent` compares the two hand lengths. Every physical hand card counts. `drawIfOwnNameAndHandFewer` draws only when that comparison is strict and `ownNameExists` finds the printed name on an own field character.

The check happens after the source has left the hand. An equal hand does not draw. Silence drops an alias and keeps the printed name. A field card and an opponent's copy do not satisfy the name. No new pending, so `dist/universal-v2/ai.mjs` is unchanged.

## Registered

BLEACH +1. MST +0.

- BLC-2-004 EX07BT ユーグラム・ハッシュヴァルト. 黄4 / AP1 / BP4000 / 星十字騎士団 / 発生黄. On play, draw 1 when ユーハバッハ is on the own field and this hand has fewer cards than the opponent. No card FAQ. BLC-1-021 is the registered vanilla target.

BLC-1-020 also compares hand size, then makes the opponent discard, and it still has Raid, Impact, and an attack-end sentence, so it stays unregistered. BLC-2-062 still counts cards rather than only characters.

## Counts

BLEACH 122/276. MST 56/80. Five titles 373/700. Strict FAQ certification stays 0.
