# UNION ARENA V2｜GPT 第二十輪：來源結算邊界／Move triggers

## Baseline and evidence

GPT PR #78 Draft targets Cursor PR #77's `cursor/v2-multi-retire-life-6ff5`.
Initial `fd469bb86ce1817a9d1b1e504590959d7c437211`.
Last **program code** `7b9f1cc6e426b2901c8d56aceec1bf7faf222d2c`.
GitHub Actions [39772113594](https://github.com/will00t-debug/Ua/actions/runs/39772113594)
Node22: 1708/1708 pass, 60/60 matches, independent manifest & unported
report pass, 312/700 registered, 388 unported. **No local tests** and no
full official FAQ certification. 0 official cards added.

## Program model

Completed linear movements append privately to `zoneMoveEvents` *after*
physically moving cards, always preserving exact UID, both owner/controller,
reason, source UID/name/color, turn and a monotonic order. New round20 covers
real deck→hand draws (rule vs own effect), direct deck search, TOP-N
selections, selected LIFE GET/FINAL/COLOR paths, and hand overlimit removal.

A strict **source-qualified moved-card** metadata `moveTriggers` on the
printed discarded card can specify:
```js
moveTriggers: [{
  when: {
    from:'hand', to:'outside', reasons:['payment','own-effect'],
    sourceName:'黒崎 一護', sourceColor:'blue', sourceOnField:true
  },
  then:[{op:'draw', count:1}]
}]
```
This is a *capability illustration*, NOT an official registered port.
The validator rejects invalid cause/zone, forged property, unsupported
program, and guessing sources; it is intentionally restricted to an
auditable own-field source and simple draw. The internal
`sourceResolutionBoundary` marker snapshots `nextZoneMoveOrder-1`
and drains only qualifying completed moves after the originating
source's queue (including paused physical hand choices) finishes.
Multiple copies generate distinct triggers for distinct physical UIDs.
Opponent hand IDs, event histories and private queue state remain
unavailable from `universalPublicView`.

Supported source boundary dispatch: ordinary
`applyEffects` onPlay/etc, MAIN `discardHandBuffSelf`,
`restSelfThen`, `frontOnceProgram`.
**Not complete**: all Raid/onAttack/phase queue direct injections
are not yet boundary-wrapped. `turnEffectZoneMoves` broad legacy
booleans remain unchanged.

## Official evidence, no fabricated card support

- [BLC-2-047 official](https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=EX07BT%2FBLC-2-047):
  blue 2 / AP1 EVENT / ordinary use draw2; moved-card effect
  draws1 only after OWN BLUE 黒崎 一護 effect actually sends it
  from hand to outside.
- [Q1046 and Q1033](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT):
  no required energy for trigger; draw after *all* of Ichigo's
  original MAIN effect resolves.
- [Q2315](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT):
  later placing the event facedown under a unit does not cancel
  the earned trigger.
- [BLC-2-019 official](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1):
  full Raid, enemy BP targets, name-filtered payment, BP/attack
  granted effect is NOT completed. Both 019/047 remain **unported**.

## Remaining safety work

Coverage of layered Raid replacement and buried UID moves, official
Q73 simultaneous LIFE reveal, after-source boundary for every entry
route/phase/attack, source-name cost filters, granted attack abilities,
and state-based cancellation are separate verification work.
Do not modify main, Cursor PR #77, production, or overwrite other commits.
