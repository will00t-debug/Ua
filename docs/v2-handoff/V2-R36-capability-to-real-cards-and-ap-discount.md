# UNION ARENA V2 R36 — reusable capability → source cards → complete registration

2026-10-23 (Asia/Taipei). This is a **snapshot for exact GitHub code SHA `6823a1205c1615b0f91342f018a96c08ae15038c`**, not an evergreen claim. [PR #78](https://github.com/will00t-debug/Ua/pull/78) remains Draft, targeting `cursor/v2-multi-retire-life-6ff5`; no main merge or Vercel production deployment.

## Verified R35 CI and recovery

The R35 code/document HEAD `07c01009` had a **failed** run [39886593190](https://github.com/will00t-debug/Ua/actions/runs/39886593190), not the old green R34 result. Subsequent R36 commits were separately run, and **the actual new code HEAD** `6823a1205c1615b0f91342f018a96c08ae15038c` passed [GitHub Actions 39891258143](https://github.com/will00t-debug/Ua/actions/runs/39891258143), Node.js 22: **1896/1896 `npm test`**, **60/60 five-title match matrix**, independent certification report, shared atom audit, independent manifest and unported report all success. This is remote Actions evidence, **not a local clone/test**.

## Batch A — single-source reproducible capability mapping

`15334bd887c1c16b21b34e28b5220e78851a74db` extends **the existing** `scripts/v2-r35-unported-atom-audit.mjs`, deriving `capabilityIndex()` from `V2_SOURCE_CATALOGUES`, `v2AllTitleInventory()` and current `registeredV2TitlePack` rather than creating another card database. Each source identity carries source text, SHA-256 source fingerprint, current registration, registered DSL ops, verified audit overlay or explicitly unreviewed status, missing atoms, keyword *candidate* hits and explicit official-review link where reviewed. Reverse index reports registered users, unported candidate IDs, related works and READY IDs. A source-text keyword hit is **not** official semantic equivalence, not a READY state, and not a complete-card certificate.

Current status classes: `READY`, `NEAR READY`, `PARTIAL`, `RULE BLOCKED`, `SOURCE PENDING`, `REVIEW PENDING`. The R35 legacy five groups now show historical references and currently registered/unported IDs; R35 10 individually source-matched IDs became **8 still unported** after the two R36 registrations. Another **7 unported** discount candidates have an explicit R36 printed-review overlay. Thus **15 distinct unported cards have some source-specific candidate review**, **not** 15 exhaustive independent certifications; the original R35 pending list still contains **374** IDs without its own five-atom per-card audit. The broader automatic scan checks **all 382 current unported IDs**.

Reproduce: `node scripts/v2-r35-unported-atom-audit.mjs`, whose JSON contains both the conservative R35 partition and the newly derived `capabilityIndex` object, and `node scripts/v2-card-certification-report.mjs`.

## Batch B — shared one-shot eligible hand-play AP reduction

`182f7e372fdf2886505ab9cc7a4c8999edae5772` introduces `dist/universal-v2/ap-discounts.mjs` and integrates `nextEligibleHandPlayApDiscount` with **existing** `continuousStates`, existing legal action preflight/dispatch, and **single** `spendAp` payment path. Typed printed-card selectors are `cardType`, `printedBp`, `printedGenAtLeast`, and `trait`. AP is clamped to zero; a play which is ineligible, illegal or not completed does not consume the status. On successful matching hand use, applicable one-shot entries are consumed together, without equating play cost to card-effect target `selectionApTax`. Recorded controller, source physical UID/card ID/fieldEntryStamp, grant turn, expiry and consumed state are validated across JSON save/restore. No second reducer/payment calculator.

Source oracle:
- [EX08BT/SAO-2-074 トンキー](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-074): FIELD, GREEN3/AP1/BP absent, ALO, ENERGY1, ACTIVE LIFE. Only **original BP=3500 with ALO** for the next card used from hand; official **Q1209/Q1210**.
- [UA54BT/MST-1-062 ナナホシ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-062): character GREEN3/AP1/BP2000/ENERGY2, Ranoa trait, choose bounce of a *different-name* own on-field character (optional; **only if actually bounced**) for next hand-play **original ENERGY generation ≥2 character** AP−1, or draw1; COLOR LIFE. Official **Q2161**.
- [Official Q670](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX03BT) explicitly allows two eligible next-use AP−1 effects to overlap on the same next card. Earlier R35 concern about stacking was resolved by this **separate generic official precedent**, not by inventing a rule.

The current validation covers forged UID/controller, printed vs live stat, ineligible and insufficient-energy use, zero-AP floor, expiry, source exit/reentry/new field stamp, serialization rejection, pending option tampering, Human/Normal/Hard AI legal choices and AP selection surcharge separation.

## Batch C — all-five-title retrospective real-card search

`5088cf49285f38ac30df9732a32e51ab10ae4904` applies the new reverse index to the full **382 unported** roster. Keyword-prefilter plus official semantic review identified the **7 still-unported one-shot AP reduction candidates** below; none may be auto-registered merely by having a discount:

| Candidate | Status | Still-missing **other** atoms (or semantics) |
| --- | --- | --- |
| BLC-1-070 | PARTIAL | `printedEnergyAtMostFilter`, `topNOptionalPickWithoutDiscard` |
| BLC-2-030 | PARTIAL | `nextHandNameFilter`, `enteredNamedCharacterThisTurn` |
| BLC-4-055 | PARTIAL | `optionalRemoveOtherThen`, `nextHandTraitOrNameFilter`, `upToTwoDistinctBuffTargets`; Q2328 |
| BLC-4-069 | NEAR READY | `attackEndDistinctOutsideNamesSwap`; Q2337/Q2338; **high attack-resolution risk** |
| TTG-1-080 | PARTIAL | `fieldOrRaidBaseNamePlayGate`, `nextHandRaidOnlyNameOrFilter`, `eventSourceDiscount`; Q2300 |
| SAO-2-031 | PARTIAL | `outsideFourOrderedBottomCost`, `grantDamageTwo`; Q1202 |
| MST-1-031 | PARTIAL | `printedEnergyAtMostFilter`, `ownEventUsedThisTurnImpact`; Q2152 |

**No additional READY unported card was established in this reviewed discount subset**. Registered SAO-2-074 and MST-1-062 were the two READY-to-register examples; the R35 historical group stays visible but is marked as historical. The current text search may miss other wording patterns: its hits are candidate discovery, not a claim of exhaustive official semantic coverage of all 382 cards.

## Batch D — shared atom, two whole-print true-card registrations

`5088cf49285f38ac30df9732a32e51ab10ae4904` composes both entire cards with already-existing effect queue, play/CHOICE, bounce, LIFE handling and discount. It updates the independent exact-ID manifest, official source-pinned pack data, dedicated real 50-card match tests and partial independent review ledger. `6823a1205c1615b0f91342f018a96c08ae15038c` adds AP target-surcharge regression, source lifecycle and CI audit steps. Official source tests include human/legal-AI, real SAO-vs-MST LIFE trigger cases, UID negative choices, optional draw/bounce branches, Raid-under departure and snapshot restoration.

Authoritative exact-HEAD counts: **BLEACH 97; TTG 36; SLG 42; SAO 93; MST 50 = 318/700 registered; 382 unported**. Independent card certification ledger: **312 registered-unreviewed, 6 partial-effects-tested, 0 complete-independent-official-acceptance**. These are different milestones: full printed functionality in implemented tests is not full-scope signed FAQ certification.

## Batch E — next candidate decision, reviewer-controlled

The audit's **heuristic** scores are a queue, not an instruction to implement an unsafe atom based only on count. These five are actionable choices ranked with explicit tradeoffs:

1. **`topNChooseUpToTwoThenOrderBottom`** — SAO-1-031/SAO-1-066; reuse TOP-N reveal, bottom ordering and UID-safe selection; still needs optional **0–2 distinct** inspected UIDs and separate name-OR versus ALO filters. Up to **two possible whole-card ports after full print/FAQ review**, medium risk; do this before high-risk battle timing.
2. **`reuseFrontEnergyGrantOutsideOnPlay`** — MST-1-080/MST-1-060; **reuse** R34 stamped `frontEnergyPermission`, draw and `mainOnce`, avoiding a second energy calculation. EVENT vs once-per-turn MAIN, STEP and DRAW/GET LIFE differ. Up to **two possible whole-card ports**, official timing still needs checking, medium risk.
3. **`printedEnergyAtMostFilter`** — BLC-1-070/MST-1-031; reusable original printed-energy ceiling predicate (not temporary generation). Cross-title reach **two**, but **zero immediate full-card completions** because each still needs another distinct atom. Lower implementation complexity; schedule as groundwork with honest PARTIAL status.
4. **`attackEndDistinctOutsideNamesSwap`** — BLC-4-069; official **Q2337/Q2338** should be read with the full card and attack-end sequence. Current audit shows **one potential direct whole-card completion**, but high attack/UID/stack regression risk. Implement only after official ordered scenario tests.
5. **`cannotBeChosenByOppEffect`** — SAO-2-058/MST-1-067; official **Q1206/Q2162** distinguish true target exclusion from Q2062 AP surcharge. Two works, but **zero immediate whole-card completions** (Asuna AP refresh, Raid/onRetire etc. still need separate support); high targeting regression risk.

Suggested development order **1 → 2 → 3**, with **4** only after timing oracle, and **5** as a separate scoped targeting feature. For any newly completed atom: re-run the **entire** `capabilityIndex()` over current source catalogues, review all its candidate cards' **entire** printed body and applicable FAQ, register only fully supported cards, then re-run audit and independent acceptance.

**Blocked / non-goals:** BLC-2-019, BLC-2-047, BLC-4-034 remain unregistered; 4-034 mandatory self REST→true retire→facedown-under retrieval selection timing is still not directly established. A second nested LIFE damage batch remains atomically refused. Do not change or soften these guards, copy Cursor PR #77, force push, merge main, or deploy Vercel production.

### Commands on Node.js 22

```sh
node scripts/v2-card-certification-report.mjs
node scripts/v2-r35-unported-atom-audit.mjs
npm test
node scripts/v2-integrated-match-matrix.mjs
node scripts/v2-assert-independent-manifest.mjs
node scripts/v2-unported-report.mjs
```

Each new documentation commit needs its **own** exact-SHA Actions check; the `6823a12` green run cannot certify later commits.
