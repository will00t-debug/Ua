# UNION ARENA V2 | R54 official whole-print review and strict partial/registered ledger

Date: 2026-10-24. GPT Draft PR #78 only; branch `gpt/v2-resume-20261022`, merge target `cursor/v2-multi-retire-life-6ff5`. This document records reviewed individual prints and their applicable FAQ, **not an all-700-card independent FAQ certification**.

## Complete official candidates

| Card | Official text and official FAQ | R54 outcome |
|---|---|---|
| TTG-1-067 ヨーコ | [UA56BT/TTG-1-067](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-067), **Q2295** | PARTIAL. Required 4 red, AP2, BP3500, red gen1, 大グレン団, always ACTIVE on entry; cannot be blocked by current BP>=4000; onPlay this-turn SNIPER and physical battle-win draw one, never life direct; ACTIVE LIFE own ACTIVE plus BP3000. Missing proper SNIPER, physical attacker battle win draw, temporary grants/combined 50-card QA. |
| SLG-1-021 水篠 旬 | [UA51BT/SLG-1-021](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-021), **Q2028** | PARTIAL. Required purple 5, AP1, BP4000+, gen1, Raid name, BP>=6000 IMPACT1; on attack gain BP500 per 5 own physical outside; battle win optionally return other-named CHARACTER with original BP <=2000+500 per 5 outside; own-effect entry this turn opponent must block if a legal blocker exists; RAID LIFE. R54 added independent on-attack `buffSelfPerOwnOutsideGroups` consumer reusing R53 `countOwnOutsidePhysicalGroups`, but other abilities unported. |
| MST-1-009 エリス | [UA54BT/MST-1-009](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-009), **Q2147** | PARTIAL. Required blue 3, AP1, BP3500+, gen1, Raid エリス, printed IMPACT1, own-turn BP500; ONLY own-effect entry offers mutually exclusive 1) BP+1000 until next own start, 2) gain optional swap one OWN ENERGY character after attack end this turn. Full attack-end physical exchange must occur AFTER blocked battle or complete LIFE trigger. Need stamped temporal grant, source entry proof, complete RAID LIFE tests. |
| SAO-1-071 アスナ | [UA15BT/SAO-1-071](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-071), official printing reviewed; applicable distinct FAQ not identified | REGISTERED under *independent full-print test* only if current Actions pass. Green energy4/AP1/BP4000+/gen1, ALO, Raid Asuna + RAID LIFE; union of Yuuki and Mother's Rosario in OWN physical outside: >=4 optional draw 0..1 onAttack; >=6 BP1000 and Damage2 own turn; >=8 current BP<=3000 cannot block. Three levels accumulate and recompute live. `tests/v2-r54-sao071-real-multithreshold.test.mjs` performs real 50-card path (4 paid EVENT plus 4 true retire); confirm latest SHA Actions before describing PASS. |

## R54 implementation and safety

- First commit `92af077460385f30cac8e1653595afe6944155e3`: generic stamped onAttack optional named-OUTSIDE draw; GitHub Actions success [40047961290](https://github.com/will00t-debug/Ua/actions/runs/40047961290). No registered cards added in that commit.
- Second `d0468fa3c180ee17fe866751cdf2fd8404949de2`: SAO-1-071 source pin, cumulative 4/6/8, physical deck and Raid QA. This initial SHA failed CI because independent manifest was not expanded and test first-turn AP assumption was invalid; failures are preserved as historical, NOT PASS.
- Third `7c6319314dcd8109500952e0280289cab50033b4`: generic attack-time BP per R53 OUTSIDE physical groups, no SLG-1-021 partial registry. Initial CI failed until fixing stale cloned test object.
- Follow-up `b49715212fa0d2d1f31672d3d71bdaae6bfa7d69`: independent source-pinned manifest adds SAO-1-071, preserves all exact-ID negative protections; official 3 AP paid-action scenario.
- Follow-up `09a3d769fceb3b28008c861616f4bda94b37b0b8`: test reads cloned current physical actor from post-dispatch game state, not stale JavaScript object.
- Follow-up `3a5ef115e61754823e30785d821a1b4d4ec9d441`: real opponent hand-limit pending resolved by legal action, no rule bypass.
- This revision adds dynamic `scripts/v2-r54-five-title-candidate-report.mjs`, dedicated census test and mandatory Actions step. All text matches remain REVIEW PENDING, no automatic READY.
- Distinct full-page FAQ certification for all 700 remains **0**. Local Node22 run/clone is not available; only GitHub Actions results qualify.

## Safety debt / next priority

1. TTG: Q2295 SNIPER legal target, cannot reblock, source-granted attack win draw and ACTIVE LIFE; apply to every unported compatible printed card after source audit.
2. SLG: Q2028 forced block shared legal selector, truly optional own OUTSIDE printed-BP-based battle win recovery, >=6000 IMPACT, Raid LIFE.
3. MST: Q2147 own-effect entry mutually exclusive timed `attackEndSwap` grant, source stamp and next-own-turn expiry, no ghost events.
4. Five-title `capabilityIndex()` source complement, independent 50-card cases + Node22 + 60-match + manifest mandatory.
5. Leave unresolved MST-1-067/Q2162 source protection, BLC-4-034 face-down under/retire order, nested second LIFE, mixed AP and hand multi-target cost unchanged and fail-closed.

Never merge main, deploy production, modify Cursor PR #77 or force push.
