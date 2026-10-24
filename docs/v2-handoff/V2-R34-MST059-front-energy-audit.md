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


## R34 A–E implementation and verified remote acceptance (2026-10-23)

**Baseline:** GPT PR #78 branch HEAD `f0a2472e5e2891b8dca6e5bd215a3067740440cd`, successful [Actions #39880374860](https://github.com/will00t-debug/Ua/actions/runs/39880374860). PR still targets `cursor/v2-multi-retire-life-6ff5`.

| Batch | Exact commit(s) | Code / evidence | GitHub Actions status |
|---|---|---|---|
| A | `06b2ebe7cc6cd1dfe244c6a07fc3d711521ff568` | This official semantic difference audit; no premature registry | [39882470095](https://github.com/will00t-debug/Ua/actions/runs/39882470095) **SUCCESS** |
| B | `c5e300f72ab0c93484b395018a92e03c5d5338cc`, `7d970b7131e07c71c7a8ec55962ee21373d382a4`, last additional `525e01925ee62270e75646a3823e18ec60f2cffa` | New `frontEnergyPermission` in **existing** `continuousStates`, UID/stamp/source-independent/current-turn expiry; reused `universalCardEnergy` and `universalEnergyByColor` exclusively; shared strictly validated `grantFrontEnergyOwnOtherFrontTrait` onPlay, pending and Human/AI; 6 independent tests including off-turn active-player expiry | [39882753635](https://github.com/will00t-debug/Ua/actions/runs/39882753635), [39882857433](https://github.com/will00t-debug/Ua/actions/runs/39882857433), final [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) **SUCCESS** |
| C | `79b2f989643ddcc6fcd274fd859489a4c983bfd0`, `79677647449bd0aa34432adaf4abf22130e622b4` | Formal source-pinned `MST-1-059`: `chooseOne` of `drawDiscard` or optional other-own-trait-FRONT grant; exact green 2, AP1, 3000 BP, printed gen 1, no LIFE; independent manifest and real 50-card tests. Two intermediate test-only reds: `760ba258`/`fa2d53f6` incorrectly expected phase and `physicalUid` rather than ledger's real `uid`. Fixed assertion to verify exact completed deck→hand and hand→outside UID events, without relaxing code validators. | [39883069664](https://github.com/will00t-debug/Ua/actions/runs/39883069664) and [39883529361](https://github.com/will00t-debug/Ua/actions/runs/39883529361) **SUCCESS** |
| D | `b6a232cdf0581ac3e9b7dfd9f0cabf7991e14551`, fixture correction `e2cf9c68d118915102c5ad7070d62b4363f73705`, final `712dfad4d6cebc8134ef5a9d0fd65803c3f3bf6f` | Real 50-card MST vs TTG, SAO and SLG: live printed & granted FRONT generation, timed energy amount, own-color/owner isolation, Q2062 AP selection tax, `cannotAttack`, `grantedOnAttack` statuses coexist independently. First red tests forgot the target cards in the 50-card fixture, not an engine regression; corrected exact target lists, preserving all test assertions. | [39883944857](https://github.com/will00t-debug/Ua/actions/runs/39883944857) **SUCCESS** |
| E | `c7119b351bd0728c99b34e095a02457457a1f438` | Dedicated BLC three-card unported and unsupported MAIN refusal, real 50-card BLEACH vs MST negative/public-private tests; existing R30/R31 Q61/Q2315/Q2316/LIFE tests remain untouched | Included in [39883944857](https://github.com/will00t-debug/Ua/actions/runs/39883944857) and [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935) **SUCCESS** |

**Last fully verified pre-documentation code HEAD `525e01925ee62270e75646a3823e18ec60f2cffa`**, GitHub Actions [39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935): Node.js 22 `npm test` **1869/1869 passed**, five-title seeded `v2-integrated-match-matrix.mjs` **60/60**, independent manifest assertion **SUCCESS** and `v2-unported-report.mjs` **SUCCESS**. Literal per-title roster: BLEACH **97**, TTG **36**, SLG **42**, SAO **92**, MST **49** = **316/700 registered, 384 unported**. Exhaustive *all-card/all-official-FAQ independently certified* remains **0**. Separate documentation commit requires its own actual CI confirmation. Local clone unavailable; these results are **remote Actions**, not local Node22 testing.

### E: latest official BLC inquiry and conservative status

[EX15BT/BLC-4-034 official page](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034) still explicitly prints both MAIN costs, `REST self` and `actually retire this card`, *before* “recover up to one facedown card from underneath.” [EX15BT FAQ Q2315/Q2316](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT) still confirms earned BLC-2-047 draw and owner-only private face-down inspection, **not** recovery window timing. Related older [UA12BT Q576/Q577](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA12BT) says moved-out lower face-down cards can cause their own later watchers and that simultaneous effects may be ordered; this does **not** authorize inventing a post-vacate LAST-KNOWN undercard snapshot for BLC-4-034. Q60–Q62/Q81/Q1033/Q1046 are not overridden. No new directly applicable Riruka retirement-interruption / undercard-choice ruling was identified. Therefore `BLC-4-034`, `BLC-2-019`, `BLC-2-047` remain **unregistered**. Nested second LIFE is still atomic fail-closed.

**Next highest-priority shared engine gap:** obtain a direct official ruling for self-retire cost vs facedown-under recovery and intervening retire/onRetire effects before defining serializable, physical UID/stamp-safe `sourceResolutionBoundary` and undercard eligibility. Until then, strengthen independent official per-card/FAQ scenario proofs of the *registered* shared engine and test across a sixth title, instead of adding guessed per-title branches. No main merge, Cursor PR77 overwrite, production deploy, force push, alternative energy calculator, or effectQueue rewrite.
