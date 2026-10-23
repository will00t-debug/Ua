# R34 Batch A — MST-1-059 temporary FRONT generation: official evidence vs V2

2026-10-23 Asia/Taipei. GPT PR #78; branch `gpt/v2-resume-20261022` (not main). Verified opening HEAD `f0a2472e5e2891b8dca6e5bd215a3067740440cd`, Actions 39880374860 SUCCESS. This is a source audit, **not** a whole-card certification. No specific FAQ entry for MST-1-059 was found in the current UA54BT series listing (25 results at inspection).

## Primary official evidence

- [MST-1-059 official printing](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-059): GREEN required 2, AP 1, BP 3000, one printed GREEN generation, ラノア魔法大学, no LIFE; onPlay select **one of two modes**: draw 1 then put 1 own hand in Outside; OR select **up to one other own FRONT** Ranoa character and give it the effect `このキャラはフロントLでもエナジーを発生させる。` **this turn**. Zero is legal within an up-to-one target mode.
- [General FAQ Q25/Q26/Q27/Q28](https://www.unionarena-tcg.com/jp/faq/list.php?type=0): REST still generates; generated energy is not consumed; later decrease does not invalidate an earlier legal play; validate energy before spending AP then resolve effects.
- [Specific analogous Q236 — HTR-1-082](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA03BT): explicit printed FRONT-generation text overrides the ordinary ENERGY-only rule.
- [General Q90](https://www.unionarena-tcg.com/jp/faq/list.php?type=0): onPlay works on either line unless restricted. Q91: ACTIVE/REST operations can legally name cards already in that state.
- [MST series Q2228](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT): losing **original** effects does not erase separately gained effects; original continuous effects are suppressed. Q2151: after top Raid removal the revealed base does not keep effects previously received by the Raid character. These are generalizable only to the specifically described situations.

## Official-versus-current-reducer differences

| Question | Supported official semantic / confidence | Existing V2 before R34 | Treatment |
|---|---|---|---|
| FRONT normal criteria | FRONT permission removes only normal line restriction; REST still produces (Q25/236) | Hard-gated by permanent printed `frontGeneratesEnergy` | Add separate live permission to gate, not an integer bonus |
| Color and quantity | Own target's printed green/color icons and existing modifiers apply; the effect says `generates energy`, not `+1` | `universalCardEnergy` reads actual printed gen and live modifiers | Reuse it unchanged below permission gate |
| Additional energy effects | Other modifiers remain separately sourced; not a second copy of base production (text + Q25/236, Q2228) | printed active/conditional/timed buffs, and passive additions | Use same aggregation exactly once per physical producer |
| ACTIVE/REST | REST generates energy (Q25); only ACTIVE-specific bonuses depend on ACTIVE | READY consulted live | Preserve READY rules |
| Moved to ENERGY | Normal ENERGY producer is counted once; movement preserves physical UID | Physical FRONT/ENERGY source collections | Single live location; no duplicate |
| Exit, return, Raid top or strip | New field entry / other physical Raid top cannot inherit old received grant (Q2151 supports strip distinction) | Physical UID + fieldEntryStamp + pruning | Stamp and live zone check; no undercard inheritance |
| Source leaves/is silenced | A resolved independent grant is not a printed passive tether (Q2228 distinction) | `sourceLinked:false` status already supported | Snapshot earned grant; do not re-check source after grant |
| Granted effect vs printed silence | Original continuous printed generation suppressed, externally received permission persists (Q2228) | `originalEffectsDisabled` | Do not suppress independent grant |
| Opponent turn & expiration | `このターン中` = turn when effect resolves, including off-turn onPlay (Q90) | Existing phase end expiry | Expire at *current active turn's* attack end, not controller's next turn |
| Choice zero/no target | Printed `1枚まで` makes zero legal after choosing second of exactly two modes | `chooseOne` and optional-target queue | Offer mode even if zero matches; skip target step |

Unresolved / non-invented: no direct MST-059-specific FAQ confirms layered Raid moves from arbitrary exceptional effects, global ordering of additional simultaneous energy modifiers or source-interruption timing. Keep existing physical-layer and sealed-original rules; do not change Raid, LIFE, vacate, or retirement internals based on analogy. Avoid claiming all-FAQ certification.

## Explicit limits

Never interpret temporary FRONT permission as `energy:+1`; never count the same physical card twice or read a stale cached energy total. New state has exact physical target UID, fieldEntryStamp, owner, independent source UID and current-turn expiry. Reject malformed state/pending descriptors during assert/save restoration. This round does not unblock BLC-4-034 source-retirement facedown recovery.
