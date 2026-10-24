# V2 Round 24 — cross-player LIFE ordering, conservative reentry, source boundaries, typed name payment

Scope: Draft PR #78, branch `gpt/v2-resume-20261022` targeting `cursor/v2-multi-retire-life-6ff5`.
Baseline before R24: `2711177ced2a15403863618cdba2a7d03cca6825`, Actions 39785577234 success.
Latest **code** SHA before this documentation commit: `68ddba44e5ff1e4ad3fa0a5e8048f7d6d231445c`.
Code Actions [39790506182](https://github.com/will00t-debug/Ua/actions/runs/39790506182)
**success**: Node 22 **1746/1746**, five-title matrix **60/60**, independent manifest and unported report passed.
This documentation and audit-gate commit requires its own Actions; do not substitute prior code CI.
Local git clone unavailable (GitHub DNS); these are **remote** actions, not locally-run Node22 tests.
No main merge, no Cursor PR #77 edit, no deploy, no force-push.

## A — official order and precise support boundary

Official Japanese [Q35/Q36/Q38](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行):
Q35: concurrent no-trigger LIFE release may be interleaved with trigger checks.
Q36: of two FINALs at empty LIFE, the first restores one, the second is not eligible if LIFE is now one.
Q38: new onPlay effects earned by entering via a trigger may be ordered against unresolved LIFE checks; still inside trigger check.
Official [Q12](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行&sub_category=勝利条件):
zero LIFE defeat is evaluated after all effects activated during trigger check finish.

| Trigger class | Current action and priority | Status |
|---|---|---|
| Simultaneous revealed LIFE cards, same defender | `lifeBatchStep` + `chooseLifeOrder`, bounded physical UID reveal | Verified Q35/Q36/Q73 subset |
| Defender COLOR / RAID generates new onPlay | Append whole earned block to existing `lifeBatchStep.entries` via `chooseLifeEffect` | R23 verified |
| Defender SPECIAL retires attacker's source with `onRetire` | Already-earned attacker-controlled onRetire interrupts unresolved defending LIFE, its optional target choice pauses and resumes; remaining FINAL processed after | R24 synthetic cross-player tested, both FINAL orders |
| Simultaneous independent source owners with multiple new onPlay/onRaid/onRetire groups | Existing `unshiftRetirementEntries` orders groups with active first, but no universal Q38 merger of both owners into LIFE choice | **Not certified** |
| Existing source program with multiple jobs and pending choice | Continue each full source program before qualified `sourceResolutionBoundary` movement triggers | Verified supported timings; never split printed program |
| Truly reentrant damage during open LIFE batch | Atomic fail closed, no second queue or winner | R23/R24 negative tests |
| Unproven source vanished/sealed + already-earned trigger cases | Retain original conservative semantics; do not add new ordering | Not certified |

R24 test `tests/v2-r24-cross-player-special.test.mjs` uses only supported DSL
`onRetire: buffOwnField, draw`; attacking-player option is selected before
the defensive second LIFE/FINAL check. Legal Human actions and both AI modes,
illegal wrong actor/UID, complete physical UID conservation and JSON
serialization validated. No claim of unrestricted global Q38 priority.

**Q12 correction:** the single-card LIFE zero branch and `finishPending`
now postpone winner declaration while an earned `effectQueue` continuation
is still outstanding. This is intentionally conservative: it does not create
a general all-timing event stack.

## B — LIFE damage reentry specification

`lifeRevealBatch` remains a single global physical batch with
`lifeRevealed` cards, `remaining` UID list and `lifeBatchStep` queue.
Guard for batch reveal now checks **both** players' revealed zones, as
single `damage` already does. No new pending type or second queue.
`tests/v2-r24-nested-life-conservative.test.mjs` covers:
opposite-owner Impact-style next damage, additionalBattleDamage,
FINAL at zero LIFE before new pending damage, atomic source snapshot,
independent UID reveal list, private view, legal replay after removing
unsupported injected continuation and JSON resume.
No nested LIFE is enabled. Future acceptance must model opposite-owner
continuations, each source/batch UID, win check, early FINAL restoration,
at most one reveal per physical card, and resume across nested pending.
Official rule for all these interactions not independently verified; fail closed.

## C — source completion coverage matrix (implemented *scope*, not universal proof)

| Program timing or boundary | Existing implementation / new R24 evidence | Outstanding |
|---|---|---|
| `onPlay` normal and trigger entry | `applyEffects` + `sourceMoveBoundary`, source completion; R20, R24 multi-UID | Source lost/sealed during queued program not fully certified |
| `onAttack` | Original `effectQueue` before `openBlock`; R21 tests | Cross-controller concurrent earned triggers |
| `onRaid` / `onRaided` | Base/order and entry grouping; R21 tests | All onRaid vs onPlay independently earned priority permutations |
| `phaseOrder` | Selected full source + boundary, R21 tests | Cross-player phase source priority |
| `onOutsideRecover` | Existing queue + source boundary, R21 tests | Source removal/field validity under every recovery kind |
| `onRetire` | Actual retirement UID/owner snapshot; legal choice before suspended LIFE; R24 | General sourceMoveBoundary for every onRetire path not certified |
| `moveTriggers` | Source-qualified completed hand→outside evidence + `sourceResolutionBoundary`; R24 two distinct physical UIDs, both owners with cross-title pack | General event/area/op profiles not approved |
| LIFE Trigger | Q73 reveal and defender ordering, actual UID and public reveals | Nested damage and multi-player unresolved trigger order |
| Delayed MAIN end | Existing scheduled retire + move semantics | Unreviewed cross-timing simultaneous move/retire, source seal |

`tests/v2-r24-source-multi-uid-boundary.test.mjs` requires physical
UID #2 and #1 both to move first while source is suspended, then the
source's remaining draw, then each moved physical event's draw exactly
once in event order, in both title controllers; human/normal/hard
share valid choices. State remains serializeable; private hand hidden.
Do not interpret the event-journal integer order as official order.

## D — strict data-driven named hand payment

New optional nested `discardGate.payment` profile:
`{zone:'hand',field:'name',match:'containsAny'|'exactAny',values:[...1–4 names]}`.
Strict UTF-8 printed-name comparison (substring or exact); no opponent
hand inspection, regex, arbitrary zone/field, empty or duplicate names,
unknown keys or arbitrary UID discards. Requires actual matching own
hand card. Optional decline means no cost and no effect; missing required
payment cannot create later effects. `frontOnceProgram` activation also
requires an eligible card rather than any hand card. Legacy unfiltered
`discardGate` is unchanged for older cards.
Program gates remain on **original** `effectQueue`; payment
`zoneMoveEvents` has exact UID/source. Human, Normal/Hard AI receive
the same legal actions; own private choices can show identity, opponent
public view cannot. Synthetic Japanese 「斬月」「月牙」 names tested across
two distinct title-pack IDs in `tests/v2-r24-typed-named-payment.test.mjs`.
This does **not** implement granted onAttack; BLC-2-019 remains locked.

## E — official BLC complete-card gate

Official print:
[BLC-2-019](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1):
blue 4/AP1/BP4000+, Raid Ichigo with Ready/front relocation, onPlay
**up to two** opposing front characters current BP >= 2000, BP −1500,
MAIN turn-once pay one own hand whose printed name **contains** 斬月 or 月牙,
then draw1, self BP+1000, and gain an optional draw1 on attack this turn,
RAID LIFE trigger (add to hand or Raid when eligible).
[BLC-2-047](https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=EX07BT%2FBLC-2-047):
blue 2/AP1 event, normal draw2; moving from own hand to outside by
an own field blue Ichigo's **effect** earns extra draw1; no LIFE Trigger.

Official rulings:
[Q1033/Q1046](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT):
047 bonus draw resolves **after full** Ichigo MAIN; no event printed
energy cost to activate the extra ability.
[Q2315/Q2316](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT):
once earned, later place 047 under another character facedown does
not erase draw; owner may inspect own facedown undercards, opponent may not.
R24 adds only named-cost primitive; no full dual BP target or
temporary grant/expires-on-attack-lifetime proof.
`tests/v2-r24-blc-complete-port-gate.test.mjs` blocks falsely treating
the incomplete printed cards as registry-complete and rejects
unsupported grant ability. The two cards **remain unregistered**; new
synthetic cards are never included in manifests.

## Counts and next highest priority

At code SHA `68ddba44` official V2 registry counts:
BLEACH 97 / TTG 35 / SLG 41 / SAO 91 / MST 48 = 312/700,
unported 388, net registered R24 0, full per-card FAQ certifications 0.
Tests before the doc/gate commit: 1746/1746 pass, 60/60 matrix.
After doc/gate commit rerun and report its own actual SHA.

R25: generic temporary onAttack grants with source/UID incarnation
and separate printed/granted program; dual distinct opponent-BP targets;
Q1033/Q2315 real movement chain and full BLC cards; multiple-player
Q38 simultaneous triggers and dynamic scheduling with official evidence;
official-proof nested LIFE model; full movement+source disappearance/
silence boundary matrix. Never merge main/deploy/force push.
