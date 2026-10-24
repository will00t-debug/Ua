# V2 C2 — BLEACH and SAO whole-print registration

Branch: `cursor/v2-blc-sao-c2-20261024-6ff5`.
Base: verified GPT R58 HEAD `b03e8a6674ab09323b140a80385bef0f3e34f1db`
(`gpt/v2-r58-safe-integration-20261024`, Actions run 40053951453 SUCCESS).
This note records the registration. Local Node v22.23.4 on 2026-10-24: `npm test` 2218/2218, matrix 60/60, manifest 360/700, unported 340, `independentlyCertified` 0. The new HEAD still needs its own push Actions SUCCESS before it counts as accepted. FAQ certification stays 0.

## Registered this round

BLEACH +3:

- BLC-1-007 UA08BT. 黄3 / AP1 / BP3000 / 発生黄黄 / no trigger. Hand yellow −1 while the opponent field has purple or green.
- BLC-1-044 UA08BT. 紫3 / AP1 / BP3000 / 発生紫紫 / no trigger. Hand purple −1 while the opponent field has yellow or green.
- BLC-1-073 UA08BT. 緑3 / AP1 / BP3000 / 発生緑緑 / no trigger. Hand green −1 while the opponent field has yellow or purple.

SAO +4:

- SAO-1-015 UA15BT. 黄3 / AP1 / BP3000 / 発生黄黄 / no trigger. Hand yellow −1 while the opponent field has blue or green. Imported gen 3 corrected to official 2.
- SAO-1-050 UA15BT. 青3 / AP1 / BP3000 / 発生青青 / no trigger. Hand blue −1 while the opponent field has yellow or green. Imported gen 3 corrected to official 2.
- SAO-1-092 UA15BT. 緑3 / AP1 / BP3000 / 発生緑緑 / no trigger. Hand green −1 while the opponent field has yellow or blue. Imported gen 3 corrected to official 2.
- SAO-1-090 UA15BT. 緑3 / AP1 / BP3000 / 発生緑緑 / COLOR. Impact 1 while this character's current BP is at least 4000. COLOR deploys one green hand character with energy at most 2 and AP 1, ACTIVE. Imported gen 3 corrected to official 2.

Required energy stays 3 and AP stays 1 on every card above. Japanese pages fetched 2026-10-24 had no card FAQ.

## Reused shared abilities

No new engine operation.

- `opponentFieldColorsHandEnergyDiscount` for the six hand-energy cards.
- `conditionalImpactBpAtLeast` at 4000 for SAO-1-090.
- `deployHandCharacter` green / maxEnergy 2 / AP 1 for SAO-1-090 COLOR life.

A rescan of every still-unported BLEACH and SAO print found no other card whose entire effect is that hand-energy sentence or that self-BP Impact sentence. Cards that mention energy or Impact and also print another sentence stay unregistered.

## Still blocked

ENGINE BLOCKED: BLC-1-076, BLC-1-084, BLC-2-041, BLC-2-068, SAO-1-076, SAO-1-085, SAO-1-103, SAO-2-037, SAO-2-039, SAO-2-066.
PARTIAL: BLC-1-091.
REVIEW PENDING includes BLC-4-044 and SAO-1-097. Keyword hits are not READY.

Expected registration after this round: BLEACH 110, SAO 111, TTG 38, SLG 46, MST 55, total 360/700. Unported 340. Strict FAQ acceptance 0.
