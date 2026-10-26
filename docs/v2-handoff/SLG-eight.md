# SLG eight shared-engine batches

Work continues on `cursor/slg-eight-593a` from `cursor/ttg-finish-593a`.
`fullyAccepted` stays 0. Registration plus these scenario tests is not official FAQ certification.
Official Japanese pages for these cards were not re-read in this session. The catalogue Traditional Chinese in `dist/solo-leveling.mjs` is the text anchor. Where that paraphrase and a later official reading disagree, keep the disagreement visible here.

## Batch 1 — pay, other Impact, named retire recovery, rest-buff-hand

Registered:

- UA51BT/SLG-1-017 水篠 旬. Empty own field reduces required energy by 2. The card is purple and costs 2, so the shared empty-field discount matches the printed purple-2 reduction. OnPlay peeks one top card.
- UA51BT/SLG-1-074 ルノー. OnPlay may grant Impact 1 this turn to one other own DFN character. New shared op `grantOtherImpactThisTurn`.
- UA51BT/SLG-1-050 観月 絵里. Main REST, true retire, then optional recovery of one own outside character named 水篠 旬. New shared main `restRetireRecoverName`.
- UA51BT/SLG-1-071 マリー. Main once per physical card: REST, BP+1000 to another own character this turn, then this card returns to hand. New shared main `restBuffOtherThenHand`.

Official trait token for 074 and 071 is `DFN／第四次架南島レイド`. The catalogue split is not registered.
ACTIVE and DRAW life texts stay on the shared life handler.
