# V2 C15 — hand REST or Raid, and MST-1-006

Parent: C14 `11e48a723dcc2d00bb2ac647eba20920dcad7fca`. Actions run 40061473088 SUCCESS, 2026-10-24 12:13–12:14 Asia/Taipei, Node v22.23.3, 2242/2242, matrix 60/60, manifest 368/700.

## New shared operations

`optionalPayApThen` and `deployOwnHandRestOrRaid`.

- The payment is optional and exactly 1 AP. With no ready AP the gated program does not start and no AP is spent.
- After payment, the printed `then` runs in order. MST-1-006 draws first, then selects.
- `deployOwnHandRestOrRaid` reads the controller's current hand. It keeps a character only when printed type, color, AP, and required energy all match. `names` is an explicit list or `null` for any name. Aliases use `cardHasName`. Silence removes the alias and leaves the printed name.
- Entry is optional. Zero legal cards produce no choice.
- REST entry uses cause `handEffect`. A legal Raid uses cause `handEffectRaid`, `entryReady:false`, and the existing `performRaid` base, layer, and UID rules. Both causes are now in `OWN_EFFECT_ENTRY`, so MST-1-004 and MST-1-009 open. Paid play and paid Raid stay outside that set. The older `deployOwnHandRest` cause string `ownEffect` is unchanged.
- A full line is entered only by naming the occupant, which goes to the remove area.
- GPT AI file `dist/universal-v2/ai.mjs` is unchanged. The generic first legal action pays the optional AP when it is open, then declines the optional deploy. Pending kinds: `effect-optional-pay-ap`, `effect-hand-rest-or-raid`. Action types: `chooseOptionalPayAp`, `chooseHandRestOrRaid`.

## Registered

MST +1. BLEACH +0.

- MST-1-006 UA54BT エリス. 青3 / AP1 / BP2500 / 発生青青 / COLOR. The on-play sentence is the optional AP payment, one draw, and up to one blue energy-3-or-less AP1 character named ルーデウス, エリス, or ルイジェルド, REST or Raid. COLOR returns one opposing front character of BP 3500 or lower. Official page had no card FAQ.

MST-1-007, MST-1-021, and MST-1-033 still have extra sentences, so they stay unregistered.

## Counts

BLEACH 118/276. MST 56/80. Five titles 369/700. Strict FAQ certification stays 0.

Local Node 22 suite on `08d41b0`: 2252/2252, matrix 60/60, manifest 369/700. That commit is pushed to `cursor/v2-blc-mst-c3-20261024-6ff5`. Its Actions run is recorded separately from this note.
