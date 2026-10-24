# V2 R21 — Completed movement coverage and Q73 LIFE evidence

Status: **audited partial coverage**, not full official FAQ acceptance.
Scope: `dist/universal-v2/engine.mjs`, `zone-move-events.mjs`, the original
`effectQueue` and current official Japanese public Q&A. No second event bus.

## Physical movement coverage matrix (source: successful engine mutation paths)

| Actual physical route | Journal | Controller/source semantics | Limit or remaining work |
| --- | --- | --- | --- |
| Deck -> hand (normal draw, own draw, deck search, TOP-N choice) | Yes | rule/own-effect + exact physical UID | Private to controller; multiple searched UIDs separately stamped |
| Deck -> outside (mill, TOP-N discard, selected discard) | Yes | own-effect + source where known | Pure deck reorder is NOT zone movement; do not create false event |
| Hand -> outside (paid cost, own/opponent discard, event play) | Yes | distinguishes payment, own/opponent effect, rule | Opponent legacy broad boolean intentionally unchanged |
| Outside -> hand (own recovery, LIFE GET / RAID GET) | Yes | own effect / life-trigger with physical UID | onOutsideRecover now queues same source completion marker |
| Hand -> field (paid play, COLOR trigger, self-recovered free ENERGY entry) | Yes | rule, life-trigger, own-effect | Raid-top hand -> new field NOT fully tracked |
| Field ENERGY -> FRONT and STEP FRONT -> ENERGY | Yes (R21) | rule, exact UID, no fabricated cost | Legal action validates printed STEP; no-op not journaled |
| Outside -> field (COLOR, common REST deployment) | Yes, for non-Raid | own-effect / life-trigger | Outside -> RAID-top field path missing |
| Field -> hand (existing bounce) | Yes | own-effect | Hidden Raid layers detached to outside in supported geometry |
| Field -> outside true retirement (visible top) | Yes | retirement; true retirement separate | Subordinate Raid cards moved by vacate are NOT each journaled |
| Raid top stripping -> outside | Yes | raid-strip / per-effect source | Limited to officially audited two-face-up geometry |
| LIFE -> outside, FINAL deck -> LIFE | Yes | rule / life-trigger | Current damage is sequential (NOT official Q73 simultaneous reveal) |
| Hand -> removed (end limit) | Yes | rule | Choice must complete before record |
| Full-line replacement: displaced field -> removed | **Missing** | No standalone `commitDestination` evidence yet | `vacate` lacks pack/source; top and buried UIDs need individual proof |
| Raid: base -> raid-under, top -> field | **Missing** | Top/bottom real cards do change positions | `appendCompletedMove` validates direct owner zone arrays; `raid-under` has no direct array; must add nested destination verification first |
| Existing Raid top -> facedown buried layer on re-Raid | **Missing** | Physical UID survives in `under` | Not all layered Raid shapes officially certified |
| Life RAID trigger outside -> Raid top field | **Missing** | Current `performRaid` lacks `from` context | Do not infer `hand` vs `outside` |
| Protection consumes facedown undercard -> outside | **Missing** | `detachFacedown` then pushes to outside | Avoid exposing hidden UID in public view |
| Protected leave declined -> outside/removed | **Partial** | Visible top journal after choice | All subordinate cards absent from ledger |
| Simultaneous multi-card field retirement | **Partial** | Visible top and independent retire ordering | Buried layers not each journaled |
| Cancelled/illegal/optional skipped movement | No record, **correct** | Must remain unchanged | Fail closed and immutable reducer on invalid action |
| Source already gone, silenced, or source not field resident | **Not fully resolved** | `sourceOnField` false or source metadata unavailable | Do not forge a source snapshot to make trigger eligible |

### R21 boundary routing

- `applyEffects` already wrapped ordinary program effects; MAIN
  `discardHandBuffSelf`, `restSelfThen`, `frontOnceProgram` already wrapped in R20.
- Added source completion for `onAttack` BEFORE `openBlock`.
- Each `phaseOrder` entry retains its own chosen order and completion marker.
- `onOutsideRecover` now schedules its own completion marker following its
  mandatory print, preserving recovering source's pending continuation.
- Raid `onRaided` base source and `onPlay`/`onRaid` top source use one
  boundary **per source**, preserving `raid-effect-order` player choice.
- No new pending kind, public source log, or per-title effect dispatcher.
- Unverified `onRetire` interruption, external effect cancellation and
  source leaving/silence mid-effect retain existing behavior; do not claim
  complete official certification.

## Official Q73 DAMAGE2 vs current reducer

Official:
- [Q71-Q73](https://www.unionarena-tcg.com/jp/faq/list.php?sub_category=%E3%83%80%E3%83%A1%E3%83%BC%E3%82%B82):
  blocked battle DAMAGE2 + IMPACT1 deals **one** player damage after a
  battle win (Q71); at LIFE=1 DAMAGE2 + FINAL checks only one card,
  and FINAL ends that trigger check (Q72); for 2+ damage reveal multiple
  LIFE **simultaneously**, choose order of multiple triggers (Q73).
- [Q35-Q38](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%B2%E3%83%BC%E3%83%A0%E9%80%B2%E8%A1%8C):
  interleave non-trigger send-outside and triggered effects at chosen
  order (Q35); two FINAL reveals do not imply both resolve (Q36);
  only LIFE trigger (not unrelated text) resolves (Q37);
  newly created onPlay effects stay inside trigger check and may be
  ordered against other unresolved triggers (Q38).

| Dimension | Existing reducer | Official / next integration requirement |
| --- | --- | --- |
| Damage event | `damage()` single LIFE, followed by `additionalBattleDamage` one at a time | Snapshot top min(damage,LIFE) at one time |
| Public reveal | One `publicReveals` record per step | All simultaneous reveals known together before ordering |
| LIFE physical destination | Move immediately LIFE -> outside then trigger | Q73: triggered card moves to outside after its effect; guard GET/RAID compatibility |
| Multiple triggers | Implicit deck order and queue restart | Defender chooses currently valid trigger order |
| Non-trigger timing | Outside immediately | Q35 permits interleaving with triggered effects |
| FINAL with low LIFE | `final` allowed only at zero LIFE when selected; later damage can still run | Q72/Q36 need explicit batch-end victory and reevaluation |
| OnPlay from COLOR/RAID trigger | Existing nested `applyEffects` | Q38 allows ordering new effects among outstanding triggers |
| Damage2 + IMPACT | Battle and unblocked paths separate | Q71 verifies 1 impact damage on blocked battle win |
| Win check | `damage` and `finishPending` may conclude per LIFE step | Defer until appropriate batch/trigger resolution; do not invent timing |
| Hidden data | Public view hides untouched LIFE / private journal | No hidden UID leak before proper reveal |

### Safe R21 implementation boundary

`dist/universal-v2/life-reveal-batch.mjs` provides
`planSimultaneousLifeReveal(life,damageCount)`, a **pure private reservation
planner only**: caps by actual LIFE, rejects forged/duplicate UIDs and invalid
counts, does not move cards, mutate `effectQueue`, reveal in public view,
resolve FINAL, or decide the winner. Independent positive/negative tests
include Q72/73 and double-FINAL candidates. **Not integrated in battle**.
Do not mark DAMAGE2/Q73 as fixed until the one existing LIFE queue supports
dynamic order, Q35/36/38 timing and all current cross-title regression tests.

## Official BLC port gate (not registered in R21)

- [BLC-2-019 print / Q1033](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1):
  Raid, 2 enemy BP targets onPlay, MAIN named 「斬月」/「月牙」
  discard cost, draw1, +1000 BP and granted optional onAttack draw.
- [BLC-2-047 print / Q1046](https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=EX07BT%2FBLC-2-047):
  play draw2, own blue Ichigo caused hand -> outside draw1; no energy
  cost to trigger. Q1033 requires 019 finish *entire* source program first.
- [Q2315](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT):
  earned effect persists when physical 047 later becomes facedown Raid undercard.
- Still **unported**: strict name-substring discard cost, two BP targets,
  granted onAttack, complete printed Raid/trigger and all full-card negative
  legal actions. Do not add only 047 bonus draw as an official port.

No official cards added. A future R22 needs layered destination journal
invariant before wiring the missing Raid or replacement routes and a dynamic
Q73 trigger-check batch inside the *existing* queue.
