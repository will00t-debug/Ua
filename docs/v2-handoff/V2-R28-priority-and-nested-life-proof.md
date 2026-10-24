# R28 Batch E — official LIFE and cross-player priority evidence / fail-closed design

Date 2026-10-22. Existing PR #78 only, no main merge or production deployment. This is a **gap analysis**, not authorization for a nested LIFE stack.

## Official rulings by bounded application

| Evidence | Verified official meaning | Existing V2 covered subset | Unproved combination |
|---|---|---|---|
| [Q12](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行) | Zero LIFE during trigger check does not decide defeat until every activated trigger effect finishes, including FINAL | R24 baseline, R28 both FINAL-first / DRAW-first with LIFE zero, valid saved state, illegal-choice immutability | Nested cross-owner active checks with one another's FINAL still waiting |
| [Q35](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行) | Concurrent revealed trigger/no-trigger LIFE can be processed in chosen order | Same-defender LIFE-order cases | General simultaneous cross-owner reveal windows |
| [Q36](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行) | Two simultaneous FINAL at zero LIFE: first restores 1, second cannot activate if LIFE already 1 | Earlier same-batch tests | FINAL from a genuinely secondary DAMAGE source |
| [Q37](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行) | Trigger activation by itself does not activate other printed abilities | Already separate trigger and entry queue | Unsupported general onRaid/onPlay ownership race |
| [Q38](https://www.unionarena-tcg.com/jp/faq/list.php?category=ゲーム進行) | Newly entered onPlay during trigger check joins freely orderable outstanding triggers, remains inside trigger check | R23/R27 bounded COLOR/RAID entry and nested *effect* (not nested LIFE), R27 cross-owner COLOR→onPlay→earned physical movement versus FINAL | Both players independently gaining selectable effects with separate deferred triggers and multiple source programs |
| [Q71](https://www.unionarena-tcg.com/jp/faq/list.php?category=キーワード効果) | DAMAGE2 plus IMPACT1 winning a character battle produces only 1 player damage | Existing damage/timing paths require individual validation | Two independent damage sources are not equal to one DAMAGE2 |
| [Q72](https://www.unionarena-tcg.com/jp/faq/list.php?category=キーワード効果) | DAMAGE2 with only 1 LIFE reveals one; FINAL may restore it to 1 and end check | Single-group expected behavior | Reentrant new attack/damage while original Trigger Check remains open |
| [Q73](https://www.unionarena-tcg.com/jp/faq/list.php?category=キーワード効果) | DAMAGE2 reveals up to damage count *simultaneously*; player chooses trigger order | R21, R23-27 simultaneous physical UIDs | A second separate physical damage batch while first is unresolved |
| [Q74](https://www.unionarena-tcg.com/jp/faq/list.php?category=キーワード効果) | Battle loss retirement, followed by onRetire, **then** victory/IMPACT trigger check | Earlier R24 SPECIAL/onRetire and normal battle priority | General nested retirement and both owner simultaneous choices |
| [MST Q2220/Q2228](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT) | Printed abilities vanish with original-text silence; **already earned** abilities remain | R27 pre-earn watcher silence, R28 post-earn attack grant tested | Every family of granted ability, post-earn source loss and sealed off-field sources |

## A model that still needs official oracles

A fully reentrant implementation would need to distinguish `damageSourceId`, source physical `uid` and `fieldEntryStamp`, damage target owner, `lifeBatchId`, captured/remaining LIFE UIDs and owner-private/public reveal state, originating effectQueue source boundary, active controller priority and the exact point when Q12's defeat check becomes legal. It must prove the priority between:

1. Source A from player 0 opening defender player 1 LIFE batch A, with independent source B from player 1 triggering damage back to player 0 before batch A resolves.
2. An attacker-side SPECIAL-induced retirement and onRetire while defender's FINAL has not yet resolved.
3. A COLOR/RAID LIFE deployment that earns onPlay **and** onRaid, while a different owner's queued trigger is simultaneously pending.
4. A FINAL that restores LIFE before a second damage batch's entry and/or last trigger resolution.
5. A paused player-0 choice, player-1 choice, and arbitrary save/restart between them without leaking unrevealed LIFE or losing source UID.
6. A source that exits, loses printed text or is reincarnated after earning but before completing a legal action.

Q12/Q35–Q38/Q71–Q74 establish important pieces of the schedule. They do **not**, by themselves, publish a complete all-player reentrant arbitration protocol for these cases. Do not derive a global priority total order merely from an implementation array or queue insertion time.

## Current safety invariant

- Keep existing single `lifeRevealBatch` and its physical `lifeRevealed` / `lifeBatchStep` fields; preserve Q73 simultaneous exposure and the original `effectQueue`.
- When a second LIFE reveal is requested while the first has unresolved cards for either player, abort that dispatch **atomically**. Do not partially pay costs, change source/target, reveal any extra physical LIFE, or determine a winner.
- Existing targeted negative tests: `tests/v2-r24-nested-life-conservative.test.mjs`, `tests/v2-r27-q38-cross-owner-earned-move-life.test.mjs`. R28 expands the independent Q12 ordering assertions in the first test, not any nested execution acceptance.
- Reject arbitrary imported `effectMoveOrder` and source/stamp spoofing at existing serializer gates; evaluate the legality of earned REST/tuck using actual current instance at action time.
- No second damage reducer, no speculative nested stack, no new official cards. Future change requires original official priority sources, both-player positive and negative tests, snapshot replay and privacy, Human/Normal/Hard equivalence, and independent Actions proof.

## R28 observed code CI (do not treat subsequent docs as verified)

At construction time, earlier regression code SHA `06f3bd3ba0d354a4bab46f90cab6288d50d8013d` had successful remote [Actions 39809160866](https://github.com/will00t-debug/Ua/actions/runs/39809160866), including added Q12, earned ability and 019/047 integrated pilot tests. Full print BLC 019/047 is **not** registered or FAQ-certified. Recheck this documentation commit's own Actions independently.
