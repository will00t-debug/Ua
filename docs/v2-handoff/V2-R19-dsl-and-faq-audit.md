# V2 R19 — DSL composition & unresolved official rulings

## Reuse, not new ops

The existing `chooseOne` (two source-authored options), `discardGate`
(physical UID payment, optional yes/no), `oncePerTurnGate` (name/card scoped
and optional choice), `draw`, `effectQueue` and `legalUniversalActions`
already compose. A synthetic test proves ordering across suspended queues:
choose mode -> pay or skip the UID payment -> once-name optional activation
-> actual draw. The same legal options feed normal/hard AI and human player.
No new DSL operator, extra title reducer or registered real card is needed.
Invalid nested operations fail the same strict pack verifier.

## Official rules still open

- **Q73**, 2023-03-17 (Damage 2): officially reveals multiple life cards
  simultaneously and allows the player to choose the order of multiple
  triggers. The current V2 `additionalBattleDamage` queue models one
  life card at a time; **do not claim Q73 complete**. A dedicated queued
  simultaneous reveal/hidden-ID-safe choice design must be validated
  against Q71/Q72/Q73 and all existing DAMAGE2/FINAL/Impact cases before
  changing this previously tested path.
  Reference https://www.unionarena-tcg.com/jp/faq/list.php?category=キーワード効果&sub_category=ダメージ2
- Multiple simultaneous true-retirement effects and interruption restoration
  are covered by existing queue tests but need remaining official rulings.
- MAIN end: returning to hand and retiring in the same boundary, exact order
  not certified.
- Raid stack top/base/multilayer geometry and repeated Raid are not broadly
  certified; keep unknown transitions fail-closed.
- Physical UID exiting and reentering within one turn: attack and block
  counters are not reset without a verified ruling.
- Original text silence affects live original abilities; already resolved
  external buffs/costs are not rolled back without printed FAQ evidence.
- No full official FAQ per-card certification or production deployment.

This is a rule gap audit and regression protection, **not** permission to
replace the existing core or register BLC-2-047.
