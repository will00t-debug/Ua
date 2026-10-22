# UNION ARENA V2 R32 — next-own-START attack prohibition, official TTG-1-028 and cross-title legality

2026-10-23 Asia/Taipei · GPT PR [#78](https://github.com/will00t-debug/Ua/pull/78) · work branch `gpt/v2-resume-20261022` → base `cursor/v2-multi-retire-life-6ff5`. Started at successful R31 handoff commit `2aa041e5f7b31090966be09af551b2cd930e94ef`, [CI 39871185997](https://github.com/will00t-debug/Ua/actions/runs/39871185997) 1834/1834, 60/60; historic baseline 313/700, 387 unported. No direct local Git worktree, no local Node22 run; every test pass/failure below is REMOTE GitHub Actions.

## Primary official sources and difference table

- [UA56BT/TTG-1-028 official card](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-028) (green 4, AP 1, BP 4000, generated green 1; `グレンラガン`, two component traits `大グレン団` and `ガンメン`; RAID on either `シモン` or `ヴィラル`; LIFE RAID).
- Printed entry draws exactly one card. **Only when this controller's own turn**, select **up to one** opponent FRONT character that cannot attack until the controller's **next own turn starts**. No restriction on attacking the effect grantor; no restriction on blocking, resting, BP, or energy generation. Choosing zero is legal.
- [R31 BLC-4-034 undercard recovery chronology](./V2-R31-official-under-recovery-audit.md) still unresolved for mandatory SELF REST + actual retirement payment and recovery from its own facedown undercards, especially `vacate` moving lower cards to outside **before** a delayed effect could target them. Do not infer a last-known attached-card exception from Q60–Q62; **BLC-4-034 MAIN remains unsupported and unregistered**.

| Printed semantic | Existing primitive | R32 treatment |
|---|---|---|
| Cannot **attack**, not cannot ACTIVE | `continuousStates`, `legalUniversalActions` | `kind:'cannotAttack'` filters legal `attack` actions only; blocking and ENERGY remain unchanged |
| Ends at next **controller's** own turn start | `startTurn` `expireContinuousStates` before active refresh | strict `until:{player:controller,phase:'start',edge:'start'}`; never `endOfTurn` |
| Live target is opponent FRONT physical instance | existing UID and `fieldEntryStamp` | snapshot target `{uid,stamp}`, check owner/line/stamp before granting; stale instance rejected |
| Grant stays after original source leaves/gets silenced | `sourceLinked:false` earned status | snapshot not linked to source survival. Future reentry is new target stamp, so cannot retain the ban |
| Optional zero or one | existing `effectQueue` pending action and `actor(s)` | `effect-attack-ban` private state; legal actions `chooseAttackBan` with UID or null; Human/AI share validator |
| `onPlay` but ONLY own-turn grant | checked program queue, `active` turn owner | `forbidAttackOppFrontOne` strict `onPlay` with `ownTurnOnly:true`; off-turn does not create a restriction |
| RAID and full printed card | existing `performRaid` + `onPlay` | pin TTG028 Raid base either Simon or Viral; green cost/AP1, draw1, target prohibition, Life RAID |
| Correct title & evidence | `verifiedTtgV2Additions`, `title-packs/ttg.mjs`, independent manifest & CSV | source-pinned text/traits/cost/trigger; counted **only** after formal pack, test and evidence pass |

No new `effectQueue` or new title-specific reducer. New `forbidAttackOppFrontOne` is an ordinary shared queued op and `cannotAttack` is an ordinary shared stamped status. Contrast `grantOnAttack` (earned *attack-time* ability) and `cannotActive` (ACTIVE restriction), both different rules. Do not generalize to SLG-1-070 AP selection tax or MST-1-059 front energy permission.

## Exact commits and remote acceptance

| Batch | Commit | Evidence |
|---|---|---|
| A shared stamped status + legal attack action | `028935575b8960f3213e63ad9fffb70da7ffbcb9` | First remote [39872555141](https://github.com/will00t-debug/Ua/actions/runs/39872555141) failed **syntax** (one missing closing parenthesis in `engine.mjs`); fixed `52aa9b4ba181128b70fd6f8da4a0bce30b0ea200`, [39872730722](https://github.com/will00t-debug/Ua/actions/runs/39872730722) green 1836/1836* and matrix60/60. (*Use run log if an exact test-count citation matters.) |
| B shared onPlay target/program DSL, stamped pending, AI, isolated real TTG card | `64a17b76e091771aed54bbbbc81bf4f9ae4e5a33` | [39873136036](https://github.com/will00t-debug/Ua/actions/runs/39873136036) **1838/1838**, matrix 60/60, independent inventory/report passed |
| C formal TTG-1-028 port | `2f1f7c0ec71453026053d22693378a4ec44d8e62` | First [39873375638](https://github.com/will00t-debug/Ua/actions/runs/39873375638) red due to older **independent evidence list / CSV**, not card effect; corrected source ledger & TTG explicit ID in `f5f1323da21de3f9756cfa70344fb8b2e30d8e00`. [39873642288](https://github.com/will00t-debug/Ua/actions/runs/39873642288) had 1 remaining old historical workstream classification failure; corrected `7481cde1f020e9417b0df76ae6219a2e186a129e`, [39873771779](https://github.com/will00t-debug/Ua/actions/runs/39873771779) **1839/1839**, 60/60, manifest/report success |
| D full-print cross-title and Human UI regressions | `c5b08f0d4d32402a6eaf22d368be388bcc15d750` | [39874056639](https://github.com/will00t-debug/Ua/actions/runs/39874056639) **1843/1843**, five-title matrix **60/60**, independent manifest/report success |

`tests/v2-r32-cannot-attack-continuous.test.mjs` validates grantor removal, opponent full turn, own next START expiration, illegal attack atomic refusal, save/read, state tampering and changed UID incarnation. `tests/v2-r32-ttg028-official.test.mjs` uses a legal 50-card TTG vs SAO cross-title game and checks legal AP/4 green energy Raid, both Simon/Viral bases, onPlay exactly one draw, target 0 vs 1, Human UI and Normal/Hard choices, forged UID and stale stamp, no target, off-turn suppression, expiry and conservation. Hard/normal legal actions go through the same validator as Human. Preview uses only a descriptive label; it cannot fabricate legal actions.

### Outcome and remaining blockers

Verified `c5b08f0d4d32402a6eaf22d368be388bcc15d750` produced BLEACH **97**, TTG **36** (+1 TTG028), SLG **41**, SAO **92**, MST **48** = **314/700** official V2 registry IDs; **386** unported. Full independent all-card official FAQ certification still **0**, this does not equate to only zero effect tests: many focused true-card tests exist but comprehensive all-FAQ certification has not been completed. BLC-2-019, BLC-2-047, BLC-4-034 remain unported, and BLC-034 MAIN unresolved. The separate LIFE nested second damage stays atomic fail-closed; no Q73 regression permitted.

**Next high-value shared primitive R33**: if direct official resolution chronology appears, narrowly build own undercard recovery tied to actual `retire` / `vacate`, physical UID, `fieldEntryStamp`, `sourceResolutionBoundary` without inventing an attachment snapshot. Otherwise prioritize **SLG-1-070** official Q2062 conditional additional **AP to select a protected target** in card effects, distinct from card play AP and energy; model a state-bound selection tax and negative legal actions at 0 AP, not a BP buff or new event system. Second alternative MST-1-059 own FRONT temporary energy generation requires new permission, separate from ordinary ENERGY line. Do not conflate the two.

No modifications to main, Cursor PR77, production Vercel, or historical PR75; no force push. Final docs SHA / corresponding CI MUST be confirmed separately after this handoff commit.
