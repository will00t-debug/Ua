# UNION ARENA V2 — R35 independent real-card acceptance, composite statuses, atom-gap audit

2026-10-23 Asia/Taipei. Work exclusively on [PR #78](https://github.com/will00t-debug/Ua/pull/78), branch `gpt/v2-resume-20261022`, base `cursor/v2-multi-retire-life-6ff5`. Opening HEAD `63544e34445339c570230b37082037079c351f3a` (R34 documentation); last **previously verified** Node22 code `525e01925ee62270e75646a3823e18ec60f2cffa`, [Actions 39884026935](https://github.com/will00t-debug/Ua/actions/runs/39884026935): 1869/1869 tests, 60/60 matches, independent manifest/unported report passing. **None of this prior CI validates R35 commits.**

## Batch A — explicit independent card-certification ledger, not 1869 “certified cards”

- `scripts/v2-card-certification-report.mjs` materializes **700 disjoint source IDs** by current actual title inventory and independent manifest, with per-card statuses: `unported`, `registered-unreviewed`, `partial-effects-tested`, `full-print-verified-faq-pending`, `official-ruling-gap`, `complete-independent-official-acceptance`.
- `tests/v2-r35-card-certification.test.mjs` tests source/registry count equality, exact four explicitly evidence-linked recent cards, mutually exclusive status groups, forged completeness refusal and mandatory **13** checklist dimensions. The gate does **not** automatically mark any card “fully accepted” because some source excerpt or test passed.
- Checklist (independently record supported / pending / blocked / N/A): official ID/printed profile; stats, AP/BP/energy/trait; all effects; legal activation timing; paid costs + targets; optional vs required choices; normal/Raid/LIFE; resolution queue; seal/depart/reenter/expiration; Human+Normal+Hard; UID+save/private information; legal 50-card cross-title match; **relevant official FAQ scope + searched sources**. An absence of dedicated FAQ is **not** itself an applicable FAQ citation.
- Four reviews start at **partial-effects-tested** because no separate exhaustive matrix of all relevant official rulings, entry routes, sealed/expired/removal paths and both-side game scenarios is signed off.

| True printed card | Available independent evidence | FAQ boundary / remaining proof |
| --- | --- | --- |
| [SAO-1-005](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-005) | `tests/v2-r31-sao005-official-registry.test.mjs`: 2 yellow/AP1/BP3000, TOP4 two exact-name OR, 0/1 reveal, bottom order, conditional discard; no LIFE | no card-specific FAQ assumed; independent full applicability search and more cross-phase/restore cases pending |
| [TTG-1-028](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-028) | `tests/v2-r32-ttg028-official.test.mjs`: 4 green/AP1/BP4000; Simon/Viral Raid, onPlay draw + own-turn optional next-own-start ban, RAID LIFE | general turn-start/attack/Raid interactions still not exhaustively certified |
| [SLG-1-070](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-070) | `tests/v2-r33-slg070-official.test.mjs` + `v2-r33-q2062-mandatory-event.test.mjs`: 0 green/AP1/BP1000/DFN; optional-other-grant; ACTIVE LIFE | card **Q2062** selection AP ruling tested; Q1119 prerequisite relevant. Not an exhaustive cross-title FAQ audit |
| [MST-1-059](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-059) | `tests/v2-r34-mst059-official.test.mjs`: 2 green/AP1/BP3000, exactly one onPlay mode, draw/discard or optional same-turn other Ranoa FRONT grant, no LIFE | general Q25/26/27/28/90/236 and Q2228/2151 cover bounded behaviors; no fictitious card-specific FAQ |

For current reproducible counts run `node scripts/v2-card-certification-report.mjs`. This audit adds **no** card to registry and **no** independent all-FAQ certification.

## Batch B — real cross-title overlap

- `tests/v2-r35-real-cross-title-composite.test.mjs`: one genuine legal 50-card MST vs 50-card SLG game, SLG-070 actually played to ENERGY, grants taxed targeting to another own DFN FRONT; during the **next opponent turn**, MST-059 is paid into FRONT, chooses actual 2nd onPlay mode, grants exact stamped own-other FRONT energy generation. Both statuses coexist through main and attack; no synthetic source effects for these two grants.
- Check exact Human decision candidates, Normal/Hard choices from the same legal action set, forged physical target atomic rejection, correct private-hand public view, JSON restoration, non-overlapping energetic gain versus AP target tax, and each status' turn-end expiry. This is **one controlled integrated scenario**, not full-game exhaustive acceptance.
- Earlier `tests/v2-r34-cross-title-energy.test.mjs` covered simultaneous synthetic grants and different-title opponent scenarios. R35 adds genuinely paid and triggered grant sources in one match; does not reimplement either state handler.

## Batch C — source-verified high-reuse DSL atomic candidates

`scripts/v2-r35-unported-atom-audit.mjs` and `tests/v2-r35-unported-atom-audit.test.mjs` partition the current source-catalogue **unported** roster into distinct **10 manually inspected IDs** and a visible remaining `pendingIds` list. At the R34 registry count (316 registered / 384 unported), this means 10 source-matched and 374 **not yet atomically reclassified**. It would be incorrect to use the historical 457-card keyword-groups as a certified modern 384-card semantic analysis. The script must fail if a candidate changes registration, changes ownership or duplicates a group.

| Priority / shared atom | Official printed examples | Existing mechanism / exact missing distinction | Risk and complete-port blocker |
| --- | --- | --- | --- |
| **1. Next eligible hand-play AP -1** | [SAO-2-074](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-074) + [MST-1-062](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-062) | Existing `chooseOne`/paid-play/optional own bounce, but missing **one-shot next matching printed-profile hand-play** AP reduction (not `selectionApTax`). FAQ Q1210, Q2161 explicitly retain discount after an ineligible hand play. SAO originally BP=3500 and ALO; MST originally gen >=2 and only after optional other-character bounce | Medium-high due shared AP action/preflight atomic consume. MST has COLOR LIFE & bounce; SAO ACTIVE LIFE. Both complete bodies needed |
| **2. TOP-N choose up to two** | [SAO-1-031](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-031) + [SAO-1-066](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-066) | Existing top-one + bottom-order + public reveal from SAO005 and TTG/SLG. Missing sequential 0..2 **distinct** inspected UIDs, condition-specific name-OR vs ALO trait, no contingent discard; source-specific TOP5 vs TOP4 | Medium. Both have DRAW LIFE and distinct card costs; test exact inspected physical UIDs and partial order. Structural reuse across titles is plausible, but two **blocked examples are both SAO** |
| **3. Truly cannot be chosen by opponent's effects** | [SAO-2-058](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-058) + [MST-1-067](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067) | Existing UID-stamped `selectionApTax` is not selection impossibility. Need scope-specific temporary target-exclusion, next-own-START expiry; SAO Q1206/MST Q2162 apply | High. SAO Asuna AP refresh + ACTIVE life; MST original generation condition, Raid, onRetire base return + RAID life. Partial original abilities forbid registration |
| **4. FRONT-generation grant reused at another timing** | [MST-1-080](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-080) + [MST-1-060](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-060) | **Reuse existing** `frontEnergyPermission`, not duplicate energy calculator. Event draws 2 then grant vs FRONT MAIN once-per-turn draw/discard/grant, plus STEP | Medium. Entire EVENT/AP/DRAW LIFE vs MAIN/STEP/GET LIFE must be accounted for |
| **5. Conditional own retirement leading to TOP search** | [SAO-2-056](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-056) + [MST-1-049](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-049) | Existing true-retire-own-type and TOP search can compose, but must retain optional **CHARACTER** vs **FIELD** retirement, TOP5 up to two vs TOP4 up to one, conditional ACTIVE | High. Exact source-resolution/retirement chronology before queueing any TOP choice |

### Batch D decision / safety gate

Do **not** implement `nextEligibleHandPlayApDiscount` by simply lowering normal AP payment or reading live BP: both official examples require **printed/original stats** and consumption on the **next eligible card used from hand**. This changes shared legal-action enumeration and AP-payment atomicity, including Human/Normal/Hard; no scoped end-to-end validator/negative suite is yet ready. Implementing a partial cheaper-play hint would falsify fully supported real cards. R35 therefore prioritizes Batch A/B independent regression evidence over speculative core edits; **no new DSL op and zero new full-print card registrations** this pass. Next patch should introduce a typed state + independent consumption preflight *only after* targeted Node22 green CI.

## Batch E — original BLC printed costs, FAQ limits, conservative LIFE

- [BLC-4-034 official](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034): optional watch (own Ichigo discard -> REST/tuck), onPlay only ENERGY ACTIVE, main two **mandatory** REST+TRUE RETIRE costs before at most-one facedown-under recovery, COLOR opposite BP <=3500 bounce. Q2315 earned BLC-047 DRAW survives later tuck; Q2316 only the controller may inspect own facedown undercards.
- Direct official evidence still **does not specify** when to choose the undercard if real retirement immediately moves layers to outside under Q60/Q61, or how retirement observers intervene during MAIN payment and multi-Raid facedown nesting. Do not invent post-retire last-known attachments, backdate an own-choice snapshot, or select a UID outside the legal physical attachment region.
- Exact official question to request: **For BLC-4-034 MAIN, with one or several facedown-under physical cards before activation, after paying REST+true retirement, at which instant (relative to vacating layers/onRetire/replacements) does the controller choose 0/1 undercard, and from which then-existing legal zone is that card added to hand? How does a Raid base and its nested layers move?**
- Keep **BLC-2-019, BLC-2-047, BLC-4-034 unregistered**, `tests/v2-r30-blc-three-print-integrated-pilot.test.mjs` and `tests/v2-r34-blc-official-blocker.test.mjs` rejection paths. Q12/Q35–Q38/Q60–Q62/Q71–Q74, Q1033/Q1046/Q2062/Q2315/Q2316 remain rule scope anchors, not blanket certification. Independent nested damage guard `tests/v2-r24-nested-life-conservative.test.mjs` rejects a second LIFE batch atomically, no fabricated cross-player priority.

## Reproduction / CI limits

Run under Node.js 22 in this exact order:

```sh
node scripts/v2-card-certification-report.mjs
node scripts/v2-r35-unported-atom-audit.mjs
npm test
node scripts/v2-integrated-match-matrix.mjs
node scripts/v2-assert-independent-manifest.mjs
node scripts/v2-unported-report.mjs
```

The branch workflow `.github/workflows/v2-resume.yml` executes the last four steps on push. The available GitHub connector shows no PR-triggered run for the new SHA because this workflow is **push-triggered**; absence in that filtered lookup is **NOT** proof of success or failure. Do not report the R34 1869/1869 success as an R35 result. This round used remote GitHub object writes; no local clone, no local Node22 run. Main, production Vercel and Cursor PR #77 remained untouched.

R35 batch commits are listed in the final `GPT-resume-20261022.md` handoff after the branch head is checked. All content is reviewable code or source-specific audit, not an instruction to lower schema validation or change nested LIFE behavior.
