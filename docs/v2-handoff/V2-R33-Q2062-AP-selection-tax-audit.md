# UNION ARENA V2 R33 — Official Q2062 AP tax for card-effect selection

2026-10-23 Asia/Taipei. GPT PR [#78](https://github.com/will00t-debug/Ua/pull/78), branch gpt/v2-resume-20261022, base cursor/v2-multi-retire-life-6ff5. Baseline: b7b02699e664bbc979dbfafb6001093aeceefe41, [CI 39874453005](https://github.com/will00t-debug/Ua/actions/runs/39874453005) 1843/1843 and 60/60.

## Printed rule / FAQ

- [Official UA51BT/SLG-1-070 シーマ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-070): green0, AP1, BP1000, generated green1, character, ACTIVE LIFE, printed compound DFN／第四次架南島レイド. Its onPlay selects up to one OTHER OWN DFN field character (zero is legal). During the next OPPONENT turn, selecting that character with a card effect costs extra one AP.
- [Official Q2062](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT) (2026-04-17): without an extra AP protected target cannot be chosen; an unprotected other eligible target or zero if permitted remains legal. This does not charge to attack, block, or play the source card, and does not turn the target untargetable.
- [Official Q1119](https://www.unionarena-tcg.com/jp/faq/list.php?number=1119): a mandatory-target paid event must not be playable if it has no eligible affordable target. Reserve its printed event AP before determining whether a target will be payable. Q90 permits onPlay from FRONT or ENERGY, so the test grantor was correctly put in ENERGY to make the shielded enemy the only FRONT target.

## Implementation: common architecture only

- Existing continuousStates: selectionApTax has physical target UID, fieldEntryStamp, owner and source-independent grant. It becomes active only on NEXT opponent own turn, expires at that opponent attack-end, not instantly if granted in an opponent's current turn. Expiration and serialized strict schema are verified. Old physical incarnation cannot carry the effect.
- Existing effectQueue and pending decision: shared DSL grantSelectionApTaxOwnOtherTrait for a character onPlay with exact own OTHER DFN trait filter and optional 0/1 target. Record physical UID+field stamp in private choice, validate it before granting.
- At a legal card-effect target selection, shared selectionApSurcharge filters unaffordable targets and spendAp charges extra ready AP BEFORE applying the selected effect. No payment for zero, free alternate or normal attack/block. Reuse existing AI and Human legal-actions. Current effect selection prefilters mandatory candidates to avoid an empty unresolved pending decision.
- Mandatory target event preflight checks that one target remains legal after the printed event AP is RESERVED; only then event is offered as playable. Q2062 surcharge is the selection cost, not a second card-play cost. Automated cross-title fixture tests SAO-1-034 against SLG-1-070/SLG-1-072 with exactly one available AP.
- No new title-specific reducer, no additional effect scheduler, no relaxation of hidden-information or physical UID invariants. The official composite DFN trait is source-pinned, not silently replaced by legacy translation.

## Five batches and remote GitHub Actions

| Batch | Commits | Verified result |
| --- | --- | --- |
| A | bc1c3614b68a54f300aab2d3354298b320594341 | [39876085032](https://github.com/will00t-debug/Ua/actions/runs/39876085032): 1845/1845 Node22, 60/60 |
| B | c95b02957f6380faf74dbc33214ad5003cc2b467 | [39876436885](https://github.com/will00t-debug/Ua/actions/runs/39876436885): 1849/1849, 60/60 |
| C | c141febe234ec202b80ab0b07044f7a093885a04, f8405cb1d03da5f62b7a98ff711b0fa0f09f66a4 | Initial [39876846483](https://github.com/will00t-debug/Ua/actions/runs/39876846483) 1 false test assertion, corrected [39876971666](https://github.com/will00t-debug/Ua/actions/runs/39876971666): 1851/1851, 60/60 |
| D | d7a1d4ffda40a847dd484ef101a9a863fd9ec637 | [39877281648](https://github.com/will00t-debug/Ua/actions/runs/39877281648): 1852/1852, 60/60, register SLG-1-070 and independent manifest |
| E | 0d8db897a0689a90ee4906e4f82ac225c9a14f3c, c55a88ee7a7e95fcb8cc38495b3ea47d5eaaa8f5, f3e23759cc690934cc1785ccc606a54e703f9f28, 745d378be6105921a272d1e825818ea7ac9dc09d | Earlier [39877730350](https://github.com/will00t-debug/Ua/actions/runs/39877730350), [39877977606](https://github.com/will00t-debug/Ua/actions/runs/39877977606), [39878167491](https://github.com/will00t-debug/Ua/actions/runs/39878167491) red due to incorrect FRONT sole-target test assumption; corrected fixture to ENERGY grantor, [39878428295](https://github.com/will00t-debug/Ua/actions/runs/39878428295) 1854/1854 PASS, 60/60 PASS, independent manifest and inventory PASS |

Case evidence tests/v2-r33-selection-ap-tax-state.test.mjs; tests/v2-r33-selection-ap-action-pay.test.mjs; tests/v2-r33-slg070-official.test.mjs; tests/v2-r33-q2062-mandatory-event.test.mjs. Tests were executed by remote GitHub Actions Node22 only; no local clone/node testing claimed.

## Counts and hard blockers

At verified code commit 745d378be6105921a272d1e825818ea7ac9dc09d: BLEACH97, TTG36, SLG42 (+1), SAO92, MST48 = **315 of 700**, **385 unported**, all-card exhaustive official FAQ certification **0** (focused true-card tests are not zero). BLC-2-019, BLC-2-047 and BLC-4-034 remain NOT registered. BLC-4-034 mandatory REST and actual own retirement followed by facedown-under to hand still requires direct official ruling on retirement interruption, last-known undercard eligibility and Raid layering. Keep fail-closed and nested second LIFE atomic.

Next R34: research source-pinned MST-1-059 FRONT temporary energy generation permission (different from ordinary ENERGY and permanent frontGeneratesEnergy). Do not guess uncertain expiry or undercard chronology. Keep PR #78 against Cursor base; no main merge, no modification to Cursor PR77, no Vercel production deployment, no force push.

Documentation commit HEAD needs its own exact remote CI confirmation.