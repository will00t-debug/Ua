# V2 C19 — optional AP, then named outside REST

Parent: C18 `b78614a`. That commit is pushed. Its Actions run is not treated as accepted until the log is read. This batch is the next shared ability.

## New shared behavior

`oncePerTurnGate` may now wrap `optionalPayApThen`. That payment may now wrap `deployOutsideNameRest`. No new pending kind was added. The existing choice order is:

1. `effect-once-choice`. Skip does not spend the printed name. Activate spends `name:` plus the source card's printed name, then starts the payment.
2. `effect-optional-pay-ap`. No ready AP means the payment does not open and the deploy does not start. The name is already spent when the player activated.
3. `effect-outside-name-rest`. Up to one own outside character with that exact printed name enters REST on front or energy. Color, required energy, and AP are not extra filters. A field, a Raid character, another name, an enemy outside card, and a hand card are not choices. A full line enters only by naming the card it replaces. The same physical UID moves, then its onPlay runs as an outside-effect entry.

`dist/universal-v2/ai.mjs` is unchanged. Easy AI skips the once choice. Normal and hard AI activate it. The payment choice falls through to the first legal action, which pays. The outside entry falls through to the first legal action, which declines the up-to-one deploy. GPT can prefer a legal REST entry after the payment without a new pending kind.

## Registered

BLEACH +1. MST +0.

- BLC-2-043 EX07BT 六車 拳西＆鳳橋 楼十郎. 青2 / AP1 / BP3000 / 護廷十三隊／涅骸部隊 / 発生青 / COLOR. Official page https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-043 with Q1043 and Q1044. COLOR returns one opposing front character at current BP 3500 or lower.

A rescan of BLEACH and MST outside REST prints found no other whole card that is only this sentence. BLC-2-038 still has its Raid, on-play buff, and conditional main entry. MST-1-007, MST-1-021, and MST-1-033 stay unregistered. SAO, TTG, and SLG were not registered.

## Counts

BLEACH 124/276. MST 56/80. Five titles 375/700. Strict FAQ certification stays 0.

Local Node 22 suite on `f268f41`: 2274/2274, matrix 60/60, manifest bleach 124 / mst 56 / total 375, unported 325. Actions for that commit is recorded separately from this note.
