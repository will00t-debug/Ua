# R27 — Q38 cross-owner physical movement / source & nested LIFE boundaries

Date 2026-10-22. Repo `will00t-debug/Ua`, EXISTING draft
[PR #78](https://github.com/will00t-debug/Ua/pull/78),
branch `gpt/v2-resume-20261022`, base `cursor/v2-multi-retire-life-6ff5`.
Initial green HEAD `05a377013928fe2acb99cc2b678c605ef6d17939`,
[Actions #39802263074](https://github.com/will00t-debug/Ua/actions/runs/39802263074)
Node22 1786/1786, seeded 60/60 matches, manifest 312/700.

## Five work batches (four code plus concentrated handoff)

**A — restore legal physical incarnation choices**
commit `4d834308ce2cb970adec383028187eacf6c0f59c`,
[Actions #39803940806](https://github.com/will00t-debug/Ua/actions/runs/39803940806) SUCCESS.
The generic earned `effect-rest-tuck` and `effect-tuck-moved` pending legal
actions now dynamically re-evaluate the same on-field source UID,
`fieldEntryStamp`, READY eligibility, existing facedown undercards, and exact
card still in own outside zone. A source who left / changed incarnation while
pending cannot illegally REST or tuck; the actor only sees a safe skip, preserving
the pending already-earned moved-card draw. Tests included in
`tests/v2-r26-q2315-under-earned-trigger.test.mjs`.

**B — source-event and paused move-order anti-forgery**
commits `0272eecd3db7fcd724dd55f556f3223591d791b1`,
`e15bdc3bfac3322da554b7fe25356822d714decc`,
`39ef2a2a65b45b060426b3ade4a01eea25245a78`.
`assertUniversalMatch` now validates BOTH paused `effect-move-order`
and queued `effectMoveOrder` groups, exact printed watcher
`sourceUid+sourceStamp+moveOrder+movedUid`, matching immutable
`zoneMoveEvents[].earnedFieldObservers`, and corresponding
`sourceResolutionBoundary`-originated hand→outside moved draw jobs.
No arbitrary queued commands, foreign owner, duplicate key, impossible amount,
or fabricated physical UID may enter an imported saved match. A paused
REST/tuck pending is also bound to an actual earned event provenance.
Dedicated adversarial tests cover corrupted owner, source, stamps, UID,
move order, count, duplicate key, and injected op. Earlier
`0272eec` CI RED due to doubled literal backslash in regex and
`e15bdc` CI RED due to an overly narrow expected test error.
Both were corrected without loosening engine validation.
The accepted first integrated green CI is below, not either intermediate RED.

**C — interleaved Q38 across *both players***
commit `047da8e694ec7a56cb9c406e042468633068a64d`;
[Actions #39804712396](https://github.com/will00t-debug/Ua/actions/runs/39804712396)
SUCCESS Node22 **1792/1792**, seeded five-title **60/60**, unchanged registry.
`tests/v2-r27-q38-cross-owner-earned-move-life.test.mjs`
uses two separate controller packs: attacker paid attack deals DAMAGE2;
defender's COLOR LIFE free deploys a character, enqueues onPlay
`drawDiscard` and draw; its actual owned event goes hand→outside
by that new character's effect; defender's own separate field watcher
may REST and place that event facedown under itself while the EVENT's
source-qualified earned draw is retained; the other simultaneously
revealed LIFE remains FINAL. Both **FINAL-first** and **entry-first**
selection orders are exercised, with actual physical UIDs, actor switching,
privacy, save/restore, and full 50-card conservation.
Q38 source [official rules](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%B2%E3%83%BC%E3%83%A0%E9%80%B2%E8%A1%8C):
when a LIFE trigger deploys a character, new onPlay effects can be
ordered freely with outstanding triggers, still inside trigger check.
This is a **specific bounded** cross-player case, not universal
concurrent ownership arbitration certification.

**D — atomic nested LIFE and pre-earning printed effect silence**
commit `767331ebf79e53fe71c7955d82adaac160209fb6`.
Extend the same real Q38 cross-owner window with attacker-side
`battleImpactDamage` or `additionalBattleDamage` while defender still
owns unresolved LIFE: cloned dispatch throws before original state mutates;
the owner retains physical event in hand, opponent view is identical and
no foreign LIFE card has been revealed.
In another branch, opponent-applied `originalEffectsDisabled` on the
defender watcher **before hand movement** prevents its printed watcher
from earning REST / tuck, while the moved printed event's own
previously valid draw still executes normally, then FINAL resolves.
Rule source [official MST Q2220 and Q2228](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT):
silence removes original abilities, not independently obtained abilities.
Nested LIFE is still intentionally **fail closed**, not generically supported.
The full D Actions status MUST be verified from its exact SHA before claim.

**E — consolidation** updates this document, `GPT-resume.md`, and
`GPT-resume-20261022.md` to distinguish actual green SHAs and remaining
unverified official rulings. Check the last documentation commit's own Actions.

## Known limitations and invariants

- R27 has **no new registered cards**. Independent manifest last green:
  BLEACH 97; TTG 35; SLG 41; SAO 91; MST 48; **312/700**,
  unported **388**, full per-card official FAQ certification **0**.
- BLC-2-019, BLC-2-047 and Riruka BLC-4-034 are unregistered.
  Testing partial source-text pilots is NOT a fully accepted official port.
- Q38 is scoped to tested COLOR → onPlay → movement trigger versus FINAL
  and earlier R24 SPECIAL → onRetire → FINAL, not a complete global
  cross-player simultaneous-priority engine. Unsupported nested second LIFE
  remains atomic fail-closed. Do NOT add a second reducer or queue.
- A queued attack-time ability already earned before source removal,
  original-effects silence at other timing boundaries, attack target
  replacement / multiple unrelated LIFE engines, and unbounded nesting
  still need independent proofs. Do not infer rules from CI alone.
- Work only on existing PR #78 branch; do not merge main, change Cursor PR #77,
  deploy Vercel, force push or rewrite earlier work. No local full Node run:
  test evidence comes from remote Node22 GitHub Actions.

## Next

1. Confirm exact Actions green for D, then final docs HEAD, reading failed test
   logs if necessary. Do not count unverified queued runs as success.
2. Prove Q38 dynamic opponent side generated onRetire on top of LIFE entry
   and mixed ENERGY/front field observers if official ruling covers them.
3. Explicitly model nested LIFE priority instead of accepting
   reentrant damage silently. Existing fail-closed must remain until then.
4. Pursue complete real-card acceptance separately, without fake pilot flags.
