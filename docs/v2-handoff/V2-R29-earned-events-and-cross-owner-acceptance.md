# UNION ARENA V2 R29 — bounded cross-owner priority, earned grant lifetime, BLEACH physical 047

2026-10-23 (Taipei). Existing GPT branch `gpt/v2-resume-20261022`, PR [#78](https://github.com/will00t-debug/Ua/pull/78) targeting Cursor branch `cursor/v2-multi-retire-life-6ff5`. Start from fully remote CI-verified R28 code+handoff SHA `66dea296d3e74c9ab0f0569f3f3e58275cb84872` [Actions 39810294100](https://github.com/will00t-debug/Ua/actions/runs/39810294100) success 1801/1801 and 60/60. Prior worktree/unfinished competing writer was not observed as a GitHub branch-head update; no local checkout claimed or available.

## Four separately committed code/acceptance batches

| Batch | Commit | Full Node 22 GitHub Actions | Changes |
|---|---|---|---|
| A | `4ac116ad7b052c9afc9cd4e9e70a184280182299` | [39864577235](https://github.com/will00t-debug/Ua/actions/runs/39864577235) **success** 1802/1802, 60/60 | Real BLC-2-019 and BLC-2-047 printed metadata inside an **isolated, unregistered**, valid 50-card source-pinned pilot. Two distinct physical 019 UIDs activate two typed named hand payments using two different 047 UIDs, each causing exact MAIN draw1 then qualified 047 earned draw1. Verify distinct source UID/paid move records, once-per-physical-source, rejected wrong actor/forged UID, Normal/Hard legal choices and saved-match validation. **Second 019 is a stamped already-on-field fixture, not a second simulated legal Raid entry**. |
| B | `3c7c5ed7065f0dfe8262eb699290a63bc8e37ba5` | [39864773510](https://github.com/will00t-debug/Ua/actions/runs/39864773510) **success** 1805/1805, 60/60 | For **both controllers**, grant target has two independently earned optional draw-one onAttack abilities. Other giver leaves; target's **original** onAttack is sealed after earning. Printed attack draw does not fire; both earned choices stay valid and independent. JSON save/restart + illegal action immutability; physical target exits and reenters with new `fieldEntryStamp` and no stale grants. |
| C | `f23310daf3f9bb70885154efff131edbd8cbc680` | [39865047656](https://github.com/will00t-debug/Ua/actions/runs/39865047656) **success** 1807/1807, 60/60 | Bounded attacker DAMAGE2 vs defender two physically distinct simultaneous SPECIAL LIFE cards; each SPECIAL retires a separate attacker-owned physical character, each independently starts actual attacker-controlled `onRetire` choice. Verify both LIFE resolution permutations, owner switch from defender to attacker and back, frozen wrong actor / illegal UID, Normal/Hard legal choices, JSON restart, no 50-card leakage, one remaining LIFE. **Does not prove a universal two-owner simultaneous event arbiter**. |
| D | `86f12d2e3a64e5c1658e336a848e5954b8aaea46` | [39865310494](https://github.com/will00t-debug/Ua/actions/runs/39865310494) **success** **1811/1811**, 60/60 | **Both owners**, both earned move orders: after legitimate own Ichigo MAIN pays physical 047 hand→outside and the source completed, seal **both original Ichigo and on-field observer text**, then order Q2315 earned observer REST/tuck vs moved-card bonus draw. Already-earned witness may pay actual REST if still READY and same `sourceUid+fieldEntryStamp`; 047 earned draw persists after it becomes facedown under another character. Wrong actor, owner/private under-layer visibility, and exact UID snapshots checked. |

Every batch's independent manifest and unported report steps **passed**, per actual Actions logs; not assertions from previously green commits.

## Narrow official evidence (checked 2026-10-23)

* [EX07BT Q1033](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT): BLC-2-047's movement-earned draw executes **after the complete BLC-2-019 MAIN**, not between payment, source draw, BP modifier or attack grant. [Q1046](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT): the earned draw requires **no printed energy threshold**.
* [EX15BT Q2315](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT): physical 047 already earned its draw even if subsequently placed facedown underneath on-field Riruka. [Q2316](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT): own facedown undercard visible to owner, not opponent.
* [Generic Q38](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%B2%E3%83%BC%E3%83%A0%E9%80%B2%E8%A1%8C): LIFE-entry onPlay joins unresolved triggers in freely chosen order during trigger check; [Q12](https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%B2%E3%83%BC%E3%83%A0%E9%80%B2%E8%A1%8C): winner at zero LIFE only after all pending triggered effects.
* [MST Q2220/Q2228](https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT): distinguish a character's silenced original abilities from a separately **already obtained** ability. The R29 test validates this only for known bounded grant and observer families, not arbitrary printed effects.

## Verified code and unverified scope

- **No new DSL operation, no reducer rewrite, no registry/manifest/card count change.** Existing `effectQueue`, `sourceResolutionBoundary`, `continuousStates`, `zoneMoveEvents` and `fieldEntryStamp` used throughout.
- Current independent integrated roster BLEACH **97/276**, TTG **35/81**, SLG **41/80**, SAO **91/183**, MST **48/80** = **312/700**; **388** unported; **0** comprehensive per-card all-FAQ certifications. R29 uses real 019/047 official-anchored **isolated pilot pack** and synthetic onRetire/observer cards where explicitly described; cannot claim BLC-2-019/047 or BLC-4-034 globally fully accepted or registered.
- The observer test uses a source-pinned **synthetic Riruka-like field watcher**, not a full BLC-4-034 card port with every other printed line.
- **Still unverified**: both players truly holding independently selectable effects simultaneously from distinct attacks; mixed COLOR+RAID onPlay/onRaid+SPECIAL onRetire priority graph; printed-effect silence before vs during every possible suspended source substep; full official 019+047 real source-qualified 50-card **all printed effects and FAQ** integrated against complete legal BLC-4-034; unbounded nested LIFE reentry.
- Preserve **atomic fail closed** for secondary LIFE while first batch unresolved, regardless of player; do not infer lawful reentrancy from these tests.

## Next recommended R30

1. Model independently earned two-owner pending groups only if explicit official ownership/order precedence supports them; seek source and adverse/legal Human/Normal/Hard examples.
2. Build full official 50-card *registered-title candidate pack* for printed BLC-2-019, BLC-2-047, BLC-4-034 and independent print/FAQ check of **every** BLC-4-034 line, not just its REST/tuck witness. No registry until whole-card acceptance.
3. Expand opponent-trigger effects when a full source was paused at a choice and the printed source departs/silences, while keeping pre-earned vs earned distinctions.
4. Keep nested second LIFE **fail closed** unless official reentrant arbitration and win check are proven with physical UIDs and saved continuation.

No main merge, no Cursor PR #77 changes, no production Vercel deployment, no force-push. Final **documentation** SHA must separately pass Actions before delivery; no local Node22 test claim.
