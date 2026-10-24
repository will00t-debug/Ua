# V2 C3 — BLEACH whole-print reuse and MST gap handoff

Branch: `cursor/v2-blc-mst-c3-20261024-6ff5`.
Base: C2 HEAD `f0a6ba8f7f53346973c5a097a4d92648a4a8c68f`, Actions run 40055521587 SUCCESS (Node v22.23.3, 2218/2218, matrix 60/60, manifest 360/700). That SHA is the latest CI-accepted registry. R58 `b03e8a6` remains the integration parent at 353/700. This note is not itself an Actions acceptance.

## Registered this round

BLEACH +2. MST +0.

- BLC-4-029 EX15BT. 青1 / AP1 / BP2000 / no trait / 発生青 / ACTIVE. The only card sentence is 「このキャラはBP2000以下のキャラにブロックされない。」 Reuses `blockBpRestriction` `{relation:'atMost',bp:2000,condition:null}`. ACTIVE life stays the generic ready-plus-BP+3000 trigger. Official page had no FAQ.
- BLC-4-031 EX15BT. 青1 / AP1 / BP2000 / no trait / 発生青 / no trigger. The only card sentence is 「【登場時】このキャラが自分の効果で登場していた場合、カードを1枚引く。」 Reuses `draw` with `entry:'ownEffect'`, the same gate as MST-1-023. Paid play and COLOR life do not draw. Official page had no FAQ.

A five-title rescan found no other unported card whose entire printed effect is either of those sentences. SAO-1-081, SAO-2-002 and SAO-2-054 also say they are not blocked by BP 2000 or lower, and each prints additional sentences, so they stay unregistered.

## Shared abilities

No new engine operation.

- `blockBpRestriction`
- `draw` + `entry:'ownEffect'`

## MST priority, handed to the shared core

MST-1-006, MST-1-007, MST-1-021 and MST-1-033 can later cause MST-1-009's own-effect entry. None of them is only that gate. The existing `deployNamedFromZones`, `deployOwnHandRest` and `deployOutsideTraitlessRestOrRaid` ops do not express 「手札から、青、必要エナジー3以下、消費AP1、指定名、レストで登場させるかレイドさせる」. Adding that op edits `pack.mjs` and `engine.mjs`, which GPT also changes. This round does not rewrite that core.

Needed primitive, for a later shared change:

`deployOwnHandRestOrRaid`: optional, from the controller's hand, character, printed color, AP, max energy, and either an explicit name list or any name. REST entry or a legal Raid. The entry cause must be an own-effect cause so MST-1-009 opens. Positive: a matching blue energy-3 AP1 named character can REST onto an empty line or Raid a legal base, and MST-1-009 then offers its two modes. Negative: wrong color, energy 4, AP 2, a name outside the printed list, a paid play of MST-1-009, and zero legal bases for the Raid branch.

Each of the four cards still has extra printed sentences, so the primitive alone does not make any of them READY:

- MST-1-006: optional pay 1 AP, draw 1, then the named trio.
- MST-1-007: choose draw-and-discard, or the named trio only after this card itself entered by an own effect; the Eris choice is once per turn.
- MST-1-021: the named trio on play, plus once per turn ready this character only while both ルーデウス and エリス are on the own field. AP is 2. DRAW life.
- MST-1-033: field. On play, look at top 3 and take up to one of the three names, order the rest on the bottom, discard 1 if a card was added. Main: REST and retire this field, then REST-or-Raid any blue energy<=3 AP1 character.

SAO prints that also contain REST-or-Raid, and stay with their other sentences: SAO-2-054 and the other hand/outside REST-or-Raid lines already in the unported SAO complement. They are candidates for the same primitive, not automatic ports.

## Still open

Local Node v22.23.4, 2026-10-24: `npm test` 2223/2223 fail 0, five-title matrix 60/60, independent manifest bleach 112, gurren-lagann 38, solo-leveling 46, sword-art-online 111, mushoku-tensei 55, total 362/700. Unported report: 338, of which BLEACH 164 and MST 25. FAQ certification stays 0. This SHA still needs its own GitHub Actions SUCCESS before it is accepted.

Phase 2 battle AI starts only after BLEACH 276/276 and MST 80/80, or after every remaining card has an official-page gap record and no further Cursor-only port is possible. This round has not reached either condition. No other unported BLEACH effect string is identical to an already registered card, so the next batch needs a fresh official-page check rather than a text clone.
