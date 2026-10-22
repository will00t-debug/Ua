# R23 — dynamic LIFE entry order and physical hidden-layer moves

Branch `gpt/v2-resume-20261022`, Draft PR #78 only. Starting HEAD d4e7df1.
Local clone succeeded this round; Node 22.23.4 is available. No deployment.

## Official timing evidence (retrieved 2026-10-22)

Japanese originals: [game progression Q35–38](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行),
[DAMAGE2 Q71–73](https://www.unionarena-tcg.com/jp/faq/list.php?category=キーワード効果&sub_category=ダメージ2).
The following are paraphrases, not replacement rule text.

| FAQ | Timing requirement | Implementation / acceptance |
|---|---|---|
| Q35 | Non-trigger disposal can be ordered with triggers. | Retain R22 UID choice. |
| Q36 | Two FINALs at zero LIFE: first replenishes; second cannot activate at one LIFE. | Retain live eligibility check. |
| Q38 | Entry creates effects; these may be ordered with unresolved LIFE triggers. The check remains open. | COLOR/RAID complete entry blocks join existing `lifeBatchStep.entries`; defender chooses `chooseLifeEffect` or `chooseLifeOrder`. |
| Q71 | DAMAGE2 + IMPACT1 battle victory deals one damage. | Existing Impact path unchanged. |
| Q72 | One remaining LIFE reveals only one; FINAL does not create another DAMAGE2 check. | Retain bounded reveal snapshot. |
| Q73 | Reveal damage-count LIFE together; choose trigger order; release after processing. | Preserve R22 atomic reveal; release COLOR card before choosing the earned entry effect. |

A printed program is kept intact through target/discard decisions and its source
completion boundary. Ordering happens between earned programs, not between
individual draw/discard instructions. Serialized continuation, immutable invalid
actions, two AI difficulties and both COLOR/RAID order permutations are tested.
Only same-defender entry blocks are added to this ordering window. Independent
onRaid/onPlay blocks currently retain their existing grouping. Arbitrary new
opponent effects, SPECIAL/onRetire interleaving, and reentrant damage priority
are NOT fully certified by this change. Existing retirement priority is retained;
Q38 alone does not justify inventing cross-player chain scheduling.

## Nested LIFE model: deliberately not enabled

The batch's remaining UIDs refer exclusively to `lifeRevealed`. Entry blocks live
on the original queue continuation, never in a second LIFE queue. A second damage
batch must not overwrite these UIDs, consume an already revealed card, or decide
victory before existing FINAL/entry programs finish. Unsupported reentrant damage
must reject before any mutation, including the legacy single-damage path.
A future supported model needs an officially justified priority relation between
both checks, not merely a stack of batch objects. Required cases: new damage at
zero hidden LIFE; FINAL replenishment then damage; two owners; SPECIAL retirement
and onRetire; stop/resume while both checks have unresolved effects. No complete
chain-damage support or full Q38 certification is claimed.

## C — actual Raid departure and Q61 correction

Official Japanese [Q60–62](https://www.unionarena-tcg.com/jp/faq/list.php?category=カード効果):
Raid bases go outside when the top retires, is removed, or returns to hand/deck.
Q61 therefore contradicts R22's removal of the entire stack. Corrected only the
existing `vacate` destination: visible top uses its designated destination;
subordinate physical cards go outside and receive individual completed-move
records. Their reason is `rule`, never `retirement`. Only the top generates a
true-retirement event/onRetire. Journal sequence is bookkeeping, not evidence of
an official selectable order between subordinate moves. No new Raid geometry is
made playable; existing strip eligibility remains restricted. Departing source
metadata is unknown unless captured by the original route; no owner/controller
or field-source proof is invented for underlying rule cleanup.

## D — facedown consumption provenance

`zoneMoveEvents` now records completed protection consumption (`protection`) and
rule cleanup separately, with original immediate `attachedToUid`, physical UID,
`wasFaceDown`, and `identityViewersBefore`. The protective field top is the known
source; ordinary rule cleanup has no invented field source. Hidden history stays
in the private ledger. Before movement, the owner can inspect their attachments,
the opponent cannot; after an actual move outside the card becomes public.
Official [Q2316, EX15BT](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT)
confirms this owner/opponent distinction. No speculative hidden identity is used
to produce triggers. Unknown source metadata stays null/false. Protection
consumption does not retire the undercard. If loss of a modifier subsequently
kills the top, that is a separate genuine retirement. Existing real TTG-1-073 vs
BLEACH scenarios now assert the journal, in addition to synthetic negative UID,
actor, owner, visibility and serialized-history tests. Other attachment effects
not routed through these operations remain unaudited.

## E — BLC complete-port gate (no registration)

Re-read official EX07BT BLC-2-019 and 047 print and EX07BT Q1033/Q1046,
EX15BT Q2315/Q2316. URLs: [019](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1),
[047](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-047),
[EX07BT FAQs](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT).

| Requirement | Current gate |
|---|---|
| 019 named substring discard (斬月 or 月牙) | Missing typed cost selector; generic discardGate is not sufficient. |
| 019 up to two enemy front BP >=2000, -1500 | Missing complete distinct-target selection with live eligibility acceptance. |
| 019 MAIN draw1, self +1000, granted optional attack draw | Granted attack program/lifetime not implemented for this card. |
| 019 Raid base and Raid LIFE trigger | Generic framework exists; complete-card tests absent. |
| 047 normal play draw2 | Generic draw exists; not a complete registration. |
| 047 own blue Ichigo hand-to-outside provenance | Existing source-qualified moveTriggers are available. |
| Q1033 source MAIN finishes before bonus draw | Existing sourceResolutionBoundary; full 019 scenario still gated. |
| Q1046 no printed energy needed for extra effect | Existing movement trigger is independent of event-play energy. |
| Q2315 earned trigger survives later facedown placement | Official yes; full real-card placement/source sequence not certified. |

Both remain unregistered. Do not infer complete support from synthetic programs.
Next priorities: cross-player Q38/SPECIAL retirement order, verified nested damage
priority, independently earned onRaid/onPlay ordering, then typed named payment
and granted attack effects. No second reducer/queue or new official card in R23.

Full-suite correction: three legacy protected full-line replacement tests still
expected underlying cards in removed. Updated only those destination assertions
to outside per Q61; retained top removal, AP, pending, deployment, UID and privacy
checks. First C/D CI runs therefore failed, not successful acceptance milestones.
