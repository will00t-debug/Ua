# V2 C16 — opponent-board draw and named ACTIVE

Parent: C15 `08d41b0c659a9db0c1f64426c142818dc5a07da5`.

## New shared operations

`oppRestCharacter` is a live board predicate. `drawIfOppRestCharacter`, `drawIfOppCharacterBpAtLeast`, and `activeOwnNamed` resolve on character onPlay.

- `oppRestCharacter` looks at the opponent's front, energy, or both. A hit is a character whose current ready flag is false. A rested field, a hand card, and an own character do not qualify.
- `drawIfOppCharacterBpAtLeast` reuses `oppCharacterBpAtLeast` and the live BP reader. Printed BP is not the check (Q749). The printed threshold must be a multiple of 500.
- `activeOwnNamed` chooses up to one own field character. The name uses `cardHasName`. Silence drops an alias and keeps the printed name. Zero matches open no choice. Skip is the first legal action, so the untouched AI declines it. `attemptFieldActive` still honors cannot-active and skip-next-active.
- These draws do not open a pending. The named ACTIVE pending is `effect-active-own-named`, action `chooseActiveOwnNamed`. `dist/universal-v2/ai.mjs` is unchanged.

## Registered

BLEACH +3. MST +0. BLC-2-066 was already the vanilla 更木 剣八 and is the real target.

- BLC-1-015 UA08BT BG9. 黄3 / 黄黄 / AP1 / BP3000 / 星十字騎士団. On play, draw 1 if the opponent has a REST character. No card FAQ.
- BLC-1-027 UA08BT ロバート・アキュトロン. 黄3 / 黄黄 / AP1 / BP3000 / 星十字騎士団. On play, draw 1 if an opposing character's current BP is at least 4000. No card FAQ.
- BLC-1-076 UA08BT 草鹿 やちる. 緑1 / 緑 / AP1 / BP2000 / 護廷十三隊 / ACTIVE. On play, set up to one own 更木 剣八 to ACTIVE. The ACTIVE life trigger is the standard one. No card FAQ.

A rescan of the five-title unported set found no other whole print that is only one of these sentences. BLC-2-004 still needs a hand-count comparison. BLC-2-062 still counts cards, not only characters. MST-1-007, MST-1-021, and MST-1-033 still have extra sentences.

## Counts

BLEACH 121/276. MST 56/80. Five titles 372/700. Strict FAQ certification stays 0.
