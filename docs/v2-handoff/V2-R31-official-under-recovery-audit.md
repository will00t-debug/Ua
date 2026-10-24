# UNION ARENA V2 R31 — official bottom-card recovery chronology and safe boundaries

Checked 2026-10-23 Asia/Taipei on [PR #78](https://github.com/will00t-debug/Ua/pull/78) starting HEAD `2fae2b6d5ac5628280bf1793241ee0cf5738b2c7`. This document distinguishes *officially established facts* from *unproven event ordering*. No claim of full BLC-4-034 certification.

## Official primary evidence
- [BLC-4-034 EX15BT](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034_p1), precise MAIN: `〖起動メイン〗〖レストにする〗〖このカードを退場させる〗このキャラの下の裏向きのカードを1枚まで手札に加える。` Two printed icon costs precede an up-to-one recovery effect. No cost icon is optional.
- [Q60–Q62: RAID layer dispositions](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%8A%B9%E6%9E%9C&sub_category=%E3%83%AC%E3%82%A4%E3%83%89): upon retirement (Q60), removal (Q61), or top-to-hand/deck (Q62), original Raid base goes to OWN outside; only the top returns to hand/deck on Q62. The card does NOT say that a recovered facedown non-Raid attachment is itself a new retirement.
- [Q81](https://www.unionarena-tcg.com/jp/faq/list.php?number=81): `1枚まで` legally includes choosing zero. This *does not* imply either MAIN payment is optional.
- [Q2315 and Q2316](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034_p1): previously earned BLC-2-047 draw remains even if moved facedown under 034; only its controller may inspect own facedown attached card.
- [Q1033/Q1046 EX07BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT): Ichigo MAIN completes before the earned 047 draw, and no extra printed energy payment is due.

## Official chronology versus current engine

| Stage | Established | Existing V2 behavior | Safe decision |
|---|---|---|---|
| Activate MAIN | Printed REST and self-retirement *cost icons* before recovery text | Generic main handler validates ready then REST; retirement handled separately | Missing joint preflight and serializable cost boundary, **not implemented** |
| Identify attachable card | The effect says up to one already facedown card under **this physical character** | `vacate` removes top and immediately exports all `under` / `stack` to outside | Never target a detached card via old parent reference. Need official last-known-information rule or narrowly safe escrow lifecycle |
| Pay REST and retire | Both mandatory printed icons; real retirement, not removal or bounce | `retire` calls `queueRetirement`, `vacate`, journals physical movement and onRetire | Must call true retirement path exactly once, not masquerade as `bounceToHand` |
| Choose 0/1 | Zero is allowed per Q81 | Pending legal choice can model 0/1 | Must not offer a stale UID from `vacate`-moved outside |
| Unselected lower cards | RAID bases go outside under Q60 | `vacate` sends *all* Raid and facedown under layers to outside | For layers not explicitly moved by an official recovery, preserve ordinary Q60 outside disposition |
| Earned 047 draw | Already earned event independent of subsequent 047 zone | Existing `sourceResolutionBoundary` stores move-earned trigger by physical UID | Do not retract earned event if its physical UID changes zone; no leak of attached identity |
| Cross-owner priority | Q2315/2316 do **not** describe interruption inside cost payment | Existing queue / leave-replacement pending | Fail closed on uncertain replacement and nested effects, preserve saved-game immutability |
| Multi-layer and nested Raid | Q60 answers Raid *base* disposition but not a unique multi-layer recovery timing | `vacate` recursively flattens `stack` and `under` | Do not introduce new multi-Raid geometry without official source |
| Viewer rights | Q2316: self-inspection yes, opponent no | `universalPublicView` hides opponent private `under`; private choices owner-only | Preserve source and physical UID separately from public identity |
| Field incarnation | New field residence has new `fieldEntryStamp` | Stamped observer and granted effects guard old incarnation | Verify retirement/recovery references stamp and reject stale continuation |

### Unresolved official questions — block Batch B complete support
1. Does the intended recovery select while the card is still attached, with a captured last-known set, even though the *effect text* resolves after paying genuine retirement? Generic Q60 does not explicitly decide this printed recovery exception.
2. If a retirement replacement / newly acquired retirement trigger starts during the MAIN payment, what is the required resolution priority, and must the recovery snapshot survive it?
3. Which specific subordinate physical card is eligible if multiple facedown cards and Raid bases coexist? The printed text says facedown under, but Q60 does not specify all nested geometries.
4. During a mid-payment source disappearance or seal, which costs have been paid and are the following effect and pre-earned observers preserved? No direct matching FAQ was located.

**Status:** BLC-4-034 MAIN unsupported; no generic undercard-recovery DSL added yet. Existing strict refusal test in `tests/v2-r30-blc-three-print-integrated-pilot.test.mjs` stays in place. This is a deliberate rules correctness boundary, *not* completion of Batch B.

## Next independent path
Inspect existing strict composite `searchTopOneBottomDiscard` + `cardHasName` for [SAO-1-005](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-005). Official print needs top 4 / exact printed Kirito OR Alice / at most one revealed take / order all remaining bottom / discard one iff took. A tested shared ANY name filter is preferable to making a special SAO reducer. TTG-1-028, SLG-1-070 and MST-1-059 retain separate blocked semantics (next-own-start attack ban, AP targeting tax, temporary front energy generation).



## R31 completion / source truth (2026-10-23)

Five-title formal acceptance on `6a885ca40251f4f914c2b8aa5a2f91ccd76b62e6`: [39870856615](https://github.com/will00t-debug/Ua/actions/runs/39870856615) **PASS 1834/1834 Node22; 60/60; independent manifest and unported report; 313/700, 387 unported, BLEACH97 TTG35 SLG41 SAO92 MST48, global all-FAQ certification 0**. Earlier source-pinned SAO-1-005 test was an isolated prototype only (`c2304609`); after shared public reveal (`1d54bdb8`), card was **actually added** via formal pin and independent manifest (`79ddbc73`). Initial registration `79ddbc73` CI [39870434867](https://github.com/will00t-debug/Ua/actions/runs/39870434867) failed with local JS identifier `id` undefined in evidence list; immediately corrected to `def.id` at `f796ed98` ([39870620372](https://github.com/will00t-debug/Ua/actions/runs/39870620372) success); extra real Kirito/Alice 0 and 1 alternatives `6a885ca4` passed.

The shared `searchTopOneBottomDiscard` template already supported multiple exact printed names with `logic:'any'`; **new R31 engine work was only missing public disclosure of the one chosen card**, through existing `publicReveals`, with all inspected-but-unselected cards kept private. Not a new reducer or queue. BLC-4-034 mandatory REST+true-retire+facedown one-recovery MAIN remains blocked due to unresolved cost vs `vacate` event order/last-known layers. Q60–Q62 Raid/base outside, Q2315 047 earned event, Q2316 owner-only face-down inspection are preserved. BLC-2-019/047/4-034 all **NOT registered**. No additional fully certified BLC card. Primary official vs reducer comparison above still applies; do not weaken failing R30 guard.

Other R28 candidates TTG-1-028 (next-own-start attack ban), SLG-1-070 (targeted additional AP), MST-1-059 (front temporary energy) all remain unported. Next step official undercard chronology proof or turn-bounded legal attack prohibition shared primitive, not name-specific SAO code. No nested LIFE relaxation, no production deployment, no main merge, no Cursor PR77 writes or force-push. Local Node22 not run; all cited green tests remote; final docs commit needs exact own CI.
