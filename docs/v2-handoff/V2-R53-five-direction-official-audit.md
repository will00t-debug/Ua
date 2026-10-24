# UNION ARENA V2 — R53 five-direction official full-print triage (2026-10-24)

Branch `gpt/v2-resume-20261022`, Draft PR #78, target `cursor/v2-multi-retire-life-6ff5`. Do not merge main/deploy production/mutate Cursor #77/force push. Source evidence here is *specific Japanese printing*; text candidate is never READY automatically.

## R52 verified starting point

- SHA `2f8cd915872b8c4a5ae788d0d472f1cf0f52b171` has [GitHub Actions SUCCESS #40044586095](https://github.com/will00t-debug/Ua/actions/runs/40044586095), Node 22 2136/2136 and 60/60 integrated matrix.
- R53 uses the same authoritative registry, R35 `capabilityIndex()`, dynamic unported complement, R46/R47/R48/R49/R51/R52 candidate reports; no parallel card database.
- Existing 343/700 R52 registry is a baseline, NOT the current R53 registered count after any later source-pinned card.

## I. Official cross-title full prints and FAQ

| Candidate | Official Japanese source | Verified printed whole-card clauses | Status and exact gaps |
|---|---|---|---|
| **TTG-1-067 ヨーコ** | [UA56BT/TTG-1-067](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-067), **Q2295** | Red CHARACTER; energy 4/AP2/BP3500/gen1, 大グレン団, ACTIVE LIFE. Always ACTIVE entry and cannot be blocked by opponent BP **4000 or higher**. OnPlay temporarily grants self attack-**battle-win** draw 1 and SNIPER (direct opponent FRONT targeted attack with no block). ACTIVE LIFE choose own character and ACTIVE +3000 BP for turn. **Q2295** requires attack that battles a character and wins: an unblocked direct LIFE attack is not the win trigger. | **PARTIAL**. Generic present: `enterAlwaysActive`, legal current-BP blocker gate `blockBpRestriction`. Missing complete source-stamped turn-limited SNIPER / selected battle target, battle-win draw on attacker only, full ACTIVE LIFE + AP2 real test and other-title regression. Never register the half-card. |
| **SLG-1-021 水篠 旬** | [UA51BT/SLG-1-021](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-021), **Q2028** | Purple CHARACTER energy5/AP1/BP4000+/gen1, traitless, RAID〈水篠 旬〉/RAID LIFE. BP>=6000 grants IMPACT1. OnAttack: for each **five physical cards currently in own OUTSIDE**, +500 BP for turn. When its attack wins battle: optionally recover from own OUTSIDE one character not named〈水篠 旬〉 with PRINTED BP<=2000 plus 500 for each five own OUTSIDE. OnPlay grants mandatory block-if-possible until turn end. **Q2028**: opponent must choose a legal blocker, or take player damage if no eligible blocker. | **PARTIAL**. R53 shared pure `countOwnOutsidePhysicalGroups` resolves floor(n/5) safely without opponent / undercards. Still need 2 different consumers, conditional IMPACT, dynamic printed-BP recovery exclusion, Q2028 mandatory block and full Raid/LIFE. |
| **MST-1-009 エリス** | [UA54BT/MST-1-009](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-009), **Q2147** | Blue CHARACTER energy3/AP1/BP3500+/gen1, traitless, RAID〈エリス〉/RAID LIFE, IMPACT1, own-turn BP+500. **Only if entered by own effect**: onPlay mandatory choose one of (a) own BP+1000 until next OWN turn start or (b) gain for THIS turn optional attack-end swap with one OWN ENERGY character. Q2147: on battle, attack end after battle; on player damage, after complete Trigger check. | **PARTIAL**. Must reuse R39 `chooseOne`, R47 attack-end effect queue/UID/stamp, source-entry provenance and expiry; conditional granted swap not safely equivalent to R50 printed permanent Q2337 swap. No card registration. |

## II. All 12 SAO source-based R52 text candidates: individually read against the official complete print

All 12 IDs below were first a **keyword inventory**, not a semantic ready list. This review distinguishes genuine named-OUTSIDE reuse from unrelated text matches. Dates/FAQ only pinned where shown on the official page.

| ID and authoritative official printing | Review | Actual effect gap, not superficial text matching |
|---|---|---|
| [SAO-1-071](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-071) green アスナ | **PARTIAL** | REAL R51 named OUTSIDE thresholds: 4 grants optional onAttack draw1, 6 own turn BP+1000 plus DAMAGE2, 8 forbids blockers with current BP<=3000. RAID and RAID LIFE. R53 live conditional `blockBpRestriction` is a reusable building block, not full card. |
| [SAO-1-083](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-083) green リズベット | **NEAR READY** (not READY) | Printed AP **2**, generated green **2**, green ALO. OnPlay optional OUTSIDE-to-HAND recovery of GREEN ALO, whose two constraints require strict composite filter. ACTIVE LIFE is independent. No printed Yuuki-count requirement. |
| [SAO-2-001](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-001) yellow アドミニストレータ | **PARTIAL** | AP2: onPlay optional free REST outside yellow energy<=1 整合騎士, then TOP7 name search 1 and ORDER rest to bottom; DRAW LIFE. No specified-name OUTSIDE count. |
| [SAO-2-002](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-002) yellow キリト | **PARTIAL** | No-block at BP<=2000 (R53 generic gate reusable), default onPlay draw2 then discard1, optional replace with draw2 ONLY with both アリス and ユージオ own FRONT; RAID LIFE. No R51 named-OUTSIDE. |
| [SAO-2-009](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-009) yellow 創世神ステイシア | **NEAR READY** | OnPlay default draw1/discard1, if own LIFE<=4 may instead draw1. Require exact replacement choice schema. No named-OUTSIDE gate. |
| [SAO-2-020](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-020) blue リズベット | **RULE BLOCKED** | Conditional optional OUTSIDE-to-REMOVED name cost and HAND-to-OUTSIDE payment preceding same-turn temporary double attack grant to own アインクラッド キリト. Mixed cost provenance not audited. |
| [SAO-2-031](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-031) purple ユナ | **PARTIAL** | OnPlay next eligible 歌 hand use AP−1, Q1202; MAIN once place 4 OUTSIDE cards in chosen order on deck bottom, conditional DAMAGE2 to SAOサバイバー. RAID LIFE. No count-of-named cards. |
| [SAO-2-032](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-032) purple ユナ | **PARTIAL** | OnPlay optional outside 歌 recovery then other-character buff; MAIN self REST only if own 歌 use this turn, buff Yuna and survivor field characters. RAID LIFE. |
| [SAO-2-036](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-036) purple キリト | **RULE BLOCKED** | Q1203: cannot pay only 5 OUTSIDE-to-bottom for BP5000 retire; FIRST must have used 歌 and spend 1 AP; cost/selection combo with optional ordered bottom-five unresolved. COLOR LIFE separate. |
| [SAO-2-049](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-049) purple キリト | **PARTIAL** | Printed AP2, DAMAGE2, outside optional free REST purple アスナ energy<=2/AP1 entry and MAIN once BP>=1500 front debuff. GET LIFE. |
| [SAO-2-062](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-062) purple longing | **NEAR READY** | Printed 歌 EVENT: sequential draw2/discard2, if own field 〈ユナ〉 recover up to AP1, DRAW LIFE. Does not involve the R51 named OUTSIDE count. |
| [SAO-2-063](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-063) green アスナ | **REGISTERED in R53 (pending SHA-specific latest CI)** | Official green energy3/AP1/BP3000/gen **3**/ALO/null LIFE, STEP; when own OUTSIDE 〈ユウキ〉＋〈マザーズ・ロザリオ〉 physical total >=2, onPlay draw exactly 1. Fully source pinned, registry+independent manifest+50-card action tests. Generic `drawIfOwnOutsideNamedCountAtLeast` uses R51 predicate, no second counter. |

## III. Cross-title shared atom coverage and blockers

1. R51 `ownOutsideNamedCountAtLeast` (name-union count; one physical UID once), now used for SAO-1-070 4/6, SAO-1-100 3, SAO-2-063 2. Search all 700 and unported complement after every registration.
2. R53 `drawIfOwnOutsideNamedCountAtLeast`: source-pinned SAO-2-063, read ON-PLAY current state, not stale cache, not opponent OUTSIDE. Can be reused for later printed named-OUTSIDE gated draws.
3. R53 `countOwnOutsidePhysicalGroups`: pure factor floor(own OUTSIDE count/N), test 0/4/5/9/10 with legitimate distinct physical UIDs and forgery rejection. SLG-1-021 still PARTIAL until atomic onAttack/live recovery consumers implemented.
4. R53 `blockBpRestriction`: uses opponent BLOCK decision legal actions; strict source-authored relation current BP, optional live R51 condition. Supports TTG-1-067 BP>=4000 forbidden and future SAO-1-071 BP<=3000 forbidden ONLY at 8 named OUTSIDE. Neither full target card is registered yet.
5. MST-1-009 requires source-stamped own-effect entry gate and temporarily granted attack-end swap based on Q2147. Do not falsely treat printed permanent swap as the same temporary ability.

No READY classification follows from a regex; historical source-matched audits do not change independent FAQ completion. Safety blocks remain: MST-1-067 Q2162, BLC-4-034 Raid buried timing, unaudited nested LIFE and combined multi-target AP/hand costs.

## IV. Remaining next execution and acceptance gates

- Verify latest R53 exact HEAD Node22 tests, 60/60 cross-title, independent manifest and R35/R46–R53 reports.
- Complete TTG live battle-win draw + targeted SNIPER; SLG two per-five consumers and mandatory block; MST temporary granted swap Q2147; SAO-1-071 4/6/8.
- Only when entire official print, legitimate 50-card decks, target/pending security, AI and LIFE have been verified, update registry/independent manifest.
- All documentation commits have their own pushed SHA and must not borrow a previous green workflow.

### R53 test SHA-specific evidence (2026-10-24)

- Tested SHA: `db9920fc50d1108dac4572604f5abc601d55916b`
- [Full GitHub Actions SUCCESS #40045611773](https://github.com/will00t-debug/Ua/actions/runs/40045611773): Node.js 22 **2146/2146 PASS**, five-title **60/60 PASS**, independent registered ID manifest **344/700 PASS**, R35/R51/R52 audit scripts PASS.
- Register: BLEACH 103, TTG 36, SLG 45, SAO 106, MST 54; 356 pending.
- This is the tested pre-final-handoff code commit; the subsequent R53 workflow and handoff SHA must be checked separately.
