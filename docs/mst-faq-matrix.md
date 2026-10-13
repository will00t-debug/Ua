# UA54BT official FAQ matrix — integration ledger (2026-10-13)

Primary official source: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT

Every entry's **isolated code** only covers explicitly described subcases. No code below is yet hooked into the simulator's shared `dist/engine.mjs`; therefore all final gameplay statuses are **PENDING**.

| Official Q | Card | Ruling / scenario | Isolated implementation evidence | In-game / AI |
|---|---|---|---|---|
| Q2145 | MST-1-007 | Named effect choice shared across copies, alternative draw branch independent | `mstUseNamedAbility` generic; event branch pending | PENDING |
| Q2146 | MST-1-008 | Unblocked attack after block decision, same point as block trigger | none | PENDING |
| Q2147 | MST-1-009 | Attack ended after battle or life Trigger check | none | PENDING |
| Q2148 | MST-1-025 | Remove Raid top: base stays in field | `mstRemoveRaidTop` | PENDING |
| Q2149 | MST-1-025 | Revealed base does not re-trigger entry | `mstRemoveRaidTop` output | PENDING |
| Q2150 | MST-1-025 | Revealed base inherits ACTIVE / REST | `mstRemoveRaidTop` | PENDING |
| Q2151 | MST-1-025 | Buffs on removed Raid top no longer affect base | `mstRemoveRaidTop` | PENDING |
| Q2152 | MST-1-031 | AP discount survives a nonmatching play | `mstDiscountAp` | PENDING |
| Q2153 | MST-1-032 | When moving into full line, remove one destination card | `mstMoveChoices` | PENDING |
| Q2154 | MST-1-038 | Once-per-turn ability shared across copies in outside area | `mstUseNamedAbility` generic | PENDING |
| Q2155 | MST-1-040 | Destination-full move requires removal choice | `mstMoveChoices` | PENDING |
| Q2156 | MST-1-042 | Named activation across two matching characters | `mstUseNamedAbility` generic | PENDING |
| Q2157 | MST-1-048 | Named attack ability across two copies | `mstUseNamedAbility` generic | PENDING |
| Q2158 | MST-1-054 | Original abilities = printed card abilities | none | PENDING |
| Q2159 | MST-1-054 | Silenced Raid remains Raid; printed Raid lines disabled | none | PENDING |
| Q2160 | MST-1-054 | Abilities gained from other card not removed by silence | none | PENDING |
| Q2161 | MST-1-062 | AP discount survives unrelated play | `mstDiscountAp` | PENDING |
| Q2162 | MST-1-067 | Opponent effect cannot choose the protected target | none | PENDING |
| Q2163 | MST-1-068 | Destination-full move removes chosen destination card | `mstMoveChoices` | PENDING |
| Q2164 | MST-1-073 | Named once limit applies to entire displayed activated main text | `mstUseNamedAbility` generic | PENDING |
| Q2165 | MST-1-073 | Two Rudeus copies share one use per turn | `mstUseNamedAbility` | PENDING |
| Q2205 | MST-1-073 | Skip next ACTIVE is consumed when start/end activation attempted | none | PENDING |
| Q2208 | MST-1-073 | Activation legal while already ACTIVE with 7 energy | `mstRudeus73CanActivate` | PENDING |
| Q2220 | MST-1-054 | Original printed out-of-field effects are silenced; gained abilities remain | none | PENDING |
| Q2228 | MST-1-054 | Previously granted effects remain; printed continuous ones cease | none | PENDING |

In addition to the official FAQ, tests need to cover every card's normal-effect and Trigger paths, AI choices, full lines, Raid/REST timing, hand limits, AP payment/recovery, and card conservation. `npm test` passing the current helper tests is **not** evidence that all 80 abilities work in match play.
